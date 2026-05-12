// src/tools/getRepoInsights.ts
// Tool 2 — language, complexity heuristic, presence of tests/docs/configs.

import { AxiosInstance } from "axios";
import { fetchRepoTree, parseRepo } from "../utils/github";

export interface RepoInsights {
  mainLanguage: string;
  languageBreakdown: Record<string, number>;  // percentage per language
  complexity: "Low" | "Medium" | "High";
  complexityReason: string;
  hasTests: boolean;
  hasDocs: boolean;
  hasCI: boolean;
  hasDockerfile: boolean;
  summary: string;
}

// Map extensions → language labels
const EXT_LANG: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript",
  js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  cs: "C#",
  cpp: "C++", cc: "C++", cxx: "C++",
  c: "C",
  rs: "Rust",
  php: "PHP",
  swift: "Swift",
  r: "R",
  scala: "Scala",
  ex: "Elixir", exs: "Elixir",
};

export async function getRepoInsights(
  client: AxiosInstance,
  repo: string
): Promise<RepoInsights> {
  const { owner, name } = parseRepo(repo);
  const tree = await fetchRepoTree(client, owner, name);

  const files = tree.filter((n) => n.type === "blob");
  const paths = files.map((f) => f.path.toLowerCase());
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  // Language distribution
  const langCount: Record<string, number> = {};
  for (const f of files) {
    const dot = f.path.lastIndexOf(".");
    if (dot === -1) continue;
    const ext = f.path.slice(dot + 1).toLowerCase();
    const lang = EXT_LANG[ext];
    if (lang) langCount[lang] = (langCount[lang] ?? 0) + 1;
  }

  const totalLangFiles = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
  const langPct: Record<string, number> = {};
  for (const [l, c] of Object.entries(langCount)) {
    langPct[l] = Math.round((c / totalLangFiles) * 100);
  }

  const mainLanguage =
    Object.entries(langCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

  // Complexity heuristic: file count + total size
  let complexity: "Low" | "Medium" | "High";
  let complexityReason: string;
  if (files.length > 300 || totalSize > 5_000_000) {
    complexity = "High";
    complexityReason = `${files.length} files, ${Math.round(totalSize / 1024)} KB total`;
  } else if (files.length > 80 || totalSize > 500_000) {
    complexity = "Medium";
    complexityReason = `${files.length} files, ${Math.round(totalSize / 1024)} KB total`;
  } else {
    complexity = "Low";
    complexityReason = `${files.length} files, ${Math.round(totalSize / 1024)} KB total`;
  }

  const hasTests = paths.some(
    (p) => p.includes("test") || p.includes("spec") || p.includes("__tests__")
  );
  const hasDocs = paths.some(
    (p) =>
      p.includes("readme") ||
      p.startsWith("docs/") ||
      p.includes("/docs/") ||
      p.endsWith(".md")
  );
  const hasCI = paths.some(
    (p) =>
      p.includes(".github/workflows") ||
      p.includes(".travis.yml") ||
      p.includes("jenkinsfile") ||
      p.includes(".circleci")
  );
  const hasDockerfile = paths.some(
    (p) => p.endsWith("dockerfile") || p === "docker-compose.yml"
  );

  const summary =
    `${mainLanguage} project with ${complexity.toLowerCase()} complexity. ` +
    `${hasTests ? "Has" : "No"} tests, ` +
    `${hasDocs ? "has" : "no"} documentation, ` +
    `${hasCI ? "has" : "no"} CI pipeline, ` +
    `${hasDockerfile ? "Dockerized." : "not Dockerized."}`;

  return {
    mainLanguage,
    languageBreakdown: langPct,
    complexity,
    complexityReason,
    hasTests,
    hasDocs,
    hasCI,
    hasDockerfile,
    summary,
  };
}
