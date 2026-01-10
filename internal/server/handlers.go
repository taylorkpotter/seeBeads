package server

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/seebeads/seebeads/internal/beads"
)

// JSON response helper
func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Error response helper
func errorResponse(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]string{"error": message})
}

// GET /api/stats
func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	stats := s.graph.GetStats()
	jsonResponse(w, http.StatusOK, stats)
}

// GET /api/beads
func (s *Server) handleBeads(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	filter := &beads.Filter{}

	// Parse status filter
	if statusStr := query.Get("status"); statusStr != "" {
		statuses := strings.Split(statusStr, ",")
		for _, s := range statuses {
			filter.Status = append(filter.Status, beads.Status(s))
		}
	}

	// Parse type filter
	if typeStr := query.Get("type"); typeStr != "" {
		types := strings.Split(typeStr, ",")
		for _, t := range types {
			filter.Type = append(filter.Type, beads.BeadType(t))
		}
	}

	// Parse priority filter
	if priorityStr := query.Get("priority"); priorityStr != "" {
		priorities := strings.Split(priorityStr, ",")
		for _, p := range priorities {
			// Handle both "p0" and "0" formats
			p = strings.TrimPrefix(strings.ToLower(p), "p")
			if pInt, err := strconv.Atoi(p); err == nil {
				filter.Priority = append(filter.Priority, pInt)
			}
		}
	}

	// Parse labels filter
	if labelsStr := query.Get("labels"); labelsStr != "" {
		filter.Labels = strings.Split(labelsStr, ",")
	}

	// Parse search filter
	filter.Search = query.Get("search")

	// Parse ready filter
	if readyStr := query.Get("ready"); readyStr == "true" {
		filter.Ready = true
	}

	// Parse pagination
	if limitStr := query.Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	}
	if offsetStr := query.Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	// Default limit
	if filter.Limit == 0 {
		filter.Limit = 100
	}

	results := s.graph.GetBeads(filter)

	// Get total count without pagination for hasMore
	allFilter := *filter
	allFilter.Limit = 0
	allFilter.Offset = 0
	total := len(s.graph.GetBeads(&allFilter))

	response := map[string]interface{}{
		"beads":   results,
		"total":   total,
		"hasMore": filter.Offset+len(results) < total,
	}

	jsonResponse(w, http.StatusOK, response)
}

// GET /api/beads/{id}
func (s *Server) handleBead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	bead := s.graph.GetBead(id)
	if bead == nil {
		errorResponse(w, http.StatusNotFound, "Bead not found")
		return
	}

	// Build response with related beads
	response := map[string]interface{}{
		"bead": bead,
	}

	// Include children
	if len(bead.Children) > 0 {
		children := make([]*beads.Bead, len(bead.Children))
		copy(children, bead.Children)
		response["children"] = children
	}

	// Include blockers
	if len(bead.Blockers) > 0 {
		blockers := make([]*beads.Bead, len(bead.Blockers))
		copy(blockers, bead.Blockers)
		response["blockers"] = blockers
	}

	// Include blocked (beads this one blocks)
	if len(bead.Blocked) > 0 {
		blocked := make([]*beads.Bead, len(bead.Blocked))
		copy(blocked, bead.Blocked)
		response["blocked"] = blocked
	}

	// Include parent
	if bead.Parent != nil {
		response["parent"] = bead.Parent
	}

	jsonResponse(w, http.StatusOK, response)
}

// GET /api/health
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	// Return basename only to avoid leaking absolute filesystem paths
	beadsFile := filepath.Base(s.config.JSONLPath)
	response := map[string]interface{}{
		"status":      "ok",
		"beadsFile":   beadsFile,
		"lastUpdated": s.graph.LastUpdated,
		"totalBeads":  len(s.graph.Beads),
	}
	jsonResponse(w, http.StatusOK, response)
}

// GET /api/epics
func (s *Server) handleEpics(w http.ResponseWriter, r *http.Request) {
	epics := s.graph.GetEpics()
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"epics": epics,
	})
}

// POST /api/agent-mode
func (s *Server) handleAgentMode(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.SetAgentMode(body.Enabled)

	jsonResponse(w, http.StatusOK, map[string]bool{
		"agentMode": body.Enabled,
	})
}
