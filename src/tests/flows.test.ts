import { describe, expect, it } from 'vitest';
import {
  currencies,
  devices,
  firmwareVersions,
  languages,
  merchants,
} from '../data/catalog';
import { flows } from '../data/flows';
import {
  allScreens,
  filterScreens,
  emptyScreenFilters,
  nextStepIds,
  mostLikelyNextStepId,
  previousStepIds,
  screenProperties,
} from '../lib/flows';

const deviceIds = devices.map((device) => device.id);

describe('payment flow data', () => {
  it('defines usable screen geometry for every device', () => {
    for (const device of devices) {
      expect(device.screen.width, device.id).toBeGreaterThan(0);
      expect(device.screen.height, device.id).toBeGreaterThan(0);
    }
  });

  it('gives every flow a unique id, a summary, and at least one step', () => {
    const ids = new Set<string>();
    for (const flow of flows) {
      expect(flow.id, `flow "${flow.name}" needs an id`).toBeTruthy();
      expect(ids.has(flow.id), `duplicate flow id: ${flow.id}`).toBe(false);
      ids.add(flow.id);
      expect(flow.summary).toBeTruthy();
      expect(flow.steps.length).toBeGreaterThan(0);
    }
  });

  it('only references known devices, languages, currencies, and firmware versions', () => {
    for (const screen of allScreens()) {
      const label = `${screen.flowId}/${screen.step.id}`;
      expect(screen.properties.devices.length, label).toBeGreaterThan(0);
      for (const device of screen.properties.devices) {
        expect(deviceIds, label).toContain(device);
      }
      for (const language of screen.properties.languages) {
        expect(languages, label).toContain(language);
      }
      for (const currency of screen.properties.currencies) {
        expect(currencies, label).toContain(currency);
      }
      for (const firmware of screen.properties.firmwareVersions) {
        expect(firmwareVersions, label).toContain(firmware);
      }
      expect(screen.properties.owningTeam, label).toBeTruthy();
    }
  });

  it('gives every step a unique id, a title, and a shopper description', () => {
    for (const flow of flows) {
      const stepIds = new Set<string>();
      for (const step of flow.steps) {
        const label = `${flow.id}/${step.id}`;
        expect(step.id, `step in flow "${flow.name}" needs an id`).toBeTruthy();
        expect(stepIds.has(step.id), `duplicate step id: ${label}`).toBe(false);
        stepIds.add(step.id);
        expect(step.title, label).toBeTruthy();
        expect(step.shopperDescription, label).toBeTruthy();
      }
    }
  });

  it('lists every screen once, keyed by flow and step', () => {
    const keys = allScreens().map((screen) => `${screen.flowId}/${screen.step.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('tags the screens optional features can add', () => {
    const screens = allScreens();
    const tip = screens.find((screen) => screen.step.id === 'choose-tip');
    expect(tip?.featureName).toBe('Tipping');
    expect(tip?.step.featureId).toBe('tipping');

    const base = screens.find(
      (screen) => screen.flowId === 'basic-card-payment' && screen.step.id === 'see-amount',
    );
    expect(base?.featureName).toBeUndefined();
  });

  it('points every next step and branch at a step that exists', () => {
    for (const flow of flows) {
      const known = new Set(flow.steps.map((step) => step.id));
      for (const step of flow.steps) {
        for (const targetId of nextStepIds(step)) {
          expect(known.has(targetId), `${flow.id}/${step.id} -> ${targetId}`).toBe(
            true,
          );
        }
      }
    }
  });

  it('never sets both a single next step and branches on the same step', () => {
    for (const flow of flows) {
      for (const step of flow.steps) {
        const hasBoth = Boolean(step.nextStepId) && Boolean(step.branches?.length);
        expect(hasBoth, `${flow.id}/${step.id}`).toBe(false);
      }
    }
  });

  it('keeps branch shares adding up to roughly one', () => {
    for (const flow of flows) {
      for (const step of flow.steps) {
        if (!step.branches?.length) continue;
        const total = step.branches.reduce((sum, branch) => sum + branch.share, 0);
        expect(total, `${flow.id}/${step.id}`).toBeCloseTo(1, 2);
      }
    }
  });

  it('makes every step reachable from the first step', () => {
    for (const flow of flows) {
      const first = flow.steps[0];
      expect(first).toBeDefined();
      const seen = new Set<string>([first!.id]);
      const queue = [first!.id];

      while (queue.length) {
        const currentId = queue.shift()!;
        const current = flow.steps.find((step) => step.id === currentId);
        if (!current) continue;
        for (const targetId of nextStepIds(current)) {
          if (!seen.has(targetId)) {
            seen.add(targetId);
            queue.push(targetId);
          }
        }
      }

      for (const step of flow.steps) {
        expect(seen.has(step.id), `${flow.id}/${step.id} is unreachable`).toBe(true);
      }
    }
  });

  it('keeps the basic card payment steps in the expected order', () => {
    const basic = flows.find((flow) => flow.id === 'basic-card-payment');
    expect(basic).toBeDefined();
    expect(basic?.steps.map((step) => step.id)).toEqual([
      'see-amount',
      'present-card',
      'processing',
      'success',
      'declined',
    ]);
  });

  it('moves forward along the branch most shoppers take', () => {
    const basic = flows.find((flow) => flow.id === 'basic-card-payment')!;
    const presentCard = basic.steps.find((step) => step.id === 'present-card')!;
    const seeAmount = basic.steps.find((step) => step.id === 'see-amount')!;
    const success = basic.steps.find((step) => step.id === 'success')!;

    expect(mostLikelyNextStepId(presentCard)).toBe('processing');
    expect(mostLikelyNextStepId(seeAmount)).toBe('present-card');
    expect(mostLikelyNextStepId(success)).toBeUndefined();
  });

  it('resolves step overrides on top of flow properties', () => {
    const basic = flows.find((flow) => flow.id === 'basic-card-payment')!;
    const declined = basic.steps.find((step) => step.id === 'declined')!;
    const properties = screenProperties(basic, declined);
    expect(properties.owningTeam).toBe('Checkout Experience');
    expect(properties.devices).toEqual(basic.properties.devices);
    expect(properties.currencies).toEqual(basic.properties.currencies);
  });

  it('reports the steps that lead into a step', () => {
    const basic = flows.find((flow) => flow.id === 'basic-card-payment')!;
    expect(previousStepIds(basic, 'processing')).toEqual(['present-card']);
    expect(previousStepIds(basic, 'see-amount')).toEqual([]);
  });

  it('points every merchant at flows and configuration values that exist', () => {
    for (const merchant of merchants) {
      expect(merchant.topFlowIds.length).toBeGreaterThan(0);
      for (const flowId of merchant.topFlowIds) {
        expect(flows.some((flow) => flow.id === flowId), merchant.id).toBe(true);
      }
      expect(deviceIds).toContain(merchant.config.device);
      expect(languages).toContain(merchant.config.language);
      expect(currencies).toContain(merchant.config.currency);
      expect(firmwareVersions).toContain(merchant.config.firmware);
    }
  });
});

describe('screen library filtering', () => {
  it('returns every screen when no filters are set', () => {
    const screens = allScreens();
    expect(filterScreens(screens, emptyScreenFilters())).toHaveLength(
      screens.length,
    );
  });

  it('filters by device', () => {
    const result = filterScreens(allScreens(), {
      ...emptyScreenFilters(),
      devices: ['ams1'],
    });
    expect(result.length).toBeGreaterThan(0);
    for (const screen of result) {
      expect(screen.properties.devices).toContain('ams1');
    }
  });

  it('filters by team ownership and device together', () => {
    const result = filterScreens(allScreens(), {
      ...emptyScreenFilters(),
      teams: ['Receipts and Loyalty'],
      devices: ['s1f2'],
    });
    expect(result.length).toBeGreaterThan(0);
    for (const screen of result) {
      expect(screen.properties.owningTeam).toBe('Receipts and Loyalty');
      expect(screen.properties.devices).toContain('s1f2');
    }
  });

  it('filters by any selected feature', () => {
    const result = filterScreens(allScreens(), {
      ...emptyScreenFilters(),
      features: ['tipping'],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((screen) => screen.step.featureId === 'tipping')).toBe(
      true,
    );
  });

  it('searches titles and wording case insensitively', () => {
    const result = filterScreens(allScreens(), {
      ...emptyScreenFilters(),
      query: 'PIN',
    });
    expect(result.some((screen) => screen.step.id === 'enter-pin')).toBe(true);
  });

  it('searches the feature that adds a screen', () => {
    const result = filterScreens(allScreens(), {
      ...emptyScreenFilters(),
      query: 'tipping',
    });
    expect(result.some((screen) => screen.step.id === 'choose-tip')).toBe(true);
  });

  it('returns nothing for a search with no match', () => {
    expect(
      filterScreens(allScreens(), {
        ...emptyScreenFilters(),
        query: 'cryptocurrency wallet',
      }),
    ).toEqual([]);
  });
});
