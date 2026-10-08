// La barre d'actions au-dessus de ce qui est pris : ce qu'elle montre selon
// ce qui est pris et le pointeur, et où elle se pose (au-dessus de l'objet,
// dessous s'il n'y a pas la place, en haut de la zone libre pour un objet
// plus haut que l'écran, jamais sur la barre d'outils sauf sur un téléphone
// où elle n'y tient pas, toujours dans la fenêtre). Ce qui se voit dans le
// navigateur (quand elle paraît, qu'elle suit la vue) est vérifié par l'essai
// Playwright du morceau.
import { describe, expect, it, vi } from 'vitest'
import { ECART_DOIGT, actionsDe, barreVisible, clicDuClavier, placeBarre, sortAppui } from '../src/barre-actions'
import type { EtatBarre } from '../src/barre-actions'
import { ICONES } from '../src/icones'
import { menuOuvert, ouvrirMenu, fermerMenu, quandMenuChange } from '../src/menus'
import { titreModifierFormule } from '../src/pointeurs'

const ids = (l: { id: string }[]) => l.map(a => a.id)

describe('ce que montre la barre', () => {
  it('un objet : Dupliquer, Copier, Supprimer, Options ; au doigt, Ajouter avant Options', () => {
    expect(ids(actionsDe({ n: 1, formule: false }, 'mouse'))).toEqual(['dupliquer', 'copier', 'supprimer', 'options'])
    expect(ids(actionsDe({ n: 1, formule: false }, 'pen'))).toEqual(['dupliquer', 'copier', 'supprimer', 'options'])
    expect(ids(actionsDe({ n: 1, formule: false }, 'touch'))).toEqual(['dupliquer', 'copier', 'supprimer', 'ajouter', 'options'])
  })

  it('le stylet posé sur l\'écran (l\'Apple Pencil, sans clavier) a Ajouter ; celui d\'une tablette graphique, non (Maj + clic)', () => {
    expect(ids(actionsDe({ n: 1, formule: false }, 'pen', 'Ctrl', true))).toEqual(['dupliquer', 'copier', 'supprimer', 'ajouter', 'options'])
    expect(ids(actionsDe({ n: 2, formule: false }, 'pen', 'Ctrl', true))).toEqual(['dupliquer', 'copier', 'supprimer', 'ajouter', 'options'])
    expect(ids(actionsDe({ n: 1, formule: false }, 'pen', 'Ctrl', false))).toEqual(['dupliquer', 'copier', 'supprimer', 'options'])
    // La souris sur un écran tactile (un portable à écran tactile) a Maj + clic
    expect(ids(actionsDe({ n: 1, formule: false }, 'mouse', 'Ctrl', true))).toEqual(['dupliquer', 'copier', 'supprimer', 'options'])
  })

  it('une formule : Modifier en tête ; six boutons au doigt', () => {
    expect(ids(actionsDe({ n: 1, formule: true }, 'mouse'))).toEqual(['modifier', 'dupliquer', 'copier', 'supprimer', 'options'])
    expect(ids(actionsDe({ n: 1, formule: true }, 'touch'))).toEqual(['modifier', 'dupliquer', 'copier', 'supprimer', 'ajouter', 'options'])
  })

  it('plusieurs objets : pas de Modifier, même si l\'un est une formule', () => {
    expect(ids(actionsDe({ n: 3, formule: true }, 'mouse'))).toEqual(['dupliquer', 'copier', 'supprimer', 'options'])
    expect(ids(actionsDe({ n: 3, formule: false }, 'touch'))).toEqual(['dupliquer', 'copier', 'supprimer', 'ajouter', 'options'])
  })

  it('les libellés courts, les titres avec le raccourci (⌘ sur Mac)', () => {
    const l = actionsDe({ n: 1, formule: true }, 'mouse', 'Ctrl')
    expect(l.map(a => a.libelle)).toEqual(['Modifier', 'Dupliquer', 'Copier', 'Supprimer', 'Options'])
    expect(l.map(a => a.titre)).toEqual(['Modifier la formule (double-clic)', 'Dupliquer (Ctrl + D)', 'Copier (Ctrl + C)',
      'Supprimer (Suppr)', 'Toutes les options (clic droit)'])
    expect(actionsDe({ n: 1, formule: false }, 'mouse', '⌘')[0].titre).toBe('Dupliquer (⌘ + D)')
    expect(actionsDe({ n: 4, formule: false }, 'mouse').find(a => a.id === 'supprimer')!.titre).toBe('Supprimer les 4 objets (Suppr)')
  })

  it('Options dit le geste direct du pointeur ; jamais « clic » au doigt', () => {
    const titre = (p: 'mouse' | 'pen' | 'touch') => actionsDe({ n: 1, formule: false }, p).find(a => a.id === 'options')!.titre
    expect(titre('mouse')).toBe('Toutes les options (clic droit)')
    expect(titre('pen')).toBe('Toutes les options (bouton du stylet)')
    expect(titre('touch')).toBe('Toutes les options')
    for (const a of actionsDe({ n: 1, formule: true }, 'touch')) expect(a.titre).not.toMatch(/clic/)
    // Le stylet posé sur l'écran (l'Apple Pencil n'a pas de bouton) : l'appui long
    const options = (p: 'mouse' | 'pen' | 'touch', direct: boolean) => actionsDe({ n: 1, formule: false }, p, 'Ctrl', direct).find(a => a.id === 'options')!.titre
    expect(options('pen', true)).toBe('Toutes les options (appui long)')
    expect(options('pen', false)).toBe('Toutes les options (bouton du stylet)')
    expect(options('mouse', true)).toBe('Toutes les options (clic droit)')
  })

  it('Ajouter est un interrupteur ; Supprimer seul est en danger ; chaque icône existe', () => {
    const l = actionsDe({ n: 1, formule: true }, 'touch')
    const ajouter = l.find(a => a.id === 'ajouter')!
    expect(ajouter.interrupteur).toBe(true)
    expect(ajouter.titre).toBe('Ajouter d\'autres objets : touchez-les')
    expect(l.filter(a => a.danger).map(a => a.id)).toEqual(['supprimer'])
    for (const a of l) expect(ICONES[a.icone], a.id).toBeTruthy()
    // Copier : deux feuilles décalées ; Dupliquer : les mêmes et un +
    expect(ICONES[l.find(a => a.id === 'copier')!.icone]).toBe('M8 8h11v11H8zM5 16V5h11')
    expect(ICONES[l.find(a => a.id === 'dupliquer')!.icone]).toBe('M8 8h11v11H8zM5 16V5h11M13.5 11v5M11 13.5h5')
  })
})

describe('où elle se pose', () => {
  const fenetre = { l: 1366, h: 768 }, bords = { gauche: 70, haut: 70 }
  const L = 280, H = 62
  const objet = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom })

  it('juste au-dessus, à 10 px, centrée sur l\'objet : elle ne le cache pas', () => {
    const p = placeBarre(objet(500, 400, 700, 480), L, H, bords, fenetre)
    expect(p).toEqual({ left: 600 - L / 2, top: 400 - 10 - H, dessous: false })
    expect(p.top + H).toBeLessThanOrEqual(400)
  })

  it('au doigt, à 30 px de l\'objet (dessus comme dessous) : un doigt qui retouche l\'objet un peu haut ne touche pas la barre', () => {
    expect(ECART_DOIGT).toBe(30)
    expect(placeBarre(objet(500, 400, 700, 480), L, H, bords, fenetre, ECART_DOIGT)).toEqual({ left: 600 - L / 2, top: 400 - 30 - H, dessous: false })
    expect(placeBarre(objet(500, 100, 700, 180), L, H, bords, fenetre, ECART_DOIGT)).toEqual({ left: 600 - L / 2, top: 210, dessous: true })
    // Juste la place au-dessus, à 30 px
    const top = bords.haut + 8 + H + 30
    expect(placeBarre(objet(500, top, 700, top + 50), L, H, bords, fenetre, ECART_DOIGT).dessous).toBe(false)
    expect(placeBarre(objet(500, top - 1, 700, top + 50), L, H, bords, fenetre, ECART_DOIGT).dessous).toBe(true)
  })

  it('un objet en haut de l\'écran : dessous, à 10 px', () => {
    const p = placeBarre(objet(500, 100, 700, 180), L, H, bords, fenetre)
    expect(p).toEqual({ left: 600 - L / 2, top: 190, dessous: true })
  })

  it('juste la place au-dessus (le bas de la barre du haut plus 8 px) : au-dessus', () => {
    const top = bords.haut + 8 + H + 10
    expect(placeBarre(objet(500, top, 700, top + 50), L, H, bords, fenetre).dessous).toBe(false)
    expect(placeBarre(objet(500, top - 1, 700, top + 50), L, H, bords, fenetre).dessous).toBe(true)
  })

  it('un objet plus haut que l\'écran : en haut de la zone libre, sous la barre du haut', () => {
    const p = placeBarre(objet(400, 20, 900, 760), L, H, bords, fenetre)
    expect(p.top).toBe(bords.haut + 8)
    expect(p.dessous).toBe(false)
  })

  it('jamais à gauche de la barre d\'outils, jamais hors de la fenêtre', () => {
    expect(placeBarre(objet(60, 400, 100, 440), L, H, bords, fenetre).left).toBe(bords.gauche + 8)
    expect(placeBarre(objet(1340, 400, 1400, 440), L, H, bords, fenetre).left).toBe(fenetre.l - L - 8)
    const bas = placeBarre(objet(500, 700, 700, 900), L, H, bords, fenetre)
    expect(bas.top).toBe(700 - 10 - H)
  })

  it('un téléphone où elle ne tient pas à droite de la barre d\'outils : elle passe devant, à 8 px du bord', () => {
    const tel = { l: 390, h: 844 }
    // 304 px tiennent entre la barre d'outils (70) et le bord : à droite d'elle
    expect(placeBarre(objet(100, 500, 200, 540), 304, 60, { gauche: 70, haut: 162 }, tel).left).toBe(78)
    // 320 px n'y tiennent pas : devant elle, dans la fenêtre
    const p = placeBarre(objet(100, 500, 200, 540), 320, 60, { gauche: 70, haut: 162 }, tel)
    expect(p.left).toBe(8)
    expect(p.left + 320).toBeLessThanOrEqual(tel.l - 8)
  })
})

describe('quand elle paraît', () => {
  // Un trait pris à l'outil Sélection, rien d'autre d'ouvert
  const base: EtatBarre = { pris: 1, partie: false, options: false, menu: false, mouvement: false, lecture: false, placement: false,
    seance: false, fenetre: false, outilSelection: true, doigtQuiDeplace: false }

  it('quelque chose de pris, à la Sélection ou au doigt qui déplace ; jamais sous un outil de dessin', () => {
    expect(barreVisible(base)).toBe(true)
    expect(barreVisible({ ...base, pris: 0 })).toBe(false)
    expect(barreVisible({ ...base, outilSelection: false })).toBe(false)
    expect(barreVisible({ ...base, outilSelection: false, doigtQuiDeplace: true })).toBe(true)
  })

  it('un seul menu à la fois : cachée sous le menu de la page (ou tout petit menu), le menu complet, celui d\'un morceau', () => {
    expect(barreVisible({ ...base, menu: true })).toBe(false)
    expect(barreVisible({ ...base, menu: true, outilSelection: false, doigtQuiDeplace: true })).toBe(false)
    expect(barreVisible({ ...base, options: true })).toBe(false)
    expect(barreVisible({ ...base, partie: true })).toBe(false)
  })

  it('cachée quand quelque chose bouge, pendant la revue, une séance, un placement, une fenêtre ouverte', () => {
    for (const k of ['mouvement', 'lecture', 'placement', 'seance', 'fenetre'] as const) expect(barreVisible({ ...base, [k]: true }), k).toBe(false)
  })

  it('un petit menu qui s\'ouvre ou se ferme le dit (la barre se cache, puis revient)', () => {
    const el = () => ({ hidden: true, dataset: {}, addEventListener() {}, contains: () => false }) as unknown as HTMLElement
    const vus: boolean[] = []
    quandMenuChange(() => vus.push(menuOuvert()))
    const a = { el: el() }, b = { el: el() }
    ouvrirMenu(a)
    expect(vus).toEqual([true])
    // En ouvrir un autre ferme le premier : un seul ouvert
    ouvrirMenu(b)
    expect(vus).toEqual([true, false, true])
    expect(a.el.hidden).toBe(true)
    // Fermé par Échap ou un choix : le focus reviendrait à son bouton (sous
    // Node, un document sans focus)
    vi.stubGlobal('document', { activeElement: null })
    try {
      expect(fermerMenu()).toBe(true)
    } finally { vi.unstubAllGlobals() }
    expect(vus).toEqual([true, false, true, false])
    expect(menuOuvert()).toBe(false)
  })
})

describe('un appui sur la barre', () => {
  const appui = (o: Partial<Parameters<typeof sortAppui>[0]> & { dessous?: boolean }) => {
    let demande = false
    const sort = sortAppui({ pointeur: 'touch', outilSelection: true, dedans: true, depuis: 1000, ...o,
      objetDessous: () => { demande = true; return !!o.dessous } })
    return { sort, demande }
  }

  it('la souris et le stylet d\'une tablette graphique, à la Sélection : pour elle, aussitôt', () => {
    expect(appui({ pointeur: 'mouse', depuis: 10 }).sort).toBe('barre')
    expect(appui({ pointeur: 'pen', depuis: 10 }).sort).toBe('barre')
  })

  it('un stylet sous un autre outil veut écrire : au tableau', () => {
    expect(appui({ pointeur: 'pen', outilSelection: false }).sort).toBe('tableau')
  })

  it('un doigt dont le point est hors de la barre (le toucher ajusté de Chrome) : au tableau', () => {
    expect(appui({ dedans: false }).sort).toBe('tableau')
    expect(appui({ dedans: false, depuis: 50 }).sort).toBe('tableau')
  })

  it('un doigt dans la barre, passé 300 ms : pour elle', () => {
    expect(appui({ depuis: 300 }).sort).toBe('barre')
    expect(appui({ depuis: 400 }).demande).toBe(false)
  })

  it('un doigt dans la barre moins de 300 ms après qu\'elle a paru, sur du vide : avalé (la sélection reste) ; sur un objet : au tableau', () => {
    // « Options » touché 120 ms après un lasso, le second toucher d'un
    // double appui tombé dans la barre : rendus au tableau, ils tombaient
    // dans le vide et vidaient la sélection
    expect(appui({ depuis: 120 })).toEqual({ sort: 'rien', demande: true })
    expect(appui({ depuis: 0 }).sort).toBe('rien')
    expect(appui({ depuis: 120, dessous: true }).sort).toBe('tableau')
  })

  it('le clic du clavier agit toujours ; le clic que Chrome tire d\'un toucher, même à detail 0, n\'est pas du clavier', () => {
    expect(clicDuClavier({ detail: 0, pointerType: '' })).toBe(true)
    expect(clicDuClavier({ detail: 0 })).toBe(true)                    // Safari : un MouseEvent
    expect(clicDuClavier({ detail: 0, pointerType: 'touch' })).toBe(false)
    expect(clicDuClavier({ detail: 1, pointerType: 'mouse' })).toBe(false)
    expect(clicDuClavier({ detail: 1 })).toBe(false)
  })
})

describe('« Modifier » une formule, dans la barre et dans son menu complet', () => {
  it('le même titre aux deux endroits : « (double-clic) », sauf au doigt', () => {
    expect(titreModifierFormule('mouse')).toBe('Modifier la formule (double-clic)')
    expect(titreModifierFormule('pen')).toBe('Modifier la formule (double-clic)')
    expect(titreModifierFormule('touch')).toBe('Modifier la formule')
    for (const p of ['mouse', 'pen', 'touch'] as const) {
      expect(actionsDe({ n: 1, formule: true }, p).find(a => a.id === 'modifier')!.titre).toBe(titreModifierFormule(p))
    }
  })
})
