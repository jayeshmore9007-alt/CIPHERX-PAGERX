// ProjectsScreen.tsx - persistent projects, authorized upload, pipeline launch,
// history, and HTML/PDF report links. All actions call real backend endpoints.
import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet, Alert, Linking, View } from 'react-native';
import { Panel, GlowButton, Chip, Mono, ScreenWrap, SectionHeader, StatusDot } from '../components/cyber';
import { COLORS } from '../theme';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  projects, createProject, getProject, uploadProjectFile, createAnalyzeJob, addProjectNote, reportUrl,
} from '../api/client';
import { SUPPORTED_FORMATS } from '../agents/registry';

export const ProjectsScreen: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const load = async () => { try { setList((await projects()).projects || []); } catch {} };
  useEffect(() => { load(); }, []);

  const openProject = async (id: string) => {
    try { setDetail(await getProject(id)); setOpenId(id); }
    catch (e: any) { Alert.alert('Failed to open project', e.message); }
  };

  const doCreate = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Enter a project name first.');
    try { await createProject(name.trim()); setName(''); load(); }
    catch (e: any) { Alert.alert('Create failed', e.message); }
  };

  const doUpload = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({});
      if (picked.canceled || !picked.assets?.[0]) return;
      const file = picked.assets[0];
      const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
      if (!SUPPORTED_FORMATS.includes(ext)) {
        return Alert.alert('Unsupported format', `Only these formats can be analyzed: ${SUPPORTED_FORMATS.join(', ')}.`);
      }
      Alert.alert('Authorization required',
        'You confirm this file is your own application or you have explicit written permission to test it. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I authorize', style: 'default', onPress: async () => {
              try {
                const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
                await uploadProjectFile(openId!, file.name, b64);
                Alert.alert('Upload validated', 'File passed magic-byte validation and was stored.');
                openProject(openId!);
              } catch (e: any) { Alert.alert('Upload rejected', e.message); }
            }
          }
        ]);
    } catch (e: any) { Alert.alert('Upload failed', e.message); }
  };

  const doAnalyze = (fileId: string) => {
    Alert.alert('Authorization required',
      'You confirm this analysis target is owned by you or explicitly authorized for testing. Start the full agent pipeline?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I authorize', onPress: async () => {
          try {
            const r = await createAnalyzeJob(openId!, fileId);
            Alert.alert('Analysis queued', `Job ${r.jobId} queued. Watch live progress on the Jobs screen.`);
          } catch (e: any) { Alert.alert('Failed to queue', e.message); }
        } }
      ]);
  };

  if (openId && detail) {
    return (
      <ScreenWrap>
        <SectionHeader title={detail.project.name} subtitle={`Project ${openId}`} />
        <GlowButton label="Back to projects" variant="ghost" onPress={() => { setOpenId(null); setDetail(null); }} />
        <Panel title="Target files (magic-byte validated)">
          {detail.project.files.length === 0 ? <Mono>No files uploaded yet.</Mono> :
            detail.project.files.map((f: any) => (
              <View key={f.id} style={styles.row} >
                <Chip label={`${f.name} · ${f.format} · ${f.size}B`} />
                <GlowButton label="Run full analysis" onPress={() => doAnalyze(f.id)} />
              </View>
            ))}
          <GlowButton label="Upload file (authorized)" variant="ghost" onPress={doUpload} />
        </Panel>
        <Panel title="Analysis history">
          {detail.history.length === 0 ? <Mono>No analyses yet.</Mono> :
            detail.history.map((h: any) => (
              <View key={h.id} style={styles.row} >
                <StatusDot state={h.state} />
                <Mono>{h.summary} · {h.at?.slice(0, 19)}</Mono>
                {h.state === 'DONE' || h.state === 'DONE_WITH_ERRORS' ? (
                  <>
                    <GlowButton label="HTML report" variant="ghost" onPress={() => Linking.openURL(reportUrl(h.jobId, 'html'))} />
                    <GlowButton label="PDF report" variant="ghost" onPress={() => Linking.openURL(reportUrl(h.jobId, 'pdf'))} />
                  </>
                ) : null}
              </View>
            ))}
        </Panel>
        <Panel title="Operator notes">
          {detail.project.notes?.map((n: any, i: number) => <Mono key={i}>- {n.text}</Mono>)}
          <TextInput style={styles.input} placeholder="New note..." placeholderTextColor={COLORS.textDim} value={note} onChangeText={setNote} />
          <GlowButton label="Save note" onPress={async () => {
            if (!note.trim()) return;
            try { await addProjectNote(openId, note.trim()); setNote(''); openProject(openId); }
            catch (e: any) { Alert.alert('Failed', e.message); }
          }} />
        </Panel>
      </ScreenWrap>
    );
  }

  return (
    <ScreenWrap>
      <SectionHeader title="PROJECTS" subtitle="Persistent project context, files and analysis history" />
      <Panel title="Create project">
        <TextInput style={styles.input} placeholder="Project name..." placeholderTextColor={COLORS.textDim} value={name} onChangeText={setName} />
        <GlowButton label="Create project" onPress={doCreate} />
      </Panel>
      {list.map((p: any) => (
        <Panel key={p.id} title={p.name}>
          <Mono>{p.fileCount} file(s) · created {p.createdAt?.slice(0, 10)}</Mono>
          <GlowButton label="Open project" variant="ghost" onPress={() => openProject(p.id)} />
        </Panel>
      ))}
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginVertical: 4 },
  input: { color: COLORS.text, borderColor: COLORS.border, borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 8 },
});
