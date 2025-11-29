/**
 * Node Helper for MMM-MyTeams-Adventskalender
 * Handles persistent state management for door states
 * 
 * Features:
 * - Loads door state from JSON file
 * - Saves door state updates
 * - Auto-initializes state if missing or corrupted
 * - Error handling and recovery
 */

const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
    /**
     * Initialize node helper
     * Sets up file path for state persistence
     * Logs startup message
     */
    start() {
        this.stateFilePath = path.join(__dirname, "state.json");
        this.config = {};
        console.log("[MMM-MyTeams-Adventskalender] Node helper started at:", this.stateFilePath);
    },

    /**
     * Handle socket notifications from frontend module
     * Routes to appropriate handler methods
     * 
     * @param {string} notification - The notification identifier
     * @param {object} payload - Data payload accompanying notification
     */
    socketNotificationReceived(notification, payload) {
        try {
            if (notification === "LOAD_DOOR_STATE") {
                // Request to load persisted door state
                this.loadDoorState(payload);
            } else if (notification === "SAVE_DOOR_STATE") {
                // Request to save door state changes
                if (payload && typeof payload === "object") {
                    this.saveDoorState(payload);
                } else {
                    console.error("[MMM-MyTeams-Adventskalender] Invalid payload for SAVE_DOOR_STATE:", payload);
                }
            } else if (notification === "SET_CONFIG") {
                // Store config from frontend
                this.config = payload || {};
            }
        } catch (error) {
            console.error("[MMM-MyTeams-Adventskalender] Error handling socket notification:", error);
        }
    },

    /**
     * Load door state from persistent storage (state.json)
     * Creates initial state if file doesn't exist
     * Handles parsing errors with automatic recovery
     * Can regenerate door numbers if randomizeOnStart is enabled
     * 
     * Flow:
     * 1. Attempt to read state.json
     * 2. If missing/empty: create initial state
     * 3. If corrupted: attempt parse, recreate if fails
     * 4. If randomizeOnStart: regenerate numbers while keeping opened state
     * 5. Send loaded state to frontend via socket notification
     * 
     * @param {object} options - Options object with randomizeOnStart flag
     */
    loadDoorState(options) {
        options = options || {};
        const shouldRandomize = options.randomizeOnStart || this.config.randomizeDoorsOnStart;
        
        fs.readFile(this.stateFilePath, "utf8", (err, data) => {
            try {
                if (err || !data) {
                    // File doesn't exist or is empty - create initial state
                    console.warn("[MMM-MyTeams-Adventskalender] State file not found or empty, creating new one...");
                    const initialState = this.createInitialState(shouldRandomize);
                    
                    // Attempt to write initial state
                    this.writeStateFile(initialState, (writeErr) => {
                        if (writeErr) {
                            console.error("[MMM-MyTeams-Adventskalender] Error creating state.json:", writeErr);
                        } else {
                            console.log("[MMM-MyTeams-Adventskalender] state.json created with initial state");
                        }
                    });

                    this.sendSocketNotification("DOOR_STATE_LOADED", initialState);
                } else {
                    // File exists - attempt to parse JSON
                    try {
                        const parsedData = JSON.parse(data);
                        console.log("[MMM-MyTeams-Adventskalender] State file loaded successfully");
                        
                        // Validate loaded state file integrity
                        this.validateDoorState(parsedData);
                        
                        // Map which door NUMBERS are currently open before regenerating the arrangement
                        const openedDoorNumbers = new Set();
                        for (let i = 0; i < parsedData.numbers.length; i++) {
                            if (parsedData.opened[i]) {
                                openedDoorNumbers.add(parsedData.numbers[i]);
                            }
                        }

                        // Regenerate door numbers based on randomizeOnStart setting
                        if (shouldRandomize) {
                            console.log("[MMM-MyTeams-Adventskalender] Randomizing door numbers on start");
                            parsedData.numbers = Array.from({ length: 24 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
                            // Regenerate opened array based on door numbers
                            parsedData.opened = parsedData.numbers.map(doorNum => openedDoorNumbers.has(doorNum));
                            // Save the randomized state
                            this.writeStateFile(parsedData, (writeErr) => {
                                if (writeErr) {
                                    console.error("[MMM-MyTeams-Adventskalender] Error saving randomized state:", writeErr);
                                } else {
                                    console.log("[MMM-MyTeams-Adventskalender] Randomized door numbers saved");
                                }
                            });
                        } else {
                            console.log("[MMM-MyTeams-Adventskalender] Using sequential door numbers (1-24)");
                            parsedData.numbers = Array.from({ length: 24 }, (_, i) => i + 1);
                            // Regenerate opened array based on door numbers
                            parsedData.opened = parsedData.numbers.map(doorNum => openedDoorNumbers.has(doorNum));
                            // Save the sequential state
                            this.writeStateFile(parsedData, (writeErr) => {
                                if (writeErr) {
                                    console.error("[MMM-MyTeams-Adventskalender] Error saving sequential state:", writeErr);
                                } else {
                                    console.log("[MMM-MyTeams-Adventskalender] Sequential door numbers saved");
                                }
                            });
                        }
                        
                        this.sendSocketNotification("DOOR_STATE_LOADED", parsedData);
                    } catch (parseErr) {
                        // JSON parsing failed - create and save new state
                        console.error("[MMM-MyTeams-Adventskalender] Error parsing state.json, reinitializing:", parseErr);
                        const initialState = this.createInitialState(shouldRandomize);
                        
                        this.writeStateFile(initialState, (writeErr) => {
                            if (writeErr) {
                                console.error("[MMM-MyTeams-Adventskalender] Error recreating state.json:", writeErr);
                            } else {
                                console.log("[MMM-MyTeams-Adventskalender] state.json recreated with initial state");
                            }
                        });

                        this.sendSocketNotification("DOOR_STATE_LOADED", initialState);
                    }
                }
            } catch (error) {
                console.error("[MMM-MyTeams-Adventskalender] Unexpected error in loadDoorState:", error);
                // Failsafe: send initial state
                const initialState = this.createInitialState(shouldRandomize);
                this.sendSocketNotification("DOOR_STATE_LOADED", initialState);
            }
        });
    },

    /**
     * Save door state to persistent storage
     * Saves when user opens/closes doors
     * Implements error handling with user notification
     * 
     * @param {object} state - Door state object containing numbers[] and opened[]
     */
    saveDoorState(state) {
        try {
            // Validate state before saving
            if (!state.numbers || !Array.isArray(state.numbers) || state.numbers.length !== 24) {
                throw new Error("Invalid numbers array");
            }
            if (!state.opened || !Array.isArray(state.opened) || state.opened.length !== 24) {
                throw new Error("Invalid opened array");
            }

            this.writeStateFile(state, (err) => {
                if (err) {
                    console.error("[MMM-MyTeams-Adventskalender] Error saving door state:", err);
                } else {
                    console.log("[MMM-MyTeams-Adventskalender] Door state saved successfully");
                }
            });
        } catch (error) {
            console.error("[MMM-MyTeams-Adventskalender] Error validating state before save:", error);
        }
    },

    /**
     * Write state file to disk with atomic operations
     * Uses temporary file and atomic rename for safe persistence
     * Creates backup of existing state before overwriting
     * 
     * @param {object} state - The state object to write
     * @param {Function} callback - Callback function (error)
     */
    writeStateFile(state, callback) {
        try {
            const jsonString = JSON.stringify(state, null, 2);
            const tmpPath = this.stateFilePath + ".tmp";
            const backupPath = this.stateFilePath + ".bak";
            
            fs.writeFile(tmpPath, jsonString, "utf8", (writeErr) => {
                if (writeErr) {
                    console.error("[MMM-MyTeams-Adventskalender] Error writing tmp file:", writeErr);
                    if (callback) callback(writeErr);
                    return;
                }
                
                if (fs.existsSync(this.stateFilePath)) {
                    fs.copyFile(this.stateFilePath, backupPath, (copyErr) => {
                        if (copyErr) {
                            console.warn("[MMM-MyTeams-Adventskalender] Warning: Could not create backup:", copyErr);
                        }
                        
                        fs.rename(tmpPath, this.stateFilePath, (renameErr) => {
                            if (renameErr) {
                                console.error("[MMM-MyTeams-Adventskalender] Error moving tmp file:", renameErr);
                                if (callback) callback(renameErr);
                            } else {
                                if (callback) callback(null);
                            }
                        });
                    });
                } else {
                    fs.rename(tmpPath, this.stateFilePath, (renameErr) => {
                        if (renameErr) {
                            console.error("[MMM-MyTeams-Adventskalender] Error moving tmp file:", renameErr);
                            if (callback) callback(renameErr);
                        } else {
                            if (callback) callback(null);
                        }
                    });
                }
            });
        } catch (error) {
            console.error("[MMM-MyTeams-Adventskalender] Error stringifying state:", error);
            if (callback) callback(error);
        }
    },

    /**
     * Validate door state file integrity
     * Ensures numbers array contains unique values 1-24
     * Ensures opened array contains only booleans
     * 
     * @param {object} state - State to validate
     * @returns {boolean} True if valid, throws error if invalid
     */
    validateDoorState(state) {
        if (!state.numbers || !Array.isArray(state.numbers) || state.numbers.length !== 24) {
            throw new Error("Invalid numbers array length");
        }
        
        if (!state.opened || !Array.isArray(state.opened) || state.opened.length !== 24) {
            throw new Error("Invalid opened array length");
        }
        
        const sorted = [...state.numbers].sort((a, b) => a - b);
        for (let i = 0; i < 24; i++) {
            if (sorted[i] !== i + 1) {
                throw new Error("Invalid door numbers: must be 1-24 unique");
            }
        }
        
        if (!state.opened.every(v => typeof v === "boolean")) {
            throw new Error("opened array must contain only boolean values");
        }
        
        return true;
    },

    /**
     * Create initial state object
     * Generates door order based on randomizeOnStart setting
     * If randomize is true: shuffles numbers 1-24
     * If randomize is false: uses sequential order 1-24
     * Initializes all doors as closed
     * 
     * @param {boolean} randomize - Whether to randomize door order
     * @returns {object} Initial state with door numbers and all closed
     */
    createInitialState(randomize = true) {
        const numbers = Array.from({ length: 24 }, (_, i) => i + 1);
        if (randomize) {
            numbers.sort(() => Math.random() - 0.5);
        }
        
        return {
            numbers: numbers,
            // All doors start closed
            opened: Array(24).fill(false)
        };
    }
});
