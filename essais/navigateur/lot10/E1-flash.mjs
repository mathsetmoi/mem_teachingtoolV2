// ESSAI DU LOT 10 : le flash d'automatismes, sur une page de la séance.
// Le serveur de développement (port 5173).
// A. Le bouton « Automatismes » ouvre le réglage ; rien n'est posé sur la
//    page pendant le réglage, aucune question n'est montrée ; « Lancer » est
//    grisé sans thème ; par défaut 2 questions de cours et 3 exercices
//    d'application (5 questions) ;
// B. lancé, une question à la fois : la première en grand, → passe à la
//    suivante, Espace met en pause ; C corrige : les réponses en vert ; après
//    la correction, C redevient le raccourci de l'outil ;
// C. « Bonjour ! » : la case « Commencer par des automatismes » n'est pas
//    cochée d'office ; cochée, la nouvelle séance s'ouvre sur le réglage,
//    devant une page vide ;
// D. toutes d'un coup : la minuterie attend sur une autre page ;
//    « Nouveaux exemples » pose un autre flash sur la page d'après ;
// E. le réglage est retenu ;
// G. un flash de 4e (thèmes de géométrie, avec figures) : 5 questions,
//    corrigées en vert, avec la phrase du programme en bleu sous les
//    réponses des 3 exercices ;
// H. un flash de 2nde et de 1re cochées ensemble (fonctions, statistiques,
//    probabilités : courbes, diagrammes, arbres) : 5 questions corrigées
//    en vert, la phrase du programme sous chaque exercice ;
// I. au collège, l'arbre du programme (7 novembre 2026) : cinq thèmes,
//    la pensée informatique grisée (« rien au programme »), une case de
//    thème coche tous ses domaines, la flèche d'un domaine montre ses
//    compétences (les phrases de la liste « Automatismes ») ;
// J. en 5e, chaque compétence a ses exercices : aucune case grisée, et une
//    seule compétence cochée (Angles, « angle droit 90°, plat 180° ») ne
//    pose que des questions sur la mesure d'un angle droit ou plat ;
// K. la 3e (7 novembre 2026) : le niveau n'est plus grisé, aucune
//    compétence grisée ; un flash de 3e (Triangles et Statistiques) pose
//    5 questions, corrigées en vert, la phrase du programme sous chaque
//    exercice ;
// L. plus de domaine PERSO « Symétries » en 5e : ses questions sont rangées
//    dans « Transformations » ;
// M. en 5e, deux listes sous leur titre : les automatismes du programme
//    (OFFI), puis les objectifs d'apprentissage ; un domaine d'objectifs
//    coché pose ses exercices d'application, avec la phrase du programme ;
// N. un seul arbre en 3e aussi (15 novembre 2026) : pastilles OFFI 37 et
//    OBJ 49, deux domaines « à remplir » ; depuis le 22 novembre, les
//    lignes OBJ de Nombres et calculs, d'Espace et géométrie et de Données
//    et probabilités ont des exercices (sauf la
//    6e du calcul littéral, en suspens), les autres restent grises, et
//    le pair et l'impair (Calcul littéral, C6) se coche avec ses seules
//    questions de cours ;
// O. « Remplacer » (22 novembre 2026) : une à la fois, une autre question
//    de la même forme arrive en grand, le temps repart du début, l'ancienne
//    s'efface ; toutes d'un coup, « Remplacer » demande laquelle (chiffre),
//    la minuterie continue, le bandeau tient sur une ligne ; la case
//    « Correction à la fin » décochée : le temps fini, « Temps écoulé »,
//    aucune réponse en vert jusqu'à C ;
// F. aucune erreur.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const VERT = '#1e8a4c'

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()) })
const nObjets = () => p.evaluate(() => window.__app.tableau.formesDe(window.__app.page)?.size ?? 0)
const etat = () => p.evaluate(() => document.querySelector('.etat-flash')?.textContent ?? '')
/** Coche un domaine du collège : son thème se déplie d'abord s'il est fermé */
const cocher = async (niveau, domaine) => {
  const c = `.case-domaine[value="${niveau}/${domaine}"]`
  if (!await p.isVisible(c)) await p.click(`.themes-niveau[data-niveau="${niveau}"] .arbre-theme:has(${c}) > .ligne-arbre > .deplier`)
  await p.click(c)
}

await p.goto(DEV)
await p.waitForFunction(() => window.__app, null, { timeout: 30000 })
await p.waitForTimeout(1200)

// ---------- A. Le réglage ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const reglage = await p.evaluate(() => ({
  lancer: document.querySelector('.dialogue-flash .lancer').disabled,
  total: document.querySelector('.total-flash').textContent,
  formes: [...document.querySelectorAll('.forme-flash')].map(f => f.dataset.forme + '=' + f.querySelector('output, .valeur, span:not(:empty)')?.textContent),
  // Les phrases du programme (compétences, avec des maths) ne sont pas des questions
  katex: [...document.querySelectorAll('.dialogue-flash .katex, .dialogue-flash img')].filter(e => !e.closest('.liste-themes')).length,
}))
ok(reglage.lancer, 'A) Sans thème coché, « Lancer » est grisé', reglage)
ok(/5/.test(reglage.total), 'A) Par défaut, 5 questions', reglage)
ok(reglage.katex === 0, 'A) Le réglage ne montre aucune question', reglage)
await cocher('5e', 'Nombres relatifs')
await cocher('5e', 'Nombres rationnels')
ok(await nObjets() === 0, 'A) Rien n\'est posé sur la page pendant le réglage', await nObjets())

// ---------- B. Une question à la fois ----------
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const e1 = await etat()
ok(/Question 1 sur 5/.test(e1), 'B) Lancé : la question 1 sur 5', e1)
ok(await nObjets() > 0, 'B) Des objets sont posés sur la page')
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600)
const e2 = await etat()
ok(/Question 2 sur 5/.test(e2), 'B) → passe à la question 2', e2)
await p.keyboard.press(' '); await p.waitForTimeout(300)
const ep = await etat()
ok(/pause/i.test(ep), 'B) Espace met en pause', ep)
await p.keyboard.press(' '); await p.waitForTimeout(300)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const verts = await p.evaluate(v => [...window.__app.tableau.formesDe(window.__app.page).values()].filter(f => f.couleur === v).length, VERT)
ok(verts >= 5, 'B) C corrige : une réponse en vert par question', verts)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.keyboard.press('c'); await p.waitForTimeout(200)
const outil = await p.evaluate(() => window.__app.outil + '/' + (window.__app.typeForme ?? ''))
ok(/cercle/.test(outil), 'B) Après la correction, C redevient l\'outil Cercle', outil)
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- C. « Bonjour ! » ----------
await p.evaluate(() => { const a = window.__app; a.tableau.nouveauGeste(); a.tableau.poser(a.page, { id: 'x1', type: 'formule', x: 100, y: 300, latex: 'x', couleur: '#000', taille: 30, z: 1, auteur: 'e' }) })
await p.waitForTimeout(1500)
await p.clock.install({ time: Date.now() + 3 * 3600_000 })
await p.reload()
await p.waitForFunction(() => window.__app, null, { timeout: 30000 })
await p.waitForSelector('dialog.dialogue-accueil[open]', { timeout: 10000 })
ok(!(await p.evaluate(() => document.querySelector('.accueil-automatismes').checked)), 'C) « Commencer par des automatismes » n\'est pas cochée d\'office')
await p.check('.accueil-automatismes')
await p.click('.accueil-nouvelle')
const regle = await p.waitForSelector('dialog.dialogue-flash[open]', { timeout: 5000 }).then(() => true, () => false)
ok(regle, 'C) Cochée : la nouvelle séance s\'ouvre sur le réglage')
ok(await nObjets() === 0, 'C) … devant une page vide', await nObjets())

// ---------- D. Toutes d'un coup ----------
await p.click('input[value=toutes]')
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const page1 = await p.evaluate(() => window.__app.page)
await p.evaluate(() => window.__app.nouvellePage()); await p.waitForTimeout(1200)
const ailleurs = await etat()
ok(/attente/.test(ailleurs), 'D) Sur une autre page, la minuterie attend', ailleurs)
await p.evaluate(p1 => window.__app.allerPage(p1), page1); await p.waitForTimeout(500)
await p.keyboard.press('c'); await p.waitForTimeout(600)
await p.click('.bandeau-flash .nouveaux'); await p.waitForTimeout(1500)
const info = await p.evaluate(() => ({ page: window.__app.page, n: window.__app.tableau.formesDe(window.__app.page).size, ordre: window.__app.pagesDuJour }))
ok(info.page !== page1 && info.n > 0 && info.ordre.indexOf(info.page) === info.ordre.indexOf(page1) + 1,
  'D) « Nouveaux exemples » : un autre flash, sur la page juste après', { ...info, page1 })
await p.click('.bandeau-flash .fermer')
ok(await p.evaluate(() => document.querySelector('.bandeau-flash').hidden), 'D) × ferme le bandeau')

// ---------- E. Le réglage retenu ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const retenu = await p.evaluate(() => ({ themes: [...document.querySelectorAll('.themes-niveau .case-domaine:checked')].length, toutes: document.querySelector('input[value=toutes]').checked }))
ok(retenu.themes === 2 && retenu.toutes, 'E) Le réglage est retenu (2 thèmes, toutes d\'un coup)', retenu)
await p.keyboard.press('Escape')

// ---------- G. Un flash de 4e ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const quatre = await p.evaluate(() => !document.querySelector('.niveau-flash[data-niveau="4e"]').disabled)
ok(quatre, 'G) Le niveau 4e n\'est plus grisé')
await p.click('.niveau-flash[data-niveau="4e"]')
for (const c of await p.$$('.themes-niveau[data-niveau="5e"] .case-domaine:checked')) await c.click()
for (const t of ['Triangles', 'Parallélogrammes et translations', 'Représentation de l’espace', 'Repérage']) await cocher('4e', t)
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const pageG = await p.evaluate(() => window.__app.page)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const vertsG = await p.evaluate(([v, pg]) => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === v).length, [VERT, pageG])
ok(vertsG >= 5, 'G) Un flash de 4e : 5 questions, corrigées en vert', vertsG)
const bleusG = await p.evaluate(pg => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === '#1f5fbf').length, pageG)
ok(bleusG >= 3, 'G) À la correction, la phrase du programme sous chaque exercice (en bleu)', bleusG)
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- H. Un flash de 2nde et de 1re ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const lycee = await p.evaluate(() => ['2nde', '1re'].every(n => !document.querySelector(`.niveau-flash[data-niveau="${n}"]`).disabled))
ok(lycee, 'H) Les niveaux 2nde et 1re ne sont plus grisés')
for (const b of await p.$$('.niveau-flash[aria-pressed=true]')) await b.click()
await p.click('.niveau-flash[data-niveau="2nde"]'); await p.click('.niveau-flash[data-niveau="1re"]')
for (const c of await p.$$('.themes-niveau:not([hidden]) input:checked')) await c.click()
// En 2nde, l'arbre du programme (lot 24) : les thèmes du programme, que le
// professeur remplit (Arithmétique, PERSO), les domaines vides en gris, et
// la liste officielle de l'épreuve à part (OFFI), qu'on déplie
const arbre2 = await p.evaluate(() => {
  const r = document.querySelector('.themes-niveau[data-niveau="2nde"]')
  return {
    themes: [...r.querySelectorAll('.arbre-theme')].length,
    offi: !!r.querySelector('.arbre-theme .etiquette-offi'),
    perso: [...r.querySelectorAll('.case-competence')].some(c => c.value === '2nde/Arithmétique/0' && c.closest('label').querySelector('.etiquette-perso')),
    vides: r.querySelectorAll('.arbre-domaine.vide').length,
  }
})
ok(arbre2.themes === 5 && arbre2.offi && arbre2.perso && arbre2.vides >= 8, 'H) 2nde : 4 thèmes du programme + la liste officielle (OFFI), Arithmétique PERSO, domaines vides « à remplir »', JSON.stringify(arbre2))
await p.click('.themes-niveau[data-niveau="2nde"] .arbre-theme:has(.etiquette-offi) > .ligne-arbre > button.deplier')
for (const n of ['2nde', '1re']) for (const t of ['Fonctions et représentations', 'Statistiques', 'Probabilités']) await p.click(`.themes-niveau[data-niveau="${n}"] label:has-text("${t}")`)
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const pageH = await p.evaluate(() => window.__app.page)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const vertsH = await p.evaluate(([v, pg]) => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === v).length, [VERT, pageH])
ok(vertsH >= 5, 'H) Un flash de 2nde et 1re : 5 questions, corrigées en vert', vertsH)
const bleusH = await p.evaluate(pg => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === '#1f5fbf').length, pageH)
ok(bleusH >= 3, 'H) À la correction, la phrase de la liste officielle sous chaque exercice', bleusH)
if (process.env.CAPTURE) await p.screenshot({ path: process.env.CAPTURE })
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- I. L'arbre du collège ----------
await p.keyboard.press('Escape').catch(() => {})
await p.click('.bandeau-flash .fermer').catch(() => {})
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
for (const b of await p.$$('.niveau-flash[aria-pressed=true]')) await b.click()
await p.click('.niveau-flash[data-niveau="5e"]')
const arbre = await p.evaluate(() => {
  const n = document.querySelector('.themes-niveau[data-niveau="5e"]')
  return {
    themes: [...n.querySelectorAll('.arbre-theme')].slice(0, 5).map(t => t.querySelector('.ligne-arbre').textContent.trim().replace(/\s+/g, ' ')),
    informatique: [...n.querySelectorAll('.arbre-theme.vide')][0]?.textContent.replace(/\s+/g, ' ').trim(),
  }
})
ok(arbre.themes.length === 5 && arbre.themes[4].startsWith('La pensée informatique') && /^Nombres et calculs/.test(arbre.themes[0]), 'I) 5e : cinq thèmes, Nombres et calculs d\'abord', arbre)
ok(/La pensée informatique.*rien au programme/.test(arbre.informatique ?? ''), 'I) La pensée informatique est grisée : rien au programme', arbre)
for (const c of await p.$$('.themes-niveau[data-niveau="5e"] .case-domaine:checked')) await c.click()
await p.click('.themes-niveau[data-niveau="5e"] .arbre-theme:has(.case-domaine[value="5e/Angles"]) .case-theme')
const geo = await p.evaluate(() => {
  const t = document.querySelector('.themes-niveau[data-niveau="5e"] .arbre-theme:has(.case-domaine[value="5e/Angles"])')
  return { domaines: [...t.querySelectorAll('.case-domaine')].map(c => c.checked), visibles: !t.querySelector(':scope > .enfants').hidden }
})
ok(geo.domaines.length >= 5 && geo.domaines.every(Boolean), 'I) La case « Espace et géométrie » coche tous ses domaines', geo)
if (!geo.visibles) await p.click('.themes-niveau[data-niveau="5e"] .arbre-theme:has(.case-domaine[value="5e/Angles"]) > .ligne-arbre > .deplier')
await p.click('.themes-niveau[data-niveau="5e"] .arbre-domaine:has(.case-domaine[value="5e/Angles"]) .deplier')
const comp = await p.evaluate(() => {
  const l = [...document.querySelectorAll('.arbre-domaine:has(.case-domaine[value="5e/Angles"]) .case-competence')].filter(c => c.offsetParent)
  return { offi: l.filter(c => !c.value.startsWith('5e/obj:')).length, obj: l.filter(c => c.value.startsWith('5e/obj:')).length }
})
ok(comp.offi === 4 && comp.obj === 1, 'I) La flèche d\'Angles montre ses 4 lignes OFFI et son objectif OBJ, ensemble', comp)
const sym = await p.evaluate(() => !!document.querySelector('.themes-niveau[data-niveau="5e"] .case-domaine[value="5e/Symétries"]'))
ok(sym === false, 'L) Plus de domaine PERSO « Symétries » en 5e (rangé dans Transformations)', sym)
const grisees = await p.evaluate(() => [...document.querySelectorAll('.themes-niveau[data-niveau="5e"] .case-competence:not([value^="5e/obj:"])')].filter(c => c.disabled).length)
ok(grisees === 0, 'J) En 5e, aucune compétence de la liste officielle n\'est grisée (chacune a ses exercices)', grisees)
// M. Un seul arbre en 5e : les lignes OFFI et OBJ rangées ensemble, chacune
//    avec son étiquette ; un filtre, une recherche, « Cochés », un bilan
const N5 = '.themes-niveau[data-niveau="5e"]'
const titres = await p.evaluate(n => document.querySelectorAll(n + ' .section-arbre').length, N5)
const pastilles = await p.evaluate(n => [...document.querySelectorAll(n + ' .pastille-filtre')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), N5)
ok(titres === 0 && pastilles.length >= 4 && /^Tout/.test(pastilles[0]) && pastilles.some(t => /^OFFI/.test(t)) && pastilles.some(t => /^OBJ/.test(t)) && pastilles.some(t => /^Cochés/.test(t)), 'M) Un seul arbre en 5e, avec ses pastilles Tout, OFFI, OBJ, Cochés', pastilles)
const obj = await p.evaluate(n => {
  const d = document.querySelector(n + ' .arbre-domaine:has(.case-domaine[value="5e/Opérations"])')
  const cs = d ? [...d.querySelectorAll('.case-competence[value^="5e/obj:Opérations/"]')] : []
  const of = d ? [...d.querySelectorAll('.case-competence:not([value^="5e/obj:"])')] : []
  return { n: cs.length, actives: cs.filter(c => !c.disabled).length, offi: of.length, etiquettes: d ? [...d.querySelectorAll('li > label > b')].map(b => b.textContent).filter((t, i, l) => l.indexOf(t) === i) : [] }
}, N5)
ok(obj.n === 11 && obj.actives === 6 && obj.offi === 6 && obj.etiquettes.includes('OFFI') && obj.etiquettes.includes('OBJ'), 'M) Opérations : 6 lignes OFFI et 11 objectifs OBJ (6 avec exercices ou questions de cours), chacun avec son étiquette', obj)
// Le filtre OFFI : une case de thème ne coche que les lignes OFFI visibles
for (const c of await p.$$(N5 + ' .case-domaine:checked')) await c.click()
await p.click(N5 + ' .pastille-filtre[data-type="OFFI"]')
await p.click(N5 + ' .arbre-theme:has(.case-domaine[value="5e/Opérations"]) .case-theme')
const filtre = await p.evaluate(n => ({
  offi: document.querySelectorAll(n + ' .case-competence:checked:not([value^="5e/obj:"])').length,
  obj: document.querySelectorAll(n + ' .case-competence:checked[value^="5e/obj:"]').length,
  bilan: document.querySelector(n + ' .bilan-texte').textContent,
}), N5)
ok(filtre.offi === 25 && filtre.obj === 0 && /^25 lignes cochées, \d+ questions possibles$/.test(filtre.bilan), 'M) Avec le filtre OFFI, la case du thème ne coche que les lignes OFFI (25) ; le bilan du bas les compte', filtre)
await p.click(N5 + ' .pastille-filtre[data-type="OBJ"]')
const garde = await p.evaluate(n => document.querySelectorAll(n + ' .case-competence:checked').length, N5)
ok(garde === 25, 'M) Passer au filtre OBJ ne décoche rien', garde)
await p.click(N5 + ' .pastille-filtre[data-type="tout"]')
await p.fill(N5 + ' .recherche-lignes', 'divis')
const cherche = await p.evaluate(n => ({ domaines: [...document.querySelectorAll(n + ' .arbre-domaine[data-fusion]')].filter(d => d.offsetParent).length, lignes: [...document.querySelectorAll(n + ' li[data-type]')].filter(l => l.offsetParent).length }), N5)
ok(cherche.domaines === 1 && cherche.lignes >= 3, 'M) La recherche « divis » ne garde que les lignes qui contiennent le mot, et ouvre leur domaine', cherche)
await p.fill(N5 + ' .recherche-lignes', '')
await p.click(N5 + ' .tout-decocher')
ok(await p.evaluate(n => document.querySelectorAll(n + ' .case-competence:checked').length === 0, N5), 'M) « Tout décocher » vide la sélection')
// Un flash sur les objectifs d'Opérations : on coche ses lignes OBJ
await p.evaluate(n => {
  const d = document.querySelector(n + ' .arbre-domaine:has(.case-domaine[value="5e/Opérations"])')
  for (const c of d.querySelectorAll('.case-competence[value^="5e/obj:Opérations/"]:not(:disabled)')) c.click()
}, N5)
const reglageObj = await p.evaluate(n => document.querySelector(n + ' .bilan-texte').textContent, N5)
ok(/^6 lignes cochées/.test(reglageObj), 'M) Les 6 objectifs d\'Opérations cochables sont cochés', reglageObj)
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1200)
const pageM = await p.evaluate(() => window.__app.page)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const bleusM = await p.evaluate(pg => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === '#1f5fbf').length, pageM)
ok(bleusM >= 3, 'M) Un flash sur les objectifs d\'Opérations : la phrase du programme sous chaque exercice', bleusM)
await p.click('.bandeau-flash .fermer').catch(() => {})
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1200)
ok(await nObjets() > 0, 'I) Le flash se lance avec le thème entier')
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- K. La 3e ----------
await p.keyboard.press('Escape').catch(() => {})
await p.click('.bandeau-flash .fermer').catch(() => {})
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
ok(await p.evaluate(() => !document.querySelector('.niveau-flash[data-niveau="3e"]').disabled), 'K) Le niveau 3e n\'est plus grisé')
for (const b of await p.$$('.niveau-flash[aria-pressed=true]')) await b.click()
await p.click('.niveau-flash[data-niveau="3e"]')
// Depuis le 15 novembre 2026, la 3e a l'arbre unique : on ne compte ici que
// les lignes OFFI (les lignes OBJ n'ont pas encore d'exercice)
const grisees3 = await p.evaluate(() => [...document.querySelectorAll('.themes-niveau[data-niveau="3e"] .case-competence:not([value^="3e/obj:"])')].filter(c => c.disabled).length)
const comps3 = await p.evaluate(() => document.querySelectorAll('.themes-niveau[data-niveau="3e"] .case-competence:not([value^="3e/obj:"])').length)
ok(comps3 === 37 && grisees3 === 0, 'K) En 3e, 37 compétences, aucune grisée', { comps3, grisees3 })
// N. Un seul arbre en 3e : pastilles, les lignes OBJ des trois premiers thèmes
// actives (sauf la 6e du calcul littéral), les autres en gris, deux
// domaines « à remplir »
const OBJ_ACTIFS_3E = [['Nombres rationnels', [0, 1, 2]], ['Puissances', [0, 1, 2, 3]], ['Racine carrée', [0, 1]], ['Calcul littéral et algébrique', [0, 1, 2, 3, 4]],
  ['Représentation de l’espace', [0, 1, 2, 3]], ['Triangles', [0, 1]], ['Translations et vecteurs', [0, 1, 2, 3]],
  ['Statistiques', [0, 1, 2, 3, 4]], ['Probabilités', [0, 1, 2]]]
  .flatMap(([d, ks]) => ks.map(k => `3e/obj:${d}/${k}`)).sort().join()
const arbre3 = await p.evaluate(() => {
  const n = document.querySelector('.themes-niveau[data-niveau="3e"]')
  const obj = [...n.querySelectorAll('.case-competence[value^="3e/obj:"]')]
  const pair = n.querySelector('.case-competence[value="3e/Calcul littéral et algébrique/5"]')
  return {
    pastilles: [...n.querySelectorAll('.pastille-filtre')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), obj: obj.length,
    objActives: obj.filter(c => !c.disabled).map(c => c.value),
    vides: [...n.querySelectorAll('.arbre-domaine')].filter(d => /à remplir/.test(d.querySelector('.ligne-arbre').textContent)).length,
    pair: pair && !pair.disabled ? pair.closest('label').querySelector('small')?.textContent : null,
  }
})
ok(arbre3.pastilles.some(t => /^OFFI\s*37/.test(t)) && arbre3.pastilles.some(t => /^OBJ\s*49/.test(t)) && arbre3.obj > 0
  && [...arbre3.objActives].sort().join() === OBJ_ACTIFS_3E && arbre3.vides === 2,
  'N) Un seul arbre en 3e : OFFI 37, OBJ 49, les OBJ de Nombres et calculs, d\'Espace et géométrie et de Données et probabilités actives (sauf l\'analyse-synthèse), deux domaines « à remplir »', arbre3)
ok(Number(arbre3.pair) >= 1, 'N) Le pair et l\'impair (C6) se coche : ses questions de cours, sans exercice', arbre3.pair)
// Les cases de domaine sont repliées sous leur thème : on les coche comme un clic
await p.evaluate(() => {
  for (const c of document.querySelectorAll('.themes-niveau[data-niveau="3e"] .case-domaine:checked')) c.click()
  for (const d of ['3e/Triangles', '3e/Statistiques']) document.querySelector(`.themes-niveau[data-niveau="3e"] .case-domaine[value="${d}"]`).click()
})
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const pageK = await p.evaluate(() => window.__app.page)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const vertsK = await p.evaluate(([v, pg]) => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === v).length, [VERT, pageK])
ok(vertsK >= 5, 'K) Un flash de 3e : 5 questions, corrigées en vert', vertsK)
const bleusK = await p.evaluate(pg => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === '#1f5fbf').length, pageK)
ok(bleusK >= 3, 'K) À la correction, la phrase du programme sous chaque exercice', bleusK)
if (process.env.CAPTURE3) await p.screenshot({ path: process.env.CAPTURE3 })
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- O. Remplacer, correction à la fin ----------
{
  const ctxO = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const o = await ctxO.newPage()
  o.on('pageerror', e => erreurs.push(e.message))
  o.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()) })
  await o.goto(DEV)
  await o.waitForFunction(() => window.__app, null, { timeout: 30000 })
  await o.waitForTimeout(1200)
  const etatO = () => o.evaluate(() => document.querySelector('.etat-flash')?.textContent ?? '')
  const enGrand = () => o.evaluate(() => window.__app.ui.flash?.flash?.enGrand?.slice() ?? null)
  const cocherO = async (niveau, domaine) => {
    const c = `.case-domaine[value="${niveau}/${domaine}"]`
    if (!await o.isVisible(c)) await o.click(`.themes-niveau[data-niveau="${niveau}"] .arbre-theme:has(${c}) > .ligne-arbre > .deplier`)
    await o.click(c)
  }
  await o.click('button[title^="Automatismes"]')
  await o.waitForSelector('dialog.dialogue-flash[open]')
  ok(await o.evaluate(() => document.querySelector('.correction-fin').checked), 'O) « Correction à la fin » est cochée par défaut')
  await cocherO('5e', 'Nombres relatifs'); await cocherO('5e', 'Nombres rationnels')
  await o.fill('.par-question', '10')
  await o.uncheck('.correction-fin')
  await o.click('.dialogue-flash .lancer')
  await o.waitForTimeout(3500)
  const avant = await o.evaluate(() => ({ enonces: [...window.__app.tableau.formesDe(window.__app.page).values()].map(f => f.latex).join('|'), q: window.__app.ui.flash?.flash?.questions?.[0]?.id }))
  const tAvant = await etatO()
  await o.click('.bandeau-flash .remplacer'); await o.waitForTimeout(800)
  const tApres = await etatO()
  const apres = await o.evaluate(() => ({ q: window.__app.ui.flash?.flash?.questions?.[0], deja: window.__app.ui.flash?.flash?.remplacees?.map(x => x.id) }))
  ok(/0:0[0-7]/.test(tAvant) && /0:(09|10)/.test(tApres), 'O) Remplacer : le temps de la question repart du début', { tAvant, tApres })
  ok(apres.q && apres.q.id !== avant.q && apres.q.forme === 'cours' && apres.deja?.[0] === avant.q, 'O) Une autre question de cours, l\'ancienne retenue', { avant: avant.q, apres })
  const ids = await enGrand()
  ok(ids && ids.length > 0 && await o.evaluate(ids => ids.every(id => window.__app.tableau.formesDe(window.__app.page).has(id)), ids), 'O) La nouvelle question est posée en grand')
  await o.keyboard.press('r'); await o.waitForTimeout(800)
  const apres2 = await o.evaluate(() => window.__app.ui.flash?.flash?.questions?.[0]?.id)
  ok(apres2 && apres2 !== apres.q.id && apres2 !== avant.q, 'O) La touche R remplace aussi, sans retomber sur une question déjà venue', { apres2 })
  for (let k = 0; k < 5; k++) { await o.keyboard.press('ArrowRight'); await o.waitForTimeout(400) }
  const fin = await etatO()
  const vertsFin = await o.evaluate(v => [...window.__app.tableau.formesDe(window.__app.page).values()].filter(f => f.couleur === v).length, VERT)
  ok(/Temps écoulé/.test(fin) && vertsFin === 0, 'O) Case décochée : « Temps écoulé », aucune réponse en vert', { fin, vertsFin })
  ok(await o.evaluate(() => !document.querySelector('.bandeau-flash .corriger').hidden && document.querySelector('.bandeau-flash .remplacer').hidden), 'O) … le bouton « Correction » reste, « Remplacer » part')
  await o.keyboard.press('c'); await o.waitForTimeout(800)
  const vertsC = await o.evaluate(v => [...window.__app.tableau.formesDe(window.__app.page).values()].filter(f => f.couleur === v).length, VERT)
  ok(vertsC >= 5, 'O) C montre la correction quand on veut', vertsC)
  await o.click('.bandeau-flash .fermer')
  // Toutes d'un coup
  await o.click('button[title^="Automatismes"]')
  await o.waitForSelector('dialog.dialogue-flash[open]')
  ok(!(await o.evaluate(() => document.querySelector('.correction-fin').checked)), 'O) La case décochée est retenue')
  await o.click('input[name=affichage-flash][value=toutes]')
  await o.click('.dialogue-flash .lancer')
  await o.waitForTimeout(3500)
  const t1 = await etatO()
  await o.keyboard.press('r'); await o.waitForTimeout(300)
  const bandeau = await o.evaluate(() => {
    const b = document.querySelector('.bandeau-flash')
    return { h: b.getBoundingClientRect().height, choix: !document.querySelector('.choix-remplacer').hidden, n: document.querySelectorAll('.choix-remplacer .numero').length }
  })
  ok(bandeau.choix && bandeau.n === 5 && bandeau.h < 70, 'O) Toutes d\'un coup : « Laquelle ? » 1 à 5, sur une seule ligne', bandeau)
  const q3 = await o.evaluate(() => window.__app.ui.flash.flash.questions[2].id)
  await o.keyboard.press('3'); await o.waitForTimeout(800)
  const t2 = await etatO()
  const q3b = await o.evaluate(() => window.__app.ui.flash.flash.questions[2].id)
  const sec = t => { const m = t.match(/(\d+):(\d\d)/); return m ? +m[1] * 60 + +m[2] : -1 }
  ok(q3b !== q3, 'O) La touche 3 remplace la question 3', { q3, q3b })
  ok(sec(t2) <= sec(t1) && sec(t2) > 0, 'O) La minuterie continue (elle ne repart pas du début)', { t1, t2 })
  ok(await o.evaluate(() => document.querySelector('.choix-remplacer').hidden), 'O) Le choix se referme')
  await o.click('.bandeau-flash .fermer')
  await ctxO.close()
}

// ---------- F. ----------
ok(!erreurs.length, 'F) Aucune erreur', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon')
process.exit(echecs ? 1 : 0)
