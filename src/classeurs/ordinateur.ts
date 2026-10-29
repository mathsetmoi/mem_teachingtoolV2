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
import { comparerVecteurs, verdictAncienFichier } from './vecteurs'
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
  /** Le chemin d'un fichier ou d'un dossier sous celui-ci (null : il n'y est pas) */
  resolve?(h: unknown): Promise<string[] | null>
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

/** L'accord de LIRE dans le dossier (le dossier que quitte un niveau : ses
 *  fichiers sont relus avant d'être laissés, lot 18) ; demander : dans un
 *  clic seulement, et alors on demande tout de suite, comme permission()
 *  (un accord déjà donné revient sans rien montrer). Un refus ne bloque
 *  rien : le classeur garde alors son fichier d'avant (BilanRelier.aRelire). */
export async function accordDeLire(d: PoigneeDossier, demander: boolean): Promise<boolean> {
  const h = d as unknown as { queryPermission?(o: { mode: string }): Promise<PermissionState>; requestPermission?(o: { mode: string }): Promise<PermissionState> }
  try {
    if (demander) return typeof h.requestPermission === 'function' ? await h.requestPermission({ mode: 'read' }) === 'granted' : true
    return typeof h.queryPermission === 'function' ? await h.queryPermission({ mode: 'read' }) === 'granted' : true
  } catch { return false }
}

/** Le fichier (sa poignée) est-il dans ce dossier ? (resolve ; sans lui : non) */
async function dansLeDossier(d: PoigneeDossier, h: unknown): Promise<boolean> {
  try { return typeof d.resolve === 'function' && !!h && (await d.resolve(h)) !== null } catch { return false }
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
  /** Déjà à leur place : le fichier de leur clé est ici (rien à faire) */
  relies: string[]
  /** Le niveau change de dossier, mais leur fichier d'avant n'a pas pu être
   *  relu (pas d'accord pour le lire, un fichier abîmé) : dans le doute, ils
   *  le gardent ; à ouvrir, puis « Mettre à jour » */
  aRelire: string[]
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
  /** Le niveau change de dossier (« Changer… », « Mettre à jour », lot 18) :
   *  un classeur dont le fichier de la clé n'est pas dans `d`, mais que
   *  l'outil avait rangé lui-même (la fiche en a le chemin, ou il est dans
   *  `ancien`), en reçoit un ici, une fois son ancien fichier relu : la base
   *  a tout ce qu'il a. L'ancien fichier reste où il est, intact. Plus riche
   *  que la base, ou illisible, il reste le fichier du classeur (plusRiches,
   *  aRelire). Un fichier choisi à la main reste celui du classeur (ailleurs). */
  reprendre?: boolean
  /** Le dossier que le niveau quitte (« Changer… ») : un fichier qu'il
   *  contient est à l'outil, même sans chemin dans la fiche (le lot 7) */
  ancien?: PoigneeDossier
} = {}): Promise<BilanRelier> {
  const [fiches, dossiers] = await Promise.all([registre.classeurs(), registre.dossiers()])
  let classeurs = classeursDeLaClasse(classe, fiches, dossiers)
  if (o.seulement) classeurs = classeurs.filter(f => o.seulement!.includes(f.id))
  const prefixe = o.prefixe ?? [d.name]
  const bilan: BilanRelier = { ecrits: [], adoptes: [], plusRiches: [], ailleurs: [], relies: [], aRelire: [], echecs: [] }
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
        if (lie) { bilan.relies.push(f.nom); continue }
        // Le fichier de sa clé est ailleurs : il y reste (lot 7), sauf quand le
        // niveau change de dossier et que ce fichier est à l'outil (rangé par
        // lui : la fiche en a le chemin ; ou dans le dossier quitté). Un fichier
        // choisi à la main reste celui du classeur.
        const aLOutil = !!f.cle?.chemin || (o.ancien ? await dansLeDossier(o.ancien, deja) : false)
        if (!o.reprendre || !aLOutil) { bilan.ailleurs.push(f.nom); continue }
        // L'ancien fichier est relu d'abord : plus riche que la base, ou
        // illisible, il reste le fichier du classeur ; sinon le classeur reçoit
        // son fichier ici (l'ancien reste où il est, intact)
        const v = await relireLAncien(deja, f)
        if (v === 'plus-riche') { bilan.plusRiches.push(f.nom); continue }
        if (v === 'illisible') { bilan.aRelire.push(f.nom); continue }
        // Le classeur de cet onglet : ce qui attend s'écrit dans sa base, et sa
        // clé se tient tranquille pendant que son fichier change de place
        await o.avantDEcrire?.(f)
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
      if (r.date === null) {
        bilan.echecs.push(f.nom); bilan.raison = r.message.trim().replace(/\.$/, '') || 'erreur inconnue'
        // Un classeur qui avait son fichier le garde : sa poignée et sa fiche
        // d'avant reviennent (ecrireLeNeuf les avait remplacées, comme pour
        // un classeur neuf), et le fichier vide créé ici repart
        if (deja && f.cle) {
          const ancienne = f.cle
          await registre.garderPoignee(f.id, deja).catch(() => {})
          await registre.modifierClasseur(f.id, x => { x.cle = ancienne }).catch(() => {})
          await ici.d.removeEntry?.(nom).catch(() => {})
          ici.noms = ici.noms.filter(n => n !== nom)
        }
      } else bilan.ecrits.push(f.nom)
    } catch (e) { bilan.echecs.push(f.nom); bilan.raison = raisonDe(e) }
  }
  return bilan
}

/** L'ancien fichier de la clé d'un classeur dont le niveau change de dossier,
 *  relu avant d'être laissé où il est (voir verdictAncienFichier) ; 'illisible' :
 *  ce navigateur n'a pas pu le lire (pas d'accord de lecture, un fichier
 *  abîmé, une poignée sans méthodes) : dans le doute, il reste le fichier du
 *  classeur. Un fichier disparu, ou vide, n'a rien à garder : 'pareil'. */
async function relireLAncien(p: PoigneeFichier, f: FicheClasseur): Promise<'pareil' | 'plus-riche' | 'illisible'> {
  let fichier: File
  try { fichier = await p.getFile() } catch (e) { return (e as { name?: string } | null)?.name === 'NotFoundError' ? 'pareil' : 'illisible' }
  if (!fichier.size) return 'pareil'
  let lu: { entete: { id?: string }; vecteur: Uint8Array }
  try { lu = await ecrivain.lireFichier(fichier) } catch { return 'illisible' }
  const { vecteur } = await ecrivain.vecteurDeLaBase(f.base)
  return verdictAncienFichier({ id: lu.entete.id, vecteur: lu.vecteur }, f.id, vecteur)
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
