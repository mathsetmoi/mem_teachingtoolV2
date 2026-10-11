// L'état de la sauvegarde (lot 4, C3) : chaque ligne et son ordre, le texte
// court et ses priorités, jamais « il y a » après un échec ni « Enregistré »
// quand la base a dit une erreur, ce qui protège, le rappel et le bandeau.
import { describe, expect, it } from 'vitest'
import type { EtatCle, EtatDrive, EtatSauvegarde, MemoireBandeau } from '../src/classeurs/etat'
import { COURT_MAX, TEXTE_INCOMPLET, bandeauDu, ilYA, ilYACourt, nomDErreur, protege, rappelDu, resumeEtat, texteEtat, texteRappel } from '../src/classeurs/etat'

const MIN = 60_000
/** Le samedi 10 octobre 2026 à 14 h 05, à l'heure de la machine */
const T = new Date(2026, 9, 10, 14, 5).getTime()
const sp = (s: string) => s.replace(/ /g, ' ')

function etat(o: Partial<EtatSauvegarde> = {}): EtatSauvegarde {
  return { navigateur: 'ok', modifie: null, fichier: null, nonEnregistreDepuis: null, cle: { etat: 'absente' }, drive: { etat: 'absente' }, ...o }
}
const lignes = (e: EtatSauvegarde, rappel = false) => texteEtat(e, T, { rappel }).lignes.map(l => sp(l.texte))
const court = (e: EtatSauvegarde) => sp(texteEtat(e, T).court)

const CLES: EtatCle[] = ['absente', 'impossible', 'ok', 'en-cours', 'permission', 'erreur', 'autre-onglet', 'conflit']
const DRIVES: EtatDrive[] = ['absente', 'impossible', 'ok', 'en-cours', 'connexion', 'hors-ligne', 'erreur', 'conflit']

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

describe('les lignes', () => {
  it('dans l\'ordre : le navigateur, la clé, le Drive, le fichier', () => {
    const t = texteEtat(etat({ cle: { etat: 'ok', t: T - 2 * MIN, nom: 'Symétrie.memc' }, drive: { etat: 'ok', t: T - 10 * MIN, compte: 'mem', courriel: 'prof@gmail.com' }, fichier: T }), T)
    expect(t.lignes.map(l => l.quoi)).toEqual(['navigateur', 'cle', 'drive', 'fichier'])
    expect(t.lignes.map(l => sp(l.texte))).toEqual([
      'Enregistré dans ce navigateur',
      'Sur la clé (Symétrie.memc) : il y a 2 min',
      'Sur le Drive personnel (prof@gmail.com) : il y a 10 min',
      'Dernier enregistrement dans un fichier : aujourd\'hui à 14 h 05',
    ])
    expect(t.lignes.every(l => l.niveau === 'ok' || l.niveau === 'info')).toBe(true)
    expect(t.niveau).toBe('ok')
  })

  it('le navigateur en erreur : attention, et Ctrl + S', () => {
    const t = texteEtat(etat({ navigateur: 'erreur', erreurBase: 'place' }), T)
    expect(t.lignes[0]).toEqual({ quoi: 'navigateur', niveau: 'attention', action: 'enregistrer', texte: 'Ce navigateur n\'enregistre plus ce classeur (plus de place ?) : enregistrez-le dans un fichier (Ctrl + S).' })
    expect(t.niveau).toBe('attention')
    expect(t.action).toBe('enregistrer')
    expect(texteEtat(etat({ navigateur: 'erreur', erreurBase: 'indisponible' }), T).lignes[0].texte).toMatch(/^Ce navigateur n'enregistre pas ce classeur \(son stockage/)
  })

  it('chaque état de la clé', () => {
    const cle = (c: EtatSauvegarde['cle'], nav: 'ok' | 'erreur' = 'ok') => texteEtat(etat({ cle: c, navigateur: nav }), T).lignes.filter(l => l.quoi === 'cle')
    expect(cle({ etat: 'en-cours' })).toEqual([{ quoi: 'cle', niveau: 'ok', texte: 'Sur la clé : enregistrement…' }])
    expect(cle({ etat: 'permission' })).toEqual([{ quoi: 'cle', niveau: 'attention', action: 'reprendre-cle', texte: 'Sur la clé : en pause, le navigateur attend votre accord' }])
    expect(cle({ etat: 'erreur', message: 'la clé a été retirée.', t: T - MIN })).toEqual([
      { quoi: 'cle', niveau: 'attention', texte: 'Sur la clé : la clé a été retirée' },
      { quoi: 'cle', niveau: 'info', texte: 'Rien n\'est perdu : le classeur est dans ce navigateur ; l\'enregistrement reprendra dès que possible.' },
    ])
    // « Rien n'est perdu » n'est vrai que si le navigateur garde tout
    expect(cle({ etat: 'erreur', message: 'plus de place' }, 'erreur').map(l => l.texte)).toEqual(['Sur la clé : plus de place'])
    expect(cle({ etat: 'autre-onglet' })).toEqual([{ quoi: 'cle', niveau: 'info', texte: 'Sur la clé : c\'est l\'autre onglet ouvert sur ce classeur qui enregistre' }])
    expect(cle({ etat: 'conflit', message: 'Le fichier de la clé a changé ailleurs.' })).toEqual([{ quoi: 'cle', niveau: 'attention', texte: 'Le fichier de la clé a changé ailleurs.' }])
    expect(cle({ etat: 'absente' })).toEqual([{ quoi: 'cle', niveau: 'info', action: 'activer-cle', texte: 'Pas d\'enregistrement automatique sur une clé' }])
    expect(cle({ etat: 'impossible' })).toEqual([{ quoi: 'cle', niveau: 'info', texte: 'Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (Ctrl + S) de temps en temps.' }])
    expect(sp(cle({ etat: 'ok', t: T - 3 * 60 * MIN })[0].texte)).toBe('Sur la clé : aujourd\'hui à 11 h 05')
  })

  it('chaque état du Drive', () => {
    const drive = (d: EtatSauvegarde['drive'], c: EtatSauvegarde['cle'] = { etat: 'absente' }) => texteEtat(etat({ drive: d, cle: c }), T).lignes.filter(l => l.quoi === 'drive')
    expect(sp(drive({ etat: 'ok', t: T - 10 * MIN, compte: 'lfb' })[0].texte)).toBe('Sur le Drive du lycée : il y a 10 min')
    // En attente de la connexion : une information si la clé protège, ou
    // s'il n'y a rien à copier ; sinon attention
    expect(drive({ etat: 'connexion', enAttente: true })).toEqual([{ quoi: 'drive', niveau: 'attention', action: 'connecter-drive', texte: 'Sur le Drive : en attente de la connexion Google' }])
    expect(drive({ etat: 'connexion', enAttente: false })[0].niveau).toBe('info')
    expect(drive({ etat: 'connexion', enAttente: true }, { etat: 'ok', t: T })[0].niveau).toBe('info')
    expect(drive({ etat: 'hors-ligne' })[0].texte).toBe('Sur le Drive : hors connexion, la copie partira au retour du réseau')
    expect(drive({ etat: 'impossible' })[0].texte).toBe('Sur le Drive : seulement depuis la version en ligne (la connexion Google ne marche pas dans la version clé USB)')
    expect(drive({ etat: 'absente' })[0].texte).toBe('Pas de copie sur le Drive')
    expect(drive({ etat: 'erreur', message: 'le Drive est plein.', enAttente: true })[0]).toEqual({ quoi: 'drive', niveau: 'attention', texte: 'Sur le Drive : le Drive est plein' })
    expect(drive({ etat: 'conflit', message: 'La sauvegarde du Drive a changé ailleurs.' })[0].texte).toBe('La sauvegarde du Drive a changé ailleurs.')
  })

  it('le fichier : sa date, ou jamais ; le rappel le met en attention', () => {
    expect(lignes(etat()).at(-1)).toBe('Jamais enregistré dans un fichier')
    expect(lignes(etat({ fichier: T - 24 * 60 * MIN })).at(-1)).toBe('Dernier enregistrement dans un fichier : hier à 14 h 05')
    const t = texteEtat(etat(), T, { rappel: true })
    expect(t.lignes.at(-1)).toMatchObject({ niveau: 'attention', action: 'enregistrer' })
    expect(t.niveau).toBe('attention')
    expect(t.action).toBe('enregistrer')
  })
})

describe('le texte court', () => {
  it('le premier qui s\'applique, dans l\'ordre', () => {
    const fichier = T - 25 * MIN
    expect(court(etat({ navigateur: 'erreur', cle: { etat: 'permission' } }))).toBe('Pas enregistré !')
    expect(court(etat({ cle: { etat: 'permission' }, drive: { etat: 'ok', t: T } }))).toBe('Clé en pause')
    expect(court(etat({ cle: { etat: 'erreur', t: T - MIN }, drive: { etat: 'ok', t: T } }))).toBe('Clé : pas à jour')
    expect(court(etat({ cle: { etat: 'conflit', t: T - MIN } }))).toBe('Clé : pas à jour')
    expect(court(etat({ drive: { etat: 'connexion', enAttente: true }, fichier }))).toBe('Drive en attente')
    expect(court(etat({ drive: { etat: 'erreur', enAttente: true, t: T - MIN } }))).toBe('Drive en attente')
    expect(court(etat({ drive: { etat: 'conflit', enAttente: true } }))).toBe('Drive en attente')
    // la clé protège : le Drive en attente ne se dit pas en premier
    expect(court(etat({ cle: { etat: 'ok', t: T - 2 * MIN }, drive: { etat: 'connexion', enAttente: true } }))).toBe('Clé : il y a 2 min')
    // rien à copier : pas « en attente »
    expect(court(etat({ drive: { etat: 'connexion', enAttente: false }, fichier }))).toBe('Fichier : il y a 25 min')
    expect(court(etat({ cle: { etat: 'ok', t: T - 2 * MIN }, drive: { etat: 'ok', t: T - MIN } }))).toBe('Clé : il y a 2 min')
    expect(court(etat({ drive: { etat: 'ok', t: T - 10 * MIN }, fichier }))).toBe('Drive : il y a 10 min')
    expect(court(etat({ fichier }))).toBe('Fichier : il y a 25 min')
    expect(court(etat())).toBe('Seulement dans ce navigateur')
    expect(court(etat({ cle: { etat: 'impossible' }, drive: { etat: 'impossible' } }))).toBe('Seulement dans ce navigateur')
    expect(court(etat({ cle: { etat: 'en-cours' } }))).toBe('Clé : enregistrement…')
    expect(court(etat({ cle: { etat: 'autre-onglet' } }))).toBe('Clé : par l\'autre onglet')
  })

  it('jamais plus de 28 caractères, quel que soit l\'état', () => {
    const dates = [T - 10_000, T - 59 * MIN, T - 5 * 60 * MIN, T - 30 * 60 * MIN, new Date(2026, 8, 30, 23, 59).getTime(), new Date(2025, 8, 30, 23, 59).getTime()]
    for (const c of CLES) for (const d of DRIVES) for (const t of dates) for (const nav of ['ok', 'erreur'] as const) {
      const e = etat({ navigateur: nav, fichier: t, cle: { etat: c, t, nom: 'Un nom de fichier très long pour la clé.memc' }, drive: { etat: d, t, compte: 'lfb', courriel: 'quelqu.un@exemple.fr', enAttente: true } })
      expect(texteEtat(e, T).court.length).toBeLessThanOrEqual(COURT_MAX)
    }
  })
})

describe('l\'honnêteté', () => {
  it('jamais « il y a » ni une heure après un échec', () => {
    const t = T - 2 * MIN
    for (const c of CLES) for (const d of DRIVES) for (const nav of ['ok', 'erreur'] as const) {
      const e = etat({ navigateur: nav, cle: { etat: c, t, message: 'la clé a été retirée' }, drive: { etat: d, t, message: 'pas de réseau', enAttente: true } })
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
      if (/^Clé : il y a/.test(cs)) expect(c).toBe('ok')
      if (/^Drive : il y a/.test(cs)) expect(d).toBe('ok')
      if (c === 'erreur' || c === 'conflit' || c === 'permission') expect(cs).not.toMatch(/^Clé : il y a/)
    }
  })

  it('jamais « Enregistré » quand la base a signalé une erreur', () => {
    for (const c of CLES) for (const d of DRIVES) {
      const r = texteEtat(etat({ navigateur: 'erreur', fichier: T - MIN, cle: { etat: c, t: T }, drive: { etat: d, t: T } }), T)
      expect(r.lignes.some(l => /^Enregistré/.test(l.texte))).toBe(false)
      expect(r.court).not.toMatch(/^Enregistré|à jour$/)
      expect(r.niveau).toBe('attention')
    }
  })

  it('« Seulement dans ce navigateur » seulement quand rien d\'autre ne protège', () => {
    for (const c of CLES) for (const d of DRIVES) {
      const e = etat({ cle: { etat: c, t: T - MIN }, drive: { etat: d, t: T - MIN } })
      if (texteEtat(e, T).court === 'Seulement dans ce navigateur') expect(protege(e, T)).toBe(false)
    }
  })
})

describe('ce qui protège', () => {
  it('la clé à jour, en cours, ou par l\'autre onglet ; le Drive de moins de 15 min', () => {
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
    // sans clé possible (Firefox, Safari) : Enregistrer seulement
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
    // protégé (la clé) : rien
    expect(bandeauDu(travail({ cle: { etat: 'ok', t: T } }), T, 3 * MIN, memoire({ rappelMontre: true }))).toBe(null)
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

describe('la clé (lot 4, C4) : ses boutons et ses bandeaux', () => {
  const memoire = (o: Partial<MemoireBandeau> = {}): MemoireBandeau => ({ ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity, ...o })
  const conflit: EtatSauvegarde['cle'] = { etat: 'conflit', nom: 'Symétrie.memc', message: 'Le fichier de la clé a été modifié ailleurs : il n\'est pas remplacé.', actions: ['choisir-cle', 'forcer-cle'] }
  const erreur: EtatSauvegarde['cle'] = { etat: 'erreur', nom: 'Symétrie.memc', message: 'la clé n\'est plus là, ou le fichier a été déplacé', actions: ['choisir-cle'] }

  it('la ligne d\'un conflit porte ses deux boutons ; celle d\'une erreur, le sien', () => {
    const lc = texteEtat(etat({ cle: conflit }), T).lignes.find(l => l.quoi === 'cle')!
    expect(lc).toEqual({ quoi: 'cle', niveau: 'attention', action: 'choisir-cle', plus: ['forcer-cle'], texte: conflit.message })
    const le = texteEtat(etat({ cle: erreur }), T).lignes.filter(l => l.quoi === 'cle')
    expect(le[0]).toEqual({ quoi: 'cle', niveau: 'attention', action: 'choisir-cle', texte: 'Sur la clé : la clé n\'est plus là, ou le fichier a été déplacé' })
    expect(le[1].texte).toMatch(/^Rien n'est perdu/)
    // Sans action (le travailleur manque, le trou) : pas de bouton
    expect(texteEtat(etat({ cle: { etat: 'erreur', message: 'ce navigateur ne permet pas d\'écrire le fichier en arrière-plan : enregistrez le classeur (Ctrl + S)', actions: [] } }), T).lignes.find(l => l.quoi === 'cle')).toEqual(
      { quoi: 'cle', niveau: 'attention', texte: 'Sur la clé : ce navigateur ne permet pas d\'écrire le fichier en arrière-plan : enregistrez le classeur (Ctrl + S)' })
    // Le texte court
    expect(court(etat({ cle: conflit }))).toBe('Clé : pas à jour')
    expect(court(etat({ cle: erreur }))).toBe('Clé : pas à jour')
    expect(texteEtat(etat({ cle: conflit }), T).action).toBe('choisir-cle')
  })

  it('le fichier à choisir de nouveau (un navigateur qui ne garde pas la poignée)', () => {
    // (Lot 4 C5 : la ligne passe en attention, avec le bandeau qui le dit ;
    // l'enregistrement automatique sur la clé ne marche plus)
    const e = etat({ cle: { etat: 'absente', message: 'le fichier « X.memc » est à choisir de nouveau (ce navigateur ne le garde pas après un rechargement)' } })
    const l = texteEtat(e, T).lignes.find(x => x.quoi === 'cle')!
    expect(l).toEqual({ quoi: 'cle', niveau: 'attention', action: 'activer-cle', texte: 'Sur la clé : le fichier « X.memc » est à choisir de nouveau (ce navigateur ne le garde pas après un rechargement)' })
    expect(texteEtat(e, T).niveau).toBe('attention')
    expect(texteEtat(e, T).action).toBe('activer-cle')
    expect(bandeauDu(e, T, 0, memoire())).toEqual({ raison: 'cle-a-choisir', fermable: true, actions: ['activer-cle'], texte: 'Choisissez de nouveau le fichier de la clé : ce navigateur ne l\'a pas gardé.' })
    expect(bandeauDu(e, T, 0, memoire({ ecartes: new Set(['cle-a-choisir']) }))).toBe(null)
    // Sans clé du tout : ni attention, ni bandeau
    expect(texteEtat(etat(), T).lignes.find(x => x.quoi === 'cle')!.niveau).toBe('info')
    expect(bandeauDu(etat(), T, 0, memoire())).toBe(null)
  })

  it('les bandeaux : en pause, un conflit, une erreur ; × les écarte ; le navigateur passe avant', () => {
    expect(bandeauDu(etat({ cle: { etat: 'permission', nom: 'Symétrie.memc' } }), T, 0, memoire())).toEqual(
      { raison: 'cle-permission', fermable: true, actions: ['reprendre-cle'], texte: 'L\'enregistrement sur la clé attend votre accord.' })
    expect(bandeauDu(etat({ cle: conflit }), T, 0, memoire())).toEqual({ raison: 'cle-conflit', fermable: true, actions: ['choisir-cle', 'forcer-cle'], texte: conflit.message })
    expect(bandeauDu(etat({ cle: erreur }), T, 0, memoire())).toEqual(
      { raison: 'cle-erreur', fermable: true, actions: ['choisir-cle'], texte: 'L\'enregistrement sur la clé a échoué (la clé n\'est plus là, ou le fichier a été déplacé). Rien n\'est perdu.' })
    // Une erreur sans action (le trou, le travailleur) : pas de bandeau de la clé
    expect(bandeauDu(etat({ cle: { etat: 'erreur', message: 'x', actions: [] } }), T, 0, memoire())).toBe(null)
    // × : écarté pour la session
    expect(bandeauDu(etat({ cle: conflit }), T, 0, memoire({ ecartes: new Set(['cle-conflit']) }))).toBe(null)
    expect(bandeauDu(etat({ cle: { etat: 'permission' } }), T, 0, memoire({ ecartes: new Set(['cle-permission']) }))).toBe(null)
    // Le navigateur en erreur passe avant tout
    expect(bandeauDu(etat({ navigateur: 'erreur', cle: conflit }), T, 0, memoire())?.raison).toBe('navigateur')
    // En pause, rien ne protège : le rappel vient après, une fois le bandeau de la clé écarté
    const enPause = etat({ cle: { etat: 'permission' }, nonEnregistreDepuis: T - 25 * MIN, modifie: T - 3 * MIN })
    expect(bandeauDu(enPause, T, 3 * MIN, memoire())?.raison).toBe('cle-permission')
    expect(bandeauDu(enPause, T, 3 * MIN, memoire({ ecartes: new Set(['cle-permission']) }))?.raison).toBe('rappel')
  })

  it('ce qui protège : la clé à jour, en train d\'écrire, ou écrite par l\'autre onglet ; pas en pause, en conflit, en erreur', () => {
    for (const c of ['ok', 'en-cours', 'autre-onglet'] as const) expect(protege(etat({ cle: { etat: c } }), T)).toBe(true)
    for (const c of ['permission', 'conflit', 'erreur', 'absente', 'impossible'] as const) expect(protege(etat({ cle: { etat: c } }), T)).toBe(false)
  })
})

describe('une partie qui ne se relit plus (lot 4, corrections migration : Tableau.incomplet)', () => {
  it('jamais « Enregistré dans ce navigateur », ni « n\'enregistre plus » : la partie qui manque, et ce qui la complète', () => {
    for (const c of CLES) for (const d of DRIVES) {
      const r = texteEtat(etat({ navigateur: 'incomplet', fichier: T - MIN, cle: { etat: c, t: T }, drive: { etat: d, t: T } }), T)
      expect(r.lignes[0]).toEqual({ quoi: 'navigateur', niveau: 'attention', texte: TEXTE_INCOMPLET })
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

  it('pas de bandeau à elle seule (aucun clic ne la répare) : ceux de la clé et le rappel restent', () => {
    const m: MemoireBandeau = { ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity }
    expect(bandeauDu(etat({ navigateur: 'incomplet' }), T, 10 * MIN, m)).toBeNull()
    expect(bandeauDu(etat({ navigateur: 'incomplet', cle: { etat: 'permission' } }), T, 10 * MIN, m)?.raison).toBe('cle-permission')
    expect(bandeauDu(etat({ navigateur: 'incomplet', modifie: T, nonEnregistreDepuis: T - 30 * MIN }), T, 10 * MIN, m)?.raison).toBe('rappel')
  })

  it('la ligne de la bibliothèque le dit d\'abord', () => {
    expect(sp(resumeEtat(etat({ navigateur: 'incomplet', cle: { etat: 'ok', t: T - 2 * MIN } }), T))).toBe('Une partie ne se relit plus dans ce navigateur · sur la clé il y a 2 min')
  })
})

describe('la clé qui n\'a pas encore le dernier trait (lot 4, corrections sauvegardes)', () => {
  const m: MemoireBandeau = { ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity }
  const ligneCle = (e: EtatSauvegarde) => texteEtat(e, T).lignes.find(l => l.quoi === 'cle')!

  it('des changements attendent : « Clé : pas encore à jour », pas l\'heure de la dernière écriture ; sans le point ambre', () => {
    const e = etat({ cle: { etat: 'ok', t: T - 30_000, nom: 'Symétrie.memc', depuis: T - 5000 } })
    const r = texteEtat(e, T)
    expect(sp(r.court)).toBe('Clé : pas encore à jour')
    expect(r.court.length).toBeLessThanOrEqual(COURT_MAX)
    expect(sp(ligneCle(e).texte)).toBe('Sur la clé (Symétrie.memc) : pas encore à jour, les derniers changements partent bientôt (dernière écriture à l\'instant)')
    expect(ligneCle(e).niveau).toBe('ok')
    expect(r.niveau).not.toBe('attention')
    // Elle protège encore (elle a tout jusqu'à sa dernière écriture, la suite part bientôt)
    expect(protege(e, T)).toBe(true)
    expect(bandeauDu(e, T, 10 * MIN, m)).toBeNull()
    expect(sp(resumeEtat(e, T))).toBe('Enregistré dans ce navigateur · clé : pas encore à jour')
    // Écrit : de nouveau l'heure
    expect(sp(texteEtat(etat({ cle: { etat: 'ok', t: T - 30_000, nom: 'Symétrie.memc' } }), T).court)).toBe('Clé : à l\'instant')
  })

  it('jamais écrite (la première écriture refusée, puis un rechargement) : jamais « à jour », elle ne protège rien', () => {
    const e = etat({ cle: { etat: 'ok', nom: 'Premier classeur.memc', pasEncoreEcrit: true, depuis: T - 3000 }, modifie: T - 2 * MIN, nonEnregistreDepuis: T - 25 * MIN })
    expect(sp(ligneCle(e).texte)).toBe('Sur la clé (Premier classeur.memc) : pas encore écrit (la première écriture part bientôt)')
    expect(ligneCle(e).niveau).toBe('info')
    expect(texteEtat(e, T).lignes.some(l => /à jour$/.test(l.texte))).toBe(false)
    expect(sp(texteEtat(e, T).court)).toBe('Clé : pas encore à jour')
    expect(protege(e, T)).toBe(false)
    // Le rappel d'enregistrer peut donc venir
    expect(rappelDu(e, T, 3 * MIN)).toBe(true)
    expect(sp(resumeEtat(e, T))).toBe('Enregistré dans ce navigateur · clé : pas encore écrite · jamais enregistré dans un fichier')
    // La première écriture en cours ne protège pas encore non plus
    expect(protege(etat({ cle: { etat: 'en-cours', pasEncoreEcrit: true } }), T)).toBe(false)
    expect(protege(etat({ cle: { etat: 'en-cours', t: T - MIN } }), T)).toBe(true)
  })

  it('le fichier dont le classeur vient, sans changement depuis : « à jour », dans la ligne et dans le texte court', () => {
    const e = etat({ cle: { etat: 'ok', nom: 'Symétrie.memc' }, fichier: T - 10 * MIN })
    expect(sp(ligneCle(e).texte)).toBe('Sur la clé (Symétrie.memc) : à jour')
    expect(sp(texteEtat(e, T).court)).toBe('Clé : à jour')
    expect(protege(e, T)).toBe(true)
  })
})
