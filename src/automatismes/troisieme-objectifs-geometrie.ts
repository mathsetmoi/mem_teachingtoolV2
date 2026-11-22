// =============================================================
// LES OBJECTIFS D'APPRENTISSAGE DE 3e : ESPACE ET GÉOMÉTRIE
// Revus par le professeur le 22 novembre 2026, objectif par objectif,
// comme ceux de Nombres et calculs (troisieme-objectifs.ts, qui donne les
// outils exoObjectif, notion et phraseATrou).
// - Le repérage n'a pas d'objectif d'apprentissage en 3e.
// - Les sections (3e objectif de la représentation de l'espace) : les
//   exercices sont en suspens, à sa demande ; la ligne se coche avec ses
//   seules questions de cours.
// - Thalès : jamais « les droites sont-elles parallèles ? » (une chance
//   sur deux) ; on demande quel théorème utiliser, et les énoncés disent
//   toujours que les points sont alignés (dans le même ordre).
// - Pas de calculatrice : des longueurs qui tombent juste, des volumes en
//   valeur exacte (avec π), des cosinus simples (0,5 ; 0,6 ; 0,8…).
// =============================================================
import * as F from '../figures'
import type { Automatisme, QuestionCours } from './outils'
import { choix, coord, ent, frac, irreductible, mot, nb, pts, unite } from './outils'
import { exoObjectif, notion, phraseATrou } from './troisieme-objectifs'

const ES = 'Représentation de l’espace', TR = 'Triangles', TV = 'Translations et vecteurs'

/** Un vecteur : la flèche au-dessus des deux lettres */
const v = (s: string) => `\\overrightarrow{${s}}`
/** Le volume exact d'une boule de rayon r (en cm³), avec π : 36π, \frac{32}{3}π */
const volumeBoule = (r: number, part = 1) => { const f = irreductible(4 * r ** 3, 3 * part); return `${f === '1' ? '' : f}\\pi\\text{ cm}^3` }
/** Un nombre décimal simple en écriture française, sans les zéros inutiles */
const dec = (x: number) => nb(Math.round(x * 100) / 100)

export const AUTOMATISMES_3E_OBJECTIFS_GEOMETRIE: Automatisme[] = [
  // ================= REPRÉSENTATION DE L'ESPACE · OBJ1 : la boule et la sphère =================
  exoObjectif(ES, 0, '3e-obj-point-sphere', 'Un point de la sphère', () => {
    const [A] = pts(1), r = ent(2, 12)
    return { enonce: `Une sphère de centre $O$ a pour rayon $${r}$ cm. Le point $${A}$ est sur la sphère. Combien mesure $O${A}$ ?`, reponse: unite(nb(r), 'cm') }
  }),
  exoObjectif(ES, 0, '3e-obj-ou-est-le-point', 'Où est le point ?', () => {
    const [M] = pts(1), r = ent(3, 10), d = choix([ent(1, r - 1), r, ent(r + 1, r + 6)])
    return {
      enonce: `Une sphère de centre $O$ a pour rayon $${r}$ cm, et $O${M} = ${d}$ cm. Où se trouve le point $${M}$ ?`,
      reponse: mot(d < r ? `à l'intérieur de la sphère ($${M}$ est dans la boule)` : d === r ? 'sur la sphère' : 'à l\'extérieur de la sphère (hors de la boule)'),
    }
  }),
  exoObjectif(ES, 0, '3e-obj-point-boule', 'Un point de la boule', () => {
    const [M] = pts(1), r = ent(3, 12)
    return { enonce: `Une boule de centre $O$ a pour rayon $${r}$ cm. Donner une distance $O${M}$ possible pour un point $${M}$ de la boule qui n'est pas sur la sphère.`, reponse: mot(`n'importe quelle longueur inférieure à $${r}$ cm, par exemple $${r - 1}$ cm`) }
  }),
  exoObjectif(ES, 0, '3e-obj-ensemble-sphere', 'L’ensemble des points à une distance donnée', () => {
    const d = ent(2, 9), [A] = pts(1)
    return { enonce: `Dans l'espace, quel est l'ensemble des points situés à $${d}$ cm d'un point $${A}$ ?`, reponse: mot(`la sphère de centre $${A}$ et de rayon $${d}$ cm`) }
  }),
  exoObjectif(ES, 0, '3e-obj-ensemble-boule', 'L’ensemble des points à une distance au plus', () => {
    const d = ent(2, 9), [A] = pts(1)
    return { enonce: `Dans l'espace, quel est l'ensemble des points situés à $${d}$ cm ou moins d'un point $${A}$ ?`, reponse: mot(`la boule de centre $${A}$ et de rayon $${d}$ cm`) }
  }),
  exoObjectif(ES, 0, '3e-obj-boule-ou-sphere-objet', 'Un objet de la vie courante', () => {
    const [objet, rep] = choix<[string, string]>([
      ['une bille', 'une boule'], ['une orange', 'une boule'], ['une boule de pétanque', 'une boule'], ['une boule de bowling', 'une boule'],
      ['la surface d\'un ballon', 'une sphère'], ['une bulle de savon', 'une sphère'], ['une balle de ping-pong (sa paroi)', 'une sphère'],
    ])
    return { enonce: `Quel objet de géométrie dans l'espace sert de modèle à ${objet} ?`, reponse: mot(rep) }
  }),

  // ================= REPRÉSENTATION DE L'ESPACE · OBJ2 : grands cercles et diamètre =================
  exoObjectif(ES, 1, '3e-obj-diametre-rayon', 'Du diamètre au rayon', () => {
    const r = ent(2, 15)
    return choix([
      { enonce: `Une sphère a un diamètre de $${2 * r}$ cm. Quel est son rayon ?`, reponse: unite(nb(r), 'cm') },
      { enonce: `Une sphère a un rayon de $${r}$ cm. Quel est son diamètre ?`, reponse: unite(nb(2 * r), 'cm') },
    ])
  }),
  exoObjectif(ES, 1, '3e-obj-diametralement-opposes', 'Deux points diamétralement opposés', () => {
    const [A, B] = pts(2), r = ent(2, 15)
    return { enonce: `$${A}$ et $${B}$ sont diamétralement opposés sur une sphère de rayon $${r}$ cm. Combien mesure $${A}${B}$ ?`, reponse: unite(nb(2 * r), 'cm') }
  }),
  exoObjectif(ES, 1, '3e-obj-centre-diametre', 'Le centre sur un diamètre', () => {
    const [A, B, O] = pts(3)
    return { enonce: `$[${A}${B}]$ est un diamètre d'une sphère de centre $${O}$. Où se trouve le point $${O}$ ?`, reponse: mot(`au milieu de $[${A}${B}]$`) }
  }),
  exoObjectif(ES, 1, '3e-obj-rayon-grand-cercle', 'Le rayon d’un grand cercle', () => {
    const r = ent(2, 15)
    return { enonce: `Une sphère a un rayon de $${r}$ cm. Quel est le rayon de ses grands cercles ?`, reponse: unite(nb(r), 'cm') }
  }),
  exoObjectif(ES, 1, '3e-obj-plan-par-le-centre', 'Un plan passant par le centre', () => {
    const r = ent(2, 15)
    return { enonce: `On coupe une sphère de rayon $${r}$ cm par un plan qui passe par son centre. Que trace-t-on sur la sphère ?`, reponse: mot(`un grand cercle, de rayon $${r}$ cm`) }
  }),
  exoObjectif(ES, 1, '3e-obj-equateur', 'L’équateur', () => {
    if (Math.random() < 0.5) return { enonce: 'La Terre est assimilée à une sphère. Comment s\'appelle le grand cercle qui la partage en deux hémisphères, nord et sud ?', reponse: mot('l\'équateur') }
    const R = choix(['6\\,400', '6\\,370'])
    return { enonce: `La Terre est assimilée à une sphère de rayon environ $${R}$ km. L'équateur en est un grand cercle. Quel est son rayon ?`, reponse: `${R}\\text{ km}` }
  }),
  exoObjectif(ES, 1, '3e-obj-longueur-grand-cercle', 'La longueur d’un grand cercle', () => {
    const r = ent(2, 12)
    return { enonce: `Une sphère a un rayon de $${r}$ cm. Quelle est la longueur d'un de ses grands cercles ? Donner la valeur exacte.`, reponse: `${2 * r}\\pi\\text{ cm}` }
  }),

  // ================= REPRÉSENTATION DE L'ESPACE · OBJ3 : les sections =================
  // Les exercices sont en suspens (choix du professeur) : seules les questions de cours

  // ================= REPRÉSENTATION DE L'ESPACE · OBJ4 : le volume de la boule =================
  exoObjectif(ES, 3, '3e-obj-volume-boule-rayon', 'Le volume d’une boule de rayon donné', () => {
    const r = choix([1, 2, 3, 3, 6])
    return { enonce: `Calculer le volume d'une boule de rayon $${r}$ cm, en valeur exacte.`, reponse: volumeBoule(r) }
  }),
  exoObjectif(ES, 3, '3e-obj-volume-boule-diametre', 'Le volume d’une boule de diamètre donné', () => {
    const r = choix([1, 2, 3, 3, 6])
    return { enonce: `Calculer le volume d'une boule de diamètre $${2 * r}$ cm, en valeur exacte.`, reponse: volumeBoule(r) }
  }),
  exoObjectif(ES, 3, '3e-obj-volume-demi-boule', 'Le volume d’une demi-boule', () => {
    const r = choix([1, 3, 3, 6])
    return { enonce: `Calculer le volume d'une demi-boule de rayon $${r}$ cm, en valeur exacte.`, reponse: volumeBoule(r, 2) }
  }),
  exoObjectif(ES, 3, '3e-obj-rayon-dans-formule', 'Retrouver le rayon dans la formule', () => {
    const r = ent(2, 12)
    return { enonce: `Une boule a pour volume $\\frac{4}{3} \\times \\pi \\times ${r}^3$ cm³. Quel est son rayon ?`, reponse: unite(nb(r), 'cm') }
  }),
  exoObjectif(ES, 3, '3e-obj-rayon-double', 'Le volume quand le rayon change', () => {
    const [mot1, k] = choix<[string, number]>([['double', 2], ['triple', 3]])
    if (Math.random() < 0.5) return { enonce: `Si on ${mot1} le rayon d'une boule, par combien son volume est-il multiplié ?`, reponse: mot(`par $${k ** 3}$ ($${k}^3 = ${k ** 3}$)`) }
    const V = ent(2, 12) * 10
    return { enonce: `Une boule a un volume de $${V}$ cm³. On ${mot1} son rayon. Quel est le volume de la nouvelle boule ?`, reponse: mot(`$${nb(V * k ** 3)}$ cm³ (le volume est multiplié par $${k}^3 = ${k ** 3}$)`) }
  }),
  exoObjectif(ES, 3, '3e-obj-volume-approche', 'Une valeur approchée du volume', () => {
    const r = choix([1, 2, 3])
    return { enonce: `En prenant $\\pi \\approx 3$, donner une valeur approchée du volume d'une boule de rayon $${r}$ cm.`, reponse: mot(`environ $${4 * r ** 3}$ cm³ ($\\frac{4}{3} \\times 3 \\times ${r}^3 = ${4 * r ** 3}$)`) }
  }),

  // ================= TRIANGLES · OBJ1 : Thalès, sa réciproque, sa contraposée =================
  ...([false, true] as const).map(papillon => exoObjectif(TR, 0, papillon ? '3e-obj-thales-egalite-papillon' : '3e-obj-thales-egalite', papillon ? 'Écrire l’égalité de Thalès (papillon)' : 'Écrire l’égalité de Thalès (triangles emboîtés)', () => {
    const [A, M, B, N, C] = pts(5)
    return {
      enonce: `Sur la figure, les points $${A}$, $${M}$, $${B}$ sont alignés, ainsi que $${A}$, $${N}$, $${C}$. Les droites $(${M}${N})$ et $(${B}${C})$ sont parallèles. Écrire l'égalité des rapports de Thalès.`,
      reponse: `\\frac{${A}${M}}{${A}${B}} = \\frac{${A}${N}}{${A}${C}} = \\frac{${M}${N}}{${B}${C}}`,
      figure: F.thales(A + M + B + N + C, papillon),
    }
  })),
  ...([false, true] as const).map(papillon => exoObjectif(TR, 0, papillon ? '3e-obj-thales-longueur-papillon' : '3e-obj-thales-longueur', papillon ? 'Calculer une longueur avec Thalès (papillon)' : 'Calculer une longueur avec Thalès (triangles emboîtés)', () => {
    const [A, M, B, N, C] = pts(5)
    const [p, q] = choix<[number, number]>([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [3, 5], [1, 4]])
    let t: number, s: number, u: number
    do { t = ent(1, 4); s = ent(1, 4); u = ent(1, 4) } while (u >= t + s || t >= s + u || s >= t + u)
    const L: Record<string, number> = { [A + M]: p * t, [A + B]: q * t, [A + N]: p * s, [A + C]: q * s, [M + N]: p * u, [B + C]: q * u }
    // On cherche un côté du petit triangle ou du grand ; on donne les deux longueurs d'un rapport et une du rapport cherché
    const [cherche, donnes] = choix<[string, string[]]>([
      [A + N, [A + M, A + B, A + C]], [A + M, [A + N, A + C, A + B]], [M + N, [A + M, A + B, B + C]], [A + C, [A + M, A + B, A + N]], [B + C, [A + N, A + C, M + N]],
    ])
    return {
      enonce: `Sur la figure, les points $${A}$, $${M}$, $${B}$ sont alignés, ainsi que $${A}$, $${N}$, $${C}$. La droite $(${M}${N})$ est parallèle à $(${B}${C})$. On sait que ${donnes.map(d => `$${d} = ${L[d]}$ cm`).join(', ')}. Calculer $${cherche}$.`,
      reponse: unite(nb(L[cherche]), 'cm'),
      figure: F.thales(A + M + B + N + C, papillon),
    }
  })),
  exoObjectif(TR, 0, '3e-obj-thales-quel-theoreme-parallele', 'Quel théorème pour démontrer le parallélisme ?', () => {
    const [A, M, B, N, C] = pts(5)
    return { enonce: `Les points $${A}$, $${M}$, $${B}$ et $${A}$, $${N}$, $${C}$ sont alignés dans le même ordre, et $\\frac{${A}${M}}{${A}${B}} = \\frac{${A}${N}}{${A}${C}}$. Quel théorème permet de démontrer que les droites $(${M}${N})$ et $(${B}${C})$ sont parallèles ?`, reponse: mot('la réciproque du théorème de Thalès') }
  }),

  // ================= TRIANGLES · OBJ2 : cosinus, sinus, tangente =================
  exoObjectif(TR, 1, '3e-obj-trigo-ecrire', 'Écrire un cosinus, un sinus ou une tangente', () => {
    const [A, B, C] = pts(3), [S, autre] = choix([[B, C], [C, B]])
    const f = choix(['cos', 'sin', 'tan'])
    const adj = `${A}${S}`, opp = `${A}${autre}`, hyp = `${B}${C}`
    const rep = f === 'cos' ? `\\frac{${adj}}{${hyp}}` : f === 'sin' ? `\\frac{${opp}}{${hyp}}` : `\\frac{${opp}}{${adj}}`
    return { enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$. Écrire $\\${f} \\widehat{${A}${S}${autre}}$ avec les longueurs des côtés.`, reponse: rep, figure: F.triangleRectangleNomme(A + B + C, ent(0, 359)) }
  }),
  exoObjectif(TR, 1, '3e-obj-trigo-calculer-cos-sin', 'Calculer un cosinus ou un sinus', () => {
    const [A, B, C] = pts(3), [a, b, c] = choix<[number, number, number]>([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]])
    // a = AB (adjacent à B), b = AC (opposé à B), c = BC
    const f = choix(['cos', 'sin']), n = f === 'cos' ? a : b
    const r = irreductible(n, c), d = n / c
    return {
      enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${A}${B} = ${a}$ cm, $${A}${C} = ${b}$ cm et $${B}${C} = ${c}$ cm. Calculer $\\${f} \\widehat{${A}${B}${C}}$.`,
      reponse: c % 13 === 0 ? r : `${r} = ${dec(d)}`, figure: F.triangleRectangleNomme(A + B + C, ent(0, 359)),
    }
  }),
  exoObjectif(TR, 1, '3e-obj-trigo-calculer-tan', 'Calculer une tangente', () => {
    const [A, B, C] = pts(3), [a, b, c] = choix<[number, number, number]>([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]])
    return {
      enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${A}${B} = ${a}$ cm, $${A}${C} = ${b}$ cm et $${B}${C} = ${c}$ cm. Calculer $\\tan \\widehat{${A}${B}${C}}$.`,
      reponse: irreductible(b, a), figure: F.triangleRectangleNomme(A + B + C, ent(0, 359)),
    }
  }),
  exoObjectif(TR, 1, '3e-obj-trigo-cote-cos', 'Calculer un côté avec le cosinus', () => {
    const [A, B, C] = pts(3), h = choix([5, 10, 20, 50]), c = choix([0.2, 0.4, 0.5, 0.6, 0.8])
    return { enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${B}${C} = ${h}$ cm et $\\cos \\widehat{${A}${B}${C}} = ${dec(c)}$. Calculer $${A}${B}$.`, reponse: unite(dec(h * c), 'cm'), figure: F.triangleRectangleNomme(A + B + C, ent(0, 359)) }
  }),
  exoObjectif(TR, 1, '3e-obj-trigo-cote-sin-tan', 'Calculer un côté avec le sinus ou la tangente', () => {
    const [A, B, C] = pts(3)
    if (Math.random() < 0.5) {
      const h = choix([10, 20, 30, 50]), s = choix([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8])
      return { enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${B}${C} = ${h}$ cm et $\\sin \\widehat{${A}${B}${C}} = ${dec(s)}$. Calculer $${A}${C}$.`, reponse: unite(dec(h * s), 'cm'), figure: F.triangleRectangleNomme(A + B + C, ent(0, 359)) }
    }
    const a = choix([4, 6, 8, 10, 12]), t = choix([0.5, 0.75, 1.5, 2])
    return { enonce: `Le triangle $${A}${B}${C}$ est rectangle en $${A}$, avec $${A}${B} = ${a}$ cm et $\\tan \\widehat{${A}${B}${C}} = ${dec(t)}$. Calculer $${A}${C}$.`, reponse: unite(dec(a * t), 'cm'), figure: F.triangleRectangleNomme(A + B + C, ent(0, 359)) }
  }),
  exoObjectif(TR, 1, '3e-obj-trigo-quel-rapport', 'Quel rapport choisir ?', () => {
    const [connu, cherche, rep] = choix<[string, string, string]>([
      ['l\'hypoténuse', 'le côté adjacent à cet angle', 'le cosinus'], ['le côté adjacent à cet angle', 'l\'hypoténuse', 'le cosinus'],
      ['l\'hypoténuse', 'le côté opposé à cet angle', 'le sinus'], ['le côté opposé à cet angle', 'l\'hypoténuse', 'le sinus'],
      ['le côté adjacent à cet angle', 'le côté opposé à cet angle', 'la tangente'], ['le côté opposé à cet angle', 'le côté adjacent à cet angle', 'la tangente'],
    ])
    return { enonce: `Dans un triangle rectangle, on connaît un angle aigu et ${connu}, et on cherche ${cherche}. Quelle ligne trigonométrique faut-il utiliser ?`, reponse: mot(rep) }
  }),

  // ================= TRANSLATIONS ET VECTEURS · OBJ1 : la translation et le parallélogramme =================
  exoObjectif(TV, 0, '3e-obj-translation-image', 'L’image d’un point par une translation', () => {
    const [A, B, C, D] = pts(4)
    return { enonce: `$${A}${B}${D}${C}$ est un parallélogramme. Par la translation qui transforme $${A}$ en $${B}$, quelle est l'image de $${C}$ ?`, reponse: mot(`le point $${D}$`) }
  }),
  exoObjectif(TV, 0, '3e-obj-translation-nature', 'La nature du quadrilatère', () => {
    const [A, B, C, D] = pts(4)
    return { enonce: `La translation qui transforme $${A}$ en $${B}$ transforme $${C}$ en $${D}$. Quelle est la nature du quadrilatère $${A}${B}${D}${C}$ ?`, reponse: mot('un parallélogramme (éventuellement aplati)') }
  }),
  exoObjectif(TV, 0, '3e-obj-translation-laquelle', 'Quelle translation ?', () => {
    const [A, B, C, D] = pts(4)
    return { enonce: `$${A}${B}${D}${C}$ est un parallélogramme. Par quelle translation $${C}$ a-t-il pour image $${D}$ ?`, reponse: mot(`la translation qui transforme $${A}$ en $${B}$`) }
  }),
  exoObjectif(TV, 0, '3e-obj-translation-inverse', 'La translation dans l’autre sens', () => {
    const [A, B, C, D] = pts(4)
    return { enonce: `Par la translation qui transforme $${A}$ en $${B}$, $${C}$ a pour image $${D}$. Par quelle translation $${D}$ a-t-il pour image $${C}$ ?`, reponse: mot(`la translation qui transforme $${B}$ en $${A}$`) }
  }),
  exoObjectif(TV, 0, '3e-obj-translation-repere', 'Une translation dans un repère', () => {
    for (;;) {
      const [A, B, C] = pts(3), a = { x: ent(-4, 4), y: ent(-4, 4) }, b = { x: ent(-4, 4), y: ent(-4, 4) }, c = { x: ent(-4, 4), y: ent(-4, 4) }
      const d = { x: c.x + b.x - a.x, y: c.y + b.y - a.y }
      if ((a.x === b.x && a.y === b.y) || Math.abs(d.x) > 5 || Math.abs(d.y) > 5) continue
      if ([a, b, c].some((p, i, t) => t.some((q, j) => j !== i && p.x === q.x && p.y === q.y)) || (c.x === b.x && c.y === b.y)) continue
      return {
        enonce: `Par la translation qui transforme $${A}${coord(a.x, a.y)}$ en $${B}${coord(b.x, b.y)}$, quelle est l'image du point $${C}${coord(c.x, c.y)}$ ?`,
        reponse: mot(`le point de coordonnées $${coord(d.x, d.y)}$`),
        figure: F.reperePoints([{ ...a, nom: A }, { ...b, nom: B }, { ...c, nom: C }]),
      }
    }
  }),

  // ================= TRANSLATIONS ET VECTEURS · OBJ2 : vecteurs =================
  exoObjectif(TV, 1, '3e-obj-vecteurs-egaux', 'Des vecteurs égaux dans un parallélogramme', () => {
    const [A, B, C, D] = pts(4)
    return choix([
      { enonce: `$${A}${B}${D}${C}$ est un parallélogramme. Compléter : $${v(A + B)} = \\overrightarrow{\\phantom{AB}}$`, reponse: v(C + D) },
      { enonce: `$${A}${B}${D}${C}$ est un parallélogramme. Compléter : $${v(A + C)} = \\overrightarrow{\\phantom{AB}}$`, reponse: v(B + D) },
    ])
  }),
  exoObjectif(TV, 1, '3e-obj-vecteurs-nature', 'Des vecteurs égaux : la nature du quadrilatère', () => {
    const [A, B, C, D] = pts(4)
    return { enonce: `$${v(A + B)} = ${v(C + D)}$. Quelle est la nature du quadrilatère $${A}${B}${D}${C}$ ?`, reponse: mot('un parallélogramme (éventuellement aplati)') }
  }),
  exoObjectif(TV, 1, '3e-obj-vecteurs-milieu', 'Le milieu', () => {
    const [A, B, I] = pts(3)
    return choix([
      { enonce: `$${I}$ est le milieu de $[${A}${B}]$. Compléter : $${v(A + I)} = \\overrightarrow{\\phantom{AB}}$`, reponse: v(I + B) },
      { enonce: `$${I}$ est le milieu de $[${A}${B}]$. Compléter : $${v(B + I)} = \\overrightarrow{\\phantom{AB}}$`, reponse: v(I + A) },
    ])
  }),
  exoObjectif(TV, 1, '3e-obj-vecteur-oppose', 'L’opposé d’un vecteur', () => {
    const [A, B] = pts(2)
    return { enonce: `Quel est l'opposé du vecteur $${v(A + B)}$ ?`, reponse: mot(`le vecteur $${v(B + A)}$`) }
  }),
  exoObjectif(TV, 1, '3e-obj-vecteur-nul', 'Le vecteur nul', () => {
    const [A] = pts(1)
    return { enonce: `Comment s'appelle le vecteur $${v(A + A)}$ ?`, reponse: mot('le vecteur nul') }
  }),
  exoObjectif(TV, 1, '3e-obj-vecteur-translation', 'Vecteur et translation', () => {
    const [A, B, C, D] = pts(4)
    return { enonce: `$${v(A + B)} = ${v(C + D)}$. Quelle est l'image de $${C}$ par la translation de vecteur $${v(A + B)}$ ?`, reponse: mot(`le point $${D}$`) }
  }),

  // ================= TRANSLATIONS ET VECTEURS · OBJ3 : la somme de deux vecteurs =================
  exoObjectif(TV, 2, '3e-obj-enchainer-translations', 'Enchaîner deux translations', () => {
    const [A, B, C] = pts(3)
    return { enonce: `On applique la translation de vecteur $${v(A + B)}$, puis celle de vecteur $${v(B + C)}$. Par quelle translation peut-on les remplacer ?`, reponse: mot(`la translation de vecteur $${v(A + C)}$`) }
  }),
  exoObjectif(TV, 2, '3e-obj-enchainer-images', 'Enchaîner deux translations (points images)', () => {
    const [A, B, C, M] = pts(4)
    return { enonce: `Par la translation qui transforme $${A}$ en $${B}$, $${M}$ a pour image $${M}'$ ; puis, par celle qui transforme $${B}$ en $${C}$, $${M}'$ a pour image $${M}''$. Par quelle translation $${M}$ a-t-il pour image $${M}''$ ?`, reponse: mot(`la translation qui transforme $${A}$ en $${C}$`) }
  }),
  exoObjectif(TV, 2, '3e-obj-somme-parallelogramme', 'La somme dans un parallélogramme', () => {
    const [A, B, C, D] = pts(4)
    return { enonce: `$${A}${B}${C}${D}$ est un parallélogramme. Compléter : $${v(A + B)} + ${v(A + D)} = \\overrightarrow{\\phantom{AB}}$`, reponse: v(A + C) }
  }),
  exoObjectif(TV, 2, '3e-obj-somme-repere', 'Enchaîner deux translations dans un repère', () => {
    for (;;) {
      const [A, B, C, M] = pts(4)
      const a = { x: ent(-3, 3), y: ent(-3, 3) }, b = { x: ent(-4, 4), y: ent(-4, 4) }, c = { x: ent(-4, 4), y: ent(-4, 4) }, m = { x: ent(-4, 4), y: ent(-4, 4) }
      const f = { x: m.x + c.x - a.x, y: m.y + c.y - a.y }
      const tous = [a, b, c, m]
      if (Math.abs(f.x) > 5 || Math.abs(f.y) > 5 || tous.some((p, i) => tous.some((q, j) => j !== i && p.x === q.x && p.y === q.y))) continue
      if ((a.x === b.x && a.y === b.y) || (b.x === c.x && b.y === c.y) || (a.x === c.x && a.y === c.y)) continue
      return {
        enonce: `On applique au point $${M}${coord(m.x, m.y)}$ la translation qui transforme $${A}${coord(a.x, a.y)}$ en $${B}${coord(b.x, b.y)}$, puis celle qui transforme $${B}$ en $${C}${coord(c.x, c.y)}$. Quelles sont les coordonnées de l'image finale de $${M}$ ?`,
        reponse: coord(f.x, f.y),
        figure: F.reperePoints([{ ...a, nom: A }, { ...b, nom: B }, { ...c, nom: C }, { ...m, nom: M }]),
      }
    }
  }),

  // ================= TRANSLATIONS ET VECTEURS · OBJ4 : la relation de Chasles =================
  exoObjectif(TV, 3, '3e-obj-chasles-simple', 'La relation de Chasles', () => {
    const [A, B, C] = pts(3)
    return { enonce: `Compléter : $${v(A + B)} + ${v(B + C)} = \\overrightarrow{\\phantom{AB}}$`, reponse: v(A + C) }
  }),
  exoObjectif(TV, 3, '3e-obj-chasles-milieu', 'Le vecteur du milieu', () => {
    const [A, B, M] = pts(3)
    return choix([
      { enonce: `Compléter : $${v(A + M)} + \\overrightarrow{\\phantom{AB}} = ${v(A + B)}$`, reponse: v(M + B) },
      { enonce: `Compléter : $\\overrightarrow{\\phantom{AB}} + ${v(M + B)} = ${v(A + B)}$`, reponse: v(A + M) },
    ])
  }),
  exoObjectif(TV, 3, '3e-obj-chasles-trois', 'Trois vecteurs', () => {
    const [A, B, C, D] = pts(4)
    return { enonce: `Compléter : $${v(A + B)} + ${v(B + C)} + ${v(C + D)} = \\overrightarrow{\\phantom{AB}}$`, reponse: v(A + D) }
  }),
  exoObjectif(TV, 3, '3e-obj-chasles-desordre', 'Dans le désordre', () => {
    const [A, B, C] = pts(3)
    return { enonce: `Compléter : $${v(B + C)} + ${v(A + B)} = \\overrightarrow{\\phantom{AB}}$`, reponse: v(A + C) }
  }),
  exoObjectif(TV, 3, '3e-obj-chasles-aller-retour', 'Un aller-retour', () => {
    const [A, B] = pts(2)
    return { enonce: `Compléter : $${v(A + B)} + ${v(B + A)} = \\ldots$`, reponse: mot('le vecteur nul, $\\vec{0}$') }
  }),
  exoObjectif(TV, 3, '3e-obj-chasles-soustraction', 'Avec une soustraction', () => {
    const [A, B, C] = pts(3)
    return { enonce: `Compléter : $${v(A + C)} - ${v(B + C)} = \\overrightarrow{\\phantom{AB}}$`, reponse: mot(`$${v(A + B)}$ (car $-${v(B + C)} = ${v(C + B)}$)`) }
  }),
]

// ---------- Les questions de cours ----------
const theoremes = (A: string, M: string, B: string, N: string, C: string) => ({
  direct: `Si les points $${A}$, $${M}$, $${B}$ et $${A}$, $${N}$, $${C}$ sont alignés et si les droites $(${M}${N})$ et $(${B}${C})$ sont parallèles, alors $\\frac{${A}${M}}{${A}${B}} = \\frac{${A}${N}}{${A}${C}} = \\frac{${M}${N}}{${B}${C}}$.`,
  reciproque: `Si les points $${A}$, $${M}$, $${B}$ et $${A}$, $${N}$, $${C}$ sont alignés dans le même ordre et si $\\frac{${A}${M}}{${A}${B}} = \\frac{${A}${N}}{${A}${C}}$, alors les droites $(${M}${N})$ et $(${B}${C})$ sont parallèles.`,
  contraposee: `Si les points $${A}$, $${M}$, $${B}$ et $${A}$, $${N}$, $${C}$ sont alignés dans le même ordre et si $\\frac{${A}${M}}{${A}${B}} \\neq \\frac{${A}${N}}{${A}${C}}$, alors les droites $(${M}${N})$ et $(${B}${C})$ ne sont pas parallèles.`,
})

export const COURS_3E_OBJECTIFS_GEOMETRIE: QuestionCours[] = [
  // Représentation de l'espace · OBJ1
  notion(ES, 200, 0, 'La sphère', () => phraseATrou('la [sphère] de centre $O$ et de rayon $r$ est l\'ensemble des points de l\'espace situés à une distance [égale à] $r$ du point $O$.')),
  notion(ES, 201, 0, 'La boule', () => phraseATrou('la [boule] de centre $O$ et de rayon $r$ est l\'ensemble des points de l\'espace situés à une distance [inférieure ou égale à] $r$ du point $O$.')),
  notion(ES, 202, 0, 'Sphère et boule', () => { const [A] = pts(1), r = ent(2, 9); return [`Quelle est la différence entre la sphère et la boule de centre $${A}$ et de rayon $${r}$ cm ?`, `la sphère est la surface, formée des points situés à exactement $${r}$ cm de $${A}$ ; la boule est le solide plein, formé des points situés à $${r}$ cm ou moins de $${A}$`] }),
  // Représentation de l'espace · OBJ2
  notion(ES, 203, 1, 'Un grand cercle', () => phraseATrou('un [grand cercle] d\'une sphère est un cercle de même [centre] et de même [rayon] que la sphère.')),
  notion(ES, 204, 1, 'Un diamètre', () => phraseATrou('un [diamètre] d\'une sphère est un segment qui passe par son [centre] et dont les extrémités sont sur la sphère.')),
  notion(ES, 205, 1, 'Diamètre et rayon', () => phraseATrou('le [diamètre] d\'une sphère mesure [deux] fois son [rayon].')),
  // Représentation de l'espace · OBJ3 (les exercices sont en suspens)
  notion(ES, 206, 2, 'La section d’un pavé', () => phraseATrou('la section d\'un pavé par un plan [parallèle] à une [face] est un [rectangle] de mêmes dimensions que cette face.')),
  notion(ES, 207, 2, 'La section d’un cylindre',
    () => phraseATrou('la section d\'un cylindre par un plan [perpendiculaire] à son axe est un [disque] de même rayon que sa base.'),
    () => phraseATrou('la section d\'un cylindre par un plan [parallèle] à son axe est un [rectangle].'),
  ),
  notion(ES, 208, 2, 'La section d’une boule',
    () => phraseATrou('la section d\'une [boule] par un plan est un [disque].'),
    () => phraseATrou('la section d\'une [sphère] par un plan est un [cercle].'),
  ),
  // Représentation de l'espace · OBJ4
  notion(ES, 209, 3, 'Le volume d’une boule', () => {
    const r = choix(['r', 'R']), morceaux = ['\\frac{4}{3}', '\\pi', `${r}^3`], k = ent(-1, 2)
    if (k < 0) return [`Compléter : le volume d'une boule de rayon $${r}$ est $V = \\ldots$`, `$\\frac{4}{3} \\times \\pi \\times ${r}^3$`]
    return [`Compléter : le volume d'une boule de rayon $${r}$ est $V = ${morceaux.map((m, i) => (i === k ? '\\ldots' : m)).join(' \\times ')}$`, `$${morceaux[k]}$`]
  }),
  notion(ES, 210, 3, 'Les lettres de la formule', () => {
    const r = choix(['r', 'R']), [lettre, sens] = choix<[string, string]>([[r, 'le rayon de la boule'], ['V', 'le volume de la boule']])
    return [`Dans la formule $V = \\frac{4}{3} \\times \\pi \\times ${r}^3$ du volume d'une boule, que représente $${lettre}$ ?`, sens]
  }),
  // Triangles · OBJ1
  notion(TR, 200, 0, 'Le théorème de Thalès', () => {
    const [A, M, B, N, C] = pts(5)
    return [`Compléter : si les points $${A}$, $${M}$, $${B}$ et $${A}$, $${N}$, $${C}$ sont alignés et si les droites $(${M}${N})$ et $(${B}${C})$ sont …, alors $\\frac{${A}${M}}{${A}${B}} = \\frac{${A}${N}}{${A}${C}} = \\frac{${M}${N}}{${B}${C}}$.`, 'parallèles']
  }),
  notion(TR, 201, 0, 'Démontrer que deux droites ne sont pas parallèles', () => {
    const [A, M, B, N, C] = pts(5)
    let r1: [number, number], r2: [number, number]
    do { r1 = choix([[1, 2], [2, 3], [3, 5], [3, 4], [2, 5], [4, 7]]); r2 = choix([[1, 2], [2, 3], [3, 5], [3, 4], [2, 5], [4, 7]]) } while (r1[0] * r2[1] === r2[0] * r1[1])
    return [`Les points $${A}$, $${M}$, $${B}$ et $${A}$, $${N}$, $${C}$ sont alignés dans le même ordre, avec $\\frac{${A}${M}}{${A}${B}} = ${frac(...r1)}$ et $\\frac{${A}${N}}{${A}${C}} = ${frac(...r2)}$. Quel théorème permet de démontrer que les droites $(${M}${N})$ et $(${B}${C})$ ne sont pas parallèles ?`, 'la contraposée du théorème de Thalès']
  }),
  notion(TR, 202, 0, 'Calculer une longueur', () => {
    const [A, M, B, N, C] = pts(5)
    return [`Les points $${A}$, $${M}$, $${B}$ et $${A}$, $${N}$, $${C}$ sont alignés, et les droites $(${M}${N})$ et $(${B}${C})$ sont parallèles. Quel théorème permet de calculer $${A}${N}$ ?`, 'le théorème de Thalès']
  }),
  notion(TR, 203, 0, 'De quel théorème s’agit-il ?', () => {
    const t = theoremes(...(pts(5) as [string, string, string, string, string]))
    const [e, r] = choix<[string, string]>([[t.direct, 'le théorème de Thalès'], [t.reciproque, 'la réciproque du théorème de Thalès'], [t.contraposee, 'la contraposée du théorème de Thalès']])
    return [`De quel théorème s'agit-il ? « ${e} »`, r]
  }),
  notion(TR, 204, 0, 'La réciproque du théorème de Thalès', () => {
    const [A, M, B, N, C] = pts(5)
    return [`Compléter : si $\\frac{${A}${M}}{${A}${B}} = \\frac{${A}${N}}{${A}${C}}$ et si les points $${A}$, $${M}$, $${B}$ et $${A}$, $${N}$, $${C}$ sont alignés dans le même ordre, alors les droites $(${M}${N})$ et $(${B}${C})$ sont …`, 'parallèles']
  }),
  // Triangles · OBJ2
  notion(TR, 205, 1, 'Cosinus, sinus, tangente',
    () => phraseATrou('dans un triangle rectangle, le [cosinus] d\'un angle aigu est égal au quotient du côté [adjacent] par l\'[hypoténuse].'),
    () => phraseATrou('dans un triangle rectangle, le [sinus] d\'un angle aigu est égal au quotient du côté [opposé] par l\'[hypoténuse].'),
    () => phraseATrou('dans un triangle rectangle, la [tangente] d\'un angle aigu est égale au quotient du côté [opposé] par le côté [adjacent].'),
  ),
  notion(TR, 206, 1, 'Entre 0 et 1', () => {
    const quoi = choix(['le cosinus et le sinus d\'un angle aigu sont toujours compris', 'le cosinus d\'un angle aigu est toujours compris', 'le sinus d\'un angle aigu est toujours compris'])
    return choix<[string, string]>([[`Compléter : ${quoi} entre $0$ et …`, '$1$'], [`Compléter : ${quoi} entre … et $1$.`, '$0$']])
  }),
  notion(TR, 207, 1, 'Le triangle rectangle', () => [`Dans quel type de triangle utilise-t-on ${choix(['le cosinus', 'le sinus', 'la tangente', 'le cosinus, le sinus et la tangente'])} d'un angle aigu ?`, 'dans un triangle rectangle']),
  // Translations et vecteurs · OBJ1
  notion(TV, 200, 0, 'La translation et le parallélogramme', () => {
    const [A, B, C, D] = pts(4)
    return [`Compléter : la translation qui transforme $${A}$ en $${B}$ transforme $${C}$ en $${D}$ lorsque $${A}${B}${D}${C}$ est un …`, 'parallélogramme']
  }),
  // Translations et vecteurs · OBJ2
  notion(TV, 201, 1, 'Un vecteur', () => phraseATrou('un vecteur est défini par une [direction], un [sens] et une [longueur].')),
  notion(TV, 202, 1, 'Des vecteurs égaux', () => phraseATrou('deux vecteurs sont égaux lorsqu\'ils ont la même [direction], le même [sens] et la même [longueur].')),
  notion(TV, 203, 1, 'L’opposé d’un vecteur', () => { const [A, B] = pts(2); return [`Compléter : le vecteur $${v(B + A)}$ est l'… du vecteur $${v(A + B)}$.`, 'opposé'] }),
  // Translations et vecteurs · OBJ3
  notion(TV, 204, 2, 'Enchaîner deux translations', () => { const [u, w] = choix([['u', 'v'], ['v', 'w'], ['u', 'w']]); return [`Compléter : appliquer la translation de vecteur $\\vec{${u}}$, puis celle de vecteur $\\vec{${w}}$, revient à appliquer la translation de vecteur …`, `$\\vec{${u}} + \\vec{${w}}$`] }),
  notion(TV, 205, 2, 'La règle du parallélogramme', () => { const [A, B, C, D] = pts(4); return [`Compléter : si $${A}${B}${C}${D}$ est un parallélogramme, alors $${v(A + B)} + ${v(A + D)} = \\overrightarrow{\\phantom{AB}}$`, `$${v(A + C)}$`] }),
  // Translations et vecteurs · OBJ4
  notion(TV, 206, 3, 'La relation de Chasles', () => { const [A, B, C] = pts(3); return [`Compléter : pour tous points $${A}$, $${B}$ et $${C}$, $${v(A + B)} + ${v(B + C)} = \\overrightarrow{\\phantom{AB}}$`, `$${v(A + C)}$`] }),
  notion(TV, 207, 3, 'Le nom de la relation', () => { const [A, B, C] = pts(3); return [`Comment s'appelle l'égalité $${v(A + B)} + ${v(B + C)} = ${v(A + C)}$ ?`, 'la relation de Chasles'] }),
]
