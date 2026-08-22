import { notFound } from 'next/navigation';
import {
  isPortfolioLabSection,
  portfolioLabSections,
  PortfolioLabUnavailable,
} from '@/components/portfolio-lab/PortfolioLabUnavailable';

export function generateStaticParams() {
  return portfolioLabSections
    .filter(([section]) => section !== 'overview')
    .map(([section]) => ({ section }));
}

export default async function PortfolioLabSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isPortfolioLabSection(section)) notFound();
  return <PortfolioLabUnavailable section={section} />;
}
