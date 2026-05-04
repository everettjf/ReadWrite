import { create } from 'zustand';

export type ReaderSource = 'epub' | 'pdf' | 'code' | 'web';

export interface ReaderSelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ReaderSelectionState {
  text: string;
  rect: ReaderSelectionRect | null;
  source: ReaderSource | null;
  set: (next: { text: string; rect: ReaderSelectionRect; source: ReaderSource }) => void;
  clear: () => void;
}

export const useReaderSelectionStore = create<ReaderSelectionState>((set) => ({
  text: '',
  rect: null,
  source: null,
  set: (next) => set({ text: next.text, rect: next.rect, source: next.source }),
  clear: () => set({ text: '', rect: null, source: null }),
}));
