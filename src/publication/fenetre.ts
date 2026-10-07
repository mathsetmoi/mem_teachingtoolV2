// =============================================================
// LA FENÊTRE « PUBLIER LE REPLAY »
// Le professeur choisit la séance (repérée toute seule dans le film), les
// pages, un titre et le compte Google. Il peut la regarder comme un élève
// avant de la publier. Il reçoit un lien stable à coller dans Pronote :
// republier la même séance met à jour le même fichier, le lien ne change pas.
// =============================================================
import * as Y from 'yjs'
import type { App } from '../app'
import { exporter, pagesDeLaSeance, seancesDuFilm } from '../revoir/exporter'
import type { Seance } from '../revoir/exporter'
import type { FilmEleve } from '../revoir/format'
import { ErreurFilm, ecrireFilm, lireFilm } from '../revoir/format'
import { Bobine } from '../revoir/bobine'
import { lireParLeRelais } from '../revoir/relais'
import { CLIENT_GOOGLE, COMPTES, compteDe, lienEleve } from './comptes'
import { connecte, connecter, courrielDe, deconnecter, preparerGoogle, publier } from './drive'

/** Ce qu'on retient d'une séance publiée, dans le document du professeur
 *  (jamais dans le film élève) : de quoi republier au même lien */
interface Publiee { compte: string; id: string; titre: string; quand: number; cle?: string }

const MINUTE = 60_000
/** Les découpages proposés : un silence plus long sépare deux séances */
const DECOUPAGES = [20, 10, 5, 2]

const heure = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')
const jour = (t: number) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const echapper = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Le compte Google avec lequel on a publié la dernière fois dans `compte`,
 *  retenu sur cet ordinateur seulement : Google le propose en premier */
const MEMOIRE_COMPTE = 'tableau-mem:compte-google:'
const dernierCompte = (compte: string) => { try { return localStorage.getItem(MEMOIRE_COMPTE + compte) ?? '' } catch { return '' } }
const retenirCompte = (compte: string, courriel: string) => { try { if (courriel) localStorage.setItem(MEMOIRE_COMPTE + compte, courriel) } catch { /* navigation privée */ } }
const memes = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const kilo = (n: number) => n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`

/** La séance a-t-elle quelque chose à montrer ? */
const visible = (f: FilmEleve) => f.pages.some(p => p.formes.length) || f.etapes.some(e => e.o.some(o => o[0] === '='))

export class Publication {
  private d: HTMLDialogElement | null = null
  private seances: Seance[] = []
  private textePronote = ''
  /** Publier quand même avec un autre compte que d'habitude : « compte:adresse » confirmé */
  private autreCompteAccepte = ''

  constructor(private app: App, private racine: HTMLElement) {}

  private get registre() { return this.app.tableau.doc.getMap('publications') as Y.Map<Publiee> }
  private get lecteur() { return new URL('revoir.html', location.href).toString() }
  /** La version en ligne (ou celle de développement) a le lecteur à côté d'elle et peut se connecter à
   *  Google ; la version « un seul fichier » (clé USB) ne peut qu'enregistrer le fichier séance */
  private get enLigne() {
    const servie = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    return servie && (import.meta.env.DEV || import.meta.env.VITE_EN_LIGNE === '1')
  }

  /** Les séances du film qui ont quelque chose à montrer, la plus récente d'abord */
  private reperer(ecart: number) {
    const t = this.app.tableau
    return seancesDuFilm(t.film.toArray(), ecart)
      .filter(s => visible(exporter(t, { de: s.de, a: s.a, pages: pagesDeLaSeance(t, s), titre: '' })))
  }

  ouvrir() {
    this.seances = this.reperer(DECOUPAGES[0] * MINUTE)
    if (!this.seances.length) return this.app.ui.message('Rien à publier pour l\'instant : le replay commence avec les gestes faits au tableau.')
    if (this.enLigne) preparerGoogle()
    this.d?.remove()
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-publier'
    d.setAttribute('aria-labelledby', 'titre-publier')
    d.innerHTML = `
      <h2 id="titre-publier">Publier le replay pour les élèves</h2>
      <div class="corps">
        <label class="champ"><span>Séance</span><select class="p-seance"></select></label>
        <label class="champ"><span>Deux cours se suivent de près ? Séparer les séances aux pauses de plus de</span>
          <select class="p-decoupage">${DECOUPAGES.map(m => `<option value="${m}">${m} minutes</option>`).join('')}</select></label>
        <fieldset class="p-pages"><legend>Pages où l'on a écrit pendant la séance</legend><div class="cases"></div></fieldset>
        <label class="champ"><span>Titre (les élèves le voient)</span><input class="p-titre" maxlength="120" /></label>
        <fieldset class="p-comptes"><legend>Publier dans</legend><div class="cases"></div>
          <p class="p-google"><span class="p-qui"></span> <button type="button" class="secondaire petit p-changer">Choisir le compte Google</button></p></fieldset>
        <label class="case p-nouveau-lien" hidden><input type="checkbox" class="p-nouveau"><span>Publier comme une nouvelle séance (nouveau lien, l'ancien reste tel quel)</span></label>
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

    q<HTMLSelectElement>('.p-seance').addEventListener('change', () => this.choisirSeance())
    q<HTMLSelectElement>('.p-decoupage').addEventListener('change', () => {
      const s = this.reperer(Number(q<HTMLSelectElement>('.p-decoupage').value) * MINUTE)
      if (s.length) { this.seances = s; this.remplirSeances() }
    })
    q('.p-comptes .cases').innerHTML = COMPTES.map((c, i) => `
      <label class="case"><input type="radio" name="p-compte" value="${echapper(c.cle)}"${i === 0 ? ' checked' : ''}${c.relais ? '' : ' disabled'}>
      <span>${echapper(c.nom)}${c.relais ? '' : ' <em>(relais à installer)</em>'}</span></label>`).join('')

    q('.p-apercu').addEventListener('click', () => this.apercu())
    q('.p-fichier').addEventListener('click', () => this.enregistrer())
    q('.p-publier').addEventListener('click', () => this.publier())
    q('.p-changer').addEventListener('click', () => this.choisirCompteGoogle())
    q('.p-copier').addEventListener('click', () => this.copier(q<HTMLInputElement>('.p-lien').value, 'Lien copié'))
    q('.p-pronote').addEventListener('click', () => this.copier(this.textePronote, 'Texte copié : collez-le dans le cahier de textes'))
    q('.p-fermer').addEventListener('click', () => d.close())
    d.addEventListener('close', () => { d.remove(); if (this.d === d) this.d = null })
    d.addEventListener('change', e => {
      if ((e.target as HTMLElement).closest('.p-comptes')) { this.majNouveauLien(); this.majGoogle() }
      if ((e.target as HTMLElement).closest('.p-pages, .p-comptes, .p-nouveau-lien')) this.majVerifications()
    })

    if (!this.enLigne) {
      q('.p-apercu').hidden = true
      q<HTMLButtonElement>('.p-publier').disabled = true
      this.etat('Cette version de Tableau MEM (un seul fichier) ne peut ni publier ni montrer l\'aperçu : enregistrez le fichier séance, ou utilisez Tableau MEM en ligne pour publier.')
    }
    this.remplirSeances()
    this.majGoogle()
    d.showModal()
    q('.p-seance').focus()
  }

  private remplirSeances() {
    const choix = this.d!.querySelector('.p-seance') as HTMLSelectElement
    choix.innerHTML = this.seances.map((s, i) => `<option value="${i}">${echapper(jour(s.debut))}, ${heure(s.debut)} → ${heure(s.fin)} · ${s.gestes} geste${s.gestes > 1 ? 's' : ''}</option>`).join('')
    this.choisirSeance()
  }

  private get seance() { return this.seances[Number((this.d!.querySelector('.p-seance') as HTMLSelectElement).value)] ?? this.seances[0] }
  private get compte() { return (this.d!.querySelector('input[name=p-compte]:checked') as HTMLInputElement | null)?.value ?? '' }
  private get nouveauLien() { return !!(this.d!.querySelector('.p-nouveau') as HTMLInputElement).checked }
  private cleRegistre(s = this.seance, compte = this.compte) { return `${compte}:${s.debut}` }

  private choisirSeance() {
    const d = this.d!, s = this.seance, t = this.app.tableau
    const ordre = t.ordre.toArray()
    // Seules les pages où il se passe quelque chose : les autres ne seraient pas montrées
    const pages = pagesDeLaSeance(t, s)
    d.querySelector('.p-pages .cases')!.innerHTML = pages.map(p => {
      const n = ordre.indexOf(p)
      return `<label class="case"><input type="checkbox" value="${echapper(p)}" checked><span>${n >= 0 ? `Page ${n + 1}` : 'Page jetée depuis'}</span></label>`
    }).join('')
    const deja = this.registre.get(this.cleRegistre())
    ;(d.querySelector('.p-titre') as HTMLInputElement).value = deja?.titre ?? `Séance du ${new Date(s.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    ;(d.querySelector('.p-resultat') as HTMLElement).hidden = true
    this.majNouveauLien()
    this.majVerifications()
  }

  private majNouveauLien() {
    const d = this.d!, deja = this.registre.get(this.cleRegistre())
    ;(d.querySelector('.p-nouveau-lien') as HTMLElement).hidden = !deja
    if (!deja) (d.querySelector('.p-nouveau') as HTMLInputElement).checked = false
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
    const publier = d.querySelector('.p-publier') as HTMLButtonElement
    publier.disabled = !pages.length || !this.enLigne || !CLIENT_GOOGLE || !compteDe(this.compte)?.relais
    ;(d.querySelector('.p-fichier') as HTMLButtonElement).disabled = !pages.length
    if (!pages.length) { ul.innerHTML = '<li class="alerte">Cochez au moins une page.</li>'; return }
    const f = this.film()
    const images = Object.keys(f.images).length
    const deja = this.registre.get(this.cleRegistre())
    const items = [
      `<li>${f.etapes.length} geste${f.etapes.length > 1 ? 's' : ''} · ${mmss(new Bobine(f).duree)} de replay · ${f.chapitres.length} chapitre${f.chapitres.length > 1 ? 's' : ''}</li>`,
      images ? `<li class="alerte">${images} image${images > 1 ? 's' : ''} importée${images > 1 ? 's' : ''} : vérifiez qu'aucune ne montre un nom, une copie ou un visage d'élève.</li>` : '',
      '<li class="alerte">Vérifiez qu\'aucun prénom n\'a été écrit au tableau pendant la séance : tout ce qui a été visible pendant la séance part, même effacé ensuite. Rejouez l\'aperçu pour le voir.</li>',
      this.enLigne && !CLIENT_GOOGLE ? '<li class="alerte">La publication sur Google Drive n\'est pas encore réglée sur ce site (identifiant Google à créer, voir le mode d\'emploi). En attendant, enregistrez le fichier séance.</li>' : '',
      deja && !this.nouveauLien ? `<li>Déjà publiée le ${new Date(deja.quand).toLocaleDateString('fr-FR')} : publier à nouveau met à jour cette séance, au même lien.</li>` : '',
    ]
    ul.innerHTML = items.join('')
  }

  /** Le compte Google : celui qui est connecté, ou celui que Google proposera */
  private majGoogle() {
    const d = this.d
    if (!d) return
    const ligne = d.querySelector('.p-google') as HTMLElement
    const compte = compteDe(this.compte)
    ligne.hidden = !this.enLigne || !CLIENT_GOOGLE || !compte?.relais
    if (ligne.hidden || !compte) return
    const courriel = courrielDe(compte.cle), dernier = dernierCompte(compte.cle)
    const qui = d.querySelector('.p-qui') as HTMLElement
    const autre = !!courriel && !!dernier && !memes(courriel, dernier)
    qui.textContent = courriel ? `Connecté : ${courriel}`
      : connecte(compte.cle) ? 'Connecté à Google.'
      : dernier ? `Google proposera ${dernier} (dernier compte utilisé pour « ${compte.nom} »).`
      : 'Au moment de publier, Google demandera quel compte utiliser.'
    qui.classList.toggle('alerte', autre)
    if (autre) qui.textContent += ` — d'habitude, « ${compte.nom} » est ${dernier}.`
    ;(d.querySelector('.p-changer') as HTMLButtonElement).textContent = connecte(compte.cle) ? 'Changer de compte Google' : 'Choisir le compte Google'
  }

  /** Se connecter (ou changer de compte) sans rien publier : Google montre ses comptes */
  private async choisirCompteGoogle() {
    const compte = compteDe(this.compte)
    if (!compte?.relais) return
    const b = this.d!.querySelector('.p-changer') as HTMLButtonElement
    const publier = this.d!.querySelector('.p-publier') as HTMLButtonElement
    b.disabled = true; publier.disabled = true
    this.etat(`Connexion à Google (${compte.nom})…`)
    try {
      await connecter(compte.cle, dernierCompte(compte.cle))
      this.etat('')
    } catch (e) {
      this.etat(e instanceof Error ? e.message : 'La connexion à Google a échoué. Réessayez.', true)
    } finally {
      b.disabled = false
      this.majGoogle()
      this.majVerifications()
    }
  }

  private etat(t: string, erreur = false) {
    const p = this.d?.querySelector('.p-etat') as HTMLElement | null
    if (!p) return
    p.textContent = t; p.classList.toggle('erreur', erreur)
  }

  /** L'aperçu : le lecteur des élèves s'ouvre dans un onglet, le film y passe sans rien publier.
   *  On répond tant que l'onglet est ouvert : le recharger redemande le film. */
  private apercu() {
    const film = this.film()
    const w = window.open(this.lecteur + '#apercu', '_blank')
    if (!w) return this.etat('Le navigateur a bloqué l\'onglet de l\'aperçu : autorisez les fenêtres pour ce site.', true)
    const recevoir = (e: MessageEvent) => {
      if (w.closed) { window.removeEventListener('message', recevoir); return }
      if (e.source !== w || e.origin !== location.origin || e.data?.type !== 'mem-revoir-pret') return
      w.postMessage({ type: 'mem-revoir-apercu', film }, location.origin)
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
    a.download = (film.titre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _.-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'seance') + '.prof'
    // Dans la fenêtre elle-même : hors d'elle, la page est inerte tant qu'elle est ouverte
    ;(this.d ?? document.body).appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    this.etat(`Fichier enregistré (${kilo(texte.length)}).`)
  }

  private async publier() {
    const d = this.d!, b = d.querySelector('.p-publier') as HTMLButtonElement
    const compte = compteDe(this.compte)
    if (!compte?.relais) return this.etat('Ce compte n\'a pas encore de relais : choisissez-en un autre.', true)
    const changer = d.querySelector('.p-changer') as HTMLButtonElement
    b.disabled = true; changer.disabled = true
    // Le relais ne trouve pas la séance : mauvais compte. On se déconnecte
    // APRÈS que publier() a jeté la copie envoyée au mauvais endroit
    let mauvaisCompte = false
    try {
      // Le jeton vaut pour un compte : changer de compte, c'est se reconnecter
      const dernier = dernierCompte(compte.cle)
      if (!connecte(compte.cle)) { this.etat(`Connexion à Google (${compte.nom})…`); await connecter(compte.cle, dernier) }
      this.majGoogle()
      // Un autre compte que celui que ce relais a toujours servi : la séance
      // irait dans un Drive que le relais ne lit pas. On le dit avant d'envoyer.
      const courriel = courrielDe(compte.cle)
      if (courriel && dernier && !memes(courriel, dernier) && this.autreCompteAccepte !== `${compte.cle}:${courriel}`) {
        this.autreCompteAccepte = `${compte.cle}:${courriel}`
        return this.etat(`Vous êtes connecté avec ${courriel}, mais « ${compte.nom} » a toujours été publié avec ${dernier}. Cliquez « Changer de compte Google », ou à nouveau « Publier » pour publier quand même avec ${courriel}.`, true)
      }
      this.etat('Préparation de la séance…')
      const film = this.film()
      const texte = await ecrireFilm(film)
      const cle = this.cleRegistre()
      const deja = this.nouveauLien ? undefined : this.registre.get(cle)
      // Une nouvelle séance demandée : sa propre clé, pour ne pas reprendre l'ancien fichier
      const cleDrive = this.nouveauLien ? `${cle}:${Date.now()}` : (deja?.cle ?? cle)
      this.etat(`Envoi sur ${compte.nom} (${kilo(texte.length)})…`)
      const r = await publier(film.titre, texte, cleDrive, deja?.id ?? null, async id => {
        this.etat('Vérification : on ouvre la séance comme un élève…')
        let relu: FilmEleve
        try { relu = await lireFilm(await lireParLeRelais(compte.cle, id)) }
        catch (e) {
          const m = e instanceof ErreurFilm ? e.message : String(e)
          // Le relais ne la trouve pas : c'est presque toujours qu'on a publié dans l'autre compte
          if (/introuvable/i.test(m)) {
            mauvaisCompte = true
            const qui = courrielDe(compte.cle)
            throw new Error(`Le relais de « ${compte.nom} » ne trouve pas la séance qu'on vient d'envoyer : ${qui ? `le compte ${qui} n'est sans doute pas le sien` : 'vous êtes sans doute connecté à un autre compte Google'}. Réessayez en choisissant le bon compte.`)
          }
          throw new Error(`Le relais de « ${compte.nom} » : ${m}`)
        }
        if (relu.etapes.length !== film.etapes.length) throw new Error(`Le relais de « ${compte.nom} » sert une autre version de la séance : réessayez dans un instant.`)
      })
      this.registre.set(cle, { compte: compte.cle, id: r.id, titre: film.titre, quand: Date.now(), cle: cleDrive })
      // Le relais a servi la séance : ce compte Google est bien le sien
      retenirCompte(compte.cle, courrielDe(compte.cle))
      this.majGoogle()
      const lien = lienEleve(this.lecteur, compte.cle, r.id)
      ;(d.querySelector('.p-lien') as HTMLInputElement).value = lien
      ;(d.querySelector('.p-ouvrir') as HTMLAnchorElement).href = lien
      ;(d.querySelector('.p-resultat') as HTMLElement).hidden = false
      ;(d.querySelector('.p-nouveau') as HTMLInputElement).checked = false
      this.textePronote = this.pourPronote(film, lien)
      const ancienPerdu = !!deja && !r.miseAJour
      const fait = r.restauree ? 'Séance remise en ligne (elle était à la corbeille du Drive) : le lien déjà donné aux élèves remarche.'
        : r.miseAJour ? 'Séance mise à jour : le lien déjà donné aux élèves montre la nouvelle version.'
        : ancienPerdu ? 'L\'ancienne publication n\'est plus sur le Drive : la séance a un NOUVEAU lien, recopiez-le dans Pronote.'
        : 'Séance publiée. Copiez le lien dans le cahier de textes.'
      if (lien.startsWith('https://')) this.etat(fait, ancienPerdu)
      else this.etat(fait + ' Attention : publiée depuis cet ordinateur, le lien ne s\'ouvrira que chez vous. Publiez depuis Tableau MEM en ligne pour les élèves.', true)
      this.majNouveauLien()
      this.majVerifications()
    } catch (e) {
      if (mauvaisCompte) deconnecter()
      this.etat(e instanceof Error ? e.message : 'La publication a échoué. Réessayez.', true)
    } finally {
      b.disabled = false; changer.disabled = false
      this.majGoogle()
    }
  }

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
