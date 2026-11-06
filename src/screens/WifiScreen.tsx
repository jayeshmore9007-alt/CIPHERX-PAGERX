// WifiScreen.tsx - Wi-Fi diagnostics: manual measurements + NetInfo data,
// analyzed by the real backend network diagnostics endpoint.
import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet, Alert, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Panel, GlowButton, Mono, ScreenWrap, SectionHeader, Chip } from '../components/cyber';
import { COLORS } from '../theme';
import { wifiAnalyze } from '../api/client';

const SECURITY_OPTIONS = ['WPA2', 'WPA3', 'WPA', 'OPEN'];

export const WifiScreen: React.FC = () => {
  const [rssi, setRssi] = useState('');
  const [latency, setLatency] = useState('');
  const [loss, setLoss] = useState('');
  const [security, setSecurity] = useState('WPA2');
  const [result, setResult] = useState<any>(null);
  const [net, setNet] = useState<any>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => setNet(state));
    return () => unsub();
  }, []);

  const doAnalyze = async () => {
    const r = Number(rssi), l = Number(latency), p = Number(loss);
    if (!rssi || !latency || !loss || Number.isNaN(r) || Number.isNaN(l) || Number.isNaN(p)) {
      return Alert.alert('Measurements required', 'Enter RSSI, latency and packet loss values first.');
    }
    try { setResult(await wifiAnalyze({ rssi: r, latencyMs: l, packetLoss: p, security })); }
    catch (e: any) { Alert.alert('Analysis failed', e.message); }
  };

  return (
    <ScreenWrap>
      <SectionHeader title="WI-FI DIAGNOSTICS" subtitle="Real link-quality analysis computed by the backend" />
      <Panel title="Device network state (NetInfo)">
        {net ? (
          <>
            <Mono>Type: {net.type || 'unknown'}</Mono>
            <Mono>Connected: {net.isConnected === true ? 'true' : net.isConnected === false ? 'false' : 'unknown'}</Mono>
            <Mono>SSID: {net.details?.ssid || 'unavailable (Android restriction)'}</Mono>
          </>
        ) : <Mono>Reading network state...</Mono>}
      </Panel>
      <Panel title="Enter measurements">
        <TextInput style={styles.input} placeholder="RSSI in dBm (e.g. -67)" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={rssi} onChangeText={setRssi} />
        <TextInput style={styles.input} placeholder="Latency in ms (e.g. 24)" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={latency} onChangeText={setLatency} />
        <TextInput style={styles.input} placeholder="Packet loss % (e.g. 1)" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={loss} onChangeText={setLoss} />
        <View style={styles.row}>
          {SECURITY_OPTIONS.map((s) => (
            <Chip key={s} label={s} active={security === s} />
          ))}
        </View>
        <GlowButton label="Analyze connection" onPress={doAnalyze} />
      </Panel>
      {result ? (
        <Panel title="Backend analysis">
          <Mono>Rating: {result.rating}</Mono>
          {result.findings?.map((f: string, i: number) => <Mono key={i}>- {f}</Mono>)}
          {result.recommendations?.map((r: string, i: number) => <Mono key={i} color="#FFD166">* {r}</Mono>)}
        </Panel>
      ) : null}
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  input: { color: COLORS.text, borderColor: COLORS.border, borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
});
