"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, FileText, Link2, Pencil, Trash2 } from "lucide-react";

type TemplateRow = { family: string; name: string; format: string };

type MarketingToolRow = { slug: string; name: string; description: string; author?: string; iframeUrl?: string };

export default function AdminPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [marketingTools, setMarketingTools] = useState<MarketingToolRow[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [toolForm, setToolForm] = useState({ name: "", slug: "", description: "", author: "", iframeUrl: "" });
  const [addingTool, setAddingTool] = useState(false);
  const [addToolError, setAddToolError] = useState("");
  const [deletingTool, setDeletingTool] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ slug: string; name: string; description: string; author: string; iframeUrl: string }>({
    slug: "",
    name: "",
    description: "",
    author: "",
    iframeUrl: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [activeTab, setActiveTab] = useState<"templates" | "marketing">("templates");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash === "templates" || hash === "marketing") {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === "templates" || hash === "marketing") setActiveTab(hash);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleTabChange = (value: string) => {
    const tab = value === "marketing" ? "marketing" : "templates";
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}#${tab}`);
    }
  };

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

  async function fetchMarketingTools() {
    setLoadingTools(true);
    try {
      const res = await fetch("/api/marketing-tools");
      if (res.ok) {
        const data = await res.json();
        setMarketingTools(data);
      } else {
        setMarketingTools([]);
      }
    } catch {
      setMarketingTools([]);
    } finally {
      setLoadingTools(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchMarketingTools();
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
        setImportStatus("Wrong file. Use the converted import file. In terminal run: bun run figma:to-import examples/figma-raw-TQ8HjO6jnzMjvKUnAQNhAN-808-249.json (with FIGMA_ACCESS_TOKEN in .env for SVGs). Then upload the generated figma-import-*.json from the examples folder.");
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

  async function handleAddTool(e: React.FormEvent) {
    e.preventDefault();
    setAddToolError("");
    const name = toolForm.name.trim();
    const slug = toolForm.slug.trim() || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const description = toolForm.description.trim();
    const author = toolForm.author.trim() || undefined;
    const iframeUrl = toolForm.iframeUrl.trim();
    if (!name) {
      setAddToolError("Name is required.");
      return;
    }
    if (!slug) {
      setAddToolError("Slug is required.");
      return;
    }
    if (!description) {
      setAddToolError("Description is required.");
      return;
    }
    if (!iframeUrl) {
      setAddToolError("Iframe URL is required.");
      return;
    }
    setAddingTool(true);
    try {
      const res = await fetch("/api/marketing-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description, author, iframeUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddToolError(data.detail ? `${data.error}: ${data.detail}` : (data.error ?? "Failed to add tool"));
        return;
      }
      setToolForm({ name: "", slug: "", description: "", author: "", iframeUrl: "" });
      setMarketingTools((prev) => [...prev, data]);
    } catch (e) {
      setAddToolError("Request failed");
    } finally {
      setAddingTool(false);
    }
  }

  function startEditing(tool: MarketingToolRow) {
    setEditingSlug(tool.slug);
    setEditForm({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      author: tool.author ?? "",
      iframeUrl: tool.iframeUrl ?? "",
    });
    setEditError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSlug) return;
    setEditError("");
    const name = editForm.name.trim();
    const slug = editForm.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const description = editForm.description.trim();
    const author = editForm.author.trim() || undefined;
    const iframeUrl = editForm.iframeUrl.trim();
    if (!name || !slug || !description || !iframeUrl) {
      setEditError("All fields are required.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/marketing-tools/${encodeURIComponent(editingSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description, author, iframeUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Failed to save");
        return;
      }
      setMarketingTools((prev) => prev.map((t) => (t.slug === editingSlug ? data : t)));
      setEditingSlug(null);
    } catch (e) {
      setEditError("Request failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteTool(slug: string) {
    if (!confirm(`Delete marketing tool "${slug}"?`)) return;
    setDeletingTool(slug);
    try {
      const res = await fetch(`/api/marketing-tools/${encodeURIComponent(slug)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Delete failed");
        return;
      }
      setMarketingTools((prev) => prev.filter((t) => t.slug !== slug));
    } catch (e) {
      alert("Delete failed");
    } finally {
      setDeletingTool(null);
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
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Import Figma templates and manage marketing tools.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2">
            <Link2 className="h-4 w-4" />
            Marketing Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                Import from Figma
              </CardTitle>
              <CardDescription>
                Use <code className="rounded bg-muted px-1 py-0.5 text-xs">figma-import-*.json</code> from{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">bun run figma:to-import</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleImport} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="figma-file">Figma import JSON</Label>
                  <Input
                    id="figma-file"
                    type="file"
                    accept=".json"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="cursor-pointer"
                  />
                </div>
                <Button type="submit" disabled={importing}>
                  {importing ? "Importing…" : "Import"}
                </Button>
              </form>
              {importStatus && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all">{importStatus}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
              <CardDescription>
                Poster and graphic templates. Each has a create page at <code className="rounded bg-muted px-1 py-0.5 text-xs">/[family]/create</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates. Import one from Figma above.</p>
              ) : (
                <ul className="divide-y">
                  {templates.map((t) => (
                    <li
                      key={t.family}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${t.family}/create`}
                          className="font-medium text-primary hover:underline truncate block"
                        >
                          {t.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {t.family} · {t.format}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.family)}
                        disabled={deleting === t.family}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add marketing tool</CardTitle>
              <CardDescription>
                Tools appear on the home Tools tab and get a page at <code className="rounded bg-muted px-1 py-0.5 text-xs">/tools/[slug]</code>.
                Set an iframe URL to embed the tool on that page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTool} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="tool-name">Name (required)</Label>
                  <Input
                    id="tool-name"
                    placeholder="e.g. Tiphaine's URL Creator"
                    value={toolForm.name}
                    onChange={(e) => setToolForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tool-slug">Slug (required)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tool-slug"
                      placeholder="e.g. url-creator"
                      value={toolForm.slug}
                      onChange={(e) => setToolForm((f) => ({ ...f, slug: e.target.value }))}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const slug = toolForm.name
                          .trim()
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, "");
                        setToolForm((f) => ({ ...f, slug }));
                      }}
                    >
                      From name
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tool-desc">Description (required)</Label>
                  <Input
                    id="tool-desc"
                    placeholder="Short description for the card"
                    value={toolForm.description}
                    onChange={(e) => setToolForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tool-author">Author (optional)</Label>
                  <Input
                    id="tool-author"
                    placeholder="e.g. Tiphaine"
                    value={toolForm.author}
                    onChange={(e) => setToolForm((f) => ({ ...f, author: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tool-iframe">Iframe URL (required)</Label>
                  <Input
                    id="tool-iframe"
                    type="url"
                    placeholder="https://…"
                    value={toolForm.iframeUrl}
                    onChange={(e) => setToolForm((f) => ({ ...f, iframeUrl: e.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={addingTool}>
                  {addingTool ? "Adding…" : "Add tool"}
                </Button>
                {addToolError && (
                  <p className="text-sm text-destructive">{addToolError}</p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Marketing tools</CardTitle>
              <CardDescription>
                Tools listed on the home page Tools tab. Click a name to open the tool page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTools ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : marketingTools.length === 0 ? (
                <p className="text-sm text-muted-foreground">No marketing tools. Add one above.</p>
              ) : (
                <ul className="divide-y">
                  {marketingTools.map((t) => (
                    <li key={t.slug} className="py-3 first:pt-0 last:pb-0">
                      {editingSlug === t.slug ? (
                        <form onSubmit={handleSaveEdit} className="space-y-4 max-w-md">
                          <div className="space-y-2">
                            <Label>Name (required)</Label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              placeholder="Tool name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Slug (required)</Label>
                            <div className="flex gap-2">
                              <Input
                                value={editForm.slug}
                                onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                                placeholder="url-creator"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const slug = editForm.name
                                    .trim()
                                    .toLowerCase()
                                    .replace(/\s+/g, "-")
                                    .replace(/[^a-z0-9-]/g, "");
                                  setEditForm((f) => ({ ...f, slug }));
                                }}
                              >
                                From name
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description (required)</Label>
                            <Input
                              value={editForm.description}
                              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                              placeholder="Short description"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Author (optional)</Label>
                            <Input
                              value={editForm.author}
                              onChange={(e) => setEditForm((f) => ({ ...f, author: e.target.value }))}
                              placeholder="e.g. Tiphaine"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Iframe URL (required)</Label>
                            <Input
                              type="url"
                              value={editForm.iframeUrl}
                              onChange={(e) => setEditForm((f) => ({ ...f, iframeUrl: e.target.value }))}
                              placeholder="https://…"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" disabled={savingEdit}>
                              {savingEdit ? "Saving…" : "Save"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => { setEditingSlug(null); setEditError(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                          {editError && <p className="text-sm text-destructive">{editError}</p>}
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/tools/${t.slug}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {t.name}
                            </Link>
                            <span className="text-xs text-muted-foreground ml-2">/tools/{t.slug}</span>
                            {t.description && (
                              <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                            )}
                            {t.author && (
                              <p className="text-xs text-muted-foreground mt-0.5">by {t.author}</p>
                            )}
                            {t.iframeUrl && (
                              <p className="text-xs text-muted-foreground mt-0.5 break-all">iframe: {t.iframeUrl}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(t)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTool(t.slug)}
                              disabled={deletingTool === t.slug}
                              className="text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
