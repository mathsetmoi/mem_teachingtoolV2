// ESSAI DU LOT 7 : ouvrir et enregistrer, sur l'ordinateur ou sur le Drive.
// Le serveur de développement (port 5173) et la version hors ligne
// (dist/index.html, en file://). Google est simulé comme dans lot4/C10 (le
// faux Google de lot4/verif/migration, avec en plus le déplacement d'un
// fichier, addParents/removeParents ; aucun code de Google n'est chargé
// pour ouvrir : seule l'API Drive). Les dossiers de l'ordinateur sont des dossiers de l'OPFS
// (showDirectoryPicker simulé), comme les fichiers de lot4/C9 ; sans
// accents dans les noms (l'OPFS de Chromium refuse parfois « Symétrie.memc »
// dans un dossier qui existe déjà, ce que ne fait pas un vrai dossier).
// A. « Ouvrir… » de la bibliothèque : la fenêtre, ses deux onglets ;
//    « Choisir des fichiers… » ouvre comme avant.
// B. « Choisir un dossier… » : ses classeurs dans le dossier du même nom de
//    la bibliothèque, le dossier relié (chaque classeur y garde son fichier),
//    « Mes emplacements ».
// C. « Enregistrer… » (lot 18 : « Autres sauvegardes… » → « Relier un niveau… », et le menu du dossier) : le dossier du
//    niveau sur l'ordinateur, tenu à jour : un .memc par classeur, dans un
//    dossier du chapitre rangé comme dans la bibliothèque ; un fichier déjà
//    là qui n'est pas à lui n'est pas écrasé.
// D. Le même niveau sur le Drive : « MEM - Classeurs › 4B », la copie d'avant
//    déplacée (pas une seconde copie) dans le dossier de son chapitre ; la fenêtre « Ouvrir » montre le
//    niveau, et un de ses classeurs s'ouvre comme un fichier ; toute la
//    bibliothèque déposée une fois.
// E. « Retirer » : plus relié, rien d'effacé.
// F. La version hors ligne : le Drive grisé, et dit ; rien vers Google.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { lancerPersistant } from '../commun/playwright.mjs'
import { FauxGoogle } from '../lot4/verif/migration/faux-google.mjs'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '') }
const norm = t => (t || '').replace(/[  ]/g, ' ')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}

// ---------- Le faux Google, avec le déplacement ----------
class FauxGoogle7 extends FauxGoogle {
  constructor() { super(); this.autresScripts = [] }
  async brancher(ctx) {
    await super.brancher(ctx)
    // Aucun autre code de Google ne doit être demandé (pas de fenêtre de Google)
    await ctx.route(/apis\.google\.com/, r => { this.autresScripts.push(r.request().url()); return r.fulfill({ status: 404, body: '' }) })
  }
  async repondre(r) {
    const req = r.request(), u = new URL(req.url())
    const une = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/)
    if (une && req.method() === 'PATCH' && (u.searchParams.get('addParents') || u.searchParams.get('removeParents'))) {
      const qui = (req.headers().authorization ?? '').replace('Bearer jeton:', '')
      this.requetes.push({ m: 'PATCH', chemin: u.pathname, recherche: u.search, qui })
      const f = this.drive(qui).get(decodeURIComponent(une[1]))
      if (!f) return r.fulfill({ status: 404, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"error":{"message":"File not found"}}' })
      const retirer = (u.searchParams.get('removeParents') || '').split(',').filter(Boolean)
      f.parents = [...(f.parents ?? []).filter(x => !retirer.includes(x)), ...(u.searchParams.get('addParents') || '').split(',').filter(Boolean)]
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(this.vue(f)) })
    }
    return super.repondre(r)
  }
}

// ---------- La page ----------
/** Les permissions accordées, les choix de fichiers et de dossiers dans l'OPFS */
const INIT = () => {
  window.__aOuvrir = null
  window.__dossierChoisi = null
  window.__choixDossier = 0
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { return 'granted' }
  H.requestPermission = async function () { return 'granted' }
  const racine = async chemin => { let d = await navigator.storage.getDirectory(); for (const n of chemin.split('/').filter(Boolean)) d = await d.getDirectoryHandle(n, { create: true }); return d }
  window.__racineOpfs = racine
  window.showOpenFilePicker = async () => {
    const dir = await navigator.storage.getDirectory()
    const noms = [].concat(window.__aOuvrir ?? [])
    window.__aOuvrir = null
    if (!noms.length) throw new DOMException('rien', 'AbortError')
    return Promise.all(noms.map(n => dir.getFileHandle(n)))
  }
  window.showSaveFilePicker = async o => (await navigator.storage.getDirectory()).getFileHandle(o?.suggestedName || 'x.memc', { create: true })
  window.showDirectoryPicker = async () => {
    window.__choixDossier++
    const c = window.__dossierChoisi
    window.__dossierChoisi = null
    if (!c) throw new DOMException('rien', 'AbortError')
    return racine(c)
  }
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const OUTILS = () => {
  const trait = (auteur, x, y, id) => ({ id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur, pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  window.__creer = async (liste) => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts')
    const T = Date.now(), r = []
    for (const o of liste) {
      const t = new Tableau(null)
      const a = t.ajouterPage('blanche', 0); await Promise.resolve(); t.pageVue = a
      for (const id of o.traits ?? ['t' + Math.random().toString(36).slice(2)]) { t.nouveauGeste(); t.poser(a, trait(t.moi, 10, 10, id)); await Promise.resolve() }
      const { etat } = fichier.lireTableau(new Uint8Array(await fichier.ecrireTableau(t.doc).arrayBuffer()))
      t.doc.destroy()
      const id = dem.idClasseur(), nom = o.nom
      const fiche = { id, base: dem.baseDe(id), nom, dossier: o.dossier ?? null, etiquettes: [], cree: T - 3600e3, modifie: T - 600e3, ouvert: 0, pages: 1 }
      await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
      r.push(id)
    }
    return r
  }
  /** Un .memc neuf (un classeur qui n'est pas dans la bibliothèque), dans un dossier de l'OPFS */
  window.__memcNeuf = async (chemin, nomFichier, nom) => {
    const dem = await import('/src/classeurs/demarrage.ts')
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts')
    const t = new Tableau(null)
    const a = t.ajouterPage('blanche', 0); await Promise.resolve(); t.pageVue = a
    t.nouveauGeste(); t.poser(a, trait(t.moi, 20, 20, 'n' + Math.random().toString(36).slice(2))); await Promise.resolve()
    const blob = fichier.ecrireTableau(t.doc, Date.now(), { nom, id: dem.idClasseur() })
    t.doc.destroy()
    const d = await window.__racineOpfs(chemin)
    const h = await d.getFileHandle(nomFichier, { create: true })
    const w = await h.createWritable(); await w.write(blob); await w.close()
  }
  window.__dossier = async (nom, parent = null) => {
    const dem = await import('/src/classeurs/demarrage.ts')
    const d = { id: dem.idClasseur(), nom, parent, couleur: '#3b6fb6', cree: Date.now() }
    await window.__registre.ajouterDossier(d)
    return d.id
  }
  /** Ce qu'il y a dans un dossier de l'OPFS : nom → taille (les sous-dossiers en objets) */
  window.__lister = async chemin => {
    const voir = async d => { const o = {}; for await (const [n, h] of d.entries()) o[n] = h.kind === 'directory' ? await voir(h) : (await h.getFile()).size; return o }
    return voir(await window.__racineOpfs(chemin))
  }
  /** Le contenu d'un fichier de l'OPFS : son en-tête (la première ligne) */
  window.__entete = async (chemin, nom) => {
    const f = await (await (await window.__racineOpfs(chemin)).getFileHandle(nom)).getFile()
    const o = new Uint8Array(await f.slice(0, 2000).arrayBuffer())
    return JSON.parse(new TextDecoder().decode(o.subarray(0, o.indexOf(10))))
  }
  window.__ecrireOpfs = async (chemin, nom, texte) => {
    const h = await (await window.__racineOpfs(chemin)).getFileHandle(nom, { create: true })
    const w = await h.createWritable(); await w.write(texte); await w.close()
  }
}
const toasts = p => p.evaluate(() => (window.__toasts || []).splice(0))
const attendreToast = (p, re, timeout = 20000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)

// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (la poignée du dossier relue depuis IndexedDB)
const navigateur = await lancerPersistant()
async function contexte(g) {
  const ctx = await navigateur.newContext({ viewport: { width: 1366, height: 768 } })
  if (g) await g.brancher(ctx)
  await ctx.addInitScript(INIT)
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(OUTILS)
  await ctx.addInitScript(() => { try { sessionStorage.setItem('mem-emplacements-detail', '1') } catch {} })  // la liste complète de « Mes emplacements » (lot 15 : sinon une seule ligne)
  return ctx
}
const pret = p => p.waitForFunction(() => window.__surveillance && window.__drive !== undefined && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
async function ouvrirPage(ctx, nom = 'p') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.evaluate(() => Promise.all([window.__cle?.pret, window.__drive?.pret]))
  return p
}
const voirBibliotheque = async p => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.waitForTimeout(200)
}
const fiches = p => p.evaluate(async () => (await window.__registre.classeurs()).map(f => ({ id: f.id, nom: f.nom, dossier: f.dossier, cle: f.cle?.nom ?? null, copieDrive: f.copieDrive ?? null, drive: f.drive ? { compte: f.drive.compte, id: f.drive.id, dossier: f.drive.dossier ?? null } : null })))
const dossiers = p => p.evaluate(async () => (await window.__registre.dossiers()).map(d => ({ id: d.id, nom: d.nom, parent: d.parent })))
const lesEmplacements = p => p.evaluate(async () => (await window.__registre.reglage('emplacements')) ?? [])
const fenetre = p => p.evaluate(() => {
  const d = document.querySelector('dialog[open]')
  return d ? { titre: d.querySelector('h2')?.textContent, classe: d.className, texte: (d.textContent || '').replace(/[  ]/g, ' ') } : null
})

try {
  // =====================================================================
  console.log('\n— A. « Ouvrir… » de la bibliothèque')
  const g = new FauxGoogle7()
  const ctx = await contexte(g)
  const p = await ouvrirPage(ctx, 'A')
  await voirBibliotheque(p)
  await p.click('.biblio-bouton[data-action="ouvrir-fichier"]')
  await p.waitForSelector('dialog.dialogue-ouvrir-ailleurs[open]')
  let f = await fenetre(p)
  ok(f?.titre === 'Ouvrir' && /Cet ordinateur/.test(f.texte) && /Google Drive/.test(f.texte), 'A1) La fenêtre « Ouvrir », ses deux onglets', f)
  const onglets = await p.evaluate(() => [...document.querySelectorAll('dialog[open] .onglet')].map(o => `${o.textContent}:${o.getAttribute('aria-selected')}`))
  ok(onglets.join('|') === 'Cet ordinateur:true|Google Drive:false', 'A2) « Cet ordinateur » d\'abord', onglets)
  ok(await p.isVisible('dialog[open] .a-dossier'), 'A3) « Choisir un dossier… » (Chrome et Edge)')
  // Choisir des fichiers : comme avant
  await p.evaluate(() => window.__memcNeuf('', 'Seul.memc', 'Seul'))
  await p.evaluate(() => { window.__aOuvrir = ['Seul.memc'] })
  await p.click('dialog[open] .a-fichiers')
  await p.waitForSelector('dialog[open]:not(.dialogue-ouvrir-ailleurs)', { timeout: 15000 })
  f = await fenetre(p)
  ok(/Ouvrir ce classeur/.test(f?.titre ?? ''), 'A4) « Choisir des fichiers… » : la question d\'avant (« Ouvrir ce classeur ? »)', f)
  await p.click('dialog[open] [data-a="annuler"]')
  await p.waitForTimeout(300)

  // =====================================================================
  console.log('\n— B. « Choisir un dossier… » : tout un dossier, relié')
  await p.evaluate(async () => {
    await window.__memcNeuf('Classe 5A', 'Fractions.memc', 'Fractions')
    await window.__memcNeuf('Classe 5A', 'Symetrie.memc', 'Symetrie')
    await window.__ecrireOpfs('Classe 5A', 'notes.txt', 'pas un classeur')
  })
  await voirBibliotheque(p)
  await p.click('.biblio-bouton[data-action="ouvrir-fichier"]')
  await p.waitForSelector('dialog.dialogue-ouvrir-ailleurs[open]')
  ok(await p.isChecked('dialog[open] .a-relier-ordi input'), 'B1) « Garder ce dossier relié » coché d\'avance')
  await p.evaluate(() => { window.__dossierChoisi = 'Classe 5A' })
  await p.click('dialog[open] .a-dossier')
  // La fenêtre des fichiers ouverts (plusieurs) : elle dit tout, on confirme
  await p.waitForSelector('dialog[open]:not(.dialogue-ouvrir-ailleurs)', { timeout: 20000 })
  f = await fenetre(p)
  const principal = await p.evaluate(() => document.querySelector('dialog[open] .actions .principal')?.textContent)
  ok(/2 classeurs?|Fractions/.test(f?.texte ?? ''), 'B2) Les deux classeurs du dossier (pas notes.txt)', f)
  await p.click('dialog[open] .actions .principal')
  await attendreToast(p, /relié|Classe 5A/, 20000)
  await p.waitForFunction(async () => ((await window.__registre.reglage('emplacements')) ?? []).length === 1, null, { timeout: 20000 }).catch(() => {})
  await p.waitForTimeout(800)
  let ds = await dossiers(p), fs = await fiches(p)
  const d5 = ds.find(d => d.nom === 'Classe 5A')
  ok(!!d5 && d5.parent === null, 'B3) Le dossier « Classe 5A » dans la bibliothèque (à la racine)', ds)
  const dans5 = fs.filter(x => x.dossier === d5?.id)
  ok(dans5.map(x => x.nom).sort().join('|') === 'Fractions|Symetrie', `B4) Ses classeurs (bouton : ${principal})`, fs)
  ok(dans5.every(x => x.cle === `${x.nom}.memc`), 'B5) Chacun garde son fichier du dossier (enregistrement automatique)', dans5)
  let em = await lesEmplacements(p)
  ok(em.length === 1 && em[0].genre === 'ordinateur' && em[0].nom === 'Classe 5A' && em[0].dossier === d5?.id, 'B6) L\'emplacement est noté (cet ordinateur, « Classe 5A »)', em)
  let liste = await p.evaluate(() => { const s = document.querySelector('.emplacements'); return s && !s.hidden ? norm(s.textContent) : null; function norm(t) { return (t || '').replace(/[  ]/g, ' ') } })
  ok(/Où sont copiées mes classes/.test(liste ?? '') && /Classe 5A → Cet ordinateur › Classe 5A/.test(liste ?? ''), 'B7) La liste des copies (« Où sont copiées mes classes ? ») en haut de la bibliothèque', liste)
  let contenu = await p.evaluate(() => window.__lister('Classe 5A'))
  ok(Object.keys(contenu).sort().join('|') === 'Fractions.memc|Symetrie.memc|notes.txt', 'B8) Rien de plus, rien d\'écrasé dans le dossier', contenu)
  await toasts(p)

  // =====================================================================
  console.log('\n— C. « Enregistrer… » : le dossier du niveau sur l\'ordinateur')
  const d4 = await p.evaluate(() => window.__dossier('4B'))
  const dGeo = await p.evaluate(d => window.__dossier('Geometrie', d), d4)
  const ids4 = await p.evaluate(([a, b]) => window.__creer([{ nom: 'Calcul', dossier: a }, { nom: 'Triangles', dossier: b }]), [d4, dGeo])
  // Un fichier « Calcul.memc » qui n'est pas à lui, déjà dans le dossier du chapitre « Calcul »
  await p.evaluate(() => window.__ecrireOpfs('Cle 4B/Calcul', 'Calcul.memc', 'un autre fichier'))
  await p.keyboard.press('Escape')
  await p.evaluate(() => { if (window.__bibliotheque.ouvert) window.__bibliotheque.fermer?.() })
  // (Adapté au lot 18 : plus d'entrée « Enregistrer sur le Drive ou ailleurs… » dans le menu ⋯ ni de ui.enregistrerAilleurs)
  await p.evaluate(() => window.__ailleurs.enregistrer())
  await p.waitForSelector('dialog.dialogue-enregistrer-ailleurs[open]')
  f = await fenetre(p)
  // (Adapté : plus de « Quoi ? » ; la fenêtre nomme ce qui part, ici le classeur ouvert, et ne demande que « Où ? »)
  ok(!/Quoi \?/.test(f.texte) && /Où \?/.test(f.texte) && /Enregistrer le classeur « /.test(f.titre ?? f.texte) && !/Toute la bibliothèque/.test(f.texte), 'C1) La fenêtre « Enregistrer » : le classeur ouvert en titre, seulement « Où ? »', { titre: f.titre, texte: f.texte.slice(0, 300) })
  // Depuis le menu ⋯ aussi : « Autres sauvegardes… » → « Relier un niveau… » (lot 18)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
  const entree = await p.evaluate(() => ({ ancienne: document.querySelectorAll('.menu-item[data-action="enregistrer-ailleurs"]').length, autres: [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item[data-action="autres-sauvegardes"] .libelle')].map(x => x.firstChild.textContent) }))
  ok(entree.ancienne === 0 && JSON.stringify(entree.autres) === '["Autres sauvegardes…"]', 'C2) Le menu ⋯ : « Autres sauvegardes… » (plus de « Enregistrer sur le Drive ou ailleurs… », lot 18)', entree)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="autres-sauvegardes"]')
  await p.waitForSelector('dialog.dialogue-autres[open] .as-relier')
  await p.click('dialog.dialogue-autres[open] .as-relier')
  await p.waitForSelector('dialog.dialogue-enregistrer-ailleurs[open]')
  const relie = await p.evaluate(() => ({ ouverte: !!document.querySelector('dialog.dialogue-enregistrer-ailleurs[open]'), autres: !!document.querySelector('dialog.dialogue-autres'), classe: document.querySelector('dialog[open] input[name=e-quoi][value=classe]')?.checked ?? null }))
  ok(relie.ouverte && !relie.autres && relie.classe !== false, '   … « Relier un niveau… » ouvre la fenêtre « Enregistrer » (sur « Le dossier du niveau » quand le classeur ouvert en a un), « Autres sauvegardes » refermée', relie)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  // Le menu du dossier « 4B » : « Enregistrer ce dossier… »
  await p.evaluate(d => window.__ailleurs.enregistrer({ quoi: 'classe', classe: d }), d4)
  await p.waitForSelector('dialog.dialogue-enregistrer-ailleurs[open]')
  const t3 = await p.evaluate(() => ({ titre: document.querySelector('dialog[open] h2')?.textContent, texte: document.querySelector('dialog[open]')?.textContent ?? '', large: document.querySelector('dialog[open]').scrollWidth > document.querySelector('dialog[open]').clientWidth }))
  ok(await p.isChecked('dialog[open] input[name=e-quoi][value=classe]') && t3.titre === 'Enregistrer le dossier « 4B »' && /1 sous-dossier et 2 classeurs/.test(t3.texte) && !/Ce classeur|Toute la bibliothèque/.test(t3.texte) && !t3.large,
    'C3) Le menu du dossier « 4B » : « Enregistrer le dossier « 4B » », 1 sous-dossier et 2 classeurs, ni « Ce classeur » ni la bibliothèque, rien ne déborde', t3)
  f = await fenetre(p)
  ok(/2 classeurs, avec toutes leurs séances/.test(f.texte) && /chaque classeur de « 4B » y aura son fichier/.test(f.texte), 'C4) « 4B » : 2 classeurs (adapté : sous le titre), et ce que fera « Le garder à jour tout seul »', f.texte)
  await p.evaluate(() => { window.__dossierChoisi = 'Cle 4B' })
  await p.click('dialog[open] .e-ok')
  await attendreToast(p, /» est relié au dossier « Cle 4B »/, 20000)
  const t4 = (await toasts(p)).join(' / ')
  contenu = await p.evaluate(() => window.__lister('Cle 4B'))
  ok(contenu['Calcul']?.['Calcul (2).memc'] > 0 && contenu['Calcul']?.['Calcul.memc'] === 'un autre fichier'.length && contenu['Geometrie']?.['Triangles']?.['Triangles.memc'] > 0,
    'C5) Un dossier par chapitre, rangé comme dans la bibliothèque, avec son .memc ; le fichier qui n\'est pas à lui n\'est pas touché (« Calcul (2).memc »)', contenu)
  ok(/2 classeurs dans « Cle 4B »/.test(t4), 'C6) Le message le dit', t4)
  fs = await fiches(p)
  ok(fs.find(x => x.id === ids4[0])?.cle === 'Calcul (2).memc' && fs.find(x => x.id === ids4[1])?.cle === 'Triangles.memc', 'C7) Chacun l\'a pour fichier de sa clé', fs)
  const ent = await p.evaluate(() => window.__entete('Cle 4B/Geometrie/Triangles', 'Triangles.memc'))
  ok(ent.nom === 'Triangles' && ent.id === ids4[1], 'C8) Le fichier est bien celui du classeur (son en-tête)', ent)
  // Mettre à jour : rien en double
  await voirBibliotheque(p)
  await p.evaluate(() => window.__bibliotheque.allerA(null))
  await p.waitForTimeout(300)
  const n = await p.evaluate(() => document.querySelectorAll('.emplacements li').length)
  ok(n === 2, 'C9) À la racine, « Mes emplacements » montre les deux niveaux reliés', n)
  await p.click('.emplacement:has-text("4B") .e-maj')
  await attendreToast(p, /4B/, 20000)
  contenu = await p.evaluate(() => window.__lister('Cle 4B'))
  ok(Object.keys(contenu).sort().join('|') === 'Calcul|Geometrie' && Object.keys(contenu['Calcul']).sort().join('|') === 'Calcul (2).memc|Calcul.memc', '   … « Mettre à jour » : rien en double', contenu)
  await toasts(p)

  // =====================================================================
  console.log('\n— D. Le niveau sur le Drive')
  // Une copie d'avant dans « MEM - Sauvegardes » (la copie du lot 4)
  await p.evaluate(() => window.__google.connecter('mem', '', 'select_account')).catch(() => {})
  const avant = g.requetes.length
  // Copie classique de « Calcul » d'abord, dans les sauvegardes
  await p.evaluate(async id => {
    const { copierDepuisLaBase, origineDe } = await import('/src/classeurs/copie-drive.ts')
    return copierDepuisLaBase(window.__registre, id, 'mem', { origine: await origineDe(window.__registre), voulu: () => true })
  }, ids4[0])
  const sauvegardes = () => g.fichiers().find(x => x.name === 'MEM - Sauvegardes')
  const ancienne = g.sauvegardes().find(x => x.appProperties?.memClasseur === ids4[0])
  ok(!!ancienne && ancienne.parents?.includes(sauvegardes()?.id), 'D0) (préparation) une copie de « Calcul » dans « MEM - Sauvegardes »', g.fichiers().map(x => x.name))
  await p.evaluate(d => window.__ailleurs.enregistrer({ quoi: 'classe', classe: d }), d4)
  await p.waitForSelector('dialog.dialogue-enregistrer-ailleurs[open]')
  await p.check('dialog[open] input[name=e-ou][value=drive]')
  f = await fenetre(p)
  ok(/MEM - Classeurs › 4B/.test(f.texte), 'D1) Le Drive : « MEM - Classeurs › 4B », un fichier par classeur', f.texte)
  await p.click('dialog[open] .e-ok')
  await attendreToast(p, /» est relié au Drive/, 30000)
  const tD = (await toasts(p)).join(' / ')
  const racineC = g.fichiers().find(x => x.name === 'MEM - Classeurs')
  const d4Drive = g.fichiers().find(x => x.name === '4B' && x.parents?.includes(racineC?.id))
  ok(!!racineC && racineC.appProperties?.memClasses === 'dossier-v1' && d4Drive?.appProperties?.memClasse === d4, 'D2) « MEM - Classeurs » et son sous-dossier « 4B », marqués', g.dossiers().map(x => [x.name, x.appProperties]))
  // Un dossier par chapitre dans celui du niveau, marqué par l'id du classeur
  const chapitres = g.dossiers().filter(x => x.parents?.includes(d4Drive?.id))
  const chapitreDe = id => chapitres.find(x => x.appProperties?.memChapitre === id)
  const dansD4 = g.sauvegardes().filter(x => chapitres.some(c => x.parents?.includes(c.id)))
  ok(chapitres.map(x => x.name).sort().join('|') === 'Calcul|Triangles' && ids4.every(id => !!chapitreDe(id)), 'D3a) Un dossier par chapitre dans « 4B », marqué par le classeur', g.dossiers().map(x => [x.name, x.appProperties]))
  ok(dansD4.map(x => x.name).sort().join('|') === 'Calcul.memc|Triangles.memc' && ids4.every(id => dansD4.some(x => x.appProperties?.memClasseur === id && x.parents?.includes(chapitreDe(id)?.id))), 'D3) Ses deux classeurs, chacun dans le dossier de son chapitre', dansD4.map(x => x.name))
  ok(g.sauvegardes().filter(x => x.appProperties?.memClasseur === ids4[0]).length === 1 && dansD4.some(x => x.id === ancienne.id), 'D4) La copie d\'avant de « Calcul » y a été déplacée (pas de seconde copie)', g.sauvegardes().map(x => [x.name, x.parents]))
  ok(/2 classeurs copiés|Tout y était/.test(tD), 'D5) Le message le dit', tD)
  fs = await fiches(p)
  ok(fs.filter(x => ids4.includes(x.id)).every(x => x.copieDrive === 'mem' && x.drive?.dossier === chapitreDe(x.id)?.id), 'D6) Les fiches : copie voulue sur ce Drive, dans le dossier du chapitre', fs.filter(x => ids4.includes(x.id)))
  em = await lesEmplacements(p)
  ok(em.some(e => e.genre === 'drive' && e.dossier === d4 && e.compte === 'mem' && e.nom === '4B'), 'D7) L\'emplacement Drive est noté', em)
  ok(g.relais.length === 0, 'D8) Rien vers le relais des replays')
  // « Ouvrir » : l'onglet Drive montre le niveau
  await voirBibliotheque(p)
  await p.click('.biblio-bouton[data-action="ouvrir-fichier"]')
  await p.waitForSelector('dialog.dialogue-ouvrir-ailleurs[open]')
  await p.click('dialog[open] .onglet[data-ou="drive"]')
  await p.waitForSelector('dialog[open] .classe-drive', { timeout: 15000 })
  const vues = await p.evaluate(() => [...document.querySelectorAll('dialog[open] .classe-drive')].map(c => c.textContent.replace(/[  ]/g, ' ')))
  ok(vues.length === 1 && /4B/.test(vues[0]) && /Calcul\.memc/.test(vues[0]) && /Triangles\.memc/.test(vues[0]) && /Ouvrir tout le niveau/.test(vues[0]), 'D9) « Ouvrir » › Google Drive : le niveau « 4B » et ses classeurs, « Ouvrir tout le niveau »', vues)
  ok(await p.$('dialog[open] .a-picker') === null, 'D10) Pas de « Choisir dans le Drive… » (pas de fenêtre de Google)')
  // Un classeur du niveau : il s'ouvre comme un fichier (déjà là : comparé)
  await p.click('dialog[open] .fichier-drive:has-text("Calcul.memc")')
  await p.waitForSelector('dialog[open]:not(.dialogue-ouvrir-ailleurs)', { timeout: 15000 })
  f = await fenetre(p)
  ok(/Ouvrir ce classeur/.test(f?.titre ?? '') && /Calcul/.test(f?.texte ?? ''), 'D11) Un classeur du niveau s\'ouvre comme un fichier (« Ouvrir ce classeur ? »)', f)
  await p.click('dialog[open] [data-a="annuler"]'); await p.waitForTimeout(300)
  // Toute la bibliothèque, une fois, sur le Drive
  await p.keyboard.press('Escape').catch(() => {})
  await p.evaluate(() => window.__ailleurs.enregistrer({ quoi: 'bibliotheque' }))
  await p.waitForSelector('dialog.dialogue-enregistrer-ailleurs[open]')
  await p.check('dialog[open] input[name=e-ou][value=drive]')
  ok(await p.isHidden('dialog[open] .e-garder'), 'D12) Toute la bibliothèque : pas de « garder à jour » (une fois)')
  await p.click('dialog[open] .e-ok')
  await attendreToast(p, /Bibliothèque enregistrée/, 30000)
  const depot = g.fichiers().find(x => /^Bibliothèque .*\.memb$/.test(x.name))
  ok(!!depot && depot.parents?.includes(racineC.id) && depot.appProperties?.memDepot === 'v1', 'D13) Le .memb dans « MEM - Classeurs », marqué comme dépôt', g.fichiers().map(x => x.name))
  // Récupérer une sauvegarde : celles des niveaux y sont aussi
  const rec = await p.evaluate(async () => (await window.__google.listerSauvegardes('mem')).map(s => s.nom))
  ok(rec.includes('Calcul.memc') && rec.includes('Triangles.memc'), 'D14) « Récupérer une sauvegarde du Drive » voit aussi celles des niveaux', rec)
  ok(g.depuis(avant).every(r => !/script\.google/.test(r.chemin)) && g.autresScripts.length === 0, 'D15) Rien que l\'API Drive (aucun autre code de Google)', g.autresScripts)
  await toasts(p)

  // =====================================================================
  console.log('\n— E. « Retirer »')
  await voirBibliotheque(p)
  await p.evaluate(() => window.__bibliotheque.allerA(null))
  await p.waitForTimeout(300)
  const avantRetirer = await p.evaluate(() => window.__lister('Classe 5A'))
  await p.click('.emplacement:has-text("Classe 5A") .e-retirer')
  await attendreToast(p, /n'est plus relié à/, 10000)
  em = await lesEmplacements(p)
  ok(!em.some(e => e.nom === 'Classe 5A'), 'E1) Plus dans la liste', em)
  ok(JSON.stringify(await p.evaluate(() => window.__lister('Classe 5A'))) === JSON.stringify(avantRetirer), 'E2) Rien d\'effacé dans le dossier')
  await ctx.close()

  // =====================================================================
  console.log('\n— F. La version hors ligne')
  const g2 = new FauxGoogle7()
  const ctx2 = await contexte(g2)
  const h = await ctx2.newPage(); suivre(h, 'F')
  await h.goto('file://' + RACINE_DEPOT + '/dist/index.html')
  await h.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await h.evaluate(() => (document.querySelector('.bouton-classeur')?.click(), document.querySelector('.menu-seances [data-action="bibliotheque"]')?.click()))
  await h.waitForSelector('.biblio-bouton[data-action="ouvrir-fichier"]', { timeout: 10000 })
  await h.click('.biblio-bouton[data-action="ouvrir-fichier"]')
  await h.waitForSelector('dialog.dialogue-ouvrir-ailleurs[open]')
  await h.click('dialog[open] .onglet[data-ou="drive"]')
  const hl = await h.evaluate(() => { const x = document.querySelector('dialog[open] .hors-ligne'); return x && !x.hidden ? x.textContent : null })
  ok(hl === 'Le Drive marche seulement depuis la version en ligne (mathsetmoi.github.io).', 'F1) « Ouvrir » › Google Drive : grisé, et dit', hl)
  await h.click('dialog[open] .a-fermer')
  await h.keyboard.press('Escape'); await h.waitForTimeout(300)
  // (Adapté au lot 18 : le menu ⋯ mène à « Autres sauvegardes… » ; hors ligne, « Relier un niveau… » y est grisé et le bloc le dit)
  await h.click('.barre-haut .bouton.points')
  await h.waitForSelector('.menu-item[data-action="autres-sauvegardes"]', { timeout: 10000 })
  await h.click('.menu-item[data-action="autres-sauvegardes"]')
  await h.waitForSelector('dialog.dialogue-autres[open]')
  const radio = await h.evaluate(() => ({ inactif: document.querySelector('dialog[open] .as-relier').disabled, dit: document.querySelector('dialog[open] [data-bloc="niveaux"] .as-hors')?.hidden === false && document.querySelector('dialog[open] [data-bloc="niveaux"] .as-hors').textContent === 'Seulement depuis la version en ligne.', compte: document.querySelector('dialog[open] .as-compte').disabled }))
  ok(radio.inactif && radio.dit && radio.compte, 'F2) « Autres sauvegardes » : « Relier un niveau… » grisé, et dit ; le compte du Drive aussi (lot 18)', radio)
  await h.keyboard.press('Escape'); await h.waitForTimeout(200)
  ok(g2.requetes.length === 0 && g2.gis.length === 0, 'F3) Rien vers Google', { requetes: g2.requetes.length, gis: g2.gis.length })
  await ctx2.close()
} catch (e) {
  echecs++
  console.log('✗ ÉCHEC (exception)', e?.stack ?? e)
} finally {
  await navigateur.close()
}
ok(erreurs.length === 0, 'Aucune erreur dans les pages', erreurs)
console.log(`\n${echecs ? `✗ ${echecs} échec(s)` : '✓ Tout est passé'}`)
process.exit(echecs ? 1 : 0)
