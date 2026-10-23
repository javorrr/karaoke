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
- `js/api.js` - komunikacja z API
- `js/search.js` - wyszukiwanie z debounce 300 ms
- `js/player.js` - sterowanie audio i paskiem postępu
- `js/app.js` - uruchomienie aplikacji i renderowanie listy
- `api/songs.php` - endpoint listy i wyszukiwania piosenek
- `db/` - połączenie, schemat, seed i inicjalizacja SQLite
- `songs/audio/` - lokalne pliki audio
- `songs/lrc/` - przyszłe pliki LRC

## Zakres Sprintu 1

Zrealizowane są funkcje KAR-4 (play, pause, przewijanie, czas i obsługa błędu pliku) oraz KAR-6 (wyszukiwanie po tytule i wykonawcy). Teksty LRC, wyciszanie wokalu, logowanie, ulubione i nagrywanie nie są częścią tego sprintu.