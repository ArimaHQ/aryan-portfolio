"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPortfolioRisk,
  getTradePermission,
  getLatestNews,
  type PortfolioRisk,
  type TradePermission,
  type NewsItem,
} from "@/lib/intelligence-api";

const POLL_INTERVAL_MS = 60_000;

export default function MarketIntelligencePanel() {
  const [risk, setRisk] = useState<PortfolioRisk | null>(null);
  const [trade, setTrade] = useState<TradePermission | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [riskData, tradeData, newsData] = await Promise.all([
        getPortfolioRisk(),
        getTradePermission(),
        getLatestNews(),
      ]);
      setRisk(riskData);
      setTrade(tradeData);
      setNews(newsData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load market intelligence.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Start the initial request after the effect has subscribed to the refresh
    // lifecycle. The request itself updates UI state only after the scheduled
    // task runs, rather than synchronously during effect setup.
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);

  return (
    <section className="lab-panel">
      <p className="lab-eyebrow">ARIMA INTELLIGENCE</p>
      <h2>Live Market Risk</h2>

      {isLoading && !risk && (
        <p className="lab-muted">Loading market intelligence…</p>
      )}

      {error && (
        <p className="lab-error-text">{error}</p>
      )}

      {risk && (
        <div className="holding-strip">
          <div>
            <span>Portfolio Status</span>
            <strong>{risk.portfolio_control.portfolio_status}</strong>
          </div>
          <div>
            <span>Risk Limit</span>
            <strong>{risk.portfolio_control.allowed_risk_percent}%</strong>
          </div>
          <div>
            <span>Trade Permission</span>
            <strong>{trade?.allowed ? "ALLOWED" : "BLOCKED"}</strong>
          </div>
        </div>
      )}

      <br />

      <h2>Latest News</h2>

      {news.length === 0 && !isLoading && !error && (
        <p className="lab-muted">No news available.</p>
      )}

      {news.map((item) => (
        <article key={item.id} style={{ marginBottom: 15 }}>
          <strong>{item.title}</strong>
          <br />
          <small>{item.summary}</small>
        </article>
      ))}
    </section>
  );
}
