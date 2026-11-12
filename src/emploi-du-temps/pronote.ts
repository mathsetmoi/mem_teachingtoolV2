// =============================================================
// LE LIEN SYNCHRONISÉ DE PRONOTE
// Pronote donne à chaque professeur un lien personnel vers son emploi du
// temps (format iCal), toujours à jour. Le professeur le colle une fois par
// établissement ; la version en ligne le relit au lancement (au plus toutes
// les 30 minutes) : un cours déplacé, une salle changée, un cours annulé, des
// vacances se voient dans « Bonjour ! » sans rien faire.
//
// Le navigateur ne peut pas lire ce lien lui-même (Pronote ne répond pas aux
// autres sites) : il le demande à un relais du professeur (version 5, voir
// relais/relais-seances.gs), qui le lit et le rend sans le garder.
//
// Le lien est PERSONNEL : il reste dans ce navigateur (localStorage, une clé
// nouvelle), jamais dans la bibliothèque ni dans un .memb. On garde aussi les
// cours des trois semaines qui viennent, pour ne pas relire à chaque
// ouverture d'un classeur. La version hors ligne (sans internet) n'a pas de
// relais : elle s'en tient à la semaine type.
// =============================================================
import { RELAIS_REPLAY } from '../publication/comptes'
import { lireCalendrier, type Cours } from './ics'

const CLE = 'mem-teachingtool-pronote'
/** On relit le lien au plus toutes les 30 minutes */
const RELIRE = 30 * 60_000
/** Ce qu'on garde des cours : de lundi dernier à trois semaines */
const GARDE = 21 * 86_400_000

export interface LuDuLien { t: number; couvre: { de: number; a: number }; cours: Cours[] }
interface Garde { liens: Record<string, string>; lus: Record<string, LuDuLien> }

function lire(): Garde {
  try {
    const o = JSON.parse(localStorage.getItem(CLE) ?? 'null')
    if (o && typeof o === 'object') return { liens: o.liens && typeof o.liens === 'object' ? o.liens : {}, lus: o.lus && typeof o.lus === 'object' ? o.lus : {} }
  } catch { /* rien de gardé */ }
  return { liens: {}, lus: {} }
}
function ecrire(g: Garde) {
  try { localStorage.setItem(CLE, JSON.stringify(g)) } catch { /* on relira le lien */ }
}

/** Les liens gardés, par établissement */
export const liensPronote = (): Record<string, string> => ({ ...lire().liens })

/** Le lien de Pronote a-t-il la bonne forme ? (le relais le vérifie aussi) */
export function lienPronoteValable(u: string): boolean {
  try {
    const x = new URL(u.trim())
    return x.protocol === 'https:' && /(^|\.)index-education\.net$/i.test(x.hostname) && x.pathname.includes('/ical/') && !x.username
  } catch { return false }
}

/** Garde (ou retire, lien vide) le lien d'un établissement */
export function garderLien(etablissement: string, lien: string) {
  const g = lire()
  if (lien) g.liens[etablissement] = lien.trim()
  else { delete g.liens[etablissement]; delete g.lus[etablissement] }
  ecrire(g)
}

/** La version en ligne (le relais n'est pas joignable depuis un fichier ouvert en file://) */
export const enLigne = () => typeof location !== 'undefined' && location.protocol.startsWith('http')

export class ErreurPronote extends Error {}

/** Le texte du calendrier, demandé aux relais l'un après l'autre (le premier
 *  qui sait lire Pronote) */
export async function lireLeLien(lien: string): Promise<string> {
  if (!enLigne()) throw new ErreurPronote('La version hors ligne ne peut pas lire le lien de Pronote : utilisez la version en ligne, ou un fichier .ics.')
  let derniere = 'Aucun de vos relais ne sait encore lire Pronote : mettez-en un à jour (version 5 de relais/relais-seances.gs, puis relancer « verifierLInstallation »).'
  for (const r of RELAIS_REPLAY) {
    if (!r.relais) continue
    try {
      const u = new URL(r.relais)
      u.searchParams.set('pronote', lien.trim())
      const rep = await fetch(u.toString(), { redirect: 'follow' })
      if (!rep.ok) continue
      const o = await rep.json().catch(() => null) as { ics?: string; erreur?: string } | null
      if (o && typeof o.ics === 'string') return o.ics
      // Un relais d'avant la version 5 ne connaît pas « pronote » : il parle d'un lien incomplet
      if (o?.erreur && !/incomplet/i.test(o.erreur)) derniere = o.erreur
    } catch { /* le suivant */ }
  }
  throw new ErreurPronote(derniere)
}

/** Garde ce qu'on vient de lire pour un établissement (les trois semaines qui viennent) */
export function garderLu(etablissement: string, cours: readonly Cours[], t = Date.now()) {
  const g = lire()
  const de = t - 7 * 86_400_000, a = t + GARDE
  const gardes = cours.filter(c => c.fin > de && c.debut < a)
  g.lus[etablissement] = { t, couvre: { de, a: Math.min(a, Math.max(t, ...cours.map(c => c.fin))) }, cours: gardes }
  ecrire(g)
}

/** Ce qu'on sait des liens, sans rien relire */
export function lusDesLiens(): Record<string, LuDuLien> {
  const g = lire()
  const r: Record<string, LuDuLien> = {}
  for (const [e, l] of Object.entries(g.lus)) if (g.liens[e] && l && Array.isArray(l.cours) && l.couvre) r[e] = l
  return r
}

/** Relit les liens qui n'ont pas été lus depuis 30 minutes (version en ligne
 *  seulement ; une erreur laisse ce qu'on avait) ; vrai : quelque chose a changé */
export async function relireLesLiens(t = Date.now()): Promise<boolean> {
  if (!enLigne()) return false
  const g = lire()
  let change = false
  await Promise.all(Object.entries(g.liens).map(async ([e, lien]) => {
    if (g.lus[e] && t - g.lus[e].t < RELIRE) return
    try {
      const cours = lireCalendrier(await lireLeLien(lien))
      if (cours.length) { garderLu(e, cours, t); change = true }
    } catch { /* on garde ce qu'on avait */ }
  }))
  return change
}
