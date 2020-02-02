'use strict';

const rqn = require('..');

describe('get', () => {
  test('get', async () => {
    const res = await rqn.get('https://api.github.com/users');
    console.log(res);
    expect(1 + 1).toBe(2);
  });
});
