// Known Bluetooth printer service UUIDs
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const PRINTER_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
];

class BluetoothManager {
  constructor() {
    this._device = null;
    this._characteristic = null;
  }

  get isSupported() {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  get isConnected() {
    return !!this._device?.gatt?.connected;
  }

  get deviceName() {
    return this._device?.name || null;
  }

  getStatus() {
    return { connected: this.isConnected, deviceName: this.deviceName };
  }

  async scan() {
    if (!this.isSupported) {
      throw new Error('Bluetooth no disponible en este navegador. Usa Chrome en Android.');
    }

    try {
      return await navigator.bluetooth.requestDevice({
        filters: [
          { services: PRINTER_SERVICE_UUIDS },
          { namePrefix: '2C-' },
          { namePrefix: 'BTP' },
          { namePrefix: 'XP-' },
          { namePrefix: 'MHT-' },
          { namePrefix: 'RPP' },
          { namePrefix: 'MPT-' },
          { namePrefix: 'Star' },
          { namePrefix: 'TM-' },
        ],
        optionalServices: PRINTER_SERVICE_UUIDS,
      });
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: PRINTER_SERVICE_UUIDS,
        });
      }
      throw error;
    }
  }

  async connect(device) {
    if (!device?.gatt) throw new Error('Dispositivo Bluetooth no valido');

    const server = await device.gatt.connect();
    let service = null;
    let characteristic = null;

    for (const uuid of PRINTER_SERVICE_UUIDS) {
      try { service = await server.getPrimaryService(uuid); break; } catch { /* next */ }
    }

    if (!service) {
      const services = await server.getPrimaryServices();
      for (const svc of services) {
        try {
          const chars = await svc.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              service = svc;
              characteristic = char;
              break;
            }
          }
          if (characteristic) break;
        } catch { /* next */ }
      }
    }

    if (!service) throw new Error('No se encontro servicio de impresion compatible');

    if (!characteristic) {
      for (const uuid of PRINTER_CHAR_UUIDS) {
        try { characteristic = await service.getCharacteristic(uuid); break; } catch { /* next */ }
      }
      if (!characteristic) {
        const chars = await service.getCharacteristics();
        characteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
      }
    }

    if (!characteristic) throw new Error('No se encontro caracteristica de escritura');

    this._device = device;
    this._characteristic = characteristic;

    return { device, characteristic };
  }

  disconnect() {
    if (this._device?.gatt?.connected) {
      this._device.gatt.disconnect();
    }
    this._device = null;
    this._characteristic = null;
  }

  async sendData(data) {
    if (!this._characteristic) {
      throw new Error('Impresora no conectada. Conecta primero via Bluetooth.');
    }

    const CHUNK_SIZE = 200;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (this._characteristic.properties.writeWithoutResponse) {
        await this._characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this._characteristic.writeValue(chunk);
      }
      if (i + CHUNK_SIZE < data.length) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
  }
}

// Singleton instance
export const bluetoothManager = new BluetoothManager();
export default BluetoothManager;
