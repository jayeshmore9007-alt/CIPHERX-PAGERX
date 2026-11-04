// RelabScreen.tsx - Deep Reverse Engineering Lab: real tool status, supported
// formats, and the honest 14-step pipeline explanation. Launch happens in Projects.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Panel, Chip, Mono, ScreenWrap, SectionHeader, StatusDot } from '../components/cyber';
import { getTools } from '../api/client';
import { PIPELINE_ORDER, AGENT_NAMES, SUPPORTED_FORMATS } from '../agents/registry';

const TOOL_HINTS: Record<string, string> = {
  jadx: 'Required for DEX/JAR decompilation. Install from github.com/skylot/jadx releases.',
  apktool: 'Required for resource/UI decoding. See apktool.org.',
  aapt: 'Comes with Android SDK build-tools.',
  readelf: 'Comes with binutils (Linux: sudo apt install binutils).',
  unzip: 'Standard on most systems.',
  ssh: 'Required for PAGER-X device diagnostics.',
};

export const RelabScreen: React.FC = () => {
  const [tools, setTools] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    (async () => { try { const t = await getTools(); if (alive) setTools(t.tools); } catch {} })();
    return () => { alive = false; };
  }, []);

  return (
    <ScreenWrap>
      <SectionHeader title="DEEP REVERSE ENGINEERING LAB" subtitle="Authorized analysis of APK, AAB, DEX, JAR, ZIP and SO files with real tools" />
      <Panel title="Supported intake formats (magic-byte validated)">
        <View style={styles.row}>
          {SUPPORTED_FORMATS.map((f) => <Chip key={f} label={f.toUpperCase()} />)}
        </View>
        <Mono color="#5c8f75">Files are validated by real magic bytes. Mismatched, oversized or unknown content is rejected and deleted.</Mono>
      </Panel>
      <Panel title="Backend tool status (real which-based check)">
        {Object.entries(tools).length === 0 ? <Mono>Checking backend tools...</Mono> :
          Object.entries(tools).map(([k, v]) => (
            <View key={k} style={styles.col}>
              <StatusDot state={v} />
              {v !== 'INSTALLED' && TOOL_HINTS[k] ? <Mono color="#FFD166">{TOOL_HINTS[k]}</Mono> : null}
            </View>
          ))}
      </Panel>
      <Panel title="Analysis pipeline (execution order)">
        {PIPELINE_ORDER.map((id, i) => (
          <Mono key={id}>{String(i + 1).padStart(2, '0')} · {AGENT_NAMES[id]} [{id}]</Mono>
        ))}
      </Panel>
      <Panel title="Honesty notice">
        <Mono color="#5c8f75">Decompiled code is reconstructed output, never the original source. Steps whose tools are unavailable report TOOL_NOT_INSTALLED with installation hints. Nothing is simulated.</Mono>
      </Panel>
      <Panel title="How to run an analysis">
        <Mono>1. Create a project on the Projects screen.</Mono>
        <Mono>2. Upload your own APK/AAB/DEX/JAR/ZIP/SO file (authorization required).</Mono>
        <Mono>3. Press Run full analysis and track live progress on the Jobs screen.</Mono>
        <Mono>4. Download the HTML or PDF report from the project history.</Mono>
      </Panel>
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  col: { marginBottom: 6 },
});
