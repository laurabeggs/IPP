<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { devices } from '../data/catalog';

/**
 * Renders the payment device and the shopper screen for one step.
 *
 * Screenshots load by filename convention, so adding one needs no code change:
 *   public/screens/<flow id>/<step id>--<device id>--<language>--<currency>.png
 *   public/screens/<flow id>/<step id>--<language>--<currency>.png
 *   public/screens/<flow id>/<step id>--<device id>.png  (device specific)
 *   public/screens/<flow id>/<step id>.png               (any device)
 * The most specific file that exists wins. Until one exists, the placeholder
 * names the paths it looked for on hover and shows the amount in the selected
 * language and currency.
 */
const props = withDefaults(
  defineProps<{
    flowId: string;
    stepId: string;
    stepTitle: string;
    deviceId?: string;
    /** Language and currency the screen content is shown in. */
    language?: string;
    currency?: string;
    /** Compact is for the screen library cards; mini for compared previews. */
    size?: 'regular' | 'compact' | 'mini';
    /** Marks the screen as unavailable in the current configuration. */
    unsupported?: boolean;
  }>(),
  {
    deviceId: '',
    language: 'en-US',
    currency: 'EUR',
    size: 'regular',
    unsupported: false,
  },
);

const candidates = computed(() => {
  const paths: string[] = [];
  // Screenshot URLs join Vite's build base: '/' in development and tests,
  // '/IPP/' when built for GitHub Pages. The same paths then work in both.
  const base = [
    `${import.meta.env.BASE_URL}screens`,
    props.flowId,
    props.stepId,
  ].join('/');
  if (props.deviceId) {
    paths.push(`${base}--${props.deviceId}--${props.language}--${props.currency}.png`);
  }
  paths.push(`${base}--${props.language}--${props.currency}.png`);
  if (props.deviceId) {
    paths.push(`${base}--${props.deviceId}.png`);
  }
  paths.push(`${base}.png`);
  return paths;
});

/** Placeholder stand-in for the amount the real screen would show. */
const sampleAmount = computed(() =>
  new Intl.NumberFormat(props.language, {
    style: 'currency',
    currency: props.currency,
  }).format(24.5),
);

const attempt = ref(0);
const currentSrc = computed<string | undefined>(
  () => candidates.value[attempt.value],
);

const stageGeometry = computed<Record<string, string>>(() => {
  const screen = devices.find((device) => device.id === props.deviceId)?.screen ?? {
    width: 320,
    height: 480,
  };
  const compact = props.size === 'compact';
  const mini = props.size === 'mini';
  const maxWidth = mini ? 150 : compact ? 260 : 380;
  const maxHeight = mini ? 150 : compact ? 256 : 364;
  const bezelPadding = mini ? 8 : compact ? 10 : 14;
  const scale = Math.min(
    maxWidth / screen.width,
    maxHeight / screen.height,
  );
  const width = Math.round(screen.width * scale);
  const height = Math.round(screen.height * scale);

  return {
    '--screen-width': `${width}px`,
    '--screen-height': `${height}px`,
    '--bezel-width': `${width + bezelPadding * 2}px`,
    '--bezel-height': `${height + bezelPadding * 2}px`,
    '--bezel-padding': `${bezelPadding}px`,
  };
});

const pathHint = computed(() =>
  candidates.value
    .map((path) => path.replace(import.meta.env.BASE_URL, 'public/'))
    .join('\n'),
);

watch(candidates, () => {
  attempt.value = 0;
});
</script>

<template>
  <div class="stage" :class="`stage--${size}`" :style="stageGeometry">
    <div class="stage__bezel">
      <div class="stage__screen">
        <img
          v-if="currentSrc"
          class="stage__screenshot"
          :src="currentSrc"
          :alt="stepTitle"
          @error="attempt += 1"
        />
        <div v-else class="stage__placeholder" :title="pathHint">
          <p class="stage__placeholder-title">{{ stepTitle }}</p>
          <p class="stage__placeholder-amount">{{ sampleAmount }}</p>
        </div>
        <p v-if="unsupported" class="stage__unsupported">
          Not in this configuration
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: var(--bezel-width);
  height: min(var(--bezel-height), 100%);
  flex: 0 0 auto;
}

.stage__bezel {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2b3138;
  border-radius: 24px;
  width: var(--bezel-width);
  height: 100%;
  padding: var(--bezel-padding);
  box-shadow: 0 12px 28px rgba(31, 42, 55, 0.14),
    0 2px 5px rgba(31, 42, 55, 0.12);
}

.stage--compact,
.stage--mini {
  height: var(--bezel-height);
}

.stage--compact .stage__bezel {
  border-radius: 18px;
}

.stage--mini .stage__bezel {
  border-radius: 12px;
}

.stage--mini .stage__screen {
  border-radius: 6px;
}

.stage--mini .stage__placeholder {
  inset: 6px;
  border-radius: 5px;
  gap: 4px;
}

.stage--mini .stage__placeholder-title {
  font-size: 10px;
}

.stage--mini .stage__placeholder-amount {
  font-size: 12px;
}

.stage__screen {
  width: var(--screen-width);
  height: var(--screen-height);
  border-radius: 10px;
  background: #f2f3f5;
  box-shadow: inset 0 0 0 1px rgba(31, 42, 55, 0.08);
  overflow: hidden;
  position: relative;
}

.stage--compact .stage__screen {
  aspect-ratio: 160 / 256;
}

.stage__screenshot {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.stage__placeholder {
  position: absolute;
  inset: 12px;
  border: 2px dashed var(--px-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  text-align: center;
}

.stage__placeholder-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--px-text-muted);
}

.stage__placeholder-amount {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--px-text);
}

.stage__unsupported {
  position: absolute;
  inset: auto 0 0;
  margin: 0;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: #7a3b00;
  background: rgba(255, 196, 87, 0.92);
}
</style>
