// =============================================================
// L'AIDE ET LES CONSEILS
// La touche « ? » (ou « Aide et raccourcis » des outils de classe) ouvre
// une fenêtre en deux onglets : les raccourcis du clavier, et les gestes à
// la souris, à la tablette graphique et au doigt. Rien n'y est inventé :
// chaque ligne est un raccourci ou un geste que l'outil connaît (voir
// App.clavier, et le README).
//
// Les conseils : au premier lancement après leur arrivée, quelques bulles,
// une à la fois, montrent ce qui est nouveau (les outils de classe,
// l'aide, puis la recherche). On les passe d'un clic (« Suivant », « Passer ») ou
// d'Échap ; une fois vues, elles ne reviennent plus sur cet appareil
// (mem-conseils). Elles ne couvrent rien d'autre que leur bulle et ne
// prennent ni le focus ni le clavier, sauf Échap.
// =============================================================
import { fermerSurLeFond } from './dialogue'
import { menuOuvert } from './menus'

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const CTRL = MAC ? '⌘' : 'Ctrl'

type Ligne = [texte: string, touches: string[]]
interface Groupe { titre: string; lignes: Ligne[] }

const RACCOURCIS: Groupe[] = [
  { titre: 'Outils', lignes: [
    ['Stylo', ['P']], ['Surligneur', ['H']], ['Gomme (et ses options)', ['E']], ['Point', ['X']],
    ['Segment, droite, demi-droite', ['L']], ['Rectangle, cercle, polygone', ['R', 'C', 'G']], ['Formule', ['F']], ['Texte (taper au clavier)', ['T']],
    ['Sélection', ['V']], ['Déplacer la vue (en glissant)', ['Espace']], ['Revenir à la Sélection, puis à l\'outil d\'avant', ['Échap']],
  ] },
  { titre: 'Modifier', lignes: [
    ['Annuler, rétablir (sur la page)', [`${CTRL} Z`, `${CTRL} Y`]], ['Copier, coller', [`${CTRL} C`, `${CTRL} V`]],
    ['Dupliquer', [`${CTRL} D`]], ['Tout prendre', [`${CTRL} A`]], ['Grouper, dégrouper', [`${CTRL} G`, `${CTRL} Maj G`]],
    ['Verrouiller', ['Maj L']], ['Passer devant, derrière', [`${CTRL} ↑`, `${CTRL} ↓`]], ['Pousser (1 mm, 1 cm avec Maj)', ['← ↑ → ↓']],
    ['Supprimer', ['Suppr']],
  ] },
  { titre: 'Pages', lignes: [
    ['Page d\'avant, page d\'après', ['Page ↑', 'Page ↓']], ['Toutes les pages', ['Maj P']], ['Dupliquer la page', [`${CTRL} Maj D`]],
  ] },
  { titre: 'Voir', lignes: [
    ['Zoomer, dézoomer', [`${CTRL} +`, `${CTRL} −`]], ['100 %', [`${CTRL} 0`]], ['Tout voir', ['Maj 1']], ['Voir la sélection', ['Maj 2']],
    ['Déplacer la vue (sans sélection)', ['← ↑ → ↓']],
  ] },
  { titre: 'Classeur', lignes: [
    ['Enregistrer', [`${CTRL} S`]], ['Ouvrir', [`${CTRL} O`]], ['Exporter en PDF', [`${CTRL} P`]], ['Rechercher', [`${CTRL} F`]], ['Bibliothèque des classeurs', [`${CTRL} B`]],
  ] },
  { titre: 'Cette aide', lignes: [['Ouvrir, fermer', ['?', 'Échap']]] },
]

const GESTES: Groupe[] = [
  { titre: 'Souris et tablette graphique', lignes: [
    ['Le menu d\'un objet ou de la page', ['Clic droit', 'Bouton du stylet']],
    ['Faire défiler la page (Maj : à l\'horizontale)', ['Molette']],
    ['Zoomer autour du pointeur', [`${CTRL} + molette`]],
    ['Déplacer la vue', ['Espace + glisser']],
    ['Redresser tout de suite une figure, ou tracer un segment', ['Stylo immobile un instant']],
    ['Retourner le stylet : il efface', ['Bout gomme']],
  ] },
  { titre: 'Au doigt (tablette, TNI)', lignes: [
    ['Le menu d\'un objet ou de la page', ['Appui long']],
    ['Annuler, rétablir', ['Toucher à 2 doigts', 'à 3 doigts']],
    ['Zoomer', ['Pincer']],
    ['Déplacer la vue', ['Glisser à 2 doigts']],
  ] },
  { titre: 'Outils de classe', lignes: [
    ['Dévoiler sous le rideau', ['Glisser vers le bas', 'Molette']],
    ['Montrer au pointeur laser', ['Survoler', 'Appuyer']],
    ['Ranger le pointeur laser', ['Échap']],
  ] },
]

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texte) e.textContent = texte
  return e
}

function colonnes(groupes: Groupe[]): HTMLElement {
  const c = el('div', 'aide-colonnes')
  for (const g of groupes) {
    const s = el('section', 'aide-groupe')
    s.appendChild(el('h3', '', g.titre))
    const dl = el('dl')
    for (const [texte, touches] of g.lignes) {
      const ligne = el('div', 'aide-ligne')
      const dd = el('dd')
      touches.forEach((t, i) => { if (i) dd.append(' '); dd.appendChild(el('kbd', '', t)) })
      ligne.append(el('dt', '', texte), dd)
      dl.appendChild(ligne)
    }
    s.appendChild(dl)
    c.appendChild(s)
  }
  return c
}

/** Ouvre la fenêtre de l'aide (une seule à la fois) */
export function ouvrirAide(racine: HTMLElement): HTMLDialogElement {
  const deja = document.querySelector<HTMLDialogElement>('dialog.dialogue-aide')
  if (deja?.open) return deja
  deja?.remove()
  const d = el('dialog', 'dialogue dialogue-aide')
  d.setAttribute('aria-labelledby', 'aide-titre')
  const tete = el('div', 'aide-tete')
  const titre = el('h2', '', 'Aide de MEM teachingtool'); titre.id = 'aide-titre'
  const fermer = el('button', 'secondaire petit', 'Fermer'); fermer.type = 'button'
  fermer.addEventListener('click', () => d.close())
  tete.append(titre, fermer)
  const onglets = el('div', 'aide-onglets'); onglets.setAttribute('role', 'tablist')
  const vues = [colonnes(RACCOURCIS), colonnes(GESTES)]
  const noms = ['Raccourcis du clavier', 'Gestes']
  const boutons = noms.map((n, i) => {
    const b = el('button', 'aide-onglet', n); b.type = 'button'
    b.setAttribute('role', 'tab'); b.id = `aide-onglet-${i}`
    vues[i].setAttribute('role', 'tabpanel'); vues[i].setAttribute('aria-labelledby', b.id)
    b.addEventListener('click', () => choisir(i))
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + noms.length) % noms.length
      choisir(j); boutons[j].focus()
    })
    onglets.appendChild(b)
    return b
  })
  const choisir = (i: number) => {
    boutons.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1 })
    vues.forEach((v, j) => { v.hidden = i !== j })
  }
  choisir(0)
  const pied = el('p', 'aide-pied', 'Échap ou « Fermer » ramène au tableau.')
  d.append(tete, onglets, ...vues, pied)
  racine.appendChild(d)
  fermerSurLeFond(d, () => d.close())
  d.addEventListener('close', () => d.remove())
  d.showModal()
  boutons[0].focus()
  return d
}

// ---------- Les conseils ----------
const CLE_CONSEILS = 'mem-conseils'
/** La série de conseils vue sur cet appareil : on montre ceux d'après
 *  (1 : les outils de classe et l'aide ; 2 : la recherche) */
const SERIE = 2

export interface Conseil { titre: string; texte: string; ancre: () => HTMLElement | null; serie?: number }

/** La série déjà vue sur cet appareil */
function serieVue(): number {
  try { return Number(localStorage.getItem(CLE_CONSEILS) ?? '0') || 0 } catch { return SERIE }
}

/** L'adresse les demande : lue au chargement, avant que le démarrage la
 *  remplace par celle du classeur */
const CONSEILS_DEMANDES = (() => { try { return new URLSearchParams(location.search).get('conseils') === '1' } catch { return false } })()

/** Faut-il montrer les conseils ? Pas pendant les essais automatiques (un
 *  navigateur piloté : la bulle gênerait les clics qu'ils rejouent), sauf
 *  s'ils la demandent par l'adresse (?conseils=1) */
function conseilsPermis(): boolean {
  try {
    if (CONSEILS_DEMANDES) return true
    if (navigator.webdriver) return false
    return serieVue() < SERIE
  } catch { return false }
}

function conseilsVus() {
  try { localStorage.setItem(CLE_CONSEILS, String(SERIE)) } catch { /* ils reviendront une autre fois */ }
}

/** Montre les conseils, un à la fois, sous leur bouton ; ceux dont le bouton
 *  n'est pas à l'écran (le téléphone) sont passés. `libre` dit si l'écran
 *  est libre (aucune fenêtre ouverte) : sinon on attend un peu. */
export function montrerConseils(racine: HTMLElement, conseils: Conseil[], libre: () => boolean) {
  if (!conseilsPermis()) return
  let essais = 0
  const attendre = () => {
    if (!libre()) { if (++essais < 60) setTimeout(attendre, 2000); return }
    lancer()
  }
  const lancer = () => {
    const vue = CONSEILS_DEMANDES ? 0 : serieVue()
    const visibles = conseils.filter(c => { const a = c.ancre(); return (c.serie ?? 1) > vue && !!a && a.getClientRects().length > 0 })
    if (!visibles.length) { conseilsVus(); return }
    const bulle = el('div', 'conseil')
    bulle.setAttribute('role', 'status')
    racine.appendChild(bulle)
    let k = 0
    const fin = () => { bulle.remove(); document.removeEventListener('keydown', echap, true); window.removeEventListener('resize', placer); conseilsVus() }
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]') && !menuOuvert()) { e.preventDefault(); e.stopPropagation(); fin() } }
    const placer = () => {
      const a = visibles[k].ancre()
      if (!a || !a.getClientRects().length) { fin(); return }
      const r = a.getBoundingClientRect(), l = bulle.offsetWidth
      const x = Math.max(8, Math.min(window.innerWidth - l - 8, r.left + r.width / 2 - l + 40))
      bulle.style.left = x + 'px'
      bulle.style.top = (r.bottom + 12) + 'px'
      bulle.style.setProperty('--fleche', Math.max(16, Math.min(l - 16, r.left + r.width / 2 - x)) + 'px')
    }
    const montrer = () => {
      const c = visibles[k]
      bulle.replaceChildren()
      const b = el('b', '', c.titre)
      const p = el('span', 'conseil-texte', c.texte)
      const bas = el('div', 'conseil-bas')
      const compte = el('span', '', `Conseil ${k + 1} sur ${visibles.length}`)
      const passer = el('button', 'conseil-passer', 'Passer'); passer.type = 'button'
      passer.addEventListener('click', fin)
      const suivant = el('button', 'conseil-suivant', k + 1 < visibles.length ? 'Suivant' : 'Compris'); suivant.type = 'button'
      suivant.addEventListener('click', () => { if (++k < visibles.length) montrer(); else fin() })
      bas.append(compte, ...(k + 1 < visibles.length ? [passer] : []), suivant)
      bulle.append(b, p, bas)
      placer()
    }
    document.addEventListener('keydown', echap, true)
    window.addEventListener('resize', placer)
    montrer()
  }
  setTimeout(attendre, 1500)
}
