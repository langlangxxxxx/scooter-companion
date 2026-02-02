// Scooter Context für globalen State
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  ScooterDevice, 
  TelemetryData, 
  BMSData, 
  ConnectionState, 
  DEFAULT_TELEMETRY, 
  DEFAULT_BMS 
} from '@/types/scooter';
import { bleManager } from '@/services/BleManager';
import { telemetryService } from '@/services/TelemetryService';
import { authService } from '@/services/AuthService';

interface ScooterContextType {
  // Connection
  connectionState: ConnectionState;
  connectedDevice: ScooterDevice | null;
  discoveredDevices: ScooterDevice[];
  
  // Data
  telemetry: TelemetryData;
  bms: BMSData;
  
  // Actions
  initialize: () => Promise<boolean>;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (device: ScooterDevice) => Promise<boolean>;
  disconnect: () => Promise<void>;
  isBluetoothEnabled: () => Promise<boolean>;
}

const ScooterContext = createContext<ScooterContextType | null>(null);

export function ScooterProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'disconnected' });
  const [connectedDevice, setConnectedDevice] = useState<ScooterDevice | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<ScooterDevice[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData>(DEFAULT_TELEMETRY);
  const [bms, setBms] = useState<BMSData>(DEFAULT_BMS);
  const [isInitialized, setIsInitialized] = useState(false);

  // BLE initialisieren
  const initialize = useCallback(async (): Promise<boolean> => {
    if (isInitialized) return true;
    
    const success = await bleManager.initialize();
    setIsInitialized(success);
    return success;
  }, [isInitialized]);

  // Bluetooth-Status prüfen
  const isBluetoothEnabled = useCallback(async (): Promise<boolean> => {
    return bleManager.isEnabled();
  }, []);

  // Scan starten
  const startScan = useCallback(async () => {
    await initialize();
    setDiscoveredDevices([]);
    const devices = await bleManager.scan(10000);
    setDiscoveredDevices(devices);
  }, [initialize]);

  // Scan stoppen
  const stopScan = useCallback(async () => {
    // BLE-Scan wird automatisch nach Timeout gestoppt
  }, []);

  // Mit Gerät verbinden
  const connect = useCallback(async (device: ScooterDevice): Promise<boolean> => {
    const success = await bleManager.connect(device);
    
    if (success) {
      const activeDevice = bleManager.getConnectedDevice() ?? { ...device, isConnected: true };
      setConnectedDevice(activeDevice);
      
      // Telemetrie-Polling starten
      telemetryService.startPolling(activeDevice.model, 300);
    }
    
    return success;
  }, []);

  // Verbindung trennen
  const disconnect = useCallback(async () => {
    await bleManager.disconnect();
    telemetryService.reset();
    setConnectedDevice(null);
    setTelemetry(DEFAULT_TELEMETRY);
    setBms(DEFAULT_BMS);
  }, []);

  // Listener für Connection State
  useEffect(() => {
    const unsubscribe = bleManager.onConnectionStateChange((state) => {
      setConnectionState(state);

      if (state.status === 'connected' && state.device) {
        setConnectedDevice((prev) => ({
          ...prev,
          ...state.device,
          isConnected: true,
        }));
      }
      
      if (state.status === 'disconnected') {
        setConnectedDevice(null);
        telemetryService.stopPolling();
      }
    });

    return unsubscribe;
  }, []);

  // Listener für Telemetrie
  useEffect(() => {
    const unsubscribeTelemetry = telemetryService.onTelemetryUpdate((data) => {
      setTelemetry(data);
    });

    const unsubscribeBms = telemetryService.onBMSUpdate((data) => {
      setBms(data);
    });

    return () => {
      unsubscribeTelemetry();
      unsubscribeBms();
    };
  }, []);

  const value: ScooterContextType = {
    connectionState,
    connectedDevice,
    discoveredDevices,
    telemetry,
    bms,
    initialize,
    startScan,
    stopScan,
    connect,
    disconnect,
    isBluetoothEnabled,
  };

  return (
    <ScooterContext.Provider value={value}>
      {children}
    </ScooterContext.Provider>
  );
}

export function useScooter(): ScooterContextType {
  const context = useContext(ScooterContext);
  if (!context) {
    throw new Error('useScooter must be used within a ScooterProvider');
  }
  return context;
}

export default ScooterContext;