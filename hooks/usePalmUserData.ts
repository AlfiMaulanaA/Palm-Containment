"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMQTT } from "./useMQTT";
import { fetchPalmUsers, updatePalmUser, deletePalmUser } from "@/lib/openDoorMQTTConfig";
import { toast } from "sonner";

export interface PalmUser {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  role?: string;
  registered_at?: string;
  last_access?: string;
  status?: "active" | "inactive" | "suspended";
  has_biometric?: boolean;
  rgb_feature_length?: number;
  ir_feature_length?: number;
}

export interface PalmUsersResponse {
  status: "success" | "error";
  message: string;
  request_id: string;
  data?: PalmUser[];
  count?: number;
  timestamp: string;
}

export function usePalmUserData() {
  const [users, setUsers] = useState<PalmUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Use ref to avoid stale closure in handlers
  const pendingRequestsRef = useRef(pendingRequests);
  pendingRequestsRef.current = pendingRequests;

  // Debouncing for fetch operations
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_DEBOUNCE_MS = 1000; // Minimum 1 second between fetch calls

  // MQTT listener for palm user data responses and real-time updates
  const { addMessageHandler, publishMessage, isOnline } = useMQTT({
    topics: ["palm/users/response", "palm/status", "palm/realtime/updates"],
    autoSubscribe: true,
    enableLogging: true,
  });

  /**
   * Fetch palm users from database with debouncing
   */
  const fetchUsers = useCallback(async (force = false) => {
    const now = Date.now();

    // Check debouncing unless forced
    if (!force && (now - lastFetchTimeRef.current) < FETCH_DEBOUNCE_MS) {
      console.log("Fetch debounced - too soon since last fetch");
      return;
    }

    if (isLoading) {
      toast.warning("Please wait for the current fetch to complete");
      return;
    }

    // Update last fetch time
    lastFetchTimeRef.current = now;
    setIsLoading(true);

    try {
      // Send fetch command and get request ID
      const requestId = await fetchPalmUsers();

      // Add to pending requests
      setPendingRequests(prev => new Set(prev).add(requestId));

      // Set timeout for request (10 seconds)
      setTimeout(() => {
        setPendingRequests(prev => {
          if (prev.has(requestId)) {
            console.warn(`Request ${requestId} timed out`);
            toast.error("User data fetch request timed out");
            setIsLoading(false);
            return new Set([...prev].filter(id => id !== requestId));
          }
          return prev;
        });
      }, 10000);

    } catch (error) {
      console.error("Error fetching palm users:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch palm users");
      setIsLoading(false);
    }
  }, [isLoading]);

  // Ref to store latest fetchUsers function to avoid stale closure
  const fetchUsersRef = useRef(fetchUsers);
  fetchUsersRef.current = fetchUsers;

  /**
   * Refresh user data (bypasses debouncing for manual refresh)
   */
  const refreshUsers = useCallback(async () => {
    await fetchUsers(true); // Force refresh, bypass debouncing
  }, [fetchUsers]);

  /**
   * Clear user data
   */
  const clearUsers = useCallback(() => {
    setUsers([]);
    setLastFetch(null);
    setPendingRequests(new Set());
  }, []);

  /**
   * Get user by ID
   */
  const getUserById = useCallback((userId: string): PalmUser | undefined => {
    return users.find(user => user.user_id === userId);
  }, [users]);

  /**
   * Search users by query
   */
  const searchUsers = useCallback((query: string): PalmUser[] => {
    if (!query.trim()) return users;

    const lowerQuery = query.toLowerCase();
    return users.filter(user =>
      user.user_id.toLowerCase().includes(lowerQuery) ||
      user.name?.toLowerCase().includes(lowerQuery) ||
      user.email?.toLowerCase().includes(lowerQuery)
    );
  }, [users]);



  /**
   * Update existing user
   */
  const updateUser = useCallback(async (userData: {
    user_id: string;
    name?: string;
    email?: string;
    role?: string;
    status?: string;
  }) => {
    try {
      await updatePalmUser(userData);
      toast.success(`User ${userData.user_id} update request sent`);
      // Note: Data will be refreshed automatically when status response is received
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    }
  }, []);

  /**
   * Delete user
   */
  const removeUser = useCallback(async (userId: string) => {
    try {
      await deletePalmUser(userId);
      toast.success(`User ${userId} deletion request sent`);
      // Note: Data will be refreshed automatically when status response is received
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    }
  }, []);

  // Set up response message handlers
  useEffect(() => {
    const handleUserDataResponse = (topic: string, message: Buffer, packet?: any) => {
      try {
        // Skip retained messages to prevent showing old/stale user data
        if (packet && packet.retain) {
          console.log('Skipping retained user data message:', message.toString());
          return;
        }

        const data: PalmUsersResponse = JSON.parse(message.toString());
        console.log("Received palm users response:", data);

        // Check if this is a response to one of our pending requests
        if (data.request_id && pendingRequestsRef.current.has(data.request_id)) {
          // Remove from pending requests
          setPendingRequests(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.request_id);
            return newSet;
          });

          if (data.status === "success" && data.data) {
            setUsers(data.data);
            setLastFetch(new Date());
            toast.success(`Loaded ${data.data.length} palm users from database`);
          } else {
            toast.error(`Failed to fetch users: ${data.message}`);
          }

          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error parsing palm users response:", error);
        toast.error("Received invalid user data response");
        setIsLoading(false);
      }
    };

    const handlePalmStatusResponse = (topic: string, message: Buffer, packet?: any) => {
      try {
        // Skip retained messages to prevent showing old/stale status messages
        if (packet && packet.retain) {
          console.log('Skipping retained status message:', message.toString());
          return;
        }

        const data = JSON.parse(message.toString());
        console.log("🔄 Received palm status response:", data);
        console.log("📊 Status:", data.status, "| Message:", data.message);

        // Handle status responses for CRUD operations ONLY
        // Do NOT refresh data for registration-related messages
        if (data.status === "ok" || data.status === "success") {
          const message = data.message || "";

          // Only refresh data for actual database operations, not registration setup
          if (message.includes("user successfully registered") ||
              message.includes("user deleted") ||
              message.includes("user updated") ||
              message.includes("user created")) {
            // For successful database operations, refresh the data immediately
            console.log("✅ Database operation successful, refreshing data immediately...");
            toast.success("Operation completed successfully - refreshing data...");

            // Refresh immediately without delay for better UX
            fetchUsersRef.current(true); // Force refresh, bypass debouncing
          } else if (message.includes("successfully set to regist mode")) {
            // Registration mode activated - do NOT refresh data, let registration complete
            console.log("📝 Registration mode activated - waiting for completion...");
          } else {
            // Other success messages - log but don't refresh
            console.log("ℹ️ Status message received:", message);
          }
        } else if (data.status === "error" || data.status === "failed") {
          // Show specific error message from backend
          const errorMessage = data.message || "Unknown error occurred";
          console.error("❌ Palm operation failed:", errorMessage);
          toast.error(`Operation failed: ${errorMessage}`);
        } else {
          console.log("⚠️ Unknown status received:", data.status);
        }
      } catch (error) {
        console.error("❌ Error parsing palm status response:", error);
        toast.error("Received invalid response from palm device");
      }
    };

    const handleRealtimeUpdate = (topic: string, message: Buffer, packet?: any) => {
      try {
        // Skip retained messages to prevent showing old/stale real-time updates
        if (packet && packet.retain) {
          console.log('Skipping retained real-time update message:', message.toString());
          return;
        }

        const data = JSON.parse(message.toString());
        console.log("Received real-time update:", data);

        if (data.type === "biometric_sync") {
          // Handle biometric data synchronization update
          const { phone_number, device_id, timestamp, message: updateMessage } = data;

          // Show real-time notification only - no automatic data refresh
          toast.success(`🔄 ${updateMessage}`, {
            description: `Device: ${device_id} | Time: ${new Date(timestamp).toLocaleTimeString()}`,
            duration: 5000,
          });

          // Note: User can manually refresh data using the refresh button if needed
        }
      } catch (error) {
        console.error("Error parsing real-time update:", error);
        toast.error("Received invalid real-time update");
      }
    };

    addMessageHandler("palm/users/response", handleUserDataResponse);
    addMessageHandler("palm/status", handlePalmStatusResponse);
    addMessageHandler("palm/realtime/updates", handleRealtimeUpdate);
  }, [addMessageHandler, fetchUsers]);

  return {
    // State
    users,
    isLoading,
    lastFetch,
    hasData: users.length > 0,
    isOnline,

    // Functions
    fetchUsers,
    refreshUsers,
    clearUsers,
    getUserById,
    searchUsers,
    updateUser,
    removeUser,

    // Computed
    userCount: users.length,
    activeUsers: users.filter(user => user.status === "active").length,
    inactiveUsers: users.filter(user => user.status === "inactive").length,
  };
}
