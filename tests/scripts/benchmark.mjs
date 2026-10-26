import { chromium } from "playwright";
import {
  readdir,
  mkdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://localhost:5173";
const REQUEST_COUNT = 5; // Increase to 100 after validating
const RESUME_DIR = path.resolve("tests/test-resumes");
const OUTPUT_DIR = path.resolve("benchmark-results");

// Adjust these selectors to match app/routes/upload.tsx.
const SELECTORS = {
  company: 'input[name="company-name"]',
  jobTitle: 'input[name="job-title"]',
  jobDescription: 'textarea[name="job-description"]',
  file: 'input[type="file"]',
  submit: 'button[type="submit"]',
};

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1];
}

const files = (await readdir(RESUME_DIR))
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .sort();

if (!files.length)
  throw new Error("Add PDF files to test-resumes/");

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.connectOverCDP(
  "http://127.0.0.1:9222",
);

const context = browser.contexts()[0];
const page =
  context.pages()[0] ?? (await context.newPage());
const results = [];

let currentResult = null;

page.on("console", (message) => {
  const text = message.text();
  if (!text.includes("[AI_LATENCY]")) return;

  const match = text.match(/\[AI_LATENCY\]\s*(\{.*\})/);
  if (!match || !currentResult) return;

  try {
    const sample = JSON.parse(match[1]);
    currentResult.durationMs = sample.durationMs;
    currentResult.aiStatus = sample.status;
  } catch {
    // Ignore malformed log entries.
  }
});

try {
  await page.goto(`${BASE_URL}/upload`);

  for (let i = 0; i < REQUEST_COUNT; i++) {
    const result = {
      request: i + 1,
      resume: files[i % files.length],
      durationMs: null,
      aiStatus: "unmeasured",
      workflowStatus: "failed",
      error: "",
    };

    currentResult = result;

    try {
      await page.goto(`${BASE_URL}/upload`);

      await page
        .locator(SELECTORS.company)
        .fill("Benchmark Company");
      await page
        .locator(SELECTORS.jobTitle)
        .fill("Software Engineer");
      await page
        .locator(SELECTORS.jobDescription)
        .fill(
          "Seeking a software engineer with JavaScript, React, APIs, and testing skills.",
        );
      await page
        .locator(SELECTORS.file)
        .setInputFiles(
          path.join(RESUME_DIR, result.resume),
        );

      await Promise.all([
        page.waitForURL(/\/resume\/[^/]+$/, {
          timeout: 180000,
        }),
        page.locator(SELECTORS.submit).click(),
      ]);

      result.workflowStatus = "success";
    } catch (error) {
      result.error = String(error);
    }

    results.push({ ...result });
    currentResult = null;

    console.log(
      `${i + 1}/${REQUEST_COUNT}:`,
      result.aiStatus,
      result.durationMs ?? "no latency captured",
    );

    await page.waitForTimeout(1000);
  }
} finally {
  const valid = results.filter(
    (r) =>
      r.aiStatus === "success" &&
      Number.isFinite(r.durationMs),
  );
  const latencies = valid.map((r) => r.durationMs);

  const report = {
    totalRequests: results.length,
    measuredRequests: results.filter((r) =>
      Number.isFinite(r.durationMs),
    ).length,
    successfulAiRequests: results.filter(
      (r) => r.aiStatus === "success",
    ).length,
    failedAiRequests: results.filter(
      (r) => r.aiStatus === "error",
    ).length,
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    averageMs: latencies.length
      ? latencies.reduce((sum, n) => sum + n, 0) /
        latencies.length
      : null,
    results,
  };

  const columns = [
    "request",
    "resume",
    "durationMs",
    "aiStatus",
    "workflowStatus",
    "error",
  ];

  const escapeCsv = (v) =>
    `"${String(v ?? "").replaceAll('"', '""')}"`;

  const csv = [
    columns.join(","),
    ...results.map((r) =>
      columns.map((key) => escapeCsv(r[key])).join(","),
    ),
  ].join("\n");

  await writeFile(
    path.join(OUTPUT_DIR, "latency-results.csv"),
    csv,
  );
  await writeFile(
    path.join(OUTPUT_DIR, "latency-report.json"),
    JSON.stringify(report, null, 2),
  );

  console.log(
    "Report:",
    JSON.stringify(
      {
        totalRequests: report.totalRequests,
        measuredRequests: report.measuredRequests,
        successfulAiRequests: report.successfulAiRequests,
        failedAiRequests: report.failedAiRequests,
        p50Ms: report.p50Ms,
        p95Ms: report.p95Ms,
        averageMs: report.averageMs,
      },
      null,
      2,
    ),
  );

  // await context.close();
  // await browser.close();

  // Leave the externally launched Chrome session open.
}
