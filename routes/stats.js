const express = require('express');
const router = express.Router();
const Database = require('../database/Database');

// GET /api/stats - Get user statistics
router.get('/', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.query.userId || 1;
        
        // Get basic stats
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_activities,
                COUNT(CASE WHEN type = 'running' THEN 1 END) as total_runs,
                COUNT(CASE WHEN type = 'walking' THEN 1 END) as total_walks,
                COALESCE(SUM(distance), 0) as total_distance,
                COALESCE(SUM(duration), 0) as total_time,
                COALESCE(AVG(distance), 0) as avg_distance,
                COALESCE(AVG(duration), 0) as avg_duration
            FROM activities 
            WHERE user_id = ?
        `, [userId]);
        
        // Calculate average pace and speed
        let avgPace = 0;
        let avgSpeed = 0;
        
        if (stats.total_distance > 0 && stats.total_time > 0) {
            avgPace = stats.total_time / stats.total_distance; // seconds per km
            avgSpeed = stats.total_distance / (stats.total_time / 3600); // km/h
        }
        
        // Get monthly activity counts for the last 12 months
        const monthlyStats = await db.query(`
            SELECT 
                strftime('%Y-%m', date) as month,
                COUNT(*) as activity_count,
                SUM(distance) as total_distance,
                SUM(duration) as total_time
            FROM activities 
            WHERE user_id = ? 
            AND date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month DESC
        `, [userId]);
        
        // Get activity type distribution
        const typeDistribution = await db.query(`
            SELECT 
                type,
                COUNT(*) as count,
                SUM(distance) as total_distance,
                SUM(duration) as total_time,
                AVG(distance) as avg_distance,
                AVG(duration) as avg_duration
            FROM activities 
            WHERE user_id = ?
            GROUP BY type
        `, [userId]);
        
        // Get recent activity streak
        const recentActivities = await db.query(`
            SELECT date
            FROM activities 
            WHERE user_id = ?
            ORDER BY date DESC
            LIMIT 30
        `, [userId]);
        
        // Calculate streak
        let currentStreak = 0;
        if (recentActivities.length > 0) {
            const today = new Date();
            const activities = recentActivities.map(a => new Date(a.date));
            
            for (let i = 0; i < activities.length; i++) {
                const activityDate = new Date(activities[i].toDateString());
                const checkDate = new Date(today);
                checkDate.setDate(today.getDate() - i);
                
                if (activityDate.toDateString() === checkDate.toDateString()) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
        
        // Get best performances
        const bestDistance = await db.get(`
            SELECT MAX(distance) as value, date 
            FROM activities 
            WHERE user_id = ? AND distance > 0
        `, [userId]);
        
        const bestDuration = await db.get(`
            SELECT MAX(duration) as value, date 
            FROM activities 
            WHERE user_id = ? AND duration > 0
        `, [userId]);
        
        const bestPace = await db.get(`
            SELECT MIN(duration / distance) as value, date, distance, duration
            FROM activities 
            WHERE user_id = ? AND distance > 0
        `, [userId]);
        
        res.json({
            overview: {
                total_activities: stats.total_activities,
                total_runs: stats.total_runs,
                total_walks: stats.total_walks,
                total_distance: parseFloat(stats.total_distance.toFixed(2)),
                total_time: stats.total_time,
                avg_distance: parseFloat(stats.avg_distance.toFixed(2)),
                avg_duration: Math.round(stats.avg_duration),
                avg_pace: avgPace,
                avg_speed: parseFloat(avgSpeed.toFixed(2)),
                current_streak: currentStreak
            },
            monthly: monthlyStats,
            by_type: typeDistribution,
            best_performances: {
                distance: bestDistance || { value: 0, date: null },
                duration: bestDuration || { value: 0, date: null },
                pace: bestPace || { value: 0, date: null }
            }
        });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/stats/weekly - Get weekly statistics
router.get('/weekly', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.query.userId || 1;
        const weeks = parseInt(req.query.weeks) || 12;
        
        const weeklyStats = await db.query(`
            SELECT 
                strftime('%Y-%W', date) as week,
                COUNT(*) as activity_count,
                SUM(distance) as total_distance,
                SUM(duration) as total_time,
                AVG(distance) as avg_distance,
                COUNT(CASE WHEN type = 'running' THEN 1 END) as runs,
                COUNT(CASE WHEN type = 'walking' THEN 1 END) as walks
            FROM activities 
            WHERE user_id = ? 
            AND date >= date('now', '-${weeks} weeks')
            GROUP BY strftime('%Y-%W', date)
            ORDER BY week DESC
        `, [userId]);
        
        res.json(weeklyStats);
        
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({ error: 'Failed to fetch weekly statistics' });
    }
});

// GET /api/stats/goals - Get goal progress
router.get('/goals', async (req, res) => {
    try {
        const db = new Database();
        const userId = req.query.userId || 1;
        
        // Get active goals
        const goals = await db.query(`
            SELECT * FROM activity_goals 
            WHERE user_id = ? AND is_active = 1
            ORDER BY created_at DESC
        `, [userId]);
        
        // Calculate progress for each goal
        const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
            let progress = 0;
            
            // Calculate progress based on goal type
            if (goal.goal_type === 'distance') {
                const result = await db.get(`
                    SELECT SUM(distance) as total
                    FROM activities 
                    WHERE user_id = ? 
                    AND date >= date('now', '-1 month')
                    ${goal.activity_type !== 'both' ? 'AND type = ?' : ''}
                `, goal.activity_type !== 'both' ? [userId, goal.activity_type] : [userId]);
                
                progress = result.total || 0;
            } else if (goal.goal_type === 'time') {
                const result = await db.get(`
                    SELECT SUM(duration) as total
                    FROM activities 
                    WHERE user_id = ? 
                    AND date >= date('now', '-1 month')
                    ${goal.activity_type !== 'both' ? 'AND type = ?' : ''}
                `, goal.activity_type !== 'both' ? [userId, goal.activity_type] : [userId]);
                
                progress = (result.total || 0) / 60; // Convert to minutes
            }
            
            return {
                ...goal,
                current_progress: progress,
                progress_percentage: Math.min((progress / goal.goal_value) * 100, 100)
            };
        }));
        
        res.json(goalsWithProgress);
        
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goal progress' });
    }
});

// POST /api/stats/goals - Create new goal
router.post('/goals', async (req, res) => {
    try {
        const db = new Database();
        const { goal_type, goal_value, activity_type = 'both' } = req.body;
        const userId = req.body.userId || 1;
        
        // Validate input
        if (!goal_type || !['distance', 'time'].includes(goal_type)) {
            return res.status(400).json({ error: 'Invalid goal type' });
        }
        
        if (!goal_value || typeof goal_value !== 'number' || goal_value <= 0) {
            return res.status(400).json({ error: 'Invalid goal value' });
        }
        
        if (!['running', 'walking', 'both'].includes(activity_type)) {
            return res.status(400).json({ error: 'Invalid activity type' });
        }
        
        // Deactivate existing goals of the same type
        await db.run(`
            UPDATE activity_goals 
            SET is_active = 0 
            WHERE user_id = ? AND goal_type = ? AND activity_type = ?
        `, [userId, goal_type, activity_type]);
        
        // Create new goal
        const result = await db.run(`
            INSERT INTO activity_goals (user_id, goal_type, goal_value, activity_type)
            VALUES (?, ?, ?, ?)
        `, [userId, goal_type, goal_value, activity_type]);
        
        // Fetch the created goal
        const createdGoal = await db.get(`
            SELECT * FROM activity_goals WHERE id = ?
        `, [result.id]);
        
        res.status(201).json({
            message: 'Goal created successfully',
            goal: createdGoal
        });
        
    } catch (error) {
        console.error('Error creating goal:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

// PUT /api/stats/goals/:id - Update goal
router.put('/goals/:id', async (req, res) => {
    try {
        const db = new Database();
        const goalId = parseInt(req.params.id);
        const { goal_value, is_active } = req.body;
        
        if (isNaN(goalId)) {
            return res.status(400).json({ error: 'Invalid goal ID' });
        }
        
        // Check if goal exists
        const existing = await db.get(`
            SELECT * FROM activity_goals WHERE id = ?
        `, [goalId]);
        
        if (!existing) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        
        // Update goal
        await db.run(`
            UPDATE activity_goals 
            SET goal_value = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [goal_value || existing.goal_value, is_active !== undefined ? is_active : existing.is_active, goalId]);
        
        // Fetch updated goal
        const updatedGoal = await db.get(`
            SELECT * FROM activity_goals WHERE id = ?
        `, [goalId]);
        
        res.json({
            message: 'Goal updated successfully',
            goal: updatedGoal
        });
        
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ error: 'Failed to update goal' });
    }
});

// DELETE /api/stats/goals/:id - Delete goal
router.delete('/goals/:id', async (req, res) => {
    try {
        const db = new Database();
        const goalId = parseInt(req.params.id);
        
        if (isNaN(goalId)) {
            return res.status(400).json({ error: 'Invalid goal ID' });
        }
        
        // Check if goal exists
        const existing = await db.get(`
            SELECT * FROM activity_goals WHERE id = ?
        `, [goalId]);
        
        if (!existing) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        
        // Delete goal
        await db.run(`
            DELETE FROM activity_goals WHERE id = ?
        `, [goalId]);
        
        res.json({ message: 'Goal deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

module.exports = router;