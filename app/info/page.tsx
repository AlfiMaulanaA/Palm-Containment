"use client";

import {
  SiNodedotjs,
  SiPython,
  SiTypescript,
  SiJavascript,
  SiNextdotjs,
  SiHtml5,
  SiTailwindcss,
  SiCss3,
} from "react-icons/si";

import {
  FileQuestion,
  Network,
  Server,
  Settings,
  HardDrive,
  RotateCw,
  SatelliteDish,
  GaugeCircle,
  BarChart3,
  Database,
  Wrench,
  Code,
  Calculator,
  Mic,
  Clock,
  ArrowLeftRight,
  Search,
  Shield,
  Wifi,
  Monitor,
  Activity,
  FileText,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";

// Palm Recognition specific menu configuration
const menuData = {
  groups: [
    {
      title: "Palm Recognition",
      items: [
        {
          title: "Dashboard",
          url: "/",
          icon: BarChart3,
          isUse: true,
        },
        {
          title: "Palm User Data",
          url: "/palm-user-data",
          icon: Database,
          isUse: true,
        },
        {
          title: "Palm Recognition",
          url: "/palm-recognition",
          icon: Shield,
          isUse: true,
        },
      ],
    },
    {
      title: "System Configuration",
      items: [
        {
          title: "MQTT Settings",
          url: "/settings/mqtt",
          icon: SatelliteDish,
          isUse: true,
        },
        {
          title: "Camera Settings",
          url: "/settings/camera",
          icon: Monitor,
          isUse: true,
        },
      ],
    },
    {
      title: "System Monitoring",
      items: [
        {
          title: "System Logs",
          url: "/logs",
          icon: FileText,
          isUse: true,
        },
        {
          title: "Information",
          url: "/info",
          icon: Info,
          isUse: true,
        },
      ],
    },
  ],
};

// Function to map menu items to features
const mapMenuToFeatures = () => {
  const featureMap: Record<string, any> = {
    "Dashboard": {
      icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      category: "Palm Recognition",
      description: "Live palm vein camera feeds with real-time recognition results and automated door control.",
    },
    "Palm User Data": {
      icon: <Database className="w-6 h-6 text-green-600" />,
      category: "Palm Recognition",
      description: "Manage registered palm users, view biometric templates, and monitor user authentication status.",
    },
    "Palm Recognition": {
      icon: <Shield className="w-6 h-6 text-purple-600" />,
      category: "Palm Recognition",
      description: "Real-time palm recognition processing with configurable security thresholds and authentication results.",
    },
    "MQTT Settings": {
      icon: <SatelliteDish className="w-6 h-6 text-red-600" />,
      category: "System Configuration",
      description: "Configure MQTT broker connections for real-time communication and system monitoring.",
    },
    "Camera Settings": {
      icon: <Monitor className="w-6 h-6 text-cyan-600" />,
      category: "System Configuration",
      description: "Configure dual RGB/IR camera settings, image quality, and palm scanning parameters.",
    },
    "System Logs": {
      icon: <FileText className="w-6 h-6 text-orange-600" />,
      category: "System Monitoring",
      description: "View comprehensive system logs, palm recognition events, and diagnostic information.",
    },
    "Information": {
      icon: <Info className="w-6 h-6 text-indigo-600" />,
      category: "System Documentation",
      description: "Complete palm recognition system documentation, specifications, and user guides.",
    },
  };

  const features: any[] = [];

  menuData.groups.forEach(group => {
    group.items.forEach(item => {
      if (item.isUse === true && featureMap[item.title]) {
        features.push({
          title: item.title,
          ...featureMap[item.title]
        });
      }
    });
  });

  return features;
};

export default function InfoPage() {
  const { theme } = useTheme();

  // Dynamic image based on theme
  const gatewayImage = theme === 'dark'
    ? "/images/ilustation-mqtt-gateway-dark.png"
    : "/images/ilustation-mqtt-gateway-light.png";

  // Get features dynamically based on enabled menu items
  const features = mapMenuToFeatures();

  const techStack = [
    { name: "Python", icon: <SiPython size={32} className="text-blue-500" />, description: "Palm recognition algorithms and device control" },
    { name: "SQLite", icon: <Database size={32} className="text-blue-700" />, description: "Biometric template storage and user database" },
    { name: "Next.js", icon: <SiNextdotjs size={32} className="text-black dark:text-white" />, description: "Modern web dashboard for user management" },
    { name: "TypeScript", icon: <SiTypescript size={32} className="text-sky-600" />, description: "Type-safe frontend development" },
    { name: "Tailwind CSS", icon: <SiTailwindcss size={32} className="text-cyan-500" />, description: "Responsive UI styling framework" },
    { name: "MQTT", icon: <SatelliteDish size={32} className="text-red-600" />, description: "Real-time communication for recognition events" },
    { name: "OpenCV", icon: <SiPython size={32} className="text-green-600" />, description: "Computer vision for palm image processing" },
    { name: "NumPy", icon: <SiPython size={32} className="text-yellow-600" />, description: "Scientific computing for biometric algorithms" },
  ];

  const systemSpecs = [
    { label: "Biometric Technology", value: "Palm Vein Recognition" },
    { label: "Camera System", value: "Dual RGB + IR Sensors" },
    { label: "Recognition Accuracy", value: "Configurable threshold scoring" },
    { label: "Database", value: "SQLite with biometric templates" },
    { label: "Communication", value: "MQTT for real-time recognition" },
    { label: "Access Control", value: "Automated door control via MQTT" },
    { label: "Security", value: "High-accuracy biometric authentication" },
  ];

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <FileQuestion className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">System Information</h1>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.location.reload()}
          title="Reload page"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="px-6 py-8 space-y-8">
          {/* System Overview */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold">Palm Recognition Containment System</h2>
            </div>

            {/* Palm Device Illustration and Description */}
            <div className="flex flex-col lg:flex-row items-start gap-8 mb-6">
              {/* Image Section */}
              <div className="flex-shrink-0 w-[300px]">
                <div className="relative">
                  <img
                    src="/images/gspe.jpg"
                    alt="Palm Recognition Device"
                    className="w-full h-auto rounded-lg shadow-lg border border-border"
                  />
                </div>
              </div>

              {/* Description Section */}
              <div className="flex-1 w-full lg:w-1/2">
                <p className="text-muted-foreground leading-relaxed text-lg">
  Advanced palm vein recognition system for secure access control and containment management.
  This biometric security solution provides high-accuracy palm recognition technology with
  real-time authentication and automated door control capabilities.
</p>

<p className="text-muted-foreground leading-relaxed text-lg mt-4">
  The system features dual-camera palm scanning (RGB + IR), SQLite database integration,
  MQTT communication for remote monitoring, and a modern web-based dashboard for user management.
  Advanced algorithms ensure reliable recognition with configurable security thresholds,
  while comprehensive logging and real-time monitoring provide complete system oversight.
</p>

              </div>
            </div>

            {/* System Specifications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {systemSpecs.map((spec, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{spec.label}:</span>
                  <Badge variant="outline">{spec.value}</Badge>
                </div>
              ))}
            </div>


          </section>

          <Separator />

          {/* Features Overview */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <GaugeCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">System Features</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {feature.icon}
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {feature.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* Technology Stack */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Technology Stack</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {techStack.map((tech, index) => (
                <Card key={index} className="p-4 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    {tech.icon}
                    <h3 className="font-semibold">{tech.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{tech.description}</p>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* System Architecture */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Architecture Overview</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frontend (Web Dashboard)</CardTitle>
                  <CardDescription>Modern interface for palm recognition management</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Live palm vein camera feeds</li>
                    <li>• Real-time recognition results</li>
                    <li>• User database management</li>
                    <li>• Automated door control</li>
                    <li>• Comprehensive system monitoring</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backend (Palm Recognition Engine)</CardTitle>
                  <CardDescription>Advanced biometric processing and authentication</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Dual-camera palm scanning</li>
                    <li>• Vein pattern recognition algorithms</li>
                    <li>• SQLite biometric template storage</li>
                    <li>• MQTT real-time communication</li>
                    <li>• Configurable security thresholds</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

           
          </section>

          <Separator />

          {/* Getting Started */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Getting Started</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-blue-600">1</span>
                    </div>
                    <CardTitle className="text-lg">System Setup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Configure network settings, MQTT broker connection, and camera IP addresses
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-green-600">2</span>
                    </div>
                    <CardTitle className="text-lg">User Registration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Register palm users by capturing RGB and IR biometric templates for authentication
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-purple-600">3</span>
                    </div>
                    <CardTitle className="text-lg">Access Control</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Configure security thresholds, door control integration, and monitoring alerts
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>
      </div>
    </SidebarInset>
  );
}
