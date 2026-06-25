<?php
// Funciones relacionadas con productos. Usa la tabla existente: Producto.
include_once __DIR__ . '/common.php';

function defaultProductCategories() {
    return ['Perros', 'Gatos', 'Accesorios', 'Peces', 'Aves', 'Pequeñas Mascotas', 'Salud', 'Higiene', 'Ofertas'];
}

function getDashboardCategories($conexion) {
    $categories = defaultProductCategories();
    $result = mysqli_query($conexion, "SELECT nombre_categoria FROM categoria ORDER BY nombre_categoria ASC");

    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $name = trim($row['nombre_categoria'] ?? '');
            if ($name !== '') {
                $categories[] = $name;
            }
        }
    }

    return array_values(array_unique($categories));
}

function generateCategoryId($conexion) {
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $categoryId = 'CAT' . random_int(1000000, 9999999);
        $stmt = mysqli_prepare($conexion, "SELECT id_categoria FROM categoria WHERE id_categoria = ? LIMIT 1");
        if (!$stmt) {
            return $categoryId;
        }

        mysqli_stmt_bind_param($stmt, 's', $categoryId);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);

        if (!mysqli_fetch_assoc($result)) {
            return $categoryId;
        }
    }

    return 'CAT' . substr((string) time(), -7);
}

function resolveCategoryId($conexion, $category) {
    $category = trim($category);
    if ($category === '') {
        return null;
    }

    $stmt = mysqli_prepare($conexion, "SELECT id_categoria FROM categoria WHERE id_categoria = ? OR nombre_categoria = ? LIMIT 1");
    if (!$stmt) {
        return null;
    }
    mysqli_stmt_bind_param($stmt, 'ss', $category, $category);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);

    if ($row) {
        return $row['id_categoria'];
    }

    $categoryId = generateCategoryId($conexion);
    $stmt = mysqli_prepare($conexion, "INSERT INTO categoria (id_categoria, nombre_categoria) VALUES (?, ?)");
    if (!$stmt) {
        return null;
    }
    mysqli_stmt_bind_param($stmt, 'ss', $categoryId, $category);

    try {
        if (mysqli_stmt_execute($stmt)) {
            return $categoryId;
        }
    } catch (mysqli_sql_exception $e) {
        $stmt = mysqli_prepare($conexion, "SELECT id_categoria FROM categoria WHERE nombre_categoria = ? LIMIT 1");
        if (!$stmt) {
            return null;
        }
        mysqli_stmt_bind_param($stmt, 's', $category);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        $row = mysqli_fetch_assoc($result);

        return $row['id_categoria'] ?? null;
    }

    $stmt = mysqli_prepare($conexion, "SELECT id_categoria FROM categoria WHERE nombre_categoria = ? LIMIT 1");
    if (!$stmt) {
        return null;
    }
    mysqli_stmt_bind_param($stmt, 's', $category);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);

    return $row['id_categoria'] ?? null;
}

function productImagesTableExists($conexion) {
    $result = mysqli_query($conexion, "SHOW TABLES LIKE 'Imagen_Producto'");
    return $result && mysqli_num_rows($result) > 0;
}

function getDashboardProducts($conexion) {
    $imageSelect = "'' AS img";
    if (productImagesTableExists($conexion)) {
        $imageSelect = "COALESCE((
            SELECT ip.url_imagen
            FROM Imagen_Producto ip
            WHERE ip.id_producto = p.id_producto
            LIMIT 1
        ), '') AS img";
    }

    $sql = "SELECT
                p.id_producto AS id,
                p.nombre_producto AS name,
                p.descripcion_producto AS `desc`,
                COALESCE(c.nombre_categoria, p.id_categoria, 'Sin categoria') AS category,
                p.precio_producto AS price,
                p.stock_producto AS stock,
                p.cantidad_entrada AS cantidad_entrada,
                p.cantidad_salida AS cantidad_salida,
                p.valor_compra AS valor_compra,
                p.estado_producto AS status,
                $imageSelect
            FROM Producto p
            LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
            ORDER BY p.nombre_producto ASC";
    $result = mysqli_query($conexion, $sql);
    $products = [];

    if (!$result) {
        return $products;
    }

    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price']);
        $row['valor_compra'] = floatval($row['valor_compra'] ?? 0);
        $row['cantidad_entrada'] = intval($row['cantidad_entrada'] ?? 0);
        $row['cantidad_salida'] = intval($row['cantidad_salida'] ?? 0);
        $products[] = $row;
    }

    return $products;
}

function searchDashboardProducts($conexion, $search = '', $category = '') {
    $imageSelect = "'' AS img";
    if (productImagesTableExists($conexion)) {
        $imageSelect = "COALESCE((
            SELECT ip.url_imagen
            FROM Imagen_Producto ip
            WHERE ip.id_producto = p.id_producto
            LIMIT 1
        ), '') AS img";
    }

    $sql = "SELECT
                p.id_producto AS id,
                p.nombre_producto AS name,
                p.descripcion_producto AS `desc`,
                COALESCE(c.nombre_categoria, p.id_categoria, 'Sin categoria') AS category,
                p.precio_producto AS price,
                p.stock_producto AS stock,
                p.cantidad_entrada AS cantidad_entrada,
                p.cantidad_salida AS cantidad_salida,
                p.valor_compra AS valor_compra,
                p.estado_producto AS status,
                $imageSelect
            FROM Producto p
            LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
            WHERE 1=1";
    $params = [];
    $types = '';

    if ($search !== '') {
        $sql .= " AND (p.nombre_producto LIKE ? OR p.descripcion_producto LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= 'ss';
    }

    if ($category !== '') {
        $sql .= " AND (c.nombre_categoria = ? OR p.id_categoria = ?)";
        $params[] = $category;
        $params[] = $category;
        $types .= 'ss';
    }

    $sql .= " ORDER BY p.nombre_producto ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) {
        return getDashboardProducts($conexion);
    }

    if (!empty($params)) {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }

    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $products = [];

    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price']);
        $row['valor_compra'] = floatval($row['valor_compra'] ?? 0);
        $row['cantidad_entrada'] = intval($row['cantidad_entrada'] ?? 0);
        $row['cantidad_salida'] = intval($row['cantidad_salida'] ?? 0);
        $products[] = $row;
    }

    return $products;
}

/**
 * NEW: Advanced inventory search with stock level filtering.
 * Supports: name search, category filter, stock level (bajo/alto/agotado/todo)
 * Optimized SQL with prepared statements.
 */
function getInventoryProducts($conexion, $search = '', $category = '', $stockLevel = '') {
    $imageSelect = "'' AS img";
    if (productImagesTableExists($conexion)) {
        $imageSelect = "COALESCE((
            SELECT ip.url_imagen
            FROM Imagen_Producto ip
            WHERE ip.id_producto = p.id_producto
            LIMIT 1
        ), '') AS img";
    }

    $sql = "SELECT
                p.id_producto AS id,
                p.nombre_producto AS name,
                p.descripcion_producto AS `desc`,
                COALESCE(c.nombre_categoria, p.id_categoria, 'Sin categoria') AS category,
                p.precio_producto AS price,
                p.stock_producto AS stock,
                p.cantidad_entrada AS cantidad_entrada,
                p.cantidad_salida AS cantidad_salida,
                p.valor_compra AS valor_compra,
                p.estado_producto AS status,
                $imageSelect
            FROM Producto p
            LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
            WHERE 1=1";
    $params = [];
    $types = '';

    // Name search filter
    if ($search !== '') {
        $sql .= " AND (p.nombre_producto LIKE ? OR p.descripcion_producto LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= 'ss';
    }

    // Category filter
    if ($category !== '') {
        $sql .= " AND (c.nombre_categoria = ? OR p.id_categoria = ?)";
        $params[] = $category;
        $params[] = $category;
        $types .= 'ss';
    }

    // Stock level filter
    if ($stockLevel === 'bajo') {
        $sql .= " AND p.stock_producto > 0 AND p.stock_producto < 5";
    } elseif ($stockLevel === 'alto') {
        $sql .= " AND p.stock_producto >= 20";
    } elseif ($stockLevel === 'agotado') {
        $sql .= " AND (p.stock_producto = 0 OR p.stock_producto IS NULL)";
    }
    // If 'todo' or empty, no stock filter

    $sql .= " ORDER BY p.nombre_producto ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) {
        return [];
    }

    if (!empty($params)) {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }

    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $products = [];

    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = floatval($row['price']);
        $row['valor_compra'] = floatval($row['valor_compra'] ?? 0);
        $row['cantidad_entrada'] = intval($row['cantidad_entrada'] ?? 0);
        $row['cantidad_salida'] = intval($row['cantidad_salida'] ?? 0);
        $products[] = $row;
    }

    return $products;
}

function saveDashboardProduct($conexion, $id, $name, $category, $price, $img) {
    $description = trim(getValue('desc'));
    $cantidadEntrada = max(0, intval(getValue('cantidad_entrada', 0)));
    $cantidadSalida = max(0, intval(getValue('cantidad_salida', 0)));
    $valorCompra = max(0, floatval(getValue('valor_compra', 0)));
    $stock = max(0, intval(getValue('stock', 0)));
    $status = $stock > 0 ? 'Disponible' : 'Agotado';
    $categoryId = resolveCategoryId($conexion, $category);
    if ($categoryId === null) {
        return false;
    }

    if ($id !== '') {
        // EDITAR PRODUCTO: actualiza usando cantidad_entrada/salida y valor_compra.
        // El trigger de BD auto-calcula stock_producto = cantidad_entrada - cantidad_salida
        // y precio_producto = valor_compra * 1.80 si no se especifica uno manualmente.
        $stmt = mysqli_prepare($conexion, "UPDATE Producto SET nombre_producto = ?, descripcion_producto = ?, precio_producto = ?, cantidad_entrada = ?, cantidad_salida = ?, valor_compra = ?, estado_producto = ?, id_categoria = ? WHERE id_producto = ?");
        if (!$stmt) {
            return false;
        }
        // Types: s=string, d=double, i=integer
        // name(s), desc(s), price(d), cantidadEntrada(i), cantidadSalida(i), valorCompra(d), status(s), categoryId(s), id(s)
        mysqli_stmt_bind_param($stmt, 'ssdiidsss', $name, $description, $price, $cantidadEntrada, $cantidadSalida, $valorCompra, $status, $categoryId, $id);
    } else {
        // AGREGAR PRODUCTO: usa las nuevas columnas de inventario.
        $id = generateId('PROD');
        // El trigger BEFORE INSERT calcula automaticamente:
        // stock_producto = cantidad_entrada - cantidad_salida
        // precio_producto = valor_compra * 1.80 (si no se especifica)
        $stmt = mysqli_prepare($conexion, "INSERT INTO Producto (id_producto, nombre_producto, descripcion_producto, precio_producto, cantidad_entrada, cantidad_salida, valor_compra, estado_producto, id_categoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
            return false;
        }
        // Types: id(s), name(s), desc(s), price(d), cantidadEntrada(i), cantidadSalida(i), valorCompra(d), status(s), categoryId(s)
        mysqli_stmt_bind_param($stmt, 'sssdiidss', $id, $name, $description, $price, $cantidadEntrada, $cantidadSalida, $valorCompra, $status, $categoryId);
    }

    if (!mysqli_stmt_execute($stmt)) {
        return false;
    }

    if ($img !== '' && productImagesTableExists($conexion)) {
        saveProductImage($conexion, $id, $img);
    }

    return true;
}

function deleteDashboardProduct($conexion, $id) {
    // ELIMINAR PRODUCTO: borra imagenes relacionadas y luego el producto indicado por su id_producto.
    if (productImagesTableExists($conexion)) {
        $stmt = mysqli_prepare($conexion, "DELETE FROM Imagen_Producto WHERE id_producto = ?");
        mysqli_stmt_bind_param($stmt, 's', $id);
        mysqli_stmt_execute($stmt);
    }

    $stmt = mysqli_prepare($conexion, "DELETE FROM Producto WHERE id_producto = ?");
    if (!$stmt) {
        return false;
    }
    mysqli_stmt_bind_param($stmt, 's', $id);
    return mysqli_stmt_execute($stmt);
}

/**
 * Get product statistics: count by category, low stock (<5), high stock (>=20)
 * Uses optimized SQL queries with GROUP BY and aggregate functions.
 */
function getProductStats($conexion) {
    // Count products per category
    $catQuery = "SELECT 
                    COALESCE(c.nombre_categoria, 'Sin categoría') AS category,
                    COUNT(*) AS count
                 FROM Producto p
                 LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
                 GROUP BY c.nombre_categoria
                 ORDER BY count DESC";
    $catResult = mysqli_query($conexion, $catQuery);
    $categories = [];
    if ($catResult) {
        while ($row = mysqli_fetch_assoc($catResult)) {
            $categories[] = [
                'name' => $row['category'],
                'count' => intval($row['count']),
            ];
        }
    }

    // Total product count
    $totalResult = mysqli_query($conexion, "SELECT COUNT(*) AS total FROM Producto");
    $totalProducts = 0;
    if ($totalResult) {
        $totalProducts = intval(mysqli_fetch_assoc($totalResult)['total']);
    }

    // Low stock products (stock > 0 and stock < 5 threshold)
    $lowStockResult = mysqli_query($conexion, "SELECT COUNT(*) AS count FROM Producto WHERE stock_producto > 0 AND stock_producto < 5");
    $lowStock = 0;
    if ($lowStockResult) {
        $lowStock = intval(mysqli_fetch_assoc($lowStockResult)['count']);
    }

    // High stock products (stock >= 20)
    $highStockResult = mysqli_query($conexion, "SELECT COUNT(*) AS count FROM Producto WHERE stock_producto >= 20");
    $highStock = 0;
    if ($highStockResult) {
        $highStock = intval(mysqli_fetch_assoc($highStockResult)['count']);
    }

    // Out of stock products
    $outOfStockResult = mysqli_query($conexion, "SELECT COUNT(*) AS count FROM Producto WHERE stock_producto = 0 OR stock_producto IS NULL");
    $outOfStock = 0;
    if ($outOfStockResult) {
        $outOfStock = intval(mysqli_fetch_assoc($outOfStockResult)['count']);
    }

    // Total stock value (sum of all stock)
    $stockValueResult = mysqli_query($conexion, "SELECT SUM(stock_producto) AS total FROM Producto");
    $totalStock = 0;
    if ($stockValueResult) {
        $totalStock = intval(mysqli_fetch_assoc($stockValueResult)['total']);
    }

    return [
        'total_products' => $totalProducts,
        'categories' => $categories,
        'low_stock' => $lowStock,
        'high_stock' => $highStock,
        'out_of_stock' => $outOfStock,
        'total_stock' => $totalStock,
    ];
}

function saveProductImage($conexion, $productId, $url) {
    $stmt = mysqli_prepare($conexion, "SELECT id_imagen FROM Imagen_Producto WHERE id_producto = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, 's', $productId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $image = mysqli_fetch_assoc($result);

    if ($image) {
        $stmt = mysqli_prepare($conexion, "UPDATE Imagen_Producto SET url_imagen = ? WHERE id_imagen = ?");
        mysqli_stmt_bind_param($stmt, 'ss', $url, $image['id_imagen']);
    } else {
        $imageId = generateId('IMG');
        $stmt = mysqli_prepare($conexion, "INSERT INTO Imagen_Producto (id_imagen, url_imagen, id_producto) VALUES (?, ?, ?)");
        mysqli_stmt_bind_param($stmt, 'sss', $imageId, $url, $productId);
    }

    return mysqli_stmt_execute($stmt);
}
?>