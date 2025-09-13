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

      if (!nick || !postal_code) {
        const profile = await promptProfile({ nick, postal_code });
        nick = profile.nick;
        postal_code = profile.postal_code;
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

function promptProfile(defaults: Profile): Promise<Profile> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');

    dialog.innerHTML = `
      <form method="dialog" style="display:flex; flex-direction:column; gap:8px;">
        <label>
          Nick:
          <input name="nick" value="${defaults.nick}" />
        </label>
        <label>
          Kod pocztowy:
          <input name="postal_code" value="${defaults.postal_code}" />
        </label>
        <menu style="display:flex; gap:8px; justify-content:flex-end;">
          <button value="cancel">Anuluj</button>
          <button value="default">OK</button>
        </menu>
      </form>
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener('close', () => {
      const form = dialog.querySelector('form')!;
      const nickInput = form.querySelector('input[name="nick"]') as HTMLInputElement;
      const postalInput = form.querySelector('input[name="postal_code"]') as HTMLInputElement;
      const profile = { nick: nickInput.value, postal_code: postalInput.value };
      dialog.remove();
      resolve(profile);
    });

    dialog.showModal();
  });
}
