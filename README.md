# rqn

Original HTTP client that supports HTTPS.

## Installation

```sh
$ npm install dqn/rqn
```

## Usage

```js
const rqn = require('rqn');

// GET
rqn.get('http://localhost:3000').then((res) => {
  console.log(res.statusCode);
  console.log(res.headers);
  console.log(res.body);
});
```
