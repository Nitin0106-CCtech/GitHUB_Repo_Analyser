import axios from "axios";

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

export class ToolRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolRuntimeError";
  }
}

export function getSafeToolErrorMessage(error: unknown): string {
  if (error instanceof ToolInputError || error instanceof ToolRuntimeError) {
    return error.message;
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "GitHub API request timed out. Try again in a moment or use a smaller repository.";
    }

    const status = error.response?.status;
    const message = getGitHubApiMessage(error.response?.data);

    if (status === 401) {
      return "GitHub rejected the configured token. Check GITHUB_TOKEN and try again.";
    }

    if (status === 403) {
      if (message.toLowerCase().includes("rate limit")) {
        return "GitHub API rate limit exceeded. Configure GITHUB_TOKEN or retry after the limit resets.";
      }
      return "GitHub denied this request. Check repository access permissions and token scopes.";
    }

    if (status === 404) {
      return "Repository not found or not accessible with the configured GitHub token.";
    }

    if (status === 422) {
      return "GitHub could not process this repository request. Check the repository name and default branch.";
    }

    if (status && status >= 500) {
      return "GitHub API is temporarily unavailable. Try again later.";
    }

    return "GitHub API request failed. Check the repository name, token, and network access.";
  }

  return "Unexpected error while running this tool. Check the MCP server logs for details.";
}

export function logToolError(toolName: string, error: unknown): void {
  const payload: Record<string, unknown> = {
    level: "error",
    tool: toolName,
    message: error instanceof Error ? error.message : String(error),
  };

  if (axios.isAxiosError(error)) {
    payload.status = error.response?.status;
    payload.code = error.code;
    payload.url = error.config?.url;
  }

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    payload.stack = error.stack;
  }

  process.stderr.write(`${JSON.stringify(payload)}\n`);
}

function getGitHubApiMessage(data: unknown): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }

  return "";
}
