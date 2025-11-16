class SwitchPortCard extends HTMLElement {
  setConfig(config) {
    // Required
    if (!config.entity_prefix) throw new Error("entity_prefix is required");
    if (!config.total_ports) throw new Error("total_ports is required");
    if (!config.sfp_start_port) throw new Error("sfp_start_port is required");

    this._config = {
      name: 'Switch Ports',
      copper_label: 'COPPER',
      sfp_label: 'SFP',
      show_legend: true,
      ...config
    };

    this._total = parseInt(config.total_ports, 10);
    this._sfpStart = parseInt(config.sfp_start_port, 10);
    this._copperPorts = Array.from({length: this._sfpStart - 1}, (_, i) => i + 1);
    this._sfpPorts = Array.from({length: this._total - this._sfpStart + 1}, (_, i) => this._sfpStart + i);

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _getPortStatus(port) {
    const sw = this._hass?.states[`switch.${this._config.entity_prefix}_port_${port}`];
    const sp = this._hass?.states[`sensor.${this._config.entity_prefix}_port_speed_${port}`];

    const isUp = sw && ['on', '1', 'true', 'up'].includes(sw.state);
    const speedVal = sp && !['unknown', 'unavailable', ''].includes(sp.state) ? parseInt(sp.state, 10) : 0;

    if (!isUp) return 'DOWN';
    if (isNaN(speedVal) || speedVal === 0) return 'DM';

    if (speedVal >= 4000000000) return '10G';
    if (speedVal >= 1000000000) return '1G';
    if (speedVal >= 100000000) return '100M';
    if (speedVal >= 10000000) return '10M';
    return 'UP';
  }

  _getColor(status) {
    if (status === 'DOWN') return '#555';
    if (status === 'DM') return '#ff6b35';
    if (/10M|100M/.test(status)) return '#ff6b35';
    if (/1G/.test(status)) return '#4caf50';
    if (/10G/.test(status)) return '#2196f3';
    return '#f44336';
  }

  _renderPort(i, status) {
    const bg = this._getColor(status);
    const opacity = status === 'DOWN' ? 0.6 : 1;
    const isSfp = i >= this._sfpStart;
    const height = isSfp ? 25 : 27;
    const fontSize = isSfp ? 9 : 8;
    const text = status === 'DM' ? 'DM' : (status === 'DOWN' ? '' : status);

    return `
      <div style="flex:0 0 33px;text-align:center;">
        <div style="font-size:8px;color:#888;margin-bottom:2px;">${i}</div>
        <div style="width:33px;height:${height}px;background:${bg};color:#fff;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;opacity:${opacity};">
          ${text}
        </div>
      </div>`;
  }

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
      <div style="display:flex;gap:12px;font-size:9px;color:#aaa;">
        <span><span style="color:#ff6b35;">●</span> 10/100/DM</span>
        <span><span style="color:#4caf50;">●</span> 1G</span>
        <span><span style="color:#2196f3;">●</span> 10G</span>
        <span><span style="color:#555;">●</span> Down</span>
      </div>`;
  }

  _render() {
    if (!this._hass) return;

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
      bottomRow = `<div style="margin-top:4px;">${legend}</div>`;
    } else if (sfp) {
      bottomRow = `<div style="display:flex;justify-content:flex-end;margin-top:4px;">${sfp}</div>`;
    }

    this.innerHTML = `
      <ha-card style="padding:14px 20px 16px;background:#1e1e1e;border-radius:14px;box-shadow:0 5px 14px rgba(0,0,0,0.45);border:1px solid #333;font-family:'Google Sans','Roboto',sans-serif;overflow:visible;min-width:0;">
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

customElements.define('switch-port-card', SwitchPortCard);
