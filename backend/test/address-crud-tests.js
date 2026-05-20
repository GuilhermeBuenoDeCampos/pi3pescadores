'use strict';

const app = require('../src/app');
const db = require('../src/database/models');
const enderecoService = require('../src/services/enderecoService');
const jwt = require('../src/utils/jwt');

const RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdUserIds = [];
const createdEmails = [
  `address-a-${RUN_ID}@example.com`,
  `address-b-${RUN_ID}@example.com`,
];
const createdStateUfs = ['TZ', 'TY'];
const stateUfsToCleanup = [];

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

function addressPayload(index, overrides = {}) {
  return {
    apelido: `Teste ${RUN_ID} ${index}`,
    cep: `0100100${index}`,
    logradouro: `Rua Teste ${index}`,
    numero: `${index}`,
    complemento: `Apto ${index}`,
    bairro: `Bairro ${index}`,
    cidade: `Cidade Teste ${RUN_ID} ${index}`,
    estado: 'TZ',
    ...overrides,
  };
}

async function tableExists(tableName) {
  const [result] = await db.sequelize.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = :tableName
    ) AS exists`,
    {
      replacements: { tableName },
      type: db.Sequelize.QueryTypes.SELECT,
    }
  );

  return Boolean(result.exists);
}

async function countRows(tableName) {
  const [result] = await db.sequelize.query(`SELECT COUNT(1)::int AS count FROM ${tableName}`, {
    type: db.Sequelize.QueryTypes.SELECT,
  });

  return result.count;
}

async function createUser(email, nome) {
  const user = await db.Usuario.create({
    nome,
    email,
    telefone: '11999999999',
    tipo_usuario: 'cliente',
    cpf: String(Math.floor(Math.random() * 100000000000)).padStart(11, '0'),
    senha_hash: 'test-hash',
    ativo: true,
    created_at: new Date(),
    updated_at: new Date(),
  });

  createdUserIds.push(user.id);
  return user;
}

async function expectStatus(errorPromise, statusCode, label) {
  try {
    await errorPromise;
  } catch (error) {
    assert(error.statusCode === statusCode, `${label}: esperado status ${statusCode}, recebeu ${error.statusCode || error.message}`);
    return error;
  }

  throw new Error(`${label}: era esperado erro ${statusCode}`);
}

async function cleanup() {
  await db.EnderecoUsuario.destroy({
    where: {
      usuario_id: createdUserIds,
    },
    force: true,
  });

  await db.Usuario.destroy({
    where: {
      id: createdUserIds,
    },
    force: true,
  });

  await db.Cidade.destroy({
    where: {
      nome: {
        [db.Sequelize.Op.like]: `Cidade Teste ${RUN_ID}%`,
      },
    },
    force: true,
  });

  await db.Estado.destroy({
    where: {
      uf: stateUfsToCleanup,
    },
    force: true,
  });
}

async function main() {
  const oldTableExists = await tableExists('enderecos');
  const oldCountBefore = oldTableExists ? await countRows('enderecos') : null;
  const addressCountBefore = await countRows('enderecos_usuario');

  for (const uf of createdStateUfs) {
    const existingState = await db.Estado.findOne({ where: { uf } });
    if (!existingState) {
      stateUfsToCleanup.push(uf);
    }
  }

  const userA = await createUser(createdEmails[0], 'Usuario Teste A');
  const userB = await createUser(createdEmails[1], 'Usuario Teste B');
  const tokenA = jwt.sign({ id: userA.id, sub: userA.id, tipo_usuario: 'cliente' });

  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let addressA1;
  let addressA2;
  let addressA3;
  let addressB1;

  try {
    await test('rotas exigem autenticação', async () => {
      const response = await fetch(`${baseUrl}/api/enderecos`);
      assert(response.status === 401, `GET sem token deveria retornar 401, recebeu ${response.status}`);

      const postResponse = await fetch(`${baseUrl}/api/enderecos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressPayload(9)),
      });
      assert(postResponse.status === 401, `POST sem token deveria retornar 401, recebeu ${postResponse.status}`);
    });

    await test('CREATE salva em enderecos_usuario e primeiro endereço vira principal', async () => {
      addressA1 = await enderecoService.criarEndereco(userA.id, addressPayload(1));

      const row = await db.EnderecoUsuario.findByPk(addressA1.id);
      assert(row, 'endereço não foi encontrado em enderecos_usuario');
      assert(row.usuario_id === userA.id, 'usuario_id incorreto');
      assert(String(row.cidade_id) === String(addressA1.cidade_id), 'cidade_id incorreto');
      assert(row.principal === true, 'primeiro endereço deveria ser principal');
      assert(!db.Endereco, 'model antigo db.Endereco não deve existir');

      const oldCountAfterCreate = oldTableExists ? await countRows('enderecos') : null;
      assert(oldCountAfterCreate === oldCountBefore, 'tabela antiga enderecos recebeu novo registro');
    });

    await test('READ lista somente endereços do usuário logado com cidade e estado', async () => {
      addressB1 = await enderecoService.criarEndereco(userB.id, addressPayload(4, { estado: 'TY' }));

      const listA = await enderecoService.listarEnderecos(userA.id);
      assert(listA.some((item) => String(item.id) === String(addressA1.id)), 'endereço do usuário A não apareceu');
      assert(!listA.some((item) => String(item.id) === String(addressB1.id)), 'endereço do usuário B vazou na listagem do A');
      assert(listA[0].cidade?.nome, 'cidade não retornou no include');
      assert(listA[0].estado?.uf, 'estado não retornou no include');

      const apiResponse = await fetch(`${baseUrl}/api/enderecos`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const body = await apiResponse.json();
      assert(apiResponse.status === 200, `API GET deveria retornar 200, recebeu ${apiResponse.status}`);
      assert(Array.isArray(body.data), 'API GET deveria retornar data como array');
      assert(body.data.every((item) => item.usuario_id === userA.id), 'API GET retornou endereço de outro usuário');
    });

    await test('UPDATE edita campos sem mudar usuario_id e mantém relacionamentos', async () => {
      const updated = await enderecoService.atualizarEndereco(userA.id, addressA1.id, {
        ...addressPayload(1),
        cep: '02002000',
        logradouro: 'Rua Atualizada',
        numero: '200',
        bairro: 'Bairro Atualizado',
        complemento: 'Casa 2',
      });

      const row = await db.EnderecoUsuario.findByPk(addressA1.id);
      assert(row.usuario_id === userA.id, 'usuario_id mudou no update');
      assert(row.logradouro === 'Rua Atualizada', 'logradouro não atualizou');
      assert(row.numero === '200', 'número não atualizou');
      assert(row.bairro === 'Bairro Atualizado', 'bairro não atualizou');
      assert(row.cep === '02002000', 'CEP não atualizou');
      assert(row.complemento === 'Casa 2', 'complemento não atualizou');
      assert(updated.cidade?.estado?.uf === 'TZ' || updated.estado?.uf === 'TZ', 'cidade/estado não continuaram relacionados');
    });

    await test('ENDEREÇO PRINCIPAL mantém apenas um principal por usuário', async () => {
      addressA2 = await enderecoService.criarEndereco(userA.id, addressPayload(2));
      addressA3 = await enderecoService.criarEndereco(userA.id, addressPayload(3));

      await enderecoService.definirEnderecoPrincipal(userA.id, addressA2.id);
      const principalRows = await db.EnderecoUsuario.findAll({
        where: {
          usuario_id: userA.id,
          principal: true,
        },
      });

      assert(principalRows.length === 1, `deveria existir apenas um principal, existem ${principalRows.length}`);
      assert(String(principalRows[0].id) === String(addressA2.id), 'endereço principal incorreto');
    });

    await test('DELETE remove comum e promove outro ao excluir principal', async () => {
      await enderecoService.excluirEndereco(userA.id, addressA3.id);
      const deletedCommon = await db.EnderecoUsuario.findByPk(addressA3.id);
      assert(!deletedCommon, 'endereço comum não foi excluído');

      await enderecoService.excluirEndereco(userA.id, addressA2.id);
      const remaining = await db.EnderecoUsuario.findAll({
        where: { usuario_id: userA.id },
        order: [['id', 'ASC']],
      });
      const principals = remaining.filter((item) => item.principal);

      assert(!remaining.some((item) => String(item.id) === String(addressA2.id)), 'principal excluído ainda existe');
      assert(principals.length === 1, 'deveria promover exatamente um principal');
      assert(String(principals[0].id) === String(addressA1.id), 'principal promovido não é o endereço remanescente esperado');
    });

    await test('SEGURANÇA impede usuário B de alterar dados do usuário A', async () => {
      await expectStatus(enderecoService.atualizarEndereco(userB.id, addressA1.id, addressPayload(8)), 404, 'editar endereço de outro usuário');
      await expectStatus(enderecoService.excluirEndereco(userB.id, addressA1.id), 404, 'excluir endereço de outro usuário');
      await expectStatus(enderecoService.definirEnderecoPrincipal(userB.id, addressA1.id), 404, 'definir principal de outro usuário');

      const listB = await enderecoService.listarEnderecos(userB.id);
      assert(listB.every((item) => item.usuario_id === userB.id), 'listagem do usuário B contém endereço de outro usuário');
    });

    await test('VALIDAÇÕES retornam erro para campos obrigatórios', async () => {
      await expectStatus(enderecoService.criarEndereco('', addressPayload(5)), 401, 'usuário não autenticado');
      await expectStatus(enderecoService.criarEndereco(userA.id, addressPayload(5, { cep: '' })), 400, 'CEP vazio');
      await expectStatus(enderecoService.criarEndereco(userA.id, addressPayload(5, { logradouro: '' })), 400, 'logradouro vazio');
      await expectStatus(enderecoService.criarEndereco(userA.id, addressPayload(5, { numero: '' })), 400, 'número vazio');
      await expectStatus(enderecoService.criarEndereco(userA.id, addressPayload(5, { bairro: '' })), 400, 'bairro vazio');
      await expectStatus(enderecoService.criarEndereco(userA.id, addressPayload(5, { cidade: '' })), 400, 'cidade vazia');
      await expectStatus(enderecoService.criarEndereco(userA.id, addressPayload(5, { cidade: `Cidade Teste ${RUN_ID} Sem Estado`, estado: '' })), 400, 'estado vazio');
    });

    await test('BANCO confirma tabelas e ausência de gravação na tabela antiga', async () => {
      const addressCountAfter = await countRows('enderecos_usuario');
      assert(addressCountAfter >= addressCountBefore, 'enderecos_usuario não respondeu à contagem');

      const [sampleAddress] = await db.sequelize.query('SELECT * FROM enderecos_usuario LIMIT 1', {
        type: db.Sequelize.QueryTypes.SELECT,
      });
      const [sampleCity] = await db.sequelize.query('SELECT * FROM cidades LIMIT 1', {
        type: db.Sequelize.QueryTypes.SELECT,
      });
      const [sampleState] = await db.sequelize.query('SELECT * FROM estados LIMIT 1', {
        type: db.Sequelize.QueryTypes.SELECT,
      });

      assert(sampleAddress || addressCountAfter === 0, 'SELECT * FROM enderecos_usuario falhou');
      assert(sampleCity, 'SELECT * FROM cidades não retornou amostra');
      assert(sampleState, 'SELECT * FROM estados não retornou amostra');

      if (oldTableExists) {
        const oldCountAfter = await countRows('enderecos');
        assert(oldCountAfter === oldCountBefore, 'tabela antiga enderecos teve alteração de contagem');
      }
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await cleanup();
    await db.sequelize.close();
  }

  console.log(`\nAddress CRUD tests: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await cleanup();
    await db.sequelize.close();
  } catch (cleanupError) {
    console.error(cleanupError);
  }
  process.exit(1);
});
