# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [1.1.1] - 2025-12-03

### Fixed

- **Raspberry Pi Reindeer Display Issue**: Fixed reindeer rendering as empty boxes on Linux/Raspberry Pi systems
  - Root cause: Emoji rendering limitations on Linux systems (lack of proper emoji font support)
  - Solution: Implemented GIF-based sleigh animation with combined sleigh+reindeer graphics
  - Removed 450+ lines of complex SVG reindeer code and helper methods (`isLinuxPlatform()`, `createReindeerEmoji()`, `createReindeerSVG()`)
  - Sleigh animation now universally supported across all platforms (Windows, macOS, Raspberry Pi)
  - Added CSS horizontal flip (`transform: scaleX(-1)`) for bidirectional sleigh direction support
  - Added cache-busting to force image reload and prevent browser caching issues

## [1.1.0] - 2025-11-29

### Added

- **Christmas Eve Special Features**: Automatic activation at exactly 23:59:59 on December 24
  - Santa's multilingual greeting displays in configured language (17 languages supported)
  - Background image automatic switch with `postDoor24Image` configuration
  - Works across all supported languages: de, en, es, fr, ga, gd, it, nl, pt, no, sv, fi, da, eu, ar, jp, uk
- **Enhanced dateOverride Format**: Now supports full date/time specification
  - Previous format: `"YYYY-MM-DD"` (date only)
  - New format: `"YYYY-MM-DD hh:mm:ss"` (date and time in 24-hour format)
  - Enables testing of Christmas Eve features without waiting until December 24
  - Example: `dateOverride: "2024-12-24 23:59:59"`

### Changed

- **Language Configuration**: Clarified requirement to set language in module config, not global config
  - Global `language` setting in config.js does NOT apply to this module
  - Must add `language` to the module's config section
  - Documentation updated across all guides to emphasize this requirement

### Fixed

- **Background Image Element**: Now always created in DOM even when no initial background image is set
  - Enables proper background switching for Christmas Eve feature
  - Uses `data-background="true"` attribute for reliable DOM selection
- **Background Switching**: Fixed selector for `postDoor24Image` background change
  - Properly switches background at 23:59:59 on December 24

### Enhanced

- **Testing Documentation**: Added comprehensive examples for testing Christmas Eve features
- **Configuration Examples**: Updated all documentation with language and Christmas Eve settings

## [1.0.0] - 2025-11-25

### Added

- **Unified Logging System**: Standardized logger with consistent format `[MMM-MyTeams-Adventskalender:CategoryName]`
  - Category-specific loggers: Audio, Video, Gift, Sleigh, Trophy, Performance, Accessibility, Security
  - Replaces inconsistent prefixes for easier log parsing and debugging
- **Configurable Video Timeout**: New `videoAutoCloseTimeout: 300` (5 minutes) config option
  - Replaces hardcoded 20-second timeout that closed videos too quickly
  - Countdown only displays in final 30 seconds to reduce visual clutter
- **Accessibility Enhancement**: Video modals now respect `prefers-reduced-motion` preference
  - Screen reader users get full time to read content without auto-close
  - Improves accessibility for users with motion sensitivity
- **Sleigh Animation Feedback**: Visual connection between sleigh animation and trophy drop
  - `.sleigh-dropping` class pauses animation and increases brightness (1.3x) during drops
  - Creates clear visual feedback that animation responds to events
- **Loading Spinner**: Visual feedback during media file loading
  - `.door-loader` spinner appears when audio starts loading
  - Auto-removes when media is ready or on error
  - Prevents user confusion on slow connections
  **Configurable Gift Type**: New `giftType` config option to choose between "trophy" or "gift" drops
- **Multi-Format Support**: Gift/trophy images now support `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` formats with automatic format detection
- **Configurable Drop Count**: New `maxGiftsToDrop` config option to control 1-8 items (auto-capped at 8)
- **Format Flexibility**: Users can mix formats (e.g., trophy1.png, trophy2.jpg, trophy3.gif) - automatically detected

### Enhanced

**Trophy drop**: System now supports dual modes,
  - `giftType: "trophy"` - Uses "trophy1.* ,  trophy2.* , trophy3.* , etc.
  - `giftType: "gift"` - Uses gift1.* ,  gift2.* , gift3.* ,  etc.
  - Image format detection (`findGiftImagePath()` method) checks files in priority order: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
  - Improved logging with [Gift] prefix to distinguish from generic [Trophy] logs
  - Graceful error handling when configured items don't exist
  - Better validation: maxGiftsToDrop automatically constrained to valid range (1-8)
- **Performance Optimization**: Door overlay elements now reuse pooled elements instead of creating new DOM nodes
  - Eliminates browser reflow on each audio playback
  - Significantly improves performance on low-power devices (Raspberry Pi)
  - `scaleDoor()` now reuses overlay, `unscaleDoor()` hides instead of removing
- **Snowflake Optimization**: Intelligent device-aware snowflake generation
  - Detects low-memory devices via `navigator.deviceMemory`
  - Auto-caps snowflakes at 150 on devices with <4GB memory
  - Uses `DocumentFragment` for batch append (single DOM operation instead of 250-1000 individual appends)
  - Dramatically improves initial render performance
- **Security**: Content Security Policy validation at module startup
  - Warns if no CSP meta tags detected
  - Encourages security best practices without breaking functionality
  


### Fixed

- Fixed media loading performance issues through element pooling
- Fixed snowflake generation bottleneck on memory-constrained devices
- Fixed video auto-close UX by making timeout configurable with longer default

### Technical Improvements

- Implemented element pooling pattern for overlay reuse
- Added device capability detection (`navigator.deviceMemory`)
- Enhanced accessibility detection for screen readers
- Batch DOM operations using `DocumentFragment`
- Unified error/info/warn logging infrastructure


## [0.3.0] - 2025-11-24

### Added

- **Trophy Drop System**: Santa's gifts now drop when door 24 opens
  - Trophies drop sequentially (trophy1 → trophy2 → trophy3) with 5-second delays
  - Smooth 8-second fall animation for each trophy
  - Trophies fall from top and settle horizontally above countdown banner
  - High z-index (9999) ensures visibility above scaled door images

### Improved

- Trophy animation timing: increased from 2 seconds to 8 seconds for better visibility
- Trophy container positioning: moved lower (`bottom: 120px`) to sit between door grid and countdown banner
- Trophy animations now visible as they fall with proper opacity throughout animation
- Simplified animation keyframes to single `trophy-fall` animation for all trophies

### Changed

- Trophy system now triggers only when door 24 is opened (event-driven instead of continuous)
- Trophy container z-index increased to 9999 for reliable visibility
- Animation duration increased for visual clarity

## [0.2.1] - 2025-11-23

### Refactored

- **CSS Class Migration**: Migrated 10+ inline styles from JavaScript to 12 new CSS utility classes for cleaner separation of concerns
  - `.door-number`, `.door-image`, `.door-image-visible`, `.video-indicator-positioned`
  - `.door-past-day`, `.door-today`, `.door-locked-no-interact`
  - `.footer-procession-container`, `.footer-animation-line`
  - `.door-overlay-background`, `.door-overlay`, `.scaled-door-image`
- **Event Delegation Optimization**: Converted 24 individual `animationend` listeners to single delegated handler, reducing memory footprint and improving scalability
- **Consistent Error Handling**: Standardized all 11 error handling instances throughout the module to use centralized `handleError()` method instead of mixed `Log.error()` and `Log.warn()` calls

### Improved

- Reduced DOM event listener count by ~92% (from 24 listeners per door to 1 delegated listener)
- Improved code maintainability with better separation of presentation (CSS) and logic (JavaScript)
- Consistent logging and error context across all error scenarios
- Enhanced performance, especially noticeable on low-power devices (Raspberry Pi)
- Better debugging experience with standardized error messages

## [0.2.0] - 2025-11-21

### Added

- **Snowfall Animation Optimization**: Implemented dynamic generation of 20 different snowfall keyframe animations, eliminating 458 lines of hardcoded CSS
- **Time Format Validation**: Added `validateTimeFormat()` method to validate `autoopenat` configuration (HH:MM format validation with fallback)
- **Audio Overlay Customization**: New configuration options for door scaling during audio playback:
  - `doorScaleAudioSize`: Control overlay magnification (1.0-2.0 range)
  - `doorScaleOverlayOpacity`: Control overlay background darkness (0.0-1.0)
  - `doorScaleBackgroundMinOpacity`: Ensure background visibility (0.0-1.0)
- **Locked Door Visual Affordances**: 
  - Lock emoji (🔒) indicator on locked doors
  - Hover tooltip showing "Opens Dec [day]" using CSS pseudo-elements
- **Enhanced Countdown Text**: 
  - Improved text color (white instead of red) for better contrast
  - Multi-layer text-shadow for enhanced visibility
  - Semi-opaque background with padding and border-radius
  - Backdrop-filter blur for modern browsers

### Changed

- **Non-Intrusive Defaults**: Changed `doorScaleOnAudio` default from `true` to `false` (non-intrusive by default)
- **Version Bump**: Updated to 1.2.0 to reflect UX and configuration improvements

### Fixed

- Fixed missing `generateSnowfallStyles()` method that was causing module load failures
- Improved code separation between styling and JavaScript logic
- Removed unused test variables (`testAudioDuration`, `testVideoDuration`)

### Technical Improvements

- CSS now uses pseudo-elements for visual enhancements instead of adding DOM nodes
- Configuration options now have bounds checking for safety (Math.max/Math.min)
- Better defaults prioritize non-intrusive user experience

## [0.1.1] - 2025-11-16

### Added

- Enhanced testSequentially function with robust sequential door testing
- Video closure detection (both popup and modal windows) to continue sequence on manual close
- Improved state tracking for test mode operations

### Improved

- testDoorsSequentially function now properly:
  - Closes all doors before starting sequence
  - Opens each door 1-24 in order
  - Plays audio to full duration for each door
  - Plays video (if enabled) for each door
  - Detects manual video closure (user closes popup/modal) and continues sequence
  - Automatically continues to next door when media ends naturally
  - Added 2-second fallback timeout if video fails to open
  - Cleaner state management and phase transitions
  - Better logging for debugging test sequences

## [0.0.1] - 2025-11-13

### Added

- Fork of MMM-Adventskalender as new MMM-MyTeams-Adventskalender, with Celtic FC theme for test and development.
- 24 interactive doors with images and optional audio.
- Optional video playback via YouTube or local files.
- Background image support.
- Flying sleigh animation and snowfall overlay.
- Footer image procession with Christmas countdown banner.
- Persistent door state saved to state.json.
- Error handling and graceful fallbacks.

[1.1.0]: https://github.com/gitgitaway/MMM-MyTeams-Adventskalender/releases/tag/v1.1.0
[0.3.0]: not released - for testing/debugging only
[0.2.1]: not released - for testing/debugging only
[0.2.0]: not released - for testing/debugging only
[0.1.1]: not released - for testing/debugging only
[0.1.0]: not released - for testing/debugging only
