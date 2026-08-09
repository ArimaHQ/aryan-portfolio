// ─── Arima Universe — Public Routes Layout ───
// Hides Navigation on Arrival (/) to maintain cinematic immersion
// Hides Navigation/Footer on cinematic routes to prevent overlay

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen">{children}</main>;
}