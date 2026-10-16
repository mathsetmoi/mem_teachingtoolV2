// La page d'essai du morceau P4 : des traits, des figures nommées (un
// triangle, un cercle de centre O, une droite (DE) prolongée), quatre
// formules difficiles, une image importée, sur le fond demandé. Tout est
// posé par l'API avec des identifiants, des places et une vue fixes : la
// même page, au pixel près, d'un passage à l'autre.
export async function construire(page, fond = 'carreaux') {
  await page.evaluate(async (fond) => {
    const a = window.__app, t = a.tableau, p = a.page
    // L'image : un dégradé et un disque, dessinés ici (le même à chaque fois)
    const c = document.createElement('canvas'); c.width = 160; c.height = 100
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, 160, 100); g.addColorStop(0, '#f2c14e'); g.addColorStop(1, '#3b6fb6')
    x.fillStyle = g; x.fillRect(0, 0, 160, 100)
    x.fillStyle = '#d64545'; x.beginPath(); x.arc(110, 45, 26, 0, Math.PI * 2); x.fill()
    x.fillStyle = '#ffffff'; x.fillRect(14, 60, 60, 22)
    const src = 'img-essai-p4'
    t.doc.getMap('images').set(src, c.toDataURL('image/png'))
    t.changerFond(p, fond)
    const zig = (id, x0, y0, n, couleur, taille, z) => {
      const pts = []
      for (let i = 0; i < n; i++) pts.push(i * 9, (i % 2 ? 16 : 0) + Math.sin(i / 3) * 6, 0.5)
      return { id, type: 'trait', x: x0, y: y0, z, auteur: t.moi, pts, couleur, taille, opacite: 1, pression: false }
    }
    const formes = [
      { id: 'p4-image', type: 'image', src, l: 160, h: 100, m: [1.2, 0, 0, 1.2], x: 760, y: 420, z: 1, auteur: t.moi },
      zig('p4-t1', 180, 140, 30, '#1b2230', 3, 2),
      zig('p4-t2', 180, 200, 22, '#d64545', 6, 3),
      { ...zig('p4-t3', 200, 260, 26, '#ffe45c', 18, 4), opacite: 0.45 },
      { id: 'p4-tri', type: 'polygone', x: 300, y: 330, z: 5, auteur: t.moi, pts: [0, 0, 220, 30, 90, 170], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'], codage: true, fond: '#3b6fb6' },
      { id: 'p4-cer', type: 'cercle', x: 720, y: 250, z: 6, auteur: t.moi, r: 80, couleur: '#2a8a4a', taille: 3, sommets: true, noms: ['O'], codage: true },
      { id: 'p4-droite', type: 'polygone', x: 120, y: 560, z: 7, auteur: t.moi, pts: [0, 0, 300, -60], ferme: false, prolonge: 'droite', couleur: '#7a3fb0', taille: 2.5, sommets: true, noms: ['D', 'E'] },
      { id: 'p4-seg', type: 'polygone', x: 980, y: 160, z: 8, auteur: t.moi, pts: [0, 0, 160, 40], ferme: false, couleur: '#1b2230', taille: 3, sommets: true, noms: ['M', 'N'], styleNoms: [{ droit: true }, { taille: 30 }], stylePoints: [{ bout: 'fleche' }, { marque: 'croix' }] },
      { id: 'p4-f1', type: 'formule', latex: '\\overrightarrow{AB}+\\vec{u}', x: 980, y: 260, z: 9, auteur: t.moi, couleur: '#1b2230', taille: 34 },
      { id: 'p4-f2', type: 'formule', latex: '\\sqrt{2}\\approx 1{,}414', x: 980, y: 340, z: 10, auteur: t.moi, couleur: '#d64545', taille: 30 },
      { id: 'p4-f3', type: 'formule', latex: '\\dfrac{1}{2}+\\dfrac{3}{4}', x: 520, y: 520, z: 11, auteur: t.moi, couleur: '#1b5fbf', taille: 30 },
      { id: 'p4-f4', type: 'formule', latex: '\\boxed{x=3}', x: 1040, y: 420, z: 12, auteur: t.moi, couleur: '#1b2230', taille: 28 },
      { id: 'p4-f5', type: 'formule', latex: '', x: 180, y: 420, z: 13, auteur: t.moi, couleur: '#2a8a4a', taille: 26 },
    ]
    t.poserPlusieurs(p, formes)
    a.allerVers({ x: 0, y: 0, z: 1 }, 0)
    a.rafraichir()
  }, fond)
  // Les polices de KaTeX, l'image chargée, deux images d'écran
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    window.__app.rendu.toutRedessiner()
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  await page.waitForTimeout(300)
}

/** Une capture du seul dessin de la zone (sans les barres, les messages, les menus) */
export async function capturerZone(page, chemin) {
  await page.addStyleTag({ content: '#app > :not(#zone) { visibility: hidden !important; }' })
  await page.mouse.move(1, 1)
  await page.waitForTimeout(150)
  return page.screenshot({ path: chemin })
}
