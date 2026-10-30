// Lot 4, corrections « sauvegardes » : les cinq défauts du rapport de
// vérification, chacun refait tel qu'il a été trouvé (verif/sauvegardes :
// t1, t5, t7, t8, t3b, t10).
//   A. La clé active, on ferme l'onglet peu après le dernier trait (le
//      serveur de développement, les fichiers dans l'OPFS) : le texte court
//      dit « Clé : pas encore à jour » (pas l'heure de la dernière écriture) ;
//      le navigateur pose sa question (beforeunload) et l'écriture part
//      aussitôt : si l'on reste, le trait est sur la clé en un instant, puis
//      fermer ne demande plus rien ; si l'on part quand même, rien n'est
//      perdu dans ce navigateur, et la prochaine ouverture l'écrit sur la
//      clé. Pas de question en partant par la bibliothèque (elle attend
//      l'écriture), ni avec « Ouvrir sans attendre », ni la clé en pause, en
//      échec, ou écrite par l'autre onglet.
//   F. La même chose dans la version d'un seul fichier (dist/index.html en
//      file://), avec une vraie poignée de fichier du disque (glissée par
//      CDP), l'écriture faite par Node.
//   D. Le Drive (Google simulé comme dans C10-drive.mjs) : D1, après un
//      changement de compte Google, la ligne dit où est vraiment la dernière
//      copie, et que la prochaine ira sur l'autre compte (rien ne compte comme
//      copié sur lui) ; D2, le jeton expiré, « Se connecter à Google » reprend
//      le compte de la copie (login_hint, sans la liste), sans que Publier
//      ait jamais servi, même ses réglages vidés ; D3, l'écrivain passé sur
//      le fil principal (Ctrl + S avant la première copie) : la ligne le dit,
//      au lieu de « la première copie part bientôt ».
//   K. La clé dont la première écriture a été refusée, puis un rechargement :
//      jamais « à jour » tant que le fichier est vide, et rien ne compte comme
//      protégé ; puis la première écriture.
// Lancer : node lot4/corrections-sauvegardes.mjs [A F D K] (BASE=http://…
// pour une autre version ; F lit dist/index.html : npm run build d'abord)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium, lancerPersistant } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { gunzipSync } from 'node:zlib'
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE || process.env.DEV || 'http://localhost:5173/'
const R = `${RACINE_DEPOT}`
const S = `${RACINE_ESSAIS}/lot4/sauvegardes-travail/`
const parties = process.argv.slice(2)
const seul = x => !parties.length || parties.includes(x)
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const info = (m, d) => console.log('·', m, d === undefined ? '' : JSON.stringify(d).slice(0, 800))
const dort = ms => new Promise(r => setTimeout(r, ms))
const MIN = 60_000
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED|favicon/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = async p => {
  await p.waitForFunction(() => window.__surveillance && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
}
async function ecrire(p, x0, y0, n = 10) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(80)
}

/** Les poignées de l'OPFS, les permissions simulées, les écritures notées
 *  (comme C4-cle.mjs) */
const INIT = () => {
  let depart = null
  try { depart = sessionStorage.getItem('__permissionDepart') } catch { /* rien */ }
  window.__permission = depart || 'granted'
  window.__ecritures = []
  window.__panne = null
  window.__retarderClose = 0
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { return window.__permission }
  H.requestPermission = async function () {
    const r = navigator.userActivation.isActive ? 'granted' : window.__permission
    if (r === 'granted') window.__permission = 'granted'
    return r
  }
  const F = FileSystemFileHandle.prototype
  const cw = F.createWritable
  F.createWritable = async function (...a) {
    const panne = window.__panne
    if (panne) throw new DOMException('panne simulée', panne)
    const w = await cw.apply(this, a)
    const e = { nom: this.name, debut: Date.now() }
    window.__ecritures.push(e)
    return {
      write: async d => { e.taille = d.size; return w.write(d) },
      close: async () => {
        if (window.__retarderClose) await new Promise(r => setTimeout(r, window.__retarderClose))
        await w.close(); e.fin = Date.now()
      },
      abort: async r => w.abort(r),
    }
  }
  window.showSaveFilePicker = async o => (await navigator.storage.getDirectory()).getFileHandle(o?.suggestedName || 'sans-nom.memc', { create: true })
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = (document.querySelector('.toast')?.textContent || '').replace(/[\u00a0\u202f]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const ETAT = () => {
  const n = s => (s || '').replace(/[\u00a0\u202f]/g, ' ')
  const band = document.querySelector('.bandeau-sauvegarde')
  return {
    cle: window.__cle ? { ...window.__cle.etat } : null,
    drive: window.__drive ? { ...window.__drive.etat } : null,
    court: n(document.querySelector('.etat-classeur')?.textContent),
    niveau: window.__surveillance?.texte.niveau,
    point: [...document.querySelectorAll('.point-etat')].some(x => !x.hidden),
    bandeau: !band || band.hidden ? null : { raison: band.dataset.raison, texte: n(band.querySelector('.texte-bandeau')?.textContent), boutons: [...band.querySelectorAll('.bouton-bandeau')].map(x => x.textContent) },
    lignes: (window.__surveillance?.texte.lignes ?? []).map(l => `${l.quoi}:${l.niveau}:${n(l.texte)}`),
  }
}
const etat = p => p.evaluate(ETAT)
const ligne = (e, quoi) => e.lignes.find(l => l.startsWith(quoi + ':')) ?? ''
const toasts = p => p.evaluate(() => window.__toasts.splice(0))
async function entree(p, action) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click(`.menu-flottant:not([hidden]) .menu-item[data-action="${action}"]`)
}
const opfsLire = async (p, nom) => {
  const b64 = await p.evaluate(async nom => {
    try {
      const f = await (await (await navigator.storage.getDirectory()).getFileHandle(nom)).getFile()
      const o = new Uint8Array(await f.arrayBuffer())
      let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
      return btoa(s)
    } catch { return null }
  }, nom)
  return b64 === null ? null : Buffer.from(b64, 'base64')
}
/** Un .memc lu sous Node : son en-tête, les formes de toutes ses pages */
function lireMemc(o) {
  if (!o || !o.length) return { entete: null, ids: [] }
  const fin = o.indexOf(0x0a)
  const entete = JSON.parse(o.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  const ids = d.getArray('ordre').toArray().flatMap(id => [...(d.getMap('pages').get(id)?.get('formes')?.keys() ?? [])])
  return { entete, ids }
}
const formesIds = p => p.evaluate(() => window.__app.formes.map(f => f.id))
const nbEcrites = p => p.evaluate(() => window.__ecritures.filter(e => e.fin).length)
const attendreEcrites = (p, n, timeout = 30000) => p.waitForFunction(n => window.__ecritures.filter(e => e.fin).length >= n, n, { timeout }).then(() => true, () => false)
/** Ferme l'onglet comme le professeur (la croix, le navigateur : CDP
 *  Page.close, qui passe par beforeunload ; page.close de Playwright ne
 *  réessaie plus après une question refusée) : la question du navigateur,
 *  s'il la pose, reçoit `reponse` ('rester' ou 'partir'). Rend les
 *  questions posées et si l'onglet est fermé. */
async function fermer(p, reponse, attente = 1200) {
  const questions = []
  const surQuestion = d => { questions.push(d.type()); (reponse === 'rester' ? d.dismiss() : d.accept()).catch(() => {}) }
  p.on('dialog', surQuestion)
  const cdp = await p.context().newCDPSession(p)
  const t = Date.now()
  await cdp.send('Page.close').catch(() => {})
  await dort(attente)
  if (!p.isClosed()) { p.off('dialog', surQuestion); await cdp.detach().catch(() => {}) }
  return { questions, ferme: p.isClosed(), t }
}
/** Une navigation que fait la page elle-même : les questions du navigateur notées (et refusées) */
function noterQuestions(p) {
  const q = []
  p.on('dialog', d => { q.push(d.type()); d.dismiss().catch(() => {}) })
  return q
}

// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (la poignée de la clé relue depuis IndexedDB)
const nav = await lancerPersistant()
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(INIT)
  return ctx
}
async function ouvrir(ctx, chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(BASE + chemin); await pret(p); await p.waitForTimeout(400)
  return p
}

// =====================================================================
// A. FERMER L'ONGLET PEU APRÈS LE DERNIER TRAIT (la clé active)
// =====================================================================
if (seul('A')) {
  console.log('\n=== A. fermer l\'onglet peu après le dernier trait, la clé active ===')
  const ctx = await contexte()
  let p = await ouvrir(ctx, '', 'A')
  // Pas de copie sur le Drive : seule la clé protège ce classeur (le texte court est le sien)
  await p.evaluate(() => window.__drive.choisir('aucune'))
  const id1 = await p.evaluate(() => window.__app.classeur.id)
  await entree(p, 'activer-cle')
  ok(await attendreEcrites(p, 1, 15000), 'A1) la clé activée : la première écriture')
  const nom = await p.evaluate(() => window.__ecritures[0].nom)
  await p.waitForTimeout(500)
  let e = await etat(p)
  ok(e.court === 'Enregistré à l\'instant' && ligne(e, 'cle') === `cle:ok:Enregistré dans « ${nom} » : à l'instant`, `   … « ${e.court} »`, e)

  // A2. Un trait : la clé ne l'a pas encore
  await ecrire(p, 300, 300)
  const tTrait = Date.now()
  const idS1 = (await formesIds(p)).at(-1)
  await p.waitForTimeout(2600)
  e = await etat(p)
  ok(e.court === 'Enregistrement bientôt' && ligne(e, 'cle') === `cle:ok:Enregistré dans « ${nom} » : pas encore à jour, les derniers changements partent bientôt (dernière écriture à l'instant)`
    && !e.point && e.niveau !== 'attention' && !e.bandeau,
  'A2) un trait, 2,6 s après : « Enregistrement bientôt », la ligne le dit ; ni point ambre, ni bandeau (le défaut : « Enregistré à l\'instant »)', e)
  ok(e.cle.depuis >= tTrait - 1000 && e.cle.depuis <= tTrait + 200, '   … depuis le trait (l\'état de la clé : depuis)', { depuis: e.cle.depuis, tTrait })

  // A3. Fermer l'onglet 3 s après le trait ; on reste
  const n0 = await nbEcrites(p)
  let f = await fermer(p, 'rester', 300)
  ok(f.questions.length === 1 && f.questions[0] === 'beforeunload' && !f.ferme, 'A3) fermer l\'onglet 3 s après le trait : le navigateur pose sa question (beforeunload) ; on reste', f)
  const ecrit = await attendreEcrites(p, n0 + 1, 8000)
  const w = await p.evaluate(n => window.__ecritures[n], n0)
  let lu = lireMemc(await opfsLire(p, nom))
  ok(ecrit && w && w.debut - f.t < 3000 && lu.ids.includes(idS1),
    `   … l'écriture part dès la question (${w ? w.debut - f.t : '?'} ms après, ${w ? w.debut - tTrait : '?'} ms après le trait, au lieu de 20 s) : le trait est sur la clé`, { w, f, ids: lu.ids, idS1 })
  await p.waitForTimeout(500)
  e = await etat(p)
  ok(e.court === 'Enregistré à l\'instant' && !e.cle.depuis, `   … « ${e.court} »`, e)
  // A4. Tout est écrit : plus de question
  f = await fermer(p, 'rester')
  ok(f.questions.length === 0 && f.ferme, 'A4) tout est sur la clé : fermer l\'onglet ne demande rien, il se ferme', f)

  // A5. On part quand même
  p = await ouvrir(ctx, '', 'A5')
  e = await etat(p)
  ok(e.cle.etat === 'ok' && !e.cle.depuis && /^Enregistré /.test(e.court) && e.court !== 'Enregistrement bientôt', `A5) rouvert, rien à écrire : « ${e.court} »`, e)
  await ecrire(p, 360, 340)
  const idS2 = (await formesIds(p)).at(-1)
  await p.waitForTimeout(800)
  f = await fermer(p, 'partir', 1500)
  ok(f.questions.length === 1 && f.ferme, '   … un trait, puis fermer et « Quitter » : la question, et l\'onglet se ferme (la page ne peut plus rien écrire)', f)
  p = await ouvrir(ctx, '', 'A6')
  ok((await formesIds(p)).includes(idS2), 'A6) rouvert : le trait est dans ce navigateur (rien n\'est perdu)')
  await p.waitForTimeout(2300)
  e = await etat(p)
  lu = lireMemc(await opfsLire(p, nom))
  ok(!lu.ids.includes(idS2) && e.court === 'Enregistrement bientôt', `   … le fichier ne l'a pas encore, et le texte court le dit : « ${e.court} »`, { e, ids: lu.ids })
  ok(await attendreEcrites(p, 1, 30000) && lireMemc(await opfsLire(p, nom)).ids.includes(idS2), '   … puis il s\'écrit sur la clé, seul (20 s après l\'ouverture)')
  await p.waitForTimeout(400)

  // A7. Partir par la bibliothèque : elle attend l'écriture ; aucune question du navigateur
  const [id2] = await p.evaluate(async () => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
    const etatNeuf = await neuf.etatNeuf('carreaux'), T = Date.now(), id = dem.idClasseur()
    const fiche = { id, base: dem.baseDe(id), nom: 'Chapitre 2', dossier: null, etiquettes: [], cree: T, modifie: T, ouvert: T - 60e3, pages: 1, copieDrive: 'aucune' }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etatNeuf, { id, nom: fiche.nom }))
    return [id]
  })
  await ecrire(p, 420, 380)
  const idS3 = (await formesIds(p)).at(-1)
  await p.waitForTimeout(1600)
  let q = noterQuestions(p)
  const ouvrirBiblio = async p => {
    await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b.checkVisibility?.() !== false && b.getClientRects().length) { b.click(); document.querySelector('.menu-seances [data-action="bibliotheque"]').click() } else window.__app.ui.ouvrirBibliotheque() })
    await p.waitForFunction(() => window.__bibliotheque.ouvert && document.querySelectorAll('.grille-classeurs .carte-classeur').length > 0, null, { timeout: 10000 })
    await p.waitForTimeout(200)
  }
  const carte = id => `.grille-classeurs.tous .case-classeur[data-id="${id}"] .carte-classeur`
  await ouvrirBiblio(p)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click(carte(id2))])
  await pret(p); await p.waitForTimeout(300)
  lu = lireMemc(await opfsLire(p, nom))
  ok(await p.evaluate(() => window.__app.classeur.id) === id2 && q.length === 0 && lu.ids.includes(idS3),
    'A7) un trait, puis un autre classeur par la bibliothèque : le trait est d\'abord écrit sur la clé, aucune question du navigateur', { q, ids: lu.ids })
  // A8. « Ouvrir sans attendre » (une clé très lente) : pas de question non plus
  await ouvrirBiblio(p)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click(carte(id1))])
  await pret(p); await p.waitForTimeout(400)
  q = noterQuestions(p)
  await p.evaluate(() => { window.__retarderClose = 30000 })
  await ecrire(p, 480, 420)
  await p.waitForTimeout(1600)
  await ouvrirBiblio(p)
  await p.click(carte(id2))
  await p.waitForSelector('.toast button.action', { timeout: 9000 }).catch(() => {})
  const bouton = await p.evaluate(() => [...document.querySelectorAll('.toast button.action')].map(b => b.textContent))
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('.toast button.action')])
  await pret(p); await p.waitForTimeout(300)
  ok(bouton.includes('Ouvrir sans attendre') && await p.evaluate(() => window.__app.classeur.id) === id2 && q.length === 0,
    'A8) la clé lente : « Ouvrir sans attendre », puis l\'autre classeur, sans question du navigateur en plus', { bouton, q })

  // A9. La clé en pause (après un rechargement, le navigateur attend l'accord) : rien ne s'écrit sans un clic, pas de question
  // (sans écouteur, Playwright accepte la question d'un rechargement)
  p.removeAllListeners('dialog')
  await p.goto(BASE + '?classeur=' + id1); await pret(p); await p.waitForTimeout(300)
  await p.evaluate(() => sessionStorage.setItem('__permissionDepart', 'prompt'))
  await p.reload(); await pret(p); await p.waitForTimeout(600)
  e = await etat(p)
  await ecrire(p, 300, 450)
  await p.waitForTimeout(1500)
  const enPause = (await etat(p)).cle.etat
  f = await fermer(p, 'rester')
  ok(e.cle.etat === 'permission' && enPause === 'permission' && f.questions.length === 0 && f.ferme, 'A9) la clé en pause (« Reprendre l\'enregistrement sur la clé ») : un trait, fermer ne demande rien', { e: e.cle, f })

  // A10. La clé en échec (retirée) : le bandeau le dit, fermer ne demande rien
  p = await ouvrir(ctx, '?classeur=' + id1, 'A10')
  await p.evaluate(() => { window.__panne = 'NotFoundError' })
  await ecrire(p, 300, 500)
  await p.waitForFunction(() => window.__cle.etat.etat === 'erreur', null, { timeout: 30000 }).catch(() => {})
  e = await etat(p)
  f = await fermer(p, 'rester')
  ok(e.cle.etat === 'erreur' && e.court === 'Pas à jour, rien de perdu' && f.questions.length === 0 && f.ferme, 'A10) le disque retiré (l\'écriture a échoué) : « Pas à jour, rien de perdu », fermer ne demande rien', { court: e.court, f })

  // A11. Deux onglets : celui qui n'écrit pas la clé ne pose pas la question
  const a = await ouvrir(ctx, '?classeur=' + id1, 'A11a')
  const b = await ouvrir(ctx, '?classeur=' + id1, 'A11b')
  await b.waitForTimeout(500)
  ok((await etat(b)).cle.etat === 'autre-onglet', 'A11) un second onglet sur ce classeur : c\'est l\'autre qui écrit la clé')
  await ecrire(b, 300, 300)
  await b.waitForTimeout(1500)
  f = await fermer(b, 'rester')
  ok(f.questions.length === 0 && f.ferme, '   … un trait dans le second, le fermer ne demande rien (le premier l\'écrira)', f)
  await a.close()
  await ctx.close()
}

// =====================================================================
// F. LA VERSION D'UN SEUL FICHIER (file://), UNE VRAIE POIGNÉE
// =====================================================================
if (seul('F')) {
  console.log('\n=== F. la version d\'un seul fichier (dist/index.html en file://), une vraie poignée du disque ===')
  const DISQUE = S + 'disque-F/'
  rmSync(DISQUE, { recursive: true, force: true }); mkdirSync(DISQUE, { recursive: true })
  writeFileSync(DISQUE + 'cle.memc', '')
  const profil = mkdtempSync(S + 'profil-F-')
  const ctx = await chromium.launchPersistentContext(profil, { viewport: { width: 1366, height: 768 } })
  const google = []
  // La connexion Google et le Drive (la police de fonts.googleapis.com n'en est pas)
  await ctx.route(/google|gstatic/, r => { if (/accounts\.google\.com|www\.googleapis\.com|script\.google\.com/.test(r.request().url())) google.push(r.request().url()); return r.abort() })
  await ctx.exposeFunction('__lireDisque', nom => readFileSync(DISQUE + nom).toString('base64'))
  const ecritures = []
  await ctx.exposeFunction('__disque', (nom, b64) => {
    const tmp = DISQUE + '.' + nom + '.tmp'
    writeFileSync(tmp, Buffer.from(b64, 'base64')); renameSync(tmp, DISQUE + nom)
    ecritures.push({ nom, t: Date.now() })
    return true
  })
  await ctx.addInitScript(() => {
    // Chromium sans fenêtre refuse d'écrire dans un fichier du disque : les
    // permissions simulées, l'écriture faite par Node (fichier temporaire, puis renommé)
    const H = FileSystemHandle.prototype
    H.queryPermission = async function () { return 'granted' }
    H.requestPermission = async function () { return 'granted' }
    const gf = FileSystemFileHandle.prototype.getFile
    FileSystemFileHandle.prototype.getFile = async function () {
      try { return await gf.call(this) } catch (e) {
        if (e.name !== 'NotAllowedError') throw e
        const b = Uint8Array.from(atob(await window.__lireDisque(this.name)), c => c.charCodeAt(0))
        return new File([b], this.name)
      }
    }
    FileSystemFileHandle.prototype.createWritable = async function () {
      const nom = this.name, morceaux = []
      return {
        write: async d => { morceaux.push(d) },
        close: async () => {
          const o = new Uint8Array(await new Blob(morceaux).arrayBuffer())
          let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
          await window.__disque(nom, btoa(s))
        },
        abort: async () => {},
      }
    }
    // Le fichier du disque glissé sur la page devient le choix du fichier
    window.__lachee = null
    window.addEventListener('drop', e => {
      if (!window.__attraper) return
      e.preventDefault(); e.stopImmediatePropagation()
      window.__attraper = false
      window.__lachee = e.dataTransfer.items[0].getAsFileSystemHandle()
    }, true)
    window.addEventListener('dragover', e => { if (window.__attraper) { e.preventDefault(); e.stopImmediatePropagation() } }, true)
    window.showSaveFilePicker = async () => await window.__lachee
  })
  let p = ctx.pages()[0] ?? await ctx.newPage(); suivre(p, 'F')
  await p.goto('file://' + R + '/dist/index.html')
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await p.waitForTimeout(1500)
  const court = () => p.evaluate(() => (document.querySelector('.etat-classeur')?.textContent || '').replace(/[\u00a0\u202f]/g, ' '))
  const cdp = await ctx.newCDPSession(p)
  await p.evaluate(() => { window.__attraper = true })
  for (const type of ['dragEnter', 'dragOver', 'drop']) await cdp.send('Input.dispatchDragEvent', { type, x: 600, y: 400, data: { items: [], files: [DISQUE + 'cle.memc'], dragOperationsMask: 1 } })
  await p.waitForFunction(() => window.__lachee)
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="activer-cle"]')
  for (let i = 0; i < 50 && !ecritures.length; i++) await dort(100)
  ok(ecritures.length === 1, 'F1) file:// : la clé activée sur un fichier du disque, la première écriture', ecritures)
  await p.waitForTimeout(500)
  for (let i = 0; i < 3; i++) await ecrire(p, 300 + i * 60, 300 + i * 40)
  await p.waitForTimeout(2600)
  const c = await court()
  ok(c === 'Enregistrement bientôt', `F2) trois traits, 2,6 s après : « ${c} »`, c)
  const n = ecritures.length
  let f = await fermer(p, 'rester', 100)
  for (let i = 0; i < 60 && ecritures.length === n; i++) await dort(100)
  const lu = lireMemc(readFileSync(DISQUE + 'cle.memc'))
  ok(f.questions.length === 1 && f.questions[0] === 'beforeunload' && !f.ferme && ecritures.length === n + 1 && ecritures[n].t - f.t < 4000 && lu.ids.length === 3,
    `F3) fermer l'onglet 3 s après le dernier trait : la question ; on reste, et les trois traits sont dans le fichier du disque (${ecritures[n] ? ecritures[n].t - f.t : '?'} ms après)`, { f, ecritures, ids: lu.ids.length })
  await p.waitForTimeout(500)
  ok(await court() === 'Enregistré à l\'instant', '   … « Enregistré à l\'instant »')
  f = await fermer(p, 'rester')
  ok(f.questions.length === 0 && f.ferme, 'F4) puis fermer : plus de question, l\'onglet se ferme', f)
  ok(google.length === 0, '   … aucune requête vers Google', google)
  await ctx.close()
  rmSync(profil, { recursive: true, force: true })
}

// =====================================================================
// D. LE DRIVE : LE COMPTE DE LA DERNIÈRE COPIE, LA RECONNEXION, L'ÉCRIVAIN SUR LE FIL
// =====================================================================
/** Un faux Drive par compte Google (son adresse) : celui de C10-drive.mjs */
const DOSSIER = 'application/vnd.google-apps.folder'
class FauxGoogle {
  constructor() { this.drives = new Map(); this.n = 0; this.requetes = []; this.choisi = 'prof@example.com'; this.expire = 3600; this.gis = []; this.sessions = new Map(); this.horloge = Date.now() }
  drive(qui) { if (!this.drives.has(qui)) this.drives.set(qui, new Map()); return this.drives.get(qui) }
  sauvegardes(qui = this.choisi) { return [...this.drive(qui).values()].filter(f => f.mimeType !== DOSSIER && f.appProperties?.memSauvegarde === 'v1' && !f.trashed) }
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
    await ctx.route(/script\.google\.com/, r => r.fulfill({ status: 404, body: '' }))
  }
  async repondre(r) {
    const req = r.request(), u = new URL(req.url()), m = req.method()
    const qui = (req.headers().authorization ?? '').replace('Bearer jeton:', '')
    this.requetes.push({ m, chemin: u.pathname, qui })
    const json = (o, status = 200, entetes = {}) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...entetes }, body: o === null ? '' : JSON.stringify(o) })
    const d = this.drive(qui)
    if (u.pathname === '/drive/v3/about') return json({ user: { emailAddress: qui } })
    if (u.pathname.startsWith('/upload/')) {
      const id = u.pathname.match(/\/files\/([^/]+)$/)?.[1] ?? null
      const type = u.searchParams.get('uploadType')
      if (type === 'multipart') { const x = this.multipart(req.postDataBuffer(), req.headers()['content-type']); return json({ id: this.ecrire(d, id, x.meta, x.octets) }) }
      if (type === 'resumable' && u.searchParams.get('upload_id')) { const s = this.sessions.get(u.searchParams.get('upload_id')); return json({ id: this.ecrire(d, s.id, s.meta, req.postDataBuffer()) }) }
      if (type === 'resumable') {
        const envoi = 'envoi' + (++this.n)
        this.sessions.set(envoi, { id, meta: JSON.parse(req.postData()) })
        const loc = `https://www.googleapis.com/upload/drive/v3/files${id ? '/' + id : ''}?uploadType=resumable&upload_id=${envoi}`
        return json(null, 200, { 'x-guploader-uploadid': envoi, 'access-control-expose-headers': 'Location, X-GUploader-UploadID', location: loc })
      }
    }
    const rev = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/revisions(?:\/([^/]+))?$/)
    if (rev) {
      const f = d.get(decodeURIComponent(rev[1]))
      if (!f) return json({ error: { message: 'File not found' } }, 404)
      if (m === 'DELETE') { const i = f.versions.findIndex(v => v.id === decodeURIComponent(rev[2])); if (i >= 0 && i < f.versions.length - 1) f.versions.splice(i, 1); return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }) }
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
    if (u.pathname === '/drive/v3/files' && m === 'POST') { const o = JSON.parse(req.postData()); const id = 'dossier' + (++this.n) + 'xxxxxxxxx'; d.set(id, { ...o, id, versions: [], modifie: Date.now() }); return json({ id }) }
    if (u.pathname === '/drive/v3/files' && m === 'GET') return json({ files: this.chercher(d, u.searchParams.get('q') || '').map(f => this.vue(f)) })
    return json({ error: { message: 'inconnu ' + u.pathname } }, 404)
  }
}
/** « Autres sauvegardes… » → « Choisir le compte ou arrêter… » (lot 18) : le Drive voulu, « Se connecter » (ou « Changer de compte Google »), puis Valider */
async function connecterParLeChoix(p, compte = 'mem') {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  // (Adapté au lot 18 : « Copie sur le Drive… » n'est plus dans le menu ⋯ ; sa fenêtre s'ouvre par « Autres sauvegardes… » → « Choisir le compte ou arrêter… »)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="autres-sauvegardes"]')
  await p.waitForSelector('dialog.dialogue-autres[open] .as-compte')
  await p.click('dialog.dialogue-autres[open] .as-compte')
  await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
  await p.check(`dialog.dialogue-drive[open] input[name=d-compte][value=${compte}]`)
  const avant = await p.textContent('dialog.dialogue-drive[open] .d-qui')
  await p.click('dialog.dialogue-drive[open] .d-connecter')
  await p.waitForFunction(a => { const t = document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''; return /^Connecté/.test(t) && t !== a }, avant, { timeout: 10000 }).catch(() => {})
  const r = { qui: await p.textContent('dialog.dialogue-drive[open] .d-qui'), taille: await p.textContent('dialog.dialogue-drive[open] .d-taille') }
  await p.click('dialog.dialogue-drive[open] .d-valider'); await p.waitForTimeout(400)
  return r
}

if (seul('D')) {
  console.log('\n=== D. le Drive : le compte de la dernière copie, la reconnexion, l\'écrivain sur le fil principal ===')
  // ---- D1. Après un changement de compte Google ----
  {
    const g = new FauxGoogle()
    const ctx = await contexte(); await g.brancher(ctx)
    const p = await ctx.newPage(); suivre(p, 'D1')
    await p.clock.install()
    await p.goto(BASE); await pret(p); await p.waitForTimeout(500)
    await p.clock.fastForward(4000); await p.waitForTimeout(300)
    await connecterParLeChoix(p)
    await ecrire(p, 300, 300)
    await p.clock.fastForward(2 * MIN + 5000); await p.waitForTimeout(1500)
    let e = await etat(p)
    ok(g.sauvegardes('prof@example.com').length === 1 && ligne(e, 'drive') === 'drive:ok:Sur le Drive personnel (prof@example.com) : à l\'instant', 'D1) la première copie, sur le Drive de prof@example.com', ligne(e, 'drive'))
    // « Changer de compte Google », sans rien écrire de plus
    g.choisi = 'autre@example.com'
    const choix = await connecterParLeChoix(p)
    ok(/^Connecté : autre@example\.com\.$/.test(choix.qui) && choix.taille.replace(/[\u00a0\u202f]/g, ' ').startsWith('La dernière copie, sur prof@example.com, fait ') && /la prochaine ira sur autre@example\.com\./.test(choix.taille),
      `   … « Copie sur le Drive… » le dit aussi : « ${choix.taille} »`, choix)
    await p.clock.fastForward(60_000); await p.waitForTimeout(500)
    e = await etat(p)
    ok(ligne(e, 'drive') === 'drive:info:Sur le Drive personnel : dernière copie sur prof@example.com (il y a 1 min) ; connecté avec autre@example.com : la prochaine ira là'
      && e.drive.t === undefined && e.drive.ailleurs?.courriel === 'prof@example.com' && !/^Drive : /.test(e.court) && e.niveau !== 'ok' && g.sauvegardes('autre@example.com').length === 0,
    `   … connecté avec autre@example.com : « ${ligne(e, 'drive')} » ; rien ne compte comme copié sur lui (« ${e.court} »)`, e)
    // Un trait : la prochaine copie va bien sur l'autre compte
    await ecrire(p, 360, 320)
    await p.clock.fastForward(11 * MIN); await p.waitForTimeout(1500)
    e = await etat(p)
    ok(g.sauvegardes('autre@example.com').length === 1 && ligne(e, 'drive') === 'drive:ok:Sur le Drive personnel (autre@example.com) : à l\'instant' && e.court === 'Drive : à l\'instant',
      `   … un trait : la copie suivante va sur autre@example.com, et la ligne le dit (« ${ligne(e, 'drive')} »)`, { e, autre: g.sauvegardes('autre@example.com').length })
    await ctx.close()
  }
  // ---- D2. Le jeton expiré, sans que Publier ait jamais servi ----
  {
    const g = new FauxGoogle()
    g.expire = 200
    g.choisi = 'prof@example.org'
    const ctx = await contexte(); await g.brancher(ctx)
    const p = await ctx.newPage(); suivre(p, 'D2')
    await p.clock.install()
    await p.goto(BASE); await pret(p); await p.waitForTimeout(500)
    await p.clock.fastForward(4000); await p.waitForTimeout(300)
    await connecterParLeChoix(p, 'lfb')
    ok(g.gis.length === 1 && g.gis[0].prompt === 'select_account' && g.gis[0].hint === '', 'D2) la première connexion (Drive du lycée) : la liste des comptes de Google', g.gis)
    await ecrire(p, 300, 300)
    await p.clock.fastForward(2 * MIN + 5000); await p.waitForTimeout(1500)
    const memoire = await p.evaluate(() => [localStorage.getItem('mem-teachingtool-drive-compte:lfb'), localStorage.getItem('tableau-mem:compte-google:lfb')])
    ok(g.sauvegardes('prof@example.org').length === 1 && memoire[0] === 'prof@example.org' && memoire[1] === null,
      '   … une copie ; le compte est retenu pour la copie (sa clé à elle), sans toucher à ce que retient Publier', memoire)
    // Le jeton expire ; un trait ; 2 min sans geste : le bandeau, et son clic
    const bandeauPuisClic = async () => {
      await ecrire(p, 400, 300)
      await p.clock.fastForward(4 * MIN); await p.waitForTimeout(800)
      const e = await etat(p)
      const n = g.gis.length
      await p.click('.bandeau-sauvegarde .bouton-bandeau[data-etat-action="connecter-drive"]')
      await p.waitForTimeout(600)
      return { bandeau: e.bandeau?.raison, appel: g.gis[n] }
    }
    let r = await bandeauPuisClic()
    ok(r.bandeau === 'drive-connexion' && r.appel?.hint === 'prof@example.org' && r.appel.prompt === '' && r.appel.actif,
      `   … le jeton expiré : le bandeau, et son clic reprend le compte de la copie (login_hint « ${r.appel?.hint} », prompt « ${r.appel?.prompt} » : un seul clic)`, r)
    await p.clock.fastForward(5000); await p.waitForTimeout(800)
    // Les réglages de ce navigateur vidés (le poste remis à zéro garde la bibliothèque) : la fiche connaît le compte de la copie
    await p.evaluate(() => localStorage.removeItem('mem-teachingtool-drive-compte:lfb'))
    r = await bandeauPuisClic()
    ok(r.bandeau === 'drive-connexion' && r.appel?.hint === 'prof@example.org' && r.appel.prompt === '',
      `   … sans rien de retenu : le compte de la dernière copie (la fiche) : login_hint « ${r.appel?.hint} »`, r)
    await ctx.close()
  }
  // ---- D3. L'écrivain passé sur le fil principal avant la première copie ----
  {
    const g = new FauxGoogle()
    const ctx = await contexte(); await g.brancher(ctx)
    await ctx.addInitScript(() => { window.Worker = undefined })
    const p = await ctx.newPage(); suivre(p, 'D3')
    await p.clock.install()
    await p.goto(BASE); await pret(p); await p.waitForTimeout(500)
    await p.clock.fastForward(4000); await p.waitForTimeout(300)
    await connecterParLeChoix(p)
    await p.keyboard.press('Control+s'); await p.waitForTimeout(1500)
    const mode = await p.evaluate(() => window.__ecrivain.mode)
    await ecrire(p, 300, 300)
    await p.clock.fastForward(3 * MIN); await p.waitForTimeout(800)
    let e = await etat(p)
    ok(mode === 'fil' && ligne(e, 'drive') === 'drive:attention:Sur le Drive : ce navigateur ne permet pas de faire la copie en arrière-plan' && !e.lignes.some(l => /part bientôt/.test(l)),
      `D3) Ctrl + S d'abord (l'écrivain sur le fil principal), puis un trait : « ${ligne(e, 'drive')} » (le défaut : « la première copie part bientôt »)`, { mode, e })
    await p.clock.fastForward(30 * MIN); await p.waitForTimeout(800)
    e = await etat(p)
    ok(!g.requetes.some(r => r.chemin.startsWith('/upload/')) && e.drive.etat === 'erreur', '   … 30 min plus tard : aucune copie n\'est partie, et la ligne le dit toujours', e.drive)
    await ctx.close()
  }
}

// =====================================================================
// K. LA CLÉ DONT LA PREMIÈRE ÉCRITURE A ÉTÉ REFUSÉE
// =====================================================================
if (seul('K')) {
  console.log('\n=== K. la clé dont la première écriture a été refusée, puis un rechargement ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'K')
  await p.evaluate(() => window.__drive.choisir('aucune'))
  await ecrire(p, 300, 300)
  await p.evaluate(() => { window.__panne = 'NoModificationAllowedError' })
  await entree(p, 'activer-cle')
  await p.waitForTimeout(2500)
  const fiche = await p.evaluate(async () => (await window.__registre.classeur(window.__app.classeur.id)).cle)
  ok(fiche && fiche.nom && fiche.t === undefined && fiche.date === undefined, 'K1) la clé activée, la première écriture refusée (lecture seule) : rien d\'écrit', fiche)
  await p.reload(); await pret(p); await p.waitForTimeout(2500)
  const vu = []
  for (let i = 0; i < 4; i++) {
    const e = await etat(p)
    vu.push({ cle: ligne(e, 'cle'), court: e.court, niveau: e.niveau, taille: (await opfsLire(p, fiche.nom))?.length ?? null })
    await ecrire(p, 200 + i * 30, 400); await p.waitForTimeout(2500)
  }
  ok(vu.every(v => v.taille === 0 && v.cle === `cle:info:Fichier « ${fiche.nom} » : pas encore écrit (la première écriture part bientôt)` && v.court === 'Enregistrement bientôt' && v.niveau !== 'ok'),
    'K2) rechargé, le fichier encore vide : « pas encore écrit (la première écriture part bientôt) », « Enregistrement bientôt » ; jamais « à jour », rien ne compte comme protégé (le défaut : « Enregistré dans « … » : à jour »)', vu)
  const protege = await p.evaluate(async () => (await import('/src/classeurs/etat.ts')).protege(window.__surveillance.etat, Date.now()))
  ok(protege === false, '   … protege() : non')
  ok(await attendreEcrites(p, 1, 30000), 'K3) puis la première écriture (20 s après le dernier trait)')
  await p.waitForTimeout(500)
  const e = await etat(p)
  ok(ligne(e, 'cle') === `cle:ok:Enregistré dans « ${fiche.nom} » : à l'instant` && e.court === 'Enregistré à l\'instant' && (await opfsLire(p, fiche.nom)).length > 0, `   … « ${e.court} », le fichier écrit`, e)
  await ctx.close()
}

console.log(`\nErreurs JS : ${erreurs.length}`)
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
