// =============================================================
// LE REPLAY RANGÉ DANS UN DOSSIER DE L'ORDINATEUR
// Publier peut poser le fichier séance (« Titre [code].mem ») dans le dossier
// du chapitre sur l'ordinateur : une clé, un dossier, ou un dossier de Google
// Drive pour ordinateur (G:\Mon Drive\…), qui l'envoie ensuite sur le Drive.
// Le lien des élèves porte le code ; le relais du Drive retrouve le fichier
// par ce code, où qu'il soit rangé (relais/relais-seances.gs). L'outil ne se
// connecte pas à Google pour cela.
// Le dossier proposé est celui du chapitre quand la classe est reliée à un
// dossier de l'ordinateur (lot 7) ; un autre dossier choisi est retenu pour
// ce classeur, avec le Drive des élèves (« mem », « lfb », « lyfel »).
// Le début de ce fichier se teste sous Node (faux dossiers).
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

/** Ce qui est retenu pour un classeur : le dossier choisi ; et pour sa classe
 *  (le dossier le plus haut de la bibliothèque), le Drive des élèves : on ne
 *  le choisit qu'une fois par classe */
export interface ReglageReplay { poignee?: PoigneeDossier; compte?: string }
const reglage = (idClasseur: string) => 'replay-dossier:' + idClasseur
const reglageCompte = (classe: string) => 'replay-compte:' + classe

/** La classe d'un classeur : son dossier le plus haut dans la bibliothèque (null : à la racine) */
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
  // Le dossier n'est réécrit que s'il vient d'être choisi : inutile de recopier celui qui est déjà retenu
  if (r.poignee) await registre.ecrireReglage(reglage(idClasseur), { poignee: r.poignee }).catch(() => {})
  const classe = r.compte ? await classeDe(registre, idClasseur) : null
  if (classe && r.compte) await registre.ecrireReglage(reglageCompte(classe), r.compte).catch(() => {})
}

/** Le dossier du chapitre quand la classe est reliée à un dossier de
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
    // Le même chemin que relierLesClasseurs : sous-dossiers de la classe, puis le dossier du chapitre
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
