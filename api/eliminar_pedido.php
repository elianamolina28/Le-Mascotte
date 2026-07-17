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

if (empty($pedidoId) || empty($userId)) {
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
        echo json_encode(['success' => false, 'message' => 'Solo se pueden cancelar pedidos Pendientes']);
        exit;
    }

    // Iniciar transacción
    mysqli_begin_transaction($conexion);

    // Obtener productos del pedido para devolver stock
    $stmtDet = mysqli_prepare($conexion, "SELECT id_producto, cantidad_detalle_pedido FROM detalle_pedido WHERE id_pedido = ?");
    mysqli_stmt_bind_param($stmtDet, 's', $pedidoId);
    mysqli_stmt_execute($stmtDet);
    $resultDet = mysqli_stmt_get_result($stmtDet);

    $productos = [];
    while ($row = mysqli_fetch_assoc($resultDet)) {
        $productos[] = $row;
    }

    // Devolver stock: RESTAR cantidad_salida (el trigger calcula stock_producto = cantidad_entrada - cantidad_salida)
    foreach ($productos as $prod) {
        $stmtStock = mysqli_prepare($conexion, "UPDATE Producto SET cantidad_salida = cantidad_salida - ? WHERE id_producto = ?");
        if (!$stmtStock) throw new Exception('Error preparando devolución stock: ' . mysqli_error($conexion));
        mysqli_stmt_bind_param($stmtStock, 'is', $prod['cantidad_detalle_pedido'], $prod['id_producto']);
        if (!mysqli_stmt_execute($stmtStock)) throw new Exception('Error devolviendo stock: ' . mysqli_stmt_error($stmtStock));
    }

    // Eliminar detalles del pedido
    $stmtDel = mysqli_prepare($conexion, "DELETE FROM detalle_pedido WHERE id_pedido = ?");
    mysqli_stmt_bind_param($stmtDel, 's', $pedidoId);
    if (!mysqli_stmt_execute($stmtDel)) throw new Exception('Error eliminando detalles: ' . mysqli_stmt_error($stmtDel));

    // Cambiar estado a Cancelado
    $stmtUpd = mysqli_prepare($conexion, "UPDATE pedido SET estado_pedido = 'Cancelado' WHERE id_pedido = ?");
    mysqli_stmt_bind_param($stmtUpd, 's', $pedidoId);
    if (!mysqli_stmt_execute($stmtUpd)) throw new Exception('Error actualizando estado: ' . mysqli_stmt_error($stmtUpd));

    mysqli_commit($conexion);

    echo json_encode([
        'success' => true,
        'message' => 'Pedido cancelado exitosamente',
        'productos_devueltos' => count($productos)
    ]);

} catch (Exception $e) {
    if (isset($conexion)) {
        mysqli_rollback($conexion);
    }
    echo json_encode(['success' => false, 'message' => 'Error al cancelar pedido: ' . $e->getMessage()]);
}
?>