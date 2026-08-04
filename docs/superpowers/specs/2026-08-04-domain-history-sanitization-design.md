# Domaine canonique et assainissement de l’historique — conception

## Contexte

Le site est publié sur `https://alaindusaule.fr`, mais ses métadonnées canoniques, ses données structurées, son sitemap et son fichier `robots.txt` désignent encore le domaine `.com`, actuellement non enregistré. L’adresse de contact retirée du HTML courant reste accessible dans des commits antérieurs et dans les anciennes versions du communiqué de presse. Un nouveau PDF nettoyé est présent localement et doit devenir la seule version publiée du communiqué.

## Objectifs

- Faire de `https://alaindusaule.fr` l’unique origine canonique déclarée par le site.
- Publier le nouveau communiqué sans adresse de contact visible.
- Retirer l’adresse de contact des fichiers texte de tous les commits accessibles.
- Retirer toutes les anciennes versions du communiqué PDF de l’historique accessible.
- Préserver autant que possible la chronologie et les messages de commits.
- Disposer d’une sauvegarde locale avant toute réécriture.

## Hors périmètre

- Les adresses d’auteur et de committer Git, différentes de l’adresse de contact, ne sont pas modifiées.
- Les copies, forks, caches ou clones déjà détenus par des tiers ne peuvent pas être supprimés.
- Aucun changement de registrar, de DNS ou de certificat TLS n’est nécessaire.
- L’adresse de contact reconstruite par le bouton JavaScript n’est pas remplacée par un formulaire dans cette intervention.

## Correction du domaine

Toutes les URL publiques absolues passent de l’origine `.com` à `https://alaindusaule.fr` :

- balises canonical ;
- balises Open Graph ;
- données JSON-LD ;
- URLs du sitemap ;
- déclaration du sitemap dans `robots.txt` ;
- mentions textuelles du domaine dans la page légale ;
- assertions de validation associées.

Le fichier `CNAME` reste `alaindusaule.fr`.

## Publication du communiqué nettoyé

Le PDF modifié par l’utilisateur remplace le fichier courant au même chemin afin de ne casser aucun lien. Son texte est extrait localement pour vérifier l’absence de toute adresse complète. Le validateur ajoute un contrôle explicite du PDF lorsque `pdftotext` est disponible et échoue si l’outil manque, afin d’éviter une validation faussement positive.

## Réécriture de l’historique

La réécriture est effectuée dans un clone temporaire séparé, jamais directement dans le répertoire de travail principal.

Avant la réécriture :

1. les corrections du domaine, les tests et le nouveau PDF sont commités normalement ;
2. un bundle Git complet est créé hors du dépôt ;
3. le hash distant attendu de `master` est enregistré pour protéger le push forcé.

Dans le clone temporaire :

1. `git filter-repo` remplace exactement l’adresse de contact dans les blobs texte historiques ;
2. le chemin du communiqué est supprimé de tout l’historique, ce qui élimine ses anciennes versions binaires ;
3. le PDF nettoyé est réintroduit dans un nouveau commit au sommet de `master` ;
4. aucune adresse de métadonnée Git n’est transformée.

La publication utilise `--force-with-lease` lié au hash distant enregistré. Elle s’arrête si le dépôt distant a changé entre-temps.

## Vérifications

Avant le push forcé :

- les tests du site passent ;
- le PDF nettoyé ne contient aucune adresse complète ;
- aucune référence publique au domaine `.com` ne subsiste ;
- chaque arbre de commit accessible est scanné pour l’adresse de contact ;
- aucun ancien blob du communiqué ne reste référencé ;
- le sommet réécrit contient le PDF nettoyé et le fichier `CNAME` correct.

Après le push forcé :

- le hash de `origin/master` correspond au hash assaini local ;
- GitHub Pages construit ce hash ;
- les pages publiques déclarent uniquement le domaine `.fr` ;
- le PDF public correspond au fichier nettoyé et son texte ne contient pas l’adresse ;
- HTTP redirige vers HTTPS et GitHub indique que HTTPS est imposé.

## Récupération et risques

Le bundle local permet de restaurer l’ancien historique si nécessaire, mais il contient lui-même les données supprimées et ne doit jamais être publié. Tous les identifiants de commits réécrits changent. Les clones existants doivent être reclonés ou réalignés explicitement sur la nouvelle histoire. Le push forcé ne garantit pas l’effacement des caches internes de GitHub ni des copies détenues par des tiers.
