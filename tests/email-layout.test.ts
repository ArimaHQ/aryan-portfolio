import { describe, expect, it } from 'vitest';
import { LOGO_URL, renderEmailHtml, renderEmailText } from '@/lib/email/layout';

describe('shared email layout', () => {
  it('has the official logo with alt text, one button with a text fallback, and a plain-text version', () => {
    const input = { preheader: 'p', heading: 'Reset your password', paragraphs: ['Hello <b>Ada</b>,'], action: { label: 'Reset password', url: 'https://arimafinance.xyz/reset-password?token="x' } };
    const html = renderEmailHtml(input);
    expect(html).toContain(`src="${LOGO_URL}"`);
    expect(html).toContain('alt="ARIMA Finance"');
    expect(html).toContain('Hello &lt;b&gt;Ada&lt;/b&gt;,');
    expect(html).toContain('href="https://arimafinance.xyz/reset-password?token=&quot;x"');
    expect(renderEmailText(input)).toContain('Reset password: https://arimafinance.xyz/reset-password?token="x');
  });

  it('reads right to left for Persian', () => {
    const html = renderEmailHtml({ locale: 'fa', preheader: 'p', heading: 'سلام', paragraphs: ['متن'], rows: [['نام', 'آرین']] });
    expect(html).toContain('<html lang="fa" dir="rtl"');
    expect(html).not.toContain('text-align:left');
    expect(html).toContain('<td dir="auto"');
    expect(html).toContain('alt="لوگوی آریما فایننس"');
  });
});
