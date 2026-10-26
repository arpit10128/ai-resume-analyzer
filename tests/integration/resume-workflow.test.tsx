// Integration tests: the full resume workflow across Upload -> AI -> storage -> Home.
// Defect-specific checks live in tests/regression/defect-regressions.test.tsx.
import {
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { usePuterStore } from "~/lib/puter";
vi.mock("~/lib/pdf2img", () => ({
  convertPdfToImage: vi.fn(),
}));
import { convertPdfToImage } from "~/lib/pdf2img";
import Upload from "~/routes/upload";
import Home from "~/routes/home";

const good = {
  overallScore: 78,
  ATS: { score: 82, tips: [] },
  toneAndStyle: { score: 70, tips: [] },
  content: { score: 75, tips: [] },
  structure: { score: 80, tips: [] },
  skills: { score: 72, tips: [] },
};

function store(aiContent: () => any) {
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
  });
  return kvData;
}

const submitResume = async () => {
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

describe("resume workflow: upload -> analyze -> save -> list", () => {
  it("happy path: valid AI response navigates to the resume page", async () => {
    store(() => ({
      message: { content: JSON.stringify(good) },
    }));
    renderUpload();
    await submitResume();
    expect(
      await screen.findByText("RESUME PAGE"),
    ).toBeInTheDocument();
  });

  it("happy path: the analyzed resume is saved to storage with its feedback", async () => {
    const kv = store(() => ({
      message: { content: JSON.stringify(good) },
    }));
    renderUpload();
    await submitResume();
    await screen.findByText("RESUME PAGE");

    const keys = [...kv.keys()].filter((k) =>
      k.startsWith("resume:"),
    );
    expect(keys).toHaveLength(1);
    const saved = JSON.parse(kv.get(keys[0])!);
    expect(saved.feedback.overallScore).toBe(78);
  });

  it("a resume analyzed on Upload then appears on Home with its score", async () => {
    store(() => ({
      message: { content: JSON.stringify(good) },
    }));
    const { unmount } = renderUpload();
    await submitResume();
    await screen.findByText("RESUME PAGE");
    unmount();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText("78/100"),
    ).toBeInTheDocument();
  });

  it("a failed analysis saves no completed resume", async () => {
    const kv = store(() => ({
      message: { content: "not json at all" },
    }));
    renderUpload();
    await submitResume();
    await screen.findByRole("alert");

    const completed = [...kv.values()]
      .map((v) => JSON.parse(v))
      .filter(
        (r) =>
          r.feedback && r.feedback.overallScore != null,
      );
    expect(completed).toHaveLength(0);
  });
});
