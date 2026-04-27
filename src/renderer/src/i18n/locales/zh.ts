import type { DictKey } from './en';

/**
 * Chinese (Simplified) translations. Anything missing here falls back
 * to English at lookup time, so partial coverage is safe.
 */
export const zh: Partial<Record<DictKey, string>> = {
  // Common.
  'common.cancel': '取消',
  'common.save': '保存',
  'common.create': '创建',
  'common.creating': '创建中…',
  'common.open': '打开',
  'common.back': '返回',
  'common.loading': '加载中…',
  'common.browse': '浏览',
  'common.discardUnsavedChanges': '放弃未保存的更改？',

  // TitleBar.
  'titlebar.tooltip.ai': 'AI',
  'titlebar.tooltip.newDoc': '新建文档（创建一个新文件夹）',
  'titlebar.tooltip.openDoc': '打开 Markdown',
  'titlebar.tooltip.settings': '设置',
  'titlebar.tooltip.showSidebar': '显示文档侧边栏',
  'titlebar.tooltip.hideSidebar': '隐藏文档侧边栏',
  'titlebar.tooltip.revealInFinder': '在访达中显示',

  'titlebar.ai.label': 'AI',
  'titlebar.ai.generateFromReader': '从阅读器生成…',
  'titlebar.ai.generateFromReader.hint': '使用外部 Claude CLI；选择风格 + 模板，确认设置后运行',
  'titlebar.ai.polish': '润色',
  'titlebar.ai.translate': '翻译',
  'titlebar.ai.target.selection': '所选内容',
  'titlebar.ai.target.document': '整篇文档',
  'titlebar.ai.translate.selectionLabel': '所选内容 →',
  'titlebar.ai.translate.documentLabel': '整篇文档 →',
  'titlebar.ai.translate.toEnglish': '英文',
  'titlebar.ai.translate.toChinese': '中文',
  'titlebar.ai.summarize': '总结文档',
  'titlebar.ai.explain': '解释所选内容',
  'titlebar.ai.interpret': '使用提示词解读…',
  'titlebar.ai.interpret.hint': '自定义提示词，确认回复后插入',

  // Workspace switcher.
  'workspace.menu.title': '工作区',
  'workspace.menu.active': '当前',
  'workspace.menu.createNew': '创建新工作区…',
  'workspace.menu.openExisting': '打开已有文件夹…',
  'workspace.menu.revealInFinder': '在访达中显示',

  // Workspace — Create dialog.
  'workspace.create.title': '创建新工作区',
  'workspace.create.description': '一个工作区就是一个文件夹，里面的每篇文档都有自己的子文件夹。',
  'workspace.create.nameLabel': '工作区名称',
  'workspace.create.namePlaceholder': '我的笔记',
  'workspace.create.willBeCreatedAt': '将创建于',
  'workspace.create.locationDefault': '与当前工作区放在同一目录下',
  'workspace.create.customLocationToggle': '选择其他位置…',
  'workspace.create.customLocationHide': '使用默认位置',
  'workspace.create.parentLabel': '父级文件夹',
  'workspace.create.parentBrowse': '浏览…',
  'workspace.create.suggestedTitle': '建议位置',
  'workspace.create.notAvailable': '（不可用）',
  'workspace.create.errorRequired': '请先填写工作区名称。',
  'workspace.create.errorParentRequired': '请选择父级目录。',
  'workspace.dialog.pickParent': '为新工作区选择父级文件夹',
  'workspace.dialog.pickExisting': '选择已有的工作区文件夹',

  // WorkspacePicker.
  'picker.welcomeTitle': '欢迎使用 ReadWrite',
  'picker.welcomeSubtitle':
    '工作区是一个文件夹，每篇文档都会有自己的子目录。任意选择一个开始 — 之后随时可以切换或新增。',
  'picker.create.title': '创建新工作区',
  'picker.create.description': '推荐首次使用。在 macOS 上我们会建议放在 iCloud Drive。',
  'picker.openExisting.title': '打开已有文件夹',
  'picker.openExisting.description': '已经有笔记文件夹了？让 ReadWrite 直接指向它。',
  'picker.recent.title': '最近的工作区',
  'picker.create.locationsTitle': '工作区放在哪里？',
  'picker.create.locationsDesc':
    '选择一个父目录。iCloud Drive 是在多台 Mac 之间同步笔记最方便的方式。',
  'picker.create.customLocationLabel': '或者粘贴自定义路径',
  'picker.create.preview': '将创建为',

  // Settings shell.
  'settings.title': '设置',
  'settings.section.general': '通用',
  'settings.section.workspaces': '工作区',
  'settings.section.editor': '编辑器',
  'settings.section.images': '图片',
  'settings.section.ai': 'AI',
  'settings.section.wechat': '微信公众号',
  'settings.section.about': '关于',

  // Settings — General.
  'settings.general.title': '通用',
  'settings.general.appearance.label': '外观',
  'settings.general.appearance.description': '跟随系统，或为每个窗口单独设置。',
  'settings.general.appearance.system': '跟随系统',
  'settings.general.appearance.light': '浅色',
  'settings.general.appearance.dark': '深色',
  'settings.general.language.label': '语言',
  'settings.general.language.description':
    '跟随系统语言，或选择具体的语言。不支持的语言会自动回退到英文。',
  'settings.general.language.system': '跟随系统',
  'settings.general.language.en': 'English',
  'settings.general.language.zh': '中文',

  // Settings — Editor.
  'settings.editor.title': '编辑器',
  'settings.editor.defaultMode.label': '默认模式',
  'settings.editor.defaultMode.description': '新文档默认以哪种视图打开。',
  'settings.editor.defaultMode.wysiwyg': '所见即所得',
  'settings.editor.defaultMode.source': '源码',
  'settings.editor.fontFamily.label': '字体',
  'settings.editor.fontFamily.sans': '无衬线（Inter）',
  'settings.editor.fontFamily.serif': '衬线（Georgia）',
  'settings.editor.fontFamily.mono': '等宽（JetBrains Mono）',
  'settings.editor.fontSize.label': '字号',
  'settings.editor.fontSize.description': '同时应用于所见即所得和源码模式。',
  'settings.editor.maxWidth.label': '正文最大宽度（像素）',
  'settings.editor.maxWidth.description': '正文列在出现页边距前的最大宽度。',
  'settings.editor.autosave.label': '自动保存',
  'settings.editor.autosave.description':
    '在最近一次编辑后多少毫秒保存当前文档。设为 0 则关闭自动保存。',

  // Settings — Images.
  'settings.images.title': '图片与截图',
  'settings.images.location.label': '存储位置',
  'settings.images.location.description': '截图按钮拍摄的 PNG 写入到哪里。',
  'settings.images.location.nextToDoc': '与当前文档同目录（推荐）',
  'settings.images.location.custom': '自定义绝对路径文件夹',
  'settings.images.location.pictures': '系统“图片”文件夹',
  'settings.images.subfolder.label': '子文件夹名称',
  'settings.images.subfolder.description':
    '“与当前文档同目录”模式使用此子目录，并以相对路径插入到 Markdown，便于迁移。',
  'settings.images.custom.label': '自定义文件夹',
  'settings.images.custom.description': '“自定义绝对路径文件夹”模式使用此目录。',
  'settings.images.dialog.pick': '选择图片存储文件夹',

  // Settings — Workspaces.
  'settings.workspaces.title': '工作区',
  'settings.workspaces.list.label': '已知工作区',
  'settings.workspaces.list.description':
    '每个工作区是一个文件夹，文档以子目录形式存放。点击“切换”激活某个工作区。⋯ 菜单中可以选择“忘记”（仅从列表移除，磁盘文件保留）或“删除”（将整个文件夹移入回收站）。',
  'settings.workspaces.empty': '还没有工作区，添加一个。',
  'settings.workspaces.switch': '切换',
  'settings.workspaces.activeBadge': '当前',
  'settings.workspaces.action.reveal': '在访达中显示',
  'settings.workspaces.action.forget': '忘记',
  'settings.workspaces.action.forget.hint': '从列表中移除，但保留磁盘上的文件夹',
  'settings.workspaces.action.delete': '删除…',
  'settings.workspaces.action.delete.hint': '将文件夹移入系统回收站',
  'settings.workspaces.cta.createNew': '新建',
  'settings.workspaces.cta.openExisting': '打开已有文件夹',
  'settings.workspaces.confirm.forget':
    '忘记工作区 “{name}”？\n\n这只会从 ReadWrite 的列表中移除它 — 磁盘上的文件夹和文档不会被改动。',
  'settings.workspaces.confirm.delete':
    '删除工作区 “{name}”？\n\n这会把整个工作区文件夹（其中所有文档和图片）移入系统回收站，之后仍可从回收站恢复。',

  // Settings — About.
  'settings.about.title': '关于 ReadWrite',
  'settings.about.tagline': '标语',
  'settings.about.taglineText': '读尽所读，写于所思。',
  'settings.about.version': '版本',
  'settings.about.license': '许可证',
  'settings.about.repository': '代码仓库',
  'settings.about.author': '作者',
  'settings.about.followOnX': '在 X 上关注',
};
