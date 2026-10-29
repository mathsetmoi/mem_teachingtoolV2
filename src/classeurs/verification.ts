// =============================================================
// VÉRIFIER LES CLASSEURS : LE SERVICE (lot 17)
// Ce que calcule verifier.ts, appliqué aux classeurs de ce navigateur :
// - les INVENTAIRES de tous les classeurs (ceux de la corbeille compris),
//   celui de cet onglet lu dans le tableau lui-même (ce qu'on vient d'écrire
//   compte), les autres par le travailleur (la demande « images » : la base
//   lue sans ouvrir le classeur, jamais créée), en série, une base à la
//   fois ; un inventaire est gardé tant que la fiche du classeur n'a pas
//   changé (sa date, son vecteur d'état) ;
// - RÉPARER un classeur : les données des images retrouvables, lues chez
//   leurs sources (chaque clé chez le premier classeur qui la rend, les
//   visibles d'abord), puis rangées dans sa banque : le classeur de cet
//   onglet, en mémoire (sa base, sa clé, sa copie Drive suivent) ; un autre,
//   lu dans un document qui ne vit nulle part et réécrit dans sa base sans
//   rien perdre (Fichiers.lireUnClasseur / ecrireUnClasseur : refus dit s'il
//   a changé entre-temps, les autres onglets prévenus). Jamais une entrée
//   existante n'est remplacée. Rien sur une page : ni étape du film, ni
//   annulation, et les séances passées retrouvent leurs images ;
// - AVANT D'EFFACER (la corbeille) : les images dont l'effacement emporterait
//   la dernière copie, recopiées d'abord dans les classeurs qui les montrent
//   encore ; une recopie qui échoue retient le classeur qu'on allait
//   effacer ;
// - À L'OUVERTURE d'un classeur (Fichiers.retrouverImages délègue ici) : les
//   images qui manquent cherchées partout, remises, et ce qui reste
//   introuvable enfin dit, avec le bouton « Vérifier les classeurs… ».
// Identique en ligne et hors ligne : tout se passe dans les bases du
// navigateur. Ni les fichiers du dossier relié ni le Drive ne sont lus.
// =============================================================
import type * as Y from 'yjs'
import type { ActionMessage, App } from '../app'
import type { Sauvegarde } from '../sauvegarde'
import type { FicheClasseur, InfosClasseur } from './demarrage'
import { dansLaCorbeille } from './demarrage'
import type { Registre } from './registre'
import type { Fichiers } from './fichiers'
import { ecrivain } from './ecrivain'
import { cheminLisible } from './arbre'
import type { ClasseurInventorie, CopieAFaire, Inventaire, LigneBilan, Source } from './verifier'
import { VERIFIER_LES_CLASSEURS, dernieresCopies, estImage, inventaireDuTableau, manquantes, ouSeTrouve, sourceDe, texteIntrouvableIci, texteRetrouvees } from './verifier'

/** Ce que le service demande à qui l'ouvre (main.ts) */
export interface HoteVerification {
  registre: Registre
  fichiers: Fichiers
  /** Le classeur ouvert dans cet onglet ; null : la bibliothèque seule */
  classeur(): InfosClasseur | null
  app?: App
  sauvegarde?: Sauvegarde
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
}

/** Ce qu'une réparation a fait : les images remises, d'où elles viennent ;
 *  erreur : ce qui a empêché d'écrire (rien n'a alors changé) */
export interface Reparation { remises: number; depuis: string[]; erreur?: string }

/** Avant d'effacer : les images à recopier d'abord, et les classeurs qu'on
 *  efface dont la base n'a pas pu être lue (on les efface quand même) */
export interface AvantEffacement { copies: CopieAFaire[]; nonVerifies: string[] }

/** Ce qu'une recopie a fait : par classeur, combien d'images ; les échecs :
 *  les classeurs qu'on allait effacer et dont les images n'ont pas pu être
 *  recopiées dans vers (à ne pas effacer) */
export interface Recopie { faites: { nom: string; n: number }[]; echecs: { depuis: { id: string; nom: string }[]; vers: string }[] }

/** Un inventaire gardé, et l'état de la fiche qui le date */
interface Garde { modifie: number; vecteur?: Uint8Array; inv: Inventaire }

const memeVecteur = (a?: Uint8Array, b?: Uint8Array) => a === b || (!!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]))

export class Verification {
  private cache = new Map<string, Garde>()
  /** Ouvre la bibliothèque puis la fenêtre « Vérifier les classeurs » (le
   *  bouton du message à l'ouverture d'un classeur) ; branché par main.ts */
  voirLaVerification: (() => void) | null = null

  constructor(private hote: HoteVerification) {}

  /** Le classeur de cet onglet, si l'on peut encore écrire dans sa mémoire
   *  (ni effacé, ni périmé, ni coupé de sa base) */
  private enMemoire(id: string): boolean {
    return !!this.hote.app && this.hote.fichiers.classeurEnMemoire()?.id === id
  }

  /** Les inventaires de tous les classeurs (ni ceux qui partent, ni ceux qui
   *  naissent ; la corbeille comprise), le plus récemment modifié d'abord,
   *  lus en série ; progres(fait, total) après chacun ; assez(lus) : on peut
   *  s'arrêter là (tout ce qu'on cherchait est trouvé) */
  async inventaires(progres?: (fait: number, total: number) => void, assez?: (lus: readonly ClasseurInventorie[]) => boolean): Promise<ClasseurInventorie[]> {
    const [fiches, dossiers] = await Promise.all([this.hote.registre.classeurs(), this.hote.registre.dossiers()])
    const carte = new Map(dossiers.map(d => [d.id, d]))
    const vivants = fiches.filter(f => f.effacement == null && f.creation == null).sort((a, b) => b.modifie - a.modifie)
    const r: ClasseurInventorie[] = []
    progres?.(0, vivants.length)
    for (const f of vivants) {
      r.push({
        id: f.id, nom: f.nom, base: f.base, chemin: f.dossier === null ? '' : cheminLisible(f.dossier, carte),
        corbeille: dansLaCorbeille(f, carte), modifie: f.modifie, inv: await this.inventaire(f),
      })
      progres?.(r.length, vivants.length)
      if (assez?.(r)) break
    }
    return r
  }

  /** L'inventaire d'un classeur : celui de cet onglet dans son tableau
   *  (après ce qui attend) ; un autre dans sa base, gardé tant que sa fiche
   *  ne change pas. null : il n'a pas pu être lu (pas gardé : on réessaiera). */
  private async inventaire(f: FicheClasseur): Promise<Inventaire | null> {
    const app = this.hote.app
    if (app && this.enMemoire(f.id)) {
      app.poserCeQuiAttend()
      return inventaireDuTableau(app.tableau)
    }
    const g = this.cache.get(f.id)
    if (g && g.modifie === f.modifie && memeVecteur(g.vecteur, f.vecteur)) return g.inv
    try {
      const x = await ecrivain.imagesDeLaBase(f.base)
      const inv = { utilisees: x.utilisees, presentes: x.presentes }
      this.cache.set(f.id, { modifie: f.modifie, vecteur: f.vecteur, inv })
      return inv
    } catch { return null }
  }

  /** Les données de ces images, lues chez leurs sources : chaque source est
   *  lue une fois, pour toutes les clés qu'elle a et qui manquent encore,
   *  dans l'ordre où les sources ont été préférées (la première source de la
   *  première clé d'abord) ; une source qui ne se lit plus est sautée */
  private async lireChez(sources: ReadonlyMap<string, readonly Source[]>, cles: readonly string[]): Promise<{ donnees: Map<string, string>; depuis: string[] }> {
    const donnees = new Map<string, string>()
    const depuis: string[] = []
    const restantes = new Set(cles)
    const parSource = new Map<string, { source: Source; cles: string[] }>()
    for (const c of cles) {
      for (const s of sources.get(c) ?? []) {
        const e = parSource.get(s.id) ?? { source: s, cles: [] }
        e.cles.push(c)
        parSource.set(s.id, e)
      }
    }
    const app = this.hote.app
    for (const { source, cles: lesSiennes } of parSource.values()) {
      const voulues = lesSiennes.filter(c => restantes.has(c))
      if (!voulues.length) continue
      let lues: Record<string, string> = {}
      try {
        if (app && this.enMemoire(source.id)) {
          // Le classeur de cet onglet : sa mémoire, pas sa base (ce qu'on vient d'écrire compte)
          const banque = app.tableau.doc.getMap('images') as Y.Map<string>
          for (const c of voulues) { const d = banque.get(c); if (estImage(d)) lues[c] = d }
        } else lues = (await ecrivain.imagesDeLaBase(source.base, voulues)).donnees
      } catch { continue }
      let une = false
      for (const [k, d] of Object.entries(lues)) if (restantes.has(k)) { donnees.set(k, d); restantes.delete(k); une = true }
      if (une) depuis.push(source.nom)
      if (!restantes.size) break
    }
    return { donnees, depuis }
  }

  /** Range ces images dans la banque de ce classeur, seulement sous les clés
   *  qu'elle n'a pas ; rend combien, ou ce qui a empêché d'écrire. fenetre :
   *  la fenêtre d'où l'on répare (elle ne compte pas comme « une fenêtre
   *  ouverte » qui interdirait de lire le classeur) */
  private async poser(cible: { id: string; nom: string }, donnees: ReadonlyMap<string, string>, fenetre?: Element | null): Promise<{ remises: number; erreur?: string }> {
    const app = this.hote.app
    this.cache.delete(cible.id)
    if (app && this.enMemoire(cible.id)) {
      const banque = app.tableau.doc.getMap('images') as Y.Map<string>
      let n = 0
      app.tableau.ecrireSansFilm(() => { for (const [k, d] of donnees) if (!banque.has(k)) { banque.set(k, d); n++ } })
      if (n) app.rendu.toutRedessiner()
      return { remises: n }
    }
    const F = await this.hote.registre.classeur(cible.id).catch(() => undefined)
    if (!F || F.effacement != null) return { remises: 0, erreur: `« ${cible.nom} » n'est plus dans la bibliothèque.` }
    let erreur = ''
    const o = { fenetre, dire: (t: string) => { erreur = t } }
    const tab = await this.hote.fichiers.lireUnClasseur(F, o)
    if (!tab) return { remises: 0, erreur: erreur || `« ${F.nom} » n'a pas pu être lu.` }
    try {
      const banque = tab.doc.getMap('images') as Y.Map<string>
      let n = 0
      tab.ecrireSansFilm(() => { for (const [k, d] of donnees) if (!banque.has(k)) { banque.set(k, d); n++ } })
      if (!n) return { remises: 0 }
      const ok = await this.hote.fichiers.ecrireUnClasseur(F, tab, o)
      return ok ? { remises: n } : { remises: 0, erreur: erreur || `« ${F.nom} » n'a pas pu être modifié.` }
    } finally { tab.doc.destroy() }
  }

  /** Réparer une ligne du bilan : ses images retrouvables, lues chez leurs
   *  sources et remises dans sa banque */
  async reparer(ligne: LigneBilan, fenetre?: Element | null): Promise<Reparation> {
    if (!ligne.retrouvables.length) return { remises: 0, depuis: [] }
    const { donnees, depuis } = await this.lireChez(ligne.sources, ligne.retrouvables)
    if (!donnees.size) return { remises: 0, depuis: [], erreur: 'Ces images n\'ont pas pu être lues dans les autres classeurs. Recommencez.' }
    const r = await this.poser(ligne, donnees, fenetre)
    return r.erreur ? { remises: 0, depuis, erreur: r.erreur } : { remises: r.remises, depuis }
  }

  /** Avant d'effacer ces classeurs : ce qu'il faudra recopier d'abord (le
   *  calcul seul, pour la question), et ceux qui n'ont pas pu être vérifiés */
  async avantDEffacer(classeurs: readonly FicheClasseur[]): Promise<AvantEffacement> {
    const aEffacer = new Set(classeurs.map(f => f.id))
    const inv = await this.inventaires()
    return { copies: dernieresCopies(inv, aEffacer), nonVerifies: inv.filter(c => aEffacer.has(c.id) && !c.inv).map(c => c.nom) }
  }

  /** Les recopies, l'une après l'autre (« Vider la corbeille » confirmé) */
  async recopier(copies: readonly CopieAFaire[]): Promise<Recopie> {
    const faites: Recopie['faites'] = [], echecs: Recopie['echecs'] = []
    for (const c of copies) {
      const sources = new Map(c.images.map(i => [i.src, [sourceDe(i.depuis)]]))
      const { donnees } = await this.lireChez(sources, c.images.map(i => i.src))
      const r = donnees.size ? await this.poser(c.vers, donnees) : { remises: 0 }
      // Ce qui n'a pas été recopié retient le classeur d'où ça vient
      const ratees = c.images.filter(i => r.erreur || !donnees.has(i.src))
      if (ratees.length) {
        const depuis = new Map(ratees.map(i => [i.depuis.id, { id: i.depuis.id, nom: i.depuis.nom }]))
        echecs.push({ depuis: [...depuis.values()], vers: c.vers.nom })
      }
      if (r.remises) faites.push({ nom: c.vers.nom, n: r.remises })
    }
    return { faites, echecs }
  }

  /** À l'ouverture du classeur de cet onglet (voir Fichiers.retrouverImages,
   *  qui a déjà dit « pas maintenant » s'il le faut) : ses images manquantes
   *  cherchées dans tous les autres classeurs, remises, et un message : ce
   *  qui a été retrouvé, et ce qui reste introuvable, avec le bouton
   *  « Vérifier les classeurs… ». Faux : rien n'a été remis. */
  async retrouverIci(): Promise<boolean> {
    const app = this.hote.app, ici = this.hote.fichiers.classeurEnMemoire()
    if (!app || !ici) return false
    const m = manquantes(inventaireDuTableau(app.tableau))
    if (!m.length) return false
    // Les autres classeurs, jusqu'à ce que tout soit trouvé
    const trouve = (lus: readonly ClasseurInventorie[]) => m.every(src => lus.some(c => c.id !== ici.id && !!c.inv && c.inv.presentes.includes(src)))
    const tous = await this.inventaires(undefined, trouve).catch(() => null)
    if (!tous || this.hote.fichiers.classeurEnMemoire()?.id !== ici.id) return false
    const sources = new Map<string, Source[]>()
    for (const src of m) { const l = ouSeTrouve(src, tous, ici.id); if (l.length) sources.set(src, l) }
    let remises = 0, depuis: string[] = []
    if (sources.size) {
      const lu = await this.lireChez(sources, [...sources.keys()])
      if (this.hote.fichiers.classeurEnMemoire()?.id !== ici.id) return false
      depuis = lu.depuis
      remises = (await this.poser(ici, lu.donnees)).remises
    }
    const introuvables = m.length - remises
    const retrouvees = remises ? texteRetrouvees(remises, depuis) : ''
    if (introuvables > 0) {
      const voir = this.voirLaVerification
      this.hote.message([retrouvees, texteIntrouvableIci(introuvables)].filter(Boolean).join(' '), voir ? { libelle: VERIFIER_LES_CLASSEURS, faire: () => voir() } : undefined)
    } else if (retrouvees) this.hote.message(retrouvees)
    return remises > 0
  }
}
