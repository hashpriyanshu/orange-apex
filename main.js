/**
 * McLAREN P1™ // CINEMATIC HERO VIDEO & ATELIER EXPERIENCE
 * High-performance canvas video player
 * Plays ONCE -> Locks permanently on Frame 300 with headlights on -> Only restarts on browser refresh
 */

const TOTAL_FRAMES = 300;
const FPS = 30;
const FRAME_DURATION = 1000 / FPS; // 33.33ms per frame

// DOM Elements
const canvas = document.getElementById('hero-canvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
const headlightBurst = document.getElementById('headlight-burst');
const scrollHint = document.getElementById('scroll-hint');

// State
const images = new Array(TOTAL_FRAMES + 1);
let currentFrame = 1;
let hasCompleted = false;
let isStarted = false;
let lastTimestamp = 0;

/* --------------------------------------------------------------------------
   CANVAS SIZING & HIGH-DPI SCALING
   -------------------------------------------------------------------------- */
function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  renderFrame(Math.round(currentFrame));
}

/* --------------------------------------------------------------------------
   FRAME RENDERER (SCREEN-FILLING MOBILE IMMERSION & DESKTOP RESOLUTION)
   - On mobile: Car is sized to ~90% screen width, full body & headlights visible
   - Top & bottom studio lighting seamlessly extends to fill 100vh of the phone
   - Zero hard letterbox borders or cutoff seams
   -------------------------------------------------------------------------- */
function updateHeadlightCoordinates(w, h, drawX, drawY, drawW, drawH) {
  const hero = document.getElementById('hero');
  if (!hero) return;
  // In 1920x848 frame: Left HL is at 38.54%, Right HL is at 61.46%, Y is at 62.5%
  const hlX1 = ((drawX + drawW * 0.3854) / w) * 100;
  const hlX2 = ((drawX + drawW * 0.6146) / w) * 100;
  const hlY = ((drawY + drawH * 0.625) / h) * 100;
  const flareRadius = Math.max(25, Math.min(drawW * 0.16, 130));

  hero.style.setProperty('--hl-x1', `${hlX1.toFixed(2)}%`);
  hero.style.setProperty('--hl-x2', `${hlX2.toFixed(2)}%`);
  hero.style.setProperty('--hl-y', `${hlY.toFixed(2)}%`);
  hero.style.setProperty('--hl-radius', `${flareRadius.toFixed(0)}px`);
}

function renderFrame(frameIndex) {
  if (!ctx || !canvas) return;

  let img = images[frameIndex];

  if (!img || !img.complete || img.naturalWidth === 0) {
    img = findClosestLoaded(frameIndex);
  }

  if (!img || !img.complete || img.naturalWidth === 0) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  const imgRatio = 1920 / 848; // ~2.264
  const screenRatio = w / h;

  let drawW, drawH, drawX, drawY;
  const isPortrait = screenRatio < 1.0;

  if (isPortrait) {
    // ------------------------------------------------------------------------
    // MOBILE PHONE / PORTRAIT: 100% SCREEN FILL (ZERO BLACK VOID, ZERO GAPS)
    // Sized so that 100% of the McLaren P1 (body, mirrors, headlights, wheels)
    // is fully visible in the center, while the high-res studio ceiling smoke
    // and wet asphalt floor reflections seamlessly extend to fill 100% of the viewport!
    // ------------------------------------------------------------------------
    const targetCarWidth = Math.min(w * 0.90, 800);
    drawW = targetCarWidth / 0.404;
    drawH = drawW / imgRatio;

    // Cinematic camera pan during drive-in (frames 1–135):
    const centerX = (w - drawW) / 2;
    let panFactor = 1.0;
    if (frameIndex < 135) {
      panFactor = Math.min(1.0, Math.max(0, (frameIndex - 1) / 134));
      panFactor = 1 - Math.pow(1 - panFactor, 3); // smooth ease-out
    }
    drawX = (1 - panFactor) * 0 + panFactor * centerX;
    drawY = (h - drawH) / 2;

    // 1. Studio Ceiling Smoke Extension (fills from Y=0 down to drawY + 2)
    // Takes the atmospheric smoke & light shafts from the top of the frame
    ctx.drawImage(img, 0, 0, 1920, 140, drawX, 0, drawW, Math.max(0, drawY + 2));

    // 2. Wet Asphalt Floor Reflection Extension (fills from floorTop down to Y=h)
    // Takes the glossy wet asphalt reflection from the bottom of the frame
    const floorTop = drawY + drawH - 2;
    ctx.drawImage(img, 0, 708, 1920, 140, drawX, floorTop, drawW, Math.max(0, h - floorTop));

    // 3. Crisp Full McLaren P1 in the Center (direct hardware-accelerated render)
    // Both headlights, mirrors, wheels, and aerodynamic curves are 100% visible
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // 4. Soft micro-blend at boundaries so there is zero perceptible line
    const topBlend = ctx.createLinearGradient(0, drawY - 15, 0, drawY + 20);
    topBlend.addColorStop(0, 'rgba(6, 7, 9, 0)');
    topBlend.addColorStop(0.5, 'rgba(6, 7, 9, 0.35)');
    topBlend.addColorStop(1, 'rgba(6, 7, 9, 0)');
    ctx.fillStyle = topBlend;
    ctx.fillRect(0, drawY - 15, w, 35);

    const btmBlend = ctx.createLinearGradient(0, floorTop - 15, 0, floorTop + 20);
    btmBlend.addColorStop(0, 'rgba(6, 7, 9, 0)');
    btmBlend.addColorStop(0.5, 'rgba(6, 7, 9, 0.35)');
    btmBlend.addColorStop(1, 'rgba(6, 7, 9, 0)');
    ctx.fillStyle = btmBlend;
    ctx.fillRect(0, floorTop - 15, w, 35);

  } else {
    // ------------------------------------------------------------------------
    // DESKTOP, LAPTOP, TABLET & WIDESCREEN: FULL COVER (ZERO GAP AT BOTTOM)
    // The video frame extends 100% to the top and bottom edges of the viewport!
    // The wet asphalt floor reflection goes all the way down with ZERO black gaps.
    // ------------------------------------------------------------------------
    drawH = Math.max(h, w / imgRatio);
    drawW = drawH * imgRatio;
    drawX = (w - drawW) / 2;
    drawY = (h - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  updateHeadlightCoordinates(w, h, drawX, drawY, drawW, drawH);
}

function findClosestLoaded(target) {
  for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
    const prev = target - offset;
    if (prev >= 1 && images[prev]?.complete && images[prev].naturalWidth > 0) return images[prev];
    const next = target + offset;
    if (next <= TOTAL_FRAMES && images[next]?.complete && images[next].naturalWidth > 0) return images[next];
  }
  return images[1] || null;
}

/* --------------------------------------------------------------------------
   PRELOAD FRAMES
   - Prioritizes Frame 1 (initial view) and Frame 300 (final resting frame with headlights)
   - Streams intermediate frames 2–299 for continuous playback
   -------------------------------------------------------------------------- */
function preloadFrames() {
  // 1. Initial Frame 1
  const first = new Image();
  first.src = `./frames/ezgif-frame-001.jpg`;
  const startCarSequence = () => {
    images[1] = first;
    renderFrame(1);
    if (!isStarted) {
      isStarted = true;
      requestAnimationFrame(videoLoop);
    }
  };
  if (first.complete && first.naturalWidth > 0) {
    startCarSequence();
  } else {
    first.onload = startCarSequence;
  }

  // 2. Final Frame 300 (preloaded with top priority so final headlights are guaranteed)
  const finalFrame = new Image();
  finalFrame.src = `./frames/ezgif-frame-300.jpg`;
  finalFrame.onload = () => {
    images[TOTAL_FRAMES] = finalFrame;
    if (hasCompleted) {
      renderFrame(TOTAL_FRAMES);
    }
  };

  // 3. Load all remaining frames
  for (let i = 2; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    const pad = ('000' + i).slice(-3);
    img.src = `./frames/ezgif-frame-${pad}.jpg`;
    img.onload = () => {
      images[i] = img;
    };
  }
}

/* --------------------------------------------------------------------------
   MAIN VIDEO PLAYBACK (PLAYS ONCE & STAYS PERMANENTLY ON FRAME 300 WITH HEADLIGHTS ON)
   - Never closes or disappears: the car remains in place with headlights blazing.
   - Only restarts when the user reloads / refreshes the webpage.
   -------------------------------------------------------------------------- */
function videoLoop(timestamp) {
  if (hasCompleted) {
    // Permanently locked on frame 300 with headlights on
    renderFrame(TOTAL_FRAMES);
    updateHeadlightFX(TOTAL_FRAMES);
    return;
  }

  if (!lastTimestamp) lastTimestamp = timestamp;
  const elapsed = timestamp - lastTimestamp;

  if (elapsed >= FRAME_DURATION) {
    // Advance frames smoothly, capping step to 2 to prevent skipping during lag
    const framesToAdvance = Math.min(Math.floor(elapsed / FRAME_DURATION), 2);
    lastTimestamp = timestamp - (elapsed % FRAME_DURATION);

    const targetFrame = currentFrame + framesToAdvance;

    if (targetFrame >= TOTAL_FRAMES) {
      currentFrame = TOTAL_FRAMES;
      hasCompleted = true; // PERMANENT LOCK: will not loop or reset
    } else if (images[targetFrame]?.complete && images[targetFrame].naturalWidth > 0) {
      currentFrame = targetFrame;
    } else if (images[currentFrame + 1]?.complete && images[currentFrame + 1].naturalWidth > 0) {
      currentFrame = currentFrame + 1;
    }

    updateHeadlightFX(Math.round(currentFrame));
  }

  renderFrame(Math.round(currentFrame));

  if (!hasCompleted) {
    requestAnimationFrame(videoLoop);
  } else {
    // Final lock: frame 300 rendered with full headlights active
    renderFrame(TOTAL_FRAMES);
    updateHeadlightFX(TOTAL_FRAMES);
    if (headlightBurst) headlightBurst.classList.add('active-headlights');
    if (scrollHint) scrollHint.style.opacity = '1';
  }
}

function updateHeadlightFX(frame) {
  if (frame >= 220) {
    const flare = Math.min(1, (frame - 220) / 80);
    if (headlightBurst) headlightBurst.style.opacity = (flare * 0.95).toString();
  } else {
    if (headlightBurst && !hasCompleted) headlightBurst.style.opacity = '0';
  }
}

const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;

  // Navbar transparency & blur transition
  if (scrollY > 40) {
    navbar?.classList.add('scrolled');
    scrollHint?.classList.add('opacity-0');
  } else {
    navbar?.classList.remove('scrolled');
    scrollHint?.classList.remove('opacity-0');
  }

  // Active section spy
  let currentSectionId = 'hero';
  sections.forEach((sec) => {
    const top = sec.offsetTop - 120;
    const height = sec.offsetHeight;
    if (scrollY >= top && scrollY < top + height) {
      currentSectionId = sec.getAttribute('id');
    }
  });

  navLinks.forEach((link) => {
    if (link.getAttribute('href') === `#${currentSectionId}`) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}, { passive: true });

// Mobile Navigation Drawer Controls
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

function toggleMobileMenu() {
  if (!mobileMenu) return;
  const isOpen = mobileMenu.classList.toggle('menu-open');
  mobileMenuBtn?.classList.toggle('menu-open', isOpen);
  mobileMenuBtn?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeMobileMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.remove('menu-open');
  mobileMenuBtn?.classList.remove('menu-open');
  mobileMenuBtn?.setAttribute('aria-expanded', 'false');
}

mobileMenuBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMobileMenu();
});

mobileNavLinks.forEach((link) => {
  link.addEventListener('click', () => {
    closeMobileMenu();
  });
});

document.addEventListener('click', (e) => {
  if (mobileMenu?.classList.contains('menu-open')) {
    if (!mobileMenu.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
      closeMobileMenu();
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu?.classList.contains('menu-open')) {
    closeMobileMenu();
  }
});

window.addEventListener('resize', () => {
  resizeCanvas();
  if (window.innerWidth >= 768) {
    closeMobileMenu();
  }
});

/* --------------------------------------------------------------------------
   DARK / LIGHT THEME TOGGLE (NOIR vs MONACO ATELIER)
   -------------------------------------------------------------------------- */
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle-btn');
const mobileThemeLabel = document.getElementById('mobile-theme-label');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');

function applyTheme(theme) {
  const isDark = theme === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    themeIconSun?.classList.remove('hidden');
    themeIconMoon?.classList.add('hidden');
    if (mobileThemeLabel) mobileThemeLabel.textContent = 'Noir (Dark)';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    themeIconSun?.classList.add('hidden');
    themeIconMoon?.classList.remove('hidden');
    if (mobileThemeLabel) mobileThemeLabel.textContent = 'Monaco (Light)';
  }
  localStorage.setItem('mclaren_theme', theme);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
}

themeToggleBtn?.addEventListener('click', toggleTheme);
mobileThemeToggleBtn?.addEventListener('click', toggleTheme);

// Initialize saved theme or default to dark
const savedTheme = localStorage.getItem('mclaren_theme') || 'dark';
applyTheme(savedTheme);

// Initialize
preloadFrames();
resizeCanvas();

/* --------------------------------------------------------------------------
   UNDER-WEBPAGE INTERACTIVE BACKGROUND CANVAS
   Living reactive background: atmospheric light beam, wind-tunnel grid, and drifting embers
   Adapts dynamically between Noir Dark & Monaco White Light Mode
   -------------------------------------------------------------------------- */
const bgCanvas = document.getElementById('bg-canvas');
if (bgCanvas) {
  const bgCtx = bgCanvas.getContext('2d');
  let bgW = window.innerWidth;
  let bgH = window.innerHeight;

  function resizeBgCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bgW = window.innerWidth;
    bgH = window.innerHeight;
    bgCanvas.width = bgW * dpr;
    bgCanvas.height = bgH * dpr;
    bgCtx.scale(dpr, dpr);
  }
  resizeBgCanvas();
  window.addEventListener('resize', resizeBgCanvas);

  // Mouse & Touch tracking with fluid physics
  let mouseX = bgW * 0.5;
  let mouseY = bgH * 0.4;
  let lightX = mouseX;
  let lightY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  // Floating ambient embers
  const EMBER_COUNT = 45;
  const embers = [];
  for (let i = 0; i < EMBER_COUNT; i++) {
    embers.push({
      x: Math.random() * bgW,
      y: Math.random() * bgH,
      size: Math.random() * 2 + 0.8,
      speedY: Math.random() * 0.5 + 0.2,
      speedX: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.2
    });
  }

  function renderBg() {
    // Smooth weighted camera / light movement
    lightX += (mouseX - lightX) * 0.055;
    lightY += (mouseY - lightY) * 0.055;

    const isDark = document.documentElement.classList.contains('dark');

    // Clear background
    bgCtx.fillStyle = isDark ? '#080809' : '#F5F6F9';
    bgCtx.fillRect(0, 0, bgW, bgH);

    // 1. Interactive atmospheric spotlight beam under the webpage
    const maxRadius = Math.max(bgW, bgH) * 0.5;
    const radGrad = bgCtx.createRadialGradient(lightX, lightY, 0, lightX, lightY, maxRadius);
    if (isDark) {
      radGrad.addColorStop(0, 'rgba(255, 119, 0, 0.16)');
      radGrad.addColorStop(0.3, 'rgba(255, 90, 0, 0.06)');
      radGrad.addColorStop(0.7, 'rgba(255, 60, 0, 0.015)');
      radGrad.addColorStop(1, 'rgba(8, 8, 9, 0)');
    } else {
      radGrad.addColorStop(0, 'rgba(255, 119, 0, 0.10)');
      radGrad.addColorStop(0.3, 'rgba(255, 119, 0, 0.04)');
      radGrad.addColorStop(0.7, 'rgba(255, 119, 0, 0.01)');
      radGrad.addColorStop(1, 'rgba(245, 246, 249, 0)');
    }

    bgCtx.fillStyle = radGrad;
    bgCtx.fillRect(0, 0, bgW, bgH);

    // 2. Wind-tunnel precision grid lines that illuminate near cursor
    const gridSize = 70;
    for (let x = 0; x < bgW; x += gridSize) {
      for (let y = 0; y < bgH; y += gridSize) {
        const dx = x - lightX;
        const dy = y - lightY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 420) {
          const intensity = Math.pow(1 - dist / 420, 2);
          bgCtx.fillStyle = `rgba(255, 119, 0, ${intensity * (isDark ? 0.35 : 0.45)})`;
          bgCtx.fillRect(x - 1, y - 1, 2, 2);
        } else {
          bgCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.035)';
          bgCtx.fillRect(x - 0.5, y - 0.5, 1, 1);
        }
      }
    }

    // 3. Floating wind-tunnel micro-embers
    for (let i = 0; i < EMBER_COUNT; i++) {
      const ember = embers[i];
      ember.y -= ember.speedY;
      ember.x += ember.speedX;

      if (ember.y < -10) ember.y = bgH + 10;
      if (ember.x < -10) ember.x = bgW + 10;
      if (ember.x > bgW + 10) ember.x = -10;

      const edx = ember.x - lightX;
      const edy = ember.y - lightY;
      const edist = Math.sqrt(edx * edx + edy * edy);
      let emberAlpha = ember.alpha;
      if (edist < 350) {
        emberAlpha = Math.min(0.9, ember.alpha + (1 - edist / 350) * 0.6);
        bgCtx.fillStyle = `rgba(255, 119, 0, ${emberAlpha})`;
      } else {
        bgCtx.fillStyle = isDark
          ? `rgba(255, 255, 255, ${emberAlpha * 0.25})`
          : `rgba(20, 20, 25, ${emberAlpha * 0.2})`;
      }

      bgCtx.beginPath();
      bgCtx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      bgCtx.fill();
    }

    requestAnimationFrame(renderBg);
  }

  requestAnimationFrame(renderBg);
}

