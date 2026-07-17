<?php
session_start();
include_once __DIR__ . '/../controllers/dash_admin_model.php';
$section = $section ?? 'dash';
$message = $message ?? '';
$messageType = $messageType ?? 'success';
$products = $products ?? [];
$users = $users ?? [];
$availableProductsCount = $availableProductsCount ?? 0;
$productCategories = $productCategories ?? ['Perros', 'Gatos', 'Accesorios', 'Peces', 'Aves', 'Pequeñas Mascotas', 'Salud', 'Higiene', 'Ofertas'];
$showProductModal = $showProductModal ?? false;
$editingProduct = $editingProduct ?? null;
$showUserModal = $showUserModal ?? false;
$editingUser = $editingUser ?? null;?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Panel Administrativo Integral - Le Mascotte</title>
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
    .stats-list { background: #fff; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); padding: 25px; }
  </style>
</head>
<body>

  <nav class="top-nav">
    <a class="logo" href="?section=dash">
      <img src="../ACCENT/IMG/logo.png" alt="Logo">
      <span>Le Mascotte Admin</span>
    </a>
    <div class="nav-links">
      <a href="?section=dash" class="<?php echo $section === 'dash' ? 'active' : ''; ?>">Dashboard</a>
      <a href="?section=productos" class="<?php echo $section === 'productos' ? 'active' : ''; ?>">Productos</a>
      <a href="?section=usuarios" class="<?php echo $section === 'usuarios' ? 'active' : ''; ?>">Usuarios</a>
      <a href="?section=stats" class="<?php echo $section === 'stats' ? 'active' : ''; ?>">Estadisticas</a>
    </div>
  </nav>

  <div class="main-container">
    <?php if ($message !== ''): ?>
      <div class="alert <?php echo h($messageType); ?>"><?php echo h($message); ?></div>
    <?php endif; ?>

    <section id="view-dash" class="view-section <?php echo $section === 'dash' ? 'active' : ''; ?>">
      <h1 style="text-align: center; color: var(--morado); margin-bottom: 40px;">Panel de Administracion</h1>
      <div class="grid">
        <div class="module-card">
          <i class="fa fa-boxes-stacked"></i>
          <h3>Productos</h3>
          <p><?php echo count($products); ?> productos</p>
          <a href="?section=productos" class="btn btn-main">Gestionar &rarr;</a>
        </div>
        <div class="module-card">
          <i class="fa fa-user-shield"></i>
          <h3>Usuarios</h3>
          <p><?php echo count($users); ?> usuarios</p>
          <a href="?section=usuarios" class="btn btn-main">Administrar &rarr;</a>
        </div>
        <div class="module-card">
          <i class="fa fa-chart-line"></i>
          <h3>Estadisticas</h3>
          <p>Resumen operativo del sistema.</p>
          <a href="?section=stats" class="btn btn-main">Ver Reportes &rarr;</a>
        </div>
      </div>
    </section>

    <section id="view-productos" class="view-section <?php echo $section === 'productos' ? 'active' : ''; ?>">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <h2>Inventario de Productos</h2>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a class="btn btn-export" href="../api/exportar_excel.php?tipo=productos" target="_blank"><i class="fa fa-file-excel"></i> Exportar Productos</a>
          <a class="btn btn-export" href="../api/exportar_excel.php?tipo=inventario" target="_blank"><i class="fa fa-chart-simple"></i> Exportar Inventario</a>
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

    <section id="view-usuarios" class="view-section <?php echo $section === 'usuarios' ? 'active' : ''; ?>">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <h2>Control de Usuarios</h2>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a class="btn btn-export" href="../api/exportar_excel.php?tipo=usuarios" target="_blank"><i class="fa fa-file-excel"></i> Exportar Usuarios</a>
          <a class="btn btn-add" style="background: var(--morado);" href="?section=usuarios&user_form=new"><i class="fa fa-user-plus"></i> Nuevo Usuario</a>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="admin-table">
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <?php foreach ($users as $user): ?>
              <tr>
                <td><?php echo h($user['name']); ?></td>
                <td><?php echo h($user['email']); ?></td>
                <td><span class="badge-role" style="background:<?php echo roleColor($user['role']); ?>"><?php echo h(strtoupper($user['role'])); ?></span></td>
                <td><span style="color:<?php echo statusColor($user['status'] ?? 'Activo'); ?>; font-weight:bold;"><?php echo h($user['status'] ?? 'Activo'); ?></span></td>
                <td>
                  <a class="btn btn-edit" href="?section=usuarios&user_form=edit&user_id=<?php echo urlencode($user['id']); ?>"><i class="fa fa-user-gear"></i></a>
                  <form class="inline-form" method="post">
                    <input type="hidden" name="form_action" value="delete_user">
                    <input type="hidden" name="id" value="<?php echo h($user['id']); ?>">
                    <button class="btn btn-danger" type="submit"><i class="fa fa-user-xmark"></i></button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </section>

    <section id="view-stats" class="view-section <?php echo $section === 'stats' ? 'active' : ''; ?>">
      <h2>Analisis de Ventas</h2>
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <a class="btn btn-export" href="../api/exportar_excel.php?tipo=productos" target="_blank"><i class="fa fa-file-excel"></i> Exportar Productos</a>
        <a class="btn btn-export" href="../api/exportar_excel.php?tipo=usuarios" target="_blank"><i class="fa fa-file-excel"></i> Exportar Usuarios</a>
        <a class="btn btn-export" href="../api/exportar_excel.php?tipo=pedidos" target="_blank"><i class="fa fa-file-excel"></i> Exportar Pedidos</a>
        <a class="btn btn-export" href="../api/exportar_excel.php?tipo=inventario" target="_blank"><i class="fa fa-chart-simple"></i> Exportar Inventario</a>
      </div>
      <div class="stats-list">
        <p><strong>Productos registrados:</strong> <?php echo count($products); ?></p>
        <p><strong>Usuarios registrados:</strong> <?php echo count($users); ?></p>
        <p><strong>Productos disponibles:</strong> <?php echo $availableProductsCount; ?></p>
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

  <div id="modalUsuario" class="modal" style="<?php echo $showUserModal ? 'display:block;' : ''; ?>">
    <div class="modal-content">
      <div class="modal-header"><h3>Gestionar Usuario</h3></div>
      <form method="post">
        <input type="hidden" name="form_action" value="save_user">
        <input type="hidden" name="id" value="<?php echo h($editingUser['id'] ?? ''); ?>">
        <div class="form-group"><label>Nombre</label><input type="text" name="name" value="<?php echo h($editingUser['name'] ?? ''); ?>" required></div>
        <div class="form-group"><label>Email</label><input type="email" name="email" value="<?php echo h($editingUser['email'] ?? ''); ?>" required></div>
        <div class="form-group"><label>Rol</label>
          <select name="role">
            <?php foreach (['cliente' => 'Usuario (Cliente)', 'admin' => 'Administrador', 'empleado' => 'Empleado'] as $value => $label): ?>
              <option value="<?php echo h($value); ?>" <?php echo strtolower($editingUser['role'] ?? '') === strtolower($value) ? 'selected' : ''; ?>><?php echo h($label); ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="form-group"><label>Estado de Cuenta</label>
          <select name="status">
            <?php foreach (['Activo', 'Bloqueado'] as $status): ?>
              <option value="<?php echo h($status); ?>" <?php echo ($editingUser['status'] ?? 'Activo') === $status ? 'selected' : ''; ?>><?php echo h($status); ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="submit" class="btn btn-add" style="flex:1; background: var(--morado);">Guardar</button>
          <a class="btn btn-danger" href="?section=usuarios" style="flex:1; text-align:center;">Cancelar</a>
        </div>
      </form>
    </div>
  </div>
</body>
</html>
