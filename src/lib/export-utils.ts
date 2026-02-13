import { Finding, PageResult, Asset } from "./types";

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

interface ExportData {
  projectName: string;
  findings: Finding[];
  pages: PageResult[];
  assets: Asset[];
}

export function exportJSON(data: ExportData) {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${data.projectName}-report.json`, "application/json");
}

export function exportCSV(data: ExportData) {
  const findingsCSV = [
    "id,type,severity,title,message,location,category",
    ...data.findings.map(f =>
      [f.id, f.type, f.severity, `"${f.title}"`, `"${f.message}"`, `"${f.location}"`, f.category].join(",")
    ),
  ].join("\n");

  const pagesCSV = [
    "id,url,statusCode,responseTime,title,linksCount",
    ...data.pages.map(p =>
      [p.id, `"${p.url}"`, p.statusCode, p.responseTime, `"${p.title}"`, p.linksCount].join(",")
    ),
  ].join("\n");

  const assetsCSV = [
    "id,url,type,size,hash",
    ...data.assets.map(a =>
      [a.id, `"${a.url}"`, a.type, formatBytes(a.size), a.hash].join(",")
    ),
  ].join("\n");

  const csv = `=== FINDINGS ===\n${findingsCSV}\n\n=== PAGES ===\n${pagesCSV}\n\n=== ASSETS ===\n${assetsCSV}`;
  downloadFile(csv, `${data.projectName}-report.csv`, "text/csv");
}

export function exportPDF(data: ExportData) {
  const lines: string[] = [];
  lines.push(`SITEINSPECTOR REPORT: ${data.projectName}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("=".repeat(60));
  lines.push("");

  lines.push(`SUMMARY`);
  lines.push(`Pages scanned: ${data.pages.length}`);
  lines.push(`Findings: ${data.findings.length}`);
  lines.push(`Assets: ${data.assets.length}`);
  lines.push("");

  lines.push("FINDINGS");
  lines.push("-".repeat(40));
  data.findings.forEach(f => {
    lines.push(`[${f.severity.toUpperCase()}] ${f.title}`);
    lines.push(`  ${f.message}`);
    lines.push(`  Location: ${f.location}`);
    lines.push("");
  });

  lines.push("PAGES");
  lines.push("-".repeat(40));
  data.pages.forEach(p => {
    lines.push(`${p.statusCode} ${p.url} (${p.responseTime}ms)`);
  });
  lines.push("");

  lines.push("ASSETS");
  lines.push("-".repeat(40));
  data.assets.forEach(a => {
    lines.push(`${a.type} | ${formatBytes(a.size)} | ${a.url.split("/").pop()}`);
  });

  // Generate a simple text-based report (true PDF would need a library)
  downloadFile(lines.join("\n"), `${data.projectName}-report.txt`, "text/plain");
}
