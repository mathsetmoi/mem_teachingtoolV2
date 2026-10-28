// =============================================================
// RANGER LES SÉANCES D'UN CLASSEUR DEPUIS LA BIBLIOTHÈQUE
// Supprimer une séance, la déplacer vers un autre classeur, et défaire l'un
// ou l'autre (« Annuler »). Renommer et changer l'ordre sont des méthodes
// du Tableau (renommerSeance, rangerLesSeances).
//
// SUPPRIMER : les pages de la séance vont dans la corbeille des pages du
// classeur (jeterPages) : on les y retrouve, et « Remettre » rend chacune à
// sa séance. Une séance sans page ne se montre plus nulle part (voir
// seances.resumeDesSeances, Tableau.derniereSeance) ; sa fiche reste, et sa
// plage du film aussi : les autres séances gardent exactement la leur.
//
// DÉPLACER : la séance est rejouée dans l'autre classeur, geste après
// geste, chacun à son heure : ses pages, son nom, sa date, son film, ce que
// les instruments ont montré pendant elle, les images qu'elle montre, et
// ses publications (republier depuis le nouveau classeur garde le même
// lien). Puis ses pages quittent le classeur d'origine pour de bon (jetées
// et marquées définitives : elles ne sont plus dans sa corbeille ; leur
// histoire y reste, comme pour toute page supprimée définitivement).
// Les pages reçoivent de nouveaux identifiants : une séance déplacée puis
// ramenée ne rencontre jamais ses anciennes pages.
//
// LE FILM D'UN CLASSEUR se lit dans l'ordre des heures, et chaque séance y
// a une plage d'étapes qui se suivent (voir revoir/exporter.ts,
// seancesExplicitesDuFilm). Les étapes de la séance déplacée s'insèrent donc
// À LEUR HEURE parmi celles du classeur, et ne doivent en croiser aucune :
// un classeur qui a déjà quelque chose pendant le temps de la séance (une
// autre séance à la même heure, la même séance reprise deux fois d'un
// ancien tableau) la refuse ('chevauche').
// Chaque étape garde un instantané du document (Y.snapshot). Celui d'une
// étape insérée au milieu du film doit montrer le classeur TEL QU'IL ÉTAIT à
// cette heure-là, plus la séance déplacée telle qu'elle était à ce geste :
// on le compose, avec l'instantané de l'étape d'avant (ce qui existait
// alors) et ce que ce document-ci a écrit de la séance jusque-là (tout ce
// qu'il écrit vient de lui seul : son client Yjs, neuf). Les étapes des
// séances d'après, écrites avant le déplacement, ne voient pas la séance :
// chaque lecteur du film n'y regarde que les pages de sa propre séance.
// Celles qui tombent dans SA plage (ce qui n'est pas un geste, fait après
// coup, avant la séance suivante : une page jetée, un rangement) sont
// réécrites après elle, chacune avec son instantané complété de la séance.
//
// Pur (ni interface ni base) : se teste sous Node.
// =============================================================
import * as Y from 'yjs'
import type { EtatDePage, Etape, Tableau } from './document'
import type { FicheSeance } from './seances'
import { ficheValable } from './seances'
import type { Forme } from './types'
import { uid } from './types'
import type { Morceau } from './revoir/instruments-film'

/** Pourquoi une séance ne se déplace pas : elle n'existe plus, elle n'a
 *  aucune page, ou le classeur d'arrivée a déjà quelque chose pendant elle */
export type RefusDeplacement = 'absente' | 'vide' | 'chevauche'

/** Une séance arrivée dans un classeur : son id, ses pages (les nouveaux
 *  identifiants, dans l'ordre), ses étapes du film */
export interface SeanceArrivee { seance: string; pages: string[]; etapes: number }

/** Le temps des instruments autour des gestes de la séance (ms) : ce qu'ils
 *  montraient juste avant le premier geste, et juste après le dernier */
const MARGE_PISTE = 2000

// ---------- Supprimer ----------
/** Supprime une séance : ses pages vont dans la corbeille du classeur. Rend
 *  ses pages (à rendre par Tableau.rendrePages pour annuler) ; 'seule' : ce
 *  sont toutes les pages du classeur (on ne vide pas un classeur : c'est le
 *  classeur qu'on supprime) ; 'absente' : rien à supprimer. */
export function supprimerSeance(t: Tableau, id: string): { pages: string[] } | { refus: 'seule' | 'absente' } {
  t.ecrireLesSeances()
  const s = t.seancesDuClasseur().find(x => x.id === id)
  if (!s || !s.pages.length) return { refus: 'absente' }
  if (s.pages.length >= t.ordre.length) return { refus: 'seule' }
  const parties = t.jeterPages(s.pages)
  return parties.length ? { pages: parties } : { refus: 'seule' }
}

// ---------- Déplacer ----------
/** Deux états d'une page diffèrent-ils (les formes inchangées sont les mêmes objets) ? */
function differe(a: EtatDePage | null | undefined, b: EtatDePage | null | undefined): boolean {
  if (!a || !b) return !!a !== !!b
  if (a.fond !== b.fond || !!a.nuit !== !!b.nuit || a.origine.x !== b.origine.x || a.origine.y !== b.origine.y || a.formes.size !== b.formes.size) return true
  for (const [id, f] of b.formes) if (a.formes.get(id) !== f) return true
  return false
}

/** L'instantané d'une étape insérée : `base` (le classeur tel qu'il était
 *  à l'étape d'avant), plus tout ce que le client `moi` a écrit jusqu'ici */
function instantane(doc: Y.Doc, base: Y.Snapshot, moi: number): Uint8Array {
  const ici = Y.snapshot(doc)
  const sv = new Map(base.sv)
  const n = ici.sv.get(moi)
  if (n !== undefined) sv.set(moi, n)
  const ds = Y.createDeleteSet()
  for (const [c, l] of base.ds.clients) if (c !== moi) ds.clients.set(c, l)
  const miens = ici.ds.clients.get(moi)
  if (miens) ds.clients.set(moi, miens.slice())
  return Y.encodeSnapshot(Y.createSnapshot(ds, sv))
}

/** Copie la séance `id` de `source` dans `cible`, à sa date, avec son film
 *  (voir l'en-tête). `cible` est un document qui ne vit nulle part (un
 *  Tableau(null) où l'on a lu le classeur d'arrivée) : tout ce qu'il écrit
 *  vient de son seul client. Rien n'est retiré de `source`. */
export function copierSeance(source: Tableau, id: string, cible: Tableau): SeanceArrivee | { refus: RefusDeplacement } {
  const s = source.seancesDuClasseur().find(x => x.id === id)
  if (!s) return { refus: 'absente' }
  const P = s.pages
  if (!P.length) return { refus: 'vide' }

  // Les gestes de la séance : chaque étape du film où l'une de ses pages change
  const pas: { e: Etape; changees: string[]; etats: Map<string, EtatDePage | null> }[] = []
  const vu = new Map<string, EtatDePage | null>()
  for (const e of source.film.toArray()) {
    const etats = source.pagesA(e, P)
    const changees = P.filter(p => differe(vu.get(p), etats.get(p)))
    if (!changees.length) continue
    for (const p of changees) vu.set(p, etats.get(p) ?? null)
    pas.push({ e, changees, etats })
  }
  // Une page que le film ne connaît pas (un tableau très ancien) : telle qu'elle est, au premier geste
  const absentes = P.filter(p => !vu.get(p))
  if (absentes.length) {
    const actuel = new Map<string, EtatDePage | null>()
    for (const p of absentes) {
      const f = source.formesDe(p)
      actuel.set(p, { fond: source.fondDe(p), ...(source.nuitDe(p) ? { nuit: true } : {}), origine: source.origineDe(p), formes: new Map([...(f?.entries() ?? [])]) })
    }
    if (pas.length) { for (const p of absentes) { pas[0].etats.set(p, actuel.get(p)!); pas[0].changees.push(p) } }
    else pas.push({ e: { t: s.debut, page: absentes[0], s: new Uint8Array() }, changees: absentes, etats: actuel })
  }
  const lo = Math.min(pas[0].e.t, s.depuis, s.debut), hi = Math.max(pas[pas.length - 1].e.t, s.debut)

  // Le classeur d'arrivée : un document où ce client n'a encore rien écrit
  // (voir l'en-tête), rien pendant la séance, et sa place dans le film
  if (cible.doc.store.clients.has(cible.doc.clientID)) throw new Error('Le classeur d\'arrivée doit être lu dans un document neuf.')
  cible.ecrireLesSeances()
  const film = cible.film.toArray()
  const autres = cible.seancesDuClasseur()
  if (autres.some(x => (x.debut >= lo && x.debut <= hi) || (x.depuis >= lo && x.depuis <= hi))) return { refus: 'chevauche' }
  if (film.some(e => e.t >= lo && e.t <= hi)) return { refus: 'chevauche' }
  const apres = autres.filter(x => x.depuis > hi).sort((a, b) => a.depuis - b.depuis)[0]
  // Les étapes entre elle et la séance suivante (ou le bout du film) seront
  // de sa plage : aucun geste (une séance d'avant qui continuerait après elle
  // serait coupée en deux), seulement ce qui n'en est pas un (une page jetée
  // ou remise après coup, un rangement : voir Etape). Celles-là sont
  // réécrites après elle, leur instantané complété de la séance (voir plus
  // bas) : sans quoi, à la fin de sa plage, ses pages sembleraient partir.
  const geste = (e: Etape) => !(e.seulOrdre || e.naissance || e.rangement || e.reglage)
  const suite = film.filter(e => e.t > hi && (!apres || e.t < apres.depuis))
  if (suite.some(geste)) return { refus: 'chevauche' }
  // La séance devient la première : rien ne la précède dans le film
  if (!autres.some(x => x.debut < lo) && film.some(e => e.t < lo)) return { refus: 'chevauche' }
  const idx = film.filter(e => e.t < lo).length
  if (suite.some(e => film.indexOf(e) < idx || film.indexOf(e) >= idx + suite.length)) return { refus: 'chevauche' }
  const base = idx > 0 ? Y.decodeSnapshot(film[idx - 1].s) : Y.emptySnapshot
  const moi = cible.doc.clientID

  // Les identifiants : de nouvelles pages ; la séance garde le sien s'il est libre
  const neuf = new Map(P.map(p => [p, uid()]))
  const sid = cible.seances.has(id) ? uid() : id
  const rangDans = new Map(P.map((p, i) => [p, i]))
  const deLaSuite = new Set(autres.filter(x => x.debut > hi).flatMap(x => x.pages))
  const origineDe = new Map([...neuf].map(([a, b]) => [b, a]))

  // Les images : la banque du classeur d'arrivée les reçoit ; une autre
  // image sous le même nom en prend un nouveau
  const banqueS = source.doc.getMap('images') as Y.Map<string>
  const banqueC = cible.doc.getMap('images') as Y.Map<string>
  const nomsImages = new Map<string, string>()
  const aPoser = new Map<string, string>()
  const copies = new Map<Forme, Forme>()
  const forme = (f: Forme): Forme => {
    if (f.type !== 'image') return f
    let c = copies.get(f)
    if (c) return c
    let n = nomsImages.get(f.src)
    if (n === undefined) {
      const d = banqueS.get(f.src)
      n = f.src
      if (d !== undefined) {
        const deja = banqueC.get(f.src)
        if (deja === undefined) aPoser.set(f.src, d)
        else if (deja !== d) { n = uid(); aPoser.set(n, d) }
      }
      nomsImages.set(f.src, n)
    }
    c = n === f.src ? f : { ...f, src: n }
    copies.set(f, c)
    return c
  }

  const etapes: Etape[] = []
  const ecrit = new Map<string, EtatDePage | null>()
  for (const { e, changees, etats } of pas) {
    cible.ecrireSansFilm(() => {
      for (const p of changees) {
        const etat = etats.get(p)
        if (!etat) continue
        const nid = neuf.get(p)!
        const avant = ecrit.get(p)
        let m = cible.pages.get(nid)
        if (!(m instanceof Y.Map)) {
          m = new Y.Map<unknown>()
          m.set('fond', etat.fond)
          if (etat.nuit) m.set('nuit', true)
          if (etat.origine.x || etat.origine.y) m.set('origine', etat.origine)
          m.set('formes', new Y.Map<Forme>())
          const de = source.herite(p)
          if (de && neuf.has(de)) m.set('herite', { de: neuf.get(de) })
          cible.pages.set(nid, m)
          // Sa place : avant les pages des séances d'après, parmi les siennes dans leur ordre
          const ordre = cible.ordre.toArray()
          let place = ordre.findIndex(q => deLaSuite.has(q) || (origineDe.has(q) && rangDans.get(origineDe.get(q)!)! > rangDans.get(p)!))
          if (place < 0) place = ordre.length
          cible.ordre.insert(place, [nid])
          cible.seanceDesPages.set(nid, sid)
        } else {
          if (!avant || avant.fond !== etat.fond) m.set('fond', etat.fond)
          if (!!avant?.nuit !== !!etat.nuit) m.set('nuit', !!etat.nuit)
          if (!avant || avant.origine.x !== etat.origine.x || avant.origine.y !== etat.origine.y) m.set('origine', etat.origine)
        }
        const formes = m.get('formes') as Y.Map<Forme>
        for (const [fid, f] of etat.formes) if (avant?.formes.get(fid) !== f) formes.set(fid, forme(f))
        if (avant) for (const fid of avant.formes.keys()) if (!etat.formes.has(fid)) formes.delete(fid)
        ecrit.set(p, etat)
      }
      // Les images que ces formes montrent, dans la même étape qu'elles :
      // forme() ne les note qu'en copiant leurs formes, juste au-dessus
      for (const [n, d] of aPoser) { if (!banqueC.has(n)) banqueC.set(n, d) }
      aPoser.clear()
    })
    const x: Etape = { t: e.t, page: neuf.get(e.page) ?? neuf.get(changees[0])!, s: instantane(cible.doc, base, moi) }
    if (e.ms) x.ms = e.ms
    if (e.naissance) x.naissance = true
    if (e.rangement) x.rangement = true
    if (e.reglage) x.reglage = true
    if (e.coupe) x.coupe = true
    etapes.push(x)
  }
  // Les étapes d'après, jusqu'à la séance suivante : les mêmes, qui voient la séance
  const reecrites = suite.map(e => ({ ...e, s: instantane(cible.doc, Y.decodeSnapshot(e.s), moi) }))
  cible.ecrireSansFilm(() => {
    if (reecrites.length) cible.film.delete(idx, reecrites.length)
    cible.film.insert(idx, [...etapes, ...reecrites])
  })

  // Hors des pages : sa fiche, les noms de ses pages, ses publications
  const avant = source.seances.get(id)
  const fiche: FicheSeance = { debut: s.debut }
  if (s.nom) fiche.nom = s.nom
  if (lo < s.debut || s.depuis !== s.debut) fiche.depuis = Math.min(lo, s.depuis)
  if (s.ancienne || (ficheValable(avant) && avant.ancienne)) fiche.ancienne = true
  const publications = source.doc.getMap('publications')
  const registre = cible.doc.getMap('publications')
  cible.doc.transact(() => {
    cible.seances.set(sid, fiche)
    for (const p of P) { const n = source.nomDe(p); if (n) cible.noms.set(neuf.get(p)!, n) }
    for (const [k, v] of publications) if (k.endsWith(`:${s.debut}`) && !registre.has(k)) registre.set(k, v)
  })
  // Ce que les instruments ont montré pendant elle
  const piste = (source.piste.toArray() as Morceau[])
    .filter(m => m.t >= lo - MARGE_PISTE && m.t <= hi + MARGE_PISTE && (!m.p || neuf.has(m.p)))
    .map(m => (m.p ? { ...m, p: neuf.get(m.p)! } : m))
  cible.noterPiste(piste)
  return { seance: sid, pages: P.map(p => neuf.get(p)!), etapes: etapes.length }
}

/** Retire une séance copiée ailleurs de son classeur d'origine : ses pages
 *  quittent l'ordre et ne sont plus dans la corbeille (Tableau.rendrePages
 *  les rend, pour annuler). Comme supprimerSeance pour les refus. */
export function retirerSeance(t: Tableau, id: string): { pages: string[] } | { refus: 'seule' | 'absente' } {
  const r = supprimerSeance(t, id)
  if ('pages' in r) t.marquerDefinitives(r.pages)
  return r
}
