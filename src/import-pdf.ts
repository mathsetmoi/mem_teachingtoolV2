// =============================================================
// IMPORTER UN PDF
// Un PDF (une fiche, un énoncé, un sujet) arrive comme une image : par le
// bouton Image, en le glissant sur le tableau, ou par Ctrl+V. Une fenêtre
// montre ses pages en vignettes : on décoche celles qu'on ne veut pas, on
// dit où les mettre (une page du tableau par page du PDF, ajoutées après
// celle qu'on regarde ; ou toutes sur cette page, l'une sous l'autre) et
// si elles sont fixées en fond (cochée au départ : la feuille ne bouge plus
// quand on écrit dessus, et la gomme n'efface que ce qu'on a écrit).
// Chaque page choisie devient une image ordinaire du tableau : le classeur,
// le replay, le PDF exporté et le Drive n'ont rien de nouveau à connaître.
// La lecture se fait sur l'ordinateur, par pdf.js (sa version « legacy »,
// qui marche aussi sur les navigateurs de quelques années), rangé tout entier dans
// l'outil (son « travailleur » compris) : rien ne passe par internet, et la
// version hors ligne lit les PDF comme la version en ligne. pdf.js n'est
// chargé qu'au premier PDF ouvert.
// =============================================================
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { fermerSurLeFond } from './dialogue'

/** Un PDF ouvert : son nombre de pages, et chaque page peinte à la largeur
 *  qu'on veut (en pixels) ; fermer le libère. */
export interface PdfOuvert {
  pages: number
  dessiner(n: number, largeur: number, hauteurMax?: number): Promise<HTMLCanvasElement>
  fermer(): void
}

/** Ce que la fenêtre a choisi : les numéros des pages du PDF (à partir de
 *  1), où les mettre (ici : toutes sur la page qu'on regarde), et si elles
 *  sont fixées en fond */
export interface ChoixPdf { pages: number[]; ici: boolean; fond: boolean }

/** Ce fichier est-il un PDF ? (son type, ou son nom quand le système n'en
 *  donne pas) */
export function estPdf(f: Blob): boolean {
  return f.type === 'application/pdf' || (f.type === '' || f.type === 'application/octet-stream') && /\.pdf$/i.test((f as File).name ?? '')
}

/** La largeur en pixels de l'image d'une page, et sa plus grande hauteur :
 *  assez fine pour lire un énoncé agrandi en classe, assez légère pour
 *  qu'un classeur de vingt feuilles reste léger */
export const LARGEUR_IMAGE = 1600
export const HAUTEUR_MAX_IMAGE = 2400

let pdfjs: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null

/** pdf.js, chargé une fois. Son travailleur est rangé dans l'outil comme un
 *  texte, et lancé depuis ce texte : un fichier ouvert en file:// ne peut
 *  pas aller chercher un second fichier à côté de lui. Il y est lancé en
 *  travailleur « classique », le seul que Chrome accepte d'un texte en
 *  file:// : on ôte de son code les deux tournures des modules (l'export
 *  final, que rien n'utilise, et import.meta.url, que deux décodeurs
 *  d'images lisent sans en avoir besoin). */
function chargerPdfjs(): Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> {
  pdfjs ??= (async () => {
    const [lib, code] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?raw')])
    const classique = code.default.replace(/export\s*\{\s*WorkerMessageHandler\s*\};?\s*$/, '').split('import.meta.url').join('self.location.href')
    const url = URL.createObjectURL(new Blob([classique], { type: 'text/javascript' }))
    lib.GlobalWorkerOptions.workerPort = new Worker(url)
    return lib
  })()
  // Un échec (un navigateur trop ancien) n'est pas gardé : on réessaiera
  pdfjs.catch(() => { pdfjs = null })
  return pdfjs
}

/** Ouvre le PDF f. Rejette s'il ne se lit pas (abîmé, protégé par un mot
 *  de passe, navigateur trop ancien). */
export async function ouvrirPdf(f: Blob): Promise<PdfOuvert> {
  const lib = await chargerPdfjs()
  const donnees = new Uint8Array(await f.arrayBuffer())
  const tache = lib.getDocument({ data: donnees, useSystemFonts: true })
  // Un travailleur qui ne répond pas (un navigateur qui le refuse) ne
  // laisse pas « Lecture du PDF… » à l'écran pour toujours
  let attente = 0
  const doc: PDFDocumentProxy = await Promise.race([tache.promise, new Promise<never>((_, ko) => { attente = window.setTimeout(() => { void tache.destroy(); ko(new Error('trop long')) }, 60000) })])
    .finally(() => clearTimeout(attente))
  return {
    pages: doc.numPages,
    async dessiner(n, largeur, hauteurMax = Infinity) {
      const page = await doc.getPage(n)
      try {
        const un = page.getViewport({ scale: 1 })
        const k = Math.min(largeur / un.width, hauteurMax / un.height)
        const vue = page.getViewport({ scale: k })
        const cv = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(vue.width)), height: Math.max(1, Math.round(vue.height)) })
        const ctx = cv.getContext('2d')!
        // Une page sans fond (transparente) se lit sur du blanc
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height)
        await page.render({ canvas: cv, canvasContext: ctx, viewport: vue }).promise
        return cv
      } finally { page.cleanup() }
    },
    fermer() { void tache.destroy() },
  }
}

/** « 1 page », « 3 pages » */
export function pagesDuPdf(n: number): string {
  return `${n} page${n > 1 ? 's' : ''}`
}

/** Le bouton de la fenêtre : « Importer 3 pages », « Importer la page » */
export function texteBoutonImport(n: number): string {
  return n === 1 ? 'Importer la page' : n ? `Importer ${n} pages` : 'Aucune page choisie'
}

/** Le message après l'import. pages : les numéros des pages du tableau
 *  ajoutées (une par page du PDF), ou null (toutes sur la page qu'on
 *  regarde) ; n : le nombre de feuilles posées ; fond : fixées en fond. */
export function texteImportPdf(n: number, pages: number[] | null, fond: boolean): string {
  const ou = !pages ? (n > 1 ? `${n} feuilles du PDF posées sur la page, l'une sous l'autre` : 'La feuille du PDF est posée sur la page')
    : n > 1 ? `${n} pages ajoutées à la séance (${pages[0]} à ${pages[pages.length - 1]}), une feuille du PDF en haut de chacune`
      : `Une page ajoutée à la séance (${pages[0]}), la feuille du PDF en haut`
  return ou + (fond ? `. ${n > 1 ? 'Elles sont fixées' : 'Elle est fixée'} en fond : écrivez dessus, la gomme n'efface que l'écriture.` : '.')
}

/** Ce que la fenêtre demande à l'outil */
export interface HoteImportPdf {
  /** Le numéro de la page qu'on regarde dans sa séance (après elle
   *  arrivent les pages neuves) */
  numeroPage: number
  /** Une séance passée, en lecture : « sur cette page » n'y est pas offert */
  lecture: boolean
  /** L'interface se remet à jour (une fenêtre ouverte, fermée) */
  maj(): void
  importer(c: ChoixPdf): void
}

/** Ce qu'on a choisi la dernière fois (le temps de la session) */
const dernier = { ici: false, fond: true }

/**
 * La fenêtre « Importer un PDF » : le nom du fichier et son nombre de
 * pages ; les vignettes des pages, chacune avec sa case (toutes cochées au
 * départ) ; « Où les mettre ? » ; la case « Fixer en fond » ; Annuler et
 * Importer (le focus, grisé si aucune page n'est choisie). Une <dialog
 * class="dialogue">, créée au moment de s'ouvrir, modale. Le PDF est fermé
 * quand on annule ; sinon, c'est à hote.importer de le fermer.
 */
export function ouvrirFenetreImportPdf(hote: HoteImportPdf, pdf: PdfOuvert, nom: string): HTMLDialogElement {
  const d = document.createElement('dialog')
  d.className = 'dialogue dialogue-import-pdf'
  d.innerHTML = `<h2>Importer un PDF</h2><div class="corps">
    <p class="import-pdf-fichier"></p>
    <div class="import-pdf-pages" role="group" aria-label="Les pages du PDF"></div>
    <fieldset class="import-pdf-ou"><legend>Où les mettre ?</legend>
      <label class="case"><input type="radio" name="import-pdf-ou" value="pages"><span></span></label>
      <label class="case"><input type="radio" name="import-pdf-ou" value="ici"><span>Toutes sur cette page, l'une sous l'autre, là où l'on est</span></label>
    </fieldset>
    <label class="case import-pdf-fond"><input type="checkbox" name="import-pdf-fond"><span><b>Fixer en fond</b> : la feuille ne bouge plus quand on écrit dessus, et la gomme n'efface que ce qu'on a écrit.</span></label>
    <div class="actions"><button type="button" class="secondaire" data-a="annuler">Annuler</button><button type="button" class="principal" data-a="importer"></button></div></div>`
  d.querySelector('.import-pdf-fichier')!.textContent = `${nom} · ${pagesDuPdf(pdf.pages)}${pdf.pages > 1 ? ' · cliquez une page pour la prendre ou la laisser' : ''}`
  const [radioPages, radioIci] = [...d.querySelectorAll<HTMLInputElement>('input[name="import-pdf-ou"]')]
  radioPages.nextElementSibling!.textContent = `Une page du tableau par page du PDF, ajoutées après la page ${hote.numeroPage}, la feuille en haut et de la place en dessous`
  const ici = !hote.lecture && dernier.ici
  radioPages.checked = !ici; radioIci.checked = ici
  if (hote.lecture) radioIci.closest('label')!.hidden = true
  const caseFond = d.querySelector<HTMLInputElement>('input[name="import-pdf-fond"]')!
  caseFond.checked = dernier.fond
  const bouton = d.querySelector<HTMLButtonElement>('[data-a="importer"]')!
  // Les vignettes : une case par page, cochée ; les images se peignent
  // l'une après l'autre, la fenêtre déjà ouverte
  const grille = d.querySelector<HTMLDivElement>('.import-pdf-pages')!
  const cases: HTMLInputElement[] = []
  const vignettes: HTMLDivElement[] = []
  for (let n = 1; n <= pdf.pages; n++) {
    const l = document.createElement('label')
    l.className = 'import-pdf-page'
    const v = document.createElement('div')
    v.className = 'import-pdf-vignette'
    const ligne = document.createElement('span')
    const c = Object.assign(document.createElement('input'), { type: 'checkbox', checked: true })
    ligne.append(c, `Page ${n}`)
    l.append(v, ligne)
    grille.appendChild(l)
    cases.push(c); vignettes.push(v)
  }
  const choisies = () => cases.flatMap((c, i) => c.checked ? [i + 1] : [])
  const majBouton = () => {
    const n = choisies().length
    bouton.textContent = texteBoutonImport(n)
    bouton.disabled = !n
    radioPages.nextElementSibling!.textContent = `${n > 1 ? 'Une page du tableau par page du PDF, ajoutées' : 'Une page du tableau, ajoutée'} après la page ${hote.numeroPage}, la feuille en haut et de la place en dessous`
  }
  grille.addEventListener('change', majBouton)
  majBouton()
  let ouverte = true
  void (async () => {
    for (let i = 0; i < pdf.pages && ouverte; i++) {
      try {
        const cv = await pdf.dessiner(i + 1, 220, 300)
        if (!ouverte) return
        cv.setAttribute('aria-hidden', 'true')
        vignettes[i].appendChild(cv)
      } catch { /* une vignette qui ne se peint pas reste blanche */ }
    }
  })()
  let importer = false
  d.querySelector('[data-a="annuler"]')!.addEventListener('click', () => d.close())
  bouton.addEventListener('click', () => { if (choisies().length) { importer = true; d.close() } })
  // Un appui à côté (sur le fond) ferme ; pas un appui dans la marge de la fenêtre
  fermerSurLeFond(d, () => d.close())
  d.addEventListener('close', () => {
    ouverte = false
    d.remove()
    hote.maj()
    if (!importer) { pdf.fermer(); return }
    const c: ChoixPdf = { pages: choisies(), ici: radioIci.checked, fond: caseFond.checked }
    dernier.ici = c.ici; dernier.fond = c.fond
    hote.importer(c)
  })
  document.body.appendChild(d)
  d.showModal()
  hote.maj()
  bouton.focus()
  return d
}
