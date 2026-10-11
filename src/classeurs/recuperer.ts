// =============================================================
// RÉCUPÉRER UNE SAUVEGARDE DU DRIVE (lot 4 C10)
// La copie sur le Drive va dans un seul sens (copie-drive.ts) : rien n'en
// revient sans le demander. Ce chemin, au menu ⋯ du bandeau de la
// bibliothèque, est cette demande : le choix du compte (le Drive personnel,
// celui du lycée), [Se connecter et voir les sauvegardes] (la connexion
// Google dans ce clic, jamais sans lui), la liste des sauvegardes de ce
// Drive (le dossier « MEM - Sauvegardes »…), la plus récente d'abord, avec
// leur date, leur taille et ce qui est déjà dans la bibliothèque. Celle
// qu'on choisit se télécharge, puis s'ouvre par le chemin d'« Ouvrir un
// classeur » (fichiers.ts, lot 4 C9) : un NOUVEAU classeur, ou, si elle est
// déjà là, comparée (« Ouvrir celui de la bibliothèque », « Mettre à jour
// le classeur » sans rien perdre, « Ajouter comme copie »…).
// =============================================================
import type { CompteDrive } from './demarrage'
import { visible } from './demarrage'
import type { Bibliotheque } from './bibliotheque'
import type { Fichiers } from './fichiers'
import type { Registre } from './registre'
import { entreeMenu } from '../menus'
import { CLIENT_GOOGLE, COMPTES, compteDe } from '../publication/comptes'
import type { SauvegardeListee } from '../publication/drive'
import { connecte, connecter, courrielDe, dernierCompteGoogle, listerSauvegardes, lireSauvegarde, preparerGoogle, versionEnLigne } from '../publication/drive'
import { quandLisible, tailleLisible } from '../fichier'
import { HORS_LIGNE_FICHIER } from './copie-drive'
import { choixValable, raisonDrive } from './drive-pur'
import { fermerSurLeFond } from '../dialogue'

export const AIDE_RECUPERER = 'Les copies de vos classeurs sur le Drive : en ouvrir une, comme un classeur enregistré dans un fichier.'

/** « Récupérer une sauvegarde du Drive… » au menu ⋯ du bandeau de la
 *  bibliothèque (grisé dans la version clé USB, qui le dit) */
export function brancherRecuperer(b: Bibliotheque, fichiers: Fichiers, registre: Registre) {
  const enLigne = versionEnLigne() && !!CLIENT_GOOGLE
  b.menuDuBandeau.push(m => {
    entreeMenu(m, 'Récupérer une sauvegarde du Drive…', () => void ouvrirRecuperer(fichiers, registre), {
      action: 'recuperer-sauvegarde', inactif: !enLigne, aide: enLigne ? AIDE_RECUPERER : HORS_LIGNE_FICHIER,
    })
  })
}

const texteErreur = (e: unknown) => {
  const r = raisonDrive(e, typeof navigator === 'undefined' || navigator.onLine !== false)
  if (r.genre === 'connexion') return 'La connexion Google a expiré : cliquez de nouveau sur « Se connecter et voir les sauvegardes ».'
  if (r.genre === 'hors-ligne') return 'Pas de réseau : les sauvegardes du Drive ne peuvent pas être lues.'
  const m = e instanceof Error && !(e as { statut?: number }).statut ? e.message : ''
  return m || `Les sauvegardes n'ont pas pu être lues : ${r.message ?? 'erreur inconnue'}.`
}

/** La fenêtre : le compte, la connexion dans le clic, la liste, le choix */
export async function ouvrirRecuperer(fichiers: Fichiers, registre: Registre): Promise<void> {
  if (document.querySelector('dialog[open]')) return
  preparerGoogle()
  // Le compte proposé : celui qui est connecté, sinon celui des copies
  const defaut = await registre.reglage('copieDrive').catch(() => undefined)
  const connu = COMPTES.find(c => connecte(c.cle))?.cle ?? (choixValable(defaut) && defaut !== 'aucune' ? defaut : 'mem')
  const d = document.createElement('dialog')
  d.className = 'dialogue dialogue-recuperer'
  d.setAttribute('aria-labelledby', 'titre-recuperer')
  d.innerHTML = `<h2 id="titre-recuperer">Récupérer une sauvegarde du Drive</h2><div class="corps">
    <p>Les copies de vos classeurs sur le Drive. Celle que vous choisissez s'ouvre comme un classeur enregistré dans un fichier : ajoutée à la bibliothèque, ou comparée à celui qui y est déjà, sans rien perdre.</p>
    <fieldset class="r-comptes"><legend>Le Drive</legend><div class="cases"></div></fieldset>
    <p class="r-google"><span class="r-qui"></span> <button type="button" class="principal r-voir">Se connecter et voir les sauvegardes</button></p>
    <p class="r-etat" role="status" aria-live="polite"></p>
    <ul class="r-liste" aria-label="Les sauvegardes" hidden></ul>
    <div class="actions"><button type="button" class="secondaire r-fermer">Fermer</button></div></div>`
  const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
  const cases = q('.cases')
  for (const c of COMPTES) {
    const l = Object.assign(document.createElement('label'), { className: 'case' })
    l.append(Object.assign(document.createElement('input'), { type: 'radio', name: 'r-compte', value: c.cle, checked: c.cle === connu }),
      Object.assign(document.createElement('span'), { textContent: c.nom }))
    cases.appendChild(l)
  }
  const compte = () => (q<HTMLInputElement>('input[name=r-compte]:checked')?.value ?? 'mem') as CompteDrive
  const etat = (t: string, erreur = false) => { const p = q('.r-etat'); p.textContent = t; p.classList.toggle('erreur', erreur) }
  const liste = q<HTMLUListElement>('.r-liste')
  let occupe = false
  const regler = () => {
    const c = compte(), qui = courrielDe(c)
    q('.r-qui').textContent = connecte(c) ? `Connecté : ${qui || 'compte Google'}.` : dernierCompteGoogle(c) ? `Google proposera ${dernierCompteGoogle(c)}.` : ''
    q('.r-voir').textContent = connecte(c) ? 'Voir les sauvegardes' : 'Se connecter et voir les sauvegardes'
  }

  /** Les sauvegardes du compte choisi, en boutons : la plus récente d'abord */
  const montrer = async (c: CompteDrive) => {
    etat(`Recherche des sauvegardes sur le ${compteDe(c)?.nom ?? 'Drive'}…`)
    liste.hidden = true
    let l: SauvegardeListee[]
    try { l = await listerSauvegardes(c) } catch (e) { etat(texteErreur(e), true); regler(); return }
    if (compte() !== c) return
    const [fiches, dossiers] = await Promise.all([registre.classeurs().catch(() => []), registre.dossiers().catch(() => [])])
    liste.replaceChildren()
    if (!l.length) { etat(`Aucune sauvegarde sur ce Drive${courrielDe(c) ? ` (${courrielDe(c)})` : ''}.`); return }
    etat(`${l.length} sauvegarde${l.length > 1 ? 's' : ''} sur ce Drive${courrielDe(c) ? ` (${courrielDe(c)})` : ''}.`)
    for (const s of l) {
      const f = fiches.find(x => x.id === s.classeur)
      const ou = !f || f.effacement != null ? '' : visible(f, dossiers) ? 'déjà dans la bibliothèque' : 'dans la corbeille de la bibliothèque'
      const li = document.createElement('li')
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'sauvegarde-drive' })
      b.dataset.id = s.id
      const nom = Object.assign(document.createElement('span'), { className: 'r-nom', textContent: s.nom.replace(/\.memc$/i, '') })
      const quand = Object.assign(document.createElement('span'), { className: 'r-quand', textContent: `modifiée ${s.modifie ? quandLisible(s.modifie) : 'à une date inconnue'} · ${tailleLisible(s.taille)}` })
      b.append(nom, quand)
      if (ou) b.append(Object.assign(document.createElement('span'), { className: 'r-deja', textContent: ou }))
      b.addEventListener('click', () => void choisir(s, b))
      li.appendChild(b)
      liste.appendChild(li)
    }
    liste.hidden = false
    liste.querySelector<HTMLButtonElement>('button')?.focus()
  }

  /** Le choix : téléchargée, puis ouverte comme un fichier (fichiers.ts) */
  const choisir = async (s: SauvegardeListee, b: HTMLButtonElement) => {
    if (occupe) return
    occupe = true
    for (const x of d.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input')) x.disabled = true
    b.querySelector('.r-quand')!.textContent = 'Téléchargement…'
    etat(`Téléchargement de « ${s.nom} » (${tailleLisible(s.taille)})…`)
    let octets: Uint8Array
    try { octets = await lireSauvegarde(s.id) } catch (e) {
      etat(texteErreur(e), true)
      for (const x of d.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input')) x.disabled = false
      occupe = false
      void montrer(compte())
      return
    }
    // La fenêtre se ferme d'abord : Ouvrir pose sa propre question
    d.close()
    const nom = /\.memc$/i.test(s.nom) ? s.nom : s.nom + '.memc'
    await fichiers.ouvrir([{ fichier: new File([octets as BlobPart], nom, { type: 'application/octet-stream' }) }])
  }

  q('.r-voir').addEventListener('click', async () => {
    if (occupe) return
    const c = compte()
    if (!connecte(c)) {
      etat('Connexion à Google…')
      const indice = dernierCompteGoogle(c)
      // Dans ce clic : la fenêtre de Google (jamais sans lui)
      try { await connecter(c, indice, indice ? '' : 'select_account') } catch (e) {
        etat(e instanceof Error ? e.message.replace(/^Pour publier, autorisez/, 'Pour lire vos sauvegardes, autorisez') : 'La connexion à Google a échoué. Réessayez.', true)
        regler()
        return
      }
    }
    regler()
    await montrer(c)
  })
  d.addEventListener('change', e => {
    if (!(e.target as HTMLElement).closest('.r-comptes')) return
    regler()
    liste.hidden = true; liste.replaceChildren(); etat('')
    if (connecte(compte())) void montrer(compte())
  })
  q('.r-fermer').addEventListener('click', () => d.close())
  d.addEventListener('close', () => d.remove())
  fermerSurLeFond(d, () => d.close())
  regler()
  document.body.appendChild(d)
  d.showModal()
  q<HTMLButtonElement>('.r-voir').focus()
  // Déjà connecté à ce Drive : la liste vient tout de suite
  if (connecte(compte())) void montrer(compte())
}
