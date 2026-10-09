// =============================================================
// LES VIGNETTES DES PAGES
// Le rendu réel de chaque page, en petit : son fond, son contenu cadré.
// La trieuse des pages, la corbeille et la fenêtre « Envoyer vers… »
// s'en servent, la trieuse ouverte ou non : une seule instance, gardée par
// l'interface (ui.vignettes).
// Rien ne se calcule d'avance : vignette() rend un canevas, peint plus
// tard par une file paresseuse, par tranches de 12 ms au plus pendant les
// moments libres du navigateur (l'écriture n'attend jamais, même avec 60
// pages chargées d'écriture). Seuls les canevas attachés au document se
// peignent : une trieuse fermée ne coûte rien. Chaque page a une version,
// augmentée à chaque changement (observeDeep) : un canevas attaché dont la
// version est dépassée se repeint ; les autres gardent leur image.
// La peinture est une esquisse (voir Rendu.peindreSur) : les traits en
// lignes brisées, les petites formules en rectangles gris ; les autres
// formules, à une échelle fixe partagée par toutes les vignettes,
// préparées une fois, une par tâche. Ce qui n'est pas prêt (une formule,
// une image pas encore chargée) est un rectangle clair, puis la vignette
// se repeint.
// =============================================================
import * as Y from 'yjs'
import type { Tableau } from '../document'
import type { Apercus } from '../sorties/apercu'
import type { Boite } from '../revoir/bobine'
import type { Formule } from '../types'

/** La marge autour du contenu, en unités du monde */
export const MARGE_VIGNETTE = 16
/** Le zoom d'une vignette au plus : un petit contenu ne s'y agrandit pas
 *  au-delà (une vignette n'est donc jamais à plus de 0,6 × 2 pixels par
 *  unité, au dpr de 2 au plus) */
export const ZOOM_VIGNETTE = 0.6
/** Le zoom d'une page vide : son fond seul, vu comme la vue neutre */
export const ZOOM_VIDE = 0.25
/** L'échelle des formules des vignettes (pixels par unité) : la même pour
 *  toutes, quelle que soit la page ; plus grande que celle de toute
 *  vignette, l'image se réduit et reste nette */
export const ECHELLE_FORMULES = 1.25
/** La plus longue tranche de la file, en ms */
const TRANCHE = 12
/** Au plus ce nombre de tailles gardées pour une même page */
const TAILLES_PAR_PAGE = 4

/**
 * La caméra d'une vignette l × h (px CSS) : la boîte du contenu (monde)
 * entière, avec sa marge, centrée, au zoom ZOOM_VIGNETTE au plus. Comme
 * vuePour, sans son plancher de zoom : une page de plusieurs mètres doit
 * tenir dans sa vignette. Page vide (null) : son fond, au zoom ZOOM_VIDE,
 * l'origine du monde là où la vue neutre la met (120 px du coin, réduits).
 */
export function cadrageVignette(b: Boite | null, l: number, h: number): { x: number; y: number; z: number } {
  if (!b || !(l > 0) || !(h > 0)) return { x: 120 * ZOOM_VIDE, y: 120 * ZOOM_VIDE, z: ZOOM_VIDE }
  const bl = b.l + 2 * MARGE_VIGNETTE, bh = b.h + 2 * MARGE_VIGNETTE
  const z = Math.max(1e-4, Math.min(ZOOM_VIGNETTE, l / bl, h / bh))
  return { x: l / 2 - (b.x + b.l / 2) * z, y: h / 2 - (b.y + b.h / 2) * z, z }
}

interface Vignette {
  c: HTMLCanvasElement
  page: string
  l: number; h: number; dpr: number
  /** La version de la page qu'il montre (-1 : rien encore) */
  peinte: number
}

type Rappel = { id: number; inactif: boolean }

export class Vignettes {
  /** Appelé après chaque vignette peinte (la trieuse peut y ôter son « … ») */
  onPeinte: ((page: string, c: HTMLCanvasElement) => void) | null = null
  /** page|l|h → vignette */
  private toutes = new Map<string, Vignette>()
  private parPage = new Map<string, Vignette[]>()
  private versions = new Map<string, number>()
  private priorite = new Map<string, number>()
  private rappel: Rappel | null = null
  /** Les pages dont on prépare les formules ou les images, puis qu'on repeint */
  private aPreparer: string[] = []
  private preparation = false
  private detruite = false
  private observateur: (evts: Y.YEvent<any>[]) => void

  constructor(private tableau: Tableau, private apercus: Apercus) {
    this.observateur = evts => {
      const touchees = new Set<string>()
      for (const e of evts) {
        if (e.target === tableau.pages) for (const k of (e as Y.YMapEvent<unknown>).keysChanged) touchees.add(k)
        else { const p = e.path[0]; if (typeof p === 'string') touchees.add(p) }
      }
      let attachee = false
      for (const p of touchees) {
        this.versions.set(p, this.version(p) + 1)
        if (!attachee) attachee = !!this.parPage.get(p)?.some(v => v.c.isConnected)
      }
      if (attachee) this.planifier()
    }
    tableau.pages.observeDeep(this.observateur)
  }

  /** Le canevas de la vignette d'une page, l × h px CSS (au dpr de l'écran,
   *  2 au plus) : le même pour la même page et la même taille. Il se peint
   *  plus tard, et se repeint quand la page change, tant qu'il est attaché
   *  au document. Appeler vignette() pour un canevas qu'on rattache relance
   *  la file. */
  vignette(page: string, l: number, h: number): HTMLCanvasElement {
    l = Math.max(1, Math.round(l)); h = Math.max(1, Math.round(h))
    const cle = `${page}|${l}|${h}`
    let v = this.toutes.get(cle)
    if (!v) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const c = document.createElement('canvas')
      c.width = Math.round(l * dpr); c.height = Math.round(h * dpr)
      c.style.width = l + 'px'; c.style.height = h + 'px'
      v = { c, page, l, h, dpr, peinte: -1 }
      this.toutes.set(cle, v)
      const liste = this.parPage.get(page) ?? []
      liste.push(v)
      this.parPage.set(page, liste)
      this.oublierDesTailles(page)
    }
    this.planifier()
    return v.c
  }

  /** La page est-elle vide (la carte écrira « Page vide ») ? */
  vide(page: string): boolean { return (this.tableau.formesDe(page)?.size ?? 0) === 0 }

  /** Ces pages d'abord (les cartes visibles de la trieuse), dans cet ordre ;
   *  ensuite, les autres canevas attachés */
  prioriser(pages: readonly string[]) {
    this.priorite = new Map(pages.map((p, i) => [p, i]))
    this.planifier()
  }

  detruire() {
    this.detruite = true
    this.tableau.pages.unobserveDeep(this.observateur)
    this.annulerRappel()
    this.toutes.clear(); this.parPage.clear(); this.aPreparer = []
  }

  // ---------- La file ----------
  private version(page: string) { return this.versions.get(page) ?? 0 }

  /** Une page n'a pas besoin de dix tailles de vignettes (la fenêtre a changé
   *  de taille) : les plus anciennes qui ne sont plus attachées s'en vont */
  private oublierDesTailles(page: string) {
    const liste = this.parPage.get(page)
    if (!liste || liste.length <= TAILLES_PAR_PAGE) return
    for (const v of [...liste]) {
      if (liste.length <= TAILLES_PAR_PAGE) break
      if (v.c.isConnected) continue
      liste.splice(liste.indexOf(v), 1)
      this.toutes.delete(`${v.page}|${v.l}|${v.h}`)
    }
  }

  /** Les canevas attachés dont l'image est dépassée, les pages prioritaires
   *  d'abord, puis dans l'ordre du tableau */
  private file(): Vignette[] {
    const r: Vignette[] = []
    for (const v of this.toutes.values()) if (v.c.isConnected && v.peinte !== this.version(v.page)) r.push(v)
    if (r.length > 1) {
      const ordre = new Map(this.tableau.ordre.toArray().map((p, i) => [p, i]))
      const rang = (v: Vignette) => [this.priorite.get(v.page) ?? Infinity, ordre.get(v.page) ?? Infinity]
      r.sort((a, b) => { const [a1, a2] = rang(a), [b1, b2] = rang(b); return a1 - b1 || a2 - b2 })
    }
    return r
  }

  /** Le prochain tour de la file, dans un moment libre du navigateur (au
   *  plus 100 ms d'attente), sinon tout de suite après */
  private planifier() {
    if (this.rappel || this.detruite) return
    const ric = (window as { requestIdleCallback?: (f: () => void, o: { timeout: number }) => number }).requestIdleCallback
    if (typeof ric === 'function') this.rappel = { id: ric.call(window, () => this.tourner(), { timeout: 100 }), inactif: true }
    else this.rappel = { id: window.setTimeout(() => this.tourner(), 0), inactif: false }
  }

  private annulerRappel() {
    const r = this.rappel
    if (!r) return
    const cic = (window as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback
    if (r.inactif && typeof cic === 'function') cic.call(window, r.id)
    else clearTimeout(r.id)
    this.rappel = null
  }

  /** Une tranche : des vignettes peintes tant qu'on reste sous 12 ms (une au
   *  moins), puis le tour suivant s'il en reste */
  private tourner() {
    this.rappel = null
    if (this.detruite) return
    // Les noms des points sont en KaTeX_Math : pas avant que la police soit là
    if (!this.apercus.policesPretes) { void this.apercus.attendrePolices().then(() => this.planifier()); return }
    const debut = performance.now()
    let file = this.file()
    if (!file.length) return
    for (const v of file) {
      this.peindre(v)
      if (performance.now() - debut >= TRANCHE) break
    }
    file = this.file()
    if (file.length) this.planifier()
  }

  private peindre(v: Vignette) {
    v.peinte = this.version(v.page)
    const c = v.c.getContext('2d')
    if (!c) return
    c.setTransform(1, 0, 0, 1, 0, 0)
    const t = this.tableau, p = t.pages.get(v.page)
    if (!(p instanceof Y.Map)) {
      // Une page sans sa Y.Map (effacée par l'ancienne suppression) : blanche
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, v.c.width, v.c.height)
      this.onPeinte?.(v.page, v.c)
      return
    }
    const formes = [...(t.formesDe(v.page)?.values() ?? [])]
    const cam = cadrageVignette(this.apercus.boite(formes), v.l, v.h)
    this.apercus.peindre(c, { fond: t.fondDe(v.page), origine: t.origineDe(v.page), formes }, cam, { l: v.l, h: v.h, dpr: v.dpr, fond: true, esquisse: true })
    const m = this.apercus.manques(formes, cam.z * v.dpr, true)
    if (m.mesures.length || m.formules.length || m.images) this.preparerPage(v.page)
    this.onPeinte?.(v.page, v.c)
  }

  // ---------- Ce qui se prépare à part ----------
  /** Les formules d'une page (leur taille exacte, leur image à l'échelle des
   *  vignettes) et ses images, une page après l'autre (les prioritaires
   *  d'abord), une formule par tâche ; puis ses vignettes se repeignent */
  private preparerPage(page: string) {
    if (!this.aPreparer.includes(page)) this.aPreparer.push(page)
    if (!this.preparation) void this.preparerLaFile()
  }

  private async preparerLaFile() {
    this.preparation = true
    try {
      while (this.aPreparer.length && !this.detruite) {
        let i = 0
        this.aPreparer.forEach((p, k) => { if ((this.priorite.get(p) ?? Infinity) < (this.priorite.get(this.aPreparer[i]) ?? Infinity)) i = k })
        const page = this.aPreparer.splice(i, 1)[0]
        try {
          const formes = [...(this.tableau.formesDe(page)?.values() ?? [])]
          const formules = formes.filter((f): f is Formule => f.type === 'formule')
          await this.apercus.formules.mesurer(formules)
          // Les tailles exactes connues, celles qui seront lisibles sur l'une de ses vignettes
          const lisibles = new Set<Formule>()
          const b = this.apercus.boite(formes)
          for (const v of this.parPage.get(page) ?? []) {
            if (!v.c.isConnected) continue
            const z = cadrageVignette(b, v.l, v.h).z
            for (const f of this.apercus.manques(formules, z * v.dpr, true).formules) lisibles.add(f)
          }
          await this.apercus.formules.preparer([...lisibles], ECHELLE_FORMULES)
          await this.apercus.decoder(formes)
        } catch { continue /* la vignette garde ses rectangles (sans boucler) */ }
        for (const v of this.parPage.get(page) ?? []) v.peinte = -1
        this.planifier()
      }
    } finally { this.preparation = false }
  }
}
