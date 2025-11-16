  _renderSystemInfo() {
    if (!this._config.show_system_info) return { top: '', bottom: '' };
    const cpuBar = this._renderBarGauge(this._config.entity_cpu, 'CPU');
    const memBar = this._renderBarGauge(this._config.entity_memory, 'MEMORY');
    const isCompact = this._config.compact_mode;
    let topSection = '';
    if (cpuBar || memBar) {
      topSection = `
        <div style="display:flex;gap:${isCompact ? 6 : 12}px;text-align:center;margin-bottom:${isCompact ? 8 : 12}px;flex-wrap:nowrap;justify-content:center;">
          ${cpuBar}
          ${memBar}
        </div>`;
    }

    const nameEntity = this._hass?.states[this._config.entity_name];
    const firmwareEntity = this._hass?.states[this._config.entity_firmware];
    const uptimeEntity = this._hass?.states[this._config.entity_uptime];
    const infoItems = [];

    if (this._config.entity_name && nameEntity) {
      infoItems.push(`
        <div style="display:flex;gap:4px;align-items:center;white-space:nowrap;min-width:0;">
          <span style="color:#aaa;flex-shrink:0;">Name:</span>
          <span style="color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:180px;" title="${nameEntity.state}">${nameEntity.state}</span>
        </div>`);
    }
    if (this._config.entity_firmware && firmwareEntity) {
      infoItems.push(`
        <div style="display:flex;gap:4px;align-items:center;white-space:nowrap;min-width:0;">
          <span style="color:#aaa;flex-shrink:0;">FW:</span>
          <span style="color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:120px;" title="${firmwareEntity.state}">${firmwareEntity.state}</span>
        </div>`);
    }
    if (this._config.entity_uptime && uptimeEntity) {
      infoItems.push(`
        <div style="display:flex;gap:4px;align-items:center;white-space:nowrap;min-width:0;">
          <span style="color:#aaa;flex-shrink:0;">Uptime:</span>
          <span style="color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:140px;" title="${uptimeEntity.state}">${uptimeEntity.state}</span>
        </div>`);
    }

    let bottomSection = '';
    if (infoItems.length > 0) {
      const gap = isCompact ? 12 : 16;
      const fontSize = isCompact ? 7 : 8;
      bottomSection = `
        <div style="display:flex;gap:${gap}px;font-size:${fontSize}px;margin-top:${isCompact ? 4 : 6}px;padding-top:${isCompact ? 4 : 6}px;border-top:1px solid #333;overflow:hidden;white-space:nowrap;flex-wrap:nowrap;justify-content:center;align-items:center;">
          ${infoItems.join('<span style="color:#555;margin:0 6px;opacity:0.7;font-weight:300;">|</span>')}
        </div>`;
    }
    return { top: topSection, bottom: bottomSection };
  }
