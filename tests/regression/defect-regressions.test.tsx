// Regression tests for 4 defects found in the initial audit (all failed before the fixes).
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { getScoreTier, parseFeedback } from "~/lib/utils";
vi.mock("~/lib/pdf2img", () => ({
  convertPdfToImage: vi.fn(),
}));
import { convertPdfToImage } from "~/lib/pdf2img";
import Upload from "~/routes/upload";
import Home from "~/routes/home";
import ScoreBadge from "~/components/ScoreBadge";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import Summary from "~/components/Summary";
import ScoreCircle from "~/components/ScoreCircle";

const good = {
  overallScore: 78,
  ATS: { score: 82, tips: [] },
  toneAndStyle: { score: 70, tips: [] },
  content: { score: 75, tips: [] },
  structure: { score: 80, tips: [] },
  skills: { score: 72, tips: [] },
};

function store(aiContent: () => any, extra: any = {}) {
  const kvData = new Map<string, string>();
  usePuterStore.setState({
    isLoading: false,
    error: null,
    auth: {
      ...usePuterStore.getState().auth,
      isAuthenticated: true,
    },
    kv: {
      set: async (k: string, v: string) => {
        kvData.set(k, v);
        return true;
      },
      get: async () => null,
      delete: vi.fn(),
      flush: vi.fn(),
      list: async () =>
        [...kvData].map(([key, value]) => ({ key, value })),
    } as any,
    fs: {
      upload: async (f: File[]) => ({
        path: "/u/" + f[0].name,
      }),
      read: async () => new Blob(["x"]),
    } as any,
    ai: { feedback: async () => aiContent() } as any,
    ...extra,
  });
  return kvData;
}
const selectFile = async () => {
  fireEvent.change(
    document.querySelector("input[type=file]")!,
    {
      target: {
        files: [
          new File(["%PDF"], "cv.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    },
  );
  await screen.findByText("cv.pdf");
};
const submit = async () => {
  await selectFile();
  fireEvent.click(screen.getByText("Analyze Resume"));
};
const renderUpload = () =>
  render(
    <MemoryRouter initialEntries={["/upload"]}>
      <Routes>
        <Route path="/upload" element={<Upload />} />
        <Route
          path="/resume/:id"
          element={<div>RESUME PAGE</div>}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(convertPdfToImage).mockResolvedValue({
    imageUrl: "x",
    file: new File(["p"], "cv.png", { type: "image/png" }),
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("D1: one set of score thresholds everywhere", () => {
  it.each([
    [100, "good"],
    [70, "good"],
    [69, "ok"],
    [50, "ok"],
    [49, "poor"],
    [0, "poor"],
  ])("getScoreTier(%i) = %s", (s, t) => {
    expect(getScoreTier(s as number)).toBe(t);
  });
  it.each([
    [70, "Strong", "Great Job!", "bg-badge-green"],
    [69, "Good Start", "Good Start", "bg-badge-yellow"],
    [50, "Good Start", "Good Start", "bg-badge-yellow"],
    [49, "Needs Work", "Needs Improvement", "bg-badge-red"],
  ])(
    "score %i: Summary badge, ATS card and Details badge agree",
    (score, badge, ats, detailsClass) => {
      const { unmount } = render(
        <ScoreBadge score={score as number} />,
      );
      expect(
        screen.getByText(badge as string),
      ).toBeInTheDocument();
      unmount();
      render(
        <ATS score={score as number} suggestions={[]} />,
      );
      expect(
        screen.getByText(ats as string),
      ).toBeInTheDocument();
      cleanup2();
      const fb: any = {
        ...good,
        toneAndStyle: { score, tips: [] },
      };
      const r = render(<Details feedback={fb} />);
      expect(
        r.container.querySelector("." + detailsClass),
      ).toBeTruthy();
    },
  );
  it("Summary category number colour uses the same cutoff", () => {
    const fb: any = {
      ...good,
      overallScore: 70,
      toneAndStyle: { score: 70, tips: [] },
      content: { score: 69, tips: [] },
      structure: { score: 49, tips: [] },
      skills: { score: 50, tips: [] },
    };
    const { container } = render(<Summary feedback={fb} />);
    const nums = (cls: string) =>
      container.querySelectorAll(`p.text-2xl > span.${cls}`)
        .length;
    expect(nums("text-green-600")).toBe(1);
    expect(nums("text-yellow-600")).toBe(2);
    expect(nums("text-red-600")).toBe(1);
  });
});
function cleanup2() {
  document.body.innerHTML = "";
}

describe("D2: malformed / failing AI responses are handled", () => {
  it("non-JSON AI output -> visible error, no unhandled rejection, form usable again", async () => {
    store(() => ({
      message: {
        content:
          "Sure! Here is your analysis: {oops, not json}",
      },
    }));
    const unhandled: any[] = [];
    const h = (e: any) => unhandled.push(e);
    process.on("unhandledRejection", h);
    renderUpload();
    await submit();
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /AI returned malformed JSON/,
    );
    await new Promise((r) => setTimeout(r, 50));
    process.off("unhandledRejection", h);
    expect(unhandled).toHaveLength(0);
    expect(
      screen.getByText("Analyze Resume"),
    ).toBeVisible();
  });
  it("AI call that throws -> visible error", async () => {
    store(() => {
      throw new Error("AI down");
    });
    renderUpload();
    await submit();
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("AI down");
  });
  it("JSON wrapped in ```json fences is accepted", async () => {
    store(() => ({
      message: {
        content:
          "```json\n" + JSON.stringify(good) + "\n```",
      },
    }));
    renderUpload();
    await submit();
    await screen.findByText("RESUME PAGE");
  });
  it("JSON missing required fields is rejected", () => {
    expect(() => parseFeedback('{"foo":1}')).toThrow(
      /missing required fields/,
    );
    expect(() => parseFeedback("no json here")).toThrow(
      /did not contain a JSON object/,
    );
    expect(
      parseFeedback(JSON.stringify(good)).overallScore,
    ).toBe(78);
  });
});

describe("D3: user can retry after any upload-flow error", () => {
  it("upload failure -> error shown, form visible, entered data and file preserved, retry succeeds", async () => {
    let fail = true;
    store(
      () => ({
        message: { content: JSON.stringify(good) },
      }),
      {
        fs: {
          upload: async (f: File[]) =>
            fail ? undefined : { path: "/u/" + f[0].name },
        } as any,
      },
    );
    renderUpload();
    fireEvent.change(screen.getByLabelText("Job Title"), {
      target: { value: "Frontend Dev" },
    });
    await submit();
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Error: Failed to upload file");
    expect(
      screen.getByText("Analyze Resume"),
    ).toBeVisible();
    expect(screen.getByLabelText("Job Title")).toHaveValue(
      "Frontend Dev",
    );
    expect(screen.getByText("cv.pdf")).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByText("Analyze Resume"));
    await screen.findByText("RESUME PAGE");
  });
  it("form is hidden (not just present) while processing", async () => {
    store(() => new Promise(() => {})); // AI never resolves
    renderUpload();
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText("Analyzing..."),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Analyze Resume"),
    ).not.toBeVisible();
  });
});

describe("D4: no fabricated score for unanalyzed resumes", () => {
  it("record with feedback '' shows 'Analysis pending', not 75/100", async () => {
    const kv = store(() => null);
    kv.set(
      "resume:p",
      JSON.stringify({
        id: "p",
        companyName: "Pending",
        imagePath: "/i",
        resumePath: "/r",
        feedback: "",
      }),
    );
    kv.set(
      "resume:q",
      JSON.stringify({
        id: "q",
        companyName: "Done",
        imagePath: "/i",
        resumePath: "/r",
        feedback: good,
      }),
    );
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    await screen.findByText("Pending");
    expect(
      screen.getByText("Analysis pending"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("75/100"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("78/100")).toBeInTheDocument();
  });
  it("ScoreCircle no longer invents a default score", () => {
    render(<ScoreCircle score={undefined as any} />);
    expect(
      screen.queryByText("75/100"),
    ).not.toBeInTheDocument();
  });
});
