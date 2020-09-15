# rqn

[![npm version](https://img.shields.io/npm/v/rqn.svg)](https://www.npmjs.com/package/rqn)
[![Build Status](https://travis-ci.com/dqn/rqn.svg?branch=master)](https://travis-ci.com/dqn/rqn)
[![codecov](https://codecov.io/gh/dqn/rqn/branch/master/graph/badge.svg)](https://codecov.io/gh/dqn/rqn)

Toy HTTP(S) client.

## Installation

```sh
$ npm install rqn
```

## Example usage

```js
const rqn = require('rqn');

const options = {
  qs: {
    foo: 'bar',
  },
};

rqn.get('https://example.com', { qs: { foo: 'bar' } }).then((res) => {
  console.log(res.statusCode);
  console.log(res.headers);
  console.log(res.body);
});
```

## API

### rqn.request(method, url[, options])

```js
rqn.request('GET', 'https://example.com');
```

### rqn.get(url[, options])

```js
rqn.get('https://example.com');
```

With query parameters:

```js
rqn.get('https://example.com', { qs: { foo: 'bar' } });
```

### rqn.post(url[, options])

Post as JSON:

```js
rqn.post('https://example.com', { json: { foo: 'bar' } });
```

Post as Form:

```js
rqn.post('https://example.com', { form: { foo: 'bar' } });
```

Post as raw body:

```js
rqn.post('https://example.com', { body: 'foobar' });
```

### rqn.put(url[, options])

```js
rqn.put('https://example.com', { /* ... */ });
```

### rqn.delete(url[, options])

```js
rqn.delete('https://example.com');
```

## License

MIT
