// ESSAI DU CONTRÔLE FINAL DU LOT 4, n° 1 : la clé activée en ajoutant, en
// remplaçant ou en créant un classeur (la case « Enregistrer automatiquement
// … ») arrivait EN PAUSE dans le vrai Chrome, qui oublie son accord d'écrire
// dans le fichier dès que la page change (sauf « Autoriser à chaque
// visite ») ; et le message d'arrivée disait le contraire (« Il s'enregistre
// automatiquement… »). Cet essai simule les permissions COMME CHROME (vérifié
// sous Xvfb, voir CF1-vrai-chrome.mjs) : l'accord donné dans une page n'y vit
// que le temps de la page ; « à chaque visite » le garde (localStorage) ;
// requestPermission veut un geste (sinon SecurityError), et note chaque
// demande (sessionStorage : elle survit au changement de page) ;
// createWritable sans accord : NotAllowedError ; showSaveFilePicker donne
// l'accord, showOpenFilePicker seulement la lecture.
// A. Ajouter (Ctrl + O, la case cochée) : aucune demande avant de partir ;
//    à l'arrivée, la vérité et [Autoriser] (une seule demande en tout, avec le
//    conseil « Autoriser à chaque visite ») ; puis les traits vont sur la clé ;
//    un autre classeur et retour : « Clé en pause » (cette fois) ; « à chaque
//    visite » : rechargé, puis un autre classeur et retour, tout repart seul.
// B. Nouveau classeur avec la case : écrit avant de partir, puis la vérité à
//    l'arrivée.
// C. Remplacer avec la case, l'accord refusé à l'arrivée : en pause, dit.
// D. Un fichier déjà autorisé à chaque visite : « Il s'enregistre
//    automatiquement », aucune demande.
// E. « Ouvrir celui de la bibliothèque » (le classeur ouvert ici) : on reste
//    sur la page, l'accord est demandé dans le clic, puis la vérité.
// Sans la correction, A, B et C échouent.
// Lancer : node CF1-accord.mjs [adresse du serveur de développement]
import { lancerPersistant } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { gunzipSync, gzipSync } from 'node:zlib'

const DEV = process.argv[2] || 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1800) : '') }
const norm = t => (t || '').replace(/[  ]/g, ' ')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}

/** Les permissions comme Chrome (voir l'en-tête) ; les poignées de l'OPFS */
const CHROME = () => {
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  window.__accords = new Set()
  const persistants = () => { try { return JSON.parse(localStorage.getItem('__chaqueVisite') || '[]') } catch { return [] } }
  const noter = d => { try { const l = JSON.parse(sessionStorage.getItem('__demandes') || '[]'); l.push(d); sessionStorage.setItem('__demandes', JSON.stringify(l)) } catch { /* rien */ } }
  const accorde = nom => window.__accords.has(nom) || persistants().includes(nom)
  H.queryPermission = async function (o) { return o?.mode !== 'readwrite' || accorde(this.name) ? 'granted' : 'prompt' }
  H.requestPermission = async function (o) {
    if (o?.mode !== 'readwrite' || accorde(this.name)) return 'granted'
    const actif = navigator.userActivation.isActive
    const reponse = sessionStorage.getItem('__reponse') || 'cette-fois'
    noter({ nom: this.name, actif, reponse: actif ? reponse : 'sans-geste', ou: location.search })
    if (!actif) throw new DOMException('User activation is required to request permissions.', 'SecurityError')
    if (reponse === 'refus') return 'denied'
    window.__accords.add(this.name)
    if (reponse === 'chaque-visite') localStorage.setItem('__chaqueVisite', JSON.stringify([...new Set([...persistants(), this.name])]))
    return 'granted'
  }
  const F = FileSystemFileHandle.prototype
  const cw = F.createWritable
  F.createWritable = async function (...a) {
    if (!accorde(this.name)) throw new DOMException('Accord manquant (simulé comme Chrome).', 'NotAllowedError')
    return cw.apply(this, a)
  }
  window.__aOuvrir = null
  window.showSaveFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    const nom = o?.suggestedName || 'sans-nom.memc'
    window.__accords.add(nom)
    return dir.getFileHandle(nom, { create: true })
  }
  window.showOpenFilePicker = async () => {
    const dir = await navigator.storage.getDirectory()
    const n = window.__aOuvrir; window.__aOuvrir = null
    if (!n) throw new DOMException('rien', 'AbortError')
    return [await dir.getFileHandle(n)]
  }
  window.__opfsEcrire = async (nom, b64) => {
    const h = await (await navigator.storage.getDirectory()).getFileHandle(nom, { create: true })
    const w = await cw.call(h); await w.write(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))])); await w.close()
  }
  window.__opfsB64 = async nom => {
    try {
      const f = await (await (await navigator.storage.getDirectory()).getFileHandle(nom)).getFile()
      const o = new Uint8Array(await f.arrayBuffer())
      let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
      return btoa(s)
    } catch { return null }
  }
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => {
    const t = document.querySelector('.toast')
    const x = t && t.classList.contains('visible') ? (t.textContent || '').replace(/[  ]/g, ' ') : ''
    if (x && x !== dernier) { dernier = x; window.__toasts.push(x) }
  }, 15)
}
const toasts = p => p.evaluate(() => window.__toasts.splice(0))
const demandes = p => p.evaluate(() => JSON.parse(sessionStorage.getItem('__demandes') || '[]'))
const viderDemandes = p => p.evaluate(() => sessionStorage.removeItem('__demandes'))
const reponse = (p, r) => p.evaluate(r => sessionStorage.setItem('__reponse', r), r)

function faireMemc(etat, entete) {
  const tete = Buffer.from(JSON.stringify({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', ...entete }) + '\n')
  return Buffer.concat([tete, gzipSync(Buffer.from(etat))])
}
function unClasseur(ids) {
  const d = new Y.Doc({ gc: false })
  const p = new Y.Map(); p.set('fond', 'carreaux')
  const f = new Y.Map()
  ids.forEach((id, j) => f.set(id, { id, type: 'trait', x: 10 * j, y: 10, z: j, auteur: 'essai', pts: [0, 0, 0.5, 30, 10, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }))
  p.set('formes', f)
  d.getMap('pages').set('p0', p)
  d.getArray('ordre').push(['p0'])
  d.getArray('film').push([{ t: Date.now() - 86400e3, page: 'p0' }])
  return Y.encodeStateAsUpdate(d)
}
function lireMemc(o) {
  const fin = o.indexOf(0x0a)
  const entete = JSON.parse(o.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  const ids = d.getArray('ordre').toArray().flatMap(id => [...(d.getMap('pages').get(id)?.get('formes')?.keys() ?? [])])
  return { entete, n: ids.length }
}
const opfsEcrire = (p, nom, octets) => p.evaluate(({ nom, b64 }) => window.__opfsEcrire(nom, b64), { nom, b64: Buffer.from(octets).toString('base64') })
const opfsLire = async (p, nom) => { const b = await p.evaluate(n => window.__opfsB64(n), nom); return b === null ? null : lireMemc(Buffer.from(b, 'base64')) }

const pret = async p => {
  await p.waitForFunction(() => (window.__surveillance && 'cle' in window.__app.ui && document.querySelector('.rang')?.textContent?.includes('/'))
    || (window.__fichiers && !window.__app && !document.querySelector('.bibliotheque')?.hidden), null, { timeout: 30000 })
  await p.evaluate(() => window.__cle?.pret)
  await p.waitForTimeout(700)
}
const etat = p => p.evaluate(() => ({
  cle: window.__cle?.etat?.etat ?? null,
  court: (document.querySelector('.etat-classeur')?.textContent || '').replace(/[  ]/g, ' '),
  bandeau: (b => b && !b.hidden ? b.dataset.raison : null)(document.querySelector('.bandeau-sauvegarde')),
  action: [...document.querySelectorAll('.toast.visible button.action')].map(b => b.textContent),
}))
async function ecrire(p, x0, y0) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= 12; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 16)
  await p.mouse.up(); await p.waitForTimeout(100)
}
/** Le fichier de la clé reçoit-il n traits (l'écriture automatique : 20 s après le dernier, au calme) ? */
async function attendreSurLaCle(p, nom, n, max = 45000) {
  const t0 = Date.now()
  while (Date.now() - t0 < max) { const l = await opfsLire(p, nom); if (l && l.n >= n) return true; await p.waitForTimeout(1000) }
  return false
}
const ouvrirBiblio = async p => {
  await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b && b.getClientRects().length) b.click(); else window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque?.ouvert && document.querySelectorAll('.grille-classeurs li').length > 0, null, { timeout: 10000 })
  await p.waitForTimeout(300)
}
async function allerA(p, id) {
  await ouvrirBiblio(p)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click(`.case-classeur[data-id="${id}"] .carte-classeur`)])
  await pret(p)
}
const ctrlO = async (p, nom) => { await p.evaluate(n => { window.__aOuvrir = n }, nom); await p.keyboard.press('Control+o'); await p.waitForSelector('dialog[open]', { timeout: 15000 }); await p.waitForTimeout(200) }
const faux = t => /s'enregistre automatiquement|s'enregistre maintenant tout seul/.test(t)

// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (la poignée de la clé relue depuis IndexedDB)
const nav = await lancerPersistant()
async function contexte() {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(CHROME)
  await ctx.addInitScript(ECOUTER_TOASTS)
  return ctx
}
const ID_S = 'c1c1c1c1c1c1c1c1', ID_R = 'c2c2c2c2c2c2c2c2', ID_D = 'c3c3c3c3c3c3c3c3', ID_E = 'c4c4c4c4c4c4c4c4'

// =====================================================================
console.log('\n=== A. Ajouter un classeur avec la case : la vérité à l\'arrivée, l\'accord en un clic ===')
{
  const ctx = await contexte()
  const p = await ctx.newPage(); suivre(p, 'A')
  await p.goto(DEV); await pret(p)
  const premier = await p.evaluate(() => window.__app.classeur.id)
  await opfsEcrire(p, 'symetrie.memc', faireMemc(unClasseur(['S1', 'S2']), { date: Date.now() - 86400e3, pages: 1, nom: 'Symétrie', id: ID_S }))
  await ctrlO(p, 'symetrie.memc')
  const caseCochee = await p.evaluate(() => document.querySelector('dialog[open] .case input')?.checked)
  ok(caseCochee === true, 'A0) « Ouvrir ce classeur ? » : la case « Enregistrer automatiquement les changements dans ce fichier », cochée')
  await viderDemandes(p)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click('dialog[open] [data-a="ajouter"]')])
  await pret(p)
  const d1 = await demandes(p)
  ok(d1.length === 0, 'A1) aucune demande d\'accord avant de partir vers le classeur (elle serait perdue en changeant de page, puis redemandée)', d1)
  const t1 = await toasts(p), e1 = await etat(p)
  const attendu = 'Classeur ajouté à la bibliothèque : « Symétrie » (1 page). Pour qu\'il s\'enregistre tout seul dans « symetrie.memc », le navigateur demande votre accord.'
  ok(e1.cle === 'permission' && t1.some(t => t.startsWith(attendu + 'Autoriser')) && JSON.stringify(e1.action) === '["Autoriser"]',
    `A2) à l'arrivée, en pause, le message le dit : « ${attendu} » [Autoriser]`, { e1, t1 })
  ok(!t1.some(faux), '   … et jamais « Il s\'enregistre automatiquement » tant que le navigateur ne le permet pas', t1)
  ok(e1.court === 'Clé en pause' && e1.bandeau === 'cle-permission', '   … le bouton du classeur : « Clé en pause » ; le bandeau « L\'enregistrement sur la clé attend votre accord. »', e1)
  // [Autoriser] : la demande dans ce clic, avec le conseil
  await reponse(p, 'cette-fois')
  await p.click('.toast.visible button.action:has-text("Autoriser")')
  await p.waitForFunction(() => window.__cle?.etat?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(500)
  const d2 = await demandes(p), t2 = await toasts(p), e2 = await etat(p)
  ok(d2.length === 1 && d2[0].actif && d2[0].ou === '?classeur=' + ID_S && e2.cle === 'ok' && !e2.bandeau,
    'A3) [Autoriser] : UNE demande, dans le clic, sur la page du classeur ; la clé repart, le bandeau s\'en va', { d2, e2 })
  ok(t2.some(t => t.includes('Dans la demande du navigateur, choisissez « Autoriser à chaque visite » s\'il le propose : il ne la refera plus à chaque changement de classeur.'))
    && t2.some(t => t.includes('Le classeur s\'enregistre maintenant tout seul dans « symetrie.memc ».')),
    '   … le conseil « Autoriser à chaque visite » pendant la demande, puis « Le classeur s\'enregistre maintenant tout seul dans « symetrie.memc ». »', t2)
  ok(JSON.stringify(e2.action) === '[]', '   … le bouton [Autoriser] n\'est plus là', e2)
  // Deux traits : ils vont sur la clé tout seuls
  await ecrire(p, 500, 300); await ecrire(p, 500, 360)
  ok(await attendreSurLaCle(p, 'symetrie.memc', 4), 'A4) deux traits : ils arrivent dans « symetrie.memc » tout seuls (4 traits)', await opfsLire(p, 'symetrie.memc'))
  // Un autre classeur, et retour : Chrome a oublié (cette fois) : en pause, et c'est dit
  await allerA(p, premier)
  await viderDemandes(p)
  await allerA(p, ID_S)
  const e3 = await etat(p)
  ok(e3.cle === 'permission' && e3.court === 'Clé en pause' && e3.bandeau === 'cle-permission' && (await demandes(p)).length === 0,
    'A5) un autre classeur, puis retour (accordé « cette fois ») : « Clé en pause », le bandeau, rien de demandé sans un clic', e3)
  // « Reprendre » du bandeau, avec « à chaque visite »
  await reponse(p, 'chaque-visite')
  await p.click('.bandeau-sauvegarde button:has-text("Reprendre")')
  await p.waitForFunction(() => window.__cle?.etat?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  ok((await etat(p)).cle === 'ok', '   … « Reprendre l\'enregistrement sur la clé », « Autoriser à chaque visite » : la clé repart')
  await viderDemandes(p)
  await p.reload(); await pret(p)
  const e4 = await etat(p)
  ok(e4.cle === 'ok' && !e4.bandeau && (await demandes(p)).length === 0, 'A6) « à chaque visite » : rechargé, tout repart seul (aucune demande)', e4)
  await allerA(p, premier); await allerA(p, ID_S)
  const e5 = await etat(p)
  ok(e5.cle === 'ok' && !e5.bandeau && (await demandes(p)).length === 0, '   … un autre classeur, puis retour : tout repart seul', e5)
  await ecrire(p, 500, 420)
  ok(await attendreSurLaCle(p, 'symetrie.memc', 5), '   … et un trait de plus arrive sur la clé', await opfsLire(p, 'symetrie.memc'))
  await ctx.close()
}

// =====================================================================
console.log('\n=== B. Nouveau classeur avec la case de la clé ===')
{
  const ctx = await contexte()
  const p = await ctx.newPage(); suivre(p, 'B')
  await p.goto(DEV); await pret(p)
  await ouvrirBiblio(p)
  await p.click('.biblio-nouveau'); await p.waitForSelector('dialog[open] input[name="nom"]')
  await p.fill('dialog[open] input[name="nom"]', 'Fractions')
  await p.check('dialog[open] .case-cle input')
  await viderDemandes(p)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click('dialog[open] [data-a="creer"]')])
  await pret(p)
  const id = await p.evaluate(() => window.__app.classeur.id)
  const f = await opfsLire(p, 'Fractions.memc'), t = await toasts(p), e = await etat(p)
  ok(f?.entete?.id === id && f.entete.nom === 'Fractions', 'B1) le fichier est écrit avant de partir (l\'accord du choix du fichier vit encore) : il a le classeur', f?.entete)
  const attendu = 'Classeur « Fractions » créé. Pour qu\'il s\'enregistre tout seul dans « Fractions.memc », le navigateur demande votre accord.'
  ok(e.cle === 'permission' && t.some(x => x.startsWith(attendu + 'Autoriser')) && !t.some(faux), `B2) à l'arrivée, en pause : « ${attendu} » [Autoriser], jamais « Il s'enregistre automatiquement »`, { e, t })
  await reponse(p, 'cette-fois')
  await p.click('.toast.visible button.action:has-text("Autoriser")')
  await p.waitForFunction(() => window.__cle?.etat?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  const d = await demandes(p)
  ok((await etat(p)).cle === 'ok' && d.length === 1 && d[0].actif, 'B3) [Autoriser] : une demande, dans le clic ; la clé repart', d)
  await ecrire(p, 500, 300)
  ok(await attendreSurLaCle(p, 'Fractions.memc', 1), '   … un trait arrive dans « Fractions.memc »', await opfsLire(p, 'Fractions.memc'))
  await ctx.close()
}

// =====================================================================
console.log('\n=== C. Remplacer avec la case, l\'accord refusé à l\'arrivée ===')
{
  const ctx = await contexte()
  const p = await ctx.newPage(); suivre(p, 'C')
  await p.goto(DEV); await pret(p)
  await opfsEcrire(p, 'remplace.memc', faireMemc(unClasseur(['R1']), { date: Date.now() - 86400e3, pages: 1, nom: 'Remplacé', id: ID_R }))
  await ctrlO(p, 'remplace.memc')
  await p.click('dialog[open] [data-a="remplacer-ouvert"]')
  await p.waitForSelector('dialog[open] [data-a="remplacer"]'); await p.waitForTimeout(200)
  ok(await p.evaluate(() => document.querySelector('dialog[open] .case-cle input')?.checked) === true, 'C0) la question du lot 1, la case cochée')
  await viderDemandes(p)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click('dialog[open] [data-a="remplacer"]')])
  await pret(p)
  const d1 = await demandes(p), t = await toasts(p), e = await etat(p)
  ok(d1.length === 0, 'C1) aucune demande avant le rechargement', d1)
  const attendu = 'Classeur ouvert : 1 page. Pour qu\'il s\'enregistre tout seul dans « remplace.memc », le navigateur demande votre accord.'
  ok(e.cle === 'permission' && t.some(x => x.startsWith(attendu + 'Autoriser')) && !t.some(faux), `C2) au retour, en pause : « ${attendu} » [Autoriser]`, { e, t })
  await reponse(p, 'refus')
  await p.click('.toast.visible button.action:has-text("Autoriser")')
  await p.waitForTimeout(800)
  const t2 = await toasts(p), e2 = await etat(p)
  ok(e2.cle === 'permission' && e2.court === 'Clé en pause' && t2.some(x => x.includes('Le navigateur n\'a pas permis d\'écrire dans « remplace.memc » : l\'enregistrement sur la clé reste en pause.')),
    'C3) l\'accord refusé : « Le navigateur n\'a pas permis d\'écrire dans « remplace.memc » : l\'enregistrement sur la clé reste en pause. », « Clé en pause »', { e2, t2 })
  await ctx.close()
}

// =====================================================================
console.log('\n=== D. Un fichier déjà autorisé « à chaque visite » ===')
{
  const ctx = await contexte()
  const p = await ctx.newPage(); suivre(p, 'D')
  await p.goto(DEV); await pret(p)
  await p.evaluate(() => localStorage.setItem('__chaqueVisite', JSON.stringify(['visite.memc'])))
  await opfsEcrire(p, 'visite.memc', faireMemc(unClasseur(['V1']), { date: Date.now() - 86400e3, pages: 1, nom: 'Visite', id: ID_D }))
  await ctrlO(p, 'visite.memc')
  await viderDemandes(p)
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click('dialog[open] [data-a="ajouter"]')])
  await pret(p)
  const t = await toasts(p), e = await etat(p)
  ok(e.cle === 'ok' && t.some(x => x.includes('Classeur ajouté à la bibliothèque : « Visite » (1 page). Il s\'enregistre automatiquement dans « visite.memc ».')) && (await demandes(p)).length === 0,
    'D1) l\'accord gardé par le navigateur : « … Il s\'enregistre automatiquement dans « visite.memc ». », aucune demande', { e, t })
  await ctx.close()
}

// =====================================================================
console.log('\n=== E. « Ouvrir celui de la bibliothèque » : le classeur ouvert ici, on reste sur la page ===')
{
  const ctx = await contexte()
  const p = await ctx.newPage(); suivre(p, 'E')
  await p.goto(DEV); await pret(p)
  // Un classeur, son fichier fabriqué depuis sa base, puis rouvert depuis ce classeur
  await opfsEcrire(p, 'ici.memc', faireMemc(unClasseur(['I1']), { date: Date.now() - 86400e3, pages: 1, nom: 'Ici', id: ID_E }))
  await ctrlO(p, 'ici.memc')
  await p.evaluate(() => { document.querySelector('dialog[open] .case input').checked = false })
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click('dialog[open] [data-a="ajouter"]')])
  await pret(p); await toasts(p)
  await ctrlO(p, 'ici.memc')
  const boutonsE = await p.evaluate(() => [...document.querySelectorAll('dialog[open] .actions button')].map(b => b.dataset.a))
  const caseE = await p.evaluate(() => document.querySelector('dialog[open] .case input')?.checked)
  ok(boutonsE.includes('ouvrir-biblio') && caseE === true, 'E0) le fichier du classeur ouvert : [Ouvrir celui de la bibliothèque], la case cochée', boutonsE)
  await viderDemandes(p); await reponse(p, 'cette-fois')
  const url = await p.evaluate(() => location.href)
  await p.click('dialog[open] [data-a="ouvrir-biblio"]')
  await p.waitForFunction(() => window.__cle?.etat?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(600)
  const d = await demandes(p), t = await toasts(p), e = await etat(p)
  ok(await p.evaluate(() => location.href) === url && d.length === 1 && d[0].actif && e.cle === 'ok', 'E1) on reste sur la page : l\'accord est demandé dans le clic (une fois), la clé est en marche', { d, e })
  ok(t.some(x => x.includes('« Ici » est ouvert : il contient déjà tout ce fichier. Il s\'enregistre automatiquement dans « ici.memc ».')), '   … « « Ici » est ouvert : il contient déjà tout ce fichier. Il s\'enregistre automatiquement dans « ici.memc ». »', t)
  await ctx.close()
}

await nav.close()
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
console.log(`\n${echecs ? `ÉCHECS : ${echecs}` : 'tout est vert'}`)
process.exit(echecs ? 1 : 0)
