// T4. La version d'un seul fichier (file://), le cas principal : une VRAIE
// poignée de fichier du disque (obtenue en glissant le fichier par CDP, que
// Chromium sait ranger dans IndexedDB), les permissions simulées (Chromium
// sans fenêtre refuse l'écriture), l'écriture faite par Node, atomiquement
// (fichier temporaire puis renommage). Le fichier de la clé, le
// rechargement (accord redemandé : le bandeau), le Drive (« seulement depuis
// la version en ligne »), aucune requête vers Google.
import { chromium, V, ok, info, dort, ecrire, lireMemc, erreurs, suivre, norm } from './commun.mjs'
import { mkdtempSync, writeFileSync, readFileSync, renameSync, mkdirSync, rmSync } from 'node:fs'
const DISQUE = V + 'disque5/'
rmSync(DISQUE, { recursive: true, force: true }); mkdirSync(DISQUE)
writeFileSync(DISQUE + 'cle.memc', '')
const profil = mkdtempSync(V + 'profil-t5-')
const ctx = await chromium.launchPersistentContext(profil, { viewport: { width: 1366, height: 768 } })
const google = []
await ctx.route(/google|gstatic/, r => { if (/accounts\.google\.com|www\.googleapis\.com|script\.google\.com/.test(r.request().url())) google.push(r.request().url()); return r.abort() })
await ctx.exposeFunction('__lireDisque', nom => readFileSync(DISQUE + nom).toString('base64'))
const ecritures = []
await ctx.exposeFunction('__disque', (nom, b64) => {
  const tmp = DISQUE + '.' + nom + '.tmp'
  writeFileSync(tmp, Buffer.from(b64, 'base64')); renameSync(tmp, DISQUE + nom)
  ecritures.push({ nom, t: Date.now(), taille: Buffer.from(b64, 'base64').length })
  return true
})
await ctx.addInitScript(() => {
  let depart = null
  try { depart = sessionStorage.getItem('__permissionDepart') } catch {}
  window.__permission = depart || 'granted'
  window.__appels = []
  const H = FileSystemHandle.prototype
  H.queryPermission = async function () { window.__appels.push({ quoi: 'query', actif: navigator.userActivation.isActive }); return window.__permission }
  H.requestPermission = async function () {
    const actif = navigator.userActivation.isActive
    const r = actif ? 'granted' : window.__permission
    window.__appels.push({ quoi: 'request', actif, rendu: r })
    if (r === 'granted') window.__permission = 'granted'
    return r
  }
  // Après un rechargement, Chromium sans fenêtre n'a plus l'accord de lecture de la poignée
  // (le vrai requestPermission le redonnerait) : on lit alors le disque par Node
  const gf = FileSystemFileHandle.prototype.getFile
  FileSystemFileHandle.prototype.getFile = async function () {
    try { return await gf.call(this) } catch (e) {
      if (e.name !== 'NotAllowedError' || window.__permission !== 'granted') throw e
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
  window.__lachee = null
  window.addEventListener('drop', e => {
    if (!window.__attraper) return
    e.preventDefault(); e.stopImmediatePropagation()
    window.__attraper = false
    window.__lachee = e.dataTransfer.items[0].getAsFileSystemHandle()
  }, true)
  window.addEventListener('dragover', e => { if (window.__attraper) { e.preventDefault(); e.stopImmediatePropagation() } }, true)
  window.showSaveFilePicker = async () => { window.__choix = (window.__choix || 0) + 1; return await window.__lachee }
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = (document.querySelector('.toast')?.textContent || '').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
})
const URL_FICHIER = 'file://' + V + 'dist/index.html'
let p = await ctx.newPage(); suivre(p, 'file')
await p.goto(URL_FICHIER)
await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await p.waitForTimeout(1500)
const ETAT = () => {
  const n = s => (s || '').replace(/[  ]/g, ' ')
  const band = document.querySelector('.bandeau-sauvegarde')
  return { court: n(document.querySelector('.etat-classeur')?.textContent), description: n(document.getElementById('etat-classeur-description')?.textContent),
    bandeau: !band || band.hidden ? null : { raison: band.dataset.raison, texte: n(band.querySelector('.texte-bandeau')?.textContent), boutons: [...band.querySelectorAll('.bouton-bandeau')].map(x => x.textContent) },
    point: [...document.querySelectorAll('.point-etat')].some(x => !x.hidden) }
}
const etat = () => p.evaluate(ETAT)
const toasts = () => p.evaluate(() => window.__toasts.splice(0))
let e = await etat()
ok(/Sur le Drive : seulement depuis la version en ligne \(la connexion Google ne marche pas dans la version clé USB\)/.test(e.description), 'file:// : l\'état dit que le Drive demande la version en ligne', e.description)
// Une vraie poignée : le fichier du disque glissé sur la page
const cdp = await ctx.newCDPSession(p)
await p.evaluate(() => { window.__attraper = true })
for (const type of ['dragEnter', 'dragOver', 'drop']) await cdp.send('Input.dispatchDragEvent', { type, x: 600, y: 400, data: { items: [], files: [DISQUE + 'cle.memc'], dragOperationsMask: 1 } })
await p.waitForFunction(() => window.__lachee)
info('poignée glissée', await p.evaluate(async () => { const h = await window.__lachee; return h.constructor.name + ' ' + h.name }))
// Menu ⋯ → Enregistrer automatiquement dans un fichier…
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
const entrees = await p.evaluate(() => [...[...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden).querySelectorAll('.menu-item')].map(e => e.dataset.action ?? 'etat:' + e.dataset.etatAction))
info('menu ⋯', entrees)
await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="activer-cle"]')
await p.waitForTimeout(3000)
let t = await toasts()
ok(ecritures.length === 1 && t.some(x => x === 'Le classeur s\'enregistre maintenant tout seul dans « cle.memc ».'), 'activée en file:// avec une vraie poignée : première écriture, et la poignée est gardée (pas de « il faudra choisir de nouveau »)', { ecritures, t })
const garde = await p.evaluate(async () => {
  const req = r => new Promise((a, b) => { r.onsuccess = () => a(r.result); r.onerror = () => b(r.error) })
  const db = await req(indexedDB.open('mem-teachingtool-bibliotheque'))
  const v = await req(db.transaction('poignees').objectStore('poignees').getAll())
  db.close(); return v.map(x => (x?.poignee ?? x)?.constructor?.name)
})
ok(garde.includes('FileSystemFileHandle'), '   … la poignée (FileSystemFileHandle) est dans le magasin « poignees » de l\'index', garde)
// Trois traits, 25 s : l'écriture automatique
for (let i = 0; i < 3; i++) await ecrire(p, 300 + i * 60, 300 + i * 40)
await p.waitForTimeout(25000)
let lu = lireMemc(readFileSync(DISQUE + 'cle.memc'))
ok(lu.ids.length === 3, `25 s après : le fichier du disque a les 3 traits`, lu.ids)
// Fin du cours : un dernier trait, puis on ferme l'onglet 5 s après (le navigateur, le poste)
// Remis à jour au contrôle final du lot 4 : cet essai attendait, d'avant « corrections
// sauvegardes », que l'onglet fermé (Playwright répondant « Quitter ») ait tout de même écrit
// le trait. Le comportement voulu depuis : la question du navigateur (beforeunload), et
// l'écriture part aussitôt ; « Rester » : le trait est sur la clé en un instant ; « Quitter » :
// la page ne peut plus rien écrire, et la prochaine ouverture du classeur l'écrit sur la clé.
// On ferme comme le professeur (CDP Page.close, qui passe par beforeunload).
async function fermer(page, reponse, attente = 1200) {
  const questions = []
  const surQuestion = d => { questions.push(d.type()); (reponse === 'rester' ? d.dismiss() : d.accept()).catch(() => {}) }
  page.on('dialog', surQuestion)
  const c = await ctx.newCDPSession(page)
  await c.send('Page.close').catch(() => {})
  await dort(attente)
  if (!page.isClosed()) { page.off('dialog', surQuestion); await c.detach().catch(() => {}) }
  return { questions, ferme: page.isClosed() }
}
await ecrire(p, 700, 500)
await p.waitForTimeout(5000)
const e5 = await etat()
info('5 s après le dernier trait, juste avant de fermer', { court: e5.court, bandeau: e5.bandeau })
ok(e5.court === 'Clé : pas encore à jour', `   … le texte court le dit avant : « ${e5.court} »`, e5)
let n2 = ecritures.length
let f = await fermer(p, 'rester', 2500)
lu = lireMemc(readFileSync(DISQUE + 'cle.memc'))
ok(f.questions[0] === 'beforeunload' && !f.ferme && lu.ids.length === 4, `l'onglet fermé 5 s après le dernier trait : la question du navigateur, « Rester » : le fichier de la clé a ${lu.ids.length} traits sur 4 (écritures après la question : ${ecritures.length - n2})`, { f, ids: lu.ids })
// « Quitter » : un trait, fermer, partir
await ecrire(p, 700, 560)
await p.waitForTimeout(5000)
n2 = ecritures.length
f = await fermer(p, 'partir', 2000)
lu = lireMemc(readFileSync(DISQUE + 'cle.memc'))
ok(f.ferme && lu.ids.length === 4 && ecritures.length === n2, `   … un trait de plus, fermer, « Quitter » : l'onglet se ferme, la page ne pouvait plus rien écrire (${lu.ids.length} traits sur la clé)`, { f, ids: lu.ids })
// Rouvert (le même profil) : le trait est dans ce navigateur, et il part sur la clé
p = await ctx.newPage(); suivre(p, 'file-2')
await p.goto(URL_FICHIER)
await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
let arrive = false
for (let i = 0; i < 40 && !arrive; i++) { await dort(1000); arrive = lireMemc(readFileSync(DISQUE + 'cle.memc')).ids.length === 5 }
ok(arrive, '   … rouvert : le trait était resté dans ce navigateur, et il arrive sur la clé', lireMemc(readFileSync(DISQUE + 'cle.memc')).ids)
// (Le lendemain, sur le poste remis à zéro, un profil neuf : le fichier de la clé est tout ce
// qui reste ; « Quitter » avant l'écriture y perd le dernier trait, c'est ce que le texte court
// « Clé : pas encore à jour » montre avant de partir)
console.log('erreurs JS :', erreurs)
await ctx.close()
