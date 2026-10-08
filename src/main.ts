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
  new UI(app, racine)
  // Le navigateur ne prend plus Ctrl + « + », F5 ni les gestes du tableau
  installerGardes(app)
  zone.dataset.outil = app.outil
  // Pour les tests automatiques, en développement seulement
  if (import.meta.env.DEV) Object.assign(window, { __app: app, __parties: (await import('./instruments')).partiesDuCompas, __construction: await import('./construction'), __auto: await import('./automatismes'), __katex: (await import('katex')).default })

  await tableau.charger()
  // La page qu'on regardait avant de recharger, si elle existe encore
  app.allerPage(app.pageDeDepart())
}

demarrer()
