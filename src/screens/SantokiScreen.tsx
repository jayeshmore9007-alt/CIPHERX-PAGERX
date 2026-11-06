// SANTOKI AI COMMANDER - Marathi-first central assistant screen.
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Panel, GlowButton, Mono, ScreenWrap, SectionHeader } from '../components/cyber';
import { COLORS } from '../theme';
import { santokiMessage } from '../api/client';

type Message = { role: 'user' | 'assistant'; text: string; steps?: string[]; status?: string; domain?: string; agent?: string; executor?: string };

export const SantokiScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'नमस्कार! मी SANTOKI आहे. तुम्ही मराठीत सांगा—मी तुमची विनंती समजून योग्य AI एजंट निवडेन आणि कामाची योजना बनवेन. ज्या executor चे कनेक्शन उपलब्ध आहे तेवढेच काम प्रत्यक्ष करता येईल; प्रत्येक महत्त्वाच्या कृतीसाठी तुमची परवानगी आवश्यक आहे.' },
  ]);

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setMessages((old) => [...old, { role: 'user', text: message }]);
    setInput('');
    setBusy(true);
    try {
      const result = await santokiMessage(message);
      setMessages((old) => [...old, {
        role: 'assistant',
        text: result.summary_mr || 'योजना तयार झाली.',
        steps: result.steps_mr || [],
        status: result.status,
        domain: result.domain,
        agent: result.agent_label_mr || result.agent_id,
        executor: result.executor_state,
      }]);
    } catch (error: any) {
      setMessages((old) => [...old, { role: 'assistant', text: error.message || 'Backend शी संपर्क झाला नाही. Gateway आणि login तपासा.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenWrap>
      <SectionHeader title="SANTOKI AI COMMANDER" subtitle="Marathi-first central brain · Multi-agent task router" />
      <Panel title="CENTRAL INTELLIGENCE">
        <Mono>तुम्ही मराठीत बोला किंवा लिहा. SANTOKI तुमची सूचना समजून योग्य AI एजंटकडे काम पाठवण्याची योजना बनवतो.</Mono>
        <Mono color={COLORS.primary}>MODE: PLAN + AGENT ROUTING · EXECUTION: CONNECTED EXECUTOR + APPROVAL REQUIRED</Mono>
      </Panel>
      <Panel title="CONVERSATION">
        <ScrollView style={styles.history} nestedScrollEnabled>
          {messages.map((m, index) => (
            <View key={index} style={[styles.message, m.role === 'user' ? styles.user : styles.assistant]}>
              <Mono color={m.role === 'user' ? '#38e8ff' : '#00ff9c'}>{m.role === 'user' ? 'YOU' : 'SANTOKI AI'}</Mono>
              <Mono>{m.text}</Mono>
              {m.agent ? <Mono color="#38e8ff">SELECTED AGENT: {m.agent}</Mono> : null}
              {m.domain ? <Mono color="#38e8ff">DOMAIN: {m.domain.toUpperCase()}</Mono> : null}
              {m.executor ? <Mono color={m.executor === 'NOT_CONNECTED' ? COLORS.danger : COLORS.primary}>EXECUTOR: {m.executor}</Mono> : null}
              {m.steps?.map((step, i) => <Mono key={i}>{i + 1}. {step}</Mono>)}
              {m.status ? <Mono color="#8fae9f">STATUS: {m.status} · NO ACTION EXECUTED</Mono> : null}
            </View>
          ))}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="मराठीत तुमचं काम लिहा..."
          placeholderTextColor={COLORS.textDim}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          editable={!busy}
        />
        <GlowButton label={busy ? 'SANTOKI विचार करत आहे...' : 'SEND TO SANTOKI'} onPress={send} />
        <GlowButton label="CLEAR CHAT" variant="ghost" onPress={() => Alert.alert('Clear conversation?', 'या स्क्रीनवरील संभाषण हटवायचे?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', onPress: () => setMessages([]) }])} />
      </Panel>
      <Panel title="AGENT EXECUTOR STATUS">
        <Mono>ANDROID: NOT CONNECTED · PAGER-X: LIMITED READ-ONLY · CIPHERX: NOT CONNECTED · BACKEND: NOT CONNECTED · COMPUTER: NOT CONNECTED</Mono>
        <Mono color="#8fae9f">कनेक्शन, परवानग्या आणि प्रत्यक्ष चाचणी पूर्ण होईपर्यंत कोणत्याही domain वर full control असल्याचा दावा केला जाणार नाही.</Mono>
      </Panel>
    </ScreenWrap>
  );
};

const styles = StyleSheet.create({
  history: { maxHeight: 420 },
  message: { padding: 10, marginBottom: 10, borderWidth: 1, borderRadius: 6 },
  user: { borderColor: '#24677a', backgroundColor: '#071820' },
  assistant: { borderColor: '#176b4d', backgroundColor: '#06150f' },
  input: { color: COLORS.text, borderColor: COLORS.border, borderWidth: 1, borderRadius: 6, padding: 10, minHeight: 72, marginTop: 8, marginBottom: 8, textAlignVertical: 'top' },
});
