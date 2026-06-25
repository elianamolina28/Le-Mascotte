<?php
session_start();
include_once __DIR__ . '/../controllers/le_mascotte_model.php';

$search = $search ?? '';
$wishlistCount = $wishlistCount ?? 0;
$cartCount = $cartCount ?? 0;
$currentUser = $currentUser ?? null;
$navCategories = $navCategories ?? [];
$category = $category ?? '';
$flash = $flash ?? null;
$filteredProducts = $filteredProducts ?? [];
$panel = $panel ?? '';
$cartTotal = $cartTotal ?? 0;
$auth = $auth ?? '';
$checkoutInfo = $checkoutInfo ?? [];
$paymentMethods = $paymentMethods ?? [];
$addressTypes = $addressTypes ?? [];
$bogotaLocalities = $bogotaLocalities ?? [];
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Le Mascotte - Tienda Virtual de Mascotas</title>
  <link rel="shortcut icon" href="../ACCENT/IMG/logo.png">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
  <link rel="stylesheet" href="../ACCENT/CSS/style_index.css">
  <style>
    .flash { border-radius: 12px; color: #fff; font-weight: 700; margin: 1rem 2rem 0; padding: .8rem 1rem; }
    .flash.success { background: #2d6a4f; }
    .flash.error { background: #c0392b; }
    .inline-form { display: inline; }
    .link-button { text-decoration: none; }
    .cart-overlay.open { display: block; }
    .cart-sidebar.open { right: 0; }
    .modal-overlay.open { display: flex; }
    .category-card { text-decoration: none; color: inherit; }
    .checkout-form { display: grid; gap: .85rem; padding-bottom: 1rem; }
    .checkout-form .form-group { display: grid; gap: .35rem; }
    .checkout-form label { color: #333; font-size: .85rem; font-weight: 700; }
    .checkout-form input, .checkout-form select { border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; font: inherit; padding: .72rem .8rem; width: 100%; }
    .checkout-form .address-grid { display: grid; gap: .7rem; grid-template-columns: 1fr 1fr; }
    .checkout-form .address-grid .wide { grid-column: 1 / -1; }
    .checkout-summary { border-top: 1px solid #eee; margin-top: .8rem; padding-top: .9rem; }
    .checkout-actions { display: flex; gap: .7rem; }
    .checkout-actions .link-button { align-items: center; border: 1px solid #ddd; border-radius: 10px; color: #333; display: inline-flex; flex: 1; justify-content: center; padding: .8rem; }
    .checkout-actions .btn-submit { flex: 2; }
  </style>
</head>
<body>

<header>
  <div class="header-top">
    <a href="le_mascotte.php" class="logo">Le <span>Mascotte</span> 🐾</a>

    <form class="search-bar" method="get">
      <input type="text" name="q" value="<?php echo h($search); ?>" placeholder="Buscar productos para tu mascota..." />
      <button type="submit"><i class="fas fa-search"></i></button>
    </form>

    <div class="header-icons">
      <a class="icon-btn link-button" href="?panel=wishlist" title="Lista de deseos">
        <i class="fas fa-heart"></i>
        <span class="badge"><?php echo $wishlistCount; ?></span>
      </a>
      <a class="icon-btn link-button" href="?panel=cart" title="Carrito">
        <i class="fas fa-shopping-cart"></i>
        <span class="badge"><?php echo $cartCount; ?></span>
      </a>
      <?php if ($currentUser): ?>
        <form method="post" class="inline-form">
          <input type="hidden" name="form_action" value="logout">
          <button class="auth-btn" type="submit"><i class="fas fa-user-circle"></i> <?php echo h(explode(' ', $currentUser['nombre_usuario'])[0]); ?></button>
        </form>
      <?php else: ?>
        <a class="auth-btn link-button" href="?auth=login"><i class="fas fa-user"></i> Ingresar</a>
      <?php endif; ?>
    </div>
  </div>

  <nav class="main-nav">
    <?php foreach ($navCategories as $value => $label): ?>
      <a class="nav-link <?php echo $category === $value ? 'active' : ''; ?>" href="?cat=<?php echo urlencode($value); ?>"><?php echo h($label); ?></a>
    <?php endforeach; ?>
  </nav>
</header>

<?php if ($flash): ?>
  <div class="flash <?php echo h($flash['type']); ?>"><?php echo h($flash['message']); ?></div>
<?php endif; ?>

<section class="hero">
  <img
    src="https://www.purina.com.ar/sites/default/files/2025-08/Banner_1590x700px-100.jpg"
    alt="Le Mascotte - Cuida a tu mejor amigo"
    onerror="this.src='https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1590&h=700&fit=crop&auto=format'"
  />
  <div class="hero-overlay">
    <div class="hero-text">
      <h1>Todo para tu mascota</h1>
      <p>Nutrición, accesorios y cuidado con amor 🐾</p>
      <a href="#productos" class="btn-primary">Ver Productos</a>
    </div>
  </div>
</section>

<section class="section" style="background:#fff;">
  <h2 class="section-title font-display">Categorias</h2>
  <div class="categories-grid">
    <?php foreach (['Perros' => '🐶', 'Gatos' => '🐱', 'Peces' => '🐠', 'Aves' => '🐦', 'Pequeñas Mascotas' => '🐹', 'Salud' => '💊', 'Higiene' => '🧴', 'Ofertas' => '🎁', '' => '✨'] as $catValue => $emoji): ?>
      <a class="category-card" href="?cat=<?php echo urlencode($catValue); ?>">
        <div class="emoji"><?php echo $emoji; ?></div>
        <h3><?php echo h($catValue === '' ? 'Ver todo' : $catValue); ?></h3>
      </a>
    <?php endforeach; ?>
  </div>
</section>

<section class="section" id="productos">
  <h2 class="section-title font-display"><?php echo h($category ?: 'Productos Destacados'); ?></h2>
  <div class="products-grid">
    <?php if (!$filteredProducts): ?>
      <div class="empty-state" style="grid-column:1/-1"><i class="fas fa-search"></i><p>No se encontraron productos</p></div>
    <?php endif; ?>
    <?php foreach ($filteredProducts as $product): ?>
      <?php
        $productId = (string) $product['id'];
        $productStock = array_key_exists('stock', $product) ? max(0, (int) $product['stock']) : PHP_INT_MAX;
        $productAvailable = $productStock > 0 && ($product['status'] ?? 'Disponible') !== 'Agotado';
      ?>
      <div class="product-card">
        <div class="product-img">
          <img src="<?php echo h($product['img'] ?: 'https://placehold.co/400x300/fdeef7/6b124f?text=Mascotte'); ?>" alt="<?php echo h($product['name']); ?>" loading="lazy" />
          <form method="post">
            <input type="hidden" name="form_action" value="toggle_wishlist">
            <input type="hidden" name="product_id" value="<?php echo h($productId); ?>">
            <button class="wishlist-btn <?php echo in_array($productId, $_SESSION['lm_wishlist'], true) ? 'active' : ''; ?>" type="submit" title="Lista de deseos">
              <i class="<?php echo in_array($productId, $_SESSION['lm_wishlist'], true) ? 'fas' : 'far'; ?> fa-heart"></i>
            </button>
          </form>
        </div>
        <div class="product-info">
          <?php if (!$productAvailable): ?><span class="product-badge">Agotado</span><?php elseif (!empty($product['badge'])): ?><span class="product-badge"><?php echo h($product['badge']); ?></span><?php endif; ?>
          <h3 class="product-name"><?php echo h($product['name']); ?></h3>
          <p class="product-desc"><?php echo h($product['desc'] ?? 'Producto para el cuidado y bienestar de tu mascota.'); ?></p>
          <div class="product-footer">
            <span class="product-price"><?php echo money($product['price']); ?></span>
            <?php if ($productAvailable): ?>
              <form method="post">
                <input type="hidden" name="form_action" value="add_cart">
                <input type="hidden" name="product_id" value="<?php echo h($productId); ?>">
                <button class="add-to-cart" type="submit"><i class="fas fa-cart-plus"></i> Añadir</button>
              </form>
            <?php else: ?>
              <button class="add-to-cart" type="button" disabled>Agotado</button>
            <?php endif; ?>
          </div>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<div class="offer-banner">
  <div>
    <h2>🐾 Envío gratis en tu primera compra</h2>
    <p>En pedidos mayores a $80.000 - Aprovecha hoy!</p>
  </div>
  <a class="btn-outline link-button" href="?cat=Ofertas">Usar codigo MASCOTTE</a>
</div>

<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <h3>Le Mascotte 🐾</h3>
      <p>Tu tienda de confianza para el cuidado y bienestar de tus mascotas.</p>
    </div>
    <div class="footer-col"><h4>Tienda</h4><ul><li><a href="?cat=Ofertas">Ofertas</a></li><li><a href="#productos">Mas vendidos</a></li></ul></div>
    <div class="footer-col"><h4>Ayuda</h4><ul><li><a href="#">Preguntas Frecuentes</a></li><li><a href="#">Contacto</a></li></ul></div>
    <div class="footer-col"><h4>Legal</h4><ul><li><a href="#">Terminos y Condiciones</a></li><li><a href="#">Politica de Privacidad</a></li></ul></div>
  </div>
  <div class="footer-bottom"><p>© 2025 Le Mascotte. Todos los derechos reservados.</p></div>
</footer>

<?php if ($panel === 'cart' || $panel === 'wishlist' || $panel === 'checkout'): ?>
  <a class="cart-overlay open" href="le_mascotte.php"></a>
  <div class="cart-sidebar open">
    <div class="cart-header">
      <h3><?php echo $panel === 'wishlist' ? 'Favoritos y Carrito' : ($panel === 'checkout' ? 'Datos de Compra' : 'Carrito de Compras'); ?></h3>
      <a class="modal-close link-button" href="le_mascotte.php"><i class="fas fa-times"></i></a>
    </div>
    <div class="cart-body">
      <?php if ($panel === 'checkout'): ?>
        <?php if (!$_SESSION['lm_cart']): ?>
          <div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Tu carrito esta vacio</p></div>
        <?php else: ?>
          <form class="checkout-form" method="post">
            <input type="hidden" name="form_action" value="checkout">

            <div class="form-group">
              <label>Cedula</label>
              <input type="text" name="cedula" inputmode="numeric" minlength="10" maxlength="10" pattern="[0-9]{10}" value="<?php echo h($checkoutInfo['cedula'] ?? ''); ?>" placeholder="10 digitos" required>
            </div>

            <div class="form-group">
              <label>Forma de pago</label>
              <select name="payment_method" required>
                <option value="">Seleccionar</option>
                <?php foreach ($paymentMethods as $value => $label): ?>
                  <option value="<?php echo h($value); ?>" <?php echo ($checkoutInfo['payment_method'] ?? '') === $value ? 'selected' : ''; ?>><?php echo h($label); ?></option>
                <?php endforeach; ?>
              </select>
            </div>

            <div class="address-grid">
              <div class="form-group wide">
                <label>Tipo de via</label>
                <select name="address_type" required>
                  <option value="">Seleccionar</option>
                  <?php foreach ($addressTypes as $type): ?>
                    <option value="<?php echo h($type); ?>" <?php echo ($checkoutInfo['address_type'] ?? '') === $type ? 'selected' : ''; ?>><?php echo h($type); ?></option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="form-group">
                <label>Numero via</label>
                <input type="number" name="address_number" min="1" max="250" value="<?php echo h($checkoutInfo['address_number'] ?? ''); ?>" required>
              </div>
              <div class="form-group">
                <label>Letra via</label>
                <input type="text" name="address_letter" maxlength="2" pattern="[A-Za-z]{0,2}" value="<?php echo h($checkoutInfo['address_letter'] ?? ''); ?>" placeholder="Opcional">
              </div>
              <div class="form-group">
                <label>Numero placa</label>
                <input type="number" name="address_plate" min="1" max="250" value="<?php echo h($checkoutInfo['address_plate'] ?? ''); ?>" required>
              </div>
              <div class="form-group">
                <label>Letra placa</label>
                <input type="text" name="address_plate_letter" maxlength="2" pattern="[A-Za-z]{0,2}" value="<?php echo h($checkoutInfo['address_plate_letter'] ?? ''); ?>" placeholder="Opcional">
              </div>
              <div class="form-group">
                <label>Numero final</label>
                <input type="number" name="address_home_number" min="1" max="250" value="<?php echo h($checkoutInfo['address_home_number'] ?? ''); ?>" required>
              </div>
              <div class="form-group">
                <label>Localidad</label>
                <select name="locality" required>
                  <option value="">Seleccionar</option>
                  <?php foreach ($bogotaLocalities as $localityOption): ?>
                    <option value="<?php echo h($localityOption); ?>" <?php echo ($checkoutInfo['locality'] ?? '') === $localityOption ? 'selected' : ''; ?>><?php echo h($localityOption); ?></option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="form-group wide">
                <label>Complemento</label>
                <input type="text" name="address_extra" maxlength="80" value="<?php echo h($checkoutInfo['address_extra'] ?? ''); ?>" placeholder="Apartamento, torre, barrio o referencia">
              </div>
            </div>

            <div class="checkout-summary">
              <div class="cart-total"><span>Total</span><span><?php echo money($cartTotal); ?></span></div>
            </div>

            <div class="checkout-actions">
              <a class="link-button" href="?panel=cart">Volver</a>
              <button class="btn-submit" type="submit"><i class="fas fa-lock"></i> Confirmar Pedido</button>
            </div>
          </form>
        <?php endif; ?>
      <?php else: ?>
        <?php if (!$_SESSION['lm_cart']): ?>
          <div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Tu carrito esta vacio</p></div>
        <?php endif; ?>
        <?php foreach ($_SESSION['lm_cart'] as $id => $qty): ?>
          <?php if (!isset($productMap[$id])) continue; $item = $productMap[$id]; ?>
          <?php
            $itemStock = array_key_exists('stock', $item) ? max(0, (int) $item['stock']) : PHP_INT_MAX;
            $canIncreaseItem = $itemStock > $qty && ($item['status'] ?? 'Disponible') !== 'Agotado';
          ?>
          <div class="cart-item">
            <img src="<?php echo h($item['img']); ?>" alt="">
            <div class="cart-item-info">
              <div class="cart-item-name"><?php echo h($item['name']); ?></div>
              <div class="cart-item-price"><?php echo money($item['price'] * $qty); ?></div>
              <div class="cart-qty">
                <form method="post"><input type="hidden" name="form_action" value="cart_qty"><input type="hidden" name="product_id" value="<?php echo h($id); ?>"><input type="hidden" name="delta" value="-1"><button type="submit">−</button></form>
                <span><?php echo h($qty); ?></span>
                <form method="post"><input type="hidden" name="form_action" value="cart_qty"><input type="hidden" name="product_id" value="<?php echo h($id); ?>"><input type="hidden" name="delta" value="1"><button type="submit" <?php echo $canIncreaseItem ? '' : 'disabled'; ?>>+</button></form>
              </div>
            </div>
          </div>
        <?php endforeach; ?>
        <div class="wishlist-section">
          <h4><i class="fas fa-heart" style="color:#e74c3c"></i> Lista de Deseos (<?php echo $wishlistCount; ?>)</h4>
          <?php if (!$_SESSION['lm_wishlist']): ?><p style="font-size:.82rem;color:#bbb;text-align:center;">No hay productos en favoritos</p><?php endif; ?>
          <?php foreach ($_SESSION['lm_wishlist'] as $id): ?>
            <?php if (!isset($productMap[$id])) continue; $item = $productMap[$id]; ?>
            <?php $wishlistStock = array_key_exists('stock', $item) ? max(0, (int) $item['stock']) : PHP_INT_MAX; ?>
            <?php $wishlistAvailable = $wishlistStock > 0 && ($item['status'] ?? 'Disponible') !== 'Agotado'; ?>
            <div class="wishlist-mini-item">
              <img src="<?php echo h($item['img']); ?>" alt="">
              <div class="wishlist-mini-info"><div class="name"><?php echo h($item['name']); ?></div><div class="price"><?php echo money($item['price']); ?></div></div>
              <?php if ($wishlistAvailable): ?>
                <form method="post"><input type="hidden" name="form_action" value="move_to_cart"><input type="hidden" name="product_id" value="<?php echo h($id); ?>"><button class="move-to-cart" type="submit">Comprar</button></form>
              <?php else: ?>
                <button class="move-to-cart" type="button" disabled>Agotado</button>
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
    <div class="cart-footer" style="<?php echo $_SESSION['lm_cart'] && $panel !== 'checkout' ? '' : 'display:none;'; ?>">
      <div class="cart-total"><span>Total</span><span><?php echo money($cartTotal); ?></span></div>
      <a class="btn-submit link-button" href="?panel=checkout"><i class="fas fa-lock"></i> Proceder al Pago</a>
    </div>
  </div>
<?php endif; ?>

<?php if ($auth === 'login' || $auth === 'register'): ?>
  <div class="modal-overlay open">
    <div class="modal">
      <a class="modal-close link-button" href="le_mascotte.php"><i class="fas fa-times"></i></a>
      <?php if ($auth === 'login'): ?>
        <form method="post">
          <input type="hidden" name="form_action" value="login">
          <h2>🐾 Bienvenido de vuelta</h2>
          <div class="form-group"><label>Correo electrónico</label><input type="email" name="email" placeholder="tu@email.com" required></div>
          <div class="form-group"><label>Contraseña</label><input type="password" name="password" placeholder="********" required></div>
          <div class="form-group"><label>Tipo de usuario</label><select name="role"><option value="user">Usuario</option><option value="admin">Administrador</option><option value="employee">Empleado</option></select></div>
          <button class="btn-submit" type="submit"><i class="fas fa-sign-in-alt"></i> Iniciar Sesion</button>
          <div class="form-switch">No tienes cuenta? <a href="?auth=register">Registrate aqui</a></div>
        </form>
      <?php else: ?>
        <form method="post">
          <input type="hidden" name="form_action" value="register">
          <h2>🐾 Crear cuenta</h2>
          <div class="form-row"><div class="form-group"><label>Nombre</label><input type="text" name="name" required></div><div class="form-group"><label>Apellido</label><input type="text" name="last" required></div></div>
          <div class="form-group"><label>Correo electrónico</label><input type="email" name="email" required></div>
          <div class="form-group"><label>Contraseña</label><input type="password" name="password" required></div>
          <div class="form-group"><label>Confirmar contraseña</label><input type="password" name="password2" required></div>
          <div class="form-group"><label>Telefono</label><input type="tel" name="phone" required></div>
          <div class="form-group"><label>Registrarse como</label><select name="role"><option value="cliente">Cliente</option><option value="admin">Administrador</option><option value="empleado">Empleado</option></select></div>
          <button class="btn-submit" type="submit"><i class="fas fa-user-plus"></i> Crear Cuenta</button>
          <div class="form-switch">Ya tienes cuenta? <a href="?auth=login">Inicia sesion</a></div>
        </form>
      <?php endif; ?>
    </div>
  </div>
<?php endif; ?>
</body>
</html>
