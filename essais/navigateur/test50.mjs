// Les nouveaux noms : un dossier par compte, fichiers .mem, relais version 3,
// relais pas à jour signalé, dossier renommé à la main rétabli. Google simulé.
import { SORTIES } from './commun/racines.mjs'
import { chromium } from './commun/playwright.mjs'
// (le dossier où écrire le fichier séance ; par défaut essais/navigateur/sorties,
// où lot1/passeB-b12.mjs le relit)
const S = process.argv[2] || SORTIES
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
const p = await ctx.newPage()
const erreurs = []; p.on('pageerror', e => erreurs.push(e.message))
const ok = (c, m) => console.log(c ? '✓' : '✗', m)

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

await p.goto('http://localhost:5173/'); await p.waitForSelector('.rang'); await p.waitForTimeout(300)
await p.evaluate(async () => {
  try { localStorage.clear() } catch {}
  const a = window.__app, t = a.tableau, attendre = ms => new Promise(r => setTimeout(r, ms))
  const trait = (x, y) => { const pts = []; for (let i = 0; i < 25; i++) pts.push(i * 6, Math.sin(i / 3) * 30, 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false } }
  for (let i = 0; i < 4; i++) { t.poser(a.page, trait(100 + i * 40, 100 + i * 50)); await attendre(40) }
})
const ouvrir = async () => { await p.click('button[title="Publier le replay pour les élèves"]'); await p.waitForSelector('.dialogue-publier[open]'); await p.check('input[name="p-lieu"][value="google"]', { timeout: 2000 }).catch(() => {}) }
await ouvrir()
const etat = () => p.textContent('.p-etat')
const dossiers = () => [...drive.values()].filter(d => d.mimeType === 'application/vnd.google-apps.folder').map(d => `${d.owner}:${d.name}`)
const fichiers = () => [...drive.values()].filter(d => d.mimeType !== 'application/vnd.google-apps.folder' && !d.trashed).map(d => `${d.owner}:${d.name}`)
const publierEtAttendre = async () => { await p.click('.p-publier'); await p.waitForFunction(() => { const e = document.querySelector('.p-etat'); return /publiée|mise à jour|remise|erreur|pas à jour|ne trouve pas/.test(e.textContent) && !/Connexion|Envoi|Vérification|Préparation/.test(e.textContent) }, null, { timeout: 20000 }) }

console.log('comptes :', await p.$$eval('.p-comptes .case', l => l.map(x => x.textContent.trim() + (x.querySelector('input').checked ? ' [coché]' : ''))))
// 1) Drive personnel : dossier « MEM - Replay séances », fichier .mem
choisi = PERSO
await publierEtAttendre()
const lien = await p.inputValue('.p-lien')
ok(/publiée/.test(await etat()) && dossiers().includes(`${PERSO}:MEM - Replay séances`) && fichiers().some(f => f.endsWith('.mem')), `personnel : ${await etat()} | ${dossiers()} | ${fichiers()}`)
ok(/[?&]r=mem/.test(lien), 'lien : ' + lien)
// 2) Lycée avec un relais pas à jour : message clair, rien ne reste
await p.check('input[name=p-compte][value=lfb]')
choisi = LYCEE
await publierEtAttendre()
ok(/pas à jour \(version 2, il faut la 3\)/.test(await etat()) && !fichiers().some(f => f.startsWith(LYCEE)), `relais ancien : ${await etat()} | restés : ${fichiers().filter(f => f.startsWith(LYCEE))}`)
// 3) Relais du lycée mis à jour : dossier « LFB - Replay séances »
RELAIS.AKfycbwtm8.version = 3
await publierEtAttendre()
ok(/publiée/.test(await etat()) && dossiers().includes(`${LYCEE}:LFB - Replay séances`), `lycée à jour : ${await etat()} | ${dossiers()}`)
// 4) Dossier renommé à la main : rétabli, même lien
const dossierPerso = [...drive.values()].find(d => d.owner === PERSO && d.mimeType === 'application/vnd.google-apps.folder')
dossierPerso.name = 'Divers'
await p.check('input[name=p-compte][value=mem]')
choisi = PERSO
await p.fill('.p-titre', 'Séance corrigée')
await publierEtAttendre()
ok(/mise à jour/.test(await etat()) && dossierPerso.name === 'MEM - Replay séances' && (await p.inputValue('.p-lien')) === lien, `renommé à la main : ${await etat()} | dossier : ${dossierPerso.name}`)
// 5) Le fichier séance s'appelle .mem
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.p-fichier')])
ok(dl.suggestedFilename().endsWith('.mem'), 'fichier : ' + dl.suggestedFilename())
const chemin = S + '/seance-essai.mem'; await dl.saveAs(chemin)
// 6) L'élève : le lien, puis le fichier (sélecteur sans filtre)
const e = await ctx.newPage()
await e.goto(lien.replace(/^https?:\/\/[^/]+/, 'http://localhost:5173'))
await e.waitForSelector('.carte h1', { timeout: 10000 })
ok((await e.textContent('.carte h1')).includes('Séance corrigée'), 'élève par le lien : ' + await e.textContent('.carte h1'))
await e.goto('http://localhost:5173/revoir.html')
await e.waitForSelector('input[type=file]', { state: 'attached' })
ok((await e.getAttribute('input[type=file]', 'accept')) === null, 'sélecteur de fichier sans filtre')
await e.setInputFiles('input[type=file]', chemin)
await e.waitForSelector('.carte h1', { timeout: 10000 }); await e.waitForTimeout(300)
ok((await e.textContent('.carte h1')).includes('Séance corrigée'), 'élève par le fichier .mem : ' + await e.textContent('.carte h1'))
console.log('erreurs JS :', erreurs)
await b.close()
