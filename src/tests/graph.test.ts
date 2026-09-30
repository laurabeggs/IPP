import { describe, expect, it } from 'vitest';
import { flows } from '../data/flows';
import { resolveFlow, resolveFullJourney } from '../lib/features';
import {
  buildElkFlowMap,
  buildFlowMap,
  journeyGeometry,
  regularGeometry,
  stepDepths,
} from '../lib/graph';
import { nextStepIds } from '../lib/flows';

const basic = flows.find((flow) => flow.id === 'basic-card-payment')!;

describe('flow chart layout', () => {
  it('uses generous vertical spacing for the master flow', () => {
    expect(regularGeometry.gapY).toBeGreaterThan(regularGeometry.nodeHeight / 2);
  });

  it('puts the steps in columns from left to right', () => {
    const depths = stepDepths(basic);
    expect(depths.get('see-amount')).toBe(0);
    expect(depths.get('present-card')).toBe(1);
    expect(depths.get('processing')).toBe(2);
  });

  it('gives every step in every flow a position, left to right', () => {
    for (const flow of flows) {
      const depths = stepDepths(flow);
      for (const step of flow.steps) {
        expect(depths.get(step.id), `${flow.id}/${step.id}`).toBeDefined();
        for (const targetId of nextStepIds(step)) {
          expect(
            depths.get(targetId)!,
            `${flow.id}: ${step.id} -> ${targetId}`,
          ).toBeGreaterThan(depths.get(step.id)!);
        }
      }
    }
  });

  it('draws an edge for every single next step and every branch', () => {
    const layout = buildFlowMap(basic);
    const expectedEdges = basic.steps.reduce(
      (total, step) => total + nextStepIds(step).length,
      0,
    );
    expect(layout.edges).toHaveLength(expectedEdges);
    expect(layout.nodes).toHaveLength(basic.steps.length);
  });

  it('lays out a flow with feature screens spliced in', () => {
    const resolved = resolveFlow(basic, { tipping: 'percentages' });
    const layout = buildFlowMap(resolved);
    expect(layout.nodes.map((node) => node.step.id).sort()).toEqual(
      [
        'see-amount',
        'present-card',
        'processing',
        'success',
        'declined',
        'choose-tip',
        'tip-total',
      ].sort(),
    );
    const expectedEdges = resolved.steps.reduce(
      (total, step) => total + nextStepIds(step).length,
      0,
    );
    expect(layout.edges).toHaveLength(expectedEdges);
  });

  it('labels branch edges with their share', () => {
    const layout = buildFlowMap(basic);
    const branchEdges = layout.edges.filter((edge) => edge.label);
    expect(branchEdges.map((edge) => edge.label)).toContain('Approved');
    for (const edge of branchEdges) {
      expect(edge.share).toBeGreaterThan(0);
      expect(edge.path.startsWith('M ')).toBe(true);
    }
  });

  it('gives optional feature branches separate lanes before they rejoin', () => {
    const resolved = resolveFlow(basic, {
      tipping: 'percentages',
      giving: 'round-up',
    });
    const layout = buildFlowMap(resolved);
    const byId = new Map(layout.nodes.map((node) => [node.step.id, node]));
    const givingChoice = byId.get('giving-choice')!;
    const givingTargets = ['giving-thanks', 'choose-tip'].map(
      (stepId) => byId.get(stepId)!.y,
    );
    const givingEdges = layout.edges.filter((edge) => edge.from === givingChoice.step.id);

    expect(new Set(givingTargets).size).toBe(2);
    expect(new Set(givingEdges.map((edge) => edge.labelY)).size).toBe(2);
  });

  it('gives the full journey enough space for parallel feature options', () => {
    const layout = buildFlowMap(resolveFullJourney(basic), journeyGeometry);
    const choiceNodes = layout.nodes.filter((node) =>
      node.step.id.includes('feature-option:installments:'),
    );
    const rows = choiceNodes
      .filter((node) => node.step.id.endsWith('installments-choice'))
      .map((node) => node.y)
      .sort((a, b) => a - b);

    expect(rows).toHaveLength(3);
    expect(rows[1]! - rows[0]!).toBeGreaterThanOrEqual(
      journeyGeometry.nodeHeight + journeyGeometry.gapY,
    );
    expect(rows[2]! - rows[1]!).toBeGreaterThanOrEqual(
      journeyGeometry.nodeHeight + journeyGeometry.gapY,
    );
    expect(layout.height).toBeGreaterThan(600);
  });

  it('lays out the full journey with ELK-routed edges', async () => {
    const layout = await buildElkFlowMap(
      resolveFullJourney(basic),
      journeyGeometry,
    );
    const expectedEdges = layout.nodes.reduce(
      (total, node) => total + nextStepIds(node.step).length,
      0,
    );

    expect(layout.nodes).toHaveLength(resolveFullJourney(basic).steps.length);
    expect(layout.edges).toHaveLength(expectedEdges);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.edges.every((edge) => edge.path.startsWith('M '))).toBe(true);
    expect(layout.edges.some((edge) => edge.path.includes('Q '))).toBe(true);
  });

  it('bundles multiple incoming edges into one final arrow', async () => {
    const layout = await buildElkFlowMap(
      resolveFullJourney(basic),
      journeyGeometry,
    );
    const incoming = layout.edges.filter((edge) => edge.to === 'present-card');

    expect(incoming.length).toBeGreaterThan(1);
    expect(incoming.filter((edge) => edge.showArrow !== false)).toHaveLength(1);
    expect(incoming.filter((edge) => edge.showArrow === false).length).toBe(
      incoming.length - 1,
    );
    expect(incoming.some((edge) => edge.path.includes(' Q '))).toBe(true);
  });

  it('draws a straight connector between steps on the same row, an elbow otherwise', () => {
    const layout = buildFlowMap(basic);
    const byY = new Map(layout.nodes.map((node) => [node.step.id, node.y]));

    for (const edge of layout.edges) {
      const sameRow = byY.get(edge.from) === byY.get(edge.to);
      // Q marks a rounded corner, so a straight run should not contain one.
      expect(edge.path.includes('Q'), `${edge.from} -> ${edge.to}`).toBe(!sameRow);
    }
  });

  it('marks the first step and every ending as a terminal', () => {
    const layout = buildFlowMap(basic);
    const terminals = layout.nodes
      .filter((node) => node.isTerminal)
      .map((node) => node.step.id)
      .sort();
    expect(terminals).toEqual(['declined', 'see-amount', 'success']);
  });

  it('never overlaps two nodes and stays inside the reported size', () => {
    for (const flow of flows) {
      const layout = buildFlowMap(flow);
      const seen = new Set<string>();
      for (const node of layout.nodes) {
        const key = `${node.x}:${node.y}`;
        expect(seen.has(key), `${flow.id}/${node.step.id} overlaps`).toBe(false);
        seen.add(key);
        expect(node.x + layout.geometry.nodeWidth).toBeLessThanOrEqual(
          layout.width,
        );
        expect(node.y + layout.geometry.nodeHeight).toBeLessThanOrEqual(
          layout.height + 0.01,
        );
      }
    }
  });

  it('scales with the geometry it is given', () => {
    const wide = buildFlowMap(basic, regularGeometry);
    const narrow = buildFlowMap(basic, {
      ...regularGeometry,
      nodeWidth: 80,
      gapX: 20,
    });
    expect(narrow.width).toBeLessThan(wide.width);
  });
});
