interface OpenDoorMQTTConfig {
  host: string;
  port: string;
}

const OPEN_DOOR_MQTT_CONFIG_KEY = "open_door_mqtt_config";

export function getOpenDoorMQTTConfig(): { host: string; port: number } | null {
  try {
    const saved = localStorage.getItem(OPEN_DOOR_MQTT_CONFIG_KEY);
    if (saved) {
      const config: OpenDoorMQTTConfig = JSON.parse(saved);
      const port = parseInt(config.port);
      if (config.host && !isNaN(port)) {
        return {
          host: config.host,
          port: port
        };
      }
    }

    // Return default if no config or invalid config
    return {
      host: "192.168.0.100",
      port: 9000
    };
  } catch (error) {
    console.error("Error reading open door MQTT config:", error);
    return {
      host: "192.168.0.100",
      port: 9000
    };
  }
}

export function getOpenDoorMQTTURL(): string {
  const config = getOpenDoorMQTTConfig();
  if (config) {
    return `ws://${config.host}:${config.port}`;
  }
  return "ws://192.168.0.100:9000";
}

// Palm Recognition MQTT functions using localhost MQTT for palm device control
import { getMQTTClient } from "@/lib/mqttClient";

const PALM_CONTROL_TOPIC = "palm/control";
const PALM_STATUS_TOPIC = "palm/status";

/**
 * Register a palm user by user_id
 * Sends command: {"command": "regist", "user_id": "user123"}
 * @param userId - The user ID to register
 * @returns Promise that resolves when command is sent
 */
export async function registerPalmUser(userId: string): Promise<void> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required for palm registration");
  }

  const mqttClient = getMQTTClient();
  if (!mqttClient) {
    throw new Error("MQTT client not available. Ensure MQTT is connected.");
  }

  const payload = JSON.stringify({
    command: "regist",
    user_id: userId.trim()
  });

  try {
    const success = mqttClient.publish(PALM_CONTROL_TOPIC, payload);
    if (!success) {
      throw new Error("Failed to send palm registration command");
    }
    console.log(`Palm registration command sent for user: ${userId}`);
  } catch (error) {
    console.error("Error sending palm registration command:", error);
    throw new Error("Failed to send palm registration command");
  }
}

/**
 * Delete a palm user by user_id
 * Sends command: {"command": "delete", "user_id": "user123"}
 * @param userId - The user ID to delete
 * @returns Promise that resolves when command is sent
 */
export async function deletePalmUser(userId: string): Promise<void> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required for palm deletion");
  }

  const mqttClient = getMQTTClient();
  if (!mqttClient) {
    throw new Error("MQTT client not available. Ensure MQTT is connected.");
  }

  const payload = JSON.stringify({
    command: "delete",
    user_id: userId.trim()
  });

  try {
    const success = mqttClient.publish(PALM_CONTROL_TOPIC, payload);
    if (!success) {
      throw new Error("Failed to send palm deletion command");
    }
    console.log(`Palm deletion command sent for user: ${userId}`);
  } catch (error) {
    console.error("Error sending palm deletion command:", error);
    throw new Error("Failed to send palm deletion command");
  }
}

/**
 * Hook/function to listen for palm device status responses
 * Status responses come on topic: palm/status
 * Example: {"status": "ok", "message": "user successfully registered"}
 */
export function setupPalmStatusListener(callback: (status: string, message: string) => void): void {
  // This would typically be set up in a React component or hook
  // using the MQTT context's addMessageHandler method
  const mqttClient = getMQTTClient();
  if (!mqttClient) {
    console.error("MQTT client not available for status listening");
    return;
  }

  // Note: In the current MQTT client implementation, you'd typically use
  // the useMQTT hook with topics and addMessageHandler
  console.log("Palm status listener setup requested - implement in component using useMQTT hook");
}
