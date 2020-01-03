'use strict';

const net = require('net');

const { buildRequestMessage, parseResponseMessage } = require('./lib/common');

function get(uri, options = {}) {
  const url = new URL(uri);
  const message = buildRequestMessage('GET', url, options);

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
      const message = Buffer.concat(buffers).toString();
      resolve(parseResponseMessage(message));
    });

    client.on('error', reject);
  });
}

function post(uri, options = {}) {
  const url = new URL(uri);
  console.log(options);
  const message = buildRequestMessage('POST', url, options);

  console.log(message);

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
      const message = Buffer.concat(buffers).toString();
      resolve(parseResponseMessage(message));
    });

    client.on('error', reject);
  });
}

module.exports = {
  get,
  post,
};
