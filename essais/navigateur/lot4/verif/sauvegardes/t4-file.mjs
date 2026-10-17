// T4. La version d'un seul fichier (file://), le cas principal : une VRAIE
// poignée de fichier du disque (obtenue en glissant le fichier par CDP, que
// Chromium sait ranger dans IndexedDB), les permissions simulées (Chromium
// sans fenêtre refuse l'écriture), l'écriture faite par Node, atomiquement
// (fichier temporaire puis renommage). Le fichier de la clé, le
// rechargement (accord redemandé : le bandeau), le Drive (« seulement depuis
// la version en ligne »), aucune requête vers Google.
import { chromium, V, ok, info, dort, ecrire, lireMemc, erreurs, suivre, norm } from './commun.mjs'
import { mkdtempSync, writeFileSync, readFileSync, renameSync, mkdirSync, rmSync } from 'node:fs'
const DISQUE = V + 'disque4/'
rmSync(DISQUE, { recursive: true, force: true }); mkdirSync(DISQUE)
writeFileSync(DISQUE + 'cle.memc', '')
const profil = mkdtempSync(V + 'profil-t4-')
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
ok(/Sur le Drive : seulement depuis la version en ligne \(la connexion Google ne marche pas dans la version hors ligne\)/.test(e.description), 'file:// : l\'état dit que le Drive demande la version en ligne', e.description)
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
ok(ecritures.length >= 2 && lu.ids.length === 3 && lu.entier, `25 s après : le fichier du disque a les 3 traits (${lu.ids.length})`, { ecritures: ecritures.length, ids: lu.ids })
e = await etat()
ok(/^Clé : /.test(e.court) && !e.bandeau, `   … l'état : « ${e.court} »`, e)
// Rechargé, Chrome redemande l'accord
await p.evaluate(() => sessionStorage.setItem('__permissionDepart', 'prompt'))
await p.reload()
await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await p.waitForTimeout(2500)
e = await etat()
ok(e.court === 'Clé en pause' && e.bandeau?.raison === 'cle-permission' && e.bandeau.boutons.includes('Reprendre l\'enregistrement sur la clé'), `rechargé, l'accord redemandé : « ${e.court} », bandeau « ${e.bandeau?.texte} »`, e)
const n1 = ecritures.length
await ecrire(p, 500, 500)
await p.waitForTimeout(23000)
const demandesSansGeste = await p.evaluate(() => window.__appels.filter(a => a.quoi === 'request' && !a.actif).length)
ok(ecritures.length === n1 && demandesSansGeste === 0, '   … un trait, 23 s : rien n\'est écrit ni demandé sans un clic', { ecritures: ecritures.length - n1, demandesSansGeste })
await p.click('.bandeau-sauvegarde .bouton-bandeau')
await p.waitForTimeout(3000)
lu = lireMemc(readFileSync(DISQUE + 'cle.memc'))
e = await etat()
ok(ecritures.length === n1 + 1 && lu.ids.length === 4 && /^Clé : /.test(e.court) && !e.bandeau, `   … [Reprendre] : écrit (${lu.ids.length} traits), « ${e.court} »`, { e, ids: lu.ids.length })
info('toasts', await toasts())
ok(google.length === 0, 'aucune requête vers Google en file://', google)
console.log('erreurs JS :', erreurs)
await ctx.close()
