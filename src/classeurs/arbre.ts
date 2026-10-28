// =============================================================
// L'ARBRE DE LA BIBLIOTHÈQUE (un modèle pur)
// Les dossiers imbriqués et colorés, les étiquettes de niveau, le tri.
// Le professeur range PAR NIVEAU (« 5ème », « 2nde » : un dossier = un niveau,
// pas une classe 5A / 5B, décision du 19 octobre 2026) : un dossier « 5ème »,
// puis un classeur par chapitre (« Symétrie centrale ») ; le rangement par
// chapitre reste possible (un dossier « Symétrie », un classeur par niveau),
// et les étiquettes de niveau retrouvent alors les classeurs d'un niveau d'un
// seul geste. Les identifiants du code (rangDeClasse, etiquette…) gardent
// leur nom : seuls les textes disent « niveau ».
//
// Une étiquette de niveau est PROPRE à un classeur (au plus 3, posées à la
// main), ou HÉRITÉE du plus proche dossier de niveau qui le contient.
// L'héritée est calculée ici, jamais écrite : un classeur glissé dans
// « 5e B » est aussitôt dans le filtre « 5e B », et en sort s'il en sort.
//
// Toute remontée vers la racine passe par parents() (demarrage.ts) : bornée
// (64 niveaux, les dossiers déjà vus), et un cycle vaut la racine. Deux
// onglets qui déplacent chacun un dossier dans l'autre font un cycle
// A → B → A, que deplacerDossier ne peut pas voir à la fois des deux côtés :
// chaque dossier du cycle se montre alors à la racine, et rien ne boucle.
//
// Ce fichier est pur (sans DOM ni IndexedDB) : il se teste sous Node.
// =============================================================
import type { FicheClasseur, FicheDossier } from './demarrage'
import { LONGUEUR_NOM_CLASSEUR, LONGUEUR_NOM_DOSSIER, parents, visible } from './demarrage'
import { parDate } from './liste'

export type Dossiers = ReadonlyMap<string, FicheDossier> | readonly FicheDossier[]
const enCarte = (d: Dossiers): ReadonlyMap<string, FicheDossier> =>
  d instanceof Map ? d : new Map((d as readonly FicheDossier[]).map(x => [x.id, x]))

/** Au plus 3 étiquettes propres par classeur, de 20 caractères */
export const ETIQUETTES_MAX = 3
export const LONGUEUR_ETIQUETTE = 20

/** Les noms comparés comme un humain les lit : sans tenir compte de la
 *  casse ni des accents, « Ch. 2 » avant « Ch. 10 » */
export const COLLATEUR = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' })

// ---------- Les couleurs des dossiers ----------
/** Une couleur de dossier, nommée pour le lecteur d'écran */
export interface Couleur { nom: string; valeur: string }
/** Les huit couleurs, foncées assez pour qu'une coche blanche s'y lise */
export const COULEURS: readonly Couleur[] = [
  { nom: 'Gris', valeur: '#8a94a6' },
  { nom: 'Bleu', valeur: '#3b6fb6' },
  { nom: 'Vert', valeur: '#2f8a57' },
  { nom: 'Jaune', valeur: '#b8901f' },
  { nom: 'Orange', valeur: '#cf7a2b' },
  { nom: 'Rouge', valeur: '#c24a4a' },
  { nom: 'Violet', valeur: '#7d5ba6' },
  { nom: 'Rose', valeur: '#b9578a' },
]
/** La couleur d'un dossier neuf : Bleu */
export const COULEUR_DEFAUT = '#3b6fb6'

/** La couleur d'un dossier ; une valeur inconnue (venue d'ailleurs) vaut Bleu */
export function couleurDe(valeur: string | undefined | null): Couleur {
  const v = String(valeur ?? '').toLowerCase()
  return COULEURS.find(c => c.valeur === v) ?? COULEURS.find(c => c.valeur === COULEUR_DEFAUT)!
}

// ---------- Les noms ----------
/** Un nom tel qu'on le range : les blancs réunis, sans caractère de
 *  contrôle, max caractères au plus ; null s'il ne reste rien */
export function nomPropre(texte: string, max: number): string | null {
  const propre = String(texte ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim()
  const court = [...propre].slice(0, max).join('').trim()
  return court || null
}
export const nomDeDossier = (texte: string) => nomPropre(texte, LONGUEUR_NOM_DOSSIER)
export const nomDEtiquette = (texte: string) => nomPropre(texte, LONGUEUR_ETIQUETTE)

/** Ce qui fait que deux noms sont « le même » (une étiquette en double, un
 *  nom déjà pris) : sans la casse, les blancs réunis */
export function cleDe(texte: string): string {
  return String(texte ?? '').normalize('NFC').toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim()
}

/** Un nom libre pour une copie : « Symétrie (copie) », puis « Symétrie
 *  (copie 2) »… La copie d'une copie ne s'allonge pas (« Symétrie (copie) »
 *  donne « Symétrie (copie 2) »). max caractères au plus, suffixe compris. */
export function nomLibre(nom: string, existants: Iterable<string>, max = LONGUEUR_NOM_CLASSEUR): string {
  const pris = new Set([...existants].map(cleDe))
  const base = (nom ?? '').replace(/\s*\(copie(?:\s+\d+)?\)\s*$/i, '').trim() || (nom ?? '').trim() || 'Classeur'
  const avec = (k: number) => {
    const suffixe = k === 1 ? ' (copie)' : ` (copie ${k})`
    return [...base].slice(0, Math.max(1, max - suffixe.length)).join('').trimEnd() + suffixe
  }
  for (let k = 1; k < 10_000; k++) if (!pris.has(cleDe(avec(k)))) return avec(k)
  return avec(10_000)
}

// ---------- Les niveaux ----------
/** Le début d'un nom de niveau, et son rang dans l'école (pour ranger les
 *  étiquettes de la 6e à la terminale) : un chiffre de 3 à 6 suivi de e, è,
 *  ème ou eme ; 2nde, 2de, seconde ; 1re, 1ère, première ; Tle, Term,
 *  terminale ; CP, CE1, CE2, CM1, CM2 ; BTS, CAP */
const DEBUTS: { motif: RegExp; rang: (m: RegExpExecArray) => number }[] = [
  { motif: /^(?:cp|ce1|ce2|cm1|cm2)/iu, rang: m => ['cp', 'ce1', 'ce2', 'cm1', 'cm2'].indexOf(m[0].toLowerCase()) },
  { motif: /^([3-6])(?:ème|eme|è|e)/iu, rang: m => 5 + (6 - Number(m[1])) },
  { motif: /^(?:2nde|2de|seconde)/iu, rang: () => 9 },
  { motif: /^(?:1re|1ère|1ere|première|premiere)/iu, rang: () => 10 },
  { motif: /^(?:terminale|term|tle)/iu, rang: () => 11 },
  { motif: /^(?:bts|cap)/iu, rang: m => m[0].toLowerCase() === 'bts' ? 12 : 13 },
]

/** Le rang d'un niveau dans l'école (CP 0… 6e 5, 5e 6… 3e 8, 2nde 9, 1re
 *  10, Tle 11, BTS, CAP), ou null : ce nom ne ressemble pas à un niveau. Au
 *  début du nom seulement, sans tenir compte de la casse ; après, rien, un
 *  signe qui n'est pas une lettre (« 5e B », « 5e2 », « 2nde-3 »), ou une
 *  capitale seule (« 5eB ») : « 3 exercices », « Capitales », « Termes » ou
 *  « Premières notions » ne sont pas des niveaux. */
export function rangDeClasse(nom: string): number | null {
  const t = String(nom ?? '').normalize('NFC').trim()
  for (const d of DEBUTS) {
    const m = d.motif.exec(t)
    if (!m) continue
    const reste = t.slice(m[0].length)
    if (reste === '' || !/^\p{L}/u.test(reste) || /^\p{Lu}(?!\p{Ll})/u.test(reste)) return d.rang(m)
  }
  return null
}

/** Le nom ressemble-t-il à un niveau (« 5ème », « 2nde », « 1re spé », « Tle
 *  spé » ; aussi « 5e B ») ? Alors « Nouveau dossier » coche d'office « Dossier
 *  d'un niveau », et la fenêtre « Bonjour ! » dit « en 5ème » (seances-vue.ts). */
export const ressembleAUneClasse = (nom: string) => rangDeClasse(nom) !== null

// ---------- Les dossiers ----------
/** Le dossier fait partie d'un cycle : en remontant depuis son parent, on
 *  revient à lui (bornée, voir parents) */
export function enCycle(id: string, dossiers: Dossiers): boolean {
  const carte = enCarte(dossiers), d = carte.get(id)
  return !!d && d.parent !== null && parents(d.parent, carte).some(x => x.id === id)
}

/** La remontée d'un dossier vers la racine, lui d'abord : parents(), coupée
 *  après le premier dossier d'un cycle (un cycle vaut la racine). Un dossier
 *  qui n'existe pas : rien (la racine). */
export function remontee(dossierId: string | null, dossiers: Dossiers): FicheDossier[] {
  const carte = enCarte(dossiers)
  const chaine = parents(dossierId, carte)
  const i = chaine.findIndex(d => enCycle(d.id, carte))
  return i < 0 ? chaine : chaine.slice(0, i + 1)
}

/** Le parent d'un dossier tel que la bibliothèque le montre : null à la
 *  racine (pas de parent, un parent qui n'existe plus, ou un cycle) */
export function parentAffiche(d: FicheDossier, dossiers: Dossiers): string | null {
  const carte = enCarte(dossiers)
  if (d.parent === null || !carte.has(d.parent) || enCycle(d.id, carte)) return null
  return d.parent
}

/** Le dossier se montre : ni lui ni un dossier parent dans la corbeille
 *  (comme demarrage.visible pour un classeur) */
export function dossierVisible(d: FicheDossier, dossiers: Dossiers): boolean {
  return !parents(d.id, enCarte(dossiers)).some(x => x.corbeille != null)
}

/** Les dossiers de la racine au dossier (lui compris) : le fil d'Ariane */
export function filAriane(dossierId: string | null, dossiers: Dossiers): FicheDossier[] {
  return remontee(dossierId, dossiers).reverse()
}

/** Les noms de la racine au dossier : « 5e B », « Géométrie » */
export function chemin(dossierId: string | null, dossiers: Dossiers): string[] {
  return filAriane(dossierId, dossiers).map(d => d.nom)
}

/** « 5e B › Géométrie », ou « Bibliothèque » (la racine) : sous le nom d'un
 *  classeur, quand un filtre les montre tous ensemble */
export function cheminLisible(dossierId: string | null, dossiers: Dossiers): string {
  const c = chemin(dossierId, dossiers)
  return c.length ? c.join(' › ') : 'Bibliothèque'
}

/** Les sous-dossiers directs d'un dossier (null : ceux de la racine) tels
 *  que la bibliothèque les montre, visibles, par nom */
export function enfants(dossierId: string | null, dossiers: Dossiers): FicheDossier[] {
  const carte = enCarte(dossiers)
  return [...carte.values()]
    .filter(d => parentAffiche(d, carte) === dossierId && dossierVisible(d, carte))
    .sort((a, b) => COLLATEUR.compare(a.nom, b.nom) || (a.id < b.id ? -1 : 1))
}

/** Tous les dossiers sous un dossier (pas lui), à toutes les profondeurs,
 *  tels que la bibliothèque les montre ; chacun une fois (les dossiers vus
 *  ne se reprennent pas : rien ne boucle) */
export function descendants(dossierId: string, dossiers: Dossiers): FicheDossier[] {
  const carte = enCarte(dossiers)
  const fils = new Map<string, FicheDossier[]>()
  for (const d of carte.values()) {
    const p = parentAffiche(d, carte)
    if (p === null) continue
    const l = fils.get(p)
    if (l) l.push(d); else fils.set(p, [d])
  }
  const vus = new Set([dossierId]), tous: FicheDossier[] = [], file = [dossierId]
  while (file.length) {
    for (const e of fils.get(file.shift()!) ?? []) {
      if (vus.has(e.id)) continue
      vus.add(e.id); tous.push(e); file.push(e.id)
    }
  }
  return tous
}

/** Le classeur est dans ce dossier (null : à la racine, où va aussi un
 *  classeur dont le dossier n'existe plus : il ne doit pas se perdre) */
export function estDans(f: FicheClasseur, dossierId: string | null, dossiers: Dossiers): boolean {
  if (dossierId !== null) return f.dossier === dossierId
  return f.dossier === null || !enCarte(dossiers).has(f.dossier)
}

/** Ce que contient un dossier : les classeurs visibles dedans, sous-dossiers
 *  compris (tout ce qu'on y retrouve), et ses sous-dossiers directs (ce
 *  qu'on voit en l'ouvrant) */
export function compter(dossierId: string, fiches: readonly FicheClasseur[], dossiers: Dossiers): { classeurs: number; dossiers: number } {
  const carte = enCarte(dossiers)
  const dedans = new Set([dossierId, ...descendants(dossierId, carte).filter(d => dossierVisible(d, carte)).map(d => d.id)])
  return {
    classeurs: fiches.filter(f => f.dossier !== null && dedans.has(f.dossier) && visible(f, carte)).length,
    dossiers: enfants(dossierId, carte).length,
  }
}

/** « 4 classeurs · 2 dossiers », « 1 classeur », « 3 dossiers », « Vide » */
export function libelleDossier(c: { classeurs: number; dossiers: number }): string {
  const parts: string[] = []
  if (c.classeurs) parts.push(`${c.classeurs} classeur${c.classeurs > 1 ? 's' : ''}`)
  if (c.dossiers) parts.push(`${c.dossiers} dossier${c.dossiers > 1 ? 's' : ''}`)
  return parts.length ? parts.join(' · ') : 'Vide'
}

/** Ce que lit le lecteur d'écran sur la carte d'un dossier : « 5e B,
 *  dossier bleu, dossier d'un niveau, 4 classeurs, 2 dossiers » */
export function texteLecteurDossier(d: FicheDossier, c: { classeurs: number; dossiers: number }): string {
  const parts = [d.nom, `dossier ${couleurDe(d.couleur).nom.toLowerCase()}`]
  if (d.etiquette) parts.push(cleDe(d.etiquette) === cleDe(d.nom) ? 'dossier d\'un niveau' : `dossier du niveau ${d.etiquette}`)
  const l = libelleDossier(c)
  parts.push(l === 'Vide' ? 'vide' : l.replace(' · ', ', '))
  return parts.join(', ')
}

// ---------- Les étiquettes de niveau ----------
/** Une étiquette de niveau d'un classeur ; dossier : héritée de ce dossier */
export interface Etiquette { nom: string; dossier?: FicheDossier }

/** L'étiquette du plus proche dossier de niveau (le dossier lui-même
 *  d'abord), en remontant ; null s'il n'y en a pas */
export function etiquetteHeritee(dossierId: string | null, dossiers: Dossiers): { nom: string; dossier: FicheDossier } | null {
  for (const d of remontee(dossierId, dossiers)) {
    const nom = d.etiquette ? nomDEtiquette(d.etiquette) : null
    if (nom) return { nom, dossier: d }
  }
  return null
}

/** Les étiquettes d'un classeur : les siennes (sans double), puis celle
 *  héritée de son dossier si elle n'y est pas déjà. CALCULÉES, jamais
 *  écrites : elles suivent le classeur quand il change de dossier. */
export function etiquettesEffectives(f: FicheClasseur, dossiers: Dossiers): Etiquette[] {
  const l: Etiquette[] = [], vues = new Set<string>()
  for (const e of f.etiquettes ?? []) {
    const nom = nomDEtiquette(e)
    if (!nom || vues.has(cleDe(nom))) continue
    vues.add(cleDe(nom)); l.push({ nom })
  }
  const h = f.dossier === null ? null : etiquetteHeritee(f.dossier, dossiers)
  if (h && !vues.has(cleDe(h.nom))) l.push({ nom: h.nom, dossier: h.dossier })
  return l
}

/** Le classeur porte-t-il cette étiquette (propre ou héritée) ? */
export function porte(f: FicheClasseur, etiquette: string, dossiers: Dossiers): boolean {
  const k = cleDe(etiquette)
  return etiquettesEffectives(f, dossiers).some(e => cleDe(e.nom) === k)
}

/** Ordre des étiquettes : celui des niveaux dans l'école (de la 6e à la
 *  terminale, « 5ème » avant « 4ème »), puis les autres par nom */
export function comparerEtiquettes(a: string, b: string): number {
  const ra = rangDeClasse(a) ?? 99, rb = rangDeClasse(b) ?? 99
  return (ra - rb) || COLLATEUR.compare(a, b)
}

/** Les étiquettes effectives de ces classeurs (les visibles), chacune une
 *  fois, avec le nombre de classeurs qui la portent, dans l'ordre des
 *  niveaux : la rangée du filtre, « Niveaux : [Tous] [5ème · 4] [2nde ·
 *  2] ». « 5e B » et « 5e b » sont la même ; elle s'écrit comme son dossier
 *  de niveau l'écrit, sinon comme le plus de classeurs l'écrivent (l'ordre
 *  des fiches ne la change pas). */
export function etiquettesDe(fiches: readonly FicheClasseur[], dossiers: Dossiers): { nom: string; n: number }[] {
  const carte = enCarte(dossiers)
  const parCle = new Map<string, { n: number; graphies: Map<string, { n: number; dossier: boolean }> }>()
  for (const f of fiches) {
    for (const e of etiquettesEffectives(f, carte)) {
      const k = cleDe(e.nom)
      let x = parCle.get(k)
      if (!x) { x = { n: 0, graphies: new Map() }; parCle.set(k, x) }
      x.n++
      const g = x.graphies.get(e.nom) ?? { n: 0, dossier: false }
      g.n++; if (e.dossier) g.dossier = true
      x.graphies.set(e.nom, g)
    }
  }
  return [...parCle.values()].map(x => {
    const [nom] = [...x.graphies].sort(([a, ga], [b, gb]) => (Number(gb.dossier) - Number(ga.dossier)) || (gb.n - ga.n) || COLLATEUR.compare(a, b) || (a < b ? -1 : 1))[0]
    return { nom, n: x.n }
  }).sort((a, b) => comparerEtiquettes(a.nom, b.nom))
}

/** Ajoute une étiquette propre (« Étiquettes de niveau… ») : rien de
 *  changé, avec la raison, pour un texte vide, un double (de ses étiquettes
 *  ou de celle qu'il hérite), ou s'il en a déjà 3 */
export function ajouterEtiquette(propres: readonly string[], texte: string, heritee?: string | null): { etiquettes: string[]; ajoutee?: string; refus?: 'vide' | 'double' | 'plein' } {
  const l = [...propres]
  const nom = nomDEtiquette(texte)
  if (!nom) return { etiquettes: l, refus: 'vide' }
  const k = cleDe(nom)
  if (l.some(e => cleDe(e) === k) || (heritee && cleDe(heritee) === k)) return { etiquettes: l, refus: 'double' }
  if (l.length >= ETIQUETTES_MAX) return { etiquettes: l, refus: 'plein' }
  return { etiquettes: [...l, nom], ajoutee: nom }
}

/** L'étiquette d'un dossier de niveau : son nom, coupé à 20 caractères */
export const etiquetteDuNom = (nom: string) => nomDEtiquette(nom)

// ---------- Le tri ----------
/** Trier les classeurs : le plus récemment modifié d'abord (voir
 *  liste.parDate), ou par nom (A → Z, « Ch. 2 » avant « Ch. 10 »). Les
 *  dossiers, eux, vont toujours par nom, avant les classeurs. */
export type Tri = 'modifie' | 'nom'
export const TRIS: readonly { id: Tri; nom: string }[] = [
  { id: 'modifie', nom: 'Modifiés récemment' },
  { id: 'nom', nom: 'Nom (A → Z)' },
]
export function trier(fiches: readonly FicheClasseur[], tri: Tri): FicheClasseur[] {
  if (tri !== 'nom') return parDate(fiches)
  return [...fiches].sort((a, b) => COLLATEUR.compare(a.nom, b.nom) || (b.modifie - a.modifie) || (a.id < b.id ? -1 : 1))
}
