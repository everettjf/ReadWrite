import { ipcMain } from 'electron';
import { generateText, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import type { AICompletionRequest, AICompletionResult, AppSettings } from '@shared/types';
import { getCurrentSettings } from './settings';

/**
 * Build a Vercel AI SDK LanguageModel for the user's currently-active
 * provider. Each provider's package owns its own auth + URL — we just
 * inject the API key the user pasted in Settings, and (for the
 * openai-compatible escape hatch) the endpoint URL too.
 */
function makeModel(settings: AppSettings): LanguageModel {
  const apiKey = settings.aiApiKey.trim();
  const model = settings.aiModel.trim();

  switch (settings.aiProvider) {
    case 'openai':
      return createOpenAI({ apiKey })(model);
    case 'anthropic':
      return createAnthropic({ apiKey })(model);
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(model);
    case 'deepseek':
      return createDeepSeek({ apiKey })(model);
    case 'openai-compatible':
      return createOpenAI({
        apiKey,
        baseURL: settings.aiEndpoint.replace(/\/+$/, ''),
      })(model);
  }
}

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
      if (settings.aiProvider === 'openai-compatible' && !settings.aiEndpoint) {
        throw new Error(
          'AI endpoint is missing. Set it in Settings → AI (or pick a built-in provider instead).',
        );
      }
      if (!settings.aiModel) {
        throw new Error('AI model is missing. Set it in Settings → AI.');
      }

      const systemPrompt = req.instruction
        ? `${settings.aiSystemPrompt}\n\nTask: ${req.instruction}`
        : settings.aiSystemPrompt;

      try {
        const result = await generateText({
          model: makeModel(settings),
          system: systemPrompt,
          prompt: req.input,
          temperature: 0.4,
        });

        const text = result.text.trim();
        if (!text) throw new Error('AI response was empty.');

        return {
          text,
          model: settings.aiModel,
          usage: result.usage
            ? {
                promptTokens: result.usage.inputTokens,
                completionTokens: result.usage.outputTokens,
                totalTokens: result.usage.totalTokens,
              }
            : undefined,
        };
      } catch (err) {
        // The AI SDK normalizes API errors into APICallError + similar.
        // Forward a clean message; the original is logged to main console.
        console.error('[ai] generation failed:', err);
        const msg = (err as Error).message ?? String(err);
        throw new Error(msg.slice(0, 800));
      }
    },
  );
}
