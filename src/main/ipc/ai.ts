import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import type { AICompletionRequest, AICompletionResult } from '@shared/types';
import { getCurrentSettings } from './settings';

export function registerAiIpc(_ctx: IpcContext): void {
  ipcMain.handle(
    IPC.AI_COMPLETE,
    async (_e, req: AICompletionRequest): Promise<AICompletionResult> => {
      const settings = getCurrentSettings();
      if (!settings.aiEnabled) {
        throw new Error('AI is disabled. Enable it in Settings → AI.');
      }
      if (!settings.aiApiKey) {
        throw new Error('AI API key is missing. Add it in Settings → AI.');
      }
      if (!settings.aiEndpoint) {
        throw new Error('AI endpoint is missing. Add it in Settings → AI.');
      }

      const url = `${settings.aiEndpoint.replace(/\/+$/, '')}/chat/completions`;
      const systemPrompt = req.instruction
        ? `${settings.aiSystemPrompt}\n\nTask: ${req.instruction}`
        : settings.aiSystemPrompt;

      const body = {
        model: settings.aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: req.input },
        ],
        temperature: 0.4,
        stream: false,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.aiApiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 500)}`);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        model?: string;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error('AI response was empty.');
      }

      return {
        text,
        model: json.model ?? settings.aiModel,
        usage: {
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
          totalTokens: json.usage?.total_tokens,
        },
      };
    },
  );
}
