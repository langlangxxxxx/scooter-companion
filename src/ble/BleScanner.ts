import { BleManager, Device } from "react-native-ble-plx";
import { BLE_UUIDS } from "./bleUuids";

type ScooterScanResult = {
  device: Device;
  type: "NINEBOT_COMPATIBLE";
  hasFe95: boolean;
  hasNus: boolean;
};

const manager = new BleManager();

const normalizeServices = (services?: string[] | null): string[] =>
  (services || []).map((service) => service.toUpperCase());

export function startScooterScan(
  onFound: (result: ScooterScanResult) => void,
  onError?: (error: Error) => void
): void {
  manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      onError?.(error);
      return;
    }

    if (!device?.serviceUUIDs) return;

    const services = normalizeServices(device.serviceUUIDs);
    const hasFe95 = services.includes(BLE_UUIDS.ninebotFe95.service);
    const hasNus = services.includes(BLE_UUIDS.ninebotNus.service);

    if (hasFe95 || hasNus) {
      manager.stopDeviceScan();
      onFound({
        device,
        type: "NINEBOT_COMPATIBLE",
        hasFe95,
        hasNus,
      });
    }
  });
}

export function stopScooterScan(): void {
  manager.stopDeviceScan();
}

export function getBleManager(): BleManager {
  return manager;
}