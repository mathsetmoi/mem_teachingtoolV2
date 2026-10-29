// =============================================================
// UN DOSSIER DE L'ORDINATEUR RELIÉ À UN NIVEAU (lot 7)
// Chrome et Edge savent choisir un dossier (showDirectoryPicker) et y
// écrire ; ailleurs (Firefox, Safari, l'iPad), on choisit des fichiers.
// Relier un niveau à un dossier : chacun de ses classeurs y prend un
// fichier à son nom, dans un dossier à lui (« Fractions / Fractions.memc »,
// rangé dans les mêmes sous-dossiers que dans la bibliothèque : le dossier
// du chapitre), qui devient le fichier de sa clé (cle.ts) : il
// s'y écrit peu après chaque changement, avec tous ses garde-fous. Un
// classeur qui a déjà le fichier de sa clé ailleurs le garde, et un fichier
// du même classeur déjà là, à plat (le rangement d'avant), est repris où il est.
//
// Jamais rien d'écrasé :
// - un fichier du même classeur, qui n'a rien de plus que la bibliothèque
//   (le dossier rouvert le matin sur le poste remis à zéro, juste ouvert
//   dans la bibliothèque), devient tel quel le fichier de la clé ;
// - un fichier du même classeur qui a des changements que la bibliothèque
//   n'a pas n'est pas touché (le dire : l'ouvrir d'abord) ;
// - un fichier qui n'est pas à lui : le classeur prend un autre nom
//   (« Fractions (2).memc »).
// =============================================================
import type { PoigneeFichier } from './cle'
import { ecrireLeNeuf, memeFichier, permission } from './cle'
import type { FicheClasseur } from './demarrage'
import type { Registre } from './registre'
import { classeursDeLaClasse, nomDeFichierLibre, sousDossiers } from './emplacements'
import { ecrivain } from './ecrivain'
import { comparerVecteurs } from './vecteurs'
import { EXTENSION_TABLEAU, nomSur } from '../fichier'

/** Ce qu'on utilise d'un FileSystemDirectoryHandle (Chrome, Edge) */
export interface PoigneeDossier {
  readonly kind: 'directory'
  readonly name: string
  getDirectoryHandle(nom: string, o?: { create?: boolean }): Promise<PoigneeDossier>
  getFileHandle(nom: string, o?: { create?: boolean }): Promise<PoigneeFichier>
  values(): AsyncIterable<{ kind: 'file' | 'directory'; name: string }>
  queryPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>
  isSameEntry?(autre: unknown): Promise<boolean>
  /** Retirer un fichier du dossier (le replay d'avant, sous un autre titre) */
  removeEntry?(nom: string): Promise<void>
}

/** Ce navigateur sait choisir un dossier et y écrire (Chrome, Edge) */
export const choisitUnDossier = () => typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'

/** Le choix du dossier, dans le clic ; null : on a renoncé. `id` : le navigateur
 *  rouvre le dernier dossier choisi sous ce nom (un par usage). */
export async function choisirUnDossier(id = 'mem-classes'): Promise<PoigneeDossier | null> {
  const choisir = (window as unknown as { showDirectoryPicker?: (o: unknown) => Promise<PoigneeDossier> }).showDirectoryPicker
  if (typeof choisir !== 'function') return null
  try { return await choisir.call(window, { id, mode: 'readwrite' }) } catch (e) {
    if ((e as { name?: string } | null)?.name === 'AbortError') return null
    throw e
  }
}

/** L'accord d'écrire dans le dossier ; demander : dans un clic seulement */
export async function accordDuDossier(d: PoigneeDossier, demander: boolean): Promise<boolean> {
  return await permission(d as unknown as PoigneeFichier, demander) === 'granted'
}

/** Un classeur (ou une bibliothèque) trouvé dans le dossier ; chemin : ses
 *  sous-dossiers */
export interface FichierDuDossier { fichier: File; poignee: PoigneeFichier; chemin: string[] }

/** Les .memc et .memb du dossier et de ses sous-dossiers (jusqu'à
 *  `profondeur`), sans les fichiers cachés */
export async function lireLeDossier(d: PoigneeDossier, profondeur = 4, chemin: string[] = []): Promise<FichierDuDossier[]> {
  const trouves: FichierDuDossier[] = []
  for await (const x of d.values()) {
    if (x.name.startsWith('.')) continue
    if (x.kind === 'directory') {
      if (profondeur > 0) trouves.push(...await lireLeDossier(x as unknown as PoigneeDossier, profondeur - 1, [...chemin, x.name]))
      continue
    }
    if (!/\.mem[cb]$/i.test(x.name)) continue
    const poignee = x as unknown as PoigneeFichier
    try { trouves.push({ fichier: await poignee.getFile(), poignee, chemin }) } catch { /* illisible : on passe */ }
  }
  return trouves.sort((a, b) => [...a.chemin, a.fichier.name].join('/').localeCompare([...b.chemin, b.fichier.name].join('/'), 'fr', { numeric: true }))
}

/** Ce qu'a fait le lien : des noms de classeurs */
export interface BilanRelier {
  /** Écrits dans un fichier neuf du dossier */
  ecrits: string[]
  /** Leur fichier était déjà là, à jour : il devient celui de la clé */
  adoptes: string[]
  /** Leur fichier du dossier a des changements que la bibliothèque n'a pas */
  plusRiches: string[]
  /** Ils gardent le fichier de leur clé, ailleurs */
  ailleurs: string[]
  echecs: string[]
  /** Ce qui a empêché le dernier échec, pour le dire (sans point final) */
  raison?: string
}

/** La raison d'une erreur, pour un message (sans point final) */
const raisonDe = (e: unknown) => (e instanceof Error ? e.message.trim().replace(/\.$/, '') : '') || 'erreur inconnue'

/** Les noms déjà pris dans un dossier */
async function nomsDe(d: PoigneeDossier): Promise<string[]> {
  const n: string[] = []
  for await (const x of d.values()) n.push(x.name)
  return n
}

/** Relie les classeurs du niveau `classe` au dossier `d` (voir plus
 *  haut). avantDEcrire : le classeur de cet onglet écrit d'abord ce qui
 *  attend dans sa base ; progres : « 3 sur 12 » */
export async function relierLesClasseurs(registre: Registre, d: PoigneeDossier, classe: string, o: {
  avantDEcrire?: (f: FicheClasseur) => Promise<void>; progres?: (n: number, total: number) => void
  /** Les dossiers au-dessus de `d`, pour le chemin noté dans la fiche
   *  (fiche.cle.chemin) : « LFB classeurs › 2 » quand le dossier du niveau
   *  est dans celui d'un établissement ; par défaut, le nom de `d` seul */
  prefixe?: string[]
  /** Seulement ces classeurs du niveau (par id) ; absent : tous */
  seulement?: readonly string[]
  /** Le niveau change de dossier (« Changer… », lot 18) : un classeur dont
   *  le fichier de la clé n'est pas dans `d` en reçoit un ici (son ancien
   *  fichier reste où il est, intact) au lieu de le garder ailleurs */
  reprendre?: boolean
} = {}): Promise<BilanRelier> {
  const [fiches, dossiers] = await Promise.all([registre.classeurs(), registre.dossiers()])
  let classeurs = classeursDeLaClasse(classe, fiches, dossiers)
  if (o.seulement) classeurs = classeurs.filter(f => o.seulement!.includes(f.id))
  const prefixe = o.prefixe ?? [d.name]
  const bilan: BilanRelier = { ecrits: [], adoptes: [], plusRiches: [], ailleurs: [], echecs: [] }
  const sous = new Map<string, { d: PoigneeDossier; noms: string[] }>() // les dossiers déjà ouverts, par chemin
  /** Le dossier de ce chemin sous le dossier relié ; `creer` faux : null s'il n'existe pas encore */
  const dossierPour = async (chemin: string[], creer = true): Promise<{ d: PoigneeDossier; noms: string[] } | null> => {
    const cle = chemin.join('/')
    let x = sous.get(cle)
    if (x) return x
    let ici = d
    for (const n of chemin) {
      try { ici = await ici.getDirectoryHandle(nomSur(n, { repli: 'Dossier' }), { create: creer }) } catch (e) { if (creer) throw e; return null }
    }
    x = { d: ici, noms: await nomsDe(ici) }
    sous.set(cle, x)
    return x
  }
  for (let k = 0; k < classeurs.length; k++) {
    const f = classeurs[k]
    o.progres?.(k + 1, classeurs.length)
    try {
      // Un classeur qui a déjà sa clé la garde (ici ou ailleurs)
      const deja = f.cle ? await registre.poignee<PoigneeFichier>(f.id).catch(() => undefined) : undefined
      const sous = sousDossiers(f.dossier, classe, dossiers)
      const base = nomSur(f.nom)
      /** Le chemin noté dans la fiche pour un fichier rangé à `chemin` sous `d` */
      const cheminNote = (chemin: string[]) => [...prefixe, ...chemin.map(n => nomSur(n, { repli: 'Dossier' }))]
      if (deja) {
        // Il peut être dans le dossier de son chapitre, ou à plat (le rangement d'avant)
        let lie = false
        for (const chemin of [[...sous, base], sous]) {
          const ici = await dossierPour(chemin, false)
          if (ici && await ici.d.getFileHandle(deja.name).then(h => memeFichier(h, deja)).catch(() => false)) {
            lie = true
            // Un fichier rangé avant ce chantier : la fiche apprend son chemin
            if (!f.cle?.chemin) await registre.modifierClasseur(f.id, x => { if (x.cle && !x.cle.chemin) x.cle = { ...x.cle, chemin: cheminNote(chemin) } }).catch(() => {})
            break
          }
        }
        if (lie) continue
        if (!o.reprendre) { bilan.ailleurs.push(f.nom); continue }
        // Le niveau change de dossier : il reçoit un fichier ici (le sien, ailleurs, reste)
      }
      const prevu = base + EXTENSION_TABLEAU
      // Un fichier de ce classeur déjà là (dans le dossier de son chapitre, ou à plat) est repris tel quel
      let adopte = false
      for (const chemin of [[...sous, base], sous]) {
        const ici = await dossierPour(chemin, false)
        const nomLa = ici?.noms.find(n => n.toLocaleLowerCase('fr') === prevu.toLocaleLowerCase('fr'))
        if (!ici || !nomLa) continue
        const r = await adopterSiLeMeme(registre, f, await ici.d.getFileHandle(nomLa), cheminNote(chemin))
        if (r === 'adopte') { bilan.adoptes.push(f.nom); adopte = true; break }
        if (r === 'plus-riche') { bilan.plusRiches.push(f.nom); adopte = true; break }
      }
      if (adopte) continue
      // Un fichier neuf, dans le dossier de son chapitre, à un nom libre
      const ici = (await dossierPour([...sous, base]))!
      const nom = nomDeFichierLibre(base, EXTENSION_TABLEAU, ici.noms)
      const h = await ici.d.getFileHandle(nom, { create: true })
      ici.noms.push(nom)
      await o.avantDEcrire?.(f)
      const r = await ecrireLeNeuf(registre, h, { id: f.id, base: f.base, nom: f.nom, chemin: cheminNote([...sous, base]) })
      if (r.date === null) { bilan.echecs.push(f.nom); bilan.raison = r.message.trim().replace(/\.$/, '') || 'erreur inconnue' } else bilan.ecrits.push(f.nom)
    } catch (e) { bilan.echecs.push(f.nom); bilan.raison = raisonDe(e) }
  }
  return bilan
}

/** Le fichier du dossier est-il celui de ce classeur, sans rien de plus que
 *  sa base ? Alors il devient le fichier de sa clé tel quel (sa date et son
 *  vecteur notés, comme une écriture d'ici ; chemin : où il est rangé). */
export async function adopterSiLeMeme(registre: Registre, f: FicheClasseur, h: PoigneeFichier, chemin?: string[]): Promise<'adopte' | 'plus-riche' | 'autre'> {
  const fichier = await h.getFile()
  if (!fichier.size) return 'autre'
  let lu
  try { lu = await ecrivain.lireFichier(fichier) } catch { return 'autre' }
  if (lu.entete.id !== f.id) return 'autre'
  const { vecteur } = await ecrivain.vecteurDeLaBase(f.base)
  const c = comparerVecteurs(vecteur, lu.vecteur)
  if (c !== 'egal' && c !== 'contient') return 'plus-riche'
  await registre.garderPoignee(f.id, h)
  await registre.modifierClasseur(f.id, x => { x.cle = { nom: h.name, t: Date.now(), date: lu.entete.date, taille: fichier.size, vecteur: lu.vecteur, ...(chemin ? { chemin } : {}) } })
  return 'adopte'
}
