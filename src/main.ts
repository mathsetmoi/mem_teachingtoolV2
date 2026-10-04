import 'katex/dist/katex.min.css'
import './style.css'
import { Tableau } from './document'
import { App } from './app'
import { UI } from './ui'
import type { Role } from './types'

// -------------------------------------------------------------
// Où est le serveur de synchronisation ?
// 1. VITE_SERVEUR_SYNC dans un fichier .env (déploiement réel, wss://…)
// 2. sinon, la même machine que la page, port 1234 (classe en Wi-Fi local)
// 3. ouvert depuis un fichier : pas de serveur, le tableau reste local
// -------------------------------------------------------------
const SERVEUR: string | null = import.meta.env.VITE_SANS_SERVEUR ? null :
  import.meta.env.VITE_SERVEUR_SYNC ||
  (location.protocol.startsWith('http') && location.hostname
    ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:1234`
    : null)

// -------------------------------------------------------------
// Le partage avec les élèves est mis de côté pour l'instant : tout le
// code reste (document.ts, serveur/), mais l'outil ne le propose plus.
// Passer à true pour retrouver le bouton « Partager » et le mode élève.
// -------------------------------------------------------------
const PARTAGE_ELEVES = false

const params = new URLSearchParams(location.search)
const salle = PARTAGE_ELEVES ? params.get('salle') : null
const role: Role = PARTAGE_ELEVES && params.get('role') === 'eleve' ? 'eleve' : 'prof'

// Couleur de curseur : stable pour un même appareil
const TEINTES = ['#1f5fbf', '#d0342c', '#1e8a4c', '#8a4fbf', '#c0761b', '#167f8f']

async function demarrer() {
  const zone = document.getElementById('zone')!
  const racine = document.getElementById('app')!
  const tableau = new Tableau('mem-tableau-' + (salle || 'local'))
  const app = new App(tableau, role, zone)
  const ui = new UI(app, racine, PARTAGE_ELEVES ? partager : null)
  zone.dataset.outil = app.outil
  // Pour les tests automatiques, en développement seulement
  if (import.meta.env.DEV) Object.assign(window, { __app: app, __parties: (await import('./instruments')).partiesDuCompas })

  const nom = role === 'prof' ? 'Prof' : await ui.demanderNom()
  tableau.diffuser({ nom, role, couleur: TEINTES[tableau.presence.clientID % TEINTES.length] })

  await tableau.charger(role === 'prof' && !salle)
  if (salle && SERVEUR) {
    const ok = await tableau.connecter(SERVEUR, salle)
    if (!ok) ui.message('Le serveur ne répond pas : vous travaillez sur cet appareil.')
    if (role === 'prof' && tableau.ordre.length === 0) tableau.ajouterPage('carreaux', 0)
  }
  if (tableau.ordre.length) app.allerPage(tableau.ordre.get(0))
  else ui.message('En attente du tableau du prof…')

  // Le prof partage : le document courant part dans une salle neuve.
  async function partager(): Promise<string | null> {
    if (!SERVEUR) {
      ui.message('Le partage en direct demande le serveur du projet (npm run serveur).')
      return null
    }
    let id = tableau.salle
    if (!id) {
      id = nouvelleSalle()
      await tableau.connecter(SERVEUR, id)
      const u = new URL(location.href); u.searchParams.set('salle', id)
      history.replaceState(null, '', u)
    }
    const lien = new URL(location.href)
    lien.search = ''
    lien.searchParams.set('salle', id)
    lien.searchParams.set('role', 'eleve')
    return lien.toString()
  }
}

/** Code de salle lisible à voix haute : pas de 0/O ni de 1/l */
function nouvelleSalle() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]
  return s
}

demarrer()
