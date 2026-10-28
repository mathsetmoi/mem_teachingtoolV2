// Le replay rangé dans un dossier de l'ordinateur : le nom du fichier, son
// code, le lien des élèves, et le dépôt dans un dossier (faux dossier).
import { describe, expect, it } from 'vitest'
import { FORME_CODE, RELAIS_REPLAY, codeDuNom, lienEleveParCode, nouveauCode, relaisDe } from '../src/publication/comptes'
import { deposerLeReplay, nomDuReplay } from '../src/publication/replay-dossier'
import type { PoigneeDossier } from '../src/classeurs/ordinateur'

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

  it('le code se relit dans le nom, même renommé tant qu’il y reste', () => {
    expect(codeDuNom('Mercredi 7 octobre 2026 [k7f3q9xa].mem')).toBe('k7f3q9xa')
    expect(codeDuNom('Autre nom [k7f3q9xa].mem')).toBe('k7f3q9xa')
    for (const non of ['Séance.mem', 'Séance [k7f3q9xa].memc', 'Séance [K7F3Q9XA].mem', 'Séance [k7f3q9x].mem', '[k7f3q9xa] Séance.mem']) expect(codeDuNom(non), non).toBeNull()
  })

  it('le lien porte le Drive et le code, et le chapitre au besoin', () => {
    expect(lienEleveParCode('https://exemple.fr/revoir.html?r=x#y', 'lfb', 'k7f3q9xa')).toBe('https://exemple.fr/revoir.html?r=lfb&code=k7f3q9xa')
    expect(lienEleveParCode('https://exemple.fr/revoir.html', 'mem', 'k7f3q9xa', 3)).toBe('https://exemple.fr/revoir.html?r=mem&code=k7f3q9xa&c=3')
  })

  it('trois Drive : MEM, LFB et LyFEL (celui-ci sans relais tant qu’il n’est pas installé)', () => {
    expect(RELAIS_REPLAY.map(r => r.cle)).toEqual(['mem', 'lfb', 'lyfel'])
    expect(relaisDe('lyfel')?.nom).toBe('Drive LyFEL')
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
})
