// Outils repris de lot4/C10-drive.mjs (le faux Google, l'OPFS simulé), pour la vérification de conformité
import { chromium } from '../../../commun/playwright.mjs'
import { gunzipSync, gzipSync } from 'node:zlib'
import * as Y from 'yjs'
import { mkdirSync } from 'node:fs'
export const DEV = 'http://localhost:5173/'
export let navigateur = null
export const lancer = async (o = {}) => { navigateur = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' }, ...o }); return navigateur }
export let echecs = 0
export const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1800) : '') }
export const dort = ms => new Promise(r => setTimeout(r, ms))
export const norm = t => (t || '').replace(/[  ]/g, ' ')
export const seul = section => process.argv.length <= 2 || process.argv.slice(2).includes(section)
export const MIN = 60_000

export const erreurs = []
export const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}

// =====================================================================
// LE FAUX GOOGLE
// =====================================================================
export const DOSSIER = 'application/vnd.google-apps.folder'
/** Tous les faux Google de l'essai (les vérifications de la fin) */
export const TOUS = []
/** Un faux Drive par compte Google (son adresse) */
export class FauxGoogle {
  constructor() {
    TOUS.push(this)
    this.relais = []
    this.drives = new Map()      // courriel -> Map(id -> fichier)
    this.n = 0
    this.requetes = []
    this.choisi = 'prof@example.com'
    this.expire = 3600
    this.gis = []                // les appels de requestAccessToken
    this.panne = null            // 'reseau' | 'plein' | '401' | null
    this.exposeLocation = true
    this.sessions = new Map()
    this.horloge = Date.now()
  }
  drive(qui) { if (!this.drives.has(qui)) this.drives.set(qui, new Map()); return this.drives.get(qui) }
  fichiers(qui = this.choisi) { return [...this.drive(qui).values()] }
  sauvegardes(qui = this.choisi) { return this.fichiers(qui).filter(f => f.mimeType !== DOSSIER && f.appProperties?.memSauvegarde === 'v1' && !f.trashed) }
  dossiers(qui = this.choisi) { return this.fichiers(qui).filter(f => f.mimeType === DOSSIER) }
  vue(f) {
    return { id: f.id, name: f.name, mimeType: f.mimeType, parents: f.parents, trashed: !!f.trashed, appProperties: f.appProperties, description: f.description,
      size: f.octets ? String(f.octets.length) : undefined, modifiedTime: new Date(f.modifie).toISOString(), permissions: [{ id: 'p', type: 'user', role: 'owner' }] }
  }
  chercher(d, q) {
    let l = [...d.values()], reste = q
    const clause = (re, filtre) => { for (let m = re.exec(reste); m; m = re.exec(reste)) { const fl = filtre(m); l = l.filter(fl); reste = reste.replace(m[0], ' ') } }
    const texte = s => s.replace(/\\'/g, '\'')
    clause(/appProperties has \{ key='([^']+)' and value='((?:[^'\\]|\\.)*)' \}/, m => f => f.appProperties?.[m[1]] === texte(m[2]))
    clause(/trashed=false/, () => f => !f.trashed)
    clause(/mimeType='([^']+)'/, m => f => f.mimeType === m[1])
    clause(/'([^']+)' in parents/, m => f => !!f.parents?.includes(m[1]))
    if (reste.replace(/\band\b/g, '').trim()) throw new Error('clause inconnue : ' + reste)
    return l
  }
  ecrire(d, id, meta, octets) {
    this.horloge = Math.max(this.horloge + 1000, Date.now())
    const f = id ? d.get(id) : { id: `sauve${++this.n}xxxxxxxxxxxx`, versions: [] }
    const { parents, ...reste } = meta
    Object.assign(f, reste, { octets, modifie: this.horloge })
    if (!id) f.parents = parents
    f.versions.push({ id: `v${++this.n}`, modifiedTime: new Date(this.horloge).toISOString() })
    d.set(f.id, f)
    return f.id
  }
  multipart(corps, type) {
    const borne = /boundary=(\S+)/.exec(type)[1]
    const t = corps.toString('latin1')
    const parts = t.split(`--${borne}`).slice(1, 3).map(m => { const i = m.indexOf('\r\n\r\n'); return { tete: m.slice(0, i), corps: m.slice(i + 4).replace(/\r\n$/, '') } })
    return { meta: JSON.parse(Buffer.from(parts[0].corps, 'latin1').toString('utf8')), type: /Content-Type: (\S+)/.exec(parts[1].tete)?.[1], octets: Buffer.from(parts[1].corps, 'latin1') }
  }
  async brancher(ctx) {
    const g = this
    await ctx.exposeFunction('__gis', (hint, prompt, actif) => { g.gis.push({ hint: hint ?? '', prompt: prompt ?? null, actif }); return { qui: g.choisi, expire: g.expire } })
    await ctx.route(/accounts\.google\.com\/gsi\/client/, r => r.fulfill({ contentType: 'text/javascript', body: `window.google = { accounts: { oauth2: {
      initTokenClient: o => ({ requestAccessToken: async q => { const r = await window.__gis(o.login_hint, q && q.prompt, navigator.userActivation.isActive); o.callback({ access_token: 'jeton:' + r.qui, expires_in: r.expire }) } }),
      hasGrantedAllScopes: () => true } } }` }))
    await ctx.route(/www\.googleapis\.com/, r => g.repondre(r))
    // Le relais des replays : la copie n'y va jamais
    await ctx.route(/script\.google\.com/, r => { g.relais.push(r.request().url()); return r.fulfill({ status: 404, body: '' }) })
  }
  async repondre(r) {
    const req = r.request(), u = new URL(req.url()), m = req.method()
    const qui = (req.headers().authorization ?? '').replace('Bearer jeton:', '')
    this.requetes.push({ m, chemin: u.pathname, recherche: u.search, qui })
    const json = (o, status = 200, entetes = {}) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...entetes }, body: o === null ? '' : JSON.stringify(o) })
    if (this.panne === 'reseau') return r.abort('connectionrefused')
    if (this.panne === '401') return json({ error: { message: 'Invalid Credentials' } }, 401)
    const d = this.drive(qui)
    if (u.pathname === '/drive/v3/about') return json({ user: { emailAddress: qui } })
    if (u.pathname.startsWith('/upload/')) {
      if (this.panne === 'plein') return json({ error: { message: 'The user\'s Drive storage quota has been exceeded.', errors: [{ reason: 'storageQuotaExceeded' }] } }, 403)
      const id = u.pathname.match(/\/files\/([^/]+)$/)?.[1] ?? null
      const type = u.searchParams.get('uploadType')
      if (type === 'multipart') {
        const x = this.multipart(req.postDataBuffer(), req.headers()['content-type'])
        if (x.meta.appProperties?.memSauvegarde && x.type !== 'application/octet-stream') return json({ error: { message: 'type ' + x.type } }, 400)
        return json({ id: this.ecrire(d, id, x.meta, x.octets) })
      }
      if (type === 'resumable' && u.searchParams.get('upload_id')) {
        const s = this.sessions.get(u.searchParams.get('upload_id'))
        if (!s || m !== 'PUT') return json({ error: { message: 'session' } }, 404)
        return json({ id: this.ecrire(d, s.id, s.meta, req.postDataBuffer()) })
      }
      if (type === 'resumable') {
        const envoi = 'envoi' + (++this.n)
        this.sessions.set(envoi, { id, meta: JSON.parse(req.postData()), taille: Number(req.headers()['x-upload-content-length']) })
        const loc = `https://www.googleapis.com/upload/drive/v3/files${id ? '/' + id : ''}?uploadType=resumable&upload_id=${envoi}`
        return json(null, 200, { 'x-guploader-uploadid': envoi, 'access-control-expose-headers': this.exposeLocation ? 'Location, X-GUploader-UploadID' : 'X-GUploader-UploadID', ...(this.exposeLocation ? { location: loc } : {}) })
      }
    }
    const rev = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/revisions(?:\/([^/]+))?$/)
    if (rev) {
      const f = d.get(decodeURIComponent(rev[1]))
      if (!f) return json({ error: { message: 'File not found' } }, 404)
      if (m === 'DELETE') {
        const i = f.versions.findIndex(v => v.id === decodeURIComponent(rev[2]))
        if (i < 0 || i === f.versions.length - 1) return json({ error: { message: 'cannotDeleteLastRevision' } }, 400)
        f.versions.splice(i, 1)
        return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' })
      }
      return json({ revisions: f.versions })
    }
    const une = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/)
    if (une) {
      const f = d.get(decodeURIComponent(une[1]))
      if (!f) return json({ error: { message: 'File not found' } }, 404)
      if (u.searchParams.get('alt') === 'media') return r.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'access-control-allow-origin': '*' }, body: f.octets })
      if (m === 'PATCH') Object.assign(f, JSON.parse(req.postData()))
      return json(this.vue(f))
    }
    if (u.pathname === '/drive/v3/files' && m === 'POST') {
      const o = JSON.parse(req.postData()); const id = 'dossier' + (++this.n) + 'xxxxxxxxx'
      d.set(id, { ...o, id, versions: [], modifie: Date.now() }); return json({ id })
    }
    if (u.pathname === '/drive/v3/files' && m === 'GET') return json({ files: this.chercher(d, u.searchParams.get('q') || '').map(f => this.vue(f)) })
    return json({ error: { message: 'inconnu ' + u.pathname } }, 404)
  }
  /** Les requêtes vers le Drive depuis la dernière fois */
  depuis(n) { return this.requetes.slice(n) }
}

// =====================================================================
// LA PAGE
// =====================================================================
/** Les poignées de l'OPFS, les permissions simulées (comme C4, C9) */
export const INIT = () => {
  window.__choix = []
  window.__aOuvrir = null
  window.__nomChoisi = null
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { return 'granted' }
  H.requestPermission = async function () { return 'granted' }
  window.showSaveFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    const nom = window.__nomChoisi || o?.suggestedName || 'sans-nom.memc'
    window.__choix.push({ quoi: 'save', nom })
    return dir.getFileHandle(nom, { create: true })
  }
  window.showOpenFilePicker = async () => {
    const dir = await navigator.storage.getDirectory()
    const noms = [].concat(window.__aOuvrir ?? [])
    window.__aOuvrir = null
    if (!noms.length) throw new DOMException('rien', 'AbortError')
    return Promise.all(noms.map(n => dir.getFileHandle(n)))
  }
}
export const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
export const toasts = p => p.evaluate(() => (window.__toasts || []).splice(0))
export const attendreToast = (p, re, timeout = 15000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)

export async function contexte(g, o = {}) {
  const ctx = await (o.navigateur ?? navigateur).newContext({ viewport: { width: 1366, height: 768 }, ...(o.ctx ?? {}) })
  await g.brancher(ctx)
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(ECOUTER_TOASTS)
  for (const s of o.scripts ?? []) await ctx.addInitScript(s)
  return ctx
}
export const pret = async p => {
  await p.waitForFunction(() => window.__surveillance && window.__drive !== undefined && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
}
export async function ouvrir(ctx, chemin = '', nom = 'p', horloge = true) {
  const p = await ctx.newPage(); suivre(p, nom)
  if (horloge) await p.clock.install()
  await p.goto(DEV + chemin); await pret(p)
  return p
}
/** La connexion Google chargée (3 s après l'ouverture) */
export async function gisPret(p) {
  await p.clock.fastForward(3500).catch(() => {})
  return p.waitForFunction(() => !!window.google?.accounts?.oauth2, null, { timeout: 10000 }).then(() => true, () => false)
}
export async function ecrire(p, x0, y0, n = 10) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(80)
}
/** Ce que montrent le Drive, le bouton, le bandeau */
export const ETAT = () => {
  const band = document.querySelector('.bandeau-sauvegarde'), n = t => (t || '').replace(/[  ]/g, ' ')
  return {
    drive: window.__drive ? { ...window.__drive.etat, ...(window.__drive.etat.message ? { message: n(window.__drive.etat.message) } : {}) } : null,
    court: n(document.querySelector('.etat-classeur')?.textContent),
    niveau: window.__surveillance?.texte.niveau,
    point: !document.querySelector('.bouton-classeur .point-etat').hidden,
    bandeau: band.hidden ? null : { raison: band.dataset.raison, texte: n(band.querySelector('.texte-bandeau')?.textContent), boutons: [...band.querySelectorAll('.bouton-bandeau')].map(x => x.textContent) },
    ligne: (window.__surveillance?.texte.lignes ?? []).filter(l => l.quoi === 'drive').map(l => ({ texte: n(l.texte), niveau: l.niveau, action: l.action ?? null, plus: l.plus ?? [] }))[0] ?? null,
  }
}
export const etat = p => p.evaluate(ETAT)
export const ficheDe = (p, id) => p.evaluate(async id => {
  const f = await window.__registre.classeur(id ?? window.__app.classeur.id)
  return f ? { ...f, vecteur: f.vecteur ? [...f.vecteur] : null, drive: f.drive ? { ...f.drive, vecteur: f.drive.vecteur ? [...f.drive.vecteur] : null } : null } : null
}, id)
/** Le menu ⋯ : ses entrées, et la ligne du Drive du bloc de l'état */
export async function menu(p) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  const m = await p.evaluate(() => {
    const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
    const n = t => (t || '').replace(/[  ]/g, ' ')
    const libelles = {}
    for (const e of m.querySelectorAll('.menu-item[data-action]')) libelles[e.dataset.action] = { texte: n(e.querySelector('.libelle')?.firstChild?.textContent), aide: n(e.querySelector('small')?.textContent) || null, inactif: e.getAttribute('aria-disabled') === 'true' }
    const li = m.querySelector('.bloc-lignes li[data-ligne="drive"]')
    return {
      entrees: [...m.querySelectorAll('.menu-item')].map(e => e.dataset.action ?? ('etat:' + e.dataset.etatAction)), libelles,
      drive: li ? { texte: n(li.querySelector('.texte-ligne')?.textContent), boutons: [...li.querySelectorAll('button')].map(b => b.dataset.etatAction) } : null,
    }
  })
  return m
}
export const fermerMenu = async p => { await p.keyboard.press('Escape'); await p.waitForTimeout(100) }
/** Lit un .memc (Node) : son en-tête, son état */
export function lireMemc(o) {
  const b = Buffer.from(o)
  const fin = b.indexOf(10)
  const entete = JSON.parse(b.subarray(0, fin).toString('utf8'))
  let entier = true
  try { gunzipSync(b.subarray(fin + 1)) } catch { entier = false }
  return { entete, entier }
}
/** Un .memc plus récent du même classeur, fait « sur un autre ordinateur »
 *  (sous Node) : son contenu, et des traits de plus (un autre clientID) */
export function plusRecent(memc, traits, date = Date.now()) {
  const b = Buffer.from(memc), fin = b.indexOf(10)
  const entete = JSON.parse(b.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(b.subarray(fin + 1))))
  const page = d.getArray('ordre').get(0)
  const formes = d.getMap('pages').get(page).get('formes')
  d.transact(() => {
    traits.forEach((id, j) => formes.set(id, { id, type: 'trait', x: 600 + 20 * j, y: 500, z: Date.now() + j, auteur: 'maison', pts: [0, 0, 0.5, 40, 12, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }))
    d.getArray('film').push([{ t: date, page }])
  })
  const tete = Buffer.from(JSON.stringify({ ...entete, date }) + '\n')
  return Buffer.concat([tete, gzipSync(Buffer.from(Y.encodeStateAsUpdate(d)))])
}
/** Un classeur neuf fait sous Node (une page, un trait), en .memc */
export function neufMemc(nom, id) {
  const d = new Y.Doc({ gc: false })
  const page = new Y.Map(); page.set('fond', 'carreaux')
  const f = new Y.Map(); f.set('TNEUF', { id: 'TNEUF', type: 'trait', x: 10, y: 10, z: 1, auteur: 'essai', pts: [0, 0, 0.5, 30, 10, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  page.set('formes', f)
  d.getMap('pages').set('p0', page)
  d.getArray('ordre').push(['p0'])
  d.getArray('film').push([{ t: Date.now(), page: 'p0' }])
  const tete = Buffer.from(JSON.stringify({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', date: Date.now(), pages: 1, nom, id }) + '\n')
  return Buffer.concat([tete, gzipSync(Buffer.from(Y.encodeStateAsUpdate(d)))])
}
/** Les ids des formes d'un .memc (Node) */
export function formesDe(memc) {
  const b = Buffer.from(memc), fin = b.indexOf(10)
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(b.subarray(fin + 1))))
  return d.getArray('ordre').toArray().flatMap(id => [...(d.getMap('pages').get(id)?.get('formes')?.keys() ?? [])])
}
export const formesIci = p => p.evaluate(() => window.__app.pages.flatMap(id => [...(window.__app.tableau.formesDe(id)?.keys() ?? [])]))
export const DIALOGUES = () => [...document.querySelectorAll('dialog[open]')].map(d => ({
  titre: d.querySelector('h2')?.textContent,
  textes: [...d.querySelectorAll('.corps > p, .corps p')].map(p => (p.textContent || '').replace(/[\u00a0\u202f]/g, ' ')),
  boutons: [...d.querySelectorAll('.actions button')].map(b => ({ a: b.dataset.a ?? b.className, t: (b.textContent || '').replace(/[\u00a0\u202f]/g, ' ') })),
}))
export const dialogue = async (p, timeout = 20000) => { await p.waitForSelector('dialog[open]', { timeout }); await p.waitForTimeout(150); return (await p.evaluate(DIALOGUES))[0] }
/** Connecté dans un clic : menu ⋯ → « Copie sur le Drive… » → [Se connecter à Google] */
export async function seConnecter(p) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="copie-drive"]')
  await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
  await p.click('dialog.dialogue-drive[open] .d-connecter')
  await p.waitForFunction(() => /^Connecté/.test(document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
  await p.click('dialog.dialogue-drive[open] .d-annuler')
  await p.waitForFunction(() => window.__drive.etat.etat !== 'connexion', null, { timeout: 10000 }).catch(() => {})
}
