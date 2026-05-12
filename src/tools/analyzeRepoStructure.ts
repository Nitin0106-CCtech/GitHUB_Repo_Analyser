// src/tools/analyzeRepoStructure.ts
// Tool 1 — file-type distribution, total file count, key directories.

import { AxiosInstance } from "axios";
import { fetchRepoTree, parseRepo } from "../utils/github";

export interface RepoStructureResult {
  totalFiles: number;
  totalDirectories: number;
  fileTypeDistribution: Record<string, number>;
  keyDirectories: string[];
  largestFiles: Array<{ path: string; sizeKb: number }>;
}

export async function analyzeRepoStructure(
  client: AxiosInstance,
  repo: string
): Promise<RepoStructureResult> {
  const { owner, name } = parseRepo(repo);
  const tree = await fetchRepoTree(client, owner, name);

  const files = tree.filter((n) => n.type === "blob");
  const dirs = tree.filter((n) => n.type === "tree");

  // Extension → count
  const extCount: Record<string, number> = {};
  for (const f of files) {
    const dot = f.path.lastIndexOf(".");
    const ext = dot !== -1 ? f.path.slice(dot + 1).toLowerCase() : "no-ext";
    extCount[ext] = (extCount[ext] ?? 0) + 1;
  }

  // Key directories = top-level dirs only
  const topDirs = [
    ...new Set(
      dirs
        .map((d) => d.path.split("/")[0])
        .filter(Boolean)
    ),
  ].slice(0, 15);

  // Largest 5 files
  const largest = [...files]
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((f) => ({ path: f.path, sizeKb: Math.round(f.size / 1024 * 10) / 10 }));

  return {
    totalFiles: files.length,
    totalDirectories: dirs.length,
    fileTypeDistribution: extCount,
    keyDirectories: topDirs,
    largestFiles: largest,
  };
}
