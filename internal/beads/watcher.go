package beads

import (
	"log"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// Watcher watches the beads.jsonl file for changes
type Watcher struct {
	graph      *BeadsGraph
	fsWatcher  *fsnotify.Watcher
	filePath   string
	debounce   time.Duration
	agentMode  bool
	onChange   func()
	stopCh     chan struct{}
	wg         sync.WaitGroup
	mu         sync.Mutex
}

// WatcherConfig configures the file watcher
type WatcherConfig struct {
	FilePath   string
	Graph      *BeadsGraph
	AgentMode  bool
	OnChange   func() // Callback when data changes
}

// NewWatcher creates a new file watcher
func NewWatcher(config WatcherConfig) (*Watcher, error) {
	fsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	debounce := 100 * time.Millisecond
	if config.AgentMode {
		debounce = 2 * time.Second
	}

	w := &Watcher{
		graph:     config.Graph,
		fsWatcher: fsWatcher,
		filePath:  config.FilePath,
		debounce:  debounce,
		agentMode: config.AgentMode,
		onChange:  config.OnChange,
		stopCh:    make(chan struct{}),
	}

	return w, nil
}

// Start begins watching the file
func (w *Watcher) Start() error {
	err := w.fsWatcher.Add(w.filePath)
	if err != nil {
		return err
	}

	w.wg.Add(1)
	go w.watch()

	return nil
}

// Stop stops the watcher
func (w *Watcher) Stop() error {
	close(w.stopCh)
	w.wg.Wait()
	return w.fsWatcher.Close()
}

// SetAgentMode toggles agent mode (slower updates)
func (w *Watcher) SetAgentMode(enabled bool) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.agentMode = enabled
	if enabled {
		w.debounce = 2 * time.Second
	} else {
		w.debounce = 100 * time.Millisecond
	}
}

func (w *Watcher) watch() {
	defer w.wg.Done()

	var timer *time.Timer
	var timerCh <-chan time.Time

	for {
		select {
		case <-w.stopCh:
			if timer != nil {
				timer.Stop()
			}
			return

		case event, ok := <-w.fsWatcher.Events:
			if !ok {
				return
			}

			// Only react to write events
			if event.Op&fsnotify.Write != fsnotify.Write {
				continue
			}

			// Debounce: reset timer on each event
			w.mu.Lock()
			debounce := w.debounce
			w.mu.Unlock()

			if timer != nil {
				timer.Stop()
			}
			timer = time.NewTimer(debounce)
			timerCh = timer.C

		case <-timerCh:
			// Debounce period elapsed, reload the graph
			log.Println("File changed, reloading graph...")
			if err := w.graph.Rebuild(); err != nil {
				log.Printf("Error rebuilding graph: %v", err)
				continue
			}

			if w.onChange != nil {
				w.onChange()
			}

		case err, ok := <-w.fsWatcher.Errors:
			if !ok {
				return
			}
			log.Printf("Watcher error: %v", err)
		}
	}
}
