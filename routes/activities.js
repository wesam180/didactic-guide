const express = require('express');
const router = express.Router();
const Database = require('../database/Database');

// Validation middleware
const validateActivity = (req, res, next) => {
    const { type, duration, distance } = req.body;
    
    if (!type || !['running', 'walking'].includes(type)) {
        return res.status(400).json({ error: 'Invalid activity type. Must be "running" or "walking"' });
    }
    
    if (!duration || typeof duration !== 'number' || duration <= 0) {
        return res.status(400).json({ error: 'Invalid duration. Must be a positive number' });
    }
    
    if (!distance || typeof distance !== 'number' || distance < 0) {
        return res.status(400).json({ error: 'Invalid distance. Must be a non-negative number' });
    }
    
    next();
};

// GET /api/activities - Get all activities
router.get('/', async (req, res) => {
    try {
        const db = new Database();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const userId = req.query.userId || 1;
        
        // Get activities with pagination
        const activities = await db.query(
            `SELECT a.*, COUNT(gp.id) as position_count 
             FROM activities a 
             LEFT JOIN gps_positions gp ON a.id = gp.activity_id 
             WHERE a.user_id = ? 
             GROUP BY a.id 
             ORDER BY a.date DESC 
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        
        // Get total count for pagination
        const totalResult = await db.get(
            'SELECT COUNT(*) as total FROM activities WHERE user_id = ?',
            [userId]
        );
        
        const total = totalResult.total;
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            activities,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages
            }
        });
        
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

// GET /api/activities/:id - Get single activity with GPS data
router.get('/:id', async (req, res) => {
    try {
        const db = new Database();
        const activityId = parseInt(req.params.id);
        
        if (isNaN(activityId)) {
            return res.status(400).json({ error: 'Invalid activity ID' });
        }
        
        // Get activity details
        const activity = await db.get(
            'SELECT * FROM activities WHERE id = ?',
            [activityId]
        );
        
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        // Get GPS positions for this activity
        const positions = await db.query(
            'SELECT latitude as lat, longitude as lng, timestamp, accuracy FROM gps_positions WHERE activity_id = ? ORDER BY timestamp',
            [activityId]
        );
        
        // Add positions to activity object
        activity.positions = positions;
        
        res.json(activity);
        
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// POST /api/activities - Create new activity
router.post('/', validateActivity, async (req, res) => {
    try {
        const db = new Database();
        const { type, duration, distance, positions = [], avgAccuracy = 0 } = req.body;
        const userId = req.body.userId || 1;
        const date = req.body.date || new Date().toISOString();
        
        // Insert activity
        const result = await db.run(
            `INSERT INTO activities (user_id, type, date, duration, distance, avg_accuracy)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, type, date, duration, distance, avgAccuracy]
        );
        
        const activityId = result.id;
        
        // Insert GPS positions if provided
        if (positions && positions.length > 0) {
            for (const position of positions) {
                if (position.lat && position.lng && position.timestamp) {
                    await db.run(
                        `INSERT INTO gps_positions (activity_id, latitude, longitude, timestamp, accuracy)
                         VALUES (?, ?, ?, ?, ?)`,
                        [activityId, position.lat, position.lng, position.timestamp, position.accuracy || 0]
                    );
                }
            }
        }
        
        // Fetch the created activity with positions
        const createdActivity = await db.get(
            'SELECT * FROM activities WHERE id = ?',
            [activityId]
        );
        
        const createdPositions = await db.query(
            'SELECT latitude as lat, longitude as lng, timestamp, accuracy FROM gps_positions WHERE activity_id = ?',
            [activityId]
        );
        
        createdActivity.positions = createdPositions;
        
        res.status(201).json({
            message: 'Activity created successfully',
            activity: createdActivity
        });
        
    } catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).json({ error: 'Failed to create activity' });
    }
});

// PUT /api/activities/:id - Update activity
router.put('/:id', validateActivity, async (req, res) => {
    try {
        const db = new Database();
        const activityId = parseInt(req.params.id);
        const { type, duration, distance, avgAccuracy = 0 } = req.body;
        
        if (isNaN(activityId)) {
            return res.status(400).json({ error: 'Invalid activity ID' });
        }
        
        // Check if activity exists
        const existing = await db.get(
            'SELECT * FROM activities WHERE id = ?',
            [activityId]
        );
        
        if (!existing) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        // Update activity
        await db.run(
            `UPDATE activities 
             SET type = ?, duration = ?, distance = ?, avg_accuracy = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [type, duration, distance, avgAccuracy, activityId]
        );
        
        // Fetch updated activity
        const updatedActivity = await db.get(
            'SELECT * FROM activities WHERE id = ?',
            [activityId]
        );
        
        res.json({
            message: 'Activity updated successfully',
            activity: updatedActivity
        });
        
    } catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({ error: 'Failed to update activity' });
    }
});

// DELETE /api/activities/:id - Delete activity
router.delete('/:id', async (req, res) => {
    try {
        const db = new Database();
        const activityId = parseInt(req.params.id);
        
        if (isNaN(activityId)) {
            return res.status(400).json({ error: 'Invalid activity ID' });
        }
        
        // Check if activity exists
        const existing = await db.get(
            'SELECT * FROM activities WHERE id = ?',
            [activityId]
        );
        
        if (!existing) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        // Delete GPS positions first (CASCADE should handle this, but being explicit)
        await db.run(
            'DELETE FROM gps_positions WHERE activity_id = ?',
            [activityId]
        );
        
        // Delete activity
        await db.run(
            'DELETE FROM activities WHERE id = ?',
            [activityId]
        );
        
        res.json({ message: 'Activity deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ error: 'Failed to delete activity' });
    }
});

// GET /api/activities/export/csv - Export activities as CSV
router.get('/export/csv', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.query.userId || 1;
        
        const activities = await db.query(
            `SELECT type, date, duration, distance, avg_accuracy
             FROM activities 
             WHERE user_id = ? 
             ORDER BY date DESC`,
            [userId]
        );
        
        // Generate CSV
        const csvHeader = 'Date,Type,Duration (seconds),Distance (km),Pace (min/km),Speed (km/h),Avg Accuracy (m)\n';
        const csvRows = activities.map(activity => {
            const date = new Date(activity.date).toLocaleDateString();
            const pace = activity.distance > 0 ? (activity.duration / activity.distance / 60).toFixed(2) : '0.00';
            const speed = activity.distance > 0 ? (activity.distance / (activity.duration / 3600)).toFixed(2) : '0.00';
            
            return `${date},${activity.type},${activity.duration},${activity.distance},${pace},${speed},${activity.avg_accuracy}`;
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="runtracker_activities_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
        
    } catch (error) {
        console.error('Error exporting activities:', error);
        res.status(500).json({ error: 'Failed to export activities' });
    }
});

// GET /api/activities/export/json - Export activities as JSON
router.get('/export/json', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.query.userId || 1;
        
        const activities = await db.query(
            `SELECT * FROM activities WHERE user_id = ? ORDER BY date DESC`,
            [userId]
        );
        
        // Get positions for each activity
        for (const activity of activities) {
            const positions = await db.query(
                'SELECT latitude as lat, longitude as lng, timestamp, accuracy FROM gps_positions WHERE activity_id = ?',
                [activity.id]
            );
            activity.positions = positions;
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="runtracker_activities_${new Date().toISOString().split('T')[0]}.json"`);
        res.json(activities);
        
    } catch (error) {
        console.error('Error exporting activities:', error);
        res.status(500).json({ error: 'Failed to export activities' });
    }
});

module.exports = router;