/**
 * Lightweight in-browser latency collector for AI analysis requests.
 * Stores only timings/statuses (never resume content or personal data).
 */
const samples = [];
const MAX_SAMPLES = 500;

export function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0)
    return null;
  if (percentileValue < 0 || percentileValue > 100) {
    throw new RangeError(
      "percentileValue must be between 0 and 100",
    );
  }
  const sorted = [...values].sort((a, b) => a - b);
  // Nearest-rank percentile: rank = ceil(p * n), with a minimum rank of 1.
  const rank = Math.max(
    1,
    Math.ceil((percentileValue / 100) * sorted.length),
  );
  return sorted[rank - 1];
}

export function recordAiAnalysisLatency(
  durationMs,
  status = "success",
) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new TypeError(
      "durationMs must be a finite, non-negative number",
    );
  }
  samples.push({
    durationMs,
    status,
    timestamp: Date.now(),
  });
  if (samples.length > MAX_SAMPLES) samples.shift();
  return getAiAnalysisLatencySummary();
}

export function getAiAnalysisLatencySummary() {
  const durations = samples.map(
    (sample) => sample.durationMs,
  );
  return {
    count: durations.length,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    minMs: durations.length ? Math.min(...durations) : null,
    maxMs: durations.length ? Math.max(...durations) : null,
    failures: samples.filter(
      (sample) => sample.status !== "success",
    ).length,
  };
}

export function resetAiAnalysisLatencySamples() {
  samples.length = 0;
}
