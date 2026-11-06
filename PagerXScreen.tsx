// PagerXScreen.tsx - PAGER-X authorized device management: enrollment,
// approval, hard allowlisted diagnostics, health checks and task history.
import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet, Alert, View } from 'react-native';
import { Panel, GlowButton, Mono, ScreenWrap, SectionHeader, StatusDot } from '../components/cyber';
import { COLORS } from '../theme';
import { devices, enrollDevice, approveDevice, revokeDevice, deviceHealth, deviceTasks, pagerxCommand, pagerxCommanderMessage } from '../api/client';
import { DEVICE_ALLOWLIST } from '../agents/registry';

export const PagerXScreen: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', host: '', user: '', port: '22' });
  const [tasksFor, setTasksFor] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [commanderDevice, setCommanderDevice] = useState<string | null>(null);
  const [commanderInput, setCommanderInput] = useState('');
  const [commanderReply, setCommanderReply] = useState('');
  const [commanderBusy, setCommanderBusy] = useState(false);

  const load = async () => { try { setList((await devices()).devices || []); } catch {} };
  useEffect(() => { load(); }, []);

  const doEnroll = async () => {
    const { name, host, user, port } = form;
    if (!name || !host || !user) return Alert.alert('Missing fields', 'Name, host and user are required.');
    Alert.alert('Authorization required',
      'You confirm this device is your own or you have explicit permission to manage it. Enroll?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I authorize', onPress: async () => {
          try { await enrollDevice({ name, host, user, port: Number(port) || 22 }); setForm({ name: '', host: '', user: '', port: '22' }); load(); }
          catch (e: any) { Alert.alert('Enrollment failed', e.message); }
        } }
      ]);
  };

  const runCommand = (d: any, command: string) => {
    Alert.alert('Confirm command', `Run "${command}" on ${d.name} (${d.host})?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Run', onPress: async () => {
        try {
          const r = await pagerxCommand(d.id, command);
          Alert.alert(`${command} output`, r.output || '(no output)');
        } catch (e: any) { Alert.alert('Command rejected', e.message); }
      } }
    ]);
  };

  const sendCommanderMessage = async () => {
    if (!commanderDevice || !commanderInput.trim() || commanderBusy) return;
    setCommanderBusy(true);
    setCommanderReply('');
    try {
      const r = await pagerxCommanderMessage(commanderDevice, commanderInput.trim());
      setCommanderReply(r.reply || JSON.stringify(r.result || r));
      setCommanderInput('');
    } catch (e: any) {
      setCommanderReply(e.message || 'Commander request failed.');
    } finally {
      setCommanderBusy(false);
    }
  };

  const openTasks = async (id: string) => {
    try { const r = await deviceTasks(id); setTasks(r.tasks || []); setTasksFor(id); }
    catch (e: any) { Alert.alert('Failed', e.message); }
  };

  return (
    <ScreenWrap>
      <SectionHeader title="PAGER-X" subtitle="Authorized device diagnostics with a hard command allowlist" />
      <Panel title="PAGERX MASTER AI · COMMANDER">
        <Mono>Choose an APPROVED Pager, then ask for connection health, status, uptime, network interfaces, storage or recent logs.</Mono>
        <View style={styles.row}>
          {list.filter((d: any) => d.status === 'APPROVED').map((d: any) => (
            <GlowButton key={d.id} label={commanderDevice === d.id ? `Selected: ${d.name}` : d.name} variant={commanderDevice === d.id ? 'primary' : 'ghost'} onPress={() => setCommanderDevice(d.id)} />
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Ask PAGER-X AI (e.g. check device status)" placeholderTextColor={COLORS.textDim} value={commanderInput} onChangeText={setCommanderInput} multiline />
        <GlowButton label={commanderBusy ? "Working..." : "Ask Commander AI"} onPress={sendCommanderMessage} />
        {commanderReply ? <Mono>{commanderReply}</Mono> : null}
      </Panel>
      <Panel title="Enroll device (requires explicit approval)">
        <TextInput style={styles.input} placeholder="Device name" placeholderTextColor={COLORS.textDim} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
        <TextInput style={styles.input} placeholder="Host / IP" placeholderTextColor={COLORS.textDim} autoCapitalize="none" value={form.host} onChangeText={(t) => setForm({ ...form, host: t })} />
        <TextInput style={styles.input} placeholder="SSH user" placeholderTextColor={COLORS.textDim} autoCapitalize="none" value={form.user} onChangeText={(t) => setForm({ ...form, user: t })} />
        <TextInput style={styles.input} placeholder="SSH port (22)" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={form.port} onChangeText={(t) => setForm({ ...form, port: t })} />
        <GlowButton label="Enroll device" onPress={doEnroll} />
        <Mono color="#5c8f75">Devices start PENDING and must be approved before any command runs.</Mono>
      </Panel>
      <Panel title="Hard allowlisted commands (anything else is rejected with 403 + audit)">
        <Mono>{DEVICE_ALLOWLIST.join('  |  ')}</Mono>
      </Panel>
      {list.map((d: any) => (
        <Panel key={d.id} title={`${d.name} · ${d.host}`}>
          <StatusDot state={d.status} />
          <Mono>SSH user: {d.user} · port {d.port}</Mono>
          <View style={styles.row}>
            {d.status === 'PENDING' ? <GlowButton label="Approve" onPress={async () => { try { await approveDevice(d.id); load(); } catch (e: any) { Alert.alert('Failed', e.message); } }} /> : null}
            {d.status === 'APPROVED' ? (
              <>
                <GlowButton label="Health check" variant="ghost" onPress={async () => {
                  try { const h = await deviceHealth(d.id); Alert.alert('Health check', `healthy: ${h.healthy}\n${h.detail}`); }
                  catch (e: any) { Alert.alert('Health check failed', e.message); }
                }} />
                <GlowButton label="status" variant="ghost" onPress={() => runCommand(d, 'status')} />
                <GlowButton label="uptime" variant="ghost" onPress={() => runCommand(d, 'uptime')} />
                <GlowButton label="ifconfig" variant="ghost" onPress={() => runCommand(d, 'ifconfig')} />
                <GlowButton label="df -h" variant="ghost" onPress={() => runCommand(d, 'df -h')} />
                <GlowButton label="log tail" variant="ghost" onPress={() => runCommand(d, 'log tail')} />
                <GlowButton label="Task history" variant="ghost" onPress={() => openTasks(d.id)} />
              </>
            ) : null}
            {d.status !== 'REVOKED' ? <GlowButton label="Revoke" variant="danger" onPress={async () => { try { await revokeDevice(d.id); load(); } catch (e: any) { Alert.alert('Failed', e.message); } }} /> : null}
          </View>
        </Panel>
      ))}
      {tasksFor ? (
        <Panel title={`Task history · ${tasksFor.slice(0, 10)}`}>
          {tasks.length === 0 ? <Mono>No tasks recorded.</Mono> :
            tasks.slice().reverse().map((t: any, i: number) => (
              <Mono key={i}>{t.at?.slice(0, 19)} · {t.command} · {t.status}{t.error ? ` · ${t.error}` : ''}</Mono>
            ))}
        </Panel>
      ) : null}
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  input: { color: COLORS.text, borderColor: COLORS.border, borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
});
