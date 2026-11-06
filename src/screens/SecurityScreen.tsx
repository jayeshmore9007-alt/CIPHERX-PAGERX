// SecurityScreen.tsx - security center: platform scope, provider key status,
// real tool status, and security posture facts. No simulated scan results.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Panel, Chip, Mono, ScreenWrap, SectionHeader, StatusDot } from '../components/cyber';
import { COLORS } from '../theme';
import { aiProviders, getTools } from '../api/client';

export const SecurityScreen: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [tools, setTools] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const p = await aiProviders(); if (alive) setProviders(p.providers || []); } catch {}
      try { const t = await getTools(); if (alive) setTools(t.tools); } catch {}
    })();
    return () => { alive = false; };
  }, []);

  return (
    <ScreenWrap>
      <SectionHeader title="SECURITY CENTER" subtitle="Platform scope, key handling and hardening state" />
      <Panel title="Authorized-use policy (enforced by the backend)">
        <Mono>- Only analyze apps you own or have explicit permission to test.</Mono>
        <Mono>- Job creation and file upload require an explicit authorization flag.</Mono>
        <Mono>- Unauthorized requests are rejected with 403 and written to the audit log.</Mono>
        <Mono>- PAGER-X commands are limited to a hard allowlist; all others are rejected.</Mono>
        <Mono>- No exploit, credential-theft, persistence or protection-bypass functionality exists.</Mono>
      </Panel>
      <Panel title="API key handling">
        <Mono>Keys are sent once over HTTPS and stored AES-256-GCM encrypted in the backend vault. The app never stores them; it only holds a session token in expo-secure-store.</Mono>
        <View style={styles.col}>
          {providers.length === 0 ? <Mono>Loading provider status...</Mono> :
            providers.map((p: any) => (
              <View key={p.id} style={styles.col}>
                <StatusDot state={p.configured ? 'CONNECTED' : 'NOT_CONFIGURED'} />
                <Mono>{p.id.toUpperCase()} · {p.configured ? 'key stored (encrypted)' : 'no key stored'}</Mono>
              </View>
            ))}
        </View>
      </Panel>
      <Panel title="Upload and worker hardening">
        <Mono>- Magic-byte validation on every upload; mismatches are rejected and deleted.</Mono>
        <Mono>- File size limit enforced (MAX_FILE_MB, default 200 MB).</Mono>
        <Mono>- Per-job isolated workspace directories under DATA_DIR.</Mono>
        <Mono>- Tool executions run with timeouts (STEP_TIMEOUT_MS) and output caps (MAX_OUTPUT_CHARS).</Mono>
      </Panel>
      <Panel title="Backend analysis tools">
        <View style={styles.row}>
          {Object.entries(tools).length === 0 ? <Mono>Checking backend...</Mono> :
            Object.entries(tools).map(([k, v]) => <Chip key={k} label={`${k.toUpperCase()} ${v}`} state={v} />)}
        </View>
      </Panel>
      <Panel title="Honesty notice">
        <Mono color="#5c8f75">This screen reports real configuration state only. There is no simulated vulnerability scanning and no fabricated results anywhere in the platform.</Mono>
      </Panel>
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  col: { marginBottom: 6 },
});
