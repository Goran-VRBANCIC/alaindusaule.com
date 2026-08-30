# Limite de dézoom de la carte nationale

## Objectif

Empêcher l’utilisateur de dézoomer au-delà du niveau où la France métropolitaine et la Corse sont entièrement visibles, au chargement comme après un redimensionnement de la carte.

## Comportement attendu

- Le cadrage initial continue d’utiliser l’emprise réelle des départements et la marge responsive existante.
- Le zoom obtenu pour ce cadrage devient immédiatement le zoom minimal de la carte.
- La molette, les boutons, le clavier et les gestes tactiles ne peuvent pas descendre sous cette limite.
- Lorsque le conteneur change de dimensions, notamment après une rotation mobile, la limite est recalculée avec la nouvelle largeur et la nouvelle hauteur.
- Un redimensionnement ne recentre pas la carte et ne réinitialise pas volontairement la navigation de l’utilisateur.
- Si la nouvelle limite est supérieure au zoom courant, MapLibre applique sa contrainte normale pour revenir au minimum autorisé.

## Conception technique

`map.mjs` reste propriétaire du cadrage. Une fonction interne calcule la caméra correspondant à l’emprise nationale avec `cameraForBounds`, puis applique son niveau avec `setMinZoom`.

Au chargement, `fitBounds` conserve le cadrage initial actuel, puis la limite minimale est synchronisée sur le zoom obtenu. Un `ResizeObserver` attaché au conteneur de la carte regroupe les changements via `requestAnimationFrame`, appelle `map.resize()` et recalcule uniquement la limite minimale. Il ne relance pas `fitBounds`, afin de préserver le centre et le niveau de navigation choisis par l’utilisateur.

Le changement reste limité à la logique cartographique et à ses tests. Aucun nouveau contrôle ni texte d’interface n’est nécessaire.

## Gestion des cas limites

- Si l’emprise départementale est vide, aucun calcul ni observateur de cadrage n’est installé.
- Si le navigateur ne fournit pas `ResizeObserver`, le cadrage initial et sa limite restent fonctionnels ; le recalcul dynamique peut s’appuyer sur l’événement global `resize` déjà émis par la page.
- Les callbacks de redimensionnement successifs sont regroupés pour éviter des recalculs inutiles.

## Validation

Tous les tests et contrôles sont écrits ou exécutés exclusivement par un sous-agent GPT-5.6 Luna.

- Test unitaire rouge : le zoom issu du cadrage initial devient `minZoom`.
- Test unitaire rouge : une nouvelle taille recalcule la limite sans second `fitBounds`.
- Test navigateur : impossibilité de dézoomer sous le cadrage national à 320, 768, 1024 et 1440 px.
- Test navigateur : après rotation ou redimensionnement, la limite s’adapte et la navigation n’est pas recentrée.
- Validation complète des tests cartographiques, des validateurs PowerShell et du site.

## Critères d’acceptation

- France métropolitaine et Corse sont entièrement visibles au zoom minimal.
- Toute tentative de dézoom supplémentaire reste au zoom minimal calculé.
- La limite s’adapte aux dimensions du conteneur.
- Le redimensionnement ne réinitialise pas la position de l’utilisateur.
- Les validations GPT-5.6 Luna sont toutes vertes.
