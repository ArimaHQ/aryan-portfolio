"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getLatestNews,
  type NewsItem,
} from "@/lib/intelligence-api";

const POLL_INTERVAL_MS = 60_000;

export default function MarketIntelligencePanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setNews(await getLatestNews());
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
      <h2>Portfolio Risk</h2>
      <p className="lab-muted">
        Portfolio risk and trade-permission state are unavailable because Arima
        Executive OS does not persist portfolio data.
      </p>

      <br />

      <h2>Latest News</h2>

      {isLoading && (
        <p className="lab-muted">Loading market intelligence…</p>
      )}

      {error && (
        <p className="lab-error-text">{error}</p>
      )}

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
