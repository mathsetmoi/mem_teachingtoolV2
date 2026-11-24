// =============================================================
// LA FENÊTRE DES AUTOMATISMES, EN UN SEUL ARBRE (5e, 3e, 2nde)
// Thème › Domaine › lignes. Chaque ligne porte son étiquette : OFFI (la
// liste officielle des automatismes), OBJ (un objectif d'apprentissage du
// programme, au collège), CAP (une capacité attendue du programme, au
// lycée : CAP1, CAP2… dans chaque domaine) ou PERSO (une ligne du
// professeur). Les deux listes du
// programme sont rangées ensemble, domaine par domaine, parce qu'elles ont
// les mêmes thèmes et les mêmes domaines.
//
// Les réglages gardés ne changent pas : un domaine reste « 5e/Opérations »
// (ses lignes OFFI) ou « 5e/obj:Opérations » (ses lignes OBJ), et une
// compétence « 5e/Opérations/2 » ou « 5e/obj:Opérations/6 ». Seule la
// présentation fusionne les deux ; flash.ts relit les lignes cochées et
// retrouve les domaines d'origine (choixDeLArbre).
//
// Ce fichier fabrique le HTML de l'arbre et branche son filtre (pastilles
// OFFI / OBJ / PERSO, « Cochés », recherche, tout replier, compteurs).
// =============================================================
import type { Automatisme, Niveau, QuestionCours } from './automatismes'
import type { ReglagesFlash } from './flash'
import { cleObjectifsDe, estNiveauLycee } from './objectifs-flash'
import type { DomaineProgramme, ThemeProgramme } from './programme-automatismes'

export type TypeLigne = 'OFFI' | 'OBJ' | 'CAP' | 'PERSO'
const TYPES: TypeLigne[] = ['OFFI', 'OBJ', 'CAP', 'PERSO']

/** Ce que flash.ts prête à l'arbre : son propre décompte des exercices et des questions de cours */
export interface AidesArbre {
  n: Niveau
  R: ReglagesFlash
  programme: ThemeProgramme[]
  texte: (t: string) => string
  html: (t: string) => string
  exercicesDe: (cle: string) => Automatisme[]
  rangsDe: (a: Automatisme, cle: string) => number[]
  coursDe: (cle: string) => QuestionCours[]
  rangCours: (c: QuestionCours) => number | undefined
}

const ETIQUETTE: Record<TypeLigne, string> = {
  OFFI: '<b class="etiquette-offi" title="La liste officielle des automatismes">OFFI</b>',
  OBJ: '<b class="etiquette-obj" title="Un objectif d’apprentissage du programme">OBJ</b>',
  CAP: '<b class="etiquette-obj" title="Une capacité attendue du programme">CAP</b>',
  PERSO: '<b class="etiquette-perso" title="Une ligne à vous, hors programme officiel">PERSO</b>',
}

/** Sans accents ni majuscules, pour la recherche */
export const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Un domaine de l'arbre : ses lignes OFFI et ses lignes OBJ */
interface DomaineFusionne { nom: string; officiel?: DomaineProgramme; objectifs?: DomaineProgramme }

/** Les domaines d'un thème, dans l'ordre du programme : ceux de la liste des
 *  objectifs d'abord, chacun avec son domaine officiel, puis les domaines
 *  officiels sans objectifs */
function domainesDuTheme(officiel: ThemeProgramme | undefined, objectifs: ThemeProgramme | undefined, niveau: string): DomaineFusionne[] {
  const reste = [...(officiel?.domaines ?? [])]
  const res: DomaineFusionne[] = []
  for (const o of objectifs?.domaines ?? []) {
    const i = reste.findIndex(d => cleObjectifsDe(niveau, d.cle) === o.cle)
    const off = i >= 0 ? reste.splice(i, 1)[0] : undefined
    res.push({ nom: off?.nom ?? o.nom ?? o.cle, officiel: off, objectifs: o })
  }
  for (const d of reste) res.push({ nom: d.nom ?? d.cle, officiel: d })
  return res
}

export function arbreUnifie(a: AidesArbre): string {
  const { n, R, programme } = a
  const officiels = programme.filter(t => t.section?.offi)
  const objectifs = programme.filter(t => t.section && !t.section.offi)
  const themes: { nom: string; offi: boolean; domaines: DomaineFusionne[]; note?: string }[] = []
  for (const t of officiels) {
    const o = objectifs.find(x => x.nom === t.nom)
    themes.push({ nom: t.nom, offi: !!t.offi, domaines: domainesDuTheme(t, o, n.id), note: t.domaines.length ? undefined : 'rien au programme' })
  }
  for (const o of objectifs) if (!officiels.some(t => t.nom === o.nom)) themes.push({ nom: o.nom, offi: false, domaines: domainesDuTheme(undefined, o, n.id) })

  const compte: Record<TypeLigne, number> = { OFFI: 0, OBJ: 0, CAP: 0, PERSO: 0 }
  const coche = (cle: string) => R.themes.includes(cle)

  /** Les lignes d'un domaine d'origine (officiel ou objectifs) */
  const lignes = (d: DomaineProgramme, type: TypeLigne): { html: string; cochables: number } => {
    const valeur = `${n.id}/${d.cle}`, siens = a.exercicesDe(d.cle), lecons = a.coursDe(d.cle)
    const rangees = siens.every(x => a.rangsDe(x, d.cle).length > 0)
    const visees = R.competences.filter(c => c.startsWith(valeur + '/'))
    const sorte: TypeLigne = type === 'OFFI' && (d.perso || d.competencesPerso) ? 'PERSO' : type
    let cochables = 0
    const h = d.competences.map((c, k) => {
      const nb = siens.filter(x => a.rangsDe(x, d.cle).includes(k)).length + lecons.filter(x => a.rangCours(x) === k).length
      const ok = rangees && nb > 0
      if (ok) cochables++
      compte[sorte]++
      const cochee = ok && coche(valeur) && (!visees.length || visees.includes(`${valeur}/${k}`))
      return `<li data-type="${sorte}" data-n="${ok ? nb : 0}" data-t="${a.html(sansAccents(c))}"><label${ok ? '' : ' class="sans-exercice"'}><input type="checkbox" class="case-competence" value="${a.html(valeur)}/${k}"${cochee ? ' checked' : ''}${ok ? '' : ' disabled'}>${sorte === 'CAP' ? ETIQUETTE.CAP.replace('>CAP<', `>CAP${k + 1}<`) : ETIQUETTE[sorte]}<span>${a.texte(c)}</span><small>${ok ? nb : 'à remplir'}</small></label></li>`
    }).join('')
    return { html: h, cochables }
  }

  const domaineHtml = (d: DomaineFusionne): { html: string; cochables: number } => {
    const o = d.officiel ? lignes(d.officiel, 'OFFI') : { html: '', cochables: 0 }
    const b = d.objectifs ? lignes(d.objectifs, estNiveauLycee(n.id) ? 'CAP' : 'OBJ') : { html: '', cochables: 0 }
    const cochables = o.cochables + b.cochables
    if (!cochables) return { html: `<div class="arbre-domaine vide"><div class="ligne-arbre"><span class="deplier"></span><span class="nom-domaine">${a.html(d.nom)}</span><small>à remplir</small></div></div>`, cochables }
    const cle = d.officiel?.cle ?? d.objectifs!.cle
    const perso = d.officiel?.perso ? ` ${ETIQUETTE.PERSO}` : ''
    return {
      cochables,
      html: `<div class="arbre-domaine" data-fusion>
      <div class="ligne-arbre"><button type="button" class="deplier" aria-expanded="false" aria-label="Voir les lignes de ${a.html(d.nom)}" title="Voir les lignes"></button>
        <label><input type="checkbox" class="case-domaine" value="${a.html(`${n.id}/${cle}`)}"><span>${a.html(d.nom)}${perso}</span><span class="compteurs"></span></label></div>
      <div class="enfants" hidden><ul>${o.html}${b.html}</ul></div>
    </div>`,
    }
  }

  const corps = themes.map(t => {
    const doms = t.domaines.map(domaineHtml)
    const avec = doms.some(x => x.cochables > 0)
    if (!avec) {
      const note = t.note ?? (t.domaines.length ? 'à remplir' : 'rien au programme')
      const enfants = t.domaines.length ? `<div class="enfants">${doms.map(x => x.html).join('')}</div>` : ''
      return `<div class="arbre-theme vide"><div class="ligne-arbre"><span class="deplier"></span><span class="nom-theme">${a.html(t.nom)}</span><small>${note}</small></div>${enfants}</div>`
    }
    return `<div class="arbre-theme"><div class="ligne-arbre"><button type="button" class="deplier" aria-expanded="false" aria-label="Voir les domaines de ${a.html(t.nom)}" title="Voir les domaines"></button>
        <label><input type="checkbox" class="case-theme"><span>${a.html(t.nom)}${t.offi ? ' ' + ETIQUETTE.OFFI : ''}</span></label></div>
      <div class="enfants" hidden>${doms.map(x => x.html).join('')}</div></div>`
  }).join('')

  const total = TYPES.reduce((s, t) => s + compte[t], 0)
  const pastilles = [`<button type="button" class="pastille-filtre" data-type="tout" aria-pressed="true">Tout <small>${total}</small></button>`,
    ...TYPES.filter(t => compte[t]).map(t => `<button type="button" class="pastille-filtre" data-type="${t}" aria-pressed="false">${t} <small>${compte[t]}</small></button>`)].join('')
  return `<div class="barre-filtre" role="group" aria-label="Filtrer les lignes">${pastilles}
      <button type="button" class="pastille-filtre" data-coches aria-pressed="false">Cochés <small class="nb-coches">0</small></button>
      <input type="search" class="recherche-lignes" placeholder="Rechercher un mot" aria-label="Rechercher un mot dans les lignes">
      <button type="button" class="lien replier-tout">Tout replier</button></div>
    <div class="arbre-unifie">${corps}</div>
    <p class="bilan-cases" aria-live="polite"><span class="bilan-texte"></span> <button type="button" class="lien tout-decocher" hidden>Tout décocher</button></p>`
}

/** Ce que le professeur a coché dans l'arbre unifié, retrouvé domaine
 *  d'origine par domaine d'origine : un domaine dont toutes les lignes sont
 *  cochées n'a pas de compétences à nommer, un domaine entamé nomme les
 *  siennes. */
export function choixDeLArbre(racine: ParentNode): { themes: string[]; competences: string[] } {
  const themes: string[] = [], competences: string[] = []
  racine.querySelectorAll<HTMLElement>('.arbre-domaine[data-fusion]').forEach(x => {
    const groupes = new Map<string, HTMLInputElement[]>()
    x.querySelectorAll<HTMLInputElement>('.case-competence:not(:disabled)').forEach(c => {
      const cle = c.value.slice(0, c.value.lastIndexOf('/'))
      groupes.set(cle, [...(groupes.get(cle) ?? []), c])
    })
    groupes.forEach((cases, cle) => {
      const cochees = cases.filter(c => c.checked)
      if (!cochees.length) return
      themes.push(cle)
      if (cochees.length < cases.length) competences.push(...cochees.map(c => c.value))
    })
  })
  return { themes, competences }
}

/** Le filtre et les compteurs de l'arbre : à brancher une fois, puis
 *  `majArbre()` après chaque changement de case */
export function brancherArbre(zone: HTMLElement): () => void {
  const arbre = zone.querySelector<HTMLElement>('.arbre-unifie')
  if (!arbre) return () => {}
  let type = 'tout', cochesSeules = false, mot = ''
  const lignes = () => [...arbre.querySelectorAll<HTMLElement>('li[data-type]')]
  const filtreActif = () => type !== 'tout' || cochesSeules || !!mot
  /** Ce qui était ouvert avant le filtre : on le remet quand le filtre s'en va */
  let avant: Map<HTMLElement, boolean> | null = null
  const brancheOuverte = (x: HTMLElement) => !x.querySelector(':scope > .enfants')!.hasAttribute('hidden')
  const ouvrir = (x: HTMLElement, ouvert: boolean) => {
    x.querySelector<HTMLElement>(':scope > .enfants')!.hidden = !ouvert
    x.querySelector<HTMLElement>(':scope > .ligne-arbre > .deplier')?.setAttribute('aria-expanded', String(ouvert))
  }
  const majArbre = () => {
    const actif = filtreActif()
    zone.classList.toggle('filtre-actif', actif)
    lignes().forEach(li => {
      const visible = (type === 'tout' || li.dataset.type === type)
        && (!mot || (li.dataset.t ?? '').includes(mot))
        && (!cochesSeules || li.querySelector<HTMLInputElement>('input')!.checked)
      li.classList.toggle('filtre-masque', !visible)
    })
    arbre.querySelectorAll<HTMLElement>('.arbre-domaine[data-fusion]').forEach(d => {
      d.classList.toggle('filtre-masque', actif && !d.querySelector('li:not(.filtre-masque)'))
      // Les compteurs d'un domaine : cochées sur possibles, par étiquette
      const c = d.querySelector<HTMLElement>('.compteurs')!
      c.innerHTML = TYPES.map(t => {
        const l = [...d.querySelectorAll<HTMLElement>(`li[data-type="${t}"]`)]
        if (!l.length) return ''
        const ok = l.filter(li => !li.querySelector<HTMLInputElement>('input')!.disabled)
        const cochees = ok.filter(li => li.querySelector<HTMLInputElement>('input')!.checked).length
        return `<span class="compteur-type ${t}${ok.length ? '' : ' rien'}" title="${ok.length ? `${cochees} cochée${cochees > 1 ? 's' : ''} sur ${ok.length}` : 'à remplir'}">${ok.length ? (cochees ? cochees + '/' : '') + ok.length : '0'} ${t}</span>`
      }).join('')
    })
    // Un filtre ne montre que ce qui a des lignes : les thèmes « à remplir » s'effacent
    arbre.querySelectorAll<HTMLElement>('.arbre-theme.vide').forEach(t => t.classList.toggle('filtre-masque', actif))
    arbre.querySelectorAll<HTMLElement>('.arbre-theme:not(.vide)').forEach(t => {
      t.classList.toggle('filtre-masque', actif && !t.querySelector('.arbre-domaine[data-fusion]:not(.filtre-masque)'))
    })
    // Un filtre ouvre les branches qui ont des lignes à montrer, et les referme après
    const branches = [...arbre.querySelectorAll<HTMLElement>('.arbre-theme:not(.vide), .arbre-domaine[data-fusion]')]
    if (actif && !avant) avant = new Map(branches.map(b => [b, brancheOuverte(b)]))
    if (actif) branches.forEach(b => { if (!b.classList.contains('filtre-masque')) ouvrir(b, true) })
    else if (avant) { avant.forEach((ouvert, b) => ouvrir(b, ouvert)); avant = null }
    // Le bilan du bas
    const cochees = lignes().map(li => li.querySelector<HTMLInputElement>('input')!).filter(i => i.checked && !i.disabled)
    const questions = cochees.reduce((s, i) => s + Number(i.closest('li')!.dataset.n ?? 0), 0)
    zone.querySelector('.nb-coches')!.textContent = String(cochees.length)
    zone.querySelector('.bilan-texte')!.textContent = cochees.length
      ? `${cochees.length} ligne${cochees.length > 1 ? 's' : ''} cochée${cochees.length > 1 ? 's' : ''}, ${questions} question${questions > 1 ? 's' : ''} possible${questions > 1 ? 's' : ''}`
      : 'Aucune ligne cochée'
    zone.querySelector<HTMLElement>('.tout-decocher')!.hidden = !cochees.length
  }
  zone.querySelectorAll<HTMLButtonElement>('.pastille-filtre[data-type]').forEach(b => b.addEventListener('click', () => {
    type = b.dataset.type!
    zone.querySelectorAll<HTMLButtonElement>('.pastille-filtre[data-type]').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    zone.dispatchEvent(new Event('filtre', { bubbles: true }))
  }))
  zone.querySelector<HTMLButtonElement>('.pastille-filtre[data-coches]')!.addEventListener('click', e => {
    cochesSeules = !cochesSeules
    ;(e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(cochesSeules))
    zone.dispatchEvent(new Event('filtre', { bubbles: true }))
  })
  zone.querySelector<HTMLInputElement>('.recherche-lignes')!.addEventListener('input', e => {
    mot = sansAccents((e.target as HTMLInputElement).value.trim())
    zone.dispatchEvent(new Event('filtre', { bubbles: true }))
  })
  // Entrée dans la recherche ne lance rien
  zone.querySelector('.recherche-lignes')!.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') e.preventDefault() })
  zone.querySelector<HTMLButtonElement>('.replier-tout')!.addEventListener('click', e => {
    const b = e.currentTarget as HTMLButtonElement
    const replier = b.textContent === 'Tout replier'
    arbre.querySelectorAll<HTMLElement>('.arbre-theme:not(.vide), .arbre-domaine[data-fusion]').forEach(x => {
      const bouton = x.querySelector<HTMLElement>(':scope > .ligne-arbre > .deplier'), enfants = x.querySelector<HTMLElement>(':scope > .enfants')
      if (!bouton || !enfants) return
      bouton.setAttribute('aria-expanded', String(!replier))
      enfants.hidden = replier
    })
    b.textContent = replier ? 'Tout déplier' : 'Tout replier'
  })
  zone.querySelector<HTMLButtonElement>('.tout-decocher')!.addEventListener('click', () => {
    arbre.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(c => { c.checked = false; c.indeterminate = false })
    cochesSeules = false
    zone.querySelector('.pastille-filtre[data-coches]')!.setAttribute('aria-pressed', 'false')
    zone.dispatchEvent(new Event('filtre', { bubbles: true }))
  })
  return majArbre
}
