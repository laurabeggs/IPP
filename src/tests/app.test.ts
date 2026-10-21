// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import App from '../App.vue';
import PMultiSelect from '../components/ui/PMultiSelect.vue';
import PSelect from '../components/ui/PSelect.vue';
import { GATE_STORAGE_KEY } from '../lib/gate';
import {
  addComparison,
  defaultState,
  setFeatureEnabled,
  setFlow,
  useAppState,
} from '../lib/state';

// Bento's own components produce these: their i18n wrapper calls useI18n in
// component scope, and the menu emits open/close without declaring them.
// Both come from inside the design system, so they are not this app's to fix.
const fromBento = [
  'Duplicate `useI18n` calling by local scope',
  'it is neither declared in the emits option',
];

const warnings: string[] = [];
function record(...args: unknown[]): void {
  const line = args.join(' ');
  if (fromBento.some((noise) => line.includes(noise))) return;
  warnings.push(line);
}
vi.spyOn(console, 'warn').mockImplementation(record);
vi.spyOn(console, 'error').mockImplementation(record);

function resetState() {
  window.history.replaceState(null, '', window.location.pathname);
  localStorage.removeItem('px-theme');
  const state = useAppState();
  Object.assign(state, defaultState());
  return state;
}

let mounted: ReturnType<typeof mount> | undefined;

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  expect(warnings, warnings.join('\n')).toEqual([]);
});

async function mountApp() {
  // The app-level tests bypass the password gate; gate.test.ts covers it.
  sessionStorage.setItem(GATE_STORAGE_KEY, '1');
  const wrapper = mount(App, { attachTo: document.body });
  mounted = wrapper;
  await wrapper.vm.$nextTick();
  return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountApp>>;

/**
 * Bento's dropdown opens its options into a floating layer, which costs a
 * second or so per interaction under jsdom. The dropdowns are opened for
 * real where the point of the test is the interaction itself; everywhere
 * else a choice is made through the dropdown component, which is the same
 * event the options emit.
 */
function chooseIn(
  wrapper: Wrapper,
  region: string,
  label: string,
  value: string,
): Promise<void> {
  const select = wrapper
    .findAllComponents(PSelect)
    .find(
      (candidate) =>
        candidate.props('label') === label &&
        Boolean(candidate.element.closest(region)),
    );
  if (!select) throw new Error(`no "${label}" dropdown in ${region}`);
  select.vm.$emit('update:modelValue', value);
  return wrapper.vm.$nextTick();
}

function chooseManyIn(
  wrapper: Wrapper,
  region: string,
  label: string,
  values: string[],
): Promise<void> {
  const select = wrapper
    .findAllComponents(PMultiSelect)
    .find(
      (candidate) =>
        candidate.props('label') === label &&
        Boolean(candidate.element.closest(region)),
    );
  if (!select) throw new Error(`no "${label}" multi-select in ${region}`);
  select.vm.$emit('update:modelValue', values);
  return wrapper.vm.$nextTick();
}

/** The names of the dropdowns on show in a region, in the order they sit. */
const dropdownNames = (wrapper: Wrapper, region: string) =>
  wrapper
    .findAll(`${region} [role="combobox"]`)
    .map((combobox) => combobox.attributes('aria-label'));

/** The titles of the open inspectors, in the order they sit in the row. */
const inspectorTitles = (wrapper: Wrapper) =>
  wrapper.findAll('.b-inspector__title').map((title) => title.text());

/**
 * An inspector's own close button. The insights inspector sits inside the
 * configuration one's page, so which panel a button belongs to is read from
 * the inspector it is inside rather than from the order of the two.
 */
function closeButton(wrapper: Wrapper, panel: 'config' | 'insights') {
  const button = wrapper
    .findAll('.b-inspector__icons button')
    .find(
      (candidate) =>
        Boolean(candidate.element.closest('.row__inspector--insights')) ===
        (panel === 'insights'),
    );
  if (!button) throw new Error(`the ${panel} panel has no close button`);
  return button;
}

/**
 * Opens the navigation menu and hands back its items. The menu is teleported
 * to the body, so it opens over the inspectors, and is read from there.
 */
async function openMenu(wrapper: Wrapper) {
  await wrapper.find('button[aria-label="Open navigation"]').trigger('click');
  const items = () =>
    Array.from(document.querySelectorAll('[role="menuitem"]')).map(
      (item) => new DOMWrapper(item),
    );
  await vi.waitFor(() => {
    if (!items().length) throw new Error('the navigation menu did not open');
  });
  return items();
}

const listboxOptions = () =>
  Array.from(document.querySelectorAll('[role="option"]')).map(
    (option) => new DOMWrapper(option),
  );

/** Presses a dropdown's trigger and waits for its options to appear. */
async function openDropdown(combobox: DOMWrapper<Element>) {
  await combobox.trigger('click');
  await vi.waitFor(() => {
    if (!document.querySelector('[role="option"]')) {
      throw new Error('the dropdown did not open');
    }
  });
}

/**
 * Presses the option showing this label. Options append their selected state
 * to their text for screen readers, so they match on the label they show.
 */
async function pickOption(label: string) {
  const option = listboxOptions().find((candidate) =>
    candidate.text().replace(/\s+/g, ' ').includes(label),
  );
  if (!option) throw new Error(`no option showing "${label}"`);
  await option.trigger('click');
}

describe('the explorer renders', () => {
  it('opens on Flow with one row and both side columns', async () => {
    resetState();
    const wrapper = await mountApp();

    const views = await openMenu(wrapper);
    expect(views.map((view) => view.text())).toEqual(['Flow', 'Screen library']);
    expect(wrapper.findAll('.row')).toHaveLength(1);
    expect(wrapper.find('.config').exists()).toBe(true);
    expect(wrapper.find('.insights').exists()).toBe(true);
    expect(wrapper.find('.chart').exists()).toBe(true);
    // Each panel is an inspector, so the screen's name and the configuration's
    // are their inspectors' titles. The insights one is nested in the
    // configuration one's page, so it comes first.
    expect(inspectorTitles(wrapper)).toEqual(['See amount', 'Configuration']);
    expect(wrapper.find('.insights__body').exists()).toBe(true);
    // The library link is placed in the inspector's header, beside the
    // close button, ahead of the sections.
    expect(wrapper.find('.insights__link').text()).toBe('View in library');
    expect(
      wrapper
        .find('.insights__link')
        .element.nextElementSibling?.classList.contains('insights__body'),
    ).toBe(true);
    expect(wrapper.find('.config__footer').exists()).toBe(true);
    expect(wrapper.find('.config__preset .b-field-label').text()).toBe(
      'Preset',
    );
    expect(wrapper.find('.config__help').text()).toBe(
      "Choose a merchant to use that account's configuration.",
    );
    expect(wrapper.find('.config__fields').exists()).toBe(true);
    // Inside an inspector the sections are plain titled blocks, split by
    // Bento's dividers rather than each sitting in its own card.
    expect(wrapper.find('.config__fields .p-section__title').text()).toBe(
      'Details',
    );
    expect(wrapper.find('.features .p-section__title').text()).toBe('Features');
    expect(wrapper.findAll('.config .b-card')).toHaveLength(0);
    expect(wrapper.findAll('.config .b-divider').length).toBeGreaterThan(0);
    expect(wrapper.findAll('.insights .b-divider').length).toBeGreaterThan(0);
    expect(wrapper.find('.app__topbar').findAll('.p-select')).toHaveLength(0);
    expect(wrapper.find('.display-pills').exists()).toBe(false);
    expect(wrapper.find('.app__topbar .p-toggle').text()).toContain(
      'View entire journey',
    );
    expect(wrapper.find('.flow-controls').exists()).toBe(false);
    expect(wrapper.findAll('.insights .p-select')).toHaveLength(1);
    expect(wrapper.find('.config').findAll('.p-select')).toHaveLength(5);
    expect(wrapper.text()).toContain('Compare');
  });

  it('selects the period from the metrics panel', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    // The period dropdown sits in the metrics section's header. This is the
    // one place the options are opened for real, proving the whole path from
    // a press on the dropdown to the state behind it.
    const period = wrapper.find(
      '.insights .metrics .p-section__header [role="combobox"]',
    );
    expect(period.attributes('aria-label')).toBe('Period');

    await openDropdown(period);
    await pickOption('Last 24 hours');
    expect(state.range).toBe('24h');
  });

  it('links the selected screen through to the screen library', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    expect(wrapper.find('.formats').exists()).toBe(false);
    await wrapper.find('.insights__link').trigger('click');

    expect(state.mode).toBe('screens');
    expect(state.selectedScreenKey).toBe(`${state.flow}:${state.panes[0]!.step}`);
    expect(wrapper.find('.formats').exists()).toBe(true);
    // The library panel is the same Bento inspector as in Flow, titled with
    // the screen's name.
    expect(wrapper.find('.formats .b-inspector__title').text()).toBe(
      'See amount',
    );
    // One metrics section, with the period selector in its header.
    expect(wrapper.findAll('.formats__panel .p-select')).toHaveLength(1);
    expect(wrapper.findAll('.formats__panel .metrics')).toHaveLength(1);
    expect(
      wrapper.find('.formats__panel .metrics .p-section__title').text(),
    ).toBe('Metrics');
    expect(wrapper.find('.formats__panel .metrics__figures').text()).toMatch(
      /Seen.+Drop-off.+Avg time/,
    );
    expect(
      wrapper
        .find('.formats__panel .metrics .p-section__header [role="combobox"]')
        .exists(),
    ).toBe(true);
  });

  it('clears the selected screen when switching back to Flow', async () => {
    const state = resetState();
    state.mode = 'screens';
    state.selectedScreenKey = 'basic-card-payment:see-amount';
    const wrapper = await mountApp();

    expect(wrapper.find('.app__back').exists()).toBe(true);
    const views = await openMenu(wrapper);
    await views.find((view) => view.text() === 'Flow')!.trigger('click');

    expect(state.mode).toBe('flow');
    expect(state.selectedScreenKey).toBe('');
    expect(wrapper.find('.app__back').exists()).toBe(false);
    expect(wrapper.find('.flow-screen').exists()).toBe(true);
  });

  it('toggles between light and dark mode from the top bar', async () => {
    resetState();
    const wrapper = await mountApp();

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.classList.contains('b-dark-theme')).toBe(
      false,
    );
    const darkToggle = wrapper.find('button[aria-label="Switch to dark mode"]');
    expect(darkToggle.exists()).toBe(true);

    await darkToggle.trigger('click');
    expect(document.documentElement.dataset.theme).toBe('dark');
    // Bento's dark tokens swap in through the same root element.
    expect(document.documentElement.classList.contains('b-dark-theme')).toBe(
      true,
    );
    expect(localStorage.getItem('px-theme')).toBe('dark');
    expect(
      wrapper.find('button[aria-label="Switch to light mode"]').exists(),
    ).toBe(true);

    await wrapper.find('button[aria-label="Switch to light mode"]').trigger('click');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.classList.contains('b-dark-theme')).toBe(
      false,
    );
    expect(localStorage.getItem('px-theme')).toBe('light');
  });

  it('shows one shared chart with configuration markers when comparing', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    await wrapper.find('.config__compare').trigger('click');
    await wrapper.vm.$nextTick();

    expect(state.compare).toBe(true);
    expect(wrapper.findAll('.row')).toHaveLength(2);
    expect(wrapper.findAll('.chart')).toHaveLength(1);
    // Both rows carry their own pair of inspectors, each naming the
    // configuration it belongs to.
    expect(inspectorTitles(wrapper)).toEqual([
      'See amount',
      'Configuration',
      'See amount · B',
      'B',
    ]);
    expect(
      wrapper.findAll('button[aria-label="Remove this configuration"]'),
    ).toHaveLength(1);
    // Removing a configuration is an icon-only button: its name is read from
    // the label, and the icon is all it draws.
    const remove = wrapper.find(
      'button[aria-label="Remove this configuration"]',
    );
    expect(remove.text()).toBe('');
    expect(remove.find('.b-button__icon-left .p-icon').exists()).toBe(true);

    // Both rows' panels close together, and the one button that brings each
    // back belongs to the first row.
    state.configOpen = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.config')).toHaveLength(0);
    expect(
      wrapper.findAll('button[aria-label="Open configuration"]'),
    ).toHaveLength(1);

    state.insightsOpen = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.insights')).toHaveLength(0);
    expect(
      wrapper.findAll('button[aria-label="Open metrics and properties"]'),
    ).toHaveLength(1);

    expect(wrapper.findAll('.chart__marker').map((marker) => marker.text())).toEqual([
      'A',
      'B',
    ]);
  });

  it('collapses and re-opens the configuration, insights, and chart', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    // A panel is closed from the inspector's own close button, and while it
    // is open nothing else offers to open it.
    expect(wrapper.find('.row__open--config').exists()).toBe(false);
    expect(wrapper.find('.row__open--insights').exists()).toBe(false);

    await closeButton(wrapper, 'config').trigger('click');
    expect(wrapper.find('.config').exists()).toBe(false);
    // Closed, the panel leaves nothing behind but the button that opens it,
    // floating over the screens.
    const openConfig = wrapper.find('.row__open--config');
    expect(openConfig.attributes('aria-label')).toBe('Open configuration');
    expect(openConfig.element.parentElement?.classList.contains('row__page')).toBe(
      true,
    );
    await openConfig.trigger('click');
    expect(wrapper.find('.config').exists()).toBe(true);
    expect(wrapper.find('.row__open--config').exists()).toBe(false);

    await closeButton(wrapper, 'insights').trigger('click');
    expect(wrapper.find('.insights').exists()).toBe(false);
    const openInsights = wrapper.find('.row__open--insights');
    expect(openInsights.attributes('aria-label')).toBe(
      'Open metrics and properties',
    );
    await openInsights.trigger('click');
    expect(wrapper.find('.insights').exists()).toBe(true);

    const journeyToggle = wrapper.find('.app__topbar input[role="switch"]');
    const resizeHandle = wrapper.find('.flow-resize-handle');
    expect(resizeHandle.exists()).toBe(true);
    const initialFlowBandHeight = state.flowBandHeight;
    await resizeHandle.trigger('keydown', { key: 'ArrowDown' });
    expect(state.flowBandHeight).toBe(initialFlowBandHeight + 16);
    await resizeHandle.trigger('keydown', { key: 'ArrowUp' });
    expect(state.flowBandHeight).toBe(initialFlowBandHeight);

    expect(wrapper.find('.app__topbar .p-toggle').text()).toContain(
      'View entire journey',
    );
    state.flowBandHeight = 320;
    await journeyToggle.setValue(false);
    expect(wrapper.find('.chart').exists()).toBe(false);
    expect(wrapper.find('.band').exists()).toBe(false);
    expect(wrapper.find('.flow-resize-handle').exists()).toBe(false);
    await journeyToggle.setValue(true);
    expect(wrapper.find('.chart').exists()).toBe(true);
    expect(wrapper.find('.band').exists()).toBe(true);
    expect(wrapper.find('.flow-resize-handle').exists()).toBe(true);
    expect(wrapper.find('.flow-view').attributes('style')).toContain(
      '--flow-chart-height: 320px',
    );
  });

  it('opens a screen from the chart', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    expect(wrapper.find('.chart__node--active').text()).toBe('See amount');

    const declined = wrapper
      .findAll('.chart__node')
      .find((node) => node.text().includes('Declined'))!;
    await declined.trigger('click');

    expect(state.panes[0]!.step).toBe('declined');
    expect(wrapper.find('.chart__node--active').text()).toBe('Declined');
    expect(wrapper.find('.stage__screenshot').attributes('alt')).toBe('Declined');
    expect(window.location.hash).toBe('#/flow?step=declined');
  });

  it('scrolls the selected chart node into view when a lower screen is selected', async () => {
    const state = resetState();
    const scrollTargets: Element[] = [];
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function () {
      scrollTargets.push(this);
    };

    try {
      const wrapper = await mountApp();
      scrollTargets.length = 0;

      state.panes[0]!.step = 'declined';
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(scrollTargets[scrollTargets.length - 1]).toBe(
        wrapper.find('.chart__node--active').element,
      );
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('shows optional journey variants but disables unselected paths', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    const tipVariants = wrapper
      .findAll('.chart__node')
      .filter((node) => node.text() === 'Add a tip?');
    expect(tipVariants).toHaveLength(2);
    expect(
      tipVariants.every((node) => node.attributes('disabled') !== undefined),
    ).toBe(true);
    expect(
      wrapper
        .findAll('.chart__node')
        .find((node) => node.text() === 'Tipping')!
        .attributes('disabled'),
    ).toBeDefined();

    await tipVariants[0]!.trigger('click');
    expect(state.panes[0]!.step).toBe('see-amount');

    const tipping = wrapper
      .findAll('.features__item')
      .find((item) => item.text().includes('Tipping'))!;
    await tipping.find('input[role="switch"]').setValue(true);
    await wrapper.vm.$nextTick();

    const enabledTip = wrapper
      .findAll('.chart__node')
      .find(
        (node) =>
          node.text() === 'Add a tip?' &&
          node.attributes('disabled') === undefined,
      );
    expect(enabledTip?.exists()).toBe(true);
    await enabledTip!.trigger('click');
    expect(state.panes[0]!.step).toBe('choose-tip');
  });

  it('switches between one screen and the horizontally scrollable all-screen view', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    // The switch is a segmented control: one radio per layout, the chosen
    // one checked.
    const layouts = () =>
      wrapper.findAll('.screen-layout-switch input[type="radio"]');
    const chosenLayout = () =>
      layouts().find((layout) => layout.attributes('aria-checked') === 'true')!;

    expect(chosenLayout().attributes('aria-label')).toBe('One screen');
    await layouts()[1]!.setValue(true);

    expect(state.screenLayout).toBe('all');
    expect(wrapper.findAll('.screen-strip')).toHaveLength(1);
    expect(wrapper.findAll('.screen-strip__item')).toHaveLength(5);
    expect(wrapper.find('.row__screen--all').classes()).toContain(
      'row__screen--all',
    );

    await layouts()[0]!.setValue(true);
    expect(state.screenLayout).toBe('single');
    expect(wrapper.findAll('.screen-strip')).toHaveLength(0);
  });

  it('sizes the shopper screen from the selected device geometry', async () => {
    const wrapper = await mountApp();
    await chooseIn(wrapper, '.config', 'Device', 's1f2');

    expect(wrapper.find('.stage').attributes('style')).toContain(
      '--screen-width: 380px',
    );
    expect(wrapper.find('.stage').attributes('style')).toContain(
      '--screen-height: 228px',
    );
  });

  it('stacks branch choices without a choose-a-path label', async () => {
    const state = resetState();
    state.panes[0]!.step = 'processing';
    const wrapper = await mountApp();

    expect(wrapper.text()).not.toContain('Choose a path');
    const chartEdgeLabels = wrapper
      .findAll('.chart__edge-label tspan')
      .map((label) => label.text());
    expect(chartEdgeLabels).toContain('Approved');
    expect(chartEdgeLabels).toContain('Declined');
    const forward = wrapper.findAll('.row__nav--forward .row__choice');
    expect(
      forward.map((choice) => choice.find('.row__branch-label').text()),
    ).toEqual([
      'Approved',
      'Declined',
    ]);
    expect(
      forward.every((choice) => {
        const button = choice.find('button');
        return (
          button.text() === '' &&
          button.classes('row__branch-button') &&
          button.find('.b-button__icon-left .p-icon').exists()
        );
      }),
    ).toBe(true);
    expect(
      forward.every((choice) =>
        choice.find('button').attributes('aria-label')?.startsWith('Go to ') ??
        false,
      ),
    ).toBe(true);

    await forward[1]!.find('button').trigger('click');
    expect(state.panes[0]!.step).toBe('declined');
  });

  it('shows the destination label beside single-step navigation arrows', async () => {
    const state = resetState();
    state.panes[0]!.step = 'present-card';
    const wrapper = await mountApp();

    const back = wrapper.find('.row__nav:not(.row__nav--forward) .row__choice');
    expect(back.find('.row__branch-label').text()).toBe('See amount');
    expect(back.find('button').attributes('aria-label')).toBe('Back to See amount');

    const forward = wrapper.find('.row__nav--forward .row__choice');
    expect(forward.find('.row__branch-label').text()).toBe('Processing');
    expect(forward.find('button').attributes('aria-label')).toBe(
      'Go to Processing',
    );
  });

  it('shows backward choices for a screen with multiple predecessors', async () => {
    const state = resetState();
    setFlow(state, 'payment-with-receipt');
    setFeatureEnabled(state, state.panes[0]!, 'tipping', true);
    state.panes[0]!.step = 'receipt-choice';
    const wrapper = await mountApp();

    const backChoices = wrapper.findAll(
      '.row__nav:not(.row__nav--forward) .row__choice',
    );
    expect(
      backChoices.map((choice) => choice.find('.row__branch-label').text()),
    ).toEqual([
      'Tip added',
      'Add a tip?',
    ]);
    expect(
      backChoices.every((choice) => {
        const button = choice.find('button');
        return (
          button.text() === '' &&
          button.classes('row__branch-button') &&
          button.find('.b-button__icon-left .p-icon').exists()
        );
      }),
    ).toBe(true);
    expect(
      backChoices.every((choice) =>
        choice.find('button').attributes('aria-label')?.startsWith('Back to ') ??
        false,
      ),
    ).toBe(true);

    await backChoices[1]!.find('button').trigger('click');
    expect(state.panes[0]!.step).toBe('choose-tip');
  });

  it('steps every visible configuration with the arrow keys', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    addComparison(state);
    await wrapper.vm.$nextTick();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await wrapper.vm.$nextTick();
    expect(state.panes.map((pane) => pane.step)).toEqual([
      'present-card',
      'present-card',
    ]);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await wrapper.vm.$nextTick();
    expect(state.panes.map((pane) => pane.step)).toEqual([
      'see-amount',
      'see-amount',
    ]);
  });

  it('uses toggles and options to shape a configuration flow', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    expect(wrapper.findAll('.chart__node').length).toBeGreaterThan(5);
    const tipping = wrapper
      .findAll('.features__item')
      .find((item) => item.text().includes('Tipping'))!;

    await tipping.find('input[role="switch"]').setValue(true);
    await wrapper.vm.$nextTick();
    expect(state.panes[0]!.features.tipping).toBe('percentages');
    expect(wrapper.findAll('.chart__node').map((node) => node.text())).toContain(
      'Add a tip?',
    );

    state.screenLayout = 'all';
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.screen-strip__title').map((title) => title.text())).toEqual([
      'See amount',
      'Add a tip?',
      'Tip added',
      'Present card',
      'Processing',
      'Success',
      'Declined',
    ]);

    // Setup links follow the selected screen, not every feature enabled in
    // the flow.
    expect(wrapper.find('.properties__row--ca').exists()).toBe(false);
    state.panes[0]!.step = 'choose-tip';
    await wrapper.vm.$nextTick();
    expect(
      wrapper
        .findAll('.properties .b-structured-list-item__label')
        .map((label) => label.text()),
    ).toEqual(['Team', 'CA settings', 'Docs', 'Roles']);
    expect(wrapper.find('.properties__link--ca').text()).toContain('Tip amounts');
    expect(wrapper.find('.properties__link--ca').attributes('href')).toBe(
      'https://ca-live.adyen.com/ca/ca/',
    );
    expect(
      wrapper
        .findAll('.properties__link--docs')
        .find((link) => link.attributes('href')?.includes('/tipping/'))!
        .attributes('href'),
    ).toBe(
      'https://docs.adyen.com/point-of-sale/tipping/tipping-from-terminal',
    );
    expect(wrapper.find('.properties__row--roles').text()).toContain(
      'Merchant POS Terminal Management',
    );
    // Only the role's name: no description and no roles docs link.
    expect(
      wrapper.find('.properties__row--roles .b-structured-list-item__value').text(),
    ).toBe('Merchant POS Terminal Management');
    expect(
      wrapper.findAll('.properties__link--docs').map((link) => link.text()),
    ).toEqual(['Tipping docs']);

    await chooseIn(wrapper, '.features', 'Option', 'custom');
    expect(state.panes[0]!.features.tipping).toBe('custom');
    expect(wrapper.findAll('.chart__node').map((node) => node.text())).toContain(
      'Enter tip amount',
    );

    await tipping.find('input[role="switch"]').setValue(false);
    expect(state.panes[0]!.features.tipping).toBeUndefined();
    expect(
      wrapper
        .findAll('.chart__node')
        .find((node) => node.text() === 'Add a tip?')!
        .attributes('disabled'),
    ).toBeDefined();
  });

  it('combines screen and flow metrics into one Metrics section', async () => {
    resetState();
    const wrapper = await mountApp();

    expect(wrapper.find('.insights').text()).not.toContain('Properties');
    expect(wrapper.find('.properties').text()).not.toMatch(
      /Devices|Firmware|Languages|Currencies/,
    );
    expect(wrapper.find('.properties__row--ca').exists()).toBe(false);
    expect(wrapper.find('.properties__row--roles').exists()).toBe(false);
    expect(wrapper.find('.properties .p-section__header').exists()).toBe(false);
    expect(wrapper.find('.properties__slack').attributes('href')).toBe(
      'https://adyen.enterprise.slack.com/',
    );
    expect(wrapper.find('.properties__slack .p-slack-logo').exists()).toBe(true);

    // One Metrics section: the period selector sits in its header, then the
    // screen's figures, the flow's alluvial and the screen's errors.
    expect(wrapper.findAll('.insights .metrics')).toHaveLength(1);
    expect(wrapper.find('.insights .metrics .p-section__title').text()).toBe(
      'Metrics',
    );
    expect(
      wrapper
        .find('.insights .metrics .p-section__header [role="combobox"]')
        .exists(),
    ).toBe(true);
    expect(wrapper.find('.insights .metrics__figures').text()).toMatch(
      /Seen.+Drop-off.+Avg time/,
    );
    expect(wrapper.find('.insights .metrics__chart').exists()).toBe(true);
    expect(wrapper.find('.insights .metrics__errors-title').text()).toBe(
      'Possible errors',
    );
    expect(wrapper.findAll('.insights .metrics__error').length).toBeGreaterThan(0);
    expect(wrapper.find('.metrics__funnel').exists()).toBe(false);
    expect(wrapper.find('.metrics__chart-switch').exists()).toBe(false);
  });

  it('charts the whole flow as an alluvial', async () => {
    resetState();
    const wrapper = await mountApp();
    const insights = wrapper.find('.insights');

    // No heading: the expand button floats over the chart's corner.
    expect(insights.find('.metrics__chart-title').exists()).toBe(false);
    expect(
      insights.find('.metrics__chart > .metrics__expand-surface .metrics__expand')
        .exists(),
    ).toBe(true);

    const chart = insights.find('.alluvial');
    expect(chart.classes()).toContain('alluvial--compact');
    const labels = chart
      .findAll('.alluvial__label-name')
      .map((label) => label.text());
    expect(labels).toEqual(
      expect.arrayContaining(['See amount', 'Success', 'Declined', 'Dropped off']),
    );
    expect(chart.findAll('.alluvial__node--dropped')).toHaveLength(1);
    // A decline is a negative outcome, told in the same critical colour.
    expect(
      chart.find('[data-node="branch:declined"]').classes(),
    ).toContain('alluvial__node--negative');
    expect(
      chart.find('[data-link$=">branch:declined"]').attributes('fill'),
    ).toMatch(/^url\(#/);

    // Hovering a node mutes everything it is not directly linked to.
    await chart.find('[data-node="step:processing"]').trigger('mouseenter');
    expect(
      chart.find('[data-node="step:see-amount"]').classes(),
    ).toContain('alluvial__node--muted');
    expect(
      chart.find('[data-node="step:success"]').classes(),
    ).not.toContain('alluvial__node--muted');
    await chart.find('[data-node="step:processing"]').trigger('mouseleave');
    expect(chart.findAll('.alluvial__node--muted')).toHaveLength(0);
  });

  it('expands the alluvial into a fullscreen modal', async () => {
    resetState();
    const wrapper = await mountApp();

    const modal = wrapper.find('.insights .metrics__modal');
    expect(modal.exists()).toBe(true);
    expect(modal.find('.metrics__modal-chart').exists()).toBe(false);

    await wrapper.find('.insights .metrics__expand').trigger('click');
    await flushPromises();
    const chart = modal.find('.metrics__modal-chart');
    expect(chart.exists()).toBe(true);
    // The fullscreen chart has room for counts and left-hand first labels.
    expect(chart.classes()).not.toContain('alluvial--compact');
    expect(chart.find('.alluvial__label--right').exists()).toBe(true);
    expect(chart.find('.alluvial__label-value').text()).toMatch(/·/);
  });

  it('filters the screen library and opens a screen in every device format', async () => {
    const state = resetState();
    state.mode = 'screens';
    const wrapper = await mountApp();

    expect(wrapper.findAll('.p-multi-select')).toHaveLength(2);
    expect(wrapper.find('.app__topbar').findAll('.p-select')).toHaveLength(1);
    expect(wrapper.find('.app__actions').findAll('.p-select')).toHaveLength(1);
    expect(wrapper.find('.display-pills').exists()).toBe(true);
    expect(wrapper.find('.display-pills__label').text()).toBe('Compare');
    expect(wrapper.findAll('.display-pills .p-select')).toHaveLength(4);
    expect(wrapper.findAll('.display-pills .p-multi-select')).toHaveLength(0);
    expect(
      wrapper.find('.display-pills .display-pills__compare').exists(),
    ).toBe(true);
    expect(wrapper.findAll('.display-pills__group')).toHaveLength(2);
    expect(wrapper.find('.library__filters').exists()).toBe(false);
    expect(wrapper.find('.app__search').exists()).toBe(true);
    expect(wrapper.find('.library__view-switch').exists()).toBe(false);
    expect(wrapper.find('.app__reset').exists()).toBe(true);

    const firstCard = () => wrapper.findAll('.screen-card')[0]!;
    expect(firstCard().find('.stage__screenshot').attributes('src')).toBe(
      '/screens/basic-card-payment/see-amount--e285--en-US--EUR.png',
    );

    // The placeholder with the formatted amount only appears once every
    // screenshot candidate has failed to load.
    async function exhaustCandidates(): Promise<void> {
      let screenshot = firstCard().find('.stage__screenshot');
      while (screenshot.exists()) {
        await screenshot.trigger('error');
        screenshot = firstCard().find('.stage__screenshot');
      }
    }
    const placeholderAmount = () =>
      firstCard().find('.stage__placeholder-amount').text();

    await exhaustCandidates();
    expect(placeholderAmount()).toBe('€24.50');

    state.previewCurrency = 'USD';
    await wrapper.vm.$nextTick();
    expect(firstCard().find('.stage__screenshot').attributes('src')).toBe(
      '/screens/basic-card-payment/see-amount--e285--en-US--USD.png',
    );
    await exhaustCandidates();
    expect(placeholderAmount()).toBe('$24.50');

    state.previewLanguage = 'de-DE';
    await wrapper.vm.$nextTick();
    await exhaustCandidates();
    expect(placeholderAmount()).toContain('24,50');
    expect(placeholderAmount()).toContain('$');

    const allCards = wrapper.findAll('.screen-card').length;
    expect(allCards).toBeGreaterThan(10);
    expect(wrapper.find('.screen-card__flow').exists()).toBe(false);
    expect(wrapper.find('.screen-card__context').exists()).toBe(false);

    state.filterDevices = ['ams1'];
    await wrapper.vm.$nextTick();
    const filtered = wrapper.findAll('.screen-card');
    expect(filtered.length).toBeLessThan(allCards);

    const unattended = filtered.find((card) =>
      card.text().includes('See instructions'),
    )!;
    await unattended.trigger('click');
    expect(state.mode).toBe('screens');
    expect(state.selectedScreenKey).toBe('unattended-preauth:see-instructions');
    expect(window.location.hash).toContain(
      'screen=unattended-preauth%3Asee-instructions',
    );

    // The formats view replaces the grid: the top bar swaps its filters for
    // a back button, the floating pills stay, no density controller.
    expect(wrapper.find('.library__grid').exists()).toBe(false);
    expect(wrapper.find('.app__topbar').findAll('.p-select')).toHaveLength(1);
    expect(wrapper.find('.display-pills').exists()).toBe(true);
    expect(wrapper.find('.app__search').exists()).toBe(false);
    expect(wrapper.findAll('.display-pills .p-multi-select')).toHaveLength(0);
    expect(wrapper.find('.app__back').text()).toContain('All screens');
    expect(wrapper.findAll('.display-pills .p-select')).toHaveLength(4);
    expect(wrapper.findAll('.formats__panel .p-select')).toHaveLength(1);
    expect(wrapper.find('.library__view-switch').exists()).toBe(false);

    // The selected device's screen: this one supports only AMS1, so the
    // selection falls back to it.
    expect(wrapper.findAll('.formats__item')).toHaveLength(1);
    expect(wrapper.find('.formats__device').text()).toBe('AMS1 unattended');
    expect(
      wrapper.find('.formats__item .stage__screenshot').attributes('src'),
    ).toBe(
      '/screens/unattended-preauth/see-instructions--ams1--de-DE--USD.png',
    );

    // The Properties content matches the plain section used in Flow, without
    // its former subhead.
    expect(wrapper.find('.formats .b-inspector__title').text()).toBe(
      'See instructions',
    );
    const properties = wrapper.find('.formats__panel .properties');
    expect(properties.exists()).toBe(true);
    expect(properties.classes()).toContain('p-section--plain');
    expect(properties.find('.p-section__header').exists()).toBe(false);

    // Back returns to the grid of all screens with its filters intact.
    await wrapper.find('.app__back').trigger('click');
    expect(state.selectedScreenKey).toBe('');
    expect(wrapper.find('.formats').exists()).toBe(false);
    expect(wrapper.findAll('.screen-card').length).toBe(filtered.length);

    // A screen on several devices still shows only the selected device.
    const multiDevice = wrapper
      .findAll('.screen-card')
      .find((card) => card.text().includes('Present card'))!;
    await multiDevice.trigger('click');
    expect(wrapper.findAll('.formats__item')).toHaveLength(1);
    expect(wrapper.findAll('.formats__device').map((d) => d.text())).toEqual([
      'E285 handheld',
    ]);
    expect(wrapper.find('.formats .b-inspector__title').text()).toBe(
      'Present card',
    );
    expect(wrapper.find('.formats__panel .metrics__errors-title').text()).toBe(
      'Possible errors',
    );
  });

  it('compares a property side by side across the library', async () => {
    const state = resetState();
    state.mode = 'screens';
    const wrapper = await mountApp();

    // Compare by joins the toolbar as a dropdown, off by default.
    const compareBy = (property: string) =>
      chooseIn(wrapper, '.display-pills', 'Compare', property);
    expect(
      wrapper.find('.display-pills__compare [role="combobox"]').exists(),
    ).toBe(true);
    await compareBy('device');
    expect(state.libraryCompareOn).toBe(true);

    // Comparing moves the property's values picker left of the divider,
    // next to the picker that chose it.
    expect(dropdownNames(wrapper, '.display-pills')).toEqual([
      'Compare',
      'Devices',
      'Language',
      'Release',
    ]);
    await chooseManyIn(wrapper, '.display-pills', 'Devices', ['e285', 's1f2']);
    expect(state.libraryCompareOptions).toEqual(['e285', 's1f2']);

    // Every card shows one mini preview per compared device.
    const presentCard = wrapper
      .findAll('.screen-card')
      .find((card) => card.text().includes('Present card'))!;
    expect(wrapper.find('.library__grid--compare').exists()).toBe(true);
    expect(presentCard.findAll('.screen-card__compare-item')).toHaveLength(2);
    expect(
      presentCard.findAll('.screen-card__compare-label').map((l) => l.text()),
    ).toEqual(['E285 handheld', 'S1F2 countertop']);

    // The screen detail view shows the same compared variants.
    await presentCard.trigger('click');
    expect(wrapper.findAll('.formats__item')).toHaveLength(2);
    expect(wrapper.findAll('.formats__device').map((d) => d.text())).toEqual([
      'E285 handheld',
      'S1F2 countertop',
    ]);

    // Switching the property clears its values and compares languages instead.
    await wrapper.find('.app__back').trigger('click');
    await compareBy('language');
    expect(state.libraryCompareOptions).toEqual([]);
    await chooseManyIn(wrapper, '.display-pills', 'Languages', [
      'en-US',
      'de-DE',
    ]);
    expect(state.libraryCompareOptions).toEqual(['en-US', 'de-DE']);

    const comparedCard = wrapper
      .findAll('.screen-card')
      .find((card) => card.text().includes('Present card'))!;
    expect(
      comparedCard.findAll('.screen-card__compare-label').map((l) => l.text()),
    ).toEqual(['en-US', 'de-DE']);

    // The compared property's picker sits left of the divider; the
    // selectors that stay right of it remain single and keep applying to
    // every preview.
    expect(dropdownNames(wrapper, '.display-pills')).toEqual([
      'Compare',
      'Languages',
      'Device',
      'Release',
    ]);
    expect(window.location.hash).toContain('lcmp=1');
    expect(window.location.hash).toContain('lcp=language');

    // Turning the dropdown off clears the comparison.
    await compareBy('');
    expect(state.libraryCompareOn).toBe(false);
    expect(state.libraryCompareOptions).toEqual([]);
    expect(
      wrapper.find('.display-pills .p-multi-select').exists(),
    ).toBe(false);
  });

  it('filters the library by feature once the choice is applied', async () => {
    const state = resetState();
    state.mode = 'screens';
    const wrapper = await mountApp();
    const allCards = wrapper.findAll('.screen-card').length;

    // A multi-select keeps its choices until they are applied, so this one
    // is driven through its own options rather than through the component.
    const apply = () =>
      Array.from(document.querySelectorAll('.b-popover__footer button'))
        .map((button) => new DOMWrapper(button))
        .find((button) => button.text() === 'Apply')!;
    const applyDisabled = () =>
      (apply().element as HTMLButtonElement).disabled;

    await openDropdown(
      wrapper.find('.app__leading [role="combobox"][aria-label="Feature"]'),
    );
    expect(applyDisabled()).toBe(true);

    await pickOption('Tipping');
    expect(applyDisabled()).toBe(false);
    expect(state.filterFeatures).toEqual([]);
    expect(wrapper.findAll('.screen-card').length).toBe(allCards);

    await apply().trigger('click');
    expect(state.filterFeatures).toEqual(['tipping']);
    expect(wrapper.findAll('.screen-card').length).toBeLessThan(allCards);
  });

  it('opens Ask from the header and answers a suggestion', async () => {
    resetState();
    const wrapper = await mountApp();

    await wrapper.find('button[aria-label="Ask"]').trigger('click');
    expect(wrapper.find('.ask').exists()).toBe(true);

    await wrapper.find('.ask__chip').trigger('click');
    expect(wrapper.find('.ask__headline').text().length).toBeGreaterThan(0);
    expect(wrapper.findAll('.ask__answer-row').length).toBeGreaterThan(0);
  });
});
