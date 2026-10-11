import 'katex/dist/katex.min.css'
import './style.css'
import { Tableau } from './document'
import { App } from './app'
import { UI } from './ui'
import { installerGardes } from './navigateur'
import type { FicheClasseur, InfosClasseur } from './classeurs/demarrage'
import { BASE_PREMIER, CLASSEUR_SEUL, CLE_DERNIER_CLASSEUR, MESSAGE_VIDE, NOM_PREMIER, choisirAuDemarrage, ecrireDernier, estPremier, lireDernier, urlBibliotheque, urlDuClasseur } from './classeurs/demarrage'
import { Registre } from './classeurs/registre'
import { SuiviDuClasseur } from './classeurs/suivi'
import { Surveillance } from './classeurs/surveillance'
import { TEXTE_INCOMPLET } from './classeurs/etat'
import type { CleALArrivee } from './classeurs/cle'
import { EnregistrementCle, lireCleALArrivee } from './classeurs/cle'
import { CopieDrive } from './classeurs/copie-drive'
import { brancherRecuperer } from './classeurs/recuperer'
import { ApercuDuClasseur } from './classeurs/apercu-classeur'
import { ErreurBase, ouvrirBaseExistante } from './classeurs/bases'
import { passerLaConnexion } from './publication/drive'
import type { HoteBibliotheque } from './classeurs/bibliotheque'
import { Bibliotheque, CLE_ARRIVEE } from './classeurs/bibliotheque'
import { ecrivain } from './classeurs/ecrivain'
import { Fichiers } from './classeurs/fichiers'
import type { ActionMessage } from './app'

/** Le classeur qui s'ouvre : sa fiche dans l'index (null : l'index ne
 *  s'ouvre pas, c'est le repli), ce que l'application en sait, et ce qu'il
 *  faut dire en arrivant ; ou la bibliothèque seule (sans classeur) */
type Ouverture =
  | { genre: 'classeur'; registre: Registre | null; fiche: FicheClasseur | null; infos: InfosClasseur; message?: string }
  | { genre: 'bibliotheque'; registre: Registre; message?: string }

/** La première fois que la nouvelle version ouvre le tableau d'avant, on
 *  dit qu'il est devenu le premier classeur, et où est la bibliothèque */
const CLE_ANNONCE = 'mem-teachingtool-annonce'

const infosDe = (f: FicheClasseur): InfosClasseur => ({ id: f.id, base: f.base, nom: f.nom, premier: estPremier(f) })

function lireCle(cle: string): string | null {
  try { return localStorage.getItem(cle) } catch { return null }
}

/** La base existe-t-elle encore ? Jamais créée pour le savoir. Le premier
 *  n'est pas vérifié : sa base est celle du tableau d'avant, que y-indexeddb
 *  crée sur un navigateur neuf, comme avant. On ne sait pas (IndexedDB
 *  capricieux) : on essaie quand même. */
async function baseLa(base: string): Promise<boolean> {
  try { (await ouvrirBaseExistante(base)).close(); return true } catch (e) {
    return !(e instanceof ErreurBase && (e.raison === 'absente' || e.raison === 'abimee'))
  }
}

/** Quel classeur ouvrir. D'abord l'index de la bibliothèque et la reprise
 *  du tableau d'avant (le premier classeur) ; puis le choix
 *  (choisirAuDemarrage : l'adresse, le dernier ouvert…). Si l'index ne
 *  s'ouvre pas, le repli : le dernier classeur ouvert, retenu dans
 *  localStorage, s'il a encore sa base, sinon le premier ; rien n'est écrit
 *  dans l'index, l'adresse ne change pas. */
async function trouverLeClasseur(): Promise<Ouverture> {
  const dernier = lireDernier(lireCle(CLE_DERNIER_CLASSEUR))
  let registre: Registre | null = null
  try {
    registre = await Registre.ouvrir()
    // La reprise (et, sans attendre, son ménage : les créations et les
    // effacements interrompus ; le vecteur d'une base par l'écrivain, pour le
    // garde-fou du premier, voir Registre.reprendreLesEffacements)
    await registre.reprendre({ vecteurDe: base => ecrivain.vecteurDeLaBase(base, { travailleurSeul: true }).then(r => r.vecteur) })
    const lus = await Promise.all([registre.classeurs(), registre.dossiers()])
    let fiches = lus[0]
    const dossiers = lus[1]
    let message: string | undefined
    let recherche = location.search
    for (;;) {
      const choix = choisirAuDemarrage({ recherche, dernier, fiches, dossiers })
      message ??= choix.message
      // ?bibliotheque, un classeur inconnu ici ou dans la corbeille, une
      // bibliothèque vide : la bibliothèque seule, qui dit pourquoi
      if (choix.genre === 'bibliotheque') return { genre: 'bibliotheque', registre, message: message ?? choix.message }
      const f = choix.fiche
      // Une fiche dont la base a disparu : y-indexeddb la recréerait vide.
      // On ne la crée pas ; on le dit, et on en choisit une autre.
      if (estPremier(f) || await baseLa(f.base)) return { genre: 'classeur', registre, fiche: f, infos: infosDe(f), message }
      message = `Le classeur « ${f.nom} » n'a plus sa base dans ce navigateur : pour le retrouver, ouvrez son fichier (.memc).`
      fiches = fiches.filter(x => x.id !== f.id)
      recherche = ''
    }
  } catch {
    try { registre?.fermer() } catch { /* jamais ouvert */ }
  }
  // Le repli : l'index ne s'ouvre pas (stockage refusé, base abîmée…)
  let infos: InfosClasseur = CLASSEUR_SEUL
  if (dernier?.base && dernier.base !== BASE_PREMIER && await baseLa(dernier.base)) {
    infos = { id: dernier.id, base: dernier.base, nom: dernier.nom ?? 'Classeur', premier: false }
  } else if (dernier?.base === BASE_PREMIER) {
    infos = { id: dernier.id, base: BASE_PREMIER, nom: dernier.nom ?? NOM_PREMIER, premier: true }
  }
  return {
    genre: 'classeur', registre: null, fiche: null, infos,
    message: `La bibliothèque des classeurs ne s'ouvre pas dans ce navigateur : seul « ${infos.nom} » est disponible. Enregistrez-le dans un fichier.`,
  }
}

/** La bibliothèque seule, sans classeur : ni tableau, ni application, ni
 *  interface ; un petit message à elle. Elle ne se ferme pas (pas de ×) ;
 *  l'adresse devient « ?bibliotheque » (recharger la rouvre). Ctrl + O y
 *  ouvre un classeur ou une bibliothèque (lot 4 C9, voir
 *  classeurs/fichiers.ts) ; ni Ctrl + O ni Ctrl + S n'y vont au navigateur. */
function bibliothequeSeule(racine: HTMLElement, registre: Registre, message?: string) {
  try { history.replaceState(history.state, '', urlBibliotheque(location.href)) } catch { /* adresse figée */ }
  document.title = 'Bibliothèque — MEM teachingtool'
  document.getElementById('zone')?.setAttribute('hidden', '')
  const toast = Object.assign(document.createElement('div'), { className: 'toast' })
  toast.setAttribute('role', 'status')
  racine.appendChild(toast)
  let minuterie = 0
  const dire = (texte: string, action?: ActionMessage | ActionMessage[]) => {
    const ligne = Object.assign(document.createElement('span'), { className: 'ligne', textContent: texte })
    for (const a of action === undefined ? [] : Array.isArray(action) ? action : [action]) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'action', textContent: a.libelle })
      b.addEventListener('click', () => { toast.classList.remove('visible'); a.faire() })
      ligne.appendChild(b)
    }
    toast.replaceChildren(ligne)
    toast.classList.add('visible')
    clearTimeout(minuterie)
    minuterie = window.setTimeout(() => toast.classList.remove('visible'), action ? 7000 : Math.max(2600, texte.length * 60))
  }
  const hote: HoteBibliotheque = { classeur: null, message: dire, avantDeQuitter: async () => {} }
  const b = new Bibliotheque(hote, registre, racine)
  // Les fichiers : ajouter un classeur, une bibliothèque (Ctrl + O, Ouvrir…, lâchés)
  const fichiers = new Fichiers({ registre, bibliotheque: b, message: dire, classeur: () => null }, racine)
  b.brancherFichiers(fichiers)
  // Récupérer une sauvegarde du Drive (lot 4 C10) : la seule chose qui en revient, sur demande
  brancherRecuperer(b, fichiers, registre)
  b.ouvrir()
  window.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return
    const k = e.key.toLowerCase()
    if (k === 's' || k === 'o') e.preventDefault()
  }, true)
  // Une bibliothèque vide le dit déjà sur l'écran
  if (message && message !== MESSAGE_VIDE) dire(message)
  if (import.meta.env.DEV) Object.assign(window, { __registre: registre, __bibliotheque: b, __fichiers: fichiers })
}

/** Un message gardé le temps d'arriver sur ce classeur (« Classeur « X »
 *  créé. ») : seulement s'il est pour lui ; cle : ce qu'il faudra dire de
 *  sa clé, une fois vérifiée ici (voir EnregistrementCle.direALArrivee) */
function messageDArrivee(id: string): { message: string; cle: CleALArrivee | null } | null {
  try {
    const t = sessionStorage.getItem(CLE_ARRIVEE)
    sessionStorage.removeItem(CLE_ARRIVEE)
    const o = t ? JSON.parse(t) : null
    return o && o.id === id && typeof o.message === 'string' && o.message ? { message: o.message, cle: lireCleALArrivee(o.cle) } : null
  } catch { return null }
}

async function demarrer() {
  const zone = document.getElementById('zone')!
  const racine = document.getElementById('app')!
  // Une page rendue par le cache du navigateur (Précédent, Suivant) se
  // recharge : on ne reprend jamais un onglet figé sur un classeur qui a pu
  // changer depuis (dans un autre onglet, ou en le quittant)
  // (la connexion Google de la page figée la suit : voir publication/drive.ts)
  window.addEventListener('pageshow', e => { if (e.persisted) { passerLaConnexion(); location.reload() } })
  const ouverture = await trouverLeClasseur()
  if (ouverture.genre === 'bibliotheque') { bibliothequeSeule(racine, ouverture.registre, ouverture.message); return }
  const { registre, fiche, infos, message } = ouverture
  // L'adresse garde le classeur : recharger la page le rouvre. Pas dans le
  // repli (l'adresse ne change pas), ni sans fiche.
  if (fiche) {
    try { history.replaceState(history.state, '', urlDuClasseur(location.href, fiche.id)) } catch { /* adresse figée (page intégrée) */ }
  }
  // La base du navigateur où vit ce classeur : celle du premier ne change
  // jamais (voir classeurs/demarrage.ts), sinon le professeur ne
  // retrouverait plus ses pages
  const tableau = new Tableau(infos.base)
  const app = new App(tableau, zone, infos)
  const ui = new UI(app, racine)
  ui.sansBibliotheque = !registre || !fiche
  // La base vient d'être supprimée ou changée ailleurs : plus rien ne s'y
  // écrit, une fenêtre le dit
  tableau.onCoupee = raison => ui.sauvegarde.remplaceAilleurs(raison === 'supprime' ? 'supprime' : 'remplace')
  // Le navigateur ne prend plus Ctrl + « + », F5 ni les gestes du tableau
  installerGardes(app)
  zone.dataset.outil = app.outil
  document.title = `${infos.nom} — MEM teachingtool`
  // Pour les tests automatiques, en développement seulement
  if (import.meta.env.DEV) Object.assign(window, { __app: app, __registre: registre, __ecrivain: (await import('./classeurs/ecrivain')).ecrivain, __parties: (await import('./instruments')).partiesDuCompas, __construction: await import('./construction'), __auto: await import('./automatismes'), __katex: (await import('katex')).default, __menus: await import('./menus'), __google: await import('./publication/drive') })

  const { vide } = await tableau.charger()
  // La page qu'on regardait avant de recharger, si elle existe encore (sans
  // annoncer son numéro : on arrive, on ne change pas de page)
  app.allerPageDeDepart()
  // L'état de la sauvegarde : le bouton du classeur, le menu ⋯, le bandeau
  // (après le chargement : il lit le film pour savoir le travail non
  // enregistré, et le chargement n'est pas un changement)
  const surveillance = new Surveillance(app, registre, fiche)
  ui.sauvegarde.onEnregistre = d => surveillance.enregistre(d)
  ui.brancherEtat(surveillance)
  // L'enregistrement automatique sur la clé (Chrome, Edge, aussi en
  // file://) : seulement avec une fiche dans l'index (pas dans le repli),
  // après le chargement (le chargement n'est pas un changement)
  ui.sauvegarde.registre = registre
  ui.sauvegarde.fiche = fiche
  const cle = registre && fiche ? new EnregistrementCle(app, registre, fiche, surveillance, ui.sauvegarde) : null
  ui.sauvegarde.cle = cle
  ui.brancherCle(cle)
  // La copie à sens unique sur le Drive (lot 4 C10) : seulement avec une
  // fiche, après le chargement ; en file://, elle dit qu'elle n'est possible
  // que depuis la version en ligne
  const drive = registre && fiche ? new CopieDrive(app, registre, fiche, surveillance) : null
  ui.sauvegarde.drive = drive
  ui.brancherDrive(drive)
  if (import.meta.env.DEV) Object.assign(window, { __surveillance: surveillance, __cle: cle, __drive: drive })
  // Ce que sait l'index : l'ouverture, puis les changements (au plus toutes
  // les 30 s). Rattrapé, sans retenir la suite : un index qui refuse
  // d'écrire ne doit pas empêcher d'écrire dans le classeur.
  let suivi: SuiviDuClasseur | null = null
  /** Le nom du classeur a changé (sa première ouverture, un renommage dans
   *  un autre onglet) : le bouton, le titre de l'onglet le suivent */
  const nommer = (f: FicheClasseur | undefined) => {
    if (!f || f.nom === infos.nom) return
    infos.nom = f.nom; document.title = `${f.nom} — MEM teachingtool`; ui.majNomClasseur()
  }
  if (registre && fiche) {
    registre.noterOuverture(fiche, tableau, vide).then(nommer).catch(() => { /* la fiche se remettra à jour au prochain changement */ })
    suivi = new SuiviDuClasseur(registre, fiche.id, tableau)
    // L'aperçu du classeur (sa première page, sur sa carte) : au calme,
    // jamais pendant qu'on écrit (voir classeurs/apercu-classeur.ts)
    const apercu = new ApercuDuClasseur(app, ui.apercus, registre, fiche.id)
    apercu.onEcrit = () => { void ui.bibliotheque?.apercuChange(infos.id) }
    // La base supprimée ou remplacée ailleurs : plus d'aperçu de ce contenu-là, plus de copie sur le Drive
    const coupee = tableau.onCoupee
    tableau.onCoupee = raison => { apercu.arreter(); drive?.suspendre(); coupee?.(raison) }
    if (import.meta.env.DEV) Object.assign(window, { __apercu: apercu })
    registre.onChange(c => { if (c.classeurs?.includes(infos.id)) registre.classeur(infos.id).then(nommer).catch(() => {}) })
    // La bibliothèque des classeurs : le bouton du classeur l'ouvre
    // par-dessus ; en partir vers un autre classeur ne perd rien
    const hote: HoteBibliotheque = {
      classeur: infos,
      message: (t, a) => ui.message(t, a),
      avantDeQuitter: async () => {
        app.poserCeQuiAttend()
        app.piste.vider()
        await tableau.attendreEcritures()
        await suivi?.vider()
        await cle?.vider()
        await apercu.vider()
      },
      // Dupliquer le classeur de cet onglet (la copie se fait depuis sa base) :
      // ce qui attend s'écrit d'abord ; une base trouée se répare, sinon non
      avantDeDupliquer: async () => {
        app.poserCeQuiAttend()
        app.piste.vider()
        await tableau.attendreEcritures()
        if (tableau.trou) await tableau.reparer().catch(() => { /* le trou reste : on le dit */ })
        await apercu.vider().catch(() => {})
        // Une partie qui ne se relit plus (Tableau.incomplet) : la copie ne se ferait pas
        return !tableau.trou && !tableau.incomplet
      },
      rafraichirApercu: () => apercu.maintenant(),
      // La carte du classeur de cet onglet dit son vrai nombre de pages et sa
      // date : la fiche s'écrit à l'ouverture de la bibliothèque, puis
      // chaque écriture du suivi refait la carte (voir suivi.onEcrit)
      ecrireLaFiche: () => suivi?.vider() ?? Promise.resolve(),
      tableau, ui, surveillance,
      // Renommé dans la bibliothèque de cet onglet (le canal ne revient pas à qui parle)
      classeurChange: nommer,
      oublierMessage: cle => ui.oublierAction(cle),
      // Effacé depuis la corbeille de cet onglet (lot 4 C8) : les autres onglets
      // sont prévenus par la sauvegarde, plus rien ne s'écrit dans la base (ni
      // le document, ni la clé, ni la fiche, ni l'aperçu), le navigateur ne
      // demande plus rien en partant ; l'onglet devient la bibliothèque seule
      classeurEfface: () => {
        ui.sauvegarde.effaceIci()
        apercu.arreter()
        drive?.suspendre()
        suivi?.arreter()
        surveillance.laisserPartir()
        hote.classeur = null
        hote.surveillance = null
        document.title = 'Bibliothèque — MEM teachingtool'
        try { history.replaceState(history.state, '', urlBibliotheque(location.href)) } catch { /* adresse figée */ }
      },
    }
    // Le dernier classeur, celui qu'on rouvre au démarrage : celui où l'on a
    // écrit en dernier (le suivi, au plus toutes les 30 s), ou qu'on
    // regardait (l'onglet qui redevient visible ou prend le focus). Pas
    // seulement le dernier ouvert : un classeur regardé un instant dans un
    // autre onglet (Ctrl + clic) ne prend pas la place de celui où l'on
    // travaille. Plus rien une fois le classeur effacé.
    const noterDernier = () => { if (hote.classeur) ecrireDernier(infos) }
    suivi.onNote = noterDernier
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') noterDernier() })
    window.addEventListener('focus', noterDernier)
    ui.bibliotheque = new Bibliotheque(hote, registre, racine)
    suivi.onEcrit = () => { if (hote.classeur) ui.bibliotheque?.ficheChange(infos.id) }
    // Ouvrir des fichiers (lot 4 C9) : un classeur s'ajoute à la bibliothèque
    // (ou remplace celui-ci), plusieurs, une bibliothèque (.memb) ;
    // « Enregistrer toute la bibliothèque » ; le fichier de la clé en conflit
    const fichiers = new Fichiers({
      registre, bibliotheque: ui.bibliotheque, message: (t, a) => ui.message(t, a), classeur: () => hote.classeur,
      app, sauvegarde: ui.sauvegarde, cle, surveillance, voirLaBibliotheque: () => ui.ouvrirBibliotheque(),
    }, racine)
    ui.sauvegarde.fichiers = fichiers
    if (drive) drive.fichiers = fichiers
    ui.bibliotheque.brancherFichiers(fichiers)
    brancherRecuperer(ui.bibliotheque, fichiers, registre)
    ui.brancherFichiers(fichiers)
    if (import.meta.env.DEV) Object.assign(window, { __bibliotheque: ui.bibliotheque, __fichiers: fichiers })
  }
  // Un classeur vient d'être ouvert depuis un fichier, ou créé : on le dit
  ui.sauvegarde.annoncerOuverture()
  // Arrivé avec la case de la clé : ce qu'il en est vraiment se dit une
  // fois la clé vérifiée (Chrome oublie son accord en changeant de page)
  const arrivee = messageDArrivee(infos.id)
  if (arrivee?.cle && cle) void cle.direALArrivee(arrivee.message, arrivee.cle)
  else if (arrivee) ui.message(arrivee.message)
  if (message) ui.message(message)
  // Une partie du classeur ne se relit plus (une écriture refusée lors d'une
  // autre séance) : on le dit en arrivant, l'état le garde ensuite
  if (tableau.incomplet) ui.message(TEXTE_INCOMPLET)
  annoncerLaBibliotheque(ui, infos, vide, !!(registre && fiche))
  // Que le navigateur ne vide pas la base pour faire de la place. Chrome, Edge
  // et Safari décident seuls, sans rien demander ; Firefox pose sa question.
  // Rien n'est montré ici : ce n'est pas une sauvegarde (voir « Enregistrer le classeur »).
  navigator.storage?.persisted?.().then(oui => oui || navigator.storage.persist()).catch(() => {})
}

/** La première fois que cette version ouvre le tableau d'avant (le premier
 *  classeur, qui a du contenu) : il est devenu un classeur, et son nom ouvre
 *  la bibliothèque ; une seule fois (CLE_ANNONCE). Le bouton du classeur
 *  caché faute de place (voir UI.placerBoutonClasseur) : c'est le menu ⋯
 *  qui y mène. Un navigateur neuf n'a rien à apprendre : la clé est posée
 *  sans rien dire. */
function annoncerLaBibliotheque(ui: UI, infos: InfosClasseur, vide: boolean, avecBibliotheque: boolean) {
  if (!avecBibliotheque || !infos.premier || lireCle(CLE_ANNONCE)) return
  try { localStorage.setItem(CLE_ANNONCE, String(Date.now())) } catch { /* on le redira */ }
  if (vide) return
  const ou = ui.formeClasseur === 'cache' ? 'Le menu ⋯, en haut à droite, ouvre la bibliothèque de vos classeurs.'
    : ui.formeClasseur === 'large' ? 'Son nom, en haut à gauche, ouvre la bibliothèque de vos classeurs.'
      : 'Son bouton, en haut à gauche, ouvre la bibliothèque de vos classeurs.'
  ui.message(`Votre tableau est maintenant le classeur « ${infos.nom} ». ${ou}`, { libelle: 'Voir la bibliothèque', faire: () => ui.ouvrirBibliotheque() })
}

demarrer()
