import React from 'react';
import { Image, Text, View } from 'react-native';
import Screen from '../components/Screens';
import { COLORS } from '../theme';

export default function Profile() {
  return (
    <Screen topGutter={24}>
      <Image
        source={{ uri: 'https://i.pravatar.cc/200?img=5' }}
        style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 16 }}
      />
      <Text style={{
        color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 40, lineHeight: 44,
        marginBottom: 8
      }}>
        Your Profile
      </Text>
      <Text style={{
        color: COLORS.textMuted, fontFamily: 'Montserrat_400Regular', fontSize: 16
      }}>
        Hook this screen to Supabase user metadata later.
      </Text>
    </Screen>
  );
}
