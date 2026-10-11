// =============================================================
// LE REGISTRE DES CLASSEURS (l'index de la bibliothèque)
// Une base IndexedDB à part, 'mem-teachingtool-bibliotheque', en
// IndexedDB pure, cinq magasins :
//   classeurs  les fiches (FicheClasseur), clé id ; un index UNIQUE sur la
//              base : deux fiches ne désignent jamais la même base, par
//              aucun chemin (ConstraintError) ;
//   dossiers   les dossiers (FicheDossier), clé id ;
//   etat       la marque de la reprise, les réglages de la bibliothèque ;
//   apercus    l'image de la première page de chaque classeur ;
//   poignees   le fichier de la clé de chaque classeur (FileSystemFileHandle).
// La base s'ouvre SANS version : un lot suivant pourra en monter la
// version (des magasins en plus sont tolérés) sans faire tomber celui-ci
// dans le repli. Chaque méthode tient en une transaction et rejette ses
// erreurs ; après chaque écriture réussie, les autres onglets l'apprennent
// (BroadcastChannel 'mem-teachingtool-bibliotheque').
//
// La reprise (reprendre) fait du tableau d'avant le premier classeur, sans
// jamais ouvrir sa base : elle n'écrit QUE dans l'index, en une seule
// transaction, rejouable ; deux onglets qui démarrent ensemble font une
// seule fiche (la transaction readwrite les sérialise).
// =============================================================
import * as Y from 'yjs'
import type { Tableau } from '../document'
import type { FicheClasseur, FicheDossier } from './demarrage'
import { BASE_INDEX, BASE_PREMIER, NOM_PREMIER, NOM_PREMIER_VIDE, ecrireDernier, estPremier, ficheDuPremier, idClasseur, parents } from './demarrage'
import { ErreurBase, compterEntrees, effacerBase, finDe, requete } from './bases'
import type { OuRemettre } from './corbeille'
import { ouRemettre } from './corbeille'
import { comparerVecteurs } from './vecteurs'
import { oublierLesCles } from './effacer'

const MAGASINS = ['classeurs', 'dossiers', 'etat', 'apercus', 'poignees'] as const
/** Le canal des onglets de ce navigateur sur la bibliothèque */
export const CANAL_BIBLIOTHEQUE = 'mem-teachingtool-bibliotheque'
/** Une création interrompue (l'onglet fermé au milieu) se reprend au bout de ce temps */
const CREATION_PERIMEE = 2 * 60_000
/** L'index qui ne s'ouvre pas dans ce délai fait le repli */
const DELAI_OUVERTURE = 5000
/** Un effacement commencé depuis moins longtemps est peut-être en cours dans
 *  un autre onglet : la reprise ne le relance pas (voir faireLeMenage) */
const EFFACEMENT_PERIME = 30_000

/** Ce que la reprise peut demander : le vecteur d'état d'une base (par
 *  l'écrivain, hors du fil principal), pour le garde-fou du premier */
export interface OptionsReprise { vecteurDe?: (base: string) => Promise<Uint8Array> }

/** Ce que disent les autres onglets : les classeurs et les dossiers changés */
export interface ChangementBibliotheque { type: 'change'; classeurs?: string[]; dossiers?: string[] }

/** Un refus du registre : 'cycle' (un dossier dans lui-même ou l'un de ses
 *  descendants), 'absent' (ce qu'on voulait changer n'existe pas),
 *  'existante' (l'id voulu est déjà pris) */
export class ErreurRegistre extends Error {
  constructor(readonly raison: 'cycle' | 'absent' | 'existante', message?: string) {
    super(message ?? raison)
    this.name = 'ErreurRegistre'
  }
}

/** Abandonne une transaction dont on n'écrira rien, attend sa fin, puis
 *  rejette l'erreur qui l'a fait abandonner */
async function abandonner(t: IDBTransaction, fin: Promise<void>, e: unknown): Promise<never> {
  try { t.abort() } catch { /* déjà finie */ }
  await fin.catch(() => {})
  throw e
}

export class Registre {
  private canal: BroadcastChannel | null = null
  private ecouteurs: ((c: ChangementBibliotheque) => void)[] = []
  /** Le ménage de la reprise (les créations interrompues), pour les essais */
  menage: Promise<void> = Promise.resolve()

  private constructor(private db: IDBDatabase) {
    // Une autre version veut monter celle de l'index (un lot suivant, dans
    // un autre onglet) : on la laisse faire ; les écritures suivantes
    // rejetteront, et l'appelant les rattrape
    db.onversionchange = () => db.close()
    try {
      this.canal = new BroadcastChannel(CANAL_BIBLIOTHEQUE)
      this.canal.onmessage = e => {
        const m = e.data as ChangementBibliotheque | null
        if (m?.type === 'change') for (const f of this.ecouteurs) { try { f(m) } catch { /* l'écouteur se débrouille */ } }
      }
    } catch { /* pas de canal : chaque onglet vit sa vie */ }
  }

  /** Ouvre l'index (le crée s'il n'existe pas). Rejette après 5 s : une
   *  autre connexion qui bloquerait l'ouverture ne retient pas le démarrage. */
  static ouvrir(): Promise<Registre> {
    return new Promise((ok, ko) => {
      let fini = false
      const minuterie = setTimeout(() => { fini = true; ko(new ErreurBase('indisponible', 'L\'index de la bibliothèque ne s\'ouvre pas.')) }, DELAI_OUVERTURE)
      const finir = (f: () => void) => { if (fini) return; fini = true; clearTimeout(minuterie); f() }
      let r: IDBOpenDBRequest
      try { r = indexedDB.open(BASE_INDEX) } catch (e) {
        return finir(() => ko(new ErreurBase('indisponible', (e as Error)?.message)))
      }
      r.onupgradeneeded = e => {
        if (e.oldVersion !== 0) return
        const db = r.result
        db.createObjectStore('classeurs', { keyPath: 'id' }).createIndex('base', 'base', { unique: true })
        db.createObjectStore('dossiers', { keyPath: 'id' })
        db.createObjectStore('etat')
        db.createObjectStore('apercus')
        db.createObjectStore('poignees')
      }
      r.onsuccess = () => {
        const db = r.result
        // Arrivée après le délai : personne ne l'attend plus
        if (fini) { db.close(); return }
        const manque = MAGASINS.filter(m => !db.objectStoreNames.contains(m))
        if (manque.length || !db.transaction(['classeurs'], 'readonly').objectStore('classeurs').indexNames.contains('base')) {
          db.close()
          return finir(() => ko(new ErreurBase('abimee', 'L\'index de la bibliothèque est incomplet.')))
        }
        finir(() => ok(new Registre(db)))
      }
      r.onerror = e => { e.preventDefault(); finir(() => ko(new ErreurBase('indisponible', r.error?.message))) }
      r.onblocked = () => { /* le délai décidera */ }
    })
  }

  fermer() {
    try { this.canal?.close() } catch { /* déjà fermé */ }
    this.canal = null
    this.db.close()
  }

  /** f reçoit les changements faits par les autres onglets */
  onChange(f: (c: ChangementBibliotheque) => void) { this.ecouteurs.push(f) }

  private annoncer(classeurs?: string[], dossiers?: string[]) {
    const m: ChangementBibliotheque = { type: 'change' }
    if (classeurs?.length) m.classeurs = classeurs
    if (dossiers?.length) m.dossiers = dossiers
    try { this.canal?.postMessage(m) } catch { /* seul onglet */ }
  }

  private transaction(magasins: string[], mode: IDBTransactionMode = 'readonly') {
    return this.db.transaction(magasins, mode)
  }

  // ---------- La reprise ----------
  /** Fait du tableau d'avant le premier classeur. UNE transaction readwrite
   *  sur ['etat', 'classeurs'] : elle lit la marque 'reprise' ; si elle
   *  manque, elle crée la fiche du premier (ou, s'il en a déjà une, par sa
   *  base, n'écrit que la marque), puis la marque. Elle n'ouvre jamais
   *  'mem-tableau-local'. Coupée au milieu (onglet fermé, navigateur tué),
   *  rien n'est écrit : elle se rejoue. Deux onglets ensemble : la
   *  transaction de l'un attend celle de l'autre, qui trouve la marque.
   *  Une fois la marque posée, la fiche du premier n'est jamais recréée :
   *  vidée de la corbeille, elle ne revient pas.
   *  Rend la fiche du premier, ou undefined s'il n'y en a plus. */
  async reprendre(o: OptionsReprise = {}): Promise<FicheClasseur | undefined> {
    const t = this.transaction(['etat', 'classeurs'], 'readwrite')
    const fin = finDe(t)
    const etat = t.objectStore('etat'), classeurs = t.objectStore('classeurs')
    const marque = await requete(etat.get('reprise'))
    let premier = await requete(classeurs.index('base').get(BASE_PREMIER) as IDBRequest<FicheClasseur | undefined>)
    let ecrit = false
    if (!marque) {
      if (!premier) { premier = ficheDuPremier(idClasseur()); classeurs.put(premier) }
      etat.put({ id: premier.id, t: Date.now() }, 'reprise')
      ecrit = true
    }
    await fin
    if (ecrit && premier) this.annoncer([premier.id])
    this.menage = this.faireLeMenage(o).catch(() => { /* on le refera au prochain démarrage */ })
    return premier
  }

  /** Les créations interrompues : une fiche qui garde `creation` plus de 2
   *  minutes. Si sa base a quelque chose, on l'adopte (on retire creation) ;
   *  sinon (vide ou absente) on retire la fiche, puis on efface la base.
   *  Chaque fiche dans sa transaction, relue : un autre onglet a pu finir.
   *  Puis les effacements interrompus (voir reprendreLesEffacements). */
  private async faireLeMenage(o: OptionsReprise = {}) {
    const avant = Date.now() - CREATION_PERIMEE
    const toutes = await this.classeurs()
    const restes = toutes.filter(f => f.creation != null && f.creation < avant)
    await this.reprendreLesEffacements(toutes.filter(f => f.effacement != null && f.effacement < Date.now() - EFFACEMENT_PERIME), o)
    for (const f of restes) {
      const n = await compterEntrees(f.base)
      if (n > 0) {
        await this.modifierClasseur(f.id, x => { if (x.creation === f.creation) delete x.creation })
        continue
      }
      const t = this.transaction(['classeurs'], 'readwrite')
      const fin = finDe(t)
      const s = t.objectStore('classeurs')
      const x = await requete(s.get(f.id) as IDBRequest<FicheClasseur | undefined>)
      const retiree = !!x && x.creation === f.creation
      if (retiree) s.delete(f.id)
      await fin
      if (!retiree) continue
      this.annoncer([f.id])
      if (!estPremier(f)) await effacerBase(f.base)
    }
  }

  /** Les effacements interrompus (l'onglet fermé, le navigateur tué entre la
   *  marque et la fin) : la base s'efface, puis la fiche, son aperçu, son
   *  fichier de la clé et ses clés de stockage s'en vont. Une base bloquée
   *  (un onglet la tient) s'effacera à sa fermeture, ou au prochain
   *  démarrage. Le garde-fou du premier : sa base, que la version d'avant
   *  rouvre et recrée, n'est effacée que si elle n'a rien de plus que ce
   *  qu'on avait décidé d'effacer (le vecteur gardé dans la fiche, voir
   *  effacer.ts) ; sinon (la version d'avant y a écrit depuis, ou on ne
   *  peut pas le savoir), seule la fiche s'en va : la base, sans fiche,
   *  sera adoptée à l'ouverture de la bibliothèque, et rien n'est perdu. */
  private async reprendreLesEffacements(fiches: FicheClasseur[], o: OptionsReprise) {
    for (const f of fiches) {
      try {
        if (estPremier(f) && await compterEntrees(f.base) > 0) {
          let garder = true
          if (o.vecteurDe && f.vecteur) {
            const v = await o.vecteurDe(f.base).catch(() => null)
            const c = v ? comparerVecteurs(v, f.vecteur) : null
            garder = !(c === 'egal' || c === 'contenu')
          }
          if (garder) { await this.retirerClasseur(f.id, { siEffacement: f.effacement }); continue }
        }
        const fini = async () => { if (await this.retirerClasseur(f.id, { siEffacement: f.effacement })) oublierLesCles(f) }
        const r = await effacerBase(f.base, () => { void fini().catch(() => {}) })
        if (r === 'efface') await fini()
      } catch { /* au prochain démarrage */ }
    }
  }

  // ---------- Lire ----------
  classeurs(): Promise<FicheClasseur[]> {
    return requete(this.transaction(['classeurs']).objectStore('classeurs').getAll() as IDBRequest<FicheClasseur[]>)
  }
  dossiers(): Promise<FicheDossier[]> {
    return requete(this.transaction(['dossiers']).objectStore('dossiers').getAll() as IDBRequest<FicheDossier[]>)
  }
  classeur(id: string): Promise<FicheClasseur | undefined> {
    return requete(this.transaction(['classeurs']).objectStore('classeurs').get(id) as IDBRequest<FicheClasseur | undefined>)
  }
  dossier(id: string): Promise<FicheDossier | undefined> {
    return requete(this.transaction(['dossiers']).objectStore('dossiers').get(id) as IDBRequest<FicheDossier | undefined>)
  }
  classeurParBase(base: string): Promise<FicheClasseur | undefined> {
    return requete(this.transaction(['classeurs']).objectStore('classeurs').index('base').get(base) as IDBRequest<FicheClasseur | undefined>)
  }

  // ---------- Écrire ----------
  /** Lit la fiche, la change (f la modifie ou en rend une autre, sans
   *  attendre), l'écrit : une seule transaction. undefined : pas de fiche. */
  async modifierClasseur(id: string, f: (x: FicheClasseur) => FicheClasseur | void): Promise<FicheClasseur | undefined> {
    const t = this.transaction(['classeurs'], 'readwrite')
    const fin = finDe(t)
    const s = t.objectStore('classeurs')
    let nouvelle: FicheClasseur | undefined
    try {
      const x = await requete(s.get(id) as IDBRequest<FicheClasseur | undefined>)
      if (x) {
        nouvelle = f(x) ?? x
        nouvelle.id = id
        s.put(nouvelle)
      }
    } catch (e) { return abandonner(t, fin, e) }
    await fin
    if (nouvelle) this.annoncer([id])
    return nouvelle
  }

  /** Une fiche neuve (rejette si l'id ou la base sont déjà pris) */
  async ajouterClasseur(fiche: FicheClasseur): Promise<void> {
    const t = this.transaction(['classeurs'], 'readwrite')
    const fin = finDe(t)
    t.objectStore('classeurs').add(fiche)
    await fin
    this.annoncer([fiche.id])
  }

  /** Retire une fiche (rien si elle est déjà partie). Sa base, elle, reste. */
  async supprimerFiche(id: string): Promise<void> {
    const t = this.transaction(['classeurs'], 'readwrite')
    const fin = finDe(t)
    t.objectStore('classeurs').delete(id)
    await fin
    this.annoncer([id])
  }

  async ajouterDossier(d: FicheDossier): Promise<void> {
    const t = this.transaction(['dossiers'], 'readwrite')
    const fin = finDe(t)
    t.objectStore('dossiers').add(d)
    await fin
    this.annoncer(undefined, [d.id])
  }

  async modifierDossier(id: string, f: (x: FicheDossier) => FicheDossier | void): Promise<FicheDossier | undefined> {
    const t = this.transaction(['dossiers'], 'readwrite')
    const fin = finDe(t)
    const s = t.objectStore('dossiers')
    let nouveau: FicheDossier | undefined
    try {
      const x = await requete(s.get(id) as IDBRequest<FicheDossier | undefined>)
      if (x) {
        nouveau = f(x) ?? x
        nouveau.id = id
        s.put(nouveau)
      }
    } catch (e) { return abandonner(t, fin, e) }
    await fin
    if (nouveau) this.annoncer(undefined, [id])
    return nouveau
  }

  async supprimerDossier(id: string): Promise<void> {
    const t = this.transaction(['dossiers'], 'readwrite')
    const fin = finDe(t)
    t.objectStore('dossiers').delete(id)
    await fin
    this.annoncer(undefined, [id])
  }

  /** Range un dossier dans un autre (null : à la racine). Tous les dossiers
   *  sont relus DANS la transaction : un dossier ne va jamais dans lui-même
   *  ni dans l'un de ses descendants (rejet 'cycle'), même si un autre
   *  onglet vient d'en déplacer un. */
  async deplacerDossier(id: string, parent: string | null): Promise<FicheDossier> {
    const t = this.transaction(['dossiers'], 'readwrite')
    const fin = finDe(t)
    const s = t.objectStore('dossiers')
    const tous = await requete(s.getAll() as IDBRequest<FicheDossier[]>)
    const carte = new Map(tous.map(d => [d.id, d]))
    const d = carte.get(id)
    let refus: ErreurRegistre | null = null
    if (!d) refus = new ErreurRegistre('absent', 'Ce dossier n\'existe plus.')
    else if (parent !== null && !carte.has(parent)) refus = new ErreurRegistre('absent', 'Le dossier d\'arrivée n\'existe plus.')
    else if (parent !== null && (parent === id || parents(parent, carte).some(x => x.id === id))) refus = new ErreurRegistre('cycle', 'Un dossier ne peut pas aller dans lui-même ni dans l\'un de ses dossiers.')
    if (refus || !d) return abandonner(t, fin, refus)
    d.parent = parent
    s.put(d)
    await fin
    this.annoncer(undefined, [id])
    return d
  }

  /** Change l'id d'un classeur (sa base ne change pas) : l'aperçu suit, la
   *  poignée du fichier de la clé est oubliée (elle était celle de l'ancien
   *  contenu), même quand l'id ne change pas. changer : ce qui change aussi
   *  dans la fiche, dans la même transaction (sans attendre : « Remplacer »
   *  y retire la clé et le Drive, voir sauvegarde.ts). Rejette si le nouvel
   *  id est pris. */
  async changerIdentite(ancien: string, nouveau: string, changer?: (f: FicheClasseur) => void): Promise<FicheClasseur> {
    const t = this.transaction(['classeurs', 'apercus', 'poignees'], 'readwrite')
    const fin = finDe(t)
    const c = t.objectStore('classeurs'), a = t.objectStore('apercus'), p = t.objectStore('poignees')
    const [x, pris, apercu] = await Promise.all([
      requete(c.get(ancien) as IDBRequest<FicheClasseur | undefined>),
      requete(c.get(nouveau) as IDBRequest<FicheClasseur | undefined>),
      requete(a.get(ancien)),
    ])
    const refus = !x ? new ErreurRegistre('absent', 'Ce classeur n\'existe plus.') : pris && ancien !== nouveau ? new ErreurRegistre('existante', 'Un autre classeur a déjà cet identifiant.') : null
    if (refus || !x) return abandonner(t, fin, refus)
    const f: FicheClasseur = { ...x, id: nouveau }
    try { changer?.(f) } catch (e) { return abandonner(t, fin, e) }
    f.id = nouveau
    if (ancien !== nouveau) {
      // Dans cet ordre : l'index unique de la base ne voit jamais deux fiches
      c.delete(ancien)
      if (apercu !== undefined) { a.put(apercu, nouveau); a.delete(ancien) }
    }
    p.delete(ancien)
    c.put(f)
    await fin
    this.annoncer([ancien, nouveau])
    return f
  }

  /** Retire un classeur effacé de l'index : sa fiche, son aperçu, le fichier
   *  de sa clé, en une transaction (lot 4 C8, après l'effacement de sa
   *  base). Rien si la fiche est déjà partie (deux onglets qui vident
   *  ensemble) ; siEffacement : seulement si elle porte encore cet
   *  effacement. Vrai si la fiche était là. */
  async retirerClasseur(id: string, o: { siEffacement?: number } = {}): Promise<boolean> {
    const t = this.transaction(['classeurs', 'apercus', 'poignees'], 'readwrite')
    const fin = finDe(t)
    const c = t.objectStore('classeurs')
    let la = false
    try {
      const x = await requete(c.get(id) as IDBRequest<FicheClasseur | undefined>)
      la = !!x && (o.siEffacement === undefined || x.effacement === o.siEffacement)
      if (la) { c.delete(id); t.objectStore('apercus').delete(id); t.objectStore('poignees').delete(id) }
    } catch (e) { return abandonner(t, fin, e) }
    await fin
    if (la) this.annoncer([id])
    return la
  }

  /** Remet un classeur de la corbeille dans son dossier, ou à la racine si
   *  son dossier ne se montre plus (supprimé, ou dans la corbeille) : sa
   *  fiche et tous les dossiers relus dans UNE transaction. undefined : il
   *  n'est plus là (ni dans la corbeille). */
  async remettreClasseur(id: string): Promise<{ fiche: FicheClasseur; ou: OuRemettre; avant: { t: number; dossier: string | null } } | undefined> {
    const t = this.transaction(['classeurs', 'dossiers'], 'readwrite')
    const fin = finDe(t)
    const c = t.objectStore('classeurs')
    let r: { fiche: FicheClasseur; ou: OuRemettre; avant: { t: number; dossier: string | null } } | undefined
    try {
      const [x, dossiers] = await Promise.all([
        requete(c.get(id) as IDBRequest<FicheClasseur | undefined>),
        requete(t.objectStore('dossiers').getAll() as IDBRequest<FicheDossier[]>),
      ])
      if (x && x.corbeille && x.effacement == null) {
        const avant = { t: x.corbeille.t, dossier: x.dossier }
        const ou = ouRemettre(x.dossier, dossiers)
        delete x.corbeille
        x.dossier = ou.dossier
        c.put(x)
        r = { fiche: x, ou, avant }
      }
    } catch (e) { return abandonner(t, fin, e) }
    await fin
    if (r) this.annoncer([id])
    return r
  }

  /** Remet un dossier de la corbeille dans son dossier parent, ou à la
   *  racine si celui-ci ne se montre plus ; ses classeurs et ses
   *  sous-dossiers reviennent avec lui (ceux supprimés pour eux-mêmes
   *  restent dans la corbeille). Une transaction. */
  async remettreDossier(id: string): Promise<{ dossier: FicheDossier; ou: OuRemettre; avant: { t: number; parent: string | null } } | undefined> {
    const t = this.transaction(['dossiers'], 'readwrite')
    const fin = finDe(t)
    const s = t.objectStore('dossiers')
    let r: { dossier: FicheDossier; ou: OuRemettre; avant: { t: number; parent: string | null } } | undefined
    try {
      const tous = await requete(s.getAll() as IDBRequest<FicheDossier[]>)
      const carte = new Map(tous.map(d => [d.id, d]))
      const d = carte.get(id)
      if (d && d.corbeille) {
        const avant = { t: d.corbeille.t, parent: d.parent }
        delete d.corbeille
        // Là où il était : vu sans lui-même dans la corbeille
        const ou = ouRemettre(d.parent, carte)
        d.parent = ou.dossier
        s.put(d)
        r = { dossier: d, ou, avant }
      }
    } catch (e) { return abandonner(t, fin, e) }
    await fin
    if (r) this.annoncer(undefined, [id])
    return r
  }

  /** Adopte une base qu'aucune fiche ne désigne (voir adoption.ts) : UNE
   *  transaction relit l'index par la base, puis ajoute la fiche (un id
   *  déjà pris en prend un neuf). null : un autre onglet l'a déjà adoptée
   *  (la base a une fiche, ou ConstraintError) ; rien n'est écrit. */
  async adopter(fiche: FicheClasseur): Promise<FicheClasseur | null> {
    const t = this.transaction(['classeurs'], 'readwrite')
    const fin = finDe(t)
    const c = t.objectStore('classeurs')
    let ajoutee: FicheClasseur | null = null
    try {
      const deja = await requete(c.index('base').get(fiche.base) as IDBRequest<FicheClasseur | undefined>)
      if (!deja) {
        const f = { ...fiche }
        if (await requete(c.get(f.id) as IDBRequest<FicheClasseur | undefined>)) f.id = idClasseur()
        c.add(f)
        ajoutee = f
      }
    } catch (e) { return abandonner(t, fin, e) }
    try { await fin } catch (e) {
      if ((e as { name?: string } | null)?.name === 'ConstraintError') return null
      throw e
    }
    if (ajoutee) this.annoncer([ajoutee.id])
    return ajoutee
  }

  /** Les réglages de la bibliothèque (le tri, la copie sur le Drive par défaut…) */
  reglage<T = unknown>(cle: string): Promise<T | undefined> {
    return requete(this.transaction(['etat']).objectStore('etat').get('reglage:' + cle) as IDBRequest<T | undefined>)
  }
  async ecrireReglage(cle: string, v: unknown): Promise<void> {
    const t = this.transaction(['etat'], 'readwrite')
    const fin = finDe(t)
    t.objectStore('etat').put(v, 'reglage:' + cle)
    await fin
  }
  /** Un réglage tiré une seule fois (l'appareil, lot 4 C10) : relu, et créé
   *  s'il manque, dans UNE transaction ; deux onglets qui démarrent ensemble
   *  ont le même */
  async reglageOuCreer<T>(cle: string, creer: () => T): Promise<T> {
    const t = this.transaction(['etat'], 'readwrite')
    const fin = finDe(t)
    const s = t.objectStore('etat')
    let v: T | undefined
    try {
      v = await requete(s.get('reglage:' + cle) as IDBRequest<T | undefined>)
      if (v === undefined) { v = creer(); s.put(v, 'reglage:' + cle) }
    } catch (e) { return abandonner(t, fin, e) }
    await fin
    return v as T
  }

  /** L'aperçu d'un classeur (l'image de sa première page) */
  apercu(id: string): Promise<Blob | undefined> {
    return requete(this.transaction(['apercus']).objectStore('apercus').get(id) as IDBRequest<Blob | undefined>)
  }
  /** Tous les aperçus, par id de classeur (une lecture : la bibliothèque
   *  qui s'ouvre) */
  async apercus(): Promise<Map<string, Blob>> {
    const s = this.transaction(['apercus']).objectStore('apercus')
    const [cles, valeurs] = await Promise.all([requete(s.getAllKeys()), requete(s.getAll() as IDBRequest<Blob[]>)])
    return new Map(cles.map((k, i) => [String(k), valeurs[i]]))
  }
  /** Vrai s'il est rangé ; une erreur (plus de place) est rattrapée : un
   *  aperçu manquant n'est pas grave */
  async ecrireApercu(id: string, image: Blob): Promise<boolean> {
    try {
      const t = this.transaction(['apercus'], 'readwrite')
      const fin = finDe(t)
      t.objectStore('apercus').put(image, id)
      await fin
      this.annoncer([id])
      return true
    } catch { return false }
  }

  /** Le fichier de la clé d'un classeur (FileSystemFileHandle) */
  poignee<T = unknown>(id: string): Promise<T | undefined> {
    return requete(this.transaction(['poignees']).objectStore('poignees').get(id) as IDBRequest<T | undefined>)
  }
  /** Garde la poignée ; un navigateur qui ne sait pas la ranger rejette
   *  DataCloneError (l'appelant le dit) */
  async garderPoignee(id: string, poignee: unknown): Promise<void> {
    const t = this.transaction(['poignees'], 'readwrite')
    const fin = finDe(t)
    try { t.objectStore('poignees').put(poignee, id) } catch (e) { return abandonner(t, fin, e) }
    await fin
    this.annoncer([id])
  }
  /** Toutes les poignées gardées, avec l'id de leur classeur (pour qu'un
   *  fichier ne serve jamais à deux classeurs : isSameEntry, voir cle.ts) */
  async poignees<T = unknown>(): Promise<{ id: string; poignee: T }[]> {
    const s = this.transaction(['poignees']).objectStore('poignees')
    const [cles, valeurs] = await Promise.all([requete(s.getAllKeys()), requete(s.getAll() as IDBRequest<T[]>)])
    return cles.map((k, i) => ({ id: String(k), poignee: valeurs[i] }))
  }
  async oublierPoignee(id: string): Promise<void> {
    const t = this.transaction(['poignees'], 'readwrite')
    const fin = finDe(t)
    t.objectStore('poignees').delete(id)
    await fin
    this.annoncer([id])
  }

  // ---------- Créer un classeur ----------
  /** Crée un classeur sans jamais toucher à une base qui a quelque chose :
   *  1) sa base doit être libre (sinon rejet 'existante', rien d'écrit) ;
   *  2) la fiche entre dans l'index, marquée `creation` (ni montrée, ni
   *     ouverte ; reprise par le ménage si l'onglet se ferme au milieu) ;
   *  3) remplir(base) la crée et la remplit (creerBase) ;
   *  4) la marque s'en va.
   *  Si remplir échoue, la fiche s'en va, et la base n'est effacée QUE si
   *  remplir l'a créée. */
  async creerClasseur(fiche: FicheClasseur, remplir: (base: string) => Promise<{ creee: boolean }>): Promise<FicheClasseur> {
    if (await compterEntrees(fiche.base) > 0) throw new ErreurBase('existante', 'La base de ce classeur existe déjà.')
    const creation = Date.now()
    await this.ajouterClasseur({ ...fiche, creation })
    try {
      await remplir(fiche.base)
    } catch (e) {
      await this.supprimerFiche(fiche.id).catch(() => {})
      if ((e as ErreurBase | null)?.creee && !estPremier(fiche)) await effacerBase(fiche.base).catch(() => {})
      throw e
    }
    const f = await this.modifierClasseur(fiche.id, x => { if (x.creation === creation) delete x.creation })
    if (!f) throw new ErreurRegistre('absent', 'Le classeur a disparu de la bibliothèque pendant sa création.')
    return f
  }

  // ---------- L'ouverture ----------
  /** Note l'ouverture d'un classeur, une fois son document chargé : quand,
   *  combien de pages, son vecteur d'état ; le dernier classeur ouvert (qui
   *  se relit même sans l'index). Pour le premier jamais ouvert depuis la
   *  reprise (pages null), ses dates viennent du film, et il s'appelle
   *  « Premier classeur » s'il n'y avait rien (un navigateur neuf).
   *  L'identité { id, nom } va aussi dans la base du classeur, par la
   *  connexion du Tableau, hors du document : si l'index se perd, la base
   *  dit encore qui elle est. */
  async noterOuverture(fiche: FicheClasseur, tableau: Tableau, vide: boolean): Promise<FicheClasseur | undefined> {
    const maintenant = Date.now()
    // Le premier repris après la perte de l'index (une nouvelle reprise) :
    // il retrouve le nom rangé à côté de son document (lot 4 C8)
    const identite = fiche.pages === null && estPremier(fiche) && !vide ? await tableau.lireIdentite().catch(() => undefined) : undefined
    const f = await this.modifierClasseur(fiche.id, x => {
      if (x.pages === null && estPremier(x)) {
        const film = tableau.film
        x.cree = film.length ? film.get(0).t : maintenant
        x.modifie = Math.max(x.modifie || 0, film.length ? film.get(film.length - 1).t : maintenant)
        if (vide) x.nom = NOM_PREMIER_VIDE
        else if (identite?.nom && x.nom === NOM_PREMIER) x.nom = identite.nom
      }
      x.ouvert = maintenant
      x.pages = tableau.ordre.length
      x.vecteur = Y.encodeStateVector(tableau.doc)
    })
    if (!f) return undefined
    // Le dernier classeur, celui du démarrage : pas un onglet ouvert en
    // arrière-plan (Ctrl + clic, clic du milieu sur une carte) qu'on n'a pas
    // encore regardé ; il le deviendra quand on le regardera (main.ts)
    if (document.visibilityState !== 'hidden') ecrireDernier(f)
    await tableau.noterIdentite({ id: f.id, nom: f.nom })
    return f
  }
}
