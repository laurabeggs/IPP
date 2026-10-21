import { flowFunnel } from './metrics';
import type { PaymentFlow, TimeRangeId } from '../types/flow';

/**
 * The alluvial view of a flow: every screen on the most likely path is a
 * stage, shoppers who take another branch end in that branch's screen, and
 * shoppers who leave without finishing are gathered in one "Dropped off" node
 * at the end of the chart.
 */

export type AlluvialNodeKind = 'step' | 'branch' | 'dropped';

export interface AlluvialNode {
  id: string;
  label: string;
  value: number;
  /** Column, 0 for the flow's first screen. */
  stage: number;
  kind: AlluvialNodeKind;
  /** A screen where the payment ends badly, told like a drop-off. */
  negative?: boolean;
}

export interface AlluvialLink {
  id: string;
  source: string;
  target: string;
  value: number;
  kind: AlluvialNodeKind;
  /** Leads into a negative outcome. */
  negative?: boolean;
}

export interface AlluvialData {
  nodes: AlluvialNode[];
  links: AlluvialLink[];
  /** Shoppers who saw the first screen; shares are relative to this. */
  total: number;
  stages: number;
}

export const DROPPED_NODE_ID = 'dropped';

export function flowAlluvial(
  flow: PaymentFlow,
  rangeId: TimeRangeId,
): AlluvialData {
  const funnel = flowFunnel(flow, rangeId);
  const nodes: AlluvialNode[] = [];
  const links: AlluvialLink[] = [];
  const total = funnel[0]?.count ?? 0;
  const lastStage = Math.max(0, funnel.length - 1);
  const dropped: AlluvialLink[] = [];

  const isNegative = (stepId: string) =>
    flow.steps.find((item) => item.id === stepId)?.outcome === 'negative';

  funnel.forEach((row, index) => {
    nodes.push({
      id: `step:${row.stepId}`,
      label: row.title,
      value: row.count,
      stage: index,
      kind: 'step',
      negative: isNegative(row.stepId),
    });
  });

  funnel.forEach((row, index) => {
    const next = funnel[index + 1];
    if (!next) return;
    const step = flow.steps.find((item) => item.id === row.stepId);
    const source = `step:${row.stepId}`;
    let leaving = row.count - next.count;

    links.push({
      id: `${source}>step:${next.stepId}`,
      source,
      target: `step:${next.stepId}`,
      value: next.count,
      kind: 'step',
      negative: isNegative(next.stepId),
    });

    for (const branch of step?.branches ?? []) {
      if (branch.targetStepId === next.stepId) continue;
      const value = Math.min(leaving, Math.round(row.count * branch.share));
      if (value <= 0) continue;
      leaving -= value;
      const target = flow.steps.find((item) => item.id === branch.targetStepId);
      const id = `branch:${branch.targetStepId}`;
      nodes.push({
        id,
        label: target?.title ?? branch.label,
        value,
        stage: index + 1,
        kind: 'branch',
        negative: target?.outcome === 'negative',
      });
      links.push({
        id: `${source}>${id}`,
        source,
        target: id,
        value,
        kind: 'branch',
        negative: target?.outcome === 'negative',
      });
    }

    if (leaving > 0) {
      dropped.push({
        id: `${source}>${DROPPED_NODE_ID}`,
        source,
        target: DROPPED_NODE_ID,
        value: leaving,
        kind: 'dropped',
      });
    }
  });

  const droppedTotal = dropped.reduce((sum, link) => sum + link.value, 0);
  if (droppedTotal > 0) {
    nodes.push({
      id: DROPPED_NODE_ID,
      label: 'Dropped off',
      value: droppedTotal,
      stage: lastStage,
      kind: 'dropped',
    });
    links.push(...dropped);
  }

  return { nodes, links, total, stages: funnel.length };
}

/* ------------------------------------------------------------------------ */
/* Layout                                                                   */
/* ------------------------------------------------------------------------ */

/** Lume: 16px node thickness, 8px between a node and its label. */
export const NODE_WIDTH = 16;
export const LABEL_GAP = 8;
/** Lume: 16px between nodes, unless their labels need more room. */
const NODE_GAP = 16;
/** Lume: at least 8px between the labels of neighbouring nodes. */
const LABEL_SPACING = 8;
/** Lume: a node is never thinner than 2px, however small its value. */
const MIN_NODE_HEIGHT = 2;
const LINE_HEIGHT = 16;
/**
 * Narrowest column step that still fits a one-word label such as
 * "Processing" between two nodes. Flows with more stages than fit scroll.
 * Compact charts hyphenate long words, so their columns can be narrower.
 */
const MIN_COLUMN_STEP = 88;
const MIN_COMPACT_COLUMN_STEP = 68;
/** Labels wrap to at most this many lines before they are cut short. */
const MAX_LABEL_LINES = 3;

export interface AlluvialLayoutOptions {
  /** Width available for the chart. Compact charts grow past it, and scroll. */
  width: number;
  /** Height that the flow's full volume spans. */
  scaleHeight: number;
  /**
   * Compact charts put every label to the right of its node, which frees the
   * left gutter in narrow panels. Lume allows this alongside the default.
   */
  compact: boolean;
}

export interface PositionedNode extends AlluvialNode {
  x: number;
  y: number;
  height: number;
  label: string;
  labelAlign: 'left' | 'right';
  /** Left edge of a right-aligned label's anchor, or of a left label's box. */
  labelX: number;
  labelWidth: number;
  labelCenterY: number;
}

export interface PositionedLink extends AlluvialLink {
  path: string;
  x0: number;
  x1: number;
  width: number;
}

export interface AlluvialLayout {
  width: number;
  height: number;
  nodes: PositionedNode[];
  links: PositionedLink[];
}

/** A rough measure of 12px text, good enough to size gutters and wrapping. */
export function estimateTextWidth(text: string): number {
  return Math.ceil(text.length * 6.6);
}

function labelLines(text: string, width: number): number {
  return Math.min(
    MAX_LABEL_LINES,
    Math.max(1, Math.ceil(estimateTextWidth(text) / Math.max(1, width))),
  );
}

/** Width of the longest word, which a wrapped label cannot go below. */
function longestWordWidth(text: string): number {
  return Math.max(...text.split(/\s+/).map(estimateTextWidth));
}

const kindOrder: Record<AlluvialNodeKind, number> = {
  step: 0,
  branch: 1,
  dropped: 2,
};

export function layoutAlluvial(
  data: AlluvialData,
  options: AlluvialLayoutOptions,
  valueText: (node: AlluvialNode) => string,
): AlluvialLayout {
  const { stages, total } = data;
  if (!stages || total <= 0) {
    return { width: options.width, height: 0, nodes: [], links: [] };
  }

  const lastStage = stages - 1;
  const labelWidthOf = (node: AlluvialNode) =>
    Math.max(estimateTextWidth(node.label), estimateTextWidth(valueText(node)));

  const lastColumn = data.nodes.filter((node) => node.stage === lastStage);
  /* Compact charts wrap the last column's names a word per line, so the
   * gutter only has to fit the longest word or value. */
  const rightGutter =
    LABEL_GAP +
    (options.compact
      ? Math.min(
          64,
          Math.max(
            48,
            ...lastColumn.map((node) =>
              Math.max(
                longestWordWidth(node.label),
                estimateTextWidth(valueText(node)),
              ),
            ),
          ),
        )
      : Math.min(140, Math.max(48, ...lastColumn.map(labelWidthOf))));
  const firstColumn = data.nodes.filter((node) => node.stage === 0);
  const leftGutter =
    options.compact || stages === 1
      ? 0
      : LABEL_GAP + Math.min(140, Math.max(...firstColumn.map(labelWidthOf)));

  let columnStep =
    stages > 1
      ? (options.width - leftGutter - rightGutter - NODE_WIDTH) / lastStage
      : 0;
  const minColumnStep = options.compact
    ? MIN_COMPACT_COLUMN_STEP
    : MIN_COLUMN_STEP;
  if (stages > 1 && columnStep < minColumnStep) columnStep = minColumnStep;
  const width = Math.max(
    options.width,
    leftGutter + columnStep * lastStage + NODE_WIDTH + rightGutter,
  );

  const scale = options.scaleHeight / total;
  /* The label starts 8px after its node and keeps 4px clear of the next one. */
  const middleLabelWidth = Math.max(40, columnStep - NODE_WIDTH - LABEL_GAP - 4);

  const positioned: PositionedNode[] = [];
  for (let stage = 0; stage <= lastStage; stage += 1) {
    const x = leftGutter + stage * columnStep;
    const column = data.nodes
      .filter((node) => node.stage === stage)
      .sort(
        (a, b) => kindOrder[a.kind] - kindOrder[b.kind] || b.value - a.value,
      );

    let previous: { y: number; height: number; labelHeight: number } | null =
      null;
    for (const node of column) {
      const leftLabel = stage === 0 && !options.compact && stages > 1;
      const labelWidth =
        stage === lastStage
          ? rightGutter - LABEL_GAP
          : leftLabel
            ? leftGutter - LABEL_GAP
            : middleLabelWidth;
      const labelHeight =
        (labelLines(node.label, labelWidth) + 1) * LINE_HEIGHT;
      const height = Math.max(MIN_NODE_HEIGHT, node.value * scale);

      let y = 0;
      if (previous) {
        const belowNode = previous.y + previous.height + NODE_GAP;
        const clearOfLabel =
          previous.y +
          previous.height / 2 +
          (previous.labelHeight + labelHeight) / 2 +
          LABEL_SPACING -
          height / 2;
        y = Math.max(belowNode, clearOfLabel);
      }
      previous = { y, height, labelHeight };

      positioned.push({
        ...node,
        x,
        y,
        height,
        labelAlign: leftLabel ? 'right' : 'left',
        labelX: leftLabel ? x - LABEL_GAP : x + NODE_WIDTH + LABEL_GAP,
        labelWidth,
        labelCenterY: y + height / 2,
      });
    }
  }

  // Labels of small nodes near the top can rise above the first node, so the
  // whole chart shifts down until every label is inside it.
  const labelHalf = (node: PositionedNode) =>
    ((labelLines(node.label, node.labelWidth) + 1) * LINE_HEIGHT) / 2;
  const top = Math.min(
    0,
    ...positioned.map((node) => node.labelCenterY - labelHalf(node)),
  );
  const bottom = Math.max(
    ...positioned.map((node) =>
      Math.max(node.y + node.height, node.labelCenterY + labelHalf(node)),
    ),
  );
  for (const node of positioned) {
    node.y -= top;
    node.labelCenterY -= top;
  }

  const byId = new Map(positioned.map((node) => [node.id, node]));
  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  const sorted = [...data.links].sort((a, b) => {
    const ta = byId.get(a.target)!;
    const tb = byId.get(b.target)!;
    const sa = byId.get(a.source)!;
    const sb = byId.get(b.source)!;
    return ta.y - tb.y || sa.stage - sb.stage || sa.y - sb.y;
  });

  const links: PositionedLink[] = [];
  for (const link of sorted) {
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    if (!source || !target) continue;
    const linkWidth = Math.max(1, link.value * scale);
    const sourceOffset = outgoing.get(source.id) ?? 0;
    const targetOffset = incoming.get(target.id) ?? 0;
    outgoing.set(source.id, sourceOffset + linkWidth);
    incoming.set(target.id, targetOffset + linkWidth);

    const x0 = source.x + NODE_WIDTH;
    const x1 = target.x;
    const sy = source.y + sourceOffset;
    const ty = target.y + targetOffset;
    const xm = (x0 + x1) / 2;
    const path =
      `M${x0},${sy} C${xm},${sy} ${xm},${ty} ${x1},${ty} ` +
      `L${x1},${ty + linkWidth} ` +
      `C${xm},${ty + linkWidth} ${xm},${sy + linkWidth} ${x0},${sy + linkWidth} Z`;
    links.push({ ...link, path, x0, x1, width: linkWidth });
  }

  return {
    width,
    height: Math.ceil(bottom - top),
    nodes: positioned,
    links,
  };
}
