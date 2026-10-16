// =============================================================
// L'ENREGISTREUR, INJECTÉ DANS UNE PAGE (tableau, lecteur élève, revue)
// À chaque image d'écran : ce qui est À L'ÉCRAN dans le cadre du mot
// (pixels d'encre, en masque binaire), et ce que le rendu dessine
// (longueur de chaque trait, trait en cours compris).
// =============================================================

/** Installe l'enregistreur. quel : 'tableau' | 'revoir' | 'revue' */
export function installer([quel, cadre]) {
  const rendu = () => quel === 'tableau' ? window.__app.rendu : quel === 'revoir' ? window.__revoir.rendu : window.__revue.rendu
  const longueur = (pts) => { let l = 0; for (let i = 3; i + 2 < pts.length; i += 3) l += Math.hypot(pts[i] - pts[i - 3], pts[i + 1] - pts[i - 2]); return l }
  const S = 2                       // deux pixels du masque par unité monde : on voit les bouts de trait
  const W = cadre.l * S, H = cadre.h * S
  const oc = new OffscreenCanvas(W, H)
  const cx = oc.getContext('2d', { willReadFrequently: true })
  const st = { frames: [], actif: true, quel, cadre, S, W, H }
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s) }
  // On lit l'écran APRÈS que la page a peint cette image : les rappels
  // d'image de la page passent après le nôtre ; un message posté depuis
  // notre rappel passe après eux tous, avant l'image suivante.
  const canal = new MessageChannel()
  let tImage = 0
  canal.port1.onmessage = () => capturer(tImage)
  function tic(t) { if (!st.actif) return; tImage = t; canal.port2.postMessage(0); requestAnimationFrame(tic) }
  function capturer(tImage) {
    const r = rendu()
    if (!r) return
    {
      const cam = r.cam, dpr = r.dpr
      const sx = (cadre.x * cam.z + cam.x) * dpr, sy = (cadre.y * cam.z + cam.y) * dpr
      const sw = cadre.l * cam.z * dpr, sh = cadre.h * cam.z * dpr
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H)
      cx.imageSmoothingEnabled = true
      cx.drawImage(r.scene, sx, sy, sw, sh, 0, 0, W, H)
      cx.drawImage(r.direct, sx, sy, sw, sh, 0, 0, W, H)
      const d = cx.getImageData(0, 0, W, H).data
      const bits = new Uint8Array(Math.ceil(W * H / 8))
      let encre = 0
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        if (lum < 140) { bits[j >> 3] |= 1 << (j & 7); encre++ }
      }
      const traits = []
      for (const f of r.formes) if (f.type === 'trait') traits.push([f.id, Math.round(longueur(f.pts) * 100) / 100, f.pts.length / 3])
        else traits.push([f.id, -1, 0, f.type])
      const m = b64(bits)
      const mon = r.monTrait ? Math.round(longueur(r.monTrait.pts) * 100) / 100 : -1
      st.frames.push({ t: tImage, tc: performance.now(), encre, m: m === st.dernier ? null : (st.dernier = m), traits, mon, monN: r.monTrait ? r.monTrait.pts.length / 3 : 0,
        cam: [cam.x, cam.y, cam.z], k: quel === 'revoir' ? window.__revoir.k : quel === 'revue' ? window.__revue.k : undefined })
    }
  }
  requestAnimationFrame(tic)
  window.__enr = st
}

/** Le journal des événements du stylet sur le tableau, et le temps de chaque point gardé */
export function journal() {
  const app = window.__app
  const j = { ev: [], traits: [], enCours: null }
  const z = app.zone
  const noter = (e) => {
    const co = e.getCoalescedEvents ? e.getCoalescedEvents() : []
    j.ev.push({ type: e.type, ts: e.timeStamp, now: performance.now(), x: e.clientX, y: e.clientY, p: e.pressure, pt: e.pointerType, nc: co.length })
    const mt = app.rendu.monTrait
    if (e.type === 'pointerdown') {
      j.enCours = { bas: e.timeStamp, temps: [e.timeStamp], pts: mt ? mt.pts.slice() : [], pression: mt?.pression }
      return
    }
    if (e.type === 'pointermove' && j.enCours && mt) {
      const n = mt.pts.length / 3
      const deja = j.enCours.temps.length
      const evs = co.length ? co : [e]
      for (let i = deja; i < n; i++) {
        const x = mt.pts[3 * i], y = mt.pts[3 * i + 1]
        let t = e.timeStamp
        for (const c of evs) { const m = app.monde(c); if (m.x === x && m.y === y) { t = c.timeStamp; break } }
        j.enCours.temps.push(t)
      }
      j.enCours.pts = mt.pts.slice()
      return
    }
    if (e.type === 'pointerup' && j.enCours) {
      const c = j.enCours
      j.enCours = null
      c.haut = e.timeStamp
      // le trait que le tableau vient de poser
      const posees = app.formes.filter(f => f.type === 'trait')
      const t = posees.reduce((a, f) => (!a || f.z > a.z ? f : a), null)
      c.id = t?.id; c.pose = t ? { x: t.x, y: t.y, pts: t.pts, pression: t.pression, taille: t.taille } : null
      c.nbFormes = app.formes.length
      j.traits.push(c)
    }
  }
  for (const type of ['pointerdown', 'pointermove', 'pointerup']) z.addEventListener(type, noter)
  window.__journal = j
}
