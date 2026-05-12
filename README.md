# GitHub Repository Analyzer

A powerful **Model Context Protocol (MCP)** tool for analyzing GitHub repositories with a focus on security, insights, and dependency analysis.

## Overview

GitHub Repository Analyzer is an MCP server that enables deep inspection of any GitHub repository. It provides read-only analysis of repository security, project insights, and library dependencies—making it perfect for security audits, dependency management, and repository intelligence gathering.

## Features

✨ **Security Analysis**
- Identify potential security vulnerabilities
- Analyze security policies and configurations
- Review sensitive file exposure risks

📊 **Repository Insights**
- Gather comprehensive repository metrics
- Analyze commit history and activity patterns
- Track repository growth and trends

📚 **Library & Dependency Analysis**
- Identify project dependencies
- Detect outdated libraries
- Analyze license compliance

🔐 **Safe & Local**
- Runs as a local stdio server (no exposed HTTP endpoints)
- Read-only operations (no write capabilities)
- Secure token handling with environment variables

## Requirements

- Python 3.8 or higher
- GitHub API access (public repositories don't require authentication)
- `GITHUB_TOKEN` (optional, but recommended for higher rate limits)

## Installation

```bash
# Clone the repository
git clone https://github.com/nitin01-hub/GitHub_Repo_analyzer.git
cd GitHub_Repo_analyzer

# Install dependencies
pip install -r requirements.txt
```

## Configuration

### Setting Up GitHub Token

For better rate limits and access to private repositories, configure a GitHub token:

**Option 1: Environment Variable**
```bash
export GITHUB_TOKEN="your_github_token_here"
```

**Option 2: .env File**
```
GITHUB_TOKEN=your_github_token_here
```

**Option 3: MCP Host Configuration**
Configure the token in your MCP host's configuration file.

### Creating a Fine-Grained GitHub Token

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **Generate new token**
3. Set permissions to the minimum required:
   - `public_repo` (for public repositories)
   - `repo` (for private repositories if needed)
4. Copy and store the token securely

## Quick Start

```python
# Example: Analyze a repository
from github_repo_analyzer import RepositoryAnalyzer

analyzer = RepositoryAnalyzer()

# Security Analysis
security_report = analyzer.analyze_security("owner/repo")
print(security_report)

# Repository Insights
insights = analyzer.get_insights("owner/repo")
print(insights)

# Dependency Analysis
dependencies = analyzer.analyze_dependencies("owner/repo")
print(dependencies)
```

## Usage as MCP Server

This tool is designed to work with MCP-compatible applications. Refer to your MCP host documentation for integration details.

## API Tools

### Available Analysis Tools

- **Security Analyzer** - Scans repositories for security concerns
- **Insights Generator** - Provides repository metrics and statistics
- **Dependency Mapper** - Identifies and analyzes project dependencies
- **Library Detector** - Detects and catalogs external libraries

## Rate Limits

- **Unauthenticated requests**: 60 requests per hour
- **Authenticated requests**: 5,000 requests per hour

For optimal performance, always configure a GitHub token.

## Security Considerations

- ⚠️ **Never commit tokens or `.env` files** to version control
- 🔒 **Use fine-grained tokens** with minimal required permissions
- 🚫 **This tool is read-only** by design
- 🌐 **Not suitable for network exposure** without additional security measures

For detailed security guidelines, see [SECURITY.md](./SECURITY.md).

## Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows our style guidelines and includes appropriate tests.

## Support & Issues

- 📝 **Found a bug?** Open an [issue](https://github.com/nitin01-hub/GitHub_Repo_analyzer/issues)
- 💡 **Have a feature request?** Start a [discussion](https://github.com/nitin01-hub/GitHub_Repo_analyzer/discussions)
- 🔐 **Security concern?** See [SECURITY.md](./SECURITY.md) for responsible disclosure

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Author

**nitin01-hub** - [GitHub Profile](https://github.com/nitin01-hub)

---

**Last Updated**: May 2026

For more information and examples, refer to the [documentation](https://github.com/user-attachments/files/27589395/README.pdf) and [SECURITY.md](./SECURITY.md).
