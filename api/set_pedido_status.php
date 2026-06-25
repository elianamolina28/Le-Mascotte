<?php
// ============================================================
// ENDPOINT ULTRA SIMPLE - Solo actualiza el estado del pedido
// Sin sesiones, sin autenticación, sin validaciones complejas
// ============================================================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$response = ['success' => false, 'message' => 'Error desconocido'];

try {
    require_once __DIR__ . '/../config/conexion.php';
    mysqli_set_charset($conexion, 'utf8mb4');

    $input = json_decode(file_get_contents('php://input'), true);
    $id = trim($input['id'] ?? '');
    $status = trim($input['status'] ?? '');

    if (empty($id)) {
        $response['message'] = 'ID de pedido vacío';
        echo json_encode($response);
        exit;
    }
    if (empty($status)) {
        $response['message'] = 'Estado vacío';
        echo json_encode($response);
        exit;
    }

    $validos = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
    if (!in_array($status, $validos)) {
        $response['message'] = "Estado '$status' no es válido";
        echo json_encode($response);
        exit;
    }

    // Obtener estado anterior
    $q = mysqli_query($conexion, "SELECT estado_pedido FROM pedido WHERE id_pedido = '$id' LIMIT 1");
    if (!$q) {
        $response['message'] = 'Error consultando pedido: ' . mysqli_error($conexion);
        echo json_encode($response);
        exit;
    }
    $row = mysqli_fetch_assoc($q);
    if (!$row) {
        $response['message'] = "No existe pedido con ID '$id'";
        echo json_encode($response);
        exit;
    }
    $oldStatus = $row['estado_pedido'];

    // Actualizar - consulta directa SIN prepared statements para evitar problemas
    $sql = "UPDATE pedido SET estado_pedido = '$status' WHERE id_pedido = '$id'";
    $result = mysqli_query($conexion, $sql);
    
    if (!$result) {
        $response['message'] = 'Error actualizando: ' . mysqli_error($conexion);
        echo json_encode($response);
        exit;
    }

    $response['success'] = true;
    $response['message'] = "Pedido $id cambiado de '$oldStatus' a '$status'";
    $response['old_status'] = $oldStatus;
    $response['new_status'] = $status;
    $response['id'] = $id;

} catch (Exception $e) {
    $response['message'] = 'Excepción: ' . $e->getMessage();
}

echo json_encode($response);