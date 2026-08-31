# Couleur verte pour « Aucune restriction »

## Objectif

Rendre les territoires sans restriction immédiatement distincts du fond bleu pâle de la carte, sans modifier la hiérarchie visuelle des niveaux d’alerte.

## Design validé

- Remplacer le bleu pâle `#d8e4e8` par le vert pastel `#d8e8dc` pour le niveau `none` / « Aucune restriction ».
- Appliquer cette couleur à la palette partagée utilisée par les départements et les zones VigiEau.
- Appliquer la même couleur à la pastille correspondante dans la légende.
- Conserver le fond de carte `#e9f2f5` et toutes les couleurs de crise, alerte renforcée, alerte et vigilance.

## Vérification

GPT-5.4 Mini adaptera le test de palette, constatera son échec avant correction, puis vérifiera la suite carte complète et la cohérence visuelle dans Edge. La couleur attendue devra être exactement `#d8e8dc` dans la palette JavaScript et dans la légende CSS.

## Hors périmètre

Aucun changement de libellé, de données VigiEau, de logique de gravité, de disposition ou de couleur des stations.
