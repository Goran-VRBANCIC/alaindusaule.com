# Journal du projet

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
