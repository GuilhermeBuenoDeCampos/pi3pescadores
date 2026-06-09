'use strict';

const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const carrinhoAbandonoController = require('../controllers/carrinhoAbandonoController');

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/carrinho', carrinhoAbandonoController.dashboard);
router.get('/carrinho/mensal', carrinhoAbandonoController.mensal);

module.exports = router;
