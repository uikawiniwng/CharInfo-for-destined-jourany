<template>
  <div id="page-status" class="page" :class="{ active }">
    <h2 class="section-title">状态概览</h2>
    <div class="status-layout">
      <div class="radar-wrapper">
        <svg width="220" height="220" viewBox="-30 -30 260 260" style="overflow: visible">
          <g transform="translate(100, 100)">
            <polygon points="0,-80 76,-24 47,64 -47,64 -76,-24" class="radar-grid" />
            <polygon points="0,-64 61,-19 38,51 -38,51 -61,-19" class="radar-grid" />
            <polygon points="0,-48 46,-14 28,38 -28,38 -46,-14" class="radar-grid" />
            <polygon points="0,-32 30,-10 19,26 -19,26 -30,-10" class="radar-grid" />
            <line x1="0" y1="0" x2="0" y2="-80" class="radar-axis" />
            <line x1="0" y1="0" x2="76" y2="-24" class="radar-axis" />
            <line x1="0" y1="0" x2="47" y2="64" class="radar-axis" />
            <line x1="0" y1="0" x2="-47" y2="64" class="radar-axis" />
            <line x1="0" y1="0" x2="-76" y2="-24" class="radar-axis" />
            <polygon :points="radarPoints" class="radar-shape" />
          </g>
        </svg>

        <div
          v-for="attr in attrs"
          :key="attr.flagKey"
          class="attr-flag"
          :class="[`flag-${attr.flagKey}`, { active: activeAttr === attr.flagKey }]"
          @click="$emit('select-attr', attr.flagKey)"
        >
          {{ attr.label }} {{ attr.total }}
        </div>
      </div>

      <div id="attr-detail-box" class="attr-detail-box" :class="{ visible: !!detailText }">{{ detailText || '点击属性查看公式' }}</div>

      <div class="meta-block" id="meta-block">
        <div v-for="line in metaLines" :key="line.label" class="meta-line">
          <span class="meta-label">{{ line.label }}</span>
          <span class="meta-data" :style="line.color ? { color: line.color } : undefined">{{ line.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { Sp03AttrItem, Sp03MetaLine } from './types';

const props = defineProps<{
  active: boolean;
  attrs: Sp03AttrItem[];
  activeAttr: Sp03AttrItem['flagKey'] | null;
  detailText: string;
  metaLines: Sp03MetaLine[];
}>();

defineEmits<{
  (e: 'select-attr', key: Sp03AttrItem['flagKey']): void;
}>();

const radarPoints = computed(() => {
  const angles = [-90, -18, 54, 126, 198];
  const maxR = 80;
  const stats = props.attrs.map((attr: Sp03AttrItem) => attr.total);
  const maxVal = Math.max(20, ...stats);

  return angles
    .map((angle, i) => {
      const val = Math.min(Math.max(stats[i] || 0, 0), maxVal);
      const r = (val / maxVal) * maxR;
      const rad = (angle * Math.PI) / 180;
      return `${(r * Math.cos(rad)).toFixed(1)},${(r * Math.sin(rad)).toFixed(1)}`;
    })
    .join(' ');
});
</script>
