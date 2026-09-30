import { flows } from '../data/flows';
import { features } from '../data/features';
import type {
  FeatureId,
  DeviceId,
  FlowStep,
  PaymentFlow,
  Screen,
  ScreenProperties,
  StepBranch,
} from '../types/flow';

export interface FlowConfig {
  device: DeviceId;
  language: string;
  currency: string;
  firmware: string;
}

/** Flow-level properties with any step overrides applied. */
export function screenProperties(
  flow: PaymentFlow,
  step: FlowStep,
): ScreenProperties {
  return { ...flow.properties, ...step.propertyOverrides };
}

export function stepById(
  flow: PaymentFlow,
  stepId: string,
): FlowStep | undefined {
  return flow.steps.find((step) => step.id === stepId);
}

export function stepIndex(flow: PaymentFlow, stepId: string): number {
  return flow.steps.findIndex((step) => step.id === stepId);
}

/** Step ids reachable directly from this step, whether branching or not. */
export function nextStepIds(step: FlowStep): string[] {
  if (step.branches?.length) {
    return step.branches.map((branch) => branch.targetStepId);
  }
  return step.nextStepId ? [step.nextStepId] : [];
}

/** Step ids that lead into this step. */
export function previousStepIds(flow: PaymentFlow, stepId: string): string[] {
  return flow.steps
    .filter((step) => nextStepIds(step).includes(stepId))
    .map((step) => step.id);
}

/**
 * Where most shoppers go next: the single next step, or the branch with the
 * largest share. Used by the forward control and the arrow keys.
 */
export function mostLikelyNextStepId(step: FlowStep): string | undefined {
  if (step.branches?.length) {
    const best: StepBranch | undefined = [...step.branches].sort(
      (a, b) => b.share - a.share,
    )[0];
    return best?.targetStepId;
  }
  return step.nextStepId;
}

/**
 * Every screen, including the screens optional features can add. Screens a
 * feature adds appear once per step, tagged with the feature name.
 */
export function allScreens(source: PaymentFlow[] = flows): Screen[] {
  const screens: Screen[] = [];

  for (const flow of source) {
    for (const step of flow.steps) {
      screens.push({
        flowId: flow.id,
        flowName: flow.name,
        step,
        properties: screenProperties(flow, step),
      });
    }

    for (const feature of features) {
      const insertion = feature.insertions.find(
        (entry) => entry.flowId === flow.id,
      );
      if (!insertion) continue;

      for (const option of feature.options) {
        for (const step of insertion.stepsByOption[option.id] ?? []) {
          const alreadyListed = screens.some(
            (screen) => screen.flowId === flow.id && screen.step.id === step.id,
          );
          if (alreadyListed) continue;
          screens.push({
            flowId: flow.id,
            flowName: flow.name,
            step: { ...step, featureId: feature.id },
            properties: screenProperties(flow, step),
            featureName: feature.name,
          });
        }
      }
    }
  }

  return screens;
}

export function owningTeams(source: PaymentFlow[] = flows): string[] {
  const teams = new Set<string>();
  for (const screen of allScreens(source)) {
    teams.add(screen.properties.owningTeam);
  }
  return [...teams].sort();
}

export interface ScreenFilters {
  query: string;
  devices: string[];
  teams: string[];
  features: FeatureId[];
}

export function emptyScreenFilters(): ScreenFilters {
  return { query: '', devices: [], teams: [], features: [] };
}

export function filterScreens(
  screens: Screen[],
  filters: ScreenFilters,
): Screen[] {
  const query = filters.query.trim().toLowerCase();

  return screens.filter((screen) => {
    if (
      filters.devices.length &&
      !filters.devices.some((device) =>
        screen.properties.devices.includes(device as DeviceId),
      )
    ) {
      return false;
    }
    if (
      filters.teams.length &&
      !filters.teams.includes(screen.properties.owningTeam)
    ) {
      return false;
    }
    if (
      filters.features.length &&
      (!screen.step.featureId || !filters.features.includes(screen.step.featureId))
    ) {
      return false;
    }
    if (!query) {
      return true;
    }

    const haystack = [
      screen.step.title,
      screen.step.shopperDescription,
      screen.step.internalNote ?? '',
      screen.flowName,
      screen.featureName ?? '',
      screen.properties.owningTeam,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

/** Whether a flow runs with the currently selected configuration. */
export function flowSupportsConfig(
  flow: PaymentFlow,
  config: FlowConfig,
): boolean {
  return (
    flow.properties.devices.includes(config.device) &&
    flow.properties.languages.includes(config.language) &&
    flow.properties.currencies.includes(config.currency) &&
    flow.properties.firmwareVersions.includes(config.firmware)
  );
}

/** Which parts of the configuration a flow does not support, for messaging. */
export function unsupportedConfigParts(
  flow: PaymentFlow,
  config: FlowConfig,
): string[] {
  const parts: string[] = [];
  if (!flow.properties.devices.includes(config.device)) parts.push('device');
  if (!flow.properties.languages.includes(config.language)) parts.push('language');
  if (!flow.properties.currencies.includes(config.currency)) parts.push('currency');
  if (!flow.properties.firmwareVersions.includes(config.firmware)) {
    parts.push('firmware version');
  }
  return parts;
}
