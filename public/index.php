<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';

if (!empty($_SESSION['user'])) {
    header('Location: dashboard.php');
    exit;
}
header('Location: login.php');
exit;
