'use strict';

const net = require('net');

const HTTP_VERSION = 1.1;
const CRLF = '\r\n';

function serializeHeaders(obj) {
  return Object
    .keys(obj)
    .map((key) => `${key}: ${obj[key]}`)
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

function parseResponseMessage(responseMessage) {
  const re = /^(.+?)\r\n(.+)?\r\n\r\n(.+)/s;
  const splitted = responseMessage.match(re).slice(1);

  // statuses
  const [ _, statusCode, message ] = splitted.shift().split(' ');

  // headers
  const headers = deserializeHeaders(splitted.shift());

  // body
  const body = splitted.shift();

  return {
    statusCode: Number(statusCode),
    message,
    headers,
    body,
  };
}

function get(uri, options = {}) {
  const url = new URL(uri);

  const headers = serializeHeaders(Object.assign(
    options.headers || {},
    { Host: url.host },
  ));

  const message = [
    `GET ${url.pathname} HTTP/${HTTP_VERSION}`,
    headers,
    '',
    options.body || '',
  ].join(CRLF);

  const client = net.connect(url.port || 80, url.host, () => {
    client.write(message);
  });

  const buffers = [];

  client.on('data', (data) => {
    buffers.push(data);
    client.end();
  });

  return new Promise((resolve, reject) => {
    client.on('end', () => {
      const message = Buffer.concat(buffers).toString();
      resolve(parseResponseMessage(message));
    });

    client.on('error', reject);
  });
}

module.exports = {
  get,
};
