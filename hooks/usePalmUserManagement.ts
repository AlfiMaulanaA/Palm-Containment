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
        const statusHandler = (status: PalmStatusResponse) => {
          // Call callback if provided
          if (onStatusUpdate) {
            onStatusUpdate(status);
          }

          // Handle multi-step registration process
          if (status.status === "ok") {
            if (status.message.includes("successfully set to regist mode")) {
              // First step: Registration mode activated
              toast.info("Registration mode activated. Please place palm on sensor.");
            } else if (status.message.includes("user successfully registered")) {
              // Final step: Registration completed successfully
              toast.success(`User ${userId} registered successfully!`);
              setIsProcessing(false); // Only set to false on final success
            } else {
              // Other success messages
              toast.success(status.message);
            }
          } else {
            // Error status
            toast.error(`Registration failed: ${status.message}`);
            setIsProcessing(false); // Set to false on error
          }

          setLastStatus(status);
        };

        // Set up the status handler
        addMessageHandler("palm/status", (topic: string, message: Buffer) => {
          try {
            const data: PalmStatusResponse = JSON.parse(message.toString());
            console.log("Received palm status during registration:", data);
            statusHandler(data);
          } catch (error) {
            console.error("Error parsing palm status message:", error);
            toast.error("Received invalid palm status message");
            setIsProcessing(false);
          }
        });

        // Send registration command
        await registerPalmUser(userId);

        // Show initial info that command was sent
        toast.info(`Registration command sent for user: ${userId}`);

      } catch (error) {
        console.error("Palm registration error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to register palm user");
        setIsProcessing(false);
      }
    },
    [isProcessing, addMessageHandler]
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
        const statusHandler = (status: PalmStatusResponse) => {
          // Call callback if provided
          if (onStatusUpdate) {
            onStatusUpdate(status);
          }

          // Handle deletion status
          if (status.status === "ok") {
            toast.success(`User ${userId} deleted successfully!`);
            setIsProcessing(false); // Set to false on success
          } else {
            // Error status
            toast.error(`Deletion failed: ${status.message}`);
            setIsProcessing(false); // Set to false on error
          }

          setLastStatus(status);
        };

        // Set up the status handler
        addMessageHandler("palm/status", (topic: string, message: Buffer) => {
          try {
            const data: PalmStatusResponse = JSON.parse(message.toString());
            console.log("Received palm status during deletion:", data);
            statusHandler(data);
          } catch (error) {
            console.error("Error parsing palm status message:", error);
            toast.error("Received invalid palm status message");
            setIsProcessing(false);
          }
        });

        // Send deletion command
        await deletePalmUser(userId);

        // Show initial info that command was sent
        toast.info(`Delete command sent for user: ${userId}`);

      } catch (error) {
        console.error("Palm deletion error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to delete palm user");
        setIsProcessing(false);
      }
    },
    [isProcessing, addMessageHandler]
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
