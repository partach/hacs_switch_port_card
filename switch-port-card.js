// ===== MAIN CARD =====
class SwitchPortCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("switch-port-card-editor");
  }
  static getStubConfig() {
    return {
      entity_prefix: "mainswitch",
      total_ports: 28,
      sfp_start_port: 25,
      name: "Switch Ports"
    };
  }

  setConfig(config) {
    if (!config.entity_prefix) throw new Error("entity_prefix is required");
    if (!config.total_ports) throw new Error("total_ports is required");
    if (!config.sfp_start_port) throw new Error("sfp_start_port is required");
    const total = parseInt(config.total_ports, 10);
    const sfpStart = parseInt(config.sfp_start_port, 10);
    if (isNaN(total) || total < 1) throw new Error("total_ports must be a positive number");
    if (isNaN(sfpStart) || sfpStart < 1 || sfpStart > total + 1) throw new Error("sfp_start_port must be between 1 and total_ports+1");

    this._config = {
      name: 'Switch Ports',
      copper_label: 'COPPER',
      sfp_label: 'SFP',
      show_legend: true,
      show_system_info: false,
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
    const opacity = status === 'DOWN' || status === 'UNAVAIL' ? 0.6 : 1;
    const isSfp = i >= this._sfpStart;
    const height = isSfp ? 21 : 27;
    const fontSize = isSfp ? 9 : 8;
    const boxWidth = 33;
    const text = status === 'DM' ? 'DM' : (status === 'DOWN' || status === 'UNAVAIL' ? '' : status);
    return `
      <div style="flex:0 0 ${boxWidth}px;text-align:center;">
        <div style="font-size:8px;color:#888;margin-bottom:2px;">${i}</div>
        <div style="width:${boxWidth}px;height:${height}px;background:${bg};color:#fff;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;opacity:${opacity};">
          ${text}
        </div>
      </div>`;
  }

  _renderCopperRows() {
    if (this._copperPorts.length === 0) return '';
    const even = this._copperPorts.filter(p => p % 2 === 0);
    const odd = this._copperPorts.filter(p => p % 2 === 1);
    let html = `<div style="margin:8px 0 6px;color:#999;font-size:10px;font-weight:600;text-align:center;">${this._config.copper_label}</div>`;
    html += `<div style="display:flex;justify-content:center;gap:2px;margin-bottom:3px;">`;
    even.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;
    html += `<div style="display:flex;justify-content:center;gap:2px;margin-bottom:8px;">`;
    odd.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;
    return html;
  }

  _renderSfp() {
    if (this._sfpPorts.length === 0) return '';
    let html = `<div style="display:flex;align-items:center;gap:3px;">`;
    html += `<div style="font-size:10px;color:#999;font-weight:600;margin-right:4px;">${this._config.sfp_label}</div>`;
    this._sfpPorts.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;
    return html;
  }

  _renderLegend() {
    if (!this._config.show_legend) return '';
    return `
      <div style="display:flex;gap:12px;font-size:9px;color:#aaa;white-space:nowrap;">
        <span><span style="color:#ff6b35;">\u25CF</span> 10/100/DM</span>
        <span><span style="color:#4caf50;">\u25CF</span> 1G</span>
        <span><span style="color:#2196f3;">\u25CF</span> 10G</span>
        <span><span style="color:#555;">\u25CF</span> Down</span>
      </div>`;
  }

  _renderBarGauge(entityId, label) {
    if (!entityId) return '';
    const entity = this._hass?.states[entityId];
    const value = entity ? parseFloat(entity.state) : 0;
    const validValue = isNaN(value) ? 0 : Math.min(100, Math.max(0, value));
    
    let color = '#4caf50';
    if (validValue >= 90) color = '#f44336';
    else if (validValue >= 75) color = '#ff9800';
    else if (validValue >= 50) color = '#ffc107';

    return `
      <div style="flex:1;min-width:120px;">
        <div style="font-size:10px;color:#999;margin-bottom:4px;font-weight:600;">${label}</div>
        <div style="position:relative;height:18px;background:#333;border-radius:9px;overflow:hidden;">
          <div style="position:absolute;left:0;top:0;height:100%;width:${validValue}%;background:${color};transition:width 0.3s ease;"></div>
          <div style="position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;">
            ${validValue.toFixed(0)}%
          </div>
        </div>
      </div>`;
  }

  _renderSystemInfo() {
    if (!this._config.show_system_info) return { top: '', bottom: '' };

    const cpuBar = this._renderBarGauge(this._config.entity_cpu, 'CPU');
    const memBar = this._renderBarGauge(this._config.entity_memory, 'MEMORY');
    
    let topSection = '';
    if (cpuBar || memBar) {
      topSection = `
        <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
          ${cpuBar}
          ${memBar}
        </div>`;
    }

    const nameEntity = this._hass?.states[this._config.entity_name];
    const firmwareEntity = this._hass?.states[this._config.entity_firmware];
    const uptimeEntity = this._hass?.states[this._config.entity_uptime];

    const infoItems = [];
    if (this._config.entity_name && nameEntity) {
      infoItems.push(`<span style="color:#aaa;">Name:</span> <span style="color:#e8e8e8;">${nameEntity.state}</span>`);
    }
    if (this._config.entity_firmware && firmwareEntity) {
      infoItems.push(`<span style="color:#aaa;">FW:</span> <span style="color:#e8e8e8;">${firmwareEntity.state}</span>`);
    }
    if (this._config.entity_uptime && uptimeEntity) {
      infoItems.push(`<span style="color:#aaa;">Uptime:</span> <span style="color:#e8e8e8;">${uptimeEntity.state}</span>`);
    }

    let bottomSection = '';
    if (infoItems.length > 0) {
      bottomSection = `
        <div style="display:flex;gap:16px;font-size:9px;margin-top:8px;padding-top:8px;border-top:1px solid #333;flex-wrap:wrap;justify-content:center;">
          ${infoItems.join('<span style="color:#555;margin:0 4px;">|</span>')}
        </div>`;
    }

    return { top: topSection, bottom: bottomSection };
  }

  _render() {
    if (!this._hass) {
      this.innerHTML = `<ha-card><div style="padding:20px;text-align:center;color:#aaa;">Loading...</div></ha-card>`;
      return;
    }

    const systemInfo = this._renderSystemInfo();
    const legend = this._renderLegend();
    const copper = this._renderCopperRows();
    const sfp = this._renderSfp();

    let middleRow = '';
    if (legend || sfp) {
      middleRow = `<div style="display:flex;justify-content:flex-start;align-items:center;margin-top:4px;gap:12px;">`;
      if (legend) middleRow += legend;
      if (legend && sfp) middleRow += `<div style="flex-grow:1;"></div>`;
      if (sfp) middleRow += sfp;
      middleRow += `</div>`;
    }

    this.innerHTML = `
      <ha-card style="padding:14px 20px 16px;background:#1e1e1e;border-radius:14px;box-shadow:0 5px 14px rgba(0,0,0,0.45);border:1px solid #333;font-family:system-ui,-apple-system,'Segoe UI','Roboto',sans-serif;overflow:visible;min-width:0;">
        <div style="font-size:18px;font-weight:600;color:#e8e8e8;margin-bottom:12px;text-align:center;">
          ${this._config.name}
        </div>
        ${systemInfo.top}
        <div style="line-height:1.3;">
          ${copper}
          ${middleRow}
          ${systemInfo.bottom}
        </div>
      </ha-card>`;
  }

  getCardSize() { return 3; }
}

// ===== CARD EDITOR =====
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
    const configValue = target.getAttribute('data-config');
    if (!configValue) return;
    
    let value = target.value;
    if (target.type === 'number') value = parseInt(value, 10);
    else if (target.type === 'checkbox') value = target.checked;
    if (this._config[configValue] === value) return;

    this._config = { ...this._config, [configValue]: value };
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
          <input type="text" data-config="name" value="${this._config.name}"
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Entity Prefix</label>
          <input type="text" data-config="entity_prefix" value="${this._config.entity_prefix}"
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          <div style="font-size:12px;color:#666;">Example: "mainswitch" → switch.mainswitch_port_1</div>
        </div>

        <div style="display:flex;gap:16px;">
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">Total Ports</label>
            <input type="number" min="1" max="256" data-config="total_ports" value="${this._config.total_ports}"
                   style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">First SFP Port</label>
            <input type="number" min="1" max="256" data-config="sfp_start_port" value="${this._config.sfp_start_port}"
                   style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          </div>
        </div>

        <div style="display:flex;gap:16px;">
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">Copper Label</label>
            <input type="text" data-config="copper_label" value="${this._config.copper_label}"
                   style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">SFP Label</label>
            <input type="text" data-config="sfp_label" value="${this._config.sfp_label}"
                   style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" data-config="show_legend" ${this._config.show_legend ? 'checked' : ''}
                 style="width:18px;height:18px;cursor:pointer;"/>
          <label style="font-weight:500;font-size:14px;cursor:pointer;">Show Legend</label>
        </div>

        <div style="font-size:16px;font-weight:600;color:#333;border-bottom:2px solid #e0e0e0;padding-bottom:8px;margin-top:8px;">
          System Information (Optional)
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" data-config="show_system_info" ${this._config.show_system_info ? 'checked' : ''}
                 style="width:18px;height:18px;cursor:pointer;"/>
          <label style="font-weight:500;font-size:14px;cursor:pointer;">Show System Information</label>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">CPU Load Entity</label>
          <input type="text" data-config="entity_cpu" value="${this._config.entity_cpu}"
                 placeholder="sensor.mainswitch_cpu_load"
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Memory Load Entity</label>
          <input type="text" data-config="entity_memory" value="${this._config.entity_memory}"
                 placeholder="sensor.mainswitch_mem_load"
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Switch Name Entity</label>
          <input type="text" data-config="entity_name" value="${this._config.entity_name}"
                 placeholder="sensor.mainswitch_name"
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Firmware Entity</label>
          <input type="text" data-config="entity_firmware" value="${this._config.entity_firmware}"
                 placeholder="sensor.mainswitch_firmware"
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Uptime Entity</label>
          <input type="text" data-config="entity_uptime" value="${this._config.entity_uptime}"
                 placeholder="sensor.mainswitch_uptime"
                 style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"/>
        </div>

        <div style="margin-top:8px;padding:12px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#666;">
          <strong>Required port entities:</strong><br>
          • switch.${this._config.entity_prefix}_port_[1-${this._config.total_ports}]<br>
          • sensor.${this._config.entity_prefix}_port_speed_[1-${this._config.total_ports}]
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
