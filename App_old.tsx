// App_old.tsx
import React, { useMemo, useState, createContext, useContext } from 'react';
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
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from './src/theme';
import Dashboard from './src/screens/Dashboard';
import CalendarView from './src/screens/CalendarView';
import Tasks from './src/screens/Tasks';
import Profile from './src/screens/Profile';
import Households from './src/screens/Households';
import Grocery from './src/screens/Grocery';
import Activities from './src/screens/Activities';
import AuthLinkHandler from './src/utils/AuthLinkHandler';
import Login from './src/screens/Login';

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

const Stack = createNativeStackNavigator<RootStackParamList>();

/* ---------------- More Menu Context ---------------- */
const MenuCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});
function useMenu() {
  return useContext(MenuCtx);
}

/* ---------------- Top-right Pop Menu (PRESET B: Dark) ---------------- */
function MoreMenuOverlay({
  navTo,
}: {
  navTo: (route: keyof RootStackParamList) => void;
}) {
  const { open, setOpen } = useMenu();
  const insets = useSafeAreaInsets();
  if (!open) return null;

  const go = (route: keyof RootStackParamList) => {
    setOpen(false);
    navTo(route);
  };

  // Preset B (dark) theme
  const theme = {
    cardBg: '#22262B',
    border: 'rgba(255,255,255,0.15)',
    divider: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
    shadowColor: '#000',
  };

  return (
    <Pressable onPress={() => setOpen(false)} style={styles.menuBackdrop}>
      <View
        style={[
          styles.menuCardBase,
          {
            top: insets.top + 10,
            right: 20, // align with 20px page/card margin
            backgroundColor: theme.cardBg,
            borderColor: theme.border,
            shadowColor: theme.shadowColor,
          },
        ]}
      >
        {[
          { label: 'Grocery', icon: 'cart-outline', route: 'Grocery' as const },
          { label: 'Households', icon: 'business-outline', route: 'Households' as const },
          { label: 'Activities', icon: 'time-outline', route: 'Activities' as const },
          { label: 'Profile', icon: 'person-outline', route: 'Profile' as const },
          { label: 'Login', icon: 'log-in-outline', route: 'Login' as const },
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
      </View>
    </Pressable>
  );
}

/* ---------------- Fixed Bottom "StatCard" Bar ---------------- */
function BottomStatBar({
  active,
  onHome,
  onCalendar,
  onTasks,
  onMore,
}: {
  active: keyof RootStackParamList | string;
  onHome: () => void;
  onCalendar: () => void;
  onTasks: () => void;
  onMore: () => void;
}) {
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

      {/* More = bell icon triggers popup */}
      <Pressable style={styles.statBarItem} onPress={onMore}>
        <Ionicons name="notifications-outline" size={24} color={GRAY} />
      </Pressable>
    </View>
  );
}

/* ---------------- Root App ---------------- */
export default function App() {
  const [loaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_700Bold,
  });
  const [open, setOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<keyof RootStackParamList | string>('Home');

  const navRef = useNavigationContainerRef<RootStackParamList>();

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
  const handleMore = () => setOpen(true);

  return (
    <SafeAreaProvider>
      <MenuCtx.Provider value={{ open, setOpen }}>
        <NavigationContainer
          ref={navRef}
          theme={navTheme}
          onReady={() => setCurrentRoute(navRef.getCurrentRoute()?.name ?? 'Home')}
          onStateChange={() => setCurrentRoute(navRef.getCurrentRoute()?.name ?? 'Home')}
        >
          <StatusBar style="light" translucent={false} />
          <AuthLinkHandler />

          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={Dashboard} />
            <Stack.Screen name="Calendar" component={CalendarView} />
            <Stack.Screen name="Tasks" component={Tasks} />
            {/* deep pages opened from More */}
            <Stack.Screen name="Grocery" component={Grocery} />
            <Stack.Screen name="Households" component={Households} />
            <Stack.Screen name="Activities" component={Activities} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="Login" component={Login} />
          </Stack.Navigator>

          {/* Fixed bottom bar (same width as cards), icons only */}
          <BottomStatBar
            active={currentRoute}
            onHome={() => navTo('Home')}
            onCalendar={() => navTo('Calendar')}
            onTasks={() => navTo('Tasks')}
            onMore={handleMore}
          />

          {/* Top-right pop menu */}
          <MoreMenuOverlay navTo={navTo} />
        </NavigationContainer>
      </MenuCtx.Provider>
    </SafeAreaProvider>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  // Popup overlay + card (Dark preset)
  menuBackdrop: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
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

  // Bottom "stat card" bar
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
