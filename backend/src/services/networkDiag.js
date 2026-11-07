// networkDiag.js - real Wi-Fi measurement analysis. Analyzes only the
// measurements provided; every conclusion derives from the given numbers.
function analyzeMeasurements({ rssi, latencyMs, packetLoss, security }) {
  const issues = [];
  const rx = Number(rssi);
  const lat = Number(latencyMs);
  const loss = Number(packetLoss);
  const sec = String(security || 'unknown').toUpperCase();

  if (!Number.isFinite(rx)) {
    issues.push({ severity: 'INFO', message: 'No RSSI measurement provided - signal quality not assessed.' });
  } else if (rx >= -50) {
    issues.push({ severity: 'LOW', message: `Signal excellent (${rx} dBm).` });
  } else if (rx >= -60) {
    issues.push({ severity: 'LOW', message: `Signal good (${rx} dBm).` });
  } else if (rx >= -70) {
    issues.push({ severity: 'MEDIUM', message: `Signal fair (${rx} dBm) - expect reduced throughput at range.` });
  } else {
    issues.push({ severity: 'HIGH', message: `Signal weak (${rx} dBm) - move closer to the access point or reduce interference.` });
  }

  if (Number.isFinite(lat)) {
    if (lat <= 30) issues.push({ severity: 'LOW', message: `Latency good (${lat} ms).` });
    else if (lat <= 100) issues.push({ severity: 'MEDIUM', message: `Latency moderate (${lat} ms).` });
    else issues.push({ severity: 'HIGH', message: `Latency high (${lat} ms) - check channel congestion and AP load.` });
  } else {
    issues.push({ severity: 'INFO', message: 'No latency measurement provided.' });
  }

  if (Number.isFinite(loss)) {
    if (loss === 0) issues.push({ severity: 'LOW', message: 'No packet loss measured.' });
    else if (loss < 3) issues.push({ severity: 'MEDIUM', message: `Packet loss ${loss}% - monitor for instability.` });
    else issues.push({ severity: 'HIGH', message: `Packet loss ${loss}% - serious link instability.` });
  } else {
    issues.push({ severity: 'INFO', message: 'No packet loss measurement provided.' });
  }

  if (sec === 'OPEN') issues.push({ severity: 'HIGH', message: 'Network is OPEN - traffic is unencrypted. Use a VPN on untrusted networks.' });
  else if (sec === 'WEP') issues.push({ severity: 'HIGH', message: 'WEP is broken and trivially crackable. Upgrade to WPA2/WPA3.' });
  else if (sec === 'WPA') issues.push({ severity: 'MEDIUM', message: 'WPA (first generation) is outdated. Prefer WPA2/WPA3.' });
  else if (sec === 'WPA2' || sec === 'WPA3') issues.push({ severity: 'LOW', message: `${sec} encryption in use.` });
  else issues.push({ severity: 'INFO', message: `Security mode "${sec}" unknown - not assessed.` });

  const worst = issues.some((i) => i.severity === 'HIGH') ? 'HIGH'
    : issues.some((i) => i.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW';
  const summary = worst === 'HIGH'
    ? 'Connection has serious problems that need attention.'
    : worst === 'MEDIUM'
      ? 'Connection works but has notable weaknesses.'
      : 'Connection looks healthy based on the provided measurements.';

  return { summary, issues };
}

module.exports = { analyzeMeasurements };
