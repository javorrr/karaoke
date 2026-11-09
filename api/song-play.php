<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../db/db.php';
    require_once __DIR__ . '/../db/ensure-schema.php';
    ensurePlayCountColumn($pdo);

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Do aktualizacji popularności użyj metody POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $payload = json_decode((string) file_get_contents('php://input'), true);
    $songId = filter_var($payload['song_id'] ?? null, FILTER_VALIDATE_INT);
    if ($songId === false || $songId === null || $songId < 1) {
        http_response_code(400);
        echo json_encode(['error' => 'Nieprawidłowy identyfikator piosenki.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $statement = $pdo->prepare(
        'UPDATE songs SET play_count = play_count + 1 WHERE id = :id'
    );
    $statement->execute(['id' => $songId]);

    if ($statement->rowCount() !== 1) {
        http_response_code(404);
        echo json_encode(['error' => 'Nie znaleziono piosenki.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $countStatement = $pdo->prepare('SELECT play_count FROM songs WHERE id = :id');
    $countStatement->execute(['id' => $songId]);
    $result = $countStatement->fetch();

    echo json_encode(['play_count' => (int) $result['play_count']], JSON_UNESCAPED_UNICODE);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['error' => 'Wystąpił błąd serwera podczas aktualizacji popularności.'], JSON_UNESCAPED_UNICODE);
}
