import { Project, CrawlRun, PageResult, Finding, Asset, SearchResult, NetworkRequest, Endpoint, SecretFinding, TechStackItem, GraphNode, GraphEdge } from "./types";

export const demoProject: Project = {
  id: "proj_demo_001",
  name: "Example Corp Audit",
  startUrl: "https://example-corp.com",
  maxDepth: 3,
  maxPages: 200,
  concurrency: 2,
  userAgent: "SiteInspector/1.0",
  crawlDelay: 1000,
  sameDomainOnly: true,
  respectRobots: true,
  followRedirects: true,
  includePatterns: [],
  excludePatterns: ["/admin/*", "/api/*"],
  createdAt: "2026-02-10T09:00:00Z",
  status: "completed",
  renderPass: false,
  consent: true,
};

export const demoCrawlRun: CrawlRun = {
  id: "run_001",
  projectId: "proj_demo_001",
  status: "completed",
  startedAt: "2026-02-10T09:05:00Z",
  endedAt: "2026-02-10T09:12:34Z",
  pagesScanned: 147,
  pagesTotal: 147,
  errorsCount: 12,
  warningsCount: 34,
  consent: true,
  renderPass: false,
};

export const demoPages: PageResult[] = [
  { id: "pg_1", url: "https://example-corp.com/", statusCode: 200, contentType: "text/html", responseTime: 342, title: "Example Corp - Home", metaDescription: "Welcome to Example Corp", canonical: "https://example-corp.com/", linksCount: 45, imagesCount: 12, scriptsCount: 8, stylesheetsCount: 3 },
  { id: "pg_2", url: "https://example-corp.com/about", statusCode: 200, contentType: "text/html", responseTime: 289, title: "About Us - Example Corp", metaDescription: "", canonical: null, linksCount: 22, imagesCount: 5, scriptsCount: 8, stylesheetsCount: 3 },
  { id: "pg_3", url: "https://example-corp.com/products", statusCode: 200, contentType: "text/html", responseTime: 567, title: "Products - Example Corp", metaDescription: "Our products", canonical: "https://example-corp.com/products", linksCount: 89, imagesCount: 34, scriptsCount: 12, stylesheetsCount: 3 },
  { id: "pg_4", url: "https://example-corp.com/blog/old-post", statusCode: 301, contentType: "text/html", responseTime: 120, title: "", metaDescription: "", canonical: null, linksCount: 0, imagesCount: 0, scriptsCount: 0, stylesheetsCount: 0 },
  { id: "pg_5", url: "https://example-corp.com/careers", statusCode: 404, contentType: "text/html", responseTime: 98, title: "Not Found", metaDescription: "", canonical: null, linksCount: 3, imagesCount: 0, scriptsCount: 5, stylesheetsCount: 2 },
  { id: "pg_6", url: "https://example-corp.com/contact", statusCode: 200, contentType: "text/html", responseTime: 445, title: "Contact - Example Corp", metaDescription: "Get in touch with us", canonical: "https://example-corp.com/contact", linksCount: 15, imagesCount: 2, scriptsCount: 8, stylesheetsCount: 3 },
  { id: "pg_7", url: "https://example-corp.com/pricing", statusCode: 200, contentType: "text/html", responseTime: 312, title: "Example Corp - Home", metaDescription: "Our pricing plans", canonical: "https://example-corp.com/pricing", linksCount: 28, imagesCount: 6, scriptsCount: 9, stylesheetsCount: 3 },
];

export const demoFindings: Finding[] = [
  { id: "f_1", type: "security", severity: "high", title: "Missing Content-Security-Policy header", message: "No CSP header found on 134 pages. This allows potential XSS attacks.", location: "https://example-corp.com/", category: "headers" },
  { id: "f_2", type: "security", severity: "high", title: "Missing HSTS header", message: "Strict-Transport-Security header not set. Browser won't enforce HTTPS.", location: "https://example-corp.com/", category: "headers" },
  { id: "f_3", type: "security", severity: "medium", title: "Missing X-Frame-Options", message: "Page can be embedded in iframes, potential clickjacking risk.", location: "https://example-corp.com/", category: "headers" },
  { id: "f_4", type: "seo", severity: "medium", title: "Duplicate page title", message: "Title 'Example Corp - Home' is used on 2 pages: / and /pricing", location: "https://example-corp.com/pricing", category: "title" },
  { id: "f_5", type: "seo", severity: "low", title: "Missing meta description", message: "No meta description found on /about page.", location: "https://example-corp.com/about", category: "meta" },
  { id: "f_6", type: "quality", severity: "high", title: "Broken link (404)", message: "Link to /careers returns 404 Not Found. Found on 3 pages.", location: "https://example-corp.com/careers", category: "links" },
  { id: "f_7", type: "quality", severity: "low", title: "Redirect chain detected", message: "/blog/old-post → /blog/archived → /blog. 2-hop redirect chain.", location: "https://example-corp.com/blog/old-post", category: "redirects" },
  { id: "f_8", type: "quality", severity: "medium", title: "Large uncompressed asset", message: "main.bundle.js is 2.4MB uncompressed. Consider code splitting.", location: "https://example-corp.com/static/main.bundle.js", category: "performance" },
  { id: "f_9", type: "security", severity: "info", title: "Mixed content warning", message: "HTTP resource loaded on HTTPS page: http://cdn.example.com/legacy.css", location: "https://example-corp.com/products", category: "mixed-content" },
  { id: "f_10", type: "code", severity: "medium", title: "Possible API key in source", message: "Pattern matching API key found in app.js. Value masked: sk_live_****...****7f2a", location: "https://example-corp.com/static/app.js:142", category: "secrets" },
];

export const demoAssets: Asset[] = [
  { id: "a_1", url: "https://example-corp.com/static/main.bundle.js", type: "javascript", size: 2457600, hash: "a3f2c9...", whereFound: "pg_1" },
  { id: "a_2", url: "https://example-corp.com/static/vendor.js", type: "javascript", size: 890000, hash: "b7d1e4...", whereFound: "pg_1" },
  { id: "a_3", url: "https://example-corp.com/static/app.js", type: "javascript", size: 345000, hash: "c5a8f2...", whereFound: "pg_1" },
  { id: "a_4", url: "https://example-corp.com/static/styles.css", type: "stylesheet", size: 124000, hash: "d2b6c1...", whereFound: "pg_1" },
  { id: "a_5", url: "https://example-corp.com/static/app.js.map", type: "sourcemap", size: 1200000, hash: "e9f3a7...", whereFound: "a_3" },
  { id: "a_6", url: "https://example-corp.com/images/hero.webp", type: "image", size: 456000, hash: "f1c4d8...", whereFound: "pg_1" },
  { id: "a_7", url: "https://example-corp.com/fonts/inter-var.woff2", type: "font", size: 98000, hash: "g2h5i9...", whereFound: "a_4" },
  { id: "a_8", url: "https://example-corp.com/images/og-image.png", type: "image", size: 234000, hash: "h3j6k0...", whereFound: "pg_1" },
  { id: "a_9", url: "https://example-corp.com/manifest.json", type: "manifest", size: 1200, hash: "i4l7m1...", whereFound: "pg_1" },
  { id: "a_10", url: "https://example-corp.com/images/logo.svg", type: "image", size: 4200, hash: "j5n8o2...", whereFound: "pg_1" },
];

export const demoSearchResults: SearchResult[] = [
  { id: "sr_1", file: "static/app.js", line: 42, column: 12, match: 'fetch("/api/v2/users"', context: 'const getUsers = () => fetch("/api/v2/users", { headers: authHeaders })' },
  { id: "sr_2", file: "static/app.js", line: 87, column: 8, match: 'fetch("/api/v2/products"', context: 'export const loadProducts = () => fetch("/api/v2/products?limit=50")' },
  { id: "sr_3", file: "static/app.js", line: 142, column: 22, match: "sk_live_****...****7f2a", context: '// WARNING: const apiKey = "sk_live_****...****7f2a" // MASKED' },
  { id: "sr_4", file: "static/vendor.js", line: 1, column: 456, match: 'wss://ws.example-corp.com', context: 'new WebSocket("wss://ws.example-corp.com/realtime")' },
  { id: "sr_5", file: "static/main.bundle.js", line: 234, column: 10, match: "/graphql", context: 'const GRAPHQL_ENDPOINT = "/graphql";' },
  { id: "sr_6", file: "static/app.js", line: 201, column: 4, match: 'route: "/dashboard"', context: '{ path: "/dashboard", component: DashboardView, auth: true }' },
];

export const demoNetworkRequests: NetworkRequest[] = [
  { id: "nr_1", method: "GET", url: "https://example-corp.com/", statusCode: 200, type: "document", initiator: "navigation", size: 45200, time: 342 },
  { id: "nr_2", method: "GET", url: "https://example-corp.com/static/main.bundle.js", statusCode: 200, type: "script", initiator: "parser", size: 2457600, time: 890 },
  { id: "nr_3", method: "GET", url: "https://example-corp.com/static/vendor.js", statusCode: 200, type: "script", initiator: "parser", size: 890000, time: 456 },
  { id: "nr_4", method: "GET", url: "https://example-corp.com/static/styles.css", statusCode: 200, type: "stylesheet", initiator: "parser", size: 124000, time: 189 },
  { id: "nr_5", method: "GET", url: "https://example-corp.com/api/v2/users", statusCode: 200, type: "fetch", initiator: "app.js:42", size: 12400, time: 234 },
  { id: "nr_6", method: "POST", url: "https://example-corp.com/graphql", statusCode: 200, type: "fetch", initiator: "app.js:156", size: 8900, time: 178 },
  { id: "nr_7", method: "GET", url: "https://example-corp.com/api/v2/products?limit=50", statusCode: 200, type: "fetch", initiator: "app.js:87", size: 34500, time: 312 },
  { id: "nr_8", method: "GET", url: "https://example-corp.com/images/hero.webp", statusCode: 200, type: "image", initiator: "parser", size: 456000, time: 567 },
  { id: "nr_9", method: "GET", url: "https://example-corp.com/fonts/inter-var.woff2", statusCode: 200, type: "font", initiator: "styles.css", size: 98000, time: 234 },
  { id: "nr_10", method: "GET", url: "http://cdn.example.com/legacy.css", statusCode: 200, type: "stylesheet", initiator: "parser", size: 23000, time: 445 },
  { id: "nr_11", method: "GET", url: "https://example-corp.com/careers", statusCode: 404, type: "document", initiator: "navigation", size: 1200, time: 98 },
  { id: "nr_12", method: "GET", url: "https://example-corp.com/blog/old-post", statusCode: 301, type: "document", initiator: "navigation", size: 0, time: 120 },
];

export const demoEndpoints: Endpoint[] = [
  { id: "ep_1", url: "/api/v2/users", method: "GET", type: "rest", foundIn: "static/app.js", line: 42 },
  { id: "ep_2", url: "/api/v2/products", method: "GET", type: "rest", foundIn: "static/app.js", line: 87 },
  { id: "ep_3", url: "/api/v2/orders", method: "POST", type: "rest", foundIn: "static/app.js", line: 112 },
  { id: "ep_4", url: "/graphql", method: "POST", type: "graphql", foundIn: "static/main.bundle.js", line: 234, operationName: "GetProducts" },
  { id: "ep_5", url: "/graphql", method: "POST", type: "graphql", foundIn: "static/main.bundle.js", line: 267, operationName: "GetUser" },
  { id: "ep_6", url: "wss://ws.example-corp.com/realtime", method: "WS", type: "websocket", foundIn: "static/vendor.js", line: 1 },
  { id: "ep_7", url: "/api/v2/auth/login", method: "POST", type: "rest", foundIn: "static/app.js", line: 23 },
  { id: "ep_8", url: "/api/v2/auth/refresh", method: "POST", type: "rest", foundIn: "static/app.js", line: 35 },
];

export const demoSecrets: SecretFinding[] = [
  { id: "sec_1", type: "API Key (Stripe)", maskedValue: "sk_live_****...****7f2a", fingerprint: "sha256:a3b9c2...", severity: "high", confidence: 95, location: "static/app.js", line: 142, snippet: 'const apiKey = "sk_live_****...****7f2a"' },
  { id: "sec_2", type: "JWT Token", maskedValue: "eyJhb****...****kQ2c", fingerprint: "sha256:d4e5f6...", severity: "medium", confidence: 80, location: "static/app.js", line: 89, snippet: 'const defaultToken = "eyJhb****...****kQ2c"' },
  { id: "sec_3", type: "AWS Access Key", maskedValue: "AKIA****...****3QXR", fingerprint: "sha256:g7h8i9...", severity: "high", confidence: 90, location: "static/vendor.js", line: 2341, snippet: 'aws_key: "AKIA****...****3QXR"' },
];

export const demoTechStack: TechStackItem[] = [
  { name: "React", version: "18.2.0", confidence: 95, evidence: "__REACT_DEVTOOLS_GLOBAL_HOOK__ detected" },
  { name: "Next.js", version: "14.x", confidence: 85, evidence: "__NEXT_DATA__ script tag found" },
  { name: "Tailwind CSS", version: "3.x", confidence: 90, evidence: "Utility class patterns detected in HTML" },
  { name: "Webpack", version: "5.x", confidence: 75, evidence: "webpackChunk* globals found" },
  { name: "Sentry", version: "unknown", confidence: 70, evidence: "Sentry DSN found in source" },
];

export const demoGraphNodes: GraphNode[] = [
  { id: "pg_1", type: "page", label: "/" },
  { id: "pg_3", type: "page", label: "/products" },
  { id: "a_1", type: "asset", label: "main.bundle.js" },
  { id: "a_3", type: "asset", label: "app.js" },
  { id: "ep_1", type: "endpoint", label: "/api/v2/users" },
  { id: "ep_4", type: "endpoint", label: "/graphql" },
  { id: "f_1", type: "finding", label: "Missing CSP" },
  { id: "f_10", type: "finding", label: "API Key exposed" },
];

export const demoGraphEdges: GraphEdge[] = [
  { source: "pg_1", target: "a_1", label: "loads" },
  { source: "pg_1", target: "a_3", label: "loads" },
  { source: "pg_3", target: "a_1", label: "loads" },
  { source: "a_3", target: "ep_1", label: "calls" },
  { source: "a_1", target: "ep_4", label: "calls" },
  { source: "pg_1", target: "f_1", label: "finding" },
  { source: "a_3", target: "f_10", label: "finding" },
];

export const demoProjects: Project[] = [
  demoProject,
  {
    id: "proj_002",
    name: "Staging Site Check",
    startUrl: "https://staging.myapp.io",
    maxDepth: 2,
    maxPages: 200,
    concurrency: 2,
    userAgent: "SiteInspector/1.0",
    crawlDelay: 1000,
    sameDomainOnly: true,
    respectRobots: true,
    followRedirects: true,
    includePatterns: [],
    excludePatterns: [],
    createdAt: "2026-02-12T14:30:00Z",
    status: "idle",
    renderPass: false,
    consent: true,
  },
];
