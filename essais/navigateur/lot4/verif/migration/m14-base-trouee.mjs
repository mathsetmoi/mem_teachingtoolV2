// M14. UNE BASE TROUÉE AU RECHARGEMENT
// Une écriture refusée par le navigateur (le disque plein un instant), puis
// l'onglet fermé ou le poste éteint avant la réparation : la base garde
// tout ce qui a suivi, mais Yjs ne peut plus le relire (il attend la mise à
// jour manquante). On fabrique ce cas (une entrée du milieu retirée de la
// base), puis on rouvre le classeur : que dit l'état ? que donne Ctrl + S ?
// le fichier se rouvre-t-il ? la base est-elle gardée telle quelle ?
import { O, ok, dort, pret, lancer, outil, suivre, erreurs, serveur, attendreServeur, docDe, resume, echecs, constats, M, PREFIXE } from './commun.mjs'
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import * as Y from 'yjs'

const srv = serveur(); await attendreServeur()
mkdirSync(M + 'profils', { recursive: true })
const seule = l => [...new Set(l)]
const F = M + 'fichiers/'
const sansChoix = () => { try { delete window.showSaveFilePicker; delete window.showOpenFilePicker } catch {} ; window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined }
async function trait(p, x, y) { await p.mouse.move(x, y); await p.mouse.down(); for (let k = 1; k < 10; k++) await p.mouse.move(x + k * 15, y + k * 3); await p.mouse.up(); await dort(400) }
const dir = mkdtempSync(M + 'profils/m14-')
const ctx = await lancer(dir, { acceptDownloads: true })
await ctx.addInitScript(sansChoix)
ctx.on('page', x => suivre(x, 'm14'))
const q = await outil(ctx)
try {
  let p = await ctx.newPage()
  await p.goto(O + '/nouveau-dev/index.html'); await pret(p); await dort(1500)
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForSelector('.bibliotheque', { state: 'visible' })
  await p.evaluate(() => window.__bibliotheque.nouveauClasseur()); await p.waitForSelector('.dialogue-nouveau[open]')
  await p.fill('.dialogue-nouveau input[name="nom"]', 'Troué')
  await p.click('.dialogue-nouveau [data-a="creer"]')
  await p.waitForFunction(() => window.__app?.classeur?.nom === 'Troué', null, { timeout: 20000 }); await pret(p); await dort(1000)
  const id = await p.evaluate(() => window.__app.classeur.id)
  for (let i = 0; i < 5; i++) await trait(p, 250, 150 + i * 70)
  await p.evaluate(() => window.__app.tableau.attendreEcritures())
  await p.evaluate(() => window.__surveillance?.laisserPartir?.())
  await p.close(); await dort(500)
  // La base : on retire l'entrée du 2e trait (comme une écriture refusée)
  const b0 = await q.evaluate(n => window.base(n), PREFIXE + id)
  const docs = b0.entrees.map(e => { const d = new Y.Doc(); try { Y.applyUpdate(d, Buffer.from(e, 'base64')) } catch {} return d })
  // L'entrée qui ajoute la 2e forme : on cherche, parmi les entrées, celle dont le retrait laisse le plus de formes cachées
  let meilleure = -1, cachees = 0
  for (let k = 1; k < b0.entrees.length; k++) {
    const reste = b0.entrees.filter((_, i) => i !== k)
    const d = docDe(reste)
    const vues = Object.values(resume(d).formes).reduce((a, b) => a + b, 0)
    if (d.store.pendingStructs && 5 - vues > cachees) { cachees = 5 - vues; meilleure = k }
  }
  console.log('entrées :', b0.entrees.length, '; on retire la clé', b0.cles[meilleure], ':', cachees, 'formes deviennent illisibles')
  await q.evaluate(async ({ nom, cle }) => {
    const db = await new Promise(ok => { const r = indexedDB.open(nom); r.onsuccess = () => ok(r.result) })
    const t = db.transaction(['updates'], 'readwrite'); t.objectStore('updates').delete(cle)
    await new Promise(ok => { t.oncomplete = ok }); db.close()
  }, { nom: PREFIXE + id, cle: b0.cles[meilleure] })
  const b1 = await q.evaluate(n => window.base(n), PREFIXE + id)
  // Le classeur rouvert
  p = await ctx.newPage()
  await p.goto(O + '/nouveau-dev/index.html?classeur=' + id); await pret(p); await dort(2500)
  const vu = await p.evaluate(() => ({
    formes: window.__app.tableau.formesDe(window.__app.page).size,
    pendants: !!window.__app.tableau.doc.store.pendingStructs,
    trou: window.__app.tableau.trou,
    lignes: window.__surveillance.texte.lignes.map(l => l.texte), court: window.__surveillance.texte.court,
  }))
  console.log('rouvert :', JSON.stringify(vu))
  ok(!vu.lignes.some(l => /^Enregistré dans ce navigateur/.test(l)) || !vu.pendants, 'l\'état ne dit pas « Enregistré dans ce navigateur » quand une partie du classeur ne se relit pas', vu)
  // Ctrl + S
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.keyboard.press('Control+s')])
  await dort(1500)
  const msg = ((await p.textContent('.toast').catch(() => '')) || '').replace(/\s+/g, ' ').trim()
  console.log('Ctrl + S :', dl ? dl.suggestedFilename() : 'pas de fichier', '|', msg.slice(0, 200))
  if (dl) {
    await dl.saveAs(F + 'm14-troue.memc')
    const o = readFileSync(F + 'm14-troue.memc'); const fin = o.indexOf(0x0a)
    const d = docDe([new Uint8Array(gunzipSync(o.subarray(fin + 1)))])
    console.log('le fichier : en attente dans Yjs :', !!d.store.pendingStructs, '; formes lisibles :', JSON.stringify(resume(d).formes))
    // On le rouvre (Ctrl + O)
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.keyboard.press('Control+o')])
    await fc.setFiles(F + 'm14-troue.memc')
    await dort(2500)
    const apres = ((await p.textContent('.toast').catch(() => '')) || '').replace(/\s+/g, ' ').trim()
    const fen = await p.evaluate(() => !!document.querySelector('.dialogue-fichiers[open]'))
    console.log('le fichier rouvert :', fen ? 'la fenêtre « Ouvrir ce classeur ? »' : apres.slice(0, 200))
    ok(fen || !/abîmé/.test(apres), 'le fichier que Ctrl + S vient d\'écrire se rouvre', { message: apres.slice(0, 200), annonce: msg.slice(0, 160) })
    if (fen) await p.keyboard.press('Escape')
  }
  await dort(500)
  const b2 = await q.evaluate(n => window.base(n), PREFIXE + id)
  ok(b2.entrees.length >= b1.entrees.length && b1.entrees.every(e => b2.entrees.includes(e)), 'la base trouée n\'est ni vidée ni réécrite (on peut encore la réparer avec le morceau manquant)')
  await p.evaluate(() => window.__surveillance?.laisserPartir?.())
} finally {
  console.log('erreurs JS :', erreurs.length ? seule(erreurs).slice(0, 12) : 'aucune')
  await ctx.close().catch(() => {}); srv.kill()
  console.log(echecs ? `${echecs} ÉCHEC(S)\n - ` + constats.join('\n - ') : 'tout est bon')
  process.exit(echecs ? 1 : 0)
}
