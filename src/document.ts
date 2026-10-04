// =============================================================
// LE DOCUMENT
// Tout ce qui doit être partagé vit dans UN document Yjs (un CRDT).
// - Hors ligne, il s'enregistre dans le navigateur (IndexedDB).
// - En ligne, le même document se synchronise avec le serveur :
//   aucune ligne de code de dessin ne sait si l'on est connecté.
// - L'annulation (Y.UndoManager) ne défait que SES propres gestes,
//   jamais ceux d'un élève qui écrit en même temps.
// =============================================================
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import { Awareness } from 'y-protocols/awareness'
import type { Fond, Forme, Presence } from './types'
import { uid } from './types'

export const ORIGINE_LOCALE = 'locale'

export type EtatConnexion = 'hors-ligne' | 'connexion' | 'en-ligne' | 'injoignable'

export class Tableau {
  readonly doc = new Y.Doc()
  readonly ordre: Y.Array<string>                 // ordre des pages
  readonly pages: Y.Map<Y.Map<unknown>>           // id → { fond, formes }
  readonly reglages: Y.Map<unknown>               // réglages partagés de la séance
  readonly annulation: Y.UndoManager
  readonly presence: Awareness
  readonly moi = uid()
  salle: string | null = null
  private ws: WebsocketProvider | null = null
  private local: IndexeddbPersistence
  etat: EtatConnexion = 'hors-ligne'
  surEtat: (e: EtatConnexion) => void = () => {}

  constructor(nomLocal: string) {
    this.ordre = this.doc.getArray('ordre')
    this.pages = this.doc.getMap('pages')
    this.reglages = this.doc.getMap('reglages')
    this.presence = new Awareness(this.doc)
    // Portée : toutes les pages et ce qu'elles contiennent. Seules les
    // transactions marquées « locale » sont retenues.
    this.annulation = new Y.UndoManager(this.pages, {
      trackedOrigins: new Set([ORIGINE_LOCALE]),
      captureTimeout: 400,
    })
    this.local = new IndexeddbPersistence(nomLocal, this.doc)
  }

  /** Attend la copie locale ; crée une première page si le tableau est vide. */
  async charger(creerSiVide: boolean): Promise<void> {
    await this.local.whenSynced
    if (creerSiVide && this.ordre.length === 0) this.ajouterPage('carreaux', 0)
  }

  /** Branche le document sur une salle du serveur. Le contenu déjà présent
   *  y part tout seul : deux documents Yjs se fusionnent sans conflit. */
  connecter(serveur: string, salle: string): Promise<boolean> {
    this.salle = salle
    this.ws?.destroy()
    this.changerEtat('connexion')
    this.ws = new WebsocketProvider(serveur, salle, this.doc, { awareness: this.presence })
    this.ws.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') this.changerEtat('en-ligne')
      else if (status === 'disconnected' && this.etat !== 'connexion') this.changerEtat('injoignable')
    })
    return new Promise(resolve => {
      const fin = setTimeout(() => {
        if (this.etat !== 'en-ligne') this.changerEtat('injoignable')
        resolve(false)
      }, 4000)
      this.ws!.once('sync', (ok: boolean) => { clearTimeout(fin); resolve(ok) })
    })
  }

  private changerEtat(e: EtatConnexion) { this.etat = e; this.surEtat(e) }

  // ---------- Pages ----------
  ajouterPage(fond: Fond, position: number): string {
    const id = uid()
    this.doc.transact(() => {
      const p = new Y.Map<unknown>()
      p.set('fond', fond)
      p.set('formes', new Y.Map<Forme>())
      this.pages.set(id, p)
      this.ordre.insert(Math.min(position, this.ordre.length), [id])
    })
    return id
  }

  supprimerPage(id: string) {
    const i = this.ordre.toArray().indexOf(id)
    if (i < 0 || this.ordre.length <= 1) return
    this.doc.transact(() => { this.ordre.delete(i, 1); this.pages.delete(id) })
  }

  fondDe(page: string): Fond { return (this.pages.get(page)?.get('fond') as Fond) || 'blanc' }
  changerFond(page: string, fond: Fond, origine?: { x: number; y: number }) {
    const p = this.pages.get(page); if (!p) return
    this.doc.transact(() => { p.set('fond', fond); if (origine) p.set('origine', origine) })
  }
  origineDe(page: string) {
    return (this.pages.get(page)?.get('origine') as { x: number; y: number }) || { x: 0, y: 0 }
  }

  formesDe(page: string): Y.Map<Forme> | null {
    const f = this.pages.get(page)?.get('formes')
    return f instanceof Y.Map ? (f as Y.Map<Forme>) : null
  }

  // ---------- Formes : toutes passent par une transaction « locale » ----------
  poser(page: string, forme: Forme) {
    const formes = this.formesDe(page); if (!formes) return
    this.doc.transact(() => formes.set(forme.id, forme), ORIGINE_LOCALE)
  }

  modifier(page: string, changements: { id: string; patch: Partial<Forme> }[]) {
    const formes = this.formesDe(page); if (!formes) return
    this.doc.transact(() => {
      for (const { id, patch } of changements) {
        const f = formes.get(id)
        if (f) formes.set(id, { ...f, ...patch } as Forme)
      }
    }, ORIGINE_LOCALE)
  }

  supprimer(page: string, ids: Iterable<string>) {
    const formes = this.formesDe(page); if (!formes) return
    this.doc.transact(() => { for (const id of ids) formes.delete(id) }, ORIGINE_LOCALE)
  }

  /** Un geste = une étape d'annulation, même s'il dure longtemps. */
  nouveauGeste() { this.annulation.stopCapturing() }

  // ---------- Présence ----------
  diffuser(champs: Partial<Presence>) {
    const actuel = (this.presence.getLocalState() || {}) as Partial<Presence>
    this.presence.setLocalState({ ...actuel, ...champs })
  }

  autres(): Map<number, Presence> {
    const m = new Map<number, Presence>()
    this.presence.getStates().forEach((s, id) => {
      if (id !== this.presence.clientID && s && (s as Presence).role) m.set(id, s as Presence)
    })
    return m
  }
}
