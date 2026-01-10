package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// SSEEvent represents an event to be sent to clients
type SSEEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// SSEClient represents a connected SSE client
type SSEClient struct {
	id     string
	events chan SSEEvent
}

// SSEHub manages SSE connections
type SSEHub struct {
	clients    map[string]*SSEClient
	register   chan *SSEClient
	unregister chan *SSEClient
	broadcast  chan SSEEvent
	stop       chan struct{}
	mu         sync.RWMutex
}

// NewSSEHub creates a new SSE hub
func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients:    make(map[string]*SSEClient),
		register:   make(chan *SSEClient),
		unregister: make(chan *SSEClient),
		broadcast:  make(chan SSEEvent, 256),
		stop:       make(chan struct{}),
	}
}

// Run starts the SSE hub event loop
func (h *SSEHub) Run() {
	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-h.stop:
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.id] = client
			h.mu.Unlock()
			log.Printf("SSE client connected: %s (total: %d)", client.id, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.id]; ok {
				delete(h.clients, client.id)
				close(client.events)
			}
			h.mu.Unlock()
			log.Printf("SSE client disconnected: %s (total: %d)", client.id, len(h.clients))

		case event := <-h.broadcast:
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.events <- event:
				default:
					// Client buffer full, skip
				}
			}
			h.mu.RUnlock()

		case <-heartbeat.C:
			event := SSEEvent{
				Type: "heartbeat",
				Data: map[string]interface{}{
					"timestamp": time.Now().Format(time.RFC3339),
				},
			}
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.events <- event:
				default:
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Stop stops the SSE hub
func (h *SSEHub) Stop() {
	close(h.stop)
}

// Broadcast sends an event to all connected clients
func (h *SSEHub) Broadcast(event SSEEvent) {
	select {
	case h.broadcast <- event:
	default:
		log.Printf("SSE broadcast buffer full, dropping event")
	}
}

// GET /api/events - SSE endpoint
func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request) {
	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Create client
	client := &SSEClient{
		id:     fmt.Sprintf("%d", time.Now().UnixNano()),
		events: make(chan SSEEvent, 64),
	}

	// Register client
	s.sse.register <- client

	// Ensure client is unregistered on disconnect
	defer func() {
		s.sse.unregister <- client
	}()

	// Get flusher
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	// Send initial state
	initialEvent := SSEEvent{
		Type: "init",
		Data: map[string]interface{}{
			"stats": s.graph.GetStats(),
		},
	}
	data, _ := json.Marshal(initialEvent)
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", initialEvent.Type, data)
	flusher.Flush()

	// Listen for events
	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-client.events:
			if !ok {
				return
			}
			data, err := json.Marshal(event.Data)
			if err != nil {
				log.Printf("SSE marshal error: %v", err)
				continue
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, data)
			flusher.Flush()
		}
	}
}
