<?php
include_once __DIR__ . '/../config/conexion.php';
include_once __DIR__ . '/../models/view_helpers.php';
include_once __DIR__ . '/../models/common.php';
include_once __DIR__ . '/../models/usuarios.php';
include_once __DIR__ . '/../models/productos.php';
include_once __DIR__ . '/../models/pedidos.php';

mysqli_set_charset($conexion, 'utf8mb4');
$requestBody = $_POST;

function redirectStore($params = []) {
    $base = strtok($_SERVER['REQUEST_URI'], '?');
    $query = http_build_query($params);
    header('Location: ' . $base . ($query ? '?' . $query : ''));
    exit;
}

function flash($message, $type = 'success') {
    setFlashMessage($message, $type);
}

function validEmailProvider($email) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $parts = explode('@', $email);
    $domain = isset($parts[1]) ? strtolower(explode('.', $parts[1])[0]) : '';
    return in_array($domain, ['gmail', 'hotmail', 'outlook', 'yahoo', 'live'], true);
}

function fallbackProducts() {
    return [
        ['id' => '1', 'name' => 'Croquetas Premium Adulto', 'category' => 'Perros', 'price' => 89900, 'badge' => 'Mas vendido', 'desc' => 'Nutricion completa y balanceada para perros adultos.', 'img' => 'https://didopet.com/wp-content/uploads/2024/03/10690-didopet.com-RINGO-ADULTO-CROQUETAS-2KG.png'],
        ['id' => '2', 'name' => 'Alimento Humedo para Gatos', 'category' => 'Gatos', 'price' => 12500, 'badge' => 'Nuevo', 'desc' => 'Deliciosas gelatinas con atun y salmon para tu felino.', 'img' => 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0vb_-pyJCfQQ-g9aqXgg1InmMzl8YE4LWrQ&s'],
        ['id' => '3', 'name' => 'Collar Antipulgas Reflectivo', 'category' => 'Accesorios', 'price' => 35000, 'badge' => 'Oferta', 'desc' => 'Proteccion 8 meses y visibilidad nocturna.', 'img' => 'https://http2.mlstatic.com/D_NQ_NP_942847-MLU77985769358_082024-O.webp'],
        ['id' => '4', 'name' => 'Cama Ortopedica Donut', 'category' => 'Accesorios', 'price' => 145000, 'badge' => 'Premium', 'desc' => 'Memoria foam ultra suave. Lavable y antideslizante.', 'img' => 'https://acdn-us.mitiendanube.com/stores/868/401/products/cama-para-perro-donut-e74a33a376b6b52fbb17177106908441-480-0.webp'],
        ['id' => '5', 'name' => 'Arena Sanitaria Aglutinante 5kg', 'category' => 'Gatos', 'price' => 42000, 'badge' => '', 'desc' => 'Control de olores 48h. Sin polvo.', 'img' => 'https://stockimages.tiendasd1.com/stockimages.tiendasd1.com/kobastockimages/IMAGENES/12000556/arena-para-gatos-magic-friends-4500-g-01.png'],
        ['id' => '6', 'name' => 'Kit de Alimento para Peces', 'category' => 'Peces', 'price' => 28000, 'badge' => 'Nuevo', 'desc' => 'Set de alimentos especializados.', 'img' => 'https://www.agrocampo.com.co/media/catalog/product/cache/d51e0dc10c379a6229d70d752fc46d83/1/1/111130050-v1-min.jpg'],
        ['id' => '7', 'name' => 'Vitaminas y Suplementos Caninos', 'category' => 'Salud', 'price' => 65000, 'badge' => 'Recomendado', 'desc' => 'Multivitaminico diario para pelo y defensas.', 'img' => 'https://petcol.co/cdn/shop/products/hemolitan_666x.png?v=1578592311'],
        ['id' => '8', 'name' => 'Shampoo Antipulgas Natural', 'category' => 'Higiene', 'price' => 32000, 'badge' => '', 'desc' => 'Formula con aceite de neem. 300ml.', 'img' => 'https://animalsveterinaria.vtexassets.com/arquivos/ids/165989-800-450?v=638760144263330000&width=800&height=450&aspect=true'],
    ];
}

function loadStoreProducts($conexion) {
    $products = getDashboardProducts($conexion);
    return $products ?: fallbackProducts();
}

function productMapById($products) {
    $productMap = [];
    foreach ($products as $product) {
        $productMap[(string) $product['id']] = $product;
    }
    return $productMap;
}

function productAvailableStock($product) {
    if (!array_key_exists('stock', $product)) {
        return PHP_INT_MAX;
    }
    return max(0, (int) $product['stock']);
}

function isStoreProductAvailable($product) {
    return productAvailableStock($product) > 0 && ($product['status'] ?? 'Disponible') !== 'Agotado';
}

function canAddCartQuantity($productMap, $id, $currentQty = 0, $addQty = 1) {
    if (!isset($productMap[$id]) || !isStoreProductAvailable($productMap[$id])) {
        return false;
    }

    return ($currentQty + $addQty) <= productAvailableStock($productMap[$id]);
}

function checkoutPaymentMethods() {
    return [
        'contra_entrega' => 'Pago contra entrega',
        'tarjeta' => 'Tarjeta debito/credito',
        'transferencia' => 'Transferencia bancaria',
        'nequi' => 'Nequi',
        'daviplata' => 'Daviplata',
    ];
}

function bogotaLocalities() {
    return [
        'Usaquen', 'Chapinero', 'Santa Fe', 'San Cristobal', 'Usme', 'Tunjuelito',
        'Bosa', 'Kennedy', 'Fontibon', 'Engativa', 'Suba', 'Barrios Unidos',
        'Teusaquillo', 'Los Martires', 'Antonio Narino', 'Puente Aranda',
        'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolivar', 'Sumapaz',
    ];
}

function checkoutAddressTypes() {
    return ['Calle', 'Carrera', 'Avenida Calle', 'Avenida Carrera', 'Diagonal', 'Transversal'];
}

function validateCheckoutInfo($input, &$data, &$message) {
    $paymentMethods = checkoutPaymentMethods();
    $addressTypes = checkoutAddressTypes();
    $localities = bogotaLocalities();

    $data = [
        'cedula' => preg_replace('/\D/', '', $input['cedula'] ?? ''),
        'payment_method' => trim($input['payment_method'] ?? ''),
        'address_type' => trim($input['address_type'] ?? ''),
        'address_number' => trim($input['address_number'] ?? ''),
        'address_letter' => strtoupper(trim($input['address_letter'] ?? '')),
        'address_plate' => trim($input['address_plate'] ?? ''),
        'address_plate_letter' => strtoupper(trim($input['address_plate_letter'] ?? '')),
        'address_home_number' => trim($input['address_home_number'] ?? ''),
        'address_extra' => trim($input['address_extra'] ?? ''),
        'locality' => trim($input['locality'] ?? ''),
    ];

    if (!preg_match('/^\d{10}$/', $data['cedula'])) {
        $message = 'La cedula debe tener exactamente 10 digitos.';
        return false;
    }

    if (!isset($paymentMethods[$data['payment_method']])) {
        $message = 'Selecciona una forma de pago valida.';
        return false;
    }

    if (!in_array($data['address_type'], $addressTypes, true)) {
        $message = 'Selecciona un tipo de via valido para Bogota.';
        return false;
    }

    if (!preg_match('/^\d{1,3}$/', $data['address_number']) || (int) $data['address_number'] < 1 || (int) $data['address_number'] > 250) {
        $message = 'El numero principal de la direccion debe estar entre 1 y 250.';
        return false;
    }

    if ($data['address_letter'] !== '' && !preg_match('/^[A-Z]{1,2}$/', $data['address_letter'])) {
        $message = 'La letra de la via debe tener maximo 2 letras.';
        return false;
    }

    if (!preg_match('/^\d{1,3}$/', $data['address_plate']) || (int) $data['address_plate'] < 1 || (int) $data['address_plate'] > 250) {
        $message = 'El numero de placa debe estar entre 1 y 250.';
        return false;
    }

    if ($data['address_plate_letter'] !== '' && !preg_match('/^[A-Z]{1,2}$/', $data['address_plate_letter'])) {
        $message = 'La letra de la placa debe tener maximo 2 letras.';
        return false;
    }

    if (!preg_match('/^\d{1,3}$/', $data['address_home_number']) || (int) $data['address_home_number'] < 1 || (int) $data['address_home_number'] > 250) {
        $message = 'El numero final de la direccion debe estar entre 1 y 250.';
        return false;
    }

    if (!in_array($data['locality'], $localities, true)) {
        $message = 'Selecciona una localidad valida de Bogota.';
        return false;
    }

    if ($data['address_extra'] !== '' && !preg_match('/^[0-9A-Za-zÑñÁÉÍÓÚáéíóú#\-\s.,]{1,80}$/u', $data['address_extra'])) {
        $message = 'El complemento de direccion contiene caracteres no validos.';
        return false;
    }

    return true;
}

function checkoutCartWithStock($conexion, $cart, $userId, &$message) {
    mysqli_begin_transaction($conexion);
    $items = [];
    $total = 0;

    foreach ($cart as $id => $qty) {
        $qty = max(0, (int) $qty);
        if ($qty <= 0) {
            continue;
        }

        $stmt = mysqli_prepare($conexion, "SELECT id_producto, nombre_producto, precio_producto, stock_producto, estado_producto FROM Producto WHERE id_producto = ? FOR UPDATE");
        if (!$stmt) {
            mysqli_rollback($conexion);
            $message = 'Error validando el inventario.';
            return false;
        }

        mysqli_stmt_bind_param($stmt, 's', $id);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        $product = mysqli_fetch_assoc($result);

        if (!$product) {
            mysqli_rollback($conexion);
            $message = 'Uno de los productos ya no esta disponible.';
            return false;
        }

        $stock = max(0, (int) $product['stock_producto']);
        if ($stock <= 0 || ($product['estado_producto'] ?? '') === 'Agotado') {
            mysqli_rollback($conexion);
            $message = $product['nombre_producto'] . ' esta agotado.';
            return false;
        }

        if ($qty > $stock) {
            mysqli_rollback($conexion);
            $message = 'Solo quedan ' . $stock . ' unidades de ' . $product['nombre_producto'] . '.';
            return false;
        }

        $items[] = [
            'id' => $id,
            'qty' => $qty,
            'stock' => $stock,
            'price' => (float) $product['precio_producto'],
        ];
        $total += ((float) $product['precio_producto']) * $qty;
    }

    if ($total <= 0 || !$items) {
        mysqli_rollback($conexion);
        $message = 'Tu carrito esta vacio.';
        return false;
    }

    foreach ($items as $item) {
        $newStock = $item['stock'] - $item['qty'];
        $newStatus = $newStock > 0 ? 'Disponible' : 'Agotado';
        $stmt = mysqli_prepare($conexion, "UPDATE Producto SET stock_producto = ?, estado_producto = ? WHERE id_producto = ?");
        if (!$stmt) {
            mysqli_rollback($conexion);
            $message = 'Error actualizando el inventario.';
            return false;
        }

        mysqli_stmt_bind_param($stmt, 'iss', $newStock, $newStatus, $item['id']);
        if (!mysqli_stmt_execute($stmt)) {
            mysqli_rollback($conexion);
            $message = 'Error actualizando el inventario.';
            return false;
        }
    }

    if (!addOrder($conexion, $userId, $total)) {
        mysqli_rollback($conexion);
        $message = 'Error al procesar el pedido.';
        return false;
    }

    mysqli_commit($conexion);
    return true;
}

function currentStoreUser($conexion) {
    if (empty($_SESSION['id_usuario'])) {
        return null;
    }
    return getUserById($conexion, $_SESSION['id_usuario']);
}

function handleStorePost($conexion, $productMap, $currentUser) {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        return;
    }

    $action = $_POST['form_action'] ?? '';

    if ($action === 'add_cart') {
        $id = (string) ($_POST['product_id'] ?? '');
        $currentQty = $_SESSION['lm_cart'][$id] ?? 0;
        if (canAddCartQuantity($productMap, $id, $currentQty, 1)) {
            $_SESSION['lm_cart'][$id] = $currentQty + 1;
            flash($productMap[$id]['name'] . ' aÃ±adido al carrito.');
        } elseif (isset($productMap[$id])) {
            flash($productMap[$id]['name'] . ' esta agotado o no tiene stock suficiente.', 'error');
        }
        redirectStore(['panel' => 'cart']);
    }

    if ($action === 'cart_qty') {
        $id = (string) ($_POST['product_id'] ?? '');
        $delta = (int) ($_POST['delta'] ?? 0);
        if (isset($_SESSION['lm_cart'][$id])) {
            if ($delta > 0 && !canAddCartQuantity($productMap, $id, $_SESSION['lm_cart'][$id], $delta)) {
                flash('No hay mas stock disponible para este producto.', 'error');
                redirectStore(['panel' => 'cart']);
            }
            $_SESSION['lm_cart'][$id] += $delta;
            if ($_SESSION['lm_cart'][$id] <= 0) {
                unset($_SESSION['lm_cart'][$id]);
            }
        }
        redirectStore(['panel' => 'cart']);
    }

    if ($action === 'toggle_wishlist') {
        $id = (string) ($_POST['product_id'] ?? '');
        if (isset($productMap[$id])) {
            if (in_array($id, $_SESSION['lm_wishlist'], true)) {
                $_SESSION['lm_wishlist'] = array_values(array_diff($_SESSION['lm_wishlist'], [$id]));
                flash('Producto eliminado de favoritos.');
            } else {
                $_SESSION['lm_wishlist'][] = $id;
                flash('Producto aÃ±adido a favoritos.');
            }
        }
        redirectStore();
    }

    if ($action === 'move_to_cart') {
        $id = (string) ($_POST['product_id'] ?? '');
        $currentQty = $_SESSION['lm_cart'][$id] ?? 0;
        if (canAddCartQuantity($productMap, $id, $currentQty, 1)) {
            $_SESSION['lm_cart'][$id] = $currentQty + 1;
            $_SESSION['lm_wishlist'] = array_values(array_diff($_SESSION['lm_wishlist'], [$id]));
        } elseif (isset($productMap[$id])) {
            flash($productMap[$id]['name'] . ' esta agotado o no tiene stock suficiente.', 'error');
        }
        redirectStore(['panel' => 'cart']);
    }

    if ($action === 'login') {
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        if ($email === '' || $password === '' || !validEmailProvider($email)) {
            flash('Completa los campos con un correo valido.', 'error');
            redirectStore(['auth' => 'login']);
        }
        $user = getUserByEmail($conexion, $email);
        $valid = $user && (password_verify($password, $user['contrasena_usuario']) || $password === $user['contrasena_usuario']);
        if (!$valid) {
            flash('Credenciales incorrectas.', 'error');
            redirectStore(['auth' => 'login']);
        }
        $_SESSION['id_usuario'] = $user['id_usuario'];
        $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
        $_SESSION['rol_usuario'] = $user['rol_usuario'];
        if ($user['rol_usuario'] === 'Administrador') {
            header('Location: Dash_admin.php');
            exit;
        }
        if ($user['rol_usuario'] === 'Empleado') {
            header('Location: Dash_empleado.php');
            exit;
        }
        flash('Bienvenido, ' . $user['nombre_usuario'] . '.');
        redirectStore();
    }

    if ($action === 'register') {
        $name = trim($_POST['name'] ?? '');
        $last = trim($_POST['last'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $password2 = $_POST['password2'] ?? '';
        $phone = preg_replace('/\D/', '', $_POST['phone'] ?? '');
        $role = $_POST['role'] ?? 'cliente';

        if ($name === '' || $last === '' || $email === '' || $password === '' || $password2 === '' || $phone === '') {
            flash('Completa todos los campos.', 'error');
            redirectStore(['auth' => 'register']);
        }
        if (!preg_match('/^[\p{L} ]+$/u', $name) || !preg_match('/^[\p{L} ]+$/u', $last) || !validEmailProvider($email)) {
            flash('Revisa nombre, apellido y correo.', 'error');
            redirectStore(['auth' => 'register']);
        }
        if (!preg_match('/^[0-9]{10}$/', $phone) || strlen($password) < 6 || $password !== $password2) {
            flash('Revisa telefono y contraseÃ±a.', 'error');
            redirectStore(['auth' => 'register']);
        }
        if (getUserByEmail($conexion, $email)) {
            flash('Este correo ya esta registrado.', 'error');
            redirectStore(['auth' => 'register']);
        }

        $newId = generateId('USR');
        $fullName = "$name $last";
        $role = normalizeRole($role);
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $status = 'Activo';
        $stmt = mysqli_prepare($conexion, "INSERT INTO usuario (id_usuario, nombre_usuario, correo_usuario, telefono_usuario, contrasena_usuario, rol_usuario, estado_usuario) VALUES (?, ?, ?, ?, ?, ?, ?)");
        mysqli_stmt_bind_param($stmt, 'sssssss', $newId, $fullName, $email, $phone, $hash, $role, $status);
        if (!mysqli_stmt_execute($stmt)) {
            flash('Error al registrar el usuario.', 'error');
            redirectStore(['auth' => 'register']);
        }
        $_SESSION['id_usuario'] = $newId;
        $_SESSION['nombre_usuario'] = $fullName;
        $_SESSION['rol_usuario'] = $role;
        flash('Tu cuenta ha sido creada exitosamente.');
        redirectStore();
    }

    if ($action === 'logout') {
        unset($_SESSION['id_usuario'], $_SESSION['nombre_usuario'], $_SESSION['rol_usuario']);
        flash('Sesion cerrada. Hasta pronto.');
        redirectStore();
    }

    if ($action === 'checkout') {
        if (!$currentUser) {
            flash('Inicia sesion para finalizar tu compra.', 'error');
            redirectStore(['auth' => 'login']);
        }

        $checkoutInfo = [];
        $checkoutInfoMessage = '';
        if (!validateCheckoutInfo($_POST, $checkoutInfo, $checkoutInfoMessage)) {
            $_SESSION['lm_checkout_info'] = $checkoutInfo;
            flash($checkoutInfoMessage, 'error');
            redirectStore(['panel' => 'checkout']);
        }

        $checkoutMessage = '';
        if (checkoutCartWithStock($conexion, $_SESSION['lm_cart'], $_SESSION['id_usuario'], $checkoutMessage)) {
            $_SESSION['lm_cart'] = [];
            unset($_SESSION['lm_checkout_info']);
            flash('Pedido confirmado. Recibiras seguimiento de tu compra.');
        } else {
            flash($checkoutMessage ?: 'Error al procesar el pedido.', 'error');
            redirectStore(['panel' => 'cart']);
        }
        redirectStore();
    }
}

function filteredStoreProducts($products, $category, $search) {
    return array_values(array_filter($products, function ($product) use ($category, $search) {
        $matchesCategory = $category === '' || $product['category'] === $category;
        $haystack = strtolower(($product['name'] ?? '') . ' ' . ($product['category'] ?? '') . ' ' . ($product['desc'] ?? ''));
        $matchesSearch = $search === '' || strpos($haystack, strtolower($search)) !== false;
        return $matchesCategory && $matchesSearch;
    }));
}

function cartTotal($productMap) {
    $total = 0;
    foreach ($_SESSION['lm_cart'] as $id => $qty) {
        if (isset($productMap[$id])) {
            $total += $productMap[$id]['price'] * $qty;
        }
    }
    return $total;
}

$_SESSION['lm_cart'] = $_SESSION['lm_cart'] ?? [];
$_SESSION['lm_wishlist'] = $_SESSION['lm_wishlist'] ?? [];
$_SESSION['lm_checkout_info'] = $_SESSION['lm_checkout_info'] ?? [];

$products = loadStoreProducts($conexion);
$productMap = productMapById($products);
$currentUser = currentStoreUser($conexion);
handleStorePost($conexion, $productMap, $currentUser);

$category = $_GET['cat'] ?? '';
$search = trim($_GET['q'] ?? '');
$panel = $_GET['panel'] ?? '';
$auth = $_GET['auth'] ?? '';
$flash = pullFlashMessage();
$filteredProducts = filteredStoreProducts($products, $category, $search);
$cartCount = array_sum($_SESSION['lm_cart']);
$wishlistCount = count($_SESSION['lm_wishlist']);
$cartTotal = cartTotal($productMap);
$checkoutInfo = $_SESSION['lm_checkout_info'];
$paymentMethods = checkoutPaymentMethods();
$addressTypes = checkoutAddressTypes();
$bogotaLocalities = bogotaLocalities();

$navCategories = [
    '' => 'Inicio',
    'Perros' => 'Perros',
    'Gatos' => 'Gatos',
    'Peces' => 'Peces y Acuarios',
    'Aves' => 'Aves',
    'Pequeñas Mascotas' => 'Pequeñas Mascotas',
    'Salud' => 'Salud y Veterinaria',
    'Higiene' => 'Higiene y Cuidado',
    'Ofertas' => 'Ofertas',
];
?>
