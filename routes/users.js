const express = require('express');
const router = express.Router();
const Database = require('../database/Database');

// GET /api/users/preferences - Get user preferences
router.get('/preferences', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.query.userId || 1;
        
        const preferences = await db.query(`
            SELECT preference_key, preference_value 
            FROM user_preferences 
            WHERE user_id = ?
        `, [userId]);
        
        // Convert to object format
        const prefsObject = {};
        preferences.forEach(pref => {
            prefsObject[pref.preference_key] = pref.preference_value;
        });
        
        res.json(prefsObject);
        
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// POST /api/users/preferences - Set user preference
router.post('/preferences', async (req, res) => {
    try {
        const db = new Database();
        const { key, value } = req.body;
        const userId = req.body.userId || 1;
        
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Key and value are required' });
        }
        
        // Insert or update preference
        await db.run(`
            INSERT OR REPLACE INTO user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `, [userId, key, value]);
        
        res.json({ message: 'Preference saved successfully' });
        
    } catch (error) {
        console.error('Error saving preference:', error);
        res.status(500).json({ error: 'Failed to save preference' });
    }
});

// PUT /api/users/preferences - Update multiple preferences
router.put('/preferences', async (req, res) => {
    try {
        const db = new Database();
        const { preferences } = req.body;
        const userId = req.body.userId || 1;
        
        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({ error: 'Invalid preferences object' });
        }
        
        // Update each preference
        for (const [key, value] of Object.entries(preferences)) {
            await db.run(`
                INSERT OR REPLACE INTO user_preferences (user_id, preference_key, preference_value, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [userId, key, value]);
        }
        
        res.json({ message: 'Preferences updated successfully' });
        
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// DELETE /api/users/preferences/:key - Delete preference
router.delete('/preferences/:key', async (req, res) => {
    try {
        const db = new Database();
        const key = req.params.key;
        const userId = req.query.userId || 1;
        
        await db.run(`
            DELETE FROM user_preferences 
            WHERE user_id = ? AND preference_key = ?
        `, [userId, key]);
        
        res.json({ message: 'Preference deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting preference:', error);
        res.status(500).json({ error: 'Failed to delete preference' });
    }
});

// GET /api/users/profile - Get user profile
router.get('/profile', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.query.userId || 1;
        
        const user = await db.get(`
            SELECT id, username, email, created_at, updated_at
            FROM users 
            WHERE id = ?
        `, [userId]);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
        
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', async (req, res) => {
    try {
        const db = new Database();
        const { username, email } = req.body;
        const userId = req.body.userId || 1;
        
        // Validate input
        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email are required' });
        }
        
        // Check if user exists
        const existing = await db.get(`
            SELECT * FROM users WHERE id = ?
        `, [userId]);
        
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update user
        await db.run(`
            UPDATE users 
            SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [username, email, userId]);
        
        // Fetch updated user
        const updatedUser = await db.get(`
            SELECT id, username, email, created_at, updated_at
            FROM users 
            WHERE id = ?
        `, [userId]);
        
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
        
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// GET /api/users/data-summary - Get user data summary
router.get('/data-summary', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.query.userId || 1;
        
        // Get counts of all user data
        const activities = await db.get(`
            SELECT COUNT(*) as count FROM activities WHERE user_id = ?
        `, [userId]);
        
        const positions = await db.get(`
            SELECT COUNT(*) as count 
            FROM gps_positions gp 
            JOIN activities a ON gp.activity_id = a.id 
            WHERE a.user_id = ?
        `, [userId]);
        
        const preferences = await db.get(`
            SELECT COUNT(*) as count FROM user_preferences WHERE user_id = ?
        `, [userId]);
        
        const goals = await db.get(`
            SELECT COUNT(*) as count FROM activity_goals WHERE user_id = ?
        `, [userId]);
        
        // Calculate data size estimation
        const dataSize = {
            activities: activities.count,
            gps_positions: positions.count,
            preferences: preferences.count,
            goals: goals.count,
            estimated_size_mb: ((activities.count * 1) + (positions.count * 0.1) + (preferences.count * 0.01) + (goals.count * 0.01)) / 1000
        };
        
        res.json(dataSize);
        
    } catch (error) {
        console.error('Error fetching data summary:', error);
        res.status(500).json({ error: 'Failed to fetch data summary' });
    }
});

// DELETE /api/users/data - Delete all user data
router.delete('/data', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.body.userId || 1;
        const confirmDelete = req.body.confirmDelete;
        
        if (!confirmDelete) {
            return res.status(400).json({ error: 'Confirmation required to delete all data' });
        }
        
        // Delete all user data in proper order
        await db.run(`DELETE FROM gps_positions WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ?)`, [userId]);
        await db.run(`DELETE FROM activities WHERE user_id = ?`, [userId]);
        await db.run(`DELETE FROM user_preferences WHERE user_id = ?`, [userId]);
        await db.run(`DELETE FROM activity_goals WHERE user_id = ?`, [userId]);
        
        res.json({ message: 'All user data deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting user data:', error);
        res.status(500).json({ error: 'Failed to delete user data' });
    }
});

module.exports = router;