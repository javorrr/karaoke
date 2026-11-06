<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function lyricsError(string $message, int $status): never
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$title = trim((string) ($_GET['title'] ?? ''));
$artist = trim((string) ($_GET['artist'] ?? ''));

if ($title === '' || strlen($title) > 200 || strlen($artist) > 200) {
    lyricsError('Brak poprawnej nazwy piosenki.', 400);
}

$search = $artist === '' ? $title : $title . ' ' . $artist;
$url = 'https://lrclib.net/api/search?' . http_build_query(['q' => $search]);
$headers = [
    'Accept: application/json',
    'User-Agent: Karaoke v1.0 (https://github.com/javorrr/karaoke)'
];

$response = null;
$status = 0;

for ($attempt = 0; $attempt < 2; $attempt += 1) {
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADER => true
    ]);

    $rawResponse = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $headerSize = (int) curl_getinfo($curl, CURLINFO_HEADER_SIZE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($rawResponse === false || $curlError !== '') {
        lyricsError('Nie udało się połączyć z LRCLIB.', 502);
    }

    $responseHeaders = substr($rawResponse, 0, $headerSize);
    $response = substr($rawResponse, $headerSize);

    if ($status !== 429 || $attempt === 1) {
        break;
    }

    $retryAfter = 0;
    if (preg_match('/^Retry-After:\s*(\d+)/mi', $responseHeaders, $matches)) {
        $retryAfter = min((int) $matches[1], 5);
    }

    usleep($retryAfter * 1000000 + random_int(200000, 500000));
}

if ($status === 404) {
    lyricsError('Nie znaleziono tekstu tej piosenki.', 404);
}

if ($status < 200 || $status >= 300) {
    lyricsError('LRCLIB nie zwrócił tekstu piosenki.', 502);
}

$data = json_decode($response ?? '', true);
$lyrics = '';

if (is_array($data)) {
    foreach ($data as $result) {
        if (!is_array($result)) {
            continue;
        }

        $candidate = trim((string) ($result['syncedLyrics'] ?? $result['plainLyrics'] ?? ''));
        if ($candidate !== '') {
            $lyrics = $candidate;
            break;
        }
    }
}

if (json_last_error() !== JSON_ERROR_NONE) {
    lyricsError('LRCLIB zwrócił nieprawidłową odpowiedź.', 502);
}

if ($lyrics === '') {
    lyricsError('Nie znaleziono tekstu tej piosenki.', 404);
}

echo json_encode([
    'lyrics' => $lyrics,
    'source' => 'lrclib'
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
