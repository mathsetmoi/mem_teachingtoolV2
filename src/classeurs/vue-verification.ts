// =============================================================
// LA FENÊTRE « VÉRIFIER LES CLASSEURS » (lot 17)
// Au menu ⋯ du bandeau de la bibliothèque, après « Enregistrer toute la
// bibliothèque… » : une fenêtre de la bibliothèque (comme « Récupérer une
// sauvegarde du Drive » : Échap, « Fermer », un appui sur le fond). La
// vérification démarre à l'ouverture : la ligne d'état avance (« Vérification…
// 12 classeurs sur 30 »), puis la liste des classeurs auxquels il manque
// des images, chacun avec le détail (où elles se retrouvent, ce qui est
// introuvable) et son bouton « Réparer » ; « Tout réparer » en bas répare
// chaque ligne l'une après l'autre. Rien à réparer : la ligne d'état le dit,
// seul « Fermer » reste. Pendant « Réparation… », la fenêtre attend la fin
// de la ligne en cours avant de se fermer. Des boutons de 44 px, Tab de
// « Réparer » en « Réparer » puis « Tout réparer » et « Fermer » ; au
// téléphone, chaque ligne s'empile et le bouton prend toute la largeur.
// Le travail : verification.ts (le service) et verifier.ts (le calcul).
// =============================================================
import type { Bibliotheque } from './bibliotheque'
import type { Verification } from './verification'
import type { LigneBilan } from './verifier'
import { AIDE_VERIFIER, VERIFIER_LES_CLASSEURS, bilan, texteBilan, texteIntrouvable, texteLigne, texteRemises, texteRepare, texteVerification } from './verifier'
import { entreeMenu } from '../menus'
import { fermerSurLeFond } from '../dialogue'

export const TITRE_VERIFIER = 'Vérifier les classeurs'
export const EXPLICATION_VERIFIER = 'Les images de chaque classeur sont rangées avec lui. Quand une image manque, la page montre un cadre gris. On la cherche dans les autres classeurs de ce navigateur, la corbeille comprise.'

/** « Vérifier les classeurs… » au menu ⋯ du bandeau, et le garde-fou de la
 *  corbeille (b.verification) ; message : le message du bas ; rend ce qui
 *  ouvre la fenêtre (le bouton du message à l'ouverture d'un classeur) */
export function brancherVerification(b: Bibliotheque, v: Verification, message: (texte: string) => void): () => void {
  b.verification = v
  const ouvrir = () => void ouvrirVerification(v, message)
  b.menuDuBandeau.push(m => {
    entreeMenu(m, VERIFIER_LES_CLASSEURS, ouvrir, { action: 'verifier-classeurs', aide: AIDE_VERIFIER })
  })
  return ouvrir
}

interface Ligne { el: HTMLLIElement; ligne: LigneBilan; detail: HTMLElement; erreur: HTMLElement; bouton: HTMLButtonElement | null }

/** La fenêtre : la vérification démarre tout de suite */
export async function ouvrirVerification(v: Verification, message: (texte: string) => void): Promise<void> {
  if (document.querySelector('dialog[open]')) return
  const d = document.createElement('dialog')
  d.className = 'dialogue dialogue-verification'
  d.setAttribute('aria-labelledby', 'titre-verification')
  d.innerHTML = `<h2 id="titre-verification"></h2><div class="corps">
    <p class="v-explication"></p>
    <p class="v-etat" role="status" aria-live="polite"></p>
    <ul class="v-liste" aria-label="Les classeurs auxquels il manque des images" hidden></ul>
    <div class="actions"><button type="button" class="principal v-tout" hidden>Tout réparer</button><button type="button" class="secondaire v-fermer">Fermer</button></div></div>`
  const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
  q('h2').textContent = TITRE_VERIFIER
  q('.v-explication').textContent = EXPLICATION_VERIFIER
  const etat = q('.v-etat'), liste = q<HTMLUListElement>('.v-liste'), tout = q<HTMLButtonElement>('.v-tout'), fermer = q<HTMLButtonElement>('.v-fermer')
  const lignes: Ligne[] = []
  /** Une réparation en cours : la fenêtre attend sa fin pour se fermer */
  let occupe = false
  let fermerApres = false
  let ouverte = true

  const regler = () => {
    const reparables = lignes.filter(l => l.bouton && !l.bouton.disabled)
    tout.hidden = reparables.length < 1
    tout.disabled = occupe
    fermer.disabled = occupe
  }
  const demanderFermeture = () => { if (occupe) fermerApres = true; else d.close() }

  /** Répare une ligne : le bouton grisé « Réparation… », puis le détail en
   *  vert (le bouton s'en va), ou l'erreur en rouge (le bouton reste) */
  const reparer = async (l: Ligne) => {
    if (!l.bouton || occupe) return
    occupe = true
    const b = l.bouton
    b.disabled = true
    b.textContent = 'Réparation…'
    l.erreur.textContent = ''
    l.el.classList.remove('en-erreur')
    regler()
    const r = await v.reparer(l.ligne, d).catch(e => ({ remises: 0, depuis: [] as string[], erreur: e instanceof Error && e.message ? e.message : 'La réparation n\'a pas pu se faire.' }))
    occupe = false
    if (!ouverte) return
    if (r.erreur) {
      l.erreur.textContent = r.erreur
      l.el.classList.add('en-erreur')
      b.disabled = false
      b.textContent = 'Réparer'
    } else {
      l.detail.textContent = texteRepare(r.remises, l.ligne.manquantes.length - r.remises)
      l.el.classList.add('reparee')
      const suivant = b.nextElementSibling
      b.remove()
      l.bouton = null
      if (document.activeElement === document.body || !d.contains(document.activeElement)) {
        const prochain = lignes.find(x => x.bouton)?.bouton ?? (suivant instanceof HTMLElement ? suivant : fermer)
        prochain.focus()
      }
      if (r.remises) message(texteRemises(r.remises, l.ligne.nom, r.depuis))
    }
    regler()
    if (fermerApres) d.close()
  }

  const creerLigne = (ligne: LigneBilan): Ligne => {
    const el = document.createElement('li')
    el.className = 'v-ligne'
    el.dataset.id = ligne.id
    const texte = Object.assign(document.createElement('div'), { className: 'v-texte' })
    const nom = Object.assign(document.createElement('span'), { className: 'v-nom', textContent: ligne.nom })
    if (ligne.chemin) nom.append(Object.assign(document.createElement('span'), { className: 'v-chemin', textContent: ` — ${ligne.chemin}` }))
    const detail = Object.assign(document.createElement('span'), { className: 'v-detail', textContent: texteLigne(ligne) })
    texte.append(nom, detail)
    if (ligne.illisible) el.classList.add('illisible')
    if (!ligne.illisible && ligne.introuvables.length) texte.append(Object.assign(document.createElement('small'), { className: 'v-aide', textContent: texteIntrouvable(ligne.introuvables.length) }))
    const erreur = Object.assign(document.createElement('span'), { className: 'v-erreur', role: 'alert' })
    texte.append(erreur)
    el.append(texte)
    let bouton: HTMLButtonElement | null = null
    if (ligne.retrouvables.length) {
      bouton = Object.assign(document.createElement('button'), { type: 'button', className: 'secondaire v-reparer', textContent: 'Réparer' })
      bouton.setAttribute('aria-label', `Réparer « ${ligne.nom} »`)
      el.append(bouton)
    }
    const l: Ligne = { el, ligne, detail, erreur, bouton }
    bouton?.addEventListener('click', () => void reparer(l))
    return l
  }

  tout.addEventListener('click', async () => {
    if (occupe) return
    for (const l of lignes) {
      if (!ouverte || fermerApres) break
      if (l.bouton) await reparer(l)
    }
  })
  fermer.addEventListener('click', demanderFermeture)
  d.addEventListener('cancel', e => { if (occupe) { e.preventDefault(); fermerApres = true } })
  d.addEventListener('close', () => { ouverte = false; d.remove() })
  fermerSurLeFond(d, demanderFermeture)
  document.body.appendChild(d)
  d.showModal()
  fermer.focus()

  // La vérification, tout de suite
  etat.textContent = texteVerification(0, 0)
  let classeurs
  try {
    classeurs = await v.inventaires((fait, total) => { if (ouverte) etat.textContent = texteVerification(fait, total) })
  } catch {
    if (ouverte) { etat.textContent = 'La bibliothèque n\'a pas pu être lue.'; etat.classList.add('erreur') }
    return
  }
  if (!ouverte) return
  const b = bilan(classeurs)
  etat.textContent = texteBilan(b)
  for (const ligne of b.lignes) { const l = creerLigne(ligne); lignes.push(l); liste.append(l.el) }
  liste.hidden = !lignes.length
  regler()
  const premier = lignes.find(l => l.bouton)?.bouton
  if (premier && (document.activeElement === fermer || !d.contains(document.activeElement))) premier.focus()
}
