
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../supabase';

export default function AuthLinkHandler(){
  useEffect(()=>{
    const handle = async (url: string) => {
      try{
        if (url.includes('access_token') || url.includes('refresh_token')) {
          await supabase.auth.getSessionFromUrl({ storeSession: true, url });
          return;
        }
        if (url.includes('code=')) {
          await supabase.auth.exchangeCodeForSession(url);
        }
      }catch(e){
        console.warn('Auth callback error', e);
      }
    };
    Linking.getInitialURL().then(u => u && handle(u));
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  },[]);
  return null;
}
