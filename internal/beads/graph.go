package beads

import (
	"sort"
	"strings"
	"sync"
	"time"
)

// BeadsGraph represents the in-memory graph of all beads
type BeadsGraph struct {
	mu sync.RWMutex

	// Primary storage
	Beads     map[string]*Bead // ID -> Bead lookup
	RootBeads []*Bead          // Top-level beads (no parent)

	// Computed indices (rebuild on data change)
	ByStatus   map[Status][]*Bead
	ByType     map[BeadType][]*Bead
	ByPriority map[int][]*Bead
	ByLabel    map[string][]*Bead

	// Metadata
	LastUpdated time.Time
	FileSize    int64
	FilePath    string
}

// NewGraph creates a new empty BeadsGraph
func NewGraph() *BeadsGraph {
	return &BeadsGraph{
		Beads:      make(map[string]*Bead),
		RootBeads:  make([]*Bead, 0),
		ByStatus:   make(map[Status][]*Bead),
		ByType:     make(map[BeadType][]*Bead),
		ByPriority: make(map[int][]*Bead),
		ByLabel:    make(map[string][]*Bead),
	}
}

// BuildGraph parses a JSONL file and constructs the graph
func BuildGraph(jsonlPath string) (*BeadsGraph, error) {
	result, err := ParseJSONL(jsonlPath)
	if err != nil {
		return nil, err
	}

	graph := NewGraph()
	graph.FilePath = jsonlPath
	graph.FileSize = result.FileSize
	graph.LastUpdated = time.Now()

	// Step 1: Add all beads to the map
	for _, bead := range result.Beads {
		graph.Beads[bead.ID] = bead
	}

	// Step 2: Resolve parent/child relationships
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

	// Step 3: Resolve blocker/blocked relationships
	for _, bead := range graph.Beads {
		for _, blockerID := range bead.BlockerIDs {
			if blocker, ok := graph.Beads[blockerID]; ok {
				bead.Blockers = append(bead.Blockers, blocker)
				blocker.Blocked = append(blocker.Blocked, bead)
				blocker.BlockedIDs = append(blocker.BlockedIDs, bead.ID)
			}
		}
	}

	// Step 4: Build indices
	graph.rebuildIndices()

	return graph, nil
}

// Rebuild reconstructs the graph from the JSONL file
func (g *BeadsGraph) Rebuild() error {
	g.mu.Lock()
	defer g.mu.Unlock()

	result, err := ParseJSONL(g.FilePath)
	if err != nil {
		return err
	}

	// Clear existing data
	g.Beads = make(map[string]*Bead)
	g.RootBeads = make([]*Bead, 0)
	g.FileSize = result.FileSize
	g.LastUpdated = time.Now()

	// Rebuild (same as BuildGraph but in-place)
	for _, bead := range result.Beads {
		g.Beads[bead.ID] = bead
	}

	for _, bead := range g.Beads {
		if bead.ParentID != "" {
			if parent, ok := g.Beads[bead.ParentID]; ok {
				bead.Parent = parent
				parent.Children = append(parent.Children, bead)
			}
		} else {
			g.RootBeads = append(g.RootBeads, bead)
		}
	}

	for _, bead := range g.Beads {
		for _, blockerID := range bead.BlockerIDs {
			if blocker, ok := g.Beads[blockerID]; ok {
				bead.Blockers = append(bead.Blockers, blocker)
				blocker.Blocked = append(blocker.Blocked, bead)
				blocker.BlockedIDs = append(blocker.BlockedIDs, bead.ID)
			}
		}
	}

	g.rebuildIndices()
	return nil
}

func (g *BeadsGraph) rebuildIndices() {
	g.ByStatus = make(map[Status][]*Bead)
	g.ByType = make(map[BeadType][]*Bead)
	g.ByPriority = make(map[int][]*Bead)
	g.ByLabel = make(map[string][]*Bead)

	for _, bead := range g.Beads {
		g.ByStatus[bead.Status] = append(g.ByStatus[bead.Status], bead)
		g.ByType[bead.Type] = append(g.ByType[bead.Type], bead)
		g.ByPriority[bead.Priority] = append(g.ByPriority[bead.Priority], bead)

		for _, label := range bead.Labels {
			g.ByLabel[label] = append(g.ByLabel[label], bead)
		}
	}
}

// Stats returns aggregate statistics about the graph
type Stats struct {
	Total      int            `json:"total"`
	ByStatus   map[string]int `json:"byStatus"`
	ByType     map[string]int `json:"byType"`
	ByPriority map[string]int `json:"byPriority"`
	Blocked    int            `json:"blocked"`
	Ready      int            `json:"ready"`
	Stale      int            `json:"stale"`
	Velocity   *Velocity      `json:"velocity"`
}

// Velocity tracks creation/closure rates
type Velocity struct {
	Created7d int `json:"created_7d"`
	Closed7d  int `json:"closed_7d"`
}

// GetStats returns current statistics
func (g *BeadsGraph) GetStats() *Stats {
	g.mu.RLock()
	defer g.mu.RUnlock()

	stats := &Stats{
		Total:      len(g.Beads),
		ByStatus:   make(map[string]int),
		ByType:     make(map[string]int),
		ByPriority: make(map[string]int),
		Velocity:   &Velocity{},
	}

	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	staleDays := time.Now().AddDate(0, 0, -7)

	for _, bead := range g.Beads {
		// By status
		stats.ByStatus[string(bead.Status)]++

		// By type
		stats.ByType[string(bead.Type)]++

		// By priority
		priorityKey := priorityLabel(bead.Priority)
		stats.ByPriority[priorityKey]++

		// Blocked count
		if len(bead.Blockers) > 0 && bead.Status != StatusClosed {
			hasOpenBlocker := false
			for _, b := range bead.Blockers {
				if b.Status != StatusClosed && b.Status != StatusTombstone {
					hasOpenBlocker = true
					break
				}
			}
			if hasOpenBlocker {
				stats.Blocked++
			}
		}

		// Ready count
		if bead.IsReady() {
			stats.Ready++
		}

		// Stale count (not updated in 7 days, and not closed)
		if bead.Status != StatusClosed && bead.UpdatedAt.Before(staleDays) {
			stats.Stale++
		}

		// Velocity
		if bead.CreatedAt.After(sevenDaysAgo) {
			stats.Velocity.Created7d++
		}
		if bead.ClosedAt != nil && bead.ClosedAt.After(sevenDaysAgo) {
			stats.Velocity.Closed7d++
		}
	}

	return stats
}

func priorityLabel(p int) string {
	switch p {
	case 0:
		return "p0"
	case 1:
		return "p1"
	case 2:
		return "p2"
	case 3:
		return "p3"
	case 4:
		return "p4"
	default:
		return "p2"
	}
}

// Filter options for querying beads
type Filter struct {
	Status   []Status
	Type     []BeadType
	Priority []int
	Labels   []string
	Search   string
	Ready    bool
	Limit    int
	Offset   int
}

// GetBeads returns filtered list of beads
func (g *BeadsGraph) GetBeads(filter *Filter) []*Bead {
	g.mu.RLock()
	defer g.mu.RUnlock()

	var results []*Bead

	for _, bead := range g.Beads {
		if matchesFilter(bead, filter) {
			results = append(results, bead)
		}
	}

	// Sort by priority (ascending = higher priority first), then by created date
	sort.Slice(results, func(i, j int) bool {
		if results[i].Priority != results[j].Priority {
			return results[i].Priority < results[j].Priority
		}
		return results[i].CreatedAt.After(results[j].CreatedAt)
	})

	// Apply pagination
	if filter.Offset > 0 && filter.Offset < len(results) {
		results = results[filter.Offset:]
	}
	if filter.Limit > 0 && filter.Limit < len(results) {
		results = results[:filter.Limit]
	}

	return results
}

func matchesFilter(bead *Bead, filter *Filter) bool {
	if filter == nil {
		return true
	}

	// Status filter
	if len(filter.Status) > 0 {
		found := false
		for _, s := range filter.Status {
			if bead.Status == s {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	// Type filter
	if len(filter.Type) > 0 {
		found := false
		for _, t := range filter.Type {
			if bead.Type == t {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	// Priority filter
	if len(filter.Priority) > 0 {
		found := false
		for _, p := range filter.Priority {
			if bead.Priority == p {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	// Labels filter (AND semantics)
	if len(filter.Labels) > 0 {
		for _, filterLabel := range filter.Labels {
			found := false
			for _, beadLabel := range bead.Labels {
				if beadLabel == filterLabel {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}
	}

	// Search filter (case-insensitive title/description search)
	if filter.Search != "" {
		search := strings.ToLower(filter.Search)
		title := strings.ToLower(bead.Title)
		desc := strings.ToLower(bead.Description)
		id := strings.ToLower(bead.ID)

		if !strings.Contains(title, search) &&
			!strings.Contains(desc, search) &&
			!strings.Contains(id, search) {
			return false
		}
	}

	// Ready filter
	if filter.Ready && !bead.IsReady() {
		return false
	}

	return true
}

// GetBead returns a single bead by ID
func (g *BeadsGraph) GetBead(id string) *Bead {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.Beads[id]
}

// GetEpics returns all epics with their progress
type EpicProgress struct {
	*Bead
	TotalChildren  int `json:"totalChildren"`
	ClosedChildren int `json:"closedChildren"`
}

func (g *BeadsGraph) GetEpics() []*EpicProgress {
	g.mu.RLock()
	defer g.mu.RUnlock()

	var epics []*EpicProgress

	for _, bead := range g.Beads {
		if bead.Type == TypeEpic {
			progress := &EpicProgress{
				Bead:           bead,
				TotalChildren:  len(bead.Children),
				ClosedChildren: 0,
			}
			for _, child := range bead.Children {
				if child.Status == StatusClosed {
					progress.ClosedChildren++
				}
			}
			epics = append(epics, progress)
		}
	}

	return epics
}
