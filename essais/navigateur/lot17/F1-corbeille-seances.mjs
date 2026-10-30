// ESSAI DU LOT 17 (proposition 7 de l'audit) : la corbeille du classeur
// rangée par séance. Le serveur de développement (port 5173) et, pour la
// version hors ligne, dist/index.html en file:// (npm run build).
// Un classeur fait d'avance dans la bibliothèque (trois séances : il y a cinq
// jours, « Activité d'intro » il y a trois jours (4 pages, deux nommées), et
// la séance du jour, commencée il y a une demi-heure), la séance du milieu
// supprimée depuis la bibliothèque (Suppr sur sa ligne), le classeur ouvert.
// A. Maj + P, Corbeille : « Corbeille du classeur », la note, la case
//    « 30 jours » décochée, UN bloc (le titre, « Supprimée aujourd'hui à … »,
//    quatre vignettes numérotées avec leur nom, « Remettre la séance »,
//    « Supprimer définitivement »), le focus sur « Remettre la séance » ;
// B. « Remettre la séance » : les 4 pages reviennent dans l'ordre, dans leur
//    séance (son nom, sa date), la trieuse la déplie et met le focus sur sa
//    première vignette, le message dit la même chose que la trieuse ;
//    « Annuler » renvoie tout dans la corbeille, le bloc revient ;
// C. Les pages seules : la poubelle sur la page 3 du jour (« Page 3 · séance
//    du jour »), la poubelle sur une page d'une séance passée refusée (on la
//    regarde sans la modifier), une page d'une séance passée jetée par le
//    modèle (« Page 2 · séance de samedi »), la dernière suppression d'abord ;
// D. Rechargée : le même rangement ; le fichier .memc (Ctrl + S) ;
// E. Remettre une page seule : « Page remise dans la séance de … : c'est sa
//    page 2 » (le focus sur sa vignette dans la trieuse), « Page remise :
//    c'est la page 3 » (le focus sur sa carte) ;
// F. « Supprimer définitivement » un bloc : la question (Annuler, Échap),
//    confirmé : « Séance supprimée définitivement (4 pages) », la corbeille
//    vide, la revue les garde sous « Pages jetées » ;
// G. La version hors ligne (file://) : le .memc de D ouvert par Ctrl + O, le
//    même rangement, « Remettre la séance » et « Annuler » ;
// H. Au doigt : iPad (1024 px) et téléphone (390 px) : un bloc par ligne, les
//    boutons de 44 px, rien ne déborde, la rangée de dix vignettes passe à la
//    ligne ; « Remettre la séance » touché ;
// I. Au clavier : Maj + Tab jusqu'au bouton « Corbeille », Entrée, Tab de
//    bouton en bouton (Remettre la séance, Supprimer définitivement, Remettre,
//    Supprimer définitivement), Entrée sur « Supprimer définitivement » (la
//    question, Échap), confirmé : le focus suit le bloc disparu ; Échap (même
//    depuis la case « 30 jours ») ferme la corbeille puis la trieuse ;
// J. La case « 30 jours » : des entrées reculées de 31 jours (le même effet
//    qu'une horloge avancée, et il survit au rechargement) ; décochée : rien ;
//    cochée : le message, rien ne part sur le clic ; à l'ouverture suivante :
//    « 3 pages de plus de 30 jours supprimées définitivement (…) », une page
//    d'hier et une page sans heure restent ; le réglage survit au
//    rechargement (localStorage) et ouvrir le classeur n'écrit rien ;
// K. La séance la plus récente supprimée (depuis la bibliothèque, le classeur
//    ouvert) puis remise : « … Elle redevient la séance du jour. », la grille
//    de la trieuse la montre.
// Une ligne « OK … » ou « ÉCHEC … » par vérification ; code de sortie 1 s'il
// y a un échec ou une erreur JS.
// node F1-corbeille-seances.mjs [section…] : seulement ces sections
// (classeur = A à F, horsligne, appareils, clavier, jours, jour)
import { RACINE_DEPOT, SORTIES } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { existsSync, mkdirSync } from 'node:fs'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
const D = SORTIES + '/lot17'
mkdirSync(D, { recursive: true })
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g|net::|accounts\.google/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
/** Les espaces insécables des messages (« 4 pages », « 9 h 05 ») lus comme des espaces */
const net = t => (t ?? '').replace(/[\u00a0\u202f]/g, ' ')
const H = 3600_000, JOUR = 24 * H

const nav = await chromium.launch()

/** Dans la page : des classeurs faits d'avance, les messages de l'outil */
const OUTILS = () => {
  const trait = (x, id) => ({ id, type: 'trait', x, y: 10, z: Date.now() + Math.random(), auteur: 'essai', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  /** Un classeur fait d'avance dans la bibliothèque : { nom, seances: [{ quand,
   *  nom?, pages, noms? }] } ; chaque page a un trait (un geste à elle) */
  window.__creer = async (o) => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts'), seances = await import('/src/seances.ts')
    const t = new Tableau(null)
    t.seancesActives = true
    const faites = []
    for (const s of o.seances) {
      let h = s.quand
      t.horloge = () => h
      const { seance, page } = t.nouvelleSeance({ t: h, nom: s.nom ?? null }); await Promise.resolve(); t.pageVue = page
      const pages = [page]
      h += 60_000; t.nouveauGeste(); t.poser(page, trait(10, `${seance}-0`)); await Promise.resolve()
      for (let k = 1; k < s.pages; k++) {
        h += 60_000; const q = t.ajouterPage('carreaux', t.ordre.length, { seance }); pages.push(q); await Promise.resolve(); t.pageVue = q
        h += 60_000; t.nouveauGeste(); t.poser(q, trait(20 + k, `${seance}-${k}`)); await Promise.resolve()
      }
      for (const [i, nom] of Object.entries(s.noms ?? {})) t.renommerPage(pages[Number(i)], nom)
      faites.push({ id: seance, pages, debut: s.quand, nom: s.nom ?? null })
    }
    await new Promise(f => setTimeout(f, 20))
    const { etat } = fichier.lireTableau(new Uint8Array(await fichier.ecrireTableau(t.doc).arrayBuffer()))
    const rangees = t.seancesDuClasseur()
    const id = dem.idClasseur(), nom = o.nom
    const fiche = { id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: o.seances[0].quand, modifie: Date.now() - 600e3, ouvert: 0, pages: t.ordre.length, seances: rangees.length, listeSeances: seances.resumeDesSeances(rangees) }
    t.doc.destroy()
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
    return { id, faites }
  }
  /** Les messages de l'outil, dans l'ordre (ui.message enveloppée) */
  window.__pret = () => {
    const a = window.__app
    if (!a || a.ui.__essai) return
    const m = a.ui.message.bind(a.ui)
    a.ui.__essai = true
    window.__msgs = window.__msgs || []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  }
  /** Supprimer une séance du classeur ouvert, par le modèle (comme la
   *  bibliothèque le fait sur le classeur de l'onglet) */
  window.__supprimerSeance = async (id) => { const dep = await import('/src/deplacer-seance.ts'); return dep.supprimerSeance(window.__app.tableau, id) }
  /** Les textes des séances, pour les attentes */
  window.__textes = async (s) => { const m = await import('/src/seances.ts'); return { libelle: m.libelleSeance(s), courte: m.dateCourteMajuscule(s.debut), de: m.deLaSeance(s, Date.now()) } }
}

const ETAT = () => {
  const a = window.__app, t = a.tableau
  const net = s => (s ?? '').replace(/[\u00a0\u202f]/g, ' ')
  const tr = document.querySelector('.trieuse'), co = document.querySelector('.trieuse-corbeille'), bc = document.querySelector('.trieuse-bouton-corbeille')
  const act = document.activeElement, d = document.querySelector('dialog[open]')
  const boutons = li => [...li.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { texte: b.textContent, nom: net(b.getAttribute('aria-label')), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right) } })
  const ligne = li => li.classList.contains('bloc-corbeille')
    ? { genre: 'seance', cle: li.dataset.cle, seance: li.dataset.seance, titre: net(li.querySelector('.bloc-corbeille-titre').textContent), date: net(li.querySelector('.corbeille-date').textContent),
        vignettes: [...li.querySelectorAll('.corbeille-vignette')].map(v => ({ page: v.dataset.page, numero: v.querySelector('.numero').textContent, nom: v.querySelector('.nom')?.textContent ?? null, canevas: !!v.querySelector('canvas') })),
        boutons: boutons(li), label: net(li.getAttribute('aria-label')) }
    : { genre: 'page', cle: li.dataset.cle, page: li.dataset.page, nom: li.querySelector('.corbeille-nom').textContent, ou: net(li.querySelector('.corbeille-ou').textContent), inconnue: li.querySelector('.corbeille-ou').classList.contains('inconnue'),
        date: net(li.querySelector('.corbeille-date').textContent), canevas: !!li.querySelector('canvas'), boutons: boutons(li), label: net(li.getAttribute('aria-label')) }
  return {
    trieuse: !!tr && !tr.hidden, corbeille: !!co && !co.hidden,
    page: a.page, pages: a.pages.slice(), ordre: t.ordre.toArray(), passee: a.enSeancePassee,
    dans: t.pagesDeLaCorbeille().map(x => x.id), entrees: t.etatDesPages().corbeille,
    seances: t.seancesDuClasseur().map(s => ({ id: s.id, nom: s.nom ?? null, debut: s.debut, pages: s.pages.slice(), rang: s.rang ?? null })),
    jour: t.derniereSeance()?.id ?? null,
    bouton: bc ? { texte: net(bc.textContent), nom: net(bc.getAttribute('aria-label')) } : null,
    titre: net(co?.querySelector('h2')?.textContent), note: net(co?.querySelector('.corbeille-note')?.textContent),
    option: { texte: net(co?.querySelector('.corbeille-option span')?.textContent), cochee: co?.querySelector('.corbeille-case-30')?.checked ?? null },
    lignes: co ? [...co.querySelectorAll('.corbeille-grille > li')].map(ligne) : [],
    vide: co ? !co.querySelector('.corbeille-vide').hidden : null, vider: co?.querySelector('.corbeille-vider')?.disabled ?? null,
    focus: net(act?.getAttribute?.('aria-label') || act?.textContent || ''), focusTexte: net(act?.textContent ?? ''), focusClasse: act?.className ?? '',
    focusPage: act?.dataset?.page ?? act?.closest?.('[data-page]')?.dataset.page ?? null, focusCle: act?.closest?.('[data-cle]')?.dataset.cle ?? null,
    question: d ? { classe: d.className, titre: d.querySelector('h2')?.textContent, texte: net(d.querySelector('p')?.textContent), boutons: [...d.querySelectorAll('button')].map(b => b.textContent) } : null,
    msgs: (window.__msgs || []).map(net),
    action: [...document.querySelectorAll('.toast button.action')].filter(x => x.closest('.toast').classList.contains('visible')).map(x => x.textContent),
    depliees: [...document.querySelectorAll('.trieuse-une-seance')].map(x => ({ seance: x.dataset.seance, open: x.open, resume: net(x.querySelector('summary')?.textContent) })),
    grille: [...document.querySelectorAll('.trieuse-grille .carte[data-page]')].map(c => c.dataset.page),
    reglage: (() => { try { return localStorage.getItem('mem-corbeille-30-jours') } catch { return null } })(),
  }
}
const etat = p => p.evaluate(ETAT)
const dernier = e => e.msgs.at(-1) ?? ''
const trieuseOuverte = p => p.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 3000 }).then(() => true, () => false)
async function ouvrirCorbeille(p) {
  if (!await p.evaluate(() => !document.querySelector('.trieuse')?.hidden)) { await p.keyboard.press('Shift+P'); await trieuseOuverte(p); await p.waitForTimeout(200) }
  await p.click('.trieuse-bouton-corbeille'); await p.waitForTimeout(300)
}
async function fermerTout(p) {
  for (let i = 0; i < 4 && await p.evaluate(() => !document.querySelector('.trieuse')?.hidden || !!document.querySelector('dialog[open]')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(120) }
}
const annuler = async p => { await p.click('.toast.visible button.action:has-text("Annuler")'); await p.waitForTimeout(300) }

async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await ctx.addInitScript(OUTILS)
  return ctx
}
async function pret(p) {
  await p.waitForFunction(() => window.__app?.page && window.__registre && document.querySelector('.rang')?.textContent, null, { timeout: 15000 })
  await p.waitForTimeout(300)
  await p.evaluate(() => window.__pret())
}
async function ouvrir(ctx, nom) {
  const p = await ctx.newPage()
  surveiller(p, nom)
  await p.goto(DEV)
  await pret(p)
  return p
}
/** Aujourd'hui à 8 h (les séances passées y commencent) */
const base = (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d.getTime() })()
const SEANCES = () => [
  { quand: base - 5 * JOUR, pages: 2 },
  { quand: base - 3 * JOUR, nom: 'Activité d\'intro', pages: 4, noms: { 0: 'Exercice 12 p. 84', 2: 'Problème' } },
  { quand: Date.now() - 30 * 60_000, pages: 3 },
]
/** Un classeur fait d'avance (voir OUTILS), les séances d'indices `supprimer`
 *  supprimées depuis la bibliothèque (Suppr sur leur ligne), puis ouvert sur
 *  sa dernière séance (sa ligne dans la bibliothèque) */
async function classeur(p, nom, liste, o = {}) {
  const r = await p.evaluate(o => window.__creer(o), { nom, seances: liste })
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(300)
  const carte = `.grille-classeurs:not(.recents) .case-classeur[data-cle="${r.id}"]`
  if (await p.getAttribute(carte + ' .carte-seances-bascule', 'aria-expanded') !== 'true') { await p.click(carte + ' .carte-seances-bascule'); await p.waitForTimeout(200) }
  const messages = []
  for (const k of o.supprimer ?? []) {
    await p.focus(`${carte} .carte-seance-ligne[data-seance="${r.faites[k].id}"] .carte-seance`)
    await p.keyboard.press('Delete')
    await p.waitForFunction(() => !window.__bibliotheque.seancesOccupees, null, { timeout: 15000 }); await p.waitForTimeout(300)
    messages.push(...(await p.evaluate(() => (window.__msgs || []).splice(0))).map(net))
  }
  const derniere = r.faites.filter((_, k) => !(o.supprimer ?? []).includes(k)).at(-1)
  await p.click(`${carte} .carte-seance-ligne[data-seance="${derniere.id}"] .carte-seance`)
  await p.waitForFunction(() => window.__app?.page && !window.__bibliotheque?.ouvert, null, { timeout: 15000 })
  await p.waitForTimeout(600)
  await pret(p)
  return { id: r.id, S: r.faites, carte, messages }
}
const textes = async (p, s) => { const t = await p.evaluate(s => window.__textes(s), { debut: s.debut, nom: s.nom }); return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, net(v)])) }
/** Le tiroir « Que revoir ? » de la revue : ses sections et leurs lignes */
async function lireTiroir(p) {
  await p.click('button[title^="Revoir la construction"]'); await p.waitForTimeout(300)
  await p.getByRole('button', { name: /^Que revoir/ }).click(); await p.waitForTimeout(200)
  const t = await p.evaluate(() => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[\u00a0\u202f]/g, ' ')) })))
  for (let i = 0; i < 4 && await p.evaluate(() => window.__app.enLecture); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150) }
  return t
}
const BLOC = (nom, n) => new RegExp(`^${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} · [^·]+ · ${n} pages$`)
let fichierMemc = null

// =============== A à F. Le classeur, à la souris ===============
if (faire('classeur') || faire('horsligne')) {
  const ctx = await contexte()
  const p = await ouvrir(ctx, 'classeur')
  const { S, messages } = await classeur(p, 'Fractions', SEANCES(), { supprimer: [1] })
  const [S0, S1, S2] = S
  let e = await etat(p)
  verifier('La bibliothèque : « La séance « Activité d\'intro » est supprimée : ses pages sont dans la corbeille du classeur (Maj + P, Corbeille). »',
    messages.some(m => m === 'La séance « Activité d\'intro » est supprimée : ses pages sont dans la corbeille du classeur (Maj + P, Corbeille).'), messages)
  verifier('Le classeur s\'ouvre sur sa séance du jour (3 pages), les 4 pages de la séance supprimée dans la corbeille',
    !e.passee && e.pages.length === 3 && e.dans.length === 4 && S1.pages.every(id => e.dans.includes(id)) && e.jour === S2.id, { pages: e.pages, dans: e.dans })

  // ---------- A. Le bloc ----------
  await ouvrirCorbeille(p)
  e = await etat(p)
  const tx1 = await textes(p, S1)
  verifier('A) Maj + P, Corbeille : « Corbeille du classeur », la note, le bouton « Corbeille (4) » nommé « Corbeille du classeur : 4 pages »',
    e.corbeille && e.titre === 'Corbeille du classeur' && e.bouton.texte === 'Corbeille (4)' && e.bouton.nom === 'Corbeille du classeur : 4 pages'
    && e.note === 'Les séances et les pages supprimées de ce classeur attendent ici : Remettre les rend à leur place, avec toute leur histoire. Les classeurs supprimés, eux, sont dans la corbeille de la bibliothèque.', e)
  verifier('… la case « Vider tout seul ce qui est ici depuis plus de 30 jours », décochée', e.option.texte === 'Vider tout seul ce qui est ici depuis plus de 30 jours' && e.option.cochee === false && e.reglage === null, { o: e.option, r: e.reglage })
  const b = e.lignes[0]
  verifier('… un seul bloc : « Activité d\'intro · <date> · 4 pages », « Supprimée aujourd\'hui à … », la séance connue',
    e.lignes.length === 1 && b?.genre === 'seance' && b.seance === S1.id && b.titre === `Activité d'intro · ${tx1.courte} · 4 pages` && BLOC('Activité d\'intro', 4).test(b.titre)
    && /^Supprimée aujourd'hui à \d{1,2} h \d{2}$/.test(b.date), b)
  await p.waitForFunction(() => [...document.querySelectorAll('.bloc-corbeille canvas')].every(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 120) return true; return false }), null, { timeout: 5000 }).catch(() => {})
  const peintes = await p.evaluate(() => [...document.querySelectorAll('.bloc-corbeille canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 120) return true; return false }))
  verifier('… ses quatre vignettes numérotées 1 à 4, dans l\'ordre des pages, les noms sous la 1 et la 3, peintes',
    b?.vignettes.map(v => v.page).join() === S1.pages.join() && b.vignettes.map(v => v.numero).join() === '1,2,3,4' && b.vignettes[0].nom === 'Exercice 12 p. 84' && b.vignettes[1].nom === null && b.vignettes[2].nom === 'Problème'
    && peintes.length === 4 && peintes.every(Boolean), { v: b?.vignettes, peintes })
  verifier('… « Remettre la séance » et « Supprimer définitivement », nommés pour un lecteur d\'écran ; le focus sur « Remettre la séance »',
    b?.boutons.map(x => x.texte).join('|') === 'Remettre la séance|Supprimer définitivement' && b.boutons[0].nom === 'Remettre la séance « Activité d\'intro » (4 pages) parmi les pages'
    && b.boutons[1].nom === 'Supprimer définitivement la séance « Activité d\'intro » (4 pages)' && e.focusTexte === 'Remettre la séance' && e.focusCle === b.cle && e.vider === false, { b: b?.boutons, f: e.focus })
  await p.screenshot({ path: D + '/A-bloc.png' })

  // ---------- B. Remettre la séance, Annuler ----------
  await p.click('.bloc-corbeille .corbeille-remettre'); await p.waitForTimeout(400)
  e = await etat(p)
  const s1 = e.seances.find(s => s.id === S1.id)
  verifier('B) « Remettre la séance » : les 4 pages reviennent dans l\'ordre, dans leur séance, avec son nom ; « Séance remise : « Activité d\'intro » (4 pages) » avec Annuler',
    !e.corbeille && e.trieuse && s1?.pages.join() === S1.pages.join() && s1.nom === 'Activité d\'intro' && e.dans.length === 0 && e.jour === S2.id
    && dernier(e) === 'Séance remise : « Activité d\'intro » (4 pages)' && e.action.includes('Annuler') && e.bouton.nom === 'Corbeille du classeur : vide', { s1, m: dernier(e), a: e.action })
  const d1 = e.depliees.find(x => x.seance === S1.id)
  verifier('… la trieuse la déplie, le focus sur sa première vignette ; son résumé dit la même chose que le bloc',
    d1?.open === true && e.focusClasse.includes('trieuse-vignette-passee') && e.focusPage === S1.pages[0] && d1.resume === b?.titre, { d1, f: [e.focusClasse, e.focusPage], b: b?.titre })
  await p.screenshot({ path: D + '/B-remise.png' })
  await annuler(p)
  e = await etat(p)
  verifier('… « Annuler » : les 4 pages retournent dans la corbeille (« Annulé : séance remise »)', e.dans.length === 4 && S1.pages.every(id => e.dans.includes(id)) && e.seances.find(s => s.id === S1.id)?.pages.length === 0 && dernier(e) === 'Annulé : séance remise', { dans: e.dans, m: dernier(e) })
  await ouvrirCorbeille(p)
  e = await etat(p)
  verifier('… la corbeille montre de nouveau le bloc, tel quel', e.lignes.length === 1 && e.lignes[0].cle === b?.cle && e.lignes[0].titre === b?.titre && e.lignes[0].vignettes.length === 4, e.lignes)
  await fermerTout(p)

  // ---------- C. Les pages seules ----------
  await p.evaluate(id => window.__app.allerPage(id), S2.pages[2]); await p.waitForTimeout(700)
  await p.click('.barre-haut button[aria-label="Supprimer cette page"]'); await p.waitForTimeout(300)
  e = await etat(p)
  verifier('C) La poubelle sur la page 3 du jour : « Page 3 supprimée » avec Annuler', dernier(e) === 'Page 3 supprimée' && e.action.includes('Annuler') && e.dans.includes(S2.pages[2]) && e.pages.length === 2, { m: dernier(e), pages: e.pages })
  await p.evaluate(id => window.__app.allerPage(id), S0.pages[0]); await p.waitForTimeout(700)
  const avant = await etat(p)
  await p.click('.barre-haut button[aria-label="Supprimer cette page"]'); await p.waitForTimeout(300)
  e = await etat(p)
  const tx0 = await textes(p, S0)
  verifier('… la poubelle sur une page d\'une séance passée : refusée (« Séance de … : vous la regardez sans la modifier. »), rien ne bouge',
    avant.passee && dernier(e) === `Séance ${tx0.de} : vous la regardez sans la modifier.` && e.ordre.join() === avant.ordre.join() && e.dans.length === 5, { m: dernier(e), de: tx0.de })
  // Une page d'une séance passée jetée par le modèle (la trieuse ne le fait pas sur une séance passée)
  await p.evaluate(id => window.__app.tableau.jeterPages([id]), S0.pages[1]); await p.waitForTimeout(200)
  await ouvrirCorbeille(p)
  e = await etat(p)
  verifier('… la corbeille : la page de la séance passée, la page du jour, puis le bloc (la dernière suppression d\'abord)',
    e.lignes.map(l => l.cle).join() === [S0.pages[1], S2.pages[2], 'seance:' + S1.id].join() && e.lignes.map(l => l.genre).join() === 'page,page,seance' && e.bouton.texte === 'Corbeille (6)', e.lignes.map(l => [l.genre, l.cle]))
  verifier(`… « Page 2 · séance ${tx0.de} » et « Page 3 · séance du jour », « Page sans nom », leur date, leur nom pour un lecteur d'écran`,
    e.lignes[0]?.ou === `Page 2 · séance ${tx0.de}` && e.lignes[1]?.ou === 'Page 3 · séance du jour' && e.lignes.slice(0, 2).every(l => l.nom === 'Page sans nom' && !l.inconnue && /^Supprimée aujourd'hui à \d{1,2} h \d{2}$/.test(l.date) && l.canevas)
    && e.lignes[1].label === `Page sans nom, page 3 · séance du jour, ${e.lignes[1].date.charAt(0).toLowerCase()}${e.lignes[1].date.slice(1)}`, e.lignes.slice(0, 2))
  await p.screenshot({ path: D + '/C-pages-seules.png' })
  const cles = e.lignes.map(l => l.cle)

  // ---------- D. Rechargée, le fichier .memc ----------
  await fermerTout(p)
  await p.reload(); await pret(p)
  await ouvrirCorbeille(p)
  e = await etat(p)
  verifier('D) Rechargée : le même rangement (les trois lignes, le bloc et ses vignettes, les sous-titres)',
    e.lignes.map(l => l.cle).join() === cles.join() && e.lignes[2].vignettes.length === 4 && e.lignes[0].ou === `Page 2 · séance ${tx0.de}` && e.lignes[1].ou === 'Page 3 · séance du jour', e.lignes.map(l => [l.cle, l.ou ?? l.titre]))
  await fermerTout(p)
  await p.evaluate(() => { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined })
  const attente = p.waitForEvent('download', { timeout: 10000 })
  await p.keyboard.press('Control+s')
  const dl = await attente
  fichierMemc = D + '/' + dl.suggestedFilename()
  await dl.saveAs(fichierMemc)
  verifier('… Ctrl + S : le classeur dans un fichier .memc', /\.memc$/.test(fichierMemc) && existsSync(fichierMemc), fichierMemc)

  // ---------- E. Remettre une page seule ----------
  await ouvrirCorbeille(p)
  await p.click(`.carte-corbeille[data-page="${S0.pages[1]}"] .corbeille-remettre`); await p.waitForTimeout(400)
  e = await etat(p)
  verifier(`E) Remettre la page de la séance passée : « Page remise dans la séance ${tx0.de} : c'est sa page 2 », à sa place, le focus sur sa vignette dans la trieuse`,
    !e.corbeille && e.trieuse && dernier(e) === `Page remise dans la séance ${tx0.de} : c'est sa page 2` && e.action.includes('Annuler')
    && e.seances.find(s => s.id === S0.id)?.pages.join() === S0.pages.join() && e.focusClasse.includes('trieuse-vignette-passee') && e.focusPage === S0.pages[1]
    && e.depliees.find(x => x.seance === S0.id)?.open === true, { m: dernier(e), f: [e.focusClasse, e.focusPage], d: e.depliees })
  await ouvrirCorbeille(p)
  await p.click(`.carte-corbeille[data-page="${S2.pages[2]}"] .corbeille-remettre`); await p.waitForTimeout(400)
  e = await etat(p)
  verifier('… remettre la page du jour : « Page remise : c\'est la page 3 », le focus sur sa carte dans la grille',
    !e.corbeille && dernier(e) === 'Page remise : c\'est la page 3' && e.pages.join() === S2.pages.join() && e.focusPage === S2.pages[2] && e.grille.join() === S2.pages.join(), { m: dernier(e), f: e.focusPage, pages: e.pages })

  // ---------- F. Supprimer définitivement un bloc ----------
  await ouvrirCorbeille(p)
  await p.click('.bloc-corbeille .corbeille-supprimer'); await p.waitForTimeout(200)
  e = await etat(p)
  verifier('F) « Supprimer définitivement » le bloc : la question « Supprimer définitivement cette séance ? », son texte, Annuler d\'abord',
    e.question?.titre === 'Supprimer définitivement cette séance ?' && e.question.texte === 'Ses 4 pages ne pourront plus être remises parmi les pages. Leur histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).'
    && e.question.boutons.join('|') === 'Annuler|Supprimer définitivement' && e.focus === 'Annuler', e.question)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  e = await etat(p)
  verifier('… Échap : la question se ferme, le bloc est toujours là, le focus revient sur son bouton', !e.question && e.corbeille && e.lignes.length === 1 && e.lignes[0].genre === 'seance' && /^Supprimer définitivement la séance/.test(e.focus), { f: e.focus, n: e.lignes.length })
  await p.click('.bloc-corbeille .corbeille-supprimer'); await p.waitForTimeout(200)
  await p.click('dialog[open] [data-a="oui"]'); await p.waitForTimeout(300)
  e = await etat(p)
  verifier('… confirmé : « Séance supprimée définitivement (4 pages) » sans Annuler, la corbeille vide, les 4 pages définitives, le focus sur « Pages »',
    dernier(e) === 'Séance supprimée définitivement (4 pages)' && !e.action.includes('Annuler') && e.vide && e.dans.length === 0 && S1.pages.every(id => e.entrees[id]?.definitif === true)
    && e.bouton.nom === 'Corbeille du classeur : vide' && e.focus === 'Revenir aux pages', { m: dernier(e), f: e.focus, dans: e.dans })
  await fermerTout(p)
  const tiroir = await lireTiroir(p)
  const jetees = tiroir.find(s => s.h === 'Pages jetées')
  verifier('… la revue les garde sous « Pages jetées » (4 pages, avec leur histoire)', jetees && jetees.lignes.length === 4 && jetees.lignes.every(l => /^Page jetée.*· \d+ gestes?$/.test(l)), tiroir)
  await ctx.close()
}

// =============== G. La version hors ligne (file://) ===============
if (faire('horsligne')) {
  const UN = RACINE_DEPOT + '/dist/index.html'
  if (!existsSync(UN)) verifier('dist/index.html existe (npm run build)', false)
  else if (!fichierMemc) verifier('Le fichier .memc de la section D', false)
  else {
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
    // « Ouvrir un classeur » par le choix de fichier d'avant (pas showOpenFilePicker, que Chromium
    // sans fenêtre refuse) ; la première fenêtre (lot 4) : « Remplacer « … »… », puis celle du lot 1
    await ctx.addInitScript(() => {
      window.showOpenFilePicker = undefined
      new MutationObserver(() => { const b = document.querySelector('dialog[open] [data-a="remplacer-ouvert"]'); if (b) b.click() }).observe(document, { childList: true, subtree: true })
    })
    const q = await ctx.newPage()
    surveiller(q, 'file://')
    const avant = erreurs.length
    await q.goto('file://' + UN)
    await q.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await q.waitForTimeout(400)
    const fc = q.waitForEvent('filechooser', { timeout: 5000 })
    await q.keyboard.press('Control+o')
    await (await fc).setFiles(fichierMemc)
    await q.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 5000 })
    await Promise.all([q.waitForEvent('load'), q.click('dialog[open] [data-a="remplacer"]')])
    await q.waitForFunction(() => document.querySelector('.rang')?.textContent, null, { timeout: 15000 })
    await q.waitForTimeout(500)
    await q.keyboard.press('Shift+P'); await trieuseOuverte(q); await q.waitForTimeout(200)
    await q.click('.trieuse-bouton-corbeille'); await q.waitForTimeout(400)
    const LIRE = () => {
      const net = s => (s ?? '').replace(/[\u00a0\u202f]/g, ' ')
      const co = document.querySelector('.trieuse-corbeille')
      return { ouverte: !!co && !co.hidden, titre: co?.querySelector('h2')?.textContent, case: co?.querySelector('.corbeille-case-30')?.checked ?? null, bouton: net(document.querySelector('.trieuse-bouton-corbeille')?.textContent),
        lignes: [...(co?.querySelectorAll('.corbeille-grille > li') ?? [])].map(li => ({ classe: li.className, cle: li.dataset.cle, titre: net(li.querySelector('.bloc-corbeille-titre')?.textContent), ou: net(li.querySelector('.corbeille-ou')?.textContent), vignettes: li.querySelectorAll('.corbeille-vignette').length })),
        toasts: [...document.querySelectorAll('.toast.visible')].map(x => net(x.textContent)), depliees: [...document.querySelectorAll('.trieuse-une-seance')].map(x => [x.dataset.seance, x.open]) }
    }
    let l = await q.evaluate(LIRE)
    verifier('G) Version hors ligne : le .memc ouvert (Ctrl + O), Maj + P, Corbeille : le même rangement (une page de la séance passée, la page du jour, le bloc de 4 vignettes), la case « 30 jours »',
      l.ouverte && l.titre === 'Corbeille du classeur' && l.case === false && l.bouton === 'Corbeille (6)' && l.lignes.length === 3 && l.lignes[0].classe === 'carte-corbeille' && /^Page 2 · séance /.test(l.lignes[0].ou)
      && l.lignes[1].ou === 'Page 3 · séance du jour' && l.lignes[2].classe === 'bloc-corbeille' && BLOC('Activité d\'intro', 4).test(l.lignes[2].titre) && l.lignes[2].vignettes === 4, l)
    await q.screenshot({ path: D + '/G-hors-ligne.png' })
    await q.click('.bloc-corbeille .corbeille-remettre'); await q.waitForTimeout(400)
    l = await q.evaluate(LIRE)
    verifier('… « Remettre la séance » : « Séance remise : « Activité d\'intro » (4 pages) » avec Annuler, la séance dépliée dans la trieuse',
      !l.ouverte && l.toasts.some(t => t.startsWith('Séance remise : « Activité d\'intro » (4 pages)') && t.includes('Annuler')) && l.depliees.some(([, o]) => o === true), l)
    await q.click('.toast.visible button.action:has-text("Annuler")'); await q.waitForTimeout(300)
    await q.click('.trieuse-bouton-corbeille'); await q.waitForTimeout(400)
    l = await q.evaluate(LIRE)
    verifier('… « Annuler » : le bloc est de retour dans la corbeille', l.ouverte && l.lignes.length === 3 && l.lignes[2].classe === 'bloc-corbeille' && l.lignes[2].vignettes === 4, l.lignes)
    verifier('… aucune erreur JS en file://', erreurs.length === avant, erreurs.slice(avant))
    await ctx.close()
  }
}

// =============== H. Au doigt : iPad, téléphone ===============
if (faire('appareils')) {
  for (const [nom, vp, n] of [['iPad', { width: 1024, height: 768 }, 4], ['téléphone', { width: 390, height: 844 }, 10]]) {
    const ctx = await contexte({ viewport: vp, hasTouch: true, isMobile: nom === 'téléphone', deviceScaleFactor: 2 })
    const p = await ouvrir(ctx, nom)
    const liste = SEANCES(); liste[1].pages = n
    const { S } = await classeur(p, 'Symetrie', liste)
    // Deux séances supprimées (deux blocs) et une page du jour jetée : par le modèle, sur le classeur ouvert
    await p.evaluate(async ([a, b, page]) => { await window.__supprimerSeance(a); await window.__supprimerSeance(b); window.__app.tableau.jeterPages([page]) }, [S[0].id, S[1].id, S[2].pages[1]])
    await p.waitForTimeout(300)
    // Le toucher : l'élément amené dans l'écran d'abord (au téléphone, la liste défile)
    const tap = async sel => { const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(250) }
    await tap('.rang'); await trieuseOuverte(p); await p.waitForTimeout(250)
    await tap('.trieuse-bouton-corbeille'); await p.waitForTimeout(600)
    let e = await etat(p)
    const mesures = await p.evaluate(() => {
      const W = innerWidth, g = document.querySelector('.corbeille-grille').getBoundingClientRect()
      const hors = [...document.querySelectorAll('.trieuse-corbeille *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.left < -0.5 || r.right > W + 0.5) }).map(el => el.className + ' ' + Math.round(el.getBoundingClientRect().right))
      const blocs = [...document.querySelectorAll('.bloc-corbeille')].map(b => { const r = b.getBoundingClientRect(); const p = b.querySelector('.bloc-corbeille-pages').getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), top: Math.round(r.top), hPages: Math.round(p.height), boutons: [...b.querySelectorAll('button')].map(x => { const q = x.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right), Math.round(q.height)] }) } })
      return { W, sw: document.documentElement.scrollWidth, g: [Math.round(g.left), Math.round(g.right)], hors: hors.slice(0, 6), blocs, boutons: [...document.querySelectorAll('.trieuse-corbeille button')].map(b => { const r = b.getBoundingClientRect(); return [b.textContent.trim().slice(0, 12), Math.round(r.height), Math.round(r.width)] }) }
    })
    verifier(`${nom} : la corbeille au doigt : une page seule puis deux blocs, chaque bloc sur sa ligne (toute la largeur), rien ne déborde`,
      e.corbeille && e.lignes.map(l => l.genre).join() === 'page,seance,seance' && mesures.blocs.length === 2 && mesures.blocs[1].top > mesures.blocs[0].top + 40
      && mesures.blocs.every(b => b.l <= mesures.g[0] + 24 && b.r >= mesures.g[1] - 24) && mesures.sw <= mesures.W && mesures.hors.length === 0, mesures)
    verifier(`${nom} : chaque bouton fait 44 px de haut au moins${nom === 'téléphone' ? ', ceux des blocs sur toute la largeur du bloc' : ''}`,
      mesures.boutons.every(b => b[1] >= 44 && b[2] >= 44) && (nom !== 'téléphone' || mesures.blocs.every(b => b.boutons.every(x => x[0] <= b.l + 20 && x[1] >= b.r - 20))), mesures)
    const dix = e.lignes.find(l => l.seance === S[1].id)
    verifier(`${nom} : le bloc de ${n} vignettes les montre toutes${n > 4 ? ', sur plusieurs rangées' : ''}`, dix?.vignettes.length === n && (n <= 4 || mesures.blocs.some(b => b.hPages > 160)), { v: dix?.vignettes.length, blocs: mesures.blocs })
    await p.screenshot({ path: D + `/H-${nom === 'iPad' ? 'ipad' : 'telephone'}.png` })
    await tap('.bloc-corbeille .corbeille-supprimer')
    e = await etat(p)
    const question = !!e.question
    await tap('dialog[open] [data-a="annuler"]')
    e = await etat(p)
    verifier(`${nom} : « Supprimer définitivement » puis « Annuler » touchés : rien ne change`, question && !e.question && e.lignes.length === 3, e.lignes.length)
    await tap('.bloc-corbeille .corbeille-remettre')
    e = await etat(p)
    verifier(`${nom} : « Remettre la séance » touché : la séance revient, on revient aux pages`, !e.corbeille && e.trieuse && /^Séance remise : « Activité d'intro » \(\d+ pages\)$/.test(dernier(e)) && e.seances.find(s => s.id === S[1].id)?.pages.length === n, { m: dernier(e) })
    await ctx.close()
  }
}

// =============== I. Au clavier ===============
if (faire('clavier')) {
  const ctx = await contexte()
  const p = await ouvrir(ctx, 'clavier')
  const { S } = await classeur(p, 'Clavier', [{ quand: base - 3 * JOUR, nom: 'Activité d\'intro', pages: 2 }, { quand: Date.now() - 30 * 60_000, pages: 3 }])
  // La page 2 du jour jetée d'abord, la séance ensuite : le bloc est en tête
  await p.evaluate(async ([page, s]) => { window.__app.tableau.jeterPages([page]); await new Promise(f => setTimeout(f, 30)); await window.__supprimerSeance(s) }, [S[1].pages[1], S[0].id])
  await p.waitForTimeout(300)
  await p.keyboard.press('Shift+P'); await trieuseOuverte(p); await p.waitForTimeout(200)
  await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Shift+Tab'); await p.waitForTimeout(60)
  let e = await etat(p)
  const surBouton = e.focus === 'Corbeille du classeur : 3 pages'
  await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  e = await etat(p)
  verifier('I) Maj + Tab mène au bouton « Corbeille du classeur : 3 pages », Entrée l\'ouvre, le focus sur « Remettre la séance » du bloc en tête',
    surBouton && e.corbeille && e.lignes.map(l => l.genre).join() === 'seance,page' && e.focusTexte === 'Remettre la séance' && e.focusCle === e.lignes[0].cle, { surBouton, f: e.focus, l: e.lignes.map(l => l.genre) })
  const ordreTab = []
  for (let i = 0; i < 4; i++) { ordreTab.push((await etat(p)).focusTexte); await p.keyboard.press('Tab'); await p.waitForTimeout(30) }
  verifier('… Tab parcourt les boutons : Remettre la séance, Supprimer définitivement, Remettre, Supprimer définitivement', ordreTab.join('|') === 'Remettre la séance|Supprimer définitivement|Remettre|Supprimer définitivement', ordreTab)
  await p.locator('.bloc-corbeille .corbeille-supprimer').focus()
  await p.keyboard.press('Enter'); await p.waitForTimeout(200)
  e = await etat(p)
  const question = !!e.question && e.focus === 'Annuler'
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  e = await etat(p)
  verifier('… Entrée sur « Supprimer définitivement » du bloc : la question (focus sur Annuler) ; Échap la ferme, la corbeille reste, le focus revient', question && !e.question && e.corbeille && e.lignes.length === 2 && /^Supprimer définitivement la séance/.test(e.focus), { question, f: e.focus })
  await p.keyboard.press('Enter'); await p.waitForTimeout(200)
  await p.keyboard.press('Tab'); await p.waitForTimeout(50)
  e = await etat(p)
  const surOui = e.focusTexte === 'Supprimer définitivement' && !!e.question
  await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  e = await etat(p)
  verifier('… Entrée, Tab, Entrée : confirmé ; le bloc s\'en va et le focus suit, sur « Supprimer définitivement » de la page suivante',
    surOui && !e.question && dernier(e) === 'Séance supprimée définitivement (2 pages)' && e.lignes.length === 1 && e.lignes[0].genre === 'page' && e.focusTexte === 'Supprimer définitivement' && e.focusCle === S[1].pages[1], { surOui, f: [e.focus, e.focusCle], m: dernier(e) })
  await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  e = await etat(p)
  verifier('… Maj + Tab, Entrée sur « Remettre » : la page revient, sa carte a le focus dans la grille', !e.corbeille && e.pages.join() === S[1].pages.join() && e.focusPage === S[1].pages[1] && dernier(e) === 'Page remise : c\'est la page 2', { f: e.focusPage, m: dernier(e) })
  await ouvrirCorbeille(p)
  // Le focus sur la case « 30 jours » : Échap ramène aux pages de là aussi
  await p.focus('.corbeille-case-30')
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  e = await etat(p)
  const retour = !e.corbeille && e.trieuse && e.focus === 'Corbeille du classeur : vide'
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  e = await etat(p)
  verifier('… Échap depuis la case « 30 jours » : la corbeille (vide) revient aux pages, le focus sur le bouton « Corbeille du classeur : vide » ; Échap ferme la trieuse', retour && !e.trieuse, { retour, t: e.trieuse })
  await ctx.close()
}

// =============== J. La case « 30 jours » ===============
if (faire('jours')) {
  const ctx = await contexte()
  const p = await ouvrir(ctx, '30 jours')
  const { S, id } = await classeur(p, 'Trente', [{ quand: base - 3 * JOUR, nom: 'Activité d\'intro', pages: 2 }, { quand: Date.now() - 30 * 60_000, pages: 4 }])
  const [S0, S1] = S
  // La page 3 du jour à la poubelle, la séance passée supprimée, la page 4 jetée
  // (hier, elle restera), la page 2 jetée comme au lot 2 (sans heure) ; puis
  // les entrées de la page 3 et de la séance reculées de 31 jours
  await p.evaluate(id => window.__app.allerPage(id), S1.pages[2]); await p.waitForTimeout(700)
  await p.click('.barre-haut button[aria-label="Supprimer cette page"]'); await p.waitForTimeout(300)
  await p.evaluate(id => window.__app.allerPage(id), S1.pages[0]); await p.waitForTimeout(300)
  await p.evaluate(async ([s, p4, p2, vieilles, J]) => {
    const t = window.__app.tableau
    await window.__supprimerSeance(s)
    t.jeterPages([p4])
    t.doc.transact(() => t.ordre.delete(t.ordre.toArray().indexOf(p2), 1))
    t.doc.transact(() => { for (const id of vieilles) { const e = t.corbeille.get(id); t.corbeille.set(id, { ...e, t: e.t - 31 * J }) } })
  }, [S0.id, S1.pages[3], S1.pages[1], [S1.pages[2], ...S0.pages], JOUR])
  await p.waitForTimeout(300)
  await ouvrirCorbeille(p)
  let e = await etat(p)
  verifier('J) La case décochée : rien ne part à l\'ouverture (quatre lignes : trois pages seules, un bloc), aucun message de vidage',
    e.option.cochee === false && e.dans.length === 5 && e.lignes.length === 4 && e.lignes.filter(l => l.genre === 'seance').length === 1 && !e.msgs.some(m => /de plus de 30 jours/.test(m)), { l: e.lignes.map(l => [l.genre, l.cle]), m: e.msgs })
  const sansHeure = e.lignes.find(l => l.cle === S1.pages[1])
  verifier('… la page jetée sans heure : « Supprimée avant cette version · dernière écriture … »', /^Supprimée avant cette version · dernière écriture /.test(sansHeure?.date ?? ''), sansHeure)
  await p.click('.corbeille-case-30'); await p.waitForTimeout(200)
  e = await etat(p)
  verifier('… cochée : « 3 pages de plus de 30 jours : elles seront supprimées définitivement à la prochaine ouverture de la corbeille. », rien ne part sur le clic, le réglage noté (mem-corbeille-30-jours = 1)',
    e.option.cochee === true && dernier(e) === '3 pages de plus de 30 jours : elles seront supprimées définitivement à la prochaine ouverture de la corbeille.' && e.lignes.length === 4 && e.dans.length === 5 && e.reglage === '1', { m: dernier(e), r: e.reglage, n: e.lignes.length })
  await fermerTout(p)
  // Rechargé : ouvrir le classeur n'écrit rien (le document est le même, octet pour octet) tant qu'on n'ouvre pas la corbeille
  const empreinte = () => p.evaluate(() => { const t = window.__app.tableau; return [...t.doc.store.clients].map(([c, s]) => `${c}:${s.at(-1).id.clock + s.at(-1).length}`).sort().join() })
  const avant = await empreinte()
  await p.reload(); await pret(p)
  const apres = await empreinte()
  e = await etat(p)
  verifier('… rechargé, le classeur ouvert : rien n\'est écrit (le même document), les 5 pages toujours dans la corbeille, aucune définitive', apres === avant && e.dans.length === 5 && !Object.values(e.entrees).some(x => x?.definitif), { avant, apres, dans: e.dans })
  await ouvrirCorbeille(p)
  e = await etat(p)
  const ecrit = await empreinte()
  verifier('… la corbeille ouverte : la case est restée cochée ; « 3 pages de plus de 30 jours supprimées définitivement (elles restent dans Revoir la construction) » ; la page d\'hier et la page sans heure restent',
    e.option.cochee === true && e.reglage === '1' && dernier(e) === '3 pages de plus de 30 jours supprimées définitivement (elles restent dans Revoir la construction)' && ecrit !== apres
    && e.lignes.map(l => l.cle).sort().join() === [S1.pages[3], S1.pages[1]].sort().join() && [S1.pages[2], ...S0.pages].every(id => e.entrees[id]?.definitif === true) && e.bouton.texte === 'Corbeille (2)', { m: dernier(e), l: e.lignes.map(l => l.cle), b: e.bouton })
  await p.screenshot({ path: D + '/J-30-jours.png' })
  // Décochée : plus rien ne part, même vieux
  await p.click('.corbeille-case-30'); await p.waitForTimeout(200)
  e = await etat(p)
  verifier('… décochée : le réglage noté (0)', e.option.cochee === false && e.reglage === '0', e.reglage)
  await fermerTout(p)
  await p.evaluate(([id, J]) => { const t = window.__app.tableau; const e = t.corbeille.get(id); t.corbeille.set(id, { ...e, t: e.t - 31 * J }) }, [S1.pages[3], JOUR])
  const nAvant = e.msgs.length
  await ouvrirCorbeille(p)
  e = await etat(p)
  verifier('… la corbeille rouverte, une page de plus de 30 jours : elle reste (rien ne part tant que la case est décochée)', e.lignes.length === 2 && e.dans.includes(S1.pages[3]) && !e.msgs.slice(nAvant).some(m => /de plus de 30 jours/.test(m)), { l: e.lignes.map(l => l.cle), m: e.msgs.slice(nAvant) })
  await ctx.close()
}

// =============== K. La séance remise redevient la séance du jour ===============
if (faire('jour')) {
  const ctx = await contexte()
  const p = await ouvrir(ctx, 'jour')
  const { S, carte } = await classeur(p, 'Jour', [{ quand: base - 3 * JOUR, pages: 2 }, { quand: Date.now() - 30 * 60_000, pages: 3 }])
  const [S0, S1] = S
  // Depuis la bibliothèque, par-dessus le classeur ouvert : Suppr sur la séance du jour
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque())
  await p.waitForFunction(() => window.__bibliotheque.ouvert); await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(300)
  if (await p.getAttribute(carte + ' .carte-seances-bascule', 'aria-expanded') !== 'true') { await p.click(carte + ' .carte-seances-bascule'); await p.waitForTimeout(200) }
  await p.focus(`${carte} .carte-seance-ligne[data-seance="${S1.id}"] .carte-seance`)
  await p.keyboard.press('Delete')
  await p.waitForFunction(() => !window.__bibliotheque.seancesOccupees, null, { timeout: 15000 }); await p.waitForTimeout(400)
  await p.click('.biblio-fermer'); await p.waitForFunction(() => !window.__bibliotheque.ouvert); await p.waitForTimeout(300)
  let e = await etat(p)
  const tx1 = await textes(p, S1)
  verifier('K) La séance du jour supprimée depuis la bibliothèque : le tableau suit (la séance d\'avant devient la dernière), ses 3 pages dans la corbeille',
    e.jour === S0.id && e.dans.length === 3 && S1.pages.every(id => e.dans.includes(id)) && e.ordre.join() === S0.pages.join(), { jour: e.jour, dans: e.dans, ordre: e.ordre })
  await ouvrirCorbeille(p)
  e = await etat(p)
  verifier(`… la corbeille : le bloc « ${tx1.libelle} · 3 pages »`, e.lignes.length === 1 && e.lignes[0].genre === 'seance' && e.lignes[0].titre === `${tx1.libelle} · 3 pages`, e.lignes)
  await p.click('.bloc-corbeille .corbeille-remettre'); await p.waitForTimeout(400)
  e = await etat(p)
  verifier(`… « Remettre la séance » : « Séance remise : « ${tx1.libelle} » (3 pages). Elle redevient la séance du jour. », la grille de la trieuse la montre`,
    dernier(e) === `Séance remise : « ${tx1.libelle} » (3 pages). Elle redevient la séance du jour.` && e.jour === S1.id && e.grille.join() === S1.pages.join() && e.action.includes('Annuler'), { m: dernier(e), jour: e.jour, grille: e.grille })
  await annuler(p)
  e = await etat(p)
  verifier('… « Annuler » : elle retourne dans la corbeille, la séance d\'avant redevient la dernière', e.jour === S0.id && e.dans.length === 3 && e.grille.join() === S0.pages.join(), { jour: e.jour, grille: e.grille })
  await ctx.close()
}

await nav.close()
for (const x of erreurs) verifier('Aucune erreur JS', false, x)
if (!erreurs.length) verifier('Aucune erreur JS', true)
const rates = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - rates} / ${resultats.length} vérifications réussies`)
process.exit(rates ? 1 : 0)
