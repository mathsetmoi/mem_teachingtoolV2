/**
 * ============================================================================
 * MEM — RELAIS DES REPLAYS (version 3), à déployer dans Google Apps Script
 * ============================================================================
 * Ce petit script lit, dans votre Drive, la séance qu'un élève demande par
 * son lien, et la lui envoie. Il ne fait rien d'autre.
 *
 * POURQUOI. Un navigateur sans compte Google ne peut pas lire un fichier
 * privé du Drive. Le script, lui, s'exécute sous VOTRE compte : il lit la
 * séance à la place de l'élève. Les séances ne sont jamais partagées, aucune
 * clé ne circule.
 *
 * CE QU'IL SERT, ET RIEN D'AUTRE. Un fichier « .mem » qui est un replay
 * (il commence par {"format":"mem-revoir"), rangé dans l'un des dossiers
 * ci-dessous (DOSSIERS), dont ce compte est le propriétaire, ni l'un ni
 * l'autre à la corbeille. Tout autre identifiant est refusé. Le script ne
 * liste jamais un dossier : sans le lien d'une séance, on ne la trouve pas.
 *
 * UN RELAIS PAR COMPTE. Le script s'exécute sous un seul compte : on le
 * déploie dans chaque compte Google qui publie des séances (mathsetmoi, LFB).
 * C'est le même fichier partout. Chaque déploiement a son adresse, que le
 * site range sous un nom court (« mem », « lfb ») ; le lien dit lequel ouvrir.
 *
 * ---------------------------------------------------------------------------
 * INSTALLER, une fois par compte (cinq minutes)
 * ---------------------------------------------------------------------------
 *  1. Ouvrir script.google.com, connecté AU BON COMPTE, puis « Nouveau
 *     projet ». Le nommer « MEM - Relais replay ».
 *  2. Remplacer tout le contenu de « Code.gs » par ce fichier, enregistrer.
 *  3. Choisir la fonction « verifierLInstallation » et cliquer « Exécuter » :
 *     Google demande d'autoriser l'accès au Drive (c'est ce qu'on veut).
 *  4. « Déployer » → « Nouveau déploiement » → type « Application Web » :
 *       • Exécuter en tant que : Moi
 *       • Qui a accès : Tout le monde
 *     Déployer, puis copier l'adresse qui finit par « /exec » (jamais celle
 *     en « /dev », qui n'ouvre que pour vous). Celle d'un compte
 *     d'établissement contient « /a/macros/… » : elle est bonne telle quelle.
 *  5. Mettre cette adresse dans src/publication/comptes.ts, en face du compte
 *     (« mem » ou « lfb »), et remettre le site en ligne.
 *  6. Vérifier : ouvrir l'adresse suivie de « ?ping=1 » dans une fenêtre de
 *     navigation privée. Il doit s'afficher une ligne de texte commençant par
 *     {"relais":"MEM Replay" — et non une page de connexion Google.
 *     « pret » passe à true après la première séance publiée.
 *
 * METTRE À JOUR un relais déjà déployé : coller la nouvelle version dans
 * « Code.gs », enregistrer, puis « Déployer » → « Gérer les déploiements » →
 * crayon → « Version : Nouvelle version » → « Déployer ». L'adresse ne change
 * pas : les liens déjà donnés aux élèves continuent de marcher.
 *
 * À SAVOIR. Si l'établissement interdit les applications ouvertes à tous,
 * l'étape 4 ne proposera que « les utilisateurs de votre organisation » :
 * seuls les élèves connectés à leur compte du lycée pourront lire. Le site
 * le signale à la première publication (« la séance demande une connexion »).
 * ============================================================================
 */

/** Les dossiers que le site crée pour les replays (un par compte).
 *  Ils doivent rester ceux de src/publication/comptes.ts : un test le vérifie. */
var DOSSIERS = ['MEM - Replay séances', 'LFB - Replay séances'];

/** L'extension des fichiers séance, et le début de leur contenu. */
var EXTENSION = '.mem';
var DEBUT = '{"format":"mem-revoir"';

/** Combien de temps on retient le dossier trouvé (pour « ?ping=1 »). */
var GARDE_DOSSIER = 6 * 60 * 60; // secondes

/**
 * L'élève ouvre son lien : son navigateur demande ici la séance « id ».
 * Réponse : le fichier tel quel (JSON), ou { erreur } avec une phrase qu'il
 * peut lire et répéter à son professeur.
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.ping) return enJson(etatDuRelais());
    var id = String(p.id || '');
    if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) {
      return enJson({ erreur: 'Ce lien est incomplet : demandez-en un nouveau à votre enseignant.' });
    }
    var texte = seanceServie(id);
    if (texte === null) {
      return enJson({ erreur: 'Séance introuvable ou retirée. Demandez le lien à votre enseignant.' });
    }
    return ContentService.createTextOutput(texte).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error(err);
    // Au professeur qui vérifie son installation, on dit ce qui coince :
    // presque toujours l'autorisation pas encore donnée (étape 3), ou un
    // déploiement qui s'exécute en tant que « l'utilisateur » au lieu de « Moi ».
    if (p.ping) {
      return enJson({ relais: 'MEM Replay', version: 3, pret: false,
        erreur: 'Le relais répond mais ne lit pas le Drive : ' + String((err && err.message) || err).slice(0, 300)
          + ' — lancez « verifierLInstallation » depuis l’éditeur, et vérifiez que le déploiement s’exécute en tant que « Moi ».' });
    }
    return enJson({ erreur: 'La séance n’a pas pu être lue. Réessayez dans un instant.' });
  }
}

/**
 * Le texte de la séance « id » si elle remplit toutes les conditions de
 * l'en-tête, sinon null.
 */
function seanceServie(id) {
  var fichier;
  try { fichier = DriveApp.getFileById(id); } catch (err) { return null; }
  if (!fichier || fichier.isTrashed()) return null;
  var nom = fichier.getName();
  if (nom.slice(-EXTENSION.length) !== EXTENSION) return null;
  if (!dansUnDossierDesReplays(fichier)) return null;
  var texte = fichier.getBlob().getDataAsString('UTF-8');
  return texte.slice(0, DEBUT.length) === DEBUT ? texte : null;
}

/** Le fichier est-il rangé dans un dossier des replays dont ce compte est le propriétaire ? */
function dansUnDossierDesReplays(fichier) {
  var moi = Session.getEffectiveUser().getEmail();
  var parents = fichier.getParents();
  while (parents.hasNext()) {
    var d = parents.next();
    if (DOSSIERS.indexOf(d.getName()) < 0 || d.isTrashed()) continue;
    var proprietaire = d.getOwner();
    if (proprietaire && proprietaire.getEmail() === moi) return true;
  }
  return false;
}

/** Le premier dossier des replays de ce compte, retenu quelques heures. */
function dossierTrouve() {
  var cache = CacheService.getScriptCache();
  var garde = cache.get('dossier');
  if (garde) return garde;
  for (var i = 0; i < DOSSIERS.length; i++) {
    var trouves = DriveApp.getFoldersByName(DOSSIERS[i]);
    while (trouves.hasNext()) {
      var d = trouves.next();
      if (!d.isTrashed()) { cache.put('dossier', d.getName(), GARDE_DOSSIER); return d.getName(); }
    }
  }
  return null;
}

/**
 * « ?ping=1 » : de quoi vérifier l'installation sans rien publier. Pas
 * d'adresse e-mail : l'adresse du relais est publique.
 */
function etatDuRelais() {
  var dossier = dossierTrouve();
  return { relais: 'MEM Replay', version: 3, dossier: dossier, pret: !!dossier };
}

function enJson(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * À lancer une fois depuis l'éditeur (étape 3) : donne l'autorisation, et
 * écrit dans le journal le compte et l'état du relais.
 */
function verifierLInstallation() {
  console.log('Compte : ' + Session.getEffectiveUser().getEmail());
  console.log(JSON.stringify(etatDuRelais(), null, 2));
}
