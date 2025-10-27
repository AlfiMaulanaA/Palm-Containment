"use client";

import { useState, useCallback } from "react";
import { useMQTT } from "./useMQTT";
import { registerPalmUser, deletePalmUser } from "@/lib/openDoorMQTTConfig";
import { toast } from "sonner";

export interface PalmStatusResponse {
  status: "ok" | "failed";
  message: string;
}

export function usePalmUserManagement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastStatus, setLastStatus] = useState<PalmStatusResponse | null>(null);

  // MQTT listener for palm device status
  const { addMessageHandler } = useMQTT({
    topics: ["palm/status"],
    autoSubscribe: true,
    enableLogging: true,
  });

  // Set up status message handler
  const setupStatusHandler = useCallback(
    (onStatusUpdate?: (status: PalmStatusResponse) => void) => {
      addMessageHandler("palm/status", (topic: string, message: Buffer) => {
        try {
          const data: PalmStatusResponse = JSON.parse(message.toString());
          console.log("Received palm status:", data);

          setLastStatus(data);

          // Call callback if provided
          if (onStatusUpdate) {
            onStatusUpdate(data);
          }

          // Show toast based on status
          if (data.status === "ok") {
            toast.success(data.message);
          } else {
            toast.error(`Palm operation failed: ${data.message}`);
          }
        } catch (error) {
          console.error("Error parsing palm status message:", error);
          toast.error("Received invalid palm status message");
        }
      });
    },
    [addMessageHandler]
  );

  /**
   * Register a palm user
   * @param userId - User ID to register
   * @param onStatusUpdate - Optional callback for status updates
   */
  const registerUser = useCallback(
    async (userId: string, onStatusUpdate?: (status: PalmStatusResponse) => void) => {
      if (isProcessing) {
        toast.warning("Please wait for the current operation to complete");
        return;
      }

      if (!userId || userId.trim() === "") {
        toast.error("User ID is required");
        return;
      }

      setIsProcessing(true);
      setLastStatus(null);

      try {
        // Set up status handler for this operation
        setupStatusHandler(onStatusUpdate);

        // Send registration command
        await registerPalmUser(userId);

        // Show info that command was sent (status will come separately)
        toast.info(`Registration command sent for user: ${userId}. Please place palm on sensor.`);

      } catch (error) {
        console.error("Palm registration error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to register palm user");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, setupStatusHandler]
  );

  /**
   * Delete a palm user
   * @param userId - User ID to delete
   * @param onStatusUpdate - Optional callback for status updates
   */
  const deleteUser = useCallback(
    async (userId: string, onStatusUpdate?: (status: PalmStatusResponse) => void) => {
      if (isProcessing) {
        toast.warning("Please wait for the current operation to complete");
        return;
      }

      if (!userId || userId.trim() === "") {
        toast.error("User ID is required");
        return;
      }

      setIsProcessing(true);
      setLastStatus(null);

      try {
        // Set up status handler for this operation
        setupStatusHandler(onStatusUpdate);

        // Send deletion command
        await deletePalmUser(userId);

        // Show info that command was sent (status will come separately)
        toast.info(`Delete command sent for user: ${userId}`);

      } catch (error) {
        console.error("Palm deletion error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to delete palm user");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, setupStatusHandler]
  );

  return {
    // State
    isProcessing,
    lastStatus,

    // Functions
    registerUser,
    deleteUser,
    setupStatusHandler,

    // Utilities
    clearStatus: useCallback(() => setLastStatus(null), []),
  };
}
