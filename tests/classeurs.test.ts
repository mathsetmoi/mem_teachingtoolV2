// Les classeurs (lot 4) : lequel s'ouvre au démarrage, la corbeille et les
// dossiers (même avec un cycle fait par deux onglets), les clés de
// stockage du premier, l'adresse, le dernier classeur retenu, l'état d'un
// classeur neuf. Tout est pur, sauf l'état neuf (un Tableau sans base).
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import {
  BASE_INDEX, BASE_PREMIER, CLASSEUR_SEUL, CLE_DERNIER_CLASSEUR, MESSAGE_CORBEILLE, MESSAGE_INCONNU, MESSAGE_VIDE, NOM_PREMIER, PREFIXE_BASE, PROFONDEUR_MAX,
  baseDe, choisirAuDemarrage, cleDuClasseur, dansLaCorbeille, estPremier, ficheDuPremier, idClasseur, lireDernier, parents, texteDernier, urlBibliotheque, urlDuClasseur, visible,
} from '../src/classeurs/demarrage'
import { etatNeuf } from '../src/classeurs/neuf'
import { Tableau } from '../src/document'

function fiche(id: string, o: Partial<FicheClasseur> = {}): FicheClasseur {
  return { id, base: baseDe(id), nom: 'Classeur ' + id, dossier: null, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o }
}
function dossier(id: string, parent: string | null, o: Partial<FicheDossier> = {}): FicheDossier {
  return { id, nom: 'Dossier ' + id, parent, couleur: '#1f5fbf', cree: 1, ...o }
}

describe('les noms des bases et des clés', () => {
  it('le premier garde la base et les clés d\'avant le lot 4', () => {
    expect(BASE_PREMIER).toBe('mem-tableau-local')
    expect(ficheDuPremier('abc')).toEqual({ id: 'abc', base: 'mem-tableau-local', nom: NOM_PREMIER, dossier: null, etiquettes: [], cree: 0, modifie: 0, ouvert: 0, pages: null })
    expect(CLASSEUR_SEUL).toEqual({ id: '', base: 'mem-tableau-local', nom: 'Mon tableau', premier: true })
    expect(BASE_INDEX).toBe('mem-teachingtool-bibliotheque')
    expect(CLE_DERNIER_CLASSEUR).toBe('mem-teachingtool-dernier-classeur')
    expect(baseDe('0123456789abcdef')).toBe(PREFIXE_BASE + '0123456789abcdef')
    expect(PREFIXE_BASE).toBe('mem-teachingtool-classeur-')
  })

  it('le premier se reconnaît à sa base, jamais à un champ : une fiche adoptée ou importée sur cette base l\'est aussi', () => {
    const adoptee = fiche('quelconque', { base: BASE_PREMIER, nom: 'Importé' })
    expect(estPremier(adoptee)).toBe(true)
    expect(cleDuClasseur(adoptee, 'mem-session')).toBe('mem-session')
    expect(cleDuClasseur(adoptee, 'mem-dernier-enregistrement')).toBe('mem-dernier-enregistrement')
    expect(cleDuClasseur(CLASSEUR_SEUL, 'mem-session')).toBe('mem-session')
    const autre = fiche('0123456789abcdef')
    expect(estPremier(autre)).toBe(false)
    expect(cleDuClasseur(autre, 'mem-session')).toBe('mem-session:0123456789abcdef')
  })

  it('un id : 16 caractères hexadécimaux, jamais deux fois le même', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const id = idClasseur()
      expect(id).toMatch(/^[0-9a-f]{16}$/)
      ids.add(id)
    }
    expect(ids.size).toBe(500)
  })
})

describe('l\'adresse d\'un classeur', () => {
  it('le même chemin, ?classeur=<id>, sans #, en ligne comme depuis la clé', () => {
    expect(urlDuClasseur('https://mathsetmoi.github.io/mem_teachingtoolV2/index.html?x=1#haut', 'abc')).toBe('https://mathsetmoi.github.io/mem_teachingtoolV2/index.html?classeur=abc')
    expect(urlDuClasseur('https://mathsetmoi.github.io/mem_teachingtoolV2/', 'abc')).toBe('https://mathsetmoi.github.io/mem_teachingtoolV2/?classeur=abc')
    expect(urlDuClasseur('http://192.168.1.12:5173/?classeur=vieux', 'neuf')).toBe('http://192.168.1.12:5173/?classeur=neuf')
    expect(urlDuClasseur('file:///media/CLE/MEM/index.html#x', 'abc')).toBe('file:///media/CLE/MEM/index.html?classeur=abc')
    expect(urlDuClasseur('file:///E:/MEM%20teachingtool/index.html', 'abc')).toBe('file:///E:/MEM%20teachingtool/index.html?classeur=abc')
    expect(urlBibliotheque('file:///media/CLE/index.html?classeur=abc#y')).toBe('file:///media/CLE/index.html?bibliotheque')
  })

  it('revoir.html ne garde pas le classeur de l\'adresse', () => {
    expect(new URL('revoir.html', 'https://mathsetmoi.github.io/mem_teachingtoolV2/index.html?classeur=abc').toString()).toBe('https://mathsetmoi.github.io/mem_teachingtoolV2/revoir.html')
  })
})

describe('le dernier classeur retenu', () => {
  it('se relit en JSON, dans l\'ancienne forme (l\'id seul), et vaut null s\'il est illisible', () => {
    const f = fiche('0123456789abcdef', { nom: 'Symétrie — 5e B' })
    expect(lireDernier(texteDernier(f))).toEqual({ id: f.id, base: f.base, nom: 'Symétrie — 5e B' })
    expect(lireDernier('0123456789abcdef')).toEqual({ id: '0123456789abcdef' })
    expect(lireDernier('1234567890123456')).toEqual({ id: '1234567890123456' })       // un id tout en chiffres n'est pas un nombre
    expect(lireDernier(JSON.stringify({ id: 'x', base: 'autre-base', nom: 'N' }))).toEqual({ id: 'x', nom: 'N' })  // une base qui n'est pas celle d'un classeur est oubliée
    expect(lireDernier(JSON.stringify({ id: 'x', base: BASE_PREMIER }))).toEqual({ id: 'x', base: BASE_PREMIER })
    for (const mal of [null, undefined, '', '{pas du json', '42', 'null', '[]', '{"base":"mem-tableau-local"}', '{"id":""}', '{"id":3}']) expect(lireDernier(mal)).toBeNull()
  })
})

describe('les dossiers et la corbeille', () => {
  it('la chaîne des parents s\'arrête à la racine, à un parent introuvable, à un cycle, et à 64 dossiers', () => {
    const d = [dossier('a', null), dossier('b', 'a'), dossier('c', 'b')]
    expect(parents('c', d).map(x => x.id)).toEqual(['c', 'b', 'a'])
    expect(parents(null, d)).toEqual([])
    expect(parents('perdu', d)).toEqual([])
    expect(parents('x', [dossier('x', 'perdu')]).map(x => x.id)).toEqual(['x'])
    // Un cycle A → B → A (deux onglets, chacun a rangé un dossier dans l'autre)
    const cycle = [dossier('A', 'B'), dossier('B', 'A')]
    expect(parents('A', cycle).map(x => x.id)).toEqual(['A', 'B'])
    expect(parents('S', [dossier('S', 'S')]).map(x => x.id)).toEqual(['S'])
    // Une chaîne très longue : bornée
    const longue: FicheDossier[] = []
    for (let i = 0; i < 200; i++) longue.push(dossier('n' + i, i ? 'n' + (i - 1) : null))
    expect(parents('n199', longue)).toHaveLength(PROFONDEUR_MAX)
    expect(parents('n199', new Map(longue.map(x => [x.id, x])))).toHaveLength(PROFONDEUR_MAX)
  })

  it('visible : ni dans la corbeille (lui ou un parent), ni en train de partir ou de naître', () => {
    const d = [dossier('classe', null), dossier('chap', 'classe'), dossier('jete', null, { corbeille: { t: 5 } }), dossier('dedans', 'jete')]
    expect(visible(fiche('1', { dossier: 'chap' }), d)).toBe(true)
    expect(visible(fiche('1', { corbeille: { t: 3 } }), d)).toBe(false)
    expect(visible(fiche('1', { effacement: 3 }), d)).toBe(false)
    expect(visible(fiche('1', { creation: 3 }), d)).toBe(false)
    expect(visible(fiche('1', { dossier: 'jete' }), d)).toBe(false)
    expect(visible(fiche('1', { dossier: 'dedans' }), d)).toBe(false)
    expect(dansLaCorbeille(fiche('1', { dossier: 'dedans' }), d)).toBe(true)
    expect(visible(fiche('1', { dossier: 'inconnu' }), d)).toBe(true)
  })

  it('un cycle A → B → A ne fait pas tourner en rond (ni visible, ni le démarrage)', () => {
    const cycle = [dossier('A', 'B'), dossier('B', 'A')]
    const f = fiche('1', { dossier: 'A' })
    expect(visible(f, cycle)).toBe(true)
    expect(visible(f, [dossier('A', 'B'), dossier('B', 'A', { corbeille: { t: 1 } })])).toBe(false)
    expect(choisirAuDemarrage({ recherche: '', dernier: null, fiches: [f], dossiers: cycle })).toEqual({ genre: 'classeur', fiche: f })
  })
})

describe('le classeur qui s\'ouvre au démarrage', () => {
  const premier = fiche('p', { base: BASE_PREMIER, ouvert: 0 })
  const vieux = fiche('v', { ouvert: 100 })
  const recent = fiche('r', { ouvert: 300 })
  const jete = fiche('j', { corbeille: { t: 1 }, ouvert: 900 })
  const range = fiche('d', { dossier: 'jete', ouvert: 800 })
  const dossiers = [dossier('jete', null, { corbeille: { t: 1 } })]
  const fiches = [premier, vieux, recent, jete, range]
  const choix = (recherche: string, dernier: string | null, l = fiches) => choisirAuDemarrage({ recherche, dernier: dernier ? { id: dernier } : null, fiches: l, dossiers })

  it('?bibliotheque : la bibliothèque, sans message', () => {
    expect(choix('?bibliotheque', 'r')).toEqual({ genre: 'bibliotheque' })
    expect(choix('?bibliotheque=1&classeur=r', 'r')).toEqual({ genre: 'bibliotheque' })
  })

  it('?classeur=X : X s\'il est visible', () => {
    expect(choix('?classeur=v', 'r')).toEqual({ genre: 'classeur', fiche: vieux })
    expect(choix('classeur=p', null)).toEqual({ genre: 'classeur', fiche: premier })
  })

  it('?classeur=X dans la corbeille, lui ou un dossier parent : la bibliothèque, avec ce qu\'il faut faire', () => {
    expect(choix('?classeur=j', 'r')).toEqual({ genre: 'bibliotheque', message: MESSAGE_CORBEILLE })
    expect(choix('?classeur=d', 'r')).toEqual({ genre: 'bibliotheque', message: MESSAGE_CORBEILLE })
    expect(MESSAGE_CORBEILLE).toBe('Ce classeur est dans la corbeille de la bibliothèque : remettez-le pour l\'ouvrir.')
  })

  it('?classeur=X inconnu (une adresse venue d\'ailleurs), en train de partir ou de naître : la bibliothèque, avec ce qu\'il faut faire', () => {
    expect(choix('?classeur=zzz', 'r')).toEqual({ genre: 'bibliotheque', message: MESSAGE_INCONNU })
    expect(choix('?classeur=', 'r')).toEqual({ genre: 'bibliotheque', message: MESSAGE_INCONNU })
    expect(choix('?classeur=e', 'r', [...fiches, fiche('e', { effacement: 1 })])).toEqual({ genre: 'bibliotheque', message: MESSAGE_INCONNU })
    expect(choix('?classeur=n', 'r', [...fiches, fiche('n', { creation: 1 })])).toEqual({ genre: 'bibliotheque', message: MESSAGE_INCONNU })
    expect(MESSAGE_INCONNU).toBe('Ce classeur n\'est pas dans la bibliothèque de ce navigateur. Pour l\'y ajouter, ouvrez son fichier (.memc).')
  })

  it('sans rien : le dernier ouvert s\'il est visible', () => {
    expect(choix('', 'v')).toEqual({ genre: 'classeur', fiche: vieux })
    expect(choix('', 'p')).toEqual({ genre: 'classeur', fiche: premier })
  })

  it('sans rien, le dernier perdu ou dans la corbeille : le visible ouvert le plus récemment', () => {
    expect(choix('', null)).toEqual({ genre: 'classeur', fiche: recent })
    expect(choix('', 'j')).toEqual({ genre: 'classeur', fiche: recent })
    expect(choix('', 'inconnu')).toEqual({ genre: 'classeur', fiche: recent })
  })

  it('sans rien, aucun ouvert : le premier, s\'il est visible ; sinon le plus récemment modifié', () => {
    const neufs = [fiche('a', { modifie: 5 }), premier, fiche('b', { modifie: 9 })]
    expect(choix('', null, neufs)).toEqual({ genre: 'classeur', fiche: premier })
    const sansPremier = [fiche('a', { modifie: 5 }), fiche('b', { modifie: 9 })]
    expect(choix('', null, sansPremier).genre === 'classeur' && (choix('', null, sansPremier) as { fiche: FicheClasseur }).fiche.id).toBe('b')
  })

  it('sans rien, aucun visible : la bibliothèque, vide', () => {
    expect(choix('', 'j', [jete, range])).toEqual({ genre: 'bibliotheque', message: MESSAGE_VIDE })
    expect(choix('', null, [])).toEqual({ genre: 'bibliotheque', message: MESSAGE_VIDE })
    expect(MESSAGE_VIDE).toBe('La bibliothèque est vide : créez un classeur, ou ouvrez un fichier.')
  })
})

describe('l\'état d\'un classeur neuf', () => {
  it('une page, au fond choisi, et sa naissance dans le film', async () => {
    const etat = await etatNeuf('seyes')
    const d = new Y.Doc({ gc: false })
    Y.applyUpdate(d, etat)
    const ordre = d.getArray<string>('ordre'), film = d.getArray<{ page: string; naissance?: true }>('film')
    expect(ordre.length).toBe(1)
    const page = ordre.get(0)
    const p = d.getMap<Y.Map<unknown>>('pages').get(page)!
    expect(p.get('fond')).toBe('seyes')
    expect((p.get('formes') as Y.Map<unknown>).size).toBe(0)
    expect(film.length).toBe(1)
    expect(film.get(0).page).toBe(page)
    expect(film.get(0).naissance).toBe(true)
    // Ouvert, il n'a pas de page de plus (rangé comme par le chargement
    // depuis la base, qui n'est pas un geste : l'origine du film)
    const t = new Tableau(null)
    Y.applyUpdate(t.doc, etat, 'film')
    const { vide } = await t.charger()
    expect(t.film.length).toBe(1)
    expect(vide).toBe(false)
    expect(t.ordre.length).toBe(1)
    // Deux classeurs neufs n'ont pas la même histoire
    const autre = new Y.Doc(); Y.applyUpdate(autre, await etatNeuf('carreaux'))
    const clients = (u: Uint8Array) => [...Y.decodeStateVector(Y.encodeStateVectorFromUpdate(u)).keys()]
    expect(clients(etat).some(c => clients(Y.encodeStateAsUpdate(autre)).includes(c))).toBe(false)
  })

  it('charger() dit si le document était vide', async () => {
    const t = new Tableau(null)
    expect(await t.charger()).toEqual({ vide: true })
    expect(t.ordre.length).toBe(1)
    expect(await t.charger()).toEqual({ vide: false })
  })
})
