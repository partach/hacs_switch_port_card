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
    // === VALIDATION ===
    if (!config.entity_prefix) throw new Error("entity_prefix is required");
    if (!config.total_ports) throw new Error("total_ports is required");
    if (!config.sfp_start_port) throw new Error("sfp_start_port is required");

    const total = parseInt(config.total_ports, 10);
    const sfpStart = parseInt(config.sfp_start_port, 10);
    if (isNaN(total) || total < 1) throw new Error("total_ports must be a positive number");
    if (isNaN(sfpStart) || sfpStart < 1 || sfpStart > total + 1) throw new Error("sfp_start_port must be between 1 and total_ports+1");

    // === CONFIG ===
    this._config = {
      name: 'Switch Ports',
      copper_label: 'COPPER',
      sfp_label: 'SFP',
      show_legend: true,
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

  // === STATUS LOGIC ===
  _getPortStatus(port) {
    const sw = this._hass?.states[`switch.${this._config.entity_prefix}_port_${port}`];
    const sp = this._hass?.states[`sensor.${this._config.entity_prefix}_port_speed_${port}`];

    if (!sw) return 'UNAVAIL';

    const isUp = sw && ['on', '1', 'true', 'up'].includes(String(sw.state).toLowerCase());
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

  // === RENDER PORT ===
  _renderPort(i, status) {
    const bg = this._getColor(status);
    const opacity = status === 'DOWN' || status === 'UNAVAIL' ? 0.6 : 1;
    const isSfp = i >= this._sfpStart;
    const height = isSfp ? 25 : 27;
    const fontSize = isSfp ? 9 : 8;
    const text = status === 'DM' ? 'DM' : (status === 'DOWN' || status === 'UNAVAIL' ? '' : status);

    return `
      <div style="flex:0 0 33px;text-align:center;">
        <div style="font-size:8px;color:#888;margin-bottom:2px;">${i}</div>
        <div style="width:33px;height:${height}px;background:${bg};color:#fff;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;opacity:${opacity};">
          ${text}
        </div>
      </div>`;
  }

  // === COPPER ROWS ===
  _renderCopperRows() {
    if (this._copperPorts.length === 0) return '';

    const even = this._copperPorts.filter(p => p % 2 === 0);
    const odd = this._copperPorts.filter(p => p % 2 === 1);

    let html = `<div style="margin:8px 0 6px;color:#999;font-size:10px;font-weight:600;text-align:center;">${this._config.copper_label}</div>`;

    // Even row (top)
    html += `<div style="display:flex;justify-content:center;gap:3px;margin-bottom:3px;">`;
    even.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;

    // Odd row (bottom)
    html += `<div style="display:flex;justify-content:center;gap:3px;margin-bottom:8px;">`;
    odd.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;

    return html;
  }

  // === SFP SECTION ===
  _renderSfp() {
    if (this._sfpPorts.length === 0) return '';

    let html = `<div style="display:flex;align-items:center;gap:3px;">`;
    html += `<div style="font-size:10px;color:#999;font-weight:600;margin-right:4px;">${this._config.sfp_label}</div>`;
    this._sfpPorts.forEach(p => html += this._renderPort(p, this._getPortStatus(p)));
    html += `</div>`;
    return html;
  }

  // === LEGEND ===
  _renderLegend() {
    if (!this._config.show_legend) return '';
    return `
      <div style="display:flex;gap:12px;font-size:9px;color:#aaa;white-space:nowrap;">
        <span><span style="color:#ff6b35;">■</span> 10/100/DM</span>
        <span><span style="color:#4caf50;">■</span> 1G</span>
        <span><span style="color:#2196f3;">■</span> 10G</span>
        <span><span style="color:#555;">■</span> Down</span>
      </div>`;
  }

  // === MAIN RENDER ===
  _render() {
    if (!this._hass) {
      this.innerHTML = `<ha-card><div style="padding:20px;text-align:center;color:#aaa;">Loading...</div></ha-card>`;
      return;
    }

    const legend = this._renderLegend();
    const copper = this._renderCopperRows();
    const sfp = this._renderSfp();

    let bottomRow = '';
    if (legend && sfp) {
      bottomRow = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;gap:12px;">
          ${legend}
          ${sfp}
        </div>`;
    } else if (legend) {
      bottomRow = `<div style="margin-top:4px;text-align:center;">${legend}</div>`;
    } else if (sfp) {
      bottomRow = `<div style="display:flex;justify-content:flex-end;margin-top:4px;">${sfp}</div>`;
    }

    this.innerHTML = `
      <ha-card style="padding:14px 20px 16px;background:#1e1e1e;border-radius:14px;box-shadow:0 5px 14px rgba(0,0,0,0.45);border:1px solid #333;font-family:system-ui,-apple-system,'Segoe UI','Roboto',sans-serif;overflow:visible;min-width:0;">
        <div style="font-size:18px;font-weight:600;color:#e8e8e8;margin-bottom:12px;text-align:center;">
          ${this._config.name}
        </div>
        <div style="line-height:1.3;">
          ${copper}
          ${bottomRow}
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
      ...config
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;

    const target = ev.target;
    const configValue = target.configValue;
    let value = target.value;

    // Handle different input types
    if (target.type === 'number') {
      value = parseInt(value, 10);
    } else if (target.type === 'checkbox') {
      value = target.checked;
    }

    if (this._config[configValue] === value) return;

    const newConfig = { ...this._config, [configValue]: value };
    
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  _render() {
    if (!this._config) return;

    this.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px;">
        
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Card Name</label>
          <input
            type="text"
            data-config="name"
            value="${this._config.name}"
            style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
          />
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-weight:500;font-size:14px;">Entity Prefix</label>
          <input
            type="text"
            data-config="entity_prefix"
            value="${this._config.entity_prefix}"
            style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
          />
          <div style="font-size:12px;color:#666;">
            Example: "mainswitch" for entities like switch.mainswitch_port_1
          </div>
        </div>

        <div style="display:flex;gap:16px;">
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">Total Ports</label>
            <input
              type="number"
              min="1"
              max="256"
              data-config="total_ports"
              value="${this._config.total_ports}"
              style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
            />
          </div>

          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">First SFP Port</label>
            <input
              type="number"
              min="1"
              max="256"
              data-config="sfp_start_port"
              value="${this._config.sfp_start_port}"
              style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
            />
          </div>
        </div>

        <div style="display:flex;gap:16px;">
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">Copper Label</label>
            <input
              type="text"
              data-config="copper_label"
              value="${this._config.copper_label}"
              style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
            />
          </div>

          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <label style="font-weight:500;font-size:14px;">SFP Label</label>
            <input
              type="text"
              data-config="sfp_label"
              value="${this._config.sfp_label}"
              style="padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
            />
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          <input
            type="checkbox"
            data-config="show_legend"
            ${this._config.show_legend ? 'checked' : ''}
            style="width:18px;height:18px;cursor:pointer;"
          />
          <label style="font-weight:500;font-size:14px;cursor:pointer;">Show Legend</label>
        </div>

        <div style="margin-top:8px;padding:12px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#666;">
          <strong>Required entities:</strong><br>
          • switch.${this._config.entity_prefix}_port_[1-${this._config.total_ports}]<br>
          • sensor.${this._config.entity_prefix}_port_speed_[1-${this._config.total_ports}]
        </div>
      </div>
    `;

    // Add event listeners
    this.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', this._valueChanged.bind(this));
      input.addEventListener('input', this._valueChanged.bind(this));
    });
  }
}

// Register custom elements
customElements.define('switch-port-card', SwitchPortCard);
customElements.define('switch-port-card-editor', SwitchPortCardEditor);
