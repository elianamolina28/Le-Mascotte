<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

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

echo "=== Diagnostic Tests ===\n\n";

// 1. Check Producto table structure
echo "1. Producto table structure:\n";
$result = mysqli_query($conexion, "SHOW COLUMNS FROM Producto");
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        echo "  - " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} else {
    echo "  ERROR: " . mysqli_error($conexion) . "\n";
}

echo "\n2. Check pedido table structure:\n";
$result = mysqli_query($conexion, "SHOW COLUMNS FROM pedido");
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        echo "  - " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} else {
    echo "  ERROR: " . mysqli_error($conexion) . "\n";
}

echo "\n3. Check detalle_pedido table structure:\n";
$result = mysqli_query($conexion, "SHOW COLUMNS FROM detalle_pedido");
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        echo "  - " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} else {
    echo "  ERROR: " . mysqli_error($conexion) . "\n";
}

echo "\n4. Check direccion_envio table structure:\n";
$result = mysqli_query($conexion, "SHOW TABLES LIKE 'direccion_envio'");
if ($result && mysqli_num_rows($result) > 0) {
    $result = mysqli_query($conexion, "SHOW COLUMNS FROM direccion_envio");
    while ($row = mysqli_fetch_assoc($result)) {
        echo "  - " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} else {
    echo "  TABLE NOT FOUND\n";
}

echo "\n5. Check triggers:\n";
$result = mysqli_query($conexion, "SHOW TRIGGERS");
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        echo "  - " . $row['Trigger'] . " (Event: " . $row['Event'] . ", Table: " . $row['Table'] . ")\n";
        echo "    Statement: " . substr($row['Statement'], 0, 100) . "...\n";
    }
    if (mysqli_num_rows($result) == 0) {
        echo "  No triggers found\n";
    }
} else {
    echo "  ERROR: " . mysqli_error($conexion) . "\n";
}

echo "\n6. Sample products (first 3):\n";
$result = mysqli_query($conexion, "SELECT id_producto, nombre_producto, stock_producto, cantidad_entrada, cantidad_salida, precio_producto FROM Producto LIMIT 3");
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        echo "  ID: " . $row['id_producto'] . " | " . $row['nombre_producto'] . " | stock=" . $row['stock_producto'] . " | entrada=" . $row['cantidad_entrada'] . " | salida=" . $row['cantidad_salida'] . " | price=" . $row['precio_producto'] . "\n";
    }
} else {
    echo "  ERROR: " . mysqli_error($conexion) . "\n";
}

echo "\n7. Test addOrderWithDetails simulation:\n";
// Get first user
$userResult = mysqli_query($conexion, "SELECT id_usuario FROM usuario LIMIT 1");
$userId = '';
if ($userResult && $row = mysqli_fetch_assoc($userResult)) {
    $userId = $row['id_usuario'];
    echo "  Using user: " . $userId . "\n";
}

// Get first product
$prodResult = mysqli_query($conexion, "SELECT id_producto, stock_producto, cantidad_entrada, cantidad_salida FROM Producto LIMIT 1");
if ($prodResult && $row = mysqli_fetch_assoc($prodResult)) {
    echo "  Using product: " . $row['id_producto'] . " (stock: " . $row['stock_producto'] . ", entrada: " . $row['cantidad_entrada'] . ", salida: " . $row['cantidad_salida'] . ")\n";
    
    // Test direct stock update
    echo "\n8. Test direct SQL stock update:\n";
    $testQty = 1;
    $stmt = mysqli_prepare($conexion, "UPDATE Producto SET cantidad_salida = cantidad_salida + ? WHERE id_producto = ? AND (cantidad_entrada - cantidad_salida) >= ?");
    if ($stmt) {
        mysqli_stmt_bind_param($stmt, 'isi', $testQty, $row['id_producto'], $testQty);
        mysqli_stmt_execute($stmt);
        $affected = mysqli_affected_rows($conexion);
        echo "  Rows affected: " . $affected . "\n";
        if ($affected < 1) {
            echo "  ERROR: No rows updated. Stock insufficient?\n";
            echo "  MySQL error: " . mysqli_stmt_error($stmt) . "\n";
        } else {
            echo "  Stock update SUCCESS\n";
            // Rollback the test
            mysqli_query($conexion, "UPDATE Producto SET cantidad_salida = cantidad_salida - $testQty WHERE id_producto = '" . $row['id_producto'] . "'");
        }
    } else {
        echo "  ERROR preparing statement: " . mysqli_error($conexion) . "\n";
    }
} else {
    echo "  No products found!\n";
}

// Test direccion_envio insert
echo "\n9. Test saveDireccionEnvio:\n";
$testDirId = saveDireccionEnvio($conexion, $userId ?: 'USR_TEST', 'Calle', '10', 'A', '20', 'B', 'Suba', 'Test');
if ($testDirId) {
    echo "  Direction saved with ID: " . $testDirId . "\n";
    // Clean up
    mysqli_query($conexion, "DELETE FROM direccion_envio WHERE id_direccion = '$testDirId'");
} else {
    echo "  ERROR saving direction: " . mysqli_error($conexion) . "\n";
}

echo "\n=== Tests Complete ===\n";
?>