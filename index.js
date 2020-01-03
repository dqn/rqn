'use strict';

const net = require('net');
const tls = require('tls');
const { buildRequestMessage, parseResponseMessage } = require('./lib/util');

function isSecure(protocol) {
  switch (protocol) {
    case 'http:':
      return false;
    case 'https:':
      return true;
    default:
      throw new Error(`Invalid protocol: ${protocol}`);
  }
}

function makeSocketConfig(url) {
  let socketModule = null;
  const socketOptions = { host: url.hostname };

  if (isSecure(url.protocol)) {
    socketModule = tls;
    socketOptions.port = url.port || 443;
    socketOptions.rejectUnauthorized = false;
  } else {
    socketModule = net;
    socketOptions.port = url.port || 80;
  }

  return { socketModule, socketOptions };
}

function request(method, uri, options) {
  const url = new URL(uri);
  const { socketModule, socketOptions } = makeSocketConfig(url);
  const message = buildRequestMessage(method, url, options);

  const client = socketModule.connect(socketOptions, () => {
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
