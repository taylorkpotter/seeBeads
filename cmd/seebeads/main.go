// Package main is the entry point for the seeBeads CLI
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/spf13/cobra"
	"github.com/taylorkpotter/seeBeads/internal/beads"
	"github.com/taylorkpotter/seeBeads/internal/config"
	"github.com/taylorkpotter/seeBeads/internal/server"
)

// Version is set at build time via ldflags: -X main.version=v0.1.4
var version = "0.1.5"

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "seebeads",
	Short: "Visual dashboard for Beads projects",
	Long: `seeBeads is a local web-based dashboard for visualizing projects
that use Beads - Steve Yegge's git-backed issue tracker designed
for coding agents.

Start the dashboard with:
  seebeads serve --open`,
}

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the web dashboard server",
	Long:  `Start the seeBeads web dashboard server to visualize your Beads project.`,
	RunE:  runServe,
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("seeBeads v%s\n", version)
	},
}

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize a new Beads project and optionally open dashboard",
	Long: `Initialize a new Beads project in the current directory.
Creates a .beads/ folder with an empty beads.jsonl file.

With --open, immediately starts the dashboard server and opens your browser.`,
	RunE: runInit,
}

var (
	flagPort       int
	flagHost       string
	flagOpen       bool
	flagNoWatch    bool
	flagAgentMode  bool
	flagInitPath   string
)

func init() {
	rootCmd.AddCommand(serveCmd)
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(initCmd)

	serveCmd.Flags().IntVarP(&flagPort, "port", "p", 3456, "Port to listen on")
	serveCmd.Flags().StringVarP(&flagHost, "host", "H", "127.0.0.1", "Host to bind to")
	serveCmd.Flags().BoolVarP(&flagOpen, "open", "o", false, "Open browser automatically")
	serveCmd.Flags().BoolVar(&flagNoWatch, "no-watch", false, "Disable file watching")
	serveCmd.Flags().BoolVar(&flagAgentMode, "agent-mode", false, "Start with Agent Mode enabled")

	initCmd.Flags().BoolVarP(&flagOpen, "open", "o", false, "Open dashboard after initialization")
	initCmd.Flags().StringVarP(&flagInitPath, "path", "p", "", "Directory to initialize (defaults to current directory)")
}

func runServe(cmd *cobra.Command, args []string) error {
	// Find .beads directory
	beadsDir, err := config.FindBeadsDir()
	if err != nil {
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  No Beads project found.")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  Run 'seebeads init' or 'bd init' first,")
		fmt.Fprintln(os.Stderr, "  or 'cd' to a directory with an existing .beads/ folder.")
		fmt.Fprintln(os.Stderr, "")
		return fmt.Errorf("no .beads directory found")
	}

	// Find beads data file (SQLite or JSONL)
	dataPath, useSQLite, err := config.FindBeadsDataPath(beadsDir)
	if err != nil {
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  Beads directory found but no data file.")
		fmt.Fprintln(os.Stderr, "  Run 'bd init' to initialize Beads.")
		fmt.Fprintln(os.Stderr, "")
		return err
	}

	// Build configuration
	cfg := &config.Config{
		Port:        flagPort,
		Host:        flagHost,
		OpenBrowser: flagOpen,
		AgentMode:   flagAgentMode,
		NoWatch:     flagNoWatch,
		BeadsPath:   beadsDir,
		UseSQLite:   useSQLite,
	}
	if useSQLite {
		cfg.DBPath = dataPath
	} else {
		cfg.JSONLPath = dataPath
	}

	if err := cfg.Validate(); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	// Build the graph from SQLite or JSONL
	var graph *beads.BeadsGraph
	if useSQLite {
		log.Printf("Loading beads from %s (SQLite)...", dataPath)
		graph, err = beads.BuildGraphFromSQLite(dataPath)
	} else {
		log.Printf("Loading beads from %s (JSONL)...", dataPath)
		graph, err = beads.BuildGraph(dataPath)
	}
	if err != nil {
		return fmt.Errorf("failed to build graph: %w", err)
	}
	log.Printf("Loaded %d beads", len(graph.Beads))

	// Create and start server
	srv := server.New(cfg, graph)

	// Handle graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in background
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- srv.Start()
	}()

	// Give server a moment to start
	time.Sleep(100 * time.Millisecond)

	// Print startup message with clickable URL
	url := cfg.URL()
	fmt.Println("")
	fmt.Println("  ╭─────────────────────────────────────────────╮")
	fmt.Println("  │                                             │")
	fmt.Printf("  │   🔮 seeBeads Dashboard                     │\n")
	fmt.Printf("  │   ➜  Local: \033[36m%s\033[0m           │\n", url)
	fmt.Println("  │                                             │")
	fmt.Printf("  │   📁 %s                │\n", truncatePath(dataPath, 30))
	fmt.Printf("  │   📊 %d beads loaded                        │\n", len(graph.Beads))
	if flagAgentMode {
		fmt.Println("  │   🤖 Agent Mode: enabled                    │")
	}
	fmt.Println("  │                                             │")
	fmt.Println("  │   Press Ctrl+C to stop                      │")
	fmt.Println("  │                                             │")
	fmt.Println("  ╰─────────────────────────────────────────────╯")
	fmt.Println("")

	// Open browser if requested
	if flagOpen {
		openBrowser(url)
	}

	// Wait for shutdown signal or server error
	select {
	case <-stop:
		log.Println("Shutting down...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return srv.Stop(ctx)
	case err := <-serverErr:
		return err
	}
}

func openBrowser(url string) {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		log.Printf("Don't know how to open browser on %s", runtime.GOOS)
		return
	}

	if err := cmd.Start(); err != nil {
		log.Printf("Failed to open browser: %v", err)
	}
}

func truncatePath(path string, maxLen int) string {
	if len(path) <= maxLen {
		return path + strings.Repeat(" ", maxLen-len(path))
	}
	return "..." + path[len(path)-maxLen+3:]
}

func runInit(cmd *cobra.Command, args []string) error {
	// Determine target directory
	targetDir := flagInitPath
	if targetDir == "" {
		var err error
		targetDir, err = os.Getwd()
		if err != nil {
			return fmt.Errorf("failed to get current directory: %w", err)
		}
	}

	// Create .beads directory
	beadsDir := filepath.Join(targetDir, ".beads")
	if err := os.MkdirAll(beadsDir, 0755); err != nil {
		return fmt.Errorf("failed to create .beads directory: %w", err)
	}

	// Create empty beads.jsonl if it doesn't exist
	jsonlPath := filepath.Join(beadsDir, "beads.jsonl")
	if _, err := os.Stat(jsonlPath); os.IsNotExist(err) {
		file, err := os.Create(jsonlPath)
		if err != nil {
			return fmt.Errorf("failed to create beads.jsonl: %w", err)
		}
		file.Close()
		fmt.Printf("  %s Created %s\n", "✓", jsonlPath)
	} else {
		fmt.Printf("  %s Found existing %s\n", "→", jsonlPath)
	}

	fmt.Println("")
	fmt.Println("  ╭─────────────────────────────────────────────╮")
	fmt.Println("  │                                             │")
	fmt.Printf("  │   🔮 Beads project initialized!             │\n")
	fmt.Println("  │                                             │")
	fmt.Println("  ╰─────────────────────────────────────────────╯")
	fmt.Println("")

	// If --open flag, start the server
	if flagOpen {
		// Change to target directory so serve can find .beads
		if err := os.Chdir(targetDir); err != nil {
			return fmt.Errorf("failed to change to target directory: %w", err)
		}
		
		// Set default flags for serve
		flagPort = 3456
		flagHost = "127.0.0.1"
		flagNoWatch = false
		flagAgentMode = false
		flagOpen = true
		
		return runServe(cmd, args)
	}

	// Show next steps
	fmt.Println("  Next steps:")
	fmt.Println("")
	fmt.Printf("    \033[36mseebeads serve --open\033[0m   Start the dashboard\n")
	fmt.Println("")
	
	return nil
}

