// L'état de la sauvegarde (lot 4, C3 ; les textes du lot 18) : chaque
// ligne et son ordre (le fichier du classeur d'abord, quand il en a un), le
// texte court et ses priorités (« Enregistré il y a 7 min », jamais le mot
// « clé »), jamais « il y a » après un échec ni « Enregistré » quand la base
// a dit une erreur, ce qui protège, le rappel et le bandeau.
import { describe, expect, it } from 'vitest'
import type { EtatCle, EtatDrive, EtatSauvegarde, MemoireBandeau } from '../src/classeurs/etat'
import { COURT_MAX, TEXTE_INCOMPLET, aSonFichier, bandeauDu, dansQuoi, ilYA, ilYACourt, lieuDuFichier, ligneDrive, nomDErreur, protege, rappelDu, resumeEtat, texteEtat, texteRappel, texteRappelDepart } from '../src/classeurs/etat'

const MIN = 60_000
/** Le samedi 10 octobre 2026 à 14 h 05, à l'heure de la machine */
const T = new Date(2026, 9, 10, 14, 5).getTime()
const sp = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')

function etat(o: Partial<EtatSauvegarde> = {}): EtatSauvegarde {
  return { navigateur: 'ok', modifie: null, fichier: null, nonEnregistreDepuis: null, cle: { etat: 'absente' }, drive: { etat: 'absente' }, ...o }
}
const lignes = (e: EtatSauvegarde, rappel = false) => texteEtat(e, T, { rappel }).lignes.map(l => sp(l.texte))
const court = (e: EtatSauvegarde) => sp(texteEtat(e, T).court)
const ligneCle = (e: EtatSauvegarde) => texteEtat(e, T).lignes.find(l => l.quoi === 'cle')
const ligneNav = (e: EtatSauvegarde) => texteEtat(e, T).lignes.find(l => l.quoi === 'navigateur')!

const CLES: EtatCle[] = ['absente', 'impossible', 'ok', 'en-cours', 'permission', 'erreur', 'autre-onglet', 'conflit']
const DRIVES: EtatDrive[] = ['absente', 'impossible', 'ok', 'en-cours', 'connexion', 'hors-ligne', 'erreur', 'conflit']
/** Le fichier rangé par l'outil : le dossier choisi, le niveau, le classeur */
const CHEMIN = ['LFB classeurs', '2', 'Fractions']

describe('les dates', () => {
  it('à l\'instant, il y a 7 min, puis l\'heure', () => {
    expect(ilYA(T - 30_000, T)).toBe('à l\'instant')
    expect(sp(ilYA(T - 7 * MIN - 5000, T))).toBe('il y a 7 min')
    expect(sp(ilYA(T - 59 * MIN, T))).toBe('il y a 59 min')
    expect(sp(ilYA(T - 60 * MIN, T))).toBe('aujourd\'hui à 13 h 05')
    expect(sp(ilYA(T - 24 * 60 * MIN, T))).toBe('hier à 14 h 05')
    expect(sp(ilYACourt(T - 2 * 60 * MIN, T))).toBe('à 12 h 05')
    expect(sp(ilYACourt(T - 24 * 60 * MIN, T))).toBe('hier à 14 h 05')
    expect(sp(ilYACourt(new Date(2026, 8, 30, 9, 0).getTime(), T))).toBe('le 30 septembre')
    expect(sp(ilYACourt(new Date(2026, 9, 1, 9, 0).getTime(), T))).toBe('le 1er octobre')
    expect(sp(ilYACourt(new Date(2025, 8, 30, 9, 0).getTime(), T))).toBe('le 30/09/2025')
  })
})

describe('où est le fichier (lot 18 : jamais « la clé » à l\'écran)', () => {
  it('lieuDuFichier : le chemin et le nom, ou le nom seul, ou « un fichier »', () => {
    expect(lieuDuFichier({ nom: 'Fractions.memc', chemin: CHEMIN })).toBe('LFB classeurs › 2 › Fractions (Fractions.memc)')
    expect(lieuDuFichier({ nom: 'Fractions.memc' })).toBe('« Fractions.memc »')
    expect(lieuDuFichier({ nom: 'Fractions.memc', chemin: [] })).toBe('« Fractions.memc »')
    expect(lieuDuFichier({})).toBe('un fichier')
  })
  it('dansQuoi : le dossier choisi, sinon le nom du fichier, sinon « le fichier »', () => {
    expect(dansQuoi({ nom: 'Fractions.memc', chemin: CHEMIN })).toBe('« LFB classeurs »')
    expect(dansQuoi({ nom: 'Fractions.memc' })).toBe('« Fractions.memc »')
    expect(dansQuoi({})).toBe('le fichier')
  })
  it('aSonFichier : tout sauf à activer ou impossible', () => {
    for (const c of CLES) expect(aSonFichier({ etat: c })).toBe(c !== 'absente' && c !== 'impossible')
  })
})

describe('les lignes', () => {
  it('le classeur a son fichier : sa ligne d\'abord, puis le navigateur ; rien d\'autre quand il protège', () => {
    const t = texteEtat(etat({ cle: { etat: 'ok', t: T - 2 * MIN, nom: 'Symétrie.memc' }, drive: { etat: 'ok', t: T - 10 * MIN, compte: 'mem', courriel: 'prof@example.com' }, fichier: T }), T)
    expect(t.lignes.map(l => l.quoi)).toEqual(['cle', 'navigateur'])
    expect(t.lignes.map(l => sp(l.texte))).toEqual(['Enregistré dans « Symétrie.memc » : il y a 2 min', 'Enregistré dans ce navigateur'])
    expect(t.lignes.every(l => l.niveau === 'ok')).toBe(true)
    expect(t.niveau).toBe('ok')
  })

  it('avec le chemin que la fiche connaît : « Enregistré dans LFB classeurs › 2 › Fractions (Fractions.memc) : il y a 2 min »', () => {
    const e = etat({ cle: { etat: 'ok', t: T - 2 * MIN, nom: 'Fractions.memc', chemin: CHEMIN } })
    expect(lignes(e)).toEqual(['Enregistré dans LFB classeurs › 2 › Fractions (Fractions.memc) : il y a 2 min', 'Enregistré dans ce navigateur'])
    expect(sp(ligneCle(etat({ cle: { etat: 'permission', nom: 'Fractions.memc', chemin: CHEMIN } }))!.texte)).toBe('Fichier LFB classeurs › 2 › Fractions (Fractions.memc) : en pause, le navigateur attend votre accord')
    expect(sp(ligneCle(etat({ cle: { etat: 'ok', nom: 'Fractions.memc', chemin: CHEMIN, pasEncoreEcrit: true } }))!.texte)).toBe('Fichier LFB classeurs › 2 › Fractions (Fractions.memc) : pas encore écrit (la première écriture part bientôt)')
  })

  it('sans fichier (à activer) : le navigateur, le Drive, le fichier à la main ; aucune ligne pour l\'activer', () => {
    const t = texteEtat(etat(), T)
    expect(t.lignes.map(l => l.quoi)).toEqual(['navigateur', 'drive', 'fichier'])
    expect(t.lignes.map(l => l.texte)).toEqual(['Seulement dans ce navigateur', 'Pas de copie sur le Drive', 'Jamais enregistré dans un fichier'])
    expect(t.lignes.every(l => l.action === undefined)).toBe(true)
    expect(t.niveau).toBe('info')
    // Impossible ici (Firefox, Safari) : sa ligne vient après le navigateur
    expect(texteEtat(etat({ cle: { etat: 'impossible' } }), T).lignes.map(l => l.quoi)).toEqual(['navigateur', 'cle', 'drive', 'fichier'])
  })

  it('le navigateur en erreur : attention, et Ctrl + S ; après la ligne du fichier quand le classeur en a un', () => {
    const t = texteEtat(etat({ navigateur: 'erreur', erreurBase: 'place' }), T)
    expect(t.lignes[0]).toEqual({ quoi: 'navigateur', niveau: 'attention', action: 'enregistrer', texte: 'Ce navigateur n\'enregistre plus ce classeur (plus de place ?) : enregistrez-le dans un fichier (Ctrl + S).' })
    expect(t.niveau).toBe('attention')
    expect(t.action).toBe('enregistrer')
    expect(texteEtat(etat({ navigateur: 'erreur', erreurBase: 'indisponible' }), T).lignes[0].texte).toMatch(/^Ce navigateur n'enregistre pas ce classeur \(son stockage/)
    const avec = texteEtat(etat({ navigateur: 'erreur', erreurBase: 'place', cle: { etat: 'ok', t: T - MIN, nom: 'S.memc' } }), T)
    expect(avec.lignes.map(l => l.quoi)).toEqual(['cle', 'navigateur'])
    expect(avec.lignes[1].niveau).toBe('attention')
    expect(avec.niveau).toBe('attention')
  })

  it('chaque état du fichier du classeur', () => {
    const cle = (c: EtatSauvegarde['cle'], nav: 'ok' | 'erreur' = 'ok') => texteEtat(etat({ cle: { nom: 'Symétrie.memc', ...c }, navigateur: nav }), T).lignes.filter(l => l.quoi === 'cle')
    expect(cle({ etat: 'en-cours' })).toEqual([{ quoi: 'cle', niveau: 'ok', texte: 'Fichier « Symétrie.memc » : enregistrement…' }])
    expect(cle({ etat: 'permission' })).toEqual([{ quoi: 'cle', niveau: 'attention', action: 'reprendre-cle', texte: 'Fichier « Symétrie.memc » : en pause, le navigateur attend votre accord' }])
    expect(cle({ etat: 'erreur', message: 'le disque est plein.', t: T - MIN })).toEqual([
      { quoi: 'cle', niveau: 'attention', texte: 'Fichier « Symétrie.memc » : le disque est plein' },
      { quoi: 'cle', niveau: 'info', texte: 'Rien n\'est perdu : le classeur est dans ce navigateur ; l\'enregistrement reprendra dès que possible.' },
    ])
    // « Rien n'est perdu » n'est vrai que si le navigateur garde tout
    expect(cle({ etat: 'erreur', message: 'plus de place' }, 'erreur').map(l => l.texte)).toEqual(['Fichier « Symétrie.memc » : plus de place'])
    expect(cle({ etat: 'autre-onglet' })).toEqual([{ quoi: 'cle', niveau: 'info', texte: 'Fichier « Symétrie.memc » : c\'est l\'autre onglet ouvert sur ce classeur qui l\'enregistre' }])
    expect(cle({ etat: 'conflit', message: 'Le fichier « Symétrie.memc » a été modifié ailleurs.' })).toEqual([{ quoi: 'cle', niveau: 'attention', texte: 'Le fichier « Symétrie.memc » a été modifié ailleurs.' }])
    expect(cle({ etat: 'conflit' })[0].texte).toBe('Fichier « Symétrie.memc » : il a changé ailleurs, il n\'est pas remplacé')
    expect(cle({ etat: 'absente' })).toEqual([])
    expect(cle({ etat: 'impossible' })).toEqual([{ quoi: 'cle', niveau: 'info', texte: 'Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (Ctrl + S) de temps en temps.' }])
    expect(sp(cle({ etat: 'ok', t: T - 3 * 60 * MIN })[0].texte)).toBe('Enregistré dans « Symétrie.memc » : aujourd\'hui à 11 h 05')
    // Sans nom (on ne sait rien du fichier) : pas de « undefined »
    expect(ligneCle(etat({ cle: { etat: 'en-cours' } }))!.texte).toBe('Fichier : enregistrement…')
    expect(sp(ligneCle(etat({ cle: { etat: 'ok', t: T - 2 * MIN } }))!.texte)).toBe('Enregistré dans un fichier : il y a 2 min')
  })

  it('chaque état du Drive (le classeur sans fichier : la ligne est là)', () => {
    const drive = (d: EtatSauvegarde['drive'], c: EtatSauvegarde['cle'] = { etat: 'absente' }) => texteEtat(etat({ drive: d, cle: c }), T).lignes.filter(l => l.quoi === 'drive')
    expect(sp(drive({ etat: 'ok', t: T - 10 * MIN, compte: 'lfb' })[0].texte)).toBe('Sur le Drive du lycée : il y a 10 min')
    // En attente de la connexion : une information s'il n'y a rien à copier ; sinon attention
    expect(drive({ etat: 'connexion', enAttente: true })).toEqual([{ quoi: 'drive', niveau: 'attention', action: 'connecter-drive', texte: 'Sur le Drive : en attente de la connexion Google' }])
    expect(drive({ etat: 'connexion', enAttente: false })[0].niveau).toBe('info')
    expect(drive({ etat: 'hors-ligne' })[0].texte).toBe('Sur le Drive : hors connexion, la copie partira au retour du réseau')
    expect(drive({ etat: 'impossible' })[0].texte).toBe('Sur le Drive : seulement depuis la version en ligne (la connexion Google ne marche pas dans la version hors ligne)')
    expect(drive({ etat: 'absente' })[0].texte).toBe('Pas de copie sur le Drive')
    expect(drive({ etat: 'erreur', message: 'le Drive est plein.', enAttente: true })[0]).toEqual({ quoi: 'drive', niveau: 'attention', texte: 'Sur le Drive : le Drive est plein' })
    expect(drive({ etat: 'conflit', message: 'La sauvegarde du Drive a changé ailleurs.' })[0].texte).toBe('La sauvegarde du Drive a changé ailleurs.')
  })

  it('la ligne du Drive : cachée quand le fichier protège le classeur, sauf si elle demande un clic', () => {
    const drive = (d: EtatSauvegarde['drive'], c: EtatSauvegarde['cle']) => texteEtat(etat({ drive: d, cle: c }), T).lignes.find(l => l.quoi === 'drive')
    const protege: EtatSauvegarde['cle'] = { etat: 'ok', t: T - MIN, nom: 'S.memc' }
    expect(drive({ etat: 'ok', t: T - 10 * MIN }, protege)).toBeUndefined()
    // (la connexion qui manque n'est qu'une information quand le fichier protège : cachée aussi)
    expect(drive({ etat: 'connexion', enAttente: true }, protege)).toBeUndefined()
    expect(drive({ etat: 'erreur', enAttente: true, message: 'plein' }, protege)).toBeUndefined()
    expect(drive({ etat: 'absente' }, protege)).toBeUndefined()
    expect(drive({ etat: 'ok', t: T }, { etat: 'autre-onglet', nom: 'S.memc' })).toBeUndefined()
    // Un conflit du Drive demande un clic : montré, même avec le fichier à jour
    expect(drive({ etat: 'conflit', message: 'La copie du Drive a changé ailleurs.', actions: ['recuperer-drive'] }, protege)).toMatchObject({ niveau: 'attention', action: 'recuperer-drive' })
    // Le fichier ne protège pas (pas encore écrit, en pause, en échec, à activer, impossible) : la ligne est là
    for (const c of [{ etat: 'ok', pasEncoreEcrit: true } as const, { etat: 'permission' } as const, { etat: 'erreur' } as const, { etat: 'conflit' } as const, { etat: 'absente' } as const, { etat: 'impossible' } as const]) {
      expect(drive({ etat: 'ok', t: T - 10 * MIN }, { nom: 'S.memc', ...c })?.texte, c.etat).toMatch(/^Sur le Drive/)
    }
  })

  it('la ligne du fichier à la main : seulement quand le fichier du classeur ne le protège pas ; le rappel la met en attention', () => {
    expect(lignes(etat()).at(-1)).toBe('Jamais enregistré dans un fichier')
    expect(lignes(etat({ fichier: T - 24 * 60 * MIN })).at(-1)).toBe('Dernier enregistrement dans un fichier : hier à 14 h 05')
    expect(texteEtat(etat({ fichier: T, cle: { etat: 'ok', t: T, nom: 'S.memc' } }), T).lignes.some(l => l.quoi === 'fichier')).toBe(false)
    expect(texteEtat(etat({ fichier: T, cle: { etat: 'autre-onglet', nom: 'S.memc' } }), T).lignes.some(l => l.quoi === 'fichier')).toBe(false)
    expect(lignes(etat({ fichier: T, cle: { etat: 'permission', nom: 'S.memc' } })).at(-1)).toMatch(/^Dernier enregistrement dans un fichier/)
    expect(lignes(etat({ fichier: T, cle: { etat: 'ok', nom: 'S.memc', pasEncoreEcrit: true } })).at(-1)).toMatch(/^Dernier enregistrement dans un fichier/)
    const t = texteEtat(etat(), T, { rappel: true })
    expect(t.lignes.at(-1)).toMatchObject({ niveau: 'attention', action: 'enregistrer' })
    expect(t.niveau).toBe('attention')
    expect(t.action).toBe('enregistrer')
  })

  it('la ligne du navigateur : « Enregistré dans ce navigateur » seulement quand quelque chose d\'autre protège, sinon « Seulement dans ce navigateur »', () => {
    expect(ligneNav(etat())).toEqual({ quoi: 'navigateur', niveau: 'ok', texte: 'Seulement dans ce navigateur' })
    expect(texteEtat(etat(), T).niveau).toBe('info')
    expect(ligneNav(etat({ cle: { etat: 'ok', t: T - MIN, nom: 'S.memc' } })).texte).toBe('Enregistré dans ce navigateur')
    expect(ligneNav(etat({ cle: { etat: 'autre-onglet', nom: 'S.memc' } })).texte).toBe('Enregistré dans ce navigateur')
    expect(ligneNav(etat({ drive: { etat: 'ok', t: T - 10 * MIN } })).texte).toBe('Enregistré dans ce navigateur')
    // Une copie du Drive trop vieille, un fichier en pause, un fichier à la main : rien ne protège
    expect(ligneNav(etat({ drive: { etat: 'ok', t: T - 20 * MIN } })).texte).toBe('Seulement dans ce navigateur')
    expect(ligneNav(etat({ cle: { etat: 'permission', nom: 'S.memc' } })).texte).toBe('Seulement dans ce navigateur')
    expect(ligneNav(etat({ cle: { etat: 'ok', nom: 'S.memc', pasEncoreEcrit: true } })).texte).toBe('Seulement dans ce navigateur')
    expect(ligneNav(etat({ fichier: T })).texte).toBe('Seulement dans ce navigateur')
  })
})

describe('le texte court', () => {
  it('le premier qui s\'applique, dans l\'ordre', () => {
    const fichier = T - 25 * MIN
    expect(court(etat({ navigateur: 'erreur', cle: { etat: 'permission' } }))).toBe('Pas enregistré !')
    expect(court(etat({ navigateur: 'incomplet', cle: { etat: 'permission' } }))).toBe('Une partie ne se relit pas')
    expect(court(etat({ cle: { etat: 'permission' }, drive: { etat: 'ok', t: T } }))).toBe('En pause : un clic')
    expect(court(etat({ cle: { etat: 'conflit', t: T - MIN }, drive: { etat: 'ok', t: T } }))).toBe('Fichier changé ailleurs')
    expect(court(etat({ cle: { etat: 'erreur', t: T - MIN }, drive: { etat: 'ok', t: T } }))).toBe('Pas à jour, rien de perdu')
    expect(court(etat({ drive: { etat: 'connexion', enAttente: true }, fichier }))).toBe('Drive en attente')
    expect(court(etat({ drive: { etat: 'erreur', enAttente: true, t: T - MIN } }))).toBe('Drive en attente')
    expect(court(etat({ drive: { etat: 'conflit', enAttente: true } }))).toBe('Drive en attente')
    // le fichier protège : le Drive en attente ne se dit pas en premier
    expect(court(etat({ cle: { etat: 'ok', t: T - 2 * MIN }, drive: { etat: 'connexion', enAttente: true } }))).toBe('Enregistré il y a 2 min')
    // rien à copier : pas « en attente »
    expect(court(etat({ drive: { etat: 'connexion', enAttente: false }, fichier }))).toBe('Fichier : il y a 25 min')
    expect(court(etat({ cle: { etat: 'ok', t: T - 2 * MIN }, drive: { etat: 'ok', t: T - MIN } }))).toBe('Enregistré il y a 2 min')
    expect(court(etat({ cle: { etat: 'ok', t: T - MIN, pasEncoreEcrit: true } }))).toBe('Enregistrement bientôt')
    expect(court(etat({ cle: { etat: 'ok', t: T - MIN, depuis: T - 5000 } }))).toBe('Enregistrement bientôt')
    expect(court(etat({ cle: { etat: 'ok' } }))).toBe('Enregistré, à jour')
    expect(court(etat({ cle: { etat: 'en-cours' } }))).toBe('Enregistrement…')
    expect(court(etat({ cle: { etat: 'autre-onglet' } }))).toBe('Par l\'autre onglet')
    expect(court(etat({ drive: { etat: 'ok', t: T - 10 * MIN }, fichier }))).toBe('Drive : il y a 10 min')
    expect(court(etat({ fichier }))).toBe('Fichier : il y a 25 min')
    expect(court(etat())).toBe('Seulement dans ce navigateur')
    expect(court(etat({ cle: { etat: 'impossible' }, drive: { etat: 'impossible' } }))).toBe('Seulement dans ce navigateur')
  })

  it('« Enregistré » et la date, telle que le bouton la dit', () => {
    const avec = (t: number) => court(etat({ cle: { etat: 'ok', t, nom: 'S.memc' } }))
    expect(avec(T - 10_000)).toBe('Enregistré à l\'instant')
    expect(avec(T - 7 * MIN)).toBe('Enregistré il y a 7 min')
    expect(avec(T - 3 * 60 * MIN)).toBe('Enregistré à 11 h 05')
    expect(avec(new Date(2026, 9, 9, 9, 30).getTime())).toBe('Enregistré hier à 9 h 30')
    expect(avec(new Date(2026, 9, 7, 9, 30).getTime())).toBe('Enregistré le 7 octobre')
    expect(avec(new Date(2025, 8, 30, 9, 30).getTime())).toBe('Enregistré le 30/09/2025')
  })

  it('jamais plus de 28 caractères, jamais coupé, quel que soit l\'état et la date', () => {
    const dates = [T - 10_000, T - 59 * MIN, T - 5 * 60 * MIN, T - 30 * 60 * MIN, new Date(2026, 9, 9, 23, 59).getTime(), new Date(2026, 8, 30, 23, 59).getTime(),
      new Date(2026, 8, 1, 9, 0).getTime(), new Date(2025, 8, 30, 23, 59).getTime(), new Date(2025, 11, 31, 23, 59).getTime()]
    for (const c of CLES) for (const d of DRIVES) for (const t of dates) for (const nav of ['ok', 'erreur', 'incomplet'] as const) for (const depuis of [undefined, T - 5000]) {
      const e = etat({ navigateur: nav, fichier: t, cle: { etat: c, t, depuis, nom: 'Un nom de fichier très long pour le classeur.memc', chemin: ['Un dossier au nom très long', '2', 'Un classeur au nom très long'] }, drive: { etat: d, t, compte: 'lfb', courriel: 'quelqu.un@example.com', enAttente: true } })
      const court = texteEtat(e, T).court
      expect(court.length, court).toBeLessThanOrEqual(COURT_MAX)
      expect(court === 'Enregistrement…' || !court.endsWith('…'), court).toBe(true)
      expect(court).not.toMatch(/clé/i)
    }
  })
})

describe('l\'honnêteté', () => {
  it('jamais « il y a » ni une heure après un échec', () => {
    const t = T - 2 * MIN
    for (const c of CLES) for (const d of DRIVES) for (const nav of ['ok', 'erreur'] as const) {
      const e = etat({ navigateur: nav, cle: { etat: c, t, nom: 'S.memc', message: 'le disque est plein' }, drive: { etat: d, t, message: 'pas de réseau', enAttente: true } })
      const r = texteEtat(e, T)
      for (const l of r.lignes) {
        const aDate = /il y a|à l'instant|aujourd'hui à|hier à/.test(sp(l.texte))
        if (l.quoi === 'cle') expect(aDate, `${c} : ${l.texte}`).toBe(c === 'ok')
        if (l.quoi === 'drive') expect(aDate, `${d} : ${l.texte}`).toBe(d === 'ok')
        if (l.quoi === 'navigateur') expect(aDate).toBe(false)
      }
      // Le texte court ne date que ce qui a réussi
      const cs = sp(r.court)
      if (nav === 'erreur') expect(cs).toBe('Pas enregistré !')
      if (/^Enregistré (il y a|à |hier|le )/.test(cs)) expect(c).toBe('ok')
      if (/^Drive : il y a/.test(cs)) expect(d).toBe('ok')
      if (c === 'erreur' || c === 'conflit' || c === 'permission') expect(cs).not.toMatch(/^Enregistré/)
    }
  })

  it('jamais « Enregistré dans ce navigateur » quand la base a signalé une erreur ; « Enregistré dans » le fichier seulement s\'il l\'est', () => {
    for (const c of CLES) for (const d of DRIVES) {
      const r = texteEtat(etat({ navigateur: 'erreur', fichier: T - MIN, cle: { etat: c, t: T, nom: 'S.memc' }, drive: { etat: d, t: T } }), T)
      expect(r.lignes.some(l => /^Enregistré dans ce navigateur|^Seulement dans ce navigateur/.test(l.texte))).toBe(false)
      for (const l of r.lignes) if (/^Enregistré/.test(l.texte)) { expect(l.quoi).toBe('cle'); expect(c).toBe('ok') }
      expect(r.court).toBe('Pas enregistré !')
      expect(r.niveau).toBe('attention')
    }
  })

  it('« Seulement dans ce navigateur » seulement quand rien d\'autre ne protège, et toujours alors (la base saine)', () => {
    for (const c of CLES) for (const d of DRIVES) for (const fichier of [null, T - MIN]) {
      const e = etat({ cle: { etat: c, t: T - MIN, nom: 'S.memc' }, drive: { etat: d, t: T - MIN }, fichier })
      const r = texteEtat(e, T)
      if (r.court === 'Seulement dans ce navigateur') expect(protege(e, T)).toBe(false)
      expect(r.lignes.find(l => l.quoi === 'navigateur')!.texte, `${c} ${d}`).toBe(protege(e, T) ? 'Enregistré dans ce navigateur' : 'Seulement dans ce navigateur')
    }
  })

  it('aucune ligne, aucun texte court, aucun bandeau ne dit « clé »', () => {
    const m: MemoireBandeau = { ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity }
    for (const c of CLES) for (const d of DRIVES) for (const chemin of [undefined, CHEMIN]) {
      const e = etat({ cle: { etat: c, t: T - MIN, nom: 'S.memc', chemin, actions: ['choisir-cle'], message: c === 'absente' ? '« S.memc » est à choisir de nouveau' : undefined }, drive: { etat: d, t: T - MIN, enAttente: true }, nonEnregistreDepuis: T - 30 * MIN, modifie: T })
      const r = texteEtat(e, T)
      for (const l of r.lignes) expect(l.texte).not.toMatch(/clé/i)
      expect(r.court).not.toMatch(/clé/i)
      expect(bandeauDu(e, T, 10 * MIN, m)?.texte ?? '').not.toMatch(/clé/i)
      expect(resumeEtat(e, T)).not.toMatch(/clé/i)
    }
  })
})

describe('ce qui protège', () => {
  it('le fichier à jour, en cours, ou par l\'autre onglet ; le Drive de moins de 15 min', () => {
    for (const c of CLES) expect(protege(etat({ cle: { etat: c, t: T } }), T)).toBe(c === 'ok' || c === 'en-cours' || c === 'autre-onglet')
    expect(protege(etat({ drive: { etat: 'ok', t: T - 14 * MIN } }), T)).toBe(true)
    expect(protege(etat({ drive: { etat: 'ok', t: T - 15 * MIN } }), T)).toBe(false)
    expect(protege(etat({ drive: { etat: 'erreur', t: T } }), T)).toBe(false)
    // le navigateur seul, ou un fichier, ne protègent pas
    expect(protege(etat({ fichier: T }), T)).toBe(false)
  })
})

describe('le rappel', () => {
  const travail = (min: number, o: Partial<EtatSauvegarde> = {}) => etat({ nonEnregistreDepuis: T - min * MIN, modifie: T, ...o })
  it('rien avant 20 min de travail, rien sans 2 min de calme, rien quand on est protégé', () => {
    expect(rappelDu(etat(), T, Infinity)).toBe(false)
    expect(rappelDu(travail(19), T, 10 * MIN)).toBe(false)
    expect(rappelDu(travail(20), T, 10 * MIN)).toBe(true)
    expect(rappelDu(travail(20), T, 2 * MIN - 1)).toBe(false)
    expect(rappelDu(travail(20), T, 2 * MIN)).toBe(true)
    expect(rappelDu(travail(60, { cle: { etat: 'ok', t: T } }), T, Infinity)).toBe(false)
    expect(rappelDu(travail(60, { drive: { etat: 'ok', t: T - MIN } }), T, Infinity)).toBe(false)
    // une copie du Drive trop vieille ne protège plus
    expect(rappelDu(travail(60, { drive: { etat: 'ok', t: T - 16 * MIN } }), T, Infinity)).toBe(true)
    // le travail se compte jusqu'au dernier changement, pas jusqu'à maintenant
    expect(rappelDu(etat({ nonEnregistreDepuis: T - 60 * MIN, modifie: T - 50 * MIN }), T, Infinity)).toBe(false)
  })

  it('son texte', () => {
    expect(sp(texteRappel(travail(25), T))).toBe('Pas encore enregistré dans un fichier depuis 25 min de travail.')
    expect(sp(texteRappel(travail(70), T))).toBe('Pas encore enregistré dans un fichier depuis 1 h 10 de travail.')
    expect(sp(texteRappel(travail(120), T))).toBe('Pas encore enregistré dans un fichier depuis 2 h de travail.')
    expect(sp(texteRappel(etat({ nonEnregistreDepuis: T - 24 * 60 * MIN, modifie: T }), T))).toBe('Pas encore enregistré dans un fichier depuis hier à 14 h 05.')
  })

  it('le texte lu en arrivant sur un autre classeur, pour celui qu\'on a quitté', () => {
    const suite = ' Il reste dans ce navigateur, mais un navigateur peut l\'oublier.'
    expect(sp(texteRappelDepart('Fractions', travail(25), T))).toBe('« Fractions » n\'est pas encore enregistré dans un fichier : 25 min de travail.' + suite)
    expect(sp(texteRappelDepart('Fractions', travail(70), T))).toBe('« Fractions » n\'est pas encore enregistré dans un fichier : 1 h 10 de travail.' + suite)
    expect(sp(texteRappelDepart('Fractions', etat({ nonEnregistreDepuis: T - 24 * 60 * MIN, modifie: T }), T))).toBe('« Fractions » n\'est pas enregistré dans un fichier depuis hier à 14 h 05.' + suite)
  })
})

describe('le bandeau', () => {
  const memoire = (o: Partial<MemoireBandeau> = {}): MemoireBandeau => ({ ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity, ...o })
  const travail = (o: Partial<EtatSauvegarde> = {}) => etat({ nonEnregistreDepuis: T - 25 * MIN, modifie: T - 3 * MIN, ...o })

  it('le navigateur en erreur passe avant tout, sans ×', () => {
    expect(bandeauDu(travail({ navigateur: 'erreur' }), T, 0, memoire())).toEqual({ raison: 'navigateur', fermable: false, actions: ['enregistrer'], texte: 'Ce navigateur n\'enregistre plus ce classeur.' })
  })
  it('le rappel : seulement quand il est dû, une fois par heure, et × le fait taire une heure', () => {
    expect(bandeauDu(travail(), T, MIN, memoire())).toBe(null)                // en plein geste
    const b = bandeauDu(travail(), T, 3 * MIN, memoire())
    expect(b && { ...b, texte: sp(b.texte) }).toEqual({ raison: 'rappel', fermable: true, actions: ['enregistrer', 'activer-cle'], texte: 'Pas encore enregistré dans un fichier depuis 22 min de travail.' })
    // sans enregistrement automatique possible (Firefox, Safari) : Enregistrer seulement
    expect(bandeauDu(travail({ cle: { etat: 'impossible' } }), T, 3 * MIN, memoire())?.actions).toEqual(['enregistrer'])
    // paru, il reste même si l'on se remet à écrire
    expect(bandeauDu(travail(), T, 0, memoire({ rappelMontre: true, dernierRappel: T - MIN }))?.raison).toBe('rappel')
    // enregistré : il part
    expect(bandeauDu(etat({ fichier: T }), T, 3 * MIN, memoire({ rappelMontre: true, dernierRappel: T - MIN }))).toBe(null)
    // pas deux fois dans l'heure
    expect(bandeauDu(travail(), T, 3 * MIN, memoire({ dernierRappel: T - 59 * MIN }))).toBe(null)
    expect(bandeauDu(travail(), T, 3 * MIN, memoire({ dernierRappel: T - 60 * MIN }))?.raison).toBe('rappel')
    // × : rien pendant une heure
    expect(bandeauDu(travail(), T, 3 * MIN, memoire({ rappelTaitJusqua: T + 1 }))).toBe(null)
    expect(bandeauDu(travail(), T, 3 * MIN, memoire({ rappelTaitJusqua: T }))?.raison).toBe('rappel')
    // protégé (le fichier à jour) : rien
    expect(bandeauDu(travail({ cle: { etat: 'ok', t: T } }), T, 3 * MIN, memoire({ rappelMontre: true }))).toBe(null)
  })
})

describe('le classeur sans fichier dans un niveau rangé, ou à ranger (lot 18, le menu ⋯)', () => {
  const memoire = (o: Partial<MemoireBandeau> = {}): MemoireBandeau => ({ ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity, ...o })
  const travail = (o: Partial<EtatSauvegarde> = {}) => etat({ nonEnregistreDepuis: T - 25 * MIN, modifie: T - 3 * MIN, ...o })
  const aDonner: EtatSauvegarde['cle'] = { etat: 'absente', rangeDans: 'LFB classeurs › 2' }
  const aRanger: EtatSauvegarde['cle'] = { etat: 'absente', rangeable: { niveau: '2nde' } }

  it('la ligne « Pas encore de fichier dans « LFB classeurs › 2 » », une information avec son bouton', () => {
    const t = texteEtat(etat({ cle: aDonner }), T)
    expect(t.lignes.map(l => l.quoi)).toEqual(['navigateur', 'cle', 'drive', 'fichier'])
    expect(t.lignes[1]).toEqual({ quoi: 'cle', niveau: 'info', action: 'donner-fichier', texte: 'Pas encore de fichier dans « LFB classeurs › 2 »' })
    expect(t.niveau).toBe('info')
    expect(t.action).toBeUndefined()
    expect(court(etat({ cle: aDonner }))).toBe('Seulement dans ce navigateur')
    // Le niveau à ranger : aucune ligne (l'entrée du menu ⋯ le propose)
    expect(texteEtat(etat({ cle: aRanger }), T).lignes.find(l => l.quoi === 'cle')).toBeUndefined()
    // Le fichier à choisir de nouveau passe avant (le classeur a son fichier, le navigateur l'a perdu)
    const perdu = texteEtat(etat({ cle: { ...aDonner, message: '« X.memc » est à choisir de nouveau' } }), T).lignes.find(l => l.quoi === 'cle')!
    expect(perdu.action).toBe('activer-cle')
    expect(perdu.texte).toMatch(/^Fichier : « X\.memc »/)
    // Avec un fichier, le rangement ne change rien aux lignes
    expect(lignes(etat({ cle: { etat: 'ok', t: T - MIN, nom: 'S.memc', rangeDans: 'LFB classeurs › 2' } }))).toEqual(['Enregistré dans « S.memc » : il y a 1 min', 'Enregistré dans ce navigateur'])
  })

  it('le bandeau « Ce classeur n\'a pas encore son fichier dans « … » » [Lui donner son fichier], après le fichier à choisir, avant le Drive et le rappel', () => {
    expect(bandeauDu(etat({ cle: aDonner }), T, 0, memoire())).toEqual({ raison: 'cle-a-donner', fermable: true, actions: ['donner-fichier'], texte: 'Ce classeur n\'a pas encore son fichier dans « LFB classeurs › 2 ».' })
    // × l'écarte pour la session
    expect(bandeauDu(etat({ cle: aDonner }), T, 0, memoire({ ecartes: new Set(['cle-a-donner']) }))).toBe(null)
    // Le fichier à choisir de nouveau d'abord
    expect(bandeauDu(etat({ cle: { ...aDonner, message: '« X.memc » est à choisir de nouveau' } }), T, 0, memoire())?.raison).toBe('cle-a-choisir')
    // Avant le conflit du Drive et le rappel
    expect(bandeauDu(travail({ cle: aDonner, drive: { etat: 'conflit', message: 'x', actions: ['recuperer-drive'] } }), T, 3 * MIN, memoire())?.raison).toBe('cle-a-donner')
    expect(bandeauDu(travail({ cle: aDonner }), T, 3 * MIN, memoire({ ecartes: new Set(['cle-a-donner']) }))?.raison).toBe('rappel')
    // Le niveau à ranger : pas de bandeau à lui seul
    expect(bandeauDu(etat({ cle: aRanger }), T, 0, memoire())).toBe(null)
    // Le navigateur en erreur passe avant tout
    expect(bandeauDu(etat({ cle: aDonner, navigateur: 'erreur' }), T, 0, memoire())?.raison).toBe('navigateur')
  })

  it('le rappel propose de ranger le niveau, ou de donner son fichier au classeur, sinon un fichier', () => {
    expect(bandeauDu(travail({ cle: aRanger }), T, 3 * MIN, memoire())?.actions).toEqual(['enregistrer', 'ranger-niveau'])
    expect(bandeauDu(travail({ cle: aDonner }), T, 3 * MIN, memoire({ ecartes: new Set(['cle-a-donner']) }))?.actions).toEqual(['enregistrer', 'donner-fichier'])
    expect(bandeauDu(travail(), T, 3 * MIN, memoire())?.actions).toEqual(['enregistrer', 'activer-cle'])
    expect(bandeauDu(travail({ cle: { etat: 'impossible' } }), T, 3 * MIN, memoire())?.actions).toEqual(['enregistrer'])
  })

  it('la ligne du Drive seule (« Autres sauvegardes ») : même quand le fichier protège le classeur', () => {
    const protege: EtatSauvegarde['cle'] = { etat: 'ok', t: T - MIN, nom: 'S.memc' }
    expect(texteEtat(etat({ cle: protege, drive: { etat: 'ok', t: T - 10 * MIN, compte: 'mem' } }), T).lignes.find(l => l.quoi === 'drive')).toBeUndefined()
    expect(sp(ligneDrive(etat({ cle: protege, drive: { etat: 'ok', t: T - 10 * MIN, compte: 'mem' } }), T)!.texte)).toBe('Sur le Drive personnel : il y a 10 min')
    expect(ligneDrive(etat(), T)).toEqual({ quoi: 'drive', niveau: 'info', texte: 'Pas de copie sur le Drive' })
    expect(ligneDrive(etat({ drive: { etat: 'impossible' } }), T)!.texte).toMatch(/seulement depuis la version en ligne/)
    // Le bouton de la connexion, seulement quand une copie attend ; attention seulement si rien d'autre ne protège
    expect(ligneDrive(etat({ drive: { etat: 'connexion', enAttente: true } }), T)).toEqual({ quoi: 'drive', niveau: 'attention', action: 'connecter-drive', texte: 'Sur le Drive : en attente de la connexion Google' })
    expect(ligneDrive(etat({ cle: protege, drive: { etat: 'connexion', enAttente: true } }), T)!.niveau).toBe('info')
    // Jamais le mot « clé »
    for (const d of DRIVES) expect(ligneDrive(etat({ drive: { etat: d, t: T, enAttente: true, message: 'x' } }), T)?.texte ?? '').not.toMatch(/clé/i)
  })
})

describe('le nom d\'une erreur de la base', () => {
  it('même enveloppée par lib0 (new Error(erreur))', () => {
    expect(nomDErreur(new DOMException('plein', 'QuotaExceededError'))).toBe('QuotaExceededError')
    expect(nomDErreur(new Error(String(new DOMException('The transaction was aborted, so the request cannot be fulfilled.', 'AbortError'))))).toBe('AbortError')
    expect(nomDErreur(new Error('QuotaExceededError: The quota has been exceeded.'))).toBe('QuotaExceededError')
    expect(nomDErreur(new Error('autre chose'))).toBe('Error')
    expect(nomDErreur(null)).toBe('')
    expect(nomDErreur('texte')).toBe('')
  })
})

describe('le fichier du classeur (lot 4, C4) : ses boutons et ses bandeaux', () => {
  const memoire = (o: Partial<MemoireBandeau> = {}): MemoireBandeau => ({ ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity, ...o })
  const conflit: EtatSauvegarde['cle'] = { etat: 'conflit', nom: 'Symétrie.memc', message: 'Le fichier « Symétrie.memc » a été modifié ailleurs (le mardi 7 octobre 2026 à 21 h 30) depuis le dernier enregistrement d\'ici : il n\'est pas remplacé.', actions: ['choisir-cle', 'forcer-cle'] }
  const erreur: EtatSauvegarde['cle'] = { etat: 'erreur', nom: 'Symétrie.memc', message: 'le fichier a été déplacé, supprimé, ou son disque retiré', actions: ['choisir-cle'] }

  it('la ligne d\'un conflit porte ses deux boutons ; celle d\'une erreur, le sien', () => {
    const lc = texteEtat(etat({ cle: conflit }), T).lignes.find(l => l.quoi === 'cle')!
    expect(lc).toEqual({ quoi: 'cle', niveau: 'attention', action: 'choisir-cle', plus: ['forcer-cle'], texte: conflit.message })
    const le = texteEtat(etat({ cle: erreur }), T).lignes.filter(l => l.quoi === 'cle')
    expect(le[0]).toEqual({ quoi: 'cle', niveau: 'attention', action: 'choisir-cle', texte: 'Fichier « Symétrie.memc » : le fichier a été déplacé, supprimé, ou son disque retiré' })
    expect(le[1].texte).toMatch(/^Rien n'est perdu/)
    // Sans action (le travailleur manque, le trou) : pas de bouton
    expect(texteEtat(etat({ cle: { etat: 'erreur', nom: 'S.memc', message: 'ce navigateur ne permet pas d\'écrire le fichier en arrière-plan : enregistrez le classeur (Ctrl + S)', actions: [] } }), T).lignes.find(l => l.quoi === 'cle')).toEqual(
      { quoi: 'cle', niveau: 'attention', texte: 'Fichier « S.memc » : ce navigateur ne permet pas d\'écrire le fichier en arrière-plan : enregistrez le classeur (Ctrl + S)' })
    // Le texte court
    expect(court(etat({ cle: conflit }))).toBe('Fichier changé ailleurs')
    expect(court(etat({ cle: erreur }))).toBe('Pas à jour, rien de perdu')
    expect(texteEtat(etat({ cle: conflit }), T).action).toBe('choisir-cle')
  })

  it('le fichier à choisir de nouveau (un navigateur qui ne garde pas la poignée)', () => {
    // (Lot 4 C5 : la ligne passe en attention, avec le bandeau qui le dit ;
    // l'enregistrement automatique ne marche plus)
    const e = etat({ cle: { etat: 'absente', message: '« X.memc » est à choisir de nouveau (ce navigateur ne le garde pas après un rechargement)' } })
    const l = texteEtat(e, T).lignes.find(x => x.quoi === 'cle')!
    expect(l).toEqual({ quoi: 'cle', niveau: 'attention', action: 'activer-cle', texte: 'Fichier : « X.memc » est à choisir de nouveau (ce navigateur ne le garde pas après un rechargement)' })
    expect(texteEtat(e, T).lignes.map(x => x.quoi)).toEqual(['navigateur', 'cle', 'drive', 'fichier'])
    expect(texteEtat(e, T).niveau).toBe('attention')
    expect(texteEtat(e, T).action).toBe('activer-cle')
    expect(bandeauDu(e, T, 0, memoire())).toEqual({ raison: 'cle-a-choisir', fermable: true, actions: ['activer-cle'], texte: 'Choisissez de nouveau le fichier de ce classeur : ce navigateur ne l\'a pas gardé.' })
    expect(bandeauDu(e, T, 0, memoire({ ecartes: new Set(['cle-a-choisir']) }))).toBe(null)
    // Sans fichier du tout : ni ligne, ni attention, ni bandeau
    expect(texteEtat(etat(), T).lignes.find(x => x.quoi === 'cle')).toBeUndefined()
    expect(texteEtat(etat(), T).niveau).toBe('info')
    expect(bandeauDu(etat(), T, 0, memoire())).toBe(null)
  })

  it('les bandeaux : en pause, un conflit, une erreur ; × les écarte ; le navigateur passe avant', () => {
    expect(bandeauDu(etat({ cle: { etat: 'permission', nom: 'Symétrie.memc' } }), T, 0, memoire())).toEqual(
      { raison: 'cle-permission', fermable: true, actions: ['reprendre-cle'], texte: 'L\'enregistrement dans « Symétrie.memc » attend votre accord.' })
    // Le fichier rangé par l'outil : le dossier choisi, pas le nom du fichier
    expect(bandeauDu(etat({ cle: { etat: 'permission', nom: 'Fractions.memc', chemin: CHEMIN } }), T, 0, memoire())?.texte).toBe('L\'enregistrement dans « LFB classeurs » attend votre accord.')
    expect(bandeauDu(etat({ cle: { etat: 'permission' } }), T, 0, memoire())?.texte).toBe('L\'enregistrement dans le fichier attend votre accord.')
    expect(bandeauDu(etat({ cle: conflit }), T, 0, memoire())).toEqual({ raison: 'cle-conflit', fermable: true, actions: ['choisir-cle', 'forcer-cle'], texte: conflit.message })
    expect(bandeauDu(etat({ cle: { ...conflit, message: undefined } }), T, 0, memoire())?.texte).toBe('Le fichier « Symétrie.memc » a changé ailleurs : il n\'est pas remplacé.')
    expect(bandeauDu(etat({ cle: erreur }), T, 0, memoire())).toEqual(
      { raison: 'cle-erreur', fermable: true, actions: ['choisir-cle'], texte: 'L\'enregistrement dans « Symétrie.memc » a échoué (le fichier a été déplacé, supprimé, ou son disque retiré). Rien n\'est perdu.' })
    expect(bandeauDu(etat({ cle: { ...erreur, chemin: CHEMIN } }), T, 0, memoire())?.texte).toBe('L\'enregistrement dans « LFB classeurs » a échoué (le fichier a été déplacé, supprimé, ou son disque retiré). Rien n\'est perdu.')
    // Une erreur sans action (le trou, le travailleur) : pas de bandeau du fichier
    expect(bandeauDu(etat({ cle: { etat: 'erreur', message: 'x', actions: [] } }), T, 0, memoire())).toBe(null)
    // × : écarté pour la session
    expect(bandeauDu(etat({ cle: conflit }), T, 0, memoire({ ecartes: new Set(['cle-conflit']) }))).toBe(null)
    expect(bandeauDu(etat({ cle: { etat: 'permission' } }), T, 0, memoire({ ecartes: new Set(['cle-permission']) }))).toBe(null)
    // Le navigateur en erreur passe avant tout
    expect(bandeauDu(etat({ navigateur: 'erreur', cle: conflit }), T, 0, memoire())?.raison).toBe('navigateur')
    // En pause, rien ne protège : le rappel vient après, une fois le bandeau du fichier écarté
    const enPause = etat({ cle: { etat: 'permission' }, nonEnregistreDepuis: T - 25 * MIN, modifie: T - 3 * MIN })
    expect(bandeauDu(enPause, T, 3 * MIN, memoire())?.raison).toBe('cle-permission')
    expect(bandeauDu(enPause, T, 3 * MIN, memoire({ ecartes: new Set(['cle-permission']) }))?.raison).toBe('rappel')
  })

  it('ce qui protège : le fichier à jour, en train d\'écrire, ou écrit par l\'autre onglet ; pas en pause, en conflit, en erreur', () => {
    for (const c of ['ok', 'en-cours', 'autre-onglet'] as const) expect(protege(etat({ cle: { etat: c } }), T)).toBe(true)
    for (const c of ['permission', 'conflit', 'erreur', 'absente', 'impossible'] as const) expect(protege(etat({ cle: { etat: c } }), T)).toBe(false)
  })
})

describe('la ligne du classeur ouvert (resumeEtat)', () => {
  it('le fichier : où, et depuis quand ; avec le chemin, sans redire le nom', () => {
    expect(sp(resumeEtat(etat({ cle: { etat: 'ok', t: T - 2 * MIN, nom: 'Fractions.memc', chemin: CHEMIN } }), T))).toBe('Enregistré dans ce navigateur · dans LFB classeurs › 2 › Fractions il y a 2 min')
    expect(sp(resumeEtat(etat({ cle: { etat: 'ok', t: T - 2 * MIN, nom: 'Fractions.memc' } }), T))).toBe('Enregistré dans ce navigateur · dans « Fractions.memc » il y a 2 min')
    expect(resumeEtat(etat({ cle: { etat: 'ok', nom: 'Fractions.memc' } }), T)).toBe('Enregistré dans ce navigateur · dans « Fractions.memc »')
    expect(resumeEtat(etat({ cle: { etat: 'ok', nom: 'F.memc', pasEncoreEcrit: true } }), T)).toBe('Enregistré dans ce navigateur · fichier : pas encore écrit · jamais enregistré dans un fichier')
    expect(resumeEtat(etat({ cle: { etat: 'ok', nom: 'F.memc', t: T, depuis: T } }), T)).toBe('Enregistré dans ce navigateur · fichier : pas encore à jour')
    expect(resumeEtat(etat({ cle: { etat: 'en-cours', nom: 'F.memc', t: T } }), T)).toBe('Enregistré dans ce navigateur · fichier : enregistrement…')
    expect(resumeEtat(etat({ cle: { etat: 'autre-onglet', nom: 'F.memc' } }), T)).toBe('Enregistré dans ce navigateur · fichier (par l\'autre onglet)')
    expect(resumeEtat(etat({ cle: { etat: 'permission', nom: 'F.memc' } }), T)).toBe('Enregistré dans ce navigateur · fichier en pause · jamais enregistré dans un fichier')
    expect(resumeEtat(etat({ cle: { etat: 'erreur', nom: 'F.memc', t: T }, fichier: T - MIN }), T)).toMatch(/^Enregistré dans ce navigateur · fichier : pas à jour · dans un fichier il y a 1/)
    expect(resumeEtat(etat({ cle: { etat: 'conflit', nom: 'F.memc' } }), T)).toMatch(/fichier : pas à jour/)
    expect(resumeEtat(etat({ cle: { etat: 'absente', message: '« X.memc » est à choisir de nouveau' } }), T)).toBe('Enregistré dans ce navigateur · fichier à choisir de nouveau · jamais enregistré dans un fichier')
  })
})

describe('une partie qui ne se relit plus (lot 4, corrections migration : Tableau.incomplet)', () => {
  it('jamais « Enregistré dans ce navigateur », ni « n\'enregistre plus » : la partie qui manque, et ce qui la complète', () => {
    for (const c of CLES) for (const d of DRIVES) {
      const r = texteEtat(etat({ navigateur: 'incomplet', fichier: T - MIN, cle: { etat: c, t: T, nom: 'S.memc' }, drive: { etat: d, t: T } }), T)
      expect(r.lignes.find(l => l.quoi === 'navigateur')).toEqual({ quoi: 'navigateur', niveau: 'attention', texte: TEXTE_INCOMPLET })
      // Sans fichier, le navigateur vient en premier ; avec, juste après la ligne du fichier
      expect(r.lignes.findIndex(l => l.quoi === 'navigateur')).toBe(aSonFichier({ etat: c }) ? r.lignes.filter(l => l.quoi === 'cle').length : 0)
      expect(r.lignes.some(l => /^Enregistré dans ce navigateur/.test(l.texte))).toBe(false)
      expect(r.lignes.some(l => /n'enregistre plus/.test(l.texte))).toBe(false)
      // « Rien n'est perdu » n'est pas dit : une partie ne se relit plus
      expect(r.lignes.some(l => /Rien n'est perdu/.test(l.texte))).toBe(false)
      expect(sp(r.court)).toBe('Une partie ne se relit pas')
      expect(r.court.length).toBeLessThanOrEqual(COURT_MAX)
      expect(r.niveau).toBe('attention')
    }
    expect(TEXTE_INCOMPLET).toMatch(/ne se relit plus dans ce navigateur/)
    expect(TEXTE_INCOMPLET).toMatch(/ouvrez-le \(Ctrl \+ O\)/)
  })

  it('pas de bandeau à elle seule (aucun clic ne la répare) : ceux du fichier et le rappel restent', () => {
    const m: MemoireBandeau = { ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity }
    expect(bandeauDu(etat({ navigateur: 'incomplet' }), T, 10 * MIN, m)).toBeNull()
    expect(bandeauDu(etat({ navigateur: 'incomplet', cle: { etat: 'permission' } }), T, 10 * MIN, m)?.raison).toBe('cle-permission')
    expect(bandeauDu(etat({ navigateur: 'incomplet', modifie: T, nonEnregistreDepuis: T - 30 * MIN }), T, 10 * MIN, m)?.raison).toBe('rappel')
  })

  it('la ligne de la bibliothèque le dit d\'abord', () => {
    expect(sp(resumeEtat(etat({ navigateur: 'incomplet', cle: { etat: 'ok', t: T - 2 * MIN, nom: 'S.memc' } }), T))).toBe('Une partie ne se relit plus dans ce navigateur · dans « S.memc » il y a 2 min')
  })
})

describe('le fichier qui n\'a pas encore le dernier trait (lot 4, corrections sauvegardes)', () => {
  const m: MemoireBandeau = { ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity }

  it('des changements attendent : « Enregistrement bientôt », pas l\'heure de la dernière écriture ; sans le point ambre', () => {
    const e = etat({ cle: { etat: 'ok', t: T - 30_000, nom: 'Symétrie.memc', depuis: T - 5000 } })
    const r = texteEtat(e, T)
    expect(sp(r.court)).toBe('Enregistrement bientôt')
    expect(r.court.length).toBeLessThanOrEqual(COURT_MAX)
    expect(sp(ligneCle(e)!.texte)).toBe('Enregistré dans « Symétrie.memc » : pas encore à jour, les derniers changements partent bientôt (dernière écriture à l\'instant)')
    expect(ligneCle(e)!.niveau).toBe('ok')
    expect(r.niveau).not.toBe('attention')
    // Il protège encore (il a tout jusqu'à sa dernière écriture, la suite part bientôt)
    expect(protege(e, T)).toBe(true)
    expect(bandeauDu(e, T, 10 * MIN, m)).toBeNull()
    expect(sp(resumeEtat(e, T))).toBe('Enregistré dans ce navigateur · fichier : pas encore à jour')
    // Écrit : de nouveau l'heure
    expect(sp(texteEtat(etat({ cle: { etat: 'ok', t: T - 30_000, nom: 'Symétrie.memc' } }), T).court)).toBe('Enregistré à l\'instant')
  })

  it('jamais écrit (la première écriture refusée, puis un rechargement) : jamais « à jour », il ne protège rien', () => {
    const e = etat({ cle: { etat: 'ok', nom: 'Premier classeur.memc', pasEncoreEcrit: true, depuis: T - 3000 }, modifie: T - 2 * MIN, nonEnregistreDepuis: T - 25 * MIN })
    expect(sp(ligneCle(e)!.texte)).toBe('Fichier « Premier classeur.memc » : pas encore écrit (la première écriture part bientôt)')
    expect(ligneCle(e)!.niveau).toBe('info')
    expect(texteEtat(e, T).lignes.some(l => /à jour$/.test(l.texte))).toBe(false)
    expect(sp(texteEtat(e, T).court)).toBe('Enregistrement bientôt')
    expect(protege(e, T)).toBe(false)
    // Le rappel d'enregistrer peut donc venir
    expect(rappelDu(e, T, 3 * MIN)).toBe(true)
    expect(sp(resumeEtat(e, T))).toBe('Enregistré dans ce navigateur · fichier : pas encore écrit · jamais enregistré dans un fichier')
    // La première écriture en cours ne protège pas encore non plus
    expect(protege(etat({ cle: { etat: 'en-cours', pasEncoreEcrit: true } }), T)).toBe(false)
    expect(protege(etat({ cle: { etat: 'en-cours', t: T - MIN } }), T)).toBe(true)
  })

  it('le fichier dont le classeur vient, sans changement depuis : « à jour », dans la ligne et dans le texte court', () => {
    const e = etat({ cle: { etat: 'ok', nom: 'Symétrie.memc' }, fichier: T - 10 * MIN })
    expect(sp(ligneCle(e)!.texte)).toBe('Enregistré dans « Symétrie.memc » : à jour')
    expect(sp(texteEtat(e, T).court)).toBe('Enregistré, à jour')
    expect(protege(e, T)).toBe(true)
  })
})
