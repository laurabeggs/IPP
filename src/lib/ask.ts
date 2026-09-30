import { devices, merchants } from '../data/catalog';
import { flows } from '../data/flows';
import { allScreens } from './flows';
import {
  flowMetrics,
  formatCount,
  formatRate,
  formatSeconds,
  screenMetrics,
} from './metrics';
import type { TimeRangeId } from '../types/flow';

/**
 * A stand-in for the AI answers in the concept. Questions are matched on
 * keywords and every answer is computed from the prototype's mock data, so the
 * shape of the interaction can be reviewed before a real model is connected.
 */

export interface AnswerRow {
  label: string;
  value: string;
  detail?: string;
  /** Opens this flow (and step) in the flow view when present. */
  flowId?: string;
  stepId?: string;
}

export interface AskAnswer {
  headline: string;
  rows: AnswerRow[];
  note?: string;
}

export const suggestedQuestions = [
  'Which flows have the highest drop off?',
  'What are the most common errors?',
  'Which screens take the shoppers the longest?',
  'Which merchants run which flows?',
  'Which screens appear on the unattended device?',
];

export function answerQuestion(
  question: string,
  rangeId: TimeRangeId,
): AskAnswer {
  const text = question.toLowerCase();

  if (/drop ?off|abandon|fall out|leave/.test(text)) {
    return dropOffAnswer(rangeId);
  }
  if (/error|fail|refus|declin|problem/.test(text)) {
    return errorAnswer(rangeId);
  }
  if (/long|slow|duration|time|seconds/.test(text)) {
    return durationAnswer(rangeId);
  }
  if (/merchant|customer|account/.test(text)) {
    return merchantAnswer(rangeId);
  }
  if (/device|form factor|terminal|unattended|handheld|mobile/.test(text)) {
    return deviceAnswer(text);
  }
  return fallbackAnswer();
}

function dropOffAnswer(rangeId: TimeRangeId): AskAnswer {
  const ranked = flows
    .map((flow) => ({ flow, metrics: flowMetrics(flow, rangeId) }))
    .sort((a, b) => b.metrics.dropOffRate - a.metrics.dropOffRate);

  const worstScreen = allScreens()
    .map((screen) => ({ screen, metrics: screenMetrics(screen.step, rangeId) }))
    .sort((a, b) => b.metrics.dropOffRate - a.metrics.dropOffRate)[0];

  return {
    headline: `${ranked[0]?.flow.name} has the highest drop off.`,
    rows: [
      ...ranked.map(({ flow, metrics }) => ({
        label: flow.name,
        value: formatRate(metrics.dropOffRate),
        detail: `${formatCount(metrics.impressions)} entries`,
        flowId: flow.id,
      })),
      ...(worstScreen
        ? [
            {
              label: `Worst single screen: ${worstScreen.screen.step.title}`,
              value: formatRate(worstScreen.metrics.dropOffRate),
              detail: worstScreen.screen.flowName,
              flowId: worstScreen.screen.flowId,
              stepId: worstScreen.screen.step.id,
            },
          ]
        : []),
    ],
  };
}

function errorAnswer(rangeId: TimeRangeId): AskAnswer {
  const totals = new Map<string, { label: string; count: number }>();

  for (const screen of allScreens()) {
    for (const error of screenMetrics(screen.step, rangeId).errors) {
      const existing = totals.get(error.code);
      if (existing) {
        existing.count += error.count;
      } else {
        totals.set(error.code, { label: error.label, count: error.count });
      }
    }
  }

  const ranked = [...totals.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);

  return {
    headline: ranked.length
      ? `${ranked[0]?.[1].label} is the most frequent error.`
      : 'No errors recorded in the mock data.',
    rows: ranked.map(([code, entry]) => ({
      label: entry.label,
      value: formatCount(entry.count),
      detail: code,
    })),
  };
}

function durationAnswer(rangeId: TimeRangeId): AskAnswer {
  const ranked = allScreens()
    .map((screen) => ({ screen, metrics: screenMetrics(screen.step, rangeId) }))
    .sort((a, b) => b.metrics.avgDurationSeconds - a.metrics.avgDurationSeconds)
    .slice(0, 6);

  return {
    headline: ranked.length
      ? `${ranked[0]?.screen.step.title} keeps shoppers the longest.`
      : 'No screens to compare.',
    rows: ranked.map(({ screen, metrics }) => ({
      label: screen.step.title,
      value: formatSeconds(metrics.avgDurationSeconds),
      detail: screen.flowName,
      flowId: screen.flowId,
      stepId: screen.step.id,
    })),
  };
}

function merchantAnswer(rangeId: TimeRangeId): AskAnswer {
  return {
    headline: 'Top merchants and the flows they run most.',
    rows: merchants.map((merchant) => {
      const topFlow = flows.find((flow) => flow.id === merchant.topFlowIds[0]);
      const metrics = topFlow ? flowMetrics(topFlow, rangeId) : undefined;
      return {
        label: merchant.name,
        value: topFlow?.name ?? 'No flows mapped',
        detail: metrics
          ? `${merchant.segment} · ${formatCount(metrics.impressions)} entries`
          : merchant.segment,
        flowId: topFlow?.id,
      };
    }),
  };
}

function deviceAnswer(text: string): AskAnswer {
  const match = devices.find(
    (device) =>
      text.includes(device.formFactor) ||
      text.includes(device.id) ||
      text.includes(device.name.toLowerCase()),
  );

  if (!match) {
    return {
      headline: 'Screens available per device.',
      rows: devices.map((device) => ({
        label: device.name,
        value: `${allScreens().filter((screen) => screen.properties.devices.includes(device.id)).length} screens`,
        detail: device.formFactor,
      })),
    };
  }

  const screens = allScreens().filter((screen) =>
    screen.properties.devices.includes(match.id),
  );

  return {
    headline: `${screens.length} screens run on ${match.name}.`,
    rows: screens.slice(0, 10).map((screen) => ({
      label: screen.step.title,
      value: screen.flowName,
      detail: screen.properties.owningTeam,
      flowId: screen.flowId,
      stepId: screen.step.id,
    })),
  };
}

function fallbackAnswer(): AskAnswer {
  return {
    headline: 'I can answer questions about drop off, errors, duration, merchants, and devices.',
    rows: suggestedQuestions.map((question) => ({
      label: question,
      value: 'Try this',
    })),
    note: 'This is a keyword-matched placeholder, not a real model.',
  };
}
