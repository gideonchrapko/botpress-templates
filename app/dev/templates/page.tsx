"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TemplateRow = { family: string; name: string; format: string };

export default function DevTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchTemplates() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      } else {
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setImportStatus("Choose a file first.");
      return;
    }
    setImporting(true);
    setImportStatus("Importing…");
    try {
      const text = await file.text();
      const body = JSON.parse(text);
      if (body.id && body.children && !body.nodes && body.name !== undefined && body.width === undefined) {
        setImportStatus("Wrong file. Use figma-import-*.json (from bun run figma:to-import), not figma-raw-*.json");
        setImporting(false);
        return;
      }
      const res = await fetch("/api/import/figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportStatus(`Error: ${data.error ?? res.statusText}`);
        setImporting(false);
        return;
      }
      setImportStatus(`Imported: ${data.templateId ?? data.message ?? "OK"}`);
      setFile(null);
      fetchTemplates();
    } catch (err) {
      setImportStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(family: string) {
    if (!confirm(`Delete template "${family}"?`)) return;
    setDeleting(family);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(family)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Delete failed");
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.family !== family));
    } catch (e) {
      alert("Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h1 style={{ marginBottom: 8 }}>Dev: Templates</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        List, import, and delete templates. You must be signed in.
      </p>

      {/* Import Figma */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Import Figma</h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 12 }}>
          Use <strong>figma-import-*.json</strong> (from <code>bun run figma:to-import</code>).
        </p>
        <form onSubmit={handleImport}>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ marginBottom: 12, display: "block" }}
          />
          <button type="submit" disabled={importing}>
            {importing ? "Importing…" : "Import"}
          </button>
        </form>
        {importStatus && (
          <p style={{ marginTop: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 14 }}>
            {importStatus}
          </p>
        )}
      </section>

      {/* Template list */}
      <section>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Templates</h2>
        {loadingList ? (
          <p style={{ color: "#666" }}>Loading…</p>
        ) : templates.length === 0 ? (
          <p style={{ color: "#666" }}>No templates.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {templates.map((t) => (
              <li
                key={t.family}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span style={{ flex: 1 }}>
                  <Link href={`/${t.family}/create`} style={{ fontWeight: 500 }}>
                    {t.name}
                  </Link>
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 8 }}>
                    {t.family} · {t.format}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(t.family)}
                  disabled={deleting === t.family}
                  style={{ color: "#c00", fontSize: 13 }}
                >
                  {deleting === t.family ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
