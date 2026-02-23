---
description: Repository Information Overview
alwaysApply: true
---

# MMM-MyTeams-Adventskalender Information

## Summary
A Glasgow Celtic FC themed advent calendar module for MagicMirror² featuring 24 interactive doors with multimedia content. The module commemorates influential figures and key moments in Celtic FC's history as a countdown to Christmas. Highly customizable with theme support (CelticFC, Family, Traditional), 17-language translations, and accessibility features (WCAG 2.1 Level AA compliant).

## Structure
**Main Directories**:
- **images/**: Door images (01.jpg-24.jpg), background images, footer animations, gift/trophy sprites
- **audio/**: Audio files for each door (01.mp3-24.mp3)
- **video/**: Video files for each door (01.mp4-24.mp4)
- **Themes/**: Theme-specific asset folders (CelticFC/History/, Family/, Traditional/)
- **screenshots/**: Documentation screenshots
- **tools/**: Python validation and maintenance scripts
- **.github/**: Dependabot configuration

**Architecture**: MagicMirror² module with frontend (MMM-MyTeams-Adventskalender.js) and Node.js backend (node_helper.js) for persistent state management. Frontend handles UI, animations, media playback, and user interactions. Backend manages door state persistence via state.json.

## Language & Runtime
**Language**: JavaScript (ES2021)  
**Runtime**: Node.js (MagicMirror² framework dependency)  
**Build System**: None (MagicMirror² module)  
**Package Manager**: npm

## Dependencies
**Development Dependencies**:
- eslint: ^8.56.0

**Runtime Dependencies**:
- MagicMirror² framework (peer dependency, not in package.json)
- Node.js built-in modules: `fs`, `path`
- Browser APIs: Audio, localStorage, DOM

**Main External Resources**:
- YouTube embed API (optional, for hardcoded video mode)
- MP3/MP4 media files (user-provided)

## Build & Installation
**Installation** (Linux/macOS):
```bash
cd ~/MagicMirror/modules && git clone https://github.com/gitgitaway/MMM-MyTeams-Adventskalender.git
```

**Installation** (Windows PowerShell):
```powershell
cd "$HOME/MagicMirror/modules"; git clone https://github.com/gitgitaway/MMM-MyTeams-Adventskalender.git
```

**Update**:
```bash
cd ~/MagicMirror/modules/MMM-MyTeams-Adventskalender && git pull
```

**Configuration**: Add module to `config/config.js`:
```javascript
{
  module: "MMM-MyTeams-Adventskalender",
  position: "fullscreen_above",
  config: {
    language: "en", // Must be set in module config
    theme: null, // "CelticFC", "Family", "Traditional", or null
    backgroundImage: "background.jpg",
    audioEnabled: true,
    allowVideoPlay: true,
    snowflakesEnabled: true
  }
}
```

**Linting**:
```bash
npm run lint
npm run lint:fix
```

## Main Files & Resources
**Entry Points**:
- **MMM-MyTeams-Adventskalender.js**: Frontend module (3521 lines)
- **node_helper.js**: Backend state management (300 lines)

**Configuration**:
- **package.json**: Module metadata, scripts, dev dependencies
- **.eslintrc.json**: ESLint code quality rules
- **state.json**: Persistent door state (created at runtime)

**Translations**:
- **translations.js**: 17 language support (German, English, Spanish, French, Irish, Scottish Gaelic, Italian, Dutch, Portuguese, Norwegian, Swedish, Finnish, Danish, Basque, Arabic, Japanese, Ukrainian)

**Styling**:
- **MMM-MyTeams-Adventskalender.css**: CSS-first approach with utility classes, animations, accessibility support

**Media Assets**:
- Images: 01-24.jpg/png/webp (door content), background images, footer animations, gift/trophy sprites
- Audio: 01-24.mp3 (door audio narration)
- Video: 01-24.mp4 (optional door videos)

## Testing & Validation
**Testing Framework**: None configured

**Code Quality**:
- **Linter**: ESLint with custom ruleset (.eslintrc.json)
- **Standards**: ES2021, recommended rules, 4-space indentation, double quotes, no semicolons

**Validation Tools** (Python scripts in tools/):
- `validate_json.py`: Validate state.json integrity
- `fix_autoopen.py`: Repair auto-open configuration

**Manual Testing**:
- `testSequentially: true` — Auto-test all 24 doors in sequence
- `dateOverride: "YYYY-MM-DD hh:mm:ss"` — Test specific dates (e.g., Christmas Eve)
- `closeAllDoors: true` — Reset all doors for testing
- `debug: true` — Enable detailed console logging

**Run Linter**:
```bash
npm run lint
```

**Browser Console**: Enable `debug: true` in config for detailed error logging (F12 developer tools)
