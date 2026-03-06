import { load } from 'js-yaml';
import type { CharacterData, FriendlyYamlError, ParseResult } from '../types';

function visualizeForDisplay(str: unknown): string {
  return String(str ?? '')
    .replace(/\t/g, '⇥')
    .replace(/\u00A0/g, '⍽');
}

export function cleanYaml(yamlStr: string): string {
  if (!yamlStr) return '';

  const normalized = yamlStr
    .replace(/\u00A0/g, ' ')
    .replace(/\t/g, '  ')
    .replace(/】/g, ']')
    .replace(/【/g, '[');

  const lines = normalized.split('\n');
  const sensitiveKeys = [
    '身份',
    '职业',
    '性格',
    '喜爱',
    '外貌特质',
    '衣物装饰',
    '背景故事',
    '描述',
    '效果',
    '标签',
    '消耗',
    '类型',
    '品质',
    '神位',
    '名称',
    '姓名',
    '种族',
    '等级',
    '生命层级',
  ];
  const attrKeys = ['力量', '敏捷', '体质', '智力', '精神'];

  const cleanedLines = lines.map(line => {
    line = line.replace(/^(\s*)(-\s*)?([-\w\u4e00-\u9fa5]+)\s*：/, (_m, indent, dash, key) => {
      return `${indent}${dash || ''}${key}:`;
    });

    const match = line.match(/^(\s*)(-\s*)?([-\w\u4e00-\u9fa5]+)\s*:\s*(.*)$/);
    if (!match) return line;

    const indent = match[1];
    const dash = match[2] || '';
    const key = match[3];
    let val = match[4].trim();

    if (!val) return line;
    if (val.startsWith('|') || val.startsWith('>')) return line;

    if (attrKeys.some(k => key.includes(k))) {
      if ((/[+=]/.test(val) || val.includes('{')) && !/^["'].*["']$/.test(val)) {
        val = val.replace(/"/g, '\\"');
        return `${indent}${dash}${key}: "${val}"`;
      }
    }

    const isSensitive = sensitiveKeys.some(k => key.includes(k));
    const hasDangerousChars = /[{}[\]]/.test(val);
    const hasQuoteInside = val.includes('"');
    const isFullyQuoted = /^["'].*["']$/.test(val);

    if ((isSensitive || hasDangerousChars || hasQuoteInside) && !isFullyQuoted) {
      val = val.replace(/"/g, '\\"');
      return `${indent}${dash}${key}: "${val}"`;
    }

    return line;
  });

  return cleanedLines.join('\n');
}

function buildFriendlyYamlError(err: unknown, originalYaml: string, cleanedYaml: string): FriendlyYamlError {
  const e = err as { reason?: string; message?: string; mark?: { line?: number; column?: number } };
  const mark = e?.mark;
  const message = String(e?.reason || e?.message || String(err));

  if (!mark || typeof mark.line !== 'number') {
    return { message };
  }

  const line = mark.line;
  const column = typeof mark.column === 'number' ? mark.column : 0;

  const originalLines = String(originalYaml ?? '').split('\n');
  const cleanedLines = String(cleanedYaml ?? '').split('\n');

  const originalLine = originalLines[line] ?? '';
  const cleanedLine = cleanedLines[line] ?? '';

  const cleanedVisual = visualizeForDisplay(cleanedLine);
  const originalVisual = visualizeForDisplay(originalLine);

  const caretPad = ' '.repeat(Math.max(0, Math.min(column, cleanedVisual.length)));
  const caretLine = `${caretPad}^`;

  return {
    message,
    line,
    column,
    cleanedLine: cleanedVisual,
    originalLine: originalVisual,
    caretLine,
  };
}

export function parseCharacterYaml(yamlText: string): ParseResult {
  const cleaned = cleanYaml(yamlText);
  try {
    const data = load(cleaned) as CharacterData | null;
    if (!data) throw new Error('解析结果为空');
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: buildFriendlyYamlError(err, yamlText, cleaned),
    };
  }
}
