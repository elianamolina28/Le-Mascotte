<?php
/**
 * API de Exportación a Excel
 * 
 * Endpoints:
 * - exportar_excel.php?tipo=productos  → Exporta todos los productos
 * - exportar_excel.php?tipo=usuarios    → Exporta todos los usuarios
 * - exportar_excel.php?tipo=pedidos     → Exporta todos los pedidos
 * - exportar_excel.php?tipo=inventario  → Exporta inventario completo
 * 
 * Genera archivo XLSX con:
 * - Logo de Le Mascotte en encabezado
 * - Datos de la empresa
 * - Estilo profesional (Calibri, bordes, colores, formatos)
 */

session_start();
require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/ExcelExporter.php';
require_once __DIR__ . '/../models/view_helpers.php';

// Verificar autenticación básica
$esAdmin = ($_SESSION['rol'] ?? '') === 'Administrador' || ($_SESSION['rol'] ?? '') === 'Empleado';
if (!$esAdmin) {
    header('HTTP/1.0 403 Forbidden');
    echo json_encode(['error' => 'Acceso no autorizado']);
    exit;
}

mysqli_set_charset($conexion, 'utf8mb4');

$tipo = $_GET['tipo'] ?? 'productos';
$empresaNombre = 'Le Mascotte - Tienda de Mascotas';
$direccionEmpresa = 'Dirección: Cra 30 # 25-10, Bogotá, Colombia';
$logoSrc = __DIR__ . '/../ACCENT/IMG/logo.png';

try {
    switch ($tipo) {
        case 'productos':
            exportarProductos($conexion, $empresaNombre, $direccionEmpresa, $logoSrc);
            break;
        case 'usuarios':
            exportarUsuarios($conexion, $empresaNombre, $direccionEmpresa, $logoSrc);
            break;
        case 'pedidos':
            exportarPedidos($conexion, $empresaNombre, $direccionEmpresa, $logoSrc);
            break;
        case 'inventario':
            exportarInventario($conexion, $empresaNombre, $direccionEmpresa, $logoSrc);
            break;
        default:
            header('HTTP/1.0 400 Bad Request');
            echo json_encode(['error' => 'Tipo de exportación no válido']);
            exit;
    }
} catch (Exception $e) {
    header('HTTP/1.0 500 Internal Server Error');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

/**
 * Exporta productos a Excel
 */
function exportarProductos($conexion, $empresaNombre, $direccionEmpresa, $logoSrc) {
    // Obtener productos
    $sql = "SELECT p.id_producto AS id,
                   p.nombre_producto AS name,
                   p.descripcion_producto AS `desc`,
                   COALESCE(c.nombre_categoria, p.id_categoria, 'Sin categoría') AS category,
                   p.precio_producto AS price,
                   p.stock_producto AS stock,
                   p.valor_compra AS valor_compra,
                   p.estado_producto AS status,
                   p.cantidad_entrada AS cantidad_entrada,
                   p.cantidad_salida AS cantidad_salida
            FROM Producto p
            LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
            ORDER BY p.nombre_producto ASC";
    
    $result = mysqli_query($conexion, $sql);
    if (!$result) {
        throw new Exception('Error al consultar productos: ' . mysqli_error($conexion));
    }
    
    $exporter = new ExcelExporter($empresaNombre, $direccionEmpresa, $logoSrc);
    
    $headers = ['ID', 'Nombre', 'Categoría', 'Precio Venta', 'Valor Compra', 'Stock', 'Stock Mínimo', 'Estado', 'Fecha Creación'];
    $types =    ['string', 'string', 'string', 'money', 'money', 'number', 'number', 'string', 'date'];
    $exporter->setHeaders($headers, $types);
    
    while ($row = mysqli_fetch_assoc($result)) {
        $stockMinimo = max(0, 5 - $row['stock']);
        $exporter->addRow([
            $row['id'],
            $row['name'],
            $row['category'],
            floatval($row['price']),
            floatval($row['valor_compra']),
            intval($row['stock']),
            intval($stockMinimo),
            $row['status'] ?? 'Desconocido',
            date('Y-m-d'), // Fecha actual como referencia
        ]);
    }
    
    $exporter->download('LeMascotte_Productos_' . date('Ymd_His'));
}

/**
 * Exporta usuarios a Excel
 */
function exportarUsuarios($conexion, $empresaNombre, $direccionEmpresa, $logoSrc) {
    $sql = "SELECT id_usuario AS id,
                   nombre_usuario AS name,
                   correo_usuario AS email,
                   rol_usuario AS role,
                   estado_usuario AS status,
                   fecha_registro AS created_at
            FROM usuario
            ORDER BY nombre_usuario ASC";
    
    $result = mysqli_query($conexion, $sql);
    if (!$result) {
        throw new Exception('Error al consultar usuarios: ' . mysqli_error($conexion));
    }
    
    $exporter = new ExcelExporter($empresaNombre, $direccionEmpresa, $logoSrc);
    
    $headers = ['ID', 'Nombre', 'Email', 'Rol', 'Estado', 'Fecha Registro'];
    $types =    ['string', 'string', 'string', 'string', 'string', 'date'];
    $exporter->setHeaders($headers, $types);
    
    while ($row = mysqli_fetch_assoc($result)) {
        $exporter->addRow([
            $row['id'],
            $row['name'],
            $row['email'],
            ucfirst($row['role']),
            $row['status'] ?? 'Activo',
            $row['created_at'] ?? date('Y-m-d'),
        ]);
    }
    
    $exporter->download('LeMascotte_Usuarios_' . date('Ymd_His'));
}

/**
 * Exporta pedidos a Excel
 */
function exportarPedidos($conexion, $empresaNombre, $direccionEmpresa, $logoSrc) {
    $sql = "SELECT p.id_pedido AS id,
                   p.fecha_pedido AS date,
                   p.total_pedido AS total,
                   p.estado_pedido AS status,
                   p.forma_pago AS payment_method,
                   p.id_usuario AS user_id,
                   u.nombre_usuario AS user_name,
                   u.correo_usuario AS user_email
            FROM pedido p
            LEFT JOIN usuario u ON u.id_usuario = p.id_usuario
            ORDER BY p.fecha_pedido DESC";
    
    $result = mysqli_query($conexion, $sql);
    if (!$result) {
        throw new Exception('Error al consultar pedidos: ' . mysqli_error($conexion));
    }
    
    $exporter = new ExcelExporter($empresaNombre, $direccionEmpresa, $logoSrc);
    
    $headers = ['ID Pedido', 'Cliente', 'Email Cliente', 'Fecha', 'Total', 'Forma de Pago', 'Estado'];
    $types =    ['string', 'string', 'string', 'date', 'money', 'string', 'string'];
    $exporter->setHeaders($headers, $types);
    
    while ($row = mysqli_fetch_assoc($result)) {
        $exporter->addRow([
            $row['id'],
            $row['user_name'] ?? 'N/A',
            $row['user_email'] ?? '',
            $row['date'],
            floatval($row['total']),
            $row['payment_method'] ?? 'N/A',
            $row['status'],
        ]);
    }
    
    $exporter->download('LeMascotte_Pedidos_' . date('Ymd_His'));
}

/**
 * Exporta inventario completo a Excel
 */
function exportarInventario($conexion, $empresaNombre, $direccionEmpresa, $logoSrc) {
    $sql = "SELECT p.id_producto AS id,
                   p.nombre_producto AS name,
                   p.descripcion_producto AS `desc`,
                   COALESCE(c.nombre_categoria, p.id_categoria, 'Sin categoría') AS category,
                   p.precio_producto AS price,
                   p.stock_producto AS stock,
                   p.cantidad_entrada AS cantidad_entrada,
                   p.cantidad_salida AS cantidad_salida,
                   p.valor_compra AS valor_compra,
                   p.estado_producto AS status,
                   (p.stock_producto * p.precio_producto) AS valor_total_inventario,
                   (p.stock_producto * p.valor_compra) AS costo_total_inventario
            FROM Producto p
            LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
            ORDER BY p.nombre_producto ASC";
    
    $result = mysqli_query($conexion, $sql);
    if (!$result) {
        throw new Exception('Error al consultar inventario: ' . mysqli_error($conexion));
    }
    
    $exporter = new ExcelExporter($empresaNombre, $direccionEmpresa, $logoSrc);
    
    $headers = ['ID', 'Producto', 'Categoría', 'Stock Actual', 'Precio Unitario', 'Valor Compra', 
                'Valor Total Venta', 'Costo Total', 'Ganancia Potencial', 'Estado'];
    $types =    ['string', 'string', 'string', 'number', 'money', 'money', 'money', 'money', 'money', 'string'];
    $exporter->setHeaders($headers, $types);
    
    while ($row = mysqli_fetch_assoc($result)) {
        $valorVenta = floatval($row['stock']) * floatval($row['price']);
        $costoTotal = floatval($row['stock']) * floatval($row['valor_compra']);
        $ganancia = $valorVenta - $costoTotal;
        
        $exporter->addRow([
            $row['id'],
            $row['name'],
            $row['category'],
            intval($row['stock']),
            floatval($row['price']),
            floatval($row['valor_compra']),
            $valorVenta,
            $costoTotal,
            $ganancia,
            $row['status'] ?? 'Desconocido',
        ]);
    }
    
    $exporter->download('LeMascotte_Inventario_' . date('Ymd_His'));
}