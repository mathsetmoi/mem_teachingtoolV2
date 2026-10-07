import 'katex/dist/katex.min.css'
import './style.css'
import { Tableau } from './document'
import { App } from './app'
import { UI } from './ui'

async function demarrer() {
  const zone = document.getElementById('zone')!
  const racine = document.getElementById('app')!
  // La base du navigateur où vit le tableau : ce nom ne change jamais,
  // sinon le professeur ne retrouverait plus ses pages
  const tableau = new Tableau('mem-tableau-local')
  const app = new App(tableau, zone)
  new UI(app, racine)
  zone.dataset.outil = app.outil
  // Pour les tests automatiques, en développement seulement
  if (import.meta.env.DEV) Object.assign(window, { __app: app, __parties: (await import('./instruments')).partiesDuCompas, __construction: await import('./construction'), __auto: await import('./automatismes'), __katex: (await import('katex')).default })

  await tableau.charger()
  app.allerPage(tableau.ordre.get(0))
}

demarrer()
