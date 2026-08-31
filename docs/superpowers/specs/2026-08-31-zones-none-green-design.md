# Fond vert des zones sans restriction

**Date :** 2026-08-31  
**Statut :** conception validée  
**Portée :** vue `Zones` de `/grid-hydrique/`

## Problème

Le fichier officiel `zones_arretes_en_vigueur.pmtiles` ne contient que les géométries associées aux arrêtés publiés. En vue `Zones`, la carte masque actuellement le remplissage départemental. Toute surface française sans polygone VigiEau laisse alors apparaître le fond bleu pâle, alors que la légende associe « Aucune restriction » au vert `--restriction-none`.

## Décision fonctionnelle

Une surface française absente du jeu officiel est considérée comme sans restriction active et doit apparaître en vert. La mer et l’extérieur de la France restent bleu pâle.

## Rendu retenu

Ajouter une couche MapLibre dédiée, alimentée par la source GeoJSON existante des départements :

- remplissage uniforme avec `theme.restrictions.none` ;
- masquée au chargement et en vue `Départements` ;
- visible uniquement en vue `Zones` ;
- placée sous les polygones VigiEau et sous les limites départementales ;
- non sélectionnable, afin que seuls les vrais polygones officiels ouvrent un détail de zone.

La vue `Départements`, les stations, les filtres de ressource, les limites, le cadrage national et le fond marin ne changent pas.

## Empilement des couches en vue Zones

1. fond bleu pâle MapLibre ;
2. emprise départementale verte « Aucune restriction » ;
3. polygones VigiEau colorés par niveau de gravité ;
4. contours départementaux ;
5. stations et sélection.

## Tests et recette

Tous les tests sont écrits et exécutés par GPT-5.4 Mini.

Le test MapLibre doit d’abord échouer en exigeant :

- une couche de fond territorial utilisant `theme.restrictions.none` ;
- sa visibilité exclusive en vue `Zones` ;
- son positionnement sous `zones-fill` ;
- l’absence de modification des stations et de la vue `Départements`.

Après correction, la suite complète et les validateurs sont rejoués. La recette Edge vérifie la France et la Corse vertes hors polygones VigiEau, la mer bleu pâle, la palette des restrictions inchangée et l’absence d’erreur console ou réseau.

## Risques maîtrisés

- La couche utilise la source départementale déjà chargée : aucune requête supplémentaire.
- Elle ne réutilise pas les niveaux maximaux départementaux, qui seraient trompeurs en vue locale.
- Elle ne modifie pas le fond général, donc la mer ne peut pas devenir verte.
- Elle reste non interactive, ce qui évite de présenter une donnée locale détaillée inexistante.
