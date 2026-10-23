import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistSession } from './afterAuth';

export interface SavedAccount {
  id: string | number;
  email: string;
  name: string;
  token: string;
  memberId?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
}

const STORAGE_KEY = 'saved_user_accounts';

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveAccount(acc: SavedAccount): Promise<void> {
  try {
    const existing = await getSavedAccounts();
    const filtered = existing.filter(
      (a) => String(a.id) !== String(acc.id) && a.email.toLowerCase() !== acc.email.toLowerCase()
    );
    filtered.unshift(acc);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.log('Failed to save account:', e);
  }
}

export async function removeAccount(idOrEmail: string | number): Promise<void> {
  try {
    const existing = await getSavedAccounts();
    const filtered = existing.filter(
      (a) => String(a.id) !== String(idOrEmail) && a.email.toLowerCase() !== String(idOrEmail).toLowerCase()
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.log('Failed to remove account:', e);
  }
}

export async function switchActiveAccount(acc: SavedAccount): Promise<void> {
  await persistSession({ token: acc.token });
  await AsyncStorage.setItem('user_email', acc.email);
  await AsyncStorage.removeItem('cached_feed_profiles');
  await AsyncStorage.removeItem('cached_suggested_profiles');
}
