# seeBeads Integration

Add the seeBeads dashboard to your Go application. This displays a visual dashboard for your Beads issue tracker.

## Prerequisites Check

Before integrating seeBeads, verify Beads is set up:

```bash
# Check if .beads directory exists
ls -la .beads/beads.jsonl
```

**If the file exists:** Skip to [Integration](#integration)

**If not found:** Follow [Beads Setup](#beads-setup) first

---

## Beads Setup

If this project doesn't have Beads yet, set it up:

### 1. Install the Beads CLI

```bash
go install github.com/steveyegge/beads/cmd/bd@latest
```

### 2. Initialize Beads in the project

```bash
bd init
```

This creates a `.beads/` directory with `beads.jsonl`.

### 3. Verify

```bash
ls -la .beads/beads.jsonl
```

You should see the file. Now proceed to Integration.

---

## Integration

### 1. Add dependency

```bash
go get github.com/seebeads/seebeads@latest
```

### 2. Add to your server

Find your main HTTP server file and add:

**Import:**
```go
"github.com/seebeads/seebeads"
```

**Route (add near your other routes):**
```go
http.Handle("/beads/", seebeads.Handler("", "/beads"))
```

### 3. Run go mod tidy

```bash
go mod tidy
```

### 4. Done

Run your app. Dashboard is at `http://localhost:YOUR_PORT/beads/`

---

## Framework-specific examples

<details>
<summary>Standard library (net/http)</summary>

```go
package main

import (
    "net/http"
    "github.com/seebeads/seebeads"
)

func main() {
    // Your routes...
    http.HandleFunc("/", homeHandler)
    
    // Add seeBeads dashboard
    http.Handle("/beads/", seebeads.Handler("", "/beads"))
    
    http.ListenAndServe(":8080", nil)
}
```
</details>

<details>
<summary>gorilla/mux</summary>

```go
r := mux.NewRouter()
r.PathPrefix("/beads/").Handler(seebeads.Handler("", "/beads"))
```
</details>

<details>
<summary>chi</summary>

```go
r := chi.NewRouter()
r.Mount("/beads", seebeads.Handler("", "/beads"))
```
</details>

<details>
<summary>gin</summary>

```go
r := gin.Default()
r.Any("/beads/*path", gin.WrapH(seebeads.Handler("", "/beads")))
```
</details>

<details>
<summary>echo</summary>

```go
e := echo.New()
e.Any("/beads/*", echo.WrapHandler(seebeads.Handler("", "/beads")))
```
</details>

<details>
<summary>fiber</summary>

```go
app := fiber.New()
app.Use("/beads", adaptor.HTTPHandler(seebeads.Handler("", "/beads")))
```
</details>

---

## API Reference

```go
// Auto-discover .beads/beads.jsonl, mount at /beads/
seebeads.Handler("", "/beads")

// Explicit path to beads file
seebeads.Handler("/path/to/.beads/beads.jsonl", "/beads")

// Mount at different path
seebeads.Handler("", "/dashboard")  // Available at /dashboard/
```

---

## Complete Setup Checklist

Run through this if anything isn't working:

- [ ] Beads CLI installed: `which bd` returns a path
- [ ] Beads initialized: `.beads/beads.jsonl` exists
- [ ] seeBeads dependency added: `go get github.com/seebeads/seebeads@latest`
- [ ] Import added to server file: `"github.com/seebeads/seebeads"`
- [ ] Route added: `http.Handle("/beads/", seebeads.Handler("", "/beads"))`
- [ ] Dependencies tidied: `go mod tidy`
- [ ] App running and `/beads/` accessible

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `no .beads/beads.jsonl found` | Run `bd init` in the project root |
| `bd: command not found` | Run `go install github.com/steveyegge/beads/cmd/bd@latest` |
| 404 on `/beads/` | Ensure route has trailing slash: `/beads/` not `/beads` |
| Blank page | Check browser console for errors |
| `go get` fails | Check Go version is 1.21+ with `go version` |
