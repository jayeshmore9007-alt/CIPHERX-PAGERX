// AutomationStudio.tsx - automation studio: compose a workflow from the real
// agent pipeline, save it as DRAFT, and launch it as a real backend job on a
// project file. Exports AutomationScreen.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Alert, View } from 'react-native';
import { Panel, GlowButton, Chip, Mono, ScreenWrap, SectionHeader, StatusDot } from '../components/cyber';
import { COLORS } from '../theme';
import { projects, getProject, createAnalyzeJob } from '../api/client';
import { AGENT_NAMES, PIPELINE_ORDER } from '../agents/registry';

interface Workflow {
  id: string;
  name: string;
  steps: string[]; // agent ids
  state: 'DRAFT' | 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';
}

const newWorkflow = (): Workflow => ({
  id: Math.random().toString(36).slice(2, 10),
  name: 'New workflow',
  steps: [],
  state: 'DRAFT',
});

export const AutomationScreen: React.FC = () => {
  const [flows, setFlows] = useState<Workflow[]>([]);
  const [editing, setEditing] = useState<Workflow | null>(null);

  const saveFlow = (f: Workflow) => {
    setFlows((prev) => {
      const i = prev.findIndex((x) => x.id === f.id);
      if (i >= 0) { const c = [...prev]; c[i] = f; return c; }
      return [...prev, f];
    });
  };

  const launchFlow = async (f: Workflow) => {
    if (f.steps.length === 0) return Alert.alert('Empty workflow', 'Add at least one agent step before launching.');
    try {
      const ps = await projects();
      for (const p of ps.projects || []) {
        const d = await getProject(p.id);
        const file = d.project?.files?.[0];
        if (file) {
          Alert.alert('Authorization required',
            `This launches a real backend job on "${file.name}" in project "${p.name}". You confirm this target is yours or explicitly authorized. Continue?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'I authorize', onPress: async () => {
                try {
                  const r = await createAnalyzeJob(p.id, file.id);
                  saveFlow({ ...f, state: 'QUEUED' });
                  Alert.alert('Workflow launched', `Job ${r.jobId} queued. Note: the backend runs the full pipeline; track progress on the Jobs screen.`);
                } catch (e: any) { Alert.alert('Launch failed', e.message); }
              } }
            ]);
          return;
        }
      }
      Alert.alert('No target file', 'Upload a file to a project first (Projects screen).');
    } catch (e: any) { Alert.alert('Launch failed', e.message); }
  };

  if (editing) {
    const toggle = (id: string) => {
      const has = editing.steps.includes(id);
      const steps = has ? editing.steps.filter((s) => s !== id) : PIPELINE_ORDER.filter((a) => editing.steps.includes(a) || a === id);
      setEditing({ ...editing, steps });
    };
    return (
      <ScreenWrap>
        <SectionHeader title="EDIT WORKFLOW" subtitle="Compose agent steps; launching creates a real backend job" />
        <Panel title="Workflow">
          <Mono>Steps ({editing.steps.length}):</Mono>
          <Mono color={COLORS.secondary}>{editing.steps.map((s) => AGENT_NAMES[s]).join(' -> ') || 'none'}</Mono>
          <View style={styles.row}>
            <GlowButton label="Save draft" variant="ghost" onPress={() => { saveFlow(editing); setEditing(null); }} />
            <GlowButton label="Cancel edit" variant="ghost" onPress={() => setEditing(null)} />
          </View>
        </Panel>
        {PIPELINE_ORDER.map((id) => (
          <Panel key={id} title={`${AGENT_NAMES[id]} [${id}]`}>
            <View style={styles.row}>
              <Chip label={editing.steps.includes(id) ? 'SELECTED' : 'not selected'} active={editing.steps.includes(id)} />
              <GlowButton label={editing.steps.includes(id) ? 'Remove step' : 'Add step'} onPress={() => toggle(id)} />
            </View>
          </Panel>
        ))}
      </ScreenWrap>
    );
  }

  return (
    <ScreenWrap>
      <SectionHeader title="AUTOMATION STUDIO" subtitle="Agent workflow composition with real job launching" />
      <Panel title="Create workflow">
        <GlowButton label="New workflow" onPress={() => setEditing(newWorkflow())} />
      </Panel>
      {flows.length === 0 ? <Panel title="Saved workflows"><Mono>No workflows yet.</Mono></Panel> :
        flows.map((f) => (
          <Panel key={f.id} title={f.name}>
            <StatusDot state={f.state} />
            <Mono>Steps: {f.steps.map((s) => AGENT_NAMES[s]).join(' -> ') || 'none'}</Mono>
            <View style={styles.row}>
              <GlowButton label="Edit" variant="ghost" onPress={() => setEditing(f)} />
              <GlowButton label="Launch" onPress={() => launchFlow(f)} />
            </View>
          </Panel>
        ))}
      <Panel title="Honesty notice">
        <Mono color="#5c8f75">Workflows are stored in app memory as DRAFT until launched. Launching requires an authorized project file and creates a real job in the backend queue.</Mono>
      </Panel>
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginVertical: 4 },
});
