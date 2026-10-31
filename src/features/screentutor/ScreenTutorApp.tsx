import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, BookOpen, Check, CircleHelp, Clipboard, Clock3, Copy, Crop, Eye, FileText, Keyboard,
  Download, ExternalLink, ImageUp, Menu, MonitorUp, MoreHorizontal, Play, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, Square, Trash2, TriangleAlert, X,
} from "lucide-react";
import { hasBrowserCapture, buildSearchQuery, captureService, classifyContent, cleanOcrText, cropByFraction, cropImage, googleSearch, hasDesktopBridge, hasMiniWindow, historyToMarkdown, OllamaProvider, openMiniWindow, parseOllamaUrl, readImageFile, recognizeImage, ScreenTutorError, ShareSession, toFraction, toImageRect, type OllamaEndpoint, type ProviderState } from "./services";
import { useScreenTutorStore } from "./store";
import type { AnalysisResult, ContentType, HistoryEntry, ScreenRegion, SearchHit } from "./types";
import "./screenTutor.css";

type Page = "home" | "history" | "settings";
type Settings = ReturnType<typeof useScreenTutorStore.getState>["settings"];
interface PixelBox { x: number; y: number; width: number; height: number }
interface Selection { rect: PixelBox; fraction: PixelBox }
interface ProviderCheck { state: ProviderState; model: string }

const typeLabels: Record<ContentType, string> = { MULTIPLE_CHOICE: "Multiple choice", PROGRAMMING_ERROR: "Programming error", TRANSLATION: "Translation", MATH: "Math", GENERAL_TEXT: "General text", UNKNOWN: "Unknown" };
const languageLabels: Record<Settings["ocrLanguage"], string> = { "tha+eng": "Thai + English", tha: "Thai", eng: "English", auto: "Auto detect" };
const URL_CHECK_DELAY_MS = 600;
const OLLAMA_CORS_HINT = "If Ollama is running but not found, allow this site: set OLLAMA_ORIGINS to this page's address (for example https://screentutor.vercel.app), then restart Ollama.";

function formatTime(iso: string) { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }
function formatDuration(ms: number) { return `${(ms / 1000).toFixed(1)}s`; }

/** Moves focus into a dialog, keeps Tab inside it, closes on Escape and returns focus afterwards. */
function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((item) => !item.hasAttribute("disabled"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus?.(); };
  }, []);
  return ref;
}

export default function ScreenTutorApp() {
  const desktop = useMemo(() => hasDesktopBridge(), []);
  const [page, setPage] = useState<Page>("home");
  const [showCapture, setShowCapture] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [status, setStatus] = useState<"idle" | "capturing" | "reading" | "searching" | "thinking" | "done" | "error">("idle");
  const [providerState, setProviderState] = useState<ProviderState>("initializing");
  const [models, setModels] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const share = useMemo(() => new ShareSession(), []);
  const [sharing, setSharing] = useState(false);
  const [area, setArea] = useState<PixelBox | null>(null);
  const [mini, setMini] = useState<Window | null>(null);
  const [floating, setFloating] = useState(false);
  const miniOpen = mini !== null || floating;
  const miniOpenRef = useRef(false);
  useEffect(() => { miniOpenRef.current = miniOpen; });
  useEffect(() => () => share.stop(), [share]);
  const fileInput = useRef<HTMLInputElement>(null);
  const { settings, region, history, setRegion, setSettings, addHistory, deleteHistory, clearHistory } = useScreenTutorStore();
  const endpoint = useMemo(() => parseOllamaUrl(settings.ollamaUrl), [settings.ollamaUrl]);

  const checkProvider = useCallback(async (signal?: AbortSignal): Promise<ProviderCheck> => {
    const finish = (state: ProviderState, model = ""): ProviderCheck => {
      if (!signal?.aborted) { setProviderState(state); if (state !== "ready") setModels([]); }
      return { state, model };
    };
    if (!endpoint) return finish("unavailable");
    if (!signal?.aborted) setProviderState("initializing");
    const provider = new OllamaProvider(endpoint.url);
    const health = await provider.health(signal);
    if (health !== "ready") return finish(health);
    try {
      const discovered = (await provider.models(signal)).map((model) => model.name);
      if (!discovered.length) return finish("unavailable");
      const model = discovered.includes(settings.model) ? settings.model : discovered[0];
      if (!signal?.aborted) { setModels(discovered); if (model !== settings.model) setSettings({ model }); }
      return finish("ready", model);
    } catch (error) {
      return finish(error instanceof ScreenTutorError && error.code === "invalid_response" ? "error" : "unavailable");
    }
  }, [endpoint, settings.model, setSettings]);

  const checkRef = useRef(checkProvider);
  useEffect(() => { checkRef.current = checkProvider; });

  // Re-check after the address stops changing, so typing a URL does not probe every keystroke (or half-typed hosts).
  const firstProbe = useRef(true);
  useEffect(() => {
    const controller = new AbortController();
    const delay = firstProbe.current ? 0 : URL_CHECK_DELAY_MS;
    firstProbe.current = false;
    const timer = window.setTimeout(() => void checkRef.current(controller.signal), delay);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [settings.ollamaUrl]);

  const chooseRegion = async () => {
    const nativeSelector = window.screenTutor?.selectRegion;
    if (!nativeSelector) { setNotice("Selecting a fixed region needs the desktop app. Use Capture screen or paste an image instead."); return; }
    setNotice("Select a region anywhere on your desktop. Press Esc to cancel.");
    try {
      const next = await nativeSelector();
      if (next) { setRegion(next); setNotice("Region saved"); } else { setNotice(null); }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to select a desktop region.");
    }
  };

  const busyNow = status === "capturing" || status === "reading" || status === "searching" || status === "thinking";

  /** A failed check or analysis must not lock the app: look again before refusing. */
  const ensureProvider = async (): Promise<string> => {
    let { state, model } = { state: providerState, model: settings.model };
    if (state !== "ready" || !model) ({ state, model } = await checkProvider());
    if (state !== "ready" || !model) throw new ScreenTutorError("unavailable", `AI unavailable. Start Ollama and select a model, then retry.${desktop ? "" : ` ${OLLAMA_CORS_HINT}`}`);
    return model;
  };

  /** Shared by every image source: OCR the image, classify it, ask Ollama. */
  const analyzeImage = async (imageDataUrl: string | undefined, started: number, model: string) => {
    if (!imageDataUrl) throw new ScreenTutorError("capture_unavailable", "Screen capture returned no image. No analysis was run.");
    setStatus("reading");
    const result = await recognizeImage(imageDataUrl, settings.ocrLanguage);
    const recognized = result.cleanedText;
    if (!recognized.trim()) throw new ScreenTutorError("no_text", "No readable text was detected. Try selecting a tighter region or increasing text size.");
    await analyzeText(recognized, started, model);
  };

  /** Classify the text, optionally look it up on Google, and ask Ollama; also used to re-run after OCR fixes or for more depth. */
  const analyzeText = async (text: string, started: number, model: string, previousSummary?: string) => {
    setOcrText(text);
    let sources: SearchHit[] | undefined;
    if (settings.research) {
      if (!settings.googleApiKey || !settings.googleCx) {
        setNotice("Google research is on but no API key and search engine ID are set. Add them in Settings. Answering without web results.");
      } else {
        setStatus("searching");
        try { sources = await googleSearch(buildSearchQuery(text), settings.googleApiKey, settings.googleCx); }
        catch (error) { setNotice(`${error instanceof ScreenTutorError ? error.message : "Google search failed."} Answering without web results.`); }
      }
    }
    setStatus("thinking");
    setProgress(0);
    const contentType = classifyContent(text);
    const answer = await new OllamaProvider(endpoint?.url ?? settings.ollamaUrl).analyze({ text, contentType, learningMode: previousSummary ? "tutor" : settings.learningMode, model, temperature: settings.temperature, previousSummary, sources }, setProgress);
    const nextAnalysis: AnalysisResult = sources?.length ? { ...answer, sources } : answer;
    setAnalysis(nextAnalysis);
    setStatus("done");
    const totalTime = Math.round(performance.now() - started);
    if (settings.storeHistory) addHistory({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ocrText: text, contentType, analysis: nextAnalysis, processingTime: totalTime });
    // The mini window already shows the result; a modal in the page would pull the learner away from their screen.
    if (!miniOpenRef.current) setShowCapture(true);
    window.screenTutor?.showResult();
  };

  const reanalyze = async (text: string, deeper: boolean) => {
    if (busyNow || !text.trim()) return;
    setShowCapture(false);
    try { await analyzeText(text.trim(), performance.now(), await ensureProvider(), deeper ? analysis?.summary : undefined); } catch (error) { fail(error); }
  };

  const fail = (error: unknown) => {
    setStatus("error");
    if (error instanceof ScreenTutorError) {
      if (error.code === "unavailable") setProviderState("unavailable");
      else if (error.code === "invalid_response" || error.code === "request_failed" || error.code === "timeout") setProviderState("error");
    }
    if (!(error instanceof ScreenTutorError)) console.error("ScreenTutor request failed", error);
    setNotice(error instanceof ScreenTutorError ? error.message : `ScreenTutor could not complete the request${error instanceof Error && error.message ? `: ${error.message}` : ""}. Please retry.`);
  };

  /** Desktop app: capture the saved region and analyse it. */
  const runAnalysis = async () => {
    if (busyNow) return;
    const started = performance.now();
    setStatus("capturing");
    try {
      if (!desktop) throw new ScreenTutorError("capture_unavailable", "Pick a screen with Capture screen, or paste an image.");
      const model = await ensureProvider();
      if (!region) throw new ScreenTutorError("capture_unavailable", "Select a real screen region before starting analysis.");
      const capture = await captureService.captureRegion(region);
      await analyzeImage(capture.imageDataUrl, started, model);
    } catch (error) { fail(error); }
  };

  /** Browser: an image from the share-screen picker, the clipboard, a drop or a file, optionally cropped first. */
  const analyzePicked = async (imageDataUrl: string) => {
    if (busyNow) return;
    setPendingImage(null);
    setLastImage(imageDataUrl);
    setStatus("capturing");
    try { await analyzeImage(imageDataUrl, performance.now(), await ensureProvider()); } catch (error) { fail(error); }
  };

  const attachMini = (win: Window) => {
    setMini(win);
    win.addEventListener("pagehide", () => setMini(null));
    win.addEventListener("keydown", (event) => hotkeyRef.current(event));
  };

  const openMini = async () => {
    if (!hasMiniWindow()) { setFloating(true); return; }
    try { attachMini(await openMiniWindow()); } catch { setFloating(true); }
  };

  const closeMini = () => { mini?.close(); setMini(null); setFloating(false); };

  /** Share the screen once; every later question is one click (or the mini window's Capture button). */
  const startSharing = async () => {
    if (busyNow || sharing) return;
    try {
      // The mini window needs this click's user activation, so it opens before the screen picker does.
      await openMini();
      await share.start(() => { setSharing(false); closeMini(); setNotice("Screen sharing stopped."); });
      setSharing(true);
      setArea(null);
    } catch (error) { closeMini(); fail(error); }
  };

  const stopSharing = () => { share.stop(); setSharing(false); closeMini(); };

  /** Read the saved area from the live screen; with no saved area (or when asked) let the learner drag one first. */
  const captureShared = async (pick = false) => {
    if (busyNow) return;
    try {
      const frame = share.grabFrame();
      if (pick || !area) { setPendingImage(frame); return; }
      await analyzePicked(await cropByFraction(frame, area));
    } catch (error) { fail(error); }
  };

  // Alt+Shift+C reads the saved area while sharing; it works in this page and in the mini window (the browser has no global hotkeys).
  const hotkeyRef = useRef((_event: KeyboardEvent) => {});
  useEffect(() => {
    hotkeyRef.current = (event) => {
      if (sharing && event.altKey && event.shiftKey && event.code === "KeyC") { event.preventDefault(); void captureShared(false); }
    };
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => hotkeyRef.current(event);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const cropDone = (image: string, fraction: PixelBox | null) => {
    if (fraction && sharing) setArea(fraction);
    void analyzePicked(image);
  };

  const openImageFile = async (file: File | undefined) => {
    if (!file || busyNow) return;
    // A pasted, dropped or chosen image is read straight away; "Select a different area" in the result narrows it.
    try { await analyzePicked(await readImageFile(file)); } catch (error) { fail(error); }
  };

  // Paste a screenshot (Win+Shift+S, then Ctrl+V) anywhere on the page, except while typing in a field.
  const openRef = useRef(openImageFile);
  useEffect(() => { openRef.current = openImageFile; });
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));
      if (file) { event.preventDefault(); void openRef.current(file); }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    if (!desktop) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.code === "Space") { event.preventDefault(); void runAnalysis(); }
    };
    window.addEventListener("keydown", onKeyDown);
    const removeGlobalHotkey = window.screenTutor?.onHotkey(() => void runAnalysis());
    return () => { window.removeEventListener("keydown", onKeyDown); removeGlobalHotkey?.(); };
  });

  const goTo = (next: Page) => { setPage(next); setMobileNav(false); };
  const pageTitle = page === "home" ? "Workspace" : page === "history" ? "History" : "Settings";
  const local = endpoint?.local ?? true;
  return (
    <div
      className={`st-shell ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void openImageFile([...event.dataTransfer.files].find((file) => file.type.startsWith("image/"))); }}
    >
      <input ref={fileInput} type="file" accept="image/*" hidden aria-label="Choose an image" onChange={(event) => { void openImageFile(event.target.files?.[0]); event.target.value = ""; }} />
      <aside className={`st-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="st-brand"><div className="st-brand-mark"><Eye size={18} strokeWidth={2.5} /></div><div><strong>ScreenTutor</strong><span>See. Understand. Learn.</span></div></div>
        <div className="st-nav-label">Workspace</div>
        <nav aria-label="Primary navigation">
          <NavButton active={page === "home"} icon={<MonitorUp size={18} />} label="Home" onClick={() => goTo("home")} />
          <NavButton active={page === "history"} icon={<Clock3 size={18} />} label="History" count={history.length || undefined} onClick={() => goTo("history")} />
          <NavButton active={page === "settings"} icon={<Settings2 size={18} />} label="Settings" onClick={() => goTo("settings")} />
          {!desktop && <a className="st-nav-item" href="/projects"><ArrowLeft size={18} /><span>Nexus All</span></a>}
        </nav>
        <div className="st-sidebar-bottom">
          <div className="st-privacy"><ShieldCheck size={16} /><div><strong>{local ? "Private by default" : "Remote AI server"}</strong><span>{local ? "Your screen data stays on this device." : "Screen text is sent to the server in Settings."}</span></div></div>
          <div className="st-version">ScreenTutor MVP <span>v0.1</span></div>
        </div>
      </aside>
      {mobileNav && <button className="st-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="st-main">
        <header className="st-topbar">
          <button className="st-icon-button st-menu-button" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div><p className="st-breadcrumb">ScreenTutor <span>/</span> {pageTitle}</p><h1>{pageTitle}</h1></div>
          <div className="st-topbar-actions"><ConnectionPill state={providerState} /><button className="st-icon-button" aria-label="Help" onClick={() => setShowHelp(true)}><CircleHelp size={19} /></button></div>
        </header>
        <div className="st-content">
          {page === "home" && <HomeView desktop={desktop} sharing={sharing} miniOpen={miniOpen} hasArea={Boolean(area)} onShare={() => void startSharing()} onShared={(pick) => void captureShared(pick)} onStopShare={stopSharing} onOpenMini={() => void openMini()} onImage={() => fileInput.current?.click()} region={region} settings={settings} status={status} progress={progress} providerState={providerState} local={local} onSelect={() => void chooseRegion()} onCapture={() => void runAnalysis()} onRetry={() => void checkProvider()} onDebug={() => setShowDebug(true)} onSettings={() => goTo("settings")} />}
          {page === "history" && <HistoryView history={history} saving={settings.storeHistory} onDelete={deleteHistory} onClear={clearHistory} onOpen={(entry) => { setOcrText(entry.ocrText); setAnalysis(entry.analysis); setShowCapture(true); }} />}
          {page === "settings" && <SettingsView desktop={desktop} settings={settings} region={region} models={models} endpoint={endpoint} onSettings={setSettings} onSelect={() => void chooseRegion()} onReset={() => setRegion(null)} onClear={clearHistory} />}
        </div>
      </main>
      {showCapture && analysis && <ResultOverlay analysis={analysis} ocrText={ocrText} onClose={() => setShowCapture(false)} onReanalyze={(text, deeper) => void reanalyze(text, deeper)} onRecrop={lastImage ? () => { setShowCapture(false); setPendingImage(lastImage); } : undefined} />}
      {showDebug && <DebugPanel ocrText={ocrText} analysis={analysis} onClose={() => setShowDebug(false)} onRetry={() => { setShowDebug(false); void runAnalysis(); }} />}
      {pendingImage && !mini && <CropDialog image={pendingImage} onCancel={() => { setPendingImage(null); setStatus("idle"); }} onAnalyze={cropDone} />}
      {miniOpen && (() => {
        const panel = (
          <MiniPanel
            floating={!mini} sharing={sharing} status={status} progress={progress} analysis={analysis} hasArea={Boolean(area)}
            message={status === "error" ? notice : null} research={settings.research} onResearch={(research) => setSettings({ research })}
            pendingImage={pendingImage} onCropDone={cropDone} onCropCancel={() => { setPendingImage(null); setStatus("idle"); }}
            onCapture={(pick) => void captureShared(pick)} onStop={stopSharing} onClose={closeMini} onDeeper={() => void reanalyze(ocrText, true)}
          />
        );
        return mini ? createPortal(panel, mini.document.body) : panel;
      })()}
      {showHelp && <HelpDialog desktop={desktop} onClose={() => setShowHelp(false)} />}
      {notice && <div className="st-toast" role="status"><Check size={16} />{notice}<button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={15} /></button></div>}
    </div>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) { return <button className={`st-nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>{icon}<span>{label}</span>{count ? <small>{count}</small> : null}</button>; }

function ConnectionPill({ state }: { state: ProviderState }) {
  const label = state === "ready" ? "Ollama connected" : state === "initializing" ? "Checking Ollama" : state === "error" ? "Ollama error" : "AI unavailable";
  return <div className={`st-connection ${state === "ready" ? "connected" : ""}`} role="status"><span />{label}</div>;
}

interface HomeProps { progress: number; desktop: boolean; sharing: boolean; miniOpen: boolean; hasArea: boolean; onShare: () => void; onShared: (pick: boolean) => void; onStopShare: () => void; onOpenMini: () => void; onImage: () => void; region: ScreenRegion | null; settings: Settings; status: string; providerState: ProviderState; local: boolean; onSelect: () => void; onCapture: () => void; onRetry: () => void; onDebug: () => void; onSettings: () => void }

function HomeView({ progress, desktop, sharing, miniOpen, hasArea, onShare, onShared, onStopShare, onOpenMini, onImage, region, settings, status, providerState, local, onSelect, onCapture, onRetry, onDebug, onSettings }: HomeProps) {
  const busy = ["capturing", "reading", "thinking"].includes(status);
  const busyLabel = status === "thinking" && progress ? `Thinking... ${progress}` : `${status[0].toUpperCase()}${status.slice(1)}...`;
  const aiValue = providerState === "ready" ? (settings.model || "Model not selected") : providerState === "error" ? "Provider error" : "AI unavailable";
  return (
    <div className="st-home">
      {!desktop && providerState === "unavailable" && <div className="st-web-banner" role="note"><TriangleAlert size={18} /><div><strong>Ollama was not found</strong><p>Start Ollama and install a model (for example <code>ollama pull qwen2.5:3b</code>). {OLLAMA_CORS_HINT}</p></div></div>}
      <section className="st-hero">
        <div className="st-hero-copy">
          <div className="st-live-line"><span className="st-live-dot" />Ready when you are</div>
          <h2>Make sense of<br /><em>what's on screen.</em></h2>
          <p>{desktop ? "Select a region, press your shortcut" : "Share your screen once, drag over a question"}, and get an answer in a small window without leaving what you are doing. {local ? "Nothing leaves this device." : "Your screen text is sent to the AI server you configured."}</p>
          <div className="st-hero-actions">
            {desktop ? (
              <>
                <button className="st-primary" onClick={onSelect}><Crop size={17} />Select screen region</button>
                <button className="st-secondary" onClick={onCapture} disabled={busy}><Play size={16} />{busy ? busyLabel : "Test capture"}</button>
              </>
            ) : sharing ? (
              <>
                <button className="st-primary" onClick={() => onShared(!hasArea)} disabled={busy}><Crop size={17} />{busy ? busyLabel : hasArea ? "Capture saved area" : "Pick area"}</button>
                {hasArea && <button className="st-secondary" onClick={() => onShared(true)} disabled={busy}>Pick new area</button>}
                {!miniOpen && <button className="st-secondary" onClick={onOpenMini}><ExternalLink size={16} />Mini window</button>}
                <button className="st-secondary" onClick={onStopShare}><Square size={15} />Stop sharing</button>
              </>
            ) : (
              <button className="st-primary" onClick={onShare} disabled={busy || !hasBrowserCapture()}><MonitorUp size={17} />{busy ? busyLabel : "Share screen"}</button>
            )}
            <button className="st-secondary" onClick={onImage} disabled={busy}><ImageUp size={16} />Choose image</button>
          </div>
          <p className="st-hint">Or paste a screenshot with <kbd>Ctrl</kbd><b>+</b><kbd>V</kbd> or drop an image anywhere. Win+Shift+S makes one.</p>
        </div>
        <div className="st-hero-visual">
          <p role="note">Sample preview — not generated from your screen.</p>
          <div className="st-capture-frame">
            <div className="st-frame-top"><span className="st-window-dots"><i /><i /><i /></span><span>study-material.png</span><MoreHorizontal size={16} /></div>
            <div className="st-question-preview"><span className="st-preview-tag">Practice question</span><strong>Which approach helps you<br />understand a difficult topic?</strong><div className="st-options"><span>A. Memorize every detail</span><span>B. Skip to the answer</span><span className="is-answer">C. Break it into smaller ideas <Check size={13} /></span></div></div>
            <div className="st-frame-selection"><span>selected region</span></div>
            <div className="st-result-chip"><Sparkles size={14} /><span><strong>Explanation ready</strong><small>in 1.8 seconds</small></span></div>
          </div>
        </div>
      </section>
      <section className="st-section-head">
        <div><h3>Workspace status</h3><p>Everything you need for a fast, private reading.</p></div>
        {settings.developerMode && <button className="st-text-button" onClick={onDebug}><FileText size={15} />Open OCR debug</button>}
      </section>
      <div className="st-status-grid">
        <StatusCard icon={<Crop />} label="Screen region" value={!desktop ? "Chosen each time" : region ? `${region.width} × ${region.height}px` : "Not selected"} tone={!desktop || region ? "good" : "warm"} action={desktop ? (region ? "Change" : "Select") : undefined} onClick={onSelect} />
        <StatusCard icon={<BookOpen />} label="OCR engine" value={languageLabels[settings.ocrLanguage]} tone="good" action="Configure" onClick={onSettings} />
        <StatusCard icon={<Sparkles />} label="Local AI" value={aiValue} tone={providerState === "ready" ? "good" : "neutral"} action={providerState === "ready" ? "Connected" : "Retry"} onClick={providerState === "ready" ? onCapture : onRetry} />
      </div>
      <section className="st-quick-row">
        <div className="st-shortcut-panel"><div className="st-panel-icon"><Keyboard size={19} /></div><div><span className="st-panel-label">Keyboard shortcut</span><strong>Press <kbd>Ctrl</kbd><b>+</b><kbd>Shift</kbd><b>+</b><kbd>Space</kbd> {desktop ? "anywhere" : "(desktop app only)"}</strong><p>Capture your selected region instantly.</p></div></div>
        <div className="st-tip-panel"><div className="st-tip-mark"><Sparkles size={19} /></div><div><span className="st-panel-label">Learning mode · {settings.learningMode === "explain" ? "Explain" : settings.learningMode}</span><strong>Answers come with the why.</strong><p>Short reasoning is always included.</p></div></div>
      </section>
    </div>
  );
}

function StatusCard({ icon, label, value, tone, action, onClick }: { icon: ReactNode; label: string; value: string; tone: string; action?: string; onClick: () => void }) {
  return <div className="st-status-card"><div className={`st-status-icon ${tone}`}>{icon}</div><div className="st-status-text"><span>{label}</span><strong>{value}</strong></div>{action && <button className="st-card-action" onClick={onClick}>{action}</button>}</div>;
}

function HelpDialog({ desktop, onClose }: { desktop: boolean; onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="st-drawer-layer">
      <div className="st-help-dialog" role="dialog" aria-modal="true" aria-labelledby="st-help-title" tabIndex={-1} ref={ref}>
        <div className="st-drawer-head"><h2 id="st-help-title">How ScreenTutor works</h2><button className="st-icon-button" aria-label="Close help" onClick={onClose}><X size={19} /></button></div>
        <ol className="st-help-steps">
          <li><strong>{desktop ? "Select a region." : "Share your screen."}</strong> {desktop ? "Choose the part of your screen you want read." : "Click Share screen once and pick what to share. A small always-on-top window opens (Chrome or Edge). Drag over the question to save the area; after that, one click in the mini window reads it again."}</li>
          <li><strong>{desktop ? "Press Ctrl + Shift + Space or use Test capture." : "Analyse."}</strong> ScreenTutor reads the text on your device; the image is never uploaded. With Google research on, only a short search phrase is sent to Google.</li>
          <li><strong>Get an explanation</strong> from the Ollama model you picked in Settings.</li>
        </ol>
        {!desktop && <p className="st-help-note">The browser version has no saved region or global shortcut; those need the desktop app. {OLLAMA_CORS_HINT}</p>}
        <p className="st-help-note">Ollama must be running with at least one model installed. History is saved only if you turn it on in Settings, and it is stored unencrypted in this browser.</p>
        <div className="st-drawer-footer"><button className="st-primary" onClick={onClose}>Got it</button></div>
      </div>
    </div>
  );
}

function ResultOverlay({ analysis, ocrText, onClose, onReanalyze, onRecrop }: { analysis: AnalysisResult; ocrText: string; onClose: () => void; onReanalyze: (text: string, deeper: boolean) => void; onRecrop?: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  const [text, setText] = useState(ocrText);
  const isChoice = Boolean(analysis.answer);
  const sourceLabel = analysis.source === "ollama" ? "REAL · Ollama" : analysis.source === "demo" ? "DEMO · Sample output" : "Source not recorded";
  const edited = text.trim() !== ocrText.trim();
  return (
    <div className="st-result-layer">
      <div className="st-result-overlay" role="dialog" aria-modal="true" aria-label="Analysis result" tabIndex={-1} ref={ref}>
        <div className="st-result-header"><div><span className="st-result-status"><span />{analysis.source === "ollama" ? "Analysis complete" : sourceLabel}</span><small>ScreenTutor · {typeLabels[analysis.type]}</small></div><button className="st-icon-button" aria-label="Close result" onClick={onClose}><X size={18} /></button></div>
        <div className="st-result-body">
          {isChoice && <div className="st-answer-block"><span>Answer</span><strong>{analysis.answer} <Check size={20} /></strong>{analysis.answerText && <p>{analysis.answerText}</p>}</div>}
          <div className="st-explanation"><span>{isChoice ? "Why" : analysis.title}</span><p>{analysis.summary}</p>{analysis.details && <small>{analysis.details}</small>}</div>
          <Sources sources={analysis.sources} />
          <details className="st-source">
            <summary>Text that was read (fix mistakes, then re-analyse)</summary>
            <textarea aria-label="Text that was read" value={text} onChange={(event) => setText(event.target.value)} rows={6} spellCheck={false} />
            <div className="st-source-actions">
              <button className="st-result-action" onClick={() => onReanalyze(text, false)} disabled={!edited || !text.trim()}>Re-analyse edited text</button>
              {onRecrop && <button className="st-result-action" onClick={onRecrop}>Select a different area</button>}
            </div>
          </details>
        </div>
        <div className="st-result-footer"><span><Sparkles size={14} />{sourceLabel} · {formatDuration(analysis.processingTime)}</span><div><button className="st-result-action" onClick={() => void navigator.clipboard?.writeText(`${analysis.answer ? `${analysis.answer}: ${analysis.answerText}\n` : ""}${analysis.summary}`)}><Copy size={14} />Copy</button><button className="st-result-action" onClick={() => onReanalyze(text, true)}>Explain more</button></div></div>
      </div>
    </div>
  );
}

/** Drag a rectangle over an image; reports it in image pixels and as a fraction of the image. */
function CropSurface({ image, onChange }: { image: string; onChange: (selection: Selection | null) => void }) {
  const img = useRef<HTMLImageElement>(null);
  const [drag, setDrag] = useState<PixelBox | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const point = (event: React.PointerEvent) => {
    const box = img.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(box.width, event.clientX - box.left)), y: Math.max(0, Math.min(box.height, event.clientY - box.top)) };
  };
  const update = (next: PixelBox) => {
    setDrag(next);
    const el = img.current;
    if (!el) return onChange(null);
    const natural = { width: el.naturalWidth, height: el.naturalHeight };
    const rect = toImageRect(next, { width: el.clientWidth, height: el.clientHeight }, natural);
    onChange(rect ? { rect, fraction: toFraction(rect, natural) } : null);
  };
  return (
    <div
      className="st-crop-frame"
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); origin.current = point(event); update({ ...origin.current, width: 0, height: 0 }); }}
      onPointerMove={(event) => { const from = origin.current; if (!from) return; const to = point(event); update({ x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y) }); }}
      onPointerUp={() => { origin.current = null; }}
    >
      <img ref={img} src={image} alt="Captured screen" draggable={false} />
      {drag && drag.width > 0 && <div className="st-crop-box" style={{ left: drag.x, top: drag.y, width: drag.width, height: drag.height }} />}
    </div>
  );
}

function CropDialog({ image, onCancel, onAnalyze }: { image: string; onCancel: () => void; onAnalyze: (image: string, fraction: PixelBox | null) => void }) {
  const ref = useDialog<HTMLDivElement>(onCancel);
  const [selection, setSelection] = useState<Selection | null>(null);
  const submit = async (whole: boolean) => {
    if (whole || !selection) return onAnalyze(image, null);
    onAnalyze(await cropImage(image, selection.rect), selection.fraction);
  };
  return (
    <div className="st-drawer-layer">
      <div className="st-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="st-crop-title" tabIndex={-1} ref={ref}>
        <div className="st-drawer-head"><div><h2 id="st-crop-title">Choose what to read</h2><p>Drag over the question or text. A tighter area reads faster and more accurately.</p></div><button className="st-icon-button" aria-label="Close" onClick={onCancel}><X size={19} /></button></div>
        <div className="st-crop-stage"><CropSurface image={image} onChange={setSelection} /></div>
        <div className="st-drawer-footer"><button className="st-secondary" onClick={onCancel}>Cancel</button><button className="st-secondary" onClick={() => void submit(true)}>Read whole image</button><button className="st-primary" onClick={() => void submit(false)} disabled={!selection}>Read selection</button></div>
      </div>
    </div>
  );
}

function Sources({ sources }: { sources?: SearchHit[] }) {
  if (!sources?.length) return null;
  return <ol className="st-sources" aria-label="Sources">{sources.map((hit, index) => <li key={hit.link}><a href={hit.link} target="_blank" rel="noopener noreferrer">[{index + 1}] {hit.title}</a></li>)}</ol>;
}

interface MiniProps {
  floating: boolean; sharing: boolean; status: string; progress: number; analysis: AnalysisResult | null; hasArea: boolean; message: string | null;
  research: boolean; onResearch: (on: boolean) => void; pendingImage: string | null;
  onCropDone: (image: string, fraction: PixelBox | null) => void; onCropCancel: () => void;
  onCapture: (pick: boolean) => void; onStop: () => void; onClose: () => void; onDeeper: () => void;
}

/** The small answer window: lives in an always-on-top Picture-in-Picture window, or floats at the top right of the page. */
function MiniPanel({ floating, sharing, status, progress, analysis, hasArea, message, research, onResearch, pendingImage, onCropDone, onCropCancel, onCapture, onStop, onClose, onDeeper }: MiniProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const busy = ["capturing", "reading", "searching", "thinking"].includes(status);
  const label = status === "reading" ? "Reading the screen..." : status === "searching" ? "Searching Google..." : status === "thinking" ? `Thinking...${progress ? ` ${progress}` : ""}` : status === "capturing" ? "Capturing..." : null;
  const choosing = pendingImage && !floating;
  return (
    <aside className={`st-mini ${floating ? "st-mini-floating" : ""}`} aria-label="ScreenTutor mini window">
      <div className="st-mini-head"><strong><Eye size={15} />ScreenTutor</strong>{floating && <button className="st-icon-button" aria-label="Close mini window" onClick={onClose}><X size={16} /></button>}</div>
      {choosing ? (
        <div className="st-mini-body">
          <p className="st-mini-note">Drag over the question.</p>
          <div className="st-crop-stage"><CropSurface image={pendingImage} onChange={setSelection} /></div>
          <div className="st-mini-actions">
            <button className="st-primary" disabled={!selection} onClick={async () => { if (selection) onCropDone(await cropImage(pendingImage, selection.rect), selection.fraction); }}>Read selection</button>
            <button className="st-secondary" onClick={onCropCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="st-mini-actions">
            {sharing && <button className="st-primary" disabled={busy} onClick={() => onCapture(!hasArea)}><Crop size={15} />{hasArea ? "Capture" : "Pick area"}</button>}
            {sharing && hasArea && <button className="st-secondary" disabled={busy} onClick={() => onCapture(true)}>New area</button>}
            {sharing && <button className="st-secondary" onClick={onStop}><Square size={13} />Stop</button>}
          </div>
          <label className="st-mini-toggle"><input type="checkbox" checked={research} onChange={(event) => onResearch(event.target.checked)} />Search Google first</label>
          <div className="st-mini-body" aria-live="polite">
            {label && <p className="st-mini-note"><span className="st-live-dot" />{label}</p>}
            {message && <p className="st-mini-error" role="alert">{message}</p>}
            {!label && !message && !analysis && <p className="st-mini-note">{sharing ? (hasArea ? "Press Capture to read your saved area." : "Pick the area that holds your questions.") : "Sharing has stopped."}</p>}
            {!label && analysis && (
              <div className="st-mini-result">
                {analysis.answer && <div className="st-answer-block"><span>Answer</span><strong>{analysis.answer} <Check size={18} /></strong>{analysis.answerText && <p>{analysis.answerText}</p>}</div>}
                <div className="st-explanation"><span>{analysis.answer ? "Why" : analysis.title}</span><p>{analysis.summary}</p>{analysis.details && <small>{analysis.details}</small>}</div>
                <Sources sources={analysis.sources} />
                <div className="st-mini-actions">
                  <button className="st-result-action" onClick={() => void navigator.clipboard?.writeText(`${analysis.answer ? `${analysis.answer}: ${analysis.answerText ?? ""}\n` : ""}${analysis.summary}`)}><Copy size={14} />Copy</button>
                  <button className="st-result-action" disabled={busy} onClick={onDeeper}>Explain more</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function DebugPanel({ ocrText, analysis, onClose, onRetry }: { ocrText: string; analysis: AnalysisResult | null; onClose: () => void; onRetry: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="st-drawer-layer">
      <div className="st-debug-drawer" role="dialog" aria-modal="true" aria-labelledby="st-debug-title" tabIndex={-1} ref={ref}>
        <div className="st-drawer-head"><div><span className="st-live-line"><Eye size={15} />Developer mode</span><h2 id="st-debug-title">OCR debug</h2><p>Inspect what ScreenTutor read before analysis.</p></div><button className="st-icon-button" aria-label="Close OCR debug" onClick={onClose}><X size={19} /></button></div>
        <div className="st-debug-content">
          <div className="st-debug-image"><div className="st-scan-lines" /><span>Captured image preview</span><MonitorUp size={30} /></div>
          <DebugField label="Raw OCR text" value={ocrText || "No OCR text yet."} />
          <DebugField label="Cleaned OCR text" value={cleanOcrText(ocrText) || "No cleaned text yet."} />
          <div className="st-debug-metrics"><span><Clock3 size={15} />Processing time <strong>{analysis ? formatDuration(analysis.processingTime) : "—"}</strong></span><span><Sparkles size={15} />Classification <strong>{analysis ? typeLabels[analysis.type] : "—"}</strong></span></div>
        </div>
        <div className="st-drawer-footer"><button className="st-secondary" onClick={() => void navigator.clipboard?.writeText(cleanOcrText(ocrText))}><Copy size={15} />Copy text</button><button className="st-primary" onClick={onRetry}><RotateCcw size={15} />Retry OCR</button></div>
      </div>
    </div>
  );
}

function DebugField({ label, value }: { label: string; value: string }) { return <div className="st-debug-field"><div><span>{label}</span><button aria-label={`Copy ${label}`} onClick={() => void navigator.clipboard?.writeText(value)}><Clipboard size={14} /></button></div><pre>{value}</pre></div>; }

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function HistoryView({ history, saving, onDelete, onClear, onOpen }: { history: HistoryEntry[]; saving: boolean; onDelete: (id: string) => void; onClear: () => void; onOpen: (entry: HistoryEntry) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => history.filter((entry) => entry.ocrText.toLowerCase().includes(query.toLowerCase())), [history, query]);
  return (
    <div className="st-page">
      <div className="st-page-intro"><div><h2>Past explanations</h2><p>Your screen reading history stays in this browser and is searchable.</p></div>{history.length > 0 && <div className="st-history-tools"><button className="st-text-button" onClick={() => download("screentutor-history.md", "text/markdown", historyToMarkdown(history))}><Download size={15} />Markdown</button><button className="st-text-button" onClick={() => download("screentutor-history.json", "application/json", JSON.stringify(history, null, 2))}><Download size={15} />JSON</button><button className="st-text-button danger" onClick={onClear}><Trash2 size={15} />Clear history</button></div>}</div>
      <div className="st-search"><Search size={17} /><input aria-label="Search history" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your history" /></div>
      {filtered.length ? (
        <div className="st-history-list">
          {filtered.map((entry) => (
            <div className="st-history-row" key={entry.id}>
              <button className="st-history-open" onClick={() => onOpen(entry)}>
                <span className="st-history-type"><span className="st-mini-icon"><FileText size={17} /></span><span>{typeLabels[entry.contentType]}</span></span>
                <span className="st-history-copy"><strong>{entry.analysis.answer ? `${entry.analysis.answer}${entry.analysis.answerText ? ` · ${entry.analysis.answerText}` : ""}` : entry.analysis.title}</strong><p>{entry.ocrText.replace(/\n/g, " ").slice(0, 110)}</p></span>
                <time dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
              </button>
              <button className="st-row-delete" aria-label="Delete history item" onClick={() => onDelete(entry.id)}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="st-empty"><Clock3 size={22} /><h3>No saved explanations</h3><p>{saving ? "Use the shortcut on study material and your results will appear here." : "History is turned off. Enable “Save explanation history” in Settings to keep results here."}</p></div>
      )}
    </div>
  );
}

interface SettingsProps { desktop: boolean; settings: Settings; region: ScreenRegion | null; models: string[]; endpoint: OllamaEndpoint | null; onSettings: (settings: Partial<Settings>) => void; onSelect: () => void; onReset: () => void; onClear: () => void }

function SettingsView({ desktop, settings, region, models, endpoint, onSettings, onSelect, onReset, onClear }: SettingsProps) {
  return (
    <div className="st-page st-settings">
      <div className="st-page-intro"><div><h2>Make it yours</h2><p>Local controls, language, and privacy in one place.</p></div></div>
      <SettingSection title="AI connection" description="ScreenTutor talks to Ollama, by default on this device.">
        <SettingRow label="Ollama URL" help="The address ScreenTutor checks.">
          <input className="st-setting-input" aria-label="Ollama URL" aria-invalid={!endpoint} inputMode="url" spellCheck={false} value={settings.ollamaUrl} onChange={(event) => onSettings({ ollamaUrl: event.target.value })} />
        </SettingRow>
        {!endpoint && <p className="st-field-warning" role="alert"><TriangleAlert size={15} />Enter a full address starting with http:// or https://, for example http://localhost:11434.</p>}
        {endpoint && !endpoint.local && <p className="st-field-warning" role="note"><TriangleAlert size={15} />This is not a local address. The text read from your screen will be sent to that server.</p>}
        <SettingRow label="Model" help="Discovered from your Ollama installation."><select className="st-setting-input" aria-label="Model" value={settings.model} onChange={(event) => onSettings({ model: event.target.value })}><option value="">Select a model</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</select></SettingRow>
        <SettingRow label="Temperature" help="Lower values keep explanations focused."><input className="st-range" aria-label="Temperature" type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(event) => onSettings({ temperature: Number(event.target.value) })} /><output>{settings.temperature.toFixed(1)}</output></SettingRow>
      </SettingSection>
      <SettingSection title="Web research" description="Look the question up on Google before the AI answers, and cite the pages used.">
        <ToggleRow label="Search Google automatically" help="Sends a short search phrase (the question, up to 150 characters) to Google. The screenshot never leaves your device." checked={settings.research} onChange={(checked) => onSettings({ research: checked })} />
        <SettingRow label="Google API key" help="Create one for the Custom Search JSON API (about 100 free searches a day). Kept in this browser only."><input className="st-setting-input" type="password" autoComplete="off" spellCheck={false} aria-label="Google API key" value={settings.googleApiKey} onChange={(event) => onSettings({ googleApiKey: event.target.value.trim() })} /></SettingRow>
        <SettingRow label="Search engine ID" help="The “cx” of a Programmable Search Engine set to search the entire web."><input className="st-setting-input" autoComplete="off" spellCheck={false} aria-label="Search engine ID" value={settings.googleCx} onChange={(event) => onSettings({ googleCx: event.target.value.trim() })} /></SettingRow>
      </SettingSection>
      <SettingSection title="Reading preferences" description="Choose how ScreenTutor interprets your capture.">
        <SettingRow label="OCR language" help="Thai + English is recommended for mixed content."><select className="st-setting-input" aria-label="OCR language" value={settings.ocrLanguage} onChange={(event) => onSettings({ ocrLanguage: event.target.value as Settings["ocrLanguage"] })}>{Object.entries(languageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></SettingRow>
        <SettingRow label="Learning mode" help="Every mode keeps the answer grounded in your selected region."><select className="st-setting-input" aria-label="Learning mode" value={settings.learningMode} onChange={(event) => onSettings({ learningMode: event.target.value as Settings["learningMode"] })}><option value="quick">Quick answer</option><option value="explain">Explain</option><option value="tutor">Tutor</option></select></SettingRow>
      </SettingSection>
      <SettingSection title="Capture & shortcut" description="Only capture when you ask ScreenTutor to.">
        <SettingRow label="Selected region" help={!desktop ? "Selecting a region needs the desktop app." : region ? `${region.width} × ${region.height}px` : "No region selected yet."}><div className="st-setting-actions"><button className="st-secondary" onClick={onSelect} disabled={!desktop}><Crop size={15} />{region ? "Change region" : "Select region"}</button>{region && <button className="st-quiet-button" onClick={onReset}>Reset</button>}</div></SettingRow>
        <SettingRow label="Global shortcut" help={desktop ? "Works while ScreenTutor is open." : "Available in the desktop app."}><div className="st-keycap-group"><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>Space</kbd></div></SettingRow>
      </SettingSection>
      <SettingSection title="Privacy" description={endpoint?.local === false ? "Screen text is sent to the server above." : "Your screen data stays on this device."}>
        <ToggleRow label="Save explanation history" help="Off by default. Saved text is kept unencrypted in this browser until you clear it." checked={settings.storeHistory} onChange={(checked) => onSettings({ storeHistory: checked })} />
        <ToggleRow label="Developer mode" help="Shows the OCR debug view on the home page." checked={settings.developerMode} onChange={(checked) => onSettings({ developerMode: checked })} />
        <button className="st-text-button danger" onClick={onClear}><Trash2 size={15} />Clear local history</button>
      </SettingSection>
    </div>
  );
}

function SettingSection({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <section className="st-setting-section"><div className="st-setting-head"><h3>{title}</h3><p>{description}</p></div><div className="st-setting-body">{children}</div></section>; }
function SettingRow({ label, help, children }: { label: string; help: string; children: ReactNode }) { return <div className="st-setting-row"><div><strong>{label}</strong><span>{help}</span></div>{children}</div>; }
function ToggleRow({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="st-toggle-row"><span><strong>{label}</strong><small>{help}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>; }
