# Black-box test plan — ReadWrite v0.1.0

A user-perspective end-to-end test pass. Each test is independent enough to run on its own; running the whole list top-to-bottom takes ~45–60 minutes.

Use the checkboxes to track progress. If a test fails, the **Troubleshooting** subsections at the bottom of each section tell you where to look.

---

## 0. Preconditions

- macOS 13+ / Windows 10+ / Linux with a desktop environment (GNOME / KDE).
- Either:
  - **Source build**: Node 20+, pnpm 9+, run `pnpm install && pnpm dev`. The DevTools window opens detached on launch.
  - **Released binary**: `.dmg` / `.exe` / `.AppImage` from the latest GitHub Release.
- A test markdown file with a few images is handy for the editor / WeChat tests, but not required — you'll create one as you go.
- Optional, only needed for AI tests: an **OpenAI-compatible API key**. Any of these work — OpenAI, DeepSeek, Moonshot, Azure OpenAI, a local Ollama at `http://localhost:11434/v1`.
- Optional, only needed for WeChat publish tests: a **WeChat 公众号** with AppID + AppSecret, and your machine's outbound IP added to the account's IP whitelist (公众号 → 开发 → 基本配置 → IP白名单).

> Throughout this doc, ⌘ = Cmd on macOS, Ctrl on Windows/Linux. The keyboard shortcut for region snip is **⇧⌘S** on macOS, **Ctrl+Shift+S** elsewhere.

---

## 1. First launch — workspace picker

- [ ] Launch the app for the first time (or with a clean SQLite — see Troubleshooting).
- [ ] **Expected**: Full-window onboarding screen titled "Welcome to ReadWrite" with two big options (Create new workspace / Open existing folder) and an empty "Recent workspaces" section.
- [ ] Click **Create a new workspace**.
- [ ] **Expected** (on macOS): three suggested parents appear, with **iCloud Drive** at the top, hint reading "Syncs across your Macs and iOS devices via iCloud."
- [ ] Pick iCloud Drive (or Documents if iCloud isn't enabled), keep the default name "My Notes".
- [ ] Click **Create workspace**.
- [ ] **Expected**: the picker closes and you land in the main 3-pane UI (sidebar / reader / editor). The title bar shows `📁 My Notes ▼` on the left.
- [ ] Open Finder and verify a folder named `My Notes` was created at `~/Library/Mobile Documents/com~apple~CloudDocs/My Notes` (or `~/Documents/My Notes`). It should be empty for now.

**Troubleshooting**

- _Got a "Loading…" forever screen_: open DevTools (`Cmd+Option+I` in dev mode) and look at the Console. Likely a settings-store load failure.
- _To reset to "first launch" again_: quit the app, then `rm -rf ~/Library/Application\ Support/readwrite/readwrite.sqlite` on macOS (or the equivalent on your platform). Next launch shows the picker.

---

## 2. Document lifecycle — autosave creates the folder

- [ ] In the editor (right pane), verify the default welcome content renders (a `# Welcome to ReadWrite` H1 plus a bullet list).
- [ ] Click into the editor, press `⌘A`, and type: `# 我的第一篇笔记` then Enter then `这是测试内容。`
- [ ] **Expected, within ~1.5s**: the doc filename appears in the title bar (something like `我的第一篇笔记.md`) and the dirty marker `·` flips to `✓`. The sidebar updates with a new doc named "我的第一篇笔记".
- [ ] Open Finder → workspace folder. Verify a subfolder `我的第一篇笔记/` exists with `我的第一篇笔记.md` inside and an empty `images/` directory beside it.
- [ ] Click the filename in the title bar.
- [ ] **Expected**: Finder reveals the doc folder.

**Troubleshooting**

- _Filename never appears_: autosave debounce is set in Settings → Editor → Autosave (default 1500ms, 0 disables). Make sure it's not 0.
- _Folder name has weird characters_: filename sanitization strips `\ / : * ? " < > |` and trims to 80 chars. That's intentional.

---

## 3. Multiple workspaces — switching

- [ ] Click the workspace dropdown in the title bar (`📁 My Notes ▼`) → **Create new workspace…**.
- [ ] Pick any parent folder; name it "Work".
- [ ] **Expected**: title bar workspace name changes to "Work". Sidebar empties (Work has no docs yet). Editor shows the welcome content again (no dirty doc carries across workspaces).
- [ ] Type a few characters in the editor; wait 1.5s. A doc folder is created inside `Work/`.
- [ ] Click the dropdown → click "My Notes".
- [ ] **Expected**: workspace switches back, sidebar shows `我的第一篇笔记`, the editor automatically reopens that document (because of the per-workspace last-doc memory).
- [ ] Switch back to Work → editor reopens that doc too.

**Troubleshooting**

- _Switch fails with "workspace folder does not exist"_: someone moved or deleted the folder externally. Use the dropdown's "Open existing folder…" to point at the new location.
- _Doc didn't restore_: the file may be missing on disk (e.g. iCloud not yet synced down on the new machine). The fallback is the welcome content.

---

## 4. Sidebar interactions

- [ ] In Finder, drag a `.md` file (or create one with `mkdir -p ~/iCloud Drive/My Notes/External Note && echo '# External' > ~/iCloud Drive/My Notes/External Note/External Note.md`) **into the active workspace folder**.
- [ ] **Expected, within ~1s**: the new doc appears in the sidebar without you clicking refresh.
- [ ] Type something into the sidebar's filter input near the top. Verify the list filters case-insensitively. Click `×` to clear.
- [ ] Click the active doc. Verify it stays selected (no flicker).
- [ ] Hover any doc → the `⋯` button appears. Click it.
- [ ] Test **Rename** — type a new name, hit OK. The folder + .md are renamed atomically. If it was the active doc, the editor reloads.
- [ ] Test **Reveal in Finder** — Finder opens with the doc folder selected.
- [ ] Test **Move to Trash** — confirms first, then the doc folder lands in the system Trash. Verify by opening Trash.
- [ ] In the title bar, click the `≡` panel-toggle icon (leftmost in the action group).
- [ ] **Expected**: the sidebar collapses; the layout becomes 2-pane reader/editor. Click again — sidebar comes back. State persists across app restart.

**Troubleshooting**

- _Auto-refresh isn't picking up Finder changes_: check that the change isn't inside an `images/` subfolder (those are deliberately ignored to avoid screenshot noise). The watcher debounces 400ms after the last event.

---

## 5. Reader — Web tab

- [ ] In the reader (middle pane), click `+` → in the dialog, type `https://news.ycombinator.com` and press Enter (or click "Open URL").
- [ ] **Expected**: A new tab opens, Hacker News loads. The address bar shows the resolved URL, the back/forward/reload buttons reflect navigation state.
- [ ] Click any link on HN → page navigates → back arrow works → forward arrow works → reload works.
- [ ] Click `+` again → type `facebook/react` → Enter.
- [ ] **Expected**: GitHub repo for `facebook/react` loads (this is the test that proves we're not using iframes — GitHub sets `X-Frame-Options: DENY`).
- [ ] Switch between the two tabs.
- [ ] **Expected**: When the active tab changes, the previous one is hidden but its state (scroll position, etc.) is preserved.

**Troubleshooting**

- _GitHub shows a blank page_: rare; usually means the WebContentsView lost its bounds. Resize the reader pane and it repaints. Filed as a known intermittent issue.
- _The reader doesn't accept clicks after a snip_: see Test 6 — the snip flow toggles native-view visibility; if it errors out mid-flow, the view can stay hidden. Restart the app to recover.

---

## 6. Region snip — the centerpiece flow

- [ ] With a web tab open and visible, press **⇧⌘S** (or click the ✂️ Crop button in the title bar).
- [ ] **Expected**: The reader pane "freezes" into a still image. The whole window dims. A hint "Drag to snip · Esc to cancel" appears at the top.
- [ ] Click and drag a rectangle on the snapshot. The drag area should "punch through" the dim, showing the snapshot crisp inside the rectangle. A `WIDTH × HEIGHT` label tracks live below the rectangle.
- [ ] Release the mouse.
- [ ] **Expected**:
  1. The dim and snapshot disappear; the live web tab returns.
  2. A toast at the bottom reads `Snipped W×H → inserted as images/snip-…png.`
  3. In the editor, a new image appears (rendered, not a broken-image icon) at the end of the document.
  4. In Finder → doc folder → `images/`, a PNG file `snip-<timestamp>.png` exists.
- [ ] Press `⌘V` somewhere outside the app (Notes, Slack, anywhere accepting an image paste). Verify the same image pastes.
- [ ] Now switch to a PDF tab (Test 7) and snip again. Same behavior — the snip works on the rendered DOM, not just web tabs.
- [ ] Press **⇧⌘S** with no reader tab open. Toast says "Nothing to snip — open a tab in the reader first."
- [ ] Press **⇧⌘S** then immediately press **Esc**. The overlay closes cleanly; no image saved or inserted.
- [ ] Drag a tiny < 6px rectangle. Treated as a click, the overlay cancels.

**Troubleshooting**

- _The snipped image shows as a broken-image icon in the editor_: usually CSP. Check DevTools → Console for `Refused to load the image` — that means the editor can't load `file://` URLs, which would be a regression of the `webSecurity: false` + `img-src ... file:` config. Ping me with the message.
- _After snip, the web tab is gone_: visibility didn't restore. Click another tab and back, or restart. We always restore in a `finally` block, but bugs happen.

---

## 7. Reader — PDF

- [ ] Click `+` → **PDF** → pick any `.pdf` from your disk.
- [ ] **Expected**: The first page renders. Toolbar shows `< 1 / N >` page navigation and zoom controls.
- [ ] Click `>` to advance pages; verify rendering. Use zoom + and -; verify the page rescales.
- [ ] Press ⇧⌘S, snip a region from the PDF page. Verify it lands in `images/` and inserts into the editor.
- [ ] Close the tab via the `×` on the tab strip.

**Troubleshooting**

- _PDF doesn't render_: open DevTools Console for any `pdf.worker` error. It usually means the worker import resolution failed — a build issue, not a runtime one.

---

## 8. Reader — EPUB

- [ ] Click `+` → **EPUB** → pick any `.epub` file. (You can grab a free one from Project Gutenberg — `https://www.gutenberg.org/ebooks/1342` for "Pride and Prejudice" has an .epub download.)
- [ ] **Expected**: The book renders in a paginated two-column-ish view. Arrow controls let you navigate.
- [ ] Snip something from the page. Verify the same image-flow.
- [ ] Switch tabs and come back. Verify the EPUB reader remembers your reading location (tab.location is persisted).

---

## 9. Reader — Code folder

- [ ] Click `+` → **Code folder** → pick a folder of code (e.g. the ReadWrite repo itself: `/Users/eevv/focus/ReadWrite`).
- [ ] **Expected**: Left side shows the file tree; right side is empty until you click a file.
- [ ] Click `package.json` → renders in Monaco (read-only).
- [ ] Edit a file _outside_ ReadWrite (e.g. `echo "// note" >> /Users/eevv/focus/ReadWrite/README.md`). Verify the tree refreshes (chokidar watcher).
- [ ] Press ⇧⌘S, snip a code region. Verify the screenshot.

**Troubleshooting**

- _Tree is empty_: the watcher's `ignored` filter skips `.git`, `node_modules`, `dist`, `out` etc. by default. If you point at a folder that's only those, you'll see nothing.

---

## 10. Editor — WYSIWYG mode

- [ ] In the editor, click into the body. Type:

  ````
  # 标题一

  这是一个段落，里面有 **粗体** 和 *斜体*，还有一个 [链接](https://example.com)。

  - 列表项 1
  - 列表项 2

  > 引用一段话

  ```js
  console.log('hello');
  ````

  ```

  ```

- [ ] **Expected**: Each piece renders live as you type — `# 标题一` becomes a large heading, `**粗体**` becomes bold, etc. The code block becomes a darker monospace block. Markdown source is gone from view.
- [ ] Select the bold word and replace it. Verify the bold styling stays.
- [ ] Use `⌘Z` to undo / `⇧⌘Z` to redo. Both work via the history plugin.

---

## 11. Editor — source mode

- [ ] Click the **Source** button in the editor toolbar.
- [ ] **Expected**: Same content shown as raw Markdown in CodeMirror — line numbers visible, syntax-highlighted.
- [ ] Edit raw Markdown directly. Switch back to **WYSIWYG** — your edits are reflected, no content loss.
- [ ] Verify the autosave still ticks (filename `·` flips to `✓` after 1.5s of stillness).

---

## 12. Image paste — including non-snip images

- [ ] Take a screenshot via your OS (`Cmd+Shift+4` on macOS) so the image is on the clipboard.
- [ ] Click into the editor (WYSIWYG mode), press `⌘V`.
- [ ] **Expected**: An image inserts. In Finder, a corresponding file appears in the doc's `images/` folder.
- [ ] Drag an image file from Finder onto the editor. Same outcome.

**Troubleshooting**

- _Pasted image inserts but doesn't render_: same root cause as in Test 6 — file:// loading. Check Console.
- _Image saves but the link in the markdown is wrong_: check that the editor's path is set (sidebar should show the doc highlighted). If autosave hasn't materialized the doc folder yet, the paste creates the folder first.

---

## 13. Doc save round-trip — relative paths on disk

- [ ] Confirm your doc has a snipped image in it.
- [ ] In Finder, open the `<doc>.md` file in any text editor (TextEdit, VS Code, `cat` it in Terminal).
- [ ] **Expected**: The image refs read like `![…](images/snip-….png)` — relative paths, no `file://`. (The `file://` only lives in-memory.)
- [ ] Edit the file externally — append `\n\nExternal edit.\n` and save. Switch back to ReadWrite.
- [ ] Click the doc in the sidebar (or click another doc and back). The external edit should be loaded.

**Troubleshooting**

- _On-disk markdown still has `file://` URLs_: path-transform on save isn't running. The transform lives in `src/renderer/src/lib/path-transform.ts:rewriteFileUrlsToRelative`. File a bug if you see this.

---

## 14. Settings — Theme

- [ ] Click the ⚙️ Settings button in the title bar.
- [ ] **Expected**: A separate settings window opens with a sidebar (General / Workspaces / Editor / Images / AI / WeChat / About).
- [ ] On General → Appearance, switch from System to Light. **Expected**: both the main window and the settings window switch to light mode immediately.
- [ ] Switch to Dark. Same — both windows go dark.
- [ ] Switch back to System.

**Troubleshooting**

- _Only the settings window changes; main window stays_: cross-window broadcast is broken. Check `src/main/ipc/settings.ts:broadcastSettings`.

---

## 15. Settings — Editor

- [ ] Settings → Editor.
- [ ] Change Font size from 16 to 22. **Expected**: editor text in the main window enlarges immediately.
- [ ] Change Font family to Serif. Editor body text becomes Georgia.
- [ ] Change Content max width to 600. The prose column narrows.
- [ ] Set Autosave to 0. **Expected**: autosave is now off; typing in the editor leaves the dirty marker `·` indefinitely until you change a setting again or restart.
- [ ] Restore autosave to 1500.

---

## 16. Settings — Images

- [ ] Settings → Images. Default is "Next to current document".
- [ ] Switch to "User Pictures folder", confirm.
- [ ] Back in the main window, snip something.
- [ ] **Expected**: PNG saves under `~/Pictures/ReadWrite/` (not next to the doc). The inserted markdown link is now a `file://` URL (no relative path possible since the file isn't under the doc folder).
- [ ] Switch back to "Next to current document" — subsequent snips return to relative paths.

---

## 17. Settings — Workspaces panel

- [ ] Settings → Workspaces.
- [ ] **Expected**: List shows your known workspaces with the active one highlighted, plus action buttons.
- [ ] Click **Switch** on a non-active workspace. Main window switches.
- [ ] Click the **trash icon** next to a workspace → confirm. Verify the entry disappears from the list, but the folder on disk still exists (Finder check).
- [ ] Click **Open existing folder** and re-add the same workspace. Confirm it's back in the list.

---

## 18. AI — Configure & test

> Skip this and the next 3 sections if you don't have an AI key.

- [ ] Settings → AI.
- [ ] Toggle **Enable AI features**. Fill in:
  - API endpoint: `https://api.openai.com/v1` (or your provider)
  - API key: paste your secret
  - Model: `gpt-4o-mini` (or your model)
- [ ] Click **Send test request**.
- [ ] **Expected** within a few seconds: green status line `Response: "OK..." (model: gpt-4o-mini)`.
- [ ] Verify the key is encrypted: in Terminal, run `sqlite3 ~/Library/Application\ Support/readwrite/readwrite.sqlite "SELECT key, value FROM kv_store WHERE key LIKE 'secret:%';"` (macOS path). The value should be a JSON envelope with base64 data, not your plaintext key. The legacy `settings` blob's `aiApiKey` field should be empty.

**Troubleshooting**

- _Test fails with 401_: wrong key or wrong endpoint.
- _Test fails with network error_: usually a corp proxy; the main process inherits system network. If proxy needs auth, configure it at the OS level.

---

## 19. AI — Polish & Translate

- [ ] In the editor, write 2–3 paragraphs of any messy prose.
- [ ] Click the ✨ AI button → **Polish ▶ Whole document**.
- [ ] **Expected**: spinner, then the document content is replaced with a polished version. A green status banner says "Polished whole document."
- [ ] Use ⌘Z to undo if you don't like it. (Milkdown history plugin handles undo.)
- [ ] Select a sentence. ✨ AI → **Polish ▶ Selection**. The selection is replaced.
- [ ] Same selection → ✨ AI → **Translate ▶ Selection → English**. The selected text translates to English in place.
- [ ] No selection → ✨ AI → **Translate ▶ Whole document → 中文**. Whole doc translates to Chinese.

**Troubleshooting**

- _Action errors "Switch to WYSIWYG mode"_: AI actions only work in WYSIWYG (the bridge selection helpers don't expose CodeMirror selections yet). Toggle the editor mode and retry.
- _Action errors "Select some text first"_: you tried Selection mode without an active selection. Highlight something first.

---

## 20. AI — Summarize / Explain / Interpret

- [ ] ✨ AI → **Summarize document**. **Expected**: doc content is replaced with a 3-bullet summary.
- [ ] Select a code block in the doc. ✨ AI → **Explain selection**. **Expected**: the selection is replaced with a plain-language explanation.
- [ ] ✨ AI → **Interpret with prompt…**.
- [ ] **Expected**: dialog opens with a prompt input pre-filled "解读一下", source toggle (Selection / Whole document), and quick-prompt chips (Translate to English / Summarize in 3 bullets / Explain this code).
- [ ] Click a chip — the prompt fills in. Click **Run**.
- [ ] **Expected**: the response shows in an editable textarea. You can tweak it.
- [ ] Click **Append to document** (or, with a selection, **Replace selection** / **Insert after selection**). The response lands in the editor.

---

## 21. Copy to WeChat 公众号 (clipboard path)

> No 公众号 credentials needed for this — you're just copying HTML and pasting into the WeChat editor.

- [ ] Write a doc with: an H1, a paragraph, a list, a code block, and **at least one image** (snipped or pasted).
- [ ] Editor toolbar → 📤 (Share) → **Copy to WeChat 公众号**.
- [ ] **Expected**: success banner "Copied to clipboard. Open mp.weixin.qq.com → 写新图文 → paste."
- [ ] In your browser, log into mp.weixin.qq.com → 草稿箱 → 写新图文 → click into the article body editor → press `⌘V`.
- [ ] **Expected**: The content pastes with formatting preserved — heading sizes, list bullets, code-block dark background, image visible (not broken). WeChat may take a moment to upload the inline images to its CDN.
- [ ] Settings → WeChat → switch the **Export theme** to Serif → re-copy → re-paste. Theme styles should differ.

**Troubleshooting**

- _Image is broken in WeChat_: the image data URL in the copied HTML is malformed. Open the HTML console in browser before pasting to inspect. Most likely a `pickFirstDataImage` issue, file a bug.
- _Lists render weirdly_: WeChat injects `<section>` blocks around list items if we don't pre-wrap with `<p>`. Confirm you're on the latest code (the `<li>`-wrap quirk lives in `src/renderer/src/lib/wechat-html.ts:wrapListItemContent`).

---

## 22. Publish to WeChat — create draft

> This needs WeChat 公众号 credentials and your machine's IP in the whitelist.

- [ ] Settings → WeChat → fill AppID + AppSecret → **Verify credentials** → green status.
- [ ] In the editor, prepare a doc with at least one image (cover requirement).
- [ ] 📤 → **Publish draft to WeChat 公众号**.
- [ ] In the dialog: title is auto-filled from H1, digest from the first paragraph, cover thumbnail shown.
- [ ] Click **Create draft**.
- [ ] **Expected** within ~10s: a green banner "Draft created", with `draft media_id: <id>` shown.
- [ ] In your browser, mp.weixin.qq.com → 草稿箱. The draft should appear there with your title.

**Troubleshooting**

- _"errcode=40164, errmsg='invalid ip not in whitelist'"_: add your IP at 公众号 → 开发 → 基本配置 → IP白名单. Wait a few seconds; retry.
- _"errcode=40010" on uploadimg_: image is too big (WeChat limit: 1 MB per inline image). Resize / compress the image.
- _"errcode=40004"_: image format not accepted (WeChat takes PNG / JPEG / GIF / BMP, NOT WebP / SVG).

---

## 23. Publish to WeChat — publish to followers

> Only works for accounts with publish permission (typically 认证服务号 or 认证订阅号). Personal 订阅号 will get a permission error — that's expected.

- [ ] After Test 22 leaves you on the success state, click **Publish to followers**.
- [ ] Confirm the irreversibility prompt.
- [ ] **Expected** for an authorized account: spinner, then "Published to followers!" with a `publish_id`.
- [ ] **Expected** for a personal account: clear error message about lack of permission, telling you to publish from mp.weixin.qq.com instead.

---

## 24. Persistence across restart

- [ ] Open multiple workspaces, multiple reader tabs (URL/PDF/etc.), and an active doc with content.
- [ ] Quit the app (`⌘Q`).
- [ ] Relaunch.
- [ ] **Expected**:
  - Same workspace is active (whichever was last selected).
  - Same doc is reopened in the editor (per-workspace last-doc memory).
  - Settings (theme, font size, autosave debounce, sidebar visible) all survive.
  - **Reader tabs are restored**, with the same active tab. Web/GitHub tabs reload (URL state survives, but cookies / scroll position are not preserved). PDF / EPUB / code tabs reopen at their last addressable resource.
  - Workspace list (multiple known workspaces) is intact.
- [ ] Switch to another workspace, open different tabs, switch back — the original workspace's tab set comes back.

---

## 25. Edge cases & guards

- [ ] **Dirty close**: edit a doc but quit before autosave fires (set autosave to a high value first to make this easier). The OS should warn about unsaved changes.
- [ ] **Switch workspace with dirty doc**: edit, then click another workspace in the dropdown. You get a "Discard unsaved changes?" prompt. Cancel — stays put. Confirm — switches.
- [ ] **Trash the active doc**: from the sidebar `⋯` menu → Move to Trash. The editor empties; the active path is cleared.
- [ ] **AI without a key**: turn off **Enable AI features** in Settings. The ✨ button in the toolbar disappears entirely. The Interpret dialog isn't reachable.
- [ ] **Snip with no tabs**: ⇧⌘S → toast says "Nothing to snip — open a tab in the reader first." No crash.
- [ ] **Folder name collisions**: create two docs with identical content (same H1). The second auto-creates as `<name> (2)/<name> (2).md`.
- [ ] **Rename to existing name**: rename a doc to the name of another doc. Auto-deduped to `<name> (2)`.

---

## 26. Optional — release pipeline smoke test

> Skip if you're not ready to publish a release.

- [ ] On a clean working tree:
  ```bash
  ./deploy.sh release 0.1.0
  ```
- [ ] **Expected**: the script verifies `package.json`'s version is `0.1.0`, creates and pushes tag `v0.1.0`, prints a tracking URL.
- [ ] Open https://github.com/everettjf/ReadWrite/actions and watch the Release workflow start. It runs three OS jobs in parallel (~5–8 minutes each on standard runners).
- [ ] When all green: https://github.com/everettjf/ReadWrite/releases/v0.1.0 should show the release with `.dmg` (mac), `.exe` (win), `.AppImage` + `.deb` (linux) attached. Release notes match the `## [0.1.0]` block in CHANGELOG.md.
- [ ] Download the `.dmg` on a different Mac (or the `.exe` on a Windows VM). Verify it installs and launches.

**Troubleshooting**

- _Workflow fails on `pnpm install`_: probably a `better-sqlite3` rebuild error on the runner. Look at the Linux/Windows job logs; usually a missing system header.
- _macOS DMG won't open ("damaged")_: code signing / notarization is intentionally off. Right-click the `.app` → Open the first time. To remove the warning permanently, configure Apple Developer secrets and update the workflow.

---

## Where to look when something goes wrong

- **`pnpm dev` terminal**: main-process logs (IPC errors, SQLite errors, autosave failures, watcher noise).
- **DevTools Console** in the main window: renderer errors (Milkdown, React, image loads, AI fetch).
- **DevTools Network**: AI request URLs and response bodies.
- **`~/Library/Application Support/readwrite/readwrite.sqlite`** (macOS) / `%APPDATA%/readwrite/readwrite.sqlite` (Windows): the SQLite database. `sqlite3` CLI to inspect kv_store.
- **`<workspace>/<doc folder>/<doc>.md`** on disk: ground truth for whether autosave / path-transforms are working.

If you find a bug, please open an issue at https://github.com/everettjf/ReadWrite/issues with:

- Which test step failed
- macOS/Windows/Linux + version
- Whatever appeared in the terminal / DevTools console
- A screenshot if relevant
