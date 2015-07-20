# /org/bluez/hci0/dev_18_7A_93_02_C5_A9

#address 18:7A:93:02:C5:A9

# Device 18:7A:93:02:C5:A9 UUIDs:
#         00001800-0000-1000-8000-00805f9b34fb
#         00001802-0000-1000-8000-00805f9b34fb
#         00001803-0000-1000-8000-00805f9b34fb
#         00001804-0000-1000-8000-00805f9b34fb
#         0000180a-0000-1000-8000-00805f9b34fb
#         0000180d-0000-1000-8000-00805f9b34fb
#         0000180f-0000-1000-8000-00805f9b34fb
#         0000fff0-0000-1000-8000-00805f9b34fb
#         0000fff3-0000-1000-8000-00805f9b34fb


import dbus
import dbus.mainloop.glib

try:
  from gi.repository import GObject
except ImportError:
  import gobject as GObject

SERVICE_NAME = "org.bluez"
ADAPTER_INTERFACE = SERVICE_NAME + ".Adapter1"
DEVICE_INTERFACE = SERVICE_NAME + ".Device1"


def print_rssi(interface, signal, arg, path):
	print('hello world')
	print(interface, signal, arg, path)

def property_changed():
	print('property_changed')

def scan_bt():
	bus = dbus.SystemBus()
	manager = dbus.Interface(bus.get_object("org.bluez", "/"),"org.freedesktop.DBus.ObjectManager")
	managed_objects = manager.GetManagedObjects()
	
	beacon1 = managed_objects['/org/bluez/hci0/dev_18_7A_93_02_C5_A9']
	info = beacon1['org.bluez.Device1']
	rssi = info['RSSI']
	return rssi.real

if __name__ == '__main__':

	dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
	
	bus = dbus.SystemBus()

	bus.add_signal_receiver(print_rssi,
			dbus_interface = "org.freedesktop.DBus.Properties",
			signal_name = "PropertiesChanged",
			arg0 = "org.bluez.Device1",
			path_keyword = "path")	

	bus.add_signal_receiver(property_changed,
					dbus_interface = "org.bluez.Adapter1",
					signal_name = "PropertyChanged")

	mainloop = GObject.MainLoop()
	mainloop.run()	