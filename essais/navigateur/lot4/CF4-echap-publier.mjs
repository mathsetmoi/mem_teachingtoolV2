// ESSAI DU CONTRÔLE FINAL DU LOT 4, n° 4 : après « Publier », Échap passait
// le tableau en Sélection (antérieur au lot 4). Le bouton « Publier »,
// désactivé pendant l'envoi, perdait le focus, qui tombait sur la page :
// App.clavier ne voyait plus que la touche venait d'une fenêtre ; Échap
// fermait la fenêtre (le navigateur) ET choisissait la Sélection, et le
// trait suivant sélectionnait au lieu d'écrire. Google simulé (GIS, l'API
// Drive, les relais, comme lot4/controle-final/sonde-publier.mjs).
// A. Publier, puis Échap : la fenêtre se ferme, l'outil reste le Stylo, le
//    trait suivant écrit ; le focus est revenu dans la fenêtre après l'envoi.
// B. Une fenêtre modale ouverte, le focus sur la page (forcé) : Échap la
//    ferme sans changer d'outil ; E, Suppr, les flèches, Ctrl + Z ne
//    changent rien à la page qu'elle couvre.
// C. Sans fenêtre : Échap passe toujours en Sélection, puis revient.
// Sans la correction, A et B échouent.
// Lancer : node CF4-echap-publier.mjs [adresse du serveur de développement]
import { chromium } from '../commun/playwright.mjs'
const DEV = process.argv[2] || 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
const p = await ctx.newPage()
const erreurs = []; p.on('pageerror', e => erreurs.push(e.message))
const PERSO = 'prof@example.com', LYCEE = 'prof@example.org'
let choisi = PERSO, indices = [], prompts = []
await ctx.exposeFunction('__choix', (hint, prompt) => { indices.push(hint ?? ''); prompts.push(prompt ?? ''); return choisi })
await ctx.route(/accounts\.google\.com\/gsi\/client/, r => r.fulfill({ contentType: 'text/javascript', body: `window.google = { accounts: { oauth2: {
  initTokenClient: o => ({ requestAccessToken: async q => { const qui = await window.__choix(o.login_hint, q && q.prompt); o.callback({ access_token: 'jeton:' + qui, expires_in: 3600 }) } }),
  hasGrantedAllScopes: () => true } } }` }))
const drive = new Map(); let n = 0
const lireMultipart = corps => { const parts = corps.split(/--mem_[a-z0-9]+/); const meta = JSON.parse(parts[1].split('\r\n\r\n')[1]); const contenu = parts[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''); return { meta, contenu } }
await ctx.route(/www\.googleapis\.com/, async r => {
  const u = new URL(r.request().url()), m = r.request().method()
  const qui = (r.request().headers().authorization ?? '').replace('Bearer jeton:', '')
  const json = o => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) })
  const fiche = id => { const f = drive.get(id); return { id, name: f.name, mimeType: f.mimeType, parents: f.parents, trashed: !!f.trashed, appProperties: f.appProperties, permissions: [{ id: 'p', type: 'user', role: 'owner' }] } }
  const miens = () => [...drive.keys()].filter(id => drive.get(id).owner === qui)
  if (u.pathname === '/drive/v3/about') return json({ user: { emailAddress: qui } })
  if (u.pathname === '/drive/v3/files' && m === 'GET') {
    const q = u.searchParams.get('q') || ''
    const seance = q.match(/key='memSeance' and value='([^']+)'/)
    if (seance) return json({ files: miens().filter(id => !drive.get(id).trashed && drive.get(id).appProperties?.memSeance === seance[1]).map(fiche) })
    return json({ files: miens().filter(id => drive.get(id).mimeType === 'application/vnd.google-apps.folder' && !drive.get(id).trashed).map(fiche) })
  }
  if (u.pathname === '/drive/v3/files' && m === 'POST') { const o = JSON.parse(r.request().postData()); const id = 'dossier' + (++n) + 'xxxxxxxxxx'; drive.set(id, { ...o, owner: qui }); return json({ id }) }
  if (u.pathname === '/upload/drive/v3/files' && m === 'POST') { const { meta, contenu } = lireMultipart(r.request().postData()); const id = 'fichier' + (++n) + 'xxxxxxxxxx'; drive.set(id, { ...meta, contenu, owner: qui }); return json({ id }) }
  const maj = u.pathname.match(/^\/upload\/drive\/v3\/files\/(.+)$/)
  if (maj && m === 'PATCH') { const { meta, contenu } = lireMultipart(r.request().postData()); Object.assign(drive.get(maj[1]), meta, { contenu }); return json({ id: maj[1] }) }
  const une = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/)
  if (une && m === 'GET') { const f = drive.get(decodeURIComponent(une[1])); return f && f.owner === qui ? json(fiche(decodeURIComponent(une[1]))) : r.fulfill({ status: 404, body: '{"error":{"message":"File not found"}}' }) }
  if (une && m === 'PATCH') { Object.assign(drive.get(une[1]), JSON.parse(r.request().postData())); return json({ id: une[1] }) }
  return r.fulfill({ status: 404, body: '{}' })
})
// Les relais : version 3 (dossiers par nom, .mem, début du fichier), ou 2 (l'ancien)
const DOSSIERS = ['MEM - Replay séances', 'LFB - Replay séances']
const RELAIS = { AKfycbyEm: { compte: PERSO, version: 3 }, AKfycbwtm8: { compte: LYCEE, version: 2 } }
await ctx.route(/script\.google\.com\/macros/, r => {
  const u = new URL(r.request().url()), id = u.searchParams.get('id'), f = drive.get(id)
  const rel = Object.entries(RELAIS).find(([k]) => u.pathname.includes(k))?.[1]
  const rep = o => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof o === 'string' ? o : JSON.stringify(o) })
  if (u.searchParams.get('ping')) return rep({ relais: rel.version === 3 ? 'MEM Replay' : 'ancien', version: rel.version, pret: true })
  const parents = (f?.parents ?? []).map(pid => drive.get(pid)).filter(Boolean)
  const servie = rel.version === 3
    ? f && !f.trashed && f.owner === rel.compte && f.name.endsWith('.mem') && parents.some(d => DOSSIERS.includes(d.name) && !d.trashed && d.owner === rel.compte) && f.contenu.startsWith('{"format":"mem-revoir"')
    : f && !f.trashed && f.owner === rel.compte && f.name.endsWith('.ancienne-seance')
  return rep(servie ? f.contenu : { erreur: 'Séance introuvable ou retirée. Demandez le lien à votre enseignant.' })
})


await p.goto(DEV); await p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/')); await p.waitForTimeout(800)
async function ecrire(x0, y0) { await p.mouse.move(x0, y0); await p.mouse.down(); for (let i = 1; i <= 14; i++) await p.mouse.move(x0 + i * 11, y0 + Math.sin(i / 2) * 22); await p.mouse.up(); await p.waitForTimeout(400) }
const nf = () => p.evaluate(() => window.__app.formes.length)
const outil = () => p.evaluate(() => window.__app.outil)
const ouvertes = () => p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.className))
const toast = () => p.evaluate(() => (document.querySelector('.toast.visible')?.textContent || ''))

console.log('\n=== A. Publier, puis Échap ===')
for (let i = 0; i < 3; i++) await ecrire(300, 200 + i * 60)
await p.click('button[title="Publier le replay pour les élèves"]'); await p.waitForSelector('.dialogue-publier[open]'); await p.check('input[name="p-lieu"][value="google"]', { timeout: 2000 }).catch(() => {})
await p.check('input[name=p-compte][value=mem]')
await p.click('.p-publier')
await p.waitForFunction(() => { const e = document.querySelector('.p-etat'); return /publiée|mise à jour|remise|erreur/.test(e.textContent) && !/Connexion|Envoi|Vérification|Préparation/.test(e.textContent) }, null, { timeout: 20000 })
const etatPublier = await p.textContent('.p-etat')
const focus = await p.evaluate(() => { const a = document.activeElement; return { dans: !!a?.closest('.dialogue-publier'), nom: a?.tagName + '.' + a?.className } })
ok(/publiée/.test(etatPublier) && focus.dans, `A1) la séance publiée (« ${etatPublier.trim().slice(0, 60)}… ») : le focus est revenu dans la fenêtre (${focus.nom})`, { etatPublier, focus })
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
const o1 = await outil(), t1 = await toast()
ok((await ouvertes()).length === 0 && o1 === 'stylo' && !/Sélection/.test(t1), `A2) Échap : la fenêtre se ferme, l'outil reste le Stylo (${o1}), aucun « Sélection : … »`, { o1, t1 })
const n0 = await nf()
await ecrire(520, 430)
ok(await nf() === n0 + 1, `A3) le trait suivant écrit (${n0} → ${await nf()} formes)`)

console.log('\n=== B. Une fenêtre modale, le focus tombé sur la page ===')
await p.click('button[title="Publier le replay pour les élèves"]'); await p.waitForSelector('.dialogue-publier[open]'); await p.check('input[name="p-lieu"][value="google"]', { timeout: 2000 }).catch(() => {})
await p.evaluate(() => { document.activeElement?.blur(); window.__app.selection.add(window.__app.formes[0].id) })
const ciblee = await p.evaluate(() => document.activeElement?.tagName)
const avant = await p.evaluate(() => ({ n: window.__app.formes.length, cam: { ...window.__app.cam } }))
for (const k of ['e', 'Delete', 'ArrowRight', 'Control+z', 'h']) { await p.keyboard.press(k); await p.waitForTimeout(150) }
const apres = await p.evaluate(() => ({ n: window.__app.formes.length, cam: { ...window.__app.cam }, outil: window.__app.outil }))
ok(ciblee === 'BODY' && apres.n === avant.n && apres.outil === 'stylo' && apres.cam.x === avant.cam.x && apres.cam.y === avant.cam.y && (await ouvertes()).length === 1,
  'B1) la fenêtre ouverte, le focus sur la page : E, Suppr, →, Ctrl + Z, H ne changent ni l\'outil, ni les formes, ni la vue', { ciblee, avant, apres })
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
ok((await ouvertes()).length === 0 && await outil() === 'stylo' && !/Sélection/.test(await toast()), 'B2) Échap : la fenêtre se ferme, l\'outil reste le Stylo', { outil: await outil(), toast: await toast() })
await p.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })

console.log('\n=== C. Sans fenêtre, Échap fait ce qu\'il faisait ===')
await p.mouse.click(700, 700); await p.waitForTimeout(400)
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
const c1 = await outil()
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
const c2 = await outil()
ok(c1 === 'selection' && c2 === 'stylo', `C1) Échap : la Sélection (${c1}), un second Échap : l'outil d'avant (${c2})`)
await b.close()
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
console.log(`\n${echecs ? `ÉCHECS : ${echecs}` : 'tout est vert'}`)
process.exit(echecs ? 1 : 0)
