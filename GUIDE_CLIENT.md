# Kounouz Alafiya — Guide de découverte

**Plateforme de traçabilité et de vérification du miel tunisien**

Version 1.0 · Septembre 2026

---

## Sommaire

1. [Ce que fait la plateforme](#1-ce-que-fait-la-plateforme)
2. [Accéder à la démonstration](#2-accéder-à-la-démonstration)
3. [Découvrir en quinze minutes](#3-découvrir-en-quinze-minutes)
4. [Vérifier un pot de miel](#4-vérifier-un-pot-de-miel)
5. [Les cinq espaces de travail](#5-les-cinq-espaces-de-travail)
6. [Le parcours d'un miel, du rucher au pot](#6-le-parcours-dun-miel-du-rucher-au-pot)
7. [Bon à savoir pendant la démonstration](#7-bon-à-savoir-pendant-la-démonstration)
8. [Questions fréquentes](#8-questions-fréquentes)

---

## 1. Ce que fait la plateforme

Kounouz Alafiya répond à une question simple que se pose l'acheteur devant un pot de miel :
**comment savoir s'il est authentique ?**

La réponse tient en une règle : **aucun miel n'est mis en vente sans preuve.** Avant qu'un pot
n'arrive en rayon, son miel a été prélevé chez l'apiculteur, scellé, analysé dans un laboratoire
agréé, puis approuvé par l'équipe qualité de Kounouz. Chaque pot reçoit alors un code QR unique.

Le client scanne ce code et voit, en quelques secondes : l'origine du miel, le nom du rucher, la
région, le numéro de lot et les résultats de l'analyse.

La plateforme couvre l'ensemble de cette chaîne — de la demande de l'apiculteur jusqu'au scan du
consommateur — et conserve la trace de chaque étape.

### Ce qui distingue cette approche

| | |
|---|---|
| **Preuve, pas promesse** | Chaque affirmation portée par un pot est adossée à une analyse de laboratoire enregistrée dans le système. |
| **Traçabilité continue** | Du prélèvement au scan, chaque étape est datée et signée. Rien ne se perd entre deux intervenants. |
| **Échantillon de référence** | Une part de chaque lot analysé est conservée par Kounouz. En cas de contestation, une contre-analyse reste possible. |
| **Détection des contrefaçons** | Les scans sont analysés : un code scanné trop souvent, ou depuis des lieux incohérents, déclenche une alerte. |
| **Producteurs identifiés** | Chaque miel est rattaché à un apiculteur connu, avec son dossier et sa région. |

---

## 2. Accéder à la démonstration

### Le site

**https://kounouz-alafiya.vercel.app**

Le site s'ouvre dans n'importe quel navigateur, sur ordinateur comme sur téléphone. Rien à
installer. L'interface est en **arabe** par défaut ; le bouton 🌐 en haut de page bascule en
**français** ou en **anglais**. Les prix sont en dinars tunisiens.

> **Premier chargement un peu lent ?** C'est normal, et cela n'arrive qu'une fois. L'hébergement
> de démonstration met le serveur en veille après une période d'inactivité ; le réveil prend
> jusqu'à une minute. Les pages suivantes s'affichent normalement.

### Les comptes de démonstration

Chaque métier dispose de son espace. Connectez-vous avec l'un de ces comptes pour le découvrir :

| Espace | Identifiant | Mot de passe |
|---|---|---|
| **Administrateur** | `admin@kounouzalafiya.com` | `Admin123!` |
| **Équipe de vérification** | `verification@kounouzalafiya.com` | `Verif123!` |
| **Agent terrain** | `agent@kounouzalafiya.com` | `Agent123!` |
| **Producteur** | `producteur@kounouzalafiya.com` | `Prod123!` |
| **Client** | `client@kounouzalafiya.com` | `Client123!` |

Après connexion, chaque compte arrive directement sur son espace de travail.

---

## 3. Découvrir en quinze minutes

Si vous n'avez qu'un quart d'heure, suivez ce parcours : il traverse toute la chaîne, du pot dans
la main du consommateur jusqu'au pilotage de la direction.

### Étape 1 — Le point de vue du client (3 minutes)

Ouvrez **https://kounouz-alafiya.vercel.app** sans vous connecter.

Faites défiler la page d'accueil : les produits vérifiés et leurs prix, le parcours de confiance
en six étapes, les régions des ruchers.

Puis, dans la section de vérification, saisissez ce code :

```
KZ-QR-2026-000001
```

C'est exactement ce que voit un consommateur qui scanne un pot : **produit vérifié**, avec son
rucher, sa région, son lot et ses résultats d'analyse.

Essayez ensuite `KZ-QR-2026-000002` : ce produit est **suspendu**. La plateforme sait retirer un
lot de la circulation, et le dit au consommateur.

### Étape 2 — Le producteur qui demande une vérification (3 minutes)

Connectez-vous avec le compte **Producteur**.

Regardez son tableau de bord, puis **Demandes de vérification** : ses dossiers en cours et leur
avancement. Ouvrez-en un pour suivre son parcours étape par étape.

Passez ensuite sur **Ventes & gains** : le producteur suit ce que son miel a rapporté et les
règlements qui lui sont dus.

### Étape 3 — L'équipe qui vérifie (5 minutes)

Connectez-vous avec le compte **Équipe de vérification**. C'est le cœur du métier.

Le **tableau de bord** montre ce qui attend une décision aujourd'hui. Parcourez ensuite le menu
dans l'ordre — il suit le cheminement réel d'un dossier :

**Revue des demandes** → **Gestion des échantillons** → **Laboratoire** → **Décision de
vérification** → **Lots vérifiés** → **Emballage** → **Produits** → **QR codes**

Arrêtez-vous sur **Laboratoire** : c'est là que les résultats d'analyse sont saisis et que se
décide la suite. Puis sur **QR codes** : c'est là que naissent les codes imprimés sur les pots.

### Étape 4 — La direction qui pilote (4 minutes)

Connectez-vous avec le compte **Administrateur**.

Le tableau de bord rassemble l'activité : scans dans le temps, lieux de scan, régions actives,
alertes ouvertes.

Deux écrans méritent l'attention :

- **Analyses → Alertes anti-contrefaçon** : les codes au comportement suspect et les
  signalements envoyés par les consommateurs.
- **Journal d'audit** : qui a fait quoi, quand, avec l'ancien et le nouveau statut. Chaque
  décision est traçable.
- **Ventes → Commission** : le pourcentage que Kounouz prélève sur chaque vente — **20 % par
  défaut**, modifiable ici, avec un simulateur et l'historique des changements.
- **Blog** : les articles du site, rédigés, publiés ou retirés directement depuis la console.

---

## 4. Vérifier un pot de miel

C'est la fonction que verra le grand public. Elle fonctionne de trois façons :

1. **Scanner le QR** imprimé sur le pot avec l'appareil photo du téléphone — la page s'ouvre
   directement, sans passer par le site.
2. **Saisir le code** imprimé sous le QR (par exemple `KZ-QR-2026-000001`) dans la section de
   vérification de la page d'accueil.
3. **Ouvrir l'adresse** `…/verify/KZ-QR-2026-000001`.

### Ce que voit le consommateur

| Résultat | Signification | Ce qu'il doit faire |
|---|---|---|
| **Produit vérifié** ✅ | Analysé en laboratoire et approuvé par Kounouz | Consulter l'origine, le rucher, le lot et les résultats d'analyse |
| **Produit suspendu** ⏸️ | Momentanément retiré de la vente | Contacter le point de vente ou Kounouz |
| **Produit rappelé** ⚠️ | Le lot a été rappelé | **Ne pas consommer** ; contacter le point de vente |
| **Produit introuvable** ❌ | Code inconnu ou désactivé | Vérifier le code ; en cas de doute, signaler une possible contrefaçon |

### Signaler une étiquette suspecte

Sur chaque page de vérification, le lien **« Étiquette abîmée ou douteuse ? Signalez-la »**
permet au consommateur d'alerter Kounouz : opercule abîmé, étiquette qui ne correspond pas,
aspect ou goût inhabituel. Le signalement crée immédiatement une alerte pour l'équipe
anti-contrefaçon, avec le lieu d'achat.

**Le consommateur devient ainsi un capteur sur le terrain.**

---

## 5. Les cinq espaces de travail

### Producteur — l'apiculteur

Il dépose ses documents, demande la vérification d'un lot de miel, suit l'avancement de son
dossier, consulte ses lots et ses produits en vente, et suit ses gains et ses règlements.

### Agent terrain — la collecte

Conçu pour le téléphone. L'agent voit ses missions du jour et sa tournée sur une carte. Sur
place, un assistant en cinq étapes le guide : prélèvement, photos, pose du scellé numéroté,
confirmation par le producteur, remise au transport. La **chaîne de possession** enregistre
ensuite chaque changement de main de l'échantillon.

### Équipe de vérification — le cœur du métier

Elle instruit les demandes, réceptionne et scelle les échantillons, les envoie au laboratoire,
saisit les résultats, prononce la décision, puis crée les lots vérifiés, l'emballage, les
produits, leurs formats et les codes QR. Un fil de commentaires interne, **jamais visible par le
producteur**, permet à l'équipe d'échanger sur un dossier.

### Administrateur — le pilotage

Utilisateurs et rôles, producteurs, laboratoires partenaires, catalogue, analyses des scans,
alertes anti-contrefaçon, commandes, règlements aux producteurs, taux de commission, blog,
rapports et journal d'audit.
Une recherche globale retrouve n'importe quel producteur, lot, produit, code QR ou alerte.

### Client — la boutique et la vérification

Le grand public parcourt le catalogue, choisit un format, commande (paiement à la livraison), lit
le blog et vérifie un pot par son code QR. Tous les prix sont en dinars tunisiens. Un compte
client, facultatif, donne accès à l'historique des commandes.

---

## 6. Le parcours d'un miel, du rucher au pot

```
  APICULTEUR              Dépose ses documents, demande une vérification
        │
        ▼
  ÉQUIPE KOUNOUZ          Examine le dossier : accepte, demande un
        │                 complément, ou refuse
        ▼
  AGENT TERRAIN           Prélève l'échantillon chez l'apiculteur, le scelle,
        │                 le fait confirmer, le remet au transport
        ▼
  LABORATOIRE AGRÉÉ       Analyse l'échantillon.
        │                 Une part est conservée comme référence
        ▼
  ÉQUIPE KOUNOUZ          Prononce la décision au vu des résultats
        │
        ├─── VÉRIFIÉ ──►  Lot vérifié → Emballage → Produit et formats
        │                 → Génération des codes QR → Mise en vente
        │                          │
        │                          ▼
        │                 CONSOMMATEUR : scanne, vérifie, signale
        │                          │
        │                          ▼
        │                 KOUNOUZ : analyse les scans, détecte les anomalies
        │
        └─── NON VÉRIFIÉ ─► Fin du parcours. L'apiculteur est informé du
                            motif. Le miel n'est jamais mis en vente.
```

Chaque flèche de ce schéma correspond à un écran de la plateforme, et chaque passage d'une étape
à la suivante est inscrit au journal d'audit.

---

## 7. Bon à savoir pendant la démonstration

**Les données sont fictives mais complètes.** La démonstration contient 45 comptes, 7 produits,
1 002 codes QR, 133 demandes de vérification, 71 commandes et plus de 3 000 scans. Les volumes
sont réalistes : les tableaux de bord et les statistiques ont du sens.

**Vous pouvez tout essayer.** Créez une demande, prononcez une décision, générez des codes QR :
rien n'est définitif. Les données peuvent être remises à zéro à tout moment.

**Le premier chargement de la journée est lent** — jusqu'à une minute, le temps que le serveur de
démonstration se réveille. Une seule fois.

**Les fichiers envoyés ne sont pas conservés** dans cette version de démonstration. Les photos et
documents que vous téléverserez disparaîtront à la prochaine mise à jour. Les données saisies,
elles, restent — tout comme les photos de couverture du blog, enregistrées avec les articles.

**Les comptes de démonstration sont publics.** Toute personne disposant du lien peut s'y
connecter. N'y saisissez aucune donnée réelle ou confidentielle.

---

## 8. Questions fréquentes

**Faut-il installer quelque chose ?**
Non. Un navigateur suffit, sur ordinateur comme sur téléphone.

**Le site fonctionne-t-il sur mobile ?**
Oui, entièrement. L'espace de l'agent terrain a même été conçu d'abord pour le téléphone, puisque
c'est sur le terrain qu'il est utilisé.

**Dans quelles langues ?**
Arabe (par défaut, de droite à gauche), français et anglais. Le bouton 🌐 change de langue à tout
moment.

**Que se passe-t-il si un miel n'est pas vérifié ?**
Il ne peut pas être mis en vente. L'apiculteur est informé du motif du refus. La plateforme ne
permet pas de contourner cette règle : un produit ne peut exister sans un lot vérifié.

**Comment sont détectées les contrefaçons ?**
De deux manières. Automatiquement, en analysant les scans : un même code scanné un nombre anormal
de fois, ou depuis des lieux géographiquement incohérents, déclenche une alerte. Et manuellement,
par les signalements des consommateurs depuis la page de vérification.

**Que devient l'échantillon après l'analyse ?**
Une part est conservée par Kounouz comme échantillon de référence. Elle permet une contre-analyse
en cas de contestation, parfois des mois plus tard.

**Peut-on retirer un produit déjà en vente ?**
Oui. Un produit peut être suspendu, ou un lot rappelé. Les consommateurs qui scannent un pot de ce
lot voient immédiatement le changement — même sur les pots déjà vendus.

**Comment est calculée la commission de Kounouz ?**
Chaque vente est partagée entre Kounouz et le producteur : 20 % pour Kounouz par défaut, le reste
pour le producteur. L'administrateur change ce taux dans **Ventes → Commission**. Le nouveau taux
vaut pour les commandes suivantes ; chaque vente passée garde le taux en vigueur ce jour-là, si
bien qu'aucun règlement déjà calculé ne change.

**Qui peut écrire sur le blog ?**
L'administrateur, depuis **Blog** dans la console. Un article peut être rédigé en arabe, en
français et en anglais ; une langue laissée vide affiche la version d'une autre langue. Un
brouillon reste invisible tant qu'il n'est pas publié.

**Les données peuvent-elles être exportées ?**
Oui, les rapports sont exportables depuis les espaces de vérification et d'administration.

---

*Kounouz Alafiya — كنوز العافية*
*Traçabilité et vérification du miel tunisien*
