import 'katex/dist/katex.min.css'
import './style.css'
import { Tableau } from './document'
import { App } from './app'
import { UI } from './ui'
import { installerGardes } from './navigateur'

async function demarrer() {
  const zone = document.getElementById('zone')!
  const racine = document.getElementById('app')!
  // La base du navigateur où vit le tableau : ce nom ne change jamais,
  // sinon le professeur ne retrouverait plus ses pages
  const tableau = new Tableau('mem-tableau-local')
  const app = new App(tableau, zone)
  const ui = new UI(app, racine)
  // Le navigateur ne prend plus Ctrl + « + », F5 ni les gestes du tableau
  installerGardes(app)
  zone.dataset.outil = app.outil
  // Pour les tests automatiques, en développement seulement
  if (import.meta.env.DEV) Object.assign(window, { __app: app, __parties: (await import('./instruments')).partiesDuCompas, __construction: await import('./construction'), __auto: await import('./automatismes'), __katex: (await import('katex')).default, __menus: await import('./menus') })

  await tableau.charger()
  // La page qu'on regardait avant de recharger, si elle existe encore
  app.allerPage(app.pageDeDepart())
  // Un tableau vient d'être ouvert depuis un fichier : on le dit
  ui.sauvegarde.annoncerOuverture()
  // Que le navigateur ne vide pas la base pour faire de la place. Chrome, Edge
  // et Safari décident seuls, sans rien demander ; Firefox pose sa question.
  // Rien n'est montré ici : ce n'est pas une sauvegarde (voir « Enregistrer le tableau »).
  navigator.storage?.persisted?.().then(oui => oui || navigator.storage.persist()).catch(() => {})
}

demarrer()
