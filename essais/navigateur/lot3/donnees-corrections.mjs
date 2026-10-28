// Essais au navigateur des corrections « données » du lot 3 (les vraies
// touches Ctrl+Z et Ctrl+Y, la poubelle, la trieuse, la fenêtre Publier) :
// 1. envoi aller-retour (1 → 2 → 1) et en chaîne (1 → 2 → 3), objet effacé
//    sur la page d'arrivée : Ctrl+Z sur la page 1 ne défait pas encore
//    l'envoi (rien ne change, un message dit d'y défaire cela d'abord, avec
//    « Aller à la page 2 ») ; dans le bon ordre, un seul objet au bout ;
// 2. une copie de page, un fond changé ou une page insérée dans la trieuse,
//    deux heures après le cours : Publier choisit le cours (5 gestes), ne
//    propose que la page 1, et son film a 5 gestes ; la revue compte pareil ;
//    les mêmes entre deux cours (14 min après le premier, 15 min avant le
//    second) : deux séances de 5 gestes (contrôle final du lot 3) ;
// 3. Ctrl+Y d'un envoi dont la page d'arrivée est supprimée définitivement
//    (poubelle, puis « Vider la corbeille ») : rien ne part, le message le
//    dit, et après un rechargement l'objet est toujours sur la page 1 ;
// 4. noms des points : un triangle ABC effacé sur la page 1, un ABC déplacé
//    de la page 3 vers la 1 y devient DEF, et Ctrl+Z sur la page 1 ne fait
//    pas deux ABC ; un aller-retour garde ABC.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
// node donnees-corrections.mjs [section…] (envoi, seance, definitif, noms)
import { chromium } from '../commun/playwright.mjs'
import { readFileSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
const nav = await chromium.launch()
const net = t => (t ?? '').replace(/[  ]/g, ' ')

async function pret(page) {
  for (let k = 0; k < 2; k++) {
    await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await page.waitForTimeout(350)
  }
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
}
async function ouvrir(nom, o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  await page.goto(URL0)
  await pret(page)
  return { ctx, page }
}
/** n pages, un trait « x » en (300, 300) sur la première ; outil Sélection, sur la page 1 */
const preparer = (page, n) => page.evaluate(n => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste()
  t.poser(a.page, { id: 'x', type: 'trait', x: 300, y: 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 30, 0.5, 140, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false })
  for (let k = 1; k < n; k++) a.nouvellePage()
  a.allerPage(a.pages[0])
  a.choisirOutil('selection')
}, n)
const ETAT = () => {
  const a = window.__app, t = a.tableau
  return {
    page: a.pages.indexOf(a.page) + 1,
    parPage: a.pages.map(p => [...(t.formesDe(p)?.values() ?? [])].filter(f => f.type === 'trait').map(f => `${f.id}@${f.x},${f.y}`)),
    msg: (window.__msgs || []).at(-1) ?? '',
  }
}
const total = e => e.parPage.flat().length
/** Tout ce qui est sur la page qu'on regarde, pris, déplacé vers la page n */
const envoyer = (page, n) => page.evaluate(n => {
  const a = window.__app
  a.selection.clear(); for (const f of a.formes) a.selection.add(f.id)
  return a.envoyerSelection(a.pages[n - 1], true)
}, n)
const aller = async (page, n) => { await page.evaluate(n => window.__app.allerPage(window.__app.pages[n - 1]), n); await page.waitForTimeout(700) }
const touche = async (page, k) => { await page.keyboard.press(k); await page.waitForTimeout(500) }
const boutonsDuMessage = page => page.evaluate(() => [...document.querySelectorAll('.toast .ligne button.action')].map(b => b.textContent))

// ---------- 1. envoi : aller-retour, chaîne, effacé ----------
if (faire('envoi')) {
  {
    const { ctx, page } = await ouvrir('aller-retour')
    await preparer(page, 2); await page.waitForTimeout(400)
    await envoyer(page, 2); await page.waitForTimeout(400)
    await aller(page, 2)
    await envoyer(page, 1); await page.waitForTimeout(400)
    await aller(page, 1)
    await page.mouse.click(900, 600)
    const avant = await page.evaluate(ETAT)
    await touche(page, 'Control+z')
    const e1 = await page.evaluate(ETAT)
    verifier('aller-retour, Ctrl+Z sur la page 1 : rien ne change (un seul objet, pas deux superposés)', JSON.stringify(e1.parPage) === JSON.stringify(avant.parPage) && total(e1) === 1, e1)
    verifier('… le message dit d\'y défaire cela d\'abord sur la page 2', net(e1.msg) === 'Cet envoi ne s\'annule pas encore : sur la page 2, l\'objet a depuis été effacé ou renvoyé ailleurs. Annulez d\'abord cela sur la page 2 (↶).', e1.msg)
    const boutons = await boutonsDuMessage(page)
    verifier('… avec « Aller à la page 2 »', boutons.includes('Aller à la page 2'), boutons)
    await page.click('.toast .ligne button.action'); await page.waitForTimeout(700)
    verifier('« Aller à la page 2 » y mène', (await page.evaluate(ETAT)).page === 2)
    await page.mouse.click(900, 600)
    await touche(page, 'Control+z')
    const e2 = await page.evaluate(ETAT)
    verifier('Ctrl+Z sur la page 2 : le retour se défait (l\'objet y revient, quitte la page 1)', JSON.stringify(e2.parPage.map(l => l.length)) === '[0,1]' && net(e2.msg) === 'Envoi annulé : l\'objet est revenu de la page 1', e2)
    await aller(page, 1)
    await page.mouse.click(900, 600)
    await touche(page, 'Control+z')
    const e3 = await page.evaluate(ETAT)
    verifier('puis Ctrl+Z sur la page 1 : l\'aller se défait, un seul objet, à sa place', JSON.stringify(e3.parPage) === '[["x@300,300"],[]]' && net(e3.msg) === 'Envoi annulé : l\'objet est revenu de la page 2', e3)
    await ctx.close()
  }
  {
    const { ctx, page } = await ouvrir('chaine')
    await preparer(page, 3); await page.waitForTimeout(400)
    await envoyer(page, 2); await page.waitForTimeout(400)
    await aller(page, 2)
    await envoyer(page, 3); await page.waitForTimeout(400)
    await aller(page, 1)
    await page.mouse.click(900, 600)
    await touche(page, 'Control+z')
    const e1 = await page.evaluate(ETAT)
    verifier('chaîne 1 → 2 → 3, Ctrl+Z sur la page 1 : l\'objet reste sur la page 3 seulement', JSON.stringify(e1.parPage.map(l => l.length)) === '[0,0,1]' && /^Cet envoi ne s'annule pas encore : sur la page 2/.test(net(e1.msg)), e1)
    await aller(page, 2); await page.mouse.click(900, 600); await touche(page, 'Control+z')
    await aller(page, 1); await page.mouse.click(900, 600); await touche(page, 'Control+z')
    const e2 = await page.evaluate(ETAT)
    verifier('Ctrl+Z sur la page 2, puis sur la page 1 : l\'objet est revenu sur la page 1, seul', JSON.stringify(e2.parPage) === '[["x@300,300"],[],[]]', e2)
    await ctx.close()
  }
  {
    const { ctx, page } = await ouvrir('efface')
    await preparer(page, 2); await page.waitForTimeout(400)
    await envoyer(page, 2); await page.waitForTimeout(400)
    await aller(page, 2)
    await page.evaluate(() => { const a = window.__app; a.selection.clear(); for (const f of a.formes) a.selection.add(f.id) })
    await page.mouse.move(900, 600)
    await touche(page, 'Delete')
    await aller(page, 1)
    await page.mouse.click(900, 600)
    await touche(page, 'Control+z')
    const e1 = await page.evaluate(ETAT)
    verifier('effacé sur la page 2, Ctrl+Z sur la page 1 : rien ne revient encore (Ctrl+Z sur la page 2 le referait paraître en double)', total(e1) === 0 && /^Cet envoi ne s'annule pas encore/.test(net(e1.msg)), e1)
    await aller(page, 2); await page.mouse.click(900, 600); await touche(page, 'Control+z')
    await aller(page, 1); await page.mouse.click(900, 600); await touche(page, 'Control+z')
    const e2 = await page.evaluate(ETAT)
    verifier('Ctrl+Z sur la page 2 (l\'effacement), puis sur la page 1 : un seul objet, sur la page 1', JSON.stringify(e2.parPage) === '[["x@300,300"],[]]', e2)
    await ctx.close()
  }
}

// ---------- 2. une copie de page après le cours : Publier et la revue ----------
if (faire('seance')) {
  /** Ferme la trieuse (Échap ferme d'abord un menu, la sélection, puis elle) */
  const fermerTrieuse = async page => {
    for (let k = 0; k < 4 && await page.evaluate(() => document.body.classList.contains('en-trieuse')); k++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  }
  for (const [nom, organiser, nPages] of [
    ['Dupliquer la page (Ctrl + Maj + D)', async page => { await page.mouse.move(700, 500); await page.keyboard.press('Control+Shift+D') }, 2],
    ['Trieuse : Ctrl + D', async page => {
      await page.keyboard.press('Shift+P'); await page.waitForTimeout(600)
      await page.keyboard.press('Control+d'); await page.waitForTimeout(400)
      await fermerTrieuse(page)
    }, 2],
    ['Trieuse : Fond d\'une vignette (Seyès)', async page => {
      await page.keyboard.press('Shift+P'); await page.waitForTimeout(600)
      await page.keyboard.press('ContextMenu'); await page.waitForTimeout(300)
      await page.getByRole('menuitemradio', { name: /Seyès/ }).click(); await page.waitForTimeout(300)
      await fermerTrieuse(page)
    }, 1],
    ['Trieuse : Insérer une page après (Seyès)', async page => {
      await page.keyboard.press('Shift+P'); await page.waitForTimeout(600)
      await page.keyboard.press('ContextMenu'); await page.waitForTimeout(300)
      await page.getByRole('menuitem', { name: /Insérer une page après/ }).click(); await page.waitForTimeout(700)
      await page.getByRole('menuitemradio', { name: /Seyès/ }).click(); await page.waitForTimeout(300)
      await fermerTrieuse(page)
    }, 2],
  ]) for (const entre of [false, true]) {
    const { ctx, page } = await ouvrir('seance', { acceptDownloads: true })
    // (Adapté au lot 6 : ces essais vérifient le découpage des séances
    // devinées dans le film ; il ne sert plus qu'aux classeurs d'avant le lot 6,
    // sans séances : on en fait un)
    await page.evaluate(() => { const t = window.__app.tableau; t.doc.transact(() => { t.seances.clear(); t.seanceDesPages.clear() }); t.seancesActives = false; window.__app.ui.maj() })
    await page.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
    const avancer = ms => page.evaluate(ms => { window.__dec += ms }, ms)
    const poser = id => page.evaluate(id => {
      const a = window.__app, t = a.tableau
      t.nouveauGeste()
      t.poser(a.page, { id, type: 'trait', x: 100 + Math.random() * 400, y: 100 + Math.random() * 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 14, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
    }, id)
    await avancer(30 * 60_000)
    for (let i = 0; i < 5; i++) { await avancer(4000); await poser('c' + i); await page.waitForTimeout(40) }
    await avancer(entre ? 14 * 60_000 : 2 * 3600_000)
    await organiser(page)
    await page.waitForTimeout(300)
    const pages = await page.evaluate(() => window.__app.pages.length)
    const fond = await page.evaluate(() => window.__app.pages.map(p => window.__app.tableau.fondDe(p)))
    verifier(`${nom} : c'est fait`, pages === nPages && (nPages === 2 || fond[0] === 'seyes'), { pages, fond })
    if (entre) {
      // Le second cours, sur la page 1, un quart d'heure plus tard
      await page.evaluate(() => window.__app.allerPage(window.__app.pages[0])); await page.waitForTimeout(200)
      await avancer(15 * 60_000)
      for (let i = 0; i < 5; i++) { await avancer(4000); await poser('d' + i); await page.waitForTimeout(40) }
      await page.waitForTimeout(200)
      await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]'); await page.check('input[name="p-lieu"][value="google"]', { timeout: 2000 }).catch(() => {})
      const d = await page.evaluate(() => [...document.querySelector('.dialogue-publier[open] .p-seance').options].map(o => o.textContent))
      verifier(`${nom}, entre deux cours : Publier propose deux séances de 5 gestes (pas une de 11)`, d.length === 2 && d.every(o => /· 5 gestes/.test(net(o))), d.map(net))
      await page.focus('.p-titre'); await page.keyboard.press('Escape'); await page.waitForTimeout(200)
      await ctx.close()
      continue
    }
    await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]'); await page.check('input[name="p-lieu"][value="google"]', { timeout: 2000 }).catch(() => {})
    const d = await page.evaluate(() => {
      const s = document.querySelector('.dialogue-publier[open] .p-seance')
      return { choisie: s.options[s.selectedIndex].textContent, n: [...s.options].filter(o => /geste/.test(o.textContent)).length, pages: [...document.querySelectorAll('.p-pages input')].map(i => i.parentElement.textContent.trim() + (i.checked ? ' (cochée)' : '')) }
    })
    verifier(`${nom} : Publier choisit d'office le cours (5 gestes), pas le rangement`, /· 5 gestes/.test(net(d.choisie)) && d.n === 1, d)
    verifier(`${nom} : … et ne propose que la page 1`, JSON.stringify(d.pages) === '["Page 1 (cochée)"]', d.pages)
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.p-fichier')])
    const texte = readFileSync(await dl.path(), 'utf8')
    const film = await page.evaluate(async t => { const fm = await import('/src/revoir/format.ts'); const f = await fm.lireFilm(t); return { etapes: f.etapes.length, pages: f.pages.length } }, texte)
    verifier(`${nom} : le film élève a les 5 gestes du cours`, film.etapes === 5 && film.pages === 1, film)
    await page.focus('.p-titre'); await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(300)
    await page.getByRole('button', { name: /^Que revoir/ }).click(); await page.waitForTimeout(200)
    const tiroir = await page.evaluate(() => [...document.querySelectorAll('.revue-tiroir .revue-section')].filter(s => s.querySelector('h3')?.textContent === 'Séances').flatMap(s => [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' '))))
    verifier(`${nom} : la revue compte pareil (une séance, 5 gestes)`, tiroir.length === 1 && /5 gestes/.test(tiroir[0]), tiroir)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await ctx.close()
  }
}

// ---------- 3. Ctrl+Y vers une page supprimée définitivement ----------
if (faire('definitif')) {
  const { ctx, page } = await ouvrir('definitif')
  await preparer(page, 2); await page.waitForTimeout(400)
  await envoyer(page, 2); await page.waitForTimeout(400)
  await aller(page, 2)
  await page.click('.barre-haut button[aria-label="Supprimer cette page"]'); await page.waitForTimeout(400)
  await page.keyboard.press('Shift+P'); await page.waitForTimeout(500)
  await page.click('.trieuse-bouton-corbeille'); await page.waitForTimeout(400)
  await page.click('.corbeille-vider'); await page.waitForTimeout(200)
  await page.click('dialog.dialogue-corbeille[open] [data-a="oui"]'); await page.waitForTimeout(300)
  await page.keyboard.press('Escape'); await page.waitForTimeout(200)
  if (await page.evaluate(() => document.body.classList.contains('en-trieuse'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  const ou = () => page.evaluate(() => {
    const a = window.__app, t = a.tableau
    return [...t.pages.keys()].filter(p => [...t.formesDe(p)?.values() ?? []].some(f => f.x === 300 && f.y === 300)).map(p => a.pages.includes(p) ? 'page ' + (a.pages.indexOf(p) + 1) : (t.corbeille.get(p)?.definitif ? 'définitive' : 'ailleurs'))
  })
  verifier('la page 2 est supprimée définitivement, avec l\'objet', JSON.stringify(await ou()) === '["définitive"]', await ou())
  await page.mouse.click(900, 600)
  await touche(page, 'Control+z')
  const e1 = await page.evaluate(ETAT)
  verifier('Ctrl+Z sur la page 1 : l\'objet revient', JSON.stringify(await ou()) === '["page 1"]' && /^Envoi annulé : l'objet est revenu d'une page supprimée/.test(net(e1.msg)), { ou: await ou(), msg: e1.msg })
  await touche(page, 'Control+y')
  const e2 = await page.evaluate(ETAT)
  verifier('Ctrl+Y : rien ne part vers la page supprimée définitivement, et le message le dit', JSON.stringify(await ou()) === '["page 1"]' && net(e2.msg) === 'La page d\'arrivée a été supprimée définitivement : l\'envoi n\'est pas refait.', { ou: await ou(), msg: e2.msg })
  await page.waitForTimeout(1200)
  await page.reload(); await pret(page)
  verifier('après un rechargement, l\'objet est toujours sur la page 1', JSON.stringify(await ou()) === '["page 1"]', await ou())
  await ctx.close()
}

// ---------- 4. noms des points ----------
if (faire('noms')) {
  const triangle = (page, id, x) => page.evaluate(([id, x]) => {
    const a = window.__app, t = a.tableau
    t.nouveauGeste()
    t.poser(a.page, { id, type: 'polygone', x, y: 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 120, 0, 0, 90], ferme: true, couleur: '#1f5fbf', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'] })
  }, [id, x])
  const noms = (page, n) => page.evaluate(n => [...window.__app.tableau.formesDe(window.__app.pages[n - 1]).values()].filter(f => f.type === 'polygone').map(f => f.noms.join('')).sort(), n)
  {
    const { ctx, page } = await ouvrir('noms')
    await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.nouvellePage(); a.allerPage(a.pages[0]); a.choisirOutil('selection') })
    await page.waitForTimeout(400)
    await triangle(page, 't1', 200)
    await page.waitForTimeout(300)
    await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.selection.add('t1') })
    await page.mouse.move(900, 600)
    await touche(page, 'Delete')
    await aller(page, 3)
    await triangle(page, 't3', 500)
    await page.waitForTimeout(300)
    await envoyer(page, 1); await page.waitForTimeout(400)
    verifier('un ABC déplacé vers la page 1, où un ABC effacé peut revenir par Ctrl+Z : il y devient DEF', JSON.stringify(await noms(page, 1)) === '["DEF"]', await noms(page, 1))
    await aller(page, 1)
    await page.mouse.click(900, 600)
    await touche(page, 'Control+z')
    verifier('Ctrl+Z sur la page 1 : ABC et DEF, pas deux ABC', JSON.stringify(await noms(page, 1)) === '["ABC","DEF"]', await noms(page, 1))
    await ctx.close()
  }
  {
    const { ctx, page } = await ouvrir('noms-aller-retour')
    await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.allerPage(a.pages[0]); a.choisirOutil('selection') })
    await page.waitForTimeout(400)
    await triangle(page, 't1', 200)
    await page.waitForTimeout(300)
    await envoyer(page, 2); await page.waitForTimeout(400)
    await aller(page, 2)
    await envoyer(page, 1); await page.waitForTimeout(400)
    verifier('un ABC envoyé vers la page 2 puis renvoyé sur la page 1 y reste ABC', JSON.stringify(await noms(page, 1)) === '["ABC"]', await noms(page, 1))
    await ctx.close()
  }
}

await nav.close()
const echecs = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - echecs}/${resultats.length} vérifications`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs || erreurs.length ? 1 : 0)
