import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  BookOpen, Check, ChevronDown, CircleHelp, Clipboard, Clock3, Copy, Crop, Eye, FileText, Keyboard,
  Menu, MonitorUp, MoreHorizontal, Play, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, Trash2, X,
} from "lucide-react";
import { classifyContent, cleanOcrText, captureService, makeDemoAnalysis, OllamaProvider, recognizeImage } from "./services";
import { useScreenTutorStore } from "./store";
import type { AnalysisResult, ContentType, HistoryEntry, ScreenRegion } from "./types";
import "./screenTutor.css";

type Page = "home" | "history" | "settings";

const sampleText = "Which food is appropriate for elderly people?\nA. Fried chicken with sticky rice\nB. Grilled beef steak\nC. Stir-fried tofu";
const typeLabels: Record<ContentType, string> = { MULTIPLE_CHOICE: "Multiple choice", PROGRAMMING_ERROR: "Programming error", TRANSLATION: "Translation", MATH: "Math", GENERAL_TEXT: "General text", UNKNOWN: "Unknown" };

function formatTime(iso: string) { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }
function formatDuration(ms: number) { return `${(ms / 1000).toFixed(1)}s`; }

export default function ScreenTutorApp() {
  const [page, setPage] = useState<Page>("home");
  const [selectionMode, setSelectionMode] = useState(false);
  const [regionDraft, setRegionDraft] = useState<ScreenRegion | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [ocrText, setOcrText] = useState(sampleText);
  const [status, setStatus] = useState<"idle" | "capturing" | "reading" | "thinking" | "done" | "error">("idle");
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const { settings, region, history, setRegion, setSettings, addHistory, deleteHistory, clearHistory } = useScreenTutorStore();

  const runAnalysis = async (sourceText = ocrText) => {
    if (status === "capturing" || status === "reading" || status === "thinking") return;
    const started = performance.now();
    setStatus("capturing");
    let captureTime = 0;
    try {
      const capture = region ? await captureService.captureRegion(region) : { region: { x: 0, y: 0, width: 720, height: 420 }, captureTime: 0 };
      captureTime = capture.captureTime;
      setStatus("reading");
      let recognized = sourceText;
      if (capture.imageDataUrl) {
        const result = await recognizeImage(capture.imageDataUrl, settings.ocrLanguage);
        recognized = result.cleanedText;
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 380));
      }
      if (!recognized.trim()) throw new Error("No readable text was detected. Try selecting a tighter region or increasing text size.");
      setOcrText(recognized);
      setStatus("thinking");
      const contentType = classifyContent(recognized);
      let nextAnalysis: AnalysisResult;
      if (ollamaConnected && settings.model) {
        nextAnalysis = await new OllamaProvider(settings.ollamaUrl).analyze({ text: recognized, contentType, learningMode: settings.learningMode, model: settings.model, temperature: settings.temperature });
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 480));
        nextAnalysis = makeDemoAnalysis(recognized, contentType);
      }
      setAnalysis(nextAnalysis);
      setStatus("done");
      const totalTime = Math.round(performance.now() - started);
      if (settings.storeHistory) addHistory({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ocrText: recognized, contentType, analysis: nextAnalysis, processingTime: totalTime });
      setShowCapture(true);
      void captureTime;
    } catch (error) {
      setStatus("error");
      setNotice(error instanceof Error ? error.message : "Something went wrong while reading this region.");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.code === "Space") { event.preventDefault(); void runAnalysis(); }
      if (event.key === "Escape") { setShowCapture(false); setSelectionMode(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    const removeGlobalHotkey = window.screenTutor?.onHotkey(() => void runAnalysis());
    return () => { window.removeEventListener("keydown", onKeyDown); removeGlobalHotkey?.(); };
  });

  useEffect(() => {
    const check = async () => {
      const provider = new OllamaProvider(settings.ollamaUrl);
      const connected = await provider.health();
      setOllamaConnected(connected);
      if (connected) {
        try { const discovered = await provider.models(); setModels(discovered.map((model) => model.name)); if (!settings.model && discovered[0]) setSettings({ model: discovered[0].name }); } catch { /* offline race */ }
      }
    };
    void check();
  }, [settings.ollamaUrl, settings.model, setSettings]);

  const pageTitle = page === "home" ? "Workspace" : page === "history" ? "History" : "Settings";
  return (
    <div className="st-shell">
      <aside className={`st-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="st-brand"><div className="st-brand-mark"><Eye size={18} strokeWidth={2.5} /></div><div><strong>ScreenTutor</strong><span>See. Understand. Learn.</span></div></div>
        <div className="st-nav-label">Workspace</div>
        <nav aria-label="Primary navigation">
          <NavButton active={page === "home"} icon={<MonitorUp size={18} />} label="Home" onClick={() => { setPage("home"); setMobileNav(false); }} />
          <NavButton active={page === "history"} icon={<Clock3 size={18} />} label="History" count={history.length || undefined} onClick={() => { setPage("history"); setMobileNav(false); }} />
          <NavButton active={page === "settings"} icon={<Settings2 size={18} />} label="Settings" onClick={() => { setPage("settings"); setMobileNav(false); }} />
        </nav>
        <div className="st-sidebar-bottom"><div className="st-privacy"><ShieldCheck size={16} /><div><strong>Private by default</strong><span>Your screen data stays on this device.</span></div></div><div className="st-version">ScreenTutor MVP <span>v0.1</span></div></div>
      </aside>
      {mobileNav && <button className="st-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="st-main">
        <header className="st-topbar"><button className="st-icon-button st-menu-button" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div><p className="st-breadcrumb">ScreenTutor <span>/</span> {pageTitle}</p><h1>{pageTitle}</h1></div><div className="st-topbar-actions"><ConnectionPill connected={ollamaConnected} /><button className="st-icon-button" aria-label="Help"><CircleHelp size={19} /></button><button className="st-avatar" aria-label="Profile">ST</button></div></header>
        <div className="st-content">{page === "home" && <HomeView region={region} settings={settings} status={status} ollamaConnected={ollamaConnected} onSelect={() => setSelectionMode(true)} onCapture={() => void runAnalysis()} onDebug={() => setShowDebug(true)} />}{page === "history" && <HistoryView history={history} onDelete={deleteHistory} onClear={clearHistory} onOpen={(entry) => { setOcrText(entry.ocrText); setAnalysis(entry.analysis); setShowCapture(true); }} />}{page === "settings" && <SettingsView settings={settings} region={region} models={models} onSettings={setSettings} onSelect={() => setSelectionMode(true)} onReset={() => setRegion(null)} onClear={clearHistory} />}</div>
      </main>
      {selectionMode && <RegionSelector initial={region} onCancel={() => setSelectionMode(false)} onSave={(next) => { setRegion(next); setRegionDraft(next); setSelectionMode(false); setNotice("Region saved"); }} />}
      {showCapture && analysis && <ResultOverlay analysis={analysis} ocrText={ocrText} onClose={() => setShowCapture(false)} onMore={() => { setShowCapture(false); setShowDebug(true); }} />}
      {showDebug && <DebugPanel ocrText={ocrText} analysis={analysis} onClose={() => setShowDebug(false)} onRetry={() => { setShowDebug(false); void runAnalysis(ocrText); }} />}
      {notice && <div className="st-toast" role="status"><Check size={16} />{notice}<button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={15} /></button></div>}
      {regionDraft && <span className="sr-only">Region saved at {regionDraft.x}, {regionDraft.y}</span>}
    </div>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) { return <button className={`st-nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count ? <small>{count}</small> : null}</button>; }
function ConnectionPill({ connected }: { connected: boolean }) { return <div className={`st-connection ${connected ? "connected" : ""}`}><span />{connected ? "Ollama connected" : "Ollama offline"}</div>; }

function HomeView({ region, settings, status, ollamaConnected, onSelect, onCapture, onDebug }: { region: ScreenRegion | null; settings: ReturnType<typeof useScreenTutorStore.getState>["settings"]; status: string; ollamaConnected: boolean; onSelect: () => void; onCapture: () => void; onDebug: () => void }) {
  const busy = ["capturing", "reading", "thinking"].includes(status);
  return <div className="st-home"><section className="st-hero"><div className="st-hero-copy"><div className="st-live-line"><span className="st-live-dot" />Ready when you are</div><h2>Make sense of<br /><em>what's on screen.</em></h2><p>Select a region, press your shortcut, and get a clear explanation from a local AI. Nothing leaves this device.</p><div className="st-hero-actions"><button className="st-primary" onClick={onSelect}><Crop size={17} />Select screen region</button><button className="st-secondary" onClick={onCapture} disabled={busy}><Play size={16} />{busy ? `${status[0].toUpperCase()}${status.slice(1)}...` : "Test capture"}</button></div></div><div className="st-hero-visual"><div className="st-capture-frame"><div className="st-frame-top"><span className="st-window-dots"><i /><i /><i /></span><span>study-material.png</span><MoreHorizontal size={16} /></div><div className="st-question-preview"><span className="st-preview-tag">Practice question</span><strong>Which approach helps you<br />understand a difficult topic?</strong><div className="st-options"><span>A. Memorize every detail</span><span>B. Skip to the answer</span><span className="is-answer">C. Break it into smaller ideas <Check size={13} /></span></div></div><div className="st-frame-selection"><span>selected region</span></div><div className="st-result-chip"><Sparkles size={14} /><span><strong>Explanation ready</strong><small>in 1.8 seconds</small></span></div></div></div></section><section className="st-section-head"><div><h3>Workspace status</h3><p>Everything you need for a fast, private reading.</p></div><button className="st-text-button" onClick={onDebug}><FileText size={15} />Open OCR debug</button></section><div className="st-status-grid"><StatusCard icon={<Crop />} label="Screen region" value={region ? `${region.width} × ${region.height}px` : "Not selected"} tone={region ? "good" : "warm"} action={region ? "Change" : "Select"} onClick={onSelect} /><StatusCard icon={<BookOpen />} label="OCR engine" value="Thai + English" tone="good" action="Configure" onClick={() => undefined} /><StatusCard icon={<Sparkles />} label="Local AI" value={ollamaConnected ? (settings.model || "Model not selected") : "Start Ollama"} tone={ollamaConnected ? "good" : "neutral"} action={ollamaConnected ? "Connected" : "Retry"} onClick={onCapture} /></div><section className="st-quick-row"><div className="st-shortcut-panel"><div className="st-panel-icon"><Keyboard size={19} /></div><div><span className="st-panel-label">Keyboard shortcut</span><strong>Press <kbd>Ctrl</kbd><b>+</b><kbd>Shift</kbd><b>+</b><kbd>Space</kbd> anywhere</strong><p>Capture your selected region instantly.</p></div><button className="st-icon-button" aria-label="Change shortcut"><ChevronDown size={18} /></button></div><div className="st-tip-panel"><div className="st-tip-mark"><Sparkles size={19} /></div><div><span className="st-panel-label">Learning mode · {settings.learningMode === "explain" ? "Explain" : settings.learningMode}</span><strong>Answers come with the why.</strong><p>Short reasoning is always included.</p></div></div></section></div>;
}

function StatusCard({ icon, label, value, tone, action, onClick }: { icon: ReactNode; label: string; value: string; tone: string; action: string; onClick: () => void }) { return <div className="st-status-card"><div className={`st-status-icon ${tone}`}>{icon}</div><div className="st-status-text"><span>{label}</span><strong>{value}</strong></div><button className="st-card-action" onClick={onClick}>{action}</button></div>; }

function RegionSelector({ initial, onCancel, onSave }: { initial: ScreenRegion | null; onCancel: () => void; onSave: (region: ScreenRegion) => void }) { const [start, setStart] = useState<{ x: number; y: number } | null>(null); const [rect, setRect] = useState<ScreenRegion | null>(initial); const areaRef = useRef<HTMLDivElement>(null); const move = (event: PointerEvent) => { if (!start || !areaRef.current) return; const bounds = areaRef.current.getBoundingClientRect(); const x = Math.max(0, Math.min(start.x, event.clientX - bounds.left)); const y = Math.max(0, Math.min(start.y, event.clientY - bounds.top)); const currentX = event.clientX - bounds.left; const currentY = event.clientY - bounds.top; setRect({ x: Math.round(x), y: Math.round(y), width: Math.round(Math.abs(currentX - start.x)), height: Math.round(Math.abs(currentY - start.y)) }); }; return <div className="st-region-layer"><div className="st-region-toolbar"><div><strong>Select a screen region</strong><span>Drag around the content you want ScreenTutor to read.</span></div><button className="st-icon-button" aria-label="Cancel region selection" onClick={onCancel}><X size={19} /></button></div><div className="st-select-area" ref={areaRef} onPointerDown={(event) => { const bounds = areaRef.current?.getBoundingClientRect(); if (bounds) { setStart({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }); setRect(null); } }} onPointerMove={move} onPointerUp={() => setStart(null)}>{rect && <div className="st-select-rect" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}><span>{rect.width} × {rect.height}</span></div>}<div className="st-selection-hint"><Crop size={25} /><strong>Drag to select</strong><span>Only this region will be captured.</span></div></div><div className="st-region-footer"><span><ShieldCheck size={15} />Private capture · selected area only</span><div><button className="st-secondary" onClick={onCancel}>Cancel</button><button className="st-primary" disabled={!rect || rect.width < 40 || rect.height < 40} onClick={() => rect && onSave(rect)}><Check size={16} />Save region</button></div></div></div>; }

function ResultOverlay({ analysis, ocrText, onClose, onMore }: { analysis: AnalysisResult; ocrText: string; onClose: () => void; onMore: () => void }) { const isChoice = Boolean(analysis.answer); return <div className="st-result-layer"><div className="st-result-overlay"><div className="st-result-header"><div><span className="st-result-status"><span />Analysis complete</span><small>ScreenTutor · {typeLabels[analysis.type]}</small></div><button className="st-icon-button" aria-label="Close result" onClick={onClose}><X size={18} /></button></div><div className="st-result-body">{isChoice && <div className="st-answer-block"><span>Answer</span><strong>{analysis.answer} <Check size={20} /></strong>{analysis.answerText && <p>{analysis.answerText}</p>}</div>}<div className="st-explanation"><span>{isChoice ? "Why" : analysis.title}</span><p>{analysis.summary}</p>{analysis.details && <small>{analysis.details}</small>}</div></div><div className="st-result-footer"><span><Sparkles size={14} />Local result · {formatDuration(analysis.processingTime)}</span><div><button className="st-result-action" onClick={() => void navigator.clipboard?.writeText(`${analysis.answer ? `${analysis.answer}: ${analysis.answerText}\n` : ""}${analysis.summary}`)}><Copy size={14} />Copy</button><button className="st-result-action" onClick={onMore}>Explain more</button></div></div><span className="sr-only">Source text: {ocrText}</span></div></div>; }

function DebugPanel({ ocrText, analysis, onClose, onRetry }: { ocrText: string; analysis: AnalysisResult | null; onClose: () => void; onRetry: () => void }) { return <div className="st-drawer-layer"><div className="st-debug-drawer"><div className="st-drawer-head"><div><span className="st-live-line"><Eye size={15} />Developer mode</span><h2>OCR debug</h2><p>Inspect what ScreenTutor read before analysis.</p></div><button className="st-icon-button" aria-label="Close OCR debug" onClick={onClose}><X size={19} /></button></div><div className="st-debug-content"><div className="st-debug-image"><div className="st-scan-lines" /><span>Captured image preview</span><MonitorUp size={30} /></div><DebugField label="Raw OCR text" value={ocrText || "No OCR text yet."} /><DebugField label="Cleaned OCR text" value={cleanOcrText(ocrText) || "No cleaned text yet."} /><div className="st-debug-metrics"><span><Clock3 size={15} />Processing time <strong>{analysis ? formatDuration(analysis.processingTime) : "—"}</strong></span><span><Sparkles size={15} />Classification <strong>{analysis ? typeLabels[analysis.type] : "—"}</strong></span></div></div><div className="st-drawer-footer"><button className="st-secondary" onClick={() => void navigator.clipboard?.writeText(cleanOcrText(ocrText))}><Copy size={15} />Copy text</button><button className="st-primary" onClick={onRetry}><RotateCcw size={15} />Retry OCR</button></div></div></div>; }
function DebugField({ label, value }: { label: string; value: string }) { return <div className="st-debug-field"><div><span>{label}</span><button aria-label={`Copy ${label}`} onClick={() => void navigator.clipboard?.writeText(value)}><Clipboard size={14} /></button></div><pre>{value}</pre></div>; }

function HistoryView({ history, onDelete, onClear, onOpen }: { history: HistoryEntry[]; onDelete: (id: string) => void; onClear: () => void; onOpen: (entry: HistoryEntry) => void }) { const [query, setQuery] = useState(""); const filtered = useMemo(() => history.filter((entry) => entry.ocrText.toLowerCase().includes(query.toLowerCase())), [history, query]); return <div className="st-page"><div className="st-page-intro"><div><h2>Past explanations</h2><p>Your screen reading history stays local and searchable.</p></div>{history.length > 0 && <button className="st-text-button danger" onClick={onClear}><Trash2 size={15} />Clear history</button>}</div><div className="st-search"><Search size={17} /><input aria-label="Search history" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your history" /></div>{filtered.length ? <div className="st-history-list">{filtered.map((entry) => <div className="st-history-row" key={entry.id} role="button" tabIndex={0} onClick={() => onOpen(entry)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(entry); } }}><div className="st-history-type"><div className="st-mini-icon"><FileText size={17} /></div><span>{typeLabels[entry.contentType]}</span></div><div className="st-history-copy"><strong>{entry.analysis.answer ? `${entry.analysis.answer}${entry.analysis.answerText ? ` · ${entry.analysis.answerText}` : ""}` : entry.analysis.title}</strong><p>{entry.ocrText.replace(/\n/g, " ").slice(0, 110)}</p></div><time>{formatTime(entry.timestamp)}</time><button className="st-row-delete" aria-label="Delete history item" onClick={(event) => { event.stopPropagation(); onDelete(entry.id); }}><Trash2 size={15} /></button></div>)}</div> : <div className="st-empty"><Clock3 size={22} /><h3>No saved explanations</h3><p>Use the shortcut on study material and your local results will appear here.</p></div>}</div>; }

function SettingsView({ settings, region, models, onSettings, onSelect, onReset, onClear }: { settings: ReturnType<typeof useScreenTutorStore.getState>["settings"]; region: ScreenRegion | null; models: string[]; onSettings: (settings: Partial<ReturnType<typeof useScreenTutorStore.getState>["settings"]>) => void; onSelect: () => void; onReset: () => void; onClear: () => void }) { return <div className="st-page st-settings"><div className="st-page-intro"><div><h2>Make it yours</h2><p>Local controls, language, and privacy in one place.</p></div></div><SettingSection title="AI connection" description="ScreenTutor talks to Ollama on this device."><SettingRow label="Ollama URL" help="The local address ScreenTutor checks."><input className="st-setting-input" value={settings.ollamaUrl} onChange={(event) => onSettings({ ollamaUrl: event.target.value })} /></SettingRow><SettingRow label="Model" help="Discovered from your local Ollama installation."><select className="st-setting-input" value={settings.model} onChange={(event) => onSettings({ model: event.target.value })}><option value="">Select a model</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</select></SettingRow><SettingRow label="Temperature" help="Lower values keep explanations focused."><input className="st-range" type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(event) => onSettings({ temperature: Number(event.target.value) })} /><output>{settings.temperature.toFixed(1)}</output></SettingRow></SettingSection><SettingSection title="Reading preferences" description="Choose how ScreenTutor interprets your capture."><SettingRow label="OCR language" help="Thai + English is recommended for mixed content."><select className="st-setting-input" value={settings.ocrLanguage} onChange={(event) => onSettings({ ocrLanguage: event.target.value as typeof settings.ocrLanguage })}><option value="tha+eng">Thai + English</option><option value="tha">Thai</option><option value="eng">English</option><option value="auto">Auto detect</option></select></SettingRow><SettingRow label="Learning mode" help="Every mode keeps the answer grounded in your selected region."><select className="st-setting-input" value={settings.learningMode} onChange={(event) => onSettings({ learningMode: event.target.value as typeof settings.learningMode })}><option value="quick">Quick answer</option><option value="explain">Explain</option><option value="tutor">Tutor</option></select></SettingRow></SettingSection><SettingSection title="Capture & shortcut" description="Only capture when you ask ScreenTutor to."><SettingRow label="Selected region" help={region ? `${region.width} × ${region.height}px` : "No region selected yet."}><div className="st-setting-actions"><button className="st-secondary" onClick={onSelect}><Crop size={15} />{region ? "Change region" : "Select region"}</button>{region && <button className="st-quiet-button" onClick={onReset}>Reset</button>}</div></SettingRow><SettingRow label="Global shortcut" help="Works while ScreenTutor is open."><div className="st-keycap-group"><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>Space</kbd></div></SettingRow></SettingSection><SettingSection title="Privacy" description="Your screen data stays on this device."><ToggleRow label="Save explanation history" checked={settings.storeHistory} onChange={(checked) => onSettings({ storeHistory: checked })} /><ToggleRow label="Developer mode" checked={settings.developerMode} onChange={(checked) => onSettings({ developerMode: checked })} /><button className="st-text-button danger" onClick={onClear}><Trash2 size={15} />Clear local history</button></SettingSection></div>; }
function SettingSection({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <section className="st-setting-section"><div className="st-setting-head"><h3>{title}</h3><p>{description}</p></div><div className="st-setting-body">{children}</div></section>; }
function SettingRow({ label, help, children }: { label: string; help: string; children: ReactNode }) { return <div className="st-setting-row"><div><strong>{label}</strong><span>{help}</span></div>{children}</div>; }
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="st-toggle-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>; }
