# F1 Contract Intelligence Dashboard

## Project Overview

An F1-themed multi-page web dashboard for managing driver contracts, team finances, fantasy leagues, and offer negotiations. Built as a static HTML/JS application with no frameworks — all state is persisted in the browser via `localStorage`, and all data is loaded from JSON files in the `backend/` folder.

The app supports two authentication roles:

- **Driver** — views personal dashboards covering their career stats, financials, contract details, and incoming offers from other teams.
- **Team Manager** — views team financials and performance data, browses all 20 drivers, and sends contract offers to specific drivers.

A third entry point — **Fantasy** — gives read-only access to a separate analytics portal (`fantasy.html`) covering all 20 drivers and 10 teams.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup & Styling | Pure HTML5 + CSS3 (no framework) |
| Logic | Vanilla JavaScript (ES5/ES2017 mix, no bundler) |
| Charts | [Chart.js 4.4.0](https://www.chartjs.org/) via CDN |
| Fonts | Google Fonts — Poppins; custom F1 fonts — Unity Sans (Mercedes), RB Futura (Red Bull) |
| Persistence | `localStorage` via `contracts.js` |
| Data | Static JSON files in `backend/` |

---

## File Structure

```
teams/
├── index.html                          Login page (driver + team manager + fantasy portals)
├── dashboard.html                      Driver dashboard (Overview / Financials / Contract)
├── team.html                           Team manager dashboard
├── new_contract.html                   Incoming contract offers list for logged-in driver
├── offer_compare.html                  Side-by-side offer comparison with charts and counter-offer simulator
├── fantasy.html                        Fantasy portal (Drivers / Teams / Head to Head tabs)
├── contracts.js                        Shared localStorage-backed contract CRUD API
├── colour_scheme.md                    Team brand colour reference
├── CREDENTIALS.md                      Login credentials reference
├── backend/
│   ├── f1_2025_drivers_Dataset.json    20 drivers — personal details, career stats, financials, contract
│   └── f1_teams_dataset.json           10 teams — theme colours, performance metrics, financials
└── fonts/
    ├── UnitySans-Regular.woff2 / .woff
    ├── UnitySans-Bold.woff2 / .woff
    ├── FuturaCyrillicBook.woff2 / .woff
    └── FuturaCyrillicBold.woff2 / .woff
```

### File descriptions

**`index.html`** — Login entry point. Three tab modes: Driver Login, Team Manager, and Fantasy. Fetches `f1_teams_dataset.json` to populate the team dropdown dynamically. On success, writes identity to `localStorage` and redirects.

**`dashboard.html`** — Main driver-facing dashboard. Three sidebar sections: Overview, Financials, Contract. Reads `loggedInDriver` from `localStorage` as its auth guard. Fetches both JSON datasets on load, resolves the driver's team via fuzzy matching, applies the team colour theme, then fills all sections.

**`team.html`** — Team manager dashboard. Reads `?teamId=` from the URL query string. Three sidebar sections: Team Overview, Current Drivers, Send Offer. Shows a Sent Offers panel below the form. Requires `loggedInTeam` in `localStorage` as implicit context (set at login).

**`new_contract.html`** — Incoming offers page for a logged-in driver. Reads all contracts from `localStorage` for the current `driverId`, filters to `pending` or `negotiating` status, and renders one card per offer. Each card links to `offer_compare.html?contractId=<ID>`.

**`offer_compare.html`** — Full-screen offer comparison view. Reads `?contractId=` from the URL. Displays key tiles, three Chart.js charts (bar, pie, radar), a contract comparison table against the driver's current deal, and a counter-offer salary slider with acceptance probability modelling.

**`contracts.js`** — Shared library included via `<script src="contracts.js">` in every page that needs contract data. Exposes six global functions. See [contracts.js API](#contractsjs-contract-api) below.

**`backend/f1_2025_drivers_Dataset.json`** — Array of 20 driver objects. Each driver has:
- `driverId` (e.g. `"DRV01"`)
- `personalDetails` — fullName, driverNumber, birthplace, currentTeam, f1Debut `{ year, team }`
- `careerStats` — grandPrixEntered, careerPoints, podiums, wins, polePositions, worldChampionships, highestRaceFinish, poleWinRatio
- `financials` — annualSalary, performanceBonus `{ perWin, perPodium, championshipBonus }`, endorsements
- `contract` — teamId, team, startDate, endDate, status, baseSalary, releaseClause, performanceClauses `{ minimumPoints, minimumPosition }`
- `account` — username (used for login)
- `uiData.contractDashboard` — optional pre-computed overrides for bonusPotential, totalPotentialValue, progression, triggers, risk, teamContext

**`backend/f1_teams_dataset.json`** — Array of 10 team objects. Each team has:
- `teamId` (e.g. `"RB01"`, `"MER01"`)
- `teamName`, `shortName`
- `theme` — primary, secondary, accent (hex colours)
- `performance` — lastSeasonPosition, developmentIndex, reliabilityScore, aeroEfficiency, championships
- `financial` — annualBudget, salaryCapAllocation, sponsorRevenue, bonusPool, signingBonusAvailable

**`colour_scheme.md`** — Human-readable reference for each team's brand colours used in the theme system.

**`CREDENTIALS.md`** — Quick reference for all demo login credentials.

---

## Page-by-Page Functionality

### `index.html` — Login

The login page has three tab modes toggled by clicking the tab bar.

#### Driver Login

- Fields: Username, Password
- Universal password: **`f1@2025`**
- On submit: fetches `backend/f1_2025_drivers_Dataset.json`, finds a driver whose `account.username` matches (case-insensitive). If found, writes `loggedInDriver = driver.driverId` and clears `loggedInTeam`, then redirects to `dashboard.html`.
- Sample autofill tiles below the form auto-populate username + password on click.

#### Team Manager Login

- Fields: Team dropdown (populated from `f1_teams_dataset.json`), Password
- Manager password: **`f1team@2025`**
- On submit: validates the selected team and password locally (no server). If correct, writes `loggedInTeam = selectedTeamId` and clears `loggedInDriver`, then redirects to `team.html?teamId=<selectedTeamId>`.

#### Fantasy Login

- Fields: Username, Password
- Credentials are validated against a hardcoded object — no JSON fetch needed:
  - `admin` / `fantasy2025`
  - `guest` / `f1fan`
  - `viewer` / `grid2025`
- On success: writes `fantasyUser = username` to `localStorage` and redirects to `fantasy.html`.

---

### `dashboard.html` — Driver Dashboard

**Auth guard:** reads `loggedInDriver` from `localStorage`. If absent, immediately redirects to `index.html`.

**Boot sequence:**

1. Parallel-fetch `f1_2025_drivers_Dataset.json` and `f1_teams_dataset.json`.
2. Call `seedContracts()` to initialise contract data in `localStorage` on first run.
3. Find the matching driver by `driverId`.
4. Resolve the driver's team via `resolveTeam()` (see [Data Flow](#data-flow--boot-sequence)).
5. Call `applyTheme(team)` and `applyFont(team.teamId)`.
6. Fill Overview, Financials, and Contract sections.
7. Wire sidebar navigation and logout button.
8. Hide loading screen, show layout.
9. Check `location.hash` for deep-link navigation (`#overview`, `#financials`, `#contract`).

The sidebar contains: driver name + team (top), three nav links (middle), and a row of buttons at the bottom — Light/Dark mode toggle, **Incoming Offers →** (opens `new_contract.html`), and **Logout**.

---

#### Overview Section

**Hero card** displays:
- Driver full name (`personalDetails.fullName`)
- Driver number — shown as large watermark text (`#NN`)
- Birthplace + F1 debut year and debut team (`personalDetails.birthplace`, `personalDetails.f1Debut`)
- Contract status badge (`contract.status`, uppercased)

**4 stat cards:**

| Card | Source | Note |
|---|---|---|
| Base Salary | `financials.annualSalary` or `contract.baseSalary` | Formatted as `$XM` |
| Contract Ends | `contract.endDate` (first 4 chars) | Year only |
| Dev Index | `team.performance.developmentIndex` | `/10` |
| Reliability | `team.performance.reliabilityScore` | `/10` |

**Career Stats grid** (8 cards, all from `careerStats`):

| Metric | Field | Display |
|---|---|---|
| Grand Prix | `grandPrixEntered` | Raw number |
| Career Points | `careerPoints` | Raw number |
| Podiums | `podiums` | Raw number |
| Wins | `wins` | Raw number |
| Pole Positions | `polePositions` | Raw number |
| Championships | `worldChampionships` | Raw number |
| Highest Finish | `highestRaceFinish` | Prefixed with `P` |
| Pole-Win Ratio | `poleWinRatio` | Multiplied by 100, shown as `NN%` |

Each card has a hoverable `ⓘ` info tooltip (rendered via CSS `::after` + `data-tip` attribute).

---

#### Financials Section

**Contract Valuation** (5 cards):

| Card | Calculation |
|---|---|
| Duration | `endYear − startYear` years, with `(YYYY–YYYY)` range appended |
| Base Salary | `financials.annualSalary` or `contract.baseSalary` |
| Bonus Potential | `(perWin × 3) + (perPodium × 8) + championshipBonus` (estimated annual max) |
| Total Potential Value | `(baseSalary + bonusPotential) × durationYears` |
| Contract Estimate | `baseSalary × durationYears` (base guarantee only) |

**Salary Structure Breakdown:**
A stacked horizontal bar shows the proportion of base salary, performance bonuses, and endorsements in the driver's total estimated annual income. Two Chart.js charts sit below: a bar chart (Base, Per Win, Per Podium, Champ Bonus) and a doughnut chart (all income streams including endorsements). Charts are built once and reused on tab revisit.

Endorsements are normalised from `financials.endorsements` — supports a raw number, a string, or an array of `{ value }` / `{ amount }` objects.

**Performance-to-Salary Analytics** (5 cards):

| Card | Formula |
|---|---|
| Cost per Point | `annualSalary / careerPoints` |
| Cost per Podium | `annualSalary / podiums` |
| Cost per Pole | `annualSalary / polePositions` |
| Salary vs Team Opex | `(annualSalary / team.financial.annualBudget) × 100` as `%` |
| Performance Value Index | `wins / (annualSalary / 1,000,000)` — wins per $1M salary |

**Limited Team Context** (3 cards):

| Card | Formula |
|---|---|
| Team Operating Spend | `team.financial.annualBudget` |
| Budget Cap Utilization | `(team.financial.salaryCapAllocation / annualBudget) × 100` |
| Salary Share | `(annualSalary / team.financial.salaryCapAllocation) × 100` |

---

#### Contract Section

**Contract Snapshot** (8 cards):

| Card | Source |
|---|---|
| Contract Start | `contract.startDate` year |
| Contract End | `contract.endDate` year |
| Contract Length | `endYear − startYear` Yrs + `(YYYY–YYYY)` |
| Contract Status | `contract.status` capitalised |
| Base Salary | `financials.annualSalary` or `contract.baseSalary` |
| Bonus Potential | `uiData.contractDashboard.bonusPotential` if present; else `(perWin × 8) + (perPodium × 12)` |
| Total Potential Value | `uiData.contractDashboard.totalPotentialValue` if present; else `(salary × duration) + (bonusPotential × duration)` |
| Buyout / Release Clause | `contract.releaseClause` |

**Contract Progression Status:**
Three metrics — Years Completed / Time Remaining / Fulfillment % — read from `uiData.contractDashboard.progression` if present, otherwise calculated as:
- Years Completed: `max(0, currentYear − startYear)`
- Fulfillment %: `(yearsCompleted / yearsTotal) × 100`, clamped 0–100
- Time Remaining: `max(0, endYear − currentYear)` seasons

A progress bar fills to fulfillment %.

**Key Clauses** (4 cards):

| Card | Source |
|---|---|
| Podium Bonus | `financials.performanceBonus.perPodium` |
| Championship Bonus | `financials.performanceBonus.championshipBonus` |
| Minimum Position Clause | `contract.performanceClauses.minimumPosition` shown as `Top-N Constructors` |
| Release Clause | `contract.releaseClause` |

**Performance Trigger Status** (4 progress-bar cards):

These are read from `uiData.contractDashboard.triggers` if present. If absent, `calcTriggers()` computes them:

| Trigger | Formula |
|---|---|
| Podium Rate | `round((podiums / grandPrixEntered) × 100)`, clamped 0–100 |
| Points Benchmark | `round((careerPoints / max(grandPrixEntered × 18, 1)) × 100)`, clamped 0–100 |
| Championship Target | If championships > 0: `min(96, 55 + championships × 14)`; else: `min(88, round((podiums / grandPrixEntered) × 220))` |
| Constructors Eligibility | `min(96, round(58 + podiumRate × 0.38))` |

Each card shows the percentage as a text value, a filled progress bar, and an explanatory note string.

**Contract Risk Profile** (3 cards):

Read from `uiData.contractDashboard.risk` if present. Otherwise computed by `calcRisk()`:

Let `rate = podiums / grandPrixEntered`:

| Metric | Formula |
|---|---|
| Stability Rating | `min(9.9, 3.5 + rate × 10 + championships × 0.6)` — displayed as `N.N / 10` |
| Renewal Probability | `clamp(round(38 + rate × 130 + championships × 5), 30, 95)` — displayed as `NN%` |
| Market Value Trend | `"Upward"` if rate > 0.32; `"Stable"` if rate > 0.14; `"Downward"` otherwise |
| Trend Pill | `"Strong contract leverage"` / `"Stable contract leverage"` / `"Under market pressure"` |

**Team Context** (3 cards):

| Card | Formula |
|---|---|
| Salary as % of Team Spend | `(annualSalary / team.financial.annualBudget) × 100` |
| Salary Rank Within Team | Collects all drivers whose `contract.teamId` matches (or `contract.team` fuzzy matches), sorts salaries descending, reports `#N of M` |
| Budget Cap Exemption | `uiData.contractDashboard.teamContext.budgetCapExemptionStatus` or `"Exempt"` as default |

**Contract Timeline:**
A vertical timeline with three milestone dots: F1 Debut (`personalDetails.f1Debut.year`), Contract Start, Contract End. Dots are filled (solid) if the year ≤ current year.

---

### `team.html` — Team Manager Dashboard

**Entry:** URL must include `?teamId=<ID>` (e.g. `team.html?teamId=RB01`). If `teamId` is missing, an error screen is shown with a return link.

**Boot sequence:**

1. Extract `teamId` from `URLSearchParams`.
2. Parallel-fetch both JSON datasets.
3. Find the matching team by `teamId`.
4. Apply team colour theme and custom font.
5. Populate all three sections and the Sent Offers panel.
6. Wire navigation and the back-to-login button.

#### Team Overview Section

**Team Hero card:** team name, short name, championship count (rendered as a faint large-number watermark), and an "Active · 2025 Season" badge.

**Financials sub-section** (5 cards with tooltips):

| Card | Source |
|---|---|
| Annual Budget | `team.financial.annualBudget` |
| Salary Cap | `team.financial.salaryCapAllocation` |
| Sponsor Revenue | `team.financial.sponsorRevenue` |
| Bonus Pool | `team.financial.bonusPool` |
| Signing Bonus Available | `team.financial.signingBonusAvailable` |

**Performance sub-section:** cards for championships, last season position, development index, reliability score, and aero efficiency — all sourced from `team.performance`.

#### Current Drivers Section

Reads all 20 drivers from the dataset and filters to those whose `contract.teamId === team.teamId` (or fuzzy-matched via team name). Renders one driver card per match, each showing:
- Driver name and nationality
- Driver number (as a faint watermark)
- Annual salary (in gold)
- Career stats row: Grand Prix, Wins, Championships
- Contract end year

A scrollable driver list panel sits alongside the cards, allowing the team manager to click a driver to select them for the Send Offer form.

#### Send Offer Section

A two-column layout: left panel is the scrollable driver list; right panel is the contract offer form.

**Selected Driver display:** shows the selected driver's name and a "Selected" badge. Clears when deselected.

**Form fields:**

| Field | Input Type | Notes |
|---|---|---|
| Base Salary | Number | Validates against salary cap |
| Championship Bonus | Number | |
| Signing Bonus | Number | |
| Contract Length | Select (1–5 years) | |
| Start Date | Date | |
| Dev Index (offer) | Number (0–10) | |
| Reliability (offer) | Number (0–10) | |

A cap usage hint below the salary field turns red if the entered salary exceeds the team's `salaryCapAllocation`. On submit, `createContract()` is called with a generated `contractId` (timestamp-based), the selected `driverId`, the team's `teamId`, and all form values. A toast notification confirms success or reports an error.

#### Sent Offers Panel

Rendered below the Send Offer section (not a separate nav tab). Reads all contracts from `localStorage` where `contract.teamId === team.teamId`. Each row shows:

- Coloured status dot: red = pending, green = active/accepted, blue = negotiating, grey = rejected/terminated/expired
- Driver name
- Base salary (gold)
- Contract length
- Status badge (styled to match dot colour)

---

### `new_contract.html` — Incoming Offers

**Auth guard:** reads `loggedInDriver` from `localStorage`. Redirects to `index.html` if absent.

**Boot sequence:**

1. Parallel-fetch both JSON datasets.
2. Call `seedContracts()`.
3. Find the logged-in driver by `driverId`.
4. Call `getContractsForDriver(driverId)` and filter to `status === "pending"` or `"negotiating"`.
5. Render one card per qualifying offer.

**Offer card contents:**

| Field | Source |
|---|---|
| Team name | `offer.teamName` or resolved from teams dataset |
| Team colour | `pickTeamAccent()` — picks a non-white, non-black accent from team theme |
| Last season position | `team.performance.lastSeasonPosition` shown as `P-N` |
| Status badge | `offer.status` |
| Base Salary | `offer.baseSalary` |
| Championship Bonus | `offer.bonus` |
| Signing Bonus | `offer.signingBonus` |
| Dev Index | `offer.devIndex` / 10 |
| Reliability | `offer.reliability` / 10 |
| Contract Length | `offer.contractLength` years |
| Contract ID | `offer.contractId` (small muted text) |
| Action button | Links to `offer_compare.html?contractId=<offer.contractId>` |

The page title updates to `<DRIVER NAME> — OFFERED CONTRACTS`.

A status pill in the header shows offer count (green) or `"No offers found."` (red).

The `pickTeamAccent()` function avoids near-white and near-black colours by computing WCAG relative luminance and requiring `luminance >= 0.02 && luminance <= 0.75`. It tries `accent → secondary → primary` in order, falling back to `#db0a40`.

---

### `offer_compare.html` — Offer Comparison

**Auth guard:** reads `loggedInDriver`. Reads `?contractId=` from URL. Shows an error page if either is missing.

**Layout:** a fixed `100vh` grid with 4 rows — header, tiles, charts, and a bottom split panel — all designed to fit the viewport without scrolling.

**Boot sequence:**

1. Parallel-fetch both JSON datasets.
2. Call `seedContracts()`.
3. Find the contract by `contractId` in `getAllContracts()`.
4. Find the driver and resolve their current team.
5. Apply the offering team's colour theme.
6. Fill all UI elements and build charts.

#### Row 1 — Header

Back button (`← Offers`), driver/team name and subtext, light/dark toggle, contract ID label, and a status badge styled per status (`pending` = amber, `active` = green, `negotiating` = blue, `terminated` = red, `expired` = grey).

#### Row 2 — Key Metrics Tiles

Four glassmorphism tiles:

| Tile | Source |
|---|---|
| Base Salary | `offer.baseSalary` |
| Championship Bonus | `offer.bonus` |
| Signing Bonus | `offer.signingBonus` |
| Dev Index | `offer.devIndex` / 10 |

#### Row 3 — Charts

Three Chart.js charts (rebuild when theme is toggled):

| Chart | Type | Content |
|---|---|---|
| Salary Comparison | Horizontal bar | Offer salary vs current contract salary |
| Package Breakdown | Pie | Base salary, bonus, signing bonus proportions |
| Team Analysis | Radar | Dev index, reliability, last season position (normalised) for current vs offering team |

**Normalisation for radar** (`norm(val, max)`): `min(10, (val / max) × 10)` — scales each metric to 0–10.

#### Row 4 — Contract Comparison + Counter-Offer Simulator

**Contract Comparison table:**

Rows compare current contract values against the proposed offer values. A Delta column shows the difference (green if better, red if worse). A recommendation badge at the bottom is set by `recommend()`:

| Condition | Label | Style |
|---|---|---|
| offerSalary > currentSalary AND offerDev >= currentDev | Financial & Performance Upgrade | Green |
| offerSalary > currentSalary AND offerDev < currentDev − 0.5 | Financial Upgrade — Performance Risk | Amber |
| offerSalary < currentSalary AND offerDev > currentDev + 0.5 | Performance Move — Pay Cut | Amber |
| offerSalary < currentSalary AND offerDev < currentDev | Financial Downgrade | Red |
| Otherwise | Lateral Move | Blue |

**Counter-Offer Simulator:**

- A range slider sets a counter-salary (`$1M–$80M`, step `$500K`).
- Cap usage bar: `(counterSalary / team.financial.salaryCapAllocation) × 100`.
- Live delta vs proposed: shows signed difference from offer salary.
- **Acceptance probability** — `acceptProb(salary, cap)`:
  - If `salary ≤ cap`: `clamp(round(96 − (salary / cap) × 24), 70, 96)`
  - If `salary > cap`: let `over = (salary − cap) / cap`; `clamp(round(70 − over × 130), 5, 69)`

**Action buttons** (Accept / Reject / Negotiate):
- Accept → `updateContractStatus(contractId, "active")`
- Reject → `updateContractStatus(contractId, "terminated")`
- Negotiate → `updateContractStatus(contractId, "negotiating")`

Each action shows a toast notification and updates the status badge.

---

## `contracts.js` — Contract API

Included as a `<script>` tag before the closing `</body>` in all pages that need contract access. Exposes six global functions using the `localStorage` key `"f1_contracts"`.

```js
seedContracts(contractsArray?)
```
Seeds the store with 3 default pending contracts on first run (only if `"f1_contracts"` is not already set). Accepts an optional override array. Default contracts are for DRV01 (Red Bull), DRV63 (Mercedes), DRV04 (McLaren).

```js
getAllContracts() → Array
```
Parses and returns the full contracts array from `localStorage`. Returns `[]` if nothing is stored.

```js
saveAllContracts(contracts)
```
Serialises the given array to `localStorage`. All mutation functions call this internally.

```js
createContract(contract) → Object
```
Adds a new contract. Requires `contractId`, `teamId`, and `driverId`. Defaults `status` to `"pending"`. Throws if a contract with the same `contractId` already exists.

```js
getContractsForDriver(driverId) → Array
```
Returns all contracts where `contract.driverId === driverId`. Returns `[]` if `driverId` is falsy.

```js
updateContractStatus(contractId, newStatus) → Object | null
```
Updates the status of a contract in-place. Valid statuses: `"pending"`, `"active"`, `"expired"`, `"terminated"`, `"negotiating"`. Throws for invalid statuses. Returns `null` if `contractId` is not found.

---

## Theme System

Each team in `f1_teams_dataset.json` has a `theme` object with three colour fields:

```json
"theme": {
  "primary":   "#1E3A5F",
  "secondary": "#00D2BE",
  "accent":    "#FFFFFF"
}
```

The `applyTheme(team)` function runs on every dashboard page load and injects a dynamic `<style id="themeStyle">` element into `<head>` to override card hover glows, nav active states, progress bars, section accents, section titles, value text, and card borders — all derived from the team's colours.

### Accent colour selection

`accentColor` is set to `team.theme.accent`. However, if the accent colour is too bright for use as text (luminance > 0.7), a fallback chain runs:

1. Try `theme.secondary` — use if luminance ≤ 0.7
2. Try `theme.primary` — use if luminance is between 0.05 and 0.7
3. Fall back to `#e10600` (F1 red)

This fallback is stored as `textAc` and applied to `.value`, `.hero-name`, `.sidebar-driver`, `.section-title`, and `.nav-link.active`. The raw `accentColor` (which may still be bright) is used for decorative elements where readability is not critical (borders, progress bars, cursors).

### Sidebar background

The sidebar background uses `team.theme.primary` **only if** `getLuminance(primary) < 0.12` (dark enough). Otherwise it stays `#0a0a0a`. This prevents light-coloured team primaries (e.g. McLaren papaya) from washing out the sidebar text.

### Luminance calculation

`getLuminance(hex)` implements the WCAG 2.1 relative luminance formula:

1. Parse hex → R, G, B as 0–1 floats
2. Linearise: if channel < 0.04045, divide by 12.92; otherwise `((channel + 0.055) / 1.055) ^ 2.4`
3. `luminance = 0.2126 × R + 0.7152 × G + 0.0722 × B`

### Team-specific fonts

```js
applyFont(teamId)
// MER01 → "Unity Sans", Poppins, sans-serif
// RB01  → "RB Futura", Poppins, sans-serif
// all others → Poppins, sans-serif
```

Font files are loaded via `@font-face` rules at the top of `dashboard.html` and `team.html`.

---

## Light / Dark Mode

- Toggle button in the sidebar on all pages.
- State saved to `localStorage` as `"themeMode"` (`"light"` or `"dark"`).
- Toggling adds or removes `body.light-mode`.
- Every page has a matching set of `body.light-mode .class { ... }` overrides in its `<style>` block.
- When `light-mode` is active, the dynamic theme CSS injected by `applyTheme()` also respects it — the `textAc` logic runs identically, and Chart.js charts rebuild with light-mode-appropriate tick and grid colours.
- `offer_compare.html` rebuilds all three charts on every toggle by calling the stored `buildCharts` reference.

---

## Data Flow / Boot Sequence

All dashboard pages follow the same pattern:

```
1. Read localStorage → auth guard (loggedInDriver / loggedInTeam)
2. Promise.all([fetch drivers JSON, fetch teams JSON])
3. seedContracts()                    ← initialises localStorage on first run
4. Find the subject (driver or team) by ID
5. resolveTeam()                      ← maps driver → team (see below)
6. applyTheme(team) + applyFont(teamId)
7. Fill all UI sections
8. Wire event listeners (nav, logout, theme toggle)
9. Hide loading screen, show layout
```

### `resolveTeam(driver, allTeams)`

Because driver objects do not always have a `contract.teamId`, team resolution uses a three-step fallback:

1. **Exact match:** `contract.teamId` → find team where `team.teamId === contract.teamId`
2. **Short name / personal details:** `personalDetails.currentTeam` → find team where `team.shortName === currentTeam` or `team.teamName.includes(currentTeam)` or `currentTeam.includes(team.shortName)`
3. **Contract team string:** `contract.team` → find team where `team.teamName.includes(contract.team)` or `contract.team.includes(team.shortName)`

Returns `null` if no match is found; the page degrades gracefully (theme stays default F1 red).

---

## Known Data Notes

- **No `teamId` on most driver contracts:** driver `contract` objects use a `team` string (e.g. `"Red Bull Racing"`) rather than a `teamId`. The `resolveTeam()` fuzzy matching handles this, but it is sensitive to name differences between the two datasets (e.g. `"Kick Sauber"` vs `"Sauber"`).
- **Career stats are static:** all `careerStats` values come directly from the JSON file and are not recalculated or updated by any user action.
- **Contract dates are strings:** `contract.startDate` and `contract.endDate` use `YYYY-MM-DD` format. Year extraction is done with `.substring(0, 4)` or `.slice(0, 4)`.
- **Duration is calendar-year difference:** `endYear − startYear`, not a race-season count. A 2025–2027 contract shows as `2 yrs`.
- **`uiData.contractDashboard` overrides:** the JSON dataset may include a `uiData.contractDashboard` block with pre-authored values for bonus potential, progression, triggers, and risk. These take priority over the live-calculated versions. If absent, all values are computed from `careerStats`.
- **localStorage is per-browser:** contract offers sent via `team.html` are only visible to the same browser session. There is no server-side persistence.
- **`seedContracts()` is idempotent:** it only writes to `localStorage` if `"f1_contracts"` is not already set. Clearing `localStorage` resets all contract data to the three defaults.
