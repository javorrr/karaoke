<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../db/db.php';

    $query = trim((string) ($_GET['q'] ?? ''));
    if ($query === '') {
        $statement = $pdo->query('SELECT id, title, artist, audio_url, instrumental_url, lrc_url FROM songs ORDER BY title COLLATE NOCASE ASC');
    } else {
        $statement = $pdo->prepare(
            'SELECT id, title, artist, audio_url, instrumental_url, lrc_url
             FROM songs
             WHERE title LIKE :query OR artist LIKE :query
             ORDER BY title COLLATE NOCASE ASC'
        );
        $statement->execute(['query' => '%' . $query . '%']);
    }

    echo json_encode($statement->fetchAll(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['error' => 'Wystąpił błąd serwera podczas pobierania piosenek.'], JSON_UNESCAPED_UNICODE);
}