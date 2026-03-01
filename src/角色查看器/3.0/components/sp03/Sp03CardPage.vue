<template>
  <div :id="`page-${pageKey}`" class="page" :class="{ active }">
    <h2 class="section-title">{{ title }}</h2>

    <template v-if="hasContent">
      <template v-for="section in sections" :key="section.key">
        <h3 v-if="section.title" class="sub-section-title">{{ section.title }}</h3>

        <div
          v-for="card in section.cards"
          :key="card.id"
          class="card"
          :class="card.cardClass"
        >
          <div class="card-header">
            <span v-if="card.qualityPrefix" class="prefix" :class="card.qualityClass">【{{ card.qualityPrefix }}】</span>
            <span class="card-title">{{ card.name }}</span>
          </div>

          <div v-if="card.type || (card.tags && card.tags.length) || (card.costs && card.costs.length)" class="card-tags">
            <span v-if="card.type" class="tag">{{ card.type }}</span>
            <span v-for="tag in card.tags || []" :key="`${card.id}-tag-${tag}`" class="tag">{{ tag }}</span>
            <span v-for="cost in card.costs || []" :key="`${card.id}-cost-${cost}`" class="tag cost">消耗: {{ cost }}</span>
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

          <div v-if="card.flavor" class="card-flavor">{{ card.flavor }}</div>
        </div>
      </template>
    </template>

    <div v-else class="empty-tip">{{ emptyText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { Sp03CardSection, Sp03PageKey } from './types';

const props = defineProps<{
  pageKey: Exclude<Sp03PageKey, 'home' | 'status' | 'story'>;
  title: string;
  active: boolean;
  sections: Sp03CardSection[];
  emptyText: string;
}>();

const hasContent = computed(() => props.sections.some((section: Sp03CardSection) => section.cards.length > 0));
</script>
