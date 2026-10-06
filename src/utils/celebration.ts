/**
 * Celebration & Dopamine Feedback System for Task Completion
 * Provides tactile audio chime, haptic vibration, expanding shockwave,
 * and vibrant physics-based particle burst.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'star' | 'diamond' | 'rect';
  alpha: number;
  decay: number;
}

const CELEBRATION_COLORS = [
  '#10B981', // Emerald
  '#34D399', // Mint
  '#F59E0B', // Amber Gold
  '#FBBF24', // Yellow
  '#3B82F6', // Electric Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

// Audio Context Singleton for instant, zero-latency playback
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays an uplifting, crisp Apple-style arpeggio chime (G5 -> B5 -> D6)
 */
function playCompletionChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Ascending major chord tones (Hz)
    const notes = [
      { freq: 783.99, time: 0.0, dur: 0.28 }, // G5
      { freq: 987.77, time: 0.05, dur: 0.32 }, // B5
      { freq: 1174.66, time: 0.11, dur: 0.45 }, // D6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Soft exponential decay
      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(0.09, now + time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch {
    // Graceful fallback if audio is restricted
  }
}

/**
 * Trigger full dopamine completion experience
 */
export function celebrateTaskCompletion(
  targetOrX?: HTMLElement | React.MouseEvent | number | null,
  targetY?: number
) {
  let originX = window.innerWidth / 2;
  let originY = window.innerHeight / 2;

  // Resolve coordinates
  if (typeof targetOrX === 'number' && typeof targetY === 'number') {
    originX = targetOrX;
    originY = targetY;
  } else if (targetOrX && typeof targetOrX === 'object') {
    if ('clientX' in targetOrX && typeof (targetOrX as React.MouseEvent).clientX === 'number') {
      originX = (targetOrX as React.MouseEvent).clientX;
      originY = (targetOrX as React.MouseEvent).clientY;
    } else if ('getBoundingClientRect' in targetOrX) {
      const rect = (targetOrX as HTMLElement).getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }
  }

  // 1. Play crystal chime sound
  playCompletionChime();

  // 2. Tactile haptic pulse (Android, iOS PWA / web)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([18, 40, 22]);
    } catch {
      // ignore
    }
  }

  // 3. Render Shockwave ring
  renderShockwaveRing(originX, originY);

  // 4. Render Canvas Micro-Particle Burst
  renderParticleBurst(originX, originY);
}

/**
 * Creates an expanding glowing shockwave ring
 */
function renderShockwaveRing(x: number, y: number) {
  const shockwave = document.createElement('div');
  shockwave.style.position = 'fixed';
  shockwave.style.left = `${x}px`;
  shockwave.style.top = `${y}px`;
  shockwave.style.width = '24px';
  shockwave.style.height = '24px';
  shockwave.style.borderRadius = '50%';
  shockwave.style.border = '2px solid rgba(16, 185, 129, 0.85)';
  shockwave.style.boxShadow = '0 0 14px rgba(16, 185, 129, 0.5)';
  shockwave.style.pointerEvents = 'none';
  shockwave.style.zIndex = '9999';
  shockwave.style.transform = 'translate(-50%, -50%) scale(0.5)';
  shockwave.style.transition = 'all 0.5s cubic-bezier(0.1, 0.8, 0.3, 1)';
  document.body.appendChild(shockwave);

  // Trigger expansion
  requestAnimationFrame(() => {
    shockwave.style.transform = 'translate(-50%, -50%) scale(2.8)';
    shockwave.style.opacity = '0';
  });

  setTimeout(() => {
    if (shockwave.parentNode) shockwave.parentNode.removeChild(shockwave);
  }, 550);
}

/**
 * Creates 24 physics-modeled confetti particles that explode outward with gravity
 */
function renderParticleBurst(centerX: number, centerY: number) {
  const canvas = document.createElement('canvas');
  const size = 300;
  canvas.width = size;
  canvas.height = size;
  canvas.style.position = 'fixed';
  canvas.style.left = `${centerX - size / 2}px`;
  canvas.style.top = `${centerY - size / 2}px`;
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9998';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    return;
  }

  const particleCount = 26;
  const particles: Particle[] = [];
  const shapes: ('circle' | 'star' | 'diamond' | 'rect')[] = [
    'circle',
    'star',
    'diamond',
    'rect',
  ];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
    const speed = 3.5 + Math.random() * 5.5;

    particles.push({
      x: size / 2,
      y: size / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2, // slight upward kick
      color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
      size: 4 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      alpha: 1,
      decay: 0.024 + Math.random() * 0.016,
    });
  }

  let animationFrameId: number;

  const render = () => {
    ctx.clearRect(0, 0, size, size);
    let aliveCount = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;
      aliveCount++;

      // Physics: drag + gravity
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16; // gravity
      p.vx *= 0.96; // air resistance
      p.vy *= 0.96;
      p.rotation += p.rotationSpeed;
      p.alpha = Math.max(0, p.alpha - p.decay);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'star') {
        // 4-point sparkle star
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(0, 0, p.size, 0);
        ctx.quadraticCurveTo(0, 0, 0, p.size);
        ctx.quadraticCurveTo(0, 0, -p.size, 0);
        ctx.quadraticCurveTo(0, 0, 0, -p.size);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    if (aliveCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };

  animationFrameId = requestAnimationFrame(render);
}
