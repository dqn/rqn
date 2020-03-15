'use strict';

const CRLF = '\r\n';
const HTTP_VERSION = 1.1;

function splitOnlyOnce(str, delimiter) {
  const indexToSplit = str.indexOf(delimiter);
  const first = str.slice(0, indexToSplit);
  const second = str.slice(indexToSplit + delimiter.length);

  return [ first, second ];
}

function buildQueryParams(obj) {
  return Object
    .entries(obj)
    .map(([ key, value ]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

function buildHeaders(obj) {
  return Object
    .entries(obj)
    .map(([ key, value ]) => `${key}: ${value}`)
    .join(CRLF);
}

function parseHeaders(str) {
  return str
    .trim()
    .split(CRLF)
    .reduce((headers, row) => {
      const [ key, value ] = splitOnlyOnce(row, ':');
      headers[key] = value.trimLeft();
      return headers;
    }, {});
}

function buildRequestMessage(method, url, options = {}) {
  const headers = { Host: url.hostname, ...(options.headers || {}) };
  let body = '';
  let qs = url.search;

  if (options.qs) {
    qs = '?' + buildQueryParams(options.qs);
  }

  if (options.body) {
    body = options.body;
    headers['Content-Type'] = 'text/plain';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  if (options.form) {
    body = buildQueryParams(options.form);
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
    buildHeaders(headers),
    '',
    body,
  ].join(CRLF);
}

function parseInitialResponse(union) {
  const [ statusAndHeaders, body ] = splitOnlyOnce(union, CRLF + CRLF);
  const splitted = splitOnlyOnce(statusAndHeaders, CRLF);
  const statusCode = Number(splitted[0].match(/\d{3}/)[0]);
  const headers = parseHeaders(splitted[1]);

  return { statusCode, headers, body };
}

function sliceTextByByte(text, byte) {
  return Buffer.from(text).slice(0, byte).toString();
}

class ResponseParser {
  constructor(client) {
    this.client = client;
  }

  onData(data) {
    if (!this.response) {
      this.response = parseInitialResponse(data);

      if (this.response.headers['Content-Length']) {
        this.contentLength = Number(this.response.headers['Content-Length']);
        this.parser = this.parseUsingContentLength;
      } else if (this.response.headers['Transfer-Encoding'] === 'chunked') {
        this.remainingBytes = 0;
        this.parser = this.parseUsingChunked;
      } else {
        this.client.end();
        return;
      }

      data = this.response.body;
      this.response.body = '';
    }

    this.parser(data);
  }

  parseUsingContentLength(data) {
    this.response.body += data;

    if (this.contentLength === Buffer.byteLength(this.response.body)) {
      this.client.end();
    }
  }

  parseUsingChunked(data) {
    if (this.remainingBytes === 0) {
      const splitted = splitOnlyOnce(data, CRLF);
      this.remainingBytes = Number.parseInt(splitted[0], 16);

      if (this.remainingBytes === 0) {
        this.client.end();
        return;
      }

      data = splitted[1];
    }

    const sliced = sliceTextByByte(data, this.remainingBytes);
    data = data.slice(sliced.length);

    this.response.body += sliced;
    this.remainingBytes -= Buffer.byteLength(sliced);

    if (this.remainingBytes === 0) {
      data = data.slice(CRLF.length);
    }

    if (data.length) {
      this.parseUsingChunked(data);
    }
  }

  parse() {
    return new Promise((resolve, reject) => {
      this.client.on('data', this.onData.bind(this));
      this.client.on('end', () => resolve(this.response));
      this.client.on('error', reject);
    });
  }
}

module.exports = {
  buildRequestMessage,
  ResponseParser,
};