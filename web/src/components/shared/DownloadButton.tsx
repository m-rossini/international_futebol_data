"use client";

import { Download } from "lucide-react";

interface DownloadButtonProps {
  /** Array of records to export */
  data: Record<string, unknown>[];
  /** Filename without extension */
  filename: string;
  /** Optional label override */
  label?: string;
  /** Format */
  format?: "csv" | "json";
}

/**
 * Download ranking data as CSV or JSON.
 * Renders a small button that triggers a browser download.
 */
export function DownloadButton({
  data,
  filename,
  label = "Download",
  format = "csv",
}: DownloadButtonProps) {
  if (!data || data.length === 0) return null;

  const handleDownload = () => {
    let blob: Blob;
    let ext: string;

    if (format === "json") {
      const json = JSON.stringify(data, null, 2);
      blob = new Blob([json], { type: "application/json" });
      ext = "json";
    } else {
      // Build CSV from first object's keys
      const headers = Object.keys(data[0]);
      const rows = data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            const str = String(val);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      ext = "csv";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white transition-colors"
      title={`Download as ${format.toUpperCase()}`}
    >
      <Download size={14} />
      {label}
    </button>
  );
}
