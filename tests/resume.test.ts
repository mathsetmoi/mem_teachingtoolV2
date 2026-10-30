// Le résumé d'une séance (resume/) : ce que l'outil lit sur les pages, ce qui
// a été posé d'un coup (noté sans étape du film), le texte du cahier de
// textes de l'outil, la consigne et le texte de Gemini, le choix du modèle,
// les adresses de Pronote.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Formule, Forme, Trait } from '../src/types'
import type { FicheDeSeance, PageResumee } from '../src/resume/fiche'
import { consigneGemini, contenuDeLaPage, dureeDite, etiquettes, faitEnClasse, latexLisible, ligneDeResume, nomPropose, texteAvecLeLien, texteCahierDeGemini, texteCahierDeLOutil } from '../src/resume/fiche'
import { ficheDeLaSeance, gestesDeLaSeance } from '../src/resume/collecte'
import { adresseValable, cleValable, meilleurModele, messageSelonLaRaison, nettoyerCle } from '../src/resume/gemini'

let horloge = new Date('2026-10-26T08:05:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number): Trait {
  return { id: 'T' + numero++, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
function texte(t: string, y: number, x = 0): Formule {
  return { id: 'F' + numero++, type: 'formule', x, y, z: numero++, auteur: 'moi', latex: '', couleur: '#1b2230', taille: 24,
    texte: [{ morceaux: [{ t }] }] }
}

const page = (o: Partial<PageResumee> & { id: string }): PageResumee =>
  ({ numero: 1, nom: null, minute: 0, textes: [], traits: 0, figures: 0, images: 0, calculatrice: false, reprise: null, ...o })
const fiche = (pages: PageResumee[], activites: FicheDeSeance['activites'] = []): FicheDeSeance =>
  ({ debut: new Date('2026-10-26T08:05:00').getTime(), fin: new Date('2026-10-26T09:00:00').getTime(), chapitre: 'Ensembles de nombres', pages, activites })

describe('ce qui est écrit sur une page', () => {
  it('les textes tapés de haut en bas, les traits, les figures, les images, la calculatrice', () => {
    const formes: Forme[] = [
      texte('Exercice 12 p. 42', 300), texte('Démonstration', 20), trait(0, 0), trait(5, 5),
      { id: 'c', type: 'cercle', x: 0, y: 0, z: 1, auteur: 'moi', r: 10, couleur: '#000', taille: 2 },
      { id: 'i', type: 'image', x: 0, y: 0, z: 1, auteur: 'moi', src: 's', l: 1, h: 1, m: [1, 0, 0, 1] },
      { id: 'n', type: 'image', x: 0, y: 0, z: 1, auteur: 'moi', src: 's', l: 1, h: 1, m: [1, 0, 0, 1], calculatrice: 'lycee' },
    ]
    expect(contenuDeLaPage(formes)).toEqual({ textes: ['Démonstration', 'Exercice 12 p. 42'], traits: 2, figures: 1, images: 1, calculatrice: true })
  })
  it('les formules d\'un texte se lisent en clair', () => {
    expect(latexLisible('\\sqrt{2} \\notin \\mathbb{Q}')).toBe('√2 ∉ ℚ')
    expect(latexLisible('x^2 \\leq \\frac{3}{4}')).toBe('x² ≤ 3/4')
    expect(latexLisible('\\mathbb{N} \\subset \\mathbb{Z}')).toBe('ℕ ⊂ ℤ')
  })
})

describe('le nom proposé et ce qui a été fait', () => {
  const act = [{ t: 1, page: 'a', type: 'flash' as const, titre: 'Automatismes (5 questions)' }]
  it('ce qui a été posé d\'un coup, sinon le premier texte tapé, sinon rien', () => {
    expect(nomPropose({ id: 'a', textes: ['Bonjour'] }, act)).toBe('Automatismes (5 questions)')
    expect(nomPropose({ id: 'b', textes: ['Exercice 12 p. 42'] }, act)).toBe('Exercice 12 p. 42')
    expect(nomPropose({ id: 'c', textes: [] }, act)).toBeNull()
  })
  it('dans l\'ordre des pages, sans doublon, le nom de la page avant le texte tapé', () => {
    const f = fiche([
      page({ id: 'a', textes: ['Calcul mental'] }),
      page({ id: 'b', numero: 2, nom: '√2 n\'est pas rationnel', textes: ['Démonstration'] }),
      page({ id: 'c', numero: 3, textes: ['Exercice 12 p. 42'], calculatrice: true, figures: 2 }),
      page({ id: 'd', numero: 4, textes: ['exercice 12 p. 42'] }),
      page({ id: 'e', numero: 5 }),
    ], act)
    expect(faitEnClasse(f)).toEqual(['Automatismes (5 questions)', 'Calcul mental', '√2 n\'est pas rationnel', 'Exercice 12 p. 42'])
    expect(ligneDeResume(f, 2)).toBe('Automatismes (5 questions) · Calcul mental …')
    expect(etiquettes(f)).toEqual(['Automatismes (5 questions)', 'Calculatrice', '2 figures'])
  })
})

describe('le texte du cahier de textes de l\'outil', () => {
  it('la date et le chapitre, puis ce qui a été fait', () => {
    const f = fiche([page({ id: 'a', nom: 'Automatismes' }), page({ id: 'b', numero: 2, textes: ['Exercice 12 p. 42'] })])
    expect(texteCahierDeLOutil(f)).toBe('Lundi 26 octobre · Ensembles de nombres\nFait en classe : Automatismes ; exercice 12 p. 42.')
  })
  it('rien de lisible : le nombre de pages', () => {
    expect(texteCahierDeLOutil(fiche([page({ id: 'a' }), page({ id: 'b' })]))).toBe('Lundi 26 octobre · Ensembles de nombres\nFait en classe : 2 pages au tableau (voir le replay).')
  })
  it('avec le lien du replay pour Pronote', () => {
    expect(texteAvecLeLien('Texte\n', 'https://x/revoir.html?r=mem&code=abcdefgh', '\nPages : Page 1 (0:00)'))
      .toBe('Texte\nRevoir la séance : https://x/revoir.html?r=mem&code=abcdefgh\nPages : Page 1 (0:00)')
  })
  it('la durée', () => {
    expect(dureeDite(55 * 60_000)).toBe('55 min')
    expect(dureeDite(70 * 60_000)).toBe('1 h 10')
    expect(dureeDite(120 * 60_000)).toBe('2 h')
  })
})

describe('Gemini', () => {
  const f = fiche([page({ id: 'a', textes: ['Exercice 12 p. 42'] }), page({ id: 'b', numero: 2, reprise: 'de jeudi', calculatrice: true })])
  it('la consigne dit ce que l\'outil sait, et demande de ne rien inventer ni de nom d\'élève', () => {
    const c = consigneGemini(f, '2nde')
    expect(c).toContain('chapitre « Ensembles de nombres »')
    expect(c).toContain('en 2nde')
    expect(c).toContain('- page 1 : Exercice 12 p. 42')
    expect(c).toContain('- page 2 (reprise de la séance de jeudi) (calculatrice utilisée)')
    expect(c).toContain('Fait en classe :')
    expect(c).toMatch(/jamais un prénom/)
  })
  it('les consignes du professeur s\'ajoutent, avant la règle sur les noms d\'élèves', () => {
    expect(consigneGemini(f, null)).not.toContain('consignes du professeur')
    const c = consigneGemini(f, null, '  Écris « Exercices » au pluriel.\n')
    expect(c).toContain('Les consignes du professeur, à suivre en priorité sur celles du dessus :\nÉcris « Exercices » au pluriel.')
    expect(c.indexOf('Écris « Exercices »')).toBeLessThan(c.indexOf('jamais un prénom'))
  })
  it('le texte rendu est mis au propre, avec la date et le chapitre', () => {
    expect(texteCahierDeGemini(f, '**Fait en classe :** exercice 12 p. 42\n\n- À faire : exercice 14 p. 43\n')).toBe(
      'Lundi 26 octobre · Ensembles de nombres\nFait en classe : exercice 12 p. 42\nÀ faire : exercice 14 p. 43')
    expect(texteCahierDeGemini(f, '  \n ')).toBeNull()
  })
  it('le modèle : le gemini-X-flash le plus récent', () => {
    const l = (n: string[]) => n.map(name => ({ name: 'models/' + name, supportedGenerationMethods: ['generateContent'] }))
    expect(meilleurModele(l(['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash-lite', 'gemini-3.10-flash-image']))).toBe('gemini-3.6-flash')
    expect(meilleurModele(l(['gemini-3.8-flash-preview-10-2026', 'gemini-3.5-flash-lite']))).toBe('gemini-3.8-flash-preview-10-2026')
    expect(meilleurModele([{ name: 'models/gemini-4-flash', supportedGenerationMethods: ['embedContent'] }])).toBeNull()
  })
  it('la clé : toute forme de clé de Google, collée avec des espaces ou des guillemets', () => {
    expect(cleValable('AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q')).toBe(true)
    expect(cleValable(' "AQ.Ab8RN6LmVq-xYz_0123456789abcdefghijklmnopqrstuvwxyz" ')).toBe(true)
    expect(nettoyerCle(' « AIza Sy12\n34 » ')).toBe('AIzaSy1234')
    expect(cleValable('pas une clé')).toBe(false)
    expect(cleValable('')).toBe(false)
  })
  it('un refus de Google dit sa raison', () => {
    expect(messageSelonLaRaison(403, '{"error":{"details":[{"reason":"API_KEY_HTTP_REFERRER_BLOCKED"}]}}')).toMatch(/limitée à certains sites/)
    expect(messageSelonLaRaison(403, '{"error":{"details":[{"reason":"API_KEY_SERVICE_BLOCKED"}]}}')).toMatch(/d'autres services/)
    expect(messageSelonLaRaison(403, '{"error":{"details":[{"reason":"SERVICE_DISABLED"}]}}')).toMatch(/pas activée/)
    expect(messageSelonLaRaison(400, '{"error":{"message":"API key not valid."}}')).toMatch(/vérifiez-la/)
    expect(messageSelonLaRaison(429, '')).toMatch(/quota/)
    expect(messageSelonLaRaison(503, '{"error":{"message":"high demand"}}')).toMatch(/très demandé.*Réessayer/)
  })
  it('les adresses de Pronote : https seulement', () => {
    expect(adresseValable('0123456a.index-education.net/pronote/professeur.html')).toBe('https://0123456a.index-education.net/pronote/professeur.html')
    expect(adresseValable('http://exemple.example.com/pronote/')).toBe('')
    expect(adresseValable('pas une adresse')).toBe('')
    expect(adresseValable('')).toBe('')
  })
})

describe('dans le document', () => {
  it('une activité notée ne fait ni étape du film ni annulation, et se retrouve dans la fiche', async () => {
    const t = new Tableau(null)
    const p1 = t.ajouterPage('blanc', 0); await attendre(100)
    t.migrerSeances()
    const s = t.derniereSeance()!.id
    t.pageVue = p1; t.nouveauGeste(); t.poser(p1, texte('Exercice 12 p. 42', 10)); await attendre(60_000)
    const film = t.film.length
    t.noterActivite(p1, 'pdf', 'Manuel p. 42')
    await attendre(100)
    expect(t.film.length).toBe(film)
    t.nouveauGeste(); t.poser(p1, trait(0, 100)); await attendre(9 * 60_000)
    const f = ficheDeLaSeance(t, s, 'Ensembles de nombres')!
    expect(f.activites.map(a => a.titre)).toEqual(['Manuel p. 42'])
    expect(f.pages[0]).toMatchObject({ numero: 1, textes: ['Exercice 12 p. 42'], traits: 1 })
    expect(f.fin - f.debut).toBeGreaterThan(60_000)
    expect(texteCahierDeLOutil(f)).toContain('Fait en classe : Manuel p. 42 ; exercice 12 p. 42.')
    expect(gestesDeLaSeance(t, s)).toBe(2)
  })
  it('le texte du cahier de textes est gardé avec la séance', () => {
    const t = new Tableau(null)
    t.ajouterPage('blanc', 0)
    t.migrerSeances()
    const s = t.derniereSeance()!.id
    expect(t.texteCahierDe(s)).toBeNull()
    t.garderTexteCahier(s, { texte: 'Fait en classe : tout.', par: 'professeur', quand: 1 })
    expect(t.texteCahierDe(s)?.texte).toBe('Fait en classe : tout.')
  })
})
