# Ecole-App-1 — V3
## Installation Windows

1. Exécuter **Ecole-App-1-Setup.exe**.
2. Choisir le dossier d'installation.
3. Laisser les options de raccourci activées.
4. Lancer **Ecole-App-1** depuis le Bureau ou le menu Démarrer.
5. Première connexion : **identifiant admin / code 1234**.
6. Le changement du code est obligatoire lors de la première connexion.

## Données et base

La base SQLite permanente est créée automatiquement dans :

`Documents\Ecole-App-1\data\ecole_app.db`

Les dossiers complémentaires sont :
- `Documents\Ecole-App-1\sauvegardes`
- `Documents\Ecole-App-1\exports`
- `Documents\Ecole-App-1\documents`
- `Documents\Ecole-App-1\photos`

Aucune connexion Internet n'est nécessaire pour l'utilisation quotidienne.

## Sauvegarde

Dans l'application : **Sauvegarde**.
Une copie `.db` est créée dans le dossier sauvegardes.

## Restauration

1. Cliquer **Restaurer**.
2. Confirmer.
3. Sélectionner une sauvegarde SQLite.
4. L'application crée d'abord une copie de sécurité de la base actuelle.
5. La base sélectionnée devient la base active.

## Utilisateurs

Rôles prévus :
- ADMIN
- DIRECTION
- SECRETARIAT
- CAISSE
- ENSEIGNANT
- PEDAGOGIE

L'administrateur peut créer, activer/désactiver et réinitialiser les codes.
Chaque utilisateur dispose d'un code personnel stocké sous forme de hash.

## Modules V3

Élèves, parents, inscriptions, enseignants, personnel, niveaux, sections, options, salles, classes, matières, affectations, horaires, présences élèves, présences enseignants, périodes, évaluations, notes, années scolaires, frais scolaires, frais attribués/dettes, paiements/reçus, documents, rapports, utilisateurs, sauvegarde/restauration.

## Exports

Les listes peuvent être exportées en CSV et ouvertes directement avec Excel.

## Dépannage : l'EXE ne démarre pas

La V3 journalise les erreurs dans :

`Documents\Ecole-App-1\logs.txt`

Si Windows installe correctement mais qu'aucune fenêtre ne s'ouvre, consulter ce fichier avant toute réinstallation.

## Désinstallation

Utiliser Windows > Applications installées > Ecole-App-1.

**Important :** la désinstallation du programme ne doit pas être utilisée comme méthode de suppression des données. La base utilisateur est conservée dans Documents.
