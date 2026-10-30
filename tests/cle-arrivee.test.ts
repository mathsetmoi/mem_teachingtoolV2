// L'arrivée sur un classeur ajouté, ouvert, remplacé ou créé avec la case
// de la clé (contrôle final du lot 4) : Chrome oublie l'accord d'écrire dans
// le fichier quand la page change (sauf « Autoriser à chaque visite »).
// Le message d'arrivée se dit donc APRÈS la vérification de la clé, et ne
// dit jamais « Il s'enregistre automatiquement » quand le navigateur ne le
// permet pas : il dit la vérité et donne le geste en un clic (« Autoriser »).
// Ici, sous Node : ce que dit EnregistrementCle.direALArrivee pour chaque
// état de la clé, ce que le changement de page garde (lireCleALArrivee,
// lireOuvert), et la fenêtre modale qui fait taire les touches du tableau.
import { describe, expect, it } from 'vitest'
import { CONSEIL_ACCORD, EnregistrementCle, accordDemande, lireCleALArrivee } from '../src/classeurs/cle'
import type { CleALArrivee } from '../src/classeurs/cle'
import type { EtatSauvegarde } from '../src/classeurs/etat'
import { lireOuvert } from '../src/sauvegarde'
import { fenetreModaleOuverte } from '../src/navigateur'

type EtatCle = EtatSauvegarde['cle']
interface Dit { texte: string; actions: { libelle: string; cle?: string; faire: () => void }[] }

/** Une clé dans cet état, sans navigateur : ce qu'elle dit, et ce que fait « Autoriser » */
function cleDans(etat: EtatCle, o: { suspendu?: boolean } = {}) {
  const dits: Dit[] = []
  const reprises: unknown[] = []
  const k = Object.create(EnregistrementCle.prototype) as EnregistrementCle
  Object.assign(k, {
    etat, poignee: { name: 'Symétrie.memc' }, pret: Promise.resolve(), suspendu: !!o.suspendu,
    app: { ui: { message: (texte: string, a?: Dit['actions'][number] | Dit['actions']) => dits.push({ texte, actions: a === undefined ? [] : Array.isArray(a) ? a : [a] }), oublierAction() {} } },
    reprendre: async (x: unknown) => { reprises.push(x); return true },
  })
  return { k, dits, reprises }
}
const DEBUT = 'Classeur ajouté à la bibliothèque : « Symétrie » (1 page).'
const C: CleALArrivee = { nom: 'Symétrie.memc' }

describe('direALArrivee : la vérité sur la clé, une fois vérifiée', () => {
  it('le navigateur n\'a pas l\'accord (après un changement de page) : il le demande, en un clic', async () => {
    const { k, dits, reprises } = cleDans({ etat: 'permission', nom: 'Symétrie.memc' })
    await k.direALArrivee(DEBUT, C)
    expect(dits).toHaveLength(1)
    expect(dits[0].texte).toBe(`${DEBUT} ${accordDemande('Symétrie.memc')}`)
    expect(dits[0].texte).toBe('Classeur ajouté à la bibliothèque : « Symétrie » (1 page). Pour qu\'il s\'enregistre tout seul dans « Symétrie.memc », le navigateur demande votre accord.')
    expect(dits[0].texte).not.toMatch(/s'enregistre automatiquement/)
    expect(dits[0].actions.map(a => a.libelle)).toEqual(['Autoriser'])
    dits[0].actions[0].faire()
    expect(reprises).toEqual([{ arrivee: true }])
  })
  it('le navigateur le permet (« Autoriser à chaque visite », gardé) : « Il s\'enregistre automatiquement »', async () => {
    const { k, dits } = cleDans({ etat: 'ok', nom: 'Symétrie.memc', t: 1 })
    await k.direALArrivee(DEBUT, C)
    expect(dits.map(d => d.texte)).toEqual([`${DEBUT} Il s'enregistre automatiquement dans « Symétrie.memc ».`])
    expect(dits[0].actions).toEqual([])
  })
  it('un texte à lui quand la clé reprend (le fichier de la clé rouvert) ; la première écriture pas encore faite', async () => {
    const a = cleDans({ etat: 'ok', nom: 'Symétrie.memc' })
    await a.k.direALArrivee('« Clé » mis à jour depuis le fichier (1 page).', { nom: 'Symétrie.memc', ok: 'L\'enregistrement dans « Symétrie.memc » reprend.' })
    expect(a.dits[0].texte).toBe('« Clé » mis à jour depuis le fichier (1 page). L\'enregistrement dans « Symétrie.memc » reprend.')
    const b = cleDans({ etat: 'ok', nom: 'Symétrie.memc', pasEncoreEcrit: true })
    await b.k.direALArrivee('Classeur « F » créé.', C)
    expect(b.dits[0].texte).toBe('Classeur « F » créé. La première écriture dans « Symétrie.memc » part bientôt.')
  })
  it('l\'autre onglet écrit, un conflit, un échec, rien d\'activé : jamais « automatiquement »', async () => {
    for (const [etat, attendu] of [
      [{ etat: 'autre-onglet' }, 'C\'est l\'autre onglet ouvert sur ce classeur qui l\'enregistre dans « Symétrie.memc ».'],
      [{ etat: 'conflit', message: 'Le fichier « Symétrie.memc » contient un autre classeur (« F ») : il n\'est pas remplacé.' }, 'Le fichier « Symétrie.memc » contient un autre classeur (« F ») : il n\'est pas remplacé.'],
      [{ etat: 'erreur', message: 'le disque est plein' }, 'L\'enregistrement dans « Symétrie.memc » ne se fait pas pour l\'instant (le disque est plein). Rien n\'est perdu : il est dans ce navigateur.'],
      [{ etat: 'absente' }, 'L\'enregistrement automatique n\'est pas activé.'],
      [{ etat: 'absente', message: '« Symétrie.memc » est à choisir de nouveau (ce navigateur ne le garde pas après un rechargement)' }, 'L\'enregistrement automatique n\'est pas activé : « Symétrie.memc » est à choisir de nouveau (ce navigateur ne le garde pas après un rechargement).'],
    ] as [EtatCle, string][]) {
      const { k, dits } = cleDans(etat)
      await k.direALArrivee(DEBUT, C)
      expect(dits.map(d => d.texte)).toEqual([`${DEBUT} ${attendu}`])
      expect(dits[0].texte).not.toMatch(/s'enregistre automatiquement/)
    }
  })
  it('le classeur remplacé ou supprimé entre-temps : le début seul', async () => {
    const { k, dits } = cleDans({ etat: 'ok', nom: 'Symétrie.memc' }, { suspendu: true })
    await k.direALArrivee(DEBUT, C)
    expect(dits.map(d => d.texte)).toEqual([DEBUT])
  })
  it('le conseil, pendant la demande du navigateur', () => {
    expect(CONSEIL_ACCORD).toBe('Dans la demande du navigateur, choisissez « Autoriser à chaque visite » s\'il le propose : il ne la refera plus à chaque changement de classeur.')
  })
})

describe('ce que garde le changement de page', () => {
  it('lireCleALArrivee : le nom du fichier, et le texte de « ok » s\'il y en a un', () => {
    expect(lireCleALArrivee({ nom: 'A.memc' })).toEqual({ nom: 'A.memc' })
    expect(lireCleALArrivee({ nom: 'A.memc', ok: 'Reprend.' })).toEqual({ nom: 'A.memc', ok: 'Reprend.' })
    for (const x of [null, undefined, 3, 'A.memc', {}, { nom: '' }, { nom: 4 }]) expect(lireCleALArrivee(x)).toBeNull()
    expect(lireCleALArrivee({ nom: 'A.memc', ok: 5 })).toEqual({ nom: 'A.memc' })
  })
  it('lireOuvert (« Remplacer », puis le rechargement) : la clé à dire au retour', () => {
    expect(lireOuvert(JSON.stringify({ pages: 2, nom: 'S', message: 'Classeur ouvert : 2 pages.', cle: { nom: 's.memc' } })))
      .toEqual({ pages: 2, nom: 'S', message: 'Classeur ouvert : 2 pages.', cle: { nom: 's.memc' } })
    // Sans clé, ou une clé illisible : comme avant
    expect(lireOuvert(JSON.stringify({ pages: 2, nom: 'S', cle: { nom: '' } }))).toEqual({ pages: 2, nom: 'S' })
    expect(lireOuvert('3')).toEqual({ pages: 3 })
  })
})

describe('fenetreModaleOuverte : une touche pressée pendant une fenêtre modale vient d\'elle', () => {
  const avec = (dialogues: { modal: boolean | 'inconnu' }[], f: () => void) => {
    const g = globalThis as unknown as { document?: unknown }
    const avant = g.document
    g.document = { querySelectorAll: () => dialogues.map(d => ({ matches: (s: string) => { if (d.modal === 'inconnu') throw new SyntaxError(s); return s === ':modal' && d.modal } })) }
    try { f() } finally { g.document = avant }
  }
  it('modale (Publier, une question) : oui ; l\'éditeur d\'une formule (show) : non ; sans :modal : oui', () => {
    avec([{ modal: true }], () => expect(fenetreModaleOuverte()).toBe(true))
    avec([{ modal: false }], () => expect(fenetreModaleOuverte()).toBe(false))
    avec([], () => expect(fenetreModaleOuverte()).toBe(false))
    avec([{ modal: 'inconnu' }], () => expect(fenetreModaleOuverte()).toBe(true))
  })
  it('sans document (sous Node) : non', () => expect(fenetreModaleOuverte()).toBe(false))
})
