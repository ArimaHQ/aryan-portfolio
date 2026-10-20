import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/route';
import { CINEMATIC_HOME_HTML } from '@/features/cinematic-home/html.generated';

const root = path.resolve(__dirname, '..');

describe('cinematic home', () => {
  it('serves the generated document as HTML', async () => {
    const response = GET();
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    const body = await response.text();
    expect(body.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(body).toContain('<script src="/cinematic/content.js"></script>');
    expect(body).toContain('<script src="/cinematic/app.js"></script>');
  });

  it('keeps the generated module in sync with index.html', () => {
    const source = readFileSync(path.join(root, 'features/cinematic-home/index.html'), 'utf8');
    expect(CINEMATIC_HOME_HTML).toBe(source);
  });

  it('links to the established public routes', () => {
    for (const route of ['/client-portfolio/', '/watch-intro/', '/choose-door/', '/research-projects/', '/portfolio-lab/', '/work-with-us/']) {
      expect(CINEMATIC_HOME_HTML).toContain(`href="${route}"`);
      expect(readFileSync(path.join(root, `app/(public)${route}page.tsx`), 'utf8').length).toBeGreaterThan(0);
    }
  });

  it('uses the official logo file for every logo', () => {
    expect(CINEMATIC_HOME_HTML.match(/src="\/cinematic\/arima-logo-official\.png"/g)).toHaveLength(3);
    const png = readFileSync(path.join(root, 'public/cinematic/arima-logo-official.png'));
    expect(png.readUInt32BE(16)).toBe(548);
    expect(png.readUInt32BE(20)).toBe(550);
  });
});
