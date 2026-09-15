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
}

export interface AnalysisResult {
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
  hotkey: string;
  storeHistory: boolean;
  developerMode: boolean;
  theme: "system" | "light" | "dark";
}

export interface ProcessingMetrics {
  captureTime: number;
  ocrTime: number;
  aiTime: number;
  totalTime: number;
}
