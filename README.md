<p align="center">
  <img src="docs/logo.png" alt="seeBeads" width="300">
</p>

<p align="center">
  <strong>Visual dashboard for AI agent issue tracking</strong>
</p>

<p align="center">
  One command. Dashboard opens. Start tracking.
</p>

---

## Install

```bash
curl -sSL https://raw.githubusercontent.com/taylorkpotter/seeBeads/main/install.sh | sh
```

That's it. The installer will:
1. Install Go (if needed)
2. Install the seeBeads dashboard
3. Install the Beads CLI (`bd`)
4. Open the dashboard in your browser

## For AI Agents

Copy this into your agent's context or system prompt:

```markdown
## Beads Issue Tracking

This project uses Beads for issue tracking. When you encounter bugs, have tasks to complete, or want to track features:

### Creating Issues
bd create "Description of the bug" --type bug
bd create "Task to complete" --type task
bd create "New feature idea" --type feature

### Managing Issues
bd list                          # List all issues
bd status <id> in_progress       # Start working on an issue
bd status <id> closed            # Mark as complete
bd comment <id> "Progress..."    # Add a comment

The seeBeads dashboard at http://localhost:3456 updates in real-time.
```

## Manual Usage

If you already have the tools installed:

```bash
cd your-project
seebeads init --open    # Initialize and open dashboard
```

Or if you already have a `.beads/` folder:

```bash
seebeads serve --open   # Just open the dashboard
```

### Options

```
--port, -p    Port (default: 3456)
--host, -H    Host (default: 127.0.0.1)
--open, -o    Open browser automatically
--agent-mode  Batch updates for AI workflows
```

## What is Beads?

[Beads](https://github.com/steveyegge/beads) is Steve Yegge's git-backed issue tracker designed for AI coding agents. Issues are stored as JSON in your repo, so your agent can create and update them directly.

seeBeads provides a visual dashboard to see all your beads in one place.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Search |
| `j` / `k` | Navigate |
| `Enter` | Open |
| `Esc` | Close |
| `1-5` | Switch views |

## Go Library

If you're building a Go app, you can embed the dashboard:

```go
import "github.com/taylorkpotter/seeBeads"

http.Handle("/beads/", seebeads.Handler("", "/beads"))
```

## Development

```bash
git clone https://github.com/taylorkpotter/seeBeads.git
cd seeBeads
make build
./bin/seebeads serve --open
```

## Security

This is a local development tool. It binds to `127.0.0.1` by default and has no authentication. Don't expose it on public networks.

## License

MIT
