"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "./loading-spinner";
import { getAuthHeaders } from "@/lib/auth-client";

type RepositoryStatus = "READY" | "FAILED";

type RepositoryFile = {
  id: string;
  relativePath: string;
  sizeBytes: string;
  checksumSha256: string;
  mimeType?: string | null;
  createdAt: string;
};

type CodeRepository = {
  id: string;
  name: string;
  description?: string | null;
  status: RepositoryStatus;
  fileCount: number;
  totalBytes: string;
  files?: RepositoryFile[];
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

type FileContent = {
  repositoryId: string;
  relativePath: string;
  sizeBytes: string;
  checksumSha256: string;
  mimeType?: string | null;
  encoding: "utf8" | "base64";
  content: string;
};

type DirectoryFile = File & {
  webkitRelativePath?: string;
};

type TreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children: TreeNode[];
  file?: RepositoryFile;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const folderInputAttributes = { webkitdirectory: "", directory: "" } as Record<string, string>;

function formatBytes(value: string | number) {
  const bytes = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** unitIndex;

  return `${amount.toFixed(amount >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getDirectoryFilePath(file: DirectoryFile) {
  return file.webkitRelativePath || file.name;
}

function getDefaultRepositoryName(files: DirectoryFile[]) {
  const firstPath = files[0] ? getDirectoryFilePath(files[0]) : "";
  const firstSegment = firstPath.split(/[\\/]/).filter(Boolean)[0];

  return firstSegment || "codebase";
}

function collectDirectories(files: RepositoryFile[]) {
  const directories = new Set<string>();

  for (const file of files) {
    const parts = file.relativePath.split("/");

    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }

  return directories;
}

function buildFileTree(files: RepositoryFile[]) {
  const root: TreeNode = {
    name: "",
    path: "",
    type: "folder",
    children: []
  };

  for (const file of files) {
    const parts = file.relativePath.split("/");
    let current = root;

    parts.forEach((part, index) => {
      const nodePath = parts.slice(0, index + 1).join("/");
      const type = index === parts.length - 1 ? "file" : "folder";
      let node = current.children.find((child) => child.name === part && child.type === type);

      if (!node) {
        node = {
          name: part,
          path: nodePath,
          type,
          children: []
        };
        current.children.push(node);
      }

      if (type === "file") {
        node.file = file;
      }

      current = node;
    });
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "folder" ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(root.children);
  return root.children;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

async function getResponseErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    details?: {
      error?: string;
    };
  } | null;

  if (body?.details?.error) {
    return `${body.message ?? "Request failed"}: ${body.details.error}`;
  }

  return body?.message ?? "Request failed";
}

export function CodebaseBrowser() {
  const [repositories, setRepositories] = useState<CodeRepository[]>([]);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [selectedRepository, setSelectedRepository] = useState<CodeRepository | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set());
  const [folderFiles, setFolderFiles] = useState<DirectoryFile[]>([]);
  const [repositoryName, setRepositoryName] = useState("");
  const [repositoryDescription, setRepositoryDescription] = useState("");
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);
  const [isLoadingRepository, setIsLoadingRepository] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const files = selectedRepository?.files ?? [];
  const tree = useMemo(() => buildFileTree(files), [files]);
  const selectedFile = files.find((file) => file.relativePath === selectedPath);
  const lineCount = fileContent?.encoding === "utf8" ? fileContent.content.split(/\r\n|\n|\r/).length : 0;

  const loadRepositories = async () => {
    setIsLoadingRepositories(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/repositories`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error("Unable to load repositories");
      }

      const data = (await response.json()) as CodeRepository[];
      setRepositories(data);

      if (!selectedRepositoryId && data[0]) {
        setSelectedRepositoryId(data[0].id);
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsLoadingRepositories(false);
    }
  };

  const loadRepository = async (id: string) => {
    setIsLoadingRepository(true);
    setFileContent(null);
    setSelectedPath("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/repositories/${id}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error("Unable to load repository");
      }

      const data = (await response.json()) as CodeRepository;
      const repositoryFiles = data.files ?? [];
      const firstFile = repositoryFiles[0]?.relativePath ?? "";

      setSelectedRepository(data);
      setExpandedDirectories(collectDirectories(repositoryFiles));
      setSelectedPath(firstFile);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      setSelectedRepository(null);
    } finally {
      setIsLoadingRepository(false);
    }
  };

  const loadFileContent = async (repositoryId: string, relativePath: string) => {
    setIsLoadingFile(true);

    try {
      const params = new URLSearchParams({ path: relativePath });
      const response = await fetch(`${apiBaseUrl}/api/repositories/${repositoryId}/files/content?${params}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error("Unable to load file content");
      }

      setFileContent((await response.json()) as FileContent);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      setFileContent(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  useEffect(() => {
    void loadRepositories();
  }, []);

  useEffect(() => {
    if (selectedRepositoryId) {
      void loadRepository(selectedRepositoryId);
    }
  }, [selectedRepositoryId]);

  useEffect(() => {
    if (selectedRepositoryId && selectedPath) {
      void loadFileContent(selectedRepositoryId, selectedPath);
    }
  }, [selectedRepositoryId, selectedPath]);

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []) as DirectoryFile[];
    setFolderFiles(nextFiles);

    if (nextFiles.length > 0 && !repositoryName.trim()) {
      setRepositoryName(getDefaultRepositoryName(nextFiles));
    }
  };

  const uploadRepository = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (folderFiles.length === 0 || !repositoryName.trim()) {
      setStatusMessage("Choose a folder and repository name.");
      return;
    }

    setIsUploading(true);
    setStatusMessage("");

    try {
      const formData = new FormData();
      formData.append("name", repositoryName.trim());

      if (repositoryDescription.trim()) {
        formData.append("description", repositoryDescription.trim());
      }

      for (const file of folderFiles) {
        formData.append("files", file, getDirectoryFilePath(file));
      }

      const response = await fetch(`${apiBaseUrl}/api/repositories/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const repository = (await response.json()) as CodeRepository;

      setRepositories((current) => [repository, ...current.filter((item) => item.id !== repository.id)]);
      setSelectedRepositoryId(repository.id);
      setSelectedRepository(repository);
      setRepositoryName("");
      setRepositoryDescription("");
      setFolderFiles([]);
      setStatusMessage(`Uploaded ${repository.fileCount} files.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      await loadRepositories();
    } finally {
      setIsUploading(false);
    }
  };

  const toggleDirectory = (path: string) => {
    setExpandedDirectories((current) => {
      const next = new Set(current);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const expanded = expandedDirectories.has(node.path);
    const active = node.path === selectedPath;

    return (
      <div key={node.path}>
        <button
          className={`tree-row ${active ? "tree-row-active" : ""}`}
          onClick={() => {
            if (node.type === "folder") {
              toggleDirectory(node.path);
              return;
            }

            setSelectedPath(node.path);
          }}
          style={{ paddingLeft: 12 + depth * 16 }}
          type="button"
        >
          <span className="tree-marker">{node.type === "folder" ? (expanded ? "v" : ">") : ""}</span>
          <span className={`tree-kind tree-kind-${node.type}`}>{node.type === "folder" ? "DIR" : "FILE"}</span>
          <span className="tree-name">{node.name}</span>
          {node.type === "file" && active && isLoadingFile ? <LoadingSpinner /> : null}
          {node.file ? <span className="tree-size">{formatBytes(node.file.sizeBytes)}</span> : null}
        </button>
        {node.type === "folder" && expanded ? node.children.map((child) => renderTreeNode(child, depth + 1)) : null}
      </div>
    );
  };

  return (
    <main className="codebase-shell">
      <header className="codebase-header">
        <div>
          <p className="eyebrow">Codebase</p>
          <h1>Repository browser</h1>
        </div>
      </header>

      <section className="codebase-metrics" aria-label="Repository metrics">
        <article className="metric-card metric-info">
          <p>Repositories</p>
          <strong>{repositories.length}</strong>
        </article>
        <article className="metric-card metric-success">
          <p>Selected files</p>
          <strong>{selectedRepository?.fileCount ?? 0}</strong>
        </article>
        <article className="metric-card">
          <p>Total size</p>
          <strong>{formatBytes(selectedRepository?.totalBytes ?? 0)}</strong>
        </article>
      </section>

      <section className="codebase-grid">
        <aside className="panel codebase-sidebar">
          <form className="repo-upload-form" onSubmit={(event) => void uploadRepository(event)}>
            <div className="panel-heading">
              <p className="eyebrow">Upload</p>
              <h2>New repository</h2>
            </div>
            <label>
              <span>Name</span>
              <input
                onChange={(event) => setRepositoryName(event.target.value)}
                placeholder="checkout-service"
                type="text"
                value={repositoryName}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                onChange={(event) => setRepositoryDescription(event.target.value)}
                placeholder="Production snapshot"
                rows={3}
                value={repositoryDescription}
              />
            </label>
            <input
              {...folderInputAttributes}
              className="folder-input"
              id="repo-folder"
              multiple
              onChange={handleFolderChange}
              type="file"
            />
            <label className="folder-picker" htmlFor="repo-folder">
              Choose folder
            </label>
            <div className="upload-summary">
              <span>{folderFiles.length} files</span>
              <span>{formatBytes(folderFiles.reduce((sum, file) => sum + file.size, 0))}</span>
            </div>
            <button className="primary-action" disabled={isUploading} type="submit">
              {isUploading ? <LoadingSpinner /> : null}
              {isUploading ? "Uploading" : "Upload"}
            </button>
          </form>

          <div className="repo-list-block">
            <div className="row-heading">
              <div className="panel-heading">
                <p className="eyebrow">Repositories</p>
                <h2>Library</h2>
              </div>
              <button className="secondary-action compact-action" disabled={isLoadingRepositories} onClick={() => void loadRepositories()} type="button">
                {isLoadingRepositories ? <LoadingSpinner /> : null}
                {isLoadingRepositories ? "Refreshing" : "Refresh"}
              </button>
            </div>
            <div className="repo-list">
              {repositories.map((repository) => (
                <button
                  className={`repo-list-item ${repository.id === selectedRepositoryId ? "repo-list-item-active" : ""}`}
                  key={repository.id}
                  onClick={() => setSelectedRepositoryId(repository.id)}
                  type="button"
                >
                  {isLoadingRepository && repository.id === selectedRepositoryId ? <LoadingSpinner /> : null}
                  <span className={`repo-status-${repository.status.toLowerCase()}`}>{repository.status}</span>
                  <strong>{repository.name}</strong>
                  <small>
                    {repository.fileCount} files - {formatDate(repository.createdAt)}
                  </small>
                </button>
              ))}
              {repositories.length === 0 ? <p className="muted-text">No repositories found.</p> : null}
            </div>
          </div>
        </aside>

        <section className="panel repository-panel">
          <div className="repository-toolbar">
            <div>
              <p className="eyebrow">{selectedRepository?.status ?? "Repository"}</p>
              <h2>{selectedRepository?.name ?? "No repository selected"}</h2>
            </div>
            <div className="repository-toolbar-meta">
              <span>{selectedRepository ? `${selectedRepository.fileCount} files` : "0 files"}</span>
              <span>{selectedRepository ? formatBytes(selectedRepository.totalBytes) : "0 B"}</span>
            </div>
          </div>

          {statusMessage ? <p className="repo-status-message">{statusMessage}</p> : null}

          <div className="github-browser">
            <aside className="file-tree">
              <div className="file-tree-heading">
                <strong>Files</strong>
                <span>{isLoadingRepository ? "Loading" : `${files.length}`}</span>
              </div>
              <div className="tree-list">{tree.map((node) => renderTreeNode(node))}</div>
            </aside>

            <article className="code-viewer">
              <div className="code-viewer-header">
                <div>
                  <strong>{selectedPath || "Select a file"}</strong>
                  {selectedFile ? (
                    <span>
                      {formatBytes(selectedFile.sizeBytes)} - {selectedFile.checksumSha256.slice(0, 12)}
                    </span>
                  ) : null}
                </div>
                <span>{lineCount ? `${lineCount} lines` : fileContent?.encoding === "base64" ? "Binary" : ""}</span>
              </div>

              {isLoadingFile ? <div className="code-empty">Loading file</div> : null}

              {!isLoadingFile && fileContent?.encoding === "base64" ? (
                <div className="code-empty">Binary preview is not available.</div>
              ) : null}

              {!isLoadingFile && fileContent?.encoding === "utf8" ? (
                <pre className="code-lines">
                  {fileContent.content.split(/\r\n|\n|\r/).map((line, index) => (
                    <span className="code-row" key={`${fileContent.relativePath}-${index}`}>
                      <span className="line-number">{index + 1}</span>
                      <code>{line || " "}</code>
                    </span>
                  ))}
                </pre>
              ) : null}

              {!isLoadingFile && !fileContent ? <div className="code-empty">No file loaded.</div> : null}
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
