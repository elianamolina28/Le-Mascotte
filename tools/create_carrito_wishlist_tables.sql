-- ============================================
-- Tabla: carrito (shopping cart per user)
-- ============================================
CREATE TABLE IF NOT EXISTS carrito (
  id_carrito VARCHAR(30) PRIMARY KEY,
  id_usuario VARCHAR(30) NOT NULL,
  id_producto VARCHAR(30) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_producto) REFERENCES Producto(id_producto) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Tabla: wishlist (favorites per user)
-- ============================================
CREATE TABLE IF NOT EXISTS wishlist (
  id_wishlist VARCHAR(30) PRIMARY KEY,
  id_usuario VARCHAR(30) NOT NULL,
  id_producto VARCHAR(30) NOT NULL,
  fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_producto) REFERENCES Producto(id_producto) ON DELETE CASCADE,
  UNIQUE KEY uq_usuario_producto (id_usuario, id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Agregar columna updated_at a pedido para tracking de estados
-- ============================================
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER fecha_pedido;