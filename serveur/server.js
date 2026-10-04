// =============================================================
// SERVEUR DE SYNCHRONISATION
// Il ne connaît rien au dessin : il relaie les modifications Yjs
// entre les participants d'une même salle, et les garde sur disque
// (dossier ./salles) pour qu'un tableau survive à un redémarrage.
//
// Lancer :  node serveur/server.js        (port 1234 par défaut)
// Options : PORT=8080  HOST=0.0.0.0  SALLES=./mes-salles
// =============================================================
import http from 'node:http'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'node:url'

process.env.YPERSISTENCE ??= process.env.SALLES || fileURLToPath(new URL('./salles', import.meta.url))
const { setupWSConnection } = await import('@y/websocket-server/utils')

const port = Number(process.env.PORT || 1234)
const host = process.env.HOST || '0.0.0.0'      // visible des tablettes du Wi-Fi
const NOM_VALIDE = /^[a-z0-9]{6,32}$/

const wss = new WebSocketServer({ noServer: true })
wss.on('connection', setupWSConnection)

const serveur = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Serveur du tableau : en marche')
})

serveur.on('upgrade', (req, socket, head) => {
  const salle = (req.url || '').slice(1).split('?')[0]
  // On refuse les noms de salle fantaisistes : ils deviendraient des
  // dossiers sur le disque. (Vraie authentification : voir le README.)
  if (!NOM_VALIDE.test(salle)) { socket.destroy(); return }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req))
})

serveur.listen(port, host, () => {
  console.log(`Tableau MEM : synchronisation sur ws://${host}:${port}`)
})
