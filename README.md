# Karaoke

Prosta aplikacja webowa do wyszukiwania piosenek i odtwarzania ich podczas ćwiczeń karaoke. Sprint 1 obejmuje listę utworów, wyszukiwanie po tytule lub wykonawcy oraz podstawowe sterowanie odtwarzaniem.

## Wymagania

- PHP 8 lub nowszy
- włączone rozszerzenia `pdo` i `pdo_sqlite`
- przeglądarka z obsługą JavaScript ES modules

## Uruchomienie

W katalogu projektu wykonaj:

```bash
php db/init.php
php -S localhost:8000
```

Następnie otwórz `http://localhost:8000` w przeglądarce.

Skrypt `db/init.php` usuwa poprzedni plik bazy, tworzy schemat i dodaje dane startowe. Uruchom go ponownie, gdy chcesz odtworzyć bazę demonstracyjną.

## Dodawanie plików audio

Pliki MP3 należy umieszczać w `songs/audio/`. Ścieżka zapisana w bazie musi odpowiadać nazwie pliku, na przykład `songs/audio/melodia-nocy.mp3`. Przykładowe rekordy wskazują na pliki, których nie ma w repozytorium, dlatego przed odtwarzaniem trzeba dodać własne pliki audio.

Folder `songs/lrc/` jest przygotowany na teksty zsynchronizowane w kolejnym sprincie.

## Struktura

- `index.html` - główny widok aplikacji
- `css/style.css` - responsywny, ciemny styl interfejsu
- `css/filters.css` - style panelu filtrowania repertuaru
- `css/recommendations.css` - style sekcji polecanych i popularnych utworów
- `js/api.js` - komunikacja z API
- `js/filters.js` - filtrowanie po gatunku, języku i dekadzie
- `js/song-metadata.js` - metadane filtrów dla utworów demonstracyjnych
- `js/recommendations.js` - polecane utwory i ranking najchętniej śpiewanych
- `js/popularity.js` - dynamiczne liczniki wyborów zapisane w przeglądarce
- `js/search.js` - wyszukiwanie z debounce 300 ms
- `js/player.js` - sterowanie audio i paskiem postępu
- `js/app.js` - uruchomienie aplikacji i renderowanie listy
- `api/songs.php` - endpoint listy i wyszukiwania piosenek
- `api/song-play.php` - globalna, atomowa aktualizacja liczby wyborów utworu
- `db/` - połączenie, schemat, seed i inicjalizacja SQLite
- `db/ensure-schema.php` - automatyczna migracja kolumny `play_count` dla istniejącej bazy
- `songs/audio/` - lokalne pliki audio
- `songs/lrc/` - przyszłe pliki LRC

Panel „Dopasuj repertuar” działa razem z wyszukiwaniem i pozwala zawęzić listę
według gatunku, języka oraz dekady. Metadane demonstracyjnych utworów są
zdefiniowane w `js/song-metadata.js`; przy rozbudowie bazy można je przenieść
do dodatkowych kolumn tabeli `songs` i zwracać z API.

Sekcje „Polecane piosenki” i „Najchętniej śpiewane” są budowane z aktualnej
listy zwróconej przez API. Ranking pokazuje pięć utworów z największą liczbą
wyborów. Liczniki są przechowywane w kolumnie `songs.play_count` w SQLite,
więc aktualizacja jest wspólna dla wszystkich użytkowników i przeglądarek.

## Zakres Sprintu 1

Zrealizowane są funkcje KAR-4 (play, pause, przewijanie, czas i obsługa błędu pliku) oraz KAR-6 (wyszukiwanie po tytule i wykonawcy). Teksty LRC, wyciszanie wokalu, logowanie, ulubione i nagrywanie nie są częścią tego sprintu.