// ===== SWITCH PORT CARD — FULLY CONFIGURABLE, PRO-GRADE =====
class SwitchPortCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("switch-port-card-editor");
  }

  static getStubConfig() {
    return {
      entity_prefix: "mainswitch",
      total_ports: 28,
      sfp_start_port: 25,
      name: "Switch Ports",
      compact_mode: false,
      entity_port_names: "",
      entity_port_vlan: "",
      entity_port_rx: "",
      entity_port_tx: ""
    };
  }

  setConfig(config) {
    if (!config.entity_prefix) throw new Error("entity_prefix is required");
    if (!config.total_ports) throw new Error("total_ports is required");
    if (!config.sfp_start_port) throw new Error("sfp_start_port is required");

    const total = parseInt(config.total_ports, 10);
    const sfpStart = parseInt(config.sfp_start_port, 10);
    if (isNaN(total) || total < 1) throw new Error("total_ports must be a positive number");
    if (isNaN(sfpStart) || sfpStart < 1 || sfpStart > total + 1)
      throw new Error("sfp_start_port must be between 1 and total_ports+1");

    this._config = {
      name: 'Switch Ports',
      copper_label: 'COPPER',
      sfp_label: 'SFP',
      show_legend: true,
      show_system_info: false,
      compact_mode: false,
      entity_port_names: '',
      entity_port_vlan: '',
      entity_port_rx: '',
      entity_port_tx: '',
      entity_name: '',
      entity_firmware: '',
      entity_uptime: '',
      entity_cpu: '',
      entity_memory: '',
      ...config
    };

    this._total = total;
    this._sfpStart = sfpStart;
    this._copperPorts = Array.from({ length: sfpStart - 1 }, (_, i) => i + 1);
    this._sfpPorts = Array.from({ length: total - sfpStart + 1 }, (_, i) => sfpStart + i);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _openMoreInfo(entityId) {
    const event = new Event('hass-more-info', { bubbles: true, composed: true });
    event.detail = { entityId };
    this.dispatchEvent(event);
  }

  _getPortStatus(port) {
    const sw = this._hass?.states[`switch.${this._config.entity_prefix}_port_${port}`];
    const sp = this._hass?.states[`sensor.${this._config.entity_prefix}_port_speed_${port}`];
    if (!sw) return 'UNAVAIL';
    const isUp = ['on', '1', 'true', 'up'].includes(String(sw.state).toLowerCase());
    const speedStr = sp?.state;
    const speedVal = speedStr && !['unknown', 'unavailable', ''].includes(speedStr) ? parseInt(speedStr, 10) : NaN;
    if (!isUp) return 'DOWN';
    if (isNaN(speedVal) || speedVal <= 0) return 'DM';
    if (speedVal >= 4000000000) return '10G';
    if (speedVal >= 1000000000) return '1G';
    if (speedVal >= 100000000) return '100M';
    if (speedVal >= 10000000) return '10M';
    return 'UP';
  }

  _getPortName(port) {
    if (!this._config.entity_port_names) return '';
    const id = `${this._config.entity_port_names}_${port}`;
    const e = this._hass?.states[id];
    return e?.state && !['unknown', 'unavailable', ''].includes(e.state) ? e.state : '';
  }

  _getPortStats(port) {
    const vlanEnt = this._config.entity_port_vlan
      ? this._hass?.states[`${this._config.entity_port_vlan}_${port}`]
      : null;
    const rxEnt = this._config.entity_port_rx
      ? this._hass?.states[`${this._config.entity_port_rx}_${port}`]
      : null;
    const txEnt = this._config.entity_port_tx
      ? this._hass?.states[`${this._config.entity_port_tx}_${port}`]
      : null;

    const formatBytes = (raw) => {
      return raw ? String(raw).trim() : '';
    };
    return {
      vlan: vlanEnt?.state && !['unknown', 'unavailable'].includes(vlanEnt.state) ? vlanEnt.state : '',
      rx: rxEnt?.state ? formatBytes(rxEnt.state) : '',
      tx: txEnt?.state ? formatBytes(txEnt.state) : ''
    };
  }

  _getColor(status) {
    if (status === 'DOWN') return '#555';
    if (status === 'UNAVAIL') return '#444';
    if (status === 'DM') return '#ff6b35';
    if (/10M|100M/.test(status)) return '#ff6b35';
    if (/1G/.test(status)) return '#4caf50';
    if (/10G/.test(status)) return '#2196f3';
    return '#f44336';
  }

  _renderPort(i, status) {
    const bg = this._getColor(status);
    const c = this._config.compact_mode;
    const opacity = status === 'DOWN' || status === 'UNAVAIL' ? 0.6 : 1;
    const isSfp = i >= this._sfpStart;
    const baseSize = c ? 26 : 30;
    const height = isSfp ? (c ? 26 : 30) : (c ? 28 : 30);
    const boxW = c ? baseSize : 30;
    const gap = c ? 0 : 1;

    const name = this._getPortName(i);
    const { vlan, rx, tx } = this._getPortStats(i);

    const showVlan = vlan && vlan.length > 0;
    const showRx = rx && rx.length > 0;
    const showTx = tx && tx.length > 0;
    const showName = name && name.length > 0;

    const tooltip = [
      `Port ${i}`,
      `Name: ${name || '—'}`,
      `VLAN: ${vlan || '—'}`,
      `Rx: ${rx || '—'}`,
      `Tx: ${tx || '—'}`,
      `Switch: switch.${this._config.entity_prefix}_port_${i}`,
      `Sensor: sensor.${this._config.entity_prefix}_port_speed_${i}`
    ].join('\n');

    const click = `this.closest('switch-port-card')._openMoreInfo('sensor.${this._config.entity_prefix}_port_speed_${i}')`;

    return `
      <div style="flex:0 0 ${boxW}px;text-align:center;margin:0 ${gap}px;">
        <div style="font-size:${c ? 7 : 8}px;color:#888;margin-bottom:${c ? 1 : 2}px;">${i}</div>
        <div
          style="
            width:${boxW}px;height:${height}px;
            background:${bg};color:#fff;
            border-radius:${c ? 5 : 7}px;
            display:flex;flex-direction:column;
            justify-content:center;align-items:center;
            padding:1px 1px;opacity:${opacity};
            cursor:pointer;transition:transform .1s ease;
            font-size:6px;line-height:1.1;
          "
          title="${tooltip.replace(/\n/g, '&#10;')}"
          onclick="${click}"
          onmouseenter="this.style.transform='scale(1.08)'"
          onmouseleave="this.style.transform='scale(1)'"
        >
          ${showVlan ? `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:90%;">${vlan}</div>` : ''}
          ${showRx ? `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:90%;">${rx}</div>` : ''}
          ${showTx ? `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:90%;">${tx}</div>` : ''}
          ${showName ? `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:90%;font-color:#333;font-weight:600;">${name}</div>` : ''}
          ${!showVlan && !showRx && !showTx && !showName ? `<div>—</div>` : ''}
        </div>
      </div>`;
  }

  _renderCopperRows() {
    if (this._copperPorts.length === 0) return '';
    const even = this._copperPorts.filter(p => p % 2 === 0);
    const odd = this._copperPorts.filter(p => p % 2 === 1);
    const c = this._config.compact_mode;
    let html = `<div style="margin:${c?4:8}px 0 ${c?3:6}px;color:#999;font-size:${c?9:10}px;font-weight:600;text-align:center;">
                  ${this._config.copper_label}
                </div>`;
    html += `<div style="display:flex;justify-content:center;gap:${c?1:1}px;margin-bottom:${c?1:3}px;">`;
    even.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;
    html += `<div style="display:flex;justify-content:center;gap:${c?1:1}px;margin-bottom:${c?4:8}px;">`;
    odd.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;
    return html;
  }

  _renderSfp() {
    if (this._sfpPorts.length === 0) return '';
    const c = this._config.compact_mode;
    const sz = c ? 9 : 10;
    const g = c ? 2 : 3;
    const mr = c ? 3 : 4;
    let html = `<div style="display:flex;align-items:center;gap:${g}px;flex-wrap:nowrap;">`;
    html += `<div style="font-size:${sz}px;color:#999;font-weight:600;margin-right:${mr}px;white-space:nowrap;">
               ${this._config.sfp_label}
             </div>`;
    this._sfpPorts.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;
    return html;
  }

  _renderLegend() {
    if (!this._config.show_legend) return '';
    const c = this._config.compact_mode;
    const fs = c ? 6 : 9;
    const g = c ? 6 : 12;
    return `
      <div style="display:flex;gap:${g}px;font-size:${fs}px;color:#aaa;white-space:nowrap;align-items:center;">
        <span><span style="color:#ff6b35;">\u23F9</span> 10/100/DM</span>
        <span><span style="color:#4caf50;">\u23F9</span> 1G</span>
        <span><span style="color:#2196f3;">\u23F9</span> 10G</span>
        <span><span style="color:#555;">\u23F9</span> Down</span>
      </div>`;
  }

  _renderBarGauge(entityId, label) {
    if (!entityId) return '';
    const e = this._hass?.states[entityId];
    const v = e ? parseFloat(e.state) : 0;
    const val = isNaN(v) ? 0 : Math.min(100, Math.max(0, v));
    const c = this._config.compact_mode;
    let col = '#2c6f50';
    if (val >= 90) col = '#f44336';
    else if (val >= 75) col = '#ff9800';
    else if (val >= 50) col = '#ffc107';
    const h = c ? 13 : 16;
    const fs = c ? 10 : 12;
    const minW = c ? 75 : 150;
    const maxW = c ? 185 : 200;
    return `
      <div style="flex:1;min-width:${minW}px;max-width:${maxW}px;">
        <div style="font-size:${c?9:10}px;color:#999;margin-bottom:${c?2:4}px;font-weight:600;white-space:nowrap;">${label}</div>
        <div style="position:relative;height:${h}px;background:#333;border-radius:${h/2}px;overflow:hidden;">
          <div style="position:absolute;left:0;top:0;height:100%;width:${val}%;background:${col};transition:width .3s ease;"></div>
          <div style="position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:700;color:#fff;">
            ${val.toFixed(0)}%
          </div>
        </div>
      </div>`;
  }

  _renderSystemInfo() {
    if (!this._config.show_system_info) return { top: '', bottom: '' };
    const cpu = this._renderBarGauge(this._config.entity_cpu, 'CPU');
    const mem = this._renderBarGauge(this._config.entity_memory, 'MEMORY');
    const c = this._config.compact_mode;
    let top = '';
    if (cpu || mem) {
      top = `<div style="display:flex;gap:${c?4:8}px;text-align:center;margin-bottom:${c?8:12}px;flex-wrap:nowrap;justify-content:center;">
               ${cpu}${mem}
             </div>`;
    }
    const nameE = this._hass?.states[this._config.entity_name];
    const fwE = this._hass?.states[this._config.entity_firmware];
    const upE = this._hass?.states[this._config.entity_uptime];
    const items = [];
    if (this._config.entity_name && nameE) items.push(`<div style="display:flex;gap:4px;align-items:center;white-space:nowrap;min-width:0;">
          <span style="color:#aaa;flex-shrink:0;">Name:</span>
          <span style="color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:180px;" title="${nameE.state}">${nameE.state}</span>
        </div>`);
    if (this._config.entity_firmware && fwE) items.push(`<div style="display:flex;gap:4px;align-items:center;white-space:nowrap;min-width:0;">
          <span style="color:#aaa;flex-shrink:0;">FW:</span>
          <span style="color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:120px;" title="${fwE.state}">${fwE.state}</span>
        </div>`);
    if (this._config.entity_uptime && upE) items.push(`<div style="display:flex;gap:4px;align-items:center;white-space:nowrap;min-width:0;">
          <span style="color:#aaa;flex-shrink:0;">Uptime:</span>
          <span style="color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:140px;" title="${upE.state}">${upE.state}</span>
        </div>`);
    let bottom = '';
    if (items.length) {
      const g = c ? 12 : 16;
      const fs = c ? 9 : 9;
      bottom = `<div style="display:flex;gap:${g}px;font-size:${fs}px;margin-top:${c?4:6}px;padding-top:${c?4:6}px;border-top:1px solid #333;overflow:hidden;white-space:nowrap;flex-wrap:nowrap;justify-content:center;align-items:center;">
                 ${items.join('<span style="color:#555;margin:0 6px;opacity:0.7;font-weight:300;">|</span>')}
               </div>`;
    }
    return { top, bottom };
  }

  _render() {
    if (!this._hass) {
      this.innerHTML = `<ha-card><div style="padding:20px;text-align:center;color:#aaa;">Loading...</div></ha-card>`;
      return;
    }

    const dark = this._hass.themes?.darkMode ?? false;
    const bg = dark ? '#1e1e1e' : '#ffffff';
    const txt = dark ? '#e8e8e8' : '#212121';
    const sub = dark ? '#999' : '#666';
    const bord = dark ? '#333' : '#e0e0e0';
    const shad = dark ? '0 5px 14px rgba(0,0,0,.45)' : '0 2px 8px rgba(0,0,0,.1)';
    const c = this._config.compact_mode;

    const sys = this._renderSystemInfo();
    const leg = this._renderLegend();
    const cop = this._renderCopperRows();  // Fixed: no "Coppa"
    const sfp = this._renderSfp();

    let mid = '';
    if (leg || sfp) {
      mid = `<div style="display:flex;justify-content:center;align-items:center;margin-top:${c?2:4}px;gap:${c?8:12}px;flex-wrap:nowrap;">`;
      if (leg) mid += `<div style="flex-shrink:0;">${leg}</div>`;
      if (sfp) mid += `<div style="flex-shrink:0;margin-left:auto;">${sfp}</div>`;
      mid += `</div>`;
    }

    this.innerHTML = `
      <ha-card style="
        padding:${c?'10px 50px 12px':'14px 30px 16px'};
        background:${bg};border-radius:14px;
        box-shadow:${shad};border:1px solid ${bord};
        font-family:system-ui,-apple-system,'Segoe UI','Roboto',sans-serif;
        overflow:visible;min-width:0;color:${txt};
      ">
        <div style="font-size:${c?16:18}px;font-weight:600;color:${txt};margin-bottom:${c?8:12}px;text-align:center;">
          ${this._config.name}
        </div>
        ${sys.top}
        <div style="line-height:1.3;color:${sub};">
          ${cop}
          ${mid}
          ${sys.bottom}
        </div>
      </ha-card>`;
  }

  getCardSize() { return 3; }
}

// ===== CARD EDITOR (unchanged from your original) =====
class SwitchPortCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      entity_prefix: 'mainswitch',
      total_ports: 28,
      sfp_start_port: 25,
      name: 'Switch Ports',
      copper_label: 'COPPER',
      sfp_label: 'SFP',
      show_legend: true,
      show_system_info: false,
      compact_mode: false,
      entity_port_names: '',
      entity_port_vlan: '',
      entity_port_rx: '',
      entity_port_tx: '',
      entity_name: '',
      entity_firmware: '',
      entity_uptime: '',
      entity_cpu: '',
      entity_memory: '',
      ...config
    };
    if (!this._initialized) {
      this._render();
      this._initialized = true;
    }
  }

  set hass(hass) { this._hass = hass; }

  _valueChanged(ev) {
    if (!this._config) return;
    const target = ev.target;
    const key = target.getAttribute('data-config');
    if (!key) return;
    let value = target.value;
    if (target.type === 'number') value = parseInt(value, 10);
    else if (target.type === 'checkbox') value = target.checked;
    if (this._config[key] === value) return;
    this._config = { ...this._config, [key]: value };
    const event = new Event('config-changed', { bubbles: true, composed: true });
    event.detail = { config: this._config };
    this.dispatchEvent(event);
  }

  _render() {
    if (!this._config) return;
    this.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px;">
        <div style="font-size:16px;font-weight:600;color:#333;border-bottom:2px solid #e0e0e0;padding-bottom:8px;">
          Basic Settings
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Card Name</label>
          <input type="text" data-config="name" value="${this._config.name}" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Entity Prefix</label>
          <input type="text" data-config="entity_prefix" value="${this._config.entity_prefix}" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          <div style="font-size:12px;color:#666;">Example: "mainswitch" → switch.mainswitch_port_1</div>
        </div>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">Total Ports</label>
            <input type="number" min="1" max="256" data-config="total_ports" value="${this._config.total_ports}" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">First SFP Port</label>
            <input type="number" min="1" max="256" data-config="sfp_start_port" value="${this._config.sfp_start_port}" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          </div>
        </div>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">Copper Label</label>
            <input type="text" data-config="copper_label" value="${this._config.copper_label}" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">SFP Label</label>
            <input type="text" data-config="sfp_label" value="${this._config.sfp_label}" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          </div>
        </div>
        <div style="font-size:16px;font-weight:600;color:#333;border-bottom:2px solid #e0e0e0;padding-bottom:8px;margin-top:8px;">
          Port Information (Optional)
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Port Name Prefix</label>
          <input type="text" data-config="entity_port_names" value="${this._config.entity_port_names}" placeholder="sensor.mainswitch_port_name" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          <div style="font-size:12px;color:#666;">→ sensor.mainswitch_port_name_1, _2, etc.</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Port VLAN Prefix</label>
          <input type="text" data-config="entity_port_vlan" value="${this._config.entity_port_vlan}" placeholder="sensor.mainswitch_port_vlan" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          <div style="font-size:12px;color:#666;">→ sensor.mainswitch_port_vlan_1, _2, etc.</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Port RX Prefix</label>
          <input type="text" data-config="entity_port_rx" value="${this._config.entity_port_rx}" placeholder="sensor.mainswitch_port_rx" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          <div style="font-size:12px;color:#666;">→ sensor.mainswitch_port_rx_1, _2, etc. (bytes)</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Port TX Prefix</label>
          <input type="text" data-config="entity_port_tx" value="${this._config.entity_port_tx}" placeholder="sensor.mainswitch_port_tx" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          <div style="font-size:12px;color:#666;">→ sensor.mainswitch_port_tx_1, _2, etc. (bytes)</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" data-config="show_legend" ${this._config.show_legend ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;"/>
          <label style="font-weight:500;font-size:14px;cursor:pointer;">Show Legend</label>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" data-config="compact_mode" ${this._config.compact_mode ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;"/>
          <label style="font-weight:500;font-size:14px;cursor:pointer;">Compact Mode</label>
        </div>
        <div style="font-size:16px;font-weight:600;color:#333;border-bottom:2px solid #e0e0e0;padding-bottom:8px;margin-top:8px;">
          System Information (Optional)
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" data-config="show_system_info" ${this._config.show_system_info ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;"/>
          <label style="font-weight:500;font-size:14px;cursor:pointer;">Show System Information</label>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">CPU Load Entity</label>
          <input type="text" data-config="entity_cpu" value="${this._config.entity_cpu}" placeholder="sensor.mainswitch_cpu_load" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Memory Load Entity</label>
          <input type="text" data-config="entity_memory" value="${this._config.entity_memory}" placeholder="sensor.mainswitch_mem_load" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Switch Name Entity</label>
          <input type="text" data-config="entity_name" value="${this._config.entity_name}" placeholder="sensor.mainswitch_name" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Firmware Entity</label>
          <input type="text" data-config="entity_firmware" value="${this._config.entity_firmware}" placeholder="sensor.mainswitch_firmware" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Uptime Entity</label>
          <input type="text" data-config="entity_uptime" value="${this._config.entity_uptime}" placeholder="sensor.mainswitch_uptime" style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>
        <div style="margin-top:8px;padding:12px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#666;">
          <strong>Required:</strong><br>
          • switch.${this._config.entity_prefix}_port_[1-${this._config.total_ports}]<br>
          • sensor.${this._config.entity_prefix}_port_speed_[1-${this._config.total_ports}]<br>
          <strong>Optional (for full info):</strong><br>
          • ${this._config.entity_port_names || 'sensor.mainswitch_port_name'}_[1-${this._config.total_ports}]<br>
          • ${this._config.entity_port_vlan || 'sensor.mainswitch_port_vlan'}_[1-${this._config.total_ports}]<br>
          • ${this._config.entity_port_rx || 'sensor.mainswitch_port_rx'}_[1-${this._config.total_ports}]<br>
          • ${this._config.entity_port_tx || 'sensor.mainswitch_port_tx'}_[1-${this._config.total_ports}]
        </div>
      </div>
    `;
    this.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', this._valueChanged.bind(this));
      input.addEventListener('input', this._valueChanged.bind(this));
    });
  }
}

// Register
customElements.define('switch-port-card', SwitchPortCard);
customElements.define('switch-port-card-editor', SwitchPortCardEditor);
