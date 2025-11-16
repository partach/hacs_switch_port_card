class SwitchPortCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity_prefix) throw new Error("entity_prefix is required (e.g., 'mainswitch')");
    this._config = config;
    this._prefix = config.entity_prefix;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _getPortStatus(port) {
    const switchEnt = `switch.${this._prefix}_port_${port}`;
    const speedEnt = `sensor.${this._prefix}_port_speed_${port}`;

    const sw = this._hass?.states[switchEnt];
    const sp = this._hass?.states[speedEnt];

    const isUp = sw && ['on', '1', 'true', 'up'].includes(sw.state);
    const speedVal = sp && !['unknown', 'unavailable', ''].includes(sp.state) ? parseInt(sp.state, 10) : 0;

    if (!isUp) return 'DOWN';
    if (isNaN(speedVal) || speedVal === 0) return 'DM'; // Assume DM if speed unknown but link up

    if (speedVal >= 10000000000) return '10G';
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
    const height = i <= 24 ? 27 : 25;
    const fontSize = i <= 24 ? 8 : 9;
    const text = status === 'DM' ? 'DM' : (status === 'DOWN' ? '' : status);
    return `
      <div style="flex:0 0 33px;text-align:center;">
        <div style="font-size:8px;color:#888;margin-bottom:2px;">${i}</div>
        <div style="width:33px;height:${height}px;background:${bg};color:#fff;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;opacity:${opacity};">
          ${text}
        </div>
      </div>`;
  }

  _render() {
    if (!this._hass) return;

    let html = `
      <ha-card style="padding:14px 20px 16px;background:#1e1e1e;border-radius:14px;box-shadow:0 5px 14px rgba(0,0,0,0.45);border:1px solid #333;font-family:'Google Sans','Roboto',sans-serif;overflow:visible;min-width:0;">
        <div style="font-size:18px;font-weight:600;color:#e8e8e8;margin-bottom:12px;text-align:center;">
          ${this._config.name || 'Switch Ports'}
        </div>
        <div style="line-height:1.3;">

          <!-- COPPER TITLE -->
          <div style="margin:8px 0 6px;color:#999;font-size:10px;font-weight:600;text-align:center;">COPPER</div>

          <!-- EVEN ROW (2,4,6...) -->
          <div style="display:flex;justify-content:center;gap:3px;margin-bottom:3px;">`;
    for (let i = 2; i <= 24; i += 2) {
      html += this._renderPort(i, this._getPortStatus(i));
    }
    html += `</div>

          <!-- ODD ROW (1,3,5...) -->
          <div style="display:flex;justify-content:center;gap:3px;margin-bottom:8px;">`;
    for (let i = 1; i <= 23; i += 2) {
      html += this._renderPort(i, this._getPortStatus(i));
    }
    html += `</div>

          <!-- LEGEND + SFP -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;gap:12px;">
            <div style="display:flex;gap:12px;font-size:9px;color:#aaa;">
              <span><span style="color:#ff6b35;">●</span> 10/100</span>
              <span><span style="color:#4caf50;">●</span> 1G</span>
              <span><span style="color:#2196f3;">●</span> 10G</span>
              <span><span style="color:#555;">●</span> Down</span>
            </div>
            <div style="display:flex;align-items:center;gap:3px;">
              <div style="font-size:10px;color:#999;font-weight:600;margin-right:4px;">SFP</div>`;
    for (let i of [25,26,27,28]) {
      html += this._renderPort(i, this._getPortStatus(i));
    }
    html += `</div></div></div></ha-card>`;

    this.innerHTML = html;
  }

  getCardSize() { return 3; }
}

customElements.define('zyxel-port-card', ZyxelPortCard);
