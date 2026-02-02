// Batterie-Widget Komponente
import { motion } from 'framer-motion';
import { Battery, Zap, ThermometerSun } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BatteryWidgetProps {
  percent: number;
  voltage: number;
  current?: number;
  temperature?: number;
  estimatedRange?: number;
  className?: string;
}

export function BatteryWidget({ 
  percent, 
  voltage, 
  current = 0,
  temperature,
  estimatedRange,
  className 
}: BatteryWidgetProps) {
  // Farbe basierend auf Akkustand
  const getBatteryColor = (pct: number) => {
    if (pct > 15) return 'from-primary via-primary/80 to-accent-foreground';
    return 'from-destructive to-destructive/70';
  };

  const getTextColor = (pct: number) => {
    if (pct > 15) return 'text-primary';
    return 'text-destructive';
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Battery className={cn('w-6 h-6', getTextColor(percent))} />
            <span className="text-sm font-medium text-muted-foreground">Batterie</span>
          </div>
          {current !== 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span>{Math.abs(current).toFixed(1)}A</span>
            </div>
          )}
        </div>

        {/* Großer Prozent-Wert */}
        <div className="flex items-baseline gap-2 mb-4">
          <motion.span 
            key={percent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('text-5xl font-bold tabular-nums', getTextColor(percent))}
          >
            {percent}
          </motion.span>
          <span className="text-2xl text-muted-foreground">%</span>
        </div>

        {/* Batterie-Balken */}
        <div className="relative h-8 bg-secondary/80 rounded-lg overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'absolute inset-y-0 left-0 bg-gradient-to-r rounded-lg',
              getBatteryColor(percent)
            )}
          />
          {/* Segmente */}
          <div className="absolute inset-0 flex">
            {[20, 40, 60, 80].map((threshold) => (
              <div 
                key={threshold}
                className="flex-1 border-r border-background/20 last:border-r-0"
              />
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Spannung</span>
            <p className="font-semibold text-lg">{voltage.toFixed(1)}V</p>
          </div>
          {estimatedRange !== undefined && estimatedRange > 0 && (
            <div>
              <span className="text-muted-foreground">Reichweite</span>
              <p className="font-semibold text-lg">{estimatedRange.toFixed(1)} km</p>
            </div>
          )}
          {temperature !== undefined && (
            <div className="flex items-center gap-1">
              <ThermometerSun className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Temp:</span>
              <span className="font-semibold">{temperature.toFixed(0)}°C</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BatteryWidget;
