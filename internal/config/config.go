// Package config provides configuration for the seeBeads server
package config

import (
	"fmt"
	"os"
	"path/filepath"
)

// Config holds the server configuration
type Config struct {
	Port        int
	Host        string
	OpenBrowser bool
	AgentMode   bool
	NoWatch     bool
	BeadsPath   string // Path to .beads directory
	JSONLPath   string // Path to beads.jsonl (legacy)
	DBPath      string // Path to beads.db (SQLite)
	UseSQLite   bool   // True if using SQLite backend
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		Port:        3456,
		Host:        "127.0.0.1",
		OpenBrowser: false,
		AgentMode:   false,
		NoWatch:     false,
	}
}

// FindBeadsDir searches for .beads directory starting from cwd
func FindBeadsDir() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}

	dir := cwd
	for {
		beadsPath := filepath.Join(dir, ".beads")
		if info, err := os.Stat(beadsPath); err == nil && info.IsDir() {
			return beadsPath, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached root
			break
		}
		dir = parent
	}

	return "", fmt.Errorf("no .beads directory found in %s or any parent directory", cwd)
}

// FindBeadsDataPath returns the path to either beads.db, issues.jsonl, or beads.jsonl
// Returns (path, isSQLite, error)
func FindBeadsDataPath(beadsDir string) (string, bool, error) {
	// Try JSONL first (works with no-db mode and is more reliable)
	// Check issues.jsonl (newer naming convention)
	issuesPath := filepath.Join(beadsDir, "issues.jsonl")
	if info, err := os.Stat(issuesPath); err == nil && info.Size() > 0 {
		return issuesPath, false, nil
	}

	// Check beads.jsonl (older naming convention)
	jsonlPath := filepath.Join(beadsDir, "beads.jsonl")
	if info, err := os.Stat(jsonlPath); err == nil && info.Size() > 0 {
		return jsonlPath, false, nil
	}

	// Fall back to SQLite
	dbPath := filepath.Join(beadsDir, "beads.db")
	if _, err := os.Stat(dbPath); err == nil {
		return dbPath, true, nil
	}

	return "", false, fmt.Errorf("no issues.jsonl, beads.jsonl, or beads.db found in %s - run 'bd init' first", beadsDir)
}

// FindJSONLPath returns the path to beads.jsonl within a .beads directory (legacy)
func FindJSONLPath(beadsDir string) (string, error) {
	jsonlPath := filepath.Join(beadsDir, "beads.jsonl")
	if _, err := os.Stat(jsonlPath); err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("beads.jsonl not found in %s - has 'bd' been initialized?", beadsDir)
		}
		return "", fmt.Errorf("failed to access beads.jsonl: %w", err)
	}
	return jsonlPath, nil
}

// Validate checks that the configuration is valid
func (c *Config) Validate() error {
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Port)
	}

	if c.BeadsPath != "" {
		if _, err := os.Stat(c.BeadsPath); err != nil {
			return fmt.Errorf("beads path not found: %s", c.BeadsPath)
		}
	}

	return nil
}

// Address returns the server address string
func (c *Config) Address() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// URL returns the full server URL
func (c *Config) URL() string {
	return fmt.Sprintf("http://%s", c.Address())
}
