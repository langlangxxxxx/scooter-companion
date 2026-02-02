// Einstellungen-Seite
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Gauge, 
  Thermometer,
  Trash2,
  Info,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { authService } from '@/services/AuthService';
import { useToast } from '@/hooks/use-toast';
import { isDebugEnabled, setDebugEnabled } from '@/lib/debug';

export default function Settings() {
  const { toast } = useToast();
  const [useMiles, setUseMiles] = useState(false);
  const [useFahrenheit, setUseFahrenheit] = useState(false);
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [debugLogs, setDebugLogs] = useState(isDebugEnabled());

  // Theme wechseln
  const toggleTheme = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleDebugLogs = (enabled: boolean) => {
    setDebugLogs(enabled);
    setDebugEnabled(enabled);
  };

  // Alle Tokens löschen
  const handleClearTokens = () => {
    authService.clearAllTokens();
    toast({
      title: 'Tokens gelöscht',
      description: 'Alle gespeicherten Scooter-Verbindungen wurden entfernt.',
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">  
        <div className="container mx-auto px-4 h-14 flex items-center gap-4"> 
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">Einstellungen</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">  
        {/* Anzeige */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anzeige</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">  
              {/* Dark Mode */}
              <div className="flex items-center justify-between">  
                <div className="flex items-center gap-3">  
                  {darkMode ? (
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Sun className="w-5 h-5 text-muted-foreground" />
                  )}  
                  <Label htmlFor="dark-mode">Dunkles Design</Label>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={toggleTheme}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">  
                <div className="flex items-center gap-3">  
                  <Info className="w-5 h-5 text-muted-foreground" />
                  <div>  
                    <Label htmlFor="debug-logs">Debug-Logs</Label>
                    <p className="text-sm text-muted-foreground">
                      Erweiterte Konsolen-Logs für Fehlersuche
                    </p>
                  </div>
                </div>
                <Switch
                  id="debug-logs"
                  checked={debugLogs}
                  onCheckedChange={toggleDebugLogs}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>  

        {/* Einheiten */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Einheiten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">  
              {/* Geschwindigkeit */}
              <div className="flex items-center justify-between">  
                <div className="flex items-center gap-3">  
                  <Gauge className="w-5 h-5 text-muted-foreground" />
                  <div>  
                    <Label htmlFor="speed-unit">Meilen pro Stunde</Label>
                    <p className="text-sm text-muted-foreground">
                      mph statt km/h anzeigen
                    </p>
                  </div>
                </div>
                <Switch
                  id="speed-unit"
                  checked={useMiles}
                  onCheckedChange={setUseMiles}
                />
              </div>

              <Separator />

              {/* Temperatur */}
              <div className="flex items-center justify-between">  
                <div className="flex items-center gap-3">  
                  <Thermometer className="w-5 h-5 text-muted-foreground" />
                  <div>  
                    <Label htmlFor="temp-unit">Fahrenheit</Label>
                    <p className="text-sm text-muted-foreground">
                      °F statt °C anzeigen
                    </p>
                  </div>
                </div>
                <Switch
                  id="temp-unit"
                  checked={useFahrenheit}
                  onCheckedChange={setUseFahrenheit}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Verbindungen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verbindungen</CardTitle>
            </CardHeader>
            <CardContent>  
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleClearTokens}
              >
                <Trash2 className="w-4 h-4" />
                Alle Scooter-Tokens löschen
              </Button>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Erfordert erneute Registrierung beim nächsten Verbinden
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">  
              <div className="flex items-center gap-3">  
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>  
                  <p className="font-medium">ScooterConnect</p>
                  <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm text-muted-foreground">  
                <p>Unterstützte Scooter:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">  
                  <li>Xiaomi Mi Electric Scooter 1S</li>
                  <li>Ninebot Segway Max G30</li>
                </ul>
              </div>

              <Separator />

              <div className="flex items-center gap-2 text-sm">  
                <Info className="w-4 h-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Diese App nutzt Bluetooth Low Energy für die Kommunikation
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}