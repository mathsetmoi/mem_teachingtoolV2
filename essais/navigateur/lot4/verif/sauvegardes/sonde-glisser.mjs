// Sonde : une VRAIE poignée de fichier en file:// (glisser un fichier du disque par CDP), gardée dans IndexedDB, relue après rechargement
import { chromium } from '../../../commun/playwright.mjs'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
const V = process.argv[2]
// (le fichier du disque à glisser : vide, fait ici s'il manque ; ignoré par git)
mkdirSync(V + '/disque', { recursive: true }); if (!existsSync(V + '/disque/cle.memc')) writeFileSync(V + '/disque/cle.memc', '')
writeFileSync(V + '/sonde2.html', `<!doctype html><meta charset="utf-8"><title>s</title><div id=z style="position:fixed;inset:0">z</div><script>
const req = r => new Promise((a, b) => { r.onsuccess = () => a(r.result); r.onerror = () => b(r.error) })
async function base() { const q = indexedDB.open('sonde2', 1); q.onupgradeneeded = () => q.result.createObjectStore('p'); return req(q) }
window.res = null
z.addEventListener('dragover', e => e.preventDefault())
z.addEventListener('drop', e => { e.preventDefault(); const it = e.dataTransfer.items[0]; const pr = it.getAsFileSystemHandle ? it.getAsFileSystemHandle() : null
  window.res = (async () => { const h = await pr; const o = { type: h && h.constructor.name, nom: h && h.name }
    try { o.q = await h.queryPermission({ mode: 'readwrite' }) } catch (x) { o.q = 'ERR ' + x.name }
    try { const db = await base(); const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(h, 'h'); await new Promise((a, b) => { t.oncomplete = a; t.onabort = () => b(t.error) }); o.idb = 'gardée' } catch (x) { o.idb = 'ERR ' + x.name + ' ' + x.message }
    window.h = h; return o })() })
window.relire = async () => { const db = await base(); const h = await req(db.transaction('p').objectStore('p').get('h')); window.h = h; return h ? { nom: h.name, q: await h.queryPermission({ mode: 'readwrite' }) } : null }
window.ecrire = async t => { const w = await window.h.createWritable(); await w.write(new Blob([t])); await w.close(); return (await window.h.getFile()).size }
</script>`)
const dir = mkdtempSync(V + '/profil-')
const ctx = await chromium.launchPersistentContext(dir, {})
const p = await ctx.newPage()
await p.goto('file://' + V + '/sonde2.html')
const cdp = await ctx.newCDPSession(p)
const data = { items: [], files: [V + '/disque/cle.memc'], dragOperationsMask: 1 }
for (const type of ['dragEnter', 'dragOver', 'drop']) await cdp.send('Input.dispatchDragEvent', { type, x: 100, y: 100, data })
await p.waitForFunction(() => window.res)
console.log('glissé :', JSON.stringify(await p.evaluate(() => window.res)))
console.log('requestPermission sans geste :', await p.evaluate(async () => { try { return await window.h.requestPermission({ mode: 'readwrite' }) } catch (e) { return 'ERR ' + e.name } }))
await p.click('#z')
console.log('requestPermission dans un clic :', await p.evaluate(async () => { try { return await window.h.requestPermission({ mode: 'readwrite' }) } catch (e) { return 'ERR ' + e.name } }))
console.log('écrire :', await p.evaluate(() => window.ecrire('bonjour').catch(e => 'ERR ' + e.name + ' ' + e.message)), JSON.stringify(readFileSync(V + '/disque/cle.memc', 'utf8')))
await p.reload()
console.log('après rechargement :', JSON.stringify(await p.evaluate(() => window.relire().catch(e => 'ERR ' + e.name + ' ' + e.message))))
await ctx.close()
