"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ensureAnimationPlugins, gsap, ScrollTrigger } from "@/lib/animation-runtime";

const marketData = [
  "XAUUSD  2384.62", "BTCUSD  67241.30", "SPX  5297.14", "VOL  0.184",
  "ALPHA  +0.428", "BETA  1.180", "RISK  0.720", "LIQUIDITY",
  "EXECUTION", "SIGNAL  0.840", "VAR  1.62%", "σ  0.217",
  "Δ  0.428", "14:32:08Z", "ORDER FLOW", "MARKET DEPTH",
];

const institutionDistricts = [
  [["HSBC", "LIQUIDITY · CAPITAL"], ["Barclays", "CREDIT · MARKETS"]],
  [["JPMorgan", "GLOBAL BANKING"], ["Goldman Sachs", "CAPITAL · ADVISORY"], ["BlackRock", "ASSET ALLOCATION"], ["Morgan Stanley", "WEALTH · MARKETS"]],
  [["Bloomberg", "MARKET INFORMATION"], ["Nasdaq", "EXCHANGE DATA"]],
  [["UBS", "GLOBAL WEALTH"], ["Deutsche Bank", "FX · CREDIT"], ["Nomura", "GLOBAL MARKETS"]],
  [["Citadel", "QUANTITATIVE SYSTEMS"], ["Jane Street", "LIQUIDITY · EXECUTION"]],
  [["Bank of England", "MONETARY INFRASTRUCTURE"], ["CME Group", "DERIVATIVES · CLEARING"]],
];

const rotationLabels = ["CAPITAL", "LIQUIDITY", "RISK", "EXECUTION", "ALPHA", "MARKET DATA"];

const intelligenceStreams = ["VALUATION", "RESEARCH", "RISK", "ALLOCATION", "MARKET DATA", "EXECUTION"];
const divisionDetails = [
  {
    index: "01",
    title: "Investment Banking & Financial Intelligence",
    lead: "Institutional research and decision intelligence",
    items: ["Financial modelling", "Valuation", "Investment research", "Investment memoranda", "Market intelligence", "Company analysis", "Scenario analysis", "Forecasting", "Financial data engineering", "Risk analysis", "Quantitative modelling", "Capital market research", "Professional presentation materials"],
  },
  {
    index: "02",
    title: "Projects & Technology",
    lead: "Arima Finance Engine",
    items: ["Algorithmic trading systems", "Financial data platforms", "AI research", "Quantitative tools", "Trading automation", "Risk management systems", "Financial dashboards", "Portfolio analytics", "Technology prototypes", "Research projects", "Client and collaborative projects", "Personal Risk Management Core"],
  },
  {
    index: "03",
    title: "AF Portfolio Lab",
    lead: "Live-funded research environment",
    items: ["Equities", "IPO opportunities", "Options", "Cash", "Limited futures allocation", "Portfolio value", "Weekly return", "Total return", "Drawdown", "Allocation", "Risk score", "Open positions", "Asset allocation", "Performance charts", "Exposure"],
  },
];

const founderStages = [
  ["ENGINEERING FOUNDATIONS", "Avionics Engineering", "Systems Thinking", "Probability & Modelling"],
  ["FINANCE & MARKETS", "Finance & Accounting", "Financial Markets", "Investment Research", "Risk Analysis"],
  ["QUANTITATIVE INTELLIGENCE", "Quantitative Research", "Financial Modelling", "Algorithm Development", "Portfolio Analytics"],
];
const founderCapabilities = ["Financial Modelling", "Valuation", "Market Research", "Quantitative Analysis", "ARIMA / SARIMA / SARIMAX", "Monte Carlo Simulation", "Portfolio Optimisation", "Volatility Analysis", "Risk Management", "Algorithmic Trading", "Python", "TradingView / Pine Script", "Financial Presentation"];
const engineWorkflow = ["Market Data", "Macro Context", "Liquidity Analysis", "Entry Confirmation", "Risk Plan", "Trade Management", "Alert Delivery"];
const engineControls = ["Risk per setup", "Position sizing", "Exposure limits", "Drawdown limits", "Round-level controls", "Daily-loss controls", "Stop management", "Reward-to-risk validation", "Trade lifecycle management"];
const portfolioProfiles = ["Growth 01", "Balanced 02", "Income 03", "Opportunity 04", "Defensive 05"];
const quantSystems = [["AEXT LTD Robot", "Live Research"], ["Precision Confluence Strategy", "Historical Study"], ["Multi-timeframe market framework", "Prototype"], ["EMA / MACD / RSI systems", "Research Prototype"], ["TradingView / Pine Script tools", "In Development"]];
const connectGateways = [
  ["Work With Arima", "Institutional research, financial intelligence and technology."],
  ["Research Collaboration", "Academic, quantitative and industry collaboration."],
  ["Let's Build Together", "New ideas, products and long-term partnerships."],
];
const contactLinks = [
  ["Email", "aryan.hd@outlook.com", "mailto:aryan.hd@outlook.com"],
  ["LinkedIn", "Public profile", "#traditional-contact"],
  ["GitHub", "github.com/ArimaHQ", "https://github.com/ArimaHQ"],
  ["Company Profile (PDF)", "PDF forthcoming", "#traditional-contact"],
  ["Resume / CV (PDF)", "PDF forthcoming", "#traditional-contact"],
];
const websiteNav = ["Home", "About", "Projects", "Portfolio Lab", "Founder", "Research", "Contact"];

export function PhaseOneFilm() {
  const [websiteMode, setWebsiteMode] = useState(false);
  const [filmDebug, setFilmDebug] = useState({ label: "arrival", progress: 0, scene: "Arrival" });
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const ambient = useRef<HTMLDivElement>(null);
  const firstLight = useRef<HTMLDivElement>(null);
  const candle = useRef<HTMLDivElement>(null);
  const candleBody = useRef<HTMLDivElement>(null);
  const candleWick = useRef<HTMLDivElement>(null);
  const portal = useRef<HTMLDivElement>(null);
  const universe = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const dataCloud = useRef<HTMLDivElement>(null);
  const dataItems = useRef<HTMLSpanElement[]>([]);
  const chartPaths = useRef<SVGPathElement[]>([]);
  const convergence = useRef<HTMLDivElement>(null);
  const afMark = useRef<SVGSVGElement>(null);
  const afPaths = useRef<SVGPathElement[]>([]);
  const identity = useRef<HTMLDivElement>(null);
  const dissolveParticles = useRef<HTMLSpanElement[]>([]);
  const cityScene = useRef<HTMLDivElement>(null);
  const cityCamera = useRef<HTMLDivElement>(null);
  const rotationChamber = useRef<HTMLDivElement>(null);
  const rotationPlanes = useRef<HTMLDivElement[]>([]);
  const cityFog = useRef<HTMLDivElement>(null);
  const avenue = useRef<HTMLDivElement>(null);
  const avenueWorld = useRef<HTMLDivElement>(null);
  const districts = useRef<HTMLDivElement[]>([]);
  const roadPulse = useRef<HTMLDivElement>(null);
  const destination = useRef<HTMLDivElement>(null);
  const headquarters = useRef<HTMLDivElement>(null);
  const entrance = useRef<HTMLDivElement>(null);
  const entranceDoors = useRef<HTMLDivElement[]>([]);
  const hall = useRef<HTMLDivElement>(null);
  const hallRing = useRef<HTMLDivElement>(null);
  const intelligenceCore = useRef<HTMLDivElement>(null);
  const coreShells = useRef<HTMLSpanElement[]>([]);
  const coreIdentity = useRef<HTMLDivElement>(null);
  const coreStreams = useRef<HTMLSpanElement[]>([]);
  const divisionOrbit = useRef<HTMLDivElement>(null);
  const divisionPlatforms = useRef<HTMLElement[]>([]);
  const portfolioDisclosure = useRef<HTMLDivElement>(null);
  const transitionBeam = useRef<HTMLDivElement>(null);
  const transitionDarkness = useRef<HTMLDivElement>(null);
  const founderScene = useRef<HTMLDivElement>(null);
  const founderBeam = useRef<HTMLDivElement>(null);
  const founderFigure = useRef<HTMLDivElement>(null);
  const founderFigurePaths = useRef<SVGPathElement[]>([]);
  const founderIdentity = useRef<HTMLDivElement>(null);
  const founderStageNodes = useRef<HTMLElement[]>([]);
  const experienceField = useRef<HTMLDivElement>(null);
  const capabilityField = useRef<HTMLDivElement>(null);
  const capabilityNodes = useRef<HTMLSpanElement[]>([]);
  const founderConnections = useRef<HTMLDivElement>(null);
  const founderFinal = useRef<HTMLDivElement>(null);
  const projectCorridor = useRef<HTMLDivElement>(null);
  const founderFade = useRef<HTMLDivElement>(null);
  const projectsFilm = useRef<HTMLDivElement>(null);
  const projectsEntry = useRef<HTMLDivElement>(null);
  const engineWorld = useRef<HTMLDivElement>(null);
  const engineTitle = useRef<HTMLDivElement>(null);
  const marketMonitors = useRef<HTMLDivElement>(null);
  const engineWorkflowNode = useRef<HTMLDivElement>(null);
  const riskWorld = useRef<HTMLDivElement>(null);
  const tradeArchitecture = useRef<HTMLDivElement>(null);
  const validationWorld = useRef<HTMLDivElement>(null);
  const portfolioWorld = useRef<HTMLDivElement>(null);
  const profileField = useRef<HTMLDivElement>(null);
  const labDisclosure = useRef<HTMLDivElement>(null);
  const quantWorld = useRef<HTMLDivElement>(null);
  const researchWorld = useRef<HTMLDivElement>(null);
  const technologyWorld = useRef<HTMLDivElement>(null);
  const projectConstellation = useRef<HTMLDivElement>(null);
  const projectEndCorridor = useRef<HTMLDivElement>(null);
  const projectEndFade = useRef<HTMLDivElement>(null);
  const connectFilm = useRef<HTMLDivElement>(null);
  const connectCorridor = useRef<HTMLDivElement>(null);
  const controlRoom = useRef<HTMLDivElement>(null);
  const connectMessage = useRef<HTMLDivElement>(null);
  const gatewayHall = useRef<HTMLDivElement>(null);
  const contactDetails = useRef<HTMLDivElement>(null);
  const exitFlight = useRef<HTMLDivElement>(null);
  const finalDataCollapse = useRef<HTMLDivElement>(null);
  const finalAfReveal = useRef<HTMLDivElement>(null);
  const finalActions = useRef<HTMLDivElement>(null);

  const replayJourney = () => {
    setWebsiteMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enterWebsite = () => {
    setWebsiteMode(true);
    window.setTimeout(() => {
      document.getElementById("standard-website")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  useLayoutEffect(() => {
    if (!root.current || !stage.current || !ensureAnimationPlugins()) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      if (reducedMotion) {
        gsap.set([cityScene.current, avenue.current, headquarters.current, hall.current, divisionOrbit.current, portfolioDisclosure.current, founderScene.current, founderFigure.current, founderFinal.current], { opacity: 1 });
        gsap.set(destination.current, { opacity: 0 });
        gsap.set([firstLight.current, candle.current, portal.current, dataCloud.current, convergence.current, afMark.current, identity.current, rotationChamber.current], { opacity: 0 });
        return;
      }

      gsap.set([entrance.current, hall.current, divisionOrbit.current, founderScene.current, projectsFilm.current, connectFilm.current], { opacity: 0, visibility: "hidden", pointerEvents: "none" });
      gsap.set([...entranceDoors.current, ...divisionPlatforms.current], { opacity: 1, visibility: "visible", pointerEvents: "none" });
      gsap.set([coreIdentity.current, portfolioDisclosure.current, founderIdentity.current, connectMessage.current, contactDetails.current], { opacity: 0, visibility: "hidden", pointerEvents: "none" });

      const travel = innerWidth < 768 ? 41500 : 56440;
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "arima-film-master",
          trigger: root.current,
          start: "top top",
          end: `+=${travel}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (process.env.NODE_ENV !== "development") return;
            const point = self.progress * 828;
            const active = point < 58 ? ["arrival", "Arrival"] : point < 108 ? ["data-universe", "Financial data universe"] : point < 200 ? ["financial-district", "Financial district"] : point < 242 ? ["hq-entrance", "Arima HQ entrance"] : point < 292 ? ["hq-hall", "Arima HQ hall"] : point < 350 ? ["divisions", "Three divisions"] : point < 500 ? ["founder", "Founder transition"] : point < 680 ? ["projects", "Project systems"] : ["connect", "Final transition"];
            setFilmDebug({ label: active[0], progress: self.progress, scene: active[1] });
            const scheduled = [["film-hq-entrance", 200], ["film-hq-identity", 260], ["film-division-1", 304], ["film-division-2", 307], ["film-division-3", 310], ["film-founder-identity", 372]] as const;
            scheduled.forEach(([id, start]) => {
              const node = root.current?.querySelector<HTMLElement>(`#${id}`);
              if (node && timeline.time() > start + 12 && Number.parseFloat(getComputedStyle(node).opacity) === 0) console.warn("[PhaseOneFilm] entrance passed while hidden", { id, start, time: timeline.time() });
            });
          },
        },
      });

      [["arrival", 0], ["data-universe", 58], ["financial-district", 108], ["hq-entrance", 200], ["hq-hall", 242], ["divisions", 292], ["founder", 350], ["projects", 500], ["connect", 680]].forEach(([label, position]) => timeline.addLabel(label as string, position as number));

      timeline
        .set(stage.current, { backgroundColor: "#000" }, 0)
        .fromTo(firstLight.current, { opacity: 0, scale: .05 }, { opacity: 1, scale: 1, duration: 10 }, 0)
        .fromTo(ambient.current, { opacity: 0 }, { opacity: .45, duration: 10 }, 0)

        .fromTo(candle.current, { opacity: 0, scale: .08, rotate: -5 }, { opacity: 1, scale: .42, rotate: 0, duration: 7 }, 10)
        .fromTo(candleBody.current, { height: 2, width: 22, borderRadius: 30 }, { height: 230, width: 82, borderRadius: 5, duration: 11 }, 10)
        .fromTo(candleWick.current, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 9 }, 13)
        .to(firstLight.current, { opacity: .35, scale: 2.6, duration: 10 }, 15)

        .to(candle.current, { scale: 5.5, z: 500, duration: 20, ease: "power2.in" }, 25)
        .to(candleBody.current, { boxShadow: "0 0 140px 45px rgba(123,190,255,.52)", duration: 20 }, 25)
        .to(ambient.current, { opacity: .9, scale: 1.7, duration: 20 }, 25)

        .fromTo(portal.current, { opacity: 0, scale: .1 }, { opacity: 1, scale: 9, duration: 15, ease: "power3.in" }, 45)
        .to(candle.current, { scale: 24, opacity: 0, filter: "blur(8px)", duration: 15, ease: "power3.in" }, 45)
        .to(stage.current, { backgroundColor: "#020817", duration: 15 }, 45)

        .fromTo(universe.current, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 8 }, 58)
        .fromTo(grid.current, { opacity: 0, rotateX: 72, yPercent: 42 }, { opacity: .8, rotateX: 58, yPercent: 5, duration: 18 }, 60)
        .fromTo(dataCloud.current, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 8 }, 60)
        .fromTo(dataItems.current, { opacity: 0, z: -900, yPercent: 80 }, { opacity: .88, z: 260, yPercent: -35, duration: 20, stagger: { each: .35, from: "random" } }, 60)
        .fromTo(chartPaths.current, { strokeDashoffset: 1200, opacity: 0 }, { strokeDashoffset: 0, opacity: .75, duration: 18, stagger: 1.5 }, 62)

        .to(dataItems.current, { x: 0, y: 0, z: 0, scale: .12, opacity: 0, duration: 15, stagger: { each: .18, from: "edges" }, ease: "power2.in" }, 80)
        .to(chartPaths.current, { scale: .12, opacity: 0, transformOrigin: "50% 50%", duration: 12 }, 81)
        .fromTo(convergence.current, { opacity: 0, scale: .1 }, { opacity: 1, scale: 2.4, duration: 12 }, 80)
        .fromTo(afMark.current, { opacity: 0, scale: .72 }, { opacity: 1, scale: 1, duration: 12 }, 83)
        .fromTo(afPaths.current, { strokeDashoffset: 900 }, { strokeDashoffset: 0, duration: 13, stagger: .7, ease: "power2.out" }, 82)
        .to([grid.current, dataCloud.current], { opacity: 0, duration: 10 }, 85)

        .fromTo(identity.current, { opacity: 0, y: 36, letterSpacing: ".6em" }, { opacity: 1, y: 0, letterSpacing: ".28em", duration: 5, ease: "power2.out" }, 95)
        .to(convergence.current, { opacity: .22, scale: 3.3, duration: 5 }, 95)

        .to([afMark.current, identity.current], { opacity: 0, scale: 1.35, filter: "blur(14px)", duration: 15, ease: "power2.in" }, 100)
        .fromTo(dissolveParticles.current, { opacity: 0, x: 0, y: 0, scale: .2 }, {
          opacity: .82,
          x: (index) => Math.cos(index * .73) * (220 + index * 13),
          y: (index) => Math.sin(index * .73) * (170 + index * 9),
          scale: 1,
          duration: 15,
          stagger: .08,
          ease: "power2.out",
        }, 100)
        .to(convergence.current, { opacity: 0, scale: 7, duration: 15 }, 100)
        .fromTo(cityScene.current, { opacity: 0 }, { opacity: 1, duration: 12 }, 108)
        .to(dissolveParticles.current, { opacity: 0, duration: 8 }, 113)

        .fromTo(rotationChamber.current, { rotateY: 0, rotateZ: 0 }, { rotateY: 360, rotateZ: 2, duration: 40, ease: "power1.inOut" }, 115)
        .fromTo(rotationPlanes.current, { opacity: .15, scale: .72 }, { opacity: .9, scale: 1, duration: 18, stagger: .7 }, 115)
        .to(cityCamera.current, { rotateZ: 7, rotateX: -3, duration: 10, ease: "sine.inOut" }, 115)
        .to(cityCamera.current, { rotateZ: -8, rotateX: 4, duration: 10, ease: "sine.inOut" }, 125)
        .fromTo(avenue.current, { opacity: 0, scale: .45, rotateY: -32 }, { opacity: .55, scale: .72, rotateY: 12, duration: 15 }, 130)
        .to(cityCamera.current, { rotateZ: 6, rotateX: -2, duration: 10, ease: "sine.inOut" }, 135)
        .to(avenue.current, { opacity: .8, scale: .9, rotateY: -8, duration: 10 }, 140)
        .to(cityCamera.current, { rotateZ: 0, rotateX: 0, duration: 10, ease: "sine.inOut" }, 145)
        .to(avenue.current, { opacity: 1, scale: 1, rotateY: 0, duration: 10, ease: "power2.out" }, 145)
        .to(rotationChamber.current, { opacity: 0, scale: 1.7, duration: 8 }, 152)

        .fromTo(avenueWorld.current, { scale: .68, y: 90 }, { scale: 1, y: 0, duration: 10, ease: "power2.out" }, 155)
        .fromTo(cityFog.current, { opacity: .05, scale: .7 }, { opacity: .48, scale: 1.15, duration: 18 }, 155)
        .fromTo(roadPulse.current, { yPercent: 110, opacity: 0 }, { yPercent: -170, opacity: .85, duration: 8, repeat: 1 }, 157)

        .fromTo(districts.current[0], { opacity: 0, y: 100, scale: .72 }, { opacity: 1, y: 0, scale: 1, duration: 7 }, 163)
        .to(avenueWorld.current, { scale: 1.15, x: -18, y: -14, duration: 8 }, 165)
        .fromTo(districts.current[1], { opacity: 0, y: 80, scale: .68 }, { opacity: 1, y: 0, scale: 1, duration: 8 }, 170)
        .to(districts.current[0], { opacity: .18, duration: 6 }, 172)
        .to(avenueWorld.current, { scale: 1.34, x: 22, y: -34, duration: 10 }, 171)
        .fromTo(districts.current[2], { opacity: 0, scale: .65 }, { opacity: 1, scale: 1, duration: 8 }, 178)
        .to(districts.current[1], { opacity: .2, duration: 6 }, 180)
        .to(avenueWorld.current, { scale: 1.52, x: -12, y: -52, duration: 9 }, 179)
        .fromTo(districts.current[3], { opacity: 0, scale: .62 }, { opacity: 1, scale: 1, duration: 7 }, 184)
        .to(districts.current[2], { opacity: .18, duration: 5 }, 186)
        .to(avenueWorld.current, { scale: 1.7, x: 18, y: -70, duration: 8 }, 185)
        .fromTo(districts.current[4], { opacity: 0, scale: .58 }, { opacity: 1, scale: 1, duration: 7 }, 189)
        .to(districts.current[3], { opacity: .15, duration: 5 }, 190)
        .fromTo(districts.current[5], { opacity: 0, scale: .55 }, { opacity: 1, scale: 1, duration: 6 }, 192)
        .to(districts.current[4], { opacity: .22, duration: 5 }, 194)
        .to(avenueWorld.current, { scale: 1.92, x: 0, y: -88, duration: 10, ease: "power1.inOut" }, 190)
        .fromTo(destination.current, { opacity: 0, scale: .25, y: 50 }, { opacity: 1, scale: 1, y: 0, duration: 5, ease: "power2.out" }, 195)
        .to(cityFog.current, { opacity: .22, duration: 5 }, 195)

        .fromTo(headquarters.current, { opacity: 0 }, { opacity: 1, duration: 8 }, 200)
        .to(destination.current, { scale: 3.4, y: 80, opacity: 0, filter: "blur(10px)", duration: 18, ease: "power2.in" }, 200)
        .to(avenueWorld.current, { scale: 2.55, y: -130, opacity: .18, duration: 18, ease: "power2.in" }, 200)
        .fromTo(entrance.current, { opacity: 0, visibility: "hidden", pointerEvents: "none", scale: .35, z: -500 }, { opacity: 1, visibility: "visible", pointerEvents: "auto", scale: 1, z: 0, duration: 18, ease: "power2.inOut" }, 200)
        .to(entrance.current, { filter: "brightness(1.5)", duration: 8 }, 212)
        .to(entranceDoors.current[0], { xPercent: -110, duration: 9, ease: "power2.inOut" }, 216)
        .to(entranceDoors.current[1], { xPercent: 110, duration: 9, ease: "power2.inOut" }, 216)
        .to(entrance.current, { scale: 5.4, opacity: 0, duration: 14, ease: "power3.in" }, 224)
        .set(entrance.current, { opacity: 0, visibility: "hidden", pointerEvents: "none" }, 242)
        .fromTo(hall.current, { opacity: 0, visibility: "hidden", pointerEvents: "none", scale: 1.45 }, { opacity: 1, visibility: "visible", pointerEvents: "auto", scale: 1, duration: 12, ease: "power2.out" }, 242)
        .fromTo(hallRing.current, { rotateX: 68, rotateZ: -18, scale: .65 }, { rotateX: 58, rotateZ: 0, scale: 1, duration: 18 }, 244)
        .fromTo(coreStreams.current, { opacity: 0, scaleX: .15 }, { opacity: .78, scaleX: 1, duration: 15, stagger: .6 }, 246)

        .fromTo(intelligenceCore.current, { opacity: 0, scale: .18 }, { opacity: 1, scale: 1, duration: 16, ease: "power2.out" }, 246)
        .fromTo(coreShells.current, { rotate: -55, scale: .45, opacity: 0 }, { rotate: 0, scale: 1, opacity: 1, duration: 18, stagger: 1.2 }, 248)
        .to(coreShells.current[0], { x: -150, rotateY: -62, duration: 12, ease: "power2.inOut" }, 246)
        .to(coreShells.current[1], { x: 150, rotateY: 62, duration: 12, ease: "power2.inOut" }, 246)
        .fromTo(coreIdentity.current, { opacity: 0, scale: .7, letterSpacing: ".5em" }, { opacity: 1, scale: 1, letterSpacing: ".16em", duration: 12, ease: "power2.out" }, 260)
        .to(hall.current, { rotateY: -13, rotateX: 2, duration: 18, ease: "sine.inOut" }, 250)
        .to(hall.current, { rotateY: 12, rotateX: -2, duration: 18, ease: "sine.inOut" }, 268)

        .to([intelligenceCore.current, coreIdentity.current], { scale: .42, opacity: .32, duration: 12, ease: "power2.inOut" }, 292)
        .set(hall.current, { opacity: 0, visibility: "hidden", pointerEvents: "none" }, 300)
        .fromTo(divisionOrbit.current, { opacity: 0, visibility: "hidden", pointerEvents: "none", scale: .5, rotateY: -26 }, { opacity: 1, visibility: "visible", pointerEvents: "auto", scale: 1, rotateY: 0, duration: 14, ease: "power2.out" }, 300)
        .fromTo(divisionPlatforms.current, { opacity: 0, y: 160, rotateX: 18 }, { opacity: 1, y: 0, rotateX: 0, duration: 14, stagger: 3, ease: "power2.out" }, 304)
        .to(divisionOrbit.current, { rotateY: -4, rotateX: 1, duration: 17, ease: "sine.inOut" }, 318)
        .to(divisionOrbit.current, { rotateY: 4, rotateX: -1, duration: 17, ease: "sine.inOut" }, 335)
        .to(divisionPlatforms.current[0], { opacity: .28, scale: .88, duration: 8 }, 326)
        .to(divisionPlatforms.current[1], { opacity: .32, scale: .9, duration: 8 }, 334)
        .to(divisionPlatforms.current[2], { scale: 1.04, duration: 10 }, 334)
        .fromTo(portfolioDisclosure.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 8 }, 340)
        .to({}, { duration: 8 }, 348)

        .to(portfolioDisclosure.current, { opacity: 0, visibility: "hidden", pointerEvents: "none", y: 14, duration: 5 }, 356)
        .to(divisionPlatforms.current, { x: 0, y: 0, scale: .08, rotateY: 0, opacity: 0, visibility: "hidden", pointerEvents: "none", duration: 12, stagger: .7, ease: "power2.in" }, 356)
        .to([hallRing.current, coreStreams.current], { opacity: 0, visibility: "hidden", scale: .7, duration: 10 }, 358)
        .to(hall.current, { rotateY: 0, rotateX: 0, duration: 7 }, 358)
        .set(divisionOrbit.current, { opacity: 0, visibility: "hidden", pointerEvents: "none" }, 360)
        .to([intelligenceCore.current, coreIdentity.current], { scale: .18, opacity: 0, visibility: "hidden", pointerEvents: "none", duration: 10, ease: "power2.in" }, 360)
        .to(headquarters.current, { backgroundColor: "#000", duration: 13 }, 360)
        .fromTo(transitionBeam.current, { opacity: 0, scaleY: .02, scaleX: .3 }, { opacity: 1, scaleY: 1, scaleX: 1, duration: 8, ease: "power2.out" }, 362)
        .to(transitionBeam.current, { scale: 7, opacity: .92, duration: 6, ease: "power3.in" }, 370)
        .fromTo(transitionDarkness.current, { opacity: 0 }, { opacity: 1, duration: 8, ease: "power2.inOut" }, 372)
        .to(transitionBeam.current, { opacity: 0, duration: 6 }, 378)

        .fromTo(founderScene.current, { opacity: 0, visibility: "hidden", pointerEvents: "none" }, { opacity: 1, visibility: "visible", pointerEvents: "auto", duration: 7 }, 380)
        .fromTo(founderBeam.current, { opacity: 0, scaleY: .05 }, { opacity: 1, scaleY: 1, duration: 12, ease: "power2.out" }, 380)
        .fromTo(founderFigure.current, { opacity: 0, scale: .65, rotateY: -24 }, { opacity: 1, scale: 1, rotateY: 0, duration: 20, ease: "power2.out" }, 385)
        .fromTo(founderFigurePaths.current, { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 22, stagger: 1.1, ease: "power2.out" }, 384)
        .to(founderBeam.current, { opacity: .18, scaleX: 2.4, duration: 12 }, 363)
        .to(founderFigure.current, { rotateY: 20, rotateX: -2, duration: 16, ease: "sine.inOut" }, 368)
        .fromTo(founderIdentity.current, { opacity: 0, visibility: "hidden", pointerEvents: "none", x: 70 }, { opacity: 1, visibility: "visible", pointerEvents: "auto", x: 0, duration: 12, ease: "power2.out" }, 402)
        .to({}, { duration: 8 }, 380)
        .to(founderIdentity.current, { opacity: 0, visibility: "hidden", pointerEvents: "none", x: -40, duration: 7 }, 418)

        .fromTo(founderStageNodes.current[0], { opacity: 0, x: -90 }, { opacity: 1, x: 0, duration: 10 }, 390)
        .to(founderFigure.current, { rotateY: -10, x: 110, duration: 14 }, 390)
        .to(founderStageNodes.current[0], { opacity: 0, x: -45, duration: 7 }, 404)
        .fromTo(founderStageNodes.current[1], { opacity: 0, x: 90 }, { opacity: 1, x: 0, duration: 10 }, 408)
        .to(founderFigure.current, { rotateY: 10, x: -100, duration: 14 }, 408)
        .to(founderStageNodes.current[1], { opacity: 0, x: 45, duration: 7 }, 422)
        .fromTo(founderStageNodes.current[2], { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: 10 }, 426)
        .to(founderFigure.current, { rotateY: 0, x: 0, duration: 12 }, 426)
        .to(founderStageNodes.current[2], { opacity: 0, scale: .92, duration: 7 }, 440)

        .fromTo(experienceField.current, { opacity: 0, z: -500 }, { opacity: 1, z: 0, duration: 12 }, 442)
        .to(experienceField.current, { rotateY: -7, duration: 10, ease: "sine.inOut" }, 449)
        .to(experienceField.current, { opacity: 0, z: 250, duration: 8 }, 458)
        .fromTo(capabilityField.current, { opacity: 0, scale: .72 }, { opacity: 1, scale: 1, duration: 10 }, 458)
        .fromTo(capabilityNodes.current, { opacity: 0, scale: .2 }, { opacity: 1, scale: 1, duration: 10, stagger: .45 }, 460)
        .to(capabilityField.current, { rotateY: 8, duration: 13, ease: "sine.inOut" }, 464)
        .to(capabilityField.current, { opacity: 0, scale: .4, duration: 9 }, 475)

        .fromTo(founderConnections.current, { opacity: 0, scale: .7 }, { opacity: 1, scale: 1, duration: 10 }, 474)
        .to(founderFigure.current, { scale: .65, y: 35, duration: 10 }, 474)
        .to(founderConnections.current, { opacity: 0, scale: 1.2, duration: 8 }, 486)
        .fromTo(founderFinal.current, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 9 }, 486)
        .fromTo(projectCorridor.current, { opacity: 0, scale: .55 }, { opacity: 1, scale: 1, duration: 10 }, 488)
        .to(founderFigure.current, { rotateY: 24, x: -120, opacity: .42, duration: 11, ease: "sine.inOut" }, 488)
        .to(founderFinal.current, { opacity: .58, y: -18, duration: 7 }, 496)
        .fromTo(founderFade.current, { opacity: 0 }, { opacity: .72, duration: 6 }, 494)

        .fromTo(projectsFilm.current, { opacity: 0 }, { opacity: 1, duration: 7 }, 500)
        .fromTo(projectsEntry.current, { opacity: 0, scale: .55 }, { opacity: 1, scale: 1, duration: 11 }, 500)
        .to(founderScene.current, { opacity: 0, duration: 10 }, 500)
        .to(projectsEntry.current, { scale: 2.8, opacity: 0, duration: 10, ease: "power2.in" }, 508)

        .fromTo(engineWorld.current, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 10 }, 508)
        .fromTo(engineTitle.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 10 }, 510)
        .to(engineTitle.current, { opacity: .2, scale: .8, duration: 8 }, 520)
        .fromTo(marketMonitors.current, { opacity: 0, z: -500 }, { opacity: 1, z: 0, duration: 12 }, 518)
        .to(marketMonitors.current, { rotateY: -7, duration: 10, ease: "sine.inOut" }, 524)
        .to(marketMonitors.current, { opacity: .15, z: 180, duration: 8 }, 532)
        .fromTo(engineWorkflowNode.current, { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 11 }, 530)
        .to(engineWorkflowNode.current, { x: -80, opacity: .18, duration: 9 }, 541)

        .fromTo(riskWorld.current, { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, duration: 12 }, 540)
        .to(engineTitle.current, { opacity: 0, duration: 7 }, 542)
        .to(riskWorld.current, { rotateY: 8, duration: 12, ease: "sine.inOut" }, 548)
        .fromTo(tradeArchitecture.current, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 10 }, 552)
        .to(riskWorld.current, { opacity: .28, scale: .72, duration: 9 }, 558)
        .to(tradeArchitecture.current, { opacity: .2, y: -60, duration: 8 }, 563)
        .fromTo(validationWorld.current, { opacity: 0, scale: .75 }, { opacity: 1, scale: 1, duration: 10 }, 562)
        .to(validationWorld.current, { opacity: 0, scale: 1.2, duration: 8 }, 574)

        .to(riskWorld.current, { opacity: 1, scale: .34, rotateY: 0, duration: 8 }, 574)
        .fromTo(portfolioWorld.current, { opacity: 0 }, { opacity: 1, duration: 10 }, 576)
        .to(engineWorld.current, { opacity: 0, duration: 8 }, 576)
        .fromTo(profileField.current, { opacity: 0, rotateY: -12, scale: .7 }, { opacity: 1, rotateY: 0, scale: 1, duration: 12 }, 582)
        .to(profileField.current, { rotateY: 7, duration: 12, ease: "sine.inOut" }, 590)
        .fromTo(labDisclosure.current, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 8 }, 596)
        .to([profileField.current, labDisclosure.current], { opacity: 0, scale: .8, duration: 9 }, 606)

        .fromTo(quantWorld.current, { opacity: 0, z: -400 }, { opacity: 1, z: 0, duration: 11 }, 606)
        .to(portfolioWorld.current, { opacity: 0, duration: 7 }, 608)
        .to(quantWorld.current, { rotateY: -7, duration: 12, ease: "sine.inOut" }, 614)
        .to(quantWorld.current, { opacity: 0, z: 220, duration: 8 }, 624)
        .fromTo(researchWorld.current, { opacity: 0, x: 160 }, { opacity: 1, x: 0, duration: 11 }, 622)
        .to(researchWorld.current, { x: -100, opacity: 0, duration: 9 }, 636)
        .fromTo(technologyWorld.current, { opacity: 0, scale: .72 }, { opacity: 1, scale: 1, duration: 11 }, 634)
        .to(technologyWorld.current, { opacity: 0, scale: 1.3, duration: 9 }, 648)

        .fromTo(projectConstellation.current, { opacity: 0, scale: .45, rotateY: -16 }, { opacity: 1, scale: 1, rotateY: 0, duration: 14 }, 646)
        .to(projectConstellation.current, { rotateY: 9, duration: 13, ease: "sine.inOut" }, 655)
        .to(projectConstellation.current, { scale: .55, opacity: .35, duration: 10 }, 664)
        .fromTo(projectEndCorridor.current, { opacity: 0, scale: .5 }, { opacity: 1, scale: 1, duration: 10 }, 662)
        .to(projectEndCorridor.current, { scale: 2.4, duration: 10, ease: "power2.in" }, 670)
        .fromTo(projectEndFade.current, { opacity: 0 }, { opacity: .86, duration: 8 }, 672)

        .fromTo(connectFilm.current, { opacity: 0 }, { opacity: 1, duration: 8 }, 680)
        .fromTo(connectCorridor.current, { opacity: 0, scale: .45 }, { opacity: 1, scale: 1, duration: 14, ease: "power2.out" }, 680)
        .to(projectsFilm.current, { opacity: 0, duration: 10 }, 682)
        .to(connectCorridor.current, { scale: 2.8, opacity: .28, duration: 18, ease: "power2.in" }, 696)
        .fromTo(controlRoom.current, { opacity: 0, scale: 1.35, rotateX: 7 }, { opacity: 1, scale: 1, rotateX: 0, duration: 18, ease: "power2.out" }, 702)
        .to(connectCorridor.current, { opacity: 0, duration: 8 }, 708)
        .fromTo(connectMessage.current, { opacity: 0, y: 38 }, { opacity: 1, y: 0, duration: 12, ease: "power2.out" }, 714)
        .to(connectMessage.current, { opacity: .58, y: -14, duration: 8 }, 730)
        .fromTo(gatewayHall.current, { opacity: 0, scale: .78, rotateX: 10 }, { opacity: 1, scale: 1, rotateX: 0, duration: 15, ease: "power2.out" }, 728)
        .to(gatewayHall.current, { rotateY: -5, duration: 10, ease: "sine.inOut" }, 738)
        .to(gatewayHall.current, { rotateY: 5, duration: 10, ease: "sine.inOut" }, 748)
        .fromTo(contactDetails.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 10 }, 746)
        .to({}, { duration: 8 }, 756)
        .to([connectMessage.current, gatewayHall.current, contactDetails.current], { opacity: 0, scale: .88, duration: 12, ease: "power2.inOut" }, 764)
        .to(controlRoom.current, { scale: .72, opacity: .42, duration: 14, ease: "power2.inOut" }, 764)
        .fromTo(exitFlight.current, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 16, ease: "power2.out" }, 772)
        .to(exitFlight.current, { scale: .58, y: -70, opacity: .55, duration: 14, ease: "power2.inOut" }, 786)
        .fromTo(finalDataCollapse.current, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 14 }, 790)
        .to(exitFlight.current, { opacity: 0, duration: 9 }, 798)
        .to(finalDataCollapse.current, { scale: .28, opacity: .22, duration: 16, ease: "power2.in" }, 802)
        .fromTo(finalAfReveal.current, { opacity: 0, scale: .68, letterSpacing: ".42em" }, { opacity: 1, scale: 1, letterSpacing: ".18em", duration: 14, ease: "power2.out" }, 808)
        .fromTo(finalActions.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 8, ease: "power2.out" }, 820);
    }, root);

    return () => {
      context.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  return <main className="phase-one-root">
    <section ref={root} className="phase-one-film" aria-label="Arima Finance cinematic identity sequence">
      <div ref={stage} className="film-stage">
        <div ref={ambient} className="film-ambient" aria-hidden="true"/>
        <div ref={firstLight} className="first-light" aria-hidden="true"/>

        <div ref={candle} className="film-candle" aria-hidden="true">
          <div ref={candleWick} className="film-candle-wick"/>
          <div ref={candleBody} className="film-candle-body"/>
        </div>
        <div ref={portal} className="candle-portal" aria-hidden="true"/>

        <div ref={universe} className="data-universe" aria-hidden="true">
          <div ref={grid} className="depth-grid"/>
          <svg className="market-chart chart-a" viewBox="0 0 1200 400">
            <path ref={(node) => { if (node) chartPaths.current[0] = node; }} pathLength="1200" d="M0 315 C90 260 145 340 220 250 S360 130 430 205 S570 330 650 190 S800 85 875 165 S1020 260 1200 60"/>
          </svg>
          <svg className="market-chart chart-b" viewBox="0 0 1200 400">
            <path ref={(node) => { if (node) chartPaths.current[1] = node; }} pathLength="1200" d="M0 210 C110 120 180 300 285 180 S450 90 530 240 S700 300 770 150 S950 80 1200 205"/>
          </svg>
          <div ref={dataCloud} className="market-data-cloud">
            {marketData.map((value, index) => <span
              ref={(node) => { if (node) dataItems.current[index] = node; }}
              style={{ "--x": `${(index * 47) % 92 + 4}%`, "--y": `${(index * 31) % 82 + 8}%`, "--d": index % 5 } as React.CSSProperties}
              key={value}
            >{value}</span>)}
          </div>
        </div>

        <div ref={convergence} className="data-convergence" aria-hidden="true"/>
        <div className="film-identity">
          <svg ref={afMark} className="af-film-mark" viewBox="0 0 520 300" role="img" aria-label="AF">
            <path ref={(node) => { if (node) afPaths.current[0] = node; }} pathLength="900" d="M55 245 L165 45 L275 245 M105 158 H225"/>
            <path ref={(node) => { if (node) afPaths.current[1] = node; }} pathLength="900" d="M305 245 V45 H475 M305 142 H442"/>
          </svg>
          <div ref={identity} className="af-film-name"><strong>ARIMA FINANCE</strong><span>QUANTITATIVE INTELLIGENCE</span></div>
        </div>
        <div className="af-dissolve-particles" aria-hidden="true">{Array.from({ length: 30 }, (_, index) => <span ref={(node) => { if (node) dissolveParticles.current[index] = node; }} key={index}/>)}</div>

        <div ref={cityScene} className="financial-city" aria-label="Global financial landscape">
          <div ref={cityCamera} className="city-camera">
            <div ref={rotationChamber} className="rotation-chamber" aria-hidden="true">
              {rotationLabels.map((label, index) => <div ref={(node) => { if (node) rotationPlanes.current[index] = node; }} className="rotation-plane" style={{ "--r": `${index * 60}deg` } as React.CSSProperties} key={label}><span>{label}</span><i/><i/><i/></div>)}
            </div>

            <div ref={avenue} className="financial-avenue">
              <div ref={avenueWorld} className="avenue-world">
                <div ref={cityFog} className="city-fog"/>
                <div className="financial-road"><i/><i/><i/><div ref={roadPulse} className="road-pulse"/></div>
                <div className="city-sky-lines" aria-hidden="true"><span/><span/><span/><span/><span/></div>
                <div className="institution-districts">
                  {institutionDistricts.map((district, districtIndex) => <div ref={(node) => { if (node) districts.current[districtIndex] = node; }} className={`institution-district district-${districtIndex + 1}`} key={districtIndex}>
                    {district.map(([name, data], index) => <article className={`city-building side-${index % 2 ? "right" : "left"} building-${index + 1}`} key={name}>
                      <div className="building-crown"/><div className="building-windows"/><strong>{name}</strong><small>{data}</small><div className="building-ticker">{marketData[(districtIndex * 2 + index) % marketData.length]}</div>
                    </article>)}
                  </div>)}
                </div>
                <div ref={destination} id="film-destination" data-film-text="destination" className="arima-destination"><span>AF</span><strong>ARIMA FINANCE</strong></div>
              </div>
            </div>
          </div>
          <small className="institution-disclaimer">Institution names are shown as part of the global financial landscape and do not imply affiliation, partnership or endorsement.</small>
        </div>

        <div ref={headquarters} className="af-headquarters" aria-label="Arima Finance intelligence headquarters">
          <div ref={entrance} id="film-hq-entrance" data-film-portal="hq-entrance" className="af-entrance">
            <div className="entrance-emblem"><span>AF</span><small>ARIMA FINANCE</small></div>
            <div id="film-hq-door-left" data-film-portal="hq-door-left" ref={(node) => { if (node) entranceDoors.current[0] = node; }} className="entrance-door door-left"/>
            <div id="film-hq-door-right" data-film-portal="hq-door-right" ref={(node) => { if (node) entranceDoors.current[1] = node; }} className="entrance-door door-right"/>
            <div className="entrance-floor"><i/><i/><i/></div>
          </div>

          <div ref={hall} className="intelligence-hall">
            <div className="hall-architecture" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
            <div ref={hallRing} className="hall-ring" aria-hidden="true"><i/><i/><i/></div>
            <div className="core-streams" aria-hidden="true">{intelligenceStreams.map((stream, index) => <span ref={(node) => { if (node) coreStreams.current[index] = node; }} style={{ "--stream": index } as React.CSSProperties} key={stream}><b>{stream}</b></span>)}</div>

            <div ref={intelligenceCore} className="intelligence-core">
              <span ref={(node) => { if (node) coreShells.current[0] = node; }} className="core-shell shell-a"/>
              <span ref={(node) => { if (node) coreShells.current[1] = node; }} className="core-shell shell-b"/>
              <i className="core-light"/>
            </div>
            <div ref={coreIdentity} id="film-hq-identity" data-film-text="hq-identity" className="core-identity">
              <span>AF</span><strong>ARIMA FINANCE</strong><small>Financial Intelligence</small>
              <div><b>Research</b><b>Portfolio Solutions</b></div>
            </div>

            <div ref={divisionOrbit} id="film-divisions" data-film-portal="divisions" className="division-orbit">
              {divisionDetails.map((division, divisionIndex) => <article id={`film-division-${divisionIndex + 1}`} data-film-portal={`division-${divisionIndex + 1}`} ref={(node) => { if (node) divisionPlatforms.current[divisionIndex] = node; }} className={`division-platform division-${divisionIndex + 1}`} key={division.title}>
                <div className="platform-surface"><span>{division.index}</span><small>{division.lead}</small><h2>{division.title}</h2>
                  {divisionIndex === 1 && <strong className="engine-emphasis">ARIMA FINANCE ENGINE</strong>}
                  {divisionIndex === 2 && <p>A live-funded research environment using the founder&apos;s own capital to study structured allocation and risk management.</p>}
                  <div className="division-data">{division.items.map((item) => <i key={item}>{item}</i>)}</div>
                  {divisionIndex === 2 && <div className="portfolio-metrics"><b>PORTFOLIO VALUE</b><b>WEEKLY RETURN</b><b>DRAWDOWN</b><b>RISK SCORE</b><svg viewBox="0 0 420 80"><path d="M0 65 C45 48 72 62 105 39 S168 51 202 24 S264 41 300 20 S364 27 420 5"/></svg></div>}
                </div>
              </article>)}
            </div>

            <div ref={portfolioDisclosure} id="film-portfolio-disclosure" data-film-text="portfolio-disclosure" className="model-disclosure"><strong>Model Portfolio Disclosure</strong><span>The investor profiles presented are internal research models. The underlying capital belongs to the founder. Arima Finance does not currently manage external client assets through these profiles. Information is presented for research, demonstration and technology-development purposes only.</span></div>
          </div>
          <div ref={transitionBeam} className="founder-transition-beam" aria-hidden="true"/>
          <div ref={transitionDarkness} className="phase-three-darkness" aria-hidden="true"/>
        </div>

        <div ref={founderScene} className="founder-film" aria-label="Founder of Arima Finance">
          <div ref={founderBeam} className="founder-drawing-beam" aria-hidden="true"/>
          <div className="founder-blueprint" aria-hidden="true"><span>Σ P(X)</span><span>DCF / WACC</span><span>PYTHON · SERIES</span><span>AVIONICS / SYS</span><i/><i/><i/></div>

          <div ref={founderFigure} className="founder-figure" aria-label="Abstract line-art human figure">
            <svg viewBox="0 0 420 760" role="img" aria-label="Abstract non-photorealistic Founder silhouette">
              <path ref={(node) => { if (node) founderFigurePaths.current[0] = node; }} pathLength="1000" d="M210 70 C151 70 128 124 139 177 C148 222 171 249 210 255 C249 249 272 222 281 177 C292 124 269 70 210 70Z"/>
              <path ref={(node) => { if (node) founderFigurePaths.current[1] = node; }} pathLength="1000" d="M139 164 C102 205 104 275 135 309 M281 164 C318 205 316 275 285 309 M145 280 C88 321 60 421 55 645 M275 280 C332 321 360 421 365 645"/>
              <path ref={(node) => { if (node) founderFigurePaths.current[2] = node; }} pathLength="1000" d="M145 280 C166 327 254 327 275 280 M116 354 C149 387 271 387 304 354 M94 445 C151 472 269 472 326 445 M72 553 C148 579 272 579 348 553 M55 645 C135 680 285 680 365 645"/>
              <path ref={(node) => { if (node) founderFigurePaths.current[3] = node; }} pathLength="1000" d="M210 255 V700 M128 342 L292 626 M292 342 L128 626"/>
            </svg>
            <div className="figure-points">{Array.from({ length: 22 }, (_, index) => <i style={{ "--point": index } as React.CSSProperties} key={index}/>)}</div>
          </div>

          <div ref={founderIdentity} id="film-founder-identity" data-film-text="founder-identity" className="founder-identity"><small>THE FOUNDER</small><h2>ARYAN HEIDARI</h2><strong>Founder of Arima Finance</strong><span>Finance · Quantitative Research · Technology</span></div>

          <div className="founder-story">
            {founderStages.map((stageData, index) => <article ref={(node) => { if (node) founderStageNodes.current[index] = node; }} className={`founder-stage founder-stage-${index + 1}`} key={stageData[0]}><small>0{index + 1}</small><h3>{stageData[0]}</h3><div>{stageData.slice(1).map((line) => <span key={line}>{line}</span>)}</div>
              {index === 0 && <p>BSc Avionics Engineering<br/><b>National Aviation University, Kyiv</b></p>}
              {index === 1 && <p>MSc Finance &amp; Accounting<br/><b>Anglia Ruskin University, London</b></p>}
            </article>)}
          </div>

          <div ref={experienceField} className="experience-field">
            <div><small>PROFESSIONAL ENVIRONMENTS</small><h3>Research translated into execution.</h3></div>
            <span className="experience-marker marker-a"><b>Bank of England</b><i>Financial Markets Research</i></span>
            <span className="experience-marker marker-b"><b>EY</b><i>Financial Advisory</i></span>
            <span className="experience-marker marker-c"><b>Samuel &amp; Co Trading</b><i>FX Trading</i></span>
            <span className="experience-marker marker-d"><b>AEXT</b><i>Technology Entrepreneurship</i></span>
            <p>Organisation names refer to the founder&apos;s professional background and do not imply endorsement or affiliation with Arima Finance.</p>
          </div>

          <div ref={capabilityField} className="capability-field"><div className="capability-core">AH<small>CONNECTED INTELLIGENCE</small></div>{founderCapabilities.map((capability, index) => <span ref={(node) => { if (node) capabilityNodes.current[index] = node; }} style={{ "--node": index } as React.CSSProperties} key={capability}>{capability}</span>)}</div>

          <div ref={founderConnections} className="founder-connections"><div className="connection-founder">FOUNDER</div><i/><i/><i/><strong>RISK MANAGEMENT CORE</strong><span>ARIMA FINANCE ENGINE</span><span>AF PORTFOLIO LAB</span><span>FINANCIAL RESEARCH &amp; ADVISORY PROJECTS</span><p>A shared risk framework connects portfolio research, market analysis and algorithmic trade management.</p></div>

          <div ref={founderFinal} className="founder-final"><small>ARYAN HEIDARI</small><strong>Founder of Arima Finance</strong><p>Building financial systems where research, technology and risk discipline converge.</p></div>
          <div ref={projectCorridor} className="project-corridor" aria-hidden="true"><i/><i/><i/><span/><span/><span/></div>
          <div ref={founderFade} className="founder-end-fade" aria-hidden="true"/>
        </div>

        <div ref={projectsFilm} className="projects-film" aria-label="Arima Finance project environments">
          <div ref={projectsEntry} className="projects-entry"><span>PROJECT SYSTEMS</span><i/><i/><i/></div>

          <div ref={engineWorld} className="engine-world">
            <div ref={engineTitle} className="project-world-title"><small>ARIMA FINANCE · FLAGSHIP SYSTEM</small><h2>Arima Finance Engine</h2><p>A market-intelligence, risk and trade-management system.</p><span>Automated market analysis and virtual trade management, with execution integration in development.</span></div>
            <div ref={marketMonitors} className="market-monitors">{[["XAUUSD", "GOLD"], ["SPX", "S&P 500"], ["BTCUSD", "BITCOIN"]].map(([symbol, market], index) => <article key={symbol}><small>{market}</small><strong>{symbol}</strong><svg viewBox="0 0 260 80"><path d={index === 0 ? "M0 62 C34 44 52 65 83 35 S135 51 168 24 S220 37 260 9" : index === 1 ? "M0 55 C42 60 58 38 92 47 S140 20 176 31 S223 13 260 19" : "M0 66 C25 32 59 63 91 28 S151 55 184 18 S226 42 260 5"}/></svg><i>MONITORING</i></article>)}</div>
            <div ref={engineWorkflowNode} className="engine-workflow"><small>DECISION ARCHITECTURE</small>{engineWorkflow.map((node, index) => <span key={node}><b>0{index + 1}</b>{node}<i/></span>)}</div>
            <div ref={riskWorld} className="risk-world"><div className="risk-core-project"><small>RISK MANAGEMENT CORE</small><strong>RISK</strong><p>Risk is not added after the signal.<br/>It is part of the decision architecture.</p></div><div className="risk-controls">{engineControls.map((control) => <span key={control}>{control}</span>)}</div></div>
            <div ref={tradeArchitecture} className="trade-architecture"><small>TRADE MANAGEMENT ARCHITECTURE</small><span>Break-even management</span><i/><span>Partial take-profit ladder</span><i/><span>Trailing-stop logic</span><i/><span>Market-structure override</span><i/><span>Economic-news filters</span><i/><span>Telegram alerts</span></div>
            <div ref={validationWorld} className="validation-world"><small>ENGINE VALIDATION</small><h3>Tested as a decision system.</h3><div><span>Automated regression testing</span><span>Historical candle replay</span><span>Scenario testing</span><span>Invalid-setup rejection</span><span>Live runtime monitoring</span></div><p>No performance or return claim is presented.</p></div>
          </div>

          <div ref={portfolioWorld} className="portfolio-world"><header><small>ARIMA FINANCE · FOUNDER PROJECT</small><h2>AF Portfolio Lab</h2><p>Founder-funded model portfolios for allocation, risk and performance research.</p></header><div ref={profileField} className="profile-field">{portfolioProfiles.map((profile, index) => <article key={profile}><small>INTERNAL MODEL 0{index + 1}</small><strong>{profile}</strong><div><span>ALLOCATION</span><span>RISK UTILISATION</span><span>DRAWDOWN</span></div><svg viewBox="0 0 220 60"><path d={`M0 ${48-index*2} C35 ${35+index} 48 48 76 28 S124 42 153 19 S193 31 220 ${8+index}`}/></svg><i>Interface demonstration — not reported portfolio performance.</i></article>)}</div><div ref={labDisclosure} className="lab-disclosure"><strong>PORTFOLIO LAB DISCLOSURE</strong><span>The profiles shown are internal model portfolios funded using the founder&apos;s own capital. They do not represent external clients or externally managed assets. Information is presented for research, demonstration and system-development purposes.</span></div></div>

          <div ref={quantWorld} className="quant-project-world"><header><small>RESEARCH PROTOTYPE</small><h2>Quantitative Trading Systems</h2></header><div>{quantSystems.map(([system, status]) => <article key={system}><strong>{system}</strong><span>{status}</span></article>)}</div><p>Multi-timeframe analysis · supply and demand · liquidity sweeps · market-structure shifts · risk-to-reward filtering</p></div>

          <div ref={researchWorld} className="research-project-world"><div className="document-plane"><small>FOUNDER-LED · COLLABORATIVE · CONFIDENTIAL</small><h2>Financial Research<br/>&amp; Advisory</h2><div><span>Financial modelling</span><span>Company analysis</span><span>Valuation</span><span>Investment memoranda</span><span>Market research</span><span>Scenario analysis</span><span>Risk review</span><span>Strategic presentations</span></div></div><aside><strong>Selected work</strong><span>Pin4 Investment Memorandum contribution</span><span>Fast-fashion investment research</span><span>Web3 investment-risk work</span><span>Islamic-finance and mining-sector research</span><span>Client-specific portfolio research</span></aside><p>Selected work includes founder-led, collaborative and confidential assignments. Certain project details are intentionally withheld.</p></div>

          <div ref={technologyWorld} className="technology-project-world"><header><small>FOUNDER PROJECT · RESEARCH PROTOTYPE</small><h2>Financial Technology<br/>&amp; Experimental Systems</h2></header><div className="technology-signals"><span>AEXT technology concepts</span><span>Financial dashboards</span><span>Automated alert systems</span><span>AI-assisted financial tools</span><span>Market-data interfaces</span><span>Haptic-feedback research</span><span>Immersive technology prototypes</span></div><strong>SYSTEMS THINKING · APPLIED INNOVATION</strong></div>

          <div ref={projectConstellation} className="project-constellation"><div className="constellation-core">ARIMA<br/>FINANCE ENGINE</div><span>AF PORTFOLIO LAB</span><span>QUANTITATIVE SYSTEMS</span><span>FINANCIAL RESEARCH</span><span>TECHNOLOGY PROTOTYPES</span><i/><i/><i/><i/><p>Research becomes systems.<br/>Systems become products.</p></div>
          <div ref={projectEndCorridor} className="project-end-corridor" aria-hidden="true"><i/><i/><i/><span/><span/><span/></div>
          <div ref={projectEndFade} className="project-end-fade" aria-hidden="true"/>
        </div>

        <div ref={connectFilm} className="connect-film" aria-label="Connect with Arima Finance">
          <div ref={connectCorridor} className="connect-corridor" aria-hidden="true"><i/><i/><i/><span/></div>
          <div ref={controlRoom} className="connect-control-room">
            <div className="room-architecture" aria-hidden="true"><i/><i/><i/><i/><i/></div>
            <div ref={connectMessage} className="connect-message">
              <h2>Every meaningful journey begins with a conversation.</h2>
              <p>Arima Finance builds financial systems through research, technology and disciplined risk management.</p>
            </div>
            <div ref={gatewayHall} className="gateway-hall">
              {connectGateways.map(([title, subtitle], index) => <article className={`connect-gateway gateway-${index + 1}`} key={title}>
                <div className="gateway-door" aria-hidden="true"><i/><i/><span/></div>
                <strong>{title}</strong>
                <p>{subtitle}</p>
              </article>)}
            </div>
            <div ref={contactDetails} id="traditional-contact" className="connect-details">
              {contactLinks.map(([label, value, href]) => <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener" : undefined}>
                <small>{label}</small><span>{value}</span>
              </a>)}
            </div>
          </div>
          <div ref={exitFlight} className="exit-flight" aria-hidden="true"><div className="mini-headquarters">AF</div><div className="mini-city">{Array.from({ length: 18 }, (_, index) => <span key={index}/>)}</div></div>
          <div ref={finalDataCollapse} className="final-data-collapse" aria-hidden="true">{marketData.map((value, index) => <span style={{ "--collapse": index } as React.CSSProperties} key={`final-${value}`}>{value}</span>)}</div>
          <div ref={finalAfReveal} className="final-af-reveal"><strong>AF</strong><h2>ARIMA FINANCE</h2><p>Research.<br/>Technology.<br/>Risk Discipline.</p></div>
          <div ref={finalActions} className="final-actions">
            <button type="button" onClick={replayJourney}>Replay Journey</button>
            <button type="button" onClick={enterWebsite}>Enter Website</button>
          </div>
        </div>
      </div>
    </section>
    {process.env.NODE_ENV === "development" && <output className="film-debug" aria-live="polite">{filmDebug.label} · {filmDebug.scene} · {Math.round(filmDebug.progress * 100)}%</output>}
    {websiteMode && <section id="standard-website" className="standard-website" aria-label="Arima Finance standard website">
      <header className="standard-header"><strong>AF</strong><nav>{websiteNav.map((item) => <a href={`#standard-${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>{item}</a>)}</nav></header>
      <section id="standard-home" className="standard-hero"><small>ARIMA FINANCE</small><h1>Research, technology and risk discipline.</h1><p>A conventional overview for visitors who want to explore the company after the cinematic journey.</p></section>
      <section id="standard-about" className="standard-section"><span>About</span><h2>Financial systems built from research.</h2><p>Arima Finance develops market intelligence, portfolio research and technology systems with a disciplined approach to risk and validation.</p></section>
      <section id="standard-projects" className="standard-section standard-grid"><span>Projects</span><article><strong>Arima Finance Engine</strong><p>Market analysis, risk planning and trade lifecycle validation.</p></article><article><strong>AF Portfolio Lab</strong><p>Founder-funded internal portfolio research and allocation modelling.</p></article><article><strong>Quantitative Systems</strong><p>Research prototypes, trading frameworks and financial data tools.</p></article></section>
      <section id="standard-portfolio-lab" className="standard-section"><span>Portfolio Lab</span><h2>Founder-funded internal research.</h2><p>The Portfolio Lab does not represent externally managed client assets. It is used for allocation, risk and performance research.</p></section>
      <section id="standard-founder" className="standard-section"><span>Founder</span><h2>Aryan Heidari</h2><p>Finance, quantitative research and technology experience brought together through Arima Finance.</p></section>
      <section id="standard-research" className="standard-section"><span>Research</span><h2>Financial research and advisory work.</h2><p>Selected work includes founder-led, collaborative and confidential assignments. Certain details are intentionally withheld.</p></section>
      <section id="standard-contact" className="standard-section standard-contact"><span>Contact</span><h2>Start a conversation.</h2><a href="mailto:aryan.hd@outlook.com">aryan.hd@outlook.com</a><a href="https://github.com/ArimaHQ" target="_blank" rel="noopener">github.com/ArimaHQ</a></section>
    </section>}
  </main>;
}
