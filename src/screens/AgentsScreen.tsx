// AgentsScreen.tsx - real agent catalog from the backend, per-agent model config,
// single-agent task execution with live polling. No placeholders.
import React, { useEffect, useState } from 'react';
import { View, Modal, TextInput, StyleSheet, FlatList, Alert } from 'react-native';
import { Panel, GlowButton, Chip, Mono, ScreenWrap, SectionHeader } from '../components/cyber';
import { COLORS } from '../theme';
import { agents, agentConfig, setAgentConfig, aiProviders, runAgentTask, getJob, projects, getProject } from '../api/client';

export const AgentsScreen: React.FC = () => {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [config, setConfig] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [modal, setModal] = useState<{ agent: any } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try { setCatalog((await agents()).agents || []); } catch {}
    try { setConfig((await agentConfig()).agents || []); } catch {}
    try { setProviders((await aiProviders()).providers || []); } catch {}
  };

  useEffect(() => { load(); }, []);

  const cfgFor = (id: string) => config.find((c: any) => c.agentId === id) || { provider: '-', model: '-' };

  const runTask = async (agentId: string) => {
    // Single-agent tasks require a real uploaded target file.
    let target: { projectId: string; fileId: string } | null = null;
    try {
      const ps = (await projects()).projects || [];
      for (const p of ps) {
        const detail = await getProject(p.id);
        if ((detail.project.files || []).length > 0) {
          target = { projectId: p.id, fileId: detail.project.files[0].id };
          break;
        }
      }
    } catch {}
    if (!target) {
      return Alert.alert('No target file', 'Create a project and upload an authorized file first (Projects screen).');
    }
    setBusy(agentId);
    try {
      const r = await runAgentTask(agentId, `Analyze with ${agentId}`, target.projectId, target.fileId);
      const jobId = r.jobId;
      let done = false;
      for (let i = 0; i < 40 && !done; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const job = await getJob(jobId);
        if (['DONE', 'DONE_WITH_ERRORS', 'FAILED', 'CANCELLED'].includes(job.state)) {
          done = true;
          const out = (job.steps || []).map((s: any) => `${s.agent} [${s.state}]: ${JSON.stringify(s.output).slice(0, 200)}`).join('\n');
          Alert.alert(`Task ${job.state}`, out || job.error || 'No output.');
        }
      }
      if (!done) Alert.alert('Task running', `Job ${jobId} is still running. Track it on the Jobs screen.`);
    } catch (e: any) {
      Alert.alert('Task failed', e.message);
    } finally { setBusy(null); }
  };

  const applyConfig = async (agentId: string, provider: string, model: string) => {
    try {
      await setAgentConfig(agentId, provider, model);
      setModal(null);
      load();
    } catch (e: any) { Alert.alert('Config failed', e.message); }
  };

  return (
    <ScreenWrap>
      <SectionHeader title="AI AGENT MATRIX" subtitle={`${catalog.length} real execution agents - each with dedicated logic, tools and model routing`} />
      <FlatList
        data={catalog}
        keyExtractor={(a: any) => a.id}
        scrollEnabled={false}
        renderItem={({ item: a }: any) => (
          <Panel title={`${a.name} [${a.id}]`}>
            <Mono>{a.description}</Mono>
            <View style={styles.row}>
              {a.tools.map((t: string) => <Chip key={t} label={t.toUpperCase()} />)}
              {a.formats.map((f: string) => <Chip key={f} label={f} />)}
            </View>
            <Mono color={COLORS.textDim}>Model: {cfgFor(a.id).provider} / {cfgFor(a.id).model}</Mono>
            <View style={styles.row}>
              <GlowButton label="Configure model" variant="ghost" onPress={() => setModal({ agent: a })} />
              <GlowButton label={busy === a.id ? 'Running...' : 'Run task'} onPress={() => runTask(a.id)} disabled={busy !== null} />
            </View>
          </Panel>
        )}
      />

      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.modalBack}>
          <Panel title={`Model for ${modal?.agent.name}`}>
            {providers.map((p) => (
              <GlowButton key={p.id} label={`${p.label} (${p.state})`}
                variant={p.state === 'CONNECTED' ? 'primary' : 'ghost'}
                disabled={p.state === 'NOT_CONFIGURED'}
                onPress={() => {
                  const model = (p.models && p.models[0]) || 'default';
                  applyConfig(modal!.agent.id, p.id, model);
                }} />
            ))}
            <GlowButton label="Close" variant="ghost" onPress={() => setModal(null)} />
          </Panel>
        </View>
      </Modal>
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 4 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
});
