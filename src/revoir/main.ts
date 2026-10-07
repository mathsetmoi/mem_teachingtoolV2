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
import type { Forme, Trait } from '../types'
import { Bobine, boiteDe } from './bobine'
import type { Boite } from './bobine'
import { ErreurFilm, lireFilm } from './format'
import type { FilmEleve } from './format'
import { lireParLeRelais } from './relais'

const VITESSES = [1, 1.5, 2, 0.5]
const lisible = (v: number) => '×' + String(v).replace('.', ',')
const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const echapper = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const dateLisible = (t: number) => { const d = new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1) }

const ICONES: Record<string, string> = {
  lire: 'M8 5l11 7-11 7z',
  pause: 'M8 5v14M16 5v14',
  avant: 'M17 6l-8 6 8 6z',
  apres: 'M7 6l8 6-8 6z',
  chapAvant: 'M6 5v14M18 6l-9 6 9 6z',
  chapApres: 'M18 5v14M6 6l9 6-9 6z',
  chapitres: 'M4 6h16M4 12h16M4 18h10',
  cadrer: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  fermer: 'M6 6l12 12M18 6L6 18',
}
const svg = (nom: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[nom]}"/></svg>`

// ---------- La page ----------
const racine = document.getElementById('revoir')!
racine.innerHTML = `
  <header class="entete">
    <div class="titre-seance"></div>
    <div class="ou" aria-live="off"></div>
  </header>
  <main class="scene" aria-label="Le tableau de la séance"></main>
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
        <button type="button" class="bouton b-chapitres" aria-label="Chapitres" title="Chapitres">${svg('chapitres')}</button>
        <button type="button" class="bouton b-chap-avant" aria-label="Chapitre précédent" title="Chapitre précédent ([)">${svg('chapAvant')}</button>
        <button type="button" class="bouton b-avant" aria-label="Geste précédent" title="Geste précédent (←)">${svg('avant')}</button>
        <button type="button" class="bouton principal b-lire" aria-label="Lire" title="Lire (Espace)">${svg('lire')}</button>
        <button type="button" class="bouton b-apres" aria-label="Geste suivant" title="Geste suivant (→)">${svg('apres')}</button>
        <button type="button" class="bouton b-chap-apres" aria-label="Chapitre suivant" title="Chapitre suivant (])">${svg('chapApres')}</button>
      </div>
      <div class="reglages">
        <button type="button" class="bouton texte b-vitesse" aria-label="Vitesse : ×1" title="Vitesse">×1</button>
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
let vitesse = 1
let vue: 'page' | 'libre' = 'page'         // « libre » : l'élève a zoomé ou déplacé
let arreteIci = -1                         // la fin de chapitre où l'on vient de s'arrêter : « Continuer » la passe
const params = new URLSearchParams(location.search)
const arretAuxChapitres = params.get('continu') !== '1'
const images = new Map<string, HTMLImageElement>()

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

async function charger(source: () => Promise<unknown>) {
  carteChargement()
  try {
    const film = await lireFilm(await source())
    await ouvrir(film)
  } catch (e) {
    carteErreur(e instanceof ErreurFilm ? e.message : 'La séance n\'a pas pu être ouverte. Réessayez dans un moment.', () => charger(source))
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
  // Les traits apparus se dessinent sous les yeux, à peu près à la vitesse du cours
  const traits = new Set(nouvelles.filter((f): f is Trait => f.type === 'trait').map(f => f.id))
  if (!traits.size) return
  const duree = Math.min(900, bobine.delai(Math.min(bobine.n - 1, k + 1)) / vitesse * 0.8)
  const debut = performance.now()
  const pas = () => {
    const t = Math.min(1, (performance.now() - debut) / Math.max(1, duree))
    afficher(img.formes.map(f => traits.has(f.id) ? partiel(f as Trait, t) : f), img)
    if (t < 1) animation = requestAnimationFrame(pas)
  }
  pas()
}

function afficher(formes: Forme[], img: { fond: Rendu['fond']; origine: Rendu['origine'] }) {
  rendu.formes = formes; rendu.fond = img.fond; rendu.origine = img.origine
  rendu.toutRedessiner()
}

/** Le début d'un trait, jusqu'à la fraction t de ses points */
function partiel(f: Trait, t: number): Trait {
  const n = Math.max(1, Math.round((f.pts.length / 3) * t))
  return { ...f, pts: f.pts.slice(0, n * 3) }
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

new ResizeObserver(() => { if (vue === 'page' && bobine) { cadrerPage(); rendu.toutRedessiner() } }).observe(scene)

// Glisser pour se déplacer, pincer (ou la molette) pour zoomer. La lecture continue.
const doigts = new Map<number, { x: number; y: number }>()
let pince: { d: number; cx: number; cy: number } | null = null
scene.addEventListener('pointerdown', e => {
  scene.setPointerCapture(e.pointerId)
  doigts.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (doigts.size === 2) {
    const [a, b] = [...doigts.values()]
    pince = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
  }
})
scene.addEventListener('pointermove', e => {
  const p = doigts.get(e.pointerId); if (!p) return
  const r = scene.getBoundingClientRect()
  if (doigts.size === 1) cam.deplacer(e.clientX - p.x, e.clientY - p.y)
  p.x = e.clientX; p.y = e.clientY
  if (doigts.size === 2 && pince) {
    const [a, b] = [...doigts.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
    cam.deplacer(cx - pince.cx, cy - pince.cy)
    if (pince.d > 0) cam.zoomerAutour(cx - r.left, cy - r.top, d / pince.d)
    pince = { d, cx, cy }
  }
  vue = 'libre'; rendu.toutRedessiner(); majCommandes()
})
const lacher = (e: PointerEvent) => { doigts.delete(e.pointerId); if (doigts.size < 2) pince = null }
scene.addEventListener('pointerup', lacher)
scene.addEventListener('pointercancel', lacher)
scene.addEventListener('wheel', e => {
  e.preventDefault()
  const r = scene.getBoundingClientRect()
  if (e.ctrlKey || e.deltaMode !== 0 || Math.abs(e.deltaY) > 40 && !e.deltaX) cam.zoomerAutour(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
  else cam.deplacer(-e.deltaX, -e.deltaY)
  vue = 'libre'; rendu.toutRedessiner(); majCommandes()
}, { passive: false })
scene.addEventListener('dblclick', () => voirLaPage())

function voirLaPage() { vue = 'page'; cadrerPage(); rendu.toutRedessiner(); majCommandes() }

// ---------- Lecture ----------
function lire() {
  if (!bobine) return
  fermerCarte()
  if (k >= bobine.n - 1) { arreteIci = -1; montrer(0, false) }   // relancer depuis le début
  enMarche = true
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
  if (arretAuxChapitres && k !== arreteIci && k === bobine.finDuChapitre(c) && c + 1 < bobine.chapitres.length && k > bobine.chapitres[c].i) {
    arreteIci = k
    pause(); return carteChapitre(c + 1, false)
  }
  minuterie = window.setTimeout(() => { montrer(k + 1, true); suivante() }, Math.max(16, bobine.delai(k + 1) / vitesse))
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
  boutonLire.innerHTML = svg(enMarche ? 'pause' : 'lire')
  boutonLire.setAttribute('aria-label', enMarche ? 'Pause' : 'Lire'); boutonLire.title = enMarche ? 'Pause (Espace)' : 'Lire (Espace)'
  boutonVitesse.textContent = lisible(vitesse); boutonVitesse.setAttribute('aria-label', `Vitesse : ${lisible(vitesse)}`)
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
$('.b-chap-apres').addEventListener('click', () => { if (bobine) allerAuChapitre(bobine.chapitreDe(k) + 1) })
boutonVitesse.addEventListener('click', () => { vitesse = VITESSES[(VITESSES.indexOf(vitesse) + 1) % VITESSES.length]; majCommandes(); annoncer(`Vitesse ${lisible(vitesse)}`) })
$('.b-cadrer').addEventListener('click', voirLaPage)
$('.b-chapitres').addEventListener('click', () => { tiroir.hidden = !tiroir.hidden; if (!tiroir.hidden) (tiroir.querySelector('li.ici button') as HTMLElement | null)?.focus() })
$('.fermer-tiroir').addEventListener('click', () => { tiroir.hidden = true })
curseur.addEventListener('input', () => { pause(); fermerCarte(); arreteIci = -1; montrer(Number(curseur.value), false) })

window.addEventListener('keydown', e => {
  if (!bobine || (e.target as HTMLElement).closest('input[type=range]') && e.key.startsWith('Arrow')) return
  const a: Record<string, () => void> = {
    ' ': () => enMarche ? pause() : lire(),
    ArrowLeft: () => { pause(); fermerCarte(); arreteIci = -1; montrer(k - 1, false) },
    ArrowRight: () => { pause(); fermerCarte(); montrer(k + 1, true) },
    Home: () => { pause(); montrer(0, false) },
    End: () => { pause(); montrer(bobine!.n - 1, false) },
    '[': () => $('.b-chap-avant').click(),
    ']': () => $('.b-chap-apres').click(),
    Escape: () => { tiroir.hidden = true },
  }
  const f = a[e.key]
  if (!f || (e.target as HTMLElement).closest('button') && e.key === ' ') return
  e.preventDefault(); f()
})

// ---------- Les cartes : affiche, chapitre, fin, erreur ----------
function carteHTML(html: string, focus = '.principal') {
  carte.innerHTML = html
  carte.hidden = false
  ;(carte.querySelector(focus) as HTMLElement | null)?.focus()
}
function fermerCarte() { carte.hidden = true }

function carteAffiche() {
  const b = bobine!, f = b.film
  carteHTML(`
    <p class="surtitre">${echapper(dateLisible(f.date))}</p>
    <h1>${echapper(f.titre)}</h1>
    <p class="details">${mmss(b.duree)} · ${b.nombreDePages > 1 ? `${b.nombreDePages} pages · ` : ''}${b.chapitres.length > 1 ? `${b.chapitres.length} chapitres` : `${b.n - 1} gestes`}</p>
    <div class="actions">
      <button type="button" class="principal grand" data-a="lire">${svg('lire')}<span>Rejouer la séance</span></button>
      <button type="button" class="secondaire" data-a="voir">Voir le tableau final</button>
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
    revoir: () => { fermerCarte(); montrer(precedent!.i, false); lire() },
  })
}

function carteFin() {
  carteHTML(`
    <h2>Fin de la séance</h2>
    <div class="actions">
      <button type="button" class="principal grand" data-a="encore">${svg('lire')}<span>Revoir depuis le début</span></button>
      <button type="button" class="secondaire" data-a="voir">Rester sur le tableau</button>
    </div>`)
  annoncer('Fin de la séance')
  brancher({ encore: () => { montrer(0, false); lire() }, voir: fermerCarte })
}

function carteChargement(texte = 'Chargement de la séance…') {
  commandes.hidden = true
  carteHTML(`<div class="sablier" aria-hidden="true"></div><p class="details">${echapper(texte)}</p>`, 'h1')
}

function carteErreur(texte: string, reessayer: (() => void) | null) {
  commandes.hidden = true
  carteHTML(`
    <h2>La séance ne s'affiche pas</h2>
    <p class="details">${echapper(texte)}</p>
    <div class="actions">${reessayer ? '<button type="button" class="principal" data-a="encore">Réessayer</button>' : ''}</div>`)
  brancher({ encore: () => reessayer?.() })
}

/** Sans lien : on peut ouvrir un fichier séance reçu autrement (ENT, clé USB) */
function montrerFichier() {
  commandes.hidden = true
  carteHTML(`
    <h1>Revoir une séance</h1>
    <p class="details">Ouvrez le lien donné par votre enseignant dans le cahier de textes. Si vous avez reçu un fichier séance (.prof), choisissez-le ici :</p>
    <div class="actions">
      <label class="principal fichier">Choisir un fichier séance<input type="file" accept=".prof,application/json" /></label>
    </div>`, 'label')
  const entree = carte.querySelector('input[type=file]') as HTMLInputElement
  entree.addEventListener('change', () => { const f = entree.files?.[0]; if (f) charger(() => f.text()) })
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
  if (f) charger(() => f.text())
})

// Pour les tests automatiques, en développement seulement
if (import.meta.env.DEV) Object.assign(window, { __revoir: { get bobine() { return bobine }, get k() { return k }, get page() { return page }, get enMarche() { return enMarche }, cam, rendu } })

demarrer()
