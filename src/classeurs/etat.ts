// =============================================================
// L'ÉTAT DE LA SAUVEGARDE DU CLASSEUR OUVERT (un modèle pur)
// Où est enregistré le classeur qu'on regarde, et depuis quand : dans ce
// navigateur (sa base), sur la clé (le fichier qu'on y écrit tout seul,
// lot 4 C4), sur le Drive (la copie à sens unique, C10), dans un fichier
// enregistré à la main (Ctrl + S). Ce fichier ne fait que le dire, à partir
// d'un EtatSauvegarde que tient la surveillance (surveillance.ts) : les
// lignes du menu ⋯ et du lecteur d'écran, le texte court du bouton du
// classeur (28 caractères au plus), le niveau (le point ambre), le
// bandeau qui demande un clic, et le rappel d'enregistrer.
//
// La règle : être honnête. « Enregistré dans ce navigateur » seulement si
// la base n'a signalé aucune erreur ; jamais « il y a » après un échec
// (l'heure d'une écriture réussie avant n'est plus celle du classeur) ;
// « Seulement dans ce navigateur » quand rien d'autre ne le protège.
//
// Ce fichier est pur (sans DOM ni IndexedDB) : il se teste sous Node.
// =============================================================
import { compteDe } from '../publication/comptes'
import { quandLisible } from '../fichier'
import { heureLisible } from '../revue/bande'
import { POUR_ENREGISTRER, POUR_OUVRIR } from '../navigateur'
import type { CompteDrive } from './demarrage'

const INSECABLE = ' '
const MINUTE = 60_000
const HEURE = 60 * MINUTE

/** La copie du Drive protège encore le classeur pendant… */
export const DRIVE_FRAIS = 15 * MINUTE
/** Le rappel d'enregistrer : après tant de travail non enregistré… */
export const RAPPEL_TRAVAIL = 20 * MINUTE
/** … et tant de temps sans geste (jamais en plein cours) */
export const RAPPEL_SANS_GESTE = 2 * MINUTE
/** Au plus un rappel par heure ; × le fait taire une heure */
export const RAPPEL_SILENCE = HEURE
/** Le texte court du bouton, au plus */
export const COURT_MAX = 28

/** Le fichier de la clé (lot 4 C4) :
 *  - absente : pas d'enregistrement automatique (on peut l'activer) ;
 *  - impossible : ce navigateur ne sait pas écrire seul dans un fichier
 *    (pas de showSaveFilePicker, ou l'écrivain tourne sur le fil principal) ;
 *  - ok, en-cours ; permission : le navigateur attend l'accord (un clic) ;
 *  - erreur : la dernière écriture a échoué (clé retirée, plus de place…) ;
 *  - autre-onglet : un autre onglet ouvert sur ce classeur écrit la clé ;
 *  - conflit : le fichier a changé ailleurs, on n'écrase rien. */
export type EtatCle = 'absente' | 'impossible' | 'ok' | 'en-cours' | 'permission' | 'erreur' | 'autre-onglet' | 'conflit'
/** La copie sur le Drive (lot 4 C10, voir copie-drive.ts) : connexion, la
 *  connexion Google manque ou a expiré (un clic la renouvelle) ;
 *  hors-ligne, pas de réseau ; impossible, la version hors ligne (file://), où
 *  Google ne se connecte pas ; conflit, la copie du Drive n'est pas
 *  remplacée (changée depuis un autre ordinateur, ou ce classeur a perdu
 *  une partie de son histoire depuis elle). ok sans t : connecté, rien
 *  encore sur le Drive (la première copie part bientôt, ou il n'y a rien à
 *  copier) ; jamais « à jour » sans copie faite. */
export type EtatDrive = 'absente' | 'impossible' | 'ok' | 'en-cours' | 'connexion' | 'hors-ligne' | 'erreur' | 'conflit'

/** Une partie du classeur ne se relit plus dans ce navigateur (voir
 *  Tableau.incomplet) : la ligne du navigateur, et le message à l'ouverture */
export const TEXTE_INCOMPLET = `Une partie de ce classeur ne se relit plus dans ce navigateur (une écriture refusée, une autre fois) : elle n'est plus à l'écran ; le reste y est enregistré. Un fichier enregistré avant peut la contenir : ouvrez-le (${POUR_OUVRIR}).`

/** Ce qu'on sait de la sauvegarde du classeur ouvert. Les dates sont en ms.
 *  - navigateur : 'erreur' dès que la base a refusé une écriture (le trou,
 *    voir Tableau.trou) ou ne s'ouvre pas, jusqu'à sa réparation ;
 *    'incomplet' : la base, relue, a une partie qui ne se relit plus (voir
 *    Tableau.incomplet) ; elle enregistre le reste : jamais « Enregistré
 *    dans ce navigateur », mais pas « n'enregistre plus » non plus ;
 *  - erreurBase : ce qu'elle a dit (« place » : plus de place), pour le texte ;
 *  - modifie : le dernier changement ; fichier : le dernier enregistrement
 *    dans un fichier (Ctrl + S) ; nonEnregistreDepuis : le premier
 *    changement après ce fichier (null : rien depuis) ;
 *  - cle, drive : t, la dernière écriture réussie (seulement quand etat
 *    vaut 'ok', ou 'en-cours' pour la clé) ; message : ce qui a échoué ;
 *    drive.enAttente : des changements que le Drive n'a pas encore ;
 *  - cle.depuis (avec 'ok' et 'en-cours') : des changements attendent d'être
 *    écrits sur la clé, depuis ce moment (le premier) ; la clé n'a pas encore
 *    le dernier trait, le texte court le dit ;
 *  - cle.pasEncoreEcrit : le fichier de la clé n'a encore rien de ce
 *    classeur (choisi vide, et aucune écriture n'a encore réussi) : il ne
 *    protège rien. Sans t ni pasEncoreEcrit, le fichier est celui qu'on
 *    connaît (le classeur a été ouvert depuis lui, sans changement depuis) ;
 *  - drive.ailleurs : la dernière copie est sur un autre compte Google que
 *    celui qui est connecté (son adresse, son heure) ; t est alors absent
 *    (rien encore sur le compte connecté), et courriel est le compte connecté,
 *    où ira la prochaine ;
 *  - cle.actions : ce que proposent la ligne de la clé et son bandeau
 *    quand elle a échoué ou refuse d'écraser (Choisir un autre fichier…,
 *    Remplacer quand même : voir cle.ts) ; rien : pas de bandeau. */
export interface EtatSauvegarde {
  navigateur: 'ok' | 'erreur' | 'incomplet'
  erreurBase?: 'place' | 'autre' | 'fermee' | 'indisponible'
  modifie: number | null
  fichier: number | null
  nonEnregistreDepuis: number | null
  cle: { etat: EtatCle; t?: number; nom?: string; message?: string; actions?: ActionEtat[]; depuis?: number; pasEncoreEcrit?: boolean }
  drive: { etat: EtatDrive; t?: number; compte?: CompteDrive; courriel?: string; message?: string; enAttente?: boolean; actions?: ActionEtat[]; ailleurs?: { courriel: string; t: number } }
}

/** Ce qu'une ligne propose de faire (un bouton) : les morceaux qui savent
 *  le faire s'inscrivent (l'interface ne montre que ceux-là) */
export type ActionEtat = 'enregistrer' | 'reprendre-cle' | 'activer-cle' | 'connecter-drive' | 'choisir-cle' | 'forcer-cle' | 'ouvrir-cle'
  | 'recuperer-drive' | 'forcer-drive'
export type NiveauEtat = 'ok' | 'info' | 'attention'
/** action : le bouton de la ligne ; plus : d'autres boutons après lui */
export interface LigneEtat { texte: string; niveau: NiveauEtat; action?: ActionEtat; plus?: ActionEtat[]; quoi: 'navigateur' | 'cle' | 'drive' | 'fichier' }
export interface TexteEtat { lignes: LigneEtat[]; court: string; niveau: NiveauEtat; action?: ActionEtat }

/** La clé protège le classeur : elle l'a (une écriture réussie, ou le
 *  fichier dont il vient), et elle écrit (à jour, ou en train d'écrire la
 *  suite), ou c'est l'autre onglet ouvert sur lui qui l'écrit. Pas un
 *  fichier choisi où rien ne s'est encore écrit. */
export function cleProtege(c: EtatSauvegarde['cle']): boolean {
  if (c.etat === 'autre-onglet') return true
  return (c.etat === 'ok' || c.etat === 'en-cours') && !c.pasEncoreEcrit
}

/** Une sauvegarde automatique protège le classeur : la clé (voir
 *  cleProtege), ou la copie du Drive faite il y a moins de 15 minutes. Le
 *  navigateur seul ne compte pas : il peut tout oublier (un poste remis à
 *  zéro). */
export function protege(e: EtatSauvegarde, maintenant: number): boolean {
  if (cleProtege(e.cle)) return true
  return e.drive.etat === 'ok' && e.drive.t !== undefined && maintenant - e.drive.t < DRIVE_FRAIS
}

/** « à l'instant » (moins d'une minute), « il y a 7 min » (moins d'une
 *  heure), sinon « aujourd'hui à 14 h 05 », « hier à 9 h 30 »… */
export function ilYA(t: number, maintenant: number): string {
  const d = maintenant - t
  if (d < MINUTE) return 'à l\'instant'
  if (d < HEURE) return `il y a ${Math.floor(d / MINUTE)}${INSECABLE}min`
  return quandLisible(t, maintenant)
}

/** La même chose, assez courte pour le bouton : « à 14 h 05 » aujourd'hui,
 *  « hier à 9 h 30 », « le 7 octobre », « le 30/09/2025 » une autre année */
export function ilYACourt(t: number, maintenant: number): string {
  const d = maintenant - t
  if (d < HEURE) return ilYA(t, maintenant)
  const midi = (x: number) => { const j = new Date(x); j.setHours(12, 0, 0, 0); return j.getTime() }
  const jours = Math.round((midi(maintenant) - midi(t)) / 86_400_000)
  if (jours === 0) return `à ${heureLisible(t)}`
  if (jours === 1) return `hier à ${heureLisible(t)}`
  const a = new Date(t), b = new Date(maintenant)
  if (a.getFullYear() === b.getFullYear()) return `le ${a.getDate() === 1 ? '1er' : a.getDate()} ${MOIS[a.getMonth()]}`
  return `le ${String(a.getDate()).padStart(2, '0')}/${String(a.getMonth() + 1).padStart(2, '0')}/${a.getFullYear()}`
}
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « 25 min », « 1 h 10 », « 2 h » */
function duree(ms: number): string {
  const min = Math.max(1, Math.floor(ms / MINUTE))
  if (min < 60) return `${min}${INSECABLE}min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}${INSECABLE}h${INSECABLE}${String(m).padStart(2, '0')}` : `${h}${INSECABLE}h`
}

const sansPoint = (m: string) => m.trim().replace(/[.\s]+$/, '')
/** Le bouton d'une ligne et les suivants, d'après une liste d'actions */
const actionsDe = (a?: ActionEtat[]): { action?: ActionEtat; plus?: ActionEtat[] } => a?.length ? { action: a[0], plus: a.slice(1) } : {}
/** Le nom du Drive : « Drive personnel », « Drive du lycée » ; « Drive » si l'on ne sait pas */
const nomDrive = (c?: CompteDrive) => (c && compteDe(c)?.nom) || 'Drive'

/** Ce que l'état dit, dans l'ordre : le navigateur, la clé, le Drive, le
 *  fichier enregistré à la main. rappel : le rappel d'enregistrer est dû
 *  (voir rappelDu) ; la ligne du fichier passe alors en attention. */
export function texteEtat(e: EtatSauvegarde, maintenant: number, o: { rappel?: boolean } = {}): TexteEtat {
  const lignes: LigneEtat[] = []
  const laCleProtege = cleProtege(e.cle)

  // ----- Le navigateur -----
  if (e.navigateur === 'ok') lignes.push({ quoi: 'navigateur', texte: 'Enregistré dans ce navigateur', niveau: 'ok' })
  else if (e.navigateur === 'incomplet') lignes.push({ quoi: 'navigateur', niveau: 'attention', texte: TEXTE_INCOMPLET })
  else {
    lignes.push({
      quoi: 'navigateur', niveau: 'attention', action: 'enregistrer',
      texte: e.erreurBase === 'indisponible'
        ? `Ce navigateur n'enregistre pas ce classeur (son stockage est refusé ou plein) : enregistrez-le dans un fichier (${POUR_ENREGISTRER}).`
        : `Ce navigateur n'enregistre plus ce classeur (plus de place ?) : enregistrez-le dans un fichier (${POUR_ENREGISTRER}).`,
    })
  }

  // ----- La clé -----
  const c = e.cle
  switch (c.etat) {
    case 'ok': {
      // Jamais « à jour » sans que la clé ait ce classeur, ni l'heure de la
      // dernière écriture seule quand le dernier trait n'y est pas encore
      const ou = `Sur la clé${c.nom ? ` (${c.nom})` : ''}`
      if (c.pasEncoreEcrit) lignes.push({ quoi: 'cle', niveau: 'info', texte: `${ou} : pas encore écrit (la première écriture part bientôt)` })
      else if (c.depuis !== undefined) lignes.push({ quoi: 'cle', niveau: 'ok', texte: `${ou} : pas encore à jour, les derniers changements partent bientôt${c.t !== undefined ? ` (dernière écriture ${ilYA(c.t, maintenant)})` : ''}` })
      else lignes.push({ quoi: 'cle', niveau: 'ok', texte: `${ou} : ${c.t !== undefined ? ilYA(c.t, maintenant) : 'à jour'}` })
      break
    }
    case 'en-cours': lignes.push({ quoi: 'cle', niveau: 'ok', texte: 'Sur la clé : enregistrement…' }); break
    case 'permission':
      lignes.push({ quoi: 'cle', niveau: 'attention', action: 'reprendre-cle', texte: 'Sur la clé : en pause, le navigateur attend votre accord' })
      break
    case 'erreur':
      lignes.push({ quoi: 'cle', niveau: 'attention', ...actionsDe(c.actions), texte: `Sur la clé : ${sansPoint(c.message || 'l\'enregistrement a échoué')}` })
      // Vrai seulement si le navigateur, lui, garde tout
      if (e.navigateur === 'ok') lignes.push({ quoi: 'cle', niveau: 'info', texte: 'Rien n\'est perdu : le classeur est dans ce navigateur ; l\'enregistrement reprendra dès que possible.' })
      break
    case 'autre-onglet':
      lignes.push({ quoi: 'cle', niveau: 'info', texte: 'Sur la clé : c\'est l\'autre onglet ouvert sur ce classeur qui enregistre' })
      break
    case 'conflit':
      lignes.push({ quoi: 'cle', niveau: 'attention', ...actionsDe(c.actions), texte: c.message || 'Sur la clé : le fichier a changé ailleurs, il n\'est pas écrasé' })
      break
    case 'absente':
      // message : le fichier choisi n'a pas survécu au rechargement (un
      // navigateur qui ne garde pas les fichiers choisis, ou un classeur créé
      // avec la case de la clé dont la poignée ne s'est pas rangée) : la clé
      // n'enregistre plus, il faut y regarder (lot 4 C5 : le bandeau le dit)
      lignes.push({ quoi: 'cle', niveau: c.message ? 'attention' : 'info', action: 'activer-cle', texte: c.message ? `Sur la clé : ${sansPoint(c.message)}` : 'Pas d\'enregistrement automatique sur une clé' })
      break
    case 'impossible':
      lignes.push({ quoi: 'cle', niveau: 'info', texte: `Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (${POUR_ENREGISTRER}) de temps en temps.` })
      break
  }

  // ----- Le Drive -----
  const d = e.drive
  // Une copie qui attend ne compte que si rien d'autre ne protège et qu'il
  // y a quelque chose à copier
  const driveCompte = !laCleProtege && !!d.enAttente
  switch (d.etat) {
    case 'ok':
      // La dernière copie est sur un autre compte Google : on dit lequel, et
      // où ira la prochaine (le compte connecté n'a encore rien)
      if (d.ailleurs) {
        lignes.push({ quoi: 'drive', niveau: 'info', texte: `Sur le ${nomDrive(d.compte)} : dernière copie sur ${d.ailleurs.courriel} (${ilYA(d.ailleurs.t, maintenant)}) ; connecté avec ${d.courriel || 'un autre compte'} : la prochaine ira là` })
        break
      }
      lignes.push({ quoi: 'drive', niveau: 'ok', texte: `Sur le ${nomDrive(d.compte)}${d.courriel ? ` (${d.courriel})` : ''} : ${d.t !== undefined ? ilYA(d.t, maintenant) : d.enAttente ? 'la première copie part bientôt' : 'rien à copier pour l\'instant'}` })
      break
    case 'en-cours': lignes.push({ quoi: 'drive', niveau: 'ok', texte: 'Sur le Drive : copie en cours…' }); break
    case 'connexion':
      // Le bouton seulement quand une copie attend (sinon « Copie sur le
      // Drive… », au menu ⋯, s'y connecte : le menu reste celui d'avant)
      lignes.push({ quoi: 'drive', niveau: driveCompte ? 'attention' : 'info', ...(d.enAttente ? { action: 'connecter-drive' as const } : {}), texte: 'Sur le Drive : en attente de la connexion Google' })
      break
    case 'hors-ligne': lignes.push({ quoi: 'drive', niveau: 'info', texte: 'Sur le Drive : hors connexion, la copie partira au retour du réseau' }); break
    case 'impossible':
      lignes.push({ quoi: 'drive', niveau: 'info', texte: 'Sur le Drive : seulement depuis la version en ligne (la connexion Google ne marche pas dans la version hors ligne)' })
      break
    case 'absente': lignes.push({ quoi: 'drive', niveau: 'info', texte: 'Pas de copie sur le Drive' }); break
    case 'erreur':
      lignes.push({ quoi: 'drive', niveau: driveCompte ? 'attention' : 'info', ...actionsDe(d.actions), texte: `Sur le Drive : ${sansPoint(d.message || 'la copie a échoué')}` })
      break
    case 'conflit':
      lignes.push({ quoi: 'drive', niveau: 'attention', ...actionsDe(d.actions), texte: d.message || 'Sur le Drive : la sauvegarde a changé ailleurs, elle n\'est pas remplacée' })
      break
  }

  // ----- Le fichier enregistré à la main -----
  lignes.push({
    quoi: 'fichier', niveau: o.rappel ? 'attention' : 'info', action: o.rappel ? 'enregistrer' : undefined,
    texte: e.fichier !== null ? `Dernier enregistrement dans un fichier : ${quandLisible(e.fichier, maintenant)}` : 'Jamais enregistré dans un fichier',
  })
  for (const l of lignes) { if (l.action === undefined) delete l.action; if (!l.plus?.length) delete l.plus }

  // ----- Le texte court : le premier qui s'applique -----
  let court: string
  if (e.navigateur === 'erreur') court = 'Pas enregistré !'
  else if (e.navigateur === 'incomplet') court = 'Une partie ne se relit pas'
  else if (c.etat === 'permission') court = 'Clé en pause'
  else if (c.etat === 'erreur' || c.etat === 'conflit') court = 'Clé : pas à jour'
  else if ((d.etat === 'connexion' || d.etat === 'erreur' || d.etat === 'conflit') && driveCompte) court = 'Drive en attente'
  // Le dernier trait n'est pas encore sur la clé : pas l'heure de la dernière écriture
  else if (c.etat === 'ok' && (c.pasEncoreEcrit || c.depuis !== undefined)) court = 'Clé : pas encore à jour'
  else if (c.etat === 'ok' && c.t !== undefined) court = `Clé : ${ilYACourt(c.t, maintenant)}`
  else if (c.etat === 'ok') court = 'Clé : à jour'
  else if (c.etat === 'en-cours') court = 'Clé : enregistrement…'
  else if (c.etat === 'autre-onglet') court = 'Clé : par l\'autre onglet'
  else if (d.etat === 'ok' && d.t !== undefined) court = `Drive : ${ilYACourt(d.t, maintenant)}`
  else if (e.fichier !== null) court = `Fichier : ${ilYACourt(e.fichier, maintenant)}`
  else court = 'Seulement dans ce navigateur'
  if (court.length > COURT_MAX) court = court.slice(0, COURT_MAX - 1) + '…'

  // ----- Le niveau, et ce qu'il y a d'abord à faire -----
  const alerte = lignes.find(l => l.niveau === 'attention')
  const aJour = protege(e, maintenant) || (e.fichier !== null && e.nonEnregistreDepuis === null)
  const niveau: NiveauEtat = alerte ? 'attention' : aJour ? 'ok' : 'info'
  const r: TexteEtat = { lignes, court, niveau }
  if (alerte?.action) r.action = alerte.action
  return r
}

/** Le rappel d'enregistrer est-il dû ? Rien ne protège le classeur (ni la
 *  clé, ni une copie récente du Drive : Firefox, Safari, l'iPad, mais aussi
 *  Chrome et Edge sans enregistrement automatique, et la version hors ligne,
 *  où le Drive est impossible) ; au moins 20 minutes de travail non
 *  enregistré (du premier changement après le dernier fichier au dernier
 *  changement) ; et 2 minutes sans geste : jamais en plein cours.
 *  depuisGeste : le temps depuis la fin du dernier geste (ms). */
export function rappelDu(e: EtatSauvegarde, maintenant: number, depuisGeste: number): boolean {
  if (protege(e, maintenant) || e.nonEnregistreDepuis === null || e.modifie === null) return false
  return e.modifie - e.nonEnregistreDepuis >= RAPPEL_TRAVAIL && depuisGeste >= RAPPEL_SANS_GESTE
}

/** Le texte du rappel : « Pas encore enregistré dans un fichier depuis 25
 *  min de travail. » ; sur plus d'une journée, la date du premier changement
 *  (« … depuis hier à 14 h 05. ») */
export function texteRappel(e: EtatSauvegarde, maintenant: number): string {
  const debut = e.nonEnregistreDepuis ?? maintenant
  const travail = (e.modifie ?? maintenant) - debut
  const memeJour = new Date(debut).toDateString() === new Date(maintenant).toDateString()
  if (memeJour) return `Pas encore enregistré dans un fichier depuis ${duree(travail)} de travail.`
  return `Pas encore enregistré dans un fichier depuis ${quandLisible(debut, maintenant)}.`
}

/** Pourquoi le bandeau paraît : seulement pour une action qui demande un
 *  clic. 'navigateur' : la base n'enregistre plus (sans ×) ; 'rappel' :
 *  enregistrer dans un fichier ; la clé : 'cle-permission' (le navigateur
 *  attend l'accord, après un rechargement), 'cle-conflit' (le fichier n'est
 *  pas remplacé), 'cle-erreur' (l'écriture a échoué, et un autre fichier
 *  peut la reprendre), 'cle-a-choisir' (le fichier de la clé n'a pas été
 *  gardé par le navigateur : il est à choisir de nouveau). Le Drive (lot 4
 *  C10) : 'drive-conflit' (sa copie n'est pas remplacée : la récupérer, ou
 *  la remplacer quand même), 'drive-connexion' (une copie attend la
 *  connexion Google, et rien d'autre ne protège le classeur). */
export type RaisonBandeau = 'navigateur' | 'rappel' | 'cle-permission' | 'cle-conflit' | 'cle-erreur' | 'cle-a-choisir' | 'drive-conflit' | 'drive-connexion'
export interface Bandeau { raison: RaisonBandeau; texte: string; actions: ActionEtat[]; fermable: boolean }

/** Ce que retient l'interface pour le bandeau : les raisons écartées par ×
 *  (pour la session), et pour le rappel, s'il est à l'écran, quand il a
 *  paru pour la dernière fois, et jusqu'à quand × l'a fait taire ;
 *  driveMontre : le bandeau de la connexion Google est à l'écran (il reste
 *  quand on se remet à écrire, comme le rappel) */
export interface MemoireBandeau {
  ecartes: ReadonlySet<RaisonBandeau>
  rappelMontre: boolean
  dernierRappel: number
  rappelTaitJusqua: number
  driveMontre?: boolean
}

/** Le bandeau à montrer (null : aucun). Le navigateur en erreur passe
 *  avant tout et ne se ferme pas. Puis la clé : en pause (le navigateur
 *  attend l'accord : Reprendre l'enregistrement sur la clé), un fichier
 *  qu'elle ne remplace pas, une écriture qui a échoué (seulement quand
 *  quelque chose peut la reprendre : ses actions), un fichier que le
 *  navigateur n'a pas gardé (à choisir de nouveau) ; × les écarte pour la
 *  session. Le rappel : quand rappelDu le dit, au plus
 *  une fois par heure, jamais pendant l'heure qui suit × ; une fois paru, il
 *  reste (même si l'on se remet à écrire) jusqu'à ce qu'on enregistre ou
 *  qu'on le ferme. Sur Chrome et Edge (la clé possible), il propose aussi
 *  d'enregistrer automatiquement sur la clé (le morceau C4 en fait le bouton). */
export function bandeauDu(e: EtatSauvegarde, maintenant: number, depuisGeste: number, m: MemoireBandeau): Bandeau | null {
  if (e.navigateur === 'erreur') {
    return { raison: 'navigateur', fermable: false, actions: ['enregistrer'], texte: 'Ce navigateur n\'enregistre plus ce classeur.' }
  }
  const c = e.cle
  if (c.etat === 'permission' && !m.ecartes.has('cle-permission')) {
    return { raison: 'cle-permission', fermable: true, actions: ['reprendre-cle'], texte: 'L\'enregistrement sur la clé attend votre accord.' }
  }
  if (c.etat === 'conflit' && c.actions?.length && !m.ecartes.has('cle-conflit')) {
    return { raison: 'cle-conflit', fermable: true, actions: [...c.actions], texte: c.message || 'Le fichier de la clé a changé ailleurs : il n\'est pas remplacé.' }
  }
  if (c.etat === 'erreur' && c.actions?.length && !m.ecartes.has('cle-erreur')) {
    const pourquoi = sansPoint(c.message || '')
    return { raison: 'cle-erreur', fermable: true, actions: [...c.actions], texte: `L'enregistrement sur la clé a échoué${pourquoi ? ` (${pourquoi})` : ''}. Rien n'est perdu.` }
  }
  if (c.etat === 'absente' && c.message && !m.ecartes.has('cle-a-choisir')) {
    return { raison: 'cle-a-choisir', fermable: true, actions: ['activer-cle'], texte: 'Choisissez de nouveau le fichier de la clé : ce navigateur ne l\'a pas gardé.' }
  }
  // Le Drive : sa copie qui n'est pas remplacée (un choix à faire) ; la
  // connexion Google qui manque, seulement quand rien d'autre ne protège le
  // classeur, qu'une copie attend, et après 2 minutes sans geste (le jeton
  // expire environ une heure après la connexion, donc en plein cours :
  // avec la clé à jour, ce n'est qu'une ligne d'information). Jamais de
  // fenêtre Google sans ce clic.
  const d = e.drive
  if (d.etat === 'conflit' && d.actions?.length && !m.ecartes.has('drive-conflit')) {
    return { raison: 'drive-conflit', fermable: true, actions: [...d.actions], texte: d.message || 'La copie du Drive n\'est pas remplacée.' }
  }
  if (d.etat === 'connexion' && d.enAttente && !cleProtege(c) && !m.ecartes.has('drive-connexion') && (m.driveMontre || depuisGeste >= RAPPEL_SANS_GESTE)) {
    return { raison: 'drive-connexion', fermable: true, actions: ['connecter-drive'], texte: 'La copie sur le Drive attend la connexion Google.' }
  }
  if (!m.ecartes.has('rappel')) {
    const encoreDu = !protege(e, maintenant) && e.nonEnregistreDepuis !== null && e.modifie !== null
      && e.modifie - e.nonEnregistreDepuis >= RAPPEL_TRAVAIL
    const peutParaitre = maintenant >= m.rappelTaitJusqua && maintenant >= m.dernierRappel + RAPPEL_SILENCE
    if (m.rappelMontre ? encoreDu : rappelDu(e, maintenant, depuisGeste) && peutParaitre) {
      const actions: ActionEtat[] = ['enregistrer']
      if (e.cle.etat === 'absente') actions.push('activer-cle')
      return { raison: 'rappel', fermable: true, actions, texte: texteRappel(e, maintenant) }
    }
  }
  return null
}

/** L'état en une ligne, pour la bibliothèque (la ligne du classeur ouvert) :
 *  « Enregistré dans ce navigateur · sur la clé il y a 2 min · sur le Drive
 *  il y a 10 min », ou ce qui manque (« jamais enregistré dans un fichier »),
 *  ce qui est en pause (« clé en pause »), ce qui a échoué (« clé : pas à
 *  jour » : jamais « il y a » après un échec). Le fichier enregistré à la
 *  main n'est dit que quand la clé n'écrit pas (c'est elle qui l'a écrit). */
export function resumeEtat(e: EtatSauvegarde, maintenant: number): string {
  const parts: string[] = [e.navigateur === 'ok' ? 'Enregistré dans ce navigateur'
    : e.navigateur === 'incomplet' ? 'Une partie ne se relit plus dans ce navigateur' : 'Ce navigateur n\'enregistre plus ce classeur']
  const c = e.cle, d = e.drive
  let cleEcrit = false
  switch (c.etat) {
    case 'ok':
      if (c.pasEncoreEcrit) { parts.push('clé : pas encore écrite'); break }
      parts.push(c.depuis !== undefined ? 'clé : pas encore à jour' : c.t !== undefined ? `sur la clé ${ilYA(c.t, maintenant)}` : 'sur la clé')
      cleEcrit = true
      break
    case 'en-cours': parts.push('sur la clé : enregistrement…'); cleEcrit = !c.pasEncoreEcrit; break
    case 'autre-onglet': parts.push('sur la clé (par l\'autre onglet)'); cleEcrit = true; break
    case 'permission': parts.push('clé en pause'); break
    case 'erreur': case 'conflit': parts.push('clé : pas à jour'); break
    case 'absente': if (c.message) parts.push('clé : fichier à choisir de nouveau'); break
    case 'impossible': break
  }
  let driveEcrit = false
  switch (d.etat) {
    // Connecté, mais rien encore sur le Drive : on ne le dit pas « sur le Drive »
    case 'ok':
      if (d.t !== undefined) { parts.push(`sur le Drive ${ilYA(d.t, maintenant)}`); driveEcrit = true }
      else if (d.ailleurs) parts.push(`Drive : dernière copie sur ${d.ailleurs.courriel}`)
      else if (d.enAttente) parts.push('Drive : première copie bientôt')
      break
    case 'en-cours': parts.push('sur le Drive : copie en cours…'); driveEcrit = true; break
    case 'connexion': parts.push('Drive en attente de la connexion Google'); break
    case 'hors-ligne': parts.push('Drive hors connexion'); break
    case 'erreur': case 'conflit': parts.push('Drive : pas à jour'); break
    case 'absente': case 'impossible': break
  }
  if (!cleEcrit) {
    if (e.fichier !== null) parts.push(`dans un fichier ${ilYA(e.fichier, maintenant)}`)
    else if (!driveEcrit) parts.push('jamais enregistré dans un fichier')
  }
  return parts.join(' · ')
}

/** Avant de quitter ce classeur pour un autre (la bibliothèque) : le rappel
 *  d'enregistrer est-il dû ? Comme rappelDu (rien ne le protège, au moins
 *  20 minutes de travail non enregistré dans un fichier), mais sans
 *  attendre 2 minutes sans geste : on part, ce n'est pas le plein cours. */
export function rappelAuDepart(e: EtatSauvegarde, maintenant: number): boolean {
  if (protege(e, maintenant) || e.nonEnregistreDepuis === null || e.modifie === null) return false
  return e.modifie - e.nonEnregistreDepuis >= RAPPEL_TRAVAIL
}

/** Le nom d'une erreur, même enveloppée (lib0 fait new Error(erreurDeLaBase) :
 *  son nom est « Error », son message commence par « QuotaExceededError: ») */
export function nomDErreur(r: unknown): string {
  const x = r as { name?: unknown; message?: unknown } | null
  if (!x || typeof x !== 'object') return ''
  if (typeof x.name === 'string' && x.name && x.name !== 'Error') return x.name
  return /^([A-Za-z]+Error)\b/.exec(typeof x.message === 'string' ? x.message : '')?.[1] ?? (typeof x.name === 'string' ? x.name : '')
}
