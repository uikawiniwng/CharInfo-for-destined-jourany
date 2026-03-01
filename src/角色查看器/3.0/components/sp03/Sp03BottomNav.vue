<template>
  <nav id="bottom-nav">
    <button
      v-for="item in navItems"
      v-show="item.visible"
      :key="item.key"
      class="nav-item"
      :class="{ active: activePage === item.key }"
      :data-nav="item.key"
      @click="$emit('change-page', item.key)"
    >
      <div class="nav-icon" :class="item.iconClass"></div>
      <span>{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { Sp03NavItem, Sp03PageKey } from './types';

defineProps<{
  activePage: Sp03PageKey;
  navItems: Sp03NavItem[];
}>();

defineEmits<{
  (e: 'change-page', page: Sp03PageKey): void;
}>();
</script>
