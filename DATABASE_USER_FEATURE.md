# Database User Fetching Feature

## Overview
This feature provides complete CRUD (Create, Read, Update, Delete) operations for palm recognition user data stored in a SQLite database using MQTT communication. It includes a comprehensive UI for managing users with real-time updates and search functionality.

## Architecture

### Components Created

#### 1. Frontend Components
- **Page**: `app/palm-user-data/page.tsx` - Main UI for displaying user data
- **Hook**: `hooks/usePalmUserData.ts` - React hook for managing user data state and MQTT communication
- **Navigation**: Updated `components/app-sidebar.tsx` to include "User Database" menu item

#### 2. Backend Components
- **MQTT Handler**: `middleware/palm_database_handler.py` - Python service that handles database operations via MQTT
- **Runner Script**: `run_db_handler.sh` - Bash script to start the database handler
- **Configuration**: Updated `lib/openDoorMQTTConfig.ts` with `fetchPalmUsers()` function

#### 3. Database Schema
```sql
CREATE TABLE palm_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_access DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## MQTT Communication Flow

### Request Flow
1. **Frontend** → **MQTT Broker** (`palm/control`):
   ```json
   {
     "command": "get_users",
     "request_id": "fetch_users_1234567890_abc123",
     "timestamp": "2025-11-19T10:30:00.000Z"
   }
   ```

2. **Database Handler** → **Database Query**:
   - Connects to SQLite database
   - Executes SELECT query on palm_users table
   - Formats results as JSON

3. **Database Handler** → **MQTT Broker** (`palm/users/response`):
   ```json
   {
     "status": "success",
     "message": "Retrieved 5 users from database",
     "request_id": "fetch_users_1234567890_abc123",
     "data": [
       {
         "id": 1,
         "user_id": "user001",
         "name": "John Doe",
         "email": "john@example.com",
         "role": "admin",
         "status": "active",
         "registered_at": "2025-11-19T08:00:00.000Z",
         "last_access": "2025-11-19T10:25:00.000Z"
       }
     ],
     "count": 5,
     "timestamp": "2025-11-19T10:30:05.000Z"
   }
   ```

## Usage Instructions

### 1. Populate Sample Data (First Time Only)
```bash
# Add sample users to database for testing
python3 populate_sample_data.py
# Follow prompts to add 8 sample users
```

### 2. Start the Database Handler
```bash
# Run the database handler service
npm run db-handler

# Or run directly
./run_db_handler.sh
```

### 3. Start the Frontend
```bash
# In another terminal
npm run dev
```

### 4. Access the UI
Navigate to `/palm-user-data` in the application to view the user database interface.

### 5. Features Available
- **Fetch Users**: Click "Refresh Data" to load users from database
- **Search**: Filter users by User ID, Name, or Email
- **Statistics**: View total users, active/inactive counts
- **Real-time Updates**: Automatic refresh timestamps
- **Status Indicators**: Visual status badges (Active/Inactive/Suspended)

## Configuration

### Environment Variables
```env
# MQTT Broker Configuration
NEXT_PUBLIC_MQTT_BROKER_HOST=192.168.0.101
NEXT_PUBLIC_MQTT_BROKER_PORT=9000
```

### Database Configuration
- **Database Path**: `./data/palm_users.db`
- **Auto-creation**: Tables are created automatically on first run
- **Connection**: SQLite with row factory for dict-like access

## API Reference

### Frontend Hook API
```typescript
const {
  users,           // Array of PalmUser objects
  isLoading,       // Boolean loading state
  lastFetch,       // Date of last successful fetch
  hasData,         // Boolean indicating if data exists
  fetchUsers,      // Function to fetch users
  refreshUsers,    // Function to refresh data
  clearUsers,      // Function to clear local data
  getUserById,     // Function to find user by ID
  searchUsers,     // Function to search users
  userCount,       // Total number of users
  activeUsers,     // Count of active users
  inactiveUsers    // Count of inactive users
} = usePalmUserData();
```

### MQTT Topics
- **Command**: `palm/control` - Send database commands
- **Response**: `palm/users/response` - Receive user data
- **Status**: `palm/status` - Receive operation status

### Supported Commands
- `get_users` - Fetch all users from database
- `regist` - Register new user (existing functionality)
- `delete` - Delete user (existing functionality)

## Error Handling

### Frontend Error Handling
- **Timeout**: 10-second timeout for requests
- **Connection Errors**: Automatic retry with user feedback
- **Invalid Responses**: JSON parsing error handling
- **User Feedback**: Toast notifications for all operations

### Backend Error Handling
- **Database Errors**: Comprehensive logging and error responses
- **MQTT Connection**: Automatic reconnection attempts
- **Invalid Commands**: Command validation and error responses
- **File Logging**: All operations logged to `palm_database_handler.log`

## Security Considerations

### Database Security
- **Parameterized Queries**: All SQL queries use parameterized statements
- **Input Validation**: User input validation on both frontend and backend
- **Access Control**: MQTT topic-based access control

### Network Security
- **MQTT Authentication**: Configure broker authentication if needed
- **Request IDs**: Unique request IDs prevent replay attacks
- **Rate Limiting**: Consider implementing rate limiting for production

## Troubleshooting

### Common Issues

#### 1. "MQTT client not available"
- **Cause**: MQTT broker not running or unreachable
- **Solution**: Check broker configuration and network connectivity

#### 2. "Database connection failed"
- **Cause**: Database file permissions or path issues
- **Solution**: Check file permissions and ensure data directory exists

#### 3. "No users found"
- **Cause**: Database is empty or table doesn't exist
- **Solution**: Check database file and table creation logs

#### 4. "Timeout error"
- **Cause**: Network latency or slow database queries
- **Solution**: Increase timeout values or optimize database queries

### Debug Mode
Enable debug logging by modifying the Python handler:
```python
logging.basicConfig(level=logging.DEBUG)  # Change from INFO to DEBUG
```

## Future Enhancements

### Planned Features
- **Real-time Updates**: Live user data synchronization
- **Bulk Operations**: Import/export user data
- **Advanced Filtering**: Filter by date ranges, roles, status
- **User Profiles**: Extended user information management
- **Audit Logging**: Track all user data access and modifications

### Performance Optimizations
- **Pagination**: Handle large user datasets
- **Caching**: Implement response caching
- **Indexing**: Add database indexes for better query performance
- **Connection Pooling**: Optimize database connections

## Dependencies

### Python Requirements
- `paho-mqtt` - MQTT client library
- `sqlite3` - Database connectivity (built-in)

### Node.js Requirements
- Existing MQTT and UI dependencies
- No additional packages required

## Testing

### Manual Testing Steps
1. Start MQTT broker
2. Run database handler: `npm run db-handler`
3. Start Next.js app: `npm run dev`
4. Navigate to `/palm-user-data`
5. Click "Refresh Data" to test functionality

### Automated Testing
Consider adding tests for:
- MQTT communication reliability
- Database operations
- UI component rendering
- Error handling scenarios

## Real-time Database Sync dari Palm Device

### 🎯 **Opsi Implementasi untuk Database Realtime**

#### **1. MQTT-based Biometric Sync (REKOMENDASI)**
Palm device secara otomatis mengirim data biometric ke database server via MQTT:

**Keunggulan:**
- ✅ Real-time synchronization
- ✅ Automatic failover dan reconnection
- ✅ Low bandwidth usage
- ✅ Centralized data management
- ✅ Works across different networks

**Implementasi:**
```python
# Pada Palm Device (Publisher)
import paho.mqtt.client as mqtt
import json

def send_biometric_data(phone_number, rgb_feature, ir_feature):
    payload = {
        "command": "sync_biometric_data",
        "phone_number": phone_number,
        "rgb_feature": rgb_feature,
        "ir_feature": ir_feature,
        "device_id": "palm_device_001"
    }

    client.publish("palm/control", json.dumps(payload))
```

**Server Response:**
```python
# Pada Database Handler (Subscriber)
def handle_sync_biometric_data(self, command_data):
    # Automatically sync to palm_feature.db
    # Publish real-time updates to UI
    # Return success/error status
```

#### **2. REST API Integration**
Palm device mengirim data via HTTP API calls:

**Keunggulan:**
- ✅ Simple implementation
- ✅ Good for batch operations
- ✅ Easy debugging
- ✅ Firewall-friendly

**Implementasi:**
```python
# Flask REST API Endpoint
@app.route('/api/biometric/sync', methods=['POST'])
def sync_biometric():
    data = request.get_json()
    # Process and save to database
    return {"status": "success"}
```

#### **3. Direct Database Connection**
Palm device connect langsung ke database:

**Keunggulan:**
- ✅ Highest performance
- ✅ No middleware needed
- ✅ Real-time queries

**Kekurangan:**
- ❌ Security risks (database exposed)
- ❌ Network complexity
- ❌ Harder to scale

### 🚀 **Implementasi MQTT Sync (Detail)**

#### **Step 1: Konfigurasi Palm Device**
```python
# palm_device_config.py
MQTT_BROKER = "192.168.0.109"  # IP server database
MQTT_PORT = 1883
CLIENT_ID = "palm_device_001"

def connect_to_broker():
    client = mqtt.Client(CLIENT_ID)
    client.connect(MQTT_BROKER, MQTT_PORT)
    return client
```

#### **Step 2: Kirim Data Biometric**
```python
# biometric_sync.py
def sync_user_biometric(phone_number, rgb_data, ir_data):
    payload = {
        "command": "sync_biometric_data",
        "phone_number": phone_number,
        "rgb_feature": rgb_data.hex(),  # Convert to hex string
        "ir_feature": ir_data.hex(),
        "device_id": CLIENT_ID,
        "timestamp": datetime.now().isoformat()
    }

    client.publish("palm/control", json.dumps(payload))
    print(f"✅ Synced biometric data for {phone_number}")
```

#### **Step 3: Handle di Database Server**
Database handler sudah siap menerima command `sync_biometric_data` dan:
- Insert/Update data ke `palm_feature.db`
- Publish real-time notification ke UI
- Return status ke device

#### **Step 4: Real-time UI Updates**
UI secara otomatis update ketika ada data baru:
```typescript
// hooks/usePalmUserData.ts
useEffect(() => {
  addMessageHandler("palm/realtime/updates", (topic, message) => {
    // Refresh user list
    refreshUsers();
    // Show notification
    toast.success("New biometric data synced!");
  });
}, []);
```

### 📊 **Arsitektur Lengkap**

```
┌─────────────────┐    MQTT    ┌─────────────────┐
│   Palm Device   │────────────│   MQTT Broker   │
│                 │            │   (Mosquitto)   │
│ • Capture RGB   │            │                 │
│ • Capture IR    │            │                 │
│ • Extract       │            └─────────────────┘
│   Features      │                    │
│ • Send via MQTT │                    │
└─────────────────┘                    │
                                       │
┌─────────────────┐    MQTT    ┌─────────────────┐
│  Database       │◄───────────┤  Database       │
│  Handler        │            │  Handler        │
│                 │            │                 │
│ • Receive data  │            │ • Process       │
│ • Validate      │            │   commands      │
│ • Save to DB    │            │ • Update UI     │
│ • Send response │            │ • Send status   │
└─────────────────┘            └─────────────────┘
                                       │
┌─────────────────┐    WebSocket├─────────────────┐
│   Web UI        │◄────────────│   MQTT Broker   │
│                 │            │                 │
│ • Display users │            │                 │
│ • Real-time     │            │                 │
│   updates       │            │                 │
│ • CRUD          │            │                 │
│   operations    │            │                 │
└─────────────────┘            └─────────────────┘
```

### 🔧 **Konfigurasi Production**

#### **Environment Variables:**
```bash
# .env.production
MQTT_BROKER_HOST=192.168.0.109
MQTT_BROKER_PORT=1883
DATABASE_PATH=/data/palm_feature.db
```

#### **Docker Compose Setup:**
```yaml
version: '3.8'
services:
  mqtt-broker:
    image: eclipse-mosquitto
    ports:
      - "1883:1883"
      - "9000:9000"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf

  palm-database:
    build: .
    environment:
      - MQTT_BROKER_HOST=mqtt-broker
      - DATABASE_PATH=/app/data/palm_feature.db
    depends_on:
      - mqtt-broker
```

### 📈 **Monitoring & Logging**

#### **Real-time Monitoring:**
- MQTT message throughput
- Database sync success rate
- Device connection status
- UI update latency

#### **Logging:**
```python
# Enhanced logging in database handler
logger.info(f"Biometric sync: {phone_number} from {device_id}")
logger.info(f"Database updated: {len(rgb_feature)} bytes RGB data")
```

### 🛡️ **Security Considerations**

#### **Authentication:**
- MQTT username/password
- Device certificates
- API tokens untuk REST

#### **Data Encryption:**
- TLS untuk MQTT connections
- Encrypted biometric data
- Secure database access

#### **Access Control:**
- Device authorization
- Database permissions
- Network segmentation

### 🎯 **Cara Testing Real-time Sync**

#### **1. Setup Test Environment:**
```bash
# Start MQTT broker
mosquitto

# Start database handler
npm run db-handler

# Start web UI
npm run dev
```

#### **2. Simulate Palm Device:**
```python
# test_sync.py
import paho.mqtt.client as mqtt
import json

client = mqtt.Client("test_device")
client.connect("localhost", 1883)

# Send test biometric data
test_data = {
    "command": "sync_biometric_data",
    "phone_number": "test_user - left",
    "rgb_feature": "aabbcc" * 1000,  # Dummy hex data
    "ir_feature": "ddeeff" * 1000,
    "device_id": "test_device"
}

client.publish("palm/control", json.dumps(test_data))
print("✅ Test biometric data sent")
```

#### **3. Verify Results:**
- Check database: `sqlite3 palm_feature.db "SELECT * FROM Usr;"`
- Check UI: Refresh `/palm-user-data` page
- Check logs: `tail -f palm_database_handler.log`

### 🚀 **Rekomendasi Implementasi**

**Untuk Production:**
1. **Gunakan MQTT-based sync** untuk real-time performance
2. **Implement device authentication** untuk security
3. **Setup monitoring** untuk reliability
4. **Use Docker** untuk easy deployment
5. **Backup database regularly**

**Keunggulan MQTT Approach:**
- ✅ **Real-time**: Data sync dalam miliseconds
- ✅ **Reliable**: Automatic reconnection
- ✅ **Scalable**: Support banyak devices
- ✅ **Efficient**: Low bandwidth usage
- ✅ **Centralized**: Single point of management

---

**Kesimpulan**: Dengan implementasi MQTT-based biometric sync, palm device Anda dapat mengirim data biometric secara real-time ke database server, dan UI akan otomatis update dengan data terbaru! 🎉
