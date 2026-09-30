import { timeRanges } from '../data/catalog';
import { mostLikelyNextStepId } from './flows';
import type {
  FlowStep,
  PaymentFlow,
  ScreenErrorCount,
  ScreenMetrics,
  TimeRangeId,
} from '../types/flow';

/**
 * Metrics in this prototype are derived from the 30-day baseline numbers in
 * the flow data. Shorter ranges scale the volume down and nudge the rates by a
 * small, stable amount so the time period selector visibly does something.
 * None of these numbers come from real reporting.
 */

function volumeShare(rangeId: TimeRangeId): number {
  return timeRanges.find((range) => range.id === rangeId)?.volumeShare ?? 1;
}

/** Stable pseudo-random value in -spread..spread, derived from a seed string. */
function jitter(seed: string, spread: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
  }
  return ((hash % 1000) / 1000) * spread * 2 - spread;
}

export function screenMetrics(
  step: FlowStep,
  rangeId: TimeRangeId,
): ScreenMetrics {
  const share = volumeShare(rangeId);
  const impressions = Math.max(1, Math.round(step.metrics.impressions30d * share));
  const dropOffRate =
    rangeId === '30d'
      ? step.metrics.dropOffRate
      : clampRate(step.metrics.dropOffRate * (1 + jitter(`${step.id}-${rangeId}`, 0.18)));
  const avgDurationSeconds =
    rangeId === '30d'
      ? step.metrics.avgDurationSeconds
      : round1(
          step.metrics.avgDurationSeconds *
            (1 + jitter(`${step.id}-dur-${rangeId}`, 0.12)),
        );

  const errors: ScreenErrorCount[] = step.metrics.errors.map((error) => ({
    code: error.code,
    label: error.label,
    rate: error.rate,
    count: Math.round(impressions * error.rate),
  }));

  return { impressions, dropOffRate, avgDurationSeconds, errors };
}

export function flowMetrics(
  flow: PaymentFlow,
  rangeId: TimeRangeId,
): ScreenMetrics {
  const perStep = flow.steps.map((step) => screenMetrics(step, rangeId));
  const entryImpressions = perStep[0]?.impressions ?? 0;

  let abandons = 0;
  let weightedDuration = 0;
  const errorTotals = new Map<string, ScreenErrorCount>();

  perStep.forEach((metrics) => {
    abandons += metrics.impressions * metrics.dropOffRate;
    if (entryImpressions > 0) {
      weightedDuration +=
        (metrics.impressions / entryImpressions) * metrics.avgDurationSeconds;
    }
    metrics.errors.forEach((error) => {
      const existing = errorTotals.get(error.code);
      if (existing) {
        existing.count += error.count;
      } else {
        errorTotals.set(error.code, { ...error });
      }
    });
  });

  return {
    impressions: entryImpressions,
    dropOffRate:
      entryImpressions > 0 ? clampRate(abandons / entryImpressions) : 0,
    avgDurationSeconds: round1(weightedDuration),
    errors: [...errorTotals.values()].sort((a, b) => b.count - a.count),
  };
}

export interface FunnelRow {
  stepId: string;
  title: string;
  count: number;
  /** Share of shoppers who started the flow and reached this screen, 0 to 1. */
  shareOfStart: number;
}

/**
 * The share of shoppers who reach each screen along the most likely path,
 * starting at the flow's first screen. Used by the whole-flow metrics panel.
 */
export function flowFunnel(
  flow: PaymentFlow,
  rangeId: TimeRangeId,
): FunnelRow[] {
  const first = flow.steps[0];
  if (!first) return [];

  const startCount = screenMetrics(first, rangeId).impressions;
  const rows: FunnelRow[] = [];
  const seen = new Set<string>();
  let current: FlowStep | undefined = first;

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const { impressions } = screenMetrics(current, rangeId);
    rows.push({
      stepId: current.id,
      title: current.title,
      count: impressions,
      shareOfStart:
        startCount > 0 ? Math.min(1, impressions / startCount) : 0,
    });
    const nextId = mostLikelyNextStepId(current);
    current = nextId ? flow.steps.find((step) => step.id === nextId) : undefined;
  }

  return rows;
}

function clampRate(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${round1(value / 1_000_000)}M`;
  if (value >= 1_000) return `${round1(value / 1_000)}k`;
  return `${value}`;
}

export function formatRate(value: number): string {
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
}

export function formatSeconds(value: number): string {
  return `${round1(value)}s`;
}
