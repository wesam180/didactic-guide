// RunTracker App - Main JavaScript File

class RunTracker {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.totalTime = 0;
        this.distance = 0;
        this.currentActivity = 'running';
        this.gpsWatchId = null;
        this.lastPosition = null;
        this.positions = [];
        
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
    
    init() {
        this.setupEventListeners();
        this.setupGPS();
        this.loadData();
        this.updateDisplay();
        this.updateStats();
        this.updateHistory();
    }
    
    setupEventListeners() {
        // Control buttons
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        
        // Activity type selection
        this.activityBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isRunning) {
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
            // Resume from pause
            this.pausedTime += Date.now() - this.startTime;
            this.isPaused = false;
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
        this.updateButtonStates();
        this.stopTimer();
        this.stopGPSTracking();
    }
    
    stop() {
        if (this.isRunning || this.isPaused) {
            this.saveActivity();
        }
        
        this.isRunning = false;
        this.isPaused = false;
        this.totalTime = 0;
        this.distance = 0;
        this.positions = [];
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
        }, 100);
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
        this.updateGPSStatus('GPS Connected', 'connected');
        
        const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: position.timestamp
        };
        
        if (this.lastPosition && this.isRunning) {
            const distanceDelta = this.calculateDistance(this.lastPosition, newPos);
            if (distanceDelta > 0 && distanceDelta < 0.1) { // Filter out GPS noise
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
        const now = this.isPaused ? this.startTime : Date.now();
        return Math.floor((now - this.startTime - this.pausedTime) / 1000);
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
    
    saveActivity() {
        const activity = {
            id: Date.now(),
            type: this.currentActivity,
            date: new Date().toISOString(),
            duration: this.getCurrentTime(),
            distance: this.distance,
            positions: this.positions
        };
        
        const activities = this.getActivities();
        activities.unshift(activity);
        localStorage.setItem('runtracker_activities', JSON.stringify(activities));
        
        this.updateHistory();
        this.updateStats();
    }
    
    getActivities() {
        const stored = localStorage.getItem('runtracker_activities');
        return stored ? JSON.parse(stored) : [];
    }
    
    updateHistory() {
        const activities = this.getActivities();
        
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
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateStats() {
        const activities = this.getActivities();
        
        const runs = activities.filter(a => a.type === 'running');
        const walks = activities.filter(a => a.type === 'walking');
        
        const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
        const totalTime = activities.reduce((sum, a) => sum + a.duration, 0);
        
        this.totalRunsEl.textContent = runs.length;
        this.totalWalksEl.textContent = walks.length;
        this.totalDistanceEl.textContent = `${totalDistance.toFixed(1)} km`;
        this.totalTimeEl.textContent = this.formatDuration(totalTime);
        
        if (activities.length > 0 && totalDistance > 0) {
            const avgPace = totalTime / totalDistance;
            this.avgPaceEl.textContent = this.formatPace(avgPace) + '/km';
            
            const avgSpeed = totalDistance / (totalTime / 3600);
            this.avgSpeedEl.textContent = `${avgSpeed.toFixed(1)} km/h`;
        } else {
            this.avgPaceEl.textContent = '0:00/km';
            this.avgSpeedEl.textContent = '0.0 km/h';
        }
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
    
    clearHistory() {
        if (confirm('Are you sure you want to clear all activity history? This cannot be undone.')) {
            localStorage.removeItem('runtracker_activities');
            this.updateHistory();
            this.updateStats();
        }
    }
    
    loadData() {
        // Load any saved preferences or state
        const savedActivity = localStorage.getItem('runtracker_activity_type');
        if (savedActivity) {
            this.selectActivity(savedActivity);
        }
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

// Service Worker registration for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}