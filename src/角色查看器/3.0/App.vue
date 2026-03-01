<template>
  <div class="viewer-root">
    <div v-if="parseError" class="error-card">
      <h3>⚠️ YAML 解析失败</h3>
      <div class="error-body">
        <div class="yaml-error-row"><b>技术信息：</b>{{ parseError.message }}</div>
        <div v-if="parseError.line !== undefined" class="yaml-error-row">
          <b>定位：</b>第 {{ (parseError.line ?? 0) + 1 }} 行，第 {{ (parseError.column ?? 0) + 1 }} 列
        </div>

        <div class="yaml-fix-box">
          <div class="yaml-fix-title">排查建议</div>
          <ul class="yaml-fix-list">
            <li>先看箭头 ^ 指向位置，再改该处附近</li>
            <li>检查 “键: 值” 结构是否完整</li>
            <li>检查缩进是否和同层字段一致</li>
            <li>检查引号、括号、列表符号是否成对</li>
          </ul>
        </div>

        <template v-if="parseError.cleanedLine">
          <div class="yaml-error-title">系统定位到的出错行</div>
          <pre class="yaml-error-pre"
            >{{ parseError.cleanedLine }}
{{ parseError.caretLine }}</pre
          >
        </template>

        <details v-if="parseError.originalLine" class="yaml-error-details">
          <summary>查看原始内容</summary>
          <pre class="yaml-error-pre alt">{{ parseError.originalLine }}</pre>
        </details>
      </div>
    </div>

    <div v-else-if="renderModel" id="char-showcase-root" ref="rootRef" :class="{ 'mode-details': activePage !== 'home' }">
      <div id="bg-base" class="bg-layer"></div>
      <div id="bg-char" class="bg-layer" :style="bgCharStyle"></div>

      <div class="action-buttons" id="action-buttons" style="display: flex">
        <button class="action-btn" :disabled="importingWorldbook" title="保存到世界书" @click="onImportWorldbook">
          {{ worldbookBtnText }}
        </button>
        <button class="action-btn" :disabled="importingMvu" title="导入到 MVU 变量" @click="onImportMvu">
          {{ mvuBtnText }}
        </button>
      </div>

      <div id="content-area">
        <Sp03HomePage
          :active="activePage === 'home'"
          :name="renderModel.name"
          :info="renderModel.info"
          :info-color="renderModel.infoColor"
          :quote="renderModel.quote"
          :quote-color="renderModel.quoteColor"
        />

        <Sp03StatusPage
          :active="activePage === 'status'"
          :attrs="renderModel.attrs"
          :active-attr="activeAttr"
          :detail-text="activeAttrDetail"
          :meta-lines="renderModel.metaLines"
          @select-attr="onSelectAttr"
        />

        <Sp03CardPage
          page-key="skill"
          title="技能列表"
          :active="activePage === 'skill'"
          :sections="renderModel.skillsSections"
          empty-text="暂无技能"
        />

        <Sp03CardPage
          page-key="equip"
          title="装备道具"
          :active="activePage === 'equip'"
          :sections="renderModel.equipSections"
          empty-text="暂无装备"
        />

        <Sp03AscensionPage
          :active="activePage === 'ascension'"
          :deity="renderModel.ascensionDeity"
          :sections="renderModel.ascensionSections"
        />

        <Sp03StoryPage :active="activePage === 'story'" :sections="renderModel.storySections" />
      </div>

      <Sp03BottomNav :active-page="activePage" :nav-items="renderModel.navItems" @change-page="onChangePage" />
    </div>

    <div v-else class="loading-card">等待 YAML 数据...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import Sp03AscensionPage from './components/sp03/Sp03AscensionPage.vue';
import Sp03BottomNav from './components/sp03/Sp03BottomNav.vue';
import Sp03CardPage from './components/sp03/Sp03CardPage.vue';
import Sp03HomePage from './components/sp03/Sp03HomePage.vue';
import Sp03StatusPage from './components/sp03/Sp03StatusPage.vue';
import Sp03StoryPage from './components/sp03/Sp03StoryPage.vue';
import type { Sp03AttrItem, Sp03NavItem, Sp03PageKey } from './components/sp03/types';
import { buildSp03RenderModel, type Sp03RenderModel } from './components/sp03/viewModel';
import { importToMvuVariables, saveToChatWorldbook } from './services/importService';
import { applyTheme, resolveTheme } from './services/themeService';
import { parseCharacterYaml } from './services/yamlParser';
import type { CharacterData, FriendlyYamlError } from './types';

const rootRef = ref<HTMLElement | null>(null);
const parseError = ref<FriendlyYamlError | null>(null);
const sheetData = ref<CharacterData | null>(null);
const renderModel = ref<Sp03RenderModel | null>(null);
const originalYamlText = ref('');

const activePage = ref<Sp03PageKey>('home');
const activeAttr = ref<Sp03AttrItem['flagKey'] | null>(null);

const worldbookBtnText = ref('💾');
const mvuBtnText = ref('📥');
const importingWorldbook = ref(false);
const importingMvu = ref(false);

const bgImageUrl = ref('');
const bgVisible = ref(false);

const npcBackgroundMap: Record<string, string> = {
  幽露: 'https://files.catbox.moe/ba1eoi.png',
  仲夏夜之梦: 'https://files.catbox.moe/x3oecs.png',
  NPC03: 'NPC03.png',
};

const bgCharStyle = computed(() => ({
  backgroundImage: bgImageUrl.value ? `url('${bgImageUrl.value}')` : 'none',
  opacity: bgVisible.value ? '1' : '0',
}));

const activeAttrDetail = computed(() => {
  if (!renderModel.value || !activeAttr.value) return '';
  const found = renderModel.value.attrs.find((attr: Sp03AttrItem) => attr.flagKey === activeAttr.value);
  if (!found) return '';
  return `${found.key}: ${found.raw}`;
});

watch(
  () => renderModel.value?.navItems,
  (nav: Sp03NavItem[] | undefined) => {
    if (!nav) return;
    const current = nav.find((item: Sp03NavItem) => item.key === activePage.value);
    if (current?.visible) return;

    const fallback =
      nav.find((item: Sp03NavItem) => item.key === 'home' && item.visible) ||
      nav.find((item: Sp03NavItem) => item.visible);
    if (fallback) activePage.value = fallback.key;
    else activePage.value = 'home';
  },
  { deep: true },
);

function onChangePage(page: Sp03PageKey) {
  if (!renderModel.value) return;
  const target = renderModel.value.navItems.find((item: Sp03NavItem) => item.key === page);
  if (!target?.visible) return;
  activePage.value = page;
}

function onSelectAttr(flagKey: Sp03AttrItem['flagKey']) {
  activeAttr.value = activeAttr.value === flagKey ? null : flagKey;
}

function flashButton(target: 'worldbook' | 'mvu', state: '⏳' | '✅' | '❌', delay = 1200) {
  const isWorldbook = target === 'worldbook';
  if (isWorldbook) worldbookBtnText.value = state;
  else mvuBtnText.value = state;

  if (state !== '⏳') {
    setTimeout(() => {
      if (isWorldbook) worldbookBtnText.value = '💾';
      else mvuBtnText.value = '📥';
    }, delay);
  }
}

function readQuoteFromMvu(charName: string): string | null {
  try {
    const mvuApi = (window as any).Mvu || (window.parent as any)?.Mvu;
    if (!mvuApi || typeof mvuApi.getMvuData !== 'function') return null;

    const mvuResult = mvuApi.getMvuData({ type: 'message', message_id: 'latest' });
    const xinlihua = mvuResult?.stat_data?.命定系统?.关系列表?.[charName]?.心里话;
    if (xinlihua && String(xinlihua).trim()) return String(xinlihua).trim();
    return null;
  } catch (err) {
    console.warn('[SP03 Viewer] 读取 MVU 心里话失败:', err);
    return null;
  }
}

function updateBackgroundImage(charName: string) {
  if (!charName) {
    bgImageUrl.value = '';
    bgVisible.value = false;
    return;
  }

  const mapped = npcBackgroundMap[charName];
  if (mapped) {
    bgImageUrl.value = mapped;
    bgVisible.value = true;
    return;
  }

  const fallback = `${charName}.png`;
  bgImageUrl.value = fallback;
  bgVisible.value = true;

  const testImg = new Image();
  testImg.onerror = () => {
    bgVisible.value = false;
  };
  testImg.src = fallback;
}

function initFromYaml() {
  const yamlNode = document.getElementById('data-source');
  const yamlText = yamlNode?.textContent?.trim() || '';
  originalYamlText.value = yamlText;

  if (!yamlText) {
    parseError.value = { message: '未检测到 YAML 数据（#data-source 为空）。' };
    return;
  }

  const parsed = parseCharacterYaml(yamlText);
  if (!parsed.success) {
    parseError.value = parsed.error;
    return;
  }

  parseError.value = null;
  sheetData.value = parsed.data;

  const quoteFromMvu = readQuoteFromMvu(String(parsed.data.姓名 || 'Unknown'));
  renderModel.value = buildSp03RenderModel(parsed.data, quoteFromMvu || undefined);

  activePage.value = 'home';
  activeAttr.value = null;

  updateBackgroundImage(String(parsed.data.姓名 || 'Unknown'));

  const theme = resolveTheme(parsed.data);
  if (rootRef.value) applyTheme(theme, rootRef.value);
}

async function onImportWorldbook() {
  if (!sheetData.value || importingWorldbook.value) return;
  importingWorldbook.value = true;

  try {
    flashButton('worldbook', '⏳');
    await saveToChatWorldbook(sheetData.value, originalYamlText.value);
    flashButton('worldbook', '✅');
  } catch (err: any) {
    console.error('Worldbook Save Error:', err);
    flashButton('worldbook', '❌', 1800);
    window.alert(`保存失败: ${err?.message || String(err)}`);
  } finally {
    importingWorldbook.value = false;
  }
}

async function onImportMvu() {
  if (!sheetData.value || importingMvu.value) return;

  const ok = window.confirm(
    `确定要将角色 "${sheetData.value.姓名 || 'Unknown'}" 导入到 MVU 变量系统(命定系统.关系列表)吗？\n如果已存在同名角色，将会覆盖其数据。`,
  );
  if (!ok) return;

  importingMvu.value = true;
  try {
    flashButton('mvu', '⏳');
    await importToMvuVariables(sheetData.value);
    flashButton('mvu', '✅', 1600);
  } catch (err: any) {
    console.error('MVU Import Error:', err);
    flashButton('mvu', '❌', 1800);
    window.alert(`导入失败: ${err?.message || String(err)}`);
  } finally {
    importingMvu.value = false;
  }
}

onMounted(() => {
  initFromYaml();
});
</script>

<style>
#char-showcase-root {
  --c-hp: #ff4d4d;
  --c-en: #3399ff;
  --c-sp: #f39c12;
  --c-gold: #e6b800;
  --c-bg-dark: #0a0a0c;
  --c-panel: rgba(15, 15, 20, 0.95);
  --c-text: #f0f0f0;
  --c-text-muted: #888;

  --c-legend: #ffca28;
  --c-epic: #d633ff;
  --c-rare: #3399ff;
  --c-power: #ff4d4d;
  --c-mythic: #ffd700;
  --c-divine: #00ffff;
  --c-uncommon: #50c878;

  --f-serif: Georgia, 'Times New Roman', serif;
  --f-sans: system-ui, -apple-system, 'Microsoft YaHei', sans-serif;
  --f-mono: 'Courier New', monospace;

  --nav-height: 60px;

  box-sizing: border-box;
  font-family: var(--f-sans);
  color: var(--c-text);

  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;

  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 3 / 4;
  margin: 0 auto;
  background: var(--c-bg-dark);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

#char-showcase-root * {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

#char-showcase-root ::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
#char-showcase-root ::-webkit-scrollbar-track {
  background: transparent;
}
#char-showcase-root ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

#char-showcase-root .bg-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  transition: opacity 0.4s ease;
  border-radius: 8px;
}

#char-showcase-root #bg-base {
  background: radial-gradient(circle at 50% 30%, #1f222e 0%, #0a0a0c 70%);
  background-image:
    radial-gradient(circle at 50% 30%, #1f222e 0%, #0a0a0c 70%),
    repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.02) 0px,
      rgba(255, 255, 255, 0.02) 1px,
      transparent 1px,
      transparent 10px
    );
  z-index: 1;
}

#char-showcase-root #bg-char {
  background-size: cover;
  background-position: center top;
  z-index: 2;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}

#char-showcase-root.mode-details #bg-char {
  opacity: 0;
  pointer-events: none;
}

#char-showcase-root #content-area {
  position: relative;
  flex: 1;
  z-index: 10;
  overflow: hidden;
}

#char-showcase-root .page {
  display: none;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

#char-showcase-root .page.active {
  display: block;
}

#char-showcase-root #page-status,
#char-showcase-root #page-skill,
#char-showcase-root #page-equip,
#char-showcase-root #page-ascension,
#char-showcase-root #page-story {
  background: rgba(10, 10, 12, 0.88);
}

#char-showcase-root #page-home.active {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 0;
}

#char-showcase-root .hud-container {
  padding: 15px 20px 20px;
  background: linear-gradient(to top, rgba(10, 10, 12, 0.95) 0%, rgba(10, 10, 12, 0.7) 50%, transparent 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

#char-showcase-root .char-header {
  text-align: center;
  margin-bottom: 10px;
}
#char-showcase-root .char-name {
  font-family: var(--f-serif);
  font-size: 2.8rem;
  color: #fff;
  margin: 0;
  text-shadow: 0 4px 15px rgba(0, 0, 0, 1);
  letter-spacing: 2px;
  line-height: 1.2;
}
#char-showcase-root .char-info {
  color: var(--c-gold);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

#char-showcase-root .quotes-area {
  width: 100%;
  max-width: 400px;
  min-height: 40px;
  border: 1px dashed rgba(255, 215, 64, 0.3);
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #666;
  font-style: italic;
  margin-bottom: 15px;
  backdrop-filter: blur(5px);
  padding: 8px 10px;
  font-size: 0.85rem;
  text-align: center;
}

#char-showcase-root .status-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

#char-showcase-root .radar-wrapper {
  position: relative;
  width: 220px;
  height: 220px;
  margin: 10px 0;
}
#char-showcase-root .radar-grid {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
}
#char-showcase-root .radar-axis {
  stroke: rgba(255, 255, 255, 0.1);
}
#char-showcase-root .radar-shape {
  fill: rgba(255, 215, 64, 0.2);
  stroke: var(--c-gold);
  stroke-width: 2;
}

#char-showcase-root .attr-flag {
  position: absolute;
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid var(--c-gold);
  color: #fff;
  padding: 4px 8px;
  font-size: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  z-index: 20;
  white-space: nowrap;
  transition: all 0.2s;
  max-width: 80px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
}
#char-showcase-root .attr-flag.active {
  background: var(--c-gold);
  color: #000;
  box-shadow: 0 0 10px var(--c-gold);
}

#char-showcase-root .attr-detail-box {
  margin-top: -10px;
  margin-bottom: 10px;
  min-height: 24px;
  text-align: center;
  color: var(--c-gold);
  font-family: var(--f-mono);
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 215, 64, 0.2);
  padding: 8px;
  border-radius: 4px;
  width: 90%;
  opacity: 0;
  transition: opacity 0.2s;
}
#char-showcase-root .attr-detail-box.visible {
  opacity: 1;
}

#char-showcase-root .flag-str {
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
}
#char-showcase-root .flag-agi {
  top: 60px;
  right: -15px;
}
#char-showcase-root .flag-spr {
  top: 60px;
  left: -15px;
}
#char-showcase-root .flag-con {
  bottom: 30px;
  right: 0;
}
#char-showcase-root .flag-int {
  bottom: 30px;
  left: 0;
}

#char-showcase-root .meta-block {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
}
#char-showcase-root .meta-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 0.95rem;
}
#char-showcase-root .meta-line:last-child {
  border-bottom: none;
}
#char-showcase-root .meta-label {
  color: var(--c-gold);
}
#char-showcase-root .meta-data {
  color: #eee;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

#char-showcase-root .card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 2px solid #555;
  padding: 16px;
  margin-bottom: 15px;
  border-radius: 4px;
}
#char-showcase-root .card.legend {
  border-left-color: var(--c-legend);
}
#char-showcase-root .card.epic {
  border-left-color: var(--c-epic);
}
#char-showcase-root .card.rare {
  border-left-color: var(--c-rare);
}
#char-showcase-root .card.power {
  border-left-color: var(--c-power);
}
#char-showcase-root .card.mythic {
  border-left-color: var(--c-mythic);
}
#char-showcase-root .card.divine {
  border-left-color: var(--c-divine);
}
#char-showcase-root .card.uncommon {
  border-left-color: var(--c-uncommon);
}

#char-showcase-root .card-header {
  margin-bottom: 10px;
}
#char-showcase-root .card-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
}
#char-showcase-root .prefix {
  margin-right: 5px;
  font-weight: bold;
}
#char-showcase-root .prefix.legend {
  color: var(--c-legend);
}
#char-showcase-root .prefix.epic {
  color: var(--c-epic);
}
#char-showcase-root .prefix.rare {
  color: var(--c-rare);
}
#char-showcase-root .prefix.power {
  color: var(--c-power);
}
#char-showcase-root .prefix.mythic {
  color: var(--c-mythic);
}
#char-showcase-root .prefix.divine {
  color: var(--c-divine);
}
#char-showcase-root .prefix.uncommon {
  color: var(--c-uncommon);
}

#char-showcase-root .card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}
#char-showcase-root .tag {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: #bbb;
}
#char-showcase-root .tag.cost {
  color: #ff8a80;
  border-color: #ff8a80;
}

#char-showcase-root .card-body,
#char-showcase-root .card-flavor,
#char-showcase-root .profile-content p {
  white-space: pre-line;
}

#char-showcase-root .card-body {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #ddd;
  margin-bottom: 8px;
}
#char-showcase-root .card-body p {
  margin: 4px 0;
}
#char-showcase-root .card-flavor {
  font-size: 0.8rem;
  font-style: italic;
  color: #777;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 8px;
}

#char-showcase-root .section-title {
  color: var(--c-gold);
  font-family: var(--f-serif);
  font-size: 1.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 15px;
  margin-bottom: 20px;
  margin-top: 0;
}

#char-showcase-root .sub-section-title {
  color: var(--c-gold);
  font-family: var(--f-serif);
  font-size: 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 10px;
  margin-top: 25px;
  margin-bottom: 15px;
}

#char-showcase-root .profile-content {
  line-height: 1.6;
  color: #ccc;
}
#char-showcase-root .profile-content strong {
  color: var(--c-gold);
  display: block;
  margin-top: 15px;
  margin-bottom: 5px;
}
#char-showcase-root .profile-content p {
  margin: 0 0 18px 0;
  line-height: 1.8;
  text-align: left;
  word-break: break-word;
}

#char-showcase-root .divinity-deity {
  text-align: center;
  font-family: var(--f-serif);
  font-size: 1.6rem;
  color: var(--c-gold);
  text-shadow: 0 0 10px rgba(230, 184, 0, 0.5);
  margin-bottom: 15px;
}

#char-showcase-root #bottom-nav {
  height: var(--nav-height);
  flex-shrink: 0;
  background: #0f0f12;
  border-top: 1px solid #222;
  display: flex;
  z-index: 50;
}
#char-showcase-root .nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #555;
  cursor: pointer;
  font-size: 0.7rem;
  gap: 4px;
  transition: all 0.2s;
  background: none;
  border: none;
  padding: 0;
}
#char-showcase-root .nav-icon {
  width: 18px;
  height: 18px;
  background: currentColor;
  mask-size: contain;
  -webkit-mask-size: contain;
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-position: center;
}
#char-showcase-root .nav-item.active {
  color: var(--c-gold);
  background: rgba(255, 255, 255, 0.02);
}

#char-showcase-root .icon-home {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/%3E%3C/svg%3E");
}
#char-showcase-root .icon-stat {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z'/%3E%3C/svg%3E");
}
#char-showcase-root .icon-sword {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14.5 17.06c2.47-.36 4.67-1.92 5.76-4.06-1.09-2.14-3.29-3.7-5.76-4.06V7.24c3.42.45 6.35 2.72 7.5 5.76-1.15 3.04-4.08 5.31-7.5 5.76v-1.7zm-5-8.12c-2.47.36-4.67 1.92-5.76 4.06 1.09 2.14 3.29 3.7 5.76 4.06v1.7c-3.42-.45-6.35-2.72-7.5-5.76 1.15-3.04 4.08-5.31 7.5-5.76v1.7z'/%3E%3C/svg%3E");
}
#char-showcase-root .icon-bag {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h12v12z'/%3E%3C/svg%3E");
}
#char-showcase-root .icon-star {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'/%3E%3C/svg%3E");
}
#char-showcase-root .icon-book {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z'/%3E%3C/svg%3E");
}

#char-showcase-root .action-buttons {
  position: absolute;
  top: 10px;
  right: 10px;
  gap: 6px;
  z-index: 60;
}
#char-showcase-root .action-btn {
  background: rgba(20, 20, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
}
#char-showcase-root .action-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

#char-showcase-root .empty-tip {
  text-align: center;
  color: #666;
  padding: 20px;
}

.viewer-root {
  padding: 6px;
}

.loading-card,
.error-card {
  max-width: 720px;
  margin: 0 auto;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 16px;
  color: #f0f0f0;
}

.error-body {
  margin-top: 10px;
  font-size: 0.9rem;
}
.yaml-error-row {
  margin-bottom: 6px;
}
.yaml-fix-box {
  margin: 12px 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.yaml-fix-title {
  font-weight: 700;
  margin-bottom: 8px;
}
.yaml-fix-list {
  margin: 0;
  padding-left: 18px;
}
.yaml-error-title {
  font-weight: 700;
  margin-bottom: 6px;
}
.yaml-error-pre {
  margin: 0;
  padding: 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  white-space: pre;
  overflow: auto;
}
.yaml-error-pre.alt {
  margin-top: 8px;
}

@media (max-width: 480px) {
  #char-showcase-root {
    aspect-ratio: 3 / 4.5;
    --nav-height: 50px;
  }

  #char-showcase-root .char-name {
    font-size: 1.8rem;
    letter-spacing: 1px;
  }

  #char-showcase-root .char-info {
    font-size: 0.75rem;
    letter-spacing: 1px;
  }

  #char-showcase-root .quotes-area {
    min-height: 28px;
    padding: 5px 8px;
    font-size: 0.75rem;
    margin-bottom: 8px;
    max-width: 300px;
  }

  #char-showcase-root .nav-item {
    font-size: 0.6rem;
  }

  #char-showcase-root .nav-icon {
    width: 16px;
    height: 16px;
  }

  #char-showcase-root #bottom-nav {
    height: 50px;
  }
}
</style>
