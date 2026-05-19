const { Router } = require('express');
const categoriasRoutes = require('./categorias');
const produtosRoutes = require('./produtos');
const auditoriaRoutes = require('./auditoria');
const authRoutes = require('./auth');
const pesquisasRoutes = require('./pesquisas');
const calculoFreteRoutes = require('./calculofrete');
const cartRoutes = require('./cart');
const usuariosRoutes = require('./usuarios');
const pedidosRoutes = require('./pedidos');

const router = Router();

router.use('/categorias', categoriasRoutes);
router.use('/produtos', produtosRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/auth', authRoutes);
router.use('/pesquisas', pesquisasRoutes);
router.use('/frete', calculoFreteRoutes);
router.use('/cart', cartRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/pedidos', pedidosRoutes);

module.exports = router;
