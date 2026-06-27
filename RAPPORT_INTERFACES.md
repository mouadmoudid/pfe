# Description des Interfaces — Partie Réalisation (PFE)
## Application Mobile SMS-ONCF — DRIC

---

### Rôles utilisateurs

L'application distingue cinq rôles, chacun correspondant à un niveau hiérarchique ou fonctionnel :

| Rôle | Désignation |
|------|-------------|
| **ADMIN** | Administrateur système |
| **CGPX** | Chef de groupement / district (niveau KN1) |
| **CSPR** | Chef de sécurité de proximité (niveau KN2) |
| **CET** | Chef d'équipe technique |
| **AGENT** | Agent de terrain |

---

## Dossier 1 — Contrôle et Inspection

Ce dossier regroupe l'ensemble des outils dédiés au suivi et à la traçabilité des activités de contrôle et d'inspection de sécurité ferroviaire au sein de la Direction Régionale Infrastructure Centre (DRIC).

> 📸 **[CAPTURE `fig_1_0_dossier_controle_inspection.png` — Écran d'accueil du dossier "Contrôle et Inspection" affichant la liste de ses 5 sous-dossiers]**

---

### 1.1 Planning Annuel

L'interface du **Planning Annuel** offre une vision globale de l'ensemble des activités de contrôle et d'inspection programmées sur l'année en cours, organisées selon 53 semaines.

L'écran propose deux modes d'affichage complémentaires :

- **Vue Gantt** : un diagramme de Gantt interactif et défilable horizontalement, où chaque tâche est représentée par une barre colorée positionnée sur les semaines concernées. Les mois sont affichés en en-tête, et chaque barre indique le pourcentage d'avancement de la tâche. Un code couleur distingue les quatre catégories d'activités : Contrôle Collaborateurs (bleu), Chantier Voie (vert), Examens (orange) et Formation/Sensibilisation (violet).

> 📸 **[CAPTURE `fig_1_1a_planning_vue_gantt.png` — Vue Gantt du Planning Annuel avec les barres colorées positionnées sur les semaines S01–S53]**

- **Vue Liste** : une liste de cartes synthétiques présentant pour chaque tâche la catégorie, le titre, la semaine prévue, la durée, le responsable assigné, le statut et une barre de progression visuelle.

> 📸 **[CAPTURE `fig_1_1b_planning_vue_liste.png` — Vue Liste du Planning Annuel avec les cartes de tâches et barres de progression]**

Des filtres par catégorie permettent d'affiner l'affichage. En appuyant sur une tâche, une fiche détail s'ouvre avec la possibilité de changer son statut (Planifié, En cours, Réalisé, Reporté). Les utilisateurs autorisés peuvent créer de nouvelles tâches via un formulaire dédié permettant de saisir le titre, la catégorie, la semaine de début, la durée, le collaborateur assigné et les observations.

> 📸 **[CAPTURE `fig_1_1c_planning_formulaire_creation.png` — Formulaire de création d'une nouvelle tâche de planning (modale de saisie)]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Interface masquée |
| CGPX | Consultation de toutes les tâches + création et modification |
| CSPR | Consultation de toutes les tâches (lecture seule) |
| CET | Consultation de toutes les tâches (lecture seule) |
| ADMIN | Accès complet (consultation + création + modification) |

---

### 1.2 K Check List

L'interface **K Check List** permet de créer, consulter et exporter les check lists de contrôle de sécurité. Le processus de création se déroule en quatre étapes guidées :

**Étape 1 — Sélection du collaborateur** : l'utilisateur recherche et sélectionne le collaborateur concerné par le contrôle parmi la liste du personnel.

> 📸 **[CAPTURE `fig_1_2a_checklist_selection_collab.png` — Étape 1 : modale de recherche et sélection du collaborateur pour la check list]**

**Étape 2 — Choix du type** : deux types de check list sont disponibles — la *Check List Collaborateur* (contrôle individuel portant sur les procédures, la fiabilité humaine et la documentation) et la *Check List Chantier* (contrôle d'un chantier couvrant les phases avant départ, pendant les travaux et en fin de chantier).

> 📸 **[CAPTURE `fig_1_2b_checklist_choix_type.png` — Étape 2 : écran de choix du type de check list (Collaborateur ou Chantier)]**

**Étape 3 — Informations générales** : saisie du site/UP, de la date de contrôle et des informations spécifiques au type de contrôle (nom et matricule du collaborateur, ou nom du chantier et localisation kilométrique).

> 📸 **[CAPTURE `fig_1_2c_checklist_infos_generales.png` — Étape 3 : formulaire de saisie des informations générales de la check list]**

**Étape 4 — Évaluation des points** : l'utilisateur parcourt l'ensemble des points de contrôle organisés par sections et sous-sections. Pour chaque point, il attribue une cotation parmi quatre niveaux : **S** (Satisfaisant), **A** (À surveiller), **M** (Mauvais), **I** (Inacceptable). Pour les six agrès de sécurité réglementaires (GSMR, Clés de berne, Clés de vestibule, Lanternes, SAM, Pétards), des champs supplémentaires permettent de renseigner la complétude, l'état et la validité. Des champs de constatation et de régularisation sont disponibles pour chaque point.

> 📸 **[CAPTURE `fig_1_2d_checklist_evaluation_points.png` — Étape 4 : évaluation d'un point de contrôle avec cotation S/A/M/I et champs de constatation]**

La liste des check lists enregistrées est organisée par collaborateur. Chaque check list peut être exportée au format **PDF** aux couleurs de l'ONCF.

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Interface masquée |
| CGPX | Créer, consulter toutes les check lists, supprimer, exporter PDF |
| CSPR | Créer, consulter toutes les check lists, exporter PDF |
| CET | Créer, consulter toutes les check lists, exporter PDF |
| ADMIN | Accès complet (y compris suppression et ajout de points personnalisés) |

---

### 1.3 Compte Rendu de Contrôles des Procédures KN1

L'interface **Compte Rendu KN1** permet de générer un compte rendu officiel de contrôle de procédures à partir d'une check list existante.

> 📸 **[CAPTURE `fig_1_3a_cr_kn1_selection.png` — Sélection de la check list source dans la liste des check lists disponibles (filtre par collaborateur)]**

L'utilisateur sélectionne d'abord une check list dans la liste disponible (filtrée par collaborateur si souhaité), puis complète les informations complémentaires du compte rendu : lieu de contrôle, constatations générales, localisation kilométrique et actions correctives à engager. L'état détaillé de chacun des six agrès réglementaires est automatiquement repris depuis la check list source.

> 📸 **[CAPTURE `fig_1_3b_cr_kn1_formulaire.png` — Formulaire de complétion du Compte Rendu KN1 avec les sections constatations et état des agrès]**

Une fois complété, le compte rendu est exportable au format **PDF** sous forme de document structuré et signable, conforme aux exigences de la Directive Contrôle et Inspection Sécurité Ferroviaire (référence DR.PSC.M1C.CISF.024).

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Interface masquée |
| CGPX | Consultation et génération de comptes rendus |
| CSPR | Consultation et génération de comptes rendus |
| CET | Consultation et génération de comptes rendus |
| ADMIN | Accès complet |

---

### 1.4 Rapport Périodique de Synthèse Global

L'interface **Rapport Périodique** permet de générer un bilan mensuel des activités de contrôle et d'inspection.

L'utilisateur sélectionne l'année et le mois souhaités. L'application calcule automatiquement les statistiques du mois : nombre de tâches planifiées, réalisées, reportées et annulées, ainsi que le taux de réalisation global. L'utilisateur complète ensuite manuellement les non-conformités constatées (date, nature, action corrective) et les recommandations.

> 📸 **[CAPTURE `fig_1_4_rapport_periodique.png` — Écran de génération du Rapport Périodique avec les statistiques calculées et le formulaire de non-conformités]**

Le rapport est exportable au format **PDF** et présente de manière synthétique l'ensemble des indicateurs de contrôle du mois, signé par le responsable de district.

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Interface masquée |
| CGPX | Génération et export du rapport mensuel |
| CSPR | Génération et export du rapport mensuel |
| CET | Génération et export du rapport mensuel |
| ADMIN | Accès complet |

---

### 1.5 RACI

L'interface **RACI** affiche le registre des actions de contrôle et d'inspection. Elle permet de consulter la matrice RACI (Responsable, Approbateur, Consulté, Informé) associée aux activités de contrôle et d'inspection de sécurité ferroviaire.

> 📸 **[CAPTURE `fig_1_5_raci.png` — Interface RACI affichant le registre des actions de contrôle et inspection]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Consultation (lecture seule) |
| CGPX | Consultation |
| CSPR | Consultation |
| CET | Consultation |
| ADMIN | Accès complet |

---

## Dossier 2 — Veille

Ce dossier regroupe les outils de surveillance continue de la fiabilité humaine et du suivi individuel des collaborateurs de sécurité.

> 📸 **[CAPTURE `fig_2_0_dossier_veille.png` — Écran d'accueil du dossier "Veille" affichant la liste de ses 4 sous-dossiers]**

---

### 2.1 Planning K Collaborateur

Cette interface présente le même **Planning Annuel** que dans le dossier Contrôle et Inspection, mais en **mode lecture seule** pour tous les rôles. Elle est destinée à la consultation du planning des contrôles collaborateurs sans possibilité de modification.

> 📸 **[CAPTURE `fig_2_1_planning_k_collaborateur.png` — Planning K Collaborateur en mode lecture seule (vue Gantt ou Liste)]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Consultation (lecture seule) |
| CGPX | Consultation (lecture seule) |
| CSPR | Consultation (lecture seule) |
| CET | Consultation (lecture seule) |
| ADMIN | Consultation (lecture seule) |

---

### 2.2 Fiche de Suivi Individuel

L'interface **Fiche de Suivi Individuel** permet le suivi personnalisé de chaque collaborateur de sécurité en matière d'examens et de formations.

> 📸 **[CAPTURE `fig_2_2a_fiche_suivi_liste_collabs.png` — Liste des collaborateurs pour la sélection d'une fiche de suivi individuel]**

L'utilisateur sélectionne un collaborateur dans la liste du personnel. La fiche affiche ensuite l'ensemble des examens et formations planifiés pour l'année en cours, regroupés en trois catégories :

- **Examen Psychologique** : résultat Favorable ou Défavorable
- **Examen Médical** : résultat Apte ou Inapte
- **Examen Professionnel** : résultat Bon ou Mauvais

> 📸 **[CAPTURE `fig_2_2b_fiche_suivi_resultats.png` — Fiche de suivi d'un collaborateur avec les résultats des trois types d'examens et les champs d'observation]**

Pour chaque item, l'utilisateur renseigne le résultat, les observations, l'origine de la constatation et les actions réalisées. La fiche est exportable au format **PDF**, constituant ainsi un document de traçabilité individuelle sur toute l'année.

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Interface masquée |
| CGPX | Consultation et saisie des résultats pour tous les collaborateurs |
| CSPR | Consultation et saisie des résultats pour tous les collaborateurs |
| CET | Consultation et saisie des résultats pour tous les collaborateurs |
| ADMIN | Accès complet |

---

### 2.3 Tableau des Indicateurs d'Alerte

L'interface **Tableau des Indicateurs d'Alerte** est un outil de surveillance permanente de la fiabilité humaine. Elle présente les 22 indicateurs FOH (Facteurs Organisationnels et Humains) regroupés en quatre dimensions :

- **Professionnels** : erreurs répétées, démotivation, manque de concentration, émotivité
- **Sociologiques** : maladie d'un proche, deuil, séparation, problèmes matériels
- **Psychologiques** : isolement, incohérence dans le discours, consommation de substances
- **Physiologiques et médicaux** : fatigabilité inhabituelle, variation de poids, pathologies

> 📸 **[CAPTURE `fig_2_3_tableau_indicateurs.png` — Tableau des 22 indicateurs FOH organisés par dimension (Professionnels, Sociologiques, Psychologiques, Physiologiques)]**

Pour chaque collaborateur, ces indicateurs permettent d'évaluer le niveau de vigilance à adopter et d'anticiper les situations à risque.

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Interface masquée |
| CGPX | Consultation de tous les indicateurs |
| CSPR | Consultation de tous les indicateurs |
| CET | Consultation de tous les indicateurs |
| ADMIN | Accès complet |

---

### 2.4 Liste des Collaborateurs de Sécurité

L'interface **Liste des Collaborateurs** présente l'annuaire complet du personnel de sécurité (hors administrateurs). Chaque fiche collaborateur affiche les informations professionnelles (nom, matricule, poste, habilitations) permettant une gestion centralisée et à jour du personnel.

> 📸 **[CAPTURE `fig_2_4_liste_collaborateurs.png` — Liste des collaborateurs de sécurité avec les informations de chaque agent (nom, matricule, poste)]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Interface masquée |
| CGPX | Consultation |
| CSPR | Consultation |
| CET | Consultation |
| ADMIN | Accès complet |

---

## Dossier 3 — Gestion des Risques

Ce dossier fournit les outils d'identification, d'évaluation et de maîtrise des risques liés aux activités ferroviaires sur la LGV.

> 📸 **[CAPTURE `fig_3_0_dossier_gestion_risques.png` — Écran d'accueil du dossier "Gestion des Risques" affichant ses 2 sous-dossiers]**

---

### 3.1 Cartographie des Risques

L'interface **Cartographie des Risques** permet de gérer le registre des risques identifiés sur la LGV. Chaque risque est caractérisé par :

- Son **facteur** : Facteur humain, Environnement, Procédure, Installation
- Son **lieu** et le **danger** identifié
- Sa **fréquence** et sa **gravité** (notées de 1 à 4), dont le produit détermine automatiquement le niveau de **criticité** : Critique (rouge), Élevé (orange), Modéré (jaune), Faible (vert)
- Les **propositions de maîtrise** du risque

L'interface offre une recherche textuelle et un filtre par niveau de criticité pour prioriser les actions. Les risques sont affichés sous forme de cartes colorées selon leur criticité. L'ensemble de la cartographie est exportable au format **PDF**.

> 📸 **[CAPTURE `fig_3_1_cartographie_risques.png` — Cartographie des risques avec les cartes colorées par niveau de criticité (Critique/Élevé/Modéré/Faible) et les filtres de recherche]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Accès bloqué explicitement (même si le dossier est visible) |
| CGPX | Consultation + création et modification de risques |
| CSPR | Consultation + création et modification de risques |
| CET | Consultation + création et modification de risques |
| ADMIN | Accès complet (y compris suppression) |

---

### 3.2 Registre des Dangers

L'interface **Registre des Dangers** présente la liste des dangers recensés, organisée par année sur les 5 dernières années. Elle permet de consulter l'historique des dangers identifiés sur le périmètre d'activité, avec la possibilité de naviguer d'une année à l'autre.

> 📸 **[CAPTURE `fig_3_2_registre_dangers.png` — Registre des Dangers avec la navigation par année et la liste des dangers recensés]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Consultation (lecture seule) |
| CGPX | Consultation + création et modification |
| CSPR | Consultation (lecture seule) |
| CET | Consultation (lecture seule) |
| ADMIN | Accès complet (y compris suppression) |

---

## Dossier 4 — REX

Ce dossier regroupe les outils de capitalisation du retour d'expérience sur les incidents et événements de sécurité.

> 📸 **[CAPTURE `fig_4_0_dossier_rex.png` — Écran d'accueil du dossier "REX" affichant ses 2 sous-dossiers (REX et RACE)]**

---

### 4.1 REX — Retour d'Expérience

L'interface **REX** permet de saisir, consulter et exporter les fiches de retour d'expérience sur les incidents survenus. Chaque fiche REX structure l'analyse d'un événement selon les rubriques suivantes :

- Identification de l'incident : titre, date/heure, lieu, matériel concerné, opération en cours
- Chronologie de l'intervention : détection, alerte, sécurisation du site, demande de secours, tentatives de dépannage, résolution
- Analyse des causes : cause directe et causes indirectes
- Impacts : sur les circulations, sur les trains, coûts estimés
- Conclusions et recommandations

> 📸 **[CAPTURE `fig_4_1_rex_formulaire.png` — Fiche REX avec les sections d'analyse d'incident (identification, chronologie, causes, impacts)]**

La liste des REX est consultable et filtrable. Chaque fiche est exportable au format **PDF**.

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Consultation et saisie de fiches REX |
| CGPX | Consultation et saisie de fiches REX |
| CSPR | Consultation et saisie de fiches REX |
| CET | Consultation et saisie de fiches REX |
| ADMIN | Accès complet |

> Cette interface est volontairement ouverte à tous les rôles afin de favoriser la remontée d'expérience à tous les niveaux.

---

### 4.2 RACE — Rapport d'Analyse Complémentaire d'Événement

L'interface **RACE** permet d'établir des rapports d'analyse approfondis sur des événements de sécurité nécessitant une investigation complémentaire. Ces rapports enrichissent le retour d'expérience en détaillant les facteurs contributifs et les enseignements tirés de l'événement analysé.

> 📸 **[CAPTURE `fig_4_2_race.png` — Interface RACE avec la liste des rapports d'analyse et le formulaire de saisie]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Consultation et saisie |
| CGPX | Consultation et saisie |
| CSPR | Consultation et saisie |
| CET | Consultation et saisie |
| ADMIN | Accès complet |

---

## Dossier 5 — Culture Positif

Ce dossier regroupe les outils de mesure et de promotion de la culture de sécurité au sein du personnel ferroviaire.

> 📸 **[CAPTURE `fig_5_0_dossier_culture.png` — Écran d'accueil du dossier "Culture Positif" affichant ses 2 sous-dossiers]**

---

### 5.1 Questionnaire d'Évaluation de la Culture de Sécurité

L'interface **Questionnaire Culture** permet de réaliser l'exercice annuel d'évaluation de la maturité en culture de sécurité. Le questionnaire comporte **42 questions** organisées par thèmes et se remplit de façon **anonyme**, garantissant la sincérité des réponses.

Les campagnes (ouverture/fermeture) sont gérées par l'encadrement. Une fois la campagne fermée, les résultats sont consolidés et consultables par l'encadrement.

> 📸 **[CAPTURE `fig_5_1_questionnaire_culture.png` — Interface du questionnaire d'évaluation de la culture de sécurité (liste des campagnes ou vue des questions)]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Répondre au questionnaire uniquement |
| CGPX | Répondre + ouvrir/fermer une campagne + consulter les résultats |
| CSPR | Répondre + consulter les résultats |
| CET | Répondre + consulter les résultats |
| ADMIN | Accès complet (y compris suppression de campagnes) |

---

### 5.2 Remontée d'Information

L'interface **Remontée d'information** est un canal de collecte des retours du terrain. Elle permet aux agents de signaler des observations, des anomalies ou des suggestions liées à la sécurité. L'encadrement peut consulter et gérer l'ensemble des remontées reçues.

> 📸 **[CAPTURE `fig_5_2_remontee_info.png` — Interface de remontée d'information avec la liste des remontées et le formulaire de soumission]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Soumettre une remontée d'information |
| CGPX | Soumettre + consulter et gérer toutes les remontées |
| CSPR | Soumettre + consulter et gérer toutes les remontées |
| CET | Soumettre + consulter et gérer toutes les remontées |
| ADMIN | Accès complet |

---

## Dossier 6 — Référenciels

Ce dossier donne accès à la documentation réglementaire et normative de référence.

> 📸 **[CAPTURE `fig_6_0_dossier_referenciels.png` — Écran d'accueil du dossier "Référenciels" avec son unique sous-dossier]**

---

### 6.1 Documents Référentiels

L'interface **Documents Référentiels** met à disposition l'ensemble de la documentation officielle sous forme de **fichiers PDF consultables** directement depuis l'application. Elle regroupe notamment :

- Les procédures opérationnelles (SP320, S2B, S9A, S9B, consignes générales)
- Les référentiels spécifiques à la LGV (normes de maintenance, sécurité technique sur les chantiers, surveillance des voies)
- Les guides pratiques voie

Cette bibliothèque documentaire permet aux agents et encadrants d'avoir accès en permanence aux textes réglementaires, même en déplacement sur le terrain.

> 📸 **[CAPTURE `fig_6_1_documents_referentiels.png` — Bibliothèque des documents référentiels avec la liste des PDF disponibles et leurs métadonnées (taille, date)]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Consultation et téléchargement des documents |
| CGPX | Consultation + ajout et suppression de documents |
| CSPR | Consultation + ajout et suppression de documents |
| CET | Consultation + ajout et suppression de documents |
| ADMIN | Accès complet |

---

## Dossier 7 — Capital Humain (C.H)

Ce dossier regroupe les outils de gestion administrative et RH du personnel de la DRIC.

> 📸 **[CAPTURE `fig_7_0_dossier_capital_humain.png` — Écran d'accueil du dossier "Capital Humain" affichant ses 7 sous-dossiers (dont 4 en cours de développement)]**

---

### 7.1 Suivi de Congés

L'interface **Suivi de Congés** permet de gérer et de visualiser les congés de l'ensemble du personnel. Elle présente un tableau organisé par mois et par semaine, où chaque ligne correspond à un collaborateur et chaque cellule indique sa présence ou son absence. La navigation entre les mois et les années permet de planifier les absences sur l'horizon souhaité. Le tableau est exportable au format **PDF**.

> 📸 **[CAPTURE `fig_7_1_suivi_conges.png` — Tableau de suivi des congés par semaine avec les lignes collaborateurs et les cellules d'absence saisies]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Consultation de ses propres données uniquement |
| CGPX | Consultation de tous les collaborateurs + saisie et modification |
| CSPR | Consultation de ses propres données uniquement |
| CET | Consultation de ses propres données uniquement |
| ADMIN | Accès complet (consultation de tous + saisie et modification) |

---

### 7.2 Suivi Astreinte

L'interface **Suivi Astreinte** affiche le planning des astreintes du personnel. Elle permet de visualiser, pour chaque semaine et chaque collaborateur, les périodes d'astreinte planifiées.

> 📸 **[CAPTURE `fig_7_2_suivi_astreinte.png` — Planning des astreintes avec le tableau hebdomadaire par collaborateur]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Consultation de ses propres astreintes uniquement |
| CGPX | Consultation de tous + saisie et modification |
| CSPR | Consultation de ses propres astreintes uniquement |
| CET | Consultation de ses propres astreintes uniquement |
| ADMIN | Accès complet (consultation de tous + saisie et modification) |

---

### 7.3 Élément de Solde

L'interface **Élément de Solde** correspond à la feuille d'attachement mensuelle du personnel. Elle récapitule les éléments variables de paie pour chaque collaborateur : heures supplémentaires, astreintes effectuées et autres éléments de rémunération complémentaires.

La visibilité des données respecte la hiérarchie organisationnelle : le CET et l'ADMIN voient toutes les entités, le CSPR voit les entités de ses CGPX rattachés, et chaque CGPX voit uniquement sa propre entité.

> 📸 **[CAPTURE `fig_7_3_element_solde.png` — Feuille d'attachement mensuelle (Élément de Solde) avec les colonnes de rémunération variable par collaborateur]**

**Droits d'accès :**

| Rôle | Accès |
|------|-------|
| AGENT | Accès non applicable (données RH confidentielles) |
| CGPX | Consultation de sa propre entité + saisie et modification |
| CSPR | Consultation de ses entités rattachées + validation des éléments |
| CET | Consultation de toutes les entités + validation |
| ADMIN | Accès complet à toutes les entités (y compris suppression) |

---

### 7.4 à 7.7 — Fonctionnalités en cours de développement

Les rubriques **Accident Travail**, **Stages**, **Tableau de Service** et **Règlement C.H** sont prévues dans l'application et seront développées dans une phase ultérieure du projet.

---

*Document rédigé dans le cadre du Projet de Fin d'Études — Application Mobile de Gestion de la Sécurité Ferroviaire, ONCF DRIC.*
