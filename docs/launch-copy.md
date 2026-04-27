# Launch copy — v0.1.0

Ready-to-paste announcement text for the v0.1.0 public release.
Pick the version that fits the channel; trim or fold as needed.

> Repo: <https://github.com/everettjf/ReadWrite>  
> Release: <https://github.com/everettjf/ReadWrite/releases/tag/v0.1.0>  
> Discussion: <https://github.com/everettjf/ReadWrite/discussions/1>

---

## 中文 — 公众号 / 即刻 / 小红书 / V2EX 长版

**ReadWrite —— 左边读，右边写，中间 AI 帮你写**

我把过去几个月断断续续做的一个桌面 app 开源了：[ReadWrite](https://github.com/everettjf/ReadWrite)。一句话：**左边一个 reader（网页 / GitHub / PDF / EPUB / 代码目录），右边一个 Markdown 编辑器，中间靠 AI 把左边的内容变成右边的初稿。**

为什么做这个：

读一篇论文 / 看一个 repo / 翻一份 PDF 之后想写点什么 —— 浏览器里 alt-tab 切来切去，截图、复制、粘贴；笔记 app 里又看不到原始材料。两边都缺一半。**ReadWrite 就一个窗口搞定**：内容在左，笔记在右，框选截图直接以相对路径落到文档的 `images/` 目录里。

最特别的一点 —— AI 那部分。它有两条独立的路：

- **短动作**（润色 / 翻译 / 总结 / 解释 / 自定义改写）走 HTTP API：OpenAI / Anthropic / Google / DeepSeek / OpenAI 兼容（Moonshot / Kimi / Ollama / Azure 都行）任选。流式输出，Cursor 风格的 diff 对比，确认了才落到正文。
- **长文生成**（"根据左边内容生成博客"）走**你本地装的 CLI** —— Claude Code / OpenAI Codex / Google Gemini / OpenCode / 任意自定义命令。**这条路完全用你已有的订阅，不需要再配额外 API key。** 选一个写作风格（技术深度 / 随笔 / 教程 / 公众号体 / 科普 / 简报）+ 模板（技术博客 / 读书笔记 / 新闻摘要），点 Generate，看着稿子流式生成出来。

支持 macOS / Windows / Linux。下载地址：<https://github.com/everettjf/ReadWrite/releases/tag/v0.1.0>

还有一些"顺手"的功能，篇幅有限不展开：多 workspace（Obsidian 式文件夹）、PDF 连续滚动阅读、一键复制 / 发布到微信公众号（带 inline style，无 `<style>` 标签）、API key 走 OS Keychain 加密存储、关闭窗口自动保存 reader tab session …… 试一下就知道。

第一个公开版本，bug 肯定有。欢迎 issue / PR / Star，更欢迎告诉我哪个 provider 在你机器上跑不通 —— 这是这个项目最容易破在边缘场景的部分。

GitHub: <https://github.com/everettjf/ReadWrite>

---

## 中文 — Twitter / 即刻 短版

🎉 开源了一个桌面 app：**ReadWrite**

左边一个 reader（网页 / PDF / EPUB / GitHub repo），右边 Markdown 编辑器，中间 AI 帮你把左边的内容写成右边的初稿。

最特别：**长文生成走你本地的 Claude Code / Codex / Gemini CLI** —— 用你已有的订阅，不用再配 API key。

mac / win / linux 都能下：
<https://github.com/everettjf/ReadWrite/releases/tag/v0.1.0>

---

## English — long form (HN, Reddit, Lobsters)

**ReadWrite — a side-by-side reader + Markdown editor that uses your existing AI CLI for long-form drafts**

I just open-sourced a cross-platform Electron app I've been building for the last few months: <https://github.com/everettjf/ReadWrite>.

The core idea: there's a class of work — reading a paper and writing about it, watching a tutorial and turning it into notes, browsing a repo and drafting a blog post — that fits neither a browser tab nor a notes app. ReadWrite is one window: a multi-tab reader on the left (web / GitHub / PDF / EPUB / local code), a Markdown editor on the right, and a region-snip tool that drops screenshots straight into the doc as a relative-path image.

The non-obvious bit is how AI works. There are two surfaces:

1. **Inline actions** (Polish / Translate / Summarize / Explain) hit an HTTP API. Pick a provider — OpenAI, Anthropic, Google, DeepSeek, or any OpenAI-compatible endpoint (Ollama, Azure, Moonshot, …). Streams in, Cursor-style diff review before anything in your doc changes.

2. **Long-form generation** ("Generate a blog from the active reader tab") spawns your **locally-installed AI CLI** — Claude Code, OpenAI Codex, Google Gemini, OpenCode, or any custom command. **If you already pay for one of those subscriptions, ReadWrite uses the seat you have**; no extra API key, no extra dollar. Pick a writing style × template, watch the draft stream in, route to a new doc / append / replace.

Other things in v0.1.0 that I won't go on about: Obsidian-style multi-workspace, PDF continuous-scroll, copy-to-WeChat with inline styles, API keys behind OS keychain via Electron `safeStorage`, per-workspace tab session restore.

Built with Electron 33, React 18, Milkdown 7, CodeMirror 6, the Vercel AI SDK, better-sqlite3. Source-available under MIT.

Downloads (macOS .dmg / Windows .exe / Linux AppImage / .deb): <https://github.com/everettjf/ReadWrite/releases/tag/v0.1.0>

It's the first public release — bugs are guaranteed. Issue tracker is the right place. Provider edge cases (Codex / Gemini / OpenCode flags drift between versions) are the most likely failure mode; please tell me what flag misfired on your version.

Discussion: <https://github.com/everettjf/ReadWrite/discussions/1>

---

## English — short (Twitter)

🎉 Open-sourced **ReadWrite** — a desktop app where the left pane reads (web / PDF / EPUB / GitHub repo) and the right pane writes (Markdown).

Long-form AI generation runs through your local **Claude Code / Codex / Gemini CLI** — uses your existing subscription, no extra API key.

mac / win / linux:
<https://github.com/everettjf/ReadWrite/releases/tag/v0.1.0>
