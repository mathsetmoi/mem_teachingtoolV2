import 'katex/dist/katex.min.css'
import { ficheDeLaSeance } from './resume/collecte'
import { ligneDeResume } from './resume/fiche'
import './style.css'
import { Tableau } from './document'
import { App } from './app'
import { DUREE_MESSAGE_ACTION, UI } from './ui'
import { installerGardes } from './navigateur'
import type { FicheClasseur, InfosClasseur } from './classeurs/demarrage'
import { BASE_PREMIER, CLASSEUR_SEUL, CLE_DERNIER_CLASSEUR, MESSAGE_VIDE, NOM_PREMIER, choisirAuDemarrage, ecrireDernier, estPremier, lireDernier, urlBibliotheque, urlDuClasseur } from './classeurs/demarrage'
import { Registre } from './classeurs/registre'
import { SuiviDuClasseur } from './classeurs/suivi'
import { Surveillance } from './classeurs/surveillance'
import { TEXTE_INCOMPLET, lieuDuFichier } from './classeurs/etat'
import { AutresSauvegardes } from './classeurs/autres-sauvegardes'
import { DeplacerClasseur } from './classeurs/deplacer-fichier'
import type { CleALArrivee } from './classeurs/cle'
import { EnregistrementCle, lireCleALArrivee } from './classeurs/cle'
import { CopieDrive } from './classeurs/copie-drive'
import { brancherRecuperer } from './classeurs/recuperer'
import { Verification } from './classeurs/verification'
import { brancherVerification } from './classeurs/vue-verification'
import { Ailleurs } from './classeurs/ailleurs'
import { Ranger } from './classeurs/ranger'
import { ApercuDuClasseur } from './classeurs/apercu-classeur'
import { ErreurBase, ouvrirBaseExistante } from './classeurs/bases'
import { passerLaConnexion } from './publication/drive'
import type { HoteBibliotheque, RappelArrivee } from './classeurs/bibliotheque'
import { Bibliotheque, CLE_ARRIVEE, CLE_RAPPEL_ARRIVEE, lireRappelArrivee } from './classeurs/bibliotheque'
import { enregistrerDepuisLaBase } from './classeurs/enregistrer'
import { ecrivain } from './classeurs/ecrivain'
import { Fichiers } from './classeurs/fichiers'
import type { ActionMessage } from './app'
import type { SeanceDuClasseur } from './seances'
import { deLaSeance } from './seances'
import type { ChapitreAccueil } from './seances-vue'
import { ouvrirAccueil } from './seances-vue'
import { installerCurseurs } from './curseurs'
import { comparerEtiquettes, etiquetteHeritee } from './classeurs/arbre'
import { NOM_SEANCES_ISOLEES, classeurSeancesIsolees, estSeancesIsolees, isoleesEnQueue, texteClasseurIsoleesCree, texteSeanceIsolee } from './classeurs/isolees'
import { classeursCherches, contenuDeLaBase } from './classeurs/recherche-bibliotheque'
import type { FicheDossier } from './classeurs/demarrage'

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
    const actions = action === undefined ? [] : Array.isArray(action) ? action : [action]
    for (const a of actions) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'action', textContent: a.libelle })
      b.addEventListener('click', () => { toast.classList.remove('visible'); a.faire() })
      ligne.appendChild(b)
    }
    toast.replaceChildren(ligne)
    toast.classList.add('visible')
    clearTimeout(minuterie)
    // Comme UI.message : 7 s avec un bouton, ou plus si une action le demande
    const duree = actions.length ? Math.max(DUREE_MESSAGE_ACTION, ...actions.map(a => a.duree ?? 0)) : Math.max(2600, texte.length * 60)
    minuterie = window.setTimeout(() => toast.classList.remove('visible'), duree)
  }
  const hote: HoteBibliotheque = { classeur: null, message: dire, avantDeQuitter: async () => {} }
  const b = new Bibliotheque(hote, registre, racine)
  // Les fichiers : ajouter un classeur, une bibliothèque (Ctrl + O, Ouvrir…, lâchés)
  const fichiers = new Fichiers({ registre, bibliotheque: b, message: dire, classeur: () => null }, racine)
  b.brancherFichiers(fichiers)
  // Récupérer une sauvegarde du Drive (lot 4 C10) : la seule chose qui en revient, sur demande
  brancherRecuperer(b, fichiers, registre)
  // Vérifier les classeurs (lot 17) : les images qui manquent, remises ; la corbeille recopie avant d'effacer
  const verification = new Verification({ registre, fichiers, classeur: () => null, message: dire })
  fichiers.verification = verification
  brancherVerification(b, verification, dire)
  // Ouvrir et enregistrer sur l'ordinateur ou sur le Drive, Mes emplacements (lot 7)
  const ailleurs = new Ailleurs({ registre, bibliotheque: b, fichiers, message: dire, classeur: () => null })
  // Où ranger les classeurs d'un niveau (lot 18) : la fenêtre « Où ranger… »,
  // le fichier de chaque classeur qui arrive dans un niveau rangé
  const ranger = new Ranger({ registre, bibliotheque: b, message: dire, classeur: () => null })
  b.brancherRanger(ranger)
  fichiers.ranger = ranger
  ailleurs.ranger = ranger
  b.ouvrir()
  window.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return
    const k = e.key.toLowerCase()
    if (k === 's' || k === 'o') e.preventDefault()
  }, true)
  // Une bibliothèque vide le dit déjà sur l'écran
  if (message && message !== MESSAGE_VIDE) dire(message)
  if (import.meta.env.DEV) Object.assign(window, { __registre: registre, __bibliotheque: b, __fichiers: fichiers, __ailleurs: ailleurs, __ranger: ranger })
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

/** Le rappel d'enregistrer le classeur qu'on vient de quitter, gardé le
 *  temps d'arriver sur celui-ci (voir Bibliotheque.ouvrirClasseur) :
 *  seulement s'il est pour lui */
function rappelDArrivee(id: string): RappelArrivee | null {
  try {
    const t = sessionStorage.getItem(CLE_RAPPEL_ARRIVEE)
    sessionStorage.removeItem(CLE_RAPPEL_ARRIVEE)
    return lireRappelArrivee(t ? JSON.parse(t) : null, id)
  } catch { return null }
}

/** Ce rappel reste à l'écran tant de ms (un message à bouton : 7 s sinon) */
const DUREE_RAPPEL_ARRIVEE = 30_000

/** Le rappel lu : le message, et son bouton, qui enregistre le classeur
 *  quitté depuis sa base (sans l'ouvrir, voir classeurs/enregistrer.ts ; le
 *  choix du fichier s'ouvre dans le clic) */
function direLeRappel(ui: UI, registre: Registre, r: RappelArrivee) {
  ui.message(r.texte, { libelle: `Enregistrer « ${r.nom} » dans un fichier`, duree: DUREE_RAPPEL_ARRIVEE, faire: () => void enregistrerLeQuitte(ui, registre, r.id) })
}
async function enregistrerLeQuitte(ui: UI, registre: Registre, id: string) {
  let f: FicheClasseur | undefined
  try { f = await registre.classeur(id) } catch { f = undefined }
  if (!f || f.corbeille) { ui.message('Ce classeur n\'est plus dans la bibliothèque.'); return }
  await enregistrerDepuisLaBase(f, t => ui.message(t))
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
  // Les conseils du premier lancement (les outils de classe, l'aide)
  ui.lancerConseils()
  // La base vient d'être supprimée ou changée ailleurs : plus rien ne s'y
  // écrit, une fenêtre le dit
  tableau.onCoupee = raison => ui.sauvegarde.remplaceAilleurs(raison === 'supprime' ? 'supprime' : 'remplace')
  // Le navigateur ne prend plus Ctrl + « + », F5 ni les gestes du tableau
  installerGardes(app)
  zone.dataset.outil = app.outil
  // Le curseur prend l'icône de l'outil en main
  installerCurseurs()
  document.title = `${infos.nom} — MEM teachingtool`
  // Pour les tests automatiques, en développement seulement
  if (import.meta.env.DEV) Object.assign(window, { __app: app, __registre: registre, __ecrivain: (await import('./classeurs/ecrivain')).ecrivain, __parties: (await import('./instruments')).partiesDuCompas, __construction: await import('./construction'), __auto: await import('./automatismes'), __katex: (await import('katex')).default, __menus: await import('./menus'), __google: await import('./publication/drive') })

  const { vide } = await tableau.charger()
  // La page qu'on regardait avant de recharger, si elle existe encore (sans
  // annoncer son numéro : on arrive, on ne change pas de page)
  app.allerPageDeDepart()
  // La séance (lot 6) : on reste dans celle du jour si elle a servi depuis
  // moins d'une heure ; sinon, la fenêtre d'accueil (à la fin du démarrage)
  const arrivage = lireNouvelleSeance(infos.id)
  let depart = app.seanceAuDemarrage({ nouvelle: arrivage.nouvelle })
  // Arrivé par la ligne « séances » d'une carte : on va à cette séance, sans
  // la fenêtre d'accueil (on l'a choisie)
  if (SEANCE_VOULUE && voirLaSeance(app, SEANCE_VOULUE)) depart = { genre: 'rien' }
  // Arrivé par la recherche : la page, la formule prise
  if (PAGE_VOULUE && voirLaPage(app, PAGE_VOULUE, FORME_VOULUE)) depart = { genre: 'rien' }
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
      voirSeance: id => voirLaSeance(app, id),
      voirPage: (page, forme) => voirLaPage(app, page, forme),
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
    // Le niveau du classeur (le tirage au sort y prend sa liste) : son plus
    // proche dossier de niveau, sinon le dossier où il est rangé
    ui.classeDuClasseur = async () => {
      const [dossiers, fiches] = await Promise.all([registre.dossiers(), registre.classeurs()])
      const carte = new Map(dossiers.filter(d => !d.corbeille).map(d => [d.id, d]))
      const ici = fiches.find(f => f.id === infos.id)
      if (!ici || ici.dossier === null) return null
      const classe = etiquetteHeritee(ici.dossier, carte)
      const d = classe?.dossier ?? carte.get(ici.dossier)
      return d ? { id: d.id, nom: d.nom } : null
    }
    // La recherche : tous les classeurs de ce navigateur (lus en lecture
    // seule), et l'ouverture d'un autre classeur, comme depuis sa carte
    ui.idClasseur = infos.id
    ui.rechercheClasseurs = () => classeursCherches(registre, infos.id)
    ui.contenuClasseur = async c => { const f = (c as { fiche?: FicheClasseur }).fiche; return f ? contenuDeLaBase(f) : null }
    ui.ouvrirAilleurs = async d => {
      const f = await registre.classeur(d.classeur)
      if (f && !f.corbeille) void ui.bibliotheque?.ouvrirClasseur(f, { seance: d.seance, page: d.page, forme: d.forme })
      else ui.message('Ce classeur n\'est plus dans la bibliothèque.')
    }
    suivi.onEcrit = () => { if (hote.classeur) ui.bibliotheque?.ficheChange(infos.id) }
    // Ouvrir des fichiers (lot 4 C9) : un classeur s'ajoute à la bibliothèque
    // (ou remplace celui-ci), plusieurs, une bibliothèque (.memb) ;
    // « Enregistrer toute la bibliothèque » ; le fichier de la clé en conflit
    const fichiers = new Fichiers({
      registre, bibliotheque: ui.bibliotheque, message: (t, a) => ui.message(t, a), classeur: () => hote.classeur,
      app, sauvegarde: ui.sauvegarde, cle, surveillance, voirLaBibliotheque: () => ui.ouvrirBibliotheque(),
    }, racine)
    ui.sauvegarde.fichiers = fichiers
    app.chercherImages = () => fichiers.retrouverImages()
    if (drive) drive.fichiers = fichiers
    ui.bibliotheque.brancherFichiers(fichiers)
    brancherRecuperer(ui.bibliotheque, fichiers, registre)
    // Vérifier les classeurs (lot 17) : les images qui manquent (un cadre
    // gris), cherchées dans les autres classeurs et remises ; à l'ouverture
    // de ce classeur (retrouverImages), au menu ⋯ de la bibliothèque, et
    // avant d'effacer la corbeille
    const verification = new Verification({
      registre, fichiers, classeur: () => hote.classeur, app, sauvegarde: ui.sauvegarde, message: (t, a) => ui.message(t, a),
    })
    fichiers.verification = verification
    const ouvrirVerification = brancherVerification(ui.bibliotheque, verification, t => ui.message(t))
    verification.voirLaVerification = () => { ui.ouvrirBibliotheque(); if (ui.bibliotheque?.ouvert) ouvrirVerification() }
    ui.brancherFichiers(fichiers)
    // Ouvrir et enregistrer sur l'ordinateur ou sur le Drive, Mes
    // emplacements (lot 7) : « Autres sauvegardes… » du menu ⋯ y mène
    // Le classeur de cet onglet : ce qui attend s'écrit dans sa base d'abord
    const avantDEcrire = async (f: FicheClasseur) => {
      if (f.id !== infos.id || !hote.classeur) return
      app.poserCeQuiAttend()
      app.piste.vider()
      await app.tableau.attendreEcritures()
    }
    // Un rangement va changer le fichier du classeur de cet onglet : sa clé se
    // tient tranquille (l'écriture déjà partie finit d'abord), jusqu'à apresRangement
    const avantDeDeplacer = async (f: FicheClasseur) => {
      if (f.id !== infos.id || !hote.classeur) return
      await cle?.retenir()
    }
    // Après un rangement qui touche le classeur de cet onglet (son fichier
    // écrit ou déplacé par la bibliothèque) : sa clé repart depuis sa fiche
    const apresRangement = async (ids: readonly string[]) => {
      if (!ids.includes(infos.id) || !hote.classeur) return
      await cle?.relacher()
    }
    const ailleurs = new Ailleurs({
      registre, bibliotheque: ui.bibliotheque, fichiers, message: (t, a) => ui.message(t, a), classeur: () => hote.classeur,
      activerCle: cle?.disponible ? () => void cle.activer() : undefined,
      enregistrerClasseur: () => void ui.sauvegarde.enregistrer(),
      avantDEcrire, avantDeDeplacer, apresRangement,
    })
    // Où ranger les classeurs d'un niveau (lot 18) : la fenêtre « Où ranger… »
    // au premier classeur d'un niveau, le fichier de chaque classeur qui arrive
    // dans un niveau rangé, les établissements de « Mes emplacements »
    const ranger = new Ranger({ registre, bibliotheque: ui.bibliotheque, message: (t, a) => ui.message(t, a), avantDEcrire, avantDeDeplacer, apresRangement, classeur: () => hote.classeur })
    ui.bibliotheque.brancherRanger(ranger)
    fichiers.ranger = ranger
    ailleurs.ranger = ranger
    // « Autres sauvegardes… » du menu ⋯ (lot 18) : la copie sur le Drive par
    // connexion Google, toute la bibliothèque dans un fichier, récupérer une
    // sauvegarde, les niveaux sur le Drive
    const autres = new AutresSauvegardes({ registre, fichiers, ailleurs, drive, surveillance, message: (t, a) => ui.message(t, a) })
    ui.autresSauvegardes = () => void autres.ouvrir()
    // Le classeur sans fichier (lot 18) : ce que l'état sait de son rangement
    // (son niveau est rangé, son fichier irait là ; ou le niveau reste à
    // ranger), posé à l'arrivée (la clé vérifiée d'abord), quand sa fiche
    // ou les dossiers changent, et après chaque rendu de la bibliothèque
    // (« Mes emplacements » y change les emplacements, sans passer par le
    // canal : il ne revient pas à qui parle)
    const majRangement = async () => {
      if (!hote.classeur) return
      const f = await registre.classeur(infos.id).catch(() => undefined)
      surveillance.majRangement(f && !f.corbeille ? await ranger.rangementPour(f) : null)
    }
    void (cle?.pret ?? Promise.resolve()).then(majRangement)
    registre.onChange(c => { if (c.classeurs?.includes(infos.id) || c.dossiers?.length) void majRangement() })
    ui.bibliotheque.apresRendu.push(() => void majRangement())
    // « Ranger « 2nde » dans un dossier… » : la fenêtre « Où ranger… » pour
    // le niveau de ce classeur ; rangé, la clé de l'onglet repart sur le
    // fichier écrit. « Lui donner son fichier » : le classeur reçoit son
    // fichier dans le dossier de son niveau (l'accord dans le clic), et la
    // clé de l'onglet démarre dessus.
    // (la clé de l'onglet repart d'elle-même : apresRangement, plus haut)
    const rangerLeNiveauIci = async () => {
      await ranger.proposerPourLeClasseurOuvert()
      await majRangement()
    }
    const donnerSonFichierIci = async () => {
      const r = await ranger.donnerSonFichierAuClasseurOuvert()
      if (r) {
        const c = surveillance.etat.cle
        if (c.etat === 'ok' || c.etat === 'en-cours') ui.message(r.ok ?? `« ${infos.nom} » s'enregistre maintenant tout seul dans ${lieuDuFichier(c)}.`)
      }
      await majRangement()
    }
    ui.inscrireActionEtat('ranger-niveau', () => { const n = surveillance.etat.cle.rangeable?.niveau; return n ? `Ranger « ${n} » dans un dossier…` : 'Ranger ce niveau dans un dossier…' }, () => void rangerLeNiveauIci())
    ui.inscrireActionEtat('donner-fichier', 'Lui donner son fichier', () => void donnerSonFichierIci())
    // « Déplacer le classeur… » du menu ⋯ : le fichier suit (morceau C2,
    // deplacer-fichier.ts) ; à décommenter à la fusion du morceau C2
    const deplaceur = new DeplacerClasseur({ registre, bibliotheque: ui.bibliotheque, cle, message: (t, a) => ui.message(t, a), classeur: () => hote.classeur, avantDEcrire })
    ui.bibliotheque.brancherDeplaceur(deplaceur)
    ui.deplacerClasseur = () => void deplaceur.ouvrir()
    ui.brancherReplay(registre, infos.id)
    if (import.meta.env.DEV) Object.assign(window, { __ailleurs: ailleurs, __ranger: ranger, __autres: autres })
    if (import.meta.env.DEV) Object.assign(window, { __bibliotheque: ui.bibliotheque, __fichiers: fichiers })
  }
  // Un classeur vient d'être ouvert depuis un fichier, ou créé : on le dit
  const ouvertDUnFichier = ui.sauvegarde.annoncerOuverture()
  // Arrivé avec la case de la clé : ce qu'il en est vraiment se dit une
  // fois la clé vérifiée (Chrome oublie son accord en changeant de page)
  const arrivee = messageDArrivee(infos.id)
  const rappel = rappelDArrivee(infos.id)
  let ditALArrivee: Promise<void> = Promise.resolve()
  if (arrivee?.cle && cle) ditALArrivee = cle.direALArrivee(arrivee.message, arrivee.cle)
  else if (arrivee) ui.message(arrivee.message)
  if (message) ui.message(message)
  // Une partie du classeur ne se relit plus (une écriture refusée lors d'une
  // autre séance) : on le dit en arrivant, l'état le garde ensuite
  if (tableau.incomplet) ui.message(TEXTE_INCOMPLET)
  annoncerLaBibliotheque(ui, infos, vide, !!(registre && fiche))
  // La séance (lot 6) : « Séance de 14 h reprise », quand rien d'autre ne
  // se dit en arrivant (un fichier ouvert, un classeur créé, la clé…) ; la
  // fenêtre d'accueil, pas sur un classeur qu'on vient d'ouvrir d'un
  // fichier, ou d'ajouter, de créer (l'arrivée a son message) : on l'a
  // choisi, on le regarde (sa dernière séance continue)
  const autreMessage = ouvertDUnFichier || !!arrivee || !!message || tableau.incomplet
  let accueil: Promise<HTMLDialogElement | null> | null = null
  if (depart.genre === 'reprise' && depart.seance && !autreMessage) ui.message(`Séance ${deLaSeance(depart.seance, Date.now())} reprise`)
  else if (depart.genre === 'accueil' && depart.seance && !ouvertDUnFichier && !arrivee) accueil = ouvrirLAccueil(app, ui, registre, fiche, depart.seance)
  // Parti d'un autre classeur avec « Commencer par des automatismes » cochée
  if (arrivage.automatismes && !document.querySelector('dialog[open]')) ui.flash.ouvrir()
  // Le rappel d'enregistrer le classeur qu'on vient de quitter (20 minutes
  // de travail que rien ne protège, voir Bibliotheque.ouvrirClasseur) : un
  // message avec un bouton, 30 s, une fois dit ce que l'arrivée avait à
  // dire (la clé vérifiée, son « Autoriser »), et une fois fermée la
  // fenêtre qui s'ouvre en arrivant (l'accueil, le flash d'automatismes :
  // un bouton sous une fenêtre ne se clique pas). Il ne compte pas parmi
  // les autres annonces : la fenêtre et « Séance … reprise » gardent leur
  // règle.
  if (rappel && registre) {
    const dire = () => {
      const d = document.querySelector<HTMLDialogElement>('dialog[open]')
      if (d) d.addEventListener('close', dire, { once: true })
      else window.setTimeout(() => direLeRappel(ui, registre, rappel), ui.finDuMessage())
    }
    void (accueil ?? ditALArrivee).then(dire)
  }
  // Que le navigateur ne vide pas la base pour faire de la place. Chrome, Edge
  // et Safari décident seuls, sans rien demander ; Firefox pose sa question.
  // Rien n'est montré ici : ce n'est pas une sauvegarde (voir « Enregistrer le classeur »).
  navigator.storage?.persisted?.().then(oui => oui || navigator.storage.persist()).catch(() => {})
}

/** La séance où l'on arrive (« ?classeur=…&seance=… », par la ligne « séances »
 *  d'une carte), lue avant que le démarrage remette l'adresse au propre : un
 *  rechargement ne la rejoue pas */
const SEANCE_VOULUE = new URLSearchParams(location.search).get('seance')
/** La page où l'on arrive, et la formule à y prendre (« &page=…&forme=… »,
 *  par la recherche), lues de même */
const PAGE_VOULUE = new URLSearchParams(location.search).get('page')
const FORME_VOULUE = new URLSearchParams(location.search).get('forme')

/** Va à une page du classeur ouvert (en lecture si elle est d'une séance
 *  passée), la formule prise ; faux : la page n'existe plus */
function voirLaPage(app: App, page: string, forme: string | null): boolean {
  if (!app.tableau.ordre.toArray().includes(page)) return false
  app.voirPage(page)
  if (forme) requestAnimationFrame(() => app.montrerForme(forme))
  return true
}

/** Va à la première page d'une séance du classeur ouvert ; faux : elle n'existe
 *  plus, ou n'a pas de page */
function voirLaSeance(app: App, id: string): boolean {
  const s = app.tableau.seancesDuClasseur().find(x => x.id === id)
  if (!s || !s.pages.length) return false
  app.voirPage(s.pages[0])
  return true
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

/** On part vers un autre classeur pour y commencer une séance (la fenêtre
 *  d'accueil : un autre niveau, un autre chapitre) : la clé de cet onglet,
 *  { id, t, automatismes? }, valable une minute ; automatismes : la case
 *  « Commencer par des automatismes » était cochée */
const CLE_NOUVELLE_SEANCE = 'mem-teachingtool-nouvelle-seance'

function lireNouvelleSeance(id: string): { nouvelle: boolean; automatismes: boolean } {
  try {
    const t = sessionStorage.getItem(CLE_NOUVELLE_SEANCE)
    sessionStorage.removeItem(CLE_NOUVELLE_SEANCE)
    const o = t ? JSON.parse(t) : null
    const nouvelle = !!o && o.id === id && typeof o.t === 'number' && Date.now() - o.t < 60_000
    return { nouvelle, automatismes: nouvelle && o.automatismes === true }
  } catch { return { nouvelle: false, automatismes: false } }
}

function noterNouvelleSeance(id: string, automatismes: boolean) {
  try { sessionStorage.setItem(CLE_NOUVELLE_SEANCE, JSON.stringify(automatismes ? { id, t: Date.now(), automatismes } : { id, t: Date.now() })) } catch { /* on arrivera sans nouvelle séance */ }
}

/** Les dossiers et tout ce qui est dedans (les sous-dossiers compris) */
function sousDossiers(racine: string, dossiers: readonly FicheDossier[]): Set<string> {
  const r = new Set([racine])
  for (let change = true; change;) {
    change = false
    for (const d of dossiers) if (d.parent !== null && r.has(d.parent) && !r.has(d.id)) { r.add(d.id); change = true }
  }
  return r
}

/** Ce que la fenêtre d'accueil et « Séance isolée » savent du classeur
 *  ouvert, relu dans la bibliothèque à l'instant : ses dossiers (tous, et
 *  les vivants : hors corbeille), ses classeurs ouvrables, le niveau du
 *  classeur (son plus proche dossier de niveau), le dossier du chapitre (ce
 *  dossier de niveau, sinon son dossier, sinon la racine) ; et les gestes
 *  communs : les classeurs d'un dossier (ses sous-dossiers compris), partir
 *  vers un classeur pour y commencer une séance, « Nouveau chapitre ». Sans
 *  bibliothèque (le repli), tout est vide. */
async function contexteDuNiveau(ui: UI, registre: Registre | null, fiche: FicheClasseur | null) {
  let dossiers: FicheDossier[] = [], fiches: FicheClasseur[] = []
  if (registre && fiche) {
    try { [dossiers, fiches] = await Promise.all([registre.dossiers(), registre.classeurs()]) } catch { /* sans la bibliothèque */ }
  }
  const vivants = dossiers.filter(d => !d.corbeille)
  const carte = new Map(vivants.map(d => [d.id, d]))
  const ici = fiche ? fiches.find(f => f.id === fiche.id) ?? fiche : null
  const classe = ici && ici.dossier !== null ? etiquetteHeritee(ici.dossier, carte) : null
  const dossierDuChapitre = classe ? classe.dossier.id : ici?.dossier ?? null
  const ouvrables = fiches.filter(f => !f.corbeille && !f.effacement && !f.creation)
  const dans = (d: string | null) => {
    if (d === null) return ouvrables.filter(f => f.dossier === null || !carte.has(f.dossier))
    const tous = sousDossiers(d, vivants)
    return ouvrables.filter(f => f.dossier !== null && tous.has(f.dossier))
  }
  const partir = (f: FicheClasseur, automatismes = false) => {
    if (!ui.bibliotheque) return
    noterNouvelleSeance(f.id, automatismes)
    void ui.bibliotheque.ouvrirClasseur(f)
  }
  const nouveauChapitre = (d: string | null) => ui.bibliotheque?.nouveauClasseur({ chapitre: { dossier: d, dossiers: carte } })
  return { dossiers, vivants, carte, fiches, ouvrables, ici, classe, dossierDuChapitre, dans, partir, nouveauChapitre }
}

/** « Séance isolée » (lot 17, le lien de la fenêtre « Bonjour ! ») : une
 *  séance hors chapitre (une remédiation, un devoir corrigé), dans le
 *  classeur « Séances isolées » du niveau du classeur ouvert (son dossier de
 *  niveau ; sinon son dossier ; sinon la racine), reconnu à son nom et relu
 *  à l'instant (le classeur a pu changer de dossier, un autre onglet a pu
 *  créer le classeur isolé pendant que la fenêtre était ouverte) :
 *  - le classeur ouvert est lui-même « Séances isolées » : une nouvelle
 *    séance ici ;
 *  - il existe ailleurs : on y part, et la clé de l'onglet y fait commencer
 *    la séance sans question ;
 *  - il n'existe pas : créé sans fenêtre, page blanche, dans le dossier de
 *    niveau, puis ouvert (un classeur neuf commence sa séance sans question) ;
 *    le message d'arrivée le dit.
 *  auto : la case « Commencer par des automatismes » était cochée.
 *  (Pas d'entrée dans le menu ⋯ : il ne tient déjà pas sans défiler au
 *  poste de la classe, voir le README, lot 17.) */
async function seanceIsolee(app: App, ui: UI, registre: Registre, fiche: FicheClasseur, auto: boolean) {
  const b = ui.bibliotheque
  if (!b) return
  const c = await contexteDuNiveau(ui, registre, fiche)
  const f = classeurSeancesIsolees(c.dossierDuChapitre, c.ouvrables, c.dossiers)
  if (f && f.id === fiche.id) {
    app.nouvelleSeance()
    if (auto) ui.flash.ouvrir()
    return
  }
  if (f) { c.partir(f, auto); return }
  await b.creerEtOuvrir({
    nom: NOM_SEANCES_ISOLEES, dossier: c.dossierDuChapitre,
    avant: x => noterNouvelleSeance(x.id, auto),
    arrivee: texteClasseurIsoleesCree(c.classe ? c.classe.dossier.nom : null),
  })
}

/** La fenêtre d'accueil (lot 6, voir seances-vue.ts), remplie avec la
 *  bibliothèque : le niveau (le plus proche dossier de niveau du classeur),
 *  les autres niveaux (les dossiers de niveau), les chapitres du niveau
 *  (les classeurs de son dossier, avec leur nombre de séances ; le classeur
 *  « Séances isolées » en dernier, lot 17), le lien « Séance isolée ». Sans
 *  bibliothèque (le repli), ni niveaux ni chapitres ni séance isolée. */
async function ouvrirLAccueil(app: App, ui: UI, registre: Registre | null, fiche: FicheClasseur | null, seance: SeanceDuClasseur): Promise<HTMLDialogElement | null> {
  const { vivants, fiches, ouvrables, ici, classe, dossierDuChapitre, dans, partir, nouveauChapitre } = await contexteDuNiveau(ui, registre, fiche)
  const carte = new Map(vivants.map(d => [d.id, d]))
  const classes = vivants.filter(d => d.etiquette && d.id !== classe?.dossier.id)
    .sort((a, b) => comparerEtiquettes(a.nom, b.nom)).map(d => ({ id: d.id, nom: d.nom }))
  const avecBibliotheque = !!(registre && fiche && ui.bibliotheque)
  const nomDuNiveau = classe ? classe.dossier.nom : null
  if (document.querySelector('dialog[open]')) return null
  return ouvrirAccueil(document.getElementById('app')!, {
    classe: nomDuNiveau,
    chapitre: app.classeur.nom,
    isolees: estSeancesIsolees(ici ?? app.classeur),
    continuer: deLaSeance(seance, Date.now(), true),
    derniereFois: (() => { const f = ficheDeLaSeance(app.tableau, seance.id, app.classeur.nom); return f ? ligneDeResume(f) : null })(),
    classes: avecBibliotheque ? classes : [],
    chapitres: avecBibliotheque ? async () => {
      const l: ChapitreAccueil[] = dans(dossierDuChapitre).map(f => ({ id: f.id, nom: f.nom, ici: f.id === ici?.id, seances: f.id === ici?.id ? app.tableau.seancesDuClasseur().length : f.seances ?? null, isolees: estSeancesIsolees(f) }))
      return isoleesEnQueue(l.sort((a, b) => Number(b.ici) - Number(a.ici) || (fiches.find(f => f.id === b.id)?.ouvert ?? 0) - (fiches.find(f => f.id === a.id)?.ouvert ?? 0)))
    } : null,
    nouvelleSeance: auto => {
      app.nouvelleSeance()
      if (auto) ui.flash.ouvrir()
    },
    seanceIsolee: avecBibliotheque ? { texte: texteSeanceIsolee(nomDuNiveau), faire: auto => void seanceIsolee(app, ui, registre!, fiche!, auto) } : null,
    continuerSeance: auto => {
      ui.message(`Séance ${deLaSeance(seance, Date.now())} : vous la continuez`)
      if (auto) ui.flash.ouvrir()
    },
    autreClasse: (id, auto) => {
      // Le chapitre en cours de ce niveau : le dernier classeur ouvert dans son dossier
      const l = dans(id).sort((a, b) => (b.ouvert - a.ouvert) || (b.modifie - a.modifie))
      if (l.length) partir(l[0], auto)
      else { ui.message(`Le niveau « ${carte.get(id)?.nom ?? ''} » n'a pas encore de chapitre : créez-le.`); nouveauChapitre(id) }
    },
    ouvrirChapitre: (id, auto) => {
      if (id === ici?.id) { app.nouvelleSeance(); if (auto) ui.flash.ouvrir(); return }
      const f = ouvrables.find(x => x.id === id)
      if (f) partir(f, auto)
    },
    nouveauChapitre: () => nouveauChapitre(dossierDuChapitre),
    nouveauClasseurVierge: avecBibliotheque ? () => ui.bibliotheque?.nouveauClasseur({ vierge: true }) : null,
  })
}
