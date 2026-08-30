# Mode de visualisation des zones VigiEau

**Date :** 2026-08-30
**Statut :** design validé
**Portée :** dashboard statique `/grid-hydrique/`

## Contexte

La carte actuelle colore chaque département selon le niveau maximal publié par VigiEau. Cette synthèse nationale masque les différences entre les zones d’alerte applicables aux eaux superficielles, aux eaux souterraines et à l’eau potable.

VigiEau publie les géométries officielles en PMTiles à l’adresse `https://regleau.s3.gra.perf.cloud.ovh.net/pmtiles/zones_arretes_en_vigueur.pmtiles`. Son application officielle les lit dans la couche vectorielle `zones_arretes_en_vigueur` et distingue les ressources `SUP`, `SOU` et `AEP`.

## Objectif

Ajouter un mode `Zones` à la carte existante pour visualiser les polygones officiels et leurs niveaux de restriction, sans remplacer ni modifier le comportement initial du mode `Départements`.

## Hors périmètre

- Aucun fond cartographique distant supplémentaire.
- Aucun historique temporel des zones.
- Aucune copie locale ni transformation planifiée du PMTiles.
- Aucune approximation des contours par échantillonnage de points.
- Aucun changement de palette ou de définition des niveaux VigiEau.

## Interface

Un groupe radio natif intitulé `Vue de la carte` propose :

- `Départements`, sélectionné au chargement ;
- `Zones`.

Lorsque `Zones` est actif, un second groupe radio intitulé `Ressource` apparaît avec :

- `Toutes les ressources`, sélectionné par défaut ;
- `Cours d’eau` (`SUP`) ;
- `Nappes` (`SOU`) ;
- `Eau potable` (`AEP`).

Les contrôles existants des stations restent disponibles et indépendants. Les groupes reviennent à la ligne sur mobile, conservent des cibles d’au moins 44 px et suivent l’ordre du DOM. Les libellés textuels rendent le sens accessible sans dépendre uniquement de la couleur.

## Rendu cartographique

Le mode `Départements` conserve la choroplèthe et les interactions actuelles.

Le mode `Zones` :

- masque uniquement le remplissage départemental ;
- conserve les limites départementales comme repère ;
- affiche les polygones PMTiles avec les mêmes couleurs opaques que la légende ;
- utilise une `fill-sort-key` fondée sur l’ordre `aucune < vigilance < alerte < alerte_renforcee < crise`, afin que le niveau le plus sévère reste visible dans la vue combinée ;
- filtre la propriété `type` lorsque l’utilisateur choisit `SUP`, `SOU` ou `AEP`.

Les points piézométriques et hydrométriques restent au-dessus des remplissages et peuvent toujours être masqués séparément.

## Interaction et panneau de détail

Un clic sur un polygone transmet les coordonnées exactes à l’endpoint VigiEau `/zones` avec le profil `particulier`.

Le panneau affiche toutes les ressources retournées au point sélectionné, triées par gravité décroissante. La première porte la mention `Niveau maximal à ce point`. Chaque ressource indique :

- son libellé utilisateur (`Cours d’eau`, `Nappes`, `Eau potable`) ;
- son niveau et la classe de couleur correspondante ;
- le nom de la zone ;
- le lien HTTPS vers l’arrêté officiel lorsqu’il existe.

Le panneau continue d’échapper toutes les données provenant des API. En mode filtré, les trois ressources restent affichées afin d’expliquer les éventuels écarts entre types d’eau.

## Architecture

### `assets/js/grid-hydrique/zones.mjs`

Module pur contenant :

- les libellés de ressources ;
- l’ordre de gravité et l’expression de tri MapLibre ;
- la construction des filtres de ressource ;
- le tri et la normalisation des zones retournées au point sélectionné.

### `assets/js/grid-hydrique/map.mjs`

Responsable de :

- l’enregistrement unique du protocole PMTiles ;
- l’ajout différé de la source vectorielle officielle ;
- la création des couches `zones-fill` et `zones-line` ;
- la sélection des polygones au clic et au clavier ;
- l’exposition de `setMapMode(mode)` et `setZoneResource(resource)`.

### `assets/js/grid-hydrique/dashboard.mjs`

Responsable de :

- créer les deux groupes radio ;
- charger PMTiles `3.2.0` seulement lors de la première activation de `Zones` ;
- coordonner le mode, le filtre et le statut accessible ;
- appeler l’API ponctuelle et transmettre les trois ressources au template.

### `assets/js/grid-hydrique/templates.mjs`

Ajoute le rendu du détail multiressource sans modifier les templates de stations.

### HTML et CSS

Les changements se limitent aux emplacements et styles nécessaires aux nouveaux contrôles, aux états masqué/chargement/erreur et au détail multiressource. Aucun nouveau système visuel n’est introduit.

## Chargement et performance

Le chargement initial ne demande ni la bibliothèque PMTiles ni le fichier des zones. À la première activation de `Zones` :

1. importer la version PMTiles épinglée ;
2. enregistrer le protocole une seule fois ;
3. ajouter la source et les couches ;
4. basculer la visibilité une fois la source prête.

Les changements de ressource modifient le filtre MapLibre et ne retéléchargent pas le fichier complet. Le format PMTiles permet des lectures partielles par plages HTTP.

## Erreurs et repli

- Si la bibliothèque ou le PMTiles échoue, conserver ou rétablir `Départements`, désactiver les filtres de ressource et annoncer l’indisponibilité dans la région de statut existante.
- Si l’API `/zones` échoue après un clic, conserver les polygones et afficher les propriétés disponibles dans la tuile avec la mention `Détails temporairement indisponibles`.
- Une nouvelle tentative d’activation de `Zones` peut relancer un chargement précédemment échoué.
- Une erreur des zones ne doit jamais masquer les stations ni effacer les dernières données départementales valides.

## Tests et délégation obligatoire

Tous les travaux de test seront confiés à un sous-agent lancé explicitement avec le modèle `GPT-5.6 Luna` (`gpt-5.6-luna`). L’agent principal n’exécutera aucune commande de test ou de validation pour cette fonctionnalité.

Le sous-agent Luna devra :

1. créer ou modifier les tests avant le code de production concerné ;
2. exécuter les tests ciblés et confirmer leur échec pour la raison attendue ;
3. après implémentation, réexécuter les tests ciblés puis la suite complète ;
4. exécuter les validateurs PowerShell et la validation du script de contact ;
5. effectuer les contrôles navigateur aux largeurs 320, 768, 1024 et 1440 px ;
6. vérifier la navigation clavier, les groupes radio, les annonces accessibles et plusieurs points de la Charente ;
7. transmettre les commandes, codes de sortie, nombres de tests et éventuels avertissements à l’agent principal.

Les tests automatisés couvriront au minimum :

- le mode initial `Départements` et l’absence de chargement PMTiles au démarrage ;
- le chargement différé et unique de la source ;
- la visibilité mutuellement exclusive des remplissages départemental et zonal ;
- la vue combinée et les filtres `SUP`, `SOU`, `AEP` ;
- l’ordre de superposition par gravité ;
- la correspondance exacte avec la légende ;
- le tri des trois ressources au clic et la mise en avant du maximum ;
- l’échappement des données et la sécurité des liens ;
- le repli vers `Départements` après une erreur PMTiles ;
- les libellés et états accessibles des contrôles.

## Critères d’acceptation

- La page s’ouvre toujours en mode `Départements` sans requête PMTiles.
- L’activation de `Zones` affiche les contours officiels VigiEau.
- La vue combinée montre le niveau le plus sévère à chaque point.
- Chaque filtre de ressource affiche uniquement ses polygones.
- Les couleurs visibles correspondent exactement à la légende.
- Les limites départementales et les stations restent utilisables.
- Un clic affiche les trois ressources triées et leurs arrêtés disponibles.
- Toute panne spécifique aux zones laisse la vue départementale fonctionnelle.
- Les contrôles fonctionnent au clavier et à toutes les largeurs cibles.

## Sources techniques

- Application officielle : `https://github.com/MTES-MCT/secheresse-front`
- API officielle : `https://github.com/MTES-MCT/vigieau-api`
- PMTiles MapLibre : `https://maplibre.org/maplibre-gl-js/docs/examples/pmtiles-source-and-protocol/`
- Tri des remplissages : `https://maplibre.org/maplibre-style-spec/layers/#fill-sort-key`
