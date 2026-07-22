import AsyncStorage from '@react-native-async-storage/async-storage';

// === Types ===
export type User = {
  id: string | number | null;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  token?: string;
};

export type ProfileUpdateData = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  password?: string;
  current_password?: string;
};

export type ApiResponse = {
  success: boolean;
  message?: string;
  user?: Record<string, any>;
};

// === Storage Keys ===
const STORAGE_KEYS = {
  USER: 'lemascotte_user',
  API_HOST: 'lemascotte_api_host',
} as const;

// === API Helpers ===
const XAMPP_PROJECT_PATH = 'Mocap%20Le%20Mascotte.V4.2.0';
const CANDIDATE_HOSTS = ['localhost', '192.168.1.93', '192.168.101.16', '172.30.4.104', '172.30.5.119', '10.0.2.2'];

const getApiUrlFromHost = (host: string) =>
  `http://${host}/${XAMPP_PROJECT_PATH}/models/ajax_lemascotte.php`;

async function fetchWithTimeout(url: string, opts: any = {}, timeout = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function tryFetchOnce(host: string, payload: any) {
  const url = getApiUrlFromHost(host);
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      },
      8000,
    );
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (ct.includes('application/json')) {
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, message: 'JSON parse error: ' + text.substring(0, 200) };
      }
    }
    return { success: false, message: text || `HTTP ${res.status}` };
  } catch {
    return null;
  }
}

async function apiCall(payload: any): Promise<ApiResponse> {
  const storedHost = await AsyncStorage.getItem(STORAGE_KEYS.API_HOST);
  const triedHosts: string[] = [];
  if (storedHost) triedHosts.push(storedHost);
  for (const h of CANDIDATE_HOSTS) {
    if (!triedHosts.includes(h)) triedHosts.push(h);
  }
  for (const host of triedHosts) {
    const result = await tryFetchOnce(host, payload);
    if (result !== null) {
      await AsyncStorage.setItem(STORAGE_KEYS.API_HOST, host);
      return result as ApiResponse;
    }
  }
  return { success: false, message: 'No se pudo conectar con el servidor.' };
}

// === User Normalization ===
export function normalizeUser(rawUser: Record<string, any> | undefined | null): User | null {
  if (!rawUser) return null;
  return {
    id: rawUser.id_usuario || rawUser.id || null,
    name: rawUser.nombre_usuario || rawUser.name || '',
    email: rawUser.correo_usuario || rawUser.email || '',
    role: rawUser.rol_usuario || rawUser.role || '',
    phone: rawUser.telefono_usuario || rawUser.phone || '',
    address: rawUser.direccion_usuario || rawUser.address || '',
    token: rawUser.token || rawUser.token_sesion || '',
  };
}

// === Session Management ===
export async function saveUserSession(user: User): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('[AuthService] Error saving user session:', error);
  }
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      return JSON.parse(stored) as User;
    }
    return null;
  } catch (error) {
    console.error('[AuthService] Error reading stored user:', error);
    return null;
  }
}

export async function clearUserSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('[AuthService] Error clearing user session:', error);
  }
}

// === Logout ===
export async function handleLogout(
  setCurrentUser: (user: User | null) => void,
  // Using any to accept both expo-router and generic router types
  router: { push: (path: any) => void },
  showToast?: (message: string) => void,
): Promise<void> {
  try {
    // Clear stored session
    await clearUserSession();

    // Clear React state
    setCurrentUser(null);

    // Show confirmation
    if (showToast) {
      showToast('Sesión cerrada. ¡Hasta pronto!');
    }

    // Redirect to login/home
    setTimeout(() => {
      router.push('/');
    }, 300);
  } catch (error) {
    console.error('[AuthService] Error during logout:', error);
    // Force clear even if something fails
    setCurrentUser(null);
    router.push('/');
  }
}

// === Profile Management ===
export async function updateUserProfile(
  userId: string | number | null,
  data: ProfileUpdateData,
): Promise<ApiResponse> {
  if (!userId) {
    return { success: false, message: 'Usuario no autenticado.' };
  }

  const payload: Record<string, any> = {
    action: 'update_profile',
    user_id: String(userId),
  };

  if (data.name !== undefined) payload.name = data.name;
  if (data.email !== undefined) payload.email = data.email;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.address !== undefined) payload.address = data.address;
  if (data.password !== undefined && data.password.length > 0) {
    payload.password = data.password;
    if (data.current_password !== undefined) {
      payload.current_password = data.current_password;
    }
  }

  return await apiCall(payload);
}

export async function getCurrentUserFromServer(userId: string | number | null): Promise<User | null> {
  if (!userId) return null;
  const resp = await apiCall({
    action: 'session',
    user_id: String(userId),
  });
  if (resp.success && resp.user) {
    return normalizeUser(resp.user);
  }
  return null;
}

// === Validation Helpers ===
export function validateProfileField(
  field: 'name' | 'email' | 'phone' | 'address' | 'password' | 'current_password',
  value: string,
): string {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'El nombre no puede estar vacío';
      if (!/^[\p{L} ]+$/u.test(value.trim())) return 'Solo se permiten letras y espacios';
      return '';

    case 'email':
      if (!value.trim()) return 'El correo no puede estar vacío';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Correo inválido';
      return '';

    case 'phone':
      if (!value.trim()) return ''; // Phone is optional
      const digits = value.replace(/\D/g, '');
      if (digits.length > 0 && digits.length !== 10) return 'Debe tener exactamente 10 dígitos';
      return '';

    case 'address':
      return ''; // Address is optional, no strict validation

    case 'password':
      if (value.length > 0 && value.length < 6) return 'Debe tener al menos 6 caracteres';
      return '';

    case 'current_password':
      if (value.length > 0 && value.length < 6) return 'Debe tener al menos 6 caracteres';
      return '';

    default:
      return '';
  }
}