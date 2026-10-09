// =============================================================
// ENREGISTRER ET OUVRIR UN TABLEAU
// Le tableau vit dans le navigateur ; « Enregistrer le tableau » l'emporte
// tout entier dans un fichier .memc (voir fichier.ts), « Ouvrir un
// tableau » remplace celui du navigateur par celui d'un fichier. C'est la
// passerelle entre la version en ligne et la version d'un seul fichier
// (clé USB), et d'une machine à l'autre.
// - Chrome et Edge demandent où enregistrer (showSaveFilePicker) ; les
//   autres navigateurs, ou une page ouverte depuis la clé (file://),
//   téléchargent le fichier.
// - Ouvrir demande toujours confirmation, dans une fenêtre de l'outil (pas
//   de confirm(), que le navigateur bloque dans une page intégrée), et
//   propose d'enregistrer d'abord. Le nouveau tableau est rangé dans la base
//   du navigateur, puis la page se recharge. Un autre onglet ouvert sur le
//   même tableau l'apprend et se met hors d'état d'écrire.
// - Ctrl + S et Ctrl + O (⌘ sur Mac) ; un fichier glissé sur le tableau
//   s'ouvre comme par « Ouvrir un tableau ».
// =============================================================
import type { App } from './app'
import type { EnteteTableau } from './fichier'
import { ErreurFichier, EXTENSION_TABLEAU, dateLisible, ecrireTableau, lireTableau, nomTableau, pagesLisibles, quandLisible, tailleLisible } from './fichier'
import { ecrire } from './reglages'
import { tableauCache } from './navigateur'

/** Quand le tableau a été enregistré dans un fichier pour la dernière fois (ms) */
const CLE_DERNIER = 'mem-dernier-enregistrement'
/** Le temps d'un rechargement (sessionStorage) : un tableau vient d'être ouvert, de tant de pages */
const CLE_OUVERT = 'mem-ouvert'
/** Les onglets ouverts sur ce tableau se parlent par ce canal */
const CANAL = 'mem-tableau'

/** iPad et iPhone grisent, dans le choix du fichier, un type qu'ils ne connaissent pas */
const IOS = typeof navigator !== 'undefined'
  && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/** Le fichier choisi par showSaveFilePicker (Chrome, Edge) */
interface FichierChoisi { name: string; createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }
type ChoisirOuEnregistrer = (o: unknown) => Promise<FichierChoisi>

/** Une image d'écran passe (le message « Enregistrement… » se voit), sans
 *  attendre plus de 120 ms si la page est cachée */
function uneImage(): Promise<void> {
  return new Promise(ok => { requestAnimationFrame(() => setTimeout(ok, 0)); setTimeout(ok, 120) })
}
const attendre = (ms: number) => new Promise(ok => setTimeout(ok, ms))

/** Ce que l'on dit d'une écriture qui a échoué */
function raison(e: unknown): string {
  const nom = (e as { name?: string } | null)?.name
  if (nom === 'QuotaExceededError') return 'il n\'y a plus de place sur le disque ou sur la clé'
  if (nom === 'NotAllowedError' || nom === 'SecurityError') return 'le navigateur n\'a pas permis d\'écrire ce fichier'
  if (nom === 'NotFoundError') return 'le dossier choisi n\'existe plus (la clé a-t-elle été retirée ?)'
  if (nom === 'NoModificationAllowedError' || nom === 'InvalidStateError') return 'le fichier est en lecture seule, ou ouvert ailleurs'
  const m = e instanceof Error ? e.message.trim().replace(/\.$/, '') : ''
  return m || 'erreur inconnue'
}

/** Un téléchargement ; le lien va dans la fenêtre ouverte s'il y en a une
 *  (hors d'elle, la page est inerte). L'image copiée s'en sert aussi
 *  (« Enregistrer l'image (.png) », voir sorties/image.ts). */
export function telecharger(fichier: Blob, nom: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(fichier); a.download = nom; a.hidden = true
  ;(document.querySelector('dialog[open]') ?? document.body).appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000)
}

export class Sauvegarde {
  private canal: BroadcastChannel | null = null
  private choix: HTMLInputElement
  /** Un enregistrement à la fois */
  private enCours = false
  /** Le tableau a été remplacé ailleurs : cet onglet attend d'être rechargé */
  private perime = false

  constructor(private app: App, private dire: (texte: string) => void, racine: HTMLElement) {
    this.choix = Object.assign(document.createElement('input'), { type: 'file', hidden: true })
    if (!IOS) this.choix.accept = EXTENSION_TABLEAU
    this.choix.setAttribute('aria-hidden', 'true')
    this.choix.addEventListener('change', () => {
      const f = this.choix.files?.[0]
      this.choix.value = ''
      if (f) void this.ouvrirFichier(f)
    })
    racine.appendChild(this.choix)

    try {
      this.canal = new BroadcastChannel(CANAL)
      this.canal.onmessage = e => { if ((e.data as { type?: string } | null)?.type === 'remplace') this.remplaceAilleurs() }
    } catch { /* pas de canal (vieux navigateur) : chaque onglet vit sa vie */ }

    // En capture sur window, posé au démarrage : avant le navigateur, qui
    // enregistrerait la page web ou ouvrirait un fichier, et avant la revue.
    // e.key : en AZERTY comme en QWERTY, la lettre S est « s ». Pendant la
    // revue et la trieuse des pages, Ctrl + O se tait (le tableau qu'on
    // remplacerait est caché) ; Ctrl + S, lui, enregistre toujours.
    window.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const k = e.key.toLowerCase()
      if (k !== 's' && k !== 'o') return
      e.preventDefault()
      if (e.repeat || document.querySelector('dialog[open]') || enSeance()) return
      if (k === 's') void this.enregistrer()
      else if (!tableauCache(this.app)) this.ouvrir()
    }, true)
  }

  /** Ce que dit le menu : « Jamais enregistré… » ou « Dernier enregistrement… » */
  etat(): string {
    let t = NaN
    try { t = Number(localStorage.getItem(CLE_DERNIER)) } catch { /* rien de gardé */ }
    return Number.isFinite(t) && t > 0
      ? `Dernier enregistrement dans un fichier : ${quandLisible(t)}.`
      : 'Jamais enregistré dans un fichier : ce tableau n\'existe que dans ce navigateur.'
  }

  // ---------- Enregistrer ----------
  /** Vrai si le fichier est écrit (ou son téléchargement lancé) */
  async enregistrer(): Promise<boolean> {
    if (this.enCours || this.perime) return false
    this.enCours = true
    try { return await this.ecrireLeFichier() } finally { this.enCours = false }
  }

  private async ecrireLeFichier(): Promise<boolean> {
    const nom = nomTableau()
    // L'emplacement d'abord : l'appui (ou Ctrl + S) ne permet d'ouvrir cette
    // fenêtre que pendant quelques secondes
    let choisi: FichierChoisi | null = null
    const choisir = (window as unknown as { showSaveFilePicker?: ChoisirOuEnregistrer }).showSaveFilePicker
    if (typeof choisir === 'function') {
      try {
        choisi = await choisir.call(window, {
          suggestedName: nom,
          types: [{ description: 'Tableau complet (MEM teachingtool)', accept: { 'application/octet-stream': [EXTENSION_TABLEAU] } }],
        })
      } catch (e) {
        if ((e as { name?: string } | null)?.name === 'AbortError') return false     // on a renoncé
        choisi = null           // page ouverte depuis la clé, page intégrée… : on télécharge
      }
    }
    this.dire('Enregistrement du tableau…')
    await uneImage()
    try {
      this.app.poserCeQuiAttend()
      const date = Date.now()
      const fichier = ecrireTableau(this.app.tableau.doc, date)
      if (choisi) {
        const w = await choisi.createWritable()
        await w.write(fichier)
        await w.close()
      } else telecharger(fichier, nom)
      ecrire(CLE_DERNIER, String(date))
      this.dire(`Tableau enregistré : ${choisi?.name || nom} (${tailleLisible(fichier.size)}).`)
      return true
    } catch (e) {
      this.dire(`Le tableau n'a pas pu être enregistré : ${raison(e)}.`)
      return false
    }
  }

  // ---------- Ouvrir ----------
  /** Pourquoi on ne peut pas ouvrir un tableau maintenant (null : on peut) */
  private refus(): string | null {
    if (this.perime) return 'Rechargez d\'abord la page.'
    if (this.app.enLecture) return 'Fermez d\'abord la revue.'
    if (enSeance()) return 'Fermez d\'abord la séance d\'automatismes.'
    if (document.querySelector('dialog[open]')) return 'Fermez d\'abord la fenêtre ouverte.'
    return null
  }

  /** Choisir un fichier .memc */
  ouvrir() {
    const r = this.refus()
    if (r) return this.dire(r)
    this.choix.value = ''
    this.choix.click()
  }

  /** Un fichier choisi ou glissé sur le tableau : on le lit (sans rien
   *  toucher), puis on demande confirmation */
  async ouvrirFichier(f: File) {
    const r = this.refus()
    if (r) return this.dire(r)
    if (f.size > 2_000_000) { this.dire('Lecture du fichier…'); await uneImage() }
    let lu: ReturnType<typeof lireTableau>
    try { lu = lireTableau(new Uint8Array(await f.arrayBuffer())) } catch (e) {
      this.dire(e instanceof ErreurFichier ? e.message : 'Ce fichier n\'a pas pu être lu.')
      return
    }
    // La lecture a pris un moment : une fenêtre a pu s'ouvrir entre-temps
    const r2 = this.refus()
    if (r2) return this.dire(r2)
    this.confirmer(f.name, lu.entete, lu.etat, lu.pages)
  }

  private confirmer(nom: string, entete: EnteteTableau, etat: Uint8Array, pages: number) {
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ouvrir'
    d.innerHTML = `<h2>Ouvrir ce tableau ?</h2><div class="corps"><p></p><div class="actions">
      <button type="button" class="secondaire" data-a="annuler">Annuler</button>
      <button type="button" class="secondaire" data-a="enregistrer">Enregistrer d'abord</button>
      <button type="button" class="principal danger-plein" data-a="remplacer">Remplacer</button></div></div>`
    const texte = d.querySelector('p')!
    const quand = Number.isFinite(entete.date) && entete.date > 0 ? `, enregistré ${dateLisible(entete.date)}` : ''
    texte.textContent = `« ${nom} » : ${pagesLisibles(pages)}${quand}. Il remplace le tableau de ce navigateur (${pagesLisibles(this.app.pages.length)}) et tout son historique. Pour garder celui-ci, enregistrez-le d'abord.`
    const bouton = (a: string) => d.querySelector<HTMLButtonElement>(`[data-a="${a}"]`)!
    const annuler = bouton('annuler'), avant = bouton('enregistrer'), remplacer = bouton('remplacer')
    /** Pendant le remplacement, la fenêtre ne se ferme plus */
    let bloque = false
    const fermer = () => { if (bloque) return; if (d.open) d.close(); d.remove() }
    d.addEventListener('cancel', e => { if (bloque) e.preventDefault() })
    d.addEventListener('close', () => { if (bloque) d.showModal(); else d.remove() })
    d.addEventListener('click', e => { if (e.target === d) fermer() })
    annuler.addEventListener('click', fermer)
    avant.addEventListener('click', async () => {
      avant.disabled = true
      const ok = await this.enregistrer()
      if (ok) avant.textContent = 'Enregistré ✓'
      else avant.disabled = false
    })
    remplacer.addEventListener('click', async () => {
      bloque = true
      for (const b of [annuler, avant, remplacer]) b.disabled = true
      remplacer.textContent = 'Remplacement…'
      // Les autres onglets ouverts sur ce tableau cessent d'écrire avant qu'on
      // vide la base (sinon ils y remettraient des bouts de l'ancien)
      try { this.canal?.postMessage({ type: 'remplace' }) } catch { /* seul onglet */ }
      await attendre(300)
      try {
        await this.app.tableau.remplacerPar(etat)
      } catch {
        // La transaction n'a rien changé ; ce qui s'écrirait ici, en revanche,
        // ne s'enregistrerait plus : on recharge
        this.perime = true
        texte.textContent = 'Le tableau n\'a pas pu être remplacé (le navigateur manque peut-être de place). Le tableau actuel n\'a pas changé.'
        this.boutonRecharger(d)
        return
      }
      this.app.oublierVues()
      this.app.arreterSession()
      // Ce tableau-ci est dans un fichier depuis la date de celui-ci
      if (Number.isFinite(entete.date) && entete.date > 0) ecrire(CLE_DERNIER, String(entete.date))
      try { sessionStorage.setItem(CLE_OUVERT, String(pages)) } catch { /* pas de message au retour */ }
      location.reload()
    })
    document.body.appendChild(d)
    d.showModal()
    annuler.focus()
  }

  /** Les boutons de la fenêtre laissent la place à « Recharger » */
  private boutonRecharger(d: HTMLDialogElement) {
    const actions = d.querySelector('.actions')!
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'principal', textContent: 'Recharger' })
    b.addEventListener('click', () => location.reload())
    actions.replaceChildren(b)
    b.focus()
  }

  /** Un autre onglet vient d'ouvrir un autre tableau dans ce navigateur : ce
   *  qu'on écrirait ici ne serait plus enregistré. On cesse d'écrire, et une
   *  fenêtre qu'on ne peut que quitter en rechargeant le dit. */
  private remplaceAilleurs() {
    if (this.perime) return
    this.perime = true
    this.app.tableau.couper()
    this.app.arreterSession()
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ouvrir'
    d.innerHTML = '<h2>Le tableau a changé</h2><div class="corps"><p></p><div class="actions"></div></div>'
    d.querySelector('p')!.textContent = 'Un autre tableau vient d\'être ouvert dans un autre onglet. Rechargez cette page pour le voir : ce qui serait écrit ici ne serait plus enregistré.'
    d.addEventListener('cancel', e => e.preventDefault())
    // Échap tenu ferme quand même une fenêtre dans certains navigateurs : elle revient
    d.addEventListener('close', () => d.showModal())
    document.body.appendChild(d)
    d.showModal()
    this.boutonRecharger(d)
  }

  /** Au démarrage : un tableau vient d'être ouvert, on le dit */
  annoncerOuverture() {
    let n: string | null = null
    try { n = sessionStorage.getItem(CLE_OUVERT); sessionStorage.removeItem(CLE_OUVERT) } catch { return }
    if (n && Number(n) > 0) this.dire(`Tableau ouvert : ${pagesLisibles(Number(n))}.`)
  }
}

function enSeance(): boolean { return document.body.classList.contains('en-seance') }
