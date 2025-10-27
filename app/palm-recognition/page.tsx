"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMQTT } from "@/hooks/useMQTT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { toast } from "sonner";
import {
  Loader2,
  Hand,
  Wifi,
  WifiOff,
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

// --- Main Palm Recognition Component (Vue.js conversion)
export default function PalmRecognitionPage() {
  const { isConnected, isOnline, connectionStatus, addMessageHandler, publishMessage, subscribeToTopics, unsubscribeFromTopic } = useMQTT();

  // States (converted from Vue.js refs)
  const [compareResults, setCompareResults] = useState<PalmCompareResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "danger" | "warning" | "info">("info");
  const [openDoorStatus, setOpenDoorStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Get camera IP - production uses current hostname, development uses env variable
  const cameraBaseUrl = process.env.NODE_ENV === "production"
    ? `${window.location.hostname}:8080`
    : (process.env.NEXT_PUBLIC_PALM_CAMERA_IP || "192.168.2.110:8080");

  // Image URLs with timestamp for refresh (like Vue.js)
  const [imageUrl1, setImageUrl1] = useState(`http://${cameraBaseUrl}/1.ir.png?${Date.now()}`);
  const [imageUrl2, setImageUrl2] = useState(`http://${cameraBaseUrl}/1.rgb.png?${Date.now()}`);
  const [imageError, setImageError] = useState({ IR: false, RGB: false });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Publish Open Door function (like Vue.js)
  const publishOpenDoor = useCallback(() => {
    if (!isConnected) {
      addLog('Cannot publish Open Front Door: MQTT not connected.');
      return;
    }

    const payload = { data: 'Open front door' };
    const success = publishMessage('IOT/Containment/Control', payload);

    if (success) {
      addLog('Published Open Front Door command to IOT/Containment/Control');
      setOpenDoorStatus(`Success Open Door to broker`);

      // Clear door status after 5 seconds
      setTimeout(() => setOpenDoorStatus(""), 3000);
    } else {
      addLog('Failed to publish Open Front Door command');
    }
  }, [isConnected, publishMessage, addLog]);

  // Handle MQTT messages (like Vue.js onMessageArrived)
  const handlePalmStatus = useCallback((topic: string, message: Buffer) => {
    const payload = message.toString();
    try {
      const data: PalmStatus = JSON.parse(payload);
      showBootstrapAlert(
        `[Status] ${data.status.toUpperCase()}: ${data.message}`,
        data.status === 'ok' ? 'success' : 'danger'
      );
    } catch {
      addLog(`[${topic}] ${payload}`);
    }
  }, [showBootstrapAlert, addLog]);

  const handleCompareResult = useCallback((topic: string, message: Buffer) => {
    const payload = message.toString();
    try {
      const data: PalmCompareResult = JSON.parse(payload);

      addLog(`[Compare Result] User: ${data.user}, Score: ${data.score.toFixed(4)}, Time: ${data.timestamp}`);

      // Add to compare results (like Vue.js)
      setCompareResults(prev => {
        const newResults = [data, ...prev];
        return newResults.length > 10 ? newResults.slice(0, 10) : newResults;
      });

      // If score >= 0.8, publish open door (like Vue.js)
      if (data.score >= 0.8) {
        addLog('Score is high, publishing open door...');
        publishOpenDoor();
        showSuccessToast('Success recognize, Open Front Door');
      }
    } catch {
      addLog(`[${topic}] ${payload}`);
    }
  }, [addLog, publishOpenDoor, showSuccessToast]);

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

  // Connect client function (like Vue.js)
  const connectClient = useCallback(() => {
    if (isConnected) return;

    setLoading(true);
    // Force reconnection by causing a re-render which will trigger MQTT reconnection
    window.location.reload();
  }, [isConnected]);

  // MQTT subscription setup (like Vue.js onMounted)
  useEffect(() => {
    if (isConnected) {
      // Subscribe to topics (like Vue.js)
      addMessageHandler('palm/status', handlePalmStatus);
      addMessageHandler('palm/compare/result', handleCompareResult);

      addLog('Subscribed to palm/status and palm/compare/result');
      showBootstrapAlert('Connected to MQTT broker', 'success');

      // Start image refresh interval (like Vue.js)
      refreshIntervalRef.current = setInterval(refreshImages, 2000);
    } else {
      // Clear interval when disconnected
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      unsubscribeFromTopic('palm/status');
      unsubscribeFromTopic('palm/compare/result');
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isConnected, addMessageHandler, unsubscribeFromTopic, handlePalmStatus, handleCompareResult, refreshImages, showBootstrapAlert, addLog]);

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
          <h1 className="text-lg font-semibold">Palm Veins Recognitions</h1>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Palm Vein Recognition Panel</h2>
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

        {/* Palm Compare Results */}
        {limitedCompareResults.length > 0 && (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hand className="h-5 w-5" />
                Palm Compare Results
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
                Palm Vein Images
              </CardTitle>
              <Button
                onClick={refreshImages}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
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
                    className="w-full h-auto rounded-lg shadow-md border"
                    onError={() => onImageError('IR')}
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center border">
                    <div className="text-center text-muted-foreground">
                      <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>IR Image Not Available</p>
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
                    className="w-full h-auto rounded-lg shadow-md border"
                    onError={() => onImageError('RGB')}
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center border">
                    <div className="text-center text-muted-foreground">
                      <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>RGB Image Not Available</p>
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
              MQTT Logs (latest first)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 overflow-y-auto">
              {logs.length > 0 ? (
                <div className="space-y-1 font-mono text-sm">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="text-muted-foreground break-words py-1 border-b border-border/30 last:border-b-0"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No logs yet. Connect to MQTT to see logs.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
