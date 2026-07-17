<?php
include_once __DIR__ . '/../models/common.php';
include_once __DIR__ . '/../models/productos.php';

function dashFindById($items, $id) {
    foreach ($items as $item) {
        if ((string) ($item['id'] ?? '') === (string) $id) {
            return $item;
        }
    }
    return null;
}

function dashHandleProductPost($conexion, &$section, &$message, &$messageType) {
    $formAction = $_POST['form_action'] ?? '';

    if ($formAction !== 'save_product' && $formAction !== 'delete_product') {
        return false;
    }

    if ($formAction === 'save_product') {
        $id = trim($_POST['id'] ?? '');
        $name = trim($_POST['name'] ?? '');
        $category = trim($_POST['category'] ?? '');
        $price = (float) ($_POST['price'] ?? 0);
        $img = trim($_POST['img'] ?? '');

        if ($name === '' || $category === '' || $price <= 0) {
            $message = 'Completa nombre, categoria y precio del producto.';
            $messageType = 'error';
        } elseif (saveDashboardProduct($conexion, $id, $name, $category, $price, $img)) {
            $message = 'Producto guardado correctamente.';
        } else {
            $message = 'Error guardando producto.';
            $messageType = 'error';
        }
    }

    if ($formAction === 'delete_product') {
        $id = trim($_POST['id'] ?? '');
        if ($id !== '' && deleteDashboardProduct($conexion, $id)) {
            $message = 'Producto eliminado.';
        } else {
            $message = 'Error eliminando producto.';
            $messageType = 'error';
        }
    }

    $section = 'productos';
    return true;
}

function dashProductState($conexion) {
    $products = getDashboardProducts($conexion);
    $productCategories = getDashboardCategories($conexion);
    $productFormMode = $_GET['product_form'] ?? '';
    $editProductId = $_GET['product_id'] ?? '';
    $editingProduct = dashFindById($products, $editProductId);
    $showProductModal = $productFormMode === 'new' || ($productFormMode === 'edit' && $editingProduct);

    return compact('products', 'productCategories', 'productFormMode', 'editProductId', 'editingProduct', 'showProductModal');
}
?>
