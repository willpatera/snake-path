# Snake Path Generator

A browser-based tool that generates a continuous monoline path using fixed track pieces (straights and arcs) with over/under crossings rendered in a woven knot style.

## Getting Started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Controls

### Playback

| Button | Action |
|--------|--------|
| **Start** | Begin generating a new path with current settings |
| **Pause / Resume** | Pause or resume the generation |
| **Step** | Advance one piece at a time (useful for debugging) |
| **Reset** | Clear the canvas and stop generation |

### Configuration

| Slider | Range | Default | Description |
|--------|-------|---------|-------------|
| **Seed** | text | `demo` | Deterministic seed — same seed + settings = same path. Click **Randomize** for a random seed. |
| **Stroke Width** | 2–16 | 8 | Line thickness in pixels |
| **Turn Radius** | 16–80 | 32 | Radius of arc pieces |
| **Straight Length** | 20–120 | 64 | Length of straight pieces |
| **Crossing Bias** | 0–1 | 0.7 | How much the path seeks crossings (0 = avoid, 1 = prefer) |
| **Max Pieces** | 50–10000 | 2000 | Maximum number of pieces before stopping |
| **Speed** | 1–120 | 30 | Steps per second during generation |

### Export

| Button | Action |
|--------|--------|
| **Export SVG** | Download the current drawing as an SVG file |
| **Export PNG** | Download the current drawing as a PNG image |

## How It Works

The generator places pieces one at a time from a random edge start point:

1. **Candidates** — generates straight pieces (multiple lengths) and arc pieces (at angles 60°, 90°, 120°, 150°, 180° with multiple radii)
2. **Boundary filter** — rejects pieces that leave the canvas padding zone
3. **Crossing detection** — checks if a piece intersects existing path segments at a valid angle
4. **Clearance check** — ensures minimum spacing between non-crossing parallel paths
5. **Scoring** — weighs straight preference, edge avoidance, open-space seeking, quadrant balance, and crossing bonuses
6. **Selection** — weighted random pick from valid candidates
7. **Desperation fallbacks** — if no candidates pass, progressively relaxes clearance and boundary constraints

### Rendering

Each piece is drawn as a "road" or "pipe segment" — a thick white border with a thinner black core. Because pieces are drawn in order, later pieces naturally layer on top of earlier ones at crossings, creating a woven over/under knot effect.

## Tech Stack

- TypeScript + Vite
- SVG rendering (no canvas/WebGL)
- Seeded PRNG (mulberry32) for deterministic output
- Grid-based spatial index for fast proximity queries
