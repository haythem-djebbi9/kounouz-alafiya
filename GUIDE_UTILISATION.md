# Guide d'utilisation — Kounouz Alafiya

Plateforme tunisienne de confiance, de vérification et de traçabilité du miel : du rucher au consommateur, chaque pot porte un code QR qui prouve son origine et ses analyses en laboratoire.

---

## Sommaire

Ce guide explique, espace par espace, comment utiliser l'application. Il suit le parcours réel d'un miel dans le système.

1. Présentation de la plateforme
2. Démarrer l'application
3. Connexion, comptes et paramètres
4. Le parcours d'un miel, étape par étape
5. Espace Producteur
6. Espace Agent terrain
7. Espace Équipe de vérification
8. Espace Administrateur
9. Espace Client (boutique et vérification publique)
10. Anti-contrefaçon : comment ça marche
11. Référence des statuts
12. Problèmes fréquents et solutions
13. Organisation du projet (pour les développeurs)

---

## 1. Présentation de la plateforme

Kounouz Alafiya vérifie le miel de producteurs tunisiens avant de le vendre. Un miel n'est mis en vente qu'après un prélèvement scellé, une analyse en laboratoire agréé et une décision de l'équipe de vérification. Chaque pot reçoit ensuite un code QR unique que le client scanne pour voir l'origine, le lot et les résultats d'analyse.

### Les cinq espaces

| Espace | Pour qui | Adresse | Rôle principal |
|---|---|---|---|
| Producteur | Apiculteurs tunisiens | `/producteur` | Demander la vérification de son miel, suivre ses lots, ventes et gains |
| Agent terrain | Agents Kounouz sur le terrain | `/agent` | Prélever les échantillons chez le producteur, les sceller, suivre leur transport |
| Équipe de vérification | Équipe qualité Kounouz | `/verificateur` | Examiner les demandes, gérer échantillons, laboratoire, décision, lots, emballage, produits et QR |
| Administrateur | Direction Kounouz | `/admin` | Utilisateurs, producteurs, laboratoires, analyses, anti-contrefaçon, ventes, audit |
| Client | Grand public | `/` et `/verify/...` | Acheter en boutique, vérifier un produit par son QR |

### Le flux en un coup d'œil

```
PRODUCTEUR ── demande de vérification
      │
      ▼
REVUE KOUNOUZ ── accepter / demander un complément / refuser
      │
      ▼
ORGANISATION DE LA COLLECTE
      ├── Visite Kounouz (agent terrain)
      └── Dépôt par le producteur
      │
      ▼
ÉCHANTILLON REÇU ─► SCELLÉ SÉCURISÉ ─► CHAÎNE DE POSSESSION
      │
      ▼
ANALYSE EN LABORATOIRE + ÉCHANTILLON DE RÉFÉRENCE CONSERVÉ
      │
      ▼
DÉCISION DE L'ÉQUIPE DE VÉRIFICATION
      ├── VÉRIFIÉ ─► LOT VÉRIFIÉ ─► EMBALLAGE ─► PRODUIT + FORMATS (SKU)
      │                ─► GÉNÉRATION DES QR ─► MISE EN MARCHÉ
      │                ─► SCAN CLIENT ─► VÉRIFICATION PUBLIQUE
      │                ─► ANALYSE DES SCANS ─► ANTI-CONTREFAÇON
      └── NON VÉRIFIÉ ─► fin du parcours (le producteur est informé)
```

### Langues et devise

- L'interface existe en **arabe** (par défaut, de droite à gauche), **français** et **anglais**. On change de langue avec l'icône 🌐 en haut de page, ou dans **Paramètres**.
- Tous les prix sont en **dinars tunisiens** : « 35 د.ت » en arabe, « 35 DT » en français, « 35 TND » en anglais. Un prix non rond s'affiche avec ses millimes (89,900 DT).

---

## 2. Démarrer l'application

### Option A — Docker (tout en une commande)

Copiez la configuration puis renseignez les deux secrets JWT (la pile refuse de démarrer sans eux) :

```bash
cp .env.deploy.example .env
```

```bash
docker compose up -d --build
```

Cela démarre PostgreSQL, le backend et le site. Ports par défaut, modifiables dans `.env` si l'un est déjà pris :

| Service | Variable | Port par défaut |
|---|---|---|
| Site (nginx) | `FRONTEND_PORT` | 80 → http://localhost |
| API | `BACKEND_PORT` | 3000 → http://localhost:3000/api |
| PostgreSQL | `POSTGRES_PORT` | 5433 |

Détails du déploiement : `DOCUMENTATION.md`, section 19.

### Option B — En local (développement)

```bash
docker compose up -d postgres
```

```bash
npm install --prefix backend
```

```bash
npm install --prefix frontend
```

```bash
npm run prisma:deploy --prefix backend
```

```bash
npm run prisma:seed --prefix backend
```

Puis, dans deux terminaux séparés :

```bash
npm run start:dev --prefix backend
```

```bash
npm run dev --prefix frontend
```

| Adresse | Contenu |
|---|---|
| http://localhost:5173 | Site (boutique et espaces) |
| http://localhost:3000/api/v1 | API |
| http://localhost:3000/api/docs | Documentation de l'API (Swagger) |
| http://localhost:3000/health | État du backend |

> `prisma:deploy` applique les migrations sans toucher aux données. N'utilisez `prisma:migrate` (migrate dev) que sur une base jetable : sur une base existante, il peut exiger une remise à zéro.

### Réinitialiser les données de démonstration

```bash
npm run prisma:seed --prefix backend
```

Pour repartir d'une base entièrement vide (toutes les données sont effacées) :

```bash
npx prisma migrate reset --schema backend/prisma/schema.prisma
```

### Autres commandes utiles

```bash
npm run prisma:studio --prefix backend
```

```bash
npm test --prefix backend
```

---

## 3. Connexion, comptes et paramètres

### Se connecter

Tous les comptes utilisent la même page : **`/connexion`** (bouton « Se connecter » en haut de l'accueil). Après connexion, chaque compte arrive automatiquement dans son espace ; il n'y a pas de sélecteur de rôle.

### Comptes de démonstration

| Rôle | Email | Mot de passe | Arrive sur |
|---|---|---|---|
| Administrateur | `admin@kounouzalafiya.com` | `Admin123!` | `/admin` |
| Équipe de vérification | `verification@kounouzalafiya.com` | `Verif123!` | `/verificateur` |
| Agent terrain | `agent@kounouzalafiya.com` | `Agent123!` | `/agent` |
| Producteur | `producteur@kounouzalafiya.com` | `Prod123!` | `/producteur` |
| Producteur (2e) | `fatma.trabelsi@kounouzalafiya.com` | `Prod123!` | `/producteur` |
| Client | `client@kounouzalafiya.com` | `Client123!` | `/` (boutique) |

Codes QR de démonstration, testables sans connexion sur `/verify/<code>` :

| Code | Résultat affiché | Produit |
|---|---|---|
| `KZ-QR-2026-000001` | Produit vérifié | Miel de Sedra Premium 500g |
| `KZ-QR-2026-000002` | Produit suspendu | Miel de Fleurs Sauvages 250g |

> Changez tous ces mots de passe avant une mise en ligne réelle.

### Qui crée quels comptes

| Compte | Création |
|---|---|
| Client | Lui-même, sur `/inscription/client` |
| Producteur | Lui-même, sur `/inscription/producteur` (nom, rucher, emplacement), ou par l'administrateur depuis **Producteurs → Ajouter un producteur** |
| Équipe de vérification, Agent terrain, Administrateur | Uniquement par l'administrateur, dans **Utilisateurs & rôles → Ajouter un membre de l'équipe** |

Le mot de passe doit contenir **8 caractères minimum**. Quand l'administrateur crée un compte, il transmet un mot de passe provisoire que l'utilisateur change ensuite dans ses paramètres.

### Paramètres du compte

Chaque espace a une page **Paramètres** :

- **Informations du compte** : nom complet (l'e-mail n'y est pas modifiable).
- **Langue** : arabe, français ou anglais.
- **Notifications** : choisir les notifications reçues.
- **Sécurité et mot de passe** : changer son mot de passe (mot de passe actuel, puis le nouveau deux fois).

Le producteur dispose en plus, dans **Mon profil → Paramètres du compte**, du changement d'e-mail et de téléphone, de la suppression du compte et de l'**authentification à deux facteurs** (2FA). Une fois la 2FA activée, la connexion demande en plus un code à 6 chiffres généré par une application d'authentification (Google Authenticator, Microsoft Authenticator…). L'administrateur voit dans **Utilisateurs & rôles** quels comptes ont activé la 2FA.

### Notifications

La cloche 🔔 en haut de chaque espace affiche les notifications non lues (demande acceptée, collecte planifiée, échantillon reçu, analyse terminée, résultat de vérification, produit publié, nouvelle commande, règlement payé, alerte de contrefaçon…). Un clic ouvre l'élément concerné.

---

## 4. Le parcours d'un miel, étape par étape

Ce tableau résume qui fait quoi, et où, à chaque étape. Les sections 5 à 9 détaillent chaque écran.

| # | Étape | Qui | Où dans l'application | Statut de la demande après l'étape |
|---|---|---|---|---|
| 1 | Déposer ses documents obligatoires | Producteur | Mon profil → Documents | — |
| 2 | Créer et soumettre une demande | Producteur | Demandes de vérification → Nouvelle demande | Soumise |
| 3 | Examiner la demande | Équipe de vérification | Revue des demandes → Prendre en charge | En cours d'examen |
| 4 | Accepter / demander un complément / refuser | Équipe de vérification | Revue des demandes | Acceptée / Complément demandé / Refusée |
| 5a | Visite Kounouz : planifier la collecte | Équipe (Assigner un agent) ou agent (onglet Disponibles) | Revue des demandes / Mes missions | Collecte planifiée |
| 5b | Dépôt producteur : enregistrer l'échantillon reçu | Équipe de vérification | Gestion des échantillons → Enregistrer un échantillon | Échantillon collecté |
| 6 | Prélever, sceller, faire confirmer au producteur | Agent terrain | Collecte d'échantillon | Échantillon collecté |
| 7 | Remettre au transport, suivre le trajet | Agent terrain | Chaîne de possession → Mettre à jour la livraison | — |
| 8 | Réceptionner, sceller si besoin, conserver l'échantillon de référence | Équipe de vérification | Gestion des échantillons | — |
| 9 | Envoyer au laboratoire | Équipe de vérification | Gestion des échantillons → Envoyer au laboratoire | En analyse |
| 10 | Saisir les résultats et clôturer l'analyse | Équipe de vérification | Laboratoire | Vérification en attente |
| 11 | Prononcer la décision | Équipe de vérification | Décision de vérification | Vérifiée / Non vérifiée |
| 12 | Créer le lot vérifié | Équipe de vérification | Lots vérifiés → Créer un lot vérifié | — |
| 13 | Emballer le lot | Équipe de vérification | Emballage | — |
| 14 | Créer le produit et ses formats (SKU) | Équipe de vérification | Produits | — |
| 15 | Générer les QR codes | Équipe de vérification | QR codes | — |
| 16 | Mettre le produit en marché | Équipe de vérification | Produits → Mettre en marché | — (le produit est publié) |
| 17 | Acheter, scanner, vérifier | Client | Boutique, `/verify/<code>` | — |
| 18 | Surveiller les scans et les alertes | Administrateur | Analyses → Scans QR / Alertes anti-contrefaçon | — |

Chaque action importante est inscrite au **journal d'audit** (qui, quoi, quand, ancien et nouveau statut).

---

## 5. Espace Producteur

Adresse : **`/producteur`**. Menu : Tableau de bord, Mon profil, Demandes de vérification, Mes échantillons, Mes lots, Mes produits, Ventes & gains, Notifications, Paramètres. **Aide & support** se trouve en bas du menu et dans le menu du compte.

### 5.1 Tableau de bord

Vue d'ensemble de l'activité : indicateurs (demandes, lots, produits, ventes), aperçu des ventes sur la période choisie, unités vendues par conditionnement, dernières demandes, derniers lots, et des **actions rapides** (demander une vérification, voir les lots, gérer les produits, voir ventes et gains).

### 5.2 Mon profil

Onglets :

| Onglet | Contenu |
|---|---|
| Informations personnelles | Nom, téléphone, adresse, photo de profil |
| Exploitation | Nom de l'exploitation, gouvernorat, informations apicoles |
| Ruchers | Liste des ruchers (emplacement, nombre de ruches…). Une demande soumise est rattachée à un rucher |
| Documents | Pièces justificatives, examinées par Kounouz |
| Paramètres du compte | E-mail, téléphone, mot de passe, double authentification (2FA), suppression du compte |

**Documents obligatoires avant toute demande de vérification :**

- Carte d'identité (CIN), recto et verso ;
- Attestation d'immatriculation de l'exploitation.

Documents facultatifs : autorisation d'activité apicole, matricule fiscal, justificatif de domicile, autres (certificat bio, labels…).
Formats acceptés : **PDF, JPG, PNG**, 10 Mo maximum par fichier. Chaque document passe par l'état *En attente d'examen*, puis *Vérifié* ou *Refusé* (un document refusé doit être redéposé).

### 5.3 Demandes de vérification

La liste affiche toutes les demandes avec leur identifiant, type de miel, quantité, localisation, mode de collecte, date et statut. On peut rechercher, **continuer** ou **supprimer un brouillon**, et **suivre l'avancement** de chaque demande.

#### Créer une demande (assistant en 4 étapes)

Bouton **Nouvelle demande de vérification** :

1. **Demande de vérification** : confirmez vos informations et votre exploitation, choisissez le **mode de collecte souhaité**, vérifiez l'état de vos documents.
   - *Kounouz vient sur mon exploitation* : un agent se rend au rucher pour prélever et sceller l'échantillon.
   - *J'apporte l'échantillon à Kounouz* : vous le déposez selon les instructions de l'équipe.
   - Kounouz confirme le mode définitif lors de l'examen.
2. **Informations miel / lot** : type de miel, origine florale, quantité (kg), lieu de production, dates de récolte, nombre de ruches, description, photos.
3. **Vérifier & soumettre** : relisez puis soumettez. Vous pouvez aussi **enregistrer un brouillon** et le reprendre plus tard.
4. **En cours d'examen** : confirmation d'envoi.

À savoir :

- Vous n'avez **pas** à créer d'identifiant de lot : Kounouz l'attribue après la vérification.
- Une demande soumise **ne peut plus être modifiée ni supprimée** : elle est gérée par Kounouz.
- La soumission est refusée si les documents obligatoires manquent, si un champ obligatoire est vide (type de miel, quantité, lieu, mode de collecte), ou si la fin de récolte précède son début.
- Un compte producteur **suspendu** ou **refusé** ne peut pas soumettre de demande.

#### Suivre une demande

La page de détail affiche une frise de progression : *Soumise → Examen Kounouz → Collecte organisée → Échantillon & scellé → Analyse labo → Vérification → Vérifié → Lot & produit*. Elle montre aussi l'échantillon (avec un lien vers sa **chaîne de possession**) et, une fois vérifié, le **lot** créé.

#### Répondre à une demande de précision

Si Kounouz a besoin d'une information, la demande passe à *Complément demandé* et un encadré **« Kounouz a besoin d'une précision »** affiche la question. Écrivez votre réponse, complétez si besoin la quantité, le nombre de ruches, le rucher ou la description, puis **Envoyer ma réponse**. La demande repart en examen.

#### Résultat

- **Votre miel est Kounouz Vérifié ✓** : Kounouz crée le lot officiel, l'emballe et le met en vente.
- **Miel non vérifié** : le miel n'a pas passé la vérification (le commentaire de l'équipe est joint).
- **Demande non acceptée** : refusée avec un motif ; vous pouvez contacter le support ou soumettre une nouvelle demande.

### 5.4 Mes échantillons

Suivi de chaque échantillon : collecte, scellé, transport, réception, laboratoire, résultat d'analyse.

### 5.5 Mes lots

Lots officiels vérifiés que Kounouz a créés à partir de votre miel, avec leur statut (prêt à emballer, en emballage, emballé, produit créé, publié, suspendu, rappelé) et leur traçabilité.

### 5.6 Mes produits

Produits issus de vos lots : nom, formats en vente, prix, stock, statut, code QR.

### 5.7 Ventes & gains

| Sous-page | Contenu |
|---|---|
| Tableau des ventes | Chiffres clés et évolution des ventes |
| Historique | Chaque vente, avec son format (SKU), sa quantité et son montant |
| Gains | Montant brut, commission Kounouz, montant net |
| Règlements | Périodes de règlement mensuelles et leur statut de paiement |

Règles de calcul :

- Seules les commandes **livrées** comptent dans les gains.
- Kounouz prélève une **commission de 20 %** par défaut (réglable par l'administrateur via `KOUNOUZ_COMMISSION_RATE`).
- Une période de règlement couvre un mois de livraisons ; elle est **payée le 15 du mois suivant**. Une fois payée, ses montants sont figés.

### 5.8 Notifications, Paramètres, Aide & support

- **Notifications** : historique de toutes les notifications, avec « tout marquer comme lu ».
- **Paramètres** : voir la section 3.
- **Aide & support** : FAQ, formulaire de contact et **tickets de support** (création, suivi des réponses de Kounouz).

---

## 6. Espace Agent terrain

Adresse : **`/agent`**. Conçu pour le téléphone. Menu : Tableau de bord, Mes missions, Collecte d'échantillon, Enregistrement des scellés, Chaîne de possession, Mes visites, Rapports, Messages, plus Aide & support et Paramètres.

### 6.1 Tableau de bord

Activité du jour : missions du jour, terminées, en cours et à venir, missions en retard à reprogrammer, **tournée du jour** sur une carte, et le bouton **Nouvelle collecte**.

### 6.2 Mes missions

Onglets : **Aujourd'hui**, **À venir**, **À faire**, **Passées**, **Toutes**, **Disponibles**.

- Les missions confiées par l'équipe de vérification apparaissent automatiquement.
- L'onglet **Disponibles** liste les demandes acceptées qu'aucun agent n'a encore planifiées. **Planifier la visite → Ajouter à mes missions** les prend en charge ; le producteur est informé.
- La fiche mission montre le producteur, le lieu (carte), la date et le créneau, la priorité, la quantité attendue par échantillon, le nombre d'échantillons, les consignes et la **liste du matériel** à cocher.

### 6.3 Collecte d'échantillon (assistant en 5 étapes)

Depuis **Collecte d'échantillon**, reprenez une collecte en cours ou démarrez la prochaine :

1. **Mission** : résumé et matériel. Sur place, présentez-vous au producteur puis **Démarrer la collecte** (l'heure et votre position GPS sont enregistrées).
2. **Collecte** : type de miel, quantité prélevée (une quantité recommandée est indiquée), nombre d'échantillons, date et heure, **position GPS (obligatoire)**, notes et photos (échantillon, ruches, environnement). Si vous êtes loin de l'exploitation déclarée, un avertissement affiche la distance.
3. **Scellé** : posez un scellé sécurisé Kounouz. Deux possibilités :
   - *Scellé pré-imprimé* : recopiez exactement le numéro imprimé ;
   - *Générer un numéro* : Kounouz attribue un numéro unique (`KS-AAAA-XXXXXX`) à reporter sur l'étiquette.
   Prenez une **photo du scellé posé** (numéro lisible) et cochez l'attestation d'intégrité, puis **Enregistrer le scellé**.
4. **Confirmation** : vérifiez le récapitulatif avec le producteur, qui confirme que l'échantillon a été prélevé et scellé en sa présence. **Confirmer et clôturer**.
5. **Terminé** : la chaîne de possession commence. Étape suivante : remettre l'échantillon au transport.

Règles : la date ne peut pas être dans le futur, la quantité doit être supérieure à 0, et l'échantillon comme son scellé doivent être enregistrés avant la confirmation.

### 6.4 Enregistrement des scellés

Liste des scellés posés et des échantillons qui attendent encore leur scellé. Un échantillon ne doit **jamais quitter l'exploitation sans scellé**.

### 6.5 Chaîne de possession

Onglets : **Sous ma garde**, **Livrés**, **Anomalies**, **Tous**. La fiche d'un échantillon montre son statut actuel, sa position (carte, position en direct) et la **chronologie** complète.

Bouton **Mettre à jour la livraison** :

| Événement | Quand l'utiliser |
|---|---|
| Remise au transport | L'échantillon scellé est confié à un transporteur : indiquez son nom et joignez une photo de la remise |
| En transit | L'échantillon est parti vers Kounouz |
| Point de passage | Enregistrer une position intermédiaire (met à jour la position en direct) |
| Anomalie | Casse, scellé rompu, retard… L'équipe de vérification la voit immédiatement |

Laissez « Détenteur actuel » vide si vous transportez vous-même l'échantillon. Vous pouvez joindre votre position GPS et une photo de preuve.

### 6.6 Mes visites, Rapports, Messages

- **Mes visites** : historique des exploitations visitées et des échantillons prélevés.
- **Rapports** : votre activité sur la période choisie (missions, échantillons collectés et scellés, taux de ponctualité, durée moyenne d'une visite, quantité prélevée, anomalies), par mois, type de miel et lieu. Imprimable.
- **Messages** : échanges et notifications de l'équipe Kounouz.

---

## 7. Espace Équipe de vérification

Adresse : **`/verificateur`**, accessible à l'équipe de vérification et à l'administrateur (lien **Portail vérification** dans le menu du compte admin).

Menu : Tableau de bord, Centre de vérification, Revue des demandes, Gestion des échantillons, Laboratoire, Échantillons de référence, Décision de vérification, Lots vérifiés, Emballage, Produits, QR codes, Rapports, Gestion de l'équipe (administrateur seulement), Paramètres, Aide.

### 7.1 Tableau de bord et Centre de vérification

- **Tableau de bord** : ce qui attend une action aujourd'hui : demandes à instruire, échantillons à réceptionner, analyses en cours, décisions en attente, et échantillons signalés en anomalie.
- **Centre de vérification** : toutes les demandes des producteurs, avec filtres, recherche et progression de chaque dossier.

### 7.2 Revue des demandes

Sélectionnez une demande pour l'instruire : informations producteur et lot, photos, documents, échantillons rattachés, historique. Le **fil interne** (commentaires) n'est jamais visible par le producteur.

| Action | Effet |
|---|---|
| **Prendre en charge** | La demande passe *En cours d'examen* et vous est attribuée |
| **Demander un complément** | Message obligatoire, envoyé au producteur ; la demande attend sa réponse |
| **Accepter** | La demande est acceptée ; la collecte doit être organisée |
| **Refuser** | Motif obligatoire, envoyé au producteur et conservé au dossier |

**Organiser la collecte (visite Kounouz)** : dans le panneau **Visite de collecte**, **Assigner un agent** : choisissez l'agent (son nombre de missions actives est affiché), la date, le créneau, la priorité (basse, normale, haute, urgente), la quantité par échantillon, le nombre d'échantillons, des consignes et des notes. **Annuler la visite** est possible tant qu'aucun prélèvement n'a eu lieu. Les agents peuvent aussi prendre eux-mêmes une collecte depuis leur onglet *Disponibles*.

**Dépôt producteur** : pas d'agent. À la réception, enregistrez l'échantillon dans **Gestion des échantillons** (section suivante).

### 7.3 Gestion des échantillons

Onglets : **Collectés**, **Réceptionnés**, **Au laboratoire**, **Analyse terminée**, **Anomalies**.

| Action | Quand | Remarque |
|---|---|---|
| **Enregistrer un échantillon** | Dépôt par le producteur | Choisissez une demande acceptée ; le lieu par défaut est celui de la demande |
| **Marquer comme réceptionné** | L'échantillon arrive chez Kounouz | Possible pour un échantillon collecté, scellé ou en transit |
| **Apposer le scellé** | Échantillon sans scellé | Uniquement à la collecte ou à la réception, jamais après le départ au laboratoire |
| **Enregistrer l'échantillon de référence** | Avant la décision | Voir ci-dessous |
| **Envoyer au laboratoire** | Échantillon réceptionné | La demande passe *En analyse* |
| **Signaler une anomalie** | Scellé compromis, volume insuffisant, rupture de la chaîne du froid… | Motif obligatoire |

**Échantillon de référence (portion conservée)** : Kounouz garde une portion de chaque échantillon. Renseignez le lieu de conservation (ex. « Chambre froide B, étagère 3 »), les conditions (ex. « 4 °C, à l'abri de la lumière »), la durée de conservation et l'état. Conditions : l'échantillon doit porter un scellé et ne pas être en anomalie. Cette portion est **obligatoire avant toute décision VÉRIFIÉ**. Son état peut ensuite passer à *Utilisé en contre-analyse* ou *Détruit* (motif obligatoire, inscrit au journal d'audit). C'est une donnée interne, jamais affichée publiquement.

### 7.4 Laboratoire

1. Sélectionnez un échantillon dans la **file du laboratoire**.
2. **Ouvrir un dossier d'analyse** : choisissez le laboratoire partenaire.
3. Saisissez la valeur de chaque paramètre ; la **conformité est calculée automatiquement** :

| Paramètre | Limite de conformité |
|---|---|
| Taux d'humidité | ≤ 20 % |
| HMF | ≤ 40 mg/kg |
| Indice diastasique | ≥ 8 DN |
| Conductivité électrique | ≤ 0,8 mS/cm |
| pH | entre 3,4 et 4,5 |
| Acidité libre | ≤ 50 meq/kg |
| Profil des sucres | appréciation qualitative |
| Analyse pollinique | appréciation qualitative |
| Antibiotiques | absence requise (non détecté) |

4. Joignez les fichiers (bulletin du laboratoire, etc.) avec **Ajouter un fichier**.
5. **Clôturer l'analyse** : le bulletin est verrouillé et le dossier passe en attente de décision.

Le panneau **Analyses antérieures** montre les analyses passées du même producteur sur ce type de miel. Les **notes internes** ne sont visibles que par l'équipe.

### 7.5 Échantillons de référence (étalons)

Attention à ne pas confondre avec la portion conservée de la section 7.3. Ce menu est la **bibliothèque des miels étalons** qui servent de comparaison qualité : type de miel, région, saison, source florale (nom botanique), résultats d'analyse, photos. **Ajouter un étalon**, **Modifier**, **Activer / Désactiver** ; des statistiques les regroupent par type de miel, région et saison.

### 7.6 Décision de vérification

La **file** liste les dossiers dont l'analyse est clôturée. **Examiner** ouvre le dossier :

- **Pièces du dossier** : pour pouvoir approuver, toutes ces pièces doivent être présentes :
  - échantillon contrôlé ;
  - scellé Kounouz intact ;
  - chaîne de possession jusqu'au laboratoire ;
  - bulletin de laboratoire clôturé ;
  - paramètres conformes ;
  - échantillon de référence conservé.
- **Évaluation qualité** selon les critères : authenticité, paramètres physico-chimiques, analyse pollinique, résidus d'antibiotiques, appréciation globale.
- **Décision finale** :

| Décision | Effet |
|---|---|
| **Approuver** | Dossier *Vérifié* ; le lot peut être créé. Impossible si l'analyse n'est pas conforme ou si une pièce manque |
| **Refuser** | Dossier *Non vérifié* ; commentaire obligatoire |
| **Demander une analyse complémentaire** | Le dossier retourne au laboratoire ; commentaire obligatoire |

**Enregistrer le brouillon** permet de reprendre plus tard. **Confirmer la décision** la rend **définitive** : elle ne peut plus être modifiée. Le producteur est notifié.

### 7.7 Lots vérifiés

**Créer un lot vérifié** à partir d'une décision *Vérifié* (un seul lot par vérification) : quantité (kg), date de production, origine, saison de récolte, date d'expiration, date de durabilité minimale, notes. Le lot reçoit un code `KZ-BAT-AAAA-NNN` et le statut *Prêt pour l'emballage*.

La fiche du lot montre la **chaîne complète** (décision → emballage → produit → QR → mise en marché) et sa chronologie. Actions :

- **Suspendre / rappeler** : motif interne obligatoire. Un lot *suspendu* s'affiche « Produit temporairement suspendu » sur la page publique ; un lot *rappelé* s'affiche « Produit rappelé — ne consommez pas ce produit ». Le rappel est définitif.
- **Lever la suspension** : le lot reprend son étape précédente.
- **Imprimer le rapport du lot**.

### 7.8 Emballage

1. Choisissez un lot prêt pour l'emballage et **ouvrez l'emballage** (type d'emballage).
2. **Ajouter une unité** pour chaque format réellement conditionné : format (ex. 250 g, 500 g, 1 kg), quantité de pots, date de conditionnement, date d'expiration. Marquez chaque unité comme terminée.
3. **Finaliser l'emballage** : au moins une unité doit être conditionnée. Après finalisation, les unités ne sont plus modifiables.

### 7.9 Produits

La file **Lots emballés** liste les lots prêts à devenir des produits. **Créer le produit** :

- nom, catégorie, gamme, description, ingrédients, conditions de conservation, durée de conservation, poids net, étiquettes ;
- **images** (JPG, PNG ou WebP, 10 Mo max) et **documents produit** ;
- **Formats vendus (SKU)** : un SKU par format de pot emballé, chacun avec son **prix en DT** et son **stock**. Le prix « à partir de » et le stock total sont calculés automatiquement. Un format peut être **retiré** de la vente puis **réactivé**.

Le produit reste en brouillon tant qu'il n'est pas mis en marché (voir 7.11).

### 7.10 QR codes

**Génération** (menu QR codes) :

1. Sélectionnez un produit.
2. Réglez les paramètres : type (vérification produit publique, suivi de lot, usage interne), format (**dynamique**, qui suit le statut réel du lot, ou statique), modèle (Kounouz Standard, Premium, Minimal), langue (multilingue AR/FR/EN, ou une seule langue), options (numéro de lot, éléments de sécurité, numéro de série, suivi des scans).
3. Indiquez le **nombre de codes** : il est plafonné au nombre de pots conditionnés non encore codés, et à 10 000 par campagne. Aucun code ne peut être généré pour un lot rappelé.
4. **Générer les QR codes**, puis **Exporter les codes (CSV)** pour l'impression.

Chaque code a un **code lisible** (`KZ-QR-AAAA-NNNNNN`, imprimé sous le QR, saisissable à la main) et un **identifiant technique** encodé dans l'image. Les deux mènent à la même page de vérification.

**Gestion des QR** (`/verificateur/qr/gestion`) : recherche par code, n° de série, produit ou lot ; détail, historique des scans, **désactiver / réactiver**, désactivation groupée. Un code désactivé répond « produit introuvable » au public.

> Ne désactivez pas un code déjà posé sur un pot : suspendez ou rappelez plutôt le lot. Un code désactivé qui est scanné déclenche une alerte « étiquette altérée ».

### 7.11 Mise en marché

Sur la fiche produit, **Mettre en marché** publie le produit dans la boutique. Conditions : le produit est rattaché à un lot vérifié, ce lot n'est ni suspendu ni rappelé, le produit n'est pas archivé, et **ses QR codes ont été générés**. Le producteur reçoit la notification « Produit publié ». **Voir la page publique** ouvre la page de vérification du produit.

### 7.12 Rapports et gestion de l'équipe

- **Rapports** : activité des opérations et résultats par producteur (export CSV), statistiques anti-fraude.
- **Gestion de l'équipe** (administrateur seulement) : créer des comptes équipe et agents, les activer ou les désactiver.

---

## 8. Espace Administrateur

Adresse : **`/admin`**. L'administrateur pilote la plateforme. Le travail quotidien de vérification se fait dans l'espace Équipe de vérification (section 7), que l'administrateur ouvre avec **Portail vérification** dans le menu de son compte.

Menu : Tableau de bord, Utilisateurs & rôles, Producteurs, Laboratoires, Demandes, Échantillons, Scellés, Lots vérifiés, Produits, Catégories, Emballage, QR codes, Vérification, Analyses (Scans QR, Alertes anti-contrefaçon, Vérification & activité), Ventes (Commandes, Règlements producteurs), Rapports, Journal d'audit, Support, Paramètres, Aide. Une **recherche globale** en haut de page (2 caractères minimum) trouve producteurs, utilisateurs, lots, produits, QR codes, laboratoires et alertes.

### 8.1 Tableau de bord

Vue d'ensemble : scans dans le temps, statuts de vérification, état des QR codes, activité récente, lieux de scan, régions et produits les plus actifs, alertes ouvertes, état du système.

### 8.2 Utilisateurs & rôles

Onglets par rôle : Tous, Producteurs, Équipe de vérification, Agents terrain, Administrateurs, Clients. On y voit la dernière connexion et l'état de la 2FA.

- **Ajouter un membre de l'équipe** : nom, e-mail, rôle (équipe de vérification, agent terrain ou administrateur), mot de passe provisoire (8 caractères minimum).
- **Modifier**, **activer / désactiver** un compte, **réinitialiser** le mot de passe.
- Les producteurs se créent depuis la page **Producteurs** et les clients s'inscrivent eux-mêmes. Un administrateur ne peut pas modifier son propre rôle.

### 8.3 Producteurs

Indicateurs (actifs, en attente, nouveaux, délai moyen de vérification), répartition par région, liste filtrable par type de miel et par statut de vérification, export CSV.

- **Ajouter un producteur** : nom, nom du rucher, gouvernorat, e-mail, mot de passe provisoire.
- **Changer le statut** : *Actif*, *En attente*, *Suspendu*, *Refusé*. Chaque changement est inscrit au journal d'audit. Un producteur suspendu ou refusé ne peut plus soumettre de demande.
- **Fiche producteur** : informations, demandes, et **examen des documents** (valider ou refuser chaque pièce).

### 8.4 Laboratoires

Laboratoires partenaires : informations, **accréditations** (ISO 17025, TUNAC…, avec date d'expiration), statut (*Actif*, *En attente d'approbation*, *Suspendu*), statistiques d'analyses. Seul un laboratoire actif peut recevoir des analyses.

### 8.5 Traçabilité et catalogue

Les pages **Demandes, Échantillons, Scellés, Lots vérifiés, Emballage, Produits, QR codes et Vérification** donnent une vue de contrôle sur toute la chaîne (listes, fiches détaillées, historiques).

**Catégories** : créer, modifier et supprimer les catégories et sous-catégories de la boutique (ex. Miels › Miel de Jujubier (Sedra)).

### 8.6 Analyses

| Page | Contenu |
|---|---|
| **Analyse des scans QR** | Scans dans le temps, valides / suspects / invalides, par appareil, pays et région, produits et lots les plus scannés, derniers scans, export |
| **Alertes anti-contrefaçon** | Toutes les alertes, par type : doublons suspectés, lieux inhabituels, QR invalides, étiquettes altérées, scans en masse (voir section 10) |
| **Vérification & activité** | Scans comparés aux ventes, entonnoir de vérification, meilleurs produits et producteurs, origines, vérifications récentes, export du rapport |

**Traiter une alerte** : ouvrez-la pour voir le code (ou « code inconnu, non émis par Kounouz »), le lot, l'appareil, l'adresse IP, le nombre de scans, les derniers scans et les autres alertes sur ce code. Changez son statut (*Ouverte → En enquête → Confirmée / Résolue / Écartée*) et ajoutez une **note d'enquête**.

### 8.7 Ventes

**Commandes** : chaque commande passée dans la boutique.

| Statut actuel | Actions possibles |
|---|---|
| En attente | Confirmer, Annuler |
| Confirmée | Marquer expédiée, Annuler |
| Expédiée | Marquer livrée, Annuler |
| Livrée / Annulée | Aucune (statut final) |

Annuler une commande **remet le stock** des produits. Seules les commandes **livrées** comptent dans les gains des producteurs.

**Règlements producteurs** : périodes mensuelles clôturées à payer, par producteur (brut, commission, net). **Marquer comme payé** fige la période et notifie le producteur. Échéance : le 15 du mois suivant.

### 8.8 Rapports, Journal d'audit, Support

- **Rapports** : opérations et résultats par producteur (export CSV), statistiques anti-fraude.
- **Journal d'audit** : toutes les actions des utilisateurs (connexions, décisions, changements de statut, modifications), filtrables par module, action, utilisateur et entité, avec le détail avant / après.
- **Support** : boîte de réception des tickets de support et des messages du formulaire de contact. Répondez et changez le statut (*Ouvert → En cours → Résolu → Fermé*).

---

## 9. Espace Client (boutique et vérification publique)

### 9.1 La page d'accueil

Sections : présentation (miel tunisien vérifié en laboratoire), quatre garanties, produits vérifiés avec leur prix en dinars, le **parcours de confiance** en six étapes, la vérification d'un produit, le terroir tunisien et les régions des ruchers, l'histoire de Kounouz (avec un lien d'inscription pour les apiculteurs), les articles, et une FAQ.

### 9.2 Acheter

1. **Boutique** : parcourez les produits par catégorie et recherchez par nom ou type.
2. **Fiche produit** : description, origine, numéro de lot, **choix du format** (chaque format a son prix et son stock ; « Épuisé » s'il n'y en a plus), quantité, **Ajouter au panier**.
3. **Panier** (icône 🛍) : modifiez les quantités ; le sous-total, les frais de livraison et le total s'affichent en dinars.
4. **Commander** : nom complet, téléphone, e-mail (facultatif), ville, adresse de livraison, puis **Confirmer la commande**. Un numéro de commande s'affiche.

Le serveur revérifie le prix, le stock et la disponibilité de chaque produit au moment de la commande. Une commande envoyée deux fois (double clic, réseau lent) n'est enregistrée qu'une fois.

Un **compte client** (facultatif, `/inscription/client`) donne accès à « Mon compte » : historique des commandes, aide et paramètres.

### 9.3 Vérifier un produit

Trois façons :

- **Scanner le QR** du pot avec l'appareil photo du téléphone : la page de vérification s'ouvre directement.
- Saisir le **code imprimé sous le QR** (ex. `KZ-QR-2026-000001`) dans la section de vérification de l'accueil ou sur la page **Vérifier un produit**.
- Ouvrir directement `/verify/<code>`.

| Résultat affiché | Signification | Que faire |
|---|---|---|
| **Produit vérifié ✅** | Analysé en laboratoire et approuvé par Kounouz | Consultez l'origine, le rucher, le lot et les résultats d'analyse (section dépliable) |
| **Produit temporairement suspendu ⏸️** | Momentanément retiré de la vente | Contactez le point de vente ou Kounouz |
| **Produit rappelé** | Lot rappelé par Kounouz | **Ne consommez pas le produit** ; contactez le point de vente |
| **Ce produit est introuvable** | Code inconnu ou désactivé | Vérifiez le code ; en cas de doute, c'est peut-être une contrefaçon : contactez Kounouz |

**Signaler une étiquette** : sur la page d'un produit, **« Étiquette abîmée ou douteuse ? Signalez-la »**. Choisissez le motif (opercule ou étiquette abîmé, étiquette qui ne correspond pas à la page, aspect ou goût suspect, autre), ajoutez un commentaire (où l'avez-vous acheté ?) et envoyez. Le signalement crée une alerte pour l'équipe anti-contrefaçon.

---

## 10. Anti-contrefaçon : comment ça marche

Chaque scan (y compris d'un code inconnu) est enregistré : date, pays, région, appareil. Le module anti-fraude calcule un **score de risque** ; un scan est marqué *suspect* dès que le score atteint 0,5 ou qu'une règle se déclenche. Une alerte est alors créée, ou fusionnée avec l'alerte ouverte sur le même code dans les 24 heures.

| Règle | Déclencheur | Type d'alerte | Gravité |
|---|---|---|---|
| Code inconnu ou désactivé saisi | Le code n'existe pas ou n'est plus actif | QR invalide | Haute |
| Scans rapprochés | 5 scans ou plus en 10 minutes, depuis au moins 2 appareils | Doublon suspecté | Haute |
| Trop d'appareils | 8 appareils différents ou plus en 7 jours sur le même code | Doublon suspecté | Moyenne |
| Plusieurs pays | Scans depuis 2 pays ou plus en 1 heure (haute) ou en 24 heures (moyenne) | Lieu inhabituel | Haute / Moyenne |
| Volume élevé | 20 scans ou plus en 24 heures sur le même code | Scans en masse | Moyenne |
| Balayage de codes | Le même appareil scanne 10 codes différents ou plus en 5 minutes | Scans en masse | Haute |
| Code désactivé en circulation | Scan d'un code qui n'a jamais été mis en circulation | Étiquette altérée | Haute |
| Signalement client | Un client signale une étiquette | Étiquette altérée | Haute |

Les alertes se traitent dans **Admin → Analyses → Alertes anti-contrefaçon** (section 8.6). La page publique limite aussi le nombre de requêtes par adresse IP pour empêcher l'énumération des codes.

---

## 11. Référence des statuts

### Demande de vérification

| Statut | Signification |
|---|---|
| Brouillon | Enregistrée par le producteur, pas encore envoyée |
| Soumise | Envoyée à Kounouz |
| En cours d'examen | Prise en charge par l'équipe |
| Complément demandé | En attente de la réponse du producteur |
| Acceptée | Acceptée, collecte à organiser |
| Collecte planifiée | Visite d'agent programmée |
| Échantillon collecté | Échantillon prélevé ou déposé |
| En analyse | Échantillon au laboratoire |
| Vérification en attente | Analyse clôturée, décision à prendre |
| Vérifiée | Miel approuvé |
| Non vérifiée | Miel non approuvé |
| Refusée | Demande refusée à l'examen |

### Échantillon

Collecté → Scellé → En transit → Reçu → Au laboratoire → Analysé. Statut particulier : *Anomalie*.

### Lot

Prêt pour l'emballage → En emballage → Emballé → Produit créé → Publié. Statuts particuliers : *Suspendu*, *Rappelé*.

### Produit

Brouillon → Publié. Autres statuts : *Rupture* (stock épuisé), *Suspendu*, *Archivé* (retiré du catalogue, historique conservé).

### Commande

En attente → Confirmée → Expédiée → Livrée. Possible à tout moment avant la livraison : *Annulée*.

---

## 12. Problèmes fréquents et solutions

| Problème | Cause | Solution |
|---|---|---|
| Le producteur ne peut pas soumettre sa demande | Documents obligatoires manquants ou refusés | Déposer la CIN et l'attestation d'immatriculation dans **Mon profil → Documents** |
| « Votre compte producteur ne permet pas de soumettre de demande » | Compte suspendu ou refusé | L'administrateur réactive le producteur (**Producteurs**) |
| La demande n'apparaît pas dans *Disponibles* chez l'agent | Elle n'est pas encore acceptée, a déjà une mission, ou est en dépôt producteur | Accepter la demande dans **Revue des demandes** ; vérifier le mode de collecte |
| L'agent ne peut pas enregistrer la collecte | Position GPS manquante, date future ou quantité nulle | Autoriser la localisation sur le téléphone et corriger les champs |
| Impossible d'enregistrer l'échantillon de référence | Échantillon sans scellé ou en anomalie | Apposer le scellé d'abord ; traiter l'anomalie |
| « Approuver » est bloqué | Analyse non conforme ou pièce manquante | Compléter les pièces listées dans **Pièces du dossier** |
| Impossible de créer le produit | Emballage du lot non finalisé | **Emballage → Finaliser l'emballage** |
| Génération de QR refusée | Plus de codes demandés que de pots conditionnés, ou lot rappelé | Réduire le nombre, ou ajouter des unités d'emballage avant finalisation |
| « Mettre en marché » refusé | QR non générés, ou lot suspendu / rappelé | Générer les QR ; lever la suspension |
| Un code valide affiche « introuvable » | Le QR a été désactivé | Le réactiver dans **Gestion des QR** |
| Le site ne démarre pas (port occupé) | Port 80, 3000, 5173 ou 5433 déjà utilisé | Changer `FRONTEND_PORT` / `BACKEND_PORT` / `POSTGRES_PORT` dans `.env` |
| `prisma migrate dev` demande de tout effacer | Historique de migrations modifié | Utiliser `npm run prisma:deploy --prefix backend` |

---

## 13. Organisation du projet (pour les développeurs)

```
kounouz-affia/
├── backend/                       # API NestJS + Prisma (PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma          # Modèle de données (chaîne de traçabilité)
│   │   ├── migrations/            # Migrations SQL
│   │   └── seed.ts                # Données et comptes de démonstration
│   └── src/
│       ├── auth/                  # Connexion, JWT, 2FA, rôles
│       ├── producers/, producer-documents/
│       ├── verification-requests/ # Demandes côté producteur
│       ├── field-agent/           # Missions, collecte, chaîne de possession
│       ├── verification-portal/   # Portail de l'équipe de vérification
│       ├── samples/, seals/, laboratory/, verifications/
│       ├── batches/, packaging/, products/, categories/
│       ├── qr-codes/              # QR, page de vérification publique
│       ├── anti-fraud/            # Score de risque, alertes
│       ├── sales/                 # Commandes, ventes, règlements
│       ├── admin/                 # Console d'administration
│       ├── events/                # Événements métier et automatisations
│       └── notifications/, support/, reports/, audit/
└── frontend/                      # React + Vite + TypeScript + Tailwind
    └── src/
        ├── App.tsx                # Vitrine publique (boutique, accueil)
        ├── AppRouter.tsx          # Toutes les routes
        ├── components/            # Sections de l'accueil et de la boutique
        ├── pages/                 # Connexion, inscriptions, guide, vérification publique
        ├── portals/
        │   ├── producer/          # Espace Producteur
        │   ├── agent/             # Espace Agent terrain
        │   ├── verifier/          # Espace Équipe de vérification
        │   └── admin/             # Espace Administrateur
        ├── lib/                   # Client API, authentification, prix en DT
        └── i18n/locales/          # Traductions ar / fr / en
```

| Je cherche… | Fichier |
|---|---|
| Les routes de l'application | `frontend/src/AppRouter.tsx` |
| La redirection par rôle après connexion | `frontend/src/lib/role-routing.ts` |
| Le format des prix en dinars | `frontend/src/lib/format-price.ts` |
| Le téléphone et l'e-mail affichés sur le site | `frontend/src/lib/site-contact.ts` |
| Les textes de l'interface | `frontend/src/i18n/locales/{ar,fr,en}/` |
| Les règles de décision (pièces obligatoires) | `backend/src/verification-portal/portal-decisions.service.ts` |
| Les paramètres et limites du laboratoire | `backend/src/verification-portal/lab-parameters.ts` |
| Les règles anti-contrefaçon | `backend/src/anti-fraud/anti-fraud.service.ts` |
| Les commandes et règlements | `backend/src/sales/sales.service.ts` |
| Le modèle de données | `backend/prisma/schema.prisma` |

Une version courte de ce guide, rôle par rôle, est aussi disponible dans l'application : **`/guide`** (lien dans le pied de page).

Pour régénérer la version PDF de ce guide (`docs/GUIDE_UTILISATION.pdf`) après modification :

```bash
python scripts/md-to-pdf.py --out-dir docs GUIDE_UTILISATION.md
```
