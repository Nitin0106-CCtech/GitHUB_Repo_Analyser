// src/tools/securityCheck.ts
// Tool 5 — basic safety signals: license, suspicious scripts, repo activity.

import { AxiosInstance } from "axios";
import { fetchFileContent, fetchRepoTree, parseRepo } from "../utils/github";

export type SecurityRating = "Safe" | "Caution" | "Risky";

export interface SecurityCheckResult {
  rating: SecurityRating;
  score: number;         // 0 (risky) – 100 (safe)
  findings: string[];    // individual signals, each prefixed ✅ ⚠️ 🚨
  summary: string;
}

// Patterns that look like obfuscated / data-exfiltration scripts
const SUSPICIOUS_PATTERNS = [
  /eval\s*\(\s*(?:atob|Buffer\.from|unescape)\s*\(/,
  /child_process.*exec\s*\(\s*['"`][^'"`]{40,}/,   // long shell strings
  /require\s*\(\s*['"`]https?:\/\//,                // dynamic remote require
  /process\.env\b.*\bsend\b/,                       // env vars being sent out
  /\bcurl\b.+\|\s*(?:bash|sh)\b/,
  /wget.+\|\s*(?:bash|sh)\b/,
];

export async function securityCheck(
  client: AxiosInstance,
  repo: string
): Promise<SecurityCheckResult> {
  const { owner, name } = parseRepo(repo);

  const [repoRes, treeRes] = await Promise.all([
    client.get(`/repos/${owner}/${name}`),
    fetchRepoTree(client, owner, name),
  ]);

  const repoData = repoRes.data;
  const findings: string[] = [];
  let score = 100;

  // ── 1. License ───────────────────────────────────────────────────────────
  if (!repoData.license) {
    findings.push("🚨 No license — all rights reserved by default");
    score -= 25;
  } else {
    findings.push(`✅ License present: ${repoData.license.name}`);
  }

  // ── 2. Stars / activity (proxy for community trust) ─────────────────────
  const stars: number = repoData.stargazers_count ?? 0;
  const pushedAt: string = repoData.pushed_at ?? "";
  const daysSincePush = pushedAt
    ? Math.floor((Date.now() - new Date(pushedAt).getTime()) / 86_400_000)
    : 9999;

  if (stars < 5 && daysSincePush > 365) {
    findings.push(`⚠️ Very low activity: ${stars} stars, last push ${daysSincePush} days ago`);
    score -= 15;
  } else if (daysSincePush > 730) {
    findings.push(`⚠️ No activity in 2+ years (${daysSincePush} days since last push)`);
    score -= 10;
  } else {
    findings.push(`✅ Active repo: ${stars} stars, last push ${daysSincePush} days ago`);
  }

  // ── 3. Suspicious scripts in package.json ────────────────────────────────
  const paths = treeRes.map((n) => n.path.toLowerCase());
  if (paths.includes("package.json")) {
    const raw = await fetchFileContent(client, owner, name, "package.json");
    if (raw) {
      const pkg = parseJsonObject(raw);
      if (!pkg) {
        findings.push("⚠️ package.json is not valid JSON; npm script check skipped");
        score -= 5;
      } else {
        const scripts = isRecord(pkg.scripts) ? pkg.scripts : {};
        const suspicious = Object.entries(scripts).filter(([, v]) =>
          typeof v === "string" && SUSPICIOUS_PATTERNS.some((re) => re.test(v))
        );
        if (suspicious.length > 0) {
          findings.push(
            `🚨 Suspicious npm scripts detected: ${suspicious.map(([k]) => k).join(", ")}`
          );
          score -= 30;
        } else {
          findings.push("✅ npm scripts look clean");
        }
      }
    }
  }

  // ── 4. .env files committed ───────────────────────────────────────────────
  const envFiles = treeRes.filter(
    (n) => n.type === "blob" && /(?:^|\/)\.(env|secret|credentials)/.test(n.path)
  );
  if (envFiles.length > 0) {
    findings.push(
      `🚨 Potential secrets committed: ${envFiles.map((f) => f.path).join(", ")}`
    );
    score -= 20;
  } else {
    findings.push("✅ No obvious secret files committed (.env, .secret)");
  }

  // ── 5. Archived / disabled ────────────────────────────────────────────────
  if (repoData.archived) {
    findings.push("⚠️ Repository is archived (read-only, no longer maintained)");
    score -= 10;
  }

  // ── Rating ────────────────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));
  const rating: SecurityRating =
    score >= 70 ? "Safe" : score >= 40 ? "Caution" : "Risky";

  return {
    rating,
    score,
    findings,
    summary: `${rating} (score ${score}/100). ${findings.length} checks run.`,
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
