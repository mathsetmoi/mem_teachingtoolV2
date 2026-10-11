// =============================================================
// L'APERÇU D'UN CLASSEUR (sa couverture, dans la bibliothèque)
// La PREMIÈRE page de l'ordre, en petit : 320 × 200 px CSS, au dpr 1, en
// esquisse (les traits en lignes brisées, les petites formules en
// rectangles), avec son fond, cadrée comme une vignette de la trieuse
// (cadrageVignette), peinte par le même code (sorties/apercu.ts, les
// formules préparées d'abord). Puis une image PNG (canvas.toBlob), rangée
// dans l'index de la bibliothèque (Registre.ecrireApercu : son erreur est
// rattrapée, Safari en navigation privée refuse parfois un Blob ; un
// aperçu manquant n'est pas grave, la carte dit « Pas encore d'aperçu »).
//
// Quand elle se refait, sans jamais gêner l'écriture au stylet :
// - au démarrage, s'il n'y en a pas encore ;
// - quand la première page a changé (observeDeep : ce qui y est écrit, son
//   fond, son origine ; ou une autre page qui passe en tête), après 30 s
//   sans écrire, au calme (app.calme : ni geste, ni point en attente), au
//   plus une fois toutes les 2 minutes ;
// - à l'ouverture de la bibliothèque, si elle a changé (maintenant) ;
// - avant de partir vers un autre classeur (vider, dans avantDeQuitter).
// Toujours dans un moment libre du navigateur (requestIdleCallback, ou son
// repli : Safari ne l'a pas), et la peinture elle-même encore au calme : une
// couverture commencée au calme, dont les formules se préparent, attend que
// le professeur ait fini d'écrire de nouveau (sauf à l'ouverture de la
// bibliothèque et au départ, où l'on n'écrit pas). Le seul temps pris sur le
// fil principal est la peinture (la mesure et la préparation des formules se
// font une par tâche) : moins de 10 ms pour une page de 300 traits (mesuré :
// voir derniereDuree et dernierePeinture).
// Jamais poserCeQuiAttend : un double-clic au Stylo en deviendrait un point.
// =============================================================
import * as Y from 'yjs'
import type { Tableau } from '../document'
import type { Apercus } from '../sorties/apercu'
import type { Formule } from '../types'
import { ECHELLE_FORMULES, cadrageVignette } from '../pages/vignettes'

/** La taille de la couverture, en px CSS (au dpr 1) : celle de la carte, 16 / 10 */
export const APERCU = { l: 320, h: 200 } as const
/** Après le dernier changement de la première page, ce temps sans écrire */
const SANS_ECRIRE = 30_000
/** Au plus une couverture automatique dans ce temps */
const ENTRE_DEUX = 120_000
/** Au démarrage, sans couverture : un peu après le chargement */
const AU_DEMARRAGE = 3000
/** Pas au calme (un geste, un point qui attend) : on regarde de nouveau dans… */
const ATTENTE_CALME = 2000
/** Un moment libre du navigateur, au plus ce temps d'attente */
const MOMENT_LIBRE = 2000

/** Ce que l'aperçu demande à l'application */
export interface HoteApercu {
  readonly tableau: Tableau
  /** Ni geste, ni point en attente, 1,5 s depuis le dernier (voir App.calme) */
  readonly calme: boolean
}

/** Ce que l'aperçu demande à l'index de la bibliothèque */
export interface IndexApercu {
  apercu(id: string): Promise<Blob | undefined>
  ecrireApercu(id: string, image: Blob): Promise<boolean>
}

/** Un moment libre du navigateur (requestIdleCallback), ou tout de suite
 *  après (setTimeout) là où il n'existe pas, comme pages/vignettes.ts */
function momentLibre(): Promise<void> {
  return new Promise(ok => {
    const ric = (window as { requestIdleCallback?: (f: () => void, o: { timeout: number }) => number }).requestIdleCallback
    if (typeof ric === 'function') ric.call(window, () => ok(), { timeout: MOMENT_LIBRE })
    else window.setTimeout(ok, 0)
  })
}

export class ApercuDuClasseur {
  /** Une couverture vient d'être rangée dans l'index (la bibliothèque de
   *  cet onglet la montre ; les autres l'apprennent par le canal) */
  onEcrit: (() => void) | null = null
  /** La durée de la dernière peinture, sur le fil principal (ms), et quand
   *  (performance.now : les essais y cherchent une tâche longue) */
  derniereDuree = 0
  dernierePeinture: { debut: number; fin: number } | null = null
  /** La première page a changé depuis la dernière couverture */
  private sale = false
  private dernierChangement = 0
  private derniere = -Infinity
  private minuterie = 0
  private enCours: Promise<boolean> | null = null
  /** On ne l'attend plus au calme (la bibliothèque s'ouvre, on part) */
  private presse = false
  private premiere: string | null
  private arrete = false
  private observateur: (evts: Y.YEvent<any>[]) => void
  private observateurOrdre: () => void

  constructor(private hote: HoteApercu, private apercus: Apercus, private index: IndexApercu, private id: string) {
    const t = hote.tableau
    this.premiere = (t.ordre.get(0) as string | undefined) ?? null
    this.observateur = evts => {
      const p = this.premiere
      if (p === null) return
      for (const e of evts) {
        const touchee = e.target === t.pages ? (e as Y.YMapEvent<unknown>).keysChanged.has(p) : e.path[0] === p
        if (touchee) { this.salir(); return }
      }
    }
    // Une autre page passe en tête (réordonnée, la première supprimée)
    this.observateurOrdre = () => {
      const p = (t.ordre.get(0) as string | undefined) ?? null
      if (p !== this.premiere) { this.premiere = p; this.salir() }
    }
    t.pages.observeDeep(this.observateur)
    t.ordre.observe(this.observateurOrdre)
    // Pas encore de couverture : on en fait une, un peu après le démarrage
    index.apercu(id).then(a => {
      if (a || this.arrete) return
      this.sale = true
      this.armer(AU_DEMARRAGE)
    }).catch(() => { /* l'index ne se lit pas : pas d'aperçu */ })
  }

  /** Plus rien (le classeur s'en va) */
  arreter() {
    this.arrete = true
    clearTimeout(this.minuterie); this.minuterie = 0
    try { this.hote.tableau.pages.unobserveDeep(this.observateur); this.hote.tableau.ordre.unobserve(this.observateurOrdre) } catch { /* document fermé */ }
  }

  /** La première page a changé : la couverture se refera après 30 s sans
   *  écrire, au calme, au plus une fois toutes les 2 minutes */
  private salir() {
    this.sale = true
    this.dernierChangement = Date.now()
    this.armer()
  }

  private armer(dans?: number) {
    if (this.arrete) return
    clearTimeout(this.minuterie)
    const attente = dans ?? Math.max(this.dernierChangement + SANS_ECRIRE, this.derniere + ENTRE_DEUX) - Date.now()
    this.minuterie = window.setTimeout(() => this.essayer(), Math.max(0, attente))
  }

  /** L'heure est venue : seulement au calme (sinon on regarde un peu plus
   *  tard), et s'il y a toujours quelque chose à refaire */
  private essayer() {
    this.minuterie = 0
    if (this.arrete || !this.sale) return
    if (Date.now() - this.dernierChangement < SANS_ECRIRE && this.dernierChangement) { this.armer(); return }
    if (!this.hote.calme) { this.armer(ATTENTE_CALME); return }
    void this.fabriquer()
  }

  /** La bibliothèque s'ouvre : la couverture se refait si la première page
   *  a changé (sans attendre les 30 s ni les 2 minutes : on ne fait plus
   *  qu'y regarder). Vrai si elle a été refaite. */
  maintenant(): Promise<boolean> {
    if (this.enCours) { this.presse = true; return this.enCours }
    if (!this.sale || this.arrete) return Promise.resolve(false)
    this.presse = true
    return this.fabriquer()
  }

  /** On part vers un autre classeur : la couverture, si elle est à refaire */
  async vider(): Promise<void> {
    if (this.enCours) { this.presse = true; await this.enCours.catch(() => false) }
    if (this.sale && !this.arrete) { this.presse = true; await this.fabriquer().catch(() => false) }
  }

  /** Fait la couverture et la range ; vrai si elle est rangée. Une seule à
   *  la fois ; un changement pendant qu'elle se fait la fera refaire. Sa
   *  peinture attend le calme, sauf si l'on est pressé (maintenant, vider). */
  fabriquer(): Promise<boolean> {
    if (this.enCours) return this.enCours
    this.enCours = this.faire().finally(() => {
      this.enCours = null
      this.presse = false
      if (this.sale && !this.arrete) this.armer()
    })
    return this.enCours
  }

  private async faire(): Promise<boolean> {
    const t = this.hote.tableau
    const page = (t.ordre.get(0) as string | undefined) ?? null
    // Ce qui change à partir d'ici la fera refaire ; un échec ne se rejoue
    // pas en boucle (le prochain changement de la première page le refera)
    this.sale = false
    if (page === null || !(t.pages.get(page) instanceof Y.Map)) return false
    const apercus = this.apercus
    // Les polices des noms, la taille exacte des formules, celles qui se
    // liront à cette taille, les images : chacune dans sa tâche
    let formes = [...(t.formesDe(page)?.values() ?? [])]
    await apercus.mesurer(formes)
    let cam = cadrageVignette(apercus.boite(formes), APERCU.l, APERCU.h)
    const lisibles = apercus.manques(formes, cam.z, true).formules
    if (lisibles.length) await apercus.formules.preparer(lisibles as Formule[], ECHELLE_FORMULES)
    await apercus.decoder(formes)
    // Au calme, dans un moment libre : on n'écrit pas pendant qu'elle se peint
    for (;;) {
      await momentLibre()
      if (this.arrete) return false
      if (this.presse || this.hote.calme) break
      await new Promise(ok => window.setTimeout(ok, ATTENTE_CALME))
    }
    // La peinture : ce qui est écrit maintenant (une formule pas encore
    // prête y est un rectangle, et la couverture se refera)
    const debut = performance.now()
    const c = document.createElement('canvas')
    c.width = APERCU.l; c.height = APERCU.h
    const ctx = c.getContext('2d')
    if (!ctx) return false
    formes = [...(t.formesDe(page)?.values() ?? [])]
    cam = cadrageVignette(apercus.boite(formes), APERCU.l, APERCU.h)
    apercus.peindre(ctx, { fond: t.fondDe(page), origine: t.origineDe(page), formes }, cam, { l: APERCU.l, h: APERCU.h, dpr: 1, fond: true, esquisse: true })
    const fin = performance.now()
    this.derniereDuree = fin - debut
    this.dernierePeinture = { debut, fin }
    const image = await new Promise<Blob | null>(ok => { try { c.toBlob(ok, 'image/png') } catch { ok(null) } })
    this.derniere = Date.now()
    if (!image || this.arrete) return false
    const fait = await this.index.ecrireApercu(this.id, image)
    if (fait) { try { this.onEcrit?.() } catch { /* la bibliothèque se débrouille */ } }
    return fait
  }
}
