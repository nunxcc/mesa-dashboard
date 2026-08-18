# Mesa

An operations dashboard for a restaurant, the kind of internal tool a small
hospitality group would actually run day to day. It answers four questions:
how did we trade, what did every ticket earn, which dishes are worth their
place on the menu, and what are the delivery platforms really costing us.

Built with React, TypeScript and hand-written CSS. No component library, no
charting library, no backend.

**[Live demo](#)** · _replace with your deployed URL_

---

## Why a restaurant

Most dashboard portfolios are a sidebar, four stat cards and a fake revenue
line. They are indistinguishable from each other, which makes them
indistinguishable from a template.

Restaurants have genuinely interesting economics, and they are visible in the
data rather than invented for the demo:

- **Delivery marketplaces take 25–30 % of every order.** Uber Eats, Glovo and
  Bolt Food each charge a different rate, so channel mix moves the bottom line
  far more than headline revenue suggests. The Channels page exists for this.
- **Ticket times degrade non-linearly under load.** A kitchen at 90 % capacity
  is much more than 1.5× slower than one at 60 %, because tickets start
  queueing behind each other.
- **The highest-volume item is often the least profitable.** A café sells
  2 000 espressos at €0,72 margin. Menu engineering is the standard way to
  reason about that, and it is what the Menu page implements.

## What is in here

| Page         | What it does                                                                    |
| ------------ | ------------------------------------------------------------------------------- |
| **Overview** | KPIs against the preceding period, a gross-vs-net revenue trend, channel split, and a weekday × hour heatmap of when the kitchen is actually busy. |
| **Orders**   | Every ticket. Filter by channel and status, search by reference, sort any column, page through — all of it driven from the URL. Select a row for the full money breakdown. |
| **Menu**     | A menu engineering matrix — units sold against margin per plate, split at the median of each axis, classifying every dish as a Star, Plowhorse, Puzzle or Dog. |
| **Channels** | What each sales channel returns after commission, and what that adds up to.       |

## Running it

```bash
npm install
```

```bash
npm run dev
```

No API keys, no `.env`, no database. It generates its own data on first load
and runs entirely in the browser.

| Script                  | Does                             |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Dev server on :5173              |
| `npm run build`         | Typecheck, then production build |
| `npm test`              | Vitest suite                     |
| `npm run test:coverage` | Coverage report                  |
| `npm run lint`          | oxlint                           |
| `npm run typecheck`     | `tsc` with no emit               |

## Decisions worth explaining

### The data is generated, and the API is fake, deliberately

There is no public API for a restaurant's order history, and wiring this to a
real backend would have made it a backend project. Instead `src/data/`
contains a seeded generator and a mock API that behaves like a real one:
latency, `AbortSignal` support, pagination, and failures you can turn on from
the **Network** control in the top bar.

That last part matters. Loading skeletons, retry paths and empty states are
most of the work in a data-heavy UI and the least visible part of it, against
a mock that always resolves instantly, none of them ever appear. Being able to
switch on "Slow" or "Always fail" means those states can be shown to someone
rather than described.

The generator is seeded per calendar date, so a given day always produces the
same orders. The demo window slides forward daily without yesterday's numbers
changing underneath it.

Everything sits behind `src/data/api/client.ts`. Swapping that one file for
something that calls `fetch` would not require a change anywhere above it.

### Money is stored in integer cents

`0.1 + 0.2 !== 0.3`, and the drift compounds once you are summing 21 000
orders. A dashboard whose totals disagree with the rows above them is worse
than no dashboard. Conversion to a display string happens once, at the
formatting boundary.

### Filter state lives in the URL, not in React state

A filtered view can be sent to a colleague, survives a refresh, and the back
button steps through filter changes the way people already expect. It also
removes a whole category of bug, because there is one copy of the state rather
than one per component.

Everything arriving from the URL is treated as untrusted `?channels=` with a
value that is not a real channel narrows to nothing rather than reaching the
filter logic. There are tests for exactly this.

### The charts are hand-written SVG

`d3-scale` and `d3-shape` do the maths; every element is React. This was the
right call for four charts that all needed to look like one another and like
the rest of the design system, a charting library would have meant fighting
its defaults on colour, typography and spacing to arrive somewhere similar.

It also keeps them accessible on my terms: each chart carries a written
summary of what it shows, plus a visually hidden data table, so the content is
available to a screen reader rather than being an unlabelled `<svg>`.

The heatmap is a real `<table>`, not SVG. A heatmap *is* a table, row
headers, column headers, a value per cell, so the semantic element gives
correct screen-reader navigation for free.

### CSS Modules over a utility framework

Two tiers of design token in `src/styles/tokens.css`: primitives (raw values)
and semantics (`--color-text-muted`, not `--sand-500`). Components only ever
reference the semantic tier, so the dark theme is a remap of about forty
custom properties and touches no component.

The palette is warm on purpose. Cool grey and blue is the default dashboard
look, and it reads as generic for a hospitality product.

## Architecture

```
src/
  app/          providers, router, error boundary
  components/
    charts/     SVG chart primitives (frame, trend, donut, heatmap, tooltip)
    layout/     shell, sidebar, topbar, page header
    ui/         button, card, table, drawer, badge, states…
  data/
    generator/  seeded PRNG, menu catalogue, demand model
    api/        the fake backend and its network simulation
    aggregate.ts  pure aggregation — the definitions of "gross revenue"
    queries.ts    TanStack Query hooks and the query-key factory
  features/     domain logic: filters, menu classification, order detail
  lib/          formatting, hooks, theme
  pages/        one component per route
  types/        the domain model
```

Aggregation is deliberately separate from both the API and the components: it
is a set of pure functions with no clock and no module state, which is what
makes it testable and what stops two pages disagreeing about what a week is.

## Tests

49 tests covering the parts where being wrong is expensive:

- **Aggregation** — cancelled orders are excluded from revenue, empty periods
  return zeroes instead of `NaN`, closed days emit a zero bucket rather than
  vanishing, pagination clamps an out-of-range page.
- **URL filter parsing** — invalid channels, statuses, sort fields and page
  numbers are all rejected.
- **Menu classification** — each quadrant, and the fact that thresholds are
  relative to the menu rather than absolute.
- **`StatTile`** — a −0,1 % change renders as flat rather than as a downward
  arrow, and a zero baseline says so instead of showing `∞`.

## Accessibility

Keyboard reachable throughout, with a skip link and a single focus style
declared once so no component can remove it. The drawer is a native
`<dialog>`, which brings focus trapping, Esc-to-close and top-layer stacking
without a library. Tables are real tables with `aria-sort`. Charts carry text
descriptions and hidden data tables. Colour is never the only signal — the
commission portion of a bar is hatched, not just red.

## Known limitations

- The dataset lives in memory. Roughly 43 000 orders across 25 months, built
  in about 300 ms on first load; it is not a scale demonstration.
- Date ranges are presets rather than an arbitrary date picker.
- No authentication or multi-tenancy — it is a single venue's dashboard.

## Licence

MIT.
