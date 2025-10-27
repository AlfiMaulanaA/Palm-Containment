"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getMQTTClient } from "@/lib/mqttClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import MQTTConnectionBadge from "@/components/mqtt-status";
import {
  Loader2,
  Hand,
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Camera,
  RefreshCw,
  DoorOpen,
  Eye,
  Monitor,
  ScrollText,
} from "lucide-react";

// --- Interfaces (based on Vue.js code)
interface PalmCompareResult {
  user: string;
  score: number;
  timestamp: string;
}

interface PalmStatus {
  status: "ok" | "failed";
  message: string;
}

// --- Main Palm Recognition Dashboard Component
export default function DashboardPage() {
  // States (converted from Vue.js refs)
  const [compareResults, setCompareResults] = useState<PalmCompareResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "danger" | "warning" | "info">("info");
  const [openDoorStatus, setOpenDoorStatus] = useState("");

  // Get camera IP - production uses current hostname, development uses env variable
  const cameraBaseUrl = process.env.NODE_ENV === "production"
    ? `${window.location.hostname}:8080`
    : (process.env.NEXT_PUBLIC_PALM_CAMERA_IP || "192.168.2.110:8080");

  // Image URLs with timestamp for refresh (like Vue.js)
  const [imageUrl1, setImageUrl1] = useState(`http://${cameraBaseUrl}/1.ir.png?${Date.now()}`);
  const [imageUrl2, setImageUrl2] = useState(`http://${cameraBaseUrl}/1.rgb.png?${Date.now()}`);
  const [imageError, setImageError] = useState({ IR: false, RGB: false });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Map<string, (topic: string, message: Buffer) => void>>(new Map());

  // Limited compare results (like Vue.js computed)
  const limitedCompareResults = compareResults.slice(0, 5);

  // Alert class computation (like Vue.js computed)
  const getAlertClass = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400';
      case 'danger':
        return 'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400';
    }
  };

  // Add log function (like Vue.js)
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp} - ${message}`;

    setLogs(prev => {
      const newLogs = [logEntry, ...prev];
      return newLogs.length > 100 ? newLogs.slice(0, 100) : newLogs;
    });
  }, []);

  // Show bootstrap alert function (like Vue.js)
  const showBootstrapAlert = useCallback((message: string, type: typeof alertType = 'info', duration = 5000) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), duration);
  }, []);

  // Success toast (like Vue.js Swal)
  const showSuccessToast = useCallback((message: string) => {
    toast.success(message, {
      duration: 3000,
      position: "top-right",
    });
  }, []);

  // Simplified Open Door function - just for demonstration
  const triggerOpenDoor = useCallback(() => {
    const client = getMQTTClient();
    if (client && client.connected) {
      const payload = JSON.stringify({ data: 'Open front door' });
      client.publish('IOT/Containment/Control', payload);
      addLog('Published Open Front Door command');
      setOpenDoorStatus('Success Open Door to broker');

      // Clear door status after 3 seconds
      setTimeout(() => setOpenDoorStatus(""), 3000);
      showSuccessToast('Open door command sent!');
    } else {
      addLog('MQTT not connected - cannot send open door command');
      showBootstrapAlert('MQTT not connected', 'danger');
    }
  }, [addLog, showBootstrapAlert, showSuccessToast]);

  // Simplified MQTT message handling for demo
  useEffect(() => {
    const client = getMQTTClient();
    if (client && client.connected) {
      const handlePalmStatus = (topic: string, message: Buffer) => {
        try {
          const data: PalmStatus = JSON.parse(message.toString());
          if (data.status === 'ok') {
            showBootstrapAlert(`Palm: ${data.message}`, 'success');
            addLog(`Palm status: ${data.message}`);
          } else {
            showBootstrapAlert(`Palm Error: ${data.message}`, 'danger');
            addLog(`Palm error: ${data.message}`);
          }
        } catch (e) {
          addLog(`Palm status message: ${message.toString()}`);
        }
      };

      const handleCompareResult = (topic: string, message: Buffer) => {
        try {
          const data: PalmCompareResult = JSON.parse(message.toString());
          addLog(`Palm recognition: ${data.user} (score: ${data.score.toFixed(4)}) at ${data.timestamp}`);

          // Add to results
          setCompareResults(prev => {
            const newResults = [data, ...prev];
            return newResults.length > 10 ? newResults.slice(0, 10) : newResults;
          });

          // If score >= 0.8, auto open door
          if (data.score >= 0.8) {
            setTimeout(() => triggerOpenDoor(), 500); // Small delay
          }
        } catch (e) {
          addLog(`Palm result message: ${message.toString()}`);
        }
      };

      client.on('message', (topic, message) => {
        if (topic === 'palm/status') handlePalmStatus(topic, message);
        if (topic === 'palm/compare/result') handleCompareResult(topic, message);
      });

      client.subscribe('palm/status');
      client.subscribe('palm/compare/result');

      addLog('Subscribed to palm topics');

      return () => {
        client.unsubscribe('palm/status');
        client.unsubscribe('palm/compare/result');
      };
    }
  }, [addLog, showBootstrapAlert, triggerOpenDoor]);

  // Refresh images function (like Vue.js)
  const refreshImages = useCallback(() => {
    const timestamp = Date.now();
    setImageUrl1(`http://${cameraBaseUrl}/1.ir.png?${timestamp}`);
    setImageUrl2(`http://${cameraBaseUrl}/1.rgb.png?${timestamp}`);
    setImageError({ IR: false, RGB: false });
  }, [cameraBaseUrl]);

  // Image error handler (like Vue.js)
  const onImageError = useCallback((type: 'IR' | 'RGB') => {
    addLog(`Failed to load ${type} image`);
    setImageError(prev => ({ ...prev, [type]: true }));
  }, [addLog]);





  // Cleanup on unmount (like Vue.js onUnmounted)
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Hand className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Palm Recognition Dashboard</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Real-time Palm Vein Recognition</h2>
          <p className="text-muted-foreground">Monitor palm recognition status and control access</p>
        </div>

      {/* Bootstrap-style Alert */}
      {showAlert && (
        <Alert className={`border ${getAlertClass(alertType)}`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-center">
            <span>{alertMessage}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAlert(false)}
              className="h-6 w-6 p-0"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Open Door Status */}
      {openDoorStatus && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400">
          <DoorOpen className="h-4 w-4" />
          <AlertDescription>{openDoorStatus}</AlertDescription>
        </Alert>
      )}

      {/* MQTT Connection Status */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            MQTT Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <MQTTConnectionBadge />
            <span className="text-sm text-muted-foreground">
              MQTT connection status monitored in real-time
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Palm Compare Results */}
      {limitedCompareResults.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5" />
              Latest Palm Recognition Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {limitedCompareResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 border border-border rounded-lg bg-muted/30 dark:bg-muted/10"
                >
                  <div>
                    <div className="font-semibold">{result.user}</div>
                    <div className="text-sm text-muted-foreground">{result.timestamp}</div>
                  </div>
                  <Badge
                    variant={result.score >= 0.8 ? "default" : "secondary"}
                    className="text-sm"
                  >
                    Score: {result.score.toFixed(4)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Palm Vein Images */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Live Palm Vein Camera Feed
            </CardTitle>
            <Button
              onClick={refreshImages}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Images
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center space-y-2">
              {!imageError.IR ? (
                <img
                  src={imageUrl1}
                  alt="IR Image"
                  className="w-full h-auto rounded-lg shadow-md border max-w-md mx-auto"
                  onError={() => onImageError('IR')}
                />
              ) : (
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center border max-w-md mx-auto">
                  <div className="text-center text-muted-foreground">
                    <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>IR Image Not Available</p>
                    <p className="text-xs">Camera: {cameraBaseUrl}</p>
                  </div>
                </div>
              )}
              <small className="block text-muted-foreground">IR Image</small>
            </div>

            <div className="text-center space-y-2">
              {!imageError.RGB ? (
                <img
                  src={imageUrl2}
                  alt="RGB Image"
                  className="w-full h-auto rounded-lg shadow-md border max-w-md mx-auto"
                  onError={() => onImageError('RGB')}
                />
              ) : (
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center border max-w-md mx-auto">
                  <div className="text-center text-muted-foreground">
                    <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>RGB Image Not Available</p>
                    <p className="text-xs">Camera: {cameraBaseUrl}</p>
                  </div>
                </div>
              )}
              <small className="block text-muted-foreground">RGB Image</small>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* MQTT Logs */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            System Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 overflow-y-auto">
            {logs.length > 0 ? (
              <div className="space-y-1 font-mono text-xs text-muted-foreground">
                {logs.slice(0, 10).map((log, index) => (
                  <div
                    key={index}
                    className="py-1 border-b border-border/30 last:border-b-0"
                  >
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No logs yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </SidebarInset>
  );
}
