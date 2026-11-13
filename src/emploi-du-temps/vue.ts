// =============================================================
// LA FENÊTRE « MON EMPLOI DU TEMPS »
// La semaine en grille (A ou B), une couleur par établissement ; un clic sur
// un créneau le montre dessous, un clic sur une case vide en ajoute un. Un
// créneau ne demande que trois choses : quand, quelle classe (un dossier de
// la bibliothèque), quel classeur (le chapitre en cours, ou un classeur
// choisi). Tout s'enregistre à chaque changement, dans l'index de la
// bibliothèque. « Importer de Pronote… » lit un fichier .ics ou le lien
// synchronisé de Pronote, puis montre les créneaux trouvés à vérifier.
// Ouverte par « Emploi du temps… » (menu ⋯ du tableau et de la
// bibliothèque) et par le lien de « Bonjour ! » tant que la semaine est vide.
// =============================================================
import type { Registre } from '../classeurs/registre'
import type { FicheClasseur, FicheDossier } from '../classeurs/demarrage'
import { fermerSurLeFond } from '../dialogue'
import { estSeancesIsolees } from '../classeurs/isolees'
import {
  JOURS, classeurDuCreneau, cheminDuDossier, colorier, direLaSemaine, dossiersDe, etablissementDuCreneau, etablissementsConnus, heureDite, horaireDit,
  idCreneau, lireHeure, lundiDe, nomDuCreneau, semaineDe, sousDossiers, trier, type Creneau, type EmploiDuTemps, type Semaines,
} from './donnees'
import { devinerDossier, enCreneaux, importer, lireCalendrier, type CreneauLu, type Cours } from './ics'
import { ErreurPronote, enLigne, garderLien, garderLu, lienPronoteValable, liensPronote, lireLeLien } from './pronote'
import { colorie, couleurDe, dossiersRanges, ecrireEDT, lireEDT } from './moment'

export const TITRE_EMPLOI_DU_TEMPS = 'Mon emploi du temps'
export const ENTREE_EMPLOI_DU_TEMPS = 'Emploi du temps…'

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] => {
  const x = document.createElement(tag)
  if (classe) x.className = classe
  if (texte) x.textContent = texte
  return x
}
const bouton = (classe: string, texte: string, faire: () => void): HTMLButtonElement => {
  const b = el('button', classe, texte)
  b.type = 'button'
  b.addEventListener('click', faire)
  return b
}
const champ = (libelle: string, controle: HTMLElement, classe = ''): HTMLLabelElement => {
  const l = el('label', 'edt-champ ' + classe)
  l.append(el('span', '', libelle), controle)
  return l
}
const option = (valeur: string, texte: string, choisie = false) => {
  const o = el('option', '', texte) as HTMLOptionElement
  o.value = valeur; o.selected = choisie
  return o
}

/** La date courte d'un lundi : « 9 novembre » */
const dateDuLundi = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

/** Les heures que montre la grille : de 8 h (ou plus tôt) à 17 h (ou plus tard) */
function heuresDeLaGrille(l: readonly Creneau[]): { de: number; a: number } {
  const de = Math.min(8, ...l.map(c => Math.floor(c.debut / 60)))
  const a = Math.max(17, ...l.map(c => Math.ceil(c.fin / 60)))
  return { de, a }
}

/** Un pixel par minute et quart : 48 px par heure */
const PX_MINUTE = 0.8

export interface HoteEmploiDuTemps {
  registre: Registre
  message(texte: string): void
  /** L'emploi du temps vient de changer (la bulle se recalcule) */
  change?(): void
}

/** Ouvre la fenêtre ; rien si une autre fenêtre est ouverte */
export async function ouvrirEmploiDuTemps(racine: HTMLElement, h: HoteEmploiDuTemps): Promise<HTMLDialogElement | null> {
  if (document.querySelector('dialog[open]')) return null
  let edt = await lireEDT(h.registre)
  let dossiers: FicheDossier[] = [], classeurs: FicheClasseur[] = []
  try { [dossiers, classeurs] = await Promise.all([h.registre.dossiers(), h.registre.classeurs()]) } catch { /* une bibliothèque vide */ }
  dossiers = dossiers.filter(d => !d.corbeille)
  classeurs = classeurs.filter(f => !f.corbeille && !f.effacement && !f.creation)
  // Chaque dossier avec l'établissement où il est rangé sur l'ordinateur (lot 18)
  const ranges = await dossiersRanges(h.registre, dossiers)
  dossiers = ranges.dossiers
  if (document.querySelector('dialog[open]')) return null

  const d = el('dialog', 'dialogue dialogue-edt')
  d.setAttribute('aria-labelledby', 'edt-titre')
  const fermer = () => { if (d.open) d.close() }
  let montree: 'A' | 'B' = semaineDe(edt, Date.now())
  let choisi: string | null = null

  // L'enregistrement : à chaque changement, l'un après l'autre
  let file: Promise<void> = Promise.resolve()
  const enregistrer = (e: EmploiDuTemps) => {
    edt = colorie(e, dossiers)
    const a = edt
    file = file.then(() => ecrireEDT(h.registre, a)).then(() => h.change?.()).catch(() => h.message('L\'emploi du temps n\'a pas pu s\'enregistrer dans ce navigateur.'))
  }

  const chemins = new Map(dossiers.map(x => [x.id, cheminDuDossier(x.id, dossiers).map(y => y.nom).join(' › ')]))
  const dossiersTries = [...dossiers].sort((a, b) => chemins.get(a.id)!.localeCompare(chemins.get(b.id)!, 'fr', { numeric: true }))
  // Les établissements : ceux des dossiers (lot 18, sinon le dossier du haut),
  // ceux du lot 18 sans dossier, ceux déjà choisis à un import
  const etablissements = () => etablissementsConnus(dossiers, [...ranges.noms, ...edt.creneaux.map(c => c.etablissement ?? '')])

  // ---------- La vue de la semaine ----------
  const vue = el('div', 'edt-vue')
  const titre = el('h2', '', TITRE_EMPLOI_DU_TEMPS); titre.id = 'edt-titre'
  const haut = el('div', 'edt-haut')
  const seg = el('div', 'edt-semaines'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Semaine montrée')
  const bA = bouton('edt-seg', 'Semaine A', () => { montree = 'A'; dessiner() })
  const bB = bouton('edt-seg', 'Semaine B', () => { montree = 'B'; dessiner() })
  seg.append(bA, bB)
  const ajouter = bouton('secondaire petit edt-ajouter', '+ Créneau', () => nouveau(1, 8 * 60 + 5))
  const pronote = bouton('secondaire petit edt-pronote', 'Importer de Pronote…', () => montrerImport())
  haut.append(seg, ajouter, pronote)
  const etat = el('p', 'edt-etat')
  const legende = el('div', 'edt-legende')
  const boite = el('div', 'edt-grille-boite')
  const grille = el('div', 'edt-grille')
  boite.append(grille)
  const formulaire = el('div', 'edt-creneau'); formulaire.setAttribute('aria-live', 'polite')
  const aide = el('p', 'edt-aide', 'Un clic sur une case vide ajoute un créneau à cette heure. L\'emploi du temps s\'enregistre dans ce navigateur et part avec la bibliothèque (.memb).')
  const actions = el('div', 'actions')
  const fini = bouton('principal', 'Fermer', fermer)
  actions.append(fini)
  vue.append(titre, haut, etat, legende, boite, formulaire, aide, actions)

  const dessiner = () => {
    bA.setAttribute('aria-pressed', String(montree === 'A')); bB.setAttribute('aria-pressed', String(montree === 'B'))
    // « Cette semaine (du 9 novembre) est une semaine A · changer »
    etat.replaceChildren()
    const maintenant = Date.now(), cette = semaineDe(edt, maintenant)
    etat.append(`Cette semaine (du ${dateDuLundi(lundiDe(maintenant))}) est une semaine ${cette}. `)
    etat.append(bouton('lien edt-changer-semaine', `C'est une semaine ${cette === 'A' ? 'B' : 'A'}`, () => {
      enregistrer(direLaSemaine(edt, maintenant, cette === 'A' ? 'B' : 'A'))
      montree = semaineDe(edt, maintenant)
      dessiner()
    }))
    // La légende : les établissements de la semaine
    legende.replaceChildren()
    const noms = [...new Set(edt.creneaux.map(c => etablissementDuCreneau(c, dossiers)).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'fr'))
    for (const n of noms) {
      const s = el('span', 'edt-etab')
      const i = el('i'); i.style.background = couleurDe(edt, n).fort
      s.append(i, n)
      legende.append(s)
    }
    // La grille : une colonne par jour, du lundi au vendredi (le samedi s'il sert)
    const jours = edt.creneaux.some(c => c.jour === 6) ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]
    const visibles = edt.creneaux.filter(c => c.semaines.includes(montree))
    const { de, a } = heuresDeLaGrille(edt.creneaux)
    const hauteur = (a - de) * 60 * PX_MINUTE
    grille.replaceChildren()
    grille.style.gridTemplateColumns = `44px repeat(${jours.length}, minmax(112px, 1fr))`
    grille.append(el('div', 'edt-coin'))
    for (const j of jours) grille.append(el('div', 'edt-jour', JOURS[j]))
    const heures = el('div', 'edt-heures'); heures.style.height = `${hauteur}px`
    for (let x = de; x < a; x++) {
      const t = el('span', '', `${x} h`); t.style.top = `${(x - de) * 60 * PX_MINUTE}px`
      heures.append(t)
    }
    grille.append(heures)
    for (const j of jours) {
      const col = el('div', 'edt-colonne'); col.style.height = `${hauteur}px`
      col.style.backgroundSize = `100% ${60 * PX_MINUTE}px`
      col.title = `Ajouter un créneau le ${JOURS[j].toLowerCase()}`
      col.addEventListener('click', e => {
        if (e.target !== col) return
        const y = e.offsetY / PX_MINUTE
        nouveau(j, (de + Math.floor(y / 60)) * 60 + 5)
      })
      for (const c of visibles.filter(x => x.jour === j)) {
        const n = etablissementDuCreneau(c, dossiers)
        const coul = couleurDe(edt, n)
        const b = bouton('edt-case', '', () => { choisi = c.id; dessiner() })
        b.style.top = `${(c.debut - de * 60) * PX_MINUTE}px`
        b.style.height = `${Math.max(22, (c.fin - c.debut) * PX_MINUTE - 2)}px`
        b.style.background = coul.doux; b.style.borderLeftColor = coul.fort
        b.setAttribute('aria-pressed', String(c.id === choisi))
        const f = classeurDuCreneau(c, classeurs, dossiers, estSeancesIsolees)
        b.append(el('b', '', nomDuCreneau(c, dossiers)), el('span', '', [c.salle, f?.nom].filter(Boolean).join(' · ') || heureDite(c.debut)))
        b.setAttribute('aria-label', `${JOURS[c.jour]} ${horaireDit(c)}, ${nomDuCreneau(c, dossiers)}${c.salle ? ', salle ' + c.salle : ''}`)
        col.append(b)
      }
      grille.append(col)
    }
    remplirFormulaire()
  }

  const nouveau = (jour: number, debut: number) => {
    const c: Creneau = { id: idCreneau(), jour, debut, fin: Math.min(24 * 60, debut + 55), semaines: 'AB', dossier: null, nom: '' }
    enregistrer({ ...edt, creneaux: trier([...edt.creneaux, c]) })
    choisi = c.id
    dessiner()
    formulaire.querySelector<HTMLSelectElement>('.edt-classe')?.focus()
  }
  const changer = (id: string, f: (c: Creneau) => Creneau) => {
    enregistrer({ ...edt, creneaux: trier(edt.creneaux.map(c => c.id === id ? f({ ...c }) : c)) })
  }

  // ---------- Le créneau choisi ----------
  const remplirFormulaire = () => {
    formulaire.replaceChildren()
    const c = edt.creneaux.find(x => x.id === choisi)
    if (!c) { formulaire.hidden = true; return }
    formulaire.hidden = false
    const tete = el('div', 'edt-creneau-tete')
    tete.append(el('h3', '', `${JOURS[c.jour]} ${horaireDit(c)}`))
    const boutons = el('div', 'edt-creneau-boutons')
    boutons.append(
      bouton('secondaire petit', 'Copier à un autre jour', () => {
        const copie: Creneau = { ...c, id: idCreneau(), jour: c.jour < 5 ? c.jour + 1 : 1 }
        delete copie.pronote
        enregistrer({ ...edt, creneaux: trier([...edt.creneaux, copie]) })
        choisi = copie.id; dessiner()
        formulaire.querySelector<HTMLSelectElement>('.edt-jour-choix')?.focus()
      }),
      bouton('secondaire petit danger edt-supprimer', 'Supprimer', () => {
        enregistrer({ ...edt, creneaux: edt.creneaux.filter(x => x.id !== c.id) })
        choisi = null; dessiner()
      }),
    )
    tete.append(boutons)
    const champs = el('div', 'edt-champs')
    // Le jour
    const jour = el('select', 'edt-jour-choix') as HTMLSelectElement
    for (let j = 1; j <= 6; j++) jour.append(option(String(j), JOURS[j], j === c.jour))
    jour.addEventListener('change', () => { changer(c.id, x => ({ ...x, jour: Number(jour.value) })); dessiner() })
    // L'horaire
    const horaire = el('div', 'edt-horaire')
    const de = el('input', 'edt-de') as HTMLInputElement; de.type = 'text'; de.value = horaireDit(c).split(' – ')[0]; de.setAttribute('aria-label', 'Début')
    const a = el('input', 'edt-a') as HTMLInputElement; a.type = 'text'; a.value = horaireDit(c).split(' – ')[1]; a.setAttribute('aria-label', 'Fin')
    const erreur = el('small', 'edt-erreur')
    const lireHoraire = () => {
      const x = lireHeure(de.value), y = lireHeure(a.value)
      if (x === null || y === null || y <= x) { erreur.textContent = 'Écrivez l\'horaire comme « 10 h 05 », la fin après le début.'; return }
      erreur.textContent = ''
      changer(c.id, z => ({ ...z, debut: x, fin: y })); dessiner()
    }
    de.addEventListener('change', lireHoraire); a.addEventListener('change', lireHoraire)
    horaire.append(de, el('span', '', 'à'), a)
    // Les semaines
    const sem = el('select', 'edt-semaines-choix') as HTMLSelectElement
    sem.append(option('AB', 'A et B', c.semaines === 'AB'), option('A', 'Semaine A seulement', c.semaines === 'A'), option('B', 'Semaine B seulement', c.semaines === 'B'))
    sem.addEventListener('change', () => { changer(c.id, x => ({ ...x, semaines: sem.value as Semaines })); if (sem.value !== 'AB') montree = sem.value as 'A' | 'B'; dessiner() })
    // La classe
    const classe = el('select', 'edt-classe') as HTMLSelectElement
    if (!c.dossier) classe.append(option('', 'Choisir…', true))
    for (const x of dossiersTries) classe.append(option(x.id, chemins.get(x.id)!, x.id === c.dossier))
    classe.addEventListener('change', () => { changer(c.id, x => { const n = { ...x, dossier: classe.value || null }; delete n.classeur; return n }); dessiner() })
    // Le nom, la salle
    const nom = el('input', 'edt-nom') as HTMLInputElement; nom.type = 'text'; nom.maxLength = 60; nom.value = c.nom
    nom.placeholder = c.dossier ? nomDuCreneau({ ...c, nom: '' }, dossiers) : '2nde 3'
    nom.addEventListener('change', () => { changer(c.id, x => ({ ...x, nom: nom.value.trim() })); dessiner() })
    const salle = el('input', 'edt-salle') as HTMLInputElement; salle.type = 'text'; salle.maxLength = 30; salle.value = c.salle ?? ''; salle.placeholder = 'B12'
    salle.addEventListener('change', () => { changer(c.id, x => { const n: Creneau = { ...x, salle: salle.value.trim() }; if (!n.salle) delete n.salle; return n }); dessiner() })
    champs.append(champ('Jour', jour), champ('Horaire', horaire), champ('Semaines', sem), champ('Classe (un dossier de la bibliothèque)', classe, 'large'), champ('Nom affiché', nom), champ('Salle (facultatif)', salle))
    champs.append(erreur)
    // L'établissement : celui de l'import, sinon celui du dossier
    const etab = etablissementDuCreneau(c, dossiers)
    const ligneEtab = el('p', 'edt-etab-ligne')
    if (etab) {
      const s = el('span', 'edt-etab'); const i = el('i'); i.style.background = couleurDe(edt, etab).fort
      s.append(i, etab)
      ligneEtab.append('Établissement : ', s)
    } else ligneEtab.append('L\'établissement vient du dossier choisi.')
    // Le classeur
    const choixClasseur = el('fieldset', 'edt-classeur')
    choixClasseur.append(el('legend', '', 'Classeur ouvert à ce créneau'))
    const auto = el('input') as HTMLInputElement; auto.type = 'radio'; auto.name = 'edt-classeur'; auto.className = 'edt-classeur-auto'; auto.checked = !c.classeur
    const enCours = classeurDuCreneau({ ...c, classeur: undefined }, classeurs, dossiers, estSeancesIsolees)
    const l1 = el('label')
    const t1 = el('span')
    const l1t = el('span'); l1t.append(el('b', '', 'Le chapitre en cours'), enCours ? ` (${enCours.nom})` : '')
    t1.append(l1t, el('small', '', 'Le dernier classeur de cette classe où vous avez fait une séance. Il suit tout seul quand vous changez de chapitre.'))
    l1.append(auto, t1)
    const fixe = el('input') as HTMLInputElement; fixe.type = 'radio'; fixe.name = 'edt-classeur'; fixe.className = 'edt-classeur-fixe'; fixe.checked = !!c.classeur
    const liste = el('select', 'edt-classeur-choix') as HTMLSelectElement
    liste.setAttribute('aria-label', 'Le classeur choisi')
    const dedans = c.dossier ? sousDossiers(c.dossier, dossiers) : new Set<string>()
    const possibles = classeurs.filter(f => f.dossier !== null && dedans.has(f.dossier)).sort((x, y) => x.nom.localeCompare(y.nom, 'fr', { numeric: true }))
    for (const f of possibles) liste.append(option(f.id, f.nom, f.id === (c.classeur ?? enCours?.id)))
    if (!possibles.length) { liste.append(option('', 'Aucun classeur dans cette classe', true)); liste.disabled = true; fixe.disabled = true }
    const l2 = el('label')
    const t2 = el('span'); t2.append(el('b', '', 'Toujours le même classeur : '), liste)
    l2.append(fixe, t2)
    const poser = () => {
      changer(c.id, x => { const n = { ...x }; if (fixe.checked && liste.value) n.classeur = liste.value; else delete n.classeur; return n })
      dessiner()
    }
    auto.addEventListener('change', poser); fixe.addEventListener('change', poser)
    liste.addEventListener('change', () => { fixe.checked = true; poser() })
    choixClasseur.append(l1, l2)
    formulaire.append(tete, champs, ligneEtab, choixClasseur)
    if (c.pronote) formulaire.append(el('p', 'edt-pronote-ligne', `Venu de Pronote : « ${c.pronote} »`))
  }

  // ---------- L'import de Pronote ----------
  const vueImport = el('div', 'edt-vue edt-import'); vueImport.hidden = true
  const retour = () => { vueImport.hidden = true; vue.hidden = false; dessiner(); pronote.focus() }
  const montrerImport = () => {
    vue.hidden = true; vueImport.hidden = false
    vueImport.replaceChildren()
    const t = el('h2', '', 'Importer l\'emploi du temps de Pronote')
    const noms = etablissements()
    if (!noms.length) {
      vueImport.append(t, el('p', '', 'La bibliothèque n\'a pas encore de dossier : créez d\'abord le dossier de votre établissement et ceux de vos classes.'))
      const ac = el('div', 'actions'); ac.append(bouton('principal', 'Retour', retour)); vueImport.append(ac)
      return
    }
    let etab = noms[0]
    // Une couleur différente pour chacun, même avant le premier import
    const apercu = colorier(edt, noms)
    const liens = liensPronote()
    const choixEtab = el('div', 'edt-etabs'); choixEtab.setAttribute('role', 'group'); choixEtab.setAttribute('aria-label', 'Établissement')
    const lien = el('input', 'edt-lien') as HTMLInputElement; lien.type = 'url'; lien.placeholder = 'https://…index-education.net/pronote/ical/…'
    lien.setAttribute('aria-label', 'Le lien de Pronote')
    const poserEtab = (n: string) => {
      etab = n
      for (const b of choixEtab.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.nom === n))
      lien.value = liens[n] ?? ''
    }
    for (const x of noms) {
      const b = bouton('edt-etab-choix', '', () => poserEtab(x))
      b.dataset.nom = x
      const i = el('i'); i.style.background = couleurDe(apercu, x).fort
      b.append(i, x)
      choixEtab.append(b)
    }
    const modeLien = el('input') as HTMLInputElement; modeLien.type = 'radio'; modeLien.name = 'edt-mode'; modeLien.className = 'edt-mode-lien'
    const modeFichier = el('input') as HTMLInputElement; modeFichier.type = 'radio'; modeFichier.name = 'edt-mode'; modeFichier.className = 'edt-mode-fichier'
    modeLien.checked = enLigne(); modeFichier.checked = !enLigne()
    const fichier = el('input', 'edt-fichier') as HTMLInputElement; fichier.type = 'file'; fichier.accept = '.ics,text/calendar'
    fichier.setAttribute('aria-label', 'Le fichier .ics')
    const ligne1 = el('label', 'edt-mode')
    const s1 = el('span')
    s1.append(el('b', '', 'Le lien synchronisé de Pronote'), el('small', '', enLigne()
      ? 'Collé une seule fois. À chaque lancement, l\'outil le relit : un cours déplacé, une salle changée ou un cours annulé apparaissent tout seuls. Il reste dans ce navigateur.'
      : 'Seulement dans la version en ligne : la version hors ligne n\'a pas internet.'), lien)
    ligne1.append(modeLien, s1)
    if (!enLigne()) { modeLien.disabled = true; lien.disabled = true }
    const ligne2 = el('label', 'edt-mode')
    const s2 = el('span')
    s2.append(el('b', '', 'Un fichier .ics téléchargé de Pronote'), el('small', '', 'Une copie à un moment donné : à refaire après un changement d\'emploi du temps.'), fichier)
    ligne2.append(modeFichier, s2)
    lien.addEventListener('input', () => { modeLien.checked = true })
    fichier.addEventListener('change', () => { modeFichier.checked = true })
    const ou = el('p', 'edt-aide', 'Dans Pronote, la page de votre emploi du temps a un bouton « iCal » : il donne le lien à copier, ou le fichier à télécharger. Un fichier par établissement.')
    const etatImport = el('p', 'edt-etat-import'); etatImport.setAttribute('role', 'status')
    const ac = el('div', 'actions')
    const lire = bouton('principal edt-lire', 'Lire l\'emploi du temps', () => void lireEtVerifier())
    ac.append(bouton('secondaire', 'Retour', retour), lire)
    vueImport.append(t, champ('Ces cours sont à :', choixEtab, 'large'), ligne1, ligne2, ou, etatImport, ac)
    poserEtab(etab)
    const lireEtVerifier = async () => {
      etatImport.textContent = ''
      let texte: string
      const garderLeLien = modeLien.checked ? lien.value.trim() : ''
      try {
        if (modeLien.checked) {
          if (!lienPronoteValable(garderLeLien)) { etatImport.textContent = 'Ce n\'est pas un lien d\'emploi du temps de Pronote : copiez celui du bouton « iCal ».'; return }
          lire.disabled = true; etatImport.textContent = 'Lecture du lien…'
          texte = await lireLeLien(garderLeLien)
        } else {
          const f = fichier.files?.[0]
          if (!f) { etatImport.textContent = 'Choisissez le fichier .ics.'; return }
          texte = await f.text()
        }
      } catch (e) {
        etatImport.textContent = e instanceof ErreurPronote ? e.message : 'L\'emploi du temps n\'a pas pu être lu.'
        return
      } finally { lire.disabled = false }
      const cours = lireCalendrier(texte)
      if (!cours.length) { etatImport.textContent = 'Ce n\'est pas un emploi du temps de Pronote (aucun cours trouvé).'; return }
      verifier(etab, cours, garderLeLien)
    }
  }

  const verifier = (etab: string, cours: Cours[], lien: string) => {
    const lus = enCreneaux(cours, { lundiA: edt.lundiA, depuis: Date.now() })
    vueImport.replaceChildren()
    const t = el('h2', '', 'Vérifier les créneaux')
    const coursUniques = [...new Set(lus.map(x => x.cours))]
    const n = lus.length
    const ab = lus.some(x => x.semaines !== 'AB')
    const p = el('p', '', `${cours.length} cours lus, rangés en ${n} créneau${n > 1 ? 'x' : ''}${ab ? ' ; les deux semaines ne sont pas pareilles : une semaine A et une semaine B' : ''}. Choisissez la classe de chaque cours ; l'outil s'en souviendra.`)
    // Les dossiers de cet établissement d'abord
    const dedans = new Set(dossiersDe(etab, dossiers).map(x => x.id))
    const proposes = [...dossiersTries.filter(x => dedans.has(x.id)), ...dossiersTries.filter(x => !dedans.has(x.id))]
    const choix: Record<string, string | null> = {}
    for (const k of coursUniques) {
      if (k in edt.correspondances) choix[k] = edt.correspondances[k]
      else {
        // Parmi les classes de l'établissement (sans le dossier à son nom) ; s'il n'en a aucune, parmi toutes
        const ici = proposes.filter(x => dedans.has(x.id) && x.nom !== etab)
        choix[k] = devinerDossier(k, ici.length ? ici : proposes.filter(x => x.nom !== etab))?.id ?? null
      }
    }
    const boite = el('div', 'edt-table-boite')
    const table = el('table', 'edt-table')
    table.innerHTML = '<thead><tr><th>Créneau</th><th>Dans Pronote</th><th>Salle</th><th>Classe dans la bibliothèque</th></tr></thead>'
    const corps = el('tbody')
    const bouton1 = bouton('principal edt-importer', '', () => faire())
    const compter = () => {
      const k = lus.filter(x => choix[x.cours]).length
      bouton1.textContent = `Importer ${k} créneau${k > 1 ? 'x' : ''}`
      bouton1.disabled = k === 0
    }
    const semainesDites = (x: CreneauLu) => x.semaines === 'AB' ? 'A et B' : x.semaines
    for (const x of lus) {
      const tr = el('tr')
      const s = el('select', 'edt-correspondance') as HTMLSelectElement
      s.setAttribute('aria-label', `La classe de « ${x.cours} »`)
      s.append(option('', 'Ne pas importer', !choix[x.cours]))
      for (const dd of proposes) s.append(option(dd.id, chemins.get(dd.id)!, dd.id === choix[x.cours]))
      s.dataset.cours = x.cours
      s.addEventListener('change', () => {
        choix[x.cours] = s.value || null
        // Le même cours à d'autres créneaux suit
        for (const autre of corps.querySelectorAll<HTMLSelectElement>('select')) if (autre !== s && autre.dataset.cours === x.cours) autre.value = s.value
        compter()
      })
      const td = (texte: string) => el('td', '', texte)
      const cellule = el('td'); cellule.append(s)
      tr.append(td(`${JOURS[x.jour].slice(0, 3)} ${horaireDit(x)} · ${semainesDites(x)}`), td(x.cours), td(x.salle), cellule)
      corps.append(tr)
    }
    table.append(corps)
    boite.append(table)
    const note = el('p', 'edt-aide', `Les créneaux venus de Pronote pour ${etab} sont remplacés ; ceux que vous avez saisis à la main, et ceux des autres établissements, ne bougent pas.`)
    const ac = el('div', 'actions')
    ac.append(bouton('secondaire', 'Retour', () => montrerImport()), bouton1)
    vueImport.append(t, p, boite, note, ac)
    compter()
    const faire = () => {
      const dansEtab = (c: Creneau) => {
        const e = etablissementDuCreneau(c, dossiers)
        return e === etab || (c.dossier === null && !!c.pronote)
      }
      const avant = edt.creneaux.length
      enregistrer(importer(edt, lus, choix, dansEtab, etab))
      if (lien) { garderLien(etab, lien); garderLu(etab, cours) }
      const k = edt.creneaux.length - avant
      h.message(lien ? `Emploi du temps de ${etab} relié à Pronote : il se relira tout seul.` : `Emploi du temps de ${etab} importé${k > 0 ? ` (${k} créneau${k > 1 ? 'x' : ''} de plus)` : ''}.`)
      choisi = null
      retour()
    }
  }

  d.append(vue, vueImport)
  d.addEventListener('close', () => d.remove())
  fermerSurLeFond(d, fermer)
  racine.appendChild(d)
  d.showModal()
  dessiner()
  fini.focus()
  return d
}
