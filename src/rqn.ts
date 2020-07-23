import net from 'net';
import tls from 'tls';

const CRLF = '\r\n';
const HTTP_VERSION = 1.1;

export type HttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';

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

function buildRequestMessage(method: HttpMethod, url: URL, options?: RqnRequestOptions): string {
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

function splitOnce(str: string, splitter: string): string[] {
  const indexToSplit = str.indexOf(splitter);
  const first = str.slice(0, indexToSplit);
  const second = str.slice(indexToSplit + splitter.length);

  return [first, second];
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

function sliceTextByByte(text: string, byte: number): string {
  return Buffer.from(text).slice(0, byte).toString();
}

function parseInitialResponse(data: string): RqnResponse {
  const [statusLineAndHeaders, body] = splitOnce(data, CRLF + CRLF);
  const [statusLine, headers] = splitOnce(statusLineAndHeaders, CRLF);
  const [_, statusCode] = statusLine.split(' ');

  return { statusCode: Number(statusCode), headers: parseHeaders(headers), body };
}

function processResponse(socket: net.Socket): Promise<RqnResponse> {
  let response: RqnResponse | null = null;
  let remainingBytes = 0;
  let contentLength = 0;
  let parseData = (_data: string) => {};

  const handleData = (data: string) => {
    if (!response) {
      // for initial response
      response = parseInitialResponse(data);

      if (response.headers['Content-Length']) {
        contentLength = Number(response.headers['Content-Length']);
        parseData = parseUsingContentLength;
      } else if (response.headers['Transfer-Encoding'] === 'chunked') {
        remainingBytes = 0;
        parseData = parseUsingChunked;
      } else {
        socket.end();
        return;
      }

      data = response.body;
      response.body = '';
    }

    parseData(data);
  };

  const parseUsingContentLength = (data: string) => {
    if (!response) {
      return;
    }

    response.body += data;

    if (contentLength === Buffer.byteLength(response.body)) {
      socket.end();
    }
  };

  const parseUsingChunked = (data: string) => {
    if (!response) {
      return;
    }

    if (remainingBytes === 0) {
      const [remainingBytesStr, nextData] = splitOnce(data, CRLF);
      remainingBytes = Number.parseInt(remainingBytesStr, 16);

      if (remainingBytes === 0) {
        socket.end();
        return;
      }

      data = nextData;
    }

    const sliced = sliceTextByByte(data, remainingBytes);
    data = data.slice(sliced.length);

    response.body += sliced;
    remainingBytes -= Buffer.byteLength(sliced);

    if (remainingBytes === 0) {
      data = data.slice(CRLF.length);
    }

    if (data.length) {
      parseUsingChunked(data);
    }
  };

  return new Promise((resolve, reject) => {
    socket.on('data', (data: Buffer) => handleData(data.toString()));
    socket.on('end', () => response && resolve(response));
    socket.on('error', reject);
  });
}

function connect(url: URL, connectListener: () => void): net.Socket {
  switch (url.protocol) {
    case 'http:': {
      const options = {
        host: url.hostname,
        port: Number(url.port) || 80,
      };

      return net.connect(options, connectListener);
    }
    case 'https:': {
      const options = {
        host: url.hostname,
        port: Number(url.port) || 443,
        rejectUnauthorized: false,
      };

      return tls.connect(options, connectListener);
    }
    default:
      throw new Error(`Invalid protocol: ${url.protocol}`);
  }
}

export async function request(
  method: HttpMethod,
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

function _get(url: string, options?: RqnRequestOptions) {
  return request('GET', url, options);
}

function _post(url: string, options?: RqnRequestOptions) {
  return request('POST', url, options);
}

function _put(url: string, options?: RqnRequestOptions) {
  return request('PUT', url, options);
}

function _delete(url: string, options?: RqnRequestOptions) {
  return request('DELETE', url, options);
}

export { _get as get, _post as post, _put as put, _delete as delete };
