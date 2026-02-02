import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { BLE_UUIDS } from "./bleUuids";
import { detectNinebotModel, NinebotModelInfo } from "./detectNinebotModel";

export type ScooterConnection = {
  device: Device;
  serial: string;
  type: "NINEBOT_COMPATIBLE";
  modelInfo: NinebotModelInfo;
};

export type ScooterState = {
  device: Device;
  serial: string;
  type: "NINEBOT_COMPATIBLE";
  model: string;
  generation: number;
};

const SERIAL_REGEX = /N\d[A-Z0-9]{6,}/;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectScooter(
  manager: BleManager,
  device: Device,
  onState?: (state: ScooterState) => void
): Promise<ScooterConnection> {
  const connected = await manager.connectToDevice(device.id);
  const discovered = await connected.discoverAllServicesAndCharacteristics();

  await wait(150);

  const serial =
    (await readSerialFe95(discovered)) ||
    (await readSerialViaNus(discovered));

  if (!serial) {
    await discovered.cancelConnection();
    throw new Error("NO_SERIAL_NUMBER");
  }

  const modelInfo = detectNinebotModel(serial);

  const connection = {
    device: discovered,
    serial,
    type: "NINEBOT_COMPATIBLE",
    modelInfo,
  } satisfies ScooterConnection;

  onState?.({
    device: discovered,
    serial,
    type: connection.type,
    model: modelInfo.model,
    generation: modelInfo.generation,
  });

  return connection;
}

async function readSerialFe95(device: Device): Promise<string | null> {
  try {
    const characteristic = await device.readCharacteristicForService(
      BLE_UUIDS.ninebotFe95.service,
      BLE_UUIDS.ninebotFe95.info
    );

    if (!characteristic?.value) return null;

    const data = Buffer.from(characteristic.value, "base64");
    const ascii = data.toString("ascii").trim();

    if (ascii.length > 5) {
      return ascii;
    }
  } catch {
    return null;
  }

  return null;
}

async function readSerialViaNus(device: Device): Promise<string | null> {
  const command = Buffer.from("55AA03200100", "hex").toString("base64");

  try {
    const serial = await waitForSerialFromNus(device, command, 1000);
    return serial;
  } catch {
    return null;
  }
}

async function waitForSerialFromNus(
  device: Device,
  commandBase64: string,
  timeoutMs: number
): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    let resolved = false;

    const cleanup = (subscription?: { remove: () => void }) => {
      if (resolved) return;
      resolved = true;
      subscription?.remove();
    };

    const timeout = setTimeout(() => {
      cleanup(subscription);
      resolve(null);
    }, timeoutMs);

    let subscription: { remove: () => void } | undefined;

    try {
      subscription = device.monitorCharacteristicForService(
        BLE_UUIDS.ninebotNus.service,
        BLE_UUIDS.ninebotNus.rx,
        (error, characteristic) => {
          if (error || !characteristic?.value || resolved) return;

          const data = Buffer.from(characteristic.value, "base64");
          const text = data.toString("ascii");
          const match = text.match(SERIAL_REGEX);

          if (match?.[0]) {
            clearTimeout(timeout);
            cleanup(subscription);
            resolve(match[0]);
          }
        }
      );

      await device.writeCharacteristicWithResponseForService(
        BLE_UUIDS.ninebotNus.service,
        BLE_UUIDS.ninebotNus.tx,
        commandBase64
      );
    } catch (error) {
      clearTimeout(timeout);
      cleanup(subscription);
      reject(error);
    }
  });
}