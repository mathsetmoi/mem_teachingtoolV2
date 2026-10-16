// CONFORMITÉ, point 4 (« ailleurs : un rappel honnête ») et textes : sur
// Safari (Mac, iPad), là où la clé ne s'écrit pas seule, la ligne de la clé
// dit d'enregistrer « (Ctrl + S) ». Le menu, lui, dit « ⌘ + S ».
// Safari est imité dans Chromium : navigator.platform « MacIntel » (ce que
// lit navigateur.ts), et ni showSaveFilePicker ni showOpenFilePicker.
import * as O from './outils.mjs'
const { ok, norm } = O
const ICI = new URL('.', import.meta.url).pathname
await O.lancer()
const g = new O.FauxGoogle()
const SAFARI = () => {
  Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel', configurable: true })
  delete window.showSaveFilePicker; delete window.showOpenFilePicker
}
const ctx = await O.contexte(g, { scripts: [SAFARI] })
const p = await O.ouvrir(ctx, '', 'M', false)
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
const m = await p.evaluate(() => {
  const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden), n = t => (t || '').replace(/[  ]/g, ' ')
  return {
    plateforme: navigator.platform, save: typeof window.showSaveFilePicker,
    touches: [...m.querySelectorAll('.menu-item[data-action]')].map(x => x.dataset.action + ' → ' + n(x.querySelector('kbd, .touche')?.textContent || '')),
    cle: n(m.querySelector('.bloc-lignes li[data-ligne="cle"] .texte-ligne')?.textContent),
    titre: document.querySelector('.barre-haut .bouton.points')?.title,
  }
})
console.log(JSON.stringify(m, null, 1))
await p.screenshot({ path: ICI + 'captures/mac-menu.png' })
ok(!/Ctrl/.test(m.cle) || !m.touches.some(t => /⌘/.test(t)), `sur Mac, la ligne de la clé dit le même raccourci que le menu : « ${m.cle} »`, m)
await O.navigateur.close()
