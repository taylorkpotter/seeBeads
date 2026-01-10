// Package beads provides data structures and parsing for Beads issues
package beads

import (
	"time"
)

// Status represents the current state of an issue
type Status string

const (
	StatusOpen       Status = "open"
	StatusInProgress Status = "in_progress"
	StatusBlocked    Status = "blocked"
	StatusDeferred   Status = "deferred"
	StatusClosed     Status = "closed"
	StatusTombstone  Status = "tombstone"
	StatusPinned     Status = "pinned"
	StatusHooked     Status = "hooked"
)

// BeadType represents the type of issue
type BeadType string

const (
	TypeTask         BeadType = "task"
	TypeBug          BeadType = "bug"
	TypeFeature      BeadType = "feature"
	TypeEpic         BeadType = "epic"
	TypeChore        BeadType = "chore"
	TypeMessage      BeadType = "message"
	TypeMergeRequest BeadType = "merge-request"
	TypeMolecule     BeadType = "molecule"
	TypeGate         BeadType = "gate"
	TypeEvent        BeadType = "event"
)

// DependencyType represents the type of relationship between issues
type DependencyType string

const (
	DepBlocks            DependencyType = "blocks"
	DepParentChild       DependencyType = "parent-child"
	DepConditionalBlocks DependencyType = "conditional-blocks"
	DepWaitsFor          DependencyType = "waits-for"
	DepRelated           DependencyType = "related"
	DepDiscoveredFrom    DependencyType = "discovered-from"
	DepRepliesTo         DependencyType = "replies-to"
	DepRelatesTo         DependencyType = "relates-to"
	DepDuplicates        DependencyType = "duplicates"
	DepSupersedes        DependencyType = "supersedes"
)

// AffectsReady returns true if this dependency type blocks work
func (d DependencyType) AffectsReady() bool {
	switch d {
	case DepBlocks, DepParentChild, DepConditionalBlocks, DepWaitsFor:
		return true
	}
	return false
}

// Dependency represents a relationship between issues
type Dependency struct {
	IssueID     string         `json:"issue_id"`
	DependsOnID string         `json:"depends_on_id"`
	Type        DependencyType `json:"type"`
	CreatedAt   time.Time      `json:"created_at"`
	CreatedBy   string         `json:"created_by,omitempty"`
	Metadata    string         `json:"metadata,omitempty"`
	ThreadID    string         `json:"thread_id,omitempty"`
}

// Comment represents a comment on an issue
type Comment struct {
	ID        int64     `json:"id"`
	IssueID   string    `json:"issue_id"`
	Author    string    `json:"author"`
	Text      string    `json:"text"`
	CreatedAt time.Time `json:"created_at"`
}

// Bead represents a single issue/task in the Beads system
type Bead struct {
	// Core identification
	ID string `json:"id"`

	// Content
	Title              string `json:"title"`
	Description        string `json:"description,omitempty"`
	Design             string `json:"design,omitempty"`
	AcceptanceCriteria string `json:"acceptance_criteria,omitempty"`
	Notes              string `json:"notes,omitempty"`

	// Status & workflow
	Status      Status   `json:"status,omitempty"`
	Priority    int      `json:"priority"`
	Type        BeadType `json:"issue_type,omitempty"`
	CloseReason string   `json:"close_reason,omitempty"`

	// Assignment
	Assignee         string `json:"assignee,omitempty"`
	EstimatedMinutes *int   `json:"estimated_minutes,omitempty"`

	// Timestamps
	CreatedAt   time.Time  `json:"created_at"`
	CreatedBy   string     `json:"created_by,omitempty"`
	UpdatedAt   time.Time  `json:"updated_at"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`
	DueAt       *time.Time `json:"due_at,omitempty"`
	DeferUntil  *time.Time `json:"defer_until,omitempty"`

	// External integration
	ExternalRef *string `json:"external_ref,omitempty"`

	// Relational data
	Labels       []string      `json:"labels,omitempty"`
	Dependencies []*Dependency `json:"dependencies,omitempty"`
	Comments     []*Comment    `json:"comments,omitempty"`

	// Graph relationships (computed after parsing)
	ParentID   string  // Derived from ID pattern (bd-1234.1 -> bd-1234)
	Parent     *Bead   `json:"-"` // Pointer to parent bead
	Children   []*Bead `json:"-"` // Child beads
	BlockerIDs []string
	Blockers   []*Bead `json:"-"` // Pointers to blocking beads
	BlockedIDs []string
	Blocked    []*Bead `json:"-"` // Pointers to beads we block

	// Soft delete
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
	DeletedBy    string     `json:"deleted_by,omitempty"`
	DeleteReason string     `json:"delete_reason,omitempty"`
}

// SetDefaults applies default values for fields omitted during parsing
func (b *Bead) SetDefaults() {
	if b.Status == "" {
		b.Status = StatusOpen
	}
	if b.Type == "" {
		b.Type = TypeTask
	}
}

// IsReady returns true if the bead is ready for work
func (b *Bead) IsReady() bool {
	if b.Status != StatusOpen {
		return false
	}
	if b.DeferUntil != nil && b.DeferUntil.After(time.Now()) {
		return false
	}
	// Check for blocking dependencies
	for _, blocker := range b.Blockers {
		if blocker.Status != StatusClosed && blocker.Status != StatusTombstone {
			return false
		}
	}
	return true
}

// IsTombstone returns true if the bead has been soft-deleted
func (b *Bead) IsTombstone() bool {
	return b.Status == StatusTombstone
}

// AuditEntry represents a history event (for future timeline support)
type AuditEntry struct {
	Timestamp time.Time `json:"timestamp"`
	EventType string    `json:"event_type"`
	Actor     string    `json:"actor,omitempty"`
	OldValue  string    `json:"old_value,omitempty"`
	NewValue  string    `json:"new_value,omitempty"`
	Comment   string    `json:"comment,omitempty"`
}
