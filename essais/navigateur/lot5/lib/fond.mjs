// Choisir le fond de la page comme le professeur, depuis le lot 5 (K8) : la
// liste déroulante de la barre du haut (<select class="choix-fond">) est
// devenue un bouton (button.choix-fond, la vignette du fond de la page) qui
// ouvre le menu des fonds en vignettes (.menu-fonds, une entrée
// .fond-choix[data-fond] par fond). Les essais d'avant qui choisissaient le
// fond par le select passent par ici : un clic sur le bouton, un clic sur la
// vignette, et l'on vérifie que la page a bien pris ce fond (rien d'affaibli :
// le select changeait le fond de la page, le menu aussi).
// Ce fichier est rangé dans lot5/lib, hors de lot5/*.mjs : la batterie lance
// d'elle-même tout fichier de lot5/*.mjs comme un essai.

/** Les fonds dans l'ordre de l'ancienne liste déroulante (selectOption({ index })) */
const ORDRE_AVANT = ['blanc', 'carreaux', 'seyes', 'repere']

/** Choisit le fond `fond` (son identifiant, ou { index } dans l'ordre de
 *  l'ancienne liste) par le bouton et le menu des fonds ; rend l'identifiant
 *  choisi. Lève une erreur si la page n'a pas pris ce fond. */
export async function choisirFond(page, fond) {
  const id = typeof fond === 'object' && fond !== null ? ORDRE_AVANT[fond.index] : fond
  if (!id) throw new Error(`choisirFond : fond inconnu ${JSON.stringify(fond)}`)
  const ouvert = () => page.evaluate(() => { const m = document.querySelector('.menu-fonds'); return !!m && !m.hidden })
  if (!(await ouvert())) await page.click('button.choix-fond')
  await page.waitForSelector('.menu-fonds:not([hidden])', { timeout: 5000 })
  await page.click(`.menu-fonds .fond-choix[data-fond="${id}"]`)
  await page.waitForFunction(i => window.__app ? window.__app.fond === i : document.querySelector('button.choix-fond')?.title?.length > 0, id, { timeout: 5000 })
  return id
}

/** Le fond que montre le bouton (son titre : « Fond de la page : … ») */
export function titreDuBoutonFond(page) {
  return page.getAttribute('button.choix-fond', 'title')
}
