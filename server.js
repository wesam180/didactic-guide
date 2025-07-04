const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const activityRoutes = require('./routes/activities');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true,
    optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// API routes
app.use('/api/activities', activityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Migration endpoint to move localStorage data to database
app.post('/api/migrate', async (req, res) => {
    try {
        const { activities } = req.body;
        
        if (!activities || !Array.isArray(activities)) {
            return res.status(400).json({ error: 'Invalid activities data' });
        }

        const Database = require('./database/Database');
        const db = new Database();
        
        let migratedCount = 0;
        
        for (const activity of activities) {
            try {
                // Insert activity
                const result = await db.run(
                    `INSERT INTO activities (user_id, type, date, duration, distance, avg_accuracy)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [1, activity.type, activity.date, activity.duration, activity.distance, activity.avgAccuracy || 0]
                );
                
                // Insert GPS positions if they exist
                if (activity.positions && activity.positions.length > 0) {
                    for (const position of activity.positions) {
                        await db.run(
                            `INSERT INTO gps_positions (activity_id, latitude, longitude, timestamp, accuracy)
                             VALUES (?, ?, ?, ?, ?)`,
                            [result.id, position.lat, position.lng, position.timestamp, position.accuracy || 0]
                        );
                    }
                }
                
                migratedCount++;
            } catch (error) {
                console.error('Error migrating activity:', error);
            }
        }
        
        res.json({ 
            success: true, 
            migratedCount,
            message: `Successfully migrated ${migratedCount} activities` 
        });
        
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ error: 'Migration failed' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 RunTracker server running on port ${PORT}`);
    console.log(`📱 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔧 API available at: http://localhost:${PORT}/api`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});