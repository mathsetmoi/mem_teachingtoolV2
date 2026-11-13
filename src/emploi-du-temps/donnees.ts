// =============================================================
// L'EMPLOI DU TEMPS : LES DONNÉES (lot 2 de l'audit, option A)
// Le professeur saisit sa semaine une fois (ou la lit dans Pronote) ; un
// créneau dit QUAND (le jour, l'horaire, les semaines A et B) et QUELLE
// CLASSE (un dossier de la bibliothèque). Le classeur ouvert à ce créneau
// est, sauf choix contraire, le CHAPITRE EN COURS de ce dossier : le
// dernier classeur où une séance a eu lieu (il suit tout seul quand on
// change de chapitre). L'établissement est celui où la classe est rangée
// sur l'ordinateur (lot 18 : un niveau « 2 » rangé dans le dossier de LFB),
// sinon le dossier du haut de la classe (« LFB › 2 › 2nde 3 » : LFB) ; un
// créneau importé de Pronote garde celui choisi à l'import. Chacun a sa couleur.
//
// Tout vit dans l'index de la bibliothèque, sous une clé nouvelle
// (REGLAGE_EMPLOI_DU_TEMPS : aucune base ni clé existante ne change) et part
// dans le .memb comme un champ facultatif. Le lien de Pronote, personnel,
// reste dans ce navigateur (voir pronote.ts).
//
// Ce fichier est pur (sans IndexedDB ni écran) : il se teste sous Node.
// =============================================================

/** La clé de l'emploi du temps dans l'index de la bibliothèque */
export const REGLAGE_EMPLOI_DU_TEMPS = 'emploi-du-temps'

/** Les semaines d'un créneau */
export type Semaines = 'AB' | 'A' | 'B'

export interface Creneau {
  id: string
  /** 1 = lundi … 6 = samedi */
  jour: number
  /** En minutes depuis minuit : 605 = 10 h 05 */
  debut: number
  fin: number
  semaines: Semaines
  /** Le dossier de la classe dans la bibliothèque (null : pas encore choisi) */
  dossier: string | null
  /** Le nom affiché (« 2nde 3 ») ; vide : le nom du dossier */
  nom: string
  /** Facultatif */
  salle?: string
  /** Un classeur choisi pour ce créneau ; absent : le chapitre en cours */
  classeur?: string
  /** Le cours de Pronote d'où il vient (« MATHS - 2NDE3 »), et son
   *  établissement ; absent : saisi à la main */
  pronote?: string
  /** L'établissement choisi à l'import de Pronote (« LFB ») ; absent :
   *  celui du dossier de la classe (etablissementDe) */
  etablissement?: string
}

export interface EmploiDuTemps {
  v: 1
  creneaux: Creneau[]
  /** Le lundi (à minuit, heure de l'ordinateur) d'une semaine A ; les
   *  semaines alternent à partir de lui. Absent : la semaine en cours est A. */
  lundiA?: number
  /** La couleur de chaque établissement (son nom), un indice de COULEURS */
  couleurs: Record<string, number>
  /** Ce que le professeur a dit d'un cours de Pronote : le dossier de sa
   *  classe, ou null (« Ne pas importer ») */
  correspondances: Record<string, string | null>
}

export const VIDE: EmploiDuTemps = { v: 1, creneaux: [], couleurs: {}, correspondances: {} }

/** Les couleurs des établissements, dans l'ordre où ils arrivent */
export const COULEURS: readonly { nom: string; fort: string; doux: string; nuitFort: string; nuitDoux: string }[] = [
  { nom: 'Bleu', fort: '#2b5fd9', doux: '#e3ebfc', nuitFort: '#7aa2ff', nuitDoux: '#1f2b48' },
  { nom: 'Vert', fort: '#0f8a5f', doux: '#def3ea', nuitFort: '#4fd1a0', nuitDoux: '#163a2d' },
  { nom: 'Violet', fort: '#a23ca8', doux: '#f6e6f7', nuitFort: '#e08ae6', nuitDoux: '#3a1f3c' },
  { nom: 'Orange', fort: '#b4540a', doux: '#fcecdc', nuitFort: '#f0a35b', nuitDoux: '#3a2816' },
  { nom: 'Rouge', fort: '#c0392b', doux: '#fbe5e2', nuitFort: '#ff8a7a', nuitDoux: '#40201c' },
  { nom: 'Gris', fort: '#55607a', doux: '#e8eaf0', nuitFort: '#a7b0c4', nuitDoux: '#2a303d' },
]

export const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const

/** Ce qu'on voit d'un créneau avant l'heure : 10 minutes (« Bonjour ! ») */
export const AVANCE_ACCUEIL = 10
/** La bulle « … arrive » : 5 minutes avant, jusqu'à 10 minutes après le début */
export const AVANCE_BULLE = 5
export const RETARD_BULLE = 10

const ID = /^[0-9a-f]{16}$/

/** Ce qu'il faut savoir d'un dossier de la bibliothèque */
/** Un dossier de la bibliothèque, tel que l'emploi du temps le lit.
 *  etablissement : l'établissement (lot 18) dans le dossier duquel ce
 *  dossier est rangé sur l'ordinateur, posé à la lecture (moment.ts) */
export interface DossierMin { id: string; nom: string; parent: string | null; corbeille?: unknown; etablissement?: string }

/** Un id (16 chiffres hexadécimaux), comme ceux de la bibliothèque */
export function idCreneau(): string {
  const o = new Uint8Array(8)
  crypto.getRandomValues(o)
  return [...o].map(x => x.toString(16).padStart(2, '0')).join('')
}

const entier = (x: unknown, min: number, max: number): number | null =>
  typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : null
const texte = (x: unknown, max: number): string => typeof x === 'string' ? x.trim().slice(0, max) : ''

/** Un créneau relu : null s'il n'a pas la bonne forme */
export function lireCreneau(x: unknown): Creneau | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const jour = entier(o.jour, 1, 6), debut = entier(o.debut, 0, 24 * 60 - 1), fin = entier(o.fin, 1, 24 * 60)
  if (typeof o.id !== 'string' || !ID.test(o.id) || jour === null || debut === null || fin === null || fin <= debut) return null
  const semaines: Semaines = o.semaines === 'A' || o.semaines === 'B' ? o.semaines : 'AB'
  const c: Creneau = { id: o.id, jour, debut, fin, semaines, dossier: typeof o.dossier === 'string' && o.dossier ? o.dossier : null, nom: texte(o.nom, 60) }
  const salle = texte(o.salle, 30); if (salle) c.salle = salle
  if (typeof o.classeur === 'string' && o.classeur) c.classeur = o.classeur
  const pronote = texte(o.pronote, 200); if (pronote) c.pronote = pronote
  const etablissement = texte(o.etablissement, 60); if (etablissement) c.etablissement = etablissement
  return c
}

/** L'emploi du temps relu de l'index (ou d'un .memb) : ce qui n'a pas la
 *  bonne forme est laissé de côté ; rien de lisible : vide */
export function lireEmploiDuTemps(x: unknown): EmploiDuTemps {
  if (!x || typeof x !== 'object') return { ...VIDE, creneaux: [], couleurs: {}, correspondances: {} }
  const o = x as Record<string, unknown>
  const creneaux: Creneau[] = []
  for (const c of Array.isArray(o.creneaux) ? o.creneaux : []) {
    const l = lireCreneau(c)
    if (l && !creneaux.some(y => y.id === l.id)) creneaux.push(l)
  }
  const couleurs: Record<string, number> = {}
  if (o.couleurs && typeof o.couleurs === 'object') {
    for (const [k, v] of Object.entries(o.couleurs as Record<string, unknown>)) {
      const n = entier(v, 0, COULEURS.length - 1)
      if (k && n !== null) couleurs[k] = n
    }
  }
  const correspondances: Record<string, string | null> = {}
  if (o.correspondances && typeof o.correspondances === 'object') {
    for (const [k, v] of Object.entries(o.correspondances as Record<string, unknown>)) {
      if (k && (v === null || (typeof v === 'string' && v))) correspondances[k] = v as string | null
    }
  }
  const e: EmploiDuTemps = { v: 1, creneaux: trier(creneaux), couleurs, correspondances }
  if (typeof o.lundiA === 'number' && Number.isFinite(o.lundiA)) e.lundiA = o.lundiA
  return e
}

/** Par jour, puis par heure */
export function trier(l: Creneau[]): Creneau[] {
  return l.sort((a, b) => a.jour - b.jour || a.debut - b.debut || a.fin - b.fin || (a.id < b.id ? -1 : 1))
}

// ---------- Les heures ----------
/** 605 → « 10 h 05 » ; 480 → « 8 h » */
export function heureDite(m: number): string {
  const h = Math.floor(m / 60), mn = m % 60
  return mn ? `${h} h ${String(mn).padStart(2, '0')}` : `${h} h`
}

/** « 10 h 05 – 11 h 00 » : les deux heures en entier (on compare des horaires) */
export function horaireDit(c: { debut: number; fin: number }): string {
  const e = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
  return `${e(c.debut)} – ${e(c.fin)}`
}

/** Ce qu'on tape (« 10h05 », « 10 h 05 », « 10:05 », « 10 ») → 605 ; null : illisible */
export function lireHeure(t: string): number | null {
  const m = /^\s*(\d{1,2})\s*(?:[h:.]\s*(\d{0,2}))?\s*$/i.exec(t)
  if (!m) return null
  const h = Number(m[1]), mn = m[2] ? Number(m[2]) : 0
  if (h > 23 || mn > 59) return null
  return h * 60 + mn
}

// ---------- Les semaines A et B ----------
const JOUR_MS = 86_400_000

/** Le lundi à minuit (heure de l'ordinateur) de la semaine d'une date */
export function lundiDe(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  const decalage = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - decalage)
  return d.getTime()
}

/** Le nombre de semaines entre deux lundis (arrondi : les changements d'heure) */
const semainesEntre = (a: number, b: number) => Math.round((b - a) / (7 * JOUR_MS))

/** La semaine (A ou B) d'une date */
export function semaineDe(e: Pick<EmploiDuTemps, 'lundiA'>, t: number): 'A' | 'B' {
  const ici = lundiDe(t)
  const ref = e.lundiA ?? ici
  return ((semainesEntre(ref, ici) % 2) + 2) % 2 === 0 ? 'A' : 'B'
}

/** « On est en semaine B » : la semaine de cette date devient celle-là, et
 *  l'alternance repart de là */
export function direLaSemaine(e: EmploiDuTemps, t: number, voulue: 'A' | 'B'): EmploiDuTemps {
  const ici = lundiDe(t)
  return { ...e, lundiA: voulue === 'A' ? ici : lundiDe(ici + 7 * JOUR_MS + JOUR_MS / 2) }
}

/** Il y a des créneaux d'une seule semaine : A et B ont un sens */
export const avecSemainesAB = (e: EmploiDuTemps) => e.creneaux.some(c => c.semaines !== 'AB')

/** Le jour (1 = lundi … 7 = dimanche) et la minute d'une date */
export function jourEtMinute(t: number): { jour: number; minute: number } {
  const d = new Date(t)
  return { jour: ((d.getDay() + 6) % 7) + 1, minute: d.getHours() * 60 + d.getMinutes() }
}

/** Ce que le lien de Pronote sait d'un jour : les établissements qu'il
 *  couvre ce jour-là, et leurs cours de ce jour (un cours déplacé, une
 *  salle changée ; un cours annulé ou des vacances : aucun) */
export interface JourDuLien { etablissements: ReadonlySet<string>; creneaux: Creneau[] }

/** Les créneaux d'un jour, par heure. lien : pour les établissements qu'il
 *  couvre ce jour-là, ses cours remplacent la semaine type. */
export function creneauxDuJour(e: EmploiDuTemps, t: number, dossiers: readonly DossierMin[] = [], lien?: JourDuLien | null): Creneau[] {
  const { jour } = jourEtMinute(t)
  const s = semaineDe(e, t)
  const type = e.creneaux.filter(c => c.jour === jour && c.semaines.includes(s))
  if (!lien || !lien.etablissements.size) return trier(type)
  const gardes = type.filter(c => { const n = etablissementDuCreneau(c, dossiers); return !n || !lien.etablissements.has(n) })
  return trier([...gardes, ...lien.creneaux])
}

/** Le créneau du moment : en cours, ou qui commence dans moins de `avance`
 *  minutes (le plus proche s'ils se touchent : à 10 h 58, celui de 11 h 05
 *  plutôt que celui qui finit à 11 h) ; null : aucun */
export function creneauDuMoment(jour: readonly Creneau[], t: number, avance = AVANCE_ACCUEIL): Creneau | null {
  const { minute } = jourEtMinute(t)
  const bientot = jour.filter(c => c.debut > minute && c.debut - minute <= avance).sort((a, b) => a.debut - b.debut)
  const enCours = jour.filter(c => c.debut <= minute && minute < c.fin).sort((a, b) => b.debut - a.debut)
  // Le cours d'avant finit dans quelques minutes et le suivant arrive : le suivant
  if (bientot.length && (!enCours.length || enCours[0].fin - minute <= avance)) return bientot[0]
  return enCours[0] ?? bientot[0] ?? null
}

/** Le prochain créneau du jour, après ce moment (qui n'a pas commencé) */
export function prochainCreneau(jour: readonly Creneau[], t: number): Creneau | null {
  const { minute } = jourEtMinute(t)
  return jour.filter(c => c.debut > minute).sort((a, b) => a.debut - b.debut)[0] ?? null
}

/** La bulle : le créneau qui commence dans moins de 5 minutes, ou a
 *  commencé il y a moins de 10 minutes */
export function creneauDeLaBulle(jour: readonly Creneau[], t: number): Creneau | null {
  const { minute } = jourEtMinute(t)
  return jour.filter(c => c.debut - minute <= AVANCE_BULLE && minute - c.debut < RETARD_BULLE)
    .sort((a, b) => Math.abs(a.debut - minute) - Math.abs(b.debut - minute))[0] ?? null
}

// ---------- Les établissements et leurs couleurs ----------
/** Le chemin d'un dossier, du haut à lui : [LFB, 2, 2nde 3] (borné : un cycle s'arrête) */
export function cheminDuDossier(id: string | null, dossiers: readonly DossierMin[]): DossierMin[] {
  const carte = new Map(dossiers.map(d => [d.id, d]))
  const l: DossierMin[] = []
  const vus = new Set<string>()
  for (let x = id ? carte.get(id) : undefined; x && !vus.has(x.id); x = x.parent ? carte.get(x.parent) : undefined) { vus.add(x.id); l.unshift(x) }
  return l
}

/** L'établissement d'un dossier : celui où lui, ou le plus proche de ses
 *  parents, est rangé sur l'ordinateur (lot 18 : « 2 », rangé dans le
 *  dossier de LFB : LFB) ; sinon le nom du dossier du haut de son chemin
 *  (« LFB › 2 › 2nde 3 » : LFB) ; null : pas de dossier */
export function etablissementDe(id: string | null, dossiers: readonly DossierMin[]): string | null {
  const chemin = cheminDuDossier(id, dossiers)
  for (let i = chemin.length - 1; i >= 0; i--) if (chemin[i].etablissement) return chemin[i].etablissement!
  return chemin[0]?.nom ?? null
}

/** L'établissement d'un créneau : celui choisi à l'import, sinon celui de sa classe */
export function etablissementDuCreneau(c: Pick<Creneau, 'dossier' | 'etablissement'>, dossiers: readonly DossierMin[]): string | null {
  return c.etablissement || etablissementDe(c.dossier, dossiers)
}

/** Les établissements à proposer : ceux des dossiers de la bibliothèque,
 *  ceux du lot 18 (même sans dossier rangé chez eux), ceux déjà dans
 *  l'emploi du temps ; par nom */
export function etablissementsConnus(dossiers: readonly DossierMin[], autres: Iterable<string> = []): string[] {
  const noms = new Set<string>()
  for (const d of dossiers) { const n = etablissementDe(d.id, dossiers); if (n) noms.add(n) }
  for (const n of autres) if (n) noms.add(n)
  return [...noms].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
}

/** Les dossiers d'un établissement */
export const dossiersDe = <D extends DossierMin>(nom: string, dossiers: readonly D[]): D[] =>
  dossiers.filter(d => etablissementDe(d.id, dossiers) === nom)

/** Donne une couleur aux établissements qui n'en ont pas : la première libre */
export function colorier(e: EmploiDuTemps, noms: Iterable<string>): EmploiDuTemps {
  let couleurs = e.couleurs
  for (const n of noms) {
    if (n in couleurs) continue
    const prises = new Set(Object.values(couleurs))
    let k = 0
    while (prises.has(k) && k < COULEURS.length - 1) k++
    if (prises.has(k)) k = Object.keys(couleurs).length % COULEURS.length
    couleurs = { ...couleurs, [n]: k }
  }
  return couleurs === e.couleurs ? e : { ...e, couleurs }
}

// ---------- Le classeur d'un créneau ----------
interface ClasseurMin { id: string; nom: string; dossier: string | null; ouvert: number; modifie: number; corbeille?: unknown; effacement?: unknown; creation?: unknown; listeSeances?: { debut: number }[] }

/** Les dossiers et tout ce qui est dedans */
export function sousDossiers(racine: string, dossiers: readonly DossierMin[]): Set<string> {
  const r = new Set([racine])
  for (let change = true; change;) {
    change = false
    for (const d of dossiers) if (d.parent !== null && r.has(d.parent) && !r.has(d.id)) { r.add(d.id); change = true }
  }
  return r
}

/** Le moment de la dernière séance d'un classeur (sinon sa dernière ouverture) */
const derniereSeance = (f: ClasseurMin) => Math.max(0, ...(f.listeSeances ?? []).map(s => s.debut)) || f.ouvert

/** Le classeur que le créneau ouvre : le classeur choisi s'il existe encore ;
 *  sinon le chapitre en cours du dossier de la classe (ses sous-dossiers
 *  compris) : celui de la dernière séance, hors « Séances isolées » (sauf
 *  s'il n'y a que lui) ; null : la classe n'a aucun classeur */
export function classeurDuCreneau<F extends ClasseurMin>(c: Creneau, classeurs: readonly F[], dossiers: readonly DossierMin[], estIsolees: (f: F) => boolean): F | null {
  const ouvrables = classeurs.filter(f => !f.corbeille && !f.effacement && !f.creation)
  if (c.classeur) {
    const f = ouvrables.find(x => x.id === c.classeur)
    if (f) return f
  }
  if (!c.dossier) return null
  const vivants = dossiers.filter(d => !d.corbeille)
  if (!vivants.some(d => d.id === c.dossier)) return null
  const tous = sousDossiers(c.dossier, vivants)
  const l = ouvrables.filter(f => f.dossier !== null && tous.has(f.dossier))
    .sort((a, b) => derniereSeance(b) - derniereSeance(a) || b.ouvert - a.ouvert || b.modifie - a.modifie)
  return l.find(f => !estIsolees(f)) ?? l[0] ?? null
}

/** Le nom à l'écran : le nom tapé, sinon celui du dossier */
export function nomDuCreneau(c: Creneau, dossiers: readonly DossierMin[]): string {
  return c.nom || dossiers.find(d => d.id === c.dossier)?.nom || 'Classe à choisir'
}

/** Le .memb : les dossiers changent d'id en arrivant (correspondance) ; un
 *  créneau dont le dossier n'est pas arrivé garde son horaire, sans classe ;
 *  un classeur choisi qui n'existe pas ici redevient « le chapitre en cours » */
export function adopter(e: EmploiDuTemps, correspondance: ReadonlyMap<string, string>, classeursIci: ReadonlySet<string>): EmploiDuTemps {
  const dossier = (d: string | null) => d ? correspondance.get(d) ?? null : null
  return {
    ...e,
    creneaux: e.creneaux.map(c => {
      const n: Creneau = { ...c, dossier: dossier(c.dossier) }
      if (n.classeur && !classeursIci.has(n.classeur)) delete n.classeur
      return n
    }),
    correspondances: Object.fromEntries(Object.entries(e.correspondances).map(([k, v]) => [k, v === null ? null : dossier(v)]).filter(([, v]) => v !== undefined)),
  }
}
