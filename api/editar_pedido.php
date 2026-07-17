<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/common.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
}

$pedidoId = trim($input['pedido_id'] ?? '');
$userId = trim($input['user_id'] ?? '');
$productos = $input['productos'] ?? [];

if (empty($pedidoId) || empty($userId) || empty($productos)) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

try {
    // Verificar que el pedido existe y pertenece al usuario
    $stmt = mysqli_prepare($conexion, "SELECT id_pedido, estado_pedido, total_pedido FROM pedido WHERE id_pedido = ? AND id_usuario = ?");
    mysqli_stmt_bind_param($stmt, 'ss', $pedidoId, $userId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $pedido = mysqli_fetch_assoc($result);

    if (!$pedido) {
        echo json_encode(['success' => false, 'message' => 'Pedido no encontrado o no tienes permiso']);
        exit;
    }

    if ($pedido['estado_pedido'] !== 'Pendiente') {
        echo json_encode(['success' => false, 'message' => 'Solo se pueden editar pedidos Pendientes']);
        exit;
    }

    // Iniciar transacción
    mysqli_begin_transaction($conexion);

    // Obtener productos actuales del pedido
    $stmtDet = mysqli_prepare($conexion, "SELECT id_producto, cantidad_detalle_pedido FROM detalle_pedido WHERE id_pedido = ?");
    mysqli_stmt_bind_param($stmtDet, 's', $pedidoId);
    mysqli_stmt_execute($stmtDet);
    $resultDet = mysqli_stmt_get_result($stmtDet);

    $productosActuales = [];
    while ($row = mysqli_fetch_assoc($resultDet)) {
        $productosActuales[] = $row;
    }

    // Devolver stock de productos anteriores: RESTAR cantidad_salida
    foreach ($productosActuales as $prod) {
        $stmtStock = mysqli_prepare($conexion, "UPDATE Producto SET cantidad_salida = cantidad_salida - ? WHERE id_producto = ?");
        if (!$stmtStock) throw new Exception('Error preparando devolución stock: ' . mysqli_error($conexion));
        mysqli_stmt_bind_param($stmtStock, 'is', $prod['cantidad_detalle_pedido'], $prod['id_producto']);
        if (!mysqli_stmt_execute($stmtStock)) throw new Exception('Error devolviendo stock: ' . mysqli_stmt_error($stmtStock));
    }

    // Eliminar detalles anteriores
    $stmtDel = mysqli_prepare($conexion, "DELETE FROM detalle_pedido WHERE id_pedido = ?");
    mysqli_stmt_bind_param($stmtDel, 's', $pedidoId);
    if (!mysqli_stmt_execute($stmtDel)) throw new Exception('Error eliminando detalles: ' . mysqli_stmt_error($stmtDel));

    // Insertar nuevos productos y descontar stock: SUMAR cantidad_salida
    $nuevoTotal = 0;
    foreach ($productos as $prod) {
        $idProducto = $prod['id'];
        $cantidad = intval($prod['qty']);
        $precio = floatval($prod['price']);
        $subtotal = $cantidad * $precio;
        $nuevoTotal += $subtotal;

        // Insertar detalle
        $idDetalle = uniqid('DET');
        $stmtIns = mysqli_prepare($conexion, "INSERT INTO detalle_pedido (id_detalle, cantidad_detalle_pedido, precio_unitario_detalle_pedido, subtotal_detalle_pedido, id_pedido, id_producto) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$stmtIns) throw new Exception('Error preparando detalle: ' . mysqli_error($conexion));
        mysqli_stmt_bind_param($stmtIns, 'siddss', $idDetalle, $cantidad, $precio, $subtotal, $pedidoId, $idProducto);
        if (!mysqli_stmt_execute($stmtIns)) throw new Exception('Error insertando detalle: ' . mysqli_stmt_error($stmtIns));

        // Descontar nuevo stock: SUMAR cantidad_salida
        $stmtStock = mysqli_prepare($conexion, "UPDATE Producto SET cantidad_salida = cantidad_salida + ? WHERE id_producto = ?");
        if (!$stmtStock) throw new Exception('Error preparando descuento stock: ' . mysqli_error($conexion));
        mysqli_stmt_bind_param($stmtStock, 'is', $cantidad, $idProducto);
        if (!mysqli_stmt_execute($stmtStock)) throw new Exception('Error descontando stock: ' . mysqli_stmt_error($stmtStock));
    }

    // Actualizar total del pedido
    $stmtUpd = mysqli_prepare($conexion, "UPDATE pedido SET total_pedido = ? WHERE id_pedido = ?");
    mysqli_stmt_bind_param($stmtUpd, 'ds', $nuevoTotal, $pedidoId);
    if (!mysqli_stmt_execute($stmtUpd)) throw new Exception('Error actualizando total: ' . mysqli_stmt_error($stmtUpd));

    mysqli_commit($conexion);

    echo json_encode([
        'success' => true,
        'message' => 'Pedido actualizado exitosamente',
        'total_nuevo' => $nuevoTotal
    ]);

} catch (Exception $e) {
    if (isset($conexion)) {
        mysqli_rollback($conexion);
    }
    echo json_encode(['success' => false, 'message' => 'Error al editar pedido: ' . $e->getMessage()]);
}
?>