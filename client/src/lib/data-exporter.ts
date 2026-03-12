import type { Agent, Task, Transaction, Organization } from "../../shared/schema";

interface ExportConfig {
  filename: string;
  includeHeaders: boolean;
  delimiter: string;
  dateFormat: "iso" | "local" | "unix";
}

const DEFAULT_CONFIG: ExportConfig = {
  filename: "agentworld-export",
  includeHeaders: true,
  delimiter: ",",
  dateFormat: "iso",
};

function formatDate(date: Date | string | null | undefined, format: ExportConfig["dateFormat"]): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  switch (format) {
    case "iso": return d.toISOString();
    case "local": return d.toLocaleString();
    case "unix": return String(Math.floor(d.getTime() / 1000));
    default: return d.toISOString();
  }
}

function escapeCSVField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(fields: unknown[], delimiter: string): string {
  return fields.map(escapeCSVField).join(delimiter);
}

export function exportAgentsToCSV(agents: Agent[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rows: string[] = [];

  if (cfg.includeHeaders) {
    rows.push(rowToCSV(
      ["id", "name", "role", "status", "performance", "parentId", "walletAddress", "createdAt"],
      cfg.delimiter
    ));
  }

  for (const agent of agents) {
    rows.push(rowToCSV([
      agent.id,
      agent.name,
      agent.role,
      agent.status,
      agent.performance,
      agent.parentId ?? "",
      agent.walletAddress ?? "",
      formatDate(agent.createdAt, cfg.dateFormat),
    ], cfg.delimiter));
  }

  return rows.join("\n");
}

export function exportTasksToCSV(tasks: Task[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rows: string[] = [];

  if (cfg.includeHeaders) {
    rows.push(rowToCSV(
      ["id", "title", "status", "priority", "category", "assigneeId", "dueDate", "createdAt"],
      cfg.delimiter
    ));
  }

  for (const task of tasks) {
    rows.push(rowToCSV([
      task.id,
      task.title,
      task.status,
      task.priority,
      task.category ?? "",
      task.assigneeId ?? "",
      formatDate(task.dueDate, cfg.dateFormat),
      formatDate(task.createdAt, cfg.dateFormat),
    ], cfg.delimiter));
  }

  return rows.join("\n");
}

export function exportTransactionsToCSV(txns: Transaction[], config: Partial<ExportConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rows: string[] = [];

  if (cfg.includeHeaders) {
    rows.push(rowToCSV(
      ["id", "type", "amount", "status", "fromAddress", "toAddress", "signature", "createdAt"],
      cfg.delimiter
    ));
  }

  for (const tx of txns) {
    rows.push(rowToCSV([
      tx.id,
      tx.type,
      tx.amount,
      tx.status,
      tx.fromAddress ?? "",
      tx.toAddress ?? "",
      tx.signature ?? "",
      formatDate(tx.createdAt, cfg.dateFormat),
    ], cfg.delimiter));
  }

  return rows.join("\n");
}

export function exportToJSON(
  data: { agents?: Agent[]; tasks?: Task[]; transactions?: Transaction[]; org?: Organization },
  pretty: boolean = true
): string {
  const output = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    ...data,
  };
  return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSV(csv: string, filename: string): void {
  downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function downloadJSON(json: string, filename: string): void {
  downloadFile(json, `${filename}.json`, "application/json");
}
