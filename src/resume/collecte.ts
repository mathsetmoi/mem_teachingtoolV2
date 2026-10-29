// =============================================================
// CE QUE LE TABLEAU SAIT D'UNE SÉANCE, POUR LA RÉSUMER
// Lit dans le document les pages d'une séance (leur nom, leurs formes), le
// film (la minute où l'on a écrit sur chaque page pour la première fois, le
// dernier geste) et ce qui a été posé d'un coup (Tableau.activitesDe), et en
// fait la fiche que resume/fiche.ts résume. Rien n'est écrit.
// =============================================================
import type { Tableau } from '../document'
import { deLaSeance } from '../seances'
import type { FicheDeSeance, PageResumee } from './fiche'
import { contenuDeLaPage } from './fiche'

/** La fiche de la séance `id` (null : elle n'existe pas, ou n'a pas de page) */
export function ficheDeLaSeance(t: Tableau, id: string, chapitre: string, maintenant = Date.now()): FicheDeSeance | null {
  const s = t.seancesDuClasseur().find(x => x.id === id)
  if (!s || !s.pages.length) return null
  const ici = new Set(s.pages)
  const premiere = new Map<string, number>()
  let fin = s.debut
  const film = t.film.toArray()
  for (const e of film) {
    if (e.t < s.depuis || !ici.has(e.page) || e.seulOrdre || e.naissance || e.reglage) continue
    if (!premiere.has(e.page)) premiere.set(e.page, e.t)
    if (e.t > fin) fin = e.t
  }
  const pages: PageResumee[] = s.pages.map((p, i) => {
    const de = t.herite(p), source = de ? t.seanceDe(de) : null
    const q = premiere.get(p)
    return {
      id: p, numero: i + 1, nom: t.nomDe(p),
      minute: q === undefined ? null : Math.max(0, q - s.debut),
      ...contenuDeLaPage([...(t.formesDe(p)?.values() ?? [])]),
      reprise: source && source.id !== s.id ? deLaSeance(source, maintenant) : null,
    }
  })
  return { debut: s.debut, fin, chapitre, pages, activites: t.activitesDe(s.pages) }
}

/** Le nombre de gestes de la séance (ses étapes du film) : un texte rédigé
 *  avant un geste de plus est à refaire */
export function gestesDeLaSeance(t: Tableau, id: string): number {
  const s = t.seancesDuClasseur().find(x => x.id === id)
  if (!s) return 0
  const ici = new Set(s.pages)
  let n = 0
  for (const e of t.film.toArray()) if (e.t >= s.depuis && ici.has(e.page) && !e.seulOrdre && !e.naissance && !e.reglage) n++
  return n
}
