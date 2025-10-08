import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabase'; // or '../supabase' based on your setup

export default function AuthLinkHandler() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Cold start: app opened from a magic link / OAuth redirect
    Linking.getInitialURL().then(async (url) => {
      if (url) {
        try {
          await supabase.auth.exchangeCodeForSession({ currentUrl: url });
        } catch (e) {
          // ignore – Supabase throws if url isn't an auth redirect
        }
      }
    });

    // Warm start: app already open when the link is tapped
    const sub = Linking.addEventListener('url', async ({ url }) => {
      try {
        await supabase.auth.exchangeCodeForSession({ currentUrl: url });
      } catch {
        // ignore non-auth URLs
      }
    });

    // Auth state → navigate when signed in
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // go to your protected screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    });

    return () => {
      sub.remove();
      auth.subscription.unsubscribe();
    };
  }, [navigation]);

  return null;
}
