// Lot 4, corrections « conformité » : les quatre défauts du rapport de
// vérification (verif/conformite : drive-changer, drive-cle-retour,
// pages-carte, pages-carte2, textes, mac), chacun refait tel qu'il a été
// trouvé, sur le serveur de développement (Google simulé comme dans
// C10-drive.mjs, l'OPFS pour la clé).
//   D. La connexion Google suit l'onglet d'un classeur à l'autre (changer de
//      classeur recharge la page) : connecté dans A, on passe à B par la
//      bibliothèque ; B reste connecté sans un clic ni une fenêtre Google, sa
//      copie part, et celle de A (changé juste avant de partir, en retard)
//      part depuis B. Le jeton n'est ni dans l'adresse, ni dans
//      localStorage, ni dans la mémoire de l'onglet une fois arrivé. F5 (ou
//      un jeton expiré) demande toujours de se reconnecter, honnêtement.
//   K. La clé et le Drive ensemble (le choix b) : A → B → A, dix minutes dans
//      B, puis un cours dans A : la clé s'écrit toujours, et la copie sur le
//      Drive part, sans un clic.
//   P. La carte du classeur ouvert dans la bibliothèque : le bon nombre de
//      pages et la bonne date 2 s après un changement (la fiche s'écrit à
//      l'ouverture de la bibliothèque) ; puis, la bibliothèque restée
//      ouverte, quand le suivi écrit la fiche, la carte suit.
//   T. Les textes : la corbeille des pages dit « le classeur garde tout ce
//      qui a été écrit » ; sur Mac (Safari imité), les textes de l'état
//      disent ⌘ + S comme le menu ; sur l'iPad au doigt, ils nomment
//      l'entrée du menu ⋯ ; sur le PC, Ctrl + S comme avant.
// Lancer : node lot4/corrections-conformite.mjs [D K P T]
import * as O from './conformite-travail/outils.mjs'
const { ok, MIN } = O
const parties = process.argv.slice(2)
const seul = x => !parties.length || parties.includes(x)
const info = (m, d) => console.log('·', m, d === undefined ? '' : JSON.stringify(d).slice(0, 900))
const RELAIS = 'mem-teachingtool-connexion-google'

await O.lancer({ persistant: true })

/** Un second classeur, créé comme le fait la bibliothèque */
const nouveauClasseur = (p, nom) => p.evaluate(async nom => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), id = dem.idClasseur(), T = Date.now()
  const fiche = { id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: T, modifie: T, ouvert: 0, pages: 1 }
  await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom: fiche.nom }))
  return id
}, nom)
/** Par la bibliothèque, comme le professeur : le bouton du classeur, puis la carte */
async function aller(p, id) {
  await p.click('.bouton-classeur')
  await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
  await p.waitForTimeout(300)
  await Promise.all([
    p.waitForURL(u => u.searchParams.get('classeur') === id, { timeout: 20000 }),
    p.click(`.grille-classeurs.tous .case-classeur[data-id="${id}"] .carte-classeur`),
  ])
  await O.pret(p)
}
const envois = g => g.requetes.filter(r => r.chemin.startsWith('/upload/')).length
const relais = p => p.evaluate(k => { try { return sessionStorage.getItem(k) } catch { return 'illisible' } }, RELAIS)
/** Les clés de localStorage qui contiennent un jeton (le faux Google les fait « jeton:<courriel> ») */
const jetonsEcrits = p => p.evaluate(() => Object.keys(localStorage).filter(k => /jeton:/.test(localStorage.getItem(k) ?? '')))
/** connecte('mem') du module drive.ts que la page utilise (exposé en
 *  développement : le serveur ajoute « ?t=… » aux modules changés depuis son
 *  démarrage, un import d'ici en ferait un autre) */
const connecteIci = p => p.evaluate(() => window.__google.connecte('mem'))
/** Le temps passe (une minute à la fois, la page a le temps de travailler) jusqu'à ce que f() soit vrai */
async function jusquA(p, f, n = 12, pas = MIN) {
  for (let i = 0; i < n; i++) {
    if (await f()) return true
    await p.clock.fastForward(pas); await p.waitForTimeout(1500)
  }
  return !!await f()
}

// =====================================================================
// D. La connexion suit l'onglet d'un classeur à l'autre
// =====================================================================
if (seul('D')) {
  console.log('\n=== D. La connexion Google suit l\'onglet d\'un classeur à l\'autre ===')
  const g = new O.FauxGoogle()
  const ctx = await O.contexte(g)
  const p = await O.ouvrir(ctx, '', 'D')
  const idA = await p.evaluate(() => window.__app.classeur.id)
  await O.gisPret(p)
  await O.seConnecter(p)
  let e = await O.etat(p)
  ok(e.drive?.etat === 'ok', 'D1) A : connecté à Google d\'un clic', e.drive)
  await O.ecrire(p, 250, 200)
  await p.clock.fastForward(2 * MIN + 3000)
  await p.waitForFunction(() => window.__drive.etat.t !== undefined, null, { timeout: 15000 }).catch(() => {})
  ok(g.sauvegardes().length === 1, '   … la première copie de A part', g.sauvegardes().map(s => s.name))
  const gisAvant = g.gis.length
  // Un trait de plus dans A, et l'on part aussitôt (A est en retard sur le Drive)
  await O.ecrire(p, 260, 300)
  const idB = await nouveauClasseur(p, 'Fractions')
  await aller(p, idB)
  e = await O.etat(p)
  info('B ouvert', e)
  ok(e.drive?.etat === 'ok' && e.drive.courriel === 'prof@example.com' && await connecteIci(p), 'D2) B, ouvert par la bibliothèque : toujours connecté au même compte Google, sans un clic', e.drive)
  ok(!e.bandeau && !e.point && !/connexion/i.test(e.ligne?.texte ?? ''), '   … ni bandeau, ni point, ni « en attente de la connexion »', e)
  ok(await relais(p) === null, '   … le jeton n\'est plus dans la mémoire de l\'onglet (effacé dès l\'arrivée)', await relais(p))
  ok((await jetonsEcrits(p)).length === 0 && !/jeton/.test(p.url()), '   … ni dans localStorage, ni dans l\'adresse', { cles: await jetonsEcrits(p), url: p.url() })
  // Un trait dans B : sa copie part, puis celle de A (en retard) depuis B
  await O.ecrire(p, 300, 300)
  await p.clock.fastForward(2 * MIN + 10_000); await p.waitForTimeout(1500)
  ok(await jusquA(p, () => g.sauvegardes().some(s => s.name === 'Fractions.memc')), 'D3) la copie de « Fractions » part sans un clic', g.sauvegardes().map(s => s.name))
  const aJour = async () => { const f = await O.ficheDe(p, idA); return !!f?.drive && f.drive.t >= f.modifie && JSON.stringify(f.drive.vecteur) === JSON.stringify(f.vecteur) }
  ok(await jusquA(p, aJour), 'D4) « Premier classeur », changé juste avant de partir, est copié depuis B (classeur en retard), avec son dernier trait', await O.ficheDe(p, idA).then(f => ({ modifie: f.modifie, drive: f.drive && { t: f.drive.t } })))
  const sA = g.sauvegardes().find(s => s.appProperties?.memClasseur === idA)
  ok(sA && O.formesDe(sA.octets).length === 2, '   … sa copie sur le Drive a les deux traits de A', sA && O.formesDe(sA.octets))
  ok(g.gis.length === gisAvant, `D5) aucune fenêtre Google sans un clic (${g.gis.length - gisAvant})`)
  ok(g.relais.length === 0, '   … et rien n\'est allé au relais des replays', g.relais)
  // F5 : la connexion ne passe que d'un classeur à l'autre (pas au rechargement) : on le dit
  await p.reload(); await O.pret(p)
  ok(!await connecteIci(p) && await relais(p) === null, 'D6) F5 : il faut se reconnecter (la connexion ne suit que le changement de classeur)')
  await O.ecrire(p, 320, 360)
  await p.waitForTimeout(500)
  e = await O.etat(p)
  ok(e.drive?.etat === 'connexion' && /en attente de la connexion Google/.test(e.ligne?.texte ?? ''), '   … et l\'état le dit honnêtement (« Sur le Drive : en attente de la connexion Google »)', e)
  ok(g.gis.length === gisAvant, '   … toujours sans fenêtre Google')
  // Un jeton expiré, ou d'un compte inconnu, laissé dans l'onglet : jamais repris, toujours effacé
  for (const [quoi, o] of [['expiré', { jeton: 'jeton:prof@example.com', expiration: Date.now() - 1000, compte: 'mem', courriel: 'prof@example.com' }],
    ['d\'un compte inconnu', { jeton: 'jeton:prof@example.com', expiration: Date.now() + 30 * MIN, compte: 'autre', courriel: 'prof@example.com' }]]) {
    await p.evaluate(([k, o]) => sessionStorage.setItem(k, JSON.stringify(o)), [RELAIS, o])
    await p.reload(); await O.pret(p)
    ok(!await connecteIci(p) && await relais(p) === null, `D7) un jeton ${quoi} laissé dans l'onglet n'est pas repris, et il est effacé`)
  }
  // Retour à A par la bibliothèque, reconnecté d'un clic : la connexion suit encore
  await O.gisPret(p)
  await O.seConnecter(p)
  await aller(p, idA)
  ok(await connecteIci(p) && (await O.etat(p)).drive?.etat === 'ok', 'D8) reconnecté dans B, retour à A par la bibliothèque : toujours connecté')
  info('erreurs', O.erreurs)
  await ctx.close()
}

// =====================================================================
// K. La clé et le Drive ensemble : A → B → A
// =====================================================================
if (seul('K')) {
  console.log('\n=== K. La clé et le Drive, d\'un classeur à l\'autre ===')
  const g = new O.FauxGoogle()
  const ctx = await O.contexte(g)
  const p = await O.ouvrir(ctx, '', 'K')
  const idA = await p.evaluate(() => window.__app.classeur.id)
  await O.gisPret(p)
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="activer-cle"]')
  await p.waitForFunction(() => window.__cle?.etat?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  await p.waitForTimeout(800)
  await O.seConnecter(p)
  await O.ecrire(p, 250, 200)
  await p.waitForTimeout(1500)
  await p.clock.fastForward(2 * MIN + 5000)
  await p.waitForFunction(() => window.__drive.etat.t !== undefined && window.__cle?.etat?.etat === 'ok', null, { timeout: 15000 }).catch(() => {})
  let e = await O.etat(p)
  ok(g.sauvegardes().length === 1 && e.drive.etat === 'ok' && (await p.evaluate(() => window.__cle.etat.etat)) === 'ok', `K1) A : sur la clé et sur le Drive (« ${e.court} »)`, e)
  const gisAvant = g.gis.length
  const idB = await nouveauClasseur(p, 'Fractions')
  await aller(p, idB)
  await p.clock.fastForward(10 * MIN); await p.waitForTimeout(1500)
  await aller(p, idA)
  e = await O.etat(p)
  ok(e.drive?.etat === 'ok' && await connecteIci(p), 'K2) retour à A dix minutes plus tard : toujours connecté', e.drive)
  const avant = envois(g)
  // Un cours dans A : des traits pendant 15 minutes (le temps de travailler entre deux sauts)
  for (let i = 0; i < 5; i++) {
    await O.ecrire(p, 250, 240 + 30 * i)
    await p.waitForTimeout(1500)
    await p.clock.fastForward(3 * MIN); await p.waitForTimeout(2500)
  }
  await p.clock.fastForward(3 * MIN); await p.waitForTimeout(2500)
  e = await O.etat(p)
  const cle = await p.evaluate(() => window.__cle?.etat)
  info('A, 18 min après le retour', { court: e.court, drive: e.drive, cle })
  ok(cle?.etat === 'ok', 'K3) A : la clé s\'écrit toujours', cle)
  ok(envois(g) > avant, `K4) A : la copie sur le Drive part pendant le cours (${envois(g) - avant} envoi), sans un clic`, e.drive)
  ok(g.gis.length === gisAvant && !e.bandeau, '   … sans fenêtre Google, sans bandeau', { gis: g.gis.length - gisAvant, bandeau: e.bandeau })
  ok(e.drive?.etat === 'ok' && e.drive.t !== undefined, `   … la ligne du Drive dit l'heure de la dernière copie (« ${e.ligne?.texte} »)`, e.drive)
  await ctx.close()
}

// =====================================================================
// P. La carte du classeur ouvert, dans la bibliothèque
// =====================================================================
if (seul('P')) {
  console.log('\n=== P. La carte du classeur ouvert : son nombre de pages, sa date ===')
  const g = new O.FauxGoogle()
  const ctx = await O.contexte(g)
  const p = await O.ouvrir(ctx, '', 'P')
  await p.waitForTimeout(1000)
  const lire = () => p.evaluate(async () => {
    const id = window.__app.classeur.id, n = t => (t || '').replace(/[  ]/g, ' ')
    const cartes = [...document.querySelectorAll(`.grille-classeurs .case-classeur[data-id="${id}"] .carte-date`)].map(x => n(x.textContent))
    const f = await window.__registre.classeur(id)
    return { cartes, fiche: f.pages, modifie: f.modifie, pages: window.__app.pages.length }
  })
  /** « Modifié aujourd'hui à 6 h 25 · 3 pages » : l'heure, et le nombre de pages */
  const heure = t => { const d = new Date(t); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}` }
  // Trois pages de plus, une jetée, puis la bibliothèque 2 s après
  await p.evaluate(() => { const a = window.__app; a.nouvellePage(); a.nouvellePage(); a.nouvellePage() })
  await p.waitForTimeout(500)
  await p.click('.barre-haut button[aria-label="Supprimer cette page"]')
  const dernier = await p.evaluate(() => Date.now())
  await p.waitForTimeout(2000)
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque())
  await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
  await p.waitForTimeout(800)
  let c = await lire()
  info('2 s après', c)
  ok(c.pages === 3 && c.cartes.length === 2 && c.cartes.every(t => t.endsWith('· 3 pages')), `P1) trois pages de plus, une jetée, la bibliothèque ouverte 2 s après : les cartes (Récents et la grille) disent « ${c.cartes[0]} »`, c)
  ok(c.modifie >= dernier - 50 && c.cartes.every(t => t.includes(`aujourd'hui à ${heure(c.modifie)}`)), '   … et la date du dernier changement', { c, dernier })
  // La bibliothèque reste ouverte ; le classeur change (deux pages de plus) ;
  // le suivi écrit la fiche au plus 30 s après : la carte suit
  await p.evaluate(() => { window.__app.nouvellePage(); window.__app.nouvellePage() })
  await p.waitForTimeout(500)
  await p.clock.fastForward(31_000); await p.waitForTimeout(1500)
  c = await lire()
  info('40 s après, bibliothèque restée ouverte', c)
  ok(c.fiche === 5 && c.pages === 5 && c.cartes.length === 2 && c.cartes.every(t => t.endsWith('· 5 pages')), `P2) la bibliothèque restée ouverte, le suivi a écrit la fiche : les cartes disent « ${c.cartes[0]} »`, c)
  ok(await p.evaluate(() => window.__bibliotheque.ouvert), '   … sans fermer la bibliothèque')
  info('erreurs', O.erreurs)
  await ctx.close()
}

// =====================================================================
// T. Les textes
// =====================================================================
if (seul('T')) {
  console.log('\n=== T. Les textes : le classeur, et le raccourci du système ===')
  {
    const g = new O.FauxGoogle()
    const ctx = await O.contexte(g)
    const p = await O.ouvrir(ctx, '', 'T', false)
    await p.evaluate(() => {
      const a = window.__app, t = a.tableau
      for (let k = 0; k < 3; k++) {
        if (k) a.nouvellePage()
        t.nouveauGeste()
        const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 12, Math.sin(i / 3 + k) * 50, 0.5)
        t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
      }
    })
    await p.waitForTimeout(700)
    await p.click('.barre-haut button[aria-label="Supprimer cette page"]'); await p.waitForTimeout(900)
    await p.click('.barre-haut button[aria-label="Supprimer cette page"]'); await p.waitForTimeout(900)
    ok(await p.evaluate(() => window.__app.pages.length) === 1, '   (deux pages jetées)', await p.evaluate(() => window.__app.pages.length))
    await p.keyboard.press('Shift+P'); await p.waitForTimeout(400)
    await p.click('.trieuse-bouton-corbeille'); await p.waitForTimeout(300)
    await p.click('.trieuse-corbeille .carte-corbeille .corbeille-supprimer'); await p.waitForTimeout(250)
    const une = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && { titre: d.querySelector('h2')?.textContent, texte: d.querySelector('p')?.textContent } })
    ok(une?.titre === 'Supprimer définitivement cette page ?' && une.texte === 'Elle ne pourra plus être remise parmi les pages. Son histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).',
      'T1) corbeille des pages, « Supprimer définitivement » : « … (le classeur garde tout ce qui a été écrit). »', une)
    await p.keyboard.press('Escape'); await p.waitForTimeout(150)
    await p.click('.corbeille-vider'); await p.waitForTimeout(200)
    const vider = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && d.querySelector('p')?.textContent })
    ok(vider === 'Les 2 pages de la corbeille seront supprimées définitivement : elles ne pourront plus être remises parmi les pages. Leur histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).',
      '   … « Vider la corbeille » aussi', vider)
    const une2 = await p.evaluate(async () => (await import('/src/pages/corbeille.ts')).texteVider(1))
    ok(/\(le classeur garde tout ce qui a été écrit\)\.$/.test(une2) && !/tableau/.test(une2), '   … et pour une seule page', une2)
    await ctx.close()
  }
  /** Les textes de l'état, et les messages, tels que cette page les fabrique */
  const textes = p => p.evaluate(async () => {
    const n = t => (t || '').replace(/[  ]/g, ' ')
    const [surv, cle, etat, drive] = await Promise.all([import('/src/classeurs/surveillance.ts'), import('/src/classeurs/cle.ts'), import('/src/classeurs/etat.ts'), import('/src/classeurs/drive-pur.ts')])
    return {
      plateforme: navigator.platform, fin: matchMedia('(any-pointer: fine)').matches, doigt: matchMedia('(any-pointer: coarse)').matches,
      cle: n((window.__surveillance.texte.lignes.find(l => l.quoi === 'cle') ?? {}).texte),
      quitter: surv.MESSAGE_QUITTER, plusRiche: cle.PLUS_RICHE, fil: cle.MESSAGE_FIL, incomplet: etat.TEXTE_INCOMPLET,
      drive: drive.raisonDrive({ name: 'ErreurEcrivain', raison: 'abimee' }, true).message,
    }
  })
  /** Safari : ni showSaveFilePicker, ni showOpenFilePicker ; la plateforme, et (pour l'iPad) les pointeurs */
  const safari = (plateforme, doigtSeul) => [`(() => {
    Object.defineProperty(Navigator.prototype, 'platform', { get: () => ${JSON.stringify(plateforme)}, configurable: true })
    delete window.showSaveFilePicker; delete window.showOpenFilePicker
    if (${doigtSeul}) {
      const avant = window.matchMedia.bind(window)
      window.matchMedia = q => /any-pointer: *fine/.test(q) ? { ...avant(q), matches: false, media: q } : /any-pointer: *coarse/.test(q) ? { ...avant(q), matches: true, media: q } : avant(q)
    }
  })()`]
  // Safari sur Mac
  {
    const g = new O.FauxGoogle()
    const ctx = await O.contexte(g, { scripts: safari('MacIntel', false) })
    const p = await O.ouvrir(ctx, '', 'Mac', false)
    const m = await O.menu(p)
    const t = await textes(p)
    info('Mac', { t, enregistrer: m.libelles.enregistrer })
    ok(t.cle === 'Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (⌘ + S) de temps en temps.', `T2) Safari sur Mac : la ligne de la clé dit ⌘ + S (« ${t.cle} »)`, t)
    const menuTouche = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item[data-action="enregistrer"]')].map(e => e.textContent.replace(/[  ]/g, ' '))[0] ?? '')
    ok(menuTouche.includes('⌘ + S'), `   … comme le menu ⋯ (« ${menuTouche} »)`)
    ok(Object.entries(t).filter(([k]) => !['plateforme', 'fin', 'doigt'].includes(k)).every(([, v]) => !/Ctrl/.test(v)) && /\(⌘ \+ S\)/.test(t.quitter) && /\(⌘ \+ O\)/.test(t.plusRiche) && /\(⌘ \+ O\)/.test(t.incomplet) && /\(⌘ \+ S\)/.test(t.drive) && /\(⌘ \+ S\)/.test(t.fil),
      '   … et tous les textes du lot 4 qui donnent un raccourci (⌘ + S, ⌘ + O ; jamais Ctrl)', t)
    await O.fermerMenu(p)
    await ctx.close()
  }
  // L'iPad au doigt (sans clavier ni pavé)
  {
    const g = new O.FauxGoogle()
    const ctx = await O.contexte(g, { ctx: { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: false }, scripts: safari('MacIntel', true) })
    const p = await O.ouvrir(ctx, '', 'iPad', false)
    const t = await textes(p)
    info('iPad', t)
    ok(t.cle === 'Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (menu ⋯ → Enregistrer le classeur) de temps en temps.', `T3) l'iPad au doigt : la ligne de la clé nomme l'entrée du menu (« ${t.cle} »)`, t)
    ok(/ouvrez-le \(menu ⋯ → Ouvrir un classeur\)\.$/.test(t.incomplet) && /\(menu ⋯ → Enregistrer le classeur\)\.$/.test(t.quitter), '   … les autres textes aussi', t)
    // L'entrée nommée existe bien dans le menu ⋯
    await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
    const entrees = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item .libelle')].map(e => (e.firstChild?.textContent ?? '').replace(/[  ]/g, ' ').trim()))
    ok(entrees.some(x => /^Enregistrer le classeur/.test(x)) && entrees.some(x => /^Ouvrir un classeur/.test(x)), '   … et le menu ⋯ a bien ces deux entrées', entrees)
    await O.fermerMenu(p)
    await ctx.close()
  }
  // Le PC : comme avant
  {
    const g = new O.FauxGoogle()
    const ctx = await O.contexte(g, { scripts: [`(() => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'Win32', configurable: true }); delete window.showSaveFilePicker })()`] })
    const p = await O.ouvrir(ctx, '', 'PC', false)
    const t = await textes(p)
    ok(t.cle === 'Ce navigateur ne sait pas enregistrer tout seul dans un fichier : enregistrez le classeur (Ctrl + S) de temps en temps.' && t.quitter.endsWith('(Ctrl + S).'), 'T4) le PC (Firefox imité) : Ctrl + S, comme avant', t)
    await ctx.close()
  }
}

const js = O.erreurs.filter(x => !/favicon/.test(x))
ok(js.length === 0, `aucune erreur JS (${js.length})`, js)
await O.navigateur.close()
console.log(O.echecs ? `\n${O.echecs} ÉCHEC(S)` : '\nTout est bon.')
process.exit(O.echecs ? 1 : 0)
