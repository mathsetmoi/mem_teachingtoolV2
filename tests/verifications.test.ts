// Les corrections des vérifications des retouches après le lot 5 : ce qui
// s'en calcule sans navigateur. Comment reprendre l'outil qu'on avait quand
// une image a pris la Sélection (messageReprise : sa touche, qui vaut que
// l'image soit encore prise ou non ; « Échap deux fois » ramenait à la
// Sélection une fois l'image lâchée), ce que disent l'import, « Détacher
// l'image du fond » et « Fixer en fond » ; le pointeur d'un clic hors du
// tableau et celui d'avant tout appui (les mots de « Fixer en fond » au
// doigt et à la tablette graphique) ; les poignées du cadre que le message
// ne couvre plus (zonesDesPoignees) ; l'étape à refaire, où App retrouve
// ce qui était pris après Ctrl+Z d'une transformation.
import { describe, expect, it } from 'vitest'
import { cadreDe, zonePastille, zonesDesPoignees } from '../src/cadre'
import { POIGNEE, messageDetache, messageFixe, messageImagePosee, messageReprise, pointeurDeDepart, pointeurDuClic } from '../src/pointeurs'
import type { TypePointeur } from '../src/pointeurs'
import { englobante } from '../src/geometrie'
import type { Boite } from '../src/geometrie'
import { boiteDe } from '../src/revoir/bobine'
import { Tableau } from '../src/document'
import type { Forme, ImageForme, Trait } from '../src/types'

describe('messageReprise : comment reprendre l\'outil qu\'on avait', () => {
  it('au clavier (souris, tablette graphique, Ctrl+V) : la touche de l\'outil, avec son nom', () => {
    expect(messageReprise('mouse', 'stylo', false)).toBe(' P : reprendre le Stylo.')
    expect(messageReprise('mouse', 'surligneur', false)).toBe(' H : reprendre le Surligneur.')
    expect(messageReprise('pen', 'gomme', false)).toBe(' E : reprendre la Gomme.')
    expect(messageReprise('mouse', 'point', false)).toBe(' X : reprendre le Point.')
    expect(messageReprise('mouse', 'segment', false)).toBe(' L : reprendre le Segment.')
    expect(messageReprise('mouse', 'formule', false)).toBe(' F : reprendre la Formule.')
    // Les Formes : la touche de la forme qu'on avait (elle revient telle quelle)
    expect(messageReprise('mouse', 'forme', false, false, 'rectangle')).toBe(' R : reprendre les Formes.')
    expect(messageReprise('mouse', 'forme', false, false, 'cercle')).toBe(' C : reprendre les Formes.')
    expect(messageReprise('pen', 'forme', false, false, 'polygone')).toBe(' G : reprendre les Formes.')
    // La Vue n'a pas de lettre : Échap, deux fois si l'image est encore prise
    expect(messageReprise('mouse', 'main', false)).toBe(' Échap : reprendre l\'outil d\'avant (deux fois si l\'image est encore prise).')
    // Ctrl+V : un clavier, même au doigt
    expect(messageReprise('touch', 'gomme', true, true)).toBe(' E : reprendre la Gomme.')
  })

  it('au doigt et au stylet posé sur l\'écran : le bouton de l\'outil, jamais « clic » ni une touche', () => {
    expect(messageReprise('touch', 'stylo', true)).toBe(' Touchez le Stylo pour écrire de nouveau.')
    expect(messageReprise('pen', 'stylo', true)).toBe(' Touchez le Stylo pour écrire de nouveau.')
    expect(messageReprise('touch', 'gomme', true)).toBe(' Touchez votre outil pour le reprendre.')
    for (const o of ['stylo', 'surligneur', 'gomme', 'point', 'segment', 'forme', 'formule', 'main']) {
      expect(messageReprise('touch', o, true)).not.toMatch(/clic|Échap| : reprendre/)
    }
  })

  it('rien à reprendre depuis la Sélection ; « Échap deux fois » n\'est plus promis', () => {
    for (const p of ['mouse', 'pen', 'touch'] as const) expect(messageReprise(p, 'selection', false)).toBe('')
    for (const o of ['stylo', 'surligneur', 'gomme', 'point', 'segment', 'forme', 'formule', 'main']) {
      expect(messageReprise('mouse', o, false)).not.toMatch(/Échap deux fois/)
    }
  })
})

describe('les messages : l\'import, « Détacher l\'image du fond », « Fixer en fond »', () => {
  it('l\'import : ses coins, sa pastille, puis la touche de l\'outil d\'avant', () => {
    const T = 'Image posée : ses coins l\'agrandissent, ↻ la tourne.'
    expect(messageImagePosee('mouse', 'gomme', false)).toBe(T + ' E : reprendre la Gomme.')
    expect(messageImagePosee('pen', 'forme', false, false, 'cercle')).toBe(T + ' C : reprendre les Formes.')
    expect(messageImagePosee('touch', 'stylo', true)).toBe(T + ' Touchez le Stylo pour écrire de nouveau.')
  })

  it('« Détacher l\'image du fond » : elle se déplace, ses coins l\'agrandissent, ↻ la tourne, et comment reprendre l\'outil', () => {
    expect(messageDetache('mouse', 'stylo', 1, false)).toBe('Image détachée du fond : elle se déplace de nouveau, ses coins l\'agrandissent, ↻ la tourne. P : reprendre le Stylo.')
    expect(messageDetache('pen', 'stylo', 1, false)).toBe('Image détachée du fond : elle se déplace de nouveau, ses coins l\'agrandissent, ↻ la tourne. P : reprendre le Stylo.')
    expect(messageDetache('touch', 'stylo', 1, true)).toBe('Image détachée du fond : elle se déplace de nouveau, ses coins l\'agrandissent, ↻ la tourne. Touchez le Stylo pour écrire de nouveau.')
    expect(messageDetache('mouse', 'selection', 1, false)).toBe('Image détachée du fond : elle se déplace de nouveau, ses coins l\'agrandissent, ↻ la tourne.')
    expect(messageDetache('mouse', 'gomme', 3, false)).toBe('3 images détachées du fond : elles se déplacent de nouveau, les coins du cadre les agrandissent, ↻ les tourne. E : reprendre la Gomme.')
  })

  it('« Fixer en fond » : la Sélection restée en main (choisie) dit comment reprendre le Stylo ; sinon rien de plus', () => {
    const T = 'Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : clic droit dessus, puis « Détacher l\'image du fond ».'
    expect(messageFixe('mouse', 1, false)).toBe(T)
    expect(messageFixe('mouse', 1, false, true)).toBe(T + ' P : reprendre le Stylo.')
    expect(messageFixe('touch', 1, true, true)).toBe('Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : appui long dessus, puis « Détacher l\'image du fond ». Touchez le Stylo pour écrire de nouveau.')
    expect(messageFixe('pen', 2, false, true)).toBe('2 images fixées en fond : écrivez et entourez par-dessus. Pour les tourner ou les déplacer : bouton du stylet dans le vide, puis « Détacher le fond ». P : reprendre le Stylo.')
  })
})

describe('le pointeur d\'un clic hors du tableau, et celui d\'avant tout appui', () => {
  it('pointeurDuClic : le pointerType du clic ; au clavier ou sans lui, celui qu\'on donne', () => {
    const clic = (pointerType?: string) => ({ pointerType }) as unknown as Event
    expect(pointeurDuClic(clic('pen'), 'mouse')).toBe('pen')
    expect(pointeurDuClic(clic('touch'), 'mouse')).toBe('touch')
    expect(pointeurDuClic(clic('mouse'), 'touch')).toBe('mouse')
    // Entrée ou Espace sur le bouton : pointerType vide
    expect(pointeurDuClic(clic(''), 'pen')).toBe('pen')
    // Un clic qui n'est pas un PointerEvent (un navigateur d'avant), ou aucun
    expect(pointeurDuClic(clic(undefined), 'touch')).toBe('touch')
    expect(pointeurDuClic(undefined, 'pen')).toBe('pen')
  })

  it('pointeurDeDepart : le doigt sur un écran tactile sans pointeur fin (un iPad), la souris sinon', () => {
    expect(pointeurDeDepart(true, false)).toBe('touch')
    // Un TNI ou un portable à écran tactile, avec sa souris ou son pavé
    expect(pointeurDeDepart(true, true)).toBe('mouse')
    // L'ordinateur de la classe, à la tablette graphique
    expect(pointeurDeDepart(false, true)).toBe('mouse')
    expect(pointeurDeDepart(false, false)).toBe('mouse')
  })
})

describe('zonesDesPoignees : ce que le message ne couvre pas', () => {
  const base = { z: 7, auteur: 'moi' }
  const image = (o: Partial<ImageForme> = {}): ImageForme => ({ ...base, id: 'i', type: 'image', x: 300, y: 250, src: 'banque1', l: 300, h: 200, m: [1, 0, 0, 1], ...o })
  const zone: Boite = { x: -1000, y: -1000, l: 4000, h: 4000 }
  const o = (pointeur: TypePointeur, z = 1) => ({
    boite: (f: Forme) => (f.type === 'formule' ? englobante(f, { x: f.x, y: f.y, l: 60, h: 40 }) : boiteDe(f)), mesure: () => ({ l: 60, h: 40 }), z, pointeur, zoneLibre: zone,
  })
  const centre = (b: Boite) => ({ x: b.x + b.l / 2, y: b.y + b.h / 2 })

  it('une image : la pastille, les quatre coins et les quatre côtés, chacun à la portée du pointeur', () => {
    for (const p of ['mouse', 'pen', 'touch'] as const) {
      const c = cadreDe([image()], o(p))!, zones = zonesDesPoignees(c, p, 1)
      expect(zones).toHaveLength(9)
      // La pastille, au plus large de sa portée (celle de poigneeSous)
      const r = Math.max(POIGNEE.prise[p], POIGNEE.pastille[p])
      // (les deux, ↺ à gauche de ↻)
      expect(zones[0]).toEqual({ x: c.inverse.x - r, y: c.pastille.y - r, l: c.pastille.x - c.inverse.x + 2 * r, h: 2 * r })
      expect(zones[0].l).toBeGreaterThanOrEqual(zonePastille(c, p, 1).l)
      // Le coin en haut à droite (celui que couvrait le bouton « Fixer en fond »)
      expect(centre(zones[2])).toEqual({ x: 600, y: 250 })
      expect(zones[2].l).toBe(2 * POIGNEE.prise[p])
      // Le côté de droite, au milieu
      expect(zones.map(centre)).toContainEqual({ x: 600, y: 350 })
    }
  })

  it('tournée : les poignées suivent le cadre orienté ; zoomée, leur portée reste la même à l\'écran', () => {
    const a = Math.PI / 4, k = Math.cos(a), s = Math.sin(a)
    const c = cadreDe([image({ m: [k, s, -s, k] })], o('pen'))!
    const zones = zonesDesPoignees(c, 'pen', 1)
    for (const q of c.coins) expect(zones.map(centre)).toContainEqual(q)
    const z2 = zonesDesPoignees(cadreDe([image()], o('mouse', 2))!, 'mouse', 2)
    expect(z2[1].l * 2).toBeCloseTo(2 * POIGNEE.prise.mouse)
  })

  it('une figure seule (pastille sans coins), un objet trop petit pour ses côtés : ce qu\'il a', () => {
    const tri = { ...base, id: 'p', type: 'polygone', x: 0, y: 0, pts: [100, 100, 300, 100, 200, 250], ferme: true, couleur: '#000', taille: 2 } as unknown as Forme
    const cp = cadreDe([tri], o('mouse'))!
    expect(cp.genre).toBe('pastille')
    expect(zonesDesPoignees(cp, 'mouse', 1)).toHaveLength(1)
    const petite = cadreDe([image({ l: 20, h: 20 })], o('mouse'))!
    expect(petite.cotes).toBe(false)
    expect(zonesDesPoignees(petite, 'mouse', 1)).toHaveLength(5)
  })
})

describe('Tableau.prochainRetablissement : l\'étape que Ctrl+Y refera', () => {
  it('neuve à chaque annulation, puis vide une fois refaite', async () => {
    const t = new Tableau(null)
    await t.charger()
    const p = t.ordre.get(0)
    t.pageVue = p
    const trait: Trait = { id: 'a', type: 'trait', x: 0, y: 0, pts: [0, 0, 0.5, 10, 10, 0.5], couleur: '#000', taille: 2.5, z: 1, auteur: 'moi' }
    expect(t.prochainRetablissement(p)).toBeNull()
    t.nouveauGeste(); t.poser(p, trait)
    t.nouveauGeste(); t.modifier(p, [{ id: 'a', patch: { x: 50 } }])
    const haut = t.prochaineAnnulation(p)
    expect(haut).not.toBeNull()
    t.annuler(p)
    const refaire = t.prochainRetablissement(p)
    expect(refaire).not.toBeNull()
    expect(refaire).not.toBe(haut)
    expect((t.formesDe(p)!.get('a') as Trait).x).toBe(0)
    t.retablir(p)
    expect(t.prochainRetablissement(p)).toBeNull()
    expect((t.formesDe(p)!.get('a') as Trait).x).toBe(50)
    expect(t.prochaineAnnulation(p)).not.toBe(refaire)
  })
})
