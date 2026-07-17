<?php
// Herramienta de diagnóstico para probar el cambio de estado de pedidos
// Accede directamente sin autenticación para probar
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once __DIR__ . '/../config/conexion.php';
include_once __DIR__ . '/../models/carrito_wishlist.php';

mysqli_set_charset($conexion, 'utf8mb4');

// Obtener datos
$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? $_GET['id'] ?? '';
$status = $input['status'] ?? $_GET['status'] ?? '';
$user_id = $input['user_id'] ?? $_GET['user_id'] ?? '';

echo "=== DIAGNÓSTICO DE CAMBIO DE ESTADO ===\n\n";
echo "ID recibido: " . ($id ?: 'VACÍO') . "\n";
echo "Status recibido: " . ($status ?: 'VACÍO') . "\n";
echo "User ID recibido: " . ($user_id ?: 'VACÍO') . "\n\n";

if (!$id || !$status) {
    echo "ERROR: Falta id o status\n";
    echo "Uso: POST con JSON {id:'PED...', status:'Preparando'}\n";
    echo "O: ?id=PED...&status=Preparando\n";
    exit;
}

// Verificar que el pedido existe
$stmt = mysqli_prepare($conexion, "SELECT id_pedido, estado_pedido, id_usuario FROM pedido WHERE id_pedido = ? LIMIT 1");
if ($stmt) {
    mysqli_stmt_bind_param($stmt, 's', $id);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($res);
    if ($row) {
        echo "Pedido encontrado:\n";
        echo "  - Estado actual: " . $row['estado_pedido'] . "\n";
        echo "  - Usuario dueño: " . $row['id_usuario'] . "\n\n";
    } else {
        echo "ERROR: Pedido con ID '$id' NO EXISTE en la base de datos\n";
        exit;
    }
    mysqli_stmt_close($stmt);
} else {
    echo "ERROR: No se pudo consultar el pedido: " . mysqli_error($conexion) . "\n";
    exit;
}

// Verificar estados válidos
$validStatuses = getOrderStatusHistory();
echo "Estados válidos: " . implode(', ', $validStatuses) . "\n";
echo "Status solicitado: $status - " . (in_array($status, $validStatuses) ? 'VÁLIDO' : 'INVÁLIDO') . "\n\n";

// Ejecutar la actualización
echo "=== EJECUTANDO UPDATE ===\n";
echo "SQL: UPDATE pedido SET estado_pedido = '$status', fecha_actualizacion = NOW() WHERE id_pedido = '$id'\n";

// Intentar con fecha_actualizacion
$stmt = mysqli_prepare($conexion, "UPDATE pedido SET estado_pedido = ?, fecha_actualizacion = NOW() WHERE id_pedido = ?");
if (!$stmt) {
    echo "Falló con fecha_actualizacion: " . mysqli_error($conexion) . "\n";
    echo "Intentando sin fecha_actualizacion...\n";
    $stmt = mysqli_prepare($conexion, "UPDATE pedido SET estado_pedido = ? WHERE id_pedido = ?");
}

if ($stmt) {
    mysqli_stmt_bind_param($stmt, 'ss', $status, $id);
    $result = mysqli_stmt_execute($stmt);
    echo "Resultado: " . ($result ? "✅ ÉXITO" : "❌ FALLÓ") . "\n";
    if (!$result) {
        echo "Error: " . mysqli_stmt_error($stmt) . "\n";
    }
    echo "Filas afectadas: " . mysqli_affected_rows($conexion) . "\n";
    mysqli_stmt_close($stmt);
} else {
    echo "No se pudo preparar la consulta: " . mysqli_error($conexion) . "\n";
}

// Verificar el resultado
$stmt = mysqli_prepare($conexion, "SELECT id_pedido, estado_pedido, fecha_actualizacion FROM pedido WHERE id_pedido = ? LIMIT 1");
if ($stmt) {
    mysqli_stmt_bind_param($stmt, 's', $id);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($res);
    echo "\n=== ESTADO ACTUAL DEL PEDIDO ===\n";
    echo "ID: " . ($row['id_pedido'] ?? 'N/A') . "\n";
    echo "Estado: " . ($row['estado_pedido'] ?? 'N/A') . "\n";
    echo "Fecha actualización: " . ($row['fecha_actualizacion'] ?? 'N/A') . "\n";
    mysqli_stmt_close($stmt);
}
?>