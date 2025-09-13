import { supabase } from '@/lib/supabaseClient';

export type Profile = {
  nick: string;
  postal_code: string;
};

// Cache promises per user to avoid multiple prompts when ensureProfile
// is invoked concurrently from different components.
const profilePromises: Record<string, Promise<Profile>> = {};

export async function ensureProfile(userId: string): Promise<Profile> {
  if (!profilePromises[userId]) {
    profilePromises[userId] = (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nick, postal_code')
        .eq('id', userId)
        .single();

      let nick = (data?.nick as string) || '';
      let postal_code = (data?.postal_code as string) || '';

      if (!nick) {
        nick = window.prompt('Podaj nick:') || '';
      }

      if (!postal_code) {
        postal_code = window.prompt('Podaj kod pocztowy:') || '';
      }

      await supabase.from('profiles').upsert({
        id: userId,
        nick,
        postal_code,
      });

      return { nick, postal_code };
    })();
  }

  return profilePromises[userId];
}
