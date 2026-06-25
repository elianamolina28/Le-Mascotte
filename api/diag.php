<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

require_once __DIR__ . '/../config/conexion.php';
mysqli_set_charset($conexion, 'utf8mb4');

if ($action === 'list_pedidos') {
    $q = mysqli_query($conexion, "SELECT id_pedido, estado_pedido, total_pedido, fecha_pedido FROM pedido ORDER BY fecha_pedido DESC LIMIT 20");
    $rows = [];
    while ($r = mysqli_fetch_assoc($q)) {
        $rows[] = $r;
    }
    echo json_encode(['success' => true, 'pedidos' => $rows]);
    exit;
}

if ($action === 'update_status') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? $_GET['id'] ?? '';
    $status = $input['status'] ?? $_GET['status'] ?? '';
    
    if (!$id || !$status) {
        echo json_encode(['success' => false, 'message' => 'Faltan datos']);
        exit;
    }
    
    $validos = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
    if (!in_array($status, $validos)) {
        echo json_encode(['success' => false, 'message' => "Estado '$status' inválido"]);
        exit;
    }
    
    // Obtener estado anterior
    $q = mysqli_query($conexion, "SELECT estado_pedido FROM pedido WHERE id_pedido = '$id'");
    $row = mysqli_fetch_assoc($q);
    if (!$row) {
        echo json_encode(['success' => false, 'message' => "Pedido '$id' no existe"]);
        exit;
    }
    $old = $row['estado_pedido'];
    
    // Actualizar
    $r = mysqli_query($conexion, "UPDATE pedido SET estado_pedido = '$status' WHERE id_pedido = '$id'");
    if (!$r) {
        echo json_encode(['success' => false, 'message' => 'Error SQL: ' . mysqli_error($conexion)]);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Pedido $id: '$old' → '$status'",
        'old' => $old,
        'new' => $status
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Usa ?action=list_pedidos o ?action=update_status']);