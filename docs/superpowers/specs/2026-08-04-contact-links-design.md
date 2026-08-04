# Correctif des liens de contact

Date : 2026-08-04

## Problème

Les liens « Contact » de navigation pointent uniquement vers l’ancre `#contact`. Dans le pied de page, cette section est déjà visible ou très proche, de sorte que le clic paraît sans effet. Seuls les éléments portant l’attribut `data-contact-button` sont actuellement reliés au script qui ouvre la messagerie.

## Comportement retenu

Tous les liens « Contact » et les liens éditoriaux équivalents doivent ouvrir le logiciel de messagerie du visiteur grâce au mécanisme anti-spam existant. L’adresse complète reste absente du HTML et du code source sous forme contiguë.

Chaque lien conserve son `href` vers la section de contact comme solution de repli lorsque JavaScript est indisponible. Quand JavaScript fonctionne, le gestionnaire annule la navigation vers l’ancre avant d’ouvrir l’URL `mailto:` reconstruite.

## Modifications prévues

- Ajouter `data-contact-button` à chaque lien de contact dans les menus, pieds de page et mentions éditoriales.
- Charger `assets/js/contact.js`, avec le chemin relatif approprié, sur les cinq pages du site.
- Adapter le gestionnaire de clic pour accepter aussi les liens et appeler `preventDefault()` lorsque l’événement le permet.
- Conserver les boutons de contact et leurs sujets préremplis sans changement visible.

## Validation

- Étendre le test JavaScript pour vérifier qu’un lien de contact déclenche la même destination qu’un bouton et annule la navigation vers l’ancre.
- Étendre la validation des pages pour exiger le script et le déclencheur sur tous les liens de contact.
- Observer d’abord l’échec des nouveaux tests sur le code actuel, puis leur réussite après le correctif.
- Exécuter l’ensemble des validations locales, publier sur `master`, attendre GitHub Pages et vérifier le comportement servi sur `https://alaindusaule.fr/`.

## Hors périmètre

- Aucun formulaire de contact ni service tiers n’est ajouté.
- L’adresse n’est pas rendue visible dans le HTML.
- La mise en page et le style des liens ne changent pas.
