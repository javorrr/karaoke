<?php
declare(strict_types=1);

function ensureSongColumn(PDO $pdo, string $name, string $definition): void
{
    $columns = $pdo->query('PRAGMA table_info(songs)')->fetchAll(PDO::FETCH_ASSOC);
    $exists = array_reduce(
        $columns,
        static fn (bool $found, array $column): bool => $found || $column['name'] === $name,
        false
    );

    if (!$exists) {
        $pdo->exec(sprintf('ALTER TABLE songs ADD COLUMN %s %s', $name, $definition));
    }
}

function ensurePlayCountColumn(PDO $pdo): void
{
    ensureSongColumn($pdo, 'play_count', 'INTEGER NOT NULL DEFAULT 0');
}

function ensureDetailsColumn(PDO $pdo): void
{
    ensureSongColumn($pdo, 'details', 'TEXT');
}
