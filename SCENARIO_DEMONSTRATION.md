# Kounouz Alafiya — Scénario de démonstration

**Un miel, du rucher au pot : suivez-le à travers les cinq métiers de la plateforme**

**Site : https://kounouz-alafiya.vercel.app** · Interface en arabe, français ou anglais (bouton 🌐) · Prix en dinars tunisiens
*Premier chargement : jusqu'à une minute, le temps que le serveur se réveille. Données fictives et comptes publics : essayez librement, n'y saisissez rien de réel.*

| Espace | Identifiant | Passe | | Espace | Identifiant | Passe |
|---|---|---|---|---|---|---|
| Producteur | `producteur@kounouzalafiya.com` | `Prod123!` | | Vérification | `verification@kounouzalafiya.com` | `Verif123!` |
| Agent | `agent@kounouzalafiya.com` | `Agent123!` | | Admin | `admin@kounouzalafiya.com` | `Admin123!` |

---

## L'histoire

Ahmed Ben Salah, apiculteur au Kef, veut vendre son miel de jujubier sous le label Kounouz : il doit être prélevé, scellé, analysé et approuvé. Suivons ce lot jusqu'au pot que le consommateur scanne.

## Acte 1 — Le producteur demande la vérification · *compte Producteur*

1. **Mon profil → Documents** : ses pièces justificatives sont déposées. Sans elles, aucune demande n'est recevable.
2. **Demandes de vérification** : la liste de ses dossiers et leur état. Ouvrez-en un : origine du miel, rucher, quantité, photos, et l'historique complet des étapes déjà franchies.
3. **Tableau de bord** : ce qu'il attend de Kounouz aujourd'hui.

> **Ce que ça montre :** le producteur ne subit pas le processus, il le suit. À chaque instant il sait où en est son dossier et pourquoi.

## Acte 2 — Kounouz instruit le dossier · *compte Équipe de vérification*

4. **Tableau de bord** : ce qui attend une décision aujourd'hui — demandes à instruire, échantillons à réceptionner, analyses en cours.
5. **Revue des demandes** → ouvrez un dossier. Informations du producteur, photos, documents, échantillons rattachés. Le **fil de commentaires interne n'est jamais visible par le producteur** : l'équipe y échange librement.
6. Trois issues possibles : **accepter**, **demander un complément**, **refuser**. Un refus clôt le parcours et le producteur en connaît le motif.

## Acte 3 — L'agent prélève sur le terrain · *compte Agent terrain*

7. **Tableau de bord** : les missions du jour et la **tournée sur une carte**. Cet espace est pensé pour le téléphone.
8. **Mes missions** : onglets *Aujourd'hui, À venir, À faire, Passées, Disponibles*. L'agent peut aussi prendre une mission disponible.
9. **Collecte d'échantillon** : l'assistant en cinq étapes — prélèvement, photos, **pose d'un scellé numéroté**, confirmation par le producteur, remise au transport.
10. **Chaîne de possession** : chaque changement de main est enregistré, daté et signé. L'échantillon n'est jamais « quelque part sans responsable ».

> **Ce que ça montre :** le scellé et la chaîne de possession rendent la substitution d'échantillon impossible sans laisser de trace.

## Acte 4 — Le laboratoire tranche · *compte Équipe de vérification*

11. **Gestion des échantillons** : réception, contrôle du scellé, mise de côté de l'**échantillon de référence** — la part que Kounouz conserve pour une éventuelle contre-analyse, des mois plus tard.
12. **Laboratoire** : envoi au laboratoire agréé, puis saisie des résultats d'analyse.
13. **Décision de vérification** : l'équipe prononce **Vérifié** ou **Non vérifié** au vu des résultats. C'est le point de bascule de tout le processus.

## Acte 5 — Le miel devient un produit · *compte Équipe de vérification*

14. **Lots vérifiés** → **Emballage** → **Produits** : le lot approuvé devient un produit et ses formats de vente (250 g, 500 g…), chacun avec son prix et son stock.
15. **QR codes** : génération des codes uniques, un par pot. C'est ici que naissent les étiquettes.
16. **Produits → Mettre en marché** : le produit apparaît en boutique. Il n'a pas pu y arriver autrement.

## Acte 6 — Le consommateur vérifie · *sans connexion*

17. **Boutique** : chaque format a son prix en dinars (romarin 250 g = 31 DT, 500 g = 56 DT). **Blog** : conseils en trois langues, chaque article a son lien partageable.
18. Sur la page d'accueil, section **Vérifier un produit**, saisissez **`KZ-QR-2026-000001`** → **Produit vérifié ✅** : rucher, région, lot, résultats d'analyse.
19. Saisissez **`KZ-QR-2026-000002`** → **Produit suspendu ⏸️** : Kounouz peut retirer un lot de la circulation, y compris sur des pots déjà vendus.
20. **« Étiquette abîmée ou douteuse ? Signalez-la »** : le consommateur alerte Kounouz en trois clics, avec le lieu d'achat.

> **Ce que ça montre :** la promesse tient dans la main de l'acheteur, en trois secondes, sans compte ni application à installer.

## Acte 7 — La direction pilote · *compte Administrateur*

21. **Tableau de bord** : scans dans le temps, lieux de scan, régions et produits les plus actifs, alertes ouvertes.
22. **Analyses → Alertes anti-contrefaçon** : codes scannés anormalement souvent ou depuis des lieux incohérents, et signalements des consommateurs.
23. **Ventes → Commandes / Règlements producteurs** : ce qui a été vendu, ce qui est dû à chaque apiculteur.
24. **Journal d'audit** : qui a fait quoi, quand, avec l'ancien et le nouveau statut. Chaque décision du scénario ci-dessus y figure.
25. **Ventes → Commission** : **20 % par défaut** sur chaque vente. Passez-la à 18 % : le simulateur montre la répartition ; seules les commandes suivantes changent.
26. **Blog** : rédigez un article (une à trois langues), ajoutez une photo, publiez : il apparaît sur l'accueil. Kounouz pilote ainsi seul ses tarifs et son contenu.
