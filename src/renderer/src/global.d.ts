import type { ReadWriteAPI } from '../../preload/index';
import type { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: ReadWriteAPI;
  }
}

export {};
