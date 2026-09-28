<?php
declare(strict_types=1);

define('APP_NAME', 'Ecole-App-1');
define('BASE_URL', '/Ecole-App-1/public');
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'ecole_app');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
