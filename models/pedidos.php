<?php
// Funciones relacionadas con pedidos. Usa las tablas existentes: pedido y detalle_pedido.

include_once __DIR__ . '/actividad_log.php';

function generateDirId() {
    return 'DIR' . date('YmdHis') . random_int(100, 999);
}

function saveDireccionEnvio($conexion, $idUsuario, $tipoVia, $numeroVia, $letraVia, $numeroPlaca, $letraPlaca, $localidad, $complemento) {
    $idDireccion = generateDirId();
    $stmt = mysqli_prepare($conexion, "INSERT INTO direccion_envio (id_direccion, id_usuario, tipo_via, numero_via, letra_via, numero_placa, letra_placa, localidad, complemento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) return false;
    mysqli_stmt_bind_param($stmt, 'sssssssss', $idDireccion, $idUsuario, $tipoVia, $numeroVia, $letraVia, $numeroPlaca, $letraPlaca, $localidad, $complemento);
    if (mysqli_stmt_execute($stmt)) {
        return $idDireccion;
    }
    return false;
}

function addOrderWithDetails($conexion, $userId, $total, $productos, $direccionId, $formaPago) {
    $orderId = generateId('PED');
    $iva = 0;
    $totalValue = floatval($total);
    $status = 'Pendiente';

    mysqli_begin_transaction($conexion);
    try {
        // Insertar pedido
        $stmt = mysqli_prepare($conexion, "INSERT INTO pedido (id_pedido, iva_pedido, total_pedido, estado_pedido, id_usuario, forma_pago, id_direccion) VALUES (?, ?, ?, ?, ?, ?, ?)");
        if (!$stmt) throw new Exception('Error preparando pedido: ' . mysqli_error($conexion));
        mysqli_stmt_bind_param($stmt, 'sddssss', $orderId, $iva, $totalValue, $status, $userId, $formaPago, $direccionId);
        if (!mysqli_stmt_execute($stmt)) throw new Exception('Error insertando pedido: ' . mysqli_stmt_error($stmt));

        // Insertar detalles del pedido y actualizar stock
        foreach ($productos as $item) {
            $detalleId = generateId('DET');
            $productId = $item['id'];
            $qty = intval($item['qty']);
            $unitPrice = floatval($item['price']);

            $subtotal = $qty * $unitPrice;
            $stmtDet = mysqli_prepare($conexion, "INSERT INTO detalle_pedido (id_detalle, cantidad_detalle_pedido, precio_unitario_detalle_pedido, subtotal_detalle_pedido, id_pedido, id_producto) VALUES (?, ?, ?, ?, ?, ?)");
            if (!$stmtDet) throw new Exception('Error preparando detalle: ' . mysqli_error($conexion));
            mysqli_stmt_bind_param($stmtDet, 'siddss', $detalleId, $qty, $unitPrice, $subtotal, $orderId, $productId);
            if (!mysqli_stmt_execute($stmtDet)) throw new Exception('Error insertando detalle: ' . mysqli_stmt_error($stmtDet));

            // Actualizar stock: incrementar cantidad_salida (el trigger calcula stock_producto = cantidad_entrada - cantidad_salida)
            $stmtStock = mysqli_prepare($conexion, "UPDATE Producto SET cantidad_salida = cantidad_salida + ? WHERE id_producto = ? AND (cantidad_entrada - cantidad_salida) >= ?");
            if (!$stmtStock) throw new Exception('Error preparando stock: ' . mysqli_error($conexion));
            mysqli_stmt_bind_param($stmtStock, 'isi', $qty, $productId, $qty);
            if (!mysqli_stmt_execute($stmtStock)) throw new Exception('Error ejecutando stock: ' . mysqli_stmt_error($stmtStock));
            // Verificar que se haya actualizado al menos 1 fila (stock suficiente)
            if (mysqli_affected_rows($conexion) < 1) {
                throw new Exception('Stock insuficiente para el producto ID: ' . $productId . ' (qty solicitada: ' . $qty . ')');
            }
        }

        mysqli_commit($conexion);

        // Log order creation
        $userName = '';
        $stmtName = mysqli_prepare($conexion, "SELECT nombre_usuario FROM usuario WHERE id_usuario = ?");
        if ($stmtName) {
            mysqli_stmt_bind_param($stmtName, 's', $userId);
            mysqli_stmt_execute($stmtName);
            $resName = mysqli_stmt_get_result($stmtName);
            $rowName = mysqli_fetch_assoc($resName);
            $userName = $rowName ? $rowName['nombre_usuario'] : '';
        }
        $productNames = array_map(function($p) { return $p['name'] ?? 'Producto'; }, $productos);
        $desc = "$userName realizo un pedido #$orderId por $" . number_format($totalValue, 0, ',', '.');
        logUserActivity($conexion, $userId, $userName, 'pedido_creado', $desc, null, null, ['order_id' => $orderId, 'total' => $totalValue, 'products' => $productNames, 'payment_method' => $formaPago]);

        return $orderId;
    } catch (Exception $e) {
        mysqli_rollback($conexion);
        // Return the actual error message so caller can use it
        throw $e;
    }
}

function getOrdersByUser($conexion, $userId) {
    $sql = "
        SELECT 
            p.id_pedido AS id,
            p.fecha_pedido AS date,
            p.total_pedido AS total,
            p.estado_pedido AS status,
            p.forma_pago AS payment_method
        FROM pedido p
        WHERE p.id_usuario = ?
        ORDER BY p.fecha_pedido DESC
    ";
    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return [];
    mysqli_stmt_bind_param($stmt, 's', $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $orders = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['total'] = floatval($row['total']);

        // Get products for this order
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
        $row['products'] = [];
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

function getDashboardOrders($conexion) {
    // Parámetros fijos, usando prepared statement para consistencia
    $stmt = mysqli_prepare($conexion, "SELECT id_pedido AS id, fecha_pedido AS date, total_pedido AS total, estado_pedido AS status, id_usuario AS user_id
            FROM pedido
            ORDER BY fecha_pedido DESC");
    if (!$stmt) return [];
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $orders = [];

    while ($row = mysqli_fetch_assoc($result)) {
        $row['total'] = floatval($row['total']);
        $orders[] = $row;
    }

    return $orders;
}

function addOrder($conexion, $userId, $total) {
    // AGREGAR PEDIDO: crea el encabezado del pedido en la tabla pedido.
    $orderId = generateId('PED');
    $iva = 0;
    $totalValue = floatval($total);
    $status = 'Pendiente';

    $stmt = mysqli_prepare($conexion, "INSERT INTO pedido (id_pedido, iva_pedido, total_pedido, estado_pedido, id_usuario) VALUES (?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, 'sddss', $orderId, $iva, $totalValue, $status, $userId);
    return mysqli_stmt_execute($stmt);
}

function saveDashboardOrder($conexion, $id, $total, $status, $userId) {
    if ($id !== '') {
        // EDITAR PEDIDO: actualiza total, estado y usuario asociado del pedido existente.
        $stmt = mysqli_prepare($conexion, "UPDATE pedido SET total_pedido = ?, estado_pedido = ?, id_usuario = ? WHERE id_pedido = ?");
        mysqli_stmt_bind_param($stmt, 'dsss', $total, $status, $userId, $id);
    } else {
        // AGREGAR PEDIDO DESDE DASHBOARD: crea un pedido manual sin detalle de productos.
        $newId = generateId('PED');
        $iva = 0;
        $stmt = mysqli_prepare($conexion, "INSERT INTO pedido (id_pedido, iva_pedido, total_pedido, estado_pedido, id_usuario) VALUES (?, ?, ?, ?, ?)");
        mysqli_stmt_bind_param($stmt, 'sddss', $newId, $iva, $total, $status, $userId);
    }

    return mysqli_stmt_execute($stmt);
}

function deleteDashboardOrder($conexion, $id) {
    // ELIMINAR PEDIDO: primero borra detalles relacionados y luego el encabezado del pedido.
    $stmt = mysqli_prepare($conexion, "DELETE FROM detalle_pedido WHERE id_pedido = ?");
    mysqli_stmt_bind_param($stmt, 's', $id);
    mysqli_stmt_execute($stmt);

    $stmt = mysqli_prepare($conexion, "DELETE FROM pedido WHERE id_pedido = ?");
    mysqli_stmt_bind_param($stmt, 's', $id);
    return mysqli_stmt_execute($stmt);
}
?>
