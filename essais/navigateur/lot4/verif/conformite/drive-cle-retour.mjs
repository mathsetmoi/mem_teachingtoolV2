// CONFORMITÉ, choix (b) et point 5 : « la sauvegarde automatique va aux
// deux endroits », la copie sur le Drive « automatique tant que la connexion
// Google est valable ». Le classeur A s'enregistre sur la clé et sur le
// Drive ; on passe à B (la bibliothèque), puis on revient à A dix minutes
// plus tard (le jeton vaut encore). A continue-t-il d'aller sur le Drive ?
// Avec la clé à jour, rien n'est montré (ni point, ni bandeau).
import * as O from './outils.mjs'
const { ok, MIN } = O
await O.lancer({ persistant: true })
const g = new O.FauxGoogle()
const ctx = await O.contexte(g)
const p = await O.ouvrir(ctx, '', 'A')
const idA = await p.evaluate(() => window.__app.classeur.id)
await O.gisPret(p)
// La clé : menu ⋯ → Enregistrer automatiquement dans un fichier… (l'OPFS)
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="activer-cle"]')
await p.waitForFunction(() => window.__cle?.etat?.etat === 'ok' || window.__cle?.actif, null, { timeout: 15000 }).catch(() => {})
await p.waitForTimeout(800)
console.log('clé :', JSON.stringify(await p.evaluate(() => window.__cle?.etat)))
await O.seConnecter(p)
await O.ecrire(p, 250, 200)
await p.clock.fastForward(2 * MIN + 5000)
await p.waitForFunction(() => window.__drive.etat.t !== undefined, null, { timeout: 15000 }).catch(() => {})
await p.waitForTimeout(500)
let e = await O.etat(p)
ok(g.sauvegardes().length === 1 && e.drive.etat === 'ok', `A : sur la clé et sur le Drive (« ${e.court} », « ${e.ligne?.texte} »)`, e)
const envoisAvant = g.requetes.filter(r => r.chemin.startsWith('/upload/')).length
// B, puis retour à A
const idB = await p.evaluate(async () => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), id = dem.idClasseur(), T = Date.now()
  const fiche = { id, base: dem.baseDe(id), nom: 'Fractions', dossier: null, etiquettes: [], cree: T, modifie: T, ouvert: 0, pages: 1 }
  await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom: fiche.nom }))
  return id
})
const aller = async id => {
  await p.click('.bouton-classeur')
  await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
  await p.waitForTimeout(300)
  await Promise.all([p.waitForURL(u => u.searchParams.get('classeur') === id, { timeout: 20000 }), p.click(`.grille-classeurs .case-classeur[data-id="${id}"] .carte-classeur`)])
  await O.pret(p)
}
await aller(idB)
await p.clock.fastForward(10 * MIN)
await aller(idA)
await p.waitForTimeout(800)
// Un cours dans A : des traits pendant 15 minutes. Après chaque saut de l'horloge simulée,
// on attend (en vrai temps) que l'écriture sur la clé qu'il a lancée soit finie (contrôle final
// du lot 4 : sinon, la machine chargée, le saut suivant passait l'heure limite de l'écrivain,
// qui travaille, lui, en vrai temps, avant sa réponse : « L'écrivain n'a pas répondu à temps »)
const finiSurLaCle = () => p.waitForFunction(() => !window.__cle?.enEcriture, null, { timeout: 30000 }).catch(() => {})
for (let i = 0; i < 5; i++) { await O.ecrire(p, 250, 240 + 30 * i); await p.clock.fastForward(3 * MIN); await p.waitForTimeout(100); await finiSurLaCle() }
await p.clock.fastForward(3 * MIN); await p.waitForTimeout(100); await finiSurLaCle(); await p.waitForTimeout(800)
e = await O.etat(p)
const envoisApres = g.requetes.filter(r => r.chemin.startsWith('/upload/')).length
const cle = await p.evaluate(() => window.__cle?.etat)
console.log('A, 18 min après le retour :', JSON.stringify({ court: e.court, point: e.point, bandeau: e.bandeau, drive: e.drive, ligne: e.ligne, cle }))
ok(cle?.etat === 'ok', 'A : la clé, elle, s\'écrit toujours', cle)
ok(envoisApres > envoisAvant, `A, revenu 10 min plus tard (jeton encore valable), 18 min de cours : la copie sur le Drive part (${envoisApres - envoisAvant} envoi)`, { drive: e.drive, ligne: e.ligne })
// (contrôle final du lot 4 : « ou du moins » — seulement si la copie n'est pas partie ; partie,
// la clé à jour, rien n'est montré, comme le dit l'en-tête)
ok(envoisApres > envoisAvant || e.point || e.bandeau, `… ou du moins l'écran le montre (point ambre ou bandeau) : bouton « ${e.court} », point ${e.point}, bandeau ${JSON.stringify(e.bandeau)}`)
await O.navigateur.close()
