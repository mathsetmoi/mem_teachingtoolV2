// =============================================================
// LA FICHE POUR UN ÉLÈVE ABSENT
// Un bouton de Publier : un PDF (une page de garde, puis les pages de la
// séance, comme « Exporter en PDF ») et le message pour l'ENT, copié, à
// coller avec le PDF joint. Rien n'est envoyé par l'outil.
// La page de garde : la date et le chapitre, « Ce qu'on a fait » (le texte
// du cahier de textes de Publier, sans ses marques **gras** et __souligné__),
// le lien du replay et son QR (seulement si la séance a un lien).
// Ce fichier : le texte (pur, testé sous Node) et la peinture de la page de
// garde (un canevas).
// =============================================================
import type { Papier } from '../sorties/mise-en-page'
import { PX_PAR_MM, DPR_PDF } from '../sorties/mise-en-page'
import { peindreQr } from './qr'

export interface FicheAbsent {
  /** « lundi 16 novembre » */
  jour: string
  /** Le classeur (le chapitre) */
  chapitre: string
  /** Le titre de la séance (celui que les élèves voient) */
  titre: string
  /** Le texte du cahier de textes ('' : aucun) */
  texte: string
  /** Le lien du replay (null : la séance n'est pas encore publiée) */
  lien: string | null
}

/** Le texte du cahier de textes sans les marques de Pronote (**gras**,
 *  __souligné__), et sans le lien déjà ajouté (il a sa place à part) */
export function texteSansMarques(texte: string): string {
  return texte.replace(/\*\*(.+?)\*\*/gs, '$1').replace(/__(.+?)__/gs, '$1')
    .split('\n').map(l => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Le message pour l'ENT, à coller (le PDF se joint à part) */
export function messageEleveAbsent(f: FicheAbsent): string {
  const lignes = ['Bonjour,', `Voici ce que nous avons fait le ${f.jour}${f.chapitre.trim() ? ` (${f.chapitre.trim()})` : ''} :`]
  const texte = texteSansMarques(f.texte)
  lignes.push(texte || f.titre)
  lignes.push('')
  if (f.lien) lignes.push(`Pour revoir la séance : ${f.lien}`)
  lignes.push('Les pages du tableau sont dans le PDF joint.')
  return lignes.join('\n')
}

/** Le nom du PDF : « Séance du 16 novembre - Fonctions affines.pdf » */
export function nomDeLaFiche(jourCourt: string, chapitre: string): string {
  const propre = (t: string) => t.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
  const c = propre(chapitre)
  return `${propre(`Séance du ${jourCourt}`)}${c ? ` - ${c}` : ''}.pdf`.slice(0, 120)
}

/** Coupe un texte en lignes qui tiennent dans `largeur` (mesurées par `mesure`) */
export function couperEnLignes(texte: string, largeur: number, mesure: (t: string) => number): string[] {
  const sortie: string[] = []
  for (const paragraphe of texte.split('\n')) {
    if (!paragraphe.trim()) { sortie.push(''); continue }
    let ligne = ''
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      const essai = ligne ? `${ligne} ${mot}` : mot
      if (!ligne || mesure(essai) <= largeur) { ligne = essai; continue }
      sortie.push(ligne); ligne = mot
    }
    if (ligne) sortie.push(ligne)
  }
  return sortie
}

/** Peint la page de garde sur la feuille (portrait, déjà blanche) */
export function peindrePageDeGarde(x: CanvasRenderingContext2D, pap: Papier, f: FicheAbsent, police: string) {
  const s = DPR_PDF, mm = PX_PAR_MM * s
  const gauche = 20 * mm, largeur = pap.px.l - 40 * mm
  let y = 26 * mm
  const ecrire = (t: string, taille: number, gras = false, couleur = '#1b2230') => {
    x.font = `${gras ? '700 ' : ''}${taille * s}px ${police}`
    x.fillStyle = couleur
    x.fillText(t, gauche, y)
  }
  x.textBaseline = 'alphabetic'
  ecrire(`Séance du ${f.jour}`, 26, true); y += 11 * mm
  if (f.chapitre.trim()) { ecrire(f.chapitre.trim(), 17, false, '#5a6577'); y += 9 * mm }
  if (f.titre.trim() && f.titre.trim() !== f.chapitre.trim()) { ecrire(f.titre.trim(), 15, false, '#5a6577'); y += 9 * mm }
  y += 6 * mm
  ecrire('Ce qu\'on a fait', 17, true); y += 9 * mm
  x.font = `${14 * s}px ${police}`
  const texte = texteSansMarques(f.texte) || 'Les pages du tableau sont à la suite.'
  const lignes = couperEnLignes(texte, largeur, t => x.measureText(t).width)
  const pas = 7.4 * mm, basTexte = pap.px.h - (f.lien ? 95 : 30) * mm
  for (const l of lignes) {
    if (y > basTexte) { ecrire('…', 14); y += pas; break }
    if (l) ecrire(l, 14)
    y += l ? pas : pas / 2
  }
  if (f.lien) {
    y = Math.max(y + 8 * mm, pap.px.h - 85 * mm)
    const cote = 52 * mm
    peindreQr(x, f.lien, gauche - 2 * mm, y, cote)
    const g2 = gauche + cote + 6 * mm
    x.font = `700 ${17 * s}px ${police}`; x.fillStyle = '#1b2230'
    x.fillText('Revoir la séance', g2, y + 12 * mm)
    x.font = `${12 * s}px ${police}`; x.fillStyle = '#3b6fb6'
    const morceaux = couperEnLignes(f.lien.replace(/([/?&=])/g, '$1 '), pap.px.l - g2 - 20 * mm, t => x.measureText(t).width)
    morceaux.slice(0, 5).forEach((m, i) => x.fillText(m.replace(/ /g, ''), g2, y + (21 + i * 6.5) * mm))
    x.font = `${12 * s}px ${police}`; x.fillStyle = '#5a6577'
    x.fillText('Avec le téléphone : photographiez le code.', g2, y + 48 * mm)
  } else {
    x.font = `${12 * s}px ${police}`; x.fillStyle = '#5a6577'
    x.fillText('Le replay de la séance n\'est pas encore publié.', gauche, pap.px.h - 30 * mm)
  }
}
