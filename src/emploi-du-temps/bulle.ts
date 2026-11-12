// =============================================================
// LA BULLE « 1RE SPÉ 2 ARRIVE »
// Quand l'outil reste ouvert sur la classe d'avant, une petite bulle paraît
// en haut, 5 minutes avant le créneau suivant, jusqu'à 10 minutes après son
// début : « LFB · 11 h 05 · 1re spé 2 arrive · Ouvrir 1s_04_Trigo · × ».
// Elle ne cache pas la page, n'ouvre rien toute seule ; × la ferme pour ce
// créneau (aujourd'hui). Un clic ouvre le classeur de la classe qui arrive,
// sur une nouvelle séance. Rien quand ce classeur est déjà celui qui est
// ouvert, ni quand une fenêtre est ouverte (elle attend qu'elle se ferme).
// =============================================================
import type { Registre } from '../classeurs/registre'
import type { FicheClasseur } from '../classeurs/demarrage'
import { creneauDeLaBulle, heureDite } from './donnees'
import { creneauVu, momentPresent } from './moment'

const CLE_FERMEES = 'mem-teachingtool-bulle-fermee'

const fermees = (): string[] => { try { return JSON.parse(sessionStorage.getItem(CLE_FERMEES) ?? '[]') } catch { return [] } }
const fermer = (k: string) => { try { sessionStorage.setItem(CLE_FERMEES, JSON.stringify([...fermees().slice(-20), k])) } catch { /* elle reviendra */ } }

export class BulleEmploiDuTemps {
  private el: HTMLElement | null = null
  private cle = ''
  private minuterie = 0
  private enCours = false

  constructor(private racine: HTMLElement, private registre: Registre, private ici: () => string, private partir: (f: FicheClasseur) => void) {}

  demarrer() {
    window.clearInterval(this.minuterie)
    this.minuterie = window.setInterval(() => void this.recalculer(), 30_000)
    void this.recalculer()
  }

  /** Relit l'emploi du temps et montre (ou retire) la bulle */
  async recalculer(t = Date.now()): Promise<void> {
    if (this.enCours) return
    this.enCours = true
    try {
      const m = await momentPresent(this.registre, t)
      const c = m ? creneauDeLaBulle(m.jour, t) : null
      const v = m && c ? creneauVu(m, c) : null
      const jour = new Date(t).toDateString()
      const cle = v ? `${jour}|${v.creneau.id}|${v.creneau.debut}` : ''
      if (!v || !v.classeur || v.classeur.id === this.ici() || fermees().includes(cle)) { this.retirer(); return }
      if (document.querySelector('dialog[open]')) return
      if (this.el && this.cle === cle) return
      this.retirer()
      this.cle = cle
      const f = v.classeur
      const b = document.createElement('div')
      b.className = 'bulle-edt'
      b.setAttribute('role', 'status')
      b.style.borderLeftColor = v.couleur.fort
      const texte = document.createElement('span')
      if (v.etablissement) {
        const e = document.createElement('span')
        e.className = 'edt-etab'
        const i = document.createElement('i'); i.style.background = v.couleur.fort
        e.append(i, v.etablissement)
        texte.append(e, ' · ')
      }
      const quoi = document.createElement('b')
      quoi.textContent = `${heureDite(v.creneau.debut)} · ${v.nom}`
      texte.append(quoi, ' arrive')
      const ouvrir = document.createElement('button')
      ouvrir.type = 'button'; ouvrir.className = 'principal bulle-ouvrir'
      ouvrir.textContent = `Ouvrir ${f.nom}`
      ouvrir.addEventListener('click', () => { fermer(cle); this.retirer(); this.partir(f) })
      const x = document.createElement('button')
      x.type = 'button'; x.className = 'fermer-bulle'; x.textContent = '×'
      x.setAttribute('aria-label', 'Fermer')
      x.addEventListener('click', () => { fermer(cle); this.retirer() })
      b.append(texte, ouvrir, x)
      this.racine.appendChild(b)
      this.el = b
    } finally { this.enCours = false }
  }

  private retirer() {
    this.el?.remove()
    this.el = null
    this.cle = ''
  }
}
