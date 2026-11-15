// =============================================================
// LES OBJECTIFS D'APPRENTISSAGE DANS LE FLASH
// En 5e, la fenêtre du flash a deux listes, comme en 2nde : la liste
// officielle des automatismes du programme, puis la liste des objectifs
// d'apprentissage du cycle 4 (programme-cycle4.ts). Dans la seconde, une
// compétence est un objectif, et ses exercices sont les exercices
// d'application directe que le Catalogue range déjà sous cet objectif
// (le champ « exemples »). Un domaine sans exercice reste visible, en
// gris, « à remplir ».
//
// La clé d'un domaine d'objectifs est « obj: » suivi de son nom dans le
// programme (« obj:Opérations ») : elle ne se confond pas avec celle du
// même domaine dans la liste officielle (« Opérations »).
// =============================================================
import type { NiveauCollege } from './programme-cycle4'
import { PROGRAMME_CYCLE4 } from './programme-cycle4'
import type { ThemeProgramme } from './programme-automatismes'

export const PREFIXE_OBJECTIFS = 'obj:'
/** Les niveaux dont le flash a la liste des objectifs */
export const NIVEAUX_AVEC_OBJECTIFS: readonly string[] = ['5e']

export const estDomaineObjectifs = (cle: string) => cle.startsWith(PREFIXE_OBJECTIFS)

/** Les thèmes du programme avec, pour chaque domaine, la liste de ses
 *  objectifs d'apprentissage comme compétences */
export function themesObjectifs(niveau: NiveauCollege): ThemeProgramme[] {
  return PROGRAMME_CYCLE4[niveau].map(t => ({
    nom: t.nom,
    aRemplir: true,
    section: SECTION_OBJECTIFS,
    domaines: t.domaines.map(d => ({ cle: PREFIXE_OBJECTIFS + d.nom, nom: d.nom, competences: d.objectifs.map(o => o.texte) })),
  }))
}

export const SECTION_AUTOMATISMES = { nom: 'Automatismes du programme', offi: true }
export const SECTION_OBJECTIFS = { nom: 'Objectifs d’apprentissage du programme', offi: false }

/** Pour un exercice d'application : le domaine d'objectifs où il est
 *  rangé et le rang de chaque objectif qu'il travaille */
export function objectifsDeExercice(niveau: string, id: string): { cle: string; ks: number[] } | undefined {
  return rangs(niveau).get(id) ?? SUPPLEMENTS.get(`${niveau}/${id}`)
}
/** Les exercices que le professeur a rangés sous un objectif en plus de
 *  ceux du Catalogue (les anciennes formulations d'une question de cours) */
const SUPPLEMENTS = new Map<string, { cle: string; ks: number[] }>()
export function rangerSousObjectif(niveau: string, id: string, theme: string, k: number) {
  const cle = cleObjectifsDe(niveau, theme)
  if (cle) SUPPLEMENTS.set(`${niveau}/${id}`, { cle, ks: [k] })
}
/** La clé du domaine d'objectifs qui correspond à un thème du flash
 *  (« Repérage » pour « Repérage sur une droite et dans le plan ») */
export function cleObjectifsDe(niveau: string, theme: string): string | undefined {
  for (const t of PROGRAMME_CYCLE4[niveau as NiveauCollege] ?? []) for (const d of t.domaines) {
    if (d.nom === theme || d.nom.startsWith(theme)) return PREFIXE_OBJECTIFS + d.nom
  }
  return undefined
}
const MEMOIRE = new Map<string, Map<string, { cle: string; ks: number[] }>>()
function rangs(niveau: string) {
  let m = MEMOIRE.get(niveau)
  if (m) return m
  m = new Map()
  for (const t of PROGRAMME_CYCLE4[niveau as NiveauCollege] ?? []) for (const d of t.domaines) d.objectifs.forEach((o, k) => {
    for (const id of o.exemples ?? []) {
      const deja = m!.get(id)
      if (deja) deja.ks.push(k)
      else m!.set(id, { cle: PREFIXE_OBJECTIFS + d.nom, ks: [k] })
    }
  })
  MEMOIRE.set(niveau, m)
  return m
}
