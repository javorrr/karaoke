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

Pliki MP3 należy umieszczać w `songs/audio/`. Ścieżka zapisana w bazie musi odpowiadać nazwie pliku, na przykład `songs/audio/melodia-nocy.mp3`. Nazwy plików używają małych liter, myślników zamiast spacji i formy bez polskich znaków.

Pliki tekstów zsynchronizowanych należy umieszczać w `songs/lrc/` i nazywać tak samo jak pliki audio, zmieniając rozszerzenie na `.lrc`.

## Struktura

- `index.html` - główny widok aplikacji
- `css/style.css` - responsywny, ciemny styl interfejsu
- `css/filters.css` - style panelu filtrowania repertuaru
- `css/recommendations.css` - style sekcji polecanych i popularnych utworów
- `js/api.js` - komunikacja z API
- `js/filters.js` - filtrowanie po gatunku, języku i dekadzie
- `js/song-metadata.js` - metadane filtrów dla utworów
- `js/recommendations.js` - polecane utwory i ranking najchętniej śpiewanych
- `js/popularity.js` - dynamiczne liczniki wyborów zapisane w przeglądarce
- `js/search.js` - wyszukiwanie z debounce 300 ms
- `js/player.js` - sterowanie audio, paskiem postępu, głośnością i tempem
- `js/app.js` - uruchomienie aplikacji i renderowanie listy
- `api/songs.php` - endpoint listy i wyszukiwania piosenek
- `api/audio.php` - strumieniowanie plików audio z obsługą HTTP Range (przewijanie)
- `api/song-play.php` - globalna, atomowa aktualizacja liczby wyborów utworu
- `db/` - połączenie, schemat, seed i inicjalizacja SQLite
- `db/ensure-schema.php` - automatyczna migracja kolumny `play_count` dla istniejącej bazy
- `songs/audio/` - lokalne pliki audio
- `songs/lrc/` - pliki LRC odpowiadające plikom audio

Panel „Dopasuj repertuar” działa razem z wyszukiwaniem i pozwala zawęzić listę
według gatunku, języka oraz dekady. Metadane utworów są zdefiniowane w
`js/song-metadata.js`; przy rozbudowie bazy można je przenieść do dodatkowych
kolumn tabeli `songs` i zwracać z API.

Sekcje „Polecane piosenki” i „Najchętniej śpiewane” są budowane z aktualnej
listy zwróconej przez API. Ranking pokazuje pięć utworów z największą liczbą
wyborów. Liczniki są przechowywane w kolumnie `songs.play_count` w SQLite,
więc aktualizacja jest wspólna dla wszystkich użytkowników i przeglądarek.

## Odtwarzacz

Pasek postępu można przewijać myszą, dotykiem lub klawiaturą. W trakcie
przewijania tekst piosenki od razu podświetla właściwy wers, a kliknięcie
w dowolny wers przeskakuje do jego czasu. Odtwarzacz udostępnia też wyciszanie,
regulację głośności, tempo odtwarzania (0,5×–1,5×) oraz przewijanie o 10 sekund
w obie strony. Ustawienia głośności, wyciszenia, tempa i śledzenia tekstu są
zapamiętywane w przeglądarce.

Pliki audio są serwowane przez `api/audio.php`, ponieważ wbudowany serwer PHP
nie obsługuje zapytań częściowych (HTTP Range). Dzięki temu przewijanie działa
również po uruchomieniu projektu przez `php -S`.

## Zakres Sprintu 1

Zrealizowane są funkcje KAR-4 (play, pause, przewijanie, czas i obsługa błędu pliku), KAR-6 (wyszukiwanie po tytule i wykonawcy) oraz zsynchronizowany tekst LRC. Poza zakresem pozostają: wyciszanie samego wokalu (wymaga osobnej ścieżki instrumentalnej), logowanie, ulubione i nagrywanie.