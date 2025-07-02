# 🏃‍♀️ RunTracker - Your Running & Walking Companion

A modern, feature-rich web application for tracking your running and walking activities. Built with vanilla HTML, CSS, and JavaScript for optimal performance and compatibility.

## ✨ Features

### 🎯 Core Functionality
- **Activity Tracking**: Track both running and walking activities
- **Real-time Timer**: Precise stopwatch with hours, minutes, and seconds
- **GPS Integration**: Automatic distance tracking using device GPS
- **Manual Distance Entry**: Set distance manually when GPS isn't available
- **Pace & Speed Calculation**: Automatic calculation of pace (min/km) and speed (km/h)

### 📱 User Interface
- **Modern Design**: Beautiful, responsive UI with smooth animations
- **Tab Navigation**: Organized into Tracker, History, and Stats sections
- **Mobile-First**: Fully responsive design that works on all devices
- **Dark/Light Themes**: Clean color scheme with professional styling

### 📊 Data Management
- **Activity History**: View all your past activities with detailed metrics
- **Statistics Dashboard**: Comprehensive stats including total runs, walks, distance, and averages
- **Local Storage**: All data is stored locally on your device
- **Data Persistence**: Your activities and preferences are automatically saved

### 🛠️ Advanced Features
- **Pause/Resume**: Pause your activity and resume later
- **GPS Status Indicator**: Real-time GPS connection status
- **Activity Type Selection**: Choose between running and walking modes
- **Background Tracking**: Continues tracking when app goes to background
- **Error Handling**: Graceful handling of GPS errors and edge cases

## 🚀 Getting Started

### Quick Start
1. **Open the App**: Simply open `index.html` in any modern web browser
2. **Allow GPS**: Grant location permission when prompted for automatic distance tracking
3. **Select Activity**: Choose between running or walking
4. **Start Tracking**: Hit the start button and begin your activity!

### Browser Compatibility
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📖 How to Use

### Starting an Activity
1. **Choose Activity Type**: Select either "Running" or "Walking"
2. **Check GPS**: Ensure GPS status shows "GPS Ready" or "GPS Connected"
3. **Press Start**: Click the start button to begin tracking
4. **Monitor Progress**: Watch your time, distance, pace, and speed in real-time

### During Activity
- **Pause**: Temporarily pause your activity using the pause button
- **Resume**: Continue tracking by pressing start again
- **Manual Distance**: Enter distance manually if GPS isn't working
- **Stop**: End your activity and save it to history

### Viewing History
1. **Switch to History Tab**: Click on "History" in the navigation
2. **Browse Activities**: Scroll through your past activities
3. **View Details**: See distance, duration, pace, and date for each activity
4. **Clear History**: Use the "Clear All" button to remove all activities

### Checking Statistics
1. **Go to Stats Tab**: Click on "Stats" in the navigation
2. **View Totals**: See your total runs, walks, distance, and time
3. **Average Metrics**: Check your average pace and speed across all activities

## 🎨 Customization

### Color Scheme
The app uses CSS custom properties (variables) for easy theming. You can modify colors in `styles.css`:

```css
:root {
    --primary-color: #4f46e5;    /* Main brand color */
    --secondary-color: #06b6d4;  /* Secondary accent */
    --success-color: #10b981;    /* Success states */
    --danger-color: #ef4444;     /* Error states */
    /* ... more variables */
}
```

### Layout
- Modify grid layouts in `.metrics-grid` and `.stats-grid`
- Adjust responsive breakpoints in media queries
- Customize animations and transitions

## 📱 Mobile Features

### GPS Tracking
- High accuracy GPS positioning
- Automatic distance calculation using Haversine formula
- GPS status indicators with error handling
- Battery-optimized tracking

### Touch-Friendly Interface
- Large, easy-to-tap buttons
- Responsive layout that adapts to screen size
- Swipe-friendly navigation
- Mobile-optimized typography

### Background Operation
- Continues tracking when browser is minimized
- Handles app visibility changes gracefully
- Maintains timer accuracy in background

## 🔧 Technical Details

### Architecture
- **Frontend Only**: No server required, runs entirely in the browser
- **Vanilla JavaScript**: No external frameworks or dependencies
- **ES6+ Features**: Modern JavaScript with classes and arrow functions
- **Local Storage**: Uses browser's localStorage for data persistence

### Data Structure
Activities are stored as JSON objects with the following structure:
```javascript
{
    id: timestamp,
    type: 'running' | 'walking',
    date: ISO_string,
    duration: seconds,
    distance: kilometers,
    positions: [{ lat, lng, timestamp }]
}
```

### Performance
- Efficient DOM updates using modern JavaScript
- CSS transitions for smooth animations
- Optimized GPS polling intervals
- Minimal memory footprint

## 🛡️ Privacy & Security

- **Local Data Only**: All data stays on your device
- **No Tracking**: No analytics or user tracking
- **No Server Communication**: Completely offline application
- **GPS Privacy**: Location data is only used for distance calculation

## 🐛 Troubleshooting

### GPS Issues
- **Permission Denied**: Check browser location permissions
- **Inaccurate Distance**: Use manual distance input as backup
- **No GPS Signal**: Try moving to an open area with clear sky view

### Browser Issues
- **Storage Full**: Clear browser data or old activities
- **Performance**: Close other tabs for better performance
- **Compatibility**: Update to latest browser version

### Common Solutions
1. **Refresh the page** to reset any temporary issues
2. **Clear browser cache** if experiencing persistent problems
3. **Check browser console** for any error messages
4. **Disable browser extensions** that might interfere

## 🔄 Updates & Maintenance

### Future Enhancements
- Export data to CSV/GPX formats
- Additional activity types (cycling, hiking)
- Route mapping with visual track display
- Social sharing features
- Workout plans and goals

### Contributing
This is a standalone web application that can be easily modified:
1. Fork or download the repository
2. Make your changes to HTML, CSS, or JavaScript
3. Test in multiple browsers
4. Share your improvements!

## 📄 License

This project is open source and available under the MIT License. Feel free to use, modify, and distribute as needed.

## 🏃‍♂️ Happy Running!

Start tracking your activities today and watch your progress grow. Whether you're a casual walker or a serious runner, RunTracker provides all the tools you need to monitor and improve your fitness journey.

---

**Made with ❤️ for runners and walkers everywhere**