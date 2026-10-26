export type AiAnalysisLatencySummary = {
  count: number;
  p50Ms: number | null;
  p95Ms: number | null;
  minMs: number | null;
  maxMs: number | null;
  failures: number;
};

export function percentile(
  values: number[],
  percentileValue: number,
): number | null;
export function recordAiAnalysisLatency(
  durationMs: number,
  status?: string,
): AiAnalysisLatencySummary;
export function getAiAnalysisLatencySummary(): AiAnalysisLatencySummary;
export function resetAiAnalysisLatencySamples(): void;
