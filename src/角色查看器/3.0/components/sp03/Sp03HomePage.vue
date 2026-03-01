<template>
  <div id="page-home" class="page" :class="{ active }">
    <div class="hud-container">
      <div class="char-header">
        <h1 class="char-name">{{ name }}</h1>
        <span class="char-info" :style="{ color: infoColor }">{{ info }}</span>
      </div>
      <div class="quotes-area" :style="{ color: quoteColor }">{{ quote }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  active: boolean;
  name: string;
  info: string;
  infoColor: string;
  quote: string;
  quoteColor: string;
}>();
</script>
