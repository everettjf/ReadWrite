/**
 * English source dictionary. Keys are flat; namespaces are prefixed (`section.subsection.key`).
 * The English file is the schema: every other locale is keyed off `keyof typeof en` and
 * missing keys silently fall back here.
 */
export const en = {
  // Common reusable bits.
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.create': 'Create',
  'common.creating': 'Creating…',
  'common.open': 'Open',
  'common.back': 'Back',
  'common.loading': 'Loading…',
  'common.browse': 'Browse',
  'common.discardUnsavedChanges': 'Discard unsaved changes?',

  // TitleBar — buttons & tooltips.
  'titlebar.tooltip.ai': 'AI',
  'titlebar.tooltip.newDoc': 'New document (creates a new folder)',
  'titlebar.tooltip.openDoc': 'Open Markdown',
  'titlebar.tooltip.settings': 'Settings',
  'titlebar.tooltip.showSidebar': 'Show docs sidebar',
  'titlebar.tooltip.hideSidebar': 'Hide docs sidebar',
  'titlebar.tooltip.revealInFinder': 'Reveal in Finder',

  // TitleBar — AI menu.
  'titlebar.ai.label': 'AI',
  'titlebar.ai.generateFromReader': 'Generate from reader…',
  'titlebar.ai.generateFromReader.hint':
    'Uses external Claude CLI; pick style + template, review settings, then run',
  'titlebar.ai.polish': 'Polish',
  'titlebar.ai.translate': 'Translate',
  'titlebar.ai.target.selection': 'Selection',
  'titlebar.ai.target.document': 'Whole document',
  'titlebar.ai.translate.selectionLabel': 'Selection →',
  'titlebar.ai.translate.documentLabel': 'Whole document →',
  'titlebar.ai.translate.toEnglish': 'English',
  'titlebar.ai.translate.toChinese': '中文',
  'titlebar.ai.summarize': 'Summarize document',
  'titlebar.ai.explain': 'Explain selection',
  'titlebar.ai.interpret': 'Interpret with prompt…',
  'titlebar.ai.interpret.hint': 'Custom prompt, review response, then insert',

  // Reader-side selection toolbar (floats above a non-empty selection in the reader pane).
  'reader.selection.summarize': 'Summarize → notes',
  'reader.selection.translate': 'Translate → notes',
  'reader.selection.interpret': 'Interpret…',
  'reader.selection.custom': 'Custom…',
  'reader.selection.prompt.summarize':
    'Summarize this passage in 3 bullets, then close with a single-line takeaway.',
  'reader.selection.prompt.translate':
    'Translate this passage to natural, idiomatic Chinese. Return only the translation.',
  'reader.selection.prompt.interpret':
    'Interpret this passage: background, key points, and what it implies for me — one short paragraph each.',

  // Workspace switcher dropdown.
  'workspace.menu.title': 'Workspaces',
  'workspace.menu.active': 'active',
  'workspace.menu.createNew': 'Create new workspace…',
  'workspace.menu.openExisting': 'Open existing folder…',
  'workspace.menu.revealInFinder': 'Reveal in Finder',

  // Workspace — Create dialog (the new name-first dialog).
  'workspace.create.title': 'Create a new workspace',
  'workspace.create.description':
    'Each workspace is a folder; documents inside it live in their own subfolders.',
  'workspace.create.nameLabel': 'Workspace name',
  'workspace.create.namePlaceholder': 'My Notes',
  'workspace.create.willBeCreatedAt': 'Will be created at',
  'workspace.create.locationDefault': 'Saved next to your current workspace',
  'workspace.create.customLocationToggle': 'Choose a different location…',
  'workspace.create.customLocationHide': 'Use default location',
  'workspace.create.parentLabel': 'Parent folder',
  'workspace.create.parentBrowse': 'Browse…',
  'workspace.create.suggestedTitle': 'Suggested locations',
  'workspace.create.notAvailable': '(not available)',
  'workspace.create.errorRequired': 'Give the workspace a name first.',
  'workspace.create.errorParentRequired': 'Pick a parent location.',
  'workspace.dialog.pickParent': 'Pick a parent folder for the new workspace',
  'workspace.dialog.pickExisting': 'Pick an existing workspace folder',

  // WorkspacePicker — first-run / no-active-workspace screen.
  'picker.welcomeTitle': 'Welcome to ReadWrite',
  'picker.welcomeSubtitle':
    'A workspace is a folder where every document gets its own subfolder. Pick one to start — you can switch or add more anytime.',
  'picker.create.title': 'Create a new workspace',
  'picker.create.description':
    "Recommended for first-time users. We'll suggest iCloud Drive on macOS.",
  'picker.openExisting.title': 'Open an existing folder',
  'picker.openExisting.description': 'Already have a folder of notes? Point ReadWrite at it.',
  'picker.recent.title': 'Recent workspaces',
  'picker.create.locationsTitle': 'Where should the workspace live?',
  'picker.create.locationsDesc':
    'Pick a parent location. iCloud Drive is the easiest way to keep your notes synced across Macs.',
  'picker.create.customLocationLabel': 'Or paste a custom location',
  'picker.create.preview': 'Will be created as',

  // Settings shell.
  'settings.title': 'Settings',
  'settings.section.general': 'General',
  'settings.section.workspaces': 'Workspaces',
  'settings.section.editor': 'Editor',
  'settings.section.images': 'Images',
  'settings.section.ai': 'AI',
  'settings.section.wechat': 'WeChat',
  'settings.section.quickLinks': 'Quick Links',
  'settings.section.about': 'About',

  // Settings — General.
  'settings.general.title': 'General',
  'settings.general.appearance.label': 'Appearance',
  'settings.general.appearance.description': 'Match your OS, or override per-window.',
  'settings.general.appearance.system': 'System',
  'settings.general.appearance.light': 'Light',
  'settings.general.appearance.dark': 'Dark',
  'settings.general.language.label': 'Language',
  'settings.general.language.description':
    'Match your system, or pick a specific language. Unsupported locales fall back to English.',
  'settings.general.language.system': 'System',
  'settings.general.language.en': 'English',
  'settings.general.language.zh': '中文',

  // Settings — Editor.
  'settings.editor.title': 'Editor',
  'settings.editor.defaultMode.label': 'Default mode',
  'settings.editor.defaultMode.description': 'Which view to open new documents in.',
  'settings.editor.defaultMode.wysiwyg': 'WYSIWYG',
  'settings.editor.defaultMode.source': 'Source',
  'settings.editor.fontFamily.label': 'Font family',
  'settings.editor.fontFamily.sans': 'Sans-serif (Inter)',
  'settings.editor.fontFamily.serif': 'Serif (Georgia)',
  'settings.editor.fontFamily.mono': 'Monospace (JetBrains Mono)',
  'settings.editor.fontSize.label': 'Font size',
  'settings.editor.fontSize.description': 'Applies to both WYSIWYG and source modes.',
  'settings.editor.maxWidth.label': 'Content max width (px)',
  'settings.editor.maxWidth.description': 'How wide the prose column gets before margins kick in.',
  'settings.editor.autosave.label': 'Autosave',
  'settings.editor.autosave.description':
    'Saves the active document this many milliseconds after the last edit. 0 disables autosave entirely.',

  // Settings — Images.
  'settings.images.title': 'Images & Screenshots',
  'settings.images.location.label': 'Storage location',
  'settings.images.location.description': 'Where the camera button writes captured PNGs.',
  'settings.images.location.nextToDoc': 'Next to current document (recommended)',
  'settings.images.location.custom': 'Custom absolute folder',
  'settings.images.location.pictures': 'User Pictures folder',
  'settings.images.subfolder.label': 'Subfolder name',
  'settings.images.subfolder.description':
    "Used by 'next to current document' mode. Inserted as a relative href so the markdown stays portable.",
  'settings.images.custom.label': 'Custom folder',
  'settings.images.custom.description': "Used by 'custom absolute folder' mode.",
  'settings.images.dialog.pick': 'Choose image storage folder',

  // Settings — Workspaces.
  'settings.workspaces.title': 'Workspaces',
  'settings.workspaces.list.label': 'Known workspaces',
  'settings.workspaces.list.description':
    'Each workspace is a folder; documents inside it live in subfolders. Click Switch to make a workspace active. The ⋯ menu has Forget (remove from this list, keep on disk) and Delete (move the whole folder to Trash).',
  'settings.workspaces.empty': 'No workspaces yet. Add one below.',
  'settings.workspaces.switch': 'Switch',
  'settings.workspaces.activeBadge': 'Active',
  'settings.workspaces.action.reveal': 'Reveal in Finder',
  'settings.workspaces.action.forget': 'Forget',
  'settings.workspaces.action.forget.hint': 'Remove from list, keep folder on disk',
  'settings.workspaces.action.delete': 'Delete…',
  'settings.workspaces.action.delete.hint': 'Move folder to system Trash',
  'settings.workspaces.cta.createNew': 'Create new',
  'settings.workspaces.cta.openExisting': 'Open existing folder',
  'settings.workspaces.confirm.forget':
    'Forget workspace "{name}"?\n\nThis only removes it from the list inside ReadWrite — the folder on disk and its documents are kept untouched.',
  'settings.workspaces.confirm.delete':
    'Delete workspace "{name}"?\n\nThis moves the entire workspace folder (every document and image inside it) to the system Trash. You can still restore it from Trash afterwards.',

  // Settings — About.
  'settings.about.title': 'About ReadWrite',
  'settings.about.tagline': 'Tagline',
  'settings.about.taglineText': 'Read anything. Write anywhere.',
  'settings.about.version': 'Version',
  'settings.about.license': 'License',
  'settings.about.repository': 'Repository',
  'settings.about.author': 'Author',
  'settings.about.followOnX': 'Follow on X',
} as const;

export type DictKey = keyof typeof en;
