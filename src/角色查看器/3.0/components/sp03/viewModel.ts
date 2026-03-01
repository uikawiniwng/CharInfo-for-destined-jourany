import { getSmartArray, hasArrayContent, hasText, parseAttributeValue } from '../../services/common';
import { raceColorMap, resolveTheme } from '../../services/themeService';
import type { CharacterData } from '../../types';

import type {
  Sp03AttrItem,
  Sp03CardItem,
  Sp03CardSection,
  Sp03MetaLine,
  Sp03NavItem,
  Sp03StorySection,
} from './types';

const qualityClassMap: Record<string, string> = {
  传说: 'legend',
  史诗: 'epic',
  稀有: 'rare',
  精良: 'uncommon',
  神话: 'mythic',
  超凡: 'divine',
  普通: '',
  未知: '',
};

const attributeLabelMap: Record<string, Sp03AttrItem['label']> = {
  力量: 'STR',
  敏捷: 'AGI',
  体质: 'CON',
  智力: 'INT',
  精神: 'SPR',
};

const attrFlagMap: Record<string, Sp03AttrItem['flagKey']> = {
  力量: 'str',
  敏捷: 'agi',
  体质: 'con',
  智力: 'int',
  精神: 'spr',
};

function getQualityClass(quality: unknown): string {
  const text = String(quality || '');
  if (!text) return '';
  for (const [key, value] of Object.entries(qualityClassMap)) {
    if (text.includes(key)) return value;
  }
  return '';
}

function getQualityPrefix(quality: unknown): string {
  const text = String(quality || '');
  if (!text) return '';
  for (const key of Object.keys(qualityClassMap)) {
    if (text.includes(key)) return key;
  }
  return text;
}

function normalizeText(input: unknown): string {
  if (input === undefined || input === null) return '';
  if (Array.isArray(input)) return input.map(item => String(item ?? '')).join('，');
  return String(input).trim();
}

function normalizeEffect(input: unknown): string {
  if (input === undefined || input === null) return '无';
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if (obj.描述) return String(obj.描述);
    const text = Object.entries(obj)
      .map(([k, v]) => `${k}: ${normalizeText(v)}`)
      .filter(Boolean)
      .join('；');
    return text || '无';
  }
  return String(input);
}

function buildSkillCards(items: unknown[]): Sp03CardItem[] {
  return items
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const data = item as Record<string, unknown>;
      const qualityClass = getQualityClass(data.品质);
      return {
        id: `skill-${index}-${String(data.名称 || '?')}`,
        name: String(data.名称 || '?'),
        cardClass: qualityClass || undefined,
        qualityClass: qualityClass || undefined,
        qualityPrefix: getQualityPrefix(data.品质) || undefined,
        type: normalizeText(data.类型) || undefined,
        tags: getSmartArray(data.标签),
        costs: getSmartArray(data.消耗),
        effect: normalizeEffect(data.效果),
        flavor: normalizeText(data.描述) || undefined,
      };
    });
}

function buildEquipCards(items: unknown[], prefix: string): Sp03CardItem[] {
  return items
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const data = item as Record<string, unknown>;
      const qualityClass = getQualityClass(data.品质);
      return {
        id: `${prefix}-${index}-${String(data.名称 || '?')}`,
        name: String(data.名称 || '?'),
        cardClass: qualityClass || undefined,
        qualityClass: qualityClass || undefined,
        qualityPrefix: getQualityPrefix(data.品质) || undefined,
        type: normalizeText(data.分类 || data.类型) || undefined,
        tags: getSmartArray(data.标签),
        effect: normalizeEffect(data.效果),
        flavor: normalizeText(data.描述) || undefined,
      };
    });
}

function buildDivinityCards(items: unknown[], typeLabel: string, keyPrefix: string): Sp03CardItem[] {
  return items
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const data = item as Record<string, unknown>;
      return {
        id: `${keyPrefix}-${index}-${String(data.名称 || '?')}`,
        name: String(data.名称 || '?'),
        cardClass: 'power',
        qualityClass: 'power',
        qualityPrefix: typeLabel,
        effect: normalizeEffect(data.效果 || data.描述),
      };
    });
}

function buildLawCards(items: unknown[]): Sp03CardItem[] {
  return items
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const data = item as Record<string, unknown>;
      return {
        id: `law-${index}-${String(data.名称 || '?')}`,
        name: String(data.名称 || '?'),
        cardClass: 'power',
        qualityClass: 'power',
        qualityPrefix: '法则',
        description: normalizeText(data.描述) || undefined,
        passive: normalizeText(data.被动效果) || undefined,
        active: normalizeText(data.主动效果) || undefined,
      };
    });
}

export interface Sp03RenderModel {
  name: string;
  info: string;
  infoColor: string;
  quote: string;
  quoteColor: string;
  attrs: Sp03AttrItem[];
  metaLines: Sp03MetaLine[];
  navItems: Sp03NavItem[];
  skillsSections: Sp03CardSection[];
  equipSections: Sp03CardSection[];
  ascensionSections: Sp03CardSection[];
  ascensionDeity: string;
  storySections: Sp03StorySection[];
  hasSkills: boolean;
  hasEquip: boolean;
  hasAscension: boolean;
  hasStory: boolean;
  raceColor: string;
}

export function buildSp03RenderModel(data: CharacterData, quote?: string): Sp03RenderModel {
  const theme = resolveTheme(data);
  const charName = String(data.姓名 || 'Unknown');

  const classStr = getSmartArray(data.职业).join(' / ');
  const infoParts = [`LV.${data.等级 || '?'}`];
  if (classStr) infoParts.push(classStr);
  if (hasText(data.生命层级)) infoParts.push(String(data.生命层级));
  const info = infoParts.join(' / ');

  const attrKeys: Array<Sp03AttrItem['key']> = ['力量', '敏捷', '体质', '智力', '精神'];
  const attrs: Sp03AttrItem[] = attrKeys.map(key => {
    const raw = String((data.属性 && data.属性[key]) || '0').trim();
    return {
      key,
      label: attributeLabelMap[key],
      flagKey: attrFlagMap[key],
      total: parseAttributeValue(raw),
      raw,
    };
  });

  const identityStr = getSmartArray(data.身份).join(' / ');
  const metaLines: Sp03MetaLine[] = [
    { label: '姓名', value: charName },
    { label: '生命层级', value: String(data.生命层级 || '-'), color: theme.tierHex },
    { label: '等级', value: String(data.等级 || '-') },
    { label: '种族', value: String(data.种族 || '其他') },
  ];

  if (identityStr) metaLines.push({ label: '身份', value: identityStr });
  if (classStr) metaLines.push({ label: '职业', value: classStr });

  const skills = hasArrayContent(data.技能) ? buildSkillCards(data.技能) : [];
  const equip = hasArrayContent(data.装备) ? buildEquipCards(data.装备, 'equip') : [];
  const items = hasArrayContent(data.道具) ? buildEquipCards(data.道具, 'item') : [];
  const special = hasArrayContent(data.特殊物品) ? buildEquipCards(data.特殊物品, 'special') : [];

  const skillsSections: Sp03CardSection[] = [{ key: 'skills-main', cards: skills }];

  const equipSections: Sp03CardSection[] = [
    { key: 'equip-main', cards: equip },
    { key: 'equip-item', title: items.length > 0 ? '道具' : undefined, cards: items },
    { key: 'equip-special', title: special.length > 0 ? '特殊物品' : undefined, cards: special },
  ].filter(section => section.cards.length > 0);

  const divData = (data.登神长阶 || {}) as Record<string, unknown>;
  const deity = hasText(divData.神位) ? String(divData.神位) : hasText(data.神位) ? String(data.神位) : '';
  const kingdom = (divData.神国 || data.神国 || null) as Record<string, unknown> | null;

  const elements = hasArrayContent(divData.要素)
    ? buildDivinityCards(divData.要素, '要素', 'elem')
    : hasArrayContent(data.要素)
      ? buildDivinityCards(data.要素, '要素', 'elem')
      : [];

  const powers = hasArrayContent(divData.权能)
    ? buildDivinityCards(divData.权能, '权能', 'power')
    : hasArrayContent(data.权能)
      ? buildDivinityCards(data.权能, '权能', 'power')
      : [];

  const laws = hasArrayContent(divData.法则)
    ? buildLawCards(divData.法则)
    : hasArrayContent(data.法则)
      ? buildLawCards(data.法则)
      : [];

  const ascensionSections: Sp03CardSection[] = [];
  if (kingdom && hasText(kingdom.名称)) {
    ascensionSections.push({
      key: 'div-kingdom',
      cards: [
        {
          id: `kingdom-${String(kingdom.名称)}`,
          name: String(kingdom.名称),
          cardClass: 'mythic',
          qualityClass: 'mythic',
          qualityPrefix: '神国',
          effect: normalizeText(kingdom.描述) || '无',
        },
      ],
    });
  }

  if (elements.length > 0) ascensionSections.push({ key: 'div-elements', title: '要素', cards: elements });
  if (powers.length > 0) ascensionSections.push({ key: 'div-powers', title: '权能', cards: powers });
  if (laws.length > 0) ascensionSections.push({ key: 'div-laws', title: '法则', cards: laws });

  const storySections: Sp03StorySection[] = [];
  if (hasText(data.性格)) storySections.push({ key: 'personality', title: '性格', content: normalizeText(data.性格) });
  if (hasText(data.喜爱)) storySections.push({ key: 'likes', title: '喜爱', content: normalizeText(data.喜爱) });
  if (hasText(data.外貌特质))
    storySections.push({ key: 'appearance', title: '外貌特质', content: normalizeText(data.外貌特质) });
  if (hasText(data.衣物装饰))
    storySections.push({ key: 'dress', title: '衣物装饰', content: normalizeText(data.衣物装饰) });
  if (hasText(data.背景故事))
    storySections.push({ key: 'story', title: '背景故事', content: normalizeText(data.背景故事) });

  const hasSkills = skills.length > 0;
  const hasEquip = equipSections.length > 0;
  const hasAscension = !!deity || ascensionSections.length > 0;
  const hasStory = storySections.length > 0;

  const navItems: Sp03NavItem[] = [
    { key: 'home', label: '首页', iconClass: 'icon-home', visible: true },
    { key: 'status', label: '状态', iconClass: 'icon-stat', visible: true },
    { key: 'skill', label: '技能', iconClass: 'icon-sword', visible: hasSkills },
    { key: 'equip', label: '装备', iconClass: 'icon-bag', visible: hasEquip },
    { key: 'ascension', label: '登神', iconClass: 'icon-star', visible: hasAscension },
    { key: 'story', label: '档案', iconClass: 'icon-book', visible: hasStory },
  ];

  const quoteText = hasText(quote)
    ? String(quote)
    : hasText(data.性格)
      ? normalizeText(data.性格).slice(0, 80) + (normalizeText(data.性格).length > 80 ? '...' : '')
      : '暂无语录';

  const quoteColor = hasText(quote) ? '#ccc' : '#aaa';

  let raceKey = '其他';
  for (const k of Object.keys(raceColorMap)) {
    if (String(data.种族 || '').includes(k)) {
      raceKey = k;
      break;
    }
  }

  return {
    name: charName,
    info,
    infoColor: theme.tierHex,
    quote: quoteText,
    quoteColor,
    attrs,
    metaLines,
    navItems,
    skillsSections,
    equipSections,
    ascensionSections,
    ascensionDeity: deity,
    storySections,
    hasSkills,
    hasEquip,
    hasAscension,
    hasStory,
    raceColor: raceColorMap[raceKey] || raceColorMap.其他,
  };
}
