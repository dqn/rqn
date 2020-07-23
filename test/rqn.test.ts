import express from 'express';
import { Server } from 'http';

import * as rqn from '../src/rqn';

let server: Server;

beforeAll(() => {
  const app = express();

  app.use(express.text());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    res.send('test: GET');
  });

  app.post('/', (req, res) => {
    res.send('test: POST');
  });

  app.put('/', (req, res) => {
    res.send('test: PUT');
  });

  app.delete('/', (req, res) => {
    res.send('test: DELETE');
  });

  app.get('/headers', (req, res) => {
    res.json(req.headers);
  });

  app.get('/qs', (req, res) => {
    res.json(req.query);
  });

  app.post('/body', (req, res) => {
    res.send(req.body);
  });

  app.post('/form', (req, res) => {
    res.json(req.body);
  });

  app.put('/json', (req, res) => {
    res.json(req.body);
  });

  app.get('/redirect', (req, res) => {
    res.redirect('http://localhost:3000');
  });

  app.get('/chunked', (req, res) => {
    res.write('fizz');
    res.write('bazz');
    res.end();
  });

  server = app.listen(3000);
});

afterAll(() => {
  server.close();
});

describe('get', () => {
  test('normal', async () => {
    const res = await rqn.get('http://localhost:3000');

    expect(res.statusCode).toBe(200);
    expect(res.headers).toBeDefined();
    expect(res.body).toBe('test: GET');
  });

  test('with headers', async () => {
    const res = await rqn.get('http://localhost:3000/headers', {
      headers: { foo: 'bar' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"host":"localhost","foo":"bar"}');
  });

  test('with qs', async () => {
    const res = await rqn.get('http://localhost:3000/qs', {
      qs: { foo: 'bar' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"foo":"bar"}');
  });

  test('with body', async () => {
    const res = await rqn.post('http://localhost:3000/body', {
      body: 'fizzbazz',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('fizzbazz');
  });

  test('with form', async () => {
    const res = await rqn.post('http://localhost:3000/form', {
      form: { foo: 'bar' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"foo":"bar"}');
  });

  test('with put', async () => {
    const res = await rqn.put('http://localhost:3000/json', {
      json: { foo: 'bar' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"foo":"bar"}');
  });

  test('redirect', async () => {
    const res = await rqn.get('http://localhost:3000/redirect');

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('test: GET');
  });

  test('https', async () => {
    const res = await rqn.get('https://api.github.com', {
      headers: { 'User-Agent': 'rqn' },
    });

    expect(res.statusCode).toBe(200);
  });

  test('default port', async () => {
    const res = await rqn.get('http://api.github.com', {
      headers: { 'User-Agent': 'rqn' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers).toBeDefined();
    expect(res.body).toBeDefined();
  });

  test('chunked', async () => {
    const res = await rqn.get('http://localhost:3000/chunked');

    expect(res.statusCode).toBe(200);
    expect(res.headers).toBeDefined();
    expect(res.body).toBeDefined();
  });

  test('ws', () => {
    const p = rqn.get('ws://localhost:3000');

    expect(p).rejects.toThrowError('Invalid protocol');
  });
});

describe('post', () => {
  test('normal', async () => {
    const res = await rqn.post('http://localhost:3000');

    expect(res.statusCode).toBe(200);
    expect(res.headers).toBeDefined();
    expect(res.body).toBe('test: POST');
  });
});

describe('put', () => {
  test('normal', async () => {
    const res = await rqn.put('http://localhost:3000');

    expect(res.statusCode).toBe(200);
    expect(res.headers).toBeDefined();
    expect(res.body).toBe('test: PUT');
  });
});

describe('delete', () => {
  test('normal', async () => {
    const res = await rqn._delete('http://localhost:3000');

    expect(res.statusCode).toBe(200);
    expect(res.headers).toBeDefined();
    expect(res.body).toBe('test: DELETE');
  });
});
