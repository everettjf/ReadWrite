export const IPC = {
  // Tab / reader lifecycle
  TAB_CREATE: 'tab:create',
  TAB_CLOSE: 'tab:close',
  TAB_FOCUS: 'tab:focus',
  TAB_UPDATE_BOUNDS: 'tab:update-bounds',
  TAB_NAVIGATE: 'tab:navigate',
  TAB_GO_BACK: 'tab:go-back',
  TAB_GO_FORWARD: 'tab:go-forward',
  TAB_RELOAD: 'tab:reload',
  TAB_SET_VISIBILITY: 'tab:set-visibility',

  // Broadcast from main → renderer
  TAB_STATE_CHANGED: 'tab:state-changed',

  // Screenshot
  SCREENSHOT_TAB: 'screenshot:tab',
  IMAGE_SAVE: 'image:save',

  // Filesystem
  FS_READ_FILE: 'fs:read-file',
  FS_WRITE_FILE: 'fs:write-file',
  FS_OPEN_DIALOG: 'fs:open-dialog',
  FS_SAVE_DIALOG: 'fs:save-dialog',
  FS_LIST_DIR: 'fs:list-dir',
  FS_WATCH_DIR: 'fs:watch-dir',
  FS_UNWATCH_DIR: 'fs:unwatch-dir',
  FS_WATCH_EVENT: 'fs:watch-event',
  FS_READ_FILE_BASE64: 'fs:read-file-base64',

  // Settings / state
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_CHANGED: 'settings:changed',

  // Session-level persistence
  SESSION_LOAD: 'session:load',
  SESSION_SAVE: 'session:save',

  // Menu / shell helpers
  SHELL_OPEN_EXTERNAL: 'shell:open-external',

  // App-level
  APP_OPEN_SETTINGS: 'app:open-settings',
  APP_GET_VERSION: 'app:get-version',

  // Workspace lifecycle (Obsidian-style: a workspace is a folder containing documents)
  WORKSPACE_LIST_KNOWN: 'workspace:list-known',
  WORKSPACE_GET_ACTIVE: 'workspace:get-active',
  WORKSPACE_SET_ACTIVE: 'workspace:set-active',
  WORKSPACE_ACTIVE_CHANGED: 'workspace:active-changed',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_RENAME_KNOWN: 'workspace:rename-known',
  WORKSPACE_FORGET: 'workspace:forget',
  WORKSPACE_GET_SUGGESTED_PARENTS: 'workspace:get-suggested-parents',
  WORKSPACE_REVEAL: 'workspace:reveal',
  WORKSPACE_LIST_DOCS: 'workspace:list-docs',

  // Documents within the active workspace
  DOC_CREATE_NEW: 'doc:create-new',
  DOC_RENAME: 'doc:rename',
  DOC_REVEAL_IN_FINDER: 'doc:reveal-in-finder',
  FS_PATH_EXISTS: 'fs:path-exists',

  // AI
  AI_COMPLETE: 'ai:complete',

  // WeChat (scaffold)
  WECHAT_TEST_CREDENTIALS: 'wechat:test-credentials',
  WECHAT_PUBLISH: 'wechat:publish',
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];
