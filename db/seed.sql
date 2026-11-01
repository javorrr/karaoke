INSERT INTO songs (title, artist, audio_url) VALUES
('Blask na scenie', 'Lena Wiosna', 'songs/audio/blask-na-scenie.mp3'),
('Cisza przed refrenem', 'Neonowe Sny', 'songs/audio/cisza-przed-refrenem.mp3'),
('Dalej niż wczoraj', 'Marek Północ', 'songs/audio/dalej-niz-wczoraj.mp3'),
('Głośniej niż deszcz', 'Klara i Fale', 'songs/audio/glosniej-niz-deszcz.mp3'),
('Kolorowy rytm', 'Zespół Parasol', 'songs/audio/kolorowy-rytm.mp3'),
('Melodia nocy', 'Echo Miasta', 'songs/audio/melodia-nocy.mp3'),
('Ostatni takt', 'Julia Luna', 'songs/audio/ostatni-takt.mp3'),
('Światła miasta', 'Tomasz Vibe', 'songs/audio/swiatla-miasta.mp3');

-- KAR-13: rzeczywisty plik audio i zsynchronizowany tekst

INSERT INTO songs (
    title,
    artist,
    audio_url,
    lrc_url
)
VALUES (
    'Piosenka testowa',
    'Wykonawca testowy',
    'songs/audio/piosenka-testowa.mp3',
    'songs/lrc/piosenka-testowa.lrc'
);
