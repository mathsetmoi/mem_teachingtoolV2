// M8. LE REGISTRE DES PUBLICATIONS D'UNE COPIE
// « Dupliquer le classeur » vide le registre des publications de la copie
// (sinon, republier depuis la copie une séance de l'original met à jour le
// lien déjà donné à l'autre classe). Les autres chemins qui font une copie
// d'un classeur dans la même bibliothèque le font-ils aussi ? « Ouvrir un
// classeur » → « Ajouter quand même comme copie » (ou « Ajouter comme
// copie » quand chacun a changé de son côté, et une bibliothèque .memb dont
// un classeur a divergé).
import { O, ok, dort, pret, lancer, outil, suivre, erreurs, serveur, attendreServeur, docDe, resume, echecs, constats, M, PREFIXE } from './commun.mjs'
import { simulerGoogle } from './google.mjs'
import { mkdirSync, mkdtempSync } from 'node:fs'

const srv = serveur(); await attendreServeur()
mkdirSync(M + 'profils', { recursive: true }); mkdirSync(M + 'fichiers', { recursive: true })
const sansChoix = () => { try { delete window.showSaveFilePicker; delete window.showOpenFilePicker } catch {} ; window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined }
const seule = l => [...new Set(l)]
const F = M + 'fichiers/'
async function trait(p, x, y) { await p.mouse.move(x, y); await p.mouse.down(); for (let k = 1; k < 12; k++) await p.mouse.move(x + k * 15, y + Math.sin(k) * 10); await p.mouse.up(); await dort(250) }
async function publier(p) {
  await p.click('button[title="Publier le replay pour les élèves"]')
  await p.waitForSelector('.dialogue-publier[open]')
  const texte = (await p.textContent('.dialogue-publier[open]')).replace(/\s+/g, ' ')
  await p.click('.p-publier')
  await p.waitForFunction(() => { const e = document.querySelector('.p-etat'); return /publiée|mise à jour|erreur|pas à jour|ne trouve pas/.test(e.textContent) && !/Connexion|Envoi|Vérification|Préparation/.test(e.textContent) }, null, { timeout: 20000 })
  const etat = (await p.textContent('.p-etat')).trim()
  const lien = await p.inputValue('.p-lien')
  await p.keyboard.press('Escape'); await dort(300)
  return { deja: /Déjà publiée le/.test(texte), etat, id: new URL(lien).searchParams.get('id') }
}

const dir = mkdtempSync(M + 'profils/m8-')
const ctx = await lancer(dir)
await ctx.addInitScript(sansChoix)
ctx.on('page', x => suivre(x, 'm8'))
const drive = await simulerGoogle(ctx)
const q = await outil(ctx)
try {
  const p = await ctx.newPage()
  await p.goto(O + '/nouveau-dev/index.html'); await pret(p); await dort(1500)
  const idOriginal = await p.evaluate(() => window.__app.classeur.id)
  for (let i = 0; i < 4; i++) await trait(p, 250, 200 + i * 60)
  const pub = await publier(p)
  console.log('l\'original publie sa séance :', pub.etat.slice(0, 40), pub.id)
  ok(/publiée/.test(pub.etat), 'l\'original a publié sa séance (Google simulé), lien ' + pub.id)
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.keyboard.press('Control+s')])
  await dl.saveAs(F + 'm8-original.memc'); await dort(500)

  // 1) Le témoin : Dupliquer le classeur
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForSelector('.bibliotheque', { state: 'visible' })
  const dup = await p.evaluate(i => window.__bibliotheque.dupliquer(i).then(f => f && f.id), idOriginal)
  await dort(800)
  const regDup = resume(docDe((await q.evaluate(n => window.base(n), PREFIXE + dup)).entrees)).publications
  ok(regDup.length === 0, 'Dupliquer : la copie n\'a pas le registre des publications', regDup)
  await p.keyboard.press('Escape'); await dort(300)

  // 2) Ouvrir le fichier de l'original, « Ajouter quand même comme copie »
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }), p.keyboard.press('Control+o')])
  await fc.setFiles(F + 'm8-original.memc')
  await p.waitForSelector('.dialogue-fichiers[open]', { timeout: 20000 }); await dort(300)
  const boutons = await p.$$eval('.dialogue-fichiers[open] button', l => l.map(b => `${b.dataset.a}:${b.textContent}`))
  console.log('fenêtre :', boutons)
  await Promise.all([p.waitForURL(u => !u.toString().includes(idOriginal), { timeout: 20000 }), p.click('.dialogue-fichiers[open] [data-a="copie"]')])
  await pret(p); await dort(1500)
  const copie = await p.evaluate(() => ({ id: window.__app.classeur.id, nom: window.__app.classeur.nom, base: window.__app.classeur.base }))
  const regCopie = resume(docDe((await q.evaluate(n => window.base(n), copie.base)).entrees)).publications
  console.log('la copie :', copie.nom, '| son registre des publications :', regCopie)
  ok(regCopie.length === 0, '« Ajouter quand même comme copie » : la copie n\'a pas le registre des publications (comme Dupliquer)', regCopie)
  // La conséquence : on prépare la séance pour l'autre classe dans la copie, et on la publie
  await trait(p, 600, 500)
  const pub2 = await publier(p)
  console.log('la copie publie :', pub2.deja ? '(« Déjà publiée » dans la fenêtre)' : '', pub2.etat.slice(0, 70), pub2.id)
  const fichierDrive = drive.get(pub.id)
  ok(pub2.id !== pub.id, 'publier depuis la copie fait un nouveau lien, et ne touche pas celui déjà donné à l\'autre classe', { lienOriginal: pub.id, lienCopie: pub2.id, etat: pub2.etat.slice(0, 60) })
  console.log('fichiers séance sur le Drive :', [...drive.values()].filter(d => d.mimeType !== 'application/vnd.google-apps.folder').map(d => d.name))
  await p.evaluate(() => window.__surveillance?.laisserPartir?.())
} finally {
  console.log('erreurs JS :', erreurs.length ? seule(erreurs).slice(0, 12) : 'aucune')
  await ctx.close().catch(() => {}); srv.kill()
  console.log(echecs ? `${echecs} ÉCHEC(S)\n - ` + constats.join('\n - ') : 'tout est bon')
  process.exit(echecs ? 1 : 0)
}
