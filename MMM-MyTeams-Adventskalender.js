/**
 * MMM-MyTeams-Adventskalender - Celtic FC Themed Advent Calendar
 * Author : gitgitaway with AI debugging assistance
 * Version: v 1:4.0
 * Original concept by @ChrisF1976
 * 
 * Features-
 * - Interactive doors that reveal content on click
 * - Countdown timer until next door opens
 * - Background music playing throughout the calendar - Audio playback for each door
 * - Animated footer image procession at the bottom
 * - Choice of traditional background or Celtic FC theming (green & white colors) background of Celtic Park in Christmas snow
 * 
 * @module MMM-MyTeams-Adventskalender
 * @description Interactive advent calendar with audio, video and animations
 */

Module.register("MMM-MyTeams-Adventskalender", {
    /**
     * Default configuration settings
     * Includes audio settings, animation timing, and module dimensions
     */
    defaults: {
        backgroundImage: null,
        doorMargin: 30,
        moduleWidth: 900,
        moduleHeight: 700,
        autopen: true,
        autoopenat: "00:00",
        openAnimationTime: "5s",
        onboardingToolTips: false, // Show helpful tooltips on first load
        
        // Language configuration
        language: "en", // Supported: de, en, es, fr, ga, gd, it, nl, pt, no, sv, fi, da, eu, ar, jp, uk
        
        // Audio configuration
        audioEnabled: true,
        audioVolume: 0.5,
        doorScaleOnAudio: false, // Scale door to 2x when audio plays (non-intrusive by default)
        doorScaleAudioSize: 1.5, // Size multiplier for scaled door (1.0-2.0)
        doorScaleOverlayOpacity: 0.5, // Overlay darkness (0.0-1.0) - lower values keep background more visible
        doorScaleBackgroundMinOpacity: 0.4, // Minimum visibility of background image (0.0-1.0)
        
        // Video configuration
        allowVideoPlay: true,
        videoSource: "hardcoded", // "hardcoded" or "folder"
        videoAutoCloseTimeout: 300, // 5 minutes default (make configurable)
        
        // Footer images configuration
        footerImageEnabled: true,
        footerImageDirection: "left-to-right", // "left-to-right" or "right-to-left"
        footerImageAnimationDuration: 120,
        footerImageCount: 8,
        footerImageSize: 40,
        footerImages: "socks.gif", // Single image or array of images to accompany countdown banner procession ["socks.gif", "present.gif", "merryChristmas.gif"]
        
        // Sleigh animation configuration
        sleighEnabled: true,
        sleighSpeed: 10, // seconds to traverse screen
        sleighDirection: "right-to-left", // "right-to-left" or "left-to-right", // "right-to-left" or "left-to-right"
        sleighImage: "sleigh.gif", // GIF or image file in images folder (transparent background recommended)
        
        // Santa's gifts configuration
        giftsFromSanta: false, // Enable Santa dropping trophies/gifts from sleigh
        giftType: "trophy", // Type of items to drop: "trophy" or "gift"
        maxGiftsToDrop: 3, // Maximum number of gifts/trophies to drop (1-8)
        giftDropDelay: 5, // Seconds between trophy drops (1-8)
        
        // Snowflake configuration
        snowflakesEnabled: true,
        snowflakeColors: [ "#FFFFFF", "#CCFFFF", "#99CCFF", "#6699FF","#3366FF", "#0033FF", "#0000FF", "#0000AA", "#000055" ],
        snowCondition: null, // "Extreme", "Heavy", "Moderate", "Light", null 
        snowflakeCount: 250,
        snowflakeTypes: 5,
        snowflakeSpeed: 50,
        
        // Christmas Eve special configuration (23:59:59 on Dec 24)
        postDoor24Image: null, // Background image to show at 23:59:59 on Christmas Eve (path relative to MagicMirror root)
      
       // Testing configuration
        closeAllDoors: false,
        testSequentially: false,
        openAllDoorsTest: false,
        randomizeDoorsOnStart: true,
        testDoorDuration: 20,
        dateOverride: null, // null or override date/time "YYYY-MM-DD hh:mm:ss" eg "2024-12-24 23:59:59" for testing Christmas Eve features
        debug: false,
    },

    /**
     * Debug logging helper - logs to terminal only when debug config is enabled
     * @param {string} message - The message to log
     */
    logDebug(message) {
        if (this.config.debug) {
            Log.info("[DEBUG] " + message);
        }
    },

    /**
     * Create a unified logger for a specific category
     * @param {string} category - Category name (e.g., "Audio", "Gift", "Video")
     * @returns {Object} Logger with info, warn, error methods
     */
    createLogger(category) {
        return {
            info: (msg) => Log.info(`[MMM-MyTeams-Adventskalender:${category}] ${msg}`),
            warn: (msg) => Log.warn(`[MMM-MyTeams-Adventskalender:${category}] ${msg}`),
            error: (msg) => Log.error(`[MMM-MyTeams-Adventskalender:${category}] ${msg}`)
        };
    },

    /**
     * Validate time string format (HH:MM)
     * Ensures hours are 00-23 and minutes are 00-59
     * Returns validated time or default fallback
     * @param {string} timeStr - Time string to validate
     * @returns {string} Valid time string (HH:MM format)
     */
    validateTimeFormat(timeStr) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(timeStr)) {
            Log.warn(`[MMM-MyTeams-Adventskalender] Invalid time format: "${timeStr}". Expected HH:MM (00:00-23:59). Using fallback 00:00`);
            return "00:00";
        }
        return timeStr;
    },

    /**
     * Get current date, using dateOverride if configured
     * Supports format: "YYYY-MM-DD hh:mm:ss"
     * @returns {Date} Date object for current or overridden date/time
     */
    getCurrentDate() {
        if (this.config.dateOverride) {
            const dateTimeRegex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;
            const match = this.config.dateOverride.match(dateTimeRegex);
            
            if (match) {
                const [, year, month, day, hours, minutes, seconds] = match.map(Number);
                return new Date(year, month - 1, day, hours, minutes, seconds);
            } else {
                Log.warn(`[MMM-MyTeams-Adventskalender] Invalid dateOverride format: "${this.config.dateOverride}". Expected "YYYY-MM-DD hh:mm:ss". Using current date.`);
                return new Date();
            }
        }
        return new Date();
    },

    /**
     * Initialize module state and load persistent door state
     * Sets up CSS variables for animation timing
     * Schedules automatic door opening if enabled
     */
    start() {
        Log.info("Starting module: " + this.name);
        
        // Validate CSP headers (warn if missing)
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            Log.warn("[Security] No Content-Security-Policy header detected. Consider adding CSP for enhanced security.");
        }
        
        this.doorState = null;
        this.sharedAudio = new Audio();
        this.currentPlayingDoorIndex = null;
        this.currentDoorLoader = null;
        this.doorOverlay = null;
        this.doorOverlayBackground = null;
        this.doorAudioMap = {};
        this.imageFilenameCache = {};
        this.countdownInterval = null;
        this.countdownElement = null;
        this.testMode = false;
        this.testSequentialMode = false;
        this.testAudioEndCallback = null;
        this.testVideoEndCallback = null;
        this.videoPlayedState = {};
        this.currentVideoPopup = null;
        this.videoModalOverlay = null;
        this.videoModalAutoCloseTimer = null;
        this.videoModalEscHandler = null;
        this.trophyContainer = null;
        this.door24TrophyDropScheduled = false; // Flag to prevent double-triggering

        // Initialize unified loggers for consistent error messages
        this.audioLogger = this.createLogger("Audio");
        this.videoLogger = this.createLogger("Video");
        this.giftLogger = this.createLogger("Gift");
        this.sleighLogger = this.createLogger("Sleigh");
        this.trophyLogger = this.createLogger("Trophy");
        this.performanceLogger = this.createLogger("Performance");
        this.accessibilityLogger = this.createLogger("Accessibility");
        this.securityLogger = this.createLogger("Security");
        
        this.config.autoopenat = this.validateTimeFormat(this.config.autoopenat);
        
        this.initializeVideoMap();
        this.applyPerformanceOptimizations();
        this.preloadImageFilenames();
        this.preloadAssets();
        this.generateTrophyStyles();
        
        document.documentElement.style.setProperty("--animation-time", this.config.openAnimationTime);
        document.documentElement.style.setProperty("--footer-image-animation-duration", `${this.config.footerImageAnimationDuration}s`);
        
        this.sendSocketNotification("SET_CONFIG", this.config);
        this.loadDoorState();
        if (this.config.autopen) {
            this.scheduleAutoOpen();
        }

        // Show onboarding tooltips on first load if enabled
        if (this.config.onboardingToolTips) {
            this.showOnboardingTooltips();
        }
    },

    /**
     * Show onboarding tooltips for first-time users
     * Displays helpful hints about calendar interaction
     * Only shows once per browser session unless forced
     */
    showOnboardingTooltips() {
        try {
            // Check if tooltips have already been shown in this session
            const tooltipShownKey = "MMM-MyTeams-Adventskalender-onboarding-shown";
            if (localStorage.getItem(tooltipShownKey)) {
                return; // Already shown in this session
            }

            // Mark as shown for this session
            localStorage.setItem(tooltipShownKey, "true");

            // Create tooltip overlay
            const tooltipOverlay = document.createElement("div");
            tooltipOverlay.id = "onboarding-overlay";
            tooltipOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
            `;

            // Create tooltip content
            const tooltipContent = document.createElement("div");
            tooltipContent.style.cssText = `
                background: linear-gradient(135deg, #0a5c0a, #003300);
                border: 3px solid #ffd700;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                text-align: center;
                color: white;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                position: relative;
            `;

            tooltipContent.innerHTML = `
                <h2 style="margin-top: 0; color: #ffd700; font-size: 24px;">🎄 Welcome to Your Advent Calendar! 🎄</h2>
                <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    <strong>How to use:</strong><br>
                    • Click any unlocked door to reveal its surprise<br>
                    • Doors unlock daily from December 1st to 24th<br>
                    • Some doors have audio, images, or videos<br>
                    • Use Tab key for keyboard navigation
                </p>
                <p style="font-size: 14px; color: #cccccc; margin: 15px 0;">
                    This message will only appear once. Enjoy your advent calendar! 🎅
                </p>
                <button id="onboarding-close" style="
                    background: #ffd700;
                    color: #003300;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 15px;
                    transition: background 0.3s;
                ">Got it! Let's begin 🎄</button>
            `;

            tooltipOverlay.appendChild(tooltipContent);
            document.body.appendChild(tooltipOverlay);

            // Add close button functionality
            const closeButton = tooltipContent.querySelector("#onboarding-close");
            const closeTooltip = () => {
                if (tooltipOverlay.parentNode) {
                    tooltipOverlay.remove();
                }
            };

            closeButton.addEventListener("click", closeTooltip);
            closeButton.addEventListener("mouseenter", () => {
                closeButton.style.background = "#ffed4e";
            });
            closeButton.addEventListener("mouseleave", () => {
                closeButton.style.background = "#ffd700";
            });

            // Allow clicking overlay to close
            tooltipOverlay.addEventListener("click", (e) => {
                if (e.target === tooltipOverlay) {
                    closeTooltip();
                }
            });

            // Add keyboard support (Escape to close)
            document.addEventListener("keydown", function closeOnEscape(e) {
                if (e.key === "Escape") {
                    closeTooltip();
                    document.removeEventListener("keydown", closeOnEscape);
                }
            });

            Log.info("[Onboarding] Welcome tooltip displayed for first-time user");

        } catch (error) {
            this.handleError("Failed to show onboarding tooltips", error);
        }
    },

    /**
     * Generate trophy drop animation styles
     * Creates a single reusable style tag with trophy keyframes to avoid memory leaks
     * Called once during module initialization
     */
    generateTrophyStyles() {
        if (document.getElementById("trophy-drop-styles")) return;
        
        const style = document.createElement("style");
        style.id = "trophy-drop-styles";
        
        let css = `
            @keyframes trophy-fall {
                0% {
                    transform: translateY(-500px) scale(0.5);
                    opacity: 1;
                }
                80% {
                    transform: translateY(20px) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateY(0px) scale(1);
                    opacity: 1;
                }
            }
            
            .trophy-falling {
                animation: trophy-fall 8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
                position: relative;
                z-index: 10000;
            }
        `;
        
        style.textContent = css;
        document.head.appendChild(style);
    },



    /**
     * Get the correct image file extension for a given day (async version)
     * Returns the proper filename including extension
     * Uses fetch instead of synchronous XHR for better performance
     * @param {number} dayNumber - The day number (1-24)
     * @returns {Promise<string>} The complete image filename with correct extension
     */
    async getImageFilename(dayNumber) {
        if (!this.imageFilenameCache) {
            this.imageFilenameCache = {};
        }
        
        if (this.imageFilenameCache[dayNumber]) {
            return this.imageFilenameCache[dayNumber];
        }
        
        const dayStr = String(dayNumber).padStart(2, "0");
        const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
        
        for (const ext of extensions) {
            const filename = `${dayStr}${ext}`;
            const fullPath = `${this.file("images")}/${filename}`;
            
            try {
                const response = await fetch(fullPath, { method: "HEAD" });
                if (response.ok) {
                    this.imageFilenameCache[dayNumber] = filename;
                    return filename;
                }
            } catch (e) {
                continue;
            }
        }
        
        this.imageFilenameCache[dayNumber] = `${dayStr}.jpg`;
        return `${dayStr}.jpg`;
    },

    /**
     * Get cached image filename (synchronous)
     * Returns filename from cache or default fallback
     * Safe to call from synchronous contexts like getDom()
     * @param {number} dayNumber - The day number (1-24)
     * @returns {string} The image filename with extension (from cache or default)
     */
    getImageFilenameSync(dayNumber) {
        if (!this.imageFilenameCache) {
            this.imageFilenameCache = {};
        }
        
        if (this.imageFilenameCache[dayNumber]) {
            return this.imageFilenameCache[dayNumber];
        }
        
        const dayStr = String(dayNumber).padStart(2, "0");
        return `${dayStr}.jpg`;
    },

    /**
     * Validate video source URL for security
     * Prevents XSS attacks by rejecting dangerous protocols and unknown hosts
     * @param {string} url - The URL to validate
     * @returns {boolean} True if URL is safe to use
     */
    isSafeVideoUrl(url) {
        if (!url || typeof url !== "string") {
            return false;
        }
        
        const lowerUrl = url.toLowerCase().trim();
        
        if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:")) {
            Log.error("[MMM-MyTeams-Adventskalender] Blocked dangerous protocol in URL:", url);
            return false;
        }
        
        if (lowerUrl.startsWith("https://youtu.be/") || 
            lowerUrl.startsWith("https://www.youtube.com/")) {
            return true;
        }
        
        if (lowerUrl.startsWith("https://www.tiktok.com/")) {
            return true;
        }
        
        if (lowerUrl.startsWith("/")) {
            return true;
        }
        
        Log.error("[MMM-MyTeams-Adventskalender] Blocked unsafe video URL:", url);
        return false;
    },

    /**
     * Initialize hardcoded video URL mapping for each door
     * @returns {void}
     */
    initializeVideoMap() {
        this.videoMap = {
            1:  "https://youtu.be/fPVDWWDGMI4",  // Brother Walfrid (5:33)
            2:  "https://youtu.be/hiaQVsMo4L0",  // Celtic`s first league match
            3:  "https://youtu.be/hiaQVsMo4L0",  // Celtic`s first team
            4:  "https://youtu.be/7OZ_frHck8w",  // Willy Malley (1:54) 
            5:  "https://youtu.be/rMcDwwsNis0",  // The Mighty Atom - Patsy Gallacher (59:02)  
            6:  "https://youtu.be/qUTK36M7SkE", // Jimmy McGrorry (19:23)
            7:  "https://youtu.be/-6wuVkXXLMQ", // Johnny Thomson (14:27)
            8:  "https://youtu.be/e13HptVD8eA", // Empire Exhibition Trophy ( 12)
            9:  "https://www.tiktok.com/@agrandoldtee/video/7568089198771588374?is_from_webapp=1&sender_device=pc",
            10: "https://youtu.be/7MX7so7Ir74", // Tommy Burns Tribute (5:27)
            11: "https://www.tiktok.com/@irish_on_tour/video/7495198542408076566?is_from_webapp=1&sender_device=pc",
            12: "https://youtu.be/idqqlN6HsR0",  // Hampden in the sun  (7:20)
            13: "https://youtu.be/kzZGbuoYJlY", // Jock Stein Tribute (3.00)
            14: "https://youtu.be/PNywvrjUmsE", // The Lisbon Lions (8:33)
            15: "https://youtu.be/4AUQW1Ticoo", // Jimmy Johnston (16:10)
            16: "https://youtu.be/tK9Hl5Bl6Bo", // 10 Men win the leauge (10:20)
            17: "https://youtu.be/c1DL2of4Kic", // Miracle at love street - Albert Kidd Day (3:07 
            18: "https://youtu.be/vRiAQNz1E4g", // Tommy Burns & The Centenery double (2:16)
            19: "https://youtu.be/YcxQrOM1gJo",  // Fergus - The Man who saved celtic (8.51)
            20: "https://youtu.be/75RCsX6AEO8",  // Henrick Larsson - every goal for Celtic (20:38)
            21: "https://youtu.be/fnZlpjIUVQA", // Celtic's UEFA Cup Final HEARTBREAK! (11:14),
            22: "https://youtu.be/rYHHn0udP9k", // Celtic FC v Barcalona - 125 Aniverery game (6:30)
            23: "https://youtu.be/fqD2fRgaado", // Celtic Invincibles Cup Final(6:54)
            24: "https://youtu.be/86daz1Y6LSw"  // Quadruple trebble (4:21)
        };
    },

    /**
     * Cleanup when module stops
     * Removes trophy container from DOM and cleans up all intervals, audio, video, and other resources
     */
    stop() {
        Log.info("Stopping module: " + this.name);
        
        // Clean up intervals
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.autoOpenCheckInterval) {
            clearInterval(this.autoOpenCheckInterval);
            this.autoOpenCheckInterval = null;
        }
        
        // Clean up pooled overlay elements
        if (this.doorOverlay) {
            try {
                this.doorOverlay.remove();
            } catch (e) {
                Log.warn("[Audio] Error removing door overlay");
            }
            this.doorOverlay = null;
        }
        if (this.doorOverlayBackground) {
            try {
                this.doorOverlayBackground.remove();
            } catch (e) {
                Log.warn("[Audio] Error removing door overlay background");
            }
            this.doorOverlayBackground = null;
        }
        
        // Clean up video resources
        if (this.currentVideoPopup) {
            try {
                this.currentVideoPopup.close();
            } catch (e) {
                Log.warn("[Video] Error closing video popup");
            }
            this.currentVideoPopup = null;
        }
        this.closeVideoModal();
        
        // Clean up trophy display
        this.trophyDropActive = false;
        if (this.trophyContainer && this.trophyContainer.parentNode) {
            try {
                this.trophyContainer.remove();
            } catch (e) {
                Log.warn("[Trophy] Error removing trophy container");
            }
            this.trophyContainer = null;
        }
        
        // Clean up trophy animation styles
        const trophyStyles = document.getElementById("trophy-drop-styles");
        if (trophyStyles) {
            try {
                trophyStyles.remove();
            } catch (e) {
                Log.warn("[Trophy] Error removing trophy styles");
            }
        }

        // Clean up door loader
        if (this.currentDoorLoader) {
            try {
                this.currentDoorLoader.remove();
            } catch (e) {
                Log.warn("[Audio] Error removing door loader");
            }
            this.currentDoorLoader = null;
        }
        
        // Clean up unmute buttons
        const unmuteButtons = document.querySelectorAll(".unmute-btn");
        unmuteButtons.forEach(btn => {
            try {
                btn.remove();
            } catch (e) {
                Log.warn("[Audio] Error removing unmute button");
            }
        });
        
        // Stop audio playback
        this.stopAudio();
    },

    /**
     * Apply performance optimizations for different device types
     * Caps snowflake count to prevent excessive DOM nodes
     * Respects prefers-reduced-motion for accessibility
     */
    applyPerformanceOptimizations() {
        const SNOWFLAKE_CAP = 300;
        const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        
        if (REDUCED_MOTION) {
            this.config.snowflakeCount = 0;
            this.performanceLogger.info("Reduced motion preference detected - snowflakes disabled");
        } else if (this.config.snowflakeCount > SNOWFLAKE_CAP) {
            this.performanceLogger.info(`Snowflake count capped at ${SNOWFLAKE_CAP} (config: ${this.config.snowflakeCount})`);
            this.config.snowflakeCount = SNOWFLAKE_CAP;
        }
        
        // Check device memory if available
        if (navigator.deviceMemory && navigator.deviceMemory < 4) {
            this.config.snowflakeCount = Math.min(this.config.snowflakeCount, 150);
            this.performanceLogger.info("Low-memory device detected, reducing snowflakes to 150");
        }
    },

    /**
     * Preload image filenames for all 24 doors asynchronously
     * This prevents blocking the UI when checking file extensions
     */
    preloadImageFilenames() {
        if (!this.imageFilenameCache) {
            this.imageFilenameCache = {};
        }

        for (let dayNumber = 1; dayNumber <= 24; dayNumber++) {
            this.getImageFilename(dayNumber).catch(e => {
                Log.warn(`[Image] Failed to preload filename for day ${dayNumber}:`, e);
            });
        }
    },

    /**
     * Centralized error handler for consistent logging and debugging
     * @param {string} context - Description of where error occurred
     * @param {Error} error - The error object
     * @param {boolean} isCritical - Whether this is a critical error
     */
    handleError(context, error, isCritical = false) {
        const level = isCritical ? "error" : "warn";
        const logFn = isCritical ? Log.error : Log.warn;
        logFn(`[MMM-MyTeams-Adventskalender] ${context}:`, error);
        
        if (isCritical && this.config.debug) {
            console.trace(error);
        }
    },

    /**
     * Schedule auto-opening of today's door using intervals instead of setTimeout
     * Checks every minute and handles sleep/wake transitions
     */
    scheduleAutoOpen() {
        this.autoOpenedToday = false;
        
        this.checkAndAutoOpen();
        
        this.autoOpenCheckInterval = setInterval(() => {
            this.checkAndAutoOpen();
        }, 60000);
        
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                this.checkAndAutoOpen();
            }
        });
        
        Log.info("[Auto-Open] Scheduled auto-open checking every 60 seconds");
    },

    /**
     * Check if current time matches auto-open time and open today's door
     */
    checkAndAutoOpen() {
        try {
            const now = new Date();
            const configTime = this.config.autoopenat.split(":");
            const targetHour = parseInt(configTime[0], 10);
            const targetMinute = parseInt(configTime[1], 10);
            
            if (now.getHours() === targetHour && now.getMinutes() === targetMinute) {
                if (!this.autoOpenedToday) {
                    this.openTodaysDoor();
                    this.autoOpenedToday = true;
                    Log.info(`[Auto-Open] Opened today's door at ${targetHour}:${String(targetMinute).padStart(2, "0")}`);
                }
            } else if (now.getHours() > targetHour || 
                       (now.getHours() === targetHour && now.getMinutes() > targetMinute)) {
                this.autoOpenedToday = false;
            }
        } catch (error) {
            this.handleError("Auto-open check failed", error);
        }
    },

    /**
     * Open today's door (called by auto-open)
     */
    openTodaysDoor() {
        try {
            const today = new Date().getDate();
            const doorIndex = this.doorState.numbers.indexOf(today);
            
            if (doorIndex !== -1) {
                const door = document.querySelector(`[data-door-index="${doorIndex}"]`);
                if (door && !door.classList.contains("opened")) {
                    door.click();
                }
            }
        } catch (error) {
            this.handleError("Failed to open today's door", error);
        }
    },

    /**
     * Preload all media assets with priority queue strategy
     * High priority: today + nearby doors
     * Background priority: remaining doors (deferred)
     * Prevents delays when opening later doors
     */
    preloadAssets() {
        try {
            const today = new Date().getDate();
            const nearbyDoors = [today, today - 1, today + 1, today + 2]
                .filter(d => d >= 1 && d <= 24);
            
            const preloadAsset = (dayNumber) => {
                const dayStr = String(dayNumber).padStart(2, "0");
                const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
                
                for (const ext of extensions) {
                    const img = new Image();
                    img.src = `${this.file("images")}/${dayStr}${ext}`;
                }
                
                const audio = new Audio();
                audio.src = `${this.file("audio")}/${dayStr}.mp3`;
            };
            
            nearbyDoors.forEach(day => preloadAsset(day));
            Log.info(`[Assets] Preloaded nearby doors: ${nearbyDoors.join(", ")}`);
            
            setTimeout(() => {
                const remainingDoors = [];
                for (let i = 1; i <= 24; i++) {
                    if (!nearbyDoors.includes(i)) {
                        remainingDoors.push(i);
                    }
                }
                
                remainingDoors.forEach(day => preloadAsset(day));
                Log.info(`[Assets] Preloaded remaining ${remainingDoors.length} door assets in background`);
            }, 2000);
            
        } catch (error) {
            this.handleError("Asset preloading failed", error);
        }
    },

    /**
     * Load required JavaScript files including translations
     * @returns {Array} Array of script file paths
     */
    getScripts() {
        return [this.file("translations.js")];
    },

    /**
     * Load CSS stylesheets
     * @returns {Array} Array of CSS file names
     */
    getStyles() {
        return ["MMM-MyTeams-Adventskalender.css"];
    },

    /**
     * Get translated string for current language
     * Falls back to English if translation not found
     * @param {string} key - Translation key
     * @returns {string} Translated string or fallback
     */
    translate(key) {
        if (typeof getTranslation === "function") {
            return getTranslation(this.config.language || "en", key);
        }
        return key;
    },

    /**
     * Build the DOM structure for the advent calendar
     * Creates the main wrapper with background image and door grid
     * Includes elf procession animation at bottom
     * @returns {HTMLElement} The main calendar DOM element
     */
    getDom() {
        if (!this.doorState) {
            const loadingDiv = document.createElement("div");
            loadingDiv.textContent = "Loading...";
            loadingDiv.style.padding = "20px";
            loadingDiv.style.textAlign = "center";
            loadingDiv.style.color = "#fff";
            return loadingDiv;
        }

        this.generateSnowfallStyles();
        
        const wrapper = document.createElement("div");
        const isFullscreen = this.config.moduleWidth === "100%" || this.config.moduleHeight === "100%";
        
        if (isFullscreen) {
            wrapper.style.width = "100vw";
            wrapper.style.height = "100vh";
            wrapper.style.position = "fixed";
            wrapper.style.top = "0";
            wrapper.style.left = "0";
        } else {
            wrapper.style.width = typeof this.config.moduleWidth === 'string' ? this.config.moduleWidth : `${this.config.moduleWidth}px`;
            wrapper.style.height = typeof this.config.moduleHeight === 'string' ? this.config.moduleHeight : `${this.config.moduleHeight}px`;
            wrapper.style.position = "relative";
        }
        wrapper.style.overflow = "hidden";
        wrapper.style.boxShadow = "4px 8px 16px rgba(0, 0, 0, 0.5)";
        wrapper.className = "advent-calendar-celtic";

        const background = document.createElement("img");
        background.dataset.background = "true";
        background.style.width = "100%";
        background.style.height = "100%";
        background.style.objectFit = "cover";
        background.style.position = "absolute";
        background.style.left = "0";
        background.style.top = "0";
        background.style.zIndex = "0";
        
        if (this.config.backgroundImage) {
            let imagePath = this.config.backgroundImage;
            if (!imagePath.includes("/") && !imagePath.includes("\\") && !imagePath.startsWith("http")) {
                imagePath = `${this.file("images")}/${imagePath}`;
            }
            background.src = imagePath;
            background.style.display = "block";
            background.onerror = () => {
                Log.error(`Failed to load background image: ${this.config.backgroundImage}`);
            };
            background.onload = () => {
                Log.info(`Successfully loaded background image: ${this.config.backgroundImage}`);
            };
        } else {
            background.src = "";
            background.style.display = "none";
        }
        wrapper.appendChild(background);

        // Create door grid
        const doors = this.createDoors();
        wrapper.appendChild(doors);

        // Create animated Santa sleigh (if enabled) - behind snowflakes but above doors
        if (this.config.sleighEnabled) {
            Log.info("[Sleigh] Creating sleigh, giftsFromSanta:", this.config.giftsFromSanta);
            const sleigh = this.createAnimatedSleigh();
            wrapper.appendChild(sleigh);
        }

        // Create falling snowflakes (if enabled)
        if (this.config.snowflakesEnabled) {
            const snowflakes = this.createSnowflakes();
            wrapper.appendChild(snowflakes);
        }

        // Create footer images procession at the bottom (if enabled)
        if (this.config.footerImageEnabled) {
            const footerImages = this.createFooterImageProcession();
            wrapper.appendChild(footerImages);
        }

        // Start sequential door testing if enabled (delay until after asset preloading)
        if (this.config.testSequentially) {
            setTimeout(() => {
                Log.info("[Test] All assets preloaded, starting sequential test");
                this.testDoorsSequentially();
            }, 2500);
        }

        // Start open all doors test if enabled (delay until after asset preloading)
        if (this.config.openAllDoorsTest) {
            setTimeout(() => {
                Log.info("[Test] All assets preloaded, starting open all doors test");
                this.testOpenAllDoors();
            }, 2500);
        }

        return wrapper;
    },

    /**
     * Create and layout 24 doors in a 6x4 grid
     * Handles door opening/closing logic and state management
     * Sets up event listeners for door interaction and audio playback
     * @returns {HTMLElement} Container with all 24 doors
     */
    createDoors() {
        const doorsContainer = document.createElement("div");
        doorsContainer.className = "doors-container";
        doorsContainer.style.position = "relative";
        doorsContainer.style.zIndex = "1";
        doorsContainer.style.width = "100%";
        doorsContainer.style.height = "100%";

        // Parse module dimensions - handle both pixel values and percentages
        const parseNum = (val) => {
            if (typeof val === 'string' && val.includes('%')) {
                return 100;
            }
            return typeof val === 'string' ? parseInt(val) : val;
        };

        const widthBase = parseNum(this.config.moduleWidth);
        const heightBase = parseNum(this.config.moduleHeight);

        // Calculate door dimensions using percentages for responsive layout
        const doorWidthPercent = (100 - (this.config.doorMargin / 10 * 7)) / 6;
        const doorHeightPercent = (100 - (this.config.doorMargin / 10 * 5) - 15) / 4;

        let baseDate = new Date();
        if (this.config.dateOverride) {
            baseDate = new Date(this.config.dateOverride);
        }
        const today = baseDate.getDate();
        const month = baseDate.getMonth();
        const year = baseDate.getFullYear();
        const [hours, minutes] = this.config.autoopenat.split(":").map(Number);
        const autoopenTime = new Date();
        autoopenTime.setHours(hours, minutes, 0);

        // Check if date is within December 1-24
        const isWithinAdventRange = month === 11 && today >= 1 && today <= 24;

        // Calculate margin percentage equivalent
        const marginPercent = (this.config.doorMargin / 10);
        
        // Set CSS variables for door layout optimization
        doorsContainer.style.setProperty("--door-width-percent", `${doorWidthPercent}%`);
        doorsContainer.style.setProperty("--door-height-percent", `${doorHeightPercent}%`);
        doorsContainer.style.setProperty("--margin-percent", `${marginPercent}%`);
        doorsContainer.style.setProperty("--door-grid-offset", "40px");

        // Create 24 doors
        for (let i = 0; i < 24; i++) {
            const door = document.createElement("div");
            door.className = "door-celtic";
            door.dataset.doorIndex = i;
            
            door.setAttribute("role", "button");
            door.setAttribute("aria-label", `${this.translate("door")} ${this.doorState.numbers[i]}`);
            door.setAttribute("tabindex", "0");

            // Calculate grid position (6 columns, 4 rows)
            const col = i % 6;
            const row = Math.floor(i / 6);

            door.style.setProperty("--door-col", col);
            door.style.setProperty("--door-row", row);
            door.style.width = `calc(${doorWidthPercent}% - ${marginPercent}%)`;
            door.style.height = `calc(${doorHeightPercent}% - ${marginPercent}%)`;
            door.style.left = `calc(${col * (doorWidthPercent + marginPercent)}% + ${marginPercent}%)`;
            door.style.top = `calc(${row * (doorHeightPercent + marginPercent)}% + ${marginPercent}% + 40px)`;
            door.style.position = "absolute";

            // Create door number display
            const number = document.createElement("span");
            number.textContent = this.doorState.numbers[i];
            number.className = "door-number";
            door.appendChild(number);

            // Create and load door image with fallback extension handling
            const img = document.createElement("img");
            const doorNumber = this.doorState.numbers[i];
            const dayStr = String(doorNumber).padStart(2, "0");
            const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
            let imageLoaded = false;
            
            const tryNextExtension = (extIndex) => {
                if (extIndex >= extensions.length) {
                    this.handleError(`No valid image found for door ${doorNumber}`, new Error(`Tried all extensions: ${extensions.join(', ')}`));
                    img.style.display = "none";
                    return;
                }
                
                const ext = extensions[extIndex];
                const filename = `${dayStr}${ext}`;
                const imagePath = `${this.file("images")}/${filename}`;
                
                img.onload = () => {
                    imageLoaded = true;
                    this.imageFilenameCache[doorNumber] = filename;
                    Log.info(`[Image] Successfully loaded image for door ${doorNumber}: ${filename}`);
                };
                
                img.onerror = () => {
                    if (!imageLoaded) {
                        tryNextExtension(extIndex + 1);
                    }
                };
                
                img.src = imagePath;
            };
            
            const cachedFilename = this.getImageFilenameSync(doorNumber);
            img.className = "door-image";
            img.alt = `${this.translate("dayPrefix")} ${doorNumber}`;
            
            if (cachedFilename && cachedFilename !== `${dayStr}.jpg`) {
                img.src = `${this.file("images")}/${cachedFilename}`;
            } else {
                tryNextExtension(0);
            }
            
            door.appendChild(img);

            // Generate audio file name and store mapping
            this.doorAudioMap[i] = `${this.file("audio")}/${String(this.doorState.numbers[i]).padStart(2, "0")}.mp3`;

            const hasVideo = (this.config.videoSource === "folder") || (this.videoMap[doorNumber] && this.videoMap[doorNumber].trim() !== "");
            if (hasVideo) {
                const videoIndicator = document.createElement("div");
                videoIndicator.className = `video-indicator video-indicator-positioned ${this.config.allowVideoPlay ? 'unplayed' : 'disabled'}`;
                videoIndicator.dataset.doorNumber = doorNumber;
                videoIndicator.textContent = "▶";
                
                videoIndicator.setAttribute("role", "button");
                videoIndicator.setAttribute("aria-label", `${this.translate("playVideo")} ${this.translate("door")} ${doorNumber}`);
                videoIndicator.setAttribute("tabindex", this.config.allowVideoPlay ? "0" : "-1");
                
                if (this.config.allowVideoPlay) {
                    videoIndicator.addEventListener("click", (event) => {
                        event.stopPropagation();
                        Log.info(`[Video] User clicked video indicator for door ${doorNumber}`);
                        this.playVideo(doorNumber);
                    });
                    
                    videoIndicator.addEventListener("keydown", (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            this.playVideo(doorNumber);
                        }
                    });
                }
                
                door.appendChild(videoIndicator);
            }

            // Auto-open doors that are before today or equal to today after autoopen time
            // BUT ONLY if we are within the December 1-24 advent range
            if (
                this.config.autopen &&
                isWithinAdventRange &&
                (doorNumber < today || 
                (doorNumber === today && baseDate >= autoopenTime))
            ) {
                this.doorState.opened[i] = true;
            }

            // Close all doors if closeAllDoors is enabled
            if (this.config.closeAllDoors) {
                this.doorState.opened[i] = false;
                
                // If within advent range, apply special styling to past and current day doors
                if (isWithinAdventRange) {
                    if (doorNumber < today) {
                        door.classList.add("door-past-day");
                    } else if (doorNumber === today) {
                        door.classList.add("door-today");
                    }
                }
            }

            // Set initial state of door (opened/closed/locked)
            if (this.doorState.opened[i]) {
                door.classList.add("opened");
                img.classList.add("door-image-visible");
                number.style.visibility = "hidden";
            } else if (isWithinAdventRange && doorNumber > today) {
                // Lock future doors only in December - prevent interaction
                door.classList.add("door-locked-no-interact");
                door.classList.add("locked");
                door.dataset.day = doorNumber;
            }

            door.dataset.doorIndex = i;
            
            // Add keyboard navigation listener for accessibility
            door.addEventListener("keydown", (event) => {
                if ((event.key === "Enter" || event.key === " ") && !door.classList.contains("locked")) {
                    event.preventDefault();
                    this.handleDoorInteraction(door, i);
                }
            });

            doorsContainer.appendChild(door);
        }

        // Delegated event listeners for click and animation
        doorsContainer.addEventListener("click", (e) => {
            const door = e.target.closest(".door-celtic");
            if (door && !door.classList.contains("locked")) {
                const doorIndex = parseInt(door.dataset.doorIndex, 10);
                this.handleDoorInteraction(door, doorIndex);
            }
        });

        // Delegated animation end handler for all doors
        doorsContainer.addEventListener("animationend", (e) => {
            this.handleDoorAnimationEnd(e);
        });

        return doorsContainer;
    },

    /**
     * Handle door interaction (delegated click event handler)
     * Toggles door open/closed state and manages audio playback
     * @param {HTMLElement} door - The door element that was clicked
     * @param {number} doorIndex - The index of the door in the grid
     */
    handleDoorInteraction(door, doorIndex) {
        try {
            const number = door.querySelector("span.door-number");
            const img = door.querySelector("img.door-image");
            
            if (door.classList.contains("opened")) {
                door.classList.remove("opened");
                door.classList.add("closing");
                if (number) number.style.visibility = "visible";
                if (img) img.classList.remove("door-image-visible");
                this.stopAudio();
            } else if (!door.classList.contains("opening")) {
                door.classList.add("opening");
                if (number) number.style.visibility = "hidden";
                if (img) img.classList.remove("door-image-visible");
            }
            
            this.doorState.opened[doorIndex] = door.classList.contains("opened") || door.classList.contains("opening");
            this.sendSocketNotification("SAVE_DOOR_STATE", this.doorState);
        } catch (error) {
            this.handleError("Door interaction failed", error);
        }
    },

    /**
     * Handle door animation end events (delegated handler)
     * Processes opening/closing animation completion
     * @param {AnimationEvent} event - The animation end event
     */
    handleDoorAnimationEnd(event) {
        try {
            if (event.animationName !== "rotate-door-celtic") {
                return;
            }
            
            const door = event.target.closest(".door-celtic");
            if (!door) {
                return;
            }

            const number = door.querySelector("span.door-number");
            const img = door.querySelector("img.door-image");
            const doorIndex = parseInt(door.dataset.doorIndex, 10);
            
            if (door.classList.contains("opening")) {
                // Opening animation complete
                if (img) img.classList.add("door-image-visible");
                if (number) number.style.visibility = "hidden";
                door.classList.remove("opening");
                door.classList.add("opened");
                
                // Check if door 24 was opened - trophy drop will be triggered by video completion
                const doorNumber = this.doorState.numbers[doorIndex];
                if (doorNumber === 24) {
                    Log.info("[Door24] Door 24 opened! Trophy drop will occur after video completion.");
                    // Trophy drop is now handled in video completion handlers
                }
                
                // Play audio when door is fully open
                if (this.config.audioEnabled) {
                    this.playAudio(doorIndex);
                }
            } else if (door.classList.contains("closing")) {
                // Closing animation complete
                if (img) img.classList.remove("door-image-visible");
                if (number) number.style.visibility = "visible";
                door.classList.remove("closing");
                door.classList.remove("opened");
                
                const doorNumber = this.doorState.numbers[doorIndex];
                this.doorState.opened[doorNumber - 1] = false;
                this.sendSocketNotification("SAVE_DOOR_STATE", this.doorState);
            }
        } catch (error) {
            this.handleError("Animation end handler failed", error);
        }
    },

    /**
     * Create animated Santa sleigh that traverses the screen
     * Optionally drops trophies as it moves
     * @returns {HTMLElement} Container with animated sleigh
     */
    createAnimatedSleigh() {
        const sleighContainer = document.createElement("div");
        sleighContainer.className = "santa-sleigh-container";

        const sleighGroup = document.createElement("div");
        sleighGroup.className = "sleigh-group";
        
        const sleighImg = document.createElement("img");
        sleighImg.src = `${this.file("images")}/${this.config.sleighImage}`;
        sleighImg.alt = "Santa's Sleigh";
        sleighImg.className = "sleigh-image";
        sleighImg.style.width = "150px";
        sleighImg.style.height = "auto";
        
        sleighGroup.appendChild(sleighImg);
        sleighContainer.appendChild(sleighGroup);

        const animationName = this.config.sleighDirection === "right-to-left" ? "sleigh-arc-rtl" : "sleigh-arc";
        sleighGroup.style.animation = `${animationName} ${this.config.sleighSpeed}s ease-in-out infinite`;

        if (this.config.giftsFromSanta) {
            Log.info("[Trophy] Setting up trophy dropping system");
            const trophyContainer = document.createElement("div");
            trophyContainer.className = "trophy-container";
            trophyContainer.style.position = "fixed";
            trophyContainer.style.bottom = "120px";
            trophyContainer.style.left = "50%";
            trophyContainer.style.transform = "translateX(-50%)";
            trophyContainer.style.zIndex = "1";
            trophyContainer.style.pointerEvents = "none";
            trophyContainer.style.width = "200px";
            trophyContainer.style.height = "200px";
            trophyContainer.style.display = "flex";
            trophyContainer.style.alignItems = "flex-end";
            trophyContainer.style.justifyContent = "center";
            document.body.appendChild(trophyContainer);

            this.trophyContainer = trophyContainer;
            Log.info("[Trophy] Trophy container created, starting drop loop");
            this.trophyDropLoop(sleighGroup);
        }

        return sleighContainer;
    },

    /**
     * Drop trophies from sleigh at intervals
     * Trophies fall and settle in the center
     * @param {HTMLElement} sleighGroup - The sleigh element
     */
    trophyDropLoop(sleighGroup) {
        const dropDelay = Math.max(1, Math.min(this.config.giftDropDelay || 2, 8));
        const speed = this.config.sleighSpeed;
        const trophyImages = ["trophy1.png", "trophy2.png", "trophy3.png"];
        let trophyIndex = 0;

        const dropNextTrophy = () => {
            if (!this.trophyContainer || !this.trophyDropActive) {
                Log.info("[Trophy] Drop loop stopped: container?", !!this.trophyContainer, "active?", this.trophyDropActive);
                return;
            }

            Log.info(`[Trophy] Dropping trophy ${(trophyIndex % 3) + 1}`);
            const trophyImg = document.createElement("img");
            const trophyFile = trophyImages[trophyIndex % trophyImages.length];
            trophyImg.src = `${this.file("images")}/${trophyFile}`;
            trophyImg.alt = `Trophy ${trophyIndex + 1}`;
            trophyImg.className = "falling-trophy";
            trophyImg.style.width = "60px";
            trophyImg.style.height = "auto";
            trophyImg.style.position = "absolute";
            trophyImg.style.left = "50%";
            trophyImg.style.transform = "translateX(-50%)";
            trophyImg.style.zIndex = "0.5";
            trophyImg.style.top = "-80px";

            const fallDuration = 3 + (Math.random() * 2);
            const keyframeId = `trophy-fall-${Math.random().toString(36).substr(2, 9)}`;
            
            const css = `
                @keyframes ${keyframeId} {
                    0% {
                        top: -80px;
                        opacity: 1;
                        transform: translateX(-50%) rotate(0deg);
                    }
                    70% {
                        opacity: 1;
                    }
                    100% {
                        top: 120px;
                        opacity: 1;
                        transform: translateX(-50%) rotate(0deg);
                    }
                }
            `;
            
            const style = document.createElement("style");
            style.textContent = css;
            document.head.appendChild(style);

            trophyImg.style.animation = `${keyframeId} ${fallDuration}s ease-in forwards`;
            this.trophyContainer.appendChild(trophyImg);

            setTimeout(() => {
                trophyImg.remove();
                style.remove();
            }, fallDuration * 1000);

            trophyIndex++;
            if (this.trophyDropActive) {
                setTimeout(dropNextTrophy, dropDelay * 1000);
            }
        };

        dropNextTrophy();
    },

    /**
     * Create animated footer image procession at bottom of calendar
     * Footer images flank a countdown banner in the center
     * @returns {HTMLElement} Container with animated footer images
     */
    createFooterImageProcession() {
        const processionContainer = document.createElement("div");
        processionContainer.className = "footer-image-procession footer-procession-container";

        const footerLineContainer = document.createElement("div");
        footerLineContainer.className = "footer-line footer-animation-line";

        const animationName = this.config.footerImageDirection === "right-to-left" ? "scroll-footer-rtl" : "scroll-footer";
        footerLineContainer.style.animation = `${animationName} ${this.config.footerImageAnimationDuration}s linear infinite`;

        // Parse footerImages config - can be string or array
        let imageArray = [];
        if (typeof this.config.footerImages === 'string') {
            imageArray = [this.config.footerImages];
        } else if (Array.isArray(this.config.footerImages)) {
            imageArray = this.config.footerImages;
        }

        // Create footer images on left side of banner (0 to n in order)
        for (let i = 0; i < this.config.footerImageCount; i++) {
            const imagePath = imageArray[i % imageArray.length];
            const footerImage = this.createFooterImage(i, imagePath);
            footerLineContainer.appendChild(footerImage);
        }

        // Create countdown banner in center
        const bannerRope = this.createCountdownBannerWithRope();
        footerLineContainer.appendChild(bannerRope);

        // Create footer images on right side of banner (n to 0 in reverse)
        for (let i = this.config.footerImageCount - 1; i >= 0; i--) {
            const imagePath = imageArray[i % imageArray.length];
            const footerImage = this.createFooterImage(i, imagePath);
            footerLineContainer.appendChild(footerImage);
        }

        processionContainer.appendChild(footerLineContainer);

        // Start countdown update interval
        this.countdownInterval = setInterval(() => {
            this.updateFooterCountdown();
        }, 1000);
        this.updateFooterCountdown();

        return processionContainer;
    },

    /**
     * Create countdown banner
     * @returns {HTMLElement} Container with countdown banner
     */
    createCountdownBannerWithRope() {
        const bannerContainer = document.createElement("div");
        bannerContainer.className = "banner-container";
        bannerContainer.style.display = "flex";
        bannerContainer.style.flexDirection = "row";
        bannerContainer.style.alignItems = "center";
        bannerContainer.style.justifyContent = "center";

        const banner = document.createElement("div");
        banner.className = "countdown-banner";
        banner.style.display = "flex";
        banner.style.alignItems = "center";
        banner.style.justifyContent = "center";
        banner.style.minWidth = "160px";
        banner.style.height = "45px";
        banner.style.background = "rgba(0, 0, 0, 0.6)";
        banner.style.border = "4px solid #00aa00";
        banner.style.borderRadius = "8px";
        banner.style.boxShadow = "0 4px 12px rgba(0, 170, 0, 0.4)";
        banner.style.padding = "0 15px";

        // Countdown To Christmas text
        const countdownText = document.createElement("div");
        countdownText.className = "countdown-text";
        countdownText.style.fontSize = "20px";
        countdownText.style.fontWeight = "bold";
        countdownText.style.textShadow = "2px 2px 4px rgba(0, 0, 0, 0.5)";
        countdownText.style.letterSpacing = "2px";
        countdownText.style.color = "#FFFFFF";  
        countdownText.style.display = "flex";
        countdownText.style.gap = "4px";
        countdownText.style.flexWrap = "wrap";
        countdownText.style.justifyContent = "center";
        countdownText.style.alignItems = "center";
        countdownText.textContent = this.translate("Countdown To Christmas");
        banner.appendChild(countdownText);
        
        this.countdownElement = countdownText;

        bannerContainer.appendChild(banner);
        return bannerContainer;
    },

    /**
     * Update countdown timer for footer banner
     * Shows special Christmas Eve message at 23:59:59 on December 24
     */
    updateFooterCountdown() {
        try {
            const now = this.getCurrentDate();
            const currentYear = now.getFullYear();
            const month = now.getMonth();
            const date = now.getDate();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            
            const isChristmasEveAtMidnight = (month === 11 && date === 24 && hours === 23 && minutes === 59 && seconds === 59);
            
            if (this.countdownElement) {
                this.countdownElement.innerHTML = "";
                
                if (isChristmasEveAtMidnight) {
                    Log.info("[Christmas] 23:59:59 on Christmas Eve detected!");
                    
                    const christmasMessage = this.translate("Merry Christmas Message");
                    const span = document.createElement("span");
                    span.style.color = "#ffd700";
                    span.style.fontWeight = "bold";
                    span.style.fontSize = "16px";
                    span.textContent = christmasMessage;
                    this.countdownElement.appendChild(span);
                    
                    this.switchToPostDoor24Background();
                } else {
                    let christmas = new Date(currentYear, 11, 25);
                    
                    if (now > christmas) {
                        christmas = new Date(currentYear + 1, 11, 25);
                    }

                    const timeRemaining = christmas - now;
                    
                    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

                    const parts = [
                        { text: this.translate("Countdown To Christmas") + " - ", color: "#FFFFFF", isBold: true },
                        { text: String(days).padStart(2, "0"), color: "#00aa00", isBold: true },
                        { text: ":", color: "#ffd700", isBold: true },
                        { text: String(hours).padStart(2, "0"), color: "#00aa00", isBold: true },
                        { text: ":", color: "#ffd700", isBold: true },
                        { text: String(minutes).padStart(2, "0"), color: "#00aa00", isBold: true }
                    ];

                    for (let part of parts) {
                        const span = document.createElement("span");
                        span.style.color = part.color;
                        span.style.fontWeight = part.isBold ? "bold" : "normal";
                        span.textContent = part.text;
                        this.countdownElement.appendChild(span);
                    }
                }
            }
        } catch (error) {
            Log.error("Error updating footer countdown:", error);
        }
    },
    
    /**
     * Switch to post-Door 24 background image at 23:59:59 on Christmas Eve
     */
    switchToPostDoor24Background() {
        try {
            if (!this.config.postDoor24Image) {
                Log.info("[Christmas] No postDoor24Image configured");
                return;
            }
            
            const backgroundElements = document.querySelectorAll("img[data-background='true']");
            if (backgroundElements.length === 0) {
                Log.warn("[Christmas] No background image element found");
                return;
            }
            
            backgroundElements.forEach(bg => {
                let imagePath = this.config.postDoor24Image;
                
                if (!imagePath.includes("/") && !imagePath.includes("\\") && !imagePath.startsWith("http")) {
                    imagePath = `${this.file("images")}/${imagePath}`;
                }
                
                bg.src = imagePath;
                bg.style.display = "block";
                Log.info(`[Christmas] Background switched to: ${imagePath}`);
            });
        } catch (error) {
            Log.error("[Christmas] Error switching background:", error);
        }
    },

    /**
     * Test doors sequentially - closes all doors first, then opens each door 1-24 in order
     * For each door: plays audio, then plays video, then moves to next door
     * Sequence continues when media ends or is manually closed
     */
    testDoorsSequentially() {
        Log.info("[Test] Starting testDoorsSequentially");
        this.testMode = true;
        this.testSequentialMode = true;
        this.testSequentialTimeouts = [];
        
        const closeAllDoors = () => {
            Log.info("[Test] Closing all doors");
            const doors = document.querySelectorAll(".door-celtic");
            doors.forEach((door) => {
                const number = door.querySelector("span");
                const img = door.querySelector("img");
                
                door.classList.remove("opened");
                door.classList.remove("opening");
                door.classList.remove("closing");
                if (number) number.style.visibility = "visible";
                if (img) img.style.display = "none";
            });
            this.stopAudio();
        };
        
        const clearTestTimeouts = () => {
            this.testSequentialTimeouts.forEach(id => clearTimeout(id));
            this.testSequentialTimeouts = [];
        };
        
        const processDoor = (doorNumber) => {
            if (doorNumber > 24) {
                Log.info("[Test] All 24 doors tested sequentially");
                this.testMode = false;
                this.testSequentialMode = false;
                clearTestTimeouts();
                return;
            }
            
            const gridIndex = this.doorState.numbers.indexOf(doorNumber);
            if (gridIndex === -1) {
                Log.warn(`[Test] Door ${doorNumber} not found in grid`);
                const id = setTimeout(() => processDoor(doorNumber + 1), 1000);
                this.testSequentialTimeouts.push(id);
                return;
            }
            
            const door = document.querySelector(`[data-door-index="${gridIndex}"]`);
            if (!door) {
                const id = setTimeout(() => processDoor(doorNumber + 1), 1000);
                this.testSequentialTimeouts.push(id);
                return;
            }
            
            Log.info(`[Test] Processing door ${doorNumber} (gridIndex: ${gridIndex})`);
            
            const number = door.querySelector("span");
            const img = door.querySelector("img");
            
            number.style.visibility = "hidden";
            img.style.display = "block";
            door.classList.add("opened");
            
            let audioPhaseEnded = false;
            
            this.testAudioEndCallback = () => {
                if (audioPhaseEnded) return;
                audioPhaseEnded = true;
                Log.info(`[Test] Audio ended for door ${doorNumber}`);
                const id = setTimeout(() => {
                    startVideo(doorNumber, gridIndex);
                }, 500);
                this.testSequentialTimeouts.push(id);
            };
            
            Log.info(`[Test] Playing audio for door ${doorNumber}`);
            this.playAudio(gridIndex);
            
            let audioTimeout = this.config.testDoorDuration || 10;
            if (audioTimeout < 5) {
                audioTimeout = 10;
            }
            const audioTimeoutId = setTimeout(() => {
                if (!audioPhaseEnded) {
                    Log.warn(`[Test] Audio timeout for door ${doorNumber} after ${audioTimeout}s, advancing...`);
                    audioPhaseEnded = true;
                    this.testAudioEndCallback = null;
                    const id = setTimeout(() => {
                        startVideo(doorNumber, gridIndex);
                    }, 500);
                    this.testSequentialTimeouts.push(id);
                }
            }, audioTimeout * 1000);
            this.testSequentialTimeouts.push(audioTimeoutId);
        };
        
        const startVideo = (doorNumber, gridIndex) => {
            this.stopAudio();
            
            let videoPhaseEnded = false;
            let popupCheckId = null;
            let modalCheckId = null;
            let modalWasShown = false;
            let popupWasShown = false;
            let videoTimeoutId = null;
            
            this.testVideoEndCallback = () => {
                Log.info(`[Test] Video callback triggered for door ${doorNumber}`);
                endVideoPhase();
            };
            
            popupCheckId = setInterval(() => {
                if (this.currentVideoPopup) {
                    popupWasShown = true;
                    if (this.currentVideoPopup.closed) {
                        Log.info(`[Test] User closed video popup for door ${doorNumber}`);
                        endVideoPhase();
                    }
                }
            }, 200);
            
            modalCheckId = setInterval(() => {
                if (this.videoModalOverlay) {
                    modalWasShown = true;
                }
                if (modalWasShown && !this.videoModalOverlay) {
                    Log.info(`[Test] Video modal closed for door ${doorNumber}`);
                    endVideoPhase();
                }
            }, 200);
            
            const endVideoPhase = () => {
                if (videoPhaseEnded) return;
                videoPhaseEnded = true;
                
                clearInterval(popupCheckId);
                clearInterval(modalCheckId);
                if (videoTimeoutId) clearTimeout(videoTimeoutId);
                this.testVideoEndCallback = null;
                
                if (this.currentVideoPopup) {
                    try { this.currentVideoPopup.close(); } catch (e) {}
                    this.currentVideoPopup = null;
                }
                this.closeVideoModal();
                
                Log.info(`[Test] Closing door ${doorNumber}`);
                const currentGridIndex = this.doorState.numbers.indexOf(doorNumber);
                const door = document.querySelector(`[data-door-index="${currentGridIndex}"]`);
                if (door) {
                    const number = door.querySelector("span");
                    const img = door.querySelector("img");
                    if (number) number.style.visibility = "visible";
                    if (img) img.style.display = "none";
                    door.classList.remove("opened");
                }
                
                const id = setTimeout(() => {
                    processDoor(doorNumber + 1);
                }, 1000);
                this.testSequentialTimeouts.push(id);
            };
            
            if (this.config.allowVideoPlay) {
                Log.info(`[Test] Playing video for door ${doorNumber}`);
                this.playVideo(this.doorState.numbers[gridIndex]);
                
                const videoTimeout = this.config.testDoorDuration || 10;
                videoTimeoutId = setTimeout(() => {
                    if (!popupWasShown && !modalWasShown) {
                        Log.warn(`[Test] Video failed to open for door ${doorNumber}, continuing...`);
                        endVideoPhase();
                    }
                }, 2000);
                this.testSequentialTimeouts.push(videoTimeoutId);
                
                const autoCloseTimeoutId = setTimeout(() => {
                    if (!videoPhaseEnded) {
                        Log.warn(`[Test] Video timeout for door ${doorNumber} after ${videoTimeout}s, advancing...`);
                        endVideoPhase();
                    }
                }, videoTimeout * 1000);
                this.testSequentialTimeouts.push(autoCloseTimeoutId);
            } else {
                Log.info(`[Test] Video playback disabled, skipping video for door ${doorNumber}`);
                endVideoPhase();
            }
        };
        
        closeAllDoors();
        const id = setTimeout(() => {
            processDoor(1);
        }, 500);
        this.testSequentialTimeouts.push(id);
    },

    /**
     * Test all doors by opening them all and displaying each image scaled to 2x
     * Doors remain open for 15 seconds, then each image scales to 2x for 5 seconds in sequence
     * No audio plays during this test
     */
    testOpenAllDoors() {
        try {
            Log.info("[Test] Starting openAllDoorsTest - opening all doors");
            this.testMode = true;
            const doors = document.querySelectorAll(".door-celtic");
            
            doors.forEach((door, index) => {
                const number = door.querySelector("span");
                const img = door.querySelector("img");
                
                if (number) number.style.visibility = "hidden";
                door.classList.add("opened");
                if (img) img.style.display = "block";
            });

            setTimeout(() => {
                Log.info("[Test] All doors opened for 15 seconds, now cycling through images");
                let currentImageIndex = 0;
                
                const cycleNextImage = () => {
                    if (currentImageIndex >= 24) {
                        Log.info("[Test] openAllDoorsTest complete - all images displayed");
                        this.testMode = false;
                        return;
                    }

                    const door = document.querySelectorAll(".door-celtic")[currentImageIndex];
                    if (door) {
                        const img = door.querySelector("img");
                        if (img && img.src) {
                            Log.info(`[Test] Scaling image ${currentImageIndex + 1}/24`);
                            const doorRect = door.getBoundingClientRect();
                            const doorWidth = doorRect.width;
                            const doorHeight = doorRect.height;
                            const doorCenterX = doorRect.left + doorWidth / 2;
                            const doorCenterY = doorRect.top + doorHeight / 2;

                            const background = document.createElement("div");
                            background.className = "door-overlay-background";
                            background.style.position = "fixed";
                            background.style.top = "0";
                            background.style.left = "0";
                            background.style.width = "100%";
                            background.style.height = "100%";
                            background.style.background = "rgba(0, 0, 0, 0.7)";
                            background.style.zIndex = "9998";
                            background.style.pointerEvents = "none";

                            const overlay = document.createElement("div");
                            overlay.className = "door-overlay";
                            overlay.style.position = "fixed";
                            overlay.style.zIndex = "9999";
                            overlay.style.display = "flex";
                            overlay.style.alignItems = "center";
                            overlay.style.justifyContent = "center";
                            overlay.style.pointerEvents = "none";

                            const scaledWidth = doorWidth * 2;
                            const scaledHeight = doorHeight * 2;
                            const overlayLeft = doorCenterX - scaledWidth / 2;
                            const overlayTop = doorCenterY - scaledHeight / 2;

                            overlay.style.left = `${overlayLeft}px`;
                            overlay.style.top = `${overlayTop}px`;
                            overlay.style.width = `${scaledWidth}px`;
                            overlay.style.height = `${scaledHeight}px`;

                            const scaledImg = document.createElement("img");
                            scaledImg.src = img.src;
                            scaledImg.style.width = "100%";
                            scaledImg.style.height = "100%";
                            scaledImg.style.objectFit = "cover";
                            scaledImg.style.borderRadius = "8px";
                            scaledImg.style.border = "2px solid #00aa00";
                            scaledImg.style.boxShadow = "0 0 40px rgba(0, 170, 0, 0.8)";

                            overlay.appendChild(scaledImg);
                            document.body.appendChild(background);
                            document.body.appendChild(overlay);

                            setTimeout(() => {
                                background.remove();
                                overlay.remove();
                                currentImageIndex++;
                                setTimeout(cycleNextImage, 500);
                            }, 5000);
                        } else {
                            currentImageIndex++;
                            setTimeout(cycleNextImage, 500);
                        }
                    } else {
                        currentImageIndex++;
                        setTimeout(cycleNextImage, 500);
                    }
                };

                cycleNextImage();
            }, 15000);
        } catch (error) {
            Log.error("[Test] Error in testOpenAllDoors:", error);
            this.testMode = false;
        }
    },



    /**
     * Create individual footer image element
     * Features animated bounce effect with image
     * @param {number} index - Index of the image in the procession
     * @param {string} imagePath - Path to the image file
     * @returns {HTMLElement} Footer image element
     */
    createFooterImage(index, imagePath) {
        const imageContainer = document.createElement("div");
        imageContainer.className = "footer-image";
        imageContainer.style.display = "inline-flex";
        imageContainer.style.flexDirection = "column";
        imageContainer.style.alignItems = "center";
        imageContainer.style.animation = `bounce 1s ease-in-out ${index * 0.1}s infinite`;

        const img = document.createElement("img");
        img.src = `${this.file("images")}/${imagePath}`;
        img.style.height = "50px";
        img.style.width = "auto";
        img.style.objectFit = "contain";
        img.style.filter = "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))";

        imageContainer.appendChild(img);
        return imageContainer;
    },

    /**
     * Play audio for opened door
     * Stops any currently playing audio first
     * Implements comprehensive error handling for missing files and playback issues
     * Includes detailed logging for debugging audio problems
     * Scales door to 2x when audio starts if doorScaleOnAudio is enabled
     * @param {number} doorIndex - Index of the door being opened
     */
    playAudio(doorIndex) {
        try {
            if (this.testMode && this.config.openAllDoorsTest) {
                Log.info(`[Audio] Skipping audio during openAllDoorsTest`);
                return;
            }

            this.stopAudio();
            
            const audioPath = this.doorAudioMap[doorIndex];
            if (!audioPath) {
                Log.warn(`[Audio] No audio file configured for door ${doorIndex}`);
                return;
            }

            this.audioLogger.info(`Attempting to play audio for door ${doorIndex}: ${audioPath}`);

            // Track current playing door for scaling
            this.currentPlayingDoorIndex = doorIndex;
            
            // Add loading indicator to door
            const door = document.querySelector(`[data-door-index="${doorIndex}"]`);
            if (door) {
                const loader = document.createElement("div");
                loader.className = "door-loader";
                door.appendChild(loader);
                this.currentDoorLoader = loader;
            }
            
            // Reuse shared audio instance - just update source
            this.sharedAudio.src = audioPath;
            this.sharedAudio.volume = this.config.audioVolume;
            
            // Single handler for audio loading and errors
            const handleAudioReady = () => {
                this.audioLogger.info(`Audio loaded successfully for door ${doorIndex}`);
                if (this.currentDoorLoader) {
                    this.currentDoorLoader.remove();
                    this.currentDoorLoader = null;
                }
                this.sharedAudio.removeEventListener("canplay", handleAudioReady);
            };
            
            const handleAudioError = () => {
                const errorDetails = this.sharedAudio.error 
                    ? `Code ${this.sharedAudio.error.code}: ${this.sharedAudio.error.message}`
                    : "Unknown error";
                Log.error(`[Audio] Error loading audio for door ${doorIndex} at ${audioPath} - ${errorDetails}`);
                if (this.currentDoorLoader) {
                    this.currentDoorLoader.remove();
                    this.currentDoorLoader = null;
                }
                this.sharedAudio.removeEventListener("error", handleAudioError);
            };
            
            const handleAudioEnded = () => {
                Log.info(`[Audio] Playback ended for door ${doorIndex}`);
                this.unscaleDoor(doorIndex);
                this.sharedAudio.removeEventListener("ended", handleAudioEnded);
                
                if (this.testMode && this.testAudioEndCallback) {
                    this.testAudioEndCallback();
                } else {
                    const doorNumber = this.doorState.numbers[doorIndex];
                    this.playVideo(doorNumber);
                }
            };
            
            this.sharedAudio.addEventListener("canplay", handleAudioReady, { once: true });
            this.sharedAudio.addEventListener("error", handleAudioError, { once: true });
            this.sharedAudio.addEventListener("ended", handleAudioEnded, { once: true });
            
            // Track audio duration for test mode
            if (this.testMode) {
                const handleTestDuration = () => {
                    if (this.sharedAudio && this.sharedAudio.duration) {
                        const audioDur = Math.floor(this.sharedAudio.duration);
                        const audioMin = Math.floor(audioDur / 60);
                        const audioSec = audioDur % 60;
                        this.testAudioDuration = `${String(audioMin).padStart(2, "0")}:${String(audioSec).padStart(2, "0")}`;
                        Log.info(`[Test] Audio duration: ${this.testAudioDuration}`);
                    }
                    this.sharedAudio.removeEventListener("canplay", handleTestDuration);
                };
                this.sharedAudio.addEventListener("canplay", handleTestDuration, { once: true });
            }
            
            // Attempt to play with detailed error handling
            const playPromise = this.sharedAudio.play();
            
            if (playPromise !== undefined) {
                // Browser supports Promise-based play()
                playPromise
                    .then(() => {
                        this.audioLogger.info(`Successfully started playback for door ${doorIndex}`);
                        if (this.config.doorScaleOnAudio) {
                            this.scaleDoor(doorIndex);
                        }
                    })
                    .catch((error) => {
                        this.audioLogger.error(`Playback failed for door ${doorIndex}: ${error.message || error}`);
                        if (error.name === "NotAllowedError") {
                            this.audioLogger.warn(`Autoplay blocked by browser policy for door ${doorIndex}. Showing unmute button.`);
                            this.showUnmuteButton(doorIndex);
                        } else if (error.name === "NotSupportedError") {
                            this.audioLogger.warn(`Audio format not supported for door ${doorIndex}`);
                        }
                    });
            }
        } catch (error) {
            this.handleError("Audio playback failed", error);
        }
    },

    /**
     * Display unmute button when autoplay is blocked
     * Allows user to manually trigger audio playback with a visual button
     * @param {number} doorIndex - Index of the door that needs unmute button
     */
    showUnmuteButton(doorIndex) {
        try {
            const door = document.querySelector(`[data-door-index="${doorIndex}"]`);
            if (!door) {
                Log.warn(`[Audio] Could not find door element for index ${doorIndex}`);
                return;
            }

            const existingBtn = door.querySelector(".unmute-btn");
            if (existingBtn) {
                return;
            }

            const unmuteBtn = document.createElement("button");
            unmuteBtn.className = "unmute-btn";
            unmuteBtn.setAttribute("aria-label", "Tap to play audio");
            unmuteBtn.textContent = "🔊 Tap to play";
            unmuteBtn.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 170, 0, 0.95);
                color: white;
                border: 2px solid #ffd700;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                z-index: 1000;
                font-size: 14px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            `;

            unmuteBtn.addEventListener("mouseenter", () => {
                unmuteBtn.style.background = "rgba(0, 170, 0, 1)";
                unmuteBtn.style.boxShadow = "0 6px 16px rgba(255, 215, 0, 0.4)";
            });

            unmuteBtn.addEventListener("mouseleave", () => {
                unmuteBtn.style.background = "rgba(0, 170, 0, 0.95)";
                unmuteBtn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
            });

            unmuteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                Log.info(`[Audio] User clicked unmute button for door ${doorIndex}`);
                
                this.sharedAudio.play().then(() => {
                    Log.info(`[Audio] Playback started after user interaction for door ${doorIndex}`);
                    unmuteBtn.remove();
                    if (this.config.doorScaleOnAudio) {
                        this.scaleDoor(doorIndex);
                    }
                }).catch((retryError) => {
                    Log.error(`[Audio] Retry playback failed for door ${doorIndex}:`, retryError.message || retryError);
                });
            });

            door.style.position = "relative";
            door.appendChild(unmuteBtn);
            Log.info(`[Audio] Unmute button displayed for door ${doorIndex}`);
        } catch (error) {
            Log.warn(`[Audio] Error showing unmute button for door ${doorIndex}:`, error.message || error);
        }
    },

    /**
     * Stop currently playing audio
     * Safely pauses the shared audio instance and resets playback
     */
    stopAudio() {
        try {
            if (this.sharedAudio) {
                this.sharedAudio.pause();
                this.sharedAudio.currentTime = 0;
            }
        } catch (error) {
            this.handleError("Failed to stop audio", error);
        }
    },

    /**
     * Create full-screen overlay with 2x scaled door image centered over the opened door
     * @param {number} doorIndex - Index of the door
     */
    scaleDoor(doorIndex) {
        try {
            const door = document.querySelector(`[data-door-index="${doorIndex}"]`);
            if (!door) {
                this.handleError(`Door element not found for index ${doorIndex}`, new Error("Missing door element"));
                return;
            }

            const doorImg = door.querySelector("img");
            if (!doorImg || !doorImg.src) {
                this.handleError(`No image found for door ${doorIndex}`, new Error("Missing door image"));
                return;
            }

            this.unscaleDoor(doorIndex);

            door.classList.add("playing-audio");

            // Check if overlay already exists (reuse it)
            if (!this.doorOverlay) {
                this.doorOverlay = document.createElement("div");
                this.doorOverlay.className = "door-overlay";
                this.doorOverlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 9998;
                    display: none;
                `;
                document.body.appendChild(this.doorOverlay);
                
                this.doorOverlayBackground = document.createElement("div");
                this.doorOverlayBackground.className = "door-overlay-background";
                this.doorOverlayBackground.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9997;
                    display: none;
                `;
                document.body.insertBefore(this.doorOverlayBackground, this.doorOverlay);
            }

            // Show and update existing overlay
            this.doorOverlay.style.display = "flex";
            this.doorOverlayBackground.style.display = "block";

            const rect = door.getBoundingClientRect();
            const doorWidth = rect.width;
            const doorHeight = rect.height;
            const doorCenterX = rect.left + doorWidth / 2;
            const doorCenterY = rect.top + doorHeight / 2;

            const overlayOpacity = Math.max(0, Math.min(this.config.doorScaleOverlayOpacity, 1));
            this.doorOverlayBackground.style.backgroundColor = `rgba(0, 0, 0, ${overlayOpacity})`;

            const sizeMultiplier = Math.max(1, Math.min(this.config.doorScaleAudioSize, 2));
            const scaledWidth = doorWidth * sizeMultiplier;
            const scaledHeight = doorHeight * sizeMultiplier;
            const overlayLeft = doorCenterX - scaledWidth / 2;
            const overlayTop = doorCenterY - scaledHeight / 2;

            this.doorOverlay.style.left = `${overlayLeft}px`;
            this.doorOverlay.style.top = `${overlayTop}px`;
            this.doorOverlay.style.width = `${scaledWidth}px`;
            this.doorOverlay.style.height = `${scaledHeight}px`;

            // Clear previous content and add new image
            this.doorOverlay.innerHTML = "";
            const scaledImg = document.createElement("img");
            scaledImg.src = doorImg.src;
            scaledImg.className = "scaled-door-image";
            this.doorOverlay.appendChild(scaledImg);

            this.currentPlayingDoorIndex = doorIndex;
        } catch (error) {
            this.handleError("Door overlay creation failed", error);
        }
    },

    /**
     * Remove overlay after audio ends
     * @param {number} doorIndex - Index of the door to remove styling from
     */
    unscaleDoor(doorIndex) {
        try {
            if (this.doorOverlay) {
                this.doorOverlay.style.display = "none";
            }

            if (this.doorOverlayBackground) {
                this.doorOverlayBackground.style.display = "none";
            }

            if (doorIndex !== undefined && doorIndex !== null) {
                const door = document.querySelector(`[data-door-index="${doorIndex}"]`);
                if (door) {
                    door.classList.remove("playing-audio");
                }
            }

            this.currentPlayingDoorIndex = null;
        } catch (error) {
            this.handleError("Door overlay removal failed", error);
        }
    },

    /**
     * Mark a video as played and update the indicator styling
     * @param {number} doorNumber - The door number (1-24)
     */
    markVideoAsPlayed(doorNumber) {
        this.videoPlayedState[doorNumber] = true;
        const videoIndicators = document.querySelectorAll(`[data-door-number="${doorNumber}"]`);
        videoIndicators.forEach(indicator => {
            if (indicator.classList.contains('video-indicator')) {
                indicator.classList.remove('unplayed');
                indicator.classList.add('played');
            }
        });
        Log.info(`[Video] Marked video as played for door ${doorNumber}`);
    },

    /**
     * Close video modal overlay
     */
    closeVideoModal() {
        // Check if this was door 24's video modal being closed
        let wasDoor24Video = false;
        if (this.videoModalOverlay) {
            const titleElement = this.videoModalOverlay.querySelector('.video-modal-title');
            if (titleElement && titleElement.textContent.includes('Door 24')) {
                wasDoor24Video = true;
            }
        }

        if (this.videoModalOverlay) {
            this.videoModalOverlay.remove();
            this.videoModalOverlay = null;
        }
        if (this.videoModalAutoCloseTimer) {
            clearTimeout(this.videoModalAutoCloseTimer);
            this.videoModalAutoCloseTimer = null;
        }
        if (this.videoModalEscHandler) {
            document.removeEventListener('keydown', this.videoModalEscHandler);
            this.videoModalEscHandler = null;
        }

        // If door 24's video was closed, trigger trophy drop after 5 second delay
        if (wasDoor24Video && this.config.giftsFromSanta && !this.door24TrophyDropScheduled) {
            Log.info("[Door24] Video modal closed manually, scheduling trophy drop in 5 seconds");
            this.door24TrophyDropScheduled = true;
            setTimeout(() => {
                this.dropTrophiesForDoor24();
            }, 5000);
        }

        Log.info(`[Video] Modal closed`);
    },

    /**
     * Show video in modal overlay for hardcoded videos
     * Auto-closes after 10 seconds if not played
     * @param {number} doorNumber - The door number (1-24)
     * @param {string} videoUrl - YouTube URL
     */
    showVideoModal(doorNumber, videoUrl) {
        try {
            if (!this.isSafeVideoUrl(videoUrl)) {
                this.handleError("Unsafe video URL rejected", new Error(`Rejected URL: ${videoUrl}`), true);
                return;
            }

            let videoId = null;
            if (videoUrl.includes("youtu.be/")) {
                videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
            } else if (videoUrl.includes("youtube.com/watch")) {
                const urlParams = new URLSearchParams(new URL(videoUrl).search);
                videoId = urlParams.get("v");
            }

            if (!videoId) {
                this.handleError(`Could not extract video ID from URL`, new Error(`URL: ${videoUrl}`), true);
                return;
            }

            this.closeVideoModal();

            const overlay = document.createElement("div");
            overlay.className = "video-modal-overlay";

            const container = document.createElement("div");
            container.className = "video-modal-container";

            const header = document.createElement("div");
            header.className = "video-modal-header";

            const title = document.createElement("h3");
            title.className = "video-modal-title";
            title.textContent = `Advent Calendar Door ${doorNumber}`;
            header.appendChild(title);

            const closeBtn = document.createElement("button");
            closeBtn.className = "video-modal-close";
            closeBtn.textContent = "✕";
            closeBtn.addEventListener("click", () => this.closeVideoModal());
            header.appendChild(closeBtn);

            const content = document.createElement("div");
            content.className = "video-modal-content";

            const youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&fs=1`;
            const iframe = document.createElement("iframe");
            iframe.className = "video-modal-iframe";
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
            iframe.allowFullscreen = true;
            iframe.setAttribute("loading", "eager");
            iframe.style.display = "block";
            iframe.style.visibility = "visible";
            iframe.style.backgroundColor = "#000";
            
            let iframeLoaded = false;
            
            iframe.onload = () => {
                iframeLoaded = true;
                this.videoLogger.info(`YouTube iframe loaded successfully for door ${doorNumber}`);
            };
            
            iframe.onerror = () => {
                this.videoLogger.error(`YouTube iframe failed to load for door ${doorNumber}`);
            };
            
            setTimeout(() => {
                if (!iframeLoaded) {
                    this.videoLogger.warn(`YouTube iframe loading timeout for door ${doorNumber}, but continuing...`);
                }
            }, 5000);
            
            iframe.src = youtubeEmbedUrl;
            content.appendChild(iframe);

            const countdown = document.createElement("div");
            countdown.className = "video-modal-countdown";
            countdown.style.display = "none";
            container.appendChild(countdown);

            container.appendChild(header);
            container.appendChild(content);
            overlay.appendChild(container);
            document.body.appendChild(overlay);

            this.videoModalOverlay = overlay;
            this.markVideoAsPlayed(doorNumber);

            // Check if screen reader is active
            const isScreenReaderActive = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            
            if (!isScreenReaderActive) {
                let timeRemaining = this.config.videoAutoCloseTimeout || 300;
                const updateCountdown = () => {
                    timeRemaining--;
                    
                    if (timeRemaining <= 30) {
                        countdown.style.display = "block";
                        countdown.textContent = `Auto-close in ${timeRemaining}s`;
                    }
                    
                    if (timeRemaining <= 0) {
                        this.closeVideoModal();
                    }
                };

                this.videoModalAutoCloseTimer = setInterval(updateCountdown, 1000);
            } else {
                this.accessibilityLogger.info("Screen reader preference detected, disabling video auto-close");
            }

            this.videoModalEscHandler = (event) => {
                if (event.key === 'Escape') {
                    this.closeVideoModal();
                }
            };
            document.addEventListener('keydown', this.videoModalEscHandler);
        } catch (error) {
            this.handleError("Video modal creation failed", error, true);
        }
    },

    /**
     * Show local video file in modal with autoplay
     * @param {number} doorNumber - The door number (1-24)
     * @param {string} videoUrl - Full path to video file
     */
    showLocalVideoModal(doorNumber, videoUrl) {
        try {
            this.closeVideoModal();

            const overlay = document.createElement("div");
            overlay.className = "video-modal-overlay";

            const container = document.createElement("div");
            container.className = "video-modal-container";

            const header = document.createElement("div");
            header.className = "video-modal-header";

            const title = document.createElement("h3");
            title.className = "video-modal-title";
            title.textContent = `Advent Calendar Door ${doorNumber}`;
            header.appendChild(title);

            const closeBtn = document.createElement("button");
            closeBtn.className = "video-modal-close";
            closeBtn.textContent = "✕";
            closeBtn.addEventListener("click", () => this.closeVideoModal());
            header.appendChild(closeBtn);

            const content = document.createElement("div");
            content.className = "video-modal-content";

            const video = document.createElement("video");
            video.className = "video-modal-video";
            video.style.width = "100%";
            video.style.height = "100%";
            video.style.objectFit = "contain";
            video.style.backgroundColor = "#000";
            video.controls = true;
            video.autoplay = true;
            video.muted = false;

            const source = document.createElement("source");
            source.src = videoUrl;
            source.type = "video/mp4";
            video.appendChild(source);

            content.appendChild(video);

            container.appendChild(header);
            container.appendChild(content);
            overlay.appendChild(container);
            document.body.appendChild(overlay);

            this.videoModalOverlay = overlay;
            this.markVideoAsPlayed(doorNumber);

            let videoEnded = false;
            let fallbackTimeout = null;
            let hasCalledTestCallback = false;

            const handleVideoEnded = () => {
                Log.info(`[Video] Video ended event fired for door ${doorNumber}`);
                videoEnded = true;
                clearTimeout(fallbackTimeout);

                // If this is door 24 and snowflakes are enabled, enable snowflake accumulation
                if (doorNumber === 24 && this.config.snowflakesEnabled) {
                    Log.info("[Snowflakes] Door 24 video ended, enabling snowflake accumulation at bottom");
                    this.enableSnowflakeAccumulation();
                }

                // If this is door 24, trigger trophy drop after 5 second delay
                if (doorNumber === 24 && this.config.giftsFromSanta && !this.door24TrophyDropScheduled) {
                    Log.info(`[Door24] Video completed for door ${doorNumber}, scheduling trophy drop in 5 seconds`);
                    this.door24TrophyDropScheduled = true;
                    setTimeout(() => {
                        Log.info("[Door24] Executing scheduled trophy drop");
                        this.dropTrophiesForDoor24();
                    }, 5000);
                } else if (doorNumber === 24) {
                    Log.info(`[Door24] Video completed but giftsFromSanta disabled or already scheduled: ${this.config.giftsFromSanta}, scheduled: ${this.door24TrophyDropScheduled}`);
                }

                if (this.testMode) {
                    if (video.duration) {
                        const videoMin = Math.floor(video.duration / 60);
                        const videoSec = Math.floor(video.duration % 60);
                        this.testVideoDuration = `${String(videoMin).padStart(2, "0")}:${String(videoSec).padStart(2, "0")}`;
                        Log.info(`[Test] Video duration: ${this.testVideoDuration}`);
                    }
                    if (!hasCalledTestCallback && this.testVideoEndCallback) {
                        hasCalledTestCallback = true;
                        this.videoLogger.info(`[Test] Video naturally ended for door ${doorNumber}, calling callback`);
                        this.testVideoEndCallback();
                    }
                    this.closeVideoModal();
                } else {
                    setTimeout(() => this.closeVideoModal(), 1000);
                }
            };

            const handleVideoError = (e) => {
                this.videoLogger.error(`Video playback error for door ${doorNumber}: ${e.message || 'Unknown error'}`);
            };

            video.addEventListener("ended", handleVideoEnded, { once: true });
            video.addEventListener("error", handleVideoError);

            // Fallback: if video doesn't end naturally within a reasonable time, trigger manually
            // This handles cases where video files might not have proper duration metadata
            const maxVideoDuration = 10 * 60 * 1000; // 10 minutes max
            fallbackTimeout = setTimeout(() => {
                if (!videoEnded) {
                    Log.warn(`[Video] Video for door ${doorNumber} didn't end naturally within 10 minutes, triggering manual end`);
                    handleVideoEnded();
                }
            }, maxVideoDuration);

            video.addEventListener("loadedmetadata", () => {
                const duration = video.duration || 0;
                const durationMin = Math.floor(duration / 60);
                const durationSec = Math.floor(duration % 60);
                this.videoLogger.info(`Video metadata loaded for door ${doorNumber}: ${durationMin}:${String(durationSec).padStart(2, '0')}`);
            }, { once: true });
            
            video.addEventListener("loadeddata", () => {
                this.videoLogger.info(`Video data loaded and playback ready for door ${doorNumber}`);
            }, { once: true });
            
            video.addEventListener("play", () => {
                this.videoLogger.info(`Video playback started for door ${doorNumber}`);
            }, { once: true });

            if (this.testMode) {
                fallbackTimeout = setTimeout(() => {
                    Log.warn(`[Test] Local video timeout after 5 minutes for door ${doorNumber}`);
                    if (!hasCalledTestCallback && this.testVideoEndCallback) {
                        hasCalledTestCallback = true;
                        this.testVideoEndCallback();
                    }
                    this.closeVideoModal();
                }, 300000);

                overlay.addEventListener("click", () => {
                    if (this.videoModalOverlay && !hasCalledTestCallback) {
                        if (fallbackTimeout) clearTimeout(fallbackTimeout);
                        hasCalledTestCallback = true;
                        this.testVideoEndCallback();
                        this.closeVideoModal();
                    }
                });
            }

            this.videoModalEscHandler = (event) => {
                if (event.key === 'Escape') {
                    if (fallbackTimeout) clearTimeout(fallbackTimeout);
                    if (!videoEnded && this.testMode && !hasCalledTestCallback && this.testVideoEndCallback) {
                        hasCalledTestCallback = true;
                        this.testVideoEndCallback();
                    }
                    this.closeVideoModal();
                }
            };
            document.addEventListener('keydown', this.videoModalEscHandler);

        } catch (error) {
            this.handleError("Local video modal creation failed", error, true);
        }
    },

    /**
     * Play video for completed door
     * Supports both local video files (folder) and hardcoded YouTube URLs (iframe)
     * @param {number} doorNumber - The door number (1-24)
     */
    playVideo(doorNumber) {
        try {
            if (!this.config.allowVideoPlay) {
                this.videoLogger.info("Video playback disabled in config");
                if (this.testMode && this.testVideoEndCallback) {
                    const id = setTimeout(() => this.testVideoEndCallback(), 500);
                    if (this.testSequentialTimeouts) this.testSequentialTimeouts.push(id);
                }
                return;
            }

            let videoUrl;

            if (this.config.videoSource === "folder") {
                const videoFilename = String(doorNumber).padStart(2, "0");
                videoUrl = `${this.file("video")}/${videoFilename}.mp4`;
                this.videoLogger.info(`Loading video from folder for door ${doorNumber}: ${videoUrl}`);
                
                this.showLocalVideoModal(doorNumber, videoUrl);
            } else {
                videoUrl = this.videoMap[doorNumber];
                if (!videoUrl) {
                    this.handleError(`No video URL configured for door ${doorNumber}`, new Error("Missing video URL"));
                    if (this.testMode && this.testVideoEndCallback) {
                        const id = setTimeout(() => this.testVideoEndCallback(), 500);
                        if (this.testSequentialTimeouts) this.testSequentialTimeouts.push(id);
                    }
                    return;
                }
                
                if (!this.isSafeVideoUrl(videoUrl)) {
                    this.handleError("Unsafe video URL rejected", new Error(`Door: ${doorNumber}`), true);
                    if (this.testMode && this.testVideoEndCallback) {
                        const id = setTimeout(() => this.testVideoEndCallback(), 500);
                        if (this.testSequentialTimeouts) this.testSequentialTimeouts.push(id);
                    }
                    return;
                }

                this.showVideoModal(doorNumber, videoUrl);
                if (this.testMode) {
                    this.testVideoDuration = `00:20`;
                    if (this.testVideoEndCallback) {
                        const videoTimeout = this.config.testDoorDuration || 10;
                        const id = setTimeout(() => {
                            Log.warn(`[Test] YouTube video timeout for door ${doorNumber} after ${videoTimeout}s`);
                            if (this.testVideoEndCallback) {
                                this.testVideoEndCallback();
                            }
                            this.closeVideoModal();
                        }, videoTimeout * 1000);
                        if (this.testSequentialTimeouts) this.testSequentialTimeouts.push(id);
                    }
                }
            }
        } catch (error) {
            this.handleError("Video playback failed", error, true);
        }
    },

    /**
     * Schedule automatic door opening for daily configuration
     * Uses repeating interval check (every minute) instead of long setTimeout
     * This handles wake-from-sleep and system clock adjustments properly
     * Prevents drift from machine sleep states
     */
    scheduleAutoOpen() {
        if (!this.config.autopen) return;

        this.autoOpenCheckInterval = setInterval(() => {
            const [hours, minutes] = this.config.autoopenat.split(":").map(Number);
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();

            if (currentHours === hours && currentMinutes === minutes) {
                Log.info("[AutoOpen] Scheduled open time reached");
                this.autoOpenDoor();
            }
        }, 60000);

        this.autoOpenDoor();
    },

    /**
     * Automatically open today's door at scheduled time
     * Finds door matching today's date
     * Triggers opening animation
     */
    autoOpenDoor() {
        if (!this.config.autopen) return;

        try {
            const today = new Date().getDate();
            const doorIndex = this.doorState.numbers.indexOf(today);

            if (doorIndex !== -1 && !this.doorState.opened[doorIndex]) {
                this.doorState.opened[doorIndex] = true;
                this.sendSocketNotification("SAVE_DOOR_STATE", this.doorState);

                const door = document.querySelectorAll(".door-celtic")[doorIndex];
                if (door) {
                    const number = door.querySelector("span");
                    const img = door.querySelector("img");

                    door.classList.add("opened");
                    door.classList.add("opening");

                    number.style.visibility = "hidden";
                    if (img) img.style.display = "block";
                    
                    // Play audio when auto-opening
                    if (this.config.audioEnabled) {
                        setTimeout(() => {
                            this.playAudio(doorIndex);
                        }, 2500); // Play after animation midpoint
                    }
                }
            }
        } catch (error) {
            this.handleError("Auto-open door failed", error);
        }
    },



    /**
     * Request door state from backend
     * Triggers socket notification to load persistent state
     */
    loadDoorState() {
        this.sendSocketNotification("LOAD_DOOR_STATE", { randomizeOnStart: this.config.randomizeDoorsOnStart });
    },

    /**
     * Handle socket notifications from backend
     * @param {string} notification - Notification identifier
     * @param {object} payload - Data payload from backend
     */
    socketNotificationReceived(notification, payload) {
        if (notification === "DOOR_STATE_LOADED") {
            this.doorState = payload;
            this.updateDom();
        }
    },

    /**
     * Parse snowflake colors from config
     * Returns array of color strings
     * @returns {Array} Array of color strings
     */
    parseSnowflakeColors() {
        if (typeof this.config.snowflakeColors === "string") {
            if (this.config.snowflakeColors.includes(",")) {
                return this.config.snowflakeColors.split(",").map(c => c.trim());
            }
            return [this.config.snowflakeColors];
        } else if (Array.isArray(this.config.snowflakeColors)) {
            return this.config.snowflakeColors;
        }
        return ["#FFFFFF"];
    },

    /**
     * Apply snow condition presets to snowflake configuration
     * Overrides individual snowflake settings based on condition
     */
    applySnowCondition() {
        if (!this.config.snowCondition) return;

        const conditions = {
            "Light": { count: 75, types: 2, speed: 25 },
            "Medium": { count: 250, types: 5, speed: 50 },
            "Blizzard": { count: 400, types: 10, speed: 75 },
            "Extreme": { count: 1000, types: 20, speed: 200 }
        };

        const condition = conditions[this.config.snowCondition];
        if (condition) {
            this.config.snowflakeCount = condition.count;
            this.config.snowflakeTypes = condition.types;
            this.config.snowflakeSpeed = condition.speed;
        }
    },

    /**
     * Create animated Santa sleigh flying in an arc across the screen using GIF/image overlay
     * @returns {HTMLElement} Container with animated sleigh
     */
    createAnimatedSleigh() {
        const container = document.createElement("div");
        container.className = "santa-sleigh-container";
        container.style.position = "absolute";
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.zIndex = "1.5";
        container.style.pointerEvents = "none";
        container.style.overflow = "hidden";

        const sleighGroup = document.createElement("div");
        sleighGroup.className = "sleigh-group";
        sleighGroup.style.position = "absolute";
        
        const animationName = this.config.sleighDirection === "right-to-left" ? "sleigh-arc-rtl" : "sleigh-arc";
        sleighGroup.style.animation = `${animationName} ${this.config.sleighSpeed}s ease-in-out infinite`;
        sleighGroup.style.display = "flex";
        sleighGroup.style.alignItems = "center";
        sleighGroup.style.gap = "6px";

        // Reindeer group (8 reindeer) - always at front/leading
        const reindeersGroup = document.createElement("div");
        reindeersGroup.style.display = "flex";
        reindeersGroup.style.gap = "4px";

        for (let i = 0; i < 8; i++) {
            const reindeer = document.createElement("div");
            reindeer.style.fontSize = "24px";
            reindeer.textContent = "🦌";
            reindeer.style.animation = `bounce-reindeer 0.6s ease-in-out ${i * 0.1}s infinite`;
            reindeer.style.lineHeight = "1";
            reindeersGroup.appendChild(reindeer);
        }

        // Golden reins connecting reindeer to sleigh
        const reins = document.createElement("div");
        reins.style.width = "12px";
        reins.style.height = "2px";
        reins.style.background = "linear-gradient(to right, #FFD700, #FFA500)";
        reins.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.4)";

        // Sleigh image/GIF container
        const sleighImageContainer = document.createElement("div");
        sleighImageContainer.style.position = "relative";
        sleighImageContainer.style.display = "flex";
        sleighImageContainer.style.alignItems = "center";
        sleighImageContainer.style.justifyContent = "center";

        // Create sleigh GIF/image
        const sleighImg = document.createElement("img");
        let imagePath = this.config.sleighImage;
        
        if (!imagePath.includes("/") && !imagePath.includes("\\") && !imagePath.startsWith("http")) {
            imagePath = `${this.file("images")}/${imagePath}`;
        }
        
        sleighImg.src = imagePath;
        sleighImg.style.height = "60px";
        sleighImg.style.objectFit = "contain";
        sleighImg.style.filter = "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))";
        sleighImg.onerror = () => {
            Log.warn(`[Sleigh] Failed to load sleigh image: ${this.config.sleighImage}, using fallback emoji`);
            sleighImg.style.display = "none";
            sleighImageContainer.appendChild(this.createFallbackSleigh());
        };
        
        sleighImageContainer.appendChild(sleighImg);

        // Build order based on direction - sleigh leads, reindeer pulls
        if (this.config.sleighDirection === "right-to-left") {
            sleighGroup.appendChild(reindeersGroup);
            sleighGroup.appendChild(reins);
            sleighGroup.appendChild(sleighImageContainer);
        } else {
            sleighGroup.appendChild(sleighImageContainer);
            sleighGroup.appendChild(reins);
            sleighGroup.appendChild(reindeersGroup);
        }

        container.appendChild(sleighGroup);

        // Initialize trophy container if enabled (will be populated when door 24 is opened)
        if (this.config.giftsFromSanta) {
            Log.info("[Sleigh] Trophy system ready for door 24");
            this.generateTrophyStyles();
            
            if (!this.trophyContainer || !document.body.contains(this.trophyContainer)) {
                const trophyContainer = document.createElement("div");
                trophyContainer.id = "trophy-display-container";
                trophyContainer.className = "trophy-display-container";
                trophyContainer.style.position = "fixed";
                trophyContainer.style.bottom = "50px"; // Position at bottom where trophies land
                trophyContainer.style.left = "50%";
                trophyContainer.style.transform = "translateX(-50%)";
                trophyContainer.style.width = "600px"; // Wider to accommodate falling trophies
                trophyContainer.style.height = "120px";
                trophyContainer.style.display = "flex";
                trophyContainer.style.flexDirection = "row";
                trophyContainer.style.alignItems = "flex-end";
                trophyContainer.style.justifyContent = "center";
                trophyContainer.style.gap = "20px";
                trophyContainer.style.zIndex = "9998"; // Below falling trophies
                trophyContainer.style.pointerEvents = "none";

                document.body.appendChild(trophyContainer);
                this.trophyContainer = trophyContainer;
            }
        }

        return container;
    },

    /**
     * Generate CSS styles for trophy animations
     * Creates keyframe animations for trophies falling from top of screen
     */
    generateTrophyStyles() {
        if (document.getElementById("trophy-drop-styles")) return;

        const style = document.createElement("style");
        style.id = "trophy-drop-styles";

        let css = `
            @keyframes trophy-fall {
                0% {
                    transform: translateX(-50%) translateY(-10vh) scale(0.8) rotate(0deg);
                    opacity: 1;
                }
                10% {
                    transform: translateX(-50%) translateY(10vh) scale(0.9) rotate(5deg);
                    opacity: 1;
                }
                20% {
                    transform: translateX(-50%) translateY(20vh) scale(1.0) rotate(-3deg);
                    opacity: 1;
                }
                30% {
                    transform: translateX(-50%) translateY(30vh) scale(1.0) rotate(2deg);
                    opacity: 1;
                }
                40% {
                    transform: translateX(-50%) translateY(40vh) scale(1.0) rotate(-1deg);
                    opacity: 1;
                }
                50% {
                    transform: translateX(-50%) translateY(50vh) scale(1.0) rotate(0deg);
                    opacity: 1;
                }
                60% {
                    transform: translateX(-50%) translateY(60vh) scale(1.0) rotate(1deg);
                    opacity: 1;
                }
                70% {
                    transform: translateX(-50%) translateY(70vh) scale(1.0) rotate(-0.5deg);
                    opacity: 1;
                }
                80% {
                    transform: translateX(-50%) translateY(80vh) scale(1.0) rotate(0deg);
                    opacity: 1;
                }
                90% {
                    transform: translateX(-50%) translateY(85vh) scale(0.95) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateX(-50%) translateY(85vh) scale(0.95) rotate(0deg);
                    opacity: 1;
                }
            }

            .trophy-falling {
                animation: trophy-fall 8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                position: fixed !important;
                z-index: 9999;
            }
        `;

        style.textContent = css;
        document.head.appendChild(style);
    },

    /**
     * Find the correct image file for a gift/trophy with multiple format support
     * Checks for .png, .jpg, .jpeg, .gif, .webp formats
     * @param {string} basePath - Base path including filename without extension
     * @returns {string|null} Full path if found, null if not found
     */
    async findGiftImagePath(basePath) {
        const supportedFormats = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
        
        for (const format of supportedFormats) {
            const fullPath = basePath + format;
            try {
                const response = await fetch(fullPath, { method: "HEAD" });
                if (response.ok) {
                    return fullPath;
                }
            } catch (e) {
                continue;
            }
        }
        return null;
    },

    /**
     * Drop gifts/trophies one at a time when door 24 is opened
     * Supports configurable gift type (trophy/gift) and multiple image formats
     * Each item drops with configurable delay between them
     * Shows progress indicator during animation sequence
     * Caps maximum items at 8
     */
    async dropTrophiesForDoor24() {
        try {
            Log.info(`[Door24] dropTrophiesForDoor24 called, giftsFromSanta: ${this.config.giftsFromSanta}, trophyContainer exists: ${!!this.trophyContainer}`);
            if (!this.config.giftsFromSanta) {
                Log.warn("[Door24] giftsFromSanta is disabled in config");
                this.door24TrophyDropScheduled = false; // Reset flag
                return;
            }
            if (!this.trophyContainer) {
                Log.error("[Door24] trophyContainer not found - sleigh may not be enabled");
                this.door24TrophyDropScheduled = false; // Reset flag
                return;
            }

        const giftType = this.config.giftType || "trophy";
        const maxGifts = Math.min(Math.max(1, this.config.maxGiftsToDrop || 8), 8);
        
        if (!["trophy", "gift"].includes(giftType)) {
            this.giftLogger.error(`Invalid giftType: "${giftType}". Must be "trophy" or "gift"`);
            return;
        }

        this.trophyContainer.innerHTML = "";
        
        const dropDelay = Math.max(1, Math.min(this.config.giftDropDelay || 2, 8)) * 1000;
        const totalDuration = (maxGifts - 1) * dropDelay + 8000;
        
        this.giftLogger.info(`Dropping ${maxGifts} ${giftType}(s) one at a time for door 24!`);
        
        // Position sleigh at top center and add visual feedback
        const sleigh = document.querySelector(".sleigh-group");
        if (sleigh) {
            // Store original position
            const originalTransform = sleigh.style.transform || '';
            const originalTransition = sleigh.style.transition || '';

            // Move sleigh to top center for trophy drop
            sleigh.style.transition = 'transform 2s ease-in-out';
            sleigh.style.transform = 'translateX(-50%) translateY(-80vh)';
            sleigh.classList.add("sleigh-dropping");

            // Start trophy drop after sleigh reaches position
            setTimeout(() => {
                // Now start the actual trophy dropping
                this.startTrophyDropSequence(maxGifts, dropDelay, giftType);
            }, 2000); // Wait for sleigh to reach position

            // Return sleigh to original position after trophy drop completes
            setTimeout(() => {
                sleigh.style.transform = originalTransform;
                sleigh.classList.remove("sleigh-dropping");
                setTimeout(() => {
                    sleigh.style.transition = originalTransition;
                    this.door24TrophyDropScheduled = false; // Reset flag after completion
                }, 2000); // Wait for transform to complete
            }, totalDuration + 2000);
        } else {
            // No sleigh found, start drop immediately
            setTimeout(() => {
                this.startTrophyDropSequence(maxGifts, dropDelay, giftType);
                // Reset flag after a delay to allow re-triggering
                setTimeout(() => {
                    this.door24TrophyDropScheduled = false;
                }, totalDuration + 5000);
            }, 100);
        }
        } catch (error) {
            Log.error(`[Door24] Error in dropTrophiesForDoor24: ${error.message}`);
            this.handleError("Trophy drop failed", error);
            this.door24TrophyDropScheduled = false; // Reset flag on error
        }
    },

    /**
     * Manual test method for trophy drop - can be called from browser console
     * Usage: MMM-MyTeams-Adventskalender.testTrophyDrop()
     */
    testTrophyDrop() {
        Log.info("[TEST] Manual trophy drop test triggered");
        this.dropTrophiesForDoor24();
    },

    /**
     * Start the actual trophy/gift dropping sequence
     * @param {number} maxGifts - Maximum number of gifts to drop
     * @param {number} dropDelay - Delay between each drop in milliseconds
     * @param {string} giftType - Type of gift ("trophy" or "gift")
     */
    startTrophyDropSequence(maxGifts, dropDelay, giftType) {
        const progressContainer = document.createElement("div");
        progressContainer.className = "trophy-progress";
        progressContainer.style.cssText = `
            position: fixed;
            bottom: 200px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 170, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 9998;
            border: 2px solid #ffd700;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;
        document.body.appendChild(progressContainer);

        let droppedCount = 0;

        for (let i = 1; i <= maxGifts; i++) {
            setTimeout(async () => {
                droppedCount++;
                const displayType = giftType.charAt(0).toUpperCase() + giftType.slice(1);
                progressContainer.textContent = `${displayType}s: ${droppedCount}/${maxGifts}`;

                const basePath = `${this.file("images")}/${giftType}${i}`;
                const imagePath = await this.findGiftImagePath(basePath);

                if (!imagePath) {
                    Log.warn(`[Gift] No image found for ${giftType}${i} with supported formats`);
                    return;
                }

                const element = document.createElement("img");
                element.src = imagePath;
                element.className = "trophy-falling";
                element.style.width = "80px";
                element.style.height = "auto";
                element.style.objectFit = "contain";
                element.style.filter = "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6))";

                // Start animation from top of screen
                document.body.appendChild(element);
                this.giftLogger.info(`${displayType} ${i} dropped!`);

                element.onerror = () => {
                    this.giftLogger.warn(`Failed to load image: ${imagePath}`);
                };

                // After animation completes, move to trophy container at bottom
                element.addEventListener('animationend', () => {
                    // Remove from body and add to trophy container
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }

                    // Reset styles for container positioning
                    element.style.position = "static";
                    element.style.top = "auto";
                    element.style.left = "auto";
                    element.style.transform = "none";
                    element.style.animation = "none";
                    element.className = "trophy-landed";

                    // Add to trophy container
                    this.trophyContainer.appendChild(element);
                });

                if (droppedCount === maxGifts) {
                    setTimeout(() => {
                        progressContainer.style.opacity = "0";
                        progressContainer.style.transition = "opacity 0.5s ease";
                        setTimeout(() => progressContainer.remove(), 500);
                    }, 3000);
                }
            }, (i - 1) * dropDelay);
        }
    },

    /**
     * Enable snowflake accumulation at the bottom of screen after door 24 video completes
     * Modifies snowflake animations to stop at bottom instead of disappearing
     */
    enableSnowflakeAccumulation() {
        try {
            const style = document.createElement("style");
            style.id = "snowflake-accumulation-styles";
            
            let css = "";
            for (let i = 1; i <= 20; i++) {
                const windOffset = (Math.random() - 0.5) * 100;
                const windWave = Math.sin(i / 3) * 50;
                css += `
                    @keyframes snowfall-${i}-accumulate {
                        0% {
                            transform: translateY(-10vh) translateX(0px);
                            opacity: 1;
                        }
                        10% {
                            transform: translateY(10vh) translateX(${windOffset * 0.3}px);
                        }
                        20% {
                            transform: translateY(20vh) translateX(${windOffset * 0.6}px);
                        }
                        30% {
                            transform: translateY(30vh) translateX(${windOffset}px);
                        }
                        40% {
                            transform: translateY(40vh) translateX(${windOffset * 0.8}px);
                        }
                        50% {
                            transform: translateY(50vh) translateX(${windWave}px);
                        }
                        60% {
                            transform: translateY(60vh) translateX(${windOffset * 0.4}px);
                        }
                        70% {
                            transform: translateY(70vh) translateX(${windOffset * 0.7}px);
                        }
                        80% {
                            transform: translateY(80vh) translateX(${windOffset * 0.5}px);
                        }
                        90% {
                            transform: translateY(95vh) translateX(${windOffset * 0.2}px);
                        }
                        100% {
                            transform: translateY(95vh) translateX(0px);
                            opacity: 1;
                        }
                    }
                `;
            }
            
            style.textContent = css;
            document.head.appendChild(style);
            
            // Update all snowflakes to use accumulation animations
            const snowflakesContainer = document.querySelector(".snowflakes-container");
            if (!snowflakesContainer) {
                Log.warn("[Snowflakes] Snowflakes container not found");
                return;
            }
            
            const snowflakes = snowflakesContainer.querySelectorAll(".snowflake");
            snowflakes.forEach((snowflake) => {
                const currentAnimation = window.getComputedStyle(snowflake).animation;
                const match = currentAnimation.match(/snowfall-(\d+)/);
                if (match) {
                    const animNum = match[1];
                    const duration = window.getComputedStyle(snowflake).animationDuration;
                    const delay = window.getComputedStyle(snowflake).animationDelay;
                    snowflake.style.animation = `snowfall-${animNum}-accumulate ${duration} linear ${delay} infinite`;
                }
            });
            
            Log.info(`[Snowflakes] Enabled snowflake accumulation for ${snowflakes.length} snowflakes`);
        } catch (error) {
            this.handleError("Snowflake accumulation setup failed", error);
        }
    },

    /**
     * Create fallback sleigh using emoji if image fails to load
     * @returns {HTMLElement} Fallback sleigh container
     */
    createFallbackSleigh() {
        const fallback = document.createElement("div");
        fallback.style.display = "flex";
        fallback.style.alignItems = "center";
        fallback.style.gap = "4px";
        
        const sleigh = document.createElement("div");
        sleigh.style.fontSize = "32px";
        sleigh.textContent = "🛷";
        sleigh.style.lineHeight = "1";
        
        const santa = document.createElement("div");
        santa.style.fontSize = "28px";
        santa.textContent = "🎅";
        santa.style.lineHeight = "1";
        
        const sack = document.createElement("div");
        sack.style.fontSize = "24px";
        sack.textContent = "🎁";
        sack.style.lineHeight = "1";
        
        fallback.appendChild(sleigh);
        fallback.appendChild(santa);
        fallback.appendChild(sack);
        
        return fallback;
    },

    /**
     * Generate snowfall keyframe animations dynamically
     * Creates 20 different snowfall patterns with varied wind effects
     */
    generateSnowfallStyles() {
        if (document.getElementById("snowfall-styles")) return;
        
        const style = document.createElement("style");
        style.id = "snowfall-styles";
        
        let css = "";
        for (let i = 1; i <= 20; i++) {
            const windOffset = (Math.random() - 0.5) * 100;
            const windWave = Math.sin(i / 3) * 50;
            css += `
                @keyframes snowfall-${i} {
                    0% {
                        transform: translateY(-10vh) translateX(0px);
                        opacity: 1;
                    }
                    10% {
                        transform: translateY(10vh) translateX(${windOffset * 0.3}px);
                    }
                    20% {
                        transform: translateY(20vh) translateX(${windOffset * 0.6}px);
                    }
                    30% {
                        transform: translateY(30vh) translateX(${windOffset}px);
                    }
                    40% {
                        transform: translateY(40vh) translateX(${windOffset * 0.8}px);
                    }
                    50% {
                        transform: translateY(50vh) translateX(${windWave}px);
                    }
                    60% {
                        transform: translateY(60vh) translateX(${windOffset * 0.4}px);
                    }
                    70% {
                        transform: translateY(70vh) translateX(${windOffset * 0.7}px);
                    }
                    80% {
                        transform: translateY(80vh) translateX(${windOffset * 0.5}px);
                    }
                    90% {
                        transform: translateY(90vh) translateX(${windOffset * 0.2}px);
                    }
                    100% {
                        transform: translateY(110vh) translateX(0px);
                        opacity: 0;
                    }
                }
            `;
        }
        
        style.textContent = css;
        document.head.appendChild(style);
    },

    /**
     * Create snowflake container and generate snowflakes
     * @returns {HTMLElement} Container with snowflakes
     */
    createSnowflakes() {
        this.applySnowCondition();

        const container = document.createElement("div");
        container.className = "snowflakes-container";

        const colors = this.parseSnowflakeColors();
        const snowflakeTypes = Math.max(1, Math.min(this.config.snowflakeTypes, 20));
        const snowflakeCount = Math.max(50, Math.min(this.config.snowflakeCount, 1000));
        
        // Use DocumentFragment for batch append (better performance)
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < snowflakeCount; i++) {
            const snowflake = document.createElement("div");
            snowflake.className = "snowflake";
            
            const typeNum = (i % snowflakeTypes) + 1;
            snowflake.classList.add(`snowflake-type-${typeNum}`);
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            snowflake.style.color = color;
            
            const leftPosition = Math.random() * 100;
            snowflake.style.left = `${leftPosition}%`;
            
            const sizeMultiplier = 0.5 + (typeNum / snowflakeTypes) * 1.5;
            snowflake.style.fontSize = `${sizeMultiplier}em`;
            
            const baseDuration = this.calculateFallDuration(typeNum, snowflakeTypes);
            const animationNum = ((i % 20) + 1);
            snowflake.style.animation = `snowfall-${animationNum} ${baseDuration}s linear infinite`;
            
            const delay = Math.random() * baseDuration;
            snowflake.style.animationDelay = `${delay}s`;
            
            fragment.appendChild(snowflake);
        }
        
        // Single append operation
        container.appendChild(fragment);
        
        return container;
    },

    /**
     * Calculate fall duration based on snowflake type
     * Heavier/larger snowflakes fall faster
     * Speed range 1-200: lower = slower, higher = faster
     * @param {number} type - Snowflake type (1-20)
     * @param {number} maxType - Maximum snowflake type
     * @returns {number} Duration in seconds
     */
    calculateFallDuration(type, maxType) {
        const speed = Math.max(1, Math.min(this.config.snowflakeSpeed || 50, 200));
        const baseDuration = 38 - (speed / 200) * 30;
        
        const typeFactor = (type / maxType);
        const duration = baseDuration * (1 + (1 - typeFactor) * 0.5);
        
        return Math.max(8, Math.min(duration, 30));
    }
});
