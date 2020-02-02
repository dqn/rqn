# rqn

Simple HTTP client that supports HTTPS, redirect.

## Installation

```sh
$ npm install dqn/rqn
```

## Usage

```js
const rqn = require('rqn');

const options = {
  qs: {
    foo: 'bar',
  },
};

// GET
rqn.get('http://localhost:3000', options).then((res) => {
  console.log(res.statusCode);
  console.log(res.headers);
  console.log(res.body);
});
```

## API

### rqn.get(url[, options])
### rqn.post(url[, options])
### rqn.put(url[, options])
### rqn.delete(url[, options])

- `url`: `string`
- `options`: `Object`
  - `qs`: `Object`
  - `body`: `Object`
  - `form`: `Object`
- Returns: `Promise<Object>`
  - `statusCode`: `number`
  - `headers`: `Object`
  - `body`: `string`

```js
rqn.get('http://localhost:3000', { qs: { foo: 'bar' } }).then((res) => {
  console.log(res.statusCode);
  console.log(res.headers);
  console.log(res.body);
});
```

## License

MIT
