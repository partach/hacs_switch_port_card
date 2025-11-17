# hacs_switch_port_card
This Home Assistant card shows the status of your switch ports.
BE WARNED: requires some manual actions in HA and your switch...

<p align="center">
  <img src="https://github.com/partach/hacs_switch_port_card/blob/main/switch-port-card3.png" width="600"/>
  <br>
  <em>Live port status with color coding: 10M/100M (orange), 1G (green), 10G (blue), DOWN (gray)</em>
</p>


First version is veriefied with:
Real-time **28-port status** (24 copper + 4 SFP) for Zyxel XGS1935 (and similar) using **direct entity access**.
But... quite some configurations are possible so will probably work for your switch as well. 

The card is based on and therefor depedent on `SNMP data`. 

**IMPORTANT 1**: You must add snmp entities in your configuration.yaml for it to work.
Tip: Add only files where you store your sensor entities and or switch (not meaning a network switch) entities to configuration.yaml.
Example (use your own / extend to your own):

```yaml
switch: !include snmp_switch_entities.yaml 
sensor: !include config_sensors.yaml
```
I have done the leg work and attached both files as example in the code (see code list in github).
  - Just download them and place them in your HA config directory where also configuration.yaml lives
  - it consist of 28 ports (so adjust to what you need)
  - You need to define the secret variables use yourself in your secrets.yaml...
  - basoid needs to be changed to what your switch needs (some are standard accross them, some are definitly not)
Below is explained how to add the entities one by one if you want to


**IMPORTANT 2**: SNMP requires the right baseoid for getting the right data.
This baseoid is often manufacturer dependent. 
So, when defining your sensor / switch entities make sure to check if the baseoid matches the needed 'field'
(see below for details)

## Features
- Auto-detects `10M`, `100M`, `1G`, `10G`, `DM`(Downsteam Mode), `DOWN`
- Responsive, no clipping
- Works with defined status and speed entities `switch.mainswitch_port_X` + `sensor.mainswitch_port_speed_X` (see below) 

## Installation
1. Install in first instance is by hand by placing the `switch-port-card.js` file in `www\community\` directory (make subdir switch-port-card and put it there)

    * In HA go to Settings > Dashboards > Resources
    * Add: 
      * URL: `/local/community/switch-port-card/switch-port-card.js`
      * Type: `JavaScript Module`

2. Add to Lovelace:
Only for those doing it the old way (above way is better)
```yaml
type: custom:switch-port-card
name: Main Switch
```
## Preparing your switch
You need to enable SNMP in your switch. This is different per manufacturer, please follow the switch manual (don't ask me).
What is important that you need:
 * SNMP enabled (duh; although tricky to find on some switches)
 * Define the community string (per default this is named `public` but you can change for slightly better security). Also needed by HA
 * The example uses SNMP Version v2C that you should set both at switch side and at HA sensor side (see below)
 * Set target IP trap desitnation towards your HA IP
 * Some switches require different additional details settings (follow manufacturer manual)

## Adding the needed sensors to HA
Below you can add directly to your configuration.yaml, but better to add to seperate file (see above tip)
Add these entities below per port you have (first card assumes existence of 28 ports of which 4 are SPF)
--> if you want to change you can change the switch-port-card.js settings

When defining 'Sensor entities'
`!!for x=1 to x=the number of ports your switch has!!`
```yaml
  - platform: snmp
    name: Mainswitch Port Speed x
    host: 192.168.1.1 # change for your network swtich IP 
    community: public # same as set on your switch
    baseoid: 1.3.6.1.2.1.2.2.1.5.x # this is the Zyxel xgs1935 MIB range!
    version: 2c # same as set on your switch
    unique_id: mainswitch_port_speed_x
```

When defining 'Switch entities' (put them in different yaml file as sensor)
`!!for x=1 to x=the number of ports your switch has!!`
```yaml
  - platform: snmp
    name: Mainswitch Port x
    host: !secret snmp_host # alternative for putting IP in secret file, can be handy
    community: !secret snmp_community # alternative for putting community in secret file, can be handy
    baseoid: 1.3.6.1.2.1.2.2.1.8.x # this is the Zyxel xgs1935 MIB range!
    payload_on: 1   # when using a switch entity this is automatically set to 'on'
    payload_off: 2 # when using a switch entity this is automatically set to 'off'
    version: 2c
    # oh, unique id is not supported for this by HA self...?
```
## Coniguration options
The card comes with a configuration dialog that guides the instalation in HA. See below for more details.
```
      name: 'Switch Ports',
      copper_label: 'COPPER',
      sfp_label: 'SFP',
      show_legend: true,
      show_system_info: false,  (shows card without cpu, mem, etc.)
      compact_mode: false,   (possible to make the card small for tight dashboards)
      entity_port_names: '', (port name entitiy prefix)
      entity_name: '',    (network switch name entity)
      entity_firmware: '',  (network switch firmware entity)
      entity_uptime: '',   (network switch up time entity)
      entity_cpu: '',   (network switch cpu load entity)
      entity_memory: ''   (network switch memory load entity)
      entity_port_names: '', (network switch port name entity prefix)
      entity_port_vlan: '', (network switch vlan info port entity prefix)
      entity_port_rx: '', (network switch rx info port entity prefix)
      entity_port_tx: '', (network switch tx info port entity prefix)

```
## Optional
**Names**

`!!for x=1 to x=the number of ports your switch has!!`
```yaml
  - platform: snmp
    name: Mainswitch Port name x
    host: !secret snmp_host
    community: !secret snmp_community
    baseoid: 1.3.6.1.4.1.890.1.15.3.61.1.1.1.3.x  # this is the Zyxel xgs1935 MIB range!
    scan_interval: 84600
    version: 2c
    unique_id: mainswitch_port_name_x
```
**RX and TX counters**
(example shows only TX but RX is same setup but off course different oid)
```yaml
  - platform: snmp
    name: Mainswitch Port TX x
    host: !secret snmp_host
    community: !secret snmp_community
    baseoid: 1.3.6.1.2.1.2.2.1.16.x # oid for Tx (RX: 1.3.6.1.2.1.2.2.1.10.x)
    version: 2c
    unique_id: mainswitch_port_tx_x
    value_template: >-
      {% set bytes = value | int %}
      {% if bytes >= 1073741824 %}
        {{ '%.2f GiB' % (bytes / 1073741824) }}
      {% elif bytes >= 1048576 %}
        {{ '%.2f MiB' % (bytes / 1048576) }}
      {% elif bytes >= 1024 %}
        {{ '%.2f KiB' % (bytes / 1024) }}
      {% else %}
        {{ bytes }} B
      {% endif %}
```

You can add even more extra entities for the card (also get them via SNMP)

**the switch model name**
```yaml
# System Name
  - platform: snmp
    host: !secret snmp_host
    community: !secret snmp_community
    name: Mainswitch Name
    scan_interval: 86400
    baseoid: 1.3.6.1.2.1.1.5.0 # not to repeat myself but need to change this to what your switch needs
    accept_errors: true
    unique_id: mainswitch_system_name
    version: 2c
```

**up time of switch**
```yaml
  # Uptime (formatted)
  - platform: snmp
    host: !secret snmp_host
    community: !secret snmp_community
    name: Mainswitch Uptime
    scan_interval: 300
    baseoid: 1.3.6.1.2.1.1.3.0 # not to repeat myself but need to change this to what your switch needs
    accept_errors: true
    unique_id: mainswitch_system_uptime
    version: 2c
    value_template: >-
      {% set days = (value | int / 8640000) | int %}
      {% set hours = ((value | int / 360000) % 24) | int %}
      {% set mins = ((value | int / 6000) % 60) | int %}
      {{ days }}d {{ hours }}h {{ mins }}m
```

**Firmware version information**
```yaml
  # Firmware version
  - platform: snmp
    host: !secret snmp_host
    community: !secret snmp_community
    name: Mainswitch Firmware
    scan_interval: 86400
    baseoid: 1.3.6.1.4.1.890.1.15.3.1.6.0 # not to repeat myself but need to change this to what your switch needs
    accept_errors: true
    unique_id: mainswitch_system_firmware
    version: 2c
```

**CPU load of the switch**
```yaml
  - platform: snmp
    host: !secret snmp_host
    community: !secret snmp_community
    version: 2c
    name: Mainswitch CPU Load
    baseoid: 1.3.6.1.4.1.890.1.15.3.2.4.0 # not to repeat myself but need to change this to what your switch needs
    scan_interval: 10
    accept_errors: true
    unique_id: Mainswitch_cpu_load
    unit_of_measurement: "%"
    state_class: measurement
```
**Memory load of the switch**    
```yaml
  - platform: snmp
    host: !secret snmp_host
    community: !secret snmp_community
    version: 2c
    name: Mainswitch Mem Load
    baseoid: 1.3.6.1.4.1.890.1.15.3.2.5.0 # not to repeat myself but need to change this to what your switch needs
    scan_interval: 10
    accept_errors: true
    unique_id: Mainswitch_mem_load
    unit_of_measurement: "%"
    state_class: measurement
```

## using the card example
The card has a configuration screen which can be used in stead...
```yaml
type: custom:switch-port-card
entity_prefix: mainswitch
total_ports: 28
sfp_start_port: 25
copper_label: GIGABIT
sfp_label: 10G SFP+
name: Main Switch
```
