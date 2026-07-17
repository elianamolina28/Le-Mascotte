<?php
// Funciones para gestionar carrito, wishlist y productos destacados
// Asume tablas: carrito, wishlist

include_once __DIR__ . '/common.php';
include_once __DIR__ . '/actividad_log.php';

/* ===========================================
   HELPERS
=========================================== */

function getProductNameById($conexion, $productId) {
    $stmt = mysqli_prepare($conexion, "SELECT nombre_producto FROM Producto WHERE id_producto = ? LIMIT 1");
    if (!$stmt) return '';
    mysqli_stmt_bind_param($stmt, 's', $productId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    return $row ? $row['nombre_producto'] : 'Producto #' . $productId;
}

function getUserNameById($conexion, $userId) {
    $stmt = mysqli_prepare($conexion, "SELECT nombre_usuario FROM usuario WHERE id_usuario = ? LIMIT 1");
    if (!$stmt) return '';
    mysqli_stmt_bind_param($stmt, 's', $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    return $row ? $row['nombre_usuario'] : 'Usuario #' . $userId;
}

/* ===========================================
   CARRITO CRUD
=========================================== */

function getCartByUser($conexion, $userId) {
    $stmt = mysqli_prepare($conexion, "
        SELECT 
            c.id_carrito AS id,
            c.id_usuario AS user_id,
            c.id_producto AS product_id,
            c.cantidad AS qty,
            c.fecha_agregado AS added_at,
            p.nombre_producto AS name,
            p.precio_producto AS price,
            p.stock_producto AS stock,
            p.estado_producto AS status
        FROM carrito c
        JOIN Producto p ON p.id_producto = c.id_producto
        WHERE c.id_usuario = ?
        ORDER BY c.fecha_agregado DESC
    ");
    if (!$stmt) return [];
    mysqli_stmt_bind_param($stmt, 's', $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price']);
        $row['qty'] = intval($row['qty']);
        $items[] = $row;
    }
    return $items;
}

function getAllCartItems($conexion) {
    $sql = "
        SELECT 
            c.id_carrito AS id,
            c.id_usuario AS user_id,
            c.id_producto AS product_id,
            c.cantidad AS qty,
            c.fecha_agregado AS added_at,
            u.nombre_usuario AS user_name,
            u.correo_usuario AS user_email,
            p.nombre_producto AS product_name,
            p.precio_producto AS price,
            p.stock_producto AS stock
        FROM carrito c
        JOIN usuario u ON u.id_usuario = c.id_usuario
        JOIN Producto p ON p.id_producto = c.id_producto
        ORDER BY c.fecha_agregado DESC
    ";
    $result = mysqli_query($conexion, $sql);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price']);
        $row['qty'] = intval($row['qty']);
        $items[] = $row;
    }
    return $items;
}

function addToCart($conexion, $userId, $productId, $qty = 1, $skipLog = false) {
    // Check if already in cart -> update qty
    $stmt = mysqli_prepare($conexion, "SELECT id_carrito, cantidad FROM carrito WHERE id_usuario = ? AND id_producto = ? LIMIT 1");
    if (!$stmt) return false;
    mysqli_stmt_bind_param($stmt, 'ss', $userId, $productId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $existing = mysqli_fetch_assoc($result);

    $productName = getProductNameById($conexion, $productId);

    if ($existing) {
        $newQty = intval($existing['cantidad']) + $qty;
        $stmt = mysqli_prepare($conexion, "UPDATE carrito SET cantidad = ? WHERE id_carrito = ?");
        mysqli_stmt_bind_param($stmt, 'is', $newQty, $existing['id_carrito']);
        $result = mysqli_stmt_execute($stmt);

        if ($result && !$skipLog) {
            $userName = getUserNameById($conexion, $userId);
            $desc = "$userName aumento la cantidad de '$productName' en el carrito a $newQty unidades";
            logUserActivity($conexion, $userId, $userName, 'carrito_update', $desc, $productId, $productName, ['qty' => $newQty, 'previous_qty' => intval($existing['cantidad'])]);
        }
        return $result;
    } else {
        $id = generateId('CRT');
        $stmt = mysqli_prepare($conexion, "INSERT INTO carrito (id_carrito, id_usuario, id_producto, cantidad) VALUES (?, ?, ?, ?)");
        mysqli_stmt_bind_param($stmt, 'sssi', $id, $userId, $productId, $qty);
        $result = mysqli_stmt_execute($stmt);

        if ($result && !$skipLog) {
            $userName = getUserNameById($conexion, $userId);
            $desc = "$userName agrego '$productName' al carrito (x$qty)";
            logUserActivity($conexion, $userId, $userName, 'carrito_add', $desc, $productId, $productName, ['qty' => $qty]);
        }
        return $result;
    }
}

function removeFromCart($conexion, $carritoId) {
    // Get item info before deleting for logging
    $stmtInfo = mysqli_prepare($conexion, "SELECT c.id_usuario, c.id_producto, p.nombre_producto FROM carrito c JOIN Producto p ON p.id_producto = c.id_producto WHERE c.id_carrito = ?");
    $itemInfo = null;
    if ($stmtInfo) {
        mysqli_stmt_bind_param($stmtInfo, 's', $carritoId);
        mysqli_stmt_execute($stmtInfo);
        $res = mysqli_stmt_get_result($stmtInfo);
        $itemInfo = mysqli_fetch_assoc($res);
        mysqli_stmt_close($stmtInfo);
    }

    $stmt = mysqli_prepare($conexion, "DELETE FROM carrito WHERE id_carrito = ?");
    mysqli_stmt_bind_param($stmt, 's', $carritoId);
    $result = mysqli_stmt_execute($stmt);

    if ($result && $itemInfo) {
        $userName = getUserNameById($conexion, $itemInfo['id_usuario']);
        $prodName = $itemInfo['nombre_producto'] ?: 'Producto';
        $desc = "$userName elimino '$prodName' del carrito";
        logUserActivity($conexion, $itemInfo['id_usuario'], $userName, 'carrito_remove', $desc, $itemInfo['id_producto'], $prodName);
    }
    return $result;
}

function updateCartQty($conexion, $carritoId, $qty) {
    if ($qty <= 0) {
        return removeFromCart($conexion, $carritoId);
    }
    $stmt = mysqli_prepare($conexion, "UPDATE carrito SET cantidad = ? WHERE id_carrito = ?");
    mysqli_stmt_bind_param($stmt, 'is', $qty, $carritoId);
    return mysqli_stmt_execute($stmt);
}

function removeFromCartByProduct($conexion, $userId, $productId) {
    $productName = getProductNameById($conexion, $productId);
    $userName = getUserNameById($conexion, $userId);

    $stmt = mysqli_prepare($conexion, "DELETE FROM carrito WHERE id_usuario = ? AND id_producto = ?");
    mysqli_stmt_bind_param($stmt, 'ss', $userId, $productId);
    $result = mysqli_stmt_execute($stmt);

    if ($result && mysqli_affected_rows($conexion) > 0) {
        $desc = "$userName elimino '$productName' del carrito";
        logUserActivity($conexion, $userId, $userName, 'carrito_remove', $desc, $productId, $productName);
    }
    return $result;
}

function clearUserCart($conexion, $userId) {
    // Get all items before clearing for logging
    $items = getCartByUser($conexion, $userId);
    $stmt = mysqli_prepare($conexion, "DELETE FROM carrito WHERE id_usuario = ?");
    mysqli_stmt_bind_param($stmt, 's', $userId);
    $result = mysqli_stmt_execute($stmt);

    if ($result && count($items) > 0) {
        $userName = getUserNameById($conexion, $userId);
        $itemNames = array_map(function($i) { return $i['name']; }, $items);
        $desc = "$userName vacio su carrito (" . count($items) . " items: " . implode(', ', $itemNames) . ")";
        logUserActivity($conexion, $userId, $userName, 'carrito_remove', $desc, null, null, ['removed_count' => count($items), 'product_ids' => array_map(function($i) { return $i['product_id']; }, $items)]);
    }
    return $result;
}

/* ===========================================
   WISHLIST CRUD
=========================================== */

function getWishlistByUser($conexion, $userId) {
    $stmt = mysqli_prepare($conexion, "
        SELECT 
            w.id_wishlist AS id,
            w.id_usuario AS user_id,
            w.id_producto AS product_id,
            w.fecha_agregado AS added_at,
            p.nombre_producto AS name,
            p.precio_producto AS price,
            p.stock_producto AS stock,
            p.estado_producto AS status
        FROM wishlist w
        JOIN Producto p ON p.id_producto = w.id_producto
        WHERE w.id_usuario = ?
        ORDER BY w.fecha_agregado DESC
    ");
    if (!$stmt) return [];
    mysqli_stmt_bind_param($stmt, 's', $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price']);
        $items[] = $row;
    }
    return $items;
}

function getAllWishlistItems($conexion) {
    $sql = "
        SELECT 
            w.id_wishlist AS id,
            w.id_usuario AS user_id,
            w.id_producto AS product_id,
            w.fecha_agregado AS added_at,
            u.nombre_usuario AS user_name,
            u.correo_usuario AS user_email,
            p.nombre_producto AS product_name,
            p.precio_producto AS price,
            p.stock_producto AS stock
        FROM wishlist w
        JOIN usuario u ON u.id_usuario = w.id_usuario
        JOIN Producto p ON p.id_producto = w.id_producto
        ORDER BY w.fecha_agregado DESC
    ";
    $result = mysqli_query($conexion, $sql);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price']);
        $items[] = $row;
    }
    return $items;
}

function addToWishlist($conexion, $userId, $productId) {
    // Check if already exists (unique constraint handles this, but check for friendly error)
    $stmt = mysqli_prepare($conexion, "SELECT id_wishlist FROM wishlist WHERE id_usuario = ? AND id_producto = ? LIMIT 1");
    if (!$stmt) return false;
    mysqli_stmt_bind_param($stmt, 'ss', $userId, $productId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    if (mysqli_fetch_assoc($result)) {
        return true; // Already exists
    }

    $productName = getProductNameById($conexion, $productId);

    $id = generateId('WSL');
    $stmt = mysqli_prepare($conexion, "INSERT INTO wishlist (id_wishlist, id_usuario, id_producto) VALUES (?, ?, ?)");
    mysqli_stmt_bind_param($stmt, 'sss', $id, $userId, $productId);
    $result = mysqli_stmt_execute($stmt);

    if ($result) {
        $userName = getUserNameById($conexion, $userId);
        $desc = "$userName agrego '$productName' a su Wishlist";
        logUserActivity($conexion, $userId, $userName, 'wishlist_add', $desc, $productId, $productName);
    }
    return $result;
}

function removeFromWishlist($conexion, $wishlistId) {
    $stmt = mysqli_prepare($conexion, "DELETE FROM wishlist WHERE id_wishlist = ?");
    mysqli_stmt_bind_param($stmt, 's', $wishlistId);
    return mysqli_stmt_execute($stmt);
}

function removeFromWishlistByProduct($conexion, $userId, $productId) {
    $productName = getProductNameById($conexion, $productId);
    $userName = getUserNameById($conexion, $userId);

    $stmt = mysqli_prepare($conexion, "DELETE FROM wishlist WHERE id_usuario = ? AND id_producto = ?");
    mysqli_stmt_bind_param($stmt, 'ss', $userId, $productId);
    $result = mysqli_stmt_execute($stmt);

    if ($result) {
        $desc = "$userName elimino '$productName' de su Wishlist";
        logUserActivity($conexion, $userId, $userName, 'wishlist_remove', $desc, $productId, $productName);
    }
    return $result;
}

/* ===========================================
    ANÁLISIS DE TENDENCIAS
   =========================================== */

function getTrendingCartProducts($conexion, $limit = 50, $order = 'DESC') {
    // Products ranked by cart additions across ALL users
    // $order = 'DESC' for most added, 'ASC' for least added
    $orderDir = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';
    $sql = "
        SELECT 
            p.id_producto AS id,
            p.nombre_producto AS name,
            COALESCE(cat.nombre_categoria, p.id_categoria, 'Sin categoria') AS category,
            p.stock_producto AS stock,
            COALESCE(c.total_added, 0) AS total_count
        FROM Producto p
        LEFT JOIN categoria cat ON cat.id_categoria = p.id_categoria
        LEFT JOIN (
            SELECT id_producto, SUM(cantidad) AS total_added
            FROM carrito
            GROUP BY id_producto
        ) c ON c.id_producto = p.id_producto
        ORDER BY total_count $orderDir, p.nombre_producto ASC
        LIMIT ?
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return [];
    mysqli_stmt_bind_param($stmt, 'i', $limit);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['total_count'] = intval($row['total_count']);
        $row['stock'] = intval($row['stock'] ?? 0);
        $items[] = $row;
    }
    return $items;
}

function getTrendingWishlistProducts($conexion, $limit = 50, $order = 'DESC') {
    // Products ranked by wishlist saves across ALL users
    // $order = 'DESC' for most saved, 'ASC' for least saved
    $orderDir = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';
    $sql = "
        SELECT 
            p.id_producto AS id,
            p.nombre_producto AS name,
            COALESCE(cat.nombre_categoria, p.id_categoria, 'Sin categoria') AS category,
            p.stock_producto AS stock,
            COALESCE(w.total_added, 0) AS total_count
        FROM Producto p
        LEFT JOIN categoria cat ON cat.id_categoria = p.id_categoria
        LEFT JOIN (
            SELECT id_producto, COUNT(*) AS total_added
            FROM wishlist
            GROUP BY id_producto
        ) w ON w.id_producto = p.id_producto
        ORDER BY total_count $orderDir, p.nombre_producto ASC
        LIMIT ?
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return [];
    mysqli_stmt_bind_param($stmt, 'i', $limit);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['total_count'] = intval($row['total_count']);
        $row['stock'] = intval($row['stock'] ?? 0);
        $items[] = $row;
    }
    return $items;
}

/* ===========================================
    PRODUCTOS DESTACADOS (Featured / Most Added)
   =========================================== */

function getFeaturedProducts($conexion, $limit = 10) {
    // Products most frequently added to wishlist or cart
    $sql = "
        SELECT 
            p.id_producto AS id,
            p.nombre_producto AS name,
            p.precio_producto AS price,
            p.stock_producto AS stock,
            COALESCE(w.count, 0) AS wishlist_count,
            COALESCE(c.count, 0) AS cart_count,
            (COALESCE(w.count, 0) + COALESCE(c.count, 0)) AS total_count
        FROM Producto p
        LEFT JOIN (
            SELECT id_producto, COUNT(*) AS count FROM wishlist GROUP BY id_producto
        ) w ON w.id_producto = p.id_producto
        LEFT JOIN (
            SELECT id_producto, SUM(cantidad) AS count FROM carrito GROUP BY id_producto
        ) c ON c.id_producto = p.id_producto
        ORDER BY total_count DESC
        LIMIT ?
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return [];
    mysqli_stmt_bind_param($stmt, 'i', $limit);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price']);
        $row['wishlist_count'] = intval($row['wishlist_count']);
        $row['cart_count'] = intval($row['cart_count']);
        $row['total_count'] = intval($row['total_count']);
        $items[] = $row;
    }
    return $items;
}

/* ===========================================
    ANALÍTICA DE COMPORTAMIENTO DEL CLIENTE
   =========================================== */

function getCartAnalytics($conexion, $search = '', $page = 1, $perPage = 20) {
    // Products in cart aggregated: frequency count + unique users
    $offset = max(0, ($page - 1) * $perPage);
    $where = '';
    $params = [];
    $types = '';

    if ($search !== '') {
        $where = "WHERE p.nombre_producto LIKE ?";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $types .= 's';
    }

    // Count total
    $countSql = "
        SELECT COUNT(DISTINCT c.id_producto) AS total
        FROM carrito c
        JOIN Producto p ON p.id_producto = c.id_producto
        $where
    ";
    $stmtCount = mysqli_prepare($conexion, $countSql);
    if ($stmtCount) {
        if (!empty($params)) {
            mysqli_stmt_bind_param($stmtCount, $types, ...$params);
        }
        mysqli_stmt_execute($stmtCount);
        $resCount = mysqli_stmt_get_result($stmtCount);
        $totalRow = mysqli_fetch_assoc($resCount);
        $totalRecords = intval($totalRow['total'] ?? 0);
        mysqli_stmt_close($stmtCount);
    } else {
        $totalRecords = 0;
    }

    // Get paginated data with COUNT(*) for frequency and COUNT(DISTINCT) for unique users
    $sql = "
        SELECT 
            p.id_producto AS id,
            p.nombre_producto AS name,
            p.precio_producto AS price,
            p.stock_producto AS stock,
            COUNT(*) AS times_added,
            COUNT(DISTINCT c.id_usuario) AS unique_users
        FROM carrito c
        JOIN Producto p ON p.id_producto = c.id_producto
        $where
        GROUP BY c.id_producto, p.id_producto, p.nombre_producto, p.precio_producto, p.stock_producto
        ORDER BY times_added DESC, unique_users DESC, p.nombre_producto ASC
        LIMIT ? OFFSET ?
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return ['products' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage];

    // Bind search param + limit + offset
    $bindParams = [];
    foreach ($params as $p) $bindParams[] = $p;
    $bindParams[] = intval($perPage);
    $bindParams[] = intval($offset);
    $bindTypes = $types . 'ii';

    mysqli_stmt_bind_param($stmt, $bindTypes, ...$bindParams);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['times_added'] = intval($row['times_added']);
        $row['unique_users'] = intval($row['unique_users']);
        $row['stock'] = intval($row['stock'] ?? 0);
        $row['price'] = floatval($row['price'] ?? 0);
        $items[] = $row;
    }
    mysqli_stmt_close($stmt);
    return ['products' => $items, 'total' => $totalRecords, 'page' => $page, 'per_page' => $perPage];
}

function getWishlistAnalytics($conexion, $search = '', $page = 1, $perPage = 20) {
    // Products in wishlist aggregated: frequency count + unique users
    $offset = max(0, ($page - 1) * $perPage);
    $where = '';
    $params = [];
    $types = '';

    if ($search !== '') {
        $where = "WHERE p.nombre_producto LIKE ?";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $types .= 's';
    }

    // Count total
    $countSql = "
        SELECT COUNT(DISTINCT w.id_producto) AS total
        FROM wish_list w
        JOIN Producto p ON p.id_producto = w.id_producto
        $where
    ";
    $stmtCount = mysqli_prepare($conexion, $countSql);
    if ($stmtCount) {
        if (!empty($params)) {
            mysqli_stmt_bind_param($stmtCount, $types, ...$params);
        }
        mysqli_stmt_execute($stmtCount);
        $resCount = mysqli_stmt_get_result($stmtCount);
        $totalRow = mysqli_fetch_assoc($resCount);
        $totalRecords = intval($totalRow['total'] ?? 0);
        mysqli_stmt_close($stmtCount);
    } else {
        $totalRecords = 0;
    }

    $sql = "
        SELECT 
            p.id_producto AS id,
            p.nombre_producto AS name,
            p.precio_producto AS price,
            p.stock_producto AS stock,
            COUNT(*) AS times_added,
            COUNT(DISTINCT w.id_usuario) AS unique_users
        FROM wish_list w
        JOIN Producto p ON p.id_producto = w.id_producto
        $where
        GROUP BY w.id_producto, p.id_producto, p.nombre_producto, p.precio_producto, p.stock_producto
        ORDER BY times_added DESC, unique_users DESC, p.nombre_producto ASC
        LIMIT ? OFFSET ?
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return ['products' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage];

    $bindParams = [];
    foreach ($params as $p) $bindParams[] = $p;
    $bindParams[] = intval($perPage);
    $bindParams[] = intval($offset);
    $bindTypes = $types . 'ii';

    mysqli_stmt_bind_param($stmt, $bindTypes, ...$bindParams);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['times_added'] = intval($row['times_added']);
        $row['unique_users'] = intval($row['unique_users']);
        $row['stock'] = intval($row['stock'] ?? 0);
        $row['price'] = floatval($row['price'] ?? 0);
        $items[] = $row;
    }
    mysqli_stmt_close($stmt);
    return ['products' => $items, 'total' => $totalRecords, 'page' => $page, 'per_page' => $perPage];
}

function getCartTotalProducts($conexion) {
    $result = mysqli_query($conexion, "SELECT COUNT(DISTINCT id_producto) AS total FROM carrito");
    $row = mysqli_fetch_assoc($result);
    return intval($row['total'] ?? 0);
}

function getWishlistTotalProducts($conexion) {
    $result = mysqli_query($conexion, "SELECT COUNT(DISTINCT id_producto) AS total FROM wish_list");
    $row = mysqli_fetch_assoc($result);
    return intval($row['total'] ?? 0);
}

/* ===========================================
    REGISTRO EN VIVO - ADICIONES INDIVIDUALES
   =========================================== */

function getRecentCartAdditions($conexion, $search = '', $page = 1, $perPage = 20) {
    $offset = max(0, ($page - 1) * $perPage);
    $where = '';
    $params = [];
    $types = '';

    if ($search !== '') {
        $where = "WHERE (p.nombre_producto LIKE ? OR u.nombre_usuario LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= 'ss';
    }

    // Count total
    $countSql = "SELECT COUNT(*) AS total FROM carrito c JOIN Producto p ON p.id_producto = c.id_producto JOIN usuario u ON u.id_usuario = c.id_usuario $where";
    $stmtCount = mysqli_prepare($conexion, $countSql);
    $totalRecords = 0;
    if ($stmtCount) {
        if (!empty($params)) {
            mysqli_stmt_bind_param($stmtCount, $types, ...$params);
        }
        mysqli_stmt_execute($stmtCount);
        $resCount = mysqli_stmt_get_result($stmtCount);
        $totalRow = mysqli_fetch_assoc($resCount);
        $totalRecords = intval($totalRow['total'] ?? 0);
        mysqli_stmt_close($stmtCount);
    }

    $sql = "
        SELECT 
            c.id_carrito AS id,
            c.id_usuario AS user_id,
            c.id_producto AS product_id,
            c.cantidad AS qty,
            c.fecha_agregado AS added_at,
            p.nombre_producto AS product_name,
            p.precio_producto AS price,
            p.stock_producto AS stock,
            u.nombre_usuario AS user_name,
            u.correo_usuario AS user_email
        FROM carrito c
        JOIN Producto p ON p.id_producto = c.id_producto
        JOIN usuario u ON u.id_usuario = c.id_usuario
        $where
        ORDER BY c.fecha_agregado DESC
        LIMIT ? OFFSET ?
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return ['items' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage];

    $bindParams = [];
    foreach ($params as $p) $bindParams[] = $p;
    $bindParams[] = intval($perPage);
    $bindParams[] = intval($offset);
    $bindTypes = $types . 'ii';

    mysqli_stmt_bind_param($stmt, $bindTypes, ...$bindParams);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['qty'] = intval($row['qty']);
        $row['price'] = floatval($row['price'] ?? 0);
        $row['stock'] = intval($row['stock'] ?? 0);
        $items[] = $row;
    }
    mysqli_stmt_close($stmt);
    return ['items' => $items, 'total' => $totalRecords, 'page' => $page, 'per_page' => $perPage];
}

function getRecentWishlistAdditions($conexion, $search = '', $page = 1, $perPage = 20) {
    $offset = max(0, ($page - 1) * $perPage);
    $where = '';
    $params = [];
    $types = '';

    if ($search !== '') {
        $where = "WHERE (p.nombre_producto LIKE ? OR u.nombre_usuario LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= 'ss';
    }

    $countSql = "SELECT COUNT(*) AS total FROM wishlist w JOIN Producto p ON p.id_producto = w.id_producto JOIN usuario u ON u.id_usuario = w.id_usuario $where";
    $stmtCount = mysqli_prepare($conexion, $countSql);
    $totalRecords = 0;
    if ($stmtCount) {
        if (!empty($params)) {
            mysqli_stmt_bind_param($stmtCount, $types, ...$params);
        }
        mysqli_stmt_execute($stmtCount);
        $resCount = mysqli_stmt_get_result($stmtCount);
        $totalRow = mysqli_fetch_assoc($resCount);
        $totalRecords = intval($totalRow['total'] ?? 0);
        mysqli_stmt_close($stmtCount);
    }

    $sql = "
        SELECT 
            w.id_wishlist AS id,
            w.id_usuario AS user_id,
            w.id_producto AS product_id,
            w.fecha_agregado AS added_at,
            p.nombre_producto AS product_name,
            p.precio_producto AS price,
            p.stock_producto AS stock,
            u.nombre_usuario AS user_name,
            u.correo_usuario AS user_email
        FROM wishlist w
        JOIN Producto p ON p.id_producto = w.id_producto
        JOIN usuario u ON u.id_usuario = w.id_usuario
        $where
        ORDER BY w.fecha_agregado DESC
        LIMIT ? OFFSET ?
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return ['items' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage];

    $bindParams = [];
    foreach ($params as $p) $bindParams[] = $p;
    $bindParams[] = intval($perPage);
    $bindParams[] = intval($offset);
    $bindTypes = $types . 'ii';

    mysqli_stmt_bind_param($stmt, $bindTypes, ...$bindParams);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price'] ?? 0);
        $row['stock'] = intval($row['stock'] ?? 0);
        $items[] = $row;
    }
    mysqli_stmt_close($stmt);
    return ['items' => $items, 'total' => $totalRecords, 'page' => $page, 'per_page' => $perPage];
}

/* ===========================================
    PEDIDOS - ESTADOS DETALLADOS
=========================================== */

function getOrderStatusHistory() {
    return ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
}

function updateOrderStatus($conexion, $orderId, $newStatus) {
    // Get order info before updating for logging
    $oldStatus = '';
    $userId = '';
    $stmtInfo = mysqli_prepare($conexion, "SELECT estado_pedido, id_usuario FROM pedido WHERE id_pedido = ? LIMIT 1");
    if ($stmtInfo) {
        mysqli_stmt_bind_param($stmtInfo, 's', $orderId);
        mysqli_stmt_execute($stmtInfo);
        $res = mysqli_stmt_get_result($stmtInfo);
        $row = mysqli_fetch_assoc($res);
        if ($row) {
            $oldStatus = $row['estado_pedido'];
            $userId = $row['id_usuario'];
        }
        mysqli_stmt_close($stmtInfo);
    }

    // Primero intentamos actualizar incluyendo fecha_actualizacion
    // Si la columna no existe, la agregamos y luego actualizamos solo con estado_pedido
    $updateStmt = mysqli_prepare($conexion, "UPDATE pedido SET estado_pedido = ?, fecha_actualizacion = NOW() WHERE id_pedido = ?");
    if (!$updateStmt) {
        // La columna fecha_actualizacion no existe, actualizamos solo el estado
        $updateStmt = mysqli_prepare($conexion, "UPDATE pedido SET estado_pedido = ? WHERE id_pedido = ?");
        if (!$updateStmt) {
            return false;
        }
    }
    mysqli_stmt_bind_param($updateStmt, 'ss', $newStatus, $orderId);
    $result = mysqli_stmt_execute($updateStmt);
    mysqli_stmt_close($updateStmt);

    if ($result && $userId && $oldStatus && $oldStatus !== $newStatus) {
        $userName = getUserNameById($conexion, $userId);
        $desc = "Pedido #$orderId cambio de '$oldStatus' a '$newStatus'";
        logUserActivity($conexion, $userId, $userName, 'pedido_actualizado', $desc, null, null, ['order_id' => $orderId, 'old_status' => $oldStatus, 'new_status' => $newStatus]);
    }
    return $result;
}

function getOrderDetailsWithUser($conexion, $orderId) {
    $sql = "
        SELECT 
            p.id_pedido AS id,
            p.fecha_pedido AS date,
            p.fecha_actualizacion AS updated_at,
            p.total_pedido AS total,
            p.estado_pedido AS status,
            p.forma_pago AS payment_method,
            p.id_usuario AS user_id,
            u.nombre_usuario AS user_name,
            u.correo_usuario AS user_email,
            u.telefono_usuario AS user_phone
        FROM pedido p
        JOIN usuario u ON u.id_usuario = p.id_usuario
        WHERE p.id_pedido = ?
        LIMIT 1
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return null;
    mysqli_stmt_bind_param($stmt, 's', $orderId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $order = mysqli_fetch_assoc($result);
    if (!$order) return null;
    $order['total'] = floatval($order['total']);

    // Get order details (products)
    $stmtDet = mysqli_prepare($conexion, "
        SELECT 
            d.id_detalle AS id,
            d.cantidad_detalle_pedido AS qty,
            d.precio_unitario_detalle_pedido AS unit_price,
            d.id_producto AS product_id,
            pr.nombre_producto AS product_name
        FROM detalle_pedido d
        LEFT JOIN Producto pr ON pr.id_producto = d.id_producto
        WHERE d.id_pedido = ?
    ");
    if ($stmtDet) {
        mysqli_stmt_bind_param($stmtDet, 's', $orderId);
        mysqli_stmt_execute($stmtDet);
        $resDet = mysqli_stmt_get_result($stmtDet);
        $order['products'] = [];
        while ($row = mysqli_fetch_assoc($resDet)) {
            $row['qty'] = intval($row['qty']);
            $row['unit_price'] = floatval($row['unit_price']);
            $order['products'][] = $row;
        }
    } else {
        $order['products'] = [];
    }

    // Get shipping address
    $stmtAddr = mysqli_prepare($conexion, "
        SELECT tipo_via, numero_via, letra_via, numero_placa, letra_placa, localidad, complemento
        FROM direccion_envio WHERE id_direccion = (
            SELECT id_direccion FROM pedido WHERE id_pedido = ? LIMIT 1
        ) LIMIT 1
    ");
    if ($stmtAddr) {
        mysqli_stmt_bind_param($stmtAddr, 's', $orderId);
        mysqli_stmt_execute($stmtAddr);
        $resAddr = mysqli_stmt_get_result($stmtAddr);
        $order['address'] = mysqli_fetch_assoc($resAddr) ?? null;
    } else {
        $order['address'] = null;
    }

    return $order;
}

function getAllOrdersWithDetails($conexion) {
    $sql = "
        SELECT 
            p.id_pedido AS id,
            p.fecha_pedido AS date,
            p.fecha_actualizacion AS updated_at,
            p.total_pedido AS total,
            p.estado_pedido AS status,
            p.forma_pago AS payment_method,
            p.id_usuario AS user_id,
            u.nombre_usuario AS user_name,
            u.correo_usuario AS user_email,
            u.telefono_usuario AS user_phone
        FROM pedido p
        JOIN usuario u ON u.id_usuario = p.id_usuario
        ORDER BY p.fecha_pedido DESC
    ";
    $result = mysqli_query($conexion, $sql);
    $orders = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['total'] = floatval($row['total']);
        $row['products'] = [];

        // Get products for each order
        $stmtDet = mysqli_prepare($conexion, "
            SELECT 
                d.cantidad_detalle_pedido AS qty,
                d.precio_unitario_detalle_pedido AS unit_price,
                d.id_producto AS product_id,
                pr.nombre_producto AS product_name
            FROM detalle_pedido d
            LEFT JOIN Producto pr ON pr.id_producto = d.id_producto
            WHERE d.id_pedido = ?
        ");
        if ($stmtDet) {
            mysqli_stmt_bind_param($stmtDet, 's', $row['id']);
            mysqli_stmt_execute($stmtDet);
            $resDet = mysqli_stmt_get_result($stmtDet);
            while ($det = mysqli_fetch_assoc($resDet)) {
                $det['qty'] = intval($det['qty']);
                $det['unit_price'] = floatval($det['unit_price']);
                $row['products'][] = $det;
            }
        }
        $orders[] = $row;
    }
    return $orders;
}