// ESSAI DU LOT 20 : « Publier la séance… », dans le menu … d'une séance de
// la bibliothèque (30 octobre 2026). Le serveur de développement (:5173).
// Un classeur « Fractions » fait d'avance (lundi, mercredi, vendredi), à part
// du classeur de l'onglet :
// A. le menu … d'une séance a « Publier la séance… », après « Renommer… » ;
// B. pour un autre classeur que celui de l'onglet : il s'ouvre sur cette
//    séance, et la fenêtre Publier aussi, cette séance choisie ;
// C. pour le classeur de l'onglet : sans recharger, de même ;
// D. « Enregistrer le fichier » y donne le replay (.mem) de cette séance.
// Les captures vont dans SORTIE (par défaut essais/navigateur/sorties/lot20).
import { mkdirSync } from 'node:fs'
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
const SORTIE = process.env.SORTIE ?? new URL('../sorties/lot20/', import.meta.url).pathname
mkdirSync(SORTIE, { recursive: true })
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const H = 3600_000, JOUR = 24 * H
const LUNDI = new Date('2026-10-12T08:00:00').getTime()

const OUTILS = () => {
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
}

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true })
await ctx.addInitScript(OUTILS)
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
const attendre = ms => p.waitForTimeout(ms)
const pret = async () => { await p.waitForFunction(() => window.__app?.page && window.__registre); await attendre(500) }

await p.goto(DEV); await pret()
const ids = await p.evaluate(([L, J]) => window.__creer([{ nom: 'Fractions', seances: [L, L + 2 * J, L + 4 * J] }]), [LUNDI, JOUR])
const carte = `.grille-classeurs:not(.recents) .case-classeur[data-cle="${ids.Fractions}"]`
const ouvrirBiblio = async () => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await attendre(300)
  if (await p.getAttribute(carte + ' .carte-seances-bascule', 'aria-expanded') !== 'true') { await p.click(carte + ' .carte-seances-bascule'); await attendre(200) }
}
const menuSeance = async k => { await p.click(`${carte} .carte-seance-ligne >> nth=${k} >> .options-seance`); await attendre(200) }
const sid = k => p.evaluate(([sel, k]) => document.querySelectorAll(sel + ' .carte-seance-ligne')[k]?.dataset.seance, [carte, k])
const fenetre = () => p.evaluate(() => {
  const d = document.querySelector('dialog.dialogue-publier[open]')
  return d ? { ouverte: true, resume: d.classList.contains('resume'), choisie: d.querySelector('.p-seance').selectedOptions[0]?.textContent ?? null, focus: document.activeElement?.className ?? null, vue: window.__app.seanceVue?.id, classeur: window.__app.classeur.id } : { ouverte: false }
})

// A
await ouvrirBiblio()
const s1 = await sid(1)
await menuSeance(1)
const entrees = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].map(b => b.dataset.action))
ok(entrees[1] === 'renommer-seance' && entrees[2] === 'publier-seance', 'A) « Publier la séance… » est dans le menu …, après « Renommer… »', entrees)

await p.screenshot({ path: SORTIE + '5-menu-seance.png' })

// B
await Promise.all([p.waitForNavigation(), p.click('.menu-item[data-action="publier-seance"]')])
await pret()
await p.waitForSelector('dialog.dialogue-publier[open]', { timeout: 10000 }); await attendre(300)
let f = await fenetre()
ok(f.ouverte && f.classeur === ids.Fractions && f.vue === s1 && /^Mer 14 oct|14 oct/i.test(f.choisie ?? '') ,
  'B) Un autre classeur : il s\'ouvre sur la séance, la fenêtre Publier aussi, elle choisie', f)
ok(!/publier/.test(await p.evaluate(() => location.search)), 'B2) L\'adresse l\'oublie (un rechargement ne rouvre pas la fenêtre)', await p.evaluate(() => location.search))

await p.screenshot({ path: SORTIE + '6-fenetre-publier.png' })

// D
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }).catch(() => null), p.click('dialog.dialogue-publier[open] .p-fichier')])
ok(!!dl && /\.mem$/.test(dl.suggestedFilename()), 'D) « Enregistrer le fichier » : le replay de la séance (.mem)', dl?.suggestedFilename())
await p.click('dialog.dialogue-publier[open] .p-fermer'); await attendre(300)

// C
await ouvrirBiblio()
const s2 = await sid(2)
await menuSeance(2)
const avant = await p.evaluate(() => performance.timeOrigin)
await p.click('.menu-item[data-action="publier-seance"]')
await p.waitForSelector('dialog.dialogue-publier[open]', { timeout: 10000 }); await attendre(300)
f = await fenetre()
const meme = await p.evaluate(() => performance.timeOrigin)
ok(meme === avant && f.ouverte && f.vue === s2 && /12 oct/i.test(f.choisie ?? '') && !(await p.evaluate(() => window.__bibliotheque.ouvert)),
  'C) Le classeur de l\'onglet : sans recharger, la séance, la fenêtre Publier sur elle', f)

ok(!erreurs.length, 'Aucune erreur dans la page', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
