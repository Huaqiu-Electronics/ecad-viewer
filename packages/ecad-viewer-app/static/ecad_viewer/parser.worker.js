var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../node_modules/comlink/dist/esm/comlink.mjs
var proxyMarker = /* @__PURE__ */ Symbol("Comlink.proxy");
var createEndpoint = /* @__PURE__ */ Symbol("Comlink.endpoint");
var releaseProxy = /* @__PURE__ */ Symbol("Comlink.releaseProxy");
var finalizer = /* @__PURE__ */ Symbol("Comlink.finalizer");
var throwMarker = /* @__PURE__ */ Symbol("Comlink.thrown");
var isObject = /* @__PURE__ */ __name((val) => typeof val === "object" && val !== null || typeof val === "function", "isObject");
var proxyTransferHandler = {
  canHandle: /* @__PURE__ */ __name((val) => isObject(val) && val[proxyMarker], "canHandle"),
  serialize(obj) {
    const { port1, port2 } = new MessageChannel();
    expose(obj, port1);
    return [port2, [port2]];
  },
  deserialize(port) {
    port.start();
    return wrap(port);
  }
};
var throwTransferHandler = {
  canHandle: /* @__PURE__ */ __name((value) => isObject(value) && throwMarker in value, "canHandle"),
  serialize({ value }) {
    let serialized;
    if (value instanceof Error) {
      serialized = {
        isError: true,
        value: {
          message: value.message,
          name: value.name,
          stack: value.stack
        }
      };
    } else {
      serialized = { isError: false, value };
    }
    return [serialized, []];
  },
  deserialize(serialized) {
    if (serialized.isError) {
      throw Object.assign(new Error(serialized.value.message), serialized.value);
    }
    throw serialized.value;
  }
};
var transferHandlers = /* @__PURE__ */ new Map([
  ["proxy", proxyTransferHandler],
  ["throw", throwTransferHandler]
]);
function isAllowedOrigin(allowedOrigins, origin) {
  for (const allowedOrigin of allowedOrigins) {
    if (origin === allowedOrigin || allowedOrigin === "*") {
      return true;
    }
    if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
      return true;
    }
  }
  return false;
}
__name(isAllowedOrigin, "isAllowedOrigin");
function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
  ep.addEventListener("message", /* @__PURE__ */ __name(function callback(ev) {
    if (!ev || !ev.data) {
      return;
    }
    if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
      console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
      return;
    }
    const { id, type, path } = Object.assign({ path: [] }, ev.data);
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;
    try {
      const parent = path.slice(0, -1).reduce((obj2, prop) => obj2[prop], obj);
      const rawValue = path.reduce((obj2, prop) => obj2[prop], obj);
      switch (type) {
        case "GET":
          {
            returnValue = rawValue;
          }
          break;
        case "SET":
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;
        case "APPLY":
          {
            returnValue = rawValue.apply(parent, argumentList);
          }
          break;
        case "CONSTRUCT":
          {
            const value = new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;
        case "ENDPOINT":
          {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
          }
          break;
        case "RELEASE":
          {
            returnValue = void 0;
          }
          break;
        default:
          return;
      }
    } catch (value) {
      returnValue = { value, [throwMarker]: 0 };
    }
    Promise.resolve(returnValue).catch((value) => {
      return { value, [throwMarker]: 0 };
    }).then((returnValue2) => {
      const [wireValue, transferables] = toWireValue(returnValue2);
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
      if (type === "RELEASE") {
        ep.removeEventListener("message", callback);
        closeEndPoint(ep);
        if (finalizer in obj && typeof obj[finalizer] === "function") {
          obj[finalizer]();
        }
      }
    }).catch((error) => {
      const [wireValue, transferables] = toWireValue({
        value: new TypeError("Unserializable return value"),
        [throwMarker]: 0
      });
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
    });
  }, "callback"));
  if (ep.start) {
    ep.start();
  }
}
__name(expose, "expose");
function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}
__name(isMessagePort, "isMessagePort");
function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint))
    endpoint.close();
}
__name(closeEndPoint, "closeEndPoint");
function wrap(ep, target) {
  const pendingListeners = /* @__PURE__ */ new Map();
  ep.addEventListener("message", /* @__PURE__ */ __name(function handleMessage(ev) {
    const { data } = ev;
    if (!data || !data.id) {
      return;
    }
    const resolver = pendingListeners.get(data.id);
    if (!resolver) {
      return;
    }
    try {
      resolver(data);
    } finally {
      pendingListeners.delete(data.id);
    }
  }, "handleMessage"));
  return createProxy(ep, pendingListeners, [], target);
}
__name(wrap, "wrap");
function throwIfProxyReleased(isReleased) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}
__name(throwIfProxyReleased, "throwIfProxyReleased");
function releaseEndpoint(ep) {
  return requestResponseMessage(ep, /* @__PURE__ */ new Map(), {
    type: "RELEASE"
  }).then(() => {
    closeEndPoint(ep);
  });
}
__name(releaseEndpoint, "releaseEndpoint");
var proxyCounter = /* @__PURE__ */ new WeakMap();
var proxyFinalizers = "FinalizationRegistry" in globalThis && new FinalizationRegistry((ep) => {
  const newCount = (proxyCounter.get(ep) || 0) - 1;
  proxyCounter.set(ep, newCount);
  if (newCount === 0) {
    releaseEndpoint(ep);
  }
});
function registerProxy(proxy2, ep) {
  const newCount = (proxyCounter.get(ep) || 0) + 1;
  proxyCounter.set(ep, newCount);
  if (proxyFinalizers) {
    proxyFinalizers.register(proxy2, ep, proxy2);
  }
}
__name(registerProxy, "registerProxy");
function unregisterProxy(proxy2) {
  if (proxyFinalizers) {
    proxyFinalizers.unregister(proxy2);
  }
}
__name(unregisterProxy, "unregisterProxy");
function createProxy(ep, pendingListeners, path = [], target = function() {
}) {
  let isProxyReleased = false;
  const proxy2 = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);
      if (prop === releaseProxy) {
        return () => {
          unregisterProxy(proxy2);
          releaseEndpoint(ep);
          pendingListeners.clear();
          isProxyReleased = true;
        };
      }
      if (prop === "then") {
        if (path.length === 0) {
          return { then: /* @__PURE__ */ __name(() => proxy2, "then") };
        }
        const r = requestResponseMessage(ep, pendingListeners, {
          type: "GET",
          path: path.map((p) => p.toString())
        }).then(fromWireValue);
        return r.then.bind(r);
      }
      return createProxy(ep, pendingListeners, [...path, prop]);
    },
    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased);
      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(ep, pendingListeners, {
        type: "SET",
        path: [...path, prop].map((p) => p.toString()),
        value
      }, transferables).then(fromWireValue);
    },
    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last = path[path.length - 1];
      if (last === createEndpoint) {
        return requestResponseMessage(ep, pendingListeners, {
          type: "ENDPOINT"
        }).then(fromWireValue);
      }
      if (last === "bind") {
        return createProxy(ep, pendingListeners, path.slice(0, -1));
      }
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, pendingListeners, {
        type: "APPLY",
        path: path.map((p) => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    },
    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, pendingListeners, {
        type: "CONSTRUCT",
        path: path.map((p) => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    }
  });
  registerProxy(proxy2, ep);
  return proxy2;
}
__name(createProxy, "createProxy");
function myFlat(arr) {
  return Array.prototype.concat.apply([], arr);
}
__name(myFlat, "myFlat");
function processArguments(argumentList) {
  const processed = argumentList.map(toWireValue);
  return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
__name(processArguments, "processArguments");
var transferCache = /* @__PURE__ */ new WeakMap();
function transfer(obj, transfers) {
  transferCache.set(obj, transfers);
  return obj;
}
__name(transfer, "transfer");
function proxy(obj) {
  return Object.assign(obj, { [proxyMarker]: true });
}
__name(proxy, "proxy");
function toWireValue(value) {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [
        {
          type: "HANDLER",
          name,
          value: serializedValue
        },
        transferables
      ];
    }
  }
  return [
    {
      type: "RAW",
      value
    },
    transferCache.get(value) || []
  ];
}
__name(toWireValue, "toWireValue");
function fromWireValue(value) {
  switch (value.type) {
    case "HANDLER":
      return transferHandlers.get(value.name).deserialize(value.value);
    case "RAW":
      return value.value;
  }
}
__name(fromWireValue, "fromWireValue");
function requestResponseMessage(ep, pendingListeners, msg, transfers) {
  return new Promise((resolve) => {
    const id = generateUUID();
    pendingListeners.set(id, resolve);
    if (ep.start) {
      ep.start();
    }
    ep.postMessage(Object.assign({ id }, msg), transfers);
  });
}
__name(requestResponseMessage, "requestResponseMessage");
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
__name(generateUUID, "generateUUID");

// ../kicad-parser/src/tokenizer.ts
var EOF = "";
var Token = class {
  constructor(type, value = null) {
    this.type = type;
    this.value = value;
  }
  static {
    __name(this, "Token");
  }
  static {
    this.OPEN = /* @__PURE__ */ Symbol("opn");
  }
  static {
    this.CLOSE = /* @__PURE__ */ Symbol("clo");
  }
  static {
    this.ATOM = /* @__PURE__ */ Symbol("atm");
  }
  static {
    this.NUMBER = /* @__PURE__ */ Symbol("num");
  }
  static {
    this.STRING = /* @__PURE__ */ Symbol("str");
  }
};
function is_digit(c) {
  return c >= "0" && c <= "9";
}
__name(is_digit, "is_digit");
function is_alpha(c) {
  return c >= "A" && c <= "Z" || c >= "a" && c <= "z";
}
__name(is_alpha, "is_alpha");
function is_whitespace(c) {
  return c === EOF || c === " " || c === "\n" || c === "\r" || c === "	" || c === "|";
}
__name(is_whitespace, "is_whitespace");
function is_atom(c) {
  return is_alpha(c) || is_digit(c) || [
    "_",
    "-",
    ":",
    "!",
    ".",
    "[",
    "]",
    "{",
    "}",
    "@",
    "*",
    "/",
    "&",
    "#",
    "%",
    "+",
    "=",
    "~",
    "$"
  ].includes(c);
}
__name(is_atom, "is_atom");
function error_context(input, index) {
  let start = input.slice(0, index).lastIndexOf("\n");
  if (start < 0) start = 0;
  let end = input.slice(index).indexOf("\n");
  if (end < 0) end = 20;
  return input.slice(start, index + end);
}
__name(error_context, "error_context");
function* tokenize(input) {
  const open_token = new Token(Token.OPEN);
  const close_token = new Token(Token.CLOSE);
  let state = 0 /* none */;
  let start_idx = 0;
  let escaping = false;
  for (let i = 0; i < input.length + 1; i++) {
    const c = i < input.length ? input[i] : EOF;
    if (state == 0 /* none */) {
      if (c === "(") {
        yield open_token;
        continue;
      } else if (c === ")") {
        yield close_token;
        continue;
      } else if (c === '"') {
        state = 1 /* string */;
        start_idx = i;
        continue;
      } else if (c === "-" || c == "+" || is_digit(c)) {
        state = 2 /* number */;
        start_idx = i;
        continue;
      } else if (is_alpha(c) || ["*", "&", "$", "/", "%"].includes(c)) {
        state = 3 /* atom */;
        start_idx = i;
        continue;
      } else if (is_whitespace(c)) {
        continue;
      } else if (c === "|") {
        continue;
      } else {
        throw new Error(
          `Unexpected character at index ${i}: ${c}
Context: ${error_context(
            input,
            i
          )}`
        );
      }
    } else if (state == 3 /* atom */) {
      if (is_atom(c)) {
        continue;
      } else if (c === ")" || is_whitespace(c)) {
        yield new Token(Token.ATOM, input.substring(start_idx, i));
        state = 0 /* none */;
        if (c === ")") {
          yield close_token;
        }
      } else {
        continue;
      }
    } else if (state == 2 /* number */) {
      if (c === "." || is_digit(c)) {
        continue;
      } else if (c.toLowerCase() === "x") {
        state = 4 /* hex */;
        continue;
      } else if (["+", "-", "a", "b", "c", "d", "e", "f"].includes(
        c.toLowerCase()
      )) {
        state = 3 /* atom */;
        continue;
      } else if (is_atom(c)) {
        state = 3 /* atom */;
        continue;
      } else if (c === ")" || is_whitespace(c)) {
        yield new Token(
          Token.NUMBER,
          parseFloat(input.substring(start_idx, i))
        );
        state = 0 /* none */;
        if (c === ")") {
          yield close_token;
        }
        continue;
      } else {
        throw new Error(
          `Unexpected character at index ${i}: ${c}, expected numeric.
Context: ${error_context(
            input,
            i
          )}`
        );
      }
    } else if (state == 4 /* hex */) {
      if (is_digit(c) || ["a", "b", "c", "d", "e", "f", "_"].includes(c.toLowerCase())) {
        continue;
      } else if (c === ")" || is_whitespace(c)) {
        const hexstr = input.substring(start_idx, i).replace("_", "");
        yield new Token(Token.NUMBER, Number.parseInt(hexstr, 16));
        state = 0 /* none */;
        if (c === ")") {
          yield close_token;
        }
        continue;
      } else if (is_atom(c)) {
        state = 3 /* atom */;
        continue;
      } else {
        throw new Error(
          `Unexpected character at index ${i}: ${c}, expected hexadecimal.
Context: ${error_context(
            input,
            i
          )}`
        );
      }
    } else if (state == 1 /* string */) {
      if (!escaping && c === '"') {
        yield new Token(
          Token.STRING,
          input.substring((start_idx ?? 0) + 1, i).replaceAll("\\n", "\n").replaceAll("\\\\", "\\")
        );
        state = 0 /* none */;
        escaping = false;
        continue;
      } else if (!escaping && c === "\\") {
        escaping = true;
        continue;
      } else {
        escaping = false;
        continue;
      }
    } else {
      throw new Error(
        `Unknown tokenizer state ${state}
Context: ${error_context(
          input,
          i
        )}`
      );
    }
  }
}
__name(tokenize, "tokenize");
function* listify_tokens(tokens) {
  let token;
  let it;
  while (true) {
    it = tokens.next();
    token = it.value;
    switch (token?.type) {
      case Token.ATOM:
      case Token.STRING:
      case Token.NUMBER:
        yield token.value;
        break;
      case Token.OPEN:
        yield Array.from(listify_tokens(tokens));
        break;
      case Token.CLOSE:
      case void 0:
        return;
    }
  }
}
__name(listify_tokens, "listify_tokens");
function listify(src) {
  const tokens = tokenize(src);
  return Array.from(listify_tokens(tokens));
}
__name(listify, "listify");

// ../kicad-parser/src/log.ts
var Logger = class {
  constructor(name, level = 1 /* INFO */) {
    this.name = name;
    this.level = level;
  }
  static {
    __name(this, "Logger");
  }
  #log(method, ...args) {
    method(
      `%c${this.name}:%c`,
      `color: ButtonText`,
      `color: inherit`,
      ...args
    );
  }
  debug(...args) {
    if (this.level >= 2 /* DEBUG */) {
      this.#log(console.debug, ...args);
    }
  }
  info(...args) {
    if (this.level >= 1 /* INFO */) {
      this.#log(console.info.bind(console), ...args);
    }
  }
  warn(...args) {
    if (this.level >= 0 /* ERROR */) {
      this.#log(console.warn, ...args);
    }
  }
  error(...args) {
    if (this.level >= 0 /* ERROR */) {
      this.#log(console.error, ...args);
    }
  }
};
var default_logger = new Logger("kicad-parser");

// ../kicad-parser/src/sexpr.ts
var log = new Logger("kicanvas:parser");
var is_string = /* @__PURE__ */ __name((e) => typeof e === "string", "is_string");
var is_number = /* @__PURE__ */ __name((e) => typeof e === "number", "is_number");
var T = {
  any(obj, name, e) {
    return e;
  },
  boolean(obj, name, e) {
    switch (e) {
      case "false":
      case "no":
        return false;
      case "true":
      case "yes":
        return true;
      default:
        return e ? true : false;
    }
  },
  string(obj, name, e) {
    if (is_string(e)) {
      return e;
    } else {
      return void 0;
    }
  },
  number(obj, name, e) {
    if (is_number(e)) {
      return e;
    } else {
      return void 0;
    }
  },
  item(factory, ...args) {
    return (obj, name, e) => {
      return factory(e, ...args);
    };
  },
  object(start, ...defs) {
    return (obj, name, e) => {
      let existing = {};
      if (start !== null) {
        existing = obj[name] ?? start ?? {};
      }
      return {
        ...existing,
        ...parse_expr(e, P.start(name), ...defs)
      };
    };
  },
  vec2(obj, name, e) {
    const el = e;
    return { x: el[1] || 0, y: el[2] || 0 };
  },
  color(obj, name, e) {
    const el = e;
    return {
      r: el[1] / 255,
      g: el[2] / 255,
      b: el[3] / 255,
      a: el[4] ?? 1
    };
  }
};
var P = {
  start(name) {
    return {
      kind: 0 /* start */,
      name,
      fn: T.string
    };
  },
  positional(name, typefn = T.any) {
    return {
      kind: 1 /* positional */,
      name,
      fn: typefn
    };
  },
  pair(name, typefn = T.any) {
    return {
      kind: 2 /* pair */,
      name,
      accepts: [name],
      fn: /* @__PURE__ */ __name((obj, name2, e) => {
        return typefn(obj, name2, e[1]);
      }, "fn")
    };
  },
  list(name, typefn = T.any) {
    return {
      kind: 3 /* list */,
      name,
      accepts: [name],
      fn: /* @__PURE__ */ __name((obj, name2, e) => {
        return e.slice(1).map((n) => typefn(obj, name2, n));
      }, "fn")
    };
  },
  collection(name, accept, typefn = T.any) {
    return {
      kind: 5 /* item_list */,
      name,
      accepts: [accept],
      fn: /* @__PURE__ */ __name((obj, name2, e) => {
        const list = obj[name2] ?? [];
        list.push(typefn(obj, name2, e));
        return list;
      }, "fn")
    };
  },
  mapped_collection(name, accept, keyfn, typefn = T.any) {
    return {
      kind: 5 /* item_list */,
      name,
      accepts: [accept],
      fn: /* @__PURE__ */ __name((obj, name2, e) => {
        const map = obj[name2] ?? {};
        const val = typefn(obj, name2, e);
        const key = keyfn(val);
        map[key] = val;
        return map;
      }, "fn")
    };
  },
  dict(name, accept, typefn = T.any) {
    return {
      kind: 5 /* item_list */,
      name,
      accepts: [accept],
      fn: /* @__PURE__ */ __name((obj, name2, e) => {
        const el = e;
        const rec = obj[name2] ?? {};
        rec[el[1]] = typefn(obj, name2, el[2]);
        return rec;
      }, "fn")
    };
  },
  atom(name, values) {
    let typefn;
    if (values) {
      typefn = T.string;
    } else {
      typefn = T.boolean;
      values = [name];
    }
    return {
      kind: 4 /* atom */,
      name,
      accepts: values,
      fn(obj, name2, e) {
        if (Array.isArray(e) && e.length == 1) {
          e = e[0];
        }
        return typefn(obj, name2, e);
      }
    };
  },
  expr(name, typefn = T.any) {
    return {
      kind: 6 /* expr */,
      name,
      accepts: [name],
      fn: typefn
    };
  },
  object(name, start, ...defs) {
    return P.expr(name, T.object(start, ...defs));
  },
  item(name, factory, ...args) {
    return P.expr(name, T.item(factory, ...args));
  },
  vec2(name) {
    return P.expr(name, T.vec2);
  },
  color(name = "color") {
    return P.expr(name, T.color);
  }
};
function as_array(v) {
  if (Array.isArray(v)) {
    return v;
  } else {
    return [v];
  }
}
__name(as_array, "as_array");
function parse_expr(expr, ...defs) {
  if (is_string(expr)) {
    expr = listify(expr);
    if (expr.length == 1 && Array.isArray(expr[0])) {
      expr = expr[0];
    }
  }
  const defs_map = /* @__PURE__ */ new Map();
  let start_def;
  let n = 0;
  for (const def of defs) {
    if (def.kind == 0 /* start */) {
      start_def = def;
    } else if (def.kind == 1 /* positional */) {
      defs_map.set(n, def);
      n++;
    } else {
      for (const a of def.accepts) {
        defs_map.set(a, def);
      }
    }
  }
  if (start_def) {
    const acceptable_start_strings = as_array(start_def.name);
    const first = expr.at(0);
    if (!acceptable_start_strings.includes(first)) {
      throw new Error(
        `Expression must start with ${start_def.name} found ${first} in ${expr}`
      );
    }
    expr = expr.slice(1);
  }
  const out = {};
  n = 0;
  for (const element of expr) {
    let def = null;
    if (is_string(element)) {
      def = defs_map.get(element);
    }
    if (!def && (is_string(element) || is_number(element))) {
      def = defs_map.get(n);
      if (!def) {
        log.warn(
          `no def for bare element ${element} at position ${n} in expression ${expr}`
        );
        continue;
      }
      n++;
    }
    if (!def && Array.isArray(element)) {
      def = defs_map.get(element[0]);
    }
    if (!def) {
      log.warn(
        `No def found for element ${element} in expression ${expr}`
      );
      continue;
    }
    const value = def.fn(out, def.name, element);
    out[def.name] = value;
  }
  return out;
}
__name(parse_expr, "parse_expr");

// ../kicad-parser/src/common.ts
function parseAt(expr) {
  const parsed = parse_expr(
    expr,
    P.start("at"),
    P.vec2("position"),
    P.positional("x", T.number),
    P.positional("y", T.number),
    P.positional("rotation", T.number),
    P.atom("unlocked")
  );
  return {
    position: {
      x: parsed.position?.x ?? parsed.x ?? 0,
      y: parsed.position?.y ?? parsed.y ?? 0
    },
    rotation: parsed.rotation ?? 0,
    unlocked: parsed.unlocked ?? false
  };
}
__name(parseAt, "parseAt");
function parseStroke(expr) {
  return parse_expr(
    expr,
    P.start("stroke"),
    P.pair("width", T.number),
    P.pair("type", T.string),
    P.color()
  );
}
__name(parseStroke, "parseStroke");
function parseEffects(expr) {
  return parse_expr(
    expr,
    P.start("effects"),
    P.object(
      "font",
      {},
      P.start("font"),
      P.pair("face", T.string),
      P.vec2("size"),
      P.pair("thickness", T.number),
      P.atom("bold"),
      P.atom("italic"),
      P.pair("line_spacing", T.number)
    ),
    P.object(
      "justify",
      { horiz: "center", vert: "center", mirror: false },
      P.start("justify"),
      P.atom("horiz", ["left", "right"]),
      P.atom("vert", ["top", "bottom"]),
      P.atom("mirror")
    ),
    P.atom("hide"),
    P.pair("href", T.string)
  );
}
__name(parseEffects, "parseEffects");
function parseTitleBlock(expr) {
  return parse_expr(
    expr,
    P.start("title_block"),
    P.pair("title", T.string),
    P.pair("date", T.string),
    P.pair("rev", T.string),
    P.pair("company", T.string),
    P.dict("comment", "comment", T.string)
  );
}
__name(parseTitleBlock, "parseTitleBlock");
function parsePaper(expr) {
  const raw = parse_expr(
    expr,
    P.start("paper"),
    P.positional("size", T.string),
    P.positional("width", T.number),
    P.positional("height", T.number),
    P.atom("portrait")
  );
  return raw;
}
__name(parsePaper, "parsePaper");

// ../kicad-parser/src/board_parser.ts
function parseLayer(expr) {
  return parse_expr(
    expr,
    P.positional("ordinal", T.number),
    P.positional("canonical_name", T.string),
    P.positional("type", T.string),
    P.positional("user_name", T.string)
  );
}
__name(parseLayer, "parseLayer");
function parseStackupLayer(expr) {
  return parse_expr(
    expr,
    P.positional("name", T.string),
    P.pair("type", T.string),
    P.pair("color", T.string),
    P.pair("thickness", T.number),
    P.pair("material", T.string),
    P.pair("epsilon_r", T.number),
    P.pair("loss_tangent", T.number)
  );
}
__name(parseStackupLayer, "parseStackupLayer");
function parseStackup(expr) {
  return parse_expr(
    expr,
    P.start("stackup"),
    P.collection("layers", "layer", T.item(parseStackupLayer)),
    P.pair("copper_finish", T.string),
    P.pair("dielectric_constraints", T.boolean),
    P.pair("edge_connector", T.string),
    P.pair("castellated_pads", T.boolean),
    P.pair("edge_plating", T.boolean)
  );
}
__name(parseStackup, "parseStackup");
function parsePCBPlotParams(expr) {
  return parse_expr(
    expr,
    P.start("pcbplotparams"),
    P.pair("layerselection", T.number),
    P.pair("disableapertmacros", T.boolean),
    P.pair("usegerberextensions", T.boolean),
    P.pair("usegerberattributes", T.boolean),
    P.pair("usegerberadvancedattributes", T.boolean),
    P.pair("creategerberjobfile", T.boolean),
    P.pair("gerberprecision", T.number),
    P.pair("svguseinch", T.boolean),
    P.pair("svgprecision", T.number),
    P.pair("excludeedgelayer", T.boolean),
    P.pair("plotframeref", T.boolean),
    P.pair("viasonmask", T.boolean),
    P.pair("mode", T.number),
    P.pair("useauxorigin", T.boolean),
    P.pair("hpglpennumber", T.number),
    P.pair("hpglpenspeed", T.number),
    P.pair("hpglpendiameter", T.number),
    P.pair("dxfpolygonmode", T.boolean),
    P.pair("dxfimperialunits", T.boolean),
    P.pair("dxfusepcbnewfont", T.boolean),
    P.pair("psnegative", T.boolean),
    P.pair("psa4output", T.boolean),
    P.pair("plotreference", T.boolean),
    P.pair("plotvalue", T.boolean),
    P.pair("plotinvisibletext", T.boolean),
    P.pair("sketchpadsonfab", T.boolean),
    P.pair("subtractmaskfromsilk", T.boolean),
    P.pair("outputformat", T.number),
    P.pair("mirror", T.boolean),
    P.pair("drillshape", T.number),
    P.pair("scaleselection", T.number),
    P.pair("outputdirectory", T.string),
    P.pair("plot_on_all_layers_selection", T.number),
    P.pair("dashed_line_dash_ratio", T.number),
    P.pair("dashed_line_gap_ratio", T.number),
    P.pair("pdf_front_fp_property_popups", T.boolean),
    P.pair("pdf_back_fp_property_popups", T.boolean),
    P.pair("plotfptext", T.boolean)
  );
}
__name(parsePCBPlotParams, "parsePCBPlotParams");
function parseSetup(expr) {
  return parse_expr(
    expr,
    P.start("setup"),
    P.pair("pad_to_mask_clearance", T.number),
    P.pair("solder_mask_min_width", T.number),
    P.pair("pad_to_paste_clearance", T.number),
    P.pair("pad_to_paste_clearance_ratio", T.number),
    P.vec2("aux_axis_origin"),
    P.vec2("grid_origin"),
    P.item("pcbplotparams", parsePCBPlotParams),
    P.item("stackup", parseStackup),
    P.pair("allow_soldermask_bridges_in_footprints", T.boolean)
  );
}
__name(parseSetup, "parseSetup");
function parseNet(expr) {
  return parse_expr(
    expr,
    P.start("net"),
    P.positional("number", T.number),
    P.positional("name", T.string)
  );
}
__name(parseNet, "parseNet");
function parseNetReference(expr) {
  return parse_expr(
    expr,
    P.start("net"),
    P.positional("number", T.number),
    P.positional("name", T.string)
  );
}
__name(parseNetReference, "parseNetReference");
function parseLine(expr, start) {
  return parse_expr(
    expr,
    P.start(start),
    P.pair("layer", T.string),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string),
    P.atom("locked"),
    P.vec2("start"),
    P.vec2("end"),
    P.pair("width", T.number),
    P.item("stroke", parseStroke)
  );
}
__name(parseLine, "parseLine");
function parse_gr_Line(expr) {
  return parseLine(expr, "gr_line");
}
__name(parse_gr_Line, "parse_gr_Line");
function parse_fp_Line(expr) {
  return parseLine(expr, "fp_line");
}
__name(parse_fp_Line, "parse_fp_Line");
function parseCircle(expr, start) {
  return parse_expr(
    expr,
    P.start(start),
    P.pair("layer", T.string),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string),
    P.atom("locked"),
    P.vec2("center"),
    P.vec2("end"),
    P.pair("width", T.number),
    P.pair("fill", T.string),
    P.item("stroke", parseStroke)
  );
}
__name(parseCircle, "parseCircle");
function parse_gr_Circle(expr) {
  return parseCircle(expr, "gr_circle");
}
__name(parse_gr_Circle, "parse_gr_Circle");
function parse_fp_Circle(expr) {
  return parseCircle(expr, "fp_circle");
}
__name(parse_fp_Circle, "parse_fp_Circle");
function parseArc(expr, start) {
  return parse_expr(
    expr,
    P.start(start),
    // Also fp_arc
    P.pair("layer", T.string),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string),
    P.atom("locked"),
    P.vec2("start"),
    P.vec2("mid"),
    P.vec2("end"),
    P.pair("angle", T.number),
    P.pair("width", T.number),
    P.item("stroke", parseStroke)
  );
}
__name(parseArc, "parseArc");
function parse_gr_Arc(expr) {
  return parseArc(expr, "gr_arc");
}
__name(parse_gr_Arc, "parse_gr_Arc");
function parse_fp_Arc(expr) {
  return parseArc(expr, "fp_arc");
}
__name(parse_fp_Arc, "parse_fp_Arc");
function parse_poly_Arc(expr) {
  return parseArc(expr, "arc");
}
__name(parse_poly_Arc, "parse_poly_Arc");
function parsePoly(expr, start) {
  return parse_expr(
    expr,
    P.start(start),
    P.pair("layer", T.string),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string),
    P.atom("locked"),
    P.expr("pts", (obj, name, expr2) => {
      const parsed = parse_expr(
        expr2,
        P.start("pts"),
        P.collection("items", "xy", T.vec2),
        P.collection("items", "arc", T.item(parse_poly_Arc))
      );
      return parsed?.["items"];
    }),
    P.pair("width", T.number),
    P.pair("fill", T.string),
    P.atom("island"),
    P.item("stroke", parseStroke)
  );
}
__name(parsePoly, "parsePoly");
function parse_gr_poly(expr) {
  return parsePoly(expr, "gr_poly");
}
__name(parse_gr_poly, "parse_gr_poly");
function parse_fp_poly(expr) {
  return parsePoly(expr, "fp_poly");
}
__name(parse_fp_poly, "parse_fp_poly");
function parse_polygon(expr) {
  return parsePoly(expr, "polygon");
}
__name(parse_polygon, "parse_polygon");
function parse_filled_polygon(expr) {
  return parsePoly(expr, "filled_polygon");
}
__name(parse_filled_polygon, "parse_filled_polygon");
function parseRect(expr, start) {
  return parse_expr(
    expr,
    P.start(start),
    P.pair("layer", T.string),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string),
    P.atom("locked"),
    P.vec2("start"),
    P.vec2("end"),
    P.pair("width", T.number),
    P.pair("fill", T.string),
    P.item("stroke", parseStroke)
  );
}
__name(parseRect, "parseRect");
function parse_gr_Rect(expr) {
  return parseRect(expr, "gr_rect");
}
__name(parse_gr_Rect, "parse_gr_Rect");
function parse_fp_Rect(expr) {
  return parseRect(expr, "fp_rect");
}
__name(parse_fp_Rect, "parse_fp_Rect");
function parseTextRenderCache(expr) {
  return parse_expr(
    expr,
    P.start("render_cache"),
    P.positional("text", T.string),
    P.positional("angle", T.number),
    P.pair("uuid", T.string),
    P.collection("polygons", "polygon", T.item(parse_polygon))
  );
}
__name(parseTextRenderCache, "parseTextRenderCache");
function parseFpText(expr) {
  return parse_expr(
    expr,
    P.start("fp_text"),
    P.atom("locked"),
    P.positional("type", T.string),
    // reference, value, user
    P.positional("text", T.string),
    P.item("at", parseAt),
    P.atom("hide"),
    P.atom("unlocked"),
    P.pair("uuid", T.string),
    P.object(
      "layer",
      {},
      P.start("layer"),
      P.positional("name", T.string),
      P.atom("knockout")
    ),
    P.pair("tstamp", T.string),
    P.item("effects", parseEffects),
    P.item("render_cache", parseTextRenderCache)
  );
}
__name(parseFpText, "parseFpText");
function parseGrText(expr) {
  return parse_expr(
    expr,
    P.start("gr_text"),
    P.positional("text", T.string),
    P.item("at", parseAt),
    P.object(
      "layer",
      {},
      P.start("layer"),
      P.positional("name", T.string),
      P.atom("knockout")
    ),
    P.atom("unlocked"),
    P.atom("hide"),
    P.atom("locked"),
    P.item("effects", parseEffects),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string),
    P.item("render_cache", parseTextRenderCache)
  );
}
__name(parseGrText, "parseGrText");
function parseDimension(expr) {
  return parse_expr(
    expr,
    P.start("dimension"),
    P.atom("locked"),
    P.positional("type", T.string),
    // aligned, leader, etc
    P.pair("layer", T.string),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string),
    P.collection("pts", "pts", (obj, name, e) => {
      return parse_expr(e, P.collection("points", "xy", T.vec2))["points"];
    }),
    P.pair("height", T.number),
    P.pair("orientation", T.number),
    P.pair("leader_length", T.number),
    P.item("gr_text", parseGrText),
    P.object(
      "format",
      {},
      P.start("format"),
      P.pair("prefix", T.string),
      P.pair("suffix", T.string),
      P.pair("units", T.number),
      P.pair("units_format", T.number),
      P.pair("precision", T.number),
      P.pair("override_value", T.string),
      P.pair("suppress_zeroes", T.boolean)
    ),
    P.object(
      "style",
      {},
      P.start("style"),
      P.pair("thickness", T.number),
      P.pair("arrow_length", T.number),
      P.pair("text_position_mode", T.number),
      P.pair("extension_height", T.number),
      P.pair("text_frame", T.number),
      P.pair("extension_offset", T.number),
      P.pair("keep_text_aligned", T.boolean)
    )
  );
}
__name(parseDimension, "parseDimension");
function parsePad(expr) {
  return parse_expr(
    expr,
    P.start("pad"),
    P.positional("number", T.string),
    P.positional("type", T.string),
    P.positional("shape", T.string),
    P.atom("locked"),
    P.item("at", parseAt),
    P.vec2("size"),
    P.vec2("rect_delta"),
    P.list("layers", T.string),
    P.pair("remove_unused_layers", T.boolean),
    P.pair("keep_end_layers", T.boolean),
    P.pair("roundrect_rratio", T.number),
    P.pair("chamfer_ratio", T.number),
    P.object(
      "chamfer",
      {},
      P.start("chamfer"),
      P.atom("top_left"),
      P.atom("top_right"),
      P.atom("bottom_right"),
      P.atom("bottom_left")
    ),
    P.pair("pinfunction", T.string),
    P.pair("pintype", T.string),
    P.pair("die_length", T.number),
    P.pair("solder_mask_margin", T.number),
    P.pair("solder_paste_margin", T.number),
    P.pair("solder_paste_margin_ratio", T.number),
    P.pair("clearance", T.number),
    P.pair("thermal_width", T.number),
    P.pair("thermal_gap", T.number),
    P.pair("thermal_bridge_angle", T.number),
    P.pair("zone_connect", T.number),
    P.object(
      "drill",
      {},
      P.start("drill"),
      P.atom("oval"),
      P.positional("diameter", T.number),
      P.positional("width", T.number),
      P.vec2("offset")
    ),
    P.item("net", parseNetReference),
    P.object(
      "options",
      {},
      P.start("options"),
      P.pair("clearance", T.string),
      P.pair("anchor", T.string)
    ),
    P.expr("primitives", (obj, name, expr2) => {
      const parsed = parse_expr(
        expr2,
        P.start("primitives"),
        P.collection("items", "gr_line", T.item(parse_gr_Line)),
        P.collection("items", "gr_circle", T.item(parse_gr_Circle)),
        P.collection("items", "gr_arc", T.item(parse_gr_Arc)),
        P.collection("items", "gr_rect", T.item(parse_gr_Rect)),
        P.collection("items", "gr_poly", T.item(parse_gr_poly))
      );
      return parsed?.["items"];
    }),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string)
  );
}
__name(parsePad, "parsePad");
function parseModel(expr) {
  return parse_expr(
    expr,
    P.start("model"),
    P.positional("filename", T.string),
    P.object(
      "offset",
      {},
      P.start("offset"),
      P.collection("xyz", "xyz", T.number)
    ),
    P.object(
      "scale",
      {},
      P.start("scale"),
      P.collection("xyz", "xyz", T.number)
    ),
    P.object(
      "rotate",
      {},
      P.start("rotate"),
      P.collection("xyz", "xyz", T.number)
    ),
    P.atom("hide"),
    P.pair("opacity", T.number)
  );
}
__name(parseModel, "parseModel");
function parsePropertyKicad8(expr) {
  return parse_expr(
    expr,
    P.start("property"),
    P.positional("name", T.string),
    P.positional("value", T.string),
    P.item("at", parseAt),
    P.atom("unlocked"),
    P.object(
      "layer",
      {},
      P.start("layer"),
      P.positional("name", T.string),
      P.atom("knockout")
    ),
    P.atom("hide"),
    P.pair("uuid", T.string),
    P.item("effects", parseEffects),
    P.item("render_cache", parseTextRenderCache)
  );
}
__name(parsePropertyKicad8, "parsePropertyKicad8");
function parseZoneFill(expr) {
  return parse_expr(
    expr,
    P.start("fill"),
    P.positional("fill", T.boolean),
    P.pair("mode", T.string),
    P.pair("thermal_gap", T.number),
    P.pair("thermal_bridge_width", T.number),
    P.object(
      "smoothing",
      {},
      P.start("smoothing"),
      P.positional("style", T.string),
      P.pair("radius", T.number)
    ),
    P.pair("radius", T.number),
    P.pair("island_removal_mode", T.number),
    P.pair("island_area_min", T.number),
    P.pair("hatch_thickness", T.number),
    P.pair("hatch_gap", T.number),
    P.pair("hatch_orientation", T.number),
    P.pair("hatch_smoothing_level", T.number),
    P.pair("hatch_smoothing_value", T.number),
    P.pair("hatch_border_algorithm", T.string),
    P.pair("hatch_min_hole_area", T.number),
    P.pair("uuid", T.string)
  );
}
__name(parseZoneFill, "parseZoneFill");
function parseZoneKeepout(expr) {
  return parse_expr(
    expr,
    P.start("keepout"),
    P.pair("tracks", T.string),
    P.pair("vias", T.string),
    P.pair("pads", T.string),
    P.pair("copperpour", T.string),
    P.pair("footprints", T.string),
    P.pair("uuid", T.string)
  );
}
__name(parseZoneKeepout, "parseZoneKeepout");
function parseZone(expr) {
  return parse_expr(
    expr,
    P.start("zone"),
    P.atom("locked"),
    P.pair("net", T.number),
    P.pair("net_name", T.string),
    P.pair("name", T.string),
    P.pair("layer", T.string),
    P.list("layers", T.string),
    P.object(
      "hatch",
      {},
      P.start("hatch"),
      P.positional("style", T.string),
      P.positional("pitch", T.number)
    ),
    P.pair("priority", T.number),
    P.object(
      "connect_pads",
      {},
      P.start("connect_pads"),
      P.positional("type", T.string),
      P.pair("clearance", T.number)
    ),
    P.pair("min_thickness", T.number),
    P.pair("filled_areas_thickness", T.boolean),
    P.item("keepout", parseZoneKeepout),
    P.item("fill", parseZoneFill),
    P.collection("polygons", "polygon", T.item(parse_polygon)),
    P.collection(
      "filled_polygons",
      "filled_polygon",
      T.item(parse_filled_polygon)
    ),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string)
  );
}
__name(parseZone, "parseZone");
function parseFootprint(expr) {
  return parse_expr(
    expr,
    P.start("footprint"),
    P.positional("library_link", T.string),
    P.pair("version", T.number),
    P.pair("embedded_fonts", T.boolean),
    P.pair("generator", T.string),
    P.atom("locked"),
    P.atom("placed"),
    P.pair("layer", T.string),
    P.pair("tedit", T.string),
    P.pair("tstamp", T.string),
    P.item("at", parseAt),
    P.pair("uuid", T.string),
    P.pair("descr", T.string),
    P.pair("tags", T.string),
    P.pair("sheetname", T.string),
    P.pair("sheetfile", T.string),
    P.pair("path", T.string),
    P.pair("autoplace_cost90", T.number),
    P.pair("autoplace_cost180", T.number),
    P.pair("solder_mask_margin", T.number),
    P.pair("solder_paste_margin", T.number),
    P.pair("solder_paste_ratio", T.number),
    P.pair("clearance", T.number),
    P.pair("zone_connect", T.number),
    P.pair("thermal_width", T.number),
    P.pair("thermal_gap", T.number),
    P.object(
      "attr",
      {},
      P.start("attr"),
      P.atom("through_hole"),
      P.atom("smd"),
      P.atom("virtual"),
      P.atom("board_only"),
      P.atom("exclude_from_pos_files"),
      P.atom("exclude_from_bom"),
      P.atom("allow_solder_mask_bridges"),
      P.atom("allow_missing_courtyard")
    ),
    P.dict("properties", "property", T.string),
    P.collection(
      "properties_kicad_8",
      "property",
      T.item(parsePropertyKicad8)
    ),
    P.collection("drawings", "fp_line", T.item(parse_fp_Line)),
    P.collection("drawings", "fp_circle", T.item(parse_fp_Circle)),
    P.collection("drawings", "fp_arc", T.item(parse_fp_Arc)),
    P.collection("drawings", "fp_poly", T.item(parse_fp_poly)),
    P.collection("drawings", "fp_rect", T.item(parse_fp_Rect)),
    P.collection("fp_texts", "fp_text", T.item(parseFpText)),
    P.collection("zones", "zone", T.item(parseZone)),
    P.collection("models", "model", T.item(parseModel)),
    P.collection("pads", "pad", T.item(parsePad))
  );
}
__name(parseFootprint, "parseFootprint");
function parseLineSegment(expr) {
  return parse_expr(
    expr,
    P.start("segment"),
    P.vec2("start"),
    P.vec2("end"),
    P.pair("width", T.number),
    P.pair("layer", T.string),
    P.pair("net", T.number),
    P.atom("locked"),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string)
  );
}
__name(parseLineSegment, "parseLineSegment");
function parseArcSegment(expr) {
  return parse_expr(
    expr,
    P.start("arc"),
    P.vec2("start"),
    P.vec2("mid"),
    P.vec2("end"),
    P.pair("width", T.number),
    P.pair("layer", T.string),
    P.pair("net", T.number),
    P.atom("locked"),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string)
  );
}
__name(parseArcSegment, "parseArcSegment");
function parseVia(expr) {
  return parse_expr(
    expr,
    P.start("via"),
    P.item("at", parseAt),
    P.pair("size", T.number),
    P.pair("drill", T.number),
    P.list("layers", T.string),
    P.atom("remove_unused_layers"),
    P.atom("keep_end_layers"),
    P.atom("locked"),
    P.atom("free"),
    P.pair("net", T.number),
    P.pair("tstamp", T.string),
    P.pair("uuid", T.string),
    P.atom("type", ["blind", "micro", "through-hole"])
  );
}
__name(parseVia, "parseVia");
function parseGroup(expr) {
  return parse_expr(
    expr,
    P.start("group"),
    P.positional("name", T.string),
    P.pair("id", T.string),
    P.atom("locked"),
    P.collection("members", "members", T.string)
  );
}
__name(parseGroup, "parseGroup");
var BoardParser = class {
  static {
    __name(this, "BoardParser");
  }
  parse(text) {
    const expr = listify(text);
    const root = expr.length === 1 && Array.isArray(expr[0]) ? expr[0] : expr;
    return parse_expr(
      root,
      P.start("kicad_pcb"),
      P.pair("version", T.number),
      P.pair("generator", T.string),
      P.pair("embedded_fonts", T.boolean),
      P.pair("generator_version", T.string),
      P.object(
        "general",
        {},
        P.start("general"),
        P.pair("thickness", T.number),
        P.atom("legacy_teardrops")
      ),
      P.item("paper", parsePaper),
      P.item("title_block", parseTitleBlock),
      P.item("setup", parseSetup),
      P.dict("properties", "property", (obj, name, e) => {
        const el = e;
        return { name: el[1], value: el[2] };
      }),
      P.list("layers", T.item(parseLayer)),
      P.collection("nets", "net", T.item(parseNet)),
      P.collection("footprints", "footprint", T.item(parseFootprint)),
      P.collection("footprints", "module", T.item(parseFootprint)),
      // Support legacy module
      P.collection("zones", "zone", T.item(parseZone)),
      P.collection("segments", "segment", T.item(parseLineSegment)),
      P.collection("segments", "arc", T.item(parseArcSegment)),
      P.collection("vias", "via", T.item(parseVia)),
      P.collection("drawings", "gr_line", T.item(parse_gr_Line)),
      P.collection("drawings", "gr_circle", T.item(parse_gr_Circle)),
      P.collection("drawings", "gr_arc", T.item(parse_gr_Arc)),
      P.collection("drawings", "gr_poly", T.item(parse_gr_poly)),
      P.collection("drawings", "gr_rect", T.item(parse_gr_Rect)),
      P.collection("drawings", "gr_text", T.item(parseGrText)),
      P.collection("drawings", "dimension", T.item(parseDimension)),
      P.collection("groups", "group", T.item(parseGroup))
    );
  }
};

// ../kicad-parser/src/schematic_parser.ts
function parseFill(expr) {
  return parse_expr(
    expr,
    P.start("fill"),
    P.pair("type", T.string),
    P.color()
  );
}
__name(parseFill, "parseFill");
function parseWire(expr) {
  return parse_expr(
    expr,
    P.start("wire"),
    P.list("pts", T.vec2),
    P.item("stroke", parseStroke),
    P.pair("uuid", T.string)
  );
}
__name(parseWire, "parseWire");
function parseBus(expr) {
  return parse_expr(
    expr,
    P.start("bus"),
    P.list("pts", T.vec2),
    P.item("stroke", parseStroke),
    P.pair("uuid", T.string)
  );
}
__name(parseBus, "parseBus");
function parseBusEntry(expr) {
  return parse_expr(
    expr,
    P.start("bus_entry"),
    P.item("at", parseAt),
    P.vec2("size"),
    P.item("stroke", parseStroke),
    P.pair("uuid", T.string)
  );
}
__name(parseBusEntry, "parseBusEntry");
function parseBusAlias(expr) {
  return parse_expr(
    expr,
    P.start("bus_alias"),
    P.positional("name", T.string),
    P.list("members", T.string)
  );
}
__name(parseBusAlias, "parseBusAlias");
function parseJunction(expr) {
  return parse_expr(
    expr,
    P.start("junction"),
    P.item("at", parseAt),
    P.pair("diameter", T.number),
    P.color(),
    P.pair("uuid", T.string)
  );
}
__name(parseJunction, "parseJunction");
function parseNoConnect(expr) {
  return parse_expr(
    expr,
    P.start("no_connect"),
    P.item("at", parseAt),
    P.pair("uuid", T.string)
  );
}
__name(parseNoConnect, "parseNoConnect");
function parsePolyline(expr) {
  return parse_expr(
    expr,
    P.start("polyline"),
    P.list("pts", T.vec2),
    P.item("stroke", parseStroke),
    P.item("fill", parseFill),
    P.pair("uuid", T.string)
  );
}
__name(parsePolyline, "parsePolyline");
function parseRectangle(expr) {
  return parse_expr(
    expr,
    P.start("rectangle"),
    P.vec2("start"),
    P.vec2("end"),
    P.item("stroke", parseStroke),
    P.item("fill", parseFill),
    P.pair("uuid", T.string)
  );
}
__name(parseRectangle, "parseRectangle");
function parseCircle2(expr) {
  return parse_expr(
    expr,
    P.start("circle"),
    P.vec2("center"),
    P.pair("radius", T.number),
    P.item("stroke", parseStroke),
    P.item("fill", parseFill),
    P.pair("uuid", T.string)
  );
}
__name(parseCircle2, "parseCircle");
function parseArc2(expr) {
  const res = parse_expr(
    expr,
    P.start("arc"),
    P.vec2("start"),
    P.vec2("mid"),
    P.vec2("end"),
    P.object(
      "radius",
      {},
      P.start("radius"),
      P.vec2("at"),
      P.pair("length"),
      P.vec2("angles")
    ),
    P.item("stroke", parseStroke),
    P.item("fill", parseFill),
    P.pair("uuid", T.string)
  );
  return res;
}
__name(parseArc2, "parseArc");
function parseBezier(expr) {
  return parse_expr(
    expr,
    P.start("bezier"),
    P.list("pts", T.vec2),
    P.item("stroke", parseStroke),
    P.item("fill", parseFill),
    P.pair("uuid", T.string)
  );
}
__name(parseBezier, "parseBezier");
function parseText(expr) {
  return parse_expr(
    expr,
    P.start("text"),
    P.positional("text", T.string),
    P.item("at", parseAt),
    P.item("effects", parseEffects),
    P.pair("exclude_from_sim", T.boolean),
    P.pair("uuid", T.string)
  );
}
__name(parseText, "parseText");
function parseTextBox(expr) {
  return parse_expr(
    expr,
    P.start("text"),
    // uses "text" token in source? check kicad source, actually it's (text_box ...) usually?
    // Wait, looking at schematic.ts line 691 it says P.start("text").
    // But the class is TextBox. Is it really (text ...)?
    // Ah, likely (textbox ...) in recent versions or (text ...) with box property?
    // Let's check schematic.ts again. Line 691: P.start("text").
    // NOTE: In `LibSymbol` constructor line 895 it parses `P.collection("drawings", "textbox", T.item(TextBox, this))`
    // So strict start would be "textbox".
    // But `TextBox` class constructor uses `P.start("text")`.
    // This implies `TextBox` might handle `(text ...)` nodes too or the constructor definition is slightly loose/wrong in `schematic.ts`.
    // Let's assume `textbox` for `LibSymbol` collections.
    // If it's `(text ...)` it's valid too but usually that's `Text`.
    // Let's use `textbox` as start for strict parsing if called via `textbox` collection.
    P.positional("text", T.string),
    P.item("at", parseAt),
    P.vec2("size"),
    P.item("effects", parseEffects),
    P.item("stroke", parseStroke),
    P.item("fill", parseFill),
    P.pair("uuid", T.string)
  );
}
__name(parseTextBox, "parseTextBox");
function parseImage(expr) {
  const parsed = parse_expr(
    expr,
    P.start("image"),
    P.item("at", parseAt),
    P.pair("data", T.string),
    P.pair("scale", T.number),
    P.pair("uuid", T.string)
  );
  let data = "";
  for (const it of expr) {
    if (Array.isArray(it) && it.length && it[0] === "data") {
      data = it.slice(1).join("");
      break;
    }
  }
  return {
    ...parsed,
    data,
    ppi: null,
    scale: typeof parsed["scale"] === "number" ? parsed["scale"] : 1
  };
}
__name(parseImage, "parseImage");
function parseNetLabel(expr) {
  return parse_expr(
    expr,
    P.start("label"),
    P.positional("text", T.string),
    P.item("at", parseAt),
    P.item("effects", parseEffects),
    P.atom("fields_autoplaced"),
    P.pair("uuid", T.string)
  );
}
__name(parseNetLabel, "parseNetLabel");
function parseProperty(expr) {
  return parse_expr(
    expr,
    P.start("property"),
    P.positional("name", T.string),
    P.positional("text", T.string),
    P.pair("id", T.number),
    P.item("at", parseAt),
    P.item("effects", parseEffects),
    P.atom("show_name"),
    P.atom("do_not_autoplace")
  );
}
__name(parseProperty, "parseProperty");
function parseGlobalLabel(expr) {
  return parse_expr(
    expr,
    P.start("global_label"),
    P.positional("text", T.string),
    P.item("at", parseAt),
    P.item("effects", parseEffects),
    P.atom("fields_autoplaced"),
    P.pair("uuid", T.string),
    P.pair("shape", T.string),
    P.collection("properties", "property", T.item(parseProperty))
  );
}
__name(parseGlobalLabel, "parseGlobalLabel");
function parseHierarchicalLabel(expr) {
  return parse_expr(
    expr,
    P.start("hierarchical_label"),
    P.positional("text", T.string),
    P.item("at", parseAt),
    P.item("effects", parseEffects),
    P.atom("fields_autoplaced"),
    P.pair("uuid", T.string),
    P.pair("shape", T.string)
  );
}
__name(parseHierarchicalLabel, "parseHierarchicalLabel");
function parsePinAlternate(expr) {
  return parse_expr(
    expr,
    P.start("alternate"),
    P.positional("name", T.string),
    P.positional("type", T.string),
    P.positional("shape", T.string)
  );
}
__name(parsePinAlternate, "parsePinAlternate");
function parsePin(expr) {
  return parse_expr(
    expr,
    P.start("pin"),
    P.positional("type", T.string),
    P.positional("shape", T.string),
    P.atom("hide"),
    P.item("at", parseAt),
    P.pair("length", T.number),
    P.object(
      "name",
      {},
      P.start("name"),
      P.positional("text", T.string),
      P.item("effects", parseEffects)
    ),
    P.object(
      "number",
      {},
      P.start("number"),
      P.positional("text", T.string),
      P.item("effects", parseEffects)
    ),
    P.collection("alternates", "alternate", T.item(parsePinAlternate))
  );
}
__name(parsePin, "parsePin");
function parsePinInstance(expr) {
  return parse_expr(
    expr,
    P.start("pin"),
    P.positional("number", T.string),
    P.pair("uuid", T.string),
    P.pair("alternate", T.string)
  );
}
__name(parsePinInstance, "parsePinInstance");
function parseLibSymbol(expr) {
  return parse_expr(
    expr,
    P.start("symbol"),
    P.positional("name", T.string),
    P.atom("power"),
    P.object("pin_numbers", {}, P.start("pin_numbers"), P.atom("hide")),
    P.object(
      "pin_names",
      {},
      P.start("pin_names"),
      P.pair("offset", T.number),
      P.atom("hide")
    ),
    P.pair("exclude_from_sim", T.boolean),
    P.pair("in_bom", T.boolean),
    P.pair("embedded_fonts", T.boolean),
    P.pair("embedded_files", T.string),
    // T.any in original, string likely
    P.pair("on_board", T.boolean),
    P.collection("properties", "property", T.item(parseProperty)),
    P.collection("pins", "pin", T.item(parsePin)),
    P.collection("children", "symbol", T.item(parseLibSymbol)),
    // Recursion!
    P.collection("drawings", "arc", T.item(parseArc2)),
    P.collection("drawings", "bezier", T.item(parseBezier)),
    P.collection("drawings", "circle", T.item(parseCircle2)),
    P.collection("drawings", "polyline", T.item(parsePolyline)),
    P.collection("drawings", "rectangle", T.item(parseRectangle)),
    P.collection("drawings", "text", T.item(parseText)),
    P.collection("drawings", "textbox", T.item(parseTextBox))
  );
}
__name(parseLibSymbol, "parseLibSymbol");
function parseSchematicSymbol(expr) {
  const parsed = parse_expr(
    expr,
    P.start("symbol"),
    P.pair("lib_name", T.string),
    P.pair("lib_id", T.string),
    P.item("at", parseAt),
    P.pair("mirror", T.string),
    P.pair("exclude_from_sim", T.boolean),
    P.pair("unit", T.number),
    P.pair("convert", T.number),
    P.pair("in_bom", T.boolean),
    P.pair("on_board", T.boolean),
    P.pair("dnp", T.boolean),
    P.atom("fields_autoplaced"),
    P.pair("uuid", T.string),
    P.collection("properties", "property", T.item(parseProperty)),
    P.collection("pins", "pin", T.item(parsePinInstance)),
    P.object(
      "default_instance",
      {},
      P.start("default_instance"),
      P.pair("reference", T.string),
      P.pair("unit", T.string),
      P.pair("value", T.string),
      P.pair("footprint", T.string)
    ),
    P.object(
      "instances",
      {},
      P.start("instances"),
      P.collection(
        "projects",
        "project",
        T.object(
          null,
          P.start("project"),
          P.positional("name", T.string),
          P.collection(
            "paths",
            "path",
            T.object(
              null,
              P.start("path"),
              P.positional("path", T.string),
              P.pair("reference", T.string),
              P.pair("value", T.string),
              P.pair("unit", T.number),
              P.pair("footprint", T.string)
            )
          )
        )
      )
    )
  );
  return parsed;
}
__name(parseSchematicSymbol, "parseSchematicSymbol");
function parseSheetPin(expr) {
  return parse_expr(
    expr,
    P.start("pin"),
    P.positional("name", T.string),
    P.positional("shape", T.string),
    P.item("at", parseAt),
    P.item("effects", parseEffects),
    P.pair("uuid", T.string)
  );
}
__name(parseSheetPin, "parseSheetPin");
function parseSchematicSheet(expr) {
  const parsed = parse_expr(
    expr,
    P.start("sheet"),
    P.item("at", parseAt),
    P.vec2("size"),
    P.atom("fields_autoplaced"),
    P.item("stroke", parseStroke),
    P.item("fill", parseFill),
    P.pair("uuid", T.string),
    P.collection("properties", "property", T.item(parseProperty)),
    P.collection("pins", "pin", T.item(parseSheetPin)),
    P.object(
      "instances",
      {},
      P.start("instances"),
      P.collection(
        "projects",
        "project",
        T.object(
          null,
          P.start("project"),
          P.positional("name", T.string),
          P.collection(
            "paths",
            "path",
            T.object(
              null,
              P.start("path"),
              P.positional("path", T.string),
              P.pair("page", T.string)
            )
          )
        )
      )
    )
  );
  return parsed;
}
__name(parseSchematicSheet, "parseSchematicSheet");
function parseSheetInstances(expr) {
  const parsed = parse_expr(
    expr,
    P.start("sheet_instances"),
    P.collection(
      "paths",
      "path",
      T.object(
        null,
        P.start("path"),
        P.positional("path", T.string),
        P.pair("page", T.string)
      )
    )
  );
  return parsed["paths"];
}
__name(parseSheetInstances, "parseSheetInstances");
function parseSymbolInstances(expr) {
  const parsed = parse_expr(
    expr,
    P.start("symbol_instances"),
    P.collection(
      "paths",
      "path",
      T.object(
        null,
        P.start("path"),
        P.positional("path", T.string),
        P.pair("reference", T.string),
        P.pair("unit", T.number),
        P.pair("value", T.string),
        P.pair("footprint", T.string)
      )
    )
  );
  return parsed["paths"];
}
__name(parseSymbolInstances, "parseSymbolInstances");
var SchematicParser = class {
  static {
    __name(this, "SchematicParser");
  }
  parse(text) {
    const expr = listify(text);
    const root = expr.length === 1 && Array.isArray(expr[0]) ? expr[0] : expr;
    return parse_expr(
      root,
      P.start("kicad_sch"),
      P.pair("version", T.number),
      P.pair("generator", T.string),
      P.pair("generator_version", T.string),
      P.pair("uuid", T.string),
      P.item("paper", parsePaper),
      P.pair("embedded_fonts", T.boolean),
      P.item("title_block", parseTitleBlock),
      // lib_symbols parsed as collection of symbols inside lib_symbols item
      P.item("lib_symbols", (e) => {
        return parse_expr(
          e,
          P.start("lib_symbols"),
          P.collection(
            "symbols",
            "symbol",
            T.item(parseLibSymbol)
          )
        )["symbols"];
      }),
      P.collection("wires", "wire", T.item(parseWire)),
      P.collection("buses", "bus", T.item(parseBus)),
      P.collection("bus_entries", "bus_entry", T.item(parseBusEntry)),
      P.collection("bus_aliases", "bus_alias", T.item(parseBusAlias)),
      P.collection("junctions", "junction", T.item(parseJunction)),
      P.collection("no_connects", "no_connect", T.item(parseNoConnect)),
      P.collection("net_labels", "label", T.item(parseNetLabel)),
      P.collection(
        "global_labels",
        "global_label",
        T.item(parseGlobalLabel)
      ),
      P.collection(
        "hierarchical_labels",
        "hierarchical_label",
        T.item(parseHierarchicalLabel)
      ),
      P.collection("symbols", "symbol", T.item(parseSchematicSymbol)),
      P.collection("drawings", "polyline", T.item(parsePolyline)),
      P.collection("drawings", "rectangle", T.item(parseRectangle)),
      P.collection("drawings", "arc", T.item(parseArc2)),
      P.collection("drawings", "text", T.item(parseText)),
      P.collection("images", "image", T.item(parseImage)),
      P.item("sheet_instances", parseSheetInstances),
      P.item("symbol_instances", parseSymbolInstances),
      P.collection("sheets", "sheet", T.item(parseSchematicSheet))
    );
  }
};

// ../kicad-parser/src/drawing_sheet_parser.ts
var common_defs = [
  P.pair("name", T.string),
  P.pair("comment", T.string),
  P.pair("option", T.string),
  P.pair("repeat", T.number),
  P.pair("incrx", T.number),
  P.pair("incry", T.number),
  P.pair("linewidth", T.number)
];

// src/kicanvas/parser.worker.ts
var ParserWorker = class {
  static {
    __name(this, "ParserWorker");
  }
  parse_board(buf) {
    const content = new TextDecoder().decode(buf);
    return new BoardParser().parse(content);
  }
  parse_schematic(buf) {
    const content = new TextDecoder().decode(buf);
    return new SchematicParser().parse(content);
  }
};
expose(new ParserWorker());
export {
  ParserWorker
};
/*! Bundled license information:

comlink/dist/esm/comlink.mjs:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
//# sourceMappingURL=parser.worker.js.map
