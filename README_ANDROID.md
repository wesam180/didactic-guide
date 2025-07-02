# 🏃‍♀️ RunTracker Android App

A native Android application for tracking your running and walking activities, built with Capacitor and enhanced with native Android features.

## 📱 Android Features

### Native Integration
- **GPS Tracking**: High-accuracy location tracking with background support
- **Haptic Feedback**: Tactile feedback for button presses and activity completion
- **App Lifecycle**: Proper handling of app backgrounding during workouts
- **Status Bar**: Customized status bar with app colors
- **Back Button**: Smart back button handling with workout protection
- **Portrait Lock**: Optimized for portrait orientation

### Permissions
- 📍 **Location Access**: For GPS tracking and distance calculation
- 🔋 **Wake Lock**: Keeps screen active during workouts
- 📳 **Vibration**: For haptic feedback
- 🌐 **Network State**: For improved GPS accuracy

## 🛠️ Build Requirements

### Prerequisites
- **Node.js** 18+ 
- **Android Studio** with Android SDK
- **Java Development Kit (JDK)** 17+
- **Gradle** (bundled with Android Studio)

### Android SDK Requirements
- **Minimum SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **Compile SDK**: 34

## 🚀 Quick Start

### 1. Setup Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd runtracker

# Install dependencies
npm install

# Initial setup
npm run setup
```

### 2. Build and Run

```bash
# Build and sync to Android
npm run android:sync

# Open in Android Studio
npm run android:open

# Or run directly on device/emulator
npm run android:run
```

## 📋 Build Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Initial project setup |
| `npm run build` | Build web assets and copy to www/ |
| `npm run android:sync` | Build and sync to Android project |
| `npm run android:open` | Open Android project in Android Studio |
| `npm run android:run` | Build and run on emulator |
| `npm run android:run-device` | Build and run on connected device |
| `npm run android:build` | Build Android APK |
| `npm run android:clean` | Clean Android build cache |

## 🔧 Development Workflow

### 1. Web Development
Make changes to `index.html`, `styles.css`, or `script.js`

### 2. Sync Changes
```bash
npm run android:sync
```

### 3. Test in Android Studio
```bash
npm run android:open
```

### 4. Run on Device
```bash
npm run android:run-device
```

## 📱 Device Testing

### Android Emulator
1. Create an AVD in Android Studio with API 24+
2. Start the emulator
3. Run: `npm run android:run`

### Physical Device
1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run: `npm run android:run-device`

## 🎯 Android-Specific Features

### GPS Tracking
- Uses Capacitor Geolocation plugin for native GPS access
- Requests proper permissions at runtime
- Handles GPS errors gracefully
- Background location tracking support

### User Experience
- **Haptic Feedback**: Light vibration on button taps
- **Completion Feedback**: Strong vibration when workout completes
- **Back Button Protection**: Warns user before exiting during active workout
- **Status Bar**: Matches app theme colors

### Performance
- **Background Tracking**: Continues tracking when app is minimized
- **Battery Optimization**: Efficient GPS polling intervals
- **Memory Management**: Proper cleanup of GPS watchers

## 🔒 Permissions Explained

| Permission | Usage |
|------------|-------|
| `ACCESS_FINE_LOCATION` | High-accuracy GPS tracking |
| `ACCESS_COARSE_LOCATION` | Fallback location access |
| `ACCESS_BACKGROUND_LOCATION` | Continue tracking when app backgrounded |
| `WAKE_LOCK` | Prevent device sleep during workouts |
| `VIBRATE` | Haptic feedback |
| `ACCESS_NETWORK_STATE` | Improve GPS accuracy |

## 🐛 Troubleshooting

### Build Issues

**Problem**: `npx cap sync android` fails
```bash
# Clean and retry
npm run android:clean
npm run setup
```

**Problem**: Gradle build fails
```bash
# Update Android SDK and build tools in Android Studio
# Clean project
cd android
./gradlew clean
cd ..
npm run android:sync
```

### Runtime Issues

**Problem**: GPS not working
- Ensure location permissions are granted
- Check if device location services are enabled
- Try on physical device (emulator GPS can be unreliable)

**Problem**: App crashes on start
- Check Android logs in Android Studio
- Ensure all native plugins are properly installed
- Verify minimum SDK requirements

### Permission Issues

**Problem**: Location permission denied
- Check AndroidManifest.xml for proper permissions
- Request permissions at runtime
- Explain to user why location access is needed

## 📦 Building Release APK

### Debug APK
```bash
npm run android:build
```
APK location: `android/app/build/outputs/apk/debug/`

### Release APK
1. Generate signing key:
```bash
keytool -genkey -v -keystore runtracker-release-key.keystore -alias runtracker -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `capacitor.config.ts`:
```typescript
android: {
  buildOptions: {
    keystorePath: 'path/to/runtracker-release-key.keystore',
    keystorePassword: 'your-keystore-password',
    keystoreAlias: 'runtracker',
    keystoreAliasPassword: 'your-alias-password',
    releaseType: 'APK'
  }
}
```

3. Build release:
```bash
npm run android:build
```

## 🚀 Publishing to Google Play

1. **Prepare Assets**:
   - App icons (48x48 to 512x512)
   - Screenshots for different device sizes
   - Feature graphic (1024x500)
   - App description

2. **Create Play Console Account**:
   - Pay one-time registration fee
   - Verify identity

3. **Upload APK**:
   - Create new app in Play Console
   - Upload signed APK
   - Fill in store listing details
   - Submit for review

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
npm update
npx cap sync android
```

### Updating Capacitor
```bash
npm install @capacitor/core@latest @capacitor/cli@latest
npx cap sync android
```

### Code Signing
- Keep signing keys secure and backed up
- Use same signature for all app updates
- Consider using Google Play App Signing

## 📋 Testing Checklist

- [ ] GPS tracking works on device
- [ ] Background tracking continues when app minimized
- [ ] Haptic feedback on interactions
- [ ] App handles back button properly during workouts
- [ ] Permissions requested appropriately
- [ ] No crashes on different Android versions
- [ ] Battery usage is reasonable
- [ ] UI responds well to different screen sizes

## 🏃‍♂️ Next Steps

Once built, your RunTracker Android app will have:
- Native Android performance
- Proper GPS integration
- Professional user experience
- Google Play Store compatibility

Happy running! 🎯