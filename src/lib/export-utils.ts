import { Finding, PageResult, Asset, Endpoint, SecretFinding, TechStackItem, NetworkRequest, SearchResult, GraphNode, GraphEdge } from "./types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escCsv(val: any): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export interface FullExportData {
  projectName: string;
  startUrl?: string;
  findings: Finding[];
  pages: PageResult[];
  assets: Asset[];
  endpoints: Endpoint[];
  secrets: SecretFinding[];
  techStack: TechStackItem[];
  networkRequests: NetworkRequest[];
  searchResults: SearchResult[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
}

// ─── Individual section exports ───

export function exportFindingsJSON(data: FullExportData) {
  downloadFile(JSON.stringify(data.findings, null, 2), `${data.projectName}-findings.json`, "application/json");
}
export function exportFindingsCSV(data: FullExportData) {
  const rows = ["severity,type,title,message,location,category", ...data.findings.map(f =>
    [f.severity, f.type, escCsv(f.title), escCsv(f.message), escCsv(f.location), f.category].join(",")
  )];
  downloadFile(rows.join("\n"), `${data.projectName}-findings.csv`, "text/csv");
}

export function exportPagesJSON(data: FullExportData) {
  downloadFile(JSON.stringify(data.pages, null, 2), `${data.projectName}-pages.json`, "application/json");
}
export function exportPagesCSV(data: FullExportData) {
  const rows = ["url,status,responseTime,title,links,images,scripts,stylesheets", ...data.pages.map(p =>
    [escCsv(p.url), p.statusCode, p.responseTime, escCsv(p.title), p.linksCount, p.imagesCount, p.scriptsCount, p.stylesheetsCount].join(",")
  )];
  downloadFile(rows.join("\n"), `${data.projectName}-pages.csv`, "text/csv");
}

export function exportAssetsJSON(data: FullExportData) {
  downloadFile(JSON.stringify(data.assets, null, 2), `${data.projectName}-assets.json`, "application/json");
}
export function exportAssetsCSV(data: FullExportData) {
  const rows = ["url,type,size,hash", ...data.assets.map(a =>
    [escCsv(a.url), a.type, formatBytes(a.size), a.hash].join(",")
  )];
  downloadFile(rows.join("\n"), `${data.projectName}-assets.csv`, "text/csv");
}

export function exportEndpointsJSON(data: FullExportData) {
  downloadFile(JSON.stringify(data.endpoints, null, 2), `${data.projectName}-endpoints.json`, "application/json");
}
export function exportEndpointsCSV(data: FullExportData) {
  const rows = ["url,method,type,foundIn,line,operationName", ...data.endpoints.map(e =>
    [escCsv(e.url), e.method, e.type, escCsv(e.foundIn), e.line || "", escCsv(e.operationName || "")].join(",")
  )];
  downloadFile(rows.join("\n"), `${data.projectName}-endpoints.csv`, "text/csv");
}

export function exportSecretsJSON(data: FullExportData) {
  // Always mask values
  const masked = data.secrets.map(s => ({ ...s, maskedValue: s.maskedValue }));
  downloadFile(JSON.stringify(masked, null, 2), `${data.projectName}-secrets.json`, "application/json");
}

export function exportTechStackJSON(data: FullExportData) {
  downloadFile(JSON.stringify(data.techStack, null, 2), `${data.projectName}-techstack.json`, "application/json");
}

export function exportNetworkJSON(data: FullExportData) {
  downloadFile(JSON.stringify(data.networkRequests, null, 2), `${data.projectName}-network.json`, "application/json");
}
export function exportNetworkCSV(data: FullExportData) {
  const rows = ["method,url,status,type,size,timing,initiator", ...data.networkRequests.map(r =>
    [r.method, escCsv(r.url), r.statusCode, r.type, formatBytes(r.size), r.time + "ms", escCsv(r.initiator)].join(",")
  )];
  downloadFile(rows.join("\n"), `${data.projectName}-network.csv`, "text/csv");
}

export function exportGraphJSON(data: FullExportData) {
  downloadFile(JSON.stringify({ nodes: data.graphNodes, edges: data.graphEdges }, null, 2), `${data.projectName}-graph.json`, "application/json");
}

export function exportSourcesJSON(data: FullExportData) {
  downloadFile(JSON.stringify(data.searchResults, null, 2), `${data.projectName}-sources.json`, "application/json");
}

// ─── HAR-like export ───
export function exportHAR(data: FullExportData) {
  const har = {
    log: {
      version: "1.2",
      creator: { name: "SiteInspector", version: "1.0" },
      entries: data.networkRequests.map(r => ({
        startedDateTime: new Date().toISOString(),
        time: r.time,
        request: { method: r.method, url: r.url, httpVersion: "HTTP/1.1", headers: [], queryString: [], bodySize: -1 },
        response: { status: r.statusCode, statusText: "", httpVersion: "HTTP/1.1", headers: [], content: { size: r.size, mimeType: r.type }, bodySize: r.size },
        cache: {},
        timings: { send: 0, wait: r.time, receive: 0 },
      })),
    },
  };
  downloadFile(JSON.stringify(har, null, 2), `${data.projectName}-network.har`, "application/json");
}

// ─── URL list export ───
export function exportURLList(data: FullExportData) {
  const urls = data.pages.map(p => p.url).join("\n");
  downloadFile(urls, `${data.projectName}-urls.txt`, "text/plain");
}

// ─── Markdown report ───
export function exportMarkdown(data: FullExportData) {
  const lines: string[] = [];
  lines.push(`# SiteInspector Report: ${data.projectName}`);
  lines.push(`> Generated: ${new Date().toLocaleString()}`);
  if (data.startUrl) lines.push(`> Target: ${data.startUrl}`);
  lines.push("");

  lines.push("## Summary");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Pages scanned | ${data.pages.length} |`);
  lines.push(`| Findings | ${data.findings.length} |`);
  lines.push(`| Assets | ${data.assets.length} |`);
  lines.push(`| Endpoints | ${data.endpoints.length} |`);
  lines.push(`| Secrets detected | ${data.secrets.length} |`);
  lines.push(`| Tech stack items | ${data.techStack.length} |`);
  lines.push("");

  const high = data.findings.filter(f => f.severity === "high");
  const med = data.findings.filter(f => f.severity === "medium");
  const low = data.findings.filter(f => f.severity === "low");
  const info = data.findings.filter(f => f.severity === "info");

  lines.push("## Findings Overview");
  lines.push(`- 🔴 **High**: ${high.length}`);
  lines.push(`- 🟠 **Medium**: ${med.length}`);
  lines.push(`- 🟡 **Low**: ${low.length}`);
  lines.push(`- 🔵 **Info**: ${info.length}`);
  lines.push("");

  if (high.length > 0) {
    lines.push("### 🔴 High Severity");
    high.forEach(f => {
      lines.push(`- **${f.title}** — ${f.message}`);
      lines.push(`  - Location: \`${f.location}\``);
    });
    lines.push("");
  }

  if (med.length > 0) {
    lines.push("### 🟠 Medium Severity");
    med.forEach(f => {
      lines.push(`- **${f.title}** — ${f.message}`);
      lines.push(`  - Location: \`${f.location}\``);
    });
    lines.push("");
  }

  if (low.length > 0) {
    lines.push("### 🟡 Low Severity");
    low.forEach(f => lines.push(`- **${f.title}** — ${f.message}`));
    lines.push("");
  }

  if (data.secrets.length > 0) {
    lines.push("## ⚠️ Exposed Secrets");
    data.secrets.forEach(s => {
      lines.push(`- **${s.type}** [${s.severity.toUpperCase()}] — \`${s.maskedValue}\``);
      lines.push(`  - Location: \`${s.location}:${s.line}\``);
    });
    lines.push("");
  }

  if (data.techStack.length > 0) {
    lines.push("## Tech Stack");
    lines.push("| Technology | Version | Confidence |");
    lines.push("|------------|---------|------------|");
    data.techStack.forEach(t => lines.push(`| ${t.name} | ${t.version} | ${t.confidence}% |`));
    lines.push("");
  }

  if (data.endpoints.length > 0) {
    lines.push("## Endpoints");
    lines.push("| Method | URL | Type | Found In |");
    lines.push("|--------|-----|------|----------|");
    data.endpoints.forEach(e => lines.push(`| ${e.method} | \`${e.url}\` | ${e.type} | ${e.foundIn} |`));
    lines.push("");
  }

  lines.push("## Pages");
  lines.push("| Status | URL | Response Time | Title |");
  lines.push("|--------|-----|--------------|-------|");
  data.pages.forEach(p => lines.push(`| ${p.statusCode} | ${p.url} | ${p.responseTime}ms | ${escCsv(p.title)} |`));
  lines.push("");

  lines.push("## Assets");
  lines.push("| Type | Size | URL |");
  lines.push("|------|------|-----|");
  data.assets.forEach(a => lines.push(`| ${a.type} | ${formatBytes(a.size)} | ${a.url} |`));
  lines.push("");

  lines.push("---");
  lines.push("*Report generated by SiteInspector*");

  downloadFile(lines.join("\n"), `${data.projectName}-report.md`, "text/markdown");
}

// ─── Full TXT report (everything in one file) ───
export function exportFullText(data: FullExportData) {
  const sep = "═".repeat(70);
  const lines: string[] = [];

  lines.push(sep);
  lines.push(`  SITEINSPECTOR — FULL SCAN REPORT`);
  lines.push(`  Project: ${data.projectName}`);
  if (data.startUrl) lines.push(`  Target:  ${data.startUrl}`);
  lines.push(`  Date:    ${new Date().toLocaleString()}`);
  lines.push(sep);
  lines.push("");

  // Summary
  lines.push("┌─ SUMMARY ─────────────────────────────────");
  lines.push(`│  Pages:     ${data.pages.length}`);
  lines.push(`│  Findings:  ${data.findings.length} (${data.findings.filter(f => f.severity === "high").length} high, ${data.findings.filter(f => f.severity === "medium").length} medium)`);
  lines.push(`│  Assets:    ${data.assets.length}`);
  lines.push(`│  Endpoints: ${data.endpoints.length}`);
  lines.push(`│  Secrets:   ${data.secrets.length}`);
  lines.push(`│  Tech:      ${data.techStack.map(t => t.name).join(", ") || "none detected"}`);
  lines.push("└────────────────────────────────────────────");
  lines.push("");

  // Findings
  lines.push("╔══ FINDINGS " + "═".repeat(58));
  data.findings.forEach(f => {
    lines.push(`║ [${f.severity.toUpperCase().padEnd(6)}] ${f.title}`);
    lines.push(`║   ${f.message}`);
    lines.push(`║   @ ${f.location}  (${f.category})`);
    lines.push("║");
  });
  lines.push("╚" + "═".repeat(69));
  lines.push("");

  // Secrets
  if (data.secrets.length > 0) {
    lines.push("╔══ SECRETS (MASKED) " + "═".repeat(50));
    data.secrets.forEach(s => {
      lines.push(`║ [${s.severity.toUpperCase()}] ${s.type}: ${s.maskedValue}`);
      lines.push(`║   @ ${s.location}:${s.line}`);
      lines.push("║");
    });
    lines.push("╚" + "═".repeat(69));
    lines.push("");
  }

  // Pages
  lines.push("╔══ PAGES " + "═".repeat(61));
  data.pages.forEach(p => {
    lines.push(`║ ${String(p.statusCode).padEnd(4)} ${p.responseTime.toString().padStart(5)}ms  ${p.url}`);
    if (p.title) lines.push(`║      title: ${p.title}`);
  });
  lines.push("╚" + "═".repeat(69));
  lines.push("");

  // Endpoints
  if (data.endpoints.length > 0) {
    lines.push("╔══ ENDPOINTS " + "═".repeat(56));
    data.endpoints.forEach(e => {
      lines.push(`║ ${e.method.padEnd(6)} [${e.type.padEnd(9)}] ${e.url}`);
      lines.push(`║   found in: ${e.foundIn}${e.line ? `:${e.line}` : ""}`);
    });
    lines.push("╚" + "═".repeat(69));
    lines.push("");
  }

  // Tech stack
  if (data.techStack.length > 0) {
    lines.push("╔══ TECH STACK " + "═".repeat(55));
    data.techStack.forEach(t => {
      lines.push(`║ ${t.name} v${t.version} (${t.confidence}% confidence)`);
    });
    lines.push("╚" + "═".repeat(69));
    lines.push("");
  }

  // Assets
  lines.push("╔══ ASSETS " + "═".repeat(59));
  data.assets.forEach(a => {
    lines.push(`║ ${a.type.padEnd(12)} ${formatBytes(a.size).padStart(10)}  ${a.url}`);
  });
  lines.push("╚" + "═".repeat(69));
  lines.push("");

  // Network
  lines.push("╔══ NETWORK REQUESTS " + "═".repeat(49));
  data.networkRequests.forEach(r => {
    lines.push(`║ ${r.method.padEnd(6)} ${String(r.statusCode).padEnd(4)} ${formatBytes(r.size).padStart(10)} ${r.time.toString().padStart(5)}ms  ${r.url}`);
  });
  lines.push("╚" + "═".repeat(69));
  lines.push("");

  // Sources
  if (data.searchResults.length > 0) {
    lines.push("╔══ CODE INDEX " + "═".repeat(55));
    data.searchResults.forEach(s => {
      lines.push(`║ ${s.file}:${s.line}:${s.column}`);
      lines.push(`║   ${s.match}`);
      lines.push(`║   ${s.context}`);
      lines.push("║");
    });
    lines.push("╚" + "═".repeat(69));
    lines.push("");
  }

  // Graph
  if (data.graphEdges.length > 0) {
    lines.push("╔══ GRAPH EDGES " + "═".repeat(54));
    data.graphEdges.forEach(e => {
      lines.push(`║ ${e.source} ──${e.label || "→"}──▶ ${e.target}`);
    });
    lines.push("╚" + "═".repeat(69));
  }

  lines.push("");
  lines.push("— End of report —");

  downloadFile(lines.join("\n"), `${data.projectName}-full-report.txt`, "text/plain");
}

// ─── Complete JSON (everything) ───
export function exportJSON(data: FullExportData) {
  const full = {
    meta: { tool: "SiteInspector", version: "1.0", exportedAt: new Date().toISOString(), projectName: data.projectName, startUrl: data.startUrl },
    summary: {
      pages: data.pages.length, findings: data.findings.length, assets: data.assets.length,
      endpoints: data.endpoints.length, secrets: data.secrets.length, techStack: data.techStack.length,
    },
    findings: data.findings,
    pages: data.pages,
    assets: data.assets,
    endpoints: data.endpoints,
    secrets: data.secrets,
    techStack: data.techStack,
    networkRequests: data.networkRequests,
    searchResults: data.searchResults,
    graph: { nodes: data.graphNodes, edges: data.graphEdges },
  };
  downloadFile(JSON.stringify(full, null, 2), `${data.projectName}-complete.json`, "application/json");
}

// ─── Website clone bundle (HTML index + asset list) ───
export function exportCloneBundle(data: FullExportData) {
  const html: string[] = [];
  html.push("<!DOCTYPE html>");
  html.push(`<html lang="en"><head><meta charset="UTF-8"><title>${data.projectName} - Clone Reference</title>`);
  html.push(`<style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; background: #0d1117; color: #c9d1d9; }
    h1, h2, h3 { color: #58a6ff; } a { color: #79c0ff; } table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #30363d; padding: 6px 12px; text-align: left; font-size: 13px; }
    th { background: #161b22; } tr:hover { background: #161b22; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .high { background: #da363340; color: #f85149; } .medium { background: #d2992240; color: #e3b341; }
    .low { background: #388bfd20; color: #58a6ff; } .info { background: #8b949e20; color: #8b949e; }
    pre { background: #161b22; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
    .section { margin: 2rem 0; border: 1px solid #30363d; border-radius: 8px; padding: 1.5rem; }
  </style></head><body>`);
  html.push(`<h1>🔍 ${data.projectName}</h1>`);
  if (data.startUrl) html.push(`<p>Target: <a href="${data.startUrl}">${data.startUrl}</a></p>`);
  html.push(`<p>Exported: ${new Date().toLocaleString()}</p>`);

  // Summary
  html.push(`<div class="section"><h2>📊 Summary</h2>`);
  html.push(`<table><tr><th>Metric</th><th>Count</th></tr>`);
  html.push(`<tr><td>Pages</td><td>${data.pages.length}</td></tr>`);
  html.push(`<tr><td>Findings</td><td>${data.findings.length}</td></tr>`);
  html.push(`<tr><td>Assets</td><td>${data.assets.length}</td></tr>`);
  html.push(`<tr><td>Endpoints</td><td>${data.endpoints.length}</td></tr>`);
  html.push(`<tr><td>Secrets</td><td>${data.secrets.length}</td></tr>`);
  html.push(`<tr><td>Tech Stack</td><td>${data.techStack.map(t => t.name).join(", ")}</td></tr>`);
  html.push("</table></div>");

  // Sitemap / page tree
  html.push(`<div class="section"><h2>🗺️ Sitemap</h2><ul>`);
  data.pages.forEach(p => html.push(`<li><a href="${p.url}">${p.url}</a> — ${p.statusCode} (${p.responseTime}ms) — ${p.title || "(no title)"}</li>`));
  html.push("</ul></div>");

  // Findings
  html.push(`<div class="section"><h2>🛡️ Findings</h2><table><tr><th>Severity</th><th>Title</th><th>Message</th><th>Location</th></tr>`);
  data.findings.forEach(f => html.push(`<tr><td><span class="badge ${f.severity}">${f.severity}</span></td><td>${f.title}</td><td>${f.message}</td><td><code>${f.location}</code></td></tr>`));
  html.push("</table></div>");

  // Assets with download links
  html.push(`<div class="section"><h2>📦 Assets (direct links)</h2><table><tr><th>Type</th><th>Size</th><th>URL</th></tr>`);
  data.assets.forEach(a => html.push(`<tr><td>${a.type}</td><td>${formatBytes(a.size)}</td><td><a href="${a.url}" download>${a.url}</a></td></tr>`));
  html.push("</table></div>");

  // Endpoints
  if (data.endpoints.length > 0) {
    html.push(`<div class="section"><h2>🔌 Endpoints</h2><table><tr><th>Method</th><th>URL</th><th>Type</th><th>Found In</th></tr>`);
    data.endpoints.forEach(e => html.push(`<tr><td>${e.method}</td><td><code>${e.url}</code></td><td>${e.type}</td><td>${e.foundIn}${e.line ? `:${e.line}` : ""}</td></tr>`));
    html.push("</table></div>");
  }

  // Secrets
  if (data.secrets.length > 0) {
    html.push(`<div class="section"><h2>⚠️ Exposed Secrets (masked)</h2><table><tr><th>Type</th><th>Masked Value</th><th>Severity</th><th>Location</th></tr>`);
    data.secrets.forEach(s => html.push(`<tr><td>${s.type}</td><td><code>${s.maskedValue}</code></td><td><span class="badge ${s.severity}">${s.severity}</span></td><td>${s.location}:${s.line}</td></tr>`));
    html.push("</table></div>");
  }

  // wget/curl clone script
  html.push(`<div class="section"><h2>📥 Clone Script</h2><p>Copy this to download all discovered assets:</p><pre>`);
  html.push("#!/bin/bash\n# SiteInspector Clone Script\n# Downloads all discovered assets\n");
  html.push(`mkdir -p "${data.projectName}-clone"\ncd "${data.projectName}-clone"\n\n`);
  html.push("# Pages\n");
  data.pages.forEach(p => html.push(`curl -sLO "${p.url}"\n`));
  html.push("\n# Assets\n");
  data.assets.forEach(a => html.push(`curl -sLO "${a.url}"\n`));
  html.push("\necho 'Done! All files downloaded.'\n");
  html.push("</pre></div>");

  html.push("</body></html>");
  downloadFile(html.join("\n"), `${data.projectName}-clone-reference.html`, "text/html");
}

// ─── Diff-ready export (for comparing scans) ───
export function exportDiffReady(data: FullExportData) {
  const output = {
    exportFormat: "siteinspector-diff-v1",
    timestamp: new Date().toISOString(),
    project: data.projectName,
    pages: data.pages.map(p => p.url).sort(),
    findings: data.findings.map(f => `${f.severity}:${f.title}:${f.location}`).sort(),
    assets: data.assets.map(a => `${a.hash}:${a.url}`).sort(),
    endpoints: data.endpoints.map(e => `${e.method}:${e.url}`).sort(),
    secrets: data.secrets.map(s => `${s.type}:${s.fingerprint}`).sort(),
    techStack: data.techStack.map(t => `${t.name}:${t.version}`).sort(),
  };
  downloadFile(JSON.stringify(output, null, 2), `${data.projectName}-diff-${timestamp()}.json`, "application/json");
}

// Legacy exports (backward compat)
export function exportCSV(data: { projectName: string; findings: Finding[]; pages: PageResult[]; assets: Asset[] }) {
  const full: FullExportData = { ...data, endpoints: [], secrets: [], techStack: [], networkRequests: [], searchResults: [], graphNodes: [], graphEdges: [] };
  exportFindingsCSV(full);
}

export function exportPDF(data: { projectName: string; findings: Finding[]; pages: PageResult[]; assets: Asset[] }) {
  const full: FullExportData = { ...data, endpoints: [], secrets: [], techStack: [], networkRequests: [], searchResults: [], graphNodes: [], graphEdges: [] };
  exportFullText(full);
}
