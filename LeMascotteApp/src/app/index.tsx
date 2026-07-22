import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InputValidado from '../components/InputValidado';
import EditProfileForm from '../components/EditProfileForm';
import UserHeader from '../components/UserHeader';
import AddressPicker from '../components/AddressPicker';
import type { AddressPickerErrors } from '../components/AddressPicker';
import { saveUserSession, handleLogout, getStoredUser, User as AuthUser } from '../../utils/AuthService';
import { validateEmail, validatePassword, validatePasswordMatch, validateOnlyLetters, validatePhoneCo, validateRequired, validateCedula, validateNumeric } from '../../utils/Validators';
import type { ValidationResult } from '../components/InputValidado';

type Product = {
  id: string | number;
  name: string;
  category: string;
  price: number;
  badge?: string;
  desc?: string;
  img?: string;
  status?: string;
  stock?: number;
};

type CartItem = Product & {
  qty: number;
};

type User = {
  id: string | number | null;
  name: string;
  email: string;
  role: string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  user?: {
    id_usuario?: string | number;
    id?: string | number;
    nombre_usuario?: string;
    name?: string;
    correo_usuario?: string;
    email?: string;
    rol_usuario?: string;
    role?: string;
  };
};

type AuthFieldErrors = Partial<
  Record<
    | 'loginEmail'
    | 'loginPassword'
    | 'regName'
    | 'regLastname'
    | 'regEmail'
    | 'regPassword'
    | 'regPassword2'
    | 'regPhone',
    string
  >
>;

type CheckoutFieldErrors = Partial<
  Record<
    'cedula' | 'forma_pago' | 'codigo_pago' | 'tipo_via' | 'numero_via' | 'letra_via' | 'numero_placa' | 'letra_placa' | 'localidad' | 'complemento',
    string
  >
>;

const colors = {
  cream: '#fcfafb',
  brown: '#6b124f',
  gold: '#ffd44d',
  fuchsia: '#8d1c69',
  ink: '#2c2c2c',
  muted: '#77717a',
  softPink: '#fdeef7',
  white: '#ffffff',
  border: '#f0dcea',
  danger: '#e74c3c',
  green: '#2d6a4f',
};

const heroImage =
  'https://www.purina.com.ar/sites/default/files/2025-08/Banner_1590x700px-100.jpg';

const placeholderImage =
  'https://placehold.co/400x300/fdeef7/6b124f?text=Le+Mascotte';

const categories = [
  { label: 'Inicio', value: '', emoji: '🏠' },
  { label: 'Perros', value: 'Perros', emoji: '🐶' },
  { label: 'Gatos', value: 'Gatos', emoji: '🐱' },
  { label: 'Peces y Acuarios', value: 'Peces', emoji: '🐠' },
  { label: 'Aves', value: 'Aves', emoji: '🐦' },
  { label: 'Pequeñas Mascotas', value: 'Pequeñas Mascotas', emoji: '🐹' },
  { label: 'Salud y Veterinaria', value: 'Salud', emoji: '💊' },
  { label: 'Higiene y Cuidado', value: 'Higiene', emoji: '🧼' },
  { label: 'Ofertas', value: 'Ofertas', emoji: '🎁' },
];

const categoryTiles = [
  ...categories.slice(1),
  { label: 'Ver todo', value: '', emoji: '✨' },
];

const money = (value: number) => `$${value.toLocaleString('es-CO')}`;

const XAMPP_HOST = '172.30.5.119'; // Tu IP local (Wi-Fi)
const XAMPP_PROJECT_PATH = 'Mocap%20Le%20Mascotte.V4.2.0';

const getApiUrl = () => {
  return `http://${XAMPP_HOST}/${XAMPP_PROJECT_PATH}/models/ajax_lemascotte.php`;
};

const apiUrl = getApiUrl();

const formasPago = [
  'Efectivo',
  'Tarjeta Débito',
  'Tarjeta Crédito',
  'Nequi',
  'Daviplata',
  'Bancolombia',
  'Transferencia Bancaria',
];

const localidadesBogota = [
  'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme',
  'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá',
  'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño',
  'Puente Aranda', 'Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar',
];

function normalizeUser(user?: ApiResponse['user']): User | null {
  if (!user) return null;

  return {
    id: user.id_usuario || user.id || null,
    name: user.nombre_usuario || user.name || '',
    email: user.correo_usuario || user.email || '',
    role: user.rol_usuario || user.role || '',
  };
}

function getNormalizedRole(role: string | undefined): 'admin' | 'empleado' | 'cliente' | '' {
  if (!role) return '';
  const normalized = role.trim().toLowerCase();
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('emplead') || normalized.includes('employee')) return 'empleado';
  if (normalized.includes('user') || normalized.includes('cliente')) return 'cliente';
  return '';
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<(string | number)[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regLastname, setRegLastname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [toast, setToast] = useState('');
  const [authErrors, setAuthErrors] = useState<AuthFieldErrors>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
  const [selectedMyOrder, setSelectedMyOrder] = useState<any>(null);
  const [myOrderDetailOpen, setMyOrderDetailOpen] = useState(false);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [editingProducts, setEditingProducts] = useState<any[]>([]);
  const [editOrderLoading, setEditOrderLoading] = useState(false);

  // === PROFILE & LOGOUT STATE ===
  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load stored user on mount
  useEffect(() => {
    (async () => {
      const stored = await getStoredUser();
      if (stored) {
        setProfileUser(stored);
      }
    })();
  }, []);

  // Checkout form fields
  const [chkCedula, setChkCedula] = useState('');
  const [chkFormaPago, setChkFormaPago] = useState('');
  const [chkTipoVia, setChkTipoVia] = useState('');
  const [chkNumeroVia, setChkNumeroVia] = useState('');
  const [chkLetraVia, setChkLetraVia] = useState('');
  const [chkNumeroPlaca, setChkNumeroPlaca] = useState('');
  const [chkLetraPlaca, setChkLetraPlaca] = useState('');
  const [chkLocalidad, setChkLocalidad] = useState('');
  const [chkComplemento, setChkComplemento] = useState('');
  const [chkCodigoPago, setChkCodigoPago] = useState('');
  const [checkoutErrors, setCheckoutErrors] = useState<CheckoutFieldErrors>({});
  const [showFormasPago, setShowFormasPago] = useState(false);
  const [showLocalidades, setShowLocalidades] = useState(false);

  const availableProducts = useMemo(() => {
    return products.filter(
      (product) =>
        (product.status?.toLowerCase() === 'disponible' || product.stock && product.stock > 0) &&
        product.price > 0,
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return availableProducts.filter((product) => {
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        (product.desc || '').toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory, availableProducts]);

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.qty, 0);
  const sectionTitle = selectedCategory ? selectedCategory : 'Productos Destacados';
  const isWide = width >= 720;

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  }

  function clearAuthError(field: keyof AuthFieldErrors) {
    setAuthErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function clearCheckoutError(field: keyof CheckoutFieldErrors) {
    setCheckoutErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function renderFieldError(message?: string) {
    return message ? <Text style={styles.inputErrorText}>{message}</Text> : null;
  }

  function renderToast() {
    if (!toast) return null;
    return (
      <View style={styles.toast} pointerEvents="none">
        <Text style={styles.toastText}>{toast}</Text>
      </View>
    );
  }

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_dashboard_products' }),
        credentials: 'include',
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = JSON.parse(text) as { success: boolean; products?: Product[]; message?: string };
      if (!data.success || !Array.isArray(data.products)) {
        throw new Error(data.message || 'No se pudo cargar la lista de productos');
      }
      setProducts(data.products);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error cargando productos');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Auto-refresh each 8 seconds to sync with admin/empleado changes
  useEffect(() => {
    const interval = setInterval(() => {
      void loadProducts();
    }, 8000);
    return () => clearInterval(interval);
  }, [loadProducts]);

  function openAuth(mode: 'login' | 'register' = 'login') {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function validateEmailProvider(email: string) {
    const emailBasic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailBasic.test(email)) return 'Correo inválido';

    const allowedProviders = ['gmail', 'hotmail', 'outlook', 'yahoo', 'live'];
    const domainBase = (email.split('@')[1] || '').split('.')[0].toLowerCase();
    if (!allowedProviders.includes(domainBase)) {
      return 'Usa gmail, hotmail, outlook, yahoo o live';
    }

    return '';
  }

  async function postAuth(data: Record<string, string>) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    const rawResponse = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${rawResponse.slice(0, 120)}`);
    }

    try {
      return JSON.parse(rawResponse) as ApiResponse;
    } catch {
      throw new Error(`Respuesta inválida del servidor: ${rawResponse.slice(0, 120)}`);
    }
  }

  async function handleLogin() {
    const email = loginEmail.trim();
    const errors: AuthFieldErrors = {};

    if (!email) errors.loginEmail = 'Ingresa tu correo';
    if (!loginPassword) errors.loginPassword = 'Ingresa tu contraseña';

    if (email && validateEmailProvider(email)) {
      errors.loginEmail = validateEmailProvider(email);
    }

    if (Object.keys(errors).length > 0) {
      setAuthErrors(errors);
      showToast('Revisa los campos marcados');
      return;
    }

    try {
      setAuthLoading(true);
      const response = await postAuth({
        action: 'login',
        email,
        password: loginPassword,
      });

      if (!response.success) {
        showToast(response.message || 'Credenciales incorrectas');
        return;
      }

      const user = normalizeUser(response.user);
      setCurrentUser(user);
      setProfileUser(user);
      if (user) await saveUserSession(user);
      setAuthOpen(false);
      showToast(`¡Bienvenido, ${user?.name || 'usuario'}!`);

      // Redirigir según el rol
      const routeRole = getNormalizedRole(user?.role);
      if (routeRole === 'admin') {
        router.push('/admin');
      } else if (routeRole === 'empleado') {
        router.push('/empleado');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo conectar con XAMPP');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister() {
    const name = regName.trim();
    const last = regLastname.trim();
    const email = regEmail.trim();
    const phoneDigits = regPhone.replace(/\D/g, '');
    const nameRegex = /^[\p{L} ]+$/u;
    const errors: AuthFieldErrors = {};

    if (!name) errors.regName = 'Ingresa tu nombre';
    if (!last) errors.regLastname = 'Ingresa tu apellido';
    if (!email) errors.regEmail = 'Ingresa tu correo';
    if (!regPassword) errors.regPassword = 'Ingresa una contraseña';
    if (!regPassword2) errors.regPassword2 = 'Confirma tu contraseña';
    if (!phoneDigits) errors.regPhone = 'Ingresa tu teléfono';

    if (name && !nameRegex.test(name)) errors.regName = 'Solo se permiten letras';
    if (last && !nameRegex.test(last)) errors.regLastname = 'Solo se permiten letras';

    const emailError = validateEmailProvider(email);
    if (email && emailError) errors.regEmail = emailError;

    if (phoneDigits && !/^[0-9]{10}$/.test(phoneDigits)) {
      errors.regPhone = 'Debe tener exactamente 10 dígitos';
    }

    if (regPassword && regPassword.length < 6) {
      errors.regPassword = 'Debe tener al menos 6 caracteres';
    }

    if (regPassword && regPassword2 && regPassword !== regPassword2) {
      errors.regPassword2 = 'Las contraseñas no coinciden';
    }

    if (Object.keys(errors).length > 0) {
      setAuthErrors(errors);
      showToast('Revisa los campos marcados');
      return;
    }

    try {
      setAuthLoading(true);
      const response = await postAuth({
        action: 'register',
        name,
        last,
        email,
        password: regPassword,
        phone: phoneDigits,
      });

      if (!response.success) {
        showToast(response.message || 'No fue posible crear la cuenta');
        return;
      }

      const user = normalizeUser(response.user);
      setCurrentUser(user);
      setAuthOpen(false);
      showToast(`¡Bienvenido, ${name}!`);

      // Redirigir según el rol
      const routeRole = getNormalizedRole(user?.role);
      if (routeRole === 'admin') {
        router.push('/admin');
      } else if (routeRole === 'empleado') {
        router.push('/empleado');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo conectar con XAMPP');
    } finally {
      setAuthLoading(false);
    }
  }

  // --- Sincronización con BD: carrito y wishlist ---
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function syncCartToBD(cartItems: CartItem[]) {
    if (!currentUser) return;
    const items = cartItems.map((item) => ({ product_id: String(item.id), qty: item.qty }));
    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'user_sync_cart',
          user_id: currentUser?.id || '',
          items: JSON.stringify(items),
        }),
        credentials: 'include',
      });
    } catch {}
  }

  async function syncWishlistToBD(wishlistIds: (string | number)[]) {
    if (!currentUser) return;
    const items = wishlistIds.map((id) => String(id));
    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'user_sync_wishlist',
          user_id: currentUser?.id || '',
          items: JSON.stringify(items),
        }),
        credentials: 'include',
      });
    } catch {}
  }

  // Auto-sync cart & wishlist to BD when they change (debounced)
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncCartToBD(cart);
    }, 1500);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [cart, currentUser]);

  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncWishlistToBD(wishlist);
    }, 1500);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [wishlist, currentUser]);

  async function addToCart(product: Product) {
    // Update local state immediately for responsiveness
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...current, { ...product, qty: 1 }];
    });
    showToast(`${product.name} añadido al carrito`);

    // Send to server immediately so activity is logged in real-time
    if (currentUser) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'user_add_to_cart',
            user_id: currentUser?.id || '',
            product_id: String(product.id),
            qty: 1,
          }),
        });
      } catch {
        // Silent fail - sync fallback will handle it
      }
    }
  }

  async function removeFromCartSync(productId: string | number) {
    if (currentUser) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'user_remove_from_cart',
            user_id: currentUser?.id || '',
            product_id: String(productId),
          }),
        });
      } catch {}
    }
  }

  function changeQty(id: string | number, delta: number) {
    setCart((current) => {
      const updated = current
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0);
      // If item was removed (qty hit 0), sync removal to server
      const wasRemoved = current.find((item) => item.id === id && item.qty + delta <= 0);
      if (wasRemoved) {
        void removeFromCartSync(id);
      }
      return updated;
    });
  }

  async function toggleWishlist(product: Product) {
    const isAdding = !wishlist.includes(product.id);
    // Update local state immediately
    setWishlist((current) => {
      if (current.includes(product.id)) {
        showToast(`${product.name} salió de favoritos`);
        return current.filter((id) => id !== product.id);
      }
      showToast(`${product.name} añadido a favoritos`);
      return [...current, product.id];
    });

    // Send to server immediately so activity is logged in real-time
    if (currentUser) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'user_toggle_wishlist',
            user_id: currentUser?.id || '',
            product_id: String(product.id),
            add: isAdding ? 'true' : 'false',
          }),
        });
      } catch {
        // Silent fail - sync fallback will handle it
      }
    }
  }

  async function loadMyOrders() {
    if (!currentUser) return;
    setMyOrdersLoading(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'user_get_orders',
          user_id: currentUser?.id || '',
        }),
      });
      const text = await response.text();
      const data = JSON.parse(text) as { success: boolean; orders?: any[]; message?: string };
      if (data.success && Array.isArray(data.orders)) {
        setMyOrders(data.orders);
      }
    } catch {}
    setMyOrdersLoading(false);
  }

  async function updateMyOrderStatus(orderId: string, newStatus: string) {
    if (!currentUser) return;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'user_update_order_status',
          user_id: currentUser?.id || '',
          id: orderId,
          status: newStatus,
        }),
      });
      const text = await response.text();
      const data = JSON.parse(text) as { success: boolean; message?: string };
      if (data.success) {
        showToast(`Pedido ${orderId} actualizado a: ${newStatus}`);
        await loadMyOrders();
        if (selectedMyOrder && selectedMyOrder.id === orderId) {
          setSelectedMyOrder({ ...selectedMyOrder, status: newStatus });
        }
      } else {
        showToast(data.message || 'Error actualizando estado');
      }
    } catch {
      showToast('Error de conexión');
    }
  }

  function openMyOrderDetail(order: any) {
    setSelectedMyOrder(order);
    setMyOrderDetailOpen(true);
  }

function openEditOrderModal(order: any) {
    setSelectedMyOrder(order);
    // Inicializar productos de edición con los productos actuales del pedido
    // Productos vienen de getOrdersByUser con keys: product_id, qty, unit_price, product_name
    setEditingProducts(order.products ? [...order.products] : []);
    setEditOrderOpen(true);
  }

  function updateEditingProductQty(index: number, delta: number) {
    setEditingProducts((current) => {
      const updated = current.map((prod, idx) => {
        if (idx === index) {
          const newQty = Math.max(1, prod.qty + delta);
          return { ...prod, qty: newQty };
        }
        return prod;
      });
      return updated;
    });
  }

  function removeEditingProduct(index: number) {
    setEditingProducts((current) => current.filter((_, idx) => idx !== index));
  }

  // Estado de carga para cancelar pedido
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  async function handleCancelOrder(orderId: string) {
    if (!currentUser || !currentUser.id) {
      showToast('Debes iniciar sesión');
      return;
    }

    if (cancellingOrderId === orderId) return; // Evitar doble clic

    // Usar confirm de navegador web (más confiable que Alert.alert en web)
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('¿Estás seguro de que deseas cancelar este pedido?')
      : true;

    if (!confirmed) return;

    setCancellingOrderId(orderId);
    setEditOrderLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Intentar con la IP y con localhost
      const hosts = [XAMPP_HOST, 'localhost'];
      let response = null;

      for (const host of hosts) {
        try {
          const url = `http://${host}/${XAMPP_PROJECT_PATH}/models/ajax_lemascotte.php`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'cancel_order',
              pedido_id: orderId,
              user_id: String(currentUser.id)
            }),
            signal: controller.signal,
          });
          response = resp;
          break;
        } catch (e) {
          continue;
        }
      }

      clearTimeout(timeoutId);

      if (!response) {
        showToast('No se pudo conectar con el servidor');
        setCancellingOrderId(null);
        setEditOrderLoading(false);
        return;
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        showToast('❌ Error: Respuesta inválida del servidor');
        setCancellingOrderId(null);
        setEditOrderLoading(false);
        return;
      }

      if (data.success) {
        showToast('✅ Pedido cancelado exitosamente');
        setMyOrdersOpen(false);
        await loadMyOrders();
      } else {
        showToast(data.message || 'No se pudo cancelar el pedido');
      }
    } catch (error) {
      showToast('Error de conexión. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setCancellingOrderId(null);
      setEditOrderLoading(false);
    }
  }

  // Para agregar productos del catálogo al pedido durante edición
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [availableProductsForAdd, setAvailableProductsForAdd] = useState<Product[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState<string | number>('');
  const [selectedAddProductQty, setSelectedAddProductQty] = useState(1);

  function openAddProductModal() {
    // Filtrar los productos que ya están en el pedido
    const existingIds = editingProducts.map((p: any) => p.product_id || p.id);
    const available = products.filter(
      (p) => !existingIds.includes(p.id) && (p.status?.toLowerCase() === 'disponible' || (p.stock && p.stock > 0))
    );
    setAvailableProductsForAdd(available);
    setSelectedAddProductId('');
    setSelectedAddProductQty(1);
    setAddProductModalOpen(true);
  }

  function confirmAddProduct() {
    if (!selectedAddProductId) {
      showToast('Selecciona un producto');
      return;
    }
    const product = products.find((p) => p.id === selectedAddProductId);
    if (!product) return;
    
    setEditingProducts((current) => [
      ...current,
      {
        product_id: String(product.id),
        id: String(product.id),
        product_name: product.name,
        qty: selectedAddProductQty,
        unit_price: product.price,
        price: product.price,
      },
    ]);
    setAddProductModalOpen(false);
    showToast(`${product.name} agregado al pedido`);
  }

  async function handleEditOrder() {
    if (!currentUser || !currentUser.id) {
      showToast('Debes iniciar sesión');
      return;
    }

    if (!selectedMyOrder || editingProducts.length === 0) {
      showToast('El pedido debe tener al menos un producto');
      return;
    }

    setEditOrderLoading(true);

    // Crear controller con timeout para la petición
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const productos = editingProducts.map((prod) => ({
        id: prod.product_id || prod.id,
        qty: prod.qty,
        price: prod.unit_price || prod.price,
      }));

      // Intentar con localhost y con la IP directa
      const hosts = [XAMPP_HOST, 'localhost'];
      let response = null;
      let lastError = null;

      for (const host of hosts) {
        try {
          const url = `http://${host}/${XAMPP_PROJECT_PATH}/models/ajax_lemascotte.php`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'edit_order',
              pedido_id: selectedMyOrder.id,
              user_id: String(currentUser.id),
              productos: productos,
            }),
            signal: controller.signal,
          });
          response = resp;
          break; // Si funcionó, salir del loop
        } catch (e) {
          lastError = e;
          continue;
        }
      }

      clearTimeout(timeoutId);

      if (!response) {
        showToast('No se pudo conectar con el servidor');
        setEditOrderLoading(false);
        return;
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        showToast('Respuesta inválida del servidor');
        setEditOrderLoading(false);
        return;
      }

      if (data.success) {
        showToast('✅ Pedido actualizado exitosamente');
        setEditOrderOpen(false);
        await loadMyOrders();
      } else {
        showToast(data.message || 'No se pudo actualizar el pedido');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      showToast('Error de conexión. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setEditOrderLoading(false);
    }
  }

  function openCheckout() {
    if (!currentUser) {
      showToast('Debes iniciar sesión para comprar');
      return;
    }
    if (cart.length === 0) {
      showToast('El carrito está vacío');
      return;
    }
    setCheckoutErrors({});
    setChkCedula('');
    setChkFormaPago('');
    setChkTipoVia('');
    setChkNumeroVia('');
    setChkLetraVia('');
    setChkNumeroPlaca('');
    setChkLetraPlaca('');
    setChkLocalidad('');
    setChkComplemento('');
    setCheckoutOpen(true);
  }

  async function handleCheckout() {
    const errors: CheckoutFieldErrors = {};

    // Validación dinámica: si currentUser existe, omitir mensaje de "Inicie sesión"
    if (!currentUser) {
      showToast('Debes iniciar sesión para realizar una compra');
      return;
    }

    if (!chkCedula.trim()) errors.cedula = 'Ingresa tu cédula';
    if (!chkFormaPago) errors.forma_pago = 'Selecciona una forma de pago';
    if (!chkTipoVia.trim()) errors.tipo_via = 'Ingresa el tipo de vía';
    if (!chkNumeroVia.trim()) errors.numero_via = 'Ingresa el número de vía';
    if (!chkNumeroPlaca.trim()) errors.numero_placa = 'Ingresa el número de placa';
    if (!chkLocalidad) errors.localidad = 'Selecciona una localidad';

    // Validar código de pago si la forma lo requiere
    const necesitaCodigoPago = ['Tarjeta Débito', 'Tarjeta Crédito', 'Transferencia Bancaria', 'Nequi', 'Daviplata', 'Bancolombia'].includes(chkFormaPago);
    if (necesitaCodigoPago && !chkCodigoPago.trim()) {
      errors.codigo_pago = 'Ingresa el número o código de pago';
    }
    if (necesitaCodigoPago && chkCodigoPago.trim()) {
      if (chkFormaPago === 'Tarjeta Débito' || chkFormaPago === 'Tarjeta Crédito') {
        if (!/^\d{4}$/.test(chkCodigoPago.trim())) {
          errors.codigo_pago = 'Deben ser exactamente los últimos 4 dígitos';
        }
      } else {
        if (!/^\d{4,20}$/.test(chkCodigoPago.trim())) {
          errors.codigo_pago = 'Debe ser un código numérico de 4 a 20 dígitos';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setCheckoutErrors(errors);
      showToast('Revisa los campos marcados');
      return;
    }

    setCheckoutLoading(true);
    try {
      const productosPayload = cart.map((item) => ({
        id: item.id,
        qty: item.qty,
        price: item.price,
      }));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'checkout',
          user_id: currentUser?.id || '', // Pasar user_id explícitamente para autenticación
          cedula: chkCedula.trim(),
          forma_pago: chkFormaPago,
          tipo_via: chkTipoVia.trim(),
          numero_via: chkNumeroVia.trim(),
          letra_via: chkLetraVia.trim(),
          numero_placa: chkNumeroPlaca.trim(),
          letra_placa: chkLetraPlaca.trim(),
          localidad: chkLocalidad,
          complemento: chkComplemento.trim(),
          total: cartTotal,
          productos: JSON.stringify(productosPayload),
        }),
      });

      const text = await response.text();
      const data = JSON.parse(text) as { success: boolean; message?: string; order_id?: string };

      if (!data.success) {
        showToast(data.message || 'Error al procesar la compra');
        return;
      }

      // Clear cart and close
      setCart([]);
      setCheckoutOpen(false);
      showToast(`¡Compra exitosa! Pedido #${data.order_id || ''}`);
      void loadProducts(); // Refresh stock
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.headerTop, isWide && styles.headerTopWide]}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logo}>
                Le <Text style={styles.logoAccent}>Mascotte</Text> <Text style={styles.logoPaw}>🐾</Text>
              </Text>
            </View>

            <View style={[styles.searchBar, isWide && styles.searchBarWide]}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar productos para tu mascota..."
                placeholderTextColor="#9a8d99"
                style={styles.searchInput}
              />
              <Pressable style={styles.searchButton}>
                <Text style={styles.searchButtonText}>🔎</Text>
              </Pressable>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton} onPress={() => setCartOpen(true)}>
                <Text style={styles.iconButtonText}>♡</Text>
                {wishlist.length > 0 && <Text style={styles.badge}>{wishlist.length}</Text>}
              </Pressable>
              <Pressable style={styles.iconButton} onPress={() => setCartOpen(true)}>
                <Text style={styles.iconButtonText}>🛒</Text>
                {cartCount > 0 && <Text style={styles.badge}>{cartCount}</Text>}
              </Pressable>
              {currentUser && (
                <Pressable style={styles.ordersButton} onPress={() => { loadMyOrders(); setMyOrdersOpen(true); }}>
                  <Text style={styles.ordersButtonText}>📋</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.authButton}
                onPress={() => {
                  if (currentUser) {
                    setCurrentUser(null);
                    showToast('Sesión cerrada. ¡Hasta pronto!');
                    return;
                  }
                  openAuth('login');
                }}>
                <Text style={styles.authButtonText}>
                  👤 {currentUser ? currentUser.name.split(' ')[0] : 'Ingresar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* User Header with profile edit and logout - Below header */}
        {profileUser && (
          <UserHeader
            userName={profileUser.name}
            userRole={profileUser.role}
            onEditProfile={() => setShowProfileModal(true)}
            onLogout={() => handleLogout(setProfileUser, router, showToast)}
            backgroundColor="#ffffff"
          />
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navList}
          contentContainerStyle={styles.navListContent}>
          {categories.map((category) => {
            const active = selectedCategory === category.value;
            return (
              <Pressable
                key={category.value || 'all'}
                style={[styles.navLink, active && styles.navLinkActive]}
                onPress={() => {
                  setSelectedCategory(category.value);
                  setQuery('');
                }}>
                <Text style={[styles.navText, isWide && styles.navTextWide]}>
                  {category.emoji} {category.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ImageBackground source={{ uri: heroImage }} style={styles.hero}>
          <View style={[styles.heroOverlay, isWide && styles.heroOverlayWide]}>
            <Text style={[styles.heroTitle, isWide && styles.heroTitleWide]}>
              Todo para tu mascota
            </Text>
            <Text style={[styles.heroText, isWide && styles.heroTextWide]}>
              Nutrición, accesorios y cuidado con amor
            </Text>
            <Pressable style={styles.heroButton} onPress={() => setSelectedCategory('Ofertas')}>
              <Text style={[styles.heroButtonText, isWide && styles.heroButtonTextWide]}>
                Ver Productos
              </Text>
            </Pressable>
          </View>
        </ImageBackground>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>Categorías</Text>
            <View style={styles.sectionRule} />
          </View>
          <View style={styles.categoryGrid}>
            {categoryTiles.map((category) => (
              <Pressable
                key={category.value}
                style={styles.categoryCard}
                onPress={() => {
                  setSelectedCategory(category.value);
                  setQuery('');
                }}>
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={styles.categoryTitle}>{category.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
              {sectionTitle}
            </Text>
            <View style={styles.sectionRule} />
          </View>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⌕</Text>
              <Text style={styles.emptyText}>No se encontraron productos</Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map((product) => (
                <View
                  key={product.id}
                  style={[styles.productCard, { width: isWide ? '48.5%' : '100%' }]}>
                  <View style={styles.productImageWrap}>
                    <Image source={{ uri: product.img || placeholderImage }} style={styles.productImage} />
                    <Pressable
                      style={[
                        styles.wishlistButton,
                        wishlist.includes(product.id) && styles.wishlistButtonActive,
                      ]}
                      onPress={() => toggleWishlist(product)}>
                      <Text
                        style={[
                          styles.wishlistButtonText,
                          wishlist.includes(product.id) && styles.wishlistButtonTextActive,
                        ]}>
                        ♥
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.productInfo}>
                    {!!product.badge && <Text style={styles.productBadge}>{product.badge}</Text>}
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.productDesc} numberOfLines={3}>
                      {product.desc}
                    </Text>
                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice}>{money(product.price)}</Text>
                      <Pressable style={styles.addButton} onPress={() => addToCart(product)}>
                        <Text style={styles.addButtonText}>Añadir</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.offerBanner}>
          <Text style={styles.offerTitle}>Envío gratis en tu primera compra</Text>
          <Text style={styles.offerText}>En pedidos mayores a $80.000</Text>
          <Pressable style={styles.offerButton} onPress={() => showToast('Código MASCOTTE aplicado')}>
            <Text style={styles.offerButtonText}>Usar código MASCOTTE</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Le Mascotte</Text>
          <Text style={styles.footerText}>
            Tu tienda de confianza para el cuidado y bienestar de tus mascotas.
          </Text>
          <Text style={styles.footerCopy}>© 2025 Le Mascotte. Todos los derechos reservados.</Text>
        </View>
      </ScrollView>

      {renderToast()}

      {/* Cart Modal */}
      <Modal visible={cartOpen} animationType="slide" transparent onRequestClose={() => setCartOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setCartOpen(false)} />
          {renderToast()}
          <View style={styles.cartSheet}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Carrito y favoritos</Text>
              <Pressable style={styles.closeButton} onPress={() => setCartOpen(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.cartBody}>
              {cart.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyIcon}>🛒</Text>
                  <Text style={styles.emptyText}>Tu carrito está vacío</Text>
                </View>
              ) : (
                cart.map((item) => (
                  <View key={item.id} style={styles.cartItem}>
                    <Image source={{ uri: item.img || placeholderImage }} style={styles.cartImage} />
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>{money(item.price * item.qty)}</Text>
                      <View style={styles.qtyRow}>
                        <Pressable style={styles.qtyButton} onPress={() => changeQty(item.id, -1)}>
                          <Text style={styles.qtyText}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyValue}>{item.qty}</Text>
                        <Pressable style={styles.qtyButton} onPress={() => changeQty(item.id, 1)}>
                          <Text style={styles.qtyText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}

              <View style={styles.wishlistSection}>
                <Text style={styles.wishlistTitle}>Favoritos ({wishlist.length})</Text>
                {wishlist.length === 0 ? (
                  <Text style={styles.wishlistEmpty}>No hay productos en favoritos</Text>
                ) : (
                  products
                    .filter((product) => wishlist.includes(product.id))
                    .map((product) => (
                      <View key={product.id} style={styles.favoriteItem}>
                        <Image source={{ uri: product.img || placeholderImage }} style={styles.favoriteImage} />
                        <View style={styles.favoriteInfo}>
                          <Text style={styles.favoriteName}>{product.name}</Text>
                          <Text style={styles.favoritePrice}>{money(product.price)}</Text>
                        </View>
                        <Pressable style={styles.favoriteBuy} onPress={() => addToCart(product)}>
                          <Text style={styles.favoriteBuyText}>Comprar</Text>
                        </Pressable>
                      </View>
                    ))
                )}
              </View>
            </ScrollView>

            <View style={styles.cartFooter}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{money(cartTotal)}</Text>
              </View>
              <Pressable
                style={[styles.checkoutButton, cart.length === 0 && styles.checkoutButtonDisabled]}
                disabled={cart.length === 0}
                onPress={() => {
                  setCartOpen(false);
                  setTimeout(() => openCheckout(), 400);
                }}>
                <Text style={styles.checkoutButtonText}>Proceder al pago</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal visible={checkoutOpen} animationType="slide" transparent onRequestClose={() => setCheckoutOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setCheckoutOpen(false)} />
          {renderToast()}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={{ flex: 1 }}
          >
          <ScrollView contentContainerStyle={styles.checkoutScroll}>
            <View style={styles.checkoutSheet}>
              <View style={styles.checkoutHeader}>
                <Text style={styles.checkoutTitle}>📋 Datos de compra</Text>
                <Pressable style={styles.closeButton} onPress={() => setCheckoutOpen(false)}>
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.checkoutBody}>
                <Text style={styles.checkoutSectionTitle}>👤 Datos personales</Text>

                <InputValidado
                  label="Cédula *"
                  value={chkCedula}
                  onChangeText={(t) => { setChkCedula(t); clearCheckoutError('cedula'); }}
                  keyboardType="numeric"
                  placeholder="Ej: 1234567890"
                  validate={(v) => validateCedula(v)}
                />

                <Text style={styles.inputLabel}>Forma de pago *</Text>
                <Pressable
                  style={[styles.dropdownButton, checkoutErrors.forma_pago ? styles.inputError : undefined]}
                  onPress={() => setShowFormasPago(!showFormasPago)}>
                  <Text style={chkFormaPago ? styles.dropdownButtonText : styles.dropdownPlaceholder}>
                    {chkFormaPago || 'Selecciona una forma de pago'}
                  </Text>
                  <Text style={styles.dropdownArrow}>{showFormasPago ? '▲' : '▼'}</Text>
                </Pressable>
                {renderFieldError(checkoutErrors.forma_pago)}
                {showFormasPago && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 180 }}>
                      {formasPago.map((fp) => (
                        <Pressable
                          key={fp}
                          style={[styles.dropdownItem, chkFormaPago === fp && styles.dropdownItemActive]}
                          onPress={() => { setChkFormaPago(fp); setShowFormasPago(false); clearCheckoutError('forma_pago'); }}>
                          <Text style={[styles.dropdownItemText, chkFormaPago === fp && styles.dropdownItemTextActive]}>
                            {fp}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Campo de código de pago (tarjetas, transferencia y billeteras) — justo debajo del método de pago */}
                {['Tarjeta Débito', 'Tarjeta Crédito', 'Transferencia Bancaria', 'Nequi', 'Daviplata', 'Bancolombia'].includes(chkFormaPago) && (
                  <InputValidado
                    label="Número o código de pago *"
                    value={chkCodigoPago}
                    onChangeText={(t) => { setChkCodigoPago(t); clearCheckoutError('codigo_pago'); }}
                    keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
                    placeholder={chkFormaPago === 'Transferencia Bancaria' ? 'Ej: 1234567890' : 'Últimos 4 dígitos o código'}
                    validate={(v) => {
                      if (chkFormaPago === 'Transferencia Bancaria' || chkFormaPago === 'Nequi' || chkFormaPago === 'Daviplata' || chkFormaPago === 'Bancolombia') {
                        if (!v.trim()) return { isValid: false, message: 'Ingresa el código de pago' };
                        if (!/^\d{4,20}$/.test(v.trim())) return { isValid: false, message: 'Debe ser un número de 4 a 20 dígitos' };
                        return { isValid: true, message: '' };
                      }
                      // Tarjetas: último 4 dígitos
                      if (!v.trim()) return { isValid: false, message: 'Ingresa los últimos 4 dígitos' };
                      if (!/^\d{4}$/.test(v.trim())) return { isValid: false, message: 'Debe tener exactamente 4 dígitos' };
                      return { isValid: true, message: '' };
                    }}
                  />
                )}

                <Text style={[styles.checkoutSectionTitle, { marginTop: 20 }]}>📍 Dirección de envío</Text>

                <AddressPicker
                  tipoVia={chkTipoVia}
                  setTipoVia={(v) => { setChkTipoVia(v); clearCheckoutError('tipo_via'); }}
                  numeroVia={chkNumeroVia}
                  setNumeroVia={(v) => { setChkNumeroVia(v); clearCheckoutError('numero_via'); }}
                  letraVia={chkLetraVia}
                  setLetraVia={(v) => { setChkLetraVia(v); clearCheckoutError('letra_via'); }}
                  numeroPlaca={chkNumeroPlaca}
                  setNumeroPlaca={(v) => { setChkNumeroPlaca(v); clearCheckoutError('numero_placa'); }}
                  letraPlaca={chkLetraPlaca}
                  setLetraPlaca={(v) => { setChkLetraPlaca(v); clearCheckoutError('letra_placa'); }}
                  localidad={chkLocalidad}
                  setLocalidad={(v) => { setChkLocalidad(v); clearCheckoutError('localidad'); }}
                  complemento={chkComplemento}
                  setComplemento={(v) => { setChkComplemento(v); clearCheckoutError('complemento'); }}
                  errors={{
                    tipo_via: checkoutErrors.tipo_via,
                    numero_via: checkoutErrors.numero_via,
                    letra_via: checkoutErrors.letra_via,
                    numero_placa: checkoutErrors.numero_placa,
                    letra_placa: checkoutErrors.letra_placa,
                    localidad: checkoutErrors.localidad,
                  }}
                  clearError={(field) => {
                    clearCheckoutError(field as keyof CheckoutFieldErrors);
                  }}
                  showLocalidades={showLocalidades}
                  setShowLocalidades={setShowLocalidades}
                />

                <View style={styles.checkoutResumen}>
                  <Text style={styles.checkoutResumenTitle}>Resumen del pedido</Text>
                  {cart.map((item) => (
                    <View key={item.id} style={styles.checkoutResumenItem}>
                      <Text style={styles.checkoutResumenName}>{item.name} x{item.qty}</Text>
                      <Text style={styles.checkoutResumenPrice}>{money(item.price * item.qty)}</Text>
                    </View>
                  ))}
                  <View style={styles.checkoutResumenTotal}>
                    <Text style={styles.checkoutResumenTotalLabel}>Total</Text>
                    <Text style={styles.checkoutResumenTotalValue}>{money(cartTotal)}</Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.checkoutSubmit, checkoutLoading && styles.checkoutSubmitDisabled]}
                  disabled={checkoutLoading}
                  onPress={handleCheckout}>
                  <Text style={styles.checkoutSubmitText}>
                    {checkoutLoading ? 'Procesando...' : 'Confirmar compra'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Auth Modal */}
      <Modal visible={authOpen} animationType="fade" transparent onRequestClose={() => setAuthOpen(false)}>
        <View style={styles.authBackdrop}>
          <Pressable style={styles.authScrim} onPress={() => setAuthOpen(false)} />
          {renderToast()}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={{ flex: 1 }}
          >
          <ScrollView contentContainerStyle={styles.authScroll}>
            <View style={styles.authModal}>
              <Pressable style={styles.authClose} onPress={() => setAuthOpen(false)}>
                <Text style={styles.authCloseText}>×</Text>
              </Pressable>

              {authMode === 'login' ? (
                <View>
                  <Text style={styles.authTitle}>🐾 Bienvenido de vuelta</Text>

                  <InputValidado
                    label="Correo electrónico"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="tu@email.com"
                    validate={(v) => validateEmail(v)}
                  />

                  <InputValidado
                    label="Contraseña"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry
                    placeholder="********"
                    validate={(v) => validatePassword(v)}
                  />

                  <Pressable
                    style={[styles.authSubmit, authLoading && styles.authSubmitDisabled]}
                    disabled={authLoading}
                    onPress={handleLogin}>
                    <Text style={styles.authSubmitText}>
                      {authLoading ? 'Validando...' : 'Iniciar Sesión'}
                    </Text>
                  </Pressable>

                  <Text style={styles.authSwitch}>
                    ¿No tienes cuenta?{' '}
                    <Text style={styles.authSwitchLink} onPress={() => setAuthMode('register')}>
                      Regístrate aquí
                    </Text>
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.authTitle}>🐾 Crear cuenta</Text>

                  <View style={styles.formRow}>
                    <View style={styles.formHalf}>
                      <InputValidado
                        label="Nombre *"
                        value={regName}
                        onChangeText={setRegName}
                        placeholder="Juan"
                        validate={(v) => validateOnlyLetters(v, 'El nombre')}
                      />
                    </View>
                    <View style={styles.formHalf}>
                      <InputValidado
                        label="Apellido *"
                        value={regLastname}
                        onChangeText={setRegLastname}
                        placeholder="García"
                        validate={(v) => validateOnlyLetters(v, 'El apellido')}
                      />
                    </View>
                  </View>

                  <InputValidado
                    label="Correo electrónico *"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="tu@email.com"
                    validate={(v) => validateEmail(v)}
                  />

                  <InputValidado
                    label="Contraseña *"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry
                    placeholder="Mínimo 6 caracteres"
                    validate={(v) => validatePassword(v)}
                  />

                  <InputValidado
                    label="Confirmar contraseña *"
                    value={regPassword2}
                    onChangeText={setRegPassword2}
                    secureTextEntry
                    placeholder="Repite tu contraseña"
                    validate={(v) => validatePasswordMatch(regPassword, v)}
                  />

                  <InputValidado
                    label="Teléfono *"
                    value={regPhone}
                    onChangeText={setRegPhone}
                    keyboardType="phone-pad"
                    placeholder="Ej: 3001234567"
                    validate={(v) => validatePhoneCo(v)}
                  />

                  <Pressable
                    style={[styles.authSubmit, authLoading && styles.authSubmitDisabled]}
                    disabled={authLoading}
                    onPress={handleRegister}>
                    <Text style={styles.authSubmitText}>
                      {authLoading ? 'Creando...' : 'Crear Cuenta'}
                    </Text>
                  </Pressable>

                  <Text style={styles.authSwitch}>
                    ¿Ya tienes cuenta?{' '}
                    <Text style={styles.authSwitchLink} onPress={() => setAuthMode('login')}>
                      Inicia sesión
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Profile Modal for Client */}
      <EditProfileForm
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={profileUser}
        onUserUpdated={(updatedUser) => {
          setProfileUser(updatedUser);
          showToast('Perfil actualizado');
        }}
        showToast={showToast}
      />

      {/* Mis Pedidos Modal */}
      <Modal visible={myOrdersOpen} animationType="slide" transparent onRequestClose={() => setMyOrdersOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setMyOrdersOpen(false)} />
          {renderToast()}
          <View style={styles.myOrdersSheet}>
            <View style={styles.myOrdersHeader}>
              <Text style={styles.myOrdersTitle}>📋 Mis Pedidos</Text>
              <Pressable style={styles.closeButton} onPress={() => setMyOrdersOpen(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.myOrdersBody}>
              {myOrdersLoading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>⏳</Text>
                  <Text style={styles.emptyText}>Cargando pedidos...</Text>
                </View>
              ) : myOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={styles.emptyText}>No tienes pedidos realizados</Text>
                </View>
              ) : isWide ? (
                // Vista de tabla para escritorio
                <View style={styles.ordersTableContainer}>
                  <ScrollView horizontal>
                    <View style={styles.ordersTable}>
                      <View style={styles.ordersTableHeader}>
                        <Text style={[styles.ordersTableHeaderCell, { width: 100 }]}>ID</Text>
                        <Text style={[styles.ordersTableHeaderCell, { width: 120 }]}>Fecha</Text>
                        <Text style={[styles.ordersTableHeaderCell, { flex: 2 }]}>Productos</Text>
                        <Text style={[styles.ordersTableHeaderCell, { width: 120 }]}>Total</Text>
                        <Text style={[styles.ordersTableHeaderCell, { width: 120 }]}>Estado</Text>
                        <Text style={[styles.ordersTableHeaderCell, { width: 180 }]}>Acciones</Text>
                      </View>
                      {myOrders.map((order) => (
                        <View key={order.id} style={styles.ordersTableRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 8 }}>
                            <Text style={[styles.ordersTableCell, { width: 100, fontWeight: '900', fontSize: 13 }]}>{order.id}</Text>
                            <Text style={[styles.ordersTableCell, { width: 120, fontSize: 12 }]}>{new Date(order.date).toLocaleDateString('es-CO')}</Text>
                            <View style={[styles.ordersTableCell, { flex: 2 }]}>
                              {order.products && order.products.map((prod: any, idx: number) => (
                                <Text key={idx} style={styles.orderProductText}>
                                  {prod.product_name} x{prod.qty}
                                </Text>
                              ))}
                            </View>
                            <Text style={[styles.ordersTableCell, { width: 120, fontWeight: '900', fontSize: 13 }]}>${order.total.toLocaleString('es-CO')}</Text>
                            <View style={[styles.ordersTableCell, { width: 120 }]}>
                              <View style={[
                                styles.statusBadge,
                                order.status === 'Pendiente' && styles.statusPending,
                                order.status === 'Cancelado' && styles.statusCancelled,
                                order.status === 'Entregado' && styles.statusDelivered,
                              ]}>
                                <Text style={[
                                  styles.statusText,
                                  order.status === 'Pendiente' && styles.statusPendingText,
                                  order.status === 'Cancelado' && styles.statusCancelledText,
                                  order.status === 'Entregado' && styles.statusDeliveredText,
                                ]}>
                                  {order.status}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 8, borderTopColor: colors.border, borderTopWidth: 1 }}>
                            <Pressable
                              style={[styles.orderActionButton, styles.orderViewButton, { flex: 1 }]}
                              onPress={() => openMyOrderDetail(order)}
                            >
                              <Text style={styles.orderActionButtonText}>👁️ Ver</Text>
                            </Pressable>
                            {order.status === 'Pendiente' && (
                              <>
                                <Pressable
                                  style={[styles.orderActionButton, styles.orderEditButton, { flex: 1 }]}
                                  onPress={() => openEditOrderModal(order)}
                                >
                                  <Text style={styles.orderActionButtonText}>✏️ Editar</Text>
                                </Pressable>
                                <Pressable
                                  style={[styles.orderActionButton, styles.orderCancelButton, { flex: 1 }]}
                                  onPress={() => handleCancelOrder(order.id)}
                                >
                                  <Text style={styles.orderActionButtonText}>❌ Cancelar</Text>
                                </Pressable>
                              </>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : (
                // Vista de cards para móvil
                <View style={styles.ordersCardsContainer}>
                  {myOrders.map((order) => (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <Text style={styles.orderCardId}>Pedido #{order.id}</Text>
                        <View style={[
                          styles.statusBadge,
                          order.status === 'Pendiente' && styles.statusPending,
                          order.status === 'Cancelado' && styles.statusCancelled,
                          order.status === 'Entregado' && styles.statusDelivered,
                        ]}>
                          <Text style={[
                            styles.statusText,
                            order.status === 'Pendiente' && styles.statusPendingText,
                            order.status === 'Cancelado' && styles.statusCancelledText,
                            order.status === 'Entregado' && styles.statusDeliveredText,
                          ]}>
                            {order.status}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.orderCardDate}>
                        📅 {new Date(order.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </Text>

                      <View style={styles.orderCardProducts}>
                        <Text style={styles.orderCardProductsTitle}>Productos:</Text>
                        {order.products && order.products.map((prod: any, idx: number) => (
                          <Text key={idx} style={styles.orderCardProductItem}>
                            • {prod.product_name} x{prod.qty} - ${(prod.qty * prod.unit_price).toLocaleString('es-CO')}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.orderCardFooter}>
                        <Text style={styles.orderCardTotal}>Total: ${order.total.toLocaleString('es-CO')}</Text>
                        <View style={styles.orderCardActions}>
                          <Pressable
                            style={[styles.orderActionButton, styles.orderViewButton]}
                            onPress={() => openMyOrderDetail(order)}
                          >
                            <Text style={styles.orderActionButtonText}>Ver</Text>
                          </Pressable>
                          {order.status === 'Pendiente' && (
                            <>
                              <Pressable
                                style={[styles.orderActionButton, styles.orderEditButton]}
                                onPress={() => openEditOrderModal(order)}
                              >
                                <Text style={styles.orderActionButtonText}>Editar</Text>
                              </Pressable>
                              <Pressable
                                style={[styles.orderActionButton, styles.orderCancelButton]}
                                onPress={() => handleCancelOrder(order.id)}
                              >
                                <Text style={styles.orderActionButtonText}>Cancelar</Text>
                              </Pressable>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Order Detail Modal */}
      <Modal visible={myOrderDetailOpen} animationType="slide" transparent onRequestClose={() => setMyOrderDetailOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setMyOrderDetailOpen(false)} />
          {renderToast()}
          <View style={styles.orderDetailSheet}>
            <View style={styles.orderDetailHeader}>
              <Text style={styles.orderDetailTitle}>Detalle del Pedido</Text>
              <Pressable style={styles.closeButton} onPress={() => setMyOrderDetailOpen(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            {selectedMyOrder && (
              <ScrollView style={styles.orderDetailBody}>
                <View style={styles.orderDetailInfo}>
                  <View style={styles.orderDetailRow}>
                    <Text style={styles.orderDetailLabel}>ID del Pedido:</Text>
                    <Text style={styles.orderDetailValue}>{selectedMyOrder.id}</Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Text style={styles.orderDetailLabel}>Fecha:</Text>
                    <Text style={styles.orderDetailValue}>
                      {new Date(selectedMyOrder.date).toLocaleDateString('es-CO', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Text style={styles.orderDetailLabel}>Estado:</Text>
                    <View style={[
                      styles.statusBadge,
                      selectedMyOrder.status === 'Pendiente' && styles.statusPending,
                      selectedMyOrder.status === 'Cancelado' && styles.statusCancelled,
                      selectedMyOrder.status === 'Entregado' && styles.statusDelivered,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        selectedMyOrder.status === 'Pendiente' && styles.statusPendingText,
                        selectedMyOrder.status === 'Cancelado' && styles.statusCancelledText,
                        selectedMyOrder.status === 'Entregado' && styles.statusDeliveredText,
                      ]}>
                        {selectedMyOrder.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Text style={styles.orderDetailLabel}>Forma de Pago:</Text>
                    <Text style={styles.orderDetailValue}>{selectedMyOrder.payment_method || 'No especificada'}</Text>
                  </View>
                </View>

                <View style={styles.orderDetailProducts}>
                  <Text style={styles.orderDetailProductsTitle}>Productos del Pedido</Text>
                  {selectedMyOrder.products && selectedMyOrder.products.map((prod: any, idx: number) => (
                    <View key={idx} style={styles.orderDetailProductItem}>
                      <View style={styles.orderDetailProductInfo}>
                        <Text style={styles.orderDetailProductName}>{prod.product_name}</Text>
                        <Text style={styles.orderDetailProductQty}>Cantidad: {prod.qty}</Text>
                        <Text style={styles.orderDetailProductPrice}>Precio unitario: ${prod.unit_price.toLocaleString('es-CO')}</Text>
                      </View>
                      <Text style={styles.orderDetailProductSubtotal}>
                        ${(prod.qty * prod.unit_price).toLocaleString('es-CO')}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.orderDetailTotal}>
                  <Text style={styles.orderDetailTotalLabel}>Total del Pedido</Text>
                  <Text style={styles.orderDetailTotalValue}>${selectedMyOrder.total.toLocaleString('es-CO')}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Order Modal */}
      <Modal visible={editOrderOpen} animationType="slide" transparent onRequestClose={() => setEditOrderOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setEditOrderOpen(false)} />
          {renderToast()}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.editOrderScroll}>
              <View style={styles.editOrderSheet}>
                <View style={styles.editOrderHeader}>
                  <Text style={styles.editOrderTitle}>✏️ Editar Pedido</Text>
                  <Pressable style={styles.closeButton} onPress={() => setEditOrderOpen(false)}>
                    <Text style={styles.closeButtonText}>×</Text>
                  </Pressable>
                </View>

                {selectedMyOrder && (
                  <View style={styles.editOrderBody}>
                    <Text style={styles.editOrderInfo}>
                      Editando pedido: <Text style={styles.editOrderId}>{selectedMyOrder.id}</Text>
                    </Text>

                    <Text style={styles.editOrderSectionTitle}>Productos del pedido</Text>
                    
                    {editingProducts.map((prod, index) => (
                      <View key={index} style={styles.editOrderProductItem}>
                        <View style={styles.editOrderProductInfo}>
                          <Text style={styles.editOrderProductName}>{prod.product_name}</Text>
                          <Text style={styles.editOrderProductPrice}>${prod.unit_price.toLocaleString('es-CO')} c/u</Text>
                        </View>
                        <View style={styles.editOrderProductActions}>
                          <Pressable
                            style={styles.editOrderQtyButton}
                            onPress={() => updateEditingProductQty(index, -1)}
                          >
                            <Text style={styles.editOrderQtyText}>−</Text>
                          </Pressable>
                          <Text style={styles.editOrderQtyValue}>{prod.qty}</Text>
                          <Pressable
                            style={styles.editOrderQtyButton}
                            onPress={() => updateEditingProductQty(index, 1)}
                          >
                            <Text style={styles.editOrderQtyText}>+</Text>
                          </Pressable>
                          <Pressable
                            style={styles.editOrderRemoveButton}
                            onPress={() => removeEditingProduct(index)}
                          >
                            <Text style={styles.editOrderRemoveText}>🗑️</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}

                    {/* Botón para agregar productos del catálogo al pedido */}
                    <Pressable
                      style={styles.editOrderAddProductButton}
                      onPress={openAddProductModal}
                    >
                      <Text style={styles.editOrderAddProductText}>➕ Agregar producto del catálogo</Text>
                    </Pressable>

                    <View style={styles.editOrderTotalRow}>
                      <Text style={styles.editOrderTotalLabel}>Nuevo Total:</Text>
                      <Text style={styles.editOrderTotalValue}>
                        ${editingProducts.reduce((sum, prod) => sum + (prod.qty * prod.unit_price), 0).toLocaleString('es-CO')}
                      </Text>
                    </View>

                    <Pressable
                      style={[styles.editOrderSubmitButton, editOrderLoading && styles.editOrderSubmitDisabled]}
                      disabled={editOrderLoading || editingProducts.length === 0}
                      onPress={handleEditOrder}
                    >
                      <Text style={styles.editOrderSubmitText}>
                        {editOrderLoading ? 'Guardando...' : '💾 Guardar Cambios'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.editOrderCancelButton}
                      onPress={() => setEditOrderOpen(false)}
                    >
                      <Text style={styles.editOrderCancelText}>Cancelar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal para agregar producto al pedido durante edición */}
      <Modal visible={addProductModalOpen} animationType="slide" transparent onRequestClose={() => setAddProductModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setAddProductModalOpen(false)} />
          <View style={styles.addProductSheet}>
            <View style={styles.myOrdersHeader}>
              <Text style={styles.myOrdersTitle}>➕ Agregar Producto</Text>
              <Pressable style={styles.closeButton} onPress={() => setAddProductModalOpen(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.myOrdersBody}>
              {availableProductsForAdd.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={styles.emptyText}>No hay más productos disponibles</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Selecciona un producto:</Text>
                  {availableProductsForAdd.map((product) => (
                    <Pressable
                      key={product.id}
                      style={[
                        styles.addProductItem,
                        selectedAddProductId === product.id && styles.addProductItemActive,
                      ]}
                      onPress={() => setSelectedAddProductId(product.id)}
                    >
                      <View style={styles.addProductItemInfo}>
                        <Text style={styles.addProductItemName}>{product.name}</Text>
                        <Text style={styles.addProductItemPrice}>
                          {money(product.price)} {product.stock ? `| Stock: ${product.stock}` : ''}
                        </Text>
                      </View>
                      {selectedAddProductId === product.id && (
                        <Text style={styles.addProductItemCheck}>✓</Text>
                      )}
                    </Pressable>
                  ))}
                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>Cantidad:</Text>
                  <View style={styles.addProductQtyRow}>
                    <Pressable
                      style={styles.editOrderQtyButton}
                      onPress={() => setSelectedAddProductQty(Math.max(1, selectedAddProductQty - 1))}
                    >
                      <Text style={styles.editOrderQtyText}>−</Text>
                    </Pressable>
                    <Text style={styles.editOrderQtyValue}>{selectedAddProductQty}</Text>
                    <Pressable
                      style={styles.editOrderQtyButton}
                      onPress={() => setSelectedAddProductQty(selectedAddProductQty + 1)}
                    >
                      <Text style={styles.editOrderQtyText}>+</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={[styles.checkoutSubmit, !selectedAddProductId && styles.checkoutButtonDisabled]}
                    disabled={!selectedAddProductId}
                    onPress={confirmAddProduct}
                  >
                    <Text style={styles.checkoutSubmitText}>Agregar al Pedido</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingBottom: 0,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomColor: colors.border,
    borderBottomWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTopWide: {
    gap: 24,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.softPink,
  },
  logo: {
    color: colors.brown,
    flexShrink: 0,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0,
  },
  logoAccent: {
    color: colors.gold,
  },
  logoPaw: {
    color: '#3b2945',
    fontSize: 16,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 5,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconButtonText: {
    color: colors.brown,
    fontSize: 17,
    fontWeight: '800',
  },
  ordersButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordersButtonText: {
    color: colors.brown,
    fontSize: 17,
    fontWeight: '800',
  },
  authButton: {
    backgroundColor: colors.brown,
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  authButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brown,
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    overflow: 'hidden',
    paddingTop: 2,
  },
  searchBar: {
    flex: 1,
    minWidth: 0,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: 50,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  searchBarWide: {
    maxWidth: 600,
  },
  searchIcon: {
    color: colors.brown,
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    minHeight: 38,
    fontSize: 12,
    paddingHorizontal: 12,
  },
  searchButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.brown,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  searchButtonText: {
    color: colors.white,
    fontSize: 13,
  },
  navList: {
    backgroundColor: colors.brown,
    width: '100%',
  },
  navListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  navLink: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 6,
  },
  navLinkActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderBottomColor: colors.gold,
    borderBottomWidth: 3,
    opacity: 1,
  },
  navText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  navTextWide: {
    fontSize: 16,
  },
  navTextActive: {
    color: colors.brown,
  },
  hero: {
    height: 475,
    overflow: 'hidden',
  },
  heroImage: {
    borderRadius: 22,
  },
  heroOverlay: {
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(107,18,79,0.56)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroOverlayWide: {
    width: '48%',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    maxWidth: 310,
  },
  heroTitleWide: {
    fontSize: 56,
    lineHeight: 64,
    maxWidth: 560,
  },
  heroText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginTop: 10,
    maxWidth: 300,
  },
  heroTextWide: {
    fontSize: 24,
    maxWidth: 560,
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: 50,
    marginTop: 20,
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  heroButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  heroButtonTextWide: {
    fontSize: 20,
  },
  section: {
    paddingHorizontal: 32,
    paddingTop: 68,
  },
  sectionTitle: {
    color: colors.brown,
    fontSize: 30,
    fontWeight: '500',
  },
  sectionTitleWide: {
    fontSize: 40,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    marginBottom: 22,
  },
  sectionRule: {
    backgroundColor: colors.gold,
    flex: 1,
    height: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 4,
  },
  categoryCard: {
    width: '48%',
    minHeight: 120,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0e5e9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 12,
  },
  categoryEmoji: {
    fontSize: 42,
    marginBottom: 14,
  },
  categoryTitle: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    backgroundColor: colors.white,
    borderColor: '#f1dbe8',
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  productImageWrap: {
    height: 210,
    backgroundColor: colors.softPink,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  wishlistButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistButtonActive: {
    backgroundColor: '#fff0f0',
  },
  wishlistButtonText: {
    color: '#cfc5cc',
    fontSize: 18,
    fontWeight: '900',
  },
  wishlistButtonTextActive: {
    color: colors.danger,
  },
  productInfo: {
    padding: 16,
    minHeight: 188,
  },
  productBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.softPink,
    borderRadius: 12,
    color: colors.brown,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  productName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  productDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  productFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 14,
  },
  productPrice: {
    color: colors.brown,
    fontSize: 20,
    fontWeight: '900',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.brown,
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 28,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.muted,
    fontWeight: '700',
    textAlign: 'center',
  },
  offerBanner: {
    marginHorizontal: 16,
    marginTop: 42,
    backgroundColor: colors.brown,
    borderRadius: 20,
    padding: 28,
  },
  offerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
  offerText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    marginTop: 8,
  },
  offerButton: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderRadius: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offerButtonText: {
    color: colors.white,
    fontWeight: '900',
  },
  footer: {
    backgroundColor: colors.ink,
    marginTop: 42,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  footerTitle: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '900',
  },
  footerText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  footerCopy: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 11,
    marginTop: 20,
  },
  toast: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: Platform.OS === 'web' ? 22 : 54,
    backgroundColor: colors.green,
    borderRadius: 14,
    elevation: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    zIndex: 9999,
  },
  toastText: {
    color: colors.white,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  cartSheet: {
    maxHeight: '88%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  cartHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cartTitle: {
    color: colors.brown,
    fontSize: 21,
    fontWeight: '900',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.brown,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  cartBody: {
    paddingHorizontal: 18,
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 26,
  },
  cartItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 13,
  },
  cartImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.softPink,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  cartItemPrice: {
    color: colors.brown,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: colors.brown,
    fontSize: 18,
    fontWeight: '900',
  },
  qtyValue: {
    color: colors.ink,
    minWidth: 18,
    textAlign: 'center',
    fontWeight: '900',
  },
  wishlistSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 16,
    paddingBottom: 20,
  },
  wishlistTitle: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  wishlistEmpty: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  favoriteImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.softPink,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  favoritePrice: {
    color: colors.brown,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  favoriteBuy: {
    backgroundColor: colors.brown,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  favoriteBuyText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  cartFooter: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: 18,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  totalLabel: {
    color: colors.brown,
    fontSize: 18,
    fontWeight: '900',
  },
  totalValue: {
    color: colors.brown,
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutButton: {
    backgroundColor: colors.brown,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.45,
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  // Checkout Modal Styles
  checkoutScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  checkoutSheet: {
    maxHeight: '92%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  checkoutHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  checkoutTitle: {
    color: colors.brown,
    fontSize: 20,
    fontWeight: '900',
  },
  checkoutBody: {
    padding: 18,
    paddingBottom: 30,
  },
  checkoutSectionTitle: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 4,
  },
  checkoutInput: {
    backgroundColor: '#fafaf8',
    borderColor: '#e0d9ce',
    borderRadius: 10,
    borderWidth: 1.5,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 14,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  checkoutRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkoutHalf: {
    flex: 1,
  },
  dropdownButton: {
    backgroundColor: '#fafaf8',
    borderColor: '#e0d9ce',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  dropdownButtonText: {
    color: colors.ink,
    fontSize: 14,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
  },
  dropdownArrow: {
    color: colors.muted,
    fontSize: 12,
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomColor: '#f5f0f2',
    borderBottomWidth: 1,
  },
  dropdownItemActive: {
    backgroundColor: colors.softPink,
  },
  dropdownItemText: {
    color: colors.ink,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: colors.brown,
    fontWeight: '900',
  },
  fieldHint: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
    marginTop: -10,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  checkoutResumen: {
    backgroundColor: '#faf5f8',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  checkoutResumenTitle: {
    color: colors.brown,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  checkoutResumenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  checkoutResumenName: {
    color: colors.ink,
    fontSize: 13,
  },
  checkoutResumenPrice: {
    color: colors.brown,
    fontSize: 13,
    fontWeight: '700',
  },
  checkoutResumenTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  checkoutResumenTotalLabel: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
  },
  checkoutResumenTotalValue: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
  },
  checkoutSubmit: {
    backgroundColor: colors.green,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  checkoutSubmitDisabled: {
    opacity: 0.6,
  },
  checkoutSubmitText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
  },
  authBackdrop: {
    flex: 1,
    justifyContent: 'center',
  },
  authScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  authModal: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    maxWidth: 480,
    padding: 24,
    width: '100%',
  },
  authClose: {
    alignItems: 'center',
    backgroundColor: '#f0ece6',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    zIndex: 2,
  },
  authCloseText: {
    color: '#666',
    fontSize: 24,
    lineHeight: 27,
  },
  authTitle: {
    color: colors.brown,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
    paddingRight: 32,
  },
  inputLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  authInput: {
    backgroundColor: '#fafaf8',
    borderColor: '#e0d9ce',
    borderRadius: 10,
    borderWidth: 1.5,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 14,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#fff8f7',
    marginBottom: 4,
  },
  inputErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: -2,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  roleChip: {
    borderColor: '#e0d9ce',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roleChipActive: {
    backgroundColor: colors.softPink,
    borderColor: colors.brown,
  },
  roleChipText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '800',
  },
  roleChipTextActive: {
    color: colors.brown,
  },
  authSubmit: {
    alignItems: 'center',
    backgroundColor: colors.brown,
    borderRadius: 50,
    marginTop: 6,
    paddingVertical: 14,
  },
  authSubmitDisabled: {
    opacity: 0.65,
  },
  authSubmitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  authSwitch: {
    color: '#888',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  authSwitchLink: {
    color: colors.brown,
    fontWeight: '900',
  },
  // Mis Pedidos Styles
  myOrdersSheet: {
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  myOrdersHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  myOrdersTitle: {
    color: colors.brown,
    fontSize: 21,
    fontWeight: '900',
  },
  myOrdersBody: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  ordersTableContainer: {
    marginTop: 10,
  },
  ordersTable: {
    minWidth: 900,
  },
  ordersTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.brown,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  ordersTableHeaderCell: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  ordersTableRow: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ordersTableCell: {
    color: colors.ink,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  orderProductText: {
    fontSize: 11,
    color: colors.ink,
    marginVertical: 2,
  },
  ordersCardsContainer: {
    marginTop: 10,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardId: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
  },
  orderCardDate: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
  },
  orderCardProducts: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  orderCardProductsTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  orderCardProductItem: {
    color: colors.ink,
    fontSize: 13,
    marginVertical: 2,
    paddingLeft: 8,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCardTotal: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
  },
  orderCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusCancelled: {
    backgroundColor: '#f8d7da',
  },
  statusDelivered: {
    backgroundColor: '#d4edda',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusPendingText: {
    color: '#856404',
  },
  statusCancelledText: {
    color: '#721c24',
  },
  statusDeliveredText: {
    color: '#155724',
  },
  orderActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  orderViewButton: {
    backgroundColor: colors.brown,
  },
  orderEditButton: {
    backgroundColor: colors.gold,
  },
  orderCancelButton: {
    backgroundColor: colors.danger,
  },
  orderActionButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  orderDetailSheet: {
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  orderDetailHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  orderDetailTitle: {
    color: colors.brown,
    fontSize: 20,
    fontWeight: '900',
  },
  orderDetailBody: {
    padding: 18,
  },
  orderDetailInfo: {
    backgroundColor: '#faf5f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderDetailLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  orderDetailValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  orderDetailProducts: {
    marginBottom: 16,
  },
  orderDetailProductsTitle: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  orderDetailProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  orderDetailProductInfo: {
    flex: 1,
  },
  orderDetailProductName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  orderDetailProductQty: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 2,
  },
  orderDetailProductPrice: {
    color: colors.muted,
    fontSize: 12,
  },
  orderDetailProductSubtotal: {
    color: colors.brown,
    fontSize: 14,
    fontWeight: '900',
  },
  orderDetailTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.softPink,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  orderDetailTotalLabel: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
  },
  orderDetailTotalValue: {
    color: colors.brown,
    fontSize: 18,
    fontWeight: '900',
  },
  editOrderSheet: {
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  editOrderHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  editOrderTitle: {
    color: colors.brown,
    fontSize: 20,
    fontWeight: '900',
  },
  editOrderScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  editOrderBody: {
    padding: 18,
    paddingBottom: 30,
  },
  editOrderInfo: {
    color: colors.ink,
    fontSize: 14,
    marginBottom: 16,
  },
  editOrderId: {
    fontWeight: '900',
    color: colors.brown,
  },
  editOrderSectionTitle: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  editOrderProductItem: {
    backgroundColor: '#faf5f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  editOrderProductInfo: {
    marginBottom: 10,
  },
  editOrderProductName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  editOrderProductPrice: {
    color: colors.muted,
    fontSize: 12,
  },
  editOrderProductActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editOrderQtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editOrderQtyText: {
    color: colors.brown,
    fontSize: 18,
    fontWeight: '900',
  },
  editOrderQtyValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    minWidth: 30,
    textAlign: 'center',
  },
  editOrderRemoveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8d7da',
  },
  editOrderRemoveText: {
    fontSize: 16,
  },
  editOrderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.softPink,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  editOrderTotalLabel: {
    color: colors.brown,
    fontSize: 16,
    fontWeight: '900',
  },
  editOrderTotalValue: {
    color: colors.brown,
    fontSize: 18,
    fontWeight: '900',
  },
  editOrderSubmitButton: {
    backgroundColor: colors.green,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  editOrderSubmitDisabled: {
    opacity: 0.6,
  },
  editOrderSubmitText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  editOrderCancelButton: {
    backgroundColor: colors.softPink,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editOrderCancelText: {
    color: colors.brown,
    fontSize: 14,
    fontWeight: '800',
  },
  // Add Product Button in Edit Order
  editOrderAddProductButton: {
    backgroundColor: colors.white,
    borderColor: colors.brown,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  editOrderAddProductText: {
    color: colors.brown,
    fontSize: 14,
    fontWeight: '800',
  },
  // Add Product Modal
  addProductSheet: {
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  addProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf5f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  addProductItemActive: {
    borderColor: colors.brown,
    backgroundColor: colors.softPink,
  },
  addProductItemInfo: {
    flex: 1,
  },
  addProductItemName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  addProductItemPrice: {
    color: colors.muted,
    fontSize: 12,
  },
  addProductItemCheck: {
    color: colors.green,
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 8,
  },
  addProductQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    marginTop: 8,
  },
});
