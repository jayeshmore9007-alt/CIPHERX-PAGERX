// DashboardScreen.tsx - live system overview: health, tools, jobs, WS activity.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Panel, SectionHeader, Chip, StatusDot, Mono, ScreenWrap, GlowButton } from '../components/cyber';
import { HoloCore } from '../components/HoloCore';
import { COLORS } from '../theme';
import { health, getTools, jobs, aiProviders, openSocket } from '../api/client';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<any>(null);
  const [tools, setTools] = useState<Record<string, string>>({});
  const [jobStats, setJobStats] = useState<any>({});
  const [providers, setProviders] = useState<any[]>([]);
  const [feed, setFeed] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const h = await health(); if (alive) setStatus(h);
      } catch (e: any) { if (alive) setStatus({ status: 'DISCONNECTED', error: e.message }); }
      try { const t = await getTools(); if (alive) setTools(t.tools); } catch {}
      try {
        const j = await jobs(); if (alive) {
          const by = (s: string) => (j.jobs || []).filter((x: any) => x.state === s).length;
          setJobStats({ running: by('RUNNING'), queued: by('QUEUED'), done: by('DONE') + by('DONE_WITH_ERRORS'), failed: by('FAILED') });
        }
      } catch {}
      try { const p = await aiProviders(); if (alive) setProviders(p.providers); } catch {}
    };
    load();
    wsRef.current = openSocket((evt) => {
      setFeed((f) => [`${new Date().toLocaleTimeString()} · ${evt.event} ${evt.jobId || ''} ${evt.state || evt.agent || ''}`.trim(), ...f].slice(0, 12));
    });
    const poll = setInterval(load, 8000);
    return () => { alive = false; wsRef.current?.close(); clearInterval(poll); };
  }, []);

  return (
    <ScreenWrap>
      <SectionHeader title="CIPHERX CORE" subtitle="Real backend state - no simulated data" />
      <HoloCore size={110} />
      <Panel title="SANTOKI AI COMMANDER">
        <Mono>मराठीत सांगा. SANTOKI तुमची विनंती समजून योग्य एजंट आणि सुरक्षित कृती योजना तयार करेल.</Mono>
        <GlowButton label="OPEN SANTOKI AI COMMANDER" onPress={() => navigation.navigate('Santoki')} />
      </Panel>
      <Panel title="System status">
        <StatusDot state={status?.status || 'DISCONNECTED'} />
        {status?.version ? <Mono>Backend v{status.version}</Mono> : null}
        {status?.error ? <Mono color={COLORS.danger}>{status.error}</Mono> : null}
      </Panel>
      <Panel title="Job activity">
        <View style={styles.row}>
          <Chip label={`RUNNING ${jobStats.running || 0}`} state="RUNNING" />
          <Chip label={`QUEUED ${jobStats.queued || 0}`} state="QUEUED" />
          <Chip label={`DONE ${jobStats.done || 0}`} state="DONE" />
          <Chip label={`FAILED ${jobStats.failed || 0}`} state="FAILED" />
        </View>
      </Panel>
      <Panel title="Analysis tools (installed on backend)">
        <View style={styles.row}>
          {Object.entries(tools).length === 0 ? <Mono>Checking backend...</Mono> :
            Object.entries(tools).map(([k, v]) => <Chip key={k} label={`${k.toUpperCase()} ${v}`} state={v} />)}
        </View>
      </Panel>
      <Panel title="AI providers">
        <View style={styles.row}>
          {providers.map((p) => <Chip key={p.id} label={`${p.label} ${p.state}`} state={p.state} />)}
        </View>
      </Panel>
      <Panel title="Live activity feed">
        {feed.length === 0 ? <Mono>Waiting for live events over WebSocket...</Mono> :
          feed.map((l, i) => <Mono key={i} color={i === 0 ? COLORS.secondary : COLORS.textDim}>{l}</Mono>)}
      </Panel>
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap' } });
