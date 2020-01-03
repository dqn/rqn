'use strict';

const net = require('net');
const { buildRequestMessage, parseResponseMessage } = require('./lib/util');

function request(method, uri, options) {
  const url = new URL(uri);
  const message = buildRequestMessage(method, url, options);

  const client = net.connect(url.port || 80, url.hostname, () => {
    client.write(message);
  });

  const buffers = [];

  client.on('data', (data) => {
    buffers.push(data);
    client.end();
  });

  return new Promise((resolve, reject) => {
    client.on('end', () => {
      const response = parseResponseMessage(Buffer.concat(buffers).toString());
      resolve(response);
    });

    client.on('error', reject);
  });
}

function get(uri, options = {}) {
  return request('GET', uri, options);
}

function post(uri, options = {}) {
  return request('POST', uri, options);
}

module.exports = {
  get,
  post,
};
