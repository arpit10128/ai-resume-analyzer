import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  // Determine the appropriate unit by calculating the log
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Format with 2 decimal places and round
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
    " " +
    sizes[i]
  );
}

export const generateUUID = () => crypto.randomUUID();

export type ScoreTier = "good" | "ok" | "poor";

export const getScoreTier = (score: number): ScoreTier =>
  score >= 70 ? "good" : score >= 50 ? "ok" : "poor";

/**
 * Parse the AI's feedback reply. Tolerates markdown code fences / surrounding prose
 * by extracting the outermost {...} block. Throws a descriptive Error if invalid.
 */
export function parseFeedback(text: string): Feedback {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start)
    throw new Error("AI response did not contain JSON");
  let parsed: any;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("AI response was not valid JSON");
  }
  if (
    typeof parsed?.overallScore !== "number" ||
    !parsed.ATS ||
    !parsed.toneAndStyle
  ) {
    throw new Error(
      "AI response was missing required fields",
    );
  }
  return parsed as Feedback;
}
