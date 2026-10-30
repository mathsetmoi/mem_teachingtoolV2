// ESSAI DU LOT 17 : « Vérifier les classeurs » : plus jamais d'image grise.
// Le serveur de développement (port 5173), puis la version hors ligne
// (dist/index.html en file://, construite par npm run build). Les classeurs
// sont fabriqués dans IndexedDB par l'API du tableau : « Symétrie » avec une
// photo (un carré rouge), « Fractions » avec une forme image dont la clé
// n'a pas de données (une séance déplacée « à l'ancienne »).
// A. Ouvrir « Fractions » : la case pâle à la place de l'image, puis le
//    message « 1 image retrouvée dans « Symétrie ». » et les pixels peints
//    (la couleur au centre de l'image).
// B. Une image introuvable (sa seule copie effacée pour de bon) : le message
//    « 1 image de ce classeur est introuvable dans ce navigateur. » et son
//    bouton « Vérifier les classeurs… », qui ouvre la bibliothèque puis la
//    fenêtre ; une fois par chargement.
// C. La fenêtre : ⋯ → « Vérifier les classeurs… », la ligne d'état, la ligne
//    « Fractions — 5ème / 1 image manquante, retrouvée dans « Symétrie »
//    (corbeille) », Réparer → « Réparé : 1 image remise. » ; le classeur
//    fermé a l'image dans sa base, puis ouvert la montre sans message ;
//    « Tout réparer » avec deux classeurs ; une image introuvable (pas de
//    bouton, le chemin pour la retrouver), un classeur illisible ; rien à
//    réparer : la liste cachée, seul « Fermer ».
// D. Vider la corbeille : la question porte le paragraphe des images, après
//    « Vider la corbeille » l'image est dans la banque de « Équations » et le
//    message le dit ; le même garde-fou sur « Supprimer définitivement » ; une
//    recopie qui échoue : le classeur n'est pas effacé, le message le dit ;
//    une base illisible dans la corbeille : « n'a pas pu être vérifié », et
//    effacée quand même ; aucune image concernée : la question ne change pas.
// E. Le classeur ouvert dans un autre onglet pendant Réparer : l'onglet se
//    recharge et voit l'image.
// F. Le téléphone (390 × 844) : la fenêtre pleine largeur, les boutons de
//    44 px empilés ; le clavier (Tab, Entrée, Échap).
// G. La version hors ligne (file://) : identique, sans réseau.
// M. Une mesure : une bibliothèque d'une dizaine de classeurs avec des
//    photos, le temps de la vérification (imprimé, pas un seuil).
import { RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { existsSync } from 'node:fs'

const DEV = 'http://localhost:5173/'
const R = `${RACINE_DEPOT}`
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const norm = t => (t || '').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim()
const seul = section => process.argv.length <= 2 || process.argv.slice(2).includes(section)
const dort = ms => new Promise(r => setTimeout(r, ms))
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}

/** Ce que la page sait faire pour l'essai : les messages du bas relevés,
 *  des classeurs fabriqués avec des images (ou des formes image sans
 *  données), la lecture d'une base sans ouvrir le classeur */
const OUTILS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[\u00a0\u202f]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
  /** Un carré de couleur en PNG (data:) ; grand : une « photo » de 800 × 600 en JPEG, du bruit */
  window.__carre = (couleur, taille = 40) => {
    const cv = Object.assign(document.createElement('canvas'), { width: taille, height: taille })
    const g = cv.getContext('2d'); g.fillStyle = couleur; g.fillRect(0, 0, taille, taille)
    return cv.toDataURL('image/png')
  }
  window.__photo = () => {
    const cv = Object.assign(document.createElement('canvas'), { width: 800, height: 600 })
    const g = cv.getContext('2d'), im = g.createImageData(800, 600)
    for (let i = 0; i < im.data.length; i++) im.data[i] = (i & 3) === 3 ? 255 : Math.random() * 255
    g.putImageData(im, 0, 0)
    return cv.toDataURL('image/jpeg', 0.9)
  }
  /** L'état d'un classeur : une page avec une forme image par entrée de
   *  images ({ src, donnees? }), à (100 + 80 i, 100), 40 × 40 ; la banque
   *  reçoit les données données (les autres clés restent sans rien) */
  window.__etatAvecImages = async (images) => {
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts')
    const t = new Tableau(null)
    const a = t.ajouterPage('blanc', 0); await Promise.resolve()
    t.pageVue = a
    const banque = t.doc.getMap('images')
    let i = 0
    for (const im of images) {
      if (im.donnees) banque.set(im.src, im.donnees)
      t.nouveauGeste()
      t.poser(a, { id: 'I' + Math.random().toString(36).slice(2), type: 'image', src: im.src, l: 40, h: 40, m: [1, 0, 0, 1], x: 100 + 80 * i, y: 100, z: Date.now() + i, auteur: t.moi })
      await Promise.resolve()
      i++
    }
    const blob = fichier.ecrireTableau(t.doc)
    const { etat } = fichier.lireTableau(new Uint8Array(await blob.arrayBuffer()))
    t.doc.destroy()
    return etat
  }
  /** Un classeur dans la bibliothèque (o.dossier, o.corbeille, o.modifie) */
  window.__creer = async (nom, images, o = {}) => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
    const etat = await window.__etatAvecImages(images)
    const id = dem.idClasseur(), T = Date.now()
    const fiche = { id, base: dem.baseDe(id), nom, dossier: o.dossier ?? null, etiquettes: [], cree: T - 3600e3, modifie: o.modifie ?? T - 600e3, ouvert: 0, pages: 1 }
    if (o.corbeille) fiche.corbeille = { t: T - 60e3 }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
    return id
  }
  window.__dossier = async (nom) => {
    const dem = await import('/src/classeurs/demarrage.ts')
    const d = { id: dem.idClasseur(), nom, parent: null, couleur: '#3b6fb6', cree: Date.now() }
    await window.__registre.ajouterDossier(d)
    return d.id
  }
  /** La banque d'un classeur, lue dans sa base sans l'ouvrir : ses clés avec des données */
  window.__banque = async (id) => {
    const bases = await import('/src/classeurs/bases.ts'), v = await import('/src/classeurs/verifier.ts')
    const f = await window.__registre.classeur(id)
    if (!f) return null
    try { const { mises } = await bases.lireMisesAJour(f.base); return v.inventaireDesMisesAJour(mises) } catch (e) { return { erreur: e.raison ?? String(e) } }
  }
  window.__bases = async () => (await indexedDB.databases()).map(d => d.name).sort()
  window.__effacerBase = (base) => new Promise(ok => { const r = indexedDB.deleteDatabase(base); r.onsuccess = r.onerror = r.onblocked = () => ok() })
}

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(OUTILS)
  return ctx
}
const pret = p => p.waitForFunction(() => (window.__app?.page && window.__registre && window.__bibliotheque) || (window.__bibliotheque && !window.__app && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })
async function ouvrir(ctx, chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(300)
  return p
}
const toasts = p => p.evaluate(() => window.__toasts.splice(0))
const attendreToast = async (p, motif, ms = 15000) => {
  const fin = Date.now() + ms
  const vus = []
  while (Date.now() < fin) {
    const t = await p.evaluate(() => window.__toasts.slice())
    vus.push(...t.slice(vus.length))
    const x = vus.find(x => motif.test(x))
    if (x) return x
    await dort(100)
  }
  return null
}
const ouvrirBiblio = async p => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert, null, { timeout: 10000 })
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.waitForTimeout(300)
}
const ENTREES = () => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return m ? [...m.querySelectorAll('.menu-item')].map(e => ({ action: e.dataset.action, texte: e.querySelector('.libelle')?.firstChild?.textContent, aide: e.querySelector('small')?.textContent ?? null })) : null }
/** La fenêtre « Vérifier les classeurs », telle qu'elle se montre */
const FENETRE = () => {
  const d = document.querySelector('dialog.dialogue-verification[open]')
  if (!d) return null
  const n = t => (t || '').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim()
  const a = document.activeElement
  const r = d.getBoundingClientRect()
  return {
    titre: n(d.querySelector('h2')?.textContent), explication: n(d.querySelector('.v-explication')?.textContent), etat: n(d.querySelector('.v-etat')?.textContent),
    listeCachee: d.querySelector('.v-liste').hidden,
    lignes: [...d.querySelectorAll('.v-ligne')].map(li => ({
      id: li.dataset.id, nom: n(li.querySelector('.v-nom')?.textContent), detail: n(li.querySelector('.v-detail')?.textContent), aide: n(li.querySelector('.v-aide')?.textContent) || null,
      erreur: n(li.querySelector('.v-erreur')?.textContent) || null, bouton: li.querySelector('.v-reparer') ? { texte: li.querySelector('.v-reparer').textContent, gris: li.querySelector('.v-reparer').disabled, h: Math.round(li.querySelector('.v-reparer').getBoundingClientRect().height), l: Math.round(li.querySelector('.v-reparer').getBoundingClientRect().width) } : null,
      reparee: li.classList.contains('reparee'), illisible: li.classList.contains('illisible'), l: Math.round(li.getBoundingClientRect().width),
    })),
    tout: d.querySelector('.v-tout').hidden ? null : { gris: d.querySelector('.v-tout').disabled, h: Math.round(d.querySelector('.v-tout').getBoundingClientRect().height) },
    fermer: { gris: d.querySelector('.v-fermer').disabled, h: Math.round(d.querySelector('.v-fermer').getBoundingClientRect().height) },
    focus: a?.classList.contains('v-reparer') ? 'reparer@' + a.closest('.v-ligne')?.dataset.id : a?.classList.contains('v-tout') ? 'tout' : a?.classList.contains('v-fermer') ? 'fermer' : a?.className ?? null,
    largeur: Math.round(r.width), gauche: Math.round(r.left), droite: Math.round(innerWidth - r.right), defile: document.documentElement.scrollWidth > innerWidth,
  }
}
const fenetre = p => p.evaluate(FENETRE)
const attendreFin = async (p, ms = 20000) => { await p.waitForFunction(() => { const e = document.querySelector('dialog.dialogue-verification[open] .v-etat'); return e && /vérifié/.test(e.textContent) }, null, { timeout: ms }); await p.waitForTimeout(150) }
const DIALOGUE = () => {
  const d = document.querySelector('dialog[open]')
  if (!d) return null
  return { titre: d.querySelector('h2')?.textContent, textes: [...d.querySelectorAll('p')].map(x => (x.textContent || '').replace(/[\u00a0\u202f]/g, ' ')),
    boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent + (b.disabled ? '(gris)' : '')), focus: document.activeElement?.dataset?.a ?? null, classe: d.className }
}
const dialogue = p => p.evaluate(DIALOGUE)
const attendreDialogue = async (p, ms = 15000) => { await p.waitForSelector('dialog[open]', { timeout: ms }); await p.waitForTimeout(150); return dialogue(p) }
/** La couleur peinte au centre de la i-ième image de la page vue (celle posée à (100 + 80 i, 100), 40 × 40) */
const couleurImage = (p, i = 0) => p.evaluate(i => {
  const app = window.__app, c = document.querySelector('.couche-scene')
  const e = app.cam.versEcran(100 + 80 * i + 20, 120)
  const k = c.width / c.getBoundingClientRect().width
  const d = c.getContext('2d').getImageData(Math.round(e.x * k), Math.round(e.y * k), 1, 1).data
  return [d[0], d[1], d[2], d[3]]
}, i)
const rouge = c => c && c[0] > 200 && c[1] < 60 && c[2] < 60
const pale = c => c && c[0] > 200 && c[1] > 200 && c[2] > 200
const ouvrirCorbeille = async p => { await p.click('[data-action="corbeille"]'); await p.waitForTimeout(250) }
const carteCorbeille = cle => `.carte-corbeille-biblio[data-cle="${cle}"]`
const fiche = (p, id) => p.evaluate(id => window.__registre.classeur(id), id)
const menuBandeau = async p => {
  // Le bouton ⋯ du bandeau de la bibliothèque
  await p.evaluate(() => { const b = [...document.querySelectorAll('.bibliotheque button')].find(x => x.getAttribute('aria-haspopup') === 'menu' && /Autres|⋯|Plus/.test(x.getAttribute('aria-label') || x.title || x.textContent)) || document.querySelector('.biblio-bandeau [aria-haspopup="menu"]'); b.click() })
  await p.waitForTimeout(250)
}
const ouvrirFenetre = async p => {
  await menuBandeau(p)
  const entrees = await p.evaluate(ENTREES)
  await p.click('.menu-flottant:not([hidden]) [data-action="verifier-classeurs"]')
  await p.waitForSelector('dialog.dialogue-verification[open]')
  return entrees
}

// =====================================================================
// A. À L'OUVERTURE : L'IMAGE RETROUVÉE DANS UN AUTRE CLASSEUR
// =====================================================================
if (seul('A')) {
  console.log('\n=== A. Ouvrir « Fractions » : l\'image retrouvée dans « Symétrie », les pixels peints ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'A')
  const d5 = await p.evaluate(() => window.__dossier('5ème'))
  const rougeData = await p.evaluate(() => window.__carre('#e01010'))
  const sym = await p.evaluate(d => window.__creer('Symétrie', [{ src: 'photo', donnees: d }]), rougeData)
  const fra = await p.evaluate(d => window.__creer('Fractions', [{ src: 'photo' }], { dossier: d }), d5)
  // La forme image sans données : la case pâle (la page le peint tant que la banque n'a rien)
  const avant = await p.evaluate(async id => (await window.__banque(id)).presentes, fra)
  ok(avant.length === 0, 'A0) « Fractions » montre « photo » sans en avoir les données', avant)
  const q = await ouvrir(ctx, '?classeur=' + fra, 'A-fractions')
  const t = await attendreToast(q, /image retrouvée/)
  ok(norm(t) === '1 image retrouvée dans « Symétrie ».', 'A1) En ouvrant « Fractions » : « 1 image retrouvée dans « Symétrie ». »', t)
  await q.waitForFunction(() => !!window.__app.pixels('photo')?.complete, null, { timeout: 10000 }).catch(() => {})
  await q.waitForTimeout(400)
  const banque = await q.evaluate(() => window.__app.tableau.doc.getMap('images').get('photo'))
  ok(banque === rougeData, '   … les données sont dans la banque de « Fractions » (les mêmes que « Symétrie »)')
  const c = await couleurImage(q)
  ok(rouge(c), '   … et les pixels sont peints : du rouge au centre de l\'image', c)
  // Un classeur dont rien ne manque : aucun message
  await toasts(q)
  const r = await ouvrir(ctx, '?classeur=' + sym, 'A-symetrie')
  await r.waitForTimeout(1200)
  const ts = await toasts(r)
  ok(!ts.some(x => /retrouvée|introuvable/.test(x)) && rouge(await couleurImage(r)), 'A2) « Symétrie », complet : rien n\'est dit, l\'image est peinte', ts)
  await ctx.close()
}

// =====================================================================
// B. UNE IMAGE INTROUVABLE : LE MESSAGE ET SON BOUTON
// =====================================================================
if (seul('B')) {
  console.log('\n=== B. Une image introuvable dans ce navigateur : le message, le bouton « Vérifier les classeurs… » ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'B')
  const rougeData = await p.evaluate(() => window.__carre('#e01010'))
  // « Symétrie » tient la seule copie ; effacé pour de bon (sa base part), « Fractions » ne la retrouvera nulle part
  const sym = await p.evaluate(d => window.__creer('Symétrie', [{ src: 'perdue', donnees: d }]), rougeData)
  const fra = await p.evaluate(() => window.__creer('Fractions', [{ src: 'perdue' }]))
  await p.evaluate(async id => { const f = await window.__registre.classeur(id); await window.__registre.modifierClasseur(id, x => { x.effacement = Date.now() }); await window.__effacerBase(f.base); await window.__registre.retirerClasseur(id, { siEffacement: f.effacement }).catch(() => {}) }, sym)
  const q = await ouvrir(ctx, '?classeur=' + fra, 'B-fractions')
  const t = await attendreToast(q, /introuvable/)
  ok(norm(t) === '1 image de ce classeur est introuvable dans ce navigateur.Vérifier les classeurs…', 'B1) « 1 image de ce classeur est introuvable dans ce navigateur. » [Vérifier les classeurs…]', t)
  const c = await couleurImage(q)
  ok(pale(c), '   … la case reste pâle (pas de pixels)', c)
  await q.click('.toast button.action'); await q.waitForTimeout(600)
  const f = await fenetre(q)
  ok((await q.evaluate(() => window.__bibliotheque.ouvert)) && f && f.titre === 'Vérifier les classeurs', 'B2) Le bouton ouvre la bibliothèque puis la fenêtre « Vérifier les classeurs »', f)
  await attendreFin(q)
  const f2 = await fenetre(q)
  ok(f2.etat === '2 classeurs vérifiés : 1 a des images qui manquent.' && f2.lignes.length === 1 && f2.lignes[0].detail === '1 image introuvable dans ce navigateur' && !f2.lignes[0].bouton
    && f2.lignes[0].aide === 'Pour la retrouver : ouvrez un fichier .memc plus ancien de ce classeur (Ouvrir…, ou Récupérer une sauvegarde du Drive…), puis vérifiez de nouveau.' && !f2.tout && f2.focus === 'fermer',
    '   … « 2 classeurs vérifiés : 1 a des images qui manquent. », la ligne sans bouton, le chemin pour la retrouver, le focus sur Fermer', f2)
  await q.keyboard.press('Escape'); await q.waitForTimeout(200)
  ok(!(await fenetre(q)), '   … Échap la ferme')
  // Une fois par chargement : redessiner ne redit rien
  await toasts(q)
  await q.evaluate(() => { window.__bibliotheque.fermer(); window.__app.rendu.toutRedessiner() }); await q.waitForTimeout(1500)
  ok(!(await toasts(q)).some(x => /introuvable/.test(x)), 'B3) Le message ne revient pas tant qu\'on ne recharge pas le classeur')
  await ctx.close()
}

// =====================================================================
// C. LA FENÊTRE « VÉRIFIER LES CLASSEURS »
// =====================================================================
if (seul('C')) {
  console.log('\n=== C. La fenêtre : l\'entrée ⋯, l\'état, la ligne, Réparer, Tout réparer, introuvable, illisible, rien à réparer ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'C')
  const rougeData = await p.evaluate(() => window.__carre('#e01010'))
  const d5 = await p.evaluate(() => window.__dossier('5ème'))
  const sym = await p.evaluate(d => window.__creer('Symétrie', [{ src: 'img-c', donnees: d }], { corbeille: true }), rougeData)
  const fra = await p.evaluate(d => window.__creer('Fractions', [{ src: 'img-c' }], { dossier: d }), d5)
  await ouvrirBiblio(p)
  const entrees = await ouvrirFenetre(p)
  const e = entrees?.find(x => x.action === 'verifier-classeurs')
  ok(e && e.texte === 'Vérifier les classeurs…' && norm(e.aide) === 'Les images qui manquent (un cadre gris sur une page), retrouvées dans les autres classeurs et remises à leur place.'
    && entrees.findIndex(x => x.action === 'enregistrer-bibliotheque') < entrees.indexOf(e), 'C1) ⋯ → « Vérifier les classeurs… » après « Enregistrer toute la bibliothèque… », avec son aide', entrees)
  let f = await fenetre(p)
  ok(f && f.titre === 'Vérifier les classeurs' && f.explication === 'Les images de chaque classeur sont rangées avec lui. Quand une image manque, la page montre un cadre gris. On la cherche dans les autres classeurs de ce navigateur, la corbeille comprise.',
    'C2) La fenêtre : son titre, son explication', f)
  await attendreFin(p)
  f = await fenetre(p)
  ok(f.etat === '3 classeurs vérifiés : 1 a des images qui manquent.', 'C3) « 3 classeurs vérifiés : 1 a des images qui manquent. » (la corbeille comptée)', f.etat)
  ok(f.lignes.length === 1 && f.lignes[0].id === fra && f.lignes[0].nom === 'Fractions — 5ème' && f.lignes[0].detail === '1 image manquante, retrouvée dans « Symétrie » (corbeille)'
    && f.lignes[0].bouton?.texte === 'Réparer' && f.lignes[0].bouton.h >= 44 && f.tout && !f.tout.gris && f.focus === 'reparer@' + fra,
    '   … la ligne « Fractions — 5ème / 1 image manquante, retrouvée dans « Symétrie » (corbeille) » [Réparer] (44 px), « Tout réparer », le focus sur Réparer', f)
  await p.click(`.v-ligne[data-id="${fra}"] .v-reparer`)
  await p.waitForFunction(id => document.querySelector(`.v-ligne[data-id="${id}"]`)?.classList.contains('reparee'), fra, { timeout: 15000 })
  await p.waitForTimeout(200)
  f = await fenetre(p)
  const t = await toasts(p)
  ok(f.lignes[0].detail === 'Réparé : 1 image remise.' && !f.lignes[0].bouton && !f.tout, 'C4) Réparer → « Réparé : 1 image remise. », le bouton s\'en va, plus de « Tout réparer »', f)
  ok(t.some(x => norm(x) === '1 image remise dans « Fractions » (depuis « Symétrie »).'), '   … « 1 image remise dans « Fractions » (depuis « Symétrie »). »', t)
  const b = await p.evaluate(id => window.__banque(id), fra)
  ok(b && b.presentes.includes('img-c'), '   … le classeur fermé a l\'image dans sa base', b)
  await p.click('.v-fermer'); await p.waitForTimeout(200)
  // Ouvert ensuite : l'image, et aucun message
  const q = await ouvrir(ctx, '?classeur=' + fra, 'C-fractions')
  await q.waitForFunction(() => !!window.__app.pixels('img-c')?.complete, null, { timeout: 10000 }).catch(() => {})
  await q.waitForTimeout(500)
  const tq = await toasts(q)
  ok(rouge(await couleurImage(q)) && !tq.some(x => /retrouvée|introuvable/.test(x)), 'C5) « Fractions » ouvert montre l\'image, sans message', tq)
  await q.close()
  // Tout réparer : deux classeurs ; une image introuvable ; un classeur illisible
  const equ = await p.evaluate(() => window.__creer('Équations', [{ src: 'img-c' }, { src: 'perdue' }]))
  const tha = await p.evaluate(() => window.__creer('Thalès', [{ src: 'img-c' }]))
  const abi = await p.evaluate(() => window.__creer('Abîmé', [{ src: 'img-c' }]))
  await p.evaluate(async id => { const f = await window.__registre.classeur(id); await window.__effacerBase(f.base) }, abi)
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(300)
  await ouvrirFenetre(p); await attendreFin(p)
  f = await fenetre(p)
  const lEqu = f.lignes.find(l => l.id === equ), lTha = f.lignes.find(l => l.id === tha), lAbi = f.lignes.find(l => l.id === abi)
  ok(f.etat === '6 classeurs vérifiés : 2 ont des images qui manquent. 1 n\'a pas pu être lu.' && f.lignes.length === 3 && f.lignes[2].id === abi,
    'C6) « 6 classeurs vérifiés : 2 ont des images qui manquent. 1 n\'a pas pu être lu. », trois lignes, l\'illisible en dernier', f)
  // « Fractions », réparé et visible, passe avant « Symétrie » (corbeille) comme source
  ok(lEqu && lEqu.detail === '2 images manquantes : 1 retrouvée dans « Fractions », 1 introuvable dans ce navigateur' && lEqu.bouton && lEqu.aide?.startsWith('Pour la retrouver'),
    '   … « Équations » : « 2 images manquantes : 1 retrouvée dans « Fractions », 1 introuvable dans ce navigateur » [Réparer], le chemin (le classeur visible avant la corbeille)', lEqu)
  ok(lTha && lTha.detail === '1 image manquante, retrouvée dans « Fractions »' && lTha.bouton, '   … « Thalès » : « 1 image manquante, retrouvée dans « Fractions » » [Réparer]', lTha)
  ok(lAbi && lAbi.detail === 'Ce classeur n\'a pas pu être lu.' && !lAbi.bouton && lAbi.illisible, '   … « Abîmé » : « Ce classeur n\'a pas pu être lu. », sans bouton', lAbi)
  await p.click('.v-tout')
  await p.waitForFunction(() => document.querySelectorAll('.v-ligne.reparee').length === 2, null, { timeout: 20000 })
  await p.waitForTimeout(200)
  f = await fenetre(p)
  ok(f.lignes.find(l => l.id === equ).detail === 'Réparé : 1 image remise, 1 reste introuvable.' && f.lignes.find(l => l.id === tha).detail === 'Réparé : 1 image remise.' && !f.tout,
    'C7) « Tout réparer » : « Réparé : 1 image remise, 1 reste introuvable. » et « Réparé : 1 image remise. »', f.lignes)
  const bE = await p.evaluate(id => window.__banque(id), equ), bT = await p.evaluate(id => window.__banque(id), tha)
  ok(bE.presentes.includes('img-c') && !bE.presentes.includes('perdue') && bT.presentes.includes('img-c'), '   … les deux bases ont reçu l\'image (jamais « perdue »)', { bE, bT })
  await p.click('.v-fermer'); await p.waitForTimeout(200)
  // Rien de plus à réparer : l'état le dit, la liste reste cachée
  await ouvrirFenetre(p); await attendreFin(p)
  f = await fenetre(p)
  ok(f.etat === '6 classeurs vérifiés : 1 a des images qui manquent. 1 n\'a pas pu être lu.' && f.lignes.length === 2 && !f.lignes.some(l => l.bouton) && !f.tout && f.focus === 'fermer',
    'C8) Vérifié de nouveau : ce qui reste (l\'introuvable, l\'illisible), sans bouton, le focus sur Fermer', f)
  await p.click('.v-fermer'); await p.waitForTimeout(200)
  // Une bibliothèque sans aucun manque
  await p.evaluate(async ids => { for (const id of ids) { const f = await window.__registre.classeur(id); await window.__registre.modifierClasseur(id, x => { x.effacement = Date.now() }); await window.__effacerBase(f.base); await window.__registre.retirerClasseur(id, { siEffacement: f.effacement }).catch(() => {}) } }, [equ, abi])
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(300)
  await ouvrirFenetre(p); await attendreFin(p)
  f = await fenetre(p)
  ok(f.etat === '4 classeurs vérifiés : aucune image ne manque.' && f.listeCachee && !f.tout && f.focus === 'fermer', 'C9) Rien ne manque : « 4 classeurs vérifiés : aucune image ne manque. », la liste cachée, seul « Fermer »', f)
  await p.click('.v-fermer')
  await ctx.close()
}

// =====================================================================
// D. VIDER LA CORBEILLE, SUPPRIMER DÉFINITIVEMENT : LA RECOPIE D'ABORD
// =====================================================================
if (seul('D')) {
  console.log('\n=== D. Vider la corbeille et Supprimer définitivement : les dernières copies recopiées d\'abord ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'D')
  const rougeData = await p.evaluate(() => window.__carre('#e01010'))
  const bleuData = await p.evaluate(() => window.__carre('#1030e0'))
  const sym = await p.evaluate(d => window.__creer('Symétrie', [{ src: 'img-d', donnees: d }], { corbeille: true }), rougeData)
  const equ = await p.evaluate(() => window.__creer('Équations', [{ src: 'img-d' }]))
  await ouvrirBiblio(p)
  await ouvrirCorbeille(p)
  await p.click('[data-action="vider-corbeille"]')
  let d = await attendreDialogue(p)
  ok(d?.titre === 'Vider la corbeille ?' && d.textes[0] === '1 classeur (1 page) sera effacé de ce navigateur. Ce n\'est pas annulable.' && d.textes[1] === 'Dont 1 qui n\'a jamais été enregistré dans un fichier.'
    && d.textes[2] === '1 image que « Équations » montre encore n\'existe que dans la corbeille : elle sera d\'abord recopiée dans ce classeur.' && d.focus === 'annuler',
    'D1) « Vider la corbeille ? … », « Dont 1… », « 1 image que « Équations » montre encore n\'existe que dans la corbeille : elle sera d\'abord recopiée dans ce classeur. »', d)
  await toasts(p)
  await p.click('dialog[open] [data-a="oui"]')
  let t = await attendreToast(p, /Corbeille vidée/)
  ok(norm(t) === 'Corbeille vidée (1 classeur). 1 image recopiée dans « Équations ».', 'D2) « Corbeille vidée (1 classeur). 1 image recopiée dans « Équations ». »', t)
  await p.waitForTimeout(500)
  let b = await p.evaluate(id => window.__banque(id), equ)
  ok(b.presentes.includes('img-d') && !(await fiche(p, sym)), '   … « Équations » a l\'image dans sa banque, « Symétrie » est effacé', b)
  // Supprimer définitivement : le même garde-fou
  const sym2 = await p.evaluate(d => window.__creer('Symétrie 2', [{ src: 'img-d2', donnees: d }], { corbeille: true }), bleuData)
  const tha = await p.evaluate(() => window.__creer('Thalès', [{ src: 'img-d2' }]))
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(300)
  await p.click(`${carteCorbeille(sym2)} [data-action="supprimer-definitivement"]`)
  d = await attendreDialogue(p)
  ok(d?.titre === 'Supprimer définitivement « Symétrie 2 » ?' && d.textes.some(x => x === '1 image que « Thalès » montre encore n\'existe que dans la corbeille : elle sera d\'abord recopiée dans ce classeur.'),
    'D3) « Supprimer définitivement « Symétrie 2 » ? » porte le même paragraphe', d)
  await toasts(p)
  await p.click('dialog[open] [data-a="oui"]')
  t = await attendreToast(p, /supprimé définitivement/)
  ok(norm(t) === '« Symétrie 2 » supprimé définitivement. 1 image recopiée dans « Thalès ».', 'D4) « « Symétrie 2 » supprimé définitivement. 1 image recopiée dans « Thalès ». »', t)
  await p.waitForTimeout(400)
  b = await p.evaluate(id => window.__banque(id), tha)
  ok(b.presentes.includes('img-d2'), '   … « Thalès » a l\'image', b)
  // Une recopie qui échoue (le classeur a changé entre-temps) : rien n'est effacé de ce classeur-là, les autres oui
  const sym3 = await p.evaluate(d => window.__creer('Symétrie 3', [{ src: 'img-d3', donnees: d }], { corbeille: true }), rougeData)
  const seul2 = await p.evaluate(() => window.__creer('Seul', [], { corbeille: true }))
  const pyt = await p.evaluate(() => window.__creer('Pythagore', [{ src: 'img-d3' }]))
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(300)
  await p.evaluate(() => {
    const f = window.__fichiers, ancien = f.ecrireUnClasseur.bind(f)
    window.__retablir = () => { f.ecrireUnClasseur = ancien }
    f.ecrireUnClasseur = async (F, tab, o) => { o?.dire?.(`« ${F.nom} » a changé pendant ce temps : rien n'a été modifié. Recommencez.`); return false }
  })
  await p.click('[data-action="vider-corbeille"]')
  d = await attendreDialogue(p)
  ok(d?.textes.some(x => x === '1 image que « Pythagore » montre encore n\'existe que dans la corbeille : elle sera d\'abord recopiée dans ce classeur.'), 'D5) Deux classeurs à vider, une image à recopier dans « Pythagore »', d)
  await toasts(p)
  await p.click('dialog[open] [data-a="oui"]')
  t = await attendreToast(p, /Corbeille vidée|n'a pas été effacé/)
  ok(norm(t) === 'Corbeille vidée (1 classeur). « Symétrie 3 » n\'a pas été effacé : ses images n\'ont pas pu être recopiées dans « Pythagore ». Recommencez.',
    'D6) La recopie échoue : « Corbeille vidée (1 classeur). « Symétrie 3 » n\'a pas été effacé : ses images n\'ont pas pu être recopiées dans « Pythagore ». Recommencez. »', t)
  await p.waitForTimeout(500)
  const f3 = await fiche(p, sym3)
  ok(f3 && f3.corbeille && f3.effacement == null && !(await fiche(p, seul2)) && !(await p.evaluate(id => window.__banque(id), pyt)).presentes.includes('img-d3'),
    '   … « Symétrie 3 » reste dans la corbeille, « Seul » est effacé, « Pythagore » n\'a pas l\'image', f3)
  await p.evaluate(() => window.__retablir())
  // Recommencer : ça marche
  await p.click('[data-action="vider-corbeille"]')
  await attendreDialogue(p)
  await toasts(p)
  await p.click('dialog[open] [data-a="oui"]')
  t = await attendreToast(p, /Corbeille vidée/)
  ok(norm(t) === 'Corbeille vidée (1 classeur). 1 image recopiée dans « Pythagore ».', 'D7) Recommencer : « Corbeille vidée (1 classeur). 1 image recopiée dans « Pythagore ». »', t)
  await p.waitForTimeout(400)
  // Une base illisible dans la corbeille : « n'a pas pu être vérifié », effacée quand même ; et aucune image concernée : la question inchangée
  const vieux = await p.evaluate(() => window.__creer('Vieux chapitre', [], { corbeille: true }))
  const vide = await p.evaluate(() => window.__creer('Sans image', [], { corbeille: true }))
  await p.evaluate(async id => { const f = await window.__registre.classeur(id); await window.__effacerBase(f.base) }, vieux)
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(300)
  await p.click('[data-action="vider-corbeille"]')
  d = await attendreDialogue(p)
  ok(d?.textes.length === 3 && d.textes[2] === '« Vieux chapitre » n\'a pas pu être vérifié.' && !d.textes.some(x => /recopiée/.test(x)),
    'D8) Une base illisible : « « Vieux chapitre » n\'a pas pu être vérifié. », et rien sur les images (aucune concernée)', d)
  await toasts(p)
  await p.click('dialog[open] [data-a="oui"]')
  t = await attendreToast(p, /Corbeille vidée/)
  await p.waitForTimeout(600)
  ok(/^Corbeille vidée \(2 classeurs\)\./.test(norm(t)) && !(await fiche(p, vieux)) && !(await fiche(p, vide)), '   … effacés quand même : « Corbeille vidée (2 classeurs). »', t)
  await ctx.close()
}

// =====================================================================
// E. LE CLASSEUR OUVERT DANS UN AUTRE ONGLET PENDANT RÉPARER
// =====================================================================
if (seul('E')) {
  console.log('\n=== E. Réparer un classeur ouvert dans un autre onglet : l\'onglet se recharge et voit l\'image ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'E')
  const rougeData = await p.evaluate(() => window.__carre('#e01010'))
  // « Symétrie » a l'image, mais à la corbeille : l'autre onglet ne la retrouve
  // pas tout seul… si : la corbeille compte. On cache la copie le temps
  // d'ouvrir l'onglet : le classeur source est créé APRÈS l'ouverture.
  const fra = await p.evaluate(() => window.__creer('Fractions', [{ src: 'img-e' }]))
  const q = await ouvrir(ctx, '?classeur=' + fra, 'E-fractions')
  await attendreToast(q, /introuvable/)
  ok(pale(await couleurImage(q)), 'E1) L\'autre onglet montre « Fractions » avec sa case pâle')
  await p.evaluate(d => window.__creer('Symétrie', [{ src: 'img-e', donnees: d }]), rougeData)
  await ouvrirBiblio(p)
  await ouvrirFenetre(p); await attendreFin(p)
  let f = await fenetre(p)
  ok(f.lignes.length === 1 && f.lignes[0].id === fra && f.lignes[0].bouton, 'E2) La fenêtre de la bibliothèque liste « Fractions »', f)
  await p.click(`.v-ligne[data-id="${fra}"] .v-reparer`)
  await p.waitForFunction(id => document.querySelector(`.v-ligne[data-id="${id}"]`)?.classList.contains('reparee'), fra, { timeout: 15000 })
  f = await fenetre(p)
  ok(f.lignes[0].detail === 'Réparé : 1 image remise.', 'E3) Réparé depuis la bibliothèque (l\'autre onglet est prévenu)', f)
  const dq = await attendreDialogue(q)
  ok(dq?.titre === 'Le classeur a changé' && /remplacé dans un autre onglet/.test(dq.textes[0]), '   … l\'autre onglet : « Le classeur a changé » [Recharger]', dq)
  await q.click('dialog[open] .actions button')
  await pret(q); await q.waitForTimeout(500)
  await q.waitForFunction(() => !!window.__app.pixels('img-e')?.complete, null, { timeout: 10000 }).catch(() => {})
  await q.waitForTimeout(400)
  ok(rouge(await couleurImage(q)), 'E4) Rechargé, il voit l\'image')
  await ctx.close()
}

// =====================================================================
// F. LE TÉLÉPHONE ET LE CLAVIER
// =====================================================================
if (seul('F')) {
  console.log('\n=== F. Le téléphone (390 × 844) : la fenêtre pleine largeur, 44 px empilés ; le clavier ===')
  const ctx = await contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const p = await ouvrir(ctx, '', 'F')
  const rougeData = await p.evaluate(() => window.__carre('#e01010'))
  await p.evaluate(d => window.__creer('Symétrie', [{ src: 'img-f', donnees: d }], { corbeille: true }), rougeData)
  const fra = await p.evaluate(() => window.__creer('Fractions', [{ src: 'img-f' }]))
  await ouvrirBiblio(p)
  await ouvrirFenetre(p); await attendreFin(p)
  let f = await fenetre(p)
  const l = f.lignes[0]
  // (le navigateur borne lui-même une fenêtre modale à l'écran moins 2 em : 354 px sur 390)
  ok(f.largeur >= 390 - 40 && Math.abs(f.gauche - f.droite) <= 2 && !f.defile && l.bouton.h >= 44 && l.bouton.l >= l.l - 12 && f.fermer.h >= 42 && f.tout.h >= 42,
    'F1) La fenêtre prend la largeur, centrée, sans défilement de côté ; « Réparer » fait 44 px et toute la largeur de la ligne', { largeur: f.largeur, gauche: f.gauche, droite: f.droite, defile: f.defile, bouton: l.bouton, ligne: l.l })
  await p.tap(`.v-ligne[data-id="${fra}"] .v-reparer`)
  await p.waitForFunction(id => document.querySelector(`.v-ligne[data-id="${id}"]`)?.classList.contains('reparee'), fra, { timeout: 15000 })
  ok((await fenetre(p)).lignes[0].detail === 'Réparé : 1 image remise.', '   … Réparer au doigt')
  await p.tap('.v-fermer'); await p.waitForTimeout(200)
  await ctx.close()
  // Le clavier, au PC
  const ctx2 = await contexte()
  const q = await ouvrir(ctx2, '', 'F2')
  await q.evaluate(d => window.__creer('Symétrie', [{ src: 'img-f' }, { src: 'img-g', donnees: d }], { corbeille: true }), rougeData)
  const a = await q.evaluate(() => window.__creer('Fractions', [{ src: 'img-g' }]))
  const b = await q.evaluate(() => window.__creer('Équations', [{ src: 'img-g' }], { modifie: Date.now() - 1200e3 }))
  await ouvrirBiblio(q)
  await ouvrirFenetre(q); await attendreFin(q)
  f = await fenetre(q)
  const ordre = [f.focus]
  for (let i = 0; i < 3; i++) { await q.keyboard.press('Tab'); ordre.push((await fenetre(q)).focus) }
  ok(ordre.join(' ') === `reparer@${a} reparer@${b} tout fermer`, 'F3) Tab : de « Réparer » en « Réparer », puis « Tout réparer », « Fermer »', ordre)
  await q.keyboard.press('Shift+Tab'); await q.keyboard.press('Shift+Tab'); await q.keyboard.press('Shift+Tab')
  await q.keyboard.press('Enter')
  await q.waitForFunction(id => document.querySelector(`.v-ligne[data-id="${id}"]`)?.classList.contains('reparee'), a, { timeout: 15000 })
  f = await fenetre(q)
  ok(f.lignes.find(l => l.id === a).detail === 'Réparé : 1 image remise.' && f.focus === 'reparer@' + b, '   … Entrée répare « Fractions », le focus passe au « Réparer » suivant', f)
  await q.keyboard.press('Escape'); await q.waitForTimeout(200)
  ok(!(await fenetre(q)), '   … Échap ferme')
  await ctx2.close()
}

// =====================================================================
// G. LA VERSION HORS LIGNE (file://)
// =====================================================================
if (seul('G')) {
  console.log('\n=== G. La version hors ligne (file://) : identique, sans réseau ===')
  const UN = R + '/dist/index.html'
  if (!existsSync(UN)) ok(false, 'G0) dist/index.html manque : npm run build d\'abord')
  else {
    // Les états des classeurs sont fabriqués sur le serveur de développement
    // (les modules du code y sont importables), puis rangés dans les bases
    // de la page file:// par IndexedDB directement (les mêmes magasins que
    // bases.creerBase et le registre)
    const ctx0 = await contexte()
    const p0 = await ouvrir(ctx0, '', 'G-dev')
    const rougeData = await p0.evaluate(() => window.__carre('#e01010'))
    const etats = await p0.evaluate(async d => ({
      sym: Array.from(await window.__etatAvecImages([{ src: 'img-g', donnees: d }])),
      fra: Array.from(await window.__etatAvecImages([{ src: 'img-g' }])),
    }), rougeData)
    await ctx0.close()
    const ctx = await contexte()
    await ctx.route(/^https?:\/\//, r => r.abort())
    const p = await ctx.newPage(); suivre(p, 'G')
    await p.goto('file://' + UN)
    await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
    await p.waitForTimeout(800)
    const ids = await p.evaluate(async etats => {
      const id = () => Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('')
      const ouvrirIdb = (nom, maj) => new Promise((ok, ko) => { const r = indexedDB.open(nom); r.onupgradeneeded = () => maj?.(r.result); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
      const fin = t => new Promise((ok, ko) => { t.oncomplete = () => ok(); t.onabort = t.onerror = () => ko(t.error) })
      const creer = async (nom, etat, corbeille) => {
        const i = id(), base = 'mem-teachingtool-classeur-' + i
        const db = await ouvrirIdb(base, d => { d.createObjectStore('updates', { autoIncrement: true }); d.createObjectStore('custom') })
        const t = db.transaction(['updates', 'custom'], 'readwrite')
        t.objectStore('updates').add(new Uint8Array(etat)); t.objectStore('custom').put({ id: i, nom }, 'mem-classeur')
        await fin(t); db.close()
        const idx = await ouvrirIdb('mem-teachingtool-bibliotheque')
        const T = Date.now()
        const fiche = { id: i, base, nom, dossier: null, etiquettes: [], cree: T - 3600e3, modifie: T - 600e3, ouvert: 0, pages: 1, ...(corbeille ? { corbeille: { t: T - 60e3 } } : {}) }
        const t2 = idx.transaction(['classeurs'], 'readwrite'); t2.objectStore('classeurs').put(fiche); await fin(t2); idx.close()
        return i
      }
      return { sym: await creer('Symétrie', etats.sym, true), fra: await creer('Fractions', etats.fra, false) }
    }, etats)
    await p.reload()
    await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
    await p.waitForTimeout(800)
    await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]')
    await p.waitForFunction(() => !document.querySelector('.bibliotheque').hidden && document.querySelectorAll('.grille-classeurs li').length > 0, null, { timeout: 10000 })
    await p.waitForTimeout(400)
    await menuBandeau(p)
    await p.click('.menu-flottant:not([hidden]) [data-action="verifier-classeurs"]')
    await p.waitForSelector('dialog.dialogue-verification[open]')
    await attendreFin(p)
    let f = await fenetre(p)
    ok(f.etat === '3 classeurs vérifiés : 1 a des images qui manquent.' && f.lignes.length === 1 && f.lignes[0].id === ids.fra && f.lignes[0].detail === '1 image manquante, retrouvée dans « Symétrie » (corbeille)',
      'G1) En file:// : « 3 classeurs vérifiés : 1 a des images qui manquent. », la ligne de « Fractions »', f)
    await p.click(`.v-ligne[data-id="${ids.fra}"] .v-reparer`)
    await p.waitForFunction(id => document.querySelector(`.v-ligne[data-id="${id}"]`)?.classList.contains('reparee'), ids.fra, { timeout: 15000 })
    f = await fenetre(p)
    const t = await toasts(p)
    ok(f.lignes[0].detail === 'Réparé : 1 image remise.' && t.some(x => norm(x) === '1 image remise dans « Fractions » (depuis « Symétrie »).'), '   … Réparer : « Réparé : 1 image remise. », le message', { f, t })
    // La base de « Fractions » a bien l'image (lue par IndexedDB directement)
    const a = await p.evaluate(async id => {
      const db = await new Promise((ok, ko) => { const r = indexedDB.open('mem-teachingtool-classeur-' + id); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
      const n = await new Promise(ok => { const r = db.transaction(['updates']).objectStore('updates').count(); r.onsuccess = () => ok(r.result) })
      db.close(); return n
    }, ids.fra)
    ok(a >= 2, '   … sa base a reçu une mise à jour de plus', a)
    await p.click('.v-fermer'); await p.waitForTimeout(200)
    // Ouvert : l'image est peinte (la version construite n'expose pas l'application : on regarde la page)
    await p.click(`.grille-classeurs li[data-cle="${ids.fra}"] a, .grille-classeurs li[data-cle="${ids.fra}"]`)
    await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && location.search.includes('classeur='), null, { timeout: 15000 })
    await p.waitForTimeout(1200)
    const couleur = await p.evaluate(() => {
      // La version construite n'expose pas la caméra : on cherche du rouge sur toute la scène (l'image fait 40 × 40)
      const c = document.querySelector('.couche-scene'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
      for (let y = 0; y < c.height; y += 6) for (let x = 0; x < c.width; x += 6) { const i = (y * c.width + x) * 4; if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] < 60) return [x, y, d[i], d[i + 1], d[i + 2]] }
      return null
    })
    ok(!!couleur, 'G2) « Fractions » ouvert en file:// montre l\'image (du rouge peint)', couleur)
    await ctx.close()
  }
}

// =====================================================================
// M. UNE MESURE : UNE DIZAINE DE CLASSEURS AVEC DES PHOTOS
// =====================================================================
if (seul('M')) {
  console.log('\n=== M. Mesure : la vérification d\'une bibliothèque d\'une dizaine de classeurs avec des photos ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'M')
  const n = await p.evaluate(async () => {
    const photos = [window.__photo(), window.__photo(), window.__photo()]
    let octets = 0
    for (let i = 0; i < 10; i++) {
      const images = photos.map((d, k) => ({ src: `photo-${i}-${k}`, donnees: d }))
      if (i === 3) images.push({ src: 'photo-0-1' })
      if (i === 7) images.push({ src: 'photo-2-0' }, { src: 'nulle-part' })
      await window.__creer('Chapitre ' + (i + 1), images)
      octets += photos.reduce((a, d) => a + d.length, 0)
    }
    return { classeurs: 10, octets }
  })
  await ouvrirBiblio(p)
  const mesure = async () => p.evaluate(async () => {
    const t0 = performance.now()
    const inv = await window.__bibliotheque.verification.inventaires()
    return { ms: Math.round(performance.now() - t0), classeurs: inv.length }
  })
  const m1 = await mesure(), m2 = await mesure()
  console.log(`   ${n.classeurs} classeurs avec 3 photos chacun (${Math.round(n.octets / 1024)} Ko d'images en tout) : première vérification ${m1.ms} ms (${m1.classeurs} classeurs lus), la seconde (gardée) ${m2.ms} ms`)
  ok(m1.classeurs === 11 && m2.ms <= m1.ms, 'M1) La vérification lit les 11 classeurs ; la seconde ne relit pas ceux qui n\'ont pas changé', { m1, m2 })
  await ouvrirFenetre(p); await attendreFin(p)
  const f = await fenetre(p)
  ok(f.etat === '11 classeurs vérifiés : 2 ont des images qui manquent.' && f.lignes.length === 2, 'M2) La fenêtre : « 11 classeurs vérifiés : 2 ont des images qui manquent. »', f.etat)
  const t0 = Date.now()
  await p.click('.v-tout')
  await p.waitForFunction(() => document.querySelectorAll('.v-ligne.reparee').length === 2, null, { timeout: 30000 })
  console.log(`   « Tout réparer » (deux classeurs fermés, une photo chacun) : ${Date.now() - t0} ms`)
  await ctx.close()
}

await nav.close()
const autres = erreurs.filter(e => !/WebSocket|\[vite\]/.test(e))
ok(!autres.length, `Aucune erreur JS (${autres.length})`, autres.slice(0, 10))
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
