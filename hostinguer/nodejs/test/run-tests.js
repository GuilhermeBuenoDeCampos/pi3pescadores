const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const loadEnv = require('../src/config/loadEnv');
const asyncHandler = require('../src/utils/asyncHandler');
const AppError = require('../src/middlewares/appError');
const errorHandler = require('../src/middlewares/errorHandler');
const notFound = require('../src/middlewares/notFound');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('loadEnv reads values from a file without overriding existing env vars', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi3pescadores-env-'));
  const envFile = path.join(tmpDir, '.env.test');

  const previous = {
    TEST_ALPHA: process.env.TEST_ALPHA,
    TEST_BETA: process.env.TEST_BETA,
    TEST_EXISTING: process.env.TEST_EXISTING,
  };

  try {
    fs.writeFileSync(
      envFile,
      [
        '# sample env file',
        'TEST_ALPHA=alpha',
        'TEST_BETA="beta value"',
        'TEST_EXISTING=should-not-replace',
        'INVALID_LINE',
        '',
      ].join('\n'),
      'utf8'
    );

    delete process.env.TEST_ALPHA;
    delete process.env.TEST_BETA;
    process.env.TEST_EXISTING = 'keep-this';

    loadEnv(envFile);

    assert.equal(process.env.TEST_ALPHA, 'alpha');
    assert.equal(process.env.TEST_BETA, 'beta value');
    assert.equal(process.env.TEST_EXISTING, 'keep-this');
  } finally {
    if (previous.TEST_ALPHA === undefined) {
      delete process.env.TEST_ALPHA;
    } else {
      process.env.TEST_ALPHA = previous.TEST_ALPHA;
    }

    if (previous.TEST_BETA === undefined) {
      delete process.env.TEST_BETA;
    } else {
      process.env.TEST_BETA = previous.TEST_BETA;
    }

    if (previous.TEST_EXISTING === undefined) {
      delete process.env.TEST_EXISTING;
    } else {
      process.env.TEST_EXISTING = previous.TEST_EXISTING;
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('asyncHandler forwards rejected promises to next', async () => {
  const expectedError = new Error('boom');
  const wrapped = asyncHandler(async () => {
    throw expectedError;
  });

  let receivedError = null;

  await new Promise((resolve) => {
    wrapped({}, {}, (error) => {
      receivedError = error;
      resolve();
    });
  });

  assert.equal(receivedError, expectedError);
});

test('AppError stores status and message', () => {
  const error = new AppError(404, 'Route not found');

  assert.equal(error.name, 'AppError');
  assert.equal(error.statusCode, 404);
  assert.equal(error.message, 'Route not found');
});

test('notFound creates a 404 AppError', () => {
  let receivedError = null;

  notFound({}, {}, (error) => {
    receivedError = error;
  });

  assert.ok(receivedError instanceof AppError);
  assert.equal(receivedError.statusCode, 404);
  assert.equal(receivedError.message, 'Route not found');
});

test('errorHandler returns AppError details without logging', () => {
  const originalConsoleError = console.error;
  let logged = false;
  console.error = () => {
    logged = true;
  };

  try {
    const res = createResponse();

    errorHandler(new AppError(400, 'Invalid payload'), {}, res, () => {});

    assert.equal(logged, false);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      error: {
        message: 'Invalid payload',
      },
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test('errorHandler maps unexpected errors to 500', () => {
  const originalConsoleError = console.error;
  let loggedError = null;
  console.error = (error) => {
    loggedError = error;
  };

  try {
    const res = createResponse();
    const unexpectedError = new Error('unexpected');

    errorHandler(unexpectedError, {}, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
      error: {
        message: 'Unexpected server error',
      },
    });
    assert.equal(loggedError, unexpectedError);
  } finally {
    console.error = originalConsoleError;
  }
});

test('errorHandler delegates to next when headers are already sent', () => {
  const expectedError = new Error('already sent');
  let nextError = null;

  const result = errorHandler(expectedError, {}, { headersSent: true }, (error) => {
    nextError = error;
    return 'next-result';
  });

  assert.equal(result, 'next-result');
  assert.equal(nextError, expectedError);
});

async function run() {
  let passed = 0;
  let failed = 0;

  for (const currentTest of tests) {
    try {
      await currentTest.fn();
      passed += 1;
      console.log(`\u2713 ${currentTest.name}`);
    } catch (error) {
      failed += 1;
      console.error(`\u2717 ${currentTest.name}`);
      console.error(error);
    }
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Test runner failed');
  console.error(error);
  process.exitCode = 1;
});
