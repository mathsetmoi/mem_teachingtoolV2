// ESSAI DU CONTRÔLE FINAL DU LOT 4, n° 1, DANS LE VRAI CHROMIUM : un écran
// X (Xvfb, lancé ici), les vraies fenêtres GTK « Ouvrir » et « Enregistrer »
// (remplies au clavier par XTest), les vraies demandes d'accord de Chrome
// (leurs boutons trouvés dans la capture de l'écran), de vrais fichiers sur
// le disque, la version d'un seul fichier (dist/index.html) en file:// avec
// un profil neuf : le poste du lycée remis à zéro, la clé du professeur.
// M. Le matin : Ctrl + O, le classeur d'hier, « Ajouter à la bibliothèque »
//    avec la case : aucune demande de Chrome avant de partir ; à l'arrivée,
//    « … le navigateur demande votre accord » [Autoriser] (jamais « Il
//    s'enregistre automatiquement ») ; le clic, la demande de Chrome
//    (« Allow on every visit », conseillé), puis les traits arrivent seuls
//    dans le fichier de la clé ; un autre classeur et retour : la clé repart
//    seule.
// N. Nouveau classeur avec la case (la vraie fenêtre « Enregistrer ») : le
//    fichier écrit avant de partir ; à l'arrivée, la vérité et [Autoriser] ;
//    « Allow this time » ; un trait arrive dans le fichier.
// K. Menu ⋯ → « Enregistrer automatiquement dans un fichier… » (la vraie
//    fenêtre « Enregistrer ») : un trait arrive seul ; rechargé, « En pause :
//    un clic » et le bandeau (rien de demandé sans un clic) ; « Reprendre
//    l'enregistrement sur la clé », « Allow this time » : le trait en attente
//    arrive ; le lendemain (le navigateur relancé, le même profil) : de même.
//    (Repris de lot4/controle-final/sonde-cle-file.mjs.)
// Il faut dist/index.html à jour (npm run build ; la batterie le fait).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import fs from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import * as Y from 'yjs'
import { attendreLaBulle, ecranX, touches } from './cf/ecran.mjs'

const ICI = `${RACINE_ESSAIS}/lot4/cf/vrai-chrome`
const UN = process.argv[2] || `${RACINE_DEPOT}/dist/index.html`
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const lireMemc = b => {
  const u = Buffer.from(b), fin = u.indexOf(0x0a)
  const d = new Y.Doc({ gc: false }); Y.applyUpdate(d, new Uint8Array(gunzipSync(u.subarray(fin + 1))))
  return { entete: JSON.parse(u.subarray(0, fin).toString()), n: d.getArray('ordre').toArray().reduce((s, id) => s + (d.getMap('pages').get(id)?.get('formes')?.size ?? 0), 0) }
}
function faireMemc(ids, entete) {
  const d = new Y.Doc({ gc: false })
  const p = new Y.Map(); p.set('fond', 'carreaux')
  const f = new Y.Map()
  ids.forEach((id, j) => f.set(id, { id, type: 'trait', x: 300 + 40 * j, y: 500, z: j, auteur: 'hier', pts: [0, 0, 0.5, 30, 10, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }))
  p.set('formes', f); d.getMap('pages').set('p0', p); d.getArray('ordre').push(['p0']); d.getArray('film').push([{ t: Date.now() - 86400e3, page: 'p0' }])
  return Buffer.concat([Buffer.from(JSON.stringify({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', ...entete }) + '\n'), gzipSync(Buffer.from(Y.encodeStateAsUpdate(d)))])
}
/** Les demandes faites au navigateur, notées (sans rien changer à ce qu'il répond) */
const NOTER = () => {
  const H = window.FileSystemHandle?.prototype; if (!H) return
  const note = m => { try { const l = JSON.parse(sessionStorage.getItem('__perm') || '[]'); l.push(m); sessionStorage.setItem('__perm', JSON.stringify(l)) } catch { /* rien */ } }
  const rq = H.requestPermission, qp = H.queryPermission
  H.requestPermission = async function (o) { const r = await rq.call(this, o); note({ quoi: 'request', mode: o?.mode, r, ou: location.search }); return r }
  H.queryPermission = async function (o) { const r = await qp.call(this, o); note({ quoi: 'query', mode: o?.mode, r, ou: location.search }); return r }
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = document.querySelector('.toast'); const x = t && t.classList.contains('visible') ? t.textContent.replace(/[  ]/g, ' ') : ''; if (x && x !== dernier) { dernier = x; window.__toasts.push(x) } }, 15)
}
const pret = async p => { await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(2000) }
const etat = p => p.evaluate(() => ({
  url: location.search,
  court: (document.querySelector('.etat-classeur')?.textContent || '').replace(/[  ]/g, ' '),
  bandeau: (b => b && !b.hidden ? b.dataset.raison : null)(document.querySelector('.bandeau-sauvegarde')),
  actions: [...document.querySelectorAll('.toast.visible button.action')].map(b => b.textContent),
  toasts: window.__toasts.splice(0),
  perm: JSON.parse(sessionStorage.getItem('__perm') || '[]'),
}))
const viderPerm = p => p.evaluate(() => sessionStorage.removeItem('__perm'))
const faux = t => /s'enregistre automatiquement/.test(t)
async function ecrire(p, x0, y0) { await p.mouse.move(x0, y0); await p.mouse.down(); for (let i = 1; i <= 14; i++) await p.mouse.move(x0 + i * 10, y0 + Math.sin(i / 2) * 20); await p.mouse.up(); await p.waitForTimeout(300) }
async function attendreFichier(f, n, max = 50000) { const t0 = Date.now(); while (Date.now() - t0 < max) { try { if (lireMemc(fs.readFileSync(f)).n >= n) return true } catch { /* en cours d'écriture */ } await dort(1000) } return false }
async function lancer(X, profil) {
  const ctx = await chromium.launchPersistentContext(profil, { headless: false, viewport: { width: 1180, height: 700 }, args: ['--no-first-run', '--window-size=1200,820', '--window-position=0,0'], env: { ...process.env, DISPLAY: X.display } })
  await ctx.addInitScript(NOTER)
  const p = ctx.pages()[0] ?? await ctx.newPage()
  p.on('pageerror', e => erreurs.push(e.message))
  return { ctx, p }
}
const erreurs = []
/** Répond aux demandes de Chrome, l'une après l'autre (après un changement de
 *  page, la première, à trois boutons, rend l'accord d'avant : « Allow this
 *  time », « Allow on every visit », « Don't allow » ; si l'on n'avait que lu
 *  le fichier, la seconde, à deux boutons, demande d'y écrire : « Save
 *  changes ») : à trois boutons, celui de rang choix3 ; à deux, le principal.
 *  Rend les demandes vues. */
async function repondre(X, nom, choix3) {
  const vues = []
  for (let i = 0; i < 3; i++) {
    const b = await attendreLaBulle(X.display, `${ICI}/${nom}-${i}.png`, 1)
    if (!b.length) break
    const clairs = b.filter(x => x.genre === 'clair'), fonce = b.find(x => x.genre === 'fonce')
    const c = clairs.length === 3 ? clairs[choix3] : fonce
    vues.push(clairs.length === 3 ? 'trois' : 'deux')
    if (!c) break
    touches(X.display, `clic:${c.x},${c.y}`); await dort(1500)
  }
  return vues
}

if (!fs.existsSync(UN)) { console.log('ÉCHEC : dist/index.html manque (npm run build)'); process.exit(1) }
fs.rmSync(ICI, { recursive: true, force: true }); fs.mkdirSync(ICI + '/cle', { recursive: true })
fs.copyFileSync(UN, ICI + '/cle/index.html')
const URL_ = 'file://' + ICI + '/cle/index.html'
const X = await ecranX(98)
try {
  // ===================================================================
  console.log('\n=== M. Le matin : le classeur d\'hier, ajouté avec la case de la clé ===')
  {
    const FICHIER = ICI + '/cle/Symetrie.memc'
    fs.writeFileSync(FICHIER, faireMemc(['H1', 'H2'], { date: Date.now() - 86400e3, pages: 1, nom: 'Symétrie', id: 'd1d1d1d1d1d1d1d1' }))
    const { ctx, p } = await lancer(X, ICI + '/profil-matin')
    await p.goto(URL_); await pret(p)
    const premier = await p.evaluate(() => location.search)
    await p.keyboard.press('Control+o'); await dort(2500)
    touches(X.display, 'ctrl+l'); await dort(300)
    touches(X.display, 'texte:' + FICHIER, 'Return'); await dort(2500)
    const d = await p.evaluate(() => { const x = document.querySelector('dialog[open]'); return x ? { titre: x.querySelector('h2')?.textContent, coche: x.querySelector('.case input')?.checked } : null })
    ok(d?.titre === 'Ouvrir ce classeur ?' && d.coche === true, 'M0) la vraie fenêtre GTK, puis « Ouvrir ce classeur ? », la case cochée', d)
    await viderPerm(p)
    await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click('dialog[open] [data-a="ajouter"]')])
    await pret(p)
    const e1 = await etat(p)
    ok(!e1.perm.some(x => x.quoi === 'request'), 'M1) aucune demande à Chrome avant de partir vers le classeur', e1.perm)
    ok(e1.perm.some(x => x.quoi === 'query' && x.mode === 'readwrite' && x.r === 'prompt'), '   … à l\'arrivée, Chrome n\'a pas l\'accord (query → prompt), comme dans le vrai', e1.perm)
    const attendu = 'Classeur ajouté à la bibliothèque : « Symétrie » (1 page). Pour qu\'il s\'enregistre tout seul dans « Symetrie.memc », le navigateur demande votre accord.'
    ok(e1.toasts.some(t => t.startsWith(attendu)) && !e1.toasts.some(faux) && JSON.stringify(e1.actions) === '["Autoriser"]' && e1.court === 'En pause : un clic' && e1.bandeau === 'cle-permission',
      `M2) l'arrivée dit la vérité : « ${attendu} » [Autoriser] ; « En pause : un clic », le bandeau`, e1)
    // [Autoriser] : la demande de Chrome (après un changement de page : « Allow on every visit » proposé)
    await viderPerm(p)
    await p.click('.toast.visible button.action:has-text("Autoriser")')
    await dort(600)
    const conseil = await p.evaluate(() => (document.querySelector('.toast.visible')?.textContent || '').replace(/[\u00a0\u202f]/g, ' '))
    ok(conseil.includes('« Autoriser à chaque visite »'), 'M3) [Autoriser] : pendant la demande de Chrome, le conseil « Autoriser à chaque visite »', conseil)
    const vues = await repondre(X, 'm-demande', 1)
    ok(vues[0] === 'trois', '   … la demande de Chrome propose « Allow on every visit » (trois boutons), choisi ; puis « Save changes » ; vues : ' + vues.join(', '), vues)
    await dort(1500)
    const e2 = await etat(p)
    ok(e2.perm.some(x => x.quoi === 'request' && x.r === 'granted') && e2.court !== 'En pause : un clic' && !e2.bandeau && e2.toasts.some(t => t.includes('Le classeur s\'enregistre maintenant tout seul dans « Symetrie.memc ».')),
      'M4) « Allow on every visit » : la clé repart, « Le classeur s\'enregistre maintenant tout seul dans « Symetrie.memc ». »', e2)
    await ecrire(p, 500, 300); await ecrire(p, 500, 360)
    ok(await attendreFichier(FICHIER, 4), 'M5) deux traits : ils arrivent seuls dans le vrai fichier de la clé', (() => { try { return lireMemc(fs.readFileSync(FICHIER)) } catch (e) { return e.message } })())
    // Un autre classeur, puis retour
    await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForTimeout(800)
    const idPremier = new URLSearchParams(premier).get('classeur')
    await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click(`.case-classeur[data-id="${idPremier}"] .carte-classeur`)]); await pret(p)
    await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForTimeout(800)
    await viderPerm(p)
    await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click('.case-classeur[data-id="d1d1d1d1d1d1d1d1"] .carte-classeur')]); await pret(p)
    const e3 = await etat(p)
    ok(e3.court !== 'En pause : un clic' && !e3.bandeau && !e3.perm.some(x => x.quoi === 'request'), 'M6) un autre classeur, puis retour : « à chaque visite », la clé repart seule (aucune demande)', e3)
    await ecrire(p, 500, 420)
    ok(await attendreFichier(FICHIER, 5), '   … et le trait suivant arrive seul sur la clé')
    await ctx.close()
  }

  // ===================================================================
  console.log('\n=== N. Nouveau classeur avec la case de la clé (la vraie fenêtre « Enregistrer ») ===')
  {
    const FICHIER = ICI + '/cle/Fractions.memc'
    const { ctx, p } = await lancer(X, ICI + '/profil-neuf')
    await p.goto(URL_); await pret(p)
    await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForTimeout(800)
    await p.click('.biblio-nouveau'); await p.waitForSelector('dialog[open] input[name="nom"]')
    await p.fill('dialog[open] input[name="nom"]', 'Fractions')
    const coche = await p.evaluate(() => document.querySelector('dialog[open] .case-cle input')?.checked)
    ok(coche === true, 'N0) « Nouveau classeur » en file:// : la case de la clé cochée d\'office')
    await viderPerm(p)
    const charge = p.waitForEvent('load', { timeout: 60000 })
    await p.click('dialog[open] [data-a="creer"]'); await dort(2500)
    touches(X.display, 'ctrl+a', 'texte:' + FICHIER, 'Return')
    await charge; await pret(p)
    const e1 = await etat(p)
    let f = null; try { f = lireMemc(fs.readFileSync(FICHIER)) } catch { /* pas écrit */ }
    ok(f?.entete?.nom === 'Fractions' && e1.url === '?classeur=' + f.entete.id, 'N1) le vrai fichier est écrit avant de partir, avec le classeur', { f: f?.entete, url: e1.url })
    const attendu = 'Classeur « Fractions » créé. Pour qu\'il s\'enregistre tout seul dans « Fractions.memc », le navigateur demande votre accord.'
    ok(e1.toasts.some(t => t.startsWith(attendu)) && !e1.toasts.some(faux) && e1.court === 'En pause : un clic', `N2) à l'arrivée : « ${attendu} » [Autoriser] ; jamais « Il s'enregistre automatiquement »`, e1)
    await p.click('.toast.visible button.action:has-text("Autoriser")')
    // « Allow this time » : le premier des trois, ou le bouton principal d'une demande à deux
    const vues = await repondre(X, 'n-demande', 0)
    ok(vues.length >= 1, 'N3) [Autoriser] : la demande de Chrome ; vues : ' + vues.join(', '), vues)
    await dort(1500)
    const e2 = await etat(p)
    ok(e2.court !== 'En pause : un clic' && !e2.bandeau, '   … accordé : la clé repart', e2)
    await ecrire(p, 500, 300)
    ok(await attendreFichier(FICHIER, 1), 'N4) un trait : il arrive seul dans le vrai fichier')
    await ctx.close()
  }

  // ===================================================================
  console.log('\n=== K. Menu ⋯ : la clé activée, rechargée, le lendemain ===')
  {
    const FICHIER = ICI + '/cle/Mon classeur.memc'
    let { ctx, p } = await lancer(X, ICI + '/profil-menu')
    await p.goto(URL_); await pret(p)
    await ecrire(p, 400, 300)
    await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(300)
    await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="activer-cle"]'); await dort(2500)
    touches(X.display, 'ctrl+a', 'texte:' + FICHIER, 'Return'); await dort(3000)
    let f = null; try { f = lireMemc(fs.readFileSync(FICHIER)) } catch { /* pas écrit */ }
    ok(f?.n === 1, 'K1) la vraie fenêtre « Enregistrer » : le fichier est écrit, avec le trait', f)
    await ecrire(p, 400, 360)
    ok(await attendreFichier(FICHIER, 2), '   … un trait de plus arrive seul dans le fichier')
    await viderPerm(p)
    await p.reload(); await pret(p)
    const e1 = await etat(p)
    ok(e1.court === 'En pause : un clic' && e1.bandeau === 'cle-permission' && !e1.perm.some(x => x.quoi === 'request'), 'K2) rechargé : « En pause : un clic », le bandeau, rien de demandé sans un clic', e1)
    await ecrire(p, 400, 420); await dort(1500)
    await p.click('.bandeau-sauvegarde button:has-text("Reprendre")')
    const vues = await repondre(X, 'k-demande', 0)
    ok(await attendreFichier(FICHIER, 3, 20000), `K3) « Reprendre l'enregistrement », « Allow this time » (vues : ${vues.join(', ')}) : le trait en attente arrive sur la clé`, await etat(p))
    await ctx.close()
    ;({ ctx, p } = await lancer(X, ICI + '/profil-menu'))
    await p.goto(URL_); await pret(p)
    const e2 = await etat(p)
    ok((e2.court === 'En pause : un clic' && e2.bandeau === 'cle-permission') || (!e2.bandeau && /^Enregistr/.test(e2.court) && e2.court !== 'En pause : un clic'), `K4) le lendemain (navigateur relancé) : « ${e2.court} »${e2.bandeau ? ', le bandeau' : ''} (en pause et dit, ou en marche)`, e2)
    await ecrire(p, 400, 480); await dort(1500)
    if (e2.bandeau) { await p.click('.bandeau-sauvegarde button:has-text("Reprendre")'); await repondre(X, 'k-lendemain', 0) }
    ok(await attendreFichier(FICHIER, 4, 30000), '   … le trait du jour arrive sur la clé')
    await ecrire(p, 400, 540)
    ok(await attendreFichier(FICHIER, 5), '   … et les suivants tout seuls')
    await ctx.close()
  }
} finally { X.arreter() }
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
console.log(`\n${echecs ? `ÉCHECS : ${echecs}` : 'tout est vert'}`)
process.exit(echecs ? 1 : 0)
