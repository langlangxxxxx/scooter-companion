// Verbindungs-Seite
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Bluetooth, 
  BluetoothSearching, 
  ArrowLeft, 
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceList } from '@/components/scooter';
import { useScooter } from '@/contexts/ScooterContext';
import { ScooterDevice } from '@/types/scooter';
import { cn } from '@/lib/utils';

export default function Connect() {
  const { 
    discoveredDevices, 
    connectionState, 
    connectedDevice,
    startScan, 
    connect, 
    disconnect,
    isBluetoothEnabled 
  } = useScooter();

  const [isScanning, setIsScanning] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string>();
  const [bluetoothEnabled, setBluetoothEnabled] = useState<boolean | null>(null);

  // Bluetooth-Status prüfen
  useEffect(() => {
    const checkBluetooth = async () => {
      const enabled = await isBluetoothEnabled();
      setBluetoothEnabled(enabled);
    };
    checkBluetooth();
  }, [isBluetoothEnabled]);

  // Scan starten
  const handleScan = async () => {
    setIsScanning(true);
    try {
      await startScan();
    } catch (error) {
      console.error('Scan fehlgeschlagen:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Mit Gerät verbinden
  const handleConnect = async (device: ScooterDevice) => {
    setConnectingDeviceId(device.id);
    try {
      await connect(device);
    } catch (error) {
      console.error('Verbindung fehlgeschlagen:', error);
    } finally {
      setConnectingDeviceId(undefined);
    }
  };

  const isConnected = connectionState.status === 'connected';
  const isConnecting = connectionState.status === 'connecting' || 
                       connectionState.status === 'authenticating';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">Scooter verbinden</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Bluetooth-Status */}
        {bluetoothEnabled === false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Bluetooth deaktiviert</p>
                <p className="text-sm text-muted-foreground">
                  Aktiviere Bluetooth in den Systemeinstellungen
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Verbundenes Gerät */}
        {isConnected && connectedDevice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{connectedDevice.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {connectedDevice.model === 'xiaomi-1s' ? 'Xiaomi 1S' : 'Ninebot G30'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={disconnect}>
                    Trennen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Scan-Button */}
        {!isConnected && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Nach Scootern suchen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-6">
                <motion.div
                  animate={isScanning ? { rotate: 360 } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className={cn(
                    'w-24 h-24 rounded-full flex items-center justify-center mb-6',
                    isScanning 
                      ? 'bg-primary/20' 
                      : 'bg-secondary'
                  )}
                >
                  {isScanning ? (
                    <BluetoothSearching className="w-12 h-12 text-primary" />
                  ) : (
                    <Bluetooth className="w-12 h-12 text-muted-foreground" />
                  )}
                </motion.div>

                <Button 
                  onClick={handleScan}
                  disabled={isScanning || bluetoothEnabled === false}
                  size="lg"
                  className="gap-2"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Suche läuft...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-4 h-4" />
                      Scan starten
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Stelle sicher, dass dein Scooter eingeschaltet ist und
                  sich in der Nähe befindet
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gefundene Geräte */}
        {!isConnected && discoveredDevices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold mb-4">
              Gefundene Geräte ({discoveredDevices.length})
            </h2>
            <DeviceList
              devices={discoveredDevices}
              onConnect={handleConnect}
              isConnecting={isConnecting}
              connectingDeviceId={connectingDeviceId}
            />
          </motion.div>
        )}

        {/* Registrierungs-Hinweis */}
        {connectionState.status === 'authenticating' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-primary/10 border border-primary/20 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <div>
                <p className="font-medium">Authentifizierung...</p>
                <p className="text-sm text-muted-foreground">
                  Bei Xiaomi 1S: Drücke den Power-Button am Scooter
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
