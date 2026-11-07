// JobsScreen.tsx - live job queue with cancel/retry and WebSocket step updates.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Panel, GlowButton, Mono, ScreenWrap, SectionHeader, StatusDot } from '../components/cyber';
import { COLORS, statusColor } from '../theme';
import { jobs, getJob, cancelJob, retryJob, openSocket } from '../api/client';

export const JobsScreen: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);

  const refresh = async () => {
    try { setList((await jobs()).jobs || []); } catch {}
  };

  const upsertStep = (steps: any[], evt: any) => {
    const s = { agent: evt.agent, name: evt.name, state: evt.state, output: evt.output, at: evt.at };
    const i = steps.findIndex((x) => x.agent === evt.agent && x.name === evt.name);
    if (i >= 0) steps[i] = s; else steps.push(s);
    return steps;
  };

  useEffect(() => {
    refresh();
    const ws = openSocket((evt) => {
      if (evt.event === 'job:event' || evt.event === 'job:created') refresh();
      if (evt.event === 'job:step' && active && evt.jobId === active.id) {
        setActive((prev: any) => prev ? { ...prev, steps: upsertStep([...(prev.steps || [])], evt) } : prev);
      }
    });
    const poll = setInterval(refresh, 4000);
    return () => { ws.close(); clearInterval(poll); };
  }, [active?.id]);

  const openJob = async (id: string) => {
    try { setActive(await getJob(id)); } catch (e: any) { Alert.alert('Failed', e.message); }
  };

  const doCancel = async (id: string) => {
    try { await cancelJob(id); refresh(); if (active?.id === id) openJob(id); }
    catch (e: any) { Alert.alert('Cancel failed', e.message); }
  };

  const doRetry = async (id: string) => {
    try { await retryJob(id); refresh(); }
    catch (e: any) { Alert.alert('Retry failed', e.message); }
  };

  return (
    <ScreenWrap>
      <SectionHeader title="JOB QUEUE" subtitle="Sequential queue with live steps, cancellation and retries" />
      {list.length === 0 ? <Panel title="Queue"><Mono>No jobs yet. Launch an analysis from a project.</Mono></Panel> :
        list.slice().reverse().map((j: any) => (
          <Panel key={j.id} title={`${j.type.toUpperCase()} · ${j.id.slice(0, 14)}`}>
            <StatusDot state={j.state} />
            {j.error ? <Mono color={COLORS.danger}>{j.error}</Mono> : null}
            <View style={styles.row}>
              <GlowButton label="Open" variant="ghost" onPress={() => openJob(j.id)} />
              {['QUEUED', 'RUNNING'].includes(j.state) ? <GlowButton label="Cancel" variant="danger" onPress={() => doCancel(j.id)} /> : null}
              {['FAILED', 'CANCELLED'].includes(j.state) ? <GlowButton label="Retry" onPress={() => doRetry(j.id)} /> : null}
            </View>
          </Panel>
        ))}
      {active ? (
        <Panel title={`Steps · ${active.id}`}>
          {(active.steps || []).map((s: any, i: number) => (
            <View key={i} style={styles.col}>
              <StatusDot state={s.state} />
              <Mono color={statusColor(s.state)}>{s.agent} · {s.name}</Mono>
              {s.state === 'FAILED' && s.output?.error ? <Mono color={COLORS.danger}>{s.output.error}</Mono> : null}
            </View>
          ))}
          {(active.steps || []).length === 0 ? <Mono>No steps recorded yet.</Mono> : null}
          {active.logs?.length ? (
            <>
              <Mono color={COLORS.textDim}>--- execution logs ---</Mono>
              {active.logs.slice(-8).map((l: any, i: number) => <Mono key={i} color={COLORS.textDim}>{l.at?.slice(11, 19)} {l.message}</Mono>)}
            </>
          ) : null}
        </Panel>
      ) : null}
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  col: { marginBottom: 6 },
});
