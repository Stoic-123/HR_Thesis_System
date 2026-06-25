// src/lib/scanner/types.ts

export interface Point {
  x: number;
  y: number;
}

export interface DetectionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  maskData?: Uint8Array;
  maskWidth?: number;
  maskHeight?: number;
}

export interface CardResult {
  points: Point[];
  area: number;
  center: Point;
  score: number;
  className: string;
  confidence: number;
  originalBox: DetectionResult;
}

export interface ScannerResponse {
  success: boolean;
  cards: CardResult[];
  debug?: any;
}
