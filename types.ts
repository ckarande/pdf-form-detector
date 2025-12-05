export enum AnalysisStatus {
  IDLE = 'IDLE',
  FETCHING = 'FETCHING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface PdfAnalysisResult {
  id: string;
  url: string;
  filename: string;
  status: AnalysisStatus;
  isFillable?: boolean;
  fieldCount?: number;
  summary?: string;
  errorMessage?: string;
}

export interface GeminiAnalysisResponse {
  isFillable: boolean;
  fieldCount: number;
  summary: string;
}
