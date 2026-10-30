// =============================================================
// LA FENÊTRE « PUBLIER LE REPLAY »
// Le professeur choisit la séance (repérée toute seule dans le film), les
// pages, un titre et le compte Google. Il peut la regarder comme un élève
// avant de la publier. Il reçoit un lien stable à coller dans Pronote :
// republier la même séance met à jour le même fichier, le lien ne change pas.
// Une copie d'un classeur (« Dupliquer le classeur », « Ajouter comme
// copie », lot 4) a reçu les séances de l'original avec toute son histoire,
// donc à la même heure de début : sans registre (il est vidé), Publier
// retrouverait quand même la séance de l'original sur le Drive par sa clé.
// Marquée (fichier.CARTE_COPIE), elle publie sous une clé à elle : un
// nouveau lien, et celui de l'autre classe ne change pas. Un classeur qui
// n'est pas une copie publie exactement comme avant.
// Publier en un clic (lot 16) : quand le replay va dans un dossier de
// l'ordinateur et que tout est retenu pour ce classeur (le Drive des élèves,
// le dossier choisi ou celui du chapitre), et qu'une séance du classeur y a
// déjà été rangée, la fenêtre s'ouvre en résumé : la séance du jour et ses
// pages, où le replay va, un gros « Publier ». « Modifier… » déplie tout.
// Les réglages sont lus avant d'afficher : la fenêtre s'ouvre telle qu'elle
// sera, sans se replier sous les yeux du professeur.
// =============================================================
import * as Y from 'yjs'
import type { App } from '../app'
import { exporter, pagesAPublier, pagesDeLaSeance, seancesAPublier } from '../revoir/exporter'
import type { Seance, SeanceExplicite } from '../revoir/exporter'
import { deLaSeance, libelleSeance } from '../seances'
import type { FilmEleve } from '../revoir/format'
import { ErreurFilm, ecrireFilm, lireFilm } from '../revoir/format'
import { Bobine } from '../revoir/bobine'
import { essayerRelais, lireParLeRelais, lireParSonCode } from '../revoir/relais'
import { CLIENT_GOOGLE, COMPTES, EXTENSION, RELAIS_REPLAY, compteDe, lienEleve, lienEleveParCode, nouveauCode, relaisDe } from './comptes'
import type { PoigneeDossier } from '../classeurs/ordinateur'
import { accordDuDossier, choisitUnDossier } from '../classeurs/ordinateur'
import type { Registre } from '../classeurs/registre'
import type { Proposition, ReglageReplay } from './replay-dossier'
import { choisirLeDossier, deposerLeFichierSeance, deposerLeReplay, dossierDuChapitre, lireReglage, nomDuFichierSeance, nomDuReplay, retenirReglage, texteDuResume } from './replay-dossier'
import { marqueDeCopie } from '../fichier'
import { connecte, connecter, courrielDe, deconnecter, preparerGoogle, publier } from './drive'
import type { FicheDeSeance } from '../resume/fiche'
import { texteAvecLeLien, texteCahierDeGemini, texteCahierDeLOutil, consigneGemini, copierMisEnForme } from '../resume/fiche'
import { ficheDeLaSeance, gestesDeLaSeance } from '../resume/collecte'
import { ErreurGemini, PAGES_MAX, cleGemini, consignesDuProfesseur, demanderAGemini, dernierModele, enTeteGemini, imagePourGemini, pronoteDe } from '../resume/gemini'
import { ouvrirRedaction } from '../resume/reglage-vue'

/** Ce qu'on retient d'une séance publiée, dans le document du professeur
 *  (jamais dans le film élève) : de quoi republier au même lien */
interface Publiee { compte: string; id: string; titre: string; quand: number; cle?: string
  /** Rangée dans un dossier de l'ordinateur : le code du fichier « Titre [code].mem » (id vide) */
  code?: string }

const MINUTE = 60_000
/** La version du relais (relais/relais-seances.gs) que ce site attend */
const VERSION_RELAIS = 4
/** Publier avec la connexion Google (l'ancien envoi) se contente de la version 3 du relais */
const VERSION_RELAIS_GOOGLE = 3
/** Le replay rangé dans un dossier : on redemande au relais toutes les 5 secondes, 10 minutes au plus */
const ATTENTE_RELAIS = 5_000
const ESSAIS_RELAIS = 120
/** Les découpages proposés : un silence plus long sépare deux séances */
const DECOUPAGES = [20, 10, 5, 2]

const heure = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')
const jour = (t: number) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const echapper = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Le compte Google avec lequel on a publié la dernière fois dans `compte`,
 *  retenu sur cet ordinateur seulement : Google le propose en premier */
const MEMOIRE_COMPTE = 'tableau-mem:compte-google:'
const dernierCompte = (compte: string) => { try { return localStorage.getItem(MEMOIRE_COMPTE + compte) ?? '' } catch { return '' } }
const retenirCompte = (compte: string, courriel: string) => { try { if (courriel) localStorage.setItem(MEMOIRE_COMPTE + compte, courriel) } catch { /* navigation privée */ } }
const memes = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
/** L'accord d'écrire dans un dossier retenu (Chrome le redemande après un redémarrage) : dans le clic */
const choisirAccord = (x: PoigneeDossier) => accordDuDossier(x, true).catch(() => false)
const kilo = (n: number) => n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`


export class Publication {
  private d: HTMLDialogElement | null = null
  private seances: Seance[] = []
  /** Le lien publié et la ligne de ses pages : « Copier pour Pronote » y
   *  ajoute le texte du cahier de textes tel qu'il est à ce moment-là */
  private publie: { lien: string; pages: string; titre: string } | null = null
  /** Le texte du cahier de textes a été touché par le professeur depuis
   *  qu'on l'a rempli : Gemini ne l'écrase pas */
  private texteTouche = false
  /** Quelle rédaction par Gemini est en cours (la séance change : elle ne compte plus) */
  private redaction = 0
  /** L'image d'une page pour Gemini (ui.ts) ; absente : pas de rédaction automatique */
  imageDePage: ((page: string) => Promise<Blob | null>) | null = null
  /** Publier quand même avec un autre compte que d'habitude : « compte:adresse » confirmé */
  private autreCompteAccepte = ''
  /** La bibliothèque et le classeur ouvert (main.ts) : de quoi retrouver le dossier du chapitre
   *  et retenir le dossier et le Drive choisis ; absent : on choisit à chaque fois */
  lieu: { registre: Registre; idClasseur: string } | null = null
  /** Ce qui est retenu pour ce classeur, et le dossier proposé (niveau relié à l'ordinateur) */
  private retenu: ReglageReplay = {}
  private propose: Proposition | null = null
  /** Le dossier qu'on vient de choisir dans cette fenêtre (sinon : le retenu, puis le proposé) */
  private choisi: PoigneeDossier | null = null
  /** Quelle vérification du lien est en cours (une seule : la fenêtre ou la séance change) */
  private attente = 0
  /** Quelle ouverture est en cours (les réglages se lisent avant d'afficher : le dernier clic gagne) */
  private ouverture = 0

  constructor(private app: App, private racine: HTMLElement) {}

  private get registre() { return this.app.tableau.doc.getMap('publications') as Y.Map<Publiee> }
  private get lecteur() { return new URL('revoir.html', location.href).toString() }
  /** La version en ligne (ou celle de développement) a le lecteur à côté d'elle et peut se connecter à
   *  Google ; la version hors ligne ne peut qu'enregistrer le fichier séance */
  private get enLigne() {
    const servie = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    return servie && (import.meta.env.DEV || import.meta.env.VITE_EN_LIGNE === '1')
  }

  /** Les séances du film qui ont quelque chose à montrer, la plus récente
   *  d'abord (voir seancesAPublier) */
  private reperer(ecart: number) { return seancesAPublier(this.app.tableau, ecart) }

  /** La fenêtre. complet : tout montrer même quand le résumé suffirait (les essais) */
  /** seance : la séance à choisir d'office (son id, lot 6 ; « Publier la
   *  séance… », le menu d'une séance de la bibliothèque) */
  async ouvrir(o: { complet?: boolean; seance?: string } = {}) {
    this.seances = this.reperer(DECOUPAGES[0] * MINUTE)
    if (!this.seances.length) return this.app.ui.message('Rien à publier pour l\'instant : le replay commence avec ce que vous écrivez pendant la séance.')
    if (this.enLigne) preparerGoogle()
    // Ce qui est retenu pour ce classeur, et le dossier du chapitre (niveau
    // relié à l'ordinateur) : lus AVANT de construire la fenêtre, pour qu'elle
    // s'ouvre d'emblée telle qu'elle sera (en résumé, ou complète avec le
    // dossier retenu), sans se replier une fois affichée
    const demande = ++this.ouverture
    let retenu: ReglageReplay = {}, propose: Proposition | null = null
    if (this.lieu) {
      const { registre, idClasseur } = this.lieu
      ;[retenu, propose] = await Promise.all([lireReglage(registre, idClasseur), dossierDuChapitre(registre, idClasseur)])
      // Un autre clic a demandé la fenêtre pendant la lecture : c'est lui qui la montre
      if (this.ouverture !== demande) return
    }
    this.d?.remove()
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-publier'
    d.setAttribute('aria-labelledby', 'titre-publier')
    d.innerHTML = `
      <h2 id="titre-publier">Publier le replay pour les élèves</h2>
      <div class="corps">
        <div class="p-resume" hidden>
          <p class="p-resume-seance"></p>
          <p class="p-resume-lieu"></p>
          <p class="p-resume-titre" hidden></p>
          <p><button type="button" class="secondaire petit p-modifier" title="Changer la séance, les pages, le titre, le dossier ou le Drive">Modifier…</button></p>
        </div>
        <label class="champ"><span>Séance</span><select class="p-seance"></select></label>
        <label class="champ"><span>Deux cours se suivent de près ? Séparer les séances aux pauses de plus de</span>
          <select class="p-decoupage">${DECOUPAGES.map(m => `<option value="${m}">${m} minutes</option>`).join('')}</select></label>
        <fieldset class="p-pages"><legend>Pages où l'on a écrit pendant la séance</legend><div class="cases"></div></fieldset>
        <div class="p-cahier" hidden>
          <label class="p-cahier-champ"><span>Texte pour le cahier de textes (vous pouvez le corriger)</span>
            <textarea class="p-texte-cahier" rows="4" maxlength="2000" spellcheck="true"></textarea></label>
          <p class="p-cahier-marques">Dans Pronote : **gras**, __souligné__, « • » en début de ligne pour une puce.</p>
          <p class="p-cahier-pied"><span class="p-cahier-qui" role="status" aria-live="polite"></span>
            <button type="button" class="lien p-reessayer" hidden>Réessayer</button>
            <button type="button" class="lien p-redaction">Rédaction automatique…</button></p>
        </div>
        <label class="champ"><span>Titre (les élèves le voient)</span><input class="p-titre" maxlength="120" /></label>
        <fieldset class="p-lieu"><legend>Où ranger le replay</legend><div class="cases">
          <label class="case"><input type="radio" name="p-lieu" value="dossier"><span>Dans un dossier de l'ordinateur ou de Google Drive pour ordinateur (sans connexion Google)</span></label>
          <label class="case"><input type="radio" name="p-lieu" value="google"><span>Sur le Drive, en me connectant à Google</span></label></div></fieldset>
        <div class="p-dossier">
          <label class="champ"><span>Nom du fichier (le code entre crochets est ajouté tout seul)</span><input class="p-nomfichier" maxlength="80" /></label>
          <p>Ranger dans : <strong class="p-chemin">…</strong> <button type="button" class="secondaire petit p-choisir">Choisir…</button></p>
          <p class="p-drive-retenu" hidden>Drive des élèves : <strong class="p-drive-nom"></strong> <button type="button" class="secondaire petit p-drive-changer">Changer</button></p>
        </div>
        <fieldset class="p-comptes"><legend>Publier dans</legend><div class="cases"></div>
          <p class="p-google"><span class="p-qui"></span> <button type="button" class="secondaire petit p-changer">Choisir le compte Google</button></p></fieldset>
        <label class="case p-nouveau-lien" hidden><input type="checkbox" class="p-nouveau"><span>Publier comme une nouvelle séance (nouveau lien, l'ancien reste tel quel)</span></label>
        <ul class="p-verifier" aria-label="À vérifier avant de publier"></ul>
        <div class="actions">
          <button type="button" class="secondaire p-apercu">Voir comme un élève</button>
          <button type="button" class="secondaire p-fichier">Enregistrer le fichier</button>
          <button type="button" class="principal p-publier">Publier</button>
        </div>
        <p class="p-etat" role="status" aria-live="polite"></p>
        <div class="p-resultat" hidden>
          <label class="champ"><span>Le lien de la séance</span><input class="p-lien" readonly /></label>
          <div class="actions">
            <button type="button" class="secondaire p-copier">Copier le lien</button>
            <button type="button" class="principal p-pronote">Copier pour Pronote</button>
            <a class="principal bouton-lien p-ouvrir-pronote" target="_blank" rel="noopener" hidden>Copier et ouvrir Pronote</a>
            <a class="secondaire bouton-lien p-ouvrir" target="_blank" rel="noopener">Tester le lien</a>
          </div>
          <p class="p-copie-faite" hidden>Le texte pour Pronote est déjà copié : dans le cahier de textes, faites Ctrl+V.</p>
        </div>
        <div class="actions fin"><button type="button" class="secondaire p-fermer">Fermer</button></div>
      </div>`
    this.racine.appendChild(d)
    this.d = d
    const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T

    q<HTMLSelectElement>('.p-seance').addEventListener('change', () => this.choisirSeance())
    // Des séances explicites (lot 6) : rien à découper
    if (this.explicites) {
      q<HTMLSelectElement>('.p-decoupage').closest('label')!.hidden = true
      q('.p-pages legend').textContent = 'Les pages de la séance'
    }
    q<HTMLSelectElement>('.p-decoupage').addEventListener('change', () => {
      const s = this.reperer(Number(q<HTMLSelectElement>('.p-decoupage').value) * MINUTE)
      if (s.length) { this.seances = s; this.remplirSeances() }
    })
    // Dans un dossier de l'ordinateur d'abord, quand ce navigateur sait y écrire (Chrome, Edge) ;
    // sinon, comme avant, sur le Drive avec la connexion Google
    const dossierPossible = choisitUnDossier()
    const googlePossible = this.enLigne && !!CLIENT_GOOGLE
    const premier = dossierPossible ? 'dossier' : 'google'
    for (const r of d.querySelectorAll<HTMLInputElement>('input[name=p-lieu]')) {
      r.checked = r.value === premier
      r.disabled = r.value === 'dossier' ? !dossierPossible : !googlePossible
    }
    d.querySelector('.p-lieu')!.toggleAttribute('hidden', !dossierPossible && !googlePossible)
    this.retenu = retenu; this.propose = propose; this.choisi = null
    this.remplirComptes()

    q('.p-apercu').addEventListener('click', () => this.apercu())
    q('.p-fichier').addEventListener('click', () => this.enregistrer())
    q('.p-publier').addEventListener('click', () => this.publier())
    q('.p-changer').addEventListener('click', () => this.choisirCompteGoogle())
    q('.p-choisir').addEventListener('click', () => void this.choisirLeDossier())
    q('.p-modifier').addEventListener('click', () => this.afficherResume(false))
    q('.p-drive-changer').addEventListener('click', () => { q('.p-drive-retenu').hidden = true; q('.p-comptes').hidden = false })
    q('.p-copier').addEventListener('click', () => this.copier(q<HTMLInputElement>('.p-lien').value, 'Lien copié'))
    q('.p-pronote').addEventListener('click', () => this.copier(this.textePronote, 'Texte copié : collez-le dans le cahier de textes', true))
    // Le lien s'ouvre de lui-même (un onglet) ; dans le même clic, le texte part dans le presse-papiers
    // D'abord la copie, puis Pronote : l'onglet ouvert tout de suite ôtait la
    // page au navigateur avant la fin de la copie (le texte mis en forme)
    q('.p-ouvrir-pronote').addEventListener('click', e => {
      e.preventDefault()
      const a = e.currentTarget as HTMLAnchorElement
      void this.copier(this.textePronote, 'Texte copié : dans Pronote, cliquez dans le cahier de textes et faites Ctrl+V', true)
        .finally(() => window.open(a.href, '_blank', 'noopener'))
    })
    q('.p-reessayer').addEventListener('click', () => this.preparerTexte(true))
    q('.p-redaction').addEventListener('click', () => ouvrirRedaction(this.racine, () => { this.majPronote(); this.preparerTexte(true) }))
    const champCahier = q<HTMLTextAreaElement>('.p-texte-cahier')
    champCahier.addEventListener('input', () => { this.texteTouche = true })
    // Corrigé par le professeur : il le garde, avec la séance (Gemini ne le réécrit plus)
    champCahier.addEventListener('change', () => this.garderTexte(champCahier.value, 'professeur'))
    q('.p-fermer').addEventListener('click', () => d.close())
    d.addEventListener('close', () => { d.remove(); if (this.d === d) this.d = null })
    d.addEventListener('change', e => {
      if ((e.target as HTMLElement).closest('.p-lieu')) { this.remplirComptes(); this.majLieu(); this.majNouveauLien(); this.majGoogle() }
      if ((e.target as HTMLElement).closest('.p-comptes')) { this.majNouveauLien(); this.majGoogle(); this.majPronote() }
      if ((e.target as HTMLElement).closest('.p-lieu, .p-pages, .p-comptes, .p-nouveau-lien')) this.majVerifications()
      if ((e.target as HTMLElement).closest('.p-pages, .p-comptes')) this.majResume()
    })

    if (!this.enLigne) {
      q('.p-apercu').hidden = true
      this.etat(choisitUnDossier()
        ? 'La version hors ligne range le replay dans le dossier choisi, mais ne montre ni l\'aperçu ni le lien : pour le lien des élèves, publiez le même replay avec MEM teachingtool en ligne.'
        : 'La version hors ligne de MEM teachingtool ne peut ni publier ni montrer l\'aperçu : enregistrez le fichier séance, ou utilisez MEM teachingtool en ligne pour publier.')
    }
    this.remplirSeances()
    if (o.seance) {
      const i = this.seances.findIndex(s => (s as Partial<SeanceExplicite>).id === o.seance)
      if (i >= 0) { q<HTMLSelectElement>('.p-seance').value = String(i); this.choisirSeance() }
    }
    this.majLieu()
    this.majGoogle()
    d.showModal()
    this.afficherResume(this.resumePossible && !o.complet)
  }

  /** Le résumé suffit : le replay va dans un dossier de l'ordinateur, tout est
   *  retenu pour ce classeur (le Drive des élèves, le dossier choisi ou celui du
   *  chapitre), et une séance du classeur y a déjà été rangée. Sinon, la
   *  fenêtre complète, comme la première fois. */
  private get resumePossible() {
    if (!this.lieu || this.mode !== 'dossier') return false
    const compte = this.retenu.compte
    if (!compte || !relaisDe(compte)?.relais) return false
    if (!this.retenu.poignee && !this.propose) return false
    for (const p of this.registre.values()) if (p.code) return true
    return false
  }

  /** En résumé (deux lignes, « Modifier… », un gros « Publier »), ou complète */
  private afficherResume(oui: boolean) {
    const d = this.d
    if (!d) return
    d.classList.toggle('resume', oui)
    ;(d.querySelector('.p-resume') as HTMLElement).hidden = !oui
    this.majResume()
    ;(d.querySelector(oui ? '.p-publier' : '.p-seance') as HTMLElement).focus()
  }

  /** Les lignes du résumé : la séance et ses pages, le dossier et le Drive, le
   *  titre quand le professeur en a donné un autre que celui proposé d'office */
  private majResume() {
    const d = this.d
    if (!d) return
    const s = this.seance, x = s as Partial<SeanceExplicite>
    const libelle = x.id ? libelleSeance({ debut: s.debut, nom: x.nom ?? null }) : `Séance du ${jour(s.debut)}`
    const titre = (d.querySelector('.p-titre') as HTMLInputElement).value
    const compte = this.compte || this.retenu.compte || ''
    const t = texteDuResume({
      libelle, aujourdhui: !!x.id && x.id === this.app.tableau.derniereSeance()?.id, pages: this.pagesChoisies().length,
      titre: titre === this.titreParDefaut(s) ? '' : titre,
      chemin: this.choisi?.name ?? this.retenu.poignee?.name ?? this.propose?.chemin ?? 'aucun dossier choisi',
      drive: relaisDe(compte)?.nom ?? 'aucun Drive',
    })
    d.querySelector('.p-resume-seance')!.textContent = t.seance
    d.querySelector('.p-resume-lieu')!.textContent = t.lieu
    const pt = d.querySelector('.p-resume-titre') as HTMLElement
    pt.hidden = t.titre === null; pt.textContent = t.titre ?? ''
  }

  /** Dans un dossier de l'ordinateur, ou sur le Drive avec la connexion Google ? */
  private get mode(): 'dossier' | 'google' {
    const r = this.d?.querySelector('input[name=p-lieu]:checked') as HTMLInputElement | null
    return r?.value === 'google' ? 'google' : 'dossier'
  }

  /** Les Drive proposés : pour un dossier de l'ordinateur, les relais (dont LyFEL) ;
   *  pour la connexion Google, les comptes qui ont leurs dossiers */
  private remplirComptes() {
    const d = this.d!
    const liste = this.mode === 'dossier' ? RELAIS_REPLAY : COMPTES
    const garde = this.compte || this.retenu.compte
    // Coché d'avance : celui que ce niveau a déjà, sinon le premier dont le relais est installé
    const parDefaut = liste.find(c => c.cle === garde && c.relais) ?? liste.find(c => c.relais) ?? liste[0]
    d.querySelector('.p-comptes .cases')!.innerHTML = liste.map(c => `
      <label class="case"><input type="radio" name="p-compte" value="${echapper(c.cle)}"${c === parDefaut ? ' checked' : ''}${c.relais ? '' : ' disabled'}>
      <span>${echapper(c.nom)}${c.relais ? '' : ' <em>(relais à installer)</em>'}</span></label>`).join('')
    d.querySelector('.p-comptes legend')!.textContent = this.mode === 'dossier' ? 'Le Drive de ce dossier (pour le lien des élèves)' : 'Publier dans'
  }

  /** Ce que montre la fenêtre selon le lieu : le dossier et le nom du fichier, ou la connexion Google */
  private majLieu() {
    const d = this.d!, dossier = this.mode === 'dossier'
    ;(d.querySelector('.p-dossier') as HTMLElement).hidden = !dossier
    // Le Drive n'est demandé que la première fois pour un niveau : ensuite, une ligne
    const retenu = dossier && !!this.retenu.compte && relaisDe(this.retenu.compte)?.relais
    ;(d.querySelector('.p-comptes') as HTMLElement).hidden = !!retenu
    ;(d.querySelector('.p-drive-retenu') as HTMLElement).hidden = !retenu
    if (retenu) (d.querySelector('.p-drive-nom') as HTMLElement).textContent = relaisDe(this.retenu.compte!)!.nom
    const nom = d.querySelector('.p-nomfichier') as HTMLInputElement
    if (dossier && !nom.value) nom.value = (d.querySelector('.p-titre') as HTMLInputElement).value
    const chemin = this.choisi?.name ?? this.retenu.poignee?.name ?? this.propose?.chemin
    ;(d.querySelector('.p-chemin') as HTMLElement).textContent = chemin ?? 'aucun dossier choisi'
    this.majResume()
  }

  /** « Choisir… » : un autre dossier de l'ordinateur (une clé, G:\Mon Drive\…) */
  private async choisirLeDossier() {
    try {
      const x = await choisirLeDossier()
      if (!x || !this.d) return
      this.choisi = x
      this.majLieu(); this.majVerifications()
    } catch { this.etat('Le dossier n\'a pas pu être choisi. Réessayez.', true) }
  }

  /** Les séances sont-elles explicites (lot 6 : le classeur a des séances) ? */
  private get explicites() { return !!this.seances.length && 'pagesDeSeance' in this.seances[0] }

  private remplirSeances() {
    const choix = this.d!.querySelector('.p-seance') as HTMLSelectElement
    // Une séance explicite (lot 6) : son nom ou sa date, et sa plage de temps ;
    // la séance du jour est choisie d'office (elle est la première)
    const jourId = this.app.tableau.derniereSeance()?.id
    choix.innerHTML = this.seances.map((s, i) => {
      const x = s as Partial<SeanceExplicite>
      const qui = x.id ? `${echapper(x.nom ?? jour(s.debut))}${x.id === jourId ? ' (aujourd\'hui)' : ''}, ` : `${echapper(jour(s.debut))}, `
      return `<option value="${i}">${qui}${heure(s.debut)} → ${heure(s.fin)} · ${s.gestes} geste${s.gestes > 1 ? 's' : ''}</option>`
    }).join('')
    this.choisirSeance()
  }

  private get seance() { return this.seances[Number((this.d!.querySelector('.p-seance') as HTMLSelectElement).value)] ?? this.seances[0] }
  private get compte() { return (this.d!.querySelector('input[name=p-compte]:checked') as HTMLInputElement | null)?.value ?? '' }
  private get nouveauLien() { return !!(this.d!.querySelector('.p-nouveau') as HTMLInputElement).checked }
  private cleRegistre(s = this.seance, compte = this.compte) { return `${compte}:${s.debut}` }

  private choisirSeance() {
    const d = this.d!, s = this.seance, t = this.app.tableau
    const ordre = t.ordre.toArray()
    // Seules les pages où il se passe quelque chose : les autres ne seraient pas montrées.
    // Une séance explicite (lot 6) : exactement SES pages, numérotées dans la séance
    const x = s as Partial<SeanceExplicite>
    const pages = x.pagesDeSeance ? pagesAPublier(t, s as SeanceExplicite) : pagesDeLaSeance(t, s)
    const maintenant = Date.now()
    d.querySelector('.p-pages .cases')!.innerHTML = pages.map(p => {
      let texte: string
      if (!x.pagesDeSeance) { const n = ordre.indexOf(p); texte = n >= 0 ? `Page ${n + 1}` : 'Page jetée depuis' }
      else {
        const sa = t.seanceDe(p), k = sa ? sa.pages.indexOf(p) : -1, nom = t.nomDe(p)
        const de = t.herite(p), source = de ? t.seanceDe(de) : null
        const reprise = source && sa && source.id !== sa.id ? ` (reprise ${deLaSeance(source, maintenant)})` : ''
        texte = k < 0 ? 'Page jetée depuis' : `Page ${k + 1}${nom ? ` · ${nom}` : ''}${reprise}${sa && sa.id !== x.id ? ` — ${libelleSeance(sa)}` : ''}`
      }
      return `<label class="case"><input type="checkbox" value="${echapper(p)}" checked><span>${echapper(texte)}</span></label>`
    }).join('')
    const deja = this.registre.get(this.cleRegistre())
    ;(d.querySelector('.p-titre') as HTMLInputElement).value = deja?.titre ?? this.titreParDefaut(s)
    ;(d.querySelector('.p-resultat') as HTMLElement).hidden = true
    // Le nom du fichier suit le titre de la séance choisie
    ;(d.querySelector('.p-nomfichier') as HTMLInputElement).value = (d.querySelector('.p-titre') as HTMLInputElement).value
    this.attente++
    this.publie = null
    ;(d.querySelector('.p-copie-faite') as HTMLElement).hidden = true
    this.preparerTexte()
    this.majNouveauLien()
    this.majVerifications()
    this.majResume()
  }

  // ----- Le texte du cahier de textes (voir resume/) -----
  /** La séance choisie, si elle est explicite (lot 6), et sa fiche */
  private ficheChoisie(): { id: string; fiche: FicheDeSeance } | null {
    const x = this.seance as Partial<SeanceExplicite>
    if (!x.id) return null
    const fiche = ficheDeLaSeance(this.app.tableau, x.id, this.app.classeur.nom)
    return fiche ? { id: x.id, fiche } : null
  }

  /** Le texte du cahier de textes de la séance d'avant, dans ce classeur
   *  (celui qui est gardé, sinon celui de l'outil) : son « À faire » dit à
   *  Gemini quels exercices sont des corrections. '' : pas de séance d'avant */
  private texteDeLaSeancePrecedente(id: string): string {
    const t = this.app.tableau, l = t.seancesDuClasseur()
    const k = l.findIndex(s => s.id === id)
    for (let j = k - 1; j >= 0; j--) {
      if (!l[j].pages.length) continue
      const garde = t.texteCahierDe(l[j].id)
      if (garde) return garde.texte
      const f = ficheDeLaSeance(t, l[j].id, this.app.classeur.nom)
      return f ? texteCahierDeLOutil(f) : ''
    }
    return ''
  }

  /** Le texte du cahier de textes de la séance choisie : celui qui est gardé
   *  (corrigé par le professeur, ou rédigé depuis le dernier geste), sinon
   *  celui de l'outil ; puis, dans la version en ligne avec une clé, Gemini le
   *  rédige. refaire : la clé vient de changer, Gemini rédige à nouveau (sauf
   *  un texte du professeur). */
  private preparerTexte(refaire = false) {
    const d = this.d
    if (!d) return
    const bloc = d.querySelector('.p-cahier') as HTMLElement
    const champ = d.querySelector('.p-texte-cahier') as HTMLTextAreaElement
    const qui = d.querySelector('.p-cahier-qui') as HTMLElement
    const moi = ++this.redaction
    const c = this.ficheChoisie()
    bloc.hidden = !c
    if (!c) return
    const t = this.app.tableau, gestes = gestesDeLaSeance(t, c.id), garde = t.texteCahierDe(c.id)
    const aJour = !!garde && (garde.par === 'professeur' || garde.gestes === gestes)
    champ.value = aJour ? garde!.texte : texteCahierDeLOutil(c.fiche)
    this.texteTouche = false
    const gemini = this.enLigne && !!cleGemini() && !!this.imageDePage
    qui.classList.remove('erreur')
    ;(d.querySelector('.p-reessayer') as HTMLElement).hidden = true
    qui.textContent = aJour && garde!.par === 'professeur' ? 'Votre texte, gardé avec la séance.'
      : aJour && garde!.par === 'gemini' ? 'Rédigé par Gemini : relisez-le.'
      : gemini ? '' : this.enLigne ? 'Rédigé par l\'outil. Pour que Gemini lise aussi l\'écriture à la main :' : 'Rédigé par l\'outil (la version hors ligne ne fait pas appel à Gemini).'
    ;(d.querySelector('.p-redaction') as HTMLElement).hidden = !this.enLigne
    if (!gemini || garde?.par === 'professeur' || (aJour && garde!.par === 'gemini' && !refaire)) return
    void this.redigerAvecGemini(moi, c.id, c.fiche, gestes)
  }

  private async redigerAvecGemini(moi: number, id: string, fiche: FicheDeSeance, gestes: number) {
    const d = this.d!, qui = d.querySelector('.p-cahier-qui') as HTMLElement
    const champ = d.querySelector('.p-texte-cahier') as HTMLTextAreaElement
    const encore = () => this.d === d && this.redaction === moi
    qui.textContent = 'Gemini lit les pages et rédige le texte…'
    try {
      const images: string[] = []
      for (const p of fiche.pages.slice(0, PAGES_MAX)) {
        const png = await this.imageDePage!(p.id).catch(() => null)
        const b64 = png ? await imagePourGemini(png) : null
        if (b64) images.push(b64)
        if (!encore()) return
      }
      const brut = await demanderAGemini(cleGemini(), consigneGemini(fiche, null, consignesDuProfesseur(), this.texteDeLaSeancePrecedente(id)), images,
        { nouvelEssai: () => { if (encore()) qui.textContent = 'Gemini est très demandé : nouvel essai…' } })
      if (!encore()) return
      const texte = texteCahierDeGemini(fiche, brut, enTeteGemini())
      if (!texte) throw new ErreurGemini('Gemini n\'a rien rédigé pour cette séance : le texte de l\'outil reste.')
      // Le professeur a commencé à corriger le texte de l'outil : on ne l'écrase pas
      if (this.texteTouche) { qui.textContent = 'Gemini a rédigé un texte, mais vous avez déjà écrit le vôtre : il reste.'; return }
      champ.value = texte
      this.app.tableau.garderTexteCahier(id, { texte, par: 'gemini', quand: Date.now(), gestes })
      qui.textContent = `Rédigé par Gemini (${dernierModele()}) : relisez-le.`
    } catch (e) {
      if (!encore()) return
      qui.textContent = e instanceof ErreurGemini ? e.message : 'Gemini n\'a pas pu rédiger le texte : le texte de l\'outil reste.'
      qui.classList.add('erreur')
      ;(d.querySelector('.p-reessayer') as HTMLElement).hidden = false
    }
  }

  /** Garde le texte du cahier de textes avec la séance (dans le document) */
  private garderTexte(texte: string, par: 'professeur') {
    const c = this.ficheChoisie()
    if (!c) return
    this.app.tableau.garderTexteCahier(c.id, { texte: texte.trim(), par, quand: Date.now(), gestes: gestesDeLaSeance(this.app.tableau, c.id) })
    const qui = this.d?.querySelector('.p-cahier-qui') as HTMLElement | null
    if (qui) { qui.textContent = 'Votre texte, gardé avec la séance.'; qui.classList.remove('erreur') }
  }

  /** « Copier et ouvrir Pronote » : quand l'adresse du Pronote de ce Drive est connue */
  private majPronote() {
    const a = this.d?.querySelector('.p-ouvrir-pronote') as HTMLAnchorElement | null
    if (!a) return
    const adresse = pronoteDe(this.compte || this.retenu.compte || '')
    a.hidden = !adresse
    if (adresse) a.href = adresse
    ;(this.d!.querySelector('.p-pronote') as HTMLElement).classList.toggle('principal', !adresse)
    ;(this.d!.querySelector('.p-pronote') as HTMLElement).classList.toggle('secondaire', !!adresse)
  }

  /** Le titre proposé d'office : le nom de la séance, sinon sa date */
  private titreParDefaut(s: Seance) {
    const x = s as Partial<SeanceExplicite>
    return x.nom ?? `Séance du ${new Date(s.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
  }

  private majNouveauLien() {
    const d = this.d!, deja = this.registre.get(this.cleRegistre())
    ;(d.querySelector('.p-nouveau-lien') as HTMLElement).hidden = !deja
    if (!deja) (d.querySelector('.p-nouveau') as HTMLInputElement).checked = false
  }

  private pagesChoisies() {
    return [...this.d!.querySelectorAll<HTMLInputElement>('.p-pages input:checked')].map(i => i.value)
  }

  /** Le film élève de ce qui est choisi */
  private film(): FilmEleve {
    const s = this.seance
    // Ce que les instruments viennent de faire (le dernier quart de seconde) part aussi
    this.app.piste.vider()
    return exporter(this.app.tableau, { de: s.de, a: s.a, pages: this.pagesChoisies(), titre: (this.d!.querySelector('.p-titre') as HTMLInputElement).value })
  }

  /** Ce qu'il faut regarder avant de publier : images, noms, poids */
  private majVerifications() {
    const d = this.d!, ul = d.querySelector('.p-verifier')!
    const pages = this.pagesChoisies()
    const publier = d.querySelector('.p-publier') as HTMLButtonElement
    const dossier = this.mode === 'dossier'
    publier.disabled = !pages.length || (dossier
      ? !relaisDe(this.compte)?.relais || !(this.choisi || this.retenu.poignee || this.propose)
      : !this.enLigne || !CLIENT_GOOGLE || !compteDe(this.compte)?.relais)
    ;(d.querySelector('.p-fichier') as HTMLButtonElement).disabled = !pages.length
    if (!pages.length) { ul.innerHTML = '<li class="alerte">Cochez au moins une page.</li>'; return }
    const f = this.film()
    const images = Object.keys(f.images).length
    const deja = this.registre.get(this.cleRegistre())
    const items = [
      `<li>${f.etapes.length} geste${f.etapes.length > 1 ? 's' : ''} · ${mmss(new Bobine(f).duree)} de replay · ${f.ordre.length} page${f.ordre.length > 1 ? 's' : ''}</li>`,
      images ? `<li class="alerte">${images} image${images > 1 ? 's' : ''} importée${images > 1 ? 's' : ''} : vérifiez qu'aucune ne montre un nom, une copie ou un visage d'élève.</li>` : '',
      '<li class="alerte">Vérifiez qu\'aucun prénom n\'a été écrit pendant la séance : tout ce qui a été visible pendant la séance part, même effacé ensuite. Rejouez l\'aperçu pour le voir.</li>',
      dossier && !(this.choisi || this.retenu.poignee || this.propose) ? '<li class="alerte">Choisissez le dossier où ranger le replay (« Choisir… »).</li>' : '',
      !dossier && this.enLigne && !CLIENT_GOOGLE ? '<li class="alerte">La publication sur Google Drive n\'est pas encore réglée sur ce site (identifiant Google à créer, voir le mode d\'emploi). En attendant, enregistrez le fichier séance.</li>' : '',
      dossier && deja && !deja.code && !this.nouveauLien ? '<li>Cette séance a déjà un lien (publiée sur le Drive avec la connexion Google). Ranger le replay dans un dossier donne un NOUVEAU lien : recopiez-le dans Pronote.</li>' : '',
      deja && !this.nouveauLien && (!dossier || deja.code) ? `<li>Déjà publiée le ${new Date(deja.quand).toLocaleDateString('fr-FR')} : publier à nouveau met à jour cette séance, au même lien.</li>` : '',
    ]
    ul.innerHTML = items.join('')
  }

  /** Le compte Google : celui qui est connecté, ou celui que Google proposera */
  private majGoogle() {
    const d = this.d
    if (!d) return
    const ligne = d.querySelector('.p-google') as HTMLElement
    const compte = compteDe(this.compte)
    ligne.hidden = !this.enLigne || !CLIENT_GOOGLE || !compte?.relais
    if (ligne.hidden || !compte) return
    const courriel = courrielDe(compte.cle), dernier = dernierCompte(compte.cle)
    const qui = d.querySelector('.p-qui') as HTMLElement
    const autre = !!courriel && !!dernier && !memes(courriel, dernier)
    qui.textContent = courriel ? `Connecté : ${courriel}`
      : connecte(compte.cle) ? 'Connecté à Google.'
      : dernier ? `Google proposera ${dernier} (dernier compte utilisé pour « ${compte.nom} »).`
      : 'Au moment de publier, Google demandera quel compte utiliser.'
    qui.classList.toggle('alerte', autre)
    if (autre) qui.textContent += ` — d'habitude, « ${compte.nom} » est ${dernier}.`
    ;(d.querySelector('.p-changer') as HTMLButtonElement).textContent = connecte(compte.cle) ? 'Changer de compte Google' : 'Choisir le compte Google'
  }

  /** Se connecter (ou changer de compte) sans rien publier : Google montre ses comptes */
  private async choisirCompteGoogle() {
    const compte = compteDe(this.compte)
    if (!compte?.relais) return
    const b = this.d!.querySelector('.p-changer') as HTMLButtonElement
    const publier = this.d!.querySelector('.p-publier') as HTMLButtonElement
    b.disabled = true; publier.disabled = true
    this.etat(`Connexion à Google (${compte.nom})…`)
    try {
      await connecter(compte.cle, dernierCompte(compte.cle))
      this.etat('')
    } catch (e) {
      this.etat(e instanceof Error ? e.message : 'La connexion à Google a échoué. Réessayez.', true)
    } finally {
      b.disabled = false
      this.majGoogle()
      this.majVerifications()
      // Le focus perdu pendant la connexion revient dans la fenêtre (voir publier)
      const d = this.d
      if (d?.open && !d.contains(document.activeElement)) b.focus()
    }
  }

  private etat(t: string, erreur = false) {
    const p = this.d?.querySelector('.p-etat') as HTMLElement | null
    if (!p) return
    p.textContent = t; p.classList.toggle('erreur', erreur)
  }

  /** L'aperçu : le lecteur des élèves s'ouvre dans un onglet, le film y passe sans rien publier.
   *  On répond tant que l'onglet est ouvert : le recharger redemande le film. */
  private apercu() {
    const film = this.film()
    const w = window.open(this.lecteur + '#apercu', '_blank')
    if (!w) return this.etat('Le navigateur a bloqué l\'onglet de l\'aperçu : autorisez les fenêtres pour ce site.', true)
    const recevoir = (e: MessageEvent) => {
      if (w.closed) { window.removeEventListener('message', recevoir); return }
      if (e.source !== w || e.origin !== location.origin || e.data?.type !== 'mem-revoir-pret') return
      w.postMessage({ type: 'mem-revoir-apercu', film }, location.origin)
    }
    window.addEventListener('message', recevoir)
  }

  /** Le fichier séance, à déposer dans l'ENT ou sur une clé USB : il s'ouvre dans le lecteur.
   *  Lot 18 : quand le classeur a son dossier (le niveau rangé ou relié : le dossier du
   *  chapitre ; ou le dossier choisi ou retenu pour ce classeur), il s'écrit là, à côté du
   *  replay, sous « Titre.mem » (sans code ; le même titre remplace le même fichier) ; sinon,
   *  ou si le dossier n'a pas pu être écrit, le téléchargement d'avant. */
  private async enregistrer() {
    // D'abord, dans le clic : le dossier et l'accord d'y écrire
    let dossier: PoigneeDossier | null = null
    const ou = this.choisi?.name ?? this.retenu.poignee?.name ?? this.propose?.chemin ?? null
    if (this.lieu && ou) { try { dossier = await this.dossierCible() } catch { dossier = null } }
    const film = this.film()
    // Le début de la séance (pas celui des pages choisies) : la même séance enregistrée de nouveau reprend son fichier
    const seance = this.seance.debut
    const texte = await ecrireFilm(film, { seance })
    let repli = ''
    if (dossier && ou) {
      try {
        const r = await deposerLeFichierSeance(dossier, film.titre, texte, seance)
        // Un autre fichier du même titre était là (une autre séance) : il n'est pas remplacé, le nouveau porte « (2) »
        const autre = r.evite ? ` Un autre fichier « ${r.evite} » était là : il n'est pas remplacé.` : ''
        return this.etat(`Fichier séance enregistré dans « ${ou} » : ${r.nom} (${kilo(texte.length)}).${autre}`)
      } catch (e) {
        repli = `Le dossier « ${ou} » n'a pas pu être écrit (${e instanceof Error ? e.message.replace(/\.$/, '') : 'erreur inconnue'}) : le fichier est téléchargé (${kilo(texte.length)}).`
      }
    } else if (this.lieu && ou) {
      // Le dossier affiché n'a pas pu être ouvert (l'accord refusé, le dossier déplacé) : le dire, et télécharger
      repli = `Le dossier « ${ou} » n'a pas pu être ouvert (le navigateur n'a pas donné son accord, ou le dossier a bougé) : le fichier est téléchargé (${kilo(texte.length)}).`
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texte], { type: 'application/json' }))
    // Sans accents ni signes : le nom passe partout (ENT, clés USB, messageries)
    a.download = (film.titre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _.-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'seance') + EXTENSION
    // Dans la fenêtre elle-même : hors d'elle, la page est inerte tant qu'elle est ouverte
    ;(this.d ?? document.body).appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    this.etat(repli || `Fichier enregistré (${kilo(texte.length)}).`)
  }

  private publier() { return this.mode === 'dossier' ? this.publierDansUnDossier() : this.publierSurLeDrive() }

  /** Ranger le replay dans un dossier de l'ordinateur (ou de Google Drive pour
   *  ordinateur) : pas de connexion Google. Le lien porte le code du fichier ;
   *  le relais du Drive le retrouve quand Google Drive pour ordinateur l'a envoyé. */
  private async publierDansUnDossier() {
    const d = this.d!, b = d.querySelector('.p-publier') as HTMLButtonElement
    const relais = relaisDe(this.compte)
    if (!relais?.relais) return this.etat('Ce Drive n\'a pas encore de relais : choisissez-en un autre.', true)
    b.disabled = true
    try {
      // D'abord, tant que le clic est tout frais : le dossier et l'accord du navigateur d'y écrire
      this.etat('Ouverture du dossier…')
      const dossier = await this.dossierCible()
      if (!dossier) {
        // Le résumé ne montre pas « Choisir… » : la fenêtre se déplie pour le dire
        this.afficherResume(false)
        return this.etat('Le dossier n\'est plus accessible : choisissez-le à nouveau avec « Choisir… » (et acceptez l\'accès).', true)
      }
      // Un relais d'avant ne retrouve pas un fichier par son code : on le dit avant d'écrire
      const etat = await essayerRelais(relais.relais).catch(() => null)
      if (etat && (etat.version ?? 1) < VERSION_RELAIS) throw new Error(`Le relais de « ${relais.nom} » n'est pas à jour (version ${etat.version ?? 1}, il faut la ${VERSION_RELAIS}) : collez la nouvelle version de relais/relais-seances.gs dans son projet Apps Script, puis Déployer → Gérer les déploiements → Version : Nouvelle version. Réessayez ensuite.`)
      this.etat('Préparation de la séance…')
      const film = this.film()
      const texte = await ecrireFilm(film)
      const cle = this.cleRegistre()
      const deja = this.nouveauLien ? undefined : this.registre.get(cle)
      // Republier : le même code, donc le même lien ; sinon un code neuf
      const code = deja?.code ?? nouveauCode()
      const nom = nomDuReplay((d.querySelector('.p-nomfichier') as HTMLInputElement).value || film.titre, code)
      this.etat(`Écriture de « ${nom} » (${kilo(texte.length)})…`)
      await deposerLeReplay(dossier, nom, texte, code)
      this.registre.set(cle, { compte: this.compte, id: '', code, titre: film.titre, quand: Date.now() })
      if (this.lieu) {
        await retenirReglage(this.lieu.registre, this.lieu.idClasseur, { compte: this.compte, ...(this.choisi ? { poignee: this.choisi } : {}) })
        this.retenu = { ...this.retenu, compte: this.compte, ...(this.choisi ? { poignee: this.choisi } : {}) }
      }
      this.majLieu()
      ;(d.querySelector('.p-nouveau') as HTMLInputElement).checked = false
      if (!this.enLigne) {
        this.publie = null
        this.etat(`Replay rangé dans « ${nom} ». Pour le lien des élèves, publiez ce replay avec MEM teachingtool en ligne : le lien sera celui-là.`)
        return
      }
      const lien = lienEleveParCode(this.lecteur, this.compte, code)
      ;(d.querySelector('.p-lien') as HTMLInputElement).value = lien
      ;(d.querySelector('.p-ouvrir') as HTMLAnchorElement).href = lien
      ;(d.querySelector('.p-resultat') as HTMLElement).hidden = false
      this.publie = this.lienEtPages(film, lien); this.majPronote(); void this.copierTout()
      this.majNouveauLien()
      this.majVerifications()
      void this.attendreLeRelais(this.compte, code, film, nom)
    } catch (e) {
      // Le dossier retenu a été supprimé ou renommé : le navigateur ne le trouve plus
      if ((e as DOMException | null)?.name === 'NotFoundError') {
        this.afficherResume(false)
        this.etat('Le dossier retenu n\'existe plus : choisissez-en un autre avec « Choisir… ».', true)
      } else this.etat(e instanceof Error ? e.message : 'Le replay n\'a pas pu être rangé. Réessayez.', true)
    } finally {
      b.disabled = false
      this.majVerifications()
      const d2 = this.d
      if (d2?.open && !d2.contains(document.activeElement)) (b.disabled ? d2.querySelector<HTMLButtonElement>('button:not([disabled])') : b)?.focus()
    }
  }

  /** Le dossier où écrire : celui qu'on vient de choisir, sinon le retenu, sinon le dossier du chapitre */
  private async dossierCible(): Promise<PoigneeDossier | null> {
    const x = this.choisi ?? this.retenu.poignee ?? null
    if (x) return await choisirAccord(x) ? x : null
    return this.propose ? this.propose.ouvrir(true) : null
  }

  /** Après avoir écrit le fichier : on redemande le replay au relais, comme le fera l'élève,
   *  jusqu'à ce que Google Drive pour ordinateur l'ait envoyé (10 minutes au plus) */
  private async attendreLeRelais(compte: string, code: string, film: FilmEleve, nom: string) {
    const moi = ++this.attente, d = this.d
    const encore = () => this.d === d && this.attente === moi
    for (let i = 0; i < ESSAIS_RELAIS && encore(); i++) {
      this.etat(`En attente de Google Drive pour ordinateur… (« ${nom} » doit arriver sur le Drive ; le lien est déjà prêt, vous pouvez le copier)`)
      try {
        const relu = await lireFilm(await lireParSonCode(compte, code))
        if (!encore()) return
        if (relu.etapes.length !== film.etapes.length) { await new Promise(r => setTimeout(r, ATTENTE_RELAIS)); continue }
        return this.etat('✓ Le replay est en ligne : le lien marche. Copiez-le dans le cahier de textes.')
      } catch (e) {
        if (!encore()) return
        const m = e instanceof ErreurFilm ? e.message : ''
        // Le relais d'avant ne connaît pas « ?code= » : il répond que le lien est incomplet
        if (/incomplet/i.test(m)) return this.etat(`Le relais de « ${relaisDe(compte)?.nom ?? compte} » n'est pas à jour : collez la version ${VERSION_RELAIS} de relais/relais-seances.gs dans son projet Apps Script (Nouvelle version du déploiement).`, true)
        if (m && !/introuvable|pas encore/i.test(m)) return this.etat(m, true)
      }
      await new Promise(r => setTimeout(r, ATTENTE_RELAIS))
    }
    if (encore()) this.etat('Le replay n\'est pas encore arrivé sur le Drive. Vérifiez que Google Drive pour ordinateur est connecté et que le dossier est bien dans ce Drive, puis cliquez « Tester le lien ».', true)
  }

  private async publierSurLeDrive() {
    const d = this.d!, b = d.querySelector('.p-publier') as HTMLButtonElement
    const compte = compteDe(this.compte)
    if (!compte?.relais) return this.etat('Ce compte n\'a pas encore de relais : choisissez-en un autre.', true)
    const changer = d.querySelector('.p-changer') as HTMLButtonElement
    b.disabled = true; changer.disabled = true
    // Le relais ne trouve pas la séance : mauvais compte. On se déconnecte
    // APRÈS que publier() a jeté la copie envoyée au mauvais endroit
    let mauvaisCompte = false
    try {
      // Le jeton vaut pour un compte : changer de compte, c'est se reconnecter
      const dernier = dernierCompte(compte.cle)
      if (!connecte(compte.cle)) { this.etat(`Connexion à Google (${compte.nom})…`); await connecter(compte.cle, dernier) }
      this.majGoogle()
      // Un autre compte que celui que ce relais a toujours servi : la séance
      // irait dans un Drive que le relais ne lit pas. On le dit avant d'envoyer.
      const courriel = courrielDe(compte.cle)
      if (courriel && dernier && !memes(courriel, dernier) && this.autreCompteAccepte !== `${compte.cle}:${courriel}`) {
        this.autreCompteAccepte = `${compte.cle}:${courriel}`
        return this.etat(`Vous êtes connecté avec ${courriel}, mais « ${compte.nom} » a toujours été publié avec ${dernier}. Cliquez « Changer de compte Google », ou à nouveau « Publier » pour publier quand même avec ${courriel}.`, true)
      }
      this.etat('Préparation de la séance…')
      const film = this.film()
      const texte = await ecrireFilm(film)
      const cle = this.cleRegistre()
      const deja = this.nouveauLien ? undefined : this.registre.get(cle)
      // Une nouvelle séance demandée : sa propre clé, pour ne pas reprendre
      // l'ancien fichier ; une copie : la sienne, pour ne pas reprendre celui de l'original
      const copie = marqueDeCopie(this.app.tableau.doc)
      const cleDrive = this.nouveauLien ? `${cle}:${Date.now()}` : (deja?.cle ?? (copie ? `${cle}:copie-${copie}` : cle))
      this.etat(`Envoi sur ${compte.nom} (${kilo(texte.length)})…`)
      const r = await publier(compte.dossier, film.titre, texte, cleDrive, deja?.id ?? null, async id => {
        this.etat('Vérification : on ouvre la séance comme un élève…')
        let relu: FilmEleve
        try { relu = await lireFilm(await lireParLeRelais(compte.cle, id)) }
        catch (e) {
          const m = e instanceof ErreurFilm ? e.message : String(e)
          // Le relais ne la trouve pas : c'est presque toujours qu'on a publié dans l'autre compte
          if (/introuvable/i.test(m)) {
            // Un relais d'une version d'avant ne connaît ni ces dossiers ni « .mem »
            const etat = await essayerRelais(compte.relais).catch(() => null)
            if (etat && (etat.version ?? 1) < VERSION_RELAIS_GOOGLE) throw new Error(`Le relais de « ${compte.nom} » n'est pas à jour (version ${etat.version ?? 1}, il faut la ${VERSION_RELAIS_GOOGLE}) : collez la nouvelle version de relais/relais-seances.gs dans son projet Apps Script, puis Déployer → Gérer les déploiements → Version : Nouvelle version. Réessayez ensuite.`)
            mauvaisCompte = true
            const qui = courrielDe(compte.cle)
            throw new Error(`Le relais de « ${compte.nom} » ne trouve pas la séance qu'on vient d'envoyer : ${qui ? `le compte ${qui} n'est sans doute pas le sien` : 'vous êtes sans doute connecté à un autre compte Google'}. Réessayez en choisissant le bon compte.`)
          }
          throw new Error(`Le relais de « ${compte.nom} » : ${m}`)
        }
        if (relu.etapes.length !== film.etapes.length) throw new Error(`Le relais de « ${compte.nom} » sert une autre version de la séance : réessayez dans un instant.`)
      })
      this.registre.set(cle, { compte: compte.cle, id: r.id, titre: film.titre, quand: Date.now(), cle: cleDrive })
      // Le relais a servi la séance : ce compte Google est bien le sien
      retenirCompte(compte.cle, courrielDe(compte.cle))
      this.majGoogle()
      const lien = lienEleve(this.lecteur, compte.cle, r.id)
      ;(d.querySelector('.p-lien') as HTMLInputElement).value = lien
      ;(d.querySelector('.p-ouvrir') as HTMLAnchorElement).href = lien
      ;(d.querySelector('.p-resultat') as HTMLElement).hidden = false
      ;(d.querySelector('.p-nouveau') as HTMLInputElement).checked = false
      this.publie = this.lienEtPages(film, lien); this.majPronote(); void this.copierTout()
      const ancienPerdu = !!deja && !r.miseAJour
      const fait = r.restauree ? 'Séance remise en ligne (elle était à la corbeille du Drive) : le lien déjà donné aux élèves remarche.'
        : r.miseAJour ? 'Séance mise à jour : le lien déjà donné aux élèves montre la nouvelle version.'
        : ancienPerdu ? 'L\'ancienne publication n\'est plus sur le Drive : la séance a un NOUVEAU lien, recopiez-le dans Pronote.'
        : 'Séance publiée. Copiez le lien dans le cahier de textes.'
      if (lien.startsWith('https://')) this.etat(fait, ancienPerdu)
      else this.etat(fait + ' Attention : publiée depuis cet ordinateur, le lien ne s\'ouvrira que chez vous. Publiez depuis MEM teachingtool en ligne pour les élèves.', true)
      this.majNouveauLien()
      this.majVerifications()
    } catch (e) {
      if (mauvaisCompte) deconnecter()
      this.etat(e instanceof Error ? e.message : 'La publication a échoué. Réessayez.', true)
    } finally {
      b.disabled = false; changer.disabled = false
      this.majGoogle()
      // Le bouton, désactivé pendant l'envoi, a perdu le focus (il est tombé
      // sur la page) : il revient dans la fenêtre, pour le clavier (Échap,
      // Tab) ; voir aussi App.clavier
      if (d.open && !d.contains(document.activeElement)) (b.disabled ? d.querySelector<HTMLButtonElement>('button:not([disabled])') : b)?.focus()
    }
  }

  private lienEtPages(film: FilmEleve, lien: string) {
    const b = new Bobine(film)
    const pages = b.chapitres.length > 1
      ? '\nPages : ' + b.chapitres.map(c => `${c.titre} (${mmss(b.temps[c.i])})`).join(' · ')
      : ''
    return { lien, pages, titre: film.titre }
  }

  /** Ce que « Copier pour Pronote » copie : le texte du cahier de textes (une
   *  séance explicite), puis le lien et les pages ; sans lui, comme avant */
  private get textePronote(): string {
    const p = this.publie
    if (!p) return ''
    const bloc = this.d?.querySelector('.p-cahier') as HTMLElement | null
    const texte = bloc && !bloc.hidden ? (this.d!.querySelector('.p-texte-cahier') as HTMLTextAreaElement).value : ''
    return texte.trim() ? texteAvecLeLien(texte, p.lien, p.pages) : `Revoir la séance : ${p.titre}\n${p.lien}${p.pages}`
  }

  /** Juste après la publication : le texte pour Pronote part tout seul dans
   *  le presse-papiers (quand le navigateur le permet hors d'un clic) */
  private async copierTout() {
    const texte = this.textePronote, d = this.d
    if (!texte || !d) return
    try {
      await copierMisEnForme(texte)
      ;(d.querySelector('.p-copie-faite') as HTMLElement).hidden = false
    } catch { /* « Copier pour Pronote » reste là */ }
  }

  /** misEnForme : le texte pour Pronote (gras, souligné, puces) */
  private async copier(texte: string, ok: string, misEnForme = false) {
    try { await (misEnForme ? copierMisEnForme(texte) : navigator.clipboard.writeText(texte)); this.etat(ok) }
    catch {
      const champ = this.d?.querySelector('.p-lien') as HTMLInputElement
      champ.value = texte; champ.select()
      this.etat('Copie refusée par le navigateur : le texte est sélectionné, faites Ctrl+C.', true)
    }
  }
}
