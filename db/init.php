<?php
declare(strict_types=1);

$databasePath = __DIR__ . '/karaoke.sqlite';
$schemaPath = __DIR__ . '/database.sql';
$seedPath = __DIR__ . '/seed.sql';

if (file_exists($databasePath) && !unlink($databasePath)) {
    fwrite(STDERR, "Nie można usunąć starej bazy danych.\n");
    exit(1);
}

try {
    $pdo = new PDO('sqlite:' . $databasePath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec(file_get_contents($schemaPath));
    $pdo->exec(file_get_contents($seedPath));
    echo "Baza karaoke.sqlite została utworzona i zasilona danymi.\n";
} catch (Throwable $exception) {
    if (file_exists($databasePath)) {
        unlink($databasePath);
    }
    fwrite(STDERR, "Błąd inicjalizacji bazy: {$exception->getMessage()}\n");
    exit(1);
}