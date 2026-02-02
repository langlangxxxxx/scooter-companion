// Status-Karten Komponente
import { motion } from 'framer-motion';
import { 
  Navigation, 
  Timer, 
  Thermometer, 
  Signal, 
  Bluetooth,
  Route
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusCardsProps {
  totalDistance: number;
  tripDistance: number;
  tripTime: number;
  controllerTemp: number;
  isConnected: boolean;
  signalStrength?: number;
  className?: string;
}

export function StatusCards({
  totalDistance,
  tripDistance,
  tripTime,
  controllerTemp,
  isConnected,
  signalStrength = -70,
  className,
}: StatusCardsProps) {
  // Zeit formatieren (Sekunden zu MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Signalstärke-Icon
  const getSignalBars = (rssi: number) => {
    if (rssi > -50) return 4;
    if (rssi > -60) return 3;
    if (rssi > -70) return 2;
    return 1;
  };

  const cards = [
    {
      icon: Route,
      label: 'Gesamt',
      value: `${totalDistance.toFixed(1)} km`,
      color: 'text-primary',
    },
    {
      icon: Navigation,
      label: 'Fahrt',
      value: `${tripDistance.toFixed(2)} km`,
      color: 'text-primary',
    },
    {
      icon: Timer,
      label: 'Fahrzeit',
      value: formatTime(tripTime),
      color: 'text-accent-foreground',
    },
    {
      icon: Thermometer,
      label: 'Controller',
      value: `${controllerTemp.toFixed(0)}°C`,
      color: controllerTemp > 50 ? 'text-destructive' : 'text-primary',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={cn('w-4 h-4', card.color)} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-xl font-semibold tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Verbindungs-Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="col-span-2"
      >
        <Card className={cn(
          'border',
          isConnected ? 'border-primary/30 bg-primary/10' : 'border-muted'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isConnected ? 'bg-primary/20' : 'bg-muted'
                )}>
                  <Bluetooth className={cn(
                    'w-5 h-5',
                    isConnected ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                <div>
                  <p className="font-medium">
                    {isConnected ? 'Verbunden' : 'Getrennt'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isConnected ? 'Bluetooth LE aktiv' : 'Nicht verbunden'}
                  </p>
                </div>
              </div>

              {isConnected && (
                <div className="flex items-center gap-1">
                  <Signal className="w-4 h-4 text-muted-foreground" />
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={cn(
                          'w-1 rounded-full',
                          bar <= getSignalBars(signalStrength)
                            ? 'bg-primary'
                            : 'bg-muted',
                          bar === 1 ? 'h-2' : bar === 2 ? 'h-3' : bar === 3 ? 'h-4' : 'h-5'
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default StatusCards;
