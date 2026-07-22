<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

session_start();

include_once __DIR__ . '/../config/conexion.php';
include_once __DIR__ . '/../models/common.php';
include_once __DIR__ . '/../models/usuarios.php';
include_once __DIR__ . '/../models/productos.php';
include_once __DIR__ . '/../models/pedidos.php';
include_once __DIR__ . '/../models/carrito_wishlist.php';
include_once __DIR__ . '/../models/proveedores.php';
include_once __DIR__ . '/../models/actividad_log.php';

mysqli_set_charset($conexion, 'utf8mb4');

echo "=== DATABASE DIAGNOSTIC ===\n\n";

echo "1. Producto table:\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM Producto");
if ($r) { while ($row = mysqli_fetch_assoc($r)) echo "  {$row['Field']} ({$row['Type']})\n"; }
else echo "  ERROR: " . mysqli_error($conexion) . "\n";

echo "\n2. pedido table:\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM pedido");
if ($r) { while ($row = mysqli_fetch_assoc($r)) echo "  {$row['Field']} ({$row['Type']})\n"; }
else echo "  ERROR: " . mysqli_error($conexion) . "\n";

echo "\n3. detalle_pedido table:\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM detalle_pedido");
if ($r) { while ($row = mysqli_fetch_assoc($r)) echo "  {$row['Field']} ({$row['Type']})\n"; }
else echo "  ERROR: " . mysqli_error($conexion) . "\n";

echo "\n4. direccion_envio table:\n";
$r = mysqli_query($conexion, "SHOW TABLES LIKE 'direccion_envio'");
if ($r && mysqli_num_rows($r) > 0) {
    $r = mysqli_query($conexion, "SHOW COLUMNS FROM direccion_envio");
    while ($row = mysqli_fetch_assoc($r)) echo "  {$row['Field']} ({$row['Type']})\n";
} else echo "  NOT FOUND\n";

echo "\n5. Triggers:\n";
$r = mysqli_query($conexion, "SHOW TRIGGERS");
if ($r) {
    $found = false;
    while ($row = mysqli_fetch_assoc($r)) { $found = true; echo "  {$row['Trigger']} (on {$row['Table']})\n"; }
    if (!$found) echo "  No triggers\n";
}

echo "\n6. Sample products:\n";
$r = mysqli_query($conexion, "SELECT id_producto, nombre_producto, stock_producto, cantidad_entrada, cantidad_salida, precio_producto FROM Producto LIMIT 5");
if ($r) {
    while ($row = mysqli_fetch_assoc($r)) echo "  {$row['id_producto']} | {$row['nombre_producto']} | stock={$row['stock_producto']} | ent={$row['cantidad_entrada']} | sal={$row['cantidad_salida']} | \${$row['precio_producto']}\n";
}

echo "\n7. Sample user:\n";
$r = mysqli_query($conexion, "SELECT id_usuario, nombre_usuario FROM usuario LIMIT 3");
if ($r) {
    while ($row = mysqli_fetch_assoc($r)) echo "  {$row['id_usuario']} | {$row['nombre_usuario']}\n";
}

echo "\n8. Test direct stock update:\n";
$r = mysqli_query($conexion, "SELECT id_producto, stock_producto, cantidad_entrada, cantidad_salida FROM Producto WHERE stock_producto > 0 LIMIT 1");
if ($r && $row = mysqli_fetch_assoc($r)) {
    $pid = $row['id_producto'];
    echo "  Testing with product: $pid\n";
    echo "  Before: stock={$row['stock_producto']} ent={$row['cantidad_entrada']} sal={$row['cantidad_salida']}\n";
    
    $stmt = mysqli_prepare($conexion, "UPDATE Producto SET cantidad_salida = cantidad_salida + ? WHERE id_producto = ? AND (cantidad_entrada - cantidad_salida) >= ?");
    $qty = 1;
    mysqli_stmt_bind_param($stmt, 'isi', $qty, $pid, $qty);
    mysqli_stmt_execute($stmt);
    $affected = mysqli_affected_rows($conexion);
    echo "  Rows affected: $affected\n";
    if (mysqli_stmt_error($stmt)) echo "  Error: " . mysqli_stmt_error($stmt) . "\n";
    
    // Rollback
    mysqli_query($conexion, "UPDATE Producto SET cantidad_salida = cantidad_salida - $qty WHERE id_producto = '$pid'");
    $r2 = mysqli_query($conexion, "SELECT stock_producto, cantidad_entrada, cantidad_salida FROM Producto WHERE id_producto = '$pid'");
    $row2 = mysqli_fetch_assoc($r2);
    echo "  After rollback: stock={$row2['stock_producto']} ent={$row2['cantidad_entrada']} sal={$row2['cantidad_salida']}\n";
} else {
    echo "  No products with stock > 0\n";
}

echo "\n9. Test saveDireccionEnvio:\n";
$r = mysqli_query($conexion, "SELECT id_usuario FROM usuario LIMIT 1");
$uid = $r && $row = mysqli_fetch_assoc($r) ? $row['id_usuario'] : 'USR_TEST';
$dirId = saveDireccionEnvio($conexion, $uid, 'Calle', '10', 'A', '20', 'B', 'Suba', 'Test');
if ($dirId) {
    echo "  SUCCESS: ID=$dirId\n";
    mysqli_query($conexion, "DELETE FROM direccion_envio WHERE id_direccion = '$dirId'");
} else {
    echo "  FAILED: " . mysqli_error($conexion) . "\n";
}

echo "\n10. Test FULL CHECKOUT (addOrderWithDetails):\n";
$r = mysqli_query($conexion, "SELECT id_usuario FROM usuario LIMIT 1");
$uid = $r && $row = mysqli_fetch_assoc($r) ? $row['id_usuario'] : '';
$r = mysqli_query($conexion, "SELECT id_producto, precio_producto, stock_producto FROM Producto WHERE stock_producto > 0 LIMIT 2");
$productos = [];
if ($r) {
    while ($row = mysqli_fetch_assoc($r)) {
        $productos[] = ['id' => $row['id_producto'], 'qty' => 1, 'price' => $row['precio_producto']];
    }
}
if ($uid && count($productos) > 0) {
    $total = array_sum(array_map(function($p) { return $p['price'] * $p['qty']; }, $productos));
    echo "  User: $uid\n";
    echo "  Products: " . json_encode($productos) . "\n";
    echo "  Total: $total\n";
    
    // First save a direction
    $dirId = saveDireccionEnvio($conexion, $uid, 'Calle', '10', 'A', '20', 'B', 'Suba', 'Test');
    if ($dirId) {
        echo "  Direction saved: $dirId\n";
        $orderId = addOrderWithDetails($conexion, $uid, $total, $productos, $dirId, 'Efectivo');
        if ($orderId) {
            echo "  ORDER CREATED SUCCESSFULLY: $orderId\n";
            // Clean up
            mysqli_query($conexion, "DELETE FROM detalle_pedido WHERE id_pedido = '$orderId'");
            mysqli_query($conexion, "DELETE FROM pedido WHERE id_pedido = '$orderId'");
            mysqli_query($conexion, "DELETE FROM direccion_envio WHERE id_direccion = '$dirId'");
            echo "  Cleaned up test data\n";
        } else {
            echo "  ORDER FAILED\n";
            // Rollback the stock
            mysqli_query($conexion, "DELETE FROM direccion_envio WHERE id_direccion = '$dirId'");
        }
    }
} else {
    echo "  Missing user or products\n";
}

echo "\n=== DIAGNOSTIC COMPLETE ===\n";
</write_to_file>
</write_to_file>