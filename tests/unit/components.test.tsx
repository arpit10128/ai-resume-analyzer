import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ScoreBadge from "~/components/ScoreBadge";
import ATS from "~/components/ATS";
import Summary from "~/components/Summary";
import Details from "~/components/Details";
import ScoreCircle from "~/components/ScoreCircle";
import FileUploader from "~/components/FileUploader";

const tip = (type: "good" | "improve", t = "t") => ({
  type,
  tip: t,
  explanation: "e-" + t,
});
const feedback = (o = 80): Feedback => ({
  overallScore: o,
  ATS: {
    score: o,
    tips: [
      { type: "good", tip: "Keywords" },
      { type: "improve", tip: "Add skills" },
    ],
  },
  toneAndStyle: { score: o, tips: [tip("good", "Tone A")] },
  content: {
    score: o,
    tips: [tip("improve", "Content A")],
  },
  structure: { score: o, tips: [tip("good", "Struct A")] },
  skills: { score: o, tips: [tip("improve", "Skill A")] },
});

describe("ScoreBadge (Summary badge)", () => {
  it.each([
    [95, "Strong"],
    [71, "Strong"],
    [60, "Good Start"],
    [50, "Good Start"],
    [49, "Needs Work"],
    [0, "Needs Work"],
  ])("score %i -> %s", (s, label) => {
    render(<ScoreBadge score={s} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("ATS card", () => {
  it.each([
    [85, "Great Job!"],
    [60, "Good Start"],
    [20, "Needs Improvement"],
  ])("score %i -> %s", (s, label) => {
    render(<ATS score={s} suggestions={[]} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(
      screen.getByText(`ATS Score - ${s}/100`),
    ).toBeInTheDocument();
  });
  it("renders every suggestion with correct icon", () => {
    render(
      <ATS score={70} suggestions={feedback().ATS.tips} />,
    );
    expect(
      screen.getByText("Keywords"),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Check")).toHaveAttribute(
      "src",
      "/icons/check.svg",
    );
    expect(screen.getByAltText("Warning")).toHaveAttribute(
      "src",
      "/icons/warning.svg",
    );
  });
  it("picks green/yellow/red gradient by score", () => {
    const { container, rerender } = render(
      <ATS score={90} suggestions={[]} />,
    );
    expect(container.firstChild).toHaveClass(
      "from-green-100",
    );
    rerender(<ATS score={55} suggestions={[]} />);
    expect(container.firstChild).toHaveClass(
      "from-yellow-100",
    );
    rerender(<ATS score={10} suggestions={[]} />);
    expect(container.firstChild).toHaveClass(
      "from-red-100",
    );
  });
});

describe("Summary", () => {
  it("shows overall score and all 4 category rows", () => {
    render(<Summary feedback={feedback(82)} />);
    expect(
      screen.getByText("Your Resume Score"),
    ).toBeInTheDocument();
    for (const c of [
      "Tone & Style",
      "Content",
      "Structure",
      "Skills",
    ])
      expect(screen.getByText(c)).toBeInTheDocument();
    expect(screen.getByText("82/100")).toBeInTheDocument();
  });
});

describe("Details accordion", () => {
  it("renders 4 collapsible sections; tips present in DOM and toggle state works", () => {
    render(<Details feedback={feedback(75)} />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
    const content = screen
      .getByText("Content")
      .closest("button")!;
    const panel = screen
      .getByText("e-Content A")
      .closest(".overflow-hidden")!;
    expect(panel.className).toContain("max-h-0");
    fireEvent.click(content);
    expect(panel.className).toContain("max-h-fit");
    fireEvent.click(
      screen.getByText("Skills").closest("button")!,
    );
    expect(panel.className).toContain("max-h-0"); // single-open accordion closes previous
  });
  it("badge colours: >69 green, >39 yellow, else red", () => {
    const { container } = render(
      <Details
        feedback={{
          ...feedback(),
          toneAndStyle: { score: 90, tips: [] },
          content: { score: 50, tips: [] },
          structure: { score: 10, tips: [] },
        }}
      />,
    );
    expect(
      container.querySelector(".bg-badge-green"),
    ).toBeTruthy();
    expect(
      container.querySelector(".bg-badge-yellow"),
    ).toBeTruthy();
    expect(
      container.querySelector(".bg-badge-red"),
    ).toBeTruthy();
  });
});

describe("ScoreCircle", () => {
  it("computes stroke offset proportional to score", () => {
    const { container } = render(
      <ScoreCircle score={50} />,
    );
    const c = container.querySelectorAll("circle")[1];
    const circ = 2 * Math.PI * 36;
    expect(
      parseFloat(c.getAttribute("stroke-dashoffset")!),
    ).toBeCloseTo(circ * 0.5, 3);
    expect(screen.getByText("50/100")).toBeInTheDocument();
  });
});

describe("FileUploader validation", () => {
  const upload = (file: File) => {
    const onSelect = vi.fn();
    const { container } = render(
      <FileUploader onFileSelect={onSelect} />,
    );
    const input = container.querySelector(
      "input[type=file]",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    return onSelect;
  };
  it("accepts a PDF", async () => {
    const f = new File(["%PDF-1.4"], "cv.pdf", {
      type: "application/pdf",
    });
    const cb = upload(f);
    await waitFor(() =>
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ name: "cv.pdf" }),
      ),
    );
  });
  it("rejects non-PDF (docx/png)", async () => {
    for (const [n, t] of [
      [
        "cv.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      ["cv.png", "image/png"],
    ]) {
      const cb = upload(new File(["x"], n, { type: t }));
      await waitFor(() =>
        expect(cb).toHaveBeenCalledWith(null),
      );
    }
  });
  it("rejects PDFs over 20MB, accepts exactly at the limit", async () => {
    const big = new File(
      [new Uint8Array(20 * 1024 * 1024 + 1)],
      "big.pdf",
      { type: "application/pdf" },
    );
    const cb = upload(big);
    await waitFor(() =>
      expect(cb).toHaveBeenCalledWith(null),
    );
    const ok = new File(
      [new Uint8Array(20 * 1024 * 1024)],
      "ok.pdf",
      { type: "application/pdf" },
    );
    const cb2 = upload(ok);
    await waitFor(() =>
      expect(cb2).toHaveBeenCalledWith(
        expect.objectContaining({ name: "ok.pdf" }),
      ),
    );
  });
});
