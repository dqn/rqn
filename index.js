'use strict';

const net = require('net');

function parseResponseMessage(responseMessage) {
  const re = /^(.+?)\r\n(.+)?\r\n\r\n(.+)/s;
  const splitted = responseMessage.match(re).slice(1);

  // statuses
  const [ _, statusCode, message ] = splitted.shift().split(' ');

  // headers
  const headers = {};
  for (const row of splitted.shift().split('\r\n')) {
    const [ key, value ] = row.split(': ');
    headers[key] = value;
  }

  // body
  const body = splitted.shift();

  return {
    statusCode: Number(statusCode),
    message,
    headers,
    body,
  };
}

function get(uri) {
  const url = new URL(uri);

  const client = net.connect((url.port || 80), url.host, () => {
    const message = `GET ${url.pathname} HTTP/1.1\r\nHost:${url.host}\r\n\r\n`;
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
