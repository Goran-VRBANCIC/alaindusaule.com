# Journal du projet

## 2026-08-30 00:14:00 +02:00 — Fin de session

**Demande :** Arrêter le serveur local et terminer la session pour ce soir.

**Réponse / solution :** Le serveur principal de test sur le port 4173 est arrêté. La session se termine avec la carte responsive fusionnée localement dans `master`, la branche et le worktree nettoyés, et aucun push distant effectué.

## 2026-08-30 00:13:28 +02:00 — Fusion et nettoyage terminés

**Résultat :** `feature/map-above-fold` a été fusionnée en fast-forward dans `master` jusqu’au commit `1aaf6bc`. Les contrôles sur le résultat fusionné passent : 24 tests dashboard, un test contact, deux validateurs et la syntaxe JavaScript. La branche de fonctionnalité et son worktree ont été supprimés ; le serveur principal de test reste actif sur le port 4173. Aucun push n’a été effectué.

**Règle mémoire :** Si `git worktree remove` désenregistre un worktree sous Windows mais laisse un dossier vide verrouillé, rechercher les serveurs de test restants par leur ligne de commande et leur port. Arrêter uniquement l’arborescence du serveur associé, vérifier avec `git clean -ndx -- <chemin exact>`, puis supprimer ce seul dossier avec `git clean -fdx -- <chemin exact>`.

## 2026-08-30 00:10:04 +02:00 — Intégration locale de la carte

**Choix :** Option 1, fusionner `feature/map-above-fold` localement dans `master`.

**Réponse / solution :** La branche sera fusionnée sans push. Le résultat fusionné sera vérifié avec les 24 tests dashboard, le test contact, les deux validateurs et le contrôle syntaxique, puis le worktree et la branche de fonctionnalité seront supprimés si tous les contrôles passent.

## 2026-08-30 00:09:18 +02:00 — Reprise et revue finale de la carte

**Demande :** Reprendre après l’interruption de la dernière revue indépendante.

**Réponse / solution :** Le worktree propre a été repris au commit `64ca06c`. La revue indépendante relancée ne relève aucun point critique, important ou mineur. Elle confirme que le déplacement responsive réutilise les mêmes nœuds, conserve les sélecteurs et écouteurs, aligne l’ordre DOM et l’ordre visuel aux deux breakpoints et notifie MapLibre après réagencement. La suite complète est relancée une dernière fois avant de proposer l’intégration.

## 2026-08-29 21:27:00 +02:00 — Ordre DOM responsive accessible

**Problème de revue :** Le premier correctif utilisait `order` pour déplacer des éléments interactifs. L’ordre visuel mobile différait donc de l’ordre de lecture et de tabulation.

**Solution vérifiée :** Le HTML suit désormais l’ordre mobile réel : titre, canevas, commandes, légende, aide, détail, résumé. Au breakpoint 48 rem, JavaScript déplace les mêmes nœuds — sans duplication — pour obtenir résumé, titre avec commandes, légende, aide, canevas et détail. Edge confirme les deux ordres DOM, un canevas toujours positionné à 664 px sur mobile, les interactions clavier/couches, huit requêtes Hub’Eau toutes bornées par `bbox` et aucune erreur console.

## 2026-08-29 21:18:00 +02:00 — Carte réellement visible sur mobile

**Solution vérifiée :** À 320 × 900, le canevas MapLibre commence à 664 px et environ 236 px de carte sont visibles dès le premier écran. L’ordre mobile est titre, carte, commandes, légende, aide, détail puis résumé des données ; à partir de 48 rem, le statut et les sources retrouvent leur position avant le titre cartographique et les commandes retrouvent la ligne du titre. Les captures 320 et 1440 px confirment les deux compositions. Le contrôle Edge confirme aussi l’absence de débordement, la bascule de couche, la sélection clavier de la Creuse, six requêtes Hub’Eau toutes munies de `bbox` et aucune erreur console.

## 2026-08-29 21:14:00 +02:00 — Règle mémoire : vérifier la cible après une ancre répétée

**Problème :** Une modification fondée sur la première occurrence générique de `<div class="container">` a ajouté la classe de légende au conteneur des KPI. La capture navigateur a permis de détecter que l’ordre attendu ne s’appliquait pas.

**Solution permanente :** Lorsqu’une balise d’ancrage se répète, inclure dans le correctif l’enfant structurel unique qui la suit, puis relire immédiatement le voisinage HTML modifié avant de poursuivre.

## 2026-08-29 21:08:00 +02:00 — Règle mémoire : propriété CSS sans sous-chaîne

**Problème :** Le premier motif de test cherchait `order:` sans frontière de propriété et a confondu `border: 1px` avec `order: 1`, produisant un faux positif pendant la phase rouge.

**Solution permanente :** Dans les validations CSS textuelles, ancrer le nom de propriété après un début de ligne ou un saut de ligne, afin qu’une propriété telle que `border` ne puisse pas satisfaire une recherche sur `order`.

## 2026-08-29 20:59:43 +02:00 — Confirmation de l’ordre mobile

**Réponse :** L’utilisateur confirme que son choix 2 signifie déplacer le statut, le bouton d’actualisation et les sources sous la carte sur mobile afin que le fond MapLibre soit visible dès le premier écran.

**Solution :** Le plan est précisé avant la correction. L’ordre desktop reste inchangé à partir de 48 rem ; seul l’ordre visuel mobile place le résumé des données après la carte.

## 2026-08-29 21:03:00 +02:00 — Règle mémoire : libeller un choix repris après compaction

**Problème :** La réponse isolée `2` a été interprétée comme l’acceptation des sources avant la carte sur mobile, alors que les libellés du choix n’étaient plus disponibles dans le contexte repris. La revue a montré que cette interprétation contredisait le critère validé exigeant le début du fond cartographique à 320 × 900.

**Solution permanente :** Après une reprise où seul le numéro d’un choix subsiste, reformuler explicitement le libellé associé avant toute modification ou conclusion. Si ce libellé ne peut pas être retrouvé, demander une confirmation concise au lieu de l’inférer.

## 2026-08-29 20:54:52 +02:00 — Carte visible avant les indicateurs

**Problème soumis :** La première composition laissait attendre une carte dans la section d’introduction, mais les indicateurs apparaissaient avant elle.

**Réponse / solution :** La carte MapLibre existante est maintenant placée juste après l’introduction et avant les indicateurs, sur toute la largeur du conteneur. Le panneau de détail reste sous la carte à toutes les largeurs. Sa hauteur vaut `clamp(24rem, 58svh, 32rem)` sur mobile et `clamp(32rem, 65svh, 46rem)` dès 48 rem. Les captures à 320, 768, 1024 et 1440 px confirment la hiérarchie et l’absence de panneau latéral. À 320 px, le choix 2 conserve le statut et les sources avant la carte : son titre apparaît au premier écran et le fond cartographique commence juste après. Le contrôle navigateur confirme l’absence de débordement, la bascule de couche, la sélection clavier du département de la Creuse, six requêtes Hub’Eau toutes bornées par `bbox` après zoom et aucune erreur console. Les 24 tests dashboard, les validateurs du dashboard et du site ainsi que le test du formulaire de contact sont relancés avant intégration.

## 2026-08-29 19:52:00 +02:00 — Validation de la spécification carte

**Réponse :** L’utilisateur a validé la spécification écrite de la carte pleine largeur placée avant les indicateurs.

**Solution :** Un worktree isolé `feature/map-above-fold` a été créé après vérification de son exclusion Git. La base y passe 24 tests dashboard, les deux validateurs PowerShell et le test de contact. Le plan test-first est enregistré dans `docs/superpowers/plans/2026-08-29-map-above-fold.md` avant toute modification HTML ou CSS.

## 2026-08-29 19:48:53 +02:00 — Règle mémoire : espaces finaux Markdown

**Problème :** La vérification `git diff --cached --check` a refusé la spécification à cause de deux espaces finaux utilisés pour forcer un saut de ligne Markdown. Aucun commit incomplet n’a été créé.

**Solution permanente :** Ne pas utiliser de saut de ligne Markdown fondé sur des espaces finaux dans les documents du projet ; préférer un paragraphe distinct ou un saut normal, puis exécuter `git diff --cached --check` avant le commit.

## 2026-08-29 19:47:21 +02:00 — Carte attendue au premier écran

**Problème soumis :** Le premier écran « L’état de l’eau, maintenant » donne l’impression qu’une carte devrait être visible dans cette section, alors que la carte actuelle est placée après les indicateurs.

**Réponse / solution :** La cause est la hiérarchie du plan initial : introduction, indicateurs, puis carte. L’utilisateur a refusé les maquettes dans un compagnon visuel et choisi une vraie carte interactive en pleine largeur directement sous l’introduction, avec une vigilance particulière au mobile. La conception validée place aussi le panneau de détail sous la carte sur toutes les largeurs, conserve une seule instance MapLibre et ne change aucun appel API. La spécification est enregistrée dans `docs/superpowers/specs/2026-08-29-map-above-fold-design.md`.

## 2026-08-29 19:40:37 +02:00 — Serveur local de test

**Demande :** Lancer un serveur web local pour tester le site.

**Réponse / solution :** Le site est servi sur `http://127.0.0.1:4173/` avec cache désactivé. Le dashboard répond en HTTP 200 sur `/grid-hydrique/` et son module principal est correctement servi en `application/javascript`.

## 2026-08-29 19:38:14 +02:00 — Intégration locale

**Choix :** Option 1, fusionner la branche du dashboard dans `master` localement.

**Réponse / solution :** La branche sera fusionnée dans `master`, validée à nouveau sur le résultat final, puis la branche et le worktree seront supprimés. Aucun push ni changement de configuration GitHub Pages distante n’est inclus dans cette option.

## 2026-08-29 19:20:21 +02:00 — Reprise et validation finale

**Demande :** Reprendre l’exécution interrompue.

**Réponse / solution :** L’exécution a repris au test de chargement différé. Les écarts de revue ont été corrigés : sélection clavier au centre de la carte, métadonnées et fraîcheur des stations, axes textuels des graphiques, dates distinctes par source, chargement ESM officiel de MapLibre 6.6 et navigation mobile sans débordement. Les 24 tests Node, les deux validateurs PowerShell, le test de contact et la vérification syntaxique passent. Le contrôle Edge/Playwright confirme à 320 px : aucun débordement, sélection clavier du Cher, bascule de couche, appel VigiEau unique et requêtes Hub’Eau par bbox après zoom, sans erreur console. Les captures à 320, 768 et 1440 px sont lisibles. Lighthouse mesure Accessibilité 100 et SEO 100 ; son score de performance local reste contaminé par l’injection Kaspersky et HTTP, malgré un premier affichage à 1,5 s. La seconde revue indépendante ne relève aucun point critique, important ou mineur.

## 2026-08-29 19:15:45 +02:00 — Règle mémoire : résolution des paquets npm exec

**Problème :** `npm exec --package=playwright -- node fichier.cjs` n’a pas exposé le paquet temporaire à la résolution CommonJS du fichier local. Le contrôle n’a donc pas démarré et aucun état applicatif n’a été modifié.

**Solution permanente :** Pour réutiliser un paquet déjà téléchargé par `npx` dans un script Node local, résoudre explicitement son dossier `node_modules` dans le cache npm et le fournir via `NODE_PATH`, ou employer directement une sous-commande autonome de la CLI.

## 2026-08-29 19:15:02 +02:00 — Règle mémoire : JavaScript inline via npm exec

**Problème :** Le passage d’un script JavaScript complexe à `node -e` via PowerShell puis `npm exec` a supprimé ses guillemets internes et provoqué une erreur de syntaxe. Aucun fichier ni état distant n’a été modifié.

**Solution permanente :** Pour une vérification navigateur complexe sous Windows, créer avec `apply_patch` un fichier de contrôle temporaire, l’exécuter, puis le supprimer avec `apply_patch`, au lieu d’empiler les niveaux de citation en ligne de commande.

## 2026-08-29 15:49:42 +02:00 — Règle mémoire : aucune exception aux correctifs atomiques

**Problème :** Le correctif des dates de sources a regroupé plusieurs fichiers et réintroduit une ancre HTML accentuée ; il a été rejeté sans modification.

**Solution permanente :** Jusqu’à la fin de cette session Windows, limiter chaque appel `apply_patch` à un seul fichier et à des lignes de contexte entièrement ASCII. Pour l’HTML accentué, ancrer l’insertion sur une balise voisine sans texte.

## 2026-08-29 15:47:33 +02:00 — Règle mémoire : correctifs atomiques

**Problème :** Un correctif multi-fichier contenait encore deux lignes de contexte accentuées et a donc été rejeté en entier, sans modification.

**Solution permanente :** Appliquer séparément chaque modification utilisant une ancre ASCII, puis vérifier son résultat avant de passer au fichier suivant. Ne jamais mélanger une ancre dont l’encodage est incertain à un correctif par ailleurs valide.

## 2026-08-29 15:46:02 +02:00 — Règle mémoire : ancres ASCII avec fichiers UTF-8

**Problème :** Un deuxième correctif a échoué car la sortie PowerShell affichait le texte UTF-8 en caractères corrompus ; cette représentation a été réutilisée comme contexte et ne correspondait pas aux octets du fichier. Aucun fichier n’a été modifié par ce correctif.

**Solution permanente :** Pour `apply_patch` sur un fichier UTF-8 dont le terminal altère les accents, employer uniquement des ancres ASCII stables ou ajouter un fichier de test séparé, sans recopier le texte corrompu affiché par PowerShell.

## 2026-08-29 15:43:48 +02:00 â€” RÃ¨gle mÃ©moire : contexte avant correctif

**ProblÃ¨me :** Un correctif `apply_patch` a Ã©chouÃ© parce que la ligne de contexte supposÃ©e dans le validateur ne correspondait pas au fichier rÃ©el. Aucun fichier nâ€™a Ã©tÃ© modifiÃ©.

**Solution permanente :** Lire le voisinage exact de chaque point de modification avant de construire un correctif multi-fichier, puis utiliser les lignes rÃ©ellement prÃ©sentes comme contexte.

## 2026-08-29 14:00:54 +02:00 — Exécution du plan dashboard

**Demande :** Exécuter le plan initial du dashboard Grid Hydrique National.

**Réponse / solution :** Le dépôt a été analysé avant toute modification. Le plan supposait un serveur Next.js alors que le site est statique sur GitHub Pages. L’architecture a donc été soumise à validation avant développement.

## 2026-08-29 14:00:54 +02:00 — Hébergement GitHub Pages

**Précision :** Le site est déjà hébergé sur GitHub Pages et GitHub doit être configuré.

**Réponse / solution :** La configuration distante a été vérifiée : dépôt public, domaine `alaindusaule.fr`, HTTPS actif et publication legacy depuis `master:/`. La cible retenue est une publication par GitHub Actions compatible avec le site statique existant.

## 2026-08-29 14:00:54 +02:00 — Coût de GitHub Actions

**Question :** Le workflow GitHub Actions entraîne-t-il un coût ?

**Réponse / solution :** La documentation GitHub confirme que les runners standards sont gratuits pour les dépôts publics et GitHub Pages. Aucun runner payant ne sera utilisé. Le worktree `.worktrees/dashboard` a été autorisé et créé.

## 2026-08-29 14:00:54 +02:00 — Compagnon visuel

**Question :** Utiliser un compagnon visuel local pendant la conception ?

**Réponse :** Non. La conception continue uniquement en texte.

## 2026-08-29 14:00:54 +02:00 — Données quasi temps réel

**Question :** Un script JavaScript peut-il assurer une actualisation quasi temps réel ?

**Réponse / solution :** Oui. Les API Hub’Eau et VigiEau autorisent les appels navigateur. Un rafraîchissement automatique toutes les quinze minutes et un bouton d’actualisation manuelle ont été validés.

## 2026-08-29 14:00:54 +02:00 — Architecture native

**Question :** Est-il problématique d’abandonner Next.js au profit de JavaScript et CSS natifs ?

**Réponse / solution :** Non. Pour GitHub Pages, HTML sémantique, CSS natif, modules JavaScript et MapLibre réduisent la complexité et le poids tout en conservant l’URL `/grid-hydrique/`. Cette architecture a été validée.

## 2026-08-29 14:00:54 +02:00 — Réécriture du plan

**Demande :** Réécrire le plan avec `superpowers:writing-plans` avant tout code.

**Réponse / solution :** Un nouveau plan détaillé, test-first et adapté à l’architecture native est créé dans `docs/superpowers/plans/2026-08-29-grid-hydrique-dashboard.md`.

## 2026-08-29 14:00:54 +02:00 — Règle mémoire : encodage des scripts Python

**Problème :** Les recherches UI ont échoué sous PowerShell à cause de caractères Unicode non représentables en CP1252.

**Solution permanente :** Définir `PYTHONIOENCODING=utf-8` avant d’exécuter les scripts Python produisant du texte Unicode sous Windows.

## 2026-08-29 14:08:56 +02:00 — Règle mémoire : chaînes PowerShell

**Problème :** Une expression régulière délimitée par des apostrophes contenait l’apostrophe de « d’implémentation », ce qui a empêché PowerShell d’analyser toute la commande de vérification.

**Solution permanente :** Ne pas inclure d’apostrophe ASCII (`'`) ni typographique (`’`) dans une chaîne PowerShell délimitée par apostrophes : PowerShell peut traiter les deux comme des délimiteurs. Utiliser une comparaison ne contenant aucun de ces caractères ou une chaîne délimitée par guillemets doubles. Après une erreur d’analyse, vérifier l’état Git avant de relancer afin de confirmer qu’aucune sous-commande n’a été exécutée.

## 2026-08-29 15:36:42 +02:00 — Règle mémoire : variables PowerShell réservées

**Problème :** Une validation a tenté d’utiliser `$home`, alias insensible à la casse de la variable système `$HOME`, qui est constante et en lecture seule.

**Solution permanente :** Ne jamais employer `$HOME`, `$home` ni `$CODEX_HOME` comme variable de script. Utiliser un nom propre à la tâche tel que `$homeHtml` et exécuter immédiatement la validation après ajout d’une nouvelle variable PowerShell.

## 2026-08-29 15:38:00 +02:00 — Règle mémoire : codes de sortie PowerShell

**Problème :** Plusieurs validations séparées par des points-virgules ont produit un code final nul parce que les dernières commandes ont réussi, malgré l’échec du premier script.

**Solution permanente :** Ne pas déduire la réussite d’un groupe de commandes PowerShell du seul code final. Exécuter chaque validation séparément ou interrompre explicitement dès que `$LASTEXITCODE` est non nul. Pour les scripts Windows PowerShell sans BOM, éviter aussi les caractères accentués dans les motifs littéraux et employer un motif ASCII équivalent.

## 2026-08-30 18:39:00 +02:00 — Règle mémoire : vérifier les heures annoncées par un message de quota

**Problème :** Le message d’échec d’un sous-agent indiquait une reprise possible à 16 h 17. Cette indication a été répétée alors que l’heure locale était déjà 18 h 39.

**Solution permanente :** Avant de communiquer une heure de reprise fournie par un service, la comparer à l’heure locale du contexte. Si elle est dépassée, signaler que l’indication est périmée et tenter immédiatement une nouvelle exécution.

## 2026-08-30 18:40:00 +02:00 — Règle mémoire : toujours fournir un contexte à `apply_patch`

**Problème :** Une première tentative d’ajout au journal utilisait un hunk vide et a été rejetée sans modifier le fichier.

**Solution permanente :** Lire la fin du fichier puis ancrer tout ajout `apply_patch` sur une ligne existante exacte ; ne jamais envoyer un hunk de mise à jour sans ligne de contexte.

## 2026-08-30 18:48:00 +02:00 — Règle mémoire : ne pas servir les modules `.mjs` avec le serveur Python Windows par défaut

**Problème :** Le serveur `python -m http.server` relancé pour la recette a répondu aux fichiers `.mjs` avec `Content-Type: text/plain`. Edge a donc bloqué `dashboard.mjs` avant l’initialisation de la carte.

**Solution permanente :** Pour ce projet sous Windows, lancer le serveur local avec une association MIME explicite `.mjs` → `text/javascript` et l’en-tête `Cache-Control: no-store`, puis faire contrôler le type de contenu par Luna avant la recette navigateur.

## 2026-08-30 18:55:00 +02:00 — Règle mémoire : ne pas déclarer `filter: null` dans une couche MapLibre

**Problème :** La recette navigateur a montré que MapLibre refuse les définitions `zones-fill` et `zones-line` lorsque leur propriété initiale `filter` vaut `null`, même si `setFilter(layer, null)` est valide pour supprimer ensuite un filtre.

**Solution permanente :** Pour une vue initiale sans filtre, omettre entièrement la propriété `filter` lors de `addLayer`. Réserver `null` à l’appel ultérieur de `setFilter` et couvrir séparément ces deux contrats dans les tests.

## 2026-08-30 19:05:00 +02:00 — Règle mémoire : ne pas combiner `fitBounds` avec des `maxBounds` plus étroites que les ratios cibles

**Problème :** La contrainte `maxBounds` obligeait MapLibre à garder tout le viewport dans un rectangle géographique fixe. Selon le ratio du canvas, elle augmentait le zoom calculé par `fitBounds` et excluait la Corse à 320, 1024 et 1440 px.

**Solution permanente :** Pour un cadrage national responsive qui doit tolérer des marges variables, ne pas fixer de `maxBounds` étroites. Tester les projections des extrêmes territoriaux sur tous les ratios cibles.

## 2026-08-30 19:05:00 +02:00 — Règle mémoire : convertir les entités MapLibre en GeoJSON simple avant `setData`

**Problème :** Un clic sur une station envoyait directement un objet `MapGeoJSONFeature` retourné par MapLibre à la source `selected-point`. Après plusieurs clics, le worker échouait avec `can't serialize object of unregistered class`.

**Solution permanente :** Avant tout `GeoJSONSource.setData`, reconstruire une entité GeoJSON simple contenant uniquement `type`, une géométrie copiée et des propriétés copiées. Ne jamais transmettre les champs ou prototypes internes d’une entité rendue MapLibre.

## 2026-08-30 19:05:05 +02:00 — Règle mémoire : lire l’heure système avant chaque entrée de journal

**Problème :** Une entrée mémoire a été préfixée par `19:06:00` alors que l’heure système était encore `19:05:05`.

**Solution permanente :** Exécuter `Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'` immédiatement avant chaque ajout au journal et reprendre cette valeur sans arrondi ni estimation.

## 2026-08-30 19:05:05 +02:00 — Livraison du mode Zones VigiEau

**Demande :** Ajouter, en complément de la vue départementale, un mode affichant les zones officielles VigiEau par ressource et garantir que la France métropolitaine avec la Corse apparaît entièrement au chargement. Tous les tests devaient être réalisés par un sous-agent GPT-5.6 Luna.

**Solution :** La branche `feat/vigieau-zone-mode` ajoute le PMTiles officiel chargé à la demande, les vues `Départements` et `Zones`, les filtres `Toutes les ressources`, `Cours d’eau`, `Nappes` et `Eau potable`, le tri des polygones et détails par gravité, les replis réseau, le cadrage national responsive et la conversion des entités MapLibre en GeoJSON sérialisable. Les commits applicatifs sont `c1a89e4`, `7353fc8`, `171853b`, `f35ec1c`, `6a389ea`, `caebd9a`, `006381c` et `6b8d9c0`.

**Validation GPT-5.6 Luna :** `node --test tests/grid-hydrique/*.test.mjs` : 41/41 réussis ; `tests/validate-grid-hydrique.ps1` : code 0 ; `tests/validate-site.ps1` : code 0 et 6 pages contrôlées ; `node --test tests/contact-script.test.js` : 1/1 réussi ; `git diff --check` : code 0. La recette Edge couvre 320, 768, 1024 et 1440 px, le cadrage France + Corse, le chargement PMTiles différé et unique, les quatre filtres, la navigation clavier, le détail multiressource, 20 clics répétés sans erreur worker, ainsi que les replis après échec PMTiles et `/api/zones`.

## 2026-08-30 19:23:03 +02:00 — Corrections après revue du mode Zones

**Problème :** La revue indépendante a détecté que les remplissages zonaux pouvaient masquer les contours départementaux et que le repli après échec de `/api/zones` ne récupérait pas le lien d’arrêté contenu dans la propriété PMTiles `arreteRestriction`.

**Solution :** Les couches zonales sont maintenant insérées sous `departments-line`. La normalisation des zones parse défensivement `arreteRestriction` et convertit son champ `fichier` vers `arrete.cheminFichier`, le rendu continuant à n’accepter que les URL HTTPS. GPT-5.6 Luna a ajouté les tests de régression, constaté leur échec avant correction, puis validé 43/43 tests, les deux validateurs du site, le test du formulaire de contact et `git diff --check`.

## 2026-08-30 19:25:48 +02:00 — Choix d’intégration du mode Zones

**Réponse utilisateur :** `1`, pour fusionner localement la branche dans `master`.

**Solution :** Préparer une fusion locale en avance rapide, préserver séparément les modifications déjà présentes dans le checkout principal, puis faire exécuter la validation post-fusion par GPT-5.6 Luna.

## 2026-08-30 19:28:50 +02:00 — Règle mémoire : ne pas supposer que Git peut supprimer immédiatement un worktree Windows

**Problème :** Après la fusion, `git worktree remove` a bien désenregistré le worktree, mais Windows a refusé de supprimer son dossier vide avec `Permission denied`, probablement parce qu’un processus conservait encore ce chemin ouvert.

**Solution permanente :** Après l’arrêt du serveur, vérifier aussi les processus et sessions susceptibles de conserver le dossier comme répertoire courant. Si Git a déjà désenregistré le worktree, ne pas forcer une suppression récursive : confirmer que le dossier résiduel est vide, supprimer la branche fusionnée séparément et laisser le dossier vide jusqu’à la libération du verrou.

## 2026-08-30 19:45:51 +02:00 — Règle mémoire : terminer le brainstorming avant de charger les skills d’implémentation

**Problème :** Pour la demande de borne de dézoom, les instructions de diagnostic et de TDD ont été chargées en même temps que le brainstorming, alors que le brainstorming impose de ne charger aucune skill d’implémentation avant validation du design.

**Solution permanente :** Lorsqu’une modification de comportement déclenche le brainstorming, charger uniquement ses instructions, explorer le contexte et faire valider le design. Ne charger `writing-plans`, le diagnostic, le TDD ou toute autre skill d’implémentation qu’après cette validation et dans l’ordre prescrit.

## 2026-08-30 19:46:56 +02:00 — Limiter le dézoom au cadrage national

**Demande :** Empêcher tout dézoom supplémentaire dès que la carte complète avec la Corse est visible, y compris après un changement de taille ou une rotation mobile.

**Solution validée :** Calculer dynamiquement le zoom minimal depuis l’emprise nationale et les dimensions courantes du conteneur, le recalculer lors des redimensionnements sans recentrer la navigation, et confier tous les tests à GPT-5.6 Luna.

## 2026-08-30 20:16:51 +02:00 — Stabiliser l’intégralité des stations actives

**Problème soumis :** Les points des stations apparaissaient de manière presque aléatoire selon le zoom précédemment appliqué.

**Décisions utilisateur :** Conserver une liste nationale stable, charger l’intégralité des stations officielles sans l’outre-mer et exclure les stations inactives.

**Solution validée :** Générer localement les référentiels complets des stations actives de métropole et de Corse, conserver leurs codes et géométries pendant toute la session, puis fusionner uniquement les propriétés des mesures récentes reçues pour le viewport. Les échecs, annulations et réponses obsolètes ne pourront plus ajouter, retirer ni déplacer de point.

## 2026-08-30 20:20:19 +02:00 — Plan de correction du zoom et des stations

**Réponse utilisateur :** `ok`, approuvant la spécification consolidée.

**Solution :** Création d’un plan TDD en incréments pour la limite de zoom responsive, le référentiel complet des stations actives métropolitaines, la fusion stable des mesures et la recette Edge. Le plan maintient l’exigence que GPT-5.6 Luna écrive et exécute tous les tests et validateurs.

## 2026-08-30 20:27:02 +02:00 — Changement du modèle de test

**Décision utilisateur :** Exécuter le plan dans la session courante, mais confier finalement tous les tests à GPT-5.4 Mini afin de réduire la consommation de ressources des sous-agents.

**Solution :** La spécification et le plan actif désignent désormais exclusivement `gpt-5.4-mini` pour l’écriture et l’exécution des tests, validateurs et recettes navigateur. Les mentions GPT-5.6 Luna des entrées historiques restent inchangées car elles décrivent les validations déjà réalisées.

## 2026-08-30 20:28:03 +02:00 — Règle mémoire : messages PowerShell strictement ASCII dans les chaînes apostrophées

**Problème :** La commande de création du worktree a été rejetée avant exécution parce qu’un message `throw` délimité par des apostrophes contenait l’apostrophe typographique de « n’est ». Cette erreur répétait une règle déjà consignée.

**Solution permanente :** Dans toute commande PowerShell générée, limiter les chaînes délimitées par apostrophes à des caractères ASCII sans apostrophe interne. Pour les messages français, employer des guillemets doubles ou reformuler le texte en ASCII avant exécution. Après toute erreur d’analyse, contrôler immédiatement les worktrees, branches et fichiers avant de relancer.

## 2026-08-30 20:28:32 +02:00 — Règle mémoire : placer les options de `git worktree add` avant le chemin

**Problème :** La deuxième tentative de création du worktree a affiché l’aide Git sans rien créer, car la commande plaçait `-b` après le chemin, comme dans le plan initial.

**Solution permanente :** Utiliser et documenter la syntaxe `git worktree add -b <branche> <chemin>` ; vérifier l’aide de la sous-commande avant d’inscrire une nouvelle syntaxe Git dans un plan exécutable.

## 2026-08-30 20:35:41 +02:00 — Règle mémoire : comparer intégralement les validateurs modifiés par un sous-agent

**Problème :** Lors du premier test rouge du référentiel complet, le sous-agent GPT-5.4 Mini a remplacé presque tout `validate-grid-hydrique.ps1` par deux nouvelles assertions au lieu de les ajouter, supprimant silencieusement la couverture existante.

**Solution permanente :** Après toute modification d’un validateur par un sous-agent, inspecter le diff complet avant le code de production. Refuser toute suppression hors périmètre, restaurer le fichier depuis `HEAD`, puis ajouter uniquement les assertions requises et relancer le rouge.

## 2026-08-30 20:37:37 +02:00 — Règle mémoire : vérifier les tailles maximales propres à chaque endpoint Hub’Eau

**Problème :** Le premier lancement du générateur complet a échoué avant toute écriture avec `HTTP 400` parce que le référentiel hydrométrique limite `size` à 10 000, contrairement à d’autres endpoints Hub’Eau acceptant 20 000. Une première tentative de lecture du corps d’erreur a aussi supposé à tort que la réponse PowerShell exposait une propriété `Content` non nulle.

**Solution permanente :** Avant de fixer une taille de page dans un plan ou un générateur, interroger l’endpoint exact et lire sa réponse `ValidatePageSize`. Pour les erreurs HTTP PowerShell dont la forme varie, utiliser une requête `curl.exe -i` simple avant d’accéder à des propriétés d’exception. Le générateur utilise désormais `size=10000` pour le référentiel hydrométrique et conserve la pagination `next`.

## 2026-08-31 14:25:01 +02:00 — Reprise de la stabilisation des stations

**Demande :** Reprendre le travail interrompu sur le comportement des stations de relevage.

**Solution :** L’état du worktree et le contexte Obsidian ont été contrôlés. La reprise se fait au cycle TDD de fusion des mesures dans le référentiel national stable, avec l’écriture et l’exécution de tous les tests toujours déléguées exclusivement à GPT-5.4 Mini.

## 2026-08-31 14:34:00 +02:00 — Règle mémoire : borner les assertions structurelles au bloc visé

**Problème :** Le premier test structurel de la branche de faible zoom utilisait une expression régulière qui continuait sa recherche après la fin du bloc et aurait interdit les appels `setStations` légitimes situés plus loin dans la fonction.

**Solution permanente :** Lorsqu’un test lit le code source, extraire d’abord le bloc syntaxique ciblé puis appliquer l’assertion à cet extrait. Contrôler le diff du test rouge avant toute modification de production afin de ne pas coder contre un faux contrat.

## 2026-08-31 15:09:30 +02:00 — Stabilisation du dézoom et des stations de relevage

**Problème soumis :** Le dézoom pouvait continuer au-delà du cadrage national et les points des stations variaient presque aléatoirement selon le zoom précédent.

**Cause :** La carte ne recalculait pas une borne minimale responsive à partir de l’emprise France métropolitaine + Corse. De plus, `setStations` remplaçait le référentiel national par les seules observations renvoyées pour le viewport courant, puis réinjectait un ancien jeu de points au faible zoom.

**Solution :** Le zoom minimal est désormais calculé depuis l’emprise nationale, appliqué au chargement et recalculé au redimensionnement sans recentrer la navigation. Deux référentiels locaux complets et déterministes contiennent 2 097 piézomètres et 3 883 stations hydrométriques actives de métropole et de Corse. Les réponses Hub’Eau enrichissent uniquement les propriétés des codes connus ; elles ne changent plus l’ordre, le nombre ni les géométries des points.

**Validation GPT-5.4 Mini :** Les suites carte passent à 50/50, le test contact à 1/1, `validate-grid-hydrique.ps1`, `validate-site.ps1` sur 6 pages et `git diff --check` réussissent. Les codes des deux référentiels sont uniques. Dans Edge, les largeurs 320, 768, 1024 et 1440 px affichent la France métropolitaine et la Corse au chargement ; le dézoom s’arrête exactement au `minZoom`, la limite est recalculée au redimensionnement et le centre choisi reste inchangé. Après trois cycles zoom, déplacement et retour au cadrage initial, les 2 097 et 3 883 points conservent les mêmes séquences code + coordonnées et les captures de la carte ont 0 pixel différent. Les scénarios Hub’Eau indisponible et actif ne vident aucun réseau. Les détails d’un piézomètre et de trois stations hydrométriques ouvrent leur historique. Aucune `pageerror` n’est observée ; le scénario actif ne produit aucune erreur console.

## 2026-08-31 15:12:00 +02:00 — Règle mémoire : répéter le chemin absolu du worktree à chaque délégation

**Problème :** Un contrôle final délégué a été exécuté dans le checkout principal et a annoncé à tort qu’aucun diff de journal n’existait, parce que le message de suivi mentionnait seulement « worktree » sans répéter son chemin absolu.

**Solution permanente :** Chaque tâche et chaque relance d’un sous-agent doivent préciser le chemin absolu du worktree et demander une confirmation du `git rev-parse --show-toplevel` avant toute commande de validation. Refuser un résultat dont le checkout observé ne correspond pas au chemin attendu.

## 2026-08-31 15:46:03 +02:00 — Serveur de test utilisateur

**Question :** Un serveur web a-t-il été lancé pour tester la carte, et à quelle adresse ?

**Réponse :** Le serveur de la branche corrigée a été relancé sur `http://127.0.0.1:8002/grid-hydrique/`. La page répond avec le code 200, les modules `.mjs` sont servis en `text/javascript` et le cache est désactivé.

## 2026-08-31 16:55:16 +02:00 — Couleur de l’état sans restriction

**Problème soumis :** La couleur bleu pâle de « Aucune restriction » se confond avec le fond bleu pâle de la carte.

**Décision utilisateur :** Employer un vert ayant le même caractère pastel que le bleu actuel. La proposition `#d8e8dc` a été validée.

**Solution prévue :** Remplacer uniquement la couleur du niveau `none` dans la palette commune de la carte et dans la légende, sans modifier le fond ni les niveaux d’alerte. Les tests seront adaptés et exécutés par GPT-5.4 Mini.

## 2026-08-31 17:00:35 +02:00 — Validation de la spécification verte

**Réponse utilisateur :** La spécification utilisant `#d8e8dc` pour « Aucune restriction » est validée.

**Solution :** Un plan TDD minimal est préparé : GPT-5.4 Mini verrouille d’abord la palette JavaScript et la légende CSS en rouge, l’agent principal remplace les deux valeurs, puis GPT-5.4 Mini exécute la non-régression et la recette Edge.

## 2026-08-31 17:07:14 +02:00 — Validation du vert « Aucune restriction »

**Solution livrée :** La palette partagée des départements et zones ainsi que la pastille de légende utilisent désormais le vert pastel `#d8e8dc`. Le fond de carte reste `#e9f2f5` et les quatre couleurs de restriction sont inchangées.

**Validation GPT-5.4 Mini :** Le cycle rouge a produit exactement 2 échecs liés à l’ancienne couleur, puis le ciblé passe à 18/18 et la suite carte complète à 51/51. `validate-grid-hydrique.ps1` et `git diff --check` réussissent. Dans Edge, la pastille calcule `rgb(216, 232, 220)`, MapLibre utilise `#d8e8dc` comme couleur par défaut des départements et le même contrat pour les zones, tandis que le fond reste `#e9f2f5`. Les autres pastilles conservent leurs valeurs et aucune erreur console ou `pageerror` n’est observée.

## 2026-08-31 17:09:47 +02:00 — Intégration de la carte stabilisée

**Réponse utilisateur :** Choix 1, fusionner localement la branche `feat/map-zoom-stable-stations` dans `master`.

**Solution :** Effectuer une fusion locale en avance rapide, faire valider le résultat fusionné par GPT-5.4 Mini, puis nettoyer la branche et son worktree uniquement si la validation reste verte. Le serveur de test sera relancé depuis `master` à la même adresse.

## 2026-08-31 18:44:40 +02:00 — Centralisation globale des couleurs

**Problème soumis :** Les mêmes codes couleur sont dupliqués dans le CSS, le JavaScript et plusieurs pages, au lieu d’être déclarés une fois puis référencés.

**Décisions utilisateur :** Conserver la modification locale intentionnelle `#69f08b` pour « Aucune restriction » et appliquer la source unique à toute la palette du site, pas seulement à la carte hydrique.

**Architecture validée :** Déclarer les valeurs une seule fois comme propriétés personnalisées dans `site.css`, utiliser `var(...)` dans tous les styles, résoudre ces mêmes propriétés dans un module JavaScript partagé pour MapLibre et synchroniser les balises `theme-color` sans valeur littérale dupliquée. Les transparences seront dérivées des tokens plutôt que redéclarées en `rgba(...)`.
