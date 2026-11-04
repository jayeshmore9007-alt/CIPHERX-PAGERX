// MonitorScreen.tsx - system monitor: backend health, tool status,
// live WebSocket event feed and audit log.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Panel, Chip, Mono, ScreenWrap, SectionHeader, StatusDot } from '../components/cyber';
import { COLORS } from '../theme';
import { health, getTools, auditLog, openSocket } from '../api/client';

export const MonitorScreen: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [tools, setTools] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<any[]>([]);
  const [feed, setFeed] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const h = await health(); if (alive) setStatus(h); } catch (e: any) { if (alive) setStatus({ status: 'DISCONNECTED', error: e.message }); }
      try { const t = await getTools(); if (alive) setTools(t.tools); } catch {}
      try { const a = await auditLog(); if (alive) setAudit(a.entries || []); } catch {}
    };
    load();
    wsRef.current = openSocket((evt) => {
      setFeed((f) => [`${new Date().toLocaleTimeString()} · ${evt.event} ${evt.jobId || ''} ${evt.state || evt.agent || ''}`.trim(), ...f].slice(0, 15));
    });
    const poll = setInterval(load, 8000);
    return () => { alive = false; wsRef.current?.close(); clearInterval(poll); };
  }, []);

  return (
    <ScreenWrap>
      <SectionHeader title="SYSTEM MONITOR" subtitle="Backend health, tool status and live events" />
      <Panel title="Backend health">
        <StatusDot state={status?.status || 'DISCONNECTED'} />
        {status?.uptime ? <Mono>Uptime: {Math.round(status.uptime / 1000)}s</Mono> : null}
        {status?.error ? <Mono color={COLORS.danger}>{status.error}</Mono> : null}
      </Panel>
      <Panel title="Analysis tools">
        <View style={styles.row}>
          {Object.entries(tools).length === 0 ? <Mono>Checking backend...</Mono> :
            Object.entries(tools).map(([k, v]) => <Chip key={k} label={`${k.toUpperCase()} ${v}`} state={v} />)}
        </View>
      </Panel>
      <Panel title="Live WebSocket feed">
        {feed.length === 0 ? <Mono>Waiting for events...</Mono> : feed.map((l, i) => <Mono key={i} color={COLORS.textDim}>{l}</Mono>)}
      </Panel>
      <Panel title="Audit log (latest 12)">
        {audit.length === 0 ? <Mono>No audit entries yet.</Mono> :
          audit.slice(-12).reverse().map((a: any, i: number) => (
            <Mono key={i} color={COLORS.textDim}>{a.at?.slice(0, 19)} · {a.action} · {a.detail}</Mono>
          ))}
      </Panel>
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
});
