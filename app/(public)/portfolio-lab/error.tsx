'use client';

export default function PortfolioLabError({ reset }: { error: Error; reset: () => void }) {
  return <main className="portfolio-lab lab-error-page"><section><p className="lab-eyebrow">Portfolio workspace unavailable</p><h1>We could not verify a portfolio data source.</h1><p>No portfolio data has been displayed or changed. Retry after a verified provider is available.</p><button onClick={reset}>Retry connection check</button></section></main>;
}
