<?php
declare(strict_types=1);

$pdo = new PDO('sqlite:' . __DIR__ . '/karaoke.sqlite');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);