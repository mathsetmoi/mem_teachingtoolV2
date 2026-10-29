// ESSAI DU MORCEAU C10-drive (lot 4) : la copie à sens unique sur le Drive
// (« MEM - Sauvegardes », « LFB - Sauvegardes »), un budget de versions ;
// « Récupérer une sauvegarde du Drive ».
// Google est simulé comme dans test50.mjs : la bibliothèque de connexion
// (GIS : requestAccessToken rend un jeton « jeton:<compte> », expires_in
// réglable, et note s'il est appelé dans un geste), et l'API Drive (un faux
// Drive par compte Google, en Node : les recherches, les dossiers, les
// envois multipart lus en octets (postDataBuffer), l'envoi reprenable
// (X-GUploader-UploadID, Location exposé ou non par
// access-control-expose-headers), alt=media, les versions).
// A. La copie 2 min après le changement (page.clock) : le bon dossier, ses
//    marques, le fichier et les siennes, la fiche ; la suivante remplace le
//    même fichier, pas avant 10 min ; l'élagage des versions ; GIS chargé à
//    l'avance ; le menu ⋯ (« Copie sur le Drive… ») et la fenêtre du choix.
// B. Le jeton qui expire (expires_in 61 s) : « connexion » ; avec la clé à
//    jour, ni bandeau ni point ; sans clé, le bandeau après 2 min sans geste ;
//    requestAccessToken jamais appelé sans un clic ; le clic, la reprise.
// C. Hors connexion, un réseau qui filtre Google, le Drive plein : rien
//    n'est perdu, l'état le dit, la reprise.
// D. Les deux conflits (un autre ordinateur ; l'histoire perdue) : le
//    bandeau, « Récupérer la copie du Drive » (le chemin d'Ouvrir : mettre à
//    jour sans perte), « Remplacer quand même » ; la question de Remplacer.
// E. « Récupérer une sauvegarde du Drive » (la bibliothèque) : rien ne
//    revient sans la demande ; la liste, « déjà dans la bibliothèque » ; un
//    nouveau classeur.
// F. Le poste remis à zéro, en ligne : le .memc de la clé ouvert le matin
//    remplace la copie de la veille sans conflit ; deux onglets ; les
//    classeurs en retard.
// G. Plus de 5 Mo : l'envoi reprenable, avec et sans Location lisible.
// H. Firefox, l'iPad (sans showSaveFilePicker, sans Web Locks) : la copie
//    marche ; la version hors ligne (file://) : « impossible », rien vers Google.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { lancerPersistant } from '../commun/playwright.mjs'
import { gunzipSync, gzipSync } from 'node:zlib'
import * as Y from 'yjs'
import { mkdirSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C10/'
const DEV = 'http://localhost:5173/'
mkdirSync(ICI + 'travail', { recursive: true })

let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1800) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const norm = t => (t || '').replace(/[  ]/g, ' ')
const seul = section => process.argv.length <= 2 || process.argv.slice(2).includes(section)
const MIN = 60_000

const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}

// =====================================================================
// LE FAUX GOOGLE
// =====================================================================
const DOSSIER = 'application/vnd.google-apps.folder'
/** Tous les faux Google de l'essai (les vérifications de la fin) */
const TOUS = []
/** Un faux Drive par compte Google (son adresse) */
class FauxGoogle {
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
const INIT = () => {
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
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const toasts = p => p.evaluate(() => (window.__toasts || []).splice(0))
const attendreToast = (p, re, timeout = 15000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)

async function contexte(g, o = {}) {
  const ctx = await (o.navigateur ?? navigateur).newContext({ viewport: { width: 1366, height: 768 }, ...(o.ctx ?? {}) })
  await g.brancher(ctx)
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(ECOUTER_TOASTS)
  for (const s of o.scripts ?? []) await ctx.addInitScript(s)
  return ctx
}
const pret = async p => {
  await p.waitForFunction(() => window.__surveillance && window.__drive !== undefined && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
}
async function ouvrir(ctx, chemin = '', nom = 'p', horloge = true) {
  const p = await ctx.newPage(); suivre(p, nom)
  if (horloge) await p.clock.install()
  await p.goto(DEV + chemin); await pret(p)
  return p
}
/** La connexion Google chargée (3 s après l'ouverture) */
async function gisPret(p) {
  await p.clock.fastForward(3500).catch(() => {})
  return p.waitForFunction(() => !!window.google?.accounts?.oauth2, null, { timeout: 10000 }).then(() => true, () => false)
}
async function ecrire(p, x0, y0, n = 10) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(80)
}
/** Ce que montrent le Drive, le bouton, le bandeau */
const ETAT = () => {
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
const etat = p => p.evaluate(ETAT)
const ficheDe = (p, id) => p.evaluate(async id => {
  const f = await window.__registre.classeur(id ?? window.__app.classeur.id)
  return f ? { ...f, vecteur: f.vecteur ? [...f.vecteur] : null, drive: f.drive ? { ...f.drive, vecteur: f.drive.vecteur ? [...f.drive.vecteur] : null } : null } : null
}, id)
/** Le menu ⋯ : ses entrées, et la ligne du Drive du bloc de l'état */
async function menu(p) {
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
const fermerMenu = async p => { await p.keyboard.press('Escape'); await p.waitForTimeout(100) }
/** Lit un .memc (Node) : son en-tête, son état */
function lireMemc(o) {
  const b = Buffer.from(o)
  const fin = b.indexOf(10)
  const entete = JSON.parse(b.subarray(0, fin).toString('utf8'))
  let entier = true
  try { gunzipSync(b.subarray(fin + 1)) } catch { entier = false }
  return { entete, entier }
}
/** Un .memc plus récent du même classeur, fait « sur un autre ordinateur »
 *  (sous Node) : son contenu, et des traits de plus (un autre clientID) */
function plusRecent(memc, traits, date = Date.now()) {
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
function neufMemc(nom, id) {
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
function formesDe(memc) {
  const b = Buffer.from(memc), fin = b.indexOf(10)
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(b.subarray(fin + 1))))
  return d.getArray('ordre').toArray().flatMap(id => [...(d.getMap('pages').get(id)?.get('formes')?.keys() ?? [])])
}
const formesIci = p => p.evaluate(() => window.__app.pages.flatMap(id => [...(window.__app.tableau.formesDe(id)?.keys() ?? [])]))
const DIALOGUES = () => [...document.querySelectorAll('dialog[open]')].map(d => ({
  titre: d.querySelector('h2')?.textContent,
  textes: [...d.querySelectorAll('.corps > p, .corps p')].map(p => (p.textContent || '').replace(/[\u00a0\u202f]/g, ' ')),
  boutons: [...d.querySelectorAll('.actions button')].map(b => ({ a: b.dataset.a ?? b.className, t: (b.textContent || '').replace(/[\u00a0\u202f]/g, ' ') })),
}))
const dialogue = async (p, timeout = 20000) => { await p.waitForSelector('dialog[open]', { timeout }); await p.waitForTimeout(150); return (await p.evaluate(DIALOGUES))[0] }
/** Connecté dans un clic : menu ⋯ → « Copie sur le Drive… » → [Se connecter à Google] */
async function seConnecter(p) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="copie-drive"]')
  await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
  await p.click('dialog.dialogue-drive[open] .d-connecter')
  await p.waitForFunction(() => /^Connecté/.test(document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
  await p.click('dialog.dialogue-drive[open] .d-annuler')
  await p.waitForFunction(() => window.__drive.etat.etat !== 'connexion', null, { timeout: 10000 }).catch(() => {})
}
/** La première copie faite (un trait, 2 min) */
async function premiereCopie(p, g) {
  await ecrire(p, 250, 200)
  await p.clock.fastForward(2 * MIN + 3000)
  await p.waitForFunction(() => window.__drive.etat.t !== undefined, null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  return g.sauvegardes()[0]
}
/** Un geste dans la page : un clic sur ce sélecteur (navigator.userActivation) */
const cliquer = (p, sel) => p.click(sel)

// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (la poignée de la clé relue depuis IndexedDB)
let navigateur = await lancerPersistant()

// =====================================================================
// A. LA COPIE, 2 MIN APRÈS LE CHANGEMENT
// =====================================================================
if (seul('A')) {
  console.log('=== A. la copie sur le Drive (serveur de développement, horloge simulée) ===')
  const g = new FauxGoogle()
  const ctx = await contexte(g)
  const p = await ouvrir(ctx, '', 'A')
  const id = await p.evaluate(() => window.__app.classeur.id)

  // ---- A1. Avant toute connexion : rien vers Google, GIS chargé à l'avance ----
  let e = await etat(p)
  ok(e.drive?.etat === 'connexion' && !e.drive.enAttente && e.ligne?.texte === 'Sur le Drive : en attente de la connexion Google' && e.ligne.niveau === 'info' && e.ligne.action === null && !e.point && !e.bandeau,
    'A1) un navigateur neuf, rien à copier : « Sur le Drive : en attente de la connexion Google » (information, sans bouton : rien n\'attend), ni point ni bandeau', e)
  ok(e.court === 'Seulement dans ce navigateur', `   … le bouton : « ${e.court} »`, e.court)
  const avantGis = await p.evaluate(() => !!document.getElementById('google-identite'))
  ok(await gisPret(p) && !avantGis, '   … la connexion Google se charge à l\'avance, 3 s après l\'ouverture (pas pendant)')
  ok(g.requetes.length === 0 && g.gis.length === 0, '   … aucune requête au Drive, aucune fenêtre Google')
  // Le menu ⋯ : « Copie sur le Drive… », et la ligne du Drive avec son bouton
  let m = await menu(p)
  ok(m.entrees.includes('copie-drive') && m.libelles['copie-drive'].texte === 'Copie sur le Drive…' && !m.libelles['copie-drive'].inactif
    && m.libelles['copie-drive'].aide === 'Une copie à sens unique, dans un dossier privé de votre Drive : choisir le compte, ou pas de copie.'
    && m.entrees.indexOf('copie-drive') < m.entrees.indexOf('ouvrir'),
    'A1) le menu ⋯ : « Copie sur le Drive… » (data-action copie-drive), avec son aide, avant « Ouvrir un classeur… »', m)
  ok(m.drive?.texte === 'Sur le Drive : en attente de la connexion Google' && m.drive.boutons.length === 0 && m.entrees[0] === 'bibliotheque', '   … la ligne du Drive sans bouton : le menu commence toujours par « Bibliothèque des classeurs… »', m)
  await fermerMenu(p)

  // ---- A2. Se connecter : dans le clic (« Copie sur le Drive… ») ----
  await seConnecter(p)
  e = await etat(p)
  ok(g.gis.length === 1 && g.gis[0].actif && g.gis[0].prompt === 'select_account' && g.gis[0].hint === '',
    'A2) « Se connecter à Google » : requestAccessToken, dans le geste, avec la liste des comptes (aucun compte retenu)', g.gis)
  ok(e.drive.etat === 'ok' && e.drive.t === undefined && !e.drive.enAttente && e.ligne.texte === 'Sur le Drive personnel (prof@example.com) : rien à copier pour l\'instant',
    `   … connecté, rien à copier : « ${e.ligne?.texte} » (jamais « à jour » sans copie faite)`, e)
  ok(g.requetes.every(r => r.chemin === '/drive/v3/about'), '   … rien n\'est envoyé tant qu\'on n\'a pas écrit', g.requetes)

  // ---- A3. Un trait : la copie 2 min après, au calme ----
  let n0 = g.requetes.length
  await ecrire(p, 300, 250)
  const tTrait = await p.evaluate(() => Date.now())
  await p.clock.fastForward(3000); await p.waitForTimeout(200)
  e = await etat(p)
  ok(e.drive.etat === 'ok' && e.drive.enAttente && e.ligne.texte === 'Sur le Drive personnel (prof@example.com) : la première copie part bientôt',
    `A3) un trait : « ${e.ligne?.texte} »`, e)
  await p.clock.fastForward(MIN + 50_000); await p.waitForTimeout(400)
  ok(g.depuis(n0).filter(r => r.chemin.startsWith('/upload/')).length === 0, '   … 1 min 53 s après : rien n\'est encore envoyé', g.depuis(n0))
  await p.clock.fastForward(8000)
  await p.waitForFunction(() => window.__drive.etat.etat === 'ok' && window.__drive.etat.t !== undefined, null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(500)
  const sauvees = g.sauvegardes()
  const dossiers = g.dossiers()
  ok(sauvees.length === 1 && dossiers.length === 1, `   … 2 min après : une sauvegarde (${sauvees.length}), un dossier (${dossiers.length})`, { sauvees: sauvees.map(s => s.name), dossiers: dossiers.map(d => d.name) })
  const s = sauvees[0], d = dossiers[0]
  const appareil = await p.evaluate(() => window.__registre.reglage('appareil'))
  ok(d?.name === 'MEM - Sauvegardes' && JSON.stringify(d.appProperties) === '{"memSauvegardes":"dossier-v1","memCompte":"mem"}' && !d.parents,
    '   … le dossier « MEM - Sauvegardes », ses marques à lui (memSauvegardes, memCompte), pas celles des replays', d)
  ok(s?.name === 'Premier classeur.memc' && s.mimeType === 'application/octet-stream' && s.parents?.[0] === d?.id
    && s.description === 'Sauvegarde automatique de MEM teachingtool. Pour l\'ouvrir : Bibliothèque → ⋯ → Récupérer une sauvegarde du Drive.',
    '   … le fichier « Premier classeur.memc », application/octet-stream, sa description', s && { ...s, octets: undefined })
  ok(s?.appProperties?.memSauvegarde === 'v1' && s.appProperties.memClasseur === id && s.appProperties.memOrigine === appareil && /^[0-9a-f]{16}$/.test(appareil)
    && Math.abs(Number(s.appProperties.memT) - tTrait) < 3000,
    `   … ses marques : memSauvegarde v1, memClasseur (l'id), memOrigine (l'appareil ${appareil}), memT (le trait)`, s?.appProperties)
  const lu = s ? lireMemc(s.octets) : null
  ok(lu?.entete.format === 'mem-tableau' && lu.entete.v === 1 && lu.entete.id === id && lu.entete.nom === 'Premier classeur' && lu.entier,
    '   … son contenu : un .memc entier, l\'en-tête du classeur', lu?.entete)
  let f = await ficheDe(p)
  ok(f.drive?.compte === 'mem' && f.drive.id === s?.id && f.drive.taille === s?.octets.length && f.drive.courriel === 'prof@example.com' && f.drive.vecteur?.length > 0 && f.drive.t >= tTrait,
    '   … la fiche garde { compte, id, t, taille, courriel, vecteur }', f.drive)
  e = await etat(p)
  ok(e.drive.etat === 'ok' && e.ligne.texte === 'Sur le Drive personnel (prof@example.com) : à l\'instant' && e.court === 'Drive : à l\'instant' && !e.point,
    `   … l'état : « ${e.court} », « ${e.ligne?.texte} »`, e)
  const multipart = g.requetes.filter(r => r.chemin === '/upload/drive/v3/files')
  ok(multipart.length === 1 && /uploadType=multipart/.test(multipart[0].recherche) && /ignoreDefaultVisibility=true/.test(multipart[0].recherche), '   … un seul envoi (multipart), créé privé', multipart)

  // ---- A4. La suivante : le même fichier, pas avant 10 min ----
  n0 = g.requetes.length
  await ecrire(p, 300, 320)
  await p.clock.fastForward(3 * MIN); await p.waitForTimeout(400)
  ok(g.depuis(n0).filter(r => r.chemin.startsWith('/upload/')).length === 0, 'A4) un autre trait, 3 min après : pas de copie (au plus une toutes les 10 min)')
  e = await etat(p)
  ok(e.drive.etat === 'ok' && e.drive.enAttente && /^Sur le Drive personnel \(prof@example.com\) : il y a 3 min$/.test(e.ligne.texte), `   … l'état garde l'heure de la dernière : « ${e.ligne?.texte} »`, e.ligne)
  await p.clock.fastForward(7 * MIN + 5000)
  await p.waitForFunction(n => window.__drive.etat.t > n, f.drive.t, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(400)
  const maj = g.depuis(n0).filter(r => r.chemin.startsWith('/upload/'))
  ok(maj.length === 1 && maj[0].m === 'PATCH' && maj[0].chemin === `/upload/drive/v3/files/${s.id}` && g.sauvegardes().length === 1 && g.drive('prof@example.com').get(s.id).versions.length === 2,
    '   … 10 min après la première : la copie remplace LE MÊME fichier (PATCH), le Drive en garde 2 versions', maj)
  ok(!g.requetes.some(r => r.m === 'DELETE' && !/revisions/.test(r.chemin)), '   … jamais de suppression du fichier')

  // ---- A5. L'élagage : les 10 dernières versions ----
  const fichierDrive = g.drive('prof@example.com').get(s.id)
  for (let i = 0; i < 12; i++) fichierDrive.versions.unshift({ id: 'ancienne' + i, modifiedTime: new Date(Date.now() - (i + 1) * 3600e3).toISOString() })
  const derniere = fichierDrive.versions.at(-1).id
  const nA5 = g.requetes.length
  await ecrire(p, 300, 380)
  await p.clock.fastForward(11 * MIN)
  await p.waitForFunction(() => window.__drive.etat.t !== undefined && Date.now() - window.__drive.etat.t < 120_000, null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(800)
  if (process.env.DEBUG) console.log(JSON.stringify(g.depuis(nA5).map(r => r.m + ' ' + r.chemin)), JSON.stringify(fichierDrive.versions))
  ok(fichierDrive.versions.length === 10 && fichierDrive.versions.at(-2).id === derniere && !fichierDrive.versions.some(v => v.id === 'ancienne7') && fichierDrive.versions[0].id === 'ancienne6',
    `A5) l'élagage : le Drive n'en garde que les 10 dernières (${fichierDrive.versions.length}), la dernière toujours`, fichierDrive.versions.map(v => v.id))

  // ---- A6. « Copie sur le Drive… » : la fenêtre du choix ----
  m = await menu(p)
  await p.click('.menu-item[data-action="copie-drive"]'); await p.waitForTimeout(200)
  const fen = await p.evaluate(() => {
    const d = document.querySelector('dialog.dialogue-drive[open]'), n = t => (t || '').replace(/[  ]/g, ' ')
    return d && {
      titre: d.querySelector('h2').textContent,
      choix: [...d.querySelectorAll('input[name=d-compte]')].map(i => `${i.value}:${n(i.nextElementSibling.textContent)}${i.checked ? '*' : ''}`),
      tous: n(d.querySelector('.d-tous').textContent), qui: n(d.querySelector('.d-qui').textContent), taille: n(d.querySelector('.d-taille').textContent),
      explication: n(d.querySelector('.d-explication').textContent), focus: document.activeElement?.value,
    }
  })
  ok(fen?.titre === 'Copie sur le Drive' && JSON.stringify(fen.choix) === '["mem:Drive personnel*","lfb:Drive du lycée","aucune:Pas de copie pour ce classeur"]'
    && fen.tous === 'Utiliser ce choix pour tous les classeurs qui n\'en ont pas' && fen.qui === 'Connecté : prof@example.com.' && fen.focus === 'mem',
    'A6) « Copie sur le Drive… » : Drive personnel (coché), Drive du lycée, Pas de copie ; la case pour tous ; le compte connecté', fen)
  ok(/^La copie fait \d+ Ko \(aujourd'hui à \d+ h \d\d\) ; le Drive en garde les 10 dernières versions\.$/.test(fen?.taille ?? '') && /« MEM - Sauvegardes »/.test(fen?.explication ?? ''),
    `   … la taille de la copie et les 10 versions : « ${fen?.taille} »`, fen)
  // Pas de copie pour ce classeur, pour tous
  await p.check('dialog.dialogue-drive input[value=aucune]')
  await p.check('dialog.dialogue-drive .d-tous input')
  await p.click('dialog.dialogue-drive .d-valider'); await p.waitForTimeout(400)
  f = await ficheDe(p)
  e = await etat(p)
  ok(f.copieDrive === 'aucune' && await p.evaluate(() => window.__registre.reglage('copieDrive')) === 'aucune' && e.drive.etat === 'absente' && e.ligne.texte === 'Pas de copie sur le Drive',
    'A6) « Pas de copie pour ce classeur » et pour tous : la fiche, le réglage, « Pas de copie sur le Drive »', { copieDrive: f.copieDrive, e })
  n0 = g.requetes.length
  await ecrire(p, 400, 380); await p.clock.fastForward(15 * MIN); await p.waitForTimeout(400)
  ok(!g.depuis(n0).some(r => r.chemin.startsWith('/upload/')), '   … plus rien ne part', g.depuis(n0))
  ok(g.sauvegardes().length === 1, '   … la copie qui y est reste')
  // Le Drive du lycée
  m = await menu(p)
  await p.click('.menu-item[data-action="copie-drive"]'); await p.waitForTimeout(200)
  await p.check('dialog.dialogue-drive input[value=lfb]')
  await p.click('dialog.dialogue-drive .d-valider'); await p.waitForTimeout(400)
  e = await etat(p)
  ok(e.drive.etat === 'connexion' && e.drive.enAttente && e.drive.compte === 'lfb', 'A6) le Drive du lycée : le jeton est celui du Drive personnel, la copie attend sa connexion', e.drive)
  const t6 = await toasts(p)
  ok(t6.some(t => t === 'La copie de « Premier classeur » va sur le Drive du lycée : elle attend la connexion Google.'), '   … le message', t6)
  await ctx.close()
}

// =====================================================================
// B. LE JETON QUI EXPIRE
// =====================================================================
if (seul('B')) {
  console.log('=== B. le jeton qui expire (expires_in 61 s) ===')
  const g = new FauxGoogle()
  g.expire = 61
  const ctx = await contexte(g)
  const p = await ouvrir(ctx, '', 'B')
  await gisPret(p)
  await seConnecter(p)
  ok(g.gis.length === 1 && g.gis[0].actif, 'B1) connecté (dans un clic), pour 61 s')
  await p.clock.fastForward(2000)
  await ecrire(p, 300, 250)
  await p.clock.fastForward(40_000); await p.waitForTimeout(300)
  let e = await etat(p)
  ok(e.drive.etat === 'connexion' && e.drive.enAttente && e.ligne.texte === 'Sur le Drive : en attente de la connexion Google' && e.ligne.niveau === 'attention' && e.point && e.court === 'Drive en attente' && !e.bandeau,
    `B2) le jeton expiré, un trait : « ${e.court} », le point, la ligne en attention ; pas encore de bandeau (40 s sans geste)`, e)
  const n0 = g.requetes.length
  await p.clock.fastForward(2 * MIN); await p.waitForTimeout(400)
  e = await etat(p)
  ok(!g.depuis(n0).length, '   … rien ne part sans connexion (aucune requête)', g.depuis(n0))
  ok(e.bandeau?.raison === 'drive-connexion' && e.bandeau.texte === 'La copie sur le Drive attend la connexion Google.' && JSON.stringify(e.bandeau.boutons) === '["Se connecter à Google"]',
    'B3) sans clé, après 2 min sans geste : le bandeau « La copie sur le Drive attend la connexion Google. » [Se connecter à Google]', e.bandeau)
  ok(g.gis.length === 1, '   … et jamais de fenêtre Google sans un clic (requestAccessToken : une fois, au clic)', g.gis)
  // On se remet à écrire : il reste (il ne clignote pas)
  await ecrire(p, 300, 320); await p.clock.fastForward(1500); await p.waitForTimeout(200)
  e = await etat(p)
  ok(e.bandeau?.raison === 'drive-connexion', '   … on se remet à écrire : il reste', e.bandeau)
  // Le clic : la reprise (Google propose le compte retenu par Publier)
  await p.evaluate(() => localStorage.setItem('tableau-mem:compte-google:mem', 'prof@example.com'))
  g.expire = 3600
  const n1 = g.requetes.length
  await p.click('.bandeau-sauvegarde .bouton-bandeau[data-etat-action="connecter-drive"]')
  await p.waitForTimeout(400)
  ok(g.gis.length === 2 && g.gis[1].actif && g.gis[1].hint === 'prof@example.com' && g.gis[1].prompt === '',
    'B4) le clic : requestAccessToken dans le geste, avec le compte retenu (login_hint) et sans redemander la liste (prompt « »)', g.gis[1])
  await p.clock.fastForward(2500)
  await p.waitForFunction(() => window.__drive.etat.etat === 'ok' && window.__drive.etat.t !== undefined, null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  e = await etat(p)
  ok(g.depuis(n1).some(r => r.chemin === '/upload/drive/v3/files') && e.drive.etat === 'ok' && !e.bandeau && !e.point && e.court === 'Drive : à l\'instant',
    `   … la copie part aussitôt (au calme), le bandeau s'en va : « ${e.court} »`, e)
  const t4 = await toasts(p)
  ok(t4.some(t => t === 'Connecté à Google (prof@example.com) : la copie sur le Drive part.'), '   … le message', t4)
  await ctx.close()

  // ---- B5. La clé à jour : le jeton expiré n'est qu'une information ----
  const g2 = new FauxGoogle()
  g2.expire = 61
  const ctx2 = await contexte(g2)
  const q = await ouvrir(ctx2, '', 'B5')
  await gisPret(q)
  await q.click('.barre-haut .bouton.points'); await q.waitForTimeout(150)
  await q.click('.menu-flottant:not([hidden]) .menu-item[data-action="activer-cle"]')
  await q.waitForFunction(() => window.__cle?.etat.etat === 'ok', null, { timeout: 10000 }).catch(() => {})
  await seConnecter(q)
  await q.clock.fastForward(2000)
  await ecrire(q, 300, 250)
  await q.clock.fastForward(5 * MIN); await q.waitForTimeout(500)
  e = await etat(q)
  ok(e.drive.etat === 'connexion' && e.drive.enAttente && e.ligne.niveau === 'info' && !e.point && !e.bandeau && /^Clé : /.test(e.court) && e.niveau !== 'attention',
    `B5) la clé à jour, le jeton expiré en plein cours : ni bandeau, ni point, une ligne d'information ; « ${e.court} »`, e)
  ok(g2.gis.length === 1, '   … aucune fenêtre Google', g2.gis)
  await ctx2.close()
}

// =====================================================================
// C. HORS CONNEXION, UN RÉSEAU QUI FILTRE GOOGLE, LE DRIVE PLEIN
// =====================================================================
if (seul('C')) {
  console.log('=== C. hors connexion, réseau filtré, Drive plein, 401 ===')
  const g = new FauxGoogle()
  const ctx = await contexte(g)
  const p = await ouvrir(ctx, '', 'C')
  await gisPret(p)
  await seConnecter(p)
  // ---- C1. Hors connexion ----
  await ctx.setOffline(true)
  await ecrire(p, 300, 250)
  await p.clock.fastForward(2 * MIN + 3000); await p.waitForTimeout(400)
  let e = await etat(p)
  ok(e.drive.etat === 'hors-ligne' && e.ligne.texte === 'Sur le Drive : hors connexion, la copie partira au retour du réseau' && g.sauvegardes().length === 0,
    `C1) hors connexion : « ${e.ligne?.texte} », rien n'est parti`, e)
  await ctx.setOffline(false)
  await p.waitForTimeout(300); await p.clock.fastForward(2000)
  await p.waitForFunction(() => window.__drive.etat.t !== undefined, null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  e = await etat(p)
  ok(g.sauvegardes().length === 1 && e.drive.etat === 'ok', '   … le réseau revenu : la copie part', e.drive)
  // ---- C2. Un réseau qui filtre Google ----
  g.panne = 'reseau'
  await ecrire(p, 300, 320)
  await p.clock.fastForward(11 * MIN); await p.waitForTimeout(800)
  e = await etat(p)
  const avant = await formesIci(p)
  ok(e.drive.etat === 'erreur' && e.ligne.texte === 'Sur le Drive : Google Drive ne répond pas (le réseau filtre peut-être Google)' && e.ligne.niveau === 'attention' && !e.bandeau && e.court === 'Drive en attente'
    && (await etat(p)).niveau === 'attention' && !/il y a|à l'instant/.test(e.ligne.texte),
    `C2) un réseau qui filtre Google : « ${e.ligne?.texte} » (jamais d'heure après un échec), pas de bandeau (rien à cliquer)`, e)
  const nav = await p.evaluate(() => window.__surveillance.texte.lignes[0].texte)
  ok(nav === 'Enregistré dans ce navigateur' && avant.length === 2, '   … rien n\'est perdu : « Enregistré dans ce navigateur »', { nav, avant })
  g.panne = null
  await p.clock.fastForward(MIN + 5000)
  await p.waitForFunction(() => window.__drive.etat.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  e = await etat(p)
  const t2 = await toasts(p)
  ok(e.drive.etat === 'ok' && t2.includes('Copie sur le Drive reprise.') && formesDe(g.sauvegardes()[0].octets).length === 2,
    '   … Google de nouveau joignable : la copie se réessaie seule (1 min après), « Copie sur le Drive reprise. »', { e: e.drive, t2 })
  // ---- C3. Le Drive plein ----
  g.panne = 'plein'
  await ecrire(p, 300, 380)
  await p.clock.fastForward(11 * MIN); await p.waitForTimeout(800)
  e = await etat(p)
  ok(e.drive.etat === 'erreur' && e.ligne.texte === 'Sur le Drive : le Drive est plein : libérez de la place dans Google Drive' && formesDe(g.sauvegardes()[0].octets).length === 2,
    `C3) le Drive plein : « ${e.ligne?.texte} » ; la copie d'avant reste`, e)
  g.panne = null
  await p.clock.fastForward(3 * MIN)
  await p.waitForFunction(() => window.__drive.etat.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  ok(formesDe(g.sauvegardes()[0].octets).length === 3, '   … la place revenue : la copie reprend')
  // ---- C4. 401 : déconnecté, la copie attend un clic ----
  g.panne = '401'
  await ecrire(p, 400, 380)
  await p.clock.fastForward(11 * MIN); await p.waitForTimeout(800)
  e = await etat(p)
  ok(e.drive.etat === 'connexion' && g.gis.length === 1, `C4) 401 (la connexion refusée) : « ${e.ligne?.texte} », sans fenêtre Google`, { e: e.drive, gis: g.gis.length })
  g.panne = null
  await ctx.close()
}

// =====================================================================
// D. LES DEUX CONFLITS
// =====================================================================
if (seul('D')) {
  console.log('=== D. les conflits : un autre ordinateur, l\'histoire perdue ===')
  const g = new FauxGoogle()
  const ctx = await contexte(g)
  let p = await ouvrir(ctx, '', 'D')
  const id = await p.evaluate(() => window.__app.classeur.id)
  await gisPret(p)
  await seConnecter(p)
  const s = await premiereCopie(p, g)
  // ---- D1. Mise à jour depuis un autre ordinateur, plus récente : pas remplacée ----
  const tMaison = await p.evaluate(() => Date.now() + 60_000)
  const memcMaison = plusRecent(s.octets, ['TMAISON1', 'TMAISON2'], tMaison)
  Object.assign(s, { octets: memcMaison, appProperties: { ...s.appProperties, memOrigine: 'ordinateur-maison', memT: String(tMaison) } })
  const avant = Buffer.from(s.octets)
  await ecrire(p, 300, 320)
  await p.clock.fastForward(11 * MIN); await p.waitForTimeout(800)
  let e = await etat(p)
  ok(e.drive.etat === 'conflit' && /^La copie du Drive a été mise à jour depuis un autre ordinateur \(le \w+ \d+ \w+ 2026 à \d+ h \d\d\) : elle n'est pas remplacée\.$/.test(e.drive.message ?? '')
    && Buffer.compare(Buffer.from(s.octets), avant) === 0,
    `D1) un autre ordinateur, plus récent : « ${e.drive.message} » ; elle n'est pas remplacée`, e.drive)
  ok(e.bandeau?.raison === 'drive-conflit' && JSON.stringify(e.bandeau.boutons) === '["Récupérer la copie du Drive","Remplacer quand même"]' && e.point,
    '   … le bandeau : [Récupérer la copie du Drive] [Remplacer quand même], le point', e.bandeau)
  ok(e.ligne.action === 'recuperer-drive' && JSON.stringify(e.ligne.plus) === '["forcer-drive"]', '   … la ligne du Drive porte les deux boutons', e.ligne)
  // ---- D2. Récupérer : téléchargée, puis le chemin d'Ouvrir. Chacun a changé de son côté : une copie, ou remplacer ----
  const nMedia = g.requetes.filter(r => /alt=media/.test(r.recherche)).length
  await p.click('.bandeau-sauvegarde .bouton-bandeau[data-etat-action="recuperer-drive"]')
  let dlg = await dialogue(p)
  ok(g.requetes.filter(r => /alt=media/.test(r.recherche)).length === nMedia + 1 && dlg?.titre === 'Ouvrir ce classeur ?'
    && dlg.textes.includes('Le fichier et celui de la bibliothèque ont changé chacun de leur côté.') && dlg.boutons.some(b => b.t === 'Ajouter comme copie'),
    `D2) « Récupérer la copie du Drive » : téléchargée (alt=media), puis la fenêtre d'Ouvrir ; chacun a changé de son côté : ${dlg?.boutons.map(b => b.t).join(' | ')}`, dlg)
  await p.click('dialog[open] [data-a="annuler"]'); await p.waitForTimeout(200)
  // La maison a tout ce qu'il y a ici, et plus : « Mettre à jour le classeur », sans rien perdre
  const ici0 = await p.evaluate(async () => {
    const { fabriquerFichier } = await import('/src/classeurs/ecrivain.ts')
    await window.__app.tableau.attendreEcritures()
    const { fichier } = await fabriquerFichier(window.__app.tableau.base, { nom: window.__app.classeur.nom, id: window.__app.classeur.id }, Date.now())
    const o = new Uint8Array(await fichier.arrayBuffer()); let t = ''; for (let i = 0; i < o.length; i += 0x8000) t += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); return btoa(t)
  })
  s.octets = plusRecent(Buffer.from(ici0, 'base64'), ['TMAISON1', 'TMAISON2'], tMaison)
  await p.click('.bandeau-sauvegarde .bouton-bandeau[data-etat-action="recuperer-drive"]')
  dlg = await dialogue(p)
  ok(dlg?.boutons.some(b => b.t === 'Mettre à jour le classeur'), `   … la copie de la maison a tout, et plus : ${dlg?.boutons.map(b => b.t).join(' | ')}`, dlg)
  const ici = await formesIci(p)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => {}), p.click('dialog[open] [data-a="mettre-a-jour"]')])
  await pret(p); await p.waitForTimeout(300)
  const apres = await formesIci(p)
  ok(apres.includes('TMAISON1') && apres.includes('TMAISON2') && ici.every(x => apres.includes(x)), '   … mis à jour : les traits de la maison et ceux d\'ici, rien de perdu', { ici, apres })
  const f = await ficheDe(p)
  ok(f.recu === tMaison, '   … il est arrivé du fichier de la maison (recu = sa date)', f.recu)
  // La copie suivante passe : rien n'est plus récent que ce qu'on a reçu
  await gisPret(p)
  await seConnecter(p)
  await ecrire(p, 500, 300)
  await p.clock.fastForward(11 * MIN)
  await p.waitForFunction(() => window.__drive.etat.etat === 'ok' && window.__drive.etat.t !== undefined && Date.now() - window.__drive.etat.t < 60_000, null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(400)
  e = await etat(p)
  const appareil = await p.evaluate(() => window.__registre.reglage('appareil'))
  ok(e.drive.etat === 'ok' && s.appProperties.memOrigine === appareil && formesDe(s.octets).includes('TMAISON1') && g.sauvegardes().length === 1,
    '   … la copie suivante remplace le même fichier, avec tout (memOrigine : cet appareil)', { e: e.drive, origine: s.appProperties.memOrigine })
  // ---- D3. Un autre conflit, « Remplacer quand même » ----
  const t3 = await p.evaluate(() => Date.now() + 120_000)
  Object.assign(s, { octets: plusRecent(s.octets, ['TMAISON3'], t3), appProperties: { ...s.appProperties, memOrigine: 'ordinateur-maison', memT: String(t3) } })
  await ecrire(p, 500, 380)
  await p.clock.fastForward(11 * MIN); await p.waitForTimeout(800)
  e = await etat(p)
  ok(e.drive.etat === 'conflit', 'D3) de nouveau changée ailleurs : le conflit', e.drive)
  await p.click('.bandeau-sauvegarde .bouton-bandeau[data-etat-action="forcer-drive"]')
  const q3 = await dialogue(p)
  ok(q3?.titre === 'Remplacer la copie du Drive ?' && /les 10 dernières/.test(q3.textes.join(' ')), `   … la question : ${q3?.titre}`, q3)
  await p.click('dialog[open] [data-a="oui"]')
  await p.waitForFunction(() => window.__drive.etat.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(400)
  ok(!formesDe(s.octets).includes('TMAISON3') && s.appProperties.memOrigine === appareil && (await etat(p)).drive.etat === 'ok',
    '   … « Remplacer » : la copie du Drive est remplacée par ce classeur', s.appProperties)
  // ---- D4. L'histoire perdue : la fiche a une copie qui contient plus ----
  const plus = plusRecent(s.octets, ['TPERDU'])
  const b = Buffer.from(plus), fin = b.indexOf(10), dd = new Y.Doc({ gc: false })
  Y.applyUpdate(dd, new Uint8Array(gunzipSync(b.subarray(fin + 1))))
  await p.evaluate(async ({ id, v }) => { await window.__registre.modifierClasseur(id, x => { x.drive = { ...x.drive, vecteur: new Uint8Array(v) } }) }, { id, v: [...Y.encodeStateVector(dd)] })
  await p.reload(); await pret(p)
  await gisPret(p); await seConnecter(p)
  const avantD4 = Buffer.from(s.octets)
  await ecrire(p, 200, 450)
  await p.clock.fastForward(11 * MIN); await p.waitForTimeout(800)
  e = await etat(p)
  ok(e.drive.etat === 'conflit' && e.drive.message === 'Ce classeur a perdu une partie de son histoire depuis la dernière copie sur le Drive : elle n\'est pas remplacée.'
    && Buffer.compare(Buffer.from(s.octets), avantD4) === 0 && e.bandeau?.raison === 'drive-conflit',
    `D4) l'histoire perdue : « ${e.drive.message} », la copie n'est pas remplacée`, e)
  // ---- D5. La question de « Remplacer » (le lot 1) parle du Drive ----
  await p.evaluate(async b64 => {
    const h = await (await navigator.storage.getDirectory()).getFileHandle('autre.memc', { create: true })
    const w = await h.createWritable(); await w.write(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))])); await w.close()
  }, neufMemc('Autre', 'cccccccccccccccc').toString('base64'))
  await p.evaluate(() => { window.__aOuvrir = 'autre.memc' })
  await p.keyboard.press('Control+o')
  const d5a = await dialogue(p)
  await p.click('dialog[open] [data-a="remplacer-ouvert"]')
  await p.waitForTimeout(500)
  const d5 = (await p.evaluate(DIALOGUES))[0]
  ok(d5?.titre === 'Ouvrir ce classeur ?' && /Sa copie sur le Drive reste celle du classeur d'avant\.$/.test(d5.textes[0] ?? ''),
    '   … D5) la question de « Remplacer » : « Sa copie sur le Drive reste celle du classeur d\'avant. »', { d5a, d5 })
  await p.keyboard.press('Escape')
  await ctx.close()
}

// =====================================================================
// E. RÉCUPÉRER UNE SAUVEGARDE DU DRIVE
// =====================================================================
if (seul('E')) {
  console.log('=== E. « Récupérer une sauvegarde du Drive » (la bibliothèque) ===')
  const g = new FauxGoogle()
  const ctx = await contexte(g)
  const p = await ouvrir(ctx, '', 'E')
  const id = await p.evaluate(() => window.__app.classeur.id)
  await gisPret(p)
  await seConnecter(p)
  const s = await premiereCopie(p, g)
  // Une sauvegarde d'un classeur d'ailleurs (pas dans cette bibliothèque)
  const memcAutre = neufMemc('Fractions', 'dddddddddddddddd')
  g.drive('prof@example.com').set('autresauvexxxxxxxx', { id: 'autresauvexxxxxxxx', name: 'Fractions.memc', mimeType: 'application/octet-stream', parents: s.parents, appProperties: { memSauvegarde: 'v1', memClasseur: 'dddddddddddddddd', memOrigine: 'ailleurs', memT: '1' }, octets: memcAutre, modifie: Date.now() - 3600e3, versions: [] })
  // Rien ne revient du Drive sans le demander
  ok(!g.requetes.some(r => /alt=media/.test(r.recherche)), 'E1) jusqu\'ici, rien n\'est venu du Drive (aucun alt=media)')
  await p.click('.bouton-classeur'); await p.waitForTimeout(500)
  await p.click('.bibliotheque .biblio-bouton[aria-label="Plus"], .bibliotheque .biblio-plus').catch(async () => { await p.click('.bibliotheque [aria-haspopup="menu"]') })
  await p.waitForTimeout(200)
  const entree = await p.evaluate(() => { const e = document.querySelector('.menu-flottant:not([hidden]) .menu-item[data-action="recuperer-sauvegarde"]'); return e && { texte: e.querySelector('.libelle').firstChild.textContent, aide: e.querySelector('small')?.textContent, inactif: e.getAttribute('aria-disabled') } })
  ok(entree?.texte === 'Récupérer une sauvegarde du Drive…' && entree.inactif === null, 'E2) le menu ⋯ du bandeau : « Récupérer une sauvegarde du Drive… »', entree)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="recuperer-sauvegarde"]')
  await p.waitForSelector('dialog.dialogue-recuperer[open] .sauvegarde-drive', { timeout: 10000 }).catch(() => {})
  const liste = await p.evaluate(() => [...document.querySelectorAll('dialog.dialogue-recuperer .sauvegarde-drive')].map(b => [...b.children].map(c => c.textContent.replace(/[  ]/g, ' '))))
  ok(liste.length === 2 && liste[0][0] === 'Premier classeur' && /^modifiée aujourd'hui à \d+ h \d\d · \d+ Ko$/.test(liste[0][1]) && liste[0][2] === 'déjà dans la bibliothèque'
    && liste[1][0] === 'Fractions' && liste[1].length === 2,
    'E3) la liste : la plus récente d\'abord, « modifiée aujourd\'hui à … · taille », « déjà dans la bibliothèque »', liste)
  // Une sauvegarde d'ailleurs : un NOUVEAU classeur
  await p.click('dialog.dialogue-recuperer .sauvegarde-drive[data-id="autresauvexxxxxxxx"]')
  const d3 = await p.waitForSelector('dialog.dialogue-ouvrir[open]', { timeout: 15000 }).then(() => dialogue(p), () => null)
  ok(d3?.titre === 'Ouvrir ce classeur ?' && d3.boutons.some(b => b.t === 'Ajouter à la bibliothèque') && g.requetes.some(r => /alt=media/.test(r.recherche) && r.chemin.endsWith('autresauvexxxxxxxx')),
    `E4) choisie : téléchargée, puis la fenêtre d'Ouvrir (un nouveau) : ${d3?.boutons.map(b => b.t).join(' | ')}`, d3)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => {}), p.click('dialog[open] [data-a="ajouter"]')])
  await pret(p); await p.waitForTimeout(300)
  const ouvert = await p.evaluate(() => window.__app.classeur)
  ok(ouvert.id === 'dddddddddddddddd' && ouvert.nom === 'Fractions' && (await formesIci(p)).includes('TNEUF'), '   … ajouté à la bibliothèque et ouvert : « Fractions », son id', ouvert)
  // Arrivé sur « Fractions » (la page s'est rechargée) : la connexion a
  // suivi l'onglet d'un classeur à l'autre (corrections de conformité) ; la
  // liste se montre aussitôt, sans fenêtre Google
  const gisArrivee = g.gis.length
  await p.click('.bouton-classeur'); await p.waitForTimeout(400)
  await p.click('.bibliotheque .biblio-bouton[aria-label="Plus"], .bibliotheque .biblio-plus').catch(async () => { await p.click('.bibliotheque [aria-haspopup="menu"]') })
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="recuperer-sauvegarde"]')
  await p.waitForSelector('dialog.dialogue-recuperer[open] .sauvegarde-drive', { timeout: 10000 }).catch(() => {})
  const suivie = { voir: await p.textContent('dialog.dialogue-recuperer .r-voir').catch(() => null), n: await p.locator('dialog.dialogue-recuperer .sauvegarde-drive').count(), gis: g.gis.length - gisArrivee }
  ok(suivie.voir === 'Voir les sauvegardes' && suivie.n === 2 && suivie.gis === 0, '   … arrivé sur « Fractions » : toujours connecté (la connexion suit l\'onglet), la liste sans fenêtre Google', suivie)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  // Le même classeur (déjà là) : comparé. La page rechargée (F5) : plus
  // connecté (le jeton est à l'onglet, il ne suit que les changements de
  // classeur) ; la connexion se fait dans le clic
  await p.reload(); await pret(p)
  await gisPret(p)
  await p.click('.bouton-classeur'); await p.waitForTimeout(400)
  await p.click('.bibliotheque .biblio-bouton[aria-label="Plus"], .bibliotheque .biblio-plus').catch(async () => { await p.click('.bibliotheque [aria-haspopup="menu"]') })
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="recuperer-sauvegarde"]')
  await p.waitForSelector('dialog.dialogue-recuperer[open]', { timeout: 10000 })
  const avantClic = { voir: await p.textContent('dialog.dialogue-recuperer .r-voir'), liste: await p.isVisible('dialog.dialogue-recuperer .r-liste'), gis: g.gis.length }
  await p.click('dialog.dialogue-recuperer .r-voir')
  await p.waitForSelector('dialog.dialogue-recuperer[open] .sauvegarde-drive', { timeout: 10000 }).catch(() => {})
  ok(avantClic.voir === 'Se connecter et voir les sauvegardes' && !avantClic.liste && g.gis.length === avantClic.gis + 1 && g.gis.at(-1).actif,
    'E5) pas connecté : [Se connecter et voir les sauvegardes] se connecte dans ce clic, puis montre la liste', { avantClic, gis: g.gis })
  await p.click(`dialog.dialogue-recuperer .sauvegarde-drive[data-id="${s.id}"]`)
  const d5 = await p.waitForSelector('dialog.dialogue-ouvrir[open]', { timeout: 15000 }).then(() => dialogue(p), () => null)
  ok(d5?.boutons.some(b => b.t === 'Ouvrir celui de la bibliothèque'), `   … une sauvegarde déjà dans la bibliothèque : comparée (${d5?.boutons.map(b => b.t).join(' | ')})`, d5)
  await p.keyboard.press('Escape')
  void id
  await ctx.close()
}

// =====================================================================
// F. LE POSTE REMIS À ZÉRO ; DEUX ONGLETS ; LES CLASSEURS EN RETARD
// =====================================================================
if (seul('F')) {
  console.log('=== F. le poste remis à zéro, deux onglets, les classeurs en retard ===')
  const g = new FauxGoogle()
  // La veille, sur l'ancien profil : une copie du classeur
  const ctx0 = await contexte(g)
  const p0 = await ouvrir(ctx0, '', 'F0')
  const id = await p0.evaluate(() => window.__app.classeur.id)
  await gisPret(p0); await seConnecter(p0)
  const s = await premiereCopie(p0, g)
  // Le fichier de la clé, écrit à la fin du cours (après la copie)
  const memcCle = await p0.evaluate(async () => {
    const { fabriquerFichier } = await import('/src/classeurs/ecrivain.ts')
    const { fichier } = await fabriquerFichier(window.__app.tableau.base, { nom: window.__app.classeur.nom, id: window.__app.classeur.id }, Date.now() + 60_000)
    const o = new Uint8Array(await fichier.arrayBuffer()); let t = ''; for (let i = 0; i < o.length; i += 0x8000) t += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); return btoa(t)
  })
  await ctx0.close()
  // Le matin : un profil neuf (remis à zéro), le fichier de la clé ouvert
  const ctx = await contexte(g)
  const p = await ouvrir(ctx, '', 'F')
  await p.evaluate(async b64 => {
    const h = await (await navigator.storage.getDirectory()).getFileHandle('cle.memc', { create: true })
    const w = await h.createWritable(); await w.write(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))])); await w.close()
    window.__aOuvrir = 'cle.memc'
  }, memcCle)
  await p.keyboard.press('Control+o')
  await dialogue(p)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => {}), p.click('dialog[open] [data-a="ajouter"]')])
  await pret(p); await p.waitForTimeout(300)
  ok(await p.evaluate(() => window.__app.classeur.id) === id, 'F1) le matin, profil neuf : le classeur de la clé ajouté, son id')
  const origineHier = s.appProperties.memOrigine
  await gisPret(p); await seConnecter(p)
  await ecrire(p, 300, 300)
  await p.clock.fastForward(2 * MIN + 3000)
  await p.waitForFunction(() => window.__drive.etat.t !== undefined, null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(300)
  const e = await etat(p)
  const appareil = await p.evaluate(() => window.__registre.reglage('appareil'))
  ok(e.drive.etat === 'ok' && g.sauvegardes().length === 1 && g.sauvegardes()[0].id === s.id && s.appProperties.memOrigine === appareil && appareil !== origineHier,
    'F2) la copie de la veille (un autre appareil, mais pas plus récente que le fichier de la clé) est remplacée sans conflit, le même fichier', { e: e.drive, origine: s.appProperties.memOrigine, hier: origineHier })
  // ---- F3. Deux onglets sur le même classeur : une copie faite dans l'un compte dans l'autre ----
  const q = await ouvrir(ctx, `?classeur=${id}`, 'F3')
  await q.waitForTimeout(300)
  const eq = await etat(q)
  ok(eq.drive.etat === 'connexion' || eq.drive.etat === 'ok', `F3) le second onglet (pas connecté : le jeton est à l'onglet) : ${eq.ligne?.texte}`, eq.drive)
  await ecrire(p, 300, 400)
  await p.clock.fastForward(11 * MIN)
  await p.waitForFunction(t => window.__drive.etat.t > t, e.drive.t, { timeout: 15000 }).catch(() => {})
  await q.clock.fastForward(1000); await q.waitForTimeout(800)
  const eq2 = await etat(q)
  ok(eq2.drive.etat === 'ok' && eq2.drive.t !== undefined && /^Sur le Drive personnel \(prof@example\.com\) : /.test(eq2.ligne.texte), `   … la copie faite dans le premier se lit dans le second : « ${eq2.ligne?.texte} »`, eq2)
  await q.close()
  // ---- F4. Les classeurs en retard : copiés depuis leur base, un à la fois ----
  // Trois classeurs avec un trait (un état fait sous Node), et un vide
  const etatAvecUnTrait = () => { const b = neufMemc('x', 'eeeeeeeeeeeeeeee'), fin = b.indexOf(10); return gunzipSync(b.subarray(fin + 1)).toString('base64') }
  const ids = await p.evaluate(async etats => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
    const r = []
    for (const [i, nom] of ['Symétrie', 'Fractions', 'Pas sur ce Drive', 'Vide'].entries()) {
      const id = dem.idClasseur()
      const fiche = { id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: Date.now(), modifie: Date.now(), ouvert: 0, pages: 1, ...(nom === 'Pas sur ce Drive' ? { copieDrive: 'lfb' } : {}) }
      const etat = nom === 'Vide' ? await neuf.etatNeuf('carreaux') : Uint8Array.from(atob(etats[i]), c => c.charCodeAt(0))
      await window.__registre.creerClasseur(fiche, async base => bases.creerBase(base, etat, { id, nom }))
      r.push(id)
    }
    return r
  }, [etatAvecUnTrait(), etatAvecUnTrait(), etatAvecUnTrait()])
  await ecrire(p, 400, 450)
  await p.clock.fastForward(11 * MIN)
  for (let i = 0; i < 40 && g.sauvegardes().length < 3; i++) { await p.clock.fastForward(5000); await p.waitForTimeout(300) }
  for (let i = 0; i < 6; i++) { await p.clock.fastForward(5000); await p.waitForTimeout(200) }
  const noms = g.sauvegardes().map(x => x.name).sort()
  ok(JSON.stringify(noms) === '["Fractions.memc","Premier classeur.memc","Symétrie.memc"]', `F4) les classeurs en retard (jamais copiés) se copient depuis leur base : ${noms.join(', ')} ; pas celui qui va sur le Drive du lycée, ni un classeur vide (ni le « Premier classeur » vide de ce navigateur neuf)`, noms)
  const fs = await Promise.all(ids.map(x => ficheDe(p, x)))
  ok(fs[0].drive?.compte === 'mem' && fs[1].drive?.compte === 'mem' && !fs[2].drive && !fs[3].drive, '   … leurs fiches gardent leur copie', fs.map(f => f.drive && { compte: f.drive.compte, id: f.drive.id }))
  await ctx.close()
}

// =====================================================================
// G. PLUS DE 5 MO : L'ENVOI REPRENABLE
// =====================================================================
if (seul('G')) {
  console.log('=== G. plus de 5 Mo : l\'envoi reprenable ===')
  for (const expose of [true, false]) {
    const g = new FauxGoogle()
    g.exposeLocation = expose
    const ctx = await contexte(g)
    const p = await ouvrir(ctx, '', 'G', false)
    await p.waitForFunction(() => !!window.google?.accounts?.oauth2 || !!document.getElementById('google-identite'), null, { timeout: 8000 }).catch(() => {})
    await p.waitForFunction(() => !!window.google?.accounts?.oauth2, null, { timeout: 8000 }).catch(() => {})
    await seConnecter(p)
    // Le vrai module (le même que celui de la page) : un fichier de 6 Mo
    const r = await p.evaluate(async () => {
      // Le module même de la page (Vite peut l'avoir servi avec ?t=…) : le jeton est le sien
      const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/src\/publication\/drive\.ts/.test(n)) ?? '/src/publication/drive.ts'
      const d = await import(url)
      const o = new Uint8Array(6 * 1024 * 1024); for (let i = 0; i < o.length; i++) o[i] = (i * 31) & 255
      const x = await d.sauvegarder({ compte: 'mem', classeur: window.__app.classeur.id, nom: 'Gros classeur', fichier: new Blob([o]), idExistant: null, origine: 'essai', t: 1, recu: 0 })
      const y = await d.sauvegarder({ compte: 'mem', classeur: window.__app.classeur.id, nom: 'Gros classeur', fichier: new Blob([o, o.subarray(0, 10)]), idExistant: x.id, origine: 'essai', t: 2, recu: 0 })
      return { x, y }
    }).catch(e => ({ erreur: String(e) }))
    const s = g.sauvegardes()[0]
    const puts = g.requetes.filter(q => q.m === 'PUT')
    ok(r.x?.cree && r.y?.id === r.x?.id && s?.octets.length === 6 * 1024 * 1024 + 10 && puts.length === 2 && g.requetes.filter(q => /uploadType=resumable/.test(q.recherche) && !/upload_id/.test(q.recherche)).length === 2,
      `G) 6 Mo, ${expose ? 'avec' : 'sans'} l'en-tête Location lisible : la session ouverte, le fichier envoyé (PUT), puis le même fichier mis à jour`, { r, taille: s?.octets.length, puts: puts.length })
    await ctx.close()
  }
}

// =====================================================================
// H. FIREFOX, L'IPAD ; LA VERSION HORS LIGNE
// =====================================================================
if (seul('H')) {
  console.log('=== H. sans showSaveFilePicker ni Web Locks (Firefox, l\'iPad) ; la version hors ligne ===')
  const g = new FauxGoogle()
  const SANS = () => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; try { Object.defineProperty(Navigator.prototype, 'locks', { get: () => undefined, configurable: true }) } catch { /* rien */ } }
  const ctx = await contexte(g, { scripts: [SANS] })
  const p = await ouvrir(ctx, '', 'H')
  await gisPret(p); await seConnecter(p)
  const sans = await p.evaluate(() => ({ picker: typeof window.showSaveFilePicker, locks: !!navigator.locks, cle: window.__cle?.etat?.etat ?? null }))
  await premiereCopie(p, g)
  const e = await etat(p)
  ok(sans.picker === 'undefined' && !sans.locks && e.drive.etat === 'ok' && g.sauvegardes().length === 1,
    `H1) sans showSaveFilePicker ni Web Locks : la copie marche (sans verrou) ; la clé : ${sans.cle}`, { sans, e: e.drive })
  await ctx.close()

  // ---- H2. La version d'un seul fichier (file://) ----
  const g2 = new FauxGoogle()
  const ctx2 = await contexte(g2)
  const f = await ctx2.newPage(); suivre(f, 'H2')
  const versGoogle = []
  f.on('request', r => { if (/accounts\.google\.com|www\.googleapis\.com/.test(r.url())) versGoogle.push(r.url()) })
  await f.goto('file://' + R + '/dist/index.html')
  await f.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await f.waitForTimeout(4000)
  const ef = await f.evaluate(() => {
    const n = t => (t || '').replace(/[  ]/g, ' ')
    const b = document.getElementById('description-etat') ?? document.querySelector('[id^="etat"]')
    return { description: n([...document.querySelectorAll('div[hidden]')].map(x => x.textContent).find(t => /Sur le Drive|Pas de copie/.test(t))), court: n(document.querySelector('.etat-classeur')?.textContent), point: !document.querySelector('.bouton-classeur .point-etat').hidden, b: !!b }
  })
  ok(/Sur le Drive : seulement depuis la version en ligne \(la connexion Google ne marche pas dans la version hors ligne\)\./.test(ef.description ?? '') && !ef.point,
    'H2) la version hors ligne : « Sur le Drive : seulement depuis la version en ligne (la connexion Google ne marche pas dans la version hors ligne) », sans point', ef)
  await ecrire(f, 300, 300); await f.waitForTimeout(500)
  await f.click('.barre-haut .bouton.points'); await f.waitForTimeout(200)
  const mf = await f.evaluate(() => { const e = document.querySelector('.menu-flottant:not([hidden]) .menu-item[data-action="copie-drive"]'); return e && { inactif: e.getAttribute('aria-disabled'), aide: e.querySelector('small')?.textContent } })
  ok(mf?.inactif === 'true' && mf.aide === 'Seulement depuis la version en ligne (mathsetmoi.github.io).', '   … « Copie sur le Drive… » grisé : « Seulement depuis la version en ligne (mathsetmoi.github.io). »', mf)
  await f.keyboard.press('Escape')
  ok(versGoogle.length === 0 && g2.requetes.length === 0, '   … aucune requête vers Google (ni la connexion, ni le Drive)', versGoogle)
  await ctx2.close()
}

// =====================================================================
// I. LE MAUVAIS COMPTE : LE COURRIEL EST MONTRÉ
// =====================================================================
if (seul('I')) {
  console.log('=== I. le mauvais compte Google ===')
  const g = new FauxGoogle()
  g.choisi = 'prof@example.org'
  const ctx = await contexte(g)
  const p = await ouvrir(ctx, '', 'I')
  await gisPret(p); await seConnecter(p)
  await premiereCopie(p, g)
  const e = await etat(p)
  ok(/^Sur le Drive personnel \(prof@example\.org\) : /.test(e.ligne?.texte ?? ''), `I) connecté au « Drive personnel » avec le compte du lycée : le courriel le dit, « ${e.ligne?.texte} »`, e.ligne)
  await ctx.close()
}

// Sur tout l'essai : jamais de fenêtre Google sans un clic, jamais le relais
const appels = TOUS.flatMap(g => g.gis)
ok(appels.length > 0 && appels.every(a => a.actif), `requestAccessToken : ${appels.length} appel(s), tous dans un geste (navigator.userActivation)`, appels)
const relais = TOUS.flatMap(g => g.relais)
ok(relais.length === 0, 'le relais des replays n\'a jamais été appelé', relais)

console.log('erreurs JS :', erreurs)
if (erreurs.length) echecs++
await navigateur.close()
console.log(echecs ? `ÉCHEC : ${echecs} vérification(s) ratée(s)` : 'Tout est bon.')
process.exit(echecs ? 1 : 0)
