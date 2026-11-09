<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function lyricsError(string $message, int $status): never
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * @return array{status: int, headers: string, body: string}
 */
function requestLyricsWithCurlBinary(string $url, array $headers): array
{
    if (!function_exists('proc_open')) {
        lyricsError('Nie udało się połączyć z LRCLIB.', 502);
    }

    $command = [
        PHP_OS_FAMILY === 'Windows' ? 'curl.exe' : 'curl',
        '--silent',
        '--show-error',
        '--connect-timeout',
        '5',
        '--max-time',
        '10',
        '--include'
    ];

    foreach ($headers as $header) {
        $command[] = '--header';
        $command[] = $header;
    }

    $command[] = $url;

    $process = proc_open(
        $command,
        [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ],
        $pipes
    );

    if (!is_resource($process)) {
        lyricsError('Nie udało się połączyć z LRCLIB.', 502);
    }

    $rawResponse = stream_get_contents($pipes[1]);
    $errorOutput = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);

    if ($rawResponse === false || $rawResponse === '' || $exitCode !== 0 || $errorOutput !== '') {
        lyricsError('Nie udało się połączyć z LRCLIB.', 502);
    }

    $headerEnd = strpos($rawResponse, "\r\n\r\n");
    $separatorLength = 4;

    if ($headerEnd === false) {
        $headerEnd = strpos($rawResponse, "\n\n");
        $separatorLength = 2;
    }

    if ($headerEnd === false) {
        lyricsError('LRCLIB zwrócił nieprawidłową odpowiedź.', 502);
    }

    $responseHeaders = substr($rawResponse, 0, $headerEnd);
    $body = substr($rawResponse, $headerEnd + $separatorLength);
    $status = 0;

    if (preg_match('/^HTTP\/\S+\s+(\d{3})/m', $responseHeaders, $matches)) {
        $status = (int) $matches[1];
    }

    return [
        'status' => $status,
        'headers' => $responseHeaders,
        'body' => $body
    ];
}

/**
 * @return array{status: int, headers: string, body: string}
 */
function requestLyrics(string $url, array $headers): array
{
    if (function_exists('curl_init')) {
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

        return [
            'status' => $status,
            'headers' => substr($rawResponse, 0, $headerSize),
            'body' => substr($rawResponse, $headerSize)
        ];
    }

    // Wbudowany serwer PHP nie zawsze ma włączone rozszerzenie cURL.
    // Gdy dostępny jest strumień HTTPS, korzystamy z niego bez dodatkowej zależności.
    if (in_array('https', stream_get_wrappers(), true)) {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers),
                'timeout' => 10,
                'ignore_errors' => true,
                'follow_location' => 0
            ]
        ]);

        $body = @file_get_contents($url, false, $context);

        if ($body === false) {
            lyricsError('Nie udało się połączyć z LRCLIB.', 502);
        }

        $responseHeaders = $http_response_header ?? [];
        $status = 0;

        if (
            isset($responseHeaders[0])
            && preg_match('/\s(\d{3})\s/', (string) $responseHeaders[0], $matches)
        ) {
            $status = (int) $matches[1];
        }

        return [
            'status' => $status,
            'headers' => implode("\r\n", $responseHeaders),
            'body' => $body
        ];
    }

    // Ostatnia deska ratunku dla lokalnego PHP bez cURL i OpenSSL: systemowy
    // curl, obecny domyślnie w Windows 10+ oraz w większości systemów Unix.
    return requestLyricsWithCurlBinary($url, $headers);
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
$responseHeaders = '';

for ($attempt = 0; $attempt < 2; $attempt += 1) {
    $result = requestLyrics($url, $headers);
    $status = $result['status'];
    $responseHeaders = $result['headers'];
    $response = $result['body'];

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
