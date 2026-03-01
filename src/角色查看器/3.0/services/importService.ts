import type { CharacterData } from '../types';
import { getSmartArray, parseAttributeValue } from './common';

type VariableScope = { type: 'message'; message_id: 'latest' };

type TavernApiLike = {
  getVariables?: (scope: VariableScope) => Promise<Record<string, any>>;
  insertOrAssignVariables?: (payload: Record<string, any>, scope: VariableScope) => Promise<void>;
  getOrCreateChatWorldbook?: (chat: 'current', desiredName: string) => Promise<string>;
  createWorldbookEntries?: (bookName: string, entries: Array<Record<string, any>>) => Promise<void>;
  getChatWorldbookName?: (chat: 'current') => Promise<string | null>;
};

function getApi(): TavernApiLike {
  return ((window as any).TavernHelper || (window.parent as any)?.TavernHelper || window) as TavernApiLike;
}

function ensureString(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ');
  return val ? String(val) : '';
}

function ensureArray(val: unknown): string[] {
  return getSmartArray(val);
}

function arrayToMap(arr: unknown, type: 'skill' | 'equip' | 'divinity'): Record<string, Record<string, any>> {
  const map: Record<string, Record<string, any>> = {};
  if (!Array.isArray(arr)) return map;

  arr.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const anyItem = item as Record<string, any>;
    if (!anyItem.名称) return;

    const { 名称, ...rest } = anyItem;
    const processed: Record<string, any> = { ...rest };

    if (processed.标签) processed.标签 = ensureArray(processed.标签);
    else if (type === 'skill' || type === 'equip') processed.标签 = [];

    if (type !== 'divinity') {
      if (typeof processed.效果 === 'string') processed.效果 = { 描述: processed.效果 };
      else if (!processed.效果) processed.效果 = {};
    }

    if (type === 'equip') {
      processed.品质 = processed.品质 || '未知';
      processed.类型 = processed.分类 || processed.类型 || '未知';
      processed.描述 = processed.描述 || '';
      processed.位置 = processed.位置 || '';
    } else if (type === 'skill') {
      processed.品质 = processed.品质 || '未知';
      processed.类型 = processed.类型 || '未知';
      processed.消耗 = processed.消耗 ? ensureString(processed.消耗) : '';
      processed.描述 = processed.描述 || '';
    }

    map[String(名称)] = processed;
  });

  return map;
}

export async function importToMvuVariables(data: CharacterData): Promise<void> {
  const api = getApi();
  if (typeof api.getVariables !== 'function' || typeof api.insertOrAssignVariables !== 'function') {
    throw new Error('未检测到 TavernHelper API (getVariables / insertOrAssignVariables)。');
  }

  const charName = data.姓名 || 'Unknown';
  const targetScope: VariableScope = { type: 'message', message_id: 'latest' };

  const mvuData = {
    在场: true,
    生命层级: data.生命层级 || '第一层级/普通层级',
    等级: parseInt(String(data.等级 ?? '1'), 10) || 1,
    种族: data.种族 || '未知',
    身份: ensureArray(data.身份),
    职业: ensureArray(data.职业),
    性格: ensureString(data.性格).trim(),
    喜爱: ensureString(data.喜爱).trim(),
    外貌: ensureString(data.外貌特质).trim(),
    着装: ensureString(data.衣物装饰).trim(),
    属性: {
      力量: parseAttributeValue(data.属性?.力量),
      敏捷: parseAttributeValue(data.属性?.敏捷),
      体质: parseAttributeValue(data.属性?.体质),
      智力: parseAttributeValue(data.属性?.智力),
      精神: parseAttributeValue(data.属性?.精神),
    },
    技能: arrayToMap(data.技能, 'skill'),
    装备: arrayToMap(data.装备, 'equip'),
    登神长阶: {
      是否开启: !!(data.登神长阶 || (data.生命层级 && String(data.生命层级).includes('神'))),
      神位: data.登神长阶?.神位 || data.神位 || '',
      神国: {
        名称: data.登神长阶?.神国?.名称 || data.神国?.名称 || '',
        描述: data.登神长阶?.神国?.描述 || data.神国?.描述 || '',
      },
      要素: arrayToMap(data.登神长阶?.要素 || data.要素, 'divinity'),
      权能: arrayToMap(data.登神长阶?.权能 || data.权能, 'divinity'),
      法则: arrayToMap(data.登神长阶?.法则 || data.法则, 'divinity'),
    },
    命定契约: false,
    好感度: 0,
    心里话: '',
    背景故事: data.背景故事 || '',
  };

  let prefix = 'stat_data.';
  let currentVars: Record<string, any> | null = null;

  try {
    currentVars = await api.getVariables(targetScope);
    if (currentVars?.命定系统) prefix = '';
    else if (currentVars?.stat_data) prefix = 'stat_data.';
  } catch {
    prefix = 'stat_data.';
  }

  const keepIfPresent = (val: unknown) => (val === undefined || val === null ? undefined : val);

  const candidates: Array<Record<string, any> | undefined> = [];
  if (prefix === 'stat_data.') {
    candidates.push(currentVars?.stat_data?.命定系统?.关系列表?.[charName]);
    candidates.push(currentVars?.stat_data?.[charName]);
    candidates.push(currentVars?.stat_data?.ThatNPC);
  } else {
    candidates.push(currentVars?.命定系统?.关系列表?.[charName]);
  }

  let preservedFavor: unknown = undefined;
  let preservedHeart: unknown = undefined;
  for (const entry of candidates) {
    if (!entry) continue;
    if (preservedFavor === undefined) preservedFavor = keepIfPresent(entry?.好感度);
    if (preservedHeart === undefined) preservedHeart = keepIfPresent(entry?.心里话);
  }

  if (preservedFavor !== undefined) (mvuData as any).好感度 = preservedFavor;
  if (preservedHeart !== undefined) (mvuData as any).心里话 = preservedHeart;

  const updatePayload: Record<string, any> = {};
  if (prefix === 'stat_data.') {
    updatePayload.stat_data = { 命定系统: { 关系列表: { [charName]: mvuData } } };
  } else {
    updatePayload.命定系统 = { 关系列表: { [charName]: mvuData } };
  }

  await api.insertOrAssignVariables(updatePayload, targetScope);
}

export async function saveToChatWorldbook(data: CharacterData, originalYaml: string): Promise<void> {
  const api = getApi();
  if (typeof api.getOrCreateChatWorldbook !== 'function' || typeof api.createWorldbookEntries !== 'function') {
    throw new Error('未检测到 Worldbook API。');
  }

  const characterName = data.姓名 || 'Unknown';
  const shortName = characterName.split(/[·\s]/)[0];
  const lorebookKey = shortName && shortName.trim().length > 0 ? shortName : characterName;

  let bookName: string | null = null;
  if (typeof api.getChatWorldbookName === 'function') {
    bookName = await api.getChatWorldbookName('current');
  }

  if (!bookName) {
    const now = new Date();
    const timeStr = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}_${now.getHours()}h_${now.getMinutes()}m_${now.getSeconds()}s`;
    const desiredName = `命定之诗-charinfo-Chat_Book_${timeStr}`;
    bookName = await api.getOrCreateChatWorldbook('current', desiredName);
  }

  const newEntry = {
    name: characterName,
    enabled: true,
    strategy: { type: 'selective', keys: [lorebookKey] },
    position: { type: 'after_character_definition', order: 152 },
    content: originalYaml,
  };

  await api.createWorldbookEntries(bookName, [newEntry]);
}
