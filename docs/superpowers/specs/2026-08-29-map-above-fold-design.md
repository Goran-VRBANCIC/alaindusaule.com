# Carte hydrique au premier écran — Spécification de conception

**Date :** 29 août 2026
**Statut :** conception validée oralement, en attente de validation du document

## Problème

Le premier écran annonce « L’état de l’eau, maintenant » mais ne montre aucune donnée géographique. La carte interactive arrive seulement après les indicateurs, tandis que la zone héro conserve une grande surface vide. Cette hiérarchie crée une attente immédiate que l’interface ne satisfait pas.

## Disposition retenue

La page conserve une seule instance de la carte MapLibre et les mêmes flux VigiEau et Hub’Eau. L’ordre visible devient :

1. titre, introduction, état d’actualisation, bouton et sources dans une zone dont l’espacement vertical est réduit à `clamp(2rem, 4vw, 4rem)` ;
2. contrôles des couches, légende et vraie carte interactive en pleine largeur ;
3. panneau de détail sous la carte ;
4. indicateurs « La situation en un regard » ;
5. section narrative du Grid Hydrique National.

La carte n’est ni dupliquée ni remplacée par une image. Son identifiant, ses sources, ses interactions et son contrat JavaScript restent inchangés.

## Comportement responsive

### Mobile, de 320 px à 767 px

- La carte suit immédiatement l’introduction et occupe 100 % de la largeur disponible.
- Sa hauteur utilise `clamp(24rem, 58svh, 32rem)` afin de rester exploitable sans masquer durablement la suite de la page.
- Les cases de couches et la légende reviennent naturellement à la ligne.
- Le panneau de détail se place sous la carte et reste dans le flux du document.
- Aucun élément n’impose de largeur minimale provoquant un défilement horizontal.
- Les cibles tactiles conservent au moins 44 px et les commandes MapLibre restent accessibles.

### Tablette et ordinateur, à partir de 768 px

- La carte utilise toute la largeur du conteneur principal.
- Le panneau de détail reste sous la carte afin de ne pas réduire sa surface.
- Sa hauteur utilise `clamp(32rem, 65svh, 46rem)`.
- Le titre et les informations de fraîcheur restent visibles avant la carte sans recréer un grand espace vide.

## Accessibilité et interactions

- L’ordre du DOM suit l’ordre visuel : introduction, commandes, carte, détail, indicateurs.
- Le clavier continue de déplacer et zoomer la carte ; Entrée sélectionne l’élément situé au centre.
- Le focus est envoyé au panneau de détail après une sélection.
- La légende, les cases de couches, les régions `aria-live` et les libellés existants sont conservés.
- Les préférences de réduction des animations restent respectées.

## Données et erreurs

Le déplacement est uniquement structurel et visuel. Les appels API, le seuil de zoom 6, le rafraîchissement de quinze minutes, l’échantillon local et la dégradation indépendante des sources ne changent pas. En cas d’échec de MapLibre ou d’une API, les messages existants restent visibles au-dessus de la zone cartographique.

## Vérification attendue

- Un test structurel échoue si les indicateurs repassent avant la carte dans le HTML.
- Les tests existants du dashboard restent verts.
- Les largeurs 320, 768, 1024 et 1440 px sont contrôlées sans débordement horizontal.
- À 320 px, la carte est visible après l’introduction, les contrôles reviennent à la ligne et le détail suit la carte.
- À 1440 px, la carte occupe la largeur du conteneur et le panneau de détail ne la comprime pas.
- Le contrôle navigateur confirme la sélection clavier, les bascules de couches et les requêtes Hub’Eau par `bbox` après zoom.

## Hors périmètre

- Aucun nouveau fond cartographique ni fournisseur de tuiles.
- Aucun changement de palette, de typographie ou de logique métier.
- Aucun nouveau composant de carte, panneau flottant ou vue miniature.
