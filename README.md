# Thames Sea-Level Pathway Visualisation (Greater London)

This repository now contains a small browser-based visualisation tool that shows **decadal sea-level-rise pathway lines** on both sides of the Thames in Greater London up to 2100.

## What it does

- Shows the Thames centerline in Greater London.
- Draws one projected pathway line per decade (2020 to 2100) on **both banks**.
- Uses **lines only** (no flood-fill polygons).
- Lets you change assumptions with sliders:
  - Scenario slider: **SSP1-2.6 / SSP2-4.5 / SSP5-8.5**
  - Percentile slider: **5th / 50th / 95th percentile**
  - Visual offset scale slider (to control how far lines are drawn from the centerline)
- Exports currently generated pathway lines as CSV.

## Data scope and parameters used

The app is intentionally scoped to only what is needed for London:

- **Station/location reference**: `TOWER_PIER`, PSMSL ID `336` (from FACTS location list)
  - Source: `https://github.com/radical-collaboration/facts` (`input_files/location.lst`)
- **Scenarios**: SSP1-2.6, SSP2-4.5, SSP5-8.5
- **Time slices**: 2020, 2030, ..., 2100 (decadal)
- **Displayed quantity**: relative sea-level rise (meters), mapped to lateral line offsets for visual comparison

Projection values are bundled as a compact decadal table for this London-focused interactive prototype (rather than loading all global data files).

## Run locally

Because this is a static site, you can run it with any simple HTTP server.

Example:

```bash
cd path/to/CCL1
python -m http.server 8000
```

Then open:

- `http://localhost:8000`

## Run online

This is static HTML/CSS/JS and can be hosted directly on GitHub Pages, Netlify, Vercel, or any static hosting provider.

## CSV export format

The downloaded CSV includes one row per point per decade per bank with:

- scenario
- percentile
- decade
- bank (`left` / `right`)
- point index
- latitude / longitude
- projection_m
- line_offset_m

## Interaction summary

1. Open the site.
2. Move scenario and percentile sliders to explore alternative pathways.
3. Adjust visual offset scale if you want tighter or wider line spacing.
4. Click **Download pathway lines CSV** to export the generated line geometries.
