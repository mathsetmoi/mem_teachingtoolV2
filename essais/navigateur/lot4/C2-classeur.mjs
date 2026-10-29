// ESSAI DU MORCEAU C2-classeur (lot 4) : ce qui suivait le tableau suit le
// classeur ; le .memc d'un classeur fabriqué hors du fil principal, ou depuis
// la mémoire quand la base a un trou.
// A. Le serveur de développement (http://localhost:5173, window.__app,
//    __registre, __ecrivain) : deux classeurs, leurs sessions et leurs dates
//    d'enregistrement ; le .memc au nom du classeur, l'en-tête avec nom et
//    id, Ouvrir le relit ; un « remplace » de B n'arrête pas A ; un
//    « supprime » : le bon texte, un seul avis ; Ctrl + S sur 60 pages sans
//    tâche longue ; le trou ; une base absente ; le menu ⋯ et le PDF.
// (B. La version d'avant et la nouvelle sur la même origine : retirée, voir plus bas.)
// C. La version d'un seul fichier (dist/index.html) en file:// : Ctrl + S
//    télécharge un .memc lisible, fabriqué par le travailleur.
// Il faut avoir construit les deux versions (npm run build, npm run
// build:pages) ; tout.sh le fait.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C2/'
const F = ICI + 'fichiers/'
const SITE = ICI + 'site/'
const DEV = process.env.DEV ?? 'http://localhost:5173/'
const O = 'http://127.0.0.1:4303'
mkdirSync(F, { recursive: true })

let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 900) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const norm = t => (t || '').replace(/[  ]/g, ' ')
const JOUR = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
async function ecrire(p, x0, y0) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= 12; i++) await p.mouse.move(x0 + i * 12, y0 + Math.sin(i / 2) * 20)
  await p.mouse.up(); await p.waitForTimeout(150)
}
/** Les messages successifs de la page (le texte du toast, à chaque changement) */
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = (document.querySelector('.toast')?.textContent || '').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const toasts = p => p.evaluate(() => window.__toasts || [])
const toast = p => p.evaluate(() => document.querySelector('.toast')?.textContent || '').then(norm)
const dialogues = p => p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => ({
  titre: d.querySelector('h2')?.textContent, texte: (d.querySelector('p')?.textContent || '').replace(/[  ]/g, ' '),
  boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent),
})))
const BOUTON_FICHIER = '.barre-haut .bouton.points'
async function menu(p) { await p.click(BOUTON_FICHIER); await p.waitForTimeout(120) }
// (Adapté au lot 5, morceau K9 : « Cet appareil » et ses deux cases, « Contraste renforcé » et « Noms
// sous les outils », entrent volontairement au bout du menu ⋯ ; lot5/K9-affichage.mjs les vérifie, ici on les laisse de côté)
const entreesMenu = p => p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item:not([data-action="contraste"]):not([data-action="noms-outils"]):not([data-action="nouvelle-seance"]):not([data-action="renommer-seance"]):not([data-action="seance-precedente"]):not([data-action="retour-aujourdhui"])')].map(b => ({
  action: b.dataset.action ?? null, libelle: b.querySelector('.libelle')?.firstChild?.textContent ?? '', aide: b.querySelector('.libelle small')?.textContent ?? '', touche: b.querySelector('.touche')?.textContent ?? '',
})))
// (Adapté au lot 4, morceau C3 : la note du bas du menu est passée dans le
// bloc de l'état, en tête du menu, à la ligne du fichier, sans point final ;
// « Jamais enregistré dans un fichier », sans « ce classeur n'existe que dans
// ce navigateur », que la clé ou le Drive rendraient faux)
const noteMenu = p => p.evaluate(() => document.querySelector('.menu-flottant:not([hidden]) .bloc-lignes [data-ligne="fichier"] .texte-ligne')?.textContent || '').then(norm)

/** Ctrl + S, le fichier téléchargé (sans showSaveFilePicker) */
async function enregistrer(p, timeout = 60000) {
  await p.evaluate(() => { window.showSaveFilePicker = undefined })
  const dl = p.waitForEvent('download', { timeout })
  await p.keyboard.press('Control+s')
  const d = await dl
  const chemin = F + d.suggestedFilename()
  await d.saveAs(chemin)
  return { nom: d.suggestedFilename(), chemin, octets: readFileSync(chemin) }
}
/** Un .memc lu sous Node : l'en-tête, puis le document (gunzip, Yjs) */
function lireMemc(o) {
  const fin = o.indexOf(0x0a)
  const ligne = o.subarray(0, fin).toString('utf8')
  const entete = JSON.parse(ligne)
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  const ordre = d.getArray('ordre').toArray()
  const formes = ordre.map(id => d.getMap('pages').get(id)?.get('formes')?.size ?? -1)
  return { ligne, entete, ordre, formes, film: d.getArray('film').length, entier: !d.store.pendingStructs && !d.store.pendingDs }
}
/** Ouvrir un classeur… (le menu ⋯, par data-action), le fichier choisi : la fenêtre de confirmation */
async function choisirFichier(p, chemin) {
  const fc = p.waitForEvent('filechooser', { timeout: 5000 })
  await menu(p)
  await p.click('.menu-flottant:not([hidden]) [data-action="ouvrir"]')
  await (await fc).setFiles(chemin)
  await p.waitForSelector('dialog[open] h2', { timeout: 10000 })
}
async function remplacer(p) {
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog[open] [data-a="remplacer"]')])
  await pret(p); await p.waitForTimeout(500)
}

// =====================================================================
// A. LE SERVEUR DE DÉVELOPPEMENT
// =====================================================================
console.log('=== A. serveur de développement ===')
// Une locale UTF-8 : sans elle (LANG vide, comme ici), Chromium sous Linux
// remplace par « download » un nom de fichier accentué (mesuré : « é.txt »
// devient « download ») ; les postes des professeurs l'ont toujours
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
// Lot 4 (C4) : « Ouvrir un classeur » (Ctrl + O) passe par showOpenFilePicker
// quand il existe, que Chromium sans fenêtre refuse (AbortError, même quand
// Playwright attend le choix de fichier) : cet essai ouvre ses fichiers par
// le choix de fichier d'avant, celui de Firefox, Safari et l'iPad
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { window.showOpenFilePicker = undefined }); return c } }
// Lot 4 (C9) : « Ouvrir un classeur » AJOUTE d'abord le classeur d'un fichier à la bibliothèque
// (une première fenêtre : [Annuler] [Remplacer « … »…] [Ajouter à la bibliothèque]). Ces essais
// remplacent celui qui est ouvert : on y choisit « Remplacer « … »… », et la question du lot 1,
// celle qu'ils vérifient, suit (adaptation de C9 : un comportement changé volontairement)
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { new MutationObserver(() => { const b = document.querySelector('dialog[open] [data-a="remplacer-ouvert"]'); if (b) b.click() }).observe(document, { childList: true, subtree: true }) }); return c } }
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
await ctx.addInitScript(ECOUTER_TOASTS)
async function ouvrirDev(chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(700)
  return p
}
/** Crée un classeur par creerClasseur et creerBase(etatNeuf) (comme C1) */
const creer = (p, nom, fond = 'seyes') => p.evaluate(async ({ nom, fond }) => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const id = dem.idClasseur()
  const fiche = { id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: Date.now(), modifie: Date.now(), ouvert: 0, pages: 1 }
  return window.__registre.creerClasseur(fiche, async base => bases.creerBase(base, await neuf.etatNeuf(fond), { id, nom }))
}, { nom, fond })
const cles = p => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => /^mem-(session|dernier-enregistrement)/.test(k)).map(k => [k, localStorage.getItem(k)])))

const P1 = await ouvrirDev('', 'premier')
await P1.waitForFunction(() => document.title.startsWith('Premier classeur'), null, { timeout: 5000 }).catch(() => {})
const premier = await P1.evaluate(() => ({ id: window.__app.classeur.id, base: window.__app.classeur.base, nom: window.__app.classeur.nom }))
ok(premier.base === 'mem-tableau-local' && premier.nom === 'Premier classeur', `0) le premier classeur : « ${premier.nom} », base ${premier.base}`)
await ecrire(P1, 300, 250); await ecrire(P1, 300, 330)
const B = await creer(P1, 'Symétrie centrale')
const C = await creer(P1, 'Fractions : a/b', 'carreaux')

// 1) Le menu ⋯ : trois entrées, par data-action, leurs libellés et leurs aides
const PB = await ouvrirDev('?classeur=' + B.id, 'B')
await menu(PB)
const m = await entreesMenu(PB)
const note0 = await noteMenu(PB)
await PB.keyboard.press('Escape')
// Lot 4 (C4) : Chromium a showSaveFilePicker ; l'entrée « Enregistrer
// automatiquement dans un fichier… » (activer-cle) suit « Enregistrer le classeur… »
// (Adapté au lot 4, morceau C5 : « Bibliothèque des classeurs… » en tête,
// retirée ici pour garder les rangs d'avant)
ok(m[0]?.action === 'bibliotheque' && m[0].libelle === 'Bibliothèque des classeurs…', '1) le menu ⋯ commence par « Bibliothèque des classeurs… » (C5)', m[0])
m.shift()
// (Adapté au lot 18 : le menu ⋯ réduit : Enregistrer le classeur… · Enregistrer automatiquement dans un fichier… ·
// Exporter le classeur en PDF… · Autres sauvegardes… · Ouvrir un classeur… ; « Copie sur le Drive… » et
// « Enregistrer sur le Drive ou ailleurs… » sont dans « Autres sauvegardes… » ; l'aide ne parle plus de « la clé »)
ok(JSON.stringify(m.map(x => x.action)) === '["enregistrer","activer-cle","exporter-pdf","autres-sauvegardes","ouvrir"]'
  && m[0].libelle === 'Enregistrer le classeur…' && m[0].touche === 'Ctrl + S'
  && m[0].aide === 'Un fichier .memc avec toutes les pages et tout l\'historique, à garder ou à ouvrir ailleurs. Il garde aussi ce qui a été effacé : ne le donnez pas aux élèves (pour eux : Publier).'
  && m[4].libelle === 'Ouvrir un classeur…' && m[4].touche === 'Ctrl + O' && m[4].aide === 'Ajoute un classeur enregistré (.memc) à la bibliothèque, ou remplace celui-ci. Reprend aussi un ancien tableau (.prof).'
  && m[2].libelle === 'Exporter le classeur en PDF…' && !m[2].touche && m[3].libelle === 'Autres sauvegardes…',
  '1) le menu ⋯ : Enregistrer le classeur… · Exporter le classeur en PDF… · Autres sauvegardes… · Ouvrir un classeur… (data-action enregistrer, exporter-pdf, autres-sauvegardes, ouvrir)', m)
ok(note0 === 'Jamais enregistré dans un fichier', `   … sa note, jamais enregistré : « ${note0} »`)

// 2) Ctrl + S dans B : le fichier au nom du classeur, l'en-tête avec nom et id
for (let i = 0; i < 3; i++) await ecrire(PB, 350, 220 + i * 70)
await PB.waitForTimeout(400)
const tB0 = Date.now()
const fB = await enregistrer(PB)
const lB = lireMemc(fB.octets)
const msgB = await toasts(PB)
ok(new RegExp(`^Symétrie centrale ${JOUR} \\d\\dh\\d\\d\\.memc$`).test(fB.nom), `2) Ctrl + S dans B : « ${fB.nom} »`)
ok(lB.entete.nom === 'Symétrie centrale' && lB.entete.id === B.id && lB.ligne.startsWith('{"format":"mem-tableau","v":1,"app":"MEM teachingtool","date":')
  && /"pages":1,"nom":"Symétrie centrale","id":"[0-9a-f]{16}"\}$/.test(lB.ligne) && lB.entete.date >= tB0 - 1000,
  `   … l'en-tête : format en tête, puis nom et id à la fin : ${lB.ligne}`)
ok(lB.entier && JSON.stringify(lB.formes) === '[3]', `   … le document entier : ${JSON.stringify(lB.formes)} formes`, lB)
ok(msgB.includes('Enregistrement du classeur…') && msgB.some(t => new RegExp(`^Classeur enregistré : ${fB.nom.replace(/[.()]/g, '\\$&')} \\(\\d+ Ko\\)\\.$`).test(t)) && !msgB.some(t => /mémoire/.test(t)),
  '   … les messages : « Enregistrement du classeur… », puis « Classeur enregistré : … (N Ko). » (pas depuis la mémoire)', msgB)
const cB = await cles(PB)
ok(Number(cB['mem-dernier-enregistrement:' + B.id]) >= tB0 - 1000 && !('mem-dernier-enregistrement' in cB),
  '   … la date du dernier enregistrement de B (mem-dernier-enregistrement:<id>), pas celle du premier', cB)
await menu(PB)
const noteB = await noteMenu(PB)
await PB.keyboard.press('Escape')
ok(/^Dernier enregistrement dans un fichier : aujourd'hui à \d+ h \d\d$/.test(noteB), `   … la note du menu dans B : « ${noteB} »`)
// Le premier n'est toujours pas enregistré
await P1.reload(); await pret(P1); await P1.waitForTimeout(500)
await menu(P1)
const note1 = await noteMenu(P1)
await P1.keyboard.press('Escape')
ok(note1 === 'Jamais enregistré dans un fichier', `   … et dans le premier : « ${note1} »`)
const f1 = await enregistrer(P1)
const l1 = lireMemc(f1.octets)
const c1 = await cles(P1)
ok(new RegExp(`^Premier classeur ${JOUR} \\d\\dh\\d\\d\\.memc$`).test(f1.nom) && l1.entete.nom === 'Premier classeur' && l1.entete.id === premier.id && JSON.stringify(l1.formes) === '[2]'
  && Number(c1['mem-dernier-enregistrement']) > 0 && c1['mem-dernier-enregistrement'] !== c1['mem-dernier-enregistrement:' + B.id],
  `   … Ctrl + S dans le premier : « ${f1.nom} », sa date sous mem-dernier-enregistrement (la clé d'avant)`, { c1, entete: l1.entete })

// 3) Les sessions : chacun la sienne
const pageB = await PB.evaluate(() => window.__app.page)
const page1 = await P1.evaluate(() => window.__app.page)
await PB.goto('about:blank'); await P1.goto('about:blank'); await dort(300)
const P0 = await ouvrirDev('?classeur=' + C.id, 'C')
const sess = await P0.evaluate(() => ({ un: localStorage.getItem('mem-session'), tous: Object.keys(localStorage).filter(k => k.startsWith('mem-session')) }))
const sB = await P0.evaluate(id => localStorage.getItem('mem-session:' + id), B.id)
ok(JSON.parse(sess.un || '{}').page === page1 && JSON.parse(sB || '{}').page === pageB && sess.tous.includes('mem-session') && sess.tous.includes('mem-session:' + B.id),
  `3) deux classeurs, deux sessions : mem-session (le premier) et mem-session:<id> (B), chacune avec sa page`, sess)
await P0.close()

// 4) Ouvrir relit le fichier : dans C, Ouvrir le fichier de B, Remplacer
const PC = await ouvrirDev('?classeur=' + C.id, 'C')
const PC2 = await ouvrirDev('?classeur=' + C.id, 'C2')
const PA = await ouvrirDev('?classeur=' + premier.id, 'premier-2')
const PB2 = await ouvrirDev('?classeur=' + B.id, 'B2')
// Les messages des deux canaux, vus du premier
await PA.evaluate(() => {
  window.__canaux = []
  for (const n of ['mem-tableau', 'mem-teachingtool-classeur']) { const c = new BroadcastChannel(n); c.onmessage = e => window.__canaux.push([n, e.data]) }
})
// C9 : le fichier d'un classeur de la bibliothèque (B) y est reconnu et ne
// remplace plus celui qui est ouvert ; B dans la corbeille, son id reste pris, et
// l'on peut remplacer C (« Remplacer « Fractions : a/b »… », puis la question du lot 1)
await PC.evaluate(id => window.__registre.modifierClasseur(id, x => { x.corbeille = { t: Date.now() } }), B.id)
await choisirFichier(PC, fB.chemin)
await PC.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 })
const dC = (await dialogues(PC))[0]
ok(dC?.titre === 'Ouvrir ce classeur ?' && new RegExp(`^« ${fB.nom.replace(/[.()]/g, '\\$&')} » : 1 page, enregistré le \\S+ \\d+(er)? \\S+ \\d{4} à \\d+ h \\d\\d\\. Il remplace le classeur « Fractions : a/b » de ce navigateur \\(1 page\\) et tout son historique\\. Pour garder celui-ci, enregistrez-le d'abord\\.$`).test(dC.texte)
  && JSON.stringify(dC.boutons) === '["Annuler","Enregistrer d\'abord","Remplacer"]',
  '4) Ouvrir un classeur… dans C : « Ouvrir ce classeur ? », ce qu\'il remplace (le nom du classeur ouvert)', dC)
await remplacer(PC)
await PC.evaluate(id => window.__registre.modifierClasseur(id, x => { delete x.corbeille }), B.id)
const apres = await PC.evaluate(() => ({ formes: window.__app.formes.length, titre: document.title, nom: window.__app.classeur.nom, base: window.__app.classeur.base, id: window.__app.classeur.id }))
const msgC = await toasts(PC)
ok(apres.formes === 3 && apres.base === C.base && apres.nom === 'Fractions : a/b' && msgC.includes('Classeur ouvert : 1 page.'),
  `   … après Remplacer : le contenu du fichier (${apres.formes} formes) dans la base de C, « Classeur ouvert : 1 page. »`, { apres, msgC })
const cC = await cles(PC)
// Lot 4 (C4) : « Remplacer » donne au classeur l'identité du fichier ; celui
// de B a l'id de B, déjà pris : C prend une identité neuve (sa base, son nom
// ne changent pas)
ok(apres.id !== C.id && apres.id !== B.id && /^[0-9a-f]{16}$/.test(apres.id), `   … C prend une identité neuve (${apres.id}) : le fichier est celui de B, dont l'id est pris`, { apres, C: C.id, B: B.id })
ok(Number(cC['mem-dernier-enregistrement:' + apres.id]) === lB.entete.date, '   … C est dans un fichier depuis la date de celui-ci (mem-dernier-enregistrement:<id de C>)', cC)
// 5) Le « remplace » de C n'arrête ni le premier, ni B ; l'autre onglet de C l'apprend
await dort(500)
const dC2 = await dialogues(PC2), dA = await dialogues(PA), dB2 = await dialogues(PB2)
ok(dC2.length === 1 && dC2[0].titre === 'Le classeur a changé'
  && dC2[0].texte === 'Le classeur « Fractions : a/b » a été remplacé dans un autre onglet. Rechargez cette page pour le voir : ce qui serait écrit ici ne serait plus enregistré.'
  && JSON.stringify(dC2[0].boutons) === '["Recharger"]',
  '5) l\'autre onglet de C : « Le classeur a changé », son texte, Recharger', dC2)
ok(dA.length === 0 && dB2.length === 0, '   … le premier et B ne sont pas arrêtés (aucune fenêtre)', { dA, dB2 })
const canaux = await PA.evaluate(() => window.__canaux)
ok(canaux.length === 1 && canaux[0][0] === 'mem-teachingtool-classeur' && canaux[0][1].type === 'remplace' && canaux[0][1].base === C.base && canaux[0][1].id === apres.id,
  '   … un seul message, sur mem-teachingtool-classeur ({ type, base, id }) ; rien sur mem-tableau (C n\'est pas le premier)', canaux)
const nA0 = await PA.evaluate(() => window.__app.formes.length)
await ecrire(PA, 500, 400); await PA.waitForTimeout(600)
await PA.reload(); await pret(PA); await PA.waitForTimeout(400)
ok((await PA.evaluate(() => window.__app.formes.length)) === nA0 + 1, '   … le premier écrit encore, et ce qu\'il écrit s\'enregistre')
// Recharger dans l'autre onglet de C : il retrouve le contenu du fichier
await Promise.all([PC2.waitForNavigation(), PC2.click('dialog[open] .actions button')])
await pret(PC2); await PC2.waitForTimeout(300)
ok((await PC2.evaluate(() => window.__app.formes.length)) === 3 && PC2.url().includes('classeur=' + apres.id), '   … Recharger : l\'autre onglet de C voit le contenu du fichier (sous sa nouvelle identité)')

// 6) « supprime » : le bon texte, un seul avis (le message, puis la base effacée)
await PA.evaluate(async b => {
  new BroadcastChannel('mem-teachingtool-classeur').postMessage({ type: 'supprime', base: b })
  await new Promise(r => setTimeout(r, 200))
  await new Promise(r => { const d = indexedDB.deleteDatabase(b); d.onsuccess = r; d.onerror = r; d.onblocked = () => {} })
}, B.base)
await dort(600)
const dS = await dialogues(PB2)
ok(dS.length === 1 && dS[0].titre === 'Le classeur a été supprimé'
  && dS[0].texte === 'Le classeur « Symétrie centrale » a été supprimé définitivement dans un autre onglet : ce qui serait écrit ici ne serait plus enregistré.'
  && JSON.stringify(dS[0].boutons) === '["Ouvrir la bibliothèque"]',
  '6) « supprime » : « Le classeur a été supprimé », son texte, Ouvrir la bibliothèque, un seul avis (le message, puis la base effacée)', dS)
ok(!(await PA.evaluate(() => indexedDB.databases())).some(d => d.name === B.base), '   … la base de B est partie, et personne ne l\'a recréée')
// (Adapté au lot 4, morceau C5 : la bibliothèque existe ; « Ouvrir la
// bibliothèque » mène à la bibliothèque seule, et non plus, comme le
// provisoire de C1, à un autre classeur)
await Promise.all([PB2.waitForNavigation(), PB2.click('dialog[open] .actions button')])
await PB2.waitForFunction(() => window.__bibliotheque && !document.querySelector('.bibliotheque').hidden, null, { timeout: 30000 })
ok(/\?bibliotheque$/.test(PB2.url()) && !(await PB2.evaluate(() => !!window.__app)),
  `   … Ouvrir la bibliothèque : on arrive sur la bibliothèque seule (${new URL(PB2.url()).search})`)
// Sur le canal d'avant, raison 'supprime' (ce que dira la corbeille pour le
// premier), envoyé depuis C (qui n'écoute pas ce canal)
const PA2 = await ouvrirDev('?classeur=' + premier.id, 'premier-3')
await PC.evaluate(() => new BroadcastChannel('mem-tableau').postMessage({ type: 'remplace', raison: 'supprime' }))
await dort(400)
const dS2 = await dialogues(PA2)
ok(dS2.length === 1 && dS2[0].titre === 'Le classeur a été supprimé' && dS2[0].texte.startsWith('Le classeur « Premier classeur » a été supprimé définitivement'),
  '   … sur mem-tableau, { type: \'remplace\', raison: \'supprime\' } : le premier dit « supprimé » (C, qui n\'est pas le premier, n\'écoute pas ce canal)', dS2)
ok((await dialogues(PC)).length === 0 && (await dialogues(PC2)).length === 0, '   … C n\'en sait rien')
// Un message pour une autre base : ignoré (même par l'onglet qui l'envoie)
await PC.evaluate(() => new BroadcastChannel('mem-teachingtool-classeur').postMessage({ type: 'remplace', base: 'mem-teachingtool-classeur-ffffffffffffffff' }))
await dort(300)
ok((await dialogues(PC)).length === 0 && (await dialogues(PC2)).length === 0, '   … un message pour une autre base : ignoré')
for (const p of [PA, PA2, PB2, PC2]) await p.close()

// 7) Une base absente (demande de développement) : 'absente', et la base n'est pas créée ; une base trouée : 'abimee'
const absente = await PC.evaluate(async () => {
  const e = window.__ecrivain
  const nom = 'mem-teachingtool-classeur-ffffffffffffffff'
  let r
  try { await e.fabriquerFichier(nom, { nom: 'x' }); r = 'FABRIQUÉ' } catch (x) { r = { nom: x.name, raison: x.raison, message: x.message } }
  return { r, mode: e.mode, cree: (await indexedDB.databases()).some(d => d.name === nom) }
})
ok(absente.r?.raison === 'absente' && absente.r.nom === 'ErreurEcrivain' && !absente.cree && absente.mode === 'travailleur',
  `7) une base absente : erreur « ${absente.r?.raison} », la base n'est pas créée, l'écrivain est un travailleur (${absente.mode})`, absente)

// 8) Le trou (comme C1) : Ctrl + S écrit depuis la mémoire, et le fichier a les 3 formes
const E = await creer(PC, 'Trouée', 'blanc')
const PE = await ouvrirDev('?classeur=' + E.id, 'trou')
const trou = await PE.evaluate(async () => {
  const a = window.__app, t = a.tableau, page = a.page
  const pause = ms => new Promise(r => setTimeout(r, ms))
  const trait = x => ({ id: 'f' + x + Math.random().toString(16).slice(2, 6), type: 'trait', x: x * 50, y: 100, z: x, auteur: t.moi, pts: [0, 0, 0.5, 30, 20, 0.5, 60, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  const add = IDBObjectStore.prototype.add
  let refus = 0
  t.pageVue = page
  t.poser(page, trait(1)); await pause(300)
  IDBObjectStore.prototype.add = function (...x) { const r = add.apply(this, x); if (this.name === 'updates' && refus === 0) { refus++; const tr = this.transaction; queueMicrotask(() => { try { tr.abort() } catch { /* finie */ } }) } return r }
  t.poser(page, trait(2))
  IDBObjectStore.prototype.add = add
  await pause(300)
  t.poser(page, trait(3)); await pause(300)
  return { trou: t.trou, enMemoire: t.formesDe(page).size }
})
ok(trou.trou && trou.enMemoire === 3, `8) un trou simulé : trou ${trou.trou}, ${trou.enMemoire} formes en mémoire`, trou)
// L'écrivain refuse cette base (elle ne fait pas un document entier)
const abimee = await PE.evaluate(async () => { try { await window.__ecrivain.fabriquerFichier(window.__app.tableau.base, { nom: 'x' }); return 'FABRIQUÉ' } catch (x) { return x.raison } })
ok(abimee === 'abimee', `   … l'écrivain refuse la base trouée : « ${abimee} »`)
await PE.evaluate(() => { window.__toasts = [] })
const fE = await enregistrer(PE)
const msgE = await toasts(PE)
const luE = await PE.evaluate(async b64 => {
  const fichier = await import('/src/fichier.ts')
  const Y = await import(performance.getEntriesByType('resource').map(e => e.name).find(n => /\/deps\/yjs\.js/.test(n)))
  const o = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const lu = fichier.lireTableau(o)
  const d = new Y.Doc({ gc: false }); Y.applyUpdate(d, lu.etat)
  return { pages: lu.pages, entete: lu.entete, formes: d.getMap('pages').get(d.getArray('ordre').get(0)).get('formes').size }
}, fE.octets.toString('base64'))
ok(luE.formes === 3 && luE.pages === 1 && luE.entete.nom === 'Trouée' && luE.entete.id === E.id,
  `   … Ctrl + S : un .memc où lireTableau trouve les ${luE.formes} formes (« ${fE.nom} »)`, luE)
ok(msgE.includes('Enregistrement depuis la mémoire de cet onglet…') && msgE.some(t => /^Classeur enregistré : Trouée /.test(t)),
  '   … le message le dit : « Enregistrement depuis la mémoire de cet onglet… », puis « Classeur enregistré : … »', msgE)
await PE.close()

// 9) Le PDF de tout le classeur : son nom, son titre ; « Tout le classeur : N pages »
await menu(PC)
await PC.click('.menu-flottant:not([hidden]) [data-action="exporter-pdf"]')
await PC.waitForSelector('dialog[open].dialogue-pdf')
const seul = norm(await PC.evaluate(() => document.querySelector('dialog[open] .pdf-seul')?.textContent))
const dlP = PC.waitForEvent('download', { timeout: 30000 })
await PC.click('dialog[open] [data-a="exporter"]')
const pdf = await dlP
const pdfChemin = F + 'classeur.pdf'
await pdf.saveAs(pdfChemin)
// Le titre du PDF, en UTF-16 (FEFF…) dans le dictionnaire Info
const hex = (/\/Title\s*<([0-9A-Fa-f]+)>/.exec(readFileSync(pdfChemin).toString('latin1')) || [])[1] || ''
const titrePdf = Buffer.from(hex.replace(/^FEFF/i, ''), 'hex').swap16().toString('utf16le')
ok(seul === 'Tout le classeur : 1 page' && pdf.suggestedFilename() === `Fractions - a-b ${JOUR}.pdf` && /^Fractions : a\/b · \d+(er)? \S+ \d{4}$/.test(titrePdf),
  `9) Exporter le classeur en PDF… : « ${seul} », « ${pdf.suggestedFilename()} », titre « ${titrePdf} »`, { seul: [seul === 'Tout le classeur : 1 page', seul], nom: [pdf.suggestedFilename() === `Fractions - a-b ${JOUR}.pdf`, pdf.suggestedFilename()], titre: [/^Fractions : a\/b · \d+(er)? \S+ \d{4}$/.test(titrePdf), titrePdf] })
await PC.waitForTimeout(300)

// 10) Ctrl + S sur 60 pages de 300 traits (posées par __app.tableau.poser, puis rechargement) : aucune tâche longue
const D = await creer(PC, 'Soixante pages', 'carreaux')
const PD = await ouvrirDev('?classeur=' + D.id, 'soixante')
const t0 = Date.now()
await PD.evaluate(async () => {
  const t = window.__app.tableau
  const attendre = ms => new Promise(r => setTimeout(r, ms))
  const trait = (x, y) => { const pts = []; for (let i = 0; i < 60; i++) pts.push(i * 6 + Math.random(), Math.sin(i / 3) * 30 + Math.random(), 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false } }
  let page = t.ordre.get(0)
  for (let k = 0; k < 60; k++) {
    if (k) page = t.ajouterPage('carreaux', k)
    t.pageVue = page
    // Une transaction par page (une étape du film, une écriture dans la base) : sinon 18 000
    t.doc.transact(() => { for (let i = 0; i < 300; i++) t.poser(page, trait((i % 20) * 40, Math.floor(i / 20) * 40)) })
    await attendre(0)
  }
  await t.attendreEcritures()
  await attendre(3000)
  await t.attendreEcritures()
})
console.log(`   (60 pages posées en ${Math.round((Date.now() - t0) / 1000)} s)`)
await PD.reload(); await pret(PD); await PD.waitForTimeout(4000)
const rangD = norm(await PD.textContent('.rang'))
await PD.evaluate(() => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ debut: Math.round(e.startTime), duree: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: false })
})
// Le témoin : une tâche de 150 ms se voit
await PD.evaluate(() => { setTimeout(() => { const t = performance.now(); while (performance.now() - t < 150) { /* occupé */ } }, 0) })
await PD.waitForTimeout(400)
const temoin = await PD.evaluate(() => window.__longues.splice(0))
const debutS = await PD.evaluate(() => performance.now())
const t1 = Date.now()
const fD = await enregistrer(PD, 120000)
const dureeS = Date.now() - t1
await PD.waitForTimeout(300)
const longues = (await PD.evaluate(() => window.__longues)).filter(e => e.debut >= debutS)
const lD = lireMemc(fD.octets)
const msgD = await toasts(PD)
ok(temoin.some(e => e.duree >= 140), '10) le témoin : l\'observateur des tâches longues voit une tâche de 150 ms', temoin)
ok(lD.entete.pages === 60 && lD.ordre.length === 60 && lD.formes.every(n => n === 300) && lD.entier && !msgD.some(t => /mémoire/.test(t)),
  `   … Ctrl + S sur 60 pages de 300 traits (${rangD}) : le fichier a les 60 pages et leurs 18 000 traits (${(fD.octets.length / 1048576).toFixed(1)} Mo, ${dureeS} ms)`, { entete: lD.entete })
ok(!longues.some(e => e.duree > 100), `   … pendant l'enregistrement, aucune tâche de plus de 100 ms (la plus longue : ${Math.max(0, ...longues.map(e => e.duree))} ms, ${longues.length} au-delà de 50 ms)`, longues)
await PD.close()
await PC.close()
await ctx.close()

// 10 bis) Sans travailleur : Worker absent, ou un travailleur qui tombe avant
// d'avoir démarré : le même code sur le fil principal (mode 'fil'), et
// Ctrl + S marche quand même
for (const [quoi, init] of [
  ['Worker absent', () => { delete window.Worker; window.Worker = undefined }],
  ['un travailleur qui tombe au démarrage', () => {
    window.Worker = class { constructor() { setTimeout(() => this.onerror?.({ preventDefault() {} }), 30) } postMessage() {} terminate() {} addEventListener() {} }
  }],
]) {
  const cx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  await cx.addInitScript(init)
  await cx.addInitScript(ECOUTER_TOASTS)
  const q = await cx.newPage(); suivre(q, 'sans-travailleur')
  await q.goto(DEV); await pret(q); await q.waitForTimeout(700)
  await ecrire(q, 300, 250); await q.waitForTimeout(300)
  const f = await enregistrer(q)
  const l = lireMemc(f.octets)
  const mode = await q.evaluate(() => window.__ecrivain.mode)
  const msg = await toasts(q)
  ok(mode === 'fil' && JSON.stringify(l.formes) === '[1]' && l.entier && !msg.some(t => /mémoire/.test(t)) && msg.some(t => /^Classeur enregistré : /.test(t)),
    `10 bis) ${quoi} : l'écrivain passe sur le fil principal (mode « ${mode} »), Ctrl + S écrit le fichier depuis la base (${JSON.stringify(l.formes)} forme)`, { mode, msg })
  await cx.close()
}

// (B. La version d'avant et la nouvelle sur la même origine : retirée en rangeant
// la batterie dans le dépôt ; la version d'avant se construisait depuis un commit
// qui n'existe plus.)


// =====================================================================
// C. LA VERSION D'UN SEUL FICHIER, EN file://
// =====================================================================
console.log('\n=== C. la version d\'un seul fichier (file://) ===')
const ctxC = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
await ctxC.addInitScript(ECOUTER_TOASTS)
// Les travailleurs créés par la page, et ce qu'ils disent en premier
await ctxC.addInitScript(() => {
  const W = window.Worker
  window.__travailleurs = []
  window.Worker = class extends W {
    constructor(...a) {
      super(...a)
      const t = { url: String(a[0]).slice(0, 5), pret: false }
      window.__travailleurs.push(t)
      this.addEventListener('message', e => { if (e.data?.pret) t.pret = true })
    }
  }
})
const PF = await ctxC.newPage(); suivre(PF, 'file')
await PF.goto('file://' + R + '/dist/index.html'); await pret(PF); await PF.waitForTimeout(700)
await ecrire(PF, 300, 250); await ecrire(PF, 300, 330)
await PF.waitForTimeout(400)
const fF = await enregistrer(PF)
const lF = lireMemc(fF.octets)
const travF = await PF.evaluate(() => window.__travailleurs)
const msgF = await toasts(PF)
ok(new RegExp(`^Premier classeur ${JOUR} \\d\\dh\\d\\d\\.memc$`).test(fF.nom) && JSON.stringify(lF.formes) === '[2]' && lF.entier && lF.entete.nom === 'Premier classeur' && /^[0-9a-f]{16}$/.test(lF.entete.id),
  `14) file:// : Ctrl + S télécharge « ${fF.nom} », lisible (${JSON.stringify(lF.formes)} formes, en-tête avec nom et id)`, lF.entete)
ok(travF.length === 1 && travF[0].pret && travF[0].url === 'blob:' && !msgF.some(t => /mémoire/.test(t)),
  '   … fabriqué par le travailleur intégré (blob:), qui a démarré dans la version clé', { travF, msgF })
await ctxC.close()
await nav.close()

const voulues = /^trou: (refusé|.*The transaction (has finished|was aborted)|.*AbortError)/
const vraies = erreurs.filter(e => !voulues.test(e))
ok(vraies.length === 0, `aucune erreur JS (${erreurs.length - vraies.length} voulues par l'essai du trou)`, vraies)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
