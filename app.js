// DOUROUB EL DJAZAIR - PERFECT Transportation Management System
class TransportApp {
constructor() {
    this.currentUser = null;
    this.currentSection = 'dashboard';
    this.currentMissionForAssignment = null;
    
    // TIMEZONE FIX: Set Africa/Algiers as the app timezone
    this.APP_TIMEZONE = 'Africa/Algiers';
    this.appClock = null;
    
    // Initialize application
    this.initializeData();
    this.waitForDOM().then(() => {
        this.initializeEventListeners();
		    this.enableOperationCommentsFeature(); // ← Add this line
        this.ensureModalsAreClosed();
        this.initializeLucideIcons();
        this.checkExistingSession();
        
        // CRITICAL: Start the Africa/Algiers app clock
        this.startAppClock();
        
        // Start auto-refresh system
        this.startAutoRefresh();
		// Initialize Gantt Timeline
this.initializeGanttTimeline();

		// Permissions versioning and backup interval (8 hours)
this.PERMISSIONS_VERSION = 1;
this.BACKUP_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Initialize users/permissions and auto-backup system
this.initializeUsersAndPermissions()
  .then(() => {
      // schedule backups after users/permissions init
      this.scheduleAutoBackup();
  })
  .catch(err => console.error('Init users/permissions error:', err));

    });
}
// ====== USERS & PERMISSIONS STORAGE ======
getUsers() {
  try { return JSON.parse(localStorage.getItem('transport_users') || '[]'); } catch { return []; }
}
saveUsers(users) {
  localStorage.setItem('transport_users', JSON.stringify(users));
}
getPermissions() {
  try { return JSON.parse(localStorage.getItem('transport_permissions') || '{}'); } catch { return {}; }
}
savePermissions(perms) {
  localStorage.setItem('transport_permissions', JSON.stringify(perms));
}
getPermissionsVersion() {
  return parseInt(localStorage.getItem('transport_permissions_version') || '0', 10);
}
setPermissionsVersion(v) {
  localStorage.setItem('transport_permissions_version', String(v));
}

// Web Crypto SHA-256
async hashPassword(plain) {
  const data = new TextEncoder().encode(plain || '');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Create initial users from demo accounts if no user store exists
// Create initial users from demo accounts if no user store exists
async initializeUsersAndPermissions() {
  const existing = this.getUsers();
  const currentPermVer = this.getPermissionsVersion();

  if (existing.length === 0) {
    // migrate demoAccounts -> transport_users with hashed passwords
    const migrated = [];
    for (const acc of (this.demoAccounts || [])) {
      migrated.push({
        id: Date.now() + Math.floor(Math.random()*100000),
        username: acc.username,
        full_name: acc.name,
        role: acc.role,
        status: 'active',
        last_login: null,
        password_hash: await this.hashPassword(acc.password),
        created_at: new Date().toISOString()
      });
    }
    this.saveUsers(migrated);
  }

  // Install/Reset permissions on update to wipe all previous privileges
  if (currentPermVer !== this.PERMISSIONS_VERSION) {
    const users = this.getUsers();
    const perms = {};
    
    // Define all available permissions
    const allPermissions = [
      // Missions
      'missions.create', 'missions.edit', 'missions.delete', 'missions.validate', 'missions.assign',
      // Smart Assignment - THIS WAS MISSING!
      'missions.smart_assignment',
      // Operations  
      'operations.view', 'operations.modify_status', 'operations.modify_assignment',
      // Fleet
      'flotte.view', 'flotte.add_truck', 'flotte.edit_truck', 'flotte.delete_truck', 
      'flotte.add_driver', 'flotte.edit_driver', 'flotte.delete_driver', 'flotte.change_location',
      // Clients
      'clients.create', 'clients.edit', 'clients.delete',
      // Reports
      'reports.generate', 'reports.export',
      // Settings
      'settings.manage_users', 'settings.manage_permissions', 'settings.backup_restore'
    ];

users.forEach(u => { 
  if (u.role === 'admin') {
    // ADMIN GETS ALL PERMISSIONS BY DEFAULT - ENHANCED LIST
    const adminPerms = {};
    const allPermissions = [
      // Missions
      'missions.create', 'missions.edit', 'missions.delete', 'missions.validate', 'missions.assign',
      'missions.smart_assignment', 'missions.export_pdf',
      // Operations  
      'operations.view', 'operations.modify_status', 'operations.modify_assignment',
      'operations.start', 'operations.terminate', 'operations.cancel',
      // Fleet
      'flotte.view', 'flotte.add_truck', 'flotte.edit_truck', 'flotte.delete_truck', 
      'flotte.add_driver', 'flotte.edit_driver', 'flotte.delete_driver', 'flotte.change_location',
      // Clients
      'clients.create', 'clients.edit', 'clients.delete',
      // Reports
      'reports.view', 'reports.generate', 'reports.export', 'reports.export_excel',
      // Dashboard
      'dashboard.view', 'dashboard.view_history',
      // Settings
      'settings.manage_users', 'settings.manage_permissions', 'settings.backup_restore'
    ];
    
    allPermissions.forEach(perm => {
      adminPerms[perm] = true;
    });
    perms[u.username] = adminPerms;
    
    console.log(`Admin user ${u.username} granted ALL permissions:`, adminPerms);
  } else {
    perms[u.username] = {}; // Others get no permissions by default
  }
});

    
    this.savePermissions(perms);
    this.setPermissionsVersion(this.PERMISSIONS_VERSION);
    console.warn('All previous privileges erased - Admin has all permissions, others need assignment.');
  }
}


// Permission checks
hasPermission(permKey) {
  if (!this.currentUser || !this.currentUser.username) return false;
  const perms = this.getPermissions();
  const uperms = perms[this.currentUser.username] || {};
  return !!uperms[permKey];
}
requirePermission(permKey, friendly = 'Action non autorisée') {
  if (!this.hasPermission(permKey)) {
    alert(`${friendly} (Permission requise: ${permKey})`);
    return false;
  }
  return true;
}


// ============================================
// TIMEZONE FIX: Africa/Algiers Utility Functions
// ============================================

// Get current Africa/Algiers time as Date object
getCurrentAlgiersTime() {
    const now = new Date();
    
    // Get UTC time and add exactly 1 hour for Algeria (UTC+1, no DST)
    const utcTime = now.getTime();
    const algeriaTime = new Date(utcTime + (1 * 60 * 60 * 1000)); // Add 1 hour
    
    // Format components for display
    const year = algeriaTime.getUTCFullYear();
    const month = algeriaTime.getUTCMonth() + 1;
    const day = algeriaTime.getUTCDate();
    const hour = algeriaTime.getUTCHours();
    const minute = algeriaTime.getUTCMinutes();
    const second = algeriaTime.getUTCSeconds();
    
    return {
        year: year,
        month: month - 1, // Keep 0-indexed for Date constructor compatibility
        day: day,
        hour: hour,
        minute: minute,
        second: second,
        timeString: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
        dateString: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    };
}
// ============================================
// TIMEZONE FIX: Complete Algeria Timezone Solution
// ============================================

// Get current Algeria time as ISO string (CRITICAL FIX)
getCurrentAlgiersTimestamp() {
    const now = new Date();
    
    // Get UTC time and add exactly 1 hour for Algeria
    const utcTime = now.getTime();
    const algeriaTime = new Date(utcTime + (1 * 60 * 60 * 1000));
    
    return algeriaTime.toISOString();
}

// SIMPLE FIX: Format timestamp for datetime-local input (PREVENT DOUBLE CONVERSION)
formatForDatetimeLocal(timestamp) {
    if (!timestamp) return '';
    
    try {
        // Parse the timestamp and convert to Algeria time
        const date = new Date(timestamp);
        
        if (isNaN(date.getTime())) {
            return '';
        }
        
        // Add 1 hour for Algeria timezone
        const algeriaDate = new Date(date.getTime() + (1 * 60 * 60 * 1000));
        
        // Format for datetime-local input (YYYY-MM-DDTHH:MM)
        const year = algeriaDate.getUTCFullYear();
        const month = String(algeriaDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(algeriaDate.getUTCDate()).padStart(2, '0');
        const hours = String(algeriaDate.getUTCHours()).padStart(2, '0');
        const minutes = String(algeriaDate.getUTCMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
        
    } catch (error) {
        console.error('Error formatting for datetime-local:', error);
        return '';
    }
}

// Convert FROM datetime-local input to UTC timestamp (CRITICAL FIX)
// FIXED: Convert FROM datetime-local input to timestamp (PREVENT DOUBLE CONVERSION)
convertFromDatetimeLocal(datetimeLocalValue) {
    if (!datetimeLocalValue) return null;
    
    try {
        // Parse the datetime-local value as Algeria time
        const localDate = new Date(`${datetimeLocalValue}:00.000Z`);
        
        if (isNaN(localDate.getTime())) {
            return null;
        }
        
        // Subtract 1 hour to convert from Algeria time back to UTC
        const utcDate = new Date(localDate.getTime() - (1 * 60 * 60 * 1000));
        
        return utcDate.toISOString();
        
    } catch (error) {
        console.error('Error converting from datetime-local:', error);
        return null;
    }
}
// Format timestamp for DISPLAY in Algeria timezone (CRITICAL FIX)
// FIXED: Format timestamp to Algeria timezone for display (CRITICAL FIX)
formatAlgeriaDateTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        
        if (isNaN(date.getTime())) {
            console.warn('Invalid timestamp for Algeria formatting:', timestamp);
            return timestamp;
        }
        
        // Add 1 hour for Algeria timezone (UTC+1)
        const algeriaDate = new Date(date.getTime() + (1 * 60 * 60 * 1000));
        
        // Format as DD/MM/YYYY HH:MM
        const day = String(algeriaDate.getUTCDate()).padStart(2, '0');
        const month = String(algeriaDate.getUTCMonth() + 1).padStart(2, '0');
        const year = algeriaDate.getUTCFullYear();
        const hours = String(algeriaDate.getUTCHours()).padStart(2, '0');
        const minutes = String(algeriaDate.getUTCMinutes()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
        
    } catch (error) {
        console.error('Error formatting Algeria date:', error, 'Timestamp:', timestamp);
        return timestamp || '';
    }
}



// Start the app clock showing Africa/Algiers time
startAppClock() {
    const updateClock = () => {
        const algiersTime = this.getCurrentAlgiersTime();
        
        const timeElement = document.getElementById('clockTime');
        const dateElement = document.getElementById('clockDate');
        
        if (timeElement && dateElement) {
            timeElement.textContent = algiersTime.timeString;
            dateElement.textContent = algiersTime.dateString;
        }
    };
    
    // Update immediately and then every second
    updateClock();
    this.appClock = setInterval(updateClock, 1000);
    
    console.log('App Clock started - Africa/Algiers timezone (UTC+1)');
}
// Stop the app clock (cleanup)
stopAppClock() {
    if (this.appClock) {
        clearInterval(this.appClock);
        this.appClock = null;
    }
}


    
    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }
    
    ensureModalsAreClosed() {
        const modals = ['missionModal', 'assignmentModal', 'clientModal', 'truckModal', 'driverModal', 'ficheModal', 'notificationsPanel'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.add('hidden');
        });
    }
    
    initializeData() {
        // Demo accounts with perfect role-based access
        this.demoAccounts = [
            {username: "planner1", password: "plan123", role: "planner", name: "Ahmed Benali"},
            {username: "dispatcher1", password: "disp123", role: "dispatcher", name: "Mohamed Zeroual"},
            {username: "coordinator1", password: "coord123", role: "coordinator", name: "Fatima Cherif"},
            {username: "admin", password: "admin123", role: "admin", name: "Administrateur Système"}
        ];

        // Algerian wilayas
        this.wilayas = [
            "01-Adrar", "02-Chlef", "03-Laghouat", "04-Oum El Bouaghi", "05-Batna", 
            "06-Béjaïa", "07-Biskra", "08-Béchar", "09-Blida", "10-Bouira", 
            "11-Tamanrasset", "12-Tébessa", "13-Tlemcen", "14-Tiaret", "15-Tizi Ouzou", 
            "16-Alger", "17-Djelfa", "18-Jijel", "19-Sétif", "20-Saïda", "21-Skikda", 
            "22-Sidi Bel Abbès", "23-Annaba", "24-Guelma", "25-Constantine", "26-Médéa", 
            "27-Mostaganem", "28-M'Sila", "29-Mascara", "30-Ouargla", "31-Oran", 
            "32-El Bayadh", "33-Illizi", "34-Bordj Bou Arréridj", "35-Boumerdès", 
            "36-El Tarf", "37-Tindouf", "38-Tissemsilt", "39-El Oued", "40-Khenchela", 
            "41-Souk Ahras", "42-Tipaza", "43-Mila", "44-Aïn Defla", "45-Naâma", 
            "46-Aïn Témouchent", "47-Ghardaïa", "48-Relizane", "49-Timimoun", 
            "50-Bordj Badji Mokhtar", "51-Ouled Djellal", "52-Béni Abbès", "53-In Salah", 
            "54-In Guezzam", "55-Touggourt", "56-Djanet", "57-El M'Ghair", "58-El Meniaa"
        ];
        
        this.initializeSampleData();
    }
    
initializeSampleData() {
    // Initialize drivers with only names from the table
    if (!localStorage.getItem('transport_drivers')) {
        const sampleDrivers = [
            { id: 1, name: "Mekhlil Youcef", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 1, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 2, name: "Khan Abdelkader", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 2, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 3, name: "Missaoui Hamza", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 3, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 4, name: "Souidi Said", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 4, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 5, name: "Ben Rabeh Ghiaba", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 5, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 6, name: "Labza Rezzag Ahmed", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 6, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 7, name: "Brahimi Ali", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 7, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 8, name: "Athamnia Mohamed Sghir", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 8, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 9, name: "Rihani Hakim", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 9, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 10, name: "Bennour Mohamed", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 10, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 11, name: "Benaissa Khaled", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 11, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 12, name: "Rahal khaled", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 12, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 13, name: "Belalit Hacene", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 13, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 14, name: "Tellia Hichem", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 14, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 15, name: "Masmoudi Mourad", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 15, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 16, name: "Hatna Boubaker", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 16, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 17, name: "Amrane Abdelkader", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 17, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 18, name: "Houara Bilel", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 18, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 19, name: "Baghoura Abdallah", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 19, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 20, name: "Agoune Djalel", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 20, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 21, name: "Rihani Abdelhak", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 21, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 22, name: "Atraoui Ibrahim", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 22, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 24, name: "Rais Farouk", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 24, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 26, name: "Gouacemi Hichem", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 26, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 27, name: "Maalam Hichem", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 27, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 28, name: "Khelifi Naim", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 28, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 30, name: "Righi Salim", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 30, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 32, name: "Chikhaoui Lahcen", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 32, next_available_time: null, next_available_location: "07-Biskra" },
            { id: 33, name: "Ghaoui Mohamed", license_number: "", phone: "", current_location: "07-Biskra", status: "available", experience_years: "", assigned_truck_id: 33, next_available_time: null, next_available_location: "07-Biskra" }
        ];
        localStorage.setItem('transport_drivers', JSON.stringify(sampleDrivers));
    }
    
    // Initialize trucks with assigned drivers
    if (!localStorage.getItem('transport_trucks')) {
        const sampleTrucks = [
            { id: 1, registration: "000065-525-07", brand: "MAN", model: "T001", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 1, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 1 },
            { id: 2, registration: "000073-525-07", brand: "MAN", model: "T002", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 2, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 2 },
            { id: 3, registration: "000074-525-07", brand: "MAN", model: "T003", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 3, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 3 },
            { id: 4, registration: "000071-525-07", brand: "MAN", model: "T004", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 4, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 4 },
            { id: 5, registration: "000060-525-07", brand: "MAN", model: "T005", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 5, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 5 },
            { id: 6, registration: "000066-525-07", brand: "MAN", model: "T006", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 6, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 6 },
            { id: 7, registration: "000072-525-07", brand: "MAN", model: "T007", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 7, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 7 },
            { id: 8, registration: "000055-525-07", brand: "MAN", model: "T008", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 8, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 8 },
            { id: 9, registration: "000064-525-07", brand: "MAN", model: "T009", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 9, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 9 },
            { id: 10, registration: "000067-525-07", brand: "MAN", model: "T010", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 10, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 10 },
            { id: 11, registration: "000041-525-07", brand: "MAN", model: "T011", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 11, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 11 },
            { id: 12, registration: "000062-525-07", brand: "MAN", model: "T012", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 12, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 12 },
            { id: 13, registration: "000051-525-07", brand: "MAN", model: "T013", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 13, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 13 },
            { id: 14, registration: "000057-525-07", brand: "MAN", model: "T014", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 14, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 14 },
            { id: 15, registration: "000070-525-07", brand: "MAN", model: "T015", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 15, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 15 },
            { id: 16, registration: "000049-525-07", brand: "MAN", model: "T016", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 16, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 16 },
            { id: 17, registration: "000051-525-07", brand: "MAN", model: "T017", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 17, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 17 },
            { id: 18, registration: "000050-525-07", brand: "MAN", model: "T018", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 18, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 18 },
            { id: 19, registration: "000063-525-07", brand: "MAN", model: "T019", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 19, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 19 },
            { id: 20, registration: "000069-525-07", brand: "MAN", model: "T020", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 20, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 20 },
            { id: 21, registration: "000052-525-07", brand: "MAN", model: "T021", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 21, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 21 },
            { id: 22, registration: "000061-525-07", brand: "MAN", model: "T022", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 22, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 22 },
            { id: 23, registration: "000040-525-07", brand: "MAN", model: "T023", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: null, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: null },
            { id: 24, registration: "000048-525-07", brand: "MAN", model: "T024", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 24, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 24 },
            { id: 25, registration: "000047-525-07", brand: "MAN", model: "T025", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: null, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: null },
            { id: 26, registration: "000046-525-07", brand: "MAN", model: "T026", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 26, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 26 },
            { id: 27, registration: "000042-525-07", brand: "MAN", model: "T027", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 27, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 27 },
            { id: 28, registration: "000044-525-07", brand: "MAN", model: "T028", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 28, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 28 },
            { id: 29, registration: "000068-525-07", brand: "MAN", model: "T029", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: null, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: null },
            { id: 30, registration: "000056-525-07", brand: "MAN", model: "T030", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 30, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 30 },
            { id: 31, registration: "000054-525-07", brand: "MAN", model: "T031", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: null, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: null },
            { id: 32, registration: "000043-525-07", brand: "MAN", model: "T032", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 32, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 32 },
            { id: 33, registration: "000045-525-07", brand: "MAN", model: "T033", year: 2025, capacity: 26, status: "available", current_location: "07-Biskra", gps_location: "", next_available_time: null, next_available_location: "07-Biskra", assigned_driver_id: 33, current_mission_id: null, last_maintenance: "", next_maintenance: "", carte_naftal: "", permanent_driver_id: 33 }
        ];
        localStorage.setItem('transport_trucks', JSON.stringify(sampleTrucks));
    }
    
    // Initialize empty arrays for other data
    if (!localStorage.getItem('transport_clients')) {
        localStorage.setItem('transport_clients', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('transport_missions')) {
        localStorage.setItem('transport_missions', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('transport_notifications')) {
        localStorage.setItem('transport_notifications', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('transport_activities')) {
        localStorage.setItem('transport_activities', JSON.stringify([]));
    }
}
    
    initializeEventListeners() {
        try {
            // Login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            }
            
            // Logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
            
            // Navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleNavigation(e));
            });
            
            // Dashboard refresh
            const refreshBtn = document.getElementById('refreshDashboard');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadDashboard());
            }
            
            // Modals
            this.initializeModalEventListeners();
            
            // Notifications
// Notifications
const notificationBell = document.getElementById('notificationBell');
if (notificationBell) {
    notificationBell.addEventListener('click', () => this.toggleNotifications());
}

const clearNotifications = document.getElementById('clearNotifications');
if (clearNotifications) {
    clearNotifications.addEventListener('click', () => this.clearNotifications());
}

			
			// Add these lines inside your initializeEventListeners() function, 
// right before the closing } of the function:

// Dashboard event listeners
const clearEventHistory = document.getElementById('clearEventHistory');
if (clearEventHistory) {
    clearEventHistory.addEventListener('click', () => this.clearEventHistory());
}

const exportEventHistory = document.getElementById('exportEventHistory');
if (exportEventHistory) {
    exportEventHistory.addEventListener('click', () => this.exportEventHistory());
}

const loadMoreEvents = document.getElementById('loadMoreEvents');
if (loadMoreEvents) {
    loadMoreEvents.addEventListener('click', () => this.loadMoreEventHistory());
}
// Add these lines inside your initializeEventListeners() method:

// Enhanced missions filters
const refreshMissionsBtn = document.getElementById('refreshMissionsBtn');
if (refreshMissionsBtn) {
    refreshMissionsBtn.addEventListener('click', () => this.loadMissions());
}

const applyFilters = document.getElementById('applyFilters');
if (applyFilters) {
    applyFilters.addEventListener('click', () => this.loadMissions());
}

const resetFilters = document.getElementById('resetFilters');
if (resetFilters) {
    resetFilters.addEventListener('click', () => {
        document.getElementById('statusFilter').value = '';
        document.getElementById('clientFilter').value = '';
        document.getElementById('periodFilter').value = '';
        this.loadMissions();
    });
}

// Auto-apply filters when dropdowns change
const statusFilter = document.getElementById('statusFilter');
if (statusFilter) {
    statusFilter.addEventListener('change', () => this.loadMissions());
}

const clientFilter = document.getElementById('clientFilter');
if (clientFilter) {
    clientFilter.addEventListener('change', () => this.loadMissions());
}

const periodFilter = document.getElementById('periodFilter');
if (periodFilter) {
    periodFilter.addEventListener('change', () => this.loadMissions());
}

// FIXED: Proper event listeners for operation filters
const quickResetFilters = document.getElementById('quickResetFilters');
if (quickResetFilters) {
    quickResetFilters.addEventListener('click', () => this.resetAllOperationFilters());
}

const applyFiltersQuick = document.getElementById('applyFiltersQuick');
if (applyFiltersQuick) {
    applyFiltersQuick.addEventListener('click', () => this.applyEnhancedOperationFilters());
}
// Dispatcher controls event listeners
const forceTrackStatus = document.getElementById('forceTrackStatus');
if (forceTrackStatus) {
    forceTrackStatus.addEventListener('change', () => {
        const dispatcherControls = document.getElementById('dispatcherControls');
        if (dispatcherControls) {
            dispatcherControls.style.display = ['dispatcher', 'admin'].includes(this.currentUser.role) ? 'block' : 'none';
        }
    });
}
// ===== Settings bindings =====
const addUserBtn = document.getElementById('addUserBtn');
if (addUserBtn) addUserBtn.addEventListener('click', () => this.openUserModal());

const closeUserModal = document.getElementById('closeUserModal');
const cancelUserBtn = document.getElementById('cancelUserBtn');
if (closeUserModal) closeUserModal.addEventListener('click', () => this.closeModal('userModal'));
if (cancelUserBtn) cancelUserBtn.addEventListener('click', () => this.closeModal('userModal'));

const userForm = document.getElementById('userForm');
if (userForm) userForm.addEventListener('submit', (e) => this.handleUserSave(e));

// Confirm modal basic bindings
const closeConfirmModal = document.getElementById('closeConfirmModal');
if (closeConfirmModal) closeConfirmModal.addEventListener('click', () => this.closeModal('confirmModal'));
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', () => this.closeModal('confirmModal'));

// Permissions events
const savePermissionsBtn = document.getElementById('savePermissionsBtn');
if (savePermissionsBtn) savePermissionsBtn.addEventListener('click', () => this.saveSelectedPermissions());

const permissionUserSelect = document.getElementById('permissionUserSelect');
if (permissionUserSelect) permissionUserSelect.addEventListener('change', () => this.renderPermissionsForSelectedUser());

document.querySelectorAll('.perm-toggle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = e.currentTarget.getAttribute('data-target');
    const body = document.getElementById(targetId);
    if (!body) return;
    body.style.display = (body.style.display === 'none') ? 'grid' : 'none';
  });
});
document.querySelectorAll('.perm-checkall-cat').forEach(cb => {
  cb.addEventListener('change', (e) => {
    const cat = e.currentTarget.getAttribute('data-category');
    const group = document.querySelector(`#perm-cat-${cat}`);
    if (!group) return;
    group.querySelectorAll('input[type="checkbox"][data-perm]').forEach(ch => ch.checked = e.currentTarget.checked);
  });
});

// Backup & Restore
const downloadBackupBtn = document.getElementById('downloadBackupBtn');
if (downloadBackupBtn) downloadBackupBtn.addEventListener('click', () => this.downloadBackup());

const restoreFileInput = document.getElementById('restoreFileInput');
if (restoreFileInput) restoreFileInput.addEventListener('change', (e) => this.handleRestoreFile(e));

// Maintenance confirmation modal event listeners
const closeMaintenanceConfirmModal = document.getElementById('closeMaintenanceConfirmModal');
if (closeMaintenanceConfirmModal) {
    closeMaintenanceConfirmModal.addEventListener('click', () => {
        document.getElementById('maintenanceConfirmModal').classList.add('hidden');
    });
}
// Network fullscreen button - TRUE FULLSCREEN LIKE F11
const networkFullscreen = document.getElementById('networkFullscreen');
if (networkFullscreen) {
    networkFullscreen.addEventListener('click', () => this.toggleNetworkFullscreen());
}
// Listen for fullscreen changes (ESC key or other exit methods)
document.addEventListener('fullscreenchange', () => {
    const container = document.getElementById('operationsNetworkContainer');
    const fullscreenBtn = document.getElementById('networkFullscreen');
    
    if (!container || !fullscreenBtn) return;
    
    const icon = fullscreenBtn.querySelector('i');
    
    if (!document.fullscreenElement) {
        // Exited fullscreen
        icon.setAttribute('data-lucide', 'maximize');
        fullscreenBtn.title = 'Mode plein écran';
        container.classList.remove('network-fullscreen-active');
        
        // Refresh icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        
        // Resize network
        if (this.networkInstance) {
            setTimeout(() => {
                this.networkInstance.fit();
                this.networkInstance.center();
            }, 100);
        }
    }
});

// Populate wilaya dropdown for dispatcher overrides
const forceTruckLocation = document.getElementById('forceTruckLocation');
if (forceTruckLocation) {
    forceTruckLocation.innerHTML = '<option value="">Pas de modification</option>';
    this.wilayas.forEach(wilaya => {
        forceTruckLocation.innerHTML += `<option value="${wilaya}">${wilaya}</option>`;
    });
}

console.log('Cyclic update system initialized');

// Enhanced Filter toggle functionality with proper state management
const filterToggleBtn = document.getElementById('filterToggleBtn');
const filterMenuContent = document.getElementById('filterMenuContent');

if (filterToggleBtn && filterMenuContent) {
    // Ensure filters start hidden
    filterMenuContent.classList.add('hidden');
    filterMenuContent.classList.remove('active');
    
    // Remove any existing event listeners to avoid duplicates
    const newFilterToggleBtn = filterToggleBtn.cloneNode(true);
    filterToggleBtn.parentNode.replaceChild(newFilterToggleBtn, filterToggleBtn);
    
    newFilterToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Add this to prevent event bubbling
        console.log('Filter toggle clicked');
        
        const isHidden = filterMenuContent.classList.contains('hidden');
        
        if (isHidden) {
            // Show filters
            filterMenuContent.classList.remove('hidden');
            filterMenuContent.classList.add('active');
            newFilterToggleBtn.classList.add('active');
            console.log('Filters shown');
        } else {
            // Hide filters
            filterMenuContent.classList.add('hidden');
            filterMenuContent.classList.remove('active');
            newFilterToggleBtn.classList.remove('active');
            console.log('Filters hidden');
        }
    });
    
    console.log('Filter toggle button setup complete');
}

// Operation edit modal
// ✅ NEW - Correct setup
// The operation drawer form is handled separately, not through setupModalEventListeners
// FIXED: Add event listener for client change in operation edit modal
const editOperationClient = document.getElementById('editOperationClient');
if (editOperationClient) {
    editOperationClient.addEventListener('change', (e) => {
        this.handleOperationClientSelection(e);
    });
}

// Mission recap modal
this.setupModalEventListeners('generateMissionRecap', 'missionRecapModal', 'closeMissionRecapModal', 'cancelMissionRecap', null);

const generateRecapPDF = document.getElementById('generateRecapPDF');
if (generateRecapPDF) {
    generateRecapPDF.addEventListener('click', () => {
        const selectedMission = document.getElementById('recapMissionSelect').value;
        if (selectedMission) {
            this.generateMissionRecap(parseInt(selectedMission));
            this.closeModal('missionRecapModal');
        } else {
            alert('Veuillez sélectionner une mission');
        }
    });
// FIXED: Operation Drawer Event Listeners
const closeDrawer = document.getElementById('closeDrawer');
if (closeDrawer) {
    // Remove any existing listeners
    const newCloseBtn = closeDrawer.cloneNode(true);
    closeDrawer.parentNode.replaceChild(newCloseBtn, closeDrawer);
    
    newCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Close drawer button clicked');
        this.closeOperationDrawer();
    });
}

const drawerOverlay = document.getElementById('drawerOverlay');
if (drawerOverlay) {
    const newOverlay = drawerOverlay.cloneNode(true);
    drawerOverlay.parentNode.replaceChild(newOverlay, drawerOverlay);
    
    newOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drawer overlay clicked');
        this.closeOperationDrawer();
    });
}

const cancelModifyOperation = document.getElementById('cancelModifyOperation');
if (cancelModifyOperation) {
    // Remove any existing listeners
    const newCancelBtn = cancelModifyOperation.cloneNode(true);
    cancelModifyOperation.parentNode.replaceChild(newCancelBtn, cancelModifyOperation);
    
    newCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Cancel modify operation button clicked');
        this.closeOperationDrawer();
    });
}


// (Comment out or remove the ESC key section)

// Enhanced filter event listeners
const applyEnhancedFilters = document.getElementById('applyOperationFilters');
if (applyEnhancedFilters) {
    applyEnhancedFilters.addEventListener('click', () => this.applyEnhancedOperationFilters());
}

const resetEnhancedFilters = document.getElementById('resetOperationFilters');
if (resetEnhancedFilters) {
    resetEnhancedFilters.addEventListener('click', () => {
        // Reset all filters
        document.getElementById('operationStatusFilter').selectedIndex = -1;
        document.getElementById('operationMissionFilter').selectedIndex = -1;
        document.getElementById('operationClientFilter').selectedIndex = -1;
        document.getElementById('operationDestinationFilter').selectedIndex = -1;
        document.getElementById('operationDriverFilter').selectedIndex = -1;
        document.getElementById('operationTruckFilter').selectedIndex = -1;
        document.getElementById('operationStartDateFilter').value = '';
        document.getElementById('operationEndDateFilter').value = '';
        
        this.loadOperationsTable();
    });
}

const clearAllFilters = document.getElementById('clearAllFilters');
if (clearAllFilters) {
    clearAllFilters.addEventListener('click', () => {
        // Clear all selections
        const allSelects = document.querySelectorAll('#operationsFiltersEnhanced select[multiple]');
        allSelects.forEach(select => {
            select.selectedIndex = -1;
        });
        document.getElementById('operationStartDateFilter').value = '';
        document.getElementById('operationEndDateFilter').value = '';
        document.getElementById('activeFilters').innerHTML = '';
        
        this.loadOperationsTable();
    });
}

// FIXED: Proper form submission handler with correct scope
// FIXED: Operation Modify Form Handler
const operationModifyForm = document.getElementById('operationModifyForm');
if (operationModifyForm) {
    operationModifyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleOperationModify(e);
    });
}
if (operationModifyForm) {
    operationModifyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Form submission captured!'); // Debug log
        app.handleOperationModify(e); // Use global app instance instead of this
    });
} else {
    // Fallback: Set up event listener when drawer opens
    console.warn('operationModifyForm not found during initialization');
}

// ESC key to close drawer
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const drawer = document.getElementById('operationDrawer');
        if (drawer && !drawer.classList.contains('hidden')) {
            this.closeOperationDrawer();
        }
    }
});

}

// PDF export for selected operations
const exportSelectedOperations = document.getElementById('exportSelectedOperations');
if (exportSelectedOperations) {
    exportSelectedOperations.addEventListener('click', () => this.exportSelectedOperationsToPDF());
}

// Select all operations checkbox
const selectAllOperations = document.getElementById('selectAllOperations');
if (selectAllOperations) {
    selectAllOperations.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.operation-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });
}

        } catch (error) {
            console.error('Error initializing event listeners:', error);
        }
		
    }
    
    initializeModalEventListeners() {
        try {
            // Mission Modal
            this.setupModalEventListeners('newMissionBtn', 'missionModal', 'closeMissionModal', 'cancelMission', 'missionForm');
            
            // Assignment Modal
            this.setupModalEventListeners(null, 'assignmentModal', 'closeAssignmentModal', 'cancelAssignment', 'assignmentForm');
            
            // Client Modal
            this.setupModalEventListeners('newClientBtn', 'clientModal', 'closeClientModal', 'cancelClient', 'clientForm');
            
            // Truck Modal
            this.setupModalEventListeners('newTruckBtn', 'truckModal', 'closeTruckModal', 'cancelTruck', 'truckForm');
            
            // Driver Modal
            this.setupModalEventListeners('newDriverBtn', 'driverModal', 'closeDriverModal', 'cancelDriver', 'driverForm');
            
            // Fiche Modal
            this.setupModalEventListeners(null, 'ficheModal', 'closeFicheModal', 'closeFiche', null);
			this.setupModalEventListeners(null, 'modificationModal', 'closeModificationModal', 'cancelModification', 'modificationForm');
            
            // Smart auto-population for mission form
            const missionClient = document.getElementById('missionClient');
            if (missionClient) {
                missionClient.addEventListener('change', (e) => this.handleClientSelection(e));
            }
            
            const missionDestination = document.getElementById('missionDestination');
            if (missionDestination) {
                missionDestination.addEventListener('change', (e) => this.handleDestinationSelection(e));
            }
            
            // Client destinations management
            const addDestination = document.getElementById('addDestination');
            if (addDestination) {
                addDestination.addEventListener('click', () => this.addDestinationField());
            }
            // Fleet tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => this.handleTabSwitch(e));
});

// NEW: Truck filters event listeners
const applyTruckFilters = document.getElementById('applyTruckFilters');
if (applyTruckFilters) {
    applyTruckFilters.addEventListener('click', () => this.applyTruckFilters());
}

const resetTruckFilters = document.getElementById('resetTruckFilters');
if (resetTruckFilters) {
    resetTruckFilters.addEventListener('click', () => this.resetTruckFilters());
}

// Auto-apply filters when dropdowns change
const truckStatusFilter = document.getElementById('truckStatusFilter');
if (truckStatusFilter) {
    truckStatusFilter.addEventListener('change', () => this.applyTruckFilters());
}

const truckLocationFilter = document.getElementById('truckLocationFilter');
if (truckLocationFilter) {
    truckLocationFilter.addEventListener('change', () => this.applyTruckFilters());
}

            // Fleet tabs
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleTabSwitch(e));
            });
            
// Print fiche - ENHANCED VERSION
const printBtn = document.getElementById('printFiche');
if (printBtn) {
    printBtn.addEventListener('click', () => this.printFicheContent());
}

            
        } catch (error) {
            console.error('Error initializing modal event listeners:', error);
        }
    }
    
    
openModal(modalId) {
    this.ensureModalsAreClosed();
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        
        // Use setTimeout to ensure the modal is rendered before setting up
        setTimeout(() => {
            switch(modalId) {
                case 'missionModal':
                    this.setupMissionModal();
                    break;
                case 'clientModal':
                    // FIXED: Always reset the client form for new clients
                    if (!this.currentEditingClientId) {
                        const clientForm = document.getElementById('clientForm');
                        if (clientForm) clientForm.reset();
                        
                        // Explicitly clear GPS field
                        const clientGPSInput = document.getElementById('clientGPS');
                        if (clientGPSInput) clientGPSInput.value = '';
                    }
                    this.setupClientModal();
                    break;
                case 'truckModal':
                    this.setupTruckModal();
                    break;
                case 'driverModal':
                    this.setupDriverModal();
                    break;
                case 'missionRecapModal':
                    this.setupMissionRecapModal();
                    break;
            }
        }, 50);
    }
}
    
closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Reset editing states when closing modals
    if (modalId === 'missionModal') {
        this.currentEditingMissionId = null;
    }
    if (modalId === 'clientModal') {
        this.currentEditingClientId = null;
    }
    if (modalId === 'truckModal') {
        this.currentEditingTruckId = null;
    }
    if (modalId === 'driverModal') {
        this.currentEditingDriverId = null;
    }
}

    
// ============================================
// FIXED: Mission Form Management - Complete Replacement
// ============================================

// FIXED: Setup Mission Modal with proper data preservation
setupMissionModal() {
    const form = document.getElementById('missionForm');
    
    // Only reset form if NOT editing
    if (!this.currentEditingMissionId) {
        if (form) form.reset();
        document.getElementById('missionModalTitle').textContent = 'Nouvelle Mission';
        document.getElementById('missionSaveText').textContent = 'Créer Mission';
        // Reset to single destination for new missions
        this.resetMissionDestinationsCompletely();
    } else {
        // We're editing - don't reset, just update title
        document.getElementById('missionModalTitle').textContent = 'Modifier Mission';
        document.getElementById('missionSaveText').textContent = 'Modifier Mission';
    }
    
    // Populate dropdowns
setTimeout(() => {
    this.populateClientDropdown();
    this.populateMissionWilayaDropdowns();
    this.populateDestinationWilayaDropdowns();
    // ADD THIS NEW LINE:
    this.populateDepartureWilayaDropdowns();
    this.setMinDate();
    this.initializeMissionDestinationHandlers();
    
    // If editing, populate the form with existing data
    if (this.currentEditingMissionId) {
        this.populateEditMissionForm();
    }
}, 100);

	
}

// FIXED: Reset destinations completely (for new missions only)
resetMissionDestinationsCompletely() {
    const container = document.getElementById('destinationsMissionList');
    if (!container) return;
    
    // Clear all destinations
    container.innerHTML = '';
    
    // Add the first destination template with new departure fields
    const firstDestinationHtml = `
        <div class="destination-mission-item" data-destination-index="0">
            <div class="destination-header">
                <h5>Destination 1</h5>
                <button type="button" class="btn btn--outline btn--sm btn-remove-mission-destination" style="display: none;">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <!-- NEW: Per-Destination Departure Section -->
            <div class="destination-departure-section" style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #007bff;">
                <h6 style="margin: 0 0 12px 0; color: #007bff; font-weight: 600;">📍 Départ pour cette destination</h6>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Wilaya de départ *</label>
                        <select class="form-control mission-destination-departure-wilaya" required>
                            <option value="">Sélectionner wilaya de départ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">GPS Départ</label>
                        <div class="gps-input-wrapper">
                            <i class="gps-icon" data-lucide="map-pin"></i>
                            <input type="url" class="form-control mission-destination-departure-gps" placeholder="https://www.google.com/maps/place/...">
                        </div>
                        <small class="gps-help">Lien Google Maps du point de départ</small>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Date de départ *</label>
                        <input type="date" class="form-control mission-destination-departure-date" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Heure de départ *</label>
                        <input type="time" class="form-control mission-destination-departure-time" required>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nom de la destination *</label>
                    <select class="form-control mission-destination-name" required>
                        <option value="">Sélectionner une destination</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Wilaya d'arrivée *</label>
                    <select class="form-control mission-destination-wilaya" required>
                        <option value="">Sélectionner wilaya d'arrivée</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">GPS Destination</label>
                <div class="gps-input-wrapper">
                    <i class="gps-icon" data-lucide="map-pin"></i>
                    <input type="url" class="form-control mission-destination-gps" placeholder="https://www.google.com/maps/place/...">
                </div>
                <small class="gps-help">Lien Google Maps de la destination</small>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Date d'arrivée prévue *</label>
                    <input type="date" class="form-control mission-destination-arrival-date" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Heure d'arrivée prévue *</label>
                    <input type="time" class="form-control mission-destination-arrival-time" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nombre de camions *</label>
                    <input type="number" class="form-control mission-destination-trucks" min="1" max="50" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Type de produit *</label>
                    <select class="form-control mission-destination-product-type" required>
                        <option value="">Sélectionner le type</option>
                        <option value="Produits alimentaires" selected>Produits alimentaires</option>
                        <option value="Équipements industriels">Équipements industriels</option>
                        <option value="Matériaux de construction">Matériaux de construction</option>
                        <option value="Produits chimiques">Produits chimiques</option>
                        <option value="Marchandises générales">Marchandises générales</option>
                        <option value="Produits pétroliers">Produits pétroliers</option>
                        <option value="Autres">Autres</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Type de mission *</label>
                <select class="form-control mission-destination-mission-type" required>
                    <option value="">Sélectionner le type</option>
                    <option value="aller" selected>Aller</option>
                    <option value="retour">Retour</option>
                    <option value="aller_retour">Aller-Retour</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Commentaires pour cette destination</label>
                <textarea class="form-control mission-destination-comments" rows="2" placeholder="Informations spécifiques à cette destination..."></textarea>
            </div>
        </div>
    `;
    
    container.innerHTML = firstDestinationHtml;
    
    // Initialize Lucide icons for new elements
    setTimeout(() => {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 50);
}

// FIXED: Add destination with data preservation
// FIXED: Add destination with data preservation
addMissionDestination() {
    const container = document.getElementById('destinationsMissionList');
    if (!container) {
        console.error('Destinations container not found');
        return;
    }
    
    const currentDestinations = container.children.length;
    const newIndex = currentDestinations;
    
    // STEP 1: Save all current form data BEFORE adding new destination
    console.log('Saving current form data...');
    const preservedData = [];
    
    for (let i = 0; i < currentDestinations; i++) {
        const destElement = container.children[i];
        const destData = {
            index: i,
            // Departure data
            departureWilaya: destElement.querySelector('.mission-destination-departure-wilaya')?.value || '',
            departureGps: destElement.querySelector('.mission-destination-departure-gps')?.value || '',
            departureDate: destElement.querySelector('.mission-destination-departure-date')?.value || '',
            departureTime: destElement.querySelector('.mission-destination-departure-time')?.value || '',
            // Destination data
            name: destElement.querySelector('.mission-destination-name')?.value || '',
            wilaya: destElement.querySelector('.mission-destination-wilaya')?.value || '',
            gps: destElement.querySelector('.mission-destination-gps')?.value || '',
            arrivalDate: destElement.querySelector('.mission-destination-arrival-date')?.value || '',
            arrivalTime: destElement.querySelector('.mission-destination-arrival-time')?.value || '',
            trucks: destElement.querySelector('.mission-destination-trucks')?.value || '',
            productType: destElement.querySelector('.mission-destination-product-type')?.value || '',
            missionType: destElement.querySelector('.mission-destination-mission-type')?.value || '',
            comments: destElement.querySelector('.mission-destination-comments')?.value || ''
        };
        preservedData.push(destData);
    }
    
    // STEP 2: Create complete new destination HTML
    const destinationHtml = `
        <div class="destination-mission-item" data-destination-index="${newIndex}">
            <div class="destination-header">
                <h5>Destination ${newIndex + 1}</h5>
                <button type="button" class="btn btn--outline btn--sm btn-remove-mission-destination">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <!-- Per-Destination Departure Section -->
            <div class="destination-departure-section" style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #007bff;">
                <h6 style="margin: 0 0 12px 0; color: #007bff; font-weight: 600;">📍 Départ pour cette destination</h6>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Wilaya de départ *</label>
                        <select class="form-control mission-destination-departure-wilaya" required>
                            <option value="">Sélectionner wilaya de départ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">GPS Départ</label>
                        <div class="gps-input-wrapper">
                            <i class="gps-icon" data-lucide="map-pin"></i>
                            <input type="url" class="form-control mission-destination-departure-gps" placeholder="https://www.google.com/maps/place/...">
                        </div>
                        <small class="gps-help">Lien Google Maps du point de départ</small>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Date de départ *</label>
                        <input type="date" class="form-control mission-destination-departure-date" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Heure de départ *</label>
                        <input type="time" class="form-control mission-destination-departure-time" required>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nom de la destination *</label>
                    <select class="form-control mission-destination-name" required>
                        <option value="">Sélectionner une destination</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Wilaya d'arrivée *</label>
                    <select class="form-control mission-destination-wilaya" required>
                        <option value="">Sélectionner wilaya d'arrivée</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">GPS Destination</label>
                <div class="gps-input-wrapper">
                    <i class="gps-icon" data-lucide="map-pin"></i>
                    <input type="url" class="form-control mission-destination-gps" placeholder="https://www.google.com/maps/place/...">
                </div>
                <small class="gps-help">Lien Google Maps de la destination</small>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Date d'arrivée prévue *</label>
                    <input type="date" class="form-control mission-destination-arrival-date" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Heure d'arrivée prévue *</label>
                    <input type="time" class="form-control mission-destination-arrival-time" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nombre de camions *</label>
                    <input type="number" class="form-control mission-destination-trucks" min="1" max="10" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Type de produit *</label>
                    <select class="form-control mission-destination-product-type" required>
                        <option value="">Sélectionner le type</option>
                        <option value="Produits alimentaires" selected>Produits alimentaires</option>
                        <option value="Équipements industriels">Équipements industriels</option>
                        <option value="Matériaux de construction">Matériaux de construction</option>
                        <option value="Produits chimiques">Produits chimiques</option>
                        <option value="Marchandises générales">Marchandises générales</option>
                        <option value="Produits pétroliers">Produits pétroliers</option>
                        <option value="Autres">Autres</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Type de mission *</label>
                <select class="form-control mission-destination-mission-type" required>
                    <option value="">Sélectionner le type</option>
                    <option value="aller" selected>Aller</option>
                    <option value="retour">Retour</option>
                    <option value="aller_retour">Aller-Retour</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Commentaires pour cette destination</label>
                <textarea class="form-control mission-destination-comments" rows="2" placeholder="Informations spécifiques à cette destination..."></textarea>
            </div>
        </div>
    `;
    
    // STEP 3: Add the new destination to the container
    console.log('Adding new destination HTML...');
    container.insertAdjacentHTML('beforeend', destinationHtml);
    
    // STEP 4: Complete setup with data restoration and auto-population
    setTimeout(() => {
        console.log('Starting dropdown population and data restoration...');
        
        // First, populate ALL dropdowns for ALL destinations
        this.populateDestinationWilayaDropdowns();
        this.populateDestinationDropdowns();
        this.populateDepartureWilayaDropdowns();
        
        // Get client information for auto-population
        const clientSelect = document.getElementById('missionClient');
        const clientId = parseInt(clientSelect ? clientSelect.value : 0);
        let clientData = null;
        
        if (clientId) {
            const clients = this.getClients();
            clientData = clients.find(c => c.id === clientId);
        }
        
        // Restore saved data to existing destinations
        console.log('Restoring saved data to existing destinations...');
        preservedData.forEach((destData, index) => {
            const destElement = container.children[index];
            if (!destElement) return;
            
            // Restore departure data
            const departureWilayaSelect = destElement.querySelector('.mission-destination-departure-wilaya');
            const departureGpsInput = destElement.querySelector('.mission-destination-departure-gps');
            const departureDateInput = destElement.querySelector('.mission-destination-departure-date');
            const departureTimeInput = destElement.querySelector('.mission-destination-departure-time');
            
            if (departureWilayaSelect && destData.departureWilaya) {
                departureWilayaSelect.value = destData.departureWilaya;
            }
            if (departureGpsInput && destData.departureGps) {
                departureGpsInput.value = destData.departureGps;
            }
            if (departureDateInput && destData.departureDate) {
                departureDateInput.value = destData.departureDate;
            }
            if (departureTimeInput && destData.departureTime) {
                departureTimeInput.value = destData.departureTime;
            }
            
            // Restore destination data
            const nameSelect = destElement.querySelector('.mission-destination-name');
            const wilayaSelect = destElement.querySelector('.mission-destination-wilaya');
            const gpsInput = destElement.querySelector('.mission-destination-gps');
            const arrivalDateInput = destElement.querySelector('.mission-destination-arrival-date');
            const arrivalTimeInput = destElement.querySelector('.mission-destination-arrival-time');
            const trucksInput = destElement.querySelector('.mission-destination-trucks');
            const productTypeSelect = destElement.querySelector('.mission-destination-product-type');
            const missionTypeSelect = destElement.querySelector('.mission-destination-mission-type');
            const commentsTextarea = destElement.querySelector('.mission-destination-comments');
            
            if (nameSelect && destData.name) nameSelect.value = destData.name;
            if (wilayaSelect && destData.wilaya) wilayaSelect.value = destData.wilaya;
            if (gpsInput && destData.gps) gpsInput.value = destData.gps;
            if (arrivalDateInput && destData.arrivalDate) arrivalDateInput.value = destData.arrivalDate;
            if (arrivalTimeInput && destData.arrivalTime) arrivalTimeInput.value = destData.arrivalTime;
            if (trucksInput && destData.trucks) trucksInput.value = destData.trucks;
            if (productTypeSelect && destData.productType) productTypeSelect.value = destData.productType;
            if (missionTypeSelect && destData.missionType) missionTypeSelect.value = destData.missionType;
            if (commentsTextarea && destData.comments) commentsTextarea.value = destData.comments;
        });
        
        // Auto-populate the NEW destination with client data
        if (clientData) {
            console.log('Auto-populating new destination with client data...');
            const newDestination = container.children[container.children.length - 1]; // Last added destination
            
            if (newDestination) {
                // Auto-fill departure fields with client location
                const newDepartureWilaya = newDestination.querySelector('.mission-destination-departure-wilaya');
                const newDepartureGps = newDestination.querySelector('.mission-destination-departure-gps');
                
                if (newDepartureWilaya && clientData.wilaya) {
                    newDepartureWilaya.value = clientData.wilaya;
                    console.log('Set new destination departure wilaya to:', clientData.wilaya);
                }
                
                if (newDepartureGps && clientData.gps_location) {
                    newDepartureGps.value = clientData.gps_location;
                    console.log('Set new destination departure GPS to:', clientData.gps_location);
                }
                

            }
        }
        
        // Update handlers and button visibility
        console.log('Updating handlers and button visibility...');
        this.updateMissionDestinationHandlers();
        this.updateRemoveButtonsVisibility();
        
        // Reinitialize Lucide icons for the new elements
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
            console.log('Lucide icons reinitialized');
        }
        
        console.log('New destination added successfully!');
        
    }, 150); // Slightly longer timeout to ensure DOM is ready
}

removeMissionDestination(index) {
    const container = document.getElementById('destinationsMissionList');
    const destinations = container.querySelectorAll('.destination-mission-item');
    
    if (destinations.length <= 1) {
        return; // Don't remove if only one destination left
    }
    
    // STEP 1: Save data from all destinations EXCEPT the one being removed
    const preservedData = [];
    destinations.forEach((destElement, i) => {
        if (i !== index) { // Skip the destination being removed
            const destData = {
                name: destElement.querySelector('.mission-destination-name')?.value || '',
                wilaya: destElement.querySelector('.mission-destination-wilaya')?.value || '',
                gps: destElement.querySelector('.mission-destination-gps')?.value || '',
                arrivalDate: destElement.querySelector('.mission-destination-arrival-date')?.value || '',
                arrivalTime: destElement.querySelector('.mission-destination-arrival-time')?.value || '',
                trucks: destElement.querySelector('.mission-destination-trucks')?.value || '',
                productType: destElement.querySelector('.mission-destination-product-type')?.value || '',
                missionType: destElement.querySelector('.mission-destination-mission-type')?.value || '',
                comments: destElement.querySelector('.mission-destination-comments')?.value || ''
            };
            preservedData.push(destData);
        }
    });
    
    // STEP 2: Remove the destination
    destinations[index].remove();
    
    // STEP 3: Renumber remaining destinations and restore data
    setTimeout(() => {
        const remainingDestinations = container.querySelectorAll('.destination-mission-item');
        
        remainingDestinations.forEach((dest, newIndex) => {
            // Update the index and title
            dest.dataset.destinationIndex = newIndex;
            dest.querySelector('h5').textContent = `Destination ${newIndex + 1}`;
            
            // Restore data if available
            if (preservedData[newIndex]) {
                const destData = preservedData[newIndex];
                const nameSelect = dest.querySelector('.mission-destination-name');
                const wilayaSelect = dest.querySelector('.mission-destination-wilaya');
                const gpsInput = dest.querySelector('.mission-destination-gps');
                const arrivalDateInput = dest.querySelector('.mission-destination-arrival-date');
                const arrivalTimeInput = dest.querySelector('.mission-destination-arrival-time');
                const trucksInput = dest.querySelector('.mission-destination-trucks');
                const productTypeSelect = dest.querySelector('.mission-destination-product-type');
                const missionTypeSelect = dest.querySelector('.mission-destination-mission-type');
                const commentsTextarea = dest.querySelector('.mission-destination-comments');
                
                if (nameSelect && destData.name) nameSelect.value = destData.name;
                if (wilayaSelect && destData.wilaya) wilayaSelect.value = destData.wilaya;
                if (gpsInput && destData.gps) gpsInput.value = destData.gps;
                if (arrivalDateInput && destData.arrivalDate) arrivalDateInput.value = destData.arrivalDate;
                if (arrivalTimeInput && destData.arrivalTime) arrivalTimeInput.value = destData.arrivalTime;
                if (trucksInput && destData.trucks) trucksInput.value = destData.trucks;
                if (productTypeSelect && destData.productType) productTypeSelect.value = destData.productType;
                if (missionTypeSelect && destData.missionType) missionTypeSelect.value = destData.missionType;
                if (commentsTextarea && destData.comments) commentsTextarea.value = destData.comments;
            }
        });
        
        this.updateMissionDestinationHandlers();
        this.updateRemoveButtonsVisibility();
        
        // Reinitialize icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 50);
}

// NEW: Preserve form data before DOM manipulation
// NEW: Preserve form data before DOM manipulation
preserveDestinationFormData() {
    const container = document.getElementById('destinationsMissionList');
    const destinations = container.querySelectorAll('.destination-mission-item');
    const data = [];
    
    destinations.forEach((dest, index) => {
        const destData = {
            index: index,
            // NEW: Departure data
            departureWilaya: dest.querySelector('.mission-destination-departure-wilaya')?.value || '',
            departureGps: dest.querySelector('.mission-destination-departure-gps')?.value || '',
            departureDate: dest.querySelector('.mission-destination-departure-date')?.value || '',
            departureTime: dest.querySelector('.mission-destination-departure-time')?.value || '',
            // Existing destination data
            name: dest.querySelector('.mission-destination-name')?.value || '',
            wilaya: dest.querySelector('.mission-destination-wilaya')?.value || '',
            gps: dest.querySelector('.mission-destination-gps')?.value || '',
            arrivalDate: dest.querySelector('.mission-destination-arrival-date')?.value || '',
            arrivalTime: dest.querySelector('.mission-destination-arrival-time')?.value || '',
            trucks: dest.querySelector('.mission-destination-trucks')?.value || '',
            productType: dest.querySelector('.mission-destination-product-type')?.value || '',
            missionType: dest.querySelector('.mission-destination-mission-type')?.value || '',
            comments: dest.querySelector('.mission-destination-comments')?.value || ''
        };
        data.push(destData);
    });
    
    return data;
}

// NEW: Restore form data after DOM manipulation
restoreDestinationFormData(data) {
    const container = document.getElementById('destinationsMissionList');
    const destinations = container.querySelectorAll('.destination-mission-item');
    
    data.forEach((destData, index) => {
        if (destinations[index]) {
            const dest = destinations[index];
            
            // Restore departure data (NEW)
            const departureWilayaSelect = dest.querySelector('.mission-destination-departure-wilaya');
            const departureGpsInput = dest.querySelector('.mission-destination-departure-gps');
            const departureDateInput = dest.querySelector('.mission-destination-departure-date');
            const departureTimeInput = dest.querySelector('.mission-destination-departure-time');
            
            if (departureWilayaSelect && destData.departureWilaya) departureWilayaSelect.value = destData.departureWilaya;
            if (departureGpsInput && destData.departureGps) departureGpsInput.value = destData.departureGps;
            if (departureDateInput && destData.departureDate) departureDateInput.value = destData.departureDate;
            if (departureTimeInput && destData.departureTime) departureTimeInput.value = destData.departureTime;
            
            // Restore existing destination data
            const nameSelect = dest.querySelector('.mission-destination-name');
            const wilayaSelect = dest.querySelector('.mission-destination-wilaya');
            const gpsInput = dest.querySelector('.mission-destination-gps');
            const arrivalDateInput = dest.querySelector('.mission-destination-arrival-date');
            const arrivalTimeInput = dest.querySelector('.mission-destination-arrival-time');
            const trucksInput = dest.querySelector('.mission-destination-trucks');
            const productTypeSelect = dest.querySelector('.mission-destination-product-type');
            const missionTypeSelect = dest.querySelector('.mission-destination-mission-type');
            const commentsTextarea = dest.querySelector('.mission-destination-comments');
            
            if (nameSelect && destData.name) nameSelect.value = destData.name;
            if (wilayaSelect && destData.wilaya) wilayaSelect.value = destData.wilaya;
            if (gpsInput && destData.gps) gpsInput.value = destData.gps;
            if (arrivalDateInput && destData.arrivalDate) arrivalDateInput.value = destData.arrivalDate;
            if (arrivalTimeInput && destData.arrivalTime) arrivalTimeInput.value = destData.arrivalTime;
            if (trucksInput && destData.trucks) trucksInput.value = destData.trucks;
            if (productTypeSelect && destData.productType) productTypeSelect.value = destData.productType;
            if (missionTypeSelect && destData.missionType) missionTypeSelect.value = destData.missionType;
            if (commentsTextarea && destData.comments) commentsTextarea.value = destData.comments;
        }
    });
}
// NEW: Populate departure wilaya dropdowns for destinations
populateDepartureWilayaDropdowns() {
    const departureWilayaSelects = document.querySelectorAll('.mission-destination-departure-wilaya');
    
    departureWilayaSelects.forEach(select => {
        select.innerHTML = '<option value="">Sélectionner wilaya de départ</option>';
        this.wilayas.forEach(wilaya => {
            select.innerHTML += `<option value="${wilaya}">${wilaya}</option>`;
        });
    });
}

// NEW: Auto-populate departure fields when client is selected
populateDepartureFieldsFromClient() {
    const clientSelect = document.getElementById('missionClient');
    const clientId = parseInt(clientSelect ? clientSelect.value : 0);
    
    if (!clientId) return;
    
    const clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    
    if (!client) return;
    
    // Populate all destination departure fields with client's location as default
    const departureWilayaSelects = document.querySelectorAll('.mission-destination-departure-wilaya');
    const departureGpsInputs = document.querySelectorAll('.mission-destination-departure-gps');
    
    departureWilayaSelects.forEach(select => {
        if (client.wilaya && !select.value) { // Only set if not already filled
            select.value = client.wilaya;
        }
    });
    
    departureGpsInputs.forEach(input => {
        if (client.gps_location && !input.value) { // Only set if not already filled
            input.value = client.gps_location;
        }
    });
}

// NEW: Populate form when editing existing mission
populateEditMissionForm() {
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === this.currentEditingMissionId);
    if (!mission) return;
    
    // Populate basic mission data
    document.getElementById('missionClient').value = mission.client_id || '';
    document.getElementById('missionComments').value = mission.comments || '';
    
    // Handle destinations - either from new multi-destination format or legacy format
    const destinations = mission.destinations || [{
        // Legacy format - map old fields to new structure
        departure_wilaya: mission.departure_wilaya,
        departure_gps: mission.departure_gps || '',
        departure_date: mission.scheduled_date,
        departure_time: mission.scheduled_time,
        name: mission.destination_name,
        wilaya: mission.arrival_wilaya,
        gps_location: mission.arrival_gps,
        arrival_date: mission.arrival_date,
        arrival_time: mission.arrival_time,
        trucks_requested: mission.trucks_requested,
        product_type: mission.product_type,
        mission_type: mission.mission_type,
        comments: mission.comments || ''
    }];
    
    // Clear existing destinations and rebuild
    const container = document.getElementById('destinationsMissionList');
    container.innerHTML = '';
    
    // Add each destination
    destinations.forEach((dest, index) => {
        if (index === 0) {
            // Use the reset function to create the first destination
            this.resetMissionDestinationsCompletely();
        } else {
            // Add additional destinations
            this.addMissionDestination();
        }
    });
    
    // Populate destination data after a delay to ensure DOM is ready
    setTimeout(() => {
        // CRITICAL: Populate ALL dropdowns including departure dropdowns
        this.populateDestinationWilayaDropdowns();
        this.populateDestinationDropdowns();
        this.populateDepartureWilayaDropdowns(); // ← THIS WAS MISSING!
        
        // Then populate with actual data
        setTimeout(() => {
            destinations.forEach((dest, index) => {
                const destElement = container.children[index];
                if (!destElement) return;
                
                // NEW: Populate departure fields
                const departureWilayaSelect = destElement.querySelector('.mission-destination-departure-wilaya');
                const departureGpsInput = destElement.querySelector('.mission-destination-departure-gps');
                const departureDateInput = destElement.querySelector('.mission-destination-departure-date');
                const departureTimeInput = destElement.querySelector('.mission-destination-departure-time');
                
                if (departureWilayaSelect && dest.departure_wilaya) {
                    departureWilayaSelect.value = dest.departure_wilaya;
                }
                if (departureGpsInput && dest.departure_gps) {
                    departureGpsInput.value = dest.departure_gps;
                }
                if (departureDateInput && dest.departure_date) {
                    departureDateInput.value = dest.departure_date;
                }
                if (departureTimeInput && dest.departure_time) {
                    departureTimeInput.value = dest.departure_time;
                }
                
                // Existing destination fields
                const nameSelect = destElement.querySelector('.mission-destination-name');
                const wilayaSelect = destElement.querySelector('.mission-destination-wilaya');
                const gpsInput = destElement.querySelector('.mission-destination-gps');
                const arrivalDateInput = destElement.querySelector('.mission-destination-arrival-date');
                const arrivalTimeInput = destElement.querySelector('.mission-destination-arrival-time');
                const trucksInput = destElement.querySelector('.mission-destination-trucks');
                const productTypeSelect = destElement.querySelector('.mission-destination-product-type');
                const missionTypeSelect = destElement.querySelector('.mission-destination-mission-type');
                const commentsTextarea = destElement.querySelector('.mission-destination-comments');
                
                // Find the destination index in client destinations
                const client = this.getClients().find(c => c.id === mission.client_id);
                if (client && client.destinations) {
                    const destIndex = client.destinations.findIndex(d => d.name === dest.name);
                    if (destIndex !== -1 && nameSelect) {
                        nameSelect.value = destIndex.toString();
                    }
                }
                
                if (wilayaSelect && dest.wilaya) wilayaSelect.value = dest.wilaya;
                if (gpsInput && dest.gps_location) gpsInput.value = dest.gps_location;
                if (arrivalDateInput && dest.arrival_date) arrivalDateInput.value = dest.arrival_date;
                if (arrivalTimeInput && dest.arrival_time) arrivalTimeInput.value = dest.arrival_time;
                if (trucksInput && dest.trucks_requested) trucksInput.value = dest.trucks_requested;
                if (productTypeSelect && dest.product_type) productTypeSelect.value = dest.product_type;
                if (missionTypeSelect && dest.mission_type) missionTypeSelect.value = dest.mission_type;
                if (commentsTextarea && dest.comments) commentsTextarea.value = dest.comments;
            });
            
            this.updateRemoveButtonsVisibility();
            console.log('Mission edit form populated successfully with departure data');
        }, 300); // Increase timeout slightly
    }, 150);
}


// Initialize handlers for mission destinations
// FIXED: Initialize handlers for mission destinations - prevent duplication
initializeMissionDestinationHandlers() {
    // FIXED: Properly handle the add destination button to prevent multiple destinations
    const addBtn = document.getElementById('addMissionDestination');
    if (addBtn) {
        // Remove all existing event listeners by cloning the node
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        
        // Add a single fresh event listener
        newAddBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add destination clicked'); // Debug log
            this.addMissionDestination();
        });
    }
    
    // Initialize existing destination handlers
    this.updateMissionDestinationHandlers();
}


// Add a new destination to the mission
// Add a new destination to the mission


// Reset to single destination (for new missions)
// Reset to single destination (for new missions)
resetMissionDestinations() {
    const container = document.getElementById('destinationsMissionList');
    if (!container) return;
    
    const destinations = container.querySelectorAll('.destination-mission-item');
    
    // Remove all except the first one
    for (let i = 1; i < destinations.length; i++) {
        destinations[i].remove();
    }
    
    // Clear the first destination
    const firstDestination = container.querySelector('.destination-mission-item');
    if (firstDestination) {
        // Clear all form inputs
        firstDestination.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'select-one') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        });
        firstDestination.dataset.destinationIndex = '0';
        firstDestination.querySelector('h5').textContent = 'Destination 1';
        
        // Reset the product type to default
        const productSelect = firstDestination.querySelector('.mission-destination-product-type');
        if (productSelect) {
            productSelect.value = 'Produits alimentaires';
        }
        
        // Reset the mission type to default
        const missionTypeSelect = firstDestination.querySelector('.mission-destination-mission-type');
        if (missionTypeSelect) {
            missionTypeSelect.value = 'aller';
        }
    }
    
    this.updateRemoveButtonsVisibility();
}


// Renumber destinations after removal
renumberDestinations() {
    const container = document.getElementById('destinationsMissionList');
    const destinations = container.querySelectorAll('.destination-mission-item');
    
    destinations.forEach((dest, index) => {
        dest.dataset.destinationIndex = index;
        dest.querySelector('h5').textContent = `Destination ${index + 1}`;
    });
}

// Update visibility of remove buttons
updateRemoveButtonsVisibility() {
    const container = document.getElementById('destinationsMissionList');
    const destinations = container.querySelectorAll('.destination-mission-item');
    const removeButtons = container.querySelectorAll('.btn-remove-mission-destination');
    
    if (destinations.length <= 1) {
        // Hide all remove buttons if only one destination
        removeButtons.forEach(btn => btn.style.display = 'none');
    } else {
        // Show all remove buttons if multiple destinations
        removeButtons.forEach(btn => btn.style.display = 'inline-flex');
    }
}

// Update event handlers for all destinations
updateMissionDestinationHandlers() {
    // Remove destination buttons
    const removeButtons = document.querySelectorAll('.btn-remove-mission-destination');
    removeButtons.forEach(btn => {
        btn.removeEventListener('click', this.handleRemoveDestination);
        btn.addEventListener('click', (e) => {
            const destinationItem = e.target.closest('.destination-mission-item');
            const index = parseInt(destinationItem.dataset.destinationIndex);
            this.removeMissionDestination(index);
        });
    });
    
    // Destination name change handlers
    const destinationNameSelects = document.querySelectorAll('.mission-destination-name');
    destinationNameSelects.forEach(select => {
        select.removeEventListener('change', this.handleDestinationNameChange);
        select.addEventListener('change', (e) => this.handleDestinationNameChange(e));
    });
}

// Handle destination name change to populate wilaya
// Handle destination name change to populate wilaya
handleDestinationNameChange(e) {
    const select = e.target;
    const destinationItem = select.closest('.destination-mission-item');
    const wilayaSelect = destinationItem.querySelector('.mission-destination-wilaya');
    const gpsInput = destinationItem.querySelector('.mission-destination-gps');
    
    // Clear previous values first
    wilayaSelect.value = '';
    gpsInput.value = '';
    
    if (select.value !== '') {
        const clientSelect = document.getElementById('missionClient');
        const clientId = parseInt(clientSelect ? clientSelect.value : 0);
        const destinationIndex = parseInt(select.value);
        
        if (clientId && destinationIndex >= 0) {
            const clients = this.getClients();
            const client = clients.find(c => c.id === clientId);
            
            if (client && client.destinations && client.destinations[destinationIndex]) {
                const destination = client.destinations[destinationIndex];
                
                // Set wilaya
                if (destination.wilaya) {
                    wilayaSelect.value = destination.wilaya;
                }
                
                // Set GPS if available
                if (destination.gps_location) {
                    gpsInput.value = destination.gps_location;
                }
            }
        }
    }
}

// Populate destination dropdowns when client changes
// Populate destination dropdowns when client changes
populateDestinationDropdowns() {
    const clientSelect = document.getElementById('missionClient');
    const clientId = parseInt(clientSelect ? clientSelect.value : 0);
    const destinationSelects = document.querySelectorAll('.mission-destination-name');
    
    destinationSelects.forEach(select => {
        select.innerHTML = '<option value="">Sélectionner une destination</option>';
        
        if (clientId) {
            const clients = this.getClients();
            const client = clients.find(c => c.id === clientId);
            
            if (client && client.destinations) {
                client.destinations.forEach((destination, index) => {
                    select.innerHTML += `<option value="${index}">${destination.name}</option>`;
                });
            }
        }
    });
}


// Populate wilaya dropdowns for destinations
populateDestinationWilayaDropdowns() {
    const wilayaSelects = document.querySelectorAll('.mission-destination-wilaya');
    
    wilayaSelects.forEach(select => {
        select.innerHTML = '<option value="">Sélectionner wilaya d\'arrivée</option>';
        this.wilayas.forEach(wilaya => {
            select.innerHTML += `<option value="${wilaya}">${wilaya}</option>`;
        });
    });
}

    
    clearMissionFormFields() {
        const missionDestination = document.getElementById('missionDestination');
        const missionDeparture = document.getElementById('missionDeparture');
        const missionArrival = document.getElementById('missionArrival');
        
        if (missionDestination) {
            missionDestination.innerHTML = '<option value="">Sélectionner une destination</option>';
        }
        if (missionDeparture) {
            missionDeparture.value = '';
        }
        if (missionArrival) {
            missionArrival.value = '';
        }
    }
    
setupClientModal() {
    // Reset editing state only if not editing
    if (!this.currentEditingClientId) {
        this.currentEditingClientId = null;
        document.getElementById('clientModalTitle').textContent = 'Nouveau Client';
        document.getElementById('clientSaveText').textContent = 'Sauvegarder';
        
        // FIXED: Clear the client form completely including GPS field
        const clientForm = document.getElementById('clientForm');
        if (clientForm) {
            clientForm.reset();
        }
        
        // FIXED: Explicitly clear the client GPS field
        const clientGPSInput = document.getElementById('clientGPS');
        if (clientGPSInput) {
            clientGPSInput.value = '';
        }
        
        // FIXED: Reset destination fields including GPS
        this.resetDestinationFields();
    }
    
    this.populateWilayaDropdowns();
}


    


// Enhanced handleTruckSubmit to include maintenance data
// Enhanced handleTruckSubmit - MAINTENANCE STATUS SEPARATED
handleTruckSubmit(e) {
    e.preventDefault();
    // At start of handleTruckSubmit(e): creation or edition
if (this.currentEditingTruckId) {
  if (!this.requirePermission('flotte.edit_truck', 'Modification camion interdite')) return;
} else {
  if (!this.requirePermission('flotte.add_truck', 'Création camion interdite')) return;
}

// Where you implement deleteTruck(truckId) if present:
if (!this.requirePermission('flotte.delete_truck', 'Suppression camion interdite')) return;

// When forcing location change (e.g., dispatcher override), check:
if (!this.requirePermission('flotte.change_location', 'Changement de localisation interdit')) return;

    // Only dispatchers and admins can create/edit trucks
    if (!['dispatcher', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les répartiteurs et administrateurs peuvent créer/modifier des camions');
        return;
    }
    
    // Get form data
const truckData = {
    registration: document.getElementById('truckRegistration').value.trim(),
    brand: document.getElementById('truckBrand').value.trim(),
    model: document.getElementById('truckModel').value.trim(),
    year: parseInt(document.getElementById('truckYear').value) || new Date().getFullYear(),
    capacity: parseInt(document.getElementById('truckCapacity').value) || 25,
    current_location: document.getElementById('truckLocation').value,
    carte_naftal: document.getElementById('truckCarteNaftal')?.value?.trim() || '',
    permanent_driver_id: parseInt(document.getElementById('truckAssignedDriver').value) || null,
    gps_location: document.getElementById('truckGPS')?.value?.trim() || '', // NOUVEAU CHAMP GPS

        
        // FIXED: Maintenance data - SEPARATE from operational status
        maintenance_status: document.getElementById('truckMaintenanceStatus').value || 'operational',
        maintenance_info: {}
    };
    
    // Validation
    if (!truckData.registration || !truckData.brand || !truckData.model) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    // Handle maintenance information (SEPARATE from truck operational status)
    if (truckData.maintenance_status !== 'operational') {
        const maintenanceLocation = document.getElementById('truckMaintenanceLocation').value;
        const maintenanceStart = document.getElementById('truckMaintenanceStart').value;
        const maintenanceEnd = document.getElementById('truckMaintenanceEnd').value;
        const maintenanceComments = document.getElementById('truckMaintenanceComments').value.trim();
        
        if (!maintenanceLocation || !maintenanceStart || !maintenanceEnd) {
            alert('Veuillez remplir toutes les informations de maintenance');
            return;
        }
        
        // Validate dates
        const startDate = new Date(maintenanceStart);
        const endDate = new Date(maintenanceEnd);
        
        if (endDate <= startDate) {
            alert('La date de fin doit être postérieure à la date de début');
            return;
        }
        
        truckData.maintenance_info = {
            location: maintenanceLocation,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            comments: maintenanceComments,
            created_by: this.currentUser.name,
            created_at: new Date().toISOString()
        };
    } else {
        truckData.maintenance_info = {};
    }
    
    // CRITICAL FIX: Preserve the current operational status
    // Maintenance does NOT affect operational status (available/busy)
    if (this.currentEditingTruckId) {
        const trucks = this.getTrucks();
        const existingTruck = trucks.find(t => t.id === this.currentEditingTruckId);
        if (existingTruck) {
            // Preserve existing operational status
            truckData.status = existingTruck.status;
        }
    } else {
        // New truck - set to available
        truckData.status = 'available';
    }
    
    try {
        if (this.currentEditingTruckId) {
            this.updateTruck(this.currentEditingTruckId, truckData);
        } else {
            this.createTruck(truckData);
        }
        
        // Reset editing state
        this.currentEditingTruckId = null;
        
        // Close modal and refresh
        this.closeModal('truckModal');
        this.loadSectionData(this.currentSection);
        
    } catch (error) {
        console.error('Error saving truck:', error);
        alert('Une erreur s\'est produite lors de la sauvegarde');
    }
}

// Enhanced createTruck method
// Enhanced createTruck method - FIXED initial maintenance dates
// Enhanced createTruck method - FIXED maintenance date logic
createTruck(data) {
    const trucks = this.getTrucks();
    
    // Check for duplicate registration
    const existingTruck = trucks.find(t => t.registration === data.registration);
    if (existingTruck) {
        alert('Cette immatriculation existe déjà');
        return;
    }
    
    const currentDate = new Date().toISOString();
    
    const newTruck = {
        id: this.generateId(trucks),
        ...data,
        fuel_level: 100,
        // FIXED: Set last_maintenance to maintenance start date if maintenance is scheduled
        last_maintenance: data.maintenance_status !== 'operational' && data.maintenance_info.start_date 
            ? data.maintenance_info.start_date 
            : null,
        next_maintenance: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months
        assigned_driver_id: data.permanent_driver_id,
        current_mission_id: null,
        next_available_time: null,
        next_available_location: data.current_location,
        created_at: currentDate
    };
    
    trucks.push(newTruck);
    this.saveTrucks(trucks);
    
    // Update driver assignment if specified
    if (data.permanent_driver_id) {
        this.updateDriverTruckAssignment(data.permanent_driver_id, newTruck.id);
    }
    
    // Log activity
    const activityMessage = data.maintenance_status !== 'operational' 
        ? `Camion ajouté: ${data.brand} ${data.model} (${this.getMaintenanceDisplayName(data.maintenance_status)})`
        : `Camion ajouté: ${data.brand} ${data.model}`;
    
    this.addActivity(activityMessage, 'car');
    
    // Send notification for maintenance
    if (data.maintenance_status !== 'operational') {
        this.sendNotification('admin', 'maintenance_scheduled',
            `Camion ${data.registration} programmé en maintenance: ${this.getMaintenanceDisplayName(data.maintenance_status)}`,
            { truck_id: newTruck.id, maintenance_type: data.maintenance_status }
        );
    }
    
    alert('Camion créé avec succès!');
}
// NEW: Format maintenance date display
// FIXED: Format maintenance date display
formatMaintenanceDate(truck) {
    if (!truck.last_maintenance) {
        return 'Aucune maintenance enregistrée';
    }
    
    // If maintenance is currently scheduled, show the start date
    if (truck.maintenance_status && truck.maintenance_status !== 'operational' && truck.maintenance_info.start_date) {
        return `Maintenance en cours depuis: ${this.formatAlgeriaDateTime(truck.maintenance_info.start_date)}`;
    }
    
    // Otherwise show the last maintenance date
    return `Dernière maintenance: ${this.formatAlgeriaDateTime(truck.last_maintenance)}`;
}

// Enhanced updateTruck method

// Maintenance status management methods
handleMaintenanceStatus(truck, analysis) {
    const maintenanceInfo = truck.maintenance_info || {};
    const endDate = new Date(maintenanceInfo.end_date);
    const now = new Date();
    
    analysis.reasons.push(`🔧 ${this.getMaintenanceDisplayName(truck.maintenance_status)}`);
    analysis.reasons.push(`📍 Lieu: ${maintenanceInfo.location || 'Non spécifié'}`);
    
    if (endDate > now) {
        analysis.reasons.push(`⏰ Fin prévue: ${this.formatAlgeriaDateTime(maintenanceInfo.end_date)}`);
        analysis.score = 20;
        analysis.category = 'unavailable';
        analysis.conflicts.push(`❌ En maintenance jusqu'au ${this.formatDate(maintenanceInfo.end_date)}`);
    } else {
        analysis.reasons.push(`✅ Maintenance terminée depuis le ${this.formatDate(maintenanceInfo.end_date)}`);
        analysis.score = 60;
        analysis.category = 'possible';
        analysis.warnings.push(`⚠️ Maintenance récemment terminée`);
    }
    
    if (maintenanceInfo.comments) {
        analysis.reasons.push(`💬 ${maintenanceInfo.comments}`);
    }
    
    return analysis;
}

getMaintenanceDisplayName(status) {
    const statusMap = {
        'operational': 'Opérationnel',
        'vidange': 'Vidange en cours',
        'probleme_technique': 'Problème technique',
        'revision': 'Révision générale',
        'pneus': 'Changement pneus',
        'carrosserie': 'Réparation carrosserie',
        'moteur': 'Réparation moteur',
        'freins': 'Réparation freins'
    };
    return statusMap[status] || status;
}

// Enhanced truck status display - SHOWING BOTH STATUSES
getTruckStatusDisplay(truck) {
    let statusDisplay = '';
    
    // Operational status (for missions)
    if (truck.status === 'available') {
        statusDisplay += '✅ Disponible';
    } else if (truck.status === 'busy') {
        statusDisplay += '🚛 En mission';
    } else {
        statusDisplay += `⚠️ ${truck.status}`;
    }
    
    // Maintenance status (separate tracking)
    if (truck.maintenance_status && truck.maintenance_status !== 'operational') {
        const maintenanceInfo = truck.maintenance_info || {};
        const endDate = new Date(maintenanceInfo.end_date);
        const now = new Date();
        
        if (endDate > now) {
            statusDisplay += ` | 🔧 ${this.getMaintenanceDisplayName(truck.maintenance_status)}`;
        } else {
            statusDisplay += ` | ⚠️ Maintenance terminée`;
        }
    }
    
    return statusDisplay;
}
// Fix smart assignment to ignore maintenance status
isValidTruckForAssignment(truck, mission) {
    // Only check operational status, NOT maintenance status
    if (truck.status !== 'available') {
        return false;
    }
    
    // Truck is operationally available regardless of maintenance status
    return true;
}


// Enhanced editTruck to populate maintenance fields - FIXED VERSION
// FIXED: Enhanced editTruck to populate maintenance fields properly
editTruck(truckId) {
    if (!['dispatcher', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les répartiteurs et administrateurs peuvent modifier les camions');
        return;
    }
    
    const trucks = this.getTrucks();
    const truck = trucks.find(t => t.id === truckId);
    if (!truck) return;
    
    this.currentEditingTruckId = truckId;
    
    // Open truck modal and populate with existing data
    this.openModal('truckModal');
    
    // Wait for modal to be loaded
    setTimeout(() => {
        // Change modal title
        document.querySelector('#truckModal .modal-header h3').textContent = 'Modifier Camion';
        document.querySelector('#truckModal button[type="submit"]').innerHTML = '<i data-lucide="save"></i> Modifier le camion';
        
        // Populate basic form fields
        document.getElementById('truckRegistration').value = truck.registration || '';
        document.getElementById('truckBrand').value = truck.brand || '';
        document.getElementById('truckModel').value = truck.model || '';
        document.getElementById('truckYear').value = truck.year || '';
        document.getElementById('truckCapacity').value = truck.capacity || '';
        document.getElementById('truckLocation').value = truck.current_location || '';
        
        // Populate advanced fields
        const carteNaftalField = document.getElementById('truckCarteNaftal');
        const driverField = document.getElementById('truckAssignedDriver');
        
if (carteNaftalField) carteNaftalField.value = truck.carte_naftal || '';
if (driverField) driverField.value = truck.permanent_driver_id || '';

// NOUVEAU: Populate GPS field
const gpsField = document.getElementById('truckGPS');
if (gpsField) gpsField.value = truck.gps_location || '';

        
        // CRITICAL FIX: Populate maintenance fields correctly
        const maintenanceStatusField = document.getElementById('truckMaintenanceStatus');
        if (maintenanceStatusField) {
            // Set the maintenance status value
            maintenanceStatusField.value = truck.maintenance_status || 'operational';
            
            // Force trigger change event to show/hide fields
            const changeEvent = new Event('change', { bubbles: true });
            maintenanceStatusField.dispatchEvent(changeEvent);
            
            // If maintenance status is not operational, populate the detail fields
            if (truck.maintenance_status && truck.maintenance_status !== 'operational' && truck.maintenance_info) {
                // Use a longer delay to ensure DOM is updated
                setTimeout(() => {
                    const info = truck.maintenance_info;
                    
                    const locationField = document.getElementById('truckMaintenanceLocation');
                    const startField = document.getElementById('truckMaintenanceStart');
                    const endField = document.getElementById('truckMaintenanceEnd');
                    const commentsField = document.getElementById('truckMaintenanceComments');
                    
                    if (locationField && info.location) {
                        locationField.value = info.location;
                    }
                    if (startField && info.start_date) {
                        startField.value = this.formatForDatetimeLocal(info.start_date);
                    }
                    if (endField && info.end_date) {
                        endField.value = this.formatForDatetimeLocal(info.end_date);
                    }
                    if (commentsField && info.comments) {
                        commentsField.value = info.comments;
                    }
                    
                    console.log('Maintenance fields populated successfully:', {
                        status: truck.maintenance_status,
                        location: info.location,
                        start: info.start_date,
                        end: info.end_date
                    });
                }, 300); // Increased delay
            }
        }
        
        // Reinitialize icons
        this.initializeLucideIcons();
    }, 200); // Increased initial delay
}

// Helper method to update driver-truck assignments
updateDriverTruckAssignment(driverId, truckId) {
    const drivers = this.getDrivers();
    const driverIndex = drivers.findIndex(d => d.id === driverId);
    
    if (driverIndex !== -1) {
        drivers[driverIndex].assigned_truck_id = truckId;
        this.saveDrivers(drivers);
    }
}
// NEW FUNCTION: Populate driver dropdown for truck assignment
populateDriverDropdownForTruck(selectId) {
    const drivers = this.getDrivers();
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Aucun chauffeur assigné</option>';
    drivers.forEach(driver => {
        select.innerHTML += `<option value="${driver.id}">${driver.name} (${driver.phone || 'N/A'})</option>`;
    });
}



    
    setupDriverModal() {
        this.populateLocationDropdown('driverLocation');
        document.getElementById('driverForm').reset();
    }
 
     setupModalEventListeners(openBtnId, modalId, closeBtnId, cancelBtnId, formId) {
        const openBtn = openBtnId ? document.getElementById(openBtnId) : null;
        const modal = document.getElementById(modalId);
        const closeBtn = document.getElementById(closeBtnId);
        const cancelBtn = document.getElementById(cancelBtnId);
        const form = formId ? document.getElementById(formId) : null;
        
        if (openBtn && modal) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal(modalId);
            });
        }
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(modalId);
            });
        }
        
        if (cancelBtn && modal) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(modalId);
            });
        }
        
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(formId, e);
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modalId);
                }
            });
        }
    }

 
handleFormSubmit(formId, event) {
    switch(formId) {
        case 'missionForm':
            this.handleMissionSubmit(event);
            break;
case 'assignmentForm':
    this.handleAdvancedAssignmentSubmit(event);
    break;


        case 'modificationForm':
            this.handleModificationSubmit(event);
            break;
        case 'clientForm':
            this.handleClientSubmit(event);
            break;
        case 'truckForm':
            this.handleTruckSubmit(event);
            break;
        case 'driverForm':
            this.handleDriverSubmit(event);
            break;
case 'operationModifyForm':  // ✅ Correct ID
    this.handleOperationModify(event);
    break;
	case 'assignmentForm':
    this.handleAdvancedAssignmentSubmit(event);
    break;



    }
}

// ENHANCED: Handle modification form submission
handleModificationSubmit(e) {
    e.preventDefault();
    if (!this.requirePermission('operations.modify_assignment', 'Modification d\'assignation non autorisée')) return;
    if (!this.currentMissionForModification) return;
    
    // NEW: Validate truck count matches requirements
    const maxAllowed = this.modificationState.maxTrucksAllowed;
    const currentSelected = this.modificationState.selectedTrucks.size;
    
    if (currentSelected !== maxAllowed) {
        alert(`❌ ERREUR DE SÉLECTION!\n\nVous avez sélectionné ${currentSelected} camion(s)\nmais cette mission nécessite exactement ${maxAllowed} camion(s).\n\nVeuillez ajuster votre sélection avant de continuer.`);
        return;
    }
    
    const reason = document.getElementById('modificationReason').value;
    const comments = document.getElementById('modificationComments').value.trim();
    
    if (!reason || !comments) {
        alert('Veuillez spécifier la raison et les commentaires de la modification');
        return;
    }
    
    // Check if trucks are selected
    if (this.modificationState.selectedTrucks.size === 0) {
        alert('Veuillez sélectionner au moins un camion pour la modification');
        return;
    }
    
    // Convert selected trucks to assignments format
    const newAssignments = [];
    let assignmentIndex = 1;
    
    for (const [truckId, selection] of this.modificationState.selectedTrucks) {
        const truck = selection.truck;
        const driver = selection.driver;
        
        if (!driver) {
            alert(`Le camion ${truck.brand} ${truck.model} n'a pas de chauffeur assigné. Veuillez assigner un chauffeur d'abord.`);
            return;
        }
        
        newAssignments.push({
            truck_id: truckId,
            driver_id: driver.id,
            assigned_at: new Date().toISOString(),
            assignment_method: 'enhanced_modification',
            assignment_index: assignmentIndex++
        });
    }
    
    // Confirmation dialog
    const confirmMessage = 
        `Confirmer la modification d'assignation?\n\n` +
        `Mission: ${this.currentMissionForModification.client_name} → ${this.currentMissionForModification.destination_name}\n` +
        `Anciens camions: ${this.modificationState.originalAssignments.length}\n` +
        `Nouveaux camions: ${newAssignments.length}\n\n` +
        `Raison: ${reason}\n\n` +
        `Cette action modifiera les opérations en cours et mettra à jour les statuts des camions.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Apply modifications
    this.applyEnhancedModifications(
        this.currentMissionForModification.id, 
        newAssignments, 
        reason, 
        comments
    );
    
    this.closeModal('modificationModal');
}

// ENHANCED: Apply modifications with operation updates
applyEnhancedModifications(missionId, newAssignments, reason, comments) {
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const oldAssignments = mission.assigned_trucks || [];
    const operations = this.getOperations();
    
    // Step 1: Update old truck/driver statuses and delete old operations
    oldAssignments.forEach(assignment => {
        // Free up old truck and driver
        this.updateTruckStatus(assignment.truck_id, 'available');
        this.updateDriverStatus(assignment.driver_id, 'available');
        
        // Find and remove old operation
        const operationIndex = operations.findIndex(op => 
            op.mission_id === missionId && op.assigned_truck_id === assignment.truck_id
        );
        if (operationIndex !== -1) {
            console.log(`Removing old operation for truck ${assignment.truck_id}`);
            operations.splice(operationIndex, 1);
        }
    });
    
    // Step 2: Create new operations for new assignments
    newAssignments.forEach((assignment, index) => {
        const truck = this.getTrucks().find(t => t.id === assignment.truck_id);
        const driver = this.getDrivers().find(d => d.id === assignment.driver_id);
        
        // Update truck and driver status
        this.updateTruckStatus(assignment.truck_id, 'busy', missionId);
        this.updateDriverStatus(assignment.driver_id, 'busy', missionId);
        
        // Create new operation
        const newOperation = {
            id: this.generateId(operations),
            mission_id: mission.id,
            mission_number: `MSN${String(mission.id).padStart(3, '0')}`,
            operation_number: `${String(mission.id).padStart(3, '0')}-${index + 1}`,
            departure_location: mission.departure_wilaya || 'Non spécifié',
            arrival_location: mission.arrival_wilaya || 'Non spécifié',
            destination_name: mission.destination_name || 'Non spécifié',
            departure_gps: mission.departure_gps || '',
            arrival_gps: mission.arrival_gps || '',
            estimated_departure: `${mission.scheduled_date} ${mission.scheduled_time}`,
            estimated_arrival: mission.arrival_date && mission.arrival_time ? 
                `${mission.arrival_date} ${mission.arrival_time}` : '',
            assigned_truck_id: assignment.truck_id,
            assigned_driver_id: assignment.driver_id,
            real_departure_time: null,
            real_arrival_time: null,
            charging_time: null,
            status: 'en_attente',
            created_at: new Date().toISOString(),
            created_by: this.currentUser.name,
            assignment_method: 'enhanced_modification_v2',
            modification_reason: reason,
            modification_comments: comments,
            client_name: mission.client_name || 'Non spécifié',
            product_type: mission.product_type || 'Non spécifié',
            comments: `Opération créée par modification d'assignation. ${comments}`
        };
        
        operations.push(newOperation);
        console.log(`Created new operation ${newOperation.operation_number} for truck ${truck.registration}`);
    });
    
    // Step 3: Update mission with new assignments
    mission.assigned_trucks = newAssignments;
    mission.last_modified_by = this.currentUser.name;
    mission.last_modified_at = new Date().toISOString();
    mission.modification_history = mission.modification_history || [];
    mission.modification_history.push({
        timestamp: new Date().toISOString(),
        user: this.currentUser.name,
        reason: reason,
        comments: comments,
        old_assignments_count: oldAssignments.length,
        new_assignments_count: newAssignments.length,
        method: 'enhanced_modification'
    });
    
    // Add to timeline
    mission.progress_timeline.push({
        status: 'assignation_modifiée',
        timestamp: new Date().toISOString(),
        user: this.currentUser.name,
        reason: reason,
        comments: comments,
        old_assignments: oldAssignments.length,
        new_assignments: newAssignments.length,
        modification_method: 'enhanced'
    });
    
    // Step 4: Save all changes
    this.saveMissions(missions);
    this.saveOperations(operations);
    
    // Step 5: Send notifications
    this.sendNotification('planner', 'assignment_modified', 
        `Assignation modifiée (Enhanced): ${mission.client_name} → ${mission.destination_name}`, {
            mission_id: mission.id,
            reason: reason,
            modifier: this.currentUser.name,
            old_count: oldAssignments.length,
            new_count: newAssignments.length
        });
        
    this.sendNotification('coordinator', 'assignment_modified', 
        `Nouvelle assignation à coordonner: ${mission.client_name} → ${mission.destination_name}`, {
            mission_id: mission.id,
            assignments_count: newAssignments.length,
            modifier: this.currentUser.name
        });
    
    // Step 6: Add activity and show success
    this.addActivity(
        `Assignation modifiée (Enhanced): ${mission.client_name} (${oldAssignments.length}→${newAssignments.length} camions)`, 
        'settings'
    );
    
    this.loadSectionData(this.currentSection);
    this.loadDashboard(); // Refresh dashboard
    
    alert(`✅ Assignation modifiée avec succès!\n\n` +
          `${newAssignments.length} nouvelles opérations créées\n` +
          `${oldAssignments.length} anciennes opérations supprimées\n\n` +
          `Les statuts des camions et chauffeurs ont été mis à jour.`);
    
    // Clear modification state
    this.modificationState = null;
    this.currentMissionForModification = null;
}

modifyAssignments(missionId, newAssignments, reason, comments) {
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const oldAssignments = mission.assigned_trucks || [];
    
    // Free up old truck/driver assignments
    oldAssignments.forEach(assignment => {
        this.updateTruckStatus(assignment.truck_id, 'available');
        this.updateDriverStatus(assignment.driver_id, 'available');
    });
    
    // Apply new assignments
    newAssignments.forEach(assignment => {
        this.updateTruckStatus(assignment.truck_id, 'busy', missionId);
        this.updateDriverStatus(assignment.driver_id, 'busy', missionId);
    });
    
    // Update mission
    mission.assigned_trucks = newAssignments;
    mission.last_modified_by = this.currentUser.name;
    mission.last_modified_at = new Date().toISOString();
    
    // Add to timeline
    mission.progress_timeline.push({
        status: 'assignation_modifiée',
        timestamp: new Date().toISOString(),
        user: this.currentUser.name,
        reason: reason,
        comments: comments,
        old_assignments: oldAssignments.length,
        new_assignments: newAssignments.length
    });
    
    this.saveMissions(missions);
    
    // Send notifications
    this.sendNotification('planner', 'assignment_modified', 
        `Assignation modifiée pour mission ${mission.client_name} → ${mission.destination_name}`, {
            mission_id: mission.id,
            reason: reason,
            modifier: this.currentUser.name
        });
        
    this.sendNotification('coordinator', 'assignment_modified', 
        `Assignation modifiée pour mission ${mission.client_name} → ${mission.destination_name}`, {
            mission_id: mission.id,
            reason: reason,
            modifier: this.currentUser.name
        });
    
    this.addActivity(`Assignation modifiée: ${mission.client_name} (${newAssignments.length} camions)`, 'settings');
    this.loadSectionData(this.currentSection);
    
    alert('Assignation modifiée avec succès!');
}
    
initializeLucideIcons() {
    try {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            // Force clear any existing icons first
            document.querySelectorAll('[data-lucide]').forEach(icon => {
                if (icon.innerHTML && icon.innerHTML.includes('<svg')) {
                    icon.innerHTML = '';
                }
            });
            
            // Reinitialize all icons
            lucide.createIcons();
            console.log('Lucide icons initialized successfully');
        } else {
            console.warn('Lucide library not available');
        }
    } catch (error) {
        console.error('Error initializing Lucide icons:', error);
        
        // Retry after a short delay
        setTimeout(() => {
            try {
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons();
                }
            } catch (retryError) {
                console.error('Retry failed for Lucide icons:', retryError);
            }
        }, 1000);
    }
}

    
    checkExistingSession() {
        try {
            const savedUser = localStorage.getItem('transport_current_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                this.showMainApp();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Error checking existing session:', error);
            this.showLoginScreen();
        }
    }
    
    // Authentication
// Authentication
async handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
      alert('Veuillez saisir votre nom d\'utilisateur et mot de passe');
      return;
  }

  // Use transport_users first
  const users = this.getUsers();
  const found = users.find(u => u.username === username);

  if (found) {
    if (found.status === 'disabled') {
      alert('Ce compte est désactivé');
      return;
    }
    const hash = await this.hashPassword(password);
    if (hash !== found.password_hash) {
      alert('Nom d\'utilisateur ou mot de passe incorrect');
      document.getElementById('password').value = '';
      document.getElementById('username').focus();
      return;
    }
    // Build currentUser payload like demo but with username too
    this.currentUser = {
      username: found.username,
      role: found.role,
      name: found.full_name
    };
    // Update last_login
    found.last_login = new Date().toISOString();
    this.saveUsers(users);

    localStorage.setItem('transport_current_user', JSON.stringify(this.currentUser));
    this.addActivity(`Connexion de ${this.currentUser.name}`, 'log-in');
    const form = document.getElementById('loginForm');
    if (form) form.reset();
    this.showMainApp();
    return;
  }

  // Fallback to demoAccounts only if not present in user store (kept for compatibility)
  const user = (this.demoAccounts || []).find(acc => acc.username === username && acc.password === password);
  if (user) {
    this.currentUser = user;
    localStorage.setItem('transport_current_user', JSON.stringify(user));
    this.addActivity(`Connexion de ${user.name}`, 'log-in');
    const form = document.getElementById('loginForm');
    if (form) form.reset();
    this.showMainApp();
  } else {
    alert('Nom d\'utilisateur ou mot de passe incorrect');
    document.getElementById('password').value = '';
    document.getElementById('username').focus();
  }
}

    
handleLogout() {
    // Stop auto-refresh first
    this.stopAutoRefresh();
    
    // Add activity before clearing user
    if (this.currentUser) {
        this.addActivity(`Déconnexion de ${this.currentUser.name}`, 'log-out');
    }
    
    // Clear all user data and states
    this.currentUser = null;
    this.currentSection = 'dashboard';
    this.currentMissionForAssignment = null;
    this.currentEditingMissionId = null;
    this.currentEditingClientId = null;
    this.currentEditingTruckId = null;
    this.currentEditingDriverId = null;
        this.stopAppClock();
    // Clear localStorage
    localStorage.removeItem('transport_current_user');
    
    // Force close all modals
    this.ensureModalsAreClosed();
    
    // Show login screen with full refresh
    this.showLoginScreen();
    
    // Force a complete refresh of icons and DOM after logout
    setTimeout(() => {
        this.initializeLucideIcons();
        
        // Reinitialize login form listener
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            // Remove old listener
            const newForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newForm, loginForm);
            
            // Add fresh listener
            newForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }, 100);
}

    
showLoginScreen() {
    // Force clear any existing data
    this.currentUser = null;
    this.currentSection = 'dashboard';
    
    // Show login, hide main app
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    
    // Close all modals and reset states
    this.ensureModalsAreClosed();
    
    // Clear the login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
    }
    
    // Force a small delay to ensure DOM is updated
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 100);
}

    
showMainApp() {
    // Hide login screen and show main app
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    // Close all modals and reset states
    this.ensureModalsAreClosed();
    
    // Reset to dashboard
    this.currentSection = 'dashboard';
    
    // Force DOM to be ready, then initialize everything
    setTimeout(() => {
        // Update user info display
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.textContent = 
                `${this.currentUser.name} (${this.getRoleDisplayName(this.currentUser.role)})`;
        }
        
        // Reset navigation to dashboard
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === 'dashboard') {
                btn.classList.add('active');
            }
        });
        
        // Reset content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            dashboardSection.classList.add('active');
        }
        
        // Apply role-based access control
        this.applyRoleBasedAccess();
        
        
        // Load fresh data
        this.loadDashboard();
        this.updateNotifications();
        
        // Initialize Smart Assignment Engine
        this.initializeSmartAssignmentEngine();
        // In showMainApp() method, add this line after this.initializeLucideIcons():
this.initializeOperationsNetwork();
// In showMainApp(), after the second initializeLucideIcons() call:
this.enforcePermissionsUI();

        // Initialize icons last
        this.initializeLucideIcons();
        // In your showMainApp() method, add this line after this.initializeLucideIcons():
setTimeout(() => {
    if (window.integrateOnlineDatabase) {
        window.integrateOnlineDatabase();
    }
}, 1000);

        // Force another icon refresh after a short delay
        setTimeout(() => {
            this.initializeLucideIcons();
			this.startCountdownUpdates();
			// Add this line after this.initializeLucideIcons();
this.closeExpandedCardsOnOutsideClick();

        }, 200);
        
    }, 100);
}


    
    getRoleDisplayName(role) {
        const roleMap = {
            'admin': 'Administrateur',
            'planner': 'Planificateur',
            'dispatcher': 'Répartiteur',
            'coordinator': 'Coordinateur'
        };
        return roleMap[role] || role;
    }
 
// Enhanced print function for fiche content
// Enhanced print function - What You See Is What You Print
printFicheContent() {
    const ficheContent = document.getElementById('ficheContent');
    if (!ficheContent) {
        alert('Aucun contenu à imprimer');
        return;
    }
if (!this.requirePermission('missions.export_pdf', 'Export PDF interdit')) return;
    // Show loading message
    const originalPrintButton = document.getElementById('printFiche');
    const originalText = originalPrintButton.innerHTML;
    originalPrintButton.innerHTML = '<i data-lucide="loader"></i> Génération PDF...';
    originalPrintButton.disabled = true;

    // Use html2canvas to capture exactly what's displayed
    html2canvas(ficheContent, {
        scale: 2, // High quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: ficheContent.scrollWidth,
        height: ficheContent.scrollHeight,
        scrollX: 0,
        scrollY: 0
    }).then(canvas => {
        // Create PDF with jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Calculate dimensions to fit A4 page
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add new pages if content is longer than one page
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // Get mission info for filename
        const missionTitle = ficheContent.querySelector('.fiche-mission-number');
        const fileName = missionTitle ? 
            `Fiche_${missionTitle.textContent.replace(/\s+/g, '_')}.pdf` : 
            'Fiche_Mission.pdf';

        // Save the PDF
        pdf.save(fileName);

        // Reset button
        originalPrintButton.innerHTML = originalText;
        originalPrintButton.disabled = false;
        
        // Reinitialize icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }

        // Show success message
        this.showToast('PDF généré avec succès!', 'success');

    }).catch(error => {
        console.error('Erreur lors de la génération du PDF:', error);
        
        // Reset button on error
        originalPrintButton.innerHTML = originalText;
        originalPrintButton.disabled = false;
        
        alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    });
}
 
applyRoleBasedAccess() {
    const clientsNav = document.getElementById('clientsNav');
    const fleetNav = document.getElementById('fleetNav');
    const newMissionBtn = document.getElementById('newMissionBtn');
    const newClientBtn = document.getElementById('newClientBtn');
    const newTruckBtn = document.getElementById('newTruckBtn');
    const newDriverBtn = document.getElementById('newDriverBtn');

    // Reset all visibility first
    [clientsNav, fleetNav].forEach(nav => {
        if (nav) nav.classList.remove('disabled');
    });
    
    // Show all buttons by default
    [newMissionBtn, newClientBtn, newTruckBtn, newDriverBtn].forEach(btn => {
        if (btn) btn.style.display = 'inline-flex';
    });

    // Apply role-based restrictions
    switch(this.currentUser.role) {
        case 'planner':
            // Planners can view fleet but not modify
            if (newTruckBtn) newTruckBtn.style.display = 'none';
            if (newDriverBtn) newDriverBtn.style.display = 'none';
            break;
            
        case 'dispatcher':
            // Dispatchers have full fleet access
            if (clientsNav) clientsNav.classList.add('disabled');
            if (newMissionBtn) newMissionBtn.style.display = 'none';
            if (newClientBtn) newClientBtn.style.display = 'none';
            break;
            
        case 'coordinator':
            // Coordinators can view but not modify fleet
            if (clientsNav) clientsNav.classList.add('disabled');
            if (newMissionBtn) newMissionBtn.style.display = 'none';
            if (newClientBtn) newClientBtn.style.display = 'none';
            if (newTruckBtn) newTruckBtn.style.display = 'none';
            if (newDriverBtn) newDriverBtn.style.display = 'none';
            break;
            
        case 'admin':
            // Admin has access to everything
            break;
			
			
    }
	// In applyRoleBasedAccess(), after existing role logic, add:
const settingsNav = document.getElementById('settingsNav');
if (settingsNav) {
  // Only show nav button to admin
  settingsNav.style.display = (this.currentUser.role === 'admin') ? 'inline-flex' : 'none';
}

}
// Add this method for debugging
refreshFleetData() {
    console.log('Refreshing fleet data...');
    this.checkDriverData();
    this.loadFleet();
    
    // Force show drivers tab for debugging
    setTimeout(() => {
        const driversTab = document.querySelector('[data-tab="drivers"]');
        if (driversTab) {
            driversTab.click();
        }
    }, 100);
}

    
    handleNavigation(e) {
        const section = e.currentTarget.dataset.section;
        
        if (e.currentTarget.classList.contains('disabled')) {
            return;
        }
        
        this.currentSection = section;
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Update content
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        // In handleNavigation(e), after calculating 'section' and before loadSectionData:
if (section === 'settings') {
  const denied = document.getElementById('settingsAccessDenied');
  const content = document.getElementById('settingsContent');
  if (this.currentUser.role !== 'admin') {
    if (denied) denied.classList.remove('hidden');
    if (content) content.classList.add('hidden');
  } else {
    if (denied) denied.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    // Load settings UI
    this.loadSettings();
  }
}

        // Load section data
        this.loadSectionData(section);
    }
    
loadSectionData(section) {
    try {
        // Force refresh icons before loading data
        this.initializeLucideIcons();
        
        switch(section) {
case 'dashboard':
    this.loadDashboard();
    // Add this line:
    if (this.networkInstance) {
        this.updateNetworkRealTime();
    }
    break;

            case 'missions':
                this.loadMissions();
                break;
            case 'clients':
                this.loadClients();
                break;
            case 'fleet':
                this.loadFleet();
                break;
            case 'tracking':
                this.loadTracking();
                break;
case 'reports':
    this.loadReports(); // Use the new enhanced loadReports function
	
	if (section === 'reports') {
  if (!this.hasPermission('reports.view')) {
    alert('Accès rapports interdit');
    return;
  }
}
    break;

        }
        
        // Force refresh icons after loading data
        setTimeout(() => {
            this.initializeLucideIcons();
        }, 100);
        
        // Force another refresh after a longer delay to catch any dynamic content
        setTimeout(() => {
            this.initializeLucideIcons();
        }, 500);
        
    } catch (error) {
        console.error('Error loading section data:', error);
        // Try to refresh icons even on error
        this.initializeLucideIcons();
    }
}
 // NEW: Auto-refresh system to keep data synchronized
startAutoRefresh() {
    // Smart auto-refresh that doesn't interrupt user work
    this.autoRefreshInterval = null;
    this.lastUserActivity = Date.now();
    this.refreshIntervalMs = 60000; // 1 minute instead of 30 seconds
    
    // Track user activity to avoid interrupting their work
    this.trackUserActivity();
    
    // Start smart refresh
    this.startSmartRefresh();
    
    console.log('Smart auto-refresh system started (60 second intervals)');
}

trackUserActivity() {
    // Track various user interactions
    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    
    activityEvents.forEach(eventType => {
        document.addEventListener(eventType, () => {
            this.lastUserActivity = Date.now();
        }, { passive: true });
    });
    
    // Track modal interactions specifically
    document.addEventListener('click', (e) => {
        if (e.target.closest('.modal') || e.target.closest('.modal-content')) {
            this.lastUserActivity = Date.now();
        }
    });
}

startSmartRefresh() {
    this.autoRefreshInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastUserActivity;
        const inactivityThreshold = 30000; // 30 seconds of inactivity
        
        // Only refresh if user has been inactive for 30+ seconds
        if (timeSinceLastActivity >= inactivityThreshold) {
            // Check if any modals are open - don't refresh if user is working in a modal
            const openModals = document.querySelectorAll('.modal:not(.hidden)');
            if (openModals.length === 0) {
                console.log('Auto-refreshing - user inactive for', Math.round(timeSinceLastActivity/1000), 'seconds');
                this.loadSectionData(this.currentSection);
                
                // Only refresh dashboard components, not the entire view
                if (this.currentSection === 'dashboard') {
                    this.updateDashboardMetrics();
                    this.updateNotifications();
                }
            } else {
                console.log('Skipping auto-refresh - user working in modal');
            }
        } else {
            console.log('Skipping auto-refresh - user recently active');
        }
    }, this.refreshIntervalMs);
}

// Add this new method for updating just the metrics without full reload
updateDashboardMetrics() {
    // Update only the dashboard metrics without resetting the entire view
    const metricsGrid = document.getElementById('dashboardMetricsGrid');
    if (metricsGrid && this.currentSection === 'dashboard') {
        // Update metrics quietly in background
        this.calculateDashboardMetrics();
    }
}

// Add method to stop auto-refresh when needed
stopAutoRefresh() {
    if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = null;
        console.log('Auto-refresh stopped');
    }
}

   
// Enhanced Dashboard with Compact Metrics and Event History
loadDashboard() {
    console.log('Loading enhanced dashboard...');
    
    // Update refresh time
    this.updateLastRefreshTime();
    
    // Load metrics cards
    this.loadDashboardMetrics();
    
    // Load event history
    this.loadEventHistory();
    
    // Set up auto-refresh
    this.startDashboardAutoRefresh();
	// Load Gantt Timeline
this.loadGanttTimeline();

}

updateLastRefreshTime() {
    const refreshInfo = document.getElementById('lastRefreshInfo');
    if (refreshInfo) {
        const now = this.getCurrentAlgiersTime();
        const span = refreshInfo.querySelector('span');
        if (span) {
            span.textContent = `Dernière mise à jour: ${now.timeString}`;
        }
    }
}

loadDashboardMetrics() {
    const container = document.getElementById('dashboardMetricsGrid');
    if (!container) return;
    
    // Get data
    const missions = this.getMissions();
    const operations = this.getOperations();
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    // Calculate metrics
    const metrics = this.calculateDashboardMetrics(missions, operations, trucks, drivers);
    
    // Generate cards HTML
    container.innerHTML = this.generateMetricsCards(metrics);
    
    // Add click handlers and tooltips
    this.setupMetricCardHandlers();
    
    // Initialize icons
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 100);
}

calculateDashboardMetrics(missions, operations, trucks, drivers) {
    // NEW: Filter for last 48 hours only
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000)); // 48 hours ago
    
    // Filter operations for last 48 hours
    const recentOperations = operations.filter(op => {
        if (!op.created_at) return false;
        const operationDate = new Date(op.created_at);
        return operationDate >= fortyEightHoursAgo;
    });
    
    // Filter missions for last 48 hours
    const recentMissions = missions.filter(mission => {
        if (!mission.created_at) return false;
        const missionDate = new Date(mission.created_at);
        return missionDate >= fortyEightHoursAgo;
    });
    
    return {
        availableTrucks: {
            value: trucks.filter(t => t.status === 'available').length,
            label: 'Camions Disponibles',
            icon: 'truck',
            type: 'fleet-metric',
            tooltip: 'Camions avec statut "Disponible" et prêts pour une mission',
            filter: { section: 'fleet', tab: 'trucks', status: 'available' }
        },
        activeMissions: {
            value: recentMissions.filter(m => ['validée', 'en_cours'].includes(m.status)).length,
            label: 'Missions Actives (48h)',
            icon: 'play-circle',
            type: 'mission-metric',
            tooltip: 'Missions validées ou en cours des dernières 48 heures',
            filter: { section: 'missions', status: ['validée', 'en_cours'] }
        },
        operationsEnAttente: {
            value: recentOperations.filter(op => op.status === 'en_attente').length,
            label: 'Opérations En Attente (48h)',
            icon: 'clock',
            type: 'operation-metric',
            tooltip: 'Opérations créées dans les dernières 48 heures pas encore démarrées',
            filter: { section: 'tracking', status: 'en_attente' }
        },
        operationsDemarrees: {
            value: recentOperations.filter(op => op.status === 'demarree').length,
            label: 'Opérations Démarrées (48h)',
            icon: 'play',
            type: 'operation-metric',
            tooltip: 'Opérations qui ont commencé leur trajet dans les dernières 48 heures',
            filter: { section: 'tracking', status: 'demarree' }
        },
        operationsArriveeChargement: {
            value: recentOperations.filter(op => op.status === 'arrivee_site_chargement').length,
            label: 'Arrivées Site Chargement (48h)',
            icon: 'map-pin',
            type: 'operation-metric',
            tooltip: 'Opérations arrivées au site de chargement dans les dernières 48 heures',
            filter: { section: 'tracking', status: 'arrivee_site_chargement' }
        },
        operationsChargementTermine: {
            value: recentOperations.filter(op => op.status === 'chargement_termine').length,
            label: 'Chargements Terminés (48h)',
            icon: 'package',
            type: 'operation-metric',
            tooltip: 'Opérations ayant terminé le chargement dans les dernières 48 heures',
            filter: { section: 'tracking', status: 'chargement_termine' }
        },
        operationsArriveeDestination: {
            value: recentOperations.filter(op => op.status === 'arrivee_site_destination').length,
            label: 'Arrivées Destination (48h)',
            icon: 'navigation',
            type: 'operation-metric',
            tooltip: 'Opérations arrivées au site de destination dans les dernières 48 heures',
            filter: { section: 'tracking', status: 'arrivee_site_destination' }
        },
        operationsTerminees: {
            value: recentOperations.filter(op => op.status === 'dechargement_termine').length,
            label: 'Opérations Terminées (48h)',
            icon: 'check-circle',
            type: 'operation-metric',
            tooltip: 'Opérations complètement terminées dans les dernières 48 heures',
            filter: { section: 'tracking', status: 'dechargement_termine' }
        },
        operationsAnnulees: {
            value: recentOperations.filter(op => op.status === 'annulee').length,
            label: 'Opérations Annulées (48h)',
            icon: 'x-circle',
            type: 'problem-metric',
            tooltip: 'Opérations qui ont été annulées dans les dernières 48 heures',
            filter: { section: 'tracking', status: 'annulee' }
        },
        operationsProbleme: {
            value: recentOperations.filter(op => op.status === 'probleme_signalee').length,
            label: 'Problèmes Signalés (48h)',
            icon: 'alert-triangle',
            type: 'problem-metric',
            tooltip: 'Opérations avec des problèmes signalés dans les dernières 48 heures',
            filter: { section: 'tracking', status: 'probleme_signalee' }
        },
        trucksInMaintenance: {
            value: trucks.filter(t => t.maintenance_status && t.maintenance_status !== 'operational').length,
            label: 'Camions en Maintenance',
            icon: 'wrench',
            type: 'fleet-metric',
            tooltip: 'Camions en maintenance, vidange ou réparation',
            filter: { section: 'fleet', tab: 'trucks', maintenance: true }
        },
        totalFleet: {
            value: trucks.length,
            label: 'Flotte Totale',
            icon: 'car',
            type: 'fleet-metric',
            tooltip: 'Nombre total de camions dans la flotte',
            filter: { section: 'fleet', tab: 'trucks' }
        }
    };
}

generateMetricsCards(metrics) {
    return Object.keys(metrics).map(key => {
        const metric = metrics[key];
        return `
            <div class="metric-card ${metric.type}" 
                 data-metric="${key}" 
                 data-filter='${JSON.stringify(metric.filter)}'
                 title="${metric.tooltip}">
                <div class="metric-card-content">
                    <div>
                        <div class="metric-value">${metric.value}</div>
                        <div class="metric-label">${metric.label}</div>
                    </div>
                    <div class="metric-icon">
                        <i data-lucide="${metric.icon}"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

setupMetricCardHandlers() {
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            const filterData = JSON.parse(card.dataset.filter);
            this.navigateToFilteredSection(filterData);
        });
        
        // Add hover effect
        card.addEventListener('mouseenter', () => {
            card.classList.add('hover');
        });
        
        card.addEventListener('mouseleave', () => {
            card.classList.remove('hover');
        });
    });
}

navigateToFilteredSection(filterData) {
    // Navigate to the appropriate section
    const navBtn = document.querySelector(`[data-section="${filterData.section}"]`);
    if (navBtn) {
        navBtn.click();
        
        // Apply filters after navigation
        setTimeout(() => {
            this.applyDashboardFilter(filterData);
        }, 300);
    }
}

applyDashboardFilter(filterData) {
    if (filterData.section === 'fleet' && filterData.tab) {
        // Switch to correct tab
        const tabBtn = document.querySelector(`[data-tab="${filterData.tab}"]`);
        if (tabBtn) {
            tabBtn.click();
        }
        
        // Apply truck filters
        if (filterData.status || filterData.maintenance) {
            setTimeout(() => {
                if (filterData.status) {
                    const statusFilter = document.getElementById('truckStatusFilter');
                    if (statusFilter) {
                        statusFilter.value = filterData.status;
                        this.applyTruckFilters();
                    }
                }
            }, 200);
        }
    } else if (filterData.section === 'missions') {
        // Apply mission filters
        setTimeout(() => {
            const statusFilter = document.getElementById('statusFilter');
            if (statusFilter && filterData.status) {
                if (Array.isArray(filterData.status)) {
                    // For multiple statuses, we'll show all active missions
                    statusFilter.value = 'validée'; // or handle multiple selection
                } else {
                    statusFilter.value = filterData.status;
                }
                this.loadMissions(); // Reload with filter
            }
        }, 200);
    } else if (filterData.section === 'tracking') {
        // Apply operation filters
        setTimeout(() => {
            this.applyOperationStatusFilter(filterData.status);
        }, 200);
    }
}

applyOperationStatusFilter(status) {
    // Check the specific status in the operations filter
    const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
    statusCheckboxes.forEach(checkbox => {
        checkbox.checked = checkbox.value === status;
    });
    
    // Apply the filter
    this.applyEnhancedOperationFilters();
}
// Event History System
// ============================================
// EVENT HISTORY METHODS - Add these to your TransportApp class
// ============================================

// FIXED: Enhanced loadEventHistory with proper error handling
loadEventHistory() {
    console.log('🔄 Starting event history loading...');
    
    const container = document.getElementById('eventHistoryContainer');
    if (!container) {
        console.error('❌ Event history container not found in DOM');
        // Try to find alternative containers
        const alternativeContainer = document.querySelector('.event-history-container');
        if (alternativeContainer) {
            console.log('✅ Found alternative container');
            container = alternativeContainer;
        } else {
            console.error('❌ No event history container found at all');
            return;
        }
    }
    
    // Show loading state
    container.innerHTML = '<div class="loading-message">🔄 Chargement des événements...</div>';
    
    try {
        console.log('📥 Getting activities data...');
        
        // Get activities with extra safety
        let activities = [];
        try {
            const rawData = localStorage.getItem('transport_activities');
            console.log('Raw activities data:', rawData);
            
            if (rawData) {
                activities = JSON.parse(rawData);
                console.log('✅ Parsed activities:', activities.length, 'items');
            } else {
                console.log('ℹ️ No activities data found, creating empty array');
                activities = [];
            }
        } catch (parseError) {
            console.error('❌ Error parsing activities data:', parseError);
            // Clear corrupted data and create empty array
            localStorage.removeItem('transport_activities');
            activities = [];
        }
        
        // Ensure activities is an array
        if (!Array.isArray(activities)) {
            console.warn('⚠️ Activities is not an array, converting...');
            activities = [];
        }
        
        // Take only last 10 events
        const recentActivities = activities.slice(-10).reverse(); // Most recent first
        console.log('📊 Processing', recentActivities.length, 'recent activities');
        
        if (recentActivities.length === 0) {
            console.log('ℹ️ No activities to display');
            container.innerHTML = `
                <div class="no-events-message">
                    <div style="text-align: center; padding: 20px; color: #666;">
                        <p>📅 Aucun événement enregistré</p>
                        <small>Les activités apparaîtront ici dès qu'elles auront lieu</small>
                    </div>
                </div>
            `;
        } else {
            console.log('🎨 Generating HTML for activities...');
            const htmlContent = this.generateEventHistoryHtml(recentActivities);
            console.log('✅ Generated HTML content, length:', htmlContent.length);
            container.innerHTML = htmlContent;
        }
        
        // Initialize icons with safety check
        console.log('🎭 Initializing Lucide icons...');
        setTimeout(() => {
            try {
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons();
                    console.log('✅ Lucide icons initialized successfully');
                } else {
                    console.warn('⚠️ Lucide library not available');
                }
            } catch (iconError) {
                console.error('❌ Error initializing icons:', iconError);
            }
        }, 100);
        
        console.log('✅ Event history loading completed successfully');
        
    } catch (error) {
        console.error('❌ Critical error in loadEventHistory:', error);
        container.innerHTML = `
            <div class="error-message">
                <div style="text-align: center; padding: 20px; color: #d32f2f;">
                    <p>❌ Erreur lors du chargement de l'historique</p>
                    <small>Vérifiez la console pour plus de détails</small>
                    <button onclick="app.clearEventHistory()" style="margin-top: 10px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Vider l'historique
                    </button>
                </div>
            </div>
        `;
    }
}

// FIXED: Safe event history HTML generation
generateEventHistoryHtml(activities) {
    console.log('🎨 Generating HTML for', activities.length, 'activities');
    
    if (!Array.isArray(activities) || activities.length === 0) {
        return '<div class="no-events">Aucun événement</div>';
    }
    
    try {
        return activities.map((activity, index) => {
            console.log(`Processing activity ${index + 1}:`, activity);
            
            // Safety checks for activity object
            if (!activity || typeof activity !== 'object') {
                console.warn('Invalid activity object:', activity);
                return '<div class="invalid-event">Événement invalide</div>';
            }
            
            // Extract data with fallbacks
            const message = activity.message || activity.action || 'Action inconnue';
            const timestamp = activity.timestamp || activity.created_at || new Date().toISOString();
            const user = activity.user || 'Système';
            const icon = activity.icon || 'activity';
            
            // Calculate time ago safely
            let timeAgo = 'Récemment';
            try {
                timeAgo = this.getTimeAgo(timestamp);
            } catch (timeError) {
                console.warn('Error calculating time ago:', timeError);
            }
            
            // Map icon safely
            const iconClass = this.getActivityIcon(icon);
            const categoryClass = this.getActivityCategory(icon);
            
            return `
                <div class="event-item ${categoryClass}">
                    <div class="event-icon">
                        <span style="font-size: 16px;">${iconClass === 'activity' ? '📋' : '📌'}</span>
                    </div>
                    <div class="event-content">
                        <div class="event-message">${message}</div>
                        <div class="event-time">${timeAgo}</div>
                        <div class="event-user">Par: ${user}</div>
                    </div>
                    <div class="event-badge">
                        ${this.formatTime(timestamp)}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error generating event HTML:', error);
        return '<div class="error-event">Erreur lors de la génération des événements</div>';
    }
}

// Helper method to format time safely
formatTime(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        return 'N/A';
    }
}
// Emergency reset for event history
resetEventHistory() {
    try {
        console.log('🔄 Resetting event history...');
        
        // Clear localStorage
        localStorage.removeItem('transport_activities');
        
        // Add a test activity
        const testActivity = {
            id: 1,
            message: 'Système redémarré - historique réinitialisé',
            icon: 'settings',
            user: this.currentUser ? this.currentUser.name : 'Système',
            timestamp: new Date().toISOString()
        };
        
        const activities = [testActivity];
        this.saveActivities(activities);
        
        // Reload event history
        this.loadEventHistory();
        
        console.log('✅ Event history reset complete');
        alert('✅ Historique des événements réinitialisé avec succès!');
        
    } catch (error) {
        console.error('❌ Error resetting event history:', error);
        alert('❌ Erreur lors de la réinitialisation: ' + error.message);
    }
}

getTimeAgo(timestamp) {
    try {
        const now = new Date();
        const eventTime = new Date(timestamp);
        const diffMs = now - eventTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 1) return 'À l\'instant';
        if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
        if (diffHours < 24) return `il y a ${diffHours}h`;
        if (diffDays < 7) return `il y a ${diffDays} jour(s)`;
        
        return this.formatAlgeriaDateTime(timestamp).split(' ')[0];
    } catch (error) {
        return 'Date inconnue';
    }
}

getActivityIcon(icon) {
    const iconMap = {
        'truck': 'truck',
        'car': 'car',
        'user-check': 'user-check',
        'users': 'users',
        'edit': 'edit',
        'settings': 'settings',
        'check': 'check-circle',
        'x': 'x-circle',
        'log-in': 'log-in',
        'log-out': 'log-out',
        'alert-triangle': 'alert-triangle',
        'play-circle': 'play-circle',
        'pause-circle': 'pause-circle'
    };
    return iconMap[icon] || 'activity';
}

getActivityCategory(icon) {
    if (['truck', 'car', 'play-circle'].includes(icon)) return 'mission-event';
    if (['user-check', 'users'].includes(icon)) return 'user-event';
    if (['edit', 'settings'].includes(icon)) return 'system-event';
    if (['check', 'check-circle'].includes(icon)) return 'success-event';
    if (['x', 'x-circle', 'alert-triangle'].includes(icon)) return 'error-event';
    return 'general-event';
}

clearEventHistory() {
    if (!confirm('Êtes-vous sûr de vouloir effacer tout l\'historique des événements?')) {
        return;
    }
    
    try {
        // Clear activities
        this.saveActivities([]);
        
        // Add a system event for the clear action
        this.addActivity('Historique des événements effacé', 'settings');
        
        // Reload the event history
        this.loadEventHistory();
        
        this.showToast('Historique effacé avec succès', 'success');
        
    } catch (error) {
        console.error('Error clearing event history:', error);
        alert('Erreur lors de l\'effacement de l\'historique');
    }
}

exportEventHistory() {
    try {
        const activities = this.getActivities();
        
        if (activities.length === 0) {
            alert('Aucun événement à exporter');
            return;
        }
        
        // Prepare CSV data
        const csvData = [
            ['Date', 'Heure', 'Événement', 'Utilisateur', 'Type'],
            ...activities.map(activity => [
                this.formatAlgeriaDateTime(activity.timestamp).split(' ')[0],
                this.formatAlgeriaDateTime(activity.timestamp).split(' ')[1],
                activity.message,
                activity.user || 'Système',
                activity.icon
            ])
        ];
        
        // Convert to CSV string
        const csvString = csvData.map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
        
        // Create and download file
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `historique_evenements_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Historique exporté avec succès', 'success');
        
    } catch (error) {
        console.error('Error exporting event history:', error);
        alert('Erreur lors de l\'export de l\'historique');
    }
}

loadMoreEventHistory() {
    const container = document.getElementById('eventHistoryContainer');
    if (!container) return;
    
    try {
        const activities = this.getActivities().slice(0, 25); // Load more events
        container.innerHTML = this.generateEventHistoryHtml(activities);
        
        // Hide the "Load More" button if we've loaded all events
        const loadMoreBtn = document.getElementById('loadMoreEvents');
        if (loadMoreBtn && activities.length < 25) {
            loadMoreBtn.style.display = 'none';
        }
        
        setTimeout(() => {
            this.initializeLucideIcons();
        }, 100);
        
    } catch (error) {
        console.error('Error loading more events:', error);
    }
}

startDashboardAutoRefresh() {
    // Auto-refresh dashboard every 2 minutes
    setInterval(() => {
        if (this.currentUser && this.currentSection === 'dashboard') {
            this.updateLastRefreshTime();
            this.loadEventHistory();
        }
    }, 120000); // 2 minutes
}

// Enhanced addActivity method to ensure events are properly stored
addActivity(message, icon = 'activity', priority = 'normal') {
    try {
        const activities = this.getActivities();
        
        const newActivity = {
            id: Date.now(),
            message: message,
            icon: icon,
            priority: priority,
            user: this.currentUser ? this.currentUser.name : 'Système',
            timestamp: new Date().toISOString(),
            created_at: this.getCurrentAlgiersTimestamp()
        };
        
        // Add to beginning of array (most recent first)
        activities.unshift(newActivity);
        
        // Keep only last 100 activities to prevent storage bloat
        if (activities.length > 100) {
            activities.splice(100);
        }
        
        this.saveActivities(activities);
        
        console.log('Activity added:', newActivity);
        
        // If we're on dashboard, refresh the event history
        if (this.currentUser && this.currentSection === 'dashboard') {
            setTimeout(() => {
                this.loadEventHistory();
            }, 100);
        }
        
    } catch (error) {
        console.error('Error adding activity:', error);
    }
}

// Enhanced showToast method for better user feedback
showToast(message, type = 'info') {
    // Create toast element if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
        font-weight: 500;
        max-width: 350px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
    `;
    
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

getEventHistory() {
    try {
        const events = JSON.parse(localStorage.getItem('transport_event_history') || '[]');
        return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
        console.error('Error loading event history:', error);
        return [];
    }
}

addEventToHistory(type, description, entity, details = {}) {
    try {
        const events = this.getEventHistory();
        
        const newEvent = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: type, // 'mission', 'operation', 'fleet'
            description: description,
            entity: entity,
            details: details,
            user: this.currentUser.name
        };
        
        events.unshift(newEvent);
        
        // Keep only last 100 events
        const trimmedEvents = events.slice(0, 100);
        
        localStorage.setItem('transport_event_history', JSON.stringify(trimmedEvents));
        
        // Refresh dashboard if currently viewing
        if (this.currentSection === 'dashboard') {
            this.loadEventHistory();
        }
    } catch (error) {
        console.error('Error adding event to history:', error);
    }
}

getEventIcon(type) {
    const icons = {
        'mission': 'truck',
        'operation': 'activity',
        'fleet': 'car',
        'assignment': 'users',
        'status': 'toggle-left',
        'maintenance': 'wrench',
        'default': 'circle'
    };
    return icons[type] || icons.default;
}

clearEventHistory() {
    if (confirm('Êtes-vous sûr de vouloir vider tout l\'historique des événements ?')) {
        localStorage.setItem('transport_event_history', '[]');
        this.loadEventHistory();
    }
}

exportEventHistory() {
    const events = this.getEventHistory();
    if (events.length === 0) {
        alert('Aucun événement à exporter');
        return;
    }
    
    // Create CSV content
    const csvHeader = 'Date,Type,Description,Entité,Utilisateur\n';
    const csvContent = events.map(event => {
        const date = this.formatAlgeriaDateTime(event.timestamp);
        return `"${date}","${event.type}","${event.description}","${event.entity}","${event.user}"`;
    }).join('\n');
    
    const fullCsv = csvHeader + csvContent;
    
    // Download
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historique_evenements_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

startDashboardAutoRefresh() {
    // Clear any existing interval
    if (this.dashboardRefreshInterval) {
        clearInterval(this.dashboardRefreshInterval);
    }
    
    // Refresh every 30 seconds
    this.dashboardRefreshInterval = setInterval(() => {
        if (this.currentSection === 'dashboard') {
            this.loadDashboardMetrics();
            this.updateLastRefreshTime();
        }
    }, 30000);
}
    
    loadMissionOverview() {
        const missions = this.getMissions().slice(0, 6); // Show recent missions
        const container = document.getElementById('missionOverviewGrid');
        
        if (!container) return;
        
        container.innerHTML = missions.map(mission => {
            const trucks = mission.assigned_trucks || [];
            const truckInfo = trucks.length > 0 ? 
                `${trucks.length}/${mission.trucks_requested} camions assignés` : 
                `${mission.trucks_requested} camions requis`;
                
            return `
                <div class="mission-card">
                    <div class="mission-card-header">
                        <div class="mission-id">MSN${String(mission.id).padStart(3, '0')}</div>
                        <span class="status-badge status-${mission.status}">${this.getStatusDisplayName(mission.status)}</span>
                    </div>
                    <div class="mission-client">${mission.client_name}</div>
                    <div class="mission-route">${mission.departure_wilaya} → ${mission.arrival_wilaya}</div>
                    <div class="mission-details">
                        <div class="mission-detail">
                            <span class="mission-detail-label">Destination:</span>
                            <span class="mission-detail-value">${mission.destination_name}</span>
                        </div>
                        <div class="mission-detail">
                            <span class="mission-detail-label">Camions:</span>
                            <span class="mission-detail-value">${truckInfo}</span>
                        </div>
<div class="mission-detail">
    <span class="mission-detail-label">Temps restant:</span>
    <span class="countdown-badge ${this.getCountdownClass(mission.scheduled_date, mission.scheduled_time)}" 
      data-countdown="true" 
      data-scheduled-date="${mission.scheduled_date}" 
      data-scheduled-time="${mission.scheduled_time}">
    ${this.calculateCountdown(mission.scheduled_date, mission.scheduled_time)}
</span>

</div>

                        <div class="mission-detail">
                            <span class="mission-detail-label">Date prévue:</span>
                            <span class="mission-detail-value">${this.formatDate(mission.scheduled_date)} ${mission.scheduled_time || ''}</span>
                        </div>
                        <div class="mission-detail">
                            <span class="mission-detail-label">Type produit:</span>
                            <span class="mission-detail-value">${mission.product_type || 'Non spécifié'}</span>
                        </div>
                    </div>
                    <div class="mission-item-actions">
                        <button class="btn btn--outline btn--sm" onclick="app.showFicheMission(${mission.id})">
                            <i data-lucide="file-text"></i>
                            Fiche
                        </button>
${this.currentUser.role === 'planner' && mission.status === 'demandée' ? 
    `<button class="btn btn--primary btn--sm" onclick="app.openSmartAssignmentModal(${mission.id})">
        <i data-lucide="zap"></i>
        Assignment Intelligent
    </button>` : ''}
${this.currentUser.role === 'admin' && mission.status === 'demandée' ? 
    `<button class="btn btn--primary btn--sm" onclick="app.openSmartAssignmentModal(${mission.id})">
        <i data-lucide="zap"></i>
        Assignment Intelligent
    </button>` : ''}

                        ${this.currentUser.role === 'coordinator' && ['validée', 'en_cours'].includes(mission.status) ? 
                            `<button class="btn btn--success btn--sm" onclick="app.updateMissionStatus(${mission.id}, '${mission.status === 'validée' ? 'en_cours' : 'terminée'}')">
                                <i data-lucide="check"></i>
                                ${mission.status === 'validée' ? 'Démarrer' : 'Terminer'}
                            </button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        if (missions.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--color-text-secondary); padding: var(--space-32);">Aucune mission enregistrée</div>';
        }
    }
    
    loadFleetStatus() {
        const trucks = this.getTrucks();
        const drivers = this.getDrivers();
        const container = document.getElementById('fleetStatusGrid');
        
        if (!container) return;
        
        const fleetCards = [];
        
        // Available trucks with smart recommendations
        const availableTrucks = trucks.filter(t => t.status === 'available');
        if (availableTrucks.length > 0) {
            fleetCards.push(`
                <div class="fleet-card">
                    <h4>Camions Disponibles</h4>
                    <div class="fleet-items">
                        ${availableTrucks.slice(0, 3).map(truck => {
                            const driver = drivers.find(d => d.id === truck.assigned_driver_id);
                            return `
                                <div class="fleet-item">
                                    <div class="fleet-item-title">${truck.brand} ${truck.model}</div>
                                    <div class="fleet-item-subtitle">${truck.registration} - ${truck.current_location}</div>
                                    <div class="fleet-item-subtitle">Chauffeur: ${driver ? driver.name : 'Non assigné'}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${availableTrucks.length > 3 ? `<div style="text-align: center; margin-top: var(--space-12); color: var(--color-text-secondary);">+${availableTrucks.length - 3} autres</div>` : ''}
                </div>
            `);
        }
        
        // Busy trucks
        const busyTrucks = trucks.filter(t => t.status === 'busy');
        if (busyTrucks.length > 0) {
            fleetCards.push(`
                <div class="fleet-card">
                    <h4>Camions en Mission</h4>
                    <div class="fleet-items">
                        ${busyTrucks.slice(0, 3).map(truck => {
                            const driver = drivers.find(d => d.id === truck.assigned_driver_id);
                            return `
                                <div class="fleet-item">
                                    <div class="fleet-item-title">${truck.brand} ${truck.model}</div>
                                    <div class="fleet-item-subtitle">${truck.registration} - ${truck.current_location}</div>
                                    <div class="fleet-item-subtitle">Chauffeur: ${driver ? driver.name : 'Non assigné'}</div>
                                    ${truck.next_available_time ? 
                                        `<div class="fleet-item-subtitle">Disponible: ${this.formatDateTime(truck.next_available_time)}</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `);
        }
        
        container.innerHTML = fleetCards.join('');
    }
    
    // Mission Management
loadMissions() {
    let missions = this.getMissions();
    
    // Sort missions by creation date (newest first)
    missions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Apply filters
    const statusFilter = document.getElementById('statusFilter')?.value;
    const clientFilter = document.getElementById('clientFilter')?.value;
    const periodFilter = document.getElementById('periodFilter')?.value;
    
    if (statusFilter) {
        missions = missions.filter(m => m.status === statusFilter);
    }
    
    if (clientFilter) {
        missions = missions.filter(m => m.client_id === parseInt(clientFilter));
    }
    
    if (periodFilter) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (periodFilter) {
            case 'today':
                missions = missions.filter(m => new Date(m.created_at) >= startOfDay);
                break;
            case 'week':
                const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
                missions = missions.filter(m => new Date(m.created_at) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
                missions = missions.filter(m => new Date(m.created_at) >= monthAgo);
                break;
        }
    }
    
    // Populate client filter dropdown
    this.populateClientFilter();
    
    const container = document.getElementById('missionsList');
    const emptyState = document.getElementById('missionsEmptyState');
    
    if (!container) return;
    
    if (missions.length === 0) {
        container.classList.add('hidden');
        emptyState?.classList.remove('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    emptyState?.classList.add('hidden');
    
    container.innerHTML = missions.map(mission => this.renderMissionCard(mission)).join('');
    
    // Initialize Lucide icons
    this.initializeLucideIcons();
    
    // Start countdown updates
    this.startCountdownUpdates();
}

// Helper method to populate client filter
populateClientFilter() {
    const clientFilter = document.getElementById('clientFilter');
    if (!clientFilter) return;
    
    const clients = this.getClients();
    const currentValue = clientFilter.value;
    
    clientFilter.innerHTML = '<option value="">Tous les clients</option>';
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        clientFilter.appendChild(option);
    });
    
    clientFilter.value = currentValue;
}

// Enhanced mission card renderer
renderMissionCard(mission) {
    const operations = this.getOperations().filter(op => op.mission_id === mission.id);
    const destinations = this.getMissionDestinations(mission);
    
    return `
        <div class="mission-card-enhanced" data-mission-id="${mission.id}">
            <!-- Mission Header -->
            <div class="mission-header-enhanced">
                <div class="mission-title-row">
                    <div>
                        <h3 class="mission-number-title">MSN${String(mission.id).padStart(3, '0')}</h3>
                        <div class="mission-client-name">${mission.client_name}</div>
                    </div>
                    <div class="mission-status-badges">
                        <span class="status-badge status-${mission.status}">
                            ${this.getStatusDisplayName(mission.status)}
                        </span>
                        <span class="countdown-badge ${this.getCountdownClass(mission.scheduled_date, mission.scheduled_time)}" 
                              data-countdown="true" 
                              data-scheduled-date="${mission.scheduled_date}" 
                              data-scheduled-time="${mission.scheduled_time}">
                            ${this.calculateCountdown(mission.scheduled_date, mission.scheduled_time)}
                        </span>
                    </div>
                </div>
                <div class="mission-meta-row">
                    <div class="mission-created-date">
                        Créée le ${this.formatDateTime(mission.created_at)} par ${mission.created_by}
                    </div>
                </div>
            </div>
            
            <!-- Mission Details -->
            <div class="mission-details-enhanced">
                <!-- Destinations Section -->
                <div class="mission-destinations-section">
                    <div class="destinations-header">
                        <i data-lucide="map-pin"></i>
                        <span>Destinations (${destinations.length})</span>
                    </div>
                    <div class="destinations-list">
                        ${destinations.map((dest, index) => `
                            <div class="destination-item-card">
                                <div class="destination-route">
                                    <strong>${index + 1}.</strong> ${dest.departure_wilaya || 'Départ'} → ${dest.name || dest.arrival_wilaya}
                                </div>
                                <div class="destination-details">
                                    <div>📅 ${this.formatDate(dest.departure_date)} ${dest.departure_time}</div>
                                    <div>🚛 ${dest.trucks_requested || 1} camion(s)</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Mission Stats -->
                <div class="mission-stats-row">
                    <div class="mission-stat">
                        <div class="mission-stat-value">${operations.length}</div>
                        <div class="mission-stat-label">Opérations</div>
                    </div>
                    <div class="mission-stat">
                        <div class="mission-stat-value">${mission.assigned_trucks?.length || 0}/${mission.trucks_requested}</div>
                        <div class="mission-stat-label">Camions</div>
                    </div>
                    <div class="mission-stat">
                        <div class="mission-stat-value">${this.calculateMissionProgress(mission)}%</div>
                        <div class="mission-stat-label">Progression</div>
                    </div>
                </div>
                
                <!-- Operations Section -->
                ${operations.length > 0 ? `
                    <div class="mission-operations-section">
                        <div class="operations-header">
                            <div class="operations-title">
                                <i data-lucide="activity"></i>
                                <span>Opérations Assignées</span>
                                <span class="operations-count">${operations.length}</span>
                            </div>
                        </div>
                        <div class="operations-list">
                            ${operations.slice(0, 3).map(operation => this.renderOperationCard(operation)).join('')}
                            ${operations.length > 3 ? `
                                <div class="operation-item-card" style="text-align: center; font-style: italic; color: var(--color-text-secondary);">
                                    +${operations.length - 3} autres opérations...
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : `
                    <div class="mission-operations-section">
                        <div class="operations-header">
                            <div class="operations-title">
                                <i data-lucide="clock"></i>
                                <span>En attente d'assignation</span>
                            </div>
                        </div>
                        <div style="text-align: center; padding: var(--space-16); color: var(--color-text-secondary); font-style: italic;">
                            Aucune opération assignée pour le moment
                        </div>
                    </div>
                `}
                
                <!-- Comments -->
                ${mission.comments ? `
                    <div class="mission-comments">
                        <strong>💬 Commentaires:</strong> ${mission.comments}
                    </div>
                ` : ''}
            </div>
            
            <!-- Mission Actions -->
            <div class="mission-actions-enhanced">
                <div class="actions-grid">
                    <button class="action-btn-enhanced" onclick="app.showFicheMission(${mission.id})">
                        <i data-lucide="file-text"></i>
                        <span>Fiche</span>
                    </button>
                    ${this.renderMissionActionButtons(mission)}
                </div>
            </div>
        </div>
    `;
}

// Helper method to render operation cards
renderOperationCard(operation) {
    const truck = this.getTrucks().find(t => t.id === operation.assigned_truck_id);
    const driver = this.getDrivers().find(d => d.id === operation.assigned_driver_id);
    
    return `
        <div class="operation-item-card">
            <div class="operation-header-row">
                <div class="operation-number">OP${operation.operation_number || operation.id}</div>
                <span class="status-badge status-${operation.status}">
                    ${this.getOperationStatusDisplayName(operation.status)}
                </span>
            </div>
            <div class="operation-details-grid">
                <div class="operation-detail">
                    <strong>Route:</strong> ${operation.departure_location} → ${operation.arrival_location}
                </div>
                <div class="operation-detail">
                    <strong>Camion:</strong> ${truck ? `${truck.brand} ${truck.registration}` : 'Non assigné'}
                </div>
                <div class="operation-detail">
                    <strong>Chauffeur:</strong> ${driver ? driver.name : 'Non assigné'}
                </div>
                <div class="operation-detail">
                    <strong>Départ:</strong> ${operation.estimated_departure ? this.formatDateTime(operation.estimated_departure) : 'Non défini'}
                </div>
            </div>
        </div>
    `;
}

// Helper method to render mission action buttons
renderMissionActionButtons(mission) {
    let buttons = '';
    
    // Edit button for planners/admins on requested missions
    if (['planner', 'admin'].includes(this.currentUser.role) && mission.status === 'demandée') {
        buttons += `
            <button class="action-btn-enhanced" onclick="app.editMission(${mission.id})">
                <i data-lucide="edit"></i>
                <span>Modifier</span>
            </button>
        `;
    }
    
    // Smart assignment button
    if ((this.currentUser.role === 'planner' || this.currentUser.role === 'admin') && mission.status === 'demandée') {
        buttons += `
            <button class="action-btn-enhanced action-btn-primary" onclick="app.openSmartAssignmentModal(${mission.id})">
                <i data-lucide="zap"></i>
                <span>Assignment Intelligent</span>
            </button>
        `;
    }
    
    // Modify assignment button
    if (((this.currentUser.role === 'planner' && mission.validated_by === this.currentUser.name) || 
         this.currentUser.role === 'admin') && 
        ['validée', 'en_cours'].includes(mission.status)) {
        buttons += `
            <button class="action-btn-enhanced action-btn-warning" onclick="app.openModificationModal(${mission.id})">
                <i data-lucide="settings"></i>
                <span>Modifier Assignation</span>
            </button>
        `;
    }
    
    // Coordinator actions
    if (this.currentUser.role === 'coordinator' && ['validée', 'en_cours'].includes(mission.status)) {
        const nextAction = mission.status === 'validée' ? 'Démarrer' : 'Terminer';
        const nextStatus = mission.status === 'validée' ? 'en_cours' : 'terminée';
        buttons += `
            <button class="action-btn-enhanced action-btn-success" onclick="app.updateMissionStatus(${mission.id}, '${nextStatus}')" title="${nextAction}">
                <i data-lucide="check"></i>
                <span>${nextAction}</span>
            </button>
        `;
    }
    
    // Delete button
    if (['planner', 'admin'].includes(this.currentUser.role) && mission.status === 'demandée') {
        buttons += `
            <button class="action-btn-enhanced action-btn-error" onclick="app.deleteMission(${mission.id})" title="Supprimer définitivement">
                <i data-lucide="trash-2"></i>
                <span>Supprimer</span>
            </button>
        `;
    }
    
    // Cancel button
    if (['coordinator', 'admin', 'planner'].includes(this.currentUser.role) && 
        !['demandée', 'terminée', 'annulée'].includes(mission.status)) {
        buttons += `
            <button class="action-btn-enhanced action-btn-warning" onclick="app.cancelMission(${mission.id})" title="Annuler (garder l'historique)">
                <i data-lucide="x-circle"></i>
                <span>Annuler</span>
            </button>
        `;
    }
    
    return buttons;
}

// Helper method to get mission destinations
getMissionDestinations(mission) {
    // Handle multi-destination missions
    if (mission.destinations && Array.isArray(mission.destinations)) {
        return mission.destinations;
    }
    
    // Handle legacy single-destination missions
    return [{
        name: mission.destination_name,
        departure_wilaya: mission.departure_wilaya,
        arrival_wilaya: mission.arrival_wilaya,
        departure_date: mission.scheduled_date,
        departure_time: mission.scheduled_time,
        trucks_requested: mission.trucks_requested
    }];
}

// Helper method to calculate mission progress
calculateMissionProgress(mission) {
    const operations = this.getOperations().filter(op => op.mission_id === mission.id);
    if (operations.length === 0) return 0;
    
    const completedOperations = operations.filter(op => 
        ['dechargement_termine', 'terminee'].includes(op.status)
    );
    
    return Math.round((completedOperations.length / operations.length) * 100);
}

// ENHANCED: Open Modification Modal with advanced truck selection
openModificationModal(missionId) {
    if (!this.requirePermission('operations.modify_assignment', 'Modification d\'assignation non autorisée')) return;
    if (!['planner', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs et administrateurs peuvent modifier les assignations');
        return;
    }

    const mission = this.getMissions().find(m => m.id === missionId);
    if (!mission) return;
    
    if (!['validée', 'en_cours'].includes(mission.status)) {
        alert('Seules les missions validées ou en cours peuvent avoir leurs assignations modifiées');
        return;
    }
    
    // Store current mission for modification
    this.currentMissionForModification = mission;
    
    // Initialize modification state with truck limit
    this.modificationState = {
        mission: mission,
        selectedTrucks: new Map(),
        originalAssignments: mission.assigned_trucks || [],
        maxTrucksAllowed: mission.trucks_requested, // THIS IS THE KEY ADDITION
        currentTruckCount: 0 // Track current selection
    };
    
    // Populate mission details with truck limit info
    this.displayMissionDetailsForModificationWithLimits(mission);
    
    // Display current assignments
    this.displayCurrentAssignmentsEnhanced(mission);
    
    // Show enhanced truck list with limits
    this.showEnhancedModificationTruckListWithLimits();
    
    // Update selected trucks display with counter
    this.updateSelectedModificationTrucksDisplayWithLimits();
    
    // Open modal
    this.openModal('modificationModal');
}
// NEW: Display mission details with truck limits
displayMissionDetailsForModificationWithLimits(mission) {
    const container = document.getElementById('missionDetailsModification');
    if (!container) return;
    
    const urgencyLevel = this.calculateUrgencyLevel(mission);
    const timeToDepart = this.calculateTimeToDepart(mission);
    
    container.innerHTML = `
        <div class="mission-summary-card">
            <div class="mission-header">
                <h4>Mission MSN${String(mission.id).padStart(3, '0')}</h4>
                <div class="urgency-badge ${urgencyLevel.class}">${urgencyLevel.text}</div>
            </div>
            
            <!-- TRUCK LIMIT WARNING BOX -->
            <div class="truck-limit-warning" style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center;">
                <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ LIMITE DE CAMIONS ⚠️</h4>
                <p style="color: #856404; margin: 0; font-weight: bold; font-size: 16px;">
                    Cette mission nécessite exactement <span style="color: #dc3545; font-size: 20px;">${mission.trucks_requested}</span> camion(s)
                </p>
                <p style="color: #856404; margin: 5px 0 0 0; font-size: 14px;">
                    Vous ne pouvez pas sélectionner plus de camions que requis
                </p>
            </div>
            
            <div class="mission-details-grid">
                <div class="detail-item">
                    <span class="detail-label">Client:</span>
                    <span class="detail-value">${mission.client_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Route:</span>
                    <span class="detail-value">${mission.departure_wilaya} → ${mission.arrival_wilaya}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Destination:</span>
                    <span class="detail-value">${mission.destination_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Camions requis:</span>
                    <span class="detail-value" style="color: #dc3545; font-weight: bold;">${mission.trucks_requested}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Départ prévu:</span>
                    <span class="detail-value">${this.formatDate(mission.scheduled_date)} ${mission.scheduled_time}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Temps restant:</span>
                    <span class="detail-value ${timeToDepart.class}">${timeToDepart.text}</span>
                </div>
            </div>
            ${mission.comments ? `
                <div class="mission-comments">
                    <strong>Commentaires:</strong> ${mission.comments}
                </div>
            ` : ''}
        </div>
    `;
}

// ENHANCED: Display mission details for modification
displayMissionDetailsForModification(mission) {
    const container = document.getElementById('missionDetailsModification');
    if (!container) return;
    
    const urgencyLevel = this.calculateUrgencyLevel(mission);
    const timeToDepart = this.calculateTimeToDepart(mission);
    
    container.innerHTML = `
        <div class="mission-summary-card">
            <div class="mission-header">
                <h4>Mission MSN${String(mission.id).padStart(3, '0')}</h4>
                <div class="urgency-badge ${urgencyLevel.class}">${urgencyLevel.text}</div>
            </div>
            <div class="mission-details-grid">
                <div class="detail-item">
                    <span class="detail-label">Client:</span>
                    <span class="detail-value">${mission.client_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Route:</span>
                    <span class="detail-value">${mission.departure_wilaya} → ${mission.arrival_wilaya}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Destination:</span>
                    <span class="detail-value">${mission.destination_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Camions requis:</span>
                    <span class="detail-value">${mission.trucks_requested}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Départ prévu:</span>
                    <span class="detail-value">${this.formatDate(mission.scheduled_date)} ${mission.scheduled_time}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Temps restant:</span>
                    <span class="detail-value ${timeToDepart.class}">${timeToDepart.text}</span>
                </div>
            </div>
            ${mission.comments ? `
                <div class="mission-comments">
                    <strong>Commentaires:</strong> ${mission.comments}
                </div>
            ` : ''}
        </div>
    `;
}

// ENHANCED: Display current assignments with more details
displayCurrentAssignmentsEnhanced(mission) {
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const operations = this.getOperations();
    const container = document.getElementById('currentAssignments');
    
    if (!mission.assigned_trucks || mission.assigned_trucks.length === 0) {
        container.innerHTML = '<div style="color: var(--color-text-secondary);">Aucune assignation actuelle</div>';
        return;
    }
    
    container.innerHTML = mission.assigned_trucks.map((assignment, index) => {
        const truck = trucks.find(t => t.id === assignment.truck_id);
        const driver = drivers.find(d => d.id === assignment.driver_id);
        const operation = operations.find(op => op.mission_id === mission.id && op.assigned_truck_id === assignment.truck_id);
        
        return `
            <div class="current-assignment-item-enhanced">
                <div class="assignment-header">
                    <strong>Assignation ${index + 1}</strong>
                    <span class="assignment-date">Assigné le ${this.formatDateTime(assignment.assigned_at)}</span>
                </div>
                <div class="assignment-details-grid">
                    <div class="assignment-detail">
                        <span class="assignment-label">🚛 Camion:</span>
                        <span class="assignment-value">${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'Camion introuvable'}</span>
                    </div>
                    <div class="assignment-detail">
                        <span class="assignment-label">👤 Chauffeur:</span>
                        <span class="assignment-value">${driver ? `${driver.name} (${driver.phone || 'N/A'})` : 'Chauffeur introuvable'}</span>
                    </div>
                    ${operation ? `
                        <div class="assignment-detail">
                            <span class="assignment-label">📋 Opération:</span>
                            <span class="assignment-value">OP${operation.operation_number || operation.id} - Status: ${this.getOperationStatusDisplayName(operation.status)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ENHANCED: Show truck list for modification (similar to wizard)
showEnhancedModificationTruckList() {
    const container = document.getElementById('enhancedModificationTruckList');
    if (!container) return;
    
    const allTrucks = this.getTrucks();
    const allDrivers = this.getDrivers();
    const operations = this.getOperations();
    
    // Get currently assigned truck IDs to exclude them initially or mark them specially
    const currentlyAssignedTruckIds = new Set(
        (this.modificationState.mission.assigned_trucks || []).map(a => a.truck_id)
    );
    
    container.innerHTML = allTrucks.map(truck => {
        const driver = allDrivers.find(d => d.id === truck.permanent_driver_id || d.id === truck.assigned_driver_id);
        
        // Get ALL operations for this truck, sorted by estimated departure time
        const truckOperations = this.getAllTruckOperationsSorted(truck.id);
        
        // Get the NEXT operation (first in sorted order)
        const nextOperation = truckOperations.length > 0 ? truckOperations[0] : null;
        
        // Determine current location
        let currentLocation = truck.current_location;
        if (nextOperation) {
            const operationInProgress = truckOperations.find(op => 
                ['demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
            );
            
            if (operationInProgress) {
                if (operationInProgress.status === 'demarree') {
                    currentLocation = `En route: ${operationInProgress.departure_location} → ${operationInProgress.arrival_location}`;
                } else if (operationInProgress.status === 'arrivee_site_chargement') {
                    currentLocation = `Sur site de chargement: ${operationInProgress.departure_location}`;
                } else if (operationInProgress.status === 'chargement_termine') {
                    currentLocation = `En route vers: ${operationInProgress.arrival_location}`;
                } else if (operationInProgress.status === 'arrivee_site_destination') {
                    currentLocation = `Sur site de destination: ${operationInProgress.arrival_location}`;
                }
            }
        }
        
        // Determine next destination
        let nextDestination = truck.current_location;
        if (nextOperation) {
            nextDestination = nextOperation.arrival_location;
        }
        
        // Check if currently assigned to this mission
        const isCurrentlyAssigned = currentlyAssignedTruckIds.has(truck.id);
        
        // Check if selected for modification
        const isSelected = this.modificationState.selectedTrucks.has(truck.id);
        
        // Get maintenance status
        const maintenanceStatus = this.getTruckMaintenanceStatus(truck);
        
        // Determine availability
        let availability = 'available';
        let generalStatus = 'Disponible';
        if (isSelected) {
            availability = 'selected';
            generalStatus = 'Sélectionné pour remplacement';
        } else if (isCurrentlyAssigned) {
            availability = 'current';
            generalStatus = 'Actuellement assigné à cette mission';
        } else if (maintenanceStatus.inMaintenance) {
            availability = 'maintenance';
            generalStatus = maintenanceStatus.statusText;
        } else if (truckOperations.length > 0) {
            availability = 'busy';
            generalStatus = 'En opération';
        } else if (truck.status === 'busy') {
            availability = 'busy';
            generalStatus = 'Occupé';
        }
        
        const canAssign = !isSelected;
        const needsConfirmation = maintenanceStatus.inMaintenance;
        
        // Function to get status display text and class
        const getOperationStatusInfo = (status) => {
            switch(status) {
                case 'en_attente': return { text: 'En attente', class: 'status-pending' };
                case 'demarree': return { text: 'En cours', class: 'status-in-progress' };
                case 'arrivee_site_chargement': return { text: 'Arrivé au chargement', class: 'status-in-progress' };
                case 'chargement_termine': return { text: 'Chargement terminé', class: 'status-in-progress' };
                case 'arrivee_site_destination': return { text: 'Arrivé à destination', class: 'status-completed' };
                default: return { text: status, class: 'status-pending' };
            }
        };
        
        // Format date and time
        const formatDateTime = (dateString) => {
            if (!dateString) return 'Non défini';
            try {
                return this.formatAlgeriaDateTime(dateString);
            } catch (error) {
                return 'Date invalide';
            }
        };
        
        return `
            <div class="enhanced-truck-card ${availability}" data-truck-id="${truck.id}">
                <div class="enhanced-truck-header">
                    <div class="truck-main-info">
                        <h5>${truck.brand} ${truck.model}</h5>
                        <div class="truck-registration">${truck.registration}</div>
                    </div>
                    <div class="truck-general-status status-${generalStatus.toLowerCase().replace(/\s+/g, '-')}">
                        ${generalStatus}
                    </div>
                </div>
                
                <div class="truck-detailed-info">
                    <div class="truck-info-row">
                        <div class="truck-info-label">📍 Localisation actuelle:</div>
                        <div class="truck-info-value">${currentLocation}</div>
                    </div>
                    
                    <div class="truck-info-row">
                        <div class="truck-info-label">🎯 Prochaine destination:</div>
                        <div class="truck-info-value">${nextDestination}</div>
                    </div>
                    
                    ${truckOperations.length > 0 ? `
                        <div class="truck-operations-section">
                            <div class="truck-info-label">🚛 Opérations assignées (${truckOperations.length}) - Triées par départ:</div>
                            <div class="truck-operations-list">
                                ${truckOperations.slice(0, 3).map((op, index) => {
                                    const statusInfo = getOperationStatusInfo(op.status);
                                    return `
                                        <div class="operation-item ${statusInfo.class} ${index === 0 ? 'next-operation-highlight' : ''}">
                                            <div class="operation-header">
                                                <span class="operation-number">
                                                    ${index === 0 ? '🔥 SUIVANTE - ' : `${index + 1}ème - `}Op #${op.mission_number || op.id}
                                                </span>
                                                <span class="operation-status ${statusInfo.class}">${statusInfo.text}</span>
                                            </div>
                                            <div class="operation-route">
                                                ${op.departure_location} → ${op.arrival_location}
                                            </div>
                                            <div class="operation-client">
                                                Client: ${op.client_name || 'Non défini'}
                                            </div>
                                            <div class="operation-timing ${index === 0 ? 'next-timing' : ''}">
                                                ⏰ Départ estimé: ${formatDateTime(op.estimated_departure)}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                                ${truckOperations.length > 3 ? `
                                    <div class="operation-item more-operations">
                                        +${truckOperations.length - 3} autres opérations...
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : `
                        <div class="truck-info-row">
                            <div class="truck-info-label">⏰ Disponible:</div>
                            <div class="truck-info-value">Immédiatement</div>
                        </div>
                    `}
                    
                    ${maintenanceStatus.inMaintenance ? `
                        <div class="truck-info-row maintenance-warning">
                            <div class="truck-info-label">🔧 Maintenance:</div>
                            <div class="truck-info-value">${maintenanceStatus.statusText}</div>
                        </div>
                    ` : ''}
                    
                    ${driver ? `
                        <div class="truck-info-row">
                            <div class="truck-info-label">👤 Chauffeur:</div>
                            <div class="truck-info-value">${driver.name} (${driver.experience_years} ans)</div>
                        </div>
                    ` : ''}
                    
                    <div class="truck-info-row">
                        <div class="truck-info-label">⚖️ Capacité:</div>
                        <div class="truck-info-value">${truck.capacity || 25} tonnes</div>
                    </div>
                    
                    ${truck.gps_location ? `
                        <div class="truck-info-row truck-gps-row">
                            <div class="truck-info-label">🗺️ Localisation GPS:</div>
                            <div class="truck-info-value">
                                <a href="${truck.gps_location}" target="_blank" class="enhanced-gps-link">
                                    <span class="gps-link-icon">📍</span>
                                    <span class="gps-link-text">Voir sur Google Maps</span>
                                    <span class="gps-link-arrow">→</span>
                                </a>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <button class="truck-assignment-btn ${needsConfirmation ? 'maintenance-warning' : ''} ${isSelected ? 'selected' : ''}" 
                        ${!canAssign ? 'disabled' : ''}
                        onclick="app.toggleModificationTruckSelection(${truck.id})">
                    ${isSelected ? '✅ Sélectionné - Cliquer pour retirer' : 
                      !canAssign ? '❌ Non disponible' : 
                      needsConfirmation ? '⚠️ Sélectionner (en maintenance)' : 
                      isCurrentlyAssigned ? '🔄 Remplacer ce camion' :
                      '✅ Sélectionner pour cette mission'}
                </button>
            </div>
        `;
    }).join('');
}

// NEW: Toggle truck selection for modification
// NEW: Toggle truck selection with strict limit validation
toggleModificationTruckSelection(truckId) {
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const truck = trucks.find(t => t.id === truckId);
    const driver = drivers.find(d => d.id === truck.permanent_driver_id || d.id === truck.assigned_driver_id);
    
    if (!truck) {
        alert('Camion introuvable');
        return;
    }
    
    const maxAllowed = this.modificationState.maxTrucksAllowed;
    const currentSelected = this.modificationState.selectedTrucks.size;
    
    // Check if truck is already selected
    if (this.modificationState.selectedTrucks.has(truckId)) {
        // Remove from selection
        this.modificationState.selectedTrucks.delete(truckId);
        this.showToast(`${truck.brand} ${truck.model} retiré de la sélection`, 'info');
    } else {
        // Check if we're at the limit BEFORE adding
        if (currentSelected >= maxAllowed) {
            alert(`❌ LIMITE ATTEINTE!\n\nVous avez déjà sélectionné ${maxAllowed} camion(s).\nCette mission ne nécessite que ${maxAllowed} camion(s).\n\nRettirez un camion existant avant d'en ajouter un nouveau.`);
            return;
        }
        
        // Check maintenance status
        const maintenanceStatus = this.getTruckMaintenanceStatus(truck);
        if (maintenanceStatus.inMaintenance) {
            const confirmed = confirm(
                `⚠️ ATTENTION: Ce camion est en maintenance (${maintenanceStatus.statusText}).\n\n` +
                `Voulez-vous vraiment l'assigner à cette mission?\n\n` +
                `Cela pourrait affecter la planification.`
            );
            if (!confirmed) return;
        }
        
        // Add to selection
        this.modificationState.selectedTrucks.set(truckId, {
            truck: truck,
            driver: driver
        });
        
        const newCount = this.modificationState.selectedTrucks.size;
        this.showToast(`${truck.brand} ${truck.model} ajouté (${newCount}/${maxAllowed})`, 'success');
    }
    
    // Update displays
    this.showEnhancedModificationTruckListWithLimits();
    this.updateSelectedModificationTrucksDisplayWithLimits();
}
// NEW: Show truck list with limit validation
showEnhancedModificationTruckListWithLimits() {
    const container = document.getElementById('enhancedModificationTruckList');
    if (!container) return;
    
    const allTrucks = this.getTrucks();
    const allDrivers = this.getDrivers();
    const operations = this.getOperations();
    
    // Get limit information
    const maxAllowed = this.modificationState.maxTrucksAllowed;
    const currentSelected = this.modificationState.selectedTrucks.size;
    const isAtLimit = currentSelected >= maxAllowed;
    
    // Get currently assigned truck IDs to exclude them initially or mark them specially
    const currentlyAssignedTruckIds = new Set(
        (this.modificationState.mission.assigned_trucks || []).map(a => a.truck_id)
    );
    
    container.innerHTML = allTrucks.map(truck => {
        const driver = allDrivers.find(d => d.id === truck.permanent_driver_id || d.id === truck.assigned_driver_id);
        
        // Get ALL operations for this truck, sorted by estimated departure time
        const truckOperations = this.getAllTruckOperationsSorted(truck.id);
        
        // Get the NEXT operation (first in sorted order)
        const nextOperation = truckOperations.length > 0 ? truckOperations[0] : null;
        
        // Determine current location
        let currentLocation = truck.current_location;
        if (nextOperation) {
            const operationInProgress = truckOperations.find(op => 
                ['demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
            );
            
            if (operationInProgress) {
                if (operationInProgress.status === 'demarree') {
                    currentLocation = `En route: ${operationInProgress.departure_location} → ${operationInProgress.arrival_location}`;
                } else if (operationInProgress.status === 'arrivee_site_chargement') {
                    currentLocation = `Sur site de chargement: ${operationInProgress.departure_location}`;
                } else if (operationInProgress.status === 'chargement_termine') {
                    currentLocation = `En route vers: ${operationInProgress.arrival_location}`;
                } else if (operationInProgress.status === 'arrivee_site_destination') {
                    currentLocation = `Sur site de destination: ${operationInProgress.arrival_location}`;
                }
            }
        }
        
        // Check if currently assigned to this mission
        const isCurrentlyAssigned = currentlyAssignedTruckIds.has(truck.id);
        
        // Check if selected for modification
        const isSelected = this.modificationState.selectedTrucks.has(truck.id);
        
        // Get maintenance status
        const maintenanceStatus = this.getTruckMaintenanceStatus(truck);
        
        // Determine availability and if button should be disabled
        let availability = 'available';
        let generalStatus = 'Disponible';
        let buttonDisabled = false;
        let buttonText = '✅ Sélectionner pour cette mission';
        
        if (isSelected) {
            availability = 'selected';
            generalStatus = 'Sélectionné pour remplacement';
            buttonText = '✅ Sélectionné - Cliquer pour retirer';
        } else if (isCurrentlyAssigned) {
            availability = 'current';
            generalStatus = 'Actuellement assigné à cette mission';
            buttonText = '🔄 Remplacer ce camion';
        } else if (maintenanceStatus.inMaintenance) {
            availability = 'maintenance';
            generalStatus = maintenanceStatus.statusText;
            buttonText = '⚠️ Sélectionner (en maintenance)';
        } else if (truckOperations.length > 0) {
            availability = 'busy';
            generalStatus = 'En opération';
            buttonText = '⚠️ Sélectionner (occupé)';
        } else if (truck.status === 'busy') {
            availability = 'busy';
            generalStatus = 'Occupé';
            buttonText = '⚠️ Sélectionner (occupé)';
        }
        
        // CRITICAL: Disable button if at limit and truck not selected
        if (isAtLimit && !isSelected) {
            buttonDisabled = true;
            buttonText = `❌ LIMITE ATTEINTE (${currentSelected}/${maxAllowed})`;
        }
        
        return `
            <div class="enhanced-truck-card ${availability}" data-truck-id="${truck.id}">
                <div class="enhanced-truck-header">
                    <div class="truck-main-info">
                        <h5>${truck.brand} ${truck.model}</h5>
                        <div class="truck-registration">${truck.registration}</div>
                    </div>
                    <div class="truck-general-status status-${generalStatus.toLowerCase().replace(/\s+/g, '-')}">
                        ${generalStatus}
                    </div>
                </div>
                
                <!-- TRUCK LIMIT STATUS BAR -->
                ${isAtLimit && !isSelected ? `
                    <div class="truck-limit-banner" style="background: #dc3545; color: white; padding: 8px; text-align: center; margin: 10px 0; border-radius: 4px; font-weight: bold;">
                        ⚠️ LIMITE ATTEINTE: ${currentSelected}/${maxAllowed} camions sélectionnés
                    </div>
                ` : ''}
                
                <div class="truck-detailed-info">
                    <div class="truck-info-row">
                        <div class="truck-info-label">📍 Localisation actuelle:</div>
                        <div class="truck-info-value">${currentLocation}</div>
                    </div>
                    
                    ${driver ? `
                        <div class="truck-info-row">
                            <div class="truck-info-label">👤 Chauffeur:</div>
                            <div class="truck-info-value">${driver.name} (${driver.experience_years} ans)</div>
                        </div>
                    ` : ''}
                    
                    <div class="truck-info-row">
                        <div class="truck-info-label">⚖️ Capacité:</div>
                        <div class="truck-info-value">${truck.capacity || 25} tonnes</div>
                    </div>
                    
                    ${truck.gps_location ? `
                        <div class="truck-info-row truck-gps-row">
                            <div class="truck-info-label">🗺️ Localisation GPS:</div>
                            <div class="truck-info-value">
                                <a href="${truck.gps_location}" target="_blank" class="enhanced-gps-link">
                                    <span class="gps-link-icon">📍</span>
                                    <span class="gps-link-text">Voir sur Google Maps</span>
                                    <span class="gps-link-arrow">→</span>
                                </a>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <button class="truck-assignment-btn ${maintenanceStatus.inMaintenance ? 'maintenance-warning' : ''} ${isSelected ? 'selected' : ''} ${buttonDisabled ? 'disabled' : ''}" 
                        ${buttonDisabled ? 'disabled' : ''}
                        onclick="app.toggleModificationTruckSelection(${truck.id})">
                    ${buttonText}
                </button>
            </div>
        `;
    }).join('');
}
// NEW: Update selected trucks display with limit counter
updateSelectedModificationTrucksDisplayWithLimits() {
    const container = document.getElementById('selectedModificationTrucks');
    if (!container) return;
    
    const maxAllowed = this.modificationState.maxTrucksAllowed;
    const currentSelected = this.modificationState.selectedTrucks.size;
    
    if (currentSelected === 0) {
        container.innerHTML = `
            <div class="no-selection-message">
                <div class="selection-counter" style="background: #17a2b8; color: white; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 15px; font-weight: bold;">
                    📊 COMPTEUR: 0/${maxAllowed} camions sélectionnés
                </div>
                <p>Aucun camion sélectionné. Cliquez sur "Sélectionner" sur les camions ci-dessus.</p>
                <p style="color: #856404; font-weight: bold;">⚠️ Vous devez sélectionner exactement ${maxAllowed} camion(s) pour cette mission.</p>
            </div>
        `;
        return;
    }
    
    const selectedArray = Array.from(this.modificationState.selectedTrucks.values());
    
    // Determine counter color based on selection status
    let counterColor = '#17a2b8'; // Blue for incomplete
    if (currentSelected === maxAllowed) {
        counterColor = '#28a745'; // Green for complete
    } else if (currentSelected > maxAllowed) {
        counterColor = '#dc3545'; // Red for over limit (shouldn't happen but safety)
    }
    
    container.innerHTML = `
        <!-- SELECTION COUNTER -->
        <div class="selection-counter" style="background: ${counterColor}; color: white; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 15px; font-weight: bold; font-size: 16px;">
            📊 SÉLECTION: ${currentSelected}/${maxAllowed} camions
            ${currentSelected === maxAllowed ? ' ✅ COMPLET' : currentSelected > maxAllowed ? ' ❌ DÉPASSEMENT' : ' ⏳ INCOMPLET'}
        </div>
        
        <div class="selected-trucks-list">
            ${selectedArray.map((selection, index) => {
                const truck = selection.truck;
                const driver = selection.driver;
                
                return `
                    <div class="selected-truck-item">
                        <div class="selected-truck-header">
                            <h6>Camion ${index + 1}: ${truck.brand} ${truck.model}</h6>
                            <div class="selected-truck-registration">${truck.registration}</div>
                        </div>
                        <div class="selected-truck-details">
                            <div class="selected-detail">
                                <span class="detail-label">👤 Chauffeur:</span>
                                <span class="detail-value">${driver ? `${driver.name} (${driver.experience_years} ans)` : 'Non assigné'}</span>
                            </div>
                            <div class="selected-detail">
                                <span class="detail-label">📍 Localisation:</span>
                                <span class="detail-value">${truck.current_location}</span>
                            </div>
                            <div class="selected-detail">
                                <span class="detail-label">⚖️ Capacité:</span>
                                <span class="detail-value">${truck.capacity || 25} tonnes</span>
                            </div>
                        </div>
                        <button class="btn btn--outline btn--sm" onclick="app.toggleModificationTruckSelection(${truck.id})">
                            <i data-lucide="x"></i>
                            Retirer
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="selection-summary">
            <strong>Résumé: ${currentSelected} camion(s) sélectionné(s) sur ${maxAllowed} requis</strong>
            <div style="font-size: 14px; color: #666; margin-top: 8px;">
                ${currentSelected === maxAllowed ? 
                    '✅ Parfait! Vous avez sélectionné le bon nombre de camions.' :
                    currentSelected < maxAllowed ?
                    `⚠️ Il vous manque encore ${maxAllowed - currentSelected} camion(s).` :
                    `❌ Vous avez ${currentSelected - maxAllowed} camion(s) en trop.`
                }
            </div>
        </div>
    `;
}

// NEW: Update selected trucks display

updateSelectedModificationTrucksDisplay() {
    const container = document.getElementById('selectedModificationTrucks');
    if (!container) return;
    
    if (this.modificationState.selectedTrucks.size === 0) {
        container.innerHTML = `
            <div class="no-selection-message">
                Aucun camion sélectionné. Cliquez sur "Sélectionner" sur les camions ci-dessus.
            </div>
        `;
        return;
    }
    
    const selectedArray = Array.from(this.modificationState.selectedTrucks.values());
    
    container.innerHTML = `
        <div class="selected-trucks-list">
            ${selectedArray.map((selection, index) => {
                const truck = selection.truck;
                const driver = selection.driver;
                
                return `
                    <div class="selected-truck-item">
                        <div class="selected-truck-header">
                            <h6>Camion ${index + 1}: ${truck.brand} ${truck.model}</h6>
                            <div class="selected-truck-registration">${truck.registration}</div>
                        </div>
                        <div class="selected-truck-details">
                            <div class="selected-detail">
                                <span class="detail-label">👤 Chauffeur:</span>
                                <span class="detail-value">${driver ? `${driver.name} (${driver.experience_years} ans)` : 'Non assigné'}</span>
                            </div>
                            <div class="selected-detail">
                                <span class="detail-label">📍 Localisation:</span>
                                <span class="detail-value">${truck.current_location}</span>
                            </div>
                            <div class="selected-detail">
                                <span class="detail-label">⚖️ Capacité:</span>
                                <span class="detail-value">${truck.capacity || 25} tonnes</span>
                            </div>
                        </div>
                        <button class="btn btn--outline btn--sm" onclick="app.toggleModificationTruckSelection(${truck.id})">
                            <i data-lucide="x"></i>
                            Retirer
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="selection-summary">
            <strong>Résumé: ${selectedArray.length} camion(s) sélectionné(s)</strong>
            <div style="font-size: 14px; color: #666; margin-top: 8px;">
                Ces camions remplaceront les assignations actuelles de la mission.
            </div>
        </div>
    `;
}

displayCurrentAssignments(mission) {
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const container = document.getElementById('currentAssignments');
    
    if (!mission.assigned_trucks || mission.assigned_trucks.length === 0) {
        container.innerHTML = '<div style="color: var(--color-text-secondary);">Aucune assignation actuelle</div>';
        return;
    }
    
    container.innerHTML = mission.assigned_trucks.map((assignment, index) => {
        const truck = trucks.find(t => t.id === assignment.truck_id);
        const driver = drivers.find(d => d.id === assignment.driver_id);
        
        return `
            <div class="current-assignment-item">
                <div class="assignment-header">
                    <strong>Assignation ${index + 1}</strong>
                    <span class="assignment-date">Assigné le ${this.formatDateTime(assignment.assigned_at)}</span>
                </div>
                <div class="assignment-details">
                    <div class="assignment-detail">
                        <span class="assignment-label">Camion:</span>
                        <span class="assignment-value">${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'Camion introuvable'}</span>
                    </div>
                    <div class="assignment-detail">
                        <span class="assignment-label">Chauffeur:</span>
                        <span class="assignment-value">${driver ? `${driver.name} (${driver.phone || 'N/A'})` : 'Chauffeur introuvable'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
generateModificationForm(mission) {
    const container = document.getElementById('newTruckAssignments');
    const assignmentsHtml = [];
    
    const currentAssignments = mission.assigned_trucks || [];
    const trucksNeeded = currentAssignments.length; // Keep same number of trucks
    
    for (let i = 0; i < trucksNeeded; i++) {
        const currentAssignment = currentAssignments[i];
        
        assignmentsHtml.push(`
            <div class="form-group" style="margin-bottom: var(--space-20);">
                <h5>Nouvelle Assignation ${i + 1}</h5>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nouveau Camion *</label>
                        <select class="form-control truck-select" required data-assignment="${i}">
                            <option value="">Sélectionner un camion</option>
                            ${this.getTrucks().filter(t => t.status === 'available' || t.id === currentAssignment?.truck_id).map(truck => `
                                <option value="${truck.id}" ${currentAssignment && truck.id === currentAssignment.truck_id ? 'selected' : ''}>
                                    ${truck.brand} ${truck.model} (${truck.registration}) - ${truck.current_location}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nouveau Chauffeur *</label>
                        <select class="form-control driver-select" required data-assignment="${i}">
                            <option value="">Sélectionner un chauffeur</option>
                            ${this.getDrivers().filter(d => d.status === 'available' || d.id === currentAssignment?.driver_id).map(driver => `
                                <option value="${driver.id}" ${currentAssignment && driver.id === currentAssignment.driver_id ? 'selected' : ''}>
                                    ${driver.name} (${driver.experience_years} ans d'exp.)
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `);
    }
    
    container.innerHTML = assignmentsHtml.join('');
    
    // Add auto-selection handlers
    container.querySelectorAll('.truck-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const truckId = parseInt(e.target.value);
            const assignmentIndex = e.target.dataset.assignment;
            const driverSelect = container.querySelector(`[data-assignment="${assignmentIndex}"].driver-select`);
            
            if (truckId && driverSelect) {
                const truck = this.getTrucks().find(t => t.id === truckId);
                if (truck && truck.assigned_driver_id) {
                    driverSelect.value = truck.assigned_driver_id;
                }
            }
        });
    });
}
    
    // Form Handlers
handleMissionSubmit(e) {
    e.preventDefault();
    
    // Permission checks
    if (!this.requirePermission('missions.create', 'Création mission interdite')) return;
    if (!this.requirePermission('missions.validate', 'Validation mission interdite')) return;
    if (!this.requirePermission('missions.delete', 'Suppression mission interdite')) return;
    
    // Only planners and admins can create/edit missions
    if (!['planner', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs et administrateurs peuvent créer/modifier des missions');
        return;
    }
    
    // Get form data
    const clientId = parseInt(document.getElementById('missionClient').value);
    
    // Basic validation
    if (!clientId) {
        alert('Veuillez sélectionner un client');
        return;
    }
    
    // Get client data
    const clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        alert('Client introuvable');
        return;
    }
    
    // Collect destinations data with new departure fields
    const destinationsContainer = document.getElementById('destinationsMissionList');
    const destinationItems = destinationsContainer.querySelectorAll('.destination-mission-item');
    
    if (destinationItems.length === 0) {
        alert('Veuillez ajouter au moins une destination');
        return;
    }
    
    const destinations = [];
    let totalTrucks = 0;
    
    // Process each destination
    for (let i = 0; i < destinationItems.length; i++) {
        const item = destinationItems[i];
        
        // NEW: Get departure data for each destination
        const departureWilaya = item.querySelector('.mission-destination-departure-wilaya')?.value;
        const departureGps = item.querySelector('.mission-destination-departure-gps')?.value?.trim() || '';
        const departureDate = item.querySelector('.mission-destination-departure-date')?.value;
        const departureTime = item.querySelector('.mission-destination-departure-time')?.value;
        
        // Get existing destination data
        const destinationNameSelect = item.querySelector('.mission-destination-name');
        const destinationWilaya = item.querySelector('.mission-destination-wilaya')?.value;
        const destinationGps = item.querySelector('.mission-destination-gps')?.value?.trim() || '';
        const arrivalDate = item.querySelector('.mission-destination-arrival-date')?.value;
        const arrivalTime = item.querySelector('.mission-destination-arrival-time')?.value;
        const trucksNeeded = parseInt(item.querySelector('.mission-destination-trucks')?.value);
        const productType = item.querySelector('.mission-destination-product-type')?.value;
        const missionType = item.querySelector('.mission-destination-mission-type')?.value;
        const comments = item.querySelector('.mission-destination-comments')?.value?.trim() || '';
        
        // NEW: Validation for departure fields
        if (!departureWilaya) {
            alert(`Destination ${i + 1}: Veuillez sélectionner la wilaya de départ`);
            return;
        }
        
        if (!departureDate || !departureTime) {
            alert(`Destination ${i + 1}: Veuillez spécifier la date et l'heure de départ`);
            return;
        }
        
        // Validation for existing destination fields
        if (!destinationNameSelect?.value) {
            alert(`Destination ${i + 1}: Veuillez sélectionner une destination`);
            return;
        }
        
        if (!destinationWilaya) {
            alert(`Destination ${i + 1}: Veuillez sélectionner la wilaya d'arrivée`);
            return;
        }
        
        if (!arrivalDate || !arrivalTime) {
            alert(`Destination ${i + 1}: Veuillez spécifier la date et l'heure d'arrivée`);
            return;
        }
        
        if (!trucksNeeded || trucksNeeded < 1 || trucksNeeded > 50) {
            alert(`Destination ${i + 1}: Le nombre de camions doit être entre 1 et 10`);
            return;
        }
        
        if (!productType) {
            alert(`Destination ${i + 1}: Veuillez spécifier le type de produit`);
            return;
        }
        
        if (!missionType) {
            alert(`Destination ${i + 1}: Veuillez spécifier le type de mission`);
            return;
        }
        
        // Get destination details from client data
        const destinationIndex = parseInt(destinationNameSelect.value);
        const destinationData = client.destinations[destinationIndex];
        
        if (!destinationData) {
            alert(`Destination ${i + 1}: Données de destination introuvables`);
            return;
        }
        
        // NEW: Date validation for departure
        const departureDateTime = new Date(`${departureDate}T${departureTime}`);
        const arrivalDateTime = new Date(`${arrivalDate}T${arrivalTime}`);
        const now = new Date();
        
        if (departureDateTime <= now) {
            alert(`Destination ${i + 1}: La date et l'heure de départ doivent être dans le futur`);
            return;
        }
        
        if (arrivalDateTime <= now) {
            alert(`Destination ${i + 1}: La date et l'heure d'arrivée doivent être dans le futur`);
            return;
        }
        
        // NEW: Validate that arrival is after departure for each destination
        if (arrivalDateTime <= departureDateTime) {
            alert(`Destination ${i + 1}: La date d'arrivée doit être postérieure à la date de départ`);
            return;
        }
        
        // NEW: GPS validation for departure
        if (departureGps && !this.isValidURL(departureGps)) {
            alert(`Destination ${i + 1}: L'URL GPS de départ n'est pas valide`);
            return;
        }
        
        // GPS validation for destination
        if (destinationGps && !this.isValidURL(destinationGps)) {
            alert(`Destination ${i + 1}: L'URL GPS de destination n'est pas valide`);
            return;
        }
        
        destinations.push({
            // NEW: Departure information per destination
            departure_wilaya: departureWilaya,
            departure_gps: departureGps,
            departure_date: departureDate,
            departure_time: departureTime,
            
            // Existing destination information
            name: destinationData.name,
            wilaya: destinationWilaya,
            gps_location: destinationGps || destinationData.gps_location || '',
            contact_person: destinationData.contact_person || '',
            arrival_date: arrivalDate,
            arrival_time: arrivalTime,
            trucks_requested: trucksNeeded,
            product_type: productType,
            mission_type: missionType,
            comments: comments
        });
        
        totalTrucks += trucksNeeded;
    }
    

    
    // Collect common form data (keeping for backward compatibility)
    const formData = {
        client_id: clientId,
        client_name: client.name,
        // Use the first destination's departure as the main departure (for compatibility)
        departure_wilaya: destinations[0].departure_wilaya,
        departure_gps: destinations[0].departure_gps,
        scheduled_date: destinations[0].departure_date,
        scheduled_time: destinations[0].departure_time,
        comments: document.getElementById('missionComments')?.value?.trim() || '',
        destinations: destinations,
        trucks_requested: totalTrucks
    };
    
    try {
        // Create or update missions
        if (this.currentEditingMissionId) {
            // Handle mission editing
            this.updateMultiDestinationMission(this.currentEditingMissionId, formData);
        } else {
            // Create new multi-destination mission
            this.createMultiDestinationMission(formData);
        }
        
        // Reset editing state
        this.currentEditingMissionId = null;
        
        // Close modal and refresh
        this.closeModal('missionModal');
        this.loadSectionData(this.currentSection);
        this.loadDashboard(); // Refresh dashboard stats
        
    } catch (error) {
        console.error('Error handling mission submit:', error);
        alert('Une erreur s\'est produite lors de la sauvegarde de la mission');
    }
}


updateMultiDestinationMission(missionId, formData) {
    const missions = this.getMissions();
    const missionIndex = missions.findIndex(m => m.id === missionId);
    
    if (missionIndex === -1) {
        alert('Mission introuvable');
        return;
    }
    
    const oldMission = missions[missionIndex];
    const primaryDestination = formData.destinations[0];
    
    // Update the mission with new data INCLUDING departure info
    missions[missionIndex] = {
        ...oldMission,
        client_id: formData.client_id,
        client_name: formData.client_name,
        // Use first destination's departure as main departure for backward compatibility
        departure_wilaya: primaryDestination.departure_wilaya,
        departure_gps: primaryDestination.departure_gps,
        scheduled_date: primaryDestination.departure_date,
        scheduled_time: primaryDestination.departure_time,
        // Rest of the destination data
        destination_name: primaryDestination.name,
        arrival_wilaya: primaryDestination.wilaya,
        arrival_gps: primaryDestination.gps_location,
        arrival_date: primaryDestination.arrival_date,
        arrival_time: primaryDestination.arrival_time,
        trucks_requested: formData.trucks_requested,
        product_type: primaryDestination.product_type,
        mission_type: primaryDestination.mission_type,
        comments: formData.comments,
        // CRITICAL: Save the full destinations array with departure info
        destinations: formData.destinations,
        is_multi_destination: formData.destinations.length > 1,
        updated_by: this.currentUser.name,
        updated_at: new Date().toISOString()
    };
    
    // Add update to timeline
    missions[missionIndex].progress_timeline.push({
        status: 'modifiée',
        timestamp: new Date().toISOString(),
        user: this.currentUser.name,
        changes: this.getMissionChanges(oldMission, missions[missionIndex])
    });
    
    this.saveMissions(missions);
    
    // Add activity and notifications...
    this.addActivity(`Mission modifiée: ${formData.client_name} → ${primaryDestination.name}${formData.destinations.length > 1 ? ' (+' + (formData.destinations.length - 1) + ' autres)' : ''}`, 'edit');
    
    this.sendNotification('dispatcher', 'mission_modified', 
        `Mission modifiée: ${formData.client_name} → ${primaryDestination.name}`, {
            mission_id: missionId,
            modifier: this.currentUser.name
        });
    
    alert('Mission modifiée avec succès!');
}

// Enhanced createMultiDestinationMission method
createMultiDestinationMission(formData) {
    const missions = this.getMissions();
    const newMissionId = missions.length > 0 ? Math.max(...missions.map(m => m.id)) + 1 : 1;
    
    // Use the first destination as the primary destination for compatibility
    const primaryDestination = formData.destinations[0];
    
    const mission = {
        id: newMissionId,
        status: "demandée",
        created_by: this.currentUser.name,
        created_at: new Date().toISOString(),
        client_id: formData.client_id,
        client_name: formData.client_name,
        departure_wilaya: formData.departure_wilaya,
        departure_gps: formData.departure_gps,
        destination_name: primaryDestination.name,
        arrival_wilaya: primaryDestination.wilaya,
        arrival_gps: primaryDestination.gps_location,
        trucks_requested: formData.trucks_requested,
        product_type: primaryDestination.product_type,
        mission_type: primaryDestination.mission_type,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        arrival_date: primaryDestination.arrival_date,
        arrival_time: primaryDestination.arrival_time,
        assigned_trucks: [],
        progress_timeline: [
            {status: "demandée", timestamp: new Date().toISOString(), user: this.currentUser.name}
        ],
        comments: formData.comments,
        destinations: formData.destinations, // Store all destinations
        is_multi_destination: formData.destinations.length > 1,
        total_destinations: formData.destinations.length
    };
    
    missions.push(mission);
    this.saveMissions(missions);
    
    // Add activity
    this.addActivity(`Mission créée: ${mission.client_name} → ${mission.destination_name}${mission.is_multi_destination ? ' (+' + (formData.destinations.length - 1) + ' autres destinations)' : ''}`, 'truck');
    
    // Send notification to dispatcher
    this.sendNotification('dispatcher', 'new_mission', 
        `Nouvelle mission${mission.is_multi_destination ? ' multi-destinations' : ''} créée: ${mission.client_name} → ${mission.destination_name}`, {
            mission_id: mission.id,
            creator: this.currentUser.name,
            destinations_count: formData.destinations.length,
            total_trucks: formData.trucks_requested
        });
    
    alert(`Mission${mission.is_multi_destination ? ' multi-destinations' : ''} créée avec succès!`);
}

// Helper method for URL validation (if not already present)
isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

createMultiDestinationMission(formData) {
    const missions = this.getMissions();
    const newMissionId = missions.length > 0 ? Math.max(...missions.map(m => m.id)) + 1 : 1;
    
    // For now, we'll create one mission with the first destination
    // You can modify this logic based on your business requirements
    const primaryDestination = formData.destinations[0];
    
    const mission = {
        id: newMissionId,
        status: "demandée",
        created_by: this.currentUser.name,
        created_at: new Date().toISOString(),
        client_id: formData.client_id,
        client_name: formData.client_name,
        departure_wilaya: formData.departure_wilaya,
        departure_gps: formData.departure_gps,
        destination_name: primaryDestination.name,
        arrival_wilaya: primaryDestination.wilaya,
        arrival_gps: primaryDestination.gps_location,
        trucks_requested: formData.trucks_requested,
        product_type: primaryDestination.product_type,
        mission_type: primaryDestination.mission_type,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        arrival_date: primaryDestination.arrival_date,
        arrival_time: primaryDestination.arrival_time,
        assigned_trucks: [],
        progress_timeline: [
            {status: "demandée", timestamp: new Date().toISOString(), user: this.currentUser.name}
        ],
        comments: formData.comments,
        destinations: formData.destinations, // Store all destinations
        is_multi_destination: formData.destinations.length > 1
    };
    
    missions.push(mission);
    this.saveMissions(missions);
    
    // Add activity
    this.addActivity(`Mission créée: ${mission.client_name} → ${mission.destination_name}${mission.is_multi_destination ? ' (+' + (formData.destinations.length - 1) + ' autres)' : ''}`, 'truck');
    
    // Send notification to dispatcher
    this.sendNotification('dispatcher', 'new_mission', 
        `Nouvelle mission créée: ${mission.client_name} → ${mission.destination_name}`, {
            mission_id: mission.id,
            creator: this.currentUser.name
        });
    
    alert('Mission créée avec succès!');
}
// NEW: Update existing mission
updateExistingMission(missionId, formData) {
    const missions = this.getMissions();
    const missionIndex = missions.findIndex(m => m.id === missionId);
    
    if (missionIndex === -1) {
        alert('Mission introuvable');
        return;
    }
    
    const existingMission = missions[missionIndex];
    const primaryDestination = formData.destinations[0];
    
    // Update the mission with new data
    const updatedMission = {
        ...existingMission,
        client_id: formData.client_id,
        client_name: formData.client_name,
        departure_wilaya: formData.departure_wilaya,
        departure_gps: formData.departure_gps,
        destination_name: primaryDestination.name,
        arrival_wilaya: primaryDestination.wilaya,
        arrival_gps: primaryDestination.gps_location,
        trucks_requested: formData.trucks_requested,
        product_type: primaryDestination.product_type,
        mission_type: primaryDestination.mission_type,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        arrival_date: primaryDestination.arrival_date,
        arrival_time: primaryDestination.arrival_time,
        comments: formData.comments,
        destinations: formData.destinations,
        is_multi_destination: formData.destinations.length > 1,
        last_modified_at: new Date().toISOString(),
        last_modified_by: this.currentUser.name
    };
    
    missions[missionIndex] = updatedMission;
    this.saveMissions(missions);
    
    // Add activity
    this.addActivity(`Mission modifiée: ${updatedMission.client_name} → ${updatedMission.destination_name}`, 'edit');
    
    alert('Mission modifiée avec succès!');
}

// FIXED: Clear all slot assignments
clearAllSlotAssignments() {
    const totalSlots = this.currentMissionForAssignment ? this.currentMissionForAssignment.trucks_requested : 0;
    
    for (let i = 0; i < totalSlots; i++) {
        this.clearSlotAssignment(i);
    }
}

// FIXED: Auto-assign best recommendations
autoAssignBestRecommendations() {
    if (!this.currentMissionForAssignment) return;
    
    const trucksNeeded = this.currentMissionForAssignment.trucks_requested;
    const trucks = this.getTrucks().filter(t => t.status === 'available');
    const drivers = this.getDrivers();
    
    // Get best available trucks
    const bestTrucks = trucks.slice(0, trucksNeeded);
    
    bestTrucks.forEach((truck, index) => {
        if (index < trucksNeeded) {
            const driver = drivers.find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
            this.assignToSpecificSlot(index, truck.id, driver ? driver.id : '');
        }
    });
}

// FIXED: Update all button states
updateAllButtonStates() {
    // Reset all buttons first
    document.querySelectorAll('.assign-to-slot-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('btn-assigned');
        const slotNum = parseInt(btn.dataset.slot) + 1;
        btn.textContent = `Slot ${slotNum}`;
    });
    
    // Update based on current assignments
    const totalSlots = this.currentMissionForAssignment ? this.currentMissionForAssignment.trucks_requested : 0;
    
    for (let i = 0; i < totalSlots; i++) {
        const truckSelect = document.getElementById(`truck-select-${i}`);
        if (truckSelect && truckSelect.value) {
            this.updateTruckButtonStates(parseInt(truckSelect.value), i);
        }
    }
}

// Helper function for URL validation - add this after handleMissionSubmit
isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

    
createMission(data) {
    const missions = this.getMissions();
    
    const newMission = {
        id: this.generateId(missions),
        status: "demandée",
        created_by: this.currentUser.name,
        created_at: new Date().toISOString(),
        client_id: data.client_id,
        client_name: data.client_name,
        departure_wilaya: data.departure_wilaya,
        destination_name: data.destination_name,
        arrival_wilaya: data.arrival_wilaya,
        departure_gps: data.departure_gps,
        arrival_gps: data.arrival_gps,
        trucks_requested: data.trucks_requested,
        product_type: data.product_type,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        arrival_date: data.arrival_date,
        arrival_time: data.arrival_time,
        mission_type: data.mission_type,
        assigned_trucks: [],
        progress_timeline: [
            {status: "demandée", timestamp: new Date().toISOString(), user: this.currentUser.name}
        ],
        comments: data.comments
    };
    
    missions.push(newMission);
    this.saveMissions(missions);
    // Add this line after this.saveMissions(missions);
this.addEventToHistory('mission', `Mission créée: ${data.client_name} → ${data.destination_name}`, `Mission ${newMission.id}`);

    // Send notification to dispatcher
    this.sendNotification('dispatcher', 'mission_request', 
        `Nouvelle demande de mission: ${data.client_name} → ${data.destination_name}`, {
            mission_id: newMission.id,
            client: data.client_name,
            destination: data.destination_name,
            trucks_requested: data.trucks_requested
        });
    
    this.addActivity(`Mission demandée: ${data.client_name} → ${data.destination_name}`, 'truck');
    this.loadSectionData(this.currentSection);
    alert('Demande de mission envoyée avec succès!');
}
    
    // Smart Assignment System
// NEW SMART ASSIGNMENT SYSTEM - COMPLETE REWRITE
// =====================================================

// Initialize Smart Assignment Engine
initializeSmartAssignmentEngine() {
    // Truck status tracking
    this.truckStatusTracker = {
        available: new Set(),
        assigned: new Map(), // missionId -> truck details
        onOperation: new Map(), // operationId -> truck details
        maintenance: new Set(),
        conflict: new Map() // truckId -> conflict details
    };
    
    // Assignment recommendation cache
    this.assignmentCache = new Map();
    
    // Load current truck statuses
    this.refreshTruckStatuses();
    
    console.log('Smart Assignment Engine initialized');
}

// Refresh all truck statuses from current data
refreshTruckStatuses() {
    const trucks = this.getTrucks();
    const operations = this.getOperations();
    const missions = this.getMissions();
    
    // Clear all status trackers
    this.truckStatusTracker.available.clear();
    this.truckStatusTracker.assigned.clear();
    this.truckStatusTracker.onOperation.clear();
    
    trucks.forEach(truck => {
        // Check if truck is on active operation
        const activeOperation = operations.find(op => 
            op.assigned_truck_id === truck.id && 
            ['demarree', 'arrivee'].includes(op.status)
        );
        
        if (activeOperation) {
            this.truckStatusTracker.onOperation.set(truck.id, {
                operationId: activeOperation.id,
                missionId: activeOperation.mission_id,
                status: activeOperation.status,
                destination: activeOperation.arrival_location,
                estimatedCompletion: this.calculateEstimatedCompletion(activeOperation)
            });
        } else {
            // Check if truck is assigned to a pending mission
            const assignedMission = missions.find(m => 
                m.status === 'validée' && 
                m.assigned_trucks && 
                m.assigned_trucks.some(t => t.truck_id === truck.id)
            );
            
            if (assignedMission) {
                this.truckStatusTracker.assigned.set(truck.id, {
                    missionId: assignedMission.id,
                    missionName: `${assignedMission.client_name} → ${assignedMission.destination_name}`,
                    departureTime: `${assignedMission.scheduled_date} ${assignedMission.scheduled_time}`,
                    location: assignedMission.departure_wilaya,
                    destination: assignedMission.arrival_wilaya
                });
            } else {
                // Truck is available
                this.truckStatusTracker.available.add(truck.id);
            }
        }
    });
    
    console.log('Truck statuses refreshed:', this.truckStatusTracker);
}

// Calculate estimated completion time for an operation
calculateEstimatedCompletion(operation) {
    if (operation.status === 'terminee') {
        return operation.real_arrival_time || new Date().toISOString();
    }
    
    if (operation.real_departure_time && operation.estimated_arrival) {
        return operation.estimated_arrival;
    }
    
    // Estimate based on current time + travel time
    const now = new Date();
    const estimatedTravelHours = this.estimateTravelTime(
        operation.departure_location, 
        operation.arrival_location
    );
    
    now.setHours(now.getHours() + estimatedTravelHours);
    return now.toISOString();
}

// Estimate travel time between two locations (simplified)
// IMPROVED: More realistic distance calculation for Algeria
estimateTravelTime(fromWilaya, toWilaya) {
    // Comprehensive distance matrix for Algerian wilayas (in hours)
    const distanceMatrix = {
        // Major routes and distances based on real road networks
        '16-Alger': {
            '31-Oran': 6,
            '25-Constantine': 5,
            '06-Béjaïa': 3,
            '09-Blida': 1,
            '35-Boumerdès': 1,
            '42-Tipaza': 1,
            '10-Bouira': 2,
            '26-Médéa': 2,
            '44-Aïn Defla': 2,
            '15-Tizi Ouzou': 2
        },
        '31-Oran': {
            '16-Alger': 6,
            '22-Sidi Bel Abbès': 1.5,
            '46-Aïn Témouchent': 1,
            '13-Tlemcen': 2,
            '27-Mostaganem': 1.5,
            '29-Mascara': 2,
            '20-Saïda': 3,
            '48-Relizane': 2
        },
        '25-Constantine': {
            '16-Alger': 5,
            '23-Annaba': 2,
            '24-Guelma': 1.5,
            '41-Souk Ahras': 2,
            '43-Mila': 1,
            '19-Sétif': 2,
            '18-Jijel': 2.5,
            '21-Skikda': 1.5,
            '40-Khenchela': 3,
            '12-Tébessa': 3
        },
        // Add more major routes...
    };
    
    // Direct lookup if available
    if (distanceMatrix[fromWilaya] && distanceMatrix[fromWilaya][toWilaya]) {
        return distanceMatrix[fromWilaya][toWilaya];
    }
    
    // Reverse lookup
    if (distanceMatrix[toWilaya] && distanceMatrix[toWilaya][fromWilaya]) {
        return distanceMatrix[toWilaya][fromWilaya];
    }
    
    // Fallback to regional estimation
    return this.estimateDistanceByRegion(fromWilaya, toWilaya);
}

// Fallback regional distance estimation
estimateDistanceByRegion(fromWilaya, toWilaya) {
    // Regional clusters
    const regions = {
        'north': ['16-Alger', '09-Blida', '35-Boumerdès', '42-Tipaza', '10-Bouira', '15-Tizi Ouzou', '06-Béjaïa'],
        'west': ['31-Oran', '22-Sidi Bel Abbès', '46-Aïn Témouchent', '13-Tlemcen', '27-Mostaganem', '29-Mascara'],
        'east': ['25-Constantine', '23-Annaba', '24-Guelma', '41-Souk Ahras', '21-Skikda', '18-Jijel'],
        'central': ['26-Médéa', '44-Aïn Defla', '19-Sétif', '43-Mila', '34-Bordj Bou Arréridj'],
        'south': ['30-Ouargla', '47-Ghardaïa', '01-Adrar', '11-Tamanrasset', '33-Illizi']
    };
    
    const fromRegion = this.getWilayaRegion(fromWilaya, regions);
    const toRegion = this.getWilayaRegion(toWilaya, regions);
    
    if (fromWilaya === toWilaya) return 0.5; // Same wilaya
    if (fromRegion === toRegion) return 2; // Same region
    
    // Cross-regional distances
    const regionalDistances = {
        'north-west': 4,
        'north-east': 4,
        'north-central': 3,
        'north-south': 8,
        'west-east': 8,
        'west-central': 5,
        'west-south': 10,
        'east-central': 3,
        'east-south': 6,
        'central-south': 5
    };
    
    const regionKey = [fromRegion, toRegion].sort().join('-');
    return regionalDistances[regionKey] || 6; // Default fallback
}

// Helper to get wilaya region
getWilayaRegion(wilaya, regions) {
    for (const [region, wilayas] of Object.entries(regions)) {
        if (wilayas.includes(wilaya)) return region;
    }
    return 'unknown';
}

// NEW ASSIGNMENT MODAL SYSTEM
openSmartAssignmentModal(missionId) {
	// At start of openSmartAssignmentModal(missionId)

    if (!['planner', 'dispatcher', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs, répartiteurs et administrateurs peuvent assigner des missions');
        return;
    }

    
    const mission = this.getMissions().find(m => m.id === missionId);
    if (!mission) {
        alert('Mission introuvable');
        return;
    }
    
    if (mission.status !== 'demandée') {
        alert('Seules les missions en statut "demandée" peuvent être assignées');
        return;
    }
    
    this.currentMissionForAssignment = mission;
    
    // Refresh truck statuses before showing recommendations
    this.refreshTruckStatuses();
    
    // Populate mission details
    document.getElementById('missionDetailsAssignment').innerHTML = this.generateMissionDetailsHTML(mission);
    
    // Generate smart recommendations
    this.generateAdvancedRecommendations(mission);
    
    // Show assignment modal
    this.openModal('assignmentModal');
}

// Generate mission details HTML
// Generate mission details HTML
generateMissionDetailsHTML(mission) {
    const urgencyLevel = this.calculateUrgencyLevel(mission);
    const timeToDepart = this.calculateTimeToDepart(mission);
    
    return `
        <div class="mission-summary-card">
            <div class="mission-header">
                <h4>Mission MSN${String(mission.id).padStart(3, '0')}</h4>
                <div class="urgency-badge ${urgencyLevel.class}">${urgencyLevel.text}</div>
            </div>
            <div class="mission-details-grid">
                <div class="detail-item">
                    <span class="detail-label">Client:</span>
                    <span class="detail-value">${mission.client_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Route:</span>
                    <span class="detail-value">${mission.departure_wilaya} → ${mission.arrival_wilaya}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Destination:</span>
                    <span class="detail-value">${mission.destination_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Camions requis:</span>
                    <span class="detail-value">${mission.trucks_requested}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Départ prévu:</span>
                    <span class="detail-value">${this.formatDate(mission.scheduled_date)} ${mission.scheduled_time}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Arrivage prévu:</span>
                    <span class="detail-value">${mission.arrival_date && mission.arrival_time ? 
                        `${this.formatDate(mission.arrival_date)} ${mission.arrival_time}` : 
                        'Non spécifié'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Temps restant:</span>
                    <span class="detail-value ${timeToDepart.class}">${timeToDepart.text}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Type produit:</span>
                    <span class="detail-value">${mission.product_type || 'Non spécifié'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Type mission:</span>
                    <span class="detail-value">${mission.mission_type || 'Aller'}</span>
                </div>
            </div>
            ${mission.comments ? `
                <div class="mission-comments">
                    <strong>Commentaires:</strong> ${mission.comments}
                </div>
            ` : ''}
        </div>
    `;
}

// Calculate urgency level based on departure time
calculateUrgencyLevel(mission) {
    const now = new Date();
    const departure = new Date(`${mission.scheduled_date}T${mission.scheduled_time}`);
    const hoursUntil = (departure - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) {
        return { class: 'urgency-overdue', text: 'EN RETARD' };
    } else if (hoursUntil < 2) {
        return { class: 'urgency-critical', text: 'CRITIQUE' };
    } else if (hoursUntil < 12) {
        return { class: 'urgency-high', text: 'URGENT' };
    } else if (hoursUntil < 24) {
        return { class: 'urgency-medium', text: 'PRIORITAIRE' };
    } else {
        return { class: 'urgency-normal', text: 'NORMAL' };
    }
}

// Calculate time to departure
calculateTimeToDepart(mission) {
    const now = new Date();
    const departure = new Date(`${mission.scheduled_date}T${mission.scheduled_time}`);
    const msUntil = departure - now;
    
    if (msUntil < 0) {
        const hoursOverdue = Math.abs(msUntil) / (1000 * 60 * 60);
        return { 
            class: 'time-overdue', 
            text: `En retard de ${Math.round(hoursOverdue)}h` 
        };
    }
    
    const hoursUntil = msUntil / (1000 * 60 * 60);
    const daysUntil = Math.floor(hoursUntil / 24);
    const remainingHours = Math.floor(hoursUntil % 24);
    
    if (daysUntil > 0) {
        return { 
            class: 'time-normal', 
            text: `${daysUntil}j ${remainingHours}h` 
        };
    } else {
        return { 
            class: hoursUntil < 12 ? 'time-urgent' : 'time-normal', 
            text: `${remainingHours}h ${Math.floor((hoursUntil % 1) * 60)}min` 
        };
    }
}

// Generate advanced truck recommendations
// FIXED: Generate advanced truck recommendations
// FIXED: Complete Smart Assignment Modal Setup
openSmartAssignmentModal(missionId) {
	// At start of openSmartAssignmentModal(missionId)

    if (!['planner', 'dispatcher', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs, répartiteurs et administrateurs peuvent assigner des missions');
        return;
    }

    
    const mission = this.getMissions().find(m => m.id === missionId);
    if (!mission) {
        alert('Mission introuvable');
        return;
    }
    
    if (mission.status !== 'demandée') {
        alert('Seules les missions en statut "demandée" peuvent être assignées');
        return;
    }
    
    this.currentMissionForAssignment = mission;
    
    // Refresh truck statuses before showing recommendations
    this.refreshTruckStatuses();
    
    // Populate mission details
    document.getElementById('missionDetailsAssignment').innerHTML = this.generateMissionDetailsHTML(mission);
    
    // CRITICAL FIX: Generate both recommendations AND assignment slots
    this.generateAdvancedRecommendations(mission);
    this.generateAssignmentSlots(mission); // This was missing!
    
    // Show assignment modal
    this.openModal('assignmentModal');
}

// FIXED: Generate Assignment Slots Function
// FIXED: Generate Assignment Slots Function
// FIXED: Generate Assignment Slots with ALL trucks available
// ENHANCED: Generate Assignment Slots with Multi-Destination Support
generateAssignmentSlots(mission) {
    const container = document.getElementById('truckAssignments');
    if (!container) {
        console.error('truckAssignments container not found!');
        return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Check if mission has multiple destinations
    const destinations = mission.destinations || [mission];
    const totalTrucksNeeded = mission.trucks_requested;
    
    let slotsHtml = `
        <div class="assignment-overview">
            <h4>📋 Plan d'Assignation Multi-Destinations</h4>
            <div class="mission-summary">
                <div class="summary-item">
                    <span>Total Destinations: ${destinations.length}</span>
                </div>
                <div class="summary-item">
                    <span>Total Camions Requis: ${totalTrucksNeeded}</span>
                </div>
            </div>
        </div>
        
        <div class="destinations-breakdown">
            ${destinations.map((dest, destIndex) => `
                <div class="destination-group">
                    <h5>📍 Destination ${destIndex + 1}: ${dest.name || dest.destination_name}</h5>
                    <div class="dest-details">
                        <span>Wilaya: ${dest.wilaya || dest.arrival_wilaya}</span>
                        <span>Camions: ${dest.trucks_requested || 1}</span>
                        <span>Arrivée: ${dest.arrival_date} ${dest.arrival_time}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    const allTrucks = this.getTrucks();
    const allDrivers = this.getDrivers();
    
    for (let i = 0; i < totalTrucksNeeded; i++) {
        slotsHtml += `
            <div class="assignment-slot enhanced" id="assignment-slot-${i}" data-slot="${i}">
                <div class="slot-header">
                    <h5>🚛 Assignation Camion ${i + 1}</h5>
                    <div class="slot-status" id="slot-status-${i}">
                        <span class="slot-empty">⚪ Non assigné</span>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Camion *</label>
                        <select class="form-control truck-select" required data-assignment="${i}" id="truck-select-${i}">
                            <option value="">Sélectionner un camion</option>
                            ${allTrucks.map(truck => {
                                const statusInfo = this.getTruckStatusInfo(truck);
                                return `<option value="${truck.id}">
                                    ${truck.brand} ${truck.model} (${truck.registration}) - ${truck.current_location}
                                    ${statusInfo.suffix}
                                </option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Chauffeur *</label>
                        <select class="form-control driver-select" required data-assignment="${i}" id="driver-select-${i}">
                            <option value="">Sélectionner un chauffeur</option>
                            ${allDrivers.map(driver => {
                                const statusInfo = this.getDriverStatusInfo(driver);
                                return `<option value="${driver.id}">
                                    ${driver.name} (${driver.experience_years} ans d'exp.)
                                    ${statusInfo.suffix}
                                </option>`;
                            }).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="assignment-roadmap" id="assignment-roadmap-${i}">
                    <div class="roadmap-placeholder">
                        <i data-lucide="route"></i>
                        <span>Sélectionnez un camion pour voir sa feuille de route</span>
                    </div>
                </div>
                
                <div class="assignment-feedback enhanced" id="feedback-${i}">
                    <!-- Live feedback will be shown here -->
                </div>
            </div>
        `;
    }
    
    // Set innerHTML and ensure visibility
    container.innerHTML = slotsHtml;
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    // Add enhanced event listeners
    this.addEnhancedAssignmentEventListeners();
    
    console.log(`Generated ${totalTrucksNeeded} enhanced assignment slots for ${destinations.length} destinations`);
}

// NEW: Get truck status info for display
getTruckStatusInfo(truck) {
    if (truck.status === 'available') {
        return { disabled: false, suffix: ' ✅' };
    } else if (truck.status === 'busy') {
        return { disabled: false, suffix: ' ⚠️ Occupé (Recommandation)' };
    } else {
        return { disabled: false, suffix: ' ⚠️ Non disponible' };
    }
}

// NEW: Get driver status info for display  
getDriverStatusInfo(driver) {
    if (driver.status === 'available') {
        return { disabled: false, suffix: ' ✅' };
    } else if (driver.status === 'busy') {
        return { disabled: false, suffix: ' ⚠️ Occupé (Recommandation)' };
    } else {
        return { disabled: false, suffix: ' ⚠️ Non disponible' };
    }
}


// FIXED: Assign to specific slot function
// FIXED: Assign to specific slot with proper reset of previous assignments
// FIXED: Assign to specific slot with proper reset and toggle functionality
assignToSpecificSlot(slotIndex, truckId, driverId) {
    console.log(`Assigning truck ${truckId} to slot ${slotIndex}`);
    
    // Handle null/undefined driverId
    if (driverId === 'null' || driverId === null || driverId === undefined) {
        driverId = '';
    }
    
    const truckSelect = document.getElementById(`truck-select-${slotIndex}`);
    const driverSelect = document.getElementById(`driver-select-${slotIndex}`);
    const slotStatus = document.getElementById(`slot-status-${slotIndex}`);
    
    if (!truckSelect || !driverSelect) {
        console.error(`Could not find select elements for slot ${slotIndex}`);
        return;
    }
    
    // Get the previously assigned truck ID to reset its buttons
    const previousTruckId = truckSelect.value;
    
    // If there was a previous truck assigned, reset its buttons
    if (previousTruckId && previousTruckId !== truckId.toString()) {
        this.resetTruckButtons(previousTruckId);
    }
    
    // Check if clicking the same truck that's already assigned (toggle functionality)
    if (previousTruckId === truckId.toString()) {
        this.clearSlotAssignment(slotIndex);
        return;
    }
    
    // Assign new truck
    truckSelect.value = truckId;
    
    // FIXED: Auto-assign driver if truck has one
    const truck = this.getTrucks().find(t => t.id === truckId);
    if (truck && (truck.permanent_driver_id || truck.assigned_driver_id)) {
        const autoDriverId = truck.permanent_driver_id || truck.assigned_driver_id;
        driverSelect.value = autoDriverId;
        driverId = autoDriverId;
    } else if (driverId) {
        driverSelect.value = driverId;
    } else {
        driverSelect.value = '';
    }
    
    // Trigger change events
    truckSelect.dispatchEvent(new Event('change'));
    driverSelect.dispatchEvent(new Event('change'));
    
    // Update slot status display
    this.updateSlotStatusDisplay(slotIndex, truckId, driverId);
    
    // Update button states for the newly assigned truck
    this.updateTruckButtonStates(truckId, slotIndex);
    
    // Show assignment feedback
    this.showAssignmentFeedback(slotIndex, truckId);
    
    console.log(`Successfully assigned truck ${truckId} to slot ${slotIndex}`);
}

// Analyze truck availability and suitability

// Display smart recommendations in the UI
displaySmartRecommendations(grouped, mission) {
    const container = document.getElementById('smartRecommendations');
    let html = '';
    
    // Excellent recommendations
    if (grouped.excellent.length > 0) {
        html += this.generateRecommendationSection('Recommandations Excellentes', grouped.excellent, 'excellent');
    }
    
    // Good recommendations
    if (grouped.good.length > 0) {
        html += this.generateRecommendationSection('Bonnes Options', grouped.good, 'good');
    }
    
    // Possible recommendations
    if (grouped.possible.length > 0) {
        html += this.generateRecommendationSection('Options Possibles', grouped.possible, 'possible');
    }
    
    // Risky recommendations (only show if no better options)
    if (grouped.risky.length > 0 && (grouped.excellent.length + grouped.good.length + grouped.possible.length === 0)) {
        html += this.generateRecommendationSection('Options Risquées', grouped.risky, 'risky');
    }
    
    // Unavailable (only show first 3)
    if (grouped.unavailable.length > 0) {
        html += this.generateRecommendationSection('Non Disponibles', grouped.unavailable.slice(0, 3), 'unavailable');
    }
    
    container.innerHTML = html;
    
    // Generate assignment form with best recommendations
    this.generateAdvancedAssignmentForm(mission, grouped);
}

// Generate recommendation section HTML
generateRecommendationSection(title, recommendations, category) {
    const categoryIcons = {
        excellent: '🌟',
        good: '✅',
        possible: '⚠️',
        risky: '🔶',
        unavailable: '❌'
    };
    
    return `
        <div class="recommendation-section ${category}">
            <h4 class="section-title">${categoryIcons[category]} ${title}</h4>
            <div class="recommendations-grid">
                ${recommendations.map(rec => `
                    <div class="recommendation-card ${category}" data-truck-id="${rec.truck.id}">
                        <div class="recommendation-header">
                            <div class="truck-info">
                                <strong>${rec.truck.brand} ${rec.truck.model}</strong>
                                <span class="registration">${rec.truck.registration}</span>
                            </div>
                            <div class="score-badge">${rec.analysis.score}%</div>
                        </div>
                        <div class="recommendation-details">
                            <div class="driver-info">
                                👨‍💼 ${rec.driver ? rec.driver.name : 'Aucun chauffeur'}
                            </div>
                            <div class="location-info">
                                📍 ${rec.analysis.location}
                            </div>
                            <div class="capacity-info">
                                🚛 ${rec.truck.capacity}t
                            </div>
                        </div>
                        <div class="analysis-reasons">
                            ${rec.analysis.reasons.map(reason => `<div class="reason">${reason}</div>`).join('')}
                            ${rec.analysis.warnings.map(warning => `<div class="warning">${warning}</div>`).join('')}
                            ${rec.analysis.conflicts.map(conflict => `<div class="conflict">${conflict}</div>`).join('')}
                        </div>
                        ${category !== 'unavailable' ? `
                            <div class="recommendation-actions">
                                <button class="btn btn--sm btn--outline select-truck-btn" 
                                        data-truck-id="${rec.truck.id}" 
                                        data-driver-id="${rec.driver ? rec.driver.id : ''}">
                                    Sélectionner
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Generate advanced assignment form
// FIXED: Generate assignment form with selectable slots
generateAdvancedAssignmentForm(mission, recommendations) {
    const container = document.getElementById('truckAssignments');
    const assignmentsHtml = [];
    
    for (let i = 0; i < mission.trucks_requested; i++) {
        assignmentsHtml.push(`
            <div class="assignment-slot" id="assignment-slot-${i}" data-slot="${i}">
                <div class="slot-header">
                    <h5>Assignation ${i + 1}</h5>
                    <div class="slot-status" id="slot-status-${i}">
                        <span class="slot-empty">Clic sur une recommandation pour assigner</span>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Camion *</label>
                        <select class="form-control truck-select" required data-assignment="${i}" id="truck-select-${i}">
                            <option value="">Sélectionner un camion</option>
                            ${this.getTrucks().filter(t => t.status === 'available').map(truck => `
                                <option value="${truck.id}">
                                    ${truck.brand} ${truck.model} (${truck.registration}) - ${truck.current_location}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Chauffeur *</label>
                        <select class="form-control driver-select" required data-assignment="${i}" id="driver-select-${i}">
                            <option value="">Sélectionner un chauffeur</option>
                            ${this.getDrivers().filter(d => d.status === 'available').map(driver => `
                                <option value="${driver.id}">
                                    ${driver.name} (${driver.experience_years} ans d'exp.)
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="assignment-feedback" id="feedback-${i}">
                    <!-- Feedback will be shown here -->
                </div>
            </div>
        `);
    }
    
    container.innerHTML = assignmentsHtml.join('');
    this.addAssignmentEventListeners();
}

// FIXED: Update recommendation display with slot selection
// ENHANCED: Generate advanced truck recommendations with cyclic status
generateAdvancedRecommendations(mission) {
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const operations = this.getOperations();
    
    // Calculate live truck roadmaps with cyclic status
    const truckRoadmaps = trucks.map(truck => {
        const driver = drivers.find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
        const currentOperation = operations.find(op => 
            op.assigned_truck_id === truck.id && 
            ['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
        );
        
        const roadmap = this.calculateTruckRoadmapWithCyclicStatus(truck, driver, currentOperation, mission);
        return {
            truck,
            driver,
            currentOperation,
            roadmap,
            score: roadmap.compatibilityScore
        };
    }).sort((a, b) => b.score - a.score);
    
    // Display enhanced recommendations with maintenance warnings
    const container = document.getElementById('smartRecommendations');
    if (!container) {
        console.error('smartRecommendations container not found!');
        return;
    }
    
    container.innerHTML = `
        <div class="recommendations-header">
            <h4>🚛 Feuille de Route Intelligente avec Statut Cyclique</h4>
            <p>Roadmap en temps réel avec mise à jour automatique des statuts</p>
            <div class="recommendations-actions">
                <button type="button" class="btn btn--sm btn--outline" onclick="app.clearAllSlotAssignments()">
                    <i data-lucide="x-circle"></i>
                    Tout vider
                </button>
                <button type="button" class="btn btn--sm btn--primary" onclick="app.autoAssignBestRecommendations()">
                    <i data-lucide="zap"></i>
                    Auto-assigner les meilleurs
                </button>
            </div>
        </div>
        <div class="truck-roadmaps-grid">
            ${truckRoadmaps.slice(0, 8).map(rec => `
                <div class="truck-roadmap-card ${this.getRoadmapCardClass(rec.roadmap.availability)} ${rec.truck.maintenance_status !== 'operational' ? 'maintenance-warning' : ''}" 
                     data-truck-id="${rec.truck.id}" 
                     data-driver-id="${rec.driver?.id || ''}"
                     onclick="app.handleTruckRecommendationClick(${rec.truck.id}, ${rec.driver?.id || 'null'})">
                    
                    <div class="roadmap-header">
                        <div class="truck-info">
                            <strong>${rec.truck.brand} ${rec.truck.model}</strong>
                            <span class="truck-reg">${rec.truck.registration}</span>
                            ${rec.truck.maintenance_status !== 'operational' ? 
                                `<span class="maintenance-badge">⚠️ ${this.getMaintenanceDisplayName(rec.truck.maintenance_status)}</span>` : ''}
                        </div>
                        <div class="compatibility-score ${this.getScoreClass(rec.score)}">
                            ${rec.score}%
                        </div>
                    </div>
                    
                    <div class="live-roadmap">
                        <div class="roadmap-status">
                            <span class="status-indicator ${rec.roadmap.availability}"></span>
                            <strong>${rec.roadmap.statusText}</strong>
                        </div>
                        
                        <div class="roadmap-details">
                            <div class="roadmap-item">
                                <i data-lucide="map-pin"></i>
                                <span>Localisation: ${rec.roadmap.currentLocation}</span>
                            </div>
                            
                            ${rec.currentOperation ? `
                                <div class="roadmap-item current-operation">
                                    <i data-lucide="truck"></i>
                                    <span>Opération: ${rec.currentOperation.operation_number || rec.currentOperation.id}</span>
                                </div>
                                <div class="roadmap-item">
                                    <i data-lucide="navigation"></i>
                                    <span>Destination: ${rec.currentOperation.arrival_location}</span>
                                </div>
                            ` : ''}
                            
                            <div class="roadmap-item">
                                <i data-lucide="clock"></i>
                                <span>Disponible: ${rec.roadmap.availabilityTime}</span>
                            </div>
                            
                            <div class="roadmap-item">
                                <i data-lucide="map"></i>
                                <span>Prochaine Wilaya: ${rec.roadmap.nextLocation}</span>
                            </div>
                            
                            ${rec.driver ? `
                                <div class="roadmap-item">
                                    <i data-lucide="user"></i>
                                    <span>Chauffeur: ${rec.driver.name}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="roadmap-timeline">
                            ${rec.roadmap.timeline.map(step => `
                                <div class="timeline-step ${step.status}">
                                    <span class="step-time">${step.time}</span>
                                    <span class="step-action">${step.action}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="slot-assignment-buttons">
                        ${Array.from({length: mission.trucks_requested}, (_, i) => `
                            <button type="button" 
                                    class="btn btn--sm btn--outline assign-to-slot-btn" 
                                    data-slot="${i}" 
                                    data-truck-id="${rec.truck.id}" 
                                    data-driver-id="${rec.driver?.id || ''}"
                                    onclick="app.assignToSpecificSlotWithMaintenanceCheck(${i}, ${rec.truck.id}, ${rec.driver?.id || 'null'})">
                                Slot ${i + 1}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Update button states for already assigned trucks
    this.updateAllButtonStates();
    
    // Initialize icons after DOM update
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 100);
}

// Calculate truck roadmap with cyclic status awareness
calculateTruckRoadmapWithCyclicStatus(truck, driver, currentOperation, mission) {
    const roadmap = {
        availability: 'available',
        statusText: 'Disponible',
        currentLocation: truck.current_location || 'Non défini',
        nextLocation: truck.next_available_location || truck.current_location || 'Non défini',
        availabilityTime: 'Immédiatement',
        timeline: [],
        compatibilityScore: 100
    };
    
    // Check maintenance status first
    if (truck.maintenance_status && truck.maintenance_status !== 'operational') {
        roadmap.availability = 'maintenance';
        roadmap.statusText = `En maintenance: ${this.getMaintenanceDisplayName(truck.maintenance_status)}`;
        roadmap.compatibilityScore = 30; // Lower score but still assignable
        
        const maintenanceInfo = truck.maintenance_info || {};
        if (maintenanceInfo.end_date) {
            const endDate = new Date(maintenanceInfo.end_date);
            const now = new Date();
            if (endDate > now) {
                roadmap.availabilityTime = `Fin maintenance: ${this.formatAlgeriaDateTime(maintenanceInfo.end_date)}`;
            } else {
                roadmap.availabilityTime = 'Maintenance terminée';
                roadmap.compatibilityScore = 60;
            }
        }
        
        roadmap.timeline.push({
            time: roadmap.availabilityTime,
            action: `⚠️ ${this.getMaintenanceDisplayName(truck.maintenance_status)}`,
            status: 'maintenance'
        });
    }
    
    // Check current operational status
    switch (truck.status) {
        case 'available':
            if (!truck.maintenance_status || truck.maintenance_status === 'operational') {
                roadmap.availability = 'available';
                roadmap.statusText = 'Disponible maintenant';
                roadmap.compatibilityScore = 100;
            }
            break;
            
        case 'busy':
            roadmap.availability = 'will_be_available';
            roadmap.statusText = 'En opération';
            roadmap.compatibilityScore = 70;
            
            if (currentOperation) {
                const estimatedEnd = this.estimateOperationEndTime(currentOperation);
                roadmap.availabilityTime = `Disponible vers: ${this.formatAlgeriaDateTime(estimatedEnd)}`;
                
                roadmap.timeline.push({
                    time: 'Maintenant',
                    action: `🚛 ${this.getOperationStatusDisplayName(currentOperation.status)}`,
                    status: 'current'
                });
                
                roadmap.timeline.push({
                    time: this.formatAlgeriaDateTime(estimatedEnd),
                    action: '✅ Opération terminée',
                    status: 'estimated'
                });
            }
            break;
            
        case 'blocked':
            roadmap.availability = 'unavailable';
            roadmap.statusText = 'Bloqué (Problème)';
            roadmap.compatibilityScore = 10;
            roadmap.availabilityTime = 'Intervention requise';
            
            roadmap.timeline.push({
                time: 'Actuellement',
                action: '🚫 Camion bloqué - Problème signalé',
                status: 'blocked'
            });
            break;
    }
    
    // Factor in distance from mission departure point
    if (mission.departure_wilaya && truck.current_location) {
        const distance = this.calculateWilayaDistance(truck.current_location, mission.departure_wilaya);
        if (distance > 0) {
            roadmap.compatibilityScore -= Math.min(distance * 2, 30); // Penalize distance
        }
    }
    
    // Ensure minimum score
    roadmap.compatibilityScore = Math.max(roadmap.compatibilityScore, 0);
    
    return roadmap;
}

// Handle truck recommendation click with maintenance check
handleTruckRecommendationClick(truckId, driverId) {
    // Check for maintenance and show confirmation if needed
    this.checkMaintenanceAssignment(truckId, (canAssign) => {
        if (canAssign) {
            // Find available slot and assign
            const availableSlot = this.findAvailableAssignmentSlot();
            if (availableSlot !== -1) {
                this.assignToSpecificSlot(availableSlot, truckId, driverId);
            }
        }
    });
}

// Assign to slot with maintenance check
assignToSpecificSlotWithMaintenanceCheck(slotIndex, truckId, driverId) {
    this.checkMaintenanceAssignment(truckId, (canAssign) => {
        if (canAssign) {
            this.assignToSpecificSlot(slotIndex, truckId, driverId);
        }
    });
}
// Helper method to estimate operation end time
estimateOperationEndTime(operation) {
    const now = new Date();
    const estimatedDurationHours = 6; // Default 6 hours
    
    if (operation.real_departure_time) {
        const departure = new Date(operation.real_departure_time);
        return new Date(departure.getTime() + (estimatedDurationHours * 60 * 60 * 1000));
    }
    
    return new Date(now.getTime() + (estimatedDurationHours * 60 * 60 * 1000));
}

// Helper method to get operation status display name
getOperationStatusDisplayName(status) {
    const statusMap = {
        'en_attente': 'En attente',
        'demarree': 'Démarrée',
        'arrivee_site_chargement': 'Arrivée site chargement',
        'chargement_termine': 'Chargement terminé',
        'arrivee_site_destination': 'Arrivée site destination',
        'dechargement_termine': 'Déchargement terminé',
        'probleme_signalee': 'Problème signalé',
        'annulee': 'Annulée'
    };
    return statusMap[status] || status;
}

// Helper method to calculate distance between wilayas (simplified)
calculateWilayaDistance(wilaya1, wilaya2) {
    if (wilaya1 === wilaya2) return 0;
    
    // Simplified distance calculation - you can enhance this
    const distances = {
        '07-Biskra': { '16-Alger': 300, '31-Oran': 600, '25-Constantine': 250 },
        '16-Alger': { '31-Oran': 400, '25-Constantine': 300, '07-Biskra': 300 },
        '31-Oran': { '16-Alger': 400, '25-Constantine': 650, '07-Biskra': 600 },
        '25-Constantine': { '16-Alger': 300, '31-Oran': 650, '07-Biskra': 250 }
    };
    
    return distances[wilaya1]?.[wilaya2] || distances[wilaya2]?.[wilaya1] || 100;
}

// Helper method to find available assignment slot
findAvailableAssignmentSlot() {
    if (!this.currentMissionForAssignment) return -1;
    
    const totalSlots = this.currentMissionForAssignment.trucks_requested;
    for (let i = 0; i < totalSlots; i++) {
        const truckSelect = document.getElementById(`truck-select-${i}`);
        if (truckSelect && !truckSelect.value) {
            return i;
        }
    }
    return -1;
}

// Show toast notification
showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.smart-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `smart-toast smart-toast-${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
    
    // Initialize lucide icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// NEW: Add slot assignment listeners
addSlotAssignmentListeners() {
    document.querySelectorAll('.assign-to-slot-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const slotIndex = parseInt(e.target.dataset.slot);
            const truckId = parseInt(e.target.dataset.truckId);
            const driverId = parseInt(e.target.dataset.driverId) || '';
            
            this.assignToSpecificSlot(slotIndex, truckId, driverId);
        });
    });
}

// NEW: Assign to specific slot
// FIXED: Assign to specific slot
// ENHANCED: Assign to specific slot with proper reset and toggle functionality
assignToSpecificSlot(slotIndex, truckId, driverId) {
    console.log(`Assigning truck ${truckId} to slot ${slotIndex}`);
    
    // Handle null/undefined driverId
    if (driverId === 'null' || driverId === null || driverId === undefined) {
        driverId = '';
    }
    
    const truckSelect = document.getElementById(`truck-select-${slotIndex}`);
    const driverSelect = document.getElementById(`driver-select-${slotIndex}`);
    const slotStatus = document.getElementById(`slot-status-${slotIndex}`);
    
    if (!truckSelect || !driverSelect) {
        console.error(`Could not find select elements for slot ${slotIndex}`);
        return;
    }
    
    // Get the previously assigned truck ID to reset its buttons
    const previousTruckId = truckSelect.value;
    
    // If there was a previous truck assigned, reset its buttons
    if (previousTruckId && previousTruckId !== truckId.toString()) {
        this.resetTruckButtons(previousTruckId);
    }
    
    // Check if clicking the same truck that's already assigned (toggle functionality)
    if (previousTruckId === truckId.toString()) {
        this.clearSlotAssignment(slotIndex);
        return;
    }
    
    // Assign new truck and driver
    truckSelect.value = truckId;
    
    // Handle driver assignment
    if (driverId) {
        driverSelect.value = driverId;
    } else {
        // Try to auto-assign driver if truck has one
        const truck = this.getTrucks().find(t => t.id === truckId);
        if (truck && (truck.permanent_driver_id || truck.assigned_driver_id)) {
            const autoDriverId = truck.permanent_driver_id || truck.assigned_driver_id;
            driverSelect.value = autoDriverId;
            driverId = autoDriverId;
        } else {
            driverSelect.value = '';
        }
    }
    
    // Trigger change events
    truckSelect.dispatchEvent(new Event('change'));
    driverSelect.dispatchEvent(new Event('change'));
    
    // Update slot status display
    this.updateSlotStatusDisplay(slotIndex, truckId, driverId);
    
    // Update button states for the newly assigned truck
    this.updateTruckButtonStates(truckId, slotIndex);
    
    // Show assignment feedback
    this.showAssignmentFeedback(slotIndex, truckId);
    
    console.log(`Successfully assigned truck ${truckId} to slot ${slotIndex}`);
}
// FIXED: Update truck availability across all slots
updateAllTruckAvailability() {
    const totalSlots = this.currentMissionForAssignment ? this.currentMissionForAssignment.trucks_requested : 0;
    const assignedTrucks = new Set();
    
    // Collect all assigned trucks
    for (let i = 0; i < totalSlots; i++) {
        const truckSelect = document.getElementById(`truck-select-${i}`);
        if (truckSelect && truckSelect.value) {
            assignedTrucks.add(parseInt(truckSelect.value));
        }
    }
    
    // Update all truck selects
    for (let i = 0; i < totalSlots; i++) {
        const truckSelect = document.getElementById(`truck-select-${i}`);
        if (!truckSelect) continue;
        
        const currentValue = truckSelect.value;
        
        // Update options
        Array.from(truckSelect.options).forEach(option => {
            const truckId = parseInt(option.value);
            if (!truckId) return;
            
            if (assignedTrucks.has(truckId) && truckId != currentValue) {
                option.disabled = true;
                option.textContent = option.textContent.replace(' (Déjà assigné)', '') + ' (Déjà assigné)';
            } else {
                option.disabled = false;
                option.textContent = option.textContent.replace(' (Déjà assigné)', '');
            }
        });
    }
}

// NEW: Clear a specific slot assignment
// FIXED: Clear slot assignment
clearSlotAssignment(slotIndex) {
    const truckSelect = document.getElementById(`truck-select-${slotIndex}`);
    const driverSelect = document.getElementById(`driver-select-${slotIndex}`);
    
    if (truckSelect) truckSelect.value = '';
    if (driverSelect) driverSelect.value = '';
    
    this.clearSlotStatus(slotIndex);
    this.updateAllTruckAvailability();
}
// NEW: Reset buttons for a specific truck
resetTruckButtons(truckId) {
    document.querySelectorAll(`[data-truck-id="${truckId}"]`).forEach(btn => {
        if (btn.classList.contains('assign-to-slot-btn')) {
            btn.disabled = false;
            btn.classList.remove('btn-assigned');
            const slotNum = parseInt(btn.dataset.slot) + 1;
            btn.textContent = `Slot ${slotNum}`;
            btn.title = `Assigner à l'emplacement ${slotNum}`;
        }
    });
}

// NEW: Update button states for assigned truck
updateTruckButtonStates(truckId, assignedSlotIndex) {
    document.querySelectorAll(`[data-truck-id="${truckId}"]`).forEach(btn => {
        if (btn.classList.contains('assign-to-slot-btn')) {
            const btnSlotIndex = parseInt(btn.dataset.slot);
            btn.disabled = true;
            btn.classList.add('btn-assigned');
            
            if (btnSlotIndex === assignedSlotIndex) {
                btn.textContent = '✅ Assigné';
                btn.title = 'Cliquer pour désassigner';
            } else {
                btn.textContent = 'Occupé';
                btn.title = 'Ce camion est déjà assigné';
            }
        }
    });
}

// NEW: Update slot status display
updateSlotStatusDisplay(slotIndex, truckId, driverId) {
    const slotStatus = document.getElementById(`slot-status-${slotIndex}`);
    if (!slotStatus) return;
    
    const truck = this.getTrucks().find(t => t.id == truckId);
    const driver = driverId ? this.getDrivers().find(d => d.id == driverId) : null;
    
    const truckInfo = truck ? `${truck.brand} ${truck.model}` : 'Camion inconnu';
    const driverInfo = driver ? driver.name : 'Pas de chauffeur';
    
    slotStatus.innerHTML = `
        <span class="slot-assigned">
            ✅ ${truckInfo} + ${driverInfo}
            <button type="button" class="btn-clear-slot" onclick="app.clearSlotAssignment(${slotIndex})" title="Vider cet emplacement">
                <i data-lucide="x"></i>
            </button>
        </span>
    `;
    
    // Reinitialize icons for the new button
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// Helper function for score class
getScoreClass(score) {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
}

// Get truck status for display
getTruckStatus(truckId) {
    if (this.truckStatusTracker.onOperation.has(truckId)) {
        return 'onOperation';
    } else if (this.truckStatusTracker.assigned.has(truckId)) {
        return 'assigned';
    } else {
        return 'available';
    }
}

// Add event listeners for assignment form
// FIXED: Add event listeners for assignment form
addAssignmentEventListeners() {
    console.log('Setting up assignment event listeners...');
    
    // Add listeners for truck and driver selects
    const totalSlots = this.currentMissionForAssignment ? this.currentMissionForAssignment.trucks_requested : 0;
    
    for (let i = 0; i < totalSlots; i++) {
        const truckSelect = document.getElementById(`truck-select-${i}`);
        const driverSelect = document.getElementById(`driver-select-${i}`);
        
        if (truckSelect) {
            // Remove existing listeners
            truckSelect.removeEventListener('change', this.handleTruckSelection);
            
            // Add new listener
            truckSelect.addEventListener('change', (e) => {
                this.handleTruckSelection(e, i);
            });
        }
        
        if (driverSelect) {
            // Remove existing listeners  
            driverSelect.removeEventListener('change', this.handleDriverSelection);
            
            // Add new listener
            driverSelect.addEventListener('change', (e) => {
                this.handleDriverSelection(e, i);
            });
        }
    }
    
    console.log(`Added listeners for ${totalSlots} slots`);
}
handleTruckSelection(event, slotIndex) {
    const selectedTruckId = parseInt(event.target.value);
    const totalSlots = this.currentMissionForAssignment.trucks_requested;
    
    if (!selectedTruckId) {
        this.clearSlotStatus(slotIndex);
        this.updateAllTruckAvailability();
        return;
    }
    
    // Check for duplicates in other slots
    for (let i = 0; i < totalSlots; i++) {
        if (i !== slotIndex) {
            const otherTruckSelect = document.getElementById(`truck-select-${i}`);
            if (otherTruckSelect && parseInt(otherTruckSelect.value) === selectedTruckId) {
                alert(`Ce camion est déjà assigné au Slot ${i + 1}. Veuillez choisir un autre camion.`);
                event.target.value = '';
                this.clearSlotStatus(slotIndex);
                return;
            }
        }
    }
    
    // Auto-assign driver if truck has one
    const truck = this.getTrucks().find(t => t.id === selectedTruckId);
    const driverSelect = document.getElementById(`driver-select-${slotIndex}`);
    
    if (truck && (truck.permanent_driver_id || truck.assigned_driver_id)) {
        const autoDriverId = truck.permanent_driver_id || truck.assigned_driver_id;
        if (driverSelect) {
            driverSelect.value = autoDriverId;
        }
    }
    
    this.updateSlotStatus(slotIndex, selectedTruckId, driverSelect ? driverSelect.value : '');
    this.updateAllTruckAvailability();
}

// FIXED: Handle driver selection
handleDriverSelection(event, slotIndex) {
    const selectedDriverId = parseInt(event.target.value);
    const truckSelect = document.getElementById(`truck-select-${slotIndex}`);
    const truckId = truckSelect ? parseInt(truckSelect.value) : null;
    
    this.updateSlotStatus(slotIndex, truckId, selectedDriverId);
}
// FIXED: Update slot status display
updateSlotStatus(slotIndex, truckId, driverId) {
    const slotStatus = document.getElementById(`slot-status-${slotIndex}`);
    if (!slotStatus) return;
    
    if (!truckId) {
        slotStatus.innerHTML = '<span class="slot-empty">⚪ Non assigné</span>';
        return;
    }
    
    const truck = this.getTrucks().find(t => t.id === truckId);
    const driver = driverId ? this.getDrivers().find(d => d.id == driverId) : null;
    
    const truckInfo = truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'Camion inconnu';
    const driverInfo = driver ? driver.name : 'Pas de chauffeur';
    
    slotStatus.innerHTML = `
        <div class="slot-assigned">
            <span class="slot-assigned-text">✅ Assigné</span>
            <div class="slot-details">
                <div>🚛 ${truckInfo}</div>
                <div>👨‍💼 ${driverInfo}</div>
            </div>
            <button type="button" class="btn-clear-slot" onclick="app.clearSlotAssignment(${slotIndex})" title="Vider ce slot">
                <i data-lucide="x"></i>
            </button>
        </div>
    `;
    
    // Reinitialize icons
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 50);
}


// Show assignment feedback
showAssignmentFeedback(assignmentIndex, truckId) {
    const feedbackContainer = document.getElementById(`feedback-${assignmentIndex}`);
    const truck = this.getTrucks().find(t => t.id === truckId);
    const driver = this.getDrivers().find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
    
    if (!truck) {
        feedbackContainer.innerHTML = '';
        return;
    }
    
    const analysis = this.analyzeTruckAvailability(truck, driver, this.currentMissionForAssignment);
    
    let feedbackClass = 'feedback-' + analysis.category;
    let feedbackHTML = `
        <div class="assignment-feedback-card ${feedbackClass}">
            <div class="feedback-header">
                <span class="feedback-score">${analysis.score}% Compatible</span>
                <span class="feedback-category">${this.getCategoryLabel(analysis.category)}</span>
            </div>
            <div class="feedback-details">
                ${analysis.reasons.map(reason => `<div class="feedback-reason">${reason}</div>`).join('')}
                ${analysis.warnings.map(warning => `<div class="feedback-warning">${warning}</div>`).join('')}
                ${analysis.conflicts.map(conflict => `<div class="feedback-conflict">${conflict}</div>`).join('')}
            </div>
        </div>
    `;
    
    feedbackContainer.innerHTML = feedbackHTML;
}

// Get category label
getCategoryLabel(category) {
    const labels = {
        excellent: '🌟 Excellent',
        good: '✅ Bon choix',
        possible: '⚠️ Possible',
        risky: '🔶 Risqué',
        unavailable: '❌ Non disponible'
    };
    return labels[category] || category;
}

// Handle new assignment submission
// FIXED: Handle new assignment submission
// FIXED: Handle advanced assignment submission
handleAdvancedAssignmentSubmit(e) {
    e.preventDefault();
    console.log('Advanced assignment form submitted');
    
    if (!['planner','admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs, répartiteurs et administrateurs peuvent assigner des missions');
        return;
    }

    
    const mission = this.currentMissionForAssignment;
    const assignments = [];
    const totalSlots = mission.trucks_requested;
    
    // Collect assignments from all slots
    for (let i = 0; i < totalSlots; i++) {
        const truckSelect = document.getElementById(`truck-select-${i}`);
        const driverSelect = document.getElementById(`driver-select-${i}`);
        
        if (!truckSelect || !driverSelect) {
            alert(`Erreur: Impossible de trouver les éléments pour le slot ${i + 1}`);
            return;
        }
        
        const truckId = parseInt(truckSelect.value);
        const driverId = parseInt(driverSelect.value);
        
        if (!truckId) {
            alert(`Veuillez sélectionner un camion pour l'assignation ${i + 1}`);
            return;
        }
        
        if (!driverId) {
            alert(`Veuillez sélectionner un chauffeur pour l'assignation ${i + 1}`);
            return;
        }
        
        assignments.push({
            truck_id: truckId,
            driver_id: driverId,
            assigned_at: new Date().toISOString(),
            slot_index: i
        });
    }
    
    // Validate assignments
    const validation = this.validateAssignments(assignments);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }
    
    // Show confirmation
    const assignmentSummary = assignments.map((a, i) => {
        const truck = this.getTrucks().find(t => t.id === a.truck_id);
        const driver = this.getDrivers().find(d => d.id === a.driver_id);
        return `Slot ${i + 1}: ${truck.registration} + ${driver.name}`;
    }).join('\n');
    
    if (!confirm(`Confirmer l'assignation pour ${mission.client_name}?\n\n${assignmentSummary}`)) {
        return;
    }
    
    // Execute the assignment
    this.executeSmartAssignment(mission.id, assignments);
}

// Validate assignments
validateAssignments(assignments) {
    const truckIds = assignments.map(a => a.truck_id);
    const driverIds = assignments.map(a => a.driver_id);
    
    // Check for duplicate trucks
    if (new Set(truckIds).size !== truckIds.length) {
        return { valid: false, message: 'Impossible d\'assigner le même camion plusieurs fois' };
    }
    
    // Check for duplicate drivers
    if (new Set(driverIds).size !== driverIds.length) {
        return { valid: false, message: 'Impossible d\'assigner le même chauffeur plusieurs fois' };
    }
    
    return { valid: true };
}

// Check for assignment conflicts
checkAssignmentConflicts(assignments) {
    const conflicts = [];
    
    assignments.forEach((assignment, index) => {
        const truck = this.getTrucks().find(t => t.id === assignment.truck_id);
        const driver = this.getDrivers().find(d => d.id === assignment.driver_id);
        
        // Check truck conflicts
        if (this.truckStatusTracker.onOperation.has(assignment.truck_id)) {
            const opInfo = this.truckStatusTracker.onOperation.get(assignment.truck_id);
            conflicts.push({
                type: 'truck_busy',
                message: `Camion ${truck.registration} en opération jusqu'à ${this.formatDateTime(opInfo.estimatedCompletion)}`
            });
        }
        
        if (this.truckStatusTracker.assigned.has(assignment.truck_id)) {
            const assignInfo = this.truckStatusTracker.assigned.get(assignment.truck_id);
            conflicts.push({
                type: 'truck_assigned',
                message: `Camion ${truck.registration} déjà assigné à ${assignInfo.missionName}`
            });
        }
        
        // Check driver conflicts
        if (driver && driver.status === 'busy') {
            conflicts.push({
                type: 'driver_busy',
                message: `Chauffeur ${driver.name} non disponible`
            });
        }
    });
    
    return conflicts;
}

// Execute the smart assignment
executeSmartAssignment(missionId, assignments) {
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    try {
        // Update mission status
        mission.status = 'validée';
        mission.assigned_trucks = assignments;
        mission.validated_by = this.currentUser.name;
        mission.validated_at = new Date().toISOString();
        mission.assignment_method = 'smart_assignment_v2';
        
        // Add to timeline
        mission.progress_timeline.push({
            status: 'validée',
            timestamp: new Date().toISOString(),
            user: this.currentUser.name,
            method: 'smart_assignment',
            assignments_count: assignments.length
        });
        
        // Update truck and driver statuses
        assignments.forEach(assignment => {
            this.updateTruckStatus(assignment.truck_id, 'busy', missionId);
            this.updateDriverStatus(assignment.driver_id, 'busy', missionId);
        });
        
        // Create operations automatically
        this.createOperationsFromAssignment(mission, assignments);
        
        // Refresh status tracker
        this.refreshTruckStatuses();
        
        // Save changes
        this.saveMissions(missions);
        
        // Send notifications
        this.sendSmartAssignmentNotifications(mission, assignments);
        
        // Add activity
        this.addActivity(`Mission assignée intelligemment: ${mission.client_name} (${assignments.length} camions)`, 'zap');
        
        // Close modal and refresh
        this.closeModal('assignmentModal');
        this.loadSectionData(this.currentSection);
        this.loadDashboard();
        
        // Show success message
        this.showToast(`Mission assignée avec succès! ${assignments.length} opération(s) créée(s).`, 'success');
        
    } catch (error) {
        console.error('Error executing smart assignment:', error);
        alert('Erreur lors de l\'assignation. Veuillez réessayer.');
    }
}

// Create operations from assignment
// FIXED: Create operations from assignment with proper data mapping
createOperationsFromAssignment(mission, assignments) {
    const operations = this.getOperations();
    
    assignments.forEach((assignment, index) => {
        const operationId = this.generateId([...operations]);
        
        // FIXED: Get truck and driver data properly
        const truck = this.getTrucks().find(t => t.id === assignment.truck_id);
        const driver = this.getDrivers().find(d => d.id === assignment.driver_id);
        
        const newOperation = {
            id: operationId,
            mission_id: mission.id,
            mission_number: `MSN${String(mission.id).padStart(3, '0')}`,
            operation_number: `${String(mission.id).padStart(3, '0')}-${index + 1}`,
            departure_location: mission.departure_wilaya || 'Non spécifié',
            arrival_location: mission.arrival_wilaya || 'Non spécifié',
            destination_name: mission.destination_name || 'Non spécifié',
            departure_gps: mission.departure_gps || '',
            arrival_gps: mission.arrival_gps || '',
            estimated_departure: `${mission.scheduled_date} ${mission.scheduled_time}`,
            estimated_arrival: mission.arrival_date && mission.arrival_time ? 
                `${mission.arrival_date} ${mission.arrival_time}` : '',
            assigned_truck_id: assignment.truck_id,
            assigned_driver_id: assignment.driver_id,
            real_departure_time: null,
            real_arrival_time: null,
            charging_time: null,
            status: 'en_attente',
            created_at: new Date().toISOString(),
            created_by: this.currentUser.name,
            assignment_method: 'smart_assignment_v2',
            client_name: mission.client_name || 'Non spécifié',
            product_type: mission.product_type || 'Non spécifié',
            comments: mission.comments || ''
        };
        
        operations.push(newOperation);
    });
    
    this.saveOperations(operations);
    console.log(`Created ${assignments.length} operations for mission ${mission.id}`);
}

// Send smart assignment notifications
sendSmartAssignmentNotifications(mission, assignments) {
    // To planner
    this.sendNotification('planner', 'smart_assignment_completed', 
        `Mission assignée intelligemment: ${mission.client_name} → ${mission.destination_name}`, {
            mission_id: mission.id,
            assignments_count: assignments.length,
            assignment_method: 'smart_assignment_v2'
        });
    
    // To coordinators
    this.sendNotification('coordinator', 'operations_ready', 
        `${assignments.length} nouvelle(s) opération(s) prête(s) pour ${mission.client_name}`, {
            mission_id: mission.id,
            operations_count: assignments.length
        });
}

// TRUCK STATUS SYNCHRONIZATION SYSTEM
// =====================================


// Refresh fleet display in real-time
refreshFleetDisplay() {
    if (this.currentSection === 'fleet') {
        this.loadFleet();
    }
    if (this.currentSection === 'dashboard') {
        this.loadFleetStatus();
    }
}
    

// MISSION STATUS SYNCHRONIZATION - Automatically calculate mission status based on operations
calculateMissionStatusFromOperations(missionId) {
    const operations = this.getOperations().filter(op => op.mission_id === missionId);
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    
    if (!mission || operations.length === 0) return;
    
    // Count operation statuses
    const statusCounts = {
        en_attente: 0,
        demarree: 0,
        arrivee: 0,
        terminee: 0,
        probleme_signalee: 0,
        annulee: 0
    };
    
    operations.forEach(op => {
        if (statusCounts.hasOwnProperty(op.status)) {
            statusCounts[op.status]++;
        }
    });
    
    const totalOperations = operations.length;
    const oldStatus = mission.status;
    let newStatus = mission.status;
    
    // Calculate new mission status based on operations
    if (statusCounts.probleme_signalee > 0) {
        newStatus = 'probleme_signalee';
    } else if (statusCounts.annulee === totalOperations) {
        newStatus = 'annulée';
    } else if (statusCounts.annulee > 0) {
        newStatus = 'partiellement_annulee';
    } else if (statusCounts.terminee === totalOperations) {
        newStatus = 'terminée';
    } else if (statusCounts.terminee > 0) {
        newStatus = 'partiellement_terminee';
    } else if (statusCounts.demarree > 0 || statusCounts.arrivee > 0) {
        newStatus = 'en_cours';
    } else if (totalOperations > 0 && statusCounts.en_attente === totalOperations) {
        newStatus = 'validée';
    }
    
    // Update mission status if it changed
    if (newStatus !== oldStatus) {
        mission.status = newStatus;
        mission.last_status_update = new Date().toISOString();
        mission.status_calculated_from_operations = true;
        
        mission.progress_timeline.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            user: 'System',
            source: 'automatic_calculation',
            details: `Status calculé automatiquement basé sur ${totalOperations} opération(s)`
        });
        
        this.saveMissions(missions);
        
        // Send notification about status change
        this.sendNotification('all', 'mission_status_auto_updated', 
            `Statut mission auto-mis à jour: ${mission.client_name} → ${this.getStatusDisplayName(newStatus)}`, {
                mission_id: mission.id,
                old_status: oldStatus,
                new_status: newStatus,
                operations_count: totalOperations
            });
    }
    
    return newStatus;
}

// Add this method to the TransportApp class for debugging
debugOperations() {
    const operations = this.getOperations();
    console.log('All operations in localStorage:', operations);
    console.log('Number of operations:', operations.length);
    
    operations.forEach(op => {
        console.log(`Operation ${op.operation_number}:`, {
            id: op.id,
            mission_id: op.mission_id,
            status: op.status,
            client: op.client_name,
            truck_id: op.assigned_truck_id,
            driver_id: op.assigned_driver_id
        });
    });
}
   
// FIXED: Edit Mission Function
editMission(missionId) {
    if (!['planner', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs et administrateurs peuvent modifier les missions');
        return;
    }
    
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    if (!mission) {
        alert('Mission introuvable');
        return;
    }
    
    if (mission.status !== 'demandée') {
        alert('Seules les missions en statut "demandée" peuvent être modifiées');
        return;
    }
    
    // Set editing mode
    this.currentEditingMissionId = missionId;
    
    // Open mission modal
    this.openModal('missionModal');
}

updateMission(missionId, data) {
    const missions = this.getMissions();
    const missionIndex = missions.findIndex(m => m.id === missionId);
    
    if (missionIndex !== -1) {
        const oldMission = missions[missionIndex];
        missions[missionIndex] = {
            ...oldMission,
            ...data,
            id: missionId, // Keep original ID
            status: oldMission.status, // Keep original status
            updated_by: this.currentUser.name,
            updated_at: new Date().toISOString()
        };
        
        // Add update to timeline
        missions[missionIndex].progress_timeline.push({
            status: 'modifiée',
            timestamp: new Date().toISOString(),
            user: this.currentUser.name,
            changes: this.getMissionChanges(oldMission, data)
        });
        
        this.saveMissions(missions);
        
        this.addActivity(`Mission modifiée: ${data.client_name} → ${data.destination_name}`, 'edit');
        this.sendNotification('all', 'mission_modified', 
            `Mission #${String(missionId).padStart(3, '0')} modifiée par ${this.currentUser.name}`, {
                mission_id: missionId,
                changes: this.getMissionChanges(oldMission, data)
            });
        
        this.loadSectionData(this.currentSection);
        alert('Mission modifiée avec succès!');
    }
}

getMissionChanges(oldMission, newData) {
    const changes = [];
    
    if (oldMission.scheduled_date !== newData.scheduled_date) {
        changes.push(`Date: ${oldMission.scheduled_date} → ${newData.scheduled_date}`);
    }
    if (oldMission.scheduled_time !== newData.scheduled_time) {
        changes.push(`Heure: ${oldMission.scheduled_time} → ${newData.scheduled_time}`);
    }
    if (oldMission.trucks_requested !== newData.trucks_requested) {
        changes.push(`Camions: ${oldMission.trucks_requested} → ${newData.trucks_requested}`);
    }
    if (oldMission.product_type !== newData.product_type) {
        changes.push(`Produit: ${oldMission.product_type} → ${newData.product_type}`);
    }
    
    return changes.join(', ');
}


updateMissionStatus(missionId, newStatus) {
    if (this.currentUser.role !== 'planner' && this.currentUser.role !== 'admin') {
        alert('Seuls les Planificateurs peuvent modifier le statut des missions');
        return;
    }
    
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    // ✅ CORRECTION : Initialiser progress_timeline si elle n'existe pas
    if (!mission.progress_timeline || !Array.isArray(mission.progress_timeline)) {
        mission.progress_timeline = [];
    }
    
    const oldStatus = mission.status;
    mission.status = newStatus;
    mission.progress_timeline.push({
        status: newStatus,
        timestamp: new Date().toISOString(),
        user: this.currentUser.name
    });
        
        // Update truck and driver status if mission is completed
        if (newStatus === 'terminée') {
            mission.assigned_trucks?.forEach(assignment => {
                this.updateTruckStatus(assignment.truck_id, 'available');
                this.updateDriverStatus(assignment.driver_id, 'available');
            });
            
            mission.completed_at = new Date().toISOString();
            mission.completed_by = this.currentUser.name;
        }
        
        this.saveMissions(missions);
        // Add this line after the status update
this.addEventToHistory('mission', `Mission ${mission.client_name} - Statut: ${oldStatus} → ${newStatus}`, `Mission ${missionId}`);

        // Send notifications
        const statusDisplay = this.getStatusDisplayName(newStatus);
        this.sendNotification('planner', 'mission_status_updated', 
            `Mission ${statusDisplay.toLowerCase()}: ${mission.client_name} → ${mission.destination_name}`, {
                mission_id: mission.id,
                old_status: oldStatus,
                new_status: newStatus
            });
            
        this.sendNotification('dispatcher', 'mission_status_updated', 
            `Mission ${statusDisplay.toLowerCase()}: ${mission.client_name} → ${mission.destination_name}`, {
                mission_id: mission.id,
                old_status: oldStatus,
                new_status: newStatus
            });
        
        this.addActivity(`Mission ${statusDisplay.toLowerCase()}: ${mission.client_name}`, 
            newStatus === 'terminée' ? 'check-circle' : 'play-circle');
        this.loadSectionData(this.currentSection);
        
        alert(`Mission ${statusDisplay.toLowerCase()} avec succès!`);
    }
    
cancelMission(missionId) {
    // Add this role check if you want to restrict who can cancel missions
    if (this.currentUser.role !== 'planner' && this.currentUser.role !== 'admin' && this.currentUser.role !== 'planner') {
        alert('Seuls les Planificateurs, administrateurs et planificateurs peuvent annuler les missions');
        return;
    }
    
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
	
    if (!mission) {
        alert('Mission introuvable');
        return;
    }
    
    // Can't cancel missions that haven't been validated
    if (mission.status === 'demandée') {
        alert('Les missions non validées doivent être supprimées, pas annulées. Utilisez le bouton "Supprimer".');
        return;
    }
    
    // Can't cancel already finished missions
    if (['terminée', 'annulée'].includes(mission.status)) {
        alert('Cette mission ne peut plus être annulée car elle est déjà terminée ou annulée.');
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir annuler cette mission?\n\nLa mission sera conservée dans l\'historique mais marquée comme annulée.')) {
        return;
    }
    
    try {
        // Update mission status to cancelled
        this.updateMissionStatus(missionId, 'annulée');
        
        // Cancel all linked operations
        const operations = this.getOperations();
        const missionOperations = operations.filter(op => op.mission_id === missionId);
        
        missionOperations.forEach(operation => {
            operation.status = 'annulee';
            operation.cancelled_at = new Date().toISOString();
            operation.cancelled_by = this.currentUser.name;
            
            // Free up truck and driver if they were assigned
            if (operation.assigned_truck_id) {
                this.updateTruckStatus(operation.assigned_truck_id, 'available');
            }
            if (operation.assigned_driver_id) {
                this.updateDriverStatus(operation.assigned_driver_id, 'available');
            }
        });
        
        this.saveOperations(operations);
        
        // Free up assigned trucks and drivers from the mission
        if (mission.assigned_trucks) {
            mission.assigned_trucks.forEach(assignment => {
                this.updateTruckStatus(assignment.truck_id, 'available');
                this.updateDriverStatus(assignment.driver_id, 'available');
            });
        }
        
        this.addActivity(`Mission annulée: ${mission.client_name} → ${mission.destination_name}`, 'x-circle');
        
        alert('✅ Mission annulée avec succès! Elle reste dans l\'historique.');
        
    } catch (error) {
        console.error('Error cancelling mission:', error);
        alert('❌ Erreur lors de l\'annulation de la mission. Veuillez réessayer.');
    }
}

   deleteMission(missionId) {
    // Only planners and admins can delete missions
    if (!['planner', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs et administrateurs peuvent supprimer les missions');
        return;
    }
    
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    
    if (!mission) {
        alert('Mission introuvable');
        return;
    }
    
    // Can only delete missions that haven't been validated
    if (mission.status !== 'demandée') {
        alert('Seules les missions en statut "demandée" peuvent être supprimées définitivement. Utilisez "Annuler" pour les missions validées.');
        return;
    }
    
    // Double confirmation for deletion
    if (!confirm('⚠️ ATTENTION ⚠️\n\nVous êtes sur le point de SUPPRIMER DÉFINITIVEMENT cette mission.\nCette action est IRRÉVERSIBLE et effacera toutes les données.\n\nVoulez-vous continuer?')) {
        return;
    }
    
    // Final confirmation
    if (!confirm('Dernière confirmation: Supprimer définitivement la mission "' + mission.client_name + ' → ' + mission.destination_name + '"?')) {
        return;
    }
    
    try {
        // Remove any draft operations linked to this mission
        const operations = this.getOperations();
        const updatedOperations = operations.filter(op => op.mission_id !== missionId);
        this.saveOperations(updatedOperations);
        
        // Remove the mission completely
        const updatedMissions = missions.filter(m => m.id !== missionId);
        this.saveMissions(updatedMissions);
        
        // Add activity log
        this.addActivity(`Mission supprimée définitivement: ${mission.client_name} → ${mission.destination_name}`, 'trash-2');
        
        // Send notification to administrators
        this.sendNotification('admin', 'mission_deleted', 
            `Mission supprimée par ${this.currentUser.name}: ${mission.client_name} → ${mission.destination_name}`, {
                deleted_by: this.currentUser.name,
                mission_details: `${mission.client_name} → ${mission.destination_name}`,
                deletion_time: new Date().toISOString()
            });
        
        // Refresh the display
        this.loadSectionData(this.currentSection);
        this.loadDashboard(); // Update dashboard statistics
        
        alert('✅ Mission supprimée définitivement avec succès!');
        
    } catch (error) {
        console.error('Error deleting mission:', error);
        alert('❌ Erreur lors de la suppression de la mission. Veuillez réessayer.');
    }
}

deleteMission(missionId) {
    // Only planners and admins can delete missions
    if (!['planner', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs et administrateurs peuvent supprimer les missions');
        return;
    }
    
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    
    if (!mission) {
        alert('Mission introuvable');
        return;
    }
    
    // Can only delete missions that haven't been validated
    if (mission.status !== 'demandée') {
        alert('Seules les missions en statut "demandée" peuvent être supprimées définitivement. Utilisez "Annuler" pour les missions validées.');
        return;
    }
    
    // Double confirmation for deletion
    if (!confirm('⚠️ ATTENTION ⚠️\n\nVous êtes sur le point de SUPPRIMER DÉFINITIVEMENT cette mission.\nCette action est IRRÉVERSIBLE et effacera toutes les données.\n\nVoulez-vous continuer?')) {
        return;
    }
    
    // Final confirmation
    if (!confirm('Dernière confirmation: Supprimer définitivement la mission "' + mission.client_name + ' → ' + mission.destination_name + '"?')) {
        return;
    }
    
    try {
        // Remove any draft operations linked to this mission
        const operations = this.getOperations();
        const updatedOperations = operations.filter(op => op.mission_id !== missionId);
        this.saveOperations(updatedOperations);
        
        // Remove the mission completely
        const updatedMissions = missions.filter(m => m.id !== missionId);
        this.saveMissions(updatedMissions);
        
        // Add activity log
        this.addActivity(`Mission supprimée définitivement: ${mission.client_name} → ${mission.destination_name}`, 'trash-2');
        
        // Send notification to administrators
        this.sendNotification('admin', 'mission_deleted', 
            `Mission supprimée par ${this.currentUser.name}: ${mission.client_name} → ${mission.destination_name}`, {
                deleted_by: this.currentUser.name,
                mission_details: `${mission.client_name} → ${mission.destination_name}`,
                deletion_time: new Date().toISOString()
            });
        
        // Refresh the display
        this.loadSectionData(this.currentSection);
        this.loadDashboard(); // Update dashboard statistics
        
        alert('✅ Mission supprimée définitivement avec succès!');
        
    } catch (error) {
        console.error('Error deleting mission:', error);
        alert('❌ Erreur lors de la suppression de la mission. Veuillez réessayer.');
    }
}
 
    // Client Management
handleClientSubmit(e) {
    e.preventDefault();
    
    if (!['planner', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs et administrateurs peuvent gérer les clients');
        return;
    }
    
    // Get basic client data - using getElementById instead of querySelector
    const clientData = {
        name: document.getElementById('clientName').value.trim(),
        wilaya: document.getElementById('clientWilaya').value,
        address: document.getElementById('clientAddress').value.trim(),
        contact_person: document.getElementById('clientContact').value.trim(),
        contact_email: document.getElementById('clientEmail').value.trim(),
        contact_phone: document.getElementById('clientPhone').value.trim(),
        gps_location: document.getElementById('clientGPS').value.trim()
    };
    
    // Validate required fields
    if (!clientData.name || !clientData.wilaya) {
        alert('Le nom du client et la wilaya sont obligatoires');
        return;
    }
    
    // Get destinations
    const destinations = [];
    const destinationItems = document.querySelectorAll('#destinationsList .destination-item');
    
    if (destinationItems.length === 0) {
        alert('Au moins une destination est requise');
        return;
    }
    
    // Process each destination item
    for (let i = 0; i < destinationItems.length; i++) {
        const item = destinationItems[i];
        
        const nameInput = item.querySelector('.destination-name');
        const wilayaSelect = item.querySelector('.destination-wilaya');
        const contactInput = item.querySelector('.destination-contact');
        const gpsInput = item.querySelector('.destination-gps');
        
        if (!nameInput || !wilayaSelect) {
            console.error('Missing destination form elements in item', i);
            continue;
        }
        
        const name = nameInput.value.trim();
        const wilaya = wilayaSelect.value;
        const contact = contactInput ? contactInput.value.trim() : '';
        const gps = gpsInput ? gpsInput.value.trim() : '';
        
        if (!name || !wilaya) {
            alert(`Veuillez remplir le nom et la wilaya pour la destination ${i + 1}`);
            return;
        }
        
        destinations.push({
            name: name,
            wilaya: wilaya,
            contact_person: contact,
            gps_location: gps
        });
    }
    
    if (destinations.length === 0) {
        alert('Au moins une destination valide est requise');
        return;
    }
    
    clientData.destinations = destinations;
    
try {
    let success = false;
    
    if (this.currentEditingClientId) {
        // Update existing client
        success = this.updateClient(this.currentEditingClientId, clientData);
        if (success) {
            this.currentEditingClientId = null;
            
            // Reset modal title and button
            document.getElementById('clientModalTitle').textContent = 'Nouveau Client';
            document.getElementById('clientSaveText').textContent = 'Sauvegarder';
        }
    } else {
        // Create new client
        success = this.createClient(clientData);
    }
    
    if (success) {
        this.closeModal('clientModal');
        this.loadClients();
        alert('Client sauvegardé avec succès!');
    }
    // If not successful, the error message was already shown by createClient/updateClient
    // and the modal remains open for the user to make corrections
    
} catch (error) {
    console.error('Error saving client:', error);
    alert('Erreur lors de la sauvegarde du client');
}
}
updateClient(clientId, clientData) {
    const clients = this.getClients();
    const clientIndex = clients.findIndex(c => c.id === clientId);
    
    if (clientIndex !== -1) {
        const oldClient = clients[clientIndex];
        clients[clientIndex] = {
            ...oldClient,
            ...clientData,
            id: clientId, // Keep original ID
            updated_by: this.currentUser.name,
            updated_at: new Date().toISOString()
        };
        
        this.saveClients(clients);
        
        this.addActivity(`Client modifié: ${clientData.name}`, 'users');
        this.sendNotification('all', 'client_modified', 
            `Client ${clientData.name} modifié par ${this.currentUser.name}`, {
                client_id: clientId,
                client_name: clientData.name
            });
    }
}
createClient(clientData) {
    const clients = this.getClients();
    
    // Check for duplicate names when creating
    const duplicateClient = clients.find(c => 
        c.name.toLowerCase() === clientData.name.toLowerCase()
    );
    
    if (duplicateClient) {
        alert('Un client avec ce nom existe déjà');
        return false; // Return false to indicate failure
    }
    
    const newClient = {
        id: this.generateId(clients),
        ...clientData,
        created_by: this.currentUser.name,
        created_at: new Date().toISOString()
    };
    
    clients.push(newClient);
    this.saveClients(clients);
    
    this.addActivity(`Nouveau client créé: ${clientData.name}`, 'users');
    this.sendNotification('all', 'client_created', 
        `Nouveau client ${clientData.name} créé par ${this.currentUser.name}`, {
            client_id: newClient.id,
            client_name: clientData.name
        });
    
    return true; // Return true to indicate success
}


// Méthode utilitaire pour s'assurer qu'une mission a tous les champs requis
ensureMissionIntegrity(mission) {
    if (!mission.progress_timeline || !Array.isArray(mission.progress_timeline)) {
        mission.progress_timeline = [];
        
        // Si la mission a des dates, reconstruire la timeline basique
        if (mission.created_at) {
            mission.progress_timeline.push({
                status: "demandée",
                timestamp: mission.created_at,
                user: mission.created_by || 'Système'
            });
        }
        
        if (mission.validated_at) {
            mission.progress_timeline.push({
                status: "validée",
                timestamp: mission.validated_at,
                user: mission.validated_by || 'Système'
            });
        }
    }
    
    // Autres vérifications si nécessaire
    if (!mission.assigned_trucks) {
        mission.assigned_trucks = [];
    }
    
    return mission;
}



updateClient(clientId, data) {
    const clients = this.getClients();
    
    // Check for duplicate names when updating, excluding current client
    const duplicateClient = clients.find(c => 
        c.name.toLowerCase() === data.name.toLowerCase() && 
        c.id !== clientId
    );
    
    if (duplicateClient) {
        alert('Un client avec ce nom existe déjà');
        return false; // Return false to indicate failure
    }

    const clientIndex = clients.findIndex(c => c.id === clientId);
    
    if (clientIndex !== -1) {
        const oldClient = clients[clientIndex];
        clients[clientIndex] = {
            ...oldClient,
            ...data,
            id: clientId, // Keep original ID
            updated_at: new Date().toISOString(),
            updated_by: this.currentUser.name
        };
        
        this.saveClients(clients);
        
        this.addActivity(`Client modifié: ${data.name}`, 'edit');
        this.sendNotification('all', 'client_updated', 
            `Client modifié: ${data.name} par ${this.currentUser.name}`, {
                client_id: clientId,
                client_name: data.name
            });
        
        return true; // Return true to indicate success
    }
    
    return false; // Return false if client not found
}

    

    
loadClients() {
    const clients = this.getClients();
    const container = document.getElementById('clientsGrid');
    
    if (!container) return;
    
    container.innerHTML = clients.map(client => `
        <div class="client-card">
            <div class="client-header">
                <div>
                    <div class="client-name">${client.name}</div>
                    <div class="client-wilaya">${client.wilaya}</div>
                </div>
                <div class="client-actions">
                    <button class="btn btn--outline btn--sm" onclick="app.editClient(${client.id})" title="Modifier">
                        <i data-lucide="edit"></i>
                    </button>
                    <button class="btn btn--outline btn--sm" onclick="app.deleteClient(${client.id})" style="color: var(--color-error);" title="Supprimer">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
            <div class="client-details">
                ${client.address ? `
                    <div class="client-detail">
                        <i data-lucide="map-pin"></i>
                        <span>${client.address}</span>
                    </div>
                ` : ''}
                ${client.contact_person ? `
                    <div class="client-detail">
                        <i data-lucide="user"></i>
                        <span>${client.contact_person}</span>
                    </div>
                ` : ''}
                ${client.contact_phone ? `
                    <div class="client-detail">
                        <i data-lucide="phone"></i>
                        <span>${client.contact_phone}</span>
                    </div>
                ` : ''}
                ${client.contact_email ? `
                    <div class="client-detail">
                        <i data-lucide="mail"></i>
                        <span>${client.contact_email}</span>
                    </div>
                ` : ''}
                ${client.gps_location ? `
                    <div class="client-detail">
                        <i data-lucide="navigation"></i>
                        <a href="${client.gps_location}" target="_blank" style="color: var(--color-primary);">Localisation GPS</a>
                    </div>
                ` : ''}
            </div>
            <div class="client-destinations">
                <h5>Destinations (${client.destinations.length})</h5>
                <div class="destination-list">
${client.destinations.map(dest => `
    <div class="destination-item-display">
        <span>${dest.name} - ${dest.wilaya}</span>
        ${dest.contact_person ? `<br><small style="color: var(--color-text-secondary);">Contact: ${dest.contact_person}</small>` : ''}
        ${dest.gps_location ? `<a href="${dest.gps_location}" target="_blank" style="margin-left: 8px; color: var(--color-primary);" title="GPS"><i data-lucide="map-pin"></i></a>` : ''}
    </div>
`).join('')}

                </div>
            </div>
        </div>
    `).join('');
    
    if (clients.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--color-text-secondary); padding: var(--space-32);">Aucun client enregistré</div>';
    }
}
 
editClient(clientId) {
    if (!['planner', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs et administrateurs peuvent modifier les clients');
        return;
    }
    
    const clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        alert('Client introuvable');
        return;
    }
    
    this.currentEditingClientId = clientId;
    
    // Open modal first
    this.openModal('clientModal');
    
    // Wait for modal to be fully loaded
    setTimeout(() => {
        // Change modal title and button
        document.getElementById('clientModalTitle').textContent = 'Modifier Client';
        document.getElementById('clientSaveText').textContent = 'Modifier Client';
        
        // Populate form fields
        document.getElementById('clientName').value = client.name || '';
        document.getElementById('clientWilaya').value = client.wilaya || '';
        document.getElementById('clientAddress').value = client.address || '';
        document.getElementById('clientContact').value = client.contact_person || '';
        document.getElementById('clientEmail').value = client.contact_email || '';
        document.getElementById('clientPhone').value = client.contact_phone || '';
        document.getElementById('clientGPS').value = client.gps_location || '';
        
        // Clear existing destinations
        const destinationsList = document.getElementById('destinationsList');
        destinationsList.innerHTML = '';
        
        // Add destinations
        if (client.destinations && client.destinations.length > 0) {
            client.destinations.forEach((destination, index) => {
                this.addDestinationFieldWithData(destination);
            });
        } else {
            // Add at least one empty destination
            this.addDestinationField();
        }
        
    }, 250);
}

 
    deleteClient(clientId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client?')) {
            return;
        }
        
        const clients = this.getClients();
        const clientIndex = clients.findIndex(c => c.id === clientId);
        
        if (clientIndex !== -1) {
            const clientName = clients[clientIndex].name;
            clients.splice(clientIndex, 1);
            this.saveClients(clients);
            
            this.addActivity(`Client supprimé: ${clientName}`, 'user-x');
            this.loadSectionData(this.currentSection);
            alert('Client supprimé avec succès!');
        }
    }
    
    
// NEW FUNCTION: Update driver's permanent truck assignment
updateDriverPermanentTruck(driverId, truckId) {
    const drivers = this.getDrivers();
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
        driver.permanent_truck_id = truckId;
        this.saveDrivers(drivers);
    }
}
    
handleDriverSubmit(e) {
    e.preventDefault();
    
    if (!['dispatcher', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les répartiteurs et administrateurs peuvent gérer les chauffeurs');
        return;
    }
    
    const formData = {
        name: document.getElementById('driverName').value.trim(),
        license_number: document.getElementById('driverLicense').value.trim(),
        phone: document.getElementById('driverPhone').value.trim(),
        experience_years: parseInt(document.getElementById('driverExperience').value) || 0,
        current_location: document.getElementById('driverLocation').value || '07-Biskra'
    };
    
    if (!formData.name || !formData.license_number) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    if (this.currentEditingDriverId) {
        // Edit existing driver
        this.updateDriver(this.currentEditingDriverId, formData);
        this.currentEditingDriverId = null;
        
        // Reset modal
        document.querySelector('#driverModal .modal-header h3').textContent = 'Nouveau chauffeur';
        document.querySelector('#driverModal button[type="submit"]').innerHTML = 'Créer le chauffeur';
    } else {
        // Create new driver
        this.createDriver(formData);
    }
    
    this.closeModal('driverModal');
}

// Enhanced updateTruck method - FIXED maintenance date tracking
// Enhanced updateTruck method - FIXED maintenance date logic
updateTruck(truckId, data) {
    const trucks = this.getTrucks();
    const truckIndex = trucks.findIndex(t => t.id === truckId);
    
    if (truckIndex === -1) {
        alert('Camion introuvable');
        return;
    }
    
    const oldTruck = { ...trucks[truckIndex] };
    
    // Check for duplicate registration (excluding current truck)
    const existingTruck = trucks.find(t => t.registration === data.registration && t.id !== truckId);
    if (existingTruck) {
        alert('Cette immatriculation existe déjà');
        return;
    }
    
    // FIXED: Update last_maintenance when maintenance status changes
    if (data.maintenance_status !== 'operational' && data.maintenance_info.start_date) {
        data.last_maintenance = data.maintenance_info.start_date;
    }
    
    // Update truck data
    trucks[truckIndex] = {
        ...oldTruck,
        ...data,
        id: truckId, // Preserve ID
        modified_at: new Date().toISOString(),
        modified_by: this.currentUser.name
    };
    
    this.saveTrucks(trucks);
    
    // Update driver assignments
    if (data.permanent_driver_id !== oldTruck.permanent_driver_id) {
        if (oldTruck.permanent_driver_id) {
            this.updateDriverTruckAssignment(oldTruck.permanent_driver_id, null);
        }
        if (data.permanent_driver_id) {
            this.updateDriverTruckAssignment(data.permanent_driver_id, truckId);
        }
    }
    
    // Log maintenance changes
    if (oldTruck.maintenance_status !== data.maintenance_status) {
        const activityMessage = data.maintenance_status !== 'operational'
            ? `Camion ${data.registration}: ${this.getMaintenanceDisplayName(data.maintenance_status)}`
            : `Camion ${data.registration}: retour en service`;
        
        this.addActivity(activityMessage, 'wrench');
        
        // Send notification for maintenance changes
        if (data.maintenance_status !== 'operational') {
            this.sendNotification('admin', 'maintenance_updated',
                `Camion ${data.registration}: ${this.getMaintenanceDisplayName(data.maintenance_status)}`,
                { truck_id: truckId, maintenance_type: data.maintenance_status }
            );
        }
    }
    
    alert('Camion modifié avec succès!');
}

updateDriver(driverId, data) {
    const drivers = this.getDrivers();
    const driverIndex = drivers.findIndex(d => d.id === driverId);
    
    if (driverIndex !== -1) {
        const oldDriver = drivers[driverIndex];
        drivers[driverIndex] = {
            ...oldDriver,
            ...data,
            id: driverId, // Keep original ID
            updated_at: new Date().toISOString()
        };
        
        this.saveDrivers(drivers);
        
        this.addActivity(`Chauffeur modifié: ${data.name}`, 'edit');
        this.sendNotification('all', 'driver_updated', 
            `Chauffeur modifié: ${data.name} par ${this.currentUser.name}`, {
                driver_id: driverId,
                driver_name: data.name
            });
        
        this.loadSectionData(this.currentSection);
        alert('Chauffeur modifié avec succès!');
    }
}
    
    createDriver(data) {
        const drivers = this.getDrivers();
        
        const newDriver = {
            id: this.generateId(drivers),
            ...data,
            status: 'available',
            rating: 4.0,
            assigned_truck_id: null
        };
        
        drivers.push(newDriver);
        this.saveDrivers(drivers);
        
        this.addActivity(`Chauffeur créé: ${data.name}`, 'user-check');
        this.loadSectionData(this.currentSection);
        alert('Chauffeur créé avec succès!');
    }
    
// Enhanced loadFleet function with new card design
// NEW: Populate truck location filter dropdown
populateTruckLocationFilter() {
    const trucks = this.getTrucks();
    const locationFilter = document.getElementById('truckLocationFilter');
    
    if (!locationFilter) return;
    
    // Get unique locations from trucks
    const locations = [...new Set(trucks.map(truck => truck.current_location).filter(Boolean))];
    locations.sort();
    
    // Clear existing options (except the first "all" option)
    locationFilter.innerHTML = '<option value="">Toutes les wilayas</option>';
    
    // Add location options
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationFilter.appendChild(option);
    });
}

loadFleet() {
    // NEW: Populate location filter dropdown
    this.populateTruckLocationFilter();
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const operations = this.getOperations();
    
    // Update trucks grid with new design
    const trucksContainer = document.getElementById('trucksGrid');
    if (trucksContainer) {
        trucksContainer.innerHTML = trucks.map(truck => {
            const driver = drivers.find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
            
            // FIXED: Get current operation sorted by earliest estimated departure
            const currentOperation = this.getTruckOperationsSortedByEstimated(truck.id);
            
            // Get ALL operations for this truck, sorted by estimated departure
            const allSortedOperations = this.getAllTruckOperationsSorted(truck.id);
            
            // Calculate availability status
            const availability = this.calculateTruckAvailabilityStatus(truck);
            
            // Calculate current location based on operation status
            const currentLocation = this.calculateCurrentLocation(truck, currentOperation);
            
            // Check maintenance status
            const maintenanceInfo = this.getMaintenanceDisplayInfo(truck);
            
            return `
                <div class="truck-card" data-truck-id="${truck.id}" onclick="app.toggleTruckExpansion(${truck.id})">
                    <!-- Availability Banner -->
                    <div class="truck-availability-banner availability-${availability.class}">
                        ${availability.text}
                    </div>
                    
                    <!-- Truck Header -->
                    <div class="truck-card-header">
                        <div class="truck-name-display">${truck.brand} ${truck.model}</div>
                        <div class="truck-registration-display">${truck.registration}</div>
                    </div>
                    
                    <!-- Driver Rectangle -->
                    <div class="truck-driver-rectangle">
                        ${driver ? `
                            <div class="truck-driver-name">Chauffeur: ${driver.name}</div>
                            <div class="truck-driver-phone">${driver.phone || 'Téléphone non renseigné'}</div>
                        ` : `
                            <div class="truck-driver-name">Aucun chauffeur assigné</div>
                        `}
                    </div>
                    
                    <!-- Current Operation Info (NEXT by departure time) -->
                    ${currentOperation ? `
                        <div class="truck-operation-info current-operation-highlight">
                            <div class="operation-info-title">🚨 PROCHAINE Opération (${this.formatAlgeriaDateTime(currentOperation.estimated_departure)})</div>
                            <div class="operation-info-details">
                                ${currentOperation.operation_number || currentOperation.id} — ${currentOperation.departure_location} → ${currentOperation.arrival_location}
                            </div>
                            <div class="operation-status">
                                Statut: ${this.getOperationStatusDisplayName(currentOperation.status)}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- ALL Operations List (in expanded details) -->
                    ${allSortedOperations.length > 1 ? `
                        <div class="truck-all-operations" style="display: none;">
                            <div class="operations-list-title">📋 Toutes les opérations (triées par départ estimé):</div>
                            ${allSortedOperations.map((op, index) => `
                                <div class="operation-queue-item ${index === 0 ? 'next-operation' : 'pending-operation'}">
                                    <div class="queue-position">${index === 0 ? '🔥 SUIVANTE' : `${index + 1}ème`}</div>
                                    <div class="queue-operation">
                                        ${op.operation_number || op.id} - ${op.departure_location} → ${op.arrival_location}
                                    </div>
                                    <div class="queue-time">
                                        Départ: ${this.formatAlgeriaDateTime(op.estimated_departure)}
                                    </div>
                                    <div class="queue-status">
                                        ${this.getOperationStatusDisplayName(op.status)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <!-- Maintenance Warning (if applicable) -->
                    ${maintenanceInfo.isInMaintenance || maintenanceInfo.hasMaintenanceHistory ? `
                        <div class="truck-maintenance-warning">
                            <div class="maintenance-warning-text">
                                ⚠️ ${maintenanceInfo.displayText || maintenanceInfo.type}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Essential Info Summary -->
                    <div class="truck-essential-info">
                        <div class="essential-info-item">
                            <span class="essential-info-label">Capacité:</span>
                            <span class="essential-info-value">${truck.capacity || 25} tonnes</span>
                        </div>
                        <div class="essential-info-item">
                            <span class="essential-info-label">Localisation:</span>
                            <span class="essential-info-value">
                                ${currentLocation}
                                ${truck.gps_location ? `
                                    <a href="${truck.gps_location}" target="_blank" class="truck-gps-link" title="Voir sur Google Maps">
                                        <i data-lucide="external-link"></i>
                                    </a>
                                ` : ''}
                            </span>
                        </div>
                        <div class="essential-info-item">
                            <span class="essential-info-label">Carte Naftal:</span>
                            <span class="essential-info-value">${truck.carte_naftal || 'Non attribuée'}</span>
                        </div>
                    </div>
                    
                    <!-- Expanded Details (Hidden by default) -->
                    <div class="truck-expanded-details">
                        <div class="expanded-details-grid">
                            <div class="expanded-detail-item">
                                <span class="expanded-detail-label">Année</span>
                                <span class="expanded-detail-value">${truck.year || 'Non spécifiée'}</span>
                            </div>
                            <div class="expanded-detail-item">
                                <span class="expanded-detail-label">Capacité</span>
                                <span class="expanded-detail-value">${truck.capacity} tonnes</span>
                            </div>
                            <div class="expanded-detail-item">
                                <span class="expanded-detail-label">Carte Naftal</span>
                                <span class="expanded-detail-value">${truck.carte_naftal || 'Non attribuée'}</span>
                            </div>
                            <div class="expanded-detail-item">
                                <div class="expanded-detail-label">État Maintenance:</div>
                                <div class="expanded-detail-value">${maintenanceInfo.displayText || this.getMaintenanceDisplayName(truck.maintenance_status || 'operational')}</div>
                            </div>
                            <div class="expanded-detail-item">
                                <div class="expanded-detail-label">Maintenance dernière:</div>
                                <div class="expanded-detail-value">${truck.last_maintenance ? this.formatDate(truck.last_maintenance) : 'Non renseigné'}</div>
                            </div>
                        </div>
                        
                        <!-- Show ALL operations in expanded view -->
                        ${allSortedOperations.length > 0 ? `
                            <div class="expanded-operations-section">
                                <h4>📅 File d'attente des opérations (par ordre de départ estimé)</h4>
                                <div class="operations-queue">
                                    ${allSortedOperations.map((op, index) => `
                                        <div class="expanded-operation-item ${index === 0 ? 'highlighted-next' : ''}">
                                            <div class="expanded-op-header">
                                                <span class="expanded-op-position">${index === 0 ? '🔥 PROCHAINE' : `Position ${index + 1}`}</span>
                                                <span class="expanded-op-number">${op.operation_number || op.id}</span>
                                                <span class="expanded-op-status status-${op.status}">${this.getOperationStatusDisplayName(op.status)}</span>
                                            </div>
                                            <div class="expanded-op-route">
                                                📍 ${op.departure_location} → 🎯 ${op.arrival_location}
                                            </div>
                                            <div class="expanded-op-client">
                                                👤 Client: ${op.client_name || 'Non défini'}
                                            </div>
                                            <div class="expanded-op-timing">
                                                ⏰ Départ estimé: ${this.formatAlgeriaDateTime(op.estimated_departure)}
                                            </div>
                                            ${op.estimated_arrival ? `
                                                <div class="expanded-op-timing">
                                                    🏁 Arrivée estimée: ${this.formatAlgeriaDateTime(op.estimated_arrival)}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${maintenanceInfo.isInMaintenance || maintenanceInfo.hasMaintenanceHistory ? `
                            <div class="expanded-detail-item" style="grid-column: 1 / -1; margin-top: var(--space-12);">
                                <span class="expanded-detail-label">Maintenance/Vidange</span>
                                <span class="expanded-detail-value">
                                    ${maintenanceInfo.isInMaintenance ? 
                                        `🔧 ${maintenanceInfo.type} - ${maintenanceInfo.dateRange}` : 
                                        `✅ Dernière: ${this.getMaintenanceDisplayName(truck.maintenance_status || 'operational')}`
                                    }
                                </span>
                            </div>
                        ` : ''}
                        
                        <!-- Actions -->
                        <div class="truck-actions" style="margin-top: var(--space-16); display: flex; gap: var(--space-8); justify-content: center;">
                            ${['dispatcher', 'admin'].includes(this.currentUser.role) ? `
                                <button class="btn btn--outline btn--sm" onclick="event.stopPropagation(); app.editTruck(${truck.id})">
                                    <i data-lucide="edit"></i>
                                    Modifier
                                </button>
                                <button class="btn btn--outline btn--sm" style="color: var(--color-error);" onclick="event.stopPropagation(); app.deleteTruck(${truck.id})">
                                    <i data-lucide="trash-2"></i>
                                    Supprimer
                                </button>
                            ` : ''}
                        </div>
                        
                        <div class="expanded-close-hint">
                            Cliquez à l'extérieur pour fermer les détails
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Keep the existing drivers grid code unchanged
    const driversContainer = document.getElementById('driversGrid');
    if (driversContainer) {
        // Your existing drivers code stays the same
        driversContainer.innerHTML = drivers.map(driver => {
            const assignedTruck = trucks.find(t => t.assigned_driver_id === driver.id);
            
            return `
                <div class="driver-card">
                    <div class="driver-header">
                        <div class="driver-name">${driver.name}</div>
                        <span class="status-badge status-${driver.status === 'available' ? 'success' : driver.status === 'busy' ? 'warning' : 'info'}">${driver.status === 'available' ? 'Disponible' : driver.status === 'busy' ? 'En mission' : 'Indisponible'}</span>
                    </div>
                    <div class="driver-details">
                        <div class="driver-detail">
                            <i data-lucide="credit-card"></i>
                            <span>Permis: ${driver.license_number}</span>
                        </div>
                        <div class="driver-detail">
                            <i data-lucide="phone"></i>
                            <span>${driver.phone || 'Non renseigné'}</span>
                        </div>
                        <div class="driver-detail">
                            <i data-lucide="map-pin"></i>
                            <span>${driver.current_location}</span>
                        </div>
                        <div class="driver-detail">
                            <i data-lucide="calendar"></i>
                            <span>${driver.experience_years} ans d'expérience</span>
                        </div>
                        ${assignedTruck ? `
                            <div class="driver-detail">
                                <i data-lucide="car"></i>
                                <span>Camion: ${assignedTruck.brand} ${assignedTruck.model} (${assignedTruck.registration})</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="driver-actions">
                        ${['dispatcher', 'admin'].includes(this.currentUser.role) ? `
                            <button class="btn btn--outline btn--sm" onclick="app.editDriver(${driver.id})">
                                <i data-lucide="edit"></i>
                                Modifier
                            </button>
                            <button class="btn btn--outline btn--sm" style="color: var(--color-error);" onclick="app.deleteDriver(${driver.id})">
                                <i data-lucide="trash-2"></i>
                                Supprimer
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Initialize icons
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 100);
}
// Calculate truck availability status
calculateTruckAvailabilityStatus(truck) {
    const maintenanceInfo = this.getMaintenanceDisplayInfo(truck);
    
    if (maintenanceInfo.isInMaintenance) {
        return {
            class: 'maintenance',
            text: `🔧 ${maintenanceInfo.type}`
        };
    }
    
    switch (truck.status) {
        case 'available':
            return {
                class: 'available',
                text: '✅ Disponible'
            };
        case 'busy':
            return {
                class: 'busy',
                text: '🚛 En mission'
            };
        case 'blocked':
            return {
                class: 'blocked',
                text: '⛔ Bloqué'
            };
        default:
            return {
                class: 'available',
                text: '✅ Disponible'
            };
    }
}

// Calculate current location based on operation status
calculateCurrentLocation(truck, currentOperation) {
    // If truck has an active operation, location is determined by operation status
    if (currentOperation) {
        switch (currentOperation.status) {
            case 'en_attente':
            case 'demarree':
            case 'arrivee_site_chargement':
                // During loading phase - truck is at departure wilaya
                return `${currentOperation.departure_location} (Chargement)`;
                
            case 'chargement_termine':
                // After loading - truck is en route
                return `En route: ${currentOperation.departure_location} → ${currentOperation.arrival_location}`;
                
            case 'arrivee_site_destination':
                // Arrived at destination - truck is at destination wilaya
                return `${currentOperation.arrival_location} (Déchargement)`;
                
            case 'dechargement_termine':
                // Operation completed - destination becomes new base location
                return `${currentOperation.arrival_location} (Terminé)`;
                
            default:
                return `En opération`;
        }
    }
    
    // If no active operation, use truck's base location or last known location
    return truck.current_location || truck.base_location || 'Non spécifiée';
}
updateTruckLocationAfterOperation(truckId, operationId, destinationWilaya) {
    const trucks = this.getTrucks();
    const truckIndex = trucks.findIndex(t => t.id === truckId);
    
    if (truckIndex !== -1) {
        // Set destination wilaya as new base location
        trucks[truckIndex].current_location = destinationWilaya;
        trucks[truckIndex].base_location = destinationWilaya;
        
        // Save updated trucks
        localStorage.setItem('trucks', JSON.stringify(trucks));
        
        // Log the location change
        console.log(`Truck ${truckId} location updated to: ${destinationWilaya}`);
    }
}

// Get maintenance display information with proper date logic
getMaintenanceDisplayInfo(truck) {
    // If no maintenance status or operational, return default
    if (!truck.maintenance_status || truck.maintenance_status === 'operational') {
        return {
            isInMaintenance: false,
            hasMaintenanceHistory: false,
            type: '',
            dateRange: '',
            displayText: ''
        };
    }
    
    const maintenanceInfo = truck.maintenance_info || {};
    const now = new Date();
    const startDate = maintenanceInfo.start_date ? new Date(maintenanceInfo.start_date) : null;
    const endDate = maintenanceInfo.end_date ? new Date(maintenanceInfo.end_date) : null;
    
    // Get the display name for the maintenance type
    const maintenanceType = this.getMaintenanceDisplayName(truck.maintenance_status);
    
    // Check if currently in maintenance period
    const isCurrentlyInMaintenance = startDate && endDate && now >= startDate && now <= endDate;
    
    if (isCurrentlyInMaintenance) {
        return {
            isInMaintenance: true,
            hasMaintenanceHistory: true,
            type: maintenanceType,
            dateRange: `${this.formatDate(maintenanceInfo.start_date)} → ${this.formatDate(maintenanceInfo.end_date)}`,
            displayText: `${maintenanceType} (${this.formatDate(maintenanceInfo.start_date)} → ${this.formatDate(maintenanceInfo.end_date)})`
        };
    } else if (endDate && now > endDate) {
        // Maintenance completed, should return to operational
        // Update truck status automatically
        this.updateTruckMaintenanceStatus(truck.id, 'operational');
        return {
            isInMaintenance: false,
            hasMaintenanceHistory: true,
            type: maintenanceType,
            dateRange: `Terminée le ${this.formatDate(maintenanceInfo.end_date)}`,
            displayText: `${maintenanceType} - Terminée le ${this.formatDate(maintenanceInfo.end_date)}`
        };
    }
    
    // Future maintenance or no dates
    return {
        isInMaintenance: false,
        hasMaintenanceHistory: true,
        type: maintenanceType,
        dateRange: startDate ? `Prévue: ${this.formatDate(maintenanceInfo.start_date)}` : '',
        displayText: startDate ? `${maintenanceType} - Prévue: ${this.formatDate(maintenanceInfo.start_date)}` : maintenanceType
    };
}

// Update truck maintenance status automatically
updateTruckMaintenanceStatus(truckId, newStatus) {
    const trucks = this.getTrucks();
    const truck = trucks.find(t => t.id === truckId);
    
    if (truck && truck.maintenance_status !== newStatus) {
        truck.maintenance_status = newStatus;
        if (newStatus === 'operational') {
            truck.status = 'available';
            // Clear maintenance info but keep history
            if (truck.maintenance_info) {
                truck.maintenance_info.completed_at = new Date().toISOString();
            }
        }
        this.saveTrucks(trucks);
    }
}

// Toggle truck expansion
toggleTruckExpansion(truckId) {
    // Close any currently expanded cards first
    document.querySelectorAll('.truck-card.expanded').forEach(card => {
        if (parseInt(card.dataset.truckId) !== truckId) {
            card.classList.remove('expanded');
        }
    });
    
    // Toggle the clicked card
    const card = document.querySelector(`[data-truck-id="${truckId}"]`);
    if (card) {
        card.classList.toggle('expanded');
    }
}

// Close expanded cards when clicking outside
closeExpandedCardsOnOutsideClick() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.truck-card')) {
            document.querySelectorAll('.truck-card.expanded').forEach(card => {
                card.classList.remove('expanded');
            });
        }
    });
}



// Enhanced truck grid with status management
loadTrucksGrid(trucks) {
    const container = document.getElementById('trucksGrid');
    if (!container) return;
    
    container.innerHTML = trucks.map(truck => {
        const driver = this.getDrivers().find(d => d.id === truck.assigned_driver_id);
        const currentOperation = this.getOperations().find(op => 
            op.assigned_truck_id === truck.id && ['demarree', 'arrivee'].includes(op.status)
        );
        
        return `
            <div class="truck-card">
                <div class="truck-header">
                    <h4>${truck.brand} ${truck.model}</h4>
                    <div class="truck-status-badge status-${truck.status}">
                        ${this.getTruckStatusDisplayName(truck.status)}
                    </div>
                </div>
                
                <div class="truck-details">
                    <div class="detail-row">
                        <span>Immatriculation:</span>
                        <strong>${truck.registration}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Capacité:</span>
                        <strong>${truck.capacity}t</strong>
                    </div>
                    <div class="detail-row">
                        <span>Localisation:</span>
                        <strong>${truck.current_location}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Chauffeur:</span>
                        <strong>${driver ? driver.name : 'Non assigné'}</strong>
                    </div>
                    ${truck.carte_naftal ? `
                        <div class="detail-row">
                            <span>Carte Naftal:</span>
                            <strong>${truck.carte_naftal}</strong>
                        </div>
                    ` : ''}
                </div>
                
                ${currentOperation ? `
                    <div class="current-operation">
                        <h5>Opération en cours:</h5>
                        <p>OP${currentOperation.operation_number} - ${currentOperation.destination_name}</p>
                        <p>Statut: ${this.getOperationStatusDisplayName(currentOperation.status)}</p>
                    </div>
                ` : ''}
                
                <div class="truck-actions">
                    ${['admin', 'dispatcher'].includes(this.currentUser.role) ? `
                        <div class="status-management">
                            <h6>Changer le statut:</h6>
                            <div class="status-buttons">
                                <button class="btn btn--sm btn-status ${truck.status === 'available' ? 'btn--success' : 'btn--outline'}" 
                                        onclick="app.changeTruckStatus(${truck.id}, 'available')"
                                        ${truck.status === 'available' ? 'disabled' : ''}>
                                    Disponible
                                </button>
                                <button class="btn btn--sm btn-status ${truck.status === 'maintenance' ? 'btn--warning' : 'btn--outline'}" 
                                        onclick="app.changeTruckStatus(${truck.id}, 'maintenance')"
                                        ${truck.status === 'maintenance' ? 'disabled' : ''}>
                                    Maintenance
                                </button>
                                <button class="btn btn--sm btn-status ${truck.status === 'out_of_service' ? 'btn--error' : 'btn--outline'}" 
                                        onclick="app.changeTruckStatus(${truck.id}, 'out_of_service')"
                                        ${truck.status === 'out_of_service' ? 'disabled' : ''}>
                                    Hors Service
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="edit-actions">
                        <button class="btn btn--outline btn--sm" onclick="app.editTruck(${truck.id})">
                            <i data-lucide="edit"></i>
                            Modifier
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// NEW: Change truck status with operation handling
changeTruckStatus(truckId, newStatus) {
    const trucks = this.getTrucks();
    const truck = trucks.find(t => t.id === truckId);
    if (!truck) return;
    
    // Check for active operations
    const activeOperation = this.getOperations().find(op => 
        op.assigned_truck_id === truckId && ['demarree', 'arrivee'].includes(op.status)
    );
    
    if (activeOperation && newStatus !== 'busy') {
        const confirmTerminate = confirm(`Ce camion a une opération active (OP${activeOperation.operation_number}).\n\nVoulez-vous terminer l'opération pour changer le statut?`);
        
        if (confirmTerminate) {
            // Terminate the operation
            this.terminateOperation(activeOperation.id);
        } else {
            return;
        }
    }
    
    // Update truck status
    truck.status = newStatus;
    truck.last_status_change = new Date().toISOString();
    truck.status_changed_by = this.currentUser.name;
    
    // If setting to available, clear mission assignment
    if (newStatus === 'available') {
        truck.current_mission_id = null;
        truck.next_available_time = null;
        
        // Also update driver if assigned
        if (truck.assigned_driver_id) {
            this.updateDriverStatus(truck.assigned_driver_id, 'available');
        }
    }
    
    this.saveTrucks(trucks);
    
    // Add activity log
    this.addActivity(`Statut camion ${truck.registration} changé: ${newStatus}`, 'settings');
    
    // Refresh display
    this.loadFleet();
    
    // Show success message
    alert(`Statut du camion ${truck.registration} changé vers: ${this.getTruckStatusDisplayName(newStatus)}`);
}

// NEW: Terminate operation
terminateOperation(operationId) {
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;
    
    // Update operation status
    operation.status = 'terminee';
    operation.real_arrival_time = new Date().toISOString();
    operation.terminated_by = this.currentUser.name;
    operation.termination_reason = 'Terminé manuellement pour changement de statut';
    
    this.saveOperations(operations);
    
    // Update mission status if all operations are complete
    this.checkMissionCompletion(operation.mission_id);
    
    this.addActivity(`Opération OP${operation.operation_number} terminée manuellement`, 'square');
}

// Helper function for truck status display names
getTruckStatusDisplayName(status) {
    const statusNames = {
        'available': 'Disponible',
        'busy': 'En mission',
        'maintenance': 'Maintenance',
        'out_of_service': 'Hors service'
    };
    return statusNames[status] || status;
}

// NEW: Change driver status
changeDriverStatus(driverId, newStatus) {
    const drivers = this.getDrivers();
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    // Check for active operations
    const activeOperation = this.getOperations().find(op => 
        op.assigned_driver_id === driverId && ['demarree', 'arrivee'].includes(op.status)
    );
    
    if (activeOperation && newStatus !== 'busy') {
        const confirmTerminate = confirm(`Ce chauffeur a une opération active (OP${activeOperation.operation_number}).\n\nVoulez-vous terminer l'opération pour changer le statut?`);
        
        if (confirmTerminate) {
            this.terminateOperation(activeOperation.id);
        } else {
            return;
        }
    }
    
    // Update driver status
    driver.status = newStatus;
    driver.last_status_change = new Date().toISOString();
    driver.status_changed_by = this.currentUser.name;
    
    if (newStatus === 'available') {
        driver.current_mission_id = null;
    }
    
    this.saveDrivers(drivers);
    this.addActivity(`Statut chauffeur ${driver.name} changé: ${newStatus}`, 'user');
    this.loadFleet();
    
    alert(`Statut du chauffeur ${driver.name} changé vers: ${this.getDriverStatusDisplayName(newStatus)}`);
}

// Helper function for driver status display names  
getDriverStatusDisplayName(status) {
    const statusNames = {
        'available': 'Disponible',
        'busy': 'En mission',
        'on_leave': 'En congé',
        'sick': 'Malade'
    };
    return statusNames[status] || status;
}

loadTrucks() {
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const container = document.getElementById('trucksGrid');
    
    if (!container) return;
    
    container.innerHTML = trucks.map(truck => {
        const assignedDriver = drivers.find(d => d.id === truck.permanent_driver_id || d.id === truck.assigned_driver_id);
        const canSeeCarteNaftal = ['admin', 'dispatcher'].includes(this.currentUser.role);
        
        return `
            <div class="truck-card">
                <div class="truck-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-16);">
                    <div>
                        <h4 style="margin: 0; color: var(--color-text);">${truck.brand} ${truck.model}</h4>
                        <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${truck.registration}</div>
                    </div>
                    <span class="status-badge status-${truck.status === 'available' ? 'validée' : 'en_cours'}">
                        ${truck.status === 'available' ? 'Disponible' : 'Occupé'}
                    </span>
                </div>
                <div class="truck-details" style="display: grid; gap: var(--space-8); font-size: var(--font-size-sm);">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--color-text-secondary);">Année:</span>
                        <span>${truck.year || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--color-text-secondary);">Capacité:</span>
                        <span>${truck.capacity ? truck.capacity + 't' : '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--color-text-secondary);">Localisation:</span>
                        <span>${truck.current_location}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--color-text-secondary);">Chauffeur Assigné:</span>
                        <span style="font-weight: var(--font-weight-semibold); color: var(--color-primary);">${assignedDriver ? assignedDriver.name : 'Non assigné'}</span>
                    </div>
                    ${canSeeCarteNaftal ? `
                        <div style="display: flex; justify-content: space-between; background: rgba(var(--color-primary-rgb), 0.1); padding: var(--space-8); border-radius: var(--radius-sm); border-left: 3px solid var(--color-primary);">
                            <span style="color: var(--color-primary); font-weight: var(--font-weight-semibold);">Carte Naftal:</span>
                            <span style="font-weight: var(--font-weight-semibold); color: var(--color-primary);">${truck.carte_naftal || 'Non définie'}</span>
                        </div>
                    ` : ''}
                    ${truck.next_available_time ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--color-text-secondary);">Disponible:</span>
                            <span>${this.formatDateTime(truck.next_available_time)}</span>
                        </div>
                    ` : ''}
                </div>
                <div style="margin-top: var(--space-16); display: flex; gap: var(--space-8); justify-content: flex-end;">
                    ${['dispatcher', 'admin'].includes(this.currentUser.role) ? `
                        <button class="btn btn--outline btn--sm" onclick="app.editTruck(${truck.id})" title="Modifier">
                            <i data-lucide="edit"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn--outline btn--sm" onclick="app.deleteTruck(${truck.id})" style="color: var(--color-error);">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    if (trucks.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--color-text-secondary); padding: var(--space-32);">Aucun camion enregistré</div>';
    }
}
    
loadDrivers() {
    const drivers = this.getDrivers();
    const container = document.getElementById('driversGrid');
    
    if (!container) {
        console.error('Drivers container not found!');
        return;
    }
    
    if (drivers.length === 0) {
        container.innerHTML = `
            <div class="drivers-empty-state">
                <h3>Aucun chauffeur enregistré</h3>
                <p>Commencez par ajouter des chauffeurs à votre flotte</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = drivers.map(driver => {
        // Calculate experience level for stars
        const experienceLevel = Math.min(Math.floor(driver.experience_years / 3), 5);
        const stars = '⭐'.repeat(experienceLevel) + '☆'.repeat(5 - experienceLevel);
        
        return `
            <div class="driver-card">
                <div class="driver-header">
                    <div>
                        <h4>${driver.name}</h4>
                        <div class="driver-license">${driver.license_number}</div>
                    </div>
                    <span class="driver-status-badge driver-status-${driver.status === 'available' ? 'available' : driver.status === 'busy' ? 'busy' : 'unavailable'}">
                        ${driver.status === 'available' ? 'Disponible' : driver.status === 'busy' ? 'En mission' : 'Indisponible'}
                    </span>
                </div>
                
                <div class="driver-details">
                    <div class="driver-detail">
                        <i class="driver-detail-icon" data-lucide="phone"></i>
                        <span class="driver-detail-label">Téléphone:</span>
                        <span class="driver-detail-value driver-phone">${driver.phone || 'Non renseigné'}</span>
                    </div>
                    
                    <div class="driver-detail">
                        <i class="driver-detail-icon" data-lucide="calendar"></i>
                        <span class="driver-detail-label">Expérience:</span>
                        <div class="driver-detail-value driver-experience">
                            <span>${driver.experience_years ? driver.experience_years + ' ans' : '-'}</span>
                            <span class="experience-stars" title="Niveau d'expérience">${stars}</span>
                        </div>
                    </div>
                    
                    <div class="driver-detail">
                        <i class="driver-detail-icon" data-lucide="map-pin"></i>
                        <span class="driver-detail-label">Position:</span>
                        <span class="driver-detail-value driver-location">${driver.current_location}</span>
                    </div>
                    
                    ${driver.assigned_truck_id ? `
                        <div class="driver-detail">
                            <i class="driver-detail-icon" data-lucide="truck"></i>
                            <span class="driver-detail-label">Camion:</span>
                            <span class="driver-detail-value">Assigné</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="driver-actions">
                    ${['dispatcher', 'admin'].includes(this.currentUser.role) ? `
                        <button class="driver-action-btn" onclick="app.editDriver(${driver.id})" title="Modifier">
                            <i data-lucide="edit"></i>
                            Modifier
                        </button>
                    ` : ''}
                    <button class="driver-action-btn delete-btn" onclick="app.deleteDriver(${driver.id})" title="Supprimer">
                        <i data-lucide="trash-2"></i>
                        Supprimer
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Initialize Lucide icons
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 100);
    
    console.log('Enhanced drivers loaded successfully');
}
// Add this method to check driver data
checkDriverData() {
    const driversData = localStorage.getItem('transport_drivers');
    console.log('Raw drivers data:', driversData);
    
    if (!driversData) {
        console.log('No driver data found, initializing...');
        this.initializeSampleData();
        return;
    }
    
    try {
        const drivers = JSON.parse(driversData);
        console.log('Parsed drivers:', drivers);
        console.log('Number of drivers:', drivers.length);
        
        drivers.forEach((driver, index) => {
            console.log(`Driver ${index + 1}:`, driver);
        });
        
    } catch (error) {
        console.error('Error parsing driver data:', error);
        // Reset driver data if corrupted
        localStorage.removeItem('transport_drivers');
        this.initializeSampleData();
    }
}


editDriver(driverId) {
    if (!['dispatcher', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les répartiteurs et administrateurs peuvent modifier les chauffeurs');
        return;
    }
    
    const drivers = this.getDrivers();
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    this.currentEditingDriverId = driverId;
    
    // Open driver modal and populate with existing data
    this.openModal('driverModal');
    
    // Wait for modal to be loaded
    setTimeout(() => {
        // Change modal title
        document.querySelector('#driverModal .modal-header h3').textContent = 'Modifier Chauffeur';
        document.querySelector('#driverModal button[type="submit"]').innerHTML = '<i data-lucide="save"></i> Modifier le chauffeur';
        
        // Populate form fields
        document.getElementById('driverName').value = driver.name || '';
        document.getElementById('driverLicense').value = driver.license_number || '';
        document.getElementById('driverPhone').value = driver.phone || '';
        document.getElementById('driverExperience').value = driver.experience_years || '';
        document.getElementById('driverLocation').value = driver.current_location || '';
    }, 100);
}
    
    deleteTruck(truckId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce camion?')) {
            return;
        }
        
        const trucks = this.getTrucks();
        const truckIndex = trucks.findIndex(t => t.id === truckId);
        
        if (truckIndex !== -1) {
            const truckName = `${trucks[truckIndex].brand} ${trucks[truckIndex].model}`;
            trucks.splice(truckIndex, 1);
            this.saveTrucks(trucks);
            
            this.addActivity(`Camion supprimé: ${truckName}`, 'car');
            this.loadSectionData(this.currentSection);
            alert('Camion supprimé avec succès!');
        }
    }
    
    deleteDriver(driverId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce chauffeur?')) {
            return;
        }
        
        const drivers = this.getDrivers();
        const driverIndex = drivers.findIndex(d => d.id === driverId);
        
        if (driverIndex !== -1) {
            const driverName = drivers[driverIndex].name;
            drivers.splice(driverIndex, 1);
            this.saveDrivers(drivers);
            
            // Remove driver assignments from trucks
            const trucks = this.getTrucks();
            trucks.forEach(truck => {
                if (truck.assigned_driver_id === driverId) {
                    truck.assigned_driver_id = null;
                }
            });
            this.saveTrucks(trucks);
            
            this.addActivity(`Chauffeur supprimé: ${driverName}`, 'user-x');
            this.loadSectionData(this.currentSection);
            alert('Chauffeur supprimé avec succès!');
        }
    }
    
    // Tracking Board
loadTracking() {
    console.log('Loading tracking section...');
    
    // Initialize filter population
    setTimeout(() => {
        this.populateAllOperationFilters();
        this.loadOperationsTable();
    }, 100);
    
    // Debug: Check operations count
    const operations = this.getOperations();
    console.log(`Loaded ${operations.length} operations in tracking section`);
}





// FIXED: Load operations table with FORCED Algeria timezone display
// FIXED: Load operations table with FORCED Algeria timezone display
loadOperationsTable() {
    const operations = this.getOperations();
    const tableBody = document.getElementById('operationsTableBody');
    
    if (!tableBody) {
        console.error('Operations table body not found');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (operations.length === 0) {
        // Updated colspan to 25 (added 2 for the new GPS columns)
        tableBody.innerHTML = '<tr><td colspan="25" style="text-align: center; color: var(--color-text-secondary); padding: var(--space-32);">Aucune opération trouvée</td></tr>';
        return;
    }
    
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    console.log('🇩🇿 Loading operations table with ALGERIA TIMEZONE (GMT+1)');
    
    operations.forEach(operation => {
        const truck = trucks.find(t => t.id === operation.assigned_truck_id);
        const driver = drivers.find(d => d.id === operation.assigned_driver_id);
        
        // ✅ FORCE ALL TIMESTAMPS TO ALGERIA TIME (+1 HOUR)
        const estimatedDeparture = operation.estimated_departure ? 
            this.convertToAlgeriaTime(operation.estimated_departure) : 'Non défini';
        const estimatedArrival = operation.estimated_arrival ? 
            this.convertToAlgeriaTime(operation.estimated_arrival) : 'Non défini';
        const realDeparture = operation.real_departure_time ? 
            this.convertToAlgeriaTime(operation.real_departure_time) : '';
        const arriveeChargement = operation.arrivee_site_chargement ? 
            this.convertToAlgeriaTime(operation.arrivee_site_chargement) : '';
        const chargementTermine = operation.chargement_termine ? 
            this.convertToAlgeriaTime(operation.chargement_termine) : '';
        const arriveeDestination = operation.arrivee_site_destination ? 
            this.convertToAlgeriaTime(operation.arrivee_site_destination) : '';
        const dechargementTermine = operation.dechargement_termine ? 
            this.convertToAlgeriaTime(operation.dechargement_termine) : '';
        
        // ✅ NEW: Create separate GPS columns
// ✅ NEW: Create FANCY GPS columns
const gpsDepart = operation.departure_gps ? 
    `<a href="${operation.departure_gps}" target="_blank" class="gps-mini-link" title="GPS Départ">
        <i data-lucide="navigation" style="width: 12px; height: 12px;"></i>
    </a>` : 
    `<span style="color: #ccc; font-size: 10px;">⚪</span>`;

const gpsDestination = operation.arrival_gps ? 
    `<a href="${operation.arrival_gps}" target="_blank" class="gps-mini-link" title="GPS Destination">
        <i data-lucide="map-pin" style="width: 12px; height: 12px;"></i>
    </a>` : 
    `<span style="color: #ccc; font-size: 10px;">⚪</span>`;

        
        const row = document.createElement('tr');
        row.className = 'operation-row';
        row.innerHTML = `
            <td class="sticky-col select-col">
                <input type="checkbox" class="operation-checkbox" value="${operation.id}">
            </td>
            <td class="sticky-col actions-col">
${['coordinator', 'admin', 'dispatcher'].includes(this.currentUser.role) ? `
    <button class="modify-btn" onclick="app.openOperationDrawer(${operation.id})" title="Modifier cette opération">
        <i data-lucide="edit"></i>
        Modifier
    </button>
` : `
    <span style="color: #999; font-size: 12px;">Modification<br>non autorisée</span>
`}

            </td>
<td><span class="truck-info-highlight">${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'Non assigné'}</span></td>
            <td>${driver ? driver.name : 'Non assigné'}</td>

            <td>
                <span class="status-badge status-${operation.status}">
                    ${this.getOperationStatusDisplayName(operation.status)}
                </span>
            </td>
            <td class="gps-column">${gpsDepart}</td>
            <td class="gps-column">${gpsDestination}</td>
            <td style="font-family: var(--font-family-mono); font-weight: var(--font-weight-semibold);">
                ${operation.operation_number || `OP${String(operation.mission_id).padStart(3, '0')}-${operation.id}`}
            </td>
            <td>MSN${String(operation.mission_id).padStart(3, '0')}</td>
            <td>${operation.client_name || 'Non spécifié'}</td>
            <td class="destination-cell">${this.getDestinationWithContact(operation)}</td>
            <td>${operation.departure_location || 'Non spécifié'}</td>
            <td>${operation.arrival_location || 'Non spécifié'}</td>
            <td class="time-column algeria-time" style="color: #2563eb; font-weight: 600; background-color: #f0f9ff;">${estimatedDeparture}</td>
            <td class="time-column algeria-time" style="color: #2563eb; font-weight: 600; background-color: #f0f9ff;">${estimatedArrival}</td>
            <td class="real-departure time-column algeria-time ${realDeparture ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${realDeparture}</td>
            <td class="arrivee-chargement time-column algeria-time ${arriveeChargement ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${arriveeChargement}</td>
            <td class="chargement-termine time-column algeria-time ${chargementTermine ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${chargementTermine}</td>
            <td class="arrivee-destination time-column algeria-time ${arriveeDestination ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${arriveeDestination}</td>
            <td class="dechargement-termine time-column algeria-time ${dechargementTermine ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${dechargementTermine}</td>
            <td>${operation.temps_chargement ? `${operation.temps_chargement} min` : ''}</td>
            <td>${operation.temps_dechargement ? `${operation.temps_dechargement} min` : ''}</td>
            <td>${operation.temps_total_operation || ''}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Reinitialize icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
    
    console.log(`✅ Operations table loaded with ALGERIA TIME (+1 HOUR). Count: ${operations.length}`);
}
// === COMMENTS FEATURE: persistent per-operation comments ===
// Storage key: transport_operation_comments
initOperationCommentsStorage() {
  if (!localStorage.getItem('transport_operation_comments')) {
    localStorage.setItem('transport_operation_comments', JSON.stringify({}));
  }
}

getOperationCommentsMap() {
  try { return JSON.parse(localStorage.getItem('transport_operation_comments') || '{}'); }
  catch { return {}; }
}

saveOperationCommentsMap(map) {
  localStorage.setItem('transport_operation_comments', JSON.stringify(map));
}

getOperationCommentByKey(opKey) {
  const map = this.getOperationCommentsMap();
  return map[opKey] || '';
}

setOperationCommentByKey(opKey, text) {
  const map = this.getOperationCommentsMap();
  if (text && text.trim()) {
    map[opKey] = text.trim();
  } else {
    delete map[opKey];
  }
  this.saveOperationCommentsMap(map);
}

// Find column indexes by header text (Operations table)
computeOperationsTableColumnIndexes() {
  const table = document.getElementById('operationsTable');
  const thead = table ? table.querySelector('thead') : null;
  if (!thead) return { opNum: -1, comments: -1 };

  const ths = Array.from(thead.querySelectorAll('th'));
  const opNumIdx = ths.findIndex(th => th.textContent.trim().toLowerCase().includes('n° opération'));
  // Comments is the last header (we added it in HTML)
  const commentsIdx = ths.length - 1;
  return { opNum: opNumIdx, comments: commentsIdx };
}

// Create a compact textarea with handlers
createCommentInput(opKey, value) {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';

  const ta = document.createElement('textarea');
  ta.className = 'operation-comment-input';
  ta.placeholder = 'Commentaire… (Entrée = sauvegarder)';
  ta.value = value || '';

  // Save on Enter (without Shift)
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.setOperationCommentByKey(opKey, ta.value);
      this.showSavedTick(wrapper);
      ta.blur();
    }
  });

  // Also save on blur (optional, in case they click away)
  ta.addEventListener('blur', () => {
    this.setOperationCommentByKey(opKey, ta.value);
  });

  wrapper.appendChild(ta);
  return wrapper;
}

showSavedTick(wrapper) {
  // Remove any previous tick
  const old = wrapper.querySelector('.comment-saved-tick');
  if (old) old.remove();
  const ok = document.createElement('div');
  ok.className = 'comment-saved-tick';
  ok.textContent = '✓ Sauvegardé';
  wrapper.appendChild(ok);
  setTimeout(() => ok.remove(), 1200);
}

// Inject header safety (if something re-renders head)
injectCommentsHeaderIntoOperationsTable() {
  const table = document.getElementById('operationsTable');
  const thead = table ? table.querySelector('thead') : null;
  const row = thead ? thead.querySelector('tr') : null;
  if (!row) return;

  const hasCommentsHeader = Array.from(row.children).some(th => th.classList.contains('comments-col'));
  if (!hasCommentsHeader) {
    const th = document.createElement('th');
    th.className = 'comments-col';
    th.textContent = 'Commentaires';
    row.appendChild(th);
  }
}

// Inject a comments cell into each operations row
injectCommentsCellsIntoOperationsTable() {
  const table = document.getElementById('operationsTable');
  const tbody = table ? table.querySelector('tbody#operationsTableBody') : null;
  if (!tbody) return;

  const { opNum, comments } = this.computeOperationsTableColumnIndexes();
  if (opNum === -1 || comments === -1) return;

  Array.from(tbody.querySelectorAll('tr')).forEach((tr) => {
    // Avoid duplicating our cell
    const existing = tr.querySelector('td.comments-cell');
    if (existing) return;

    const tds = Array.from(tr.children);
    // Find operation number cell safely
    const opNumCell = tds[opNum];
    if (!opNumCell) return;

    const opKey = (opNumCell.textContent || '').trim();
    if (!opKey) return;

    const td = document.createElement('td');
    td.className = 'comments-cell';
    const existingValue = this.getOperationCommentByKey(opKey);
    const input = this.createCommentInput(opKey, existingValue);
    td.appendChild(input);

    // Append as last cell to align with header
    tr.appendChild(td);
  });
}

// Observe Operations table changes and keep comments column in sync
observeOperationsTable() {
  const tbody = document.querySelector('#operationsTableBody');
  if (!tbody) return;

  // Initial pass
  this.injectCommentsHeaderIntoOperationsTable();
  this.injectCommentsCellsIntoOperationsTable();

  const obs = new MutationObserver(() => {
    this.injectCommentsHeaderIntoOperationsTable();
    this.injectCommentsCellsIntoOperationsTable();
  });
  obs.observe(tbody, { childList: true, subtree: false });
  this._opsTableObserver = obs;
}

// ===== Reports (Operations) — add Comments column in generated report table =====
computeReportOpNumberColIndex() {
  const thead = document.getElementById('reportTableHead');
  if (!thead) return -1;
  const ths = Array.from(thead.querySelectorAll('th'));
  // Find “N°” or “N° Opération”
  const idx = ths.findIndex(th => th.textContent.trim().toLowerCase().includes('n°'));
  return idx;
}

injectCommentsHeaderIntoReport() {
  const thead = document.getElementById('reportTableHead');
  if (!thead) return;
  const row = thead.querySelector('tr');
  if (!row) return;

  const already = row.querySelector('th[data-comments-col="1"]');
  if (already) return;

  const th = document.createElement('th');
  th.textContent = 'Commentaires';
  th.setAttribute('data-comments-col', '1');
  row.appendChild(th);
}

injectCommentsCellsIntoReport() {
  // Only when the selected report type is "operations"
  const selectedType = document.querySelector('input[name="reportType"]:checked');
  if (!selectedType || selectedType.value !== 'operations') return;

  const tbody = document.getElementById('reportTableBody');
  if (!tbody) return;

  const opColIdx = this.computeReportOpNumberColIndex();
  if (opColIdx === -1) return;

  this.injectCommentsHeaderIntoReport();

  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.forEach((tr) => {
    const already = tr.querySelector('td.report-comment-cell');
    if (already) return;

    const cells = Array.from(tr.children);
    const opCell = cells[opColIdx];
    if (!opCell) return;

    const opKey = (opCell.textContent || '').trim();
    const td = document.createElement('td');
    td.className = 'report-comment-cell';

    // Same compact control in report so it’s visible and exports with the table
    const val = this.getOperationCommentByKey(opKey);
    const input = this.createCommentInput(opKey, val);
    td.appendChild(input);

    tr.appendChild(td);
  });
}

// Observe report body so after Generate/Refresh we attach our column
observeReportsTable() {
  const tbody = document.getElementById('reportTableBody');
  if (!tbody) return;

  // Initial pass (in case table is already visible)
  this.injectCommentsCellsIntoReport();

  const obs = new MutationObserver(() => {
    this.injectCommentsCellsIntoReport();
  });
  obs.observe(tbody, { childList: true, subtree: false });
  this._reportsObserver = obs;
}

// Master switch to enable feature
enableOperationCommentsFeature() {
  try {
    this.initOperationCommentsStorage();
    // Operations table live augmentation
    this.observeOperationsTable();
    // Reports (Operations) augmentation
    this.observeReportsTable();
  } catch (e) {
    console.error('Comments feature init failed:', e);
  }
}

// NEW: FORCE Algeria timezone conversion (GMT+1)
// FIXED: FORCE Algeria timezone conversion (UTC+1) - FINAL VERSION
forceAlgeriaTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        // Parse the timestamp (assumes it's in UTC)
        let utcDate = new Date(timestamp);
        
        // Handle different timestamp formats
        if (isNaN(utcDate.getTime())) {
            // Try alternative parsing for different formats
            if (typeof timestamp === 'string') {
                // Handle "YYYY-MM-DD HH:MM:SS" format
                const cleanTimestamp = timestamp.replace(' ', 'T');
                utcDate = new Date(cleanTimestamp);
                
                // If still invalid, try adding Z for UTC
                if (isNaN(utcDate.getTime())) {
                    utcDate = new Date(cleanTimestamp + 'Z');
                }
            }
        }
        
        // Still invalid? Return the original
        if (isNaN(utcDate.getTime())) {
            console.warn('Invalid timestamp for Algeria formatting:', timestamp);
            return timestamp;
        }
        
        // CRITICAL FIX: Convert UTC to Algeria time (UTC+1)
        // Algeria is always UTC+1 (no daylight saving time)
        const algeriaTime = new Date(utcDate.getTime() + (1 * 60 * 60 * 1000));
        
        // Format as DD/MM/YYYY HH:MM (Algeria format)
        const day = String(algeriaTime.getUTCDate()).padStart(2, '0');
        const month = String(algeriaTime.getUTCMonth() + 1).padStart(2, '0');
        const year = algeriaTime.getUTCFullYear();
        const hours = String(algeriaTime.getUTCHours()).padStart(2, '0');
        const minutes = String(algeriaTime.getUTCMinutes()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
        
    } catch (error) {
        console.error('Error in forceAlgeriaTime:', error);
        return timestamp || '';
    }
}
// BACKUP: Simple +1 hour conversion for Algeria
convertToAlgeriaTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        
        if (isNaN(date.getTime())) {
            return timestamp;
        }
        
        // Add exactly 1 hour for Algeria time (UTC+1)
        const algeriaDate = new Date(date.getTime() + (1 * 60 * 60 * 1000));
        
        // Format: DD/MM/YYYY HH:MM
        const day = String(algeriaDate.getUTCDate()).padStart(2, '0');
        const month = String(algeriaDate.getUTCMonth() + 1).padStart(2, '0');
        const year = algeriaDate.getUTCFullYear();
        const hours = String(algeriaDate.getUTCHours()).padStart(2, '0');
        const minutes = String(algeriaDate.getUTCMinutes()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
        
    } catch (error) {
        console.error('Error converting to Algeria time:', error);
        return timestamp;
    }
}

// NEW: Read-only operation consultation for planners
openOperationConsultation(operationId) {
    if (!['planner', 'dispatcher', 'admin', 'coordinator'].includes(this.currentUser.role)) {
        alert('Accès non autorisé');
        return;
    }

    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    if (!operation) {
        alert('Opération introuvable');
        return;
    }

    // For planners, show read-only view
    if (this.currentUser.role === 'planner') {
        this.showOperationReadOnlyView(operation);
    } else {
        // For coordinators and admins, open full edit drawer
        this.openOperationDrawer(operationId);
    }
}

// NEW: Read-only operation view for planners
showOperationReadOnlyView(operation) {
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const missions = this.getMissions();
    
    const truck = trucks.find(t => t.id === operation.assigned_truck_id);
    const driver = drivers.find(d => d.id === operation.assigned_driver_id);
    const mission = missions.find(m => m.id === operation.mission_id);

    const content = `
        <div class="operation-consultation-content">
            <h3>Consultation Opération ${operation.operation_number}</h3>
            <div class="consultation-details">
                <div class="detail-section">
                    <h4>Informations Mission</h4>
                    <p><strong>Mission:</strong> ${mission ? mission.client_name : 'N/A'}</p>
                    <p><strong>Client:</strong> ${operation.client_name || 'N/A'}</p>
                    <p><strong>Destination:</strong> ${operation.destination_name || operation.arrival_location}</p>
                    <p><strong>Statut:</strong> <span class="status-badge status-${operation.status}">${this.getOperationStatusDisplayName(operation.status)}</span></p>
                </div>
                
                <div class="detail-section">
                    <h4>Assignations</h4>
                    <p><strong>Camion:</strong> ${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'Non assigné'}</p>
                    <p><strong>Chauffeur:</strong> ${driver ? driver.name : 'Non assigné'}</p>
                </div>
                
                <div class="detail-section">
                    <h4>Planification</h4>
                    <p><strong>Départ estimé:</strong> ${operation.estimated_departure ? this.formatDateTime(operation.estimated_departure) : '-'}</p>
                    <p><strong>Arrivée estimée:</strong> ${operation.estimated_arrival ? this.formatDateTime(operation.estimated_arrival) : '-'}</p>
                    <p><strong>Départ réel:</strong> ${operation.real_departure_time ? this.formatDateTime(operation.real_departure_time) : 'En attente'}</p>
                    <p><strong>Temps chargement:</strong> ${operation.charging_time || '-'}</p>
                </div>
            </div>
            
            <div class="consultation-note">
                <i data-lucide="info"></i>
                <span>Consultation en lecture seule - Seuls les coordinateurs peuvent modifier les opérations</span>
            </div>
            
            <div class="consultation-actions">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn--outline">Fermer</button>
            </div>
        </div>
    `;

    // Create and show consultation popup
    const popup = document.createElement('div');
    popup.className = 'operation-consultation-popup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-24);
        box-shadow: var(--shadow-modal);
        z-index: 1001;
        max-width: 600px;
        width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    popup.innerHTML = content;
    document.body.appendChild(popup);

    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
    `;
    backdrop.onclick = () => {
        document.body.removeChild(popup);
        document.body.removeChild(backdrop);
    };
    
    document.body.appendChild(backdrop);
    
    // Initialize icons
    this.initializeLucideIcons();
}

// NEW: Get Status Action Buttons (simplified)
getOperationStatusActions(operation) {
    const buttons = [];
    
    if (operation.status === 'en_attente' && ['coordinator', 'admin'].includes(this.currentUser.role)) {
        buttons.push(`<button class="btn btn--primary btn--sm" onclick="app.quickUpdateStatus('${operation.id}', 'demarree')" title="Démarrer">
            <i data-lucide="play"></i>
        </button>`);
    }
    
    if (operation.status === 'demarree' && ['coordinator', 'admin'].includes(this.currentUser.role)) {
        buttons.push(`<button class="btn btn--success btn--sm" onclick="app.quickUpdateStatus('${operation.id}', 'arrivee')" title="Arrivée">
            <i data-lucide="map-pin"></i>
        </button>`);
    }
    
    if (operation.status === 'arrivee' && ['coordinator', 'admin'].includes(this.currentUser.role)) {
        buttons.push(`<button class="btn btn--primary btn--sm" onclick="app.quickUpdateStatus('${operation.id}', 'terminee')" title="Terminer">
            <i data-lucide="check"></i>
        </button>`);
    }
    
    return buttons.join(' ');
}
// COMPACT FILTER MENU FUNCTIONS


// Enhanced filter population
// FIXED: Enhanced filter population with correct mapping
// FIXED: Populate all operation filters with proper data
populateAllOperationFilters() {
    const operations = this.getOperations();
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const clients = this.getClients();

    // Populate mission checkboxes
    const missionCheckboxes = document.getElementById('missionCheckboxes');
    if (missionCheckboxes) {
        const uniqueMissions = [...new Set(operations.map(op => `MSN${String(op.mission_id).padStart(3, '0')} - ${op.client_name}`))];
        missionCheckboxes.innerHTML = uniqueMissions.map(mission => `
            <label class="checkbox-item">
                <input type="checkbox" value="${mission}" data-filter="mission">
                <span class="checkmark"></span>
                <span class="label-text">${mission}</span>
            </label>
        `).join('');
    }

    // Populate client checkboxes
    const clientCheckboxes = document.getElementById('clientCheckboxes');
    if (clientCheckboxes) {
        const uniqueClients = [...new Set(operations.map(op => op.client_name).filter(Boolean))];
        clientCheckboxes.innerHTML = uniqueClients.map(client => `
            <label class="checkbox-item">
                <input type="checkbox" value="${client}" data-filter="client">
                <span class="checkmark"></span>
                <span class="label-text">${client}</span>
            </label>
        `).join('');
    }

    // Populate destination checkboxes
    const destinationCheckboxes = document.getElementById('destinationCheckboxes');
    if (destinationCheckboxes) {
        const uniqueDestinations = [...new Set(operations.map(op => op.destination_name || op.arrival_location).filter(Boolean))];
        destinationCheckboxes.innerHTML = uniqueDestinations.map(destination => `
            <label class="checkbox-item">
                <input type="checkbox" value="${destination}" data-filter="destination">
                <span class="checkmark"></span>
                <span class="label-text">${destination}</span>
            </label>
        `).join('');
    }

    // FIXED: Populate driver checkboxes with proper mapping
    const driverCheckboxes = document.getElementById('driverCheckboxes');
    if (driverCheckboxes) {
        const assignedDriverIds = [...new Set(operations.map(op => op.assigned_driver_id).filter(Boolean))];
        const assignedDrivers = drivers.filter(d => assignedDriverIds.includes(d.id));
        driverCheckboxes.innerHTML = assignedDrivers.map(driver => `
            <label class="checkbox-item">
                <input type="checkbox" value="${driver.name}" data-filter="driver">
                <span class="checkmark"></span>
                <span class="label-text">${driver.name}</span>
            </label>
        `).join('');
    }

    // FIXED: Populate truck checkboxes with proper mapping
    const truckCheckboxes = document.getElementById('truckCheckboxes');
    if (truckCheckboxes) {
        const assignedTruckIds = [...new Set(operations.map(op => op.assigned_truck_id).filter(Boolean))];
        const assignedTrucks = trucks.filter(t => assignedTruckIds.includes(t.id));
        truckCheckboxes.innerHTML = assignedTrucks.map(truck => `
            <label class="checkbox-item">
                <input type="checkbox" value="${truck.brand} ${truck.model} (${truck.registration})" data-filter="truck">
                <span class="checkmark"></span>
                <span class="label-text">${truck.brand} ${truck.model} (${truck.registration})</span>
            </label>
        `).join('');
    }
}
// Get destination name with contact person information
getDestinationWithContact(operation) {
    const destinationName = operation.destination_name || operation.arrival_location || 'Non spécifié';
    
    // Try to find the contact person from client data
    let contactPerson = '';
    
    if (operation.client_name && operation.destination_name) {
        const clients = this.getClients();
        const client = clients.find(c => c.name === operation.client_name);
        
        if (client && client.destinations) {
            const destination = client.destinations.find(d => d.name === operation.destination_name);
            if (destination && destination.contact_person) {
                contactPerson = destination.contact_person;
            }
        }
    }
    
    // Return destination with contact person on second line if available
    if (contactPerson) {
        return `${destinationName}<br><small style="color: #666; font-style: italic;">Contact: ${contactPerson}</small>`;
    } else {
        return destinationName;
    }
}

// Enhanced filter application - FIXED VERSION
// Enhanced filter application - FIXED VERSION
// FIXED: Enhanced filter application with proper mapping
// FIXED: Enhanced filter application with proper mapping
applyEnhancedOperationFilters() {
    const operations = this.getOperations();
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    let filteredOperations = [...operations];

    // Get all checked filter values from checkboxes
    const statusFilters = Array.from(document.querySelectorAll('input[data-filter="status"]:checked')).map(cb => cb.value);
    const missionFilters = Array.from(document.querySelectorAll('input[data-filter="mission"]:checked')).map(cb => cb.value);
    const clientFilters = Array.from(document.querySelectorAll('input[data-filter="client"]:checked')).map(cb => cb.value);
    const destinationFilters = Array.from(document.querySelectorAll('input[data-filter="destination"]:checked')).map(cb => cb.value);
    const driverFilters = Array.from(document.querySelectorAll('input[data-filter="driver"]:checked')).map(cb => cb.value);
    const truckFilters = Array.from(document.querySelectorAll('input[data-filter="truck"]:checked')).map(cb => cb.value);
    
    // Date filters
    const startDateFilter = document.getElementById('startDateFilter')?.value;
    const endDateFilter = document.getElementById('endDateFilter')?.value;

    // Apply status filters
    if (statusFilters.length > 0) {
        filteredOperations = filteredOperations.filter(op => statusFilters.includes(op.status));
    }

    // Apply mission filters - FIXED MAPPING
    if (missionFilters.length > 0) {
        filteredOperations = filteredOperations.filter(op => {
            const missionDisplay = `MSN${String(op.mission_id).padStart(3, '0')} - ${op.client_name}`;
            return missionFilters.includes(missionDisplay);
        });
    }

    // Apply client filters - FIXED MAPPING
    if (clientFilters.length > 0) {
        filteredOperations = filteredOperations.filter(op => clientFilters.includes(op.client_name));
    }

    // Apply destination filters - FIXED MAPPING
    if (destinationFilters.length > 0) {
        filteredOperations = filteredOperations.filter(op => 
            destinationFilters.includes(op.destination_name) || 
            destinationFilters.includes(op.arrival_location)
        );
    }

    // FIXED: Driver filter mapping
    if (driverFilters.length > 0) {
        filteredOperations = filteredOperations.filter(op => {
            const driver = drivers.find(d => d.id === op.assigned_driver_id);
            return driver && driverFilters.includes(driver.name);
        });
    }

    // FIXED: Truck filter mapping  
    if (truckFilters.length > 0) {
        filteredOperations = filteredOperations.filter(op => {
            const truck = trucks.find(t => t.id === op.assigned_truck_id);
            if (truck) {
                const truckDisplay = `${truck.brand} ${truck.model} (${truck.registration})`;
                return truckFilters.includes(truckDisplay);
            }
            return false;
        });
    }

    // Apply date filters - FIXED
    if (startDateFilter) {
        filteredOperations = filteredOperations.filter(op => {
            if (!op.estimated_departure) return false;
            const opDate = new Date(op.estimated_departure).toISOString().split('T')[0];
            return opDate >= startDateFilter;
        });
    }

    if (endDateFilter) {
        filteredOperations = filteredOperations.filter(op => {
            if (!op.estimated_departure) return false;
            const opDate = new Date(op.estimated_departure).toISOString().split('T')[0];
            return opDate <= endDateFilter;
        });
    }

    // Re-render the table with filtered data
    this.renderFilteredOperations(filteredOperations);
    
    // Update filter count
    const totalFilters = statusFilters.length + missionFilters.length + clientFilters.length + 
                        destinationFilters.length + driverFilters.length + truckFilters.length +
                        (startDateFilter ? 1 : 0) + (endDateFilter ? 1 : 0);
    
    const filterCount = document.getElementById('filterCount');
    if (filterCount) {
        filterCount.textContent = totalFilters;
        filterCount.classList.toggle('hidden', totalFilters === 0);
    }

    // Show success message
    this.showToast(`Filtres appliqués! ${filteredOperations.length} opération(s) trouvée(s).`, 'success');
}

// Display active filters
updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    if (!activeFiltersContainer) return;
    
    const activeFilters = [];
    
    // Check each filter and add to display if active
    const statusFilter = Array.from(document.getElementById('operationStatusFilter').selectedOptions);
    if (statusFilter.length > 0 && statusFilter[0].value !== '') {
        statusFilter.forEach(option => {
            activeFilters.push(`<span class="filter-badge">Statut: ${option.text} <button onclick="app.removeFilter('operationStatusFilter', '${option.value}')">×</button></span>`);
        });
    }
    
    // Similar for other filters...
    const clientFilter = Array.from(document.getElementById('operationClientFilter').selectedOptions);
    if (clientFilter.length > 0 && clientFilter[0].value !== '') {
        clientFilter.forEach(option => {
            activeFilters.push(`<span class="filter-badge">Client: ${option.text} <button onclick="app.removeFilter('operationClientFilter', '${option.value}')">×</button></span>`);
        });
    }
    
    activeFiltersContainer.innerHTML = activeFilters.join('');
}

// Remove individual filter
resetAllOperationFilters() {
    console.log('Resetting all operation filters...');
    
    // Reset all status checkboxes
    const statusCheckboxes = document.querySelectorAll('input[data-filter="status"]');
    statusCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset all mission checkboxes
    const missionCheckboxes = document.querySelectorAll('input[data-filter="mission"]');
    missionCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset all client checkboxes
    const clientCheckboxes = document.querySelectorAll('input[data-filter="client"]');
    clientCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset all destination checkboxes
    const destinationCheckboxes = document.querySelectorAll('input[data-filter="destination"]');
    destinationCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset all driver checkboxes
    const driverCheckboxes = document.querySelectorAll('input[data-filter="driver"]');
    driverCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset all truck checkboxes
    const truckCheckboxes = document.querySelectorAll('input[data-filter="truck"]');
    truckCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset date filters
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    
    if (startDateFilter) {
        startDateFilter.value = '';
    }
    if (endDateFilter) {
        endDateFilter.value = '';
    }
    
    // Clear active filters display
    const activeFilters = document.getElementById('activeFilters');
    if (activeFilters) {
        activeFilters.innerHTML = '';
    }
    
    // Reset filter count
    const filterCount = document.getElementById('filterCount');
    if (filterCount) {
        filterCount.textContent = '0';
        filterCount.classList.add('hidden');
    }
    
    // Reload the operations table with no filters
    this.loadOperationsTable();
    
    // Show success message
    this.showToast('Tous les filtres ont été réinitialisés', 'success');
    
    console.log('All filters reset successfully');
}
// NEW: Quick reset function for immediate filter clearing
quickResetAllFilters() {
    console.log('Quick reset triggered');
    
    // Clear all checkboxes at once
    const allFilterCheckboxes = document.querySelectorAll('[data-filter]');
    allFilterCheckboxes.forEach(checkbox => {
        if (checkbox.type === 'checkbox') {
            checkbox.checked = false;
        }
    });
    
    // Clear date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (input.id.includes('Filter')) {
            input.value = '';
        }
    });
    
    // Clear any select dropdowns that might exist
    const filterSelects = document.querySelectorAll('select[id*="Filter"]');
    filterSelects.forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Clear active filters display
    document.getElementById('activeFilters').innerHTML = '';
    
    // Reset filter count
    const filterCount = document.getElementById('filterCount');
    if (filterCount) {
        filterCount.textContent = '0';
        filterCount.classList.add('hidden');
    }
    
    // Reload operations without filters
    this.loadOperationsTable();
    
    alert('Tous les filtres ont été effacés !');
}


// NEW: Render filtered operations in the table
// FIXED: Render filtered operations with EXACT same structure as original table
renderFilteredOperations(filteredOperations) {
    const tableBody = document.getElementById('operationsTableBody');
    if (!tableBody) return;

    const trucks = this.getTrucks();
    const drivers = this.getDrivers();

    if (filteredOperations.length === 0) {
        // FIXED: Use correct colspan count (25 columns total)
        tableBody.innerHTML = `
            <tr>
                <td colspan="25" style="text-align: center; padding: var(--space-32); color: var(--color-text-secondary);">
                    Aucune opération trouvée avec les filtres sélectionnés
                </td>
            </tr>
        `;
        return;
    }

    // Clear existing content
    tableBody.innerHTML = '';

    console.log('🇩🇿 Rendering filtered operations with ALGERIA TIMEZONE (GMT+1)');

    filteredOperations.forEach(operation => {
        const truck = trucks.find(t => t.id === operation.assigned_truck_id);
        const driver = drivers.find(d => d.id === operation.assigned_driver_id);
        
        // ✅ FORCE ALL TIMESTAMPS TO ALGERIA TIME (+1 HOUR) - Same as original
        const estimatedDeparture = operation.estimated_departure ? 
            this.convertToAlgeriaTime(operation.estimated_departure) : 'Non défini';
        const estimatedArrival = operation.estimated_arrival ? 
            this.convertToAlgeriaTime(operation.estimated_arrival) : 'Non défini';
        const realDeparture = operation.real_departure_time ? 
            this.convertToAlgeriaTime(operation.real_departure_time) : '';
        const arriveeChargement = operation.arrivee_site_chargement ? 
            this.convertToAlgeriaTime(operation.arrivee_site_chargement) : '';
        const chargementTermine = operation.chargement_termine ? 
            this.convertToAlgeriaTime(operation.chargement_termine) : '';
        const arriveeDestination = operation.arrivee_site_destination ? 
            this.convertToAlgeriaTime(operation.arrivee_site_destination) : '';
        const dechargementTermine = operation.dechargement_termine ? 
            this.convertToAlgeriaTime(operation.dechargement_termine) : '';
        
        // ✅ Create FANCY GPS columns (same as original)
        const gpsDepart = operation.departure_gps ? 
            `<a href="${operation.departure_gps}" target="_blank" class="gps-mini-link" title="GPS Départ">
                <i data-lucide="navigation" style="width: 12px; height: 12px;"></i>
            </a>` : 
            `<span style="color: #ccc; font-size: 10px;">⚪</span>`;

        const gpsDestination = operation.arrival_gps ? 
            `<a href="${operation.arrival_gps}" target="_blank" class="gps-mini-link" title="GPS Destination">
                <i data-lucide="map-pin" style="width: 12px; height: 12px;"></i>
            </a>` : 
            `<span style="color: #ccc; font-size: 10px;">⚪</span>`;
        
        const row = document.createElement('tr');
        row.className = 'operation-row';
        row.innerHTML = `
            <td class="sticky-col select-col">
                <input type="checkbox" class="operation-checkbox" value="${operation.id}">
            </td>
            <td class="sticky-col actions-col">
${['coordinator', 'admin', 'dispatcher'].includes(this.currentUser.role) ? `
    <button class="modify-btn" onclick="app.openOperationDrawer(${operation.id})" title="Modifier cette opération">
        <i data-lucide="edit"></i>
        Modifier
    </button>
` : `
    <span style="color: #999; font-size: 12px;">Modification<br>non autorisée</span>
`}
            </td>
            <td>
                <span class="status-badge status-${operation.status}">
                    ${this.getOperationStatusDisplayName(operation.status)}
                </span>
            </td>
            <td class="gps-column">${gpsDepart}</td>
            <td class="gps-column">${gpsDestination}</td>
            <td style="font-family: var(--font-family-mono); font-weight: var(--font-weight-semibold);">
                ${operation.operation_number || `OP${String(operation.mission_id).padStart(3, '0')}-${operation.id}`}
            </td>
            <td>MSN${String(operation.mission_id).padStart(3, '0')}</td>
            <td>${operation.client_name || 'Non spécifié'}</td>
            <td class="destination-cell">${this.getDestinationWithContact(operation)}</td>
            <td>${operation.departure_location || 'Non spécifié'}</td>
            <td>${operation.arrival_location || 'Non spécifié'}</td>
            <td>${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'Non assigné'}</td>
            <td>${driver ? driver.name : 'Non assigné'}</td>
            <td class="time-column algeria-time" style="color: #2563eb; font-weight: 600; background-color: #f0f9ff;">${estimatedDeparture}</td>
            <td class="time-column algeria-time" style="color: #2563eb; font-weight: 600; background-color: #f0f9ff;">${estimatedArrival}</td>
            <td class="real-departure time-column algeria-time ${realDeparture ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${realDeparture}</td>
            <td class="arrivee-chargement time-column algeria-time ${arriveeChargement ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${arriveeChargement}</td>
            <td class="chargement-termine time-column algeria-time ${chargementTermine ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${chargementTermine}</td>
            <td class="arrivee-destination time-column algeria-time ${arriveeDestination ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${arriveeDestination}</td>
            <td class="dechargement-termine time-column algeria-time ${dechargementTermine ? 'has-value' : ''}" style="color: #059669; font-weight: 600; background-color: #f0fdf4;">${dechargementTermine}</td>
            <td>${operation.temps_chargement ? `${operation.temps_chargement} min` : ''}</td>
            <td>${operation.temps_dechargement ? `${operation.temps_dechargement} min` : ''}</td>
            <td>${operation.temps_total_operation || ''}</td>
        `;
        
        tableBody.appendChild(row);
    });

    // ✅ CRITICAL: Re-inject comments functionality after filtering (same as original)
    setTimeout(() => {
        this.injectCommentsHeaderIntoOperationsTable();
        this.injectCommentsCellsIntoOperationsTable();
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 100);
    
    console.log(`✅ Filtered operations table rendered with ALGERIA TIME (+1 HOUR). Count: ${filteredOperations.length}`);
}
renderFilteredOperationsAsCards(filteredOperations) {
    const container = document.getElementById('operationsContainer'); // You'll need to add this container
    
    if (!container) return;
    
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();

    if (filteredOperations.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: var(--space-32); color: var(--color-text-secondary);">
                Aucune opération trouvée avec les filtres sélectionnés
            </div>
        `;
        return;
    }

    // Render as cards instead of table rows
    container.innerHTML = filteredOperations.map(operation => {
        const truck = trucks.find(t => t.id === operation.assigned_truck_id);
        const driver = drivers.find(d => d.id === operation.assigned_driver_id);
        
        return `
            <div class="operation-card"> <!-- Use your existing card CSS classes -->
                <div class="operation-card-header">
                    <span class="status-badge status-${operation.status}">
                        ${this.getOperationStatusDisplayName(operation.status)}
                    </span>
                    <button class="btn btn--outline btn--sm" onclick="app.openOperationDrawer(${operation.id})">
                        <i data-lucide="edit"></i>
                        Modifier
                    </button>
                </div>
                <div class="operation-card-content">
                    <h4>${operation.operation_number || `OP${String(operation.mission_id).padStart(3, '0')}-${operation.id}`}</h4>
                    <p><strong>Mission:</strong> MSN${String(operation.mission_id).padStart(3, '0')}</p>
                    <p><strong>Client:</strong> ${operation.client_name || 'N/A'}</p>
                    <p><strong>Destination:</strong> ${operation.destination_name || 'N/A'}</p>
                    <p><strong>Camion:</strong> ${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'N/A'}</p>
                    <p><strong>Chauffeur:</strong> ${driver ? driver.name : 'N/A'}</p>
                    <p><strong>Départ Estimé:</strong> ${operation.estimated_departure ? this.formatAlgeriaDateTime(operation.estimated_departure) : 'N/A'}</p>
                </div>
            </div>
        `;
    }).join('');

    // Reinitialize Lucide icons
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 100);
}

// NEW: Quick Status Update (for the quick action buttons)
// NEW: Quick Status Update (for the quick action buttons)
quickUpdateStatus(operationId, newStatus) {
    console.log('Quick updating status for operation:', operationId, 'to:', newStatus);
    
    if (!['coordinator', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les coordinateurs et administrateurs peuvent modifier les statuts');
        return;
    }
    
    const operations = this.getOperations();
    const operation = operations.find(op => op.id == operationId);
    
    if (!operation) {
        console.error('Operation not found for quick update:', operationId);
        alert('Opération introuvable');
        return;
    }
    
    // Show confirmation dialog
    const statusDisplayName = this.getOperationStatusDisplayName(newStatus);
    if (!confirm(`Confirmer le changement de statut vers "${statusDisplayName}" pour l'opération ${operation.operation_number}?`)) {
        return;
    }
    
    // Use the main updateOperationStatus function to ensure proper timestamp recording
    this.updateOperationStatus(operationId, newStatus);
}

// ENHANCED: Open operation drawer with proper data population
// ENHANCED: Open operation drawer with FIXED timestamp handling
openOperationDrawer(operationId) {
    console.log('Opening operation drawer for:', operationId);
    
    // ADD THIS PERMISSION CHECK AT THE VERY BEGINNING
    if (!['coordinator', 'admin', 'dispatcher'].includes(this.currentUser.role)) {
        alert('Seuls les coordinateurs et administrateurs peuvent modifier les opérations');
        return;
    }
    
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    
    if (!operation) {
        console.error('Operation not found:', operationId);
        return;
    }
    
    document.getElementById('editOperationId').value = operation.id;
    document.getElementById('drawerTitle').textContent = `Modifier Opération ${operation.operation_number || operation.id}`;
    document.getElementById('operationSummary').textContent = `Opération ${operation.operation_number || operation.id}`;
    
    // Populate operation details
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const truck = trucks.find(t => t.id === operation.assigned_truck_id);
    const driver = drivers.find(d => d.id === operation.assigned_driver_id);
    
    document.getElementById('operationDetails').innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Mission:</span>
            <span class="detail-value">${operation.mission_number || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Client:</span>
            <span class="detail-value">${operation.client_name || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Destination:</span>
            <span class="detail-value">${operation.destination_name || operation.arrival_location || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Camion:</span>
            <span class="detail-value">${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Chauffeur:</span>
            <span class="detail-value">${driver ? driver.name : 'N/A'}</span>
        </div>
    `;
    
    document.getElementById('editOperationStatus').value = operation.status || 'en_attente';
    
    // CRITICAL FIX: Use the fixed formatting function for all timestamps
    document.getElementById('editRealDeparture').value = 
        operation.real_departure_time ? this.formatForDatetimeLocal(operation.real_departure_time) : '';
    
    document.getElementById('editArriveeChargement').value = 
        operation.arrivee_site_chargement ? this.formatForDatetimeLocal(operation.arrivee_site_chargement) : '';
    
    document.getElementById('editChargementTermine').value = 
        operation.chargement_termine ? this.formatForDatetimeLocal(operation.chargement_termine) : '';
    
    document.getElementById('editArriveeDestination').value = 
        operation.arrivee_site_destination ? this.formatForDatetimeLocal(operation.arrivee_site_destination) : '';
    
    document.getElementById('editDechargementTermine').value = 
        operation.dechargement_termine ? this.formatForDatetimeLocal(operation.dechargement_termine) : '';
    
    // Set calculated times (read-only fields)
    document.getElementById('editTempsChargement').value = operation.temps_chargement || '';
    document.getElementById('editTempsDechargement').value = operation.temps_dechargement || '';
    document.getElementById('editTempsTotal').value = operation.temps_total_operation || '';
    document.getElementById('editChargingTime').value = operation.charging_time_minutes || '';
    
    this.populateOperationDropdowns();
    
    // Set current selections
    if (operation.client_name) {
        document.getElementById('editOperationClient').value = operation.client_id || '';
    }
    if (operation.assigned_driver_id) {
        document.getElementById('editOperationDriver').value = operation.assigned_driver_id;
    }
    if (operation.assigned_truck_id) {
        document.getElementById('editOperationTruck').value = operation.assigned_truck_id;
    }
    
    // Show drawer
    const drawer = document.getElementById('operationDrawer');
    drawer.classList.remove('hidden');
    drawer.classList.add('active');
    
    const drawerContent = document.getElementById('drawerContent') || drawer.querySelector('.drawer-content');
    if (drawerContent) {
        drawerContent.scrollTop = 0;
    }
    
    console.log('Operation drawer opened successfully with fixed timestamps');
}

// Add this function to your TransportApp class
populateOperationDropdowns() {
    // Populate clients dropdown
    const clients = this.getClients();
    const clientSelect = document.getElementById('editOperationClient');
    clientSelect.innerHTML = '<option value="">Sélectionner un client</option>';
    clients.forEach(client => {
        clientSelect.innerHTML += `<option value="${client.id}">${client.name}</option>`;
    });
    
    // Populate drivers dropdown
    const drivers = this.getDrivers();
    const driverSelect = document.getElementById('editOperationDriver');
    driverSelect.innerHTML = '<option value="">Sélectionner un chauffeur</option>';
    drivers.forEach(driver => {
        driverSelect.innerHTML += `<option value="${driver.id}">${driver.name}</option>`;
    });
    
    // Populate trucks dropdown
    const trucks = this.getTrucks();
    const truckSelect = document.getElementById('editOperationTruck');
    truckSelect.innerHTML = '<option value="">Sélectionner un camion</option>';
    trucks.forEach(truck => {
        truckSelect.innerHTML += `<option value="${truck.id}">${truck.brand} ${truck.model} (${truck.registration})</option>`;
    });
}


// ENHANCED: Handle operation modification
// ENHANCED: Handle operation modification with FIXED timezone handling
// FIXED: Handle Operation Modification with proper timezone conversion
handleOperationModify(event) {
    event.preventDefault();
    event.stopPropagation();
    console.log('Operation modify handler called - TIMEZONE FIXED');
    
    // Check permissions
    if (!['coordinator', 'admin', 'dispatcher'].includes(this.currentUser.role)) {
        alert('Seuls les coordinateurs et administrateurs peuvent modifier les opérations');
        return;
    }
    
    const operationId = parseInt(document.getElementById('editOperationId').value);
    const operations = this.getOperations();
    const operationIndex = operations.findIndex(op => op.id === operationId);
    
    if (operationIndex === -1) {
        alert('Opération introuvable');
        return;
    }
    
    const operation = operations[operationIndex];
    const newStatus = document.getElementById('editOperationStatus').value;
    const oldStatus = operation.status;
    
    console.log('Modifying operation:', operation.operation_number || operation.id);
    
    let hasChanges = false;
    const currentAlgeriaTimestamp = this.getCurrentAlgiersTimestamp();
    
    try {
        // Handle status changes with automatic timestamp recording
        if (newStatus && newStatus !== oldStatus) {
            operation.status = newStatus;
            operation.last_status_update = currentAlgeriaTimestamp;
            operation.status_updated_by = this.currentUser.name;
            hasChanges = true;
            
            // Auto-record timestamps based on new status
            switch(newStatus) {
                case 'demarree':
                    if (!operation.real_departure_time) {
                        operation.real_departure_time = currentAlgeriaTimestamp;
                        operation.departure_recorded_by = this.currentUser.name;
                        // Update form display
                        document.getElementById('editRealDeparture').value = 
                            this.formatForDatetimeLocal(currentAlgeriaTimestamp);
                    }
                    break;
                    
                case 'arrivee_site_chargement':
                    if (!operation.arrivee_site_chargement) {
                        operation.arrivee_site_chargement = currentAlgeriaTimestamp;
                        operation.arrivee_chargement_recorded_by = this.currentUser.name;
                        document.getElementById('editArriveeChargement').value = 
                            this.formatForDatetimeLocal(currentAlgeriaTimestamp);
                    }
                    break;
                    
                case 'chargement_termine':
                    if (!operation.chargement_termine) {
                        operation.chargement_termine = currentAlgeriaTimestamp;
                        operation.chargement_recorded_by = this.currentUser.name;
                        document.getElementById('editChargementTermine').value = 
                            this.formatForDatetimeLocal(currentAlgeriaTimestamp);
                        
                        // Calculate loading time
                        if (operation.arrivee_site_chargement) {
                            const arrivalTime = new Date(operation.arrivee_site_chargement);
                            const loadingEndTime = new Date(currentAlgeriaTimestamp);
                            const loadingMinutes = Math.round((loadingEndTime - arrivalTime) / (1000 * 60));
                            operation.temps_chargement = Math.max(0, loadingMinutes);
                            document.getElementById('editTempsChargement').value = operation.temps_chargement;
                        }
                    }
                    break;
                    
                case 'arrivee_site_destination':
                    if (!operation.arrivee_site_destination) {
                        operation.arrivee_site_destination = currentAlgeriaTimestamp;
                        operation.arrivee_destination_recorded_by = this.currentUser.name;
                        document.getElementById('editArriveeDestination').value = 
                            this.formatForDatetimeLocal(currentAlgeriaTimestamp);
                    }
                    break;
                    
case 'dechargement_termine':
  if (!operation.dechargement_termine) {
    operation.dechargement_termine = currentAlgeriaTimestamp;
    operation.dechargement_recorded_by = this.currentUser.name;
    document.getElementById('editDechargementTermine').value =
      this.formatForDatetimeLocal(currentAlgeriaTimestamp);
	  // Add this after the operation status is updated to completed
if (newStatus === 'dechargement_termine' || newStatus === 'terminee') {
    // Advance to next operation based on earliest departure time
    this.advanceToNextOperation(operation.assigned_truck_id);
}

  }

  // Recompute unloading duration (destination -> end)
  if (operation.arrivee_site_destination) {
    const arr = operation.arrivee_site_destination;
    const end = operation.dechargement_termine;
    const d = this.computeDurationHM(arr, end);
    operation.temps_dechargement = d.totalMinutes;
    const out = document.getElementById('editTempsDechargement');
    if (out) out.value = d.totalMinutes; // keep the existing numeric minutes display
  }

  // Total = dechargement_termine - real_departure_time
  if (operation.real_departure_time) {
    const dAll = this.computeDurationHM(operation.real_departure_time, operation.dechargement_termine);
    // Save both a readable string and minutes
    operation.temps_total_operation = dAll.text; // e.g., "5h 07min"
    operation.temps_total_operation_minutes = dAll.totalMinutes;
    const totalOut = document.getElementById('editTempsTotal');
    if (totalOut) totalOut.value = dAll.text;
  }
  break;

            }
        }
		
        // Inside handleOperationModify(event), before saving:
const status = document.getElementById('editOperationStatus').value;
if (status === 'demarree' && !this.requirePermission('operations.start', 'Démarrage opération interdit')) return;
if (status === 'dechargement_termine' && !this.requirePermission('operations.terminate', 'Clôture opération interdite')) return;
if (status === 'annulee' && !this.requirePermission('operations.cancel', 'Annulation opération interdite')) return;

        // Handle manual time field updates (CRITICAL FIX)
        const timeFields = [
            { id: 'editRealDeparture', field: 'real_departure_time' },
            { id: 'editArriveeChargement', field: 'arrivee_site_chargement' },
            { id: 'editChargementTermine', field: 'chargement_termine' },
            { id: 'editArriveeDestination', field: 'arrivee_site_destination' },
            { id: 'editDechargementTermine', field: 'dechargement_termine' }
        ];
        
        timeFields.forEach(({ id, field }) => {
            const inputValue = document.getElementById(id).value;
            if (inputValue) {
                // Convert from datetime-local to UTC timestamp
                const convertedTimestamp = this.convertFromDatetimeLocal(inputValue);
                if (convertedTimestamp && convertedTimestamp !== operation[field]) {
                    operation[field] = convertedTimestamp;
                    hasChanges = true;
                    console.log(`Updated ${field}:`, convertedTimestamp);
                }
            }
        });
        
        // Recalculate times after manual updates
        if (hasChanges) {
            this.recalculateOperationTimes(operation);
            
            // Free resources if completed
            if (newStatus === 'dechargement_termine' || newStatus === 'terminee') {
                if (operation.assigned_truck_id) {
                    this.updateTruckStatus(operation.assigned_truck_id, 'available');
                }
                if (operation.assigned_driver_id) {
                    this.updateDriverStatus(operation.assigned_driver_id, 'available');
                }
            }
            
            // Update metadata
            operation.modified_at = currentAlgeriaTimestamp;
            operation.modified_by = this.currentUser.name;
            
            // Add to status history
            if (!operation.status_history) {
                operation.status_history = [];
            }
            
            operation.status_history.push({
                old_status: oldStatus,
                new_status: newStatus,
                timestamp: currentAlgeriaTimestamp,
                changed_by: this.currentUser.name,
                change_reason: 'Manual update with timezone fix'
            });
            
            // Save changes
            this.saveOperations(operations);
            this.calculateMissionStatusFromOperations(operation.mission_id);
            // Add this line after successful operation update
this.addEventToHistory('operation', `Opération ${operation.operation_number} - Statut: ${oldStatus} → ${newStatus}`, `Opération ${operationId}`);

            // Refresh displays
            this.loadOperationsTable();
            this.closeOperationDrawer();
            
            this.showToast(`Opération modifiée avec succès! Timezone: GMT+1`, 'success');
            this.addActivity(`Opération ${operation.operation_number || operation.id} modifiée (GMT+1)`, 'edit');
            
            console.log('Operation successfully modified with Algeria timezone');
        } else {
            this.showToast('Aucune modification détectée', 'info');
            this.closeOperationDrawer();
        }
        
    } catch (error) {
        console.error('Error saving operation with timezone fix:', error);
        alert('Erreur lors de la sauvegarde: ' + error.message);
    }
	        // IMPORTANT: Refresh 48h countdown when operations are modified
        if (hasChanges && (newStatus === 'dechargement_termine' || newStatus === 'terminee' || newStatus === 'annulee')) {
            // Operation completed or cancelled - refresh Gantt timeline to update 48h countdown
            setTimeout(() => {
                this.loadGanttTimeline();
            }, 500);
        }

}
// === DURATION HELPERS (add once) ===
// Returns {hours, minutes, text} where text is like "5h 32min"
computeDurationHM(startIso, endIso) {
  try {
    if (!startIso || !endIso) return { hours: 0, minutes: 0, text: '0h 0min' };
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { hours: 0, minutes: 0, text: '0h 0min' };
    const diffMs = Math.max(0, end - start);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes, text: `${hours}h ${minutes}min`, totalMinutes };
  } catch {
    return { hours: 0, minutes: 0, text: '0h 0min' };
  }
}

// Calculate operation times automatically
calculateOperationTimes() {
    const departure = document.getElementById('editRealDeparture').value;
    const arriveeChargement = document.getElementById('editArriveeChargement').value;
    const chargementTermine = document.getElementById('editChargementTermine').value;
    const arriveeDestination = document.getElementById('editArriveeDestination').value;
    const dechargementTermine = document.getElementById('editDechargementTermine').value;
    
    // Calculate temps chargement (chargement terminé - arrivée site chargement)
    if (arriveeChargement && chargementTermine) {
        const tempsChargement = this.calculateTimeDifference(arriveeChargement, chargementTermine);
        document.getElementById('editTempsChargement').value = tempsChargement;
    }
    
    // Calculate temps déchargement (déchargement terminé - arrivée site destination)
    if (arriveeDestination && dechargementTermine) {
        const tempsDechargement = this.calculateTimeDifference(arriveeDestination, dechargementTermine);
        document.getElementById('editTempsDechargement').value = tempsDechargement;
    }
    
// Calculate total operation time (Départ réel -> Déchargement terminé)
if (departure && dechargementTermine) {
  const dAll = this.computeDurationHM(departure, dechargementTermine);
  document.getElementById('editTempsTotal').value = dAll.text; // "Xh Ymin"
}

}

// Calculate time difference in minutes
calculateTimeDifference(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    return Math.round(diffMs / (1000 * 60)); // Convert to minutes
}

// Calculate time difference in hours and minutes
calculateTimeDifferenceHours(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
}

// Add event listeners for automatic calculations
addTimeCalculationListeners() {
    const timeInputs = [
        'editRealDeparture',
        'editArriveeChargement', 
        'editChargementTermine',
        'editArriveeDestination',
        'editDechargementTermine'
    ];
    
    timeInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', () => this.calculateOperationTimes());
        }
    });
}

// Calculate and set derived times for operation object
calculateAndSetDerivedTimes(operation) {
    // Calculate temps chargement
    if (operation.arrivee_site_chargement && operation.chargement_termine) {
        operation.temps_chargement = this.calculateTimeDifference(
            operation.arrivee_site_chargement, 
            operation.chargement_termine
        );
    }
    
    // Calculate temps déchargement  
    if (operation.arrivee_site_destination && operation.dechargement_termine) {
        operation.temps_dechargement = this.calculateTimeDifference(
            operation.arrivee_site_destination,
            operation.dechargement_termine
        );
    }
    
    // Calculate total operation time
    if (operation.real_departure_time && operation.dechargement_termine) {
        operation.temps_total_operation = this.calculateTimeDifferenceHours(
            operation.real_departure_time,
            operation.dechargement_termine
        );
    }
}

// NEW: Setup operation form listener to prevent app reset
setupOperationFormListener() {
    const operationForm = document.getElementById('operationModifyForm');
    if (operationForm) {
        console.log('Setting up operation form listener');
        
        // Remove any existing listeners by cloning the form
        const newForm = operationForm.cloneNode(true);
        operationForm.parentNode.replaceChild(newForm, operationForm);
        
        // Add the submit event listener
        newForm.addEventListener('submit', (e) => {
            e.preventDefault(); // CRITICAL: Stop page reload
            e.stopPropagation(); // CRITICAL: Stop event bubbling
            console.log('Form submission intercepted - no reload');
            
            // Call the modify handler
            this.handleOperationModify(e);
            return false;
        });
        
        console.log('Form listener setup complete');
    } else {
        console.error('operationModifyForm not found when setting up listener');
    }
}

// NEW: Populate client dropdown for operation modification
populateClientDropdownForOperation(selectId, currentClientName) {
    const clients = this.getClients();
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un client</option>';
    clients.forEach(client => {
        const selected = client.name === currentClientName ? 'selected' : '';
        select.innerHTML += `<option value="${client.id}" ${selected}>${client.name}</option>`;
    });
    
    // If a client is selected, populate destinations
    if (currentClientName) {
        const selectedClient = clients.find(c => c.name === currentClientName);
        if (selectedClient) {
            this.populateDestinationDropdownForOperation('editOperationDestination', selectedClient.destinations);
        }
    }
    
    // Add change event listener
    select.addEventListener('change', (e) => {
        const clientId = parseInt(e.target.value);
        const client = clients.find(c => c.id === clientId);
        if (client) {
            this.populateDestinationDropdownForOperation('editOperationDestination', client.destinations);
        } else {
            const destSelect = document.getElementById('editOperationDestination');
            if (destSelect) {
                destSelect.innerHTML = '<option value="">Sélectionner une destination</option>';
            }
        }
    });
}

// NEW: Populate destination dropdown for operation modification
populateDestinationDropdownForOperation(selectId, destinations, currentDestination = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner une destination</option>';
    if (destinations && destinations.length > 0) {
        destinations.forEach((destination, index) => {
            const selected = destination.name === currentDestination ? 'selected' : '';
            select.innerHTML += `<option value="${index}" ${selected}>${destination.name} (${destination.wilaya})</option>`;
        });
    }
}

// NEW: Function to close operation drawer
closeOperationDrawer() {
    console.log('Closing operation drawer');
    const drawer = document.getElementById('operationDrawer');
    if (drawer) {
        drawer.classList.remove('active');
        drawer.classList.add('hidden');
    }
}




// MISSING HELPER: Populate client dropdown for operations
populateClientDropdownForOperation(selectId, operation) {
    const clients = this.getClients();
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un client</option>';
    clients.forEach(client => {
        const selected = operation.client_name === client.name ? 'selected' : '';
        select.innerHTML += `<option value="${client.id}" ${selected}>${client.name}</option>`;
    });
    
    // If client is selected, populate destinations
    if (operation.client_name) {
        const selectedClient = clients.find(c => c.name === operation.client_name);
        if (selectedClient) {
            this.populateDestinationDropdownForOperation('editOperationDestination', selectedClient, operation.destination_name);
        }
    }
    
    // Add change event listener
    select.addEventListener('change', (e) => {
        const clientId = parseInt(e.target.value);
        const client = clients.find(c => c.id === clientId);
        if (client) {
            this.populateDestinationDropdownForOperation('editOperationDestination', client, '');
        } else {
            document.getElementById('editOperationDestination').innerHTML = '<option value="">Sélectionner une destination</option>';
        }
    });
}
// MISSING HELPER: Populate destination dropdown for operations
populateDestinationDropdownForOperation(selectId, client, selectedDestination) {
    const select = document.getElementById(selectId);
    if (!select || !client) return;
    
    select.innerHTML = '<option value="">Sélectionner une destination</option>';
    
    if (client.destinations && client.destinations.length > 0) {
        client.destinations.forEach((destination, index) => {
            const selected = destination.name === selectedDestination ? 'selected' : '';
            select.innerHTML += `<option value="${index}" ${selected}>${destination.name}</option>`;
        });
    }
}

// Add this method to handle form submission
handleOperationModifySubmit(e) {
    e.preventDefault();
    console.log('Direct form submission handler called');
    return this.handleOperationModify(e);
}

// NEW: Handle Operation Modification with Automatic Recalculation
handleOperationModify(e) {
    e.preventDefault();
    
    if (!this.ensureOperationDrawerFormExists()) {
        console.error('Operation modify form not found');
        return;
    }
    
    try {
        const operationId = parseInt(document.getElementById('editOperationId').value);
        const newStatus = document.getElementById('editOperationStatus').value;
        
        // Get current operation for comparison
        const operations = this.getOperations();
        const operationIndex = operations.findIndex(op => op.id === operationId);
        
        if (operationIndex === -1) {
            alert('Opération introuvable');
            return;
        }
        
        const operation = operations[operationIndex];
        const oldStatus = operation.status;
        
        // Collect form data
        const formData = {
            status: newStatus,
            real_departure_time: this.convertFromDatetimeLocal(document.getElementById('editRealDeparture').value),
            real_arrival_time: this.convertFromDatetimeLocal(document.getElementById('editRealArrival').value),
            arrivee_site_chargement: this.convertFromDatetimeLocal(document.getElementById('editArriveeChargement')?.value),
            chargement_termine: this.convertFromDatetimeLocal(document.getElementById('editChargementTermine')?.value),
            arrivee_site_destination: this.convertFromDatetimeLocal(document.getElementById('editArriveeDestination')?.value),
            dechargement_termine: this.convertFromDatetimeLocal(document.getElementById('editDechargementTermine')?.value),
            charging_time: parseInt(document.getElementById('editChargingTime')?.value) || null,
            assigned_driver_id: parseInt(document.getElementById('editOperationDriver')?.value) || operation.assigned_driver_id,
            assigned_truck_id: parseInt(document.getElementById('editOperationTruck')?.value) || operation.assigned_truck_id,
            client_name: document.getElementById('editOperationClient')?.value || operation.client_name,
            destination_name: document.getElementById('editOperationDestination')?.value || operation.destination_name
        };
        
        // Check for dispatcher overrides
        const dispatcherOverrides = {};
        const forceTrackStatus = document.getElementById('forceTrackStatus')?.value;
        const forceTruckLocation = document.getElementById('forceTruckLocation')?.value;
        const forceReason = document.getElementById('forceReason')?.value;
        
        if (forceTrackStatus) {
            dispatcherOverrides.truckStatus = forceTrackStatus;
        }
        if (forceTruckLocation) {
            dispatcherOverrides.truckLocation = forceTruckLocation;
        }
        if (forceReason) {
            dispatcherOverrides.reason = forceReason;
        }
        
        // Auto-fill timestamps based on status
        if (newStatus === 'demarree' && !formData.real_departure_time) {
            formData.real_departure_time = new Date().toISOString();
        }
        if (newStatus === 'arrivee_site_chargement' && !formData.arrivee_site_chargement) {
            formData.arrivee_site_chargement = new Date().toISOString();
        }
        if (newStatus === 'chargement_termine' && !formData.chargement_termine) {
            formData.chargement_termine = new Date().toISOString();
        }
        if (newStatus === 'arrivee_site_destination' && !formData.arrivee_site_destination) {
            formData.arrivee_site_destination = new Date().toISOString();
        }
        if (newStatus === 'dechargement_termine' && !formData.dechargement_termine) {
            formData.dechargement_termine = new Date().toISOString();
        }
        
        // Update operation
        const changesLog = [];
        let hasChanges = false;
        
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined && formData[key] !== operation[key]) {
                if (key === 'status') {
                    changesLog.push(`Statut: ${operation[key]} → ${formData[key]}`);
                }
                operation[key] = formData[key];
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            // Recalculate times
            this.recalculateOperationTimes(operation);
            
            // Add modification timestamp
            operation.last_modified_at = new Date().toISOString();
            operation.last_modified_by = this.currentUser.name;
            
            // Save operations
            this.saveOperations(operations);
            
            // APPLY CYCLIC UPDATES - This is the key addition
            if (oldStatus !== newStatus) {
                this.applyCyclicUpdates(operationId, newStatus, oldStatus);
            }
            
            // Apply dispatcher overrides if any
            if (Object.keys(dispatcherOverrides).length > 0) {
                this.applyDispatcherOverride(operationId, dispatcherOverrides);
            }
            
            // Update mission status automatically
            this.calculateMissionStatusFromOperations(operation.mission_id);
            
            // Refresh displays
            this.loadOperationsTable();
            this.closeOperationDrawer();
            
            // Show success message
            const changesMessage = changesLog.length > 0 ? 
                `Modifications cycliques appliquées! ${changesLog.join(', ')}` : 
                'Opération modifiée avec mise à jour cyclique!';
            this.showToast(changesMessage, 'success');
            
            this.addActivity(`Opération ${operation.operation_number || operation.id} modifiée avec mise à jour cyclique`, 'edit');
            
        } else {
            this.showToast('Aucune modification détectée', 'info');
            this.closeOperationDrawer();
        }
        
    } catch (error) {
        console.error('Error in handleOperationModify:', error);
        alert('Erreur lors de la modification: ' + error.message);
    }
}
// FIXED: Ensure operation drawer form elements exist
ensureOperationDrawerFormExists() {
    const form = document.getElementById('operationModifyForm');
    if (!form) {
        console.error('Operation modify form not found!');
        return false;
    }
    
    // Check for required form elements
    const requiredElements = [
        'editOperationId',
        'editOperationStatus',
        'editRealDeparture', 
        'editRealArrival',
        'editChargingTime',
        'editOperationDriver',
        'editOperationTruck',
        'editOperationClient',
        'editOperationDestination'
    ];
    
    for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
            console.error(`Required form element not found: ${elementId}`);
            return false;
        }
    }
    
    return true;
}


// Add this method to your TransportApp class
updateMissionStatusFromOperation(missionId, newStatus) {
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    // Prevent concurrent status updates
if (this.statusUpdateInProgress) return false;
this.statusUpdateInProgress = true;

    if (!mission) {
        console.error(`Mission with ID ${missionId} not found`);
        return false;
    }
    
    // Update mission status
    const oldStatus = mission.status;
    mission.status = newStatus;
    mission.last_modified_by = this.currentUser.name;
    mission.last_modified_at = new Date().toISOString();
    
    // Add to timeline
    mission.progress_timeline.push({
        status: newStatus,
        timestamp: new Date().toISOString(),
        user: this.currentUser.name,
        source: 'operation_update'
    });
    
    // Save missions
    this.saveMissions(missions);
    
    // Send notifications for status changes
    if (newStatus === 'probleme_signalee') {
        this.sendNotification('planner', 'mission_problem', 
            `Problème signalé sur mission ${mission.client_name} → ${mission.destination_name}`, {
                mission_id: mission.id,
                reporter: this.currentUser.name
            });
        
        this.sendNotification('dispatcher', 'mission_problem', 
            `Problème signalé sur mission ${mission.client_name} → ${mission.destination_name}`, {
                mission_id: mission.id,
                reporter: this.currentUser.name
            });
    } else if (newStatus === 'annulée') {
        this.sendNotification('planner', 'mission_cancelled', 
            `Mission annulée: ${mission.client_name} → ${mission.destination_name}`, {
                mission_id: mission.id,
                cancelled_by: this.currentUser.name
            });
    }
    
    this.addActivity(`Mission ${mission.client_name} - Statut changé: ${oldStatus} → ${newStatus}`, 'alert-triangle');
    this.statusUpdateInProgress = false;

    return true;
}

updateMissionStatusFromOperation(missionId, newStatus, reason) {
    try {
        const missions = this.getMissions();
        const mission = missions.find(m => m.id === missionId);
        if (mission) {
            mission.status = newStatus;
            mission.last_modified_by = this.currentUser.name;
            mission.last_modified_at = new Date().toISOString();
            mission.progress_timeline.push({
                status: newStatus,
                timestamp: new Date().toISOString(),
                user: this.currentUser.name,
                source: 'operation_update',
                reason: reason
            });
            this.saveMissions(missions);
        }
    } catch (error) {
        console.error('Error updating mission status:', error);
    }
}

// Recalculate operation times without changing source timestamps
recalculateOperationTimes(operation) {
    try {
        // Calculate loading time
        if (operation.arrivee_site_chargement && operation.chargement_termine) {
            const arrival = new Date(operation.arrivee_site_chargement);
            const loadingEnd = new Date(operation.chargement_termine);
            const loadingMinutes = Math.round((loadingEnd - arrival) / (1000 * 60));
            operation.temps_chargement = Math.max(0, loadingMinutes);
        }
        
        // Calculate unloading time
        if (operation.arrivee_site_destination && operation.dechargement_termine) {
            const arrivalDest = new Date(operation.arrivee_site_destination);
            const unloadingEnd = new Date(operation.dechargement_termine);
            const unloadingMinutes = Math.round((unloadingEnd - arrivalDest) / (1000 * 60));
            operation.temps_dechargement = Math.max(0, unloadingMinutes);
        }
        
// Calculate total operation time (exact)
if (operation.real_departure_time && operation.dechargement_termine) {
  const dAll = this.computeDurationHM(operation.real_departure_time, operation.dechargement_termine);
  operation.temps_total_operation = dAll.text;             // "Xh Ymin"
  operation.temps_total_operation_minutes = dAll.totalMinutes; // numeric if needed later
}

        
        console.log('Times recalculated successfully');
    } catch (error) {
        console.error('Error recalculating times:', error);
    }
}

// NEW: Calculate Charging Time
// Calculate charging time based on real departure and arrival times
calculateChargingTime(operation) {
    if (!operation.real_departure_time || !operation.real_arrival_time) {
        return 120; // Default 2 hours if no real times available
    }
    
    const departure = new Date(operation.real_departure_time);
    const arrival = new Date(operation.real_arrival_time);
    
    // Calculate total trip time in minutes
    const totalTripMinutes = (arrival - departure) / (1000 * 60);
    
    // Estimate driving time based on distance between locations
    const estimatedDrivingHours = this.estimateTravelTime(
        operation.departure_location, 
        operation.arrival_location
    );
    const estimatedDrivingMinutes = estimatedDrivingHours * 60;
    
    // Charging time = Total time - Driving time
    const chargingTime = Math.max(30, totalTripMinutes - estimatedDrivingMinutes); // Minimum 30 minutes
    
    return Math.round(chargingTime);
}


// NEW: Format DateTime for HTML Input
formatDateTimeForInput(dateString) {
    try {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    } catch (error) {
        return '';
    }
}

// NEW: Populate Driver Dropdown
populateDriverDropdown(selectId, selectedId = null) {
    const drivers = this.getDrivers();
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un chauffeur</option>';
    drivers.forEach(driver => {
        const selected = driver.id === selectedId ? 'selected' : '';
        select.innerHTML += `<option value="${driver.id}" ${selected}>${driver.name} (${driver.phone || 'N/A'})</option>`;
    });
}

// NEW: Populate Truck Dropdown
populateTruckDropdown(selectId, selectedId = null) {
    const trucks = this.getTrucks();
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un camion</option>';
    trucks.forEach(truck => {
        const selected = truck.id === selectedId ? 'selected' : '';
        select.innerHTML += `<option value="${truck.id}" ${selected}>${truck.brand} ${truck.model} (${truck.registration})</option>`;
    });
}

// NEW: Show Toast Notification
// Show Toast Notification
// NEW: Show toast notifications
showToast(message, type = 'info') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Initialize Lucide icons for the toast
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

populateOperationFilters() {
    const missions = this.getMissions().filter(m => m.assigned_trucks && m.assigned_trucks.length > 0);
    const missionFilter = document.getElementById('operationMissionFilter');
    
    if (missionFilter) {
        missionFilter.innerHTML = '<option value="">Toutes les missions</option>';
        missions.forEach(mission => {
            missionFilter.innerHTML += `<option value="${mission.id}">MSN${String(mission.id).padStart(3, '0')} - ${mission.client_name}</option>`;
        });
    }
}

getOperationStatusDisplayName(status) {
    const statusMap = {
        'en_attente': 'En attente',
        'demarree': 'Démarrée',
        'arrivee_site_chargement': 'Arrivée site chargement',
        'chargement_termine': 'Chargement terminé',
        'arrivee_site_destination': 'Arrivée site destination',
        'dechargement_termine': 'Déchargement terminé',
        'probleme_signalee': 'Problème signalé',
        'annulee': 'Annulée'
    };
    return statusMap[status] || status;
}





getOperationActionButtons(operation) {
    const buttons = [];
    
    // Status workflow buttons
    if (operation.status === 'en_attente' && ['coordinator', 'admin'].includes(this.currentUser.role)) {
        buttons.push(`<button class="btn btn--primary btn--sm" onclick="app.updateOperationStatus('${operation.id}', 'demarree')" title="Démarrer">
            <i data-lucide="play"></i>
        </button>`);
    }
    
    if (operation.status === 'demarree' && ['coordinator', 'admin'].includes(this.currentUser.role)) {
        buttons.push(`<button class="btn btn--success btn--sm" onclick="app.updateOperationStatus('${operation.id}', 'arrivee')" title="Arrivée">
            <i data-lucide="map-pin"></i>
        </button>`);
    }
    
    if (operation.status === 'arrivee' && ['coordinator', 'admin'].includes(this.currentUser.role)) {
        buttons.push(`<button class="btn btn--primary btn--sm" onclick="app.updateOperationStatus('${operation.id}', 'terminee')" title="Terminer">
            <i data-lucide="check"></i>
        </button>`);
    }
    
    // MODIFICATION BUTTON - This was missing!
    if (['coordinator', 'dispatcher', 'admin'].includes(this.currentUser.role)) {
        buttons.push(`<button class="btn btn--outline btn--sm" onclick="app.editOperation('${operation.id}')" title="Modifier" style="color: var(--color-warning);">
            <i data-lucide="edit"></i>
        </button>`);
    }
    
    // Fiche button - always visible
    buttons.push(`<button class="btn btn--outline btn--sm" onclick="app.showFicheOperation('${operation.id}')" title="Fiche">
        <i data-lucide="file-text"></i>
    </button>`);
    
    // Cancel button
    if (['coordinator', 'admin'].includes(this.currentUser.role) && operation.status !== 'terminee') {
        buttons.push(`<button class="btn btn--outline btn--sm" onclick="app.cancelOperation('${operation.id}')" title="Annuler" style="color: var(--color-error);">
            <i data-lucide="x"></i>
        </button>`);
    }
    
    return buttons.join(' ');
}

populateOperationFilters() {
    const missions = this.getMissions();
    const missionFilter = document.getElementById('operationMissionFilter');
    
    if (missionFilter) {
        missionFilter.innerHTML = '<option value="">Toutes les missions</option>';
        missions.forEach(mission => {
            missionFilter.innerHTML += `<option value="${mission.id}">MSN${String(mission.id).padStart(3, '0')} - ${mission.client_name}</option>`;
        });
    }
}

// REPLACE the entire showFicheMission function with this enhanced version:
showFicheMission(missionId) {
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const operations = this.getOperations().filter(op => op.mission_id === missionId);
    const destinations = this.getMissionDestinations(mission);
    
    const ficheContent = document.getElementById('ficheContent');
    if (!ficheContent) return;
    
    // Build the professional fiche content with logo
    ficheContent.innerHTML = `
        <!-- Professional Company Header -->
        <div class="fiche-professional-header">
            <div class="company-logo-section">
                <div class="company-logo-placeholder">
                    DED
                </div>
                <div class="fiche-company-title">DOUROUB EL DJAZAIR</div>
                <div class="fiche-company-subtitle">Système de Gestion de Transport Professionnel</div>
            </div>
            
            <table class="fiche-professional-table" style="font-size: 12px;">
                <tr>
                    <td><strong>Adresse:</strong> Zone Industrielle, Biskra</td>
                    <td><strong>Téléphone:</strong> +213 33 XX XX XX</td>
                    <td><strong>Email:</strong> contact@douroub-eljazair.dz</td>
                </tr>
                <tr>
                    <td><strong>RC:</strong> 12345678</td>
                    <td><strong>NIF:</strong> 987654321</td>
                    <td><strong>Activité:</strong> Transport et Logistique</td>
                </tr>
            </table>
        </div>
        
        <!-- Mission Title -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: var(--color-primary); font-size: 28px; margin: 0 0 8px 0; letter-spacing: 1px;">
                FICHE DE MISSION N° MSN${String(mission.id).padStart(3, '0')}
            </h2>
            <div style="font-size: 16px; color: var(--color-text-secondary);">
                Document généré le ${this.formatDateTime(new Date().toISOString())}
            </div>
        </div>
        
        <!-- Mission Information -->
        <div style="margin-bottom: 24px;">
            <h3 style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover)); color: white; padding: 12px 15px; margin: 0 0 15px 0; border-radius: 6px; font-size: 16px; display: flex; align-items: center; gap: 10px;">
                <i data-lucide="info"></i>
                Informations Mission
            </h3>
            
            <table class="fiche-professional-table">
                <tr>
                    <td class="fiche-label-professional">Client:</td>
                    <td class="fiche-value-professional">${mission.client_name}</td>
                    <td class="fiche-label-professional">Date Création:</td>
                    <td class="fiche-value-professional">${this.formatDateTime(mission.created_at)}</td>
                </tr>
                <tr>
                    <td class="fiche-label-professional">Statut:</td>
                    <td class="fiche-value-professional">
                        <span style="background: var(--color-primary); color: white; padding: 4px 8px; border-radius: 4px; display: inline-block; font-weight: bold;">
                            ${this.getStatusDisplayName(mission.status)}
                        </span>
                    </td>
                    <td class="fiche-label-professional">Créée par:</td>
                    <td class="fiche-value-professional">${mission.created_by}</td>
                </tr>
                <tr>
                    <td class="fiche-label-professional">Total Destinations:</td>
                    <td class="fiche-value-professional">${destinations.length}</td>
                    <td class="fiche-label-professional">Total Camions Requis:</td>
                    <td class="fiche-value-professional">${mission.trucks_requested}</td>
                </tr>
            </table>
        </div>
        
        <!-- Destinations Information -->
        <div style="margin-bottom: 24px;">
            <h3 style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover)); color: white; padding: 12px 15px; margin: 0 0 15px 0; border-radius: 6px; font-size: 16px; display: flex; align-items: center; gap: 10px;">
                <i data-lucide="map"></i>
                Détails des Destinations
            </h3>
            
            ${destinations.map((dest, index) => `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid var(--color-primary); margin-bottom: 12px;">
                    <h4 style="margin: 0 0 12px 0; color: var(--color-primary);">Destination ${index + 1}</h4>
                    <table class="fiche-professional-table">
                        <tr>
                            <td class="fiche-label-professional">Départ:</td>
                            <td class="fiche-value-professional">${dest.departure_wilaya || 'Non spécifié'}</td>
                            <td class="fiche-label-professional">Arrivée:</td>
                            <td class="fiche-value-professional">${dest.name || dest.arrival_wilaya}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Date Départ:</td>
                            <td class="fiche-value-professional">${dest.departure_date ? this.formatDate(dest.departure_date) : 'Non définie'}</td>
                            <td class="fiche-label-professional">Heure Départ:</td>
                            <td class="fiche-value-professional">${dest.departure_time || 'Non définie'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Camions Requis:</td>
                            <td class="fiche-value-professional">${dest.trucks_requested || 1}</td>
                            <td class="fiche-label-professional">Type Produit:</td>
                            <td class="fiche-value-professional">${dest.product_type || mission.product_type || 'Non spécifié'}</td>
                        </tr>
                        ${dest.departure_gps ? `
                            <tr>
                                <td class="fiche-label-professional">GPS Départ:</td>
                                <td colspan="3" class="fiche-value-professional">
                                    <a href="${dest.departure_gps}" target="_blank" style="color: var(--color-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: #e3f2fd; border-radius: 4px; border: 1px solid var(--color-primary);">
                                        <i data-lucide="map-pin"></i> Localisation Départ
                                    </a>
                                </td>
                            </tr>
                        ` : ''}
                        ${dest.gps_location ? `
                            <tr>
                                <td class="fiche-label-professional">GPS Destination:</td>
                                <td colspan="3" class="fiche-value-professional">
                                    <a href="${dest.gps_location}" target="_blank" style="color: var(--color-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: #e3f2fd; border-radius: 4px; border: 1px solid var(--color-primary);">
                                        <i data-lucide="map-pin"></i> Localisation Destination
                                    </a>
                                </td>
                            </tr>
                        ` : ''}
                    </table>
                    ${dest.comments ? `
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 4px; margin-top: 8px; font-style: italic; border-left: 4px solid #f39c12;">
                            <strong>Commentaires:</strong> ${dest.comments}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        
        <!-- Vehicle Assignments -->
        ${mission.assigned_trucks && mission.assigned_trucks.length > 0 ? `
            <div style="margin-bottom: 24px;">
                <h3 style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover)); color: white; padding: 12px 15px; margin: 0 0 15px 0; border-radius: 6px; font-size: 16px; display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="truck"></i>
                    Assignations Véhicules
                </h3>
                
                <table class="fiche-professional-table">
                    <thead>
                        <tr>
                            <th>N°</th>
                            <th>Camion</th>
                            <th>Immatriculation</th>
                            <th>Chauffeur</th>
                            <th>Téléphone</th>
                            <th>Date Assignation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mission.assigned_trucks.map((assignment, index) => {
                            const truck = trucks.find(t => t.id === assignment.truck_id);
                            const driver = drivers.find(d => d.id === assignment.driver_id);
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${truck ? `${truck.brand} ${truck.model}` : 'Non trouvé'}</td>
                                    <td>${truck ? truck.registration : 'N/A'}</td>
                                    <td>${driver ? driver.name : 'Non assigné'}</td>
                                    <td>${driver?.phone || 'N/A'}</td>
                                    <td>${this.formatDateTime(assignment.assigned_at)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}
        
        <!-- Operations Table -->
        ${operations.length > 0 ? `
            <div style="margin-bottom: 24px;">
                <h3 style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover)); color: white; padding: 12px 15px; margin: 0 0 15px 0; border-radius: 6px; font-size: 16px; display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="list"></i>
                    Détail des Opérations (${operations.length})
                </h3>
                
                <table class="fiche-professional-table">
                    <thead>
                        <tr>
                            <th>N° Opération</th>
                            <th>Route</th>
                            <th>Camion</th>
                            <th>Chauffeur</th>
                            <th>Départ Estimé</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${operations.map(operation => {
                            const truck = trucks.find(t => t.id === operation.assigned_truck_id);
                            const driver = drivers.find(d => d.id === operation.assigned_driver_id);
                            return `
                                <tr>
                                    <td>OP${operation.operation_number || operation.id}</td>
                                    <td>${operation.departure_location} → ${operation.arrival_location}</td>
                                    <td>${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'N/A'}</td>
                                    <td>${driver ? driver.name : 'N/A'}</td>
                                    <td>${operation.estimated_departure ? this.formatDateTime(operation.estimated_departure) : 'N/A'}</td>
                                    <td>
                                        <span style="background: var(--color-info); color: white; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                                            ${this.getOperationStatusDisplayName(operation.status)}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}
        
        <!-- Comments Section -->
        ${mission.comments ? `
            <div style="margin-bottom: 24px;">
                <h3 style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover)); color: white; padding: 12px 15px; margin: 0 0 15px 0; border-radius: 6px; font-size: 16px; display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="message-square"></i>
                    Commentaires Mission
                </h3>
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; font-style: italic; border-left: 4px solid #f39c12;">
                    ${mission.comments}
                </div>
            </div>
        ` : ''}
        
        <!-- Signatures Section -->
        <div style="margin-top: 40px; page-break-inside: avoid;">
            <h3 style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover)); color: white; padding: 12px 15px; margin: 0 0 15px 0; border-radius: 6px; font-size: 16px; display: flex; align-items: center; gap: 10px;">
                <i data-lucide="pen-tool"></i>
                Signatures Électroniques
            </h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div style="border: 2px solid #dee2e6; padding: 20px; border-radius: 8px; background: #f8f9fa;">
                    <div style="font-weight: bold; margin-bottom: 15px; color: var(--color-primary); font-size: 14px; text-align: center;">Planificateur</div>
                    <div style="height: 60px; border-bottom: 2px solid #000; margin: 15px 0;"></div>
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 8px;">
                        <div>Nom: ${mission.created_by}</div>
                        <div>Date: ${this.formatDate(mission.created_at)}</div>
                        <div style="color: var(--color-success);">✓ Mission Créée</div>
                    </div>
                </div>
                
                <div style="border: 2px solid #dee2e6; padding: 20px; border-radius: 8px; background: #f8f9fa;">
                    <div style="font-weight: bold; margin-bottom: 15px; color: var(--color-primary); font-size: 14px; text-align: center;">Client</div>
                    <div style="height: 60px; border-bottom: 2px solid #000; margin: 15px 0;"></div>
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 8px;">
                        <div>Nom: _________________</div>
                        <div>Date: _________________</div>
                        <div>⏳ Réception marchandise</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Document Footer -->
        <div style="margin-top: 40px; padding-top: 20px; text-align: center; page-break-inside: avoid;">
            <div style="height: 2px; background: linear-gradient(90deg, var(--color-primary), transparent, var(--color-primary)); margin-bottom: 15px;"></div>
            <p style="font-size: 11px; color: var(--color-text-secondary); line-height: 1.4; margin: 0;">
                Document généré automatiquement le ${this.formatDateTime(new Date().toISOString())}<br>
                <strong>DOUROUB EL DJAZAIR - Système de Gestion de Transport Professionnel</strong>
            </p>
        </div>
    `;
    
    this.openModal('ficheModal');
    this.initializeLucideIcons();
}
    
// Add this method to the TransportApp class
handleTabSwitch(e) {
    const tabName = e.currentTarget.dataset.tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    if (tabName === 'trucks') {
        document.getElementById('trucksTab').classList.add('active');
    } else if (tabName === 'drivers') {
        document.getElementById('driversTab').classList.add('active');
    }
}

    
    // Smart Auto-Population - FIXED
// Smart Auto-Population - FIXED to include departure dropdowns
handleClientSelection(e) {
    const clientId = parseInt(e.target.value);
    
    // Clear all destination dropdowns first
    const destinationSelects = document.querySelectorAll('.mission-destination-name');
    const wilayaSelects = document.querySelectorAll('.mission-destination-wilaya');
    const gpsInputs = document.querySelectorAll('.mission-destination-gps');
    
    // FIXED: Also clear departure fields
    const departureWilayaSelects = document.querySelectorAll('.mission-destination-departure-wilaya');
    const departureGpsInputs = document.querySelectorAll('.mission-destination-departure-gps');
    
    destinationSelects.forEach(select => {
        select.innerHTML = '<option value="">Sélectionner une destination</option>';
    });
    wilayaSelects.forEach(select => {
        select.value = '';
    });
    gpsInputs.forEach(input => {
        input.value = '';
    });
    
    // Clear departure fields
    departureWilayaSelects.forEach(select => {
        select.value = '';
    });
    departureGpsInputs.forEach(input => {
        input.value = '';
    });
    
    // Auto-fill if client selected
    if (clientId) {
        const clients = this.getClients();
        const client = clients.find(c => c.id === clientId);
        
        if (client && client.wilaya) {
            // FIXED: Auto-fill departure wilaya for ALL destinations (not just empty ones)
            departureWilayaSelects.forEach(select => {
                select.value = client.wilaya; // Always set, not just if empty
            });
            
            // FIXED: Auto-fill client GPS for ALL departure fields (not just empty ones)  
            if (client.gps_location) {
                departureGpsInputs.forEach(input => {
                    input.value = client.gps_location; // Always set, not just if empty
                });
            }
        }
        
        // Populate all destination dropdowns
        this.populateDestinationDropdowns();
    }
}
    
handleDestinationSelection(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    if (selectedOption && selectedOption.dataset.wilaya) {
        document.getElementById('missionArrival').value = selectedOption.dataset.wilaya;
        document.getElementById('arrivalGPS').value = selectedOption.dataset.gps || '';
    } else {
        document.getElementById('missionArrival').value = '';
        document.getElementById('arrivalGPS').value = '';
    }
}

    
    // Helper functions for dropdowns - FIXED
    populateClientDropdown() {
        const clients = this.getClients();
        const select = document.getElementById('missionClient');
        if (select && clients.length > 0) {
            const options = '<option value="">Sélectionner un client</option>' +
                clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('');
            select.innerHTML = options;
        }
    }
    
populateWilayaDropdowns() {
    // Client wilaya dropdown
    const clientWilayaSelect = document.getElementById('clientWilaya');
    if (clientWilayaSelect) {
        const clientWilayaOptions = '<option value="">Sélectionner une wilaya</option>' +
            this.wilayas.map(wilaya => `<option value="${wilaya}">${wilaya}</option>`).join('');
        clientWilayaSelect.innerHTML = clientWilayaOptions;
    }
    
    // Mission wilaya dropdowns
    const missionDepartureSelect = document.getElementById('missionDeparture');
    const missionArrivalSelect = document.getElementById('missionArrival');
    
    const wilayaOptions = '<option value="">Sélectionner une wilaya</option>' +
        this.wilayas.map(wilaya => `<option value="${wilaya}">${wilaya}</option>`).join('');
    
    if (missionDepartureSelect) {
        missionDepartureSelect.innerHTML = wilayaOptions;
    }
    if (missionArrivalSelect) {
        missionArrivalSelect.innerHTML = wilayaOptions;
    }
    
    // Destination wilaya dropdowns (existing ones)
    document.querySelectorAll('.destination-wilaya').forEach(select => {
        const destWilayaOptions = '<option value="">Wilaya</option>' +
            this.wilayas.map(wilaya => `<option value="${wilaya}">${wilaya}</option>`).join('');
        select.innerHTML = destWilayaOptions;
    });
}


populateMissionWilayaDropdowns() {
    const departureSelect = document.getElementById('missionDeparture');
    const arrivalSelect = document.getElementById('missionArrival');
    
    const wilayaOptions = this.wilayas.map(wilaya => `<option value="${wilaya}">${wilaya}</option>`).join('');
    
    if (departureSelect) {
        departureSelect.innerHTML = '<option value="">Sélectionner wilaya de départ</option>' + wilayaOptions;
    }
    if (arrivalSelect) {
        arrivalSelect.innerHTML = '<option value="">Sélectionner wilaya d\'arrivée</option>' + wilayaOptions;
    }
}

    
    populateLocationDropdown(selectId) {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Sélectionner wilaya</option>' +
                this.wilayas.map(wilaya => `<option value="${wilaya}">${wilaya}</option>`).join('');
        }
    }
    
addDestinationField() {
    const container = document.getElementById('destinationsList');
    if (!container) return;
    
    const destinationItem = document.createElement('div');
    destinationItem.className = 'destination-item';
    destinationItem.innerHTML = `
        <input type="text" class="form-control destination-name" placeholder="Nom de la destination" required>
        <select class="form-control destination-wilaya" required>
            <option value="">Wilaya</option>
            ${this.wilayas.map(wilaya => `<option value="${wilaya}">${wilaya}</option>`).join('')}
        </select>
        <input type="text" class="form-control destination-contact" placeholder="Personne à contacter (optionnel)">
        <div class="gps-input-wrapper">
            <i class="gps-icon" data-lucide="map-pin"></i>
            <input type="url" class="form-control destination-gps" placeholder="https://www.google.com/maps/place/...">
        </div>
        <button type="button" class="btn btn--outline btn-remove-destination">
            <i data-lucide="x"></i>
        </button>
    `;
    
    // Add remove functionality
    destinationItem.querySelector('.btn-remove-destination').addEventListener('click', () => {
        if (container.children.length > 1) {
            destinationItem.remove();
        } else {
            alert('Au moins une destination est requise.');
        }
    });
    
    container.appendChild(destinationItem);
    this.initializeLucideIcons();
}
 

addDestinationFieldWithData(destinationData) {
    const destinationsList = document.getElementById('destinationsList');
    const destinationItem = document.createElement('div');
    destinationItem.className = 'destination-item';
    
    destinationItem.innerHTML = `
        <input type="text" class="form-control destination-name" placeholder="Nom de la destination" required value="${destinationData.name || ''}">
        <select class="form-control destination-wilaya" required>
            <option value="">Wilaya</option>
        </select>
        <input type="text" class="form-control destination-contact" placeholder="Personne à contacter (optionnel)" value="${destinationData.contact_person || ''}">
        <div class="gps-input-wrapper">
            <i class="gps-icon" data-lucide="map-pin"></i>
            <input type="url" class="form-control destination-gps" placeholder="https://www.google.com/maps/place/..." value="${destinationData.gps_location || ''}">
        </div>
        <button type="button" class="btn btn--outline btn-remove-destination">
            <i data-lucide="x"></i>
        </button>
    `;
    
    // Populate wilaya dropdown
    const wilayaSelect = destinationItem.querySelector('.destination-wilaya');
    this.wilayas.forEach(wilaya => {
        const option = document.createElement('option');
        option.value = wilaya;
        option.textContent = wilaya;
        if (wilaya === destinationData.wilaya) {
            option.selected = true;
        }
        wilayaSelect.appendChild(option);
    });
    
    // Add remove event listener
    const removeBtn = destinationItem.querySelector('.btn-remove-destination');
    removeBtn.addEventListener('click', () => {
        if (destinationsList.children.length > 1) {
            destinationItem.remove();
        } else {
            alert('Au moins une destination est requise');
        }
    });
    
    destinationsList.appendChild(destinationItem);
    
    // Initialize lucide icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}
 
resetDestinationFields() {
    const container = document.getElementById('destinationsList');
    if (!container) return;
    
    // Remove all destination items except the first one
    const destinations = container.querySelectorAll('.destination-item');
    for (let i = 1; i < destinations.length; i++) {
        destinations[i].remove();
    }
    
    // FIXED: Clear the first destination completely including GPS
    const firstDestination = container.querySelector('.destination-item');
    if (firstDestination) {
        // Clear all inputs in the first destination
        firstDestination.querySelectorAll('input, select').forEach(input => {
            if (input.type === 'select-one') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        });
        
        // FIXED: Specifically clear the GPS field
        const gpsInput = firstDestination.querySelector('.destination-gps');
        if (gpsInput) {
            gpsInput.value = '';
        }
    }
}
    
    setMinDate() {
        const dateInput = document.getElementById('missionDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
        }
    }
    
    // Status and utility functions
    updateTruckStatus(truckId, status, missionId = null) {
        const trucks = this.getTrucks();
        const truck = trucks.find(t => t.id === truckId);
        if (truck) {
            truck.status = status;
            truck.current_mission_id = missionId;
            
            if (status === 'available') {
                truck.next_available_time = null;
                truck.next_available_location = truck.current_location;
            }
            
            this.saveTrucks(trucks);
        }
    }
    
    updateDriverStatus(driverId, status, missionId = null) {
        const drivers = this.getDrivers();
        const driver = drivers.find(d => d.id === driverId);
        if (driver) {
            driver.status = status;
            driver.current_mission_id = missionId;
            this.saveDrivers(drivers);
        }
    }
    
getStatusDisplayName(status) {
    const statusMap = {
        'demandée': 'Demandée',
        'en_attente_validation': 'En attente validation',
        'validée': 'Validée',
        'en_cours': 'En cours',
        'partiellement_terminee': 'Partiellement Terminée',
        'terminée': 'Terminée',
        'partiellement_annulee': 'Partiellement Annulée',
        'annulée': 'Annulée',
        'probleme_signalee': 'Problème Signalé'
    };
    return statusMap[status] || status;
}


    
// ENHANCED PUBLIC Notification System - Per-User Deletion
sendNotification(targetRole, type, message, data = {}) {
    const notifications = this.getNotifications();
    
    const notification = {
        id: this.generateId(notifications),
        target_role: 'all', // Always public
        type: type,
        title: this.getNotificationTitle(type),
        message: message,
        data: data,
        from_user: this.currentUser ? this.currentUser.name : 'Système',
        timestamp: new Date().toISOString(),
        read: false // Global read status (not used anymore)
    };
    
    notifications.push(notification);
    this.saveNotifications(notifications);
    
    // Always update notifications immediately
    setTimeout(() => this.updateNotifications(), 100);
    
    console.log('Public notification sent:', notification);
}

updateNotifications() {
    if (!this.currentUser) return;
    
    // Get ALL notifications, then filter by current user's deleted list
    const allNotifications = this.getNotifications();
    const userDeletedIds = this.getUserDeletedNotifications();
    
    // Filter out notifications that THIS USER has deleted
    const visibleNotifications = allNotifications
        .filter(n => !userDeletedIds.includes(n.id))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const badge = document.getElementById('notificationBadge');
    // Count unread notifications for current user
    const unreadCount = visibleNotifications.filter(n => !this.isNotificationReadByUser(n)).length;
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    this.loadNotificationsList(visibleNotifications);
}

loadNotificationsList(notifications) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="no-notifications">
                <div class="no-notifications-icon">🔔</div>
                <div class="no-notifications-text">Aucune notification</div>
                <div class="no-notifications-subtitle">Vous êtes à jour !</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${this.isNotificationReadByUser(notification) ? 'read' : 'unread'}" data-notification-id="${notification.id}">
            <div class="notification-header">
                <div class="notification-icon">${this.getNotificationIcon(notification.type)}</div>
                <div class="notification-title">${notification.title}</div>
                <button class="notification-delete" onclick="app.deleteNotificationForCurrentUser(${notification.id})" title="Masquer pour moi uniquement">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-footer">
                <div class="notification-time">${this.formatAlgeriaDateTime(notification.timestamp)}</div>
                <div class="notification-from">Par: ${notification.from_user}</div>
            </div>
        </div>
    `).join('');
    
    // Reinitialize Lucide icons
    setTimeout(() => {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 100);
}

// ✅ FIXED: Per-user read tracking
isNotificationReadByUser(notification) {
    if (!this.currentUser) return false;
    const userReadNotifications = this.getUserReadNotifications();
    return userReadNotifications.includes(notification.id);
}

getUserReadNotifications() {
    if (!this.currentUser) return [];
    const key = `transport_read_notifications_${this.currentUser.username || this.currentUser.name}`;
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

saveUserReadNotifications(readIds) {
    if (!this.currentUser) return;
    const key = `transport_read_notifications_${this.currentUser.username || this.currentUser.name}`;
    localStorage.setItem(key, JSON.stringify(readIds || []));
}

// ✅ FIXED: Per-user deletion tracking
getUserDeletedNotifications() {
    if (!this.currentUser) return [];
    const key = `transport_deleted_notifications_${this.currentUser.username || this.currentUser.name}`;
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

saveUserDeletedNotifications(deletedIds) {
    if (!this.currentUser) return;
    const key = `transport_deleted_notifications_${this.currentUser.username || this.currentUser.name}`;
    localStorage.setItem(key, JSON.stringify(deletedIds || []));
}

// ✅ FIXED: Delete notification ONLY for current user (doesn't affect others)
deleteNotificationForCurrentUser(notificationId) {
    if (!this.currentUser) return;
    
    const userDeletedIds = this.getUserDeletedNotifications();
    
    if (!userDeletedIds.includes(notificationId)) {
        userDeletedIds.push(notificationId);
        this.saveUserDeletedNotifications(userDeletedIds);
        this.updateNotifications();
        
        console.log(`Notification ${notificationId} hidden for user ${this.currentUser.username || this.currentUser.name} only`);
    }
}

// Keep existing methods unchanged
getNotificationIcon(type) {
    const iconMap = {
        'mission_request': '📋',
        'mission_validated': '✅',
        'mission_status_updated': '🔄',
        'mission_cancelled': '❌',
        'mission_assigned': '🚛',
        'operation_started': '🚀',
        'operation_completed': '🏁',
        'assignment_modified': '⚙️',
        'maintenance_scheduled': '🔧',
        'driver_updated': '👤',
        'truck_updated': '🚚'
    };
    return iconMap[type] || '📢';
}

getNotificationTitle(type) {
    const titleMap = {
        'mission_request': 'Nouvelle Demande de Mission',
        'mission_validated': 'Mission Validée',
        'mission_status_updated': 'Statut de Mission Modifié',
        'mission_cancelled': 'Mission Annulée',
        'mission_assigned': 'Mission Assignée',
        'operation_started': 'Opération Démarrée',
        'operation_completed': 'Opération Terminée',
        'assignment_modified': 'Assignation Modifiée',
        'maintenance_scheduled': 'Maintenance Programmée',
        'driver_updated': 'Chauffeur Modifié',
        'truck_updated': 'Camion Modifié'
    };
    return titleMap[type] || 'Notification';
}

toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        const isHidden = panel.classList.contains('hidden');
        
        if (isHidden) {
            panel.classList.remove('hidden');
            // Mark unread notifications as read after opening
            setTimeout(() => this.markNotificationsAsRead(), 500);
        } else {
            panel.classList.add('hidden');
        }
    }
}

markNotificationsAsRead() {
    if (!this.currentUser) return;
    
    // Get visible notifications for current user
    const allNotifications = this.getNotifications();
    const userDeletedIds = this.getUserDeletedNotifications();
    const visibleNotifications = allNotifications.filter(n => !userDeletedIds.includes(n.id));
    
    const userReadNotifications = this.getUserReadNotifications();
    let updated = false;
    
    // Mark all visible notifications as read for current user
    visibleNotifications.forEach(n => {
        if (!userReadNotifications.includes(n.id)) {
            userReadNotifications.push(n.id);
            updated = true;
        }
    });
    
    if (updated) {
        this.saveUserReadNotifications(userReadNotifications);
        this.updateNotifications();
    }
}

// ✅ FIXED: Clear notifications ONLY for current user
clearNotifications() {
    if (!this.currentUser) return;
    
    if (!confirm('Voulez-vous vraiment masquer toutes vos notifications ? (Les autres utilisateurs les verront toujours)')) {
        return;
    }
    
    // Get all notification IDs and mark them as deleted for current user only
    const allNotifications = this.getNotifications();
    const allNotificationIds = allNotifications.map(n => n.id);
    
    this.saveUserDeletedNotifications(allNotificationIds);
    this.updateNotifications();
    
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.add('hidden');
    }
    
    console.log(`All notifications hidden for user ${this.currentUser.username || this.currentUser.name} only`);
}
    // Activity tracking
    addActivity(action, icon) {
        if (!this.currentUser) return;
        
        const activities = this.getActivities();
        activities.push({
            id: this.generateId(activities),
            action: action,
            icon: icon,
            user: this.currentUser.name,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.splice(0, activities.length - 100);
        }
        
        this.saveActivities(activities);
    }
    
    // Data persistence
    getClients() {
        try {
            return JSON.parse(localStorage.getItem('transport_clients') || '[]');
        } catch (error) {
            console.error('Error loading clients:', error);
            return [];
        }
    }
    
saveClients(clients) {
    try {
        localStorage.setItem('transport_clients', JSON.stringify(clients));
    } catch (error) {
        console.error('Error saving clients:', error);
        throw new Error('Impossible de sauvegarder les clients');
    }
}

    
    getTrucks() {
        try {
            return JSON.parse(localStorage.getItem('transport_trucks') || '[]');
        } catch (error) {
            console.error('Error loading trucks:', error);
            return [];
        }
    }
    
    saveTrucks(trucks) {
        localStorage.setItem('transport_trucks', JSON.stringify(trucks));
    }
    
    getDrivers() {
        try {
            return JSON.parse(localStorage.getItem('transport_drivers') || '[]');
        } catch (error) {
            console.error('Error loading drivers:', error);
            return [];
        }
    }
    
    saveDrivers(drivers) {
        localStorage.setItem('transport_drivers', JSON.stringify(drivers));
    }
    
getMissions() {
    try {
        const missions = JSON.parse(localStorage.getItem('transport_missions') || '[]');
        
        // ✅ CORRECTION : Réparer les missions défectueuses
        return missions.map(mission => {
            // Vérifier et corriger progress_timeline
            if (!mission.progress_timeline || !Array.isArray(mission.progress_timeline)) {
                mission.progress_timeline = [];
                
                // Reconstruire une timeline basique si possible
                if (mission.created_at) {
                    mission.progress_timeline.push({
                        status: mission.status || "demandée",
                        timestamp: mission.created_at,
                        user: mission.created_by || 'Système',
                        note: 'Timeline reconstruite automatiquement'
                    });
                }
            }
            
            // Vérifier et corriger assigned_trucks
            if (!mission.assigned_trucks) {
                mission.assigned_trucks = [];
            }
            
            return mission;
        });
        
    } catch (error) {
        console.error('Error loading missions:', error);
        return [];
    }
}
// Méthode de réparation à appeler une seule fois
repairMissionData() {
    console.log('🔧 Début de la réparation des données...');
    
    const missions = JSON.parse(localStorage.getItem('transport_missions') || '[]');
    let repairedCount = 0;
    
    const repairedMissions = missions.map(mission => {
        let wasRepaired = false;
        
        // Réparer progress_timeline
        if (!mission.progress_timeline || !Array.isArray(mission.progress_timeline)) {
            mission.progress_timeline = [];
            
            // Reconstruire la timeline
            if (mission.created_at) {
                mission.progress_timeline.push({
                    status: "demandée",
                    timestamp: mission.created_at,
                    user: mission.created_by || 'Système'
                });
            }
            
            if (mission.validated_at && mission.validated_by) {
                mission.progress_timeline.push({
                    status: "validée",
                    timestamp: mission.validated_at,
                    user: mission.validated_by
                });
            }
            
            if (mission.status && mission.status !== 'demandée') {
                mission.progress_timeline.push({
                    status: mission.status,
                    timestamp: new Date().toISOString(),
                    user: 'Système',
                    note: 'Statut actuel ajouté lors de la réparation'
                });
            }
            
            wasRepaired = true;
        }
        
        // Réparer assigned_trucks
        if (!mission.assigned_trucks) {
            mission.assigned_trucks = [];
            wasRepaired = true;
        }
        
        if (wasRepaired) {
            repairedCount++;
            console.log(`✅ Mission ${mission.id} réparée`);
        }
        
        return mission;
    });
    
    // Sauvegarder les données réparées
    localStorage.setItem('transport_missions', JSON.stringify(repairedMissions));
    
    console.log(`🎉 Réparation terminée : ${repairedCount} mission(s) réparée(s) sur ${missions.length}`);
    alert(`Réparation des données terminée !\n${repairedCount} mission(s) réparée(s)`);
}

    
    saveMissions(missions) {
        localStorage.setItem('transport_missions', JSON.stringify(missions));
    }
    
    getActivities() {
        try {
            return JSON.parse(localStorage.getItem('transport_activities') || '[]');
        } catch (error) {
            console.error('Error loading activities:', error);
            return [];
        }
    }
    
    saveActivities(activities) {
        localStorage.setItem('transport_activities', JSON.stringify(activities));
    }
    
    getNotifications() {
        try {
            return JSON.parse(localStorage.getItem('transport_notifications') || '[]');
        } catch (error) {
            console.error('Error loading notifications:', error);
            return [];
        }
    }
    
    saveNotifications(notifications) {
        localStorage.setItem('transport_notifications', JSON.stringify(notifications));
    }
    
    // Utility functions
    generateId(array) {
        return array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;
    }
    
    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('fr-FR');
        } catch (error) {
            return dateString;
        }
    }
    
// FIXED: Dynamic countdown calculation
calculateCountdown(scheduledDate, scheduledTime) {
    if (!scheduledDate || !scheduledTime) return 'Non défini';
    
    const now = new Date();
    const scheduled = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduled <= now) {
        return 'En cours/Retard';
    }
    
    const diffMs = scheduled - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
        const diffDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;
        return `${diffDays}j ${remainingHours}h`;
    }
    
    return `${diffHours}h ${diffMinutes}min`;
}

// NEW: Get countdown CSS class based on urgency
getCountdownClass(scheduledDate, scheduledTime) {
    if (!scheduledDate || !scheduledTime) return 'countdown-normal';
    
    const now = new Date();
    const scheduled = new Date(`${scheduledDate}T${scheduledTime}`);
    const hoursUntil = (scheduled - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) {
        return 'countdown-overdue';
    } else if (hoursUntil < 2) {
        return 'countdown-critical';
    } else if (hoursUntil < 12) {
        return 'countdown-urgent';
    } else {
        return 'countdown-normal';
    }
}

// NEW: Start real-time countdown updates
startCountdownUpdates() {
    // Update countdowns every minute
    setInterval(() => {
        this.updateAllCountdowns();
    }, 60000); // 60 seconds
    
    // Also update immediately
    setTimeout(() => {
        this.updateAllCountdowns();
    }, 1000);
}

// NEW: Update all countdown displays
updateAllCountdowns() {
    if (!this.currentUser) return;
    
    // Find all countdown elements
    const countdownElements = document.querySelectorAll('[data-countdown]');
    
    countdownElements.forEach(element => {
        const scheduledDate = element.dataset.scheduledDate;
        const scheduledTime = element.dataset.scheduledTime;
        
        if (scheduledDate && scheduledTime) {
            const newCountdown = this.calculateCountdown(scheduledDate, scheduledTime);
            const newClass = this.getCountdownClass(scheduledDate, scheduledTime);
            
            // Update text content
            element.textContent = newCountdown;
            
            // Update CSS class
            element.className = `countdown-badge ${newClass}`;
        }
    });
}



    formatDateTime(dateString) {
        try {
            return new Date(dateString).toLocaleString('fr-FR');
        } catch (error) {
            return dateString;
        }
    }
	
// Add this method in the TransportApp class
createOperationsFromMission(mission) {
    const operations = this.getOperations();
    const newOperations = [];
    
    if (!mission.assigned_trucks) return;
    
    mission.assigned_trucks.forEach((assignment, index) => {
        const operation = {
            id: this.generateId([...operations, ...newOperations]),
            operation_number: `OP${String(mission.id).padStart(3, '0')}-${index + 1}`,
            mission_id: mission.id,
            client_name: mission.client_name,
            departure_location: mission.departure_wilaya,
            arrival_location: `${mission.arrival_wilaya} - ${mission.destination_name}`,
            departure_gps: mission.departure_gps || '',
            arrival_gps: mission.arrival_gps || '',
            estimated_departure: `${mission.scheduled_date} ${mission.scheduled_time}`,
            estimated_arrival: mission.arrival_date ? `${mission.arrival_date} ${mission.arrival_time}` : '',
            truck_id: assignment.truck_id,
            driver_id: assignment.driver_id,
            product_type: mission.product_type,
            status: 'assigned', // assigned → started → arrived → completed
            real_departure_date: null,
            real_departure_time: null,
            real_arrival_date: null,
            real_arrival_time: null,
            charging_time_minutes: null,
            created_at: new Date().toISOString(),
            created_by: mission.validated_by
        };
        newOperations.push(operation);
    });
    
    operations.push(...newOperations);
    this.saveOperations(operations);
    return newOperations;
}
updateOperationStatus(operationId, newStatus) {
    const operations = this.getOperations();
    const operationIndex = operations.findIndex(op => op.id === operationId);
    
    if (operationIndex !== -1) {
        const operation = operations[operationIndex];
        const oldStatus = operation.status;
        operation.status = newStatus;
        
        // Update timestamp for status change
        operation.status_updated_at = new Date().toISOString();
        
        // If operation is completed, update truck's base location
        if (newStatus === 'dechargement_termine' && operation.assigned_truck_id) {
            this.updateTruckLocationAfterOperation(
                operation.assigned_truck_id, 
                operationId, 
                operation.arrival_location
            );
        }
        
        // Save updated operations
        localStorage.setItem('operations', JSON.stringify(operations));
        
        // Reload fleet to reflect location changes
        this.loadFleet();
        
        // If we're on operations page, reload it too
        if (document.getElementById('operationsGrid')) {
            this.loadOperations();
        }
        
        console.log(`Operation ${operationId} status changed: ${oldStatus} → ${newStatus}`);
    }
}

// Add the missing editOperation function
editOperation(operationId) {
    console.log('Editing operation:', operationId);
    
    // ADD THIS PERMISSION CHECK AT THE VERY BEGINNING
    if (!['coordinator', 'admin', 'dispatcher'].includes(this.currentUser.role)) {
        alert('Seuls les coordinateurs et administrateurs peuvent modifier les opérations');
        return;
    }
    
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === parseInt(operationId));
    
    if (!operation) {
        alert('Opération introuvable');
        console.error('Operation not found:', operationId);
        return;
    }
    
    console.log('Found operation:', operation);
    
    // Show the drawer
    const drawer = document.getElementById('operationDrawer');
    const overlay = document.getElementById('drawerOverlay');
    
    if (drawer && overlay) {
        drawer.classList.remove('hidden');
        drawer.classList.add('active');
        
        // Reset scroll position
        const drawerContent = drawer.querySelector('.drawer-content');
        if (drawerContent) {
            drawerContent.scrollTop = 0;
        }
    }
    
    // Populate operation summary
    document.getElementById('operationSummary').textContent = 
        `Opération ${operation.operation_number || `OP${operation.id}`}`;
    
    const operationDetails = document.getElementById('operationDetails');
    if (operationDetails) {
        operationDetails.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Mission:</span>
                <span class="detail-value">${operation.mission_number || `MSN${operation.mission_id}`}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Client:</span>
                <span class="detail-value">${operation.client_name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Destination:</span>
                <span class="detail-value">${operation.destination_name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Route:</span>
                <span class="detail-value">${operation.departure_location} → ${operation.arrival_location}</span>
            </div>
        `;
    }
    
    // Populate form fields
    document.getElementById('editOperationId').value = operation.id;
    document.getElementById('editOperationStatus').value = operation.status;
    
    // Set time fields with proper formatting
    const setTimeField = (fieldId, timeValue) => {
        const field = document.getElementById(fieldId);
        if (field && timeValue) {
            try {
                const date = new Date(timeValue);
                field.value = date.toISOString().slice(0, 16);
            } catch (e) {
                console.error('Error setting time field:', fieldId, timeValue);
            }
        }
    };
    
    setTimeField('editRealDeparture', operation.real_departure_time);
    setTimeField('editArriveeChargement', operation.arrivee_site_chargement);
    setTimeField('editChargementTermine', operation.chargement_termine);
    setTimeField('editArriveeDestination', operation.arrivee_site_destination);
    setTimeField('editDechargementTermine', operation.dechargement_termine);
    
    // Set calculated fields
    document.getElementById('editTempsChargement').value = operation.temps_chargement || '';
    document.getElementById('editTempsDechargement').value = operation.temps_dechargement || '';
    document.getElementById('editTempsTotal').value = operation.temps_total_operation || '';
    document.getElementById('editChargingTime').value = operation.charging_time || '';
    
    // Setup time calculation listeners
    this.addTimeCalculationListeners();
    
    console.log('Operation edit form populated');
}

// Add the missing handleOperationEdit function
handleOperationEdit(e) {
    e.preventDefault();
    
    const operationId = document.getElementById('editOperationId').value;
    const newDriverId = document.getElementById('editOperationDriver').value;
    const newTruckId = document.getElementById('editOperationTruck').value;
    const newDestination = document.getElementById('editOperationDestination').value.trim();
    
    if (!operationId) return;
    
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;
    
    // Update the operation
    if (newDriverId) operation.assigned_driver_id = parseInt(newDriverId);
    if (newTruckId) operation.assigned_truck_id = parseInt(newTruckId);
    if (newDestination) operation.destination_name = newDestination;
    
    operation.modified_at = new Date().toISOString();
    operation.modified_by = this.currentUser.name;
    
    this.saveOperations(operations);
    
    this.addActivity(`Opération ${operation.operation_number} modifiée`, 'edit');
    this.loadOperationsTable();
    this.closeModal('operationEditModal');
    
    alert('Opération modifiée avec succès!');
}

// Add missing cancelOperation function
cancelOperation(operationId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette opération?')) {
        return;
    }
    
    const operations = this.getOperations();
    const operationIndex = operations.findIndex(op => op.id === operationId);
    
    if (operationIndex !== -1) {
        const operation = operations[operationIndex];
        
        // Free up truck and driver
        this.updateTruckStatus(operation.assigned_truck_id, 'available');
        this.updateDriverStatus(operation.assigned_driver_id, 'available');
        
        // Remove the operation
        operations.splice(operationIndex, 1);
        this.saveOperations(operations);
        
        this.addActivity(`Opération ${operation.operation_number} annulée`, 'x');
        this.loadOperationsTable();
        
        alert('Opération annulée avec succès!');
    }
}

// NEW: Fiche d'Opération (renamed from Fiche de Mission for individual operations)
showFicheOperation(operationId) {
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;
    
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    const truck = trucks.find(t => t.id === operation.assigned_truck_id);
    const driver = drivers.find(d => d.id === operation.assigned_driver_id);
    
    const ficheContent = document.getElementById('ficheContent');
    ficheContent.innerHTML = `
        <div class="fiche-header">
            <div class="company-logo-section">
                <h1 class="company-title">SPA DOUROUB EL DJAZAIR</h1>
                <div class="company-subtitle">شركة دروب الجزائر للنقل</div>
            </div>
            
            <div class="company-details">
                <div class="company-info-grid">
                    <div class="company-info-item">
                        <strong>Adresse:</strong> Zone Industrielle, Biskra 07000, Algérie
                    </div>
                    <div class="company-info-item">
                        <strong>Téléphone:</strong> +213 33 XX XX XX
                    </div>
                    <div class="company-info-item">
                        <strong>Email:</strong> contact@douroub-transport.dz
                    </div>
                    <div class="company-info-item">
                        <strong>RC:</strong> 07B0123456789
                    </div>
                </div>
            </div>
            
            <div class="fiche-title-section">
                <h2 class="fiche-mission-title">FICHE D'OPÉRATION N° OP${operation.operation_number}</h2>
                <div class="fiche-mission-subtitle">بطاقة العملية</div>
            </div>
        </div>
        
        <div class="fiche-body">
            <!-- Driver and Truck Information -->
            <div class="fiche-section">
                <h3 class="section-title">
                    <i data-lucide="user"></i>
                    Informations Chauffeur et Véhicule
                    <span class="section-title-ar">معلومات السائق والمركبة</span>
                </h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Nom du chauffeur / اسم السائق</div>
                        <div class="info-value">${driver ? driver.name : 'Non assigné'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Téléphone du chauffeur / رقم هاتف السائق</div>
                        <div class="info-value">${driver ? driver.phone : '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Numéro d'immatriculation / رقم التسجيل</div>
                        <div class="info-value">${truck ? truck.registration : 'Non assigné'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Type de véhicule / نوع المركبة</div>
                        <div class="info-value">${truck ? `${truck.brand} ${truck.model}` : '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Capacité / السعة</div>
                        <div class="info-value">${truck && truck.capacity ? truck.capacity + ' tonnes' : '-'}</div>
                    </div>
                </div>
            </div>
            
            <!-- Operation Details -->
            <div class="fiche-section">
                <h3 class="section-title">
                    <i data-lucide="truck"></i>
                    Détails de l'Opération
                    <span class="section-title-ar">تفاصيل العملية</span>
                </h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Client / العميل</div>
                        <div class="info-value">${operation.client_name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Type de produit / نوع المنتج</div>
                        <div class="info-value">${operation.product_type || 'Non spécifié'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Départ prévu / المغادرة المتوقعة</div>
                        <div class="info-value">${this.formatDateTime(operation.estimated_departure)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Arrivée prévue / الوصول المتوقع</div>
                        <div class="info-value">${operation.estimated_arrival ? this.formatDateTime(operation.estimated_arrival) : 'Non spécifiée'}</div>
                    </div>
                    <div class="info-item full-width">
                        <div class="info-label">GPS Départ / موقع الانطلاق</div>
                        <div class="info-value">
                            ${operation.departure_gps ? 
                                `<a href="${operation.departure_gps}" target="_blank" class="gps-link">
                                    <i data-lucide="map-pin"></i>
                                    Localisation GPS de départ / موقع الانطلاق الجي بي إس
                                </a>` : 
                                `${operation.departure_location}`
                            }
                        </div>
                    </div>
                    <div class="info-item full-width">
                        <div class="info-label">GPS Arrivée / موقع الوصول</div>
                        <div class="info-value">
                            ${operation.arrival_gps ? 
                                `<a href="${operation.arrival_gps}" target="_blank" class="gps-link">
                                    <i data-lucide="map-pin"></i>
                                    Localisation GPS d'arrivée / موقع الوصول الجي بي إس
                                </a>` : 
                                `${operation.arrival_location} - ${operation.destination_name}`
                            }
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Time Tracking -->
            <div class="fiche-section">
                <h3 class="section-title">
                    <i data-lucide="clock"></i>
                    Suivi Temporel
                    <span class="section-title-ar">تتبع الوقت</span>
                </h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Départ réel / المغادرة الفعلية</div>
                        <div class="info-value">${operation.real_departure_time ? this.formatDateTime(operation.real_departure_time) : 'En attente'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Arrivée réelle / الوصول الفعلي</div>
                        <div class="info-value">${operation.real_arrival_time ? this.formatDateTime(operation.real_arrival_time) : 'En attente'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Temps de chargement / وقت التحميل</div>
                        <div class="info-value">${operation.charging_time || 'En attente'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Statut actuel / الحالة الحالية</div>
                        <div class="info-value">
                            <span class="status-badge status-${operation.status}">
                                ${this.getOperationStatusDisplayName(operation.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${operation.comments ? `
                <div class="fiche-section">
                    <h3 class="section-title">
                        <i data-lucide="message-square"></i>
                        Commentaires
                        <span class="section-title-ar">تعليقات</span>
                    </h3>
                    <div class="comments-box">
                        ${operation.comments}
                    </div>
                </div>
            ` : ''}
        </div>
        
        <!-- Signatures -->
        <div class="signatures-section">
            <div class="signature-row">
                <div class="signature-box">
                    <div class="signature-title">Signature du Chauffeur / توقيع السائق</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">Nom: ${driver ? driver.name : '________________'}</div>
                    <div class="signature-date">Date: ________________</div>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Signature du Client / توقيع العميل</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">Nom: ________________</div>
                    <div class="signature-date">Date: ________________</div>
                </div>
            </div>
        </div>
        
        <div class="document-footer">
            <div class="footer-line"></div>
            <p class="document-info">
                Document généré automatiquement le ${this.formatDateTime(new Date().toISOString())}
                <br>
                وثيقة تم إنشاؤها تلقائياً في ${this.formatDateTime(new Date().toISOString())}
                <br>
                <strong>SPA DOUROUB EL DJAZAIR - Système de Gestion de Transport</strong>
            </p>
        </div>
    `;
    
    this.openModal('ficheModal');
    this.initializeLucideIcons();
}
// FUNCTION TO APPLY GPS RECTANGULAR FORM STYLING
applyGPSCellStyling() {
    // Apply styling to GPS departure cells
    document.querySelectorAll('.operations-table td').forEach(cell => {
        // Check if cell contains GPS departure links
        if (cell.innerHTML && cell.innerHTML.includes('🚛') && cell.innerHTML.includes('gps-mini-link')) {
            const parentRow = cell.closest('tr');
            const cellIndex = Array.from(parentRow.children).indexOf(cell);
            
            // GPS Departure column (adjust index based on your table structure)
            if (cellIndex === 3) { // Assuming GPS Departure is 4th column (index 3)
                cell.classList.add('gps-depart-cell');
            }
            
            // GPS Destination column (adjust index based on your table structure)
            if (cellIndex === 4) { // Assuming GPS Destination is 5th column (index 4)
                cell.classList.add('gps-destination-cell');
            }
        }
    });
}

// NEW: Generate Mission Recap (shows all operations for a mission)
generateMissionRecap(missionId) {
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const operations = this.getOperations().filter(op => op.mission_id === missionId);
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    const ficheContent = document.getElementById('ficheContent');
    ficheContent.innerHTML = `
        <div class="fiche-header">
            <div class="company-logo-section">
                <h1 class="company-title">SPA DOUROUB EL DJAZAIR</h1>
                <div class="company-subtitle">شركة دروب الجزائر للنقل</div>
            </div>
            
            <div class="company-details">
                <div class="company-info-grid">
                    <div class="company-info-item">
                        <strong>Adresse:</strong> Zone Industrielle, Biskra 07000, Algérie
                    </div>
                    <div class="company-info-item">
                        <strong>Téléphone:</strong> +213 33 XX XX XX
                    </div>
                    <div class="company-info-item">
                        <strong>Email:</strong> contact@douroub-transport.dz
                    </div>
                    <div class="company-info-item">
                        <strong>RC:</strong> 07B0123456789
                    </div>
                </div>
            </div>
            
            <div class="fiche-title-section">
                <h2 class="fiche-mission-title">FICHE DE MISSION RÉCAP N° ${mission.mission_number || 'MSN' + String(mission.id).padStart(3, '0')}</h2>
                <div class="fiche-mission-subtitle">ملخص بطاقة المهمة</div>
            </div>
        </div>
        
        <div class="fiche-body">
            <!-- Mission Overview -->
            <div class="fiche-section">
                <h3 class="section-title">
                    <i data-lucide="info"></i>
                    Résumé de la Mission
                    <span class="section-title-ar">ملخص المهمة</span>
                </h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Client / العميل</div>
                        <div class="info-value">${mission.client_name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Type de produit / نوع المنتج</div>
                        <div class="info-value">${mission.product_type || 'Non spécifié'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Nombre d'opérations / عدد العمليات</div>
                        <div class="info-value">${operations.length}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Statut mission / حالة المهمة</div>
                        <div class="info-value">
                            <span class="status-badge status-${mission.status}">
                                ${this.getStatusDisplayName(mission.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Operations List -->
            <div class="fiche-section">
                <h3 class="section-title">
                    <i data-lucide="list"></i>
                    Liste des Opérations
                    <span class="section-title-ar">قائمة العمليات</span>
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: var(--font-size-sm);">
                        <thead>
                            <tr style="background: var(--color-secondary);">
                                <th style="padding: var(--space-12); text-align: left; border: 1px solid var(--color-border);">N° Opération</th>
                                <th style="padding: var(--space-12); text-align: left; border: 1px solid var(--color-border);">Camion</th>
                                <th style="padding: var(--space-12); text-align: left; border: 1px solid var(--color-border);">Chauffeur</th>
                                <th style="padding: var(--space-12); text-align: left; border: 1px solid var(--color-border);">Départ Prévu</th>
                                <th style="padding: var(--space-12); text-align: left; border: 1px solid var(--color-border);">Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${operations.map(operation => {
                                const truck = trucks.find(t => t.id === operation.assigned_truck_id);
                                const driver = drivers.find(d => d.id === operation.assigned_driver_id);
                                return `
                                    <tr>
                                        <td style="padding: var(--space-10); border: 1px solid var(--color-border);">OP${operation.operation_number}</td>
                                        <td style="padding: var(--space-10); border: 1px solid var(--color-border);">${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'Non assigné'}</td>
                                        <td style="padding: var(--space-10); border: 1px solid var(--color-border);">${driver ? driver.name : 'Non assigné'}</td>
                                        <td style="padding: var(--space-10); border: 1px solid var(--color-border);">${this.formatDateTime(operation.estimated_departure)}</td>
                                        <td style="padding: var(--space-10); border: 1px solid var(--color-border);">
                                            <span class="status-badge status-${operation.status}">
                                                ${this.getOperationStatusDisplayName(operation.status)}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            ${mission.comments ? `
                <div class="fiche-section">
                    <h3 class="section-title">
                        <i data-lucide="message-square"></i>
                        Commentaires Mission
                        <span class="section-title-ar">تعليقات المهمة</span>
                    </h3>
                    <div class="comments-box">
                        ${mission.comments}
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div class="document-footer">
            <div class="footer-line"></div>
            <p class="document-info">
                Document généré automatiquement le ${this.formatDateTime(new Date().toISOString())}
                <br>
                وثيقة تم إنشاؤها تلقائياً في ${this.formatDateTime(new Date().toISOString())}
                <br>
                <strong>SPA DOUROUB EL DJAZAIR - Système de Gestion de Transport</strong>
            </p>
        </div>
    `;
    
    this.openModal('ficheModal');
    this.initializeLucideIcons();
}

// Add storage methods
// Add these methods after the existing getMissions, saveMissions methods
getOperations() {
    try {
        return JSON.parse(localStorage.getItem('transport_operations') || '[]');
    } catch (error) {
        console.error('Error loading operations:', error);
        return [];
    }
}

saveOperations(operations) {
    try {
        const dataToSave = JSON.stringify(operations);
        localStorage.setItem('transport_operations', dataToSave);
        console.log('Operations saved successfully. Count:', operations.length);
        
        // Verify the save worked
        const savedData = localStorage.getItem('transport_operations');
        if (!savedData) {
            throw new Error('Failed to save operations to localStorage');
        }
        
        return true;
    } catch (error) {
        console.error('Error saving operations:', error);
        alert('Erreur lors de la sauvegarde des opérations: ' + error.message);
        return false;
    }
}
// Force refresh operations table and sync all data
forceRefreshOperationsTable() {
    console.log('Force refreshing operations table...');
    
    // Clear any cached data
    const tbody = document.getElementById('operationsTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="22" style="text-align: center; padding: 20px;">Chargement...</td></tr>';
    }
    
    // Small delay to show loading state
    setTimeout(() => {
        this.loadOperationsTable();
        
        // Ensure icons are initialized
        setTimeout(() => {
            this.initializeLucideIcons();
        }, 200);
    }, 100);
}


generateOperationPDF(operationId) {
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;
    
    // Show the fiche temporarily to capture it
    this.showFicheOperation(operationId);
    
    setTimeout(() => {
        const ficheContent = document.getElementById('ficheContent');
        
        // Use html2canvas to capture the content
        html2canvas(ficheContent, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            height: ficheContent.scrollHeight,
            width: ficheContent.scrollWidth
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            
            // Create PDF
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // Save PDF
            pdf.save(`Fiche_Operation_${operation.operation_number}.pdf`);
            
            // Close the modal
            this.closeModal('ficheModal');
        }).catch(error => {
            console.error('Error generating PDF:', error);
            alert('Erreur lors de la génération du PDF');
            this.closeModal('ficheModal');
        });
    }, 500);
}

setupMissionRecapModal() {
    const missions = this.getMissions().filter(m => m.assigned_trucks && m.assigned_trucks.length > 0);
    const select = document.getElementById('recapMissionSelect');
    
    if (select) {
        select.innerHTML = '<option value="">Sélectionner une mission</option>';
        missions.forEach(mission => {
            select.innerHTML += `<option value="${mission.id}">MSN${String(mission.id).padStart(3, '0')} - ${mission.client_name}</option>`;
        });
    }
}

// FIXED: Export Selected Operations as Individual Fiches (PDF + JPG)
exportSelectedOperationsToPDF() {
    const selectedCheckboxes = document.querySelectorAll('.operation-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Veuillez sélectionner au moins une opération à exporter');
        return;
    }

    // Show format selection dialog
    const format = confirm('Choisissez le format d\'export:\n\nOK = PDF\nAnnuler = JPG (Image)');
    const exportFormat = format ? 'pdf' : 'jpg';

    const selectedOperationIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    
    console.log('Exporting operations:', selectedOperationIds, 'Format:', exportFormat);
    
    // Show loading message
    const originalButton = document.getElementById('exportSelectedOperations');
    const originalText = originalButton.innerHTML;
    originalButton.innerHTML = `<i data-lucide="loader"></i> Génération ${exportFormat.toUpperCase()}...`;
    originalButton.disabled = true;

    // Export each operation individually
    this.exportOperationsSequentially(selectedOperationIds, exportFormat, 0, originalButton, originalText);
}

// Sequential export to avoid overwhelming the system
exportOperationsSequentially(operationIds, format, index, button, originalText) {
    if (index >= operationIds.length) {
        // All done
        button.innerHTML = originalText;
        button.disabled = false;
        this.initializeLucideIcons();
        this.showToast(`${operationIds.length} fiches exportées avec succès en ${format.toUpperCase()}!`, 'success');
        return;
    }

    const operationId = operationIds[index];
    console.log(`Exporting operation ${index + 1}/${operationIds.length}: ${operationId}`);

    // Update progress
    button.innerHTML = `<i data-lucide="loader"></i> Export ${index + 1}/${operationIds.length}...`;

    // Generate fiche content using existing showFicheOperation logic
    this.generateOperationFiche(operationId, format, () => {
        // Continue with next operation after a small delay
        setTimeout(() => {
            this.exportOperationsSequentially(operationIds, format, index + 1, button, originalText);
        }, 1000); // 1 second delay between exports
    });
}

// Generate individual operation fiche (reusing showFicheOperation logic)
generateOperationFiche(operationId, format, callback) {
    const operations = this.getOperations();
    const operation = operations.find(op => op.id == operationId);
    
    if (!operation) {
        console.error('Operation not found:', operationId);
        callback();
        return;
    }

    // Create a temporary container for the fiche content
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '210mm';
    tempContainer.style.background = 'white';
    tempContainer.style.padding = '20mm';
    document.body.appendChild(tempContainer);

    // Generate the same fiche content as showFicheOperation
    const ficheContent = this.generateOperationFicheContent(operation);
    tempContainer.innerHTML = ficheContent;

    // Wait for content to be rendered
    setTimeout(() => {
        if (format === 'pdf') {
            this.exportFicheToPDF(tempContainer, operation, callback);
        } else {
            this.exportFicheToJPG(tempContainer, operation, callback);
        }
    }, 500);
}

// Generate fiche content (same logic as showFicheOperation)
generateOperationFicheContent(operation) {
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const missions = this.getMissions();
    
    const truck = trucks.find(t => t.id === operation.assigned_truck_id);
    const driver = drivers.find(d => d.d === operation.assigned_driver_id);
    const mission = missions.find(m => m.id === operation.mission_id);

    const currentTime = this.getCurrentAlgiersTimestamp();
    const formattedTime = this.formatAlgeriaDateTime(currentTime);

    return `
        <div class="fiche-content-professional">
            <!-- Company Header -->
            <div class="fiche-company-header">
                <h1 class="company-main-title">DOUROUB EL DJAZAIR</h1>
                <div class="company-subtitle">دروب الجزائر - طرق الجزائر</div>
                <div class="company-subtitle">Système de Gestion de Transport Professionnel</div>
                
                <table class="company-info-table">
                    <tr>
                        <td><strong>📍 Siège Social:</strong> Biskra, Algérie</td>
                        <td><strong>📞 Téléphone:</strong> +213 XXX XXX XXX</td>
                    </tr>
                    <tr>
                        <td><strong>📧 Email:</strong> contact@douroub-eljazair.dz</td>
                        <td><strong>🌐 Web:</strong> www.douroub-eljazair.dz</td>
                    </tr>
                </table>
            </div>

            <!-- Mission Header -->
            <div class="fiche-mission-header">
                <div class="fiche-mission-number">FICHE D'OPÉRATION ${operation.operation_number || `OP${operation.id}`}</div>
                <div class="fiche-mission-title">Mission: ${mission ? `MSN${String(mission.id).padStart(3, '0')}` : 'N/A'}</div>
            </div>

            <!-- Operation Information -->
            <div class="fiche-info-section">
                <h3 class="section-title-professional">
                    <i data-lucide="truck"></i>
                    INFORMATIONS DE L'OPÉRATION
                </h3>
                <table class="fiche-professional-table">
                    <tbody>
                        <tr>
                            <td class="fiche-label-professional">Numéro d'Opération:</td>
                            <td class="fiche-value-professional">${operation.operation_number || `OP${operation.id}`}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Mission Associée:</td>
                            <td class="fiche-value-professional">${mission ? `MSN${String(mission.id).padStart(3, '0')} - ${mission.client_name}` : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Client:</td>
                            <td class="fiche-value-professional">${operation.client_name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Destination:</td>
                            <td class="fiche-value-professional">${operation.destination_name || operation.arrival_location || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Statut Actuel:</td>
                            <td class="fiche-value-professional">
                                <span class="status-badge status-${operation.status}">${this.getOperationStatusDisplayName(operation.status)}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Vehicle and Driver Information -->
            <div class="fiche-info-section">
                <h3 class="section-title-professional">
                    <i data-lucide="users"></i>
                    VÉHICULE ET CHAUFFEUR
                </h3>
                <table class="fiche-professional-table">
                    <tbody>
                        <tr>
                            <td class="fiche-label-professional">Camion:</td>
                            <td class="fiche-value-professional">${truck ? `${truck.brand} ${truck.model}` : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Immatriculation:</td>
                            <td class="fiche-value-professional">${truck ? truck.registration : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Chauffeur:</td>
                            <td class="fiche-value-professional">${driver ? driver.name : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Téléphone Chauffeur:</td>
                            <td class="fiche-value-professional">${driver ? driver.phone : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Permis de Conduire:</td>
                            <td class="fiche-value-professional">${driver ? driver.license_number : 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Timing Information -->
            <div class="fiche-info-section">
                <h3 class="section-title-professional">
                    <i data-lucide="clock"></i>
                    CHRONOLOGIE DE L'OPÉRATION
                </h3>
                <table class="fiche-professional-table">
                    <tbody>
                        <tr>
                            <td class="fiche-label-professional">Départ Estimé:</td>
                            <td class="fiche-value-professional">${operation.estimated_departure ? this.formatAlgeriaDateTime(operation.estimated_departure) : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Départ Réel:</td>
                            <td class="fiche-value-professional ${operation.real_departure_time ? 'has-value' : ''}">${operation.real_departure_time ? this.formatAlgeriaDateTime(operation.real_departure_time) : 'En attente'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Arrivée Site Chargement:</td>
                            <td class="fiche-value-professional">${operation.arrivee_site_chargement ? this.formatAlgeriaDateTime(operation.arrivee_site_chargement) : 'En attente'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Chargement Terminé:</td>
                            <td class="fiche-value-professional">${operation.chargement_termine ? this.formatAlgeriaDateTime(operation.chargement_termine) : 'En attente'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Arrivée Destination:</td>
                            <td class="fiche-value-professional">${operation.arrivee_site_destination ? this.formatAlgeriaDateTime(operation.arrivee_site_destination) : 'En attente'}</td>
                        </tr>
                        <tr>
                            <td class="fiche-label-professional">Déchargement Terminé:</td>
                            <td class="fiche-value-professional">${operation.dechargement_termine ? this.formatAlgeriaDateTime(operation.dechargement_termine) : 'En attente'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- GPS Links -->
            ${(operation.departure_gps || operation.arrival_gps) ? `
            <div class="fiche-info-section">
                <h3 class="section-title-professional">
                    <i data-lucide="map-pin"></i>
                    LIENS GPS
                </h3>
                <table class="fiche-professional-table">
                    <tbody>
                        ${operation.departure_gps ? `
                        <tr>
                            <td class="fiche-label-professional">GPS Départ:</td>
                            <td class="fiche-value-professional">
                                <a href="${operation.departure_gps}" target="_blank" class="gps-link">
                                    <i data-lucide="map-pin"></i> Voir sur Google Maps
                                </a>
                            </td>
                        </tr>
                        ` : ''}
                        ${operation.arrival_gps ? `
                        <tr>
                            <td class="fiche-label-professional">GPS Destination:</td>
                            <td class="fiche-value-professional">
                                <a href="${operation.arrival_gps}" target="_blank" class="gps-link">
                                    <i data-lucide="navigation"></i> Voir sur Google Maps
                                </a>
                            </td>
                        </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <!-- Digital Signatures -->
            <div class="signatures-section">
                <h3 class="section-title-professional">
                    <i data-lucide="edit-3"></i>
                    SIGNATURES NUMÉRIQUES
                </h3>
                <div class="signature-row">
                    <div class="signature-box">
                        <div class="signature-title">CHAUFFEUR</div>
                        <div class="signature-line"></div>
                        <div class="signature-name">Nom: ${driver ? driver.name : '________________'}</div>
                        <div class="signature-date">Date: ${formattedTime.split(' ')[0]}</div>
                        <div class="signature-status">✓ Opération validée numériquement</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-title">RESPONSABLE</div>
                        <div class="signature-line"></div>
                        <div class="signature-name">Nom: ${this.currentUser ? this.currentUser.name : '________________'}</div>
                        <div class="signature-date">Date: ${formattedTime.split(' ')[0]}</div>
                        <div class="signature-status">✓ Document généré automatiquement</div>
                    </div>
                </div>
            </div>

            <!-- Document Footer -->
            <div class="document-footer">
                <div class="footer-line"></div>
                <p class="document-info">
                    Document généré automatiquement le ${formattedTime}<br>
                    DOUROUB EL DJAZAIR - Système de Gestion de Transport<br>
                    Ce document est confidentiel et propriété de l'entreprise
                </p>
            </div>
        </div>
    `;
}

// Export fiche to PDF using html2canvas + jsPDF
exportFicheToPDF(container, operation, callback) {
    html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: container.scrollWidth,
        height: container.scrollHeight,
        scrollX: 0,
        scrollY: 0
    }).then(canvas => {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210; // A4 width
            const pageHeight = 295; // A4 height
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const fileName = `Fiche_Operation_${operation.operation_number || `OP${operation.id}`}.pdf`;
            pdf.save(fileName);

            // Cleanup
            document.body.removeChild(container);
            callback();

        } catch (error) {
            console.error('PDF generation error:', error);
            document.body.removeChild(container);
            callback();
        }
    }).catch(error => {
        console.error('Canvas generation error:', error);
        document.body.removeChild(container);
        callback();
    });
}

// Export fiche to high-quality JPG
exportFicheToJPG(container, operation, callback) {
    html2canvas(container, {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: container.scrollWidth,
        height: container.scrollHeight,
        scrollX: 0,
        scrollY: 0
    }).then(canvas => {
        try {
            // Convert to high-quality JPEG
            const imgData = canvas.toDataURL('image/jpeg', 0.95); // 95% quality
            
            // Create download link
            const link = document.createElement('a');
            link.download = `Fiche_Operation_${operation.operation_number || `OP${operation.id}`}.jpg`;
            link.href = imgData;
            link.click();

            // Cleanup
            document.body.removeChild(container);
            callback();

        } catch (error) {
            console.error('JPG generation error:', error);
            document.body.removeChild(container);
            callback();
        }
    }).catch(error => {
        console.error('Canvas generation error:', error);
        document.body.removeChild(container);
        callback();
    });
}

// Enhanced toast notification system
showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.smart-toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `smart-toast smart-toast-${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Initialize Lucide icons for the toast
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Hide toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}


generateOperationPDF(operationId) {
    // Create a temporary container for the fiche
    this.showFicheOperation(operationId);
    
    setTimeout(() => {
        const ficheContent = document.getElementById('ficheContent');
        
        // Use html2canvas to capture the content
        html2canvas(ficheContent, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            
            // Create PDF using jsPDF
            const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // Save PDF
            const operation = this.getOperations().find(op => op.id === operationId);
            pdf.save(`Fiche_Operation_${operation.operation_number.replace('-', '_')}.pdf`);
            
            // Close modal
            this.closeModal('ficheModal');
        }).catch(error => {
            console.error('Error generating PDF:', error);
            alert('Erreur lors de la génération du PDF');
        });
    }, 500);
}
// NEW: Populate Client Dropdown for Operations
// NEW: Populate Operation Client Dropdown
// NEW: Populate Client Dropdown for Operations
populateOperationClientDropdown(selectId, selectedId = null) {
    const clients = this.getClients();
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un client</option>';
    clients.forEach(client => {
        const selected = client.id === selectedId ? 'selected' : '';
        select.innerHTML += `<option value="${client.id}" ${selected}>${client.name}</option>`;
    });
    
    // Add change event listener to populate destinations
    select.addEventListener('change', (e) => {
        const clientId = parseInt(e.target.value);
        if (clientId) {
            this.populateOperationDestinationDropdown(clientId);
        } else {
            this.populateOperationDestinationDropdown(null);
        }
    });
}

// NEW: Populate Destination Dropdown for Operations
populateOperationDestinationDropdown(clientId, selectedIndex = null) {
    const select = document.getElementById('editOperationDestination');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner une destination</option>';
    
    if (!clientId) return;
    
    const clients = this.getClients();
    const client = clients.find(c => c.id === clientId);
    
    if (client && client.destinations) {
        client.destinations.forEach((destination, index) => {
            const selected = index === selectedIndex ? 'selected' : '';
            select.innerHTML += `<option value="${index}" ${selected}>${destination.name} - ${destination.wilaya}</option>`;
        });
    }
}

// NEW: Update Mission from Operation Changes
updateMissionFromOperation(operationId, newClientId, newDestinationIndex) {
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return false;
    
    const missions = this.getMissions();
    const mission = missions.find(m => m.id === operation.mission_id);
    if (!mission) return false;
    
    const clients = this.getClients();
    const newClient = clients.find(c => c.id === newClientId);
    if (!newClient || !newClient.destinations[newDestinationIndex]) return false;
    
    const newDestination = newClient.destinations[newDestinationIndex];
    
    // Update mission data
    mission.client_id = newClientId;
    mission.client_name = newClient.name;
    mission.destination_name = newDestination.name;
    mission.arrival_wilaya = newDestination.wilaya;
    
    // Update operation data
    operation.client_name = newClient.name;
    operation.destination_name = newDestination.name;
    operation.arrival_location = newDestination.wilaya;
    
    // Save changes
    this.saveMissions(missions);
    this.saveOperations(operations);
    
    return true;
}

// NEW: Calculate detailed truck roadmap with live operation status
calculateTruckRoadmap(truck, driver, currentOperation, targetMission) {
    const now = new Date();
    const missionStart = new Date(`${targetMission.scheduled_date}T${targetMission.scheduled_time}`);
    
    let roadmap = {
        availability: 'available',
        statusText: 'Disponible immédiatement',
        currentLocation: truck.current_location,
        availabilityTime: 'Maintenant',
        nextLocation: truck.current_location,
        compatibilityScore: 80,
        timeline: []
    };
    
    // If truck is currently on an operation
    if (currentOperation) {
        const operationEndTime = this.estimateOperationEndTime(currentOperation);
        const travelTimeToMission = this.estimateTravelTime(
            currentOperation.arrival_location, 
            targetMission.departure_wilaya
        );
        
        const arrivalAtMissionTime = new Date(operationEndTime);
        arrivalAtMissionTime.setHours(arrivalAtMissionTime.getHours() + travelTimeToMission);
        
        roadmap.timeline = [
            {
                time: this.formatAlgeriaDateTime(now.toISOString()),
                action: `En cours: ${this.getOperationStatusDisplayName(currentOperation.status)}`,
                status: 'current'
            },
            {
                time: this.formatAlgeriaDateTime(operationEndTime),
                action: `Terminera à ${currentOperation.arrival_location}`,
                status: 'estimated'
            },
            {
                time: this.formatAlgeriaDateTime(arrivalAtMissionTime.toISOString()),
                action: `Arrivera à ${targetMission.departure_wilaya}`,
                status: 'future'
            }
        ];
        
        if (arrivalAtMissionTime <= missionStart) {
            roadmap.availability = 'will_be_available';
            roadmap.statusText = 'Sera disponible à temps';
            roadmap.availabilityTime = this.formatAlgeriaDateTime(arrivalAtMissionTime.toISOString());
            roadmap.nextLocation = currentOperation.arrival_location;
            roadmap.compatibilityScore = 70 - (travelTimeToMission * 5); // Penalty for travel time
        } else {
            roadmap.availability = 'unavailable';
            roadmap.statusText = 'Arrivera en retard';
            roadmap.availabilityTime = this.formatAlgeriaDateTime(arrivalAtMissionTime.toISOString());
            roadmap.nextLocation = currentOperation.arrival_location;
            roadmap.compatibilityScore = 20;
        }
    } else {
        // Truck is available now
        const travelTimeToMission = this.estimateTravelTime(truck.current_location, targetMission.departure_wilaya);
        const arrivalTime = new Date(now);
        arrivalTime.setHours(arrivalTime.getHours() + travelTimeToMission);
        
        roadmap.timeline = [
            {
                time: this.formatAlgeriaDateTime(now.toISOString()),
                action: `Disponible à ${truck.current_location}`,
                status: 'current'
            },
            {
                time: this.formatAlgeriaDateTime(arrivalTime.toISOString()),
                action: `Peut arriver à ${targetMission.departure_wilaya}`,
                status: 'future'
            }
        ];
        
        if (truck.current_location === targetMission.departure_wilaya) {
            roadmap.compatibilityScore = 95;
            roadmap.statusText = 'Déjà sur place';
        } else if (travelTimeToMission <= 2) {
            roadmap.compatibilityScore = 85;
            roadmap.statusText = 'Proche du départ';
        } else {
            roadmap.compatibilityScore = 75 - (travelTimeToMission * 2);
            roadmap.statusText = 'Disponible avec déplacement';
        }
    }
    
    return roadmap;
}

// NEW: Estimate when current operation will end
estimateOperationEndTime(operation) {
    const now = new Date();
    
    // If operation has real departure time, calculate based on that
    if (operation.real_departure_time) {
        const departure = new Date(operation.real_departure_time);
        const travelTime = this.estimateTravelTime(
            operation.departure_location, 
            operation.arrival_location
        );
        const estimatedEnd = new Date(departure);
        estimatedEnd.setHours(estimatedEnd.getHours() + travelTime + 2); // Add 2h for loading/unloading
        return estimatedEnd.toISOString();
    }
    
    // If operation is scheduled but not started
    if (operation.estimated_departure) {
        const scheduledDeparture = new Date(operation.estimated_departure);
        const travelTime = this.estimateTravelTime(
            operation.departure_location, 
            operation.arrival_location
        );
        const estimatedEnd = new Date(scheduledDeparture);
        estimatedEnd.setHours(estimatedEnd.getHours() + travelTime + 2);
        return estimatedEnd.toISOString();
    }
    
    // Fallback: estimate based on current time
    const estimatedEnd = new Date(now);
    estimatedEnd.setHours(estimatedEnd.getHours() + 4); // Default 4 hours
    return estimatedEnd.toISOString();
}

// NEW: Get roadmap card styling class
getRoadmapCardClass(availability) {
    switch(availability) {
        case 'available': return 'roadmap-available';
        case 'will_be_available': return 'roadmap-will-be-available';
        case 'unavailable': return 'roadmap-unavailable';
        default: return 'roadmap-unknown';
    }
}

// NEW: Get operation status display name
getOperationStatusDisplayName(status) {
    const statusNames = {
        'en_attente': 'En attente',
        'demarree': 'Démarrée',
        'arrivee_site_chargement': 'Arrivée chargement',
        'chargement_termine': 'Chargement terminé',
        'arrivee_site_destination': 'Arrivée destination',
        'dechargement_termine': 'Terminée'
    };
    return statusNames[status] || status;
}
// NEW: Enhanced assignment event listeners with live roadmap updates
addEnhancedAssignmentEventListeners() {
    const truckSelects = document.querySelectorAll('.truck-select');
    const driverSelects = document.querySelectorAll('.driver-select');
    
    truckSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            const slotIndex = parseInt(e.target.dataset.assignment);
            const truckId = parseInt(e.target.value);
            
            if (truckId) {
                // Auto-assign driver if truck has permanent driver
                const truck = this.getTrucks().find(t => t.id === truckId);
                if (truck && truck.permanent_driver_id) {
                    const driverSelect = document.getElementById(`driver-select-${slotIndex}`);
                    if (driverSelect) {
                        driverSelect.value = truck.permanent_driver_id;
                    }
                }
                
                // Update live roadmap for this slot
                this.updateSlotRoadmap(slotIndex, truckId);
                
                // Show assignment feedback
                this.showEnhancedAssignmentFeedback(slotIndex, truckId);
            } else {
                // Clear roadmap and feedback
                this.clearSlotRoadmap(slotIndex);
            }
        });
    });
    
    driverSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            const slotIndex = parseInt(e.target.dataset.assignment);
            const driverId = parseInt(e.target.value);
            const truckSelect = document.getElementById(`truck-select-${slotIndex}`);
            const truckId = parseInt(truckSelect?.value);
            
            if (truckId && driverId) {
                this.showEnhancedAssignmentFeedback(slotIndex, truckId, driverId);
            }
        });
    });
}

// NEW: Update slot roadmap display
updateSlotRoadmap(slotIndex, truckId) {
    const roadmapContainer = document.getElementById(`assignment-roadmap-${slotIndex}`);
    if (!roadmapContainer) return;
    
    const truck = this.getTrucks().find(t => t.id === truckId);
    const driver = this.getDrivers().find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
    const operations = this.getOperations();
    const currentOperation = operations.find(op => 
        op.assigned_truck_id === truckId && 
        ['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
    );
    
    const roadmap = this.calculateTruckRoadmap(truck, driver, currentOperation, this.currentMissionForAssignment);
    
    roadmapContainer.innerHTML = `
        <div class="mini-roadmap ${roadmap.availability}">
            <div class="roadmap-status-mini">
                <span class="status-dot ${roadmap.availability}"></span>
                <strong>${roadmap.statusText}</strong>
            </div>
            <div class="roadmap-timeline-mini">
                ${roadmap.timeline.slice(0, 2).map(step => `
                    <div class="timeline-step-mini ${step.status}">
                        <span>${step.time}</span>
                        <span>${step.action}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// NEW: Clear slot roadmap
clearSlotRoadmap(slotIndex) {
    const roadmapContainer = document.getElementById(`assignment-roadmap-${slotIndex}`);
    if (roadmapContainer) {
        roadmapContainer.innerHTML = `
            <div class="roadmap-placeholder">
                <i data-lucide="route"></i>
                <span>Sélectionnez un camion pour voir sa feuille de route</span>
            </div>
        `;
        
        // Reinitialize icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }
}

// NEW: Enhanced assignment feedback
showEnhancedAssignmentFeedback(slotIndex, truckId, driverId = null) {
    const feedbackContainer = document.getElementById(`feedback-${slotIndex}`);
    if (!feedbackContainer) return;
    
    const truck = this.getTrucks().find(t => t.id === truckId);
    const driver = driverId ? this.getDrivers().find(d => d.id === driverId) : 
                   this.getDrivers().find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
    
    const roadmap = this.calculateTruckRoadmap(truck, driver, null, this.currentMissionForAssignment);
    
    feedbackContainer.innerHTML = `
        <div class="feedback-card ${roadmap.availability}">
            <div class="feedback-header">
                <span class="feedback-title">Évaluation d'Assignation</span>
                <span class="feedback-score">${roadmap.compatibilityScore}%</span>
            </div>
            <div class="feedback-details">
                <div class="feedback-item">
                    <i data-lucide="truck"></i>
                    <span>${truck.brand} ${truck.model}</span>
                </div>
                ${driver ? `
                    <div class="feedback-item">
                        <i data-lucide="user"></i>
                        <span>${driver.name} (${driver.experience_years} ans)</span>
                    </div>
                ` : ''}
                <div class="feedback-item">
                    <i data-lucide="map-pin"></i>
                    <span>Actuellement: ${roadmap.currentLocation}</span>
                </div>
                <div class="feedback-item">
                    <i data-lucide="clock"></i>
                    <span>Disponible: ${roadmap.availabilityTime}</span>
                </div>
            </div>
        </div>
    `;
    
    // Reinitialize icons
    setTimeout(() => {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 50);
}
// Nouveau système d'assignation destination par destination
// DESTINATION WIZARD SYSTEM
// ========================

// Initialize destination wizard system
initializeDestinationWizard() {
    this.wizardState = {
        currentStep: 0,
        totalSteps: 0,
        destinations: [],
        temporaryAssignments: new Map(), // destination index -> assignments array
        mission: null
    };
    
    console.log('Destination wizard system initialized');
}

// Open the enhanced assignment modal with wizard
openSmartAssignmentModal(missionId) {
	// At start of openSmartAssignmentModal(missionId)

    if (!['planner', 'dispatcher', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les planificateurs, répartiteurs et administrateurs peuvent assigner des missions');
        return;
    }

    
    const mission = this.getMissions().find(m => m.id === missionId);
    if (!mission) {
        alert('Mission introuvable');
        return;
    }
    
    if (mission.status !== 'demandée') {
        alert('Seules les missions en statut "demandée" peuvent être assignées');
        return;
    }
    
    // Initialize wizard state
    this.initializeDestinationWizard();
    this.wizardState.mission = mission;
    
    // Prepare destinations from mission
    if (mission.destinations && mission.destinations.length > 1) {
        this.wizardState.destinations = mission.destinations;
        this.wizardState.totalSteps = mission.destinations.length;
    } else {
        // Single destination mission
        this.wizardState.destinations = [{
            name: mission.destination_name,
            wilaya: mission.arrival_wilaya,
            arrival_date: mission.arrival_date,
            arrival_time: mission.arrival_time,
            trucks_requested: mission.trucks_requested,
            product_type: mission.product_type,
            mission_type: mission.mission_type || 'aller',
            comments: mission.comments || ''
        }];
        this.wizardState.totalSteps = 1;
    }
    
    // Populate mission details
    document.getElementById('missionDetailsAssignment').innerHTML = this.generateMissionDetailsHTML(mission);
    
    // Start wizard at step 0
    this.wizardState.currentStep = 0;
    this.showWizardStep(0);
    
    // Set up wizard event listeners
    this.setupWizardEventListeners();
    
    // Show modal
    this.openModal('assignmentModal');
}

// Setup wizard event listeners
setupWizardEventListeners() {
    // Previous button
    const prevBtn = document.getElementById('wizardPreviousBtn');
    if (prevBtn) {
        prevBtn.onclick = () => this.goToPreviousStep();
    }
    
    // Next button
    const nextBtn = document.getElementById('wizardNextBtn');
    if (nextBtn) {
        nextBtn.onclick = () => this.goToNextStep();
    }
    
    // Complete button
    const completeBtn = document.getElementById('wizardCompleteBtn');
    if (completeBtn) {
        completeBtn.onclick = () => this.completeWizardAssignment();
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('wizardCancelBtn');
    if (cancelBtn) {
        cancelBtn.onclick = () => this.cancelWizard();
    }
    
    // Save draft button
    const saveDraftBtn = document.getElementById('wizardSaveDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.onclick = () => this.saveWizardDraft();
    }
}

// Show specific wizard step
showWizardStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.wizardState.totalSteps) return;
    
    this.wizardState.currentStep = stepIndex;
    const destination = this.wizardState.destinations[stepIndex];
    
    // Update progress
    this.updateWizardProgress();
    
    // Update current destination info
    this.updateCurrentDestinationInfo(destination, stepIndex);
    
    // Show enhanced truck list with full information
    this.showEnhancedTruckList(stepIndex);
    
    // Show current destination assignment slots
    this.showDestinationSlots(destination, stepIndex);
    
    // Update navigation buttons
    this.updateWizardButtons();
    
    console.log(`Showing wizard step ${stepIndex + 1} of ${this.wizardState.totalSteps}`);
}

// Update wizard progress display
updateWizardProgress() {
    const progressCounter = document.getElementById('wizardProgressCounter');
    const progressFill = document.getElementById('wizardProgressFill');
    const destinationsOverview = document.getElementById('destinationsOverview');
    
    if (progressCounter) {
        progressCounter.textContent = `Étape ${this.wizardState.currentStep + 1} sur ${this.wizardState.totalSteps}`;
    }
    
    if (progressFill) {
        const progressPercent = ((this.wizardState.currentStep + 1) / this.wizardState.totalSteps) * 100;
        progressFill.style.width = `${progressPercent}%`;
    }
    
    if (destinationsOverview) {
        destinationsOverview.innerHTML = this.wizardState.destinations.map((dest, index) => {
            const assignments = this.wizardState.temporaryAssignments.get(index) || [];
            const isCompleted = assignments.length >= dest.trucks_requested;
            const isActive = index === this.wizardState.currentStep;
            const isPending = index > this.wizardState.currentStep;
            
            let stepClass = 'dest-step';
            if (isCompleted && !isActive) stepClass += ' completed';
            else if (isActive) stepClass += ' active';
            else stepClass += ' pending';
            
            return `
                <div class="${stepClass}">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-info">
                        <div class="step-name">${dest.name}</div>
                        <div class="step-trucks">${assignments.length}/${dest.trucks_requested} camions</div>
                        <div class="step-status">${dest.wilaya}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Update current destination information
updateCurrentDestinationInfo(destination, stepIndex) {
    const titleElement = document.getElementById('currentDestinationTitle');
    const infoElement = document.getElementById('currentDestinationInfo');
    
    if (titleElement) {
        titleElement.textContent = `📍 Destination ${stepIndex + 1}: ${destination.name}`;
    }
    
    if (infoElement) {
        infoElement.innerHTML = `
            <div class="detail-item">
                <strong>Wilaya:</strong> ${destination.wilaya}
            </div>
            <div class="detail-item">
                <strong>Camions requis:</strong> ${destination.trucks_requested}
            </div>
            <div class="detail-item">
                <strong>Arrivée prévue:</strong> ${destination.arrival_date} ${destination.arrival_time}
            </div>
            <div class="detail-item">
                <strong>Type produit:</strong> ${destination.product_type}
            </div>
            ${destination.comments ? `
                <div class="detail-item">
                    <strong>Commentaires:</strong> ${destination.comments}
                </div>
            ` : ''}
        `;
    }
}
// NEW: Apply truck filters
applyTruckFilters() {
    const trucks = this.getTrucks();
    const statusFilter = document.getElementById('truckStatusFilter')?.value;
    const locationFilter = document.getElementById('truckLocationFilter')?.value;
    
    let filteredTrucks = [...trucks];
    
    // Apply status filter
    if (statusFilter) {
        filteredTrucks = filteredTrucks.filter(truck => {
            if (statusFilter === 'available') {
                return truck.status === 'available';
            } else if (statusFilter === 'busy') {
                return truck.status === 'busy';
            } else if (statusFilter === 'maintenance') {
                return truck.maintenance_status && truck.maintenance_status !== 'operational';
            }
            return true;
        });
    }
    
    // Apply location filter
    if (locationFilter) {
        filteredTrucks = filteredTrucks.filter(truck => 
            truck.current_location === locationFilter
        );
    }
    
    // CRITICAL FIX: Render filtered trucks with proper event handling
    this.renderFilteredTrucks(filteredTrucks);
    
    console.log(`Applied filters: ${filteredTrucks.length} trucks shown`);
}
// NEW: Render filtered trucks with proper event handling
renderFilteredTrucks(filteredTrucks) {
    const drivers = this.getDrivers();
    const operations = this.getOperations();
    const trucksContainer = document.getElementById('trucksGrid');
    
    if (!trucksContainer) {
        console.error('Trucks container not found');
        return;
    }
    
    // Generate HTML for filtered trucks
    trucksContainer.innerHTML = filteredTrucks.map(truck => {
        const driver = drivers.find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
        const currentOperation = operations.find(op => 
            op.assigned_truck_id === truck.id && 
            ['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
        );
        
        // Calculate availability status
        const availability = this.calculateTruckAvailabilityStatus(truck);
        
        // Calculate current location based on operation status
        const currentLocation = this.calculateCurrentLocation(truck, currentOperation);
        
        // Check maintenance status
        const maintenanceInfo = this.getMaintenanceDisplayInfo(truck);
        
        return `
            <div class="truck-card" data-truck-id="${truck.id}">
                <!-- Availability Banner -->
                <div class="truck-availability-banner availability-${availability.class}">
                    ${availability.text}
                </div>
                
                <!-- Truck Header -->
                <div class="truck-card-header">
                    <div class="truck-name-display">${truck.brand} ${truck.model}</div>
                    <div class="truck-registration-display">${truck.registration}</div>
                </div>
                
                <!-- Driver Rectangle -->
                <div class="truck-driver-rectangle">
                    ${driver ? `
                        <div class="truck-driver-name">Chauffeur: ${driver.name}</div>
                        <div class="truck-driver-phone">${driver.phone || 'Téléphone non renseigné'}</div>
                    ` : `
                        <div class="truck-driver-name">Aucun chauffeur assigné</div>
                    `}
                </div>
                
                <!-- Operation Info (if active) -->
                ${currentOperation ? `
                    <div class="truck-operation-info">
                        <div class="operation-info-title">Opération en cours</div>
                        <div class="operation-info-details">
                            ${currentOperation.operation_number} — ${currentOperation.departure_location} → ${currentOperation.arrival_location}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Maintenance Warning (if applicable) -->
                ${maintenanceInfo.isInMaintenance || maintenanceInfo.hasMaintenanceHistory ? `
                    <div class="truck-maintenance-warning">
                        <div class="maintenance-warning-text">
                            ⚠️ ${maintenanceInfo.displayText || maintenanceInfo.type}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Essential Info Summary -->
                <div class="truck-essential-info">
                    <div class="essential-info-item">
                        <span class="essential-info-label">Capacité:</span>
                        <span class="essential-info-value">${truck.capacity || 25} tonnes</span>
                    </div>
                    <div class="essential-info-item">
                        <span class="essential-info-label">Localisation:</span>
                        <span class="essential-info-value">
                            ${currentLocation}
                            ${truck.gps_location ? `
                                <a href="${truck.gps_location}" target="_blank" class="truck-gps-link" title="Voir sur Google Maps">
                                    <i data-lucide="external-link"></i>
                                </a>
                            ` : ''}
                        </span>
                    </div>
                    <div class="essential-info-item">
                        <span class="essential-info-label">Carte Naftal:</span>
                        <span class="essential-info-value">${truck.carte_naftal || 'Non attribuée'}</span>
                    </div>
                </div>
                
                <!-- Expanded Details (Hidden by default) -->
                <div class="truck-expanded-details">
                    <div class="expanded-details-grid">
                        <div class="expanded-detail-item">
                            <span class="expanded-detail-label">Année</span>
                            <span class="expanded-detail-value">${truck.year || 'Non spécifiée'}</span>
                        </div>
                        <div class="expanded-detail-item">
                            <span class="expanded-detail-label">Capacité</span>
                            <span class="expanded-detail-value">${truck.capacity} tonnes</span>
                        </div>
                        <div class="expanded-detail-item">
                            <span class="expanded-detail-label">Carte Naftal</span>
                            <span class="expanded-detail-value">${truck.carte_naftal || 'Non attribuée'}</span>
                        </div>
                        <div class="expanded-detail-item">
                            <div class="expanded-detail-label">État Maintenance:</div>
                            <div class="expanded-detail-value">${maintenanceInfo.displayText || this.getMaintenanceDisplayName(truck.maintenance_status || 'operational')}</div>
                        </div>
                        <div class="expanded-detail-item">
                            <div class="expanded-detail-label">Maintenance dernière:</div>
                            <div class="expanded-detail-value">${truck.last_maintenance ? this.formatDate(truck.last_maintenance) : 'Non renseigné'}</div>
                        </div>
                    </div>
                    
                    ${maintenanceInfo.isInMaintenance || maintenanceInfo.hasMaintenanceHistory ? `
                        <div class="expanded-detail-item" style="grid-column: 1 / -1; margin-top: var(--space-12);">
                            <span class="expanded-detail-label">Maintenance/Vidange</span>
                            <span class="expanded-detail-value">
                                ${maintenanceInfo.isInMaintenance ? 
                                    `🔧 ${maintenanceInfo.type} - ${maintenanceInfo.dateRange}` : 
                                    `✅ Dernière: ${this.getMaintenanceDisplayName(truck.maintenance_status || 'operational')}`
                                }
                            </span>
                        </div>
                    ` : ''}
                    
                    <!-- Actions -->
                    <div class="truck-actions" style="margin-top: var(--space-16); display: flex; gap: var(--space-8); justify-content: center;">
                        ${['dispatcher', 'admin'].includes(this.currentUser.role) ? `
                            <button class="btn btn--outline btn--sm" onclick="event.stopPropagation(); app.editTruck(${truck.id})">
                                <i data-lucide="edit"></i>
                                Modifier
                            </button>
                            <button class="btn btn--outline btn--sm" style="color: var(--color-error);" onclick="event.stopPropagation(); app.deleteTruck(${truck.id})">
                                <i data-lucide="trash-2"></i>
                                Supprimer
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="expanded-close-hint">
                        Cliquez à l'extérieur pour fermer les détails
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // CRITICAL FIX: Reattach click event listeners for truck expansion
    setTimeout(() => {
        this.reattachTruckClickHandlers();
        this.initializeLucideIcons();
    }, 100);
}
// NEW: Reattach click handlers after filtering
reattachTruckClickHandlers() {
    const truckCards = document.querySelectorAll('.truck-card');
    
    truckCards.forEach(card => {
        // Remove any existing listeners
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        // Add click listener for expansion
        newCard.addEventListener('click', (e) => {
            // Don't expand if clicking on buttons or links
            if (e.target.closest('button') || e.target.closest('a')) {
                return;
            }
            
            const truckId = parseInt(newCard.dataset.truckId);
            this.toggleTruckExpansion(truckId);
        });
    });
    
    console.log('Truck click handlers reattached successfully');
}


// NEW: Reset truck filters
resetTruckFilters() {
    const statusFilter = document.getElementById('truckStatusFilter');
    const locationFilter = document.getElementById('truckLocationFilter');
    
    if (statusFilter) {
        statusFilter.value = '';
    }
    if (locationFilter) {
        locationFilter.value = '';
    }
    
    // CRITICAL FIX: Reload full fleet with proper event handling
    this.loadFleet();
    
    console.log('Truck filters reset');
}


// NEW: Display filtered trucks
displayFilteredTrucks(trucks) {
    const drivers = this.getDrivers();
    const operations = this.getOperations();
    const container = document.getElementById('trucksGrid');
    
    if (!container) return;
    
    container.innerHTML = trucks.map(truck => {
        const driver = drivers.find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
        const currentOperation = operations.find(op => 
            op.assigned_truck_id === truck.id && 
            ['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
        );
        
        // Calculate availability status
        const availability = this.calculateTruckAvailabilityStatus(truck);
        
        // Calculate current location based on operation status
        const currentLocation = this.calculateCurrentLocation(truck, currentOperation);
        
        // Check maintenance status
        const maintenanceInfo = this.getMaintenanceDisplayInfo(truck);
        
        return `
            <div class="truck-card" data-truck-id="${truck.id}" onclick="app.toggleTruckExpansion(${truck.id})">
                <!-- Availability Banner -->
                <div class="truck-availability-banner availability-${availability.class}">
                    ${availability.text}
                </div>
                
                <!-- Truck Header -->
                <div class="truck-card-header">
                    <div class="truck-name-display">${truck.brand} ${truck.model}</div>
                    <div class="truck-registration-display">${truck.registration}</div>
                </div>
                
                <!-- Driver Rectangle -->
                <div class="truck-driver-rectangle">
                    ${driver ? `
                        <div class="truck-driver-name">Chauffeur: ${driver.name}</div>
                        <div class="truck-driver-phone">${driver.phone || 'Téléphone non renseigné'}</div>
                    ` : `
                        <div class="truck-driver-name">Aucun chauffeur assigné</div>
                    `}
                </div>
                
                <!-- Operation Info (if active) -->
                ${currentOperation ? `
                    <div class="truck-operation-info">
                        <div class="operation-info-title">Opération en cours</div>
                        <div class="operation-info-details">
                            ${currentOperation.operation_number} — ${currentOperation.departure_location} → ${currentOperation.arrival_location}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Maintenance Warning (if applicable) -->
                ${maintenanceInfo.isInMaintenance || maintenanceInfo.hasMaintenanceHistory ? `
                    <div class="truck-maintenance-warning">
                        <div class="maintenance-warning-text">
                            ⚠️ ${maintenanceInfo.displayText || maintenanceInfo.type}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Truck Essential Info -->
                <div class="truck-essential-info">
                    <div class="essential-info-item">
                        <span class="essential-info-label">Localisation:</span>
                        <span class="essential-info-value">${currentLocation}</span>
                    </div>
                    <div class="essential-info-item">
                        <span class="essential-info-label">Capacité:</span>
                        <span class="essential-info-value">${truck.capacity || 25} tonnes</span>
                    </div>
                    <div class="essential-info-item">
                        <span class="essential-info-label">Statut:</span>
                        <span class="essential-info-value">${this.getTruckStatusDisplay(truck)}</span>
                    </div>
                </div>
                
                <!-- Truck Actions -->
                <div class="truck-actions">
                    ${['dispatcher', 'admin'].includes(this.currentUser.role) ? `
                        <button class="btn btn--outline btn--sm" onclick="event.stopPropagation(); app.editTruck(${truck.id})">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn btn--outline btn--sm" style="color: var(--color-error);" onclick="event.stopPropagation(); app.deleteTruck(${truck.id})">
                            <i data-lucide="trash-2"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    if (trucks.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--color-text-secondary); padding: var(--space-32);">Aucun camion trouvé avec ces filtres</div>';
    }
}

// Show enhanced truck list with maintenance status and full information
showEnhancedTruckList(stepIndex) {
    const container = document.getElementById('enhancedTruckList');
    if (!container) return;
    
    const allTrucks = this.getTrucks();
    const allDrivers = this.getDrivers();
    const operations = this.getOperations();
    const destination = this.wizardState.destinations[stepIndex];
    
    // Get trucks that are temporarily assigned in previous steps
    const temporarilyAssignedTruckIds = new Set();
    for (let i = 0; i < stepIndex; i++) {
        const assignments = this.wizardState.temporaryAssignments.get(i) || [];
        assignments.forEach(assignment => {
            temporarilyAssignedTruckIds.add(assignment.truck_id);
        });
    }
    
    container.innerHTML = allTrucks.map(truck => {
        const driver = allDrivers.find(d => d.id === truck.permanent_driver_id || d.id === truck.assigned_driver_id);
        
        // FIXED: Get ALL operations for this truck, sorted by estimated departure time
        const truckOperations = this.getAllTruckOperationsSorted(truck.id);
        
        // Get the NEXT operation (first in sorted order)
        const nextOperation = truckOperations.length > 0 ? truckOperations[0] : null;
        
        // Determine current location
        let currentLocation = truck.current_location;
        if (nextOperation) {
            // Check if any operation is in progress
            const operationInProgress = truckOperations.find(op => 
                ['demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
            );
            
            if (operationInProgress) {
                // If operation is in progress, current location depends on status
                if (operationInProgress.status === 'demarree') {
                    currentLocation = `En route: ${operationInProgress.departure_location} → ${operationInProgress.arrival_location}`;
                } else if (operationInProgress.status === 'arrivee_site_chargement') {
                    currentLocation = `Sur site de chargement: ${operationInProgress.departure_location}`;
                } else if (operationInProgress.status === 'chargement_termine') {
                    currentLocation = `En route vers: ${operationInProgress.arrival_location}`;
                } else if (operationInProgress.status === 'arrivee_site_destination') {
                    currentLocation = `Sur site de destination: ${operationInProgress.arrival_location}`;
                }
            } else {
                // No operation in progress, use truck's current location
                currentLocation = truck.current_location;
            }
        }
        
        // Determine next destination based on EARLIEST operation
        let nextDestination = truck.current_location;
        if (nextOperation) {
            nextDestination = nextOperation.arrival_location;
        }
        
        // Check if temporarily assigned in previous steps
        const isTemporarilyAssigned = temporarilyAssignedTruckIds.has(truck.id);
        
        // Get maintenance/vidange status
        const maintenanceStatus = this.getTruckMaintenanceStatus(truck);
        
        // Determine availability
        let availability = 'available';
        let generalStatus = 'Disponible';
        if (isTemporarilyAssigned) {
            availability = 'busy';
            generalStatus = 'Assigné (étape précédente)';
        } else if (maintenanceStatus.inMaintenance) {
            availability = 'maintenance';
            generalStatus = maintenanceStatus.statusText;
        } else if (truckOperations.length > 0) {
            availability = 'busy';
            generalStatus = 'En opération';
        } else if (truck.status === 'busy') {
            availability = 'busy';
            generalStatus = 'Occupé';
        }
        
        const canAssign = !isTemporarilyAssigned;
        const needsConfirmation = maintenanceStatus.inMaintenance;
        
        // Function to get status display text and class
        const getOperationStatusInfo = (status) => {
            switch(status) {
                case 'en_attente': return { text: 'En attente', class: 'status-pending' };
                case 'demarree': return { text: 'En cours', class: 'status-in-progress' };
                case 'arrivee_site_chargement': return { text: 'Arrivé au chargement', class: 'status-in-progress' };
                case 'chargement_termine': return { text: 'Chargement terminé', class: 'status-in-progress' };
                case 'arrivee_site_destination': return { text: 'Arrivé à destination', class: 'status-completed' };
                default: return { text: status, class: 'status-pending' };
            }
        };
        
        // Format date and time
        const formatDateTime = (dateString) => {
            if (!dateString) return 'Non défini';
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR') + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        };
        
        return `
            <div class="enhanced-truck-card ${availability}" data-truck-id="${truck.id}">
                <div class="enhanced-truck-header">
                    <div class="truck-main-info">
                        <h5>${truck.brand} ${truck.model}</h5>
                        <div class="truck-registration">${truck.registration}</div>
                    </div>
                    <div class="truck-general-status status-${generalStatus.toLowerCase().replace(/\s+/g, '-')}">
                        ${generalStatus}
                    </div>
                </div>
                
                <div class="truck-detailed-info">
                    <div class="truck-info-row">
                        <div class="truck-info-label">📍 Localisation actuelle:</div>
                        <div class="truck-info-value">${currentLocation}</div>
                    </div>
                    
                    <div class="truck-info-row">
                        <div class="truck-info-label">🎯 Prochaine destination:</div>
                        <div class="truck-info-value">${nextDestination}</div>
                    </div>
                    
                    ${truckOperations.length > 0 ? `
                        <div class="truck-operations-section">
                            <div class="truck-info-label">🚛 Opérations assignées (${truckOperations.length}) - TRIÉES par départ estimé:</div>
                            <div class="truck-operations-list">
                                ${truckOperations.map((op, index) => {
                                    const statusInfo = getOperationStatusInfo(op.status);
                                    return `
                                        <div class="operation-item ${statusInfo.class} ${index === 0 ? 'next-operation-highlight' : ''}">
                                            <div class="operation-header">
                                                <span class="operation-number">
                                                    ${index === 0 ? '🔥 SUIVANTE - ' : `${index + 1}ème - `}Op #${op.mission_number || op.id}
                                                </span>
                                                <span class="operation-status ${statusInfo.class}">${statusInfo.text}</span>
                                            </div>
                                            <div class="operation-route">
                                                ${op.departure_location} → ${op.arrival_location}
                                            </div>
                                            <div class="operation-client">
                                                Client: ${op.client_name || 'Non défini'}
                                            </div>
                                            <div class="operation-timing ${index === 0 ? 'next-timing' : ''}">
                                                ⏰ Départ estimé: ${formatDateTime(op.estimated_departure)}
                                            </div>
                                            ${op.estimated_arrival ? `
                                                <div class="operation-timing">
                                                    🏁 Arrivée estimée: ${formatDateTime(op.estimated_arrival)}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : `
                        <div class="truck-info-row">
                            <div class="truck-info-label">⏰ Disponible:</div>
                            <div class="truck-info-value">Immédiatement</div>
                        </div>
                    `}
                    
                    ${maintenanceStatus.inMaintenance ? `
                        <div class="truck-info-row maintenance-warning">
                            <div class="truck-info-label">🔧 Maintenance:</div>
                            <div class="truck-info-value">${maintenanceStatus.statusText} (jusqu'au ${this.formatAlgeriaDateTime(maintenanceStatus.endDate)})</div>
                        </div>
                    ` : ''}
                    
                    ${driver ? `
                        <div class="truck-info-row">
                            <div class="truck-info-label">👤 Chauffeur:</div>
                            <div class="truck-info-value">${driver.name} (${driver.experience_years} ans)</div>
                        </div>
                    ` : ''}
                    
                    <div class="truck-info-row">
                        <div class="truck-info-label">⚖️ Capacité:</div>
                        <div class="truck-info-value">${truck.capacity || 25} tonnes</div>
                    </div>
                    
                    ${truck.gps_location ? `
                        <div class="truck-info-row truck-gps-row">
                            <div class="truck-info-label">🗺️ Localisation GPS:</div>
                            <div class="truck-info-value">
                                <a href="${truck.gps_location}" target="_blank" class="enhanced-gps-link">
                                    <span class="gps-link-icon">📍</span>
                                    <span class="gps-link-text">Voir sur Google Maps</span>
                                    <span class="gps-link-arrow">→</span>
                                </a>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <button class="truck-assignment-btn ${needsConfirmation ? 'maintenance-warning' : ''}" 
                        ${!canAssign ? 'disabled' : ''}
                        onclick="app.assignTruckToDestination(${truck.id}, ${stepIndex}, false)">

${!canAssign ? '❌ Non disponible' : 
  needsConfirmation ? '⚠️ Assigner (en maintenance)' : 
  '✅ Assigner à cette destination'}

                </button>
            </div>
        `;
    }).join('');
}

// NEW: Automatically advance to next operation when current one finishes
advanceToNextOperation(truckId) {
    console.log(`Advancing truck ${truckId} to next operation based on earliest departure time`);
    
    const operations = this.getOperations();
    const trucks = this.getTrucks();
    
    // Get all pending operations for this truck, sorted by estimated departure
    const pendingOperations = operations.filter(op => 
        op.assigned_truck_id === truckId && 
        op.status === 'en_attente'
    ).sort((a, b) => {
        const timeA = new Date(a.estimated_departure || a.created_at).getTime();
        const timeB = new Date(b.estimated_departure || b.created_at).getTime();
        return timeA - timeB; // Earliest first
    });
    
    if (pendingOperations.length > 0) {
        const nextOperation = pendingOperations[0];
        
        // Update truck status to busy with the next operation
        const truck = trucks.find(t => t.id === truckId);
        if (truck) {
            truck.status = 'busy';
            truck.current_mission_id = nextOperation.mission_id;
            truck.next_available_time = nextOperation.estimated_arrival;
            truck.next_available_location = nextOperation.arrival_location;
            this.saveTrucks(trucks);
        }
        
        // Log the advancement
        this.addActivity(
            `Camion ${truck?.registration} avancé automatiquement à l'opération ${nextOperation.operation_number || nextOperation.id} (départ: ${this.formatAlgeriaDateTime(nextOperation.estimated_departure)})`, 
            'truck'
        );
        
        console.log(`Truck ${truckId} advanced to operation ${nextOperation.id} with earliest departure: ${nextOperation.estimated_departure}`);
        
        // Refresh fleet display
        if (this.currentSection === 'fleet') {
            this.loadFleet();
        }
        
        return nextOperation;
    } else {
        // No more operations, make truck available
        const truck = trucks.find(t => t.id === truckId);
        if (truck) {
            truck.status = 'available';
            truck.current_mission_id = null;
            truck.next_available_time = null;
            truck.next_available_location = truck.current_location;
            this.saveTrucks(trucks);
        }
        
        this.addActivity(`Camion ${truck?.registration} terminé toutes les opérations - maintenant disponible`, 'check');
        
        console.log(`Truck ${truckId} has no more operations - now available`);
        
        return null;
    }
}

// NEW: Get truck operations sorted by estimated departure time (earliest first)
getTruckOperationsSortedByEstimated(truckId) {
    const operations = this.getOperations();
    
    // Get all operations for this truck that are not completed
    const truckOperations = operations.filter(op => 
        op.assigned_truck_id === truckId && 
        ['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
    );
    
    // Sort by estimated departure time (earliest first, even if in the past)
    truckOperations.sort((a, b) => {
        const timeA = new Date(a.estimated_departure || a.created_at).getTime();
        const timeB = new Date(b.estimated_departure || b.created_at).getTime();
        return timeA - timeB; // Ascending order (earliest first)
    });
    
    // Return the first (earliest) operation, or null if no operations
    return truckOperations.length > 0 ? truckOperations[0] : null;
}

// NEW: Get ALL truck operations sorted by estimated departure time
getAllTruckOperationsSorted(truckId) {
    const operations = this.getOperations();
    
    // Get all operations for this truck that are not completed
    const truckOperations = operations.filter(op => 
        op.assigned_truck_id === truckId && 
        ['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
    );
    
    // Sort by estimated departure time (earliest first)
    truckOperations.sort((a, b) => {
        const timeA = new Date(a.estimated_departure || a.created_at).getTime();
        const timeB = new Date(b.estimated_departure || b.created_at).getTime();
        return timeA - timeB;
    });
    
    return truckOperations;
}

// Get truck maintenance status
getTruckMaintenanceStatus(truck) {
    const now = new Date();
    
    if (truck.maintenance_status && truck.maintenance_status !== 'operational' && truck.maintenance_info) {
        const endDate = new Date(truck.maintenance_info.end_date);
        
        if (endDate > now) {
            return {
                inMaintenance: true,
                statusText: `En ${this.getMaintenanceDisplayName(truck.maintenance_status)}`,
                endDate: truck.maintenance_info.end_date,
                type: truck.maintenance_status,
                location: truck.maintenance_info.location
            };
        }
    }
    
    return {
        inMaintenance: false,
        statusText: 'Opérationnel',
        endDate: null,
        type: 'operational',
        location: null
    };
}

// Assign truck to current destination
assignTruckToDestination(truckId, stepIndex, needsConfirmation) {
    const truck = this.getTrucks().find(t => t.id === truckId);
    const driver = this.getDrivers().find(d => d.id === truck.permanent_driver_id || d.id === truck.assigned_driver_id);
    
    if (!truck) {
        alert('Camion introuvable');
        return;
    }
    
    const destination = this.wizardState.destinations[stepIndex];
    const currentAssignments = this.wizardState.temporaryAssignments.get(stepIndex) || [];
    
    // Check if destination is full
    if (currentAssignments.length >= destination.trucks_requested) {
        alert(`Cette destination a déjà le nombre maximum de camions assignés (${destination.trucks_requested})`);
        return;
    }
    
    // Check if truck is already assigned to this destination
    if (currentAssignments.some(a => a.truck_id === truckId)) {
        alert('Ce camion est déjà assigné à cette destination');
        return;
    }
    
    if (needsConfirmation) {
        this.showMaintenanceConfirmation(truck, driver, stepIndex);
    } else {
        this.performTruckAssignment(truck, driver, stepIndex);
    }
}

// Show maintenance confirmation popup
showMaintenanceConfirmation(truck, driver, stepIndex) {
    const maintenanceStatus = this.getTruckMaintenanceStatus(truck);
    
    // Just show a notification and proceed with assignment
    this.showToast(`⚠️ Attention: Camion ${truck.registration} est en maintenance (${maintenanceStatus.statusText}) mais assigné quand même!`, 'warning');
    
    // Directly perform the assignment without confirmation
    this.performTruckAssignment(truck, driver, stepIndex);
}

// Perform the actual truck assignment
performTruckAssignment(truck, driver, stepIndex) {
    const destination = this.wizardState.destinations[stepIndex];
    const currentAssignments = this.wizardState.temporaryAssignments.get(stepIndex) || [];
    
    const newAssignment = {
        truck_id: truck.id,
        driver_id: driver ? driver.id : null,
        truck_info: {
            brand: truck.brand,
            model: truck.model,
            registration: truck.registration,
            current_location: truck.current_location
        },
        driver_info: driver ? {
            name: driver.name,
            phone: driver.phone,
            experience_years: driver.experience_years
        } : null,
        assigned_at: new Date().toISOString(),
        destination_index: stepIndex
    };
    
    currentAssignments.push(newAssignment);
    this.wizardState.temporaryAssignments.set(stepIndex, currentAssignments);
    
    // Refresh displays
    this.showWizardStep(stepIndex);
    
    // Show success message
    this.showToast(`${truck.brand} ${truck.model} assigné à ${destination.name}`, 'success');
    
    console.log(`Truck ${truck.id} temporarily assigned to destination ${stepIndex}`);
}

// Show destination assignment slots
showDestinationSlots(destination, stepIndex) {
    const container = document.getElementById('currentDestinationSlots');
    if (!container) return;
    
    const assignments = this.wizardState.temporaryAssignments.get(stepIndex) || [];
    const slotsNeeded = destination.trucks_requested;
    
    let slotsHtml = '';
    
    for (let i = 0; i < slotsNeeded; i++) {
        const assignment = assignments[i];
        
        slotsHtml += `
            <div class="destination-slot ${assignment ? 'assigned' : 'empty'}">
                <div class="slot-header">
                    <h5>🚛 Camion ${i + 1}</h5>
                    <div class="slot-status">
                        <span class="${assignment ? 'slot-assigned' : 'slot-empty'}">
                            ${assignment ? '✅ Assigné' : '⚪ Libre'}
                        </span>
                    </div>
                </div>
                
                ${assignment ? `
                    <div class="slot-assignment-info">
                        <div class="truck-info-row">
                            <div class="truck-info-label">🚛 Camion:</div>
                            <div class="truck-info-value">${assignment.truck_info.brand} ${assignment.truck_info.model} (${assignment.truck_info.registration})</div>
                        </div>
                        ${assignment.driver_info ? `
                            <div class="truck-info-row">
                                <div class="truck-info-label">👤 Chauffeur:</div>
                                <div class="truck-info-value">${assignment.driver_info.name}</div>
                            </div>
                        ` : ''}
                        <div class="truck-info-row">
                            <div class="truck-info-label">📍 Localisation:</div>
                            <div class="truck-info-value">${assignment.truck_info.current_location}</div>
                        </div>
                        <button class="btn btn--outline btn--sm" onclick="app.removeTemporaryAssignment(${stepIndex}, ${i})">
                            <i data-lucide="x"></i>
                            Retirer
                        </button>
                    </div>
                ` : `
                    <div class="slot-empty-state">
                        <p>Sélectionnez un camion dans la liste ci-dessus</p>
                    </div>
                `}
            </div>
        `;
    }
    
    container.innerHTML = slotsHtml;
    
    // Reinitialize icons
    setTimeout(() => this.initializeLucideIcons(), 100);
}

// Remove temporary assignment
removeTemporaryAssignment(stepIndex, assignmentIndex) {
    const assignments = this.wizardState.temporaryAssignments.get(stepIndex) || [];
    
    if (assignmentIndex >= 0 && assignmentIndex < assignments.length) {
        const removedAssignment = assignments.splice(assignmentIndex, 1)[0];
        this.wizardState.temporaryAssignments.set(stepIndex, assignments);
        
        // Refresh displays
        this.showWizardStep(stepIndex);
        
        this.showToast(`${removedAssignment.truck_info.brand} ${removedAssignment.truck_info.model} retiré de l'assignation`, 'info');
    }
}

// Update wizard navigation buttons
updateWizardButtons() {
    const prevBtn = document.getElementById('wizardPreviousBtn');
    const nextBtn = document.getElementById('wizardNextBtn');
    const completeBtn = document.getElementById('wizardCompleteBtn');
    
    const isFirstStep = this.wizardState.currentStep === 0;
    const isLastStep = this.wizardState.currentStep === this.wizardState.totalSteps - 1;
    const currentAssignments = this.wizardState.temporaryAssignments.get(this.wizardState.currentStep) || [];
    const destination = this.wizardState.destinations[this.wizardState.currentStep];
    const isCurrentStepComplete = currentAssignments.length >= destination.trucks_requested;
    
    // Previous button
    if (prevBtn) {
        prevBtn.style.display = isFirstStep ? 'none' : 'inline-flex';
    }
    
    // Next button
    if (nextBtn) {
        nextBtn.style.display = isLastStep ? 'none' : 'inline-flex';
        nextBtn.disabled = !isCurrentStepComplete;
        nextBtn.textContent = isCurrentStepComplete ? 'Destination Suivante' : `Assignez ${destination.trucks_requested - currentAssignments.length} camion(s) de plus`;
    }
    
    // Complete button
    if (completeBtn) {
        completeBtn.style.display = isLastStep ? 'inline-flex' : 'none';
        completeBtn.disabled = !isCurrentStepComplete;
        
        if (isCurrentStepComplete) {
            const totalAssignments = Array.from(this.wizardState.temporaryAssignments.values()).reduce((sum, assignments) => sum + assignments.length, 0);
            completeBtn.innerHTML = `
                <i data-lucide="check-circle"></i>
                Valider Mission (${totalAssignments} camions)
            `;
        } else {
            completeBtn.innerHTML = `
                <i data-lucide="alert-circle"></i>
                Complétez cette destination
            `;
        }
    }
}

// Navigate to previous step
goToPreviousStep() {
    if (this.wizardState.currentStep > 0) {
        this.showWizardStep(this.wizardState.currentStep - 1);
    }
}

// Navigate to next step
goToNextStep() {
    const currentAssignments = this.wizardState.temporaryAssignments.get(this.wizardState.currentStep) || [];
    const destination = this.wizardState.destinations[this.wizardState.currentStep];
    
    if (currentAssignments.length < destination.trucks_requested) {
        alert(`Veuillez assigner ${destination.trucks_requested - currentAssignments.length} camion(s) de plus à cette destination`);
        return;
    }
    
    if (this.wizardState.currentStep < this.wizardState.totalSteps - 1) {
        this.showWizardStep(this.wizardState.currentStep + 1);
    }
}

// Complete wizard assignment
completeWizardAssignment() {
    // Validate all steps are complete
    for (let i = 0; i < this.wizardState.totalSteps; i++) {
        const assignments = this.wizardState.temporaryAssignments.get(i) || [];
        const destination = this.wizardState.destinations[i];
        
        if (assignments.length < destination.trucks_requested) {
            alert(`Destination ${i + 1} (${destination.name}) n'est pas complètement assignée`);
            this.showWizardStep(i);
            return;
        }
    }
    
    // Convert temporary assignments to final assignments
    const finalAssignments = [];
    const mission = this.wizardState.mission;
    
    for (let destIndex = 0; destIndex < this.wizardState.totalSteps; destIndex++) {
        const assignments = this.wizardState.temporaryAssignments.get(destIndex) || [];
        const destination = this.wizardState.destinations[destIndex];
        
        assignments.forEach((assignment, truckIndex) => {
            finalAssignments.push({
                truck_id: assignment.truck_id,
                driver_id: assignment.driver_id,
                destination_index: destIndex,
                destination_name: destination.name,
                destination_wilaya: destination.wilaya,
                assigned_at: new Date().toISOString()
            });
        });
    }
    
    // Update mission
    this.performFinalWizardAssignment(mission, finalAssignments);
}

// Perform final wizard assignment
performFinalWizardAssignment(mission, finalAssignments) {
    try {
        // Update mission status and assignments
        const missions = this.getMissions();
        const missionIndex = missions.findIndex(m => m.id === mission.id);
        
        if (missionIndex === -1) {
            throw new Error('Mission introuvable');
        }
        
        // Update mission
        missions[missionIndex].status = 'validée';
        missions[missionIndex].assigned_trucks = finalAssignments;
        missions[missionIndex].validated_by = this.currentUser.name;
        missions[missionIndex].validated_at = new Date().toISOString();
        missions[missionIndex].progress_timeline.push({
            status: 'validée',
            timestamp: new Date().toISOString(),
            user: this.currentUser.name,
            method: 'destination_wizard'
        });
        
        this.saveMissions(missions);
        
        // Update truck and driver statuses
        finalAssignments.forEach(assignment => {
            this.updateTruckStatus(assignment.truck_id, 'busy', mission.id);
            if (assignment.driver_id) {
                this.updateDriverStatus(assignment.driver_id, 'busy', mission.id);
            }
        });
        
        // Create operations
        this.createOperationsFromWizardAssignment(mission, finalAssignments);
        
        // Clear wizard state
        this.wizardState = {
            currentStep: 0,
            totalSteps: 0,
            destinations: [],
            temporaryAssignments: new Map(),
            mission: null
        };
        
        // Close modal and refresh
        this.closeModal('assignmentModal');
        this.loadSectionData(this.currentSection);
        this.loadDashboard();
        
        // Success notification
        this.showToast(`Mission assignée avec succès! ${finalAssignments.length} camions assignés`, 'success');
        this.addActivity(`Mission ${mission.client_name} assignée via wizard (${finalAssignments.length} camions)`, 'zap');
        
    } catch (error) {
        console.error('Error completing wizard assignment:', error);
        alert('Erreur lors de la validation: ' + error.message);
    }
}

// Create operations from wizard assignment
createOperationsFromWizardAssignment(mission, assignments) {
    const operations = this.getOperations();
    
    assignments.forEach((assignment, index) => {
        const truck = this.getTrucks().find(t => t.id === assignment.truck_id);
        const driver = this.getDrivers().find(d => d.id === assignment.driver_id);
        const destination = this.wizardState.destinations[assignment.destination_index];
        
        const newOperation = {
            id: this.generateId([...operations]),
            mission_id: mission.id,
            mission_number: `MSN${String(mission.id).padStart(3, '0')}`,
            operation_number: `${String(mission.id).padStart(3, '0')}-${index + 1}`,
            departure_location: mission.departure_wilaya || 'Non spécifié',
            arrival_location: destination.wilaya,
            destination_name: destination.name,
            departure_gps: mission.departure_gps || '',
            arrival_gps: destination.gps_location || '',
            estimated_departure: `${mission.scheduled_date} ${mission.scheduled_time}`,
            estimated_arrival: destination.arrival_date && destination.arrival_time ? 
                `${destination.arrival_date} ${destination.arrival_time}` : '',
            assigned_truck_id: assignment.truck_id,
            assigned_driver_id: assignment.driver_id,
            real_departure_time: null,
            real_arrival_time: null,
            charging_time: null,
            status: 'en_attente',
            created_at: new Date().toISOString(),
            created_by: this.currentUser.name,
            assignment_method: 'destination_wizard',
            client_name: mission.client_name || 'Non spécifié',
            product_type: destination.product_type || 'Non spécifié',
            comments: destination.comments || mission.comments || ''
        };
        
        operations.push(newOperation);
    });
    
    this.saveOperations(operations);
    console.log(`Created ${assignments.length} operations from wizard assignment`);
}

// Cancel wizard and clear temporary assignments
cancelWizard() {
    if (confirm('Êtes-vous sûr de vouloir annuler l\'assignation? Toutes les assignations temporaires seront perdues.')) {
        // Clear wizard state
        this.wizardState = {
            currentStep: 0,
            totalSteps: 0,
            destinations: [],
            temporaryAssignments: new Map(),
            mission: null
        };
        
        this.closeModal('assignmentModal');
        this.showToast('Assignation annulée. Toutes les assignations temporaires ont été supprimées.', 'info');
    }
}

// Save wizard draft (future feature)
saveWizardDraft() {
    // This could save the current wizard state to localStorage
    // for now, just show a message
    this.showToast('Fonctionnalité de sauvegarde de brouillon à venir', 'info');
}

// Show toast notification
showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `smart-toast smart-toast-${type} show`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
        <span>${message}</span>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
    
    // Initialize icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// ENHANCED MAINTENANCE MANAGEMENT
// ===============================

// Override existing truck modal setup to include enhanced maintenance
// Enhanced setupTruckModal with better maintenance section handling
setupTruckModal() {
    if (!this.currentEditingTruckId) {
        this.currentEditingTruckId = null;
        document.querySelector('#truckModal .modal-header h3').textContent = 'Nouveau camion';
        document.querySelector('#truckModal button[type="submit"]').innerHTML = 'Créer le camion';
        document.getElementById('truckForm').reset();
    }
    
    // Hide carte naftal section if user is not admin or dispatcher
    const carteNaftalSection = document.getElementById('carteNaftalSection');
    if (carteNaftalSection) {
        if (!['admin', 'dispatcher'].includes(this.currentUser.role)) {
            carteNaftalSection.style.display = 'none';
        } else {
            carteNaftalSection.style.display = 'flex';
        }
    }
    
    this.populateLocationDropdown('truckLocation');
    this.populateDriverDropdownForTruck('truckAssignedDriver');
    
    // ALWAYS add maintenance section - this fixes the refresh issue
    this.addMaintenanceSection();
}
addMaintenanceSection() {
    // Check if maintenance section already exists and remove it first
    const existingSection = document.getElementById('maintenanceSection');
    if (existingSection) {
        existingSection.remove();
    }
    
    const maintenanceSection = document.createElement('div');
    maintenanceSection.innerHTML = `
        <div class="maintenance-section" id="maintenanceSection">
            <h4>🔧 État et Maintenance</h4>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">État du camion</label>
                    <select id="truckMaintenanceStatus" class="form-control">
                        <option value="operational">✅ Opérationnel</option>
                        <option value="vidange">🛢️ Vidange en cours</option>
                        <option value="probleme_technique">⚙️ Problème technique</option>
                        <option value="revision">🔧 Révision générale</option>
                        <option value="pneus">🛞 Changement pneus</option>
                        <option value="carrosserie">🚗 Réparation carrosserie</option>
                        <option value="moteur">🔧 Réparation moteur</option>
                        <option value="freins">🛑 Réparation freins</option>
                    </select>
                </div>
                <div class="form-group" id="maintenanceLocationGroup" style="display: none;">
                    <label class="form-label">Lieu de maintenance</label>
                    <select id="truckMaintenanceLocation" class="form-control">
                        <option value="">Sélectionner lieu</option>
                        ${this.wilayas.map(wilaya => `<option value="${wilaya}">${wilaya}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row" id="maintenanceDatesGroup" style="display: none;">
                <div class="form-group">
                    <label class="form-label">Date de début</label>
                    <input type="datetime-local" id="truckMaintenanceStart" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label">Date de fin estimée</label>
                    <input type="datetime-local" id="truckMaintenanceEnd" class="form-control">
                </div>
            </div>
            <div class="form-group" id="maintenanceCommentsGroup" style="display: none;">
                <label class="form-label">Détails/Commentaires</label>
                <textarea id="truckMaintenanceComments" class="form-control" rows="3" 
                         placeholder="Détails sur la maintenance ou le problème..."></textarea>
            </div>
        </div>
    `;
    
    // Insert maintenance section before modal actions
    const modalActions = document.querySelector('#truckModal .modal-actions');
    if (modalActions) {
        modalActions.parentNode.insertBefore(maintenanceSection, modalActions);
        
        // IMMEDIATELY set up event listener
        const maintenanceStatusSelect = document.getElementById('truckMaintenanceStatus');
        if (maintenanceStatusSelect) {
            maintenanceStatusSelect.addEventListener('change', (e) => {
                const isOperational = e.target.value === 'operational';
                
                document.getElementById('maintenanceLocationGroup').style.display = isOperational ? 'none' : 'block';
                document.getElementById('maintenanceDatesGroup').style.display = isOperational ? 'none' : 'flex';
                document.getElementById('maintenanceCommentsGroup').style.display = isOperational ? 'none' : 'block';
                
                // Clear fields when switching to operational
                if (isOperational) {
                    document.getElementById('truckMaintenanceLocation').value = '';
                    document.getElementById('truckMaintenanceStart').value = '';
                    document.getElementById('truckMaintenanceEnd').value = '';
                    document.getElementById('truckMaintenanceComments').value = '';
                }
            });
        }
    }
}

addEnhancedMaintenanceSection() {
    // Check if maintenance section already exists
    if (document.getElementById('maintenanceSection')) {
        return;
    }
    
    const maintenanceSection = document.createElement('div');
    maintenanceSection.innerHTML = `
        <div class="maintenance-section" id="maintenanceSection">
            <h4>🔧 État et Maintenance</h4>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">État du camion</label>
                    <select id="truckMaintenanceStatus" class="form-control">
                        <option value="operational">✅ Opérationnel</option>
                        <option value="vidange">🛢️ Vidange en cours</option>
                        <option value="probleme_technique">⚙️ Problème technique</option>
                        <option value="revision">🔧 Révision générale</option>
                        <option value="pneus">🛞 Changement pneus</option>
                        <option value="carrosserie">🚗 Réparation carrosserie</option>
                        <option value="moteur">🔧 Réparation moteur</option>
                        <option value="freins">🛑 Réparation freins</option>
                    </select>
                </div>
                <div class="form-group" id="maintenanceLocationGroup" style="display: none;">
                    <label class="form-label">Lieu de maintenance</label>
                    <select id="truckMaintenanceLocation" class="form-control">
                        <option value="">Sélectionner lieu</option>
                        ${this.wilayas.map(wilaya => `<option value="${wilaya}">${wilaya}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row" id="maintenanceDatesGroup" style="display: none;">
                <div class="form-group">
                    <label class="form-label">Date de début</label>
                    <input type="datetime-local" id="truckMaintenanceStart" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label">Date de fin estimée</label>
                    <input type="datetime-local" id="truckMaintenanceEnd" class="form-control">
                </div>
            </div>
            <div class="form-group" id="maintenanceCommentsGroup" style="display: none;">
                <label class="form-label">Détails/Commentaires</label>
                <textarea id="truckMaintenanceComments" class="form-control" rows="3" 
                         placeholder="Détails sur la maintenance ou le problème..."></textarea>
            </div>
        </div>
    `;
    
    // Insert maintenance section before modal actions
    const modalActions = document.querySelector('#truckModal .modal-actions');
    if (modalActions) {
        modalActions.parentNode.insertBefore(maintenanceSection, modalActions);
    }
    
    // Add event listener for maintenance status changes
    setTimeout(() => {
        const maintenanceStatusSelect = document.getElementById('truckMaintenanceStatus');
        if (maintenanceStatusSelect) {
            maintenanceStatusSelect.addEventListener('change', (e) => {
                const isOperational = e.target.value === 'operational';
                
                document.getElementById('maintenanceLocationGroup').style.display = isOperational ? 'none' : 'block';
                document.getElementById('maintenanceDatesGroup').style.display = isOperational ? 'none' : 'flex';
                document.getElementById('maintenanceCommentsGroup').style.display = isOperational ? 'none' : 'block';
                
                // Clear fields when switching to operational
                if (isOperational) {
                    document.getElementById('truckMaintenanceLocation').value = '';
                    document.getElementById('truckMaintenanceStart').value = '';
                    document.getElementById('truckMaintenanceEnd').value = '';
                    document.getElementById('truckMaintenanceComments').value = '';
                }
            });
        }
    }, 100);
}


// Setup enhanced maintenance event listeners
setupEnhancedMaintenanceListeners() {
    const maintenanceTypeSelect = document.getElementById('truckMaintenanceType');
    if (maintenanceTypeSelect) {
        maintenanceTypeSelect.addEventListener('change', (e) => {
            const isOperational = e.target.value === 'operational';
            const isMaintenance = e.target.value === 'maintenance';
            const isVidange = e.target.value === 'vidange';
            
            // Show/hide sections based on selection
            document.getElementById('maintenanceLocationGroup').style.display = isOperational ? 'none' : 'block';
            document.getElementById('maintenanceDatesGroup').style.display = isOperational ? 'none' : 'flex';
            document.getElementById('maintenanceDetailsGroup').style.display = isOperational ? 'none' : 'block';
            document.getElementById('maintenanceCommentsGroup').style.display = isOperational ? 'none' : 'block';
            
            // Show/hide options in details dropdown
            const maintenanceOptions = document.getElementById('maintenanceOptions');
            const vidangeOptions = document.getElementById('vidangeOptions');
            
            if (maintenanceOptions && vidangeOptions) {
                if (isMaintenance) {
                    maintenanceOptions.style.display = 'block';
                    vidangeOptions.style.display = 'none';
                } else if (isVidange) {
                    maintenanceOptions.style.display = 'none';
                    vidangeOptions.style.display = 'block';
                } else {
                    maintenanceOptions.style.display = 'block';
                    vidangeOptions.style.display = 'block';
                }
            }
            
            // Clear fields when switching to operational
            if (isOperational) {
                document.getElementById('truckMaintenanceLocation').value = '';
                document.getElementById('truckMaintenanceStart').value = '';
                document.getElementById('truckMaintenanceEnd').value = '';
                document.getElementById('truckMaintenanceDetails').value = '';
                document.getElementById('truckMaintenanceComments').value = '';
            }
        });
    }
}


generateDestinationWizard(mission) {
    const container = document.getElementById('truckAssignments');
    const destinations = mission.destinations || [mission];
    const currentIndex = this.wizardState.currentDestinationIndex;
    const currentDestination = destinations[currentIndex];
    
    container.innerHTML = `
        <div class="destination-wizard">
            <!-- Progress Indicator -->
            <div class="wizard-progress">
                <div class="progress-header">
                    <h4>🎯 Assignation Multi-Destinations</h4>
                    <div class="progress-counter">
                        Destination ${currentIndex + 1} sur ${destinations.length}
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((currentIndex) / destinations.length) * 100}%"></div>
                </div>
                <div class="destinations-overview">
                    ${destinations.map((dest, index) => `
                        <div class="dest-step ${index < currentIndex ? 'completed' : index === currentIndex ? 'active' : 'pending'}">
                            <div class="step-number">${index + 1}</div>
                            <div class="step-info">
                                <div class="step-name">${dest.name}</div>
                                <div class="step-trucks">${dest.trucks_requested} camions</div>
                                ${this.wizardState.completedAssignments[index] ? 
                                    `<div class="step-status">✅ Assigné</div>` : 
                                    index === currentIndex ? `<div class="step-status">🔄 En cours</div>` :
                                    `<div class="step-status">⏳ En attente</div>`}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Current Destination Details -->
            <div class="current-destination-card">
                <div class="destination-header">
                    <h3>📍 ${currentDestination.name}</h3>
                    <div class="destination-details">
                        <span class="detail-item">📍 ${currentDestination.wilaya}</span>
                        <span class="detail-item">📅 ${currentDestination.arrival_date} ${currentDestination.arrival_time}</span>
                        <span class="detail-item">🚛 ${currentDestination.trucks_requested} camions requis</span>
                        <span class="detail-item">📦 ${currentDestination.product_type}</span>
                    </div>
                </div>
                
                <!-- Smart Recommendations for Current Destination -->
                <div class="destination-recommendations" id="current-dest-recommendations">
                    <!-- Will be populated by smart recommendations -->
                </div>
                
                <!-- Assignment Slots for Current Destination -->
                <div class="destination-assignments" id="current-dest-assignments">
                    ${this.generateDestinationAssignmentSlots(currentDestination, currentIndex)}
                </div>
                
                <!-- Navigation Controls -->
                <div class="wizard-controls">
                    <button class="btn btn--outline" ${currentIndex === 0 ? 'disabled' : ''} 
                            onclick="app.previousDestination()">
                        <i data-lucide="chevron-left"></i>
                        Destination Précédente
                    </button>
                    
                    <div class="control-center">
                        <button class="btn btn--secondary" onclick="app.autoAssignCurrentDestination()">
                            <i data-lucide="zap"></i>
                            Auto-Assigner Meilleurs
                        </button>
                        <button class="btn btn--outline" onclick="app.clearCurrentDestinationAssignments()">
                            <i data-lucide="x-circle"></i>
                            Vider Assignations
                        </button>
                    </div>
                    
                    <button class="btn btn--primary" onclick="app.nextDestination()" 
                            id="nextDestinationBtn">
                        <i data-lucide="chevron-right"></i>
                        ${currentIndex === destinations.length - 1 ? 'Finaliser Assignations' : 'Destination Suivante'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Generate smart recommendations for current destination
    this.generateDestinationSmartRecommendations(currentDestination, currentIndex);
    
    // Refresh icons
    this.initializeLucideIcons();
}

generateDestinationAssignmentSlots(destination, destIndex) {
    let slotsHtml = '';
    
    for (let i = 0; i < destination.trucks_requested; i++) {
        const slotId = `${destIndex}-${i}`;
        slotsHtml += `
            <div class="assignment-slot destination-slot" data-destination="${destIndex}" data-slot="${i}">
                <div class="slot-header">
                    <h5>🚛 Camion ${i + 1} pour ${destination.name}</h5>
                    <div class="slot-status" id="slot-status-${slotId}">
                        <span class="slot-empty">⚪ Non assigné</span>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Camion *</label>
                        <select class="form-control truck-select" data-destination="${destIndex}" data-slot="${i}" id="truck-select-${slotId}">
                            <option value="">Sélectionner un camion</option>
                            ${this.getAvailableTrucksForDestination(destination).map(truck => `
                                <option value="${truck.id}">
                                    ${truck.brand} ${truck.model} (${truck.registration}) - ${truck.current_location}
                                    ${this.getTruckStatusDisplay(truck)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Chauffeur *</label>
                        <select class="form-control driver-select" data-destination="${destIndex}" data-slot="${i}" id="driver-select-${slotId}">
                            <option value="">Sélectionner un chauffeur</option>
                            ${this.getAvailableDriversForDestination(destination).map(driver => `
                                <option value="${driver.id}">
                                    ${driver.name} (${driver.experience_years} ans)
                                    ${this.getDriverStatusDisplay(driver)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="assignment-feedback" id="feedback-${slotId}">
                    <!-- Feedback will be shown here -->
                </div>
            </div>
        `;
    }
    
    return slotsHtml;
}

// Navigation entre destinations
nextDestination() {
    const currentDest = this.wizardState.currentDestinationIndex;
    const isLastDestination = currentDest === this.wizardState.totalDestinations - 1;
    
    // Valider que toutes les assignations sont complètes
    if (!this.validateCurrentDestinationAssignments()) {
        alert('Veuillez assigner tous les camions pour cette destination avant de continuer.');
        return;
    }
    
    // Sauvegarder les assignations actuelles
    this.saveCurrentDestinationAssignments();
    
    if (isLastDestination) {
        // Finaliser toutes les assignations
        this.finalizeAllAssignments();
    } else {
        // Passer à la destination suivante
        this.wizardState.currentDestinationIndex++;
        this.generateDestinationWizard(this.currentMissionForAssignment);
    }
}

previousDestination() {
    if (this.wizardState.currentDestinationIndex > 0) {
        this.wizardState.currentDestinationIndex--;
        this.generateDestinationWizard(this.currentMissionForAssignment);
    }
}

saveCurrentDestinationAssignments() {
    const currentIndex = this.wizardState.currentDestinationIndex;
    const assignments = [];
    
    const destination = this.currentMissionForAssignment.destinations[currentIndex];
    
    for (let i = 0; i < destination.trucks_requested; i++) {
        const slotId = `${currentIndex}-${i}`;
        const truckSelect = document.getElementById(`truck-select-${slotId}`);
        const driverSelect = document.getElementById(`driver-select-${slotId}`);
        
        if (truckSelect.value && driverSelect.value) {
            assignments.push({
                truck_id: parseInt(truckSelect.value),
                driver_id: parseInt(driverSelect.value),
                destination_index: currentIndex,
                slot_index: i
            });
        }
    }
    
    this.wizardState.completedAssignments[currentIndex] = assignments;
}

validateCurrentDestinationAssignments() {
    const currentIndex = this.wizardState.currentDestinationIndex;
    const destination = this.currentMissionForAssignment.destinations[currentIndex];
    
    for (let i = 0; i < destination.trucks_requested; i++) {
        const slotId = `${currentIndex}-${i}`;
        const truckSelect = document.getElementById(`truck-select-${slotId}`);
        const driverSelect = document.getElementById(`driver-select-${slotId}`);
        
        if (!truckSelect.value || !driverSelect.value) {
            return false;   
        }
    }
    
    return true;
}
// FIXED: Auto-assign vraiment les meilleurs camions
autoAssignCurrentDestination() {
    const currentIndex = this.wizardState.currentDestinationIndex;
    const destination = this.currentMissionForAssignment.destinations[currentIndex];
    
    // Obtenir les recommandations triées par score
    const recommendations = this.generateSmartRecommendations(this.currentMissionForAssignment);
    const sortedRecommendations = recommendations.sort((a, b) => b.analysis.score - a.analysis.score);
    
    // Filtrer seulement les disponibles et bons
    const bestRecommendations = sortedRecommendations.filter(rec => 
        ['excellent', 'good', 'possible'].includes(rec.analysis.category)
    );
    
    // Assigner les meilleurs
    for (let i = 0; i < destination.trucks_requested && i < bestRecommendations.length; i++) {
        const rec = bestRecommendations[i];
        const slotId = `${currentIndex}-${i}`;
        
        const truckSelect = document.getElementById(`truck-select-${slotId}`);
        const driverSelect = document.getElementById(`driver-select-${slotId}`);
        
        if (truckSelect && driverSelect) {
            truckSelect.value = rec.truck.id;
            driverSelect.value = rec.driver ? rec.driver.id : '';
            
            // Trigger change events
            truckSelect.dispatchEvent(new Event('change'));
            driverSelect.dispatchEvent(new Event('change'));
            
            // Update display
            this.updateSlotStatusDisplay(`${currentIndex}-${i}`, rec.truck.id, rec.driver?.id);
        }
    }
    
    this.showToast(`Assigné automatiquement les ${Math.min(destination.trucks_requested, bestRecommendations.length)} meilleurs camions`, 'success');
}
// ============================================
// CYCLIC TRUCK & DRIVER UPDATE SYSTEM
// ============================================

// Main cyclic update method called when operation status changes
applyCyclicUpdates(operationId, newStatus, oldStatus) {
    console.log(`Applying cyclic updates for operation ${operationId}: ${oldStatus} → ${newStatus}`);
    
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    
    if (!operation) {
        console.error(`Operation ${operationId} not found`);
        return;
    }
    
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const missions = this.getMissions();
    
    const truck = trucks.find(t => t.id === operation.assigned_truck_id);
    const driver = drivers.find(d => d.id === operation.assigned_driver_id);
    const mission = missions.find(m => m.id === operation.mission_id);
    
    if (!truck || !driver || !mission) {
        console.error('Missing truck, driver, or mission data');
        return;
    }
    
    // Apply updates based on new status
    const updates = this.calculateCyclicUpdates(operation, newStatus, truck, driver, mission);
    
    // Apply truck updates
    if (updates.truck) {
        this.updateTruckCyclic(truck.id, updates.truck);
    }
    
    // Apply driver updates
    if (updates.driver) {
        this.updateDriverCyclic(driver.id, updates.driver);
    }
    
    // Handle mission type specific logic
    if (updates.missionLogic) {
        this.handleMissionTypeLogic(operation, mission, updates.missionLogic);
    }
    
    // Log the update
    this.logCyclicUpdate(operationId, newStatus, updates);
    
    // Refresh displays
    this.refreshAllDisplays();
}

// Calculate what updates need to be applied
calculateCyclicUpdates(operation, newStatus, truck, driver, mission) {
    const updates = {
        truck: {},
        driver: {},
        missionLogic: null
    };
    
    const departureWilaya = operation.departure_location || mission.departure_wilaya;
    const destinationWilaya = operation.arrival_location || mission.arrival_wilaya;
    const missionType = mission.mission_type || 'aller';
    
    switch(newStatus) {
        case 'en_attente':
            updates.truck = {
                status: 'available',
                current_location: truck.current_location || departureWilaya,
                next_available_time: null,
                next_available_location: truck.current_location || departureWilaya
            };
            updates.driver = {
                status: 'available',
                current_location: driver.current_location || departureWilaya,
                next_available_time: null,
                next_available_location: driver.current_location || departureWilaya
            };
            break;
            
        case 'demarree':
            updates.truck = {
                status: 'busy',
                current_location: departureWilaya,
                next_available_location: destinationWilaya,
                current_mission_id: mission.id
            };
            updates.driver = {
                status: 'busy',
                current_location: departureWilaya,
                next_available_location: destinationWilaya,
                current_mission_id: mission.id
            };
            break;
            
        case 'arrivee_site_chargement':
            // Location stays at departure wilaya (charging site)
            updates.truck = {
                status: 'busy',
                current_location: departureWilaya,
                next_available_location: destinationWilaya
            };
            updates.driver = {
                status: 'busy',
                current_location: departureWilaya,
                next_available_location: destinationWilaya
            };
            break;
            
        case 'chargement_termine':
            // Still at departure wilaya after loading
            updates.truck = {
                status: 'busy',
                current_location: departureWilaya,
                next_available_location: destinationWilaya
            };
            updates.driver = {
                status: 'busy',
                current_location: departureWilaya,
                next_available_location: destinationWilaya
            };
            break;
            
        case 'arrivee_site_destination':
            updates.truck = {
                status: 'busy',
                current_location: destinationWilaya,
                next_available_location: destinationWilaya
            };
            updates.driver = {
                status: 'busy',
                current_location: destinationWilaya,
                next_available_location: destinationWilaya
            };
            break;
            
        case 'dechargement_termine':
            updates.truck = {
                status: 'available',
                current_location: destinationWilaya,
                next_available_time: null,
                next_available_location: destinationWilaya,
                current_mission_id: null
            };
            updates.driver = {
                status: 'available',
                current_location: destinationWilaya,
                next_available_time: null,
                next_available_location: destinationWilaya,
                current_mission_id: null
            };
            
            // Handle mission type logic for return trips
            if (missionType === 'aller_retour') {
                updates.missionLogic = {
                    type: 'create_return_trip',
                    from: destinationWilaya,
                    to: '07-Biskra' // Your company's base location
                };
            }
            break;
            
        case 'probleme_signalee':
            updates.truck = {
                status: 'blocked',
                current_location: truck.current_location, // Keep last known location
            };
            updates.driver = {
                status: 'available', // Driver can be reassigned
                current_location: driver.current_location
            };
            break;
            
        case 'annulee':
            updates.truck = {
                status: 'available',
                current_location: departureWilaya,
                current_mission_id: null,
                next_available_time: null,
                next_available_location: departureWilaya
            };
            updates.driver = {
                status: 'available',
                current_location: departureWilaya,
                current_mission_id: null,
                next_available_time: null,
                next_available_location: departureWilaya
            };
            break;
    }
    
    return updates;
}

// Update truck with cyclic changes
updateTruckCyclic(truckId, updates) {
    const trucks = this.getTrucks();
    const truckIndex = trucks.findIndex(t => t.id === truckId);
    
    if (truckIndex === -1) return;
    
    // Apply updates
    Object.keys(updates).forEach(key => {
        trucks[truckIndex][key] = updates[key];
    });
    
    // Add timestamp
    trucks[truckIndex].last_cyclic_update = new Date().toISOString();
    trucks[truckIndex].updated_by_system = true;
    
    this.saveTrucks(trucks);
    console.log(`Truck ${truckId} updated cyclically:`, updates);
}

// Update driver with cyclic changes
updateDriverCyclic(driverId, updates) {
    const drivers = this.getDrivers();
    const driverIndex = drivers.findIndex(d => d.id === driverId);
    
    if (driverIndex === -1) return;
    
    // Apply updates
    Object.keys(updates).forEach(key => {
        drivers[driverIndex][key] = updates[key];
    });
    
    // Add timestamp
    drivers[driverIndex].last_cyclic_update = new Date().toISOString();
    drivers[driverIndex].updated_by_system = true;
    
    this.saveDrivers(drivers);
    console.log(`Driver ${driverId} updated cyclically:`, updates);
}

// Handle mission type specific logic
handleMissionTypeLogic(operation, mission, logic) {
    if (logic.type === 'create_return_trip') {
        // Create return trip for aller-retour missions
        this.createReturnTrip(operation, mission, logic.from, logic.to);
    }
}

// Create return trip operation
createReturnTrip(originalOperation, mission, fromWilaya, toWilaya) {
    const operations = this.getOperations();
    const returnOperationId = this.generateId(operations);
    
    const returnOperation = {
        id: returnOperationId,
        mission_id: mission.id,
        mission_number: originalOperation.mission_number,
        operation_number: `${originalOperation.operation_number}-RETOUR`,
        departure_location: fromWilaya,
        arrival_location: toWilaya,
        destination_name: 'Retour Base Biskra',
        departure_gps: '',
        arrival_gps: '',
        estimated_departure: null, // Will be set when ready
        estimated_arrival: null,
        assigned_truck_id: originalOperation.assigned_truck_id,
        assigned_driver_id: originalOperation.assigned_driver_id,
        real_departure_time: null,
        real_arrival_time: null,
        status: 'en_attente',
        created_at: new Date().toISOString(),
        created_by: 'System (Aller-Retour)',
        assignment_method: 'automatic_return',
        client_name: mission.client_name,
        product_type: 'Transport de retour',
        comments: `Retour automatique généré pour mission ${mission.client_name}`,
        is_return_trip: true,
        original_operation_id: originalOperation.id
    };
    
    operations.push(returnOperation);
    this.saveOperations(operations);
    
    console.log(`Return trip created: ${returnOperation.operation_number}`);
    
    // Send notification
    this.sendNotification('coordinator', 'return_trip_created', 
        `Trajet retour créé automatiquement: ${returnOperation.operation_number}`, {
            operation_id: returnOperationId,
            truck_id: originalOperation.assigned_truck_id,
            driver_id: originalOperation.assigned_driver_id
        });
}

// Log cyclic updates for debugging
logCyclicUpdate(operationId, newStatus, updates) {
    const logs = JSON.parse(localStorage.getItem('cyclic_update_logs') || '[]');
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        operation_id: operationId,
        new_status: newStatus,
        truck_updates: updates.truck,
        driver_updates: updates.driver,
        mission_logic: updates.missionLogic,
        user: this.currentUser.name
    };
    
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('cyclic_update_logs', JSON.stringify(logs));
}

// Refresh all relevant displays
refreshAllDisplays() {
    // Refresh current section
    this.loadSectionData(this.currentSection);
    
    // Refresh dashboard if not current section
    if (this.currentSection !== 'dashboard') {
        this.loadFleetStatus();
    }
    
    // Refresh operations table if in tracking section
    if (this.currentSection === 'tracking') {
        this.loadOperationsTable();
    }
}

// Maintenance/Vidange confirmation system
checkMaintenanceAssignment(truckId, callback) {
    const trucks = this.getTrucks();
    const truck = trucks.find(t => t.id === truckId);
    
    if (!truck) return callback(false);
    
    // Check if truck is in maintenance or vidange
    if (truck.maintenance_status && truck.maintenance_status !== 'operational') {
        this.showMaintenanceConfirmation(truck, callback);
    } else {
        callback(true);
    }
}

// Show maintenance confirmation popup
showMaintenanceConfirmation(truck, callback) {
    const modal = document.getElementById('maintenanceConfirmModal');
    const content = document.getElementById('maintenanceConfirmContent');
    
    const maintenanceInfo = truck.maintenance_info || {};
    const endDate = maintenanceInfo.end_date ? new Date(maintenanceInfo.end_date) : null;
    
    content.innerHTML = `
        <div class="maintenance-warning">
            <h4><i data-lucide="alert-triangle"></i> Camion en Maintenance</h4>
            <div class="warning-details">
                <p><strong>Camion:</strong> ${truck.brand} ${truck.model} (${truck.registration})</p>
                <p><strong>Type:</strong> ${this.getMaintenanceDisplayName(truck.maintenance_status)}</p>
                ${endDate ? `<p><strong>Fin prévue:</strong> ${this.formatAlgeriaDateTime(maintenanceInfo.end_date)}</p>` : ''}
                ${maintenanceInfo.location ? `<p><strong>Lieu:</strong> ${maintenanceInfo.location}</p>` : ''}
                ${maintenanceInfo.comments ? `<p><strong>Détails:</strong> ${maintenanceInfo.comments}</p>` : ''}
            </div>
            <div class="confirmation-question">
                <strong>Voulez-vous quand même assigner ce camion?</strong>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Handle confirmation
    const confirmBtn = document.getElementById('confirmMaintenanceAssignment');
    const cancelBtn = document.getElementById('cancelMaintenanceAssignment');
    
    const handleConfirm = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        callback(true);
    };
    
    const handleCancel = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        callback(false);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

// Dispatcher override system
applyDispatcherOverride(operationId, overrides) {
    if (!['dispatcher', 'admin'].includes(this.currentUser.role)) {
        alert('Seuls les répartiteurs et administrateurs peuvent forcer les modifications');
        return;
    }
    
    const operations = this.getOperations();
    const operation = operations.find(op => op.id === operationId);
    
    if (!operation) return;
    
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    const truck = trucks.find(t => t.id === operation.assigned_truck_id);
    const driver = drivers.find(d => d.id === operation.assigned_driver_id);
    
    // Apply truck overrides
    if (overrides.truckStatus && truck) {
        this.updateTruckCyclic(truck.id, { 
            status: overrides.truckStatus,
            forced_by: this.currentUser.name,
            forced_at: new Date().toISOString(),
            force_reason: overrides.reason
        });
    }
    
    if (overrides.truckLocation && truck) {
        this.updateTruckCyclic(truck.id, { 
            current_location: overrides.truckLocation,
            next_available_location: overrides.truckLocation,
            forced_by: this.currentUser.name,
            forced_at: new Date().toISOString(),
            force_reason: overrides.reason
        });
    }
    
    // Log override
    this.addActivity(`Forçage répartiteur: ${overrides.reason}`, 'settings');
    
    // Send notification
    this.sendNotification('admin', 'dispatcher_override', 
        `Forçage appliqué par ${this.currentUser.name}: ${overrides.reason}`, {
            operation_id: operationId,
            overrides: overrides
        });
}
// ============================================
// ENHANCED REPORTS SYSTEM - MAJOR UPDATE
// ============================================

// Initialize Enhanced Reports System
initializeEnhancedReports() {
    // Set up event listeners for report controls
    const generateBtn = document.getElementById('generateReportBtn');
    const exportBtn = document.getElementById('exportExcelBtn');
    const refreshBtn = document.getElementById('refreshReportsBtn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', () => this.generateReport());
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportReportToExcel());
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.refreshReports());
    }
    
    // Report type change listeners
    const reportTypeOptions = document.querySelectorAll('input[name="reportType"]');
    reportTypeOptions.forEach(option => {
        option.addEventListener('change', () => this.onReportTypeChange());
    });
    
    // Period filter change listener
    const periodFilter = document.getElementById('reportPeriodFilter');
    if (periodFilter) {
        periodFilter.addEventListener('change', () => this.onPeriodFilterChange());
    }
    
    // Pagination listeners
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => this.previousPage());
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => this.nextPage());
    }
    
    // Initialize pagination
    this.currentPage = 1;
    this.itemsPerPage = 50;
    this.totalItems = 0;
    
    console.log('Enhanced Reports System initialized');
}

// Load Enhanced Reports
loadReports() {
    console.log('Loading enhanced reports...');
    
    // Populate filter dropdowns
    this.populateReportFilters();
    
    // Initialize enhanced reports system
    this.initializeEnhancedReports();
    
    // Load default report (Missions)
    this.generateReport();
    setTimeout(() => {
        this.initializeReportFilters();
        this.populateReportFilters();
        this.initializeLucideIcons();
    }, 100);
}

// Populate Report Filter Dropdowns
populateReportFilters() {
    const clients = this.getClients();
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    const operations = this.getOperations();
    
    // Populate clients dropdown
    const clientFilter = document.getElementById('reportClientFilter');
    if (clientFilter) {
        clientFilter.innerHTML = '<option value="">Tous les clients</option>';
        clients.forEach(client => {
            clientFilter.innerHTML += `<option value="${client.id}">${client.name}</option>`;
        });
    }
    
    // Populate trucks dropdown
    const truckFilter = document.getElementById('reportTruckFilter');
    if (truckFilter) {
        truckFilter.innerHTML = '<option value="">Tous les camions</option>';
        trucks.forEach(truck => {
            truckFilter.innerHTML += `<option value="${truck.id}">${truck.brand} ${truck.model} (${truck.registration})</option>`;
        });
    }
    
    // Populate drivers dropdown
    const driverFilter = document.getElementById('reportDriverFilter');
    if (driverFilter) {
        driverFilter.innerHTML = '<option value="">Tous les chauffeurs</option>';
        drivers.forEach(driver => {
            driverFilter.innerHTML += `<option value="${driver.id}">${driver.name}</option>`;
        });
    }
    
    // Populate destinations dropdown
    const destinationFilter = document.getElementById('reportDestinationFilter');
    if (destinationFilter) {
        destinationFilter.innerHTML = '<option value="">Toutes les destinations</option>';
        const uniqueDestinations = [...new Set(operations.map(op => op.destination_name || op.arrival_location).filter(Boolean))];
        uniqueDestinations.forEach(dest => {
            destinationFilter.innerHTML += `<option value="${dest}">${dest}</option>`;
        });
    }
}

// Generate Report Based on Selected Type
generateReport() {
    const reportType = document.querySelector('input[name="reportType"]:checked')?.value || 'missions';
    const filters = this.getReportFilters();
    
    console.log(`Generating ${reportType} report with filters:`, filters);
    
    // Reset pagination
    this.currentPage = 1;
    
    switch(reportType) {
        case 'missions':
            this.generateMissionsReport(filters);
            break;
        case 'operations':
            this.generateOperationsReport(filters);
            break;
        case 'trucks':
            this.generateTrucksReport(filters);
            break;
        case 'drivers':
            this.generateDriversReport(filters);
            break;
        case 'clients':
            this.generateClientsReport(filters);
            break;
        case 'destinations':
            this.generateDestinationsReport(filters);
            break;
        default:
            this.generateMissionsReport(filters);
    }
    
    // Show export button
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        exportBtn.style.display = 'inline-flex';
    }
}

// Get Report Filters
getReportFilters() {
    const startDate = document.getElementById('reportStartDate')?.value;
    const endDate = document.getElementById('reportEndDate')?.value;
    const clientId = document.getElementById('reportClientFilter')?.value;
    const status = document.getElementById('reportStatusFilter')?.value;
    const truckId = document.getElementById('reportTruckFilter')?.value;
    const driverId = document.getElementById('reportDriverFilter')?.value;
    const destination = document.getElementById('reportDestinationFilter')?.value;
    const period = document.getElementById('reportPeriodFilter')?.value;
    
    // Handle period filter
    let actualStartDate = startDate;
    let actualEndDate = endDate;
    
    if (period && period !== 'custom') {
        const dates = this.getPeriodDates(period);
        actualStartDate = dates.start;
        actualEndDate = dates.end;
        
        // Mettre à jour les champs de date dans l'UI
        if (document.getElementById('reportStartDate')) {
            document.getElementById('reportStartDate').value = actualStartDate;
        }
        if (document.getElementById('reportEndDate')) {
            document.getElementById('reportEndDate').value = actualEndDate;
        }
    }
    
    return {
        startDate: actualStartDate,
        endDate: actualEndDate,
        clientId: clientId && clientId !== '' ? parseInt(clientId) : null, // CORRECTION: Convertir en nombre
        status: status && status !== '' ? status : null,
        truckId: truckId && truckId !== '' ? parseInt(truckId) : null,    // CORRECTION: Convertir en nombre
        driverId: driverId && driverId !== '' ? parseInt(driverId) : null, // CORRECTION: Convertir en nombre
        destination: destination && destination !== '' ? destination : null,
        period
    };
}

// Get Period Dates
getPeriodDates(period) {
    const now = new Date();
    let start, end;
    
    switch(period) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
        case 'week':
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            start = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
            end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear() + 1, 0, 1);
            break;
        default:
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date();
    }
    
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

// Generate Missions Report
generateMissionsReport(filters) {
    let missions = this.getMissions();
    const operations = this.getOperations();
    
    // Apply filters
    missions = this.filterMissionsByFilters(missions, filters);
    
    // Calculate summary metrics
    const totalMissions = missions.length;
    const completedMissions = missions.filter(m => m.status === 'terminée').length;
    const activeMissions = missions.filter(m => ['en_cours', 'validée'].includes(m.status)).length;
    const cancelledMissions = missions.filter(m => m.status === 'annulée').length;
    const completionRate = totalMissions > 0 ? ((completedMissions / totalMissions) * 100).toFixed(1) : 0;
    
    // Calculate average mission duration for completed missions
    let avgDuration = 0;
    const completedMissionsWithOperations = missions.filter(m => m.status === 'terminée');
    if (completedMissionsWithOperations.length > 0) {
        const durations = completedMissionsWithOperations.map(mission => {
            const missionOps = operations.filter(op => op.mission_id === mission.id);
            if (missionOps.length > 0) {
                const startTimes = missionOps.map(op => new Date(op.real_departure_time || op.estimated_departure)).filter(d => !isNaN(d));
                const endTimes = missionOps.map(op => new Date(op.dechargement_termine || op.real_arrival_time || op.estimated_arrival)).filter(d => !isNaN(d));
                
                if (startTimes.length > 0 && endTimes.length > 0) {
                    const minStart = Math.min(...startTimes);
                    const maxEnd = Math.max(...endTimes);
                    return (maxEnd - minStart) / (1000 * 60 * 60); // hours
                }
            }
            return 0;
        }).filter(d => d > 0);
        
        if (durations.length > 0) {
            avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
        }
    }
    
    // Generate summary cards
    this.generateSummaryCards([
        {
            icon: 'truck',
            value: totalMissions,
            label: 'Total Missions',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'check-circle',
            value: completedMissions,
            label: 'Missions Terminées',
            change: null,
            changeType: 'positive'
        },
        {
            icon: 'activity',
            value: activeMissions,
            label: 'Missions Actives',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'percentage',
            value: `${completionRate}%`,
            label: 'Taux de Réussite',
            change: null,
            changeType: completionRate > 80 ? 'positive' : completionRate > 60 ? 'neutral' : 'negative'
        },
        {
            icon: 'clock',
            value: `${avgDuration}h`,
            label: 'Durée Moyenne',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'x-circle',
            value: cancelledMissions,
            label: 'Missions Annulées',
            change: null,
            changeType: 'negative'
        }
    ]);
    
    // Generate detailed table
    this.generateMissionsTable(missions);
    
    // Store current data for export
    this.currentReportData = {
        type: 'missions',
        data: missions,
        summary: {
            totalMissions,
            completedMissions,
            activeMissions,
            cancelledMissions,
            completionRate,
            avgDuration
        }
    };
}

// Generate Operations Report
generateOperationsReport(filters) {
    let operations = this.getOperations();
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    // Apply filters
    operations = this.filterOperationsByFilters(operations, filters);
    
    // Calculate summary metrics
    const totalOperations = operations.length;
    const completedOperations = operations.filter(op => op.status === 'dechargement_termine').length;
    const activeOperations = operations.filter(op => !['dechargement_termine', 'annulee'].includes(op.status)).length;
    const problemOperations = operations.filter(op => op.status === 'probleme_signalee').length;
    
    // Calculate average times
    const completedOps = operations.filter(op => op.real_departure_time && op.dechargement_termine);
    let avgOperationTime = 0;
    let avgChargingTime = 0;
    let avgUnloadingTime = 0;
    
    if (completedOps.length > 0) {
        const operationTimes = completedOps.map(op => {
            const start = new Date(op.real_departure_time);
            const end = new Date(op.dechargement_termine);
            return (end - start) / (1000 * 60 * 60); // hours
        }).filter(t => t > 0);
        
        if (operationTimes.length > 0) {
            avgOperationTime = (operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length).toFixed(1);
        }
        
        // Average charging time
        const chargingTimes = completedOps.map(op => op.temps_chargement || 0).filter(t => t > 0);
        if (chargingTimes.length > 0) {
            avgChargingTime = (chargingTimes.reduce((a, b) => a + b, 0) / chargingTimes.length).toFixed(0);
        }
        
        // Average unloading time
        const unloadingTimes = completedOps.map(op => op.temps_dechargement || 0).filter(t => t > 0);
        if (unloadingTimes.length > 0) {
            avgUnloadingTime = (unloadingTimes.reduce((a, b) => a + b, 0) / unloadingTimes.length).toFixed(0);
        }
    }
    
    // Generate summary cards
    this.generateSummaryCards([
        {
            icon: 'activity',
            value: totalOperations,
            label: 'Total Opérations',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'check-square',
            value: completedOperations,
            label: 'Opérations Terminées',
            change: null,
            changeType: 'positive'
        },
        {
            icon: 'play-circle',
            value: activeOperations,
            label: 'Opérations Actives',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'clock',
            value: `${avgOperationTime}h`,
            label: 'Durée Moyenne',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'package',
            value: `${avgChargingTime}min`,
            label: 'Chargement Moyen',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'alert-triangle',
            value: problemOperations,
            label: 'Problèmes Signalés',
            change: null,
            changeType: 'negative'
        }
    ]);
    
    // Generate detailed table
    this.generateOperationsTable(operations);
    
    // Store current data for export
    this.currentReportData = {
        type: 'operations',
        data: operations,
        summary: {
            totalOperations,
            completedOperations,
            activeOperations,
            avgOperationTime,
            avgChargingTime,
            avgUnloadingTime
        }
    };
}

// Generate Trucks Performance Report
// Enhanced generateTrucksReport with proper filtering
generateTrucksReport(filters) {
    let trucks = this.getTrucks();
    const operations = this.getOperations();
    const drivers = this.getDrivers();
    
    // First filter operations based on date/client filters
    let filteredOperations = this.filterOperationsByFilters(operations, filters);
    
    // Calculate performance metrics for each truck
    const truckPerformance = trucks.map(truck => {
        const truckOps = filteredOperations.filter(op => op.assigned_truck_id === truck.id);
        
        const totalOperations = truckOps.length;
        const completedOperations = truckOps.filter(op => op.status === 'dechargement_termine').length;
        const problemOperations = truckOps.filter(op => op.status === 'probleme_signalee').length;
        
        // Calculate average operation time
        const completedOps = truckOps.filter(op => op.real_departure_time && op.dechargement_termine);
        let avgOperationTime = 0;
        
        if (completedOps.length > 0) {
            const times = completedOps.map(op => {
                const start = new Date(op.real_departure_time);
                const end = new Date(op.dechargement_termine);
                return (end - start) / (1000 * 60 * 60); // hours
            }).filter(t => t > 0);
            
            if (times.length > 0) {
                avgOperationTime = times.reduce((a, b) => a + b, 0) / times.length;
            }
        }
        
        const monthlyOperations = this.calculateMonthlyOperations(truckOps);
        const assignedDriver = drivers.find(d => d.id === truck.permanent_driver_id || d.id === truck.assigned_driver_id);
        
        return {
            truck,
            totalOperations,
            completedOperations,
            problemOperations,
            avgOperationTime: avgOperationTime.toFixed(1),
            monthlyOperations,
            completionRate: totalOperations > 0 ? ((completedOperations / totalOperations) * 100).toFixed(1) : 0,
            assignedDriver: assignedDriver?.name || 'Non assigné',
            status: truck.status,
            location: truck.current_location,
            maintenanceStatus: truck.maintenance_status || 'operational'
        };
    });
    
    // Now filter trucks based on truck-specific filters
    let filteredTruckPerformance = truckPerformance;
    
    // Apply truck ID filter
    if (filters.truckId) {
        filteredTruckPerformance = filteredTruckPerformance.filter(tp => tp.truck.id === filters.truckId);
    }
    
    // Apply status filter (operational status)
    if (filters.status) {
        filteredTruckPerformance = filteredTruckPerformance.filter(tp => {
            if (filters.status === 'available') return tp.truck.status === 'available';
            if (filters.status === 'busy') return tp.truck.status === 'busy';
            if (filters.status === 'maintenance') return tp.truck.maintenance_status !== 'operational';
            return true;
        });
    }
    
    // Filter by minimum operations (if trucks have no operations in the period, optionally exclude them)
    if (filters.startDate || filters.endDate) {
        // Only show trucks that had operations in the filtered period
        filteredTruckPerformance = filteredTruckPerformance.filter(tp => tp.totalOperations > 0);
    }
    
    // Calculate summary metrics
    const totalTrucks = filteredTruckPerformance.length;
    const activeTrucks = filteredTruckPerformance.filter(tp => tp.truck.status === 'available' || tp.truck.status === 'busy').length;
    const maintenanceTrucks = filteredTruckPerformance.filter(tp => tp.truck.maintenance_status && tp.truck.maintenance_status !== 'operational').length;
    const avgOperationsPerTruck = filteredTruckPerformance.reduce((sum, tp) => sum + tp.totalOperations, 0) / totalTrucks || 0;
    const avgCompletionRate = filteredTruckPerformance.reduce((sum, tp) => sum + parseFloat(tp.completionRate), 0) / totalTrucks || 0;
    const bestPerformingTruck = filteredTruckPerformance.length > 0 ? filteredTruckPerformance.reduce((best, current) => 
        parseFloat(current.completionRate) > parseFloat(best.completionRate) ? current : best, 
        filteredTruckPerformance[0]
    ) : null;
    
    // Generate summary cards
    this.generateSummaryCards([
        {
            icon: 'car',
            value: totalTrucks,
            label: 'Total Camions',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'check-circle',
            value: activeTrucks,
            label: 'Camions Actifs',
            change: null,
            changeType: 'positive'
        },
        {
            icon: 'wrench',
            value: maintenanceTrucks,
            label: 'En Maintenance',
            change: null,
            changeType: maintenanceTrucks > 0 ? 'negative' : 'positive'
        },
        {
            icon: 'trending-up',
            value: avgOperationsPerTruck.toFixed(1),
            label: 'Opérations Moy./Camion',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'percentage',
            value: `${avgCompletionRate.toFixed(1)}%`,
            label: 'Taux de Réussite Moyen',
            change: null,
            changeType: avgCompletionRate > 80 ? 'positive' : avgCompletionRate > 60 ? 'neutral' : 'negative'
        },
        {
            icon: 'award',
            value: bestPerformingTruck?.truck?.registration || 'N/A',
            label: 'Meilleur Camion',
            change: null,
            changeType: 'positive'
        }
    ]);
    
    // Generate detailed table
    this.generateTrucksTable(filteredTruckPerformance);
    
    // Store current data for export
    this.currentReportData = {
        type: 'trucks',
        data: filteredTruckPerformance,
        summary: {
            totalTrucks,
            activeTrucks,
            maintenanceTrucks,
            avgOperationsPerTruck,
            avgCompletionRate
        }
    };
}

// Enhanced generateDriversReport with proper filtering
generateDriversReport(filters) {
    let drivers = this.getDrivers();
    const operations = this.getOperations();
    const trucks = this.getTrucks();
    
    // First filter operations based on filters
    let filteredOperations = this.filterOperationsByFilters(operations, filters);
    
    // Calculate performance metrics for each driver
    const driverPerformance = drivers.map(driver => {
        const driverOps = filteredOperations.filter(op => op.assigned_driver_id === driver.id);
        
        const totalOperations = driverOps.length;
        const completedOperations = driverOps.filter(op => op.status === 'dechargement_termine').length;
        const problemOperations = driverOps.filter(op => op.status === 'probleme_signalee').length;
        
        // Calculate average operation time
        const completedOps = driverOps.filter(op => op.real_departure_time && op.dechargement_termine);
        let avgOperationTime = 0;
        
        if (completedOps.length > 0) {
            const times = completedOps.map(op => {
                const start = new Date(op.real_departure_time);
                const end = new Date(op.dechargement_termine);
                return (end - start) / (1000 * 60 * 60); // hours
            }).filter(t => t > 0);
            
            if (times.length > 0) {
                avgOperationTime = times.reduce((a, b) => a + b, 0) / times.length;
            }
        }
        
        const monthlyOperations = this.calculateMonthlyOperations(driverOps);
        const assignedTruck = trucks.find(t => t.permanent_driver_id === driver.id || t.assigned_driver_id === driver.id);
        
        return {
            driver,
            totalOperations,
            completedOperations,
            problemOperations,
            avgOperationTime: avgOperationTime.toFixed(1),
            monthlyOperations,
            completionRate: totalOperations > 0 ? ((completedOperations / totalOperations) * 100).toFixed(1) : 0,
            assignedTruck: assignedTruck ? `${assignedTruck.brand} ${assignedTruck.model} (${assignedTruck.registration})` : 'Non assigné',
            status: driver.status,
            location: driver.current_location,
            experience: driver.experience_years || 0
        };
    });
    
    // Now filter drivers based on driver-specific filters
    let filteredDriverPerformance = driverPerformance;
    
    // Apply driver ID filter
    if (filters.driverId) {
        filteredDriverPerformance = filteredDriverPerformance.filter(dp => dp.driver.id === filters.driverId);
    }
    
    // Apply status filter
    if (filters.status) {
        if (filters.status === 'available') {
            filteredDriverPerformance = filteredDriverPerformance.filter(dp => dp.driver.status === 'available');
        } else if (filters.status === 'busy') {
            filteredDriverPerformance = filteredDriverPerformance.filter(dp => dp.driver.status === 'busy');
        }
    }
    
    // Filter by minimum operations (if drivers have no operations in the period)
    if (filters.startDate || filters.endDate) {
        // Only show drivers that had operations in the filtered period
        filteredDriverPerformance = filteredDriverPerformance.filter(dp => dp.totalOperations > 0);
    }
    
    // Calculate summary metrics
    const totalDrivers = filteredDriverPerformance.length;
    const activeDrivers = filteredDriverPerformance.filter(dp => dp.driver.status === 'available' || dp.driver.status === 'busy').length;
    const avgOperationsPerDriver = filteredDriverPerformance.reduce((sum, dp) => sum + dp.totalOperations, 0) / totalDrivers || 0;
    const avgCompletionRate = filteredDriverPerformance.reduce((sum, dp) => sum + parseFloat(dp.completionRate), 0) / totalDrivers || 0;
    const avgExperience = filteredDriverPerformance.reduce((sum, dp) => sum + (dp.driver.experience_years || 0), 0) / totalDrivers || 0;
    const bestPerformingDriver = filteredDriverPerformance.length > 0 ? filteredDriverPerformance.reduce((best, current) => 
        parseFloat(current.completionRate) > parseFloat(best.completionRate) ? current : best, 
        filteredDriverPerformance[0]
    ) : null;
    
    // Generate summary cards
    this.generateSummaryCards([
        {
            icon: 'user-check',
            value: totalDrivers,
            label: 'Total Chauffeurs',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'check-circle',
            value: activeDrivers,
            label: 'Chauffeurs Actifs',
            change: null,
            changeType: 'positive'
        },
        {
            icon: 'clock',
            value: `${avgExperience.toFixed(1)} ans`,
            label: 'Expérience Moyenne',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'trending-up',
            value: avgOperationsPerDriver.toFixed(1),
            label: 'Opérations Moy./Chauffeur',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'percentage',
            value: `${avgCompletionRate.toFixed(1)}%`,
            label: 'Taux de Réussite Moyen',
            change: null,
            changeType: avgCompletionRate > 80 ? 'positive' : avgCompletionRate > 60 ? 'neutral' : 'negative'
        },
        {
            icon: 'award',
            value: bestPerformingDriver?.driver?.name || 'N/A',
            label: 'Meilleur Chauffeur',
            change: null,
            changeType: 'positive'
        }
    ]);
    
    // Generate detailed table
    this.generateDriversTable(filteredDriverPerformance);
    
    // Store current data for export
    this.currentReportData = {
        type: 'drivers',
        data: filteredDriverPerformance,
        summary: {
            totalDrivers,
            activeDrivers,
            avgExperience,
            avgOperationsPerDriver,
            avgCompletionRate
        }
    };
}

// Generate Clients Report
// Enhanced generateClientsReport with proper filtering
generateClientsReport(filters) {
    let clients = this.getClients();
    const missions = this.getMissions();
    const operations = this.getOperations();
    
    // First filter missions based on filters
    let filteredMissions = this.filterMissionsByFilters(missions, filters);
    
    // Calculate metrics for each client
    const clientAnalytics = clients.map(client => {
        const clientMissions = filteredMissions.filter(m => m.client_id === client.id);
        
        const totalMissions = clientMissions.length;
        const completedMissions = clientMissions.filter(m => m.status === 'terminée').length;
        const cancelledMissions = clientMissions.filter(m => m.status === 'annulée').length;
        
        // Get all operations for this client's missions
        const clientOperations = operations.filter(op => 
            clientMissions.some(m => m.id === op.mission_id)
        );
        
        // Calculate destinations usage
        const destinationsUsage = {};
        clientMissions.forEach(mission => {
            const dest = mission.destination_name;
            if (dest) {
                destinationsUsage[dest] = (destinationsUsage[dest] || 0) + 1;
            }
        });
        
        const topDestination = Object.entries(destinationsUsage)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
        
        const monthlyMissions = this.calculateMonthlyMissions(clientMissions);
        
        return {
            client,
            totalMissions,
            completedMissions,
            cancelledMissions,
            totalOperations: clientOperations.length,
            completionRate: totalMissions > 0 ? ((completedMissions / totalMissions) * 100).toFixed(1) : 0,
            topDestination,
            destinationsCount: Object.keys(destinationsUsage).length,
            monthlyMissions,
            lastMissionDate: clientMissions.length > 0 ? 
                Math.max(...clientMissions.map(m => new Date(m.created_at).getTime())) : null
        };
    });
    
    // Now filter clients based on client-specific filters
    let filteredClientAnalytics = clientAnalytics;
    
    // Apply client ID filter
    if (filters.clientId) {
        filteredClientAnalytics = filteredClientAnalytics.filter(ca => ca.client.id === filters.clientId);
    }
    
    // Filter clients that have no missions in the selected period
    if (filters.startDate || filters.endDate) {
        filteredClientAnalytics = filteredClientAnalytics.filter(ca => ca.totalMissions > 0);
    }
    
    // Calculate summary metrics
    const totalClients = filteredClientAnalytics.length;
    const activeClients = filteredClientAnalytics.filter(ca => ca.totalMissions > 0).length;
    const avgMissionsPerClient = filteredClientAnalytics.reduce((sum, ca) => sum + ca.totalMissions, 0) / totalClients || 0;
    const avgCompletionRate = filteredClientAnalytics.reduce((sum, ca) => sum + parseFloat(ca.completionRate), 0) / totalClients || 0;
    const topClient = filteredClientAnalytics.length > 0 ? filteredClientAnalytics.reduce((top, current) => 
        current.totalMissions > top.totalMissions ? current : top, 
        filteredClientAnalytics[0]
    ) : null;
    const totalDestinations = filteredClientAnalytics.reduce((sum, ca) => sum + ca.destinationsCount, 0);
    
    // Generate summary cards
    this.generateSummaryCards([
        {
            icon: 'users',
            value: totalClients,
            label: 'Total Clients',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'user-check',
            value: activeClients,
            label: 'Clients Actifs',
            change: null,
            changeType: 'positive'
        },
        {
            icon: 'trending-up',
            value: avgMissionsPerClient.toFixed(1),
            label: 'Missions Moy./Client',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'percentage',
            value: `${avgCompletionRate.toFixed(1)}%`,
            label: 'Taux de Réussite Moyen',
            change: null,
            changeType: avgCompletionRate > 80 ? 'positive' : avgCompletionRate > 60 ? 'neutral' : 'negative'
        },
        {
            icon: 'award',
            value: topClient?.client?.name || 'N/A',
            label: 'Client Principal',
            change: null,
            changeType: 'positive'
        },
        {
            icon: 'map-pin',
            value: totalDestinations,
            label: 'Total Destinations',
            change: null,
            changeType: 'neutral'
        }
    ]);
    
    // Generate detailed table
    this.generateClientsTable(filteredClientAnalytics);
    
    // Store current data for export
    this.currentReportData = {
        type: 'clients',
        data: filteredClientAnalytics,
        summary: {
            totalClients,
            activeClients,
            avgMissionsPerClient,
            avgCompletionRate,
            totalDestinations
        }
    };
}

// Generate Destinations Report
// Enhanced generateDestinationsReport with proper filtering
generateDestinationsReport(filters) {
    const operations = this.getOperations();
    const missions = this.getMissions();
    const clients = this.getClients();
    
    // Apply filters to operations first
    let filteredOperations = this.filterOperationsByFilters(operations, filters);
    
    // If we have destination filter, apply it
    if (filters.destination) {
        filteredOperations = filteredOperations.filter(op => {
            const dest = op.destination_name || op.arrival_location;
            return dest && dest === filters.destination;
        });
    }
    
    // Group by destinations
    const destinationStats = {};
    
    filteredOperations.forEach(operation => {
        const dest = operation.destination_name || operation.arrival_location || 'Destination inconnue';
        
        if (!destinationStats[dest]) {
            destinationStats[dest] = {
                name: dest,
                totalOperations: 0,
                completedOperations: 0,
                clients: new Set(),
                wilayas: new Set(),
                avgOperationTime: 0,
                totalOperationTime: 0,
                operationTimes: []
            };
        }
        
        const stats = destinationStats[dest];
        stats.totalOperations++;
        
        if (operation.status === 'dechargement_termine') {
            stats.completedOperations++;
        }
        
        if (operation.client_name) {
            stats.clients.add(operation.client_name);
        }
        
        if (operation.arrival_location) {
            stats.wilayas.add(operation.arrival_location);
        }
        
        // Calculate operation time
        if (operation.real_departure_time && operation.dechargement_termine) {
            const start = new Date(operation.real_departure_time);
            const end = new Date(operation.dechargement_termine);
            const hours = (end - start) / (1000 * 60 * 60);
            if (hours > 0) {
                stats.operationTimes.push(hours);
                stats.totalOperationTime += hours;
            }
        }
    });
    
    // Calculate averages and convert sets to counts
    const destinationAnalytics = Object.values(destinationStats).map(stats => {
        const avgTime = stats.operationTimes.length > 0 ? 
            (stats.totalOperationTime / stats.operationTimes.length).toFixed(1) : 0;
        
        const completionRate = stats.totalOperations > 0 ? 
            ((stats.completedOperations / stats.totalOperations) * 100).toFixed(1) : 0;
        
        return {
            ...stats,
            clientsCount: stats.clients.size,
            wilayasCount: stats.wilayas.size,
            avgOperationTime: avgTime,
            completionRate,
            clients: Array.from(stats.clients).join(', '),
            wilayas: Array.from(stats.wilayas).join(', ')
        };
    }).sort((a, b) => b.totalOperations - a.totalOperations);
    
    // Calculate summary metrics
    const totalDestinations = destinationAnalytics.length;
    const totalOperationsAll = destinationAnalytics.reduce((sum, da) => sum + da.totalOperations, 0);
    const avgOperationsPerDestination = totalDestinations > 0 ? totalOperationsAll / totalDestinations : 0;
    const topDestination = destinationAnalytics[0];
    const avgCompletionRate = totalDestinations > 0 ? destinationAnalytics.reduce((sum, da) => sum + parseFloat(da.completionRate), 0) / totalDestinations : 0;
    const totalUniqueClients = new Set(destinationAnalytics.flatMap(da => Array.from(da.clients.split(', ').filter(c => c)))).size;
    
    // Generate summary cards
    this.generateSummaryCards([
        {
            icon: 'map-pin',
            value: totalDestinations,
            label: 'Total Destinations',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'activity',
            value: totalOperationsAll,
            label: 'Total Opérations',
            change: null,
            changeType: 'positive'
        },
        {
            icon: 'trending-up',
            value: avgOperationsPerDestination.toFixed(1),
            label: 'Opérations Moy./Destination',
            change: null,
            changeType: 'neutral'
        },
        {
            icon: 'percentage',
            value: `${avgCompletionRate.toFixed(1)}%`,
            label: 'Taux de Réussite Moyen',
            change: null,
            changeType: avgCompletionRate > 80 ? 'positive' : avgCompletionRate > 60 ? 'neutral' : 'negative'
        },
        {
            icon: 'award',
            value: topDestination?.name || 'N/A',
            label: 'Destination Principale',
            change: null,
            changeType: 'positive'
        },
        {
            icon: 'users',
            value: totalUniqueClients,
            label: 'Clients Uniques',
            change: null,
            changeType: 'neutral'
        }
    ]);
    
    // Generate detailed table
    this.generateDestinationsTable(destinationAnalytics);
    
    // Store current data for export
    this.currentReportData = {
        type: 'destinations',
        data: destinationAnalytics,
        summary: {
            totalDestinations,
            totalOperationsAll,
            avgOperationsPerDestination,
            avgCompletionRate,
            totalUniqueClients
        }
    };
}
// Filter Functions
filterMissionsByFilters(missions, filters) {
    return missions.filter(mission => {
        // CORRECTION: Amélioration du filtrage par date
        if (filters.startDate && filters.endDate) {
            const missionDate = new Date(mission.created_at);
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            
            // Ajuster les heures pour inclure toute la journée
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            
            if (missionDate < startDate || missionDate > endDate) {
                return false;
            }
        } else if (filters.startDate) {
            const missionDate = new Date(mission.created_at);
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (missionDate < startDate) {
                return false;
            }
        } else if (filters.endDate) {
            const missionDate = new Date(mission.created_at);
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (missionDate > endDate) {
                return false;
            }
        }
        
        // Client filter
        if (filters.clientId && mission.client_id !== filters.clientId) {
            return false;
        }
        
        // CORRECTION: Status filter
        if (filters.status && mission.status !== filters.status) {
            return false;
        }
        
        return true;
    });
}

filterOperationsByFilters(operations, filters) {
    return operations.filter(operation => {
        // CORRECTION: Amélioration du filtrage par date
        if (filters.startDate && filters.endDate) {
            const opDate = new Date(operation.created_at || operation.estimated_departure);
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            
            // Ajuster les heures pour inclure toute la journée
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            
            if (opDate < startDate || opDate > endDate) {
                return false;
            }
        } else if (filters.startDate) {
            const opDate = new Date(operation.created_at || operation.estimated_departure);
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (opDate < startDate) {
                return false;
            }
        } else if (filters.endDate) {
            const opDate = new Date(operation.created_at || operation.estimated_departure);
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (opDate > endDate) {
                return false;
            }
        }
        
        // CORRECTION: Client filter via mission mapping
        if (filters.clientId) {
            const missions = this.getMissions(); // AJOUT: Récupérer les missions
            const mission = missions.find(m => m.id === operation.mission_id);
            if (!mission || mission.client_id !== filters.clientId) {
                return false;
            }
        }
        
        // CORRECTION: Truck filter
        if (filters.truckId && operation.assigned_truck_id !== filters.truckId) {
            return false;
        }
        
        // CORRECTION: Driver filter
        if (filters.driverId && operation.assigned_driver_id !== filters.driverId) {
            return false;
        }
        
        // CORRECTION: Destination filter - recherche flexible
        if (filters.destination) {
            const destField = operation.destination_name || operation.arrival_location || '';
            const searchTerm = filters.destination.toLowerCase().trim();
            if (!destField.toLowerCase().includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
}
// AJOUTEZ cette fonction pour déboguer
debugReportFilters() {
    const filters = this.getReportFilters();
    console.log('🔍 Filtres de rapport actuels:', filters);
    
    const operations = this.getOperations();
    console.log('📊 Total opérations avant filtrage:', operations.length);
    
    const filtered = this.filterOperationsByFilters(operations, filters);
    console.log('✅ Total opérations après filtrage:', filtered.length);
    
    return { original: operations.length, filtered: filtered.length, filters };
}

// Generate Summary Cards
generateSummaryCards(metrics) {
    const container = document.getElementById('reportSummaryCards');
    if (!container) return;
    
    container.innerHTML = metrics.map(metric => `
        <div class="summary-metric-card">
            <div class="metric-icon">
                <i data-lucide="${metric.icon}"></i>
            </div>
            <div class="metric-value">${metric.value}</div>
            <div class="metric-label">${metric.label}</div>
            ${metric.change ? `<div class="metric-change ${metric.changeType}">${metric.change}</div>` : ''}
        </div>
    `).join('');
    
    // Initialize icons
    setTimeout(() => {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 100);
}

// Generate Missions Table
generateMissionsTable(missions) {
    const tableHead = document.getElementById('reportTableHead');
    const tableBody = document.getElementById('reportTableBody');
    const tableTitle = document.getElementById('reportTableTitle');
    const tableCount = document.getElementById('reportTableCount');
    
    if (!tableHead || !tableBody) return;
    
    // Update title and count
    if (tableTitle) tableTitle.textContent = 'Rapport des Missions';
    if (tableCount) tableCount.textContent = missions.length;
    
    // Table headers
    tableHead.innerHTML = `
        <tr>
            <th>ID Mission</th>
            <th>Client</th>
            <th>Destination</th>
            <th>Départ</th>
            <th>Arrivée</th>
            <th>Camions Demandés</th>
            <th>Camions Assignés</th>
            <th>Type Produit</th>
            <th>Statut</th>
            <th>Créée le</th>
            <th>Date Prévue</th>
            <th>Créée par</th>
        </tr>
    `;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedMissions = missions.slice(startIndex, endIndex);
    
    // Table rows
    tableBody.innerHTML = paginatedMissions.map(mission => `
        <tr>
            <td>MSN${String(mission.id).padStart(3, '0')}</td>
            <td>${mission.client_name || 'N/A'}</td>
            <td>${mission.destination_name || 'N/A'}</td>
            <td>${mission.departure_wilaya || 'N/A'}</td>
            <td>${mission.arrival_wilaya || 'N/A'}</td>
            <td>${mission.trucks_requested || 0}</td>
            <td>${mission.assigned_trucks?.length || 0}</td>
            <td>${mission.product_type || 'N/A'}</td>
            <td><span class="status-badge status-${mission.status}">${this.getStatusDisplayName(mission.status)}</span></td>
            <td>${this.formatDate(mission.created_at)}</td>
            <td>${this.formatDate(mission.scheduled_date)} ${mission.scheduled_time || ''}</td>
            <td>${mission.created_by || 'N/A'}</td>
        </tr>
    `).join('');
    
    this.updatePagination(missions.length);
}

// Generate Operations Table
generateOperationsTable(operations) {
    const tableHead = document.getElementById('reportTableHead');
    const tableBody = document.getElementById('reportTableBody');
    const tableTitle = document.getElementById('reportTableTitle');
    const tableCount = document.getElementById('reportTableCount');
    
    if (!tableHead || !tableBody) return;
    
    // Update title and count
    if (tableTitle) tableTitle.textContent = 'Rapport des Opérations';
    if (tableCount) tableCount.textContent = operations.length;
    
    // Table headers
    tableHead.innerHTML = `
        <tr>
            <th>N° Opération</th>
            <th>Mission</th>
            <th>Client</th>
            <th>Destination</th>
            <th>Camion</th>
            <th>Chauffeur</th>
            <th>Statut</th>
            <th>Départ Estimé</th>
            <th>Départ Réel</th>
            <th>Arrivée Estimée</th>
            <th>Arrivée Réelle</th>
            <th>Temps Chargement</th>
            <th>Temps Déchargement</th>
            <th>Temps Total</th>
        </tr>
    `;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedOperations = operations.slice(startIndex, endIndex);
    
    // Get additional data for display
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    // Table rows
    tableBody.innerHTML = paginatedOperations.map(operation => {
        const truck = trucks.find(t => t.id === operation.assigned_truck_id);
        const driver = drivers.find(d => d.id === operation.assigned_driver_id);
        
        return `
            <tr>
                <td>${operation.operation_number || `OP${operation.id}`}</td>
                <td>MSN${String(operation.mission_id).padStart(3, '0')}</td>
                <td>${operation.client_name || 'N/A'}</td>
                <td>${operation.destination_name || operation.arrival_location || 'N/A'}</td>
                <td>${truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'N/A'}</td>
                <td>${driver ? driver.name : 'N/A'}</td>
                <td><span class="status-badge status-${operation.status}">${this.getStatusDisplayName(operation.status)}</span></td>
                <td>${this.formatAlgeriaDateTime(operation.estimated_departure) || 'N/A'}</td>
                <td>${this.formatAlgeriaDateTime(operation.real_departure_time) || '-'}</td>
                <td>${this.formatAlgeriaDateTime(operation.estimated_arrival) || 'N/A'}</td>
                <td>${this.formatAlgeriaDateTime(operation.dechargement_termine) || '-'}</td>
                <td>${operation.temps_chargement ? `${operation.temps_chargement}min` : '-'}</td>
                <td>${operation.temps_dechargement ? `${operation.temps_dechargement}min` : '-'}</td>
                <td>${operation.temps_total_operation || '-'}</td>
            </tr>
        `;
    }).join('');
    
    this.updatePagination(operations.length);
}

// Generate Trucks Table
generateTrucksTable(truckPerformance) {
    const tableHead = document.getElementById('reportTableHead');
    const tableBody = document.getElementById('reportTableBody');
    const tableTitle = document.getElementById('reportTableTitle');
    const tableCount = document.getElementById('reportTableCount');
    
    if (!tableHead || !tableBody) return;
    
    // Update title and count
    if (tableTitle) tableTitle.textContent = 'Rapport Performance des Camions';
    if (tableCount) tableCount.textContent = truckPerformance.length;
    
    // Table headers
    tableHead.innerHTML = `
        <tr>
            <th>Immatriculation</th>
            <th>Marque/Modèle</th>
            <th>Chauffeur Assigné</th>
            <th>Statut</th>
            <th>Localisation</th>
            <th>Total Opérations</th>
            <th>Opérations Terminées</th>
            <th>Taux de Réussite</th>
            <th>Temps Opération Moyen</th>
            <th>Opérations/Mois</th>
            <th>Problèmes Signalés</th>
            <th>Statut Maintenance</th>
            <th>Performance</th>
        </tr>
    `;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedData = truckPerformance.slice(startIndex, endIndex);
    
    // Table rows
    tableBody.innerHTML = paginatedData.map(tp => {
        const performanceClass = this.getPerformanceClass(parseFloat(tp.completionRate));
        
        return `
            <tr>
                <td><strong>${tp.truck.registration}</strong></td>
                <td>${tp.truck.brand} ${tp.truck.model}</td>
                <td>${tp.assignedDriver}</td>
                <td><span class="status-badge status-${tp.status}">${this.getStatusDisplayName(tp.status)}</span></td>
                <td>${tp.location || 'N/A'}</td>
                <td>${tp.totalOperations}</td>
                <td>${tp.completedOperations}</td>
                <td>${tp.completionRate}%</td>
                <td>${tp.avgOperationTime}h</td>
                <td>${tp.monthlyOperations.toFixed(1)}</td>
                <td>${tp.problemOperations}</td>
                <td>${tp.maintenanceStatus === 'operational' ? 'Opérationnel' : this.getMaintenanceDisplayName(tp.maintenanceStatus)}</td>
                <td><span class="performance-indicator ${performanceClass}">
                    ${this.getPerformanceLabel(parseFloat(tp.completionRate))}
                </span></td>
            </tr>
        `;
    }).join('');
    
    this.updatePagination(truckPerformance.length);
}

// Generate Drivers Table
generateDriversTable(driverPerformance) {
    const tableHead = document.getElementById('reportTableHead');
    const tableBody = document.getElementById('reportTableBody');
    const tableTitle = document.getElementById('reportTableTitle');
    const tableCount = document.getElementById('reportTableCount');
    
    if (!tableHead || !tableBody) return;
    
    // Update title and count
    if (tableTitle) tableTitle.textContent = 'Rapport Performance des Chauffeurs';
    if (tableCount) tableCount.textContent = driverPerformance.length;
    
    // Table headers
    tableHead.innerHTML = `
        <tr>
            <th>Nom</th>
            <th>Permis</th>
            <th>Téléphone</th>
            <th>Expérience</th>
            <th>Camion Assigné</th>
            <th>Statut</th>
            <th>Localisation</th>
            <th>Total Opérations</th>
            <th>Opérations Terminées</th>
            <th>Taux de Réussite</th>
            <th>Temps Opération Moyen</th>
            <th>Opérations/Mois</th>
            <th>Problèmes Signalés</th>
            <th>Performance</th>
        </tr>
    `;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedData = driverPerformance.slice(startIndex, endIndex);
    
    // Table rows
    tableBody.innerHTML = paginatedData.map(dp => {
        const performanceClass = this.getPerformanceClass(parseFloat(dp.completionRate));
        
        return `
            <tr>
                <td><strong>${dp.driver.name}</strong></td>
                <td>${dp.driver.license_number || 'N/A'}</td>
                <td>${dp.driver.phone || 'N/A'}</td>
                <td>${dp.experience} ans</td>
                <td>${dp.assignedTruck}</td>
                <td><span class="status-badge status-${dp.status}">${this.getStatusDisplayName(dp.status)}</span></td>
                <td>${dp.location || 'N/A'}</td>
                <td>${dp.totalOperations}</td>
                <td>${dp.completedOperations}</td>
                <td>${dp.completionRate}%</td>
                <td>${dp.avgOperationTime}h</td>
                <td>${dp.monthlyOperations.toFixed(1)}</td>
                <td>${dp.problemOperations}</td>
                <td><span class="performance-indicator ${performanceClass}">
                    ${this.getPerformanceLabel(parseFloat(dp.completionRate))}
                </span></td>
            </tr>
        `;
    }).join('');
    
    this.updatePagination(driverPerformance.length);
}

// Generate Clients Table
generateClientsTable(clientAnalytics) {
    const tableHead = document.getElementById('reportTableHead');
    const tableBody = document.getElementById('reportTableBody');
    const tableTitle = document.getElementById('reportTableTitle');
    const tableCount = document.getElementById('reportTableCount');
    
    if (!tableHead || !tableBody) return;
    
    // Update title and count
    if (tableTitle) tableTitle.textContent = 'Rapport Analyse des Clients';
    if (tableCount) tableCount.textContent = clientAnalytics.length;
    
    // Table headers
    tableHead.innerHTML = `
        <tr>
            <th>Nom Client</th>
            <th>Wilaya</th>
            <th>Contact</th>
            <th>Total Missions</th>
            <th>Missions Terminées</th>
            <th>Missions Annulées</th>
            <th>Taux de Réussite</th>
            <th>Total Opérations</th>
            <th>Destination Principale</th>
            <th>Nombre Destinations</th>
            <th>Missions/Mois</th>
            <th>Dernière Mission</th>
            <th>Performance</th>
        </tr>
    `;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedData = clientAnalytics.slice(startIndex, endIndex);
    
    // Table rows
    tableBody.innerHTML = paginatedData.map(ca => {
        const performanceClass = this.getPerformanceClass(parseFloat(ca.completionRate));
        const lastMissionDate = ca.lastMissionDate ? this.formatDate(new Date(ca.lastMissionDate)) : 'N/A';
        
        return `
            <tr>
                <td><strong>${ca.client.name}</strong></td>
                <td>${ca.client.wilaya || 'N/A'}</td>
                <td>${ca.client.contact_person || 'N/A'}</td>
                <td>${ca.totalMissions}</td>
                <td>${ca.completedMissions}</td>
                <td>${ca.cancelledMissions}</td>
                <td>${ca.completionRate}%</td>
                <td>${ca.totalOperations}</td>
                <td>${ca.topDestination}</td>
                <td>${ca.destinationsCount}</td>
                <td>${ca.monthlyMissions.toFixed(1)}</td>
                <td>${lastMissionDate}</td>
                <td><span class="performance-indicator ${performanceClass}">
                    ${this.getPerformanceLabel(parseFloat(ca.completionRate))}
                </span></td>
            </tr>
        `;
    }).join('');
    
    this.updatePagination(clientAnalytics.length);
}

// Generate Destinations Table
generateDestinationsTable(destinationAnalytics) {
    const tableHead = document.getElementById('reportTableHead');
    const tableBody = document.getElementById('reportTableBody');
    const tableTitle = document.getElementById('reportTableTitle');
    const tableCount = document.getElementById('reportTableCount');
    
    if (!tableHead || !tableBody) return;
    
    // Update title and count
    if (tableTitle) tableTitle.textContent = 'Rapport Analyse des Destinations';
    if (tableCount) tableCount.textContent = destinationAnalytics.length;
    
    // Table headers
    tableHead.innerHTML = `
        <tr>
            <th>Destination</th>
            <th>Total Opérations</th>
            <th>Opérations Terminées</th>
            <th>Taux de Réussite</th>
            <th>Temps Opération Moyen</th>
            <th>Nombre Clients</th>
            <th>Clients</th>
            <th>Wilayas Desservies</th>
            <th>Performance</th>
        </tr>
    `;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedData = destinationAnalytics.slice(startIndex, endIndex);
    
    // Table rows
    tableBody.innerHTML = paginatedData.map(da => {
        const performanceClass = this.getPerformanceClass(parseFloat(da.completionRate));
        
        return `
            <tr>
                <td><strong>${da.name}</strong></td>
                <td>${da.totalOperations}</td>
                <td>${da.completedOperations}</td>
                <td>${da.completionRate}%</td>
                <td>${da.avgOperationTime}h</td>
                <td>${da.clientsCount}</td>
                <td>${da.clients.length > 50 ? da.clients.substring(0, 50) + '...' : da.clients}</td>
                <td>${da.wilayas}</td>
                <td><span class="performance-indicator ${performanceClass}">
                    ${this.getPerformanceLabel(parseFloat(da.completionRate))}
                </span></td>
            </tr>
        `;
    }).join('');
    
    this.updatePagination(destinationAnalytics.length);
}

// Helper Functions
calculateMonthlyOperations(operations) {
    if (operations.length === 0) return 0;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyOps = operations.filter(op => {
        const opDate = new Date(op.created_at || op.estimated_departure);
        return opDate >= startOfMonth;
    });
    
    return monthlyOps.length;
}

calculateMonthlyMissions(missions) {
    if (missions.length === 0) return 0;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyMissions = missions.filter(mission => {
        const missionDate = new Date(mission.created_at);
        return missionDate >= startOfMonth;
    });
    
    return monthlyMissions.length;
}

getPerformanceClass(completionRate) {
    if (completionRate >= 90) return 'performance-excellent';
    if (completionRate >= 80) return 'performance-good';
    if (completionRate >= 60) return 'performance-average';
    return 'performance-poor';
}

getPerformanceLabel(completionRate) {
    if (completionRate >= 90) return 'Excellent';
    if (completionRate >= 80) return 'Bon';
    if (completionRate >= 60) return 'Moyen';
    return 'Faible';
}

// Pagination Functions
updatePagination(totalItems) {
    this.totalItems = totalItems;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
    
    // Update pagination display
    const startSpan = document.getElementById('paginationStart');
    const endSpan = document.getElementById('paginationEnd');
    const totalSpan = document.getElementById('paginationTotal');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (startSpan) startSpan.textContent = startItem;
    if (endSpan) endSpan.textContent = endItem;
    if (totalSpan) totalSpan.textContent = totalItems;
    
    if (prevBtn) {
        prevBtn.disabled = this.currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = this.currentPage >= totalPages;
    }
}

previousPage() {
    if (this.currentPage > 1) {
        this.currentPage--;
        this.generateReport();
    }
}

nextPage() {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.currentPage < totalPages) {
        this.currentPage++;
        this.generateReport();
    }
}

// Event Handlers
onReportTypeChange() {
    this.currentPage = 1; // Reset to first page
    this.generateReport();
}

onPeriodFilterChange() {
    const period = document.getElementById('reportPeriodFilter')?.value;
    const startDateInput = document.getElementById('reportStartDate');
    const endDateInput = document.getElementById('reportEndDate');
    
    if (period && period !== 'custom') {
        const dates = this.getPeriodDates(period);
        if (startDateInput) startDateInput.value = dates.start;
        if (endDateInput) endDateInput.value = dates.end;
    }
}

refreshReports() {
    this.populateReportFilters();
    this.generateReport();
}

// Excel Export Function
exportReportToExcel() {
    if (!this.currentReportData) {
        alert('Aucun rapport à exporter');
        return;
    }
    
    console.log('Exporting to Excel:', this.currentReportData.type);
    
    try {
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Add main data sheet
        const ws = this.createExcelWorksheet(this.currentReportData);
        XLSX.utils.book_append_sheet(wb, ws, this.getExcelSheetName(this.currentReportData.type));
        
        // Add summary sheet
        const summaryWs = this.createSummaryWorksheet(this.currentReportData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');
        
        // Generate filename
        const filename = this.generateExcelFilename(this.currentReportData.type);
        
        // Export file
        XLSX.writeFile(wb, filename);
        
        // Show success message
        this.showToast('Rapport exporté avec succès!', 'success');
        
    } catch (error) {
        console.error('Excel export error:', error);
        alert('Erreur lors de l\'export Excel');
    }
}

createExcelWorksheet(reportData) {
    let data = [];
    
    switch(reportData.type) {
        case 'missions':
            data = this.prepareMissionsDataForExcel(reportData.data);
            break;
        case 'operations':
            data = this.prepareOperationsDataForExcel(reportData.data);
            break;
        case 'trucks':
            data = this.prepareTrucksDataForExcel(reportData.data);
            break;
        case 'drivers':
            data = this.prepareDriversDataForExcel(reportData.data);
            break;
        case 'clients':
            data = this.prepareClientsDataForExcel(reportData.data);
            break;
        case 'destinations':
            data = this.prepareDestinationsDataForExcel(reportData.data);
            break;
    }
    
    return XLSX.utils.json_to_sheet(data);
}

createSummaryWorksheet(reportData) {
    const summaryData = Object.entries(reportData.summary).map(([key, value]) => ({
        'Métrique': this.translateSummaryKey(key),
        'Valeur': value
    }));
    
    return XLSX.utils.json_to_sheet(summaryData);
}

prepareMissionsDataForExcel(missions) {
    return missions.map(mission => ({
        'ID Mission': `MSN${String(mission.id).padStart(3, '0')}`,
        'Client': mission.client_name || '',
        'Destination': mission.destination_name || '',
        'Wilaya Départ': mission.departure_wilaya || '',
        'Wilaya Arrivée': mission.arrival_wilaya || '',
        'Camions Demandés': mission.trucks_requested || 0,
        'Camions Assignés': mission.assigned_trucks?.length || 0,
        'Type Produit': mission.product_type || '',
        'Statut': this.getStatusDisplayName(mission.status),
        'Date Création': this.formatDate(mission.created_at),
        'Date Prévue': this.formatDate(mission.scheduled_date),
        'Heure Prévue': mission.scheduled_time || '',
        'Créée par': mission.created_by || '',
        'Commentaires': mission.comments || ''
    }));
}

prepareOperationsDataForExcel(operations) {
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    return operations.map(operation => {
        const truck = trucks.find(t => t.id === operation.assigned_truck_id);
        const driver = drivers.find(d => d.id === operation.assigned_driver_id);
        
        return {
            'N° Opération': operation.operation_number || `OP${operation.id}`,
            'Mission': `MSN${String(operation.mission_id).padStart(3, '0')}`,
            'Client': operation.client_name || '',
            'Destination': operation.destination_name || operation.arrival_location || '',
            'Camion': truck ? `${truck.brand} ${truck.model} (${truck.registration})` : '',
            'Chauffeur': driver ? driver.name : '',
            'Statut': this.getStatusDisplayName(operation.status),
            'Départ Estimé': this.formatAlgeriaDateTime(operation.estimated_departure) || '',
            'Départ Réel': this.formatAlgeriaDateTime(operation.real_departure_time) || '',
            'Arrivée Estimée': this.formatAlgeriaDateTime(operation.estimated_arrival) || '',
            'Arrivée Réelle': this.formatAlgeriaDateTime(operation.dechargement_termine) || '',
            'Temps Chargement (min)': operation.temps_chargement || '',
            'Temps Déchargement (min)': operation.temps_dechargement || '',
            'Temps Total Opération': operation.temps_total_operation || ''
        };
    });
}

prepareTrucksDataForExcel(truckPerformance) {
    return truckPerformance.map(tp => ({
        'Immatriculation': tp.truck.registration,
        'Marque': tp.truck.brand,
        'Modèle': tp.truck.model,
        'Année': tp.truck.year || '',
        'Capacité (tonnes)': tp.truck.capacity || '',
        'Chauffeur Assigné': tp.assignedDriver,
        'Statut': this.getStatusDisplayName(tp.status),
        'Localisation': tp.location || '',
        'Total Opérations': tp.totalOperations,
        'Opérations Terminées': tp.completedOperations,
        'Taux de Réussite (%)': tp.completionRate,
        'Temps Opération Moyen (h)': tp.avgOperationTime,
        'Opérations par Mois': tp.monthlyOperations.toFixed(1),
        'Problèmes Signalés': tp.problemOperations,
        'Statut Maintenance': tp.maintenanceStatus === 'operational' ? 'Opérationnel' : this.getMaintenanceDisplayName(tp.maintenanceStatus),
        'Performance': this.getPerformanceLabel(parseFloat(tp.completionRate))
    }));
}

prepareDriversDataForExcel(driverPerformance) {
    return driverPerformance.map(dp => ({
        'Nom': dp.driver.name,
        'Numéro Permis': dp.driver.license_number || '',
        'Téléphone': dp.driver.phone || '',
        'Expérience (années)': dp.experience,
        'Camion Assigné': dp.assignedTruck,
        'Statut': this.getStatusDisplayName(dp.status),
        'Localisation': dp.location || '',
        'Total Opérations': dp.totalOperations,
        'Opérations Terminées': dp.completedOperations,
        'Taux de Réussite (%)': dp.completionRate,
        'Temps Opération Moyen (h)': dp.avgOperationTime,
        'Opérations par Mois': dp.monthlyOperations.toFixed(1),
        'Problèmes Signalés': dp.problemOperations,
        'Performance': this.getPerformanceLabel(parseFloat(dp.completionRate))
    }));
}

prepareClientsDataForExcel(clientAnalytics) {
    return clientAnalytics.map(ca => ({
        'Nom Client': ca.client.name,
        'Wilaya': ca.client.wilaya || '',
        'Adresse': ca.client.address || '',
        'Contact': ca.client.contact_person || '',
        'Email': ca.client.contact_email || '',
        'Téléphone': ca.client.contact_phone || '',
        'Total Missions': ca.totalMissions,
        'Missions Terminées': ca.completedMissions,
        'Missions Annulées': ca.cancelledMissions,
        'Taux de Réussite (%)': ca.completionRate,
        'Total Opérations': ca.totalOperations,
        'Destination Principale': ca.topDestination,
        'Nombre Destinations': ca.destinationsCount,
        'Missions par Mois': ca.monthlyMissions.toFixed(1),
        'Dernière Mission': ca.lastMissionDate ? this.formatDate(new Date(ca.lastMissionDate)) : '',
        'Performance': this.getPerformanceLabel(parseFloat(ca.completionRate))
    }));
}

prepareDestinationsDataForExcel(destinationAnalytics) {
    return destinationAnalytics.map(da => ({
        'Destination': da.name,
        'Total Opérations': da.totalOperations,
        'Opérations Terminées': da.completedOperations,
        'Taux de Réussite (%)': da.completionRate,
        'Temps Opération Moyen (h)': da.avgOperationTime,
        'Nombre Clients': da.clientsCount,
        'Clients': da.clients,
        'Wilayas Desservies': da.wilayas,
        'Performance': this.getPerformanceLabel(parseFloat(da.completionRate))
    }));
}

getExcelSheetName(reportType) {
    const names = {
        'missions': 'Missions',
        'operations': 'Opérations',
        'trucks': 'Camions',
        'drivers': 'Chauffeurs',
        'clients': 'Clients',
        'destinations': 'Destinations'
    };
    return names[reportType] || 'Rapport';
}

generateExcelFilename(reportType) {
    const date = new Date().toISOString().split('T')[0];
    const names = {
        'missions': 'Rapport_Missions',
        'operations': 'Rapport_Opérations',
        'trucks': 'Rapport_Camions',
        'drivers': 'Rapport_Chauffeurs',
        'clients': 'Rapport_Clients',
        'destinations': 'Rapport_Destinations'
    };
    const baseName = names[reportType] || 'Rapport';
    return `${baseName}_${date}.xlsx`;
}

translateSummaryKey(key) {
    const translations = {
        'totalMissions': 'Total Missions',
        'completedMissions': 'Missions Terminées',
        'activeMissions': 'Missions Actives',
        'cancelledMissions': 'Missions Annulées',
        'completionRate': 'Taux de Réussite (%)',
        'avgDuration': 'Durée Moyenne (h)',
        'totalOperations': 'Total Opérations',
        'completedOperations': 'Opérations Terminées',
        'activeOperations': 'Opérations Actives',
        'avgOperationTime': 'Temps Opération Moyen (h)',
        'avgChargingTime': 'Temps Chargement Moyen (min)',
        'avgUnloadingTime': 'Temps Déchargement Moyen (min)',
        'totalTrucks': 'Total Camions',
        'activeTrucks': 'Camions Actifs',
        'maintenanceTrucks': 'Camions en Maintenance',
        'avgOperationsPerTruck': 'Opérations Moyennes par Camion',
        'totalDrivers': 'Total Chauffeurs',
        'activeDrivers': 'Chauffeurs Actifs',
        'avgExperience': 'Expérience Moyenne (années)',
        'avgOperationsPerDriver': 'Opérations Moyennes par Chauffeur',
        'totalClients': 'Total Clients',
        'activeClients': 'Clients Actifs',
        'avgMissionsPerClient': 'Missions Moyennes par Client',
        'totalDestinations': 'Total Destinations',
        'totalOperationsAll': 'Total Opérations',
        'avgOperationsPerDestination': 'Opérations Moyennes par Destination',
        'totalUniqueClients': 'Clients Uniques'
    };
    return translations[key] || key;
}

// Toast notification helper
showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `smart-toast smart-toast-${type} show`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
        <span>${message}</span>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Initialize icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 500);
    }, 3000);
}
// Toggle Advanced Filters Function
toggleAdvancedFilters() {
    const content = document.getElementById('advancedFiltersContent');
    const chevron = document.getElementById('filtersChevron');
    const status = document.getElementById('filtersStatus');
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        content.classList.add('expanded');
        chevron.style.transform = 'rotate(180deg)';
        status.textContent = 'Cliquez pour réduire';
    } else {
        content.style.display = 'none';
        content.classList.remove('expanded');
        chevron.style.transform = 'rotate(0deg)';
        status.textContent = 'Cliquez pour développer';
    }
    
    // Reinitialize icons after DOM changes
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 100);
}

// Add this to your initializeEventListeners() method
// Add this to your initializeReportFilters() method
initializeReportFilters() {
    // Report filter toggle functionality
    const reportFilterToggleBtn = document.getElementById('reportFilterToggleBtn');
    const reportFilterMenuContent = document.getElementById('reportFilterMenuContent');
    
    if (reportFilterToggleBtn && reportFilterMenuContent) {
        // Ensure filters start hidden
        reportFilterMenuContent.classList.add('hidden');
        reportFilterMenuContent.classList.remove('active');
        
        reportFilterToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const isHidden = reportFilterMenuContent.classList.contains('hidden');
            
            if (isHidden) {
                // Show filters
                reportFilterMenuContent.classList.remove('hidden');
                reportFilterMenuContent.classList.add('active');
                reportFilterToggleBtn.classList.add('active');
            } else {
                // Hide filters
                reportFilterMenuContent.classList.add('hidden');
                reportFilterMenuContent.classList.remove('active');
                reportFilterToggleBtn.classList.remove('active');
            }
        });
    }

    // Quick reset report filters
    const quickResetReportFilters = document.getElementById('quickResetReportFilters');
    if (quickResetReportFilters) {
        quickResetReportFilters.addEventListener('click', () => {
            this.resetAllReportFilters();
        });
    }

    // Quick apply report filters
    const applyReportFiltersQuick = document.getElementById('applyReportFiltersQuick');
    if (applyReportFiltersQuick) {
        applyReportFiltersQuick.addEventListener('click', () => {
            this.generateReport(); // This will apply filters
        });
    }
}

// Add these new methods to your TransportApp class
resetAllReportFilters() {
    // Reset all filter values
    document.getElementById('reportStartDate').value = '';
    document.getElementById('reportEndDate').value = '';
    document.getElementById('reportClientFilter').selectedIndex = 0;
    document.getElementById('reportStatusFilter').selectedIndex = 0;
    document.getElementById('reportTruckFilter').selectedIndex = 0;
    document.getElementById('reportDriverFilter').selectedIndex = 0;
    document.getElementById('reportDestinationFilter').selectedIndex = 0;
    document.getElementById('reportPeriodFilter').selectedIndex = 0;
    
    // Update filter count
    const filterCount = document.getElementById('reportFilterCount');
    if (filterCount) {
        filterCount.textContent = '0';
        filterCount.classList.add('hidden');
    }
    
    // CRITICAL FIX: Maintain toggle functionality after reset
    const reportFilterToggleBtn = document.getElementById('reportFilterToggleBtn');
    const reportFilterMenuContent = document.getElementById('reportFilterMenuContent');
    
    if (reportFilterToggleBtn && reportFilterMenuContent) {
        // Keep the menu open and functional
        reportFilterMenuContent.classList.remove('hidden');
        reportFilterMenuContent.classList.add('active');
        reportFilterToggleBtn.classList.add('active');
    }
    
    // Reload reports with cleared filters
    this.generateReport();
    this.showToast('Filtres de rapport réinitialisés', 'success');
}

applyReportFilters() {
    // AJOUT: Debug pour vérifier
    console.log('🚀 Application des filtres de rapport...');
    this.debugReportFilters();
    
    // Count active filters
    let activeFilters = 0;
    const filterElements = {
        'reportStartDate': document.getElementById('reportStartDate'),
        'reportEndDate': document.getElementById('reportEndDate'),
        'reportClientFilter': document.getElementById('reportClientFilter'),
        'reportStatusFilter': document.getElementById('reportStatusFilter'),
        'reportTruckFilter': document.getElementById('reportTruckFilter'),
        'reportDriverFilter': document.getElementById('reportDriverFilter'),
        'reportDestinationFilter': document.getElementById('reportDestinationFilter'),
        'reportPeriodFilter': document.getElementById('reportPeriodFilter')
    };
    
    Object.entries(filterElements).forEach(([key, element]) => {
        if (element && element.value && element.value !== '' && element.value !== 'custom') {
            activeFilters++;
            console.log(`✓ Filtre actif: ${key} = ${element.value}`);
        }
    });
    
    // Update filter count
    const filterCount = document.getElementById('reportFilterCount');
    if (filterCount) {
        filterCount.textContent = activeFilters;
        filterCount.classList.toggle('hidden', activeFilters === 0);
    }
    
    // CORRECTION: Regénérer le rapport avec les nouveaux filtres
    this.generateReport();
    this.showToast(`Filtres appliqués! ${activeFilters} filtre(s) actif(s).`, 'success');
}
// ============================================
// OPEN OPERATIONS NETWORK IMPLEMENTATION - FIXED VERSION
// ============================================
// Initialize the operations network
initializeOperationsNetwork() {
    console.log('Initializing Operations Network...');
    
    // Initialize network properties
    this.networkInstance = null;
    this.networkData = { nodes: [], edges: [] };
    this.selectedNodeId = null;
    this.networkFilters = {
        myTrucks: true,
        maintenance: true,
        timeframe: 48
    };
    this.nodePositions = this.loadNodePositions();
    this.isFullscreen = false;
    this.isCollapsed = false;
    
    // Setup event listeners
    this.setupNetworkEventListeners();
    
    // Add required CSS dynamically
    this.addNetworkCSS();
    
    // Initial load with retry mechanism
    this.loadOperationsNetworkWithRetry();

}

// Add required CSS for network functionality
addNetworkCSS() {
    if (document.getElementById('networkCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'networkCSS';
    style.textContent = `
        /* Network Fullscreen */
        .network-fullscreen .operations-network-container.fullscreen {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
            background: white !important;
        }
        
        .network-fullscreen .operations-network-container.fullscreen #networkCanvas {
            height: calc(100vh - 120px) !important;
        }
        
        /* Network Collapse */
        .operations-network-container.collapsed #networkCanvas {
            height: 0 !important;
            overflow: hidden !important;
            transition: height 0.3s ease !important;
        }
        
        .operations-network-container:not(.collapsed) #networkCanvas {
            height: 500px !important;
            transition: height 0.3s ease !important;
        }
        
        /* Highlighted edges */
        .cy-container {
            font-family: var(--font-family-base) !important;
        }
        
        /* Edge tooltip */
        .edge-tooltip {
            position: absolute;
            background: white;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-base);
            padding: var(--space-12);
            box-shadow: var(--shadow-modal);
            z-index: 10000;
            max-width: 250px;
            display: none;
        }
        
        .edge-tooltip .tooltip-header {
            font-weight: bold;
            margin-bottom: var(--space-8);
            border-bottom: 1px solid var(--color-border);
            padding-bottom: var(--space-4);
        }
        
        .edge-tooltip .driver-name {
            color: var(--color-text-secondary);
            font-size: var(--font-size-sm);
            margin-left: var(--space-8);
        }
        
        .edge-tooltip .maintenance-note {
            color: var(--color-warning);
            font-size: var(--font-size-sm);
            margin-top: var(--space-4);
        }
        
        /* Network popover positioning */
        .network-popover {
            position: fixed !important;
            background: white;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-modal);
            z-index: 10001;
            max-width: 350px;
            min-width: 250px;
        }
        
        .popover-truck-item {
            padding: var(--space-8);
            border-bottom: 1px solid var(--color-border);
            font-size: var(--font-size-sm);
        }
        
        .popover-truck-item:last-child {
            border-bottom: none;
        }
        
        /* Non-cyclic warning */
        .non-cyclic-truck {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-8);
            border-bottom: 1px solid var(--color-border);
        }
        
        .non-cyclic-truck:last-child {
            border-bottom: none;
        }
    `;
    document.head.appendChild(style);
}

// Setup event listeners for network controls - FIXED
setupNetworkEventListeners() {
    // Fullscreen toggle - FIXED
    const fullscreenBtn = document.getElementById('networkFullscreen');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleNetworkFullscreen();
        });
    }
    
    // Reset view - FIXED
    const resetViewBtn = document.getElementById('networkResetView');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.resetNetworkView();
        });
    }
    
    // Toggle legend - FIXED
    const legendBtn = document.getElementById('networkToggleLegend');
    if (legendBtn) {
        legendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleNetworkLegend();
        });
    }
    
    // Collapse/expand network - FIXED
    const collapseBtn = document.getElementById('networkToggleCollapse');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleNetworkCollapse();
        });
    }
    
    // Filter controls
    const myTrucksFilter = document.getElementById('filterMyTrucks');
    const maintenanceFilter = document.getElementById('filterMaintenance');
    const timeframeFilter = document.getElementById('filterTimeframe');
    
    if (myTrucksFilter) {
        myTrucksFilter.addEventListener('change', (e) => {
            this.networkFilters.myTrucks = e.target.checked;
            this.loadOperationsNetwork();
        });
    }
    
    if (maintenanceFilter) {
        maintenanceFilter.addEventListener('change', (e) => {
            this.networkFilters.maintenance = e.target.checked;
            this.loadOperationsNetwork();
        });
    }
    
    if (timeframeFilter) {
        timeframeFilter.addEventListener('change', (e) => {
            this.networkFilters.timeframe = e.target.value === 'all' ? null : parseInt(e.target.value);
            this.loadOperationsNetwork();
        });
    }
    
    // Popover close
    const popoverClose = document.getElementById('popoverClose');
    if (popoverClose) {
        popoverClose.addEventListener('click', () => this.hideNetworkPopover());
    }
    
    // Non-cyclic warning toggle
    const nonCyclicToggle = document.getElementById('nonCyclicToggle');
    if (nonCyclicToggle) {
        nonCyclicToggle.addEventListener('click', () => this.toggleNonCyclicWarning());
    }
    
    // Click outside to hide popover
    document.addEventListener('click', (e) => {
        const popover = document.getElementById('networkPopover');
        if (popover && !popover.contains(e.target) && !e.target.closest('#networkCanvas')) {
            this.hideNetworkPopover();
        }
    });
}

// Load network with retry mechanism - FIXED
loadOperationsNetworkWithRetry(retryCount = 0) {
    const maxRetries = 3;
    
    try {
        this.loadOperationsNetwork();
    } catch (error) {
        console.error(`Network loading failed (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < maxRetries) {
            setTimeout(() => {
                this.loadOperationsNetworkWithRetry(retryCount + 1);
            }, 1000 * (retryCount + 1));
        } else {
            this.showNetworkError('Impossible de charger le réseau des opérations après plusieurs tentatives');
        }
    }
}

// Load and render the operations network - IMPROVED
loadOperationsNetwork() {
    console.log('Loading operations network data...');
    
    try {
        // Ensure container exists
        const container = document.getElementById('networkCanvas');
        if (!container) {
            console.error('Network canvas container not found');
            return;
        }
        
        // Get open operations
        const openOperations = this.getOpenOperations();
        console.log(`Found ${openOperations.length} open operations`);
        
        // Build network data
        this.networkData = this.buildNetworkData(openOperations);
        
        // Update operation count
        this.updateNetworkCount(openOperations.length);
        
        // Initialize or update Cytoscape
        if (this.networkInstance && !this.networkInstance.destroyed()) {
            this.updateNetworkInstance();
        } else {
            this.initializeCytoscapeNetwork();
        }
        
        // Check for non-cyclic routes
        this.checkNonCyclicRoutes();
        
        console.log('Operations network loaded successfully');
        
    } catch (error) {
        console.error('Error loading operations network:', error);
        this.showNetworkError('Erreur lors du chargement du réseau des opérations');
    }
}

// Get open operations (not completed) - SAME
getOpenOperations() {
    const operations = this.getOperations();
    const trucks = this.getTrucks();
    const drivers = this.getDrivers();
    
    // Filter open operations
    let openOperations = operations.filter(op => {
        const isCompleted = op.status === 'dechargement_termine';
        const isAnnulee = op.status === 'annulee';
        return !isCompleted && !isAnnulee;
    });
    
    // Apply timeframe filter
    if (this.networkFilters.timeframe) {
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - this.networkFilters.timeframe);
        
        openOperations = openOperations.filter(op => {
            const opTime = new Date(op.created_at || new Date());
            return opTime >= cutoffTime;
        });
    }
    
    // Apply truck filter
    if (this.networkFilters.myTrucks && this.currentUser) {
        // For now, show all trucks. In production, you might filter by user assignment
    }
    
    // Apply maintenance filter
    if (!this.networkFilters.maintenance) {
        openOperations = openOperations.filter(op => {
            const truck = trucks.find(t => t.id === op.assigned_truck_id);
            if (!truck) return true;
            return truck.maintenance_status === 'operational';
        });
    }
    
    // Enrich with truck and driver data
    return openOperations.map(op => {
        const truck = trucks.find(t => t.id === op.assigned_truck_id);
        const driver = drivers.find(d => d.id === op.assigned_driver_id);
        
        return {
            ...op,
            truck_info: truck || null,
            driver_info: driver || null
        };
    });
}

// Build network nodes and edges from operations - SAME
buildNetworkData(operations) {
    const nodes = new Map();
    const edges = [];
    const wilayaCounts = new Map();
    
    // Count operations per wilaya
    operations.forEach(op => {
        const from = op.departure_location;
        const to = op.arrival_location;
        
        if (from) {
            wilayaCounts.set(from, (wilayaCounts.get(from) || 0) + 1);
        }
        if (to) {
            wilayaCounts.set(to, (wilayaCounts.get(to) || 0) + 1);
        }
    });
    
    // Create nodes for each wilaya involved
    wilayaCounts.forEach((count, wilaya) => {
        const inbound = operations.filter(op => op.arrival_location === wilaya).length;
        const outbound = operations.filter(op => op.departure_location === wilaya).length;
        
        nodes.set(wilaya, {
            data: {
                id: wilaya,
                label: `${wilaya}\n↑${inbound} ↓${outbound}`,
                wilaya: wilaya,
                operations_count: count,
                inbound_count: inbound,
                outbound_count: outbound,
                is_biskra: wilaya === '07-Biskra'
            },
            position: this.getNodePosition(wilaya)
        });
    });
    
    // Create edges for each operation
    operations.forEach((op, index) => {
        if (!op.departure_location || !op.arrival_location) return;
        
        const edgeId = `edge-${op.id}`;
        const truck = op.truck_info;
        const driver = op.driver_info;
        
        edges.push({
            data: {
                id: edgeId,
                source: op.departure_location,
                target: op.arrival_location,
                operation_id: op.id,
                operation_number: op.operation_number,
                client_name: op.client_name,
                status: op.status,
                truck_registration: truck ? truck.registration : 'N/A',
                driver_name: driver ? driver.name.split(' ')[0] : 'N/A',
                estimated_arrival: op.estimated_arrival,
                real_departure_time: op.real_departure_time,
                label: truck ? `${truck.registration.split('-')[1] || truck.registration}` : 'N/A',
                weight: 1,
                maintenance_status: truck ? truck.maintenance_status : 'operational'
            }
        });
    });
    
    return {
        nodes: Array.from(nodes.values()),
        edges: edges
    };
}

// Get node position (use saved positions or default layout) - SAME
getNodePosition(wilaya) {
    if (this.nodePositions && this.nodePositions[wilaya]) {
        return this.nodePositions[wilaya];
    }
    
    // Default positions - center Biskra
    if (wilaya === '07-Biskra') {
        return { x: 400, y: 300 };
    }
    
    // Simple default layout in a circle
    const angle = this.hashWilayaToAngle(wilaya);
    const radius = 200;
    return {
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle)
    };
}

// Hash wilaya name to angle for consistent positioning - SAME
hashWilayaToAngle(wilaya) {
    let hash = 0;
    for (let i = 0; i < wilaya.length; i++) {
        hash = ((hash << 5) - hash + wilaya.charCodeAt(i)) & 0xffffffff;
    }
    return (hash % 360) * (Math.PI / 180);
}

// Initialize Cytoscape network instance - ENHANCED with Unique Wilaya Colors
initializeCytoscapeNetwork() {
    const container = document.getElementById('networkCanvas');
    if (!container) {
        console.error('Network canvas container not found');
        return;
    }
    
    // Destroy existing instance if any
    if (this.networkInstance && !this.networkInstance.destroyed()) {
        this.networkInstance.destroy();
    }
    
    // Color generator for wilayas
    this.generateWilayaColors();
    
    this.networkInstance = cytoscape({
        container: container,
        
        elements: [
            ...this.networkData.nodes,
            ...this.networkData.edges
        ],
        
        style: [
            // Default node styles - white background with colored borders
            {
                selector: 'node',
                style: {
                    'background-color': '#ffffff',
                    'border-width': 4,
                    'border-color': (ele) => {
                        const wilayaName = ele.data('label') || ele.data('id');
                        return this.getWilayaColor(wilayaName);
                    },
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'color': '#000000',
                    'font-size': 16,
                    'font-weight': 'bold',
                    'text-background-color': '#ffffff',
                    'text-background-opacity': 1.9,
                    'text-background-padding': '20px',
                    'width': 170,
                    'height': 170,
                    'overlay-opacity': 0,
                    'shape': 'ellipse'
                }
            },
            
            // Biskra node (special rectangular styling) - ENHANCED
            {
                selector: 'node[is_biskra = "true"]',
                style: {
                    'background-color': '#ffffff',
                    'border-color': '#ff6b6b',
                    'border-width': 6,
                    'width': 120,
                    'height': 80,
                    'font-size': 16,
                    'font-weight': 'bold',
                    'shape': 'rectangle',
                    'text-background-color': '#fff5f5',
                    'text-background-opacity': 0.95,
                    'text-background-padding': '6px',
                    'color': '#d63031'
                }
            },
            
            // Edge styles - keeping original
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#6c757d',
                    'target-arrow-color': '#6c757d',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 1.2,
                    'label': 'data(label)',
                    'font-size': 10,
                    'color': '#000000',
                    'text-background-color': '#ffffff',
                    'text-background-opacity': 0.9,
                    'text-background-padding': '2px'
                }
            },
            
            // Status-based edge colors - keeping original
            {
                selector: 'edge[status = "en_attente"]',
                style: {
                    'line-color': '#6c757d',
                    'target-arrow-color': '#6c757d'
                }
            },
            {
                selector: 'edge[status = "demarree"]',
                style: {
                    'line-color': '#007bff',
                    'target-arrow-color': '#007bff'
                }
            },
            {
                selector: 'edge[status = "arrivee_site_chargement"], edge[status = "chargement_termine"]',
                style: {
                    'line-color': '#ffc107',
                    'target-arrow-color': '#ffc107'
                }
            },
            {
                selector: 'edge[status = "arrivee_site_destination"]',
                style: {
                    'line-color': '#6f42c1',
                    'target-arrow-color': '#6f42c1'
                }
            },
            {
                selector: 'edge[status = "probleme_signalee"]',
                style: {
                    'line-color': '#dc3545',
                    'target-arrow-color': '#dc3545',
                    'width': 4
                }
            },
            
            // Highlighted edges - keeping original
            {
                selector: 'edge.highlighted',
                style: {
                    'width': 6,
                    'line-color': '#28a745',
                    'target-arrow-color': '#28a745',
                    'z-index': 999
                }
            }
        ],
        
        layout: {
            name: 'preset',
            fit: false
        },
        
        // Interaction settings - keeping original
        zoomingEnabled: true,
        userZoomingEnabled: true,
        panningEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        selectionType: 'single',
        autoungrabify: false,
        
        // Viewport settings - keeping original
        minZoom: 0.3,
        maxZoom: 3,
        wheelSensitivity: 0.2
    });
    
    // Setup interaction handlers
    this.setupNetworkInteractions();
    
    // Initial fit to Biskra
    setTimeout(() => {
        this.centerOnBiskra();
    }, 100);
}
// Generate unique colors for each wilaya
generateWilayaColors() {
    if (!this.wilayaColorMap) {
        this.wilayaColorMap = new Map();
        this.colorIndex = 0;
    }
}

// Get or generate color for a wilaya
getWilayaColor(wilayaName) {
    if (!this.wilayaColorMap) {
        this.generateWilayaColors();
    }
    
    // Special case for Biskra
    if (wilayaName && wilayaName.toLowerCase().includes('biskra')) {
        return '#ff6b6b';
    }
    
    // Check if we already have a color for this wilaya
    if (this.wilayaColorMap.has(wilayaName)) {
        return this.wilayaColorMap.get(wilayaName);
    }
    
    // Generate a new color using HSL for good variety
    const hue = (this.colorIndex * 137.5) % 360; // Golden angle for good distribution
    const saturation = 65 + (this.colorIndex % 3) * 10; // 65-85% saturation
    const lightness = 45 + (this.colorIndex % 4) * 5; // 45-60% lightness
    
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    // Store the color for this wilaya
    this.wilayaColorMap.set(wilayaName, color);
    this.colorIndex++;
    
    return color;
}

// Setup network interaction handlers - IMPROVED
setupNetworkInteractions() {
    if (!this.networkInstance) return;
    
    // Single click on node - show popover - FIXED POSITIONING
    this.networkInstance.on('tap', 'node', (evt) => {
        const node = evt.target;
        const wilaya = node.data('wilaya');
        this.showNodePopover(node, wilaya, evt.originalEvent);
    });
    
    // Single click on edge - show operation details panel - IMPROVED
    this.networkInstance.on('tap', 'edge', (evt) => {
        const edge = evt.target;
        const operationId = edge.data('operation_id');
        this.showOperationDetailsPanel(operationId, edge.data());
    });
    
    // Double click on node - zoom to node
    this.networkInstance.on('dbltap', 'node', (evt) => {
        const node = evt.target;
        this.zoomToNode(node);
    });
    
    // Node drag - update positions
    this.networkInstance.on('dragfree', 'node', (evt) => {
        this.saveNodePositions();
    });
    
    // Click on canvas - hide popover
    this.networkInstance.on('tap', (evt) => {
        if (evt.target === this.networkInstance) {
            this.hideNetworkPopover();
        }
    });
    
    // Hover effects - IMPROVED
    this.networkInstance.on('mouseover', 'edge', (evt) => {
        const edge = evt.target;
        this.showEdgeTooltip(evt.originalEvent, edge);
    });
    
    this.networkInstance.on('mouseout', 'edge', (evt) => {
        this.hideEdgeTooltip();
    });
}

// Show node popover with trucks heading to that wilaya - FIXED POSITIONING
showNodePopover(node, wilaya, originalEvent) {
    const operations = this.getOpenOperations();
    const trucksToWilaya = operations.filter(op => op.arrival_location === wilaya);
    
    const popover = document.getElementById('networkPopover');
    const title = document.getElementById('popoverTitle');
    const content = document.getElementById('popoverContent');
    
    if (!popover || !title || !content) return;
    
    title.textContent = `Camions vers ${wilaya}`;
    
    if (trucksToWilaya.length === 0) {
        content.innerHTML = '<p>Aucun camion en route vers cette destination</p>';
    } else {
        content.innerHTML = `
            <div class="popover-trucks-list">
                ${trucksToWilaya.map(op => `
                    <div class="popover-truck-item">
                        <div class="truck-info">
                            <strong>${op.truck_info ? op.truck_info.registration : 'N/A'}</strong>
                            <span class="driver-name">${op.driver_info ? op.driver_info.name : 'N/A'}</span>
                        </div>
                        <div class="operation-info">
                            <span class="operation-id">Op: ${op.operation_number || op.id}</span>
                            <span class="operation-eta">${op.estimated_arrival ? this.formatAlgeriaDateTime(op.estimated_arrival) : 'ETA: N/A'}</span>
                        </div>
                        <div class="status-badge status-${op.status}">${this.getStatusDisplayName(op.status)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // FIXED: Position popover near cursor but keep it visible
    const popoverWidth = 350;
    const popoverHeight = 200;
    const margin = 20;
    
    let left = originalEvent.pageX + margin;
    let top = originalEvent.pageY - popoverHeight / 2;
    
    // Adjust if popover goes off-screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left + popoverWidth > viewportWidth) {
        left = originalEvent.pageX - popoverWidth - margin;
    }
    
    if (top < 0) {
        top = margin;
    } else if (top + popoverHeight > viewportHeight) {
        top = viewportHeight - popoverHeight - margin;
    }
    
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.classList.remove('hidden');
}

// Hide network popover - SAME
hideNetworkPopover() {
    const popover = document.getElementById('networkPopover');
    if (popover) {
        popover.classList.add('hidden');
    }
}

// Show operation details panel - IMPROVED
showOperationDetailsPanel(operationId, edgeData) {
    console.log('Opening operation details for:', operationId);
    
    // Find the operation
    const operations = this.getOpenOperations();
    const operation = operations.find(op => op.id === operationId);
    
    if (!operation) {
        console.error('Operation not found:', operationId);
        return;
    }
    
    // Enhanced operation details with arrow click context
    const details = `Opération ${operation.operation_number || operation.id}
    
📋 DÉTAILS DE L'OPÉRATION:
• Client: ${operation.client_name}
• De: ${operation.departure_location} → Vers: ${operation.arrival_location}
• Statut: ${this.getStatusDisplayName(operation.status)}

🚛 RESSOURCES:
• Camion: ${operation.truck_info ? `${operation.truck_info.brand} ${operation.truck_info.model} (${operation.truck_info.registration})` : 'N/A'}
• Chauffeur: ${operation.driver_info ? operation.driver_info.name : 'N/A'}

⏰ PLANIFICATION:
• Départ estimé: ${operation.estimated_departure ? this.formatAlgeriaDateTime(operation.estimated_departure) : 'N/A'}
• Arrivée estimée: ${operation.estimated_arrival ? this.formatAlgeriaDateTime(operation.estimated_arrival) : 'N/A'}

${operation.real_departure_time ? `✅ Départ réel: ${this.formatAlgeriaDateTime(operation.real_departure_time)}` : ''}
${operation.comments ? `\n💬 Commentaires: ${operation.comments}` : ''}`;
    
    // Use existing operation drawer if available
    if (typeof this.openOperationDrawer === 'function') {
        this.openOperationDrawer(operation);
    } else {
        // Enhanced fallback with better formatting
        if (confirm(`${details}\n\nVoulez-vous modifier cette opération ?`)) {
            // Try to open edit drawer or redirect to tracking section
            if (typeof this.editOperation === 'function') {
                this.editOperation(operationId);
            } else {
                this.handleNavigation({currentTarget: {dataset: {section: 'tracking'}}});
            }
        }
    }
}

// Center view on Biskra - FIXED
centerOnBiskra() {
    if (!this.networkInstance || this.networkInstance.destroyed()) return;
    
    try {
        const biskraNode = this.networkInstance.nodes('[wilaya = "07-Biskra"]');
        if (biskraNode.length > 0) {
            this.networkInstance.animate({
                center: {
                    eles: biskraNode
                },
                zoom: 1.0
            }, {
                duration: 500,
                complete: () => {
                    console.log('Centered on Biskra');
                }
            });
        } else {
            // If no Biskra node, center on all nodes
            this.networkInstance.animate({
                fit: {
                    eles: this.networkInstance.elements(),
                    padding: 50
                }
            }, {
                duration: 500
            });
        }
    } catch (error) {
        console.error('Error centering on Biskra:', error);
    }
}

// Zoom to specific node - SAME
zoomToNode(node) {
    if (!this.networkInstance || this.networkInstance.destroyed()) return;
    
    this.networkInstance.animate({
        center: {
            eles: node
        },
        zoom: 1.5
    }, {
        duration: 500
    });
}

// Update network instance with new data - IMPROVED
updateNetworkInstance() {
    if (!this.networkInstance || this.networkInstance.destroyed()) return;
    
    try {
        // Clear existing elements
        this.networkInstance.elements().remove();
        
        // Add new elements
        this.networkInstance.add([
            ...this.networkData.nodes,
            ...this.networkData.edges
        ]);
        
        // Apply layout
        this.networkInstance.layout({
            name: 'preset',
            fit: false
        }).run();
        
    } catch (error) {
        console.error('Error updating network instance:', error);
        this.initializeCytoscapeNetwork();
    }
}

// Update network operation count display - SAME
updateNetworkCount(count) {
    const countElement = document.getElementById('networkOperationCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Toggle network fullscreen - FIXED
// NEW: Toggle true fullscreen mode for network
toggleNetworkFullscreen() {
    const container = document.getElementById('operationsNetworkContainer');
    if (!container) return;
    
    const fullscreenBtn = document.getElementById('networkFullscreen');
    const icon = fullscreenBtn.querySelector('i');
    
    if (!document.fullscreenElement) {
        // Enter fullscreen mode
        container.requestFullscreen().then(() => {
            // Change button icon to minimize
            icon.setAttribute('data-lucide', 'minimize');
            fullscreenBtn.title = 'Quitter plein écran (ESC)';
            
            // Add fullscreen class for styling
            container.classList.add('network-fullscreen-active');
            
            // Refresh icons
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
            
            // Resize network if it exists
            if (this.networkInstance) {
                setTimeout(() => {
                    this.networkInstance.fit();
                    this.networkInstance.center();
                }, 100);
            }
            
            this.showToast('Mode plein écran activé (ESC pour quitter)', 'success');
            
        }).catch(err => {
            console.error('Error entering fullscreen:', err);
            this.showToast('Impossible d\'activer le mode plein écran', 'error');
        });
        
    } else {
        // Exit fullscreen mode
        document.exitFullscreen().then(() => {
            // Change button icon back to maximize
            icon.setAttribute('data-lucide', 'maximize');
            fullscreenBtn.title = 'Mode plein écran';
            
            // Remove fullscreen class
            container.classList.remove('network-fullscreen-active');
            
            // Refresh icons
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
            
            // Resize network if it exists
            if (this.networkInstance) {
                setTimeout(() => {
                    this.networkInstance.fit();
                    this.networkInstance.center();
                }, 100);
            }
            
        }).catch(err => {
            console.error('Error exiting fullscreen:', err);
        });
    }
}

// Reset network view - FIXED
resetNetworkView() {
    if (!this.networkInstance || this.networkInstance.destroyed()) {
        console.log('Network instance not available for reset');
        return;
    }
    
    try {
        // Reset highlighted edges
        this.networkInstance.edges().removeClass('highlighted');
        
        // Reset zoom and center on Biskra
        this.centerOnBiskra();
        
        // Reset node positions to default if needed
        const shouldResetPositions = confirm('Voulez-vous également réinitialiser les positions des nœuds ?');
        if (shouldResetPositions) {
            this.networkData.nodes.forEach(nodeData => {
                const node = this.networkInstance.getElementById(nodeData.data.id);
                if (node.length > 0) {
                    const defaultPos = this.getNodePosition(nodeData.data.wilaya);
                    node.position(defaultPos);
                }
            });
        }
        
        this.showToast('Vue du réseau réinitialisée', 'success');
        
    } catch (error) {
        console.error('Error resetting network view:', error);
        this.showToast('Erreur lors de la réinitialisation', 'error');
    }
}

// Toggle network legend - FIXED
toggleNetworkLegend() {
    const legend = document.getElementById('networkLegend');
    const btn = document.getElementById('networkToggleLegend');
    
    if (legend && btn) {
        legend.classList.toggle('hidden');
        
        if (legend.classList.contains('hidden')) {
            btn.title = 'Afficher la légende';
        } else {
            btn.title = 'Masquer la légende';
        }
        
        console.log('Legend toggled:', !legend.classList.contains('hidden'));
    }
}

// Toggle network collapse/expand - FIXED
toggleNetworkCollapse() {
    const container = document.getElementById('operationsNetworkContainer');
    const canvas = document.getElementById('networkCanvas');
    const btn = document.getElementById('networkToggleCollapse');
    
    if (!container || !canvas || !btn) return;
    
    try {
        if (this.isCollapsed) {
            // Expand
            container.classList.remove('collapsed');
            btn.innerHTML = '<i data-lucide="chevron-up"></i>';
            btn.title = 'Réduire le réseau';
            this.isCollapsed = false;
            
            // Resize network after expansion
            setTimeout(() => {
                if (this.networkInstance && !this.networkInstance.destroyed()) {
                    this.networkInstance.resize();
                }
            }, 350);
            
            console.log('Network expanded');
        } else {
            // Collapse
            container.classList.add('collapsed');
            btn.innerHTML = '<i data-lucide="chevron-down"></i>';
            btn.title = 'Développer le réseau';
            this.isCollapsed = true;
            
            console.log('Network collapsed');
        }
        
        this.initializeLucideIcons();
        
    } catch (error) {
        console.error('Error toggling network collapse:', error);
    }
}

// Check for non-cyclic routes - SAME
checkNonCyclicRoutes() {
    const operations = this.getOpenOperations();
    const trucks = this.getTrucks();
    const nonCyclicTrucks = [];
    
    // Group operations by truck
    const truckOperations = new Map();
    operations.forEach(op => {
        if (op.assigned_truck_id) {
            if (!truckOperations.has(op.assigned_truck_id)) {
                truckOperations.set(op.assigned_truck_id, []);
            }
            truckOperations.get(op.assigned_truck_id).push(op);
        }
    });
    
    // Check each truck's route
    truckOperations.forEach((ops, truckId) => {
        const truck = trucks.find(t => t.id === truckId);
        if (!truck) return;
        
        // Sort operations by estimated departure time
        const sortedOps = ops.sort((a, b) => {
            const timeA = new Date(a.estimated_departure || a.created_at);
            const timeB = new Date(b.estimated_departure || b.created_at);
            return timeA - timeB;
        });
        
        // Check if any operation returns to Biskra
        const returnsToBiskra = sortedOps.some(op => op.arrival_location === '07-Biskra');
        
        if (!returnsToBiskra && sortedOps.length > 0) {
            nonCyclicTrucks.push({
                truck: truck,
                operations: sortedOps,
                lastDestination: sortedOps[sortedOps.length - 1].arrival_location
            });
        }
    });
    
    this.displayNonCyclicWarning(nonCyclicTrucks);
}

// Display non-cyclic trucks warning - SAME
displayNonCyclicWarning(nonCyclicTrucks) {
    const warningContainer = document.getElementById('nonCyclicWarning');
    const warningContent = document.getElementById('nonCyclicContent');
    
    if (!warningContainer || !warningContent) return;
    
    if (nonCyclicTrucks.length === 0) {
        warningContainer.classList.add('hidden');
        return;
    }
    
    // Show warning
    warningContainer.classList.remove('hidden');
    
    // Update header
    const header = warningContainer.querySelector('.warning-header span');
    if (header) {
        header.textContent = `${nonCyclicTrucks.length} Camion(s) avec Routes Non-Cycliques (ne retournent pas à Biskra)`;
    }
    
    // Populate content
    warningContent.innerHTML = nonCyclicTrucks.map(item => `
        <div class="non-cyclic-truck">
            <div class="truck-info">
                <strong>${item.truck.registration}</strong>
                <span class="truck-brand">${item.truck.brand} ${item.truck.model}</span>
            </div>
            <div class="route-info">
                <span class="last-destination">Dernière destination: ${item.lastDestination}</span>
                <span class="operations-count">${item.operations.length} opération(s)</span>
            </div>
            <button class="btn btn--outline btn--sm" onclick="app.highlightTruckRoute(${item.truck.id})">
                Surligner Route
            </button>
        </div>
    `).join('');
}

// Toggle non-cyclic warning visibility - FIXED
toggleNonCyclicWarning() {
    const content = document.getElementById('nonCyclicContent');
    const toggle = document.getElementById('nonCyclicToggle');
    
    if (content && toggle) {
        content.classList.toggle('hidden');
        
        if (content.classList.contains('hidden')) {
            toggle.innerHTML = '<i data-lucide="chevron-down"></i>';
        } else {
            toggle.innerHTML = '<i data-lucide="chevron-up"></i>';
        }
        
        this.initializeLucideIcons();
    }
}

// Highlight truck route in network - FIXED
highlightTruckRoute(truckId) {
    if (!this.networkInstance || this.networkInstance.destroyed()) {
        console.log('Network not available for highlighting');
        return;
    }
    
    try {
        // Reset all edge styles first
        this.networkInstance.edges().removeClass('highlighted');
        
        // Find and highlight edges for this truck
        const operations = this.getOpenOperations();
        const truckOperations = operations.filter(op => op.assigned_truck_id === truckId);
        
        let highlightedCount = 0;
        truckOperations.forEach(op => {
            const edge = this.networkInstance.getElementById(`edge-${op.id}`);
            if (edge.length > 0) {
                edge.addClass('highlighted');
                highlightedCount++;
            }
        });
        
        // Show toast with results
        const truck = this.getTrucks().find(t => t.id === truckId);
        if (truck) {
            this.showToast(`Route du camion ${truck.registration} surlignée (${highlightedCount} segments)`, 'success');
            
            // Zoom to truck route
            if (highlightedCount > 0) {
                const highlightedEdges = this.networkInstance.edges('.highlighted');
                this.networkInstance.animate({
                    fit: {
                        eles: highlightedEdges.union(highlightedEdges.connectedNodes()),
                        padding: 50
                    }
                }, {
                    duration: 1000
                });
            }
        } else {
            this.showToast('Camion non trouvé', 'error');
        }
        
    } catch (error) {
        console.error('Error highlighting truck route:', error);
        this.showToast('Erreur lors du surlignage', 'error');
    }
}

// Save node positions to localStorage - SAME
saveNodePositions() {
    if (!this.networkInstance || this.networkInstance.destroyed()) return;
    
    const positions = {};
    this.networkInstance.nodes().forEach(node => {
        const wilaya = node.data('wilaya');
        positions[wilaya] = node.position();
    });
    
    localStorage.setItem('network_node_positions', JSON.stringify(positions));
    this.nodePositions = positions;
}

// Load node positions from localStorage - SAME
loadNodePositions() {
    try {
        const saved = localStorage.getItem('network_node_positions');
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.error('Error loading node positions:', error);
        return {};
    }
}

// Show network error message - IMPROVED
showNetworkError(message) {
    const canvas = document.getElementById('networkCanvas');
    if (canvas) {
        canvas.innerHTML = `
            <div class="network-error" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                text-align: center;
                padding: var(--space-32);
                color: var(--color-text-secondary);
            ">
                <div class="error-icon" style="font-size: 48px; margin-bottom: var(--space-16);">⚠️</div>
                <div class="error-message" style="margin-bottom: var(--space-20); font-size: var(--font-size-lg);">${message}</div>
                <button class="btn btn--outline btn--sm" onclick="app.loadOperationsNetwork()">
                    <i data-lucide="refresh-cw"></i>
                    Réessayer
                </button>
            </div>
        `;
        
        // Initialize icons for the retry button
        setTimeout(() => {
            this.initializeLucideIcons();
        }, 100);
    }
}

// Real-time network update - IMPROVED
updateNetworkRealTime() {
    if (this.currentSection === 'dashboard' && !this.isCollapsed) {
        console.log('Updating network in real-time...');
        this.loadOperationsNetwork();
    }
}

// Show edge tooltip on hover - IMPROVED
showEdgeTooltip(originalEvent, edge) {
    // Create tooltip if it doesn't exist
    let tooltip = document.getElementById('edgeTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'edgeTooltip';
        tooltip.className = 'edge-tooltip';
        document.body.appendChild(tooltip);
    }
    
    const data = edge.data();
    const maintenanceNote = data.maintenance_status !== 'operational' ? 
        `<div class="maintenance-note">⚠️ ${this.getMaintenanceDisplayName(data.maintenance_status)}</div>` : '';
    
    tooltip.innerHTML = `
        <div class="tooltip-header">
            <strong>${data.truck_registration}</strong>
            <span class="driver-name">${data.driver_name}</span>
        </div>
        <div class="tooltip-content">
            <div><strong>Opération:</strong> ${data.operation_number || data.operation_id}</div>
            <div><strong>Client:</strong> ${data.client_name}</div>
            <div><strong>Statut:</strong> ${this.getStatusDisplayName(data.status)}</div>
            <div><strong>ETA:</strong> ${data.estimated_arrival ? this.formatAlgeriaDateTime(data.estimated_arrival) : 'N/A'}</div>
            ${maintenanceNote}
        </div>
    `;
    
    // Position tooltip near cursor but keep it visible
    const tooltipWidth = 250;
    const tooltipHeight = 150;
    const margin = 15;
    
    let left = originalEvent.pageX + margin;
    let top = originalEvent.pageY - tooltipHeight / 2;
    
    // Adjust if tooltip goes off-screen
    if (left + tooltipWidth > window.innerWidth) {
        left = originalEvent.pageX - tooltipWidth - margin;
    }
    
    if (top < 0) {
        top = margin;
    } else if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - margin;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
}

// Hide edge tooltip - SAME
hideEdgeTooltip() {
    const tooltip = document.getElementById('edgeTooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}
// ===== SETTINGS MODULE =====
loadSettings() {
  // Load users table and permissions panel
  this.renderUsersTable();
  this.populatePermissionUserSelect();
  this.updateBackupIndicators();
  this.initializeLucideIcons();
}

renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  const users = this.getUsers();
  tbody.innerHTML = users.map(u => {
    const statusBadge = u.status === 'active'
      ? '<span class="user-badge-active">Actif</span>'
      : '<span class="user-badge-disabled">Désactivé</span>';
    const lastLogin = u.last_login ? this.formatAlgeriaDateTime(u.last_login) : '—';
    return `
      <tr>
        <td>${u.username}</td>
        <td>${u.full_name}</td>
        <td>${this.getRoleDisplayName(u.role)}</td>
        <td>${statusBadge}</td>
        <td>${lastLogin}</td>
        <td>
          <div class="user-actions">
            <button class="btn btn--outline btn--sm" data-action="edit" data-id="${u.id}"><i data-lucide="edit"></i></button>
            <button class="btn btn--outline btn--sm" data-action="toggle" data-id="${u.id}">
              <i data-lucide="${u.status==='active' ? 'user-x' : 'user-check'}"></i>
            </button>
            <button class="btn btn--outline btn--sm" data-action="delete" data-id="${u.id}" style="color: var(--color-error); border-color: var(--color-error);">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Bind actions
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      const action = e.currentTarget.getAttribute('data-action');
      if (action === 'edit') this.openUserModal(id);
      if (action === 'toggle') this.toggleUserStatus(id);
      if (action === 'delete') this.confirmDeleteUser(id);
    });
  });
  this.initializeLucideIcons();
}

openUserModal(userId = null) {
  if (!this.requireAdminOnly()) return;
  const title = document.getElementById('userModalTitle');
  const idInput = document.getElementById('editUserId');
  const username = document.getElementById('userUsername');
  const fullName = document.getElementById('userFullName');
  const password = document.getElementById('userPassword');
  const role = document.getElementById('userRole');
  const status = document.getElementById('userStatus');

  // Reset
  document.getElementById('userForm').reset();
  idInput.value = '';
  password.value = '';

  if (userId) {
    const users = this.getUsers();
    const u = users.find(x => x.id === userId);
    if (!u) return;
    title.textContent = 'Modifier utilisateur';
    idInput.value = u.id;
    username.value = u.username;
    fullName.value = u.full_name;
    role.value = u.role;
    status.value = u.status;
    username.disabled = true; // username immutable
  } else {
    title.textContent = 'Nouvel utilisateur';
    username.disabled = false;
  }
  const modal = document.getElementById('userModal');
  if (modal) modal.classList.remove('hidden');
}
closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

requireAdminOnly() {
  if (!this.currentUser || this.currentUser.role !== 'admin') {
    alert('Accès réservé à l\'administrateur');
    return false;
  }
  return true;
}

async handleUserSave(e) {
  e.preventDefault();
  if (!this.requireAdminOnly()) return;

  const id = parseInt(document.getElementById('editUserId').value || '0', 10);
  const username = document.getElementById('userUsername').value.trim();
  const fullName = document.getElementById('userFullName').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;
  const status = document.getElementById('userStatus').value;

  if (!username || !fullName || !role || !status) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }

  const users = this.getUsers();

  if (!id) {
    // Create
    if (users.some(u => u.username === username)) {
      alert('Nom d\'utilisateur déjà utilisé');
      return;
    }
    const password_hash = password ? await this.hashPassword(password) : await this.hashPassword('changeme');
    const newUser = {
      id: Date.now(),
      username,
      full_name: fullName,
      role,
      status,
      password_hash,
      last_login: null,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    this.saveUsers(users);

    // initialize empty perms for this user
    const perms = this.getPermissions();
    perms[username] = {};
    this.savePermissions(perms);

    this.addActivity(`Utilisateur créé: ${fullName}`, 'user-check');
  } else {
    // Update
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return;
    // Check username conflict if somehow changed (we disabled the field anyway)
    if (users[idx].username !== username && users.some(u => u.username === username)) {
      alert('Nom d\'utilisateur déjà utilisé');
      return;
    }
    users[idx].full_name = fullName;
    users[idx].role = role;
    users[idx].status = status;
    if (password) {
      users[idx].password_hash = await this.hashPassword(password);
    }
    this.saveUsers(users);
    this.addActivity(`Utilisateur modifié: ${fullName}`, 'edit');
  }

  this.closeModal('userModal');
  this.renderUsersTable();
  this.populatePermissionUserSelect();
  this.showToast('Utilisateur enregistré', 'success');
}

toggleUserStatus(userId) {
  if (!this.requireAdminOnly()) return;
  const users = this.getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  users[idx].status = (users[idx].status === 'active' ? 'disabled' : 'active');
  this.saveUsers(users);
  this.renderUsersTable();
}

confirmDeleteUser(userId) {
  if (!this.requireAdminOnly()) return;
  const modal = document.getElementById('confirmModal');
  const msg = document.getElementById('confirmMessage');
  const okBtn = document.getElementById('confirmOkBtn');
  if (!modal || !msg || !okBtn) return;

  msg.textContent = 'Supprimer définitivement cet utilisateur ? Cette action est irréversible.';
  modal.classList.remove('hidden');

  // Remove previous listeners
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  newOk.addEventListener('click', () => {
    const users = this.getUsers();
    const u = users.find(x => x.id === userId);
    const username = u?.username;
    const filtered = users.filter(u => u.id !== userId);
    this.saveUsers(filtered);
    // also delete permissions
    const perms = this.getPermissions();
    if (username && perms[username]) { delete perms[username]; this.savePermissions(perms); }
    this.closeModal('confirmModal');
    this.renderUsersTable();
    this.populatePermissionUserSelect();
    this.showToast('Utilisateur supprimé', 'success');
  });
}

// Permissions UI
populatePermissionUserSelect() {
  const sel = document.getElementById('permissionUserSelect');
  if (!sel) return;
  const users = this.getUsers();
  const currentValue = sel.value;
  sel.innerHTML = '<option value="">Sélectionnez un utilisateur</option>' + users.map(u => (
    `<option value="${u.username}">${u.full_name} (${u.username})</option>`
  )).join('');
  if (users.some(u => u.username === currentValue)) {
    sel.value = currentValue;
  }
}
renderPermissionsForSelectedUser() {
  const sel = document.getElementById('permissionUserSelect');
  const username = sel?.value || '';
  const allChecks = document.querySelectorAll('#permissionsTree input[type="checkbox"][data-perm]');
  allChecks.forEach(ch => ch.checked = false);
  if (!username) return;
  const perms = this.getPermissions();
  const uperms = perms[username] || {};
  allChecks.forEach(ch => {
    const key = ch.getAttribute('data-perm');
    ch.checked = !!uperms[key];
  });
}
saveSelectedPermissions() {
  if (!this.requireAdminOnly()) return;
  const sel = document.getElementById('permissionUserSelect');
  const username = sel?.value || '';
  if (!username) { alert('Veuillez choisir un utilisateur'); return; }
  const perms = this.getPermissions();
  const updated = {};
  document.querySelectorAll('#permissionsTree input[type="checkbox"][data-perm]').forEach(ch => {
    const key = ch.getAttribute('data-perm');
    updated[key] = !!ch.checked;
  });
  perms[username] = updated;
  this.savePermissions(perms);
  this.showToast('Permissions enregistrées', 'success');

  // If current user was updated, enforce immediately
  if (this.currentUser && this.currentUser.username === username) {
    this.enforcePermissionsUI();
  }
}

// Enforce visibility according to permissions for CURRENT USER
enforcePermissionsUI() {
  // Dashboard visibility
  const dashNavBtn = document.querySelector('.nav-btn[data-section="dashboard"]');
  if (dashNavBtn) dashNavBtn.style.display = this.hasPermission('dashboard.view') ? 'inline-flex' : 'none';

  // Missions buttons
  const newMissionBtn = document.getElementById('newMissionBtn');
  if (newMissionBtn) newMissionBtn.style.display = this.hasPermission('missions.create') ? 'inline-flex' : 'none';

  // PDF print button (fiche modal / operations export)
  const printFiche = document.getElementById('printFiche');
  if (printFiche) printFiche.style.display = this.hasPermission('missions.export_pdf') ? 'inline-flex' : 'none';

  const exportSelectedOperations = document.getElementById('exportSelectedOperations');
  if (exportSelectedOperations) exportSelectedOperations.style.display = this.hasPermission('missions.export_pdf') ? 'inline-flex' : 'none';

  // Fleet buttons
  const newTruckBtn = document.getElementById('newTruckBtn');
  if (newTruckBtn) newTruckBtn.style.display = this.hasPermission('flotte.add_truck') ? 'inline-flex' : 'none';

  // Reports
  const reportsNav = document.querySelector('.nav-btn[data-section="reports"]');
  if (reportsNav) reportsNav.style.display = this.hasPermission('reports.view') ? 'inline-flex' : 'none';

  const exportExcelBtn = document.getElementById('exportExcelBtn');
  if (exportExcelBtn) exportExcelBtn.style.display = this.hasPermission('reports.export_excel') ? 'inline-flex' : 'none';

  // Smart Assignment buttons on cards (missions overview) are rendered conditionally; guard in code paths too
  // Operation Modify drawer is guarded in handler
}

// ===== BACKUP & RESTORE =====
getAllAppData() {
  return {
    users: this.getUsers(),
    permissions: this.getPermissions(),
    clients: this.getClients ? this.getClients() : [],
    trucks: this.getTrucks ? this.getTrucks() : [],
    drivers: this.getDrivers ? this.getDrivers() : [],
    missions: this.getMissions ? this.getMissions() : [],
    operations: this.getOperations ? this.getOperations() : [],
    notifications: JSON.parse(localStorage.getItem('transport_notifications') || '[]'),
    activities: JSON.parse(localStorage.getItem('transport_activities') || '[]'),
    event_history: JSON.parse(localStorage.getItem('transport_event_history') || '[]')
  };
}
setAllAppData(payload) {
  if (payload.users) this.saveUsers(payload.users);
  if (payload.permissions) this.savePermissions(payload.permissions);
  if (payload.clients) localStorage.setItem('transport_clients', JSON.stringify(payload.clients));
  if (payload.trucks) localStorage.setItem('transport_trucks', JSON.stringify(payload.trucks));
  if (payload.drivers) localStorage.setItem('transport_drivers', JSON.stringify(payload.drivers));
  if (payload.missions) localStorage.setItem('transport_missions', JSON.stringify(payload.missions));
  if (payload.operations) localStorage.setItem('transport_operations', JSON.stringify(payload.operations));
  if (payload.notifications) localStorage.setItem('transport_notifications', JSON.stringify(payload.notifications));
  if (payload.activities) localStorage.setItem('transport_activities', JSON.stringify(payload.activities));
  if (payload.event_history) localStorage.setItem('transport_event_history', JSON.stringify(payload.event_history));
}

downloadBackup() {
  if (!this.requireAdminOnly()) return;
  if (!this.hasPermission('settings.backup_restore')) { alert('Permission Backup/Restauration requise'); return; }
  const data = this.getAllAppData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  localStorage.setItem('transport_last_backup_at', new Date().toISOString());
  this.updateBackupIndicators();
  this.showToast('Sauvegarde téléchargée', 'success');
}

handleRestoreFile(e) {
  if (!this.requireAdminOnly()) return;
  if (!this.hasPermission('settings.backup_restore')) { alert('Permission Backup/Restauration requise'); return; }
  
  // FIX: Access the first file from the FileList, not the FileList itself
  const file = e.target.files && e.target.files[0];
  if (!file) {
    alert('Aucun fichier sélectionné');
    return;
  }
  
  // Confirm destructive action
  const modal = document.getElementById('confirmModal');
  const msg = document.getElementById('confirmMessage');
  const okBtn = document.getElementById('confirmOkBtn');
  msg.textContent = 'Restaurer depuis ce fichier ? Toutes les données actuelles seront remplacées.';
  modal.classList.remove('hidden');
  
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  
  newOk.addEventListener('click', () => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        this.setAllAppData(payload);
        
        // bump permissions version reset to force re-config if payload contains perms
        if (payload.permissions) {
          this.setPermissionsVersion(this.PERMISSIONS_VERSION);
        }
        
        this.closeModal('confirmModal');
        this.showToast('Restauration terminée', 'success');
        
        // reload UI
        this.loadSectionData(this.currentSection);
        this.updateBackupIndicators();
        
      } catch (err) {
        console.error('Restore error:', err);
        alert('Fichier invalide ou corrompu. Vérifiez que c\'est bien un fichier de sauvegarde.');
      }
    };
    
    reader.onerror = () => {
      alert('Erreur lors de la lecture du fichier');
    };
    
    // FIX: Now 'file' is the actual File object, not FileList
    reader.readAsText(file);
  });
}

// Auto-backup scheduling and indicators
scheduleAutoBackup() {
  // run countdown tick every minute
  setInterval(() => this.updateBackupIndicators(), 60 * 1000);

  // run backup every BACKUP_INTERVAL_MS (soft scheduler)
  setInterval(() => {
    // Only admin sessions will trigger an automatic backup file download-less record
    const nowIso = new Date().toISOString();
    localStorage.setItem('transport_last_backup_at', nowIso);
    // for auto backup, we store a JSON snapshot (rotating) in localStorage to avoid forced downloads
    localStorage.setItem('transport_auto_backup', JSON.stringify(this.getAllAppData()));
    this.updateBackupIndicators();
  }, this.BACKUP_INTERVAL_MS);
}

updateBackupIndicators() {
  const lastEl = document.getElementById('lastBackupInfo');
  const nextEl = document.getElementById('nextBackupInfo');
  const lastAt = localStorage.getItem('transport_last_backup_at');

  if (lastEl) {
    lastEl.textContent = `Dernière sauvegarde: ${lastAt ? this.formatAlgeriaDateTime(lastAt) : '--'}`;
  }
  if (nextEl) {
    // show time remaining until next 8h tick from lastAt or from now if never
    const lastTime = lastAt ? new Date(lastAt).getTime() : Date.now();
    const nextTime = lastTime + this.BACKUP_INTERVAL_MS;
    const remaining = Math.max(0, nextTime - Date.now());
    const hrs = Math.floor(remaining / (1000*60*60));
    const mins = Math.floor((remaining % (1000*60*60)) / (1000*60));
    nextEl.textContent = `Prochaine dans: ${hrs}h ${String(mins).padStart(2,'0')}m`;
  }
}

// ========================================
// PRIMAVERA-STYLE GANTT TIMELINE FUNCTIONS
// ========================================

initializeGanttTimeline() {
    this.ganttSettings = {
        zoomLevel: 1,
        currentPeriod: 5, // days
        hourWidth: 60, // pixels per hour
        startDate: new Date(),
        endDate: new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)), // 5 days ahead
        isFullscreen: false
    };
    
    // Set up event listeners when DOM is ready
    setTimeout(() => {
        this.setupGanttEventListeners();
		// Add this line at the very end of initializeGanttTimeline()
this.setupOperationChangeMonitoring();

    }, 100);
}

setupGanttEventListeners() {
    try {
        const ganttZoomIn = document.getElementById('ganttZoomIn');
        const ganttZoomOut = document.getElementById('ganttZoomOut');
        const ganttToday = document.getElementById('ganttToday');
        const ganttPeriodSelect = document.getElementById('ganttPeriodSelect');
        const ganttFullscreen = document.getElementById('ganttFullscreen');
        
        if (ganttZoomIn) {
            ganttZoomIn.addEventListener('click', () => this.zoomGantt(1.2));
        }
        if (ganttZoomOut) {
            ganttZoomOut.addEventListener('click', () => this.zoomGantt(0.8));
        }
        if (ganttToday) {
            ganttToday.addEventListener('click', () => this.centerGanttOnToday());
        }
        if (ganttPeriodSelect) {
            ganttPeriodSelect.addEventListener('change', (e) => this.changeGanttPeriod(e.target.value));
        }
        if (ganttFullscreen) {
            ganttFullscreen.addEventListener('click', () => this.toggleGanttFullscreen());
        }
        // FIND this section in setupGanttEventListeners():
if (ganttToday) {
    ganttToday.addEventListener('click', () => this.centerGanttOnToday());
}

// ADD this right after the ganttToday listener:
const ganttCurrent = document.getElementById('ganttCurrent');
if (ganttCurrent) {
    ganttCurrent.addEventListener('click', () => this.centerGanttOnCurrent());
}

        // Set up scroll synchronization
        this.setupGanttScrollSync();
        
    } catch (error) {
        console.error('Error setting up Gantt event listeners:', error);
    }
}

loadGanttTimeline() {
    try {
        const ganttContainer = document.getElementById('ganttContainer');
        if (!ganttContainer) {
            console.warn('Gantt container not found');
            return;
        }
        
        // VALIDATION STEP
        if (!this.validateAndFixGanttTimeline()) {
            console.error('Gantt validation failed - attempting to fix...');
            this.initializeGanttTimeline();
        }
        
        // Show loading state
        this.showGanttLoading();
        
        // Get data
        const trucks = this.getTrucks();
        const clients = this.getClients();
        const operations = this.getOperations();
        
        // Calculate timeline data
        const timelineData = this.calculateGanttData(trucks, clients, operations);
        
        // Render the timeline
        this.renderGanttTimeline(timelineData);
        
        // Update icons
        setTimeout(() => {
            this.initializeLucideIcons();
        }, 100);
        
        console.log('✅ Gantt Timeline loaded successfully');
        
    } catch (error) {
        console.error('Error loading Gantt timeline:', error);
        this.showGanttError('Erreur lors du chargement du planning Gantt');
    }
}

calculateGanttData(trucks, clients, operations) {
    const data = {
        trucks: [],
        timeColumns: [],
        currentTime: new Date()
    };
    
    // Generate time columns
    const startTime = new Date(this.ganttSettings.startDate);
    const endTime = new Date(this.ganttSettings.endDate);
    const currentTime = new Date();
    
    for (let time = new Date(startTime); time <= endTime; time.setHours(time.getHours() + 1)) {
        data.timeColumns.push({
            timestamp: new Date(time),
            isCurrent: Math.abs(time - currentTime) < 60 * 60 * 1000, // within 1 hour
            dayLabel: this.formatGanttDate(time),
            hourLabel: this.formatGanttHour(time)
        });
    }
    
    // Process each truck
    trucks.forEach(truck => {
        const truckData = {
            truck: truck,
            clients: [],
            rotationEnabled: true, // Default enabled
            rotationWarning: false,
            lastBiskraTime: null
        };
        
        // Check 48h rotation rule
        const rotationCheck = this.check48HourRotation(truck, operations);
        truckData.rotationWarning = rotationCheck.hasWarning;
        truckData.lastBiskraTime = rotationCheck.lastBiskraTime;
        truckData.deadlineTime = rotationCheck.deadlineTime;
        
        // Add all clients as rows (even without operations)
        clients.forEach(client => {
            const clientData = {
                client: client,
                operations: []
            };
            
            // Find operations for this truck-client combination
            const truckOperations = operations.filter(op => 
                op.assigned_truck_id === truck.id && 
                op.client_name === client.name &&
                op.estimated_departure
            );
            
            truckOperations.forEach(operation => {
                const opData = this.calculateOperationBarData(operation, data.timeColumns);
                if (opData) {
                    clientData.operations.push(opData);
                }
            });
            
            truckData.clients.push(clientData);
        });
        
        data.trucks.push(truckData);
    });
    
    return data;
}

calculateOperationBarData(operation, timeColumns) {
    try {
        const startTime = new Date(operation.estimated_departure);
        const endTime = operation.estimated_arrival ? new Date(operation.estimated_arrival) : new Date(startTime.getTime() + 4 * 60 * 60 * 1000);
        
        // Find start and end positions
        let startColumn = -1;
        let endColumn = -1;
        
        timeColumns.forEach((col, index) => {
            if (startColumn === -1 && col.timestamp >= startTime) {
                startColumn = index;
            }
            if (col.timestamp <= endTime) {
                endColumn = index;
            }
        });
        
        if (startColumn === -1 || endColumn === -1 || endColumn <= startColumn) {
            return null;
        }
        
        return {
            operation: operation,
            startColumn: startColumn,
            endColumn: endColumn,
            width: (endColumn - startColumn + 1) * this.ganttSettings.hourWidth,
            left: startColumn * this.ganttSettings.hourWidth,
            departureWilaya: operation.departure_location || 'Départ',
            arrivalWilaya: operation.arrival_location || 'Arrivée',
            status: this.getOperationBarStatus(operation),
            tooltipData: this.generateOperationTooltip(operation)
        };
    } catch (error) {
        console.error('Error calculating operation bar data:', error);
        return null;
    }
}

// COMPLETELY REWRITTEN: Simple 48h math from Biskra departure to last arrival
check48HourRotation(truck, operations) {
    const result = {
        hasWarning: false,
        lastBiskraTime: null,
        deadlineTime: null,
        hoursRemaining: 48, // Default to full 48h
        status: 'ok',
        shouldFlash: false,
        cycleOperations: [],
        elapsedHours: 0
    };
    
    try {
        // Check if 48h rule is enabled for this truck
        const truckSettings = this.getTruck48hSettings();
        if (!truckSettings[truck.id] || !truckSettings[truck.id].enabled) {
            result.status = 'disabled';
            return result;
        }
        
        // Get all operations for this truck, sorted by estimated departure
        const truckOperations = operations.filter(op => 
            op.assigned_truck_id === truck.id && 
            op.estimated_departure &&
            op.status !== 'annulee'  // Exclude cancelled operations
        ).sort((a, b) => new Date(a.estimated_departure) - new Date(b.estimated_departure));
        
        if (truckOperations.length === 0) {
            return result; // No operations = full 48h available
        }
        
        // STEP 1: Find the LAST departure from Biskra OR planned return to Biskra
        let activeCountdownStart = null;
        let cycleStartIndex = -1;
        
        // Look for most recent departure from Biskra
        for (let i = truckOperations.length - 1; i >= 0; i--) {
            const op = truckOperations[i];
            if (op.departure_location === '07-Biskra') {
                activeCountdownStart = new Date(op.estimated_departure);
                cycleStartIndex = i;
                break;
            }
        }
        
        // IMPORTANT: Check for planned return to Biskra that should RESET countdown
        for (let i = truckOperations.length - 1; i >= 0; i--) {
            const op = truckOperations[i];
            if (op.arrival_location === '07-Biskra' && op.estimated_arrival) {
                const returnTime = new Date(op.estimated_arrival);
                // If this return is more recent than our last departure, reset countdown
                if (!activeCountdownStart || returnTime > activeCountdownStart) {
                    activeCountdownStart = returnTime;
                    cycleStartIndex = i + 1; // Start counting from AFTER the return
                    console.log(`🔄 COUNTDOWN RESET: Truck ${truck.registration} planned to return to Biskra at ${returnTime.toLocaleString()}`);
                }
            }
        }
        
        // If no Biskra interaction found, no 48h rule applies
        if (!activeCountdownStart || cycleStartIndex === -1) {
            console.log(`No Biskra interaction found for truck ${truck.registration}`);
            return result;
        }
        
        result.lastBiskraTime = activeCountdownStart;
        
        // STEP 2: Find operations after the countdown start point
        const cycleOperations = truckOperations.slice(Math.max(0, cycleStartIndex));
        result.cycleOperations = cycleOperations;
        
        if (cycleOperations.length === 0) {
            // Just returned to Biskra, countdown resets to full 48h
            return result;
        }
        
        // STEP 3: Find the LAST arrival time in the current cycle
        let lastArrivalTime = activeCountdownStart; // Start from countdown reset point
        
        // Look for the latest estimated arrival in the cycle
        cycleOperations.forEach(op => {
            if (op.estimated_arrival) {
                const arrivalTime = new Date(op.estimated_arrival);
                if (arrivalTime > lastArrivalTime) {
                    lastArrivalTime = arrivalTime;
                }
            }
        });
        
        // If no future arrivals, use current time or last departure + 4h
        if (lastArrivalTime === activeCountdownStart && cycleOperations.length > 0) {
            const lastOp = cycleOperations[cycleOperations.length - 1];
            const lastDepTime = new Date(lastOp.estimated_departure);
            if (lastDepTime > activeCountdownStart) {
                lastArrivalTime = new Date(lastDepTime.getTime() + (4 * 60 * 60 * 1000));
            }
        }
        
        result.deadlineTime = new Date(activeCountdownStart.getTime() + (48 * 60 * 60 * 1000)); // Full 48h from reset point
        
        // STEP 4: Calculate elapsed time from countdown start to now or last arrival
        const now = new Date();
        const effectiveEndTime = lastArrivalTime > now ? lastArrivalTime : now;
        
        const elapsedMs = effectiveEndTime - activeCountdownStart;
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        result.elapsedHours = elapsedHours;
        
        // STEP 5: Calculate remaining time = 48 - elapsed
        const rawRemaining = 48 - elapsedHours;
        result.hoursRemaining = Math.max(0, rawRemaining);
        
        // STEP 6: Determine status based on remaining time (CHANGED: 12h instead of 6h)
        if (rawRemaining <= 0) {
            result.status = 'overdue';
            result.hasWarning = true;
            result.shouldFlash = true;
        } else if (rawRemaining <= 2) {
            result.status = 'critical';
            result.hasWarning = true;
            result.shouldFlash = true;
        } else if (rawRemaining <= 12) {  // CHANGED: from 6 to 12 hours
            result.status = 'warning';
            result.hasWarning = true;
        } else {
            result.status = 'ok';
        }
        
        console.log(`🔍 48h Check for ${truck.registration}:`, {
            countdownStart: activeCountdownStart.toLocaleString(),
            lastActivity: effectiveEndTime.toLocaleString(),
            deadline: result.deadlineTime.toLocaleString(),
            elapsedHours: elapsedHours.toFixed(1),
            remainingHours: result.hoursRemaining.toFixed(1),
            status: result.status
        });
        
    } catch (error) {
        console.error('Error in 48h rotation check:', error);
        result.status = 'error';
    }
    
    return result;
}
// Auto-refresh timeline when operations change
setupOperationChangeMonitoring() {
    // Monitor for operation updates every 30 seconds
    if (this.operationMonitorInterval) {
        clearInterval(this.operationMonitorInterval);
    }
    
    this.operationMonitorInterval = setInterval(() => {
        const currentOperations = this.getOperations();
        const operationStates = currentOperations.map(op => ({
            id: op.id,
            status: op.status,
            truck: op.assigned_truck_id,
            arrival: op.arrival_location
        }));
        
        // Compare with stored states
        if (this.lastOperationStates) {
            const changes = operationStates.filter(current => {
                const previous = this.lastOperationStates.find(prev => prev.id === current.id);
                return !previous || 
                       previous.status !== current.status ||
                       previous.truck !== current.truck ||
                       previous.arrival !== current.arrival;
            });
            
            if (changes.length > 0) {
                console.log('🔄 Operation changes detected:', changes);
                this.loadGanttTimeline();
            }
        }
        
        this.lastOperationStates = operationStates;
    }, 30000); // Check every 30 seconds
}

// NEW: Find current operation cycle for a truck
findCurrentOperationCycle(truckOperations) {
    const now = new Date();
    const cycle = [];
    
    // Find the most recent departure from Biskra or current ongoing operations
    let cycleStart = null;
    
    for (let i = 0; i < truckOperations.length; i++) {
        const op = truckOperations[i];
        const opStart = new Date(op.estimated_departure);
        
        // If operation is in future or currently active
        if (opStart >= now || ['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)) {
            // Check if this starts a new cycle (departure from Biskra)
            if (op.departure_location === '07-Biskra') {
                cycleStart = i;
            }
            break;
        }
    }
    
    if (cycleStart === null) {
        // Look for any ongoing operations
        for (let i = truckOperations.length - 1; i >= 0; i--) {
            const op = truckOperations[i];
            if (['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)) {
                cycleStart = i;
                break;
            }
        }
    }
    
    if (cycleStart === null) return [];
    
    // Build cycle from start until return to Biskra or end of operations
    for (let i = cycleStart; i < truckOperations.length; i++) {
        const op = truckOperations[i];
        cycle.push(op);
        
        // Stop if we return to Biskra
        if (op.arrival_location === '07-Biskra' && op.estimated_arrival) {
            break;
        }
    }
    
    return cycle;
}

// NEW: Get/Set truck 48h settings
getTruck48hSettings() {
    try {
        return JSON.parse(localStorage.getItem('truck_48h_settings') || '{}');
    } catch {
        return {};
    }
}

saveTruck48hSettings(settings) {
    localStorage.setItem('truck_48h_settings', JSON.stringify(settings));
}

// NEW: Toggle 48h rule for a truck
toggleTruck48hRule(truckId, enabled) {
    const settings = this.getTruck48hSettings();
    if (!settings[truckId]) {
        settings[truckId] = {};
    }
    settings[truckId].enabled = enabled;
    this.saveTruck48hSettings(settings);
    
    // Refresh Gantt timeline
    this.loadGanttTimeline();
}

// ADD THIS NEW FUNCTION TO ENSURE EVERYTHING WORKS PERFECTLY
validateAndFixGanttTimeline() {
    try {
        console.log('🔍 Validating Gantt Timeline...');
        
        // 1. Check required DOM elements
        const requiredElements = [
            'ganttContainer',
            'ganttLeftContent', 
            'ganttTimelineHeader',
            'ganttTimelineContent',
            'ganttTableWrapper'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('❌ Missing DOM elements:', missingElements);
            return false;
        }
        
        // 2. Validate data
        const trucks = this.getTrucks();
        const operations = this.getOperations();
        const clients = this.getClients();
        
        if (!trucks || trucks.length === 0) {
            console.warn('⚠️ No trucks found');
        }
        if (!operations || operations.length === 0) {
            console.warn('⚠️ No operations found');  
        }
        if (!clients || clients.length === 0) {
            console.warn('⚠️ No clients found');
        }
        
        // 3. Validate settings
        if (!this.ganttSettings) {
            console.error('❌ Gantt settings not initialized');
            this.initializeGanttTimeline();
        }
        
        // 4. Check timeline calculations
        const timelineData = this.calculateGanttData(trucks, clients, operations);
        if (!timelineData || !timelineData.timeColumns || timelineData.timeColumns.length === 0) {
            console.error('❌ Timeline data calculation failed');
            return false;
        }
        
        // 5. Verify timeline width consistency
        const expectedWidth = timelineData.timeColumns.length * this.ganttSettings.hourWidth;
        console.log(`📏 Timeline width: ${expectedWidth}px for ${timelineData.timeColumns.length} columns`);
        
        // 6. Count unique clients per truck (should never duplicate)
        timelineData.trucks.forEach((truckData, truckIndex) => {
            const clientIds = truckData.clients.map(c => c.client.id);
            const uniqueClientIds = [...new Set(clientIds)];
            
            if (clientIds.length !== uniqueClientIds.length) {
                console.error(`❌ Duplicate clients found for truck ${truckData.truck.registration}`);
                return false;
            }
        });
        
        // 7. Validate 48h rotation logic
        trucks.forEach(truck => {
            const rotationCheck = this.check48HourRotation(truck, operations);
            console.log(`🔄 Truck ${truck.registration} 48h status: ${rotationCheck.status}`);
        });
        
        console.log('✅ Gantt Timeline validation completed successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Gantt Timeline validation failed:', error);
        return false;
    }
}

renderGanttTimeline(data) {
    try {
        // Render left panel (trucks and clients)
        this.renderGanttLeftPanel(data);
        
        // Render timeline header
        this.renderGanttTimelineHeader(data.timeColumns);
        
        // Render timeline content
        this.renderGanttTimelineContent(data);
        
        // Update scrollbar widths
        this.updateGanttScrollbars(data.timeColumns.length * this.ganttSettings.hourWidth);
        
        // Add current time line
        this.addCurrentTimeLine(data.timeColumns);
        
    } catch (error) {
        console.error('Error rendering Gantt timeline:', error);
    }
}

renderGanttLeftPanel(data) {
    const leftContent = document.getElementById('ganttLeftContent');
    if (!leftContent) return;
    
    let html = '';
    
    data.trucks.forEach(truckData => {
        // Get 48h settings for this truck
        const truckSettings = this.getTruck48hSettings();
        const is48hEnabled = truckSettings[truckData.truck.id]?.enabled || false;
        
        // Check if truck has departed from Biskra and needs countdown
        const biskraCountdown = this.calculateBiskraCountdown(truckData.truck);
        
        // Determine if truck should flash
        const shouldFlash = biskraCountdown.shouldFlash && is48hEnabled;
        
        // Truck header row with countdown indicator and checkbox
        html += `
            <div class="gantt-truck-row ${shouldFlash ? 'truck-flash-alert' : ''}">
                <div class="gantt-truck-header">
                    <div class="truck-info">
                        <div class="truck-name">${truckData.truck.brand} ${truckData.truck.model}</div>
                        <div class="truck-status">${truckData.truck.registration} - ${this.getTruckStatusDisplay(truckData.truck)}</div>
                        ${biskraCountdown.show && is48hEnabled ? `
                            <div class="biskra-countdown ${biskraCountdown.urgency}" 
                                 data-truck-id="${truckData.truck.id}"
                                 title="Temps restant dans le cycle de 48h">
                                🕐 ${biskraCountdown.display}
                            </div>
                        ` : ''}
                    </div>
                    <div class="rotation-control">
                        <label class="checkbox-wrapper" title="Activer la règle des 48h pour ce camion">
                            <input type="checkbox" class="rotation-checkbox" 
                                   data-truck-id="${truckData.truck.id}" 
                                   ${is48hEnabled ? 'checked' : ''}
                                   onchange="app.toggleTruck48hRule(${truckData.truck.id}, this.checked)">
                            <span class="checkbox-label">48h</span>
                        </label>
                    </div>
                </div>
        `;
        
        // Client rows remain the same...
        truckData.clients.forEach(clientData => {
            html += `
                <div class="gantt-client-row" data-truck-id="${truckData.truck.id}" data-client-id="${clientData.client.id}">
                    <div class="client-info">${clientData.client.name}</div>
                    <div class="rotation-status">
                        ${truckData.rotationWarning && is48hEnabled ? '<div class="rotation-warning">⚠</div>' : ''}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    leftContent.innerHTML = html;
    
    // Start countdown updates for Biskra timers
    this.startBiskraCountdownUpdates();
}

// NEW: Calculate Biskra countdown for trucks
// FIXED: Simple countdown display with correct math
calculateBiskraCountdown(truck) {
    const operations = this.getOperations();
    const rotationCheck = this.check48HourRotation(truck, operations);
    
    // If 48h rule is disabled
    if (rotationCheck.status === 'disabled') {
        return { show: false };
    }
    
    // If no active cycle
    if (rotationCheck.cycleOperations.length === 0 || !rotationCheck.lastBiskraTime) {
        return { show: false };
    }
    
    const hoursRemaining = rotationCheck.hoursRemaining;
    const elapsedHours = rotationCheck.elapsedHours;
    let display, urgency;
    
    // Handle overdue case
    if (rotationCheck.status === 'overdue') {
        const overdue = elapsedHours - 48;
        display = `DÉPASSÉ +${overdue.toFixed(1)}h!`;
        urgency = 'critical';
    } else if (hoursRemaining < 1) {
        // Less than 1 hour remaining
        const minutesRemaining = Math.floor(hoursRemaining * 60);
        display = `${minutesRemaining}min restantes`;
        urgency = 'critical';
    } else {
        // Show hours and minutes remaining
        const wholeHours = Math.floor(hoursRemaining);
        const minutes = Math.floor((hoursRemaining % 1) * 60);
        display = `${wholeHours}h ${minutes}min restantes`;
        
        if (rotationCheck.status === 'critical') {
            urgency = 'critical';
        } else if (rotationCheck.status === 'warning') {
            urgency = 'warning';
        } else {
            urgency = 'normal';
        }
    }
    
    return {
        show: true,
        display: display,
        urgency: urgency,
        shouldFlash: rotationCheck.shouldFlash,
        hoursRemaining: hoursRemaining,
        elapsedHours: elapsedHours,
        status: rotationCheck.status
    };
}

// NEW: Live countdown updates
// FIXED: Proper countdown updates with console debugging
startBiskraCountdownUpdates() {
    // Clear any existing interval
    if (this.biskraCountdownInterval) {
        clearInterval(this.biskraCountdownInterval);
    }
    
    console.log('🔄 Starting 48h countdown updates...');
    
    this.biskraCountdownInterval = setInterval(() => {
        try {
            const countdownElements = document.querySelectorAll('.biskra-countdown');
            console.log(`🕐 Updating ${countdownElements.length} countdown timers`);
            
            countdownElements.forEach(element => {
                const truckId = parseInt(element.dataset.truckId);
                const truck = this.getTrucks().find(t => t.id === truckId);
                
                if (truck) {
                    const countdown = this.calculateBiskraCountdown(truck);
                    
                    if (countdown.show) {
                        element.textContent = `🕐 ${countdown.display}`;
                        element.className = `biskra-countdown ${countdown.urgency}`;
                        
                        // Update parent row flashing
                        const truckRow = element.closest('.gantt-truck-row');
                        if (truckRow) {
                            if (countdown.shouldFlash) {
                                truckRow.classList.add('truck-flash-alert');
                            } else {
                                truckRow.classList.remove('truck-flash-alert');
                            }
                        }
                        
                        console.log(`📊 ${truck.registration}: ${countdown.display} (elapsed: ${countdown.elapsedHours?.toFixed(1)}h)`);
                    } else {
                        element.style.display = 'none';
                    }
                }
            });
        } catch (error) {
            console.error('❌ Error updating countdowns:', error);
        }
    }, 30000); // Update every 30 seconds
}

renderGanttTimelineHeader(timeColumns) {
    const timelineHeader = document.getElementById('ganttTimelineHeader');
    if (!timelineHeader) return;
    
    // Calculate total width to match content exactly
    const totalWidth = timeColumns.length * this.ganttSettings.hourWidth;
    
    let html = `<div class="gantt-timeline-axis" style="width: ${totalWidth}px; min-width: ${totalWidth}px;">`;
    
    timeColumns.forEach((col, index) => {
        html += `
            <div class="gantt-time-column ${col.isCurrent ? 'current-time' : ''}" 
                 style="width: ${this.ganttSettings.hourWidth}px; left: ${index * this.ganttSettings.hourWidth}px; position: absolute;">
                <div class="time-day">${col.dayLabel}</div>
                <div class="time-hour">${col.hourLabel}</div>
            </div>
        `;
    });
    
    html += '</div>';
    timelineHeader.innerHTML = html;
    
    // CRITICAL: Force header to match exact content width
    timelineHeader.style.width = totalWidth + 'px';
    timelineHeader.style.minWidth = totalWidth + 'px';
    timelineHeader.style.overflow = 'hidden';
    
    console.log(`📏 Timeline header set to ${totalWidth}px for ${timeColumns.length} columns`);
}


renderGanttTimelineContent(data) {
    const timelineContent = document.getElementById('ganttTimelineContent');
    if (!timelineContent) return;
    
    // Calculate total width to ensure complete drawing
    const totalWidth = data.timeColumns.length * this.ganttSettings.hourWidth;
    
    let html = '';
    
    data.trucks.forEach((truckData, truckIndex) => {
        // Truck header row - FULL WIDTH
        html += `
            <div class="gantt-timeline-truck-row" style="min-width: ${totalWidth}px;">
                <div class="gantt-timeline-truck-header" style="width: ${totalWidth}px; position: relative;">
                    <!-- Grid lines for full width -->
                    <div class="gantt-grid-lines" style="width: ${totalWidth}px;">
                        ${data.timeColumns.map((_, index) => `
                            <div class="grid-line" style="left: ${index * this.ganttSettings.hourWidth}px;"></div>
                        `).join('')}
                    </div>
                    <!-- Deadline bar if applicable -->
                    ${truckData.rotationWarning && truckData.lastBiskraTime && truckData.deadlineTime ? 
                        this.generateDeadlineBar(truckData.lastBiskraTime, truckData.deadlineTime, data.timeColumns) : ''}
                </div>
        `;
        
        // Client rows with operation bars - FULL WIDTH
        truckData.clients.forEach((clientData, clientIndex) => {
            const uniqueClientId = `truck-${truckIndex}-client-${clientIndex}`;
            html += `
                <div class="gantt-timeline-client-row unique-client-row" 
                     style="min-width: ${totalWidth}px;"
                     data-truck-id="${truckData.truck.id}" 
                     data-client-id="${clientData.client.id}"
                     data-unique-id="${uniqueClientId}">
                    <!-- Grid lines for this row -->
                    <div class="gantt-grid-lines" style="width: ${totalWidth}px;">
                        ${data.timeColumns.map((_, index) => `
                            <div class="grid-line" style="left: ${index * this.ganttSettings.hourWidth}px;"></div>
                        `).join('')}
                    </div>
            `;
            
            // Add operation bars
            clientData.operations.forEach(opData => {
                html += this.generateOperationBar(opData);
            });
            
            html += '</div>';
        });
        
        html += '</div>';
    });
    
    // Set the content and ensure proper width
    timelineContent.innerHTML = html;
    timelineContent.style.minWidth = totalWidth + 'px';
    
    // Add tooltip events
    this.setupGanttTooltips();
}

generateOperationBar(opData) {
    return `
        <div class="operation-bar ${opData.status}" 
             style="left: ${opData.left}px; width: ${opData.width}px;"
             data-operation-id="${opData.operation.id}"
             data-tooltip='${JSON.stringify(opData.tooltipData)}'>
            <div class="bar-departure">${opData.departureWilaya}</div>
            <div class="bar-content">${opData.departureWilaya} → ${opData.arrivalWilaya}</div>
            <div class="bar-arrival">${opData.arrivalWilaya}</div>
        </div>
    `;
}

generateDeadlineBar(lastBiskra, deadline, timeColumns) {
    try {
        // The deadline should be exactly 48h from lastBiskra
        const actualDeadline = new Date(lastBiskra.getTime() + (48 * 60 * 60 * 1000));
        
        let startColumn = -1;
        let endColumn = -1;
        
        timeColumns.forEach((col, index) => {
            if (startColumn === -1 && col.timestamp >= lastBiskra) {
                startColumn = index;
            }
            if (col.timestamp <= actualDeadline) {
                endColumn = index;
            }
        });
        
        if (startColumn === -1 || endColumn === -1) return '';
        
        const left = startColumn * this.ganttSettings.hourWidth;
        const width = (endColumn - startColumn + 1) * this.ganttSettings.hourWidth;
        
        // Calculate remaining hours for color coding
        const now = new Date();
        const remainingMs = actualDeadline - now;
        const remainingHours = remainingMs / (1000 * 60 * 60);
        
        let barClass = 'deadline-bar';
        if (remainingHours <= 0) {
            barClass += ' overdue';
        } else if (remainingHours <= 2) {
            barClass += ' critical';
        } else if (remainingHours <= 12) {
            barClass += ' warning';
        }
        
        return `
            <div class="${barClass}" 
                 style="left: ${left}px; width: ${width}px;"
                 title="Délai 48h: ${remainingHours > 0 ? Math.ceil(remainingHours) + 'h restantes' : 'DÉPASSÉ!'} - Échéance: ${this.formatAlgeriaDateTime(actualDeadline)}">
                <div class="deadline-text">48H DEADLINE</div>
                <div class="deadline-timer">${remainingHours > 0 ? Math.ceil(remainingHours) + 'h' : 'DÉPASSÉ!'}</div>
            </div>
        `;
    } catch (error) {
        console.error('Error generating deadline bar:', error);
        return '';
    }
}
// Add this new function to handle operation status changes
handleOperationStatusChange(operationId, newStatus, oldStatus) {
    console.log(`🔄 Operation ${operationId} status changed: ${oldStatus} → ${newStatus}`);
    
    // If operation was cancelled, refresh the timeline to update countdowns
    if (newStatus === 'annulee' || oldStatus === 'annulee') {
        console.log('🔄 Operation cancellation detected - refreshing Gantt timeline');
        setTimeout(() => {
            this.loadGanttTimeline();
        }, 500);
    }
    
    // If operation involves Biskra return and was cancelled/restored, reset countdown
    const operation = this.getOperations().find(op => op.id === operationId);
    if (operation && operation.arrival_location === '07-Biskra') {
        console.log('🏠 Biskra return operation status changed - updating countdown');
        setTimeout(() => {
            this.loadGanttTimeline();
        }, 500);
    }
}

setupGanttTooltips() {
    const operationBars = document.querySelectorAll('.operation-bar');
    const tooltip = document.getElementById('ganttTooltip');
    const tooltipContent = document.getElementById('ganttTooltipContent');
    
    if (!tooltip || !tooltipContent) return;
    
    operationBars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
            try {
                const tooltipData = JSON.parse(e.target.dataset.tooltip);
                tooltipContent.innerHTML = this.formatGanttTooltip(tooltipData);
                tooltip.classList.remove('hidden');
            } catch (error) {
                console.error('Error showing tooltip:', error);
            }
        });
        
        bar.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY - 10) + 'px';
        });
        
        bar.addEventListener('mouseleave', () => {
            tooltip.classList.add('hidden');
        });
    });
}

formatGanttTooltip(data) {
    return `
        <div class="tooltip-row">
            <span class="tooltip-label">Opération:</span>
            <span class="tooltip-value">${data.operationNumber}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Mission:</span>
            <span class="tooltip-value">${data.missionNumber}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Camion:</span>
            <span class="tooltip-value">${data.truckInfo}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Chauffeur:</span>
            <span class="tooltip-value">${data.driverName}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Client:</span>
            <span class="tooltip-value">${data.clientName}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Départ:</span>
            <span class="tooltip-value">${data.departureTime}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Arrivée:</span>
            <span class="tooltip-value">${data.arrivalTime}</span>
        </div>
    `;
}

// Helper functions
formatGanttDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
}

formatGanttHour(date) {
    return date.getHours().toString().padStart(2, '0') + 'h';
}

getOperationBarStatus(operation) {
    switch (operation.status) {
        case 'dechargement_termine':
            return 'completed';
        case 'probleme_signalee':
        case 'annulee':
            return 'problem';
        default:
            return 'active';
    }
}

generateOperationTooltip(operation) {
    const truck = this.getTrucks().find(t => t.id === operation.assigned_truck_id);
    const driver = this.getDrivers().find(d => d.id === operation.assigned_driver_id);
    
    return {
        operationNumber: operation.operation_number || `OP${operation.id}`,
        missionNumber: operation.mission_number || `MSN${operation.mission_id}`,
        truckInfo: truck ? `${truck.brand} ${truck.model} (${truck.registration})` : 'N/A',
        driverName: driver ? driver.name : 'N/A',
        clientName: operation.client_name || 'N/A',
        departureTime: this.formatAlgeriaDateTime(operation.estimated_departure),
        arrivalTime: operation.estimated_arrival ? this.formatAlgeriaDateTime(operation.estimated_arrival) : 'N/A'
    };
}

// Control functions
zoomGantt(factor) {
    this.ganttSettings.zoomLevel *= factor;
    this.ganttSettings.hourWidth = Math.max(30, Math.min(120, 60 * this.ganttSettings.zoomLevel));
    this.loadGanttTimeline();
}

centerGanttOnToday() {
    const now = new Date();
    this.ganttSettings.startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 1 day before
    this.ganttSettings.endDate = new Date(now.getTime() + (this.ganttSettings.currentPeriod * 24 * 60 * 60 * 1000));
    this.loadGanttTimeline();
}
// ADD this new function after centerGanttOnToday()
centerGanttOnCurrent() {
    const now = new Date();
    // Start 1 hour before current time
    this.ganttSettings.startDate = new Date(now.getTime() - (1 * 60 * 60 * 1000)); // 1 hour before
    this.ganttSettings.endDate = new Date(now.getTime() + (this.ganttSettings.currentPeriod * 24 * 60 * 60 * 1000));
    this.loadGanttTimeline();
    
    console.log(`Current view: ${this.ganttSettings.startDate.toLocaleString()} to ${this.ganttSettings.endDate.toLocaleString()}`);
}

changeGanttPeriod(days) {
    const now = new Date();
    const daysNum = parseInt(days);
    this.ganttSettings.currentPeriod = daysNum;
    
    // Start from today (beginning of day)
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let endDate;
    let periodText;
    
    switch(daysNum) {
        case 5:
            // 5 days from today
            endDate = new Date(startDate.getTime() + (5 * 24 * 60 * 60 * 1000));
            periodText = '5 jours';
            break;
        case 7:
            // Current week (from today to end of week)
            const daysUntilSunday = (7 - now.getDay()) % 7;
            endDate = new Date(startDate.getTime() + (daysUntilSunday + 1) * 24 * 60 * 60 * 1000);
            periodText = '1 semaine';
            break;
        case 14:
            // 2 weeks from today
            endDate = new Date(startDate.getTime() + (14 * 24 * 60 * 60 * 1000));
            periodText = '2 semaines';
            break;
        case 30:
            // Current month (from today to end of September)
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
            periodText = 'septembre complet';
            break;
        default:
            endDate = new Date(startDate.getTime() + (daysNum * 24 * 60 * 60 * 1000));
            periodText = `${daysNum} jours`;
    }
    
    this.ganttSettings.startDate = startDate;
    this.ganttSettings.endDate = endDate;
    
    // Update period display
    const periodElement = document.getElementById('ganttPeriod');
    if (periodElement) {
        periodElement.textContent = periodText;
    }
    
    console.log(`Gantt period changed: ${periodText}, Start: ${startDate.toDateString()}, End: ${endDate.toDateString()}`);
    
    this.loadGanttTimeline();
}


toggleGanttFullscreen() {
    const section = document.getElementById('ganttTimelineSection');
    const button = document.getElementById('ganttFullscreen');
    
    if (!section || !button) return;
    
    this.ganttSettings.isFullscreen = !this.ganttSettings.isFullscreen;
    
    if (this.ganttSettings.isFullscreen) {
        section.classList.add('fullscreen');
        button.innerHTML = '<i data-lucide="minimize"></i>';
        button.title = 'Quitter le plein écran';
    } else {
        section.classList.remove('fullscreen');
        button.innerHTML = '<i data-lucide="maximize"></i>';
        button.title = 'Plein écran';
    }
    
    setTimeout(() => {
        this.initializeLucideIcons();
    }, 100);
}

setupGanttScrollSync() {
    const tableWrapper = document.getElementById('ganttTableWrapper');
    const scrollbarTop = document.querySelector('.gantt-scrollbar-top');
    const scrollbarBottom = document.querySelector('.gantt-scrollbar-bottom');
    
    if (!tableWrapper) return;
    
    // Remove bottom scrollbar completely to avoid duplication
    if (scrollbarBottom) {
        scrollbarBottom.style.display = 'none';
    }
    
    // Only keep top scrollbar if it exists
    if (scrollbarTop && tableWrapper) {
        // Sync only top scrollbar with main content
        tableWrapper.addEventListener('scroll', () => {
            scrollbarTop.scrollLeft = tableWrapper.scrollLeft;
        });
        
        scrollbarTop.addEventListener('scroll', () => {
            tableWrapper.scrollLeft = scrollbarTop.scrollLeft;
        });
    }
    
    console.log('Gantt scroll sync setup completed - duplicate scrollbars removed');
}

updateGanttScrollbars(totalWidth) {
    const scrollbarContentTop = document.getElementById('ganttScrollbarTop');
    const scrollbarContentBottom = document.getElementById('ganttScrollbarBottom');
    
    if (scrollbarContentTop) {
        scrollbarContentTop.style.width = totalWidth + 'px';
    }
    if (scrollbarContentBottom) {
        scrollbarContentBottom.style.width = totalWidth + 'px';
    }
}

addCurrentTimeLine(timeColumns) {
    const timelineContent = document.getElementById('ganttTimelineContent');
    const timelineHeader = document.getElementById('ganttTimelineHeader');
    
    if (!timelineContent) return;
    
    const now = new Date();
    let currentPosition = -1;
    
    // Find exact position within the timeline
    for (let i = 0; i < timeColumns.length - 1; i++) {
        const currentCol = timeColumns[i];
        const nextCol = timeColumns[i + 1];
        
        if (now >= currentCol.timestamp && now < nextCol.timestamp) {
            // Calculate exact position within the hour
            const hourProgress = (now - currentCol.timestamp) / (60 * 60 * 1000); // 0 to 1
            currentPosition = (i * this.ganttSettings.hourWidth) + (hourProgress * this.ganttSettings.hourWidth);
            break;
        }
    }
    
    // Remove existing time lines
    document.querySelectorAll('.current-time-line').forEach(el => el.remove());
    
    if (currentPosition >= 0) {
        // Add to timeline content
        const timeLine = document.createElement('div');
        timeLine.className = 'current-time-line';
        timeLine.style.cssText = `
            position: absolute;
            left: ${currentPosition}px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #ff4757;
            z-index: 1000;
            box-shadow: 0 0 4px rgba(255, 71, 87, 0.5);
        `;
        
// FIND this section in addCurrentTimeLine function:
// Add time marker at top
const timeMarker = document.createElement('div');
timeMarker.className = 'current-time-marker';

// REPLACE the timeMarker.style.cssText with this:
timeMarker.style.cssText = `
    position: absolute;
    top: -25px;
    left: -35px;
    width: 70px;
    height: 20px;
    background: linear-gradient(45deg, #ff4757, #ff3742);
    color: white;
    padding: 2px 4px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: bold;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(255, 71, 87, 0.4);
    border: 1px solid #ff2f3a;
`;

        timeMarker.textContent = now.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        timeLine.appendChild(timeMarker);
        timelineContent.appendChild(timeLine);
        
        // Also add to header
        if (timelineHeader) {
            const headerLine = timeLine.cloneNode(true);
            headerLine.style.top = '0';
            headerLine.style.bottom = 'auto';
            headerLine.style.height = '100%';
            timelineHeader.appendChild(headerLine);
        }
        
        console.log(`🕒 Current time line added at position ${currentPosition}px`);
    }
}

showGanttLoading() {
    const leftContent = document.getElementById('ganttLeftContent');
    const timelineContent = document.getElementById('ganttTimelineContent');
    
    if (leftContent) {
        leftContent.innerHTML = '<div class="gantt-loading"><i data-lucide="loader"></i>Chargement du planning...</div>';
    }
    if (timelineContent) {
        timelineContent.innerHTML = '<div class="gantt-loading"><i data-lucide="loader"></i>Génération de la timeline...</div>';
    }
}

showGanttError(message) {
    const leftContent = document.getElementById('ganttLeftContent');
    const timelineContent = document.getElementById('ganttTimelineContent');
    
    const errorHtml = `<div style="text-align: center; padding: 40px; color: var(--color-error);">${message}</div>`;
    
    if (leftContent) {
        leftContent.innerHTML = errorHtml;
    }
    if (timelineContent) {
        timelineContent.innerHTML = errorHtml;
    }
}
// Add this function after your toggleTruckExpansion function
forceTruckEdit(truckId) {
    console.log('Forcing truck edit for ID:', truckId);
    
    // Override any permission checks
    const originalRole = this.currentUser ? this.currentUser.role : null;
    
    // Temporarily set admin permissions
    if (this.currentUser) {
        this.currentUser.role = 'admin';
    }
    
    // Call the edit function
    this.editTruck(truckId);
    
    // Restore original role after a delay
    setTimeout(() => {
        if (this.currentUser && originalRole) {
            this.currentUser.role = originalRole;
        }
    }, 100);
}

// Add this function to create enhanced truck cards with edit buttons
createEnhancedTruckCard(truck) {
    const drivers = this.getDrivers();
    const driver = drivers.find(d => d.id === (truck.permanent_driver_id || truck.assigned_driver_id));
    
    // Get current operation
    const operations = this.getOperations();
    const currentOperation = operations.find(op => 
        op.assigned_truck_id === truck.id && 
        ['en_attente', 'demarree', 'arrivee_site_chargement', 'chargement_termine', 'arrivee_site_destination'].includes(op.status)
    );
    
    // Determine status display
    let statusClass = 'available';
    let statusText = 'Disponible';
    
    if (truck.status === 'busy') {
        statusClass = 'busy';
        statusText = 'En mission';
    } else if (truck.maintenance_status && truck.maintenance_status !== 'operational') {
        statusClass = 'maintenance';
        statusText = 'Maintenance';
    }
    
    return `
        <div class="truck-card enhanced-truck-card" data-truck-id="${truck.id}">
            <!-- Status Banner -->
            <div class="truck-status-banner status-${statusClass}">
                ${statusText}
            </div>
            
            <!-- Truck Header with FORCED Edit Button -->
            <div class="truck-card-header">
                <div class="truck-info-section">
                    <div class="truck-name-display">${truck.brand} ${truck.model}</div>
                    <div class="truck-registration-display">${truck.registration}</div>
                </div>
                
                <!-- FORCED ACTION BUTTONS - ALWAYS VISIBLE -->
                <div class="truck-actions-forced">
                    <button class="btn btn--sm btn--primary force-edit-btn" onclick="app.forceTruckEdit(${truck.id})" title="Modifier le camion">
                        <i data-lucide="edit"></i>
                    </button>
                    <button class="btn btn--sm btn--outline" onclick="app.toggleTruckExpansion(${truck.id})" title="Voir détails">
                        <i data-lucide="eye"></i>
                    </button>
                </div>
            </div>
            
            <!-- Driver Info -->
            <div class="truck-driver-rectangle">
                ${driver ? `
                    <div class="truck-driver-name">Chauffeur: ${driver.name}</div>
                    <div class="truck-driver-phone">${driver.phone || 'Téléphone non renseigné'}</div>
                ` : `
                    <div class="truck-driver-name">Aucun chauffeur assigné</div>
                `}
            </div>
            
            <!-- Current Operation Info -->
            ${currentOperation ? `
                <div class="truck-operation-info current-operation-highlight">
                    <div class="operation-info-title">🚨 Opération en cours</div>
                    <div class="operation-info-details">
                        ${currentOperation.operation_number || currentOperation.id} — ${currentOperation.departure_location} → ${currentOperation.arrival_location}
                    </div>
                    <div class="operation-status">
                        Statut: ${this.getOperationStatusDisplayName(currentOperation.status)}
                    </div>
                </div>
            ` : ''}
            
            <!-- Basic Info -->
            <div class="truck-essential-info">
                <div class="essential-info-item">
                    <span class="essential-info-label">Capacité:</span>
                    <span class="essential-info-value">${truck.capacity} tonnes</span>
                </div>
                <div class="essential-info-item">
                    <span class="essential-info-label">Localisation:</span>
                    <span class="essential-info-value">${truck.current_location}</span>
                </div>
                <div class="essential-info-item">
                    <span class="essential-info-label">Année:</span>
                    <span class="essential-info-value">${truck.year}</span>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="truck-quick-actions">
                <button class="btn btn--sm btn--success force-edit-btn" onclick="app.forceTruckEdit(${truck.id})">
                    <i data-lucide="settings"></i>
                    Modifier
                </button>
                <button class="btn btn--sm btn--outline" onclick="app.toggleTruckExpansion(${truck.id})">
                    <i data-lucide="info"></i>
                    Détails
                </button>
            </div>
            
            <!-- Expanded Details (hidden by default) -->
            <div class="truck-expanded-details" style="display: none;">
                <div class="expanded-details-grid">
                    <div class="expanded-detail-item">
                        <span class="expanded-detail-label">Carte Naftal:</span>
                        <span class="expanded-detail-value">${truck.carte_naftal || 'Non renseignée'}</span>
                    </div>
                    <div class="expanded-detail-item">
                        <span class="expanded-detail-label">GPS:</span>
                        <span class="expanded-detail-value">${truck.gps_location ? 'Configuré' : 'Non configuré'}</span>
                    </div>
                    <div class="expanded-detail-item">
                        <span class="expanded-detail-label">Dernière maintenance:</span>
                        <span class="expanded-detail-value">${truck.last_maintenance ? this.formatAlgeriaDateTime(truck.last_maintenance) : 'Aucune'}</span>
                    </div>
                    <div class="expanded-detail-item">
                        <span class="expanded-detail-label">Prochaine maintenance:</span>
                        <span class="expanded-detail-value">${truck.next_maintenance ? this.formatAlgeriaDateTime(truck.next_maintenance) : 'Non planifiée'}</span>
                    </div>
                </div>
                
                <!-- Force Edit Button in Expanded View -->
                <div class="expanded-actions">
                    <button class="btn btn--primary force-edit-btn" onclick="app.forceTruckEdit(${truck.id})">
                        <i data-lucide="edit"></i>
                        Modifier ce camion
                    </button>
                </div>
                
                <div class="expanded-close-hint">
                    Cliquez à nouveau pour fermer
                </div>
            </div>
        </div>
    `;
}

// Override the truck display function
displayTrucksWithForceEdit() {
    const container = document.getElementById('trucksGrid');
    if (!container) return;
    
    const trucks = this.getTrucks();
    
    if (trucks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h4>Aucun camion enregistré</h4>
                <p>Ajoutez votre premier camion pour commencer.</p>
            </div>
        `;
        return;
    }
    
    // Use the enhanced card creation
    container.innerHTML = trucks.map(truck => this.createEnhancedTruckCard(truck)).join('');
    
    // Initialize Lucide icons
    setTimeout(() => {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 100);
}

}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TransportApp();
});
// 🔄 Enhanced Backup with Online Storage
async function createOnlineBackup() {
    try {
        const backup = await onlineStorage.createBackup();
        console.log('✅ Online backup created:', backup.timestamp);
        
        // Also download local copy
        const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transport_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        return backup;
    } catch (error) {
        console.error('Backup failed:', error);
        alert('Backup failed. Check your internet connection.');
    }
}

// 📤 Auto-backup every 8 hours (as you requested)
setInterval(createOnlineBackup, 8 * 60 * 60 * 1000);

// 🎯 Add backup button to your UI
document.addEventListener('DOMContentLoaded', function() {
    // Add backup button to header actions
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        const backupBtn = document.createElement('button');
        backupBtn.className = 'btn btn--outline';
        backupBtn.innerHTML = '<i data-lucide="cloud-upload"></i> Backup Online';
        backupBtn.onclick = createOnlineBackup;
        headerActions.appendChild(backupBtn);
    }
});
