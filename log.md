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
