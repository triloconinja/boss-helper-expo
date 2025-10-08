// App.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  NavigationContainer,
  DefaultTheme,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View,
  ActivityIndicator,
  Pressable,
  Text,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from './src/theme';
import Dashboard from './src/screens/Dashboard';
import CalendarView from './src/screens/CalendarView';
import Tasks from './src/screens/Tasks';
import Profile from './src/screens/Profile';
import Households from './src/screens/Households';
import Grocery from './src/screens/Grocery';
import Activities from './src/screens/Activities';
import Login from './src/screens/Login';
import { supabase } from './src/supabase';
import { MenuProvider, useMenu } from './src/context/MenuProvider';

enableScreens(true);

const BLUE = '#0268EE';
const GRAY = '#9AA0A6';

type RootStackParamList = {
  Home: undefined;
  Calendar: undefined;
  Tasks: undefined;
  Grocery: undefined;
  Households: undefined;
  Activities: undefined;
  Profile: undefined;
  Login: undefined;
};

const AppStackNav = createNativeStackNavigator<RootStackParamList>();
const AuthStackNav = createNativeStackNavigator();

/* ---------------- Supabase Link & Auth Listener ---------------- */
function useSupabaseLinking(onLoggedIn?: () => void) {
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      try {
        const parsed = Linking.parse(url);
        const code = (parsed.queryParams as Record<string, string> | undefined)?.code;
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          onLoggedIn?.();
          return;
        }

        const hash = url.split('#')[1];
        if (!hash) return;
        const params = Object.fromEntries(new URLSearchParams(hash));
        const access_token = params['access_token'];
        const refresh_token = params['refresh_token'];
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          onLoggedIn?.();
        }
      } catch (e: any) {
        Alert.alert('Login Error', e?.message ?? 'Unable to complete login.');
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) await handleUrl({ url: initial });
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onLoggedIn?.();
    });

    return () => {
      sub.remove();
      authSub.subscription.unsubscribe();
    };
  }, [onLoggedIn]);
}

/* ---------------- Logout Helper ---------------- */
async function handleLogout() {
  try {
    await supabase.auth.signOut();
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter((k) => k.startsWith('sb-'));
    if (supabaseKeys.length) await AsyncStorage.multiRemove(supabaseKeys);
  } catch (e) {
    console.log('Logout error', e);
  }
}

/* ---------------- Modal Popup Menu ---------------- */
function MoreMenuOverlay({ navTo }: { navTo: (r: keyof RootStackParamList) => void }) {
  const { open, setOpen } = useMenu();
  const insets = useSafeAreaInsets();
  const theme = {
    cardBg: '#22262B',
    border: 'rgba(255,255,255,0.15)',
    divider: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  };

  const go = (route: keyof RootStackParamList) => {
    setOpen(false);
    navTo(route);
  };

  const logout = async () => {
    setOpen(false);
    await handleLogout();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.menuBackdrop} onPress={() => setOpen(false)}>
        <View
          style={[
            styles.menuCardBase,
            {
              top: insets.top + 10,
              right: 20,
              backgroundColor: theme.cardBg,
              borderColor: theme.border,
              position: 'absolute',
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {[
            { label: 'Grocery', icon: 'cart-outline', route: 'Grocery' as const },
            { label: 'Households', icon: 'business-outline', route: 'Households' as const },
            { label: 'Activities', icon: 'time-outline', route: 'Activities' as const },
            { label: 'Profile', icon: 'person-outline', route: 'Profile' as const },
          ].map((item, i) => (
            <Pressable
              key={item.route}
              onPress={() => go(item.route)}
              style={[styles.menuRow, i !== 0 && { borderTopColor: theme.divider }]}
            >
              <Ionicons name={item.icon as any} size={20} color={theme.icon} />
              <Text style={[styles.menuRowText, { color: theme.text }]}>{item.label}</Text>
            </Pressable>
          ))}

          {/* Logout Item */}
          <Pressable
            onPress={logout}
            style={[styles.menuRow, { borderTopColor: theme.divider, borderTopWidth: StyleSheet.hairlineWidth }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF5555" />
            <Text style={[styles.menuRowText, { color: '#FF5555' }]}>Logout</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

/* ---------------- Bottom Bar ---------------- */
function BottomStatBar({
  active,
  onHome,
  onCalendar,
  onTasks,
}: {
  active: keyof RootStackParamList | string;
  onHome: () => void;
  onCalendar: () => void;
  onTasks: () => void;
}) {
  const { setOpen } = useMenu();
  const insets = useSafeAreaInsets();
  const isActive = (name: string) => String(active) === name;

  return (
    <View
      style={[
        styles.statBar,
        {
          left: 20,
          right: 20,
          bottom: 18,
          height: 56 + (insets.bottom || 0),
          paddingTop: 10,
          paddingBottom: Math.max(10, insets.bottom ? 10 : 8),
        },
      ]}
    >
      <Pressable style={styles.statBarItem} onPress={onHome}>
        <Ionicons
          name={(isActive('Home') ? 'home' : 'home-outline') as any}
          size={24}
          color={isActive('Home') ? BLUE : GRAY}
        />
      </Pressable>
      <Pressable style={styles.statBarItem} onPress={onCalendar}>
        <Ionicons
          name={(isActive('Calendar') ? 'calendar' : 'calendar-outline') as any}
          size={24}
          color={isActive('Calendar') ? BLUE : GRAY}
        />
      </Pressable>
      <Pressable style={styles.statBarItem} onPress={onTasks}>
        <Ionicons
          name={(isActive('Tasks') ? 'checkbox' : 'checkbox-outline') as any}
          size={24}
          color={isActive('Tasks') ? BLUE : GRAY}
        />
      </Pressable>
      <Pressable style={styles.statBarItem} onPress={() => setOpen(true)}>
        <Ionicons name="notifications-outline" size={24} color={GRAY} />
      </Pressable>
    </View>
  );
}

/* ---------------- App Stacks ---------------- */
function AppStack() {
  return (
    <AppStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AppStackNav.Screen name="Home" component={Dashboard} />
      <AppStackNav.Screen name="Calendar" component={CalendarView} />
      <AppStackNav.Screen name="Tasks" component={Tasks} />
      <AppStackNav.Screen name="Grocery" component={Grocery} />
      <AppStackNav.Screen name="Households" component={Households} />
      <AppStackNav.Screen name="Activities" component={Activities} />
      <AppStackNav.Screen name="Profile" component={Profile} />
    </AppStackNav.Navigator>
  );
}

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={Login} />
    </AuthStackNav.Navigator>
  );
}

/* ---------------- AuthGate ---------------- */
function AuthGate({
  childrenWhenAuthed,
  onLoggedIn,
}: {
  childrenWhenAuthed: React.ReactNode;
  onLoggedIn: () => void;
}) {
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsAuthed(!!data.session);
      setChecking(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      if (session) onLoggedIn();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [onLoggedIn]);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return isAuthed ? <>{childrenWhenAuthed}</> : <AuthStack />;
}

/* ---------------- Root App ---------------- */
export default function App() {
  const [loaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_700Bold,
  });
  const [currentRoute, setCurrentRoute] = useState<keyof RootStackParamList | string>('Home');
  const navRef = useNavigationContainerRef<RootStackParamList>();

  const onLoggedIn = () => {};
  useSupabaseLinking(onLoggedIn);

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: COLORS.bg,
        card: COLORS.bg,
        text: COLORS.text,
        border: 'transparent',
        primary: COLORS.text,
      },
    }),
    []
  );

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const navTo = (route: keyof RootStackParamList) => navRef.current?.navigate(route);

  return (
    <SafeAreaProvider>
      <MenuProvider>
        <NavigationContainer
          ref={navRef}
          theme={navTheme}
          onReady={() => setCurrentRoute(navRef.getCurrentRoute()?.name ?? 'Home')}
          onStateChange={() => setCurrentRoute(navRef.getCurrentRoute()?.name ?? 'Home')}
        >
          <StatusBar style="light" translucent={false} />

          <AuthGate
            onLoggedIn={onLoggedIn}
            childrenWhenAuthed={
              <>
                <AppStack />
                <BottomStatBar
                  active={currentRoute}
                  onHome={() => navTo('Home')}
                  onCalendar={() => navTo('Calendar')}
                  onTasks={() => navTo('Tasks')}
                />
                <MoreMenuOverlay navTo={navTo} />
              </>
            }
          />
        </NavigationContainer>
      </MenuProvider>
    </SafeAreaProvider>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  menuCardBase: {
    position: 'absolute',
    minWidth: 230,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuRowText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
  },
  statBar: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statBarItem: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
});
