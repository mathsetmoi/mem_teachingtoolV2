// =============================================================
// LE REPLAY RANGÉ DANS UN DOSSIER DE L'ORDINATEUR
// Publier peut poser le fichier séance (« Titre [code].mem ») dans le dossier
// du chapitre sur l'ordinateur : une clé, un dossier, ou un dossier de Google
// Drive pour ordinateur (G:\Mon Drive\…), qui l'envoie ensuite sur le Drive.
// Le lien des élèves porte le code ; le relais du Drive retrouve le fichier
// par ce code, où qu'il soit rangé (relais/relais-seances.gs). L'outil ne se
// connecte pas à Google pour cela.
// Le dossier proposé est celui du chapitre quand le niveau est relié à un
// dossier de l'ordinateur (lot 7) ; un autre dossier choisi est retenu pour
// ce classeur, avec le Drive des élèves (« mem », « lfb », « lyfel »).
// Quand tout est retenu et qu'une séance du classeur a déjà été rangée, la
// fenêtre s'ouvre en résumé (lot 16) : deux lignes et un gros « Publier ».
// Ce fichier se teste sous Node (faux dossiers, faux registre).
// =============================================================
import type { PoigneeDossier } from '../classeurs/ordinateur'
import { accordDuDossier, choisirUnDossier } from '../classeurs/ordinateur'
import { remontee } from '../classeurs/arbre'
import { emplacementDe, emplacements, reglagePoignee, sousDossiers } from '../classeurs/emplacements'
import type { Registre } from '../classeurs/registre'
import { EXTENSION, codeDuNom } from './comptes'
import { nomSur } from '../fichier'

/** « Titre [code].mem » : le nom choisi (passé au crible des noms de fichier),
 *  puis le code, qui relie le lien des élèves au fichier */
export function nomDuReplay(titre: string, code: string): string {
  // 80 caractères au plus pour le titre : le code et l'extension s'y ajoutent
  const base = nomSur(titre, { repli: 'Séance' })
  return `${base} [${code}]${EXTENSION}`
}

/** Dépose le replay dans le dossier : un fichier du même code (d'avant, sous
 *  un autre titre) est remplacé, pas doublé. Rend le nom du fichier écrit. */
export async function deposerLeReplay(d: PoigneeDossier, nom: string, texte: string, code: string): Promise<string> {
  const anciens: string[] = []
  for await (const x of d.values()) if (x.kind === 'file' && x.name !== nom && codeDuNom(x.name) === code) anciens.push(x.name)
  const h = await d.getFileHandle(nom, { create: true })
  const w = await h.createWritable()
  try { await w.write(new Blob([texte], { type: 'application/json' })); await w.close() } catch (e) { await w.abort?.().catch(() => {}); throw e }
  // L'ancien nom n'est retiré qu'une fois le nouveau fichier bien écrit
  for (const n of anciens) { try { await d.removeEntry?.(n) } catch { /* verrouillé par Google Drive pour ordinateur : il reste, le relais prend le plus récent */ } }
  return nom
}

// ---------- Où : le dossier proposé, ou celui qu'on a choisi ----------

/** Ce qui est retenu pour un classeur : le dossier choisi ; et pour son niveau
 *  (le dossier le plus haut de la bibliothèque), le Drive des élèves : on ne
 *  le choisit qu'une fois par niveau */
export interface ReglageReplay { poignee?: PoigneeDossier; compte?: string }
const reglage = (idClasseur: string) => 'replay-dossier:' + idClasseur
const reglageCompte = (classe: string) => 'replay-compte:' + classe

/** Le niveau d'un classeur : son dossier le plus haut dans la bibliothèque (null : à la racine) */
async function classeDe(registre: Registre, idClasseur: string): Promise<string | null> {
  const f = await registre.classeur(idClasseur).catch(() => undefined)
  if (!f || f.dossier === null) return null
  const chaine = remontee(f.dossier, await registre.dossiers())
  return chaine.length ? chaine[chaine.length - 1].id : null
}

export async function lireReglage(registre: Registre, idClasseur: string): Promise<ReglageReplay> {
  const x = await registre.reglage<ReglageReplay>(reglage(idClasseur)).catch(() => undefined)
  const r: ReglageReplay = x && typeof x === 'object' ? { poignee: x.poignee, compte: x.compte } : {}
  const classe = await classeDe(registre, idClasseur)
  const c = classe ? await registre.reglage<string>(reglageCompte(classe)).catch(() => undefined) : undefined
  if (typeof c === 'string' && c) r.compte = c
  return r
}

export async function retenirReglage(registre: Registre, idClasseur: string, r: ReglageReplay): Promise<void> {
  const classe = r.compte ? await classeDe(registre, idClasseur) : null
  // Le Drive se retient par niveau ; un classeur à la racine de la bibliothèque
  // n'en a pas : il le garde avec lui, dans sa propre clé (lot 16)
  const compte = r.compte && !classe ? r.compte : undefined
  // Le dossier n'est réécrit que s'il vient d'être choisi ; ce qui était déjà
  // retenu pour ce classeur (le dossier, le Drive) n'est jamais effacé
  if (r.poignee || compte) {
    const x = await registre.reglage<ReglageReplay>(reglage(idClasseur)).catch(() => undefined)
    const ancien: ReglageReplay = x && typeof x === 'object' ? x : {}
    const neuf: ReglageReplay = { ...ancien, ...(r.poignee ? { poignee: r.poignee } : {}), ...(compte ? { compte } : {}) }
    if (r.poignee || ancien.compte !== compte) await registre.ecrireReglage(reglage(idClasseur), neuf).catch(() => {})
  }
  if (classe && r.compte) await registre.ecrireReglage(reglageCompte(classe), r.compte).catch(() => {})
}

// ---------- Le résumé de la fenêtre (lot 16) ----------

/** Les deux (ou trois) lignes du résumé : la séance et ses pages, où le replay
 *  est rangé et pour quel Drive, et le titre quand le professeur en a donné
 *  un autre que le libellé de la séance (titre vide ou égal : pas de ligne) */
export function texteDuResume(o: { libelle: string; aujourdhui: boolean; pages: number; titre: string; chemin: string; drive: string }): { seance: string; lieu: string; titre: string | null } {
  const titre = o.titre.trim()
  return {
    seance: `${o.libelle}${o.aujourdhui ? ' (aujourd\'hui)' : ''} · ${o.pages} page${o.pages > 1 ? 's' : ''}`,
    lieu: `Rangé dans « ${o.chemin} » · ${o.drive}`,
    titre: titre && titre !== o.libelle ? `Titre pour les élèves : « ${titre} »` : null,
  }
}

/** Le dossier du chapitre quand le niveau est relié à un dossier de
 *  l'ordinateur (sinon null) : son chemin pour l'affichage, et de quoi
 *  l'ouvrir (créé s'il manque, au moment de publier) */
export interface Proposition { chemin: string; ouvrir(creer: boolean): Promise<PoigneeDossier | null> }
export async function dossierDuChapitre(registre: Registre, idClasseur: string): Promise<Proposition | null> {
  try {
    const f = await registre.classeur(idClasseur)
    if (!f || f.dossier === null) return null
    const [liste, dossiers] = await Promise.all([emplacements(registre), registre.dossiers()])
    const e = emplacementDe(f.dossier, 'ordinateur', liste, dossiers)
    if (!e) return null
    const racine = await registre.reglage<PoigneeDossier>(reglagePoignee(e.id))
    if (!racine) return null
    // Le même chemin que relierLesClasseurs : sous-dossiers du niveau, puis le dossier du chapitre
    const segments = [...sousDossiers(f.dossier, e.dossier, dossiers), nomSur(f.nom)].map(n => nomSur(n, { repli: 'Dossier' }))
    return {
      chemin: [racine.name, ...segments].join(' › '),
      async ouvrir(creer) {
        // L'accord d'écrire (Chrome le redemande après un redémarrage) : dans le clic
        if (creer && !await accordDuDossier(racine, true).catch(() => false)) return null
        let ici = racine
        for (const n of segments) {
          try { ici = await ici.getDirectoryHandle(n, { create: creer }) } catch { return null }
        }
        return ici
      },
    }
  } catch { return null }
}

/** Choisir un autre dossier de l'ordinateur, dans le clic ; null : on a renoncé */
export async function choisirLeDossier(): Promise<PoigneeDossier | null> {
  const d = await choisirUnDossier('mem-replays')
  if (!d) return null
  // Le choix vaut accord d'écrire ; on le vérifie tout de suite
  return await accordDuDossier(d, true).catch(() => false) ? d : null
}
