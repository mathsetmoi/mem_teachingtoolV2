// =============================================================
// EXPORTER EN PDF
// « Exporter en PDF » la page (le menu de la page, Ctrl + P), les pages
// choisies dans la trieuse, ou tout le tableau (le menu ⋯, la trieuse) :
// chaque page cadrée sur son contenu, découpée en feuilles A4 si elle est
// haute (voir mise-en-page.ts), une image à 200 ppp par feuille : en
// couleurs indexées quand une palette de 256 couleurs la rend fidèlement
// (les couleurs des formes de la feuille d'abord ; voir pdf.ts), sinon en
// RVB sans perte ; une feuille où paraît une image (une photo, une capture)
// ne passe jamais par la palette : en JPEG si l'image couvre au moins 15 %
// de la zone utile, en RVB sans perte sinon. Tout se fait dans le
// navigateur, hors connexion, en ligne comme en un seul fichier (file://) :
// ni service extérieur, ni bibliothèque de plus (fflate est déjà là).
// Au lancement, les formes de chaque page (les objets eux-mêmes, qui ne
// changent jamais : une modification en pose un nouveau), son fond, son
// origine, son numéro et son nom sont pris une fois pour toutes : une page
// qu'on modifie pendant l'export ne mélange pas deux états.
// Rien ne gèle : les formules se mesurent et se préparent une par tâche ;
// chaque feuille se peint par tranches d'environ 30 ms ; ses pixels se lisent
// par bandes, se palettisent par tranches de lignes, se compressent par
// morceaux de 512 Ko (Zlib de fflate, en flux). Tant qu'un pointeur écrit
// sur le tableau, l'export attend entre deux tranches (au plus 2 s à la
// fois) : il ne retarde pas l'encre. Le message dit la progression. Un
// export à la fois. Les instruments posés ne sont jamais peints (Apercus ne
// les connaît pas).
// Aussi la fenêtre « Exporter en PDF » : ce qu'on exporte, le fond imprimé
// ou non (le réglage gardé, partagé avec l'image copiée), Annuler, Exporter.
// =============================================================
import { Zlib } from 'fflate'
import type { Apercus, PageAPeindre } from './apercu'
import type { ActionMessage } from '../app'
import type { Fond, Forme } from '../types'
import type { Boite } from '../revoir/bobine'
import { couleurHex, ecrirePdf, lignesPredites, palettiserLignes } from './pdf'
import type { Feuille, ImageIndexee, ImageJpeg, ImageRvb } from './pdf'
import { DPR_PDF, PX_PAR_MM, TRES_REDUITE, listeNumeros, mettreEnPage, nomDuPdf, piedDePage, texteFini, texteProgression, texteRien, titreDuPdf } from './mise-en-page'
import type { FeuilleDePage, MiseEnPage, Papier, QuoiExporter } from './mise-en-page'
import { telecharger } from '../sauvegarde'
import { pagesLisibles } from '../fichier'

/** Une tranche de peinture vise ce temps (ms) : jamais une tâche longue */
const TRANCHE_MS = 30
/** Les pixels se lisent par bandes de ce nombre de lignes */
const BANDE_LIGNES = 400
/** La compression avance par morceaux de cette taille */
const MORCEAU = 512 * 1024
/** Pendant un geste sur le tableau, l'export attend au plus ce temps à la fois */
const ATTENTE_GESTE = 2000
/** Une forme est peinte sur une feuille si sa boîte passe à moins de ce
 *  jeu (unités) de sa bande : les noms des points, les codages dépassent un
 *  peu la boîte ; ce qui sort de la bande est coupé de toute façon */
const JEU_BANDE = 120
/** Le pied de page : 8 points, gris */
const PIED_TAILLE = 8 * 96 / 72
const PIED_COULEUR = '#6b7280'
/** Sa ligne de base, à ce nombre de mm du bas de la feuille : dans la marge
 *  du bas (16 mm), loin du bord que l'imprimante ne sait pas toujours atteindre */
const PIED_BAS = 7
/** Des images (photos) qui couvrent au moins cette part de la zone utile
 *  d'une feuille : elle part en JPEG (en RVB sans perte, une photo pèserait
 *  plusieurs mégaoctets) ; moins, en RVB sans perte. Jamais en 256 couleurs :
 *  une photo y serait postérisée (ses petits détails de couleur perdus) */
export const PART_PHOTO = 0.15
/** Le papier, l'encre des axes du repère et le gris du pied de page : toujours
 *  dans la palette (s'ils paraissent sur la feuille) */
const COULEURS_FIXES = ['#ffffff', '#1b2230', PIED_COULEUR]

/** Ce que l'export demande au tableau et à l'interface */
export interface HoteExport {
  readonly apercus: Apercus
  /** Ce que garde le document de chaque page */
  fondDe(page: string): Fond
  origineDe(page: string): { x: number; y: number }
  formesDe(page: string): Iterable<Forme>
  nomDe(page: string): string | null
  /** L'ordre des pages (le numéro du pied de page) */
  pages(): readonly string[]
  /** Un pointeur écrit-il sur le tableau (un trait, un objet qu'on glisse) ? */
  enGeste(): boolean
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
}

export interface OptionsExport {
  /** Le titre du PDF, et le nom du fichier */
  titre: string
  nom: string
  /** Le fond de la page (carreaux, Seyès, repère) imprimé */
  fond: boolean
  /** Ce qu'on exporte, pour dire « Rien à exporter : … » */
  quoi?: 'page' | 'pages' | 'tout'
}

/** Une page prise au lancement */
interface PagePrise { id: string; numero: number; nom: string | null; page: PageAPeindre; boites: (Boite | null)[] }
/** Une page à peindre, avec ses feuilles */
interface PagePlanifiee extends PagePrise { mp: MiseEnPage }

let enCours = false
/** Un export est-il en cours ? (un seul à la fois) */
export function exportEnCours(): boolean { return enCours }
/** Quand « Un export en PDF est déjà en cours. » a été dit (performance.now()) */
let refusDit = -Infinity
/** Ce message reste lisible ce temps (ms) : la progression ne le remplace pas
 *  avant (une feuille légère se fait en quelques centaines de millisecondes,
 *  et il ne serait resté à l'écran qu'un instant) */
const REFUS_LISIBLE = 2000
function direDejaEnCours(hote: Pick<HoteExport, 'message'>) {
  refusDit = performance.now()
  hote.message('Un export en PDF est déjà en cours.')
}

const dormir = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Rend la main au navigateur, une tâche : setTimeout, ou un message quand
 *  la page est cachée (un onglet en arrière-plan ralentit setTimeout à une
 *  fois par seconde) */
function uneTache(): Promise<void> {
  if (typeof document !== 'undefined' && document.hidden && typeof MessageChannel === 'function') {
    const c = new MessageChannel()
    return new Promise(r => { c.port1.onmessage = () => { c.port1.close(); r() }; c.port2.postMessage(0) })
  }
  return new Promise(r => setTimeout(r, 0))
}

/** Les images d'abord (sous tout, comme à l'écran), puis les tracés et les
 *  figures, puis les formules (au-dessus, comme leur calque HTML), chacun
 *  par z : peintes par tranches dans cet ordre, la feuille est l'écran */
function ordreDePeinture(formes: Iterable<Forme>): Forme[] {
  const parZ = [...formes].sort((a, b) => a.z - b.z)
  const rang = (f: Forme) => f.type === 'image' ? 0 : f.type === 'formule' ? 2 : 1
  return [...parZ.filter(f => rang(f) === 0), ...parZ.filter(f => rang(f) === 1), ...parZ.filter(f => rang(f) === 2)]
}

/** Une droite ou une demi-droite : elle traverse toute la page */
function prolongee(f: Forme): boolean {
  return f.type === 'polygone' && !!f.prolonge
}

/** Ce que l'on dit d'un export qui a échoué */
function raison(e: unknown): string {
  const m = e instanceof Error ? e.message.trim().replace(/\.$/, '') : ''
  return m || 'erreur inconnue'
}

/**
 * Exporte ces pages (dans cet ordre) en un PDF, qui se télécharge. Rend vrai
 * si le fichier est parti. Les pages vides sont sautées (et dites) ; rien
 * que des pages vides : pas de fichier, un message.
 */
export async function exporterPdf(hote: HoteExport, pages: readonly string[], o: OptionsExport): Promise<boolean> {
  if (enCours) { direDejaEnCours(hote); return false }
  enCours = true
  const ap = hote.apercus
  let dernierMessage = 0
  const dire = (texte: string, toujours = true) => {
    const t = performance.now()
    // La progression se redit au moins toutes les 2 s : le message ne s'efface pas en route
    if (!toujours && t - dernierMessage < 2000) return
    // « Déjà en cours » vient d'être dit : il reste lisible, la progression attend
    if (t - refusDit < REFUS_LISIBLE) return
    dernierMessage = t
    hote.message(texte)
  }
  let progression = 'Export en PDF : préparation…'
  // Une feuille de chaque sens, et le tampon de ses pixels, servent à toutes
  // les feuilles ; rendus à la fin (un canevas de 4 millions de pixels pèse
  // 15 Mo, dans la mémoire de la carte graphique)
  const canevas = new Map<string, HTMLCanvasElement>()
  const tampons = new Map<number, Uint8ClampedArray>()
  /** Entre deux tranches : une tâche, puis l'attente d'un geste qui écrit */
  const pause = async () => {
    await uneTache()
    const t0 = performance.now()
    while (hote.enGeste() && performance.now() - t0 < ATTENTE_GESTE) await dormir(40)
    dire(progression, false)
  }
  try {
    dire(progression)
    // 1. Tout prendre maintenant : l'ordre, les numéros, les noms, les formes
    const ordre = hote.pages()
    const prises: PagePrise[] = pages.map(id => ({
      id, numero: ordre.indexOf(id) + 1, nom: hote.nomDe(id), boites: [],
      page: { fond: hote.fondDe(id), origine: { ...hote.origineDe(id) }, formes: ordreDePeinture(hote.formesDe(id)) },
    }))
    // 2. Mesurer les formules, cadrer, découper
    const vides: number[] = [], tresReduites: { numero: number; k: number }[] = []
    const plans: PagePlanifiee[] = []
    for (const p of prises) {
      const formes = p.page.formes
      if (!formes.length) { vides.push(p.numero); continue }
      await ap.mesurer(formes)
      const contenu = ap.boite(formes)
      if (!contenu) { vides.push(p.numero); continue }
      p.boites = formes.map(f => ap.boite([f]))
      const obstacles = p.boites.filter((b, i): b is Boite => !!b && !prolongee(formes[i]))
      const mp = mettreEnPage(contenu, obstacles)
      if (mp.k < TRES_REDUITE) tresReduites.push({ numero: p.numero, k: mp.k })
      plans.push({ ...p, mp })
      await pause()
    }
    if (!plans.length) {
      hote.message(texteRien(o.quoi ?? (pages.length > 1 ? 'pages' : 'page')))
      return false
    }
    // 3. Peindre chaque feuille
    const total = plans.reduce((n, p) => n + p.mp.feuilles.length, 0)
    const police = await policeDuPied()
    const feuilles: Feuille[] = []
    for (const p of plans) {
      // Les formules un peu plus fines que la feuille (l'échelle arrondie au
      // 1/20 au-dessus) : réduites en les posant, elles restent nettes ;
      // agrandies, même d'un pour cent, elles s'adouciraient
      await ap.preparer(p.page.formes, Math.ceil(p.mp.z * DPR_PDF * 20 - 1e-6) / 20)
      for (const f of p.mp.feuilles) {
        progression = texteProgression(feuilles.length + 1, total)
        dire(progression)
        const pap = p.mp.papier
        let c = canevas.get(pap.orientation)
        if (!c) {
          c = document.createElement('canvas')
          c.width = pap.px.l; c.height = pap.px.h
          canevas.set(pap.orientation, c)
        }
        const x = c.getContext('2d')
        if (!x) throw new Error('le navigateur n\'a pas pu préparer une feuille (mémoire ?)')
        const formes = await peindreFeuille(ap, x, p, f, pap, o.fond, pause)
        const pied = piedDePage({ numero: p.numero, nom: p.nom, partie: f.partie, parties: f.parties, k: p.mp.k, feuille: feuilles.length + 1, feuilles: total })
        peindrePied(x, pap, pied, police)
        const n = c.width * c.height * 4
        let rgba = tampons.get(n)
        if (!rgba) tampons.set(n, rgba = new Uint8ClampedArray(n))
        const images = partDesImages(ap, formes, f, pap)
        feuilles.push({ l: pap.pt.l, h: pap.pt.h, image: await imageDeLaFeuille(c, x, rgba, pause, { images, forcees: couleursDes(formes) }) })
        await pause()
      }
    }
    // 4. Le fichier
    const octets = ecrirePdf(feuilles, { titre: o.titre, date: Date.now() })
    telecharger(new Blob([octets as BlobPart], { type: 'application/pdf' }), o.nom)
    hote.message(texteFini({ fichier: o.nom, feuilles: feuilles.length, octets: octets.length, vides, tresReduites }))
    return true
  } catch (e) {
    hote.message(`L'export en PDF a échoué : ${raison(e)}. Le tableau n'a pas changé.`)
    return false
  } finally {
    for (const c of canevas.values()) { c.width = 0; c.height = 0 }
    enCours = false
  }
}

/**
 * Une feuille : le papier blanc ; le fond (s'il est imprimé) sur toute la
 * zone utile, même sur une feuille de suite (la même caméra, décalée : le
 * quadrillage continue), peint comme si la zone utile était tout le
 * canevas (les flèches des axes du repère, posées au bord, tombent au bout
 * de la zone, pas dans la marge où elles seraient coupées) ; puis les
 * formes de la bande, coupées à la zone utile et à la bande (une droite
 * prolongée s'arrête au bord, pas dans les marges ; une forme à cheval sur
 * une coupe paraît en partie sur les deux feuilles), par tranches d'environ
 * 30 ms. Rend les formes peintes.
 */
async function peindreFeuille(ap: Apercus, x: CanvasRenderingContext2D, p: PagePlanifiee, f: MiseEnPage['feuilles'][number],
  pap: Papier, fond: boolean, pause: () => Promise<void>): Promise<Forme[]> {
  const d = DPR_PDF, u = pap.utile
  const o = { l: pap.css.l, h: pap.css.h, dpr: d }
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.globalAlpha = 1
  x.fillStyle = '#ffffff'
  x.fillRect(0, 0, pap.px.l, pap.px.h)
  if (fond && p.page.fond !== 'blanc') {
    x.save()
    x.beginPath(); x.rect(u.x * d, u.y * d, u.l * d, u.h * d); x.clip()
    ap.peindre(x, p.page, { x: f.cam.x - u.x, y: f.cam.y - u.y, z: f.cam.z }, { l: u.l, h: u.h, dpr: d, coin: { x: u.x, y: u.y }, fond: true, formes: [] })
    x.restore()
  }
  // Les formes de cette bande (et les droites prolongées, qui passent partout)
  const formes = p.page.formes.filter((g, i) => {
    const b = p.boites[i]
    if (prolongee(g) || !b) return true
    return b.y < f.y1 + JEU_BANDE && b.y + b.h > f.y0 - JEU_BANDE
  })
  x.save()
  x.beginPath(); x.rect(u.x * d, u.y * d, u.l * d, (f.y1 - f.y0) * f.cam.z * d); x.clip()
  try {
    // La taille d'une tranche s'ajuste à ce que coûtent les formes
    let n = 16
    for (let i = 0; i < formes.length;) {
      await pause()
      const tranche = formes.slice(i, i + n)
      const t0 = performance.now()
      ap.peindre(x, p.page, f.cam, { ...o, fond: 'aucun', formes: tranche })
      const dt = performance.now() - t0
      i += tranche.length
      n = Math.max(1, Math.min(4000, Math.round(tranche.length * TRANCHE_MS / Math.max(1, dt))))
    }
  } finally {
    x.restore()
  }
  return formes
}

/** Les couleurs pleines de ces formes (0xRRGGBB), et celles du papier, des
 *  axes et du pied de page : la palette les prend d'abord. Un trait
 *  transparent (le surligneur) n'y est pas : sa couleur sur le papier n'est
 *  pas la sienne, et elle est fréquente de toute façon. */
export function couleursDes(formes: Iterable<Forme>): number[] {
  const r = new Set<number>()
  const ajouter = (c: string | null | undefined) => { const k = couleurHex(c); if (k !== null) r.add(k) }
  for (const c of COULEURS_FIXES) ajouter(c)
  for (const f of formes) {
    if (f.type === 'image') continue
    if (f.type === 'trait' && !(f.opacite >= 1)) continue
    ajouter(f.couleur)
    if (f.type === 'polygone' || f.type === 'cercle') {
      for (const s of f.stylePoints ?? []) ajouter(s?.couleur)
      for (const s of f.styleNoms ?? []) ajouter(s?.couleur)
    }
  }
  return [...r]
}

/** La part de la zone utile de cette feuille que couvrent les images (leurs
 *  boîtes, coupées à la bande de la feuille et à sa largeur utile) */
function partDesImages(ap: Apercus, formes: readonly Forme[], f: FeuilleDePage, pap: Papier): number {
  const u = pap.utile, z = f.cam.z
  let aire = 0
  for (const g of formes) {
    if (g.type !== 'image') continue
    const b = ap.boite([g])
    if (!b) continue
    const x0 = Math.max(u.x, b.x * z + f.cam.x), x1 = Math.min(u.x + u.l, (b.x + b.l) * z + f.cam.x)
    const y0 = Math.max(f.y0, b.y), y1 = Math.min(f.y1, b.y + b.h)
    if (x1 > x0 && y1 > y0) aire += (x1 - x0) * (y1 - y0) * z
  }
  return aire / (u.l * u.h)
}

/** La police du pied de page : celle de l'outil (Atkinson Hyperlegible en
 *  ligne, attendue au plus 2 s ; hors connexion, celle du système) */
async function policeDuPied(): Promise<string> {
  const famille = getComputedStyle(document.body).fontFamily || 'sans-serif'
  try {
    await Promise.race([document.fonts.load(`${PIED_TAILLE}px ${famille}`, 'Page 0123456789 ·/%').catch(() => []), dormir(2000)])
  } catch { /* la police du système */ }
  return famille
}

/** Le pied de page, dans la marge du bas : à gauche la page (son nom, sa
 *  partie, sa réduction), à droite le numéro de la feuille ; un texte trop
 *  long est coupé par des points de suspension */
function peindrePied(x: CanvasRenderingContext2D, pap: Papier, pied: { gauche: string; droite: string }, police: string) {
  const d = DPR_PDF, u = pap.utile
  x.save()
  x.setTransform(d, 0, 0, d, 0, 0)
  x.font = `${PIED_TAILLE}px ${police}`
  x.fillStyle = PIED_COULEUR
  x.textBaseline = 'alphabetic'
  const y = pap.css.h - PIED_BAS * PX_PAR_MM
  x.textAlign = 'right'
  x.fillText(pied.droite, u.x + u.l, y)
  const place = u.l - x.measureText(pied.droite).width - 6 * PX_PAR_MM
  let gauche = pied.gauche
  if (x.measureText(gauche).width > place) {
    const lettres = [...gauche]
    while (lettres.length > 1 && x.measureText(lettres.join('') + '…').width > place) lettres.pop()
    gauche = lettres.join('').trimEnd() + '…'
  }
  x.textAlign = 'left'
  x.fillText(gauche, u.x, y)
  x.restore()
}

/** L'image d'une feuille : ses pixels lus par bandes, ramenés à 256 couleurs
 *  par tranches de lignes (forcees : les couleurs des formes, prises
 *  d'abord), compressés par morceaux. images : la part de la zone utile que
 *  couvrent les images ; au moins 15 %, la feuille part en JPEG ; un peu, ou
 *  une feuille qu'aucune palette ne rend fidèlement (palettiser rend null :
 *  beaucoup de couleurs mêlées), en RVB sans perte. */
async function imageDeLaFeuille(c: HTMLCanvasElement, x: CanvasRenderingContext2D, rgba: Uint8ClampedArray, pause: () => Promise<void>,
  o: { images: number; forcees: readonly number[] }): Promise<ImageIndexee | ImageJpeg | ImageRvb> {
  const l = c.width, h = c.height
  if (o.images >= PART_PHOTO) {
    const b = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/jpeg', 0.88))
    if (!b) throw new Error('le navigateur n\'a pas pu faire l\'image d\'une feuille')
    return { genre: 'jpeg', largeur: l, hauteur: h, donnees: new Uint8Array(await b.arrayBuffer()) }
  }
  for (let y = 0; y < h; y += BANDE_LIGNES) {
    await pause()
    const n = Math.min(BANDE_LIGNES, h - y)
    rgba.set(x.getImageData(0, y, l, n).data, y * l * 4)
  }
  const p = o.images > 0 ? null : await jusquAuBout(palettiserLignes(rgba, l, h, 64, o.forcees), pause)
  if (p) return { genre: 'indexee', largeur: l, hauteur: h, palette: p.palette, donnees: await comprimer(p.indices, pause) }
  const lignes = await jusquAuBout(lignesPredites(rgba, l, h, 64), pause)
  return { genre: 'rvb', largeur: l, hauteur: h, donnees: await comprimer(lignes, pause) }
}

/** Mène un générateur à son terme, en rendant la main toutes les 30 ms */
async function jusquAuBout<T>(g: Generator<number, T, void>, pause: () => Promise<void>): Promise<T> {
  let r = g.next(), t0 = performance.now()
  while (!r.done) {
    if (performance.now() - t0 > TRANCHE_MS) { await pause(); t0 = performance.now() }
    r = g.next()
  }
  return r.value
}

/** Compresse (zlib, pour le filtre FlateDecode) par morceaux de 512 Ko */
async function comprimer(octets: Uint8Array, pause: () => Promise<void>): Promise<Uint8Array> {
  const morceaux: Uint8Array[] = []
  const z = new Zlib({ level: 6 }, d => { morceaux.push(d.slice()) })
  const n = octets.length
  for (let i = 0; i < n; i += MORCEAU) {
    await pause()
    z.push(octets.subarray(i, Math.min(n, i + MORCEAU)), i + MORCEAU >= n)
  }
  let long = 0
  for (const m of morceaux) long += m.length
  const donnees = new Uint8Array(long)
  let k = 0
  for (const m of morceaux) { donnees.set(m, k); k += m.length }
  return donnees
}

// ---------- La fenêtre « Exporter en PDF » ----------

/** Ce qu'on demande à exporter : la page qu'on regarde (avec le choix de
 *  tout le tableau), tout le tableau, ou les pages choisies dans la trieuse */
export type CibleExport = { page: string } | { pages: string[] } | 'tout'

/** Ce que la fenêtre demande à l'interface */
export interface HoteFenetrePdf extends HoteExport {
  /** La fenêtre s'ouvre ou se ferme (la barre d'actions se cache, revient) */
  maj(): void
}

/** La note de la fenêtre (jamais « au tableau » : c'est le nom d'un autre outil) */
export const NOTE_PDF = 'Chaque page est cadrée sur son contenu, à sa taille réelle quand elle tient sur la feuille (1 cm sur la page = 1 cm sur le papier), sinon réduite pour tenir sur la feuille ; une page haute continue sur les feuilles suivantes. Les instruments ne sont pas imprimés.'

/** « La page 3 », « La page 3 · Exercice 12 p. 84 » */
function laPage(numero: number, nom: string | null): string {
  return `La page ${numero}${nom ? ' · ' + nom : ''}`
}

/**
 * La fenêtre « Exporter en PDF » : ce qu'on exporte (pour la page qu'on
 * regarde, sur un tableau de plusieurs pages, deux choix : « La page 3 »,
 * coché, ou « Tout le tableau : 12 pages ») ; la case du fond imprimé,
 * cochée selon le réglage gardé (que l'export garde) ; la note ; Annuler et
 * Exporter (le focus). Une <dialog class="dialogue">, créée au moment de
 * s'ouvrir, modale. Rend null si elle ne s'ouvre pas (un export en cours).
 */
export function ouvrirFenetrePdf(hote: HoteFenetrePdf, cible: CibleExport): HTMLDialogElement | null {
  if (enCours) { direDejaEnCours(hote); return null }
  const ordre = hote.pages()
  const tout = `Tout le tableau : ${pagesLisibles(ordre.length)}`
  const d = document.createElement('dialog')
  d.className = 'dialogue dialogue-pdf'
  d.innerHTML = `<h2>Exporter en PDF</h2><div class="corps">
    <div class="pdf-quoi"></div>
    <label class="case pdf-fond"><input type="checkbox" name="pdf-fond"><span>Imprimer le fond de la page (carreaux, Seyès, repère)</span></label>
    <p class="pdf-note"></p>
    <div class="actions"><button type="button" class="secondaire" data-a="annuler">Annuler</button><button type="button" class="principal" data-a="exporter">Exporter</button></div></div>`
  d.querySelector('.pdf-note')!.textContent = NOTE_PDF
  const quoi = d.querySelector<HTMLDivElement>('.pdf-quoi')!
  /** Les pages à exporter, selon le choix */
  let choisir: () => { pages: string[]; q: QuoiExporter; quoi: 'page' | 'pages' | 'tout' }
  const date = Date.now()
  const toutes = () => ({ pages: [...ordre], q: { tout: true, numeros: ordre.map((_, i) => i + 1), nom: null, date }, quoi: 'tout' as const })
  const unePage = (id: string) => {
    const n = ordre.indexOf(id) + 1, nom = hote.nomDe(id)
    return { pages: [id], q: { tout: false, numeros: [n], nom, date }, quoi: 'page' as const }
  }
  const ligne = (texte: string) => {
    const p = document.createElement('p'); p.className = 'pdf-seul'; p.textContent = texte
    quoi.appendChild(p)
  }
  if (cible === 'tout') {
    ligne(tout)
    choisir = toutes
  } else if ('page' in cible) {
    const id = cible.page, n = ordre.indexOf(id) + 1
    if (ordre.length > 1) {
      quoi.setAttribute('role', 'radiogroup'); quoi.setAttribute('aria-label', 'Ce qu\'on exporte')
      quoi.innerHTML = `<label class="case"><input type="radio" name="pdf-quoi" value="page" checked><span></span></label>
        <label class="case"><input type="radio" name="pdf-quoi" value="tout"><span></span></label>`
      const [a, b] = [...quoi.querySelectorAll('span')]
      a.textContent = laPage(n, hote.nomDe(id)); b.textContent = tout
      choisir = () => quoi.querySelector<HTMLInputElement>('input[value="tout"]')!.checked ? toutes() : unePage(id)
    } else {
      ligne(laPage(n, hote.nomDe(id)))
      choisir = () => unePage(id)
    }
  } else {
    // Les pages choisies, dans l'ordre du tableau (aucune : rien à ouvrir)
    const ids = ordre.filter(p => cible.pages.includes(p))
    if (!ids.length) return null
    const numeros = ids.map(p => ordre.indexOf(p) + 1)
    if (ids.length === 1) { ligne(laPage(numeros[0], hote.nomDe(ids[0]))); choisir = () => unePage(ids[0]) }
    else {
      ligne(`Les pages ${listeNumeros(numeros)}`)
      choisir = () => ({ pages: ids, q: { tout: false, numeros, nom: null, date }, quoi: 'pages' as const })
    }
  }
  const caseFond = d.querySelector<HTMLInputElement>('input[name="pdf-fond"]')!
  caseFond.checked = hote.apercus.fondImprime()
  let exporter = false
  d.querySelector('[data-a="annuler"]')!.addEventListener('click', () => d.close())
  const bouton = d.querySelector<HTMLButtonElement>('[data-a="exporter"]')!
  bouton.addEventListener('click', () => { exporter = true; d.close() })
  // Un appui à côté (sur le fond) ferme ; pas un appui dans la marge de la fenêtre
  d.addEventListener('click', e => {
    if (e.target !== d) return
    const r = d.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close()
  })
  d.addEventListener('close', () => {
    d.remove()
    hote.maj()
    if (!exporter) return
    hote.apercus.choisirFondImprime(caseFond.checked)
    const c = choisir()
    void exporterPdf(hote, c.pages, { titre: titreDuPdf(c.q), nom: nomDuPdf(c.q), fond: caseFond.checked, quoi: c.quoi })
  })
  document.body.appendChild(d)
  d.showModal()
  hote.maj()
  bouton.focus()
  return d
}
