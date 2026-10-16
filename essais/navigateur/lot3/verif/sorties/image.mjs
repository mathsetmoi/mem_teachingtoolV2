// Copier en image : le presse-papiers (PNG, taille, cadrage, fond), « Sans le fond »,
// une sélection, une page très haute, le repli par téléchargement
import { nav, ouvrir, verifier, mkdir, V, erreurs, msgs, b64 } from './lib.mjs'
import { writeFileSync, readFileSync } from 'node:fs'
import { ECRIRE } from '../../P9/ecriture.mjs'
const D = mkdir(V + '/out/image')
const { ctx, page } = await ouvrir({}, 'image')
await page.evaluate(ECRIRE, { pages: 1, lignes: 4, mots: 5, fond: 'carreaux' })
await page.evaluate(() => { const a = window.__app; a.tableau.poser(a.page, { id: 'tri', type: 'polygone', x: 300, y: 500, z: 99, auteur: a.tableau.moi, pts: [0, 0, 200, 30, 80, 160], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] }) })
await page.waitForTimeout(400)
/** Lit l'image du presse-papiers : ses types, sa taille, ses pixels (analyse).
 *  Mis à jour au contrôle final : l'encre rouge compte comme de l'encre (un
 *  mot sur sept est rouge) ; et le fond se reconnaît à ses lignes (les
 *  rangées de pixels bleu pâle sur plus de la moitié de la largeur), pas au
 *  seul nombre de pixels bleu pâle, que le bord adouci du triangle bleu et
 *  les noms de ses sommets ont aussi */
const lirePP = () => page.evaluate(async () => {
  const items = await navigator.clipboard.read()
  const types = items.flatMap(i => i.types)
  const it = items.find(i => i.types.includes('image/png'))
  if (!it) return { types }
  const b = await it.getType('image/png')
  const tete = new Uint8Array(await b.slice(0, 8).arrayBuffer())
  const bmp = await createImageBitmap(b)
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
  const x = c.getContext('2d'); x.drawImage(bmp, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height).data
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, bleus = 0, opaques = 0, lignes = 0
  for (let y = 0; y < c.height; y++) {
    let rangee = 0
    for (let k = 0; k < c.width; k++) {
      const i = (y * c.width + k) * 4
      if (d[i + 3] === 255) opaques++
      if ((d[i] < 120 && d[i + 1] < 120) || (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 110)) { x0 = Math.min(x0, k); x1 = Math.max(x1, k); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
      if (d[i + 2] > 200 && d[i] < 225 && d[i] > 150 && Math.abs(d[i] - d[i + 1]) < 40) { bleus++; rangee++ }
    }
    if (rangee > c.width / 2) lignes++
  }
  return { types, png: [...tete].join(',') === '137,80,78,71,13,10,26,10', l: c.width, h: c.height, octets: b.size, encre: { x0, y0, x1, y1 }, bleus, lignes, opaques: opaques / (c.width * c.height), data: c.toDataURL().split(',')[1] }
})
const menuPage = async (libelle = 'Copier la page en image') => {
  await page.mouse.click(1200, 650, { button: 'right' }); await page.waitForTimeout(200)
  await page.locator('.menu-flottant .menu-item', { hasText: libelle }).first().click()
}
const attendreMsg = async re => { for (let k = 0; k < 50; k++) { const m = await msgs(page); const t = m.filter(x => re.test(x.t)).at(-1); if (t) return t; await page.waitForTimeout(100) } return null }
await page.evaluate(() => navigator.clipboard.writeText('rien'))
await page.evaluate(() => { window.__msgs.length = 0 })
await menuPage()
const m1 = await attendreMsg(/Image copiée|refusée|ne sait pas/)
const pp = await lirePP()
writeFileSync(D + '/page.png', Buffer.from(pp.data, 'base64'))
const boite = await page.evaluate(async () => { const a = window.__app, ap = a.ui.apercus; const f = [...a.tableau.formesDe(a.page).values()]; await ap.mesurer(f); return ap.boite(f) })
delete pp.data
console.log(m1, pp, boite)
verifier('« Copier la page en image » : message « Image copiée : collez-la dans l\'ENT ou Pronote (Ctrl+V) » avec « Sans le fond »', m1?.t === 'Image copiée : collez-la dans l\'ENT ou Pronote (Ctrl+V)' && m1.actions.includes('Sans le fond'), m1)
verifier('… le presse-papiers contient un PNG', pp.png && pp.types.includes('image/png'), pp.types)
const L = boite.l + 32, H = boite.h + 32
verifier(`… à 2 px par unité : ${Math.ceil(L * 2)} × ${Math.ceil(H * 2)} (boîte ${boite.l} × ${boite.h} + 16 de marge)`, Math.abs(pp.l - L * 2) <= 1 && Math.abs(pp.h - H * 2) <= 1, [pp.l, pp.h])
verifier('… cadrée : l\'encre commence à environ 32 px du bord (la marge de 16 unités)', pp.encre.x0 >= 28 && pp.encre.x0 <= 40 && pp.encre.y0 >= 28 && pp.encre.y0 <= 40 && pp.l - pp.encre.x1 >= 28 && pp.h - pp.encre.y1 >= 28, pp.encre)
verifier('… le fond (carreaux) est dans l\'image, opaque', pp.bleus > 1000 && pp.lignes > 10 && pp.opaques === 1, { bleus: pp.bleus, lignes: pp.lignes, opaques: pp.opaques })
// « Sans le fond »
await page.locator('.toast button', { hasText: 'Sans le fond' }).click()
const m2 = await attendreMsg(/Image copiée/)
await page.waitForTimeout(300)
const pp2 = await lirePP(); writeFileSync(D + '/sans-fond.png', Buffer.from(pp2.data, 'base64')); delete pp2.data
const cle = await page.evaluate(() => localStorage.getItem('mem-sortie-fond'))
verifier('« Sans le fond » : copiée de nouveau sans les carreaux, le choix gardé (mem-sortie-fond = 0), le bouton devient « Avec le fond »', pp2.lignes === 0 && cle === '0' && (await msgs(page)).at(-1).actions.includes('Avec le fond'), { lignes: pp2.lignes, bleus: pp2.bleus, cle, m: (await msgs(page)).at(-1) })
// Une sélection : le triangle seul
await page.evaluate(() => { const a = window.__app; a.choisirOutil?.('selection'); a.selection = new Set(['tri']); a.ui.maj() })
const sel = await page.evaluate(() => window.__app.objetsChoisis().map(f => f.id))
console.log('sélection', sel)
await page.evaluate(() => window.__app.ui.copierEnImage('selection'))
await attendreMsg(/Image copiée/)
await page.waitForTimeout(300)
const pp3 = await lirePP(); writeFileSync(D + '/selection.png', Buffer.from(pp3.data, 'base64')); delete pp3.data
const bt = await page.evaluate(async () => { const a = window.__app, ap = a.ui.apercus; return ap.boite([a.tableau.formesDe(a.page).get('tri')]) })
verifier('« Copier en image » d\'une sélection (le triangle) : l\'image est cadrée sur lui', Math.abs(pp3.l - (bt.l + 32) * 2) <= 1 && Math.abs(pp3.h - (bt.h + 32) * 2) <= 1, { pp3, bt })
// Une page très haute : 1 900 × 10 000 unités
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  a.nouvellePage(); t.changerFond(a.page, 'seyes')
  const f = []
  for (let l = 0; l < 130; l++) f.push({ id: 'h' + l, type: 'segment', x: 0, y: l * 76, z: l, auteur: t.moi, dx: 1868, dy: 0, couleur: '#1b2230', taille: 3 })
  f.push({ id: 'hb', type: 'segment', x: 0, y: 0, z: 999, auteur: t.moi, dx: 0, dy: 9968, couleur: '#1b2230', taille: 3 })
  t.nouveauGeste(); t.poserPlusieurs(a.page, f)
})
await page.waitForTimeout(500)
await page.evaluate(() => { window.__msgs.length = 0 })
await page.evaluate(() => window.__app.ui.copierEnImage('page'))
const m4 = await attendreMsg(/Image copiée/)
await page.waitForTimeout(300)
const pp4 = await lirePP(); delete pp4.data
verifier('Page très haute (1 900 × 10 000) : image ≤ 4 096 px de côté et ≤ ~4,2 Mpx, le message propose « Exporter en PDF »', pp4.h <= 4096 && pp4.l * pp4.h <= 4.2e6 && m4?.actions.includes('Exporter en PDF'), { l: pp4.l, h: pp4.h, m4 })
console.log(erreurs)
await ctx.close()

// ---- Le repli : l'écriture refusée, puis un navigateur sans ClipboardItem ----
for (const cas of ['refus', 'sans']) {
  const { ctx, page } = await ouvrir({}, 'repli-' + cas)
  await page.evaluate(ECRIRE, { pages: 1, lignes: 2, mots: 3, fond: 'blanc' })
  await page.evaluate(cas => {
    if (cas === 'refus') navigator.clipboard.write = () => Promise.reject(new DOMException('refusé', 'NotAllowedError'))
    else delete window.ClipboardItem
    window.__msgs.length = 0
  }, cas)
  await page.mouse.click(1200, 650, { button: 'right' }); await page.waitForTimeout(200)
  await page.locator('.menu-flottant .menu-item', { hasText: 'Copier la page en image' }).first().click()
  await page.waitForTimeout(800)
  const m = (await msgs(page)).at(-1)
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
  const bouton = page.locator('.toast button', { hasText: 'Enregistrer l\'image (.png)' })
  const vu = await bouton.count()
  if (vu) await bouton.click()
  const d = await dl
  let png = false, nom = null
  if (d) { const f = `${D}/repli-${cas}.png`; await d.saveAs(f); nom = d.suggestedFilename(); png = readFileSync(f).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) }
  await page.waitForTimeout(300)
  verifier(`Repli (${cas === 'refus' ? 'écriture refusée' : 'pas de ClipboardItem'}) : « ${cas === 'refus' ? 'La copie de l\'image a été refusée.' : 'Ce navigateur ne sait pas copier une image.'} », puis « Enregistrer l'image (.png) » télécharge page-1.png (un PNG), « Image enregistrée : page-1.png »`,
    m?.t === (cas === 'refus' ? 'La copie de l\'image a été refusée.' : 'Ce navigateur ne sait pas copier une image.') && vu === 1 && png && nom === 'page-1.png' && (await msgs(page)).at(-1).t === 'Image enregistrée : page-1.png', { m, vu, nom, png, fin: (await msgs(page)).at(-1) })
  await ctx.close()
}
console.log(erreurs)
await nav.close()
