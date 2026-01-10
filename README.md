<p align="center">
  <img src="docs/logo.png" alt="seeBeads" width="300">
</p>

A web dashboard for visualizing [Beads](https://github.com/steveyegge/beads) projects. Beads is a git-backed issue tracker by [Steve Yegge](https://github.com/steveyegge).

This is an unofficial companion tool - not affiliated with the Beads project.

## What it does

- Reads your `.beads/beads.jsonl` file
- Displays issues in a web UI with filtering and search
- Updates in real-time when the file changes
- Provides dashboard, list, board, epic, and timeline views

## Install

```bash
# From source
git clone https://github.com/taylorkpotter/seeBeads.git
cd seeBeads
make build

# Run
./bin/seebeads serve --open
```

## Usage

```bash
cd your-beads-project
seebeads serve --open
```

Opens at `http://localhost:3456`

### Options

```
--port, -p    Port (default: 3456)
--host, -H    Host (default: 127.0.0.1)
--open, -o    Open browser automatically
--agent-mode  Batch updates for AI workflows
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` | Search |
| `j` / `k` | Navigate |
| `Enter` | Open |
| `Esc` | Close |
| `1-5` | Switch views |

## Embedding in your app

If you're building a Go application that uses Beads, you can embed seeBeads directly:

```go
import "github.com/taylorkpotter/seeBeads"

http.Handle("/beads/", seebeads.Handler("", "/beads"))
```

See [AGENT_INSTALL.md](AGENT_INSTALL.md) for integration instructions.

## Agent Mode

When AI agents are rapidly creating/modifying beads, enable Agent Mode to batch UI updates and reduce jitter:

```bash
seebeads serve --agent-mode
```

## Security

This is a local development tool with no authentication. Don't expose it on public networks.

- Binds to localhost by default
- Read-only (never modifies your data)

## Development

```bash
# Setup
cd web && npm install && cd ..
go mod download

# Build
make build

# Dev with hot reload
make dev
```

## License

MIT

## Acknowledgments

Built on top of [Beads](https://github.com/steveyegge/beads) by Steve Yegge.
