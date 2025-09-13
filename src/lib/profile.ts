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
      const storageKey = `profile_${userId}`;
      let nick = '';
      let postal_code = '';

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Partial<Profile>;
            nick = parsed.nick ?? '';
            postal_code = parsed.postal_code ?? '';
          } catch {
            /* ignore */
          }
        }
      }

      if (!nick || !postal_code) {
        const { data } = await supabase
          .from('profiles')
          .select('nick, postal_code')
          .eq('id', userId)
          .single();
        nick = (data?.nick as string) || nick;
        postal_code = (data?.postal_code as string) || postal_code;
      }

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

      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify({ nick, postal_code }));
      }

      return { nick, postal_code };
    })();
  }

  return profilePromises[userId];
}

function promptProfile(defaults: Profile): Promise<Profile> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.style.padding = '24px';
    dialog.style.borderRadius = '8px';
    dialog.style.border = '1px solid #ddd';
    dialog.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';

    dialog.innerHTML = `
      <form method="dialog" style="display:flex; flex-direction:column; gap:12px; min-width:260px;">
        <label style="display:flex; flex-direction:column; gap:4px;">
          Nick:
          <input name="nick" value="${defaults.nick}" style="padding:8px; border:1px solid #ccc; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; gap:4px;">
          Kod pocztowy:
          <input name="postal_code" value="${defaults.postal_code}" style="padding:8px; border:1px solid #ccc; border-radius:4px;" />
        </label>
        <menu style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
          <button value="cancel" style="padding:8px 12px; border:1px solid #ccc; border-radius:4px; background:white;">Anuluj</button>
          <button value="default" style="padding:8px 12px; border-radius:4px; background:#0070f3; color:white;">OK</button>
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
