'use strict';

const net = require('net');
const tls = require('tls');

const CRLF = '\r\n';
const HTTP_VERSION = 1.1;

function serializeQueryParams(obj) {
  return Object
    .entries(obj)
    .map(([ key, value ]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

function serializeHeaders(obj) {
  return Object
    .entries(obj)
    .map(([ key, value ]) => `${key}: ${value}`)
    .join(CRLF);
}

function deserializeHeaders(str) {
  return str
    .trim()
    .split(CRLF)
    .reduce((headers, row) => {
      const [ key, value ] = row.split(':');
      headers[key] = value.trimLeft();
      return headers;
    }, {});
}

function buildRequestMessage(method, url, options = {}) {
  const headers = { Host: url.hostname, ...(options.headers || {}) };
  let body = '';
  let qs = url.search;

  if (options.qs) {
    qs = '?' + serializeQueryParams(options.qs);
  }

  if (options.body) {
    body = options.body;
    headers['Content-Type'] = 'text/plain';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  if (options.form) {
    body = serializeQueryParams(options.form);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  if (options.json) {
    body = JSON.stringify(options.json);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  return [
    `${method} ${url.pathname}${qs} HTTP/${HTTP_VERSION}`,
    serializeHeaders(headers),
    '',
    body,
  ].join(CRLF);
}

function parseResponseMessage(responseMessage) {
  const splitted = responseMessage.match(/^(.+?)\r\n(.+?)\r\n\r\n(.+)/s).slice(1);

  const [ statusCode, message ] = splitted.shift().match(/^.+? (.+?) (.+)/).slice(1);
  const headers = deserializeHeaders(splitted.shift());
  const body = splitted.shift();

  return {
    statusCode: Number(statusCode),
    message,
    headers,
    body,
  };
}

function makeSocket(url) {
  let socketModule = null;
  const options = { host: url.hostname };

  switch (url.protocol) {
    case 'http:':
      socketModule = net;
      options.port = url.port || 80;
      break;

    case 'https:':
      socketModule = tls;
      options.port = url.port || 443;
      options.rejectUnauthorized = false;
      break;

    default:
      throw new Error(`Invalid protocol: ${protocol}`);
  }

  return {
    connect(connectionListener) {
      return socketModule.connect(options, connectionListener);
    },
  };
}

function splitIntoHeadersAndBody(union) {
  const blankLine = '\r\n\r\n';
  console.log(blankLine.length);
  const indexToSplit = union.indexOf(blankLine);
  const headers = union.slice(0, indexToSplit);
  const body = union.slice(indexToSplit + blankLine.length);

  return { headers, body };
}

function request(method, uri, options) {
  const url = new URL(uri);
  const socket = makeSocket(url);
  const message = buildRequestMessage(method, url, options);

  const client = socket.connect(() => {
    client.write(message);
  });

  const buffers = [];

  client.on('data', (data) => {
    // console.log(data.toString());
    // console.log(splitIntoHeadersAndBody(data.toString()));
    // client.on('data', (data) => {});
    buffers.push(data);
    client.end();
  });

  return new Promise((resolve, reject) => {
    client.on('end', () => {
      const response = parseResponseMessage(Buffer.concat(buffers).toString());
      console.log(Buffer.concat(buffers).toString());
      resolve(response);
    });

    client.on('error', reject);
  });
}

function get(...args) {
  return request('GET', ...args);
}

function post(...args) {
  return request('POST', ...args);
}

function put(...args) {
  return request('PUT', ...args);
}

function _delete(...args) {
  return request('DELETE', ...args);
}

module.exports = {
  get,
  post,
  put,
  delete: _delete,
};
