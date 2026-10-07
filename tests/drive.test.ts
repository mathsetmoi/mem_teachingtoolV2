// La publication sur le Drive : chaque compte a SON dossier des replays. Un
// essai avec le mauvais compte Google ne doit rien laisser qui serve ensuite
// à l'autre compte. Le vrai drive.ts parle à un faux Google Drive (un par
// compte Google), et le vrai relais v3 relit la séance dans un bac à sable.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/publication/comptes', async origine => ({ ...await origine<typeof import('../src/publication/comptes')>(), CLIENT_GOOGLE: 'essai.apps.googleusercontent.com' }))
const { COMPTES } = await import('../src/publication/comptes')
const { connecter, deconnecter, publier } = await import('../src/publication/drive')

const RELAIS = readFileSync(join(__dirname, '..', 'relais/relais-seances.gs'), 'utf8')
const DOSSIER = 'application/vnd.google-apps.folder'

interface F { id: string; name: string; mimeType?: string; parents?: string[]; trashed?: boolean; appProperties?: Record<string, string>; contenu?: string }
/** Un faux Drive par compte Google ; le jeton de connexion est le nom du compte */
let drives: Record<string, { email: string; f: Record<string, F> }>
let numero = 0
const fiche = (x: F) => ({ ...x, contenu: undefined, permissions: [{ id: 'moi', type: 'user', role: 'owner' }] })
const reponse = (status: number, corps: unknown) => ({ ok: status < 300, status, json: async () => corps })

/** Ce que l'API Drive retient d'une requête de recherche (et rien d'autre : une clause inconnue est une erreur) */
function chercher(d: Record<string, F>, q: string): F[] {
  let l = Object.values(d)
  let reste = q
  const clause = (re: RegExp, filtre: (m: RegExpExecArray) => (f: F) => boolean) => {
    for (let m = re.exec(reste); m; m = re.exec(reste)) { const fl = filtre(m); l = l.filter(fl); reste = reste.replace(m[0], ' ') }
  }
  const texte = (s: string) => s.replace(/\\'/g, '\'')
  clause(/appProperties has \{ key='([^']+)' and value='((?:[^'\\]|\\.)*)' \}/, m => f => f.appProperties?.[m[1]] === texte(m[2]))
  clause(/trashed=false/, () => f => !f.trashed)
  clause(/mimeType='([^']+)'/, m => f => f.mimeType === m[1])
  clause(/name='((?:[^'\\]|\\.)*)'/, m => f => f.name === texte(m[1]))
  clause(/'([^']+)' in parents/, m => f => !!f.parents?.includes(m[1]))
  if (reste.replace(/\band\b/g, '').trim()) throw new Error('clause inconnue : ' + reste)
  return l
}

beforeEach(() => {
  numero = 0
  drives = { perso: { email: 'prof@gmail.com', f: {} }, lycee: { email: 'prof@lycee.fr', f: {} } }
  vi.stubGlobal('location', { protocol: 'https:' })
  vi.stubGlobal('window', { google: { accounts: { oauth2: {
    initTokenClient: (o: { callback: (r: unknown) => void }) => ({ requestAccessToken: () => o.callback({ access_token: choix, expires_in: 3600 }) }),
    hasGrantedAllScopes: () => true,
  } } } })
  vi.stubGlobal('fetch', async (url: string, o: RequestInit = {}) => {
    const d = drives[String((o.headers as Record<string, string>).Authorization).replace('Bearer ', '')].f
    const u = new URL(url)
    const methode = (o.method ?? 'GET').toUpperCase()
    if (u.pathname.endsWith('/about')) return reponse(200, { user: { emailAddress: 'x' } })
    const id = u.pathname.match(/\/files\/([^/]+)$/)?.[1]
    if (u.pathname.startsWith('/upload/')) {
      const borne = /boundary=(\S+)/.exec((o.headers as Record<string, string>)['Content-Type'])![1]
      const [meta, contenu] = (await (o.body as Blob).text()).split(`--${borne}`).slice(1, 3).map(m => m.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''))
      if (methode === 'POST') { const n = `seance${++numero}xxxxxxxxxx`; d[n] = { id: n, ...JSON.parse(meta), contenu }; return reponse(200, { id: n }) }
      Object.assign(d[id!], JSON.parse(meta), { contenu }); return reponse(200, { id })
    }
    if (id) {
      const f = d[decodeURIComponent(id)]
      if (!f) return reponse(404, { error: { message: 'File not found' } })
      if (methode === 'PATCH') Object.assign(f, JSON.parse(String(o.body)))
      return reponse(200, fiche(f))
    }
    if (methode === 'POST') { const n = `dossier${++numero}xxxxxxxxx`; d[n] = { id: n, ...JSON.parse(String(o.body)) }; return reponse(200, { id: n }) }
    return reponse(200, { files: chercher(d, u.searchParams.get('q')!).map(fiche) })
  })
})
afterEach(() => { vi.unstubAllGlobals(); deconnecter() })

/** Le compte Google que le professeur choisit dans la fenêtre de Google */
let choix = ''

/** Le vrai relais v3, déployé dans le compte Google `proprio` */
function relais(proprio: string) {
  const d = drives[proprio]
  const iterer = <T>(l: T[]) => { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] } }
  const dossier = (id: string) => { const x = d.f[id]; return { getName: () => x.name, isTrashed: () => !!x.trashed, getOwner: () => ({ getEmail: () => d.email }) } }
  const bac: Record<string, unknown> = {
    console: { log() {}, error() {} },
    Session: { getEffectiveUser: () => ({ getEmail: () => d.email }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (texte: string) => ({ texte, setMimeType() { return this } }) },
    DriveApp: {
      getFileById(id: string) {
        const f = d.f[id]
        if (!f) throw new Error('introuvable')
        // Comme dans Drive : un fichier d'un dossier mis à la corbeille y est aussi
        const corbeille = () => !!f.trashed || (f.parents ?? []).some(p => d.f[p]?.trashed)
        return { getName: () => f.name, isTrashed: corbeille, getParents: () => iterer((f.parents ?? []).map(dossier)), getBlob: () => ({ getDataAsString: () => f.contenu }) }
      },
      getFoldersByName: (nom: string) => iterer(Object.values(d.f).filter(f => f.mimeType === DOSSIER && f.name === nom).map(f => dossier(f.id))),
    },
  }
  runInNewContext(RELAIS, bac)
  return (p: Record<string, string>) => JSON.parse((bac.doGet as (e: unknown) => { texte: string })({ parameter: p }).texte)
}

/** Le relais de chaque compte du site vit dans ce compte Google */
const DEPLOYE: Record<string, string> = { mem: 'perso', lfb: 'lycee' }
const compte = (cle: string) => COMPTES.find(c => c.cle === cle)!
/** Ce que fait la fenêtre Publier : relire la séance par le relais du compte, refuser si introuvable */
const verifier = (cle: string) => async (id: string) => {
  const r = relais(DEPLOYE[cle])({ id })
  if (r.erreur) throw new Error(`relais ${cle} : ${r.erreur}`)
}
const SEANCE = '{"format":"mem-revoir","v":1,"titre":"Essai"}'

/** Publier la séance `n` sur le compte `cle` du site, connecté au compte Google `google` */
async function publierAvec(google: string, cle: string, n: number) {
  choix = google
  await connecter(cle)
  try { return await publier(compte(cle).dossier, `Séance ${n}`, SEANCE, `${cle}:${n}`, null, verifier(cle)) }
  finally { deconnecter() }
}
const dossiers = (google: string, toutes = false) => Object.values(drives[google].f).filter(f => f.mimeType === DOSSIER && (toutes || !f.trashed))
const dossierDe = (google: string, id: string) => drives[google].f[drives[google].f[id].parents![0]]

describe('chaque compte a son dossier des replays', () => {
  it('un essai avec le mauvais compte Google ne laisse aucun dossier, et l\'autre compte crée le sien', async () => {
    // « Drive du lycée », mais le professeur choisit son compte personnel : le relais du lycée ne trouve rien
    await expect(publierAvec('perso', 'lfb', 1)).rejects.toThrow(/introuvable/)
    expect(dossiers('perso').map(d => d.name)).toEqual([])
    // Plus tard, « Drive personnel » avec le compte personnel
    const r = await publierAvec('perso', 'mem', 2)
    expect(dossierDe('perso', r.id).name).toBe('MEM - Replay séances')
    expect(dossiers('perso').map(d => d.name)).toEqual(['MEM - Replay séances'])
    expect(relais('perso')({ ping: '1' })).toMatchObject({ dossier: 'MEM - Replay séances', pret: true })
    expect(relais('perso')({ id: r.id }).erreur).toBeUndefined()
  })

  it('le dossier d\'un autre compte, resté dans ce Drive, n\'est jamais repris', async () => {
    // Le même compte Google sert aux deux : chaque compte du site garde son dossier
    DEPLOYE.lfb = 'perso'
    try {
      const l = await publierAvec('perso', 'lfb', 1)
      const m = await publierAvec('perso', 'mem', 2)
      expect(dossierDe('perso', l.id).name).toBe('LFB - Replay séances')
      expect(dossierDe('perso', m.id).name).toBe('MEM - Replay séances')
      expect(dossierDe('perso', l.id).id).not.toBe(dossierDe('perso', m.id).id)
      // Jeter le dossier du lycée ne coupe pas les liens du Drive personnel
      dossierDe('perso', l.id).trashed = true
      expect(relais('perso')({ id: m.id }).erreur).toBeUndefined()
      // Une nouvelle séance du lycée ne va pas dans le dossier personnel
      const l2 = await publierAvec('perso', 'lfb', 3)
      expect(dossierDe('perso', l2.id).name).toBe('LFB - Replay séances')
      expect(dossierDe('perso', l2.id).id).not.toBe(dossierDe('perso', m.id).id)
    } finally { DEPLOYE.lfb = 'lycee' }
  })

  it('un dossier renommé à la main reprend son nom ; une séance publiée y retourne', async () => {
    const r1 = await publierAvec('perso', 'mem', 1)
    const d = dossierDe('perso', r1.id)
    d.name = 'Mes replays'
    const r2 = await publierAvec('perso', 'mem', 2)
    expect(dossierDe('perso', r2.id).id).toBe(d.id)
    expect(d.name).toBe('MEM - Replay séances')
    expect(dossiers('perso', true)).toHaveLength(1)
  })
})
