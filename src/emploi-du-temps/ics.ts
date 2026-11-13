// =============================================================
// L'EMPLOI DU TEMPS DE PRONOTE : LIRE UN FICHIER .ics
// Pronote donne l'emploi du temps au format iCal, une fois par
// établissement : un fichier .ics téléchargé, ou un lien synchronisé (relu
// à chaque lancement, voir pronote.ts). Ce fichier lit le texte, puis :
// - range les cours en CRÉNEAUX de la semaine type (le même cours, le même
//   jour, à la même heure, plusieurs semaines : un créneau ; présent une
//   semaine sur deux : semaine A ou B ; vu une seule fois : une exception,
//   laissée de côté) ;
// - donne, pour un jour précis, les cours tels que le lien les dit (un cours
//   déplacé, une salle changée ; un cours annulé n'y est pas).
// Pur (ni écran ni réseau) : il se teste sous Node.
// =============================================================
import { idCreneau, lundiDe, trier, type Creneau, type EmploiDuTemps } from './donnees'

/** Un cours lu dans le fichier */
export interface Cours {
  /** Ce que Pronote en dit (« MATHEMATIQUES - 2NDE3 ») : la clé de la correspondance */
  cours: string
  debut: number
  fin: number
  salle: string
  annule: boolean
}

/** Les lignes repliées du format (une ligne qui commence par une espace continue la précédente) */
function lignes(t: string): string[] {
  const l: string[] = []
  for (const x of t.replace(/\r\n?/g, '\n').split('\n')) {
    if ((x.startsWith(' ') || x.startsWith('\t')) && l.length) l[l.length - 1] += x.slice(1)
    else if (x) l.push(x)
  }
  return l
}

/** Les échappements du format : « \, » « \; » « \n » */
const valeur = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim()

/** Le décalage (en minutes) d'un fuseau à un instant : Europe/Paris en hiver, 60 */
function decalage(fuseau: string, t: number): number {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: fuseau, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    const p = Object.fromEntries(f.formatToParts(new Date(t)).map(x => [x.type, x.value]))
    const vu = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second)
    return Math.round((vu - t) / 60_000)
  } catch { return 0 }
}

/** Une date du format : « 20261109T090500Z » (UTC), avec un fuseau
 *  (TZID=Europe/Paris), ou sans rien (l'heure de l'ordinateur) ; NaN : illisible */
export function lireDate(v: string, fuseau?: string): number {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v.trim())
  if (!m) return NaN
  const [a, mo, j, h = '0', mi = '0', s = '0'] = m.slice(1)
  if (m[7]) return Date.UTC(+a, +mo - 1, +j, +h, +mi, +s)
  if (fuseau) {
    const naif = Date.UTC(+a, +mo - 1, +j, +h, +mi, +s)
    // Deux passes : le décalage à l'instant visé (les changements d'heure)
    let t = naif - decalage(fuseau, naif) * 60_000
    t = naif - decalage(fuseau, t) * 60_000
    return t
  }
  return new Date(+a, +mo - 1, +j, +h, +mi, +s).getTime()
}

const ANNULE = /\bannul|prof\.?\s*absent|\babsence\b/i

/** Les cours d'un texte iCal ; [] : ce n'est pas un calendrier */
export function lireCalendrier(t: string): Cours[] {
  const l = lignes(t)
  if (!l.some(x => /^BEGIN:VCALENDAR/i.test(x))) return []
  const cours: Cours[] = []
  let ev: Record<string, { v: string; tz?: string }> | null = null
  for (const x of l) {
    if (/^BEGIN:VEVENT/i.test(x)) { ev = {}; continue }
    if (/^END:VEVENT/i.test(x)) {
      if (ev) {
        const debut = ev.DTSTART ? lireDate(ev.DTSTART.v, ev.DTSTART.tz) : NaN
        const fin = ev.DTEND ? lireDate(ev.DTEND.v, ev.DTEND.tz) : NaN
        const resume = valeur(ev.SUMMARY?.v ?? '')
        const description = valeur(ev.DESCRIPTION?.v ?? '')
        if (Number.isFinite(debut) && Number.isFinite(fin) && fin > debut && resume) {
          const annule = /CANCELLED/i.test(ev.STATUS?.v ?? '') || ANNULE.test(resume) || ANNULE.test(description)
          cours.push({ cours: nettoyer(resume), debut, fin, salle: valeur(ev.LOCATION?.v ?? '').slice(0, 30), annule })
        }
      }
      ev = null; continue
    }
    if (!ev) continue
    const k = x.indexOf(':')
    if (k < 0) continue
    const [nom, ...params] = x.slice(0, k).split(';')
    const tz = params.find(p => /^TZID=/i.test(p))?.slice(5).replace(/^"|"$/g, '')
    ev[nom.toUpperCase()] = { v: x.slice(k + 1), tz }
  }
  return cours.sort((a, b) => a.debut - b.debut)
}

/** Le nom du cours sans ce qui dit une exception (« Cours annulé », « [Modifié] ») */
export function nettoyer(r: string): string {
  return r.replace(/\s*[[(]?\s*(cours\s+)?(annul[ée]e?s?|modifi[ée]e?|d[ée]plac[ée]e?|prof\.?\s*absent|absence)\s*[\])]?\s*/gi, ' ')
    .replace(/\s*[-–]\s*$/, '').replace(/^\s*[-–]\s*/, '').replace(/\s{2,}/g, ' ').trim().slice(0, 200)
}

const minuteDe = (t: number) => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes() }
const jourDe = (t: number) => ((new Date(t).getDay() + 6) % 7) + 1
const JOUR_MS = 86_400_000

/** Une ligne de la fenêtre « Vérifier les créneaux » : un créneau trouvé et
 *  le cours de Pronote d'où il vient */
export interface CreneauLu { jour: number; debut: number; fin: number; semaines: 'AB' | 'A' | 'B'; cours: string; salle: string; fois: number }

/** Les cours rangés en créneaux de la semaine type. depuis : on regarde les
 *  dix semaines à partir de ce lundi (sinon tout le fichier). Un cours vu
 *  une seule fois quand le fichier couvre au moins trois semaines est une
 *  exception : laissé de côté. Les semaines A et B se comptent à partir de
 *  lundiA (sinon : la semaine de « depuis » est A). */
export function enCreneaux(cours: readonly Cours[], o: { lundiA?: number; depuis: number }): CreneauLu[] {
  const debutFenetre = lundiDe(o.depuis), finFenetre = debutFenetre + 10 * 7 * JOUR_MS
  let l = cours.filter(c => !c.annule && c.debut >= debutFenetre && c.debut < finFenetre)
  if (!l.length) l = cours.filter(c => !c.annule)
  const ref = o.lundiA ?? debutFenetre
  const groupes = new Map<string, { jour: number; debut: number; fin: number; cours: string; semaines: Set<number>; parites: Set<number>; salles: Map<string, number> }>()
  const semainesVues = new Set<number>()
  for (const c of l) {
    const jour = jourDe(c.debut)
    if (jour > 6) continue
    const debut = minuteDe(c.debut), fin = Math.max(debut + 1, Math.min(24 * 60, debut + Math.round((c.fin - c.debut) / 60_000)))
    const semaine = Math.round((lundiDe(c.debut) - ref) / (7 * JOUR_MS))
    semainesVues.add(semaine)
    const k = `${jour}|${debut}|${fin}|${c.cours}`
    let g = groupes.get(k)
    if (!g) { g = { jour, debut, fin, cours: c.cours, semaines: new Set(), parites: new Set(), salles: new Map() }; groupes.set(k, g) }
    g.semaines.add(semaine)
    g.parites.add(((semaine % 2) + 2) % 2)
    if (c.salle) g.salles.set(c.salle, (g.salles.get(c.salle) ?? 0) + 1)
  }
  const assez = semainesVues.size >= 3
  // Les semaines de chaque parité où il y a cours (les vacances n'en ont pas)
  const parSemaine = [0, 1].map(p => [...semainesVues].filter(s => ((s % 2) + 2) % 2 === p).length)
  const r: CreneauLu[] = []
  for (const g of groupes.values()) {
    if (assez && g.semaines.size < 2) continue
    // Présent les deux parités ; ou d'une seule, alors que l'autre a eu cours
    const semaines = g.parites.size === 2 || (parSemaine[0] === 0 || parSemaine[1] === 0) ? 'AB' : g.parites.has(0) ? 'A' : 'B'
    const salle = [...g.salles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    r.push({ jour: g.jour, debut: g.debut, fin: g.fin, semaines, cours: g.cours, salle, fois: g.semaines.size })
  }
  return r.sort((a, b) => a.jour - b.jour || a.debut - b.debut || a.cours.localeCompare(b.cours))
}

/** Pour comparer des noms de classe : sans accents, sans espaces, en minuscules */
export const cleDeClasse = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Le dossier dont le nom se lit dans le cours (« MATHS - 2NDE3 » : « 2nde 3 »),
 *  le plus long d'abord ; null : aucun */
export function devinerDossier<D extends { id: string; nom: string }>(cours: string, dossiers: readonly D[]): D | null {
  const k = cleDeClasse(cours)
  const l = dossiers.filter(d => { const n = cleDeClasse(d.nom); return n.length >= 2 && k.includes(n) })
    .sort((a, b) => cleDeClasse(b.nom).length - cleDeClasse(a.nom).length)
  return l[0] ?? null
}

/** Les créneaux trouvés, mis dans l'emploi du temps : ceux de cet
 *  établissement qui venaient de Pronote sont remplacés (un créneau saisi
 *  à la main reste) ; ceux qu'on garde gardent leur classeur choisi.
 *  choix : le dossier de chaque cours (null : ne pas importer). */
export function importer(e: EmploiDuTemps, lus: readonly CreneauLu[], choix: Readonly<Record<string, string | null>>, dansLEtablissement: (c: Creneau) => boolean, etablissement?: string): EmploiDuTemps {
  const anciens = e.creneaux.filter(c => c.pronote && dansLEtablissement(c))
  const gardes = e.creneaux.filter(c => !(c.pronote && dansLEtablissement(c)))
  const neufs: Creneau[] = []
  for (const x of lus) {
    const dossier = choix[x.cours]
    if (!dossier) continue
    const avant = anciens.find(c => c.pronote === x.cours && c.jour === x.jour && c.debut === x.debut)
    const c: Creneau = { id: avant?.id ?? idCreneau(), jour: x.jour, debut: x.debut, fin: x.fin, semaines: x.semaines, dossier, nom: avant?.dossier === dossier ? avant.nom : '', pronote: x.cours }
    if (x.salle) c.salle = x.salle
    if (avant?.classeur && avant.dossier === dossier) c.classeur = avant.classeur
    if (etablissement) c.etablissement = etablissement
    neufs.push(c)
  }
  return { ...e, creneaux: trier([...gardes, ...neufs]), correspondances: { ...e.correspondances, ...choix } }
}

/** Les cours d'un jour précis, tels que le lien les dit, en créneaux ; les
 *  cours annulés et ceux qu'on n'importe pas n'y sont pas. Un créneau de la
 *  semaine type qui leur ressemble (même cours, même jour) prête son id,
 *  son nom et son classeur choisi. null : le lien ne couvre pas ce jour. */
export function coursDuJour(cours: readonly Cours[], couvre: { de: number; a: number }, t: number, e: EmploiDuTemps, etablissement?: string): Creneau[] | null {
  const d = new Date(t); d.setHours(0, 0, 0, 0)
  const debut = d.getTime(), fin = debut + JOUR_MS
  if (fin <= couvre.de || debut >= couvre.a) return null
  const jour = jourDe(t)
  const r: Creneau[] = []
  for (const c of cours) {
    if (c.debut < debut || c.debut >= fin || c.annule) continue
    const dossier = e.correspondances[c.cours]
    if (!dossier) continue
    const m = minuteDe(c.debut)
    const type = e.creneaux.find(x => x.pronote === c.cours && x.jour === jour && x.debut === m)
      ?? e.creneaux.find(x => x.pronote === c.cours && x.jour === jour)
    const n: Creneau = { id: type?.id ?? `lien-${c.debut}`, jour, debut: m, fin: Math.min(24 * 60, m + Math.round((c.fin - c.debut) / 60_000)), semaines: 'AB', dossier, nom: type?.nom ?? '', pronote: c.cours }
    if (c.salle) n.salle = c.salle
    if (type?.classeur) n.classeur = type.classeur
    if (etablissement) n.etablissement = etablissement
    r.push(n)
  }
  return r
}
