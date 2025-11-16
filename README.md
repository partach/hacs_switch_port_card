# hacs_switch_port_card
This Home Assistant card shows the status of your switch ports

Goal is to at some point make a switch card suitable for multiple switches.
First version supports:
Real-time **28-port status** (24 copper + 4 SFP) for Zyxel XGS1935 (and similar) using **direct entity access**.

The card is based on and therefor depedent on SNMP data. 

IMPORTANT1: You must add snmp entities in your configuration.yaml for it to work.
Tip: Add only files where you store your sensor entities and or switch (not meaning a network switch) entities to configuration.yaml.
Example (use your own / extend to your own):

```yaml
switch: !include snmp_switch_entities.yaml 
sensor: !include config_sensors.yam
```



IMPORTANT2: SNMP requires the right baseoid for getting the right data.
This baseoid is often manufacturer dependent. 
So, when defining your sensor / switch entities make sure to check if the baseoid matches the needed 'field'


## Features
- Auto-detects `10M`, `100M`, `1G`, `10G`, `DM`, `DOWN`
- Responsive, no clipping
- Works with any `switch.xxx_port_X` + `sensor.xxx_port_speed_X`

## Installation
1. Install in first instance is by hand by placing the `switch-port-card.js` file in `www/` directory

    * In HA go to Settings > Dashboards > Resources
    * Add: 
      * URL: `/local/switch-port-card.js`
      * Type: `JavaScript Module`

2. Add to Lovelace:

```yaml
type: custom:switch-port-card
entity_prefix: mainswitch
name: Main Switch
