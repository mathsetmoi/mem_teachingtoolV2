// =============================================================
// COPIER EN IMAGE (pour l'ENT et Pronote)
// « Copier la page en image » (le menu de la page, celui d'une vignette de
// la trieuse) et « Copier en image » (le menu complet de ce qui est pris)
// mettent une image PNG dans le presse-papiers du système : le professeur
// la colle (Ctrl+V) dans le cahier de textes de Pronote ou un message de
// l'ENT. L'image est cadrée sur le contenu (une marge de 16 unités), peinte
// hors de l'écran par le même code que l'écran (voir apercu.ts), sans les
// instruments posés ; le fond (carreaux, Seyès…) y est ou non selon le
// réglage gardé, partagé avec le PDF (`mem-sortie-fond`).
// Sa taille : jamais plus fine que l'écran à 100 % (2 pixels par unité, comme
// un écran au dpr 2), au plus environ 4 millions de pixels et 4 096 pixels
// de côté : une page très haute reste lisible (ses lettres gardent 25 px
// sur 1 900 × 10 000 unités, contre 12 avec un plafond de 2 000 px par
// côté) ; plus haute encore, le PDF la découpe en feuilles.
// La copie part DANS le geste (Safari l'exige) : on vérifie tout de suite
// qu'il y a quelque chose, puis navigator.clipboard.write reçoit un
// ClipboardItem dont l'image est une promesse, sans rien attendre avant.
// Repli « Enregistrer l'image (.png) » quand le navigateur ne sait pas
// (Firefox avant la version 127) ou refuse (une autorisation refusée).
// Le libellé ne se confond pas avec « Copier pour Pronote » de la fenêtre
// Publier, qui copie un lien.
// =============================================================
import type { Apercus, PageAPeindre } from './apercu'
import type { Forme } from '../types'
import type { Boite } from '../revoir/bobine'
import { CTRL } from '../navigateur'
import { telecharger } from '../sauvegarde'

/** La marge autour du contenu, en unités du monde */
export const MARGE_IMAGE = 16
/** Les pixels de l'image par px CSS : un écran au dpr 2 */
export const DPR_IMAGE = 2
/** Au plus ce nombre de pixels, et ce nombre de pixels de côté */
export const PIXELS_IMAGE = 4_000_000
export const COTE_IMAGE = 4096
/** La clé des messages de l'image (leur bouton : « Sans le fond », « Enregistrer… ») */
const CLE = 'image'

/**
 * La taille de l'image d'une boîte de contenu l × h (unités du monde), marge
 * de 16 unités comprise, au dpr 2 : z, les px CSS par unité ; l et h, les
 * pixels de l'image. z = min(1, √(4·10⁶ / (4·L·H)), 4096 / (2·max(L, H))),
 * L et H avec la marge : jamais plus fin que l'écran à 100 %, au plus
 * environ 4 millions de pixels et 4 096 pixels de côté. Un contenu de
 * 1 868 × 9 968 unités (1 900 × 10 000 avec la marge) donne 779 × 4 096
 * pixels, et une lettre de 60 unités y fait 25 px.
 */
export function tailleImage(boite: { l: number; h: number }): { z: number; l: number; h: number } {
  const L = Math.max(1, (Number.isFinite(boite.l) ? Math.max(0, boite.l) : 0) + 2 * MARGE_IMAGE)
  const H = Math.max(1, (Number.isFinite(boite.h) ? Math.max(0, boite.h) : 0) + 2 * MARGE_IMAGE)
  const d = DPR_IMAGE
  const z = Math.min(1, Math.sqrt(PIXELS_IMAGE / (d * d * L * H)), COTE_IMAGE / (d * Math.max(L, H)))
  // Les pixels qui couvrent la boîte (le millionième : une division exacte
  // ne gagne pas un pixel d'arrondi)
  const px = (v: number) => Math.max(1, Math.ceil(v * z * d - 1e-6))
  return { z, l: px(L), h: px(H) }
}

/**
 * Un nom de fichier propre : les blancs se regroupent en une espace ;
 * \ / : * ? < > | les guillemets et les autres caractères de contrôle
 * deviennent « - » ; les bouts sont coupés (ni espace ni point à la fin :
 * Windows les refuse), 60 caractères au plus avant l'extension. « page »
 * si rien ne reste.
 */
export function nomDeFichier(base: string, ext: string): string {
  // Les blancs d'abord (une tabulation, un saut de ligne sont des blancs, pas des « - »)
  const propre = String(base ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\\/:*?<>|"“”«»\u0000-\u001f\u007f-\u009f]/g, '-')
    .trim()
  const court = [...propre].slice(0, 60).join('').replace(/[\s.]+$/, '').trim()
  const e = String(ext ?? '').replace(/^\.+/, '')
  return (court || 'page') + (e ? '.' + e : '')
}

/** Le nom du fichier de l'image : « page-3.png », le nom de la page
 *  (« Exercice 12 p. 84.png »), « objets-page-3.png » pour une sélection */
export function nomDeLImage(numero: number, nom: string | null, selection: boolean): string {
  if (selection) return nomDeFichier(`objets-page-${numero}`, 'png')
  return nomDeFichier(nom || `page-${numero}`, 'png')
}

/**
 * L'image PNG de ces formes (toutes celles de la page, sinon), cadrée sur
 * leur contenu : les formules mesurées (le cadrage), la taille de l'image
 * (tailleImage), les polices, les formules et les images préparées à cette
 * échelle, puis la peinture. fond : le papier et son motif, ou le papier
 * blanc. null : rien à peindre (aucune forme), ou le navigateur n'a pas pu
 * faire l'image.
 */
export async function imagePng(ap: Apercus, page: PageAPeindre, o: { fond: boolean; formes?: Forme[] }): Promise<Blob | null> {
  const formes = o.formes ?? page.formes
  if (!formes.length) return null
  await ap.mesurer(formes)
  const b = ap.boite(formes)
  if (!b) return null
  const t = tailleImage(b)
  await ap.preparer(formes, t.z * DPR_IMAGE)
  const c = document.createElement('canvas')
  c.width = t.l; c.height = t.h
  const x = c.getContext('2d')
  if (!x) return null
  ap.peindre(x, page, cameraDe(b, t.z), { l: t.l / DPR_IMAGE, h: t.h / DPR_IMAGE, dpr: DPR_IMAGE, fond: o.fond, formes })
  return new Promise(ok => c.toBlob(bl => ok(bl), 'image/png'))
}

/** La caméra de l'image : le coin de la boîte, moins la marge, en (0, 0) */
export function cameraDe(b: Boite, z: number): { x: number; y: number; z: number } {
  return { x: (MARGE_IMAGE - b.x) * z, y: (MARGE_IMAGE - b.y) * z, z }
}

/** Ce que la copie demande à l'interface */
export interface HoteImage {
  readonly apercus: Apercus
  message(texte: string, action?: { libelle: string; faire: () => void; cle?: string }): void
  /** Le bouton d'un message précédent de l'image s'en va (il parlait d'une
   *  autre copie) */
  oublierAction(cle?: string): void
}

/** Ce qu'on copie : une page (son fond, son origine, ses formes), ou
 *  seulement quelques-unes de ses formes ; nom : le fichier, si l'on enregistre */
export interface AImager { page: PageAPeindre; formes?: Forme[]; nom: string }

/** Le navigateur sait-il mettre une image dans le presse-papiers du système ? */
function presseImage(): boolean {
  return typeof ClipboardItem === 'function' && typeof navigator.clipboard?.write === 'function'
}

/**
 * Copie l'image dans le presse-papiers du système. À appeler DANS le geste
 * (le clic sur l'entrée du menu, sur le bouton du message) : l'appelant a
 * déjà vérifié qu'il y a quelque chose à copier ; rien n'est attendu avant
 * navigator.clipboard.write (Safari refuse sinon). Réussie : « Image
 * copiée… », avec « Sans le fond » (ou « Avec le fond ») si la page a un
 * autre fond que la page blanche, qui change le réglage gardé et copie de
 * nouveau (ce clic est un geste). Refusée, ou impossible : un message, et
 * « Enregistrer l'image (.png) », qui la télécharge.
 */
export function copierEnImage(h: HoteImage, q: AImager): void {
  const ap = h.apercus
  const fond = ap.fondImprime()
  // « Sans le fond » d'une copie d'avant ne doit pas rester sous celle-ci
  h.oublierAction(CLE)
  const image = imagePng(ap, q.page, { fond, formes: q.formes })
  // Une erreur pendant la peinture ne doit jamais rester sans réponse
  image.catch(() => null)
  const enregistrer = { libelle: 'Enregistrer l\'image (.png)', faire: () => void enregistrerImage(h, image, q.nom), cle: CLE }
  if (!presseImage()) { h.message('Ce navigateur ne sait pas copier une image.', enregistrer); return }
  let ecrite: Promise<void>
  try {
    const png = image.then(b => { if (!b) throw new Error('Pas d\'image'); return b })
    ecrite = navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
  } catch (e) { ecrite = Promise.reject(e) }
  ecrite.then(() => {
    const changer = q.page.fond !== 'blanc'
      ? { libelle: fond ? 'Sans le fond' : 'Avec le fond', faire: () => { ap.choisirFondImprime(!fond); copierEnImage(h, q) }, cle: CLE }
      : undefined
    h.message(`Image copiée : collez-la dans l'ENT ou Pronote (${CTRL}+V)`, changer)
  }, () => h.message('La copie de l\'image a été refusée.', enregistrer))
}

/** « Enregistrer l'image (.png) » : l'image déjà faite, téléchargée */
async function enregistrerImage(h: HoteImage, image: Promise<Blob | null>, nom: string) {
  let b: Blob | null = null
  try { b = await image } catch { b = null }
  if (!b) { h.message('L\'image n\'a pas pu être faite.'); return }
  telecharger(b, nom)
  h.message(`Image enregistrée : ${nom}`)
}
