"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus, Users, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { usePalmUserManagement, PalmStatusResponse } from "@/hooks/usePalmUserManagement";
import { toast } from "sonner";

export default function PalmUsersPage() {
  const [userId, setUserId] = useState("");
  const { isProcessing, lastStatus, registerUser, deleteUser, setupStatusHandler, clearStatus } = usePalmUserManagement();

  // Set up status handler on mount
  useEffect(() => {
    setupStatusHandler((status: PalmStatusResponse) => {
      // Additional status handling if needed
      console.log("Palm user operation status:", status);
    });
  }, [setupStatusHandler]);

  const handleRegister = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    try {
      await registerUser(userId.trim());
      setUserId(""); // Clear input after successful command
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDelete = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    try {
      await deleteUser(userId.trim());
      setUserId(""); // Clear input after successful command
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleClear = () => {
    setUserId("");
    clearStatus();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Palm User Management</h1>
      </div>

      {/* User ID Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Operations
          </CardTitle>
          <CardDescription>
            Register new palm users or delete existing ones. Commands are sent to the palm recognition device via MQTT.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              type="text"
              placeholder="Enter user ID (e.g., user123)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRegister} disabled={isProcessing || !userId.trim()}>
              {isProcessing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register User
                </>
              )}
            </Button>

            <Button variant="destructive" onClick={handleDelete} disabled={isProcessing || !userId.trim()}>
              {isProcessing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleClear} disabled={isProcessing}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Display */}
      {lastStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastStatus.status === "ok" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Operation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={lastStatus.status === "ok" ? "border-green-200" : "border-red-200"}>
              {lastStatus.status === "ok" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription className="flex items-center gap-2">
                {lastStatus.message}
                <Badge variant={lastStatus.status === "ok" ? "default" : "destructive"}>
                  {lastStatus.status.toUpperCase()}
                </Badge>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Register User:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Enter a unique User ID</li>
                <li>Click "Register User"</li>
                <li>Place palm on the sensor when prompted</li>
                <li>Wait for confirmation status</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Delete User:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Enter the User ID to delete</li>
                <li>Click "Delete User"</li>
                <li>Wait for confirmation status</li>
              </ol>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                <strong>Note:</strong> These operations communicate with the palm recognition device via MQTT topics
                <code className="ml-1">palm/control</code> (commands) and <code>palm/status</code> (responses).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Codes Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Status Response Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">Success Status:</h4>
              <ul className="space-y-1 text-green-600">
                <li>• "user successfully registered"</li>
                <li>• "user deleted"</li>
                <li>• "successfully set to regist mode"</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-red-700 mb-2">Error Status:</h4>
              <ul className="space-y-1 text-red-600">
                <li>• "user already registered"</li>
                <li>• "'user_id' missing in regist command"</li>
                <li>• "'user_id' missing for delete command"</li>
                <li>• "SQL prepare error"</li>
                <li>• "Failed to open database"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
