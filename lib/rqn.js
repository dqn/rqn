'use strict';

const net = require('net');
const tls = require('tls');

const { buildRequestMessage, ResponseParser } = require('./utils');

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
      return socketModule
        .connect(options, connectionListener)
        .setEncoding('utf8');
    },
  };
}

async function request(method, url, options) {
  url = new URL(url);
  const socket = makeSocket(url);
  const message = buildRequestMessage(method, url, options);

  const client = socket.connect(() => {
    client.write(message);
  });

  const response = await new ResponseParser(client).parse();

  if (response.headers['Location']) {
    return request(method, response.headers['Location'], options);
  }

  return response;
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
