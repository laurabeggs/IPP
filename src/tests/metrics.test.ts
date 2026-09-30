import { describe, expect, it } from 'vitest';
import { flows } from '../data/flows';
import { allScreens } from '../lib/flows';
import { resolveFlow } from '../lib/features';
import {
  flowFunnel,
  flowMetrics,
  formatCount,
  formatRate,
  formatSeconds,
  screenMetrics,
} from '../lib/metrics';
import { answerQuestion, suggestedQuestions } from '../lib/ask';

const basic = flows.find((flow) => flow.id === 'basic-card-payment')!;
const firstStep = basic.steps[0]!;

describe('screen metrics', () => {
  it('returns the 30-day baseline unchanged', () => {
    const metrics = screenMetrics(firstStep, '30d');
    expect(metrics.impressions).toBe(firstStep.metrics.impressions30d);
    expect(metrics.dropOffRate).toBe(firstStep.metrics.dropOffRate);
    expect(metrics.avgDurationSeconds).toBe(firstStep.metrics.avgDurationSeconds);
  });

  it('scales volume down for shorter time periods', () => {
    const month = screenMetrics(firstStep, '30d').impressions;
    const fiveDays = screenMetrics(firstStep, '5d').impressions;
    const day = screenMetrics(firstStep, '24h').impressions;
    expect(fiveDays).toBeLessThan(month);
    expect(day).toBeLessThan(fiveDays);
  });

  it('is stable for the same input', () => {
    expect(screenMetrics(firstStep, '5d')).toEqual(screenMetrics(firstStep, '5d'));
  });

  it('keeps every rate between zero and one', () => {
    for (const screen of allScreens()) {
      for (const range of ['24h', '5d', '30d'] as const) {
        const metrics = screenMetrics(screen.step, range);
        expect(metrics.dropOffRate).toBeGreaterThanOrEqual(0);
        expect(metrics.dropOffRate).toBeLessThanOrEqual(1);
        expect(metrics.avgDurationSeconds).toBeGreaterThan(0);
        for (const error of metrics.errors) {
          expect(error.count).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('flow metrics', () => {
  it('reports the entry volume of the first screen', () => {
    expect(flowMetrics(basic, '30d').impressions).toBe(
      firstStep.metrics.impressions30d,
    );
  });

  it('aggregates errors across the flow, highest first', () => {
    const { errors } = flowMetrics(basic, '30d');
    expect(errors.length).toBeGreaterThan(0);
    const counts = errors.map((error) => error.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('keeps flow drop off between zero and one for every flow and period', () => {
    for (const flow of flows) {
      for (const range of ['24h', '5d', '30d'] as const) {
        const rate = flowMetrics(flow, range).dropOffRate;
        expect(rate, `${flow.id} ${range}`).toBeGreaterThanOrEqual(0);
        expect(rate, `${flow.id} ${range}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('flow funnel', () => {
  it('follows the most likely path from the first screen', () => {
    const funnel = flowFunnel(basic, '30d');
    expect(funnel.map((row) => row.title)).toEqual([
      'See amount',
      'Present card',
      'Processing',
      'Success',
    ]);
  });

  it('starts at a full share and never grows along the path', () => {
    const funnel = flowFunnel(basic, '30d');
    expect(funnel[0]?.shareOfStart).toBe(1);
    for (let index = 1; index < funnel.length; index += 1) {
      expect(funnel[index]!.shareOfStart).toBeLessThanOrEqual(
        funnel[index - 1]!.shareOfStart,
      );
    }
  });

  it('includes the screens an enabled feature adds', () => {
    const resolved = resolveFlow(basic, { tipping: 'percentages' });
    const funnel = flowFunnel(resolved, '30d');
    expect(funnel.map((row) => row.stepId)).toEqual([
      'see-amount',
      'choose-tip',
      'present-card',
      'processing',
      'success',
    ]);
  });

  it('scales the funnel counts with the time period', () => {
    const month = flowFunnel(basic, '30d')[0]?.count ?? 0;
    const day = flowFunnel(basic, '24h')[0]?.count ?? 0;
    expect(day).toBeLessThan(month);
  });
});

describe('formatting', () => {
  it('shortens large numbers', () => {
    expect(formatCount(4_820_000)).toBe('4.8M');
    expect(formatCount(281_000)).toBe('281k');
    expect(formatCount(940)).toBe('940');
  });

  it('formats rates and durations', () => {
    expect(formatRate(0.019)).toBe('1.9%');
    expect(formatRate(0.38)).toBe('38%');
    expect(formatSeconds(6.14)).toBe('6.1s');
  });
});

describe('ask answers', () => {
  it('ranks flows by drop off', () => {
    const answer = answerQuestion('Which flows have the highest drop off?', '30d');
    expect(answer.rows.length).toBeGreaterThan(flows.length - 1);
    expect(answer.headline.toLowerCase()).toContain('drop off');
  });

  it('answers error questions with codes', () => {
    const answer = answerQuestion('What are the most common errors?', '30d');
    expect(answer.rows.length).toBeGreaterThan(0);
    expect(answer.rows[0]?.detail).toBeTruthy();
  });

  it('answers device questions for a named form factor', () => {
    const answer = answerQuestion('Which screens run on the unattended device?', '30d');
    expect(answer.headline).toContain('AMS1');
  });

  it('falls back to suggestions for an unrecognised question', () => {
    const answer = answerQuestion('What is the weather like?', '30d');
    expect(answer.rows.map((row) => row.label)).toEqual(suggestedQuestions);
  });
});
