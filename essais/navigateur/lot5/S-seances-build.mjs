// ESSAI DES SÉANCES (lot 6) SUR LES VERSIONS CONSTRUITES, comme le
// professeur, sans window.__app : la version en ligne (dist-pages, servie en
// http par cet essai), puis la version hors ligne (dist/index.html en file://). Tout se
// lit à l'écran : le compteur, les bandeaux, les fenêtres, la trieuse.
// Un classeur neuf a sa séance ; on écrit deux pages ; « Nouvelle séance »
// (le menu ⋯) ouvre une page 1 blanche et le bandeau « Reprendre » ;
// « Reprendre la page » ; « Séance précédente », « Voir la page » : la
// lecture ; un trait y pose la question, « Juste regarder » ne change rien ;
// la trieuse range par séance ; recharger : « Séance … reprise ».
// Les deux versions construites doivent être à jour (npm run build, npm run
// build:pages). Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de
// sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const R = `${RACINE_DEPOT}`
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
const PAGES = R + '/dist-pages'
const serveur = createServer((q, r) => {
  const chemin = normalize(join(PAGES, decodeURIComponent(new URL(q.url, 'http://x').pathname)))
  if (!chemin.startsWith(PAGES) || !existsSync(chemin) || chemin.endsWith('/')) { r.writeHead(404); r.end(); return }
  r.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' }); r.end(readFileSync(chemin))
})
await new Promise(f => serveur.listen(0, '127.0.0.1', f))
const nav = await chromium.launch()

async function essai(nom, url) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await c.newPage()
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g|ERR_FILE/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  const lire = () => p.evaluate(() => ({
    rang: [document.querySelector('.rang-seance .texte')?.textContent, document.querySelector('.rang')?.textContent].filter(Boolean).join(' · '), dlg: document.querySelector('dialog[open]')?.className ?? null,
    toast: document.querySelector('.toast.visible')?.textContent ?? '', lecture: !document.querySelector('.bandeau-lecture')?.hidden,
    reprise: !document.querySelector('.bandeau-reprise')?.hidden, texteReprise: document.querySelector('.bandeau-reprise .texte')?.textContent ?? '',
  }))
  const trait = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400) }
  await p.goto(url)
  await p.waitForSelector('.rang')
  await p.waitForTimeout(1200)
  // Le premier classeur d'un navigateur neuf : l'annonce de la bibliothèque peut venir ; rien d'autre
  let e = await lire()
  ok(!e.dlg && /^Séance du .+ · 1 \/ 1$/.test(e.rang), `${nom} : un classeur neuf, sa séance au compteur, pas de fenêtre`, e)
  await trait(500, 300)
  await p.click('button.nouvelle-page'); await p.waitForTimeout(300)
  await trait(520, 330)
  await p.click('button.points'); await p.waitForTimeout(200)
  await p.click('[data-action="nouvelle-seance"]'); await p.waitForTimeout(400)
  e = await lire()
  ok(/· 1 \/ 1$/.test(e.rang) && e.reprise && /s'est arrêté page 2\.$/.test(e.texteReprise), `${nom} : « Nouvelle séance » : page 1 / 1, le bandeau « Reprendre »`, e)
  await p.click('.bandeau-reprise .principal'); await p.waitForTimeout(400)
  e = await lire()
  ok(/· 1 \/ 1$/.test(e.rang) && /Page reprise/.test(e.toast) && !e.reprise, `${nom} : « Reprendre la page » : la page 2 d'avant devient la page 1`, e)
  await p.click('button.seance-precedente'); await p.waitForTimeout(400)
  const n = await p.evaluate(() => document.querySelectorAll('.tiroir-vignette').length)
  ok(n === 2, `${nom} : « Séance précédente » : ses deux pages en vignettes`, n)
  await p.click('.tiroir-actions .secondaire'); await p.waitForTimeout(400)
  e = await lire()
  ok(e.lecture && /· page 2/.test(e.rang), `${nom} : « Voir la page » : en lecture`, e)
  await trait(600, 450)
  e = await lire()
  ok(!!e.dlg?.includes('dialogue-reprise'), `${nom} : un trait sur la séance passée : la question`, e)
  await p.click('dialog[open] .secondaire'); await p.waitForTimeout(300)
  e = await lire()
  ok(!e.dlg && e.lecture, `${nom} : « Juste regarder »`, e)
  await p.click('.bandeau-lecture .retour-aujourdhui'); await p.waitForTimeout(300)
  e = await lire()
  ok(!e.lecture && /· 1 \/ 1$/.test(e.rang), `${nom} : « Retour à aujourd'hui »`, e)
  await p.keyboard.press('Shift+P'); await p.waitForTimeout(500)
  const tr = await p.evaluate(() => ({ cartes: document.querySelectorAll('.trieuse-grille .carte').length, passees: document.querySelectorAll('.trieuse-une-seance').length, reprise: document.querySelectorAll('.carte.reprise').length }))
  ok(tr.cartes === 1 && tr.passees === 1 && tr.reprise === 1, `${nom} : la trieuse : la séance du jour, la séance passée dessous`, tr)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  await p.reload(); await p.waitForSelector('.rang'); await p.waitForTimeout(1500)
  e = await lire()
  ok(!e.dlg && /Séance de .+ reprise/.test(e.toast) && /· 1 \/ 1$/.test(e.rang), `${nom} : recharger : « Séance de … reprise »`, e)
  await c.close()
}

await essai('en ligne', `http://127.0.0.1:${serveur.address().port}/index.html`)
await essai('hors ligne', 'file://' + R + '/dist/index.html')
ok(!erreurs.length, 'aucune erreur JS', erreurs)
await nav.close()
serveur.close()
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'tout est vert')
process.exit(echecs ? 1 : 0)
