import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/** USD per token (input / output). Verified against Anthropic pricing docs, June 2026. */
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
  'claude-sonnet-4-6': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'whisper-1': { input: 0, output: 0 },
};

const WHISPER_FLAT_USD = 0.006;

export interface AiUsageInput {
  userId: string;
  functionName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  if (model === 'whisper-1') {
    return WHISPER_FLAT_USD;
  }
  const rates = MODEL_RATES[model];
  if (!rates) {
    return 0;
  }
  return inputTokens * rates.input + outputTokens * rates.output;
}

export function usageFromAnthropicResponse(
  body: Record<string, unknown>,
): { inputTokens: number; outputTokens: number } {
  const usage = body.usage as { input_tokens?: number; output_tokens?: number } | undefined;
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}

export async function logAiUsage(
  supabase: SupabaseClient,
  input: AiUsageInput,
): Promise<void> {
  try {
    const estCostUsd = estimateCostUsd(input.model, input.inputTokens, input.outputTokens);
    await supabase.from('ai_usage').insert({
      user_id: input.userId,
      function_name: input.functionName,
      model: input.model,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      est_cost_usd: estCostUsd,
    });
  } catch {
    // Usage logging must not break primary flows
  }
}
