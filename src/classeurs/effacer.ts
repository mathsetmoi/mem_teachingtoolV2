// =============================================================
// EFFACER UN CLASSEUR POUR DE BON (la corbeille de la bibliothèque, vidée)
// Jamais de fiche menteuse : la fiche dit d'abord que le classeur part, sa
// base s'efface ensuite, et la fiche ne s'en va qu'une fois la base partie.
//  1) La fiche reçoit effacement (maintenant) : le classeur disparaît
//     partout (voir demarrage.visible), dans tous les onglets.
//  2) Les onglets ouverts sur lui sont prévenus et cessent d'écrire : par
//     le canal des classeurs ({ type: 'supprime', base }) et, pour le
//     premier, par le canal d'avant ({ type: 'remplace', raison:
//     'supprime' } : un onglet de la version d'avant, la clé du lot 3, ne
//     lit que type, se coupe et demande un rechargement).
//  3) Ouvert dans cet onglet : ici.couper() (la sauvegarde prévient les
//     autres par ses propres canaux, le Tableau coupe son lien avec la base).
//  4) 300 ms : le temps que les autres onglets se coupent.
//  5) La base s'efface. Le garde-fou du premier : son vecteur d'état, juste
//     avant, va dans la fiche (une reprise interrompue ne l'effacera que s'il
//     n'a rien de plus, voir Registre.reprendreLesEffacements). Effacée :
//     la fiche, son aperçu, son fichier de la clé et ses clés de stockage
//     ('mem-session', 'mem-dernier-enregistrement', celles du premier
//     telles quelles) s'en vont. Bloquée (un onglet la tient encore) : elle
//     s'effacera à sa fermeture, et le même ménage suivra ; sinon, la reprise
//     du prochain démarrage s'en charge.
// Les connexions du travailleur se ferment après lecture et dès qu'on veut
// effacer (versionchange) : une lecture en cours ne bloque pas.
// Deux onglets qui vident ensemble : ce qui est déjà parti ne lève rien.
// =============================================================
import type { FicheClasseur } from './demarrage'
import { CANAL_CLASSEUR, CANAL_PREMIER, CLE_DERNIER_CLASSEUR, CLE_DERNIER_ENREGISTREMENT, CLE_SESSION, cleDuClasseur, estPremier, lireDernier } from './demarrage'
import type { Registre } from './registre'
import { effacerBase } from './bases'

/** Le temps laissé aux autres onglets pour se couper */
export const ATTENTE_EFFACEMENT = 300
/** Une base bloquée par une connexion qui se ferme bientôt (un onglet occupé
 *  un instant, qui traite son « versionchange » après) : on attend ce temps
 *  avant de dire qu'elle sera effacée plus tard */
export const PATIENCE_BLOQUE = 4000

const attendre = (ms: number) => new Promise<void>(ok => setTimeout(ok, ms))

export interface OptionsEffacer {
  /** Le classeur ouvert dans cet onglet : couper() prévient les autres onglets
   *  (par les canaux de la sauvegarde, pour qu'elle ne se prévienne pas
   *  elle-même), coupe le lien du Tableau avec sa base, et l'onglet passe
   *  sans classeur */
  ici?: { id: string; couper(): void } | null
  /** Le vecteur d'état d'une base (par l'écrivain) : le garde-fou du premier */
  vecteurDe?: (base: string) => Promise<Uint8Array>
  /** Une base qu'un onglet tient encore ouverte ; fini : elle vient d'être
   *  effacée, et sa fiche est partie */
  bloque?: (f: FicheClasseur) => void
  fini?: (f: FicheClasseur) => void
}

export interface Effacement {
  /** Effacés pour de bon (leur base et leur fiche) */
  effaces: FicheClasseur[]
  /** Bloqués par un onglet : leur fiche est cachée, leur base partira */
  bloques: FicheClasseur[]
  /** Pas effacés (une erreur du navigateur) : la reprise réessaiera */
  echecs: FicheClasseur[]
  /** Parmi les effacés, ceux qu'une connexion a retenus un instant (moins de
   *  PATIENCE_BLOQUE) : pour les essais, qui vérifient que l'écrivain ne
   *  retient jamais une base (voir ecrivain-taches.auCalmeDesBases) */
  retenus: number
}

/** Les clés de stockage d'un classeur effacé s'en vont (le dernier classeur
 *  ouvert aussi, s'il désigne celui-ci) */
export function oublierLesCles(f: { id: string; base: string }) {
  try {
    localStorage.removeItem(cleDuClasseur(f, CLE_SESSION))
    localStorage.removeItem(cleDuClasseur(f, CLE_DERNIER_ENREGISTREMENT))
    if (lireDernier(localStorage.getItem(CLE_DERNIER_CLASSEUR))?.id === f.id) localStorage.removeItem(CLE_DERNIER_CLASSEUR)
  } catch { /* ce navigateur ne garde rien */ }
}

/** Prévient les onglets ouverts sur ce classeur (pas celui-ci : voir ici) */
function prevenir(f: FicheClasseur) {
  try { const c = new BroadcastChannel(CANAL_CLASSEUR); c.postMessage({ type: 'supprime', base: f.base, id: f.id }); c.close() } catch { /* pas de canal */ }
  if (estPremier(f)) {
    try { const c = new BroadcastChannel(CANAL_PREMIER); c.postMessage({ type: 'remplace', raison: 'supprime' }); c.close() } catch { /* pas de canal */ }
  }
}

/** Efface ces classeurs pour de bon, dans l'ordre dit plus haut (les
 *  marques et les avis pour tous, une seule attente, puis les bases une à
 *  une). Une fiche déjà partie (un autre onglet a vidé) est sautée. */
export async function effacerLesClasseurs(registre: Registre, fiches: readonly FicheClasseur[], o: OptionsEffacer = {}): Promise<Effacement> {
  const r: Effacement = { effaces: [], bloques: [], echecs: [], retenus: 0 }
  // 1) La marque : la fiche disparaît partout
  const maintenant = Date.now()
  const marques: FicheClasseur[] = []
  for (const f of fiches) {
    try {
      const x = await registre.modifierClasseur(f.id, c => { c.effacement = maintenant })
      if (x) marques.push(x)
    } catch { r.echecs.push(f) }
  }
  if (!marques.length) return r
  // 2) et 3) Les onglets ouverts sur eux cessent d'écrire
  for (const f of marques) {
    if (o.ici && o.ici.id === f.id) { try { o.ici.couper() } catch { /* l'onglet se débrouille */ } }
    else prevenir(f)
  }
  // 4) Le temps qu'ils se coupent
  await attendre(ATTENTE_EFFACEMENT)
  // 5) Les bases
  for (const f of marques) {
    // Le garde-fou du premier : ce qu'on efface, noté dans la fiche
    if (estPremier(f) && o.vecteurDe) {
      try {
        const v = await o.vecteurDe(f.base)
        await registre.modifierClasseur(f.id, c => { c.vecteur = v })
      } catch { /* sa base est peut-être déjà partie */ }
    }
    const fin = async () => { if (await registre.retirerClasseur(f.id, { siEffacement: maintenant })) oublierLesCles(f) }
    try {
      let effacee: () => void = () => {}
      const plusTard = new Promise<true>(ok => { effacee = () => ok(true) })
      const e = await effacerBase(f.base, () => effacee())
      // Bloquée : une connexion qui se ferme d'ici peu (un onglet occupé un
      // instant) ne fait pas dire « plus tard »
      const tout = e === 'efface' || await Promise.race([plusTard, attendre(PATIENCE_BLOQUE).then(() => false as const)])
      if (tout) { await fin().catch(() => { /* la reprise s'en chargera */ }); r.effaces.push(f); if (e === 'bloque') r.retenus++ }
      else {
        r.bloques.push(f); o.bloque?.(f)
        void plusTard.then(fin).then(() => o.fini?.(f), () => { /* la reprise s'en chargera */ })
      }
    } catch { r.echecs.push(f) }
  }
  return r
}
