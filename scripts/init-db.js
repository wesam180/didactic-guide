const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database directory if it doesn't exist
const fs = require('fs');
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'runtracker.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
    // Users table for future user management
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Activities table
    db.run(`
        CREATE TABLE IF NOT EXISTS activities (
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
        )
    `);

    // GPS positions table for storing route data
    db.run(`
        CREATE TABLE IF NOT EXISTS gps_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activity_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            accuracy REAL DEFAULT 0,
            FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
        )
    `);

    // User preferences table
    db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            preference_key TEXT NOT NULL,
            preference_value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, preference_key)
        )
    `);

    // Activity goals table
    db.run(`
        CREATE TABLE IF NOT EXISTS activity_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            goal_type TEXT NOT NULL CHECK(goal_type IN ('distance', 'time')),
            goal_value REAL NOT NULL,
            activity_type TEXT CHECK(activity_type IN ('running', 'walking', 'both')),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities (user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities (type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_gps_positions_activity_id ON gps_positions (activity_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences (user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activity_goals_user_id ON activity_goals (user_id)`);

    // Insert default user for current localStorage data migration
    db.run(`
        INSERT OR IGNORE INTO users (id, username, email, password_hash)
        VALUES (1, 'default', 'default@runtracker.local', 'default_hash')
    `);

    console.log('Database tables created successfully.');
});

// Create database helper functions
const createDatabaseHelpers = () => {
    const helpers = `
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        const dbPath = path.join(__dirname, '../database/runtracker.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            }
        });
    }

    // Generic query method
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Generic run method for INSERT, UPDATE, DELETE
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Get single row
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = Database;
    `;

    fs.writeFileSync(path.join(__dirname, '../database/Database.js'), helpers);
    console.log('Database helper class created.');
};

// Close database connection
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database connection closed.');
        createDatabaseHelpers();
    }
});