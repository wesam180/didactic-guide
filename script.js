// RunTracker App - Main JavaScript File with Database Integration

class RunTracker {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.pauseStartTime = null;
        this.totalTime = 0;
        this.distance = 0;
        this.currentActivity = 'running';
        this.gpsWatchId = null;
        this.lastPosition = null;
        this.positions = [];
        this.darkMode = false;
        this.activityGoal = null;
        this.goalType = 'distance';
        this.apiBaseUrl = '/api';
        this.isOnline = navigator.onLine;
        this.pendingOperations = [];
        
        // Timer elements
        this.hoursEl = document.getElementById('hours');
        this.minutesEl = document.getElementById('minutes');
        this.secondsEl = document.getElementById('seconds');
        this.distanceEl = document.getElementById('distance');
        this.paceEl = document.getElementById('pace');
        this.speedEl = document.getElementById('speed');
        this.gpsStatusEl = document.getElementById('gps-status');
        
        // Control buttons
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.stopBtn = document.getElementById('stop-btn');
        
        // Activity buttons
        this.activityBtns = document.querySelectorAll('.activity-btn');
        
        // Manual distance input
        this.manualDistanceInput = document.getElementById('manual-distance');
        this.setDistanceBtn = document.getElementById('set-distance-btn');
        
        // Tab navigation
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // History elements
        this.historyList = document.getElementById('history-list');
        this.clearHistoryBtn = document.getElementById('clear-history-btn');
        
        // Stats elements
        this.totalRunsEl = document.getElementById('total-runs');
        this.totalWalksEl = document.getElementById('total-walks');
        this.totalDistanceEl = document.getElementById('total-distance');
        this.totalTimeEl = document.getElementById('total-time');
        this.avgPaceEl = document.getElementById('avg-pace');
        this.avgSpeedEl = document.getElementById('avg-speed');
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupGPS();
        this.setupOnlineOfflineHandlers();
        await this.checkAndMigrateData();
        await this.loadData();
        this.updateDisplay();
        await this.updateStats();
        await this.updateHistory();
        this.setupDarkMode();
        this.addNewFeatures();
    }
    
    setupOnlineOfflineHandlers() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingOperations();
            this.showNotification('Back online! Syncing data...', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('Offline mode - data will sync when back online', 'warning');
        });
    }
    
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    async checkAndMigrateData() {
        try {
            // Check if there's localStorage data to migrate
            const localStorageActivities = localStorage.getItem('runtracker_activities');
            if (localStorageActivities && this.isOnline) {
                const activities = JSON.parse(localStorageActivities);
                if (activities.length > 0) {
                    await this.migrateLocalStorageData(activities);
                    // Keep localStorage as backup for now
                    localStorage.setItem('runtracker_activities_migrated', 'true');
                }
            }
        } catch (error) {
            console.error('Migration error:', error);
        }
    }
    
    async migrateLocalStorageData(activities) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/migrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ activities })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(`Migrated ${result.migratedCount} activities to database`, 'success');
            }
        } catch (error) {
            console.error('Failed to migrate data:', error);
        }
    }
    
    async apiRequest(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            
            // If offline, queue the operation
            if (!this.isOnline && options.method !== 'GET') {
                this.pendingOperations.push({ endpoint, options });
                this.showNotification('Operation queued for when back online', 'info');
            }
            
            throw error;
        }
    }
    
    async syncPendingOperations() {
        while (this.pendingOperations.length > 0) {
            const operation = this.pendingOperations.shift();
            try {
                await this.apiRequest(operation.endpoint, operation.options);
            } catch (error) {
                console.error('Failed to sync operation:', error);
                // Re-queue if it fails
                this.pendingOperations.unshift(operation);
                break;
            }
        }
        
        if (this.pendingOperations.length === 0) {
            this.showNotification('All data synced successfully!', 'success');
            await this.updateHistory();
            await this.updateStats();
        }
    }
    
    setupEventListeners() {
        // Control buttons
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        
        // Activity type selection
        this.activityBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isRunning && !this.isPaused) {
                    this.selectActivity(e.target.closest('.activity-btn').dataset.type);
                }
            });
        });
        
        // Manual distance input
        this.setDistanceBtn.addEventListener('click', () => this.setManualDistance());
        this.manualDistanceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.setManualDistance();
            }
        });
        
        // Tab navigation
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Clear history
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }
    
    setupGPS() {
        if (navigator.geolocation) {
            this.updateGPSStatus('Checking GPS permission...', '');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.updateGPSStatus('GPS Ready', 'connected');
                    this.displayGPSAccuracy(position.coords.accuracy);
                },
                (error) => {
                    this.handleGPSError(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        } else {
            this.updateGPSStatus('GPS not supported', 'error');
        }
    }
    
    updateGPSStatus(message, status) {
        this.gpsStatusEl.querySelector('span').textContent = `GPS: ${message}`;
        this.gpsStatusEl.className = `gps-status ${status}`;
    }
    
    displayGPSAccuracy(accuracy) {
        const accuracyText = accuracy < 10 ? 'High' : accuracy < 50 ? 'Medium' : 'Low';
        this.updateGPSStatus(`GPS Ready (${accuracyText} accuracy)`, 'connected');
    }
    
    handleGPSError(error) {
        let message = 'GPS Error';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'GPS permission denied';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'GPS position unavailable';
                break;
            case error.TIMEOUT:
                message = 'GPS timeout';
                break;
        }
        this.updateGPSStatus(message, 'error');
    }
    
    selectActivity(type) {
        this.currentActivity = type;
        this.activityBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    }
    
    start() {
        if (this.isPaused) {
            // Resume from pause - add the paused duration to total paused time
            this.pausedTime += Date.now() - this.pauseStartTime;
            this.isPaused = false;
            this.pauseStartTime = null;
        } else {
            // Fresh start
            this.startTime = Date.now();
            this.pausedTime = 0;
            this.distance = 0;
            this.positions = [];
            this.manualDistanceInput.value = '';
        }
        
        this.isRunning = true;
        this.updateButtonStates();
        this.startTimer();
        this.startGPSTracking();
    }
    
    pause() {
        this.isPaused = true;
        this.isRunning = false;
        this.pauseStartTime = Date.now();
        this.updateButtonStates();
        this.stopTimer();
        this.stopGPSTracking();
    }
    
    async stop() {
        if (this.isRunning || this.isPaused) {
            await this.saveActivity();
        }
        
        this.isRunning = false;
        this.isPaused = false;
        this.totalTime = 0;
        this.distance = 0;
        this.positions = [];
        this.pauseStartTime = null;
        this.updateButtonStates();
        this.stopTimer();
        this.stopGPSTracking();
        this.updateDisplay();
    }
    
    updateButtonStates() {
        if (this.isRunning) {
            this.startBtn.classList.add('hidden');
            this.pauseBtn.classList.remove('hidden');
            this.stopBtn.classList.remove('hidden');
        } else if (this.isPaused) {
            this.startBtn.classList.remove('hidden');
            this.pauseBtn.classList.add('hidden');
            this.stopBtn.classList.remove('hidden');
        } else {
            this.startBtn.classList.remove('hidden');
            this.pauseBtn.classList.add('hidden');
            this.stopBtn.classList.add('hidden');
        }
        
        // Disable activity selection during tracking
        this.activityBtns.forEach(btn => {
            btn.style.pointerEvents = (this.isRunning || this.isPaused) ? 'none' : 'auto';
            btn.style.opacity = (this.isRunning || this.isPaused) ? '0.6' : '1';
        });
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.updateDisplay();
            this.checkGoalProgress();
        }, 1000); // Changed from 100ms to 1000ms for better performance
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
    
    startGPSTracking() {
        if (navigator.geolocation) {
            this.gpsWatchId = navigator.geolocation.watchPosition(
                (position) => this.handleGPSPosition(position),
                (error) => this.handleGPSError(error),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
            );
        }
    }
    
    stopGPSTracking() {
        if (this.gpsWatchId) {
            navigator.geolocation.clearWatch(this.gpsWatchId);
            this.gpsWatchId = null;
        }
    }
    
    handleGPSPosition(position) {
        this.updateGPSStatus(`GPS Connected (${position.coords.accuracy.toFixed(0)}m accuracy)`, 'connected');
        
        const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: position.timestamp,
            accuracy: position.coords.accuracy
        };
        
        if (this.lastPosition && this.isRunning) {
            const distanceDelta = this.calculateDistance(this.lastPosition, newPos);
            // Fixed GPS distance filtering - now filters out unrealistic distances
            if (distanceDelta > 0 && distanceDelta < 0.5 && position.coords.accuracy < 100) {
                this.distance += distanceDelta;
            }
        }
        
        this.lastPosition = newPos;
        this.positions.push(newPos);
    }
    
    calculateDistance(pos1, pos2) {
        const R = 6371; // Earth's radius in km
        const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
        const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    getCurrentTime() {
        if (!this.isRunning && !this.isPaused) return 0;
        const now = Date.now();
        let totalElapsed = now - this.startTime - this.pausedTime;
        
        // If currently paused, don't count the current pause period
        if (this.isPaused && this.pauseStartTime) {
            totalElapsed -= (now - this.pauseStartTime);
        }
        
        return Math.floor(totalElapsed / 1000);
    }
    
    updateDisplay() {
        const seconds = this.getCurrentTime();
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        this.hoursEl.textContent = hours.toString().padStart(2, '0');
        this.minutesEl.textContent = minutes.toString().padStart(2, '0');
        this.secondsEl.textContent = secs.toString().padStart(2, '0');
        
        this.distanceEl.textContent = this.distance.toFixed(2);
        
        // Calculate pace and speed
        if (this.distance > 0 && seconds > 0) {
            const timeInHours = seconds / 3600;
            const speed = this.distance / timeInHours;
            this.speedEl.textContent = speed.toFixed(1);
            
            const paceMinutes = Math.floor(seconds / 60 / this.distance);
            const paceSeconds = Math.floor((seconds / this.distance) % 60);
            this.paceEl.textContent = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
        } else {
            this.speedEl.textContent = '0.0';
            this.paceEl.textContent = '0:00';
        }
    }
    
    setManualDistance() {
        const distance = parseFloat(this.manualDistanceInput.value);
        if (!isNaN(distance) && distance >= 0) {
            this.distance = distance;
            this.updateDisplay();
        }
    }
    
    checkGoalProgress() {
        if (!this.activityGoal) return;
        
        const currentValue = this.goalType === 'distance' ? this.distance : this.getCurrentTime() / 60;
        const progress = (currentValue / this.activityGoal) * 100;
        
        if (progress >= 25 && progress < 50) {
            this.announceProgress('25% of goal completed!');
        } else if (progress >= 50 && progress < 75) {
            this.announceProgress('50% of goal completed!');
        } else if (progress >= 75 && progress < 100) {
            this.announceProgress('75% of goal completed!');
        } else if (progress >= 100) {
            this.announceProgress('Goal achieved! Great job!');
        }
    }
    
    announceProgress(message) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
        }
    }
    
    async saveActivity() {
        const activity = {
            type: this.currentActivity,
            date: new Date().toISOString(),
            duration: this.getCurrentTime(),
            distance: this.distance,
            positions: this.positions,
            avgAccuracy: this.positions.length > 0 ? 
                this.positions.reduce((sum, pos) => sum + (pos.accuracy || 0), 0) / this.positions.length : 0
        };
        
        try {
            if (this.isOnline) {
                await this.apiRequest('/activities', {
                    method: 'POST',
                    body: JSON.stringify(activity)
                });
                this.showNotification('Activity saved successfully!', 'success');
            } else {
                // Save to localStorage as backup when offline
                this.saveActivityOffline(activity);
                this.showNotification('Activity saved offline', 'info');
            }
            
            await this.updateHistory();
            await this.updateStats();
        } catch (error) {
            console.error('Failed to save activity:', error);
            // Fallback to localStorage
            this.saveActivityOffline(activity);
            this.showNotification('Activity saved locally', 'warning');
        }
    }
    
    saveActivityOffline(activity) {
        const activities = this.getLocalStorageActivities();
        activity.id = Date.now(); // Add local ID
        activities.unshift(activity);
        localStorage.setItem('runtracker_activities_offline', JSON.stringify(activities));
    }
    
    getLocalStorageActivities() {
        try {
            const stored = localStorage.getItem('runtracker_activities_offline');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading offline activities:', error);
            return [];
        }
    }
    
    async getActivities() {
        try {
            if (this.isOnline) {
                const response = await this.apiRequest('/activities');
                return response.activities || [];
            } else {
                // Return offline activities when not connected
                return this.getLocalStorageActivities();
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            // Fallback to localStorage
            return this.getLocalStorageActivities();
        }
    }
    
    async updateHistory() {
        const activities = await this.getActivities();
        
        if (activities.length === 0) {
            this.historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No activities recorded yet</p>
                    <small>Start tracking to see your history</small>
                </div>
            `;
            return;
        }
        
        this.historyList.innerHTML = activities.map(activity => {
            const date = new Date(activity.date);
            const duration = this.formatDuration(activity.duration);
            const pace = activity.distance > 0 ? 
                this.formatPace(activity.duration / activity.distance) : '0:00';
            
            return `
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-item-icon ${activity.type}">
                            <i class="fas fa-${activity.type === 'running' ? 'running' : 'walking'}"></i>
                        </div>
                        <div class="history-item-details">
                            <h3>${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}</h3>
                            <p>${activity.distance.toFixed(2)} km • ${duration}</p>
                        </div>
                    </div>
                    <div class="history-item-stats">
                        <div class="stat">Pace: ${pace}/km</div>
                        <div class="date">${date.toLocaleDateString()}</div>
                        <button class="btn btn-sm btn-danger delete-activity" data-id="${activity.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add delete functionality
        this.historyList.querySelectorAll('.delete-activity').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteActivity(parseInt(btn.dataset.id));
            });
        });
    }
    
    async deleteActivity(id) {
        if (confirm('Are you sure you want to delete this activity?')) {
            try {
                if (this.isOnline) {
                    await this.apiRequest(`/activities/${id}`, {
                        method: 'DELETE'
                    });
                    this.showNotification('Activity deleted successfully!', 'success');
                } else {
                    // Delete from localStorage when offline
                    const activities = this.getLocalStorageActivities();
                    const filtered = activities.filter(activity => activity.id !== id);
                    localStorage.setItem('runtracker_activities_offline', JSON.stringify(filtered));
                    this.showNotification('Activity deleted offline', 'info');
                }
                
                await this.updateHistory();
                await this.updateStats();
            } catch (error) {
                console.error('Failed to delete activity:', error);
                this.showNotification('Failed to delete activity', 'error');
            }
        }
    }
    
    async updateStats() {
        try {
            let stats;
            
            if (this.isOnline) {
                stats = await this.apiRequest('/stats');
                stats = stats.overview;
            } else {
                // Calculate stats from offline data
                const activities = this.getLocalStorageActivities();
                stats = this.calculateOfflineStats(activities);
            }
            
            this.totalRunsEl.textContent = stats.total_runs || 0;
            this.totalWalksEl.textContent = stats.total_walks || 0;
            this.totalDistanceEl.textContent = `${(stats.total_distance || 0).toFixed(1)} km`;
            this.totalTimeEl.textContent = this.formatDuration(stats.total_time || 0);
            
            if (stats.avg_pace && stats.avg_speed) {
                this.avgPaceEl.textContent = this.formatPace(stats.avg_pace) + '/km';
                this.avgSpeedEl.textContent = `${stats.avg_speed.toFixed(1)} km/h`;
            } else {
                this.avgPaceEl.textContent = '0:00/km';
                this.avgSpeedEl.textContent = '0.0 km/h';
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
            // Set default values
            this.totalRunsEl.textContent = '0';
            this.totalWalksEl.textContent = '0';
            this.totalDistanceEl.textContent = '0.0 km';
            this.totalTimeEl.textContent = '0:00';
            this.avgPaceEl.textContent = '0:00/km';
            this.avgSpeedEl.textContent = '0.0 km/h';
        }
    }
    
    calculateOfflineStats(activities) {
        const runs = activities.filter(a => a.type === 'running');
        const walks = activities.filter(a => a.type === 'walking');
        const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
        const totalTime = activities.reduce((sum, a) => sum + a.duration, 0);
        
        let avgPace = 0;
        let avgSpeed = 0;
        
        if (totalDistance > 0 && totalTime > 0) {
            avgPace = totalTime / totalDistance;
            avgSpeed = totalDistance / (totalTime / 3600);
        }
        
        return {
            total_runs: runs.length,
            total_walks: walks.length,
            total_distance: totalDistance,
            total_time: totalTime,
            avg_pace: avgPace,
            avg_speed: avgSpeed
        };
    }
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    formatPace(paceInSeconds) {
        const minutes = Math.floor(paceInSeconds / 60);
        const seconds = Math.floor(paceInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    switchTab(tabName) {
        this.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // Update data when switching tabs
        if (tabName === 'history') {
            this.updateHistory();
        } else if (tabName === 'stats') {
            this.updateStats();
        }
    }
    
    async clearHistory() {
        if (confirm('Are you sure you want to clear all activity history? This cannot be undone.')) {
            try {
                if (this.isOnline) {
                    // Note: This would need a bulk delete API endpoint
                    this.showNotification('Bulk delete not implemented yet via API', 'warning');
                } else {
                    localStorage.removeItem('runtracker_activities_offline');
                    this.showNotification('Offline history cleared', 'info');
                }
                
                await this.updateHistory();
                await this.updateStats();
            } catch (error) {
                console.error('Failed to clear history:', error);
                this.showNotification('Failed to clear history', 'error');
            }
        }
    }
    
    async exportData() {
        try {
            if (this.isOnline) {
                // Use API export
                window.open(`${this.apiBaseUrl}/activities/export/json`, '_blank');
            } else {
                // Export offline data
                const activities = this.getLocalStorageActivities();
                const dataStr = JSON.stringify(activities, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = `runtracker_export_offline_${new Date().toISOString().split('T')[0]}.json`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Export failed', 'error');
        }
    }
    
    async exportToCSV() {
        try {
            if (this.isOnline) {
                // Use API export
                window.open(`${this.apiBaseUrl}/activities/export/csv`, '_blank');
            } else {
                // Export offline data as CSV
                const activities = this.getLocalStorageActivities();
                const csvHeader = 'Date,Type,Duration (seconds),Distance (km),Pace (min/km),Speed (km/h)\n';
                const csvRows = activities.map(activity => {
                    const date = new Date(activity.date).toLocaleDateString();
                    const pace = activity.distance > 0 ? activity.duration / activity.distance / 60 : 0;
                    const speed = activity.distance > 0 ? activity.distance / (activity.duration / 3600) : 0;
                    return `${date},${activity.type},${activity.duration},${activity.distance},${pace.toFixed(2)},${speed.toFixed(2)}`;
                }).join('\n');
                
                const csvContent = csvHeader + csvRows;
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `runtracker_export_offline_${new Date().toISOString().split('T')[0]}.csv`);
                link.click();
            }
        } catch (error) {
            console.error('CSV export failed:', error);
            this.showNotification('CSV export failed', 'error');
        }
    }
    
    setupDarkMode() {
        const savedTheme = localStorage.getItem('runtracker_theme');
        if (savedTheme === 'dark') {
            this.toggleDarkMode();
        }
    }
    
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        document.body.classList.toggle('dark-mode', this.darkMode);
        localStorage.setItem('runtracker_theme', this.darkMode ? 'dark' : 'light');
    }
    
    async setGoal(value, type) {
        this.activityGoal = value;
        this.goalType = type;
        
        try {
            if (this.isOnline) {
                await this.apiRequest('/stats/goals', {
                    method: 'POST',
                    body: JSON.stringify({
                        goal_type: type,
                        goal_value: value,
                        activity_type: 'both'
                    })
                });
            } else {
                localStorage.setItem('runtracker_goal', JSON.stringify({ value, type }));
            }
        } catch (error) {
            console.error('Failed to save goal:', error);
            localStorage.setItem('runtracker_goal', JSON.stringify({ value, type }));
        }
    }
    
    async loadGoal() {
        try {
            if (this.isOnline) {
                const goals = await this.apiRequest('/stats/goals');
                if (goals.length > 0) {
                    const activeGoal = goals.find(g => g.is_active) || goals[0];
                    this.activityGoal = activeGoal.goal_value;
                    this.goalType = activeGoal.goal_type;
                    return;
                }
            }
        } catch (error) {
            console.error('Failed to load goals from API:', error);
        }
        
        // Fallback to localStorage
        const savedGoal = localStorage.getItem('runtracker_goal');
        if (savedGoal) {
            const goal = JSON.parse(savedGoal);
            this.activityGoal = goal.value;
            this.goalType = goal.type;
        }
    }
    
    addNewFeatures() {
        // Add export buttons to stats tab
        const statsContainer = document.querySelector('.stats-container');
        const exportSection = document.createElement('div');
        exportSection.className = 'export-section';
        exportSection.innerHTML = `
            <h3>Export Data</h3>
            <div class="export-buttons">
                <button class="btn btn-outline" id="export-json">
                    <i class="fas fa-download"></i> Export JSON
                </button>
                <button class="btn btn-outline" id="export-csv">
                    <i class="fas fa-file-csv"></i> Export CSV
                </button>
            </div>
        `;
        statsContainer.appendChild(exportSection);
        
        // Add connection status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'connection-status';
        statusIndicator.innerHTML = `
            <div class="status-indicator ${this.isOnline ? 'online' : 'offline'}">
                <i class="fas fa-${this.isOnline ? 'wifi' : 'wifi-slash'}"></i>
                <span>${this.isOnline ? 'Online' : 'Offline'}</span>
            </div>
        `;
        document.querySelector('.header-content').appendChild(statusIndicator);
        
        // Add dark mode toggle to header
        const headerContent = document.querySelector('.header-content');
        const darkModeToggle = document.createElement('button');
        darkModeToggle.className = 'btn btn-outline dark-mode-toggle';
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        headerContent.appendChild(darkModeToggle);
        
        // Add goal setting to tracker
        const trackerContainer = document.querySelector('.tracker-container');
        const goalSection = document.createElement('div');
        goalSection.className = 'goal-section';
        goalSection.innerHTML = `
            <div class="goal-input">
                <label>Activity Goal:</label>
                <input type="number" id="goal-value" step="0.1" min="0" placeholder="Set goal">
                <select id="goal-type">
                    <option value="distance">km</option>
                    <option value="time">minutes</option>
                </select>
                <button class="btn btn-outline" id="set-goal">Set Goal</button>
            </div>
        `;
        trackerContainer.appendChild(goalSection);
        
        // Add event listeners
        document.getElementById('export-json').addEventListener('click', () => this.exportData());
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
        document.getElementById('set-goal').addEventListener('click', () => {
            const value = parseFloat(document.getElementById('goal-value').value);
            const type = document.getElementById('goal-type').value;
            if (value > 0) {
                this.setGoal(value, type);
                alert(`Goal set: ${value} ${type === 'distance' ? 'km' : 'minutes'}`);
            }
        });
        
        // Update connection status
        window.addEventListener('online', () => {
            const indicator = document.querySelector('.status-indicator');
            indicator.className = 'status-indicator online';
            indicator.innerHTML = '<i class="fas fa-wifi"></i><span>Online</span>';
        });
        
        window.addEventListener('offline', () => {
            const indicator = document.querySelector('.status-indicator');
            indicator.className = 'status-indicator offline';
            indicator.innerHTML = '<i class="fas fa-wifi-slash"></i><span>Offline</span>';
        });
    }
    
    async loadData() {
        // Load any saved preferences or state
        const savedActivity = localStorage.getItem('runtracker_activity_type');
        if (savedActivity) {
            this.selectActivity(savedActivity);
        }
        await this.loadGoal();
    }
    
    saveData() {
        // Save current activity type
        localStorage.setItem('runtracker_activity_type', this.currentActivity);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new RunTracker();
    
    // Save data before page unload
    window.addEventListener('beforeunload', () => {
        app.saveData();
    });
    
    // Handle visibility change (when app goes to background)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && app.isRunning) {
            // Keep running in background
            console.log('App moved to background, continuing tracking...');
        } else if (!document.hidden && app.isRunning) {
            // App back to foreground
            console.log('App back to foreground, updating display...');
            app.updateDisplay();
        }
    });
});

// Remove service worker registration since the file doesn't exist
// This prevents console errors about missing sw.js file