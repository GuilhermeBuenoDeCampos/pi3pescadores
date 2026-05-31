const { Router } = require('express');
const categoriasRoutes = require('./categorias');
const produtosRoutes = require('./produtos');
const auditoriaRoutes = require('./auditoria');
const dashboardRoutes = require('./dashboard');
const authRoutes = require('./auth');
const pesquisasRoutes = require('./pesquisas');
const calculoFreteRoutes = require('./calculofrete');
const cartRoutes = require('./cart');
const usuariosRoutes = require('./usuarios');
const pedidosRoutes = require('./pedidos');
const visitanteEventoRoutes = require('./visitanteEvento');
const kpiConfigRoutes = require('./kpiConfig');
const faturamentoCompletoRoutes = require('./faturamentoCompleto');

const router = Router();

router.use('/categorias', categoriasRoutes);
router.use('/produtos', produtosRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/auth', authRoutes);
router.use('/pesquisas', pesquisasRoutes);
router.use('/frete', calculoFreteRoutes);
router.use('/cart', cartRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/pedidos', pedidosRoutes);
router.use('/visitante-evento', visitanteEventoRoutes);
router.use('/kpi-config', kpiConfigRoutes);
router.use('/faturamento-completo', faturamentoCompletoRoutes);

module.exports = router;
