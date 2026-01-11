package beads

import (
	"log"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// Watcher watches the beads.jsonl file for changes
type Watcher struct {
	graph      *BeadsGraph
	fsWatcher  *fsnotify.Watcher
	filePath   string
	fileName   string // Just the filename (e.g., "issues.jsonl")
	dirPath    string // Parent directory to watch
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
		fileName:  filepath.Base(config.FilePath),
		dirPath:   filepath.Dir(config.FilePath),
		debounce:  debounce,
		agentMode: config.AgentMode,
		onChange:  config.OnChange,
		stopCh:    make(chan struct{}),
	}

	return w, nil
}

// Start begins watching the file
func (w *Watcher) Start() error {
	// Watch the directory instead of the file to catch atomic writes (rename)
	err := w.fsWatcher.Add(w.dirPath)
	if err != nil {
		return err
	}
	log.Printf("Watching directory: %s for changes to %s", w.dirPath, w.fileName)

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

			// Only process events for our target file
			eventFileName := filepath.Base(event.Name)
			if eventFileName != w.fileName {
				continue
			}

			// React to write, create, and rename events
			// (atomic writes use rename: write to .tmp then rename to target)
			isRelevant := event.Op&fsnotify.Write == fsnotify.Write ||
				event.Op&fsnotify.Create == fsnotify.Create ||
				event.Op&fsnotify.Rename == fsnotify.Rename
			if !isRelevant {
				continue
			}
			
			log.Printf("File event: %s %s", event.Op, event.Name)

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
