// Optional neural voice for the Journey guide (Azure AI Speech). When AZURE_SPEECH_KEY and
// AZURE_SPEECH_REGION are not set, this returns 501 and the guide uses the browser's own voice.
import { serverEnv, speechConfig } from '@/lib/access-requests/config';

export const dynamic = 'force-dynamic';

const VOICES = { en: { lang: 'en-GB', voice: 'en-GB-SoniaNeural' }, fa: { lang: 'fa-IR', voice: 'fa-IR-DilaraNeural' } } as const;
const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] as string);

export async function POST(request: Request) {
  const config = speechConfig(serverEnv());
  if (!config) return Response.json({ error: 'speech_not_configured' }, { status: 501 });
  const origin = request.headers.get('origin') ?? '';
  if (!/^https:\/\/(www\.)?arimafinance\.xyz$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { text?: unknown; lang?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text.replace(/[\u0000-\u001f]/g, ' ').trim() : '';
  if (!text || text.length > 700) return Response.json({ error: 'invalid_text' }, { status: 422 });
  const voice = VOICES[body?.lang === 'fa' ? 'fa' : 'en'];
  const ssml = `<speak version="1.0" xml:lang="${voice.lang}"><voice name="${voice.voice}"><prosody rate="-4%">${escapeXml(text)}</prosody></voice></speak>`;
  const upstream = await fetch(`https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'arima-journey-guide',
    },
    body: ssml,
  }).catch(() => null);
  if (!upstream || !upstream.ok) return Response.json({ error: 'speech_unavailable' }, { status: 502 });
  return new Response(upstream.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
}
