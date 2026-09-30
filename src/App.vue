<script setup lang="ts">
import { computed, ref } from 'vue';
import { features } from './data/features';
import { currencies } from './data/catalog';
import { allScreens, filterScreens, owningTeams } from './lib/flows';
import { shareLink, useAppState } from './lib/state';
import { applyTheme, preferredTheme, saveTheme } from './lib/theme';
import AskDock from './components/AskDock.vue';
import PButton from './components/ui/PButton.vue';
import PIcon from './components/ui/PIcon.vue';
import PIconButton from './components/ui/PIconButton.vue';
import PInput from './components/ui/PInput.vue';
import PMultiSelect from './components/ui/PMultiSelect.vue';
import PSelect from './components/ui/PSelect.vue';
import PToggle from './components/ui/PToggle.vue';
import FlowView from './views/FlowView.vue';
import LibraryView from './views/LibraryView.vue';
import type { ModeId } from './lib/state';
import type { FeatureId } from './types/flow';
import type { ThemeId } from './lib/theme';

const state = useAppState();
const copied = ref(false);
const menuOpen = ref(false);
const theme = ref<ThemeId>(preferredTheme());

// main.ts applies the theme before mount to avoid a first-paint flash;
// applying it here as well keeps App correct when mounted on its own.
applyTheme(theme.value);

const modes: { id: ModeId; label: string }[] = [
  { id: 'flow', label: 'Flow' },
  { id: 'screens', label: 'Screen library' },
];

const featureOptions = features.map((feature) => ({
  value: feature.id,
  label: feature.name,
}));
const teamOptions = owningTeams().map((team) => ({ value: team, label: team }));
const currencyOptions = currencies.map((currency) => ({
  value: currency,
  label: currency,
}));

const screens = computed(() =>
  filterScreens(allScreens(), {
    query: state.query,
    devices: state.filterDevices,
    teams: state.filterTeams,
    features: state.filterFeatures,
  }),
);

const hasFilters = computed(
  () =>
    Boolean(state.query) ||
    state.filterDevices.length > 0 ||
    state.filterTeams.length > 0 ||
    state.filterFeatures.length > 0 ||
    state.range !== '30d',
);

function clearFilters(): void {
  state.query = '';
  state.filterDevices = [];
  state.filterTeams = [];
  state.filterFeatures = [];
  state.range = '30d';
}

async function copyLink(): Promise<void> {
  const link = shareLink(state);
  try {
    await navigator.clipboard.writeText(link);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Clipboard access can be blocked; the address bar already holds the link.
    window.prompt('Copy this link', link);
  }
}

function selectMode(mode: ModeId): void {
  state.mode = mode;
  if (mode === 'flow') state.selectedScreenKey = '';
  menuOpen.value = false;
}

function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  applyTheme(theme.value);
  saveTheme(theme.value);
}
</script>

<template>
  <div class="app">
    <header class="app__topbar">
      <div class="app__leading">
        <div class="app__menu-wrap">
          <PIconButton
            icon="menu"
            :label="menuOpen ? 'Close navigation' : 'Open navigation'"
            @click="menuOpen = !menuOpen"
          />
          <nav v-if="menuOpen" class="app__menu" aria-label="Views">
            <button
              v-for="mode in modes"
              :key="mode.id"
              type="button"
              class="app__mode"
              :class="{ 'app__mode--active': state.mode === mode.id }"
              :aria-current="state.mode === mode.id ? 'page' : undefined"
              @click="selectMode(mode.id)"
            >
              {{ mode.label }}
            </button>
          </nav>
        </div>
        <template v-if="state.mode === 'screens' && !state.selectedScreenKey">
          <PInput
            class="app__search"
            label="Search"
            hide-label
            :model-value="state.query"
            placeholder="Search screens"
            @update:model-value="state.query = $event"
          />
          <PMultiSelect
            label="Feature"
            hide-label
            :model-value="state.filterFeatures"
            :options="featureOptions"
            placeholder="Any feature"
            @update:model-value="state.filterFeatures = $event as FeatureId[]"
          />
          <PMultiSelect
            label="Team"
            hide-label
            :model-value="state.filterTeams"
            :options="teamOptions"
            placeholder="Any team"
            @update:model-value="state.filterTeams = $event"
          />
          <PButton
            class="app__reset"
            :disabled="!hasFilters"
            @click="clearFilters"
          >
            Reset all
          </PButton>
          <span class="app__count">{{ screens.length }} screens</span>
        </template>
        <button
          v-else-if="state.mode === 'screens' && state.selectedScreenKey"
          type="button"
          class="app__back"
          @click="state.selectedScreenKey = ''"
        >
          <PIcon name="arrow-left" />
          <span>All screens</span>
        </button>
      </div>

      <div class="app__actions">
        <PSelect
          v-if="state.mode === 'screens'"
          label="Currency"
          hide-label
          :model-value="state.previewCurrency"
          :options="currencyOptions"
          @update:model-value="state.previewCurrency = $event"
        />
        <PToggle
          v-if="state.mode === 'flow'"
          label="View entire journey"
          :model-value="state.chartOpen"
          @update:model-value="state.chartOpen = $event"
        />
        <PIconButton
          icon="link"
          :label="copied ? 'Link copied' : 'Copy share link'"
          @click="copyLink"
        />
        <PIconButton icon="ask" label="Ask" @click="state.askOpen = !state.askOpen" />
        <PIconButton
          :icon="theme === 'dark' ? 'sun' : 'moon'"
          :label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        />
      </div>
    </header>

    <main class="app__view">
      <FlowView v-if="state.mode === 'flow'" />
      <LibraryView v-else-if="state.mode === 'screens'" />
    </main>

    <AskDock v-if="state.askOpen" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--px-bg);
}

.app__topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 58px;
  padding: 10px 40px;
  background: var(--px-surface);
  border-bottom: 1px solid var(--px-border-subtle);
}

.app__back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 5px 12px 5px 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--px-text);
  background: var(--px-surface);
  border: 1px solid var(--px-border-subtle);
  border-radius: 7px;
  cursor: pointer;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.app__back:hover {
  border-color: var(--px-border);
  box-shadow: var(--px-shadow-sm);
}

.app__back :deep(.p-icon) {
  width: 14px;
  height: 14px;
}

.app__leading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.app__leading :deep(.p-select),
.app__leading :deep(.p-multi-select),
.app__actions :deep(.p-select) {
  flex: 0 0 auto;
}

.app__search {
  width: min(200px, 44vw);
}

.app__count {
  margin-left: 4px;
  font-size: 12px;
  color: var(--px-text-muted);
  white-space: nowrap;
}

.app__menu-wrap {
  position: relative;
}

.app__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app__menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 132px;
  padding: 6px;
  background: var(--px-surface);
  border: 1px solid var(--px-border-subtle);
  border-radius: var(--px-radius);
  box-shadow: var(--px-shadow-sm);
}

.app__mode {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  color: var(--px-text-muted);
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.app__mode:hover {
  color: var(--px-text);
  background: var(--px-surface-muted);
}

.app__mode--active {
  color: var(--px-text);
  background: var(--b-color-background-navigation);
}

.app__view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 0;
}

@media (max-width: 720px) {
  .app__topbar {
    flex-wrap: wrap;
    row-gap: 8px;
    padding-right: 16px;
    padding-left: 16px;
  }

  .app__view {
    padding-right: 16px;
    padding-left: 16px;
  }
}
</style>
