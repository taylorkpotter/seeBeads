import { useState } from 'react'
import { 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  Zap,
  Bot,
  ArrowRight,
} from 'lucide-react'

const AGENT_INSTRUCTIONS = `## Beads Issue Tracking

This project uses Beads for issue tracking. **Use beads instead of internal task lists** - they persist across sessions and are visible in the dashboard at http://localhost:3456

### Listen and Capture

When the user mentions any of these, create a bead immediately:
- Bugs or problems → \`bd create "description" --type bug\`
- Tasks or todos → \`bd create "description" --type task\`
- Ideas or features → \`bd create "description" --type feature\`
- Things to fix later → \`bd create "description" --type task\`

Don't wait - if you hear it, bead it.

### Workflow

1. Before starting work: \`bd list --status open\`
2. Pick a task: \`bd status <id> in_progress\`
3. Do the work
4. Add notes: \`bd comment <id> "what was done"\`
5. Mark complete: \`bd status <id> closed\`

### Commands Reference

bd create "title" --type bug|task|feature
bd list [--status open|in_progress|closed]
bd status <id> open|in_progress|closed
bd comment <id> "message"
bd show <id>`

export default function EmptyState() {
  const [copied, setCopied] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_INSTRUCTIONS)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 animate-enter">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg mb-6">
          <Sparkles size={36} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-industrial-text mb-3">
          Your dashboard is ready
        </h1>
        <p className="text-industrial-text-muted text-lg max-w-md">
          Start tracking bugs, tasks, and features. 
          Your AI agent just needs a little context.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl">
        <div className="bg-industrial-background rounded-2xl shadow-neu-floating overflow-hidden corner-screws">
          {/* Header */}
          <div className="p-6 border-b border-industrial-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow-neu-recessed bg-industrial-muted">
                <Bot size={20} className="text-industrial-text" />
              </div>
              <div>
                <h2 className="font-bold text-industrial-text">Connect Your AI Agent</h2>
                <p className="text-sm text-industrial-text-muted">Copy these instructions into your agent's context</p>
              </div>
            </div>
          </div>

          {/* Copy Section */}
          <div className="p-6">
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleCopy}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${
                  copied
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copied to clipboard!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy Agent Instructions
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full text-left px-4 py-3 rounded-lg text-sm text-industrial-text-muted hover:bg-industrial-muted transition-colors flex items-center justify-between"
            >
              <span>{showInstructions ? 'Hide' : 'Preview'} instructions</span>
              <ArrowRight 
                size={16} 
                className={`transition-transform ${showInstructions ? 'rotate-90' : ''}`} 
              />
            </button>

            {showInstructions && (
              <div className="mt-4 p-4 rounded-lg bg-industrial-muted overflow-auto max-h-80">
                <pre className="text-xs text-industrial-text-muted font-mono whitespace-pre-wrap">
                  {AGENT_INSTRUCTIONS}
                </pre>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="px-6">
            <div className="border-t border-industrial-border" />
          </div>

          {/* Quick Actions */}
          <div className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-industrial-text-muted mb-4">
              Or get started manually
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://github.com/steveyegge/beads"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-industrial-muted hover:shadow-neu-card transition-all group"
              >
                <Zap size={18} className="text-amber-500" />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-industrial-text group-hover:text-violet-600 transition-colors">
                    Install Beads CLI
                  </div>
                  <div className="text-xs text-industrial-text-muted">go install github.com/steveyegge/beads/cmd/bd@latest</div>
                </div>
                <ExternalLink size={14} className="text-industrial-text-muted" />
              </a>
              
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-industrial-muted">
                <div className="w-5 h-5 rounded-full bg-green-500 animate-pulse" />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-industrial-text">
                    Watching for changes
                  </div>
                  <div className="text-xs text-industrial-text-muted">Dashboard updates automatically</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-sm text-industrial-text-muted mt-6">
          Once your agent starts creating beads, they'll appear here in real-time ✨
        </p>
      </div>
    </div>
  )
}
