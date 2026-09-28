# Ecole-App-1

Application PWA de gestion intégrée d'un établissement scolaire.

## V1
- PHP 8+ / MySQL / PDO
- Authentification et rôles
- Tableau de bord
- Gestion de la configuration et année scolaire
- Base de données structurée pour élèves, parents, classes, enseignants, présences, évaluations, notes, frais et paiements
- PWA installable
- Interface responsive PC/tablette/mobile
- Fonctionnement local avec XAMPP

## Installation XAMPP
1. Cloner/copie le projet dans `C:\xampp\htdocs\Ecole-App-1`.
2. Créer une base MySQL nommée `ecole_app`.
3. Importer `database/gestion_scolaire.sql` dans phpMyAdmin.
4. Vérifier `config/config.php`.
5. Démarrer Apache et MySQL.
6. Ouvrir `http://localhost/Ecole-App-1/public/`.

### Compte de démonstration
- Utilisateur : `admin`
- Mot de passe : `admin123`

> Changez immédiatement ce mot de passe en environnement réel.

## PWA
Le manifeste et le service worker sont dans `public/`. L'installation nécessite un contexte sécurisé pour un déploiement Internet (HTTPS). En local XAMPP, l'application reste utilisable comme application web ; pour une installation PWA complète sur un réseau, prévoir HTTPS.
