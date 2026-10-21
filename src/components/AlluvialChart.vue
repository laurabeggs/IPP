<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { estimateTextWidth, layoutAlluvial } from '../lib/alluvial';
import { formatCount, formatRate } from '../lib/metrics';
import type {
  AlluvialData,
  AlluvialNode,
  PositionedLink,
  PositionedNode,
} from '../lib/alluvial';

/**
 * An alluvial chart drawn to the Lume data visualisation guidelines: 16px
 * nodes in one colour, light links between them, labels 8px from their node
 * with the name above the value, and drop-offs told in the critical colour
 * through a gradient link. Hovering or focusing a node highlights its
 * neighbours and shows the share that flows between them.
 */
const props = withDefaults(
  defineProps<{
    data: AlluvialData;
    /** Narrow panels: every label to the right of its node, shares only. */
    compact?: boolean;
    /** Height the flow's full volume spans. */
    scaleHeight?: number;
  }>(),
  { compact: false, scaleHeight: 168 },
);

/* Gradient ids are document-wide, and the panel and the modal can both
 * draw the same flow at once. */
const uid = `alluvial-${Math.random().toString(36).slice(2, 9)}`;

/* jsdom reports no width, so charts there lay out at the panel's width. */
const FALLBACK_WIDTH = 302;
const root = ref<HTMLElement | null>(null);
const measuredWidth = ref(0);
/** Which edges hide more of a chart that is wider than its panel. */
const clipped = ref({ start: false, end: false });
let observer: ResizeObserver | undefined;

function updateClipped(): void {
  const el = root.value;
  if (!el) return;
  clipped.value = {
    start: el.scrollLeft > 1,
    end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
  };
}

onMounted(() => {
  if (!root.value) return;
  measuredWidth.value = root.value.clientWidth;
  observer = new ResizeObserver(([entry]) => {
    if (entry) measuredWidth.value = Math.floor(entry.contentRect.width);
    requestAnimationFrame(updateClipped);
  });
  observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());

function valueText(node: Pick<AlluvialNode, 'value'>, value = node.value) {
  const ratio = value / Math.max(1, props.data.total);
  const share = ratio > 0 && ratio < 0.001 ? '<0.1%' : formatRate(ratio);
  return props.compact ? share : `${formatCount(value)} · ${share}`;
}

const layout = computed(() =>
  layoutAlluvial(
    props.data,
    {
      width: measuredWidth.value || FALLBACK_WIDTH,
      scaleHeight: props.scaleHeight,
      compact: props.compact,
    },
    (node) => valueText(node),
  ),
);

type Hover = { kind: 'node' | 'link'; id: string } | null;
const hovered = ref<Hover>(null);

/** Nodes and links in focus, and the values the focused nodes should show. */
const focus = computed(() => {
  const current = hovered.value;
  if (!current) return null;
  const nodes = new Set<string>();
  const links = new Set<string>();
  const values = new Map<string, number>();

  if (current.kind === 'link') {
    const link = layout.value.links.find((item) => item.id === current.id);
    if (!link) return null;
    links.add(link.id);
    nodes.add(link.source).add(link.target);
    values.set(link.source, link.value).set(link.target, link.value);
    return { nodes, links, values };
  }

  nodes.add(current.id);
  for (const link of layout.value.links) {
    if (link.source !== current.id && link.target !== current.id) continue;
    links.add(link.id);
    const other = link.source === current.id ? link.target : link.source;
    nodes.add(other);
    values.set(other, (values.get(other) ?? 0) + link.value);
  }
  return { nodes, links, values };
});

/**
 * Words wider than their label get a soft hyphen between every pair of
 * letters, so the browser breaks them where they run out of room and draws
 * the hyphen there. CSS hyphenation depends on the browser shipping a
 * dictionary, which not all of them do.
 */
function breakableLabel(label: string, width: number): string {
  return label
    .split(' ')
    .map((word) =>
      estimateTextWidth(word) > width ? [...word].join('\u00AD') : word,
    )
    .join(' ');
}

function nodeValue(node: PositionedNode): string {
  return valueText(node, focus.value?.values.get(node.id) ?? node.value);
}

function isMuted(kind: 'node' | 'link', id: string): boolean {
  if (!focus.value) return false;
  return kind === 'node' ? !focus.value.nodes.has(id) : !focus.value.links.has(id);
}

/** Drop-offs and links into a negative outcome fade into the critical colour. */
const isCritical = (link: PositionedLink) =>
  link.kind === 'dropped' || !!link.negative;

function linkFill(link: PositionedLink): string {
  return isCritical(link)
    ? `url(#${uid}-${link.id.replace(/[^a-z0-9-]/gi, '_')})`
    : 'var(--alluvial-node)';
}

const criticalLinks = computed(() => layout.value.links.filter(isCritical));

/* Critical links are drawn first so the paths that continue sit on top. */
const orderedLinks = computed(() => [
  ...criticalLinks.value,
  ...layout.value.links.filter((link) => !isCritical(link)),
]);

const summary = computed(() =>
  layout.value.nodes
    .map((node) => `${node.label} ${valueText(node)}`)
    .join(', '),
);
</script>

<template>
  <div
    ref="root"
    class="alluvial"
    :class="{
      'alluvial--compact': compact,
      'alluvial--focused': !!focus,
      'alluvial--clip-start': clipped.start,
      'alluvial--clip-end': clipped.end,
    }"
    @scroll.passive="updateClipped"
  >
    <div
      class="alluvial__canvas"
      :style="{ width: `${layout.width}px`, height: `${layout.height}px` }"
    >
      <svg
        class="alluvial__svg"
        :width="layout.width"
        :height="layout.height"
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        role="img"
        :aria-label="`Alluvial chart: ${summary}`"
      >
        <defs>
          <linearGradient
            v-for="link in criticalLinks"
            :id="`${uid}-${link.id.replace(/[^a-z0-9-]/gi, '_')}`"
            :key="link.id"
            gradientUnits="userSpaceOnUse"
            :x1="link.x0"
            :x2="link.x1"
            y1="0"
            y2="0"
          >
            <stop offset="0%" stop-color="var(--alluvial-node)" />
            <stop offset="100%" stop-color="var(--alluvial-critical)" />
          </linearGradient>
        </defs>

        <path
          v-for="link in orderedLinks"
          :key="link.id"
          class="alluvial__link"
          :class="[
            `alluvial__link--${link.kind}`,
            { 'alluvial__link--negative': link.negative },
            { 'alluvial__link--muted': isMuted('link', link.id) },
            { 'alluvial__link--active': focus?.links.has(link.id) },
          ]"
          :d="link.path"
          :fill="linkFill(link)"
          :data-link="link.id"
          @mouseenter="hovered = { kind: 'link', id: link.id }"
          @mouseleave="hovered = null"
        />

        <rect
          v-for="node in layout.nodes"
          :key="node.id"
          class="alluvial__node"
          :class="[
            `alluvial__node--${node.kind}`,
            { 'alluvial__node--negative': node.negative },
            { 'alluvial__node--muted': isMuted('node', node.id) },
          ]"
          :x="node.x"
          :y="node.y"
          width="16"
          :height="node.height"
          rx="2"
          tabindex="0"
          :data-node="node.id"
          :aria-label="`${node.label}: ${valueText(node)}`"
          @mouseenter="hovered = { kind: 'node', id: node.id }"
          @mouseleave="hovered = null"
          @focus="hovered = { kind: 'node', id: node.id }"
          @blur="hovered = null"
        />
      </svg>

      <div
        v-for="node in layout.nodes"
        :key="`label-${node.id}`"
        class="alluvial__label"
        :class="[
          `alluvial__label--${node.labelAlign}`,
          { 'alluvial__label--muted': isMuted('node', node.id) },
        ]"
        :style="{
          left: `${node.labelX}px`,
          top: `${node.labelCenterY}px`,
          maxWidth: `${node.labelWidth}px`,
        }"
        :title="node.label"
        aria-hidden="true"
        @mouseenter="hovered = { kind: 'node', id: node.id }"
        @mouseleave="hovered = null"
      >
        <span class="alluvial__label-name">{{
          breakableLabel(node.label, node.labelWidth)
        }}</span>
        <span class="alluvial__label-value">{{ nodeValue(node) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Lume's "Sky blue" is the chart's single colour; drop-offs and negative
 * outcomes such as a decline use Bento's critical colour. */
.alluvial {
  --alluvial-node: #a9d6ff;
  --alluvial-critical: var(--b-color-background-critical-strong);
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.alluvial--clip-end {
  mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
}

.alluvial--clip-start {
  mask-image: linear-gradient(to left, #000 calc(100% - 40px), transparent);
}

.alluvial--clip-start.alluvial--clip-end {
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 40px,
    #000 calc(100% - 40px),
    transparent
  );
}

.alluvial__canvas {
  position: relative;
}

.alluvial__svg {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.alluvial__node {
  fill: var(--alluvial-node);
  transition: opacity 120ms ease;
  cursor: default;
  outline: none;
}

.alluvial__node--dropped,
.alluvial__node--negative {
  fill: var(--alluvial-critical);
}

.alluvial__node:focus-visible {
  stroke: var(--b-focus-ring-color);
  stroke-width: 2;
}

.alluvial__link {
  opacity: 0.32;
  transition: opacity 120ms ease;
}

.alluvial__link--dropped,
.alluvial__link--negative {
  opacity: 0.4;
}

.alluvial__link--active {
  opacity: 0.6;
}

.alluvial__node--muted {
  opacity: 0.3;
}

.alluvial__link--muted {
  opacity: 0.1;
}

.alluvial__label {
  position: absolute;
  display: flex;
  flex-direction: column;
  transform: translateY(-50%);
  font-size: 12px;
  line-height: 16px;
  color: var(--b-color-label-primary);
  pointer-events: auto;
  transition: color 120ms ease;
}

.alluvial__label--right {
  transform: translate(-100%, -50%);
  text-align: right;
  align-items: flex-end;
}

.alluvial__label-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  hyphens: manual;
}

.alluvial__label-value {
  font-weight: 500;
  white-space: nowrap;
}

.alluvial__label--muted {
  color: var(--b-color-label-tertiary);
}
</style>
