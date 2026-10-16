// Les défauts trouvés par la relecture, vérifiés un par un dans le navigateur
import { chromium } from './commun/playwright.mjs'
const S = process.argv[2], BASE = process.argv[3] || 'http://localhost:5173'
const b = await chromium.launch()
const erreurs = []
const ok = (nom, v, detail = '') => console.log((v ? '✓ ' : '✗ ') + nom + (detail ? ' — ' + detail : ''))

// ---- Un film à trois chapitres dont un d'une seule image ----
const prof = await (await b.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true })).newPage()
prof.on('pageerror', e => erreurs.push('prof: ' + e.message))
await prof.goto(BASE + '/'); await prof.waitForSelector('.rang'); await prof.waitForTimeout(300)
const texte = await prof.evaluate(async () => {
  const a = window.__app, t = a.tableau, attendre = ms => new Promise(r => setTimeout(r, ms))
  const trait = (x, y) => { const pts = []; for (let i = 0; i < 25; i++) pts.push(i * 6, Math.sin(i / 3) * 30, 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false } }
  const p1 = a.page
  const p2 = t.ajouterPage('blanc', 1); await attendre(50)                          // page 2 créée avant la séance
  const debut = t.film.length
  for (let i = 0; i < 4; i++) { t.poser(p1, trait(100, 80 + i * 60)); await attendre(250) }
  a.allerPage(p2); await attendre(50)                                                // page 2 : un seul geste
  t.poser(p2, trait(50, 50)); await attendre(250)
  a.allerPage(p1); await attendre(50)
  for (let i = 0; i < 3; i++) { t.poser(p1, trait(400, 80 + i * 60)); await attendre(250) }
  const ex = await import('/src/revoir/exporter.ts'), fm = await import('/src/revoir/format.ts')
  return fm.ecrireFilm(ex.exporter(t, { de: debut, a: t.film.length - 1, pages: [p1, p2], titre: 'Trois chapitres' }))
})
const fs = await import('fs'); fs.writeFileSync(S + '/seance-chapitres.mem', texte)

const ouvrirLecteur = async (init) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const e = await ctx.newPage()
  e.on('pageerror', x => erreurs.push('élève: ' + x.message))
  if (init) await e.addInitScript(init)
  await e.goto(BASE + '/revoir.html'); await e.waitForSelector('.carte input[type=file]', { state: 'attached' })
  await e.setInputFiles('.carte input[type=file]', S + '/seance-chapitres.mem'); await e.waitForSelector('.carte h1')
  return e
}
const etat = e => e.evaluate(() => ({ k: window.__revoir.k, n: window.__revoir.bobine.n, marche: window.__revoir.enMarche, chapitres: window.__revoir.bobine.chapitres.map(c => c.i), carte: document.querySelector('.carte').hidden ? null : document.querySelector('.carte h2, .carte h1')?.textContent }))

let e = await ouvrirLecteur()
const st0 = await etat(e)
console.log('chapitres (images de début) :', st0.chapitres.join(', '), '| n =', st0.n)
// #1 la frise
await e.click('.carte [data-a=voir]')
await e.$eval('.curseur', (c, v) => { c.value = v; c.dispatchEvent(new Event('input', { bubbles: true })) }, '2')
ok('la frise déplace la lecture', (await etat(e)).k === 2, 'k = ' + (await etat(e)).k)
// #10 cliquer Pause pendant la lecture
await e.$eval('.curseur', c => { c.value = '0'; c.dispatchEvent(new Event('input', { bubbles: true })) })
await e.click('.b-lire'); await e.waitForTimeout(300)
const enLecture = (await etat(e)).marche
await e.click('.b-lire'); await e.waitForTimeout(100)
ok('Pause à la souris pendant la lecture', enLecture && !(await etat(e)).marche)
// #24 Espace après un clic souris : lit, ne reclique pas
await e.keyboard.press(' '); await e.waitForTimeout(150)
ok('Espace après un clic lit (au lieu de recliquer le bouton)', (await etat(e)).marche)
await e.keyboard.press(' ')
// #8 chapitre d'une seule image : la lecture s'y arrête
await e.$eval('.curseur', (c, v) => { c.value = v; c.dispatchEvent(new Event('input', { bubbles: true })) }, String(st0.chapitres[1] - 1))
await e.click('.b-lire')
await e.waitForFunction(() => !document.querySelector('.carte').hidden, null, { timeout: 8000 })
const s1 = await etat(e)
const s2 = s1
ok('arrêt à la fin du chapitre d\'une seule image', st0.chapitres[2] - st0.chapitres[1] === 1 && s1.k === st0.chapitres[2] - 1, `chapitres ${st0.chapitres} ; arrêts en k=${s1.k} puis k=${s2.k}`)
// #7 « Revoir le chapitre précédent » : les arrêts reviennent
await e.click('.carte [data-a=revoir]')
await e.waitForFunction(() => !document.querySelector('.carte').hidden, null, { timeout: 8000 })
ok('après « Revoir », la lecture s\'arrête encore en fin de chapitre', (await etat(e)).k === st0.chapitres[2] - 1, 'k = ' + (await etat(e)).k)
// #19 chapitre suivant dans le dernier chapitre
await e.click('.carte [data-a=continuer]'); await e.waitForTimeout(100); await e.keyboard.press(' ')
await e.$eval('.curseur', (c, v) => { c.value = v; c.dispatchEvent(new Event('input', { bubbles: true })) }, String(st0.chapitres[2] + 1))
await e.setViewportSize({ width: 800, height: 844 }); await e.waitForTimeout(100)
await e.click('.b-chap-apres'); await e.waitForTimeout(100)
ok('« Chapitre suivant » dans le dernier chapitre va à la fin', (await etat(e)).k === st0.n - 1, 'k = ' + (await etat(e)).k)
// #28 accessibilité
const a11y = await e.evaluate(() => ({ valeur: document.querySelector('.curseur').getAttribute('aria-valuetext'), nom: (document.querySelector('.carte').hidden ? 'cachée' : document.querySelector('.carte').getAttribute('aria-labelledby')) }))
ok('la frise dit le temps', /sur/.test(a11y.valeur || ''), a11y.valeur)
await e.click('.b-chap-avant'); await e.click('.b-lire'); await e.waitForFunction(() => !document.querySelector('.carte').hidden, null, { timeout: 8000 })
ok('la carte a un nom accessible', await e.evaluate(() => document.querySelector('.carte').getAttribute('aria-labelledby') === 'carte-titre'))
// #23 Alt+← reste au navigateur
await e.evaluate(() => { const c = document.querySelector('.carte'); if (!c.hidden) c.querySelector('[data-a=voir], [data-a=continuer]')?.click() })
await e.keyboard.press(' ').catch(() => {}); await e.evaluate(() => { if (window.__revoir.enMarche) document.querySelector('.b-lire').click() })
await e.$eval('.curseur', c => { c.value = '3'; c.dispatchEvent(new Event('input', { bubbles: true })) })
await e.focus('.b-lire'); await e.keyboard.press('Alt+ArrowLeft'); await e.waitForTimeout(100)
ok('Alt+← ne recule pas d\'un geste', (await etat(e)).k === 3, 'k = ' + (await etat(e)).k)
await e.keyboard.press('ArrowLeft'); await e.waitForTimeout(50)
ok('← seul recule d\'un geste', (await etat(e)).k === 2)

// #9 iPhone ancien : pas de DecompressionStream
const vieux = await ouvrirLecteur(() => { delete window.DecompressionStream })
ok('séance lue sans DecompressionStream (iOS < 16.4)', await vieux.evaluate(() => typeof DecompressionStream === 'undefined' && !!window.__revoir.bobine), 'images : ' + (await etat(vieux)).n)

// #26 mauvais fichier
const ctx2 = await b.newContext(); const m = await ctx2.newPage()
await m.goto(BASE + '/revoir.html'); await m.waitForSelector('.carte input[type=file]', { state: 'attached' })
fs.writeFileSync(S + '/pas-une-seance.mem', '{"autre":1}')
await m.setInputFiles('.carte input[type=file]', S + '/pas-une-seance.mem'); await m.waitForSelector('.carte h2')
await m.click('.carte [data-a=encore]'); await m.waitForSelector('.carte input[type=file]', { state: 'attached' })
ok('mauvais fichier : on peut en choisir un autre', true)

// #33 raccourcis du tableau muets sous la fenêtre ; #0 « Nouvelle page » après la classe d'avant
await prof.evaluate(async () => {
  const a = window.__app, t = a.tableau, attendre = ms => new Promise(r => setTimeout(r, ms))
  t.poser(a.page, { id: 'avant', type: 'formule', x: 50, y: 600, z: Date.now(), auteur: t.moi, latex: '\\text{CLASSE_AVANT}', couleur: '#d0342c', taille: 30 })
  await attendre(50)
  const vrai = Date.now; Date.now = () => vrai() + 50 * 60 * 1000          // 50 minutes plus tard
  // (Adapté au lot 6 : les séances sont explicites ; la classe d'après commence
  // une nouvelle séance, au lieu d'une nouvelle page après un silence)
  a.nouvelleSeance(); await attendre(50)
  t.poser(a.page, { id: 'apres', type: 'formule', x: 50, y: 50, z: Date.now(), auteur: t.moi, latex: 'x+1', couleur: '#1b2230', taille: 30 }); await attendre(50)
})
await prof.click('button[title="Publier le replay pour les élèves"]'); await prof.waitForSelector('.dialogue-publier[open]')
const pages = await prof.$$eval('.p-pages label', l => l.map(x => x.textContent.trim()))
ok('« Nouvelle page » : seule la page neuve est proposée', pages.length === 1, pages.join(', '))
const avantZ = await prof.evaluate(() => window.__app.formes.length)
await prof.focus('.p-titre'); await prof.keyboard.press('Escape').catch(() => {})
await prof.click('button[title="Publier le replay pour les élèves"]'); await prof.waitForSelector('.dialogue-publier[open]')
// (Adapté au lot 6 : plus de découpage à régler ; le choix de la séance a le focus)
await prof.click('.p-titre'); await prof.keyboard.press('Control+z'); await prof.waitForTimeout(100)
ok('Ctrl+Z dans la fenêtre ne défait rien à la page', (await prof.evaluate(() => window.__app.formes.length)) === avantZ)
const [dl] = await Promise.all([prof.waitForEvent('download'), prof.click('.p-fichier')])
const contenu = fs.readFileSync(await dl.path(), 'utf8')
const film = await prof.evaluate(async t => { const fm = await import('/src/revoir/format.ts'); return fm.lireFilm(t) }, contenu)
ok('le fichier ne contient pas la classe d\'avant', !JSON.stringify(film).includes('CLASSE_AVANT'))
// #25 aperçu rechargé
const [ap] = await Promise.all([prof.context().waitForEvent('page'), prof.click('.p-apercu')])
await ap.waitForSelector('.carte h1', { timeout: 8000 })
await ap.reload(); await ap.waitForSelector('.carte h1', { timeout: 8000 })
ok('l\'aperçu rechargé se rouvre', true, await ap.textContent('.carte h1'))
// (ajouté après la relecture) 320 × 568, séance de plusieurs pages et chapitres, allure « Normal » :
// tout tient dans l'écran (bouton Chapitres visible, libellé d'allure le plus large)
{
  const ctx = await b.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true })
  const e = await ctx.newPage()
  e.on('pageerror', x => erreurs.push('élève 320: ' + x.message))
  await e.goto(BASE + '/revoir.html'); await e.waitForSelector('.carte input[type=file]', { state: 'attached' })
  await e.setInputFiles('.carte input[type=file]', S + '/seance-chapitres.mem'); await e.waitForSelector('.carte h1')
  await e.click('.carte [data-a=voir]'); await e.waitForTimeout(200)
  await e.keyboard.press('End'); await e.waitForTimeout(150)
  const m = await e.evaluate(() => {
    const rv = document.getElementById('revoir'), vw = document.documentElement.clientWidth
    const c = document.querySelector('.b-cadrer').getBoundingClientRect()
    return { deborde: rv.scrollWidth - rv.clientWidth, cadrer: [Math.round(c.left), Math.round(c.right)], vw, allure: document.querySelector('.b-vitesse').textContent, chapitres: !document.querySelector('.b-chapitres').hidden }
  })
  ok('320 × 568 : rien ne sort de l\'écran (bouton « Voir toute la page » compris)', m.chapitres && m.allure === 'Normal' && m.deborde <= 0 && m.cadrer[1] <= m.vw, JSON.stringify(m))
  await ctx.close()
}
console.log('erreurs JS :', erreurs)
await b.close()
