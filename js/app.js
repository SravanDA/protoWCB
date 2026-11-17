/* ============================================= */
/* WCB Robotics — ELMO                          */
/* Main Application: Three.js + GSAP + Lenis    */
/* ============================================= */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ─────────────────────────────────────────────
// GLOBALS
// ─────────────────────────────────────────────
const { gsap, ScrollTrigger, Lenis } = window;
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

let scene, camera, renderer, composer, robotGroup;
let frontArmorGroup, topHandleMesh, suctionGroup, internalGroup;
let turbineBlades1, turbineBlades2;
let bodyMaterial, ledMaterial, glassMaterial;
let autoRotate = true;
let robotTargetRotationY = 0;
let robotCurrentRotationY = 0;
let mouseTiltX = 0, mouseTiltY = 0;
let isDragging = false;
let isExploded = false;
let sceneReady = false;

// ─────────────────────────────────────────────
// 1. LENIS SMOOTH SCROLL (With graceful fallback)
// ─────────────────────────────────────────────
let lenis = null;
if (typeof Lenis !== 'undefined') {
  try {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }
    if (typeof gsap !== 'undefined') {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  } catch (e) {
    console.warn('Lenis failed to initialize, using native scroll', e);
  }
}

// ─────────────────────────────────────────────
// 2. THREE.JS SCENE
// ─────────────────────────────────────────────
function initThreeJS() {
  try {
    const canvas = document.getElementById('robotCanvas');
    if (!canvas) return;

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Scene
    scene = new THREE.Scene();

    // Environment for reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Camera
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.5, 10);

    // Lights
    // Key light (top-right, warm)
    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.8);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);

    // Fill light (left, cool)
    const fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.6);
    fillLight.position.set(-4, 2, 2);
    scene.add(fillLight);

    // Rim light (behind, blue tint)
    const rimLight = new THREE.DirectionalLight(0x2997ff, 1.0);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    // Ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    // Build robot
    buildRobot();

    // Post-processing
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,  // strength
      0.5,  // radius
      0.8   // threshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // Resize handler
    window.addEventListener('resize', onWindowResize);

    // Mark ready
    sceneReady = true;

    // Start render loop
    animate();
  } catch (err) {
    console.warn('Three.js setup encountered an issue, proceeding with fallback:', err);
    sceneReady = true;
  }
}

function buildRobot() {
  robotGroup = new THREE.Group();

  // ── Materials ──
  bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x9ea0a6, // Aerospace Titanium by default
    metalness: 0.85,
    roughness: 0.2,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.2,
  });

  glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x050b14,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.75,
    thickness: 0.8,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 1.2,
  });

  const suctionMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1f242d,
    roughness: 0.6,
    metalness: 0.4,
  });

  ledMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2997ff,
    emissive: 0x2997ff,
    emissiveIntensity: 2.5,
    metalness: 0.1,
    roughness: 0.2,
  });

  const chromeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.95,
    roughness: 0.1,
    clearcoat: 1.0,
  });

  const copperMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb87333,
    metalness: 0.8,
    roughness: 0.3,
  });

  const circuitMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0d1f18,
    metalness: 0.4,
    roughness: 0.5,
  });

  const rubberMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x151515,
    roughness: 0.9,
    metalness: 0.0,
  });

  const ventMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1e1e24,
    roughness: 0.5,
    metalness: 0.5,
  });

  // ── Main Chassis / Rear Hull ──
  const bodyShape = createRoundedRectShape(4.4, 3.4, 0.4);
  const extrudeSettings = {
    depth: 1.6,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.15,
    bevelSegments: 8,
  };
  const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
  bodyGeometry.center();
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  robotGroup.add(body);

  // ── Front Armor Shell (Separates during Exploded View) ──
  frontArmorGroup = new THREE.Group();
  
  // Front armor plate
  const frontPlateShape = createRoundedRectShape(4.1, 3.1, 0.35);
  const frontPlateGeometry = new THREE.ExtrudeGeometry(frontPlateShape, {
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 6,
  });
  frontPlateGeometry.center();
  const frontPlate = new THREE.Mesh(frontPlateGeometry, bodyMaterial);
  frontPlate.position.set(0, 0, 0.95);
  frontArmorGroup.add(frontPlate);

  // Front Sapphire Glass Sensor Bay
  const glassShape = createRoundedRectShape(2.5, 1.7, 0.25);
  const glassGeometry = new THREE.ExtrudeGeometry(glassShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 6,
  });
  glassGeometry.center();
  const glassPanel = new THREE.Mesh(glassGeometry, glassMaterial);
  glassPanel.position.set(0, 0.2, 1.05);
  frontArmorGroup.add(glassPanel);

  // Dual Optic LiDAR Apertures (Inside the glass bay)
  [-0.6, 0.6].forEach((xPos) => {
    // Optical barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.35, 0.2, 32),
      chromeMaterial
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(xPos, 0.2, 0.98);
    frontArmorGroup.add(barrel);

    // Optical lens
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshPhysicalMaterial({
        color: 0x0a192f,
        roughness: 0.05,
        transmission: 0.85,
        metalness: 0.2,
      })
    );
    lens.position.set(xPos, 0.2, 1.08);
    frontArmorGroup.add(lens);

    // Glowing cyan aperture ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.02, 16, 32),
      ledMaterial
    );
    ring.position.set(xPos, 0.2, 1.06);
    frontArmorGroup.add(ring);
  });

  // LED Perimeter Glow Track
  const ledRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.04, 16, 64),
    ledMaterial
  );
  ledRing.position.set(0, 0.2, 1.02);
  frontArmorGroup.add(ledRing);

  // Corner Status LEDs
  const cornerPositions = [
    [-1.6, 1.1], [1.6, 1.1], [-1.6, -0.9], [1.6, -0.9]
  ];
  cornerPositions.forEach(([x, y]) => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      ledMaterial
    );
    dot.position.set(x, y, 1.04);
    frontArmorGroup.add(dot);
  });

  // Laser Etched Titanium Branding Plate
  const logoPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.28, 0.02),
    chromeMaterial
  );
  logoPlate.position.set(0, -0.9, 1.04);
  frontArmorGroup.add(logoPlate);

  robotGroup.add(frontArmorGroup);

  // ── Top Ergonomic Handle (Separates during Exploded View) ──
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.8, 1.8, 0),
    new THREE.Vector3(-0.8, 2.25, 0),
    new THREE.Vector3(0, 2.4, 0),
    new THREE.Vector3(0.8, 2.25, 0),
    new THREE.Vector3(0.8, 1.8, 0),
  ]);
  const handleGeometry = new THREE.TubeGeometry(handleCurve, 24, 0.09, 16, false);
  topHandleMesh = new THREE.Mesh(handleGeometry, chromeMaterial);
  robotGroup.add(topHandleMesh);

  // ── Suction Pods Group (Separates during Exploded View) ──
  suctionGroup = new THREE.Group();
  const cupPositions = [
    [-1.5, 1.1, -0.95],
    [1.5, 1.1, -0.95],
    [-1.5, -0.9, -0.95],
    [1.5, -0.9, -0.95],
  ];
  cupPositions.forEach(([x, y, z]) => {
    // Pneumatic Telescopic Piston
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.5, 24),
      chromeMaterial
    );
    piston.rotation.x = Math.PI / 2;
    piston.position.set(x, y, z + 0.2);
    suctionGroup.add(piston);

    // Suction Bell
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.55, 0.35, 32),
      suctionMaterial
    );
    cup.rotation.x = Math.PI / 2;
    cup.position.set(x, y, z);
    suctionGroup.add(cup);

    // Silicone vacuum sealing lip
    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.05, 12, 32),
      rubberMaterial
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.set(x, y, z - 0.18);
    suctionGroup.add(lip);

    // Micro pressure sensor ring
    const sensorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.02, 8, 24),
      ledMaterial
    );
    sensorRing.rotation.x = Math.PI / 2;
    sensorRing.position.set(x, y, z - 0.08);
    suctionGroup.add(sensorRing);
  });
  robotGroup.add(suctionGroup);

  // ── INTERNAL ARCHITECTURE (Revealed in Exploded View) ──
  internalGroup = new THREE.Group();

  // Internal Chassis Frame
  const frameGeometry = new THREE.BoxGeometry(3.6, 2.8, 1.1);
  const frameMesh = new THREE.Mesh(
    frameGeometry,
    new THREE.MeshPhysicalMaterial({ color: 0x111317, metalness: 0.8, roughness: 0.4 })
  );
  internalGroup.add(frameMesh);

  // Motherboard PCB
  const pcbGeometry = new THREE.BoxGeometry(3.2, 2.4, 0.05);
  const pcbMesh = new THREE.Mesh(pcbGeometry, circuitMaterial);
  pcbMesh.position.set(0, 0, 0.35);
  internalGroup.add(pcbMesh);

  // Central Neural Engine Chip (Glowing Silicon Die)
  const chipGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
  const chipMesh = new THREE.Mesh(
    chipGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x050505,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x0044aa,
      emissiveIntensity: 1.5,
    })
  );
  chipMesh.position.set(0, 0.2, 0.42);
  internalGroup.add(chipMesh);

  // Chip heat sink copper coils
  [-0.6, 0.6].forEach(x => {
    const heatPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.6, 16),
      copperMaterial
    );
    heatPipe.position.set(x, 0.2, 0.4);
    internalGroup.add(heatPipe);
  });

  // Dual Vacuum Turbines (With spinning fan blades!)
  const turbine1Group = new THREE.Group();
  turbine1Group.position.set(-1.0, -0.4, 0.1);
  const turbine2Group = new THREE.Group();
  turbine2Group.position.set(1.0, -0.4, 0.1);

  [turbine1Group, turbine2Group].forEach((tGroup, idx) => {
    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32),
      new THREE.MeshPhysicalMaterial({ color: 0x22252c, metalness: 0.7, roughness: 0.3 })
    );
    casing.rotation.x = Math.PI / 2;
    tGroup.add(casing);

    // Spinning impeller
    const impeller = new THREE.Group();
    for (let b = 0; b < 8; b++) {
      const angle = (b / 8) * Math.PI * 2;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.35, 0.18),
        chromeMaterial
      );
      blade.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 0);
      blade.rotation.z = angle + 0.3;
      impeller.add(blade);
    }
    tGroup.add(impeller);
    if (idx === 0) turbineBlades1 = impeller;
    else turbineBlades2 = impeller;

    internalGroup.add(tGroup);
  });

  // 8-Cell Li-Titanate Power Bank (Top Row)
  for (let c = -1.2; c <= 1.2; c += 0.4) {
    const cell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.7, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x1f232b, metalness: 0.6, roughness: 0.3 })
    );
    cell.position.set(c, 0.9, 0.15);
    internalGroup.add(cell);

    // Gold terminal cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16),
      new THREE.MeshPhysicalMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 })
    );
    cap.position.set(c, 1.27, 0.15);
    internalGroup.add(cap);
  }

  robotGroup.add(internalGroup);

  // ── Underside Scrubbing & Atomization Matrix ──
  const padGeometry = new THREE.BoxGeometry(3.9, 0.16, 0.7);
  const pad = new THREE.Mesh(padGeometry, rubberMaterial);
  pad.position.set(0, -1.82, 0);
  robotGroup.add(pad);

  // Microfiber scrubbing strip ridges
  for (let i = -1.6; i <= 1.6; i += 0.4) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.18, 0.72),
      new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.95 })
    );
    strip.position.set(i, -1.82, 0);
    robotGroup.add(strip);
  }

  // Micro-Mist Ultrasonic Brass Spray Nozzles
  [-1.2, 0, 1.2].forEach(x => {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.1, 16),
      copperMaterial
    );
    nozzle.position.set(x, -1.88, 0.2);
    robotGroup.add(nozzle);
  });

  // ── CNC Milled Aero Intake Vents (Left & Right) ──
  const ventPositions = [
    { x: 2.28, side: 1 },
    { x: -2.28, side: -1 },
  ];
  ventPositions.forEach(({ x }) => {
    for (let i = 0; i < 5; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.12, 1.1),
        ventMaterial
      );
      vent.position.set(x, 0.7 - i * 0.3, 0);
      robotGroup.add(vent);
    }
  });

  // Position & add to scene
  robotGroup.position.set(0, -0.2, 0);
  robotGroup.scale.setScalar(0.78);
  scene.add(robotGroup);
}

function createRoundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function onWindowResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}

let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (robotGroup) {
    if (autoRotate && !isDragging) {
      robotTargetRotationY += 0.0015;
    }
    robotCurrentRotationY += (robotTargetRotationY - robotCurrentRotationY) * 0.06;
    robotGroup.rotation.y = robotCurrentRotationY;

    // Mouse tilt / gyro parallax
    robotGroup.rotation.x = THREE.MathUtils.lerp(robotGroup.rotation.x, mouseTiltY * 0.12, 0.05);
    robotGroup.rotation.z = THREE.MathUtils.lerp(robotGroup.rotation.z, -mouseTiltX * 0.12, 0.05);

    // Subtle floating motion
    robotGroup.position.y = -0.2 + Math.sin(Date.now() * 0.001) * 0.06;

    // Spin turbines inside the vacuum impellers
    if (turbineBlades1) turbineBlades1.rotation.z += 0.18;
    if (turbineBlades2) turbineBlades2.rotation.z -= 0.18;
  }

  composer.render();
}

// ─────────────────────────────────────────────
// 3. CSS PARTICLES (Hero & CTA)
// ─────────────────────────────────────────────
function createParticles(containerId, count, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = type === 'star' ? 'star-particle' : 'particle';

    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = type === 'star' ? Math.random() * 2 + 0.5 : Math.random() * 2 + 1;
    const duration = type === 'star'
      ? Math.random() * 4 + 2
      : Math.random() * 15 + 10;
    const delay = Math.random() * duration;

    particle.style.cssText = `
      left: ${x}%;
      top: ${y}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
    `;

    container.appendChild(particle);
  }
}

// ─────────────────────────────────────────────
// 4. PRELOADER
// ─────────────────────────────────────────────
function initPreloader() {
  const preloader = document.getElementById('preloader');
  const bar = document.getElementById('preloaderBar');
  const letters = document.querySelectorAll('.preloader__letter');

  if (typeof gsap !== 'undefined') {
    gsap.to(letters, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power3.out',
    });
  } else {
    letters.forEach(l => {
      l.style.opacity = '1';
      l.style.transform = 'none';
    });
  }

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearInterval(progressTimer);
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      if (preloader) preloader.classList.add('is-hidden');
      const canvas = document.getElementById('robotCanvas');
      if (canvas) canvas.classList.add('is-visible');
      initAnimations();
    }, 200);
  }

  let progress = 0;
  const progressTimer = setInterval(() => {
    progress += Math.random() * 25 + 15;
    if (progress >= 100) {
      progress = 100;
      dismiss();
    }
    if (bar) bar.style.width = progress + '%';
  }, 100);

  // Guaranteed dismiss after 1.4 seconds
  setTimeout(dismiss, 1400);
}

// ─────────────────────────────────────────────
// 5. NAVIGATION
// ─────────────────────────────────────────────
function initNavigation() {
  const nav = document.getElementById('navbar');
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-menu__link');

  // Scroll state
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      start: 'top -80',
      end: 99999,
      onUpdate: (self) => {
        if (self.direction === 1 || self.progress > 0) {
          nav.classList.add('is-scrolled');
        }
        if (self.progress === 0) {
          nav.classList.remove('is-scrolled');
        }
      },
    });
  }

  // Hamburger toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('is-active');
      mobileMenu.classList.toggle('is-active');
      if (mobileMenu.classList.contains('is-active')) {
        if (lenis) lenis.stop();
      } else {
        if (lenis) lenis.start();
      }
    });

    // Close mobile menu on link click
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('is-active');
        mobileMenu.classList.remove('is-active');
        if (lenis) lenis.start();
      });
    });
  }

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(target, { offset: -60 });
        } else {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

// ─────────────────────────────────────────────
// 6. GSAP SCROLL ANIMATIONS
// ─────────────────────────────────────────────
function initAnimations() {
  if (typeof gsap === 'undefined') return;

  // Hero entrance
  gsap.from('.hero__eyebrow', {
    y: 20,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.1,
  });

  gsap.from('.hero__title', {
    y: 60,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    delay: 0.2,
  });

  gsap.from('.hero__subtitle', {
    y: 30,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.3,
  });

  gsap.from('.hero__desc', {
    y: 25,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.4,
  });

  gsap.from('.hero__actions', {
    y: 20,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.5,
  });

  gsap.from('.hero__scroll-indicator', {
    opacity: 0,
    duration: 1,
    delay: 0.8,
    ease: 'power2.out',
  });

  // ── Mission statement entrance ──
  gsap.from('.tagline__statement', {
    y: 50,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#tagline',
      start: 'top 80%',
    },
  });

  gsap.from('.tagline__lead', {
    y: 40,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    delay: 0.2,
    scrollTrigger: {
      trigger: '#tagline',
      start: 'top 80%',
    },
  });

  // ── Product Showcase — robot rotation + callouts ──
  initShowcase();

  // ── 3D Canvas visibility control ──
  // Show during hero and showcase, fade in other sections
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '#impact',
      start: 'top 80%',
      end: 'top 20%',
      scrub: true,
      onUpdate: (self) => {
        const canvas = document.getElementById('robotCanvas');
        if (canvas) canvas.style.opacity = 1 - self.progress;
      },
    });

    ScrollTrigger.create({
      trigger: '#cta',
      start: 'top 80%',
      end: 'top 50%',
      scrub: true,
      onUpdate: (self) => {
        const canvas = document.getElementById('robotCanvas');
        if (canvas) canvas.style.opacity = self.progress * 0.35;
      },
    });
  }

  // ── Impact section — counter animations & comparison cards ──
  initCounters();

  gsap.from('.impact__title', {
    y: 50,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.impact__header',
      start: 'top 85%',
    },
  });

  gsap.from('.impact__stat', {
    y: 35,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.impact__stats',
      start: 'top 80%',
    },
  });

  gsap.from('.impact__card', {
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.impact__comparison',
      start: 'top 80%',
    },
  });

  // ── Features card stagger ──
  gsap.from('.features__card', {
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.features__grid',
      start: 'top 80%',
    },
  });

  gsap.from('.features__title', {
    y: 60,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.features__title',
      start: 'top 85%',
    },
  });

  // ── How It Works ──
  initHowItWorks();

  // ── Specifications stagger ──
  gsap.from('.specs__title', {
    y: 60,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.specs__title',
      start: 'top 85%',
    },
  });

  gsap.from('.specs__row', {
    y: 30,
    opacity: 0,
    duration: 0.6,
    stagger: 0.06,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.specs__grid',
      start: 'top 80%',
    },
  });

  // ── CTA entrance ──
  gsap.from('.cta__title', {
    y: 60,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.cta__title',
      start: 'top 85%',
    },
  });

  gsap.from('.cta__subtitle', {
    y: 40,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.1,
    scrollTrigger: {
      trigger: '.cta__subtitle',
      start: 'top 85%',
    },
  });

  gsap.from('.cta__buttons', {
    y: 30,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.2,
    scrollTrigger: {
      trigger: '.cta__buttons',
      start: 'top 90%',
    },
  });
}

// ─────────────────────────────────────────────
// 7. PRODUCT SHOWCASE (Pinned + Robot Rotation)
// ─────────────────────────────────────────────
function initShowcase() {
  const callouts = document.querySelectorAll('.showcase__callout');
  const bgTransition = document.querySelector('.showcase__bg-transition');

  ScrollTrigger.create({
    trigger: '#showcase',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      const progress = self.progress; // 0 to 1

      // Rotate robot through 360 degrees
      if (robotGroup) {
        autoRotate = false;
        robotTargetRotationY = progress * Math.PI * 2;
      }

      // Determine which callout to show (4 stops)
      const step = Math.floor(progress * 4);
      const clampedStep = Math.min(step, 3);

      callouts.forEach((callout, i) => {
        if (i === clampedStep) {
          callout.classList.add('is-active');
        } else {
          callout.classList.remove('is-active');
        }
      });

      // Background transition at the end
      if (bgTransition) {
        const bgProgress = Math.max(0, (progress - 0.85) / 0.15);
        bgTransition.style.opacity = bgProgress;
      }
    },
    onLeave: () => {
      autoRotate = true;
    },
    onEnterBack: () => {
      autoRotate = false;
    },
  });
}

// ─────────────────────────────────────────────
// 8. ANIMATED COUNTERS
// ─────────────────────────────────────────────
function initCounters() {
  const counters = document.querySelectorAll('.impact__stat-number');

  counters.forEach((counter) => {
    const target = parseFloat(counter.dataset.count);
    const prefix = counter.dataset.prefix || '';
    const suffix = counter.dataset.suffix || '';
    const isDecimal = counter.dataset.decimal === 'true';

    ScrollTrigger.create({
      trigger: counter,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 2,
          ease: 'power2.out',
          onUpdate: function () {
            const current = this.targets()[0].val;
            if (isDecimal) {
              counter.textContent = prefix + current.toFixed(1) + suffix;
            } else {
              counter.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
            }
          },
        });
      },
    });
  });
}

// ─────────────────────────────────────────────
// 9. HOW IT WORKS (Pinned Steps)
// ─────────────────────────────────────────────
function initHowItWorks() {
  const steps = document.querySelectorAll('.how-it-works__step');
  const progressFill = document.getElementById('howItWorksProgress');

  gsap.from('.how-it-works__title', {
    y: 60,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.how-it-works__title',
      start: 'top 85%',
    },
  });

  ScrollTrigger.create({
    trigger: '#howItWorks',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
    onUpdate: (self) => {
      const progress = self.progress;
      const step = Math.floor(progress * 4);
      const clampedStep = Math.min(step, 3);

      // Progress bar
      if (progressFill) {
        progressFill.style.width = (progress * 100) + '%';
      }

      // Step transitions
      steps.forEach((s, i) => {
        if (i === clampedStep) {
          s.classList.add('how-it-works__step--active');
        } else {
          s.classList.remove('how-it-works__step--active');
        }
      });
    },
  });
}

// ─────────────────────────────────────────────
// 10. INTERACTIVE CONTROLS (Finishes, Exploded, Drag)
// ─────────────────────────────────────────────
function initInteractiveControls() {
  const heroSection = document.getElementById('hero');
  let lastX = 0;

  // Pointer drag to rotate 3D robot
  window.addEventListener('pointermove', (e) => {
    mouseTiltX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseTiltY = (e.clientY / window.innerHeight - 0.5) * 2;

    if (isDragging) {
      const deltaX = e.clientX - lastX;
      lastX = e.clientX;
      robotTargetRotationY += deltaX * 0.007;
      autoRotate = false;
    }
  });

  if (heroSection) {
    heroSection.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
      isDragging = true;
      lastX = e.clientX;
      heroSection.classList.add('is-dragging');
      autoRotate = false;
    });
  }

  window.addEventListener('pointerup', () => {
    if (isDragging) {
      isDragging = false;
      if (heroSection) heroSection.classList.remove('is-dragging');
      setTimeout(() => {
        autoRotate = true;
      }, 2000);
    }
  });
}


// ─────────────────────────────────────────────
// 12. INITIALIZATION
// ─────────────────────────────────────────────
function init() {
  // Create particles
  createParticles('heroParticles', 40, 'float');
  createParticles('ctaParticles', 60, 'star');

  // Init navigation
  initNavigation();

  // Init Three.js
  initThreeJS();

  // Init Interactive 3D Controls
  initInteractiveControls();

  // Start preloader
  initPreloader();
}

// Start everything when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
