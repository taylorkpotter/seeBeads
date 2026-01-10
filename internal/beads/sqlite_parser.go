package beads

import (
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// findIssuesTable looks for the issues/beads table in the database
func findIssuesTable(db *sql.DB) (string, error) {
	// Common table names to try
	tableNames := []string{"issues", "beads", "issue", "bead", "tasks"}

	rows, err := db.Query(`SELECT name FROM sqlite_master WHERE type='table'`)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			tables = append(tables, strings.ToLower(name))
		}
	}

	// Try known table names first
	for _, known := range tableNames {
		for _, table := range tables {
			if table == known {
				return table, nil
			}
		}
	}

	// Return first non-system table if nothing matches
	for _, table := range tables {
		if !strings.HasPrefix(table, "sqlite_") && table != "schema_migrations" {
			return table, nil
		}
	}

	return "", fmt.Errorf("no suitable table found, available: %v", tables)
}

// getTableColumns returns the column names for a table
func getTableColumns(db *sql.DB, tableName string) (map[string]bool, error) {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", tableName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns := make(map[string]bool)
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dfltValue sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err == nil {
			columns[strings.ToLower(name)] = true
		}
	}
	return columns, nil
}

// buildSelectQuery builds a SELECT query based on available columns
func buildSelectQuery(tableName string, columns map[string]bool) string {
	// Map of our expected fields to possible column names
	fieldMappings := map[string][]string{
		"id":          {"id", "issue_id", "bead_id"},
		"title":       {"title", "name", "summary"},
		"description": {"description", "body", "content", "details"},
		"status":      {"status", "state"},
		"issue_type":  {"issue_type", "type", "kind", "category"},
		"priority":    {"priority", "importance", "severity"},
		"assignee":    {"assignee", "assigned_to", "owner"},
		"created_at":  {"created_at", "created", "create_time"},
		"updated_at":  {"updated_at", "updated", "update_time", "modified_at"},
		"closed_at":   {"closed_at", "closed", "resolved_at"},
		"parent_id":   {"parent_id", "parent", "epic_id"},
	}

	var selectParts []string
	for field, possibleNames := range fieldMappings {
		found := false
		for _, colName := range possibleNames {
			if columns[colName] {
				selectParts = append(selectParts, fmt.Sprintf("COALESCE(%s, '') as %s", colName, field))
				found = true
				break
			}
		}
		if !found {
			// Use default value
			switch field {
			case "priority":
				selectParts = append(selectParts, "2 as priority")
			case "status":
				selectParts = append(selectParts, "'open' as status")
			case "issue_type":
				selectParts = append(selectParts, "'task' as issue_type")
			default:
				selectParts = append(selectParts, fmt.Sprintf("'' as %s", field))
			}
		}
	}

	query := fmt.Sprintf("SELECT %s FROM %s", strings.Join(selectParts, ", "), tableName)

	// Add status filter if column exists
	if columns["status"] {
		query += " WHERE status != 'tombstone'"
	}

	return query
}

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

	// Try to find the correct table name
	tableName, err := findIssuesTable(db)
	if err != nil {
		return nil, fmt.Errorf("no issues table found in database: %w", err)
	}

	// Get column names to handle different schemas
	columns, err := getTableColumns(db, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to get table columns: %w", err)
	}

	// Build query based on available columns
	query := buildSelectQuery(tableName, columns)
	rows, err := db.Query(query)
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
