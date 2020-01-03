'use strict';

const CRLF = '\r\n';
const HTTP_VERSION = 1.1;

function serializeQueryParams(obj) {
  return Object
    .entries(obj)
    .map(([ key, value ]) => `${key}=${encodeURIComponent(value)}`)
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

function buildRequestMessage(method, url, options) {
  const headers = Object.assign(
    { Host: url.hostname },
    options.headers || {},
  );
  let body = '';
  let qs = url.search;

  if (options.qs) {
    qs = '?' + serializeQueryParams(options.qs);
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

module.exports = {
  CRLF,
  HTTP_VERSION,
  buildRequestMessage,
  parseResponseMessage,
};
