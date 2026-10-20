// ─── Arima home ───
// The cinematic home is a self-contained document (WebGL surface, four colour worlds, portals),
// served as-is so its scroll-driven scene runs without the React layout around it.
// Markup: features/cinematic-home/index.html · scripts and logo: public/cinematic/
import { CINEMATIC_HOME_HTML } from '@/features/cinematic-home/html.generated';

export const dynamic = 'force-static';

export function GET() {
  return new Response(CINEMATIC_HOME_HTML, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
