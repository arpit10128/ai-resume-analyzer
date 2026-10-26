import { cn, formatSize, generateUUID } from "~/lib/utils";
import {
  prepareInstructions,
  AIResponseFormat,
} from "../../constants";

describe("utils", () => {
  it("formatSize handles 0, KB, MB, and the 20MB limit", () => {
    expect(formatSize(0)).toBe("0 Bytes");
    expect(formatSize(1024)).toBe("1 KB");
    expect(formatSize(1536)).toBe("1.5 KB");
    expect(formatSize(20 * 1024 * 1024)).toBe("20 MB");
  });
  it("cn merges conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
  it("generateUUID returns unique v4-style ids", () => {
    const ids = new Set(
      Array.from({ length: 1000 }, generateUUID),
    );
    expect(ids.size).toBe(1000);
    expect([...ids][0]).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("prepareInstructions (AI prompt)", () => {
  const p = prepareInstructions({
    jobTitle: "SWE",
    jobDescription: "Build React apps",
  });
  it("injects job title and description", () => {
    expect(p).toContain("The job title is: SWE");
    expect(p).toContain("Build React apps");
  });
  it("embeds the JSON schema and demands JSON-only output", () => {
    expect(p).toContain(AIResponseFormat);
    expect(p).toMatch(
      /JSON object, without any other text/,
    );
  });
  it("schema covers all 5 scored categories", () => {
    for (const k of [
      "overallScore",
      "ATS",
      "toneAndStyle",
      "content",
      "structure",
      "skills",
    ])
      expect(AIResponseFormat).toContain(k);
  });
});
