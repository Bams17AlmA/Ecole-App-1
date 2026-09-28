<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';

if (!empty($_SESSION['user'])) {
    header('Location: dashboard.php'); exit;
}
$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = trim($_POST['login'] ?? '');
    $password = $_POST['password'] ?? '';
    if ($login !== '' && $password !== '') {
        $stmt = db()->prepare('SELECT id, username, password_hash, role, nom_complet FROM users WHERE username = ? AND actif = 1 LIMIT 1');
        $stmt->execute([$login]);
        $user = $stmt->fetch();
        if ($user && password_verify($password, $user['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['user'] = [
                'id' => $user['id'], 'username' => $user['username'],
                'role' => $user['role'], 'nom_complet' => $user['nom_complet']
            ];
            header('Location: dashboard.php'); exit;
        }
    }
    $error = 'Identifiants incorrects.';
}
?>
<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0d6efd"><link rel="manifest" href="manifest.json">
<link rel="stylesheet" href="css/app.css"><title>Connexion — Ecole-App-1</title>
</head><body class="login-page">
<main class="login-card">
<div class="brand-mark">EA</div>
<h1>Ecole-App-1</h1><p class="muted">Gestion scolaire intégrée</p>
<?php if ($error): ?><div class="alert danger"><?= htmlspecialchars($error) ?></div><?php endif; ?>
<form method="post" autocomplete="off">
<label>Nom d'utilisateur<input name="login" required autofocus></label>
<label>Mot de passe<input type="password" name="password" required></label>
<button class="btn primary full" type="submit">Se connecter</button>
</form>
<button id="installBtn" class="btn secondary full hidden">Installer l'application</button>
<p class="hint">Démo : admin / admin123</p>
</main>
<script src="js/pwa.js"></script></body></html>
