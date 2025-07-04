# RunTracker Database Integration Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npm run init-db
```

### 3. Start the Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Or production mode
npm start
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health
- **API Documentation**: See API endpoints below

## 📊 Database Schema

### Tables Overview

#### Users
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Activities
```sql
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    type TEXT NOT NULL CHECK(type IN ('running', 'walking')),
    date TEXT NOT NULL,
    duration INTEGER NOT NULL,
    distance REAL NOT NULL,
    avg_accuracy REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### GPS Positions
```sql
CREATE TABLE gps_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    accuracy REAL DEFAULT 0,
    FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
);
```

#### User Preferences
```sql
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, preference_key)
);
```

#### Activity Goals
```sql
CREATE TABLE activity_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    goal_type TEXT NOT NULL CHECK(goal_type IN ('distance', 'time')),
    goal_value REAL NOT NULL,
    activity_type TEXT CHECK(activity_type IN ('running', 'walking', 'both')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🔌 API Endpoints

### Activities

#### GET /api/activities
Get all activities with pagination
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 50)
  - `userId` (optional): User ID (default: 1)

#### GET /api/activities/:id
Get single activity with GPS data

#### POST /api/activities
Create new activity
- **Body**: Activity object with type, duration, distance, positions

#### PUT /api/activities/:id
Update existing activity

#### DELETE /api/activities/:id
Delete activity

#### GET /api/activities/export/csv
Export activities as CSV file

#### GET /api/activities/export/json
Export activities as JSON file

### Statistics

#### GET /api/stats
Get comprehensive user statistics
- **Returns**: Overview, monthly stats, type distribution, best performances

#### GET /api/stats/weekly
Get weekly statistics
- **Query Parameters**:
  - `weeks` (optional): Number of weeks (default: 12)

#### GET /api/stats/goals
Get user goals with progress

#### POST /api/stats/goals
Create new goal
- **Body**: goal_type, goal_value, activity_type

#### PUT /api/stats/goals/:id
Update goal

#### DELETE /api/stats/goals/:id
Delete goal

### Users

#### GET /api/users/preferences
Get user preferences

#### POST /api/users/preferences
Set single preference
- **Body**: key, value

#### PUT /api/users/preferences
Update multiple preferences
- **Body**: preferences object

#### DELETE /api/users/preferences/:key
Delete preference

#### GET /api/users/profile
Get user profile

#### PUT /api/users/profile
Update user profile

#### GET /api/users/data-summary
Get user data summary

#### DELETE /api/users/data
Delete all user data (requires confirmation)

### Migration

#### POST /api/migrate
Migrate localStorage data to database
- **Body**: activities array

## 🔄 Data Migration

The application automatically migrates existing localStorage data to the database when:
1. The app is loaded online
2. localStorage contains activity data
3. Data hasn't been migrated before

### Manual Migration
```javascript
// Client-side migration trigger
const activities = JSON.parse(localStorage.getItem('runtracker_activities') || '[]');
fetch('/api/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activities })
});
```

## 🌐 Offline Support

### Offline Features
- **Activity Recording**: Full functionality works offline
- **Data Storage**: Uses localStorage as backup when offline
- **Automatic Sync**: Syncs pending operations when back online
- **Connection Status**: Visual indicator of online/offline status

### Offline Storage
- Activities stored in `localStorage` key: `runtracker_activities_offline`
- Preferences stored in `localStorage` key: `runtracker_theme`, `runtracker_goal`
- Automatic sync when connection restored

## 🔧 Configuration

### Environment Variables (.env)
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_PATH=./database/runtracker.db

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-super-secret-session-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Security Features
- **Helmet.js**: Security headers
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Server-side validation for all endpoints
- **SQL Injection Protection**: Parameterized queries

## 📱 Frontend Integration

### API Client Usage
```javascript
// Get activities
const response = await fetch('/api/activities');
const data = await response.json();
const activities = data.activities;

// Create activity
const activity = {
    type: 'running',
    duration: 1800, // 30 minutes in seconds
    distance: 5.2,  // 5.2 km
    positions: [/* GPS positions array */]
};

await fetch('/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
});
```

### Offline Detection
```javascript
// The app automatically handles online/offline states
window.addEventListener('online', () => {
    console.log('Back online - syncing data...');
});

window.addEventListener('offline', () => {
    console.log('Offline mode - data will sync when back online');
});
```

## 🔍 Database Operations

### Direct Database Access
```javascript
const Database = require('./database/Database');
const db = new Database();

// Query activities
const activities = await db.query(
    'SELECT * FROM activities WHERE user_id = ? ORDER BY date DESC',
    [userId]
);

// Insert activity
const result = await db.run(
    'INSERT INTO activities (user_id, type, duration, distance) VALUES (?, ?, ?, ?)',
    [userId, type, duration, distance]
);

// Close connection
await db.close();
```

### Database Backup
```bash
# Create backup
cp database/runtracker.db database/runtracker_backup_$(date +%Y%m%d).db

# Restore from backup
cp database/runtracker_backup_20231201.db database/runtracker.db
```

## 🧪 Testing

### API Testing with curl
```bash
# Health check
curl http://localhost:3000/api/health

# Get activities
curl http://localhost:3000/api/activities

# Create activity
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{"type":"running","duration":1800,"distance":5.2}'

# Get statistics
curl http://localhost:3000/api/stats
```

### Database Testing
```bash
# Connect to SQLite database directly
sqlite3 database/runtracker.db

# View tables
.tables

# View activities
SELECT * FROM activities LIMIT 5;

# View GPS positions
SELECT * FROM gps_positions LIMIT 5;
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Reinitialize database
npm run init-db

# Check file permissions
ls -la database/
```

#### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

#### Migration Issues
```javascript
// Clear migration flag to retry
localStorage.removeItem('runtracker_activities_migrated');
```

### Performance Optimization

#### Database Indexes
The app includes optimized indexes for:
- Activities by user_id and date
- GPS positions by activity_id
- User preferences by user_id

#### Query Optimization
- Pagination for large datasets
- Efficient aggregation queries for statistics
- Proper foreign key relationships with cascading deletes

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Database Size
```sql
-- Check database size and record counts
SELECT 
    (SELECT COUNT(*) FROM activities) as activities,
    (SELECT COUNT(*) FROM gps_positions) as gps_positions,
    (SELECT COUNT(*) FROM user_preferences) as preferences,
    (SELECT COUNT(*) FROM activity_goals) as goals;
```

### Performance Metrics
```bash
# View server logs
tail -f server.log

# Monitor database file size
ls -lh database/runtracker.db
```

## 🔄 Future Enhancements

### Planned Features
- **User Authentication**: Full user registration and login system
- **Multi-user Support**: Support for multiple users
- **Real-time Sync**: WebSocket-based real-time data synchronization
- **Cloud Backup**: Integration with cloud storage services
- **Advanced Analytics**: Machine learning insights and trends
- **Social Features**: Activity sharing and leaderboards

### Database Migrations
- Version-controlled schema changes
- Automatic migration system
- Rollback capabilities

### Scalability
- PostgreSQL migration path
- Database clustering support
- Horizontal scaling options

## 📄 License

This database integration is part of the RunTracker application and follows the same MIT license terms.