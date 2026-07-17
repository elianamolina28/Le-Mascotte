<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

$host = "localhost";
$usuario = "root";
$contrasena = "";
$base_datos = "lemascotte_db";

$conexion = mysqli_connect($host, $usuario, $contrasena, $base_datos);
if (!$conexion) {
    die("Error de conexión: " . mysqli_connect_error());
}

echo "=== Running Database Fixes ===\n\n";

// 1. Check and add forma_pago to pedido
echo "1. Checking pedido.forma_pago...\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM pedido LIKE 'forma_pago'");
if ($r && mysqli_num_rows($r) > 0) {
    echo "   forma_pago already exists\n";
} else {
    $sql = "ALTER TABLE pedido ADD COLUMN forma_pago VARCHAR(50) DEFAULT NULL AFTER total_pedido";
    if (mysqli_query($conexion, $sql)) {
        echo "   forma_pago ADDED successfully\n";
    } else {
        echo "   ERROR adding forma_pago: " . mysqli_error($conexion) . "\n";
    }
}

// 2. Check and add id_direccion to pedido
echo "\n2. Checking pedido.id_direccion...\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM pedido LIKE 'id_direccion'");
if ($r && mysqli_num_rows($r) > 0) {
    echo "   id_direccion already exists\n";
} else {
    $sql = "ALTER TABLE pedido ADD COLUMN id_direccion VARCHAR(30) DEFAULT NULL AFTER forma_pago";
    if (mysqli_query($conexion, $sql)) {
        echo "   id_direccion ADDED successfully\n";
    } else {
        echo "   ERROR adding id_direccion: " . mysqli_error($conexion) . "\n";
    }
}

// 3. Check and add fecha_actualizacion to pedido
echo "\n3. Checking pedido.fecha_actualizacion...\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM pedido LIKE 'fecha_actualizacion'");
if ($r && mysqli_num_rows($r) > 0) {
    echo "   fecha_actualizacion already exists\n";
} else {
    $sql = "ALTER TABLE pedido ADD COLUMN fecha_actualizacion TIMESTAMP NULL DEFAULT NULL AFTER fecha_pedido";
    if (mysqli_query($conexion, $sql)) {
        echo "   fecha_actualizacion ADDED successfully\n";
    } else {
        echo "   ERROR adding fecha_actualizacion: " . mysqli_error($conexion) . "\n";
    }
}

// 4. Create direccion_envio table if not exists
echo "\n4. Checking direccion_envio table...\n";
$r = mysqli_query($conexion, "SHOW TABLES LIKE 'direccion_envio'");
if ($r && mysqli_num_rows($r) > 0) {
    echo "   direccion_envio already exists\n";
} else {
    $sql = "CREATE TABLE IF NOT EXISTS direccion_envio (
        id_direccion VARCHAR(30) PRIMARY KEY,
        id_usuario VARCHAR(30) NOT NULL,
        tipo_via VARCHAR(20) NOT NULL,
        numero_via VARCHAR(20) NOT NULL,
        letra_via VARCHAR(10) DEFAULT '',
        numero_placa VARCHAR(20) NOT NULL,
        letra_placa VARCHAR(10) DEFAULT '',
        localidad VARCHAR(100) NOT NULL,
        complemento VARCHAR(200) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    if (mysqli_query($conexion, $sql)) {
        echo "   direccion_envio CREATED successfully\n";
    } else {
        echo "   ERROR creating direccion_envio: " . mysqli_error($conexion) . "\n";
    }
}

// 5. Check if cantidad_entrada and cantidad_salida exist in Producto
echo "\n5. Checking Producto.cantidad_entrada...\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM Producto LIKE 'cantidad_entrada'");
if ($r && mysqli_num_rows($r) > 0) {
    echo "   cantidad_entrada exists\n";
} else {
    echo "   cantidad_entrada MISSING - running migration...\n";
    // Add the columns
    mysqli_query($conexion, "ALTER TABLE Producto ADD COLUMN cantidad_entrada INT NOT NULL DEFAULT 0 AFTER stock_producto");
    mysqli_query($conexion, "ALTER TABLE Producto ADD COLUMN cantidad_salida INT NOT NULL DEFAULT 0 AFTER cantidad_entrada");
    mysqli_query($conexion, "ALTER TABLE Producto ADD COLUMN valor_compra DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER precio_producto");
    // Seed data
    mysqli_query($conexion, "UPDATE Producto SET cantidad_entrada = stock_producto, cantidad_salida = 0, valor_compra = ROUND(precio_producto / 1.80, 2) WHERE 1=1");
    echo "   Migration complete\n";
}

// 6. Check triggers
echo "\n6. Checking triggers...\n";
$r = mysqli_query($conexion, "SHOW TRIGGERS WHERE `Table` = 'Producto'");
if ($r && mysqli_num_rows($r) > 0) {
    echo "   Triggers found:\n";
    while ($row = mysqli_fetch_assoc($r)) {
        echo "   - " . $row['Trigger'] . " (" . $row['Event'] . ")\n";
    }
} else {
    echo "   No triggers found - creating them...\n";
    // Create BEFORE UPDATE trigger
    mysqli_query($conexion, "DROP TRIGGER IF EXISTS trg_producto_stock_update");
    $sql = "CREATE TRIGGER trg_producto_stock_update BEFORE UPDATE ON Producto FOR EACH ROW BEGIN SET NEW.stock_producto = NEW.cantidad_entrada - NEW.cantidad_salida; IF NEW.precio_producto = OLD.precio_producto AND NEW.valor_compra <> OLD.valor_compra THEN SET NEW.precio_producto = ROUND(NEW.valor_compra * 1.80, 2); END IF; END";
    if (mysqli_query($conexion, $sql)) {
        echo "   UPDATE trigger created\n";
    } else {
        echo "   ERROR: " . mysqli_error($conexion) . "\n";
    }
    
    // Create BEFORE INSERT trigger
    mysqli_query($conexion, "DROP TRIGGER IF EXISTS trg_producto_stock_insert");
    $sql = "CREATE TRIGGER trg_producto_stock_insert BEFORE INSERT ON Producto FOR EACH ROW BEGIN SET NEW.stock_producto = NEW.cantidad_entrada - NEW.cantidad_salida; IF NEW.precio_producto = 0 OR NEW.precio_producto IS NULL THEN SET NEW.precio_producto = ROUND(NEW.valor_compra * 1.80, 2); END IF; END";
    if (mysqli_query($conexion, $sql)) {
        echo "   INSERT trigger created\n";
    } else {
        echo "   ERROR: " . mysqli_error($conexion) . "\n";
    }
}

// 7. Final verification
echo "\n7. Final verification - pedido columns:\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM pedido");
if ($r) {
    while ($row = mysqli_fetch_assoc($r)) {
        echo "   " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
}

echo "\n8. Final verification - Producto columns:\n";
$r = mysqli_query($conexion, "SHOW COLUMNS FROM Producto");
if ($r) {
    while ($row = mysqli_fetch_assoc($r)) {
        echo "   " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
}

echo "\n9. Sample products:\n";
$r = mysqli_query($conexion, "SELECT id_producto, nombre_producto, stock_producto, cantidad_entrada, cantidad_salida, precio_producto FROM Producto LIMIT 5");
if ($r) {
    while ($row = mysqli_fetch_assoc($r)) {
        echo "   {$row['id_producto']} | {$row['nombre_producto']} | stock={$row['stock_producto']} | ent={$row['cantidad_entrada']} | sal={$row['cantidad_salida']} | \${$row['precio_producto']}\n";
    }
}

echo "\n=== FIXES COMPLETE ===\n";