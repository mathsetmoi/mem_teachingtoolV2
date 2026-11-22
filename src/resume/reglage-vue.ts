// =============================================================
// LA FENÊTRE « RÉDACTION AUTOMATIQUE »
// Ouverte depuis Publier (le lien sous le texte du cahier de textes) : la
// clé de l'API Anthropic de ce navigateur, le modèle, les consignes du
// professeur pour le texte, et l'adresse du Pronote de chaque
// établissement (pour le bouton « Ouvrir Pronote »). Tout reste dans ce
// navigateur (voir redaction.ts).
// =============================================================
import { fermerSurLeFond } from '../dialogue'
import { ETABLISSEMENTS, MODELES, adresseValable, cleRedaction, cleValable, consignesDuProfesseur, CONSIGNES_MAX, demanderAClaude, enTeteRedaction, modeleChoisi, nettoyerCle, nomDuModele, retenirConsignes, retenirEnTete, retenirModele, pronoteDe, retenirCleRedaction, retenirPronote, ErreurRedaction } from './redaction'

const echapper = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** La fenêtre. fini : appelé à la fermeture (la clé a pu changer) */
export function ouvrirRedaction(racine: HTMLElement, fini: () => void): HTMLDialogElement {
  document.querySelector('dialog.dialogue-redaction')?.remove()
  const d = document.createElement('dialog')
  d.className = 'dialogue dialogue-redaction'
  d.setAttribute('aria-labelledby', 'titre-redaction')
  const cle = cleRedaction()
  const modele = modeleChoisi()
  d.innerHTML = `
    <h2 id="titre-redaction">Rédaction automatique</h2>
    <div class="corps">
      <p>Quand vous ouvrez Publier, Claude lit les pages de la séance, écriture à la main comprise, et rédige le texte du cahier de textes. Vous pouvez le corriger avant de le copier.</p>
      <details class="r-comment"${cle ? '' : ' open'}><summary>Obtenir une clé (une seule fois, 10 minutes)</summary>
        <ol>
          <li>Ouvrez <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a> et créez un compte.</li>
          <li>Ajoutez du crédit : Settings, Billing, Buy credits (5 $ suffisent pour l'année), sans recharge automatique (Auto reload).</li>
          <li>Fixez une limite par mois : Settings, Limits, Spend limits.</li>
          <li>Créez la clé : Settings, API keys, Create key, puis copiez-la tout de suite (elle ne s'affiche qu'une fois).</li>
          <li>Collez-la ci-dessous, puis « Essayer la clé ».</li>
        </ol></details>
      <label class="champ"><span>Clé de l'API Anthropic</span>
        <input class="r-cle" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${echapper(cle)}" /></label>
      <p class="r-actions-cle"><button type="button" class="secondaire petit r-essayer">Essayer la clé</button>
        <button type="button" class="secondaire petit r-retirer"${cle ? '' : ' hidden'}>Retirer la clé</button></p>
      <label class="champ"><span>Modèle</span>
        <select class="r-modele">${MODELES.map(m => `<option value="${m.id}"${m.id === modele ? ' selected' : ''}>${echapper(m.nom)} : ${echapper(m.dit)}</option>`).join('')}</select></label>
      <label class="champ r-champ-consignes"><span>Vos consignes pour le texte (facultatif)</span>
        <textarea class="r-consignes" rows="4" maxlength="${CONSIGNES_MAX}" spellcheck="true" placeholder="Par exemple : Commence par les notions, puis les exercices. Écris « Exercices » au pluriel. Termine « À faire » par « pour lundi » si c'est écrit au tableau.">${echapper(consignesDuProfesseur())}</textarea></label>
      <p class="r-aide-consignes">Claude les suit à chaque rédaction, en plus des règles de l'outil (rien d'inventé, aucun nom d'élève).</p>
      <label class="r-case"><input type="checkbox" class="r-entete"${enTeteRedaction() ? ' checked' : ''} /> Mettre la date et le chapitre en tête du texte</label>
      <fieldset class="r-pronote"><legend>Votre Pronote, pour le bouton « Ouvrir Pronote »</legend>
        ${ETABLISSEMENTS.map(e => `<label class="champ"><span>${echapper(e.nom)}</span>
          <input class="r-pronote-${e.cle}" type="url" inputmode="url" autocomplete="off" placeholder="https://…/pronote/professeur.html" value="${echapper(pronoteDe(e.cle))}" /></label>`).join('')}
      </fieldset>
      <ul class="r-avertir">
        <li>La clé reste dans ce navigateur, sur cet ordinateur : elle ne part qu'à Anthropic. Ne la collez jamais ailleurs.</li>
        <li>Les pages de la séance partent chez Anthropic à chaque rédaction : n'écrivez jamais de prénom d'élève au tableau.</li>
        <li>Seulement dans la version en ligne. Sans clé, ou sans internet, l'outil rédige lui-même un texte plus court (sans lire l'écriture à la main).</li>
      </ul>
      <p class="r-etat" role="status" aria-live="polite"></p>
      <div class="actions fin">
        <button type="button" class="secondaire r-fermer">Annuler</button>
        <button type="button" class="principal r-garder">Enregistrer</button>
      </div>
    </div>`
  const q = <T extends HTMLElement>(s: string) => d.querySelector(s) as T
  const etat = (t: string, erreur = false) => { const p = q('.r-etat'); p.textContent = t; p.classList.toggle('erreur', erreur) }
  const champ = q<HTMLInputElement>('.r-cle')
  q('.r-essayer').addEventListener('click', async () => {
    const c = nettoyerCle(champ.value)
    if (!cleValable(c)) return etat('Ce n\'est pas une clé de l\'API Anthropic : elle commence par « sk-ant- ». Copiez-la sur console.anthropic.com (API keys), puis collez-la ici.', true)
    const b = q<HTMLButtonElement>('.r-essayer')
    b.disabled = true; etat('Essai de la clé…')
    try {
      const m = q<HTMLSelectElement>('.r-modele').value
      await demanderAClaude(c, 'Réponds seulement : OK', [], { modele: m, maxTokens: 256 })
      etat(`✓ La clé marche (modèle : ${nomDuModele(m)}).`)
    } catch (e) { etat(e instanceof ErreurRedaction ? e.message : 'Claude ne répond pas.', true) }
    finally { b.disabled = false }
  })
  q('.r-retirer').addEventListener('click', () => { champ.value = ''; etat('La clé sera retirée quand vous enregistrez.') })
  q('.r-garder').addEventListener('click', () => {
    const c = nettoyerCle(champ.value)
    if (c && !cleValable(c)) return etat('Ce n\'est pas une clé de l\'API Anthropic : elle commence par « sk-ant- ». Copiez-la sur console.anthropic.com (API keys), puis collez-la ici.', true)
    for (const e of ETABLISSEMENTS) {
      const v = q<HTMLInputElement>(`.r-pronote-${e.cle}`).value
      if (v.trim() && !adresseValable(v)) return etat(`L'adresse du Pronote de ${e.nom} ne va pas : copiez-la depuis la barre d'adresse de Pronote (elle commence par https://).`, true)
    }
    if (c !== cleRedaction()) retenirCleRedaction(c)
    retenirModele(q<HTMLSelectElement>('.r-modele').value)
    for (const e of ETABLISSEMENTS) retenirPronote(e.cle, q<HTMLInputElement>(`.r-pronote-${e.cle}`).value)
    retenirConsignes(q<HTMLTextAreaElement>('.r-consignes').value)
    retenirEnTete(q<HTMLInputElement>('.r-entete').checked)
    d.close()
  })
  q('.r-fermer').addEventListener('click', () => d.close())
  d.addEventListener('close', () => { d.remove(); fini() })
  fermerSurLeFond(d, () => d.close())
  racine.appendChild(d)
  d.showModal()
  ;(cle ? q<HTMLButtonElement>('.r-garder') : champ).focus()
  return d
}
