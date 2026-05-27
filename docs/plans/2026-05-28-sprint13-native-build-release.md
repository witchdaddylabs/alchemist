# Sprint 13 — Native Build & Release Implementation Plan

> **Goal:** Ship Alchemist as a real macOS app with proper icons, DMG installer, code signing config, auto-update, CI/CD, and documentation.

**Branch:** `sprint13/native-build-release`
**PR:** #12

**Current state:**
- `tauri.conf.json` has basic config but no DMG/entitlements/updater config
- Icons are default Tauri placeholders (not the Alchemist alembic design)
- No GitHub Actions workflow
- No entitlements file for code signing
- No `tauri-plugin-updater` in Cargo.toml
- README is default Tauri template (useless)
- Version: `0.1.0`

---

### Task 1: Extract SVG artwork & generate app icons

**Objective:** Replace default Tauri placeholder icons with the Alchemist alembic design. Create all required icon sizes from the SVG source.

**Files:**
- Modify: `src-tauri/icons/icon.png` (512x512)
- Modify: `src-tauri/icons/icon.icns` (all Apple sizes)
- Modify: `src-tauri/icons/32x32.png`
- Modify: `src-tauri/icons/128x128.png`
- Modify: `src-tauri/icons/128x128@2x.png`
- Modify: `src-tauri/icons/icon.ico`
- Keep: `src/components/icons/AlchemistIcon.tsx` (source of truth)

**Step 1:** Extract SVG from AlchemistIcon.tsx, create a standalone 1024x1024 version with hardcoded colors (no `currentColor`/Tailwind classes).

**Step 2:** Use `svgexport` (via npx) to render the SVG at all required sizes:
- 1024x1024 → base for .icns
- 512x512 → `icon.png`
- 256x256 → `128x128@2x.png`
- 128x128 → `128x128.png`
- 32x32 → `32x32.png`

**Step 3:** Create .iconset directory structure, run `iconutil` to generate `.icns`.

**Step 4:** Generate `.ico` from the 256x256 PNG (for Windows — optional, low priority).

**Step 5:** Verify: `file icon.icns` → "Mac OS X icon resource", all files exist with correct dimensions.

---

### Task 2: Tauri build config & entitlements

**Objective:** Configure DMG packaging, macOS minimum version, code signing preferences, and hardened runtime entitlements.

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Create: `src-tauri/entitlements.plist`

**Step 1:** Update `tauri.conf.json` in the `bundle` section:

```json
"bundle": {
  "active": true,
  "targets": ["dmg"],
  "macOS": {
    "minimumSystemVersion": "13.0",
    "entitlements": "entitlements.plist",
    "exceptionDomain": "",
    "frameworks": [],
    "providerShortName": null,
    "signingIdentity": "-"
  },
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ],
  "dmg": {
    "appPosition": {
      "x": 200,
      "y": 200
    },
    "applicationFolderPosition": {
      "x": 400,
      "y": 200
    },
    "windowSize": {
      "width": 600,
      "height": 400
    },
    "backgroundColor": "#1A1725",
    "customBackground": null
  }
}
```

**Step 2:** Create `src-tauri/entitlements.plist` with hardened runtime:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
```

**Step 3:** Bump version: `"version": "0.2.0"` (shipped 12 sprints of features).

**Step 4:** Add `"minimumWindowWidth": 900, "minimumWindowHeight": 600` to app.windows config.

**Step 5:** Verify: `cargo check` passes, `npm run build` passes.

---

### Task 3: Add tauri-plugin-updater for auto-update

**Objective:** Wire auto-update so future releases are delivered automatically via GitHub Releases.

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`

**Step 1:** Add to `Cargo.toml` dependencies:
```toml
tauri-plugin-updater = "2"
```

**Step 2:** Add to `tauri.conf.json`:
```json
"plugins": {
  "updater": {
    "active": true,
    "dialog": true,
    "pubkey": null,
    "endpoints": ["https://github.com/witchdaddylabs/alchemist/releases/latest/download/updater.json"],
    "windows": {
      "installMode": "passive"
    }
  }
}
```

**Step 3:** Register plugin in `src-tauri/src/lib.rs`:
```rust
.tauri_plugin_updater(tauri_plugin_updater::Builder::new().build())?
```

**Step 4:** Update `package.json` to add `"@tauri-apps/plugin-updater": "^2"` frontend dependency.

**Step 5:** Add frontend check on app startup:
```typescript
// src/App.tsx — add check for updates on mount
import { check } from "@tauri-apps/plugin-updater";
import { ask } from "@tauri-apps/plugin-dialog";

// On mount:
useEffect(() => {
  check().then((update) => {
    if (update?.available) {
      ask("An update is available. Download and install now?", {
        title: "Update Available",
        kind: "info",
      }).then((install) => {
        if (install) update.downloadAndInstall();
      });
    }
  });
}, []);
```

**Step 6:** Verify: `cargo check` passes for new dependency.

---

### Task 4: GitHub Actions CI/CD workflow

**Objective:** Build on every push to main, create GitHub Release with DMG on version tags.

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1:** Create workflow file:

```yaml
name: Build & Release
on:
  push:
    branches: [main]
    tags: ["v*"]

jobs:
  build:
    runs-on: macos-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: npm ci

      - name: Build app
        run: npm run tauri build -- --ci
        env:
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}

      - name: Upload DMG artifact
        uses: actions/upload-artifact@v4
        with:
          name: Alchemist-dmg
          path: src-tauri/target/release/bundle/dmg/*.dmg

      - name: Create Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: src-tauri/target/release/bundle/dmg/*.dmg
          generate_release_notes: true
```

---

### Task 5: Rewrite README

**Objective:** Replace default Tauri template with a proper project README covering installation, usage, provider setup, and development.

**Files:**
- Modify: `README.md`

Should cover:
- What Alchemist is (tagline, key features)
- Screenshots (TODO — add once built)
- Installation: Download DMG from Releases
- Usage: Open SQLite, connect to MemPalace, chat with your data
- Provider setup: Ollama (local), OpenAI, Gemini, DeepSeek
- Development setup: `npm install`, `npm run tauri dev`
- Tech stack
- License

---

### Task 6: Verification

**Objective:** Ensure everything builds and nothing is broken.

1. `npm run build` — frontend builds clean
2. `cargo check` — Rust compiles clean (no updater plugin available locally, but check compiles)
3. `npm run tauri build` — full build produces DMG
4. Verify DMG opens correctly
5. Commit and PR
