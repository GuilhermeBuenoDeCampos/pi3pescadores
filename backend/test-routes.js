const routes = require('./src/routes');

console.log('Routes module type:', typeof routes);
console.log('Routes is Router:', routes.constructor?.name);

function listRoutes(stack, prefix) {
  stack.forEach((layer) => {
    if (layer.route) {
      console.log(`  ${prefix}${layer.route.path} [${Object.keys(layer.route.methods).join(',')}]`);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const routerPath = layer.regexp.source
        .replace(/\\\//g, '/')
        .replace(/\^/g, '')
        .replace(/\/\?\(\?=\/\|\$\)/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\?\(\?=\/\|\$\)/g, '')
        .replace(/\\/g, '');
      listRoutes(layer.handle.stack, prefix + routerPath);
    } else if (layer.name === 'bound dispatch' && layer.handle?.stack) {
      listRoutes(layer.handle.stack, prefix);
    }
  });
}

listRoutes(routes.stack, '/api');
