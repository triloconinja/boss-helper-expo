import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      initialRouteName="login"
      screenOptions={{ headerShown: false }}
    />
  );
}
