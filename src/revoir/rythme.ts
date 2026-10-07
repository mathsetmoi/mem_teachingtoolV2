// =============================================================
// LE RYTHME D'UNE REVUE
// Revoir un tableau, c'est retrouver le temps qu'il a pris, mais pas
// tout ce temps : une explication orale de cinq minutes ne doit pas
// laisser l'écran immobile cinq minutes. La règle tient en trois mots.
// - Tant que l'intervalle entre deux gestes est court, on le garde tel
//   qu'il a été vécu : une rafale reste une rafale.
// - Au-delà d'un coude, chaque doublement du silence n'ajoute plus
//   qu'une quantité fixe : la courbe s'aplatit doucement, sans marche,
//   et l'ordre des durées est conservé (un long silence reste plus long
//   qu'un court).
// - Rien n'est jamais inventé : un intervalle inconnu, négatif (deux
//   horloges qui ne s'accordent pas) ou minuscule vaut le plancher, pas
//   une durée choisie au hasard.
// Les allures multiplient ce temps, du plus posé au plus vif.
// =============================================================

/** Le plus court intervalle montré, en ms : deux gestes restent deux images */
export const PLANCHER = 50
/** Jusqu'ici (ms), le temps réel est gardé tel quel */
export const COUDE = 1200
/** Le plus long intervalle montré, en ms */
export const PLAFOND = 3500
/** Ce que rapporte chaque doublement du silence, au-delà du coude (ms) */
const PENTE = 800

/** L'intervalle montré pour un intervalle vécu de `dt` ms */
export function tasser(dt: number): number {
  if (!(dt > PLANCHER)) return PLANCHER          // inconnu, négatif ou trop bref
  if (dt <= COUDE) return dt
  return Math.min(PLAFOND, COUDE + PENTE * Math.log2(dt / COUDE))
}

/** Une allure de lecture : son nom, et combien de fois plus vite que le rythme tassé */
export interface Allure { nom: string; facteur: number }

export const ALLURES: readonly Allure[] = [
  { nom: 'Lent', facteur: 0.5 },
  { nom: 'Normal', facteur: 1 },
  { nom: 'Rapide', facteur: 3 },
  { nom: 'Très rapide', facteur: 10 },
]
