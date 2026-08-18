import { memo, useEffect, useRef } from 'react';
import type {
  AnimationPolicy,
  AvatarVisualState,
  ExperienceMode,
  ExperienceTransitionPhase,
} from '@/types/experience';
import styles from './NeuralExperience.module.css';

type Particle = {
  x: number;
  y: number;
  depth: number;
  drift: number;
  phase: number;
  scale: number;
  glow: number;
  tone: number;
  lane: number;
};

type Props = {
  policy: AnimationPolicy;
  active?: boolean;
  mode?: ExperienceMode;
  avatarState?: AvatarVisualState;
  amplitude?: number;
  transitionPhase?: ExperienceTransitionPhase;
  arrival?: 'seed' | 'spiral' | 'ocean' | 'ready';
};

const tau = Math.PI * 2;
const particleTones = [
  '137, 228, 255',
  '78, 186, 255',
  '197, 244, 255',
  '111, 145, 255',
  '83, 213, 255',
];

const makeParticles = (count: number): Particle[] => Array.from({ length: count }, (_, index) => ({
  x: (index * 67.13 % 100) / 100,
  y: (index * 29.47 % 100) / 100,
  depth: 0.1 + (index * 13.73 % 89) / 100,
  drift: 0.1 + (index * 7.31 % 42) / 100,
  phase: index * 0.71,
  scale: 0.35 + (index * 11.17 % 100) / 100,
  glow: 0.18 + (index * 17.29 % 82) / 100,
  tone: index % particleTones.length,
  lane: (index * 19.43 % 100) / 100,
}));

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const easeOut = (value: number) => 1 - (1 - clamp(value, 0, 1)) ** 3;

const stateIntensity = (state: AvatarVisualState) => {
  if (state === 'executing') return 1.5;
  if (state === 'thinking' || state === 'processing') return 1.3;
  if (state === 'speaking') return 1.24;
  if (state === 'awaiting_approval') return 1.02;
  if (state === 'warning' || state === 'error') return 0.88;
  return 1;
};

const cubicPoint = (
  start: number,
  controlOne: number,
  controlTwo: number,
  end: number,
  progress: number,
) => {
  const inverse = 1 - progress;
  return inverse ** 3 * start
    + 3 * inverse ** 2 * progress * controlOne
    + 3 * inverse * progress ** 2 * controlTwo
    + progress ** 3 * end;
};

function NeuralPulseFieldComponent({
  policy,
  active = true,
  mode = 'avatar',
  avatarState = 'idle',
  amplitude = 0,
  transitionPhase = 'idle',
  arrival = 'ready',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseStartedAt = useRef(0);
  const visualRef = useRef({
    active,
    mode,
    avatarState,
    amplitude,
    transitionPhase,
    arrival,
  });

  useEffect(() => {
    visualRef.current = {
      active,
      mode,
      avatarState,
      amplitude,
      transitionPhase,
      arrival,
    };
  }, [active, amplitude, arrival, avatarState, mode, transitionPhase]);

  useEffect(() => {
    phaseStartedAt.current = typeof performance === 'undefined' ? 0 : performance.now();
  }, [arrival, mode, transitionPhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const particles = makeParticles(policy.particleCount);
    let width = 1;
    let height = 1;
    let devicePixelRatio = 1;
    let frame = 0;
    let lastFrameTime = 0;
    const FRAME_INTERVAL_MS = 1000 / 30; // ~30 FPS target

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      // Cap DPR at 1.25 to reduce fill-rate while keeping the field crisp.
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const traceRibbon = (
      index: number,
      time: number,
      offset = 0,
      thickness = 0,
      reverse = false,
    ) => {
      const movement = policy.reducedMotion ? 0 : time * 0.00014;
      const lane = (index * 0.173 + 0.09) % 1;
      const startY = height * (0.04 + lane * 0.92) + offset;
      const endY = height * (0.9 - lane * 0.72) + offset;
      const wave = Math.sin(movement * 1.1 + index * 1.73) * height * 0.13;
      const counterWave = Math.cos(movement * 0.78 + index * 1.21) * height * 0.12;
      if (!reverse) {
        context.moveTo(-width * 0.1, startY);
        context.bezierCurveTo(
          width * 0.18,
          startY - wave - thickness,
          width * (0.56 + Math.sin(movement + index) * 0.12),
          endY + counterWave - thickness,
          width * 1.1,
          endY,
        );
        return;
      }
      context.bezierCurveTo(
        width * (0.56 + Math.sin(movement + index) * 0.12),
        endY + counterWave + thickness,
        width * 0.18,
        startY - wave + thickness,
        -width * 0.1,
        startY,
      );
    };

    const drawPlasmaSheets = (time: number, arrivalProgress: number, intensity: number) => {
      const ribbonCount = Math.max(5, policy.depthLayers + 3);
      context.save();
      context.globalCompositeOperation = 'screen';
      context.lineCap = 'round';
      for (let index = 0; index < ribbonCount; index += 1) {
        const thickness = Math.min(width, height) * (0.018 + (index % 3) * 0.009);
        const gradient = context.createLinearGradient(0, 0, width, height);
        const opacity = (0.09 + (index % 4) * 0.018) * arrivalProgress * intensity;
        gradient.addColorStop(0, 'rgba(14, 94, 176, 0)');
        gradient.addColorStop(0.22, 'rgba(41, 164, 255, ' + (opacity * 0.68).toFixed(3) + ')');
        gradient.addColorStop(0.5, 'rgba(128, 226, 255, ' + opacity.toFixed(3) + ')');
        gradient.addColorStop(0.78, 'rgba(58, 127, 255, ' + (opacity * 0.74).toFixed(3) + ')');
        gradient.addColorStop(1, 'rgba(8, 76, 160, 0)');
        context.beginPath();
        traceRibbon(index, time, 0, thickness);
        traceRibbon(index, time, 0, thickness, true);
        context.closePath();
        context.fillStyle = gradient;
        context.fill();

        context.beginPath();
        traceRibbon(index, time);
        context.strokeStyle = 'rgba(121, 218, 255, ' + (opacity * 1.48).toFixed(3) + ')';
        context.lineWidth = 1.1 + (index % 3) * 0.7;
        context.stroke();
      }
      context.restore();
    };

    const drawVolumetricFog = (time: number, arrivalProgress: number, intensity: number) => {
      const cloudCount = Math.max(5, policy.depthLayers + 3);
      const movement = policy.reducedMotion ? 0 : time * 0.00008;
      context.save();
      context.globalCompositeOperation = 'screen';
      for (let index = 0; index < cloudCount; index += 1) {
        const orbit = movement * (0.55 + index * 0.08) + index * 1.97;
        const x = width * (0.5 + Math.sin(orbit * 1.11) * (0.26 + (index % 3) * 0.055));
        const y = height * (0.5 + Math.cos(orbit * 0.78 + index) * (0.23 + (index % 4) * 0.035));
        const radius = Math.max(width, height) * (0.16 + (index % 4) * 0.045);
        const fog = context.createRadialGradient(x, y, 0, x, y, radius);
        const alpha = (0.1 + (index % 3) * 0.025) * arrivalProgress * intensity;
        fog.addColorStop(0, 'rgba(73, 180, 255, ' + alpha.toFixed(3) + ')');
        fog.addColorStop(0.32, 'rgba(30, 110, 202, ' + (alpha * 0.56).toFixed(3) + ')');
        fog.addColorStop(0.72, 'rgba(17, 61, 138, ' + (alpha * 0.16).toFixed(3) + ')');
        fog.addColorStop(1, 'rgba(3, 16, 42, 0)');
        context.fillStyle = fog;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      context.restore();
    };

    const drawRefractions = (time: number, arrivalProgress: number) => {
      const movement = policy.reducedMotion ? 0 : time * 0.00022;
      const centreX = width * 0.5;
      const centreY = height * 0.5;
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = 'rgba(160, 239, 255, ' + (0.12 * arrivalProgress).toFixed(3) + ')';
      for (let index = 0; index < policy.depthLayers; index += 1) {
        const radius = Math.min(width, height) * (0.17 + index * 0.105);
        context.beginPath();
        context.ellipse(
          centreX + Math.sin(movement + index) * width * 0.025,
          centreY + Math.cos(movement * 0.7 + index) * height * 0.032,
          radius * 1.5,
          radius * (0.24 + index * 0.035),
          movement * (index % 2 ? -0.38 : 0.31) + index * 0.69,
          Math.PI * 0.08,
          Math.PI * 1.48,
        );
        context.lineWidth = 0.6 + index * 0.15;
        context.globalAlpha = 0.13 - index * 0.01;
        context.stroke();
      }
      context.restore();
    };

    const drawAtmosphere = (time: number, arrivalProgress: number) => {
      const centreX = width * 0.5;
      const centreY = height * 0.52;
      const intensity = stateIntensity(visualRef.current.avatarState);
      const backdrop = context.createRadialGradient(
        centreX,
        centreY,
        Math.min(width, height) * 0.015,
        centreX,
        centreY,
        Math.max(width, height) * 0.78,
      );
      backdrop.addColorStop(0, 'rgba(50, 172, 255, ' + (0.52 * arrivalProgress * intensity).toFixed(3) + ')');
      backdrop.addColorStop(0.16, 'rgba(20, 110, 208, ' + (0.34 * arrivalProgress).toFixed(3) + ')');
      backdrop.addColorStop(0.43, 'rgba(7, 50, 121, ' + (0.31 * arrivalProgress).toFixed(3) + ')');
      backdrop.addColorStop(0.74, 'rgba(3, 19, 53, .38)');
      backdrop.addColorStop(1, 'rgba(0, 4, 16, .12)');
      context.fillStyle = backdrop;
      context.fillRect(0, 0, width, height);
      drawVolumetricFog(time, arrivalProgress, intensity);
      drawPlasmaSheets(time, arrivalProgress, intensity);
      drawRefractions(time, arrivalProgress);
    };

    const drawAvatarConvergence = (time: number, arrivalProgress: number) => {
      const visual = visualRef.current;
      if (visual.arrival === 'seed') return;
      const centreX = width * 0.5;
      const centreY = height * 0.5;
      const movement = policy.reducedMotion ? 0 : time * 0.00034;
      const statePower = stateIntensity(visual.avatarState);
      const count = Math.max(9, policy.depthLayers * 2 + 3);
      const radiusX = Math.min(width, height) * 0.22;
      const radiusY = Math.min(width, height) * 0.31;
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.lineCap = 'round';
      for (let index = 0; index < count; index += 1) {
        const angle = index / count * tau + movement * (index % 2 ? -0.9 : 0.7);
        const startX = centreX + Math.cos(angle) * Math.max(width, height) * 0.65;
        const startY = centreY + Math.sin(angle) * Math.max(width, height) * 0.47;
        const endX = centreX + Math.cos(angle * 1.4 + index) * radiusX * (0.36 + index % 3 * 0.12);
        const endY = centreY + Math.sin(angle * 1.2 - index) * radiusY * (0.38 + index % 4 * 0.1);
        const controlOneX = centreX + (startX - centreX) * 0.62 + Math.sin(angle * 2.4) * height * 0.13;
        const controlOneY = centreY + (startY - centreY) * 0.34 - Math.cos(angle * 1.7) * width * 0.1;
        const controlTwoX = centreX + (endX - centreX) * 1.28 - Math.sin(angle * 1.3) * width * 0.08;
        const controlTwoY = centreY + (endY - centreY) * 1.2 + Math.cos(angle * 2.1) * height * 0.08;
        const alpha = (0.09 + (index % 3) * 0.025) * arrivalProgress * statePower;
        context.beginPath();
        context.moveTo(startX, startY);
        context.bezierCurveTo(controlOneX, controlOneY, controlTwoX, controlTwoY, endX, endY);
        context.strokeStyle = 'rgba(106, 215, 255, ' + alpha.toFixed(3) + ')';
        context.lineWidth = 1 + (index % 3) * 0.5;
        context.stroke();

        const travel = (movement * (0.58 + (index % 4) * 0.15) + index / count) % 1;
        const cometX = cubicPoint(startX, controlOneX, controlTwoX, endX, travel);
        const cometY = cubicPoint(startY, controlOneY, controlTwoY, endY, travel);
        context.beginPath();
        context.fillStyle = 'rgba(205, 248, 255, ' + (alpha * 1.8).toFixed(3) + ')';
        context.arc(cometX, cometY, 0.9 + (index % 3) * 0.36, 0, tau);
        context.fill();
      }
      context.restore();
    };

    const drawStreams = (time: number, arrivalProgress: number) => {
      const visual = visualRef.current;
      if (visual.mode === 'avatar' && visual.arrival === 'seed') return;
      const centreX = width * 0.5;
      const centreY = height * 0.5;
      const targets = [
        [0.5, 0.08],
        [0.76, 0.17],
        [0.92, 0.42],
        [0.82, 0.76],
        [0.58, 0.94],
        [0.27, 0.84],
        [0.07, 0.58],
        [0.16, 0.22],
      ];
      const movement = policy.reducedMotion ? 0 : time * 0.00024;
      const engaged = visual.mode !== 'avatar' || visual.transitionPhase !== 'idle';
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.lineCap = 'round';
      targets.forEach(([targetX, targetY], index) => {
        const x = width * targetX;
        const y = height * targetY;
        const bend = Math.sin(movement + index * 1.7) * height * 0.12;
        context.beginPath();
        context.moveTo(centreX, centreY);
        context.bezierCurveTo(
          centreX + (x - centreX) * 0.16 + bend,
          centreY + (y - centreY) * 0.11 - bend,
          centreX + (x - centreX) * 0.8 - bend,
          centreY + (y - centreY) * 0.82 + bend,
          x,
          y,
        );
        const brightness = engaged ? 0.3 : 0.15;
        context.strokeStyle = 'rgba(113, 218, 255, ' + (brightness * arrivalProgress).toFixed(3) + ')';
        context.lineWidth = engaged ? 2.1 : 1.2;
        context.stroke();

        context.strokeStyle = 'rgba(220, 251, 255, ' + (brightness * 0.42 * arrivalProgress).toFixed(3) + ')';
        context.lineWidth = 0.42;
        context.stroke();
      });
      context.restore();
    };

    const drawSignal = (time: number, arrivalProgress: number) => {
      const centreX = width * 0.5;
      const centreY = height * 0.5;
      const base = Math.min(width, height) * 0.12;
      const movement = policy.reducedMotion ? 0 : time * 0.001;
      const visual = visualRef.current;
      const intensity = stateIntensity(visual.avatarState);
      const speaking = visual.avatarState === 'speaking';
      const amplitude = Number.isFinite(visual.amplitude)
        ? clamp(visual.amplitude, 0, 1)
        : 0;
      const thinking = visual.avatarState === 'thinking'
        || visual.avatarState === 'processing'
        || visual.avatarState === 'executing';
      const entryProgress = easeOut((time - phaseStartedAt.current) / 1_180);
      const seedScale = visual.arrival === 'seed'
        ? 0.04
        : visual.arrival === 'spiral'
          ? 0.2 + entryProgress * 0.54
          : 1;
      const drawSignalEllipse = (
        radiusX: number,
        radiusY: number,
        rotation: number,
      ) => {
        if (
          !Number.isFinite(radiusX)
          || !Number.isFinite(radiusY)
          || !Number.isFinite(rotation)
          || radiusX < 0
          || radiusY < 0
        ) {
          return;
        }
        context.ellipse(0, 0, radiusX, radiusY, rotation, 0, tau);
      };

      context.save();
      context.globalCompositeOperation = 'lighter';
      context.translate(centreX, centreY);
      context.lineWidth = 1;

      if (visual.arrival === 'seed' || visual.arrival === 'spiral') {
        const seed = context.createRadialGradient(0, 0, 0, 0, 0, base * 1.75 * seedScale);
        seed.addColorStop(0, 'rgba(235, 254, 255, .98)');
        seed.addColorStop(0.08, 'rgba(143, 228, 255, .94)');
        seed.addColorStop(0.28, 'rgba(56, 184, 255, .62)');
        seed.addColorStop(1, 'rgba(12, 91, 214, 0)');
        context.fillStyle = seed;
        context.beginPath();
        context.arc(0, 0, base * 1.75 * seedScale, 0, tau);
        context.fill();
      }

      for (let index = 0; index < 4 + policy.depthLayers; index += 1) {
        const pulse = speaking ? amplitude * 0.42 + 0.12 : 0;
        const ringBase = base * (0.65 + index * 0.5);
        // The animated wobble is decorative, not a radius. On a small canvas
        // it must not be allowed to exceed the ring's own positive base size.
        const wobble = Math.sin(movement * 1.8 + index) * Math.min(13, ringBase * 0.85);
        const radius = (ringBase + wobble) * seedScale;
        context.beginPath();
        drawSignalEllipse(
          radius * (1.22 + pulse),
          radius * (0.4 + pulse * 0.3),
          movement * (index % 2 ? -0.42 : 0.34) + index * 0.52,
        );
        context.strokeStyle = 'rgba(151, 232, 255, ' + (0.28 * intensity * arrivalProgress).toFixed(3) + ')';
        context.globalAlpha = clamp(0.44 - index * 0.035, 0.08, 0.44);
        context.lineWidth = 0.65 + index * 0.12;
        context.stroke();
      }

      if (thinking) {
        context.globalAlpha = 0.64 * arrivalProgress;
        context.lineWidth = visual.avatarState === 'executing' ? 2.3 : 1.5;
        for (let index = 0; index < 4; index += 1) {
          context.beginPath();
          context.arc(
            0,
            0,
            base * (1.12 + index * 0.47),
            movement * (index % 2 ? -2.5 : 1.7) + index,
            movement * (index % 2 ? -2.5 : 1.7) + Math.PI * 1.45,
          );
          context.stroke();
        }
      }

      if (speaking) {
        const ripples = Math.max(3, policy.depthLayers);
        for (let index = 0; index < ripples; index += 1) {
          const life = (movement * 1.22 + index / ripples) % 1;
          context.beginPath();
          drawSignalEllipse(
            base * (1.52 + life * 3.8 + amplitude * 0.8),
            base * (0.55 + life * 1.34 + amplitude * 0.38),
            movement * 0.28,
          );
          context.globalAlpha = (1 - life) * 0.54 * arrivalProgress;
          context.lineWidth = 1.3 + life;
          context.stroke();
        }
      }
      context.restore();
    };

    const drawParticles = (time: number, arrivalProgress: number) => {
      const visual = visualRef.current;
      const movement = policy.reducedMotion || !visual.active ? 0 : time * 0.00013;
      const entryProgress = easeOut((time - phaseStartedAt.current) / 1_050);
      const emergence = visual.arrival === 'seed'
        ? 0.06
        : visual.arrival === 'spiral'
          ? entryProgress
          : arrivalProgress;
      context.save();
      context.globalCompositeOperation = 'lighter';
      particles.forEach((particle, index) => {
        const current = Math.sin(
          particle.y * 17 + movement * (1.1 + particle.drift) + particle.phase,
        ) * (0.018 + particle.depth * 0.024);
        const x = ((particle.x + current + Math.sin(movement * particle.drift + particle.phase) * 0.026 + 1) % 1) * width;
        const y = ((particle.y + Math.cos(movement * particle.drift * 0.7 + particle.phase) * 0.026 + 1) % 1) * height;
        const near = particle.depth > 0.66;
        const radius = (0.25 + particle.depth * 2.05 + particle.scale * 1.12) * emergence;
        const alpha = (0.045 + particle.depth * 0.34) * emergence;
        context.beginPath();
        context.fillStyle = 'rgba(' + particleTones[particle.tone] + ', ' + alpha.toFixed(3) + ')';
        context.arc(x, y, radius, 0, tau);
        context.fill();

        if (near && index % 7 === 0) {
          context.beginPath();
          context.strokeStyle = 'rgba(' + particleTones[particle.tone] + ', ' + (alpha * 0.65).toFixed(3) + ')';
          context.lineWidth = 0.42 + particle.glow * 0.38;
          context.moveTo(x, y);
          context.bezierCurveTo(
            x + Math.cos(movement + particle.phase) * (13 + particle.depth * 31),
            y - Math.sin(movement + particle.phase) * (7 + particle.depth * 22),
            x + Math.cos(movement * 0.65 + particle.phase) * (22 + particle.depth * 44),
            y + Math.sin(movement * 0.92 + particle.phase) * (10 + particle.depth * 31),
            x + Math.cos(movement * 1.3 + particle.phase) * (32 + particle.depth * 55),
            y + Math.sin(movement * 1.12 + particle.phase) * (15 + particle.depth * 34),
          );
          context.stroke();
        }

        if (near && index % 19 === 0) {
          context.beginPath();
          context.fillStyle = 'rgba(225, 252, 255, ' + (alpha * 0.86).toFixed(3) + ')';
          context.arc(x, y, radius * 2.8, 0, tau);
          context.fill();
        }
      });
      context.restore();
    };

    const drawBurst = (time: number, arrivalProgress: number) => {
      if (policy.reducedMotion || policy.quality === 'low') return;
      const cycle = (time % 12_000) / 12_000;
      const burstProgress = cycle < 0.16 ? cycle / 0.16 : 0;
      if (!burstProgress) return;
      const centreX = width * (0.28 + Math.sin(Math.floor(time / 12_000) * 1.7) * 0.18);
      const centreY = height * (0.38 + Math.cos(Math.floor(time / 12_000) * 1.3) * 0.16);
      const fade = Math.sin(burstProgress * Math.PI) * arrivalProgress;
      context.save();
      context.globalCompositeOperation = 'lighter';
      for (let index = 0; index < 15; index += 1) {
        const angle = index / 15 * tau + time * 0.0002;
        const distance = Math.min(width, height) * burstProgress * (0.16 + index % 4 * 0.035);
        context.beginPath();
        context.moveTo(centreX + Math.cos(angle) * distance * 0.25, centreY + Math.sin(angle) * distance * 0.25);
        context.lineTo(centreX + Math.cos(angle) * distance, centreY + Math.sin(angle) * distance);
        context.strokeStyle = 'rgba(171, 236, 255, ' + (fade * 0.42).toFixed(3) + ')';
        context.lineWidth = 0.5 + index % 3 * 0.22;
        context.stroke();
      }
      context.restore();
    };

    const draw = (time: number) => {
      // Frame-rate limiter: only render every ~33ms (30 FPS target).
      if (time - lastFrameTime < FRAME_INTERVAL_MS) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = time;

      context.clearRect(0, 0, width, height);
      const arrival = visualRef.current.arrival;
      const arrivalProgress = arrival === 'seed'
        ? 0.2
        : arrival === 'spiral'
          ? clamp((time - phaseStartedAt.current) / 700, 0.3, 0.88)
          : 1;
      drawAtmosphere(time, arrivalProgress);
      drawAvatarConvergence(time, arrivalProgress);
      drawStreams(time, arrivalProgress);
      drawSignal(time, arrivalProgress);
      drawParticles(time, arrivalProgress);
      drawBurst(time, arrivalProgress);
      if (!policy.paused && !policy.reducedMotion) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    resize();
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(resize);
    observer?.observe(canvas);
    window.addEventListener('resize', resize);

    // Defer the first frame to allow the page to paint first
    // This prevents the canvas from blocking the initial render
    const startDelay = window.setTimeout(() => {
      draw(performance.now());
    }, 50);

    return () => {
      window.clearTimeout(startDelay);
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      context.clearRect(0, 0, width, height);
    };
  }, [policy]);

  return <canvas ref={canvasRef} className={styles.pulseField} aria-hidden="true" />;
}

// Memoize to prevent unnecessary re-renders
export const NeuralPulseField = memo(NeuralPulseFieldComponent);
