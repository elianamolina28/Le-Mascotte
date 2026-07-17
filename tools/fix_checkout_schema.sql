-- ============================================================
-- Fix: Add missing columns to pedido table for checkout flow
-- The addOrderWithDetails function inserts into forma_pago and id_direccion
-- ============================================================

USE lemascotte_db;

-- 1. Add forma_pago column to pedido if it doesn't exist
SET @col1 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pedido' AND COLUMN_NAME = 'forma_pago' AND TABLE_SCHEMA = 'lemascotte_db');
SET @sql1 = IF(@col1 = 0, 'ALTER TABLE pedido ADD COLUMN forma_pago VARCHAR(50) DEFAULT NULL AFTER total_pedido', 'SELECT "forma_pago already exists"');
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2. Add id_direccion column to pedido if it doesn't exist
SET @col2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pedido' AND COLUMN_NAME = 'id_direccion' AND TABLE_SCHEMA = 'lemascotte_db');
SET @sql2 = IF(@col2 = 0, 'ALTER TABLE pedido ADD COLUMN id_direccion VARCHAR(30) DEFAULT NULL AFTER forma_pago', 'SELECT "id_direccion already exists"');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. Add fecha_actualizacion column to pedido if it doesn't exist
SET @col3 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pedido' AND COLUMN_NAME = 'fecha_actualizacion' AND TABLE_SCHEMA = 'lemascotte_db');
SET @sql3 = IF(@col3 = 0, 'ALTER TABLE pedido ADD COLUMN fecha_actualizacion TIMESTAMP NULL DEFAULT NULL AFTER fecha_pedido', 'SELECT "fecha_actualizacion already exists"');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- 4. Create direccion_envio table if it doesn't exist
CREATE TABLE IF NOT EXISTS direccion_envio (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Verify the structure
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'pedido' 
AND TABLE_SCHEMA = 'lemascotte_db'
ORDER BY ORDINAL_POSITION;