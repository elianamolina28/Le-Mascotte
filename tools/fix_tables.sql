-- ============================================================
-- Migration: Add inventory management columns to Producto table
-- Adds: cantidad_entrada, cantidad_salida, valor_compra
-- Removes: umbral_producto (old threshold)
-- Stock is computed as: cantidad_entrada - cantidad_salida
-- Price (precio_producto) auto-calculates as: valor_compra * 1.80
-- ============================================================

USE lemascotte_db;

-- 1. First add the new columns
ALTER TABLE Producto
    ADD COLUMN cantidad_entrada INT NOT NULL DEFAULT 0 AFTER stock_producto,
    ADD COLUMN cantidad_salida INT NOT NULL DEFAULT 0 AFTER cantidad_entrada,
    ADD COLUMN valor_compra DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER precio_producto;

-- 2. Seed existing products with initial values
-- Set cantidad_entrada = current stock, cantidad_salida = 0
-- Set valor_compra = precio_producto / 1.80 (reverse-calculate 80% margin)
UPDATE Producto
SET 
    cantidad_entrada = stock_producto,
    cantidad_salida = 0,
    valor_compra = ROUND(precio_producto / 1.80, 2)
WHERE 1=1;

-- 3. Remove old threshold column
ALTER TABLE Producto
    DROP COLUMN umbral_producto;

-- 4. Create trigger to auto-update stock_producto when entrada/salida change
DELIMITER $$
CREATE TRIGGER trg_producto_stock_update
BEFORE UPDATE ON Producto
FOR EACH ROW
BEGIN
    SET NEW.stock_producto = NEW.cantidad_entrada - NEW.cantidad_salida;
    -- Auto-apply 80% margin rule if valor_compra changed and precio wasn't manually edited
    IF NEW.precio_producto = OLD.precio_producto AND NEW.valor_compra <> OLD.valor_compra THEN
        SET NEW.precio_producto = ROUND(NEW.valor_compra * 1.80, 2);
    END IF;
END$$
DELIMITER ;

-- 5. Create trigger on INSERT
DELIMITER $$
CREATE TRIGGER trg_producto_stock_insert
BEFORE INSERT ON Producto
FOR EACH ROW
BEGIN
    SET NEW.stock_producto = NEW.cantidad_entrada - NEW.cantidad_salida;
    -- Auto-calculate selling price with 80% margin if not set
    IF NEW.precio_producto = 0 OR NEW.precio_producto IS NULL THEN
        SET NEW.precio_producto = ROUND(NEW.valor_compra * 1.80, 2);
    END IF;
END$$
DELIMITER ;

-- 6. Verify the migration
SELECT 
    id_producto AS 'ID',
    nombre_producto AS 'Nombre',
    stock_producto AS 'Stock Actual',
    cantidad_entrada AS 'Entradas',
    cantidad_salida AS 'Salidas',
    valor_compra AS 'Valor Compra',
    precio_producto AS 'Valor Venta',
    ROUND(precio_producto - valor_compra, 2) AS 'Margen $',
    ROUND(((precio_producto - valor_compra) / NULLIF(valor_compra, 0)) * 100, 1) AS 'Margen %'
FROM Producto
LIMIT 20;