<template>
  <div id="page-story" class="page" :class="{ active }">
    <h2 class="section-title">档案资料</h2>
    <div class="profile-content">
      <template v-if="sections.length > 0">
        <template v-for="section in sections" :key="section.key">
          <strong>{{ section.title }}</strong>
          <p>{{ section.content }}</p>
        </template>
      </template>
      <div v-else class="empty-tip">暂无档案</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Sp03StorySection } from './types';

defineProps<{
  active: boolean;
  sections: Sp03StorySection[];
}>();
</script>
