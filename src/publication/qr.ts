// =============================================================
// LE QR DU REPLAY
// Le lien du replay en QR, fabriqué ici, sans internet (la version hors
// ligne aussi) : les élèves le photographient avec leur téléphone en fin de
// cours. Un simple lien, l'élève ne se connecte à rien.
// - matriceQr : les modules du QR (vrai : noir), correction M (15 % du code
//   peut manquer : un reflet sur le tableau, un téléphone qui tremble) ;
// - svgQr : le QR en SVG (la fenêtre Publier, en petit) ;
// - peindreQr : le QR sur un canevas (la page de garde de la fiche) ;
// - ouvrirQrEnGrand : le QR en grand par-dessus le tableau. Une fenêtre à
//   part, jamais dans le replay ; Échap, un clic ou un appui la ferment.
// =============================================================
import qrcode from 'qrcode-generator'

/** La marge blanche autour du QR, en modules (la norme en veut 4 ; 2 se lisent bien sur un écran) */
const MARGE = 2

/** Les modules du QR de ce texte, ligne par ligne (vrai : noir) */
export function matriceQr(texte: string): boolean[][] {
  const q = qrcode(0, 'M')
  q.addData(unicodeEnOctets(texte), 'Byte')
  q.make()
  const n = q.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)))
}

/** La bibliothèque lit chaque caractère comme un octet : un lien porte
 *  parfois un accent (le nom d'une classe) ; on le donne en UTF-8 */
function unicodeEnOctets(texte: string): string {
  return String.fromCharCode(...new TextEncoder().encode(texte))
}

/** Le QR en SVG, carré de `taille` px, avec sa marge blanche */
export function svgQr(texte: string, taille: number, etiquette = 'QR du lien du replay'): string {
  const m = matriceQr(texte), n = m.length + 2 * MARGE
  let d = ''
  m.forEach((ligne, r) => ligne.forEach((noir, c) => { if (noir) d += `M${c + MARGE} ${r + MARGE}h1v1h-1z` }))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${taille}" height="${taille}" shape-rendering="crispEdges" role="img" aria-label="${etiquette.replace(/"/g, '&quot;')}">`
    + `<rect width="${n}" height="${n}" fill="#ffffff"/><path d="${d}" fill="#000000"/></svg>`
}

/** Le QR sur un canevas, carré de côté `cote` px, coin haut gauche en (x, y), marge comprise */
export function peindreQr(ctx: CanvasRenderingContext2D, texte: string, x: number, y: number, cote: number) {
  const m = matriceQr(texte), n = m.length + 2 * MARGE, k = cote / n
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, cote, cote)
  ctx.fillStyle = '#000000'
  m.forEach((ligne, r) => ligne.forEach((noir, c) => {
    if (noir) ctx.fillRect(Math.floor(x + (c + MARGE) * k), Math.floor(y + (r + MARGE) * k), Math.ceil(k), Math.ceil(k))
  }))
}

/** Le QR en grand par-dessus tout (la fenêtre Publier comprise) : une
 *  fenêtre modale à elle, au-dessus des autres. Échap, un clic ou un appui la
 *  ferment. Rend la fenêtre. */
export function ouvrirQrEnGrand(lien: string, titre: string): HTMLDialogElement {
  document.querySelector('dialog.qr-en-grand')?.remove()
  const d = document.createElement('dialog')
  d.className = 'qr-en-grand'
  d.setAttribute('aria-label', 'QR du replay')
  const cote = Math.max(160, Math.min(window.innerWidth * 0.8, window.innerHeight * 0.62, 560))
  d.innerHTML = `<div class="qr-carte"><p class="qr-titre"></p>${svgQr(lien, Math.round(cote))}
    <p class="qr-aide">Photographiez ce code avec votre téléphone</p></div>
    <p class="qr-fermer">Échap ou un clic pour fermer</p>`
  ;(d.querySelector('.qr-titre') as HTMLElement).textContent = titre
  document.body.appendChild(d)
  d.addEventListener('click', () => d.close())
  d.addEventListener('close', () => d.remove())
  d.showModal()
  return d
}
