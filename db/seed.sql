-- Opcjonalne metadane utworu trzymamy w kolumnie `details` jako JSON:
--   {"Label":"value"}            -> jedna wartość w grupie
--   {"Label":["v1","v2"]}        -> wiele wartości w grupie (OR w grupie)
-- Puste/NULL oznacza brak dodatkowych filtrów. Etykiety i wartości są
-- normalizowane po stronie klienta, więc seed nie zawiera ich na sztywno.
INSERT INTO songs (
    title,
    artist,
    audio_url,
    lrc_url,
    details
)
VALUES (
    'Last Christmas',
    'Wham!',
    'songs/audio/last-christmas.mp3',
    NULL,
    NULL
), (
    'W sumie nie jest źle',
    'Maryla Rodowicz',
    'songs/audio/w-sumie-nie-jest-zle.mp3',
    NULL,
    NULL
), (
    'Temperatura',
    'SKOLIM',
    'songs/audio/SKOLIM - Temperatura (Official Video) - SKOLIM Official.mp3',
    NULL,
    NULL
);
