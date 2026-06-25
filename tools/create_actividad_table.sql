-- ============================================
-- Tabla: actividad_log (user activity log / historial de eventos)
-- ============================================
CREATE TABLE IF NOT EXISTS actividad_log (
  id_log VARCHAR(40) PRIMARY KEY,
  id_usuario VARCHAR(30) NOT NULL,
  nombre_usuario VARCHAR(100) NOT NULL DEFAULT '',
  tipo_accion ENUM('carrito_add','carrito_remove','carrito_update','wishlist_add','wishlist_remove','pedido_creado','pedido_actualizado','login') NOT NULL,
  descripcion VARCHAR(500) NOT NULL DEFAULT '',
  id_producto VARCHAR(30) DEFAULT NULL,
  nombre_producto VARCHAR(200) DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (id_usuario),
  INDEX idx_tipo (tipo_accion),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;