// ESSAI DU CONTRÔLE FINAL DU LOT 4, n° 2 (ce que la batterie a montré en y
// passant les sondes de lot4/verif) : verif/sauvegardes/t9-drive-fermer.mjs
// restait rouge. En ligne, le Drive connecté, SANS clé (Firefox, l'iPad,
// Chrome sans clé), l'onglet fermé 30 s après le dernier trait : la copie
// partait 2 minutes après le trait, le Drive ne l'a jamais eue ; sur un poste
// remis à zéro chaque soir, plus rien ne l'avait le lendemain. « Corrections
// sauvegardes » n'avait traité que la clé (la question du navigateur), en
// croyant t9 rouge pour la même raison ; or, sans clé, rien ne la posait.
// Maintenant, comme pour la clé : la question du navigateur (beforeunload),
// seulement pendant qu'une copie attend et quand rien d'autre ne protège le
// classeur, et la copie part aussitôt.
//   A. Sans clé, connecté, 30 s après le trait : fermer pose la question ;
//      « Rester » : la copie est sur le Drive en quelques secondes (avec le
//      trait) ; puis fermer ne demande plus rien.
//   B. Un autre trait, « Quitter » : la question, l'onglet se ferme ; le trait
//      reste dans ce navigateur (rouvert : il y est, la copie attend).
//   C. La clé à jour (l'OPFS, permissions simulées), une copie du Drive qui
//      attend : pas de question (la clé protège le classeur).
//   D. Pas connecté à Google : pas de question (la copie ne partirait pas).
//   E. Partir par la bibliothèque (vers un autre classeur), une copie qui
//      attend : pas de question (les classeurs en retard se copient depuis
//      le suivant).
// Sans la correction : A et B échouent (pas de question, rien sur
// le Drive).
// Lancer : node CF2-drive-fermer.mjs [adresse du serveur de développement]
import { chromium, INIT, ECOUTER_TOASTS, pret, ecrire, etat, entree, lireMemc, formesIds, attendreEcrites, nbEcrites } from './verif/sauvegardes/commun.mjs'
import { FauxGoogle } from './verif/migration/faux-google.mjs'
const DEV = process.env.DEV || process.argv[2] || 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const info = (m, d) => console.log('·', m, d === undefined ? '' : JSON.stringify(d).slice(0, 800))
const dort = ms => new Promise(r => setTimeout(r, ms))
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED|favicon/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
/** Ferme l'onglet comme le professeur (CDP Page.close, qui passe par
 *  beforeunload) ; la question du navigateur, s'il la pose, reçoit
 *  `reponse` ('rester' ou 'partir') */
async function fermer(p, reponse, attente = 1500) {
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
async function connecter(p) {
  await entree(p, 'copie-drive')
  await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
  await p.click('dialog.dialogue-drive[open] .d-connecter')
  await p.waitForFunction(() => /^Connecté/.test(document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
  await p.click('dialog.dialogue-drive[open] .d-annuler'); await p.waitForTimeout(300)
}
const traitsSurLeDrive = g => { const s = g.sauvegardes(); return s[0] ? lireMemc(s[0].octets).ids : [] }

const nav = await chromium.launch()
try {
  // ---------- A et B : sans clé, connecté ----------
  {
    const g = new FauxGoogle()
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
    await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
    await g.brancher(ctx)
    let p = await ctx.newPage(); suivre(p, 'A')
    await p.goto(DEV); await pret(p); await p.waitForTimeout(3500)
    await connecter(p)
    await ecrire(p, 300, 300)
    const id1 = (await formesIds(p)).at(-1)
    await p.waitForTimeout(30000)
    const e = await etat(p)
    info('A, 30 s après le trait', { court: e.court, drive: e.lignes.find(l => l.startsWith('drive')), sauvegardes: g.sauvegardes().length })
    let f = await fermer(p, 'rester', 300)
    ok(f.questions.length === 1 && f.questions[0] === 'beforeunload' && !f.ferme, 'A. sans clé, connecté, 30 s après le trait : fermer l\'onglet pose la question du navigateur ; « Rester »', f)
    while (Date.now() - f.t < 15000 && !traitsSurLeDrive(g).includes(id1)) await dort(100)
    ok(traitsSurLeDrive(g).includes(id1), `   … la copie est sur le Drive ${((Date.now() - f.t) / 1000).toFixed(1)} s après la question, avec le trait`, { drive: traitsSurLeDrive(g), id1 })
    if (!p.isClosed()) {
      await p.waitForTimeout(800)
      f = await fermer(p, 'rester', 1500)
      ok(f.questions.length === 0 && f.ferme, '   … la copie faite, fermer ne demande plus rien : l\'onglet se ferme', f)
    }
    // B. Un autre onglet, connecté ; un trait ; « Quitter »
    p = await ctx.newPage(); suivre(p, 'B')
    await p.goto(DEV); await pret(p); await p.waitForTimeout(3500)
    await connecter(p)
    await ecrire(p, 360, 340)
    const id2 = (await formesIds(p)).at(-1)
    await p.waitForTimeout(3000)
    f = await fermer(p, 'partir', 1500)
    ok(f.questions.length === 1 && f.ferme, 'B. un trait, fermer 3 s après, « Quitter » : la question, et l\'onglet se ferme', f)
    info('B, sur le Drive après « Quitter »', { avecLeTrait: traitsSurLeDrive(g).includes(id2) })
    p = await ctx.newPage(); suivre(p, 'B2')
    await p.goto(DEV); await pret(p); await p.waitForTimeout(1500)
    const e2 = await etat(p)
    ok((await formesIds(p)).includes(id2) && e2.drive?.enAttente === true, '   … rouvert : le trait est dans ce navigateur, et la copie du Drive attend (elle partira connectée)', { drive: e2.drive, ligne: e2.lignes.find(l => l.startsWith('drive')) })
    await p.close()
    await ctx.close()
  }

  // ---------- C : la clé à jour, une copie du Drive qui attend ----------
  {
    const g = new FauxGoogle()
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
    await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
    await g.brancher(ctx)
    const p = await ctx.newPage(); suivre(p, 'C')
    await p.goto(DEV); await pret(p); await p.waitForTimeout(3500)
    await entree(p, 'activer-cle')
    await attendreEcrites(p, 1, 15000)
    await connecter(p)
    await ecrire(p, 300, 300)
    const n0 = await nbEcrites(p)
    const ecrite = await attendreEcrites(p, n0 + 1, 40000)
    await p.waitForTimeout(800)
    const e = await etat(p)
    info('C, la clé écrite', { ecrite, court: e.court, cle: e.cle?.etat, drive: e.lignes.find(l => l.startsWith('drive')) })
    const f = await fermer(p, 'rester', 1500)
    ok(ecrite && e.drive?.enAttente === true && f.questions.length === 0 && f.ferme, 'C. la clé à jour, une copie du Drive qui attend : fermer ne pose pas de question (la clé protège le classeur)', { ecrite, drive: e.drive, f })
    await ctx.close()
  }

  // ---------- D : pas connecté ----------
  {
    const g = new FauxGoogle()
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
    await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
    await g.brancher(ctx)
    const p = await ctx.newPage(); suivre(p, 'D')
    await p.goto(DEV); await pret(p); await p.waitForTimeout(2000)
    await ecrire(p, 300, 300); await p.waitForTimeout(3000)
    const e = await etat(p)
    const f = await fermer(p, 'rester', 1500)
    ok(f.questions.length === 0 && f.ferme, `D. pas connecté à Google (« ${e.lignes.find(l => l.startsWith('drive'))} ») : fermer ne pose pas de question`, { f, drive: e.drive })
    await ctx.close()
  }

  // ---------- E : partir par la bibliothèque, une copie qui attend ----------
  {
    const g = new FauxGoogle()
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
    await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
    await g.brancher(ctx)
    const p = await ctx.newPage(); suivre(p, 'E')
    const questions = []
    p.on('dialog', d => { questions.push(d.type()); d.dismiss().catch(() => {}) })
    await p.goto(DEV); await pret(p); await p.waitForTimeout(3500)
    await connecter(p)
    const idB = await p.evaluate(async () => {
      const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
      const etat = await neuf.etatNeuf('carreaux'), id = dem.idClasseur(), T = Date.now()
      const fiche = { id, base: dem.baseDe(id), nom: 'Fractions', dossier: null, etiquettes: [], cree: T, modifie: T, ouvert: 0, pages: 1 }
      await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom: fiche.nom }))
      return id
    })
    await ecrire(p, 300, 300); await p.waitForTimeout(3000)
    const attend = (await etat(p)).drive?.enAttente
    await p.click('.bouton-classeur')
    await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
    await p.waitForTimeout(300)
    const arrive = await Promise.all([p.waitForURL(u => u.searchParams.get('classeur') === idB, { timeout: 20000 }).then(() => true, () => false), p.click(`.grille-classeurs .case-classeur[data-id="${idB}"] .carte-classeur`)]).then(([a]) => a)
    ok(attend && arrive && questions.length === 0, 'E. une copie qui attend, partir par la bibliothèque vers un autre classeur : pas de question, on arrive', { attend, arrive, questions })
    await ctx.close()
  }
} finally {
  await nav.close()
}
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
console.log(`\n${echecs ? `ÉCHECS : ${echecs}` : 'tout est vert'}`)
process.exit(echecs ? 1 : 0)
