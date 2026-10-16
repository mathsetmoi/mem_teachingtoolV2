import { O, lancer, outil, serveur, attendreServeur, dort, M } from './commun.mjs'
import { mkdtempSync } from 'node:fs'
const srv = serveur(); await attendreServeur()
const ctx = await lancer(mkdtempSync(M + 'profils/sq-'))
const p = await outil(ctx)
const cdp = await ctx.newCDPSession(p)
const avant = await cdp.send('Storage.getUsageAndQuota', { origin: O })
await cdp.send('Storage.overrideQuotaForOrigin', { origin: O, quotaSize: 100000 })
const apres = await cdp.send('Storage.getUsageAndQuota', { origin: O })
console.log('avant', avant.usage, avant.quota, 'après', apres.usage, apres.quota, apres.overrideActive)
console.log('estimate', await p.evaluate(() => navigator.storage.estimate()))
const r = await p.evaluate(async () => {
  const db = await new Promise((ok, ko) => { const r = indexedDB.open('sonde-quota', 1); r.onupgradeneeded = () => r.result.createObjectStore('x', { autoIncrement: true }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  for (let i = 0; i < 100; i++) {
    const t = db.transaction(['x'], 'readwrite'); t.objectStore('x').add(crypto.getRandomValues(new Uint8Array(20000)))
    const r = await new Promise(ok => { t.oncomplete = () => ok('ok'); t.onabort = () => ok(t.error?.name) })
    if (r !== 'ok') { db.close(); return { i, r } }
  }
  db.close(); return 'jamais'
})
console.log('sonde', r, await cdp.send('Storage.getUsageAndQuota', { origin: O }))
// Avec l'origine telle que le navigateur l'écrit (avec la barre ?)
await ctx.close(); srv.kill()
