<script setup lang="ts">
/**
 * DisplayPills carries the library's display and comparison controls: the
 * compare group and the display selectors, each in its own glass container.
 *
 * The library views render it inside the screens' own container, centered
 * with the screens, so it never covers the properties and metrics panel.
 */
import { computed } from 'vue';
import { devices, firmwareVersions, languages } from '../data/catalog';
import { useAppState } from '../lib/state';
import PMultiSelect from './ui/PMultiSelect.vue';
import PSelect from './ui/PSelect.vue';
import type { LibraryCompareProperty } from '../lib/state';

const state = useAppState();

const deviceOptions = devices.map((device) => ({
  value: device.id,
  label: device.name,
}));
const languageOptions = languages.map((language) => ({
  value: language,
  label: language,
}));
const firmwareOptions = firmwareVersions.map((release) => ({
  value: release,
  label: release,
}));

/** The compare picker's value: the compared property, or '' when off. */
const compareMode = computed(() =>
  state.libraryCompareOn ? state.libraryCompareProperty : '',
);

// 'None' is the empty value, which PSelect adds from the placeholder so the
// control still reads 'None' while nothing is being compared.
const compareModeOptions: { value: string; label: string }[] = [
  { value: 'language', label: 'Language' },
  { value: 'device', label: 'Device' },
  { value: 'release', label: 'Release' },
];

/** The compared property as a plural noun, naming its values picker. */
const compareValuesLabel = computed(() => {
  switch (state.libraryCompareProperty) {
    case 'device':
      return 'Devices';
    case 'language':
      return 'Languages';
    case 'release':
      return 'Releases';
  }
});

const compareValuesPlaceholder = computed(
  () => `Pick ${compareValuesLabel.value.toLowerCase()}`,
);

/** Points the comparison at a property, or turns it off. */
function setCompareMode(value: string): void {
  state.libraryCompareOn = Boolean(value);
  if (value) {
    state.libraryCompareProperty = value as LibraryCompareProperty;
  }
  // Values chosen for another property do not apply.
  state.libraryCompareOptions = [];
}

/** True while the given property is the one being compared. */
function comparingBy(property: LibraryCompareProperty): boolean {
  return state.libraryCompareOn && state.libraryCompareProperty === property;
}
</script>

<template>
  <div class="display-pills">
    <div class="display-pills__group">
      <span class="display-pills__label">Compare</span>
      <PSelect
        class="display-pills__compare"
        size="compact"
        label="Compare"
        hide-label
        placeholder="None"
        :model-value="compareMode"
        :options="compareModeOptions"
        @update:model-value="setCompareMode"
      />
      <PMultiSelect
        v-if="comparingBy('language')"
        size="compact"
        label="Languages"
        hide-label
        :model-value="state.libraryCompareOptions"
        :options="languageOptions"
        :placeholder="compareValuesPlaceholder"
        @update:model-value="state.libraryCompareOptions = $event"
      />
      <PMultiSelect
        v-if="comparingBy('device')"
        size="compact"
        label="Devices"
        hide-label
        :model-value="state.libraryCompareOptions"
        :options="deviceOptions"
        :placeholder="compareValuesPlaceholder"
        @update:model-value="state.libraryCompareOptions = $event"
      />
      <PMultiSelect
        v-if="comparingBy('release')"
        size="compact"
        label="Releases"
        hide-label
        :model-value="state.libraryCompareOptions"
        :options="firmwareOptions"
        :placeholder="compareValuesPlaceholder"
        @update:model-value="state.libraryCompareOptions = $event"
      />
    </div>
    <div class="display-pills__group">
      <PSelect
        v-if="!comparingBy('language')"
        size="compact"
        label="Language"
        hide-label
        :model-value="state.previewLanguage"
        :options="languageOptions"
        @update:model-value="state.previewLanguage = $event"
      />
      <PSelect
        v-if="!comparingBy('device')"
        size="compact"
        label="Device"
        hide-label
        :model-value="state.previewDevice"
        :options="deviceOptions"
        @update:model-value="state.previewDevice = $event"
      />
      <PSelect
        v-if="!comparingBy('release')"
        size="compact"
        label="Release"
        hide-label
        :model-value="state.previewRelease"
        :options="firmwareOptions"
        @update:model-value="state.previewRelease = $event"
      />
    </div>
  </div>
</template>

<style scoped>
/* The groups' frosted glass makes each one its own stacking context, so the
 * dropdown lists inside them can only rise above the screen previews that
 * follow if the pills as a whole sit on a higher layer. The views place the
 * pills (sticky), which is what lets the z-index apply. */
.display-pills {
  z-index: var(--b-z-index-global-elevated);
  display: flex;
  align-items: center;
  gap: 8px;
}

.display-pills__group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--px-glass-strong);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--px-border-subtle);
  border-radius: 999px;
  box-shadow: var(--px-shadow-sm);
}

.display-pills__group :deep(.p-select),
.display-pills__group :deep(.p-multi-select) {
  flex: 0 0 auto;
}

/* The toolbar's dropdowns are pills: fully rounded, with the light border
 * and 12px text the toolbar used before it moved to Bento's dropdown. The
 * small chevron comes from the shared compact select styles. */
.display-pills__group :deep(.b-dropdown-default-textbox) {
  border-color: var(--px-border-subtle);
  border-radius: 999px;
}

.display-pills__group :deep(.b-dropdown-default-textbox:hover) {
  border-color: var(--px-border);
}

.display-pills__group :deep(.b-dropdown-default-textbox__textbox) {
  padding: 0 9px 0 12px;
}

.display-pills__group :deep(.b-dropdown-base-textbox) {
  font-size: 12px;
  line-height: 16px;
}

.display-pills__label {
  flex: 0 0 auto;
  padding-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--px-text-muted);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .display-pills {
    flex-wrap: wrap;
    justify-content: center;
    max-width: 100%;
  }

  .display-pills__group {
    border-radius: var(--px-radius-lg);
  }
}
</style>
