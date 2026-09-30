import { features, REJOIN } from '../data/features';
import type {
  Feature,
  FeatureId,
  FlowStep,
  PaymentFlow,
} from '../types/flow';

/** Enabled features, mapped to the option selected for each. */
export type FeatureSelections = Partial<Record<FeatureId, string>>;

export { REJOIN };

export function featureById(featureId: string): Feature | undefined {
  return features.find((feature) => feature.id === featureId);
}

/**
 * The features enabled anywhere in a set of configurations, used to draw one
 * chart that covers every configuration on the page. Where two configurations
 * enable the same feature with different options, the first one wins.
 */
export function mergeSelections(
  configurations: FeatureSelections[],
): FeatureSelections {
  const merged: FeatureSelections = {};
  for (const selections of configurations) {
    for (const [featureId, optionId] of Object.entries(selections)) {
      const id = featureId as FeatureId;
      if (merged[id] === undefined) merged[id] = optionId;
    }
  }
  return merged;
}

/** Features that can be switched on for a given flow. */
export function featuresForFlow(flowId: string): Feature[] {
  return features.filter((feature) =>
    feature.insertions.some((insertion) => insertion.flowId === flowId),
  );
}

/** The feature that adds the named step to the named flow, if any. */
export function featureForStep(flowId: string, stepId: string): Feature | undefined {
  return features.find((feature) =>
    feature.insertions.some(
      (insertion) =>
        insertion.flowId === flowId &&
        Object.values(insertion.stepsByOption).some((steps) =>
          steps.some((step) => step.id === stepId),
        ),
    ),
  );
}

/**
 * The screen used to end flows that gain optional screens after what used to
 * be their last step, or inserted before a later payment step.
 */
function flowExitStep(): FlowStep {
  return {
    id: 'flow-exit',
    title: 'Take card',
    shopperDescription:
      'The shopper takes their card and any receipt, and the payment flow ends.',
    metrics: {
      impressions30d: 2_940_000,
      dropOffRate: 0.002,
      avgDurationSeconds: 2.2,
      errors: [],
    },
  };
}

function cloneStep(step: FlowStep): FlowStep {
  return {
    ...step,
    branches: step.branches?.map((branch) => ({ ...branch })),
  };
}

/**
 * Splices the screens of every enabled feature into a copy of the flow. The
 * original data is never modified, so the same base flow resolves differently
 * for each configuration.
 *
 * Inserted steps point at the REJOIN sentinel where they hand back to the rest
 * of the flow. It resolves to whatever the anchor step led to before the
 * feature was applied, so several features can hang off the same step. When
 * the anchor used to end the flow, a shared "Take card" exit screen is added.
 */
export function resolveFlow(
  flow: PaymentFlow,
  selections: FeatureSelections,
): PaymentFlow {
  const resolved: PaymentFlow = {
    ...flow,
    steps: flow.steps.map(cloneStep),
  };
  const byId = new Map(resolved.steps.map((step) => [step.id, step]));
  let exitStep: FlowStep | undefined;

  // Catalog order fixes the chain when several features share an anchor.
  for (const feature of features) {
    const optionId = selections[feature.id];
    if (!optionId) continue;

    const insertion = feature.insertions.find(
      (entry) => entry.flowId === flow.id,
    );
    if (!insertion) continue;

    const anchor = byId.get(insertion.afterStepId);
    // Features only splice into a step with a single outgoing path.
    if (!anchor || anchor.branches?.length) continue;

    const optionSteps =
      insertion.stepsByOption[optionId] ??
      insertion.stepsByOption[feature.defaultOptionId] ??
      [];
    if (!optionSteps.length) continue;

    const anchorNext = anchor.nextStepId;
    const rejoinTo = (): string => {
      if (anchorNext) return anchorNext;
      if (!exitStep) {
        exitStep = flowExitStep();
        resolved.steps.push(exitStep);
        byId.set(exitStep.id, exitStep);
      }
      return exitStep.id;
    };

    const inserted = optionSteps.map((step) => {
      const clone = cloneStep(step);
      clone.featureId = feature.id;
      if (clone.nextStepId === REJOIN) clone.nextStepId = rejoinTo();
      if (clone.branches) {
        clone.branches = clone.branches.map((branch) =>
          branch.targetStepId === REJOIN
            ? { ...branch, targetStepId: rejoinTo() }
            : branch,
        );
      }
      return clone;
    });

    const anchorIndex = resolved.steps.findIndex((step) => step.id === anchor.id);
    anchor.nextStepId = inserted[0]!.id;
    resolved.steps.splice(anchorIndex + 1, 0, ...inserted);
    for (const step of inserted) byId.set(step.id, step);
  }

  return resolved;
}

/**
 * Builds the chart-only view of every possible feature path. Each feature is
 * represented by a gate with one branch per option and a "Not included"
 * branch. The regular configuration flow remains resolved by resolveFlow;
 * this wider flow is only used to show disabled alternatives in the journey
 * map.
 */
export function resolveFullJourney(flow: PaymentFlow): PaymentFlow {
  const resolved: PaymentFlow = {
    ...flow,
    steps: flow.steps.map(cloneStep),
  };
  const byId = new Map(resolved.steps.map((step) => [step.id, step]));
  let exitStep: FlowStep | undefined;

  const rejoinTarget = (target: string | undefined): string => {
    if (target) return target;
    if (!exitStep) {
      exitStep = flowExitStep();
      resolved.steps.push(exitStep);
      byId.set(exitStep.id, exitStep);
    }
    return exitStep.id;
  };

  // Features sharing an anchor are inserted immediately after that anchor.
  // Process them in reverse catalog order so the displayed journey follows
  // the catalog order, with tipping first before Present card.
  for (const feature of [...features].reverse()) {
    const insertion = feature.insertions.find(
      (entry) => entry.flowId === flow.id,
    );
    if (!insertion) continue;

    const anchor = byId.get(insertion.afterStepId);
    if (!anchor || anchor.branches?.length) continue;

    const anchorNext = rejoinTarget(anchor.nextStepId);
    const gateId = `feature-gate:${feature.id}`;
    const branches: NonNullable<FlowStep['branches']> = [];
    const inserted: FlowStep[] = [];

    for (const option of feature.options) {
      const optionSteps = insertion.stepsByOption[option.id] ?? [];
      if (!optionSteps.length) {
        branches.push({
          label: option.label,
          targetStepId: anchorNext,
          share: 0,
        });
        continue;
      }

      const idMap = new Map(
        optionSteps.map((step) => [
          step.id,
          `feature-option:${feature.id}:${option.id}:${step.id}`,
        ]),
      );

      const variants = optionSteps.map((step) => {
        const clone = cloneStep(step);
        clone.id = idMap.get(step.id)!;
        clone.sourceStepId = step.id;
        clone.featureId = feature.id;
        clone.featureOptionId = option.id;
        if (clone.nextStepId) {
          clone.nextStepId =
            clone.nextStepId === REJOIN
              ? anchorNext
              : (idMap.get(clone.nextStepId) ?? clone.nextStepId);
        }
        if (clone.branches) {
          clone.branches = clone.branches.map((branch) => ({
            ...branch,
            targetStepId:
              branch.targetStepId === REJOIN
                ? anchorNext
                : (idMap.get(branch.targetStepId) ?? branch.targetStepId),
          }));
        }
        return clone;
      });

      branches.push({
        label: option.label,
        targetStepId: variants[0]!.id,
        share: 0,
      });
      inserted.push(...variants);
    }

    branches.push({ label: 'Not included', targetStepId: anchorNext, share: 0 });

    const gate: FlowStep = {
      id: gateId,
      featureId: feature.id,
      chartOnly: true,
      title: feature.name,
      shopperDescription: feature.description,
      branches,
      metrics: {
        impressions30d: 0,
        dropOffRate: 0,
        avgDurationSeconds: 0,
        errors: [],
      },
    };

    anchor.nextStepId = gate.id;
    resolved.steps.splice(
      resolved.steps.findIndex((step) => step.id === anchor.id) + 1,
      0,
      gate,
      ...inserted,
    );
    byId.set(gate.id, gate);
    for (const step of inserted) byId.set(step.id, step);
  }

  return resolved;
}
