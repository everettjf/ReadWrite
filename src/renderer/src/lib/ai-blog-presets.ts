import type { AIPresetEntry } from '@shared/types';
import type { ExtractedSource } from './reader-extract';

/**
 * A reusable AI preset — either a writing style (how to write) or a
 * template (what kind of artifact to produce). Both share the same
 * shape so the editing UI in Settings can treat them uniformly.
 *
 * `builtIn` distinguishes hard-coded presets (immutable in the UI)
 * from user-added ones loaded from settings.
 */
export interface AIPreset extends AIPresetEntry {
  builtIn?: boolean;
}

/**
 * The six built-in writing styles. The user can clone any of these
 * into a custom preset later (Settings → Style/Template editor).
 */
export const BUILT_IN_STYLES: AIPreset[] = [
  {
    id: 'tech-deep',
    name: '技术深度 (Technical deep-dive)',
    description: '长文，含代码、机制级讲解',
    builtIn: true,
    systemPrompt:
      'Adopt the voice of a senior engineer writing for technical peers. Be precise about mechanisms; include code snippets in fenced Markdown blocks where relevant; preserve technical terminology rather than dumbing it down. Long paragraphs are fine when an idea benefits from continuity. Avoid filler and corporate-blog cliches.',
  },
  {
    id: 'casual',
    name: '随笔 (Casual / personal)',
    description: '第一人称口语，可有观点',
    builtIn: true,
    systemPrompt:
      'Write in first person, conversational tone. Opinions and personal asides are welcome. Vary sentence rhythm — mix short and long. Use paragraph breaks for emphasis. Avoid corporate-blog cliches and listicle structure.',
  },
  {
    id: 'tutorial',
    name: '教程 (Tutorial / step-by-step)',
    description: '编号步骤、明确产出',
    builtIn: true,
    systemPrompt:
      'Structure as a step-by-step tutorial. Use numbered lists for actions. Use fenced code blocks for commands and snippets. Use short headings for each major phase. Each step should have a clear outcome the reader can verify before moving on.',
  },
  {
    id: 'wechat-oa',
    name: '公众号体 (WeChat OA)',
    description: '强 hook、短段落、移动端友好',
    builtIn: true,
    systemPrompt:
      '面向中文公众号读者写作。第一句必须是强 hook，让人想继续读。段落不超过 3 行，方便移动端阅读。每 200-300 字插入一个加粗小标题。可以适度使用 emoji（每段 0-1 个），但不滥用。结尾给一句金句或一个互动问题。',
  },
  {
    id: 'pop-science',
    name: '科普 (Pop-science)',
    description: '大白话，类比，零术语',
    builtIn: true,
    systemPrompt:
      'Explain like to a smart non-specialist friend. Use analogies and concrete examples. Define jargon on first use, or avoid it entirely. Maintain a clear narrative arc — what is the question, what did we learn, why does it matter.',
  },
  {
    id: 'brief',
    name: '简报 (Concise summary)',
    description: '要点 bullet 优先',
    builtIn: true,
    systemPrompt:
      'Bullet-driven brief. Lead with the headline / key fact in the first line. Use short bullets for sub-points; each bullet should stand alone. Ruthlessly cut filler words. Aim for skim-readability — a reader should get the gist in 30 seconds.',
  },
];

/**
 * The three built-in templates — what kind of artifact to produce.
 */
export const BUILT_IN_TEMPLATES: AIPreset[] = [
  {
    id: 'tech-blog',
    name: '技术博客 (Tech blog)',
    description: '深度分析 + 代码示例',
    builtIn: true,
    systemPrompt:
      'Produce a technical blog post analyzing the source material. Structure: hook intro / context / mechanism or analysis / takeaway. Include code snippets where the source warrants. Close with "what this changes" or "what to try next".',
  },
  {
    id: 'reading-notes',
    name: '读书笔记 (Reading notes)',
    description: '关键观点 + 个人思考',
    builtIn: true,
    systemPrompt:
      'Produce reading notes from the source material. Structure: 1) what the author argues, 2) the strongest 2-3 points (with brief evidence), 3) my take — where I agree, where I would push back. Keep your own voice present.',
  },
  {
    id: 'news-summary',
    name: '新闻摘要 (News summary)',
    description: '客观转述事实',
    builtIn: true,
    systemPrompt:
      'Produce a news-style summary. Lead with 5W1H in the first paragraph. Stick to facts in the source; avoid editorializing. Quote key claims with proper attribution. Close with what is still unknown.',
  },
];

/**
 * Merge built-in + user-defined presets. Users can't shadow built-in
 * IDs; if a custom preset shares an ID with a built-in, the built-in
 * still wins (defensive — settings could in theory be hand-edited).
 */
export function mergeStyles(custom: AIPresetEntry[] | undefined): AIPreset[] {
  const userOnly = (custom ?? []).filter((c) => !BUILT_IN_STYLES.some((b) => b.id === c.id));
  return [...BUILT_IN_STYLES, ...userOnly.map((c) => ({ ...c, builtIn: false }))];
}

export function mergeTemplates(custom: AIPresetEntry[] | undefined): AIPreset[] {
  const userOnly = (custom ?? []).filter((c) => !BUILT_IN_TEMPLATES.some((b) => b.id === c.id));
  return [...BUILT_IN_TEMPLATES, ...userOnly.map((c) => ({ ...c, builtIn: false }))];
}

export type Length = 'short' | 'medium' | 'long';
export type Lang = 'zh' | 'en';

const TARGET_WORDS: Record<Length, Record<Lang, number>> = {
  short: { zh: 600, en: 400 },
  medium: { zh: 1200, en: 800 },
  long: { zh: 2500, en: 1700 },
};

export interface BuildPromptOpts {
  template: AIPreset;
  style: AIPreset;
  language: Lang;
  length: Length;
  extraInstructions?: string;
  source: ExtractedSource;
}

const MAX_SOURCE_CHARS = 50_000;

/**
 * Compose the full prompt sent to Claude. Template = artifact shape,
 * Style = voice, plus language + length constraints, an optional
 * one-shot instruction, and the extracted source material.
 */
export function buildBlogPrompt(opts: BuildPromptOpts): string {
  const targetWords = TARGET_WORDS[opts.length][opts.language];
  const langLabel = opts.language === 'zh' ? 'Chinese (Simplified)' : 'English';
  const truncated = opts.source.text.length > MAX_SOURCE_CHARS;
  const sourceText = truncated
    ? `${opts.source.text.slice(0, MAX_SOURCE_CHARS)}\n\n[SOURCE TRUNCATED — ${opts.source.text.length - MAX_SOURCE_CHARS} additional characters omitted]`
    : opts.source.text;

  const sections: string[] = [
    '# Task',
    opts.template.systemPrompt,
    '',
    '# Voice',
    opts.style.systemPrompt,
    '',
    '# Constraints',
    `- Output language: ${langLabel}`,
    `- Target length: about ${targetWords} words (give or take 20%)`,
    '- Output format: Markdown only',
    '- Do NOT include preamble, meta-commentary, or "Here is the article…"',
    '- The Markdown you return is the final artifact — start with the title or first paragraph directly',
  ];

  if (opts.extraInstructions && opts.extraInstructions.trim()) {
    sections.push('', '# Extra instructions', opts.extraInstructions.trim());
  }

  sections.push(
    '',
    '# Source material',
    `Title: ${opts.source.title}`,
    `Source: ${opts.source.source}`,
    '',
    sourceText,
  );

  return sections.join('\n');
}
