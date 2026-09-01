# Mode de simulation du Grid Hydrique National

**Date :** 2026-09-01
**Statut :** design validé
**Portée :** dashboard statique `/grid-hydrique/`

## Contexte

La carte présente actuellement la situation officielle : restrictions VigiEau, zones réglementaires et mesures des stations Hub’Eau. Elle doit également permettre de comparer cette situation à un scénario théorique dans lequel le Grid Hydrique National décrit dans *L’eau ou le chaos* est progressivement déployé.

Le livre définit trois étapes : boucles départementales, interconnexions régionales, puis corridors nationaux. Il ne fournit pas d’étude d’implantation géographique détaillée ni de modèle hydrologique départemental. La nouvelle vue est donc une simulation pédagogique, et non une prévision scientifique ou un projet de tracé.

## Objectif

Ajouter à la carte un choix explicite entre :

- `Sans Grid hydrique — données réelles`, actif au chargement ;
- `Avec Grid hydrique — simulation`.

Le mode simulé doit montrer simultanément l’amélioration théorique des restrictions et la montée en puissance d’un réseau schématique. Il doit rester immédiatement réversible afin de comparer le scénario à la situation réelle.

## Hors périmètre

- Aucun calcul prédictif à partir des mesures des stations.
- Aucun bilan hydrologique, volume disponible ou besoin par territoire.
- Aucun tracé d’implantation réel de canalisation, réserve ou station de pompage.
- Aucun calendrier animé ni interpolation entre les phases.
- Aucune modification des API, des données sources ou de leur fréquence d’actualisation.
- Aucun nouveau niveau de restriction en dehors de la nomenclature VigiEau existante.

## Interface

Un groupe radio natif intitulé `Scénario` est placé avec les contrôles de la carte. Il propose les options `Sans Grid hydrique` et `Avec Grid hydrique`. Le mode réel est sélectionné par défaut.

Lorsque `Avec Grid hydrique` est actif, un groupe radio secondaire intitulé `Déploiement du Grid` apparaît avec :

- `Phase 1 — Boucles départementales`, sélectionnée par défaut à la première activation ;
- `Phase 2 — Interconnexions régionales` ;
- `Phase 3 — Corridors nationaux`.

Le mode simulé affiche à proximité des contrôles la mention permanente : `Simulation pédagogique fondée sur les hypothèses du livre, non prévision hydrologique. Tracés illustratifs.` Cette information ne dépend ni d’une infobulle ni de la couleur.

Les contrôles existants `Départements / Zones` restent utilisables dans les deux scénarios. Les contrôles des stations sont masqués en simulation, car leurs mesures réelles ne participent pas au scénario. Tous les points de stations et toute sélection de station disparaissent également. Le retour au mode réel restaure les choix de visibilité des deux catégories de stations tels qu’ils étaient avant l’activation de la simulation.

Les nouveaux groupes utilisent des éléments radio natifs, suivent l’ordre du DOM, sont utilisables au clavier et conservent des cibles d’au moins 44 px.

## Transformation des restrictions

La simulation prend la situation officielle courante comme référence visuelle. Elle applique la même règle aux remplissages départementaux et aux polygones de zones VigiEau.

Ordre des niveaux :

`crise > alerte_renforcee > alerte > vigilance > aucune restriction`.

- Phase 1 : réduction de la gravité d’un niveau ;
- Phase 2 : réduction de la gravité de deux niveaux ;
- Phase 3 : niveau `aucune restriction` sur toute l’emprise terrestre française.

Un niveau ne descend jamais sous `aucune restriction`. Les niveaux absents ou inconnus conservent le repli existant vers `aucune restriction`.

En phase 3, les polygones VigiEau peuvent rester géométriquement présents dans la vue `Zones`, mais leur remplissage est vert comme le fond terrestre. Les limites de zones et de départements restent visibles pour préserver les repères et les interactions.

## Réseau schématique

Le réseau est représenté par des calques MapLibre non interactifs, toujours placés sous les limites administratives et au-dessus des remplissages de restriction.

### Phase 1

Les limites départementales reçoivent un traitement graphique secondaire évoquant les boucles locales. Ce traitement est homogène et ne prétend pas suivre les 500 à 1 000 km de canalisations évoqués dans le livre.

### Phase 2

Des hubs régionaux illustratifs et des liaisons entre eux s’ajoutent au maillage départemental. Leurs coordonnées sont des points de composition cartographique, pas des implantations proposées.

### Phase 3

Les calques des phases précédentes restent visibles. Deux grands corridors nommés s’ajoutent conformément au livre :

- `Massif Central → Sud-Ouest` ;
- `Normandie → Centre`.

Les styles distinguent les trois niveaux du réseau sans réutiliser la palette de gravité VigiEau, afin de ne pas confondre infrastructure et restriction. La légende comporte une section `Réseau simulé` et rappelle le caractère illustratif des tracés.

## Panneau de détail

En mode réel, le comportement actuel reste inchangé.

En mode simulé, la sélection d’un département ou d’une zone affiche :

- le nom du territoire ou de la zone ;
- le niveau officiel de départ ;
- la phase sélectionnée ;
- le niveau simulé obtenu par la règle globale ;
- le rappel que le résultat est une hypothèse pédagogique.

Aucun appel de détail de station n’est déclenché en simulation. Pour les zones, les données officielles déjà disponibles servent uniquement à nommer la zone et à établir le niveau de départ ; elles ne sont pas présentées comme une mesure simulée.

## Architecture

### Nouveau module de simulation

Un module pur dans `assets/js/grid-hydrique/` contient :

- les identifiants et libellés des trois phases ;
- la transformation d’un niveau réel en niveau simulé ;
- la construction des expressions MapLibre équivalentes ;
- les données GeoJSON minimales du réseau schématique ;
- les propriétés nécessaires à la légende et au panneau de détail.

Les fonctions pures ne dépendent ni du DOM ni de MapLibre et sont testées directement.

### `map.mjs`

La carte expose des méthodes pour :

- activer ou désactiver le scénario simulé ;
- sélectionner la phase ;
- masquer et restaurer les calques de stations ;
- appliquer les couleurs simulées aux vues `Départements` et `Zones` ;
- afficher cumulativement les calques réseau correspondant à la phase ;
- conserver les limites administratives au-dessus du réseau.

La carte mémorise la visibilité des stations avant l’entrée en simulation et la restaure à la sortie.

### `dashboard.mjs`

Le dashboard crée et coordonne les deux nouveaux groupes radio, la note de simulation, la section de légende et le contenu du panneau de détail. Il ne modifie ni l’actualisation périodique des données réelles ni leur cache. Les actualisations peuvent continuer en arrière-plan afin que le retour au réel soit immédiat.

### HTML et CSS

Les changements se limitent aux emplacements accessibles, à la visibilité conditionnelle, à la légende et aux styles du réseau. Les styles utilisent exclusivement les tokens de couleur globaux existants ou de nouveaux tokens déclarés une seule fois dans `site.css`, conformément à l’architecture actuelle des couleurs.

## État et transitions

L’état minimal comprend `scenario`, `phase`, `mapMode` et la visibilité précédente de chaque catégorie de stations.

À l’entrée en simulation :

1. mémoriser la visibilité actuelle des stations ;
2. masquer les contrôles et calques de stations ;
3. afficher le sélecteur de phase et la note pédagogique ;
4. appliquer la transformation de couleurs ;
5. afficher le réseau correspondant à la phase courante ;
6. annoncer le changement dans la région de statut accessible.

À la sortie :

1. restaurer les couleurs officielles ;
2. masquer tous les calques du réseau ;
3. restaurer les contrôles et la visibilité antérieure des stations ;
4. masquer le sélecteur de phase et la note pédagogique ;
5. annoncer le retour aux données réelles.

Le changement de vue `Départements / Zones` ou de ressource VigiEau ne quitte pas la simulation et conserve la phase sélectionnée.

## Erreurs et repli

Le réseau schématique est local et ne nécessite aucun chargement distant supplémentaire. Si sa création échoue, le dashboard revient au mode réel et annonce l’indisponibilité de la simulation. Les données et interactions réelles restent fonctionnelles.

Une panne d’API ou du PMTiles conserve les replis existants. Elle ne doit pas être masquée par le mode simulé : la note indique toujours que le scénario part des dernières données officielles disponibles.

## Tests

Les tests automatisés couvrent au minimum :

- le mode initial réel et l’absence de calque réseau visible ;
- la réduction d’un niveau en phase 1 et de deux niveaux en phase 2 ;
- le plancher `aucune restriction` ;
- le passage uniforme au vert en phase 3 ;
- l’équivalence entre la fonction de domaine et les expressions MapLibre ;
- l’application des couleurs aux départements et aux zones ;
- l’apparition cumulative des calques des trois phases ;
- le masquage des points et contrôles de stations en simulation ;
- la restauration exacte de leur visibilité au retour au réel ;
- la persistance de la phase lors d’un changement `Départements / Zones` ;
- l’absence d’appel de détail de station en simulation ;
- le contenu du détail comparant niveau réel et niveau simulé ;
- les libellés, états, annonces et interactions clavier des nouveaux contrôles ;
- la présence visible des mentions `simulation pédagogique` et `tracés illustratifs`.

Une recette navigateur vérifie les largeurs 320, 768, 1024 et 1440 px, les trois phases, les deux vues cartographiques, la navigation clavier, la lisibilité de la légende et le retour sans perte d’état aux données réelles.

## Critères d’acceptation

- La page s’ouvre toujours sur les données réelles, sans modification de la carte actuelle.
- Le choix `Avec Grid hydrique` masque tous les points et contrôles de stations.
- La phase 1 améliore chaque niveau d’un cran et montre le maillage départemental.
- La phase 2 améliore chaque niveau de deux crans et ajoute les interconnexions régionales.
- La phase 3 colore toute la France en vert et ajoute les corridors nationaux aux calques précédents.
- Les transformations s’appliquent aux vues `Départements` et `Zones`.
- La simulation et le caractère illustratif des tracés sont toujours explicitement indiqués.
- Le retour à `Sans Grid hydrique` restaure les couleurs officielles et la visibilité précédente des stations.
- Aucun nouveau chargement distant n’est nécessaire pour le réseau schématique.
- Toute panne propre à la simulation laisse ou remet la carte réelle dans un état fonctionnel.
- Les contrôles sont utilisables au clavier et à toutes les largeurs cibles.
