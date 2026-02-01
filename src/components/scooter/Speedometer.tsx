// Geschwindigkeits-Tacho Komponente
import { motion } from 'framer-motion';
import { Gauge, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SpeedometerProps {
  speed: number;
  averageSpeed?: number;
  maxSpeed?: number;
  className?: string;
}

export function Speedometer({ 
  speed, 
  averageSpeed = 0, 
  maxSpeed = 25,
  className 
}: SpeedometerProps) {
  // Winkel für den Zeiger (0 = links, 180 = rechts)
  const angle = Math.min((speed / maxSpeed) * 180, 180);
  
  // Farbe basierend auf Geschwindigkeit
  const getSpeedColor = () => {
    const ratio = speed / maxSpeed;
    if (ratio > 0.9) return 'text-red-500';
    if (ratio > 0.7) return 'text-orange-500';
    if (ratio > 0.5) return 'text-yellow-500';
    return 'text-primary';
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Tacho-Kreisbogen */}
        <div className="relative w-full aspect-[2/1] mb-4">
          {/* Hintergrund-Bogen */}
          <svg 
            viewBox="0 0 200 100" 
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          >
            {/* Hintergrund-Arc */}
            <path
              d="M 10 95 A 90 90 0 0 1 190 95"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="12"
              strokeLinecap="round"
            />
            
            {/* Geschwindigkeits-Arc */}
            <motion.path
              d="M 10 95 A 90 90 0 0 1 190 95"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: Math.min(speed / maxSpeed, 1) }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Skala-Markierungen */}
            {[0, 5, 10, 15, 20, 25].map((value, i) => {
              const markerAngle = (value / maxSpeed) * 180 - 90;
              const radians = (markerAngle * Math.PI) / 180;
              const x1 = 100 + 75 * Math.cos(radians);
              const y1 = 95 + 75 * Math.sin(radians);
              const x2 = 100 + 85 * Math.cos(radians);
              const y2 = 95 + 85 * Math.sin(radians);
              const textX = 100 + 65 * Math.cos(radians);
              const textY = 95 + 65 * Math.sin(radians);
              
              return (
                <g key={value}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="2"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-[8px] font-medium"
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            {/* Zeiger */}
            <motion.g
              initial={{ rotate: -90 }}
              animate={{ rotate: angle - 90 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ transformOrigin: '100px 95px' }}
            >
              <line
                x1="100"
                y1="95"
                x2="100"
                y2="25"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx="100"
                cy="95"
                r="8"
                fill="hsl(var(--primary))"
              />
            </motion.g>
          </svg>
        </div>

        {/* Geschwindigkeits-Wert */}
        <div className="text-center mb-4">
          <motion.div 
            key={speed}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="flex items-baseline justify-center gap-2"
          >
            <span className={cn('text-6xl font-bold tabular-nums', getSpeedColor())}>
              {speed.toFixed(1)}
            </span>
            <span className="text-2xl text-muted-foreground">km/h</span>
          </motion.div>
        </div>

        {/* Durchschnittsgeschwindigkeit */}
        {averageSpeed > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>Ø {averageSpeed.toFixed(1)} km/h</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Speedometer;
