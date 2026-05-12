// src/tools/detectDependencies.ts
// Tool 4 — parse package.json / requirements.txt / Gemfile / go.mod / Cargo.toml
//           and highlight major frameworks.

import { AxiosInstance } from "axios";
import { fetchFileContent, fetchRepoTree, parseRepo } from "../utils/github";

export interface DependencyResult {
  ecosystem: string;
  totalDependencies: number;
  dependencies: string[];
  devDependencies: string[];
  majorFrameworks: string[];
  packageManagerFile: string;
  rawSummary: string;
}

// Known "major framework" keywords per ecosystem
const MAJOR_FRAMEWORKS: Record<string, string[]> = {
  npm: [
    "react", "vue", "angular", "next", "nuxt", "svelte", "express", "fastify",
    "nestjs", "@nestjs/core", "koa", "hapi", "graphql", "apollo", "prisma",
    "typeorm", "sequelize", "mongoose", "socket.io", "electron", "jest",
    "vitest", "webpack", "vite", "rollup", "esbuild", "tailwindcss",
  ],
  pip: [
    "django", "flask", "fastapi", "sqlalchemy", "celery", "numpy", "pandas",
    "scipy", "matplotlib", "scikit-learn", "sklearn", "tensorflow", "torch",
    "keras", "transformers", "huggingface", "pytest", "pydantic", "aiohttp",
    "uvicorn", "gunicorn", "starlette",
  ],
  gem: ["rails", "sinatra", "sidekiq", "devise", "pundit", "rspec", "rubocop"],
  cargo: ["tokio", "actix", "rocket", "axum", "serde", "diesel", "sqlx"],
  go: ["gin", "echo", "fiber", "beego", "gorm", "cobra"],
};

export async function detectDependencies(
  client: AxiosInstance,
  repo: string
): Promise<DependencyResult> {
  const { owner, name } = parseRepo(repo);
  const tree = await fetchRepoTree(client, owner, name);
  const paths = tree.map((n) => n.path.toLowerCase());

  // ── Node.js ──────────────────────────────────────────────────────────────
  if (paths.includes("package.json")) {
    const raw = await fetchFileContent(client, owner, name, "package.json");
    if (raw) {
      const pkg = parseJsonObject(raw);
      if (!pkg) {
        return {
          ecosystem: "Node.js (npm/yarn/pnpm)",
          totalDependencies: 0,
          dependencies: [],
          devDependencies: [],
          majorFrameworks: [],
          packageManagerFile: "package.json",
          rawSummary: "package.json was found but could not be parsed as valid JSON.",
        };
      }

      const deps = Object.keys(isRecord(pkg.dependencies) ? pkg.dependencies : {});
      const devDeps = Object.keys(isRecord(pkg.devDependencies) ? pkg.devDependencies : {});
      const all = [...deps, ...devDeps].map((d) => d.toLowerCase());
      const frameworks = MAJOR_FRAMEWORKS.npm.filter((f) => all.includes(f));
      return {
        ecosystem: "Node.js (npm/yarn/pnpm)",
        totalDependencies: deps.length + devDeps.length,
        dependencies: deps,
        devDependencies: devDeps,
        majorFrameworks: frameworks,
        packageManagerFile: "package.json",
        rawSummary: `${deps.length} runtime + ${devDeps.length} dev dependencies. Frameworks: ${frameworks.join(", ") || "none detected"}.`,
      };
    }
  }

  // ── Python ────────────────────────────────────────────────────────────────
  const reqFile = ["requirements.txt", "requirements/base.txt", "requirements/common.txt"]
    .find((f) => paths.includes(f));
  if (reqFile) {
    const raw = await fetchFileContent(client, owner, name, reqFile);
    if (raw) {
      const deps = raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && !l.startsWith("-"))
        .map((l) => l.split(/[>=<!~]/)[0].trim().toLowerCase());
      const frameworks = MAJOR_FRAMEWORKS.pip.filter((f) =>
        deps.some((d) => d.includes(f))
      );
      return {
        ecosystem: "Python (pip)",
        totalDependencies: deps.length,
        dependencies: deps,
        devDependencies: [],
        majorFrameworks: frameworks,
        packageManagerFile: reqFile,
        rawSummary: `${deps.length} dependencies. Frameworks: ${frameworks.join(", ") || "none detected"}.`,
      };
    }
  }

  // ── Ruby ──────────────────────────────────────────────────────────────────
  if (paths.includes("gemfile")) {
    const raw = await fetchFileContent(client, owner, name, "Gemfile");
    if (raw) {
      const deps = [...raw.matchAll(/gem ['"]([^'"]+)['"]/g)].map((m) =>
        m[1].toLowerCase()
      );
      const frameworks = MAJOR_FRAMEWORKS.gem.filter((f) => deps.includes(f));
      return {
        ecosystem: "Ruby (Bundler)",
        totalDependencies: deps.length,
        dependencies: deps,
        devDependencies: [],
        majorFrameworks: frameworks,
        packageManagerFile: "Gemfile",
        rawSummary: `${deps.length} gems. Frameworks: ${frameworks.join(", ") || "none detected"}.`,
      };
    }
  }

  // ── Rust ──────────────────────────────────────────────────────────────────
  if (paths.includes("cargo.toml")) {
    const raw = await fetchFileContent(client, owner, name, "Cargo.toml");
    if (raw) {
      const deps = [...raw.matchAll(/^(\w[\w-]+)\s*=/gm)].map((m) =>
        m[1].toLowerCase()
      );
      const frameworks = MAJOR_FRAMEWORKS.cargo.filter((f) => deps.includes(f));
      return {
        ecosystem: "Rust (Cargo)",
        totalDependencies: deps.length,
        dependencies: deps,
        devDependencies: [],
        majorFrameworks: frameworks,
        packageManagerFile: "Cargo.toml",
        rawSummary: `${deps.length} crates. Frameworks: ${frameworks.join(", ") || "none detected"}.`,
      };
    }
  }

  // ── Go ────────────────────────────────────────────────────────────────────
  if (paths.includes("go.mod")) {
    const raw = await fetchFileContent(client, owner, name, "go.mod");
    if (raw) {
      const deps = [...raw.matchAll(/^\s+([^\s]+)\s+v[\d.]+/gm)].map((m) =>
        m[1].toLowerCase()
      );
      const frameworks = MAJOR_FRAMEWORKS.go.filter((f) =>
        deps.some((d) => d.includes(f))
      );
      return {
        ecosystem: "Go (modules)",
        totalDependencies: deps.length,
        dependencies: deps,
        devDependencies: [],
        majorFrameworks: frameworks,
        packageManagerFile: "go.mod",
        rawSummary: `${deps.length} modules. Frameworks: ${frameworks.join(", ") || "none detected"}.`,
      };
    }
  }

  return {
    ecosystem: "Unknown",
    totalDependencies: 0,
    dependencies: [],
    devDependencies: [],
    majorFrameworks: [],
    packageManagerFile: "none",
    rawSummary: "No recognized dependency file found (package.json, requirements.txt, Gemfile, Cargo.toml, go.mod).",
  };
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
