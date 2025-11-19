#!/usr/bin/env python3
"""
Palm Recognition Database Handler
Handles database operations for palm user management via MQTT
"""

import json
import sqlite3
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import paho.mqtt.client as mqtt

# Configuration file path
MQTT_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "mqtt_config.json")
DATABASE_PATH = "./palm_feature.db"  # Use existing biometric database

# Default MQTT Topics (fallback if not in config)
DEFAULT_PALM_CONTROL_TOPIC = "palm/control"
DEFAULT_PALM_STATUS_TOPIC = "palm/status"
DEFAULT_PALM_USERS_RESPONSE_TOPIC = "palm/users/response"

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('palm_database_handler.log')
    ]
)
logger = logging.getLogger(__name__)


class MQTTConfigManager:
    """Manages MQTT configuration from mqtt_config.json file"""

    def __init__(self, config_file: str = MQTT_CONFIG_FILE):
        self.config_file = config_file
        self.config = {}
        self.last_modified = 0
        self.load_config()

    def load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            if os.path.exists(self.config_file):
                # Check if file has been modified
                current_modified = os.path.getmtime(self.config_file)
                if current_modified > self.last_modified:
                    with open(self.config_file, 'r') as f:
                        self.config = json.load(f)
                    self.last_modified = current_modified
                    logger.info(f"Loaded MQTT configuration from {self.config_file}")
                    logger.info(f"Configuration: {self.config}")
                # No log for unchanged config to avoid spam
            else:
                logger.warning(f"Configuration file {self.config_file} not found, using defaults")
                self.config = self.get_default_config()
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            self.config = self.get_default_config()

        return self.config

    def get_default_config(self) -> Dict[str, Any]:
        """Get default configuration values"""
        return {
            "enable": True,
            "broker_address": "localhost",
            "broker_port": 1883,
            "username": "",
            "password": "",
            "qos": 1,
            "retain": True,
            "pub_topic_status": DEFAULT_PALM_STATUS_TOPIC,
            "pub_topic_result": "palm/compare/result",
            "sub_topic": DEFAULT_PALM_CONTROL_TOPIC
        }

    def get_broker_host(self) -> str:
        """Get MQTT broker host"""
        return self.config.get("broker_address", "localhost")

    def get_broker_port(self) -> int:
        """Get MQTT broker port"""
        return self.config.get("broker_port", 1883)

    def get_username(self) -> str:
        """Get MQTT username"""
        return self.config.get("username", "")

    def get_password(self) -> str:
        """Get MQTT password"""
        return self.config.get("password", "")

    def get_qos(self) -> int:
        """Get MQTT QoS level"""
        return self.config.get("qos", 1)

    def get_retain(self) -> bool:
        """Get MQTT retain flag"""
        return self.config.get("retain", True)

    def get_control_topic(self) -> str:
        """Get MQTT control topic"""
        return self.config.get("sub_topic", DEFAULT_PALM_CONTROL_TOPIC)

    def get_status_topic(self) -> str:
        """Get MQTT status topic"""
        return self.config.get("pub_topic_status", DEFAULT_PALM_STATUS_TOPIC)

    def get_users_response_topic(self) -> str:
        """Get MQTT users response topic"""
        return DEFAULT_PALM_USERS_RESPONSE_TOPIC  # This is not in config, use default

    def is_enabled(self) -> bool:
        """Check if MQTT is enabled"""
        return self.config.get("enable", True)

    def reload_if_changed(self) -> bool:
        """Reload configuration if file has changed"""
        try:
            if os.path.exists(self.config_file):
                current_modified = os.path.getmtime(self.config_file)
                if current_modified > self.last_modified:
                    self.load_config()
                    return True
        except Exception as e:
            logger.error(f"Error checking configuration file changes: {e}")
        return False


class PalmDatabaseHandler:
    """Handles palm user database operations via MQTT"""

    def __init__(self, config_file: str = MQTT_CONFIG_FILE):
        # Initialize configuration manager
        self.config_manager = MQTTConfigManager(config_file)

        # Initialize MQTT client properties (will be set from config)
        self.broker_host = None
        self.broker_port = None
        self.username = None
        self.password = None
        self.qos = None
        self.retain = None

        # MQTT topics (will be set from config)
        self.control_topic = None
        self.status_topic = None
        self.users_response_topic = None

        # MQTT client and connection state
        self.client = None
        self.connected = False
        self.db_connection = None

        # Load initial configuration
        self.reload_config()

    def reload_config(self):
        """Reload configuration from config manager"""
        # Reload config if changed
        config_changed = self.config_manager.reload_if_changed()

        # Update MQTT client properties from config
        self.broker_host = self.config_manager.get_broker_host()
        self.broker_port = self.config_manager.get_broker_port()
        self.username = self.config_manager.get_username()
        self.password = self.config_manager.get_password()
        self.qos = self.config_manager.get_qos()
        self.retain = self.config_manager.get_retain()

        # Update MQTT topics from config
        self.control_topic = self.config_manager.get_control_topic()
        self.status_topic = self.config_manager.get_status_topic()
        self.users_response_topic = self.config_manager.get_users_response_topic()

        if config_changed:
            logger.info("Configuration reloaded - new settings applied")
            logger.info(f"Broker: {self.broker_host}:{self.broker_port}")
            logger.info(f"Control Topic: {self.control_topic}")
            logger.info(f"Status Topic: {self.status_topic}")
            logger.info(f"Users Response Topic: {self.users_response_topic}")

            # If client is already connected, we might need to reconnect with new settings
            if self.client and self.connected:
                logger.info("Client is connected - changes will take effect on next reconnection")

    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            self.connected = True
            logger.info(f"Connected to MQTT broker at {self.broker_host}:{self.broker_port}")

            # Subscribe to control topic
            client.subscribe(self.control_topic, qos=self.qos)
            logger.info(f"Subscribed to topic: {self.control_topic}")
        else:
            logger.error(f"Failed to connect to MQTT broker. Return code: {rc}")
            self.connected = False

    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.connected = False
        if rc != 0:
            logger.warning(f"Unexpected disconnection from MQTT broker. Return code: {rc}")
        else:
            logger.info("Disconnected from MQTT broker")

    def on_message(self, client, userdata, message):
        """Callback when message is received"""
        try:
            topic = message.topic
            payload = message.payload.decode('utf-8')

            logger.info(f"Received message on topic '{topic}': {payload}")

            if topic == self.control_topic:
                self.process_control_command(payload)

        except Exception as e:
            logger.error(f"Error processing message: {e}")

    def process_control_command(self, payload: str):
        """Process incoming control commands"""
        try:
            command_data = json.loads(payload)
            command = command_data.get('command')
            request_id = command_data.get('request_id')

            logger.info(f"Processing command: {command}, request_id: {request_id}")

            if command == 'get_users':
                self.handle_get_users(request_id)
            elif command == 'regist':
                self.handle_register_user(command_data)
            elif command == 'delete':
                self.handle_delete_user(command_data)
            elif command == 'start_enrollment':
                self.handle_start_enrollment(command_data)
            elif command == 'update_user':
                self.handle_update_user(command_data)
            elif command == 'sync_biometric_data':
                self.handle_sync_biometric_data(command_data)
            else:
                logger.warning(f"Unknown command: {command}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON payload: {e}")
        except Exception as e:
            logger.error(f"Error processing control command: {e}")

    def handle_get_users(self, request_id: str):
        """Handle get_users command - fetch all users from database"""
        try:
            users = self.get_all_users()

            # Debug logging for data being sent
            logger.info(f"Sending response with {len(users)} users")
            if users:
                logger.info(f"First user sample: {users[0]}")

            response = {
                "status": "success",
                "message": f"Retrieved {len(users)} users from database",
                "request_id": request_id,
                "data": users,
                "count": len(users),
                "timestamp": datetime.now().isoformat()
            }

            # Publish response
            if self.client and self.client.is_connected():
                self.client.publish(self.users_response_topic, json.dumps(response), qos=self.qos, retain=self.retain)
                logger.info(f"Published user data response for request {request_id}: {len(users)} users")
            else:
                logger.error("MQTT client not connected, cannot send response")

        except Exception as e:
            logger.error(f"Error handling get_users command: {e}")

            # Send error response
            error_response = {
                "status": "error",
                "message": f"Failed to fetch users: {str(e)}",
                "request_id": request_id,
                "data": [],
                "count": 0,
                "timestamp": datetime.now().isoformat()
            }

            if self.client and self.client.is_connected():
                self.client.publish(self.users_response_topic, json.dumps(error_response), qos=self.qos, retain=self.retain)

    def handle_register_user(self, command_data: Dict[str, Any]):
        """Handle user registration - forward to palm device"""
        try:
            user_id = command_data.get('user_id')
            if not user_id:
                self.send_status_response("error", "'user_id' missing in regist command")
                return

            # Forward register command to palm device - don't check local database
            success = self.forward_register_to_device(user_id)
            if success:
                logger.info(f"Register command forwarded to palm device for user '{user_id}'")
                # Don't send response here - let palm device handle the response
            else:
                self.send_status_response("error", "Failed to forward register command to device")

        except Exception as e:
            logger.error(f"Error forwarding register command: {e}")
            self.send_status_response("error", "Failed to forward register command")

    def set_device_to_regist_mode(self, user_id: str) -> bool:
        """Set palm device to regist mode for biometric enrollment"""
        try:
            # Send command to set device to regist mode
            regist_command = {
                "command": "set_regist_mode",
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }

            if self.client and self.client.is_connected():
                self.client.publish("palm/device/control", json.dumps(regist_command), qos=self.qos, retain=False)
                logger.info(f"Sent set regist mode command for user '{user_id}' to palm device")
                return True
            else:
                logger.error("MQTT client not connected, cannot send regist mode command")
                return False

        except Exception as e:
            logger.error(f"Error sending regist mode command: {e}")
            return False

    def handle_start_enrollment(self, command_data: Dict[str, Any]):
        """Handle start_enrollment command - initiate biometric scanning"""
        try:
            user_id = command_data.get('user_id')
            if not user_id:
                self.send_status_response("error", "'user_id' missing in start_enrollment command")
                return

            # Check if user exists
            if not self.user_exists(user_id):
                self.send_status_response("error", f"user '{user_id}' not found - register user first")
                return

            # Start biometric enrollment process
            success = self.start_biometric_enrollment(user_id)
            if success:
                self.send_status_response("ok", f"biometric enrollment started for user '{user_id}'")
            else:
                self.send_status_response("error", "Failed to start biometric enrollment")

        except Exception as e:
            logger.error(f"Error starting biometric enrollment: {e}")
            self.send_status_response("error", "Failed to start biometric enrollment")

    def start_biometric_enrollment(self, user_id: str) -> bool:
        """Start biometric enrollment process by sending command to palm device"""
        try:
            # Send command to palm device to start biometric scanning
            # The palm device should respond with sync_biometric_data when scanning is complete
            enrollment_command = {
                "command": "start_biometric_scan",
                "user_id": user_id,
                "scan_type": "enrollment",
                "timestamp": datetime.now().isoformat()
            }

            if self.client and self.client.is_connected():
                self.client.publish("palm/device/control", json.dumps(enrollment_command), qos=self.qos, retain=False)
                logger.info(f"Sent biometric enrollment command for user '{user_id}' to palm device")
                return True
            else:
                logger.error("MQTT client not connected, cannot send enrollment command")
                return False

        except Exception as e:
            logger.error(f"Error sending biometric enrollment command: {e}")
            return False

    def handle_delete_user(self, command_data: Dict[str, Any]):
        """Handle user deletion - forward to palm device"""
        try:
            user_id = command_data.get('user_id')
            if not user_id:
                self.send_status_response("error", "'user_id' missing for delete command")
                return

            # Forward delete command to palm device - don't check local database
            success = self.forward_delete_to_device(user_id)
            if success:
                logger.info(f"Delete command forwarded to palm device for user '{user_id}'")
                # Don't send response here - let palm device handle the response
            else:
                self.send_status_response("error", "Failed to forward delete command to device")

        except Exception as e:
            logger.error(f"Error forwarding delete command: {e}")
            self.send_status_response("error", "Failed to forward delete command")

    def forward_delete_to_device(self, user_id: str) -> bool:
        """Forward delete command to palm device"""
        try:
            # Send delete command to palm device
            delete_command = {
                "command": "delete",
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }

            if self.client and self.client.is_connected():
                # Send to palm device control topic
                self.client.publish("palm/device/control", json.dumps(delete_command), qos=self.qos, retain=False)
                logger.info(f"Sent delete command for user '{user_id}' to palm device")
                return True
            else:
                logger.error("MQTT client not connected, cannot send delete command")
                return False

        except Exception as e:
            logger.error(f"Error sending delete command: {e}")
            return False

    def forward_register_to_device(self, user_id: str) -> bool:
        """Forward register command to palm device"""
        try:
            # Send register command to palm device
            register_command = {
                "command": "regist",
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }

            if self.client and self.client.is_connected():
                # Send to palm device control topic
                self.client.publish("palm/device/control", json.dumps(register_command), qos=self.qos, retain=False)
                logger.info(f"Sent register command for user '{user_id}' to palm device")
                return True
            else:
                logger.error("MQTT client not connected, cannot send register command")
                return False

        except Exception as e:
            logger.error(f"Error sending register command: {e}")
            return False

    def send_status_response(self, status: str, message: str):
        """Send status response to palm/status topic"""
        try:
            response = {
                "status": status,
                "message": message,
                "timestamp": datetime.now().isoformat()
            }

            if self.client and self.client.is_connected():
                self.client.publish(self.status_topic, json.dumps(response), qos=self.qos, retain=self.retain)
                logger.info(f"Sent status response: {status} - {message}")
            else:
                logger.error("MQTT client not connected, cannot send status response")

        except Exception as e:
            logger.error(f"Error sending status response: {e}")

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Fetch all users from palm_feature.db Usr table"""
        try:
            self.ensure_db_connection()

            cursor = self.db_connection.cursor()
            cursor.execute("""
                SELECT id, phone_number, rgb_feature, ir_feature, registe_time
                FROM Usr
                ORDER BY registe_time DESC
            """)

            rows = cursor.fetchall()
            users = []

            for row in rows:
                # Handle different row types
                if hasattr(row, 'keys'):  # Row factory returns dict-like object
                    user_dict = dict(row)
                else:  # Standard tuple
                    columns = [desc[0] for desc in cursor.description] if cursor.description else []
                    if len(columns) != len(row):
                        logger.warning(f"Column count mismatch: {len(columns)} columns vs {len(row)} values")
                        continue
                    user_dict = dict(zip(columns, row))

                # Safely extract values from user_dict
                phone_number = user_dict.get('phone_number')
                user_id_from_db = user_dict.get('id')  # This contains the actual user identifier like "user - left"
                registe_time = user_dict.get('registe_time')

                # For this database, phone_number is always NULL, so use id column as user_id
                if user_id_from_db and str(user_id_from_db).strip():
                    phone_number = str(user_id_from_db).strip()
                elif phone_number:
                    phone_number = str(phone_number).strip()
                else:
                    phone_number = 'Unknown'

                # Get current timestamp for missing registration data
                current_time = datetime.now().isoformat()

                # Map palm_feature.db schema to UI-friendly format
                mapped_user = {
                    'id': len(users) + 1,  # Generate sequential ID for UI
                    'user_id': phone_number,
                    'name': self.extract_name_from_phone_number(phone_number),
                    'email': '',  # Not available in biometric DB
                    'role': 'user',  # Default role
                    'status': 'active',  # Assume all biometric users are active
                    'registered_at': registe_time or current_time,  # Use current time if NULL
                    'last_access': registe_time or current_time,  # Use current time if NULL
                    'has_biometric': True,  # Flag indicating biometric data exists
                    'rgb_feature_length': len(user_dict.get('rgb_feature') or ''),
                    'ir_feature_length': len(user_dict.get('ir_feature') or '')
                }

                users.append(mapped_user)

            cursor.close()
            logger.info(f"Successfully retrieved {len(users)} biometric users from palm_feature.db")
            return users

        except Exception as e:
            logger.error(f"Error fetching users from palm_feature.db: {e}")
            return []

    def extract_name_from_phone_number(self, phone_number) -> str:
        """Extract user name from phone_number format (e.g., 'user - left' -> 'user')"""
        if phone_number is None:
            return "Unknown"

        if not isinstance(phone_number, str):
            return str(phone_number)

        if ' - ' in phone_number:
            return phone_number.split(' - ')[0]
        return phone_number

    def handle_sync_biometric_data(self, command_data: Dict[str, Any]):
        """Handle biometric data synchronization from palm device - complete registration"""
        try:
            phone_number = command_data.get('phone_number')
            rgb_feature = command_data.get('rgb_feature')
            ir_feature = command_data.get('ir_feature')
            device_id = command_data.get('device_id', 'unknown')

            if not phone_number:
                self.send_status_response("error", "'phone_number' missing in sync_biometric_data command")
                return

            # Sync biometric data to database - this completes the registration process
            success = self.sync_biometric_data_to_db(phone_number, rgb_feature, ir_feature, device_id)
            if success:
                # Send final registration success message
                self.send_status_response("ok", "user successfully registered")
                logger.info(f"User {phone_number} registration completed with biometric data from device {device_id}")
            else:
                self.send_status_response("error", "Failed to complete user registration")

        except Exception as e:
            logger.error(f"Error completing user registration: {e}")
            self.send_status_response("error", "Failed to complete user registration")

    def sync_biometric_data_to_db(self, phone_number: str, rgb_feature: str = None, ir_feature: str = None, device_id: str = 'unknown') -> bool:
        """Sync biometric data from palm device to database"""
        try:
            self.ensure_db_connection()

            cursor = self.db_connection.cursor()

            # Check if user already exists
            cursor.execute("SELECT COUNT(*) FROM Usr WHERE phone_number = ?", (phone_number,))
            exists = cursor.fetchone()[0] > 0

            current_time = datetime.now().isoformat()

            if exists:
                # Update existing user
                update_fields = ["registe_time = ?"]
                values = [current_time]

                if rgb_feature is not None:
                    update_fields.append("rgb_feature = ?")
                    values.append(rgb_feature)

                if ir_feature is not None:
                    update_fields.append("ir_feature = ?")
                    values.append(ir_feature)

                values.append(phone_number)  # WHERE clause

                query = f"""
                    UPDATE Usr
                    SET {', '.join(update_fields)}
                    WHERE phone_number = ?
                """

                cursor.execute(query, values)
                logger.info(f"Updated biometric data for existing user {phone_number}")

            else:
                # Insert new user
                cursor.execute("""
                    INSERT INTO Usr (phone_number, rgb_feature, ir_feature, registe_time)
                    VALUES (?, ?, ?, ?)
                """, (phone_number, rgb_feature or '', ir_feature or '', current_time))
                logger.info(f"Inserted new biometric user {phone_number}")

            self.db_connection.commit()
            cursor.close()

            # Publish real-time update to UI
            self.publish_realtime_update(phone_number, device_id)

            return True

        except Exception as e:
            logger.error(f"Error syncing biometric data to database: {e}")
            return False

    def publish_realtime_update(self, phone_number: str, device_id: str):
        """Publish real-time update notification to UI"""
        try:
            update_message = {
                "type": "biometric_sync",
                "phone_number": phone_number,
                "device_id": device_id,
                "timestamp": datetime.now().isoformat(),
                "message": f"Biometric data synced for user {phone_number}"
            }

            if self.client and self.client.is_connected():
                self.client.publish("palm/realtime/updates", json.dumps(update_message), qos=1, retain=False)
                logger.info(f"Published real-time update for user {phone_number}")

        except Exception as e:
            logger.error(f"Error publishing real-time update: {e}")

    def user_exists(self, user_id: str) -> bool:
        """Check if user exists in palm_feature.db Usr table"""
        try:
            self.ensure_db_connection()

            cursor = self.db_connection.cursor()
            # Check both phone_number and id columns since phone_number is often NULL
            cursor.execute("SELECT COUNT(*) FROM Usr WHERE phone_number = ? OR id = ?", (user_id, user_id))
            count = cursor.fetchone()[0]
            cursor.close()

            return count > 0

        except Exception as e:
            logger.error(f"Error checking if user exists: {e}")
            return False

    def register_user_in_db(self, user_id: str) -> bool:
        """Register user in palm_feature.db (add to Usr table)"""
        try:
            self.ensure_db_connection()

            cursor = self.db_connection.cursor()

            # Check if user already exists
            cursor.execute("SELECT COUNT(*) FROM Usr WHERE phone_number = ?", (user_id,))
            if cursor.fetchone()[0] > 0:
                logger.warning(f"User {user_id} already exists in biometric database")
                return False

            # Insert new user with empty biometric data
            cursor.execute("""
                INSERT INTO Usr (phone_number, id, rgb_feature, ir_feature, registe_time)
                VALUES (?, ?, '', '', ?)
            """, (user_id, user_id, datetime.now().isoformat()))

            self.db_connection.commit()
            cursor.close()

            logger.info(f"Registered user {user_id} in palm_feature.db")
            return True

        except Exception as e:
            logger.error(f"Error registering user in database: {e}")
            return False

    def delete_user_from_db(self, user_id: str) -> bool:
        """Delete user from palm_feature.db Usr table"""
        try:
            self.ensure_db_connection()

            cursor = self.db_connection.cursor()
            # Delete from both phone_number and id columns since phone_number is often NULL
            cursor.execute("DELETE FROM Usr WHERE phone_number = ? OR id = ?", (user_id, user_id))

            deleted_count = cursor.rowcount
            self.db_connection.commit()
            cursor.close()

            if deleted_count > 0:
                logger.info(f"Deleted user {user_id} from palm_feature.db ({deleted_count} rows affected)")
                return True
            else:
                logger.warning(f"No user found with id {user_id} to delete")
                return False

        except Exception as e:
            logger.error(f"Error deleting user from database: {e}")
            return False

    def handle_create_user(self, command_data: Dict[str, Any]):
        """Handle create_user command - create new user with full data"""
        try:
            user_id = command_data.get('user_id')
            name = command_data.get('name')
            email = command_data.get('email')
            role = command_data.get('role', 'user')
            status = command_data.get('status', 'active')

            if not user_id:
                self.send_status_response("error", "'user_id' missing in create_user command")
                return

            # Check if user already exists
            if self.user_exists(user_id):
                self.send_status_response("error", f"user '{user_id}' already exists")
                return

            # Create user in database
            success = self.create_user_in_db(user_id, name, email, role, status)
            if success:
                self.send_status_response("ok", f"user '{user_id}' created successfully")
            else:
                self.send_status_response("error", "Failed to create user")

        except Exception as e:
            logger.error(f"Error creating user: {e}")
            self.send_status_response("error", "Failed to create user")

    def handle_update_user(self, command_data: Dict[str, Any]):
        """Handle update_user command - update existing user data"""
        try:
            user_id = command_data.get('user_id')
            name = command_data.get('name')
            email = command_data.get('email')
            role = command_data.get('role')
            status = command_data.get('status')

            if not user_id:
                self.send_status_response("error", "'user_id' missing in update_user command")
                return

            # Check if user exists
            if not self.user_exists(user_id):
                self.send_status_response("error", f"user '{user_id}' not found")
                return

            # Update user in database
            success = self.update_user_in_db(user_id, name, email, role, status)
            if success:
                self.send_status_response("ok", f"user '{user_id}' updated successfully")
            else:
                self.send_status_response("error", "Failed to update user")

        except Exception as e:
            logger.error(f"Error updating user: {e}")
            self.send_status_response("error", "Failed to update user")

    def create_user_in_db(self, user_id: str, name: str = None, email: str = None, role: str = 'user', status: str = 'active') -> bool:
        """Create new user in palm_feature.db Usr table"""
        try:
            self.ensure_db_connection()

            cursor = self.db_connection.cursor()

            # Check if user already exists
            cursor.execute("SELECT COUNT(*) FROM Usr WHERE phone_number = ?", (user_id,))
            if cursor.fetchone()[0] > 0:
                logger.warning(f"User {user_id} already exists in biometric database")
                return False

            # Insert new user with empty biometric data
            cursor.execute("""
                INSERT INTO Usr (phone_number, id, rgb_feature, ir_feature, registe_time)
                VALUES (?, ?, '', '', ?)
            """, (user_id, user_id, datetime.now().isoformat()))

            self.db_connection.commit()
            cursor.close()

            logger.info(f"Created user {user_id} in palm_feature.db")
            return True

        except Exception as e:
            logger.error(f"Error creating user in database: {e}")
            return False

    def update_user_in_db(self, user_id: str, name: str = None, email: str = None, role: str = None, status: str = None) -> bool:
        """Update existing user in palm_feature.db (biometric data only)"""
        try:
            self.ensure_db_connection()

            cursor = self.db_connection.cursor()

            # For palm_feature.db, we can only update biometric data
            # Name, email, role, status are not stored in this table
            logger.info(f"Update operation limited for palm_feature.db - only biometric data can be updated for user {user_id}")

            # Check if user exists
            cursor.execute("SELECT COUNT(*) FROM Usr WHERE phone_number = ?", (user_id,))
            if cursor.fetchone()[0] == 0:
                logger.warning(f"User {user_id} not found in biometric database")
                return False

            # Update registration time to indicate "update"
            cursor.execute("""
                UPDATE Usr
                SET registe_time = ?
                WHERE phone_number = ?
            """, (datetime.now().isoformat(), user_id))

            self.db_connection.commit()
            cursor.close()

            logger.info(f"Updated user {user_id} in palm_feature.db (registration time updated)")
            return True

        except Exception as e:
            logger.error(f"Error updating user in database: {e}")
            return False

    def ensure_db_connection(self):
        """Ensure database connection is established and tables exist"""
        if self.db_connection is None:
            try:
                self.db_connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
                # Use standard tuple factory instead of Row factory for better compatibility
                self.db_connection.row_factory = None
                self.create_tables()
                logger.info("Database connection established")
            except Exception as e:
                logger.error(f"Failed to connect to database: {e}")
                raise

    def create_tables(self):
        """Create palm_feature.db Usr table if it doesn't exist"""
        try:
            cursor = self.db_connection.cursor()

            # Check if Usr table exists
            cursor.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name='Usr'
            """)

            if cursor.fetchone():
                logger.info("Usr table exists in palm_feature.db")
            else:
                logger.info("Usr table not found in palm_feature.db - creating it...")
                # Create Usr table
                cursor.execute("""
                    CREATE TABLE Usr (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        phone_number TEXT,
                        rgb_feature TEXT,
                        ir_feature TEXT,
                        registe_time TEXT
                    )
                """)
                self.db_connection.commit()
                logger.info("Created Usr table in palm_feature.db")

            cursor.close()

        except Exception as e:
            logger.error(f"Error creating/checking database tables: {e}")
            raise

    def start(self):
        """Start the Palm Database Handler"""
        logger.info("Starting Palm Database Handler...")

        # Ensure database is ready
        self.ensure_db_connection()

        # Create MQTT client
        client_id = f"palm_db_handler_{int(datetime.now().timestamp())}"

        # Create MQTT client with authentication if configured
        if self.username and self.password:
            self.client = mqtt.Client(
                client_id=client_id,
                clean_session=True
            )
            self.client.username_pw_set(self.username, self.password)
            logger.info(f"Using authenticated MQTT connection (username: {self.username})")
        else:
            self.client = mqtt.Client(
                client_id=client_id,
                clean_session=True
            )
            logger.info("Using unauthenticated MQTT connection")

        logger.info(f"Connecting to MQTT broker at {self.broker_host}:{self.broker_port}")

        # Set callbacks
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message

        # Set connection parameters
        try:
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            logger.info("Make sure MQTT broker is running and accessible")
            logger.info(f"Configuration: host={self.broker_host}, port={self.broker_port}")
            raise

        # Start the network loop
        logger.info("Starting MQTT network loop...")
        self.client.loop_start()

        try:
            # Keep the script running
            while True:
                time.sleep(1)  # Just keep alive, no config checking to avoid spam

        except KeyboardInterrupt:
            logger.info("Shutting down Palm Database Handler...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            if self.client and self.connected:
                self.client.loop_stop()
                self.client.disconnect()
                logger.info("Disconnected from MQTT broker")

            if self.db_connection:
                self.db_connection.close()
                logger.info("Database connection closed")


def main():
    """Main function"""
    # Create and start the handler
    handler = PalmDatabaseHandler()
    handler.start()


if __name__ == "__main__":
    main()
