export type ContentType =
  | "MULTIPLE_CHOICE"
  | "PROGRAMMING_ERROR"
  | "TRANSLATION"
  | "MATH"
  | "GENERAL_TEXT"
  | "UNKNOWN";

export type OcrLanguage = "auto" | "tha" | "eng" | "tha+eng";
export type LearningMode = "quick" | "explain" | "tutor";

export interface ScreenRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  monitorId?: string;
}

export interface CaptureResult {
  imageDataUrl?: string;
  region: ScreenRegion;
  captureTime: number;
}

export interface OCRResult {
  text: string;
  cleanedText: string;
  confidence?: number;
  language: OcrLanguage;
  processingTime: number;
}

export interface Choice {
  key: string;
  text: string;
}

export interface Question {
  question: string;
  choices: Choice[];
}

export interface AnalysisRequest {
  text: string;
  contentType: ContentType;
  learningMode: LearningMode;
  model: string;
  temperature: number;
  /** Set when the learner asks for a deeper explanation of an answer they already saw. */
  previousSummary?: string;
  /** Web results found for the question; untrusted reference material. */
  sources?: SearchHit[];
}

export interface SearchHit {
  title: string;
  link: string;
  snippet: string;
}

export interface AnalysisResult {
  /** Pages the answer was grounded on, when Google research was on. */
  sources?: SearchHit[];
  source?: "ollama" | "demo";
  type: ContentType;
  answer?: string;
  answerText?: string;
  title: string;
  summary: string;
  details?: string;
  confidence?: number;
  rawResponse?: string;
  processingTime: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  ocrText: string;
  contentType: ContentType;
  analysis: AnalysisResult;
  processingTime: number;
}

export interface OllamaModel {
  name: string;
  size?: number;
  modifiedAt?: string;
}

export interface AppSettings {
  ollamaUrl: string;
  model: string;
  temperature: number;
  ocrLanguage: OcrLanguage;
  learningMode: LearningMode;
  storeHistory: boolean;
  developerMode: boolean;
  /** Look the question up on Google before asking the AI. */
  research: boolean;
  googleApiKey: string;
  googleCx: string;
}

export interface ProcessingMetrics {
  captureTime: number;
  ocrTime: number;
  aiTime: number;
  totalTime: number;
}
