import net from 'net';
import tls from 'tls';

const CRLF = '\r\n';
const HTTP_VERSION = 1.1;

export type RequestParamValue =
  | { [key: string]: RequestParamValue }
  | RequestParamValue[]
  | null
  | string
  | number
  | boolean;

export type RequestParam = { [key: string]: RequestParamValue };

export type RqnRequestOptions = {
  headers?: Headers;
  body?: string;
  qs?: RequestParam;
  form?: RequestParam;
  json?: RequestParam;
};

export type RqnResponse = {
  statusCode: number;
  headers: Headers;
  body: string;
};

export type Headers = { [key: string]: string };

function splitOnce(str: string, splitter: string): string[] {
  const indexToSplit = str.indexOf(splitter);
  const first = str.slice(0, indexToSplit);
  const second = str.slice(indexToSplit + splitter.length);

  return [first, second];
}

function stringifyQueryParams(obj: RequestParam): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${encodeURIComponent(value?.toString() ?? 'null')}`)
    .join('&');
}

function stringifyHeaders(obj: Headers): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}: ${value}`)
    .join(CRLF);
}

function parseHeaders(str: string): Headers {
  return str
    .trim()
    .split(CRLF)
    .reduce<Headers>((headers, row) => {
      const [key, value] = splitOnce(row, ':');
      headers[key] = value.trimLeft();
      return headers;
    }, {});
}

function buildRequestMessage(method: string, url: URL, options?: RqnRequestOptions): string {
  options = options ?? {};

  const headers: Headers = { Host: url.hostname };
  let body = '';
  let qs = url.search;

  if (options.qs) {
    qs = '?' + stringifyQueryParams(options.qs);
  }

  if (options.body !== void 0) {
    body = options.body;
    headers['Content-Type'] = 'text/plain';
    headers['Content-Length'] = Buffer.byteLength(body).toString();
  } else if (options.form) {
    body = stringifyQueryParams(options.form);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Content-Length'] = Buffer.byteLength(body).toString();
  } else if (options.json) {
    body = JSON.stringify(options.json);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body).toString();
  }

  const startLine = `${method} ${url.pathname}${qs} HTTP/${HTTP_VERSION}`;
  const stringifiedHeaders = stringifyHeaders({ ...headers, ...(options.headers ?? {}) });

  return [startLine, stringifiedHeaders, '', body].join(CRLF);
}

function parseInitialResponse(data: string): RqnResponse {
  const [statusLineAndHeaders, body] = splitOnce(data, CRLF + CRLF);
  const [statusLine, headers] = splitOnce(statusLineAndHeaders, CRLF);
  const [_, statusCode] = statusLine.split(' ');

  return { statusCode: Number(statusCode), headers: parseHeaders(headers), body };
}

function sliceTextByByte(text: string, byte: number): string {
  return Buffer.from(text).slice(0, byte).toString();
}

function connect(url: URL, connectListener: () => void): net.Socket {
  switch (url.protocol) {
    case 'http:': {
      const options = {
        host: url.hostname,
        port: Number(url.port) || 80,
      };

      return net.connect(options, connectListener).setEncoding('utf8');
    }
    case 'https:': {
      const options = {
        host: url.hostname,
        port: Number(url.port) || 443,
        rejectUnauthorized: false,
      };

      return tls.connect(options, connectListener).setEncoding('utf8');
    }

    default:
      throw new Error(`Invalid protocol: ${url.protocol}`);
  }
}

function processResponse(socket: net.Socket): Promise<RqnResponse> {
  let response: RqnResponse | null = null;
  let remainingBytes = 0;
  let contentLength = 0;
  let parser = (data: string) => {};

  const onData = (data: string) => {
    if (!response) {
      response = parseInitialResponse(data);

      if (response.headers['Content-Length']) {
        contentLength = Number(response.headers['Content-Length']);
        parser = parseUsingContentLength;
      } else if (response.headers['Transfer-Encoding'] === 'chunked') {
        remainingBytes = 0;
        parser = parseUsingChunked;
      } else {
        socket.end();
        return;
      }

      data = response.body;
      response.body = '';
    }

    parser(data);
  };

  const parseUsingContentLength = (data: string) => {
    response!.body += data;

    if (contentLength === Buffer.byteLength(response!.body)) {
      socket.end();
    }
  };

  const parseUsingChunked = (data: string) => {
    if (remainingBytes === 0) {
      const splitted = splitOnce(data, CRLF);
      remainingBytes = Number.parseInt(splitted[0], 16);

      if (remainingBytes === 0) {
        socket.end();
        return;
      }

      data = splitted[1];
    }

    const sliced = sliceTextByByte(data, remainingBytes);
    data = data.slice(sliced.length);

    response!.body += sliced;
    remainingBytes -= Buffer.byteLength(sliced);

    if (remainingBytes === 0) {
      data = data.slice(CRLF.length);
    }

    if (data.length) {
      parseUsingChunked(data);
    }
  };

  return new Promise((resolve, reject) => {
    socket.on('data', onData);
    socket.on('end', () => resolve(response!));
    socket.on('error', reject);
  });
}

async function request(
  method: string,
  url: string,
  options?: RqnRequestOptions,
): Promise<RqnResponse> {
  const parsedUrl = new URL(url);

  const message = buildRequestMessage(method, parsedUrl, options);
  const socket = connect(parsedUrl, () => socket.write(message));

  const response = await processResponse(socket);

  if (response.headers['Location']) {
    return request(method, response.headers['Location'], options);
  }

  return response;
}

export function get(url: string, options?: RqnRequestOptions) {
  return request('GET', url, options);
}

export function post(url: string, options?: RqnRequestOptions) {
  return request('POST', url, options);
}

export function put(url: string, options?: RqnRequestOptions) {
  return request('PUT', url, options);
}

export function _delete(url: string, options?: RqnRequestOptions) {
  return request('DELETE', url, options);
}
