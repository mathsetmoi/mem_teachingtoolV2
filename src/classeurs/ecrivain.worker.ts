// =============================================================
// LE TRAVAILLEUR DE L'ÉCRIVAIN
// Intégré à la page (import …?worker&inline, voir ecrivain.ts) : il marche
// aussi dans la version hors ligne, ouverte depuis la clé (file://),
// mesuré dans Chromium. Il lit la base du classeur dans IndexedDB, fusionne,
// vérifie, compresse, et rend le fichier (voir ecrivain-taches.ts) : rien de
// tout cela ne passe par le fil principal, où l'on écrit au stylet.
// =============================================================
import type { Demande } from './ecrivain-taches'
import { PRET, aTransferer, executer } from './ecrivain-taches'

/** Ce que ce fichier voit du travailleur (le projet n'a pas les types
 *  « WebWorker » : la page et lui partagent tsconfig) */
const moi = self as unknown as { postMessage(m: unknown, transfert?: Transferable[]): void; onmessage: ((e: MessageEvent<Demande>) => void) | null }

// L'état d'un fichier lu part sans copie (transféré)
moi.onmessage = e => { void executer(e.data).then(r => moi.postMessage(r, aTransferer(r))) }
moi.postMessage(PRET)
