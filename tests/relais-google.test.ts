// La connexion Google suit l'onglet d'un classeur à l'autre (lot 4,
// corrections de conformité) : changer de classeur recharge la page, et le
// jeton, gardé en mémoire, se perdait ; la copie sur le Drive attendait un
// clic à chaque classeur. Il passe maintenant par la mémoire de l'onglet
// (sessionStorage), écrit juste avant de partir et effacé dès l'arrivée ;
// jamais un jeton expiré, ni celui d'un compte inconnu. Et les textes du
// lot 4 donnent le raccourci du système (⌘ sur Mac et sur iPad), ou, au
// doigt seulement, l'entrée du menu ⋯.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Un sessionStorage d'onglet, sous Node */
function memoireDOnglet() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.has(k) ? m.get(k)! : null,
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    m,
  }
}

describe('la connexion Google, d\'un classeur à l\'autre dans le même onglet', () => {
  let onglet: ReturnType<typeof memoireDOnglet>
  beforeEach(() => {
    vi.resetModules()
    onglet = memoireDOnglet()
    vi.stubGlobal('sessionStorage', onglet)
  })
  afterEach(() => { vi.unstubAllGlobals() })

  const charger = () => import('../src/publication/drive')

  it('passée avant de partir, reprise en arrivant, et aussitôt effacée de l\'onglet', async () => {
    const T = Date.now()
    onglet.setItem('mem-teachingtool-connexion-google', JSON.stringify({ jeton: 'j-1', expiration: T + 50 * 60_000, compte: 'mem', courriel: 'prof@gmail.com' }))
    const d = await charger()
    // La page d'arrivée l'a reprise en se chargeant
    expect(d.connecte('mem')).toBe(true)
    expect(d.connecte('lfb')).toBe(false)
    expect(d.courrielDe('mem')).toBe('prof@gmail.com')
    expect(onglet.getItem(d.CLE_RELAIS_GOOGLE)).toBeNull()
    // Elle repart vers le classeur suivant
    d.passerLaConnexion()
    const passe = JSON.parse(onglet.getItem(d.CLE_RELAIS_GOOGLE)!)
    expect(passe).toEqual({ jeton: 'j-1', expiration: T + 50 * 60_000, compte: 'mem', courriel: 'prof@gmail.com' })
    // Se déconnecter (ou un 401) l'efface aussi de l'onglet
    d.deconnecter()
    expect(onglet.getItem(d.CLE_RELAIS_GOOGLE)).toBeNull()
    expect(d.connecte('mem')).toBe(false)
    // Sans connexion, rien ne part
    d.passerLaConnexion()
    expect(onglet.m.size).toBe(0)
  })

  it('jamais un jeton expiré, d\'une durée impossible, d\'un compte inconnu, ou illisible ; et toujours effacé', async () => {
    const T = Date.now()
    const essais: unknown[] = [
      { jeton: 'j', expiration: T - 1000, compte: 'mem' },
      { jeton: 'j', expiration: T + 5 * 3600_000, compte: 'mem' },
      { jeton: 'j', expiration: T + 60_000, compte: 'pirate' },
      { jeton: '', expiration: T + 60_000, compte: 'mem' },
      { expiration: T + 60_000, compte: 'mem' },
      '{pas du json',
    ]
    for (const e of essais) {
      vi.resetModules()
      onglet.setItem('mem-teachingtool-connexion-google', typeof e === 'string' ? e : JSON.stringify(e))
      const d = await charger()
      expect(d.connecte('mem') || d.connecte('lfb')).toBe(false)
      expect(onglet.getItem(d.CLE_RELAIS_GOOGLE)).toBeNull()
    }
  })

  it('sans mémoire d\'onglet (navigation privée stricte, Node) : rien ne casse', async () => {
    vi.stubGlobal('sessionStorage', undefined)
    const d = await charger()
    expect(d.reprendreLaConnexion()).toBe('')
    expect(() => d.passerLaConnexion()).not.toThrow()
    expect(d.connecte('mem')).toBe(false)
  })
})

describe('les textes du lot 4 : le raccourci du système, ou l\'entrée du menu', () => {
  beforeEach(() => { vi.resetModules() })
  afterEach(() => { vi.unstubAllGlobals() })

  /** Un appareil : sa plateforme, et ses pointeurs (fin : souris, pavé, stylet ; grossier : le doigt) */
  const appareil = (platform: string, fin: boolean, doigt: boolean) => {
    vi.stubGlobal('navigator', { platform, maxTouchPoints: doigt ? 5 : 0, onLine: true })
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('any-pointer: fine') ? fin : q.includes('any-pointer: coarse') ? doigt : false }))
  }
  const lignes = async () => {
    const { texteEtat } = await import('../src/classeurs/etat')
    const { MESSAGE_QUITTER } = await import('../src/classeurs/surveillance')
    const { PLUS_RICHE, MESSAGE_FIL } = await import('../src/classeurs/cle')
    const { raisonDrive } = await import('../src/classeurs/drive-pur')
    const { TEXTE_INCOMPLET } = await import('../src/classeurs/etat')
    const T = Date.now()
    const t = texteEtat({ navigateur: 'ok', cle: { etat: 'impossible' }, drive: { etat: 'absente' }, fichier: null, modifie: T, nonEnregistreDepuis: T }, T)
    return {
      cle: t.lignes.find(l => l.quoi === 'cle')?.texte,
      quitter: MESSAGE_QUITTER, plusRiche: PLUS_RICHE, fil: MESSAGE_FIL, incomplet: TEXTE_INCOMPLET,
      drive: raisonDrive({ name: 'ErreurEcrivain', raison: 'absente' }, true).message,
    }
  }

  it('Safari sur Mac : ⌘ + S, ⌘ + O, comme le menu ⋯', async () => {
    appareil('MacIntel', true, false)
    const l = await lignes()
    expect(l.cle).toBe('Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (⌘ + S) de temps en temps.')
    expect(l.quitter).toMatch(/\(⌘ \+ S\)\.$/)
    expect(l.plusRiche).toMatch(/\(⌘ \+ O\)\.$/)
    expect(l.fil).toMatch(/\(⌘ \+ S\)$/)
    expect(l.incomplet).toMatch(/\(⌘ \+ O\)\.$/)
    expect(l.drive).toMatch(/\(⌘ \+ S\)$/)
    for (const t of Object.values(l)) expect(t).not.toMatch(/Ctrl/)
  })

  it('l\'iPad au doigt (souvent sans clavier) : l\'entrée du menu ⋯ ; avec son clavier et son pavé : ⌘ + S', async () => {
    appareil('MacIntel', false, true)
    let l = await lignes()
    expect(l.cle).toBe('Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (menu ⋯ → Enregistrer le classeur) de temps en temps.')
    expect(l.incomplet).toMatch(/ouvrez-le \(menu ⋯ → Ouvrir un classeur\)\.$/)
    for (const t of Object.values(l)) expect(t).not.toMatch(/Ctrl|⌘/)
    vi.resetModules()
    appareil('MacIntel', true, true)
    l = await lignes()
    expect(l.cle).toMatch(/\(⌘ \+ S\) de temps en temps\.$/)
  })

  it('le PC (souris, tablette graphique, TNI) : Ctrl + S, comme avant', async () => {
    appareil('Win32', true, false)
    let l = await lignes()
    expect(l.cle).toBe('Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (Ctrl + S) de temps en temps.')
    expect(l.quitter).toBe('Ce classeur n\'est pas entièrement enregistré dans ce navigateur : enregistrez-le d\'abord (Ctrl + S).')
    vi.resetModules()
    appareil('Win32', true, true)   // le TNI : le doigt et la souris
    l = await lignes()
    expect(l.cle).toMatch(/\(Ctrl \+ S\) de temps en temps\.$/)
  })
})
