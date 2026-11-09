CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    instrumental_url TEXT,
    lrc_url TEXT,
    play_count INTEGER NOT NULL DEFAULT 0,
    details TEXT
);