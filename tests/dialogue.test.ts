// Le fond d'une fenêtre (src/dialogue.ts) : un appui commencé et fini hors
// du cadre la ferme ; un appui dans sa marge intérieure (que le navigateur
// envoie aussi au <dialog> lui-même), non ; ni un texte sélectionné en
// glissant du champ jusqu'au fond. Ce qui se voit dans le navigateur (la
// souris, le doigt, « Nouveau classeur », « Nouveau dossier ») est vérifié
// par l'essai Playwright des corrections « appareils » du lot 4.
import { describe, expect, it } from 'vitest'
import { fermerSurLeFond } from '../src/dialogue'

/** Une fenêtre de 400 × 300 à (100, 50), sa marge intérieure comprise */
function fenetre() {
  const d = new EventTarget() as EventTarget & { getBoundingClientRect: () => { left: number; top: number; right: number; bottom: number } }
  d.getBoundingClientRect = () => ({ left: 100, top: 50, right: 500, bottom: 350 })
  let fermee = 0
  fermerSurLeFond(d as unknown as HTMLDialogElement, () => { fermee++ })
  const envoyer = (type: string, x: number, y: number) => d.dispatchEvent(Object.assign(new Event(type), { clientX: x, clientY: y }))
  const appui = (x0: number, y0: number, x1 = x0, y1 = y0) => { envoyer('pointerdown', x0, y0); envoyer('click', x1, y1) }
  return { appui, envoyer, fermee: () => fermee }
}

describe('le fond d\'une fenêtre', () => {
  it('un appui sur le fond, hors du cadre, la ferme', () => {
    const f = fenetre()
    f.appui(20, 20)
    expect(f.fermee()).toBe(1)
    f.appui(600, 200)
    expect(f.fermee()).toBe(2)
  })

  it('un appui dans la marge intérieure (à 8 px de chaque bord), non', () => {
    const f = fenetre()
    for (const [x, y] of [[108, 200], [492, 200], [300, 58], [300, 342], [100, 50], [500, 350]]) f.appui(x, y)
    expect(f.fermee()).toBe(0)
  })

  it('un appui commencé dans la fenêtre et fini sur le fond (un texte sélectionné en glissant), non', () => {
    const f = fenetre()
    f.appui(200, 200, 20, 20)
    expect(f.fermee()).toBe(0)
    // Commencé sur le fond, fini dans la fenêtre : non plus
    f.appui(20, 20, 200, 200)
    expect(f.fermee()).toBe(0)
  })

  it('un clic sans appui avant (le début est oublié après chaque clic), non', () => {
    const f = fenetre()
    f.appui(20, 20)
    f.envoyer('click', 20, 20)
    expect(f.fermee()).toBe(1)
  })
})
