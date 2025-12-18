/**
 * Capacitor Plugin - Bluetooth Thermal Printer
 * RenKredit by Renace.tech
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 
 * 1. Copiar este archivo a:
 *    android/app/src/main/java/tech/renace/renkredit/BluetoothPrinterPlugin.java
 * 
 * 2. Registrar el plugin en MainActivity.java:
 *    import tech.renace.renkredit.BluetoothPrinterPlugin;
 *    
 *    public class MainActivity extends BridgeActivity {
 *        @Override
 *        public void onCreate(Bundle savedInstanceState) {
 *            registerPlugin(BluetoothPrinterPlugin.class);
 *            super.onCreate(savedInstanceState);
 *        }
 *    }
 * 
 * 3. Agregar permisos en AndroidManifest.xml:
 *    <uses-permission android:name="android.permission.BLUETOOTH" />
 *    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
 *    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
 *    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
 * 
 * 4. Ejecutar: npx cap sync android
 */

package tech.renace.renkredit;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {
    
    private static final String TAG = "BluetoothPrinter";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket socket;
    private OutputStream outputStream;
    private BluetoothDevice connectedDevice;
    
    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }
    
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        if (bluetoothAdapter == null) {
            ret.put("available", false);
            ret.put("enabled", false);
        } else {
            ret.put("available", true);
            ret.put("enabled", bluetoothAdapter.isEnabled());
        }
        call.resolve(ret);
    }
    
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth no disponible");
            return;
        }
        
        if (!hasBluetoothPermissions()) {
            requestPermissionForAlias("bluetooth", call, "bluetoothCallback");
            return;
        }
        
        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devices = new JSArray();
            
            for (BluetoothDevice device : pairedDevices) {
                JSObject d = new JSObject();
                d.put("name", device.getName() != null ? device.getName() : "Unknown");
                d.put("address", device.getAddress());
                devices.put(d);
            }
            
            JSObject ret = new JSObject();
            ret.put("devices", devices);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error: " + e.getMessage());
        }
    }
    
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null) {
            call.reject("Address required");
            return;
        }
        
        if (!hasBluetoothPermissions()) {
            requestPermissionForAlias("bluetooth", call, "bluetoothCallback");
            return;
        }
        
        disconnect(null);
        
        try {
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            outputStream = socket.getOutputStream();
            connectedDevice = device;
            
            JSObject ret = new JSObject();
            ret.put("connected", true);
            ret.put("name", device.getName());
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("Connection failed: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            if (outputStream != null) { outputStream.close(); outputStream = null; }
            if (socket != null) { socket.close(); socket = null; }
            connectedDevice = null;
            
            if (call != null) {
                JSObject ret = new JSObject();
                ret.put("disconnected", true);
                call.resolve(ret);
            }
        } catch (IOException e) {
            if (call != null) call.reject("Error: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", socket != null && socket.isConnected());
        if (connectedDevice != null) {
            ret.put("name", connectedDevice.getName());
            ret.put("address", connectedDevice.getAddress());
        }
        call.resolve(ret);
    }
    
    @PluginMethod
    public void printRaw(PluginCall call) {
        String base64Data = call.getString("data");
        if (base64Data == null) {
            call.reject("Data required");
            return;
        }
        if (outputStream == null) {
            call.reject("Not connected");
            return;
        }
        
        try {
            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
            outputStream.write(data);
            outputStream.flush();
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("bytes", data.length);
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("Print error: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text", "");
        Boolean bold = call.getBoolean("bold", false);
        Boolean center = call.getBoolean("center", false);
        Boolean cut = call.getBoolean("cut", false);
        
        if (outputStream == null) {
            call.reject("Not connected");
            return;
        }
        
        try {
            // Init
            outputStream.write(new byte[] { 0x1B, 0x40 });
            // Align
            outputStream.write(new byte[] { 0x1B, 0x61, (byte)(center ? 1 : 0) });
            // Bold
            outputStream.write(new byte[] { 0x1B, 0x45, (byte)(bold ? 1 : 0) });
            // Text
            outputStream.write(text.getBytes(StandardCharsets.UTF_8));
            outputStream.write('\n');
            // Reset bold
            outputStream.write(new byte[] { 0x1B, 0x45, 0 });
            // Feed
            outputStream.write(new byte[] { 0x1B, 0x64, 3 });
            // Cut
            if (cut) outputStream.write(new byte[] { 0x1D, 0x56, 0x42, 0 });
            
            outputStream.flush();
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("Print error: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void printReceipt(PluginCall call) {
        String title = call.getString("title", "RenKredit");
        String subtitle = call.getString("subtitle", "");
        String content = call.getString("content", "");
        String footer = call.getString("footer", "");
        
        if (outputStream == null) {
            call.reject("Not connected");
            return;
        }
        
        try {
            byte[] init = { 0x1B, 0x40 };
            byte[] center = { 0x1B, 0x61, 1 };
            byte[] left = { 0x1B, 0x61, 0 };
            byte[] boldOn = { 0x1B, 0x45, 1 };
            byte[] boldOff = { 0x1B, 0x45, 0 };
            byte[] doubleSize = { 0x1D, 0x21, 0x11 };
            byte[] normalSize = { 0x1D, 0x21, 0x00 };
            byte[] feed = { 0x1B, 0x64, 5 };
            byte[] cut = { 0x1D, 0x56, 0x42, 0 };
            String sep = "================================\n";
            
            outputStream.write(init);
            outputStream.write(center);
            outputStream.write(doubleSize);
            outputStream.write((title + "\n").getBytes(StandardCharsets.UTF_8));
            outputStream.write(normalSize);
            if (!subtitle.isEmpty()) {
                outputStream.write((subtitle + "\n").getBytes(StandardCharsets.UTF_8));
            }
            outputStream.write(sep.getBytes(StandardCharsets.UTF_8));
            outputStream.write(left);
            outputStream.write(content.getBytes(StandardCharsets.UTF_8));
            outputStream.write(sep.getBytes(StandardCharsets.UTF_8));
            outputStream.write(center);
            outputStream.write(boldOn);
            outputStream.write((footer + "\n").getBytes(StandardCharsets.UTF_8));
            outputStream.write(boldOff);
            outputStream.write(feed);
            outputStream.write(cut);
            outputStream.flush();
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (IOException e) {
            call.reject("Print error: " + e.getMessage());
        }
    }
    
    @PermissionCallback
    private void bluetoothCallback(PluginCall call) {
        if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            String method = call.getMethodName();
            if ("getPairedDevices".equals(method)) getPairedDevices(call);
            else if ("connect".equals(method)) connect(call);
        } else {
            call.reject("Bluetooth permission required");
        }
    }
    
    private boolean hasBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }
}
