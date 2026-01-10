package beads

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "modernc.org/sqlite"
)

// ParseSQLite reads beads from a SQLite database (beads.db)
func ParseSQLite(dbPath string) (*ParseResult, error) {
	stat, err := os.Stat(dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat database: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath+"?mode=ro")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	result := &ParseResult{
		Beads:    make([]*Bead, 0),
		Errors:   make([]*ParseError, 0),
		FileSize: stat.Size(),
	}

	// Query issues from the database
	// The schema may vary - try common column names
	rows, err := db.Query(`
		SELECT 
			id,
			COALESCE(title, '') as title,
			COALESCE(description, '') as description,
			COALESCE(status, 'open') as status,
			COALESCE(issue_type, 'task') as issue_type,
			COALESCE(priority, 2) as priority,
			COALESCE(assignee, '') as assignee,
			COALESCE(created_at, datetime('now')) as created_at,
			COALESCE(updated_at, datetime('now')) as updated_at,
			closed_at,
			COALESCE(parent_id, '') as parent_id
		FROM issues
		WHERE status != 'tombstone'
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query issues: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id          string
			title       string
			description string
			status      string
			issueType   string
			priority    int
			assignee    string
			createdAt   string
			updatedAt   string
			closedAt    sql.NullString
			parentID    string
		)

		err := rows.Scan(&id, &title, &description, &status, &issueType, &priority, &assignee, &createdAt, &updatedAt, &closedAt, &parentID)
		if err != nil {
			result.Errors = append(result.Errors, &ParseError{
				Message: "failed to scan row",
				Err:     err,
			})
			continue
		}

		bead := &Bead{
			ID:          id,
			Title:       title,
			Description: description,
			Status:      Status(status),
			Type:        BeadType(issueType),
			Priority:    priority,
			Assignee:    assignee,
			ParentID:    parentID,
		}

		// Parse timestamps
		if t, err := parseTime(createdAt); err == nil {
			bead.CreatedAt = t
		}
		if t, err := parseTime(updatedAt); err == nil {
			bead.UpdatedAt = t
		}
		if closedAt.Valid {
			if t, err := parseTime(closedAt.String); err == nil {
				bead.ClosedAt = &t
			}
		}

		bead.SetDefaults()
		result.Beads = append(result.Beads, bead)
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("error iterating rows: %w", err)
	}

	// Try to load labels from a separate table if it exists
	loadLabels(db, result.Beads)

	return result, nil
}

// parseTime tries multiple time formats
func parseTime(s string) (time.Time, error) {
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05Z",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, s); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse time: %s", s)
}

// loadLabels tries to load labels from a labels or issue_labels table
func loadLabels(db *sql.DB, beads []*Bead) {
	// Create a map for quick lookup
	beadMap := make(map[string]*Bead)
	for _, b := range beads {
		beadMap[b.ID] = b
	}

	// Try to query labels - ignore errors if table doesn't exist
	rows, err := db.Query(`
		SELECT issue_id, label 
		FROM issue_labels
	`)
	if err != nil {
		// Table might not exist, try alternative
		rows, err = db.Query(`
			SELECT issue_id, name 
			FROM labels
		`)
		if err != nil {
			return // No labels table, that's fine
		}
	}
	defer rows.Close()

	for rows.Next() {
		var issueID, label string
		if err := rows.Scan(&issueID, &label); err == nil {
			if bead, ok := beadMap[issueID]; ok {
				bead.Labels = append(bead.Labels, label)
			}
		}
	}
}

// BuildGraphFromSQLite builds a graph from a SQLite database
func BuildGraphFromSQLite(dbPath string) (*BeadsGraph, error) {
	result, err := ParseSQLite(dbPath)
	if err != nil {
		return nil, err
	}

	graph := NewGraph()
	graph.FilePath = dbPath
	graph.FileSize = result.FileSize
	graph.LastUpdated = time.Now()

	// Add all beads to the map
	for _, bead := range result.Beads {
		graph.Beads[bead.ID] = bead
	}

	// Resolve parent/child relationships
	for _, bead := range graph.Beads {
		if bead.ParentID != "" {
			if parent, ok := graph.Beads[bead.ParentID]; ok {
				bead.Parent = parent
				parent.Children = append(parent.Children, bead)
			}
		} else {
			graph.RootBeads = append(graph.RootBeads, bead)
		}
	}

	// Resolve blocker/blocked relationships
	for _, bead := range graph.Beads {
		for _, blockerID := range bead.BlockerIDs {
			if blocker, ok := graph.Beads[blockerID]; ok {
				bead.Blockers = append(bead.Blockers, blocker)
				blocker.Blocked = append(blocker.Blocked, bead)
				blocker.BlockedIDs = append(blocker.BlockedIDs, bead.ID)
			}
		}
	}

	// Build indices
	graph.rebuildIndices()

	return graph, nil
}
