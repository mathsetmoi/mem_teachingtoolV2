// Lot 4, corrections « migration » : les deux défauts du rapport de
// vérification, chacun refait tel qu'il a été trouvé (m8, m14).
//   A. Une copie ajoutée depuis un fichier (« Ajouter quand même comme
//      copie », « Ajouter comme copie » quand chacun a changé de son côté,
//      plusieurs fichiers, un classeur de même origine dans la corbeille, une
//      bibliothèque .memb) ne garde pas le registre des publications de son
//      original, comme « Dupliquer » : publier depuis la copie fait un nouveau
//      lien, et le fichier Drive de l'original ne change pas. Un fichier
//      « nouveau » (le même classeur sur un autre ordinateur), lui, le garde.
//      Dans une bibliothèque, une séance publiée n'est jamais dans le
//      registre de deux classeurs.
//   B. Une base trouée relue (une entrée du milieu retirée, comme une
//      écriture refusée, puis le classeur rouvert) : l'état ne dit plus
//      « Enregistré dans ce navigateur » mais qu'une partie ne se relit plus
//      (sans bandeau, sans « réparation » trompeuse) ; Ctrl + S écrit un
//      fichier qui se rouvre, et le dit (depuis la base ou depuis la
//      mémoire) ; la clé s'écrit encore, de ce qui se relit ; la base n'est
//      jamais vidée ; un fichier qui a la partie manquante la complète
//      (« Mettre à jour le classeur »).
// Google est simulé comme dans test50.mjs ; les choix de fichiers rendent
// des poignées de l'OPFS (navigator.storage.getDirectory()).
//   C. Le chemin voisin de A3 : « Remplacer « B »… » par le fichier d'un
//      classeur qui est dans la corbeille donne à B un id neuf : c'est une
//      copie, comme A3 (registre vidé, marque), et B publie sous un
//      nouveau lien.
// Lancer : node lot4/corrections-migration.mjs [A B C] (BASE=http://… pour une
// autre version, par exemple celle d'avant les corrections)
import { chromium } from '../commun/playwright.mjs'
import * as Y from 'yjs'
import { gunzipSync, gzipSync } from 'node:zlib'

const BASE = process.env.BASE || 'http://localhost:5173/'
const parties = process.argv.slice(2)
const seul = x => !parties.length || parties.includes(x)
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const sp = t => (t || '').replace(/[  ]/g, ' ')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => window.__surveillance && window.__fichiers && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })

const PUBLIEES_COPIE = 'Ses séances déjà publiées le restent depuis l\'original : en publier une depuis la copie fait un nouveau lien.'
const PUBLIEES_COPIES = 'Une copie ne garde pas les séances publiées de son original : en publier une depuis la copie fait un nouveau lien.'

/** Les poignées de l'OPFS, les permissions accordées, les messages notés */
const INIT = () => {
  window.__aOuvrir = null
  window.__nomChoisi = null
  const H = window.FileSystemHandle?.prototype
  if (H) {
    H.queryPermission = async function () { return 'granted' }
    H.requestPermission = async function () { return 'granted' }
  }
  window.showSaveFilePicker = async o => {
    const dir = await navigator.storage.getDirectory()
    const nom = window.__nomChoisi || o?.suggestedName || 'sans-nom'
    window.__nomChoisi = null
    return dir.getFileHandle(nom, { create: true })
  }
  window.showOpenFilePicker = async () => {
    const dir = await navigator.storage.getDirectory()
    const noms = [].concat(window.__aOuvrir ?? [])
    window.__aOuvrir = null
    if (!noms.length) throw new DOMException('rien', 'AbortError')
    return Promise.all(noms.map(n => dir.getFileHandle(n)))
  }
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const attendreToast = (p, re, timeout = 20000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)
const toasts = p => p.evaluate(() => window.__toasts.slice())

/** Le faux Google de test50.mjs (GIS, l'API Drive, le relais) */
async function simulerGoogle(ctx, drive = new Map()) {
  const PERSO = 'prof@example.com'
  await ctx.route(/accounts\.google\.com\/gsi\/client/, r => r.fulfill({ contentType: 'text/javascript', body: `window.google = { accounts: { oauth2: {
    initTokenClient: o => ({ requestAccessToken: async q => { o.callback({ access_token: 'jeton:${PERSO}', expires_in: 3600 }) } }),
    hasGrantedAllScopes: () => true, revoke: () => {} } } }` }))
  let n = 0
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
  await ctx.route(/script\.google\.com\/macros/, r => {
    const u = new URL(r.request().url())
    const rep = o => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof o === 'string' ? o : JSON.stringify(o) })
    if (u.searchParams.get('ping')) return rep({ relais: 'MEM Replay', version: 3, pret: true })
    const f = drive.get(u.searchParams.get('id'))
    return rep(f ? f.contenu : { erreur: 'Séance introuvable' })
  })
  return drive
}

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte() {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  await ctx.addInitScript(INIT)
  const drive = await simulerGoogle(ctx)
  // Une page vide de la même origine : lire et abîmer les bases sans ouvrir de classeur
  await ctx.route(u => u.pathname === '/__outil-essai.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>Outil</title>' }))
  return { ctx, drive }
}
async function ouvrir(ctx, chemin = '', nom = 'p') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(BASE + chemin); await pret(p); await dort(600)
  return p
}
async function trait(p, x, y) { await p.mouse.move(x, y); await p.mouse.down(); for (let k = 1; k < 12; k++) await p.mouse.move(x + k * 15, y + Math.sin(k) * 10); await p.mouse.up(); await dort(250) }
async function publier(p) {
  await p.click('button[title="Publier le replay pour les élèves"]')
  await p.waitForSelector('.dialogue-publier[open]')
  const texte = sp(await p.textContent('.dialogue-publier[open]')).replace(/\s+/g, ' ')
  await p.click('.p-publier')
  await p.waitForFunction(() => { const e = document.querySelector('.p-etat'); return /publiée|mise à jour|erreur|pas à jour|ne trouve pas/.test(e.textContent) && !/Connexion|Envoi|Vérification|Préparation/.test(e.textContent) }, null, { timeout: 20000 })
  const etat = sp(await p.textContent('.p-etat')).trim()
  const lien = await p.inputValue('.p-lien')
  await p.keyboard.press('Escape'); await dort(300)
  return { deja: /Déjà publiée le/.test(texte), etat, id: new URL(lien).searchParams.get('id') }
}
/** Les mises à jour d'une base (lues sans la créer), en base64 */
const misesDe = (p, base) => p.evaluate(async base => {
  const bases = await import('/src/classeurs/bases.ts')
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s) }
  try { return (await bases.lireMisesAJour(base)).mises.map(b64) } catch { return null }
}, base)
const docDe = l => { const d = new Y.Doc({ gc: false }); for (const e of l) Y.applyUpdate(d, typeof e === 'string' ? Buffer.from(e, 'base64') : e); return d }
/** Les clés du registre des publications d'un classeur, lues dans sa base */
const registreDe = async (p, base) => { const l = await misesDe(p, base); return l ? [...docDe(l).getMap('publications').keys()] : null }
/** Les fichiers Drive (leurs ids) que le registre d'un classeur republierait */
const liensDe = async (p, base) => { const l = await misesDe(p, base); return l ? [...docDe(l).getMap('publications').values()].map(v => v.id) : [] }
const fiches = p => p.evaluate(async () => (await window.__registre.classeurs()).map(f => ({ id: f.id, base: f.base, nom: f.nom, corbeille: !!f.corbeille, vecteur: f.vecteur ? [...f.vecteur] : null })))
/** L'OPFS : lire, écrire */
const opfsLire = async (p, nom) => {
  const b64 = await p.evaluate(async nom => {
    try {
      const f = await (await (await navigator.storage.getDirectory()).getFileHandle(nom)).getFile()
      const o = new Uint8Array(await f.arrayBuffer())
      let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
      return btoa(s)
    } catch { return null }
  }, nom)
  return b64 === null ? null : Buffer.from(b64, 'base64')
}
const opfsEcrire = (p, nom, octets) => p.evaluate(async ({ nom, b64 }) => {
  const h = await (await navigator.storage.getDirectory()).getFileHandle(nom, { create: true })
  const w = await h.createWritable()
  await w.write(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))
  await w.close()
}, { nom, b64: Buffer.from(octets).toString('base64') })
/** Un .memc lu sous Node : l'en-tête, le document, est-il entier */
function lireMemc(o) {
  const fin = o.indexOf(0x0a)
  const entete = JSON.parse(o.subarray(0, fin).toString('utf8'))
  const d = new Y.Doc({ gc: false })
  Y.applyUpdate(d, new Uint8Array(gunzipSync(o.subarray(fin + 1))))
  let formes = 0
  for (const id of d.getArray('ordre').toArray()) formes += d.getMap('pages').get(id)?.get('formes')?.size ?? 0
  return { entete, doc: d, formes, entier: !d.store.pendingStructs && !d.store.pendingDs }
}
const faireMemc = (etat, entete) => Buffer.concat([Buffer.from(JSON.stringify({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', ...entete }) + '\n'), gzipSync(Buffer.from(etat))])
/** Ouvre des fichiers de l'OPFS par Ctrl + O ; rend la fenêtre qui s'ouvre */
async function ctrlO(p, noms) {
  await p.evaluate(n => { window.__aOuvrir = n }, noms)
  await p.keyboard.press('Control+o')
  await p.waitForSelector('.dialogue-fichiers[open]', { timeout: 20000 }); await dort(250)
  return p.evaluate(() => { const d = document.querySelector('.dialogue-fichiers[open]'); return { titre: d.querySelector('h2').textContent, textes: [...d.querySelectorAll('p')].map(x => x.textContent.replace(/[  ]/g, ' ')), boutons: [...d.querySelectorAll('.actions button')].map(b => b.dataset.a) } })
}
/** Un clic dans la fenêtre des fichiers qui recharge la page (sur un autre classeur, ou le même) */
async function cliquerEtRecharger(p, a) {
  const avant = await p.evaluate(() => performance.timeOrigin)
  await p.click(`.dialogue-fichiers[open] [data-a="${a}"]`)
  await p.waitForFunction(t => performance.timeOrigin !== t, avant, { timeout: 30000 }).catch(() => {})
  await pret(p); await dort(800)
}
const ctrlS = async (p, nom) => { await p.evaluate(n => { window.__nomChoisi = n }, nom); await p.keyboard.press('Control+s') }

// =====================================================================
// A. LES COPIES ET LE REGISTRE DES PUBLICATIONS
// =====================================================================
if (seul('A')) {
  console.log('\n=== A. Une copie ajoutée depuis un fichier ne garde pas le registre des publications ===')
  const { ctx, drive } = await contexte()
  const p = await ouvrir(ctx, '', 'A')
  try {
    const original = await p.evaluate(() => ({ id: window.__app.classeur.id, base: window.__app.classeur.base, nom: window.__app.classeur.nom }))
    for (let i = 0; i < 4; i++) await trait(p, 250, 200 + i * 60)
    const pub1 = await publier(p)
    ok(/publiée/.test(pub1.etat) && !!pub1.id, `l'original publie sa séance (Google simulé) : lien ${pub1.id}`, pub1)
    const contenuAvant = drive.get(pub1.id)?.contenu
    const regOriginal = await registreDe(p, original.base)
    ok(regOriginal?.length === 1, 'le registre de l\'original a la séance', regOriginal)
    await ctrlS(p, 'original.memc')
    ok(await attendreToast(p, /Classeur enregistré : original\.memc/), 'Ctrl + S : original.memc')
    // Un trait de plus dans l'original : le fichier est « contenu » dans la bibliothèque
    await trait(p, 600, 520)
    await p.evaluate(() => window.__app.tableau.attendreEcritures())

    // A1. « Ajouter quand même comme copie »
    const f1 = await ctrlO(p, 'original.memc')
    ok(f1.boutons.includes('copie') && f1.boutons.includes('ouvrir-biblio'), 'A1) Ctrl + O sur le fichier de l\'original : « Ajouter quand même comme copie », « Ouvrir celui de la bibliothèque »', f1)
    await cliquerEtRecharger(p, 'copie')
    const copie = await p.evaluate(() => ({ id: window.__app.classeur.id, base: window.__app.classeur.base, nom: window.__app.classeur.nom, registre: [...window.__app.tableau.doc.getMap('publications').keys()] }))
    ok(copie.id !== original.id && copie.registre.length === 0, `   … la copie (« ${copie.nom} ») n'a pas le registre des publications (comme Dupliquer)`, copie)
    ok((await toasts(p)).some(t => t.includes(PUBLIEES_COPIE)), '   … et l\'arrivée le dit : « Ses séances déjà publiées le restent depuis l\'original… »', await toasts(p))
    ok((await registreDe(p, original.base))?.length === 1, '   … l\'original garde le sien')
    // La copie publie : un nouveau lien, le fichier Drive de l'original n'a pas changé
    await trait(p, 600, 450)
    const pub2 = await publier(p)
    ok(!pub2.deja && pub2.id && pub2.id !== pub1.id, `   … publier depuis la copie fait un nouveau lien (${pub2.id}), sans « Déjà publiée »`, { pub1: pub1.id, pub2 })
    ok(drive.get(pub1.id)?.contenu === contenuAvant, '   … et le fichier Drive de l\'original (le lien de l\'autre classe) n\'a pas changé')
    // Republier depuis la copie : son lien à elle, mis à jour
    await trait(p, 650, 400)
    const pub3 = await publier(p)
    ok(pub3.deja && pub3.id === pub2.id && /mise à jour/.test(pub3.etat) && drive.get(pub1.id)?.contenu === contenuAvant, '   … republier depuis la copie met à jour SON lien (« Déjà publiée »), toujours pas celui de l\'original', { pub2: pub2.id, pub3 })

    // A1 bis. « Dupliquer le classeur » : de même (la copie publie sous sa propre clé)
    await p.evaluate(() => window.__surveillance.laisserPartir())
    await p.goto(BASE + '?classeur=' + original.id); await pret(p); await dort(600)
    await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await dort(500)
    const dup = await p.evaluate(i => window.__bibliotheque.dupliquer(i).then(f => f && { id: f.id, base: f.base }), original.id)
    ok(!!dup && (await registreDe(p, dup.base))?.length === 0, 'A1 bis) Dupliquer : la copie n\'a pas le registre des publications')
    await p.evaluate(() => window.__surveillance.laisserPartir())
    await p.goto(BASE + '?classeur=' + dup.id); await pret(p); await dort(600)
    await trait(p, 600, 380)
    const pub4 = await publier(p)
    ok(!pub4.deja && pub4.id && ![pub1.id, pub2.id].includes(pub4.id) && drive.get(pub1.id)?.contenu === contenuAvant, `   … publier depuis elle fait un nouveau lien (${pub4.id}) ; le fichier Drive de l'original n'a pas changé`, { pub1: pub1.id, pub4 })
    // L'original republie : toujours son lien
    await p.evaluate(() => window.__surveillance.laisserPartir())
    await p.goto(BASE + '?classeur=' + original.id); await pret(p); await dort(600)
    const pub5 = await publier(p)
    ok(pub5.deja && pub5.id === pub1.id, '   … et l\'original, republiant, met à jour son lien à lui', { pub1: pub1.id, pub5 })

    // A2. Plusieurs fichiers : l'un a divergé de l'original (« comme copie »), l'autre est nouveau
    const o = await opfsLire(p, 'original.memc')
    const lu = lireMemc(o)
    const autreClient = new Y.Doc({ gc: false })
    Y.applyUpdate(autreClient, Y.encodeStateAsUpdate(lu.doc))
    const page0 = autreClient.getArray('ordre').get(0)
    autreClient.getMap('pages').get(page0).get('formes').set('Xdiverge', { id: 'Xdiverge', type: 'trait', x: 100, y: 100, z: 99, auteur: 'ailleurs', pts: [0, 0, 0.5, 40, 10, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
    await opfsEcrire(p, 'diverge.memc', faireMemc(Y.encodeStateAsUpdate(autreClient), { date: Date.now(), pages: 1, nom: original.nom, id: original.id }))
    const neuf = new Y.Doc({ gc: false })
    { const pg = new Y.Map(); pg.set('fond', 'blanc'); pg.set('formes', new Y.Map()); neuf.getMap('pages').set('pNeuf', pg); neuf.getArray('ordre').push(['pNeuf']) }
    await opfsEcrire(p, 'autre.memc', faireMemc(Y.encodeStateAsUpdate(neuf), { date: Date.now(), pages: 1 }))
    const avantLot = new Set((await fiches(p)).map(f => f.id))
    const f2 = await ctrlO(p, ['diverge.memc', 'autre.memc'])
    ok(/qui a changé des deux côtés \(ajouté comme copie\)/.test(f2.textes.join(' ')) && f2.boutons.includes('ajouter'), 'A2) plusieurs fichiers : le fichier qui a divergé de l\'original s\'ajoute comme copie', f2)
    await p.click('.dialogue-fichiers[open] [data-a="ajouter"]')
    ok(await attendreToast(p, /ajouté comme copie/), '   … le bilan')
    const bilan = (await toasts(p)).find(t => /ajouté comme copie/.test(t)) ?? ''
    ok(bilan.includes(PUBLIEES_COPIES), '   … qui dit qu\'une copie ne garde pas les séances publiées de son original', bilan)
    const ajoutes = (await fiches(p)).filter(f => !avantLot.has(f.id))
    const copieLot = ajoutes.find(f => f.nom.startsWith(original.nom))
    ok(ajoutes.length === 2 && !!copieLot, '   … deux classeurs ajoutés, dont la copie', ajoutes.map(f => f.nom))
    if (copieLot) {
      ok((await registreDe(p, copieLot.base))?.length === 0, '   … la copie du lot n\'a pas le registre des publications')
      // La fiche de la copie a le vecteur de sa base (avec le vidage du registre)
      const v = [...Y.encodeStateVector(docDe(await misesDe(p, copieLot.base)))]
      ok(JSON.stringify(copieLot.vecteur) === JSON.stringify(v), '   … et sa fiche, le vecteur de sa base (le vidage compris)', { fiche: copieLot.vecteur, base: v })
    }

    // A3. L'original dans la corbeille : le fichier s'ajoute sous un id neuf, sans le registre
    await p.evaluate(id => window.__registre.modifierClasseur(id, x => { x.corbeille = { t: Date.now() } }), original.id)
    const f3 = await ctrlO(p, 'original.memc')
    ok(f3.textes.some(t => /corbeille/.test(t)) && f3.boutons.includes('ajouter'), 'A3) l\'original dans la corbeille : « Ajouter à la bibliothèque » (un classeur de même origine est dans la corbeille)', f3)
    await cliquerEtRecharger(p, 'ajouter')
    const neufCorbeille = await p.evaluate(() => ({ id: window.__app.classeur.id, registre: [...window.__app.tableau.doc.getMap('publications').keys()] }))
    ok(neufCorbeille.id !== original.id && neufCorbeille.registre.length === 0, '   … un id neuf, sans le registre des publications (l\'original peut être remis)', neufCorbeille)
    ok((await toasts(p)).some(t => t.includes(PUBLIEES_COPIE)), '   … et l\'arrivée le dit')
    await p.evaluate(id => window.__registre.modifierClasseur(id, x => { delete x.corbeille }), original.id)
    ok((await registreDe(p, original.base))?.length === 1, '   … l\'original remis garde le sien')

    // A4. Dans toute la bibliothèque, un fichier Drive publié n'est dans le registre que d'un classeur
    const tous = await fiches(p)
    const vus = new Map()
    for (const f of tous) for (const k of await liensDe(p, f.base)) vus.set(k, [...(vus.get(k) ?? []), f.nom])
    ok([...vus.values()].every(l => l.length === 1), `A4) dans la bibliothèque (${tous.length} classeurs), chaque lien publié n'est dans le registre que d'un seul classeur`, Object.fromEntries(vus))

    // A5. Toute la bibliothèque dans un .memb, ouverte sur un autre ordinateur
    await p.evaluate(() => { window.__nomChoisi = 'tout.memb' })
    ok(await p.evaluate(() => window.__fichiers.enregistrerLaBibliotheque()), 'A5) toute la bibliothèque dans tout.memb')
    const memb = await opfsLire(p, 'tout.memb')

    // Un autre ordinateur : le fichier de l'original y est « nouveau », il garde son registre
    const B = await contexte()
    const q = await ouvrir(B.ctx, '', 'A-autre')
    await opfsEcrire(q, 'original.memc', o)
    await opfsEcrire(q, 'tout.memb', memb)
    const g1 = await ctrlO(q, 'original.memc')
    ok(g1.boutons.includes('ajouter') && !g1.boutons.includes('copie'), '   … sur un autre ordinateur, le fichier de l\'original est nouveau : « Ajouter à la bibliothèque »', g1)
    await cliquerEtRecharger(q, 'ajouter')
    const ailleurs = await q.evaluate(() => ({ id: window.__app.classeur.id, base: window.__app.classeur.base, registre: [...window.__app.tableau.doc.getMap('publications').keys()] }))
    ok(ailleurs.id === original.id && JSON.stringify(ailleurs.registre) === JSON.stringify(regOriginal), '   … le même classeur (son id) garde son registre : republier met à jour le lien déjà donné, comme avant', { ailleurs, regOriginal })
    // Il change ici : celui de la bibliothèque .memb a changé de son côté (le trait de plus)
    await trait(q, 300, 600)
    await q.evaluate(() => window.__app.tableau.attendreEcritures())
    const g2 = await ctrlO(q, 'tout.memb')
    ok(g2.titre === 'Ouvrir cette bibliothèque ?' && g2.boutons.includes('ajouter'), '   … puis tout.memb : « Ouvrir cette bibliothèque ? »', g2)
    await q.click('.dialogue-fichiers[open] [data-a="ajouter"]')
    ok(await attendreToast(q, /Bibliothèque ouverte/), '   … ouverte')
    const fin = (await toasts(q)).find(t => /Bibliothèque ouverte/.test(t)) ?? ''
    ok(/comme copie/.test(fin) && fin.includes(PUBLIEES_COPIES), '   … l\'original, qui a divergé, s\'y ajoute comme copie, et le bilan dit qu\'elle ne garde pas ses séances publiées', fin)
    const tousB = await fiches(q)
    const vusB = new Map()
    for (const f of tousB) for (const k of await liensDe(q, f.base)) vusB.set(k, [...(vusB.get(k) ?? []), f.nom])
    ok([...vusB.values()].every(l => l.length === 1) && vusB.get(pub1.id)?.length === 1, `   … là aussi (${tousB.length} classeurs), chaque lien publié n'est dans le registre que d'un seul classeur (celui de l'original : l'original)`, Object.fromEntries(vusB))
    await q.evaluate(() => window.__surveillance?.laisserPartir?.())
    await B.ctx.close()
  } finally {
    await p.evaluate(() => window.__surveillance?.laisserPartir?.()).catch(() => {})
    await ctx.close()
  }
}

// =====================================================================
// B. UNE BASE TROUÉE RELUE
// =====================================================================
if (seul('B')) {
  console.log('\n=== B. Une base trouée relue : un état honnête, des fichiers qui se rouvrent ===')
  const { ctx } = await contexte()
  let p = await ouvrir(ctx, '', 'B')
  try {
    // Un classeur, cinq traits
    const id = await p.evaluate(async () => {
      const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
      const etat = await neuf.etatNeuf('carreaux'), T = Date.now(), id = dem.idClasseur()
      await window.__registre.creerClasseur({ id, base: dem.baseDe(id), nom: 'Troué', dossier: null, etiquettes: [], cree: T, modifie: T, ouvert: 0, pages: 1 }, b => bases.creerBase(b, etat, { id, nom: 'Troué' }))
      return id
    })
    const base = 'mem-teachingtool-classeur-' + id
    await p.evaluate(() => window.__surveillance?.laisserPartir?.())
    await p.goto(BASE + '?classeur=' + id); await pret(p); await dort(800)
    for (let i = 0; i < 5; i++) await trait(p, 250, 150 + i * 70)
    await p.evaluate(() => window.__app.tableau.attendreEcritures())
    await p.evaluate(() => window.__surveillance?.laisserPartir?.())
    await p.close()
    // Une entrée du milieu dont le retrait (comme une écriture refusée) cache
    // au moins deux formes et en laisse le plus à l'écran
    const outil = await ctx.newPage()
    await outil.goto(BASE + '__outil-essai.html')
    const lire = () => outil.evaluate(async nom => {
      const r = indexedDB.open(nom)
      const db = await new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
      const t = db.transaction(['updates']), s = t.objectStore('updates')
      const req = q => new Promise(ok => { q.onsuccess = () => ok(q.result) })
      const [cles, vals] = await Promise.all([req(s.getAllKeys()), req(s.getAll())])
      db.close()
      const b64 = u => { let x = ''; for (let i = 0; i < u.length; i += 0x8000) x += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(x) }
      return { cles, entrees: vals.map(b64) }
    }, base)
    const b0 = await lire()
    const tout = docDe(b0.entrees)
    let formesTout = 0; for (const pid of tout.getArray('ordre').toArray()) formesTout += tout.getMap('pages').get(pid).get('formes').size
    let meilleure = -1, cachees = 0, gardees = -1
    for (let k = 1; k < b0.entrees.length; k++) {
      const d = docDe(b0.entrees.filter((_, i) => i !== k))
      let vues = 0; for (const pid of d.getArray('ordre').toArray()) vues += d.getMap('pages').get(pid)?.get('formes')?.size ?? 0
      if (d.store.pendingStructs && formesTout - vues >= 2 && vues > gardees) { cachees = formesTout - vues; gardees = vues; meilleure = k }
    }
    ok(meilleure > 0 && cachees > 0, `la base : ${b0.entrees.length} entrées, ${formesTout} formes ; retirer la clé ${b0.cles[meilleure]} en cache ${cachees}`)
    const manquante = b0.entrees[meilleure]
    await outil.evaluate(async ({ nom, cle }) => {
      const r = indexedDB.open(nom)
      const db = await new Promise(ok => { r.onsuccess = () => ok(r.result) })
      const t = db.transaction(['updates'], 'readwrite'); t.objectStore('updates').delete(cle)
      await new Promise(ok => { t.oncomplete = ok }); db.close()
    }, { nom: base, cle: b0.cles[meilleure] })
    const b1 = await lire()

    // B1. Le classeur rouvert : l'état le dit
    p = await ouvrir(ctx, '?classeur=' + id, 'B2')
    await dort(1500)
    const vu = await p.evaluate(() => ({
      formes: window.__app.formes.length, incomplet: window.__app.tableau.incomplet, trou: window.__app.tableau.trou,
      lignes: window.__surveillance.texte.lignes.map(l => ({ quoi: l.quoi, niveau: l.niveau, texte: l.texte.replace(/[  ]/g, ' ') })),
      court: (document.querySelector('.etat-classeur')?.textContent || '').replace(/[  ]/g, ' '),
      bandeau: !document.querySelector('.bandeau-sauvegarde').hidden,
      nav: window.__surveillance.etat.navigateur,
    }))
    console.log('   rouvert :', JSON.stringify({ ...vu, lignes: vu.lignes.map(l => l.texte.slice(0, 70)) }))
    ok(vu.incomplet && !vu.trou && vu.formes === formesTout - cachees, `B1) rouvert : ${vu.formes} formes à l'écran sur ${formesTout}, Tableau.incomplet (pas un trou de cette séance)`, vu)
    ok(!vu.lignes.some(l => /^Enregistré dans ce navigateur/.test(l.texte)) && /ne se relit plus dans ce navigateur/.test(vu.lignes[0]?.texte) && vu.lignes[0]?.niveau === 'attention',
      '   … l\'état ne dit plus « Enregistré dans ce navigateur » : « Une partie de ce classeur ne se relit plus dans ce navigateur… »', vu.lignes)
    ok(vu.court === 'Une partie ne se relit pas', '   … le texte court : « Une partie ne se relit pas »', vu.court)
    ok(!vu.bandeau, '   … sans bandeau (aucun clic ne la répare)')
    ok((await toasts(p)).some(t => /ne se relit plus dans ce navigateur/.test(t)), '   … et l\'ouverture le dit une fois', await toasts(p))
    const resume = await p.evaluate(async () => (await import('/src/classeurs/etat.ts')).resumeEtat(window.__surveillance.etat, Date.now()))
    ok(/^Une partie ne se relit plus dans ce navigateur/.test(resume), '   … la ligne de la bibliothèque aussi', resume)
    // Le texte court tient dans la forme large (comme « Seulement dans ce navigateur »)
    const largeurs = await p.evaluate(() => {
      const m = Object.assign(document.createElement('span'), { className: 'mesure-etat' }); document.body.appendChild(m)
      const w = t => { m.textContent = t; return m.getBoundingClientRect().width }
      const r = { nouveau: w('Une partie ne se relit pas'), reference: w('Seulement dans ce navigateur') }; m.remove(); return r
    })
    ok(largeurs.nouveau <= largeurs.reference, '   … et il n\'est pas plus large que « Seulement dans ce navigateur » (la forme large le garde entier)', largeurs)

    // B2. Ctrl + S depuis la base (le travailleur) : un fichier qui se rouvre, et le message le dit
    await ctrlS(p, 'troue-base.memc')
    ok(await attendreToast(p, /troue-base\.memc/), 'B2) Ctrl + S')
    const msg = (await toasts(p)).filter(t => /troue-base\.memc/.test(t)).pop() ?? ''
    ok(/^Classeur enregistré, sans la partie qui ne se relit plus dans ce navigateur : troue-base\.memc/.test(msg) && !/^Classeur enregistré :/.test(msg), '   … « Classeur enregistré, sans la partie qui ne se relit plus dans ce navigateur : … » (jamais « Classeur enregistré : »)', msg)
    const fb = lireMemc(await opfsLire(p, 'troue-base.memc'))
    ok(fb.entier && fb.formes === vu.formes && fb.entete.id === id, `   … le fichier est entier (rien en attente), avec les ${fb.formes} formes qui se voient`, { entier: fb.entier, formes: fb.formes })
    const f1 = await ctrlO(p, 'troue-base.memc')
    ok(f1.titre === 'Ouvrir ce classeur ?', '   … et il se rouvre : « Ouvrir ce classeur ? » (pas « abîmé »)', f1)
    await p.keyboard.press('Escape'); await dort(300)

    // B3. Depuis la mémoire (un trou de cette séance-ci en plus) : le même fichier lisible
    await p.evaluate(() => window.__app.tableau.soupconnerTrou('autre'))
    await ctrlS(p, 'troue-memoire.memc')
    ok(await attendreToast(p, /troue-memoire\.memc/), 'B3) un trou de cette séance en plus : Ctrl + S depuis la mémoire de l\'onglet')
    const msg2 = (await toasts(p)).filter(t => /troue-memoire/.test(t)).pop() ?? ''
    ok(/^Classeur enregistré, sans la partie qui ne se relit plus/.test(msg2), '   … le message le dit', msg2)
    const fm = lireMemc(await opfsLire(p, 'troue-memoire.memc'))
    ok(fm.entier && fm.formes === vu.formes, '   … le fichier est entier', { entier: fm.entier, formes: fm.formes })
    ok(await p.evaluate(() => window.__app.tableau.doc.store.pendingStructs !== null), '   … et la mémoire garde ses changements en attente (rien n\'est jeté)')
    // La réparation du trou de cette séance ne fait pas dire « Enregistré dans ce navigateur »
    await p.evaluate(() => window.__surveillance.reparer())
    const apres = await p.evaluate(() => ({ nav: window.__surveillance.etat.navigateur, trou: window.__app.tableau.trou, l: window.__surveillance.texte.lignes[0].texte }))
    ok(apres.nav === 'incomplet' && !apres.trou && !/^Enregistré/.test(apres.l), '   … le trou de cette séance réparé, l\'état dit encore qu\'une partie ne se relit plus', apres)

    // B4. La clé s'écrit encore (ce qui se relit, et le travail de cette séance)
    await p.evaluate(() => { window.__nomChoisi = 'troue-cle.memc' })
    await p.evaluate(() => window.__cle.activer())
    await p.waitForFunction(() => window.__cle.etat.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
    await trait(p, 700, 300)
    await p.evaluate(() => window.__app.tableau.attendreEcritures())
    const r = await p.evaluate(() => window.__cle.ecrire({}))
    const cle = await p.evaluate(() => ({ etat: window.__cle.etat.etat, message: window.__cle.etat.message ?? null }))
    const fc = lireMemc(await opfsLire(p, 'troue-cle.memc'))
    ok(r === 'ecrit' && cle.etat === 'ok' && fc.entier && fc.formes === vu.formes + 1, 'B4) l\'enregistrement automatique sur la clé écrit ce qui se relit, avec le trait de cette séance', { r, cle, entier: fc.entier, formes: fc.formes })
    await p.evaluate(() => window.__cle.arreter())

    // B5. La base n'a été ni vidée ni réécrite
    const b2 = await lire()
    ok(b2.entrees.length >= b1.entrees.length && b1.entrees.every(e => b2.entrees.includes(e)), 'B5) la base garde toutes ses entrées (rien n\'est vidé)', { avant: b1.entrees.length, apres: b2.entrees.length })

    // B6. Un fichier qui a la partie manquante (un Ctrl + S de la séance du trou) la complète
    const complet = docDe([...b2.entrees, manquante])
    ok(!complet.store.pendingStructs, 'B6) la base et l\'entrée manquante font un document entier')
    await opfsEcrire(p, 'complet.memc', faireMemc(Y.encodeStateAsUpdate(complet), { date: Date.now(), pages: complet.getArray('ordre').length, nom: 'Troué', id }))
    const f6 = await ctrlO(p, 'complet.memc')
    ok(f6.boutons.includes('mettre-a-jour'), '   … Ctrl + O : « Mettre à jour le classeur » (le fichier contient tout ce qu\'a la base, et plus)', f6)
    if (f6.boutons.includes('mettre-a-jour')) {
      await cliquerEtRecharger(p, 'mettre-a-jour')
      const repare = await p.evaluate(() => ({ formes: window.__app.formes.length, incomplet: window.__app.tableau.incomplet, l: window.__surveillance.texte.lignes[0].texte, court: (document.querySelector('.etat-classeur')?.textContent || '') }))
      ok(!repare.incomplet && repare.formes === formesTout + 1 && repare.l === 'Enregistré dans ce navigateur', `   … le classeur est entier : ${repare.formes} formes, « Enregistré dans ce navigateur »`, repare)
    } else await p.keyboard.press('Escape')
    await p.evaluate(() => window.__surveillance?.laisserPartir?.())
  } finally {
    await p.evaluate(() => window.__surveillance?.laisserPartir?.()).catch(() => {})
    await ctx.close()
  }
}

// =====================================================================
// C. « REMPLACER » LE CLASSEUR OUVERT PAR LE FICHIER D'UN CLASSEUR DE LA CORBEILLE
// =====================================================================
// Le chemin voisin de A3 : le fichier d'un classeur qui est dans la
// corbeille, et « Remplacer « B »… » au lieu d'« Ajouter ». B prend un id
// neuf (celui du fichier est à l'original, qu'on peut remettre) : c'est une
// copie, son registre des publications vidé et marquée, comme A3.
if (seul('C')) {
  console.log('\n=== C. Remplacer le classeur ouvert par le fichier d\'un classeur de la corbeille ===')
  const { ctx, drive } = await contexte()
  const p = await ouvrir(ctx, '', 'C')
  try {
    const original = await p.evaluate(() => ({ id: window.__app.classeur.id, base: window.__app.classeur.base, nom: window.__app.classeur.nom }))
    for (let i = 0; i < 3; i++) await trait(p, 250, 200 + i * 60)
    const pub1 = await publier(p)
    ok(/publiée/.test(pub1.etat) && !!pub1.id, `l'original publie sa séance : lien ${pub1.id}`, pub1)
    const contenuAvant = drive.get(pub1.id)?.contenu
    await ctrlS(p, 'orig-c.memc')
    ok(await attendreToast(p, /Classeur enregistré : orig-c\.memc/), 'Ctrl + S : orig-c.memc')
    // Un autre classeur, « Classe B », ajouté depuis un fichier fait sous Node, et ouvert
    const nb = new Y.Doc({ gc: false })
    { const pg = new Y.Map(); pg.set('fond', 'blanc'); pg.set('formes', new Y.Map()); nb.getMap('pages').set('pB', pg); nb.getArray('ordre').push(['pB']) }
    await opfsEcrire(p, 'classe-b.memc', faireMemc(Y.encodeStateAsUpdate(nb), { date: Date.now(), pages: 1, nom: 'Classe B', id: 'b0b0b0b0b0b0b0b0' }))
    await ctrlO(p, 'classe-b.memc')
    await p.evaluate(() => { const c = document.querySelector('.dialogue-fichiers[open] .case input'); if (c) c.checked = false })
    await cliquerEtRecharger(p, 'ajouter')
    const B = await p.evaluate(() => ({ id: window.__app.classeur.id, base: window.__app.classeur.base }))
    ok(B.id === 'b0b0b0b0b0b0b0b0', 'le classeur « Classe B » est ouvert', B)
    // L'original à la corbeille, puis son fichier : « Remplacer « Classe B »… »
    await p.evaluate(id => window.__registre.modifierClasseur(id, x => { x.corbeille = { t: Date.now() } }), original.id)
    const f1 = await ctrlO(p, 'orig-c.memc')
    ok(f1.textes.some(t => /corbeille/.test(t)) && f1.boutons.includes('remplacer-ouvert'), 'C1) le fichier d\'un classeur de la corbeille : « Remplacer « Classe B »… » est offert', f1)
    await p.click('.dialogue-fichiers[open] [data-a="remplacer-ouvert"]')
    await p.waitForSelector('.dialogue-ouvrir[open]', { timeout: 20000 }); await dort(250)
    const t0 = await p.evaluate(() => performance.timeOrigin)
    await p.click('.dialogue-ouvrir[open] [data-a="remplacer"]')
    await p.waitForFunction(t => performance.timeOrigin !== t, t0, { timeout: 30000 }).catch(() => {})
    await pret(p); await dort(800)
    const apres = await p.evaluate(() => ({ id: window.__app.classeur.id, base: window.__app.classeur.base, registre: [...window.__app.tableau.doc.getMap('publications').keys()], marque: window.__app.tableau.doc.getMap('copie').get('id') ?? null, formes: window.__app.formes.length }))
    ok(apres.base === B.base && apres.id !== original.id && apres.id !== B.id && apres.formes === 3, '   … « Classe B » a le contenu du fichier, sous un id neuf (celui du fichier reste à l\'original)', apres)
    ok(apres.registre.length === 0 && apres.marque === apres.id, '   … sans le registre des publications de l\'original, et marqué comme copie (comme A3)', apres)
    ok((await toasts(p)).some(t => t.includes(PUBLIEES_COPIE)), '   … et l\'arrivée le dit', await toasts(p))
    const fb = (await fiches(p)).find(x => x.id === apres.id)
    const vb = [...Y.encodeStateVector(docDe(await misesDe(p, apres.base)))]
    ok(!!fb && JSON.stringify(fb.vecteur) === JSON.stringify(vb), '   … sa fiche a le vecteur de sa base (le vidage compris)', { fiche: fb?.vecteur, base: vb })
    // L'original remis : il garde son registre ; « Classe B » publie sous un nouveau lien
    await p.evaluate(id => window.__registre.modifierClasseur(id, x => { delete x.corbeille }), original.id)
    ok((await registreDe(p, original.base))?.length === 1, '   … l\'original, remis, garde le sien')
    await trait(p, 600, 450)
    const pub2 = await publier(p)
    ok(!pub2.deja && pub2.id && pub2.id !== pub1.id && drive.get(pub1.id)?.contenu === contenuAvant, `C2) publier depuis « Classe B » fait un nouveau lien (${pub2.id}) ; le fichier Drive de l'original n'a pas changé`, { pub1: pub1.id, pub2 })
    // Un fichier du même classeur (son id) : « Remplacer » garde l'identité et le registre, comme avant
    await ctrlS(p, 'classe-b-2.memc')
    ok(await attendreToast(p, /classe-b-2\.memc/), 'Ctrl + S : classe-b-2.memc')
    await trait(p, 650, 520)
    await p.evaluate(() => window.__app.tableau.attendreEcritures())
    const f2 = await ctrlO(p, 'classe-b-2.memc')
    await p.keyboard.press('Escape'); await dort(300)
    ok(!f2.boutons.includes('remplacer-ouvert'), '   … (le fichier du classeur ouvert, lui, ne propose pas de remplacer un autre classeur)', f2)
    await p.evaluate(() => window.__surveillance?.laisserPartir?.())
  } finally {
    await p.evaluate(() => window.__surveillance?.laisserPartir?.()).catch(() => {})
    await ctx.close()
  }
}

await nav.close()
console.log('\nerreurs JS :', erreurs.length ? [...new Set(erreurs)].slice(0, 12) : 'aucune')
if (erreurs.length) echecs++
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'tout est bon')
process.exit(echecs ? 1 : 0)
