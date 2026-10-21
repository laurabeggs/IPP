<script setup lang="ts">
import { computed } from 'vue';
import {
  BentoLink,
  BentoStructuredList,
  BentoStructuredListItem,
} from '@adyen/bento-vue3';
import PIcon from './ui/PIcon.vue';
import PSection from './ui/PSection.vue';
import PSlackLogo from './ui/PSlackLogo.vue';
import type { FeatureId, ScreenProperties } from '../types/flow';

const slackUrl = 'https://adyen.enterprise.slack.com/';
// Customer Area pages require a merchant login. Keep the destinations at the
// entry point and use each page's name to guide the merchant after sign-in.
const customerAreaUrl = 'https://ca-live.adyen.com/ca/ca/';

type SetupLink = { label: string; href: string };
type FeatureSetup = {
  caPages: SetupLink[];
  docsPages: SetupLink[];
  role: string;
};

const terminalSettingsAccess = { role: 'Merchant POS Terminal Management' };
const qualifiedAccess = {
  role: 'Merchant admin or a user with access to this CA page',
};

const featureSetup: Record<FeatureId, FeatureSetup> = {
  tipping: {
    caPages: [{ label: 'Tip amounts', href: customerAreaUrl }],
    docsPages: [
      {
        label: 'Tipping docs',
        href: 'https://docs.adyen.com/point-of-sale/tipping/tipping-from-terminal',
      },
    ],
    ...terminalSettingsAccess,
  },
  giving: {
    caPages: [{ label: 'Giving campaigns', href: customerAreaUrl }],
    docsPages: [
      { label: 'Giving docs', href: 'https://docs.adyen.com/point-of-sale/donate' },
    ],
    role: 'Merchant admin or a user granted Giving campaign access',
  },
  installments: {
    caPages: [{ label: 'Installment settings', href: customerAreaUrl }],
    docsPages: [
      {
        label: 'Installments docs',
        href: 'https://docs.adyen.com/point-of-sale/installments',
      },
    ],
    ...qualifiedAccess,
  },
  loyalty: {
    caPages: [{ label: 'Loyalty program', href: customerAreaUrl }],
    docsPages: [
      { label: 'Loyalty docs', href: 'https://docs.adyen.com/point-of-sale/loyalty' },
    ],
    ...qualifiedAccess,
  },
  dcc: {
    caPages: [{ label: 'Currency conversion', href: customerAreaUrl }],
    docsPages: [
      {
        label: 'DCC docs',
        href: 'https://docs.adyen.com/point-of-sale/currency-conversion',
      },
    ],
    ...qualifiedAccess,
  },
  surcharge: {
    caPages: [{ label: 'Surcharge rules', href: customerAreaUrl }],
    docsPages: [
      {
        label: 'Surcharge docs',
        href: 'https://docs.adyen.com/platforms/in-person-payments/surcharge/configuration',
      },
    ],
    ...qualifiedAccess,
  },
  cvm: {
    caPages: [
      { label: 'Device settings · Payment features', href: customerAreaUrl },
    ],
    docsPages: [
      {
        label: 'CVM docs',
        href: 'https://docs.adyen.com/point-of-sale/cardholder-verification-methods',
      },
    ],
    ...terminalSettingsAccess,
  },
};

const props = withDefaults(
  defineProps<{
    properties: ScreenProperties;
    featureId?: FeatureId;
    /** 'section' inside an inspector, where dividers separate the blocks. */
    variant?: 'card' | 'section';
  }>(),
  { variant: 'card' },
);

const selectedFeatureSetup = computed(() =>
  props.featureId ? featureSetup[props.featureId] : undefined,
);
</script>

<template>
  <PSection class="properties" :variant="variant">
    <BentoStructuredList class="properties__list" :labels-width="120">
      <BentoStructuredListItem
        class="properties__row properties__row--team"
        label="Team"
      >
        <span class="properties__value">{{ properties.owningTeam }}</span>
        <BentoLink
          class="properties__slack"
          :to="slackUrl"
          is-not-routing
          disable-typography
          variant="quiet"
          target="_blank"
          rel="noreferrer"
          :aria-label="`${properties.owningTeam} on Slack`"
          :title="`${properties.owningTeam} on Slack`"
        >
          <PSlackLogo />
        </BentoLink>
      </BentoStructuredListItem>

      <template v-if="selectedFeatureSetup">
        <BentoStructuredListItem
          class="properties__row properties__row--ca"
          label="CA settings"
        >
          <ul class="properties__values">
            <li v-for="page in selectedFeatureSetup.caPages" :key="page.label">
              <BentoLink
                class="properties__link properties__link--ca"
                to=""
                is-not-routing
                :href="page.href"
                :aria-label="`${page.label} in Customer Area`"
                :title="`Open Customer Area for ${page.label.toLowerCase()}`"
                target="_blank"
                rel="noreferrer"
              >
                {{ page.label }}
                <PIcon name="external-link" />
              </BentoLink>
            </li>
          </ul>
        </BentoStructuredListItem>

        <BentoStructuredListItem
          class="properties__row properties__row--docs"
          label="Docs"
        >
          <ul class="properties__values">
            <li v-for="page in selectedFeatureSetup.docsPages" :key="page.label">
              <BentoLink
                class="properties__link properties__link--docs"
                to=""
                is-not-routing
                :href="page.href"
                target="_blank"
                rel="noreferrer"
              >
                {{ page.label }}
                <PIcon name="external-link" />
              </BentoLink>
            </li>
          </ul>
        </BentoStructuredListItem>

        <BentoStructuredListItem
          class="properties__row properties__row--roles"
          label="Roles"
        >
          <span class="properties__role-name">
            {{ selectedFeatureSetup.role }}
          </span>
        </BentoStructuredListItem>
      </template>
    </BentoStructuredList>
  </PSection>
</template>

<style scoped>
/* The Figma instance overrides Bento's proportional columns and its stacked
 * mobile layout: values start at a fixed label column, on 32px row
 * intervals. The column is narrower than Figma's 163px to suit the 350px
 * panel. */
.properties__row {
  display: flex;
  margin: 0;
  padding: var(--b-spacer-030) 0;
  font-family: var(--b-font-family-primary);
  font-size: var(--b-text-body-font-size);
  line-height: var(--b-text-body-line-height);
}

.properties__row :deep(.b-structured-list-item__label) {
  box-sizing: border-box !important;
  flex-shrink: 0;
  padding: 0 var(--b-spacer-040) 0 0;
}

.properties__row :deep(.b-structured-list-item__value) {
  flex: 1 1 0;
  min-width: 0;
  padding: 0;
}

/* Each value of a row sits on its own line, spaced like the rows themselves
 * so a row with several values reads as several rows under one label. */
.properties__values {
  display: flex;
  flex-direction: column;
  gap: var(--b-spacer-060);
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.properties__values li {
  min-width: 0;
}

.properties__row--team :deep(.b-structured-list-item__value) {
  align-items: center;
  column-gap: var(--b-spacer-080);
}

.properties__value {
  min-width: 0;
}

.properties__slack {
  display: inline-flex;
  padding: var(--b-spacer-010);
  border-radius: var(--b-border-radius-xs);
  color: var(--b-color-label-primary);
}

.properties__slack:focus-visible {
  outline: 2px solid var(--b-focus-ring-color);
  outline-offset: 1px;
}

/* Bento puts the link's content in its own text element, which is where the
 * label and its icon have to line up. */
.properties__link :deep(.b-link__text) {
  display: inline;
}

/* Centered on the 20px line without growing it, so link rows keep the
 * 32px rhythm of the plain rows. */
.properties__link :deep(.p-icon) {
  display: inline-block;
  vertical-align: -3px;
  margin-left: var(--b-spacer-010);
}

.properties__link {
  align-items: center;
  overflow-wrap: anywhere;
  text-decoration: none;
}

.properties__link:hover {
  text-decoration: underline;
}
</style>
