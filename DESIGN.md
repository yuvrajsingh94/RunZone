# RunZone — Design System & Visual Specification (DESIGN.md)

## 1. Visual Identity & Aesthetic World
- **Theme**: Dark Tactical Endurance HUD (CartoDB Dark Matter, neon vector accents, glassmorphic telemetry cards).
- **Core Mood**: High-precision sports engineering, dark telemetry, energetic neon cyan/crimson/emerald glows.

## 2. Color Palette & Faction Tokens
```css
/* Backgrounds */
--bg-canvas: #0A0D14;
--bg-surface: #0B0F19;
--bg-card: #111827;
--bg-card-hover: #1F2937;

/* Primary & Accents */
--brand-cyan: #00F0FF;      /* Apex Faction / Primary Active Accent */
--brand-blue: #3B82F6;      /* Secondary Navigation & Badges */
--brand-crimson: #EF4444;   /* Crimson Vanguard / Danger Zone (>1.5 ACWR) */
--brand-emerald: #10B981;   /* Emerald Syndicate / Optimal Sweet Spot (0.8-1.3 ACWR) */
--brand-amber: #F59E0B;     /* Overreaching High Alert (1.3-1.5 ACWR) */
--brand-purple: #8B5CF6;    /* Cyber Violet / Chronic Baseline */

/* Text & Borders */
--text-primary: #F9FAFB;
--text-muted: #9CA3AF;
--border-subtle: rgba(255, 255, 255, 0.08);
--border-highlight: rgba(0, 240, 255, 0.35);
```

## 3. Typography Hierarchy
- **Display / Headings**: `Inter`, weights: 700 (Bold), 800 (ExtraBold).
- **Body & Controls**: `Inter`, weights: 400 (Regular), 500 (Medium), 600 (SemiBold).
- **Telemetry, Coordinates, ACWR, & Numbers**: `JetBrains Mono` / monospace font for numeric clarity.

## 4. Components & Elevation
- **Card Styling**: Rounded corners (`rounded-2xl`, `rounded-3xl`), border `border-gray-800`, subtle backdrop blur (`backdrop-blur-md`).
- **Glow Accents**: `shadow-glow-cyan` (`0 0 20px -5px rgba(0, 240, 255, 0.35)`).
- **Interactive Map**: CartoDB Dark Matter raster/vector tiles with GeoJSON vector polygons.
