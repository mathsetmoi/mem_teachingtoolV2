// Le replay rangé dans un dossier de l'ordinateur : le nom du fichier, son
// code, le lien des élèves, le dépôt dans un dossier (faux dossier), ce qui
// est retenu pour un classeur (faux registre) et les lignes du résumé (lot 16).
import { describe, expect, it } from 'vitest'
import { FORME_CODE, RELAIS_REPLAY, codeDuNom, lienEleveParCode, nouveauCode, relaisDe } from '../src/publication/comptes'
import { deposerLeFichierSeance, deposerLeReplay, lireReglage, nomDuFichierSeance, nomDuReplay, oublierLeDossierRetenu, retenirReglage, texteDuResume } from '../src/publication/replay-dossier'
import type { PoigneeDossier } from '../src/classeurs/ordinateur'
import type { Registre } from '../src/classeurs/registre'

/** Un faux dossier : des fichiers (nom → texte), comme showDirectoryPicker en donne un */
function fauxDossier(fichiers: Record<string, string>, o: { retraitImpossible?: boolean } = {}) {
  const d = {
    kind: 'directory' as const,
    name: 'chapitre',
    async *values() { for (const n of Object.keys(fichiers)) yield { kind: 'file' as const, name: n } },
    async getDirectoryHandle() { throw new Error('pas ici') },
    async getFileHandle(nom: string, { create }: { create?: boolean } = {}) {
      if (!(nom in fichiers) && !create) throw new Error('absent')
      return {
        name: nom,
        async getFile() { return new File([fichiers[nom] ?? ''], nom) },
        async createWritable() {
          let texte = ''
          return { async write(b: Blob) { texte = await b.text() }, async close() { fichiers[nom] = texte } }
        },
      }
    },
    async removeEntry(nom: string) { if (o.retraitImpossible) throw new Error('verrouillé'); delete fichiers[nom] },
  }
  return d as unknown as PoigneeDossier
}

describe('le code et le nom du fichier', () => {
  it('le code a 8 signes a-z 0-9, et deux tirages diffèrent', () => {
    const a = nouveauCode(), b = nouveauCode()
    expect(a).toMatch(FORME_CODE)
    expect(a).not.toBe(b)
  })

  it('chaque signe est possible, aucun trop souvent (le haut de 0-255 est écarté)', () => {
    // Des octets 0, 36, 72… donnent toujours « a » ; 252 et plus sont écartés
    const octets = Uint8Array.from({ length: 16 }, (_, i) => (i % 2 ? 252 + i % 4 : 35))
    expect(nouveauCode(() => octets)).toBe('99999999')
  })

  it('le nom garde le titre, passé au crible, puis le code et .mem', () => {
    expect(nomDuReplay('Mercredi 7 octobre 2026', 'k7f3q9xa')).toBe('Mercredi 7 octobre 2026 [k7f3q9xa].mem')
    expect(nomDuReplay('Limites : suites / exercices ?', 'k7f3q9xa')).toBe('Limites - suites - exercices - [k7f3q9xa].mem')
    expect(nomDuReplay('   ', 'k7f3q9xa')).toBe('Séance [k7f3q9xa].mem')
  })

  it('le fichier séance (lot 18) : le même crible, sans code, à côté du replay', () => {
    expect(nomDuFichierSeance('Séance du 5 oct')).toBe('Séance du 5 oct.mem')
    expect(nomDuFichierSeance('Limites : suites / exercices ?')).toBe('Limites - suites - exercices -.mem')
    expect(nomDuFichierSeance('   ')).toBe('Séance.mem')
    // Le replay du même titre porte le code, le fichier séance non : deux fichiers distincts, sans code lu par erreur
    expect(nomDuReplay('Séance du 5 oct', 're34gk7f')).toBe('Séance du 5 oct [re34gk7f].mem')
    expect(codeDuNom(nomDuFichierSeance('Séance du 5 oct'))).toBeNull()
  })

  it('le code se relit dans le nom, même renommé tant qu’il y reste', () => {
    expect(codeDuNom('Mercredi 7 octobre 2026 [k7f3q9xa].mem')).toBe('k7f3q9xa')
    expect(codeDuNom('Autre nom [k7f3q9xa].mem')).toBe('k7f3q9xa')
    for (const non of ['Séance.mem', 'Séance [k7f3q9xa].memc', 'Séance [K7F3Q9XA].mem', 'Séance [k7f3q9x].mem', '[k7f3q9xa] Séance.mem']) expect(codeDuNom(non), non).toBeNull()
  })

  it('le lien porte le Drive et le code, et le chapitre au besoin', () => {
    expect(lienEleveParCode('https://exemple.fr/revoir.html?r=x#y', 'lfb', 'k7f3q9xa')).toBe('https://exemple.fr/revoir.html?r=lfb&code=k7f3q9xa')
    expect(lienEleveParCode('https://exemple.fr/revoir.html', 'mem', 'k7f3q9xa', 3)).toBe('https://exemple.fr/revoir.html?r=mem&code=k7f3q9xa&c=3')
  })

  it('trois Drive : MEM, LFB et LyFEL, chacun avec son relais', () => {
    expect(RELAIS_REPLAY.map(r => r.cle)).toEqual(['mem', 'lfb', 'lyfel'])
    expect(relaisDe('lyfel')?.nom).toBe('Drive LyFEL')
    expect(RELAIS_REPLAY.every(r => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(r.relais))).toBe(true)
    expect(relaisDe('inconnu')).toBeNull()
  })
})

describe('déposer le replay dans le dossier', () => {
  it('écrit le fichier à son nom', async () => {
    const f: Record<string, string> = {}
    await deposerLeReplay(fauxDossier(f), 'Séance [k7f3q9xa].mem', '{"format":"mem-revoir"}', 'k7f3q9xa')
    expect(f).toEqual({ 'Séance [k7f3q9xa].mem': '{"format":"mem-revoir"}' })
  })

  it('republier sous un autre titre remplace l’ancien fichier du même code, rien d’autre', async () => {
    const f: Record<string, string> = { 'Ancien [k7f3q9xa].mem': 'vieux', 'Fractions.memc': 'classeur', 'Autre [zzzzzzzz].mem': 'autre séance' }
    await deposerLeReplay(fauxDossier(f), 'Nouveau [k7f3q9xa].mem', 'neuf', 'k7f3q9xa')
    expect(f).toEqual({ 'Nouveau [k7f3q9xa].mem': 'neuf', 'Fractions.memc': 'classeur', 'Autre [zzzzzzzz].mem': 'autre séance' })
  })

  it('un ancien fichier verrouillé reste, sans faire échouer le dépôt', async () => {
    const f: Record<string, string> = { 'Ancien [k7f3q9xa].mem': 'vieux' }
    await deposerLeReplay(fauxDossier(f, { retraitImpossible: true }), 'Nouveau [k7f3q9xa].mem', 'neuf', 'k7f3q9xa')
    expect(f['Nouveau [k7f3q9xa].mem']).toBe('neuf')
  })

  it('le fichier séance (lot 18) : écrit à côté du replay, remplacé au même titre, rien d’autre touché', async () => {
    const f: Record<string, string> = { 'Séance du 5 oct [k7f3q9xa].mem': 'replay', 'Probas.memc': 'classeur' }
    expect(await deposerLeFichierSeance(fauxDossier(f), 'Séance du 5 oct', 'séance')).toBe('Séance du 5 oct.mem')
    expect(f).toEqual({ 'Séance du 5 oct [k7f3q9xa].mem': 'replay', 'Probas.memc': 'classeur', 'Séance du 5 oct.mem': 'séance' })
    await deposerLeFichierSeance(fauxDossier(f), 'Séance du 5 oct', 'séance, de nouveau')
    expect(f['Séance du 5 oct.mem']).toBe('séance, de nouveau')
    expect(Object.keys(f).length).toBe(3)
  })
})

/** Un faux registre : des fiches de classeurs et de dossiers, et les réglages en mémoire */
function fauxRegistre(classeurs: Record<string, string | null>, dossiers: { id: string; parent: string | null }[] = []) {
  const etat = new Map<string, unknown>()
  const r = {
    async classeur(id: string) { return id in classeurs ? { id, nom: 'Fractions', dossier: classeurs[id] } : undefined },
    async dossiers() { return dossiers.map(d => ({ ...d, nom: d.id, couleur: '', cree: 0 })) },
    async reglage(cle: string) { return etat.get(cle) },
    async ecrireReglage(cle: string, v: unknown) { etat.set(cle, v) },
  }
  return { registre: r as unknown as Registre, etat }
}
const poignee = (name: string) => ({ kind: 'directory', name }) as unknown as PoigneeDossier

describe('ce qui est retenu pour un classeur', () => {
  it('à la racine de la bibliothèque : le dossier ET le Drive dans la clé du classeur, aucune clé de classe', async () => {
    const { registre, etat } = fauxRegistre({ c1: null })
    const p = poignee('Fractions')
    await retenirReglage(registre, 'c1', { compte: 'mem', poignee: p })
    expect([...etat.keys()]).toEqual(['replay-dossier:c1'])
    expect(etat.get('replay-dossier:c1')).toEqual({ poignee: p, compte: 'mem' })
    expect(await lireReglage(registre, 'c1')).toEqual({ poignee: p, compte: 'mem' })
    // Republier sans rechoisir le dossier, avec un autre Drive : le dossier retenu reste
    await retenirReglage(registre, 'c1', { compte: 'lfb' })
    expect(await lireReglage(registre, 'c1')).toEqual({ poignee: p, compte: 'lfb' })
  })

  it('dans une classe : le dossier par classeur, le Drive par classe (le dossier le plus haut), partagé par ses classeurs', async () => {
    const { registre, etat } = fauxRegistre({ c1: 'd2', c2: 'd2', c3: null }, [{ id: 'd1', parent: null }, { id: 'd2', parent: 'd1' }])
    const p = poignee('Fractions')
    await retenirReglage(registre, 'c1', { compte: 'lfb', poignee: p })
    expect(etat.get('replay-dossier:c1')).toEqual({ poignee: p })
    expect(etat.get('replay-compte:d1')).toBe('lfb')
    expect(await lireReglage(registre, 'c1')).toEqual({ poignee: p, compte: 'lfb' })
    expect(await lireReglage(registre, 'c2')).toEqual({ poignee: undefined, compte: 'lfb' })
    // Un classeur à la racine n'a rien à voir avec cette classe
    expect(await lireReglage(registre, 'c3')).toEqual({})
  })

  it('rien de retenu : rien n’est écrit, et la lecture rend un réglage vide', async () => {
    const { registre, etat } = fauxRegistre({ c1: null })
    await retenirReglage(registre, 'c1', {})
    expect(etat.size).toBe(0)
    expect(await lireReglage(registre, 'c1')).toEqual({})
  })

  it('oublier le dossier retenu (le fichier l’a quitté, lot 18) : le Drive reste ; rien à oublier : rien d’écrit', async () => {
    const { registre, etat } = fauxRegistre({ c1: null, c2: null })
    await retenirReglage(registre, 'c1', { compte: 'mem', poignee: poignee('2_13_Proba') })
    await oublierLeDossierRetenu(registre, 'c1')
    expect(etat.get('replay-dossier:c1')).toEqual({ compte: 'mem' })
    expect(await lireReglage(registre, 'c1')).toEqual({ poignee: undefined, compte: 'mem' })
    await oublierLeDossierRetenu(registre, 'c2')
    expect(etat.has('replay-dossier:c2')).toBe(false)
  })
})

describe('les lignes du résumé (Publier en un clic)', () => {
  it('une page, la séance du jour, le titre proposé d’office : deux lignes', () => {
    const t = texteDuResume({ libelle: 'Séance du mer 28 oct 14h', aujourdhui: true, pages: 1, titre: '', chemin: 'Fractions', drive: 'Drive personnel' })
    expect(t.seance).toBe('Séance du mer 28 oct 14h (aujourd\'hui) · 1 page')
    expect(t.lieu).toBe('Rangé dans « Fractions » · Drive personnel')
    expect(t.titre).toBeNull()
  })

  it('trois pages, une séance passée, le dossier du chapitre, un titre différent : trois lignes', () => {
    const t = texteDuResume({ libelle: 'Séance du lun 13 oct 8h', aujourdhui: false, pages: 3, titre: 'Fractions : addition', chemin: 'Mon Drive › 5e › Fractions', drive: 'Drive du lycée' })
    expect(t.seance).toBe('Séance du lun 13 oct 8h · 3 pages')
    expect(t.lieu).toBe('Rangé dans « Mon Drive › 5e › Fractions » · Drive du lycée')
    expect(t.titre).toBe('Titre pour les élèves : « Fractions : addition »')
  })

  it('un titre égal au libellé de la séance (ou vide d’espaces) ne fait pas de ligne', () => {
    expect(texteDuResume({ libelle: 'Chapitre 3', aujourdhui: false, pages: 2, titre: ' Chapitre 3 ', chemin: 'Fractions', drive: 'Drive personnel' }).titre).toBeNull()
    expect(texteDuResume({ libelle: 'Chapitre 3', aujourdhui: false, pages: 2, titre: '   ', chemin: 'Fractions', drive: 'Drive personnel' }).titre).toBeNull()
  })
})
