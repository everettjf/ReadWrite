import { ipcMain } from 'electron';
import { streamText, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { nanoid } from 'nanoid';
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

/**
 * Active streaming jobs, keyed by jobId — the renderer cancels by
 * sending the same jobId over AI_COMPLETE_CANCEL and we abort the
 * corresponding controller. Removed on completion / failure / cancel.
 */
const activeJobs = new Map<string, AbortController>();

export function registerAiIpc(_ctx: IpcContext): void {
  ipcMain.handle(
    IPC.AI_COMPLETE,
    async (e, req: AICompletionRequest): Promise<AICompletionResult> => {
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

      const jobId = req.jobId ?? nanoid(10);
      const controller = new AbortController();
      activeJobs.set(jobId, controller);

      const systemPrompt = req.instruction
        ? `${settings.aiSystemPrompt}\n\nTask: ${req.instruction}`
        : settings.aiSystemPrompt;

      try {
        const result = streamText({
          model: makeModel(settings),
          system: systemPrompt,
          prompt: req.input,
          temperature: 0.4,
          abortSignal: controller.signal,
        });

        let buffer = '';
        for await (const delta of result.textStream) {
          buffer += delta;
          if (!e.sender.isDestroyed()) {
            e.sender.send(IPC.AI_COMPLETE_PROGRESS, { jobId, delta, total: buffer });
          }
        }

        const text = buffer.trim();
        if (!text) throw new Error('AI response was empty.');

        const usage = await result.usage;

        return {
          text,
          model: settings.aiModel,
          usage: usage
            ? {
                promptTokens: usage.inputTokens,
                completionTokens: usage.outputTokens,
                totalTokens: usage.totalTokens,
              }
            : undefined,
        };
      } catch (err) {
        if (controller.signal.aborted) {
          throw new Error('AI generation canceled.');
        }
        console.error('[ai] generation failed:', err);
        const msg = (err as Error).message ?? String(err);
        throw new Error(msg.slice(0, 800));
      } finally {
        activeJobs.delete(jobId);
      }
    },
  );

  ipcMain.handle(IPC.AI_COMPLETE_CANCEL, (_e, jobId: string): boolean => {
    const ctl = activeJobs.get(jobId);
    if (!ctl) return false;
    ctl.abort();
    activeJobs.delete(jobId);
    return true;
  });
}
