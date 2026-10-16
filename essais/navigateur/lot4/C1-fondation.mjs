// ESSAI DU MORCEAU C1-fondation (lot 4) : un document par classeur, le
// registre, la reprise sans perte, des bases qu'on n'abîme jamais, le trou.
// (A. La version d'avant et la nouvelle sur la même origine : retirée, voir plus bas.)
// B. Le serveur de développement (http://localhost:5173, window.__app et
//    window.__registre) : créer un classeur, deux classeurs dans deux
//    onglets, les bases qu'on ne crée ni n'abîme jamais, l'index unique, le
//    trou et sa réparation, la base supprimée ailleurs, le repli, la reprise
//    coupée, l'index perdu, une adresse venue d'ailleurs, le suivi.
// Il faut avoir construit les deux versions (npm run build, npm run
// build:pages) ; tout.sh le fait.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const ICI = S + '/lot4/C1/'
const SITE = ICI + 'site/'
const DEV = 'http://localhost:5173/'
const O = 'http://127.0.0.1:4302'
const BASE_PREMIER = 'mem-tableau-local', INDEX = 'mem-teachingtool-bibliotheque', PREFIXE = 'mem-teachingtool-classeur-'

let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const norm = t => (t || '').replace(/[  ]/g, ' ')

// ---------- Le site : les deux versions et l'outil qui lit les bases sans en créer ----------
mkdirSync(SITE, { recursive: true })
writeFileSync(SITE + 'outil.html', `<!doctype html><meta charset="utf-8"><title>Outil d'essai C1</title>
<script>
// Lire les bases d'une origine SANS jamais en créer une : databases() d'abord,
// puis open sans version (la mise à niveau d'une base neuve est abandonnée).
const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }
window.bases = async () => (await indexedDB.databases()).map(d => d.name).sort()
async function ouvrir(nom) {
  if (!(await window.bases()).includes(nom)) return null
  const r = indexedDB.open(nom)
  r.onupgradeneeded = () => r.transaction.abort()
  try { return await req(r) } catch { return null }
}
window.base = async nom => {
  const db = await ouvrir(nom)
  if (!db) return null
  const res = { version: db.version, magasins: [...db.objectStoreNames] }
  if (db.objectStoreNames.contains('updates')) {
    const s = db.transaction(['updates']).objectStore('updates')
    res.cles = await req(s.getAllKeys())
    res.entrees = (await req(s.getAll())).map(b64)
  }
  if (db.objectStoreNames.contains('custom')) {
    const s = db.transaction(['custom']).objectStore('custom')
    const cles = await req(s.getAllKeys()), vals = await req(s.getAll())
    res.custom = Object.fromEntries(cles.map((k, i) => [k, vals[i]]))
  }
  db.close()
  return res
}
window.index = async () => {
  const db = await ouvrir('${INDEX}')
  if (!db) return null
  const res = { version: db.version, magasins: [...db.objectStoreNames].sort() }
  for (const m of res.magasins) {
    const s = db.transaction([m]).objectStore(m)
    const cles = await req(s.getAllKeys()), vals = await req(s.getAll())
    res[m] = cles.map((k, i) => [k, JSON.parse(JSON.stringify(vals[i], (c, v) => v instanceof Uint8Array ? 'u8:' + b64(v) : v instanceof Blob ? 'blob:' + v.size : v))])
  }
  db.close()
  return res
}
</script>`)

// ---------- Outils ----------
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 16)
const docDe = entrees => { const d = new Y.Doc({ gc: false }); for (const e of entrees) Y.applyUpdate(d, new Uint8Array(Buffer.from(e, 'base64'))); return d }
const formesParPage = d => d.getArray('ordre').toArray().map(id => d.getMap('pages').get(id)?.get('formes')?.size ?? -1)
/** La base est-elle l'ancienne, plus seulement des entrées [0,0] (l'état vide qu'ajoute chaque ouverture par y-indexeddb) ? */
function seulementDesVides(avant, apres) {
  if (!avant || !apres) return { ok: false, pourquoi: 'base absente' }
  const n = avant.entrees.length
  const memes = apres.entrees.slice(0, n).every((e, i) => e === avant.entrees[i] && apres.cles[i] === avant.cles[i])
  const ajouts = apres.entrees.slice(n).map(e => [...Buffer.from(e, 'base64')].join(','))
  return { ok: memes && ajouts.every(a => a === '0,0'), memes, ajouts, n, total: apres.entrees.length }
}

const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 20000 })
const rang = async p => norm((await p.textContent('.rang')) || '').trim()
async function ecrire(p, x0, y0) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= 12; i++) await p.mouse.move(x0 + i * 12, y0 + Math.sin(i / 2) * 20)
  await p.mouse.up(); await p.waitForTimeout(150)
}
async function outil(ctx, url) { const q = await ctx.newPage(); await q.goto(url); return q }

// (A. La version d'avant et la nouvelle sur la même origine : retirée en rangeant
// la batterie dans le dépôt ; la version d'avant se construisait depuis un commit
// qui n'existe plus.)

// =====================================================================
// B. LE SERVEUR DE DÉVELOPPEMENT
// =====================================================================
console.log('\n=== serveur de développement ===')
const nav = await chromium.launch()
const contexte = async (init) => { const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } }); if (init) await ctx.addInitScript(init); return ctx }
async function ouvrirDev(ctx, chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(600)
  return p
}
/** Crée un classeur par creerClasseur et creerBase(etatNeuf) */
const creer = (p, nom, fond = 'seyes') => p.evaluate(async ({ nom, fond }) => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const id = dem.idClasseur()
  const fiche = { id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: Date.now(), modifie: Date.now(), ouvert: 0, pages: 1 }
  return window.__registre.creerClasseur(fiche, async base => bases.creerBase(base, await neuf.etatNeuf(fond), { id, nom }))
}, { nom, fond })
const lireBase = (p, nom) => p.evaluate(async nom => {
  if (!(await indexedDB.databases()).some(d => d.name === nom)) return null
  const b = await import('/src/classeurs/bases.ts')
  const { mises, infos } = await b.lireMisesAJour(nom)
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }
  return { entrees: mises.map(b64), infos }
}, nom)
const basesDe = p => p.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort())
const toast = p => p.evaluate(() => document.querySelector('.toast')?.textContent || '').then(norm)

// 6) Un classeur fait par creerClasseur et creerBase(etatNeuf) s'ouvre sans page de plus
let ctx = await contexte()
let p = await ouvrirDev(ctx)
const premierId = await p.evaluate(() => window.__app.classeur.id)
const neuf = await creer(p, 'Symétrie centrale — 5e B')
const apresCreation = await p.evaluate(async id => ({ fiche: await window.__registre.classeur(id), bases: (await indexedDB.databases()).map(d => d.name) }), neuf.id)
ok(neuf.base === PREFIXE + neuf.id && apresCreation.fiche && apresCreation.fiche.creation === undefined && apresCreation.bases.includes(neuf.base),
  `6) creerClasseur : la fiche (sans marque de création) et sa base ${neuf.base}`, apresCreation)
let q = await ouvrirDev(ctx, '?classeur=' + neuf.id, 'classeur')
let etat = await q.evaluate(() => { const a = window.__app, t = a.tableau; return { base: t.base, pages: t.ordre.length, fond: t.pages.get(t.ordre.get(0)).get('fond'), film: t.film.length, naissance: t.film.get(0).naissance, classeur: a.classeur, titre: document.title, url: location.search } })
ok(etat.base === neuf.base && etat.pages === 1 && etat.fond === 'seyes' && etat.film === 1 && etat.naissance && etat.classeur.id === neuf.id && !etat.classeur.premier,
  `   … il s'ouvre sans page de plus : ${etat.pages} page (${etat.fond}), ${etat.film} étape de film (naissance)`, etat)
ok(etat.titre === 'Symétrie centrale — 5e B — MEM teachingtool' && etat.url === '?classeur=' + neuf.id && (await rang(q)) === '1 / 1', `   … titre « ${etat.titre} », adresse ${etat.url}`)
let fneuf = await q.evaluate(id => window.__registre.classeur(id), neuf.id)
ok(fneuf.ouvert > 0 && fneuf.pages === 1 && fneuf.nom === 'Symétrie centrale — 5e B', '   … son ouverture est notée (ouvert, pages), son nom ne change pas', fneuf)

// 7) Deux classeurs dans deux onglets : chacun dans sa base
await ecrire(p, 300, 300); await ecrire(p, 300, 380)
await ecrire(q, 600, 300)
await dort(1500)
const bp = await lireBase(p, BASE_PREMIER), bn = await lireBase(p, neuf.base)
const fp = formesParPage(docDe(bp.entrees)), fn = formesParPage(docDe(bn.entrees))
ok(JSON.stringify(fp) === '[2]' && JSON.stringify(fn) === '[1]', `7) deux classeurs dans deux onglets : le premier ${JSON.stringify(fp)}, l'autre ${JSON.stringify(fn)}, chacun dans sa base`)
ok(bn.infos?.id === neuf.id && bn.infos?.nom === 'Symétrie centrale — 5e B', '   … l\'identité du nouveau est dans sa base', bn.infos)
// La vue de chacun dans sa session
await p.evaluate(() => window.__app.zoomer(1.5)); await q.evaluate(() => window.__app.zoomer(0.7)); await dort(800)
const sessions = await p.evaluate(id => ({ premier: JSON.parse(localStorage.getItem('mem-session')), autre: JSON.parse(localStorage.getItem('mem-session:' + id)) }), neuf.id)
ok(sessions.premier?.page && sessions.autre?.page && sessions.premier.page !== sessions.autre.page, '   … chaque classeur a sa session : « mem-session » (le premier), « mem-session:<id> » (l\'autre)', sessions)
await q.reload(); await pret(q); await dort(400)
// (Adapté aux réglages par défaut, retouches après le lot 5 : rechargé, l'onglet reprend le centre de sa vue
// à 100 % — on arrive sur une page toujours à 100 % —, et non plus son zoom de 70 %)
const vq = await q.evaluate(() => { const a = window.__app, c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { cx: c.x, cy: c.y, z: a.cam.z } })
const sq = sessions.autre.vues[sessions.autre.page]
ok((await q.evaluate(() => window.__app.tableau.base)) === neuf.base && Math.abs(sq[2] - 0.7) < 1e-3 && vq.z === 1 && Math.abs(vq.cx - sq[0]) < 0.05 && Math.abs(vq.cy - sq[1]) < 0.05,
  '   … rechargé, l\'onglet rouvre son classeur et le centre de sa vue, à 100 %', { vq, sq })
// Le dernier ouvert est celui-ci : sans paramètre, c'est lui qui revient
let r = await ouvrirDev(ctx, '', 'sans-parametre')
ok((await r.evaluate(() => window.__app.tableau.base)) === neuf.base && r.url().endsWith('?classeur=' + neuf.id), `   … sans paramètre, le dernier classeur ouvert revient (${r.url().replace(DEV, '/')})`)
await r.close()
// Le suivi : un changement, puis l'onglet passe en arrière-plan : la fiche est à jour tout de suite
const m0 = await q.evaluate(id => window.__registre.classeur(id).then(f => ({ modifie: f.modifie, vecteur: f.vecteur.join() })), neuf.id)
await dort(50)
await ecrire(q, 700, 450); await dort(300)
await q.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
await dort(500)
const m1 = await q.evaluate(id => window.__registre.classeur(id).then(f => ({ modifie: f.modifie, vecteur: f.vecteur.join() })), neuf.id)
ok(m1.modifie > m0.modifie && m1.vecteur !== m0.vecteur, '   … le suivi : la fiche dit le changement (modifie, vecteur) quand l\'onglet passe en arrière-plan', { m0, m1 })
await q.evaluate(() => { delete document.visibilityState })
// Les autres onglets apprennent les changements de la bibliothèque
await p.evaluate(() => { window.__changements = []; window.__registre.onChange(c => window.__changements.push(c)) })
await q.evaluate(id => window.__registre.modifierClasseur(id, f => { f.etiquettes = ['5e B'] }), neuf.id)
await dort(300)
ok(JSON.stringify(await p.evaluate(() => window.__changements)) === JSON.stringify([{ type: 'change', classeurs: [neuf.id] }]), '   … un autre onglet apprend le changement (canal mem-teachingtool-bibliotheque)', await p.evaluate(() => window.__changements))

// 8) ouvrirBaseExistante sur un nom inconnu : rien n'est créé (même sans databases())
const inconnu = await p.evaluate(async () => {
  const b = await import('/src/classeurs/bases.ts')
  const nom = 'mem-teachingtool-classeur-ffffffffffffffff'
  const res = {}
  try { (await b.ouvrirBaseExistante(nom)).close(); res.ouvert = 'OUVERTE' } catch (e) { res.raison = e.raison }
  res.compte = await b.compterEntrees(nom)
  const d = indexedDB.databases; indexedDB.databases = undefined
  try { res.compteSans = await b.compterEntrees(nom) } finally { indexedDB.databases = d }
  try { await b.lireMisesAJour(nom); res.lu = 'LU' } catch (e) { res.lire = e.raison }
  await b.ecrireInfos(nom, { id: 'x', nom: 'x' })
  res.listee = (await indexedDB.databases()).some(x => x.name === nom)
  return res
})
ok(inconnu.raison === 'absente' && inconnu.compte === 0 && inconnu.compteSans === 0 && inconnu.lire === 'absente' && !inconnu.listee,
  '8) ouvrirBaseExistante sur un nom inconnu : rejet « absente » ; compterEntrees (avec et sans databases()), lireMisesAJour, ecrireInfos : rien dans databases()', inconnu)
// Une base créée vide par erreur (version 1, aucun magasin) : « abîmée », jamais écrite
const abimee = await p.evaluate(async () => {
  const b = await import('/src/classeurs/bases.ts')
  const nom = 'mem-teachingtool-classeur-0123456789abcdef'
  await new Promise((ok, ko) => { const r = indexedDB.open(nom); r.onsuccess = () => { r.result.close(); ok() }; r.onerror = () => ko(r.error) })
  const res = {}
  try { (await b.ouvrirBaseExistante(nom)).close(); res.ouvert = 'OUVERTE' } catch (e) { res.raison = e.raison }
  res.compte = await b.compterEntrees(nom)
  try { await b.creerBase(nom, new Uint8Array([0, 0]), { id: 'x', nom: 'x' }); res.creee = 'CRÉÉE' } catch (e) { res.creer = e.raison }
  const db = await new Promise(ok => { const r = indexedDB.open(nom); r.onsuccess = () => ok(r.result) })
  res.version = db.version; res.magasins = [...db.objectStoreNames]; db.close()
  await new Promise(ok => { const r = indexedDB.deleteDatabase(nom); r.onsuccess = ok; r.onerror = ok })
  return res
})
ok(abimee.raison === 'abimee' && abimee.compte === 0 && abimee.creer === 'existante' && abimee.version === 1 && abimee.magasins.length === 0,
  '   … une base créée vide par erreur : « abîmée », comptée 0, creerBase la refuse (« existante ») sans rien y mettre', abimee)

// 9) creerClasseur sur une base existante pleine : rejet, et l'empreinte est intacte
const avant9 = await lireBase(p, BASE_PREMIER)
const nbFiches9 = await p.evaluate(() => window.__registre.classeurs().then(l => l.length))
const refus9 = await p.evaluate(async () => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
  const res = {}
  let appele = false
  try {
    await window.__registre.creerClasseur({ ...dem.ficheDuPremier(dem.idClasseur()), nom: 'Intrus' }, async base => { appele = true; return bases.creerBase(base, new Uint8Array([0, 0]), { id: 'x', nom: 'x' }) })
    res.cree = 'CRÉÉ'
  } catch (e) { res.raison = e.raison }
  res.appele = appele
  try { await bases.creerBase('mem-tableau-local', new Uint8Array([0, 0]), { id: 'x', nom: 'Intrus' }); res.direct = 'CRÉÉE' } catch (e) { res.direct = e.raison }
  return res
})
const apres9 = await lireBase(p, BASE_PREMIER)
ok(refus9.raison === 'existante' && !refus9.appele && refus9.direct === 'existante' && apres9.entrees.join() === avant9.entrees.join() && JSON.stringify(apres9.infos) === JSON.stringify(avant9.infos)
  && (await p.evaluate(() => window.__registre.classeurs().then(l => l.length))) === nbFiches9,
  '9) creerClasseur et creerBase sur une base pleine : refusés (« existante »), rien d\'écrit ni d\'effacé, aucune fiche de plus', refus9)
// Un remplissage qui échoue : la fiche s'en va, la base n'est effacée que si remplir l'a créée
const echec = await p.evaluate(async () => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
  const id = dem.idClasseur(), base = dem.baseDe(id)
  const res = {}
  try { await window.__registre.creerClasseur({ ...dem.ficheDuPremier(id), base, nom: 'Raté' }, async () => { throw new bases.ErreurBase('place', 'plein', true) }) } catch (e) { res.raison = e.raison }
  res.fiche = await window.__registre.classeur(id) ?? null
  // remplir a créé la base, puis a échoué : elle est effacée
  const id2 = dem.idClasseur(), base2 = dem.baseDe(id2)
  try { await window.__registre.creerClasseur({ ...dem.ficheDuPremier(id2), base: base2, nom: 'Raté 2' }, async b => { await bases.creerBase(b, new Uint8Array([0, 0]), { id: id2, nom: 'x' }); throw new bases.ErreurBase('place', 'plein', true) }) } catch (e) { res.raison2 = e.raison }
  await new Promise(r => setTimeout(r, 300))
  res.base2 = (await indexedDB.databases()).some(d => d.name === base2)
  res.fiche2 = await window.__registre.classeur(id2) ?? null
  return res
})
ok(echec.raison === 'place' && echec.fiche === null && echec.raison2 === 'place' && !echec.base2 && echec.fiche2 === null, '   … un remplissage qui échoue : la fiche s\'en va ; la base créée par remplir est effacée', echec)

// 10) Deux fiches pour une même base : ConstraintError, par tous les chemins
const contrainte = await p.evaluate(async id => {
  const dem = await import('/src/classeurs/demarrage.ts')
  const res = {}
  try { await window.__registre.ajouterClasseur({ ...dem.ficheDuPremier(dem.idClasseur()), nom: 'Double' }); res.ajout = 'AJOUTÉE' } catch (e) { res.ajout = e.name }
  try { await window.__registre.modifierClasseur(id, f => { f.base = 'mem-tableau-local' }); res.modif = 'MODIFIÉE' } catch (e) { res.modif = e.name }
  res.fiches = (await window.__registre.classeurs()).filter(f => f.base === 'mem-tableau-local').length
  res.neuf = (await window.__registre.classeur(id)).base
  return res
}, neuf.id)
ok(contrainte.ajout === 'ConstraintError' && contrainte.modif === 'ConstraintError' && contrainte.fiches === 1 && contrainte.neuf === neuf.base,
  '10) deux fiches pour une même base : ConstraintError (ajouter, modifier), rien de changé', contrainte)
// Les dossiers ne font jamais de cycle ; changer l'identité garde la base
const dossiers = await p.evaluate(async id => {
  const reg = window.__registre, res = {}
  for (const [d, parent] of [['A', null], ['B', 'A'], ['C', 'B']]) await reg.ajouterDossier({ id: d, nom: d, parent, couleur: '#1f5fbf', cree: Date.now() })
  for (const [d, parent] of [['A', 'C'], ['A', 'A'], ['B', 'C'], ['A', 'inconnu']]) { try { await reg.deplacerDossier(d, parent); res[d + '→' + parent] = 'DÉPLACÉ' } catch (e) { res[d + '→' + parent] = e.raison } }
  res['C→null'] = (await reg.deplacerDossier('C', null)).parent
  res['A→C'] = (await reg.deplacerDossier('A', 'C')).parent
  res.parents = (await reg.dossiers()).map(d => d.id + ':' + d.parent).sort().join(' ')
  await reg.ecrireApercu(id, new Blob(['image']))
  await reg.garderPoignee(id, { nom: 'essai' })
  try { await reg.garderPoignee(id, () => 1); res.poigneeFonction = 'GARDÉE' } catch (e) { res.poigneeFonction = e.name }
  const f = await reg.changerIdentite(id, 'feedfacefeedface')
  res.identite = { id: f.id, base: f.base, ancien: (await reg.classeur(id)) ?? null, apercu: (await reg.apercu('feedfacefeedface'))?.size, apercuAncien: (await reg.apercu(id)) ?? null, poignee: (await reg.poignee('feedfacefeedface')) ?? null }
  await reg.changerIdentite('feedfacefeedface', id)
  await reg.ecrireReglage('tri', 'nom'); res.reglage = await reg.reglage('tri')
  return res
}, neuf.id)
ok(dossiers['A→C'] === 'C' && dossiers['A→A'] === 'cycle' && dossiers['B→C'] === 'cycle' && dossiers['A→inconnu'] === 'absent' && dossiers.parents === 'A:C B:A C:null'
  && dossiers.poigneeFonction === 'DataCloneError' && dossiers.identite.id === 'feedfacefeedface' && dossiers.identite.base === neuf.base && dossiers.identite.ancien === null
  && dossiers.identite.apercu === 5 && dossiers.identite.apercuAncien === null && dossiers.identite.poignee === null && dossiers.reglage === 'nom',
  '   … deplacerDossier refuse les cycles (relus dans la transaction) ; changerIdentite garde la base, l\'aperçu suit, la poignée est oubliée ; DataCloneError passe', dossiers)
// (A→C a d'abord été refusé : A contenait C ; une fois C remonté à la racine, A peut y aller)
await ctx.close()

// 11) Le trou : UNE écriture refusée par la base, repérée, puis réparée
ctx = await contexte()
p = await ouvrirDev(ctx, '', 'trou')
const trou = await p.evaluate(async () => {
  const a = window.__app, t = a.tableau, page = a.page, Tableau = t.constructor
  const pause = ms => new Promise(r => setTimeout(r, ms))
  const trait = x => ({ id: 'f' + x + Math.random().toString(16).slice(2, 6), type: 'trait', x: x * 50, y: 100, z: x, auteur: t.moi, pts: [0, 0, 0.5, 30, 20, 0.5, 60, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  const refuserUne = () => {
    const add = IDBObjectStore.prototype.add
    let refus = 0
    IDBObjectStore.prototype.add = function (...x) { const r = add.apply(this, x); if (this.name === 'updates' && refus === 0) { refus++; const tr = this.transaction; queueMicrotask(() => { try { tr.abort() } catch { /* finie */ } }) } return r }
    return () => { IDBObjectStore.prototype.add = add }
  }
  const res = { avant: { trou: t.trou, erreurBase: t.erreurBase } }
  window.__erreursBase = []; t.onErreurBase = r => window.__erreursBase.push(r)
  t.poser(page, trait(1)); await pause(300)
  let rendre = refuserUne()
  try { t.poser(page, trait(2)); res.geste = 'sans exception' } catch (e) { res.geste = 'LÈVE ' + e.name }
  rendre(); await pause(300)
  t.poser(page, trait(3)); await pause(300)
  res.apres = { trou: t.trou, erreurBase: t.erreurBase, signale: [...window.__erreursBase], enMemoire: t.formesDe(page).size }
  // Le témoin : ce que relirait un rechargement, sans réparation
  const temoin = new Tableau(t.base); await temoin.charger()
  res.temoin = { formes: temoin.formesDe(page)?.size, pendingStructs: !!temoin.doc.store.pendingStructs }
  temoin.couper()
  // La réparation refusée (la base refuse encore) : le trou reste
  rendre = refuserUne()
  try { await t.reparer(); res.reparation1 = 'RÉUSSIE' } catch (e) { res.reparation1 = 'refusée' }
  rendre()
  res.apresRefus = { trou: t.trou }
  // Puis acceptée
  await t.reparer()
  res.repare = { trou: t.trou, erreurBase: t.erreurBase }
  const relu = new Tableau(t.base); await relu.charger()
  res.relu = { formes: relu.formesDe(page)?.size, pendingStructs: !!relu.doc.store.pendingStructs }
  relu.couper()
  // On écrit encore après la réparation
  t.poser(page, trait(4)); await t.attendreEcritures()
  res.sansTrou = await t.reparer().then(() => 'rien à faire')
  return res
})
await dort(500)
ok(trou.avant.trou === false && trou.geste === 'sans exception' && trou.apres.trou === true && trou.apres.erreurBase === 'autre' && trou.apres.signale.join() === 'autre' && trou.apres.enMemoire === 3,
  `11) une écriture refusée : trou ${trou.apres.trou}, erreurBase « ${trou.apres.erreurBase} », signalé (onErreurBase), ${trou.apres.enMemoire} formes en mémoire`, trou)
ok(trou.temoin.formes === 1 && trou.temoin.pendingStructs, `   … le trou est réel : un rechargement n'aurait relu que ${trou.temoin.formes} forme (pendingStructs)`, trou.temoin)
ok(trou.reparation1 === 'refusée' && trou.apresRefus.trou === true, '   … une réparation que la base refuse encore rejette, et le trou reste', trou)
ok(trou.repare.trou === false && trou.repare.erreurBase === null && trou.relu.formes === 3 && !trou.relu.pendingStructs && trou.sansTrou === 'rien à faire',
  `   … reparer() réussit : la base relit ${trou.relu.formes} formes`, trou)
await p.reload(); await pret(p); await dort(400)
const recharge = await p.evaluate(() => ({ formes: window.__app.formes.length, pending: !!window.__app.tableau.doc.store.pendingStructs }))
ok(recharge.formes === 4 && !recharge.pending, `   … au rechargement, toutes les formes sont là (${recharge.formes} : les 3, et celle d'après la réparation)`)
// Une base qui ne s'ouvre pas du tout : le document vit en mémoire, et le dit
const indisponible = await p.evaluate(async () => {
  const Tableau = window.__app.tableau.constructor
  const open = IDBFactory.prototype.open
  IDBFactory.prototype.open = function (nom, v) { if (nom === 'essai-refusee') throw new DOMException('refusé', 'SecurityError'); return open.call(this, nom, v) }
  try {
    const t = new Tableau('essai-refusee')
    const fin = await Promise.race([t.charger().then(r => r), new Promise(r => setTimeout(() => r('PAS FINI'), 3000))])
    return { fin, pages: t.ordre.length, trou: t.trou, erreurBase: t.erreurBase }
  } finally { IDBFactory.prototype.open = open }
})
ok(indisponible.fin?.vide === true && indisponible.pages === 1 && indisponible.trou && indisponible.erreurBase === 'indisponible',
  '   … une base qui ne s\'ouvre pas ne retient pas charger() : le document vit en mémoire, erreurBase « indisponible »', indisponible)
await dort(300)
await ctx.close()
// Ce que y-indexeddb laisse passer sans le rattraper quand on refuse exprès ses
// écritures (une promesse de sa lecture sur une transaction abandonnée, l'ouverture
// refusée) : voulu par l'essai, filtré ici seulement
const voulues = /^trou: (refusé|.*The transaction (has finished|was aborted)|.*AbortError)/

// 12) La base supprimée depuis un autre onglet : la coupure franche, aucun geste ne lève
ctx = await contexte()
p = await ouvrirDev(ctx, '', 'suppression-premier')
const x12 = await creer(p, 'À supprimer', 'blanc')
q = await ouvrirDev(ctx, '?classeur=' + x12.id, 'suppression')
await ecrire(q, 400, 300); await dort(800)
await q.evaluate(() => { window.__coupee = []; const t = window.__app.tableau, f = t.onCoupee; t.onCoupee = r => { window.__coupee.push(r); f?.(r) } })
const suppression = await p.evaluate(base => new Promise(ok => {
  const r = indexedDB.deleteDatabase(base); let bloque = false
  r.onblocked = () => { bloque = true }
  r.onsuccess = () => ok({ resultat: 'supprimée', bloque })
  r.onerror = () => ok({ resultat: 'erreur ' + r.error?.name, bloque })
  setTimeout(() => ok({ resultat: 'PAS FINI', bloque }), 5000)
}), x12.base)
await dort(400)
const coupe = await q.evaluate(() => {
  const d = document.querySelector('dialog[open]')
  const res = { coupee: window.__coupee, titre: d?.querySelector('h2')?.textContent, texte: d?.querySelector('p')?.textContent }
  const a = window.__app, t = a.tableau
  try {
    t.poser(a.page, { id: 'apres', type: 'trait', x: 0, y: 0, z: 99, auteur: t.moi, pts: [0, 0, 0.5, 10, 10, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
    a.nouvellePage(); a.zoomer(1.2)
    res.gestes = 'sans exception'
  } catch (e) { res.gestes = 'LÈVE ' + e.name + ' ' + e.message }
  return res
})
await dort(800)
const bases12 = await basesDe(p)
ok(suppression.resultat === 'supprimée' && coupe.coupee.join() === 'supprime' && coupe.titre === 'Le classeur a été supprimé' && /supprimé définitivement/.test(coupe.texte || ''),
  `12) deleteDatabase depuis un autre onglet : ${suppression.resultat}${suppression.bloque ? ' (bloquée un instant)' : ''} ; onCoupee('${coupe.coupee}') ; « ${coupe.titre} »`, { suppression, coupe })
ok(coupe.gestes === 'sans exception' && !bases12.includes(x12.base), `   … les gestes suivants ne lèvent pas, et la base n'est pas recréée (${bases12.join(', ')})`, coupe)
await q.reload(); await pret(q); await dort(600)
const apres12 = await q.evaluate(() => ({ base: window.__app.tableau.base, url: location.search }))
const t12 = await toast(q)
ok(apres12.base === BASE_PREMIER && /n'a plus sa base dans ce navigateur/.test(t12) && !(await basesDe(q)).includes(x12.base),
  `   … rechargé : la fiche sans base n'est pas rouverte (rien n'est recréé), le premier s'ouvre ; « ${t12} »`, apres12)
await ctx.close()

// 13) Le repli : l'index ne s'ouvre pas ; le DERNIER classeur s'ouvre, l'adresse ne change pas, l'index n'est pas écrit
ctx = await contexte(() => {
  window.__ouvrirVraiment = IDBFactory.prototype.open
  const open = IDBFactory.prototype.open
  IDBFactory.prototype.open = function (nom, v) {
    if (nom === 'mem-teachingtool-bibliotheque' && sessionStorage.getItem('essai-sans-index')) throw new DOMException('Refusé pour l\'essai', 'SecurityError')
    return v === undefined ? open.call(this, nom) : open.call(this, nom, v)
  }
})
p = await ouvrirDev(ctx, '', 'repli')
const y13 = await creer(p, 'Fractions — 4e A', 'carreaux')
await p.goto(DEV + '?classeur=' + y13.id); await pret(p); await dort(800)
await ecrire(p, 400, 300); await dort(1000)
const lireIndex = () => p.evaluate(async () => {
  const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  const db = await req(window.__ouvrirVraiment.call(indexedDB, 'mem-teachingtool-bibliotheque'))
  const res = {}
  for (const m of db.objectStoreNames) { const s = db.transaction([m]).objectStore(m); res[m] = JSON.stringify([await req(s.getAllKeys()), (await req(s.getAll())).map(v => v instanceof Blob ? 'blob' : v)], (k, v) => v instanceof Uint8Array ? [...v].join() : v) }
  db.close(); return res
})
// Le suivi écrit tout de suite (l'onglet passe en arrière-plan) : rien n'attend plus d'être écrit dans l'index
const cache = () => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState })
await cache(); await dort(500)
const index13 = await lireIndex()
const entrees13 = (await lireBase(p, y13.base)).entrees.length
await p.evaluate(() => sessionStorage.setItem('essai-sans-index', '1'))
await p.goto(DEV); await pret(p); await dort(800)
const repli = await p.evaluate(() => ({ base: window.__app.tableau.base, classeur: window.__app.classeur, registre: window.__registre, url: location.href, titre: document.title, formes: window.__app.formes.length }))
const t13 = await toast(p)
ok(repli.base === y13.base && repli.classeur.id === y13.id && repli.registre === null && repli.url === DEV && repli.titre === 'Fractions — 4e A — MEM teachingtool' && repli.formes === 1,
  `13) le repli : le dernier classeur (« ${repli.classeur.nom} », pas le premier) s'ouvre avec sa forme, l'adresse ne change pas (${repli.url})`, repli)
ok(t13 === 'La bibliothèque des classeurs ne s\'ouvre pas dans ce navigateur : seul « Fractions — 4e A » est disponible. Enregistrez-le dans un fichier.', `   … le message : « ${t13} »`)
await ecrire(p, 500, 400); await dort(1200)
await cache(); await dort(500)
ok(JSON.stringify(await lireIndex()) === JSON.stringify(index13), '   … l\'index n\'est pas écrit (ni la fiche, ni l\'ouverture, ni le suivi)')
ok((await lireBase(p, y13.base)).entrees.length > entrees13, '   … ce qu\'on écrit s\'enregistre dans la base du classeur')
// Le dernier perdu (sa base n'existe plus) : le premier, sans rien créer
await p.evaluate(() => localStorage.setItem('mem-teachingtool-dernier-classeur', JSON.stringify({ id: 'abababababababab', base: 'mem-teachingtool-classeur-abababababababab', nom: 'Perdu' })))
await p.reload(); await pret(p); await dort(600)
const repli2 = await p.evaluate(async () => ({ base: window.__app.tableau.base, premier: window.__app.classeur.premier, bases: (await indexedDB.databases()).map(d => d.name) }))
ok(repli2.base === BASE_PREMIER && repli2.premier && !repli2.bases.includes('mem-teachingtool-classeur-abababababababab') && /seul « Mon tableau »/.test(await toast(p)),
  '   … le dernier sans base : le premier s\'ouvre, la base perdue n\'est pas créée', repli2)
// L'ancienne forme (l'id seul) : le premier
await p.evaluate(id => localStorage.setItem('mem-teachingtool-dernier-classeur', id), y13.id)
await p.reload(); await pret(p); await dort(600)
ok((await p.evaluate(() => window.__app.tableau.base)) === BASE_PREMIER, '   … l\'ancienne forme (l\'id seul, sans base) : le premier')
await p.evaluate(() => sessionStorage.removeItem('essai-sans-index'))
await ctx.close()

// La reprise coupée au milieu (transaction abandonnée) : rien de partiel, et rejouée ensuite
ctx = await contexte(() => {
  const put = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (...a) {
    const r = put.apply(this, a)
    if (this.name === 'etat' && a[1] === 'reprise' && sessionStorage.getItem('essai-couper')) { const t = this.transaction; queueMicrotask(() => { try { t.abort() } catch { /* finie */ } }) }
    return r
  }
})
p = await ctx.newPage(); suivre(p, 'reprise')
await p.goto(DEV + 'revoir.html')
await p.evaluate(() => sessionStorage.setItem('essai-couper', '1'))
await p.goto(DEV); await pret(p); await dort(600)
const coupee = await p.evaluate(async () => {
  const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  const db = await req(indexedDB.open('mem-teachingtool-bibliotheque'))
  const t = db.transaction(['classeurs', 'etat'])
  const res = { classeurs: (await req(t.objectStore('classeurs').getAll())).length, marque: (await req(t.objectStore('etat').get('reprise'))) ?? null, base: window.__app.tableau.base, registre: window.__registre }
  db.close(); return res
})
ok(coupee.classeurs === 0 && coupee.marque === null && coupee.base === BASE_PREMIER && coupee.registre === null && /ne s'ouvre pas/.test(await toast(p)),
  'La reprise coupée au milieu : ni fiche ni marque (rien de partiel) ; le premier s\'ouvre quand même (le repli)', coupee)
await p.evaluate(() => sessionStorage.removeItem('essai-couper'))
await p.reload(); await pret(p); await dort(600)
const rejouee = await p.evaluate(async () => ({ fiches: (await window.__registre.classeurs()).map(f => f.base), url: location.search }))
ok(JSON.stringify(rejouee.fiches) === JSON.stringify([BASE_PREMIER]) && /^\?classeur=[0-9a-f]{16}$/.test(rejouee.url), '   … rejouée ensuite : une fiche, celle du premier', rejouee)
await ctx.close()

// La reprise coupée net : le navigateur tué (SIGKILL) pendant sa transaction,
// tenue ouverte exprès (des lectures en chaîne après l'écriture de la fiche)
{
  const profil = mkdtempSync(ICI + 'profil-tue-')
  const lancer = () => chromium.launchPersistentContext(profil, { viewport: { width: 1366, height: 768 } })
  let pc = await lancer()
  await pc.addInitScript(() => {
    if (!sessionStorage.getItem('essai-lent')) return
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...a) {
      const r = put.apply(this, a)
      if (this.name === 'classeurs' && !window.__lent) {
        window.__lent = true
        const s = this, fin = performance.now() + 6000
        const encore = () => { if (performance.now() < fin) s.get('x').onsuccess = encore }
        encore()
      }
      return r
    }
  })
  let x = await pc.newPage()
  await x.goto(DEV + 'revoir.html'); await x.evaluate(() => sessionStorage.setItem('essai-lent', '1'))
  x.goto(DEV).catch(() => {})
  await dort(2500)
  const { execSync } = await import('node:child_process')
  const pids = execSync(`pgrep -f -- "${profil}" || true`).toString().trim().split('\n').filter(Boolean)
  for (const pid of pids) { try { process.kill(Number(pid), 'SIGKILL') } catch { /* déjà parti */ } }
  await dort(1000)
  try { await pc.close() } catch { /* tué */ }
  pc = await lancer()
  x = await pc.newPage(); suivre(x, 'tue')
  await x.goto(DEV + 'revoir.html')
  const vu = await x.evaluate(async () => {
    if (!(await indexedDB.databases()).some(d => d.name === 'mem-teachingtool-bibliotheque')) return { index: 'absent' }
    const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
    const db = await req(indexedDB.open('mem-teachingtool-bibliotheque'))
    const t = db.transaction(['classeurs', 'etat'])
    const res = { classeurs: (await req(t.objectStore('classeurs').getAll())).length, marque: (await req(t.objectStore('etat').get('reprise'))) ?? null }
    db.close(); return res
  })
  await x.goto(DEV); await pret(x); await dort(600)
  const ensuite = await x.evaluate(async () => (await window.__registre.classeurs()).map(f => f.base))
  ok(pids.length > 0 && (vu.index === 'absent' || (vu.classeurs === 0 && vu.marque === null)) && JSON.stringify(ensuite) === JSON.stringify([BASE_PREMIER]),
    `La reprise coupée net (navigateur tué, ${pids.length} processus, pendant sa transaction) : rien de partiel ; rejouée : une fiche`, { vu, ensuite })
  await pc.close()
  rmSync(profil, { recursive: true, force: true })
}

// Deux onglets qui démarrent ensemble sur un navigateur neuf : une seule fiche ; un navigateur neuf nomme son premier « Premier classeur »
ctx = await contexte()
{
  const [a, b, c] = await Promise.all([ctx.newPage(), ctx.newPage(), ctx.newPage()])
  for (const x of [a, b, c]) suivre(x, 'ensemble')
  await Promise.all([a, b, c].map(x => x.goto(DEV)))
  await Promise.all([a, b, c].map(pret)); await dort(1000)
  const l = await a.evaluate(async () => (await window.__registre.classeurs()).map(f => ({ id: f.id, base: f.base, nom: f.nom })))
  const ids = await Promise.all([a, b, c].map(x => x.evaluate(() => window.__app.classeur.id)))
  ok(l.length === 1 && l[0].base === BASE_PREMIER && l[0].nom === 'Premier classeur' && ids.every(i => i === l[0].id) && (await a.title()) === 'Premier classeur — MEM teachingtool',
    `Trois onglets ensemble sur un navigateur neuf : ${l.length} fiche, « ${l[0]?.nom} », le même id partout`, { l, ids })
  // Une adresse venue d'ailleurs
  // (Adapté au lot 4, morceau C5 : la bibliothèque existe ; une adresse
  // inconnue ici ouvre la bibliothèque seule, avec le même message, et non
  // plus le dernier classeur comme le faisait le provisoire de C1)
  const d = await ctx.newPage(); suivre(d, 'ailleurs')
  await d.goto(DEV + '?classeur=ffffffffffffffff')
  await d.waitForFunction(() => window.__bibliotheque && !document.querySelector('.bibliotheque').hidden, null, { timeout: 20000 }); await dort(500)
  const td = await toast(d)
  ok(td === 'Ce classeur n\'est pas dans la bibliothèque de ce navigateur. Pour l\'y ajouter, ouvrez son fichier (.memc).' && d.url().endsWith('?bibliotheque') && !(await d.evaluate(() => !!window.__app)),
    `Une adresse ?classeur= venue d'ailleurs : la bibliothèque seule s'ouvre, et le message le dit (« ${td} »)`, d.url())
  // L'index perdu : le premier revient, les autres bases restent (orphelines)
  const z = await creer(a, 'Orphelin', 'blanc')
  const zb = await ouvrirDev(ctx, '?classeur=' + z.id, 'orphelin')
  await ecrire(zb, 300, 300); await dort(1000)
  await zb.close()
  const effacement = await a.evaluate(() => new Promise(ok => { const r = indexedDB.deleteDatabase('mem-teachingtool-bibliotheque'); r.onsuccess = () => ok('effacé'); r.onerror = () => ok('erreur'); setTimeout(() => ok('PAS FINI'), 5000) }))
  for (const x of [b, c, d]) await x.close()
  // (Adapté au lot 4, morceau C5 : l'adresse de z, que le nouvel index ne
  // connaît pas, ouvre la bibliothèque seule ; sans adresse, le premier)
  await a.goto(DEV + '?classeur=' + z.id)
  await a.waitForFunction(() => window.__bibliotheque && !document.querySelector('.bibliotheque').hidden && !window.__app, null, { timeout: 20000 })
  // (Adapté au lot 4, morceau C8 : la bibliothèque seule adopte la base
  // orpheline, sous l'id et le nom rangés à côté de son document ; sans
  // adresse, c'est donc elle, la dernière ouverte, qui revient)
  for (let i = 0; i < 100 && !(await a.evaluate(base => window.__registre.classeurParBase(base).then(Boolean), z.base)); i++) await dort(200)
  await a.goto(DEV); await pret(a); await dort(800)
  const perdu = await a.evaluate(async () => ({ fiches: (await window.__registre.classeurs()).map(f => ({ base: f.base, id: f.id, nom: f.nom })), base: window.__app.tableau.base, bases: (await indexedDB.databases()).map(x => x.name) }))
  const orphelin = await lireBase(a, z.base)
  const fp = perdu.fiches.find(f => f.base === BASE_PREMIER), fz = perdu.fiches.find(f => f.base === z.base)
  ok(effacement === 'effacé' && perdu.fiches.length === 2 && fp && fp.id !== l[0].id && fz && fz.id === z.id && fz.nom === 'Orphelin' && perdu.base === z.base
    && perdu.bases.includes(z.base) && JSON.stringify(formesParPage(docDe(orphelin.entrees))) === '[1]' && orphelin.infos?.id === z.id,
    'L\'index perdu : le premier revient (une nouvelle fiche) ; l\'autre base, avec son contenu, est adoptée sous son id et son nom (C8), et s\'ouvre (la dernière ouverte)', { effacement, perdu })
}
await ctx.close()
await nav.close()

const filtrees = erreurs.filter(e => voulues.test(e))
if (filtrees.length) console.log('(erreurs voulues par l\'essai du trou, filtrées :', filtrees.length + ')')
erreurs.splice(0, erreurs.length, ...erreurs.filter(e => !voulues.test(e)))
console.log(erreurs.length ? '✗ ÉCHEC erreurs JS :\n' + erreurs.join('\n') : '✓ aucune erreur JS')
if (erreurs.length) echecs++
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'tout est bon')
process.exit(echecs ? 1 : 0)
