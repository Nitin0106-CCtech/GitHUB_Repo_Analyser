// Thin wrapper around the GitHub REST API.
// Set GITHUB_TOKEN in your environment for higher rate limits (5000 req/hr vs 60).

import axios, { AxiosInstance } from "axios";
import { ToolInputError, ToolRuntimeError } from "./errors";

export const GITHUB_REPO_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}$/;

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 60_000;

function getGitHubTimeoutMs(): number {
  const raw = Number(process.env.GITHUB_API_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(Math.floor(raw), MAX_TIMEOUT_MS);
}

export function createGitHubClient(): AxiosInstance {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": process.env.GITHUB_USER_AGENT ?? "github-repo-analyzer-mcp/1.0.0",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return axios.create({
    baseURL: "https://api.github.com",
    headers,
    timeout: getGitHubTimeoutMs(),
    maxContentLength: 2_000_000,
    maxBodyLength: 2_000_000,
  });
}

// Parse "owner/repo" strings into parts
export function parseRepo(repo: string): { owner: string; name: string } {
  const normalized = repo.trim();
  if (!GITHUB_REPO_PATTERN.test(normalized)) {
    throw new ToolInputError(
      'Invalid repo format. Use "owner/repo", for example "facebook/react".'
    );
  }

  const [owner, name] = normalized.split("/");
  return { owner, name };
}

// Flatten GitHub tree into a simple list of file paths
export interface TreeFile {
  path: string;
  size: number;
  type: "blob" | "tree";
}

export async function fetchRepoTree(
  client: AxiosInstance,
  owner: string,
  repo: string
): Promise<TreeFile[]> {
  // Get default branch first
  const repoRes = await client.get(`/repos/${owner}/${repo}`);
  const branch = repoRes.data.default_branch ?? "main";

  // Recursive tree fetch (single API call)
  const treeRes = await client.get(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );

  if (treeRes.data.truncated) {
    throw new ToolRuntimeError(
      "GitHub returned a truncated repository tree, so this tool cannot provide a complete analysis for that repository."
    );
  }

  if (!Array.isArray(treeRes.data.tree)) {
    throw new ToolRuntimeError("GitHub returned an unexpected repository tree response.");
  }

  return (treeRes.data.tree as unknown[])
    .filter(isGitHubTreeNode)
    .map((n) => ({
      path: n.path,
      size: typeof n.size === "number" ? n.size : 0,
      type: n.type,
    }));
}

// Fetch raw content of a single file (base64-decoded)
export async function fetchFileContent(
  client: AxiosInstance,
  owner: string,
  repo: string,
  filePath: string
): Promise<string | null> {
  try {
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
    const res = await client.get(
      `/repos/${owner}/${repo}/contents/${encodedPath}`
    );

    if (Array.isArray(res.data)) {
      return null;
    }

    if (res.data.encoding === "base64") {
      return Buffer.from(res.data.content, "base64").toString("utf-8");
    }
    return res.data.content ?? null;
  } catch {
    return null;
  }
}

function isGitHubTreeNode(
  value: unknown
): value is { path: string; size?: number; type: "blob" | "tree" } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const node = value as Record<string, unknown>;
  return (
    typeof node.path === "string" &&
    (node.type === "blob" || node.type === "tree") &&
    (typeof node.size === "number" || typeof node.size === "undefined")
  );
}
