// Package seebeads provides an embeddable seeBeads dashboard for Beads projects.
//
// Basic usage:
//
//	http.Handle("/beads/", seebeads.Handler("", "/beads"))
//
// This auto-discovers the .beads/beads.jsonl file and serves the dashboard
// at the /beads/ path prefix.
package seebeads

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/seebeads/seebeads/internal/beads"
	"github.com/seebeads/seebeads/internal/server"
)

// Handler returns an http.Handler that serves the seeBeads dashboard.
//
// Parameters:
//   - jsonlPath: path to beads.jsonl file. Empty string auto-discovers from cwd.
//   - basePath: URL prefix where the handler is mounted (e.g., "/beads")
//
// Example:
//
//	// Auto-discover .beads/beads.jsonl, mount at /beads/
//	http.Handle("/beads/", seebeads.Handler("", "/beads"))
//
//	// Explicit path, mount at /dashboard/
//	http.Handle("/dashboard/", seebeads.Handler("/app/.beads/beads.jsonl", "/dashboard"))
func Handler(jsonlPath, basePath string) http.Handler {
	// Auto-discover if not specified
	if jsonlPath == "" {
		var err error
		jsonlPath, err = findBeadsJSONL()
		if err != nil {
			return errorHandler(err)
		}
	}

	// Build the graph
	graph, err := beads.BuildGraph(jsonlPath)
	if err != nil {
		return errorHandler(fmt.Errorf("failed to parse beads: %w", err))
	}

	// Create embedded server handler
	handler := server.NewHandler(graph, jsonlPath, basePath)
	return handler
}

// Dashboard provides full control over the seeBeads dashboard lifecycle.
type Dashboard struct {
	handler  http.Handler
	graph    *beads.BeadsGraph
	jsonPath string
	basePath string
	watcher  *beads.Watcher
}

// New creates a new Dashboard with full lifecycle control.
//
// Example:
//
//	dash, err := seebeads.New("/path/to/beads.jsonl", "/beads")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	defer dash.Close()
//	http.Handle("/beads/", dash)
func New(jsonlPath, basePath string) (*Dashboard, error) {
	// Auto-discover if not specified
	if jsonlPath == "" {
		var err error
		jsonlPath, err = findBeadsJSONL()
		if err != nil {
			return nil, err
		}
	}

	graph, err := beads.BuildGraph(jsonlPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse beads: %w", err)
	}

	handler := server.NewHandler(graph, jsonlPath, basePath)

	return &Dashboard{
		handler:  handler,
		graph:    graph,
		jsonPath: jsonlPath,
		basePath: basePath,
	}, nil
}

// ServeHTTP implements http.Handler
func (d *Dashboard) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	d.handler.ServeHTTP(w, r)
}

// Close releases resources (stops file watcher if running)
func (d *Dashboard) Close() error {
	if d.watcher != nil {
		d.watcher.Stop()
	}
	return nil
}

// Stats returns current bead statistics
func (d *Dashboard) Stats() *beads.Stats {
	return d.graph.GetStats()
}

// findBeadsJSONL searches for .beads/beads.jsonl starting from cwd
func findBeadsJSONL() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}

	dir := cwd
	for {
		jsonlPath := filepath.Join(dir, ".beads", "beads.jsonl")
		if _, err := os.Stat(jsonlPath); err == nil {
			return jsonlPath, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return "", fmt.Errorf("no .beads/beads.jsonl found in %s or parent directories (run 'bd init' first)", cwd)
}

// errorHandler returns a handler that displays an error message
func errorHandler(err error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `<!DOCTYPE html>
<html>
<head><title>seeBeads Error</title></head>
<body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
<h1>⚠️ seeBeads Configuration Error</h1>
<pre style="background: #fee; padding: 1rem; border-radius: 4px; overflow-x: auto;">%s</pre>
<h2>Quick Fix</h2>
<ol>
<li>Make sure you have a <code>.beads/</code> directory with a <code>beads.jsonl</code> file</li>
<li>Run <code>bd init</code> to create one, or</li>
<li>Pass an explicit path: <code>seebeads.Handler("/path/to/beads.jsonl", "/beads")</code></li>
</ol>
</body>
</html>`, strings.ReplaceAll(err.Error(), "<", "&lt;"))
	})
}
