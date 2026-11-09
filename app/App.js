import React, {useState} from 'react';
import {SafeAreaView, View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator} from 'react-native';
import {StatusBar} from 'expo-status-bar';

const GREEN = '#00ff9c', CYAN = '#38e8ff', BG = '#05090a', PANEL = '#10191b';
const DEFAULT_API = 'http://192.168.1.10:3000';
export default function App() {
  const [tab,setTab] = useState('CHAT');
  const [mode,setMode] = useState('AUTO');
  const [baseUrl,setBaseUrl] = useState(DEFAULT_API);
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [messages,setMessages] = useState([{role:'assistant',content:'CIPHER CORE online. Configure your backend URL to begin. Use this assistant only for lawful, authorized security work.'}]);
  async function send() {
    const prompt = message.trim(); if (!prompt || busy) return;
    setMessages(m=>[...m,{role:'user',content:prompt}]); setMessage(''); setBusy(true);
    try {
      const r = await fetch(baseUrl.replace(/\/$/,'')+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:prompt,mode})});
      const data = await r.json();
      setMessages(m=>[...m,{role:'assistant',content:data.reply || data.error || 'No response returned.'}]);
    } catch(e) {
      setMessages(m=>[...m,{role:'assistant',content:'Cannot reach the configured backend. Check that it is running and that this phone can reach its address. Offline Ollama also requires an Ollama server.'}]);
    } finally { setBusy(false); }
  }
  return <SafeAreaView style={s.root}><StatusBar style="light"/>
    <View style={s.header}><Text style={s.brand}>CIPHERX</Text><Text style={s.sub}>UNFILTERED AI / DEFENSIVE SECURITY</Text></View>
    <View style={s.tabs}>{['CHAT','SECURITY LAB','SETTINGS'].map(t=><Pressable key={t} onPress={()=>setTab(t)} style={[s.tab,tab===t&&s.active]}><Text style={[s.tabText,tab===t&&{color:GREEN}]}>{t}</Text></Pressable>)}</View>
    {tab==='CHAT' ? <><View style={s.modeRow}>{['AUTO','ONLINE','OFFLINE'].map(x=><Pressable key={x} onPress={()=>setMode(x)} style={[s.mode,mode===x&&s.modeOn]}><Text style={{color:mode===x?GREEN:'#a9b7b8'}}>{x}</Text></Pressable>)}</View>
      <ScrollView style={s.chat} contentContainerStyle={{gap:10,paddingBottom:12}}>{messages.map((m,i)=><View key={i} style={[s.bubble,m.role==='user'?s.user:s.bot]}><Text style={s.role}>{m.role==='user'?'YOU':'CIPHER CORE'}</Text><Text style={s.body}>{m.content}</Text></View>)}{busy&&<ActivityIndicator color={GREEN}/>}</ScrollView>
      <View style={s.composer}><TextInput value={message} onChangeText={setMessage} placeholder="Ask CIPHER CORE..." placeholderTextColor="#687879" style={s.input}/><Pressable onPress={send} style={s.send}><Text style={{color:'#00150d',fontWeight:'900'}}>SEND</Text></Pressable></View></>
    : tab==='SECURITY LAB' ? <ScrollView style={s.content}><Text style={s.h1}>DEFENSIVE SECURITY LAB</Text>
      {['Wi-Fi & network diagnostics','Authorized asset inventory','Website security review','File and malware triage','Security report builder'].map((x,i)=><View key={x} style={s.card}><Text style={s.cardTitle}>{String(i+1).padStart(2,'0')} / {x}</Text><Text style={s.muted}>Planned module — connect only to systems you own or are explicitly authorized to assess.</Text></View>)}
      <Text style={s.warning}>No exploit execution, credential theft, stealth access, or disruptive scanning is provided by this starter.</Text></ScrollView>
    : <ScrollView style={s.content}><Text style={s.h1}>CONNECTION SETTINGS</Text><Text style={s.label}>BACKEND BASE URL</Text><TextInput value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" style={s.settingInput} placeholder="http://192.168.1.10:3000" placeholderTextColor="#687879"/><Text style={s.muted}>Enter your backend server address. For local Ollama, configure the backend's OLLAMA_BASE_URL. Do not enter API keys in this app screen.</Text><View style={s.card}><Text style={s.cardTitle}>STATUS HONESTY</Text><Text style={s.muted}>This starter reports connection failures instead of pretending an AI or security scan is running.</Text></View></ScrollView>}
    <Text style={s.footer}>CIPHERX // AUTHORIZED USE ONLY</Text>
  </SafeAreaView>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:BG,paddingHorizontal:14,paddingTop:12},header:{paddingVertical:18,borderBottomWidth:1,borderColor:'#174333'},brand:{color:GREEN,fontSize:30,fontWeight:'900',letterSpacing:4},sub:{color:CYAN,fontSize:10,letterSpacing:2,marginTop:3},
 tabs:{flexDirection:'row',gap:7,marginVertical:12},tab:{flex:1,padding:11,borderWidth:1,borderColor:'#24413a',borderRadius:8,alignItems:'center'},active:{backgroundColor:'#10251d',borderColor:GREEN},tabText:{color:'#9eaeac',fontSize:10,fontWeight:'800'},
 modeRow:{flexDirection:'row',gap:8,marginBottom:10},mode:{flex:1,borderWidth:1,borderColor:'#28423b',padding:10,alignItems:'center',borderRadius:7},modeOn:{borderColor:GREEN,backgroundColor:'#10251d'},
 chat:{flex:1},bubble:{padding:12,borderRadius:10,borderWidth:1},bot:{backgroundColor:PANEL,borderColor:'#23533f',alignSelf:'flex-start',maxWidth:'95%'},user:{backgroundColor:'#10242b',borderColor:'#236078',alignSelf:'flex-end',maxWidth:'95%'},role:{color:CYAN,fontSize:9,fontWeight:'900',marginBottom:5,letterSpacing:1},body:{color:'#e3eeee',fontSize:14,lineHeight:21},
 composer:{flexDirection:'row',gap:8,paddingVertical:10},input:{flex:1,color:'white',borderWidth:1,borderColor:'#285044',borderRadius:8,paddingHorizontal:12},send:{backgroundColor:GREEN,borderRadius:8,paddingHorizontal:17,justifyContent:'center'},
 content:{flex:1},h1:{color:GREEN,fontSize:20,fontWeight:'900',letterSpacing:1,marginVertical:12},card:{backgroundColor:PANEL,borderColor:'#244b3b',borderWidth:1,borderRadius:9,padding:14,marginBottom:10},cardTitle:{color:CYAN,fontWeight:'800',marginBottom:6},muted:{color:'#a3b2b1',fontSize:12,lineHeight:18},warning:{color:'#ffcb70',fontSize:12,marginVertical:12,lineHeight:18},label:{color:CYAN,fontSize:11,marginBottom:6},settingInput:{borderWidth:1,borderColor:'#285044',borderRadius:8,color:'white',padding:12,marginBottom:12},footer:{textAlign:'center',color:'#537166',fontSize:9,letterSpacing:2,paddingVertical:9}
});