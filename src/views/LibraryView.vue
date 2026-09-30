<script setup lang="ts">
import { computed } from 'vue';
import { allScreens, filterScreens } from '../lib/flows';
import { compareVariants, isComparing } from '../lib/compare';
import { useAppState } from '../lib/state';
import DisplayPills from '../components/DisplayPills.vue';
import ScreenCard from '../components/ScreenCard.vue';
import ScreenFormatsView from './ScreenFormatsView.vue';
import type { Screen } from '../types/flow';

const state = useAppState();

/** Compared previews widen the cards, so the grid gives them room. */
const comparing = computed(() => isComparing(state));

const screens = computed(() =>
  filterScreens(allScreens(), {
    query: state.query,
    devices: state.filterDevices,
    teams: state.filterTeams,
    features: state.filterFeatures,
  }),
);

// Looked up across every screen, so a screen selected in the flow view opens
// even when the library filters would hide it.
const selectedScreen = computed<Screen | undefined>(() =>
  allScreens().find((screen) => screenKey(screen) === state.selectedScreenKey),
);

function screenKey(screen: Screen): string {
  return `${screen.flowId}:${screen.step.id}`;
}

function selectScreen(screen: Screen): void {
  state.selectedScreenKey = screenKey(screen);
}
</script>

<template>
  <ScreenFormatsView v-if="selectedScreen" :screen="selectedScreen" />

  <div v-else class="library">
    <div class="library__content">
      <!-- The pills sit with the screens: centered with the grid, staying
           at the top of its scroll area. -->
      <DisplayPills class="library__pills" />
      <div
        class="library__grid"
        :class="{ 'library__grid--compare': comparing }"
      >
        <ScreenCard
          v-for="screen in screens"
          :key="screenKey(screen)"
          :screen="screen"
          :device-id="state.previewDevice"
          :language="state.previewLanguage"
          :currency="state.previewCurrency"
          :variants="compareVariants(state, screen)"
          @select="selectScreen(screen)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.library {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--px-surface);
}

.library__content {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* The pills sit in the grid's container, centered with the screens, and
 * stay at the top of the scroll area while the grid scrolls beneath. */
.library__pills {
  position: sticky;
  top: 14px;
  width: fit-content;
  margin: 14px auto 0;
}

.library__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 24px;
  padding: 28px 40px 40px;
}

@media (max-width: 900px) {
  .library__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding-right: 16px;
    padding-left: 16px;
  }
}

@media (max-width: 600px) {
  .library__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* After the media queries, so compared screens take the full width. */
.library__grid--compare {
  grid-template-columns: minmax(0, 1fr);
}
</style>
