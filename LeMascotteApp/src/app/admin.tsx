import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Image,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, sharedStyles, money, statusColor, roleColor, formatDate, FilterChip } from '../shared/styles';
import { exportToPdf, exportToExcel, exportOrdersToPdf, exportOrdersToExcel, exportUsersToPdf, exportUsersToExcel, exportProveedoresToPdf, exportProveedoresToExcel, exportTrendingToPdf, exportTrendingToExcel, ReportRow, OrderReportRow, UserReportRow, ProveedorReportRow, TrendingReportRow } from '../../utils/ReportGenerator';
import InputValidado from '../components/InputValidado';
import EditProfileForm from '../components/EditProfileForm';
import UserHeader from '../components/UserHeader';
import { handleLogout, saveUserSession, getStoredUser, User as AuthUser } from '../../utils/AuthService';
import {
  validateOnlyLetters,
  validateNumeric,
  validateRequired,
  validateEmail,
  validatePhone,
  validateImageUrl,
  validateStock,
  validatePrice,
  validateNit,
  hasErrors,
} from '../../utils/Validators';

type Product = {
  id: number | string;
  name: string;
  category: string;
  price: number;
  stock?: number;
  img?: string;
  status?: string;
  desc?: string;
  cantidad_entrada?: number;
  cantidad_salida?: number;
  valor_compra?: number;
};

function normalizeUser(rawUser: Record<string, any> | undefined | null): AuthUser | null {
  if (!rawUser) return null;
  return {
    id: rawUser.id_usuario || rawUser.id || null,
    name: rawUser.nombre_usuario || rawUser.name || '',
    email: rawUser.correo_usuario || rawUser.email || '',
    role: rawUser.rol_usuario || rawUser.role || '',
    phone: rawUser.telefono_usuario || rawUser.phone || '',
    address: rawUser.direccion_usuario || rawUser.address || '',
  };
}

type User = { id: number | string; name: string; email: string; role: string; status?: string; password?: string };

type Proveedor = {
  id: string;
  nombre: string;
  contacto: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

type OrderDetail = {
  id: string;
  date: string;
  updated_at: string | null;
  total: number;
  status: string;
  payment_method: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  products: Array<{
    id?: string;
    qty: number;
    unit_price: number;
    product_id: string;
    product_name: string;
  }>;
  address: {
    tipo_via: string;
    numero_via: string;
    letra_via: string;
    numero_placa: string;
    letra_placa: string;
    localidad: string;
    complemento: string;
  } | null;
};

type ProductFieldErrors = Partial<Record<'name' | 'category' | 'price' | 'stock' | 'img', string>>;
type UserFieldErrors = Partial<Record<'name' | 'email' | 'role' | 'password', string>>;
type ProveedorFieldErrors = Partial<Record<'nombre' | 'contacto' | 'nit' | 'direccion' | 'telefono' | 'email', string>>;

type TrendingProduct = {
  id: string;
  name: string;
  category: string;
  stock: number;
  total_count: number;
};

type AnalyticsProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  times_added: number;
  unique_users: number;
};

type AnalyticsResponse = {
  products: AnalyticsProduct[];
  total: number;
  page: number;
  per_page: number;
};

type LiveEntry = {
  id: string;
  user_id: string;
  product_id: string;
  qty?: number;
  added_at: string;
  product_name: string;
  price: number;
  stock: number;
  user_name: string;
  user_email: string;
};

type LiveResponse = {
  items: LiveEntry[];
  total: number;
  page: number;
  per_page: number;
};

const initialProducts: Product[] = [];
const initialUsers: User[] = [];

const ORDER_STATUSES = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];

const XAMPP_PROJECT_PATH = 'Mocap%20Le%20Mascotte.V4.2.0';
const CANDIDATE_HOSTS = ['localhost', '172.30.5.119', '172.30.5.119', '192.168.137.191', '10.0.2.2', '192.168.101.16'];
const API_HOST_STORAGE_KEY = 'lemascotte_api_host_admin_v2';

const getApiUrlFromHost = (host: string) => `http://${host}/${XAMPP_PROJECT_PATH}/models/ajax_lemascotte.php`;

export default function AdminPage() {
  const [apiHost, setApiHost] = useState<string | null>(null);
  const [showHostModal, setShowHostModal] = useState(false);
  const [hostInput, setHostInput] = useState('');

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  // === INVENTORY STATE ===
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('');
  const [inventoryStockLevel, setInventoryStockLevel] = useState(''); // '' | 'bajo' | 'alto' | 'agotado'
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // === ORDERS EXPORT STATE ===
  const [ordersExporting, setOrdersExporting] = useState<'pdf' | 'excel' | null>(null);

  // === USERS EXPORT STATE ===
  const [usersExporting, setUsersExporting] = useState<'pdf' | 'excel' | null>(null);

  // === PROVEEDORES EXPORT STATE ===
  const [proveedoresExporting, setProveedoresExporting] = useState<'pdf' | 'excel' | null>(null);

  // === TRENDING EXPORT STATE ===
  const [trendingExporting, setTrendingExporting] = useState<'pdf' | 'excel' | null>(null);

  // === STATS CLICK MODAL ===
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTitle, setStatsModalTitle] = useState('');
  const [statsModalProducts, setStatsModalProducts] = useState<Product[]>([]);
  const [statsModalLoading, setStatsModalLoading] = useState(false);

  function fetchWithTimeout(url: string, opts: any = {}, timeout = 7000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
  }

  async function tryFetchOnce(host: string, payload: any) {
    const url = getApiUrlFromHost(host);
    try {
      const bodyStr = JSON.stringify(payload);
      console.log(`[API REQUEST] ${url}`, payload);
      const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr, credentials: 'include' }, 8000);
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      console.log(`[API RESPONSE RAW] ${url}`, text.substring(0, 500));
      if (ct.includes('application/json')) {
        try { return JSON.parse(text); } catch (e) { return { success: false, message: 'JSON parse error: ' + text.substring(0, 200) }; }
      }
      return { success: false, message: text || `HTTP ${res.status}` };
    } catch (err) {
      console.log(`[API FETCH ERROR] ${url}`, err);
      return null;
    }
  }

  async function apiCall(payload: any) {
    const triedHosts: string[] = [];
    if (apiHost) triedHosts.push(apiHost);
    for (const h of CANDIDATE_HOSTS) if (!triedHosts.includes(h)) triedHosts.push(h);
    for (const host of triedHosts) {
      const result = await tryFetchOnce(host, payload);
      if (result !== null) {
        setApiHost(host);
        return result;
      }
    }
    return { success: false, message: 'No se pudo conectar con el servidor. Asegura la IP de tu PC en la variable de hosts.' };
  }

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [productErrors, setProductErrors] = useState<ProductFieldErrors>({});
  const [userErrors, setUserErrors] = useState<UserFieldErrors>({});
  const [proveedorErrors, setProveedorErrors] = useState<ProveedorFieldErrors>({});

  const [section, setSection] = useState<'dash' | 'productos' | 'usuarios' | 'stats' | 'pedidos' | 'proveedores' | 'tendencias'>('dash');

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);

  // Search & filter states
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [proveedorSearch, setProveedorSearch] = useState('');
  const [proveedorEstadoFilter, setProveedorEstadoFilter] = useState('');

  // Trending products state
  const [trendingTab, setTrendingTab] = useState<'carrito' | 'wishlist'>('carrito');
  const [trendingOrder, setTrendingOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [cartTrending, setCartTrending] = useState<TrendingProduct[]>([]);
  const [wishlistTrending, setWishlistTrending] = useState<TrendingProduct[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Analytics de Comportamiento del Cliente
  const [analyticsTab, setAnalyticsTab] = useState<'carrito' | 'wishlist'>('carrito');
  const [cartAnalytics, setCartAnalytics] = useState<AnalyticsProduct[]>([]);
  const [wishlistAnalytics, setWishlistAnalytics] = useState<AnalyticsProduct[]>([]);
  const [cartAnalyticsTotal, setCartAnalyticsTotal] = useState(0);
  const [wishlistAnalyticsTotal, setWishlistAnalyticsTotal] = useState(0);
  const [cartAnalyticsPage, setCartAnalyticsPage] = useState(1);
  const [wishlistAnalyticsPage, setWishlistAnalyticsPage] = useState(1);
  const [cartAnalyticsSearch, setCartAnalyticsSearch] = useState('');
  const [wishlistAnalyticsSearch, setWishlistAnalyticsSearch] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [cartTotalProducts, setCartTotalProducts] = useState(0);
  const [wishlistTotalProducts, setWishlistTotalProducts] = useState(0);
  const PER_PAGE = 15;


  // Stats state
  const [productStats, setProductStats] = useState<{
    total_products: number;
    categories: Array<{ name: string; count: number }>;
    low_stock: number;
    high_stock: number;
    out_of_stock: number;
    total_stock: number;
  } | null>(null);

  // Orders detailed state
  const [ordersDetailed, setOrdersDetailed] = useState<OrderDetail[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [changingStatusOrderId, setChangingStatusOrderId] = useState<string | null>(null);

  // === MANUAL STATUS CHANGE STATE ===
  const [testPedidoId, setTestPedidoId] = useState('');
  const [testNuevoEstado, setTestNuevoEstado] = useState('Pendiente');
  const [testCambiarResult, setTestCambiarResult] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // === PROFILE & LOGOUT STATE ===
  const router = useRouter();
  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load stored user on mount
  useEffect(() => {
    (async () => {
      const stored = await getStoredUser();
      if (stored) {
        setProfileUser(stored);
      } else {
        // Try to get from server session
        const sessionResp = await apiCall({ action: 'session' });
        if (sessionResp && sessionResp.success && sessionResp.user) {
          const user = normalizeUser(sessionResp.user);
          if (user) {
            setProfileUser(user);
            await saveUserSession(user);
          }
        }
      }
    })();
  }, []);

  // AuthGuard: redirect non-admin users away from admin panel
  useEffect(() => {
    (async () => {
      const stored = await getStoredUser();
      if (!stored) {
        router.replace('/');
        return;
      }
      const normalized = (stored.role || '').trim().toLowerCase();
      const isAdmin = normalized.includes('admin');
      if (!isAdmin) {
        if (normalized.includes('empleado')) {
          router.replace('/empleado');
        } else {
          router.replace('/');
        }
      }
    })();
  }, [router]);

  const categories = ['Perros', 'Gatos', 'Accesorios', 'Peces', 'Aves', 'Pequeñas Mascotas', 'Salud', 'Higiene', 'Ofertas'];
  const userRoles = ['admin', 'cliente', 'empleado'];
  const proveedorEstados = ['Activo', 'Inactivo'];

  // Debounced inventory search
  useEffect(() => {
    if (section !== 'productos') return;
    const timer = setTimeout(async () => {
      setInventoryLoading(true);
      const resp = await apiCall({
        action: 'get_inventory_products',
        search: inventorySearch,
        category: inventoryCategory,
        stock_level: inventoryStockLevel,
      });
      if (resp && resp.success && resp.products) {
        setInventoryProducts(resp.products);
      }
      setInventoryLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [inventorySearch, inventoryCategory, inventoryStockLevel, section]);

  const inventoryRows: ReportRow[] = useMemo(() => {
    return inventoryProducts.map((p) => ({
      name: p.name,
      category: p.category || 'Sin categoría',
      cantidad_entrada: p.cantidad_entrada ?? 0,
      cantidad_salida: p.cantidad_salida ?? 0,
      stock: p.stock ?? 0,
      valor_compra: p.valor_compra ?? 0,
      valor_venta: p.price ?? 0,
      status: p.status || 'Disponible',
    }));
  }, [inventoryProducts]);

  // Debounced search
  const triggerSearch = useCallback((type: 'products' | 'users' | 'proveedores', search: string, filter: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      if (type === 'products') {
        const resp = await apiCall({ action: 'search_dashboard_products', search, category: filter });
        if (resp && resp.success && resp.products) setProducts(resp.products);
      } else if (type === 'users') {
        const resp = await apiCall({ action: 'search_dashboard_users', search, role: filter });
        if (resp && resp.success && resp.users) setUsers(resp.users);
      } else {
        const resp = await apiCall({ action: 'search_dashboard_proveedores', search, estado: filter });
        if (resp && resp.success && resp.proveedores) setProveedores(resp.proveedores);
      }
    }, 300);
  }, [apiCall]);

  useEffect(() => {
    triggerSearch('products', productSearch, productCategoryFilter);
  }, [productSearch, productCategoryFilter]);

  useEffect(() => {
    triggerSearch('users', userSearch, userRoleFilter);
  }, [userSearch, userRoleFilter]);

  useEffect(() => {
    triggerSearch('proveedores', proveedorSearch, proveedorEstadoFilter);
  }, [proveedorSearch, proveedorEstadoFilter]);

  async function refreshDashboardData() {
    setProductSearch('');
    setProductCategoryFilter('');
    setUserSearch('');
    setUserRoleFilter('');
    setProveedorSearch('');
    setProveedorEstadoFilter('');

    const prodResp = await apiCall({ action: 'get_dashboard_products' });
    if (prodResp && prodResp.success && prodResp.products) setProducts(prodResp.products);

    const usersResp = await apiCall({ action: 'get_dashboard_users' });
    if (usersResp && usersResp.success && usersResp.users) setUsers(usersResp.users);

    const provResp = await apiCall({ action: 'get_dashboard_proveedores' });
    if (provResp && provResp.success && provResp.proveedores) setProveedores(provResp.proveedores);

    const ordersResp = await apiCall({ action: 'get_dashboard_orders' });
    if (ordersResp && ordersResp.success && Array.isArray(ordersResp.orders)) {
      setOrdersCount(ordersResp.orders.length);
    }

    const statsResp = await apiCall({ action: 'get_product_stats' });
    if (statsResp && statsResp.success && statsResp.stats) {
      setProductStats(statsResp.stats);
    }
  }

  async function refreshAllData() {
    await refreshDashboardData();

    const ordResp = await apiCall({ action: 'admin_get_all_orders_detailed' });
    if (ordResp && ordResp.success && Array.isArray(ordResp.orders)) {
      setOrdersDetailed(ordResp.orders);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(API_HOST_STORAGE_KEY);
        if (stored) setApiHost(stored);
      } catch (e) {}
      await refreshAllData();
      // Load current user from session
      const sessionResp = await apiCall({ action: 'session' });
      if (sessionResp && sessionResp.success && sessionResp.user) {
        setCurrentUserId(sessionResp.user.id_usuario);
      }
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => { refreshAllData(); }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load trending data when section is 'tendencias'
  useEffect(() => {
    let cancelled = false;
    const loadTrending = async () => {
      try {
        if (section === 'tendencias') {
          const action = trendingTab === 'carrito' ? 'admin_get_cart_trending' : 'admin_get_wishlist_trending';
          const resp = await apiCall({ action, order: trendingOrder, limit: 50 });
          if (!cancelled && resp && resp.success && Array.isArray(resp.products)) {
            if (trendingTab === 'carrito') setCartTrending(resp.products);
            else setWishlistTrending(resp.products);
          }
        }
      } catch {}
      finally {
        if (!cancelled) setTrendingLoading(false);
      }
    };
    loadTrending();
    return () => { cancelled = true; };
  }, [section, trendingTab, trendingOrder]);

  // Load analytics data when section is 'tendencias'
  async function loadAnalyticsData() {
    const currentTab = analyticsTab;
    const search = currentTab === 'carrito' ? cartAnalyticsSearch : wishlistAnalyticsSearch;
    const page = currentTab === 'carrito' ? cartAnalyticsPage : wishlistAnalyticsPage;
    const action = currentTab === 'carrito' ? 'admin_get_cart_analytics' : 'admin_get_wishlist_analytics';

    setAnalyticsLoading(true);
    const [dataResp, totalResp] = await Promise.all([
      apiCall({ action, search, page, per_page: PER_PAGE }),
      apiCall({ action: currentTab === 'carrito' ? 'admin_get_cart_total_products' : 'admin_get_wishlist_total_products' }),
    ]);

    if (dataResp && dataResp.success && dataResp.data) {
      const d = dataResp.data as AnalyticsResponse;
      if (currentTab === 'carrito') {
        setCartAnalytics(d.products);
        setCartAnalyticsTotal(d.total);
      } else {
        setWishlistAnalytics(d.products);
        setWishlistAnalyticsTotal(d.total);
      }
    }
    if (totalResp && totalResp.success) {
      if (currentTab === 'carrito') setCartTotalProducts(totalResp.total);
      else setWishlistTotalProducts(totalResp.total);
    }
    setAnalyticsLoading(false);
  }

  // Load analytics when section, tab, search, or page changes
  useEffect(() => {
    if (section !== 'tendencias') return;
    const timer = setTimeout(() => { loadAnalyticsData(); }, 300);
    return () => clearTimeout(timer);
  }, [section, analyticsTab, cartAnalyticsSearch, wishlistAnalyticsSearch, cartAnalyticsPage, wishlistAnalyticsPage]);

  const availableProductsCount = useMemo(() => products.filter((p) => (p.stock ?? 0) > 0).length, [products]);

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  }

  function clearProductError(field: keyof ProductFieldErrors) {
    setProductErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function clearUserError(field: keyof UserFieldErrors) {
    setUserErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function clearProveedorError(field: keyof ProveedorFieldErrors) {
    setProveedorErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function fieldError(message?: string) {
    return message ? <Text style={sharedStyles.inputErrorText}>{message}</Text> : null;
  }

  function renderMessage() {
    if (!message) return null;
    return (
      <View style={[sharedStyles.alert, messageType === 'success' ? sharedStyles.alertSuccess : sharedStyles.alertError]} pointerEvents="none">
        <Text style={sharedStyles.alertText}>{message}</Text>
      </View>
    );
  }

  // === INVENTORY EXPORT HANDLERS ===
  async function handleExportPdf() {
    setExporting('pdf');
    const ok = await exportToPdf(inventoryRows, 'Inventario - Le Mascotte');
    if (!ok) showMsg('Error al generar PDF', 'error');
    setExporting(null);
  }

  async function handleExportExcel() {
    setExporting('excel');
    const ok = await exportToExcel(inventoryRows, 'Inventario - Le Mascotte');
    if (!ok) showMsg('Error al generar Excel', 'error');
    setExporting(null);
  }

  // === ORDERS EXPORT HANDLERS ===
  const orderRows: OrderReportRow[] = useMemo(() => {
    return ordersDetailed.map((o) => ({
      orderId: o.id,
      date: formatDate(o.date),
      clientName: o.user_name,
      clientEmail: o.user_email,
      clientPhone: o.user_phone,
      products: o.products && o.products.length > 0
        ? o.products.map(p => `${p.product_name || 'Producto'} x${p.qty}`).join(', ')
        : 'Sin detalle',
      total: o.total,
      status: o.status,
      paymentMethod: o.payment_method,
      address: o.address
        ? `${o.address.tipo_via} ${o.address.numero_via}${o.address.letra_via} ${o.address.numero_placa}${o.address.letra_placa}, ${o.address.localidad}${o.address.complemento ? ', ' + o.address.complemento : ''}`
        : undefined,
    }));
  }, [ordersDetailed]);

  async function handleExportOrdersPdf() {
    setOrdersExporting('pdf');
    const ok = await exportOrdersToPdf(orderRows, 'Pedidos - Le Mascotte');
    if (!ok) showMsg('Error al generar PDF de pedidos', 'error');
    setOrdersExporting(null);
  }

  async function handleExportOrdersExcel() {
    setOrdersExporting('excel');
    const ok = await exportOrdersToExcel(orderRows, 'Pedidos - Le Mascotte');
    if (!ok) showMsg('Error al generar Excel de pedidos', 'error');
    setOrdersExporting(null);
  }

  // === USERS EXPORT HANDLERS ===
  const userRows: UserReportRow[] = useMemo(() => {
    return users.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || 'Activo',
    }));
  }, [users]);

  async function handleExportUsersPdf() {
    setUsersExporting('pdf');
    const ok = await exportUsersToPdf(userRows, 'Usuarios - Le Mascotte');
    if (!ok) showMsg('Error al generar PDF de usuarios', 'error');
    setUsersExporting(null);
  }

  async function handleExportUsersExcel() {
    setUsersExporting('excel');
    const ok = await exportUsersToExcel(userRows, 'Usuarios - Le Mascotte');
    if (!ok) showMsg('Error al generar Excel de usuarios', 'error');
    setUsersExporting(null);
  }

  // === PROVEEDORES EXPORT HANDLERS ===
  const proveedorRows: ProveedorReportRow[] = useMemo(() => {
    return proveedores.map((p) => ({
      nombre: p.nombre,
      nit: p.nit,
      contacto: p.contacto,
      telefono: p.telefono,
      email: p.email,
      direccion: p.direccion,
      estado: p.estado,
    }));
  }, [proveedores]);

  async function handleExportProveedoresPdf() {
    setProveedoresExporting('pdf');
    const ok = await exportProveedoresToPdf(proveedorRows, 'Proveedores - Le Mascotte');
    if (!ok) showMsg('Error al generar PDF de proveedores', 'error');
    setProveedoresExporting(null);
  }

  async function handleExportProveedoresExcel() {
    setProveedoresExporting('excel');
    const ok = await exportProveedoresToExcel(proveedorRows, 'Proveedores - Le Mascotte');
    if (!ok) showMsg('Error al generar Excel de proveedores', 'error');
    setProveedoresExporting(null);
  }

  // === TRENDING EXPORT HANDLERS ===
  const trendingAnalyticsRows: TrendingReportRow[] = useMemo(() => {
    const data = analyticsTab === 'carrito' ? cartAnalytics : wishlistAnalytics;
    return data.map((item) => ({
      name: item.name,
      category: '',
      stock: item.stock,
      total_count: item.times_added,
      times_added: item.times_added,
      unique_users: item.unique_users,
    }));
  }, [analyticsTab, cartAnalytics, wishlistAnalytics]);

  const trendingPopularRows: TrendingReportRow[] = useMemo(() => {
    const data = trendingTab === 'carrito' ? cartTrending : wishlistTrending;
    return data.map((item) => ({
      name: item.name,
      category: item.category || '',
      stock: item.stock,
      total_count: item.total_count,
    }));
  }, [trendingTab, cartTrending, wishlistTrending]);

  async function handleExportTrendingPdf() {
    setTrendingExporting('pdf');
    const isAnalytics = analyticsTab === 'carrito' || analyticsTab === 'wishlist';
    const rows = isAnalytics ? trendingAnalyticsRows : trendingPopularRows;
    const title = isAnalytics
      ? `Tendencias Analytics - ${analyticsTab === 'carrito' ? 'Carrito' : 'Wishlist'} - Le Mascotte`
      : `Tendencias Populares - ${trendingTab === 'carrito' ? 'Carrito' : 'Wishlist'} - Le Mascotte`;
    const ok = await exportTrendingToPdf(rows, title, isAnalytics);
    if (!ok) showMsg('Error al generar PDF de tendencias', 'error');
    setTrendingExporting(null);
  }

  async function handleExportTrendingExcel() {
    setTrendingExporting('excel');
    const isAnalytics = analyticsTab === 'carrito' || analyticsTab === 'wishlist';
    const rows = isAnalytics ? trendingAnalyticsRows : trendingPopularRows;
    const title = isAnalytics
      ? `Tendencias Analytics - ${analyticsTab === 'carrito' ? 'Carrito' : 'Wishlist'} - Le Mascotte`
      : `Tendencias Populares - ${trendingTab === 'carrito' ? 'Carrito' : 'Wishlist'} - Le Mascotte`;
    const ok = await exportTrendingToExcel(rows, title, isAnalytics);
    if (!ok) showMsg('Error al generar Excel de tendencias', 'error');
    setTrendingExporting(null);
  }

  // === STATS CLICK HANDLERS ===
  async function handleStatsClick(segmentTitle: string, stockLevel: string) {
    setStatsModalTitle(segmentTitle);
    setStatsModalOpen(true);
    setStatsModalLoading(true);
    const resp = await apiCall({
      action: 'get_inventory_products',
      search: '',
      category: '',
      stock_level: stockLevel,
    });
    if (resp && resp.success && resp.products) {
      setStatsModalProducts(resp.products);
    } else {
      setStatsModalProducts([]);
    }
    setStatsModalLoading(false);
  }

  // --- PRODUCT HANDLERS ---
  function openNewProduct() {
    setProductErrors({});
    setEditingProduct({ id: '', name: '', category: '', price: 0, stock: 0, img: '', status: 'Disponible', desc: '', cantidad_entrada: 0, cantidad_salida: 0, valor_compra: 0 });
    setShowProductModal(true);
  }

  function openEditProduct(p: Product) {
    setProductErrors({});
    setEditingProduct(p);
    setShowProductModal(true);
  }

  async function saveProduct(prod: Product) {
    try {
      const errors: ProductFieldErrors = {};
      const valorCompra = Number(prod.valor_compra ?? 0);
      const stock = Number(prod.stock ?? 0);
      // Auto-calculate price with 80% margin if valor_compra is set
      const price = Number(prod.price) > 0 ? Number(prod.price) : (valorCompra > 0 ? Math.round(valorCompra * 1.80 * 100) / 100 : 0);

      if (!prod.name.trim()) errors.name = 'Ingresa el nombre del producto';
      if (!prod.category) errors.category = 'Selecciona una categoria';
      if (price <= 0) errors.price = 'Ingresa un precio de venta mayor a 0';
      if (!Number.isFinite(stock) || stock < 0) errors.stock = 'El stock no puede ser negativo';
      if (prod.img && prod.img.trim() && !/^https?:\/\/\S+$/i.test(prod.img.trim())) {
        errors.img = 'La URL debe comenzar con http:// o https://';
      }

      if (Object.keys(errors).length > 0) {
        setProductErrors(errors);
        showMsg('Revisa los campos marcados', 'error');
        return;
      }

      const pid = typeof prod.id === 'number' ? (prod.id > 0 ? prod.id : '') : (prod.id ? prod.id : '');
      const payload = {
        action: 'save_dashboard_product',
        id: pid,
        name: prod.name,
        category: prod.category,
        price: price,
        stock: prod.stock ?? 0,
        img: prod.img ?? '',
        desc: prod.desc ?? '',
        status: prod.stock && prod.stock > 0 ? 'Disponible' : 'Agotado',
        cantidad_entrada: prod.cantidad_entrada ?? 0,
        cantidad_salida: prod.cantidad_salida ?? 0,
        valor_compra: prod.valor_compra ?? 0,
      };
      const resp = await apiCall(payload);
      if (resp && resp.success) {
        showMsg('Producto guardado', 'success');
        await refreshDashboardData();
        // Refresh inventory too
        setInventorySearch('');
        setInventoryCategory('');
        setInventoryStockLevel('');
      } else {
        const errorMsg = resp?.message || (resp ? 'Error desconocido del servidor' : 'No se pudo conectar con el servidor');
        showMsg(errorMsg, 'error');
      }
    } catch (e: any) {
      showMsg('Error inesperado: ' + (e?.message || 'desconocido'), 'error');
    }
    setShowProductModal(false);
    setEditingProduct(null);
  }

  async function toggleProductStatus(product: Product) {
    const resp = await apiCall({
      action: 'save_dashboard_product',
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      stock: 0,
      img: product.img || '',
      desc: product.desc || '',
      status: 'Agotado',
    });
    if (resp && resp.success) {
      await refreshDashboardData();
      showMsg('Producto deshabilitado');
    } else {
      showMsg(resp.message || 'Error al deshabilitar producto', 'error');
    }
  }

  // --- USER HANDLERS ---
  function openNewUser() {
    setUserErrors({});
    setEditingUser({ id: '', name: '', email: '', role: 'empleado', status: 'Activo', password: '' });
    setShowUserModal(true);
  }

  function openEditUser(u: User) {
    setUserErrors({});
    setEditingUser(u);
    setShowUserModal(true);
  }

  async function saveUser(u: User & { password?: string }) {
    const errors: UserFieldErrors = {};
    if (!u.name.trim()) errors.name = 'Ingresa el nombre';
    if (!u.email.trim()) {
      errors.email = 'Ingresa el correo';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email.trim())) {
      errors.email = 'Ingresa un correo valido';
    }
    if (!u.role) errors.role = 'Selecciona un rol';
    // For new users, password is required
    if (!u.id && !u.password) errors.password = 'Ingresa una contraseña';
    if (u.password && u.password.length < 6) errors.password = 'Minimo 6 caracteres';
    if (Object.keys(errors).length > 0) {
      setUserErrors(errors);
      showMsg('Revisa los campos marcados', 'error');
      return;
    }
    const uid = (typeof u.id === 'number') ? (u.id > 0 ? u.id : '') : (u.id ? u.id : '');
    const payload: any = { action: 'save_dashboard_user', id: uid, name: u.name, email: u.email, role: u.role, status: u.status ?? 'Activo' };
    if (!uid && u.password) {
      payload.password = u.password;
    }
    const resp = await apiCall(payload);
    if (resp && resp.success) {
      showMsg('Usuario guardado', 'success');
      await refreshDashboardData();
    } else {
      showMsg(resp.message || 'Error guardando usuario', 'error');
    }
    setShowUserModal(false);
    setEditingUser(null);
  }

  async function toggleUserStatus(user: User) {
    const newStatus = user.status === 'Activo' ? 'Bloqueado' : 'Activo';
    const resp = await apiCall({ action: 'save_dashboard_user', id: user.id, name: user.name, email: user.email, role: user.role, status: newStatus });
    if (resp && resp.success) {
      const usersResp = await apiCall({ action: 'get_dashboard_users' });
      if (usersResp && usersResp.success) setUsers(usersResp.users);
      showMsg(`Usuario ${newStatus === 'Activo' ? 'activado' : 'bloqueado'}`);
    } else {
      showMsg(resp.message || 'Error cambiando estado del usuario', 'error');
    }
  }

  // --- PROVEEDOR HANDLERS ---
  function openNewProveedor() {
    setProveedorErrors({});
    setEditingProveedor({ id: '', nombre: '', contacto: '', nit: '', direccion: '', telefono: '', email: '', estado: 'Activo', created_at: '', updated_at: '' });
    setShowProveedorModal(true);
  }

  function openEditProveedor(p: Proveedor) {
    setProveedorErrors({});
    setEditingProveedor(p);
    setShowProveedorModal(true);
  }

  async function saveProveedor(prov: Proveedor) {
    const errors: ProveedorFieldErrors = {};
    if (!prov.nombre.trim()) errors.nombre = 'Ingresa el nombre del proveedor';
    if (!prov.nit.trim()) errors.nit = 'Ingresa el NIT/ID fiscal';
    if (prov.telefono && !/^[0-9]{7,15}$/.test(prov.telefono.trim())) errors.telefono = 'Teléfono inválido (7-15 dígitos)';
    if (prov.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prov.email.trim())) errors.email = 'Correo electrónico inválido';

    if (Object.keys(errors).length > 0) {
      setProveedorErrors(errors);
      showMsg('Revisa los campos marcados', 'error');
      return;
    }

    const payload = {
      action: 'save_dashboard_proveedor',
      id: prov.id,
      nombre: prov.nombre.trim(),
      contacto: prov.contacto.trim(),
      nit: prov.nit.trim(),
      direccion: prov.direccion.trim(),
      telefono: prov.telefono.trim(),
      email: prov.email.trim(),
      estado: prov.estado,
    };
    const resp = await apiCall(payload);
    if (resp && resp.success) {
      showMsg('Proveedor guardado', 'success');
      await refreshDashboardData();
    } else {
      showMsg(resp.message || 'Error guardando proveedor', 'error');
    }
    setShowProveedorModal(false);
    setEditingProveedor(null);
  }

  async function toggleProveedorStatus(prov: Proveedor) {
    const newStatus = prov.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const resp = await apiCall({
      action: 'save_dashboard_proveedor',
      id: prov.id,
      nombre: prov.nombre,
      contacto: prov.contacto,
      nit: prov.nit,
      direccion: prov.direccion,
      telefono: prov.telefono,
      email: prov.email,
      estado: newStatus,
    });
    if (resp && resp.success) {
      await refreshDashboardData();
      showMsg(`Proveedor ${newStatus === 'Activo' ? 'activado' : 'desactivado'}`);
    } else {
      showMsg(resp.message || 'Error cambiando estado', 'error');
    }
  }

  // --- ORDER STATUS: Usa apiCall (que ya funciona para todo) ---
  async function updateOrderStatus(orderId: string, newStatus: string) {
    console.log('[ORDER STATUS] Intentando actualizar pedido', orderId, 'a estado:', newStatus);

    if (changingStatusOrderId === orderId) {
      console.log('[ORDER STATUS] Ya se está actualizando este pedido, ignorando clic duplicado');
      return;
    }

    setChangingStatusOrderId(orderId);

    const prevOrders = [...ordersDetailed];
    const prevSelected = selectedOrder ? { ...selectedOrder } : null;

    // Optimistic update
    setOrdersDetailed((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus, updated_at: new Date().toISOString() });
    }

    console.log('[ORDER STATUS] Enviando petición al servidor...');
    const resp = await apiCall({ action: 'admin_update_order_status', id: orderId, status: newStatus });
    console.log('[ORDER STATUS] Respuesta del servidor:', resp);

    setChangingStatusOrderId(null);

    if (resp && resp.success) {
      showMsg(`Estado actualizado a: ${newStatus}`, 'success');
      await refreshAllData();
    } else {
      console.error('[ORDER STATUS] Error en actualización:', resp);
      setOrdersDetailed(prevOrders);
      if (prevSelected) setSelectedOrder(prevSelected);
      const errorMsg = resp?.message || 'Error al actualizar el estado del pedido';
      showMsg(errorMsg, 'error');
      await refreshAllData();
    }
  }

  function openOrderDetail(order: OrderDetail) {
    setSelectedOrder(order);
    setShowOrderModal(true);
  }

  async function openConfigureHost() {
    setHostInput(apiHost || '');
    setShowHostModal(true);
  }

  async function saveHostFromUI() {
    try {
      if (hostInput && hostInput.trim() !== '') {
        await AsyncStorage.setItem(API_HOST_STORAGE_KEY, hostInput.trim());
        setApiHost(hostInput.trim());
        showMsg('Host guardado', 'success');
      } else {
        await AsyncStorage.removeItem(API_HOST_STORAGE_KEY);
        setApiHost(null);
        showMsg('Host eliminado, usando deteccion automatica', 'success');
      }
    } catch (e) {
      showMsg('Error guardando host', 'error');
    }
    setShowHostModal(false);
  }

  // === MANUAL STATUS CHANGE ===
  async function testCambiarEstado() {
    const id = testPedidoId.trim();
    if (!id) {
      setTestCambiarResult('⚠️ Ingresa un ID de pedido');
      return;
    }
    setTestCambiarResult('⏳ Enviando petición...');
    setTestLoading(true);
    try {
      const baseUrl = `http://${apiHost || CANDIDATE_HOSTS[0]}/${XAMPP_PROJECT_PATH}`;
      try {
        const res = await fetchWithTimeout(baseUrl + '/api/set_pedido_status.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: testNuevoEstado }),
        }, 10000);
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch (e) { json = null; }
        let html = '<h3>📨 Respuesta set_pedido_status.php:</h3><pre>' + text + '</pre>';
        if (json && json.success) {
          html += '\n✅ ÉXITO: ' + json.message;
        } else {
          html += '\n❌ ERROR: ' + (json ? json.message : text.substring(0, 200));
        }
        html += '\n\n<hr>\n<h3>📨 update_pedido_status.php:</h3>';
        try {
          const res2 = await fetchWithTimeout(baseUrl + '/api/update_pedido_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: testNuevoEstado }),
          }, 10000);
          const text2 = await res2.text();
          html += '<pre>' + text2.substring(0, 500) + '</pre>';
        } catch (e2: any) {
          html += 'Error: ' + e2.message;
        }
        setTestCambiarResult(html);
      } catch (e: any) {
        setTestCambiarResult('❌ Error de conexión: ' + (e.message || 'desconocido'));
      }
    } catch (e) {
      setTestCambiarResult('Error inesperado');
    }
    setTestLoading(false);
  }

  const stockLevels = [
    { key: '', label: 'Todo' },
    { key: 'alto', label: 'Stock Alto' },
    { key: 'bajo', label: 'Stock Bajo' },
    { key: 'agotado', label: 'Agotado' },
  ];

  // ---- CARD RENDERERS FOR FLATLIST ----

  function renderProductCard({ item: p, index: idx }: { item: Product; index: number }) {
    return (
      <View style={styles2.card}>
        <View style={styles2.cardRow}>
          <Image source={{ uri: p.img || 'https://via.placeholder.com/50' }} style={styles2.cardImg} />
          <View style={styles2.cardInfo}>
            <Text style={styles2.cardTitle} numberOfLines={2}>{p.name}</Text>
            <Text style={styles2.cardSubtitle}>{p.category}</Text>
            <View style={styles2.cardBadgeRow}>
              <View style={[styles2.cardBadge, { backgroundColor: statusColor(p.status) }]}>
                <Text style={styles2.cardBadgeText}>{p.status}</Text>
              </View>
              <Text style={[styles2.cardStock, { color: (p.stock ?? 0) >= 20 ? '#2d6a4f' : (p.stock ?? 0) > 0 ? '#ffc107' : '#e74c3c' }]}>
                Stock: {p.stock ?? 0}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles2.cardDetails}>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>Venta</Text>
            <Text style={styles2.cardDetailValue}>{money(p.price)}</Text>
          </View>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>Compra</Text>
            <Text style={styles2.cardDetailValue}>{money(p.valor_compra ?? 0)}</Text>
          </View>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>Entr.</Text>
            <Text style={styles2.cardDetailValue}>{p.cantidad_entrada ?? 0}</Text>
          </View>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>Sal.</Text>
            <Text style={styles2.cardDetailValue}>{p.cantidad_salida ?? 0}</Text>
          </View>
        </View>
        <View style={styles2.cardActions}>
          <TouchableOpacity style={styles2.cardBtn} onPress={() => openEditProduct(p)}>
            <Text style={styles2.cardBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles2.cardBtnOutline} onPress={() => toggleProductStatus(p)}>
            <Text style={styles2.cardBtnOutlineText}>Deshab.</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderUserCard({ item: u }: { item: User }) {
    return (
      <View style={styles2.card}>
        <View style={styles2.cardInfo}>
          <View style={styles2.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles2.cardTitle}>{u.name}</Text>
              <Text style={styles2.cardSubtitle}>{u.email}</Text>
            </View>
            <View style={[styles2.roleBadge, { backgroundColor: roleColor(u.role) }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{u.role.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles2.cardStatus, { color: statusColor(u.status) }]}>{u.status}</Text>
        </View>
        <View style={styles2.cardActions}>
          <TouchableOpacity style={styles2.cardBtn} onPress={() => openEditUser(u)}>
            <Text style={styles2.cardBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles2.cardBtnOutline} onPress={() => toggleUserStatus(u)}>
            <Text style={styles2.cardBtnOutlineText}>{u.status === 'Activo' ? 'Bloquear' : 'Activar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderProveedorCard({ item: prov }: { item: Proveedor }) {
    return (
      <View style={styles2.card}>
        <View style={styles2.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles2.cardTitle}>{prov.nombre}</Text>
            {prov.email ? <Text style={styles2.cardSubtitle}>{prov.email}</Text> : null}
            <Text style={styles2.cardSmall}>NIT: {prov.nit}</Text>
          </View>
          <Text style={[styles2.cardStatus, { color: statusColor(prov.estado) }]}>{prov.estado}</Text>
        </View>
        <View style={styles2.cardRow}>
          <Text style={styles2.cardSmall}>📞 {prov.telefono || '—'}</Text>
          <Text style={styles2.cardSmall}>👤 {prov.contacto || '—'}</Text>
        </View>
        <View style={styles2.cardActions}>
          <TouchableOpacity style={styles2.cardBtn} onPress={() => openEditProveedor(prov)}>
            <Text style={styles2.cardBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles2.cardBtnOutline} onPress={() => toggleProveedorStatus(prov)}>
            <Text style={styles2.cardBtnOutlineText}>{prov.estado === 'Activo' ? 'Desact.' : 'Activar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderOrderCard({ item: order }: { item: OrderDetail }) {
    return (
      <View style={styles2.card}>
        <View style={styles2.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles2.cardTitle}>Pedido #{order.id}</Text>
            <Text style={styles2.cardSmall}>{formatDate(order.date)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              const currentStatus = order.status;
              const options = ORDER_STATUSES.filter(s => s !== currentStatus).map(s => ({
                text: s,
                onPress: () => updateOrderStatus(order.id, s)
              }));
              Alert.alert('Cambiar estado', `Selecciona el nuevo estado para el pedido ${order.id}`, [
                ...options,
                { text: 'Cancelar', style: 'cancel' }
              ]);
            }}
            style={[styles2.statusBadge, { backgroundColor: statusColor(order.status) }]}>
            <Text style={styles2.statusBadgeText}>{order.status} ▾</Text>
          </TouchableOpacity>
        </View>
        <View style={styles2.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles2.cardSubtitle}>{order.user_name}</Text>
            <Text style={styles2.cardSmall}>{order.user_email}</Text>
          </View>
          <Text style={styles2.cardPrice}>{money(order.total)}</Text>
        </View>
        <View style={styles2.cardRow}>
          <View style={{ flex: 1 }}>
            {order.products && order.products.slice(0, 2).map((p, i) => (
              <Text key={i} style={styles2.cardSmall}>{p.product_name || 'Producto'} x{p.qty}</Text>
            ))}
            {order.products && order.products.length > 2 && (
              <Text style={styles2.cardSmall}>+{order.products.length - 2} más</Text>
            )}
          </View>
          <TouchableOpacity style={styles2.cardBtnSmall} onPress={() => openOrderDetail(order)}>
            <Text style={styles2.cardBtnSmallText}>Detalle</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles2.cardActions, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0e6ef' }]}>
          <TouchableOpacity style={[styles2.cardBtn, { flex: 1, marginRight: 6 }]} onPress={() => openOrderDetail(order)}>
            <Text style={styles2.cardBtnText}>👁️ Ver</Text>
          </TouchableOpacity>
          {order.status === 'Pendiente' && (
            <>
              <TouchableOpacity 
                style={[styles2.cardBtn, { flex: 1, backgroundColor: '#ffd44d', marginRight: 6 }]} 
                onPress={() => openOrderDetail(order)}
              >
                <Text style={[styles2.cardBtnText, { color: '#6b124f' }]}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles2.cardBtnOutline, { flex: 1, borderColor: '#e74c3c' }]} 
                onPress={() => {
                  Alert.alert('Cancelar Pedido', `¿Estás seguro de cancelar el pedido ${order.id}? El stock será devuelto al inventario.`, [
                    { text: 'No', style: 'cancel' },
                    { 
                      text: 'Sí, Cancelar', 
                      style: 'destructive',
                      onPress: () => updateOrderStatus(order.id, 'Cancelado')
                    }
                  ]);
                }}
              >
                <Text style={[styles2.cardBtnOutlineText, { color: '#e74c3c' }]}>❌ Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  function renderAnalyticsCard({ item, index: idx }: { item: AnalyticsProduct; index: number }) {
    const page = analyticsTab === 'carrito' ? cartAnalyticsPage : wishlistAnalyticsPage;
    return (
      <View style={styles2.card}>
        <View style={styles2.cardRow}>
          <View style={styles2.cardRank}>
            <Text style={styles2.cardRankText}>{page === 1 && idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1 + (page - 1) * PER_PAGE}`}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles2.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles2.cardSubtitle}>{money(item.price)}</Text>
          </View>
        </View>
        <View style={styles2.cardDetails}>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>Veces</Text>
            <View style={{ backgroundColor: analyticsTab === 'carrito' ? '#f0e8ff' : '#fff0f0', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 }}>
              <Text style={{ fontWeight: '900', color: analyticsTab === 'carrito' ? '#7a1458' : '#e74c3c', fontSize: 14 }}>{item.times_added}x</Text>
            </View>
          </View>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>Usuarios</Text>
            <Text style={[styles2.cardDetailValue, { color: '#0d6efd' }]}>{item.unique_users}</Text>
          </View>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>Stock</Text>
            <Text style={[styles2.cardDetailValue, { color: (item.stock ?? 0) > 0 ? '#2d6a4f' : '#e74c3c' }]}>{item.stock ?? 0}</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderTrendingCard({ item, index: idx }: { item: TrendingProduct; index: number }) {
    return (
      <View style={styles2.card}>
        <View style={styles2.cardRow}>
          <View style={styles2.cardRank}>
            <Text style={styles2.cardRankText}>{idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles2.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles2.cardSubtitle}>{item.category || '—'}</Text>
          </View>
        </View>
        <View style={styles2.cardDetails}>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>Stock</Text>
            <Text style={[styles2.cardDetailValue, { color: (item.stock ?? 0) > 0 ? '#2d6a4f' : '#e74c3c' }]}>{item.stock ?? 0}</Text>
          </View>
          <View style={styles2.cardDetailItem}>
            <Text style={styles2.cardDetailLabel}>{trendingTab === 'carrito' ? 'En Carrito' : 'En Wishlist'}</Text>
            <View style={{ backgroundColor: '#f0e8ff', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 }}>
              <Text style={{ fontWeight: '900', color: '#6b124f', fontSize: 14 }}>{item.total_count}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderStatsProductCard({ item: p, index: idx }: { item: Product; index: number }) {
    return (
      <View style={styles2.compactCard}>
        <View style={styles2.cardRow}>
          <Text style={styles2.cardSmall}>#{idx + 1}</Text>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles2.cardTitle} numberOfLines={1}>{p.name}</Text>
          </View>
          <Text style={[styles2.cardDetailValue, { color: (p.stock ?? 0) === 0 ? '#e74c3c' : (p.stock ?? 0) < 5 ? '#ffc107' : '#2d6a4f' }]}>
            {p.stock ?? 0}
          </Text>
          <Text style={[styles2.cardDetailValue, { marginLeft: 12, color: '#7a1458' }]}>{money(p.price)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.safe}>
      <ScrollView contentContainerStyle={sharedStyles.container}>
        <View style={sharedStyles.topNav}>
          <View style={sharedStyles.logoWrap}>
            <Image source={require('../../assets/images/logo.png')} style={sharedStyles.logoImg} />
            <View>
              <Text style={sharedStyles.logoText}>Le Mascotte Admin</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sharedStyles.navLinksScroll}>
            <Pressable style={[sharedStyles.navLink, section === 'dash' && sharedStyles.navLinkActive]} onPress={() => setSection('dash')}><Text style={section === 'dash' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Dashboard</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'productos' && sharedStyles.navLinkActive]} onPress={() => setSection('productos')}><Text style={section === 'productos' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Inventario</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'usuarios' && sharedStyles.navLinkActive]} onPress={() => setSection('usuarios')}><Text style={section === 'usuarios' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Usuarios</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'proveedores' && sharedStyles.navLinkActive]} onPress={() => setSection('proveedores')}><Text style={section === 'proveedores' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Proveedores</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'pedidos' && sharedStyles.navLinkActive]} onPress={() => setSection('pedidos')}><Text style={section === 'pedidos' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Pedidos</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'stats' && sharedStyles.navLinkActive]} onPress={() => setSection('stats')}><Text style={section === 'stats' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Estadisticas</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'tendencias' && sharedStyles.navLinkActive]} onPress={() => setSection('tendencias')}><Text style={section === 'tendencias' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>&#x1F4CA; Tendencias</Text></Pressable>
          </ScrollView>
          <Pressable onPress={openConfigureHost} style={sharedStyles.hostConfigBtn}>
            <Text style={sharedStyles.hostConfigText}>{apiHost ? `API: ${apiHost}` : 'Config API'}</Text>
          </Pressable>
        </View>

        {/* User Header with profile edit and logout - Below topNav */}
        {profileUser && (
          <UserHeader
            userName={profileUser.name}
            userRole={profileUser.role}
            onEditProfile={() => setShowProfileModal(true)}
            onLogout={() => handleLogout(setProfileUser, router, (msg) => showMsg(msg, 'success'))}
            backgroundColor="#f7eef8"
          />
        )}

        {/* Dashboard */}
        {section === 'dash' && (
          <View>
            <View style={sharedStyles.headerSection}>
              <Text style={sharedStyles.pageTitle}>Panel de Administracion</Text>
            </View>
            <View style={sharedStyles.cardRow}>
              <Pressable style={sharedStyles.moduleCard} onPress={() => setSection('productos')}>
                <Text style={sharedStyles.moduleIcon}>📦</Text>
                <Text style={sharedStyles.moduleTitle}>Inventario</Text>
                <Text style={sharedStyles.moduleCount}>{products.length} productos</Text>
              </Pressable>
              <Pressable style={sharedStyles.moduleCard} onPress={() => setSection('usuarios')}>
                <Text style={sharedStyles.moduleIcon}>👤</Text>
                <Text style={sharedStyles.moduleTitle}>Usuarios</Text>
                <Text style={sharedStyles.moduleCount}>{users.length} usuarios</Text>
              </Pressable>
              <Pressable style={sharedStyles.moduleCard} onPress={() => setSection('proveedores')}>
                <Text style={sharedStyles.moduleIcon}>🏢</Text>
                <Text style={sharedStyles.moduleTitle}>Proveedores</Text>
                <Text style={sharedStyles.moduleCount}>{proveedores.length} proveedores</Text>
              </Pressable>
            </View>
            <View style={sharedStyles.cardRow}>
              <Pressable style={sharedStyles.moduleCard} onPress={() => setSection('pedidos')}>
                <Text style={sharedStyles.moduleIcon}>📋</Text>
                <Text style={sharedStyles.moduleTitle}>Pedidos</Text>
                <Text style={sharedStyles.moduleCount}>{ordersCount} pedidos</Text>
              </Pressable>
              <Pressable style={sharedStyles.moduleCard} onPress={() => setSection('stats')}>
                <Text style={sharedStyles.moduleIcon}>📈</Text>
                <Text style={sharedStyles.moduleTitle}>Estadisticas</Text>
                <Text style={sharedStyles.moduleCount}>Resumen operativo</Text>
              </Pressable>
              <Pressable style={sharedStyles.moduleCard} onPress={() => setSection('tendencias')}>
                <Text style={sharedStyles.moduleIcon}>📊</Text>
                <Text style={sharedStyles.moduleTitle}>Tendencias</Text>
                <Text style={sharedStyles.moduleCount}>Productos populares</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* INVENTARIO - Reemplazo completo del módulo de productos */}
        {section === 'productos' && (
          <>
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.sectionTitle}>📦 Inventario Vigente</Text>
              <Pressable style={sharedStyles.btnAdd} onPress={openNewProduct}><Text style={sharedStyles.btnAddText}>+ Nuevo Producto</Text></Pressable>
            </View>

            {/* Filtros dinámicos: Nombre, Categoría, Nivel de Stock */}
            <View style={[sharedStyles.searchRow, { marginTop: 12 }]}>
              <TextInput
                style={sharedStyles.searchInput}
                placeholder="Buscar por nombre..."
                value={inventorySearch}
                onChangeText={setInventorySearch}
                placeholderTextColor="#999"
              />
              {inventorySearch !== '' && (
                <Pressable onPress={() => setInventorySearch('')} style={sharedStyles.clearBtn}>
                  <Text style={sharedStyles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ paddingRight: 16 }}>
              <FilterChip label="Todas" active={inventoryCategory === ''} onPress={() => setInventoryCategory('')} />
              {categories.map((c) => (
                <FilterChip key={c} label={c} active={inventoryCategory === c} onPress={() => setInventoryCategory(c)} />
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }} contentContainerStyle={{ paddingRight: 16 }}>
              {stockLevels.map((sl) => (
                <Pressable
                  key={sl.key}
                  onPress={() => setInventoryStockLevel(sl.key)}
                  style={[
                    sharedStyles.filterChip,
                    inventoryStockLevel === sl.key && sharedStyles.filterChipActive,
                    sl.key === 'bajo' && !inventoryStockLevel ? { borderColor: '#ffc107' } : {},
                    sl.key === 'alto' && !inventoryStockLevel ? { borderColor: '#2d6a4f' } : {},
                    sl.key === 'agotado' && !inventoryStockLevel ? { borderColor: '#e74c3c' } : {},
                  ]}
                >
                  <Text
                    style={[
                      sharedStyles.filterChipText,
                      inventoryStockLevel === sl.key && sharedStyles.filterChipTextActive,
                    ]}
                  >
                    {sl.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Botones de exportación */}
            <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 4, gap: 10 }}>
              <Pressable
                style={[sharedStyles.actionBtn, { backgroundColor: '#dc3545', minWidth: 120 }]}
                onPress={handleExportPdf}
                disabled={exporting !== null || inventoryProducts.length === 0}
              >
                <Text style={sharedStyles.actionBtnText}>
                  {exporting === 'pdf' ? 'Generando...' : '📄 Exportar PDF'}
                </Text>
              </Pressable>
              <Pressable
                style={[sharedStyles.actionBtnSuccess, { minWidth: 120 }]}
                onPress={handleExportExcel}
                disabled={exporting !== null || inventoryProducts.length === 0}
              >
                <Text style={sharedStyles.actionBtnSuccessText}>
                  {exporting === 'excel' ? 'Generando...' : '📊 Exportar Excel'}
                </Text>
              </Pressable>
            </View>

            {/* Lista de productos en formato Card */}
            {inventoryLoading ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>Cargando inventario...</Text></View>
            ) : inventoryProducts.length === 0 ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>No se encontraron productos con los filtros actuales</Text></View>
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {inventoryProducts.map((p) => renderProductCard({ item: p, index: inventoryProducts.indexOf(p) }))}
              </View>
            )}
          </>
        )}

        {/* Usuarios */}
        {section === 'usuarios' && (
          <>
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.sectionTitle}>Control de Usuarios</Text>
              <Pressable style={sharedStyles.btnAdd} onPress={openNewUser}><Text style={sharedStyles.btnAddText}>+ Nuevo Usuario</Text></Pressable>
            </View>
            <View style={sharedStyles.searchRow}>
              <TextInput style={sharedStyles.searchInput} placeholder="Buscar usuarios..." value={userSearch} onChangeText={setUserSearch} placeholderTextColor="#999" />
              {userSearch !== '' && (
                <Pressable onPress={() => setUserSearch('')} style={sharedStyles.clearBtn}>
                  <Text style={sharedStyles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sharedStyles.filterRow} contentContainerStyle={{ paddingRight: 16 }}>
              <FilterChip label="Todos" active={userRoleFilter === ''} onPress={() => setUserRoleFilter('')} />
              {userRoles.map((r) => (
                <FilterChip key={r} label={r === 'admin' ? 'Admin' : r === 'cliente' ? 'Cliente' : 'Empleado'} active={userRoleFilter === r} onPress={() => setUserRoleFilter(r)} />
              ))}
            </ScrollView>

            {/* Botones de exportación */}
            <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 4, gap: 10 }}>
              <Pressable
                style={[sharedStyles.actionBtn, { backgroundColor: '#dc3545', minWidth: 120 }]}
                onPress={handleExportUsersPdf}
                disabled={usersExporting !== null || users.length === 0}
              >
                <Text style={sharedStyles.actionBtnText}>
                  {usersExporting === 'pdf' ? 'Generando...' : '📄 Exportar PDF'}
                </Text>
              </Pressable>
              <Pressable
                style={[sharedStyles.actionBtnSuccess, { minWidth: 120 }]}
                onPress={handleExportUsersExcel}
                disabled={usersExporting !== null || users.length === 0}
              >
                <Text style={sharedStyles.actionBtnSuccessText}>
                  {usersExporting === 'excel' ? 'Generando...' : '📊 Exportar Excel'}
                </Text>
              </Pressable>
            </View>

            {/* Lista de usuarios en formato Card */}
            {users.length === 0 ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>No se encontraron usuarios</Text></View>
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {users.map((u) => <React.Fragment key={u.id}>{renderUserCard({ item: u })}</React.Fragment>)}
              </View>
            )}
          </>
        )}

        {/* ================== PROVEEDORES ================== */}
        {section === 'proveedores' && (
          <>
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.sectionTitle}>🏢 Gesti&oacute;n de Proveedores</Text>
              <Pressable style={sharedStyles.btnAdd} onPress={openNewProveedor}><Text style={sharedStyles.btnAddText}>+ Nuevo Proveedor</Text></Pressable>
            </View>
            <View style={sharedStyles.infoCard}>
              <Text style={sharedStyles.infoCardText}>
                Administra los proveedores de Le Mascotte. Registra nombre, contacto, NIT/ID fiscal, direcci&oacute;n y m&aacute;s.
              </Text>
            </View>
            <View style={sharedStyles.searchRow}>
              <TextInput style={sharedStyles.searchInput} placeholder="Buscar por nombre, NIT o contacto..." value={proveedorSearch} onChangeText={setProveedorSearch} placeholderTextColor="#999" />
              {proveedorSearch !== '' && (
                <Pressable onPress={() => setProveedorSearch('')} style={sharedStyles.clearBtn}>
                  <Text style={sharedStyles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sharedStyles.filterRow} contentContainerStyle={{ paddingRight: 16 }}>
              <FilterChip label="Todos" active={proveedorEstadoFilter === ''} onPress={() => setProveedorEstadoFilter('')} />
              {proveedorEstados.map((e) => (
                <FilterChip key={e} label={e} active={proveedorEstadoFilter === e} onPress={() => setProveedorEstadoFilter(e)} />
              ))}
            </ScrollView>

            {/* Botones de exportación */}
            <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 4, gap: 10 }}>
              <Pressable
                style={[sharedStyles.actionBtn, { backgroundColor: '#dc3545', minWidth: 120 }]}
                onPress={handleExportProveedoresPdf}
                disabled={proveedoresExporting !== null || proveedores.length === 0}
              >
                <Text style={sharedStyles.actionBtnText}>
                  {proveedoresExporting === 'pdf' ? 'Generando...' : '📄 Exportar PDF'}
                </Text>
              </Pressable>
              <Pressable
                style={[sharedStyles.actionBtnSuccess, { minWidth: 120 }]}
                onPress={handleExportProveedoresExcel}
                disabled={proveedoresExporting !== null || proveedores.length === 0}
              >
                <Text style={sharedStyles.actionBtnSuccessText}>
                  {proveedoresExporting === 'excel' ? 'Generando...' : '📊 Exportar Excel'}
                </Text>
              </Pressable>
            </View>

            {/* Lista de proveedores en formato Card */}
            {proveedores.length === 0 ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>No se encontraron proveedores</Text></View>
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {proveedores.map((prov) => renderProveedorCard({ item: prov }))}
              </View>
            )}
          </>
        )}

        {/* Pedidos */}
        {section === 'pedidos' && (
          <>
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.sectionTitle}>📋 Gesti&oacute;n de Pedidos</Text>
              <Text style={sharedStyles.sectionSubtext}>{ordersDetailed.length} pedidos registrados</Text>
            </View>
            <View style={sharedStyles.infoCard}>
              <Text style={sharedStyles.infoCardText}>Administra el estado de los pedidos: Pendiente &rarr; En proceso &rarr; Enviado &rarr; Entregado. Tambi&eacute;n puedes Cancelar.</Text>
            </View>

            {/* Botones de exportación */}
            <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 4, gap: 10 }}>
              <Pressable
                style={[sharedStyles.actionBtn, { backgroundColor: '#dc3545', minWidth: 120 }]}
                onPress={handleExportOrdersPdf}
                disabled={ordersExporting !== null || ordersDetailed.length === 0}
              >
                <Text style={sharedStyles.actionBtnText}>
                  {ordersExporting === 'pdf' ? 'Generando...' : '📄 Exportar PDF'}
                </Text>
              </Pressable>
              <Pressable
                style={[sharedStyles.actionBtnSuccess, { minWidth: 120 }]}
                onPress={handleExportOrdersExcel}
                disabled={ordersExporting !== null || ordersDetailed.length === 0}
              >
                <Text style={sharedStyles.actionBtnSuccessText}>
                  {ordersExporting === 'excel' ? 'Generando...' : '📊 Exportar Excel'}
                </Text>
              </Pressable>
            </View>

            {/* Lista de pedidos en formato Card */}
            {ordersDetailed.length === 0 ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>No hay pedidos registrados</Text></View>
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {ordersDetailed.map((order) => renderOrderCard({ item: order }))}
              </View>
            )}
          </>
        )}

        {/* Cambio Manual de Estado - Herramienta de prueba */}
        {section === 'pedidos' && (
          <View style={{ marginTop: 20, padding: 16, backgroundColor: '#cce5ff', borderRadius: 14, borderLeftWidth: 5, borderLeftColor: '#0d6efd' }}>
            <Text style={{ fontWeight: '900', color: '#004085', marginBottom: 12 }}>🧪 Cambiar Estado Manualmente</Text>
            <Text style={sharedStyles.inputLabel}>ID del Pedido:</Text>
            <TextInput
              style={[sharedStyles.input, { marginTop: 4 }]}
              placeholder="Ej: PED20260624123456123"
              value={testPedidoId}
              onChangeText={setTestPedidoId}
              placeholderTextColor="#999"
            />
            <Text style={[sharedStyles.inputLabel, { marginTop: 10 }]}>Nuevo estado:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setTestNuevoEstado(s)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                    marginRight: 6, marginBottom: 6,
                    backgroundColor: testNuevoEstado === s ? '#0d6efd' : '#fff',
                    borderWidth: 1,
                    borderColor: testNuevoEstado === s ? '#0d6efd' : '#ccc',
                  }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 12, color: testNuevoEstado === s ? '#fff' : '#333' }}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[sharedStyles.actionBtn, { backgroundColor: '#004085', alignSelf: 'flex-start', marginTop: 10 }]}
              onPress={testCambiarEstado}
              disabled={testLoading}
            >
              <Text style={sharedStyles.actionBtnText}>{testLoading ? 'Enviando...' : 'Cambiar Estado'}</Text>
            </Pressable>
            {testCambiarResult !== '' && (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#333' }}>{testCambiarResult}</Text>
              </View>
            )}
          </View>
        )}

        {/* Stats Interactivas */}
        {section === 'stats' && (
          <View>
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.sectionTitle}>📊 Estad&iacute;sticas Avanzadas</Text>
            </View>
            {/* Stock Metric Cards - Cliqueables */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 }}>
              <Pressable
                style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#ffc107', elevation: 3 }}
                onPress={() => handleStatsClick('Productos con Stock Bajo', 'bajo')}
              >
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#ffc107' }}>{productStats?.low_stock ?? 0}</Text>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '700', marginTop: 4 }}>Stock Bajo <Text style={{ fontSize: 11, color: '#999' }}>👆</Text></Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{'Productos con <5 uds.'}</Text>
              </Pressable>
              <Pressable
                style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#2d6a4f', elevation: 3 }}
                onPress={() => handleStatsClick('Productos con Stock Alto', 'alto')}
              >
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#2d6a4f' }}>{productStats?.high_stock ?? 0}</Text>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '700', marginTop: 4 }}>Stock Alto <Text style={{ fontSize: 11, color: '#999' }}>👆</Text></Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{'Productos con \u226520 uds.'}</Text>
              </Pressable>
              <Pressable
                style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#e74c3c', elevation: 3 }}
                onPress={() => handleStatsClick('Productos Sin Stock', 'agotado')}
              >
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#e74c3c' }}>{productStats?.out_of_stock ?? 0}</Text>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '700', marginTop: 4 }}>Sin Stock <Text style={{ fontSize: 11, color: '#999' }}>👆</Text></Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Productos agotados</Text>
              </Pressable>
              <View style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#6b124f', elevation: 3 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#6b124f' }}>{productStats?.total_stock ?? 0}</Text>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '700', marginTop: 4 }}>Total en Stock</Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Unidades totales</Text>
              </View>
            </View>
            {/* Bar Chart */}
            {productStats && productStats.categories && productStats.categories.length > 0 ? (
              <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, elevation: 4 }}>
                <Text style={{ fontWeight: '900', fontSize: 16, color: '#6b124f', marginBottom: 12, textAlign: 'center' }}>Productos por Categor&iacute;a</Text>
                <BarChart
                  data={{
                    labels: productStats.categories.map(c => c.name.length > 8 ? c.name.substring(0, 7) + '…' : c.name),
                    datasets: [{ data: productStats.categories.map(c => c.count || 0.1) }],
                  }}
                  width={Dimensions.get('window').width - 68}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#fff5f5',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(122, 20, 88, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                    barPercentage: 0.6,
                    propsForBackgroundLines: { strokeDasharray: '3,3', stroke: '#f0e6ef' },
                  }}
                  style={{ borderRadius: 12 }}
                />
              </View>
            ) : (
              <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 18, padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#888', fontWeight: '700' }}>No hay datos de categor&iacute;as disponibles</Text>
              </View>
            )}
            {/* Summary card */}
            <View style={{ marginTop: 12, backgroundColor: '#f0e8ff', borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: '#6b124f' }}>
              <Text style={{ fontWeight: '800', color: '#6b124f', fontSize: 15, marginBottom: 4 }}>📦 Resumen de Productos</Text>
              <Text style={{ color: '#555', fontSize: 13, lineHeight: 20 }}>
                Total productos: {productStats?.total_products ?? products.length}{'\n'}
                Con stock bajo: {productStats?.low_stock ?? 0} &middot; Stock alto: {productStats?.high_stock ?? 0}{'\n'}
                Agotados: {productStats?.out_of_stock ?? 0} &middot; Total unidades: {productStats?.total_stock ?? 0}
              </Text>
            </View>
          </View>
        )}

        {/* Tendencias - Enhanced with Analytics de Comportamiento del Cliente */}
        {section === 'tendencias' && (
          <>
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.sectionTitle}>📊 An&aacute;lisis de Tendencias</Text>
              <Text style={sharedStyles.sectionSubtext}>Comportamiento del Cliente</Text>
            </View>

            {/* Sección 1: Productos en Carrito */}
            <View style={{ marginTop: 12 }}>
              {/* Summary Card for Cart */}
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginRight: 6, borderLeftWidth: 5, borderLeftColor: '#7a1458', elevation: 3 }}>
                  <Text style={{ fontSize: 13, color: '#666', fontWeight: '700' }}>🛒 En Carrito</Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#7a1458', marginTop: 4 }}>{cartTotalProducts}</Text>
                  <Text style={{ fontSize: 11, color: '#999' }}>productos distintos en carritos</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginLeft: 6, borderLeftWidth: 5, borderLeftColor: '#e74c3c', elevation: 3 }}>
                  <Text style={{ fontSize: 13, color: '#666', fontWeight: '700' }}>❤️ En Wishlist</Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#e74c3c', marginTop: 4 }}>{wishlistTotalProducts}</Text>
                  <Text style={{ fontSize: 11, color: '#999' }}>productos distintos en wishlists</Text>
                </View>
              </View>
            </View>

            {/* Sub-section tabs: Productos en Carrito / Productos en Wishlist */}
            <View style={{ flexDirection: 'row', marginVertical: 12 }}>
              <Pressable
                onPress={() => { setAnalyticsTab('carrito'); setCartAnalyticsPage(1); }}
                style={[
                  { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginRight: 8 },
                  analyticsTab === 'carrito' ? { backgroundColor: '#7a1458' } : { backgroundColor: '#e8e8e8' },
                ]}
              >
                <Text style={{ fontWeight: '800', fontSize: 13, color: analyticsTab === 'carrito' ? '#fff' : '#666' }}>
                  🛒 Productos en Carrito
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setAnalyticsTab('wishlist'); setWishlistAnalyticsPage(1); }}
                style={[
                  { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginLeft: 8 },
                  analyticsTab === 'wishlist' ? { backgroundColor: '#e74c3c' } : { backgroundColor: '#e8e8e8' },
                ]}
              >
                <Text style={{ fontWeight: '800', fontSize: 13, color: analyticsTab === 'wishlist' ? '#fff' : '#666' }}>
                  ❤️ Productos en Wishlist
                </Text>
              </Pressable>
            </View>

            {/* Botones de exportación para Analytics */}
            <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 4, gap: 10 }}>
              <Pressable
                style={[sharedStyles.actionBtn, { backgroundColor: '#dc3545', minWidth: 120 }]}
                onPress={handleExportTrendingPdf}
                disabled={trendingExporting !== null || (analyticsTab === 'carrito' ? cartAnalytics : wishlistAnalytics).length === 0}
              >
                <Text style={sharedStyles.actionBtnText}>
                  {trendingExporting === 'pdf' ? 'Generando...' : '📄 Exportar PDF'}
                </Text>
              </Pressable>
              <Pressable
                style={[sharedStyles.actionBtnSuccess, { minWidth: 120 }]}
                onPress={handleExportTrendingExcel}
                disabled={trendingExporting !== null || (analyticsTab === 'carrito' ? cartAnalytics : wishlistAnalytics).length === 0}
              >
                <Text style={sharedStyles.actionBtnSuccessText}>
                  {trendingExporting === 'excel' ? 'Generando...' : '📊 Exportar Excel'}
                </Text>
              </Pressable>
            </View>

            {/* Search input for the current analytics tab */}
            <View style={[sharedStyles.searchRow, { marginTop: 0, marginBottom: 4 }]}>
              <TextInput
                style={sharedStyles.searchInput}
                placeholder={analyticsTab === 'carrito' ? 'Buscar producto en carrito...' : 'Buscar producto en wishlist...'}
                value={analyticsTab === 'carrito' ? cartAnalyticsSearch : wishlistAnalyticsSearch}
                onChangeText={(t) => {
                  if (analyticsTab === 'carrito') { setCartAnalyticsSearch(t); setCartAnalyticsPage(1); }
                  else { setWishlistAnalyticsSearch(t); setWishlistAnalyticsPage(1); }
                }}
                placeholderTextColor="#999"
              />
              {(analyticsTab === 'carrito' ? cartAnalyticsSearch : wishlistAnalyticsSearch) !== '' && (
                <Pressable
                  onPress={() => {
                    if (analyticsTab === 'carrito') { setCartAnalyticsSearch(''); setCartAnalyticsPage(1); }
                    else { setWishlistAnalyticsSearch(''); setWishlistAnalyticsPage(1); }
                  }}
                  style={sharedStyles.clearBtn}
                >
                  <Text style={sharedStyles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Analytics Cards */}
            {analyticsLoading ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>Cargando datos...</Text></View>
            ) : (analyticsTab === 'carrito' ? cartAnalytics : wishlistAnalytics).length === 0 ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>No hay datos en {analyticsTab === 'carrito' ? 'carrito' : 'wishlist'}</Text></View>
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {(analyticsTab === 'carrito' ? cartAnalytics : wishlistAnalytics).map((item, idx) => renderAnalyticsCard({ item, index: idx }))}
              </View>
            )}

            {/* Pagination Controls */}
            {(() => {
              const currentTotal = analyticsTab === 'carrito' ? cartAnalyticsTotal : wishlistAnalyticsTotal;
              const currentPage = analyticsTab === 'carrito' ? cartAnalyticsPage : wishlistAnalyticsPage;
              const totalPages = Math.max(1, Math.ceil(currentTotal / PER_PAGE));
              if (totalPages <= 1) return null;
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingVertical: 8 }}>
                  <Pressable
                    onPress={() => {
                      if (currentPage > 1) {
                        if (analyticsTab === 'carrito') setCartAnalyticsPage(currentPage - 1);
                        else setWishlistAnalyticsPage(currentPage - 1);
                      }
                    }}
                    style={[{
                      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginRight: 8,
                      backgroundColor: currentPage > 1 ? '#7a1458' : '#ccc',
                    }]}
                    disabled={currentPage <= 1}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>◀ Anterior</Text>
                  </Pressable>
                  <Text style={{ color: '#666', fontWeight: '700', fontSize: 13, marginHorizontal: 8 }}>
                    Pág. {currentPage} de {totalPages} ({currentTotal} registros)
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (currentPage < totalPages) {
                        if (analyticsTab === 'carrito') setCartAnalyticsPage(currentPage + 1);
                        else setWishlistAnalyticsPage(currentPage + 1);
                      }
                    }}
                    style={[{
                      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginLeft: 8,
                      backgroundColor: currentPage < totalPages ? '#7a1458' : '#ccc',
                    }]}
                    disabled={currentPage >= totalPages}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Siguiente ▶</Text>
                  </Pressable>
                </View>
              );
            })()}

            {/* Info message: Consistency - same product may appear in both sections */}
            <View style={[sharedStyles.infoCard, { marginTop: 12 }]}>
              <Text style={{ fontWeight: '800', color: '#6b124f', fontSize: 13, marginBottom: 2 }}>
                💡 Informaci&oacute;n de Consistencia
              </Text>
              <Text style={sharedStyles.infoCardText}>
                Si un producto aparece en ambas tablas (Carrito y Wishlist), significa que los clientes lo 
                guardan primero en su lista de deseos y luego lo pasan al carrito para comprarlo. 
                Esto indica una alta intenci&oacute;n de compra.
              </Text>
            </View>

            {/* Sección 2: Productos Destacados / Tendencias Populares (existing trending) */}
            <View style={[sharedStyles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={sharedStyles.sectionTitle}>🔥 Tendencias Populares</Text>
              <Text style={sharedStyles.sectionSubtext}>
                {trendingTab === 'carrito'
                  ? `${cartTrending.length} productos en carritos`
                  : `${wishlistTrending.length} productos en wishlists`}
              </Text>
            </View>
            <View style={sharedStyles.infoCard}>
              <Text style={sharedStyles.infoCardText}>
                {trendingTab === 'carrito'
                  ? 'Productos m&aacute;s a&ntilde;adidos al carrito por todos los usuarios. Ordenados por popularidad.'
                  : 'Productos m&aacute;s guardados en listas de deseos por los clientes. Ordenados por popularidad.'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginVertical: 12 }}>
              <Pressable
                onPress={() => setTrendingTab('carrito')}
                style={[
                  { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginRight: 8 },
                  trendingTab === 'carrito' ? { backgroundColor: '#6b124f' } : { backgroundColor: '#e8e8e8' },
                ]}
              >
                <Text style={{ fontWeight: '800', fontSize: 14, color: trendingTab === 'carrito' ? '#fff' : '#666' }}>
                  🛒 Carrito
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTrendingTab('wishlist')}
                style={[
                  { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginLeft: 8 },
                  trendingTab === 'wishlist' ? { backgroundColor: '#6b124f' } : { backgroundColor: '#e8e8e8' },
                ]}
              >
                <Text style={{ fontWeight: '800', fontSize: 14, color: trendingTab === 'wishlist' ? '#fff' : '#666' }}>
                  ❤️ Wishlist
                </Text>
              </Pressable>
            </View>
            {/* Botones de exportación para Tendencias Populares */}
            <View style={{ flexDirection: 'row', marginBottom: 12, gap: 10 }}>
              <Pressable
                style={[sharedStyles.actionBtn, { backgroundColor: '#dc3545', minWidth: 120 }]}
                onPress={handleExportTrendingPdf}
                disabled={trendingExporting !== null || (trendingTab === 'carrito' ? cartTrending : wishlistTrending).length === 0}
              >
                <Text style={sharedStyles.actionBtnText}>
                  {trendingExporting === 'pdf' ? 'Generando...' : '📄 Exportar PDF'}
                </Text>
              </Pressable>
              <Pressable
                style={[sharedStyles.actionBtnSuccess, { minWidth: 120 }]}
                onPress={handleExportTrendingExcel}
                disabled={trendingExporting !== null || (trendingTab === 'carrito' ? cartTrending : wishlistTrending).length === 0}
              >
                <Text style={sharedStyles.actionBtnSuccessText}>
                  {trendingExporting === 'excel' ? 'Generando...' : '📊 Exportar Excel'}
                </Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginVertical: 12 }}>
              <Pressable
                onPress={() => setTrendingOrder('DESC')}
                style={[
                  { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8, marginRight: 8 },
                  trendingOrder === 'DESC' ? { backgroundColor: '#6b124f' } : { backgroundColor: '#e8e8e8' },
                ]}
              >
                <Text style={{ fontWeight: '700', fontSize: 12, color: trendingOrder === 'DESC' ? '#fff' : '#666' }}>
                  🔥 M&aacute;s populares
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTrendingOrder('ASC')}
                style={[
                  { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
                  trendingOrder === 'ASC' ? { backgroundColor: '#6b124f' } : { backgroundColor: '#e8e8e8' },
                ]}
              >
                <Text style={{ fontWeight: '700', fontSize: 12, color: trendingOrder === 'ASC' ? '#fff' : '#666' }}>
                  ❄️ Menos populares
                </Text>
              </Pressable>
            </View>
            {/* Trending Cards */}
            {trendingLoading ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>Cargando tendencias...</Text></View>
            ) : (trendingTab === 'carrito' ? cartTrending : wishlistTrending).length === 0 ? (
              <View style={styles2.card}><Text style={{ color: '#888', fontWeight: '700', textAlign: 'center' }}>No hay datos disponibles</Text></View>
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {(trendingTab === 'carrito' ? cartTrending : wishlistTrending).map((item, idx) => renderTrendingCard({ item, index: idx }))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />

        {/* Host Modal */}
        <Modal visible={showHostModal} animationType="slide" transparent>
          <View style={sharedStyles.modalBackdrop}>
            {renderMessage()}
            <View style={sharedStyles.modalContent}>
              <Text style={sharedStyles.modalTitle}>Configurar host de API</Text>
              <Text style={sharedStyles.inputLabel}>Host (ej: 192.168.1.42 o 10.0.2.2)</Text>
              <TextInput value={hostInput} onChangeText={setHostInput} style={sharedStyles.input} placeholder="IP o hostname" />
              <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'center' }}>
                <Pressable style={[sharedStyles.btnAdd, { flex: 1, marginRight: 8 }]} onPress={saveHostFromUI}><Text style={sharedStyles.btnAddText}>Guardar</Text></Pressable>
                <Pressable style={[sharedStyles.btnDanger, { flex: 1 }]} onPress={() => setShowHostModal(false)}><Text style={sharedStyles.btnDangerText}>Cancelar</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Product Modal - scrollable */}
        <Modal visible={showProductModal} animationType="slide" transparent>
          <View style={sharedStyles.modalBackdrop}>
            {renderMessage()}
            <View style={sharedStyles.modalContent}>
              <Text style={sharedStyles.modalTitle}>{editingProduct && ((typeof editingProduct.id === 'number') ? editingProduct.id > 0 : editingProduct.id !== '') ? 'Editar Producto' : 'Nuevo Producto'}</Text>
              <ScrollView style={{ maxHeight: 450 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {editingProduct && (
                <View>
                  <InputValidado
                    label="Nombre *"
                    value={editingProduct.name}
                    onChangeText={(t) => setEditingProduct({ ...editingProduct, name: t })}
                    validate={(v) => validateOnlyLetters(v, 'El nombre')}
                  />
                  <InputValidado
                    label="Descripción"
                    value={editingProduct.desc ?? ''}
                    onChangeText={(t) => setEditingProduct({ ...editingProduct, desc: t })}
                    validate={() => ({ isValid: true, message: '' })}
                    multiline
                    maxHeight={80}
                  />
                  <Text style={sharedStyles.inputLabel}>Categoría *</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                    {categories.map((c) => (
                      <Pressable key={c} onPress={() => { setEditingProduct({ ...editingProduct, category: c }); clearProductError('category'); }} style={[sharedStyles.categoryChip, editingProduct.category === c && sharedStyles.categoryChipActive, productErrors.category ? sharedStyles.inputError : undefined]}>
                        <Text style={editingProduct.category === c ? sharedStyles.categoryChipTextActive : sharedStyles.categoryChipText}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {fieldError(productErrors.category)}
                  <InputValidado
                    label="Precio de Venta *"
                    value={String(editingProduct.price)}
                    onChangeText={(t) => setEditingProduct({ ...editingProduct, price: Number(t || 0) })}
                    keyboardType="numeric"
                    validate={(v) => validatePrice(v, 'El precio')}
                  />
                  <InputValidado
                    label="Valor Compra"
                    value={String(editingProduct.valor_compra ?? 0)}
                    onChangeText={(t) => setEditingProduct({ ...editingProduct, valor_compra: Number(t || 0) })}
                    keyboardType="numeric"
                    validate={(v) => validateNumeric(v, 'El valor', true)}
                  />
                  <InputValidado
                    label="Cantidad Entrada"
                    value={String(editingProduct.cantidad_entrada ?? 0)}
                    onChangeText={(t) => setEditingProduct({ ...editingProduct, cantidad_entrada: Number(t || 0) })}
                    keyboardType="numeric"
                    validate={(v) => validateNumeric(v, 'La cantidad', true)}
                  />
                  <InputValidado
                    label="Cantidad Salida"
                    value={String(editingProduct.cantidad_salida ?? 0)}
                    onChangeText={(t) => setEditingProduct({ ...editingProduct, cantidad_salida: Number(t || 0) })}
                    keyboardType="numeric"
                    validate={(v) => validateNumeric(v, 'La cantidad', true)}
                  />
                  <InputValidado
                    label="Stock *"
                    value={String(editingProduct.stock ?? '')}
                    onChangeText={(t) => setEditingProduct({ ...editingProduct, stock: Number(t || 0) })}
                    keyboardType="numeric"
                    validate={(v) => validateStock(v)}
                  />
                  <InputValidado
                    label="URL Imagen"
                    value={editingProduct.img ?? ''}
                    onChangeText={(t) => setEditingProduct({ ...editingProduct, img: t })}
                    validate={(v) => validateImageUrl(v)}
                  />
                  <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'center' }}>
                    <Pressable style={[sharedStyles.btnAdd, { flex: 1 }]} onPress={() => editingProduct && saveProduct(editingProduct)}><Text style={sharedStyles.btnAddText}>Guardar</Text></Pressable>
                    <Pressable style={[sharedStyles.btnDanger, { flex: 1 }]} onPress={() => { setShowProductModal(false); setEditingProduct(null); }}><Text style={sharedStyles.btnDangerText}>Cancelar</Text></Pressable>
                  </View>
                </View>
              )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* User Modal */}
        <Modal visible={showUserModal} animationType="slide" transparent>
          <View style={sharedStyles.modalBackdrop}>
            {renderMessage()}
            <View style={sharedStyles.modalContent}>
              <Text style={sharedStyles.modalTitle}>Gestionar Usuario</Text>
              {editingUser && (
                <View>
                  <InputValidado
                    label="Nombre *"
                    value={editingUser.name}
                    onChangeText={(t) => setEditingUser({ ...editingUser, name: t })}
                    validate={(v) => validateOnlyLetters(v, 'El nombre')}
                  />
                  <InputValidado
                    label="Email *"
                    value={editingUser.email}
                    onChangeText={(t) => setEditingUser({ ...editingUser, email: t })}
                    keyboardType="email-address"
                    validate={(v) => validateEmail(v)}
                  />
                  {!editingUser.id && (
                    <InputValidado
                      label="Contraseña *"
                      value={editingUser.password || ''}
                      onChangeText={(t) => setEditingUser({ ...editingUser, password: t })}
                      secureTextEntry
                      placeholder="Mínimo 6 caracteres"
                      validate={(v) => v.length === 0 ? { isValid: false, message: 'Ingresa una contraseña' } : v.length < 6 ? { isValid: false, message: 'Mínimo 6 caracteres' } : { isValid: true, message: '' }}
                    />
                  )}
                  <Text style={sharedStyles.inputLabel}>Rol *</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    {['admin', 'empleado'].map((r) => (
                      <Pressable key={r} onPress={() => { setEditingUser({ ...editingUser, role: r }); clearUserError('role'); }} style={[sharedStyles.categoryChip, editingUser.role === r && sharedStyles.categoryChipActive, userErrors.role ? sharedStyles.inputError : undefined]}>
                        <Text style={editingUser.role === r ? sharedStyles.categoryChipTextActive : sharedStyles.categoryChipText}>{r.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {fieldError(userErrors.role)}
                  <Text style={sharedStyles.inputLabel}>Estado</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <Pressable onPress={() => setEditingUser({ ...editingUser, status: 'Activo' })} style={[sharedStyles.statusChip, editingUser.status === 'Activo' && sharedStyles.statusChipActive]}>
                      <Text style={editingUser.status === 'Activo' ? sharedStyles.statusTextActive : sharedStyles.statusText}>Activo</Text>
                    </Pressable>
                    <Pressable onPress={() => setEditingUser({ ...editingUser, status: 'Bloqueado' })} style={[sharedStyles.statusChip, editingUser.status === 'Bloqueado' && sharedStyles.statusChipActive]}>
                      <Text style={editingUser.status === 'Bloqueado' ? sharedStyles.statusTextActive : sharedStyles.statusText}>Bloqueado</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'center' }}>
                    <Pressable style={[sharedStyles.btnAdd, { flex: 1, backgroundColor: COLORS.primary }]} onPress={() => editingUser && saveUser(editingUser)}><Text style={[sharedStyles.btnAddText, { color: '#fff' }]}>Guardar</Text></Pressable>
                    <Pressable style={[sharedStyles.btnDanger, { flex: 1 }]} onPress={() => { setShowUserModal(false); setEditingUser(null); }}><Text style={sharedStyles.btnDangerText}>Cancelar</Text></Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Proveedor Modal */}
        <Modal visible={showProveedorModal} animationType="slide" transparent>
          <View style={sharedStyles.modalBackdrop}>
            {renderMessage()}
            <View style={sharedStyles.modalContent}>
              <Text style={sharedStyles.modalTitle}>{editingProveedor && editingProveedor.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</Text>
              {editingProveedor && (
                <View>
                  <Text style={sharedStyles.inputLabel}>Nombre *</Text>
                  <TextInput value={editingProveedor.nombre} onChangeText={(t) => { setEditingProveedor({ ...editingProveedor, nombre: t }); clearProveedorError('nombre'); }} style={[sharedStyles.input, proveedorErrors.nombre ? sharedStyles.inputError : undefined]} />
                  {fieldError(proveedorErrors.nombre)}
                  <Text style={sharedStyles.inputLabel}>NIT / ID Fiscal *</Text>
                  <TextInput value={editingProveedor.nit} onChangeText={(t) => { setEditingProveedor({ ...editingProveedor, nit: t }); clearProveedorError('nit'); }} style={[sharedStyles.input, proveedorErrors.nit ? sharedStyles.inputError : undefined]} />
                  {fieldError(proveedorErrors.nit)}
                  <Text style={sharedStyles.inputLabel}>Persona de Contacto</Text>
                  <TextInput value={editingProveedor.contacto} onChangeText={(t) => setEditingProveedor({ ...editingProveedor, contacto: t })} style={sharedStyles.input} />
                  <Text style={sharedStyles.inputLabel}>Direcci&oacute;n</Text>
                  <TextInput value={editingProveedor.direccion} onChangeText={(t) => setEditingProveedor({ ...editingProveedor, direccion: t })} style={sharedStyles.input} />
                  <Text style={sharedStyles.inputLabel}>Tel&eacute;fono</Text>
                  <TextInput keyboardType="phone-pad" value={editingProveedor.telefono} onChangeText={(t) => { setEditingProveedor({ ...editingProveedor, telefono: t }); clearProveedorError('telefono'); }} style={[sharedStyles.input, proveedorErrors.telefono ? sharedStyles.inputError : undefined]} />
                  {fieldError(proveedorErrors.telefono)}
                  <Text style={sharedStyles.inputLabel}>Correo Electr&oacute;nico</Text>
                  <TextInput keyboardType="email-address" value={editingProveedor.email} onChangeText={(t) => { setEditingProveedor({ ...editingProveedor, email: t }); clearProveedorError('email'); }} style={[sharedStyles.input, proveedorErrors.email ? sharedStyles.inputError : undefined]} />
                  {fieldError(proveedorErrors.email)}
                  <Text style={sharedStyles.inputLabel}>Estado</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    {['Activo', 'Inactivo'].map((e) => (
                      <Pressable key={e} onPress={() => setEditingProveedor({ ...editingProveedor, estado: e })} style={[sharedStyles.statusChip, editingProveedor.estado === e && sharedStyles.statusChipActive]}>
                        <Text style={editingProveedor.estado === e ? sharedStyles.statusTextActive : sharedStyles.statusText}>{e}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'center' }}>
                    <Pressable style={[sharedStyles.btnAdd, { flex: 1, backgroundColor: COLORS.primary }]} onPress={() => saveProveedor(editingProveedor)}><Text style={[sharedStyles.btnAddText, { color: '#fff' }]}>Guardar</Text></Pressable>
                    <Pressable style={[sharedStyles.btnDanger, { flex: 1 }]} onPress={() => { setShowProveedorModal(false); setEditingProveedor(null); }}><Text style={sharedStyles.btnDangerText}>Cancelar</Text></Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Order Detail Modal */}
        <Modal visible={showOrderModal} animationType="slide" transparent onRequestClose={() => setShowOrderModal(false)}>
          <View style={sharedStyles.modalBackdrop}>
            {renderMessage()}
            <View style={sharedStyles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={sharedStyles.modalTitle}>📋 Detalle del Pedido</Text>
                <Pressable onPress={() => setShowOrderModal(false)}>
                  <Text style={{ fontSize: 24, color: COLORS.danger, fontWeight: '900' }}>×</Text>
                </Pressable>
              </View>
              {selectedOrder && (
                <ScrollView style={{ maxHeight: 500 }}>
                  <View style={sharedStyles.orderDetailSection}>
                    <Text style={sharedStyles.orderDetailLabel}>ID Pedido</Text>
                    <Text style={sharedStyles.orderDetailValue}>{selectedOrder.id}</Text>
                  </View>
                  <View style={sharedStyles.orderDetailSection}>
                    <Text style={sharedStyles.orderDetailLabel}>Fecha</Text>
                    <Text style={sharedStyles.orderDetailValue}>{formatDate(selectedOrder.date)}</Text>
                  </View>
                  {selectedOrder.updated_at && (
                    <View style={sharedStyles.orderDetailSection}>
                      <Text style={sharedStyles.orderDetailLabel}>&Uacute;ltima actualizaci&oacute;n</Text>
                      <Text style={sharedStyles.orderDetailValue}>{formatDate(selectedOrder.updated_at)}</Text>
                    </View>
                  )}
                  <View style={sharedStyles.orderDetailSection}>
                    <Text style={sharedStyles.orderDetailLabel}>Cliente</Text>
                    <Text style={sharedStyles.orderDetailValue}>{selectedOrder.user_name}</Text>
                    <Text style={sharedStyles.orderDetailSubValue}>{selectedOrder.user_email}</Text>
                    {selectedOrder.user_phone ? (
                      <Text style={sharedStyles.orderDetailSubValue}>📞 {selectedOrder.user_phone}</Text>
                    ) : null}
                  </View>
                  <View style={sharedStyles.orderDetailSection}>
                    <Text style={sharedStyles.orderDetailLabel}>Forma de pago</Text>
                    <Text style={sharedStyles.orderDetailValue}>{selectedOrder.payment_method || 'No especificado'}</Text>
                  </View>
                  <View style={sharedStyles.orderDetailSection}>
                    <Text style={sharedStyles.orderDetailLabel}>Total</Text>
                    <Text style={[sharedStyles.orderDetailValue, { fontWeight: '900', color: COLORS.primary }]}>{money(selectedOrder.total)}</Text>
                  </View>
                  <Text style={[sharedStyles.orderDetailLabel, { marginTop: 12, fontWeight: '900', fontSize: 15 }]}>Productos</Text>
                  {selectedOrder.products && selectedOrder.products.length > 0 ? (
                    selectedOrder.products.map((p, idx) => (
                      <View key={idx} style={sharedStyles.orderProductRow}>
                        <Text style={{ flex: 2, color: '#333' }}>{p.product_name || 'Producto'}</Text>
                        <Text style={{ flex: 0.7, color: '#666' }}>x{p.qty}</Text>
                        <Text style={{ flex: 1, color: COLORS.primary, fontWeight: '800', textAlign: 'right' }}>{money(p.unit_price * p.qty)}</Text>
                      </View>
                    ))
                  ) : <Text style={{ color: '#888' }}>Sin detalle de productos</Text>}
                  {selectedOrder.address && (
                    <>
                      <Text style={[sharedStyles.orderDetailLabel, { marginTop: 12, fontWeight: '900', fontSize: 15 }]}>Direcci&oacute;n de env&iacute;o</Text>
                      <View style={sharedStyles.orderDetailSection}>
                        <Text style={sharedStyles.orderDetailValue}>
                          {selectedOrder.address.tipo_via} {selectedOrder.address.numero_via}
                          {selectedOrder.address.letra_via ? ` ${selectedOrder.address.letra_via}` : ''} # 
                          {selectedOrder.address.numero_placa}
                          {selectedOrder.address.letra_placa ? ` ${selectedOrder.address.letra_placa}` : ''}
                        </Text>
                        <Text style={sharedStyles.orderDetailSubValue}>{selectedOrder.address.localidad}</Text>
                        {selectedOrder.address.complemento ? <Text style={sharedStyles.orderDetailSubValue}>{selectedOrder.address.complemento}</Text> : null}
                      </View>
                    </>
                  )}
                  <Text style={[sharedStyles.orderDetailLabel, { marginTop: 16, fontWeight: '900', fontSize: 15 }]}>Estado actual</Text>
                  <View style={[sharedStyles.statusBadge, { backgroundColor: statusColor(selectedOrder.status), alignSelf: 'flex-start', marginBottom: 12 }]}>
                    <Text style={sharedStyles.statusBadgeText}>{selectedOrder.status}</Text>
                  </View>
                  <Text style={[sharedStyles.orderDetailLabel, { fontWeight: '800', marginBottom: 8 }]}>Cambiar estado:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {ORDER_STATUSES.map((status) => {
                      const isActive = selectedOrder.status === status;
                      const isChanging = changingStatusOrderId === selectedOrder.id;
                      const statusColors: Record<string, string> = {
                        'Pendiente': '#ffc107', 'Preparando': '#0d6efd', 'Enviado': '#6f42c1',
                        'Entregado': '#2d6a4f', 'Cancelado': '#e74c3c',
                      };
                      return (
                        <Pressable
                          key={status}
                          onPress={() => {
                            if (status !== selectedOrder.status && !isChanging) {
                              Alert.alert('Cambiar estado', `¿Actualizar pedido ${selectedOrder.id} a "${status}"?`, [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Actualizar', onPress: () => updateOrderStatus(selectedOrder.id, status) }
                              ]);
                            }
                          }}
                          disabled={isChanging}
                          style={[
                            sharedStyles.statusChangeChip,
                            { borderColor: statusColors[status] || '#ccc' },
                            isActive && { backgroundColor: statusColors[status] || '#ccc' },
                            isChanging && { opacity: 0.6 }
                          ]}
                        >
                          <Text style={[sharedStyles.statusChangeChipText, { color: statusColors[status] || '#666' }, isActive && { color: '#fff' }]}>
                            {isChanging && isActive ? 'Guardando...' : status}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable style={[sharedStyles.btnAdd, { marginTop: 16 }]} onPress={() => setShowOrderModal(false)}>
                    <Text style={sharedStyles.btnAddText}>Cerrar</Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Stats Click Modal - Products by segment */}
        <Modal visible={statsModalOpen} animationType="slide" transparent onRequestClose={() => setStatsModalOpen(false)}>
          <View style={sharedStyles.modalBackdrop}>
            {renderMessage()}
            <View style={sharedStyles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={sharedStyles.modalTitle}>📦 {statsModalTitle}</Text>
                <Pressable onPress={() => setStatsModalOpen(false)}>
                  <Text style={{ fontSize: 24, color: COLORS.danger, fontWeight: '900' }}>×</Text>
                </Pressable>
              </View>
              {statsModalLoading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#888', fontWeight: '700' }}>Cargando productos...</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 400 }}>
                  {statsModalProducts.length === 0 ? (
                    <Text style={{ color: '#888', fontWeight: '700', textAlign: 'center', padding: 20 }}>
                      No hay productos en este segmento
                    </Text>
                  ) : (
                    <View style={{ paddingBottom: 8 }}>
                      {statsModalProducts.map((p, idx) => renderStatsProductCard({ item: p, index: idx }))}
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Edit Profile Modal */}
        <EditProfileForm
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentUser={profileUser}
          onUserUpdated={(updatedUser) => {
            setProfileUser(updatedUser);
            showMsg('Perfil actualizado', 'success');
          }}
          showToast={(msg) => showMsg(msg, 'success')}
        />

      </ScrollView>
      {renderMessage()}
    </SafeAreaView>
  );
}

// ---- MOBILE-FRIENDLY CARD STYLES ----
const styles2: Record<string, any> = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0dcea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  compactCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0dcea',
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fdeef7',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '900',
    color: '#2c2c2c',
    fontSize: 15,
    marginBottom: 2,
  },
  cardSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  cardSmall: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  cardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cardBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
  },
  cardStock: {
    fontWeight: '800',
    fontSize: 12,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0e6ef',
    marginTop: 8,
  },
  cardDetailItem: {
    alignItems: 'center',
  },
  cardDetailLabel: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardDetailValue: {
    color: '#2c2c2c',
    fontWeight: '800',
    fontSize: 13,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  cardBtn: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  cardBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  cardBtnSmall: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardBtnSmallText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  cardBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  cardBtnOutlineText: {
    color: '#dc3545',
    fontWeight: '900',
    fontSize: 13,
  },
  cardPrice: {
    color: '#7a1458',
    fontWeight: '900',
    fontSize: 16,
  },
  cardStatus: {
    fontWeight: '800',
    fontSize: 13,
    marginTop: 4,
  },
  cardRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardRankText: {
    fontWeight: '900',
    color: '#6b124f',
    fontSize: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
  },
};
