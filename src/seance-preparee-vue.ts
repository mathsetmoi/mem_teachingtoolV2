// =============================================================
// LA FENÊTRE « PRÉPARER UNE SÉANCE » (lot 25)
// Pour quel cours ? Les prochains cours de la classe d'après l'emploi du
// temps (« Lundi 16 novembre · 8 h 05 », « semaine A · salle B12 »), ou
// « Une autre date… » (un jour et une heure) ; un nom facultatif. La même
// fenêtre, sans le nom, change la date d'une séance à venir. Voir
// seances.ts, « Les séances préparées à l'avance ».
// =============================================================
import { fermerSurLeFond } from './dialogue'
import { LONGUEUR_NOM_SEANCE, nomDeSeance } from './seances'

/** Un cours proposé : son heure (ms), et ce qu'on en dit en petit */
export interface CoursPropose { debut: number; detail: string }

export interface DemandePreparation {
  titre: string
  /** Le petit texte sous le titre */
  aide: string
  cours: readonly CoursPropose[]
  /** Le nom de la séance (null : pas de champ du nom) */
  nom: string | null
  /** L'heure déjà choisie (changer la date) ; absente : le premier cours,
   *  sinon demain à la même heure qu'un cours habituel (8 h) */
  actuelle?: number
  bouton: string
  maintenant?: number
}

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « Lundi 16 novembre · 8 h 05 » */
export function coursDit(t: number): string {
  const d = new Date(t)
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} · ${d.getHours()} h${d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''}`
}

/** La valeur d'un champ de date et d'heure (« 2026-11-16T08:05 ») */
export function valeurDeChamp(t: number): string {
  const d = new Date(t), z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`
}

/** Une valeur de champ lue (heure de l'ordinateur) ; null : illisible */
export function lireChamp(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v)
  if (!m) return null
  const t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime()
  return Number.isFinite(t) ? t : null
}

/** Demain à 8 h */
function demainMatin(maintenant: number): number {
  const d = new Date(maintenant)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 8, 0).getTime()
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texte) e.textContent = texte
  return e
}

/** La fenêtre ; rend l'heure choisie et le nom (null : annulé) */
export function demanderSeancePreparee(racine: HTMLElement, o: DemandePreparation): Promise<{ debut: number; nom: string | null } | null> {
  const maintenant = o.maintenant ?? Date.now()
  return new Promise(ok => {
    const d = el('dialog', 'dialogue dialogue-preparer')
    const form = el('form'); form.method = 'dialog'
    const titre = el('h2', '', o.titre)
    const aide = el('p', 'aide-preparer', o.aide)
    const liste = el('div', 'preparer-cours')
    liste.setAttribute('role', 'radiogroup'); liste.setAttribute('aria-label', 'Pour quel cours ?')
    const nomGroupe = 'preparer-' + Math.random().toString(36).slice(2)
    const choix: { radio: HTMLInputElement; debut: number | null }[] = []
    const ligne = (texte: string, detail: string, debut: number | null) => {
      const l = el('label', 'preparer-un-cours')
      const r = el('input') as HTMLInputElement
      r.type = 'radio'; r.name = nomGroupe
      const t = el('span', 'texte')
      t.append(el('span', 'quand', texte))
      if (detail) t.append(el('span', 'detail', detail))
      l.append(r, t)
      liste.append(l)
      choix.push({ radio: r, debut })
      return r
    }
    for (const c of o.cours) ligne(coursDit(c.debut), c.detail, c.debut)
    const autre = ligne('Une autre date…', '', null)
    const champDate = el('input', 'preparer-date') as HTMLInputElement
    champDate.type = 'datetime-local'
    champDate.setAttribute('aria-label', 'Le jour et l\'heure du cours')
    champDate.min = valeurDeChamp(maintenant)
    const base = o.actuelle ?? o.cours[0]?.debut ?? demainMatin(maintenant)
    champDate.value = valeurDeChamp(base > maintenant ? base : demainMatin(maintenant))
    const deja = o.actuelle !== undefined ? choix.find(c => c.debut === o.actuelle) : choix[0]
    ;(deja ?? choix[choix.length - 1]).radio.checked = true
    const majDate = () => { champDate.hidden = !autre.checked }
    for (const c of choix) c.radio.addEventListener('change', majDate)
    majDate()
    const erreur = el('p', 'erreur-preparer')
    erreur.hidden = true
    erreur.setAttribute('role', 'alert')
    let champNom: HTMLInputElement | null = null
    const champs: HTMLElement[] = [liste, champDate]
    if (o.nom !== null) {
      const etiquette = el('label', 'preparer-nom', 'Nom (facultatif)')
      champNom = el('input', 'saisie-nom-seance') as HTMLInputElement
      champNom.type = 'text'; champNom.maxLength = LONGUEUR_NOM_SEANCE; champNom.value = o.nom
      champNom.placeholder = 'Fractions : additionner, Contrôle…'
      etiquette.append(champNom)
      champs.push(etiquette)
    }
    let reponse: { debut: number; nom: string | null } | null = null
    const actions = el('div', 'actions')
    const annuler = el('button', 'secondaire', 'Annuler'); annuler.type = 'button'
    annuler.addEventListener('click', () => { reponse = null; d.close() })
    const garder = el('button', 'principal', o.bouton); garder.type = 'submit'
    actions.append(annuler, garder)
    form.append(titre, aide, ...champs, erreur, actions)
    form.addEventListener('submit', e => {
      e.preventDefault()
      const c = choix.find(x => x.radio.checked)
      const debut = c?.debut ?? lireChamp(champDate.value)
      if (debut === null) { erreur.textContent = 'Choisissez le jour et l\'heure du cours.'; erreur.hidden = false; return }
      if (debut <= Date.now()) { erreur.textContent = 'Ce moment est passé : choisissez un cours à venir.'; erreur.hidden = false; return }
      reponse = { debut, nom: champNom ? nomDeSeance(champNom.value) : null }
      d.close()
    })
    d.append(form)
    d.addEventListener('close', () => { d.remove(); ok(reponse) })
    fermerSurLeFond(d, () => d.close())
    racine.appendChild(d)
    d.showModal()
    ;(choix.find(c => c.radio.checked)?.radio ?? garder).focus()
  })
}
