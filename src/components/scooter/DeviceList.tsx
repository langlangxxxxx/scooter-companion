// Geräte-Liste Komponente für gefundene Scooter
import { motion } from 'framer-motion';
import { Bluetooth, SignalHigh, SignalMedium, SignalLow, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScooterDevice } from '@/types/scooter';
import { cn } from '@/lib/utils';

interface DeviceListProps {
  devices: ScooterDevice[];
  onConnect: (device: ScooterDevice) => void;
  isConnecting: boolean;
  connectingDeviceId?: string;
  className?: string;
}

export function DeviceList({ 
  devices, 
  onConnect, 
  isConnecting,
  connectingDeviceId,
  className 
}: DeviceListProps) {
  // Signal-Stärke Icon
  const getSignalIcon = (rssi: number) => {
    if (rssi > -60) return SignalHigh;
    if (rssi > -75) return SignalMedium;
    return SignalLow;
  };

  // Scooter-Modell Label
  const getModelLabel = (model: ScooterDevice['model']) => {
    switch (model) {
      case 'xiaomi-1s':
        return 'Xiaomi 1S';
      case 'ninebot-g30':
        return 'Ninebot G30';
      default:
        return 'Unbekannt';
    }
  };

  // Modell-Farbe
  const getModelColor = (model: ScooterDevice['model']) => {
    switch (model) {
      case 'xiaomi-1s':
        return 'bg-orange-500/10 text-orange-500';
      case 'ninebot-g30':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (devices.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Bluetooth className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Keine Scooter gefunden</p>
        <p className="text-sm text-muted-foreground mt-1">
          Stelle sicher, dass dein Scooter eingeschaltet ist
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {devices.map((device, index) => {
        const SignalIcon = getSignalIcon(device.rssi);
        const isThisConnecting = isConnecting && connectingDeviceId === device.id;
        
        return (
          <motion.div
            key={device.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Bluetooth Icon */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bluetooth className="w-6 h-6 text-primary" />
                    </div>
                    
                    {/* Device Info */}
                    <div>
                      <h3 className="font-semibold">{device.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          getModelColor(device.model)
                        )}>
                          {getModelLabel(device.model)}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <SignalIcon className="w-3 h-3" />
                          <span>{device.rssi} dBm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connect Button */}
                  <Button
                    onClick={() => onConnect(device)}
                    disabled={isConnecting}
                    size="sm"
                  >
                    {isThisConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verbinde...
                      </>
                    ) : (
                      'Verbinden'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export default DeviceList;
