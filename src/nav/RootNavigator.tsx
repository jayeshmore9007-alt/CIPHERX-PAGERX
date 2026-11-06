// RootNavigator.tsx - 11-screen navigation over the cyberpunk theme.
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../theme';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AgentsScreen } from '../screens/AgentsScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { RelabScreen } from '../screens/RelabScreen';
import { JobsScreen } from '../screens/JobsScreen';
import { WifiScreen } from '../screens/WifiScreen';
import { PagerXScreen } from '../screens/PagerXScreen';
import { MonitorScreen } from '../screens/MonitorScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import { AutomationScreen } from '../screens/AutomationStudio';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.black,
    card: COLORS.black,
    text: COLORS.primary,
    primary: COLORS.primary,
    border: COLORS.border,
  },
};

export const RootNavigator: React.FC = () => (
  <NavigationContainer theme={theme}>
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.black },
        headerTintColor: COLORS.primary,
        contentStyle: { backgroundColor: COLORS.black },
      }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'CIPHERX CORE' }} />
      <Stack.Screen name="Agents" component={AgentsScreen} options={{ title: 'AI AGENTS' }} />
      <Stack.Screen name="Projects" component={ProjectsScreen} options={{ title: 'PROJECTS' }} />
      <Stack.Screen name="Relab" component={RelabScreen} options={{ title: 'RE LAB' }} />
      <Stack.Screen name="Jobs" component={JobsScreen} options={{ title: 'JOBS' }} />
      <Stack.Screen name="Wifi" component={WifiScreen} options={{ title: 'NET GUARD' }} />
      <Stack.Screen name="PagerX" component={PagerXScreen} options={{ title: 'PAGER-X' }} />
      <Stack.Screen name="Monitor" component={MonitorScreen} options={{ title: 'MONITOR' }} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'SECURITY' }} />
      <Stack.Screen name="Automation" component={AutomationScreen} options={{ title: 'AUTOMATION' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'SETTINGS' }} />
    </Stack.Navigator>
  </NavigationContainer>
);
