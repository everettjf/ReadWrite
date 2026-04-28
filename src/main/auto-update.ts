import { app } from 'electron';
import pkg from 'electron-updater';

const { autoUpdater } = pkg;

/**
 * Background auto-update wiring.
 *
 * Behaviour:
 *   - Silent: no UI prompts in this version. Logs to stdout.
 *   - On launch (and once per hour while open) we check the configured
 *     GitHub Release feed (publish.provider in electron-builder.yml).
 *   - When an update exists, electron-updater downloads it in the
 *     background and stages it; the new version installs the next time
 *     the user quits the app.
 *
 * Skipped contexts:
 *   - Dev mode (`!app.isPackaged`): electron-updater can't replace a
 *     dev binary, and trying surfaces a confusing "App is not packaged"
 *     error. We just log and bail.
 *   - macOS unsigned: the *check* and *download* still work, but the
 *     OS rejects the unsigned replacement at install time. Once we
 *     wire a Developer ID into release.yml the install path lights up
 *     automatically — no code change needed here.
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    console.log('[updater] skipped — running unpackaged (dev)');
    return;
  }

  // electron-updater is fairly chatty on its own logger; route it to
  // console so the messages land in the same place as our other logs.
  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const current = app.getVersion();
  console.log(`[updater] init — running v${current}`);

  autoUpdater.on('checking-for-update', () => {
    console.log(`[updater] checking for update (current v${current})`);
  });
  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] update available: v${info?.version} (running v${current})`);
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log(
      `[updater] no update (running v${current}, latest published v${info?.version ?? '?'})`,
    );
  });
  autoUpdater.on('download-progress', (p) => {
    console.log(
      `[updater] downloading ${Math.round(p.percent)}% — ${Math.round(p.bytesPerSecond / 1024)} KB/s`,
    );
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[updater] downloaded v${info?.version}; will install on next quit`);
  });
  autoUpdater.on('error', (err) => {
    // Common: 404 when no GitHub Release exists yet, or the user is on
    // an unsigned macOS build. Don't escalate — just log.
    console.warn('[updater] error:', err?.message ?? err);
  });

  // Initial check shortly after launch (the renderer needs a moment
  // anyway). Then re-check every hour while the app is open.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.warn('[updater] initial check failed:', (e as Error)?.message ?? e);
    });
  }, 5_000);

  setInterval(
    () => {
      autoUpdater.checkForUpdates().catch((e) => {
        console.warn('[updater] periodic check failed:', (e as Error)?.message ?? e);
      });
    },
    60 * 60 * 1000,
  );
}
