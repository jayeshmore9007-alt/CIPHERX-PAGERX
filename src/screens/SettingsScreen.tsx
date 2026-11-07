// SettingsScreen.tsx - backend gateway URL, operator login, encrypted provider
// key management, session control, and build facts. English-only.
import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet, Alert, View } from 'react-native';
import { Panel, GlowButton, Mono, ScreenWrap, SectionHeader, StatusDot } from '../components/cyber';
import { COLORS } from '../theme';
import {
  setGateway, initGateway, login, logout, clearSession,
  storedKeys, storeProviderKey, deleteProviderKey, health, getTools,
} from '../api/client';

const PROVIDERS = ['openai', 'anthropic', 'gemini', 'groq', 'openrouter', 'ollama'];

export const SettingsScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [keys, setKeys] = useState<string[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [tools, setTools] = useState<Record<string, string>>({});
  const [keyForm, setKeyForm] = useState({ provider: 'openai', key: '' });

  const loadKeys = async () => { try { const k = await storedKeys(); setKeys(k.keys || []); } catch {} };
  const loadHealth = async () => { try { const h = await health(); setStatus(h); } catch (e: any) { setStatus({ status: 'DISCONNECTED', error: e.message }); } };

  useEffect(() => {
    (async () => {
      try { const u = await initGateway(); setUrl(u); } catch {}
      loadKeys(); loadHealth();
      try { const t = await getTools(); setTools(t.tools); } catch {}
    })();
  }, []);

  return (
    <ScreenWrap>
      <SectionHeader title="SETTINGS" subtitle="Gateway, session, encrypted keys and environment facts" />
      <Panel title="Backend gateway">
        <TextInput style={styles.input} placeholder="http://<server>:8080" placeholderTextColor={COLORS.textDim} autoCapitalize="none" value={url} onChangeText={setUrl} />
        <GlowButton label="Save gateway URL" onPress={async () => {
          try { await setGateway(url.trim()); Alert.alert('Saved', 'Gateway URL stored on this device.'); loadHealth(); }
          catch (e: any) { Alert.alert('Failed', e.message); }
        }} />
        <StatusDot state={status?.status || 'DISCONNECTED'} />
      </Panel>
      <Panel title="Operator session">
        <TextInput style={styles.input} placeholder="Username (operator)" placeholderTextColor={COLORS.textDim} autoCapitalize="none" value={user} onChangeText={setUser} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={COLORS.textDim} secureTextEntry value={pass} onChangeText={setPass} />
        <View style={styles.row}>
          <GlowButton label="Sign in" onPress={async () => {
            try { await login(user.trim(), pass); setPass(''); loadKeys(); Alert.alert('Signed in', 'Session token stored in secure storage.'); }
            catch (e: any) { Alert.alert('Sign-in failed', e.message); }
          }} />
          <GlowButton label="Sign out" variant="ghost" onPress={async () => {
            try { await logout(); } catch {}
            await clearSession(); setKeys([]); Alert.alert('Signed out', 'Session cleared from this device.');
          }} />
        </View>
      </Panel>
      <Panel title="AI provider keys (stored AES-256-GCM encrypted on the backend)">
        <Mono>Stored: {keys.length ? keys.join(', ') : 'none'}</Mono>
        <TextInput style={styles.input} placeholder="Provider" placeholderTextColor={COLORS.textDim} autoCapitalize="none" value={keyForm.provider} onChangeText={(t) => setKeyForm({ ...keyForm, provider: t.toLowerCase() })} />
        <TextInput style={styles.input} placeholder="API key" placeholderTextColor={COLORS.textDim} secureTextEntry value={keyForm.key} onChangeText={(t) => setKeyForm({ ...keyForm, key: t })} />
        <View style={styles.row}>
          <GlowButton label="Store key" onPress={async () => {
            if (!PROVIDERS.includes(keyForm.provider)) return Alert.alert('Unknown provider', `Use one of: ${PROVIDERS.join(', ')}.`);
            if (!keyForm.key) return Alert.alert('Key required', 'Paste the API key first.');
            try { await storeProviderKey(keyForm.provider, keyForm.key); setKeyForm({ ...keyForm, key: '' }); loadKeys(); Alert.alert('Stored', 'Key encrypted and stored server-side.'); }
            catch (e: any) { Alert.alert('Failed', e.message); }
          }} />
          <GlowButton label="Delete stored key" variant="danger" onPress={async () => {
            try { await deleteProviderKey(keyForm.provider); loadKeys(); } catch (e: any) { Alert.alert('Failed', e.message); }
          }} />
        </View>
      </Panel>
      <Panel title="Build facts">
        <Mono>CIPHERX AI + PAGER-X v0.7.0 (versionCode 7)</Mono>
        <Mono>Package: com.jayeshmore.cipherxai</Mono>
        <Mono>Backend port: 8080 · WebSocket: /ws</Mono>
        <Mono>Tools on backend: {Object.entries(tools).map(([k, v]) => `${k}=${v}`).join(' ')}</Mono>
        <Mono color="#5c8f75">Only the session token is stored on this device (expo-secure-store). API keys never touch device storage.</Mono>
      </Panel>
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  input: { color: COLORS.text, borderColor: COLORS.border, borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
});
