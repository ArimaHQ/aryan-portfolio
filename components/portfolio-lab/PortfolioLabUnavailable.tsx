import Link from 'next/link';
import { PortfolioLabNavigation, type LabNavigationSection } from './PortfolioLabNavigation';

const sections = [
  ['overview', 'Overview'],
  ['performance', 'Performance'],
  ['holdings', 'Holdings'],
  ['transactions', 'Transactions'],
  ['risk', 'Risk Analytics'],
  ['allocation', 'Allocation'],
  ['cash-flow', 'Cash Flow'],
  ['ai-analyst', 'AI Portfolio Analyst'],
  ['reports', 'Reports'],
  ['settings', 'Account Settings'],
] as const satisfies readonly LabNavigationSection[];

export type PortfolioLabSection = (typeof sections)[number][0];

export const portfolioLabSections = sections;

export function isPortfolioLabSection(value: string): value is PortfolioLabSection {
  return sections.some(([id]) => id === value);
}

export function PortfolioLabUnavailable({ section = 'overview' }: { section?: PortfolioLabSection }) {
  return (
    <main className="portfolio-lab portfolio-lab-unavailable">
      <aside className="lab-sidebar">
        <Link className="lab-mark" href="/">
          <i>AF</i>
          <span>ARIMA<br />FINANCE</span>
        </Link>
        <div className="lab-nav-label">Portfolio Lab</div>
        <PortfolioLabNavigation sections={sections} />
        <div className="lab-sidebar-foot">
          <span>Workspace status</span>
          <strong>Data source not connected</strong>
        </div>
      </aside>

      <section className="lab-content">
        <header className="lab-topbar">
          <div><span>Portfolio Lab</span><b>/{section.replace('-', ' ')}</b></div>
          <div className="lab-source-status"><i className="unavailable" /> Unavailable</div>
        </header>

        <section className="lab-connection-state" aria-labelledby="portfolio-data-title">
          <p className="lab-eyebrow">Verified portfolio data required</p>
          <span className="lab-connection-status">Unavailable</span>
          <h1 id="portfolio-data-title">Data source not connected.</h1>
          <p>
            Portfolio Lab will remain empty until an authorised portfolio data source is connected and its provenance is verified.
            This route does not display model values, estimated performance, or placeholder holdings.
          </p>

          <div className="lab-connection-grid" aria-label="Portfolio Lab dependencies">
            <article><span>Holdings</span><strong>Awaiting verified source</strong></article>
            <article><span>Valuation</span><strong>Awaiting verified source</strong></article>
            <article><span>Risk &amp; reporting</span><strong>Awaiting verified source</strong></article>
          </div>

          <div className="lab-connection-actions">
            <Link href="/login">Sign in to your workspace</Link>
            <Link href="/">Return to Arima</Link>
          </div>
        </section>

        <footer className="lab-footer">
          Arima Finance · No simulated portfolio values or execution results are displayed.
        </footer>
      </section>
    </main>
  );
}
