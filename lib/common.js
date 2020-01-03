'use strict';

const CRLF = '\r\n';
const HTTP_VERSION = 1.1;

function serializeQueryParams(obj) {
  return Object
    .keys(obj)
    .map((key) => `${key}=${encodeURIComponent(obj[key])}`)
    .join('&');
}

function deserializeQueryParams(str) {
  return str
    .trim()
    .split('&')
    .reduce((params, kv) => {
      const [ key, value ] = kv.split('=');
      params[key] = decodeURIComponent(value);
      return params;
    }, {});
}

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

function buildRequestMessage(method, url, options) {
  options.headers = Object.assign(
    options.headers || {},
    { Host: url.hostname },
  );

  if (options.form) {
    options.body = serializeQueryParams(options.form);
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.headers['Content-Length'] = Buffer.byteLength(options.body);
  }

  const headers = serializeHeaders(options.headers);

  return [
    `${method} ${url.pathname} HTTP/${HTTP_VERSION}`,
    headers,
    '',
    options.body || '',
  ].join(CRLF);
}

function parseResponseMessage(responseMessage) {
  const re = /^(.+?)\r\n(.+)?\r\n\r\n(.+)/s;
  const splitted = responseMessage.match(re).slice(1);

  const [ _, statusCode, message ] = splitted.shift().split(' ');
  const headers = deserializeHeaders(splitted.shift());
  const body = splitted.shift();

  return {
    statusCode: Number(statusCode),
    message,
    headers,
    body,
  };
}

module.exports = {
  CRLF,
  HTTP_VERSION,
  buildRequestMessage,
  parseResponseMessage,
};
