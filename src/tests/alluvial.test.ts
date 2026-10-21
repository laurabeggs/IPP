import { describe, expect, it } from 'vitest';
import { flows } from '../data/flows';
import {
  DROPPED_NODE_ID,
  NODE_WIDTH,
  flowAlluvial,
  layoutAlluvial,
} from '../lib/alluvial';
import { flowFunnel } from '../lib/metrics';

const basic = flows.find((flow) => flow.id === 'basic-card-payment')!;
const receipt = flows.find((flow) => flow.id === 'payment-with-receipt')!;
const share = () => '100%';

describe('flow alluvial data', () => {
  it('has one stage per screen on the most likely path', () => {
    const data = flowAlluvial(basic, '30d');
    const funnel = flowFunnel(basic, '30d');
    expect(data.stages).toBe(funnel.length);
    expect(data.total).toBe(funnel[0]!.count);
    expect(
      data.nodes.filter((node) => node.kind === 'step').map((node) => node.label),
    ).toEqual(funnel.map((row) => row.title));
  });

  it('ends other branches and drop-offs in their own nodes', () => {
    const data = flowAlluvial(basic, '30d');
    expect(data.nodes.find((node) => node.kind === 'branch')?.label).toBe(
      'Declined',
    );
    const dropped = data.nodes.find((node) => node.id === DROPPED_NODE_ID)!;
    expect(dropped.label).toBe('Dropped off');
    expect(dropped.stage).toBe(data.stages - 1);
  });

  it('marks a decline, and the path into it, as a negative outcome', () => {
    const data = flowAlluvial(basic, '30d');
    const declined = data.nodes.find((node) => node.label === 'Declined')!;
    expect(declined.negative).toBe(true);
    expect(
      data.links.find((link) => link.target === declined.id)?.negative,
    ).toBe(true);
    expect(
      data.nodes.find((node) => node.label === 'Success')?.negative,
    ).toBeFalsy();
  });

  it('conserves every shopper who starts the flow', () => {
    for (const flow of [basic, receipt]) {
      const data = flowAlluvial(flow, '30d');
      const lastStage = data.stages - 1;
      const ends = data.nodes.filter(
        (node) => node.kind !== 'step' || node.stage === lastStage,
      );
      const ended = ends.reduce((sum, node) => sum + node.value, 0);
      expect(ended).toBe(data.total);
    }
  });

  it('balances what flows into and out of every middle screen', () => {
    const data = flowAlluvial(receipt, '30d');
    for (const node of data.nodes) {
      if (node.kind !== 'step' || node.stage === 0) continue;
      const inflow = data.links
        .filter((link) => link.target === node.id)
        .reduce((sum, link) => sum + link.value, 0);
      expect(inflow).toBe(node.value);
      if (node.stage === data.stages - 1) continue;
      const outflow = data.links
        .filter((link) => link.source === node.id)
        .reduce((sum, link) => sum + link.value, 0);
      expect(outflow).toBe(node.value);
    }
  });
});

describe('alluvial layout', () => {
  it('fits a four-stage flow into the inspector width', () => {
    const layout = layoutAlluvial(
      flowAlluvial(basic, '30d'),
      { width: 302, scaleHeight: 168, compact: true },
      share,
    );
    expect(layout.width).toBe(302);
    const right = Math.max(...layout.nodes.map((node) => node.x + NODE_WIDTH));
    expect(right).toBeLessThan(302);
  });

  it('keeps every node at least 2px tall and inside the chart', () => {
    const layout = layoutAlluvial(
      flowAlluvial(receipt, '30d'),
      { width: 302, scaleHeight: 168, compact: true },
      share,
    );
    for (const node of layout.nodes) {
      expect(node.height).toBeGreaterThanOrEqual(2);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('keeps at least 16px between nodes in a column', () => {
    const layout = layoutAlluvial(
      flowAlluvial(receipt, '30d'),
      { width: 800, scaleHeight: 360, compact: false },
      share,
    );
    const columns = new Map<number, typeof layout.nodes>();
    for (const node of layout.nodes) {
      columns.set(node.stage, [...(columns.get(node.stage) ?? []), node]);
    }
    for (const column of columns.values()) {
      const sorted = [...column].sort((a, b) => a.y - b.y);
      for (let index = 1; index < sorted.length; index += 1) {
        const above = sorted[index - 1]!;
        expect(sorted[index]!.y - (above.y + above.height)).toBeGreaterThanOrEqual(
          16,
        );
      }
    }
  });

  it('puts first-stage labels left of their nodes only outside compact mode', () => {
    const data = flowAlluvial(basic, '30d');
    const wide = layoutAlluvial(
      data,
      { width: 800, scaleHeight: 360, compact: false },
      share,
    );
    const compact = layoutAlluvial(
      data,
      { width: 302, scaleHeight: 168, compact: true },
      share,
    );
    const first = (layout: typeof wide) =>
      layout.nodes.find((node) => node.stage === 0)!;
    expect(first(wide).labelAlign).toBe('right');
    expect(first(compact).labelAlign).toBe('left');
    expect(
      wide.nodes
        .filter((node) => node.stage > 0)
        .every((node) => node.labelAlign === 'left'),
    ).toBe(true);
  });

  it('scrolls flows with more stages than the panel fits', () => {
    const layout = layoutAlluvial(
      flowAlluvial(receipt, '30d'),
      { width: 302, scaleHeight: 168, compact: true },
      share,
    );
    expect(layout.width).toBeGreaterThan(302);
  });
});
