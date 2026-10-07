// =============================================================
// LA FENÊTRE « PUBLIER LE REPLAY »
// Le professeur choisit la séance (repérée toute seule dans le film), les
// pages, un titre et le compte Google. Il peut la regarder comme un élève
// avant de la publier. Il reçoit un lien stable à coller dans Pronote :
// republier la même séance met à jour le même fichier, le lien ne change pas.
// =============================================================
import * as Y from 'yjs'
import type { App } from '../app'
import { exporter, seancesDuFilm } from '../revoir/exporter'
import type { Seance } from '../revoir/exporter'
import type { FilmEleve } from '../revoir/format'
import { ecrireFilm, lireFilm } from '../revoir/format'
import { Bobine } from '../revoir/bobine'
import { lireParLeRelais } from '../revoir/relais'
import { COMPTES, compteDe, lienEleve } from './comptes'
import { connecte, connecter, preparerGoogle, publier } from './drive'

/** Ce qu'on retient d'une séance publiée, dans le document du professeur
 *  (jamais dans le film élève) : de quoi republier au même lien */
interface Publiee { compte: string; id: string; titre: string; quand: number }

const heure = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')
const jour = (t: number) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const echapper = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const kilo = (n: number) => n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`

export class Publication {
  private d: HTMLDialogElement | null = null
  private seances: Seance[] = []

  constructor(private app: App, private racine: HTMLElement) {}

  private get registre() { return this.app.tableau.doc.getMap('publications') as Y.Map<Publiee> }
  private get lecteur() { return new URL('revoir.html', location.href).toString() }
  /** La version en ligne (ou celle de développement) a le lecteur à côté d'elle et peut se connecter à
   *  Google ; la version « un seul fichier » (clé USB) ne peut qu'enregistrer le fichier séance */
  private get enLigne() {
    const servie = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    return servie && (import.meta.env.DEV || import.meta.env.VITE_EN_LIGNE === '1')
  }

  ouvrir() {
    this.seances = seancesDuFilm(this.app.tableau.film.toArray())
    if (!this.seances.length) return this.app.ui.message('Rien à publier pour l\'instant : le replay commence avec les gestes faits au tableau.')
    if (this.enLigne && location.protocol !== 'file:') preparerGoogle()
    this.d?.remove()
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-publier'
    d.setAttribute('aria-labelledby', 'titre-publier')
    d.innerHTML = `
      <h2 id="titre-publier">Publier le replay pour les élèves</h2>
      <div class="corps">
        <label class="champ"><span>Séance</span><select class="p-seance"></select></label>
        <fieldset class="p-pages"><legend>Pages</legend><div class="cases"></div></fieldset>
        <label class="champ"><span>Titre (les élèves le voient)</span><input class="p-titre" maxlength="120" /></label>
        <fieldset class="p-comptes"><legend>Publier dans</legend><div class="cases"></div></fieldset>
        <ul class="p-verifier" aria-label="À vérifier avant de publier"></ul>
        <div class="actions">
          <button type="button" class="secondaire p-apercu">Voir comme un élève</button>
          <button type="button" class="secondaire p-fichier">Enregistrer le fichier</button>
          <button type="button" class="principal p-publier">Publier</button>
        </div>
        <p class="p-etat" role="status" aria-live="polite"></p>
        <div class="p-resultat" hidden>
          <label class="champ"><span>Le lien de la séance</span><input class="p-lien" readonly /></label>
          <div class="actions">
            <button type="button" class="secondaire p-copier">Copier le lien</button>
            <button type="button" class="principal p-pronote">Copier pour Pronote</button>
            <a class="secondaire bouton-lien p-ouvrir" target="_blank" rel="noopener">Ouvrir</a>
          </div>
        </div>
        <div class="actions fin"><button type="button" class="secondaire p-fermer">Fermer</button></div>
      </div>`
    this.racine.appendChild(d)
    this.d = d
    const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T

    // Les séances repérées : la plus récente d'abord
    const choix = q<HTMLSelectElement>('.p-seance')
    choix.innerHTML = this.seances.map((s, i) => `<option value="${i}">${echapper(jour(s.debut))}, ${heure(s.debut)} → ${heure(s.fin)} · ${s.gestes} geste${s.gestes > 1 ? 's' : ''}</option>`).join('')
    choix.addEventListener('change', () => this.choisirSeance())

    q('.p-comptes .cases').innerHTML = COMPTES.map((c, i) => `
      <label class="case"><input type="radio" name="p-compte" value="${c.cle}"${i === 0 ? ' checked' : ''}${c.relais ? '' : ' disabled'}>
      <span>${echapper(c.nom)}${c.relais ? '' : ' <em>(relais à installer)</em>'}</span></label>`).join('')

    q('.p-apercu').addEventListener('click', () => this.apercu())
    q('.p-fichier').addEventListener('click', () => this.enregistrer())
    q('.p-publier').addEventListener('click', () => this.publier())
    q('.p-copier').addEventListener('click', () => this.copier(q<HTMLInputElement>('.p-lien').value, 'Lien copié'))
    q('.p-pronote').addEventListener('click', () => this.copier(this.textePronote, 'Texte copié : collez-le dans le cahier de textes'))
    q('.p-fermer').addEventListener('click', () => d.close())
    d.addEventListener('close', () => { d.remove(); if (this.d === d) this.d = null })
    d.addEventListener('change', e => { if ((e.target as HTMLElement).closest('.p-pages, .p-comptes')) this.majVerifications() })

    if (!this.enLigne) {
      q('.p-apercu').hidden = true
      q<HTMLButtonElement>('.p-publier').disabled = true
      this.etat('Cette version de Tableau MEM (un seul fichier) ne peut ni publier ni montrer l\'aperçu : enregistrez le fichier séance, ou utilisez Tableau MEM en ligne pour publier.')
    }
    this.choisirSeance()
    d.showModal()
    choix.focus()
  }

  private get seance() { return this.seances[Number((this.d!.querySelector('.p-seance') as HTMLSelectElement).value)] }
  private get compte() { return (this.d!.querySelector('input[name=p-compte]:checked') as HTMLInputElement | null)?.value ?? '' }
  private cleRegistre(s = this.seance, compte = this.compte) { return `${compte}:${s.debut}` }

  private choisirSeance() {
    const d = this.d!, s = this.seance, t = this.app.tableau
    const ordre = t.ordre.toArray()
    // Les pages : celles de la séance cochées, puis les autres
    const toutes = [...s.pages, ...ordre.filter(p => !s.pages.includes(p))]
    d.querySelector('.p-pages .cases')!.innerHTML = toutes.map(p => {
      const n = ordre.indexOf(p)
      return `<label class="case"><input type="checkbox" value="${p}"${s.pages.includes(p) ? ' checked' : ''}><span>${n >= 0 ? `Page ${n + 1}` : 'Page supprimée depuis'}</span></label>`
    }).join('')
    const deja = this.registre.get(this.cleRegistre())
    ;(d.querySelector('.p-titre') as HTMLInputElement).value = deja?.titre ?? `Séance du ${new Date(s.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    ;(d.querySelector('.p-resultat') as HTMLElement).hidden = true
    this.majVerifications()
  }

  private pagesChoisies() {
    return [...this.d!.querySelectorAll<HTMLInputElement>('.p-pages input:checked')].map(i => i.value)
  }

  /** Le film élève de ce qui est choisi */
  private film(): FilmEleve {
    const s = this.seance
    return exporter(this.app.tableau, { de: s.de, a: s.a, pages: this.pagesChoisies(), titre: (this.d!.querySelector('.p-titre') as HTMLInputElement).value })
  }

  /** Ce qu'il faut regarder avant de publier : images, noms, poids */
  private majVerifications() {
    const d = this.d!, ul = d.querySelector('.p-verifier')!
    const pages = this.pagesChoisies()
    ;(d.querySelector('.p-publier') as HTMLButtonElement).disabled = !pages.length || !this.enLigne || !compteDe(this.compte)?.relais
    if (!pages.length) { ul.innerHTML = '<li class="alerte">Cochez au moins une page.</li>'; return }
    const f = this.film()
    const images = Object.keys(f.images).length
    const deja = this.registre.get(this.cleRegistre())
    const items = [
      `<li>${f.etapes.length} geste${f.etapes.length > 1 ? 's' : ''} · ${mmss(new Bobine(f).duree)} de replay · ${f.chapitres.length} chapitre${f.chapitres.length > 1 ? 's' : ''}</li>`,
      images ? `<li class="alerte">${images} image${images > 1 ? 's' : ''} importée${images > 1 ? 's' : ''} : vérifiez qu'aucune ne montre un nom, une copie ou un visage d'élève.</li>` : '',
      '<li class="alerte">Vérifiez qu\'aucun prénom n\'est resté écrit au tableau pendant la séance (ce qui a été effacé avant la séance n\'est pas publié).</li>',
      deja ? `<li>Déjà publiée le ${new Date(deja.quand).toLocaleDateString('fr-FR')} : publier à nouveau met à jour la même séance, le lien ne change pas.</li>` : '',
    ]
    ul.innerHTML = items.join('')
  }

  private etat(t: string, erreur = false) {
    const p = this.d?.querySelector('.p-etat') as HTMLElement | null
    if (!p) return
    p.textContent = t; p.classList.toggle('erreur', erreur)
  }

  /** L'aperçu : le lecteur des élèves s'ouvre dans un onglet, le film y passe sans rien publier */
  private apercu() {
    const film = this.film()
    const w = window.open(this.lecteur + '#apercu', '_blank')
    if (!w) return this.etat('Le navigateur a bloqué l\'onglet de l\'aperçu : autorisez les fenêtres pour ce site.', true)
    const recevoir = (e: MessageEvent) => {
      if (e.source !== w || e.origin !== location.origin || e.data?.type !== 'mem-revoir-pret') return
      w.postMessage({ type: 'mem-revoir-apercu', film }, location.origin)
      window.removeEventListener('message', recevoir)
    }
    window.addEventListener('message', recevoir)
  }

  /** Le fichier séance, à déposer dans l'ENT ou sur une clé USB : il s'ouvre dans le lecteur */
  private async enregistrer() {
    const film = this.film()
    const texte = await ecrireFilm(film)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texte], { type: 'application/json' }))
    // Sans accents ni signes : le nom passe partout (ENT, clés USB, messageries)
    a.download = (film.titre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 _.-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'seance') + '.prof'
    // Dans la fenêtre elle-même : hors d'elle, la page est inerte tant qu'elle est ouverte
    ;(this.d ?? document.body).appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    this.etat(`Fichier enregistré (${kilo(texte.length)}).`)
  }

  private async publier() {
    const d = this.d!, b = d.querySelector('.p-publier') as HTMLButtonElement
    const compte = compteDe(this.compte)
    if (!compte?.relais) return this.etat('Ce compte n\'a pas encore de relais : choisissez-en un autre.', true)
    b.disabled = true
    try {
      if (!connecte()) { this.etat('Connexion à Google…'); await connecter() }
      this.etat('Préparation de la séance…')
      const film = this.film()
      const texte = await ecrireFilm(film)
      const cle = this.cleRegistre()
      const deja = this.registre.get(cle)
      this.etat(`Envoi sur ${compte.nom} (${kilo(texte.length)})…`)
      const r = await publier(film.titre, texte, deja?.id ?? null, async id => {
        this.etat('Vérification : on ouvre la séance comme un élève…')
        try {
          const relu = await lireFilm(await lireParLeRelais(compte.cle, id))
          if (relu.etapes.length !== film.etapes.length) throw new Error('différente')
        } catch {
          throw new Error(`Le relais de « ${compte.nom} » ne trouve pas la séance qu'on vient d'envoyer. Êtes-vous connecté au bon compte Google ?`)
        }
      })
      this.registre.set(cle, { compte: compte.cle, id: r.id, titre: film.titre, quand: Date.now() })
      const lien = lienEleve(this.lecteur, compte.cle, r.id)
      ;(d.querySelector('.p-lien') as HTMLInputElement).value = lien
      ;(d.querySelector('.p-ouvrir') as HTMLAnchorElement).href = lien
      ;(d.querySelector('.p-resultat') as HTMLElement).hidden = false
      this.textePronote = this.pourPronote(film, lien)
      const fait = r.miseAJour ? 'Séance mise à jour : le lien déjà donné aux élèves montre la nouvelle version.' : 'Séance publiée. Copiez le lien dans le cahier de textes.'
      if (lien.startsWith('https://')) this.etat(fait)
      else this.etat(fait + ' Attention : publiée depuis cet ordinateur, le lien ne s\'ouvrira que chez vous. Publiez depuis Tableau MEM en ligne pour les élèves.', true)
      this.majVerifications()
    } catch (e) {
      this.etat(e instanceof Error ? e.message : 'La publication a échoué. Réessayez.', true)
    } finally {
      b.disabled = false
    }
  }

  private textePronote = ''
  private pourPronote(film: FilmEleve, lien: string) {
    const b = new Bobine(film)
    const chapitres = b.chapitres.length > 1
      ? '\nChapitres : ' + b.chapitres.map((c, i) => `${i + 1}. ${c.titre} (${mmss(b.temps[c.i])})`).join(' · ')
      : ''
    return `Revoir la séance : ${film.titre}\n${lien}${chapitres}`
  }

  private async copier(texte: string, ok: string) {
    try { await navigator.clipboard.writeText(texte); this.etat(ok) }
    catch {
      const champ = this.d?.querySelector('.p-lien') as HTMLInputElement
      champ.value = texte; champ.select()
      this.etat('Copie refusée par le navigateur : le texte est sélectionné, faites Ctrl+C.', true)
    }
  }
}
