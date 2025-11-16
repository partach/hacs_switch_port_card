# hacs_switch_port_card
This Home Assistant card shows the status of your switch ports

<p align="center">
  <img src="https://github.com/partach/hacs_switch_port_card/blob/main/switch-port-card.png" width="600"/>
  <br>
  <em>Live port status with color coding: 10M/100M (orange), 1G (green), 10G (blue), DOWN (gray)</em>
</p>


Goal is to at some point make a switch card suitable for multiple switches.
First version supports:
Real-time **28-port status** (24 copper + 4 SFP) for Zyxel XGS1935 (and similar) using **direct entity access**.

The card is based on and therefor depedent on SNMP data. 

IMPORTANT1: You must add snmp entities in your configuration.yaml for it to work.
Tip: Add only files where you store your sensor entities and or switch (not meaning a network switch) entities to configuration.yaml.
Example (use your own / extend to your own):

```yaml
switch: !include snmp_switch_entities.yaml 
sensor: !include config_sensors.yaml
```
(below the is explained how to add the entities)


IMPORTANT2: SNMP requires the right baseoid for getting the right data.
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
## using the card example
```yaml
type: custom:switch-port-card
entity_prefix: mainswitch
total_ports: 28
sfp_start_port: 25
copper_label: GIGABIT
sfp_label: 10G SFP+
name: Main Switch
```
