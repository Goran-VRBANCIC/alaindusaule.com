# Limite de dézoom et stabilité des stations

## Objectif

Empêcher l’utilisateur de dézoomer au-delà du niveau où la France métropolitaine et la Corse sont entièrement visibles, au chargement comme après un redimensionnement de la carte. Afficher en permanence le référentiel complet des stations actives de cette emprise, sans que leur présence ou leur position dépende du zoom précédent.

## Comportement attendu

- Le cadrage initial continue d’utiliser l’emprise réelle des départements et la marge responsive existante.
- Le zoom obtenu pour ce cadrage devient immédiatement le zoom minimal de la carte.
- La molette, les boutons, le clavier et les gestes tactiles ne peuvent pas descendre sous cette limite.
- Lorsque le conteneur change de dimensions, notamment après une rotation mobile, la limite est recalculée avec la nouvelle largeur et la nouvelle hauteur.
- Un redimensionnement ne recentre pas la carte et ne réinitialise pas volontairement la navigation de l’utilisateur.
- Si la nouvelle limite est supérieure au zoom courant, MapLibre applique sa contrainte normale pour revenir au minimum autorisé.
- Toutes les stations actives de France métropolitaine et de Corse sont disponibles à chaque niveau de zoom ; l’outre-mer et les stations inactives sont exclus.
- Le zoom détermine seulement le déclenchement des requêtes de mesures récentes, jamais la liste ni les coordonnées des stations.
- Les mesures reçues enrichissent les stations correspondantes sans supprimer les autres points.

## Conception technique

`map.mjs` reste propriétaire du cadrage. Une fonction interne calcule la caméra correspondant à l’emprise nationale avec `cameraForBounds`, puis applique son niveau avec `setMinZoom`.

Au chargement, `fitBounds` conserve le cadrage initial actuel, puis la limite minimale est synchronisée sur le zoom obtenu. Un `ResizeObserver` attaché au conteneur de la carte regroupe les changements via `requestAnimationFrame`, appelle `map.resize()` et recalcule uniquement la limite minimale. Il ne relance pas `fitBounds`, afin de préserver le centre et le niveau de navigation choisis par l’utilisateur.

## Référentiel national des stations

Le script existant `scripts/build-water-station-samples.mjs` est renommé `scripts/build-water-stations.mjs` et devient le générateur du référentiel complet. Son test devient `tests/grid-hydrique/stations.test.mjs`. Il télécharge les référentiels officiels Hub’Eau, normalise les champs existants, exclut l’outre-mer et écrit les deux instantanés versionnés déjà consommés par la page.

- Pour l’hydrométrie, le générateur utilise le filtre officiel `en_service=true` et conserve uniquement les codes départementaux métropolitains, Corse comprise.
- Pour la piézométrie, il utilise le filtre officiel `date_recherche` avec une date de référence fixée à sept jours avant la génération, afin d’absorber le délai de publication observé, puis applique le même périmètre départemental.
- Aucun échantillonnage spatial ni plafond arbitraire n’est conservé.
- Les fichiers restent triés par code pour produire des changements déterministes et faciliter leur contrôle.

## Mise à jour des mesures

`dashboard.mjs` conserve les collections nationales comme source canonique pendant toute la session. Les réponses des endpoints de mesures du viewport sont indexées par code station puis fusionnées dans ces collections.

La fusion peut actualiser les propriétés de mesure, de date et de fraîcheur, mais elle conserve le nombre de stations, leur ordre, leur code et leur géométrie. Les stations sans observation récente gardent leurs métadonnées et leur dernière valeur connue. Une réponse annulée, en échec ou devenue obsolète ne modifie pas la collection.

À un zoom inférieur au seuil de chargement des mesures, aucune requête de viewport n’est lancée et les points ne sont plus remplacés par une autre collection. Les comportements de sélection et de chargement d’historique restent inchangés.

Aucun nouveau contrôle ni texte d’interface n’est nécessaire.

## Gestion des cas limites

- Si l’emprise départementale est vide, aucun calcul ni observateur de cadrage n’est installé.
- Si le navigateur ne fournit pas `ResizeObserver`, le cadrage initial et sa limite restent fonctionnels ; le recalcul dynamique peut s’appuyer sur l’événement global `resize` déjà émis par la page.
- Les callbacks de redimensionnement successifs sont regroupés pour éviter des recalculs inutiles.
- Une réponse de mesures arrivée après une requête plus récente est ignorée grâce au mécanisme d’annulation existant.
- Une panne partielle d’un réseau conserve ses stations et leurs dernières propriétés connues pendant que l’autre réseau peut être actualisé.
- Une observation dont le code n’existe pas dans le référentiel canonique est ignorée ; elle ne peut pas créer un point dépendant du viewport.

## Validation

Tous les tests et contrôles sont écrits ou exécutés exclusivement par un sous-agent GPT-5.6 Luna.

- Test unitaire rouge : le zoom issu du cadrage initial devient `minZoom`.
- Test unitaire rouge : une nouvelle taille recalcule la limite sans second `fitBounds`.
- Test unitaire rouge : le générateur ne limite plus chaque réseau à 350 stations et exclut les stations inactives ou ultramarines.
- Test unitaire rouge : une fusion de mesures conserve exactement le nombre, l’ordre et la géométrie des stations tout en actualisant les propriétés correspondantes.
- Test d’orchestration rouge : les changements rapides de zoom, les réponses obsolètes et les échecs partiels ne remplacent ni ne vident les collections nationales.
- Test navigateur : impossibilité de dézoomer sous le cadrage national à 320, 768, 1024 et 1440 px.
- Test navigateur : après rotation ou redimensionnement, la limite s’adapte et la navigation n’est pas recentrée.
- Test navigateur : le nombre de points reste stable avant et après plusieurs cycles de zoom, de déplacement et de retour au cadrage national.
- Validation complète des tests cartographiques, des validateurs PowerShell et du site.

## Critères d’acceptation

- France métropolitaine et Corse sont entièrement visibles au zoom minimal.
- Toute tentative de dézoom supplémentaire reste au zoom minimal calculé.
- La limite s’adapte aux dimensions du conteneur.
- Le redimensionnement ne réinitialise pas la position de l’utilisateur.
- Les instantanés locaux contiennent toutes les stations actives de métropole et de Corse retournées par les filtres officiels retenus.
- Le nombre et les coordonnées des stations ne changent jamais à cause du zoom, d’un déplacement, d’une réponse tardive ou d’un échec réseau.
- Les mesures récentes des stations connues continuent d’être actualisées dans la zone visible.
- Les validations GPT-5.6 Luna sont toutes vertes.
