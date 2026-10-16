// Sonde : en file://, Chromium expose-t-il showSaveFilePicker, l'OPFS, et garde-t-il une poignée dans IndexedDB ?
import { chromium } from '../../../commun/playwright.mjs'
import { mkdtempSync, writeFileSync } from 'node:fs'
const V = process.argv[2]
writeFileSync(V + '/sonde.html', '<!doctype html><meta charset="utf-8"><title>s</title><p>s</p>')
const dir = mkdtempSync(V + '/profil-')
const ctx = await chromium.launchPersistentContext(dir, {})
const p = await ctx.newPage()
await p.goto('file://' + V + '/sonde.html')
const r = await p.evaluate(async () => {
  const o = { secure: isSecureContext, origin: location.origin, save: typeof showSaveFilePicker, open: typeof showOpenFilePicker, locks: !!navigator.locks, worker: typeof Worker }
  try { const d = await navigator.storage.getDirectory(); const h = await d.getFileHandle('x.memc', { create: true }); o.opfs = 'ok ' + h.constructor.name
    const req = indexedDB.open('sonde', 1); req.onupgradeneeded = () => req.result.createObjectStore('p')
    const db = await new Promise((a, b) => { req.onsuccess = () => a(req.result); req.onerror = () => b(req.error) })
    const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(h, 'h')
    await new Promise((a, b) => { t.oncomplete = a; t.onabort = () => b(t.error); t.onerror = () => b(t.error) })
    o.idb = 'gardée'
  } catch (e) { o.opfs = (o.opfs || '') + ' ERR ' + e.name + ' ' + e.message }
  try { const b = new Blob(['onmessage=e=>postMessage(1)'], { type: 'text/javascript' }); const w = new Worker(URL.createObjectURL(b)); o.workerBlob = await new Promise(r => { w.onmessage = () => r('ok'); w.onerror = e => r('err ' + e.message); w.postMessage(0); setTimeout(() => r('silence'), 2000) }) } catch (e) { o.workerBlob = 'ERR ' + e.message }
  return o
})
console.log(JSON.stringify(r))
await p.reload()
const r2 = await p.evaluate(async () => {
  try { const req = indexedDB.open('sonde', 1); const db = await new Promise((a, b) => { req.onsuccess = () => a(req.result); req.onerror = () => b(req.error) })
    const t = db.transaction('p'); const g = t.objectStore('p').get('h'); const h = await new Promise(a => { g.onsuccess = () => a(g.result) })
    return { relue: h ? h.constructor.name + ' ' + h.name : 'rien', perm: h && h.queryPermission ? await h.queryPermission({ mode: 'readwrite' }) : 'sans' }
  } catch (e) { return 'ERR ' + e.name + ' ' + e.message }
})
console.log(JSON.stringify(r2))
await ctx.close()
