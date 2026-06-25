# HR Mobile App - Setup & Configuration Guide

## 🎨 Features Implemented

### 1. **Login Screen**
- Clean, modern UI matching the web design
- Apple-inspired design with web color scheme (#0071e3 primary color)
- Username and password authentication
- Show/hide password toggle
- Animated transitions
- Form validation

### 2. **Attendance Screen**
- Real API integration for clock in/out
- GPS location tracking
- Photo capture for attendance validation
- Location permission handling
- Real-time status indicators
- Check-in/Check-out toggles
- Remark field

### 3. **Authentication Flow**
- Login/Logout functionality
- Session management
- Protected routes
- User profile integration

### 4. **Profile Screen**
- Logout button with confirmation
- User information display

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js installed
- Bun or npm package manager
- Expo CLI
- Backend server running

### Step 1: Install Dependencies

```bash
cd mobile-app-hr
bun install
# or
npm install
```

### Step 2: Configure Backend URL

Open `src/services/api.js` and update the `BASE_URL`:

```javascript
// For Android Emulator
const BASE_URL = 'http://10.0.2.2:3000';

// For iOS Simulator
const BASE_URL = 'http://localhost:3000';

// For Physical Device (use your computer's IP)
const BASE_URL = 'http://192.168.1.XXX:3000';
```

**Important:** Make sure your backend server is running on the specified port (default: 3000).

### Step 3: Start the Backend Server

```bash
cd Backend
npm start
# or
bun run server.js
```

Ensure the backend is accessible from your mobile device/emulator.

### Step 4: Start the Mobile App

```bash
cd mobile-app-hr
npm start
# or
bun run start
```

Then:
- Press `a` for Android
- Press `i` for iOS
- Scan QR code with Expo Go app on your physical device

---

## 📱 Usage Guide

### Login
1. Open the app
2. Enter your username and password
3. Tap "Login"
4. On success, you'll be redirected to the Home screen

### Attendance Check-In/Check-Out
1. Tap the **fingerprint icon** (floating action button) or navigate to Attendance
2. Grant location permissions when prompted
3. Tap to take a selfie photo
4. Select "Check In" or "Check Out"
5. Add optional remarks
6. Tap "Submit Check In" or "Submit Check Out"
7. Wait for confirmation

### Logout
1. Navigate to Profile tab
2. Scroll down
3. Tap "Logout" button
4. Confirm logout

---

## 🔧 API Integration Details

### Authentication Endpoints
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/logout` - User logout
- **GET** `/api/auth/getMe` - Get user profile

### Attendance Endpoints
- **POST** `/api/attendance/clock` - Record attendance

#### Request Body for Clock:
```json
{
  "time_mode_id": 1,
  "latitude": "11.5564",
  "longitude": "104.9282",
  "isMocked": false
}
```

---

## 🎨 Design System

### Colors (Matching Web Design)
- **Primary Blue**: `#0071e3` (from web design)
- **Background**: `#F5F5F7` (Apple-style gray)
- **Card White**: `#FFFFFF`
- **Text Primary**: `#1d1d1f`
- **Text Muted**: `#6e6e73`
- **Border**: `#e3e3e8`

### Mobile App Accent Colors
- **Orange**: `#F09A37` (mobile accent)
- **Blue**: `#1A5F7A` (mobile accent)

---

## ⚠️ Important Notes

### Backend Configuration
1. **CORS**: Ensure your backend allows requests from your mobile app
2. **Authentication**: The app expects JWT token-based authentication
3. **Cookie vs Token**: Current implementation may need adjustment based on how your backend returns the auth token

### Location Services
- The app requires location permissions for attendance
- GPS must be enabled on the device
- The backend validates if the user is within the allowed radius

### Time Mode IDs
In `AttendanceScreen.jsx`, update these IDs based on your database:
```javascript
const timeModeId = checkType === 'Check In' ? 1 : 2;
```

You may need to:
1. Fetch available time modes from the backend
2. Or hardcode the correct IDs from your `timemode` table

---

## 🐛 Troubleshooting

### "Network request failed"
- Check if backend server is running
- Verify BASE_URL is correct for your device
- Ensure device and backend are on the same network (for physical devices)

### Location not working
- Grant location permissions
- Enable GPS on device
- Try reloading the app

### Login fails
- Verify credentials
- Check backend logs for errors
- Ensure user has "Admin" role (based on backend validation)

### Attendance clock fails
- Verify you're within the allowed location radius
- Check if time_mode_id exists in database
- Ensure user is authenticated

---

## 📦 Dependencies Added

- `expo-location` ~17.0.1 - For GPS location tracking

---

## 🔐 Security Considerations

For production:
1. Use `@react-native-async-storage/async-storage` to persist auth tokens
2. Implement token refresh mechanism
3. Use HTTPS for all API calls
4. Add biometric authentication (optional)
5. Secure sensitive data

---

## 🎯 Next Steps (Optional Enhancements)

- [ ] Add token persistence with AsyncStorage
- [ ] Implement token refresh logic
- [ ] Add push notifications
- [ ] Add offline mode support
- [ ] Add attendance history view
- [ ] Add leave request functionality
- [ ] Add profile photo upload
- [ ] Add biometric login (Face ID / Touch ID)
- [ ] Add dark mode support (already partially implemented)

---

## 📞 Support

If you encounter issues:
1. Check backend console logs
2. Check Expo console for errors
3. Verify API endpoints match backend routes
4. Test API endpoints with Postman first

---

**Created:** 2026-05-28
**Version:** 1.0.0
