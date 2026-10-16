// Le faux Google de S/lot4/C10-drive.mjs (copié tel quel), pour les essais de la vérification
const TOUS = []
const DOSSIER = 'application/vnd.google-apps.folder'
/** Un faux Drive par compte Google (son adresse) */
export class FauxGoogle {
  constructor() {
    TOUS.push(this)
    this.relais = []
    this.drives = new Map()      // courriel -> Map(id -> fichier)
    this.n = 0
    this.requetes = []
    this.choisi = 'prof@example.com'
    this.expire = 3600
    this.gis = []                // les appels de requestAccessToken
    this.panne = null            // 'reseau' | 'plein' | '401' | null
    this.exposeLocation = true
    this.sessions = new Map()
    this.horloge = Date.now()
  }
  drive(qui) { if (!this.drives.has(qui)) this.drives.set(qui, new Map()); return this.drives.get(qui) }
  fichiers(qui = this.choisi) { return [...this.drive(qui).values()] }
  sauvegardes(qui = this.choisi) { return this.fichiers(qui).filter(f => f.mimeType !== DOSSIER && f.appProperties?.memSauvegarde === 'v1' && !f.trashed) }
  dossiers(qui = this.choisi) { return this.fichiers(qui).filter(f => f.mimeType === DOSSIER) }
  vue(f) {
    return { id: f.id, name: f.name, mimeType: f.mimeType, parents: f.parents, trashed: !!f.trashed, appProperties: f.appProperties, description: f.description,
      size: f.octets ? String(f.octets.length) : undefined, modifiedTime: new Date(f.modifie).toISOString(), permissions: [{ id: 'p', type: 'user', role: 'owner' }] }
  }
  chercher(d, q) {
    let l = [...d.values()], reste = q
    const clause = (re, filtre) => { for (let m = re.exec(reste); m; m = re.exec(reste)) { const fl = filtre(m); l = l.filter(fl); reste = reste.replace(m[0], ' ') } }
    const texte = s => s.replace(/\\'/g, '\'')
    clause(/appProperties has \{ key='([^']+)' and value='((?:[^'\\]|\\.)*)' \}/, m => f => f.appProperties?.[m[1]] === texte(m[2]))
    clause(/trashed=false/, () => f => !f.trashed)
    clause(/mimeType='([^']+)'/, m => f => f.mimeType === m[1])
    clause(/'([^']+)' in parents/, m => f => !!f.parents?.includes(m[1]))
    if (reste.replace(/\band\b/g, '').trim()) throw new Error('clause inconnue : ' + reste)
    return l
  }
  ecrire(d, id, meta, octets) {
    this.horloge = Math.max(this.horloge + 1000, Date.now())
    const f = id ? d.get(id) : { id: `sauve${++this.n}xxxxxxxxxxxx`, versions: [] }
    const { parents, ...reste } = meta
    Object.assign(f, reste, { octets, modifie: this.horloge })
    if (!id) f.parents = parents
    f.versions.push({ id: `v${++this.n}`, modifiedTime: new Date(this.horloge).toISOString() })
    d.set(f.id, f)
    return f.id
  }
  multipart(corps, type) {
    const borne = /boundary=(\S+)/.exec(type)[1]
    const t = corps.toString('latin1')
    const parts = t.split(`--${borne}`).slice(1, 3).map(m => { const i = m.indexOf('\r\n\r\n'); return { tete: m.slice(0, i), corps: m.slice(i + 4).replace(/\r\n$/, '') } })
    return { meta: JSON.parse(Buffer.from(parts[0].corps, 'latin1').toString('utf8')), type: /Content-Type: (\S+)/.exec(parts[1].tete)?.[1], octets: Buffer.from(parts[1].corps, 'latin1') }
  }
  async brancher(ctx) {
    const g = this
    await ctx.exposeFunction('__gis', (hint, prompt, actif) => { g.gis.push({ hint: hint ?? '', prompt: prompt ?? null, actif }); return { qui: g.choisi, expire: g.expire } })
    await ctx.route(/accounts\.google\.com\/gsi\/client/, r => r.fulfill({ contentType: 'text/javascript', body: `window.google = { accounts: { oauth2: {
      initTokenClient: o => ({ requestAccessToken: async q => { const r = await window.__gis(o.login_hint, q && q.prompt, navigator.userActivation.isActive); o.callback({ access_token: 'jeton:' + r.qui, expires_in: r.expire }) } }),
      hasGrantedAllScopes: () => true } } }` }))
    await ctx.route(/www\.googleapis\.com/, r => g.repondre(r))
    // Le relais des replays : la copie n'y va jamais
    await ctx.route(/script\.google\.com/, r => { g.relais.push(r.request().url()); return r.fulfill({ status: 404, body: '' }) })
  }
  async repondre(r) {
    const req = r.request(), u = new URL(req.url()), m = req.method()
    const qui = (req.headers().authorization ?? '').replace('Bearer jeton:', '')
    this.requetes.push({ m, chemin: u.pathname, recherche: u.search, qui })
    const json = (o, status = 200, entetes = {}) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...entetes }, body: o === null ? '' : JSON.stringify(o) })
    if (this.panne === 'reseau') return r.abort('connectionrefused')
    if (this.panne === '401') return json({ error: { message: 'Invalid Credentials' } }, 401)
    const d = this.drive(qui)
    if (u.pathname === '/drive/v3/about') return json({ user: { emailAddress: qui } })
    if (u.pathname.startsWith('/upload/')) {
      if (this.panne === 'plein') return json({ error: { message: 'The user\'s Drive storage quota has been exceeded.', errors: [{ reason: 'storageQuotaExceeded' }] } }, 403)
      const id = u.pathname.match(/\/files\/([^/]+)$/)?.[1] ?? null
      const type = u.searchParams.get('uploadType')
      if (type === 'multipart') {
        const x = this.multipart(req.postDataBuffer(), req.headers()['content-type'])
        if (x.meta.appProperties?.memSauvegarde && x.type !== 'application/octet-stream') return json({ error: { message: 'type ' + x.type } }, 400)
        return json({ id: this.ecrire(d, id, x.meta, x.octets) })
      }
      if (type === 'resumable' && u.searchParams.get('upload_id')) {
        const s = this.sessions.get(u.searchParams.get('upload_id'))
        if (!s || m !== 'PUT') return json({ error: { message: 'session' } }, 404)
        return json({ id: this.ecrire(d, s.id, s.meta, req.postDataBuffer()) })
      }
      if (type === 'resumable') {
        const envoi = 'envoi' + (++this.n)
        this.sessions.set(envoi, { id, meta: JSON.parse(req.postData()), taille: Number(req.headers()['x-upload-content-length']) })
        const loc = `https://www.googleapis.com/upload/drive/v3/files${id ? '/' + id : ''}?uploadType=resumable&upload_id=${envoi}`
        return json(null, 200, { 'x-guploader-uploadid': envoi, 'access-control-expose-headers': this.exposeLocation ? 'Location, X-GUploader-UploadID' : 'X-GUploader-UploadID', ...(this.exposeLocation ? { location: loc } : {}) })
      }
    }
    const rev = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/revisions(?:\/([^/]+))?$/)
    if (rev) {
      const f = d.get(decodeURIComponent(rev[1]))
      if (!f) return json({ error: { message: 'File not found' } }, 404)
      if (m === 'DELETE') {
        const i = f.versions.findIndex(v => v.id === decodeURIComponent(rev[2]))
        if (i < 0 || i === f.versions.length - 1) return json({ error: { message: 'cannotDeleteLastRevision' } }, 400)
        f.versions.splice(i, 1)
        return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' })
      }
      return json({ revisions: f.versions })
    }
    const une = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/)
    if (une) {
      const f = d.get(decodeURIComponent(une[1]))
      if (!f) return json({ error: { message: 'File not found' } }, 404)
      if (u.searchParams.get('alt') === 'media') return r.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'access-control-allow-origin': '*' }, body: f.octets })
      if (m === 'PATCH') Object.assign(f, JSON.parse(req.postData()))
      return json(this.vue(f))
    }
    if (u.pathname === '/drive/v3/files' && m === 'POST') {
      const o = JSON.parse(req.postData()); const id = 'dossier' + (++this.n) + 'xxxxxxxxx'
      d.set(id, { ...o, id, versions: [], modifie: Date.now() }); return json({ id })
    }
    if (u.pathname === '/drive/v3/files' && m === 'GET') return json({ files: this.chercher(d, u.searchParams.get('q') || '').map(f => this.vue(f)) })
    return json({ error: { message: 'inconnu ' + u.pathname } }, 404)
  }
  /** Les requêtes vers le Drive depuis la dernière fois */
  depuis(n) { return this.requetes.slice(n) }
}
