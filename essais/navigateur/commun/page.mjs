// Supprimer la page qu'on regarde, comme le professeur (lot 3 de l'audit) :
// la poubelle n'est plus dans la barre du haut ; « Supprimer la page »
// (« Effacer la page » quand elle est seule) est la dernière entrée, en
// rouge, du menu « Cette page », sous le bouton du fond.
export const BOUTON_PAGE = '.barre-haut .choix-fond'
export const ENTREE_SUPPRIMER = '.menu-fonds [data-action="supprimer-page"]'

/** Ouvre le menu « Cette page » (s'il ne l'est pas) et clique « Supprimer la page » */
export async function supprimerLaPage(page) {
  if (!(await page.locator(ENTREE_SUPPRIMER).isVisible().catch(() => false))) await page.click(BOUTON_PAGE)
  await page.click(ENTREE_SUPPRIMER)
}

/** Le libellé de l'entrée (« Supprimer la page » ou « Effacer la page ») : le
 *  menu ouvert le temps de le lire, puis refermé par Échap */
export async function libelleSupprimer(page) {
  await page.click(BOUTON_PAGE)
  const t = await page.locator(`${ENTREE_SUPPRIMER} .libelle`).evaluate(e => e.firstChild?.textContent ?? '')
  await page.keyboard.press('Escape')
  return t
}
