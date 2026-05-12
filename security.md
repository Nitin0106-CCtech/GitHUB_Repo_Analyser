# Security Policy

## Table of Contents

- [Supported Use](#supported-use)
- [Secrets Management](#secrets-management)
- [Tool Safety](#tool-safety)
- [Remote Deployment](#remote-deployment)
- [Reporting Security Issues](#reporting-security-issues)
- [Known Limitations](#known-limitations)

## Supported Use

### Design & Intent

This MCP server is designed as a **local stdio server for read-only GitHub repository analysis**. It does not expose an HTTP endpoint and should not be bound directly to the network without proper security measures.

### Safe Use Cases

- Local development environments
- Integrated with secure MCP hosts
- Private, isolated deployments
- Automated repository audit scripts running on trusted infrastructure

### Unsafe Use Cases

- ❌ Exposing directly on the internet without authentication
- ❌ Binding to publicly accessible network interfaces
- ❌ Sharing tokens with untrusted parties
- ❌ Running on shared/multi-tenant systems without isolation

## Secrets Management

### GitHub Token Storage

Store `GITHUB_TOKEN` securely in one of the following locations:

1. **MCP Host Configuration** (recommended)
   - Configure via your MCP host's secure settings
   - Tokens remain encrypted and isolated

2. **Shell Environment**
   ```bash
   export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```
   - Only in secure, isolated shells
   - Use `unset GITHUB_TOKEN` after use

3. **Secret Manager**
   - Use HashiCorp Vault, AWS Secrets Manager, or similar
   - Programmatically retrieve tokens at runtime

### Token Best Practices

✅ **DO:**
- Use **fine-grained personal access tokens** with minimal required scopes
- Rotate tokens regularly (recommended: every 90 days)
- Store tokens in environment variables or secret managers
- Use separate tokens for different environments (dev/staging/prod)
- Monitor token usage for suspicious activity

❌ **DON'T:**
- Commit `.env` files or tokens to version control
- Use repository-level secrets for shared tokens
- Share tokens via chat, email, or documentation
- Use classic tokens with broad permissions
- Log or print tokens in output

### Creating a Fine-Grained GitHub Token

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **Generate new token**
3. Set the following minimal permissions:
   ```
   Repository Access: Public Repositories (Read-only)
   
   Permissions Needed:
   - Contents: Read
   - Metadata: Read
   ```
4. Expiration: Set to 90 days
5. Copy the token and store it securely
6. ⚠️ **Never share or commit the token**

## Tool Safety

### Current Capabilities

The current tools in this MCP server are **read-only**:
- ✅ Read repository metadata
- ✅ Analyze repository structure
- ✅ Scan security configurations
- ✅ Inspect dependency files
- ✅ Review public repository data

### Rate Limits

- **Unauthenticated Requests**: 60 requests/hour
- **Authenticated Requests**: 5,000 requests/hour

For heavy analysis workloads, use authenticated requests with a personal access token.

### Future Security Considerations

**If write-capable tools are added in the future**, the following safeguards are mandatory:

1. **Explicit User Confirmation**
   - Require interactive approval for any write operations
   - Display detailed change summaries before execution

2. **Scoped Authorization**
   - Use fine-grained tokens with minimal required write permissions
   - Limit scope to specific repositories and operations

3. **Audit Logging**
   - Log all write operations with timestamps and user information
   - Maintain immutable audit trails for compliance

4. **Idempotency Protections**
   - Ensure operations are safe to retry
   - Prevent accidental duplicate modifications

5. **Rate Limiting**
   - Implement aggressive rate limiting for write operations
   - Add cooldown periods between bulk operations

## Remote Deployment

### ⚠️ Important: Not Designed for Network Exposure

This tool is **not suitable for direct internet exposure** in its current form. If you need to deploy this as an HTTP service, implement the following security measures:

### Required Security Controls

**Before exposing over the network, add:**

1. **HTTPS/TLS Encryption**
   ```
   - Use valid SSL/TLS certificates
   - Enforce TLS 1.2 or higher
   - Use secure cipher suites
   ```

2. **Authentication**
   ```
   - Require API keys or OAuth tokens
   - Implement rate limiting per user
   - Use mutual TLS (mTLS) for service-to-service communication
   ```

3. **Origin Validation**
   ```
   - Validate request origins
   - Use CORS headers appropriately
   - Implement request signature verification
   ```

4. **Rate Limiting & DDoS Protection**
   ```
   - Implement per-IP and per-user rate limits
   - Use WAF (Web Application Firewall)
   - Add DDoS protection (e.g., Cloudflare, AWS Shield)
   ```

5. **MCP Authorization**
   ```
   - Validate MCP tokens and token audience
   - Enforce token expiration
   - Implement token rotation policies
   ```

6. **Logging & Monitoring**
   ```
   - Log all requests and responses
   - Monitor for suspicious patterns
   - Set up alerts for security anomalies
   ```

### Recommended Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Client Application              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Load Balancer (with WAF & DDoS)       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   API Gateway (Auth, Rate Limiting)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   MCP Server (TLS, Containerized)       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   GitHub API (via secure proxy)         │
└─────────────────────────────────────────┘
```

## Reporting Security Issues

### Responsible Disclosure

If you discover a security vulnerability, **please do not** open a public issue. Instead:

1. **Email**: Send details to the repository maintainer
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)
3. **Response Timeline**: Expect acknowledgment within 48 hours
4. **Confidentiality**: Vulnerabilities are kept confidential until patched

### Security Update Policy

- Critical vulnerabilities: Patched within 24-48 hours
- High vulnerabilities: Patched within 1 week
- Medium vulnerabilities: Patched within 2 weeks
- Low vulnerabilities: Patched in next release

## Known Limitations

⚠️ **Current Limitations:**

- **No HTTP endpoint security**: Designed for local stdio only
- **Rate-limited by GitHub API**: Subject to GitHub's rate limits
- **Read-only operations**: Cannot make changes to repositories
- **No persistence**: Doesn't store analysis data
- **Token scope limitations**: Can only access what the token permits
- **Dependency on GitHub availability**: Relies on GitHub API uptime

### Mitigation Strategies

1. **Use environment-specific tokens** for different deployments
2. **Implement local caching** to reduce API calls
3. **Monitor rate limit consumption** and adjust usage accordingly
4. **Use fine-grained tokens** to minimize blast radius if compromised
5. **Implement circuit breakers** for GitHub API failures

---

**Last Updated**: May 2026

For questions or security concerns, contact the repository maintainer.
