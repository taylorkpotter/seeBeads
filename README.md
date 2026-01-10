# seeBeads 🔮

A beautiful, real-time dashboard for [Beads](https://github.com/steveyegge/beads) projects.

> **Note:** seeBeads is an unofficial companion tool for [Beads](https://github.com/steveyegge/beads), the git-backed issue tracker created by [Steve Yegge](https://github.com/steveyegge). This project is not affiliated with or endorsed by the Beads project.

![Dashboard Preview](docs/dashboard.png)

## Features

- **📊 Real-time Dashboard** - Live-updating stats, charts, and metrics
- **📋 Issue Browser** - Filter, search, and explore all your beads
- **🎯 Kanban Board** - Drag-free board view organized by status
- **📁 Epic View** - Hierarchical view of epics and their children
- **📈 Timeline** - Chronological activity feed
- **⌨️ Keyboard Shortcuts** - Navigate entirely without a mouse
- **🤖 Agent Mode** - Batched updates for high-churn AI workflows
- **🚀 Zero Config** - Single binary, works out of the box

## Installation

### Homebrew (macOS)

```bash
brew install seebeads/tap/seebeads
```

### Binary Download

Download the latest release for your platform from the [releases page](https://github.com/seebeads/seebeads/releases).

### From Source

```bash
git clone https://github.com/seebeads/seebeads.git
cd seebeads
make build
./bin/seebeads serve --open
```

## Quick Start

```bash
# Navigate to any directory with a .beads/ folder
cd my-project

# Start the dashboard
seebeads serve --open
```

The dashboard will open in your browser at `http://localhost:3456`.

## Usage

```
seebeads - Visual dashboard for Beads projects

USAGE:
    seebeads <command> [options]

COMMANDS:
    serve       Start the web dashboard server
    version     Print version information
    help        Show this help message

SERVE OPTIONS:
    --port, -p <port>     Port to listen on (default: 3456)
    --host, -H <host>     Host to bind to (default: 127.0.0.1)
    --open, -o            Open browser automatically
    --no-watch            Disable file watching (static mode)
    --agent-mode          Start with Agent Mode enabled

EXAMPLES:
    seebeads serve                    # Start on localhost:3456
    seebeads serve --port 8080        # Custom port
    seebeads serve --open             # Auto-open browser
    seebeads serve --host 0.0.0.0     # Allow LAN access
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `f` | Open filter panel |
| `j` / `↓` | Navigate down |
| `k` / `↑` | Navigate up |
| `Enter` | Open selected |
| `Esc` | Close modal |
| `1-5` | Switch views |
| `?` | Show help |

## Views

### Dashboard
Overview of your project's health:
- Status counts (Open, In Progress, Closed, Blocked)
- 7-day velocity metrics
- Status and type distribution charts
- Ready work and recent activity lists

### Issues
Filterable list of all beads:
- Filter by status, type, priority
- Search by ID, title, or description
- Click to view full details

### Epics
Hierarchical view of epics:
- Expand to see child issues
- Progress bars for completion status
- Click children to view details

### Board
Kanban-style board:
- Columns: Blocked, Ready, In Progress, Closed
- Cards show type, priority, assignee
- Updates in real-time

### Timeline
Chronological activity feed:
- Filter by time range (24h, 7d, 30d, all)
- Grouped by date
- Click events to view details

## Agent Mode

When working with AI coding agents that rapidly create/modify beads, enable Agent Mode to batch UI updates:

```bash
seebeads serve --agent-mode
```

Or toggle it in the header. Agent Mode batches updates to 2-3 second intervals, preventing UI jitter during high-churn operations.

## Security Considerations

seeBeads is designed as a **local development tool**. Keep these points in mind:

- **No authentication**: The dashboard has no built-in auth. Don't expose it on public networks.
- **Local binding**: By default, the server binds to `127.0.0.1` (localhost only). Using `--host 0.0.0.0` exposes it to your network.
- **Read-only**: seeBeads only reads from `beads.jsonl`; it never modifies your data.

If you need to share the dashboard (e.g., on a team network), consider putting it behind a reverse proxy with authentication.

## Development

### Prerequisites

- Go 1.21+
- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
cd web && npm install && cd ..
go mod download

# Build
make build

# Development with hot reload
make dev
```

### Project Structure

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

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- **[Beads](https://github.com/steveyegge/beads)** by [Steve Yegge](https://github.com/steveyegge) - The git-backed issue tracker that seeBeads visualizes. This project would not exist without Beads.
- Built with [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), and [Go](https://go.dev)
