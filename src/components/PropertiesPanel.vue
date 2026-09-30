<script setup lang="ts">
import { computed } from 'vue';
import { devices } from '../data/catalog';
import PIcon from './ui/PIcon.vue';
import type { FeatureId, ScreenProperties } from '../types/flow';

const slackUrl = 'https://adyen.enterprise.slack.com/';
const featureDocs: Partial<Record<FeatureId, string>> = {
  tipping: 'https://docs.adyen.com/point-of-sale/tipping',
  giving: 'https://docs.adyen.com/point-of-sale/donate',
  installments: 'https://docs.adyen.com/point-of-sale/installments',
  loyalty: 'https://docs.adyen.com/point-of-sale/loyalty',
  dcc: 'https://docs.adyen.com/point-of-sale/currency-conversion',
  surcharge: 'https://docs.adyen.com/point-of-sale/surcharge',
  cvm: 'https://docs.adyen.com/point-of-sale/cardholder-verification-methods',
};

const props = defineProps<{
  properties: ScreenProperties;
  /** Set when the screen only exists while a feature is switched on. */
  featureName?: string;
  featureId?: FeatureId;
}>();

const deviceNames = computed(() =>
  props.properties.devices.map(
    (id) => devices.find((device) => device.id === id)?.name ?? id,
  ),
);

const featureDocsUrl = computed(() =>
  props.featureId ? featureDocs[props.featureId] : undefined,
);
</script>

<template>
  <section class="properties px-card">
    <h3 class="properties__title">Properties</h3>

    <dl class="properties__list">
      <div class="properties__row">
        <dt>Team</dt>
        <dd>
          <span class="properties__value">{{ properties.owningTeam }}</span>
          <a
            class="properties__link properties__link--slack"
            :href="slackUrl"
            target="_blank"
            rel="noreferrer"
          >
            Slack
            <PIcon name="external-link" />
          </a>
        </dd>
      </div>
      <div v-if="featureName" class="properties__row">
        <dt>Feature</dt>
        <dd>
          <span class="properties__value">{{ featureName }}</span>
          <a
            v-if="featureDocsUrl"
            class="properties__link properties__link--docs"
            :href="featureDocsUrl"
            target="_blank"
            rel="noreferrer"
          >
            Docs
            <PIcon name="external-link" />
          </a>
        </dd>
      </div>
      <div class="properties__row">
        <dt>Devices</dt>
        <dd><span class="properties__value">{{ deviceNames.join(', ') }}</span></dd>
      </div>
      <div class="properties__row">
        <dt>Firmware</dt>
        <dd>
          <span class="properties__value">{{ properties.firmwareVersions.join(', ') }}</span>
        </dd>
      </div>
      <div class="properties__row">
        <dt>Languages</dt>
        <dd><span class="properties__value">{{ properties.languages.join(', ') }}</span></dd>
      </div>
      <div class="properties__row">
        <dt>Currencies</dt>
        <dd><span class="properties__value">{{ properties.currencies.join(', ') }}</span></dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.properties {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.properties__title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--px-text-muted);
}

.properties__list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.properties__row {
  display: grid;
  grid-template-columns: 74px 1fr;
  gap: 10px;
  font-size: 12px;
  line-height: 1.35;
}

.properties__row dt {
  color: var(--px-text-muted);
}

.properties__row dd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin: 0;
}

.properties__value {
  min-width: 0;
}

.properties__link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  color: var(--px-text-muted);
  font-size: 11px;
  text-decoration: none;
}

.properties__link:hover {
  color: var(--px-text);
  text-decoration: underline;
}

.properties__link :deep(.p-icon) {
  width: 13px;
  height: 13px;
}
</style>
