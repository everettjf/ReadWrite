/**
 * WeChat 公众号 export themes — a Record<selector, inlineStyle>.
 *
 * Why per-selector inline styles instead of a single `<style>` block: the
 * mp.weixin.qq.com editor strips `<style>` tags on paste. The only reliable
 * survival mechanism is `style="..."` on every element. We use !important
 * defensively because the WeChat editor injects its own cascade post-paste.
 *
 * Modeled on Spute/obsidian-copy-to-mp's themes file.
 */

export type ThemeRules = Partial<
  Record<
    | 'container'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'p'
    | 'a'
    | 'strong'
    | 'em'
    | 'del'
    | 'ul'
    | 'ol'
    | 'li'
    | 'blockquote'
    | 'code'
    | 'pre'
    | 'hr'
    | 'img'
    | 'table'
    | 'th'
    | 'td'
    | 'tr',
    string
  >
>;

export interface WechatTheme {
  id: string;
  label: string;
  rules: ThemeRules;
}

const i = (s: string): string => s.trim().replace(/;\s*$/, '');

const DEFAULT: ThemeRules = {
  container: i(`
    max-width: 100%;
    color: #3f3f3f;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
    font-size: 16px;
    line-height: 1.75;
    letter-spacing: 0.05em;
    word-break: break-word;
    padding: 4px 0;
  `),
  h1: i(`
    margin: 1.6em 0 0.8em 0;
    font-size: 1.6em;
    font-weight: 700;
    line-height: 1.4;
    color: #1f1f1f;
  `),
  h2: i(`
    margin: 1.4em 0 0.7em 0;
    font-size: 1.35em;
    font-weight: 700;
    line-height: 1.4;
    color: #1f1f1f;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #ececec;
  `),
  h3: i(`
    margin: 1.2em 0 0.6em 0;
    font-size: 1.18em;
    font-weight: 700;
    line-height: 1.4;
    color: #1f1f1f;
  `),
  h4: i(`margin: 1em 0 0.5em 0; font-size: 1.05em; font-weight: 700; color: #1f1f1f;`),
  h5: i(`margin: 1em 0 0.5em 0; font-size: 1em; font-weight: 700; color: #1f1f1f;`),
  h6: i(`margin: 1em 0 0.5em 0; font-size: 0.95em; font-weight: 700; color: #6a6a6a;`),
  p: i(`margin: 1em 0; line-height: 1.75; letter-spacing: 0.05em;`),
  a: i(`color: #576b95; text-decoration: none; word-break: break-all;`),
  strong: i(`font-weight: 700; color: #1f1f1f;`),
  em: i(`font-style: italic;`),
  del: i(`text-decoration: line-through; color: #999;`),
  ul: i(`margin: 1em 0; padding-left: 1.6em; list-style: disc;`),
  ol: i(`margin: 1em 0; padding-left: 1.6em; list-style: decimal;`),
  li: i(`margin: 0.4em 0; line-height: 1.75;`),
  blockquote: i(`
    margin: 1em 0;
    padding: 0.6em 1em;
    border-left: 4px solid #d0d0d0;
    background: #f7f7f7;
    color: #555;
  `),
  code: i(`
    background: #f4f4f4;
    color: #c7254e;
    padding: 2px 6px;
    margin: 0 2px;
    border-radius: 3px;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.92em;
    word-break: break-word;
  `),
  pre: i(`
    margin: 1em 0;
    padding: 14px 16px;
    background: linear-gradient(to bottom, #2a2c33 0%, #383a42 8px, #383a42 100%);
    border-radius: 6px;
    overflow-x: auto;
    line-height: 1.5;
  `),
  hr: i(`border: none; border-top: 1px solid #e6e6e6; margin: 2em 0;`),
  img: i(`max-width: 100%; height: auto; display: block; margin: 1em auto; border-radius: 4px;`),
  table: i(`
    margin: 1em 0;
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95em;
  `),
  th: i(`
    background: #f4f4f4;
    border: 1px solid #d0d0d0;
    padding: 8px 12px;
    text-align: left;
    font-weight: 700;
  `),
  td: i(`border: 1px solid #d0d0d0; padding: 8px 12px;`),
  tr: i(``),
};

const SERIF: ThemeRules = {
  ...DEFAULT,
  container: i(`
    max-width: 100%;
    color: #2a2a2a;
    font-family: Georgia, "Times New Roman", "Songti SC", serif;
    font-size: 17px;
    line-height: 1.85;
    letter-spacing: 0.02em;
    word-break: break-word;
    padding: 4px 0;
  `),
  h1: i(`
    margin: 1.6em 0 0.8em 0;
    font-size: 1.7em;
    font-weight: 700;
    text-align: center;
    line-height: 1.4;
    color: #111;
  `),
  h2: i(`
    margin: 1.4em 0 0.7em 0;
    font-size: 1.4em;
    font-weight: 700;
    line-height: 1.4;
    color: #111;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 0.3em;
  `),
  blockquote: i(`
    margin: 1.2em 1em;
    padding: 0.4em 1em;
    border-left: 3px solid #b0b0b0;
    color: #555;
    font-style: italic;
  `),
};

const COMPACT: ThemeRules = {
  ...DEFAULT,
  container: i(`
    max-width: 100%;
    color: #333;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 15px;
    line-height: 1.6;
    word-break: break-word;
  `),
  p: i(`margin: 0.6em 0; line-height: 1.6;`),
  h1: i(`margin: 1em 0 0.5em 0; font-size: 1.4em; font-weight: 700;`),
  h2: i(`margin: 0.9em 0 0.45em 0; font-size: 1.2em; font-weight: 700;`),
  h3: i(`margin: 0.8em 0 0.4em 0; font-size: 1.05em; font-weight: 700;`),
  ul: i(`margin: 0.6em 0; padding-left: 1.4em; list-style: disc;`),
  ol: i(`margin: 0.6em 0; padding-left: 1.4em; list-style: decimal;`),
};

export const WECHAT_THEMES: WechatTheme[] = [
  { id: 'default', label: 'Default — sans, comfortable', rules: DEFAULT },
  { id: 'serif', label: 'Serif — long-form essays', rules: SERIF },
  { id: 'compact', label: 'Compact — denser', rules: COMPACT },
];

export function getTheme(id: string): WechatTheme {
  return WECHAT_THEMES.find((t) => t.id === id) ?? WECHAT_THEMES[0]!;
}

/** Hard-coded code-token color for `<pre><code>` content (matches Spute's choice). */
export const CODE_TEXT_STYLE = i(`
  color: #abb2bf;
  background: transparent;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 14px;
  white-space: pre;
  word-break: normal;
  line-height: 1.5;
`);
