# Task T-060 Migration Context Report

## Overview
Three test files (Group B) must migrate from deleted `SourceRoot` class to `DocumentUri` interface. The migration involves:
1. Import replacement
2. Constructor transformation
3. Type declarations
4. `.path()` → `.uri()` replacements
5. Event publishing semantics updates

---

## 1. Exact Places Each Test File Uses SourceRoot/Path Semantics

### A. WiringConfigurationTest.java

**File Location:** `langserver-core/src/test/java/org/ballerinalang/langserver/workspace/WiringConfigurationTest.java`

**SourceRoot Usage Locations:**

| Line | Context | Current Pattern | Notes |
|------|---------|-----------------|-------|
| 37 | Import | `import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;` | Must remove |
| 69 | Field declaration | `private SourceRoot testRoot;` | Replace with `DocumentUri testRoot;` |
| 77 | Initialization | `testRoot = new SourceRoot(tempDir.toAbsolutePath().normalize());` | Replace with `testRoot = new DocumentUri.FileUri(tempDir.toAbsolutePath().normalize().toUri());` |
| 159 | Method signature | `public void wmDocumentChanged_crossesToCompilerEngineAndTriggersCompilation()` → calls `publishEvent(EventKind.WORKSPACE_PROJECT_REGISTERED, testRoot);` at line 126 | Affected by helper method change |
| 166 | Method signature | `publishConfigEvent(testRoot, "STRUCTURAL");` at line 166 | Affected by helper method change |
| 341 | Helper method sig | `private void publishEvent(EventKind kind, SourceRoot root)` | Change parameter type to `DocumentUri` |
| 342 | Helper method body | `eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), kind));` | Replace `root.path().toString()` with `root.uri().toString()` |
| 349 | Helper method sig | `private void publishConfigEvent(SourceRoot root, String reactivityTier)` | Change parameter type to `DocumentUri` |
| 350-351 | Helper method body | `eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WM_FILE_WATCHED_CHANGED, reactivityTier));` | Replace `root.path().toString()` with `root.uri().toString()` |

**Key Pattern:** Two helper methods consistently use `root.path().toString()` for event sourceContext.

---

### B. CrossContextBoundaryTest.java

**File Location:** `langserver-core/src/test/java/org/ballerinalang/langserver/workspace/test/acceptance/CrossContextBoundaryTest.java`

**SourceRoot Usage Locations:**

| Line | Context | Current Pattern | Event/Notes |
|------|---------|-----------------|-------------|
| 39 | Import | `import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;` | Must remove |
| 113 | Local var | `SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());` | Replace constructor and type |
| 115 | Event publish | `eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WORKSPACE_PROJECT_REGISTERED));` | Event sourceContext: `root.path().toString()` → `root.uri().toString()` |
| 119 | Event publish | `eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WM_DOCUMENT_CHANGED, mainFile.toString()));` | Both sourceContext and coalesceScope are path strings |
| 120 | Event data | `mainFile.toString()` (passed as coalesceScope) | Risk: document path → URI string (see section 3) |
| 129 | Local var | `SourceRoot activeRoot = new SourceRoot(tempDir.toAbsolutePath().normalize());` | Replace constructor and type |
| 130 | Local var | `SourceRoot backgroundRoot = new SourceRoot(tempDir.resolve("background").toAbsolutePath().normalize());` | Replace constructor and type |
| 153 | Local var | `SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());` | Replace constructor and type |
| 155 | Event publish | `eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WORKSPACE_PROJECT_REGISTERED));` | Event sourceContext |
| 160 | Event publish | `eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WM_DOCUMENT_CHANGED, mainFile.toString()));` | Both sourceContext and coalesceScope |
| 174 | Local var | `SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());` | Replace constructor and type |
| 177 | Event publish | `EventKind.CE_E5A_RESOLUTION_DIAGNOSTICS_READY, root.path().toString()` (as coalesceScope) | CoalesceScope is root path string |
| 188 | Local var | `SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());` | Replace constructor and type |
| 195 | Event publish | `EventKind.CE_E5B_COMPILATION_DIAGNOSTICS_READY, root.path().toString()` (as coalesceScope) | CoalesceScope is root path string |
| 206 | Local var | `SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());` | Replace constructor and type |
| 212 | Event publish | `EventKind.CE_RESOLUTION_EXHAUSTED, root.path().toString()` (as coalesceScope) | CoalesceScope is root path string |
| 223 | Local var | `SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());` | Replace constructor and type |
| 230 | Event publish | `EventKind.CE_RESOLUTION_RECOVERED, root.path().toString()` (as coalesceScope) | CoalesceScope is root path string |
| 252 | Reflection helper | `private boolean hasObservedCompilerSignal(SourceRoot root, EventKind signal)` | Parameter type; reflected method call at line 254 |
| 254 | Reflection call | `Method method = ProjectServiceImpl.class.getDeclaredMethod("hasObservedCompilerSignal", SourceRoot.class, EventKind.class);` | **Critical:** Reflection must match production signature |

**Key Pattern:** 8 local `SourceRoot` instantiations. Reflection helper must match `ProjectServiceImpl.hasObservedCompilerSignal(DocumentUri, EventKind)` signature.

---

### C. RegistryTest.java

**File Location:** `langserver-core/src/test/java/org/ballerinalang/langserver/workspace/workspacemanager/RegistryTest.java`

**SourceRoot Usage Locations:**

| Line | Context | Current Pattern | Notes |
|------|---------|-----------------|-------|
| No import | Import | No explicit import (relies on static factory) | Must add import for DocumentUri if needed |
| 48-49 | Static helper | `private static SourceRoot root(String path) { return new SourceRoot(Path.of(path).toAbsolutePath().normalize()); }` | Return type and body: replace with DocumentUri.FileUri |
| 52 | Static helper sig | `private static Project project(SourceRoot root, int heapMb)` | Parameter type: replace with DocumentUri |
| 97, 138, 152, 164, 165, 180, 181, 182, 201, 202, 219, 235, 251, 267, 268, 281 | 16 call sites | `SourceRoot ... = root(...)` | All use the static factory helper; once fixed, cascades to all 16+ call sites |

**Key Pattern:** All SourceRoot instantiations go through a single static helper method `root(String)`. Fixing the helper cascades to ~20 test methods automatically. The helper is the pivot point.

**19 Total Occurrences as stated in task:**
- Helper def: 1 (line 48-49)
- Helper call/use in local vars: ~16 lines
- `Project project(SourceRoot root, ...)` parameter: 1
- Actual `SourceRoot ... = root(...)` assignments: ~19-20 in 15+ test methods

---

## 2. Existing DocumentUri/FileUri Usage Patterns

### A. In Production Code (CompilationServiceImpl)

```java
// Line from CompilationServiceImpl - EXACT PATTERN TO FOLLOW:
private DocumentUri reconstructSourceUri(DomainEvent event) {
    URI uri = URI.create(event.coalesceScope());           // ← Parse string as URI
    return new DocumentUri.FileUri(uri);                   // ← Wrap in FileUri
}
```

**Key Insight:** Production code expects event sourceContext/coalesceScope to be **valid URI strings** (e.g., `file:///path/to/project`), not plain filesystem paths.

### B. In Production Code (ProjectServiceImpl)

```java
// Usage pattern from ProjectServiceImpl:
private DocumentUri toFileUri(Path normalized) {
    return new DocumentUri.FileUri(normalized.toUri());     // ← Always .toUri()
}

// In tests via reflection, hasObservedCompilerSignal signature:
boolean hasObservedCompilerSignal(@Nonnull DocumentUri root, @Nonnull EventKind signal);
```

### C. DocumentUri Class Structure

```java
// From documentstore/DocumentUri.java:
public sealed interface DocumentUri permits DocumentUri.FileUri, ... {
    URI uri();                                    // ← Method to access underlying URI
    
    record FileUri(URI uri) implements DocumentUri {
        public FileUri {
            uri = validateScheme(uri, "file");   // ← Validates scheme
        }
    }
}
```

**Key Insight:** `DocumentUri.FileUri` constructor takes a `java.net.URI` (not a Path), and validates the scheme is "file".

---

## 3. Risks and Edge Cases for `.path()` → `.uri()` or `Path.of(root.uri())`

### Risk 1: Event SourceContext Semantics
**Location:** All three test files publish events with `root.path().toString()` as sourceContext.

**Current:** Plain filesystem path string (e.g., `/tmp/cross-context-boundary`)
**After Change:** Valid file URI string (e.g., `file:///tmp/cross-context-boundary`)

**Production Code Expectation:** `CompilationServiceImpl.reconstructSourceUri()` calls `URI.create(event.coalesceScope())` — expects valid URI syntax.

**Risk:** If sourceContext is malformed as a URI, reconstruction fails or creates wrong DocumentUri.
**Mitigation:** Always use `.uri().toString()` which produces valid file:// URIs.

---

### Risk 2: Event CoalesceScope for Document Changes
**Location:** `CrossContextBoundaryTest.java` lines 119-120, 160-161

```java
// Current (BROKEN):
eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), 
    EventKind.WM_DOCUMENT_CHANGED, 
    mainFile.toString()));  // ← coalesceScope is PATH string

// Should be (per task guidance):
eventBus.publish(new DomainEvent(Instant.now(), root.uri().toString(), 
    EventKind.WM_DOCUMENT_CHANGED, 
    mainFile.toUri().toString()));  // ← coalesceScope is URI string
```

**Risk:** WM_DOCUMENT_CHANGED events use coalesceScope for document-level event coalescence. Per task guidance, this should be a URI string for consistency with `reconstructSourceUri()` expectations.

**Critical Detail:** Line 119-120, 160-161 in CrossContextBoundaryTest must convert `mainFile.toString()` to `mainFile.toUri().toString()` (task line 45).

---

### Risk 3: Reflection Type Mismatch
**Location:** `CrossContextBoundaryTest.java` line 254

```java
// Current (will FAIL):
Method method = ProjectServiceImpl.class.getDeclaredMethod("hasObservedCompilerSignal", 
    SourceRoot.class,        // ← Old type
    EventKind.class);

// Must be (per production signature):
Method method = ProjectServiceImpl.class.getDeclaredMethod("hasObservedCompilerSignal", 
    DocumentUri.class,       // ← New type
    EventKind.class);
```

**Risk:** Reflection lookup will fail with `NoSuchMethodException` if parameter type doesn't match production method signature.

**Why It Matters:** Production `ProjectServiceImpl.hasObservedCompilerSignal(DocumentUri root, EventKind signal)` already uses `DocumentUri`. Test reflection must match exactly.

---

### Risk 4: Path.of(root.uri()) Conversion for Resolve Operations
**Location:** Task guidance mentions patterns like `root.path().resolve(file.bal)` → `Path.of(root.uri()).resolve(...)`

**Current Example (hypothetical):**
```java
Path resolved = root.path().resolve("file.bal");
```

**Replacement:**
```java
Path resolved = Path.of(root.uri()).resolve("file.bal");
```

**Risk:** `Path.of(URI)` requires a valid absolute file URI with no query/fragment. File URIs from `.toUri()` on absolute normalized paths are safe, but malformed URIs will throw `IllegalArgumentException`.

**Current Status:** This pattern doesn't appear in the three test files yet, but task guidance flags it as a pattern to watch. WiringConfigurationTest helper methods don't use `.resolve()`, CrossContextBoundaryTest doesn't use `.resolve()`, RegistryTest doesn't use `.resolve()`.

---

### Risk 5: EventKind CoalesceScope Usage
**Location:** Lines 177, 195, 212, 230 in CrossContextBoundaryTest use coalesceScope for CE event filtering

```java
eventBus.publish(new DomainEvent(Instant.now(), "compiler-engine",
    EventKind.CE_E5A_RESOLUTION_DIAGNOSTICS_READY, 
    root.path().toString()));  // ← coalesceScope is sourceRoot as path
```

**Task Guidance:** "coalesceScope should be a URI string too since reconstructSourceUri uses URI.create()"

**Risk:** If coalesceScope is a path string, `URI.create(path_string)` may succeed (creates a relative URI) but won't be a valid file:// URI, leading to inconsistency.

**Safe Pattern (per task):**
```java
eventBus.publish(new DomainEvent(Instant.now(), "compiler-engine",
    EventKind.CE_E5A_RESOLUTION_DIAGNOSTICS_READY, 
    root.uri().toString()));   // ← coalesceScope as valid URI string
```

---

## 4. Constructor Transformation Details

### WiringConfigurationTest (Line 77)
**Current:**
```java
testRoot = new SourceRoot(tempDir.toAbsolutePath().normalize());
```

**Transformed:**
```java
testRoot = new DocumentUri.FileUri(tempDir.toAbsolutePath().normalize().toUri());
```

**Breakdown:**
1. `tempDir.toAbsolutePath().normalize()` returns a normalized `Path`
2. `.toUri()` converts to `java.net.URI` with file scheme
3. `new DocumentUri.FileUri(uri)` wraps it, validates scheme is "file"

---

### CrossContextBoundaryTest (Lines 113, 129, 130, 153, 174, 188, 206, 223)
**Current (example):**
```java
SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());
```

**Transformed:**
```java
DocumentUri root = new DocumentUri.FileUri(tempDir.toAbsolutePath().normalize().toUri());
```

**Applies to all 8 local instantiations.**

---

### RegistryTest (Lines 48-49, helper method)
**Current:**
```java
private static SourceRoot root(String path) {
    return new SourceRoot(Path.of(path).toAbsolutePath().normalize());
}
```

**Transformed:**
```java
private static DocumentUri root(String path) {
    return new DocumentUri.FileUri(Path.of(path).toAbsolutePath().normalize().toUri());
}
```

**Cascades to all 16+ call sites via the helper.**

---

## 5. Import Replacement Summary

| File | Old Import | New Import | Notes |
|------|-----------|-----------|-------|
| WiringConfigurationTest.java | `org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot` | `org.ballerinalang.langserver.workspace.documentstore.DocumentUri` | Line 37 |
| CrossContextBoundaryTest.java | `org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot` | `org.ballerinalang.langserver.workspace.documentstore.DocumentUri` | Line 39 |
| RegistryTest.java | (none currently) | `org.ballerinalang.langserver.workspace.documentstore.DocumentUri` | Add import |

**Import `DocumentUri`, not subclasses.** The sealed interface `DocumentUri` permits all variants. Tests only use `DocumentUri.FileUri`, but importing the interface allows future variants.

---

## 6. Test Update Points Summary

### WiringConfigurationTest
1. **Line 37:** Remove SourceRoot import
2. **Line 37 (after):** Add DocumentUri import
3. **Line 69:** Change field type `SourceRoot testRoot` → `DocumentUri testRoot`
4. **Line 77:** Transform constructor call and type
5. **Line 341:** Change helper parameter type
6. **Line 342:** Replace `root.path().toString()` with `root.uri().toString()`
7. **Line 349:** Change helper parameter type
8. **Line 350:** Replace `root.path().toString()` with `root.uri().toString()`

### CrossContextBoundaryTest
1. **Line 39:** Remove SourceRoot import, add DocumentUri import
2. **Lines 113, 129, 130, 153, 174, 188, 206, 223:** Transform 8 local variable instantiations (type + constructor)
3. **Lines 115, 119, 155, 160, 177, 195, 212, 230:** Update event publishing calls from `root.path().toString()` to `root.uri().toString()`
4. **Lines 120, 161:** Update coalesceScope from `mainFile.toString()` to `mainFile.toUri().toString()` (document event data)
5. **Line 252:** Change helper parameter type `SourceRoot root` → `DocumentUri root`
6. **Line 254:** Update reflection call from `SourceRoot.class` → `DocumentUri.class`

### RegistryTest
1. **(No explicit import currently needed — add DocumentUri import for clarity)**
2. **Lines 48-49:** Transform static helper method:
   - Return type: `SourceRoot` → `DocumentUri`
   - Body: Constructor call + `.toUri()`
3. **Line 52:** Change parameter type in `project(SourceRoot root, ...)` → `project(DocumentUri root, ...)`
4. **All 16+ call sites (lines 97, 138, 152, etc.):** Automatically resolved once helper and signature are fixed

---

## 7. Key Insights for Implementation

1. **Single Pivot Points:**
   - WiringConfigurationTest: Two helper methods (lines 341, 349) are the pivot — fix them, all calls work
   - RegistryTest: One static helper (lines 48-49) is the pivot — fix it, all ~20 call sites cascade

2. **Event Publishing Critical:**
   - All `root.path().toString()` → `root.uri().toString()` for sourceContext
   - Document event coalesceScope: `mainFile.toString()` → `mainFile.toUri().toString()`

3. **Reflection Must Match Production:**
   - CrossContextBoundaryTest line 254: `hasObservedCompilerSignal` reflection must use `DocumentUri.class`, not `SourceRoot.class`
   - Production signature in ProjectServiceImpl: `hasObservedCompilerSignal(@Nonnull DocumentUri root, @Nonnull EventKind signal)`

4. **Constructor Transformation Is Uniform:**
   - All: `Path` → `.toAbsolutePath().normalize()` → `.toUri()` → `new DocumentUri.FileUri(uri)`
   - Same pattern in all three files, just applied 26 times total (with 2 helper pivots)

5. **No Logic Changes Required:**
   - All test assertions, loop logic, thread synchronization remain identical
   - Only type declarations, constructor calls, and event payload strings change

---

## 8. Verification Checklist

- [ ] No remaining `import SourceRoot` statements
- [ ] All `DocumentUri` imports added
- [ ] All field/variable type declarations changed from `SourceRoot` to `DocumentUri`
- [ ] All constructor calls transformed to `new DocumentUri.FileUri(...toUri())`
- [ ] All `root.path().toString()` replaced with `root.uri().toString()` in event publishing
- [ ] Document coalesceScope fields (mainFile) converted to URI strings
- [ ] Reflection parameter type in CrossContextBoundaryTest.line254 is `DocumentUri.class`
- [ ] Helper method signature in CrossContextBoundaryTest.line252 uses `DocumentUri`
- [ ] Static helper return type in RegistryTest.line48 is `DocumentUri`
- [ ] All tests compile without errors
- [ ] All tests pass (`./gradlew :langserver-core:test --tests "*.WiringConfigurationTest" --tests "*.CrossContextBoundaryTest" --tests "*.RegistryTest"`)

