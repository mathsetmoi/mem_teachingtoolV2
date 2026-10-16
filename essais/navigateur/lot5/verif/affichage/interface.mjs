// Les noms sous les outils et la mise en page du téléphone : captures à
// 360 × 740, 740 × 360, 1024 × 768, 1920 × 1080 (avec et sans les noms, en
// contraste renforcé aussi) ; rien hors de l'écran, aucun bouton qui en
// chevauche un autre, aucune barre sur une autre, aucun nom coupé ni sur son
// voisin, boutons de 44 px au moins là où l'on touche.
import { writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { lancer, contexte, ok, note, fin, OUT, DEV, suivre, pret } from './lib/commun.mjs'

const D = OUT + '/interface'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })
const nav = await lancer()

const CONFIGS = [
  { nom: 'telephone-portrait', viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, toucher: true },
  { nom: 'telephone-paysage', viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, toucher: true },
  { nom: 'poste-1024', viewport: { width: 1024, height: 768 }, toucher: false },
  { nom: 'poste-1024-noms', viewport: { width: 1024, height: 768 }, toucher: false, noms: '1' },
  { nom: 'tni-1920', viewport: { width: 1920, height: 1080 }, hasTouch: true, toucher: true, ecran: { width: 1920, height: 1080 } },
  { nom: 'tni-1920-contraste', viewport: { width: 1920, height: 1080 }, hasTouch: true, toucher: true, contraste: '1' },
  { nom: 'poste-1920-souris', viewport: { width: 1920, height: 1080 }, toucher: false },
  { nom: 'ipadpro-portrait', viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, toucher: true },
  { nom: 'ipadpro-paysage', viewport: { width: 1366, height: 1024 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, toucher: true },
  { nom: 'ipad11-paysage', viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, toucher: true },
  { nom: 'poste-1366-noms', viewport: { width: 1366, height: 768 }, toucher: false, noms: '1' },
]

const RELEVER = () => {
  const vis = e => {
    if (!e.isConnected) return false
    const s = getComputedStyle(e)
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false
    const r = e.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p); if (q.display === 'none' || q.visibility === 'hidden') return false; if (p.hidden) return false }
    return true
  }
  const nomDe = b => b.getAttribute('aria-label') || b.title || b.textContent.trim() || b.className
  const W = innerWidth, H = innerHeight
  const barres = [...document.querySelectorAll('.barre')].filter(vis).filter(b => !b.closest('dialog') && !b.closest('.revue'))
  const boutons = barres.flatMap(b => [...b.querySelectorAll('button')].filter(vis).map(e => ({ e, barre: b.className })))
  const rect = e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, l: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 } }
  const dehors = []
  for (const { e, barre } of boutons) {
    const r = e.getBoundingClientRect()
    // un bouton qui défile dans sa barre (barre des outils) : visible seulement dans la barre
    const parent = e.closest('.barre'), rp = parent.getBoundingClientRect()
    if (r.bottom <= rp.top || r.top >= rp.bottom || r.right <= rp.left || r.left >= rp.right) continue
    // (contrôle final du lot 5) un bouton à moitié défilé n'est visible que
    // dans sa barre, qui le coupe : c'est cette part qui doit être dans l'écran
    const v = { left: Math.max(r.left, rp.left), top: Math.max(r.top, rp.top), right: Math.min(r.right, rp.right), bottom: Math.min(r.bottom, rp.bottom) }
    if (v.left < -0.5 || v.top < -0.5 || v.right > W + 0.5 || v.bottom > H + 0.5) dehors.push({ nom: nomDe(e), r: rect(e) })
  }
  const barresDehors = barres.filter(b => { const r = b.getBoundingClientRect(); return r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5 }).map(b => ({ c: b.className, r: rect(b) }))
  // Les barres qui se chevauchent
  const chev = []
  for (let i = 0; i < barres.length; i++) for (let j = i + 1; j < barres.length; j++) {
    const a = barres[i].getBoundingClientRect(), b = barres[j].getBoundingClientRect()
    if (barres[i].contains(barres[j]) || barres[j].contains(barres[i])) continue
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    if (ix > 1 && iy > 1) chev.push({ a: barres[i].className, b: barres[j].className, ra: rect(barres[i]), rb: rect(barres[j]) })
  }
  // Les boutons qui se chevauchent
  const chevB = []
  for (let i = 0; i < boutons.length; i++) for (let j = i + 1; j < boutons.length; j++) {
    const A = boutons[i].e, B = boutons[j].e
    if (A.contains(B) || B.contains(A)) continue
    const a = A.getBoundingClientRect(), b = B.getBoundingClientRect()
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    if (ix > 1 && iy > 1) chevB.push({ a: nomDe(A), b: nomDe(B), ra: rect(A), rb: rect(B) })
  }
  // Les petits boutons
  const petits = boutons.map(({ e }) => ({ nom: nomDe(e), r: rect(e) })).filter(b => b.r.l < 43.5 || b.r.h < 43.5)
  // Les noms : dans leur bouton, sans chevaucher un autre nom
  const libelles = [...document.querySelectorAll('.bouton.nomme > .libelle')].filter(vis)
  const nomsSortis = [], nomsChev = []
  for (const l of libelles) {
    const r = l.getBoundingClientRect(), b = l.parentElement.getBoundingClientRect()
    if (r.left < b.left - 0.5 || r.right > b.right + 0.5 || r.bottom > b.bottom + 0.5) nomsSortis.push({ mot: l.dataset.libelle, r: rect(l), bouton: rect(l.parentElement) })
  }
  for (let i = 0; i < libelles.length; i++) for (let j = i + 1; j < libelles.length; j++) {
    const a = libelles[i].getBoundingClientRect(), b = libelles[j].getBoundingClientRect()
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    if (ix > 0.5 && iy > 0.5) nomsChev.push([libelles[i].dataset.libelle, libelles[j].dataset.libelle])
  }
  // La barre des outils défile-t-elle (des boutons cachés sous son bord) ?
  const bo = document.querySelector('.barre-outils'), defile = bo ? { sh: bo.scrollHeight, ch: bo.clientHeight, sw: bo.scrollWidth, cw: bo.clientWidth } : null
  return {
    body: document.body.className, W, H, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
    barres: barres.map(b => ({ c: b.className, r: rect(b) })), dehors, barresDehors, chev, chevB, petits, nomsSortis, nomsChev,
    libelles: libelles.map(l => l.dataset.libelle), defile,
  }
}

for (const c of CONFIGS) {
  const ctx = await contexte(nav, { viewport: c.viewport, hasTouch: !!c.hasTouch, isMobile: !!c.isMobile, deviceScaleFactor: c.deviceScaleFactor ?? 1, screen: c.ecran ?? c.viewport })
  await ctx.addInitScript(o => {
    try { if (o.noms) localStorage.setItem('mem-noms-outils', o.noms); if (o.contraste) localStorage.setItem('mem-contraste', o.contraste) } catch {}
  }, { noms: c.noms, contraste: c.contraste })
  const p = await ctx.newPage(); suivre(p, c.nom)
  await p.goto(DEV); await pret(p); await p.waitForTimeout(1200)
  // Quelques objets, pour que la page ne soit pas vide
  await p.evaluate(() => {
    const a = window.__app, t = a.tableau
    a.changerFond('grands-carreaux')
    const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * 12, Math.sin(i / 2) * 14, 0.5)
    t.nouveauGeste(); t.poser(a.page, { id: 'i' + Math.random().toString(36).slice(2), type: 'trait', x: 150, y: 300, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
    a.ui.maj()
  })
  await p.waitForTimeout(500)
  const r = await p.evaluate(RELEVER)
  writeFileSync(`${D}/${c.nom}.png`, await p.screenshot())
  note(`${c.nom} : body « ${r.body} », ${r.barres.length} barres`, { libelles: r.libelles.length, defile: r.defile })
  ok(r.scrollW <= r.W && r.scrollH <= r.H, `${c.nom} : pas de défilement de la page (${r.scrollW} × ${r.scrollH} pour ${r.W} × ${r.H})`)
  ok(r.dehors.length === 0 && r.barresDehors.length === 0, `${c.nom} : aucun bouton ni aucune barre hors de l'écran`, { dehors: r.dehors, barres: r.barresDehors })
  ok(r.chev.length === 0, `${c.nom} : aucune barre sur une autre`, r.chev)
  ok(r.chevB.length === 0, `${c.nom} : aucun bouton sur un autre`, r.chevB)
  ok(r.nomsSortis.length === 0 && r.nomsChev.length === 0, `${c.nom} : chaque nom tient dans son bouton, aucun sur son voisin`, { sortis: r.nomsSortis, chev: r.nomsChev })
  if (c.toucher) ok(r.petits.length === 0, `${c.nom} : tous les boutons des barres font 44 px au moins`, r.petits)
  else if (r.petits.length) note(`${c.nom} : boutons sous 44 px (souris)`, r.petits.slice(0, 12))
  // Au téléphone : les menus Plus et Autres outils tiennent dans l'écran
  if (/telephone/.test(c.nom)) {
    for (const quoi of ['Plus', 'Autres outils']) {
      const b = p.locator(`.barre button[aria-label^="${quoi}"]:visible, .barre button[title^="${quoi}"]:visible`).first()
      if (!(await b.count())) { ok(false, `${c.nom} : pas de bouton « ${quoi} »`); continue }
      await b.tap(); await p.waitForTimeout(400)
      const m = await p.evaluate(() => {
        const ms = [...document.querySelectorAll('.menu, [role="menu"]')].filter(m => !m.hidden && getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().height > 0)
        return ms.map(m => { const r = m.getBoundingClientRect(); const items = [...m.querySelectorAll('[role^="menuitem"], .menu-item')].filter(i => i.getBoundingClientRect().height > 0); return { c: m.className, r: [r.left, r.top, r.right, r.bottom].map(Math.round), dedans: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, petits: items.filter(i => i.getBoundingClientRect().height < 43.5).map(i => i.textContent.trim().slice(0, 30)), n: items.length } })
      })
      writeFileSync(`${D}/${c.nom}-${quoi.replace(' ', '-')}.png`, await p.screenshot())
      ok(m.length >= 1 && m.every(x => x.dedans), `${c.nom} : le menu « ${quoi} » tient dans l'écran`, m)
      ok(m.every(x => x.petits.length === 0), `${c.nom} : les entrées du menu « ${quoi} » font 44 px au moins`, m.map(x => x.petits))
      await p.keyboard.press('Escape'); await p.waitForTimeout(250)
      await p.evaluate(() => window.__app.ui.fermerMenus?.())
    }
  }
  await ctx.close()
}
await fin(nav)
