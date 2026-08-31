# Palette globale à source unique

## Objectif

Chaque couleur du site doit être déclarée une seule fois, puis consommée par référence dans le CSS, le JavaScript, MapLibre et les pages HTML. Le vert sans restriction choisi par l’utilisateur reste `#69f08b`.

## Source de vérité

`assets/css/site.css` devient l’unique source des valeurs colorimétriques. Son bloc `:root` conserve les variables générales existantes et reçoit des variables sémantiques pour le focus, les restrictions VigiEau, les stations, les erreurs et le noir d’impression.

Tous les autres styles utilisent `var(--nom-semantique)`. Les transparences sont dérivées avec `color-mix(in srgb, var(--couleur) <pourcentage>, transparent)` afin de ne pas redéclarer la même couleur sous forme `rgba(...)`.

## Consommation JavaScript

Un module pur `assets/js/theme.mjs` associe des noms sémantiques aux noms de propriétés CSS et expose :

- une fonction qui lit les valeurs calculées depuis `getComputedStyle(document.documentElement)` ;
- une validation qui lève une erreur nommant toute variable absente ;
- une fonction de sélection du niveau de restriction à partir de la palette résolue ;
- une fonction qui synchronise la balise `meta[name="theme-color"]` avec la couleur `--water-deep`.

Le tableau de bord résout la palette une fois avant de créer la carte et la transmet explicitement à `createWaterMap`. `map.mjs` ne contient plus aucun code couleur : fond, contours, restrictions, stations et sélection proviennent tous de l’objet injecté. `templates.mjs` ne porte plus de palette.

Un point d’entrée léger `assets/js/theme-color.mjs` synchronise la couleur du navigateur sur chaque page. Les six balises `theme-color` restent présentes mais ne contiennent plus de valeur littérale ; chaque page référence le même module avec son chemin relatif.

## Périmètre CSS

`assets/css/site.css` et `assets/css/grid-hydrique.css` ne contiennent de valeur littérale que dans les déclarations de tokens du bloc `:root`. Les styles courants, les états d’alerte, les niveaux de détail, les bordures, les ombres, le focus, les styles d’impression et la légende référencent ces tokens.

La palette de restriction conserve : crise, alerte renforcée, alerte et vigilance. La valeur sans restriction est centralisée à `#69f08b`. Les couleurs des stations hydrométriques et piézométriques restent visuellement identiques à l’existant.

## Validation

Tous les tests sont écrits et exécutés par GPT-5.4 Mini.

- Un test d’architecture parcourt les fichiers CSS, JavaScript et HTML de production : chaque valeur hexadécimale ne peut apparaître qu’une fois et uniquement dans le bloc de tokens de `site.css`; aucun `rgba(...)` littéral ne subsiste.
- Les tests du module de thème utilisent un faux objet de styles calculés, sans dupliquer de code couleur attendu.
- Les tests de carte injectent une palette factice et vérifient que chaque couche MapLibre utilise la bonne propriété sémantique.
- Les validateurs contrôlent que les six pages chargent le module de synchronisation et qu’aucune balise `theme-color` ne contient un code couleur.
- La recette Edge vérifie les styles calculés, la balise `theme-color`, les couleurs des couches MapLibre, la conservation du vert `#69f08b` et l’absence d’erreur console ou `pageerror`.

## Compatibilité et erreurs

Le site statique garde ses couleurs CSS même si JavaScript est désactivé. Seules la carte interactive et la synchronisation de la couleur du navigateur nécessitent JavaScript, comme aujourd’hui pour la carte. Une variable requise manquante provoque une erreur explicite au lieu d’une couleur vide ou d’un repli silencieux.

## Hors périmètre

Aucun thème sombre, sélecteur de thème, changement graphique, nouvelle couleur ou étape de génération n’est ajouté. Les données VigiEau, la logique de gravité, les stations et la disposition restent inchangées.
