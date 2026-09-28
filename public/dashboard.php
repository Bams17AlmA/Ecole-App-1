<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
if (empty($_SESSION['user'])) { header('Location: login.php'); exit; }

$stats = [];
foreach ([
    'Élèves' => 'SELECT COUNT(*) FROM eleves WHERE actif=1',
    'Enseignants' => 'SELECT COUNT(*) FROM enseignants WHERE actif=1',
    'Classes' => 'SELECT COUNT(*) FROM classes WHERE actif=1',
    'Paiements' => 'SELECT COALESCE(SUM(montant),0) FROM paiements WHERE statut="valide"'
] as $label=>$sql) {
    try { $stats[$label] = db()->query($sql)->fetchColumn(); } catch (Throwable $e) { $stats[$label] = 0; }
}
$user=$_SESSION['user'];
?>
<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0d6efd"><link rel="manifest" href="manifest.json"><link rel="stylesheet" href="css/app.css">
<title>Tableau de bord — Ecole-App-1</title></head>
<body><header class="topbar"><div><strong>Ecole-App-1</strong><span class="role"><?= htmlspecialchars($user['role']) ?></span></div>
<nav><a href="dashboard.php">Tableau de bord</a><a href="logout.php">Déconnexion</a></nav></header>
<main class="container"><section class="hero"><div><h1>Tableau de bord</h1><p>Bienvenue, <?= htmlspecialchars($user['nom_complet']) ?>.</p></div><button id="installBtn" class="btn secondary hidden">Installer l'application</button></section>
<section class="stats"><?php foreach($stats as $label=>$value): ?><article class="stat"><span><?= htmlspecialchars($label) ?></span><strong><?= is_numeric($value) && $label==='Paiements' ? number_format((float)$value,0,',',' ') . ' FC' : (int)$value ?></strong></article><?php endforeach; ?></section>
<section class="panel"><h2>Modules</h2><div class="module-grid">
<a href="#"><b>Élèves</b><small>Inscriptions et dossiers</small></a><a href="#"><b>Parents</b><small>Responsables et contacts</small></a><a href="#"><b>Classes</b><small>Niveaux et affectations</small></a><a href="#"><b>Présences</b><small>Absences et retards</small></a><a href="#"><b>Notes</b><small>Évaluations et résultats</small></a><a href="#"><b>Finances</b><small>Frais et paiements</small></a>
</div></section></main><script src="js/pwa.js"></script></body></html>
