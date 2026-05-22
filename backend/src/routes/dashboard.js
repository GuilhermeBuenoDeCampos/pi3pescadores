'use strict';

const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const dashboardController = require('../controllers/dashboardController');

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/financeiro', dashboardController.financeiro);
router.get('/faturamento-mensal', dashboardController.faturamentoMensal);
router.get('/produtos-mais-vendidos', dashboardController.produtosMaisVendidos);
router.get('/categorias', dashboardController.categorias);
router.get('/vendas-por-periodo', dashboardController.vendasPorPeriodo);

module.exports = router;
