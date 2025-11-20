"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Database,
  Users,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  CheckCircle,
  Trash2,
  UserPlus
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePalmUserData, PalmUser } from "@/hooks/usePalmUserData";
import { usePalmUserManagement } from "@/hooks/usePalmUserManagement";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import MQTTConnectionBadge from "@/components/mqtt-status";

export default function PalmUserDataPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [registerUserId, setRegisterUserId] = useState("");
  const [selectedHand, setSelectedHand] = useState<string>("");
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);

  const {
    users,
    isLoading,
    lastFetch,
    hasData,
    fetchUsers,
    refreshUsers,
    clearUsers,
    searchUsers,
    updateUser,
    removeUser,
    userCount,
    activeUsers,
    inactiveUsers,
    isOnline: isMQTTOnline
  } = usePalmUserData();

  const { registerUser, deleteUser, isProcessing: isRegistering } = usePalmUserManagement();

  // Filtered users based on search
  const filteredUsers = searchQuery ? searchUsers(searchQuery) : users;

  // Load users on component mount immediately (don't wait for MQTT)
  useEffect(() => {
    if (!hasData && !isLoading) {
      fetchUsers();
    }
  }, [hasData, isLoading, fetchUsers]);

  const handleRefresh = async () => {
    await refreshUsers();
  };

  const handleClear = () => {
    clearUsers();
    toast.info("User data cleared from view");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500"><UserCheck className="w-3 h-3 mr-1" />Active</Badge>;
      case "inactive":
        return <Badge variant="secondary"><UserX className="w-3 h-3 mr-1" />Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    return (
      <Badge variant="outline" className="text-xs">
        {role}
      </Badge>
    );
  };

  // Determine biometric status based on RGB and IR completeness
  const getBiometricStatus = (user: PalmUser) => {
    const hasRgb = user.rgb_feature_length && user.rgb_feature_length > 0;
    const hasIr = user.ir_feature_length && user.ir_feature_length > 0;

    // Active only if BOTH RGB and IR are present and complete
    return hasRgb && hasIr;
  };

  // Register Palm User
  const handleRegisterPalmUser = async () => {
    if (!registerUserId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    if (!selectedHand) {
      toast.error("Please select a hand");
      return;
    }

    try {
      // Create final user ID with hand selection
      const handLabel = selectedHand === "left" ? "Left Hand" : "Right Hand";
      const finalUserId = `${registerUserId.trim()} - ${handLabel}`;

      await registerUser(finalUserId);
      setRegisterUserId(""); // Clear input after successful command
      setSelectedHand(""); // Clear hand selection
      setIsRegisterDialogOpen(false); // Close dialog
      // Note: Data refresh is handled automatically by the hook when registration completes
    } catch (error) {
      // Error is handled in the hook
    }
  };

  // CRUD Operations
  const handleDeleteUser = async (userId: string) => {
    try {
      // Trim whitespace from userId to ensure clean input
      const cleanUserId = userId.trim();
      console.log(`Attempting to delete user: "${userId}" -> "${cleanUserId}"`);
      await deleteUser(cleanUserId);
      // Note: Data refresh is handled automatically by the hook when deletion completes
    } catch (error) {
      // Error is handled in the hook
    }
  };



  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h1 className="text-lg font-semibold">User Management</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MQTTConnectionBadge />
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">


        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold">{userCount}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold text-green-600">{activeUsers}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                  <p className="text-3xl font-bold text-gray-600">{inactiveUsers}</p>
                </div>
                <UserX className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Biometric Complete</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {users.filter(user => getBiometricStatus(user)).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Palm Users
                  {searchQuery && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredUsers.length} of {userCount} results
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Complete list of registered palm recognition users from database
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsRegisterDialogOpen(true)}
                  disabled={isRegistering}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isRegistering ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register Palm User
                    </>
                  )}
                </Button>
                <Button onClick={handleRefresh} disabled={isLoading} size="sm">
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </>
                  )}
                </Button>
              </div>
            </div>
            {/* Search Input */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1 max-w-sm">
                <Label htmlFor="search" className="text-sm font-medium">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by name or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && users.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading user data from database...</span>
              </div>
            ) : hasData ? (
              <div className="rounded-md border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold w-16">#</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Biometric Status</TableHead>
                      <TableHead className="font-semibold">Account Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: PalmUser, index: number) => (
                      <TableRow
                        key={user.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                        }`}
                      >
                        <TableCell className="font-medium text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {(user.user_id || "N/A").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm">{user.user_id || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getBiometricStatus(user) ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs font-medium text-green-700">Biometric Complete</span>
                              </div>
                              <div className="text-xs text-muted-foreground pl-4 space-y-0.5">
                                <div>RGB: <span className="font-mono text-green-600">{(user.rgb_feature_length || 0).toLocaleString()}</span> chars</div>
                                <div>IR: <span className="font-mono text-green-600">{(user.ir_feature_length || 0).toLocaleString()}</span> chars</div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-xs font-medium text-red-700">Biometric Incomplete</span>
                              </div>
                              <div className="text-xs text-muted-foreground pl-4 space-y-0.5">
                                <div>RGB: <span className={`font-mono ${(user.rgb_feature_length || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{(user.rgb_feature_length || 0).toLocaleString()}</span> chars</div>
                                <div>IR: <span className={`font-mono ${(user.ir_feature_length || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{(user.ir_feature_length || 0).toLocaleString()}</span> chars</div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete user "{user.user_id}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.user_id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Database className="h-10 w-10 text-muted-foreground" />
                  </div>

                </div>
                <h3 className="text-xl font-semibold mb-2">No User Data Available</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  The palm recognition database hasn't been loaded yet. Click the button below to fetch user data from the biometric system.
                </p>
                <div className="flex justify-center">
                  <Button onClick={handleRefresh} disabled={isLoading} size="lg">
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading Data...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Load User Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>



        {/* Usage Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Database Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">How it works:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click "Refresh Data" to fetch users from palm database</li>
                  <li>System sends MQTT command to palm device</li>
                  <li>Palm device queries SQLite database</li>
                  <li>User data is returned via MQTT response topic</li>
                  <li>Data is displayed in the table above</li>
                </ol>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  <strong>MQTT Topics:</strong>
                  <br />
                  Command: <code>palm/control</code> - Send fetch request
                  <br />
                  Response: <code>palm/users/response</code> - Receive user data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Register Palm User Dialog */}
        <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Register Palm User
              </DialogTitle>
              <DialogDescription>
                Enter a unique user ID to register a new palm user. The palm recognition device will prompt for palm placement.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="register-user-id" className="text-right">
                  User ID
                </Label>
                <Input
                  id="register-user-id"
                  value={registerUserId}
                  onChange={(e) => setRegisterUserId(e.target.value)}
                  placeholder="Enter user ID (e.g., user123)"
                  className="col-span-3"
                  disabled={isRegistering}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isRegistering && selectedHand) {
                      handleRegisterPalmUser();
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hand-selection" className="text-right">
                  Hand
                </Label>
                <Select value={selectedHand} onValueChange={setSelectedHand} disabled={isRegistering}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select hand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left Hand</SelectItem>
                    <SelectItem value="right">Right Hand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRegisterDialogOpen(false);
                  setRegisterUserId("");
                }}
                disabled={isRegistering}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRegisterPalmUser}
                disabled={isRegistering || !registerUserId.trim() || !selectedHand}
                className="bg-green-600 hover:bg-green-700"
              >
                {isRegistering ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  );
}
