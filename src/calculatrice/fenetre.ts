// =============================================================
// LA FENÊTRE « INSTALLER LA CALCULATRICE NUMWORKS »
// Une fois par ordinateur (et par navigateur) : le professeur télécharge
// l'émulateur hors connexion sur le site de NumWorks, puis le donne ici, en
// le glissant dans la case de sa calculatrice ou par « Choisir le
// fichier ». Chaque case dit si sa calculatrice est installée, et depuis
// quand ; « Remplacer… » prend une nouvelle version, « Retirer » l'enlève.
// =============================================================
import type { ModeleCalculatrice } from '../types'
import { fermerSurLeFond } from '../dialogue'
import { nomDuModele } from './dessin'
import { FichierRefuse, etatDesEmulateurs, installerEmulateur, lireFichierEmulateur, retirerEmulateur } from './emulateurs'

/** Où télécharger chaque émulateur, sur le site de NumWorks */
export const PAGES_NUMWORKS: Record<ModeleCalculatrice, string> = {
  lycee: 'https://www.numworks.com/fr/simulateur/telecharger/',
  college: 'https://www.numworks.com/fr/assistance/scientifique/emulateur/',
}

const QUOI: Record<ModeleCalculatrice, string> = {
  lycee: 'la calculatrice graphique : calculs, graphes, Python',
  college: 'la calculatrice scientifique',
}

export interface HoteInstallation {
  /** L'interface se remet à jour (une fenêtre ouverte, fermée) */
  maj(): void
  /** Une calculatrice vient d'être installée ou retirée */
  change(): void
  message(t: string): void
}

function jour(t: number): string {
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Ouvre la fenêtre ; enAvant : la case de cette calculatrice a le focus */
export function ouvrirInstallation(hote: HoteInstallation, enAvant?: ModeleCalculatrice): HTMLDialogElement {
  const d = document.createElement('dialog')
  d.className = 'dialogue dialogue-calculatrice'
  d.innerHTML = `<h2>Installer la calculatrice NumWorks</h2><div class="corps">
    <p>À faire une seule fois sur cet ordinateur. Ensuite, la calculatrice marche sans internet, aussi dans la version hors ligne.</p>
    <ol class="calculatrice-etapes">
      <li>Sur le site de NumWorks, téléchargez l'émulateur <b>hors connexion</b> (un fichier .html).</li>
      <li>Donnez ce fichier ici : glissez-le dans la case de sa calculatrice, ou cliquez sur « Choisir le fichier ».</li>
    </ol>
    <div class="calculatrice-cases"></div>
    <div class="actions"><button type="button" class="principal" data-a="fermer">Fermer</button></div></div>`
  const cases = d.querySelector<HTMLDivElement>('.calculatrice-cases')!
  const boites = new Map<ModeleCalculatrice, HTMLElement>()
  for (const m of ['lycee', 'college'] as ModeleCalculatrice[]) {
    const b = document.createElement('section')
    b.className = 'calculatrice-case'
    b.innerHTML = `<h3></h3><p class="quoi"></p><p class="etat" aria-live="polite"></p>
      <a target="_blank" rel="noopener">Ouvrir la page de téléchargement</a>
      <div class="boutons"><button type="button" class="principal" data-a="choisir"></button><button type="button" class="secondaire" data-a="retirer">Retirer</button></div>
      <input type="file" accept=".html,.htm,.zip,text/html,application/zip" hidden>`
    b.querySelector('h3')!.textContent = nomDuModele(m)
    b.querySelector('.quoi')!.textContent = QUOI[m]
    b.querySelector('a')!.href = PAGES_NUMWORKS[m]
    const choix = b.querySelector<HTMLInputElement>('input[type="file"]')!
    const prendre = async (f: File | undefined) => {
      if (!f) return
      const etat = b.querySelector('.etat')!
      etat.textContent = 'Lecture du fichier…'
      try {
        const html = await lireFichierEmulateur(f)
        await installerEmulateur({ modele: m, html, nom: f.name, taille: f.size, date: Date.now() })
        hote.change()
        hote.message(`La calculatrice ${nomDuModele(m)} est installée.`)
      } catch (e) {
        etat.textContent = e instanceof FichierRefuse ? e.message : 'Impossible d\'installer ce fichier (la place manque peut-être dans le navigateur).'
        etat.classList.add('erreur')
        return
      }
      void majCases()
    }
    choix.addEventListener('change', () => { void prendre(choix.files?.[0]); choix.value = '' })
    b.querySelector('[data-a="choisir"]')!.addEventListener('click', () => choix.click())
    b.querySelector('[data-a="retirer"]')!.addEventListener('click', async () => {
      await retirerEmulateur(m)
      hote.change()
      void majCases()
    })
    b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('survol') })
    b.addEventListener('dragleave', () => b.classList.remove('survol'))
    b.addEventListener('drop', e => { e.preventDefault(); b.classList.remove('survol'); void prendre(e.dataTransfer?.files[0]) })
    cases.appendChild(b)
    boites.set(m, b)
  }
  const majCases = async () => {
    const etats = await etatDesEmulateurs()
    for (const [m, b] of boites) {
      const e = etats[m]
      const etat = b.querySelector('.etat')!
      etat.classList.remove('erreur')
      etat.textContent = e ? `✓ Installée le ${jour(e.date)}` : 'Pas encore installée : glissez le fichier ici.'
      b.classList.toggle('installee', !!e)
      b.querySelector('[data-a="choisir"]')!.textContent = e ? 'Remplacer…' : 'Choisir le fichier'
      ;(b.querySelector('[data-a="retirer"]') as HTMLElement).hidden = !e
    }
  }
  void majCases()
  d.querySelector('[data-a="fermer"]')!.addEventListener('click', () => d.close())
  fermerSurLeFond(d, () => d.close())
  d.addEventListener('close', () => { d.remove(); hote.maj() })
  document.body.appendChild(d)
  d.showModal()
  hote.maj()
  ;(boites.get(enAvant ?? 'lycee')?.querySelector('[data-a="choisir"]') as HTMLElement | null)?.focus()
  return d
}
