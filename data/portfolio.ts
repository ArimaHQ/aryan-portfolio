export type PortfolioItem = {
  slug: string;
  title: string;
  category: string;
  ownership: "Arima Finance" | "Founder Project" | "Client Project" | "Research Project";
  description: string;
  technologies: string[];
  status: string;
  results: string;
  visual: "engine" | "memo" | "research" | "client";
  href: string;
};

export const portfolioItems: PortfolioItem[] = [
  {
    slug: "arima-finance-engine",
    title: "Arima Finance Engine",
    category: "Financial Technology",
    ownership: "Arima Finance",
    description: "A modular architecture for deterministic market analysis, risk planning and trade-lifecycle validation.",
    technologies: ["Python", "Deterministic Replay", "Risk Systems"],
    status: "In Active Development",
    results: "Public architecture release v0.1.0; production logic remains private.",
    visual: "engine",
    href: "https://github.com/ArimaHQ/Arima-Finance-Engine",
  },
  {
    slug: "investment-memorandum",
    title: "Investment Memorandum",
    category: "Investment Analysis",
    ownership: "Founder Project",
    description: "A public-safe case study in analytical review, modelling support and investment-document structure.",
    technologies: ["Financial Modelling", "Research", "Risk Review"],
    status: "Public Summary",
    results: "Completed analytical work; confidential figures and source documents are withheld.",
    visual: "memo",
    href: "#portfolio",
  },
  {
    slug: "ai-finance-research",
    title: "AI in Finance Research",
    category: "Quantitative Research",
    ownership: "Research Project",
    description: "Independent research into artificial intelligence and the changing financial landscape.",
    technologies: ["Financial Research", "AI", "Market Structure"],
    status: "External Research Record",
    results: "Working-paper record available through SSRN; status is maintained by the platform.",
    visual: "research",
    href: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5127689",
  },
  {
    slug: "transaction-presentation",
    title: "Transaction Presentation",
    category: "Client Project",
    ownership: "Client Project",
    description: "Research synthesis, financial consistency review and presentation support within a restricted engagement.",
    technologies: ["Investment Research", "Presentation", "Financial Review"],
    status: "Confidential — Not Published",
    results: "Represented through methodology only; no client data or outcome claim is published.",
    visual: "client",
    href: "#portfolio",
  },
];

export const engineModules = [
  "Market Data",
  "Macro Analysis",
  "Liquidity Engine",
  "Entry Confirmation",
  "Risk Management",
  "Trade Management",
  "News Intelligence",
  "Telegram Alerts",
] as const;
