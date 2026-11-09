<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../db/db.php';
    require_once __DIR__ . '/../db/ensure-schema.php';
    ensurePlayCountColumn($pdo);
    ensureDetailsColumn($pdo);

    $query = trim((string) ($_GET['q'] ?? ''));
    if ($query === '') {
        $statement = $pdo->query('SELECT id, title, artist, audio_url, instrumental_url, lrc_url, play_count, details FROM songs ORDER BY title COLLATE NOCASE ASC');
    } else {
        $statement = $pdo->prepare(
            'SELECT id, title, artist, audio_url, instrumental_url, lrc_url, play_count, details
             FROM songs
             WHERE title LIKE :query OR artist LIKE :query
             ORDER BY title COLLATE NOCASE ASC'
        );
        $statement->execute(['query' => '%' . $query . '%']);
    }

    $songs = $statement->fetchAll();
    $buildStreamUrl = static function (string $url): ?string {
        if ($url === '') {
            return null;
        }

        if (preg_match('#^[a-z][a-z0-9+.-]*://#i', $url)) {
            return $url;
        }

        return 'api/audio.php?file=' . rawurlencode($url);
    };

    foreach ($songs as &$song) {
        $song['stream_url'] = $buildStreamUrl((string) ($song['audio_url'] ?? ''));
        $song['instrumental_stream_url'] = $buildStreamUrl((string) ($song['instrumental_url'] ?? ''));
    }
    unset($song);

    echo json_encode($songs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['error' => 'Wystąpił błąd serwera podczas pobierania piosenek.'], JSON_UNESCAPED_UNICODE);
}