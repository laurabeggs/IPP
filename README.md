# Payment Flow Explorer

An internal prototype for exploring Adyen shopper payment flows. Product and
engineering teams can see the whole journey, open one screen, and compare how
the journey changes between configurations.

Status: early prototype. Screens are placeholders until real screenshots are
added, and every metric is invented placeholder data.

## Run it locally

Requires Node.js 20 or later and npm 10 or later.

```bash
npm install
npm run dev
```

Then open the URL Vite prints, usually http://localhost:5173.

## How it is structured

The top navigation has a menu for **Flow** and **Screens**, a share-link
button, an **Ask** button, and a light/dark mode toggle. In the library grid
it also carries the search, the feature and team filters, and the currency
selector; while a screen is open, a back button takes their place. Ask opens
a floating question box from any tab. The theme follows the system
preference first and the manual choice is remembered per browser.

**Flow** has one shared horizontal chart across the page. It includes every
possible feature option and branch in the journey. Options not included in
the selected configuration are shown disabled and cannot be opened. The
**View entire journey** toggle sits in the top bar. The properties and metrics
panel names the selected screen with a link to it in the library, and joins
the screen and flow figures in one Metrics section that carries the period
selector. The chart sits in a subtle recessed section and
can be collapsed. In a comparison, the current screen in each configuration
is marked with A or B.

Below the chart, each configuration gets one horizontal row:

- The left column contains its merchant, device, language, currency, firmware,
  and feature toggles.
- The middle column shows the current terminal screen. Back navigation is on
  the left edge and forward navigation is on the right edge. Branch choices
  stack vertically. The left and right arrow keys move every visible
  configuration together.
- The right column contains screen properties and one Metrics section: the
  screen's figures and possible errors, then the whole flow's figures and
  funnel.

The screen area has a segmented control for **One screen** and **All screens**.
The first view focuses on the selected screen. The second lays out every
resolved screen from left to right in a horizontally scrollable strip. The
configuration and insights panels remain above the strip while it scrolls.

The configuration and insights columns collapse to icon rails. Their hide
buttons float over the screens area beside each panel's edge. The chart also
collapses, so the screen can take the available space. **Compare** adds a
second row with its own configuration and feature settings.

**Screens** lists screens across all flows, including screens that optional
features can add. Search and the feature and team filters sit in the top bar
and narrow the list. Above the screens, centered with them and inside their
own container, sit two groups of small glass pills: one holding the
**Compare** label and picker, with the compared property's values picker
beside it while comparing, and one holding the language, device, and release
selectors. Picking a property to compare moves its selector out of the
display group and turns it into the values picker in the compare group: pick
as many values as you like and the grid becomes a single column, with each
screen's previews grouped in one white card. The selectors that stay in the display group remain single and
keep applying to every preview. Opening a card opens that screen in the
compared previews, or for the selected device when compare is off, with its
properties and the same combined Metrics section, period selector included,
to the right; the back button in the top bar returns to the list.

The interface intentionally avoids explanatory paragraphs and shopper copy.
The audience already understands payment flows and terminal UI; the screen
title, controls, properties, and metrics carry the useful information.

## Features

Optional checkout features are switched on per configuration, and switching one
on inserts its screens into that configuration's resolved flow. The journey
chart shows every option for each feature, while the configuration's selected
option remains the only interactive variant. Included so far: tipping, giving,
installments, loyalty, dynamic currency conversion, surcharge, and card
verification method. Each feature has options that change the screens it
inserts, such as suggested tip percentages versus a custom amount, or PIN
versus signature versus verification on the shopper's phone.

Only features that apply to the selected flow are listed. A comparison can
therefore show the same flow with different features enabled on each side.

## Share a link

Selections are stored in the URL hash, so copying the address bar shares the
current mode, flow, screen, configurations, feature options, comparison state,
filters, and time period. **Copy share link** does the same.

## Add a screenshot for a step

Screenshots load by filename convention, so adding one needs no code change:

1. Save the screenshot as `public/screens/<flow id>/<step id>.png`, for example
   `public/screens/basic-card-payment/see-amount.png`.
2. For a device-specific version, add the device id:
   `public/screens/basic-card-payment/see-amount--ams1.png`. It takes priority
   when that device is selected.
3. Reload the prototype. The placeholder is replaced automatically.

Every placeholder lists the exact file paths it tried on hover. Screens that a
feature adds use the same convention under the flow id.

## Add or edit a flow

Flows live in `src/data/flows.ts`, without optional features applied. A flow
has an id, name, summary, inherited screen properties, and steps. A step has an
id, title, shopper description, metrics, and either a single `nextStepId` or a
list of branches with a share for each path. Steps can override inherited
properties. The chart positions itself from those links.

Devices, languages, currencies, firmware versions, time periods, and merchants
live in `src/data/catalog.ts`.

## Add or edit a feature

Features live in `src/data/features.ts`. A feature has an id, name,
description, options with a default, and one insertion per flow it applies to.
An insertion names the step its screens go after and the screens each option
inserts.

Inserted screens point at `REJOIN` where they hand back to the rest of the flow.
`resolveFlow` in `src/lib/features.ts` replaces that with the anchor's original
next step. When the anchor used to end the flow, a shared `Take card` screen is
added instead. An option can insert nothing, which is how verification can be
turned off.

## Code layout

- `src/lib/state.ts` holds shared state, both configurations, screen layout and
  collapse flags, URL hash parsing, and URL serialisation.
- `src/lib/features.ts` resolves a base flow plus enabled features.
- `src/lib/pane.ts` derives the resolved flow, open screen, navigation, and
  properties for one configuration row.
- `src/lib/graph.ts` turns a flow into chart coordinates and connector paths;
  the full journey uses a lazy-loaded ELK.js layered layout for dynamic branch
  spacing and routing.
- `src/lib/flows.ts` resolves properties, neighbours, library screens, and
  filters.
- `src/lib/metrics.ts` derives screen metrics, flow metrics, funnel rows, and
  formatters.
- `src/lib/ask.ts` provides the current keyword-matched Ask placeholder.
- `src/components/` contains the shared chart, rows, screen stage, insights,
  library cards, and Ask dock.
- `src/components/ui/` is the placeholder component layer.

## Placeholder components

The components in `src/components/ui/` (`PButton`, `PInput`, `PPanel`,
`PSelect`, `PTag`, `PToggle`, `PIcon`, and `PIconButton`) are deliberately
simple. When the internal component library is available, swap their internals
and keep their prop APIs so app code does not need to change.

## Design tokens

The palette is Bento's. `main.ts` imports the light and dark token stylesheets
from `@adyen/bento-design-tokens`, and every `--px-*` token in
`src/styles.css` aliases a `--b-*` token, so the app follows Bento's themes.
The page and the screens sit on the palette's lightest grey,
background-primary-hover, while the recessed chart band and the panel cards
sit on white, background-primary. Chart nodes outside the selected
configuration use Bento's disabled background, outline, and label tokens.
Interactive emphasis — the funnel, the selected chart node, the selected
screen in the all-screens strip, tags, and the A/B markers — follows Bento's
green success family, while links, checkboxes, and focus rings follow the
blue link-primary family. Dark mode toggles Bento's `b-dark-theme` class on
the page root alongside `data-theme`.

## Where the numbers come from

Nothing is wired to reporting. Each step carries a 30-day baseline in
`src/data/flows.ts` or `src/data/features.ts`, and `src/lib/metrics.ts` scales
it for shorter periods. The funnel follows the most likely path. Ask matches
keywords and answers from the same placeholder data.

## Validate

```bash
npm test
npm run typecheck
npm run build
```

The tests cover flow and feature data, flow resolution, chart layout, library
filters, metrics and funnel formatting, URL round trips, shared-flow changes,
comparison rows, collapse rails, branch navigation, arrow-key navigation,
feature toggles, the one-screen/all-screens control, the Screens tab, and the
Ask dock.

## Password gate

The hosted copy asks for a password before it opens. GitHub Pages cannot check
a password on the server, so the gate is client-side: `PasswordGate` keeps the
app unmounted until the entered password hashes to `PASSWORD_DIGEST` in
`src/lib/gate.ts`. The password itself is not in the source or the bundle; only
its SHA-256 digest is. The unlock lasts for the browser session, so closing the
tab locks it again. This is a soft gate: it turns away casual visitors, but the
bundle stays publicly fetchable, so it is not protection against someone
determined.

To change the password, replace `PASSWORD_DIGEST` with the SHA-256 hex digest
of the new password, for example from `printf 'new password' | shasum -a 256`,
then build and deploy again.

## Deploy

The site is deployed from the committed `site-dist/` folder: Netlify publishes
it as-is, with no install and no build step on their side. After changing the
app, run `npm run build` and commit the updated `site-dist/` together with the
source, and the site updates on the next push.

The prototype is also hosted on GitHub Pages at
https://laurabeggs.github.io/IPP/, served from the `gh-pages` branch of the
[laurabeggs/IPP](https://github.com/laurabeggs/IPP) repository. Pages serves
the site under `/IPP/`, so that deploy uses `npm run build:pages`: the same as
`npm run build`, but with `--base=/IPP/` and output into the git-ignored
`dist/` folder. Push the contents of `dist/` to the `gh-pages` branch and the
site updates on the next push. Screenshot URLs join Vite's build base through
`import.meta.env.BASE_URL`, so they load both at the dev server root and under
`/IPP/`.

## Scope

Front-end only: no API integration, user authentication, analytics, or
persistence.
The source lives in this repository; the prototype is deployed on Netlify and
on GitHub Pages.
