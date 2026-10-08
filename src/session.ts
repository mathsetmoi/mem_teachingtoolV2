// =============================================================
// LA SESSION DE CE NAVIGATEUR
// La page qu'on regardait et, pour chaque page, la vue qu'on y avait
// (son centre et son zoom) : au rechargement, on retrouve le tableau
// comme on l'a laissé. C'est l'affaire de CET écran, pas du tableau :
// rien de tout cela n'entre dans le document (ni dans un fichier, ni
// dans le film, ni dans une publication).
// Une vue se garde par le point du monde au centre de l'écran : elle
// tient si la fenêtre change de taille (portable → vidéoprojecteur).
// Deux onglets ouverts : le dernier qui écrit gagne, sans gravité.
// =============================================================
import { ZOOM_MAX, ZOOM_MIN } from './camera'

/** (cx, cy) : le point du monde au centre de l'écran ; z : le zoom */
export interface Vue { cx: number; cy: number; z: number }

const CLE = 'mem-session'
/** Ce qui est déjà écrit : on ne réécrit pas la même chose */
let derniere = ''

/** La session gardée, ou null si elle manque ou ne se lit pas */
export function lireSession(): { page: string; vues: Map<string, Vue> } | null {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return null
    const s = JSON.parse(brut)
    if (!s || typeof s !== 'object' || s.v !== 1 || typeof s.page !== 'string'
      || !s.vues || typeof s.vues !== 'object' || Array.isArray(s.vues)) return null
    const vues = new Map<string, Vue>()
    for (const [id, v] of Object.entries(s.vues as Record<string, unknown>)) {
      if (!Array.isArray(v) || v.length !== 3 || !v.every(n => typeof n === 'number' && Number.isFinite(n)) || v[2] <= 0) continue
      vues.set(id, { cx: v[0], cy: v[1], z: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v[2])) })
    }
    derniere = brut
    return { page: s.page, vues }
  } catch { return null }
}

const arrondi = (v: number, k: number) => Math.round(v * k) / k

/** Note la page vue et les vues des pages qui existent encore (dans l'ordre) */
export function ecrireSession(page: string, vues: Map<string, Vue>, pages: string[]) {
  const garder: Record<string, [number, number, number]> = {}
  for (const id of pages) {
    const v = vues.get(id)
    if (v && Number.isFinite(v.cx) && Number.isFinite(v.cy) && v.z > 0) garder[id] = [arrondi(v.cx, 100), arrondi(v.cy, 100), arrondi(v.z, 1e4)]
  }
  const texte = JSON.stringify({ v: 1, page, vues: garder })
  if (texte === derniere) return
  try { localStorage.setItem(CLE, texte); derniere = texte } catch { /* ce navigateur ne garde rien : tant pis */ }
}

/** Un autre tableau s'ouvre : ses pages n'ont rien à voir avec ces vues */
export function oublierSession() {
  derniere = ''
  try { localStorage.removeItem(CLE) } catch { /* rien à oublier */ }
}
