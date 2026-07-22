<?php
session_start();
include_once __DIR__ . '/../controllers/dash_empleado_model.php';

$section = $section ?? 'dash';
$message = $message ?? '';
$messageType = $messageType ?? 'success';
$products = $products ?? [];
$productCategories = $productCategories ?? ['Perros', 'Gatos', 'Accesorios', 'Peces', 'Aves', 'Pequeñas Mascotas', 'Salud', 'Higiene', 'Ofertas'];
$showProductModal = $showProductModal ?? false;
$editingProduct = $editingProduct ?? null;
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Panel de Empleado - Le Mascotte</title>
  <link rel="shortcut icon" href="../ACCENT/IMG/logo.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="../ACCENT/CSS/style_Dash.css">
  <style>
    .view-section { display: none; }
    .view-section.active { display: block; }
    .alert { border-radius: 12px; color: #fff; font-weight: 700; margin-bottom: 18px; padding: 12px 16px; }
    .alert.success { background: var(--verde); }
    .alert.error { background: var(--rojo); }
    .inline-form { display: inline; }
    .form-group textarea { box-sizing: border-box; border: 1px solid #ddd; border-radius: 8px; padding: 10px; width: 100%; }
  </style>
</head>
<body>

  <nav class="top-nav">
    <a class="logo" href="?section=dash">
      <img src="../ACCENT/IMG/logo.png" alt="Logo">
      <span>Le Mascotte Empleado</span>
    </a>
    <div class="nav-links">
      <a href="?section=dash" class="<?php echo $section === 'dash' ? 'active' : ''; ?>">Inicio</a>
      <a href="?section=productos" class="<?php echo $section === 'productos' ? 'active' : ''; ?>">Gestion de Productos</a>
    </div>
  </nav>

  <div class="main-container">
    <?php if ($message !== ''): ?>
      <div class="alert <?php echo h($messageType); ?>"><?php echo h($message); ?></div>
    <?php endif; ?>

    <section id="view-dash" class="view-section <?php echo $section === 'dash' ? 'active' : ''; ?>">
      <h1 style="text-align: center; color: var(--morado); margin-bottom: 40px;">Panel de Control de Inventario</h1>
      <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap;">
        <a class="btn btn-export" href="../api/exportar_excel.php?tipo=productos" target="_blank"><i class="fa fa-file-excel"></i> Exportar Productos</a>
        <a class="btn btn-export" href="../api/exportar_excel.php?tipo=inventario" target="_blank"><i class="fa fa-chart-simple"></i> Exportar Inventario</a>
      </div>
      <div class="grid" style="display: flex; justify-content: center;">
        <div class="module-card" style="max-width: 400px;">
          <i class="fa fa-boxes-stacked"></i>
          <h3>Productos en Inventario</h3>
          <p><?php echo count($products); ?> productos registrados</p>
          <a href="?section=productos" class="btn btn-main">Ir a Inventario &rarr;</a>
        </div>
      </div>
    </section>

    <section id="view-productos" class="view-section <?php echo $section === 'productos' ? 'active' : ''; ?>">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <h2>Inventario de Productos</h2>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a class="btn btn-export" href="../api/exportar_excel.php?tipo=productos" target="_blank"><i class="fa fa-file-excel"></i> Exportar Productos</a>
          <a class="btn btn-add" href="?section=productos&product_form=new"><i class="fa fa-plus"></i> Nuevo Producto</a>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="admin-table">
          <thead>
            <tr><th>Imagen</th><th>Nombre</th><th>Categoria</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <?php foreach ($products as $product): ?>
              <tr>
                <td><img src="<?php echo h($product['img'] ?: 'https://via.placeholder.com/50'); ?>" class="img-table" alt=""></td>
                <td style="text-align:left;"><?php echo h($product['name']); ?></td>
                <td><?php echo h($product['category']); ?></td>
                <td style="color:var(--rosa); font-weight:bold;"><?php echo money($product['price']); ?></td>
                <td><?php echo h($product['stock'] ?? 0); ?></td>
                <td><span style="color:<?php echo statusColor($product['status'] ?? 'Agotado'); ?>; font-weight:bold;"><?php echo h($product['status'] ?? 'Agotado'); ?></span></td>
                <td>
                  <a class="btn btn-edit" href="?section=productos&product_form=edit&product_id=<?php echo urlencode($product['id']); ?>"><i class="fa fa-pen"></i></a>
                  <form class="inline-form" method="post">
                    <input type="hidden" name="form_action" value="delete_product">
                    <input type="hidden" name="id" value="<?php echo h($product['id']); ?>">
                    <button class="btn btn-danger" type="submit"><i class="fa fa-trash"></i></button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <div id="modalProducto" class="modal" style="<?php echo $showProductModal ? 'display:block;' : ''; ?>">
    <div class="modal-content">
      <div class="modal-header"><h3><?php echo $editingProduct ? 'Editar Producto' : 'Nuevo Producto'; ?></h3></div>
      <form method="post">
        <input type="hidden" name="form_action" value="save_product">
        <input type="hidden" name="id" value="<?php echo h($editingProduct['id'] ?? ''); ?>">
        <div class="form-group"><label>Nombre</label><input type="text" name="name" value="<?php echo h($editingProduct['name'] ?? ''); ?>" required></div>
        <div class="form-group"><label>Descripcion</label><textarea name="desc" rows="3"><?php echo h($editingProduct['desc'] ?? ''); ?></textarea></div>
        <div class="form-group"><label>Categoria</label>
          <select name="category">
            <?php foreach ($productCategories as $category): ?>
              <option value="<?php echo h($category); ?>" <?php echo ($editingProduct['category'] ?? '') === $category ? 'selected' : ''; ?>><?php echo h($category); ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="form-group"><label>Precio ($)</label><input type="number" name="price" value="<?php echo h($editingProduct['price'] ?? ''); ?>" required></div>
        <div class="form-group"><label>Stock</label><input type="number" name="stock" min="0" value="<?php echo h($editingProduct['stock'] ?? 0); ?>" required></div>
        <div class="form-group"><label>URL Imagen</label><input type="url" name="img" value="<?php echo h($editingProduct['img'] ?? ''); ?>"></div>
        <div style="display: flex; gap: 10px;">
          <button type="submit" class="btn btn-add" style="flex:1">Guardar</button>
          <a class="btn btn-danger" href="?section=productos" style="flex:1; text-align:center;">Cancelar</a>
        </div>
      </form>
    </div>
  </div>
</body>
</html>