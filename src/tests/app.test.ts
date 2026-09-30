// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../App.vue';
import { GATE_STORAGE_KEY } from '../lib/gate';
import {
  addComparison,
  defaultState,
  setFeatureEnabled,
  setFlow,
  useAppState,
} from '../lib/state';

const warnings: string[] = [];
vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
  warnings.push(args.join(' '));
});
vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
  warnings.push(args.join(' '));
});

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

describe('the explorer renders', () => {
  it('opens on Flow with one row and both side columns', async () => {
    resetState();
    const wrapper = await mountApp();

    await wrapper.find('button[aria-label="Open navigation"]').trigger('click');
    expect(wrapper.findAll('.app__mode').map((mode) => mode.text())).toEqual([
      'Flow',
      'Screen library',
    ]);
    expect(wrapper.findAll('.row')).toHaveLength(1);
    expect(wrapper.find('.config').exists()).toBe(true);
    expect(wrapper.find('.insights').exists()).toBe(true);
    expect(wrapper.find('.chart').exists()).toBe(true);
    expect(wrapper.find('.insights__label').text()).toBe('See amount');
    expect(wrapper.find('.insights__header').exists()).toBe(true);
    expect(wrapper.find('.insights__body').exists()).toBe(true);
    expect(wrapper.find('.insights__link').text()).toContain(
      'View in screen library',
    );
    // The link sits in the header, to the right of the screen name, icon
    // after text.
    expect(wrapper.find('.insights__header .insights__link').exists()).toBe(
      true,
    );
    expect(
      wrapper
        .find('.insights__label')
        .element.nextElementSibling?.classList.contains('insights__link'),
    ).toBe(true);
    expect(
      wrapper.find('.insights__link .p-icon').element.nextElementSibling,
    ).toBeNull();
    expect(wrapper.find('.config__label').text()).toBe('Configuration');
    expect(wrapper.find('.config__header').exists()).toBe(true);
    expect(wrapper.find('.config__footer').exists()).toBe(true);
    expect(wrapper.find('.config__preset .p-select__label').text()).toBe(
      'Preset',
    );
    expect(wrapper.find('.config__help').text()).toBe(
      "Choose a merchant to use that account's configuration.",
    );
    expect(wrapper.find('.config__fields').exists()).toBe(true);
    expect(wrapper.find('.config__section-title').text()).toBe('Details');
    expect(wrapper.find('.features__title').text()).toBe('Features');
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

    // The period selector lives in the metrics header, to the right of it.
    const period = wrapper.find('.insights .metrics__header .p-select__control');
    expect(period.exists()).toBe(true);
    await period.setValue('24h');
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
    expect(wrapper.find('.formats__panel-title').text()).toBe('See amount');
    // One metrics section, with the period selector in its header.
    expect(wrapper.findAll('.formats__panel .p-select')).toHaveLength(1);
    expect(wrapper.findAll('.formats__panel .metrics')).toHaveLength(1);
    expect(wrapper.find('.formats__panel .metrics__title').text()).toBe(
      'Metrics',
    );
    expect(
      wrapper
        .findAll('.formats__panel .metrics__group-title')
        .map((group) => group.text()),
    ).toEqual(['Screen', 'Flow']);
    expect(
      wrapper
        .find('.formats__panel .metrics__header .p-select__control')
        .exists(),
    ).toBe(true);
  });

  it('clears the selected screen when switching back to Flow', async () => {
    const state = resetState();
    state.mode = 'screens';
    state.selectedScreenKey = 'basic-card-payment:see-amount';
    const wrapper = await mountApp();

    expect(wrapper.find('.app__back').exists()).toBe(true);
    await wrapper.find('button[aria-label="Open navigation"]').trigger('click');
    const flowOption = wrapper
      .findAll('.app__mode')
      .find((mode) => mode.text() === 'Flow')!;
    await flowOption.trigger('click');

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
    expect(wrapper.findAll('.insights__label').map((label) => label.text())).toEqual([
      'See amount',
      'See amount · B',
    ]);
    expect(
      wrapper.findAll('button[aria-label="Hide metrics and properties"]'),
    ).toHaveLength(1);
    expect(wrapper.findAll('.config__label').map((label) => label.text())).toEqual([
      'Configuration',
      'B',
    ]);
    expect(wrapper.findAll('button[aria-label="Hide configuration"]')).toHaveLength(
      1,
    );
    expect(
      wrapper.findAll('button[aria-label="Remove this configuration"]'),
    ).toHaveLength(1);
    expect(
      wrapper
        .find('button[aria-label="Remove this configuration"] svg path')
        .attributes('d'),
    ).toContain('M4 7');

    state.configOpen = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('button[aria-label="Show configuration"]')).toHaveLength(
      1,
    );

    state.insightsOpen = false;
    await wrapper.vm.$nextTick();
    expect(
      wrapper.findAll('button[aria-label="Show metrics and properties"]'),
    ).toHaveLength(1);

    expect(wrapper.findAll('.chart__marker').map((marker) => marker.text())).toEqual([
      'A',
      'B',
    ]);
  });

  it('collapses and re-opens the configuration, insights, and chart', async () => {
    const state = resetState();
    const wrapper = await mountApp();

    // The hide buttons float over the screens area, outside the panels,
    // beside each panel's edge.
    const hideConfig = wrapper.find('.row__hide--config');
    expect(hideConfig.exists()).toBe(true);
    expect(hideConfig.element.parentElement?.classList.contains('row')).toBe(
      true,
    );
    const hideInsights = wrapper.find('.row__hide--insights');
    expect(hideInsights.exists()).toBe(true);
    expect(hideInsights.element.parentElement?.classList.contains('row')).toBe(
      true,
    );

    await wrapper.find('button[aria-label="Hide configuration"]').trigger('click');
    expect(wrapper.find('.config').exists()).toBe(false);
    await wrapper.find('button[aria-label="Show configuration"]').trigger('click');
    expect(wrapper.find('.config').exists()).toBe(true);

    await wrapper
      .find('button[aria-label="Hide metrics and properties"]')
      .trigger('click');
    expect(wrapper.find('.insights').exists()).toBe(false);
    await wrapper
      .find('button[aria-label="Show metrics and properties"]')
      .trigger('click');
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

    expect(wrapper.find('.screen-layout-switch__option--active').text()).toBe(
      'One screen',
    );
    await wrapper
      .find('.screen-layout-switch__option:nth-child(2)')
      .trigger('click');

    expect(state.screenLayout).toBe('all');
    expect(wrapper.findAll('.screen-strip')).toHaveLength(1);
    expect(wrapper.findAll('.screen-strip__item')).toHaveLength(5);
    expect(wrapper.find('.row__screen--all').classes()).toContain(
      'row__screen--all',
    );

    await wrapper
      .find('.screen-layout-switch__option:nth-child(1)')
      .trigger('click');
    expect(state.screenLayout).toBe('single');
    expect(wrapper.findAll('.screen-strip')).toHaveLength(0);
  });

  it('sizes the shopper screen from the selected device geometry', async () => {
    const wrapper = await mountApp();
    const deviceSelect = wrapper.findAll('.config .p-select__control')[1]!;

    await deviceSelect.setValue('s1f2');
    await wrapper.vm.$nextTick();

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
          button.element.lastElementChild?.classList.contains('p-icon')
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
          button.element.firstElementChild?.classList.contains('p-icon')
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

    state.panes[0]!.step = 'choose-tip';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.properties__link--docs').attributes('href')).toBe(
      'https://docs.adyen.com/point-of-sale/tipping',
    );

    await tipping.find('select').setValue('custom');
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

    expect(wrapper.find('.insights').text()).toContain('Properties');
    expect(wrapper.find('.properties__link--slack').attributes('href')).toBe(
      'https://adyen.enterprise.slack.com/',
    );
    expect(wrapper.find('.properties__link--slack .p-icon').exists()).toBe(true);

    // One Metrics card: the period selector sits in its header, the screen
    // group carries the errors, and the flow group the funnel.
    expect(wrapper.findAll('.insights .metrics')).toHaveLength(1);
    expect(wrapper.find('.insights .metrics__title').text()).toBe('Metrics');
    expect(
      wrapper
        .findAll('.insights .metrics__group-title')
        .map((group) => group.text()),
    ).toEqual(['Screen', 'Flow']);
    expect(
      wrapper.find('.insights .metrics__header .p-select__control').exists(),
    ).toBe(true);

    const groups = wrapper.findAll('.insights .metrics__group');
    expect(groups[0]!.find('.metrics__errors-title').text()).toBe(
      'Possible errors',
    );
    expect(groups[0]!.findAll('.metrics__error').length).toBeGreaterThan(0);
    expect(groups[1]!.find('.metrics__errors-title').exists()).toBe(false);
    expect(wrapper.findAll('.metrics__funnel-row').length).toBeGreaterThan(2);
    expect(wrapper.find('.metrics__funnel-stage').exists()).toBe(true);
    expect(wrapper.find('.metrics__funnel-track').exists()).toBe(false);
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

    // Properties and metrics anchored to the right.
    expect(wrapper.find('.formats__panel-title').text()).toBe(
      'See instructions',
    );
    expect(wrapper.find('.formats__panel .properties').exists()).toBe(true);

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
    expect(wrapper.find('.formats__panel-title').text()).toBe('Present card');
    expect(wrapper.find('.formats__panel .metrics__errors-title').text()).toBe(
      'Possible errors',
    );
  });

  it('compares a property side by side across the library', async () => {
    const state = resetState();
    state.mode = 'screens';
    const wrapper = await mountApp();

    // Compare by joins the toolbar as a dropdown, off by default.
    const compareBy = () =>
      wrapper.find('.display-pills__compare .p-select__control');
    expect(compareBy().exists()).toBe(true);
    await compareBy().setValue('device');
    expect(state.libraryCompareOn).toBe(true);

    // Comparing moves the property's values picker left of the divider,
    // next to the picker that chose it.
    expect(
      wrapper.find('.display-pills button[aria-label="Devices"]').exists(),
    ).toBe(true);
    expect(
      wrapper
        .findAll('.display-pills .p-select__label')
        .map((label) => label.text()),
    ).toEqual(['Compare', 'Language', 'Release']);
    await wrapper
      .find('.display-pills button[aria-label="Devices"]')
      .trigger('click');
    const deviceChoices = wrapper
      .find('.p-multi-select__menu')
      .findAll('.p-multi-select__option');
    for (const label of ['E285 handheld', 'S1F2 countertop']) {
      await deviceChoices
        .find((option) => option.text().includes(label))!
        .find('input')
        .setValue(true);
    }
    await wrapper.find('.p-multi-select__apply').trigger('click');
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
    await compareBy().setValue('language');
    expect(state.libraryCompareOptions).toEqual([]);
    await wrapper
      .find('.display-pills button[aria-label="Languages"]')
      .trigger('click');
    const languageChoices = wrapper
      .find('.p-multi-select__menu')
      .findAll('.p-multi-select__option');
    for (const language of ['en-US', 'de-DE']) {
      await languageChoices
        .find((option) => option.text().includes(language))!
        .find('input')
        .setValue(true);
    }
    await wrapper.find('.p-multi-select__apply').trigger('click');
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
    expect(
      wrapper.find('.display-pills button[aria-label="Languages"]').exists(),
    ).toBe(true);
    expect(
      wrapper
        .findAll('.display-pills .p-select__label')
        .map((label) => label.text()),
    ).toEqual(['Compare', 'Device', 'Release']);
    expect(window.location.hash).toContain('lcmp=1');
    expect(window.location.hash).toContain('lcp=language');

    // Turning the dropdown off clears the comparison.
    await compareBy().setValue('');
    expect(state.libraryCompareOn).toBe(false);
    expect(state.libraryCompareOptions).toEqual([]);
    expect(
      wrapper.find('.display-pills .p-multi-select').exists(),
    ).toBe(false);
  });

  it('applies multi-select choices and closes on an outside press', async () => {
    const state = resetState();
    state.mode = 'screens';
    const wrapper = await mountApp();
    const allCards = wrapper.findAll('.screen-card').length;

    const featureControl = () => wrapper.find('button[aria-label="Feature"]');
    const applyDisabled = () =>
      (
        wrapper.find('.p-multi-select__apply').element as HTMLButtonElement
      ).disabled;
    const tippingCheckbox = () =>
      wrapper
        .find('.p-multi-select__menu')
        .findAll('.p-multi-select__option')
        .find((option) => option.text().includes('Tipping'))!
        .find('input');

    await featureControl().trigger('click');
    expect(wrapper.find('.p-multi-select__menu').exists()).toBe(true);
    expect(applyDisabled()).toBe(true);

    await tippingCheckbox().setValue(true);
    expect(applyDisabled()).toBe(false);
    expect(wrapper.findAll('.screen-card').length).toBe(allCards);
    expect(state.filterFeatures).toEqual([]);

    document.dispatchEvent(new Event('pointerdown'));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.p-multi-select__menu').exists()).toBe(false);
    expect(state.filterFeatures).toEqual([]);
    expect(wrapper.findAll('.screen-card').length).toBe(allCards);

    await featureControl().trigger('click');
    await tippingCheckbox().setValue(true);
    await wrapper.find('.p-multi-select__apply').trigger('click');
    expect(state.filterFeatures).toEqual(['tipping']);
    expect(wrapper.findAll('.screen-card').length).toBeLessThan(allCards);
    expect(wrapper.find('.p-multi-select__menu').exists()).toBe(false);
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
