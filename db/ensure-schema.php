<?php
declare(strict_types=1);

function ensurePlayCountColumn(PDO $pdo): void
{
    $columns = $pdo->query('PRAGMA table_info(songs)')->fetchAll(PDO::FETCH_ASSOC);
    $hasPlayCount = array_reduce(
        $columns,
        static fn (bool $found, array $column): bool => $found || $column['name'] === 'play_count',
        false
    );

    if (!$hasPlayCount) {
        $pdo->exec('ALTER TABLE songs ADD COLUMN play_count INTEGER NOT NULL DEFAULT 0');
    }
}
