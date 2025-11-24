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
  const [openDoorStatus, setOpenDoorStatus] = useState("");
  const [showRecognitionResults, setShowRecognitionResults] = useState(false);
  const [isHidingResults, setIsHidingResults] = useState(false);

  // Get camera IP - production uses current hostname, development uses env variable
  const cameraBaseUrl = process.env.NODE_ENV === "production"
    ? `${window.location.hostname}:8080`
    : (process.env.NEXT_PUBLIC_PALM_CAMERA_IP || "192.168.0.101:8080");

  // Image URLs with timestamp for refresh (like Vue.js)
  const [imageUrl1, setImageUrl1] = useState(`http://${cameraBaseUrl}/1.ir.png?${Date.now()}`);
  const [imageUrl2, setImageUrl2] = useState(`http://${cameraBaseUrl}/1.rgb.png?${Date.now()}`);
  const [imageError, setImageError] = useState({ IR: false, RGB: false });
  const [imageRotation, setImageRotation] = useState({ IR: 90, RGB: 90 });
  const [currentImageType, setCurrentImageType] = useState<'RGB' | 'IR'>('RGB'); // Start with RGB as default

  // Load rotation state from localStorage on mount
  useEffect(() => {
    const savedRotation = localStorage.getItem('dashboard-image-rotation');
    if (savedRotation) {
      try {
        const parsed = JSON.parse(savedRotation);
        setImageRotation(parsed);
      } catch (error) {
        console.warn('Failed to parse saved image rotation:', error);
      }
    }
  }, []);

  // Save rotation state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboard-image-rotation', JSON.stringify(imageRotation));
  }, [imageRotation]);

  // Auto-switch between RGB and IR images every 5 seconds
  useEffect(() => {
    const imageSwitchInterval = setInterval(() => {
      setCurrentImageType(prev => prev === 'RGB' ? 'IR' : 'RGB');
    }, 5000); // Switch every 5 seconds

    return () => clearInterval(imageSwitchInterval);
  }, []);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Map<string, (topic: string, message: Buffer) => void>>(new Map());
  const isSubscribedRef = useRef(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limited compare results (like Vue.js computed)
  const limitedCompareResults = compareResults.slice(0, 5);



  // Add log function (like Vue.js)
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp} - ${message}`;

    setLogs(prev => {
      const newLogs = [logEntry, ...prev];
      return newLogs.length > 50 ? newLogs.slice(0, 50) : newLogs; // Limit to 50 logs
    });
  }, []);

  // Clear logs function
  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('Logs cleared');
  }, [addLog]);



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
      toast.error('MQTT not connected', {
        duration: 3000,
        position: "top-right",
      });
    }
  }, [addLog, showSuccessToast]);

  // MQTT subscription management - prevent multiple subscriptions
  useEffect(() => {
    // Clear logs first and wait a bit before subscription
    setLogs([]);

    const client = getMQTTClient();
    if (client && client.connected && !isSubscribedRef.current) {
      isSubscribedRef.current = true;

      // Add small delay to ensure logs are cleared before subscription
      setTimeout(() => {
      const handlePalmStatus = (topic: string, message: Buffer, packet?: any) => {
        try {
          // Skip retained messages to prevent showing old/stale status messages
          if (packet && packet.retain) {
            console.log('Skipping retained status message:', message.toString());
            return;
          }

          const data: PalmStatus = JSON.parse(message.toString());
          if (data.status === 'ok') {
            toast.success(`Palm: ${data.message}`, {
              duration: 3000,
              position: "top-right",
            });
            addLog(`Palm status: ${data.message}`);
          } else {
            toast.error(`Palm Error: ${data.message}`, {
              duration: 3000,
              position: "top-right",
            });
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
            console.log('Received palm compare result:', data);
            // Add to results
            setCompareResults(prev => {
              const newResults = [data, ...prev];
              return newResults.length > 10 ? newResults.slice(0, 10) : newResults;
            });

            // Auto-refresh images to get the latest camera feed when recognition result comes in
            const timestamp = Date.now();
            setImageUrl1(`http://${cameraBaseUrl}/1.ir.png?${timestamp}`);
            setImageUrl2(`http://${cameraBaseUrl}/1.rgb.png?${timestamp}`);
            setImageError({ IR: false, RGB: false });
            addLog('Auto-refreshed camera images for latest palm recognition feed');

            // Auto-rotate images to 90 degrees when recognition result comes in
            setImageRotation({ IR: 90, RGB: 90 });
            addLog('Auto-rotated camera images to 90 degrees for palm recognition');

            // Show recognition results and start/reset auto-hide timer
            setShowRecognitionResults(true);

            // Clear existing timer if any
            if (autoHideTimerRef.current) {
              clearTimeout(autoHideTimerRef.current);
            }

            // Start new auto-hide timer (5 seconds)
            autoHideTimerRef.current = setTimeout(() => {
              // Start hide animation
              setIsHidingResults(true);
              // After animation completes, unmount the component
              setTimeout(() => {
                setShowRecognitionResults(false);
                setIsHidingResults(false);
              }, 500); // Match animation duration
            }, 5000);

            // If score >= 0.8, auto open door
            if (data.score >= 0.8) {
              setTimeout(() => triggerOpenDoor(), 500); // Small delay
            }
          } catch (e) {
            addLog(`Palm result message: ${message.toString()}`);
          }
        };

        // Store message handlers for cleanup
        messageHandlersRef.current.set('palm/status', handlePalmStatus);
        messageHandlersRef.current.set('palm/compare/result', handleCompareResult);

        client.on('message', (topic, message) => {
          if (topic === 'palm/status') handlePalmStatus(topic, message);
          if (topic === 'palm/compare/result') handleCompareResult(topic, message);
        });

        client.subscribe('palm/status');
        client.subscribe('palm/compare/result');

        addLog('Subscribed to palm topics');
      }, 100); // 100ms delay

      return () => {
        isSubscribedRef.current = false;
        client.unsubscribe('palm/status');
        client.unsubscribe('palm/compare/result');
        messageHandlersRef.current.clear();
      };
    }
  }, [addLog, triggerOpenDoor]); // Include dependencies but prevent re-run with ref check

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

  // Image rotation functions
  const rotateImageClockwise = useCallback((type: 'IR' | 'RGB') => {
    setImageRotation(prev => ({
      ...prev,
      [type]: (prev[type] + 90) % 360
    }));
  }, []);

  const rotateImageCounterClockwise = useCallback((type: 'IR' | 'RGB') => {
    setImageRotation(prev => ({
      ...prev,
      [type]: (prev[type] - 90 + 360) % 360
    }));
  }, []);

  const resetImageRotation = useCallback((type: 'IR' | 'RGB') => {
    setImageRotation(prev => ({
      ...prev,
      [type]: 0
    }));
  }, []);





  // Cleanup on unmount (like Vue.js onUnmounted)
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
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
            <h1 className="text-lg font-semibold">Live Palm Recognition Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <MQTTConnectionBadge />
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">

      {/* Open Door Status - Converted to Toast */}
      {openDoorStatus && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400">
          <DoorOpen className="h-4 w-4" />
          <AlertDescription>{openDoorStatus}</AlertDescription>
        </Alert>
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
          <div className="grid grid-cols-1 gap-4">
            {currentImageType === 'IR' ? (
              <div className="text-center space-y-2">
                {!imageError.IR ? (
                  <div className={`relative max-w-[500px] mx-auto mt-4 ${imageRotation.IR % 180 === 90 ? 'mb-8' : ''}`}>
                    <img
                      src={imageUrl1}
                      alt="IR Image"
                      className="w-full h-auto rounded-lg shadow-md border"
                      style={{
                        transform: `rotate(${imageRotation.IR}deg)`,
                        maxHeight: imageRotation.IR % 180 === 90 ? 'auto' : 'auto'
                      }}
                      onError={() => onImageError('IR')}
                    />
                  </div>
                ) : (
                  <div className={`w-full h-52 bg-muted rounded-lg flex items-center justify-center border max-w-80 mx-auto mt-4 ${imageRotation.IR % 180 === 90 ? 'mb-8' : ''}`}>
                    <div className="text-center text-muted-foreground">
                      <Monitor className="h-9 w-9 mx-auto mb-2 opacity-50" />
                      <p>IR Image Not Available</p>
                      <p className="text-xs">Camera: {cameraBaseUrl}</p>
                    </div>
                  </div>
                )}
                <small className="block text-muted-foreground">IR Image</small>
              </div>
            ) : (
              <div className="text-center space-y-2">
                {!imageError.RGB ? (
                  <div className={`relative max-w-[500px] mx-auto mt-4 ${imageRotation.RGB % 180 === 90 ? 'mb-8' : ''}`}>
                    <img
                      src={imageUrl2}
                      alt="RGB Image"
                      className="w-full h-auto rounded-lg shadow-md border"
                      style={{
                        transform: `rotate(${imageRotation.RGB}deg)`,
                        maxHeight: imageRotation.RGB % 180 === 90 ? 'auto' : 'auto'
                      }}
                      onError={() => onImageError('RGB')}
                    />
                  </div>
                ) : (
                  <div className={`w-full h-52 bg-muted rounded-lg flex items-center justify-center border max-w-80 mx-auto mt-4 ${imageRotation.RGB % 180 === 90 ? 'mb-8' : ''}`}>
                    <div className="text-center text-muted-foreground">
                      <Monitor className="h-9 w-9 mx-auto mb-2 opacity-50" />
                      <p>RGB Image Not Available</p>
                      <p className="text-xs">Camera: {cameraBaseUrl}</p>
                    </div>
                  </div>
                )}
                <small className="block text-muted-foreground">RGB Image</small>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Palm Compare Results */}
      {limitedCompareResults.length > 0 && (showRecognitionResults || isHidingResults) && (
        <Card className={`border shadow-sm transition-all duration-500 ease-in-out ${
          showRecognitionResults && !isHidingResults
            ? 'opacity-100 transform translate-y-0'
            : 'opacity-0 transform -translate-y-2 pointer-events-none'
        }`}>
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
                    className={`text-sm ${
                      result.score >= 0.8
                        ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                        : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                    }`}
                  >
                    Score: {result.score.toFixed(4)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* MQTT Logs */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              System Logs
            </CardTitle>
            <Button
              onClick={clearLogs}
              variant="outline"
              size="sm"
            >
              Clear Logs
            </Button>
          </div>
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
