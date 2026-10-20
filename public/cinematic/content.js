/* ARIMA home — structured content.
   Every factual claim here is traceable to a repository source listed in `src` (see HANDOFF.md for commits).
   Illustrative material is marked `illustrative: true` and is never presented as live data. */
window.ARIMA = {

  statuses: {
    available:   { label: 'Available',            note: 'Publicly reachable today.' },
    local:       { label: 'Implemented locally',  note: 'Built and tested on a development machine. Not publicly available yet.' },
    testing:     { label: 'In testing',           note: 'Being tested before any pilot.' },
    pilot:       { label: 'Pilot preparation',    note: 'Being prepared for a limited pilot. Not launched.' },
    dev:         { label: 'In development',       note: 'Being built. Parts may exist, but it is not complete.' },
    planned:     { label: 'Planned',              note: 'On the roadmap. Not built yet.' },
    concept:     { label: 'Research concept',     note: 'An idea being explored. No product exists.' },
    unverified:  { label: 'Not yet verified',     note: 'We could not find the source for this in the repositories reviewed.' },
    disabled:    { label: 'Switched off',         note: 'Deliberately disabled and fails closed.' },
    notconfig:   { label: 'Not configured',       note: 'Designed for, but no provider is connected.' }
  },

  nav: [
    { id: 'about',       label: 'About ARIMA',          world: 0 },
    { id: 'ecosystem',   label: 'Ecosystem',            world: 0 },
    { id: 'founder',     label: 'Founder',              world: 0 },
    { id: 'data',        label: 'Data & Engineering',   world: 1 },
    { id: 'miniapp',     label: 'Mini App & alerts',    world: 1 },
    { id: 'research',    label: 'Research',             world: 2 },
    { id: 'behaviour',   label: 'Markets & behaviour',  world: 2 },
    { id: 'university',  label: 'University',           world: 2 },
    { id: 'etf',         label: 'ETF initiatives',      world: 2 },
    { id: 'brain',       label: 'Brain & OS',           world: 3 },
    { id: 'individuals', label: 'Individuals',          world: 3 },
    { id: 'businesses',  label: 'Businesses',           world: 3 },
    { id: 'world',       label: 'ARIMA World',          world: 3 },
    { id: 'contact',     label: 'Contact',              world: 3 },
    { id: 'guide',       label: 'Ask the guide',        world: 3 }
  ],

  routes: [
    { who: 'Individuals',               line: 'Understand your position, set a goal and see the uncertainty around it.', href: '#individuals' },
    { who: 'Businesses',                line: 'Test cash-flow, cost and revenue scenarios before they happen.',         href: '#businesses' },
    { who: 'Researchers & learners',    line: 'See the models, their assumptions and where they break.',                href: '#research' },
    { who: 'Technology explorers',      line: 'Follow data from its source to a traceable conclusion.',                 href: '#data' },
    { who: 'Collaborators',             line: 'Research, academic and long-term partnership conversations.',            href: '#contact' },
    { who: 'Founder & company',         line: 'Who is building ARIMA, and why.',                                        href: '#founder' }
  ],

  /* ---------- platforms: the 8 questions each ---------- */
  platforms: [
    {
      id: 'website', name: 'ARIMA Website', world: 0, status: ['available'],
      what: 'The public introduction to ARIMA and the way in to every other part of it.',
      who: 'Anyone meeting ARIMA for the first time.',
      problem: 'A new visitor needs one place to understand what ARIMA is and where to go next.',
      receives: 'Approved public copy, the cinematic film and links to each platform.',
      produces: 'Clear routes for individuals, businesses, researchers, collaborators and clients.',
      connects: 'Opens the private client area, World access and the research pages.',
      next: { label: 'Watch the current ARIMA film', href: '/watch-intro/' },
      src: ['aryan-portfolio-local · app/(public)', 'aryan-portfolio-local · components/PhaseOneFilm.tsx']
    },
    {
      id: 'miniapp', name: 'Telegram Mini App & alerts', world: 1, status: ['unverified'],
      what: 'A light way to receive ARIMA market alerts on your phone, inside Telegram.',
      who: 'People who want short, timely alerts without opening a dashboard.',
      problem: 'Important changes are easy to miss, and long dashboards are hard to read on a phone.',
      receives: 'Alert records shaped by the Brain and by the Finance Engine’s alert engine.',
      produces: 'A short alert that opens into its evidence, context and limits.',
      connects: 'Brain alerts, the Finance Engine alert engine and economic-calendar events.',
      limits: 'The Mini App and scanner source were not in the repositories reviewed. Telegram delivery stays disabled in the Brain and the operating layer until credentials and identity mapping are approved.',
      next: null,
      src: ['Arima-Brain-AUTHORITATIVE · brain/TRADING_DISCOVERY.md', 'Arima-Finance-Engine-v3 · telegram_bot.py, modules/alert_engine.py', 'Arima-Executive-OS · docs/production-readiness.md']
    },
    {
      id: 'brain', name: 'ARIMA Brain', world: 3, status: ['local'],
      what: 'The analytical core. It turns validated observations into typed knowledge, risk views and decision artifacts.',
      who: 'Every other ARIMA platform.',
      problem: 'A conclusion is only useful if you can trace it back to its inputs and assumptions.',
      receives: 'Validated observations from data sources, user-supplied context and research inputs.',
      produces: 'Observations, facts, interpretations, hypotheses and decisions, each with provenance and a content hash.',
      connects: 'Serves the operating layer, the World’s Brain hall, the wealth and business tools and the Research Lab.',
      limits: 'Tested locally on 17 Sep 2026: 566 tests, 549 passed, 17 skipped (provider- or infrastructure-gated). Not deployed to production.',
      next: { label: 'See the architecture', href: '#brain' },
      src: ['Arima-Brain-AUTHORITATIVE · brain/README.md', 'docs/arima-0-to-100-verification-20260917.md', 'docs/arima-canonical-ownership.md']
    },
    {
      id: 'os', name: 'Executive OS · operating layer', world: 3, status: ['local'],
      what: 'The coordination layer: workflows, tasks, approvals, permissions, audit, voice and background jobs.',
      who: 'ARIMA operators today; client workspaces later.',
      problem: 'Analysis needs controlled workflows: who may do what, with whose approval, and with a record.',
      receives: 'User requests, scheduled jobs, verified market metadata and, when switched on, read-only Brain context.',
      produces: 'Orchestrated runs, approvals, audit trails, briefings and on-screen experience events.',
      connects: 'Has a read-only Brain client, built but switched off by default.',
      limits: '563 tests passed locally. Not production-verified. AI execution and Telegram stay off until separately approved.',
      next: { label: 'See how it meets the Brain', href: '#brain' },
      src: ['Arima-Executive-OS · docs/experience-events.md, docs/production-readiness.md', 'Arima-Brain-AUTHORITATIVE · docs/arima-canonical-ownership.md']
    },
    {
      id: 'research', name: 'Research Lab', world: 2, status: ['local'],
      what: 'Quantitative instruments: bubble detection, valuation, volatility regimes, backtests, Monte Carlo, stress tests and risk measures.',
      who: 'Researchers, and the Brain itself.',
      problem: 'An idea has to be tested against a distribution of outcomes, not one historical path.',
      receives: 'Price history and supplied fundamentals. Fetching history by symbol is off by default.',
      produces: 'Regime states, valuation gaps, outcome distributions, Value at Risk and CVaR.',
      connects: 'Called by the Brain over an internal API. If it is down, the Brain degrades instead of failing.',
      next: { label: 'Explore the models', href: '#research' },
      src: ['Arima-Brain-AUTHORITATIVE · services/numerics/README.md', 'services/numerics/arima_numerics/validation/montecarlo.py']
    },
    {
      id: 'qtrader', name: 'QTrader · ARIMA Finance Engine', world: 1, status: ['available', 'local'],
      statusNote: 'Public demo: Available. Private engine: Implemented locally.',
      what: 'A seven-phase market analysis pipeline with risk planning, trade-lifecycle simulation and validation.',
      who: 'Research into disciplined, rule-based trade management.',
      problem: 'A market opportunity is only useful when its conditions and failure points are visible.',
      receives: 'Market history and official economic-calendar events (FOMC, PPI, BEA, ISM, labour data).',
      produces: 'Scored setups, risk plans, alerts and validation reports, including walk-forward and Monte Carlo analysis.',
      connects: 'Shares ARIMA’s risk discipline. It is a separate engine, not wired into the Brain.',
      limits: 'The public repository uses synthetic inputs and cannot trade. No performance or return claim is made. Live execution is not connected.',
      next: { label: 'Open the public demo on GitHub', href: 'https://github.com/ArimaHQ/Arima-Finance-Engine' },
      src: ['Arima-Finance-Engine · README.md, ROADMAP.md', 'Arima-Finance-Engine-v3 · modules/phase1_macro.py … phase7_scoring.py, config.py', 'aryan-portfolio-local · PhaseOneFilm.tsx (QTrader copy)']
    },
    {
      id: 'wealth', name: 'Personal finance tools', world: 3, status: ['local'],
      what: 'Tools to understand your financial position, test goals and compare alternatives.',
      who: 'Individuals.',
      problem: 'Most people see balances, not resilience: how long they could last, or what a goal really needs.',
      receives: 'Only the figures you choose to enter.',
      produces: 'Net worth, liquidity and resilience states, goal timelines, scenarios and side-by-side alternatives.',
      connects: 'Runs in the Brain with the same provenance and hashing as every other result.',
      limits: 'No bank connection, no account aggregation, no money movement and no regulated advice.',
      next: { label: 'Try the illustration', href: '#individuals' },
      src: ['Arima-Brain-AUTHORITATIVE · brain/wealth/index.js, brain/finance/index.js', 'services/numerics/arima_numerics/rightbrain/habits.py']
    },
    {
      id: 'business', name: 'Business finance tools & services', world: 3, status: ['local', 'available'],
      statusNote: 'Tools: Implemented locally. Research and advisory work: available by conversation.',
      what: 'Cash-flow models, NPV, loan schedules, credit and stress tests, burn and runway, plus founder-led research and advisory work.',
      who: 'Founders, finance leads and small teams.',
      problem: 'Slower receipts or rising costs reach the bank balance before they reach the report.',
      receives: 'Figures and assumptions you supply. There are no accounting or bank integrations.',
      produces: 'Cash-position scenarios, financing schedules, stress results and decision notes.',
      connects: 'Uses the Brain’s finance module and the Research Lab’s flow models.',
      next: { label: 'Try the cash-flow illustration', href: '#businesses' },
      src: ['Arima-Brain-AUTHORITATIVE · brain/finance/index.js', 'services/numerics/arima_numerics/flows/', 'aryan-portfolio-local · PhaseOneFilm.tsx (Financial Research services)']
    },
    {
      id: 'portfoliolab', name: 'AF Portfolio Lab', world: 2, status: ['dev'],
      what: 'Founder-funded model portfolios used for allocation, risk and performance research.',
      who: 'ARIMA’s own research.',
      problem: 'Allocation and risk ideas need a controlled place to be studied over time.',
      receives: 'The founder’s own capital and research rules.',
      produces: 'Internal research on allocation, risk utilisation and drawdown.',
      connects: 'Draws on the same risk framework as QTrader and the Brain.',
      limits: 'These are internal model portfolios. They do not represent external clients or externally managed assets. Figures shown on the site are interface demonstrations.',
      next: null,
      src: ['aryan-portfolio-local · PhaseOneFilm.tsx (Portfolio Lab disclosure)', 'data/portfolio-lab.ts (demo data)']
    },
    {
      id: 'world', name: 'ARIMA World', world: 3, status: ['local'],
      statusNote: 'Implemented locally. Public deployment is blocked on hosting and credentials.',
      what: 'A walkable 3D place where people can meet, listen and explore ARIMA together.',
      who: 'Invited members; later, learners, researchers and the community.',
      problem: 'Complex systems are easier to understand when you can walk through them with other people.',
      receives: 'Invitation-based access grants, member presence and, with consent, meeting speech.',
      produces: 'Shared meetings in the Assembly, captions, Brain-written meeting summaries and a Brain hall to explore.',
      connects: 'Meeting summaries and Brain-hall answers come from the canonical Brain.',
      limits: 'Tested locally with 23 browser sessions (20 admitted, the 21st refused). Phone layouts were tested in emulation only. The live pilot is not ready.',
      next: { label: 'Walk through World', href: '#world' },
      src: ['aryan-portfolio-local · docs/ARIMA-WORLD-FINAL-CERTIFICATION.md', 'docs/ARIMA-WORLD-MEETINGS-VISION-BRAIN.md', 'docs/ARIMA-WORLD-LIVE-PILOT-20260918.md', 'docs/ARIMA-WORLD-MASTERPLAN.md']
    },
    {
      id: 'university', name: 'ARIMA University', world: 2, status: ['concept'],
      what: 'A place to learn the ideas behind the tools: money, probability, markets, risk and behaviour.',
      who: 'Anyone who wants to understand before they act.',
      problem: 'Tools are only safe in the hands of someone who knows their assumptions and limits.',
      receives: 'The same models and examples used across ARIMA.',
      produces: 'Explanations that move from a model, to its assumptions, to an example, to its limits.',
      connects: 'Would sit beside the Research Lab and inside World.',
      limits: 'No University material was found in the repositories. There are no courses, instructors, certificates or enrolment.',
      next: null,
      src: ['No repository source. Scope from the brief only.']
    },
    {
      id: 'etf', name: 'ETF research', world: 2, status: ['local', 'concept'],
      statusNote: 'NAV premium/discount analysis: Implemented locally. Any wider ETF initiative: Research concept.',
      what: 'Research into existing exchange-traded funds, starting with whether a fund trades above or below its net asset value.',
      who: 'Researchers and, later, individuals comparing funds.',
      problem: 'A fund’s market price and the value of what it holds can drift apart.',
      receives: 'A supplied NAV per share and an evidenced market price.',
      produces: 'The premium or discount, with its evidence and timestamp.',
      connects: 'Part of the Brain’s Financial Intelligence Core, alongside its risk and scenario outputs.',
      limits: 'ARIMA does not operate an ETF, manage assets or accept investments.',
      next: { label: 'Read the ETF section', href: '#etf' },
      src: ['Arima-Brain-AUTHORITATIVE · docs/FINANCIAL_INTELLIGENCE_CORE.md', 'brain/intelligence/financial-core.js']
    }
  ],

  /* ---------- data sources actually present ---------- */
  sources: [
    { name: 'ECB Data Portal', what: 'USD/EUR reference exchange rates', kind: 'Exchange rates', status: 'local', src: 'Brain · docs/SOURCES.md' },
    { name: 'BBC News RSS', what: 'Headlines and permitted excerpts only', kind: 'News', status: 'local', src: 'Brain · docs/SOURCES.md' },
    { name: 'CoinGecko', what: 'Optional public crypto market data', kind: 'Market observations', status: 'local', src: 'Brain · docs/DATA_FABRIC.md' },
    { name: 'Twelve Data', what: 'Instrument identity and history; prices are not shown to customers', kind: 'Market observations', status: 'local', src: 'Executive OS · docs/market-data-provider.md' },
    { name: 'Dukascopy', what: 'Historical market data for the Finance Engine', kind: 'Market observations', status: 'local', src: 'Finance Engine v3 · modules/dukascopy_provider.py' },
    { name: 'Official economic releases', what: 'FOMC, PPI, BEA, ISM and labour-data events', kind: 'Macro releases', status: 'local', src: 'Finance Engine v3 · modules/*_alert.py' },
    { name: 'Company filings', what: 'Designed for; no provider connected', kind: 'Company', status: 'notconfig', src: 'Brain · docs/SOURCES.md' },
    { name: 'Social sources', what: 'Designed for; no provider connected', kind: 'Social', status: 'notconfig', src: 'Brain · docs/SOURCES.md' }
  ],

  /* engineering stages verified in code */
  stages: [
    { name: 'Select', line: 'Each source is catalogued with its licence and accessibility state before it is switched on.' },
    { name: 'Collect', line: 'Adapters fetch with bounded retries and record latency.' },
    { name: 'Validate', line: 'Invalid records are rejected and never stored.' },
    { name: 'Normalise', line: 'Values, timestamps and instrument identities are mapped to one canonical form.' },
    { name: 'Persist', line: 'Stored with source, raw and normalised values, quality and access class.' },
    { name: 'Observe', line: 'Repeat runs are idempotent at the observation boundary.' },
    { name: 'Trace', line: 'Every analysis keeps its lineage and an immutable content hash.' }
  ],

  /* ---------- research models ---------- */
  models: [
    { id: 'bootstrap', name: 'Historical bootstrap', status: 'local',
      explores: 'What could happen if future days look like past days, drawn at random.',
      assumes: 'Each day’s return is independent and comes from the observed history.',
      limits: 'Keeps real fat tails and skew, but breaks volatility clustering.' },
    { id: 'block', name: 'Block bootstrap', status: 'local',
      explores: 'The same, but keeps runs of consecutive days together.',
      assumes: 'Short-run patterns in the history repeat in blocks.',
      limits: 'Can only replay patterns the history already contains.' },
    { id: 'normal', name: 'Gaussian (parametric)', status: 'local',
      explores: 'A smooth bell-curve version of the history.',
      assumes: 'Returns are normally distributed with the observed mean and volatility.',
      limits: 'Understates tail risk. ARIMA offers it, but not as the default.' },
    { id: 'gbm', name: 'Geometric Brownian Motion', status: 'concept',
      explores: 'The textbook model of a price that compounds with constant drift and volatility.',
      assumes: 'Constant volatility, no jumps, log-normal prices.',
      limits: 'Calm by construction: no crashes, no regime changes.' },
    { id: 'studentt', name: 'Student-t returns', status: 'concept',
      explores: 'Fatter tails than the bell curve.',
      assumes: 'Returns follow a t-distribution with few degrees of freedom.',
      limits: 'Fat tails, but still no memory of yesterday’s volatility.' },
    { id: 'garch', name: 'GARCH volatility', status: 'concept',
      explores: 'Volatility that clusters: calm follows calm, storms follow storms.',
      assumes: 'Today’s variance depends on yesterday’s shock and variance.',
      limits: 'Sensitive to calibration; can understate sudden breaks.' },
    { id: 'regime', name: 'Regime switching', status: 'concept',
      explores: 'Markets that move between calm and stressed states.',
      assumes: 'A small number of states with fixed switching probabilities.',
      limits: 'States are inferred, not observed. ARIMA does measure a volatility-regime ratio today.' },
    { id: 'jump', name: 'Jump diffusion', status: 'concept',
      explores: 'Sudden gaps on top of normal movement.',
      assumes: 'Jumps arrive at random with a set size distribution.',
      limits: 'Jump size and frequency are hard to calibrate from short histories.' },
    { id: 'crash', name: 'Crash shock', status: 'concept',
      explores: 'One sudden market fall on a random day, on top of normal movement.',
      assumes: 'A single shock of a fixed size; everything else behaves as in the history.',
      limits: 'A what-if, not a forecast. ARIMA’s Research Lab runs fixed stress scenarios today, not random crash paths.' }
  ],

  journeyInd: [
    { name: 'Understand your position', line: 'Net worth, liquidity and a resilience state from the figures you enter: how long you could cover essentials.', tool: 'Wealth OS · REVIEW_FINANCIAL_STATE, LIQUIDITY', status: 'local' },
    { name: 'Define a goal', line: 'A target, a date and what it needs each month. Debt and protection gaps are checked alongside.', tool: 'Wealth OS · GOALS, DEBT, PROTECTION', status: 'local' },
    { name: 'Explore alternatives', line: 'Put options side by side: pay down debt, build a buffer or save toward the goal.', tool: 'Wealth OS · COMPARE_FINANCIAL_ALTERNATIVES', status: 'local' },
    { name: 'Examine uncertainty', line: 'Test what happens if income drops, costs rise or a goal slips, before it does.', tool: 'Wealth OS · RUN_FINANCIAL_SCENARIO', status: 'local' },
    { name: 'Choose the next step', line: 'You decide. ARIMA can prepare a paper action for you to review. It never moves money.', tool: 'Wealth OS · PREPARE_PAPER_ACTION', status: 'local' },
    { name: 'Review progress', line: 'Compare what happened with what you planned, and adjust.', tool: 'No personal review screen was found in the code', status: 'unverified' }
  ],

  miniChecks: [
    { name: 'Alert sending code', note: 'Exists in the Finance Engine; real delivery not verified', status: 'unverified' },
    { name: 'Telegram channel in the Brain and operating layer', note: 'Off until credentials and identity mapping are approved', status: 'disabled' },
    { name: 'Mini App and scanner source', note: 'Not in the repositories reviewed', status: 'unverified' },
    { name: 'Pilot', note: 'No pilot is described as launched', status: 'unverified' }
  ],

  next: [
    { name: 'Work with ARIMA', line: 'Volunteer, internship and future roles.', href: '/work-with-us/', status: 'available' },
    { name: 'Research & open projects', line: 'The public research pages, opening in stages.', href: '/research-projects/', status: 'available' },
    { name: 'Client portfolio access', line: 'For authorised client workspaces only.', href: '/client-portfolio/', status: 'available' },
    { name: 'Finance Engine demo', line: 'Public, synthetic and unable to trade.', href: 'https://github.com/ArimaHQ/Arima-Finance-Engine', status: 'available' },
    { name: 'Watch the ARIMA film', line: 'The current cinematic introduction.', href: '/watch-intro/', status: 'available' },
    { name: 'Collaborate or get in touch', line: 'A public contact address will appear here once it is confirmed.', href: null, status: 'unverified' }
  ],

  gaps: [
    ['Founder', 'Confirm the founder copy, and add a short motivation in your own words.'],
    ['Mini App', 'Where is the Mini App and scanner code, and what is its real pilot status?'],
    ['Scanner logic', 'How exactly do the 50, 100 and 200-candle volume checks work?'],
    ['Brain and OS', 'Is “ARIMA OS” the Executive OS, a future layer inside the Brain, or something else?'],
    ['University', 'What should University offer first, if anything, and when?'],
    ['ETF', 'Which ETF activity do you mean beyond research: screening, model portfolios or a future product?'],
    ['Services', 'Are individual and business tools self-service, advisory, or both?'],
    ['Contact', 'Which public contact address should the site use?'],
    ['Data rights', 'Which providers may be displayed to the public, and with what attribution?'],
    ['Regulation and entity', 'What regulatory wording and legal entity name should appear in the footer?'],
    ['Portfolio Lab', 'Should AF Portfolio Lab appear publicly, and with what figures?']
  ],

  worldPlaces: [
    { name: 'Arrival plaza', x: 90, y: 360, built: true },
    { name: 'Central plaza', x: 230, y: 300, built: true },
    { name: 'Civic boulevard', x: 330, y: 380, built: true },
    { name: 'Garden villas', x: 160, y: 200, built: true },
    { name: 'River terraces', x: 420, y: 410, built: true },
    { name: 'Processional Way', x: 400, y: 250, built: true },
    { name: 'Amphitheatre', x: 520, y: 330, built: true, note: 'locked landmark' },
    { name: 'ARIMA Assembly', x: 560, y: 200, built: true, note: '20 seats' },
    { name: 'Summit ascent', x: 700, y: 150, built: true },
    { name: 'Brain hall', x: 840, y: 90, built: true, note: 'Left · Middle · Right' },
    { name: 'Research Center', x: 720, y: 300, built: false },
    { name: 'Update Center', x: 620, y: 410, built: false },
    { name: 'Mountain Observatory', x: 930, y: 190, built: false },
    { name: 'Research Valley', x: 860, y: 330, built: false },
    { name: 'Coastal District', x: 280, y: 430, built: false }
  ],
  worldPath: ['Arrival plaza', 'Central plaza', 'Processional Way', 'ARIMA Assembly', 'Summit ascent', 'Brain hall'],

  dnaScenes: [
    { k: 'Scene A · Sources', h: 'Distinct streams', t: 'Exchange rates, headlines, market observations and official releases arrive separately, each with its own format, timing and reliability.' },
    { k: 'Scene B · Engineering', h: 'ARIMA’s own work', t: 'Each stream is collected, validated, normalised, stored with its source and traced. Invalid records drop out here and are never stored.' },
    { k: 'Scene C · The helix', h: 'Evidence and context, intertwined', t: 'The clean streams twist into two strands: market evidence on one, context on the other. Every rung is a link the Brain can trace back to a source.' },
    { k: 'Scene D · Pathways', h: 'Into the Brain', t: 'From the helix, pathways open into the Brain’s work: evidence, context, research, valuation, regime, risk and scenarios.' },
    { k: 'Scene E · Outputs', h: 'Something useful, with its status', t: 'Each pathway ends in something a person can use. Every output carries its real status today.' },
    { k: 'Scene F · Decision', h: 'A person decides', t: 'Outputs inform a human decision. Permission and audit come next. Paper execution exists. Live execution is switched off and fails closed.' }
  ],

  outputs: [
    { name: 'Individual scenario', status: 'local',    line: 'How long savings last; when a goal is reached.' },
    { name: 'Business planning view', status: 'local', line: 'Cash position under slower receipts or higher costs.' },
    { name: 'Research simulation', status: 'local',    line: 'A distribution of outcomes, with its assumptions.' },
    { name: 'Mini App alert', status: 'unverified',    line: 'A short alert that opens into its evidence.' },
    { name: 'Learning experience', status: 'concept',  line: 'A model explained through its limits.' },
    { name: 'World experience', status: 'local',       line: 'A meeting summary written by the Brain.' },
    { name: 'ETF example', status: 'local',            line: 'NAV premium or discount, with evidence.' }
  ],

  founder: {
    name: 'Aryan Heidari',
    role: 'Founder of Arima Finance',
    fields: 'Finance · Quantitative Research · Technology',
    education: [
      { degree: 'PhD in Finance and Economics', place: '' },
      { degree: 'MSc Finance & Accounting', place: 'Anglia Ruskin University, London' },
      { degree: 'BSc Avionics Engineering', place: 'National Aviation University, Kyiv' }
    ],
    environments: [
      { org: 'Bank of England', area: 'Research Analyst, working on the central bank’s strategic gold reserves' },
      { org: 'EY', area: 'Junior Accountant' },
      { org: 'Artin & Partners', area: 'Investment Banking Analyst' },
      { org: 'Samuel & Co Trading', area: 'FX Trading' },
      { org: 'Technology entrepreneurship', area: 'Founder projects' }
    ],
    qualifications: ['Passed Level III of the CFA Program.'],
    statement: 'Building financial systems where research, technology and risk discipline converge.',
    disclaimer: 'Organisation names refer to the founder’s professional background and do not imply endorsement or affiliation with Arima Finance.',
    src: 'Founder-provided facts (20 Oct 2026) and components/PhaseOneFilm.tsx'
  },

  links: {
    film: '/watch-intro/',
    workWithUs: '/work-with-us/',
    research: '/research-projects/',
    client: '/client-portfolio/',
    engineDemo: 'https://github.com/ArimaHQ/Arima-Finance-Engine'
  }
};
