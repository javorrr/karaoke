<?php
declare(strict_types=1);

/**
 * Strumieniowanie plików audio z obsługą nagłówka Range.
 *
 * Wbudowany serwer PHP (`php -S`) nie obsługuje zapytań częściowych, przez co
 * przeglądarki nie mogą przewijać utworów. Ten endpoint zwraca poprawny kod 206
 * i fragment pliku, dzięki czemu pasek postępu działa również w środowisku
 * developerskim.
 */

function respondError(int $status, string $message): void
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

$requestedFile = $_GET['file'] ?? '';

if (!is_string($requestedFile) || trim($requestedFile) === '') {
    respondError(400, 'Brak pliku do odtworzenia.');
}

$audioDirectory = realpath(__DIR__ . '/../songs/audio');
$requestedPath = realpath(__DIR__ . '/../' . ltrim(str_replace('\\', '/', $requestedFile), '/'));

if ($audioDirectory === false || $requestedPath === false || !is_file($requestedPath)) {
    respondError(404, 'Nie znaleziono pliku audio.');
}

$normalizedPath = str_replace('\\', '/', $requestedPath);
$normalizedDirectory = rtrim(str_replace('\\', '/', $audioDirectory), '/') . '/';

if (!str_starts_with($normalizedPath, $normalizedDirectory)) {
    respondError(403, 'Dostęp do pliku jest zabroniony.');
}

$allowedExtensions = ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'wav', 'webm', 'flac'];
$extension = strtolower(pathinfo($normalizedPath, PATHINFO_EXTENSION));

if (!in_array($extension, $allowedExtensions, true)) {
    respondError(415, 'Nieobsługiwany format pliku audio.');
}

$mimeTypes = [
    'mp3' => 'audio/mpeg',
    'm4a' => 'audio/mp4',
    'aac' => 'audio/aac',
    'ogg' => 'audio/ogg',
    'oga' => 'audio/ogg',
    'wav' => 'audio/wav',
    'webm' => 'audio/webm',
    'flac' => 'audio/flac'
];

clearstatcache(true, $requestedPath);
$fileSize = filesize($requestedPath);

if ($fileSize === false || $fileSize <= 0) {
    respondError(404, 'Plik audio jest pusty.');
}

$start = 0;
$end = $fileSize - 1;
$rangeHeader = $_SERVER['HTTP_RANGE'] ?? null;

if (is_string($rangeHeader) && $rangeHeader !== '') {
    if (!preg_match('/^bytes=(\d*)-(\d*)$/', trim($rangeHeader), $matches)) {
        respondError(416, 'Nieprawidłowy zakres pliku.');
    }

    $hasStart = $matches[1] !== '';
    $hasEnd = $matches[2] !== '';

    if (!$hasStart && !$hasEnd) {
        respondError(416, 'Nieprawidłowy zakres pliku.');
    }

    if (!$hasStart) {
        $suffixLength = (int) $matches[2];

        if ($suffixLength <= 0) {
            respondError(416, 'Nieprawidłowy zakres pliku.');
        }

        $start = max(0, $fileSize - $suffixLength);
        $end = $fileSize - 1;
    } else {
        $start = (int) $matches[1];
        $end = $hasEnd ? min((int) $matches[2], $fileSize - 1) : $fileSize - 1;
    }

    if ($start > $end || $start >= $fileSize) {
        header('Content-Range: bytes */' . $fileSize);
        respondError(416, 'Żądany zakres wykracza poza plik.');
    }

    http_response_code(206);
    header(sprintf('Content-Range: bytes %d-%d/%d', $start, $end, $fileSize));
} else {
    http_response_code(200);
}

$length = $end - $start + 1;

header('Accept-Ranges: bytes');
header('Content-Type: ' . $mimeTypes[$extension]);
header('Content-Length: ' . $length);
header('Cache-Control: public, max-age=86400');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') {
    exit;
}

@set_time_limit(0);
@ini_set('zlib.output_compression', '0');

while (ob_get_level() > 0) {
    ob_end_clean();
}

$handle = fopen($requestedPath, 'rb');

if ($handle === false) {
    respondError(500, 'Nie udało się otworzyć pliku audio.');
}

fseek($handle, $start);
$remaining = $length;

while ($remaining > 0 && !feof($handle)) {
    $chunk = fread($handle, min(8192, $remaining));

    if ($chunk === false) {
        break;
    }

    echo $chunk;
    $remaining -= strlen($chunk);
}

fclose($handle);
