// Shared ARIMA email layout: logo header, readable body, one primary button and a brand footer.
// Table-based with inline styles so it renders in Gmail, Outlook (including Word-based desktop
// Outlook) and on phones. The same structure is used by the backend (app/email/layout.py in
// Arima-Executive-OS); keep the two in step.
export const SITE_URL = 'https://arimafinance.xyz';
export const LOGO_URL = `${SITE_URL}/email/arima-logo.png`;

// From the site's design tokens (features/cinematic-home/index.html): --ink, --fg, --gold, --f-sans.
const INK = '#010305';
const GOLD = '#e9c070';
const TEXT = '#14202b';
const MUTED = '#5b6876';
const PAGE = '#eef1f4';
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

export type EmailLocale = 'en' | 'fa';
export type EmailAction = { label: string; url: string };
export type EmailLayoutInput = {
  locale?: EmailLocale;
  /** Hidden preview line shown by inbox lists next to the subject. */
  preheader: string;
  heading: string;
  /** Paragraphs of plain text; escaped here. */
  paragraphs: string[];
  /** Label/value rows (escaped; values get dir="auto" so Persian names read right to left). */
  rows?: [string, string][];
  action?: EmailAction;
  /** Small print under the body, e.g. why the email was sent. */
  note?: string;
};

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Strips control characters so text cannot add lines or headers. */
export const singleLine = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, ' ');

const FOOTER = {
  en: { brand: 'ARIMA Finance', site: 'arimafinance.xyz', alt: 'ARIMA Finance' },
  fa: { brand: 'آریما فایننس', site: 'arimafinance.xyz', alt: 'لوگوی آریما فایننس' },
};

export function renderEmailHtml(input: EmailLayoutInput): string {
  const locale = input.locale ?? 'en';
  const rtl = locale === 'fa';
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  const f = FOOTER[locale];
  const p = (text: string) =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:26px;color:${TEXT};text-align:${align}">${escapeHtml(text)}</p>`;
  const rows = input.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;border-collapse:collapse">${input.rows
      .map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #e3e7eb;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};text-align:${align};white-space:nowrap;vertical-align:top" width="38%">${escapeHtml(k)}</td><td dir="auto" style="padding:9px 0;border-bottom:1px solid #e3e7eb;font-family:${FONT};font-size:15px;line-height:22px;color:${TEXT};text-align:${align};word-break:break-word">${escapeHtml(singleLine(v))}</td></tr>`)
      .join('')}</table>`
    : '';
  const button = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px" align="${align}"><tr><td bgcolor="${INK}" style="border-radius:6px;border:1px solid ${GOLD};mso-padding-alt:14px 28px"><a href="${escapeHtml(input.action.url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px">${escapeHtml(input.action.label)}</a></td></tr></table>
<p style="clear:both;margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};text-align:${align};word-break:break-all">${rtl ? 'اگر دکمه کار نکرد، این نشانی را در مرورگر باز کنید:' : 'If the button does not work, open this link:'}<br><a href="${escapeHtml(input.action.url)}" style="color:${TEXT}">${escapeHtml(input.action.url)}</a></p>`
    : '';
  const note = input.note
    ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};text-align:${align}">${escapeHtml(input.note)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.heading)}</title>
<!--[if mso]><style>table,td,p,a,h1{font-family:Arial,sans-serif!important}</style><![endif]-->
<style>@media (max-width:620px){.arima-card{width:100%!important}.arima-pad{padding-left:20px!important;padding-right:20px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${PAGE};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE}">
<tr><td align="center" style="padding:24px 12px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="arima-card" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:600px;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td align="center" bgcolor="${INK}" style="background:${INK};padding:28px 24px 24px">
<a href="${SITE_URL}" target="_blank"><img src="${LOGO_URL}" width="96" height="97" alt="${escapeHtml(f.alt)}" style="display:block;width:96px;height:97px;border:0;outline:none;text-decoration:none;color:#ffffff;font-family:${FONT};font-size:16px"></a>
</td></tr>
<tr><td bgcolor="${GOLD}" style="height:3px;line-height:3px;font-size:0;background:${GOLD}">&nbsp;</td></tr>
<tr><td class="arima-pad" dir="${dir}" style="padding:32px 40px 24px;text-align:${align}">
<h1 style="margin:0 0 18px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:bold;color:${INK};text-align:${align}">${escapeHtml(input.heading)}</h1>
${input.paragraphs.map(p).join('\n')}
${rows}
${button}
${note}
</td></tr>
<tr><td class="arima-pad" bgcolor="${INK}" dir="${dir}" style="background:${INK};padding:20px 40px;text-align:${align}">
<p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:#eef8ff;text-align:${align}"><strong style="color:${GOLD}">${escapeHtml(f.brand)}</strong> &middot; <a href="${SITE_URL}" target="_blank" style="color:#eef8ff;text-decoration:underline">${f.site}</a></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text alternative with the same content. */
export function renderEmailText(input: EmailLayoutInput): string {
  const lines = [input.heading, '', ...input.paragraphs.flatMap((t) => [t, ''])];
  if (input.rows?.length) lines.push(...input.rows.map(([k, v]) => `${k}: ${singleLine(v)}`), '');
  if (input.action) lines.push(`${input.action.label}: ${input.action.url}`, '');
  if (input.note) lines.push(input.note, '');
  lines.push('--', `${FOOTER[input.locale ?? 'en'].brand} · ${SITE_URL}`);
  return `${lines.join('\n')}\n`;
}
