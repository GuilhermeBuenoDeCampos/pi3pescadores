const app = require('./src/app');
const list = [];
app._router.stack.forEach((m) => {
  if (m.route) {
    list.push('DIRECT: ' + m.route.path);
  }
  if (m.handle && m.handle.stack) {
    let base = m.regexp.source;
    base = base
      .replace(/\\\//g, '/')
      .replace(/\^/g, '')
      .replace(/\/\$\//, '/')
      .replace(/\\\/\?/g, '/')
      .replace(/\?\(\?=\/\|\\\.\)/g, '')
      .replace(/\?\(\?=\/\|\$\)/g, '')
      .replace(/\\(.)/g, '$1');
    m.handle.stack.forEach((r) => {
      if (r.route) {
        list.push(base + (r.route.path.startsWith('/') ? '' : '/') + r.route.path);
      }
    });
  }
});
console.log(JSON.stringify(list, null, 2));
