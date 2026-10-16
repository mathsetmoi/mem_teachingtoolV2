// 30 pages (écriture, une figure nommée, deux formules, fonds variés) : tout le
// tableau par le menu ⋯ ; durée, tâches longues, taille, progression, validité
import { nav, ouvrir, exporter, info, infoPages, images, rendre, verifier, menuFichier, mkdir, V, erreurs, msgs } from './lib.mjs'
import { ECRIRE } from '../../P9/ecriture.mjs'
import { readFileSync } from 'node:fs'
const D = mkdir(V + '/out/trente')
const { ctx, page } = await ouvrir({}, 'trente')
await page.evaluate(ECRIRE, { pages: 30, lignes: 8, mots: 7, fond: 'carreaux' })
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  const fonds = ['carreaux', 'seyes', 'blanc', 'repere']
  a.pages.forEach((p, i) => {
    t.changerFond(p, fonds[i % 4])
    t.poser(p, { id: 'tri' + i, type: 'polygone', x: 300, y: 760, z: 99, auteur: t.moi, pts: [0, 0, 260, 40, 100, 220], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] })
    t.poser(p, { id: 'f1' + i, type: 'formule', x: 120, y: 1020, z: 100, auteur: t.moi, latex: '\\dfrac{a+b}{2}\\geqslant\\sqrt{ab}', couleur: '#1b2230', taille: 36 })
    t.poser(p, { id: 'f2' + i, type: 'formule', x: 600, y: 1020, z: 101, auteur: t.moi, latex: '\\int_0^1 x^{' + i + '}\\,dx=\\frac{1}{' + (i + 1) + '}', couleur: '#d64545', taille: 36 })
  })
  a.allerPage(a.pages[0])
})
await page.waitForTimeout(1500)
await page.evaluate(() => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: false })
})
const r = await exporter(page, D, 'trente', menuFichier(page), { attente: 300000 })
const longues = await page.evaluate(() => window.__longues)
const i = info(r.fichier)
const pages = infoPages(r.fichier)
const im = images(r.fichier)
const m = await msgs(page)
const prog = m.filter(x => /feuille \d+ sur/.test(x.t)).map(x => x.t)
console.log(r.propose, i.pages, (i.octets / 1e6).toFixed(2) + ' Mo', r.ms + ' ms', 'longues', JSON.stringify(longues), m.at(-1).t)
verifier('30 pages : 30 feuilles A4 portrait', i.pages === 30 && pages.every(p => p.l === 595.28 && p.h === 841.89), pages.filter(p => p.h !== 841.89))
verifier('… toutes les images à 200 ppp', im.length === 30 && im.every(x => x.xppi >= 199 && x.yppi >= 199), im.filter(x => x.xppi < 199))
verifier('… aucune tâche longue de plus de 150 ms', Math.max(0, ...longues) <= 150, longues)
verifier('… la progression dit chaque feuille', prog.length >= 30 && prog.includes('Export en PDF : feuille 30 sur 30…'), prog.slice(-3))
verifier('… taille raisonnable (< 0,3 Mo par feuille)', i.octets < 30 * 300e3, i.octets)
verifier('pdfinfo sans erreur', i.code === 0 && !i.err.trim(), i.err)
const { err } = rendre(r.fichier, 30, D + '/f')
verifier('pdftoppm sans erreur', !err.trim(), err)
// La table des renvois : chaque décalage pointe sur « n 0 obj »
const o = readFileSync(r.fichier)
const txt = o.toString('latin1')
const sx = Number(/startxref\n(\d+)/.exec(txt)[1])
const table = txt.slice(sx).split('\n')
const n = Number(table[1].split(' ')[1])
let mauvais = []
for (let k = 1; k < n; k++) { const off = Number(table[2 + k].slice(0, 10)); if (!txt.startsWith(`${k} 0 obj`, off)) mauvais.push(k) }
verifier('La table des renvois est exacte (chaque objet à son décalage)', txt.startsWith('xref', sx) && !mauvais.length, mauvais.slice(0, 5))
console.log(erreurs)
await nav.close()
