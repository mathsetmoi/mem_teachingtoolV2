// La copie à sens unique sur le Drive (lot 4 C10) : ce qui se décide sans
// réseau (drive-pur.ts) et ce que l'état de la sauvegarde en dit (etat.ts) :
// le compte, le rythme, les échecs, les classeurs en retard ; les lignes,
// les bandeaux (jamais de fenêtre Google sans clic, rien en plein cours avec
// la clé à jour), et jamais « sur le Drive » sans copie faite.
import { describe, expect, it } from 'vitest'
import type { FicheClasseur } from '../src/classeurs/demarrage'
import type { EtatSauvegarde, MemoireBandeau } from '../src/classeurs/etat'
import { bandeauDu, protege, resumeEtat, texteEtat } from '../src/classeurs/etat'
import {
  APRES_DERNIER, AU_PLUS_TARD, CONFLIT_HISTOIRE, INTERVALLE_MIN, MESSAGE_FIL, compteVoulu, conflitOrigine, copieAilleurs, delaiDEnvoi, enRetard,
  indiceGoogle, intervalle, prochaineCopie, questionDuDrive, raisonDrive, reessai,
} from '../src/classeurs/drive-pur'

const MIN = 60_000
const MO = 1024 * 1024
const T = new Date(2026, 9, 10, 14, 5).getTime()
const sp = (t: string) => t.replace(/[\u00a0\u202f]/g, ' ')

describe('le compte de la copie', () => {
  it('celui du classeur, sinon celui de la bibliothèque, sinon le Drive personnel', () => {
    expect(compteVoulu({}, undefined)).toBe('mem')
    expect(compteVoulu({}, 'lfb')).toBe('lfb')
    expect(compteVoulu({}, 'aucune')).toBe('aucune')
    expect(compteVoulu({ copieDrive: 'lfb' }, 'mem')).toBe('lfb')
    expect(compteVoulu({ copieDrive: 'aucune' }, 'lfb')).toBe('aucune')
    // Une valeur inconnue (une version suivante) ne vaut rien
    expect(compteVoulu({ copieDrive: 'autre' as never }, 'n importe')).toBe('mem')
  })
})

describe('le rythme', () => {
  const base = { premierNonCopie: T, dernierChangement: T, finDerniere: 0, taille: 0, duree: 0, prochainEssai: 0 }
  it('2 minutes après le dernier changement, au plus tard 10 minutes après le premier', () => {
    expect(prochaineCopie({ ...base, premierNonCopie: null })).toBe(null)
    expect(prochaineCopie(base)).toBe(T + APRES_DERNIER)
    // On écrit sans arrêt : au plus tard 10 minutes après le premier changement
    expect(prochaineCopie({ ...base, dernierChangement: T + 9 * MIN })).toBe(T + AU_PLUS_TARD)
  })
  it('au plus une fois par max(10 min, 1 min par Mo, 20 fois la durée du dernier envoi)', () => {
    expect(intervalle(0, 0)).toBe(INTERVALLE_MIN)
    expect(intervalle(18 * MO, 0)).toBe(18 * MIN)
    expect(intervalle(2 * MO, 60_000)).toBe(20 * MIN)
    expect(prochaineCopie({ ...base, finDerniere: T - MIN })).toBe(T - MIN + INTERVALLE_MIN)
    expect(prochaineCopie({ ...base, finDerniere: T - MIN, taille: 18 * MO })).toBe(T - MIN + 18 * MIN)
    // Jamais copié : rien n'attend l'intervalle
    expect(prochaineCopie({ ...base, finDerniere: 0, taille: 18 * MO })).toBe(T + APRES_DERNIER)
    // Pas avant l'essai qui suit un échec
    expect(prochaineCopie({ ...base, prochainEssai: T + 5 * MIN })).toBe(T + 5 * MIN)
  })
  it('les nouveaux essais : 1, 2, 5, puis toutes les 10 minutes ; le délai d\'un envoi grandit avec la taille', () => {
    expect([1, 2, 3, 4, 5, 9].map(reessai)).toEqual([MIN, 2 * MIN, 5 * MIN, 10 * MIN, 10 * MIN, 10 * MIN])
    expect(delaiDEnvoi(0)).toBe(2 * MIN)
    expect(delaiDEnvoi(18 * MO)).toBe(2 * MIN + 18 * 30_000)
  })
})

describe('ce qu\'on dit d\'un échec', () => {
  it('401 : la connexion (un clic) ; le réseau ; le Drive plein ; trop long ; le travailleur', () => {
    expect(raisonDrive({ name: 'ErreurDrive', statut: 401 }, true)).toEqual({ genre: 'connexion', reessayer: false })
    expect(raisonDrive(new TypeError('Failed to fetch'), false)).toEqual({ genre: 'hors-ligne', reessayer: true })
    expect(raisonDrive(new TypeError('Failed to fetch'), true)).toMatchObject({ genre: 'erreur', reessayer: true, message: 'Google Drive ne répond pas (le réseau filtre peut-être Google)' })
    expect(raisonDrive({ name: 'ErreurDrive', statut: 403, raison: 'storageQuotaExceeded', message: 'x' }, true).message).toMatch(/^le Drive est plein/)
    expect(raisonDrive({ name: 'AbortError' }, true).message).toMatch(/trop de temps/)
    expect(raisonDrive({ name: 'ErreurEcrivain', raison: 'fil' }, true)).toMatchObject({ reessayer: false })
    expect(raisonDrive({ name: 'ErreurEcrivain', raison: 'absente' }, true)).toMatchObject({ reessayer: false })
    expect(raisonDrive(new Error('Le dossier « MEM - Sauvegardes » de ce Drive est partagé.'), true).message).toBe('la copie a échoué (Le dossier « MEM - Sauvegardes » de ce Drive est partagé)')
  })
  it('les deux garde-fous ont leur phrase', () => {
    expect(CONFLIT_HISTOIRE).toBe('Ce classeur a perdu une partie de son histoire depuis la dernière copie sur le Drive : elle n\'est pas remplacée.')
    expect(sp(conflitOrigine(new Date(2026, 9, 9, 21, 30).getTime()))).toBe('La copie du Drive a été mise à jour depuis un autre ordinateur (le vendredi 9 octobre 2026 à 21 h 30) : elle n\'est pas remplacée.')
    expect(conflitOrigine(0)).toBe('La copie du Drive a été mise à jour depuis un autre ordinateur : elle n\'est pas remplacée.')
  })
})

describe('les classeurs en retard', () => {
  const fiche = (id: string, o: Partial<FicheClasseur> = {}): FicheClasseur => ({ id, base: 'mem-teachingtool-classeur-' + id, nom: id, dossier: null, etiquettes: [], cree: 1, modifie: 100, ouvert: 0, pages: 1, ...o })
  const tous = () => true
  it('une copie voulue sur ce Drive, changés depuis la dernière (sur ce compte), visibles, pas celui de l\'onglet', () => {
    const fiches = [
      fiche('jamais', { modifie: 50 }),
      fiche('a-jour', { drive: { compte: 'mem', id: 'x', t: 200, taille: 1 } }),
      fiche('change', { modifie: 300, drive: { compte: 'mem', id: 'x', t: 200, taille: 1 } }),
      fiche('autre-drive', { modifie: 300, drive: { compte: 'lfb', id: 'x', t: 400, taille: 1 } }),
      fiche('lycee', { copieDrive: 'lfb' }),
      fiche('aucune', { copieDrive: 'aucune' }),
      fiche('ici', { modifie: 999 }),
      fiche('ecarte', { modifie: 999 }),
      fiche('corbeille', { modifie: 999, corbeille: { t: 1 } }),
      { ...fiche('premier', { modifie: 0, pages: null }), base: 'mem-tableau-local' },
    ]
    const r = enRetard(fiches, { compte: 'mem', defaut: undefined, ici: 'ici', ecartes: new Set(['ecarte']), montre: f => !f.corbeille })
    // (à égalité, par id)
    expect(r.map(f => f.id)).toEqual(['autre-drive', 'change', 'jamais', 'premier'])
    expect(enRetard(fiches, { compte: 'lfb', defaut: undefined, ici: null, ecartes: new Set(), montre: tous }).map(f => f.id)).toEqual(['lycee'])
    // Le réglage de la bibliothèque : tous ceux qui n'ont pas de choix
    expect(enRetard([fiche('j')], { compte: 'lfb', defaut: 'lfb', ici: null, ecartes: new Set(), montre: tous }).map(f => f.id)).toEqual(['j'])
  })
})

describe('l\'état du Drive', () => {
  const etat = (o: Partial<EtatSauvegarde> = {}): EtatSauvegarde => ({ navigateur: 'ok', modifie: null, fichier: null, nonEnregistreDepuis: null, cle: { etat: 'absente' }, drive: { etat: 'absente' }, ...o })
  const memoire = (o: Partial<MemoireBandeau> = {}): MemoireBandeau => ({ ecartes: new Set(), rappelMontre: false, dernierRappel: -Infinity, rappelTaitJusqua: -Infinity, ...o })
  const ligne = (e: EtatSauvegarde) => texteEtat(e, T).lignes.find(l => l.quoi === 'drive')!

  it('jamais « sur le Drive » sans copie faite : la première part bientôt, ou rien à copier', () => {
    expect(sp(ligne(etat({ drive: { etat: 'ok', compte: 'mem', courriel: 'prof@gmail.com', enAttente: true } })).texte)).toBe('Sur le Drive personnel (prof@gmail.com) : la première copie part bientôt')
    expect(sp(ligne(etat({ drive: { etat: 'ok', compte: 'lfb' } })).texte)).toBe('Sur le Drive du lycée : rien à copier pour l\'instant')
    expect(protege(etat({ drive: { etat: 'ok', compte: 'mem', enAttente: true } }), T)).toBe(false)
    expect(resumeEtat(etat({ drive: { etat: 'ok', compte: 'mem', enAttente: true } }), T)).toBe('Enregistré dans ce navigateur · Drive : première copie bientôt · jamais enregistré dans un fichier')
    expect(resumeEtat(etat({ drive: { etat: 'ok', compte: 'mem' } }), T)).toBe('Enregistré dans ce navigateur · jamais enregistré dans un fichier')
  })

  it('les conflits : leur phrase, leurs deux boutons, et un bandeau qu\'on peut fermer', () => {
    const e = etat({ drive: { etat: 'conflit', compte: 'mem', message: CONFLIT_HISTOIRE, actions: ['recuperer-drive', 'forcer-drive'], enAttente: true } })
    expect(ligne(e)).toEqual({ quoi: 'drive', niveau: 'attention', action: 'recuperer-drive', plus: ['forcer-drive'], texte: CONFLIT_HISTOIRE })
    expect(bandeauDu(e, T, 0, memoire())).toEqual({ raison: 'drive-conflit', fermable: true, actions: ['recuperer-drive', 'forcer-drive'], texte: CONFLIT_HISTOIRE })
    expect(bandeauDu(e, T, 0, memoire({ ecartes: new Set(['drive-conflit']) }))).toBe(null)
    // La clé en pause passe avant
    expect(bandeauDu({ ...e, cle: { etat: 'permission' } }, T, 0, memoire())?.raison).toBe('cle-permission')
  })

  it('la connexion qui manque : le bandeau seulement sans la clé, avec une copie qui attend, après 2 minutes sans geste', () => {
    const attente = etat({ drive: { etat: 'connexion', compte: 'mem', enAttente: true } })
    expect(bandeauDu(attente, T, MIN, memoire())).toBe(null)                 // en plein cours
    expect(bandeauDu(attente, T, 2 * MIN, memoire())).toEqual({ raison: 'drive-connexion', fermable: true, actions: ['connecter-drive'], texte: 'La copie sur le Drive attend la connexion Google.' })
    // Une fois paru, il reste quand on se remet à écrire
    expect(bandeauDu(attente, T, 0, memoire({ driveMontre: true }))?.raison).toBe('drive-connexion')
    // Rien à copier : rien
    expect(bandeauDu(etat({ drive: { etat: 'connexion', compte: 'mem', enAttente: false } }), T, 10 * MIN, memoire())).toBe(null)
    // La clé à jour (le jeton expiré en plein cours) : ni bandeau, ni point, une ligne d'information
    const avecCle = { ...attente, cle: { etat: 'ok' as const, t: T - MIN, nom: 'Symétrie.memc' } }
    expect(bandeauDu(avecCle, T, 10 * MIN, memoire())).toBe(null)
    expect(ligne(avecCle).niveau).toBe('info')
    expect(texteEtat(avecCle, T).niveau).not.toBe('attention')
    expect(sp(texteEtat(avecCle, T).court)).toBe('Clé : il y a 1 min')
    // × : plus de la session
    expect(bandeauDu(attente, T, 10 * MIN, memoire({ ecartes: new Set(['drive-connexion']) }))).toBe(null)
    // Le rappel d'enregistrer passe après
    const rappel = { ...attente, modifie: T, nonEnregistreDepuis: T - 30 * MIN }
    expect(bandeauDu(rappel, T, 10 * MIN, memoire())?.raison).toBe('drive-connexion')
    expect(bandeauDu(rappel, T, 10 * MIN, memoire({ ecartes: new Set(['drive-connexion']) }))?.raison).toBe('rappel')
  })

  it('une erreur ne dit jamais d\'heure, et ne montre pas de bandeau', () => {
    const e = etat({ drive: { etat: 'erreur', compte: 'mem', t: T - 3 * MIN, message: 'le Drive est plein : libérez de la place dans Google Drive', enAttente: true } })
    expect(sp(ligne(e).texte)).toBe('Sur le Drive : le Drive est plein : libérez de la place dans Google Drive')
    expect(bandeauDu(e, T, 10 * MIN, memoire())).toBe(null)
    expect(protege(e, T)).toBe(false)
  })
})

describe('le compte Google de la copie (lot 4, corrections sauvegardes)', () => {
  const etat = (o: Partial<EtatSauvegarde> = {}): EtatSauvegarde => ({ navigateur: 'ok', modifie: null, fichier: null, nonEnregistreDepuis: null, cle: { etat: 'absente' }, drive: { etat: 'absente' }, ...o })
  const ligne = (e: EtatSauvegarde) => texteEtat(e, T).lignes.find(l => l.quoi === 'drive')!

  it('la reconnexion propose un compte (login_hint) : le dernier connecté sur ce Drive, sinon celui de la dernière copie, sinon celui de Publier', () => {
    expect(indiceGoogle({ retenu: 'b@x.fr', derniereCopie: 'c@x.fr', publier: 'p@x.fr' })).toBe('b@x.fr')
    // Un poste où Publier n'a jamais servi, ses réglages vidés : la fiche du classeur connaît le compte de sa copie
    expect(indiceGoogle({ retenu: '', derniereCopie: 'prof@lycee.fr', publier: '' })).toBe('prof@lycee.fr')
    expect(indiceGoogle({ publier: 'p@x.fr' })).toBe('p@x.fr')
    expect(indiceGoogle({})).toBe('')
  })

  it('une autre adresse, connue des deux côtés (la casse ne compte pas)', () => {
    expect(copieAilleurs('prof@gmail.com', 'autre@gmail.com')).toBe(true)
    expect(copieAilleurs('Prof@Gmail.com', 'prof@gmail.com')).toBe(false)
    expect(copieAilleurs(undefined, 'autre@gmail.com')).toBe(false)
    expect(copieAilleurs('prof@gmail.com', '')).toBe(false)
  })

  it('la dernière copie sur un autre compte : la ligne dit où elle est et où ira la prochaine ; rien n\'est copié sur celui-ci', () => {
    const e = etat({ drive: { etat: 'ok', compte: 'mem', courriel: 'autre@gmail.com', ailleurs: { courriel: 'prof@gmail.com', t: T - MIN }, enAttente: false } })
    expect(sp(ligne(e).texte)).toBe('Sur le Drive personnel : dernière copie sur prof@gmail.com (il y a 1 min) ; connecté avec autre@gmail.com : la prochaine ira là')
    expect(protege(e, T)).toBe(false)
    expect(sp(texteEtat(e, T).court)).toBe('Seulement dans ce navigateur')
    expect(sp(resumeEtat(e, T))).toBe('Enregistré dans ce navigateur · Drive : dernière copie sur prof@gmail.com · jamais enregistré dans un fichier')
  })

  it('le travailleur manque : la phrase de la copie qui ne part pas seule', () => {
    expect(raisonDrive({ name: 'ErreurEcrivain', raison: 'fil' }, true)).toEqual({ genre: 'erreur', reessayer: false, message: MESSAGE_FIL })
  })
})

describe('fermer l\'onglet avant la copie (contrôle final du lot 4)', () => {
  // La vérification du lot 4 (sauvegardes, t9) : en ligne, le Drive connecté,
  // sans clé, l'onglet fermé 30 s après le dernier trait : la copie partait
  // 2 minutes après, le Drive ne l'a jamais eue
  const o = { aCopier: true, partiraitSeule: true, departVoulu: false, cle: 'absente' }
  it('une copie attend, qui partirait seule, et rien d\'autre ne protège : la question du navigateur', () => {
    expect(questionDuDrive(o)).toBe(true)
    // La clé ne protège pas : en pause, en échec, en conflit, impossible, pas encore d'état
    for (const cle of ['permission', 'erreur', 'conflit', 'impossible', undefined]) expect(questionDuDrive({ ...o, cle })).toBe(true)
  })
  it('la clé protège (à jour, ou qui pose sa propre question ; ou l\'autre onglet l\'écrit) : pas de question de plus', () => {
    for (const cle of ['ok', 'en-cours', 'autre-onglet']) expect(questionDuDrive({ ...o, cle })).toBe(false)
  })
  it('rien à copier, une copie qui ne partirait pas seule (pas connecté, hors ligne, conflit), un départ voulu ou par la bibliothèque : rien', () => {
    expect(questionDuDrive({ ...o, aCopier: false })).toBe(false)
    expect(questionDuDrive({ ...o, partiraitSeule: false })).toBe(false)
    expect(questionDuDrive({ ...o, departVoulu: true })).toBe(false)
  })
})
