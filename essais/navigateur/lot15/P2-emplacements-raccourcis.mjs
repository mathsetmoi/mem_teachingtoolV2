// ESSAI DU LOT 15 : « Mes emplacements » raccourci (proposition A).
// A. Tout est copié : aucune zone, et « PC ✓ » sur la carte du dossier.
// B. Un classeur n'est pas copié : « PC : 1 à copier » sur la carte, une seule
//    ligne avec « Mettre à jour ».
// C. Menu du dossier → « Copies sur l'ordinateur… » : la liste complète
//    (« Où sont copiées mes classes ? »), « Masquer » la referme.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 800) : '') }
const erreurs = []
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
await p.goto(DEV)
await p.waitForFunction(() => window.__bibliotheque && window.__registre && window.__ailleurs, null, { timeout: 30000 })

// Un dossier « Auguste », deux classeurs, un emplacement sur cet ordinateur
await p.evaluate(async () => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
  const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts')
  const reg = window.__registre, T = Date.now()
  const d = { id: dem.idClasseur(), nom: 'Auguste', parent: null, couleur: '#3b6fb6', cree: T }
  await reg.ajouterDossier(d)
  window.__idDossier = d.id
  window.__ids = []
  for (const nom of ['Fractions', 'Équations']) {
    const t = new Tableau(null)
    const a = t.ajouterPage('blanche', 0); await Promise.resolve(); t.pageVue = a
    const { etat } = fichier.lireTableau(new Uint8Array(await fichier.ecrireTableau(t.doc).arrayBuffer()))
    t.doc.destroy()
    const id = dem.idClasseur()
    const fiche = { id, base: dem.baseDe(id), nom, dossier: d.id, etiquettes: [], cree: T - 3600e3, modifie: T - 600e3, ouvert: 0, pages: 1, cle: { nom: nom + '.memc' } }
    await reg.creerClasseur(fiche, bb => bases.creerBase(bb, etat, { id, nom }))
    window.__ids.push(id)
  }
  await reg.ecrireReglage('emplacements', [{ id: dem.idClasseur(), genre: 'ordinateur', dossier: d.id, nom: 'Auguste', cree: T }])
})
const voir = async () => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.waitForTimeout(500)
}
const zone = () => p.evaluate(() => {
  const s = document.querySelector('.emplacements')
  const pu = document.querySelector('li.case-dossier .puce-emplacement')
  return { visible: !!s && !s.hidden, texte: (s?.textContent ?? '').replace(/[  ]/g, ' '), boutons: [...(s?.querySelectorAll('button') ?? [])].map(x => x.textContent), puce: pu?.textContent ?? null, attention: pu?.classList.contains('attention') ?? false }
})
await voir()

// A
let z = await zone()
ok(!z.visible, 'A1) Tout est copié : aucune zone', z)
ok(z.puce === 'PC ✓' && !z.attention, 'A2) « PC ✓ » sur la carte du dossier', z)

// B
await p.evaluate(async () => { await window.__registre.modifierClasseur(window.__ids[1], f => { delete f.cle }) })
await voir()
z = await zone()
ok(z.visible && /1 classeur de « Auguste » n'est pas encore copié sur l'ordinateur/.test(z.texte) && z.boutons.join() === 'Mettre à jour', 'B1) Une seule ligne, avec « Mettre à jour »', z)
ok(z.puce === 'PC : 1 à copier' && z.attention, 'B2) « PC : 1 à copier » sur la carte', z)

// C
await p.click('li.case-dossier .options-classeur')
await p.waitForSelector('[data-action="emplacements"]', { timeout: 10000 })
ok((await p.textContent('[data-action="emplacements"]')).includes('Copies sur l\'ordinateur…'), 'C1) Le menu du dossier propose « Copies sur l\'ordinateur… »')
await p.click('[data-action="emplacements"]')
await p.waitForFunction(() => document.querySelector('.emplacements h3')?.textContent === 'Où sont copiées mes classes ?', null, { timeout: 10000 })
z = await zone()
ok(/Auguste → Cet ordinateur › Auguste/.test(z.texte) && z.boutons.includes('Mettre à jour') && z.boutons.includes('Retirer') && z.boutons.includes('Masquer'), 'C2) La liste complète : « Mettre à jour », « Retirer », « Masquer »', z)
await p.click('.emplacements .e-masquer')
await p.waitForFunction(() => document.querySelector('.emplacements .ligne-resume'), null, { timeout: 10000 })
z = await zone()
ok(z.visible && z.boutons.join() === 'Mettre à jour', 'C3) « Masquer » : retour à la ligne seule', z)

// Tout est de nouveau copié : la zone disparaît
await p.evaluate(async () => { await window.__registre.modifierClasseur(window.__ids[1], f => { f.cle = { nom: 'Équations.memc' } }) })
await voir()
z = await zone()
ok(!z.visible && z.puce === 'PC ✓', 'D1) Tout copié de nouveau : la zone disparaît, « PC ✓ » revient', z)
ok(erreurs.length === 0, 'E) Aucune erreur de page', erreurs)
await b.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout passe')
process.exit(echecs ? 1 : 0)
