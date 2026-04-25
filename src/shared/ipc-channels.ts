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

  // AI
  AI_COMPLETE: 'ai:complete',

  // WeChat (scaffold)
  WECHAT_TEST_CREDENTIALS: 'wechat:test-credentials',
  WECHAT_PUBLISH: 'wechat:publish',
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];
