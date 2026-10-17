// ESSAI DU MORCEAU C6-ranger (lot 4) : ranger la bibliothèque.
// A. Le conseil du rangement par classe ; « Nouveau dossier » : « 5e B »
//    (cochée d'office), « 2nde 3 », « Archives » (pas cochée) ; les cartes
//    des dossiers d'abord, par nom ; « Plus tard ».
// B. Un classeur créé dans « 5e B » est dans le filtre « 5e B », sans
//    étiquette propre ; un classeur d'« Archives » avec l'étiquette propre
//    « 5e B » est trouvé aussi ; la fenêtre « Étiquettes de classe… » (3 au
//    plus, un double ignoré, l'héritée grisée) ; la rangée du filtre ;
//    Échap enlève le filtre d'abord.
// C. Un sous-dossier, le fil d'Ariane, Retour arrière, le dossier retenu
//    pour l'onglet ; un dossier vide.
// D. Le menu d'un dossier : sa couleur, « Dossier d'une classe », Annuler.
// E. Renommer : à la souris (double-clic sur le nom), au clavier (F2), un
//    nom vide refusé, « Annuler » ; un dossier de classe renommé ; le
//    classeur de l'onglet (son bouton, le titre de l'onglet) ; le clic
//    simple sur le nom ouvre quand même.
// F. Trier par nom (« Ch. 2 » avant « Ch. 10 »), retenu sur l'appareil.
// G. Deux onglets : un renommage se voit dans l'autre, sans perdre le focus ;
//    le classeur ouvert dans l'autre suit son nouveau nom.
// H. Un cycle A → B → A écrit à la main dans l'index : rien ne boucle, le
//    démarrage marche.
// I. Le téléphone 390 × 844 : renommer au doigt (le champ au-dessus du
//    clavier virtuel), pas de défilement de côté.
// J. 30 classeurs dans 8 dossiers sur 3 niveaux ; le TNI (1920 × 1080,
//    tactile) ; le stylet (bouton latéral, toucher).
// K. Le conseil : « Plus tard », « Créer un dossier de classe » ; aucune clé
//    écrite sans rien choisir.
// L. Un dossier qui porte le nom d'une étiquette ; une étiquette écrite
//    autrement ; Retour arrière dans un champ ; la bibliothèque seule.
// M. La version d'un seul fichier (file://).
// (Adapté au lot 4, morceau C8 : les menus d'un classeur et d'un dossier finissent par « Supprimer ».)
// (Adapté au lot 7 : « Enregistrer ce dossier… » entre volontairement au menu d'un dossier, avant « Supprimer ».)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { existsSync, mkdirSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const ICI = S + '/lot4/C6/'
const CAPTURES = ICI + 'captures/'
const DEV = 'http://localhost:5173/'
mkdirSync(CAPTURES, { recursive: true })

let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '') }
const dort = ms => new Promise(r => setTimeout(r, ms))
const norm = t => (t || '').replace(/[  ]/g, ' ')
const seul = section => process.argv.length <= 2 || process.argv.slice(2).includes(section)

const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => (window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'))
  || (window.__bibliotheque && !window.__app && !document.querySelector('.bibliotheque').hidden), null, { timeout: 30000 })
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
const toasts = p => p.evaluate(() => window.__toasts.splice(0))
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.addInitScript(ECOUTER_TOASTS)
  return ctx
}
async function ouvrir(ctx, chemin = '', nom = 'dev') {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV + chemin); await pret(p); await p.waitForTimeout(300)
  return p
}
/** n classeurs, comme les crée la bibliothèque, dans un dossier, avec des étiquettes propres */
const creerPlusieurs = (p, n, o = {}) => p.evaluate(async ({ n, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), T = Date.now(), ids = []
  for (let i = 0; i < n; i++) {
    const id = dem.idClasseur()
    const nom = o.noms?.[i] ?? `${o.prefixe ?? 'Chapitre'} ${i + 1}`
    const fiche = { id, base: dem.baseDe(id), nom, dossier: o.dossier ?? null, etiquettes: o.etiquettes ?? [], cree: T - (n - i) * 3600e3, modifie: T - (n - i) * 600e3 - (o.decalage ?? 0), ouvert: o.jamais ? 0 : T - (n - i) * 60e3, pages: 1 }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom }))
    ids.push(id)
  }
  return ids
}, { n, o })
/** Un dossier écrit dans l'index, comme le fait « Nouveau dossier » */
const creerDossier = (p, nom, o = {}) => p.evaluate(async ({ nom, o }) => {
  const dem = await import('/src/classeurs/demarrage.ts')
  const d = { id: dem.idClasseur(), nom, parent: o.parent ?? null, couleur: o.couleur ?? '#3b6fb6', cree: Date.now(), ...(o.etiquette ? { etiquette: o.etiquette } : {}) }
  await window.__registre.ajouterDossier(d)
  return d.id
}, { nom, o })
const ouvrirBiblio = async p => {
  await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b.getClientRects().length) b.click(); else window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert && document.querySelectorAll('.grille-classeurs li, .biblio-vide-dossier:not([hidden])').length > 0, null, { timeout: 10000 })
  await p.waitForTimeout(200)
}
/** Ce que montre la bibliothèque */
const VUE = () => {
  const n = t => (t || '').replace(/[  ]/g, ' ')
  const cartes = sel => [...document.querySelectorAll(sel + ' > li')].map(li => {
    const dossier = li.classList.contains('case-dossier'), f = li.querySelector('.carte-classeur, .carte-dossier'), r = li.getBoundingClientRect()
    const ch = li.querySelector('.carte-chemin')
    return { cle: li.dataset.cle, dossier, nom: li.querySelector('.carte-nom-classeur, .carte-nom-dossier')?.textContent, infos: n(li.querySelector('.carte-date, .carte-contenu')?.textContent),
      puces: [...li.querySelectorAll('.carte-etiquettes .puce-etiquette')].map(x => (x.classList.contains('heritee') ? '~' : '') + x.textContent),
      titres: [...li.querySelectorAll('.carte-etiquettes .puce-etiquette')].map(x => x.title),
      chemin: ch && !ch.hidden ? ch.textContent : null, label: n(f.getAttribute('aria-label')), tab: f.tabIndex, couleur: li.style.getPropertyValue('--c'),
      x: Math.round(r.left), y: Math.round(r.top), l: Math.round(r.width), h: Math.round(r.height) }
  })
  const a = document.activeElement
  const menu = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
  return {
    ouvert: !document.querySelector('.bibliotheque').hidden,
    recents: document.querySelector('.biblio-section.recents').hidden ? [] : cartes('.grille-classeurs.recents'),
    grille: cartes('.grille-classeurs.tous'),
    fil: [...document.querySelectorAll('.biblio-fil li')].map(li => { const x = li.querySelector('button, .fil-ici'); return x.textContent + (x.classList.contains('fil-ici') ? '*' : '') }),
    filtre: document.querySelector('.biblio-filtre').hidden ? null : [...document.querySelectorAll('.biblio-filtre .filtre-etiquette')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')),
    conseil: !document.querySelector('.biblio-conseil').hidden,
    conseilTexte: n(document.querySelector('.biblio-conseil p')?.textContent),
    videDossier: document.querySelector('.biblio-vide-dossier').hidden ? null : n(document.querySelector('.biblio-vide-dossier p').textContent),
    tri: n(document.querySelector('.biblio-tri').textContent),
    grilleLabel: document.querySelector('.grille-classeurs.tous').getAttribute('aria-label'),
    focus: a?.closest?.('li[data-cle]')?.dataset.cle ?? a?.dataset?.action ?? a?.className ?? null,
    saisie: document.querySelector('.carte-saisie') ? { valeur: document.querySelector('.carte-saisie').value, focus: a === document.querySelector('.carte-saisie'), choisi: (i => i.selectionStart === 0 && i.selectionEnd === i.value.length)(document.querySelector('.carte-saisie')), max: document.querySelector('.carte-saisie').maxLength, cle: document.querySelector('.carte-saisie').closest('li').dataset.cle } : null,
    menu: menu ? { label: menu.getAttribute('aria-label'), entrees: [...menu.querySelectorAll('.menu-item')].map(e => (e.dataset.action ?? '?') + (e.getAttribute('aria-checked') === 'true' ? '*' : '')), libelles: [...menu.querySelectorAll('.menu-item')].map(e => n(e.textContent)) } : null,
    session: { dossier: sessionStorage.getItem('mem-teachingtool-dossier'), filtre: sessionStorage.getItem('mem-teachingtool-filtre') },
  }
}
const vue = p => p.evaluate(VUE)
const DIALOGUES = () => [...document.querySelectorAll('dialog[open]')].map(d => ({
  titre: d.querySelector('h2')?.textContent, classe: d.className,
  erreur: d.querySelector('.erreur')?.hidden === false ? d.querySelector('.erreur').textContent.replace(/[  ]/g, ' ') : null,
  boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent),
}))
const dialogues = p => p.evaluate(DIALOGUES)
async function allerPar(p, faire) {
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), faire()])
  await pret(p); await p.waitForTimeout(300)
}
const sel = cle => `.grille-classeurs.tous li[data-cle="${cle}"]`
const carteCle = cle => `${sel(cle)} .carte-classeur, ${sel(cle)} .carte-dossier`
const fiche = (p, id) => p.evaluate(id => window.__registre.classeur(id), id)
const dossierLu = (p, id) => p.evaluate(id => window.__registre.dossier(id), id)
const ouvrirMenu = async (p, cle) => { await p.click(`${sel(cle)} .options-classeur`); await p.waitForTimeout(150) }
const choisir = async (p, action) => { await p.click(`.menu-flottant:not([hidden]) .menu-item[data-action="${action}"]`); await p.waitForTimeout(250) }
/** L'identité gardée dans la base d'un classeur (magasin custom de y-indexeddb) */
const infosBase = (p, base) => p.evaluate(base => new Promise(ok => {
  const r = indexedDB.open(base)
  r.onsuccess = () => { const db = r.result; const t = db.transaction(['custom']).objectStore('custom').get('mem-classeur'); t.onsuccess = () => { ok(t.result ?? null); db.close() }; t.onerror = () => { ok('erreur'); db.close() } }
  r.onerror = () => ok('erreur')
}), base)

// =====================================================================
// A. LE CONSEIL ET LES DOSSIERS
// =====================================================================
const etat = {}
if (seul('A') || seul('B') || seul('C') || seul('D') || seul('E') || seul('F')) {
  console.log('=== A. le conseil, « Nouveau dossier » ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'A')
  etat.ctx = ctx; etat.p = p
  etat.premier = await p.evaluate(() => window.__app.classeur.id)
  await ouvrirBiblio(p)
  let v = await vue(p)
  ok(v.conseil && v.conseilTexte === 'Rangez par classe : un dossier par classe (« 5e B »), puis un classeur par chapitre (« Symétrie centrale »). Les classeurs d\'un dossier de classe portent son étiquette : un geste les retrouve tous.',
    'À la racine, sans aucun dossier : le conseil du rangement par classe', v.conseilTexte)
  ok(JSON.stringify(v.fil) === '["Bibliothèque*"]' && v.grilleLabel === 'Bibliothèque' && v.tri === 'Trier : Modifiés récemment', '   … le fil d\'Ariane « Bibliothèque », « Trier : Modifiés récemment »', v)
  ok(v.focus === etat.premier, '   … le focus reste sur la carte du classeur ouvert (le conseil ne le prend pas)', v.focus)
  await p.screenshot({ path: CAPTURES + 'A-conseil.png' })
  // « Nouveau dossier » (le bandeau)
  await p.click('.biblio-actions [data-action="nouveau-dossier"]'); await p.waitForTimeout(250)
  const d0 = await p.evaluate(() => {
    const d = document.querySelector('dialog.dialogue-dossier[open]'), i = d?.querySelector('input[name="nom"]')
    return { titre: d?.querySelector('h2').textContent, max: i?.maxLength, ph: i?.placeholder, focus: document.activeElement === i, legende: d.querySelector('.couleurs legend').textContent,
      couleurs: [...d.querySelectorAll('input[name="couleur"]')].map(r => r.getAttribute('aria-label') + (r.checked ? '*' : '')), valeurs: [...d.querySelectorAll('input[name="couleur"]')].map(r => r.value),
      classe: { coche: d.querySelector('input[name="classe"]').checked, texte: d.querySelector('.case-classe span').textContent }, boutons: [...d.querySelectorAll('.actions button')].map(b => b.textContent),
      dans: d.querySelector('.dans')?.textContent ?? null }
  })
  ok(d0.titre === 'Nouveau dossier' && d0.max === 40 && d0.ph === '5e B' && d0.focus && d0.dans === null, '« Nouveau dossier » : « Nom », 40 caractères, l\'exemple grisé « 5e B », le focus dedans', d0)
  ok(d0.legende === 'Couleur' && d0.couleurs.join() === 'Gris,Bleu*,Vert,Jaune,Orange,Rouge,Violet,Rose' && d0.valeurs.join() === '#8a94a6,#3b6fb6,#2f8a57,#b8901f,#cf7a2b,#c24a4a,#7d5ba6,#b9578a', '   … « Couleur » : 8 pastilles (boutons radio nommés), Bleu au départ', d0.couleurs)
  ok(!d0.classe.coche && JSON.stringify(d0.boutons) === '["Annuler","Créer"]', '   … la case « Dossier d\'une classe », décochée tant que rien n\'est tapé ; [Annuler] [Créer]', d0)
  await p.keyboard.type('5e B'); await p.waitForTimeout(50)
  let c = await p.evaluate(() => ({ coche: document.querySelector('dialog input[name="classe"]').checked, texte: document.querySelector('dialog .case-classe span').textContent.replace(/[  ]/g, ' ') }))
  ok(c.coche && c.texte === 'Dossier d\'une classe : ses classeurs portent l\'étiquette « 5e B »', '   … « 5e B » tapé : cochée d\'office, son libellé suit le nom', c)
  await p.screenshot({ path: CAPTURES + 'A-nouveau-dossier.png' })
  await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  v = await vue(p)
  const d5 = v.grille.find(x => x.dossier && x.nom === '5e B')
  etat.d5 = d5?.cle.slice(2)
  const fiche5 = etat.d5 ? await dossierLu(p, etat.d5) : null
  ok(d5 && fiche5?.etiquette === '5e B' && fiche5.couleur === '#3b6fb6' && fiche5.parent === null && d5.infos === 'Vide' && d5.puces.join() === '5e B', 'Entrée : « 5e B » créé (étiquette « 5e B », Bleu, à la racine) ; sa carte : « Vide », sa puce « 5e B »', { d5, fiche5 })
  ok(!v.conseil && v.focus === d5?.cle, '   … le conseil s\'en va (un dossier existe) ; le focus sur la carte du nouveau dossier', v)
  ok((await toasts(p)).some(t => t.includes('Dossier « 5e B » créé : ses classeurs porteront l\'étiquette « 5e B ».')), '   … le message le dit')
  // « 2nde 3 » : cochée ; « Archives » : pas cochée ; on change la couleur
  await p.click('.biblio-actions [data-action="nouveau-dossier"]'); await p.waitForTimeout(200)
  await p.keyboard.type('2nde 3')
  c = await p.evaluate(() => document.querySelector('dialog input[name="classe"]').checked)
  await p.click('dialog .pastille-couleur[title="Vert"]')
  await p.click('dialog [data-a="creer"]'); await p.waitForTimeout(400)
  await p.click('.biblio-actions [data-action="nouveau-dossier"]'); await p.waitForTimeout(200)
  await p.keyboard.type('Archives')
  const cArch = await p.evaluate(() => ({ coche: document.querySelector('dialog input[name="classe"]').checked }))
  // Vide : refusé dans la fenêtre
  await p.fill('dialog input[name="nom"]', '   ')
  await p.click('dialog [data-a="creer"]'); await p.waitForTimeout(150)
  const vide = await dialogues(p)
  await p.fill('dialog input[name="nom"]', 'Archives')
  await p.click('dialog [data-a="creer"]'); await p.waitForTimeout(400)
  v = await vue(p)
  const ds = await p.evaluate(async () => (await window.__registre.dossiers()).map(d => ({ nom: d.nom, etiquette: d.etiquette ?? null, couleur: d.couleur })).sort((a, b) => a.nom < b.nom ? -1 : 1))
  ok(c && !cArch.coche, '« 2nde 3 » : cochée d\'office ; « Archives » : pas cochée', { c, cArch })
  ok(vide[0]?.erreur === 'Un dossier a besoin d\'un nom.', '   … un nom vide : « Un dossier a besoin d\'un nom. », la fenêtre reste', vide)
  ok(JSON.stringify(ds) === JSON.stringify([{ nom: '2nde 3', etiquette: '2nde 3', couleur: '#2f8a57' }, { nom: '5e B', etiquette: '5e B', couleur: '#3b6fb6' }, { nom: 'Archives', etiquette: null, couleur: '#3b6fb6' }]), '   … dans l\'index : « 2nde 3 » (vert, étiquette), « 5e B », « Archives » (sans étiquette)', ds)
  ok(v.grille.map(x => (x.dossier ? 'd:' : '') + x.nom).join() === 'd:2nde 3,d:5e B,d:Archives,Premier classeur', '   … la grille : les dossiers d\'abord, par nom (« 2nde 3 » avant « 5e B »), puis les classeurs', v.grille.map(x => x.nom))
  ok(v.grille.find(x => x.nom === '2nde 3')?.couleur === '#2f8a57' && v.grille.find(x => x.nom === '2nde 3').label === '2nde 3, dossier vert, dossier d\'une classe, vide', '   … la carte de « 2nde 3 » : sa couleur, « 2nde 3, dossier vert, dossier d\'une classe, vide » au lecteur d\'écran', v.grille.find(x => x.nom === '2nde 3'))
  etat.d2 = v.grille.find(x => x.nom === '2nde 3').cle.slice(2)
  etat.dA = v.grille.find(x => x.nom === 'Archives').cle.slice(2)
  ok(v.filtre === null, '   … pas encore de rangée de filtre : aucun classeur ne porte d\'étiquette')
  await p.screenshot({ path: CAPTURES + 'A-dossiers.png' })
}

// =====================================================================
// B. LE FILTRE DE CLASSE ET LES ÉTIQUETTES
// =====================================================================
if (etat.p && (seul('B') || seul('C') || seul('D') || seul('E') || seul('F'))) {
  console.log('\n=== B. un classeur dans « 5e B », les étiquettes, le filtre ===')
  const p = etat.p
  // Entrer dans « 5e B » (un clic)
  await p.click(`${sel('d:' + etat.d5)} .dossier-icone`); await p.waitForTimeout(300)
  let v = await vue(p)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","5e B*"]' && !v.recents.length && v.videDossier === 'Ce dossier est vide. Glissez-y un classeur, ou créez-en un.' && v.session.dossier === etat.d5,
    'Un clic sur « 5e B » : le fil « Bibliothèque › 5e B », Récents caché, « Ce dossier est vide… », retenu pour l\'onglet', v)
  ok(v.focus === 'biblio-bouton', '   … le focus sur « Nouveau classeur » du dossier vide', v.focus)
  // Nouveau classeur dans « 5e B »
  await p.click('.biblio-nouveau'); await p.waitForTimeout(250)
  const dans = await p.evaluate(() => document.querySelector('dialog.dialogue-nouveau[open] .dans')?.textContent.replace(/[  ]/g, ' '))
  ok(dans === 'Dans : 5e B · étiquette de classe « 5e B »', `« Nouveau classeur » dans « 5e B » : « ${dans} » (pas de champ d'étiquette)`, dans)
  await p.fill('dialog input[name="nom"]', 'Symétrie centrale')
  await allerPar(p, () => p.keyboard.press('Enter'))
  const sym = await p.evaluate(() => window.__app.classeur.id)
  etat.sym = sym
  const fs = await fiche(p, sym)
  ok(fs.dossier === etat.d5 && JSON.stringify(fs.etiquettes) === '[]', 'Le classeur est créé dans « 5e B », sans étiquette propre écrite', fs)
  await ouvrirBiblio(p)
  v = await vue(p)
  const cs = v.grille.find(x => x.cle === sym)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","5e B*"]' && cs && cs.puces.join() === '~5e B' && cs.titres[0] === 'Étiquette du dossier « 5e B »', 'Revenu dans la bibliothèque : on est toujours dans « 5e B » (l\'onglet) ; sa puce « 5e B », héritée (« Étiquette du dossier « 5e B » »)', { fil: v.fil, cs })
  ok(/classe 5e B, ouvert dans cet onglet$/.test(cs?.label ?? ''), `   … le lecteur d'écran : « ${cs?.label} »`, cs)
  ok(JSON.stringify(v.filtre) === '["Toutes*","5e B · 1"]', '   … la rangée du filtre paraît : « Toutes », « 5e B · 1 »', v.filtre)
  // Un classeur dans « Archives » avec l'étiquette propre « 5e B », par la fenêtre
  const [vieux] = await creerPlusieurs(p, 1, { dossier: etat.dA, noms: ['Symétrie 2025'] })
  etat.vieux = vieux
  // (fait à la main dans l'index : cet onglet relit, comme à l'ouverture)
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.click('.biblio-fil button'); await p.waitForTimeout(250)
  await p.click(`${sel('d:' + etat.dA)} .dossier-icone`); await p.waitForTimeout(250)
  await ouvrirMenu(p, vieux)
  v = await vue(p)
  // (Adapté au lot 4, morceau C7 : le menu gagne, après ces trois entrées,
  // « Déplacer vers… » et « Dupliquer le classeur » ; au morceau C9,
  // « Enregistrer dans un fichier… »)
  ok(v.menu?.entrees.join() === 'ouvrir-classeur,renommer,etiquettes,deplacer,dupliquer,enregistrer-classeur,supprimer' && v.menu.libelles.slice(0, 3).join('|') === 'OuvrirEntrée|Renommer…F2|Étiquettes de classe…', 'Le menu d\'un classeur : « Ouvrir », « Renommer… » (F2), « Étiquettes de classe… »', v.menu)
  await choisir(p, 'etiquettes')
  const e0 = await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-etiquettes[open]'); return { titre: d?.querySelector('h2').textContent, pour: d?.querySelector('.pour').textContent.replace(/[  ]/g, ' '), puces: [...d.querySelectorAll('.puces li')].map(l => l.textContent), focus: document.activeElement?.name, liste: [...d.querySelectorAll('datalist option')].map(o => o.value), max: d.querySelector('input[name="etiquette"]').maxLength, label: d.querySelector('.champ span').textContent } })
  ok(e0.titre === 'Étiquettes de classe' && e0.label === 'Ajouter une classe' && e0.focus === 'etiquette' && e0.max === 20 && JSON.stringify(e0.puces) === '["Aucune étiquette"]', '« Étiquettes de classe… » : « Ajouter une classe » (20 caractères), le focus dedans, aucune étiquette', e0)
  ok(JSON.stringify(e0.liste) === '["5e B"]', '   … les étiquettes de la bibliothèque proposées (datalist) : « 5e B »', e0.liste)
  await p.keyboard.type('5e B'); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  await p.keyboard.type('5e b'); await p.keyboard.press('Enter'); await p.waitForTimeout(200)
  const e1 = await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-etiquettes[open]'); return { puces: [...d.querySelectorAll('.puces li')].map(l => l.textContent), note: d.querySelector('.note').textContent.replace(/[  ]/g, ' '), x: [...d.querySelectorAll('.puce-retirer')].map(b => b.getAttribute('aria-label')) } })
  ok(JSON.stringify(e1.puces) === '["5e B"]' && JSON.stringify(e1.x) === '["Retirer l\'étiquette « 5e B »"]' && e1.note === '« 5e b » y est déjà.', 'Entrée : « 5e B » ajoutée, avec son × ; « 5e b » : un double, ignoré (« y est déjà »)', e1)
  // 3 au plus
  await p.fill('dialog input[name="etiquette"]', '');
  for (const t of ['Soutien', 'Club maths']) { await p.keyboard.type(t); await p.keyboard.press('Enter'); await p.waitForTimeout(250) }
  const e2 = await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-etiquettes[open]'); return { puces: [...d.querySelectorAll('.puces li')].map(l => l.textContent), desactive: d.querySelector('input[name="etiquette"]').disabled, note: d.querySelector('.note').textContent.replace(/[  ]/g, ' ') } })
  ok(JSON.stringify(e2.puces) === '["5e B","Soutien","Club maths"]' && e2.desactive && e2.note === '3 étiquettes au plus : retirez-en une pour en ajouter une autre.', '3 étiquettes : le champ se ferme, la note le dit', e2)
  // Retirer « Club maths » (son ×), puis Fermer : un message avec Annuler
  await p.click('dialog .puce-retirer[aria-label="Retirer l\'étiquette « Club maths »"]'); await p.waitForTimeout(300)
  await p.click('dialog [data-a="fermer"]'); await p.waitForTimeout(400)
  let fv = await fiche(p, vieux)
  const t1 = await toasts(p)
  ok(JSON.stringify(fv.etiquettes) === '["5e B","Soutien"]' && t1.some(t => t.includes('Étiquettes de « Symétrie 2025 » : 5e B, Soutien') && t.includes('Annuler')), '× retire, Fermer : l\'index a « 5e B », « Soutien » ; « Étiquettes de « Symétrie 2025 » : 5e B, Soutien » [Annuler]', { fv: fv.etiquettes, t1 })
  v = await vue(p)
  const cv = v.grille.find(x => x.cle === vieux)
  ok(cv?.puces.join() === '5e B,Soutien' && v.focus === vieux, '   … sa carte : « 5e B », « Soutien » (propres, pas grisées) ; le focus revient à la carte', { cv, f: v.focus })
  ok(JSON.stringify(v.filtre) === '["Toutes*","5e B · 2","Soutien · 1"]', '   … le filtre : « 5e B · 2 », « Soutien · 1 » (les classes d\'abord)', v.filtre)
  // Annuler (le message) : les étiquettes d'avant
  await p.click('.toast .action'); await p.waitForTimeout(400)
  fv = await fiche(p, vieux)
  ok(JSON.stringify(fv.etiquettes) === '[]', '« Annuler » : plus d\'étiquette propre', fv.etiquettes)
  // On la remet (5e B seulement)
  await ouvrirMenu(p, vieux); await choisir(p, 'etiquettes')
  await p.keyboard.type('5e B'); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  fv = await fiche(p, vieux)
  ok(JSON.stringify(fv.etiquettes) === '["5e B"]', 'Échap ferme la fenêtre, l\'étiquette ajoutée reste', fv.etiquettes)
  // La fenêtre d'un classeur de « 5e B » : l'héritée grisée, sans ×
  await toasts(p)
  await p.click('.biblio-fil button'); await p.waitForTimeout(250)
  await p.click(`${sel('d:' + etat.d5)} .dossier-icone`); await p.waitForTimeout(250)
  await ouvrirMenu(p, sym); await choisir(p, 'etiquettes')
  const e3 = await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-etiquettes[open]'); const h = d.querySelector('.puce.heritee'); return { heritee: h?.textContent.replace(/[  ]/g, ' '), x: !!h?.querySelector('button'), liste: [...d.querySelectorAll('datalist option')].map(o => o.value) } })
  ok(e3.heritee === '5e Bvient du dossier « 5e B »' && !e3.x && !e3.liste.includes('5e B'), 'Un classeur de « 5e B » : l\'étiquette héritée grisée, « vient du dossier « 5e B » », sans × ; elle n\'est pas reproposée', e3)
  await p.keyboard.type('5e B'); await p.keyboard.press('Enter'); await p.waitForTimeout(200)
  const e4 = await p.evaluate(() => document.querySelector('dialog.dialogue-etiquettes[open] .note').textContent.replace(/[  ]/g, ' '))
  ok(e4 === '« 5e B » y est déjà.', '   … « 5e B » tapé : un double de l\'héritée, ignoré', e4)
  await p.click('dialog [data-a="fermer"]'); await p.waitForTimeout(300)
  ok(JSON.stringify((await fiche(p, sym)).etiquettes) === '[]' && !(await toasts(p)).some(t => t.startsWith('Étiquettes')), '   … rien n\'est écrit, pas de message')
  // Le filtre « 5e B » : les deux, avec leur chemin, quel que soit leur dossier
  await p.click('.biblio-filtre .filtre-etiquette[data-etiquette="5e b"]'); await p.waitForTimeout(300)
  v = await vue(p)
  ok(JSON.stringify(v.filtre) === '["Toutes","5e B · 2*"]' && JSON.stringify(v.fil) === '["Classe « 5e B »*"]' && v.grilleLabel === 'Classeurs de la classe « 5e B »' && v.session.filtre === '5e B',
    'Le filtre « 5e B » (aria-pressed) : « Classe « 5e B » », retenu pour l\'onglet', v)
  ok(v.grille.length === 2 && v.grille.every(x => !x.dossier) && JSON.stringify(v.grille.map(x => [x.nom, x.chemin]).sort()) === JSON.stringify([['Symétrie 2025', 'Archives'], ['Symétrie centrale', '5e B']]),
    '   … tous les classeurs qui la portent, en liste plate, avec leur chemin sous le nom : « Symétrie centrale » (5e B), « Symétrie 2025 » (Archives)', v.grille)
  ok(/dans Archives/.test(v.grille.find(x => x.nom === 'Symétrie 2025')?.label ?? ''), '   … le lecteur d\'écran dit le dossier (« dans Archives »)', v.grille)
  await p.screenshot({ path: CAPTURES + 'B-filtre.png' })
  // Échap : le filtre d'abord, puis l'écran
  await p.keyboard.press('Escape'); await p.waitForTimeout(250)
  v = await vue(p)
  ok(v.ouvert && JSON.stringify(v.filtre) === '["Toutes*","5e B · 2"]' && JSON.stringify(v.fil) === '["Bibliothèque","5e B*"]' && v.session.filtre === null, 'Échap : le filtre s\'en va d\'abord (on retrouve « 5e B »), l\'écran reste', v)
  // Glissé hors de « 5e B » (comme le fera « Déplacer vers… ») : il quitte le filtre
  await p.evaluate(async ({ id, d }) => { await window.__registre.modifierClasseur(id, x => { x.dossier = d }) }, { id: sym, d: etat.dA })
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(200)
  v = await vue(p)
  ok(JSON.stringify(v.filtre) === '["Toutes*","5e B · 1"]', 'Rangé dans « Archives », il sort du filtre « 5e B » (l\'étiquette n\'était pas écrite)', v.filtre)
  await p.evaluate(async ({ id, d }) => { await window.__registre.modifierClasseur(id, x => { x.dossier = d }) }, { id: sym, d: etat.d5 })
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(200)
  ok(JSON.stringify((await vue(p)).filtre) === '["Toutes*","5e B · 2"]', '   … remis dans « 5e B », il y revient', (await vue(p)).filtre)
}

// =====================================================================
// C. UN SOUS-DOSSIER, LE FIL D'ARIANE
// =====================================================================
if (etat.p && (seul('C') || seul('D') || seul('E') || seul('F'))) {
  console.log('\n=== C. un sous-dossier, le fil d\'Ariane, Retour arrière ===')
  const p = etat.p
  // Dans « 5e B » : « Nouveau dossier » « Géométrie »
  await p.click('.biblio-actions [data-action="nouveau-dossier"]'); await p.waitForTimeout(200)
  const dansDossier = await p.evaluate(() => document.querySelector('dialog.dialogue-dossier[open] .dans')?.textContent)
  await p.keyboard.type('Géométrie')
  const cg = await p.evaluate(() => document.querySelector('dialog input[name="classe"]').checked)
  await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  let v = await vue(p)
  const geo = v.grille.find(x => x.dossier && x.nom === 'Géométrie')
  etat.geo = geo?.cle.slice(2)
  ok(dansDossier === 'Dans : 5e B' && !cg && geo && (await dossierLu(p, etat.geo)).parent === etat.d5, '« Nouveau dossier » dans « 5e B » : « Dans : 5e B », pas une classe ; il se crée dans « 5e B »', { dansDossier, cg, geo })
  ok(v.grille.map(x => x.nom).join() === 'Géométrie,Symétrie centrale', '   … la grille de « 5e B » : le sous-dossier, puis le classeur', v.grille.map(x => x.nom))
  // Entrée sur le dossier (le clavier)
  await p.focus(carteCle('d:' + etat.geo)); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  v = await vue(p)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","5e B","Géométrie*"]' && v.videDossier && v.grilleLabel === 'Dossier « Géométrie »', 'Entrée sur « Géométrie » : « Bibliothèque › 5e B › Géométrie », chaque dossier au-dessus un bouton', v)
  // Un classeur dedans : il hérite de « 5e B » (le plus proche dossier de classe)
  const [tri] = await creerPlusieurs(p, 1, { dossier: etat.geo, noms: ['Triangles'] })
  etat.tri = tri
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(250)
  v = await vue(p)
  ok(v.grille.find(x => x.cle === tri)?.puces.join() === '~5e B', '   … un classeur de « Géométrie » porte « 5e B », hérité du plus proche dossier de classe', v.grille)
  // Le fil : « 5e B » ramène dans « 5e B », le focus sur « Géométrie »
  await p.click('.biblio-fil button:text("5e B")'); await p.waitForTimeout(300)
  v = await vue(p)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","5e B*"]' && v.focus === 'd:' + etat.geo, 'Le fil : « 5e B » ramène dans « 5e B », le focus sur la carte de « Géométrie »', v)
  const g = v.grille.find(x => x.cle === 'd:' + etat.geo)
  const c5 = await p.evaluate(id => window.__bibliotheque && null, null)
  ok(g?.infos === '1 classeur', `   … « Géométrie » : « ${g?.infos} »`, g)
  // Retour arrière : la racine, le focus sur « 5e B » ; sa carte : « 2 classeurs · 1 dossier »
  await p.keyboard.press('Backspace'); await p.waitForTimeout(300)
  v = await vue(p)
  const cd5 = v.grille.find(x => x.cle === 'd:' + etat.d5)
  ok(JSON.stringify(v.fil) === '["Bibliothèque*"]' && v.focus === 'd:' + etat.d5 && v.recents.length > 0 && v.session.dossier === null, 'Retour arrière : la racine (Récents revient), le focus sur « 5e B »', v)
  ok(cd5?.infos === '2 classeurs · 1 dossier' && cd5.label === '5e B, dossier bleu, dossier d\'une classe, 2 classeurs, 1 dossier', `   … « 5e B » : « ${cd5?.infos} » (sous-dossiers compris)`, cd5)
  // Dans un champ, Retour arrière efface (il ne remonte pas)
  await p.keyboard.press('Backspace'); await p.waitForTimeout(150)
  ok((await vue(p)).ouvert, '   … à la racine, Retour arrière ne fait rien (l\'écran reste)')
  // Retenu pour l'onglet : on recharge dans « Géométrie »
  await p.click(`${sel('d:' + etat.d5)} .dossier-icone`); await p.waitForTimeout(250)
  await p.click(`${sel('d:' + etat.geo)} .dossier-icone`); await p.waitForTimeout(250)
  await p.reload(); await pret(p); await p.waitForTimeout(300)
  await ouvrirBiblio(p)
  v = await vue(p)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","5e B","Géométrie*"]', 'Recharger la page : la bibliothèque rouvre « Géométrie » (sessionStorage)', v.fil)
  // Un autre onglet commence à la racine
  const autre = await ouvrir(etat.ctx, '', 'C-autre')
  await ouvrirBiblio(autre)
  ok(JSON.stringify((await vue(autre)).fil) === '["Bibliothèque*"]', '   … un autre onglet commence à la racine', (await vue(autre)).fil)
  await autre.close()
  await p.keyboard.press('Backspace'); await p.waitForTimeout(150)
  await p.keyboard.press('Backspace'); await p.waitForTimeout(250)
}

// =====================================================================
// D. LE MENU D'UN DOSSIER
// =====================================================================
if (etat.p && (seul('D') || seul('E') || seul('F'))) {
  console.log('\n=== D. le menu d\'un dossier : couleur, « Dossier d\'une classe » ===')
  const p = etat.p
  await ouvrirMenu(p, 'd:' + etat.d5)
  let v = await vue(p)
  // (Adapté au lot 4, morceau C7 : le menu d'un dossier gagne « Déplacer vers… » à la fin)
  ok(v.menu?.label === 'Dossier « 5e B »' && v.menu.entrees.join() === 'ouvrir-dossier,renommer-dossier,couleur,couleur*,couleur,couleur,couleur,couleur,couleur,couleur,classe-dossier*,deplacer-dossier,enregistrer-dossier,supprimer-dossier',
    'Le menu d\'un dossier : « Ouvrir », « Renommer… », les 8 couleurs (Bleu cochée), « Dossier d\'une classe » (cochée)', v.menu)
  ok(v.menu.libelles.slice(2, 10).join() === 'Gris,Bleu,Vert,Jaune,Orange,Rouge,Violet,Rose' && v.menu.libelles[10] === 'Dossier d\'une classeSes classeurs portent l\'étiquette « 5e B »', '   … les couleurs nommées pour le lecteur d\'écran ; l\'aide de la case', v.menu.libelles)
  await p.screenshot({ path: CAPTURES + 'D-menu-dossier.png' })
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-couleur="#c24a4a"]'); await p.waitForTimeout(300)
  v = await vue(p)
  const t = await toasts(p)
  ok(v.grille.find(x => x.cle === 'd:' + etat.d5)?.couleur === '#c24a4a' && (await dossierLu(p, etat.d5)).couleur === '#c24a4a' && t.some(x => x.includes('Couleur du dossier « 5e B » : rouge') && x.includes('Annuler')), 'Rouge : la carte et l\'index ; « Couleur du dossier « 5e B » : rouge » [Annuler]', t)
  await p.click('.toast .action'); await p.waitForTimeout(300)
  ok((await dossierLu(p, etat.d5)).couleur === '#3b6fb6', '   … Annuler : Bleu de nouveau')
  // La case : plus un dossier de classe → ses classeurs perdent l'étiquette
  await ouvrirMenu(p, 'd:' + etat.d5); await choisir(p, 'classe-dossier')
  v = await vue(p)
  ok(!(await dossierLu(p, etat.d5)).etiquette && JSON.stringify(v.filtre) === '["Toutes*","5e B · 1"]' && v.grille.find(x => x.cle === 'd:' + etat.d5)?.puces.length === 0 && (await toasts(p)).some(x => x.includes('« 5e B » n\'est plus un dossier de classe.')),
    '« Dossier d\'une classe » décochée : ses classeurs ne portent plus « 5e B » (il ne reste que celui d\'Archives)', v.filtre)
  await p.click('.toast .action'); await p.waitForTimeout(300)
  v = await vue(p)
  ok((await dossierLu(p, etat.d5)).etiquette === '5e B' && JSON.stringify(v.filtre) === '["Toutes*","5e B · 3"]', '   … Annuler : de nouveau un dossier de classe (3 classeurs, avec celui de « Géométrie »)', v.filtre)
  // Au clavier : Menu, puis les flèches jusqu'à « Renommer… »
  await p.focus(carteCle('d:' + etat.d5))
  await p.keyboard.press('ContextMenu'); await p.waitForTimeout(150)
  v = await vue(p)
  const f0 = await p.evaluate(() => document.activeElement?.dataset.action)
  ok(v.menu && f0 === 'ouvrir-dossier', 'La touche Menu sur un dossier : son menu, le focus sur « Ouvrir »', f0)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  ok((await vue(p)).focus === 'd:' + etat.d5, '   … Échap : le focus revient à la carte du dossier')
}

// =====================================================================
// E. RENOMMER
// =====================================================================
if (etat.p && (seul('E') || seul('F'))) {
  console.log('\n=== E. renommer ===')
  const p = etat.p
  const ici = await p.evaluate(() => window.__app.classeur.id)
  const [a, b] = await creerPlusieurs(p, 2, { noms: ['Fractions', 'Puissances'] })
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(250)
  // À la souris : un double-clic sur le nom
  await p.dblclick(`${sel(a)} .carte-nom-classeur`); await p.waitForTimeout(250)
  let v = await vue(p)
  ok(v.saisie && v.saisie.valeur === 'Fractions' && v.saisie.focus && v.saisie.choisi && v.saisie.max === 60 && v.saisie.cle === a && p.url().endsWith('?classeur=' + ici), 'Un double-clic sur le nom : un champ dans la carte, prérempli, tout choisi, 60 caractères ; rien ne s\'ouvre', v.saisie)
  const geom = await p.evaluate(() => { const i = document.querySelector('.carte-saisie').getBoundingClientRect(), n = document.querySelector('.carte-saisie').closest('li').querySelector('.carte-nom-classeur').getBoundingClientRect(); return { i: Math.round(i.top), n: Math.round(n.top), dans: i.left >= n.left - 8 && i.right <= n.right + 8 } })
  ok(Math.abs(geom.i + 7 - geom.n) <= 2 && geom.dans, '   … le champ est posé sur le nom', geom)
  await p.screenshot({ path: CAPTURES + 'E-renommer.png' })
  await p.keyboard.type('Fractions et décimaux'); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  v = await vue(p)
  let fa = await fiche(p, a)
  let t = await toasts(p)
  ok(!v.saisie && fa.nom === 'Fractions et décimaux' && v.grille.find(x => x.cle === a)?.nom === 'Fractions et décimaux' && v.focus === a, 'Entrée : « Fractions et décimaux » (la carte, l\'index), le focus revient à la carte', { fa: fa.nom, f: v.focus })
  ok(t.some(x => x.includes('Classeur renommé') && x.includes('Annuler')), '   … « Classeur renommé » [Annuler]', t)
  ok(JSON.stringify(await infosBase(p, fa.base)) === JSON.stringify({ id: a, nom: 'Fractions et décimaux' }), '   … son identité dans sa base (custom) suit, pour une adoption', await infosBase(p, fa.base))
  await p.click('.toast .action'); await p.waitForTimeout(400)
  fa = await fiche(p, a)
  ok(fa.nom === 'Fractions' && (await vue(p)).grille.find(x => x.cle === a)?.nom === 'Fractions' && (await infosBase(p, fa.base))?.nom === 'Fractions', 'Annuler : « Fractions » de nouveau (la carte, l\'index, la base)', fa.nom)
  // Au clavier : F2, Échap rend l'ancien
  await p.focus(carteCle(b)); await p.keyboard.press('F2'); await p.waitForTimeout(150)
  v = await vue(p)
  ok(v.saisie?.cle === b && v.saisie.choisi, 'F2 sur la carte qui a le focus : le champ, tout choisi', v.saisie)
  await p.keyboard.type('Rien'); await p.keyboard.press('Escape'); await p.waitForTimeout(250)
  v = await vue(p)
  ok(!v.saisie && (await fiche(p, b)).nom === 'Puissances' && v.focus === b && v.ouvert, '   … Échap : l\'ancien nom, le focus sur la carte, l\'écran reste', v)
  // Un nom vide est refusé
  await p.keyboard.press('F2'); await p.waitForTimeout(150)
  await p.keyboard.press('Backspace'); await p.keyboard.press('Enter'); await p.waitForTimeout(250)
  v = await vue(p)
  t = await toasts(p)
  ok(v.saisie?.valeur === '' && t.some(x => x.includes('Un classeur a besoin d\'un nom.')), 'Un nom vide, Entrée : « Un classeur a besoin d\'un nom. », le champ reste', { s: v.saisie, t })
  await p.keyboard.type('Ch. 10'); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  ok((await fiche(p, b)).nom === 'Ch. 10' && (await vue(p)).focus === b, '   … « Ch. 10 », Entrée : renommé, le focus sur la carte')
  // Un clic ailleurs garde
  await p.keyboard.press('F2'); await p.waitForTimeout(150)
  await p.keyboard.type('Ch. 2'); await p.click('.biblio-tete h2'); await p.waitForTimeout(400)
  ok((await fiche(p, b)).nom === 'Ch. 2' && !(await vue(p)).saisie, 'Un clic ailleurs garde le nom tapé (« Ch. 2 »)')
  // Un dossier : « Renommer… » ; un dossier de classe garde son étiquette accordée
  await ouvrirMenu(p, 'd:' + etat.d2); await choisir(p, 'renommer-dossier')
  v = await vue(p)
  ok(v.saisie?.max === 40 && v.saisie.valeur === '2nde 3', '« Renommer… » d\'un dossier : 40 caractères', v.saisie)
  await p.keyboard.press('Backspace'); await p.keyboard.press('Enter'); await p.waitForTimeout(200)
  ok((await toasts(p)).some(x => x.includes('Un dossier a besoin d\'un nom.')), '   … vide : « Un dossier a besoin d\'un nom. »')
  await p.keyboard.type('2nde 4'); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  const d2 = await dossierLu(p, etat.d2)
  ok(d2.nom === '2nde 4' && d2.etiquette === '2nde 4' && (await toasts(p)).some(x => x.includes('Dossier renommé')), '   … « 2nde 4 » : son étiquette de classe suit son nom ; « Dossier renommé »', d2)
  // Le classeur de l'onglet (« Symétrie centrale », dans Récents) : son bouton et le titre de l'onglet suivent
  await p.focus(`.grille-classeurs.recents li[data-cle="${ici}"] .carte-classeur`); await p.keyboard.press('F2'); await p.waitForTimeout(150)
  await p.keyboard.type('Mon cahier de 5e'); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  const b0 = await p.evaluate(() => ({ nom: document.querySelector('.nom-classeur').textContent, titre: document.title, ligne: document.querySelector('.biblio-ouvert .texte-ouvert')?.textContent.replace(/[  ]/g, ' '), app: window.__app.classeur.nom }))
  ok(b0.nom === 'Mon cahier de 5e' && b0.titre === 'Mon cahier de 5e — MEM teachingtool' && b0.app === 'Mon cahier de 5e' && b0.ligne?.startsWith('« Mon cahier de 5e » :'), 'Le classeur de l\'onglet renommé (dans Récents, F2) : son bouton, le titre de l\'onglet, la ligne du classeur ouvert suivent', b0)
  // Le clic simple sur le nom ouvre quand même (après un instant)
  const t0 = Date.now()
  await allerPar(p, () => p.click(`${sel(a)} .carte-nom-classeur`))
  ok(await p.evaluate(() => window.__app.classeur.nom) === 'Fractions' && Date.now() - t0 >= 400, `Un clic simple sur le nom : « Fractions » s'ouvre (après ${Date.now() - t0} ms : on attendait un éventuel second clic)`)
  await allerPar(p, () => p.goBack())
}

// =====================================================================
// F. TRIER
// =====================================================================
if (etat.p && seul('F')) {
  console.log('\n=== F. trier ===')
  const p = etat.p
  await creerPlusieurs(p, 2, { noms: ['Ch. 1', 'ch. 11'] })
  await ouvrirBiblio(p)
  await p.evaluate(() => window.__bibliotheque.charger()); await p.waitForTimeout(250)
  let v = await vue(p)
  await p.click('.biblio-tri'); await p.waitForTimeout(150)
  v = await vue(p)
  ok(v.menu?.label === 'Trier les classeurs' && v.menu.entrees.join() === 'tri-modifie*,tri-nom' && v.menu.libelles.join() === 'Modifiés récemment,Nom (A → Z)', '« Trier : Modifiés récemment » : un petit menu, « Modifiés récemment » (coché), « Nom (A → Z) »', v.menu)
  await choisir(p, 'tri-nom')
  v = await vue(p)
  const noms = v.grille.map(x => (x.dossier ? 'd:' : '') + x.nom)
  ok(v.tri === 'Trier : Nom (A → Z)' && noms.join('|') === 'd:2nde 4|d:5e B|d:Archives|Ch. 1|Ch. 2|ch. 11|Fractions|Premier classeur', 'Nom (A → Z) : les dossiers d\'abord, puis « Ch. 1 », « Ch. 2 », « ch. 11 » (les nombres comme on les lit, sans la casse)', noms)
  ok(await p.evaluate(() => localStorage.getItem('mem-teachingtool-tri')) === 'nom', '   … retenu sur l\'appareil (mem-teachingtool-tri)')
  await p.reload(); await pret(p); await ouvrirBiblio(p)
  ok((await vue(p)).tri === 'Trier : Nom (A → Z)', '   … après un rechargement aussi')
  await p.click('.biblio-tri'); await p.waitForTimeout(100); await choisir(p, 'tri-modifie')
  v = await vue(p)
  ok(v.grille.filter(x => !x.dossier)[0]?.nom === 'Premier classeur', 'Modifiés récemment : le plus récemment modifié d\'abord', v.grille.map(x => x.nom))
  await etat.ctx.close()
}

// =====================================================================
// G. DEUX ONGLETS
// =====================================================================
if (seul('G')) {
  console.log('\n=== G. deux onglets ===')
  const ctx = await contexte()
  const A = await ouvrir(ctx, '', 'G-A')
  const ids = await creerPlusieurs(A, 4)
  const B = await ouvrir(ctx, '?classeur=' + ids[2], 'G-B')
  await ouvrirBiblio(A)
  // Le focus sur « Chapitre 2 », au clavier
  await A.focus(carteCle(ids[1]))
  const avant = await A.evaluate(id => document.querySelector(`.grille-classeurs.tous li[data-cle="${id}"]`), ids[1])
  // B renomme « Chapitre 2 » dans sa bibliothèque
  await ouvrirBiblio(B)
  await B.focus(carteCle(ids[1])); await B.keyboard.press('F2'); await B.waitForTimeout(150)
  await B.keyboard.type('Statistiques'); await B.keyboard.press('Enter'); await B.waitForTimeout(800)
  const vA = await vue(A)
  const meme = await A.evaluate(id => document.activeElement === document.querySelector(`.grille-classeurs.tous li[data-cle="${id}"] .carte-classeur`), ids[1])
  ok(vA.grille.find(x => x.cle === ids[1])?.nom === 'Statistiques' && meme, 'Un renommage dans un autre onglet : la carte suit, le focus reste sur elle', { nom: vA.grille.find(x => x.cle === ids[1])?.nom, meme, f: vA.focus })
  // A renomme le classeur ouvert dans B : son bouton et son titre suivent
  await A.focus(carteCle(ids[2])); await A.keyboard.press('F2'); await A.waitForTimeout(150)
  await A.keyboard.type('Probabilités'); await A.keyboard.press('Enter'); await A.waitForTimeout(800)
  const bB = await B.evaluate(() => ({ nom: document.querySelector('.nom-classeur').textContent, titre: document.title, carte: document.querySelector('.grille-classeurs.recents .case-classeur.ouvert-ici .carte-nom-classeur')?.textContent }))
  ok(bB.nom === 'Probabilités' && bB.titre === 'Probabilités — MEM teachingtool' && bB.carte === 'Probabilités', 'Le classeur ouvert dans l\'autre onglet, renommé ici : là-bas, son bouton, le titre de l\'onglet et sa carte suivent', bB)
  // Un renommage pendant que l'autre tape un nom : rien ne vole son champ
  await A.focus(carteCle(ids[0])); await A.keyboard.press('F2'); await A.waitForTimeout(100)
  await A.keyboard.type('Algèbre')
  await B.evaluate(async id => { await window.__registre.modifierClasseur(id, x => { x.nom = 'Ailleurs' }) }, ids[3]); await A.waitForTimeout(500)
  const s = await vue(A)
  ok(s.saisie?.valeur.endsWith('Algèbre') && s.saisie.focus, '   … un changement venu de l\'autre onglet pendant qu\'on tape un nom : le champ garde le focus', s.saisie)
  await A.keyboard.press('Enter'); await A.waitForTimeout(500)
  const vA2 = await vue(A)
  ok(vA2.grille.find(x => x.cle === ids[3])?.nom === 'Ailleurs' && vA2.grille.find(x => x.cle === ids[0])?.nom === 'Algèbre', '   … à la fermeture du champ, le changement de l\'autre onglet se fait', vA2.grille.map(x => x.nom))
  await ctx.close()
}

// =====================================================================
// H. UN CYCLE ÉCRIT À LA MAIN
// =====================================================================
if (seul('H')) {
  console.log('\n=== H. un cycle A → B → A dans l\'index ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'H')
  const A = await creerDossier(p, 'A', { etiquette: '5e A' })
  const B = await creerDossier(p, 'B', { parent: A })
  const C = await creerDossier(p, 'C', { parent: A })
  const [dansB] = await creerPlusieurs(p, 1, { dossier: B, noms: ['Dans B'] })
  const [dansC] = await creerPlusieurs(p, 1, { dossier: C, noms: ['Dans C'] })
  // Le cycle : A dans B (deux onglets qui déplacent chacun l'un dans l'autre), écrit à la main
  await p.evaluate(({ A, B }) => new Promise((ok, ko) => {
    const r = indexedDB.open('mem-teachingtool-bibliotheque')
    r.onsuccess = () => { const db = r.result; const t = db.transaction(['dossiers'], 'readwrite'); const s = t.objectStore('dossiers'); const g = s.get(A); g.onsuccess = () => { s.put({ ...g.result, parent: B }) }; t.oncomplete = () => { db.close(); ok() }; t.onerror = () => ko(t.error) }
  }), { A, B })
  // Le dernier classeur ouvert est dans le cycle : le démarrage le rouvre
  await allerPar(p, () => p.evaluate(id => { location.href = '?classeur=' + id }, dansC))
  const t0 = Date.now()
  await p.reload(); await pret(p)
  ok(await p.evaluate(() => window.__app.classeur.nom) === 'Dans C', `Le démarrage marche (le classeur rangé sous le cycle s'ouvre, ${Date.now() - t0} ms)`)
  await ouvrirBiblio(p)
  let v = await vue(p)
  ok(v.grille.filter(x => x.dossier).map(x => x.nom).join() === 'A,B', 'La bibliothèque s\'affiche : A et B, chacun dans l\'autre, se montrent à la racine', v.grille.map(x => x.nom))
  await p.click(`${sel('d:' + A)} .dossier-icone`); await p.waitForTimeout(300)
  v = await vue(p)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","A*"]' && v.grille.map(x => x.nom).join() === 'C', '   … dans A : C (B n\'y est pas : le cycle vaut la racine) ; le fil « Bibliothèque › A »', v)
  await p.click(`${sel('d:' + C)} .dossier-icone`); await p.waitForTimeout(300)
  v = await vue(p)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","A","C*"]' && v.grille[0]?.puces.join() === '~5e A', '   … dans C : « Bibliothèque › A › C » ; « Dans C » hérite « 5e A »', v)
  await p.keyboard.press('Backspace'); await p.waitForTimeout(200); await p.keyboard.press('Backspace'); await p.waitForTimeout(200)
  v = await vue(p)
  const cA = v.grille.find(x => x.cle === 'd:' + A), cB = v.grille.find(x => x.cle === 'd:' + B)
  ok(JSON.stringify(v.fil) === '["Bibliothèque*"]' && cA?.infos === '1 classeur · 1 dossier' && cB?.infos === '1 classeur', 'Retour arrière deux fois : la racine ; A « 1 classeur · 1 dossier », B « 1 classeur » : tout se compte et finit', { cA, cB })
  // Déplacer B dans A le refuse (le registre voit le cycle dans sa transaction)
  const refus = await p.evaluate(async ({ A, B }) => { try { await window.__registre.deplacerDossier(A, B); return 'accepté' } catch (e) { return e.raison } }, { A, B })
  ok(refus === 'cycle', '   … le registre refuse de refaire un cycle (deplacerDossier : « cycle »)', refus)
  await ctx.close()
}

// =====================================================================
// I. LE TÉLÉPHONE
// =====================================================================
if (seul('I')) {
  console.log('\n=== I. le téléphone (390 × 844) ===')
  const ctx = await contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const p = await ouvrir(ctx, '', 'I')
  const d = await creerDossier(p, '5e B', { etiquette: '5e B' })
  await creerDossier(p, 'Archives')
  const ids = await creerPlusieurs(p, 8, { dossier: d })
  await creerPlusieurs(p, 2, { etiquettes: ['2nde 3'], prefixe: 'Seconde' })
  await ouvrirBiblio(p)
  let geo = await p.evaluate(() => ({ page: document.documentElement.scrollWidth - innerWidth, corps: (c => c.scrollWidth - c.clientWidth)(document.querySelector('.biblio-corps')),
    boutons: [...document.querySelectorAll('.biblio-actions .biblio-bouton:not([hidden])')].map(b => Math.round(b.getBoundingClientRect().top)), dossier: document.querySelector('[data-action="nouveau-dossier"]').getAttribute('aria-label'),
    filtre: [...document.querySelectorAll('.filtre-etiquette')].map(b => Math.round(b.getBoundingClientRect().height)) }))
  ok(geo.page <= 0 && geo.corps <= 0, 'Aucun défilement de côté', geo)
  ok(new Set(geo.boutons).size === 1 && geo.dossier === 'Nouveau dossier', '   … « Nouveau classeur » et « Dossier » sur une seule ligne (le nom accessible reste « Nouveau dossier »)', geo)
  ok(geo.filtre.every(h => h >= 40), '   … les étiquettes du filtre : 40 px au moins (le doigt)', geo.filtre)
  await p.screenshot({ path: CAPTURES + 'I-telephone.png' })
  // Un toucher sur le dossier : on y entre
  await p.tap(`${sel('d:' + d)} .dossier-icone`); await p.waitForTimeout(300)
  let v = await vue(p)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","5e B*"]' && v.grille.length === 8, 'Un toucher sur « 5e B » : on y entre', v.fil)
  // Renommer au doigt : ⋯, « Renommer… » ; le clavier virtuel couvre le bas
  await p.evaluate(() => {
    // Un clavier virtuel de 380 px : la fenêtre visible ne fait plus que 464 px
    const vrai = window.visualViewport, ecouteurs = []
    window.__clavier = { offsetTop: 0, height: innerHeight, width: innerWidth, addEventListener: (t, f) => ecouteurs.push(f), removeEventListener: (t, f) => { const i = ecouteurs.indexOf(f); if (i >= 0) ecouteurs.splice(i, 1) } }
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => window.__clavier })
    window.__ouvrirClavier = () => { window.__clavier.height = innerHeight - 380; for (const f of [...ecouteurs]) f(new Event('resize')) }
    window.__vraiVV = vrai
  })
  const bas = ids[0]
  await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 })
  await p.tap(`${sel(bas)} .options-classeur`); await p.waitForTimeout(200)
  await p.tap('.menu-flottant:not([hidden]) .menu-item[data-action="renommer"]'); await p.waitForTimeout(250)
  await p.evaluate(() => window.__ouvrirClavier()); await p.waitForTimeout(200)
  const r = await p.evaluate(() => { const i = document.querySelector('.carte-saisie'); const x = i?.getBoundingClientRect(); return { haut: Math.round(x?.top), bas: Math.round(x?.bottom), visible: innerHeight - 380, focus: document.activeElement === i, fs: getComputedStyle(i).fontSize } })
  ok(r.focus && r.bas <= r.visible && r.haut >= 0 && r.fs === '16px', `Renommer au doigt (⋯, « Renommer… ») : le champ (16 px : pas de zoom) reste au-dessus du clavier virtuel (bas ${r.bas} ≤ ${r.visible})`, r)
  await p.keyboard.type('Statistiques'); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  ok((await fiche(p, bas)).nom === 'Statistiques', '   … renommé', (await fiche(p, bas)).nom)
  await p.screenshot({ path: CAPTURES + 'I-renommer.png' })
  // La fenêtre « Nouveau dossier » tient dans l'écran
  await p.tap('.biblio-actions [data-action="nouveau-dossier"]'); await p.waitForTimeout(250)
  const dl = await p.evaluate(() => { const r = document.querySelector('dialog[open]').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight } })
  ok(dl.l >= 0 && dl.r <= dl.w && dl.t >= 0 && dl.b <= dl.h, '« Nouveau dossier » tient dans l\'écran du téléphone', dl)
  await p.screenshot({ path: CAPTURES + 'I-nouveau-dossier.png' })
  await p.keyboard.press('Escape')
  await ctx.close()
}

// =====================================================================
// J. 30 CLASSEURS DANS 8 DOSSIERS SUR 3 NIVEAUX ; LE TNI ; LE STYLET
// =====================================================================
if (seul('J')) {
  console.log('\n=== J. 30 classeurs dans 8 dossiers sur 3 niveaux ; le TNI ; le stylet ===')
  const ctx = await contexte({ viewport: { width: 1920, height: 1080 }, hasTouch: true })
  const p = await ouvrir(ctx, '', 'J')
  // 5e B › (Géométrie › Triangles, Numérique) ; 2nde 3 › (Fonctions, Statistiques) ; Archives
  const d5 = await creerDossier(p, '5e B', { etiquette: '5e B' })
  const geo = await creerDossier(p, 'Géométrie', { parent: d5 })
  const triangles = await creerDossier(p, 'Triangles', { parent: geo })
  const num = await creerDossier(p, 'Numérique', { parent: d5 })
  const d2 = await creerDossier(p, '2nde 3', { etiquette: '2nde 3', couleur: '#2f8a57' })
  const fon = await creerDossier(p, 'Fonctions', { parent: d2 })
  const sta = await creerDossier(p, 'Statistiques', { parent: d2 })
  const arc = await creerDossier(p, 'Archives', { couleur: '#8a94a6' })
  const places = [[d5, 3], [geo, 4], [triangles, 5], [num, 3], [d2, 2], [fon, 4], [sta, 3], [arc, 6]]
  for (const [d, n] of places) await creerPlusieurs(p, n, { dossier: d, prefixe: 'Ch.' })
  const t0 = Date.now()
  await ouvrirBiblio(p)
  const ms = Date.now() - t0
  let v = await vue(p)
  const compte = Object.fromEntries(v.grille.filter(x => x.dossier).map(x => [x.nom, x.infos]))
  ok(JSON.stringify(compte) === JSON.stringify({ '2nde 3': '9 classeurs · 2 dossiers', '5e B': '15 classeurs · 2 dossiers', Archives: '6 classeurs' }), `30 classeurs dans 8 dossiers : « 5e B » 15 classeurs · 2 dossiers, « 2nde 3 » 9, « Archives » 6 (ouvert en ${ms} ms)`, compte)
  ok(JSON.stringify(v.filtre) === '["Toutes*","5e B · 15","2nde 3 · 9"]', '   … le filtre : « 5e B · 15 », « 2nde 3 · 9 » (tous les niveaux héritent)', v.filtre)
  const colonnes = new Set(v.grille.filter(x => x.y === v.grille[0].y).map(x => x.x)).size
  ok(colonnes <= 8 && v.grille.length === 4, `   … au TNI : la grille (${colonnes} cartes sur la rangée)`, colonnes)
  // Au doigt (TNI) : un toucher entre, trois niveaux
  await p.tap(`${sel('d:' + d5)} .dossier-icone`); await p.waitForTimeout(250)
  await p.tap(`${sel('d:' + geo)} .dossier-icone`); await p.waitForTimeout(250)
  await p.tap(`${sel('d:' + triangles)} .dossier-icone`); await p.waitForTimeout(250)
  v = await vue(p)
  ok(JSON.stringify(v.fil) === '["Bibliothèque","5e B","Géométrie","Triangles*"]' && v.grille.length === 5 && v.grille.every(x => x.puces.join() === '~5e B'), 'Au doigt (TNI) : trois niveaux, « Bibliothèque › 5e B › Géométrie › Triangles », ses 5 classeurs portent « 5e B »', v.fil)
  await p.tap('.biblio-fil button:text("Bibliothèque")'); await p.waitForTimeout(250)
  ok((await vue(p)).focus === 'd:' + d5, '   … « Bibliothèque » du fil : la racine, le focus sur « 5e B »', (await vue(p)).focus)
  await p.click(`.biblio-filtre .filtre-etiquette[data-etiquette="2nde 3"]`); await p.waitForTimeout(250)
  v = await vue(p)
  ok(v.grille.length === 9 && new Set(v.grille.map(x => x.chemin)).size === 3 && v.grille.every(x => /^2nde 3( › (Fonctions|Statistiques))?$/.test(x.chemin)), 'Le filtre « 2nde 3 » : ses 9 classeurs, de ses trois dossiers, avec leur chemin', v.grille.map(x => x.chemin))
  await p.screenshot({ path: CAPTURES + 'J-tni-filtre.png' })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  await ctx.close()
  // Le stylet (Wacom sans écran : maxTouchPoints 0) : le bouton latéral ouvre le menu d'un dossier ; un toucher y entre
  const ctx2 = await contexte()
  const q = await ouvrir(ctx2, '', 'J-stylet')
  const dd = await creerDossier(q, '4e C', { etiquette: '4e C' })
  await creerPlusieurs(q, 1, { dossier: dd })
  await ouvrirBiblio(q)
  const stylet = (cle, type, o = {}) => q.evaluate(({ sel, type, o }) => {
    const a = document.querySelector(sel), r = a.getBoundingClientRect()
    const x = r.left + 50, y = r.top + 40
    const ev = (t, dx = 0, dy = 0, b = o.button ?? 0) => new PointerEvent(t, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'pen', isPrimary: true, button: t === 'pointermove' ? -1 : b, buttons: t === 'pointerup' ? 0 : (b === 2 ? 2 : 1), clientX: x + dx, clientY: y + dy, pressure: 0.5 })
    a.dispatchEvent(ev('pointerdown'))
    if (type === 'droit') { a.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 })); return { x, y } }
    if (type === 'glisser') for (let i = 1; i <= 6; i++) a.dispatchEvent(ev('pointermove', i * 6, i * 2))
    a.dispatchEvent(ev('pointerup', type === 'glisser' ? 36 : 0, type === 'glisser' ? 12 : 0))
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y, button: 0 }))
    return { x, y }
  }, { sel: `.grille-classeurs.tous li[data-cle="${cle}"] .carte-dossier`, type, o })
  await stylet('d:' + dd, 'droit', { button: 2 }); await q.waitForTimeout(150)
  let w = await vue(q)
  ok(w.menu?.label === 'Dossier « 4e C »', 'Le bouton latéral du stylet sur un dossier : son menu', w.menu)
  await q.keyboard.press('Escape'); await q.waitForTimeout(100)
  await stylet('d:' + dd, 'glisser'); await q.waitForTimeout(200)
  ok(JSON.stringify((await vue(q)).fil) === '["Bibliothèque*"]', '   … un glisser de la plume n\'y entre pas')
  await stylet('d:' + dd, 'toucher'); await q.waitForTimeout(250)
  ok(JSON.stringify((await vue(q)).fil) === '["Bibliothèque","4e C*"]', '   … un toucher de la plume y entre')
  await ctx2.close()
}

// =====================================================================
// K. LE CONSEIL ÉCARTÉ ; « CRÉER UN DOSSIER DE CLASSE »
// =====================================================================
if (seul('K')) {
  console.log('\n=== K. le conseil : « Plus tard », « Créer un dossier de classe » ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'K')
  await ouvrirBiblio(p)
  await p.click('.biblio-conseil [data-action="conseil-creer"]'); await p.waitForTimeout(250)
  const c = await p.evaluate(() => ({ coche: document.querySelector('dialog.dialogue-dossier[open] input[name="classe"]')?.checked }))
  await p.keyboard.type('Archives'); await p.waitForTimeout(50)
  const c2 = await p.evaluate(() => document.querySelector('dialog input[name="classe"]').checked)
  ok(c.coche && c2, '« Créer un dossier de classe » : « Nouveau dossier », la case cochée d\'avance (elle le reste, quel que soit le nom)', { c, c2 })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  ok((await vue(p)).conseil, '   … Annuler : le conseil reste')
  await p.click('.biblio-conseil [data-action="conseil-plus-tard"]'); await p.waitForTimeout(250)
  const v = await vue(p)
  ok(!v.conseil && await p.evaluate(async () => await window.__registre.reglage('conseil')) === 'vu' && v.focus === (await p.evaluate(() => window.__app.classeur.id)), '« Plus tard » : le conseil s\'en va (reglage « conseil » : vu), le focus va à une carte', v)
  await p.reload(); await pret(p); await ouvrirBiblio(p)
  ok(!(await vue(p)).conseil, '   … il ne revient pas après un rechargement')
  // Ce qu'un essai sans dossier ni étiquette laisse dans le navigateur : aucune clé de C6
  const cles = await p.evaluate(() => ({ local: Object.keys(localStorage).filter(k => k.startsWith('mem-teachingtool-') && !['mem-teachingtool-dernier-classeur', 'mem-teachingtool-annonce'].includes(k)), session: Object.keys(sessionStorage) }))
  ok(!cles.local.length && !cles.session.length, '   … sans tri ni dossier choisis, aucune clé de rangement n\'est écrite (localStorage, sessionStorage)', cles)
  const tout = await p.evaluate(() => document.querySelector('.bibliotheque').innerText + [...document.querySelectorAll('.bibliotheque [title], .bibliotheque [aria-label]')].map(x => x.title + x.getAttribute('aria-label')).join(' '))
  ok(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(tout), '   … aucun texte « undefined », « NaN » ni « [object Object] »')
  await ctx.close()
}

// =====================================================================
// L. UN DOSSIER QUI PORTE LE NOM D'UNE ÉTIQUETTE ; RETOUR ARRIÈRE DANS UN CHAMP
// =====================================================================
if (seul('L')) {
  console.log('\n=== L. un dossier qui porte le nom d\'une étiquette ; Retour arrière dans un champ ===')
  const ctx = await contexte()
  const p = await ouvrir(ctx, '', 'L')
  // « Soutien » : un dossier ordinaire (pas de classe) ; un classeur à la racine porte l'étiquette propre « Soutien »
  const soutien = await creerDossier(p, 'Soutien')
  const d5 = await creerDossier(p, '5e B', { etiquette: '5e B' })
  const [s1] = await creerPlusieurs(p, 1, { etiquettes: ['Soutien'], noms: ['Remédiation'] })
  // « 5E b » écrit autrement par deux classeurs d'ailleurs : c'est la même classe, écrite comme son dossier
  await creerPlusieurs(p, 2, { etiquettes: ['5E b'], prefixe: 'Ancien' })
  await creerPlusieurs(p, 1, { dossier: d5, noms: ['Symétrie'] })
  await ouvrirBiblio(p)
  let v = await vue(p)
  const cs = v.grille.find(x => x.cle === 'd:' + soutien)
  ok(JSON.stringify(v.filtre) === '["Toutes*","5e B · 3","Soutien · 1"]', 'Le filtre : « 5e B · 3 » (écrite comme son dossier de classe), « Soutien · 1 »', v.filtre)
  ok(cs && cs.puces.length === 0 && cs.infos === 'Vide', '   … le dossier « Soutien » (pas une classe) : ni puce, « Vide » ; l\'étiquette « Soutien » ne vient pas de lui', cs)
  await p.click('.biblio-filtre .filtre-etiquette[data-etiquette="soutien"]'); await p.waitForTimeout(250)
  v = await vue(p)
  ok(v.grille.length === 1 && v.grille[0].cle === s1 && v.grille[0].chemin === 'Bibliothèque', '   … le filtre « Soutien » : le classeur qui la porte (à la racine : « Bibliothèque »), pas le dossier', v.grille)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  // Dans un dossier, Retour arrière dans le champ du nom efface une lettre et ne remonte pas
  await p.click(`${sel('d:' + d5)} .dossier-icone`); await p.waitForTimeout(250)
  v = await vue(p)
  await p.focus(carteCle(v.grille[0].cle)); await p.keyboard.press('F2'); await p.waitForTimeout(150)
  await p.keyboard.press('End'); await p.keyboard.press('Backspace'); await p.waitForTimeout(150)
  v = await vue(p)
  ok(v.saisie?.valeur === 'Symétri' && JSON.stringify(v.fil) === '["Bibliothèque","5e B*"]', 'Retour arrière dans le champ du nom : une lettre s\'efface, on reste dans « 5e B »', v)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  await p.keyboard.press('Backspace'); await p.waitForTimeout(250)
  ok(JSON.stringify((await vue(p)).fil) === '["Bibliothèque*"]', '   … hors du champ, Retour arrière remonte', (await vue(p)).fil)
  // La bibliothèque seule (sans classeur ouvert) : renommer et entrer dans un dossier marchent aussi
  const q = await ouvrir(ctx, '?bibliotheque', 'L-seule')
  await q.waitForTimeout(300)
  await q.click(`${sel('d:' + d5)} .dossier-icone`); await q.waitForTimeout(250)
  const w = await vue(q)
  await q.focus(carteCle(w.grille[0].cle)); await q.keyboard.press('F2'); await q.waitForTimeout(150)
  await q.keyboard.type('Symétrie axiale'); await q.keyboard.press('Enter'); await q.waitForTimeout(400)
  ok((await vue(q)).grille[0]?.nom === 'Symétrie axiale' && JSON.stringify(w.fil) === '["Bibliothèque","5e B*"]', 'La bibliothèque seule : on entre dans « 5e B », on y renomme', (await vue(q)).grille)
  await ctx.close()
}

// =====================================================================
// M. LA VERSION D'UN SEUL FICHIER (file://)
// =====================================================================
if (seul('M')) {
  console.log('\n=== M. la version d\'un seul fichier (file://) ===')
  const UN = `${RACINE_DEPOT}/dist/index.html`
  if (!existsSync(UN)) ok(false, 'dist/index.html manque (npm run build)')
  else {
    const ctx = await contexte()
    const p = await ctx.newPage(); suivre(p, 'M')
    await p.goto('file://' + UN + '?bibliotheque')
    await p.waitForFunction(() => !document.querySelector('.bibliotheque')?.hidden && document.querySelector('.biblio-nouveau'), null, { timeout: 30000 }); await p.waitForTimeout(500)
    ok(await p.evaluate(() => !document.querySelector('.biblio-conseil').hidden), 'file:// : la bibliothèque seule, le conseil en tête')
    await p.click('.biblio-conseil [data-action="conseil-creer"]'); await p.waitForTimeout(200)
    await p.keyboard.type('4e A'); await p.keyboard.press('Enter'); await p.waitForTimeout(500)
    const d = await p.evaluate(() => document.querySelector('.grille-classeurs.tous .case-dossier')?.dataset.dossier)
    ok(!!d, '   … « Créer un dossier de classe » : « 4e A »', d)
    await p.click('.grille-classeurs.tous .case-dossier .dossier-icone'); await p.waitForTimeout(300)
    await p.click('.biblio-vide-dossier .biblio-bouton'); await p.waitForTimeout(250)
    const dans = await p.evaluate(() => document.querySelector('dialog .dans')?.textContent.replace(/[  ]/g, ' '))
    // (la case de la clé, cochée d'office ici, ouvrirait le vrai choix d'un fichier : on la décoche)
    await p.evaluate(() => { const c = document.querySelector('dialog .case-cle input'); if (c) c.checked = false })
    await p.fill('dialog input[name="nom"]', 'Angles')
    await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog [data-a="creer"]')])
    await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(800)
    ok(dans === 'Dans : 4e A · étiquette de classe « 4e A »' && await p.evaluate(() => document.title) === 'Angles — MEM teachingtool', '   … « Nouveau classeur » dans « 4e A » : « Angles » s\'ouvre', dans)
    await p.evaluate(() => document.querySelector('.bouton-classeur').click()); await p.waitForTimeout(600)
    const v = await vue(p)
    ok(JSON.stringify(v.fil) === '["Bibliothèque","4e A*"]' && v.grille[0]?.nom === 'Angles' && v.grille[0].puces.join() === '~4e A', '   … revenu dans la bibliothèque : toujours dans « 4e A », « Angles » porte « 4e A »', v)
    await p.focus('.grille-classeurs.tous .carte-classeur'); await p.keyboard.press('F2'); await p.waitForTimeout(150)
    await p.keyboard.type('Angles et parallèles'); await p.keyboard.press('Enter'); await p.waitForTimeout(500)
    const b = await p.evaluate(() => ({ nom: document.querySelector('.nom-classeur').textContent, titre: document.title }))
    ok(b.nom === 'Angles et parallèles' && b.titre === 'Angles et parallèles — MEM teachingtool', '   … F2 : renommé ; le bouton et le titre de l\'onglet suivent', b)
    await ctx.close()
  }
}

await nav.close()
ok(!erreurs.length, `Aucune erreur JS (${erreurs.length})`, erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
