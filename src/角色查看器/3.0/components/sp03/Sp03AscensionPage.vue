<template>
  <div id="page-ascension" class="page" :class="{ active }">
    <h2 class="section-title">登神长阶</h2>

    <div v-if="hasContent">
      <div v-if="deity" class="divinity-deity">{{ deity }}</div>

      <template v-for="section in sections" :key="section.key">
        <h3 v-if="section.title" class="sub-section-title">{{ section.title }}</h3>

        <div v-for="card in section.cards" :key="card.id" class="card" :class="card.cardClass || 'power'">
          <div class="card-header">
            <span v-if="card.qualityPrefix" class="prefix" :class="card.qualityClass || 'power'">【{{ card.qualityPrefix }}】</span>
            <span class="card-title">{{ card.name }}</span>
          </div>

          <div class="card-body">
            <p v-if="card.description">{{ card.description }}</p>
            <p v-if="card.passive"><strong style="color: var(--c-gold)">被动:</strong> {{ card.passive }}</p>
            <p v-if="card.active"><strong style="color: var(--c-gold)">主动:</strong> {{ card.active }}</p>
            <template v-if="card.effect">
              <span v-if="!card.description">{{ card.effect }}</span>
              <p v-else>{{ card.effect }}</p>
            </template>
          </div>
        </div>
      </template>
    </div>

    <div v-else class="empty-tip">暂无登神信息</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { Sp03CardSection } from './types';

const props = defineProps<{
  active: boolean;
  deity: string;
  sections: Sp03CardSection[];
}>();

const hasContent = computed(() =>
  !!props.deity || props.sections.some((section: Sp03CardSection) => section.cards.length > 0),
);
</script>
