import { usePuterStore } from "~/lib/puter";

const mkPuter = (over: any = {}) => ({
  auth: {
    isSignedIn: vi.fn().mockResolvedValue(true),
    getUser: vi
      .fn()
      .mockResolvedValue({ uuid: "u1", username: "arpit" }),
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
  kv: {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(true),
    list: vi.fn(),
    delete: vi.fn(),
    flush: vi.fn(),
  },
  fs: {
    write: vi.fn(),
    read: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    readdir: vi.fn(),
  },
  ai: {
    chat: vi
      .fn()
      .mockResolvedValue({ message: { content: "{}" } }),
    img2txt: vi.fn(),
  },
  ...over,
});
const reset = () =>
  usePuterStore.setState({ error: null, isLoading: true });

describe("usePuterStore", () => {
  beforeEach(() => {
    reset();
    delete (window as any).puter;
  });

  it("reports error when Puter.js is not loaded (all service paths)", async () => {
    const s = usePuterStore.getState();
    expect(await s.auth.checkAuthStatus()).toBe(false);
    expect(usePuterStore.getState().error).toBe(
      "Puter.js not available",
    );
    reset();
    expect(await s.kv.get("k")).toBeUndefined();
    expect(usePuterStore.getState().error).toBe(
      "Puter.js not available",
    );
    reset();
    expect(
      await s.ai.feedback("/p.pdf", "m"),
    ).toBeUndefined();
    expect(usePuterStore.getState().error).toBe(
      "Puter.js not available",
    );
  });

  it("checkAuthStatus -> authenticated with user", async () => {
    (window as any).puter = mkPuter();
    expect(
      await usePuterStore.getState().auth.checkAuthStatus(),
    ).toBe(true);
    const st = usePuterStore.getState();
    expect(st.auth.isAuthenticated).toBe(true);
    expect(st.auth.user?.username).toBe("arpit");
    expect(st.isLoading).toBe(false);
  });

  it("checkAuthStatus -> unauthenticated", async () => {
    (window as any).puter = mkPuter({
      auth: {
        isSignedIn: vi.fn().mockResolvedValue(false),
        getUser: vi.fn(),
      },
    });
    expect(
      await usePuterStore.getState().auth.checkAuthStatus(),
    ).toBe(false);
    expect(
      usePuterStore.getState().auth.isAuthenticated,
    ).toBe(false);
  });

  it("surfaces thrown auth errors in store.error", async () => {
    (window as any).puter = mkPuter({
      auth: {
        isSignedIn: vi
          .fn()
          .mockRejectedValue(new Error("network down")),
      },
    });
    expect(
      await usePuterStore.getState().auth.checkAuthStatus(),
    ).toBe(false);
    expect(usePuterStore.getState().error).toBe(
      "network down",
    );
  });

  it("signIn then signOut flips auth state", async () => {
    (window as any).puter = mkPuter();
    await usePuterStore.getState().auth.signIn();
    expect(
      usePuterStore.getState().auth.isAuthenticated,
    ).toBe(true);
    await usePuterStore.getState().auth.signOut();
    expect(
      usePuterStore.getState().auth.isAuthenticated,
    ).toBe(false);
  });

  it("ai.feedback sends the PDF path + prompt as a file+text message", async () => {
    const p = mkPuter();
    (window as any).puter = p;
    await usePuterStore
      .getState()
      .ai.feedback("/u/cv.pdf", "analyze");
    const [msgs, opts] = p.ai.chat.mock.calls[0];
    expect(msgs[0].content).toEqual([
      { type: "file", puter_path: "/u/cv.pdf" },
      { type: "text", text: "analyze" },
    ]);
    expect(opts).toHaveProperty("model");
  });

  it("kv.list defaults returnValues to false", async () => {
    const p = mkPuter();
    (window as any).puter = p;
    await usePuterStore.getState().kv.list("resume:*");
    expect(p.kv.list).toHaveBeenCalledWith(
      "resume:*",
      false,
    );
  });

  it("init() flags failure after 10s if Puter never loads", () => {
    vi.useFakeTimers();
    usePuterStore.getState().init();
    vi.advanceTimersByTime(10_001);
    expect(usePuterStore.getState().error).toBe(
      "Puter.js failed to load within 10 seconds",
    );
    vi.useRealTimers();
  });
});
