import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

let registered = false;

export function ensureAnimationPlugins() {
  if (typeof window === "undefined") return false;
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
    registered = true;
  }
  return true;
}

// Client bundles evaluate this module before React runs scene effects. Registering
// here guarantees ScrollTrigger is available before any useGSAP callback executes.
if (typeof window !== "undefined") ensureAnimationPlugins();

export { gsap, ScrollTrigger };