package beads

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

// ParseError represents an error parsing a specific line in the JSONL file
type ParseError struct {
	Line    int
	Message string
	Err     error
}

func (e *ParseError) Error() string {
	return fmt.Sprintf("line %d: %s: %v", e.Line, e.Message, e.Err)
}

// ParseResult contains the result of parsing a JSONL file
type ParseResult struct {
	Beads    []*Bead
	Errors   []*ParseError
	FileSize int64
}

// ParseJSONL parses a beads.jsonl file and returns all valid beads
func ParseJSONL(filePath string) (*ParseResult, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return nil, fmt.Errorf("failed to stat file: %w", err)
	}

	result := &ParseResult{
		Beads:    make([]*Bead, 0),
		Errors:   make([]*ParseError, 0),
		FileSize: stat.Size(),
	}

	scanner := bufio.NewScanner(file)
	// Increase buffer size for long lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines
		if line == "" {
			continue
		}

		bead, err := parseLine(line)
		if err != nil {
			result.Errors = append(result.Errors, &ParseError{
				Line:    lineNum,
				Message: "failed to parse bead",
				Err:     err,
			})
			continue
		}

		// Apply defaults
		bead.SetDefaults()

		// Skip tombstones for display
		if bead.IsTombstone() {
			continue
		}

		result.Beads = append(result.Beads, bead)
	}

	if err := scanner.Err(); err != nil {
		return result, fmt.Errorf("error reading file: %w", err)
	}

	return result, nil
}

// ParseJSONLFromOffset parses a JSONL file starting from a specific byte offset
// Used for incremental updates
func ParseJSONLFromOffset(filePath string, offset int64) (*ParseResult, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return nil, fmt.Errorf("failed to stat file: %w", err)
	}

	// Seek to offset
	if offset > 0 {
		_, err = file.Seek(offset, io.SeekStart)
		if err != nil {
			return nil, fmt.Errorf("failed to seek: %w", err)
		}
	}

	result := &ParseResult{
		Beads:    make([]*Bead, 0),
		Errors:   make([]*ParseError, 0),
		FileSize: stat.Size(),
	}

	scanner := bufio.NewScanner(file)
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		if line == "" {
			continue
		}

		bead, err := parseLine(line)
		if err != nil {
			result.Errors = append(result.Errors, &ParseError{
				Line:    lineNum,
				Message: "failed to parse bead",
				Err:     err,
			})
			continue
		}

		bead.SetDefaults()

		if bead.IsTombstone() {
			continue
		}

		result.Beads = append(result.Beads, bead)
	}

	if err := scanner.Err(); err != nil {
		return result, fmt.Errorf("error reading file: %w", err)
	}

	return result, nil
}

func parseLine(line string) (*Bead, error) {
	var bead Bead
	if err := json.Unmarshal([]byte(line), &bead); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	if bead.ID == "" {
		return nil, fmt.Errorf("bead missing required field 'id'")
	}

	if bead.Title == "" {
		return nil, fmt.Errorf("bead missing required field 'title'")
	}

	// Extract parent ID from hierarchical ID pattern
	bead.ParentID = extractParentID(bead.ID)

	// Extract blocker IDs from dependencies
	bead.BlockerIDs = extractBlockerIDs(bead.Dependencies)

	return &bead, nil
}

// extractParentID derives the parent ID from a hierarchical ID
// e.g., "bd-1234.1" -> "bd-1234", "bd-1234.1.2" -> "bd-1234.1"
func extractParentID(id string) string {
	lastDot := strings.LastIndex(id, ".")
	if lastDot == -1 {
		return ""
	}
	return id[:lastDot]
}

// extractBlockerIDs extracts IDs of issues that block this one
func extractBlockerIDs(deps []*Dependency) []string {
	var blockers []string
	for _, dep := range deps {
		if dep.Type.AffectsReady() && dep.DependsOnID != "" {
			blockers = append(blockers, dep.DependsOnID)
		}
	}
	return blockers
}
