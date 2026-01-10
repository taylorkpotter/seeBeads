// Package server provides the HTTP server for seeBeads
package server

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/taylorkpotter/seeBeads/internal/beads"
	"github.com/taylorkpotter/seeBeads/internal/config"
)

//go:embed static/*
var staticFiles embed.FS

// Server represents the seeBeads HTTP server
type Server struct {
	config     *config.Config
	graph      *beads.BeadsGraph
	watcher    *beads.Watcher
	router     *mux.Router
	httpServer *http.Server
	sse        *SSEHub
	basePath   string
}

// New creates a new server instance
func New(cfg *config.Config, graph *beads.BeadsGraph) *Server {
	s := &Server{
		config:   cfg,
		graph:    graph,
		router:   mux.NewRouter(),
		sse:      NewSSEHub(),
		basePath: "",
	}

	s.setupRoutes()
	return s
}

// NewHandler creates an http.Handler for embedding seeBeads in another application.
// basePath is the URL prefix where the handler is mounted (e.g., "/beads").
func NewHandler(graph *beads.BeadsGraph, jsonlPath, basePath string) http.Handler {
	// Normalize basePath
	basePath = strings.TrimSuffix(basePath, "/")
	if basePath != "" && !strings.HasPrefix(basePath, "/") {
		basePath = "/" + basePath
	}

	s := &Server{
		config: &config.Config{
			JSONLPath: jsonlPath,
			NoWatch:   false,
		},
		graph:    graph,
		router:   mux.NewRouter(),
		sse:      NewSSEHub(),
		basePath: basePath,
	}

	s.setupEmbeddedRoutes()

	// Start SSE hub
	go s.sse.Run()

	// Start file watcher
	var err error
	s.watcher, err = beads.NewWatcher(beads.WatcherConfig{
		FilePath:  jsonlPath,
		Graph:     graph,
		AgentMode: false,
		OnChange: func() {
			s.sse.Broadcast(SSEEvent{
				Type: "update",
				Data: map[string]interface{}{
					"type":  "stats",
					"stats": graph.GetStats(),
				},
			})
		},
	})
	if err == nil {
		s.watcher.Start()
	}

	// Wrap with CORS - same-origin by default for security
	// When embedded, the dashboard is served from the same origin as the host app
	c := cors.New(cors.Options{
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},
	})

	return c.Handler(s.router)
}

func (s *Server) setupEmbeddedRoutes() {
	// API routes under basePath
	apiPrefix := s.basePath + "/api"
	api := s.router.PathPrefix(apiPrefix).Subrouter()
	api.HandleFunc("/stats", s.handleStats).Methods("GET")
	api.HandleFunc("/beads", s.handleBeads).Methods("GET")
	api.HandleFunc("/beads/{id}", s.handleBead).Methods("GET")
	api.HandleFunc("/events", s.handleSSE).Methods("GET")
	api.HandleFunc("/health", s.handleHealth).Methods("GET")
	api.HandleFunc("/epics", s.handleEpics).Methods("GET")
	api.HandleFunc("/agent-mode", s.handleAgentMode).Methods("POST")

	// Serve static files at basePath
	s.router.PathPrefix(s.basePath).Handler(s.embeddedStaticHandler())
}

func (s *Server) setupRoutes() {
	// API routes
	api := s.router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/stats", s.handleStats).Methods("GET")
	api.HandleFunc("/beads", s.handleBeads).Methods("GET")
	api.HandleFunc("/beads/{id}", s.handleBead).Methods("GET")
	api.HandleFunc("/events", s.handleSSE).Methods("GET")
	api.HandleFunc("/health", s.handleHealth).Methods("GET")
	api.HandleFunc("/epics", s.handleEpics).Methods("GET")
	api.HandleFunc("/agent-mode", s.handleAgentMode).Methods("POST")

	// Serve static files (embedded React app)
	s.router.PathPrefix("/").Handler(s.staticHandler())
}

func (s *Server) staticHandler() http.Handler {
	// Try to use embedded files first
	subFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Printf("Warning: could not load embedded static files: %v", err)
		// Return a handler that serves 404
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "Static files not available", http.StatusNotFound)
		})
	}

	fileServer := http.FileServer(http.FS(subFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// For SPA routing: serve index.html for paths that don't match files
		path := r.URL.Path
		if path == "/" {
			path = "/index.html"
		}

		// Try to open the file
		f, err := subFS.Open(path[1:]) // Remove leading slash
		if err != nil {
			// File not found, serve index.html for SPA routing
			r.URL.Path = "/"
		} else {
			f.Close()
		}

		fileServer.ServeHTTP(w, r)
	})
}

func (s *Server) embeddedStaticHandler() http.Handler {
	subFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Printf("Warning: could not load embedded static files: %v", err)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "Static files not available", http.StatusNotFound)
		})
	}

	fileServer := http.FileServer(http.FS(subFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Strip basePath prefix for file lookup
		path := r.URL.Path
		if s.basePath != "" {
			path = strings.TrimPrefix(path, s.basePath)
		}
		if path == "" || path == "/" {
			path = "/index.html"
		}

		// Try to open the file
		filePath := strings.TrimPrefix(path, "/")
		f, err := subFS.Open(filePath)
		if err != nil {
			// File not found, serve index.html for SPA routing
			path = "/index.html"
		} else {
			f.Close()
		}

		// Rewrite path for file server
		r.URL.Path = path
		fileServer.ServeHTTP(w, r)
	})
}

// Start starts the HTTP server
func (s *Server) Start() error {
	// Set up file watcher
	if !s.config.NoWatch {
		var err error
		s.watcher, err = beads.NewWatcher(beads.WatcherConfig{
			FilePath:  s.config.JSONLPath,
			Graph:     s.graph,
			AgentMode: s.config.AgentMode,
			OnChange: func() {
				// Notify all SSE clients
				s.sse.Broadcast(SSEEvent{
					Type: "update",
					Data: map[string]interface{}{
						"type":  "stats",
						"stats": s.graph.GetStats(),
					},
				})
			},
		})
		if err != nil {
			log.Printf("Warning: file watching disabled: %v", err)
		} else {
			if err := s.watcher.Start(); err != nil {
				log.Printf("Warning: could not start file watcher: %v", err)
			}
		}
	}

	// Set up CORS for development
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3456", "http://127.0.0.1:5173", "http://127.0.0.1:3456"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(s.router)

	s.httpServer = &http.Server{
		Addr:         s.config.Address(),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Try to bind to the port, increment if busy
	var listener net.Listener
	var err error
	for i := 0; i < 10; i++ {
		addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port+i)
		listener, err = net.Listen("tcp", addr)
		if err == nil {
			s.config.Port = s.config.Port + i
			s.httpServer.Addr = addr
			break
		}
	}
	if err != nil {
		return fmt.Errorf("could not bind to any port: %w", err)
	}

	log.Printf("seeBeads server starting on %s", s.config.URL())
	log.Printf("Watching: %s", s.config.JSONLPath)

	// Start SSE heartbeat
	go s.sse.Run()

	return s.httpServer.Serve(listener)
}

// Stop gracefully shuts down the server
func (s *Server) Stop(ctx context.Context) error {
	if s.watcher != nil {
		s.watcher.Stop()
	}
	s.sse.Stop()
	return s.httpServer.Shutdown(ctx)
}

// SetAgentMode toggles agent mode
func (s *Server) SetAgentMode(enabled bool) {
	if s.watcher != nil {
		s.watcher.SetAgentMode(enabled)
	}
}
