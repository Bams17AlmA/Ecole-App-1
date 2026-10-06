# Comparatif cahier des charges / V3

## Conforme ou couvert
- Architecture Windows desktop offline-first avec SQLite local permanent.
- Authentification et rôles ADMIN, DIRECTION, SECRETARIAT, CAISSE, ENSEIGNANT, PEDAGOGIE.
- Hash des codes avec bcryptjs.
- Changement obligatoire du code administrateur initial 1234.
- Élèves avec dossier enrichi.
- Parents et inscriptions.
- Personnel et enseignants.
- Niveaux, sections, options, classes, salles.
- Matières, affectations et horaires.
- Présences élèves et enseignants.
- Périodes, évaluations et notes.
- Années scolaires.
- Types de frais, frais attribués, paiements et reçus.
- Documents.
- Tableau de bord.
- Recherche dans les modules.
- Export CSV compatible Excel.
- Journal d'activités.
- Sauvegarde et restauration SQLite.
- Archivage logique pour les tables possédant un statut.
- Stockage hors du dossier d'installation pour préserver les données.
- Journal de démarrage en cas d'erreur.

## À compléter dans une prochaine itération fonctionnelle
Le cahier des charges complet prévoit également des fonctions avancées qui nécessitent encore des écrans et traitements dédiés :
- calcul automatique des moyennes pondérées et appréciations ;
- génération complète des bulletins PDF A4 ;
- reçus PDF avec numérotation métier ;
- détection avancée des conflits d'horaires ;
- gestion complète des dettes et soldes par élève ;
- import Excel avec prévisualisation et détection des doublons ;
- export XLSX/PDF ;
- statistiques et graphiques avancés avec filtres ;
- gestion complète des photos et documents uploadés ;
- verrouillage des années scolaires clôturées ;
- permissions fines configurables ;
- portail parent ;
- notifications ;
- rapports administratifs/pédagogiques/financiers complets.

La V3 constitue donc une base desktop intégrée et persistante beaucoup plus proche du cahier des charges que la version précédente, tout en identifiant explicitement les traitements métier restant à industrialiser.
