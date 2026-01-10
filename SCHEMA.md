# Beads JSONL Schema Documentation

> This document describes the schema used in `.beads/beads.jsonl` files, based on analysis of the [Beads](https://github.com/steveyegge/beads) source code.

## Overview

Beads stores issues as JSON Lines (JSONL) format in `.beads/beads.jsonl`. Each line is a complete JSON object representing an issue (called a "bead"). The system also uses SQLite for indexed queries, but JSONL is the authoritative source for git-based synchronization.

## Issue Structure

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., "bd-1234" or "bd-1234.1" for child issues) |
| `title` | string | Yes | Issue title (max 500 chars) |
| `description` | string | No | Full description (Markdown) |
| `status` | string | No | Current status (defaults to "open") |
| `priority` | int | No | Priority level 0-4 (P0=critical, P4=lowest, default=2) |
| `issue_type` | string | No | Type of issue (defaults to "task") |
| `assignee` | string | No | Assigned user/agent |
| `created_at` | datetime | Yes | ISO 8601 timestamp |
| `updated_at` | datetime | Yes | ISO 8601 timestamp |
| `closed_at` | datetime | No | When issue was closed |
| `close_reason` | string | No | Reason for closing |

### Status Values

| Status | Description |
|--------|-------------|
| `open` | Ready for work (default) |
| `in_progress` | Currently being worked on |
| `blocked` | Waiting on dependencies |
| `deferred` | Deliberately on ice |
| `closed` | Completed |
| `tombstone` | Soft-deleted |
| `pinned` | Persistent context marker |
| `hooked` | Attached to an agent's hook |

### Issue Types

| Type | Description |
|------|-------------|
| `task` | Default work item |
| `bug` | Bug report |
| `feature` | Feature request |
| `epic` | Container for related work |
| `chore` | Maintenance work |
| `message` | Inter-agent communication |
| `merge-request` | Merge queue entry |
| `molecule` | Template hierarchy |
| `gate` | Async coordination primitive |
| `event` | Operational state change |

### Additional Content Fields

| Field | Type | Description |
|-------|------|-------------|
| `design` | string | Design documentation |
| `acceptance_criteria` | string | Completion criteria |
| `notes` | string | Additional notes |
| `created_by` | string | Creator identifier |

### Time-Based Fields

| Field | Type | Description |
|-------|------|-------------|
| `due_at` | datetime | Due date |
| `defer_until` | datetime | Hidden from `bd ready` until this time |
| `estimated_minutes` | int | Time estimate |

### External Integration

| Field | Type | Description |
|-------|------|-------------|
| `external_ref` | string | External reference (e.g., "gh-9", "jira-ABC") |

## Relational Data

### Labels

Labels are stored as an array of strings:
```json
"labels": ["frontend", "urgent", "v2.0"]
```

### Dependencies

Dependencies represent relationships between issues:
```json
"dependencies": [
  {
    "issue_id": "bd-1234",
    "depends_on_id": "bd-1233",
    "type": "blocks",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

#### Dependency Types

| Type | Description | Affects Ready? |
|------|-------------|----------------|
| `blocks` | Target blocks this issue | Yes |
| `parent-child` | Hierarchical relationship | Yes |
| `conditional-blocks` | Runs only if target fails | Yes |
| `waits-for` | Fanout gate waiting | Yes |
| `related` | Loose association | No |
| `discovered-from` | Origin tracking | No |
| `replies-to` | Conversation threading | No |
| `duplicates` | Deduplication | No |
| `supersedes` | Version chain | No |

### Comments

```json
"comments": [
  {
    "id": 1,
    "issue_id": "bd-1234",
    "author": "agent",
    "text": "Working on this now",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

## Hierarchical IDs

Child issues use dot notation:
- `bd-1234` - Parent/root issue
- `bd-1234.1` - First child
- `bd-1234.2` - Second child
- `bd-1234.1.1` - Nested child (grandchild)

The parent-child relationship is also tracked via dependencies with type `parent-child`.

## Computed States

### Ready Work

An issue is "ready" for work when:
1. Status is `open`
2. No blocking dependencies (`blocks`, `parent-child`, `conditional-blocks`, `waits-for`)
3. Not deferred (no `defer_until` in future)

### Blocked State

An issue is blocked when it has unresolved blocking dependencies.

## Example JSONL Entry

```json
{"id":"bd-kzda","title":"Add user authentication","description":"Implement OAuth2 flow","status":"open","priority":1,"issue_type":"feature","assignee":"","labels":["backend","security"],"dependencies":[],"created_at":"2025-01-09T12:00:00Z","updated_at":"2025-01-09T12:00:00Z"}
```

## Notes for seeBeads Implementation

1. **Parsing Strategy**: Parse JSONL line by line, building an in-memory graph
2. **Graph Construction**: 
   - Build ID→Issue map first
   - Resolve parent-child from ID patterns (bd-1234.1 → bd-1234)
   - Resolve dependency pointers
3. **Incremental Updates**: Track file position for incremental parsing
4. **Ready Calculation**: Filter by status=open AND no blocking deps
5. **Default Values**: Apply defaults for omitted fields (status=open, priority=2, type=task)
