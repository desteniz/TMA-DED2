// 🎯 AUTOMATIC LOCALSTORAGE TO ONLINE CONVERTER
class OnlineStorage {
    constructor() {
        this.binId = '68c85b51d0ea881f407ef39f'; // We'll get this in Step 2
        this.masterKey = '$2a$10$8aDGVbKPjqXnQAxfkV6Tee7s4oCrmLzgOQ5Ocn6sJeAgpBHVjwLIm'; // We'll get this in Step 2
        this.baseUrl = 'https://api.jsonbin.io/v3/b/';
        this.cache = {}; // Local cache for speed
        this.isOnline = true;
    }

    // 🔄 Auto-convert localStorage.setItem
    async setItem(key, value) {
        try {
            // Store in cache first
            this.cache[key] = value;
            
            // Get current data
            const currentData = await this.getAllData();
            currentData[key] = value;
            
            // Save to JSONBin
            const response = await fetch(`${this.baseUrl}${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.masterKey
                },
                body: JSON.stringify(currentData)
            });
            
            if (!response.ok) {
                console.warn('Online storage failed, using cache');
                this.isOnline = false;
            }
            
            return value;
        } catch (error) {
            console.warn('Using offline mode:', error);
            this.isOnline = false;
            localStorage.setItem(key, value); // Fallback
            return value;
        }
    }

    // 🔄 Auto-convert localStorage.getItem  
    async getItem(key) {
        try {
            // Check cache first
            if (this.cache[key]) {
                return this.cache[key];
            }
            
            // Get from JSONBin
            const response = await fetch(`${this.baseUrl}${this.binId}/latest`, {
                headers: {
                    'X-Master-Key': this.masterKey
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.cache = data.record; // Update cache
                return data.record[key] || null;
            } else {
                throw new Error('Network error');
            }
        } catch (error) {
            console.warn('Falling back to localStorage:', error);
            return localStorage.getItem(key); // Fallback
        }
    }

    // 📥 Get all data (for backups)
    async getAllData() {
        try {
            const response = await fetch(`${this.baseUrl}${this.binId}/latest`, {
                headers: {
                    'X-Master-Key': this.masterKey
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.record || {};
            }
            return {};
        } catch (error) {
            console.warn('Could not fetch data:', error);
            return {};
        }
    }

    // 💾 Create backup
    async createBackup() {
        const allData = await this.getAllData();
        const backup = {
            timestamp: new Date().toISOString(),
            data: allData,
            version: '1.0'
        };
        
        // Save backup with timestamp
        const backupKey = `backup_${Date.now()}`;
        await this.setItem(backupKey, JSON.stringify(backup));
        
        return backup;
    }
}

// 🚀 MAGIC: Replace localStorage globally
const onlineStorage = new OnlineStorage();

// Override localStorage functions
const originalSetItem = localStorage.setItem;
const originalGetItem = localStorage.getItem;

localStorage.setItem = function(key, value) {
    // Still save locally as backup
    originalSetItem.call(this, key, value);
    // Also save online
    onlineStorage.setItem(key, value);
};

localStorage.getItem = function(key) {
    // Try online first, fallback to local
    if (navigator.onLine) {
        return onlineStorage.getItem(key);
    } else {
        return originalGetItem.call(this, key);
    }
};

console.log('🎉 Storage converter activated! All localStorage calls now use shared online storage.');
