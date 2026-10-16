// Google simulé (la connexion, le Drive) pour les essais de la vérification du
// lot 4 : tiré de remplir-ancien.mjs (qui remplissait la version d'avant le
// lot 4, construite depuis un commit qui n'existe plus) en rangeant la
// batterie dans le dépôt.
export async function simulerGoogle(ctx, drive = new Map()) {
  const PERSO = 'prof@example.com'
  await ctx.route(/accounts\.google\.com\/gsi\/client/, r => r.fulfill({ contentType: 'text/javascript', body: `window.google = { accounts: { oauth2: {
    initTokenClient: o => ({ requestAccessToken: async q => { o.callback({ access_token: 'jeton:${PERSO}', expires_in: 3600 }) } }),
    hasGrantedAllScopes: () => true, revoke: () => {} } } }` }))
  let n = 0
  const lireMultipart = corps => { const parts = corps.split(/--mem_[a-z0-9]+/); const meta = JSON.parse(parts[1].split('\r\n\r\n')[1]); const contenu = parts[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''); return { meta, contenu } }
  await ctx.route(/www\.googleapis\.com/, async r => {
    const u = new URL(r.request().url()), m = r.request().method()
    const qui = (r.request().headers().authorization ?? '').replace('Bearer jeton:', '')
    const json = o => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) })
    const fiche = id => { const f = drive.get(id); return { id, name: f.name, mimeType: f.mimeType, parents: f.parents, trashed: !!f.trashed, appProperties: f.appProperties, permissions: [{ id: 'p', type: 'user', role: 'owner' }] } }
    const miens = () => [...drive.keys()].filter(id => drive.get(id).owner === qui)
    if (u.pathname === '/drive/v3/about') return json({ user: { emailAddress: qui } })
    if (u.pathname === '/drive/v3/files' && m === 'GET') {
      const q = u.searchParams.get('q') || ''
      const seance = q.match(/key='memSeance' and value='([^']+)'/)
      if (seance) return json({ files: miens().filter(id => !drive.get(id).trashed && drive.get(id).appProperties?.memSeance === seance[1]).map(fiche) })
      return json({ files: miens().filter(id => drive.get(id).mimeType === 'application/vnd.google-apps.folder' && !drive.get(id).trashed).map(fiche) })
    }
    if (u.pathname === '/drive/v3/files' && m === 'POST') { const o = JSON.parse(r.request().postData()); const id = 'dossier' + (++n) + 'xxxxxxxxxx'; drive.set(id, { ...o, owner: qui }); return json({ id }) }
    if (u.pathname === '/upload/drive/v3/files' && m === 'POST') { const { meta, contenu } = lireMultipart(r.request().postData()); const id = 'fichier' + (++n) + 'xxxxxxxxxx'; drive.set(id, { ...meta, contenu, owner: qui }); return json({ id }) }
    const maj = u.pathname.match(/^\/upload\/drive\/v3\/files\/(.+)$/)
    if (maj && m === 'PATCH') { const { meta, contenu } = lireMultipart(r.request().postData()); Object.assign(drive.get(maj[1]), meta, { contenu }); return json({ id: maj[1] }) }
    const une = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/)
    if (une && m === 'GET') { const f = drive.get(decodeURIComponent(une[1])); return f && f.owner === qui ? json(fiche(decodeURIComponent(une[1]))) : r.fulfill({ status: 404, body: '{"error":{"message":"File not found"}}' }) }
    if (une && m === 'PATCH') { Object.assign(drive.get(une[1]), JSON.parse(r.request().postData())); return json({ id: une[1] }) }
    return r.fulfill({ status: 404, body: '{}' })
  })
  await ctx.route(/script\.google\.com\/macros/, r => {
    const u = new URL(r.request().url())
    const rep = o => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof o === 'string' ? o : JSON.stringify(o) })
    if (u.searchParams.get('ping')) return rep({ relais: 'MEM Replay', version: 3, pret: true })
    const f = drive.get(u.searchParams.get('id'))
    return rep(f ? f.contenu : { erreur: 'Séance introuvable' })
  })
  return drive
}

async function ecrire(p, x0, y0, n = 12) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + i * 12, y0 + Math.sin(i / 2) * 20)
  await p.mouse.up(); await p.waitForTimeout(120)
}
