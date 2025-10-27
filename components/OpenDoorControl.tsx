"use client";

import { useState, useEffect, useCallback } from "react";
import { connectMQTTAsync, getMQTTClient } from "@/lib/mqttClient";
import { getOpenDoorMQTTConfig, getOpenDoorMQTTURL } from "@/lib/openDoorMQTTConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, DoorOpen, Wifi, WifiOff, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const OPEN_DOOR_TOPIC = "IOT/Containment/Control";

interface OpenDoorMQTTClient {
  client: any;
  connected: boolean;
  error?: string;
}

export default function OpenDoorControl() {
  const [mqttStatus, setMqttStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [lastCommandStatus, setLastCommandStatus] = useState<{ success: boolean; timestamp: Date; message: string } | null>(null);
  const [doorConfig, setDoorConfig] = useState<{ host: string; port: number }>({ host: '192.168.0.100', port: 9000 });

  // Update config when component mounts or config changes
  const updateConfig = useCallback(() => {
    const config = getOpenDoorMQTTConfig();
    if (config) {
      setDoorConfig(config);
    }
  }, []);

  // Get MQTT status and establish connection
  const initializeMQTTConnection = useCallback(async () => {
    try {
      setMqttStatus('connecting');

      // Get MQTT URL from localStorage config
      const mqttUrl = getOpenDoorMQTTURL();

      console.log(`Connecting to Open Door MQTT: ${mqttUrl}`);

      // Create a simple MQTT client for open door commands
      const openDoorClient = await connectMQTTAsync();

      // Set up event handlers
      openDoorClient.on('connect', () => {
        console.log('Open Door MQTT connected');
        setMqttStatus('connected');
      });

      openDoorClient.on('error', (err: any) => {
        console.error('Open Door MQTT error:', err);
        setMqttStatus('error');
      });

      openDoorClient.on('close', () => {
        console.log('Open Door MQTT disconnected');
        setMqttStatus('disconnected');
      });

      return openDoorClient;

    } catch (error) {
      console.error('Failed to initialize Open Door MQTT:', error);
      setMqttStatus('error');
      return null;
    }
  }, []);

  // Send open door command
  const sendOpenDoorCommand = useCallback(async () => {
    if (mqttStatus !== 'connected') {
      toast.error('MQTT not connected. Cannot send open door command.');
      return;
    }

    setIsSendingCommand(true);
    setLastCommandStatus(null);

    try {
      const client = getMQTTClient();
      if (!client?.connected) {
        throw new Error('MQTT client not available');
      }

      // Send open door command payload
      const payload = JSON.stringify({
        data: 'Manual open front door command',
        timestamp: new Date().toISOString(),
        source: 'manual_control'
      });

      const success = client.publish(OPEN_DOOR_TOPIC, payload);

      if (success) {
        const successStatus = {
          success: true,
          timestamp: new Date(),
          message: 'Open door command sent successfully'
        };
        setLastCommandStatus(successStatus);
        toast.success('Open door command sent!');
        console.log(`Open door command published to ${OPEN_DOOR_TOPIC}:`, payload);
      } else {
        throw new Error('Failed to publish command');
      }

    } catch (error: any) {
      const errorStatus = {
        success: false,
        timestamp: new Date(),
        message: error.message || 'Failed to send command'
      };
      setLastCommandStatus(errorStatus);
      toast.error(`Failed to send command: ${error.message}`);
      console.error('Failed to send open door command:', error);
    } finally {
      setIsSendingCommand(false);
    }
  }, [mqttStatus]);

  // Reconnect function
  const reconnect = useCallback(() => {
    initializeMQTTConnection();
  }, [initializeMQTTConnection]);

  // Initialize on mount and when config changes
  useEffect(() => {
    updateConfig();
    initializeMQTTConnection();

    // Listen for localStorage changes (optional, in case user updates config externally)
    const handleStorageChange = () => {
      updateConfig();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateConfig, initializeMQTTConnection]);

  const getStatusBadge = () => {
    switch (mqttStatus) {
      case 'connected':
        return <Badge className="bg-green-500 text-white"><Wifi className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500 text-white"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Connecting</Badge>;
      case 'error':
        return <Badge className="bg-red-500 text-white"><WifiOff className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white"><WifiOff className="w-3 h-3 mr-1" /> Disconnected</Badge>;
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5" />
          Manual Open Door Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MQTT Connection Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <div className="text-sm font-medium">MQTT Status</div>
            <div className="text-xs text-muted-foreground">
              Broker: {doorConfig.host}:{doorConfig.port}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {mqttStatus !== 'connected' && (
              <Button size="sm" variant="outline" onClick={reconnect}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Reconnect
              </Button>
            )}
          </div>
        </div>

        {/* Manual Control Button */}
        <div className="flex gap-2">
          <Button
            onClick={sendOpenDoorCommand}
            disabled={mqttStatus !== 'connected' || isSendingCommand}
            className="flex-1"
          >
            {isSendingCommand ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <DoorOpen className="w-4 h-4 mr-2" />
                Open Door Now
              </>
            )}
          </Button>
        </div>

        {/* Last Command Status */}
        {lastCommandStatus && (
          <Alert className={lastCommandStatus.success ? "border-green-200" : "border-red-200"}>
            {lastCommandStatus.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription className="flex items-center justify-between">
              <span>{lastCommandStatus.message}</span>
              <span className="text-xs text-muted-foreground">
                {lastCommandStatus.timestamp.toLocaleTimeString()}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* MQTT Configuration Info */}
        <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="font-medium mb-1">Configuration</div>
          <div>• MQTT Broker: {doorConfig.host}:{doorConfig.port}</div>
          <div>• WebSocket URL: {getOpenDoorMQTTURL()}</div>
          <div>• Topic: {OPEN_DOOR_TOPIC}</div>
          <div className="mt-2 text-xs">
            Configure broker settings in <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">Settings → Open Door MQTT</code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
