"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Wifi, Settings } from "lucide-react";
import { toast } from "sonner";
import OpenDoorControl from "@/components/OpenDoorControl";

interface MQTTBrokerConfig {
  host: string;
  port: string;
}

const MQTT_BROKER_CONFIG_KEY = "open_door_mqtt_config";

export default function MQTTSettingsPage() {
  const [config, setConfig] = useState<MQTTBrokerConfig>({
    host: "192.168.0.100",
    port: "9000"
  });
  const [savedConfig, setSavedConfig] = useState<MQTTBrokerConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved configuration on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MQTT_BROKER_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedConfig(parsed);
        setConfig(parsed); // Also set the form config to the saved values
      } else {
        // First time - save defaults silently (no toast)
        const defaultConfig = { host: "192.168.0.100", port: "9000" };
        saveToLocalStorage(defaultConfig);
        setSavedConfig(defaultConfig);
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error("Error loading MQTT broker config:", error);
      // Silently fallback to defaults on error
      const defaultConfig = { host: "192.168.0.100", port: "9000" };
      setSavedConfig(defaultConfig);
      setConfig(defaultConfig);
      toast.error("Failed to load saved MQTT configuration, using defaults");
    }
  }, []);

  const saveToLocalStorage = (newConfig: MQTTBrokerConfig) => {
    try {
      localStorage.setItem(MQTT_BROKER_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleSave = async () => {
    if (!config.host.trim() || !config.port.trim()) {
      toast.error("Please fill in both host and port");
      return;
    }

    // Validate port number
    const port = parseInt(config.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast.error("Please enter a valid port number (1-65535)");
      return;
    }

    setIsSaving(true);

    try {
      const newConfig = { ...config, port: port.toString() };
      saveToLocalStorage(newConfig);
      setSavedConfig(newConfig);
      toast.success("MQTT broker settings saved successfully");
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save MQTT broker settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof MQTTBrokerConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const loadDefaults = () => {
    const defaultConfig = { host: "192.168.0.100", port: "9000" };
    setConfig(defaultConfig);
    toast.info("Default values loaded");
  };

  const isDefaultConfig = savedConfig?.host === "192.168.0.100" && savedConfig?.port === "9000";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Open Door MQTT Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Broker Configuration
            </CardTitle>
            <CardDescription>
              Configure MQTT broker settings for open door commands (separate from palm recognition MQTT)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="host">Broker Host</Label>
                <Input
                  id="host"
                  type="text"
                  placeholder="192.168.0.100"
                  value={config.host}
                  onChange={(e) => handleInputChange("host", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="9000"
                  value={config.port}
                  onChange={(e) => handleInputChange("port", e.target.value)}
                  min="1"
                  max="65535"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
              <Button variant="outline" onClick={loadDefaults}>
                Load Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Current Settings
            </CardTitle>
            <CardDescription>
              Current MQTT broker configuration from localStorage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {savedConfig ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Broker Host</Label>
                  <p className="text-lg font-mono">{savedConfig.host}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Port</Label>
                  <p className="text-lg font-mono">{savedConfig.port}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Full URL</Label>
                  <p className="text-lg font-mono">ws://{savedConfig.host}:{savedConfig.port}</p>
                </div>
                {isDefaultConfig && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Using default MQTT broker configuration (192.168.0.100:9000)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No configuration saved yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual Open Door Control */}
      <OpenDoorControl />

        {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • These settings control the MQTT broker used for open door commands.
            </p>
            <p>
              • This is separate from the MQTT connection used for palm recognition status (which uses localhost/env).
            </p>
            <p>
              • Settings are stored locally in your browser and will persist between sessions.
            </p>
            <p>
              • The default configuration uses WebSocket protocol (ws://) suitable for most MQTT brokers.
            </p>
            <p>
              • Use the exported functions from <code>lib/openDoorMQTTConfig.ts</code> to access these settings in your code.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
