// =============================================================
// RANGER LES MÉTHODES D'UNE CLASSE DANS PLUSIEURS FICHIERS
// Les grandes classes (App, UI, Bibliotheque) gardent dans leur fichier
// leurs champs et leur constructeur ; leurs méthodes sont rangées par
// sujet dans un dossier à côté, chacune dans un objet dont les méthodes
// prennent `this` du type de la classe. ajouterMethodes les pose sur le
// prototype de la classe, exactement comme si elles y étaient écrites :
// non énumérables, appelées sur l'objet (this), rien ne change à l'écran.
// =============================================================

/** Pose les méthodes de chaque lot sur le prototype de la classe */
export function ajouterMethodes(classe: { prototype: object }, ...lots: object[]): void {
  for (const lot of lots) {
    for (const [nom, d] of Object.entries(Object.getOwnPropertyDescriptors(lot))) {
      if (Object.prototype.hasOwnProperty.call(classe.prototype, nom)) throw new Error(`ajouterMethodes : « ${nom} » existe déjà`)
      Object.defineProperty(classe.prototype, nom, { ...d, enumerable: false })
    }
  }
}
