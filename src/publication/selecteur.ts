// =============================================================
// LE SÉLECTEUR DE FICHIERS DE GOOGLE (lot 7)
// Avec le droit drive.file, MEM teachingtool ne voit que les fichiers qu'il
// a créés lui-même (les classes reliées, les sauvegardes) : un classeur
// déposé sur le Drive autrement (glissé dans Google Drive, copié par Google
// Drive pour ordinateur) lui est invisible. La fenêtre de Google, elle,
// montre tout le Drive au professeur ; ce qu'il y choisit, et seulement
// cela, devient lisible par MEM teachingtool (setAppId : le numéro du
// projet). Rien d'autre du Drive n'est jamais lu.
//
// Le code de la fenêtre vient de Google (apis.google.com/js/api.js, puis
// gapi.load('picker')), chargé à l'avance comme la connexion : au clic, la
// fenêtre doit pouvoir s'ouvrir tout de suite. Seulement depuis la version
// en ligne, connecté au compte choisi (le jeton de Publier et de la copie).
// =============================================================
import { CLE_API_GOOGLE, PROJET_GOOGLE } from './comptes'
import { jetonDe } from './drive'

/** Ce qu'on utilise du sélecteur de Google */
interface VuePicker {
  setIncludeFolders(o: boolean): VuePicker
}
interface ConstructeurPicker {
  addView(v: VuePicker): ConstructeurPicker
  setOAuthToken(t: string): ConstructeurPicker
  setDeveloperKey(k: string): ConstructeurPicker
  setAppId(id: string): ConstructeurPicker
  setLocale(l: string): ConstructeurPicker
  setTitle(t: string): ConstructeurPicker
  enableFeature(f: string): ConstructeurPicker
  setCallback(f: (d: Record<string, unknown>) => void): ConstructeurPicker
  build(): { setVisible(v: boolean): void }
}
interface ApiPicker {
  PickerBuilder: new () => ConstructeurPicker
  DocsView: new (id?: string) => VuePicker
  ViewId: Record<string, string>
  Feature: Record<string, string>
  Action: Record<string, string>
  Response: Record<string, string>
  Document: Record<string, string>
}
declare global {
  interface Window { gapi?: { load(n: string, o: { callback: () => void; onerror?: () => void }): void } }
}
const pickerDe = () => (window as unknown as { google?: { picker?: ApiPicker } }).google?.picker

let etat: 'attente' | 'pret' | 'echec' = 'attente'

/** Charger le sélecteur à l'avance (la fenêtre « Ouvrir », onglet Drive) */
export function preparerSelecteur() {
  if (pickerDe()) { etat = 'pret'; return }
  const deja = document.getElementById('google-selecteur')
  if (deja && etat !== 'echec') return
  deja?.remove()
  etat = 'attente'
  const s = document.createElement('script')
  s.id = 'google-selecteur'
  s.src = 'https://apis.google.com/js/api.js'
  s.async = true
  s.onload = () => {
    if (!window.gapi) { etat = 'echec'; return }
    window.gapi.load('picker', { callback: () => { etat = pickerDe() ? 'pret' : 'echec' }, onerror: () => { etat = 'echec' } })
  }
  s.onerror = () => { etat = 'echec' }
  document.head.appendChild(s)
}

/** Un fichier choisi dans la fenêtre de Google */
export interface ChoisiDansLeDrive { id: string; nom: string }

/** La fenêtre de Google, connecté à `compte` : à appeler depuis un clic.
 *  Rend les fichiers qu'on y a choisis ([] : fermée sans rien choisir). */
export function choisirDansLeDrive(compte: string): Promise<ChoisiDansLeDrive[]> {
  return new Promise((ok, ko) => {
    const jeton = jetonDe(compte)
    if (!jeton) return ko(new Error('Connectez-vous d\'abord à Google.'))
    const p = pickerDe()
    if (!p) {
      const echec = etat === 'echec'
      preparerSelecteur()
      return ko(new Error(echec
        ? 'La fenêtre du Drive ne se charge pas (réseau filtré ou bloqueur de publicité ?). Vérifiez la connexion, puis réessayez.'
        : 'La fenêtre du Drive se charge : cliquez à nouveau dans quelques secondes.'))
    }
    const vue = new p.DocsView(p.ViewId.DOCS).setIncludeFolders(true)
    let b = new p.PickerBuilder().addView(vue).setOAuthToken(jeton).setAppId(PROJET_GOOGLE).setLocale('fr')
      .setTitle('Choisissez les classeurs à ouvrir (.memc, .memb)')
      .enableFeature(p.Feature.MULTISELECT_ENABLED)
      .setCallback(d => {
        const action = d[p.Response.ACTION] ?? d.action
        if (action === (p.Action.CANCEL ?? 'cancel')) return ok([])
        if (action !== (p.Action.PICKED ?? 'picked')) return
        const docs = (d[p.Response.DOCUMENTS] ?? d.docs ?? []) as Record<string, unknown>[]
        ok(docs.map(x => ({ id: String(x[p.Document.ID] ?? x.id ?? ''), nom: String(x[p.Document.NAME] ?? x.name ?? '') })).filter(x => x.id))
      })
    if (CLE_API_GOOGLE) b = b.setDeveloperKey(CLE_API_GOOGLE)
    try { b.build().setVisible(true) } catch (e) { ko(e instanceof Error ? e : new Error('La fenêtre du Drive ne s\'ouvre pas.')) }
  })
}
