import type { ElkEdgeSection, ElkNode } from 'elkjs/lib/elk-api';
import { nextStepIds } from './flows';
import type { FlowStep, PaymentFlow } from '../types/flow';

/**
 * Lays out a flow as a left-to-right flowchart. Positions come from fixed
 * geometry rather than measured from the DOM, which keeps the layout
 * deterministic and testable.
 */

export interface MapGeometry {
  nodeWidth: number;
  nodeHeight: number;
  gapX: number;
  gapY: number;
  /** Corner radius where an edge changes direction. */
  cornerRadius: number;
}

export const regularGeometry: MapGeometry = {
  nodeWidth: 140,
  nodeHeight: 44,
  gapX: 64,
  gapY: 44,
  cornerRadius: 8,
};

/** More breathing room for the chart that shows every feature option. */
export const journeyGeometry: MapGeometry = {
  nodeWidth: 148,
  nodeHeight: 48,
  gapX: 96,
  gapY: 72,
  cornerRadius: 10,
};

export const compactGeometry: MapGeometry = {
  nodeWidth: 104,
  nodeHeight: 36,
  gapX: 42,
  gapY: 18,
  cornerRadius: 6,
};

export interface MapNode {
  step: FlowStep;
  /** Column, counted as the longest path from the first step. */
  depth: number;
  /** Row within the column. */
  row: number;
  x: number;
  y: number;
  /** True for the first step and for any step with nothing after it. */
  isTerminal: boolean;
}

export interface MapEdge {
  from: string;
  to: string;
  /** Branch label, absent for a single next step. */
  label?: string;
  share?: number;
  /** Only one edge in a bundled convergence draws the final arrowhead. */
  showArrow?: boolean;
  /** SVG path from the right edge of one node to the left edge of the next. */
  path: string;
  labelX: number;
  labelY: number;
}

export interface FlowMapLayout {
  nodes: MapNode[];
  edges: MapEdge[];
  width: number;
  height: number;
  geometry: MapGeometry;
}

interface MapTarget {
  id: string;
  label?: string;
  share?: number;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  share?: number;
}

interface RoutedMapEdge extends MapEdge {
  graphId: string;
  points: ElkEdgeSection['startPoint'][];
}

/**
 * Longest distance from the first step to every other step. Using the longest
 * path keeps a step that is also reachable by a shortcut from sitting to the
 * left of the branch that leads into it.
 */
export function stepDepths(flow: PaymentFlow): Map<string, number> {
  const depths = new Map<string, number>();
  const first = flow.steps[0];
  if (!first) return depths;
  depths.set(first.id, 0);

  // Relaxation over all steps, capped by the step count so a cycle in the data
  // cannot loop forever.
  for (let pass = 0; pass < flow.steps.length; pass += 1) {
    let changed = false;
    for (const step of flow.steps) {
      const depth = depths.get(step.id);
      if (depth === undefined) continue;
      for (const targetId of nextStepIds(step)) {
        if ((depths.get(targetId) ?? -1) < depth + 1) {
          depths.set(targetId, depth + 1);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Anything unreachable still needs a home: park it in a final column.
  const maxDepth = Math.max(0, ...depths.values());
  for (const step of flow.steps) {
    if (!depths.has(step.id)) depths.set(step.id, maxDepth + 1);
  }

  return depths;
}

function targetsFor(step: FlowStep): MapTarget[] {
  const branches = step.branches ?? [];
  return branches.length
    ? branches.map((branch) => ({
        id: branch.targetStepId,
        label: branch.label,
        share: branch.share,
      }))
    : step.nextStepId
      ? [{ id: step.nextStepId, label: undefined, share: undefined }]
      : [];
}

function graphEdges(flow: PaymentFlow): GraphEdge[] {
  return flow.steps.flatMap((step) =>
    targetsFor(step).map((target, index) => ({
      id: `edge:${step.id}:${target.id}:${index}`,
      from: step.id,
      to: target.id,
      label: target.label,
      share: target.share,
    })),
  );
}

/**
 * Assigns vertical lanes to the graph. Single paths stay on their current
 * lane, while branch targets fan out around their source. This keeps a
 * long-running branch from being drawn through a node on the other branch
 * before the paths rejoin.
 */
function stepRows(
  flow: PaymentFlow,
  depths: Map<string, number>,
): Map<string, number> {
  const columns = new Map<number, FlowStep[]>();
  for (const step of flow.steps) {
    const depth = depths.get(step.id) ?? 0;
    const column = columns.get(depth) ?? [];
    column.push(step);
    columns.set(depth, column);
  }

  const rows = new Map<string, number>();
  const proposals = new Map<string, number[]>();
  const maxDepth = Math.max(0, ...depths.values());
  const branchSpread = flow.steps.some((step) => step.chartOnly) ? 2 : 1;
  const first = flow.steps[0];
  if (first) rows.set(first.id, 0);

  const addProposal = (targetId: string, row: number): void => {
    const targetProposals = proposals.get(targetId) ?? [];
    targetProposals.push(row);
    proposals.set(targetId, targetProposals);
  };

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    for (const step of columns.get(depth) ?? []) {
      const incoming = proposals.get(step.id) ?? [];
      const row =
        rows.get(step.id) ??
        (incoming.length
          ? incoming.reduce((total, value) => total + value, 0) / incoming.length
          : 0);
      rows.set(step.id, row);

      const targets = targetsFor(step);
      if (step.branches?.length) {
        const center = (targets.length - 1) / 2;
        targets.forEach((target, index) => {
          addProposal(target.id, row + (index - center) * branchSpread);
        });
      } else {
        for (const target of targets) addProposal(target.id, row);
      }
    }
  }

  // Two unrelated nodes can still land on the same lane in one column.
  // Separate them after the branch lanes have been assigned.
  for (const column of columns.values()) {
    let previous = -Infinity;
    const ordered = [...column].sort(
      (a, b) => (rows.get(a.id) ?? 0) - (rows.get(b.id) ?? 0),
    );
    for (const step of ordered) {
      const row = Math.max(rows.get(step.id) ?? 0, previous + 1);
      rows.set(step.id, row);
      previous = row;
    }
  }

  return rows;
}

/** A flowchart connector: out, across, in, with rounded corners. */
function elbowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cornerRadius: number,
): string {
  if (Math.abs(y1 - y2) < 0.5) {
    return `M ${x1} ${y1} L ${x2} ${y1}`;
  }

  const midX = (x1 + x2) / 2;
  const direction = y2 > y1 ? 1 : -1;
  const radius = Math.min(
    cornerRadius,
    Math.abs(y2 - y1) / 2,
    Math.abs(midX - x1),
  );

  return [
    `M ${x1} ${y1}`,
    `L ${midX - radius} ${y1}`,
    `Q ${midX} ${y1} ${midX} ${y1 + radius * direction}`,
    `L ${midX} ${y2 - radius * direction}`,
    `Q ${midX} ${y2} ${midX + radius} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(' ');
}

function sectionPoints(
  sections: ElkEdgeSection[] | undefined,
): ElkEdgeSection['startPoint'][] {
  const rawPoints = (sections ?? []).flatMap((section, sectionIndex) => {
    const sectionPoints = [
      section.startPoint,
      ...(section.bendPoints ?? []),
      section.endPoint,
    ];
    return sectionIndex === 0 ? sectionPoints : sectionPoints.slice(1);
  });

  const points = rawPoints.filter(
    (point, index) =>
      index === 0 ||
      point.x !== rawPoints[index - 1]!.x ||
      point.y !== rawPoints[index - 1]!.y,
  );

  return points;
}

function roundedPath(
  points: ElkEdgeSection['startPoint'][],
  radius: number,
): string {
  if (points.length < 2) return '';

  let path = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const next = points[index + 1]!;
    const incomingX = current.x - previous.x;
    const incomingY = current.y - previous.y;
    const outgoingX = next.x - current.x;
    const outgoingY = next.y - current.y;
    const incomingLength = Math.hypot(incomingX, incomingY);
    const outgoingLength = Math.hypot(outgoingX, outgoingY);
    const isCorner =
      incomingLength > 0 &&
      outgoingLength > 0 &&
      Math.abs(incomingX * outgoingY - incomingY * outgoingX) > 0.01;

    if (!isCorner) {
      path += ` L ${current.x} ${current.y}`;
      continue;
    }

    const cornerRadius = Math.min(
      radius,
      incomingLength / 2,
      outgoingLength / 2,
    );
    const beforeX = current.x - (incomingX / incomingLength) * cornerRadius;
    const beforeY = current.y - (incomingY / incomingLength) * cornerRadius;
    const afterX = current.x + (outgoingX / outgoingLength) * cornerRadius;
    const afterY = current.y + (outgoingY / outgoingLength) * cornerRadius;

    path += ` L ${beforeX} ${beforeY}`;
    path += ` Q ${current.x} ${current.y} ${afterX} ${afterY}`;
  }

  const last = points[points.length - 1]!;
  return `${path} L ${last.x} ${last.y}`;
}

function appendPoint(
  points: ElkEdgeSection['startPoint'][],
  point: ElkEdgeSection['startPoint'],
): void {
  const previous = points[points.length - 1];
  if (!previous || previous.x !== point.x || previous.y !== point.y) {
    points.push(point);
  }
}

function trimRouteAtX(
  points: ElkEdgeSection['startPoint'][],
  x: number,
): ElkEdgeSection['startPoint'][] {
  if (points.length < 2) return points.slice();
  const trimmed = [points[0]!];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;

    if (current.x < x) {
      appendPoint(trimmed, current);
      continue;
    }

    if (previous.x <= x && current.x !== previous.x) {
      const progress = (x - previous.x) / (current.x - previous.x);
      appendPoint(trimmed, {
        x,
        y: previous.y + (current.y - previous.y) * progress,
      });
    } else if (previous.x <= x && current.x === x) {
      appendPoint(trimmed, current);
    } else if (previous.x < x && current.x < x) {
      appendPoint(trimmed, current);
    } else if (trimmed.length === 1) {
      appendPoint(trimmed, { x, y: previous.y });
    }
    return trimmed;
  }

  const last = trimmed[trimmed.length - 1]!;
  appendPoint(trimmed, { x, y: last.y });
  return trimmed;
}

/**
 * Bundles edges that share a destination. Each source keeps its own route up
 * to a shared vertical merge spine, while one route carries the spine and
 * final horizontal segment into the destination.
 */
function bundleConvergingEdges(
  edges: RoutedMapEdge[],
  nodes: MapNode[],
  geometry: MapGeometry,
): void {
  const nodesById = new Map(nodes.map((node) => [node.step.id, node]));
  const byTarget = new Map<string, RoutedMapEdge[]>();
  for (const edge of edges) {
    const targetEdges = byTarget.get(edge.to) ?? [];
    targetEdges.push(edge);
    byTarget.set(edge.to, targetEdges);
  }

  for (const [targetId, targetEdges] of byTarget) {
    if (targetEdges.length < 2) continue;
    const target = nodesById.get(targetId);
    if (!target) continue;

    const mergeX =
      target.x -
      Math.max(16, Math.min(geometry.gapX * 0.5, geometry.gapX - 16));
    const mergeY = target.y + geometry.nodeHeight / 2;
    const finalPoint = { x: target.x, y: mergeY };
    const routes = targetEdges.map((edge) => ({
      edge,
      points: trimRouteAtX(edge.points, mergeX),
    }));
    const mergeYs = routes.map(({ points }) => points[points.length - 1]!.y);
    const spineTop = Math.min(mergeY, ...mergeYs);
    const spineBottom = Math.max(mergeY, ...mergeYs);
    const primary = routes.reduce((best, candidate) =>
      Math.abs(candidate.points[candidate.points.length - 1]!.y - spineTop) <
      Math.abs(best.points[best.points.length - 1]!.y - spineTop)
        ? candidate
        : best,
    ).edge;

    for (const { edge, points } of routes) {
      edge.points = points;
      edge.path = roundedPath(points, geometry.cornerRadius);
      edge.showArrow = false;
    }

    const bundledRoute = [...primary.points];
    appendPoint(bundledRoute, { x: mergeX, y: spineTop });
    appendPoint(bundledRoute, { x: mergeX, y: spineBottom });
    appendPoint(bundledRoute, finalPoint);
    primary.points = bundledRoute;
    const spineRoute = bundledRoute.slice(0, -1);
    primary.path = `${roundedPath(spineRoute, geometry.cornerRadius)} M ${
      mergeX
    } ${mergeY} L ${finalPoint.x} ${finalPoint.y}`;
    primary.showArrow = true;
  }
}

function asNumber(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Uses ELK's layered layout for the full journey. The graph is kept flat and
 * left-to-right so the existing renderer can continue to draw the nodes and
 * edge labels while ELK handles branch spacing, merges, and crossings.
 */
export async function buildElkFlowMap(
  flow: PaymentFlow,
  geometry: MapGeometry = regularGeometry,
): Promise<FlowMapLayout> {
  const edges = graphEdges(flow);
  const elkGraph: ElkNode = {
    id: 'flow',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.padding': '24',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(geometry.gapX),
      'elk.spacing.nodeNode': String(geometry.gapY),
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: flow.steps.map((step) => ({
      id: step.id,
      width: geometry.nodeWidth,
      height: geometry.nodeHeight,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.from],
      targets: [edge.to],
      ...(edge.label
        ? {
            labels: [
              {
                id: `${edge.id}:label`,
                text: edge.label,
                width: Math.max(36, edge.label.length * 6),
                height: 14,
              },
            ],
          }
        : {}),
    })),
  };

  const { default: Elk } = await import('elkjs/lib/elk.bundled.js');
  const laidOut = await new Elk().layout(elkGraph);
  const children = laidOut.children ?? [];
  const childrenById = new Map(children.map((child) => [child.id, child]));
  const depths = stepDepths(flow);
  const rowPitch = geometry.nodeHeight + geometry.gapY;

  const nodes: MapNode[] = flow.steps.map((step) => {
    const child = childrenById.get(step.id);
    const x = asNumber(child?.x);
    const y = asNumber(child?.y);
    return {
      step,
      depth: depths.get(step.id) ?? 0,
      row: y / rowPitch,
      x,
      y,
      isTerminal: depths.get(step.id) === 0 || nextStepIds(step).length === 0,
    };
  });

  const laidOutEdges = new Map(
    (laidOut.edges ?? []).map((edge) => [edge.id, edge]),
  );
  const edgesById = new Map(edges.map((edge) => [edge.id, edge]));
  const mapEdges: RoutedMapEdge[] = edges.flatMap((edge) => {
    const source = edgesById.get(edge.id);
    const laidOutEdge = laidOutEdges.get(edge.id);
    const points = sectionPoints(laidOutEdge?.sections);
    const path = roundedPath(points, geometry.cornerRadius);
    if (!source || !path) return [];

    const label = laidOutEdge?.labels?.[0];
    return [
      {
        graphId: edge.id,
        from: source.from,
        to: source.to,
        label: source.label,
        share: source.share,
        points,
        path,
        labelX: asNumber(label?.x) + asNumber(label?.width) / 2,
        labelY: asNumber(label?.y) + asNumber(label?.height) / 2,
      },
    ];
  });
  bundleConvergingEdges(mapEdges, nodes, geometry);

  return {
    nodes,
    edges: mapEdges,
    width: Math.max(1, asNumber(laidOut.width)),
    height: Math.max(1, asNumber(laidOut.height)),
    geometry,
  };
}

export function buildFlowMap(
  flow: PaymentFlow,
  geometry: MapGeometry = regularGeometry,
): FlowMapLayout {
  const depths = stepDepths(flow);
  const columns = new Map<number, FlowStep[]>();

  for (const step of flow.steps) {
    const depth = depths.get(step.id) ?? 0;
    const column = columns.get(depth) ?? [];
    column.push(step);
    columns.set(depth, column);
  }

  const rows = stepRows(flow, depths);
  const rowPitch = geometry.nodeHeight + geometry.gapY;
  const columnPitch = geometry.nodeWidth + geometry.gapX;
  const minRow = Math.min(...rows.values(), 0);
  const maxRow = Math.max(...rows.values(), 0);

  const nodes: MapNode[] = [];
  for (const [depth, column] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    column.forEach((step) => {
      const row = rows.get(step.id) ?? 0;
      nodes.push({
        step,
        depth,
        row,
        x: depth * columnPitch,
        y: (row - minRow) * rowPitch,
        isTerminal: depth === 0 || nextStepIds(step).length === 0,
      });
    });
  }

  const byId = new Map(nodes.map((node) => [node.step.id, node]));
  const edges: MapEdge[] = [];

  for (const node of nodes) {
    const targets = targetsFor(node.step);

    for (const target of targets) {
      const to = byId.get(target.id);
      if (!to) continue;

      const x1 = node.x + geometry.nodeWidth;
      const y1 = node.y + geometry.nodeHeight / 2;
      const x2 = to.x;
      const y2 = to.y + geometry.nodeHeight / 2;

      edges.push({
        from: node.step.id,
        to: target.id,
        label: target.label,
        share: target.share,
        path: elbowPath(x1, y1, x2, y2, geometry.cornerRadius),
        // Sits above the outgoing segment, next to the step it belongs to.
        labelX: x1 + (x2 - x1) / 4,
        labelY: y1 + (y2 - y1) / 2 - 7,
      });
    }
  }

  const width =
    (Math.max(0, ...nodes.map((node) => node.depth)) + 1) * columnPitch -
    geometry.gapX;
  const height = Math.max(1, maxRow - minRow + 1) * rowPitch - geometry.gapY;

  return { nodes, edges, width, height, geometry };
}
