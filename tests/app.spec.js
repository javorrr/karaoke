import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const songs = [
  {
    id: 1,
    title: 'Last Christmas',
    artist: 'Wham!',
    stream_url: '',
    play_count: 18,
    details: null,
  },
  {
    id: 2,
    title: 'W sumie nie jest źle',
    artist: 'Maryla Rodowicz',
    stream_url: '',
    play_count: 0,
    details: null,
  },
  {
    id: 3,
    title: 'Temperatura',
    artist: 'SKOLIM',
    stream_url: '',
    play_count: 5,
    details: null,
  },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/songs.php**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q')?.toLocaleLowerCase('pl') || '';
    const results = songs.filter((song) => `${song.title} ${song.artist}`.toLocaleLowerCase('pl').includes(query));
    await route.fulfill({ json: results });
  });
  await page.route('**/api/song-play.php', async (route) => {
    await route.fulfill({ json: { play_count: 1 } });
  });
  await page.route('**/api/lyrics.php**', async (route) => {
    await route.fulfill({ json: { lyrics: '[00:10.00]Test line.' } });
  });
});

test('renders the library and filters songs by search', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('song-row')).toHaveCount(3);
  await expect(page.getByTestId('song-count')).toHaveText('3 piosenek');

  await page.getByTestId('search-input').fill('Maryla');
  await expect(page.getByTestId('song-row')).toHaveCount(1);
  await expect(page.getByText('W sumie nie jest źle')).toBeVisible();
  await expect(page.getByTestId('song-count')).toHaveText('1 piosenka');
});

test('keeps focus on a filter after updating the library', async ({ page }) => {
  await page.goto('/');
  const genreFilter = page.locator('#genre-filter');

  await genreFilter.selectOption('Pop');

  await expect(genreFilter).toBeFocused();
  await expect(page.getByTestId('song-row')).toHaveCount(2);
});

test('opens a selected song in the player', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Śpiewaj: Last Christmas - Wham!' }).click();

  await expect(page.getByTestId('player-view')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Last Christmas' })).toBeVisible();
  await expect(page.getByTestId('back-button')).toBeVisible();
  await expect(page.locator('#player-view > .lyrics-container')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Głośność' })).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('button', { name: 'Wycisz' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('library-view')).toBeHidden();
});

test('seeks to a lyric when its line is clicked', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Śpiewaj: Last Christmas - Wham!' }).click();
  await page.getByRole('button', { name: 'Przewiń do: Test line.' }).click();

  await expect(page.locator('#current-time')).toHaveText('00:10');
});

test('persists theme selection in the document state', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('theme-jade').click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'jade');
  await expect(page.getByTestId('theme-jade')).toHaveAttribute('aria-checked', 'true');
});

test('adjusts and stores song volume from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Śpiewaj: Last Christmas - Wham!' }).click();

  const slider = page.getByRole('slider', { name: 'Głośność' });
  await expect(slider).toHaveAttribute('aria-valuenow', '1');
  await slider.press('ArrowDown');

  await expect(slider).toHaveAttribute('aria-valuenow', '0.99');
  await expect(slider).toHaveAttribute('aria-valuetext', '99%');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('karaoke:volume'))).toBe('0.99');
});

test('has no accessibility violations in the library @a11y', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('song-row')).toHaveCount(3);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();

  expect(results.violations).toEqual([]);
});