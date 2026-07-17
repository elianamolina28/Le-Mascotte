<?php
/**
 * ENDPOINT DEDICADO PARA CAMBIAR ESTADO DE PEDIDOS
 * Sin autenticación ni verificación de roles - solo actualiza el estado
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    include_once __DIR__ . '/../config/conexion.php';
    mysqli_set_charset($conexion, 'utf8mb4');

    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';
    $status = $input['status'] ?? '';

    if (!$id || !$status) {
        echo json_encode(['success' => false, 'message' => 'Faltan datos: id y status requeridos']);
        exit;
    }

    // Estados válidos
    $validos = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
    if (!in_array($status, $validos)) {
        echo json_encode(['success' => false, 'message' => "Estado '$status' no válido"]);
        exit;
    }

    // 1. Obtener estado anterior para logging
    $stmtInfo = mysqli_prepare($conexion, "SELECT estado_pedido, id_usuario FROM pedido WHERE id_pedido = ?");
    $oldStatus = '';
    $userId = '';
    if ($stmtInfo) {
        mysqli_stmt_bind_param($stmtInfo, 's', $id);
        mysqli_stmt_execute($stmtInfo);
        $res = mysqli_stmt_get_result($stmtInfo);
        $row = mysqli_fetch_assoc($res);
        if (!$row) {
            echo json_encode(['success' => false, 'message' => "Pedido '$id' no encontrado"]);
            exit;
        }
        $oldStatus = $row['estado_pedido'];
        $userId = $row['id_usuario'];
        mysqli_stmt_close($stmtInfo);
    }

    // 2. Actualizar estado - PRIMERO intentar con fecha_actualizacion
    $updateStmt = mysqli_prepare($conexion, "UPDATE pedido SET estado_pedido = ?, fecha_actualizacion = NOW() WHERE id_pedido = ?");
    if (!$updateStmt) {
        // Si no existe la columna fecha_actualizacion
        $updateStmt = mysqli_prepare($conexion, "UPDATE pedido SET estado_pedido = ? WHERE id_pedido = ?");
        if (!$updateStmt) {
            echo json_encode(['success' => false, 'message' => 'Error preparando UPDATE: ' . mysqli_error($conexion)]);
            exit;
        }
    }

    mysqli_stmt_bind_param($updateStmt, 'ss', $status, $id);
    $result = mysqli_stmt_execute($updateStmt);
    $affected = mysqli_affected_rows($conexion);
    mysqli_stmt_close($updateStmt);

    if (!$result) {
        echo json_encode(['success' => false, 'message' => 'Error ejecutando UPDATE: ' . mysqli_stmt_error($updateStmt)]);
        exit;
    }

    // 3. Verificar el cambio
    $verifyStmt = mysqli_prepare($conexion, "SELECT estado_pedido, fecha_actualizacion FROM pedido WHERE id_pedido = ?");
    mysqli_stmt_bind_param($verifyStmt, 's', $id);
    mysqli_stmt_execute($verifyStmt);
    $verifyRes = mysqli_stmt_get_result($verifyStmt);
    $verifyRow = mysqli_fetch_assoc($verifyRes);
    mysqli_stmt_close($verifyStmt);

    echo json_encode([
        'success' => true,
        'message' => "Pedido $id actualizado de '$oldStatus' a '$status'",
        'pedido_id' => $id,
        'estado_anterior' => $oldStatus,
        'estado_nuevo' => $status,
        'fecha_actualizacion' => $verifyRow['fecha_actualizacion'] ?? null,
        'filas_afectadas' => $affected,
        'user_id' => $userId
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}