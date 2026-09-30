import { describe, expect, it } from 'vitest';
import { features, REJOIN } from '../data/features';
import { flows } from '../data/flows';
import {
  featureForStep,
  featuresForFlow,
  resolveFullJourney,
  resolveFlow,
  type FeatureSelections,
} from '../lib/features';
import { nextStepIds } from '../lib/flows';

const basic = flows.find((flow) => flow.id === 'basic-card-payment')!;
const receipt = flows.find((flow) => flow.id === 'payment-with-receipt')!;

describe('feature catalog', () => {
  it('gives every feature a name, a description, options, and a default option', () => {
    for (const feature of features) {
      expect(feature.name, feature.id).toBeTruthy();
      expect(feature.description, feature.id).toBeTruthy();
      expect(feature.options.length, feature.id).toBeGreaterThan(0);
      expect(
        feature.options.some((option) => option.id === feature.defaultOptionId),
        feature.id,
      ).toBe(true);
    }
  });

  it('only anchors at steps that exist and have a single outgoing path', () => {
    for (const feature of features) {
      for (const insertion of feature.insertions) {
        const flow = flows.find((item) => item.id === insertion.flowId);
        expect(flow, `${feature.id}: flow ${insertion.flowId}`).toBeDefined();
        const anchor = flow?.steps.find(
          (step) => step.id === insertion.afterStepId,
        );
        expect(
          anchor,
          `${feature.id}: anchor ${insertion.afterStepId}`,
        ).toBeDefined();
        expect(
          anchor?.branches?.length ?? 0,
          `${feature.id}/${insertion.afterStepId} must not branch`,
        ).toBe(0);
      }
    }
  });

  it('gives the steps of each option unique ids and copy', () => {
    for (const feature of features) {
      for (const insertion of feature.insertions) {
        for (const option of feature.options) {
          const ids = new Set<string>();
          for (const step of insertion.stepsByOption[option.id] ?? []) {
            expect(ids.has(step.id), `${feature.id}/${option.id}/${step.id}`).toBe(
              false,
            );
            ids.add(step.id);
            expect(step.title, `${feature.id}/${step.id}`).toBeTruthy();
            expect(
              step.shopperDescription,
              `${feature.id}/${step.id}`,
            ).toBeTruthy();
          }
        }
      }
    }
  });

  it('keeps branch shares adding up to roughly one in inserted steps', () => {
    for (const feature of features) {
      for (const insertion of feature.insertions) {
        for (const steps of Object.values(insertion.stepsByOption)) {
          for (const step of steps) {
            if (!step.branches?.length) continue;
            const total = step.branches.reduce(
              (sum, branch) => sum + branch.share,
              0,
            );
            expect(total, `${feature.id}/${step.id}`).toBeCloseTo(1, 2);
          }
        }
      }
    }
  });

  it('only lets inserted steps point at sibling steps or the rejoin sentinel', () => {
    for (const feature of features) {
      for (const insertion of feature.insertions) {
        for (const steps of Object.values(insertion.stepsByOption)) {
          const known = new Set(steps.map((step) => step.id));
          for (const step of steps) {
            for (const targetId of nextStepIds(step)) {
              const allowed = known.has(targetId) || targetId === REJOIN;
              expect(allowed, `${feature.id}/${step.id} -> ${targetId}`).toBe(true);
            }
          }
        }
      }
    }
  });

  it('lists the features each flow supports', () => {
    expect(
      featuresForFlow('basic-card-payment').map((feature) => feature.id),
    ).toEqual(['tipping', 'giving', 'installments', 'dcc', 'surcharge', 'cvm']);
    expect(
      featuresForFlow('payment-with-receipt').map((feature) => feature.id),
    ).toEqual(['tipping', 'loyalty']);
    expect(featuresForFlow('refund').map((feature) => feature.id)).toEqual([
      'cvm',
    ]);
    expect(featuresForFlow('unattended-preauth')).toEqual([]);
  });

  it('finds the feature that owns a step', () => {
    expect(featureForStep('basic-card-payment', 'choose-tip')?.id).toBe('tipping');
    expect(featureForStep('basic-card-payment', 'see-amount')).toBeUndefined();
  });
});

describe('flow resolution', () => {
  it('builds a chart with every feature option and an opt-out branch', () => {
    const fullJourney = resolveFullJourney(basic);
    const gate = fullJourney.steps.find(
      (step) => step.id === 'feature-gate:tipping',
    )!;

    expect(gate.chartOnly).toBe(true);
    expect(gate.branches?.map((branch) => branch.label)).toEqual([
      'Suggested percentages',
      'Custom amount',
      'Not included',
    ]);
    expect(
      fullJourney.steps.some(
        (step) => step.id === 'feature-option:tipping:percentages:choose-tip',
      ),
    ).toBe(true);
    expect(
      fullJourney.steps.some(
        (step) => step.id === 'feature-option:tipping:custom:enter-tip-amount',
      ),
    ).toBe(true);
    expect(fullJourney.steps.find((step) => step.id === 'see-amount')?.nextStepId).toBe(
      'feature-gate:tipping',
    );
    expect(
      fullJourney.steps.find(
        (step) => step.id === 'feature-option:tipping:percentages:tip-total',
      )?.nextStepId,
    ).toBe('feature-gate:surcharge');
  });

  it('leaves the base flow alone when nothing is enabled', () => {
    expect(resolveFlow(basic, {}).steps).toEqual(basic.steps);
  });

  it('splices tipping into the basic payment before presenting the card', () => {
    const resolved = resolveFlow(basic, { tipping: 'percentages' });
    const byId = new Map(resolved.steps.map((step) => [step.id, step]));

    expect(byId.get('see-amount')?.nextStepId).toBe('choose-tip');
    expect(byId.get('choose-tip')?.featureId).toBe('tipping');
    expect(
      byId
        .get('choose-tip')
        ?.branches?.map((branch) => branch.targetStepId)
        .sort(),
    ).toEqual(['present-card', 'tip-total']);
    expect(byId.get('tip-total')?.nextStepId).toBe('present-card');
  });

  it('rejoins the receipt choice instead of adding an exit screen', () => {
    const resolved = resolveFlow(receipt, { tipping: 'percentages' });
    const byId = new Map(resolved.steps.map((step) => [step.id, step]));

    expect(byId.get('tip-total')?.nextStepId).toBe('receipt-choice');
    expect(
      resolved.steps.some((step) => step.id === 'flow-exit'),
      'the receipt flow should not gain an exit screen',
    ).toBe(false);
  });

  it('uses the selected option to shape the inserted screens', () => {
    const resolved = resolveFlow(basic, { tipping: 'custom' });
    const byId = new Map(resolved.steps.map((step) => [step.id, step]));

    expect(
      byId.get('choose-tip')?.branches?.map((branch) => branch.targetStepId),
    ).toEqual(['enter-tip-amount', 'present-card']);
    expect(byId.get('enter-tip-amount')?.nextStepId).toBe('tip-total');
  });

  it('falls back to the default option when the selection is unknown', () => {
    const resolved = resolveFlow(basic, { tipping: 'not-an-option' });
    expect(resolved.steps.some((step) => step.id === 'enter-tip-amount')).toBe(
      false,
    );
    expect(resolved.steps.some((step) => step.id === 'tip-total')).toBe(true);
  });

  it('adds nothing for options without screens, like verification turned off', () => {
    expect(resolveFlow(basic, { cvm: 'none' }).steps).toEqual(basic.steps);
  });

  it('inserts several features at the same anchor in catalog order', () => {
    const resolved = resolveFlow(basic, {
      installments: '3',
      dcc: 'offer-home',
      cvm: 'pin',
    });
    const byId = new Map(resolved.steps.map((step) => [step.id, step]));

    expect(byId.get('present-card')?.nextStepId).toBe('enter-pin');
    expect(byId.get('enter-pin')?.nextStepId).toBe('dcc-offer');
    expect(byId.get('dcc-offer')?.nextStepId).toBe('installments-choice');
    expect(byId.get('installments-confirmed')?.nextStepId).toBe('processing');
  });

  it('keeps tipping before card presentation while terminal features stay after success', () => {
    const resolved = resolveFlow(basic, {
      tipping: 'percentages',
      giving: 'round-up',
    });
    const byId = new Map(resolved.steps.map((step) => [step.id, step]));

    expect(byId.get('see-amount')?.nextStepId).toBe('choose-tip');
    expect(byId.get('success')?.nextStepId).toBe('giving-choice');
    expect(byId.get('giving-thanks')?.nextStepId).toBe('flow-exit');
    expect(byId.get('tip-total')?.nextStepId).toBe('present-card');
  });

  it('keeps every resolved step reachable with every feature enabled', () => {
    const everything: FeatureSelections = {};
    for (const feature of features) {
      everything[feature.id] = feature.defaultOptionId;
    }

    for (const flow of flows) {
      const resolved = resolveFlow(flow, everything);
      const first = resolved.steps[0]!;
      const seen = new Set<string>([first.id]);
      const queue = [first.id];

      while (queue.length) {
        const currentId = queue.shift()!;
        const current = resolved.steps.find((step) => step.id === currentId);
        expect(current, `${flow.id}/${currentId} does not exist`).toBeDefined();
        for (const targetId of nextStepIds(current!)) {
          if (!seen.has(targetId)) {
            seen.add(targetId);
            queue.push(targetId);
          }
        }
      }

      for (const step of resolved.steps) {
        expect(seen.has(step.id), `${flow.id}/${step.id} unreachable`).toBe(true);
      }
    }
  });

  it('never mutates the base flow data', () => {
    resolveFlow(basic, { tipping: 'percentages', cvm: 'pin' });
    expect(basic.steps.some((step) => step.id === 'choose-tip')).toBe(false);
    expect(basic.steps.find((step) => step.id === 'present-card')?.nextStepId).toBe(
      'processing',
    );
    expect(
      basic.steps.find((step) => step.id === 'success')?.nextStepId,
    ).toBeUndefined();
  });
});
