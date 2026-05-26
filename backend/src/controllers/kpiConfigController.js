'use strict';

const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middlewares/appError');

exports.teste = asyncHandler(async (req, res) => {
  const db = require('../database/models');
  const { v4: uuidv4 } = require('uuid');
  
  console.log('[kpiConfigController.teste] Modelos disponíveis:', Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize'));
  console.log('[kpiConfigController.teste] Verificando KpiConfig:', !!db.KpiConfig);
  
  if (!db.KpiConfig) {
    return res.status(500).json({
      error: 'KpiConfig model not found',
      available_models: Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize')
    });
  }

  try {
    // Teste 1: Query raw
    console.log('[teste] Executando query raw...');
    const result = await db.sequelize.query('SELECT * FROM kpi_config LIMIT 1');
    console.log('[teste] Query raw result:', result[0]);
    
    // Teste 2: FindOne
    console.log('[teste] Executando findOne...');
    const config = await db.KpiConfig.findOne();
    console.log('[teste] FindOne result:', config);
    
    // Teste 3: Tentar CREATE
    console.log('[teste] Tentando CREATE...');
    const testId = uuidv4();
    console.log('[teste] Novo UUID:', testId);
    
    const newConfig = await db.KpiConfig.create({
      id: testId,
      faturamento_baixo: 100,
      faturamento_alto: 1000,
    });
    
    console.log('[teste] CREATE bem-sucedido:', newConfig.toJSON());
    
    res.json({
      message: 'Todos os testes passaram',
      created: newConfig.toJSON()
    });
  } catch (error) {
    console.error('[teste] ERRO:', error.message);
    console.error('[teste] SQL:', error.sql);
    console.error('[teste] Stack:', error.stack);
    
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      sql: error.sql,
      details: error.original?.message || error.message
    });
  }
});

exports.obterConfig = asyncHandler(async (req, res) => {
  const db = require('../database/models');
  const { v4: uuidv4 } = require('uuid');

  try {
    let config = await db.KpiConfig.findOne();

    // Se não existir, criar com valores padrão
    if (!config) {
      config = await db.KpiConfig.create({
        id: uuidv4(),
        faturamento_baixo: 500,
        faturamento_alto: 5000,
      });
    }

    res.json({
      data: {
        id: config.id,
        faturamento_baixo: parseFloat(config.faturamento_baixo),
        faturamento_alto: parseFloat(config.faturamento_alto),
      },
    });
  } catch (error) {
    // Se a tabela não existir, retornar valores padrão
    console.error('[kpiConfigController] Erro ao obter config:', error.message);
    res.json({
      data: {
        id: null,
        faturamento_baixo: 500,
        faturamento_alto: 5000,
      },
    });
  }
});

exports.atualizarConfig = asyncHandler(async (req, res) => {
  const db = require('../database/models');
  const { v4: uuidv4 } = require('uuid');
  const { faturamento_baixo, faturamento_alto } = req.body;

  console.log('[kpiConfigController] atualizarConfig - dados recebidos:', { faturamento_baixo, faturamento_alto });
  console.log('[kpiConfigController] req.user:', req.user);

  // Validações
  if (typeof faturamento_baixo !== 'number' || faturamento_baixo < 0) {
    throw new AppError('faturamento_baixo deve ser um número positivo', 400);
  }

  if (typeof faturamento_alto !== 'number' || faturamento_alto < 0) {
    throw new AppError('faturamento_alto deve ser um número positivo', 400);
  }

  if (faturamento_baixo >= faturamento_alto) {
    throw new AppError('faturamento_baixo deve ser menor que faturamento_alto', 400);
  }

  console.log('[kpiConfigController] Buscando config existente...');
  let config = await db.KpiConfig.findOne();
  console.log('[kpiConfigController] Config encontrada:', !!config);

  if (!config) {
    console.log('[kpiConfigController] Criando nova config');
    config = await db.KpiConfig.create({
      id: uuidv4(),
      faturamento_baixo,
      faturamento_alto,
    });
    console.log('[kpiConfigController] Nova config criada:', config.id);
  } else {
    console.log('[kpiConfigController] Atualizando config existente:', config.id);
    try {
      config = await config.update({
        faturamento_baixo,
        faturamento_alto,
      });
      console.log('[kpiConfigController] Update bem-sucedido');
    } catch (updateError) {
      console.error('[kpiConfigController] Erro no update:', updateError.message);
      console.error('[kpiConfigController] SQL:', updateError.sql);
      throw updateError;
    }
  }

  res.json({
    data: {
      id: config.id,
      faturamento_baixo: parseFloat(config.faturamento_baixo),
      faturamento_alto: parseFloat(config.faturamento_alto),
    },
  });
});
