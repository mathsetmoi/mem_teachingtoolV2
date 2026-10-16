import { chromium } from '../../../commun/playwright.mjs'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
const V = process.argv[2]
mkdirSync(V + '/disque', { recursive: true })
writeFileSync(V + '/disque/x.memc', 'contenu du disque')
const dir = mkdtempSync(V + '/profil-')
const ctx = await chromium.launchPersistentContext(dir, {})
const p = await ctx.newPage()
await p.goto('file://' + V + '/sonde2.html')
const cdp = await ctx.newCDPSession(p)
const data = { items: [], files: [V + '/disque/x.memc'], dragOperationsMask: 1 }
for (const type of ['dragEnter', 'dragOver', 'drop']) await cdp.send('Input.dispatchDragEvent', { type, x: 100, y: 100, data })
await p.waitForFunction(() => window.res)
await p.evaluate(() => window.res)
console.log(await p.evaluate(async () => ({ read: await window.h.queryPermission({ mode: 'read' }), texte: await (await window.h.getFile()).text(), same: await window.h.isSameEntry(window.h) })))
await ctx.close()
