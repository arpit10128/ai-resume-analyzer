import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => cleanup());
if (!URL.createObjectURL)
  URL.createObjectURL = () => "blob:mock";
// jsdom does not implement SVG geometry; shim so ScoreGauge can mount.
(SVGElement.prototype as any).getTotalLength = () => 126;
