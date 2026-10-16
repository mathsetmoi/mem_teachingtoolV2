// Essais au navigateur du morceau B12 du lot 1 : enregistrer le tableau
// dans un fichier .memc, en ouvrir un, le refus des mauvais fichiers, les
// raccourcis, deux onglets, le lecteur des élèves, la version d'un seul
// fichier (file://) comme passerelle.
// Serveur de développement sur :5173 ; « npm run build » fait avant (dist/).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot1/shotsB12`
const F = D + '/fichiers'
mkdirSync(F, { recursive: true })
const UN_FICHIER = `file://${RACINE_DEPOT}/dist/index.html`
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !(/Failed to load resource/.test(m.text()) && !/localhost/.test(m.location().url))) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()
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
const dort = ms => new Promise(r => setTimeout(r, ms))
const nbsp = t => (t || '').replace(/ /g, ' ')

let premiere = true
async function ouvrir(ctx, nom, url = URL0) {
  const page = await ctx.newPage(); surveiller(page, nom)
  await page.goto(url)
  await page.waitForFunction(() => window.__app ? !!window.__app.page : document.querySelector('.rang')?.textContent?.includes('/'))
  if (premiere && url === URL0) { premiere = false; await page.waitForTimeout(1500) }
  await page.waitForTimeout(150)
  return page
}
// La version d'un seul fichier n'a pas __app : on regarde ce qu'elle montre
const PAGES = () => document.querySelector('.rang').textContent
const TOAST = () => { const t = document.querySelector('.toast'); return { texte: t.textContent, visible: t.classList.contains('visible') } }
const DIALOGUE = () => { const d = document.querySelector('dialog[open]'); return d ? { titre: d.querySelector('h2')?.textContent, texte: d.querySelector('p')?.textContent, boutons: [...d.querySelectorAll('button')].map(b => ({ t: b.textContent, off: b.disabled })) } : null }
/** Trois traits au stylo sur la page */
async function tracer(page, x0, y0, n = 3) {
  for (let i = 0; i < n; i++) {
    await page.mouse.move(x0, y0 + i * 40); await page.mouse.down()
    for (let k = 1; k <= 8; k++) await page.mouse.move(x0 + k * 15, y0 + i * 40 + (k % 2) * 6)
    await page.mouse.up(); await page.waitForTimeout(60)
  }
}
const BOUTON_FICHIER = '.barre-haut .bouton.points'
async function menuFichier(page) {
  await page.click(BOUTON_FICHIER)
  await page.waitForTimeout(80)
  return page.evaluate(() => {
    const m = document.querySelector('.menu-flottant.menu-large'), b = document.querySelector('.barre-haut .bouton.points')
    const rm = m.getBoundingClientRect(), rb = b.getBoundingClientRect()
    // (Adapté au lot 4, morceau C10 : la ligne du Drive du bloc de l'état porte son bouton, « Se connecter
    // à Google », quand une copie attend ; les entrées du menu sont les autres)
    // (Adapté au lot 5, morceau K9 : « Cet appareil » et ses deux cases entrent volontairement au bout du menu ⋯ ; lot5/K9-affichage.mjs les vérifie)
    // (Adapté au lot 6 : la section « Séance » du menu ⋯, ses entrées, vérifiées par lot5/S-seances-dev.mjs)
    return { cache: m.hidden, entrees: [...m.querySelectorAll('.menu-item:not(.action-etat):not([data-action="contraste"]):not([data-action="noms-outils"]):not([data-action="nouvelle-seance"]):not([data-action="renommer-seance"]):not([data-action="seance-precedente"]):not([data-action="retour-aujourdhui"])')].map(e => ({ libelle: e.querySelector('.libelle').firstChild.textContent, aide: e.querySelector('small')?.textContent, touche: e.querySelector('.touche')?.textContent })),
      // (Adapté au lot 4, morceau C3 : la note du bas du menu est passée dans le bloc de l'état, en tête du menu, à la ligne du fichier)
      note: m.querySelector('.bloc-lignes [data-ligne="fichier"] .texte-ligne')?.textContent, sous: rm.top >= rb.bottom, droite: Math.abs(rm.right - rb.right) < 1.5 || rm.right <= innerWidth - 7, largeur: rm.width, dansFenetre: rm.left >= 0 && rm.right <= innerWidth }
  })
}
/** Un faux showSaveFilePicker : 'refus' (AbortError), 'securite' (SecurityError), 'ecrit' (un fichier écrit en mémoire), 'absent' */
const PICKER = mode => {
  if (mode === 'absent') { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined; return }
  window.__ecrit = null; window.__demandes = []
  window.showSaveFilePicker = async o => {
    window.__demandes.push(JSON.parse(JSON.stringify(o)))
    if (mode === 'refus') throw new DOMException('Annulé', 'AbortError')
    if (mode === 'securite') throw new DOMException('Pas ici', 'SecurityError')
    return { name: 'mon-tableau.memc', createWritable: async () => { const morceaux = []; return { write: async b => { morceaux.push(new Uint8Array(await b.arrayBuffer())) }, close: async () => { window.__ecrit = morceaux } } } }
  }
}

// =============== 1. Le bouton ⋯ et son menu ===============
const ctxA = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
await ctxA.addInitScript(() => {
  // persist() : on note qu'il est demandé, sans rien montrer
  window.__persist = []
  const s = navigator.storage
  if (s) {
    const p = s.persist.bind(s), q = s.persisted.bind(s)
    s.persisted = () => { window.__persist.push('persisted'); return q() }
    s.persist = () => { window.__persist.push('persist'); return p() }
  }
})
const A = await ouvrir(ctxA, 'A')
{
  const b = await A.evaluate(() => { const b = document.querySelector('.barre-haut .bouton.points'), h = document.querySelector('.barre-haut'); return { dernier: h.lastElementChild === b, titre: b.title, haspopup: b.getAttribute('aria-haspopup'), d: b.querySelector('path').getAttribute('d'), sw: getComputedStyle(b.querySelector('svg')).strokeWidth } })
  // (Adapté aux corrections « conformité » du lot 5 : le titre dit aussi les
  // réglages de cet appareil, que le menu a depuis K9)
  verifier('Le bouton ⋯ est au bout de la barre du haut, après Publier, avec son titre et ses raccourcis', b.dernier && b.titre === 'Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil (Ctrl + S, Ctrl + O, Ctrl + P)' && b.haspopup === 'menu' && b.d === 'M5 12h.01M12 12h.01M19 12h.01' && parseFloat(b.sw) > 3, JSON.stringify(b))
  const p = await A.evaluate(() => window.__persist)
  verifier('Au démarrage, navigator.storage.persisted() puis persist() si besoin, sans aucun message', p[0] === 'persisted' && !(await A.evaluate(TOAST)).visible && !(await A.evaluate(DIALOGUE)), JSON.stringify(p))
  const m = await menuFichier(A)
  verifier('Le menu s\'ouvre sous le bouton, aligné à droite, dans la fenêtre', !m.cache && m.sous && m.droite && m.dansFenetre && m.largeur <= 401, JSON.stringify({ sous: m.sous, droite: m.droite, l: m.largeur }))
  // (Adapté au lot 3, morceau P9 : une troisième entrée, « Exporter le
  // classeur en PDF… », après « Ouvrir un classeur… » ; lot 4 : le classeur)
  // (Adapté au lot 4, morceau C4 : Chromium a showSaveFilePicker ; l'entrée
  // « Enregistrer automatiquement dans un fichier… » suit « Enregistrer le classeur… »)
  // (Adapté au lot 4, morceau C5 : « Bibliothèque des classeurs… » en tête)
  // (Adapté au lot 4, morceau C10 : « Copie sur le Drive… » entre volontairement après celle de la clé)
  const biblio = m.entrees[0]
  m.entrees = m.entrees.slice(1)
  const drive = m.entrees[2]
  m.entrees = m.entrees.filter((_, i) => i !== 2)
  const trois = m.entrees.filter((_, i) => i !== 1)
  verifier('Ses trois entrées, leurs raccourcis et leurs aides (et celle de la clé, et la bibliothèque en tête, lot 4)', biblio?.libelle === 'Bibliothèque des classeurs…' && drive?.libelle === 'Copie sur le Drive…' && m.entrees.length === 4 && m.entrees[1].libelle === 'Enregistrer automatiquement dans un fichier…'
    && trois[0].libelle === 'Enregistrer le classeur…' && trois[0].touche === 'Ctrl + S'
    && trois[0].aide === 'Un fichier .memc avec toutes les pages et tout l\'historique, à garder sur la clé ou à ouvrir ailleurs. Il garde aussi ce qui a été effacé : ne le donnez pas aux élèves (pour eux : Publier).'
    && trois[1].libelle === 'Ouvrir un classeur…' && trois[1].touche === 'Ctrl + O' && trois[1].aide === 'Ajoute un classeur enregistré (.memc) à la bibliothèque, ou remplace celui-ci.'
    && trois[2].libelle === 'Exporter le classeur en PDF…' && !trois[2].touche && trois[2].aide === 'Toutes les pages, cadrées sur leur contenu, en feuilles A4 à imprimer ou à déposer dans l\'ENT.', JSON.stringify(m.entrees))
  verifier('Jamais enregistré : le menu le dit', m.note === 'Jamais enregistré dans un fichier', m.note)
  await A.screenshot({ path: D + '/1-menu.png' })
  await A.keyboard.press('Escape')
  const tout = await A.evaluate(() => document.body.innerText + [...document.querySelectorAll('[title],[aria-label]')].map(e => e.title + e.getAttribute('aria-label')).join(' '))
  verifier('Aucun texte ne dit « undefined », « NaN » ni « [object Object] »', !/\bundefined\b|\bNaN\b|\[object Object\]/.test(tout))
}

// =============== 2. Enregistrer : téléchargement, choix de l'emplacement, renoncement ===============
await tracer(A, 400, 250)
await A.evaluate(() => window.__app.nouvellePage()); await A.waitForTimeout(100)
await tracer(A, 600, 300, 2)
// Un trait effacé (il doit rester dans le fichier, pour la revue)
await A.evaluate(() => { const a = window.__app; a.tableau.nouveauGeste(); a.tableau.supprimer(a.page, [a.formes[0].id]) })
await A.waitForTimeout(300)
const origine = await A.evaluate(() => { const a = window.__app; return { pages: a.pages, formes: a.pages.map(p => [...a.tableau.formesDe(p).keys()].sort()), film: a.tableau.film.length, piste: a.tableau.piste.length } })
let fichierA
{
  await A.evaluate(PICKER, 'absent')
  const attente = A.waitForEvent('download')
  await A.keyboard.press('Control+s')
  const dl = await attente
  fichierA = F + '/' + dl.suggestedFilename()
  await dl.saveAs(fichierA)
  await A.waitForTimeout(150)
  const t = await A.evaluate(TOAST)
  const o = readFileSync(fichierA), ligne = o.subarray(0, o.indexOf(0x0a)).toString()
  const e = JSON.parse(ligne)
  // Lot 4 : le fichier porte le nom du classeur (« Premier classeur » sur un navigateur neuf), puis la date
  verifier('Ctrl + S sans showSaveFilePicker : le fichier se télécharge sous « <nom du classeur> AAAA-MM-JJ HHhMM.memc »', /^(Premier classeur|Mon tableau) \d{4}-\d\d-\d\d \d\dh\d\d\.memc$/.test(dl.suggestedFilename()), dl.suggestedFilename())
  verifier('Le fichier : l\'en-tête mem-tableau v1 (2 pages), puis du gzip', ligne.startsWith('{"format":"mem-tableau","v":1,"app":"MEM teachingtool","date":') && e.pages === 2 && o[ligne.length + 1] === 0x1f && o[ligne.length + 2] === 0x8b, ligne)
  verifier('Le message dit le nom et la taille', new RegExp(`^Classeur enregistré : ${dl.suggestedFilename().replace('.', '\\.')} \\(\\d+ Ko\\)\\.$`).test(nbsp(t.texte)) && t.visible, t.texte)
  const m = await menuFichier(A)
  verifier('Le menu dit le dernier enregistrement : aujourd\'hui à …', /^Dernier enregistrement dans un fichier : aujourd'hui à \d+ h \d\d$/.test(nbsp(m.note)), m.note)
  await A.keyboard.press('Escape')
}
{
  // Chrome, Edge : l'emplacement est demandé d'abord ; on écrit dans le fichier choisi
  await A.evaluate(PICKER, 'ecrit')
  await A.click(BOUTON_FICHIER); await A.waitForTimeout(50)
  await A.locator('.menu-item[data-action="enregistrer"]').click()
  await A.waitForFunction(() => window.__ecrit, null, { timeout: 5000 })
  const r = await A.evaluate(() => ({ d: window.__demandes, n: window.__ecrit.reduce((s, m) => s + m.length, 0), debut: new TextDecoder().decode(window.__ecrit[0].slice(0, 23)) }))
  const t = await A.evaluate(TOAST)
  verifier('showSaveFilePicker : nom proposé, type .memc décrit, puis le fichier choisi est écrit', /^(Premier classeur|Mon tableau) .*\.memc$/.test(r.d[0].suggestedName) && r.d[0].types[0].description === 'Classeur complet (MEM teachingtool)' && JSON.stringify(r.d[0].types[0].accept) === '{"application/octet-stream":[".memc"]}' && r.debut === '{"format":"mem-tableau"', JSON.stringify(r))
  verifier('Le message porte le nom choisi par le professeur', /^Classeur enregistré : mon-tableau\.memc \(\d+ Ko\)\.$/.test(nbsp(t.texte)), t.texte)
  // On renonce dans la fenêtre : rien ne se passe
  await A.evaluate(PICKER, 'refus')
  await A.evaluate(() => { document.querySelector('.toast').classList.remove('visible'); document.querySelector('.toast').textContent = '' })
  let telecharge = false
  A.once('download', () => { telecharge = true })
  await A.keyboard.press('Control+s'); await A.waitForTimeout(400)
  const t2 = await A.evaluate(TOAST)
  verifier('Renoncer dans la fenêtre d\'enregistrement : ni message, ni téléchargement', !t2.visible && !telecharge && (await A.evaluate(() => window.__demandes.length)) === 1, JSON.stringify(t2))
  // La page ne peut pas ouvrir cette fenêtre (file://, page intégrée) : téléchargement
  await A.evaluate(PICKER, 'securite')
  const attente = A.waitForEvent('download', { timeout: 5000 })
  await A.keyboard.press('Control+s')
  const dl = await attente.catch(() => null)
  verifier('showSaveFilePicker refusé (SecurityError) : on télécharge', !!dl && /\.memc$/.test(dl.suggestedFilename()))
}
{
  // Ctrl + S : le navigateur n'enregistre pas la page web ; Ctrl + Alt + S n'est pas à nous
  const r = await A.evaluate(() => {
    const vu = []
    const f = e => vu.push([e.key, e.defaultPrevented])
    window.addEventListener('keydown', f)
    const envoyer = o => document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...o }))
    window.showSaveFilePicker = async () => { throw new DOMException('', 'AbortError') }
    envoyer({ key: 's', ctrlKey: true }); envoyer({ key: 'S', ctrlKey: true, shiftKey: true }); envoyer({ key: 's', metaKey: true })
    envoyer({ key: 's', ctrlKey: true, altKey: true }); envoyer({ key: 's' })
    window.removeEventListener('keydown', f)
    return vu
  })
  verifier('Ctrl + S, Ctrl + Maj + S, ⌘ + S empêchés ; Ctrl + Alt + S et S seul laissés', JSON.stringify(r.map(x => x[1])) === '[true,true,true,false,false]', JSON.stringify(r))
}

// =============== 3. Ouvrir : refus clairs ===============
const ctxB = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
const B = await ouvrir(ctxB, 'B')
await tracer(B, 300, 300, 1)
await B.waitForTimeout(300)
const avantB = await B.evaluate(() => ({ pages: window.__app.pages, n: window.__app.formes.length, film: window.__app.tableau.film.length }))
async function choisir(page, chemin, parClavier = false) {
  const attente = page.waitForEvent('filechooser', { timeout: 3000 })
  if (parClavier) await page.keyboard.press('Control+o')
  else { await page.click(BOUTON_FICHIER); await page.waitForTimeout(50); await page.locator('.menu-item[data-action="ouvrir"]').click() }
  const fc = await attente
  verifier(`Le choix du fichier ne montre que les .memc (accept), ${parClavier ? 'Ctrl + O' : 'menu'}`, (await fc.element().getAttribute('accept')) === '.memc,.memb')
  await fc.setFiles(chemin)
  await page.waitForTimeout(250)
}
{
  writeFileSync(F + '/quelconque.memc', 'Bonjour, je ne suis pas un tableau.')
  const fin = readFileSync(fichierA)
  const coupe = fin.indexOf(0x0a)
  writeFileSync(F + '/abime.memc', Buffer.concat([fin.subarray(0, coupe + 1), fin.subarray(coupe + 1, coupe + 1 + Math.floor((fin.length - coupe) / 2))]))
  writeFileSync(F + '/futur.memc', Buffer.concat([Buffer.from('{"format":"mem-tableau","v":2,"app":"MEM teachingtool","date":1,"pages":1}\n'), fin.subarray(coupe + 1)]))
  const seance = existsSync(`${RACINE_ESSAIS}/sorties/seance-essai.mem`)
    ? readFileSync(`${RACINE_ESSAIS}/sorties/seance-essai.mem`) : Buffer.from('{"format":"mem-revoir","v":1,"titre":"x","date":1,"gz":""}')
  writeFileSync(F + '/seance.mem', seance)
  const attendus = [
    ['seance.mem', 'Ce fichier est un film pour les élèves (.mem) : il se regarde dans « Revoir la séance » et ne contient pas tout le classeur. Pour ouvrir un classeur, choisissez un fichier .memc (menu ⋯ → Enregistrer le classeur).'],
    ['quelconque.memc', 'Ce fichier n\'est pas un classeur enregistré par MEM teachingtool (fichier .memc).'],
    ['abime.memc', 'Ce fichier .memc est abîmé : il ne peut pas être ouvert. Le classeur actuel n\'a pas changé.'],
    ['futur.memc', 'Ce classeur a été enregistré par une version plus récente de MEM teachingtool : ouvrez-le avec la version en ligne, à jour.'],
  ]
  for (const [nom, texte] of attendus) {
    await choisir(B, F + '/' + nom, nom === 'abime.memc')
    const t = await B.evaluate(TOAST), d = await B.evaluate(DIALOGUE)
    verifier(`Ouvrir ${nom} : refusé, avec la phrase prévue, sans fenêtre`, t.texte === texte && t.visible && !d, t.texte)
  }
  const apres = await B.evaluate(() => ({ pages: window.__app.pages, n: window.__app.formes.length, film: window.__app.tableau.film.length }))
  verifier('Après ces refus, le tableau n\'a pas changé', JSON.stringify(apres) === JSON.stringify(avantB), JSON.stringify(apres))
}

// =============== 4. Ouvrir : la fenêtre, Annuler, Enregistrer d'abord, Remplacer ===============
{
  await choisir(B, fichierA)
  const d = await B.evaluate(DIALOGUE)
  const nom = fichierA.split('/').pop()
  verifier('La fenêtre « Ouvrir ce classeur ? » : nom, pages, date, ce qui est remplacé',
    d && d.titre === 'Ouvrir ce classeur ?' && new RegExp(`^« ${nom.replace('.', '\\.')} » : 2 pages, enregistré le \\S+ \\d+(er)? \\S+ \\d{4} à \\d+ h \\d\\d\\. Il remplace le classeur « [^»]+ » de ce navigateur \\(1 page\\) et tout son historique\\. Pour garder celui-ci, enregistrez-le d'abord\\.$`).test(nbsp(d.texte)), d && d.texte)
  verifier('Ses trois boutons : Annuler, Enregistrer d\'abord, Remplacer (rouge)', d && d.boutons.map(b => b.t).join('|') === 'Annuler|Enregistrer d\'abord|Remplacer'
    && await B.evaluate(() => document.querySelector('dialog[open] [data-a="remplacer"]').classList.contains('danger-plein')) && await B.evaluate(() => document.activeElement?.dataset.a === 'annuler'))
  await B.screenshot({ path: D + '/2-ouvrir.png' })
  // Ctrl + S et Ctrl + O se taisent tant que la fenêtre est ouverte
  let fc = false; B.once('filechooser', () => { fc = true })
  await B.keyboard.press('Control+o'); await B.waitForTimeout(200)
  verifier('Fenêtre ouverte : Ctrl + O n\'ouvre rien d\'autre', !fc)
  await B.click('dialog[open] [data-a="annuler"]'); await B.waitForTimeout(100)
  const apres = await B.evaluate(() => ({ pages: window.__app.pages, n: window.__app.formes.length, film: window.__app.tableau.film.length }))
  verifier('Annuler : la fenêtre se ferme, le tableau n\'a pas changé', !(await B.evaluate(DIALOGUE)) && JSON.stringify(apres) === JSON.stringify(avantB) && !(await B.evaluate(() => document.querySelector('dialog'))))
  // Échap et un clic à côté ferment aussi
  await choisir(B, fichierA)
  await B.keyboard.press('Escape'); await B.waitForTimeout(100)
  verifier('Échap ferme la fenêtre', !(await B.evaluate(DIALOGUE)))
  // Enregistrer d'abord : le bouton devient « Enregistré ✓ », la fenêtre reste
  await choisir(B, fichierA)
  await B.evaluate(PICKER, 'absent')
  const attente = B.waitForEvent('download')
  await B.click('dialog[open] [data-a="enregistrer"]')
  const dl = await attente
  const sauveB = F + '/B-' + dl.suggestedFilename(); await dl.saveAs(sauveB)
  await B.waitForTimeout(200)
  const d2 = await B.evaluate(DIALOGUE)
  verifier('Enregistrer d\'abord : le tableau d\'ici se télécharge, le bouton dit « Enregistré ✓ », grisé, la fenêtre reste ouverte',
    d2 && d2.boutons[1].t === 'Enregistré ✓' && d2.boutons[1].off && !d2.boutons[2].off && JSON.parse(readFileSync(sauveB).subarray(0, readFileSync(sauveB).indexOf(0x0a)).toString()).pages === 1, JSON.stringify(d2?.boutons))
  // Remplacer : la page se recharge sur le tableau du fichier
  const recharge = B.waitForEvent('load')
  await B.click('dialog[open] [data-a="remplacer"]')
  await recharge
  await B.waitForFunction(() => window.__app && window.__app.page)
  await B.waitForTimeout(300)
  const r = await B.evaluate(() => { const a = window.__app; return { pages: a.pages, formes: a.pages.map(p => [...a.tableau.formesDe(p).keys()].sort()), film: a.tableau.film.length, piste: a.tableau.piste.length, page: a.page, z: a.cam.z,
    session: localStorage.getItem('mem-session'), ouvert: sessionStorage.getItem('mem-ouvert'), dernier: Number(localStorage.getItem('mem-dernier-enregistrement')) } })
  const t = await B.evaluate(TOAST)
  verifier('Après Remplacer : les pages, les formes, le film et la piste du fichier', JSON.stringify(r.pages) === JSON.stringify(origine.pages) && JSON.stringify(r.formes) === JSON.stringify(origine.formes) && r.film >= origine.film && r.piste === origine.piste, JSON.stringify({ r: { ...r, session: undefined }, origine }))
  verifier('Le message « Classeur ouvert : 2 pages. », une seule fois', nbsp(t.texte) === 'Classeur ouvert : 2 pages.' && t.visible && r.ouvert === null, t.texte)
  verifier('La session de l\'ancien tableau est oubliée (ni sa page, ni ses vues)', !r.session || !avantB.pages.some(p => r.session.includes(p)), r.session)
  verifier('Le menu dit la date du fichier ouvert comme dernier enregistrement', r.dernier === JSON.parse(readFileSync(fichierA).subarray(0, readFileSync(fichierA).indexOf(0x0a)).toString()).date)
  // La revue marche sur ce tableau venu d'ailleurs, et le trait effacé y revient
  const rev = await B.evaluate(async () => {
    const a = window.__app, t = a.tableau, f = t.film.toArray()
    const vus = new Set(); for (const e of f) for (const [, p] of t.etatA(e).pages) for (const id of p.formes.keys()) vus.add(id)
    return { vus: vus.size }
  })
  verifier('Le film se relit : le trait effacé est encore dans l\'historique', rev.vus === origine.formes.flat().length + 1, JSON.stringify(rev))
  await B.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  await B.waitForTimeout(300)
  verifier('La revue en classe s\'ouvre sur le tableau ouvert', await B.evaluate(() => !!window.__revue?.ouvert))
  await B.keyboard.press('Escape'); await B.waitForTimeout(200)
  // On écrit : c'est bien enregistré dans ce navigateur
  await tracer(B, 500, 500, 1); await B.waitForTimeout(400)
  const n1 = await B.evaluate(() => window.__app.formes.length)
  await B.reload(); await B.waitForFunction(() => window.__app && window.__app.page); await B.waitForTimeout(300)
  verifier('Ce qu\'on écrit ensuite s\'enregistre (rechargement)', (await B.evaluate(() => window.__app.formes.length)) === n1 && (await B.evaluate(TOAST)).texte !== 'Classeur ouvert : 2 pages.')
}

// =============== 5. Glisser un fichier sur le tableau ===============
{
  const glisser = async (page, nom, octets) => page.evaluate(([nom, o]) => {
    const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(o)], nom))
    const z = document.getElementById('zone'), r = z.getBoundingClientRect()
    const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + 400, clientY: r.top + 300 })
    z.dispatchEvent(ev)
    return ev.defaultPrevented
  }, [nom, [...octets]])
  const ok = await glisser(B, 'glisse.memc', readFileSync(fichierA))
  // Lot 4 (C9) : le fichier est d'abord reconnu (la première fenêtre, puis la question du lot 1)
  await B.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 }).catch(() => {})
  await B.waitForTimeout(250)
  const d = await B.evaluate(DIALOGUE)
  verifier('Un .memc glissé sur le tableau : la même fenêtre « Ouvrir ce classeur ? »', ok && d?.titre === 'Ouvrir ce classeur ?' && /^« glisse\.memc » : 2 pages/.test(nbsp(d.texte)), d?.texte)
  await B.click('dialog[open] [data-a="annuler"]'); await B.waitForTimeout(100)
  const ok2 = await glisser(B, 'seance.mem', readFileSync(F + '/seance.mem'))
  await B.waitForTimeout(250)
  const t = await B.evaluate(TOAST)
  verifier('Un .mem glissé : refusé avec la phrase du film élève, sans fenêtre ni image posée', ok2 && /^Ce fichier est un film pour les élèves \(\.mem\)/.test(t.texte) && !(await B.evaluate(DIALOGUE)), t.texte)
}

// =============== 6. Refus pendant la revue, une séance, une fenêtre ===============
{
  let fc = 0; B.on('filechooser', () => { fc++ })
  await B.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click(); await B.waitForTimeout(300)
  await B.keyboard.press('Control+o'); await B.waitForTimeout(200)
  const enRevue = await B.evaluate(() => window.__app.enLecture)
  await B.keyboard.press('Escape'); await B.waitForTimeout(200)
  await B.getByRole('button', { name: 'Automatismes : 10 questions minutées' }).click(); await B.waitForTimeout(200)
  await B.keyboard.press('Control+o'); await B.waitForTimeout(200)
  let dlSeance = false; B.once('download', () => { dlSeance = true })
  await B.evaluate(PICKER, 'absent')
  await B.keyboard.press('Control+s'); await B.waitForTimeout(300)
  await B.evaluate(() => document.querySelector('.seance .fermer')?.click()); await B.waitForTimeout(150)
  verifier('Pendant la revue et la séance d\'automatismes, Ctrl + O n\'ouvre rien ; pendant la séance, Ctrl + S non plus', enRevue && fc === 0 && !dlSeance, JSON.stringify({ enRevue, fc, dlSeance }))
  // Un glisser pendant que l'éditeur de formule (fenêtre non modale) est ouvert
  await B.evaluate(() => { window.__app.ui.editerFormule('', 300, 300) }); await B.waitForTimeout(100)
  await B.evaluate(o => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(o)], 'x.memc')); document.getElementById('zone').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })) }, [...readFileSync(fichierA)])
  await B.waitForTimeout(250)
  const t = await B.evaluate(TOAST)
  verifier('Une fenêtre ouverte (formule) : ouvrir un tableau est refusé, avec « Fermez d\'abord la fenêtre ouverte. »', t.texte === 'Fermez d\'abord la fenêtre ouverte.' && (await B.evaluate(DIALOGUE))?.titre !== 'Ouvrir ce classeur ?', t.texte)
  // Par le menu aussi (la fenêtre de formule n'est pas modale : le menu reste à portée)
  await B.click(BOUTON_FICHIER); await B.waitForTimeout(50)
  await B.locator('.menu-item[data-action="ouvrir"]').click(); await B.waitForTimeout(200)
  verifier('… et par le menu : pas de choix de fichier, le même message', fc === 0 && (await B.evaluate(TOAST)).texte === 'Fermez d\'abord la fenêtre ouverte.')
  await B.click('dialog[open] .secondaire'); await B.waitForTimeout(100)
}

// =============== 7. L'échec du remplacement ===============
{
  // Lot 4 (C9) : rouvrir le fichier du classeur ouvert (fichierA, dont il a pris l'identité)
  // ne propose plus de le remplacer (« Celui de la bibliothèque contient déjà tout ce
  // fichier ») : on remplace par un autre classeur, celui enregistré par B
  await choisir(B, F + '/' + (await import('node:fs')).readdirSync(F).find(n => n.startsWith('B-')))
  await B.evaluate(() => { window.__app.tableau.remplacerPar = () => Promise.reject(new DOMException('plein', 'QuotaExceededError')) })
  await B.click('dialog[open] [data-a="remplacer"]'); await B.waitForTimeout(500)
  const d = await B.evaluate(DIALOGUE)
  verifier('Le remplacement échoue : la fenêtre le dit, et ne laisse que « Recharger »', d && d.texte === 'Le classeur n\'a pas pu être remplacé (le navigateur manque peut-être de place). Le classeur actuel n\'a pas changé.' && d.boutons.map(b => b.t).join() === 'Recharger', JSON.stringify(d))
  await B.keyboard.press('Escape'); await B.waitForTimeout(150)
  verifier('Échap ne ferme pas cette fenêtre', !!(await B.evaluate(DIALOGUE)))
  const recharge = B.waitForEvent('load')
  await B.click('dialog[open] button'); await recharge
  await B.waitForFunction(() => window.__app && window.__app.page); await B.waitForTimeout(200)
  verifier('Recharger : le tableau d\'avant est là', JSON.stringify(await B.evaluate(() => window.__app.pages)) === JSON.stringify(origine.pages))
}

// =============== 8. Deux onglets sur le même tableau ===============
{
  const B2 = await ouvrir(ctxB, 'B2')
  await B2.waitForTimeout(200)
  // B ouvre le tableau enregistré par B (« Enregistrer d'abord », 1 page)
  const sauveB = (await import('node:fs')).readdirSync(F).find(n => n.startsWith('B-'))
  await choisir(B, F + '/' + sauveB)
  const recharge = B.waitForEvent('load')
  await B.click('dialog[open] [data-a="remplacer"]')
  await recharge; await B.waitForFunction(() => window.__app && window.__app.page); await B.waitForTimeout(300)
  const d = await B2.evaluate(DIALOGUE)
  verifier('L\'autre onglet : « Le classeur a changé », avec « Recharger » seulement', d && d.titre === 'Le classeur a changé' && /^Le classeur « [^»]+ » a été remplacé dans un autre onglet\. Rechargez cette page pour le voir : ce qui serait écrit ici ne serait plus enregistré\.$/.test(nbsp(d.texte)) && d.boutons.map(b => b.t).join() === 'Recharger', JSON.stringify(d))
  await B2.keyboard.press('Escape'); await B2.waitForTimeout(100); await B2.keyboard.press('Escape'); await B2.waitForTimeout(100)
  await B2.mouse.click(5, 5); await B2.waitForTimeout(100)
  verifier('Ni Échap ni un clic à côté ne la ferment', (await B2.evaluate(DIALOGUE))?.titre === 'Le classeur a changé')
  // Ce qu'écrirait encore cet onglet n'abîme pas le tableau neuf
  await B2.evaluate(() => { const a = window.__app; const f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }] }); a.tableau.nouveauGeste(); a.tableau.poser(a.page, f) })
  await B2.waitForTimeout(300)
  const nB = await B.evaluate(() => ({ pages: window.__app.pages.length, n: window.__app.formes.length }))
  await B.reload(); await B.waitForFunction(() => window.__app && window.__app.page); await B.waitForTimeout(300)
  // (Adapté au lot 6 : ce tableau a sa dernière séance d'il y a plusieurs jours ;
  // rechargé, il s'ouvre sur la fenêtre d'accueil, qu'Échap ferme)
  if (await B.evaluate(() => !!document.querySelector('dialog.dialogue-accueil[open]'))) { await B.keyboard.press('Escape'); await B.waitForTimeout(150) }
  const nB2 = await B.evaluate(() => ({ pages: window.__app.pages.length, n: window.__app.formes.length }))
  verifier('Le tableau neuf (1 page) ne reçoit rien de l\'onglet coupé', nB.pages === 1 && JSON.stringify(nB) === JSON.stringify(nB2), JSON.stringify({ nB, nB2 }))
  const recharge2 = B2.waitForEvent('load')
  await B2.click('dialog[open] button'); await recharge2
  await B2.waitForFunction(() => window.__app && window.__app.page); await B2.waitForTimeout(300)
  verifier('Recharger l\'autre onglet : il montre le tableau neuf', JSON.stringify(await B2.evaluate(() => ({ pages: window.__app.pages.length, n: window.__app.formes.length }))) === JSON.stringify(nB2))
  await B2.close()
}

// =============== 9. Le lecteur des élèves refuse un .memc ===============
{
  const L = await ctxB.newPage(); surveiller(L, 'lecteur')
  await L.goto(URL0 + 'revoir.html'); await L.waitForTimeout(500)
  await L.setInputFiles('input[type=file]', fichierA); await L.waitForTimeout(500)
  const texte = await L.evaluate(() => document.body.innerText)
  verifier('Le lecteur des élèves refuse un .memc avec la phrase prévue', texte.includes('Ce fichier est un classeur complet enregistré par l\'enseignant (.memc) : il s\'ouvre dans MEM teachingtool, pas ici. Pour revoir la séance, ouvrez le fichier séance (.mem) ou le lien donné par votre enseignant.'), texte.slice(0, 300))
  await L.screenshot({ path: D + '/3-lecteur.png' })
  await L.close()
}

// =============== 10. La version d'un seul fichier (file://) : la passerelle ===============
if (existsSync(`${RACINE_DEPOT}/dist/index.html`)) {
  const ctxC = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const C = await ctxC.newPage(); surveiller(C, 'file')
  await C.goto(UN_FICHIER)
  await C.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'))
  await C.waitForTimeout(800)
  // Le tableau en ligne s'ouvre dans la version de la clé
  const attente = C.waitForEvent('filechooser')
  await C.click(BOUTON_FICHIER); await C.waitForTimeout(50)
  await C.locator('.menu-item[data-action="ouvrir"]').click()
  await (await attente).setFiles(fichierA); await C.waitForTimeout(300)
  const d = await C.evaluate(DIALOGUE)
  const recharge = C.waitForEvent('load')
  await C.click('dialog[open] [data-a="remplacer"]'); await recharge
  await C.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/')); await C.waitForTimeout(600)
  const rang = await C.evaluate(PAGES), t = await C.evaluate(TOAST)
  verifier('file:// : le tableau enregistré en ligne s\'ouvre (2 pages)', d?.titre === 'Ouvrir ce classeur ?' && rang === '1 / 2' && nbsp(t.texte) === 'Classeur ouvert : 2 pages.', JSON.stringify({ rang, t: t.texte }))
  // … et s'y enregistre à son tour (téléchargement), puis revient en ligne
  await tracer(C, 700, 500, 1); await C.waitForTimeout(300)
  await C.evaluate(PICKER, 'securite')
  const att = C.waitForEvent('download')
  await C.keyboard.press('Control+s')
  const dl = await att
  const deLaCle = F + '/cle-' + dl.suggestedFilename(); await dl.saveAs(deLaCle)
  const e = JSON.parse(readFileSync(deLaCle).subarray(0, readFileSync(deLaCle).indexOf(0x0a)).toString())
  verifier('file:// : Ctrl + S télécharge le tableau', e.format === 'mem-tableau' && e.pages === 2, JSON.stringify(e))
  await ctxC.close()
  await choisir(B, deLaCle)
  const rB = B.waitForEvent('load')
  await B.click('dialog[open] [data-a="remplacer"]'); await rB
  await B.waitForFunction(() => window.__app && window.__app.page); await B.waitForTimeout(300)
  const r = await B.evaluate(() => { const a = window.__app; return { pages: a.pages, n: a.pages.map(p => a.tableau.formesDe(p).size) } })
  verifier('En ligne : le tableau écrit dans la version de la clé revient, avec ce qu\'on y a ajouté', JSON.stringify(r.pages) === JSON.stringify(origine.pages) && r.n[0] === origine.formes[0].length + 1 && r.n[1] === origine.formes[1].length, JSON.stringify({ r, origine: origine.formes.map(f => f.length) }))
} else verifier('dist/index.html manque : « npm run build » d\'abord', false)

// =============== 11. Téléphone : le menu tient dans l'écran ===============
{
  const ctxT = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const T = await ouvrir(ctxT, 'tel')
  await T.tap(BOUTON_FICHIER); await T.waitForTimeout(150)
  const m = await T.evaluate(() => { const r = document.querySelector('.menu-flottant.menu-large').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight, cache: document.querySelector('.menu-flottant.menu-large').hidden } })
  verifier('Sur un téléphone, le menu ⋯ s\'ouvre dans l\'écran, à 8 px des bords', !m.cache && m.l >= 7.5 && m.r <= m.w - 7.5 && m.b <= m.h, JSON.stringify(m))
  await T.screenshot({ path: D + '/4-telephone.png' })
  await ctxT.close()
}

await ctxA.close(); await ctxB.close()
await nav.close()
console.log(erreurs.length ? 'ERREURS JS :\n' + erreurs.join('\n') : 'Aucune erreur JS')
const echecs = resultats.filter(r => !r.ok).length
console.log(`${resultats.length - echecs} / ${resultats.length} vérifications réussies`)
process.exit(echecs || erreurs.length ? 1 : 0)
