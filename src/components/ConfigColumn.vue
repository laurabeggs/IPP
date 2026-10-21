<script setup lang="ts">
import { computed } from 'vue';
import {
  currencies,
  devices,
  firmwareVersions,
  languages,
  merchants,
} from '../data/catalog';
import {
  addComparison,
  applyMerchant,
  removeComparison,
  setConfigValue,
  useAppState,
} from '../lib/state';
import { featuresForFlow } from '../lib/features';
import { BentoDivider } from '@adyen/bento-vue3';
import FeatureToggles from './FeatureToggles.vue';
import PButton from './ui/PButton.vue';
import PIconButton from './ui/PIconButton.vue';
import PSection from './ui/PSection.vue';
import PSelect from './ui/PSelect.vue';

/**
 * The configuration for one row, shown as the content of its inspector: the
 * preset, the details and the feature switches, each a section between the
 * inspector's dividers. Flow and period are owned by the master chart above
 * the rows; this panel only holds per-configuration settings.
 */
const props = defineProps<{ paneIndex: number }>();

const state = useAppState();
const pane = computed(() => state.panes[props.paneIndex]!);
const isFirst = computed(() => props.paneIndex === 0);
const hasFeatures = computed(() => featuresForFlow(state.flow).length > 0);
/** The first configuration offers a comparison, the second removes itself. */
const hasAction = computed(() => (isFirst.value ? !state.compare : true));

const deviceOptions = devices.map((device) => ({
  value: device.id,
  label: device.name,
}));
const merchantOptions = merchants.map((merchant) => ({
  value: merchant.id,
  label: merchant.name,
}));
const toOptions = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
</script>

<template>
  <div class="config">
    <div class="config__body">
      <section class="config__preset">
        <PSelect
          label="Preset"
          :model-value="pane.config.merchant"
          :options="merchantOptions"
          placeholder="Custom"
          @update:model-value="applyMerchant(pane, $event)"
        />
        <p class="config__help">
          Choose a merchant to use that account's configuration.
        </p>
      </section>

      <BentoDivider class="config__divider" />

      <PSection class="config__fields" title="Details" variant="section">
        <PSelect
          label="Device"
          :model-value="pane.config.device"
          :options="deviceOptions"
          @update:model-value="setConfigValue(pane, 'device', $event)"
        />
        <PSelect
          label="Language"
          :model-value="pane.config.language"
          :options="toOptions(languages)"
          @update:model-value="setConfigValue(pane, 'language', $event)"
        />
        <PSelect
          label="Currency"
          :model-value="pane.config.currency"
          :options="toOptions(currencies)"
          @update:model-value="setConfigValue(pane, 'currency', $event)"
        />
        <PSelect
          label="Firmware"
          :model-value="pane.config.firmware"
          :options="toOptions(firmwareVersions)"
          @update:model-value="setConfigValue(pane, 'firmware', $event)"
        />
      </PSection>

      <BentoDivider v-if="hasFeatures" class="config__divider" />

      <FeatureToggles :pane-index="paneIndex" variant="section" />
    </div>

    <footer v-if="hasAction" class="config__footer">
      <PButton
        v-if="isFirst"
        class="config__compare"
        @click="addComparison(state)"
      >
        Compare
      </PButton>
      <PIconButton
        v-else
        class="config__remove"
        icon="trash"
        label="Remove this configuration"
        @click="removeComparison(state)"
      />
    </footer>
  </div>
</template>

<style scoped>
/* The panel's content fills the inspector and scrolls under the footer,
 * which keeps the configuration's one action in reach. */
.config {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.config__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: 8px;
  overflow-y: auto;
}

.config__preset {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config__help {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--px-text-muted);
}

.config__fields :deep(.p-section__content) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Bento's secondary button is a translucent fill, so the strip needs a solid
 * backing in the inspector's own background to keep the button readable as
 * the sections scroll behind it. */
.config__footer {
  display: flex;
  justify-content: flex-end;
  flex: 0 0 auto;
  padding-top: 12px;
  background: var(--b-color-background-primary);
}

.config__compare {
  width: 100%;
}
</style>
