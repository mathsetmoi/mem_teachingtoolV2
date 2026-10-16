// T6. La copie sur le Drive, à côté des replays déjà publiés : le dossier
// privé des sauvegardes et ses marques, le même fichier à chaque fois, aucune
// requête sur le dossier ni les fichiers des replays, rien qui revienne du
// Drive sans le demander ; puis le relais (le vrai script, dans un bac à
// sable) devant ce qui est réellement sur ce Drive.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium, V, DEV, ok, info, dort, INIT, ECOUTER_TOASTS, toasts, suivre, pret, ecrire, etat, lireMemc, etatDeLaPage, memeContenu, erreurs } from './commun.mjs'
import { FauxGoogle } from '../migration/faux-google.mjs'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const MIN = 60_000
const MOI = 'prof@example.com'
const nav = await chromium.launch()
const g = new FauxGoogle()
// Ce qui est déjà sur le Drive : le dossier des replays et une séance publiée
const d = g.drive(MOI)
d.set('dossierReplayxxxxxx', { id: 'dossierReplayxxxxxx', name: 'MEM - Replay séances', mimeType: 'application/vnd.google-apps.folder', appProperties: { memReplay: 'dossier-v1', memCompte: 'mem' }, versions: [], modifie: Date.now() })
d.set('seanceReplayxxxxxxx', { id: 'seanceReplayxxxxxxx', name: 'Séance.mem', mimeType: 'application/json', parents: ['dossierReplayxxxxxx'], appProperties: { memRevoir: 'v1', memSeance: 'mem:1' }, octets: Buffer.from('{"format":"mem-revoir","v":1}'), versions: [{ id: 'v0', modifiedTime: new Date().toISOString() }], modifie: Date.now() })
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
await g.brancher(ctx)
const p = await ctx.newPage(); suivre(p, 'p')
await p.clock.install()
await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
await p.clock.fastForward(4000); await p.waitForTimeout(300)
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="copie-drive"]')
await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
await p.click('dialog.dialogue-drive[open] .d-connecter')
await p.waitForFunction(() => /^Connecté/.test(document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
await p.click('dialog.dialogue-drive[open] .d-annuler')
await p.waitForTimeout(300)
// Trois séries de traits, chacune copiée
for (let k = 0; k < 3; k++) {
  for (let i = 0; i < 3; i++) await ecrire(p, 200 + i * 50, 200 + k * 80)
  await p.clock.fastForward(12 * MIN); await p.waitForTimeout(1500)
}
const s = g.sauvegardes(MOI)
const dossiers = g.dossiers(MOI)
info('sur le Drive', g.fichiers(MOI).map(f => `${f.name}${f.parents ? ' ← ' + f.parents : ''} ${JSON.stringify(f.appProperties)}`))
const envois = g.requetes.filter(r => r.chemin.startsWith('/upload/'))
ok(s.length === 1 && envois.length === 3 && envois[0].m === 'POST' && envois.slice(1).every(r => r.m === 'PATCH' && r.chemin.endsWith('/' + s[0].id)), `trois copies : un seul fichier, créé puis remplacé (${envois.map(r => r.m).join(', ')})`, envois)
const sauv = dossiers.find(x => x.name === 'MEM - Sauvegardes')
ok(sauv && JSON.stringify(sauv.appProperties) === '{"memSauvegardes":"dossier-v1","memCompte":"mem"}' && s[0].parents?.[0] === sauv.id && !sauv.appProperties.memReplay, '   … dans « MEM - Sauvegardes », marqué memSauvegardes (pas memReplay)', sauv)
const touche = g.requetes.filter(r => /dossierReplay|seanceReplay|memReplay|memRevoir|memSeance|Replay/.test(decodeURIComponent(r.chemin + r.recherche)))
ok(touche.length === 0, `aucune requête sur le dossier ou la séance des replays, ni recherche de leurs marques (${g.requetes.length} requêtes)`, touche)
ok(!g.requetes.some(r => /alt=media/.test(r.recherche)), 'rien n\'est venu du Drive (aucun alt=media)')
ok(g.fichiers(MOI).find(f => f.id === 'seanceReplayxxxxxxx').versions.length === 1, '   … la séance publiée n\'a pas bougé')
// La copie sur le Drive a exactement le classeur de la page
const lu = lireMemc(s[0].octets)
ok(lu.entier && memeContenu(lu.doc, await etatDeLaPage(p)), `la copie du Drive a exactement le classeur de la page (${lu.ids.length} traits)`)
// Le vrai relais, dans un bac à sable, devant ce Drive (comme tests/publication.test.ts)
const SOURCE = readFileSync(`${RACINE_DEPOT}/relais/relais-seances.gs`, 'utf8')
function relais(fichiers) {
  const reponse = texte => ({ texte, setMimeType() { return this } })
  const iterer = l => { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] } }
  const dossier = x => ({ getName: () => x.name, isTrashed: () => !!x.trashed, getOwner: () => ({ getEmail: () => MOI }) })
  const bac = {
    console: { log() {}, error() {} }, Session: { getEffectiveUser: () => ({ getEmail: () => MOI }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: reponse },
    DriveApp: {
      getFileById(id) { const f = fichiers.get(id); if (!f) throw new Error('introuvable'); return { getName: () => f.name, isTrashed: () => !!f.trashed, getParents: () => iterer((f.parents ?? []).map(x => fichiers.get(x)).filter(Boolean).map(dossier)), getBlob: () => ({ getDataAsString: () => Buffer.from(f.octets).toString('latin1') }) } },
      getFoldersByName: nom => iterer([...fichiers.values()].filter(x => x.mimeType === 'application/vnd.google-apps.folder' && x.name === nom).map(dossier)),
    },
  }
  runInNewContext(SOURCE, bac)
  return id => bac.doGet({ parameter: { id } }).texte
}
const servir = relais(d)
ok(servir('seanceReplayxxxxxxx').startsWith('{"format":"mem-revoir"'), 'le relais sert la séance publiée (témoin)')
ok(/introuvable/.test(JSON.parse(servir(s[0].id)).erreur), 'le relais ne sert pas la sauvegarde du Drive (son vrai contenu, son vrai dossier)')
// Même rangée par erreur dans le dossier des replays et renommée « .mem »
const piege = new Map(d); piege.set('piegexxxxxxxxxxxx', { ...s[0], id: 'piegexxxxxxxxxxxx', name: 'Sauvegarde.mem', parents: ['dossierReplayxxxxxx'] })
ok(/introuvable/.test(JSON.parse(relais(piege)('piegexxxxxxxxxxxx')).erreur), '   … ni rangée dans le dossier des replays et renommée « .mem » (son contenu commence par mem-tableau)')
console.log('erreurs JS :', erreurs)
await nav.close()
