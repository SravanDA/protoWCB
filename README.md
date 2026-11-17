# WCB Robotics — ELMO Website

> Apple-caliber product website for **ELMO** (Enhanced Lightweight Mobile Operator), WCB Robotics' autonomous facade cleaning robot.

---

## Overview

ELMO is an autonomous high-rise facade cleaning robot that eliminates suspended cradle operations entirely. It attaches directly to vertical glass via dual-circuit vacuum suction, traverses building facades at 4,000 sq ft/hr, and operates with zero crew suspension risk.

This site is a high-fidelity, Apple-inspired product marketing website built to present ELMO to enterprise real estate clients — property managers, portfolio operators, and facilities directors at firms like JLL, CBRE, and commercial high-rise developers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | Vanilla HTML5 |
| Styling | Custom CSS (1,300+ lines, Apple design tokens) |
| 3D Robot | Three.js r160 — custom procedural geometry |
| Animations | GSAP 3.12 + ScrollTrigger — scroll-driven interactions |
| Smooth Scroll | Lenis 1.1.18 |
| Post-processing | Three.js EffectComposer — Bloom + ACES filmic tonemapping |
| Hosting | Static — any server or CDN |

---

## Features

- **3D ELMO Model** — Procedurally built in Three.js with PBR materials (clearcoat titanium body, sapphire glass sensor bay, suction pods, spinning vacuum impellers)
- **Scroll-driven rotation** — Robot rotates through 360° as you scroll through the showcase section via GSAP ScrollTrigger
- **Mouse parallax tilt** — Robot tilts in response to cursor position with gyro-style smoothing
- **Preloader** — Animated WCB letter entrance with progress bar, guaranteed 1.4s dismiss
- **Apple-style navigation** — Glassmorphism blur backdrop, pill CTA button, full mobile overlay menu
- **Safety comparison** — Manual suspended cradle vs. ELMO autonomous system, side-by-side
- **Technical specifications** — Full datasheet (chassis weight, adhesion force, cleaning rate, wind tolerance, acoustic output)
- **Enterprise CTA** — On-site demonstration request and technical dossier download

---

## Project Structure

```
ProtoWCB/
├── index.html          # Full single-page application
├── css/
│   └── styles.css      # Design system + all component styles
├── js/
│   └── app.js          # Three.js scene, GSAP animations, Lenis scroll
└── README.md
```

---

## Running Locally

No build step required. Serve from any static server:

```bash
# Python (built-in)
python3 -m http.server 3000

# Node (npx)
npx serve .
```

Then open `http://localhost:3000`.

---

## Key Specs — ELMO

| Specification | Value |
|---|---|
| Chassis Weight | 12 kg (monocoque structural composite) |
| Dimensions | 450 × 350 × 180 mm |
| Adhesion Force | 200 kg (dual-circuit vacuum redundancy) |
| Cleaning Rate | 4,000 sq ft / hr (~400 m²/hr) |
| Battery Runtime | 8 hours continuous (hot-swappable Li-ion) |
| Wind Tolerance | Operational up to 40 km/h |
| Water Consumption | 0.5 L/m² (ultrasonic micro-mist atomization) |
| Acoustic Output | < 55 dB |
| Safety System | Dual pneumatic circuits + mechanical tether |

---

## About WCB Robotics

WCB Robotics builds autonomous systems for industrial operations that are too dangerous, too slow, or too costly for human crews. ELMO is their flagship product — a robot designed specifically to replace suspended cradle and rope-access window cleaning on commercial high-rises.

**Mission:** Robots for What Humans Shouldn't Do.

---

*Built with Three.js, GSAP, and Lenis.*
