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
  Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, sharedStyles, money, statusColor, roleColor, formatDate, FilterChip } from './shared/styles';
import { exportToPdf, exportToExcel, ReportRow } from '../../utils/ReportGenerator';
import InputValidado from '../components/InputValidado';
import { validateOnlyLetters, validateNumeric, validateEmail, validatePhone, validateImageUrl, validateStock, validatePrice, validateNit } from '../../utils/Validators';

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

type User = { id: number | string; name: string; email: string; role: string; status?: string };

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

type ProductFieldErrors = Partial<Record<'name' | 'category' | 'price' | 'stock' | 'img', string>>;
type UserFieldErrors = Partial<Record<'name' | 'email' | 'role', string>>;
type ProveedorFieldErrors = Partial<Record<'nombre' | 'contacto' | 'nit' | 'direccion' | 'telefono' | 'email', string>>;

const initialProducts: Product[] = [];
const initialUsers: User[] = [];

const XAMPP_PROJECT_PATH = 'Mocap%20Le%20Mascotte.V4.2.0';
const CANDIDATE_HOSTS = ['localhost', '172.30.4.104', '172.30.5.119', '10.0.2.2', '172.20.0.40', '192.168.101.16'];
const API_HOST_STORAGE_KEY = 'lemascotte_api_host_empleado_v2';

const getApiUrlFromHost = (host: string) => `http://${host}/${XAMPP_PROJECT_PATH}/models/ajax_lemascotte.php`;

export default function EmpleadoPage() {
  const [apiHost, setApiHost] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchWithTimeout(url: string, opts: any = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
  }

  async function tryFetchOnce(host: string, payload: any) {
    const url = getApiUrlFromHost(host);
    try {
      const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, 8000);
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      if (ct.includes('application/json')) {
        try { return JSON.parse(text); } catch (e) { return { success: false, message: 'JSON parse error' }; }
      }
      return { success: false, message: text || `HTTP ${res.status}` };
    } catch (err) {
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
    return { success: false, message: 'No se pudo conectar con el servidor.' };
  }

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [productErrors, setProductErrors] = useState<ProductFieldErrors>({});
  const [userErrors, setUserErrors] = useState<UserFieldErrors>({});
  const [proveedorErrors, setProveedorErrors] = useState<ProveedorFieldErrors>({});

  const [section, setSection] = useState<'dash' | 'productos' | 'usuarios' | 'stats' | 'proveedores'>('dash');

  // === INVENTORY STATE ===
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('');
  const [inventoryStockLevel, setInventoryStockLevel] = useState('');
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  // === STATS CLICK MODAL ===
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTitle, setStatsModalTitle] = useState('');
  const [statsModalProducts, setStatsModalProducts] = useState<Product[]>([]);
  const [statsModalLoading, setStatsModalLoading] = useState(false);

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

  // Stats state
  const [productStats, setProductStats] = useState<{
    total_products: number;
    categories: Array<{ name: string; count: number }>;
    low_stock: number;
    high_stock: number;
    out_of_stock: number;
    total_stock: number;
  } | null>(null);

  const categories = ['Perros', 'Gatos', 'Accesorios', 'Peces', 'Aves', 'Pequeñas Mascotas', 'Salud', 'Higiene', 'Ofertas'];
  const userRoles = ['admin', 'cliente', 'empleado'];
  const proveedorEstados = ['Activo', 'Inactivo'];

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
  }, []);

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

  const stockLevels = [
    { key: '', label: 'Todo' },
    { key: 'alto', label: 'Stock Alto' },
    { key: 'bajo', label: 'Stock Bajo' },
    { key: 'agotado', label: 'Agotado' },
  ];

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

    const statsResp = await apiCall({ action: 'get_product_stats' });
    if (statsResp && statsResp.success && statsResp.stats) {
      setProductStats(statsResp.stats);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(API_HOST_STORAGE_KEY);
        if (stored) setApiHost(stored);
      } catch (e) {}
      await refreshDashboardData();
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => { refreshDashboardData(); }, 10000);
    return () => clearInterval(interval);
  }, []);

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

      const pid = (typeof prod.id === 'number') ? (prod.id > 0 ? prod.id : '') : (prod.id ? prod.id : '');
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

  // --- USER HANDLERS ---
  function openNewUser() {
    setUserErrors({});
    setEditingUser({ id: '', name: '', email: '', role: 'cliente', status: 'Activo' });
    setShowUserModal(true);
  }

  function openEditUser(u: User) {
    setUserErrors({});
    setEditingUser(u);
    setShowUserModal(true);
  }

  async function saveUser(u: User) {
    const errors: UserFieldErrors = {};
    if (!u.name.trim()) errors.name = 'Ingresa el nombre';
    if (!u.email.trim()) {
      errors.email = 'Ingresa el correo';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email.trim())) {
      errors.email = 'Ingresa un correo valido';
    }
    if (!u.role) errors.role = 'Selecciona un rol';
    if (Object.keys(errors).length > 0) {
      setUserErrors(errors);
      showMsg('Revisa los campos marcados', 'error');
      return;
    }
    const uid = (typeof u.id === 'number') ? (u.id > 0 ? u.id : '') : (u.id ? u.id : '');
    const payload = { action: 'save_dashboard_user', id: uid, name: u.name, email: u.email, role: u.role, status: u.status ?? 'Activo' };
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

  return (
    <SafeAreaView style={sharedStyles.safe}>
      <ScrollView contentContainerStyle={sharedStyles.container}>
        <View style={sharedStyles.topNav}>
          <View style={sharedStyles.logoWrap}>
            <Image source={require('../../assets/images/logo.png')} style={sharedStyles.logoImg} />
            <View>
              <Text style={sharedStyles.logoText}>Le Mascotte Empleado</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sharedStyles.navLinksScroll}>
            <Pressable style={[sharedStyles.navLink, section === 'dash' && sharedStyles.navLinkActive]} onPress={() => setSection('dash')}><Text style={section === 'dash' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Dashboard</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'productos' && sharedStyles.navLinkActive]} onPress={() => setSection('productos')}><Text style={section === 'productos' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Productos</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'usuarios' && sharedStyles.navLinkActive]} onPress={() => setSection('usuarios')}><Text style={section === 'usuarios' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Usuarios</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'proveedores' && sharedStyles.navLinkActive]} onPress={() => setSection('proveedores')}><Text style={section === 'proveedores' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Proveedores</Text></Pressable>
            <Pressable style={[sharedStyles.navLink, section === 'stats' && sharedStyles.navLinkActive]} onPress={() => setSection('stats')}><Text style={section === 'stats' ? sharedStyles.navLinkTextActive : sharedStyles.navLinkText}>Estadísticas</Text></Pressable>
          </ScrollView>
        </View>

        {/* Alerta flotante */}
        {renderMessage()}

        {/* Dashboard */}
        {section === 'dash' && (
          <View>
            <View style={sharedStyles.headerSection}>
              <Text style={sharedStyles.pageTitle}>Panel de Administración</Text>
            </View>
            <View style={sharedStyles.cardRow}>
              <Pressable style={sharedStyles.moduleCard} onPress={() => setSection('productos')}>
                <Text style={sharedStyles.moduleIcon}>📦</Text>
                <Text style={sharedStyles.moduleTitle}>Productos</Text>
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
              <Pressable style={sharedStyles.moduleCard} onPress={() => setSection('stats')}>
                <Text style={sharedStyles.moduleIcon}>📈</Text>
                <Text style={sharedStyles.moduleTitle}>Estadísticas</Text>
                <Text style={sharedStyles.moduleCount}>Resumen operativo</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* INVENTARIO - Módulo avanzado con filtros y exportación */}
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

            {/* Tabla de inventario con nuevas columnas */}
            <View style={sharedStyles.tableWrap}>
              <View style={[sharedStyles.tableRow, sharedStyles.tableHead]}>
                <View style={[sharedStyles.td, { flex: 0.5 }]}><Text style={sharedStyles.tdHeader}>#</Text></View>
                <View style={[sharedStyles.td, { flex: 0.7 }]}><Text style={sharedStyles.tdHeader}>Img</Text></View>
                <View style={[sharedStyles.td, { flex: 1.1 }]}><Text style={sharedStyles.tdHeader}>Nombre</Text></View>
                <View style={[sharedStyles.td, { flex: 0.8 }]}><Text style={sharedStyles.tdHeader}>Categoria</Text></View>
                <View style={[sharedStyles.td, { flex: 0.7 }]}><Text style={sharedStyles.tdHeader}>Venta</Text></View>
                <View style={[sharedStyles.td, { flex: 0.7 }]}><Text style={sharedStyles.tdHeader}>Compra</Text></View>
                <View style={[sharedStyles.td, { flex: 0.5 }]}><Text style={sharedStyles.tdHeader}>Entr.</Text></View>
                <View style={[sharedStyles.td, { flex: 0.5 }]}><Text style={sharedStyles.tdHeader}>Sal.</Text></View>
                <View style={[sharedStyles.td, { flex: 0.5 }]}><Text style={sharedStyles.tdHeader}>Stock</Text></View>
                <View style={[sharedStyles.td, { flex: 0.7 }]}><Text style={sharedStyles.tdHeader}>Estado</Text></View>
                <View style={[sharedStyles.td, { flex: 1 }]}><Text style={sharedStyles.tdHeader}>Acciones</Text></View>
              </View>
              {inventoryLoading ? (
                <View style={[sharedStyles.tableRow, sharedStyles.tableBodyRow]}>
                  <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: '#888', fontWeight: '700' }}>Cargando inventario...</Text>
                  </View>
                </View>
              ) : inventoryProducts.length === 0 ? (
                <View style={[sharedStyles.tableRow, sharedStyles.tableBodyRow]}>
                  <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: '#888', fontWeight: '700' }}>No se encontraron productos con los filtros actuales</Text>
                  </View>
                </View>
              ) : inventoryProducts.map((p, idx) => (
                <View style={[sharedStyles.tableRow, sharedStyles.tableBodyRow]} key={String(p.id)}>
                  <View style={[sharedStyles.td, { flex: 0.5 }]}><Text style={sharedStyles.tdText}>{idx + 1}</Text></View>
                  <View style={[sharedStyles.td, { flex: 0.7 }]}>
                    <Image source={{ uri: p.img || 'https://via.placeholder.com/50' }} style={sharedStyles.rowImg} />
                  </View>
                  <View style={[sharedStyles.td, { flex: 1.1, paddingRight: 4 }]}><Text style={[sharedStyles.tdText, { fontSize: 11 }]} numberOfLines={1}>{p.name}</Text></View>
                  <View style={[sharedStyles.td, { flex: 0.8, paddingRight: 4 }]}><Text style={[sharedStyles.tdText, { fontSize: 10 }]} numberOfLines={1}>{p.category}</Text></View>
                  <View style={[sharedStyles.td, { flex: 0.7 }]}><Text style={[sharedStyles.tdText, sharedStyles.tdPrice, { fontSize: 11 }]}>{money(p.price)}</Text></View>
                  <View style={[sharedStyles.td, { flex: 0.7 }]}><Text style={[sharedStyles.tdText, { fontSize: 10 }]}>{money(p.valor_compra ?? 0)}</Text></View>
                  <View style={[sharedStyles.td, { flex: 0.5 }]}><Text style={[sharedStyles.tdText, { fontSize: 11 }]}>{p.cantidad_entrada ?? 0}</Text></View>
                  <View style={[sharedStyles.td, { flex: 0.5 }]}><Text style={[sharedStyles.tdText, { fontSize: 11 }]}>{p.cantidad_salida ?? 0}</Text></View>
                  <View style={[sharedStyles.td, { flex: 0.5 }]}>
                    <Text style={[sharedStyles.tdText, { fontSize: 11, fontWeight: '800', color: (p.stock ?? 0) >= 20 ? '#2d6a4f' : (p.stock ?? 0) > 0 ? '#ffc107' : '#e74c3c' }]}>
                      {p.stock ?? 0}
                    </Text>
                  </View>
                  <View style={[sharedStyles.td, { flex: 0.7 }]}>
                    <Text style={[sharedStyles.tdText, { fontSize: 10, fontWeight: '800', color: statusColor(p.status) }]}>{p.status}</Text>
                  </View>
                  <View style={[sharedStyles.td, { flexDirection: 'row', flex: 1 }]}>
                    <Pressable style={sharedStyles.actionBtn} onPress={() => openEditProduct(p)}><Text style={sharedStyles.actionBtnText}>Editar</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
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
            <View style={sharedStyles.tableWrap}>
              <View style={[sharedStyles.tableRow, sharedStyles.tableHead]}>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader]}>Nombre</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader]}>Email</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader]}>Rol</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader]}>Estado</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader]}>Acciones</Text>
              </View>
              {users.length === 0 ? (
                <View style={sharedStyles.tableRow}>
                  <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: '#888', fontWeight: '700' }}>No se encontraron usuarios</Text>
                  </View>
                </View>
              ) : users.map((u) => (
                <View style={sharedStyles.tableRow} key={String(u.id)}>
                  <View style={sharedStyles.td}><Text style={sharedStyles.tdText}>{u.name}</Text></View>
                  <View style={sharedStyles.td}><Text style={sharedStyles.tdText}>{u.email}</Text></View>
                  <View style={sharedStyles.td}><View style={[sharedStyles.roleBadge, { backgroundColor: roleColor(u.role) }]}><Text style={{ color: '#fff', fontWeight: '800' }}>{u.role.toUpperCase()}</Text></View></View>
                  <View style={sharedStyles.td}><Text style={[sharedStyles.tdText, { fontWeight: '800', color: statusColor(u.status) }]}>{u.status}</Text></View>
                  <View style={[sharedStyles.td, { flexDirection: 'row' }]}>
                    <Pressable style={sharedStyles.actionBtn} onPress={() => openEditUser(u)}><Text style={sharedStyles.actionBtnText}>Editar</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ================== PROVEEDORES ================== */}
        {section === 'proveedores' && (
          <>
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.sectionTitle}>🏢 Gestión de Proveedores</Text>
              <Pressable style={sharedStyles.btnAdd} onPress={openNewProveedor}><Text style={sharedStyles.btnAddText}>+ Nuevo Proveedor</Text></Pressable>
            </View>
            <View style={sharedStyles.infoCard}>
              <Text style={sharedStyles.infoCardText}>
                Administra los proveedores de Le Mascotte. Registra nombre, contacto, NIT/ID fiscal, dirección y más.
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
            <View style={sharedStyles.tableWrap}>
              <View style={[sharedStyles.tableRow, sharedStyles.tableHead]}>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader, { flex: 1.5 }]}>Nombre</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader, { flex: 1 }]}>NIT</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader, { flex: 1 }]}>Contacto</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader, { flex: 1 }]}>Teléfono</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader, { flex: 1 }]}>Estado</Text>
                <Text style={[sharedStyles.td, sharedStyles.tdHeader, { flex: 1.5 }]}>Acciones</Text>
              </View>
              {proveedores.length === 0 ? (
                <View style={sharedStyles.tableRow}>
                  <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: '#888', fontWeight: '700' }}>No se encontraron proveedores</Text>
                  </View>
                </View>
              ) : proveedores.map((prov) => (
                <View style={[sharedStyles.tableRow, sharedStyles.tableBodyRow]} key={prov.id}>
                  <View style={[sharedStyles.td, { flex: 1.5 }]}>
                    <Text style={sharedStyles.tdText}>{prov.nombre}</Text>
                    {prov.email ? <Text style={sharedStyles.tdSubText}>{prov.email}</Text> : null}
                  </View>
                  <View style={[sharedStyles.td, { flex: 1 }]}><Text style={sharedStyles.tdText}>{prov.nit}</Text></View>
                  <View style={[sharedStyles.td, { flex: 1 }]}><Text style={sharedStyles.tdText}>{prov.contacto || '—'}</Text></View>
                  <View style={[sharedStyles.td, { flex: 1 }]}><Text style={sharedStyles.tdText}>{prov.telefono || '—'}</Text></View>
                  <View style={[sharedStyles.td, { flex: 1 }]}>
                    <Text style={[sharedStyles.tdText, { fontWeight: '800', color: statusColor(prov.estado) }]}>{prov.estado}</Text>
                  </View>
                  <View style={[sharedStyles.td, { flexDirection: 'row', flex: 1.5 }]}>
                    <Pressable style={sharedStyles.actionBtn} onPress={() => openEditProveedor(prov)}><Text style={sharedStyles.actionBtnText}>Editar</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Stats */}
        {section === 'stats' && (
          <View>
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.sectionTitle}>📊 Estadísticas Avanzadas</Text>
            </View>
            {/* Stock Metric Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 }}>
              <View style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#ffc107', elevation: 3 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#ffc107' }}>{productStats?.low_stock ?? 0}</Text>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '700', marginTop: 4 }}>Stock Bajo</Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{'Productos con <5 uds.'}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#2d6a4f', elevation: 3 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#2d6a4f' }}>{productStats?.high_stock ?? 0}</Text>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '700', marginTop: 4 }}>Stock Alto</Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{'Productos con \u226520 uds.'}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#e74c3c', elevation: 3 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#e74c3c' }}>{productStats?.out_of_stock ?? 0}</Text>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '700', marginTop: 4 }}>Sin Stock</Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Productos agotados</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#6b124f', elevation: 3 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#6b124f' }}>{productStats?.total_stock ?? 0}</Text>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '700', marginTop: 4 }}>Total en Stock</Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Unidades totales</Text>
              </View>
            </View>
            {/* Bar Chart */}
            {productStats && productStats.categories && productStats.categories.length > 0 ? (
              <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, elevation: 4 }}>
                <Text style={{ fontWeight: '900', fontSize: 16, color: '#6b124f', marginBottom: 12, textAlign: 'center' }}>Productos por Categoría</Text>
                <BarChart
                  data={{
                    labels: productStats.categories.map(c => c.name.length > 8 ? c.name.substring(0, 7) + '\u2026' : c.name),
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
                <Text style={{ color: '#888', fontWeight: '700' }}>No hay datos de categorías disponibles</Text>
              </View>
            )}
            {/* Summary card */}
            <View style={{ marginTop: 12, backgroundColor: '#f0e8ff', borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: '#6b124f' }}>
              <Text style={{ fontWeight: '800', color: '#6b124f', fontSize: 15, marginBottom: 4 }}>📦 Resumen de Productos</Text>
              <Text style={{ color: '#555', fontSize: 13, lineHeight: 20 }}>
                Total productos: {productStats?.total_products ?? products.length}{'\n'}
                Con stock bajo: {productStats?.low_stock ?? 0} · Stock alto: {productStats?.high_stock ?? 0}{'\n'}
                Agotados: {productStats?.out_of_stock ?? 0} · Total unidades: {productStats?.total_stock ?? 0}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />

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
                  <Text style={sharedStyles.inputLabel}>Rol *</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    {['admin', 'cliente', 'empleado'].map((r) => (
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
                  <InputValidado
                    label="Nombre *"
                    value={editingProveedor.nombre}
                    onChangeText={(t) => setEditingProveedor({ ...editingProveedor, nombre: t })}
                    validate={(v) => validateOnlyLetters(v, 'El nombre')}
                  />
                  <InputValidado
                    label="NIT / ID Fiscal *"
                    value={editingProveedor.nit}
                    onChangeText={(t) => setEditingProveedor({ ...editingProveedor, nit: t })}
                    validate={(v) => validateNit(v)}
                  />
                  <InputValidado
                    label="Persona de Contacto"
                    value={editingProveedor.contacto}
                    onChangeText={(t) => setEditingProveedor({ ...editingProveedor, contacto: t })}
                    validate={(v) => validateOnlyLetters(v, 'El contacto')}
                  />
                  <InputValidado
                    label="Dirección"
                    value={editingProveedor.direccion}
                    onChangeText={(t) => setEditingProveedor({ ...editingProveedor, direccion: t })}
                    validate={() => ({ isValid: true, message: '' })}
                  />
                  <InputValidado
                    label="Teléfono"
                    value={editingProveedor.telefono}
                    onChangeText={(t) => setEditingProveedor({ ...editingProveedor, telefono: t })}
                    keyboardType="phone-pad"
                    validate={(v) => validatePhone(v)}
                  />
                  <InputValidado
                    label="Correo Electrónico"
                    value={editingProveedor.email}
                    onChangeText={(t) => setEditingProveedor({ ...editingProveedor, email: t })}
                    keyboardType="email-address"
                    validate={(v) => validateEmail(v)}
                  />
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

      </ScrollView>
    </SafeAreaView>
  );
}