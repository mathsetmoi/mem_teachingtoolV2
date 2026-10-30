// CONFORMITÉ, point 5 : « automatique tant que la connexion Google est
// valable (le jeton dure environ 1 h ; le renouveler demande un clic) ».
// Le professeur se connecte, une copie part ; il passe à un autre classeur
// par la bibliothèque (5 minutes plus tard : le jeton vaut encore 55 min).
// Que devient la copie sur le Drive dans le classeur suivant, et celle du
// classeur quitté (« les classeurs en retard s'en chargent depuis le
// suivant ») ?
import * as O from './outils.mjs'
const { ok, MIN } = O

await O.lancer()
const g = new O.FauxGoogle()
const ctx = await O.contexte(g)
const p = await O.ouvrir(ctx, '', 'A')
const idA = await p.evaluate(() => window.__app.classeur.id)
await O.gisPret(p)
await O.seConnecter(p)
let e = await O.etat(p)
ok(e.drive?.etat === 'ok', 'connecté à Google (un clic)', e.drive)
// La première copie
await O.ecrire(p, 250, 200)
await p.clock.fastForward(2 * MIN + 3000)
await p.waitForFunction(() => window.__drive.etat.t !== undefined, null, { timeout: 15000 }).catch(() => {})
ok(g.sauvegardes().length === 1, 'la première copie est partie', g.sauvegardes().map(s => s.name))
const gisAvant = g.gis.length
// Un trait de plus dans A, puis on change de classeur (moins de 2 min après : A est en retard)
await O.ecrire(p, 260, 300)
// Un second classeur, créé comme le fait la bibliothèque
const idB = await p.evaluate(async () => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), id = dem.idClasseur(), T = Date.now()
  const fiche = { id, base: dem.baseDe(id), nom: 'Fractions', dossier: null, etiquettes: [], cree: T, modifie: T, ouvert: 0, pages: 1 }
  await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom: fiche.nom }))
  return id
})
// Par la bibliothèque, comme le professeur
await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]')
await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
await p.waitForTimeout(300)
await Promise.all([
  p.waitForURL(u => u.searchParams.get('classeur') === idB, { timeout: 20000 }),
  p.click(`.grille-classeurs .case-classeur[data-id="${idB}"] .carte-classeur`),
])
await O.pret(p)
const tempsEcoule = await p.evaluate(() => Date.now())
e = await O.etat(p)
console.log('après le changement de classeur :', JSON.stringify(e))
ok(e.drive?.etat !== 'connexion', `B ouvert quelques minutes après la connexion (jeton valable 1 h) : la copie sur le Drive reste connectée (état « ${e.drive?.etat} », ligne « ${e.ligne?.texte} »)`, e)
// Un trait dans B, 2 min 30 : une copie de B part-elle ? Et celle de A, en retard ?
await O.ecrire(p, 300, 300)
// Par pas de 10 s (contrôle final du lot 4) : d'un seul saut de 2 min 30, l'horloge simulée
// passait l'heure du rattrapage (30 s après l'arrivée) avant que ses lectures de l'index, en
// temps réel, ne reviennent ; le rattrapage se trouvait alors à moins d'une minute de la copie
// de B, et se remettait à plus tard, au-delà de l'essai
for (let i = 0; i < 15; i++) { await p.clock.fastForward(10_000); await p.waitForTimeout(400) }
await p.waitForTimeout(1500)
e = await O.etat(p)
const noms = g.sauvegardes().map(s => s.name)
ok(noms.includes('Fractions.memc'), `la copie de « Fractions » part 2 min après son premier trait (sur le Drive : ${JSON.stringify(noms)})`, e)
const ficheA = await O.ficheDe(p, idA)
console.log('fiche A :', JSON.stringify({ modifie: ficheA.modifie, drive: ficheA.drive && { t: ficheA.drive.t } }))
ok(ficheA.drive && ficheA.drive.t >= ficheA.modifie, '« Premier classeur », en retard, est copié depuis le classeur suivant', { modifie: ficheA.modifie, driveT: ficheA.drive?.t })
ok(g.gis.length === gisAvant, `aucune fenêtre Google ouverte sans clic (${g.gis.length - gisAvant})`)
console.log('état montré dans B :', e.court, '·', e.ligne?.texte, '· point', e.point, '· bandeau', JSON.stringify(e.bandeau))
// 2 minutes sans geste de plus : le bandeau ?
await p.clock.fastForward(2 * MIN + 10_000)
await p.waitForTimeout(800)
e = await O.etat(p)
console.log('4 min 40 après : ', e.court, '·', e.ligne?.texte, '· point', e.point, '· bandeau', JSON.stringify(e.bandeau))
await p.screenshot({ path: new URL('./captures/drive-changer.png', import.meta.url).pathname })
console.log('erreurs :', JSON.stringify(O.erreurs))
await O.navigateur.close()
