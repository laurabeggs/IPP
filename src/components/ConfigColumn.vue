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
import FeatureToggles from './FeatureToggles.vue';
import PButton from './ui/PButton.vue';
import PIconButton from './ui/PIconButton.vue';
import PSelect from './ui/PSelect.vue';

/**
 * The configuration for one row. Flow and period are owned by the master
 * chart above the rows; this column only contains per-configuration settings.
 */
const props = defineProps<{
  paneIndex: number;
  /** Configuration name, empty when only one configuration is shown. */
  label: string;
}>();

const state = useAppState();
const pane = computed(() => state.panes[props.paneIndex]!);
const isFirst = computed(() => props.paneIndex === 0);

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
  <aside class="config">
    <header class="config__header">
      <span class="config__label">{{ isFirst ? 'Configuration' : label }}</span>
    </header>
    <span class="config__actions">
      <PIconButton
        v-if="!isFirst"
        icon="trash"
        label="Remove this configuration"
        @click="removeComparison(state)"
      />
    </span>

    <div class="config__body">
      <div class="config__preset px-glass-card">
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
      </div>

      <div class="config__fields px-glass-card">
        <h3 class="config__section-title">Details</h3>
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
      </div>

      <FeatureToggles :pane-index="paneIndex" />
    </div>

    <footer v-if="isFirst && !state.compare" class="config__footer">
      <PButton class="config__compare" @click="addComparison(state)">
        Compare
      </PButton>
    </footer>
  </aside>
</template>

<style scoped>
/* The whole column scrolls: the header sits on the page background, the
 * sections float in glass containers, and the compare button sticks to the
 * bottom while the sections scroll behind it. */
.config {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto auto;
  align-content: start;
  height: 100%;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
}

/* The header sits directly on the page background, in no container. */
.config__header {
  display: contents;
}

.config__label {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 58px;
  padding: 14px 16px 10px;
  box-sizing: border-box;
}

.config__label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--px-text-muted);
}

.config__actions {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  gap: 6px;
  align-self: start;
  position: sticky;
  top: 14px;
  z-index: 4;
  margin: 14px 16px 0 0;
}

.config__body {
  grid-column: 1 / -1;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 8px 16px 24px;
  box-sizing: border-box;
}

.config__preset {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.config__help {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--px-text-muted);
}

.config__fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config__section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--px-text-muted);
}

/* The compare button floats above the sections, sticky to the bottom of the
 * column while the sections scroll behind it. */
.config__footer {
  grid-column: 1 / -1;
  grid-row: 3;
  position: sticky;
  bottom: 0;
  z-index: 3;
  width: 100%;
  margin-top: auto;
  padding: 10px 16px 16px;
  box-sizing: border-box;
}

.config__compare {
  width: 100%;
  box-shadow: var(--px-shadow-sm);
}
</style>
