export type Severity = "high" | "medium" | "low" | "info";
export type FindingType = "security" | "seo" | "quality" | "code";
export type ProjectStatus = "idle" | "running" | "completed" | "failed";

export interface Project {
  id: string;
  name: string;
  startUrl: string;
  maxDepth: number;
  maxPages: number;
  concurrency: number;
  userAgent: string;
  crawlDelay: number;
  sameDomainOnly: boolean;
  respectRobots: boolean;
  followRedirects: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  createdAt: string;
  status: ProjectStatus;
  renderPass?: boolean;
  consent?: boolean;
}

export interface CrawlRun {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  endedAt: string | null;
  pagesScanned: number;
  pagesTotal: number;
  errorsCount: number;
  warningsCount: number;
  consent: boolean;
  renderPass: boolean;
}

export interface PageResult {
  id: string;
  url: string;
  statusCode: number;
  contentType: string;
  responseTime: number;
  title: string;
  metaDescription: string;
  canonical: string | null;
  linksCount: number;
  imagesCount: number;
  scriptsCount: number;
  stylesheetsCount: number;
}

export interface Finding {
  id: string;
  type: FindingType;
  severity: Severity;
  title: string;
  message: string;
  location: string;
  category: string;
}

export interface Asset {
  id: string;
  url: string;
  type: "javascript" | "stylesheet" | "image" | "sourcemap" | "font" | "video" | "audio" | "manifest" | "other";
  size: number;
  hash: string;
  whereFound?: string;
}

export interface SearchResult {
  id: string;
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  type: "document" | "script" | "stylesheet" | "image" | "font" | "xhr" | "fetch" | "websocket" | "other";
  initiator: string;
  size: number;
  time: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
}

export interface Endpoint {
  id: string;
  url: string;
  method: string;
  type: "rest" | "graphql" | "websocket" | "static";
  foundIn: string;
  line?: number;
  operationName?: string;
}

export interface SecretFinding {
  id: string;
  type: string;
  maskedValue: string;
  fingerprint: string;
  severity: Severity;
  confidence: number;
  location: string;
  line: number;
  snippet: string;
}

export interface TechStackItem {
  name: string;
  version: string;
  confidence: number;
  evidence: string;
}

export interface GraphNode {
  id: string;
  type: "page" | "asset" | "endpoint" | "finding";
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}
