#!/usr/bin/env python3
"""
Palm Recognition Door Controller
Subscribes to palm/compare/result topic and automatically opens doors based on score threshold.
"""

import json
import time
import logging
import paho.mqtt.client as mqtt
from typing import Dict, Any

# Configuration
MQTT_BROKER_HOST = "192.168.0.101"
MQTT_BROKER_PORT = 9000
SCORE_THRESHOLD = 0.9  # Minimum score to open doors (0.9+)

# MQTT Topics
PALM_COMPARE_TOPIC = "palm/compare/result"
DOOR_CONTROL_TOPIC = "IOT/Containment/Control"

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('palm_door_controller.log')
    ]
)
logger = logging.getLogger(__name__)


class PalmDoorController:
    """Palm Recognition Door Controller class"""

    def __init__(self, broker_host: str = MQTT_BROKER_HOST, broker_port: int = MQTT_BROKER_PORT):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.client = None
        self.connected = False

    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            self.connected = True
            logger.info(f"Connected to MQTT broker at {self.broker_host}:{self.broker_port}")

            # Subscribe to palm comparison results
            client.subscribe(PALM_COMPARE_TOPIC, qos=1)
            logger.info(f"Subscribed to topic: {PALM_COMPARE_TOPIC}")
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

            if topic == PALM_COMPARE_TOPIC:
                self.process_palm_result(payload)

        except Exception as e:
            logger.error(f"Error processing message: {e}")

    def process_palm_result(self, payload: str):
        """Process palm recognition result and open doors if score is high enough"""
        try:
            # Parse JSON payload
            data = json.loads(payload)

            user = data.get('user', 'unknown')
            score = data.get('score', 0.0)
            timestamp = data.get('timestamp', 'unknown')

            logger.info(f"Palm recognition result - User: {user}, Score: {score}, Timestamp: {timestamp}")

            # Check if score meets threshold
            if score >= SCORE_THRESHOLD:
                logger.info(f"Score {score} meets threshold {SCORE_THRESHOLD}. Opening doors for user: {user}")

                # Open front door
                self.open_front_door(user)

                # Open back door
                self.open_back_door(user)

                # Open gate
                self.open_gate(user)

                logger.info(f"Door and gate opening commands sent for user: {user} (score: {score})")
            else:
                logger.info(f"Score {score} below threshold {SCORE_THRESHOLD}. Doors remain closed.")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON payload: {e}")
        except Exception as e:
            logger.error(f"Error processing palm result: {e}")

    def open_front_door(self, user: str):
        """Publish command to open front door"""
        try:
            payload = json.dumps({"data": "Open front door"})
            result = self.client.publish(DOOR_CONTROL_TOPIC, payload, qos=1, retain=False)

            if result.rc == 0:
                logger.info(f"Front door opening command published successfully for user: {user}")
            else:
                logger.error(f"Failed to publish front door command for user: {user}. Error code: {result.rc}")

        except Exception as e:
            logger.error(f"Exception while publishing front door command: {e}")

    def open_back_door(self, user: str):
        """Publish command to open back door"""
        try:
            payload = json.dumps({"data": "Open back door"})
            result = self.client.publish(DOOR_CONTROL_TOPIC, payload, qos=1, retain=False)

            if result.rc == 0:
                logger.info(f"Back door opening command published successfully for user: {user}")
            else:
                logger.error(f"Failed to publish back door command for user: {user}. Error code: {result.rc}")

        except Exception as e:
            logger.error(f"Exception while publishing back door command: {e}")

    def open_gate(self, user: str):
        """Publish command to open gate"""
        try:
            payload = json.dumps({"data": "Open gate"})
            result = self.client.publish(DOOR_CONTROL_TOPIC, payload, qos=1, retain=False)

            if result.rc == 0:
                logger.info(f"Gate opening command published successfully for user: {user}")
            else:
                logger.error(f"Failed to publish gate command for user: {user}. Error code: {result.rc}")

        except Exception as e:
            logger.error(f"Exception while publishing gate command: {e}")

    def start(self):
        """Start the Palm Door Controller"""
        logger.info("Starting Palm Door Controller...")

        # Create MQTT client
        self.client = mqtt.Client(
            client_id=f"palm_door_controller_{int(time.time())}",
            clean_session=True
        )

        # Set callbacks
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message

        # Set connection parameters
        self.client.connect(self.broker_host, self.broker_port, keepalive=60)

        # Start the network loop
        logger.info("Starting MQTT network loop...")
        self.client.loop_start()

        try:
            # Keep the script running
            while True:
                time.sleep(1)

        except KeyboardInterrupt:
            logger.info("Shutting down Palm Door Controller...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            if self.client and self.connected:
                self.client.loop_stop()
                self.client.disconnect()
                logger.info("Disconnected from MQTT broker")


def main():
    """Main function"""
    # Create and start the controller
    controller = PalmDoorController()
    controller.start()


if __name__ == "__main__":
    main()
