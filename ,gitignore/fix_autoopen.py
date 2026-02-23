import re

file_path = 'MMM-MyTeams-Adventskalender.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Remove the misplaced console.log that was added to scheduleAutoOpen
# Looking for: }, 60000);\n        \n        console.log("[AUTOOPEN-DEBUG] checkAndAutoOpen() called");
content = content.replace(
    '''}, 60000);
        
        console.log("[AUTOOPEN-DEBUG] checkAndAutoOpen() called");''',
    '''}, 60000);'''
)

# Fix 2: Fix the checkAndAutoOpen method - move variable declarations before their use
# The problem: line 710 references variables that aren't declared until line 726

# Find checkAndAutoOpen method and reorder the variable declarations
old_section = '''    checkAndAutoOpen() {
        try {
            const now = this.getCurrentDate();
            const currentDay = now.getDate();
            const configTime = this.config.autoopenat.split(":");
            const targetHour = parseInt(configTime[0], 10);
            const targetMinute = parseInt(configTime[1], 10);
            
            if (!this.doorState) {
                Log.warn("[Auto-Open] Door state not available yet, cannot check auto-open");
                return;
            }
            
            console.log(`[AUTOOPEN-DEBUG] currentTime=${currentTimeStr}, targetTime=${targetTimeStr}, currentMins=${currentTimeInMinutes}, targetMins=${targetTimeInMinutes}, opened=${this.autoOpenedToday}`);

            // Track by calendar day - prevents duplicate opens if module restarts
            if (this.lastAutoOpenDay === null) {
                this.lastAutoOpenDay = currentDay;
                Log.info(`[Auto-Open] Initialized with current day: ${currentDay}`);
            }
            
            // Reset tracking when day changes
            if (currentDay !== this.lastAutoOpenDay) {
                this.autoOpenedToday = false;
                this.lastAutoOpenDay = currentDay;
                Log.info(`[Auto-Open] Day changed to ${currentDay}, reset auto-open flag`);
            }
            
            // Check if it's time to open (current time >= target time AND haven't opened yet today)
            const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
            const targetTimeInMinutes = targetHour * 60 + targetMinute;
            const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            const targetTimeStr = `${String(targetHour).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")}`;
            
            Log.info(`[Auto-Open] Check: currentTime=${currentTimeStr}, targetTime=${targetTimeStr}, opened=${this.autoOpenedToday}`);
            
            if (currentTimeInMinutes >= targetTimeInMinutes && !this.autoOpenedToday) {
                Log.info(`[Auto-Open] Time condition met! Opening today's door...`);
                this.openTodaysDoor();
                this.autoOpenedToday = true;
            }
        } catch (error) {
            this.handleError("Auto-open check failed", error);
        }
    },'''

new_section = '''    checkAndAutoOpen() {
        try {
            console.log("[AUTOOPEN-DEBUG] checkAndAutoOpen() called");
            const now = this.getCurrentDate();
            const currentDay = now.getDate();
            const configTime = this.config.autoopenat.split(":");
            const targetHour = parseInt(configTime[0], 10);
            const targetMinute = parseInt(configTime[1], 10);
            
            if (!this.doorState) {
                Log.warn("[Auto-Open] Door state not available yet, cannot check auto-open");
                return;
            }
            
            // Check if it's time to open (current time >= target time AND haven't opened yet today)
            const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
            const targetTimeInMinutes = targetHour * 60 + targetMinute;
            const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            const targetTimeStr = `${String(targetHour).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")}`;
            
            console.log(`[AUTOOPEN-DEBUG] currentTime=${currentTimeStr}, targetTime=${targetTimeStr}, currentMins=${currentTimeInMinutes}, targetMins=${targetTimeInMinutes}, opened=${this.autoOpenedToday}`);

            // Track by calendar day - prevents duplicate opens if module restarts
            if (this.lastAutoOpenDay === null) {
                this.lastAutoOpenDay = currentDay;
                Log.info(`[Auto-Open] Initialized with current day: ${currentDay}`);
            }
            
            // Reset tracking when day changes
            if (currentDay !== this.lastAutoOpenDay) {
                this.autoOpenedToday = false;
                this.lastAutoOpenDay = currentDay;
                Log.info(`[Auto-Open] Day changed to ${currentDay}, reset auto-open flag`);
            }
            
            Log.info(`[Auto-Open] Check: currentTime=${currentTimeStr}, targetTime=${targetTimeStr}, opened=${this.autoOpenedToday}`);
            
            if (currentTimeInMinutes >= targetTimeInMinutes && !this.autoOpenedToday) {
                Log.info(`[Auto-Open] Time condition met! Opening today's door...`);
                this.openTodaysDoor();
                this.autoOpenedToday = true;
            }
        } catch (error) {
            this.handleError("Auto-open check failed", error);
        }
    },'''

content = content.replace(old_section, new_section)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Fixed checkAndAutoOpen: moved variable declarations before use")
print("✓ Fixed scheduleAutoOpen: removed misplaced console.log")
