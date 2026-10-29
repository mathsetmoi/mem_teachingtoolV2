// ESSAI DU LOT 9 : ranger les séances d'un classeur depuis la bibliothèque.
// Le serveur de développement (port 5173). Trois classeurs faits d'avance
// (« Fractions » : lundi, mercredi, vendredi ; « Symetrie » : mardi, jeudi ;
// « Doublon » : mardi, à la même heure que Symetrie ; « Seul » : samedi),
// chacun avec ses séances, leurs pages et leur film. Le classeur de l'onglet
// (celui du démarrage) reste à part.
// A. Les séances dépliées ont chacune leur poignée ⠿ et leur bouton … ;
// B. « Renommer… » : le nom s'écrit sous la date, dans le classeur ;
// C. Alt + ↑ : la séance monte, « Ordre choisi à la main » ; « Remettre dans
//    l'ordre des dates » ;
// D. glisser la poignée : la séance change de place ;
// E. Suppr : la séance part (ses pages dans la corbeille du classeur) ;
//    « Annuler » la rend ;
// F. « Déplacer vers… » : la fenêtre des classeurs ; la séance arrive à sa
//    date dans l'autre, avec son film (Publier la montre comme avant), et
//    quitte le sien ;
// G. glisser une séance sur un autre classeur : elle y part ;
// H. un classeur qui a déjà une séance à la même heure : refusé, rien ne bouge ;
// I. la seule séance d'un classeur : elle part, et le classeur, vide, va
//    dans la corbeille ; « Annuler » remet tout ;
// J. la séance arrivée s'ouvre (en lecture) ;
// K. le classeur ouvert dans l'onglet : une séance en part, une autre est
//    supprimée puis rendue, et le tableau ouvert suit aussitôt ; la séance
//    qu'on regarde part, et le tableau montre une autre page ;
// L. (lot 17) une séance supprimée, puis le classeur ouvert, Maj + P,
//    Corbeille : elle y fait un bloc (« Activité d'intro · Lun 19 oct 8h ·
//    2 pages ») ; « Remettre la séance » la rend avec son nom et sa place ;
//    « Annuler » la renvoie dans la corbeille.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const norm = t => (t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
const erreurs = []
const H = 3600_000, JOUR = 24 * H
const LUNDI = new Date('2026-10-12T08:00:00').getTime()

const OUTILS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
  const trait = (x, id) => ({ id, type: 'trait', x, y: 10, z: Date.now() + Math.random(), auteur: 'essai', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  /** Des classeurs faits d'avance : { nom, seances: [heure…] } ; chaque séance a deux pages, trois gestes */
  window.__creer = async (liste) => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
    const { Tableau } = await import('/src/document.ts'), fichier = await import('/src/fichier.ts'), seances = await import('/src/seances.ts')
    const r = {}
    for (const o of liste) {
      const t = new Tableau(null)
      t.seancesActives = true
      let k = 0
      for (const debut of o.seances) {
        let h = debut
        t.horloge = () => h
        const { seance, page } = t.nouvelleSeance({ t: h }); await Promise.resolve(); t.pageVue = page
        h += 60_000; t.nouveauGeste(); t.poser(page, trait(10, `${o.nom}-${k}-a`)); await Promise.resolve()
        h += 60_000; const p2 = t.ajouterPage('carreaux', t.ordre.length, { seance }); await Promise.resolve(); t.pageVue = p2
        h += 60_000; t.nouveauGeste(); t.poser(p2, trait(20, `${o.nom}-${k}-b`)); await Promise.resolve()
        h += 60_000; t.nouveauGeste(); t.poser(p2, trait(30, `${o.nom}-${k}-c`)); await Promise.resolve()
        k++
      }
      await new Promise(f => setTimeout(f, 20))
      const { etat } = fichier.lireTableau(new Uint8Array(await fichier.ecrireTableau(t.doc).arrayBuffer()))
      const rangees = t.seancesDuClasseur()
      const id = dem.idClasseur(), nom = o.nom
      const fiche = { id, base: dem.baseDe(id), nom, dossier: null, etiquettes: [], cree: o.seances[0], modifie: Date.now() - 600e3, ouvert: 0, pages: t.ordre.length, seances: rangees.length, listeSeances: seances.resumeDesSeances(rangees) }
      t.doc.destroy()
      await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
      r[nom] = id
    }
    return r
  }
  /** Un classeur de la bibliothèque, lu dans sa base : ses séances, son film, ce que Publier en montre */
  window.__lire = async (id) => {
    const { Tableau } = await import('/src/document.ts'), ecr = await import('/src/classeurs/ecrivain.ts'), fichier = await import('/src/fichier.ts')
    const ex = await import('/src/revoir/exporter.ts')
    const f = await window.__registre.classeur(id)
    const fab = await ecr.ecrivain.fabriquerFichier(f.base, { nom: f.nom, id: f.id })
    const t = new Tableau(null); t.seancesActives = true
    t.lireEtat(fichier.lireTableau(new Uint8Array(await fab.fichier.arrayBuffer())).etat)
    const film = t.film.toArray().map(e => e.t)
    const explicites = ex.seancesDuTableau(t) ?? []
    const r = {
      fiche: { liste: (f.listeSeances ?? []).map(s => ({ id: s.id, debut: s.debut, nom: s.nom ?? null, rang: s.rang ?? null, pages: s.pages })), corbeille: !!f.corbeille },
      seances: t.seancesDuClasseur().filter(s => s.pages.length).map(s => {
        const x = explicites.find(e => e.id === s.id)
        const pages = x ? ex.pagesAPublier(t, x) : []
        const film = x ? ex.exporter(t, { de: x.de, a: x.a, pages, titre: '' }, { instruments: false }) : null
        return { id: s.id, debut: s.debut, nom: s.nom, rang: s.rang, pages: s.pages.length, gestes: x?.gestes ?? 0,
          publie: film ? film.etapes.map(e => e.o.map(o => o[0] === '=' ? o[1].id : o[0]).join(',')).join(' ') : '' }
      }),
      trie: film.every((v, i) => i === 0 || film[i - 1] <= v),
      corbeille: t.pagesDeLaCorbeille().length,
    }
    t.doc.destroy()
    return r
  }
}

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 } })
await ctx.addInitScript(OUTILS)
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
const attendre = ms => p.waitForTimeout(ms)
const toasts = () => p.evaluate(() => window.__toasts.slice())
const viderToasts = () => p.evaluate(() => { window.__toasts.length = 0 })

await p.goto(DEV)
await p.waitForFunction(() => window.__app?.page && window.__registre)
await attendre(500)
const ids = await p.evaluate(([L, J, H]) => window.__creer([
  { nom: 'Fractions', seances: [L, L + 2 * J, L + 4 * J] },
  { nom: 'Symetrie', seances: [L + J + 2 * H, L + 3 * J + 2 * H] },
  { nom: 'Doublon', seances: [L + J + 2 * H] },
  { nom: 'Seul', seances: [L + 5 * J] },
]), [LUNDI, JOUR, H])
const carte = nom => `.grille-classeurs:not(.recents) .case-classeur[data-cle="${ids[nom]}"]`
const lignes = async nom => (await p.evaluate(sel => [...document.querySelectorAll(sel + ' .carte-seance-ligne')].map(x => x.querySelector('.carte-seance').textContent), carte(nom))).map(norm)
const ouvrirBiblio = async () => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await attendre(300)
}
const deplier = async nom => {
  if (await p.getAttribute(carte(nom) + ' .carte-seances-bascule', 'aria-expanded') !== 'true') { await p.click(carte(nom) + ' .carte-seances-bascule'); await attendre(200) }
}
const menuSeance = async (nom, k) => { await p.click(`${carte(nom)} .carte-seance-ligne >> nth=${k} >> .options-seance`); await attendre(200) }
const choisir = async action => { await p.click(`.menu-item[data-action="${action}"]`); await attendre(300) }
const attendreFin = async () => { await p.waitForFunction(() => !window.__bibliotheque.seancesOccupees, null, { timeout: 15000 }); await attendre(300) }

// ---------- A. Les séances dépliées ----------
await ouvrirBiblio()
await deplier('Fractions')
let l = await lignes('Fractions')
const outils = await p.evaluate(sel => [...document.querySelectorAll(sel + ' .carte-seance-ligne')].map(x => !!x.querySelector('.poignee-seance') && !!x.querySelector('.options-seance')), carte('Fractions'))
ok(l.length === 3 && /^Ven 16 oct/.test(l[0]) && /^Lun 12 oct/.test(l[2]) && outils.every(Boolean), 'A) Trois séances, la plus récente d\'abord, chacune avec ⠿ et …', { l, outils })

// ---------- B. Renommer ----------
await menuSeance('Fractions', 1)
const entrees = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].map(x => x.dataset.action))
ok(['ouvrir-seance', 'renommer-seance', 'monter-seance', 'descendre-seance', 'deplacer-seance', 'supprimer-seance'].every(a => entrees.includes(a)), 'B1) Le menu … : ouvrir, renommer, monter, descendre, déplacer, supprimer', entrees)
await choisir('renommer-seance')
await p.fill('.dialogue-nom-seance input', 'Activité d\'intro')
await p.click('.dialogue-nom-seance button[type="submit"]')
await attendreFin()
l = await lignes('Fractions')
let lu = await p.evaluate(id => window.__lire(id), ids.Fractions)
ok(/Activité d'intro/.test(l[1]) && lu.seances[1].nom === 'Activité d\'intro' && lu.fiche.liste[1].nom === 'Activité d\'intro', 'B2) Le nom est sous la date, dans le classeur et sa fiche', { l, lu: lu.seances })

// ---------- C. Alt + ↑ ----------
await p.focus(`${carte('Fractions')} .carte-seance-ligne >> nth=2 >> .carte-seance`)
await p.keyboard.press('Alt+ArrowUp')
await attendreFin()
l = await lignes('Fractions')
let ordre = await p.evaluate(sel => !!document.querySelector(sel + ' .carte-seances-ordre'), carte('Fractions'))
ok(/^Ven 16/.test(l[0]) && /^Lun 12/.test(l[1]) && /^Mer 14/.test(l[2]) && ordre, 'C1) Lundi monte d\'un cran ; « Ordre choisi à la main »', { l, ordre })
lu = await p.evaluate(id => window.__lire(id), ids.Fractions)
ok(lu.seances.every(s => s.rang !== null) && lu.seances.map(s => s.gestes).join() === '3,3,3', 'C2) Les rangs sont dans le classeur ; le film ne bouge pas', lu.seances)
await p.click(`${carte('Fractions')} .lien-ordre-dates`)
await attendreFin()
l = await lignes('Fractions')
ordre = await p.evaluate(sel => !!document.querySelector(sel + ' .carte-seances-ordre'), carte('Fractions'))
ok(/^Ven 16/.test(l[0]) && /^Mer 14/.test(l[1]) && /^Lun 12/.test(l[2]) && !ordre, 'C3) « Remettre dans l\'ordre des dates »', { l, ordre })

// ---------- D. Glisser la poignée ----------
const glisser = async (de, vers, o = {}) => {
  const a = await p.locator(de).boundingBox(), b = await p.locator(vers).boundingBox()
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await p.mouse.down()
  const y = o.haut ? b.y + 4 : b.y + b.height / 2
  await p.mouse.move(b.x + b.width / 2, y, { steps: 12 })
  await attendre(100)
  if (o.echap) { await p.keyboard.press('Escape'); await p.mouse.up(); return }
  await p.mouse.up()
}
await glisser(`${carte('Fractions')} .carte-seance-ligne >> nth=2 >> .poignee-seance`, `${carte('Fractions')} .carte-seance-ligne >> nth=0`, { haut: true })
await attendreFin()
l = await lignes('Fractions')
ok(/^Lun 12/.test(l[0]) && /^Ven 16/.test(l[1]), 'D1) Lundi glissé tout en haut', l)
await glisser(`${carte('Fractions')} .carte-seance-ligne >> nth=0 >> .poignee-seance`, `${carte('Fractions')} .carte-seance-ligne >> nth=2`, { echap: true })
await attendreFin()
const l2 = await lignes('Fractions')
ok(l2.join() === l.join(), 'D2) Échap pendant le glisser : rien ne bouge', l2)
await p.click(`${carte('Fractions')} .lien-ordre-dates`)
await attendreFin()

// ---------- E. Suppr, puis Annuler ----------
await viderToasts()
await p.focus(`${carte('Fractions')} .carte-seance-ligne >> nth=1 >> .carte-seance`)
await p.keyboard.press('Delete')
await attendreFin()
l = await lignes('Fractions')
lu = await p.evaluate(id => window.__lire(id), ids.Fractions)
let t = await toasts()
ok(l.length === 2 && !l.some(x => /Mer 14/.test(x)) && lu.seances.length === 2 && lu.corbeille === 2 && t.some(x => /^La séance « Activité d'intro » est supprimée : ses pages sont dans la corbeille du classeur \(Maj \+ P, Corbeille\)\./.test(x)), 'E1) La séance de mercredi est supprimée, ses pages dans la corbeille du classeur (Maj + P, Corbeille)', { l, lu, t })
await p.click('.toast button:has-text("Annuler")')
await attendreFin()
l = await lignes('Fractions')
lu = await p.evaluate(id => window.__lire(id), ids.Fractions)
ok(l.length === 3 && /Mer 14/.test(l[1]) && lu.seances.length === 3 && lu.corbeille === 0 && lu.seances[1].nom === 'Activité d\'intro', 'E2) « Annuler » : elle revient, avec son nom', { l, lu })

// ---------- F. Déplacer vers… ----------
const avant = (await p.evaluate(id => window.__lire(id), ids.Fractions)).seances[1]
await menuSeance('Fractions', 1)
await choisir('deplacer-seance')
const fenetre = (await p.evaluate(() => [...document.querySelectorAll('.dialogue-deplacer-seance label')].map(x => x.textContent))).map(norm)
ok(fenetre.includes('Symetrie') && !fenetre.includes('Fractions'), 'F1) La fenêtre propose les autres classeurs', fenetre)
await p.click('.dialogue-deplacer-seance label:has-text("Symetrie")')
await p.click('.dialogue-deplacer-seance button[type="submit"]')
await attendreFin()
const fr = await p.evaluate(id => window.__lire(id), ids.Fractions)
const sy = await p.evaluate(id => window.__lire(id), ids.Symetrie)
const arrivee = sy.seances.find(s => s.debut === avant.debut)
ok(fr.seances.length === 2 && fr.corbeille === 0 && !fr.fiche.liste.some(s => s.debut === avant.debut), 'F2) Elle a quitté « Fractions » (pas dans sa corbeille)', fr)
ok(sy.seances.length === 3 && sy.seances.map(s => s.debut).join() === [...sy.seances.map(s => s.debut)].sort((a, b) => a - b).join() && sy.seances[1].debut === avant.debut && sy.trie,
  'F3) Elle est dans « Symetrie », entre mardi et jeudi ; le film reste dans l\'ordre des heures', sy)
ok(arrivee && arrivee.nom === 'Activité d\'intro' && arrivee.pages === 2 && arrivee.gestes === avant.gestes && arrivee.publie === avant.publie && sy.seances.every(s => s.publie.length > 0),
  'F4) Avec son nom, ses pages, son film : Publier la montre comme avant', { avant, arrivee })
l = await lignes('Symetrie').catch(() => [])
t = await toasts()
ok(t.some(x => /est dans « Symetrie »/.test(x)), 'F5) Le message le dit', t)

// ---------- G. Glisser une séance sur un autre classeur ----------
await ouvrirBiblio()
await deplier('Fractions')
await glisser(`${carte('Fractions')} .carte-seance-ligne >> nth=0 >> .poignee-seance`, `${carte('Symetrie')} .carte-classeur`)
await attendreFin()
const fr2 = await p.evaluate(id => window.__lire(id), ids.Fractions)
const sy2 = await p.evaluate(id => window.__lire(id), ids.Symetrie)
ok(fr2.seances.length === 1 && sy2.seances.length === 4 && sy2.trie && sy2.seances[3].debut === LUNDI + 4 * JOUR, 'G) Vendredi glissé sur « Symetrie » : il y est, à sa date', { fr2, sy2 })

// ---------- H. Une séance à la même heure : refusée ----------
await viderToasts()
await ouvrirBiblio()
await deplier('Doublon')
const doublonAvant = await p.evaluate(id => window.__lire(id), ids.Doublon)
// Doublon n'a qu'une séance : la déplacer mettrait Doublon à la corbeille, mais elle est refusée avant
await menuSeance('Doublon', 0)
await choisir('deplacer-seance')
await p.click('.dialogue-deplacer-seance label:has-text("Symetrie")')
await p.click('.dialogue-deplacer-seance button[type="submit"]')
await attendreFin()
t = await toasts()
const sy3 = await p.evaluate(id => window.__lire(id), ids.Symetrie)
const doublon = await p.evaluate(id => window.__lire(id), ids.Doublon)
ok(t.some(x => /a déjà quelque chose pendant cette séance/.test(x)) && sy3.seances.length === 4 && doublon.seances.length === 1 && !doublon.fiche.corbeille && JSON.stringify(doublon.seances) === JSON.stringify(doublonAvant.seances),
  'H) « Symetrie » a déjà une séance à cette heure : refusé, rien ne bouge', { t, sy3: sy3.seances.length, doublon })

// ---------- I. La seule séance d'un classeur ----------
await viderToasts()
await ouvrirBiblio()
await deplier('Seul')
await menuSeance('Seul', 0)
await choisir('deplacer-seance')
await p.click('.dialogue-deplacer-seance label:has-text("Fractions")')
await p.click('.dialogue-deplacer-seance button[type="submit"]')
await attendreFin()
t = await toasts()
let seul = await p.evaluate(id => window.__lire(id), ids.Seul)
let fr3 = await p.evaluate(id => window.__lire(id), ids.Fractions)
ok(fr3.seances.length === 2 && fr3.trie && seul.fiche.corbeille && t.some(x => /« Seul », vide, est dans la corbeille/.test(x)), 'I1) La seule séance de « Seul » part ; « Seul » va dans la corbeille', { fr3, seul, t })
await p.click('.toast button:has-text("Annuler")')
await attendreFin()
seul = await p.evaluate(id => window.__lire(id), ids.Seul)
fr3 = await p.evaluate(id => window.__lire(id), ids.Fractions)
ok(fr3.seances.length === 1 && !seul.fiche.corbeille && seul.seances.length === 1, 'I2) « Annuler » : tout revient', { fr3, seul })

// ---------- J. Ouvrir la séance arrivée ----------
await ouvrirBiblio()
await deplier('Symetrie')
const k = (await lignes('Symetrie')).findIndex(x => /Activité d'intro/.test(x))
await p.click(`${carte('Symetrie')} .carte-seance-ligne >> nth=${k} >> .carte-seance`)
await p.waitForFunction(() => window.__app?.page && !window.__bibliotheque?.ouvert, null, { timeout: 15000 })
await attendre(800)
const ici = await p.evaluate(() => { const a = window.__app; const s = a.tableau.seanceDe(a.page); return { nom: s?.nom ?? null, n: a.tableau.formesDe(a.page)?.size ?? 0, passee: a.enSeancePassee } })
ok(ici.nom === 'Activité d\'intro' && ici.n === 1 && ici.passee, 'J) La séance arrivée s\'ouvre sur sa première page, en lecture', ici)

// ---------- K. Le classeur ouvert dans l'onglet ----------
const ouvert = () => p.evaluate(() => { const a = window.__app, t = a.tableau; return { page: a.page, dansOrdre: t.ordre.toArray().includes(a.page), seances: t.seancesDuClasseur().filter(s => s.pages.length).map(s => s.debut) } })
let o = await ouvert()
await ouvrirBiblio()
await deplier('Symetrie')
const mardi = LUNDI + JOUR + 2 * H
let ls = await lignes('Symetrie')
await menuSeance('Symetrie', ls.length - 1)
await choisir('deplacer-seance')
await p.click('.dialogue-deplacer-seance label:has-text("Fractions")')
await p.click('.dialogue-deplacer-seance button[type="submit"]')
await attendreFin()
let o2 = await ouvert()
let fr4 = await p.evaluate(id => window.__lire(id), ids.Fractions)
ok(o.seances.includes(mardi) && !o2.seances.includes(mardi) && o2.seances.length === o.seances.length - 1 && o2.dansOrdre && fr4.seances.some(s => s.debut === mardi) && fr4.trie,
  'K1) Mardi quitte le classeur ouvert : le tableau suit, la page montrée reste là ; mardi est dans « Fractions »', { o, o2, fr4: fr4.seances.map(s => s.debut) })
await viderToasts()
await deplier('Symetrie')
await p.focus(`${carte('Symetrie')} .carte-seance-ligne >> nth=0 >> .carte-seance`)
await p.keyboard.press('Delete')
await attendreFin()
const o3 = await ouvert()
ok(o3.seances.length === o2.seances.length - 1 && o3.dansOrdre, 'K2) Suppr dans le classeur ouvert : le tableau suit', { o2, o3 })
await p.click('.toast button:has-text("Annuler")')
await attendreFin()
const o4 = await ouvert()
ok(o4.seances.join() === o2.seances.join(), 'K3) « Annuler » : elle revient dans le tableau ouvert', { o2, o4 })
await viderToasts()
// La séance qu'on regarde (« Activité d'intro », ouverte en J) part : le tableau va sur une autre page
const pageVue = await p.evaluate(() => window.__app.page)
await deplier('Symetrie')
const kv = (await lignes('Symetrie')).findIndex(x => /Activité d'intro/.test(x))
await menuSeance('Symetrie', kv)
await choisir('supprimer-seance')
await attendreFin()
const o5 = await ouvert()
ok(kv >= 0 && o5.page !== pageVue && o5.dansOrdre && o5.seances.length === o4.seances.length - 1, 'K4) La séance qu\'on regarde part : le tableau montre une autre page', { kv, pageVue, o5 })

// ---------- L. (lot 17) La séance supprimée dans la corbeille du classeur ----------
// Un classeur neuf à deux séances ; la première est renommée puis supprimée
// depuis la bibliothèque ; le classeur s'ouvre (sur l'autre séance), et la
// corbeille montre la séance en un bloc, que « Remettre la séance » rend.
const idsL = await p.evaluate(([L, J]) => window.__creer([{ nom: 'Corbeille', seances: [L + 7 * J, L + 9 * J] }]), [LUNDI, JOUR])
ids.Corbeille = idsL.Corbeille
await ouvrirBiblio()
await deplier('Corbeille')
// La ligne de « Lun 19 » (la bibliothèque liste la séance la plus récente d'abord)
let kL = (await lignes('Corbeille')).findIndex(x => /Lun 19/.test(x))
await menuSeance('Corbeille', kL)
await choisir('renommer-seance')
await p.fill('.dialogue-nom-seance input', 'Activité d\'intro')
await p.click('.dialogue-nom-seance button[type="submit"]')
await attendreFin()
await viderToasts()
await deplier('Corbeille')
kL = (await lignes('Corbeille')).findIndex(x => /Lun 19/.test(x))
await p.focus(`${carte('Corbeille')} .carte-seance-ligne >> nth=${kL} >> .carte-seance`)
await p.keyboard.press('Delete')
await attendreFin()
let luL = await p.evaluate(id => window.__lire(id), ids.Corbeille)
ok(luL.seances.length === 1 && luL.seances[0].debut === LUNDI + 9 * JOUR && luL.fiche.liste.length === 1 && luL.corbeille === 2 && !luL.fiche.corbeille,
  'L1) « Activité d\'intro » (Lun 19 oct) supprimée : il reste Mer 21 dans le classeur et sa fiche, ses deux pages sont dans la corbeille du classeur', luL)
await p.click(`${carte('Corbeille')} .carte-seance-ligne >> nth=0 >> .carte-seance`)
await p.waitForFunction(() => window.__app?.page && !window.__bibliotheque?.ouvert, null, { timeout: 15000 })
await attendre(800)
await p.keyboard.press('Shift+P')
await p.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 5000 })
await attendre(300)
await p.click('.trieuse-bouton-corbeille'); await attendre(500)
const blocL = await p.evaluate(() => {
  const n = s => (s ?? '').replace(/[\u00a0\u202f]/g, ' ')
  const v = document.querySelector('.trieuse-corbeille'), lis = [...v.querySelectorAll('.corbeille-grille > li')]
  return { ouverte: !v.hidden, titre: v.querySelector('h2').textContent, lignes: lis.map(li => li.className), bloc: lis[0] ? { titre: n(lis[0].querySelector('.bloc-corbeille-titre')?.textContent), date: n(lis[0].querySelector('.corbeille-date')?.textContent), vignettes: [...lis[0].querySelectorAll('.corbeille-vignette .numero')].map(x => x.textContent), boutons: [...lis[0].querySelectorAll('button')].map(b => b.textContent) } : null, focus: document.activeElement?.textContent }
})
ok(blocL.ouverte && blocL.titre === 'Corbeille du classeur' && blocL.lignes.join() === 'bloc-corbeille' && blocL.bloc?.titre === 'Activité d\'intro · Lun 19 oct 8h · 2 pages' && /^Supprimée aujourd'hui à /.test(blocL.bloc.date)
  && blocL.bloc.vignettes.join() === '1,2' && blocL.bloc.boutons.join('|') === 'Remettre la séance|Supprimer définitivement' && blocL.focus === 'Remettre la séance',
  'L2) Le classeur ouvert, Maj + P, Corbeille : un bloc « Activité d\'intro · Lun 19 oct 8h · 2 pages », ses deux vignettes, « Remettre la séance »', blocL)
await viderToasts()
await p.click('.bloc-corbeille .corbeille-remettre'); await attendre(500)
let tL = await toasts()
let apresL = await p.evaluate(() => { const t = window.__app.tableau; return t.seancesDuClasseur().map(s => ({ nom: s.nom ?? null, debut: s.debut, pages: s.pages.length, rang: s.rang ?? null })) })
ok(tL.map(norm).some(x => x.startsWith('Séance remise : « Activité d\'intro » (2 pages)') && !/redevient/.test(x) && x.includes('Annuler')) && apresL.length === 2 && apresL[0].nom === 'Activité d\'intro' && apresL[0].debut === LUNDI + 7 * JOUR && apresL[0].pages === 2 && apresL[0].rang === null
  && apresL[1].pages === 2 && await p.evaluate(() => document.activeElement?.classList.contains('trieuse-vignette-passee')),
  'L3) « Remettre la séance » : elle revient à sa date, avec son nom et ses deux pages, dépliée dans la trieuse (le focus sur sa première vignette)', { tL, apresL })
await p.click('.toast button:has-text("Annuler")'); await attendre(500)
apresL = await p.evaluate(() => { const t = window.__app.tableau; return { seances: t.seancesDuClasseur().filter(s => s.pages.length).length, corbeille: t.pagesDeLaCorbeille().length } })
ok(apresL.seances === 1 && apresL.corbeille === 2, 'L4) « Annuler » : ses pages retournent dans la corbeille', apresL)

ok(!erreurs.length, 'Aucune erreur dans la page', erreurs)
if (process.env.CAPTURE) await p.screenshot({ path: process.env.CAPTURE })
await nav.close()
console.log(echecs ? `\n✗ ${echecs} échec(s)` : '\n✓ Tout est passé')
process.exit(echecs ? 1 : 0)
