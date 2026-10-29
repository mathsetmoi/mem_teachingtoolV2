// =============================================================
// « DÉPLACER LE CLASSEUR… » : LE FICHIER SUIT (lot 18)
// Un classeur = un fichier .memc à un seul endroit (etablissements.ts,
// ranger.ts). Quand le classeur change de place dans la bibliothèque (le menu
// ⋯ du classeur, « Déplacer vers… » d'une carte, un glisser, « Annuler »),
// son fichier change de place avec lui : « LFB classeurs › 2 › Fractions »
// devient « LFB classeurs › 4 › Fractions ». La règle, dans l'ordre, et
// jamais une perte :
// 1. l'accord d'écrire dans le dossier cible, dans le clic ; refusé, le
//    classeur bouge dans la bibliothèque, le fichier reste, on le dit ;
// 2. le nouveau fichier écrit EN ENTIER au nouvel endroit, avec les garde-fous
//    d'une écriture de la clé (jamais depuis une base trouée, jamais si ce
//    classeur a perdu une partie de l'histoire déjà écrite, jamais par-dessus
//    un fichier plus riche), puis relu ; pour le classeur OUVERT dans cet
//    onglet, c'est sa clé qui le fait (EnregistrementCle.deplacerVers : elle
//    tient le verrou et sa minuterie, et écrit ensuite dans le nouveau
//    fichier) ; pour un classeur fermé (une carte), sous le verrou Web Lock
//    du classeur (s'il est pris, un onglet l'a ouvert : rien ne bouge) ;
// 3. l'ancien fichier EXAMINÉ avant d'être retiré : son en-tête porte cet id
//    et la date écrite d'ici, sinon il a changé ailleurs, il reste et on le
//    dit ; puis retiré de l'ancien dossier du chapitre (retrouvé par le
//    chemin noté dans la fiche, fiche.cle.chemin) ;
// 4. les .mem de l'ancien dossier du chapitre (les replays publiés, les
//    fichiers séance) déplacés de même : écrits, relus, puis retirés ; un
//    échec les laisse et le dit ;
// 5. l'ancien dossier du chapitre retiré seulement s'il est vide.
// Jamais : retirer avant la fin de l'écriture ; retirer un fichier choisi à la
// main (sans chemin dans la fiche : il reste, on le dit) ; retirer un fichier
// plus riche ; écrire hors des garde-fous.
// Quand la nouvelle place n'est pas connue (la racine, un niveau pas rangé),
// le classeur bouge dans la bibliothèque, le fichier reste où il est, le
// message le dit. Un classeur sans fichier qui arrive dans un niveau rangé
// reçoit son fichier à sa nouvelle place (ranger.donnerSonFichier).
// « Un autre dossier de l'ordinateur… » (le menu ⋯) : le professeur choisit
// lui-même le dossier de ce classeur ; le fichier y va directement (chemin =
// [dossier]), avec ses .mem ; le classeur ne bouge pas dans la bibliothèque,
// et ce dossier devient celui des replays de Publier.
//
// Le début de ce fichier (le plan d'un déplacement et ses textes) est pur :
// il se teste sous Node.
// =============================================================
import type { ActionMessage } from '../app'
import type { Bibliotheque } from './bibliotheque'
import type { FicheClasseur, FicheDossier, InfosClasseur } from './demarrage'
import type { Registre } from './registre'
import type { EnregistrementCle, PoigneeFichier, ResultatDeplacement } from './cle'
import { VERROU_CLE, ecrireDans, enteteDe, fichierPourDeplacer, memeFichier, raisonCle } from './cle'
import type { Emplacement } from './emplacements'
import { emplacementDe, emplacements, nomDeFichierLibre, reglagePoignee, sousDossiers } from './emplacements'
import type { Etablissement } from './etablissements'
import { cheminLisible, etablissements } from './etablissements'
import type { PoigneeDossier } from './ordinateur'
import { accordDuDossier, choisirUnDossier, choisitUnDossier } from './ordinateur'
import { remontee } from './arbre'
import { destinations, objetClasseur } from './deplacer'
import { ouvrirDeplacerVers } from './vers'
import { fabriquerFichier } from './ecrivain'
import { contient } from './vecteurs'
import { EXTENSION_TABLEAU, nomSur } from '../fichier'
import { EXTENSION } from '../publication/comptes'
import type { ReglageReplay } from '../publication/replay-dossier'
import { lireReglage, retenirReglage } from '../publication/replay-dossier'
import { POUR_OUVRIR } from '../navigateur'

// ---------- Le plan d'un déplacement (pur) ----------

/** Ce qu'il advient du fichier quand le classeur va dans `cible` :
 *  - suit : un fichier rangé par l'outil, et la nouvelle place est connue ;
 *  - reste-choisi-a-la-main : un fichier choisi à la main (showSaveFilePicker,
 *    sans chemin dans la fiche) : il ne bouge jamais ;
 *  - reste-pas-range : la cible est la racine, ou un niveau pas rangé ;
 *  - reste-meme-place : la nouvelle place est celle d'aujourd'hui ;
 *  - recoit-un-fichier : pas de fichier, et la cible est un niveau rangé ;
 *  - sans-fichier : pas de fichier, et rien à en dire. */
export type GenrePlan = 'suit' | 'reste-choisi-a-la-main' | 'reste-pas-range' | 'reste-meme-place' | 'recoit-un-fichier' | 'sans-fichier'

/** Une place rangée par l'outil : l'emplacement du niveau, son établissement
 *  (s'il existe encore), le chemin lisible jusqu'au dossier du chapitre
 *  (« LFB classeurs › 2 › Fractions ») et les dossiers sous celui du niveau
 *  (« Fractions », ou « Géométrie › Fractions ») */
export interface PlaceRangee { emplacement: Emplacement; etablissement: Etablissement | null; chemin: string[]; sous: string[] }

/** D'où vient le fichier d'un classeur rangé par l'outil : le chemin noté dans
 *  la fiche ; emplacement et sous : le dossier du niveau d'avant et les
 *  dossiers sous lui, quand on les retrouve (sinon l'ancien fichier ne peut
 *  pas être retiré : il reste, on le dit) */
export interface AnciennePlace { chemin: string[]; emplacement: Emplacement | null; sous: string[] | null }

export interface PlanDeDeplacement {
  genre: GenrePlan
  ancien?: AnciennePlace
  nouveau?: PlaceRangee
  /** La ligne sous l'arbre de la fenêtre (vide : rien à dire) */
  texte: string
}

/** Ce que le plan lit de l'index */
export interface DonneesPlan { emplacements: readonly Emplacement[]; dossiers: readonly FicheDossier[]; etablissements?: readonly Etablissement[] }

/** Où irait le fichier d'un classeur nommé `nom` rangé dans ce dossier de la
 *  bibliothèque : le même chemin que relierLesClasseurs et dossierDuChapitre
 *  (l'établissement, le dossier du niveau, les sous-dossiers, le dossier du
 *  chapitre) ; null si le niveau n'est pas rangé (ou la racine) */
export function placeRangee(dossierId: string | null, nom: string, o: DonneesPlan): PlaceRangee | null {
  if (dossierId === null) return null
  const e = emplacementDe(dossierId, 'ordinateur', o.emplacements, o.dossiers)
  if (!e) return null
  const etab = e.etablissement ? o.etablissements?.find(x => x.id === e.etablissement) ?? null : null
  const sous = [...sousDossiers(dossierId, e.dossier, o.dossiers).map(n => nomSur(n, { repli: 'Dossier' })), nomSur(nom)]
  return { emplacement: e, etablissement: etab, chemin: [...(etab ? [etab.nom] : []), e.nom, ...sous], sous }
}

const memeChemin = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((s, i) => s === b[i])

/** Le plan : ce qu'il advient du fichier de `fiche` (rangée là où elle est)
 *  si elle va dans `cible` (null : la racine), et la ligne qui le dit. Voir
 *  GenrePlan. */
export function planDeDeplacement(o: { fiche: FicheClasseur; cible: string | null } & DonneesPlan): PlanDeDeplacement {
  const f = o.fiche
  const nouveau = placeRangee(o.cible, f.nom, o)
  if (!f.cle) {
    if (nouveau) return { genre: 'recoit-un-fichier', nouveau, texte: `Il recevra son fichier dans « ${cheminLisible(nouveau.chemin)} », écrit tout seul.` }
    return { genre: 'sans-fichier', texte: '' }
  }
  if (!f.cle.chemin?.length) return { genre: 'reste-choisi-a-la-main', texte: `« ${f.cle.nom} » a été choisi à la main : il reste où il est.` }
  const chemin = f.cle.chemin
  // L'ancien : le dossier du niveau d'avant, si le chemin noté commence bien par lui
  const ancien: AnciennePlace = { chemin, emplacement: null, sous: null }
  const avant = placeRangee(f.dossier, f.nom, o)
  if (avant) {
    const n = avant.chemin.length - avant.sous.length
    if (chemin.length > n && avant.chemin.slice(0, n).every((s, i) => chemin[i] === s)) { ancien.emplacement = avant.emplacement; ancien.sous = chemin.slice(n) }
  }
  if (!nouveau) {
    if (o.cible === null) return { genre: 'reste-pas-range', ancien, texte: 'La racine de la bibliothèque n\'a pas de dossier : le fichier reste où il est.' }
    const chaine = remontee(o.cible, o.dossiers)
    const niveau = chaine.length ? chaine[chaine.length - 1].nom : ''
    return { genre: 'reste-pas-range', ancien, texte: `Le niveau « ${niveau} » n'est pas rangé dans un dossier : le fichier reste où il est.` }
  }
  if (memeChemin(nouveau.chemin, chemin)) return { genre: 'reste-meme-place', ancien, nouveau, texte: `Son fichier est déjà dans « ${cheminLisible(chemin)} ».` }
  return { genre: 'suit', ancien, nouveau, texte: `Son fichier ira dans « ${cheminLisible(nouveau.chemin)} ». L'ancien sera retiré une fois le nouveau écrit.` }
}

// ---------- Les textes des messages (purs) ----------

/** Le fichier n'a pas été déplacé : pourquoi (la phrase entière) */
export function texteEchec(r: ResultatDeplacement, f: { nom: string; cle?: { nom: string; chemin?: string[] } }, cible: { nom: string; chemin: string[] }): string {
  switch (r.r) {
    case 'conflit': return `Le fichier « ${f.cle?.nom ?? nomSur(f.nom) + EXTENSION_TABLEAU} » a des changements que ce classeur n'a pas : il n'est pas déplacé. Ouvrez-le d'abord (${POUR_OUVRIR}).`
    case 'plus-riche': return `Le fichier « ${r.raison} » déjà dans « ${cheminLisible(cible.chemin)} » a des changements que ce classeur n'a pas : il n'est pas déplacé. Ouvrez-le d'abord (${POUR_OUVRIR}).`
    case 'autre-onglet': return 'Son fichier n\'a pas été déplacé : un autre onglet est ouvert sur ce classeur. Fermez-le, puis recommencez.'
    case 'permission': return `Son fichier n'a pas été déplacé : le navigateur n'a pas permis d'écrire dans « ${cible.nom} ».`
    case 'erreur': return `Son fichier n'a pas été déplacé : ${r.raison}.`
    default: return `Son fichier reste dans ${f.cle?.chemin?.length ? `« ${cheminLisible(f.cle.chemin)} »` : f.cle ? `« ${f.cle.nom} »` : 'ce navigateur'}.`
  }
}

/** « 2 fichiers .mem » */
const desMem = (n: number) => `${n} fichier${n > 1 ? 's' : ''} .mem`

// ---------- Le déplacement lui-même ----------

/** Ce que le déplaceur demande à qui le construit (main.ts) : la clé de
 *  l'onglet (null : la bibliothèque seule, ou un navigateur qui n'écrit pas
 *  tout seul dans un fichier), le classeur ouvert ici */
export interface HoteDeplacer {
  registre: Registre
  bibliotheque: Bibliotheque
  cle: EnregistrementCle | null
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
  classeur(): InfosClasseur | null
  /** Avant de fabriquer le fichier d'un classeur depuis sa base : celui de
   *  cet onglet écrit d'abord ce qui attend */
  avantDEcrire?: (f: FicheClasseur) => Promise<void>
}

/** Où va le fichier : le dossier du chapitre (ouvert, l'accord donné) et le
 *  chemin à noter dans la fiche */
interface Cible { dossier: PoigneeDossier; chemin: string[] }
/** D'où il vient : l'ancien dossier du chapitre, son parent (null : un dossier
 *  choisi à la main, qu'on ne retire jamais) et son chemin lisible */
interface Ancien { dossier: PoigneeDossier; parent: PoigneeDossier | null; chemin: string[] }

const raisonDe = (e: unknown) => (e instanceof Error ? e.message.trim().replace(/\.$/, '') : '') || 'erreur inconnue'
const nomErreur = (e: unknown) => (e as { name?: string } | null)?.name

/** Une poignée de dossier relue de l'index, ou rien */
const poigneeValable = (x: unknown): PoigneeDossier | null =>
  x && typeof (x as PoigneeDossier).getDirectoryHandle === 'function' ? x as PoigneeDossier : null

/** Le même dossier ? (isSameEntry ; sans lui, on ne sait pas : non) */
async function memeDossier(a: PoigneeDossier, b: unknown): Promise<boolean> {
  try { return typeof a.isSameEntry === 'function' && !!b && await a.isSameEntry(b) } catch { return false }
}

/** Le dossier au bout de ces segments sous `racine` ; creer : fait ceux qui
 *  manquent ; sinon une erreur (NotFoundError) */
async function descendre(racine: PoigneeDossier, segments: readonly string[], creer: boolean): Promise<PoigneeDossier> {
  let ici = racine
  for (const n of segments) ici = await ici.getDirectoryHandle(n, { create: creer })
  return ici
}

export class DeplacerClasseur {
  /** Un déplacement de fichier en cours (un seul à la fois) */
  private occupe = false

  constructor(private h: HoteDeplacer) {}

  private get registre() { return this.h.registre }
  /** Ce classeur est celui de cet onglet */
  private estIci(f: { id: string }): boolean { return this.h.classeur()?.id === f.id }

  /** Ce que le plan lit de l'index, lu une fois */
  private async donnees(): Promise<DonneesPlan> {
    const [e, d, t] = await Promise.all([emplacements(this.registre), this.registre.dossiers(), etablissements(this.registre)])
    return { emplacements: e, dossiers: d, etablissements: t }
  }

  /** La ligne sous l'arbre de la fenêtre « Déplacer vers… », pour chaque
   *  destination (l'index lu une fois) */
  async lignesPour(f: FicheClasseur): Promise<(id: string | null) => string> {
    const o = await this.donnees().catch(() => null)
    if (!o) return () => ''
    return id => planDeDeplacement({ fiche: f, cible: id, ...o }).texte
  }

  // =============================================================
  // LA FENÊTRE, POUR LE CLASSEUR DE L'ONGLET (le menu ⋯)
  // =============================================================

  /** « Déplacer le classeur… » : la fenêtre « Déplacer « Fractions » vers… »
   *  (l'arbre des dossiers, la ligne qui dit où ira le fichier, « Un autre
   *  dossier de l'ordinateur… », et « Ne plus l'enregistrer dans un fichier »
   *  pour un fichier choisi à la main) ; le choix fait
   *  Bibliotheque.deplacerVers, qui fait suivre le fichier (suivre). */
  async ouvrir(): Promise<void> {
    const ici = this.h.classeur()
    if (!ici) return
    if (document.querySelector('dialog[open]') || this.occupe) { this.h.message('Fermez d\'abord la fenêtre ouverte.'); return }
    const f = await this.registre.classeur(ici.id).catch(() => undefined)
    if (!f || f.corbeille) { this.h.message('Ce classeur n\'est plus dans la bibliothèque.'); return }
    const o = await this.donnees().catch(() => null)
    if (!o) { this.h.message('La bibliothèque des classeurs ne se lit pas dans ce navigateur.'); return }
    if (document.querySelector('dialog[open]')) return
    const cle = this.h.cle
    const aUnFichier = !!f.cle && !!cle?.actif
    ouvrirDeplacerVers({
      titre: `Déplacer « ${f.nom} » vers…`,
      destinations: destinations(objetClasseur(f), o.dossiers),
      ligne: id => planDeDeplacement({ fiche: f, cible: id, ...o }).texte,
      // Un dossier choisi par le professeur, pour ce classeur seul (Chrome, Edge)
      autre: aUnFichier && choisitUnDossier() ? {
        libelle: 'Un autre dossier de l\'ordinateur…',
        aide: 'Vous choisissez vous-même le dossier de ce classeur (par exemple « 2_13_Proba » dans le Drive du LFB) : seul ce classeur y va, avec ses .mem.',
        faire: () => void this.versUnAutreDossier(f),
      } : undefined,
      // Un fichier choisi à la main : on peut aussi cesser de l'écrire (il a
      // sa place, sinon : l'entrée du menu ⋯ a disparu)
      secondaire: aUnFichier && !f.cle?.chemin?.length ? { libelle: 'Ne plus l\'enregistrer dans un fichier', faire: () => void cle!.arreter() } : undefined,
      choisir: id => void this.h.bibliotheque.deplacerVers(f.id, id),
    })
  }

  // =============================================================
  // LE FICHIER QUI SUIT (après le déplacement dans la bibliothèque)
  // =============================================================

  /** La bibliothèque vient de ranger la fiche `f` de `avant` dans `cible`
   *  (« Déplacer vers… », un glisser, « Annuler ») : son fichier suit, reste,
   *  ou arrive, selon le plan. Rend la phrase à ajouter au message (vide :
   *  rien à dire). Appelée dans le clic : l'accord d'écrire peut être demandé. */
  async suivre(f: FicheClasseur, avant: string | null, cible: string | null): Promise<string> {
    const o = await this.donnees().catch(() => null)
    if (!o) return ''
    const plan = planDeDeplacement({ fiche: { ...f, dossier: avant }, cible, ...o })
    switch (plan.genre) {
      case 'sans-fichier': return ''
      case 'reste-meme-place': return plan.texte
      case 'reste-choisi-a-la-main': return `Son fichier « ${f.cle?.nom ?? ''} » (choisi à la main) reste où il est.`
      case 'reste-pas-range': return `Son fichier reste dans « ${cheminLisible(plan.ancien!.chemin)} ».`
      case 'recoit-un-fichier': return this.donner(f)
      case 'suit': return this.suit(f, plan)
    }
  }

  /** Un classeur sans fichier qui arrive dans un niveau rangé : il reçoit son
   *  fichier à sa nouvelle place (ranger.donnerSonFichier) ; celui de cet
   *  onglet : sa clé démarre dessus */
  private async donner(f: FicheClasseur): Promise<string> {
    const ranger = this.h.bibliotheque.ranger
    if (!ranger) return ''
    let dit = ''
    const c = await ranger.donnerSonFichier(f, { geste: true, dire: t => { dit += (dit ? ' ' : '') + t } })
    if (!c) return dit
    if (this.estIci(f) && this.h.cle) await this.h.cle.resynchroniser().catch(() => {})
    if (c.ok) return c.ok
    const relu = await this.registre.classeur(f.id).catch(() => undefined)
    return `Son fichier est écrit dans « ${relu?.cle?.chemin?.length ? cheminLisible(relu.cle.chemin) : c.nom} ».`
  }

  /** Le fichier suit (le plan dit où) : le dossier du niveau retrouvé, l'accord
   *  dans le clic, le dossier du chapitre créé, puis le déplacement */
  private async suit(f: FicheClasseur, plan: PlanDeDeplacement): Promise<string> {
    const n = plan.nouveau!, a = plan.ancien!
    const niveau = cheminLisible(n.chemin.slice(0, n.chemin.length - n.sous.length))
    const racine = poigneeValable(await this.registre.reglage(reglagePoignee(n.emplacement.id)).catch(() => undefined))
    if (!racine) return `Son fichier n'a pas été déplacé : ce navigateur ne retrouve plus le dossier « ${niveau} » (menu ⋯ → Mes emplacements).`
    if (!await accordDuDossier(racine, true).catch(() => false)) return `Son fichier n'a pas été déplacé : le navigateur n'a pas permis d'écrire dans « ${racine.name} ».`
    if (this.occupe) return 'Son fichier n\'a pas été déplacé : un autre déplacement est en cours.'
    this.occupe = true
    try {
      this.h.message(`Déplacement du fichier de « ${f.nom} »…`)
      let dossier: PoigneeDossier
      try { dossier = await descendre(racine, n.sous, true) } catch (e) { return `Son fichier n'a pas été déplacé : le dossier « ${cheminLisible(n.chemin)} » n'a pas pu être créé (${raisonDe(e)}).` }
      const ancien = await this.ancienDossier(f, a)
      const r = await this.deplacerLeFichier(f, { dossier, chemin: n.chemin }, ancien)
      if (!r.ok) return r.texte
      return `Son fichier aussi, dans « ${cheminLisible(n.chemin)} »${r.mem ? ` (avec ${desMem(r.mem)})` : ''}.${r.reste ? ' ' + r.reste : ''}`
    } finally {
      this.occupe = false
    }
  }

  /** L'ancien dossier du chapitre, d'après le chemin noté dans la fiche : sous
   *  le dossier du niveau d'avant (sans rien créer), ou le dossier choisi par
   *  « Un autre dossier de l'ordinateur… » (celui des replays, retenu pour ce
   *  classeur) ; null si on ne le retrouve pas (l'ancien fichier restera) */
  private async ancienDossier(f: FicheClasseur, a: AnciennePlace): Promise<Ancien | null> {
    if (a.emplacement && a.sous?.length) {
      const racine = poigneeValable(await this.registre.reglage(reglagePoignee(a.emplacement.id)).catch(() => undefined))
      if (racine && (await accordDuDossier(racine, false).catch(() => false) || await accordDuDossier(racine, true).catch(() => false))) {
        try {
          const parent = await descendre(racine, a.sous.slice(0, -1), false)
          const dossier = await parent.getDirectoryHandle(a.sous[a.sous.length - 1])
          return { dossier, parent, chemin: a.chemin }
        } catch { return null }
      }
      return null
    }
    if (a.chemin.length === 1) {
      const r = await lireReglage(this.registre, f.id).catch(() => ({} as ReglageReplay))
      const d = r.poignee ? poigneeValable(r.poignee) : null
      if (d && d.name === a.chemin[0] && await accordDuDossier(d, false).catch(() => false)) return { dossier: d, parent: null, chemin: a.chemin }
    }
    return null
  }

  /** Le cœur : le nouveau fichier écrit et vérifié (par la clé de l'onglet,
   *  ou sous le verrou), puis l'ancien examiné et retiré, les .mem déplacés,
   *  l'ancien dossier retiré s'il est vide, le dossier des replays qui suit.
   *  Rend ce qui s'est passé : ok et la phrase d'un échec ; mem (les .mem
   *  déplacés) et reste (ce qui est resté, dit) */
  private async deplacerLeFichier(f: FicheClasseur, cible: Cible, ancien: Ancien | null): Promise<{ ok: false; texte: string } | { ok: true; mem: number; reste: string }> {
    const relu = await this.registre.classeur(f.id).catch(() => undefined)
    if (!relu?.cle) return { ok: false, texte: 'Son fichier n\'a pas été déplacé : ce classeur n\'a plus de fichier.' }
    const anciennePoignee = await this.registre.poignee<PoigneeFichier>(f.id).catch(() => undefined)
    const ancienneCle = relu.cle
    const memePlace = ancien ? await memeDossier(ancien.dossier, cible.dossier) : false
    let r: ResultatDeplacement
    if (this.estIci(f)) {
      if (!this.h.cle) return { ok: false, texte: texteEchec({ r: 'rien', raison: '' }, relu, { nom: cible.dossier.name, chemin: cible.chemin }) }
      r = await this.h.cle.deplacerVers(cible.dossier, cible.chemin)
    } else r = await this.deplacerFerme(relu, cible)
    if (r.r !== 'deplace') return { ok: false, texte: texteEchec(r, relu, { nom: cible.dossier.name, chemin: cible.chemin }) }
    // Le même dossier qu'avant (réécrit en place) : rien à retirer, rien à déplacer
    if (memePlace) return { ok: true, mem: 0, reste: '' }
    const reste: string[] = []
    // 3. L'ancien fichier, examiné puis retiré
    if (!r.garde) reste.push('L\'ancien fichier reste : ce navigateur ne garde pas le nouveau après un rechargement.')
    else reste.push(...await this.retirerLAncien(f.id, anciennePoignee, ancienneCle, ancien))
    // 4. Les .mem du chapitre ; 5. l'ancien dossier, s'il est vide
    let mem = 0
    if (ancien) {
      const m = await this.deplacerLesMem(ancien.dossier, cible.dossier)
      mem = m.deplaces
      if (m.restes) reste.push(`${desMem(m.restes)} reste${m.restes > 1 ? 'nt' : ''} dans l'ancien dossier.`)
      if (ancien.parent) await this.retirerSiVide(ancien.parent, ancien.dossier)
      await this.suivreLeDossierRetenu(f.id, ancien.dossier, cible.dossier)
    }
    return { ok: true, mem, reste: reste.join(' ') }
  }

  /** Un classeur fermé (une carte) : sous le verrou Web Lock du classeur (s'il
   *  est pris, un onglet l'a ouvert : rien ne bouge) */
  private async deplacerFerme(f: FicheClasseur, cible: Cible): Promise<ResultatDeplacement> {
    const locks = (navigator as Navigator & { locks?: LockManager }).locks
    if (!locks?.request) return this.ecrireDepuisLaBase(f, cible)
    try {
      return await locks.request(VERROU_CLE + f.id, { ifAvailable: true }, async lock =>
        lock ? this.ecrireDepuisLaBase(f, cible) : { r: 'autre-onglet', raison: 'un autre onglet est ouvert sur ce classeur' } as ResultatDeplacement)
    } catch { return this.ecrireDepuisLaBase(f, cible) }
  }

  /** Le fichier fabriqué depuis la base (l'écrivain), avec les garde-fous
   *  d'une écriture : l'histoire écrite la dernière fois doit y être entière,
   *  jamais par-dessus un fichier plus riche ; écrit d'un bloc, relu, puis la
   *  poignée gardée et la fiche notée (comme une écriture de la clé) */
  private async ecrireDepuisLaBase(f: FicheClasseur, cible: Cible): Promise<ResultatDeplacement> {
    const fiche = await this.registre.classeur(f.id).catch(() => undefined)
    if (!fiche?.cle) return { r: 'rien', raison: 'ce classeur n\'a plus de fichier' }
    try {
      await this.h.avantDEcrire?.(fiche)
      const date = Math.max(Date.now(), (fiche.cle.date ?? 0) + 1)
      const fab = await fabriquerFichier(fiche.base, { nom: fiche.nom, id: fiche.id }, date)
      if (fiche.cle.vecteur && !contient(fab.vecteur, fiche.cle.vecteur)) return { r: 'conflit', raison: fiche.cle.nom }
      const h = await fichierPourDeplacer(cible.dossier, { id: fiche.id, nom: fiche.nom }, fab.vecteur)
      if (h === 'plus-riche') return { r: 'plus-riche', raison: nomSur(fiche.nom) + EXTENSION_TABLEAU }
      await ecrireDans(h, fab.fichier)
      if ((await h.getFile()).size !== fab.fichier.size) throw new Error('le fichier relu n\'a pas la taille écrite')
      try { await this.registre.garderPoignee(fiche.id, h) } catch (e) {
        if (nomErreur(e) !== 'DataCloneError') throw e
        // Ce navigateur ne garde pas la poignée : le fichier neuf repart, rien ne change
        await cible.dossier.removeEntry?.(h.name).catch(() => {})
        return { r: 'erreur', raison: 'ce navigateur ne peut pas garder le nouveau fichier' }
      }
      const nouvelle: NonNullable<FicheClasseur['cle']> = { nom: h.name, t: Date.now(), date, taille: fab.fichier.size, vecteur: fab.vecteur, chemin: [...cible.chemin] }
      await this.registre.modifierClasseur(fiche.id, x => { x.cle = nouvelle })
      return { r: 'deplace', garde: true }
    } catch (e) {
      const r = raisonCle(e)
      return r.genre === 'permission' ? { r: 'permission', raison: 'le navigateur n\'a pas permis d\'écrire' } : { r: 'erreur', raison: r.message }
    }
  }

  /** L'ancien fichier : jamais retiré sans avoir été examiné (c'est bien lui,
   *  son en-tête porte cet id et la date écrite d'ici), jamais s'il a été
   *  choisi à la main, jamais si c'est le nouveau. Rend ce qu'il faut dire
   *  s'il reste. */
  private async retirerLAncien(id: string, poignee: PoigneeFichier | undefined, cle: NonNullable<FicheClasseur['cle']>, ancien: Ancien | null): Promise<string[]> {
    if (!poignee) return []
    if (!cle.chemin?.length) return [`L'ancien fichier « ${poignee.name} », choisi à la main, reste où il est.`]
    if (!ancien) return [`L'ancien fichier reste dans « ${cheminLisible(cle.chemin)} » : ce navigateur ne retrouve plus ce dossier.`]
    const ou = cheminLisible(ancien.chemin)
    try {
      // Le nouveau fichier est l'ancien (réécrit en place) : rien à retirer
      const nouvelle = await this.registre.poignee<PoigneeFichier>(id).catch(() => undefined)
      if (nouvelle && await memeFichier(nouvelle, poignee)) return []
      const h = await ancien.dossier.getFileHandle(poignee.name)
      const fichier = await h.getFile()
      if (fichier.size) {
        const e = await enteteDe(fichier)
        if (!e || (e.id && e.id !== id) || e.date !== cle.date) return [`L'ancien fichier « ${poignee.name} » a changé ailleurs depuis le dernier enregistrement d'ici : il reste dans « ${ou} ».`]
      }
      if (typeof ancien.dossier.removeEntry !== 'function') return [`L'ancien fichier « ${poignee.name} » reste dans « ${ou} » : ce navigateur ne sait pas le retirer.`]
      await ancien.dossier.removeEntry(poignee.name)
      return []
    } catch (e) {
      if (nomErreur(e) === 'NotFoundError') return []
      return [`L'ancien fichier « ${poignee.name} » n'a pas pu être retiré de « ${ou} » (${raisonDe(e)}).`]
    }
  }

  /** Les .mem à la racine de l'ancien dossier du chapitre (les replays
   *  publiés, les fichiers séance) : chacun écrit dans le nouveau, relu
   *  (la même taille), puis retiré ; un échec le laisse. Un nom déjà pris
   *  là-bas n'est jamais écrasé (« Séance (2).mem »). */
  private async deplacerLesMem(de: PoigneeDossier, vers: PoigneeDossier): Promise<{ deplaces: number; restes: number }> {
    const noms: string[] = [], pris: string[] = []
    try {
      for await (const x of de.values()) if (x.kind === 'file' && x.name.toLowerCase().endsWith(EXTENSION)) noms.push(x.name)
      for await (const x of vers.values()) pris.push(x.name)
    } catch { return { deplaces: 0, restes: noms.length } }
    let deplaces = 0, restes = 0
    for (const nom of noms.sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))) {
      try {
        const h = await de.getFileHandle(nom)
        const fichier = await h.getFile()
        const nomLa = nomDeFichierLibre(nom.slice(0, -EXTENSION.length), EXTENSION, pris)
        const cible = await vers.getFileHandle(nomLa, { create: true })
        await ecrireDans(cible, fichier)
        pris.push(nomLa)
        if ((await cible.getFile()).size !== fichier.size) throw new Error('relu')
        if (typeof de.removeEntry !== 'function') throw new Error('removeEntry')
        await de.removeEntry(nom)
        deplaces++
      } catch { restes++ }
    }
    return { deplaces, restes }
  }

  /** L'ancien dossier du chapitre retiré seulement s'il est vide (un dossier
   *  qui a encore quelque chose reste, sans rien dire) */
  private async retirerSiVide(parent: PoigneeDossier, d: PoigneeDossier): Promise<void> {
    try {
      for await (const _ of d.values()) return
      await parent.removeEntry?.(d.name)
    } catch { /* il reste */ }
  }

  /** Publier rangeait les replays de ce classeur dans l'ancien dossier du
   *  chapitre (retenu pour lui) : il les rangera dans le nouveau */
  private async suivreLeDossierRetenu(id: string, ancien: PoigneeDossier, nouveau: PoigneeDossier): Promise<void> {
    const r = await lireReglage(this.registre, id).catch(() => ({} as ReglageReplay))
    if (r.poignee && await memeDossier(nouveau, ancien) === false && await memeDossier(r.poignee, ancien)) await retenirReglage(this.registre, id, { poignee: nouveau }).catch(() => {})
  }

  // =============================================================
  // « UN AUTRE DOSSIER DE L'ORDINATEUR… »
  // =============================================================

  /** Le professeur choisit lui-même le dossier de ce classeur (dans le clic) :
   *  le fichier y va directement (chemin = [dossier]), avec ses .mem ; le
   *  classeur ne bouge pas dans la bibliothèque ; ce dossier devient celui
   *  des replays de Publier */
  private async versUnAutreDossier(f: FicheClasseur): Promise<void> {
    if (this.occupe) { this.h.message('Un autre déplacement est en cours.'); return }
    let d: PoigneeDossier | null
    try { d = await choisirUnDossier('mem-chapitre') } catch (e) { this.h.message(`Ce dossier n'a pas pu être choisi : ${raisonDe(e)}.`); return }
    if (!d) return
    if (!await accordDuDossier(d, true).catch(() => false)) { this.h.message(`Le navigateur n'a pas permis d'écrire dans « ${d.name} ».`); return }
    this.occupe = true
    try {
      const relu = await this.registre.classeur(f.id).catch(() => undefined)
      if (!relu?.cle) { this.h.message('Ce classeur n\'a pas de fichier à déplacer.'); return }
      this.h.message(`Déplacement du fichier de « ${relu.nom} »…`)
      const o = await this.donnees().catch(() => null)
      const plan = o ? planDeDeplacement({ fiche: relu, cible: relu.dossier, ...o }) : null
      const ancien = plan?.ancien ? await this.ancienDossier(relu, plan.ancien) : null
      const r = await this.deplacerLeFichier(relu, { dossier: d, chemin: [d.name] }, ancien)
      if (!r.ok) { this.h.message(r.texte); return }
      await retenirReglage(this.registre, f.id, { poignee: d }).catch(() => {})
      this.h.message(`Le fichier de « ${relu.nom} » est maintenant dans « ${d.name} »${r.mem ? ` (avec ${desMem(r.mem)})` : ''}. Publier y rangera aussi ses replays.${r.reste ? ' ' + r.reste : ''}`)
    } finally {
      this.occupe = false
    }
  }
}
