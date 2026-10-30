// T2. La clé (OPFS, permissions simulées) : atomicité (un fichier lu pendant
// l'écriture est l'ancien, entier), le fichier écrit se rouvre exactement,
// le fichier supprimé ou déplacé, la clé pleine, l'état toujours vrai.
import { lancerPersistant, V, DEV, ok, info, dort, INIT, ECOUTER_TOASTS, toasts, suivre, pret, ecrire, entree, etat, opfsLire, lireMemc, formesIds, attendreEcrites, nbEcrites, etatDeLaPage, memeContenu, erreurs } from './commun.mjs'
// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (la poignée de la clé relue depuis IndexedDB)
const nav = await lancerPersistant()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
const p = await ctx.newPage(); suivre(p, 'p')
await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
await entree(p, 'activer-cle')
ok(await attendreEcrites(p, 1, 15000), 'activée : une première écriture')
const nom = await p.evaluate(() => window.__ecritures[0].nom)
for (let i = 0; i < 6; i++) await ecrire(p, 200 + i * 40, 200 + i * 30)

// ---- 1. Atomicité : Ctrl + S, la fermeture retardée de 3 s ; on lit le fichier pendant ----
const avant = lireMemc(await opfsLire(p, nom))
await p.evaluate(() => { window.__retarderClose = 3000 })
const n0 = await nbEcrites(p)
await p.keyboard.press('Control+s')
await p.waitForFunction(() => window.__ecritures.some(e => e.attente && !e.fin), null, { timeout: 15000 })
const pendant = await opfsLire(p, nom)
let luPendant = null; try { luPendant = lireMemc(pendant) } catch (e) { luPendant = { erreur: e.message } }
ok(luPendant?.entier && luPendant.entete.date === avant.entete.date && luPendant.ids.length === avant.ids.length, 'atomicité : pendant l\'écriture, le fichier lu est l\'ancien, entier', { pendant: luPendant?.entete ?? luPendant, avant: avant.entete })
await attendreEcrites(p, n0 + 1, 15000)
await p.evaluate(() => { window.__retarderClose = 0 })
await p.waitForTimeout(500)

// ---- 2. Le fichier écrit se rouvre exactement ----
const surCle = lireMemc(await opfsLire(p, nom))
const memoire = await etatDeLaPage(p)
ok(surCle.entier && memeContenu(surCle.doc, memoire), 'le fichier de la clé a exactement le classeur de la page (structures, effacements)', { cle: surCle.ids.length, page: (await formesIds(p)).length })
// Un effacement (gomme : sélection + Suppr), puis Ctrl + S : l'effacement est dans le fichier
await p.evaluate(() => { const a = window.__app; const f = a.formes[0]; a.tableau.retirer?.(a.page, f.id) })
const retire = (await formesIds(p)).length
info('après un retrait par le document', retire)

// ---- 3. Le fichier supprimé de la clé (removeEntry), puis un trait ----
await p.evaluate(async nom => { await (await navigator.storage.getDirectory()).removeEntry(nom) }, nom)
await ecrire(p, 500, 500)
const nTent = await p.evaluate(() => window.__tentatives)
// (contrôle final du lot 4 : jusqu'à 100 s, et non 40. L'écriture automatique suivante part
// 20 s après le dernier changement, mais pas avant 20 fois la durée de la dernière écriture
// (l'en-tête de src/classeurs/cle.ts) ; or la dernière, celle du 1 (l'atomicité), a été
// ralentie à 3 s par l'essai lui-même : la suivante attend donc 60 s, et l'essai, qui ne
// l'attendait que 40 s, échouait toujours, sur la version d'avant la correction comme ici)
await p.waitForFunction(() => window.__cle.etat.etat === 'erreur', null, { timeout: 100000 }).catch(() => {})
let e = await etat(p)
ok(e.cle.etat === 'erreur' && e.court === 'Pas à jour, rien de perdu' && !e.lignes.some(l => /^cle:.*il y a|à l'instant/.test(l)), `fichier supprimé : « ${e.cle.message} », « ${e.court} »`, e)
ok(!!e.bandeau && e.bandeau.boutons.includes('Choisir un autre fichier…'), `   … le bandeau : « ${e.bandeau?.texte} » ${JSON.stringify(e.bandeau?.boutons)}`, e.bandeau)
info('toasts', await toasts(p))
// Ctrl + S : que se passe-t-il quand le fichier de la clé a disparu ?
await p.keyboard.press('Control+s')
await p.waitForTimeout(2500)
const t = await toasts(p)
info('Ctrl + S, fichier supprimé', { toasts: t, choix: await p.evaluate(() => window.__choix.length), etat: (await etat(p)).court })

// ---- 4. Choisir un autre fichier… ----
await p.evaluate(() => { window.__nomChoisi = 'autre.memc' })
await p.click('.bandeau-sauvegarde .bouton-bandeau:has-text("Choisir un autre fichier…")')
await p.waitForTimeout(3000)
e = await etat(p)
const autre = await opfsLire(p, 'autre.memc')
ok(e.cle.etat === 'ok' && autre && lireMemc(autre).entier && memeContenu(lireMemc(autre).doc, await etatDeLaPage(p)), `autre fichier : écrit, l'état « ${e.court} »`, e)

// ---- 5. La clé pleine pendant l'écriture automatique : l'état ----
await p.evaluate(() => { window.__panne = 'QuotaExceededError' })
await ecrire(p, 600, 300)
// (contrôle final du lot 4 : jusqu'à 100 s, et non 40. L'écriture automatique suivante part
// 20 s après le dernier changement, mais pas avant 20 fois la durée de la dernière écriture
// (l'en-tête de src/classeurs/cle.ts) ; or la dernière, celle du 1 (l'atomicité), a été
// ralentie à 3 s par l'essai lui-même : la suivante attend donc 60 s, et l'essai, qui ne
// l'attendait que 40 s, échouait toujours, sur la version d'avant la correction comme ici)
await p.waitForFunction(() => window.__cle.etat.etat === 'erreur', null, { timeout: 100000 }).catch(() => {})
e = await etat(p)
ok(e.cle.etat === 'erreur' && /plein/.test(e.cle.message) && e.court === 'Pas à jour, rien de perdu', `disque plein : « ${e.cle.message} »`, e)
const apres = lireMemc(await opfsLire(p, 'autre.memc'))
ok(apres.entier, '   … le fichier d\'avant reste entier')
await p.evaluate(() => { window.__panne = null })
await p.waitForFunction(() => window.__cle.etat.etat === 'ok', null, { timeout: 45000 }).catch(() => {})
e = await etat(p)
ok(e.cle.etat === 'ok' && (await toasts(p)).some(t => /^L'enregistrement dans « .* » reprend\.$/.test(t)), `   … la place revenue : « ${e.court} »`, e)
console.log('erreurs JS :', erreurs)
await nav.close()
