import { lancer, dort, info, erreurs, suivre } from './outils.mjs'
const nav = await lancer()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await ctx.newPage(); suivre(p, 'file')
await p.goto('file://' + new URL('./dist/index.html', import.meta.url).pathname)
await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await dort(1000)
info('apis', await p.evaluate(async () => {
  const r = { save: typeof window.showSaveFilePicker, open: typeof window.showOpenFilePicker, locks: !!navigator.locks, bc: typeof BroadcastChannel, worker: typeof Worker, url: location.href }
  try { const d = await navigator.storage.getDirectory(); const h = await d.getFileHandle('t.memc', { create: true }); r.opfs = 'ok ' + h.name
    try { const db = await new Promise((ok, ko) => { const q = indexedDB.open('essai-clone'); q.onupgradeneeded = () => q.result.createObjectStore('x'); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error) }); await new Promise((ok, ko) => { const t = db.transaction('x', 'readwrite'); t.objectStore('x').put(h, 'h'); t.oncomplete = ok; t.onerror = () => ko(t.error) }); r.clone = 'ok' } catch (e) { r.clone = e.name + ': ' + e.message }
  } catch (e) { r.opfs = e.name + ': ' + e.message }
  return r
}))
info('bouton', await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); return { nom: b.querySelector('.nom-classeur')?.textContent, etat: b.querySelector('.etat-classeur')?.textContent } }))
console.log(erreurs)
await nav.close()
