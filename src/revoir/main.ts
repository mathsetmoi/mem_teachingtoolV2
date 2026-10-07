// =============================================================
// REVOIR LA SÉANCE — le lecteur des élèves
// Une page à part, légère : elle ne contient que le dessin du tableau et
// le film. On y arrive par le lien du cahier de textes (?r=mem&id=…),
// sans compte. Elle n'écrit rien nulle part : ni document, ni stockage du
// navigateur, ni cookie. Fermée, il n'en reste rien.
//
// Ce que l'élève peut faire : rejouer (au rythme du cours, en plus lent ou
// plus vite), avancer geste par geste, sauter de chapitre en chapitre,
// zoomer et se déplacer. La lecture s'arrête à la fin de chaque chapitre :
// on relance quand on a recopié ou compris.
// =============================================================
import 'katex/dist/katex.min.css'
import './revoir.css'
import { Camera } from '../camera'
import { Rendu } from '../rendu'
import type { Forme } from '../types'
import { Bobine, boiteDe } from './bobine'
import type { Boite } from './bobine'
import { dureeDuTrace, esquisse, seDessine } from './esquisse'
import { ErreurFilm, lireFilm } from './format'
import type { FilmEleve } from './format'
import { svg } from './icones'
import { lireParLeRelais } from './relais'
import { ALLURES } from './rythme'

const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const echapper = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const dateLisible = (t: number) => { const d = new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1) }

// ---------- La page ----------
const racine = document.getElementById('revoir')!
racine.innerHTML = `
  <header class="entete">
    <div class="titre-seance"></div>
    <div class="ou" aria-live="off"></div>
  </header>
  <main class="scene" aria-label="La séance"></main>
  <div class="bandeau-apercu" hidden>Aperçu : voici ce que verront les élèves. Rien n'est encore publié.</div>
  <section class="carte" role="dialog" aria-modal="false" hidden></section>
  <aside class="tiroir" aria-label="Chapitres" hidden>
    <div class="tiroir-tete"><h2>Chapitres</h2><button type="button" class="bouton fermer-tiroir" aria-label="Fermer la liste des chapitres">${svg('fermer')}</button></div>
    <ol class="liste-chapitres"></ol>
  </aside>
  <footer class="commandes" hidden>
    <div class="frise">
      <div class="marques" aria-hidden="true"></div>
      <input type="range" class="curseur" min="0" value="0" aria-label="Avancement dans la séance" />
    </div>
    <div class="rangee">
      <span class="temps" aria-live="off"></span>
      <div class="boutons">
        <button type="button" class="bouton b-chapitres" aria-label="Chapitres" title="Chapitres">${svg('liste')}</button>
        <button type="button" class="bouton b-chap-avant" aria-label="Chapitre précédent" title="Chapitre précédent ([)">${svg('partieAvant')}</button>
        <button type="button" class="bouton b-avant" aria-label="Geste précédent" title="Geste précédent (←)">${svg('pasAvant')}</button>
        <button type="button" class="bouton principal b-lire" aria-label="Lire" title="Lire (Espace)">${svg('lire')}</button>
        <button type="button" class="bouton b-apres" aria-label="Geste suivant" title="Geste suivant (→)">${svg('pasApres')}</button>
        <button type="button" class="bouton b-chap-apres" aria-label="Chapitre suivant" title="Chapitre suivant (])">${svg('partieApres')}</button>
      </div>
      <div class="reglages">
        <button type="button" class="bouton texte b-vitesse" aria-label="Allure : Normal" title="Allure de lecture">Normal</button>
        <button type="button" class="bouton b-cadrer" aria-label="Voir toute la page" title="Voir toute la page">${svg('cadrer')}</button>
      </div>
    </div>
  </footer>
  <div class="annonce" aria-live="polite"></div>`

const $ = <T extends HTMLElement>(s: string) => racine.querySelector(s) as T
const scene = $('.scene'), carte = $('.carte'), tiroir = $('.tiroir'), commandes = $('.commandes')
const curseur = $<HTMLInputElement>('.curseur'), marques = $('.marques'), temps = $('.temps'), ou = $('.ou')
const boutonLire = $<HTMLButtonElement>('.b-lire'), boutonVitesse = $<HTMLButtonElement>('.b-vitesse')
const annonce = $('.annonce')

const cam = new Camera()
const rendu = new Rendu(cam, scene)
rendu.poignees = false
rendu.instrumentsCaches = true

// ---------- L'état du lecteur ----------
let bobine: Bobine | null = null
let k = 0                                  // l'image montrée
let page = ''
let enMarche = false
let minuterie = 0, animation = 0
let allure = 1                             // Normal (voir ALLURES)
let vue: 'page' | 'libre' = 'page'         // « libre » : l'élève a zoomé ou déplacé
let arreteIci = -1                         // la fin de chapitre où l'on vient de s'arrêter : « Continuer » la passe
let kDepart = -1                           // l'image d'où la lecture est partie : pas d'arrêt immédiat
const params = new URLSearchParams(location.search)
const arretAuxChapitres = params.get('continu') !== '1'
const images = new Map<string, HTMLImageElement>()
const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)')

rendu.pixels = src => {
  let img = images.get(src)
  if (!img) {
    const d = bobine?.film.images[src]
    if (!d || !d.startsWith('data:image/')) return null
    img = new Image()
    img.onload = () => rendu.toutRedessiner()
    img.src = d
    images.set(src, img)
  }
  return img
}

// ---------- Démarrage : d'où vient la séance ? ----------
async function demarrer() {
  const cle = params.get('r'), id = params.get('id')
  if (location.hash === '#apercu' && window.opener) return attendreApercu()
  if (cle && id) return charger(() => lireParLeRelais(cle, id))
  montrerFichier()
}

async function charger(source: () => Promise<unknown>, depuisUnFichier = false) {
  carteChargement()
  try {
    const film = await lireFilm(await source())
    await ouvrir(film)
  } catch (e) {
    const texte = e instanceof ErreurFilm ? e.message : 'La séance n\'a pas pu être ouverte. Réessayez dans un moment.'
    // Un fichier qui n'est pas une séance : relire le même ne sert à rien, on en choisit un autre
    if (depuisUnFichier) carteErreur(texte, montrerFichier, 'Choisir un autre fichier')
    else carteErreur(texte, () => charger(source))
  }
}

/** L'aperçu du professeur : le film arrive de l'onglet du tableau, sans rien publier */
function attendreApercu() {
  carteChargement('Préparation de l\'aperçu…')
  window.addEventListener('message', async e => {
    if (e.origin !== location.origin || e.source !== window.opener || e.data?.type !== 'mem-revoir-apercu') return
    try {
      $('.bandeau-apercu').hidden = false
      await ouvrir(await lireFilm(e.data.film))
    } catch (err) {
      carteErreur(err instanceof ErreurFilm ? err.message : 'L\'aperçu n\'a pas pu s\'ouvrir.', null)
    }
  })
  ;(window.opener as Window).postMessage({ type: 'mem-revoir-pret' }, location.origin)
  setTimeout(() => {
    if (!bobine) carteErreur('L\'aperçu ne s\'est pas ouvert : fermez cet onglet et cliquez à nouveau sur « Voir comme un élève » dans la fenêtre Publier.', null)
  }, 6000)
}

async function ouvrir(film: FilmEleve) {
  bobine = new Bobine(film)
  document.title = `${film.titre} — Revoir la séance`
  $('.titre-seance').textContent = film.titre
  // KaTeX ne se charge que si la séance a des formules
  if (aDesFormules(film)) {
    const katex = (await import('katex')).default
    rendu.rendreFormule = (latex, el) => katex.render(latex, el, { throwOnError: false, displayMode: false })
  }
  curseur.max = String(bobine.n - 1)
  dessinerMarques()
  remplirChapitres()
  commandes.hidden = false
  // Un lien vers un chapitre (&c=3) ouvre directement à ce chapitre
  const c = Math.max(1, Math.min(bobine.chapitres.length, Number(params.get('c')) || 0))
  if (params.get('c') && bobine.chapitres.length > 1) {
    montrer(bobine.chapitres[c - 1].i, false)
    carteChapitre(c - 1, true)
  } else {
    montrer(bobine.n - 1, false)        // l'affiche : le tableau tel qu'il était à la fin
    carteAffiche()
  }
}

function aDesFormules(film: FilmEleve) {
  return film.pages.some(p => p.formes.some(f => f.type === 'formule'))
    || film.etapes.some(e => e.o.some(o => o[0] === '=' && o[1].type === 'formule'))
}

// ---------- Montrer une image du film ----------
function montrer(i: number, anime: boolean) {
  if (!bobine) return
  i = Math.max(0, Math.min(bobine.n - 1, i))
  if (i < arreteIci) arreteIci = -1            // en revenant en arrière, les arrêts de chapitre reviennent
  const avant = k
  const nouvellePage = bobine.page(i)
  const changePage = nouvellePage !== page
  k = i; page = nouvellePage
  cancelAnimationFrame(animation)
  const img = bobine.image(k, page)
  if (changePage) { vue = 'page'; cadrerPage() }
  afficher(img.formes, img)
  majCommandes()

  if (!anime || i !== avant + 1 || changePage) return
  const nouvelles = bobine.nouvelles(k)
  if (vue === 'page') suivre(nouvelles)
  // Les figures apparues se dessinent sous les yeux, à vitesse de plume
  // (seulement celles qui apparaissent : une forme déplacée ou recolorée ne se réécrit pas),
  // et le tracé finit avant le geste suivant
  const ajouts = bobine.ajoutees(k)
  const aTracer = nouvelles.filter(f => ajouts.has(f.id) && seDessine(f))
  const facteur = ALLURES[allure].facteur
  const duree = Math.min(dureeDuTrace(aTracer), 0.85 * bobine.delai(Math.min(bobine.n - 1, k + 1))) / facteur
  if (duree < 40 || mouvementReduit.matches) return
  const ids = new Set(aTracer.map(f => f.id))
  const debut = performance.now()
  const pas = () => {
    const t = Math.min(1, (performance.now() - debut) / duree)
    afficher(img.formes.map(f => ids.has(f.id) ? esquisse(f, t) : f), img)
    if (t < 1) animation = requestAnimationFrame(pas)
  }
  pas()
}

function afficher(formes: Forme[], img: { fond: Rendu['fond']; origine: Rendu['origine'] }) {
  rendu.formes = formes; rendu.fond = img.fond; rendu.origine = img.origine
  rendu.toutRedessiner()
}

// ---------- La vue ----------
/** Toute la page (tout ce qui y sera écrit pendant la séance) tient à l'écran */
function cadrerPage() {
  if (!bobine) return
  const b = bobine.etendue(page)
  const l = rendu.l || scene.clientWidth, h = rendu.h || scene.clientHeight
  if (!l || !h) return
  if (!b) { cam.cadrer(400, 300, 900, 650, l, h); return }
  const marge = Math.max(40, Math.max(b.l, b.h) * 0.06)
  cam.cadrer(b.x + b.l / 2, b.y + b.h / 2, Math.max(b.l + 2 * marge, 320), Math.max(b.h + 2 * marge, 240), l, h)
  cam.z = Math.min(cam.z, 2.5)
  cam.x = l / 2 - (b.x + b.l / 2) * cam.z; cam.y = h / 2 - (b.y + b.h / 2) * cam.z
}

/** Ce qui vient d'être écrit reste dans l'écran */
function suivre(formes: Forme[]) {
  const boites = formes.map(boiteDe).filter((b): b is Boite => !!b)
  if (!boites.length) return
  const x1 = Math.min(...boites.map(b => b.x)), y1 = Math.min(...boites.map(b => b.y))
  const x2 = Math.max(...boites.map(b => b.x + b.l)), y2 = Math.max(...boites.map(b => b.y + b.h))
  const v = cam.visible(rendu.l, rendu.h)
  if (x1 >= v.x && y1 >= v.y && x2 <= v.x + v.l && y2 <= v.y + v.h) return
  cam.x = rendu.l / 2 - ((x1 + x2) / 2) * cam.z; cam.y = rendu.h / 2 - ((y1 + y2) / 2) * cam.z
  rendu.toutRedessiner()
}

let paysage = scene.clientWidth > scene.clientHeight
new ResizeObserver(() => {
  if (!bobine) return
  const p = scene.clientWidth > scene.clientHeight
  // On a tourné le téléphone : la page entière revient à l'écran
  if (p !== paysage) { paysage = p; vue = 'page' }
  if (vue === 'page') { cadrerPage(); rendu.toutRedessiner(); majCommandes() }
}).observe(scene)

// Glisser pour se déplacer, pincer (ou la molette) pour zoomer. La lecture continue.
const doigts = new Map<number, { x: number; y: number; x0: number; y0: number }>()
let pince: { d: number; cx: number; cy: number } | null = null
const repincer = () => {
  if (doigts.size !== 2) { pince = null; return }
  const [a, b] = [...doigts.values()]
  pince = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
}
scene.addEventListener('pointerdown', e => {
  scene.setPointerCapture(e.pointerId)
  doigts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY })
  repincer()
})
scene.addEventListener('pointermove', e => {
  const p = doigts.get(e.pointerId); if (!p) return
  const r = scene.getBoundingClientRect()
  // Un appui qui tremble n'est pas un déplacement : on attend 8 px
  if (doigts.size === 1 && vue === 'page' && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8) return
  if (doigts.size === 1) cam.deplacer(e.clientX - p.x, e.clientY - p.y)
  p.x = e.clientX; p.y = e.clientY
  if (doigts.size === 2 && pince) {
    const [a, b] = [...doigts.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
    cam.deplacer(cx - pince.cx, cy - pince.cy)
    if (pince.d > 0) cam.zoomerAutour(cx - r.left, cy - r.top, d / pince.d)
    pince = { d, cx, cy }
  }
  if (doigts.size > 2) return
  vue = 'libre'; rendu.toutRedessiner(); majCommandes()
})
const lacher = (e: PointerEvent) => { doigts.delete(e.pointerId); repincer() }
scene.addEventListener('pointerup', lacher)
scene.addEventListener('pointercancel', lacher)
scene.addEventListener('wheel', e => {
  e.preventDefault()
  const r = scene.getBoundingClientRect()
  // Comme au tableau : une vraie molette zoome (crans entiers, sans mouvement de côté) ;
  // sur un pavé tactile, deux doigts déplacent et le pincement (ctrl) zoome
  const molette = e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50)
  if (e.ctrlKey || e.metaKey || molette) {
    const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
    cam.zoomerAutour(e.clientX - r.left, e.clientY - r.top, Math.exp(-d * (e.ctrlKey && !molette ? 0.01 : 0.0015)))
  } else cam.deplacer(-e.deltaX, -e.deltaY)
  vue = 'libre'; rendu.toutRedessiner(); majCommandes()
}, { passive: false })
scene.addEventListener('dblclick', () => voirLaPage())

function voirLaPage() { vue = 'page'; cadrerPage(); rendu.toutRedessiner(); majCommandes() }

// ---------- Lecture ----------
function lire() {
  if (!bobine) return
  fermerCarte()
  // au bout du film, Lire repart de la première image
  if (k >= bobine.n - 1) { arreteIci = -1; montrer(0, false) }
  enMarche = true
  kDepart = k
  majCommandes()
  suivante()
}

function pause() {
  enMarche = false
  clearTimeout(minuterie)
  majCommandes()
}

function suivante() {
  if (!enMarche || !bobine) return
  if (k >= bobine.n - 1) { pause(); return carteFin() }
  const c = bobine.chapitreDe(k)
  // Fin d'un chapitre : on s'arrête, l'élève relance
  if (arretAuxChapitres && k !== arreteIci && k !== kDepart && k === bobine.finDuChapitre(c) && c + 1 < bobine.chapitres.length) {
    arreteIci = k
    pause(); return carteChapitre(c + 1, false)
  }
  minuterie = window.setTimeout(() => { montrer(k + 1, true); suivante() }, bobine.delai(k + 1) / ALLURES[allure].facteur)
}

function allerAuChapitre(c: number) {
  if (!bobine) return
  arreteIci = -1
  c = Math.max(0, Math.min(bobine.chapitres.length - 1, c))
  pause(); fermerCarte()
  montrer(bobine.chapitres[c].i, false)
  annoncer(`Chapitre ${c + 1} : ${bobine.chapitres[c].titre}`)
}

// ---------- Les commandes ----------
function majCommandes() {
  if (!bobine) return
  curseur.value = String(k)
  const c = bobine.chapitreDe(k), ch = bobine.chapitres[c]
  const pages = bobine.nombreDePages
  ou.textContent = [pages > 1 ? `Page ${bobine.numero(page)} / ${pages}` : '', bobine.chapitres.length > 1 ? `Chapitre ${c + 1} / ${bobine.chapitres.length}` : ''].filter(Boolean).join(' · ')
  temps.textContent = `${mmss(bobine.temps[k])} / ${mmss(bobine.duree)}`
  const icone = enMarche ? 'pause' : 'lire'
  if (boutonLire.dataset.icone !== icone) {
    boutonLire.dataset.icone = icone
    boutonLire.innerHTML = svg(icone)
    boutonLire.setAttribute('aria-label', enMarche ? 'Pause' : 'Lire'); boutonLire.title = enMarche ? 'Pause (Espace)' : 'Lire (Espace)'
  }
  curseur.setAttribute('aria-valuetext', `${mmss(bobine.temps[k])} sur ${mmss(bobine.duree)}`)
  const nom = ALLURES[allure].nom
  boutonVitesse.textContent = nom; boutonVitesse.setAttribute('aria-label', `Allure : ${nom}`)
  $('.b-cadrer').classList.toggle('actif', vue === 'page')
  for (const li of tiroir.querySelectorAll('li')) li.classList.toggle('ici', Number((li as HTMLElement).dataset.c) === c)
  void ch
}

function dessinerMarques() {
  if (!bobine) return
  marques.innerHTML = bobine.chapitres.slice(1).map(c => `<span style="left:${(c.i / Math.max(1, bobine!.n - 1)) * 100}%"></span>`).join('')
}

function remplirChapitres() {
  if (!bobine) return
  const b = bobine
  $('.liste-chapitres').innerHTML = b.chapitres.map((c, i) => {
    const debut = b.temps[c.i], fin = b.temps[b.finDuChapitre(i)]
    return `<li data-c="${i}"><button type="button"><span class="n">${i + 1}</span><span class="t">${echapper(c.titre)}</span><span class="d">${mmss(debut)} – ${mmss(fin)}</span></button></li>`
  }).join('')
  tiroir.querySelectorAll('li').forEach(li => li.querySelector('button')!.addEventListener('click', () => {
    tiroir.hidden = true
    allerAuChapitre(Number((li as HTMLElement).dataset.c))
  }))
  $('.b-chapitres').hidden = b.chapitres.length < 2
  $('.b-chap-avant').hidden = $('.b-chap-apres').hidden = b.chapitres.length < 2
}

boutonLire.addEventListener('click', () => enMarche ? pause() : lire())
$('.b-avant').addEventListener('click', () => { pause(); fermerCarte(); arreteIci = -1; montrer(k - 1, false) })
$('.b-apres').addEventListener('click', () => { pause(); fermerCarte(); montrer(k + 1, true) })
$('.b-chap-avant').addEventListener('click', () => {
  if (!bobine) return
  const c = bobine.chapitreDe(k)
  // Au milieu d'un chapitre, on revient à son début ; à son début, au précédent
  allerAuChapitre(k > bobine.chapitres[c].i ? c : c - 1)
})
$('.b-chap-apres').addEventListener('click', () => {
  if (!bobine) return
  const c = bobine.chapitreDe(k)
  if (c + 1 < bobine.chapitres.length) allerAuChapitre(c + 1)
  else { pause(); fermerCarte(); montrer(bobine.n - 1, false) }   // dernier chapitre : on va à la fin
})
boutonVitesse.addEventListener('click', () => {
  // Normal → Rapide → Très rapide → Lent → Normal
  allure = (allure + 1) % ALLURES.length
  // La nouvelle allure vaut tout de suite, pas seulement au geste suivant
  if (enMarche) { clearTimeout(minuterie); suivante() }
  majCommandes(); annoncer(`Allure ${ALLURES[allure].nom}`)
})
$('.b-cadrer').addEventListener('click', voirLaPage)
$('.b-chapitres').addEventListener('click', () => { tiroir.hidden = !tiroir.hidden; if (!tiroir.hidden) (tiroir.querySelector('li.ici button') as HTMLElement | null)?.focus() })
$('.fermer-tiroir').addEventListener('click', fermerTiroir)
// Lire la valeur AVANT la pause : la pause remet la frise sur l'image en cours
curseur.addEventListener('input', () => { const v = Number(curseur.value); pause(); fermerCarte(); arreteIci = -1; montrer(v, false) })
// Après un clic à la souris, le bouton rend la main : Espace lit ou met en pause, au lieu de recliquer
commandes.addEventListener('click', e => { if (e.detail > 0) (e.target as HTMLElement).closest('button')?.blur() })

function fermerTiroir() {
  const avait = tiroir.contains(document.activeElement)
  tiroir.hidden = true
  if (avait) $('.b-chapitres').focus()
}

window.addEventListener('keydown', e => {
  if (!bobine) return
  // Les raccourcis du navigateur (Alt+←, Cmd+[…) restent au navigateur
  if (e.metaKey || (e.key.length > 1 && (e.altKey || e.ctrlKey))) return
  const a: Record<string, () => void> = {
    ' ': () => enMarche ? pause() : lire(),
    ArrowLeft: () => { pause(); fermerCarte(); arreteIci = -1; montrer(k - 1, false) },
    ArrowRight: () => { pause(); fermerCarte(); montrer(k + 1, true) },
    Home: () => { pause(); montrer(0, false) },
    End: () => { pause(); montrer(bobine!.n - 1, false) },
    '[': () => $('.b-chap-avant').click(),
    ']': () => $('.b-chap-apres').click(),
    Escape: fermerTiroir,
  }
  const f = a[e.key]
  if (!f || (e.target as HTMLElement).closest('button') && e.key === ' ') return
  e.preventDefault(); f()
})

// ---------- Les cartes : affiche, chapitre, fin, erreur ----------
function carteHTML(html: string, focus = '.principal') {
  carte.innerHTML = html
  carte.hidden = false
  const titre = carte.querySelector('h1, h2')
  if (titre) { titre.id = 'carte-titre'; carte.setAttribute('aria-labelledby', 'carte-titre') } else carte.removeAttribute('aria-labelledby')
  ;(carte.querySelector(focus) as HTMLElement | null)?.focus()
}
function fermerCarte() {
  if (carte.hidden) return
  const avait = carte.contains(document.activeElement)
  carte.hidden = true
  if (avait && !commandes.hidden) boutonLire.focus()
}

function carteAffiche() {
  const b = bobine!, f = b.film
  const details = [mmss(b.duree), b.nombreDePages > 1 ? `${b.nombreDePages} pages` : '', b.chapitres.length > 1 ? `${b.chapitres.length} chapitres` : '']
  // L'affiche montre la page du dernier geste, telle qu'elle était à la fin
  const derniere = b.numero(b.page(b.n - 1))
  const voir = b.nombreDePages > 1 && derniere > 0 ? `Voir la fin de la page ${derniere}` : 'Voir la fin de la séance'
  carteHTML(`
    <p class="surtitre">${echapper(dateLisible(f.date))}</p>
    <h1>${echapper(f.titre)}</h1>
    <p class="details">${details.filter(Boolean).join(' · ')}</p>
    <div class="actions">
      <button type="button" class="principal grand" data-a="lire">${svg('lire')}<span>Rejouer la séance</span></button>
      <button type="button" class="secondaire" data-a="voir">${voir}</button>
    </div>
    ${arretAuxChapitres && b.chapitres.length > 1 ? '<p class="aide">La lecture s\'arrête à la fin de chaque chapitre : relancez quand vous avez recopié.</p>' : ''}`)
  brancher({ lire: () => { montrer(0, false); lire() }, voir: () => { fermerCarte(); majCommandes() } })
}

function carteChapitre(c: number, debut: boolean) {
  const b = bobine!, ch = b.chapitres[c]
  const precedent = c > 0 ? b.chapitres[c - 1] : null
  carteHTML(`
    ${debut || !precedent ? '' : `<p class="surtitre">Fin de « ${echapper(precedent.titre)} »</p>`}
    <h2>Chapitre ${c + 1} : ${echapper(ch.titre)}</h2>
    <div class="actions">
      <button type="button" class="principal grand" data-a="continuer">${svg('lire')}<span>${debut ? 'Lire ce chapitre' : 'Continuer'}</span></button>
      ${precedent && !debut ? '<button type="button" class="secondaire" data-a="revoir">Revoir le chapitre précédent</button>' : ''}
    </div>`)
  annoncer(debut ? `Chapitre ${c + 1} : ${ch.titre}` : `Fin du chapitre. Suivant : ${ch.titre}`)
  brancher({
    continuer: () => { if (k < ch.i - 1 || k > ch.i) montrer(Math.max(0, ch.i - 1), false); lire() },
    // On repart juste avant le chapitre : son premier geste se redessine, et l'on s'arrête à sa fin
    revoir: () => { fermerCarte(); montrer(Math.max(0, precedent!.i - 1), false); lire() },
  })
}

function carteFin() {
  carteHTML(`
    <h2>Fin de la séance</h2>
    <div class="actions">
      <button type="button" class="principal grand" data-a="encore">${svg('lire')}<span>Revoir depuis le début</span></button>
      <button type="button" class="secondaire" data-a="voir">Rester sur cette page</button>
    </div>`)
  annoncer('Fin de la séance')
  brancher({ encore: () => { montrer(0, false); lire() }, voir: fermerCarte })
}

function carteChargement(texte = 'Chargement de la séance…') {
  commandes.hidden = true
  carteHTML(`<div class="sablier" aria-hidden="true"></div><p class="details">${echapper(texte)}</p>`, 'h1')
}

function carteErreur(texte: string, reessayer: (() => void) | null, libelle = 'Réessayer') {
  commandes.hidden = true
  carteHTML(`
    <h2>La séance ne s'affiche pas</h2>
    <p class="details">${echapper(texte)}</p>
    <div class="actions">${reessayer ? `<button type="button" class="principal" data-a="encore">${echapper(libelle)}</button>` : ''}</div>`)
  brancher({ encore: () => reessayer?.() })
}

/** Sans lien : on peut ouvrir un fichier séance reçu autrement (ENT, clé USB) */
function montrerFichier() {
  commandes.hidden = true
  carteHTML(`
    <h1>Revoir une séance</h1>
    <p class="details">Ouvrez le lien donné par votre enseignant dans le cahier de textes. Si vous avez reçu un fichier séance (.mem), choisissez-le ici :</p>
    <div class="actions">
      <label class="principal fichier">Choisir un fichier séance<input type="file" /></label>
    </div>`, 'label')
  const entree = carte.querySelector('input[type=file]') as HTMLInputElement
  entree.addEventListener('change', () => { const f = entree.files?.[0]; if (f) charger(() => f.text(), true) })
}

function brancher(actions: Record<string, () => void>) {
  carte.querySelectorAll<HTMLButtonElement>('[data-a]').forEach(b => b.addEventListener('click', () => actions[b.dataset.a!]?.()))
}

function annoncer(t: string) { annonce.textContent = ''; requestAnimationFrame(() => { annonce.textContent = t }) }

// Glisser un fichier séance sur la page l'ouvre aussi
window.addEventListener('dragover', e => { if (!bobine) e.preventDefault() })
window.addEventListener('drop', e => {
  if (bobine) return
  e.preventDefault()
  const f = e.dataTransfer?.files?.[0]
  if (f) charger(() => f.text(), true)
})

// Pour les tests automatiques, en développement seulement
if (import.meta.env.DEV) Object.assign(window, { __revoir: { get bobine() { return bobine }, get k() { return k }, get page() { return page }, get enMarche() { return enMarche }, cam, rendu } })

demarrer()
