<?php
// Suprimir errores de PHP que podrian romper el JSON de respuesta
error_reporting(0);
ini_set('display_errors', 0);

session_start();
// CORS: en desarrollo devolvemos el Origin recibido para permitir credenciales desde Expo/móvil.
// En producción limita esto a orígenes confiables.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once __DIR__ . '/../config/conexion.php';
include_once __DIR__ . '/common.php';
include_once __DIR__ . '/usuarios.php';
include_once __DIR__ . '/productos.php';
include_once __DIR__ . '/pedidos.php';
include_once __DIR__ . '/carrito_wishlist.php';
include_once __DIR__ . '/proveedores.php';
include_once __DIR__ . '/actividad_log.php';

mysqli_set_charset($conexion, 'utf8mb4');

// Entrada principal de AJAX. Este archivo solo recibe la accion y llama al modulo correspondiente.
$requestBody = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $requestBody = json_decode($input, true);
}

$action = getValue('action');

/* ===================================================
   AUTENTICACION Y PERFIL
=================================================== */
if ($action === 'login') {
    $email = getValue('email');
    $password = getValue('password');

    if (!$email || !$password) {
        sendResponse(['success' => false, 'message' => 'Completa todos los campos.']);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(['success' => false, 'message' => 'Formato de correo invÃ¡lido.']);
    }
    // Validar proveedor de correo
    $parts = explode('@', $email);
    $domain = isset($parts[1]) ? strtolower(explode('.', $parts[1])[0]) : '';
    $allowed = ['gmail', 'hotmail', 'outlook', 'yahoo', 'live'];
    if (!in_array($domain, $allowed)) {
        sendResponse(['success' => false, 'message' => 'Proveedor de correo no permitido.']);
    }

    $user = getUserByEmail($conexion, $email);
    if (!$user) {
        sendResponse(['success' => false, 'message' => 'Usuario no encontrado.']);
    }

    $passwordGuardada = $user['contrasena_usuario'];
    $passwordValida = password_verify($password, $passwordGuardada) || $password === $passwordGuardada;

    if (!$passwordValida) {
        sendResponse(['success' => false, 'message' => 'ContraseÃ±a incorrecta.']);
    }

    if (($user['estado_usuario'] ?? 'Activo') !== 'Activo') {
        sendResponse(['success' => false, 'message' => 'La cuenta no esta activa.']);
    }

    $_SESSION['id_usuario'] = $user['id_usuario'];
    $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
    $_SESSION['rol_usuario'] = $user['rol_usuario'];

    // Si el usuario es Empleado, enviar notificación solo a ese empleado
    if (isset($user['rol_usuario']) && strtolower($user['rol_usuario']) === 'empleado') {
        $to = $user['correo_usuario'] ?? $user['email'] ?? '';
        if ($to) {
            $subject = 'Inicio de sesión en Le Mascotte';
            $body = "Hola {$user['nombre_usuario']},\n\nSe ha detectado un inicio de sesión en tu cuenta de Le Mascotte. Si no fuiste tú, cambia tu contraseña o contacta al soporte.";
            sendNotificationEmail($to, $subject, $body);
        }
    }

    sendResponse(['success' => true, 'user' => $user]);
}

if ($action === 'register') {
    $name      = getValue('name');
    $last      = getValue('last');
    $email     = getValue('email');
    $password  = getValue('password');
    $phone     = getValue('phone');     // NUEVO
    $roleInput = getValue('role');

    if (!$name || !$last || !$email || !$password) {
        sendResponse(['success' => false, 'message' => 'Completa todos los campos.']);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(['success' => false, 'message' => 'Formato de correo invÃ¡lido.']);
    }
    $partsR = explode('@', $email);
    $domainR = isset($partsR[1]) ? strtolower(explode('.', $partsR[1])[0]) : '';
    $allowedR = ['gmail', 'hotmail', 'outlook', 'yahoo', 'live'];
    if (!in_array($domainR, $allowedR)) {
        sendResponse(['success' => false, 'message' => 'Proveedor de correo no permitido.']);
    }
    // Validar nombre y apellido: solo letras y espacios (unicode)
    if (!preg_match('/^[\p{L} ]+$/u', $name) || !preg_match('/^[\p{L} ]+$/u', $last)) {
        sendResponse(['success' => false, 'message' => 'El nombre y apellido solo pueden contener letras y espacios.']);
    }
    // Validar telefono: solo dÃ­gitos y exactamente 10
    $phone = preg_replace('/\D/', '', $phone);
    if (!preg_match('/^[0-9]{10}$/', $phone)) {
        sendResponse(['success' => false, 'message' => 'El telÃ©fono debe contener exactamente 10 dÃ­gitos.']);
    }
    if (strlen($password) < 6) {
        sendResponse(['success' => false, 'message' => 'La contraseÃ±a debe tener al menos 6 caracteres.']);
    }

    if (getUserByEmail($conexion, $email)) {
        sendResponse(['success' => false, 'message' => 'Este correo ya esta registrado.']);
    }

    $newId          = generateId('USR');
    $fullName       = "$name $last";
    $role           = normalizeRole($roleInput);
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $status         = 'Activo';

    // Se agrega telefono_usuario al INSERT
    $stmt = mysqli_prepare($conexion, "INSERT INTO usuario 
        (id_usuario, nombre_usuario, correo_usuario, telefono_usuario, contrasena_usuario, rol_usuario, estado_usuario) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, 'sssssss', $newId, $fullName, $email, $phone, $hashedPassword, $role, $status);

    if (!mysqli_stmt_execute($stmt)) {
        sendResponse(['success' => false, 'message' => 'Error al registrar el usuario.']);
    }

    $user = getUserById($conexion, $newId);
    $_SESSION['id_usuario']    = $user['id_usuario'];
    $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
    $_SESSION['rol_usuario']   = $user['rol_usuario'];

    // Si el nuevo usuario tiene rol Empleado, enviar notificación solo a ese empleado
    if (isset($user['rol_usuario']) && strtolower($user['rol_usuario']) === 'empleado') {
        $to = $user['correo_usuario'] ?? $user['email'] ?? '';
        if ($to) {
            $subject = 'Bienvenido a Le Mascotte';
            $body = "Hola {$user['nombre_usuario']},\n\nTu cuenta de empleado ha sido creada correctamente. Puedes iniciar sesión con tu correo y la contraseña proporcionada.";
            sendNotificationEmail($to, $subject, $body);
        }
    }

    sendResponse(['success' => true, 'user' => $user]);
}

if ($action === 'update_profile') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'No estas autenticado.']);
    }

    $name = getValue('name');
    if (!$name) {
        sendResponse(['success' => false, 'message' => 'El nombre no puede estar vacio.']);
    }

    $stmt = mysqli_prepare($conexion, "UPDATE usuario SET nombre_usuario = ? WHERE id_usuario = ?");
    mysqli_stmt_bind_param($stmt, 'ss', $name, $userId);
    mysqli_stmt_execute($stmt);

    $_SESSION['nombre_usuario'] = $name;
    sendResponse(['success' => true]);
}

/* ===================================================
   CHECKOUT - COMPRA CON DIRECCIÓN Y DETALLES
=================================================== */
if ($action === 'checkout') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'Debes iniciar sesion para realizar una compra.']);
    }

    $cedula = getValue('cedula');
    $formaPago = getValue('forma_pago');
    $tipoVia = getValue('tipo_via');
    $numeroVia = getValue('numero_via');
    $letraVia = getValue('letra_via', '');
    $numeroPlaca = getValue('numero_placa');
    $letraPlaca = getValue('letra_placa', '');
    $localidad = getValue('localidad');
    $complemento = getValue('complemento', '');
    $productosRaw = getValue('productos');
    $total = floatval(getValue('total', 0));

    if (!$cedula) {
        sendResponse(['success' => false, 'message' => 'Ingresa tu cedula.']);
    }
    if (!$formaPago) {
        sendResponse(['success' => false, 'message' => 'Selecciona una forma de pago.']);
    }
    if (!$tipoVia || !$numeroVia || !$numeroPlaca || !$localidad) {
        sendResponse(['success' => false, 'message' => 'Completa todos los campos de direccion obligatorios.']);
    }
    if (!$productosRaw || !$total) {
        sendResponse(['success' => false, 'message' => 'No hay productos en el carrito.']);
    }

    $productos = json_decode($productosRaw, true);
    if (!is_array($productos) || empty($productos)) {
        sendResponse(['success' => false, 'message' => 'Error en los datos del carrito.']);
    }

    try {
        // 1. Guardar dirección de envío
        $direccionId = saveDireccionEnvio($conexion, $userId, $tipoVia, $numeroVia, $letraVia, $numeroPlaca, $letraPlaca, $localidad, $complemento);
        if (!$direccionId) {
            $err = mysqli_error($conexion);
            sendResponse(['success' => false, 'message' => 'Error al guardar la direccion de envio: ' . ($err ?: 'error desconocido')]);
        }

        // 2. Crear pedido con detalles (transaccional) y descontar stock
        // addOrderWithDetails ahora lanza excepciones con el detalle real del error
        $orderId = addOrderWithDetails($conexion, $userId, $total, $productos, $direccionId, $formaPago);
        if (!$orderId) {
            // Esto solo se alcanza si addOrderWithDetails no lanzó excepción pero devolvió false
            sendResponse(['success' => false, 'message' => 'Error desconocido al procesar el pedido.']);
        }

        sendResponse(['success' => true, 'message' => 'Compra realizada con exito. Pedido #' . $orderId, 'order_id' => $orderId]);
    } catch (Exception $e) {
        sendResponse(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/* ===================================================
   ACCIONES DE PEDIDOS
=================================================== */
if ($action === 'order') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'Debes iniciar sesion para hacer un pedido.']);
    }

    $total = getValue('total');
    if (!$total) {
        sendResponse(['success' => false, 'message' => 'Faltan datos para procesar el pedido.']);
    }

    if (!addOrder($conexion, $userId, $total)) {
        sendResponse(['success' => false, 'message' => 'Error al guardar el pedido.']);
    }

    sendResponse(['success' => true]);
}

if ($action === 'get_dashboard_orders') {
    $orders = getDashboardOrders($conexion);
    sendResponse(['success' => true, 'orders' => $orders]);
}

if ($action === 'save_dashboard_order') {
    $id = getValue('id');
    $total = floatval(getValue('total', 0));
    $status = getValue('status', 'Pendiente');
    $userId = getValue('user_id');

    if (!$total || !$status || !$userId) {
        sendResponse(['success' => false, 'message' => 'Completa todos los campos del pedido.']);
    }

    if (!saveDashboardOrder($conexion, $id, $total, $status, $userId)) {
        sendResponse(['success' => false, 'message' => 'Error guardando el pedido.']);
    }

    sendResponse(['success' => true]);
}

if ($action === 'delete_dashboard_order') {
    $id = getValue('id');
    if ($id === '' || !deleteDashboardOrder($conexion, $id)) {
        sendResponse(['success' => false, 'message' => 'Error eliminando el pedido.']);
    }
    sendResponse(['success' => true]);
}

/* ===================================================
   ACCIONES DE PRODUCTOS
=================================================== */
if ($action === 'get_dashboard_products') {
    $products = getDashboardProducts($conexion);
    sendResponse(['success' => true, 'products' => $products]);
}

if ($action === 'search_dashboard_products') {
    $search = getValue('search', '');
    $category = getValue('category', '');
    $products = searchDashboardProducts($conexion, $search, $category);
    sendResponse(['success' => true, 'products' => $products]);
}

if ($action === 'get_inventory_products') {
    $search = getValue('search', '');
    $category = getValue('category', '');
    $stockLevel = getValue('stock_level', '');
    $products = getInventoryProducts($conexion, $search, $category, $stockLevel);
    sendResponse(['success' => true, 'products' => $products]);
}

if ($action === 'save_dashboard_product') {
    $id = getValue('id');
    $name = getValue('name');
    $category = getValue('category');
    $price = floatval(getValue('price', 0));
    $stock = intval(getValue('stock', 0));
    $img = getValue('img');
    $cantidadEntrada = intval(getValue('cantidad_entrada', 0));
    $cantidadSalida = intval(getValue('cantidad_salida', 0));
    $valorCompra = floatval(getValue('valor_compra', 0));

    if (!$name || !$category || !$price) {
        sendResponse(['success' => false, 'message' => 'Completa todos los campos del producto.']);
    }
    // Server-side validation: name must be letters only
    if (!preg_match('/^[\p{L} ]+$/u', $name)) {
        sendResponse(['success' => false, 'message' => 'El nombre del producto solo puede contener letras y espacios.']);
    }
    if ($stock < 0) {
        sendResponse(['success' => false, 'message' => 'El stock no puede ser negativo.']);
    }
    if ($price <= 0) {
        sendResponse(['success' => false, 'message' => 'El precio debe ser mayor a 0.']);
    }

    if (!saveDashboardProduct($conexion, $id, $name, $category, $price, $img)) {
        sendResponse(['success' => false, 'message' => 'Error guardando el producto.']);
    }

    sendResponse(['success' => true]);
}

if ($action === 'delete_dashboard_product') {
    $id = getValue('id');
    if ($id === '' || !deleteDashboardProduct($conexion, $id)) {
        sendResponse(['success' => false, 'message' => 'Error eliminando el producto.']);
    }
    sendResponse(['success' => true]);
}

/* ===================================================
   ESTADÍSTICAS AVANZADAS
=================================================== */
if ($action === 'get_product_stats') {
    $stats = getProductStats($conexion);
    sendResponse(['success' => true, 'stats' => $stats]);
}

/* ===================================================
   ACCIONES DE USUARIOS
=================================================== */
if ($action === 'get_dashboard_users') {
    $users = getDashboardUsers($conexion);
    sendResponse(['success' => true, 'users' => $users]);
}

if ($action === 'search_dashboard_users') {
    $search = getValue('search', '');
    $role = getValue('role', '');
    $users = searchDashboardUsers($conexion, $search, $role);
    sendResponse(['success' => true, 'users' => $users]);
}

if ($action === 'save_dashboard_user') {
    $id = getValue('id');
    $name = getValue('name');
    $email = getValue('email');
    $role = getValue('role');
    $status = getValue('status', 'Activo');

    if (!$name || !$email || !$role) {
        sendResponse(['success' => false, 'message' => 'Completa todos los campos del usuario.']);
    }
    // Server-side validation: name must be letters only
    if (!preg_match('/^[\p{L} ]+$/u', $name)) {
        sendResponse(['success' => false, 'message' => 'El nombre del usuario solo puede contener letras y espacios.']);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(['success' => false, 'message' => 'Formato de correo inválido.']);
    }

    if (!saveDashboardUser($conexion, $id, $name, $email, $role, $status)) {
        sendResponse(['success' => false, 'message' => 'Error guardando el usuario o correo duplicado.']);
    }

    sendResponse(['success' => true]);
}

if ($action === 'delete_dashboard_user') {
    $id = getValue('id');
    if ($id === '' || !deleteDashboardUser($conexion, $id)) {
        sendResponse(['success' => false, 'message' => 'Error eliminando el usuario.']);
    }
    sendResponse(['success' => true]);
}

/* ===================================================
   CARRITO - ADMIN
=================================================== */
if ($action === 'admin_get_all_cart') {
    $items = getAllCartItems($conexion);
    sendResponse(['success' => true, 'items' => $items]);
}

if ($action === 'admin_remove_cart_item') {
    $id = getValue('id');
    if (!$id || !removeFromCart($conexion, $id)) {
        sendResponse(['success' => false, 'message' => 'Error eliminando item del carrito.']);
    }
    sendResponse(['success' => true]);
}

if ($action === 'admin_update_cart_qty') {
    $id = getValue('id');
    $qty = intval(getValue('qty', 1));
    if (!$id || !updateCartQty($conexion, $id, $qty)) {
        sendResponse(['success' => false, 'message' => 'Error actualizando cantidad del carrito.']);
    }
    sendResponse(['success' => true]);
}

/* ===================================================
   WISHLIST - ADMIN
=================================================== */
if ($action === 'admin_get_all_wishlist') {
    $items = getAllWishlistItems($conexion);
    sendResponse(['success' => true, 'items' => $items]);
}

if ($action === 'admin_remove_wishlist_item') {
    $id = getValue('id');
    if (!$id || !removeFromWishlist($conexion, $id)) {
        sendResponse(['success' => false, 'message' => 'Error eliminando item de wishlist.']);
    }
    sendResponse(['success' => true]);
}

/* ===================================================
   PRODUCTOS DESTACADOS
=================================================== */
if ($action === 'admin_get_featured_products') {
    $limit = intval(getValue('limit', 10));
    $products = getFeaturedProducts($conexion, $limit);
    sendResponse(['success' => true, 'products' => $products]);
}

/* ===================================================
   TENDENCIAS - ANÁLISIS DE PRODUCTOS POPULARES
   =================================================== */
if ($action === 'admin_get_cart_trending') {
    $limit = intval(getValue('limit', 50));
    $order = getValue('order', 'DESC');
    $products = getTrendingCartProducts($conexion, $limit, $order);
    sendResponse(['success' => true, 'products' => $products]);
}

if ($action === 'admin_get_wishlist_trending') {
    $limit = intval(getValue('limit', 50));
    $order = getValue('order', 'DESC');
    $products = getTrendingWishlistProducts($conexion, $limit, $order);
    sendResponse(['success' => true, 'products' => $products]);
}

/* ===================================================
   ANALÍTICA DE COMPORTAMIENTO DEL CLIENTE
   =================================================== */
if ($action === 'admin_get_cart_analytics') {
    $search = getValue('search', '');
    $page = intval(getValue('page', 1));
    $perPage = intval(getValue('per_page', 20));
    $data = getCartAnalytics($conexion, $search, $page, $perPage);
    sendResponse(['success' => true, 'data' => $data]);
}

if ($action === 'admin_get_wishlist_analytics') {
    $search = getValue('search', '');
    $page = intval(getValue('page', 1));
    $perPage = intval(getValue('per_page', 20));
    $data = getWishlistAnalytics($conexion, $search, $page, $perPage);
    sendResponse(['success' => true, 'data' => $data]);
}

if ($action === 'admin_get_cart_total_products') {
    $total = getCartTotalProducts($conexion);
    sendResponse(['success' => true, 'total' => $total]);
}

if ($action === 'admin_get_wishlist_total_products') {
    $total = getWishlistTotalProducts($conexion);
    sendResponse(['success' => true, 'total' => $total]);
}

/* ===================================================
   REGISTRO EN VIVO - ADICIONES RECIENTES
   =================================================== */
if ($action === 'admin_get_recent_cart_additions') {
    $search = getValue('search', '');
    $page = intval(getValue('page', 1));
    $perPage = intval(getValue('per_page', 20));
    $data = getRecentCartAdditions($conexion, $search, $page, $perPage);
    sendResponse(['success' => true, 'data' => $data]);
}

if ($action === 'admin_get_recent_wishlist_additions') {
    $search = getValue('search', '');
    $page = intval(getValue('page', 1));
    $perPage = intval(getValue('per_page', 20));
    $data = getRecentWishlistAdditions($conexion, $search, $page, $perPage);
    sendResponse(['success' => true, 'data' => $data]);
}

/* ===================================================
   PEDIDOS - GESTION DE ESTADOS DETALLADA
=================================================== */
if ($action === 'admin_get_all_orders_detailed') {
    $orders = getAllOrdersWithDetails($conexion);
    sendResponse(['success' => true, 'orders' => $orders]);
}

if ($action === 'admin_get_order_detail') {
    $id = getValue('id');
    if (!$id) {
        sendResponse(['success' => false, 'message' => 'ID de pedido requerido.']);
    }
    $order = getOrderDetailsWithUser($conexion, $id);
    if (!$order) {
        sendResponse(['success' => false, 'message' => 'Pedido no encontrado.']);
    }
    sendResponse(['success' => true, 'order' => $order]);
}

if ($action === 'admin_update_order_status') {
    // SIN AUTENTICACIÓN - solo actualiza el estado
    $id = getValue('id');
    $status = getValue('status');
    $validStatuses = getOrderStatusHistory();
    
    if (!$id || !$status || !in_array($status, $validStatuses)) {
        sendResponse(['success' => false, 'message' => 'Estado invalido o ID faltante.']);
    }
    
    $result = updateOrderStatus($conexion, $id, $status);
    
    if (!$result) {
        $dbError = mysqli_error($conexion);
        sendResponse(['success' => false, 'message' => 'Error actualizando estado: ' . ($dbError ?: 'desconocido')]);
    }
    sendResponse(['success' => true]);
}

if ($action === 'admin_get_order_statuses') {
    sendResponse(['success' => true, 'statuses' => getOrderStatusHistory()]);
}

/* ===================================================
   MÓDULO CLIENTE - MIS PEDIDOS
=================================================== */
if ($action === 'user_get_orders') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'No autenticado.']);
    }
    $orders = getOrdersByUser($conexion, $userId);
    sendResponse(['success' => true, 'orders' => $orders]);
}

if ($action === 'user_update_order_status') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'No autenticado.']);
    }
    $orderId = getValue('id');
    $newStatus = getValue('status');
    $validStatuses = getOrderStatusHistory();
    if (!$orderId || !$newStatus || !in_array($newStatus, $validStatuses)) {
        sendResponse(['success' => false, 'message' => 'Estado invalido o ID faltante.']);
    }
    // Verify the order belongs to this user
    $stmt = mysqli_prepare($conexion, "SELECT id_usuario, estado_pedido FROM pedido WHERE id_pedido = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, 's', $orderId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $order = mysqli_fetch_assoc($result);
    if (!$order || $order['id_usuario'] !== $userId) {
        sendResponse(['success' => false, 'message' => 'Pedido no encontrado o no pertenece al usuario.']);
    }
    if (!updateOrderStatus($conexion, $orderId, $newStatus)) {
        sendResponse(['success' => false, 'message' => 'Error actualizando estado del pedido.']);
    }
    sendResponse(['success' => true]);
}

/* ===================================================
   CARRITO / WISHLIST - Sincronización desde el Usuario
   (usado por index.tsx para reflejar cambios en BD en tiempo real)
=================================================== */
if ($action === 'user_sync_cart') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'No autenticado.']);
    }
    $items = getValue('items');
    $parsed = json_decode($items, true);
    if (!is_array($parsed)) {
        sendResponse(['success' => false, 'message' => 'Formato invalido.']);
    }

    // Get current cart for comparison
    $existingCart = getCartByUser($conexion, $userId);
    $existingIds = array_map(function($item) { return $item['product_id']; }, $existingCart);
    $newIds = array_map(function($item) { return $item['product_id']; }, $parsed);

    // Remove items no longer in cart
    foreach ($existingIds as $eid) {
        if (!in_array($eid, $newIds)) {
            removeFromCartByProduct($conexion, $userId, $eid);
        }
    }
    // Add new items / update qty
    $addedAny = false;
    foreach ($parsed as $item) {
        if (isset($item['product_id']) && isset($item['qty'])) {
            $pid = $item['product_id'];
            $qty = intval($item['qty']);
            if (in_array($pid, $existingIds)) {
                // Update qty if changed - find existing cart id
                foreach ($existingCart as $e) {
                    if ($e['product_id'] === $pid) {
                        $stmtU = mysqli_prepare($conexion, "UPDATE carrito SET cantidad = ? WHERE id_carrito = ?");
                        if ($stmtU) {
                            mysqli_stmt_bind_param($stmtU, 'is', $qty, $e['id']);
                            mysqli_stmt_execute($stmtU);
                        }
                        break;
                    }
                }
            } else {
                addToCart($conexion, $userId, $pid, $qty, false);
                $addedAny = true;
            }
        }
    }
    sendResponse(['success' => true]);
}

if ($action === 'user_add_to_cart') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'No autenticado.']);
    }
    $productId = getValue('product_id');
    $qty = intval(getValue('qty', 1));
    if (!$productId) {
        sendResponse(['success' => false, 'message' => 'ID de producto requerido.']);
    }
    if (!addToCart($conexion, $userId, $productId, $qty)) {
        sendResponse(['success' => false, 'message' => 'Error agregando al carrito.']);
    }
    sendResponse(['success' => true]);
}

if ($action === 'user_remove_from_cart') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'No autenticado.']);
    }
    $productId = getValue('product_id');
    if (!$productId || !removeFromCartByProduct($conexion, $userId, $productId)) {
        sendResponse(['success' => false, 'message' => 'Error eliminando del carrito.']);
    }
    sendResponse(['success' => true]);
}

if ($action === 'user_sync_wishlist') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'No autenticado.']);
    }
    $items = getValue('items');
    $parsed = json_decode($items, true);
    if (!is_array($parsed)) {
        sendResponse(['success' => false, 'message' => 'Formato invalido.']);
    }

    // Get existing wishlist
    $existing = getWishlistByUser($conexion, $userId);
    $existingIds = array_map(function($item) { return $item['product_id']; }, $existing);
    $newIds = $parsed;

    // Remove items no longer in wishlist
    foreach ($existingIds as $eid) {
        if (!in_array($eid, $newIds)) {
            removeFromWishlistByProduct($conexion, $userId, $eid);
        }
    }
    // Add new items
    foreach ($newIds as $nid) {
        if (!in_array($nid, $existingIds)) {
            addToWishlist($conexion, $userId, $nid);
        }
    }
    sendResponse(['success' => true]);
}

if ($action === 'user_toggle_wishlist') {
    $userId = getAuthenticatedUserId();
    if (!$userId) {
        sendResponse(['success' => false, 'message' => 'No autenticado.']);
    }
    $productId = getValue('product_id');
    $add = getValue('add');
    if (!$productId) {
        sendResponse(['success' => false, 'message' => 'ID de producto requerido.']);
    }
    if ($add === 'true' || $add === '1') {
        addToWishlist($conexion, $userId, $productId);
    } else {
        removeFromWishlistByProduct($conexion, $userId, $productId);
    }
    sendResponse(['success' => true]);
}

/* ===================================================
   SESION
=================================================== */
if ($action === 'session') {
    if (!empty($_SESSION['id_usuario'])) {
        $user = getUserById($conexion, $_SESSION['id_usuario']);
        if ($user) {
            sendResponse(['success' => true, 'user' => $user]);
        }
    }
    sendResponse(['success' => false]);
}

if ($action === 'logout') {
    session_unset();
    session_destroy();
    sendResponse(['success' => true]);
}

/* ===================================================
   PROVEEDORES
=================================================== */
if ($action === 'get_dashboard_proveedores') {
    $proveedores = getDashboardProveedores($conexion);
    sendResponse(['success' => true, 'proveedores' => $proveedores]);
}

if ($action === 'search_dashboard_proveedores') {
    $search = getValue('search', '');
    $estado = getValue('estado', '');
    $proveedores = searchDashboardProveedores($conexion, $search, $estado);
    sendResponse(['success' => true, 'proveedores' => $proveedores]);
}

if ($action === 'save_dashboard_proveedor') {
    $id = getValue('id');
    $nombre = getValue('nombre');
    $contacto = getValue('contacto');
    $nit = getValue('nit');
    $direccion = getValue('direccion');
    $telefono = getValue('telefono');
    $email = getValue('email');
    $estado = getValue('estado', 'Activo');

    if (!$nombre || !$nit) {
        sendResponse(['success' => false, 'message' => 'El nombre y NIT son obligatorios.']);
    }
    if ($telefono && !preg_match('/^[0-9]{7,15}$/', $telefono)) {
        sendResponse(['success' => false, 'message' => 'El telefono debe contener solo digitos (7-15).']);
    }
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(['success' => false, 'message' => 'Formato de correo invalido.']);
    }

    if (!saveDashboardProveedor($conexion, $id, $nombre, $contacto, $nit, $direccion, $telefono, $email, $estado)) {
        sendResponse(['success' => false, 'message' => 'Error guardando el proveedor.']);
    }

    sendResponse(['success' => true]);
}

if ($action === 'delete_dashboard_proveedor') {
    $id = getValue('id');
    if ($id === '' || !deleteDashboardProveedor($conexion, $id)) {
        sendResponse(['success' => false, 'message' => 'Error eliminando el proveedor.']);
    }
    sendResponse(['success' => true]);
}

/* ===================================================
   ACTIVIDAD EN VIVO (Live Activity Feed)
=================================================== */
if ($action === 'admin_get_activity_log') {
    $limit = intval(getValue('limit', 50));
    $offset = intval(getValue('offset', 0));
    $filterUserId = getValue('user_id', '');
    $filterTipo = getValue('tipo', '');
    $items = getActivityLog($conexion, $limit, $offset, $filterUserId ?: null, $filterTipo ?: null);
    sendResponse(['success' => true, 'items' => $items]);
}

if ($action === 'admin_get_activity_users') {
    $users = getActivityUsers($conexion);
    sendResponse(['success' => true, 'users' => $users]);
}

if ($action === 'admin_get_activity_count') {
    $filterUserId = getValue('user_id', '');
    $filterTipo = getValue('tipo', '');
    $count = getActivityCount($conexion, $filterUserId ?: null, $filterTipo ?: null);
    sendResponse(['success' => true, 'count' => $count]);
}

sendResponse(['success' => false, 'message' => 'Accion no valida.']);
?>

