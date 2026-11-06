import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  gotoLibrary,
  listStyleFiles,
  projectRoot,
  stylesDir,
} from './helpers.js';

const read = (file) => fs.readFileSync(file, 'utf8');
const allCss = () => listStyleFiles().map(read).join('\n');

test.describe('CSS integrity', () => {
  test('declares the layer order once and imports every stylesheet', async () => {
    const app = read(path.join(stylesDir, 'app.css'));

    expect(app).toContain(
      '@layer tokens, base, layout, components, motion, utilities;'
    );

    const imports = [...app.matchAll(
      /@import url\("([^"]+)"\)\s+layer\(([^)]+)\);/g
    )].map((match) => ({
      file: path.resolve(stylesDir, match[1]),
      layer: match[2],
    }));

    const importedFiles = new Set(imports.map((entry) => entry.file));
    const allFiles = listStyleFiles().filter(
      (file) => file !== path.join(stylesDir, 'app.css')
    );

    expect(allFiles.filter((file) => !importedFiles.has(file))).toEqual([]);
    expect(
      [...importedFiles].filter((file) => !allFiles.includes(file))
    ).toEqual([]);

    expect(imports[0].layer).toBe('tokens');
    expect(imports.at(-1).layer).toBe('utilities');
    expect(imports.filter((entry) => entry.layer === 'components')).toHaveLength(
      8
    );
  });

  test('index.html loads only the new stylesheet and no legacy CSS', async () => {
    const html = read(path.join(projectRoot, 'index.html'));
    const links = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(
      (match) => match[0]
    );

    expect(links).toHaveLength(1);
    expect(links[0]).toContain('styles/app.css');
    expect(html).not.toContain('<style');
    expect(html).not.toContain('style.css');
    expect(html).not.toContain('styles.css');
  });

  test('keeps !important inside utilities and the reduced-motion block', async () => {
    const offenders = [];

    for (const file of listStyleFiles()) {
      const lines = read(file).split(/\r?\n/);
      const isUtilities = path.basename(file) === 'utilities.css';
      const reduceAt = lines.findIndex((line) =>
        line.includes('@media (prefers-reduced-motion: reduce)')
      );

      lines.forEach((line, index) => {
        if (!line.includes('!important')) return;
        if (isUtilities) return;
        if (
          path.basename(file) === 'motion.css' &&
          reduceAt >= 0 &&
          index > reduceAt
        ) {
          return;
        }
        offenders.push(`${path.basename(file)}:${index + 1}`);
      });
    }

    expect(offenders).toEqual([]);
  });

  test('never uses raw vh or max-width breakpoints', async () => {
    const rawVh = [];
    const maxWidth = [];

    for (const file of listStyleFiles()) {
      const text = read(file);
      if (/(?<![\w-])\d*\.?\d+vh\b/.test(text)) {
        rawVh.push(path.basename(file));
      }
      if (/@media\s*\(max-width/.test(text)) {
        maxWidth.push(path.basename(file));
      }
    }

    expect(rawVh).toEqual([]);
    expect(maxWidth).toEqual([]);
  });

  test('defines every custom property it consumes', async () => {
    const css = allCss();
    const defined = new Set(
      [...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])
    );
    const runtime = new Set(['--progress', '--buffered', '--volume']);
    const missing = new Set();

    for (const match of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const token = match[1];
      if (!defined.has(token) && !runtime.has(token)) missing.add(token);
    }

    expect([...missing]).toEqual([]);

    for (const token of [
      '--paper',
      '--ink',
      '--cobalt',
      '--pink',
      '--pink-ink',
      '--stage',
      '--cream',
      '--font-display',
      '--font-body',
      '--font-accent',
      '--font-mono',
      '--e-out',
      '--e-in-out',
      '--e-stamp',
      '--t-fast',
      '--t-base',
      '--t-slow',
    ]) {
      expect(defined.has(token), `${token} should be defined`).toBe(true);
    }
  });

  test('uses the required modern CSS features', async () => {
    const css = allCss();

    for (const feature of [
      '@layer tokens, base, layout, components, motion, utilities;',
      '@container player',
      'subgrid',
      ':has(',
      'clamp(',
      'color-mix(',
      '@starting-style',
      'animation-timeline',
      '@view-transition',
      '@supports',
      '@media (forced-colors: active)',
      '@media print',
      '@media (prefers-reduced-motion: reduce)',
      'padding-inline',
      'margin-block',
      'inset-inline',
      'border-inline',
      'svh',
    ]) {
      expect(css, `missing ${feature}`).toContain(feature);
    }
  });

  test('does not add markdown documentation to the app source', async () => {
    const ignored = new Set([
      'node_modules',
      '.git',
      '.agents',
      '.github',
      '.artifacts',
      'test-results',
      'playwright-report',
      'songs',
    ]);
    const found = [];

    const walk = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (ignored.has(entry.name)) continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else if (entry.name.endsWith('.md')) {
          found.push(path.relative(projectRoot, fullPath));
        }
      }
    };

    walk(projectRoot);

    expect(found).toEqual([]);
  });

  test('the browser parses every sheet, loads every font and paints the tokens', async ({
    page,
  }) => {
    await gotoLibrary(page);

    const result = await page.evaluate(() => {
      const sheets = [];
      const visit = (sheet) => {
        if (!sheet) return;
        let rules = 0;
        try {
          rules = sheet.cssRules.length;
          for (const rule of sheet.cssRules) {
            if (rule.styleSheet) visit(rule.styleSheet);
          }
        } catch {
          rules = -1;
        }
        sheets.push({ href: sheet.href, rules });
      };

      for (const sheet of document.styleSheets) visit(sheet);

      return {
        sheets,
        fonts: {
          display: document.fonts.check('700 1rem "Bricolage Grotesque"'),
          body: document.fonts.check('400 1rem "Instrument Sans"'),
          accent: document.fonts.check(
            'italic 400 1rem "Instrument Serif"'
          ),
          mono: document.fonts.check('400 1rem "Geist Mono"'),
        },
        background: getComputedStyle(document.body).backgroundColor,
        color: getComputedStyle(document.body).color,
        fontFamily: getComputedStyle(document.body).fontFamily,
      };
    });

    expect(result.sheets.length).toBeGreaterThanOrEqual(14);
    expect(result.sheets.filter((sheet) => sheet.rules <= 0)).toEqual([]);
    expect(result.fonts).toEqual({
      display: true,
      body: true,
      accent: true,
      mono: true,
    });
    expect(result.background).toBe('rgb(244, 241, 232)');
    expect(result.color).toBe('rgb(20, 23, 46)');
    expect(result.fontFamily).toContain('Instrument Sans');
  });
});
