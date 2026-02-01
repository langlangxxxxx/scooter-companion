// Dashboard Seite - Hauptbildschirm der App
import { motion } from 'framer-motion';
import { useScooter } from '@/contexts/ScooterContext';
import { BatteryWidget, Speedometer, StatusCards } from '@/components/scooter';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Bluetooth, Settings, Zap } from 'lucide-react';

export default function Dashboard() {
  const { 
    telemetry, 
    bms,
    connectedDevice, 
    connectionState 
  } = useScooter();

  const isConnected = connectionState.status === 'connected';

  // Demo-Daten wenn nicht verbunden
  const displayData = isConnected ? telemetry : {
    batteryPercent: 75,
    voltage: 38.5,
    current: -2.3,
    speed: 0,
    averageSpeed: 15.2,
    totalDistance: 234.5,
    tripDistance: 3.2,
    tripTime: 720,
    controllerTemp: 32,
    estimatedRange: 18.5,
    timestamp: Date.now(),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b"
      >
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">ScooterConnect</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to="/connect">
              <Button variant="ghost" size="icon">
                <Bluetooth className={isConnected ? 'text-primary' : 'text-muted-foreground'} />
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Connection Banner wenn nicht verbunden */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 border border-primary/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bluetooth className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Demo-Modus</p>
                  <p className="text-sm text-muted-foreground">
                    Verbinde deinen Scooter für Echtzeit-Daten
                  </p>
                </div>
              </div>
              <Link to="/connect">
                <Button size="sm">Verbinden</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Verbundenes Gerät */}
        {isConnected && connectedDevice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground">Verbunden mit</span>
            <span className="font-medium">{connectedDevice.name}</span>
          </motion.div>
        )}

        {/* Geschwindigkeits-Tacho */}
        <Speedometer 
          speed={displayData.speed}
          averageSpeed={displayData.averageSpeed}
          maxSpeed={25}
        />

        {/* Batterie-Widget */}
        <BatteryWidget
          percent={displayData.batteryPercent}
          voltage={displayData.voltage}
          current={displayData.current}
          temperature={displayData.controllerTemp}
          estimatedRange={displayData.estimatedRange}
        />

        {/* Status-Karten */}
        <StatusCards
          totalDistance={displayData.totalDistance}
          tripDistance={displayData.tripDistance}
          tripTime={displayData.tripTime}
          controllerTemp={displayData.controllerTemp}
          isConnected={isConnected}
          signalStrength={connectedDevice?.rssi}
        />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t safe-area-bottom">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            <Link to="/" className="flex flex-col items-center gap-1 text-primary">
              <Zap className="w-5 h-5" />
              <span className="text-xs font-medium">Dashboard</span>
            </Link>
            <Link to="/connect" className="flex flex-col items-center gap-1 text-muted-foreground">
              <Bluetooth className="w-5 h-5" />
              <span className="text-xs">Verbinden</span>
            </Link>
            <Link to="/settings" className="flex flex-col items-center gap-1 text-muted-foreground">
              <Settings className="w-5 h-5" />
              <span className="text-xs">Einstellungen</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
