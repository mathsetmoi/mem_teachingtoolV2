// =============================================================
// LE SUIVI DU CLASSEUR OUVERT
// Sa fiche dans l'index de la bibliothèque dit quand il a changé, combien
// il a de pages et son vecteur d'état (la bibliothèque, la clé et le Drive
// s'en servent pour savoir ce qui est à jour). On l'écrit au plus toutes
// les 30 secondes pendant qu'on travaille, et tout de suite quand l'onglet
// passe en arrière-plan ou se ferme. Rien de cela n'est une sauvegarde : le
// document, lui, s'enregistre seul dans sa base (y-indexeddb). Les
// écritures qui échouent sont rattrapées : la fiche se remettra à jour à
// la prochaine.
// Chaque écriture note aussi ce classeur comme le dernier (onNote) : celui
// où l'on a écrit en dernier est celui qu'on rouvre au démarrage.
// =============================================================
import * as Y from 'yjs'
import type { Tableau } from '../document'
import type { Registre } from './registre'
import { resumeDesSeances } from '../seances'

/** Au plus une écriture de la fiche toutes les… */
const INTERVALLE = 30_000

export class SuiviDuClasseur {
  private minuterie = 0
  /** Un changement que la fiche n'a pas encore */
  private enAttente = false
  /** L'heure du dernier changement du document */
  private dernierChangement = 0
  /** L'heure de la dernière écriture de la fiche */
  private derniereEcriture = 0
  private ecriture: Promise<void> = Promise.resolve()
  /** Le classeur est effacé (lot 4 C8) : plus rien ne s'écrit */
  private arrete = false
  /** À chaque écriture de la fiche (au plus toutes les 30 s pendant qu'on
   *  travaille) : ce classeur est le dernier, celui du démarrage (main.ts) */
  onNote: (() => void) | null = null
  /** Après chaque écriture réussie de la fiche : la bibliothèque de cet
   *  onglet refait la carte de ce classeur (le canal de la bibliothèque ne
   *  revient pas à l'onglet qui écrit) */
  onEcrit: (() => void) | null = null

  /** À créer APRÈS tableau.charger() : le chargement n'est pas un changement */
  constructor(private registre: Registre, private id: string, private tableau: Tableau) {
    tableau.doc.on('update', () => this.change())
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void this.vider() })
    window.addEventListener('pagehide', () => void this.vider())
  }

  private change() {
    if (this.arrete) return
    this.dernierChangement = Date.now()
    this.enAttente = true
    if (this.minuterie) return
    const reste = Math.max(0, this.derniereEcriture + INTERVALLE - Date.now())
    this.minuterie = window.setTimeout(() => { this.minuterie = 0; void this.vider() }, reste)
  }

  /** Écrit tout de suite ce que la fiche n'a pas encore ; la promesse tient
   *  jusqu'à la fin de l'écriture (jamais rejetée) */
  vider(): Promise<void> {
    if (this.minuterie) { clearTimeout(this.minuterie); this.minuterie = 0 }
    if (!this.enAttente || this.arrete) return this.ecriture
    this.enAttente = false
    this.derniereEcriture = Date.now()
    // Tout de suite (localStorage) : en partant vers un autre classeur, le
    // suivant s'inscrit après
    try { this.onNote?.() } catch { /* rien de gardé */ }
    const modifie = this.dernierChangement
    const pages = this.tableau.ordre.length
    const rangees = this.tableau.seancesDuClasseur()
    const seances = rangees.length
    const liste = resumeDesSeances(rangees)
    const vecteur = Y.encodeStateVector(this.tableau.doc)
    this.ecriture = this.ecriture
      .then(() => this.registre.modifierClasseur(this.id, f => {
        f.modifie = Math.max(f.modifie || 0, modifie)
        f.pages = pages
        if (seances) f.seances = seances
        if (liste.length) f.listeSeances = liste
        f.vecteur = vecteur
      }))
      .then(() => { try { this.onEcrit?.() } catch { /* la carte se refera à la prochaine ouverture */ } }, () => { /* la prochaine écriture la remettra à jour */ })
    return this.ecriture
  }

  /** Le classeur s'en va (effacé) : plus d'écriture de sa fiche */
  arreter() {
    this.arrete = true
    this.enAttente = false
    if (this.minuterie) { clearTimeout(this.minuterie); this.minuterie = 0 }
  }
}
