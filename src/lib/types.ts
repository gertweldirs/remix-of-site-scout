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
  type: "javascript" | "stylesheet" | "image" | "sourcemap" | "other";
  size: number;
  hash: string;
}

export interface SearchResult {
  id: string;
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}
