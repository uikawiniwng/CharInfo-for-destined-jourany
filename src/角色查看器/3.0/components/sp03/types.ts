export type Sp03PageKey = 'home' | 'status' | 'skill' | 'equip' | 'ascension' | 'story';

export interface Sp03AttrItem {
  key: '力量' | '敏捷' | '体质' | '智力' | '精神';
  label: 'STR' | 'AGI' | 'CON' | 'INT' | 'SPR';
  flagKey: 'str' | 'agi' | 'con' | 'int' | 'spr';
  total: number;
  raw: string;
}

export interface Sp03MetaLine {
  label: string;
  value: string;
  color?: string;
}

export interface Sp03CardItem {
  id: string;
  name: string;
  cardClass?: string;
  qualityClass?: string;
  qualityPrefix?: string;
  type?: string;
  tags?: string[];
  costs?: string[];
  effect?: string;
  flavor?: string;
  description?: string;
  passive?: string;
  active?: string;
}

export interface Sp03CardSection {
  key: string;
  title?: string;
  cards: Sp03CardItem[];
}

export interface Sp03StorySection {
  key: string;
  title: string;
  content: string;
}

export interface Sp03NavItem {
  key: Sp03PageKey;
  label: string;
  iconClass: string;
  visible: boolean;
}
