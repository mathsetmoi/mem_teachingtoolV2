// =============================================================
// « AUTRES SAUVEGARDES » (lot 18, le menu ⋯ réduit)
// Depuis le lot 18, le menu ⋯ ne parle que du fichier du classeur (un
// classeur = un fichier .memc à un seul endroit, écrit tout seul). Tout le
// reste de ce qui sauvegarde est réuni dans cette fenêtre, en quatre blocs :
// - la copie sur le Drive par connexion Google (lot 4 C10) : à sens unique,
//   dans un dossier privé du Drive ; elle marche aussi là où le dossier ne
//   s'écrit pas tout seul (iPad, Firefox) ; sa ligne d'état, toujours (même
//   quand le bloc d'état du menu ⋯ la cache parce que le fichier protège le
//   classeur), et « Choisir le compte ou arrêter… » (la fenêtre de
//   copie-drive.ts) ;
// - toute la bibliothèque dans un fichier .memb (lot 4 C9, fichiers.ts) ;
// - retrouver une copie : « Récupérer une sauvegarde du Drive… » (recuperer.ts) ;
// - un niveau sur le Drive par connexion (lot 7) : les emplacements 'drive',
//   « Mettre à jour » et « Retirer » (ailleurs.ts), « Relier un niveau… » (la
//   fenêtre « Enregistrer » du lot 7, qui propose le Drive).
// Dans la version hors ligne, ce qui passe par Google est grisé et le dit.
// Chaque bouton ferme cette fenêtre avant d'agir : les fenêtres qu'il ouvre
// refusent de paraître par-dessus une autre, et le choix d'un fichier se fait
// dans le clic.
// =============================================================
import type { ActionMessage } from '../app'
import type { Ailleurs } from './ailleurs'
import { HORS_LIGNE_DRIVE } from './ailleurs'
import type { CopieDrive } from './copie-drive'
import { HORS_LIGNE_FICHIER } from './copie-drive'
import type { FicheDossier } from './demarrage'
import type { Fichiers } from './fichiers'
import type { Registre } from './registre'
import type { Surveillance } from './surveillance'
import { ligneDrive } from './etat'
import type { Emplacement } from './emplacements'
import { emplacements } from './emplacements'
import { AIDE_RECUPERER, ouvrirRecuperer } from './recuperer'
import { dossierVisible } from './arbre'
import { compteDe } from '../publication/comptes'
import { fermerSurLeFond } from '../dialogue'

/** L'aide de l'entrée du menu ⋯ */
export const AIDE_AUTRES = 'La copie sur le Drive par connexion Google, toute la bibliothèque dans un fichier, récupérer une sauvegarde.'
/** Ce que dit le bloc des niveaux dans la version hors ligne */
export const SEULEMENT_EN_LIGNE = 'Seulement depuis la version en ligne.'

/** Ce que la fenêtre demande à qui l'ouvre (main.ts) */
export interface HoteAutres {
  registre: Registre
  fichiers: Fichiers
  ailleurs: Ailleurs
  /** La copie sur le Drive de ce classeur ; null : le repli, sans bibliothèque */
  drive: CopieDrive | null
  /** L'état de la sauvegarde du classeur ouvert : sa ligne du Drive */
  surveillance: Surveillance
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
}

export class AutresSauvegardes {
  constructor(private h: HoteAutres) {}

  /** La version en ligne, avec la connexion Google : le Drive y est possible */
  get enLigne(): boolean { return this.h.ailleurs.enLigne }

  /** La fenêtre */
  async ouvrir(): Promise<void> {
    if (document.querySelector('dialog[open]')) { this.h.message('Fermez d\'abord la fenêtre ouverte.'); return }
    const { registre, ailleurs, drive, fichiers, surveillance } = this.h
    const enLigne = this.enLigne
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-autres'
    d.setAttribute('aria-labelledby', 'titre-autres')
    d.innerHTML = `<h2 id="titre-autres">Autres sauvegardes</h2><div class="corps">
      <section class="as-bloc" data-bloc="drive"><h3>Copie sur le Drive (connexion Google)</h3>
        <p>Une copie à sens unique, dans un dossier privé de votre Drive, peu après les changements. Elle marche aussi là où le dossier ne s'écrit pas tout seul (iPad, Firefox). Si vos dossiers d'établissement sont déjà dans Google Drive pour ordinateur, elle fait double emploi.</p>
        <p class="as-etat as-etat-drive" role="status"></p>
        <p class="as-hors" hidden></p>
        <p class="as-boutons"><button type="button" class="secondaire as-compte">Choisir le compte ou arrêter…</button></p></section>
      <section class="as-bloc" data-bloc="bibliotheque"><h3>Toute la bibliothèque dans un fichier</h3>
        <p>Un seul fichier .memb avec tous les classeurs (sans la corbeille) et les dossiers : pour changer d'ordinateur, ou garder une copie de tout.</p>
        <p class="as-boutons"><button type="button" class="secondaire as-memb">Enregistrer…</button></p></section>
      <section class="as-bloc" data-bloc="recuperer"><h3>Retrouver une copie</h3>
        <p class="as-aide-recuperer"></p>
        <p class="as-boutons"><button type="button" class="secondaire as-recuperer">Récupérer une sauvegarde du Drive…</button></p></section>
      <section class="as-bloc" data-bloc="niveaux"><h3>Un niveau sur le Drive par connexion</h3>
        <p>Les classeurs d'un niveau, copiés dans votre Drive (« MEM - Classeurs ») et tenus à jour par la connexion Google.</p>
        <p class="as-hors" hidden></p>
        <ul class="as-niveaux" aria-label="Les niveaux reliés au Drive"></ul>
        <p class="as-boutons"><button type="button" class="secondaire as-relier">Relier un niveau…</button></p></section>
      <div class="actions"><button type="button" class="principal as-fermer">Fermer</button></div></div>`
    const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
    q('.as-aide-recuperer').textContent = AIDE_RECUPERER
    const fermer = () => { if (d.open) d.close() }
    d.addEventListener('close', () => d.remove())
    fermerSurLeFond(d, fermer)
    q('.as-fermer').addEventListener('click', fermer)

    // ----- 1. La copie sur le Drive : sa ligne d'état, le compte -----
    const etatDrive = q('.as-etat-drive')
    const majDrive = () => { etatDrive.textContent = ligneDrive(surveillance.etat, Date.now())?.texte ?? '' }
    majDrive()
    surveillance.quandChange(() => { if (d.isConnected && d.open) majDrive() })
    const compte = q<HTMLButtonElement>('.as-compte')
    if (!enLigne) {
      const h = q('[data-bloc="drive"] .as-hors')
      h.hidden = false; h.textContent = HORS_LIGNE_DRIVE
      compte.disabled = true; compte.title = HORS_LIGNE_FICHIER
    } else if (!drive) compte.hidden = true
    compte.addEventListener('click', () => { if (!drive) return; fermer(); void drive.ouvrirLeChoix() })

    // ----- 2. Toute la bibliothèque dans un fichier (.memb) -----
    q('.as-memb').addEventListener('click', () => { fermer(); void fichiers.enregistrerLaBibliotheque() })

    // ----- 3. Récupérer une sauvegarde du Drive -----
    const recuperer = q<HTMLButtonElement>('.as-recuperer')
    if (!enLigne) { recuperer.disabled = true; recuperer.title = HORS_LIGNE_FICHIER }
    recuperer.addEventListener('click', () => { fermer(); void ouvrirRecuperer(fichiers, registre) })

    // ----- 4. Les niveaux sur le Drive par connexion (lot 7) -----
    const relier = q<HTMLButtonElement>('.as-relier')
    if (!enLigne) {
      const h = q('[data-bloc="niveaux"] .as-hors')
      h.hidden = false; h.textContent = SEULEMENT_EN_LIGNE
      relier.disabled = true; relier.title = HORS_LIGNE_FICHIER
    }
    relier.addEventListener('click', () => { fermer(); void ailleurs.enregistrer({ quoi: 'classe' }) })
    const ul = q('.as-niveaux')
    /** La liste : un niveau par ligne, « 5ème → Drive personnel › MEM - Classeurs › 5ème », Mettre à jour, Retirer */
    const dessiner = async () => {
      const [liste, dossiers] = await Promise.all([emplacements(registre), registre.dossiers().catch(() => [] as FicheDossier[])])
      if (!d.isConnected) return
      const lignes = liste.filter(e => e.genre === 'drive')
        .map(e => ({ e, dossier: dossiers.find(x => x.id === e.dossier) }))
        .filter((x): x is { e: Emplacement; dossier: FicheDossier } => !!x.dossier && dossierVisible(x.dossier, dossiers))
        .sort((a, b) => a.dossier.nom.localeCompare(b.dossier.nom, 'fr', { numeric: true }))
      ul.replaceChildren()
      if (!lignes.length) {
        ul.appendChild(Object.assign(document.createElement('li'), { className: 'as-aucun', textContent: 'Aucun niveau n\'est relié au Drive par connexion.' }))
        return
      }
      for (const { e, dossier } of lignes) {
        const li = document.createElement('li')
        li.dataset.id = e.id
        const c = compteDe(e.compte ?? '')
        const texte = Object.assign(document.createElement('span'), { className: 'texte' })
        texte.append(Object.assign(document.createElement('strong'), { textContent: `« ${dossier.nom} »` }), ' → ',
          Object.assign(document.createElement('span'), { className: 'ou', textContent: `${c?.nom ?? 'Drive'} › ${c?.classeurs ?? 'MEM - Classeurs'} › ${e.nom}` }))
        const maj = Object.assign(document.createElement('button'), { type: 'button', className: 'secondaire as-maj', textContent: 'Mettre à jour' })
        if (!enLigne) { maj.disabled = true; maj.title = HORS_LIGNE_FICHIER }
        // La connexion Google se fait dans ce clic ; la fenêtre se ferme, le message dit le bilan
        maj.addEventListener('click', () => { fermer(); void ailleurs.mettreAJour(e, dossier) })
        const retirer = Object.assign(document.createElement('button'), { type: 'button', className: 'secondaire as-retirer', textContent: 'Retirer' })
        retirer.title = 'Ne plus tenir ce niveau à jour sur le Drive (rien n\'y est effacé)'
        retirer.addEventListener('click', async () => { await ailleurs.retirer(e, dossier); await dessiner() })
        li.append(texte, maj, retirer)
        ul.appendChild(li)
      }
    }
    // La fenêtre est dans la page avant la liste (dessiner s'arrête si elle n'y est plus)
    document.body.appendChild(d)
    await dessiner()
    d.showModal()
    q<HTMLButtonElement>('.as-fermer').focus()
  }
}
