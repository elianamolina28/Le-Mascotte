<?php

// Permitir conexion desde react native
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// conexion
require_once 'config.php';
require_once BASE_PATH . '/models/common.php';

$db = Database::conectar();
$method = $_SERVER['REQUEST_METHOD'];

function resolveCategoryIdPDO($db, $category) {
    if ($category === '' || $category === null) return null;
    $sql = 'SELECT id_categoria FROM categoria WHERE id_categoria = :c OR nombre_categoria = :c LIMIT 1';
    $stmt = $db->prepare($sql);
    $stmt->execute([':c' => $category]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row['id_categoria'] ?? null;
}

switch ($method) {
    case 'GET':
        $sql = "SELECT
                    p.id_producto AS id,
                    p.nombre_producto AS name,
                    p.descripcion_producto AS `desc`,
                    COALESCE(c.nombre_categoria, p.id_categoria, 'Sin categoria') AS category,
                    p.precio_producto AS price,
                    p.stock_producto AS stock,
                    p.cantidad_entrada AS cantidad_entrada,
                    p.cantidad_salida AS cantidad_salida,
                    p.valor_compra AS valor_compra,
                    p.estado_producto AS status,
                    (SELECT ip.url_imagen FROM Imagen_Producto ip WHERE ip.id_producto = p.id_producto LIMIT 1) AS img
                FROM Producto p
                LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
                ORDER BY p.nombre_producto ASC";

        $stmt = $db->query($sql);
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($productos as &$p) {
            $p['price'] = isset($p['price']) ? floatval($p['price']) : 0.0;
            $p['stock'] = isset($p['stock']) ? intval($p['stock']) : 0;
            $p['valor_compra'] = isset($p['valor_compra']) ? floatval($p['valor_compra']) : 0.0;
            $p['cantidad_entrada'] = isset($p['cantidad_entrada']) ? intval($p['cantidad_entrada']) : 0;
            $p['cantidad_salida'] = isset($p['cantidad_salida']) ? intval($p['cantidad_salida']) : 0;
        }

        echo json_encode([
            "success" => true,
            "productos" => $productos
        ], JSON_UNESCAPED_UNICODE);
    break;

    case 'POST':
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!is_array($data)) $data = $_POST;

        $name = trim($data['name'] ?? $data['nombre'] ?? '');
        $description = trim($data['desc'] ?? $data['descripcion'] ?? '');
        $category = $data['category'] ?? $data['id_categoria'] ?? ($data['categoria'] ?? '');
        $price = isset($data['price']) ? floatval($data['price']) : (isset($data['precio']) ? floatval($data['precio']) : 0.0);
        $stock = isset($data['stock']) ? intval($data['stock']) : 0;
        $img = $data['img'] ?? ($data['imagen'] ?? '');
        $cantidadEntrada = isset($data['cantidad_entrada']) ? intval($data['cantidad_entrada']) : $stock;
        $cantidadSalida = isset($data['cantidad_salida']) ? intval($data['cantidad_salida']) : 0;
        $valorCompra = isset($data['valor_compra']) ? floatval($data['valor_compra']) : ($price > 0 ? round($price / 1.80, 2) : 0);

        if ($name === '' || $price <= 0) {
            echo json_encode(["success" => false, "message" => "Faltan campos obligatorios: name o price"], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $categoryId = resolveCategoryIdPDO($db, $category);
        $id = generateId('PROD');
        $status = $stock > 0 ? 'Disponible' : 'Agotado';

        // El trigger BEFORE INSERT calcula automaticamente:
        // stock_producto = cantidad_entrada - cantidad_salida
        // precio_producto = valor_compra * 1.80 (si no se especifica manualmente)
        $sql = "INSERT INTO Producto (id_producto, nombre_producto, descripcion_producto, precio_producto, cantidad_entrada, cantidad_salida, valor_compra, estado_producto, id_categoria)
                VALUES (:id, :name, :desc, :price, :cantidad_entrada, :cantidad_salida, :valor_compra, :status, :cat)";
        $stmt = $db->prepare($sql);
        $ok = $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':desc' => $description,
            ':price' => $price,
            ':cantidad_entrada' => $cantidadEntrada,
            ':cantidad_salida' => $cantidadSalida,
            ':valor_compra' => $valorCompra,
            ':status' => $status,
            ':cat' => $categoryId
        ]);

        if ($ok) {
            if ($img !== '') {
                // intentar guardar imagen si existe la tabla Imagen_Producto
                try {
                    $imgStmt = $db->prepare('INSERT INTO Imagen_Producto (id_imagen, url_imagen, id_producto) VALUES (:iid, :url, :pid)');
                    $imgId = 'IMG' . date('YmdHis') . random_int(100,999);
                    $imgStmt->execute([':iid' => $imgId, ':url' => $img, ':pid' => $id]);
                } catch (Exception $e) {
                    // ignorar error de imagen
                }
            }
            echo json_encode(["success" => true, "message" => "Producto creado", "id" => $id], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(["success" => false, "message" => "Error creando producto"], JSON_UNESCAPED_UNICODE);
        }
    break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Metodo no permitido"], JSON_UNESCAPED_UNICODE);
    break;
}

?>
