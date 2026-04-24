import { createContext, useContext } from 'react';
import type { Editor } from '@milkdown/core';

export interface MilkdownBridge {
  getMarkdown: () => string;
  setMarkdown: (md: string) => void;
  insertMarkdown: (md: string) => void;
  getSelectionText: () => string;
  replaceSelection: (md: string) => void;
  getEditor: () => Editor | null;
}

export const MilkdownBridgeContext = createContext<MilkdownBridge | null>(null);

export function useMilkdownBridge(): MilkdownBridge | null {
  return useContext(MilkdownBridgeContext);
}
