// Package main is the entry point for the seeBeads CLI
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/spf13/cobra"
	"github.com/seebeads/seebeads/internal/beads"
	"github.com/seebeads/seebeads/internal/config"
	"github.com/seebeads/seebeads/internal/server"
)

var version = "0.1.0"

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

var (
	flagPort       int
	flagHost       string
	flagOpen       bool
	flagNoWatch    bool
	flagAgentMode  bool
)

func init() {
	rootCmd.AddCommand(serveCmd)
	rootCmd.AddCommand(versionCmd)

	serveCmd.Flags().IntVarP(&flagPort, "port", "p", 3456, "Port to listen on")
	serveCmd.Flags().StringVarP(&flagHost, "host", "H", "127.0.0.1", "Host to bind to")
	serveCmd.Flags().BoolVarP(&flagOpen, "open", "o", false, "Open browser automatically")
	serveCmd.Flags().BoolVar(&flagNoWatch, "no-watch", false, "Disable file watching")
	serveCmd.Flags().BoolVar(&flagAgentMode, "agent-mode", false, "Start with Agent Mode enabled")
}

func runServe(cmd *cobra.Command, args []string) error {
	// Find .beads directory
	beadsDir, err := config.FindBeadsDir()
	if err != nil {
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  No Beads project found.")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  Run 'bd init' first to create a Beads project,")
		fmt.Fprintln(os.Stderr, "  or 'cd' to a directory with an existing .beads/ folder.")
		fmt.Fprintln(os.Stderr, "")
		return fmt.Errorf("no .beads directory found")
	}

	// Find beads.jsonl
	jsonlPath, err := config.FindJSONLPath(beadsDir)
	if err != nil {
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "  Beads directory found but no beads.jsonl.")
		fmt.Fprintln(os.Stderr, "  Has 'bd' been initialized?")
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
		JSONLPath:   jsonlPath,
	}

	if err := cfg.Validate(); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	// Parse the JSONL file and build the graph
	log.Printf("Loading beads from %s...", jsonlPath)
	graph, err := beads.BuildGraph(jsonlPath)
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
	fmt.Printf("  │   📁 %s                │\n", truncatePath(jsonlPath, 30))
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

