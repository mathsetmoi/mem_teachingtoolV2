# Copie un essai des lots 1 à 3 en le faisant tourner dans un classeur qui
# n'est pas le premier : le premier goto(URL0) d'un contexte crée un
# classeur « Classeur B » (comme la bibliothèque : depuis les retouches
# d'après le lot 5, sa première page est blanche, le fond que la fenêtre
# « Nouveau classeur » coche d'office ; avant, les petits carreaux) puis l'ouvre ; les goto
# suivants ouvrent le dernier classeur (B). Les imports relatifs deviennent
# absolus.
import re, sys, os
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
d = os.path.dirname(os.path.abspath(src))
# (les imports relatifs : ./ et ../, statiques ou import('…'), ceux de commun/ compris)
s = re.sub(r"from '(\.\.?/[^']+)'", lambda m: "from '" + os.path.normpath(os.path.join(d, m.group(1))) + "'", s)
s = re.sub(r"import\('(\.\.?/[^']+)'\)", lambda m: "import('" + os.path.normpath(os.path.join(d, m.group(1))) + "')", s)
s = re.sub(r"import\.meta\.url", "'file://" + os.path.abspath(src) + "'", s)
aide = r'''
// ---- ajouté : un classeur qui n'est pas le premier ----
const __vus = new WeakSet()
async function __np(page, url, ...reste) {
  const ctx = page.context()
  if (__vus.has(ctx) || !/^https?:\/\/localhost:5173\/$/.test(url)) return page.goto(url, ...reste)
  __vus.add(ctx)
  await page.goto(url, ...reste)
  await page.waitForFunction(() => window.__registre && window.__app && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  const id = await page.evaluate(async () => {
    const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
    const etat = await neuf.etatNeuf('blanc'), T = Date.now(), id = dem.idClasseur()
    const fiche = { id, base: dem.baseDe(id), nom: 'Classeur B', dossier: null, etiquettes: [], cree: T, modifie: T, ouvert: 0, pages: 1 }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom: fiche.nom }))
    return id
  })
  const r = await page.goto(url + '?classeur=' + id, ...reste)
  await page.waitForFunction(id => window.__app?.classeur?.id === id, id, { timeout: 30000 })
  return r
}
'''
# La session d'un classeur qui n'est pas le premier a sa clé à lui,
# 'mem-session:<id>' (lot 4, voir src/session.ts et cleDuClasseur) : passeA
# lit et écrit 'mem-session' (celle du premier) dans la page ; dans cette
# copie, il lit celle du classeur ouvert (contrôle final du lot 4 : sans
# cela, deux de ses vérifications échouaient ici, sans défaut de l'outil)
if os.path.basename(src) == 'passeA.mjs':
    s = s.replace("'mem-session'", "('mem-session:' + window.__app.classeur.id)")
# après la dernière ligne d'import
lignes = s.split('\n')
dernier = max(i for i, l in enumerate(lignes) if l.startswith('import '))
lignes.insert(dernier + 1, aide)
s = '\n'.join(lignes)
s = re.sub(r"\b(\w+)\.goto\(URL0\b", r"__np(\1, URL0", s)
open(dst, 'w').write(s)
