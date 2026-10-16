// T10. La clé activée, mais sa première écriture a échoué (le fichier est
// vide) ; on recharge : que dit l'état avant la prochaine écriture ?
import { chromium, V, DEV, ok, info, dort, INIT, ECOUTER_TOASTS, toasts, suivre, pret, ecrire, entree, etat, opfsLire, erreurs } from './commun.mjs'
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
const p = await ctx.newPage(); suivre(p, 'p')
await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
await ecrire(p, 300, 300)
await p.evaluate(() => { window.__panne = 'NoModificationAllowedError' })
await entree(p, 'activer-cle')
await p.waitForTimeout(2500)
info('activation, première écriture refusée', { toasts: await toasts(p), etat: (await etat(p)).court })
const fiche = await p.evaluate(async () => { const f = await window.__registre.classeur(window.__app.classeur.id); return f.cle })
info('fiche.cle', fiche)
await p.reload(); await pret(p); await p.waitForTimeout(800)
// Le professeur se remet tout de suite à écrire (pas de calme : pas d'écriture)
const lignes = []
for (let i = 0; i < 6; i++) {
  const e = await etat(p)
  const taille = (await opfsLire(p, 'Premier classeur.memc'))?.length ?? null
  lignes.push({ s: i * 3, cle: e.lignes.find(l => l.startsWith('cle')), court: e.court, taille })
  await ecrire(p, 200 + i * 30, 400); await p.waitForTimeout(2800)
}
info('après le rechargement', lignes)
ok(!lignes.some(l => /à jour/.test(l.cle ?? '') && l.taille === 0), 'la ligne de la clé ne dit pas « à jour » tant que le fichier de la clé est vide', lignes)
console.log('erreurs JS :', erreurs)
await nav.close()
