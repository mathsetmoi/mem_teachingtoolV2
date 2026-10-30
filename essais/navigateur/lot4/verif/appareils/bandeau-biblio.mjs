// La clé en pause après un rechargement : depuis la bibliothèque (la ligne du classeur ouvert), à la
// plume, [Reprendre l'enregistrement sur la clé] ; puis partir vers un autre classeur pendant la pause.
import { lancer, contexte, info, ok, dort, toasts, suivre, DEV, creerPlusieurs } from './outils.mjs'
const INIT = () => {
  let depart = null
  try { depart = sessionStorage.getItem('__permissionDepart') } catch { /* rien */ }
  window.__permission = depart || 'granted'
  window.__appels = []; window.__ecritures = 0
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { return window.__permission }
  H.requestPermission = async function () { const actif = navigator.userActivation.isActive; const r = actif ? 'granted' : window.__permission; window.__appels.push({ actif, r }); if (r === 'granted') window.__permission = 'granted'; return r }
  const F = FileSystemFileHandle.prototype, cw = F.createWritable
  F.createWritable = async function (...a) { const w = await cw.apply(this, a); return { write: d => w.write(d), close: async () => { await w.close(); window.__ecritures++ }, abort: r => w.abort(r) } }
  window.showSaveFilePicker = async o => (await navigator.storage.getDirectory()).getFileHandle(o?.suggestedName || 'x.memc', { create: true })
}
const nav = await lancer({ persistant: true })
const ctx = await contexte(nav)
await ctx.addInitScript(INIT)
const p = await ctx.newPage(); suivre(p, 'bb')
const pret = () => p.waitForFunction(() => window.__surveillance && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await p.goto(DEV); await pret(); await dort(600)
await creerPlusieurs(p, 1, { noms: ['Fractions'] })
await p.click('.barre-haut .bouton.points'); await dort(250)
await p.click('.menu-flottant:not([hidden]) [data-action="activer-cle"]')
await p.waitForFunction(() => window.__ecritures > 0, null, { timeout: 15000 }); await dort(400)
await p.evaluate(() => sessionStorage.setItem('__permissionDepart', 'prompt'))
await p.reload(); await pret(); await dort(800)
await p.mouse.move(500, 400); await p.mouse.down(); for (let i = 0; i < 10; i++) await p.mouse.move(500 + i * 10, 400 + i * 4); await p.mouse.up(); await dort(300)
await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(400)
const ligne = await p.evaluate(() => { const l = document.querySelector('.biblio-ouvert'); return { texte: l.textContent.replace(/[  ]/g, ' '), boutons: [...l.querySelectorAll('button')].map(b => b.textContent) } })
info('la ligne du classeur ouvert, clé en pause', ligne)
ok(ligne.boutons.some(b => /Reprendre/.test(b)), 'Bibliothèque : la ligne porte [Reprendre l\'enregistrement]', ligne)
// Partir vers « Fractions » pendant la pause : aucun requestPermission sans clic, et la page part
const n0 = await p.evaluate(() => window.__ecritures)
const id = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous > li')].find(l => l.querySelector('.carte-nom-classeur')?.textContent === 'Fractions').dataset.cle)
await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => null), p.click(`.grille-classeurs.tous li[data-cle="${id}"] .carte-apercu`)])
await pret(); await dort(500)
info('parti vers Fractions pendant la pause', { url: await p.evaluate(() => location.search), nom: await p.evaluate(() => window.__app.classeur.nom) })
await nav.close()
