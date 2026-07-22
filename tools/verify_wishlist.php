<?php
header('Content-Type: text/plain; charset=utf-8');
require_once __DIR__ . '/../config/conexion.php';

echo "=== VERIFICACIÓN DE TABLAS ===\n\n";

// Verificar tabla wish_list
$r = mysqli_query($conexion, "SELECT COUNT(*) as total FROM wish_list");
if ($r) {
    $row = mysqli_fetch_assoc($r);
    echo "✓ wish_list existe - Total registros: " . $row['total'] . "\n";
} else {
    echo "✗ ERROR en wish_list: " . mysqli_error($conexion) . "\n";
}

// Verificar tabla carrito
$r2 = mysqli_query($conexion, "SELECT COUNT(*) as total FROM carrito");
if ($r2) {
    $row2 = mysqli_fetch_assoc($r2);
    echo "✓ carrito existe - Total registros: " . $row2['total'] . "\n";
} else {
    echo "✗ ERROR en carrito: " . mysqli_error($conexion) . "\n";
}

// Verificar estructura de wish_list
echo "\n=== ESTRUCTURA DE wish_list ===\n";
$r3 = mysqli_query($conexion, "DESCRIBE wish_list");
if ($r3) {
    while ($col = mysqli_fetch_assoc($r3)) {
        echo "  " . $col['Field'] . " (" . $col['Type'] . ")\n";
    }
}

// Probar consulta de analytics
echo "\n=== PRUEBA DE ANALYTICS WISHLIST ===\n";
$sql = "SELECT p.nombre_producto, COUNT(*) as veces, COUNT(DISTINCT w.id_usuario) as usuarios FROM wish_list w JOIN Producto p ON p.id_producto = w.id_producto GROUP BY w.id_producto, p.id_producto ORDER BY veces DESC LIMIT 5";
$r4 = mysqli_query($conexion, $sql);
if ($r4) {
    echo "✓ Consulta analytics funciona:\n";
    while ($row = mysqli_fetch_assoc($r4)) {
        echo "  - " . $row['nombre_producto'] . " (x" . $row['veces'] . ", " . $row['usuarios'] . " usuarios)\n";
    }
} else {
    echo "✗ ERROR en consulta: " . mysqli_error($conexion) . "\n";
}

echo "\n=== VERIFICACIÓN COMPLETA ===\n";