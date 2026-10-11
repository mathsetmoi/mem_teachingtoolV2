// La publication sur le Drive : chaque compte a SON dossier des replays. Un
// essai avec le mauvais compte Google ne doit rien laisser qui serve ensuite
// à l'autre compte. Le vrai drive.ts parle à un faux Google Drive (un par
// compte Google), et le vrai relais v3 relit la séance dans un bac à sable.
// Les sauvegardes des classeurs (lot 4 C10), plus bas, parlent à un faux
// Drive plus complet : le contenu binaire, l'envoi reprenable, les versions.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/publication/comptes', async origine => ({ ...await origine<typeof import('../src/publication/comptes')>(), CLIENT_GOOGLE: 'essai.apps.googleusercontent.com' }))
const { COMPTES } = await import('../src/publication/comptes')
const { connecter, connecte, deconnecter, publier, sauvegarder, elaguerVersions, listerSauvegardes, lireSauvegarde, ErreurDrive, DESCRIPTION_SAUVEGARDE } = await import('../src/publication/drive')

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

// =============================================================
// LES SAUVEGARDES DES CLASSEURS (lot 4 C10)
// Un faux Drive qui lit le corps binaire des envois (multipart et
// reprenable), garde les versions de chaque fichier, et sert alt=media.
// =============================================================
interface G { id: string; name: string; mimeType?: string; parents?: string[]; trashed?: boolean; appProperties?: Record<string, string>; description?: string; octets?: Uint8Array; modifie: number; versions: { id: string; modifiedTime: string; keepForever?: boolean }[] }

describe('les sauvegardes des classeurs', () => {
  let g: Record<string, G>
  let n = 0, horloge = 1_700_000_000_000
  /** Ce que le faux Drive a vu passer */
  let requetes: { methode: string; url: URL; entetes: Record<string, string> }[]
  /** Les réglages du faux Drive : l'en-tête Location lisible, le Drive plein, le jeton refusé */
  let exposeLocation = true, plein = false, refuse401 = false
  const sessions = new Map<string, { id: string | null; meta: Partial<G> }>()

  const latin1 = (o: Uint8Array) => { let t = ''; for (const x of o) t += String.fromCharCode(x); return t }
  const octets = (t: string) => Uint8Array.from(t, c => c.charCodeAt(0))
  const vue = (f: G) => ({ id: f.id, name: f.name, mimeType: f.mimeType, parents: f.parents, trashed: !!f.trashed, appProperties: f.appProperties, size: f.octets ? String(f.octets.length) : undefined, modifiedTime: new Date(f.modifie).toISOString(), permissions: [{ id: 'moi', type: 'user', role: 'owner' }] })
  const json = (status: number, corps: unknown, entetes: Record<string, string> = {}) => new Response(corps === null ? null : JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json', ...entetes } })
  /** Un corps multipart/related : ses métadonnées (JSON) et son contenu (les octets tels quels) */
  async function multipart(body: Blob, type: string) {
    const borne = /boundary=(\S+)/.exec(type)![1]
    const parts = latin1(new Uint8Array(await body.arrayBuffer())).split(`--${borne}`).slice(1, 3)
    const [meta, contenu] = parts.map(m => { const i = m.indexOf('\r\n\r\n'); return { tete: m.slice(0, i), corps: m.slice(i + 4).replace(/\r\n$/, '') } })
    return { meta: JSON.parse(new TextDecoder().decode(octets(meta.corps))), typeContenu: /Content-Type: (\S+)/.exec(contenu.tete)?.[1], contenu: octets(contenu.corps) }
  }
  function ecrire(id: string | null, meta: Partial<G>, contenu: Uint8Array): string {
    horloge += 60_000
    const f: G = id ? g[id] : { id: `sauve${++n}xxxxxxxxxxx`, name: '', versions: [], modifie: horloge }
    Object.assign(f, meta, { octets: contenu, modifie: horloge })
    f.versions.push({ id: `v${++n}`, modifiedTime: new Date(horloge).toISOString() })
    g[f.id] = f
    return f.id
  }

  beforeEach(() => {
    g = {}; n = 0; requetes = []; exposeLocation = true; plein = false; refuse401 = false; sessions.clear()
    vi.stubGlobal('fetch', async (url: string, o: RequestInit = {}) => {
      const u = new URL(url), methode = (o.method ?? 'GET').toUpperCase()
      const entetes = Object.fromEntries(Object.entries((o.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]))
      requetes.push({ methode, url: u, entetes })
      if (refuse401) return json(401, { error: { message: 'Invalid Credentials' } })
      if (u.pathname.endsWith('/about')) return json(200, { user: { emailAddress: 'prof@gmail.com' } })
      // Les envois
      if (u.pathname.startsWith('/upload/')) {
        const id = u.pathname.match(/\/files\/([^/]+)$/)?.[1] ?? null
        if (plein) return json(403, { error: { message: 'The user\'s Drive storage quota has been exceeded.', errors: [{ reason: 'storageQuotaExceeded' }] } })
        const type = u.searchParams.get('uploadType')
        if (type === 'multipart') {
          const m = await multipart(o.body as Blob, entetes['content-type'])
          // Une sauvegarde : le contenu binaire, tel quel (une séance publiée reste du JSON)
          if (m.meta.appProperties?.memSauvegarde) expect(m.typeContenu).toBe('application/octet-stream')
          return json(200, { id: ecrire(id, m.meta, m.contenu) })
        }
        if (type === 'resumable' && u.searchParams.get('upload_id')) {
          // Le second temps : le fichier lui-même, à la session ouverte
          const s = sessions.get(u.searchParams.get('upload_id')!)!
          expect(methode).toBe('PUT')
          const contenu = new Uint8Array(await (o.body as Blob).arrayBuffer())
          return json(200, { id: ecrire(s.id, s.meta, contenu) })
        }
        if (type === 'resumable') {
          expect(entetes['x-upload-content-type']).toBe('application/octet-stream')
          const envoi = `envoi${++n}`
          sessions.set(envoi, { id, meta: JSON.parse(String(o.body)) })
          const location = `https://www.googleapis.com/upload/drive/v3/files${id ? '/' + id : ''}?uploadType=resumable&upload_id=${envoi}`
          // Un navigateur ne laisse lire Location que si Google l'expose (access-control-expose-headers)
          return json(200, null, { 'X-GUploader-UploadID': envoi, ...(exposeLocation ? { Location: location } : {}) })
        }
      }
      const versions = u.pathname.match(/\/files\/([^/]+)\/revisions(?:\/([^/]+))?$/)
      if (versions) {
        const f = g[decodeURIComponent(versions[1])]
        if (!f) return json(404, { error: { message: 'File not found' } })
        if (methode === 'DELETE') {
          const i = f.versions.findIndex(v => v.id === decodeURIComponent(versions[2]))
          // Comme Google : la dernière version ne s'efface pas
          if (i < 0 || i === f.versions.length - 1) return json(400, { error: { message: 'cannotDeleteLastRevision' } })
          f.versions.splice(i, 1)
          return new Response(null, { status: 204 })
        }
        return json(200, { revisions: f.versions })
      }
      const id = u.pathname.match(/\/files\/([^/]+)$/)?.[1]
      if (id) {
        const f = g[decodeURIComponent(id)]
        if (!f) return json(404, { error: { message: 'File not found' } })
        if (u.searchParams.get('alt') === 'media') return new Response(f.octets!, { status: 200 })
        if (methode === 'PATCH') Object.assign(f, JSON.parse(String(o.body)))
        return json(200, vue(f))
      }
      if (methode === 'POST') { const d = `dossier${++n}xxxxxxxxx`; g[d] = { id: d, versions: [], modifie: horloge, ...JSON.parse(String(o.body)) }; return json(200, { id: d }) }
      const trouves = chercher(g as unknown as Record<string, F>, u.searchParams.get('q')!) as unknown as G[]
      return json(200, { files: trouves.map(vue) })
    })
  })

  const seConnecter = async () => { choix = 'perso'; await connecter('mem') }
  const fichier = (taille: number) => {
    // Des octets de toutes sortes, dont ceux qui ressemblent à une limite multipart
    const o = new Uint8Array(taille)
    for (let i = 0; i < taille; i++) o[i] = (i * 7 + (i >> 8)) & 255
    if (taille >= 24) o.set(octets('\r\n--mem_x\r\n\r\n'), 10)
    return new Blob([o])
  }
  const base = { compte: 'mem', classeur: 'aaaaaaaaaaaaaaaa', nom: 'Symétrie centrale', idExistant: null, origine: 'appareil-A', t: 1000, recu: 500 }
  const sauvegardes = () => Object.values(g).filter(f => f.mimeType !== DOSSIER && !f.trashed)
  const dossiersG = () => Object.values(g).filter(f => f.mimeType === DOSSIER)
  const octetsDe = async (b: Blob) => new Uint8Array(await b.arrayBuffer())
  /** Les mêmes octets ? (toEqual est trop lent sur 6 Mo) */
  const memes = (a: Uint8Array | undefined, b: Uint8Array) => !!a && a.length === b.length && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0

  it('le contenu binaire part tel quel (multipart), dans le dossier privé des sauvegardes, avec ses marques', async () => {
    await seConnecter()
    const f = fichier(3000)
    const r = await sauvegarder({ ...base, fichier: f })
    expect(r.cree).toBe(true)
    const s = g[r.id]
    expect(memes(s.octets, await octetsDe(f))).toBe(true)
    expect(s).toMatchObject({ name: 'Symétrie centrale.memc', mimeType: 'application/octet-stream', description: DESCRIPTION_SAUVEGARDE })
    expect(s.appProperties).toEqual({ memSauvegarde: 'v1', memClasseur: base.classeur, memOrigine: 'appareil-A', memT: '1000' })
    const d = g[s.parents![0]]
    expect(d).toMatchObject({ name: 'MEM - Sauvegardes', mimeType: DOSSIER, appProperties: { memSauvegardes: 'dossier-v1', memCompte: 'mem' } })
    expect(d.appProperties!.memReplay).toBeUndefined()
    // Créé privé, comme le dossier des replays
    expect(requetes.filter(q => q.methode === 'POST').every(q => q.url.searchParams.get('ignoreDefaultVisibility') === 'true')).toBe(true)
    expect(requetes.some(q => q.url.searchParams.get('uploadType') === 'resumable')).toBe(false)
  })

  it('la suivante remplace LE MÊME fichier : par son id, ou retrouvée dans le dossier (un autre onglet)', async () => {
    await seConnecter()
    const a = await sauvegarder({ ...base, fichier: fichier(100) })
    const b = await sauvegarder({ ...base, fichier: fichier(200), idExistant: a.id, t: 2000, nom: 'Symétrie (renommé)' })
    expect(b).toEqual({ id: a.id, cree: false })
    const c = await sauvegarder({ ...base, fichier: fichier(300), idExistant: null, t: 3000 })
    expect(c.id).toBe(a.id)
    expect(sauvegardes()).toHaveLength(1)
    expect(g[a.id].octets).toHaveLength(300)
    expect(g[a.id].appProperties!.memT).toBe('3000')
    expect(g[a.id].versions).toHaveLength(3)
    // Aucune suppression, jamais
    expect(requetes.some(q => q.methode === 'DELETE')).toBe(false)
    expect(dossiersG()).toHaveLength(1)
  })

  it('un fichier disparu, à la corbeille ou sorti du dossier : un autre, dans le dossier', async () => {
    await seConnecter()
    const a = await sauvegarder({ ...base, fichier: fichier(100) })
    g[a.id].trashed = true
    const b = await sauvegarder({ ...base, fichier: fichier(100), idExistant: a.id })
    expect(b.cree).toBe(true); expect(b.id).not.toBe(a.id)
    const c = await sauvegarder({ ...base, fichier: fichier(100), idExistant: 'disparuxxxxxxxxxx' })
    expect(c.id).toBe(b.id)
    g[b.id].parents = ['ailleurs']
    const d = await sauvegarder({ ...base, fichier: fichier(100), idExistant: b.id })
    expect(d.cree).toBe(true)
  })

  for (const location of [true, false]) {
    it(`au-delà de 5 Mo, l'envoi reprenable (${location ? 'avec' : 'sans'} l'en-tête Location lisible), le même fichier ensuite`, async () => {
      exposeLocation = location
      await seConnecter()
      const f = fichier(6 * 1024 * 1024)
      const r = await sauvegarder({ ...base, fichier: f })
      expect(r.cree).toBe(true)
      expect(memes(g[r.id].octets, await octetsDe(f))).toBe(true)
      const ouverture = requetes.find(q => q.url.searchParams.get('uploadType') === 'resumable' && !q.url.searchParams.get('upload_id'))!
      expect(ouverture.methode).toBe('POST')
      expect(ouverture.entetes['x-upload-content-length']).toBe(String(f.size))
      expect(requetes.filter(q => q.methode === 'PUT')).toHaveLength(1)
      // Et la suivante, sur le même fichier (PATCH, puis PUT)
      const r2 = await sauvegarder({ ...base, fichier: fichier(6 * 1024 * 1024 + 5), idExistant: r.id })
      expect(r2.id).toBe(r.id)
      expect(requetes.filter(q => q.url.searchParams.get('uploadType') === 'resumable' && q.methode === 'PATCH')).toHaveLength(1)
      expect(g[r.id].octets).toHaveLength(6 * 1024 * 1024 + 5)
      expect(sauvegardes()).toHaveLength(1)
    })
  }

  it('les dossiers des replays et des sauvegardes ont des marques distinctes : l\'un n\'est jamais pris pour l\'autre', async () => {
    await seConnecter()
    const s1 = await sauvegarder({ ...base, fichier: fichier(100) })
    // Publier ensuite : un autre dossier, le sien
    const p = await publier('MEM - Replay séances', 'Séance', SEANCE, 'mem:1', null, async () => {})
    const dossierReplay = g[g[p.id].parents![0]], dossierSauve = g[g[s1.id].parents![0]]
    expect(dossierReplay.id).not.toBe(dossierSauve.id)
    expect(dossierReplay.appProperties).toEqual({ memReplay: 'dossier-v1', memCompte: 'mem' })
    expect(dossierSauve.appProperties).toEqual({ memSauvegardes: 'dossier-v1', memCompte: 'mem' })
    // Le dossier des sauvegardes renommé « MEM - Replay séances » à la main : ni Publier ni la copie ne s'y trompent
    dossierSauve.name = 'MEM - Replay séances'
    const p2 = await publier('MEM - Replay séances', 'Séance 2', SEANCE, 'mem:2', null, async () => {})
    expect(g[p2.id].parents![0]).toBe(dossierReplay.id)
    const s2 = await sauvegarder({ ...base, fichier: fichier(100), idExistant: s1.id })
    expect(s2.id).toBe(s1.id)
    expect(dossierSauve.name).toBe('MEM - Sauvegardes')
    // Le Drive du lycée a les siens
    const l = await sauvegarder({ ...base, compte: 'lfb', fichier: fichier(100) })
    expect(g[g[l.id].parents![0]]).toMatchObject({ name: 'LFB - Sauvegardes', appProperties: { memSauvegardes: 'dossier-v1', memCompte: 'lfb' } })
  })

  it('le garde-fou des deux ordinateurs : memOrigine différent ET memT plus récent que l\'arrivée ici', async () => {
    await seConnecter()
    // La maison a copié le soir (son contenu de 2000)
    const m = await sauvegarder({ ...base, origine: 'maison', t: 2000, fichier: fichier(100) })
    const avant = g[m.id].octets
    // Le lycée, sur le classeur arrivé à 1000 : pas remplacé
    const l = await sauvegarder({ ...base, origine: 'lycee', recu: 1000, t: 1500, fichier: fichier(200) })
    expect(l).toEqual({ id: m.id, cree: false, conflit: { t: 2000 } })
    expect(g[m.id].octets).toBe(avant)
    // Le poste remis à zéro qui a rouvert le matin le fichier de la clé (arrivé à 2500) : remplacée
    const z = await sauvegarder({ ...base, origine: 'poste-neuf', recu: 2500, t: 2600, fichier: fichier(300) })
    expect(z.conflit).toBeUndefined(); expect(g[m.id].octets).toHaveLength(300)
    // Le même appareil : toujours remplacée
    const y = await sauvegarder({ ...base, origine: 'poste-neuf', recu: 0, t: 2700, fichier: fichier(310) })
    expect(y.conflit).toBeUndefined()
    // « Remplacer quand même »
    const x = await sauvegarder({ ...base, origine: 'lycee', recu: 0, t: 1600, fichier: fichier(320), forcer: true })
    expect(x.conflit).toBeUndefined(); expect(g[m.id].octets).toHaveLength(320)
    expect(g[m.id].appProperties!.memOrigine).toBe('lycee')
    expect(sauvegardes()).toHaveLength(1)
  })

  it('elaguerVersions garde les 10 dernières (et celles gardées dans Drive), jamais la dernière', async () => {
    await seConnecter()
    const r = await sauvegarder({ ...base, fichier: fichier(10) })
    for (let i = 0; i < 14; i++) await sauvegarder({ ...base, fichier: fichier(10 + i), idExistant: r.id })
    const f = g[r.id]
    expect(f.versions).toHaveLength(15)
    f.versions[2].keepForever = true
    const derniere = f.versions.at(-1)!.id, gardee = f.versions[2].id
    expect(await elaguerVersions(r.id)).toBe(4)
    expect(f.versions).toHaveLength(11)
    expect(f.versions.filter(v => !v.keepForever)).toHaveLength(10)
    expect(f.versions.at(-1)!.id).toBe(derniere)
    expect(f.versions.some(v => v.id === gardee)).toBe(true)
    // Rien à faire : rien
    expect(await elaguerVersions(r.id)).toBe(0)
    // Même à 0, la dernière reste
    await elaguerVersions(r.id, 0)
    expect(f.versions.map(v => v.id)).toEqual([gardee, derniere])
    // Une erreur : ignorée
    expect(await elaguerVersions('inconnuxxxxxxxxxx')).toBe(0)
  })

  it('listerSauvegardes : celles du dossier des sauvegardes, la plus récente d\'abord ; sans dossier, rien (et rien de créé)', async () => {
    await seConnecter()
    expect(await listerSauvegardes('mem')).toEqual([])
    expect(dossiersG()).toHaveLength(0)
    const a = await sauvegarder({ ...base, fichier: fichier(100) })
    const b = await sauvegarder({ ...base, classeur: 'bbbbbbbbbbbbbbbb', nom: 'Fractions', fichier: fichier(250) })
    // Une séance publiée n'en est pas une
    await publier('MEM - Replay séances', 'Séance', SEANCE, 'mem:1', null, async () => {})
    const l = await listerSauvegardes('mem')
    expect(l.map(x => x.id)).toEqual([b.id, a.id])
    expect(l[0]).toMatchObject({ nom: 'Fractions.memc', taille: 250, classeur: 'bbbbbbbbbbbbbbbb' })
    expect(l[0].modifie).toBeGreaterThan(l[1].modifie)
    expect(await listerSauvegardes('lfb')).toEqual([])
    expect(memes(await lireSauvegarde(b.id), await octetsDe(fichier(250)))).toBe(true)
  })

  it('le Drive plein : une erreur qui le dit (403 storageQuotaExceeded) ; la connexion refusée (401) : déconnecté', async () => {
    await seConnecter()
    await sauvegarder({ ...base, fichier: fichier(100) })
    plein = true
    const e = await sauvegarder({ ...base, fichier: fichier(100) }).catch(x => x)
    expect(e).toBeInstanceOf(ErreurDrive)
    expect(e).toMatchObject({ statut: 403, raison: 'storageQuotaExceeded' })
    plein = false
    refuse401 = true
    const e2 = await sauvegarder({ ...base, fichier: fichier(100) }).catch(x => x)
    expect(e2).toMatchObject({ statut: 401 })
    expect(connecte('mem')).toBe(false)
    // Sans connexion : rien ne part
    refuse401 = false
    const avant = requetes.length
    expect(await sauvegarder({ ...base, fichier: fichier(100) }).catch(x => x)).toMatchObject({ statut: 401 })
    expect(requetes.length).toBe(avant)
  })
})
