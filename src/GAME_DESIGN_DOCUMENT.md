# Oregon Trail — Technical Design Document

> **Purpose:** This document captures every mechanical detail, probability, formula, and interaction in the game. It is intended for LLM-assisted development (to maintain context across sessions) and for human developers onboarding to the project.

---

## Table of Contents

1. [Architecture & File Map](#1-architecture--file-map)
2. [Game Flow & Screens](#2-game-flow--screens)
3. [Difficulty Settings](#3-difficulty-settings)
4. [Outfitter / Shop System](#4-outfitter--shop-system)
5. [Core Game State](#5-core-game-state)
6. [Health Rank System](#6-health-rank-system)
7. [Landmarks & Map](#7-landmarks--map)
8. [Travel & Random Events](#8-travel--random-events)
9. [Fort Interactions](#9-fort-interactions)
10. [River Crossing Choices](#10-river-crossing-choices)
11. [Landmark Choices](#11-landmark-choices)
12. [Hunting Mini-Game](#12-hunting-mini-game)
13. [River Crossing Mini-Game](#13-river-crossing-mini-game)
14. [Oxen Sickness & Death](#14-oxen-sickness--death)
15. [Win / Loss Conditions](#15-win--loss-conditions)
16. [UI & Animation Details](#16-ui--animation-details)
17. [Visual Trail Map](#17-visual-trail-map)
18. [Known Gaps & Future Work](#18-known-gaps--future-work)

---

## 1. Architecture & File Map

| File | Role |
|---|---|
| `oregon-trail.html` | Single-page HTML shell. Contains all three screens (title, outfitter, game) as `div` sections toggled via JS. Loads scripts in order: `game.js` → `hunting.js` → `river.js` → `map.js`. Contains the `#visualMapOverlay` modal with `#trailMapCanvas` (850×900px canvas). |
| `game.js` | Core module. Defines `gameState`, difficulty config, outfitter shop logic, landmark/event data, branching route system (`routeBranches`, `getActiveLandmarks`, `chooseBranch`), all non-mini-game actions (travel, rest, medicine, fort choices, river choices, landmark choices, branch choices), display updates, and win/loss checks. |
| `hunting.js` | Self-contained hunting mini-game. Reads/writes `gameState` (food, day). Uses a 5×5 grid pattern-memory mechanic. |
| `river.js` | Self-contained river-crossing mini-game. Reads/writes `gameState` (health, food, day, atRiver, awaitingChoice). Uses a timing-based wagon-position mechanic. |
| `map.js` | Canvas-based interactive trail map overlay. Defines `TrailMapCanvas` object and `showVisualMap()` / `closeVisualMap()` globals. Reads `gameState.distance`, `gameState.visitedLandmarks`, `gameState.routeHistory`, and `gameState.currentRoute` (read-only). |
| `styles.css` | Main styling. Organized into sections: title screen, difficulty selector, outfitter, game container, stats, landmarks, message box, buttons, progress bar, flip animation, hunting grid, river scene. |
| `map-styles.css` | Styles for the visual trail map modal overlay (`#visualMapOverlay`, `.visual-map-modal`, `.visual-map-container`, etc.). Loaded separately from `styles.css`. |

**Script load order matters:** `game.js` must load first because `hunting.js`, `river.js`, and `map.js` reference globals defined there (`gameState`, `showMessage`, `applyHealthChange`, `checkGameState`, `updateDisplay`, `restoreNormalButtons`).

**Screen transitions** use CSS `fadeIn`/`fadeOut` animations (0.5 s each) controlled by JS `setTimeout`.

**Mini-game transitions** use a CSS 3D flip (`rotateY(180deg)`) on `#flipInner`. The flip takes 0.8 s. Mini-game setup runs after the flip completes.

---

## 2. Game Flow & Screens

```
Title Screen → Outfitter Screen → Main Game Loop
                                      ↓
                              [Travel / Rest / Hunt / Medicine]
                                      ↓
                              Landmark triggers:
                                Fort → Fort choices
                                River → River choices (or mini-game)
                                Landmark → Landmark-specific choices
                                Destination → Victory
                                      ↓
                              Win or Loss → "Play Again" (page reload)
```

### Screen IDs

| Screen | Element ID | Initial Display |
|---|---|---|
| Title | `#titleScreen` | Visible |
| Outfitter | `#outfitterScreen` | `display: none` |
| Game | `#gameContainer` | `display: none` |

---

## 3. Difficulty Settings

| Difficulty | Key | Budget | Label |
|---|---|---|---|
| Easy | `easy` | $200 | Settler |
| Normal | `normal` | $150 | Pioneer |
| Hard | `hard` | $80 | Trailblazer |

Default selection: `normal`. Stored in `selectedDifficulty` and later copied to `gameState.difficulty`.

**Note:** Difficulty currently only affects starting budget. It does not modify event probabilities, travel distances, food consumption rates, or health costs. The difficulty label is shown on victory.

---

## 4. Outfitter / Shop System

### Items

| Item | Key | Price | Unit per Purchase | Notes |
|---|---|---|---|---|
| Oxen | `oxen` | $25 | 1 ox | Minimum 1 required to depart. More oxen = no mechanical speed bonus currently (flavor text only). |
| Food | `food` | $5 | 25 lbs | Stored in `gameState.food` as total lbs (qty × 25). |
| Spare Parts | `parts` | $10 | 1 set | Used automatically on wagon wheel break events. |
| Medicine | `medicine` | $15 | 1 dose | Used manually via button; heals +20 health or cures 1 sick ox. |
| Clothing | `clothing` | $10 | 1 set | Prevents health loss from storm events (binary check: >0 sets = protected). Not consumed. |

### Constraints

- Cannot buy if `outfitterBalance - cost < 0`.
- Cannot reduce quantity below 0.
- Departing with 0 oxen is blocked (hard validation with shake animation).
- Warnings shown for: 0 oxen (critical), 0 food (caution), <50 lbs food (caution).
- Leftover budget becomes `gameState.money` for use at forts.

---

## 5. Core Game State

```javascript
gameState = {
    distance: 0,          // Miles traveled (0–2000)
    food: 0,              // Pounds of food
    health: 100,          // Party health (0–100)
    money: 0,             // Dollars remaining
    oxen: 0,              // Total oxen count (healthy + sick)
    sickOxen: 0,          // Subset of oxen that are sick
    spareParts: 0,        // Spare part sets
    medicine: 0,          // Medicine doses
    clothing: 0,          // Clothing sets
    day: 1,               // Current day number
    gameOver: false,       // Ends all interactions
    currentLandmark: null, // Active landmark object
    atFort: false,         // Currently at a fort
    atRiver: false,        // Currently at a river
    awaitingChoice: false, // Player must make a choice before traveling
    visitedLandmarks: [],  // Names of landmarks already triggered
    riverWaterLevels: {},  // Cached water levels per river name
    currentRiverName: null,
    currentStrength: null,
    difficulty: 'normal',
    currentRoute: 'main',  // Active route branch: 'main' | 'fortBridger' | 'subletteCutoff' | 'oregonTrail' | 'californiaTrail' | 'barlowRoad' | 'columbiaRiver'
    routeHistory: []       // Array of { branchId, optionId } objects recording every branch choice made
}
```

### Key Constants

| Constant | Value |
|---|---|
| `GOAL_DISTANCE` | 2000 miles |
| Daily food consumption (travel) | 5 lbs |
| Daily food consumption (rest) | 8 lbs |
| Daily food consumption (medicine use) | 5 lbs |
| Travel health cost per day | −2 health |

---

## 6. Health Rank System

Health is a numeric value (0–100) displayed as a named rank with color.

| Rank | Min Health | Color |
|---|---|---|
| Good | 80 | `#51cf66` (green) |
| Fair | 60 | `#ffd700` (gold) |
| Poor | 40 | `#ffa94d` (orange) |
| Very Poor | 20 | `#ff6b6b` (red) |
| Critical | 1 | `#cc3333` (dark red) |
| Dead | 0 | `#666` (gray) |

The `applyHealthChange(amount)` function clamps health to [0, 100] and returns a status message string when a rank boundary is crossed (e.g., "⚠️ Your party's health declined to Poor."). This string is appended to event messages.

---

## 7. Landmarks & Map

### Base Trail (Linear — All Players)

The first portion of the trail is identical for everyone. Landmarks are defined in `baseLandmarks` and triggered in order.

| # | Name | Distance | Type |
|---|---|---|---|
| 1 | Kansas River Crossing | 102 | river |
| 2 | Big Blue River Crossing | 185 | river |
| 3 | Fort Kearney | 304 | fort |
| 4 | Chimney Rock | 554 | landmark |
| 5 | Fort Laramie | 640 | fort |
| 6 | Independence Rock | 830 | landmark |
| 7 | South Pass | 932 | landmark |
| — | **Parting of the Ways** | **980** | **branch (branchId: `sublette`)** |

### Branch 1: Parting of the Ways (980 miles)

| Option ID | Name | Button | Extra Landmarks | Difficulty | Notes |
|---|---|---|---|---|---|
| `fortBridger` | Fort Bridger Route | 🏰 Take Fort Bridger Route (Safer) | Fort Bridger (1025, fort), Bear River Crossing (1100, river), Soda Springs (1180, landmark) | easy | Longer but safe with fort access |
| `subletteCutoff` | Sublette Cutoff | 🏜️ Take Sublette Cutoff (Risky) | Sublette Flat (1000, landmark), Dry Sandy Crossing (1050, desert), Green River West (1120, river) | hard | Penalty: −3 health/day (waterless desert); Both branches rejoin at mile 1200 |

### Shared Landmark After Branch 1

| Name | Distance | Type |
|---|---|---|
| Fort Hall | 1288 | fort |
| **California Trail Junction** | **1300** | **branch (branchId: `california`)** |

### Branch 2: California Trail Junction (1300 miles)

| Option ID | Name | Button | Extra Landmarks | Difficulty | Notes |
|---|---|---|---|---|---|
| `oregonTrail` | Continue to Oregon | 🌲 Continue to Oregon City | Snake River Crossing (1430, river), Fort Boise (1543, fort) | normal | Standard path; `currentRoute` stays `main`-adjacent |
| `californiaTrail` | California Trail | ☀️ Head to California | Raft River (1350, river), City of Rocks (1420, landmark), Humboldt River (1520, river) | hard | Sets `currentRoute = 'californiaTrail'`; changes final destination to **Sacramento**; both rejoin at mile 1600 |

### Oregon Route Continues (only if `currentRoute !== 'californiaTrail'`)

| Name | Distance | Type |
|---|---|---|
| Blue Mountains | 1700 | landmark |
| **Cascade Range** | **1800** | **branch (branchId: `barlow`)** |

### Branch 3: Cascade Range (1800 miles) — Oregon route only

| Option ID | Name | Button | Extra Landmarks | Cost | Difficulty | Notes |
|---|---|---|---|---|---|---|
| `barlowRoad` | Barlow Road | ⛰️ Barlow Road ($15 toll) | Barlow Pass (1880, landmark), Mount Hood View (1930, landmark) | $15 | normal | Toll deducted from `gameState.money` |
| `columbiaRiver` | Columbia River | 🌊 Raft the Columbia River (Dangerous) | The Dalles (1850, landmark), Columbia River Rapids (1900, river), Cascade Portage (1950, landmark) | — | very_hard | `specialEvent: 'columbiaRapids'`; both rejoin at mile 1970 |

### Final Destination

| Route | Final Landmark | Distance |
|---|---|---|
| Oregon (`oregonTrail` / `barlowRoad` / `columbiaRiver`) | Oregon City | 2000 |
| California (`californiaTrail`) | Sacramento | 2000 |

### Active Landmark Resolution

`getActiveLandmarks()` builds the active landmark list dynamically:
1. Start with `baseLandmarks` (always active).
2. For each entry in `gameState.routeHistory`, look up the chosen option's `.landmarks` array and append them.
3. Append `finalLandmarks` (Fort Hall, branch points, Blue Mountains, Cascade Range, Oregon City).

`checkForLandmark()` iterates the result of `getActiveLandmarks()`. If `gameState.distance >= landmark.distance` and the landmark name is not in `visitedLandmarks`, it fires.

Branch landmarks (`type: 'branch'`) call `showBranchChoices(branchId)`. The player must choose before continuing; `awaitingChoice` is set to `true`.

**River water levels** are generated once per river name (cached in `gameState.riverWaterLevels`). Current strength is re-rolled each time river choices are displayed (including after "wait").


---

## 8. Travel & Random Events

### Travel Action (`travel()`)

1. Guard: exits if `gameOver`, `awaitingChoice`, or `oxen <= 0`.
2. Distance: `Math.floor(Math.random() * 30) + 40` → **range 40–69 miles per day**.
3. Food: −5 lbs.
4. Day: +1.
5. Health: −2 (base travel fatigue).
6. Random event: one event chosen uniformly from the `events` array (10 events, each with 10% chance).
7. Landmark check.
8. Game state check (starvation, death, victory, oxen sickness).

### Random Events Table

| # | Text (or dynamic getText) | Effect | Probability |
|---|---|---|---|
| 0 | "The weather is clear. Good traveling conditions!" | None | 10% |
| 1 | "You found some berries along the trail!" | +5 food | 10% |
| 2 | "One of your oxen is limping but pushes on." | −10 health | 10% |
| 3 | "You met friendly travelers who shared supplies!" | +10 food | 10% |
| 4 | Storm event | If clothing > 0: no effect. Else: −5 health. Text changes accordingly. | 10% |
| 5 | Wagon wheel broke | If spareParts > 0: −1 spare part. Else: −$10 money. Text changes accordingly. | 10% |
| 6 | "Beautiful day for traveling!" | None | 10% |
| 7 | "You found a good camping spot." | +5 health | 10% |
| 8 | "Trail is muddy and difficult." | −3 health | 10% |
| 9 | "Found abandoned supplies!" | +15 food, +$5 money | 10% |

**Aggregate per-travel-day expected values (assuming no clothing/parts):**
- Expected health change: −2 (base) + (0.1×−10 + 0.1×−5 + 0.1×+5 + 0.1×−3) = −2 + (−1.3) = **−3.3 health/day**
- Expected food change: −5 (base) + (0.1×5 + 0.1×10 + 0.1×15) = −5 + 3 = **−2 lbs food/day net** (but note some food events are generous)

### Rest Action (`rest()`)

- Food: −8 lbs.
- Day: +1.
- Health: +20 (or +30 if `atFort`).
- No travel distance gained.

### Use Medicine Action (`useMedicine()`)

- Requires `medicine > 0` and not `awaitingChoice`.
- Medicine: −1 dose.
- Day: +1.
- Food: −5 lbs.
- If `sickOxen > 0`: cures 1 sick ox (−1 sickOxen). No health change.
- Else: +20 health.

---

## 9. Fort Interactions

When arriving at a fort, the player gets these options (each costs 1 day):

| Choice | Cost | Effect |
|---|---|---|
| Trade for Supplies | $20 | +40 lbs food |
| Buy Medicine | $15 | +1 medicine dose |
| Buy an Ox | $25 | +1 ox |
| Buy Spare Parts | $10 | +1 spare part set |
| Rest at the Fort | Free (−8 food) | +30 health |
| Leave | Free | Continues journey |

If insufficient money, the purchase fails and the day is not consumed. The player can make multiple purchases before leaving. `awaitingChoice` remains `true` until "Leave" is selected.

---

## 10. River Crossing Choices

Upon arriving at a river:

1. Water level is determined (cached per river): uniform random from `["Shallow", "Medium", "Deep"]` — **33.3% each**.
2. Current strength is rolled: uniform random from `["Weak", "Moderate", "Strong"]` — **33.3% each**.

### Options

| Choice | Effect |
|---|---|
| **Ford the River** | Launches river crossing mini-game (see §13). |
| **Take the Ferry** | Costs $10. Safe passage, no penalties. If can't afford, blocked. |
| **Wait** | −10 food, +2 days. Current strength re-rolled. Water level stays the same. |

---

## 11. Landmark Choices

Each non-fort, non-river landmark has unique choices. All cost 1 day unless noted.

### Chimney Rock

| Choice | Effect | Probability |
|---|---|---|
| Climb | 40% chance: −5 health. 60% chance: −10 health. | See column. |
| Rest | +15 health, −8 food | Deterministic |
| Keep moving | No effect | Deterministic |

### Independence Rock

| Choice | Effect | Probability |
|---|---|---|
| Carve your name | −5 food, +1 extra day | Deterministic |
| Search for supplies | 50%: +10 food, +$5. 50%: nothing. | 50/50 |
| Keep moving | No effect | Deterministic |

### South Pass

| Choice | Effect | Probability |
|---|---|---|
| Steep shortcut | 50%: +40 miles, −15 health. 50%: −25 health, −10 food. | 50/50 |
| Longer safer route | −8 food, +1 extra day | Deterministic |
| Rest first | +15 health, −8 food, then must pick shortcut or safe route | Deterministic (partial) |

### Soda Springs

| Choice | Effect | Probability |
|---|---|---|
| Drink | +15 health | Deterministic |
| Fill containers | +5 food | Deterministic |
| Keep moving | No effect | Deterministic |

### Blue Mountains

| Choice | Effect | Probability |
|---|---|---|
| Push through quickly | 50%: +30 miles, −15 health, −10 food. 50%: −25 health, −1 ox (ox dies). | 50/50 |
| Slow and steady | −5 health, −12 food, +2 extra days | Deterministic |
| Rest before | +15 health, −8 food | Deterministic |

### The Dalles

| Choice | Effect | Probability |
|---|---|---|
| Dangerous river route | 40% success: +50 miles. 60% fail: −20 health, −15 food. | 40/60 |
| Mountain route | −10 health, −15 food, +3 extra days | Deterministic |
| Rest | +15 health, −8 food | Deterministic |

### Generic Landmarks (fallback)

| Choice | Effect | Probability |
|---|---|---|
| Explore | 40%: +8 food. 60%: −5 food. | 40/60 |
| Rest | +15 health, −8 food | Deterministic |
| Keep moving | No effect | Deterministic |

---

## 12. Hunting Mini-Game

**File:** `hunting.js`

### Mechanic

A 5×5 grid (25 cells). A pattern of 5 unique random cells is shown sequentially (each lit for 200 ms, 200 ms gap between). The player must click the cells in the same order.

### Scoring

The score = number of cells correctly clicked in order before a mistake. On any wrong click, the game ends immediately.

| Score | Food Reward |
|---|---|
| 0–2 (poor) | `Math.floor(Math.random() * 15) + 10` → **10–24 lbs** |
| 3 (decent) | `Math.floor(Math.random() * 20) + 30` → **30–49 lbs** |
| 4 (good) | `Math.floor(Math.random() * 20) + 40` → **40–59 lbs** |
| 5 (perfect) | `Math.floor(Math.random() * 20) + 60` → **60–79 lbs** |

- Costs 1 day.
- No food consumption during hunt (unlike rest).
- No health cost.
- Animation: 1 s delay showing score, then 0.8 s flip back.

### State

```javascript
huntingState = {
    pattern: [],           // Array of 5 cell indices (0–24)
    userPattern: [],       // Player's clicks so far
    currentIndex: 0,       // (unused currently)
    isShowingPattern: false,
    isPlayerTurn: false,
    gameActive: false
}
```

---

## 13. River Crossing Mini-Game

**File:** `river.js`

### Mechanic

A wagon bounces horizontally across a river scene. The player must click "CROSS!" (or press Spacebar) when the wagon's center is within a green "safe zone" centered in the river.

### Difficulty Calculation

```
waterScore = Deep:2, Medium:1, Shallow:0
currentScore = Strong:2, Moderate:1, Weak:0
difficulty = waterScore + currentScore  → range 0–4
```

### Parameters by Difficulty

| Parameter | Formula | Range |
|---|---|---|
| Wagon speed | `1.5 + (difficulty × 0.5)` px/frame | 1.5 – 3.5 |
| Safe zone width | `max(40, 100 - (difficulty × 15))` px | 40 – 100 px |

The wagon bounces between x=80 and x=(sceneWidth − 140). Animation is frame-rate independent using `deltaTime`.

### Outcome Determination

1. **Calculate `wagonCenter`** = `wagonPosition + 30` (half of 60px wagon width).
2. **Check if in safe zone:** `wagonCenter >= safeZoneStart && wagonCenter <= safeZoneEnd`.
3. **If in zone:**
   - `centeringAccuracy` = `1 - (distFromCenter / zoneRadius)` (0 to 1).
   - If accuracy > 0.7 → **perfect**
   - Else → **good**
4. **If outside zone:**
   - `missDistance` = how far outside the zone edge.
   - `missRatio` = `missDistance / (sceneWidth / 2)`.
   - `badChance` = `min(0.8, (missRatio × 0.5) + (difficulty × 0.12))`.
   - Random roll < badChance → **bad**; else → **ok**.

### Outcome Effects

| Outcome | Health | Food | Other |
|---|---|---|---|
| **Perfect** | No loss. If difficulty ≥ 3: +5–9 health bonus. | No loss | Counter tracked. |
| **Good** | No loss | No loss | — |
| **OK** | −(8–15 + difficulty×2) health → range −8 to −23 | No loss | — |
| **Bad** | −(15–26 + difficulty×5) health → range −15 to −46 | −(10–21 + difficulty×5) lbs → range −10 to −41 | — |

### State

```javascript
riverState = {
    wagonPosition: 0,
    wagonSpeed: 2,
    direction: 1,             // 1 = right, -1 = left
    gameActive: false,
    animationFrame: null,
    safeZoneStart: 0,
    safeZoneEnd: 0,
    difficulty: 1,            // 0–4
    waterLevel: '',
    currentStrength: '',
    crossingAttempts: 0,      // Lifetime counter
    perfectCrossings: 0,      // Lifetime counter
    lastUpdateTime: 0
}
```

---

## 14. Oxen Sickness & Death

Checked in `checkGameState()` after every action.

### Sick Oxen Death Roll

For each sick ox: **10% chance of death** per check.

```javascript
for (let i = 0; i < gameState.sickOxen; i++) {
    if (Math.random() < 0.10) deaths++;
}
```

Dead oxen are removed from both `oxen` and `sickOxen`.

### Healthy Oxen Sickness Roll

For each healthy ox: **3% chance of becoming sick** per check.

```javascript
for (let i = 0; i < healthyOxen; i++) {
    if (Math.random() < 0.03) newSick++;
}
```

### Curing

Using medicine when `sickOxen > 0` cures exactly 1 sick ox.

### Zero Oxen

If `oxen <= 0` when the player tries to travel, the game ends immediately ("You have no oxen!").

---

## 15. Win / Loss Conditions

| Condition | Trigger | Message Style |
|---|---|---|
| **Victory** | `distance >= 2000` | `.victory` class (green text), shows day count, difficulty label, health rank, remaining food |
| **Starvation** | `food <= 0` | `.game-over` class (red text) |
| **Health Death** | `health <= 0` | `.game-over` class (red text) |
| **No Oxen** | `oxen <= 0` at travel attempt | `.game-over` class (implied) |

On game end, all action buttons are replaced with a single "Play Again" button that calls `location.reload()`.

---

## 16. UI & Animation Details

### CSS Animations

| Animation | Duration | Used For |
|---|---|---|
| `fadeIn` | 1s | Screen transitions |
| `fadeOut` | 0.5s | Screen transitions |
| `titlePulse` | 2s infinite | Title text scale pulse |
| `buttonGlow` | 2s infinite | Start/depart button glow |
| `shake` | 0.4s | Outfitter warning on invalid depart |
| `wave-flow` | 1.5–2.5s infinite | River current wave elements |
| `pulse-safe` | 1s infinite | Safe zone in river mini-game |
| `pulse-danger` | 0.8s infinite | Danger zone (difficulty ≥ 3) |
| 3D flip | 0.8s | Mini-game transitions |

### Color Palette

| Element | Color |
|---|---|
| Background | `#2a1810` (dark brown) |
| Container | `#3d2817` (medium brown) |
| Borders | `#6b4423` (warm brown) |
| Gold/Headers | `#ffd700` |
| Text | `#f4e8d0` (cream) |
| Success | `#51cf66` (green) |
| Warning | `#ffa94d` (orange) |
| Danger | `#ff6b6b` (red) |
| River/Choice buttons | `#4a90e2` (blue) |

### Progress Bar

- Background: `#1a0f08`
- Fill: gradient `#6b4423` → `#8b5a3c`
- Fort markers: 🏰 emoji with gold dotted line
- River markers: 🌊 emoji with blue dotted line
- Label below bar shows current mileage

### Responsive Notes

- Max-width: 800px (title/outfitter), 700px (game container)
- Grid layout for difficulty buttons (3 columns)
- Flex wrap for outfitter cart items
- Hunting grid: 350px max-width, 5-column CSS grid

---

## 17. Visual Trail Map

**File:** `map.js` + `map-styles.css`

### Overview

An interactive canvas-based overlay that visualizes the full branching trail structure. Opened via the 🗺️ Map button in the game UI (`showVisualMap()`) and closed with the ✕ button, Close Map button, Escape key, or clicking outside the modal (`closeVisualMap()`).

The map is **read-only** — it reflects game state but does not modify it.

### Trigger / DOM

| Element | ID | Notes |
|---|---|---|
| Overlay | `#visualMapOverlay` | `display: flex` when open, `none` when closed |
| Canvas | `#trailMapCanvas` | 850×900 px; rendered via `CanvasRenderingContext2D` |
| Open button | `.map-button-inline` | Calls `showVisualMap()` |
| Close button | `.visual-map-close` | Calls `closeVisualMap()` |

### `TrailMapCanvas` Object

Singleton defined as a plain object (`const TrailMapCanvas = { ... }`). Key methods:

| Method | Purpose |
|---|---|
| `init(canvasId)` | Gets canvas context, calls `setupEventListeners()`, `buildMapStructure()`, `startAnimation()`. |
| `buildMapStructure()` | Clears `nodes` and `connections`, then re-builds the full branching node graph from `gameState` data. |
| `startAnimation()` | `requestAnimationFrame` loop that calls `render()` only while overlay is visible. |
| `stopAnimation()` | Cancels the animation frame. Called on close. |
| `refresh()` | Alias that calls `buildMapStructure()` to re-sync with latest `gameState`. |
| `render()` | Clears canvas, then calls: `drawBackground()`, `drawDecorations()`, path drawing (dimmed-first order), node drawing (dimmed-first order), tooltip, `drawMainMenu()`. |

### Node Types & Shapes

| Type | Icon | Base Size | Shape |
|---|---|---|---|
| `start` | 🚩 | 17 | Pentagon |
| `fort` | 🏰 | 18 | Hexagon |
| `river` | 🌊 | 16 | Diamond |
| `landmark` | 📍 | 15 | Pentagon |
| `destination` | 🎉 | 20 | Star (10-point) |
| `desert` | 🏜️ | 15 | Pentagon |
| `branch` | ⚔️ | 17 | Hexagon (distinct branch-point styling) |

### Node State

Each node has: `visited` (bool), `current` (bool), `dimmed` (bool).

- **Visited:** `visitedLandmarks.includes(name) || distance < currentDist`
- **Current:** `distance >= currentDist && distance < currentDist + 100 && !visited`
- **Dimmed:** Set to `true` for branch routes not taken by the player (determined by `gameState.routeHistory`).

Current nodes display a pulsing gold ring animation (`Math.sin(Date.now() / 250)`).

### Branch Dimming Logic

After each branch decision is recorded in `gameState.routeHistory`, nodes and connections on the non-chosen path have `.dimmed = true` and are drawn at `globalAlpha = 0.35`. Dimmed paths render before non-dimmed paths so active routes appear on top.

### Hover Tooltip

Hovering over any node shows a tooltip with: landmark name (gold), distance in miles, and status (`✓ Visited`, `► Next Stop`, `Upcoming`, or `(Alternate route)` for dimmed nodes).

Tooltip position clamps to canvas bounds to avoid overflow.

### Background & Decorations

- Radial gradient background (`#6b5a42` → `#4a3a28`).
- Subtle pixel texture (150 random 1–3px squares at 3% opacity per frame — note: redrawn each frame, not cached).
- Corner vines drawn with quadratic bezier curves and filled leaf ellipses.

### Map Color Palette

| Element | Color |
|---|---|
| Default path | `#c9a227` (gold) |
| Visited path | `#51cf66` (green) |
| Current node | `#ffd700` (bright gold) |
| Visited node | `#51cf66` (green) |
| Upcoming node | `#4a9f4a` (dark green) |
| Branch point | `#9b59b6` (purple) |
| Dimmed elements | `globalAlpha: 0.35` |

---

## 18. Known Gaps & Future Work

These are areas where the current implementation is incomplete, inconsistent, or could be expanded:

1. **Oxen count has no speed effect.** The shop says "More oxen = faster travel" but travel distance is purely random (40–69), unaffected by oxen count.
2. **Clothing is never consumed.** Having ≥1 set gives permanent storm immunity. No wear mechanic.
3. **Difficulty only affects budget.** No scaling of event severity, food consumption, health decay, or encounter frequency by difficulty.
4. **No date/season system.** Day counter increments but there's no calendar, weather seasons, or winter deadline.
5. **No party members.** Health is a single value for the whole "party" — no individual travelers who can get sick or die independently.
6. **No trading with other travelers** on the trail (only at forts).
7. **No save/load system.** Page reload resets everything.
8. **`checkGameState()` runs oxen sickness rolls on every action**, including fort purchases and medicine use, which may be more frequent than intended.
9. **No sound effects or music.**
10. **Branch penalty (Sublette Cutoff) is declared but not verified applied.** The `penalty: { type: "dailyHealth", amount: -3 }` object is defined on the option but there is no confirmed `dailyHealth` penalty loop in `travel()` — implementation should be verified.
11. **Visual Trail Map texture is redrawn every frame.** `drawBackground()` places 150 random pixels on every animation frame rather than drawing to an offscreen canvas once, causing unnecessary per-frame randomness and GPU churn.
12. **`TrailMapCanvas.startAnimation()` checks `style.display` directly** on the overlay element rather than using a flag, which can miss display states set via CSS classes instead of inline style.
13. **California Trail destination change is cosmetic-only.** When `currentRoute === 'californiaTrail'`, the win message changes destination label to Sacramento, but no unique California-specific victory content, scoring, or gameplay differences exist beyond the different landmark set.
