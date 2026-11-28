// =============================================================
// LES AUTOMATISMES DE 1re : SUITES NUMÉRIQUES, MODÈLES DISCRETS
// Le professeur a revu, le 28 novembre 2026, les quatre lignes OFFI des
// taux d'évolution, qu'il range dans le sous-domaine « Évolutions et
// variations » du domaine. Les quatre exercices d'avant restent (lycee.ts,
// leurs valeurs revues pour se calculer sans calculatrice) ; ici, les
// nouveaux exercices, les anciennes questions de cours devenues exercices
// (rien ne se perd) et les questions de cours en phrases à compléter.
// Ses règles : réponses courtes ; jamais une chance sur deux ; jamais la
// liste des réponses ; rien de fixe ; pas de calculatrice.
// =============================================================
import type { Automatisme, Facon, Question, QuestionCours } from './outils'
import { choix, ent, grandNb, mot, nb, notions } from './outils'
import { phraseATrou } from './seconde-nombres-reels'

const D1_SUITES = 'Suites numériques, modèles discrets'
const D = D1_SUITES
/** Les phrases de la liste officielle, dans l'ordre des lignes du domaine */
const LIGNES = [
  'Appliquer un taux d’évolution pour calculer une valeur finale ou initiale.',
  'Calculer un taux d’évolution, l’exprimer en pourcentage.',
  'Calculer le taux d’évolution équivalent à plusieurs évolutions successives.',
  'Calculer un taux d’évolution réciproque.',
]
const pct = (x: number) => `${nb(x)}\\,\\%`
/** Un taux avec son signe : +25 %, −15 % */
const taux = (t: number) => t > 0 ? `+${pct(t)}` : t < 0 ? `-${pct(-t)}` : pct(0)
/** Une évolution dite en mots : une hausse de 20 %, une baisse de 10 % */
const dire = (t: number) => t > 0 ? `une hausse de $${pct(t)}$` : `une baisse de $${pct(-t)}$`
function exo(k: number, id: string, titre: string, generer: () => Question): Automatisme {
  return { id: `1re-suites-${id}`, theme: D, titre, competence: k, programme: LIGNES[k], generer }
}

export const AUTOMATISMES_1RE_SUITES: Automatisme[] = [
  // ---------- Ligne 1 : valeur finale ou initiale ----------
  exo(0, 'coefficient', 'Le coefficient multiplicateur d’une hausse ou d’une baisse', () => {
    const t = choix([2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 20, 25, 30, 35, 40, 45, 60]), hausse = Math.random() < 0.5
    return { enonce: `${hausse ? 'Augmenter' : 'Diminuer'} de $${pct(t)}$, c'est multiplier par quel nombre ?`, reponse: nb(1 + (hausse ? t : -t) / 100) }
  }),
  exo(0, 'recurrence', 'Une évolution à taux fixe : la relation de récurrence', () => {
    const t = choix([2, 3, 4, 5, 10, 20]), hausse = Math.random() < 0.5, u = choix(['u', 'v', 'w', 'p'])
    const [quoi, v0] = choix<[string, string]>([['Un capital', `${grandNb(100 * ent(10, 50))} €`], ['Une population', `${grandNb(1000 * ent(2, 30))} habitants`], ['Un abonnement', `${ent(10, 40)} €`]])
    return { enonce: `${quoi} de ${v0} ${hausse ? 'augmente' : 'baisse'} de $${pct(t)}$ chaque année ; $${u}_n$ est sa valeur au bout de $n$ années. Compléter : $${u}_{n+1} = \\ldots \\times ${u}_n$`, reponse: nb(1 + (hausse ? t : -t) / 100) }
  }),
  exo(0, 'calcul-finale', 'Le calcul qui donne la valeur finale', () => {
    const t = choix([5, 10, 15, 20, 30]), v = choix(['V_0', 'P_0', 'y_0']), hausse = Math.random() < 0.5
    return { enonce: `Une valeur $${v}$ ${hausse ? 'augmente' : 'baisse'} de $${pct(t)}$. Quel calcul donne la valeur finale ?`, reponse: `${v} \\times ${nb(1 + (hausse ? t : -t) / 100)}` }
  }),
  exo(0, 'calcul-initiale', 'Le calcul qui redonne la valeur initiale', () => {
    const t = choix([5, 10, 15, 20, 30]), v = choix(['V_1', 'P_1', 'y_1']), hausse = Math.random() < 0.5
    return { enonce: `Après ${dire(hausse ? t : -t)}, on obtient $${v}$. Quel calcul redonne la valeur initiale ?`, reponse: `${v} \\div ${nb(1 + (hausse ? t : -t) / 100)}` }
  }),
  // ---------- Ligne 2 : calculer un taux ----------
  exo(1, 'coef-taux', 'Du coefficient multiplicateur au taux', () => {
    const t = choix([-40, -25, -15, -12, -5, 3, 8, 15, 35, 60, 120])
    return { enonce: `Le coefficient multiplicateur d'une évolution est $${nb(1 + t / 100)}$. Quel est le taux d'évolution, en pourcentage ?`, reponse: taux(t) }
  }),
  exo(1, 'multiple', 'Doubler, tripler, diviser par 2', () => {
    const [quoi, t] = choix<[string, number]>([['double', 100], ['triple', 200], ['quadruple', 300], ['est divisé par 2', -50], ['est divisé par 4', -75], ['est divisé par 5', -80]])
    const sujet = choix(['Une population', 'Le prix d\'un objet', 'Le nombre d\'abonnés'])
    return { enonce: `${sujet} ${quoi}. Quel est le taux d'évolution, en pourcentage ?`, reponse: taux(t) }
  }),
  exo(1, 'coef-moins-un', 'Le taux : coefficient moins 1', () => {
    const t = choix([-40, -25, -12, -5, 3, 8, 15, 35, 60])
    return { enonce: `Le coefficient multiplicateur est $${nb(1 + t / 100)}$. Quel calcul donne le taux d'évolution, et quel est ce taux ?`, reponse: mot(`$${nb(1 + t / 100)} - 1 = ${nb(t / 100)}$, soit $${taux(t)}$`) }
  }),
  // ---------- Ligne 3 : évolutions successives ----------
  exo(2, 'meme-taux', 'La même évolution deux fois de suite', () => {
    const [t, g] = choix<[number, number]>([[10, 21], [20, 44], [50, 125], [100, 300], [-10, -19], [-20, -36], [-50, -75]])
    return { enonce: `${choix(['Un prix', 'Une population', 'Un loyer'])} connaît ${dire(t)} deux années de suite. Quelle est l'évolution globale, en pourcentage ?`, reponse: taux(g) }
  }),
  exo(2, 'plusieurs-fois', 'Plusieurs évolutions : le coefficient global', () => {
    const [t, n, c] = choix<[number, number, string]>([[-50, 2, '0{,}25'], [-50, 3, '0{,}125'], [100, 2, '4'], [100, 3, '8'], [10, 2, '1{,}21'], [-10, 2, '0{,}81'], [20, 2, '1{,}44']])
    return { enonce: `Une valeur connaît ${dire(t)}, $${n}$ fois de suite. Quel est le coefficient multiplicateur global ?`, reponse: c }
  }),
  exo(2, 'aller-retour', 'Une hausse puis une baisse du même pourcentage', () => {
    const t = choix([10, 20, 30, 40, 50]), d = Math.random() < 0.5
    return { enonce: `${choix(['Un prix', 'Une action', 'Un tarif'])} connaît ${dire(d ? t : -t)}, puis ${dire(d ? -t : t)}. Quelle est l'évolution globale, en pourcentage ?`, reponse: taux(-t * t / 100) }
  }),
  // ---------- Ligne 4 : taux réciproque ----------
  exo(3, 'coef-reciproque', 'Le coefficient de l’évolution réciproque', () => {
    const [c, r] = choix<[string, string]>([['1{,}25', '0{,}8'], ['0{,}8', '1{,}25'], ['2', '0{,}5'], ['0{,}5', '2'], ['4', '0{,}25'], ['0{,}25', '4'], ['2{,}5', '0{,}4'], ['0{,}4', '2{,}5']])
    return { enonce: `Une évolution a pour coefficient multiplicateur $${c}$. Quel est le coefficient multiplicateur de l'évolution réciproque ?`, reponse: r }
  }),
  exo(3, 'revenir', 'Revenir à la valeur de départ', () => {
    const [quoi, r] = choix<[string, number]>([['double', -50], ['quadruple', -75], ['est multipliée par 5', -80], ['est divisée par 2', 100], ['est divisée par 4', 300], ['est divisée par 5', 400]])
    return { enonce: `Une valeur ${quoi}. Quelle évolution, en pourcentage, la ramène à sa valeur de départ ?`, reponse: taux(r) }
  }),
  exo(3, 'inverse', 'Le coefficient réciproque : l’inverse', () => {
    const c = choix(['1{,}25', '2', '0{,}5', '0{,}8', '4'])
    return { enonce: `Une évolution a pour coefficient multiplicateur $${c}$. Quel calcul donne le coefficient de l'évolution réciproque ?`, reponse: mot(`$\\frac{1}{${c}}$, l'inverse de $${c}$`) }
  }),
]

// ---------- Les questions de cours (phrases à compléter) ----------
function notion(k: number, i: number, titre: string, ...facons: Facon[]): QuestionCours {
  const [q] = notions(D, [[titre, ...facons]], '1re-')
  return { ...q, id: `cours-1re-${D}-${i}`, competence: k }
}
export const COURS_1RE_SUITES: QuestionCours[] = [
  notion(0, 100, 'Augmenter ou diminuer de t %', () => {
    const t = choix([2, 3, 5, 8, 10, 12, 15, 20, 25, 30, 40]), h = Math.random() < 0.5
    return phraseATrou(`[${h ? 'Augmenter' : 'Diminuer'}] de [$${pct(t)}$], c'est multiplier par [$${nb(1 + (h ? t : -t) / 100)}$].`)
  }, () => {
    const h = Math.random() < 0.5
    return phraseATrou(`[${h ? 'Augmenter' : 'Diminuer'}] de $t\\,\\%$, c'est multiplier par [$1 ${h ? '+' : '-'} \\frac{t}{100}$].`)
  }),
  notion(0, 101, 'Retrouver la valeur initiale', () => phraseATrou('Pour retrouver la valeur initiale, on [divise] la valeur finale par le coefficient [multiplicateur].')),
  notion(1, 102, 'Le taux d’évolution', () => { const [a, b] = choix([['V_0', 'V_1'], ['y_0', 'y_1'], ['P_0', 'P_1']]); return phraseATrou(`Le taux d'évolution de $${a}$ à $${b}$ est [$\\frac{${b} - ${a}}{${a}}$].`) }),
  notion(1, 103, 'Taux et coefficient', () => phraseATrou('Le taux d’évolution est égal au coefficient [multiplicateur] moins [$1$].')),
  notion(1, 104, 'Un taux négatif', () => phraseATrou('Un taux d’évolution [négatif] correspond à une [baisse].')),
  notion(2, 105, 'Le coefficient global', () => phraseATrou('Le coefficient multiplicateur global de plusieurs évolutions successives est le [produit] des coefficients [multiplicateurs].')),
  notion(2, 106, 'Des évolutions successives', () => { const n = ent(2, 4); return [`Comment obtient-on le coefficient multiplicateur global de $${n}$ évolutions successives ?`, `on multiplie les $${n}$ coefficients multiplicateurs`] }),
  notion(2, 107, 'Une hausse puis une baisse', () => { const t = choix([10, 20, 25, 50]); return phraseATrou(`Une hausse de $${pct(t)}$ suivie d'une baisse de $${pct(t)}$ fait [baisser] la valeur.`) }),
  notion(3, 108, 'L’évolution réciproque', () => phraseATrou('Le coefficient de l’évolution réciproque est l’[inverse] du coefficient de départ.')),
  notion(3, 109, 'Revenir au départ', () => { const [t, r] = choix<[number, number]>([[25, 20], [100, 50], [300, 75], [400, 80]]); return phraseATrou(`Après une hausse de [$${pct(t)}$], il faut une baisse de [$${pct(r)}$] pour revenir à la valeur de départ.`) }),
]
