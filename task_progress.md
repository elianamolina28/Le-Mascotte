# Plan de Implementación - Sistema de Pedidos

## Análisis Completo
- [x] Revisar estructura de backend (api/, models/)
- [x] Revisar frontend (index.tsx, admin.tsx)
- [x] Identificar bugs (Database() PDO vs mysqli)
- [x] Confirmar tablas y columnas

## Correcciones Backend
- [ ] 1. Reescribir `api/editar_pedido.php` - Usar conexión mysqli correcta con transacciones, stock_actual en Producto
- [ ] 2. Reescribir `api/eliminar_pedido.php` - Idem, con rollback/commit correctos
- [ ] 3. Verificar que `ajax_lemascotte.php` usa `cantidad_salida` correctamente (match con BD)

## Frontend - index.tsx (Mis Pedidos)
- [ ] 4. Crear componente responsivo MisPedidos (Cards móvil / Tabla escritorio)
- [ ] 5. Modal de Editar con formulario pre-llenado y ajuste de cantidades
- [ ] 6. Confirmación Alert.alert para Eliminar
- [ ] 7. Manejo de errores: mostrar alertas del servidor al usuario

## Frontend - admin.tsx (Pedidos)
- [ ] 8. Asegurar que admin.tsx force consulta fresca a BD
- [ ] 9. Verificar flujo completo Crear->Ver->Editar/Eliminar->Sincronizar

## Prueba Final
- [ ] 10. Verificar transacciones SQL funcionan con COMMIT/ROLLBACK
- [ ] 11. Verificar que stock se actualiza correctamente en Producto
- [ ] 12. Verificar respuesta JSON correcta en errores