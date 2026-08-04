# Protection de l’adresse de contact — conception

## Contexte

Le site statique publie actuellement l’adresse de contact complète dans plusieurs liens `mailto:` et dans le texte de la page presse et des mentions légales. Un robot peut donc l’extraire directement du HTML. La branche publique contient aussi cette valeur dans la documentation et les tests.

## Objectif

Conserver un parcours de contact accessible et rapide sans publier l’adresse complète ni un lien `mailto:` dans le HTML livré aux visiteurs.

## Hors périmètre

- Aucun formulaire ni service tiers n’est ajouté.
- Aucun backend n’est introduit.
- L’historique Git existant n’est pas réécrit ; les anciens commits restent consultables séparément.
- La solution réduit l’exposition aux robots simples mais ne prétend pas résister à un robot qui exécute et analyse JavaScript.

## Conception retenue

### Navigation

Les liens génériques « Contact » dirigent vers la section de contact de la page d’accueil. Ils ne contiennent plus d’adresse ni de protocole `mailto:`.

### Action de contact

Les appels à l’action deviennent des boutons HTML portant seulement un attribut indiquant leur usage et, le cas échéant, un objet de message presse. Un script partagé reconstruit l’adresse au moment du clic à partir de fragments inversés qui ne forment jamais l’adresse complète dans le fichier source. Il ouvre ensuite le client de messagerie avec un URI `mailto:` construit à l’exécution.

Le script est chargé uniquement sur les pages qui contiennent une action de contact directe. Les boutons conservent les classes visuelles existantes. Une règle CSS minimale normalise leur rendu natif sans modifier le système graphique.

### Contenu éditorial

La page des mentions légales renvoie vers l’action de contact sans afficher l’adresse. Le texte expliquant le traitement des messages reste exact : le site ne collecte aucune donnée et le logiciel de messagerie du visiteur assure l’envoi.

La documentation active ne reproduit plus l’adresse complète. Elle décrit le mécanisme de contact sans exposer la valeur protégée.

## Vérification

Le validateur existant est modifié avant le code de production afin de démontrer la régression :

- il échoue tant qu’une adresse e-mail complète apparaît dans un fichier HTML, JavaScript, Markdown ou texte suivi par le projet ;
- il échoue tant qu’un attribut HTML contient directement `mailto:` ;
- il vérifie la présence du script partagé et des boutons de contact sur les pages concernées ;
- il conserve tous les contrôles structurels, d’accessibilité et de ressources existants.

Le cycle attendu est rouge puis vert : le nouveau contrôle échoue sur l’état actuel, puis l’ensemble du validateur passe après la correction.

## Risques et limites

L’obfuscation côté navigateur bloque l’extraction naïve par expression régulière. Elle n’empêche pas un robot sophistiqué d’exécuter le script et d’observer l’URI produit. Une protection plus forte nécessiterait ultérieurement un formulaire avec traitement serveur ou un prestataire spécialisé.

