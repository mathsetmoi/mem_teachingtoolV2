// Lot 4, corrections « appareils » : les six défauts du rapport de
// vérification, chacun refait tel qu'il a été trouvé.
//   A. Espace après la bibliothèque : le focus rendu au bouton du classeur
//      ne garde Espace que s'il est venu du clavier (souris, plume, Échap
//      après un clic : Espace + glisser déplace la vue, n'écrit rien) ;
//      au clavier, Espace ouvre toujours la bibliothèque.
//   B. Au téléphone, le bandeau de la sauvegarde ne passe plus sous la barre
//      des outils (360 × 640, 390 × 844, 412 × 915, 430 × 932).
//   C. Le texte court de l'état n'est jamais coupé dans la forme large
//      (1180 × 820, 1112 × 834 : l'icône et le point ; 1194 × 834 : entier ;
//      depuis le lot 5, K8, la barre du haut plus étroite : 1060 × 800,
//      1000 × 800 l'icône et le point ; 1112, 1180, 1194 : entier).
//   D. Un appui dans la marge intérieure des fenêtres « Nouveau classeur » et
//      « Nouveau dossier » (souris, doigt) ne les ferme pas ; sur le fond, si.
//   E. Au démarrage revient le classeur où l'on a écrit en dernier, pas celui
//      regardé un instant dans un autre onglet (Ctrl + clic).
//   F. Au doigt, la poignée ⋮⋮ ne recouvre plus « Pas encore d'aperçu ».
// Lancer : node lot4/corrections-appareils.mjs [A B …] (BASE=http://… pour
// une autre version, par exemple celle d'avant les corrections)
import { chromium } from '../commun/playwright.mjs'

const BASE = process.env.BASE || 'http://localhost:5173/'
const parties = process.argv.slice(2)
const seul = x => !parties.length || parties.includes(x)
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function ouvrir(o = {}, nom = 'p') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(BASE); await pret(p); await p.waitForTimeout(300)
  return { ctx, p }
}
const ecrireTraits = (p, n) => p.evaluate(async n => {
  const t = window.__app.tableau, page = t.ordre.get(0)
  t.nouveauGeste()
  t.doc.transact(() => {
    for (let i = 0; i < n; i++) {
      const pts = []; for (let k = 0; k < 40; k++) pts.push(k * 6, Math.sin(k / 3) * 20, 0.5)
      t.poser(page, { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x: (i % 10) * 40, y: Math.floor(i / 10) * 40, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
    }
  })
  await t.attendreEcritures()
}, n)
const creerClasseur = (p, nom) => p.evaluate(async nom => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), T = Date.now(), id = dem.idClasseur()
  await window.__registre.creerClasseur({ id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: T - 3600e3, modifie: T - 600e3, ouvert: T - 60e3, pages: 1 }, b => bases.creerBase(b, etat, { id, nom }))
  return id
}, nom)
const ouvrirBiblio = async p => { await p.click('.bouton-classeur'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(400) }
const cam = p => p.evaluate(() => [window.__app.cam.x, window.__app.cam.y])
const formes = p => p.evaluate(() => window.__app.formes.length)
const biblioOuverte = p => p.evaluate(() => !document.querySelector('.bibliotheque').hidden)
const focusSur = p => p.evaluate(() => document.activeElement?.className || '(page)')

// =====================================================================
// A. ESPACE APRÈS LA BIBLIOTHÈQUE
// =====================================================================
if (seul('A')) {
  console.log('\n=== A. Espace après la bibliothèque ===')
  /** Espace tenu, puis glisser à la souris (ou à la plume) au milieu de la page */
  const espaceGlisser = async (p, plume) => {
    const c0 = await cam(p), f0 = await formes(p)
    await p.keyboard.down(' ')
    if (plume) {
      const cdp = await p.context().newCDPSession(p)
      const ev = (type, x, y, buttons) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: type === 'mouseMoved' ? 'none' : 'left', buttons, clickCount: 1, force: 0.5 })
      await ev('mouseMoved', 700, 400, 0); await ev('mousePressed', 700, 400, 1)
      for (let i = 1; i <= 10; i++) await ev('mouseMoved', 700 + i * 15, 400 + i * 10, 1)
      await ev('mouseReleased', 850, 500, 0)
    } else {
      await p.mouse.move(700, 400); await p.mouse.down()
      for (let i = 1; i <= 10; i++) await p.mouse.move(700 + i * 15, 400 + i * 10)
      await p.mouse.up()
    }
    await p.keyboard.up(' '); await dort(500)
    const c1 = await cam(p), f1 = await formes(p)
    return { deplace: c1[0] !== c0[0] || c1[1] !== c0[1], ecrit: f1 - f0, biblio: await biblioOuverte(p), c0, c1 }
  }
  for (const [fermeture, plume] of [['×', false], ['Échap', false], ['la carte ouverte', false], ['×', true]]) {
    const { ctx, p } = await ouvrir({}, 'A')
    await ecrireTraits(p, 3)
    await ouvrirBiblio(p)
    if (fermeture === '×') await p.click('.biblio-fermer')
    else if (fermeture === 'Échap') await p.keyboard.press('Escape')
    else { const id = await p.evaluate(() => window.__app.classeur.id); await p.click(`.grille-classeurs.tous li[data-cle="${id}"] .carte-apercu`) }
    await dort(500)
    const focus = await focusSur(p)
    const r = await espaceGlisser(p, plume)
    ok(focus.includes('bouton-classeur') && r.deplace && r.ecrit === 0 && !r.biblio,
      `Ouverte d'un clic, fermée par ${fermeture} (le focus revient au bouton du classeur) : Espace + glisser ${plume ? 'à la plume' : 'à la souris'} déplace la vue, n'écrit rien`, { focus, ...r })
    await ctx.close()
  }
  {
    const { ctx, p } = await ouvrir({}, 'A2')
    await ouvrirBiblio(p)
    await p.click('.biblio-fermer'); await dort(400)
    await p.keyboard.press(' '); await dort(500)
    ok(!(await biblioOuverte(p)), 'Après × à la souris, Espace seul ne rouvre pas la bibliothèque')
    // Au clavier : Tab jusqu'au bouton, Espace l'ouvre ; Échap ; Espace la rouvre (tout au clavier)
    await p.evaluate(() => document.querySelector('.bouton-classeur').blur())
    await p.focus('.bouton-classeur'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab')
    await p.keyboard.press(' '); await dort(500)
    const a = await biblioOuverte(p)
    await p.keyboard.press('Escape'); await dort(300)
    const f = await focusSur(p)
    await p.keyboard.press(' '); await dort(500)
    const b = await biblioOuverte(p)
    ok(a && f.includes('bouton-classeur') && b, 'Au clavier : Espace sur le bouton du classeur ouvre la bibliothèque ; Échap rend le focus au bouton ; Espace la rouvre', { a, f, b })
    await p.keyboard.press('Escape'); await dort(300)
    // Ouverte au clavier, fermée d'un clic sur × : Espace + glisser revient à l'application
    await p.keyboard.press(' '); await dort(500)
    await p.click('.biblio-fermer'); await dort(400)
    const r = await espaceGlisser(p, false)
    ok(r.deplace && r.ecrit === 0 && !r.biblio, 'Ouverte au clavier, fermée d\'un clic sur × : Espace + glisser déplace la vue', r)
    // Le focus venu du clavier, puis un appui sur la page : Espace + glisser à l'application
    await p.focus('.bouton-classeur'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab')
    await p.mouse.click(1000, 600); await dort(200)
    const r2 = await espaceGlisser(p, false)
    ok(r2.deplace && !r2.biblio, 'Tab jusqu\'au bouton, puis un appui sur la page : Espace + glisser déplace la vue', { ...r2, focus: await focusSur(p) })
    await ctx.close()
  }
}

// =====================================================================
// B. LE BANDEAU AU TÉLÉPHONE
// =====================================================================
if (seul('B')) {
  console.log('\n=== B. le bandeau au téléphone ===')
  const MIN = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`
  const GEO = () => {
    const b = document.querySelector('.bandeau-sauvegarde')
    if (b.hidden) return null
    const rb = b.getBoundingClientRect(), croise = []
    for (const sel of ['.barre-outils', '.barre-haut', '.barre-zoom', '.barre-classeur']) {
      const e = document.querySelector(sel)
      if (!e || e.hidden || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') continue
      const r = e.getBoundingClientRect()
      const x = Math.min(r.right, rb.right) - Math.max(r.left, rb.left), y = Math.min(r.bottom, rb.bottom) - Math.max(r.top, rb.top)
      if (x > 0.5 && y > 0.5) croise.push(`${sel} ${Math.round(x)}×${Math.round(y)}`)
    }
    // Le début du texte et des boutons : ce qu'on voit en ce point, c'est le bandeau
    const t = b.querySelector('.texte-bandeau').getBoundingClientRect(), bt = b.querySelector('.bouton-bandeau')?.getBoundingClientRect()
    const dessus = [[t.left + 2, t.top + 6], ...(bt ? [[bt.left + 4, bt.top + bt.height / 2]] : [])].map(([x, y]) => b.contains(document.elementFromPoint(x, y)))
    return { raison: b.dataset.raison, r: [Math.round(rb.left), Math.round(rb.top), Math.round(rb.right), Math.round(rb.bottom)], croise, dessus, dansEcran: rb.left >= 0 && rb.right <= innerWidth && rb.bottom <= innerHeight }
  }
  for (const [w, h] of [[360, 640], [390, 844], [412, 915], [430, 932], [1366, 768]]) {
    for (const drive of ['defaut', 'aucune']) {
      const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 })
      // Pas de clé (iPhone, iPad, Android) : le bandeau de la connexion Google, ou le rappel
      await ctx.addInitScript(() => { for (const k of ['showSaveFilePicker', 'showOpenFilePicker']) { try { delete window[k] } catch { /* */ } window[k] = undefined } })
      const p = await ctx.newPage(); suivre(p, 'B')
      await p.clock.install()
      await p.goto(BASE); await pret(p); await p.waitForTimeout(400)
      if (drive === 'aucune') await p.evaluate(async () => { await window.__drive?.choisir('aucune') })
      await ecrireTraits(p, 1)
      await p.clock.fastForward(MIN(21))
      await ecrireTraits(p, 1)
      await p.clock.fastForward('02:31'); await p.waitForTimeout(400)
      const g = await p.evaluate(GEO)
      ok(g && g.croise.length === 0 && g.dessus.every(Boolean) && g.dansEcran, `${w} × ${h} (Drive ${drive}) : le bandeau « ${g?.raison} » ne croise aucune barre, son texte et son bouton se voient dès leur début`, g)
      await ctx.close()
    }
  }
}

// =====================================================================
// C. LE TEXTE COURT DE L'ÉTAT, JAMAIS COUPÉ
// =====================================================================
if (seul('C')) {
  console.log('\n=== C. le texte court de l\'état ===')
  // (Lot 5, K8 : la barre du haut a 115 px de moins (le bouton du fond au
  // lieu de la liste déroulante) ; à 1180 × 820 et 1112 × 834, l'état tient
  // désormais entier : la forme large ; l'icône et le point viennent sous
  // 1080 px environ, essayés à 1060 × 800 et 1000 × 800. Adapté volontairement.)
  for (const [w, h, forme] of [[1060, 800, 'etroit'], [1000, 800, 'etroit'], [1180, 820, 'large'], [1112, 834, 'large'], [1194, 834, 'large'], [1366, 768, 'large'], [1280, 720, 'large']]) {
    const { ctx, p } = await ouvrir({ viewport: { width: w, height: h }, hasTouch: w < 1300 }, 'C')
    await p.evaluate(() => document.fonts.ready); await dort(300)
    const g = await p.evaluate(() => {
      const e = document.querySelector('.etat-classeur')
      return { forme: window.__app.ui.formeClasseur, etat: e.textContent, coupe: e.scrollWidth > e.clientWidth + 1, point: !document.querySelector('.bouton-classeur .point-etat').hidden, titre: document.querySelector('.bouton-classeur').getAttribute('aria-describedby') }
    })
    ok(g.forme === forme && (g.forme !== 'large' || !g.coupe) && g.etat === 'Seulement dans ce navigateur',
      `${w} × ${h} : ${forme === 'large' ? 'le nom et l\'état « Seulement dans ce navigateur », entier' : 'l\'icône et le point (l\'état n\'y tiendrait pas entier)'}`, g)
    await ctx.close()
  }
}

// =====================================================================
// D. LA MARGE DES FENÊTRES
// =====================================================================
if (seul('D')) {
  console.log('\n=== D. la marge des fenêtres ===')
  for (const [nom, action, sel] of [['Nouveau classeur', 'nouveau-classeur', 'dialog.dialogue-nouveau:not(.dialogue-dossier)'], ['Nouveau dossier', 'nouveau-dossier', 'dialog.dialogue-dossier']]) {
    for (const geste of ['souris', 'doigt']) {
      const { ctx, p } = await ouvrir(geste === 'doigt' ? { hasTouch: true, viewport: { width: 1180, height: 820 } } : {}, 'D')
      await ouvrirBiblio(p)
      const ouvrirFenetre = async () => {
        await p.click(`[data-action="${action}"]`); await p.waitForSelector(sel + '[open]')
        await p.keyboard.press('Control+a'); await p.keyboard.type('Géométrie dans l\'espace')
      }
      const appui = async (x, y) => { if (geste === 'souris') await p.mouse.click(x, y); else await p.touchscreen.tap(x, y); await dort(300) }
      const etat = () => p.evaluate(s => { const d = document.querySelector(s + '[open]'); return d ? { ouverte: true, nom: d.querySelector('input[name="nom"]').value } : { ouverte: false } }, sel)
      await ouvrirFenetre()
      const r = await p.evaluate(s => { const b = document.querySelector(s + '[open]').getBoundingClientRect(); return { b: [b.left, b.top, b.right, b.bottom] } }, sel)
      const [l, t, rr, bb] = r.b
      // Dans la marge : à 8 px du bord gauche, du bord droit, du haut et du bas
      const points = [[l + 8, (t + bb) / 2], [rr - 8, (t + bb) / 2], [(l + rr) / 2, t + 6], [(l + rr) / 2, bb - 6]]
      const res = []
      for (const [x, y] of points) { await appui(x, y); res.push(await etat()) }
      ok(res.every(e => e.ouverte && e.nom === 'Géométrie dans l\'espace'), `« ${nom} » (${geste}) : un appui dans la marge intérieure (gauche, droite, haut, bas) ne la ferme pas, le nom tapé reste`, res)
      // Sur le fond, hors du cadre : elle se ferme, rien n'est créé
      const avant = await p.evaluate(() => [window.__bibliotheque.fiches.size, window.__bibliotheque.dossiers.size])
      await appui(Math.max(4, l - 30), Math.max(4, t - 30))
      const e2 = await etat()
      const apres = await p.evaluate(() => [window.__bibliotheque.fiches.size, window.__bibliotheque.dossiers.size])
      ok(!e2.ouverte && JSON.stringify(avant) === JSON.stringify(apres), `« ${nom} » (${geste}) : un appui sur le fond, hors du cadre, la ferme sans rien créer`, { e2, avant, apres })
      if (geste === 'souris') {
        // Un texte sélectionné en glissant du champ jusqu'au fond : elle reste
        await ouvrirFenetre()
        const c = await p.evaluate(s => { const i = document.querySelector(s + '[open] input[name="nom"]').getBoundingClientRect(); return [i.left + 10, i.top + i.height / 2] }, sel)
        await p.mouse.move(c[0], c[1]); await p.mouse.down(); await p.mouse.move(c[0] + 200, c[1] - 300, { steps: 6 }); await p.mouse.move(8, 8, { steps: 4 }); await p.mouse.up(); await dort(300)
        const e3 = await etat()
        ok(e3.ouverte, `« ${nom} » : un texte sélectionné en glissant du champ jusqu'au fond ne la ferme pas`, e3)
        await p.keyboard.press('Escape')
      }
      await ctx.close()
    }
  }
}

// =====================================================================
// E. LE DERNIER CLASSEUR, AU DÉMARRAGE
// =====================================================================
if (seul('E')) {
  console.log('\n=== E. le dernier classeur au démarrage ===')
  {
    const { ctx, p } = await ouvrir({}, 'E')
    const x = await creerClasseur(p, 'Année dernière : Symétrie')
    const ici = await p.evaluate(() => window.__app.classeur.nom)
    await ouvrirBiblio(p)
    await p.click(`.grille-classeurs.tous li[data-cle="${x}"] .carte-apercu`, { modifiers: ['Control'] }); await dort(2500)
    const autre = ctx.pages()[1]
    const vu = await autre.evaluate(() => document.querySelector('.nom-classeur')?.textContent)
    await autre.close()
    await p.keyboard.press('Escape'); await dort(300)
    await ecrireTraits(p, 5); await dort(1500)
    await p.goto(BASE); await pret(p); await dort(500)
    const n = await p.evaluate(() => window.__app.classeur.nom)
    ok(vu === 'Année dernière : Symétrie' && n === ici, 'Un coup d\'œil à un autre classeur (Ctrl + clic, onglet fermé), puis 5 traits ici : au démarrage, le classeur où l\'on a écrit', { vu, ici, rouvert: n })
    await ctx.close()
  }
  {
    // Deux onglets sur deux classeurs : on écrit dans le premier ouvert ; puis
    // on regarde l'autre (il prend le focus) ; puis on revient au premier
    const { ctx, p } = await ouvrir({}, 'E2')
    const y = await creerClasseur(p, 'Fractions')
    const premier = await p.evaluate(() => window.__app.classeur.nom)
    const q = await ctx.newPage(); suivre(q, 'E2b')
    await q.goto(BASE + '?classeur=' + y); await pret(q); await dort(800)
    const dernier = () => p.evaluate(() => JSON.parse(localStorage.getItem('mem-teachingtool-dernier-classeur') || 'null')?.nom)
    const d0 = await dernier()
    await ecrireTraits(p, 3); await dort(1200)
    const d1 = await dernier()
    await q.evaluate(() => window.dispatchEvent(new Event('focus'))); await dort(200)
    const d2 = await dernier()
    await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await dort(200)
    const d3 = await dernier()
    ok(d0 === 'Fractions' && d1 === premier && d2 === 'Fractions' && d3 === premier,
      'Deux onglets sur deux classeurs : le dernier est celui où l\'on vient d\'écrire, puis celui qui prend le focus', { ouvert: d0, apresEcrire: d1, focusAutre: d2, focusPremier: d3 })
    await q.close()
    const r = await ctx.newPage(); suivre(r, 'E2c')
    await r.goto(BASE); await pret(r); await dort(400)
    const n = await r.evaluate(() => window.__app.classeur.nom)
    ok(n === premier, 'Au démarrage suivant, sans adresse : celui-là', { rouvert: n })
    await ctx.close()
  }
}

// =====================================================================
// F. LA POIGNÉE ET « PAS ENCORE D'APERÇU »
// =====================================================================
if (seul('F')) {
  console.log('\n=== F. la poignée ⋮⋮ et « Pas encore d\'aperçu » ===')
  for (const [w, h] of [[390, 844], [360, 640], [1180, 820], [820, 1180]]) {
    const { ctx, p } = await ouvrir({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 900 }, 'F')
    for (const n of ['Chapitre 1', 'Chapitre 2', 'Chapitre 3']) await creerClasseur(p, n)
    await p.evaluate(() => window.__registre.ecrireReglage('conseil', 'vu'))
    await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(600)
    const r = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs > li')].map(li => {
      const t = li.querySelector('.sans-apercu'), g = li.querySelector('.biblio-poignee'), ap = li.querySelector('.carte-apercu').getBoundingClientRect()
      if (!t || t.hidden || !g || !g.getClientRects().length) return null
      const rg = document.createRange(); rg.selectNodeContents(t)
      const a = rg.getBoundingClientRect(), o = li.querySelector('.options-classeur').getBoundingClientRect()
      const croise = b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
      // Le bouton ⋯ : ce qu'on en voit (son fond, voir .options-classeur::before)
      const ov = { left: o.left + 5, right: o.right - 5, top: o.top + 6, bottom: o.bottom - 10 }
      return { liste: li.parentElement.classList.contains('recents') ? 'recents' : 'tous', poignee: croise(g.getBoundingClientRect()), options: croise(ov), dedans: a.left >= ap.left - 0.5 && a.right <= ap.right + 0.5 && a.top >= ap.top - 0.5 && a.bottom <= ap.bottom + 0.5 }
    }).filter(Boolean))
    const mal = r.filter(x => x.poignee || x.options || !x.dedans)
    ok(r.length >= 3 && r.some(x => x.liste === 'recents') && mal.length === 0, `${w} × ${h} au doigt : « Pas encore d'aperçu » entier dans l'aperçu, ni sous la poignée ⋮⋮ ni sous le bouton ⋯ (${r.length} cartes)`, mal.slice(0, 3))
    await ctx.close()
  }
}

ok(erreurs.length === 0, 'aucune erreur JS', erreurs.slice(0, 5))
await nav.close()
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est bon')
process.exit(echecs ? 1 : 0)
