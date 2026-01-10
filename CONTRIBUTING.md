# Contributing to seeBeads

Thank you for your interest in contributing to seeBeads! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Go 1.21+
- Node.js 18+
- npm

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/seebeads/seebeads.git
   cd seebeads
   ```

2. Install dependencies:
   ```bash
   cd web && npm install && cd ..
   go mod download
   ```

3. Build the project:
   ```bash
   make build
   ```

4. Run in development mode:
   ```bash
   make dev
   ```

## How to Contribute

### Reporting Bugs

- Check existing issues to avoid duplicates
- Use a clear, descriptive title
- Include steps to reproduce the issue
- Describe expected vs actual behavior
- Include your environment details (OS, Go version, Node version)

### Suggesting Features

- Check existing issues/discussions first
- Explain the use case and why it would be valuable
- Be specific about the desired behavior

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code style guidelines below
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Submit a pull request** with a clear description

## Code Style

### Go Code

- Follow standard Go conventions (`gofmt`, `golint`)
- Use meaningful variable and function names
- Add comments for exported functions
- Run `go fmt ./...` before committing

### TypeScript/React Code

- Use TypeScript strict mode
- Follow the existing component patterns
- Use Tailwind CSS for styling
- Run `npm run lint` before committing

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 72 characters
- Reference issues when applicable (e.g., "Fix #123")

Examples:
```
Add keyboard shortcut for board view
Fix SSE reconnection on network drop
Update dependencies to fix security vulnerabilities
```

## Project Structure

```
seebeads/
├── cmd/seebeads/          # CLI entry point
├── internal/
│   ├── beads/             # JSONL parser, graph builder
│   ├── server/            # HTTP server, handlers, SSE
│   └── config/            # Configuration
├── web/                   # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── views/         # Page views
│   │   ├── hooks/         # React hooks
│   │   └── api/           # API client
│   └── ...
└── Makefile
```

## Testing

```bash
# Run Go tests
make test

# Run frontend linting
cd web && npm run lint
```

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
