// src/tools/getLicenseDetails.ts
// Tool 3 — detect license, classify as permissive/restrictive, usage implications.

import { AxiosInstance } from "axios";
import { parseRepo } from "../utils/github";

export interface LicenseDetails {
  found: boolean;
  licenseName: string;
  spdxId: string | null;
  type: "Permissive" | "Copyleft" | "Proprietary" | "Unknown";
  canUseCommercially: boolean;
  mustShareSource: boolean;
  mustAttributeAuthor: boolean;
  implications: string;
}

// Simple classification table
const LICENSE_META: Record<string, Omit<LicenseDetails, "found" | "licenseName" | "spdxId">> = {
  MIT: {
    type: "Permissive",
    canUseCommercially: true,
    mustShareSource: false,
    mustAttributeAuthor: true,
    implications: "Very permissive. Use freely in commercial or proprietary products. Just keep the copyright notice.",
  },
  "Apache-2.0": {
    type: "Permissive",
    canUseCommercially: true,
    mustShareSource: false,
    mustAttributeAuthor: true,
    implications: "Permissive with patent protection. Good for commercial use. Requires NOTICE file preservation.",
  },
  "BSD-2-Clause": {
    type: "Permissive",
    canUseCommercially: true,
    mustShareSource: false,
    mustAttributeAuthor: true,
    implications: "Similar to MIT. Keep the copyright notice.",
  },
  "BSD-3-Clause": {
    type: "Permissive",
    canUseCommercially: true,
    mustShareSource: false,
    mustAttributeAuthor: true,
    implications: "Like BSD-2-Clause but also prohibits using the project name for endorsement.",
  },
  "GPL-2.0": {
    type: "Copyleft",
    canUseCommercially: true,
    mustShareSource: true,
    mustAttributeAuthor: true,
    implications: "Strong copyleft. Any distributed derivative must also be GPL-2.0. Source must be available.",
  },
  "GPL-3.0": {
    type: "Copyleft",
    canUseCommercially: true,
    mustShareSource: true,
    mustAttributeAuthor: true,
    implications: "Strong copyleft with patent protection. Derivatives must remain GPL-3.0.",
  },
  "LGPL-2.1": {
    type: "Copyleft",
    canUseCommercially: true,
    mustShareSource: false,
    mustAttributeAuthor: true,
    implications: "Weak copyleft. You can link from proprietary code but modifications to the library itself must be shared.",
  },
  "AGPL-3.0": {
    type: "Copyleft",
    canUseCommercially: true,
    mustShareSource: true,
    mustAttributeAuthor: true,
    implications: "Strongest copyleft. Even SaaS/network use triggers share-alike. Avoid in closed-source products.",
  },
  "MPL-2.0": {
    type: "Copyleft",
    canUseCommercially: true,
    mustShareSource: false,
    mustAttributeAuthor: true,
    implications: "File-level copyleft. Modified files must stay MPL-2.0 but you can combine with proprietary code.",
  },
  ISC: {
    type: "Permissive",
    canUseCommercially: true,
    mustShareSource: false,
    mustAttributeAuthor: true,
    implications: "Functionally identical to MIT. Very permissive.",
  },
  "CC0-1.0": {
    type: "Permissive",
    canUseCommercially: true,
    mustShareSource: false,
    mustAttributeAuthor: false,
    implications: "Public domain dedication. No restrictions whatsoever.",
  },
};

export async function getLicenseDetails(
  client: AxiosInstance,
  repo: string
): Promise<LicenseDetails> {
  const { owner, name } = parseRepo(repo);

  try {
    const res = await client.get(`/repos/${owner}/${name}/license`);
    const spdxId: string | null = res.data.license?.spdx_id ?? null;
    const licenseName: string = res.data.license?.name ?? "Unknown License";

    const meta = spdxId ? LICENSE_META[spdxId] : undefined;

    if (meta) {
      return { found: true, licenseName, spdxId, ...meta };
    }

    // License exists but not in our table
    return {
      found: true,
      licenseName,
      spdxId,
      type: "Unknown",
      canUseCommercially: false,
      mustShareSource: false,
      mustAttributeAuthor: true,
      implications: "License detected but not in classification table. Review the full text before use.",
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return {
        found: false,
        licenseName: "None",
        spdxId: null,
        type: "Unknown",
        canUseCommercially: false,
        mustShareSource: false,
        mustAttributeAuthor: false,
        implications: "No license found. All rights reserved by default. Do not use in production without explicit permission.",
      };
    }
    throw err;
  }
}
