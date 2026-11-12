// Attendre que la page ait peint deux images (deux trames).
// Chromium regroupe les mouvements des doigts par image : un contact envoyé
// par Input.dispatchTouchEvent n'arrive à la page qu'à la trame suivante.
// Les essais qui regardent la vue juste après un contact attendent donc deux
// trames, pour que l'outil ait vu ce contact avant qu'on regarde.
export const deuxTrames = (cdp) => cdp.send('Runtime.evaluate', {
  expression: 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))',
  awaitPromise: true,
})

/** Un contact des doigts ([x, y, id]), puis deux trames */
export async function toucherPuisAttendre(cdp, type, pts, r = 8, idParDefaut = 0) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = idParDefaut]) => ({ x, y, id, radiusX: r, radiusY: r, force: 0.5 })) })
  await deuxTrames(cdp)
}
