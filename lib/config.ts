// src/config/appConfig.ts

interface AppConfig {
  mqttBrokerUrl: string;
}

// Legacy function for backward compatibility
// New code should use MQTTModeContext instead
export function getAppConfig(): AppConfig {
  const mqttBrokerUrl = getEnvMQTTBrokerUrl();

  // Ensure URL is defined
  if (!mqttBrokerUrl) {
    throw new Error("MQTT broker URL is not defined.");
  }

  return { mqttBrokerUrl };
}

// Helper function to get MQTT URL from environment variables
export function getEnvMQTTBrokerUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevelopment = process.env.NODE_ENV === "development";

  let host: string;
  let port: string;
  let protocol: string;

  if (isDevelopment) {
    // Development: Use ENV variables
    host = process.env.NEXT_PUBLIC_MQTT_BROKER_HOST || "localhost";
    port = process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || "9000";
    protocol = "ws";
  } else if (isProduction) {
    // Production: Use window.location.hostname
    if (typeof window !== "undefined") {
      host = window.location.hostname;
      port = process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || "9000";
      protocol = window.location.protocol === "https:" ? "wss" : "ws";
    } else {
      // Fallback for SSR
      host = process.env.NEXT_PUBLIC_MQTT_BROKER_HOST || "localhost";
      port = process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || "9000";
      protocol = "ws";
    }
  } else {
    // Fallback
    host = process.env.NEXT_PUBLIC_MQTT_BROKER_HOST || "localhost";
    port = process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || "9000";
    protocol = "ws";
  }

  return `${protocol}://${host}:${port}`;
}
