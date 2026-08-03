# Site auteur Alain du Saule — Spécification de design

Date : 3 août 2026  
Statut : approuvé par l’auteur le 3 août 2026

## 1. Objectif

Créer le site vitrine statique d’Alain du Saule et mettre en avant son premier ouvrage, *L’eau ou le chaos — Le Grid Hydrique National*. Le site doit convertir les visiteurs vers les canaux d’achat, présenter la démarche de l’auteur et constituer une base durable pour ses prochains livres.

Le site doit fonctionner sans outil de compilation, sans framework et sans JavaScript applicatif. Il doit être rapide, accessible, facile à héberger et maintenable directement en HTML et CSS.

## 2. Sources de vérité

Le contenu et les visuels proviennent du projet Obsidian :

`O:\Obsidian_vault\claude-obsidian\wiki\projects\ecriture\grid-hydrique-national`

Les sources prioritaires sont :

- `livre/couverture/testcouv3.pdf` et `livre/couverture/couv2.png` pour l’identité visuelle finale ;
- `livre/positionnement-editorial.md` pour le ton ;
- `livre/metadata.yaml` pour la typographie du manuscrit ;
- `promotion/communique-presse-leau-ou-le-chaos.md` pour les informations bibliographiques et presse ;
- `promotion/plan-ventes-directes-leau-ou-le-chaos-2026-08-03.md` pour la stratégie commerciale active ;
- `promotion/leau-ou-le-chaos-interview-prep.md` et la fiche auteur BoD pour la biographie publique ;
- les audits factuels et fiches sources du livre pour les chiffres affichés.

Les informations commerciales récentes priment sur les anciennes notes de travail : publication le 11 juillet 2026, 132 pages, ISBN 9782322839933, priorité aux ventes papier et ebook. Le site ne proposera pas le PDF gratuit.

## 3. Positionnement

Alain du Saule est présenté comme un auteur citoyen et un professionnel de l’informatique habitué à analyser des systèmes complexes. Il rend la crise de l’eau accessible et soumet au débat une proposition d’infrastructure nationale.

Le Grid Hydrique National est décrit comme une proposition citoyenne fondée sur trois fonctions : stocker, répartir et piloter l’eau entre les territoires. Le site ne le présente ni comme une infrastructure adoptée, ni comme une garantie technique, ni comme un programme partisan.

Message central :

> La France a construit un réseau électrique national. Elle peut penser l’eau avec la même ambition.

Le vocabulaire privilégie la restauration, la souveraineté, l’abondance, les infrastructures, la liberté et l’action citoyenne. Il évite la culpabilisation, le catastrophisme, l’écologie punitive et les affirmations techniques non démontrées.

## 4. Architecture de l’information

Le site adopte une architecture hybride : une grande page d’accueil et deux pages spécialisées.

### 4.1 Pages

- `/index.html` : identité de l’auteur, ouvrage phare, vision, Grid Hydrique National, biographie courte, canaux d’achat et accès presse ;
- `/livres/leau-ou-le-chaos.html` : présentation approfondie du livre, contenu, faits sourcés, informations bibliographiques et ensemble des canaux d’achat vérifiés ;
- `/presse.html` : biographie professionnelle, informations pratiques, communiqué téléchargeable et contact ;
- `/mentions-legales.html` : responsabilité éditoriale sous le nom public Alain du Saule, contact, propriété intellectuelle et informations relatives aux liens externes ;
- `/404.html` : page d’erreur cohérente avec l’identité du site ;
- `/robots.txt` et `/sitemap.xml` : indexation.

La structure prévoit l’ajout ultérieur d’un catalogue `/livres/` lorsque le deuxième ouvrage sera publié. Aucun lien vers une page vide ou future ne sera intégré à cette première version.

### 4.2 Parcours principal

Découvrir l’idée → comprendre le livre → choisir un libraire.

Des parcours secondaires mènent vers la biographie, les informations presse, les sources et le contact.

## 5. Direction artistique

La direction retenue est « éditorial infrastructuré » : la rencontre entre un essai imprimé sérieux et un grand projet d’infrastructure française.

### 5.1 Codes issus de la couverture

Le motif central est la transition entre chaos fragmenté et réseau restauré : terre sèche, orage et désordre d’un côté ; eau, végétation, lumière et lignes connectées de l’autre. Le site reprend cette tension par la couverture, des séparations de sections et un motif discret de lignes et de nœuds. Il n’utilise pas de vague générique ni de goutte d’eau décorative.

Palette :

- encre : `#231F20` ;
- papier : `#FFFFFF` ;
- papier chaud : `#F5F2EB` ;
- bleu hydrique : `#0B5C7A` ;
- bleu profond : `#073E52` ;
- terre : `#6C4B30` ;
- forêt : `#283818` ;
- soleil : `#F8D898` ;
- bordure : `#D8D2C7`.

Le bleu hydrique porte les actions et les liens importants. L’or et le cyan restent décoratifs et ne servent pas au texte courant.

### 5.2 Typographie

- Titres : EB Garamond auto-hébergée au format WOFF2 sous sa licence libre ; repli sur Georgia, Cambria et serif.
- Corps et interface : pile système sobre, sans téléchargement distant.
- Taille du corps : 17 à 18 px, interligne de 1,55 à 1,65.
- Largeur de lecture : 60 à 72 caractères.

Adobe Garamond Pro ne sera pas distribuée sur le Web sans licence Web explicite.

### 5.3 Absence de portrait

L’auteur a volontairement choisi de ne pas publier de photographie. Aucun portrait réel récupéré d’une plateforme, portrait généré ou image générique ne sera utilisé. La section auteur reposera sur une composition typographique, une signature nominale et la biographie approuvée.

## 6. Composition des pages

### 6.1 Accueil

1. En-tête sobre : mot-symbole « Alain du Saule », liens Livre, Le Grid, Auteur, Presse et Contact, puis bouton « Acheter le livre ».
2. Hero en deux colonnes : titre, promesse, résumé court et CTA à gauche ; couverture finale à droite.
3. Trois faits sourcés sur la crise de l’eau, présentés sans dramatisation excessive.
4. Rail « Stocker — Répartir — Piloter » relié par un motif de réseau.
5. Présentation du livre selon les trois actes Alerte, Solution et Action.
6. Citation-manifeste sur fond bleu hydrique très clair.
7. Section auteur sans portrait.
8. Section « Les ouvrages » contenant actuellement un seul livre mais extensible à plusieurs cartes.
9. Bloc d’achat donnant accès aux différents distributeurs.
10. Bloc presse et contact.
11. Pied de page avec ISBN, contact et informations légales.

### 6.2 Page du livre

1. Couverture, titre complet, informations bibliographiques et CTA.
2. Question centrale de l’ouvrage.
3. Les trois actes : Alerte, Solution, Action.
4. Le Grid Hydrique National en trois verbes.
5. Publics concernés : citoyens, élus, agriculteurs, acteurs territoriaux et lecteurs intéressés par les infrastructures.
6. Sources et méthode : distinction claire entre données vérifiées et proposition de l’auteur.
7. Choix du libraire.
8. Accès presse et contact.

### 6.3 Page presse

1. Présentation courte de l’auteur sans portrait.
2. Biographie professionnelle issue de la fiche publique BoD et validée par l’auteur.
3. Fiche du livre : titre, sous-titre, format broché, 132 pages, BoD, date et ISBN.
4. Angles d’interview.
5. Téléchargement du communiqué de presse local.
6. Couverture Web téléchargeable.
7. Contact : `[contact-removed]`.

## 7. Canaux d’achat et liens externes

BoD est affiché en premier comme éditeur et canal direct d’origine. Les autres canaux vérifiés sont présentés comme choix équivalents, sans fausse rareté ni recommandation commerciale trompeuse.

Canaux confirmés au 3 août 2026 :

- Books on Demand : papier et ebook ;
- Fnac : papier et ebook ;
- Cultura : papier et ebook ;
- Google Books : fiche de consultation ;
- BnF : référence bibliographique.

D’autres libraires ne sont ajoutés que si leur fiche pour l’ISBN 9782322839933 est accessible et vérifiable pendant l’implémentation. Le prix visible n’est pas figé dans les données structurées. Les liens s’ouvrent de manière prévisible et sont nommés explicitement.

## 8. Référencement

Chaque page possède :

- un titre unique et une méta-description en français ;
- une URL canonique sous `https://alaindusaule.com/` ;
- un seul H1 et une hiérarchie de titres cohérente ;
- des métadonnées Open Graph ;
- une image sociale dérivée de la couverture finale ;
- des liens internes vers les pages Livre, Presse et les sections pertinentes de l’accueil.

Données structurées :

- `WebSite` et `Person` sur l’accueil ;
- `Book` sur la page du livre ;
- `BreadcrumbList` sur les pages internes ;
- `ImageObject` pour la couverture.

Aucun `Offer`, `AggregateRating` ou profil `sameAs` non vérifié ne sera inventé.

## 9. Assets

Les fichiers sources restent dans le vault. Des copies Web optimisées sont placées dans le projet du site.

- Face avant finale extraite de `livre/couverture/testcouv3.pdf`.
- Variantes AVIF, WebP et JPEG avec tailles adaptées au responsive.
- Image Open Graph au format JPEG.
- Communiqué de presse PDF copié dans `assets/documents/`.
- Favicon SVG original dérivé du motif de réseau, sans logo de tiers.

Les PNG 300 dpi de plusieurs mégaoctets ne sont jamais servis directement.

## 10. Responsive et accessibilité

- Mobile-first, de 320 à 1440 px et au-delà.
- Hero empilé sur mobile, deux colonnes à partir d’environ 768 px.
- Navigation sans menu hamburger dépendant de JavaScript ; les liens s’adaptent ou reviennent à la ligne.
- Aucun défilement horizontal à 320 px.
- Landmarks `header`, `nav`, `main`, `section` et `footer`.
- Lien d’évitement « Aller au contenu ».
- Focus visible de 3 px et cibles tactiles d’au moins 44 × 44 px.
- Contrastes conformes au niveau WCAG AA.
- Texte important toujours disponible en HTML.
- Alt descriptif pour la couverture ; motifs décoratifs ignorés par les technologies d’assistance.
- Liens identifiables autrement que par la couleur.
- Respect de `prefers-reduced-motion`.
- Mise en page utilisable avec zoom de 200 à 400 %.

## 11. Performance

- Aucun framework, CDN, outil de suivi ou gestionnaire de cookies en première version.
- HTML ciblé sous 30 Ko par page avant compression.
- CSS ciblé sous 25 Ko avant compression.
- Aucun JavaScript applicatif.
- Couverture prioritaire avec dimensions explicites, `srcset`, `sizes` et `fetchpriority="high"`.
- Autres images avec chargement différé.
- Poids cible de la première vue : moins de 700 Ko.
- Objectifs : LCP inférieur à 2,5 s, CLS inférieur à 0,1 et audits Lighthouse supérieurs à 90 lorsque l’outil est disponible.

## 12. Gestion des erreurs et cas incomplets

- Un lien marchand n’est publié que s’il répond et correspond au bon ISBN.
- Si un distributeur devient indisponible, le reste du bloc d’achat reste fonctionnel.
- La page 404 ramène vers l’accueil et la page du livre.
- Le site ne contient aucun formulaire nécessitant un backend. Le contact utilise une adresse visible et un lien `mailto:`.
- Les informations d’hébergement ne sont pas inventées. La page d’informations légales se limite aux éléments confirmés dans le périmètre de cette version et ne prétend pas constituer un avis juridique.

## 13. Vérification avant livraison

1. Vérifier l’existence de chaque fichier et chaque chemin relatif.
2. Valider le HTML et le CSS avec les outils disponibles.
3. Détecter les liens et assets locaux cassés.
4. Tester les largeurs 320, 375, 768, 1024 et 1440 px.
5. Contrôler navigation clavier, focus, zoom et préférence de mouvement réduit.
6. Vérifier les métadonnées, canonical, sitemap, robots et JSON-LD.
7. Servir le site par HTTP local et contrôler la console du navigateur.
8. Exécuter un audit Lighthouse si Chrome et Lighthouse sont disponibles.
9. Contrôler le poids des assets et la couverture utilisée comme LCP.
10. Refaire une vérification fraîche juste avant d’annoncer la livraison.

## 14. Hors périmètre

- Hébergement et déploiement public.
- Formulaire avec traitement serveur.
- Newsletter, analytics, publicité ou bannière de cookies.
- Boutique interne ou paiement direct.
- Blog ou système de gestion de contenu.
- Portrait d’auteur.
- Publication gratuite du PDF intégral du livre.
- Traductions.
