(() => {
  // node_modules/@launchdarkly/js-client-sdk/dist/index.js
  var Di = Object.defineProperty;
  var ki = Object.defineProperties;
  var Si = Object.getOwnPropertyDescriptors;
  var ne = Object.getOwnPropertySymbols;
  var Wn = Object.prototype.hasOwnProperty;
  var Yn = Object.prototype.propertyIsEnumerable;
  var Jn = (n5, t, e) => t in n5 ? Di(n5, t, { enumerable: true, configurable: true, writable: true, value: e }) : n5[t] = e;
  var E = (n5, t) => {
    for (var e in t || (t = {})) Wn.call(t, e) && Jn(n5, e, t[e]);
    if (ne) for (var e of ne(t)) Yn.call(t, e) && Jn(n5, e, t[e]);
    return n5;
  };
  var U = (n5, t) => ki(n5, Si(t));
  var re = (n5, t) => {
    var e = {};
    for (var r in n5) Wn.call(n5, r) && t.indexOf(r) < 0 && (e[r] = n5[r]);
    if (n5 != null && ne) for (var r of ne(n5)) t.indexOf(r) < 0 && Yn.call(n5, r) && (e[r] = n5[r]);
    return e;
  };
  function Ii(n5) {
    return `/${n5.replace(/~/g, "~0").replace(/\//g, "~1")}`;
  }
  function sr(n5) {
    return n5.indexOf("~") ? n5.replace(/~1/g, "/").replace(/~0/g, "~") : n5;
  }
  function Ci(n5) {
    return (n5.startsWith("/") ? n5.substring(1) : n5).split("/").map((e) => sr(e));
  }
  function Fi(n5) {
    return !n5.startsWith("/");
  }
  function Ti(n5) {
    return !n5.match(/\/\/|(^\/.*~[^0|^1])|~$/);
  }
  var at = class {
    constructor(t, e = false) {
      if (e) {
        let r = t;
        this.y = [r], this.isValid = r !== "", this.redactionName = r.startsWith("/") ? Ii(r) : r;
      } else {
        if (this.redactionName = t, t === "" || t === "/" || !Ti(t)) {
          this.isValid = false, this.y = [];
          return;
        }
        Fi(t) ? this.y = [t] : t.indexOf("/", 1) < 0 ? this.y = [sr(t.slice(1))] : this.y = Ci(t), this.y[0] === "_meta" ? this.isValid = false : this.isValid = true;
      }
    }
    get(t) {
      let { y: e, isValid: r } = this;
      if (!r) return;
      let i = t;
      for (let s = 0; s < e.length; s += 1) {
        let a = e[s];
        if (i != null && Object.prototype.hasOwnProperty.call(i, a) && typeof i == "object" && !Array.isArray(i)) i = i[a];
        else return;
      }
      return i;
    }
    getComponent(t) {
      return this.y[t];
    }
    get depth() {
      return this.y.length;
    }
    get isKind() {
      return this.y.length === 1 && this.y[0] === "kind";
    }
    compare(t) {
      return this.depth === t.depth && this.y.every((e, r) => e === t.getComponent(r));
    }
    get components() {
      return [...this.y];
    }
  };
  at.InvalidReference = new at("");
  var Ue = class {
    is(t) {
      if (Array.isArray(t)) return false;
      let r = typeof t;
      return r === "function" || r === "object";
    }
    getType() {
      return "factory method or object";
    }
  };
  var ot = class {
    constructor(t, e) {
      this.mt = t, this.typeOf = typeof e;
    }
    is(t) {
      return Array.isArray(t) ? false : typeof t === this.typeOf;
    }
    getType() {
      return this.mt;
    }
  };
  var ae = class {
    constructor(t, e) {
      this.mt = t, this.typeOf = typeof e;
    }
    is(t) {
      return Array.isArray(t) ? t.length > 0 ? t.every((e) => typeof e === this.typeOf) : true : false;
    }
    getType() {
      return this.mt;
    }
  };
  var Ft = class extends ot {
    constructor(t) {
      super(`number with minimum value of ${t}`, 0), this.min = t;
    }
    is(t) {
      return typeof t === this.typeOf && t >= this.min;
    }
  };
  var oe = class extends ot {
    constructor(t) {
      super(`string matching ${t}`, ""), this.expression = t;
    }
    is(t) {
      return typeof t == "string" && !!t.match(this.expression);
    }
  };
  var _e = class {
    is(t) {
      return typeof t == "function";
    }
    getType() {
      return "function";
    }
  };
  var je = class {
    is(t) {
      return typeof t == "boolean" || typeof t == "undefined" || t === null;
    }
    getType() {
      return "boolean | undefined | null";
    }
  };
  var xi = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d\d*)?(Z|[-+]\d\d(:\d\d)?)/;
  var ze = class {
    is(t) {
      return typeof t == "number" || typeof t == "string" && xi.test(t);
    }
    getType() {
      return "date";
    }
  };
  var Ve = class extends oe {
    constructor() {
      super(/^(\w|\.|-)+$/);
    }
    is(t) {
      return super.is(t) && t !== "kind";
    }
  };
  var Be = class {
    constructor(t) {
      this.Xt = t;
    }
    is(t) {
      return typeof t == "string" && this.Xt.includes(t);
    }
    getType() {
      return this.Xt.join(" | ");
    }
  };
  function X(n5) {
    return n5 == null;
  }
  var p = class {
    static createTypeArray(t, e) {
      return new ae(t, e);
    }
    static numberWithMin(t) {
      return new Ft(t);
    }
    static stringMatchingRegex(t) {
      return new oe(t);
    }
    static oneOf(...t) {
      return new Be(t);
    }
  };
  p.String = new ot("string", "");
  p.Number = new ot("number", 0);
  p.ObjectOrFactory = new Ue();
  p.Object = new ot("object", {});
  p.StringArray = new ae("string[]", "");
  p.Boolean = new ot("boolean", true);
  p.Function = new _e();
  p.Date = new ze();
  p.Kind = new Ve();
  p.NullableBoolean = new je();
  function ar(n5) {
    return "kind" in n5 ? p.String.is(n5.kind) && n5.kind !== "multi" : false;
  }
  function or(n5) {
    return "kind" in n5 ? p.String.is(n5.kind) && n5.kind === "multi" : false;
  }
  function cr(n5) {
    return !("kind" in n5) || n5.kind === null || n5.kind === void 0;
  }
  function ce(n5, t = []) {
    if (n5 === null || typeof n5 != "object") return JSON.stringify(n5);
    if (t.includes(n5)) throw new Error("Cycle detected");
    return Array.isArray(n5) ? `[${n5.map((i) => ce(i, [...t, n5])).map((i) => i === void 0 ? "null" : i).join(",")}]` : `{${Object.keys(n5).sort().map((r) => {
      let i = ce(n5[r], [...t, n5]);
      if (i !== void 0) return `${JSON.stringify(r)}:${i}`;
    }).filter((r) => r !== void 0).join(",")}}`;
  }
  var He = "user";
  function Xn(n5) {
    return n5.includes("%") || n5.includes(":") ? n5.replace(/%/g, "%25").replace(/:/g, "%3A") : n5;
  }
  function Li(n5) {
    return n5 && p.Object.is(n5);
  }
  function Zn(n5) {
    return p.Kind.is(n5);
  }
  function Qn(n5) {
    return p.String.is(n5) && n5 !== "";
  }
  function Ne(n5, t = false) {
    return n5 ? n5.map((e) => new at(e, t)) : [];
  }
  function Mi(n5) {
    return n5 != null;
  }
  function Pi(n5) {
    let t = U(E({}, n5.custom || []), { kind: "user", key: String(n5.key) });
    if (Mi(n5.anonymous)) {
      let e = !!n5.anonymous;
      delete t.anonymous, t.anonymous = e;
    }
    return n5.name !== null && n5.name !== void 0 && (t.name = n5.name), n5.ip !== null && n5.ip !== void 0 && (t.ip = n5.ip), n5.firstName !== null && n5.firstName !== void 0 && (t.firstName = n5.firstName), n5.lastName !== null && n5.lastName !== void 0 && (t.lastName = n5.lastName), n5.email !== null && n5.email !== void 0 && (t.email = n5.email), n5.avatar !== null && n5.avatar !== void 0 && (t.avatar = n5.avatar), n5.country !== null && n5.country !== void 0 && (t.country = n5.country), n5.privateAttributeNames !== null && n5.privateAttributeNames !== void 0 && (t._meta = { privateAttributes: n5.privateAttributeNames }), t;
  }
  var Y = class n {
    constructor(t, e, r) {
      this.F = false, this.Q = false, this.Zt = false, this.P = {}, this.kind = e, this.valid = t, this.message = r;
    }
    static D(t, e) {
      return new n(false, t, e);
    }
    static Ne(t, e) {
      if (!(!e || !t.isValid)) return t.depth === 1 && t.getComponent(0) === "anonymous" ? !!(e != null && e.anonymous) : t.get(e);
    }
    Qt(t) {
      if (this.F) return this.P[t];
      if (this.kind === t) return this.v;
    }
    static Re(t) {
      let e = Object.keys(t).filter((c) => c !== "kind"), r = e.every(Zn);
      if (!e.length) return n.D("multi", "A multi-kind context must contain at least one kind");
      if (!r) return n.D("multi", "Context contains invalid kinds");
      let i = {}, s = true, a = e.reduce((c, l) => {
        var d;
        let u = t[l];
        return Li(u) ? (c[l] = u, i[l] = Ne((d = u._meta) == null ? void 0 : d.privateAttributes)) : s = false, c;
      }, {});
      if (!s) return n.D("multi", "Context contained contexts that were not objects");
      if (!Object.values(a).every((c) => Qn(c.key))) return n.D("multi", "Context contained invalid keys");
      if (e.length === 1) {
        let c = e[0], l = new n(true, c);
        return l.v = U(E({}, a[c]), { kind: c }), l.tt = i, l.Q = c === "user", l;
      }
      let o = new n(true, t.kind);
      return o.P = a, o.tt = i, o.F = true, o;
    }
    static Ue(t) {
      var c;
      let { key: e, kind: r } = t, i = Zn(r), s = Qn(e);
      if (!i) return n.D(r != null ? r : "unknown", "The kind was not valid for the context");
      if (!s) return n.D(r, "The key for the context was not valid");
      let a = Ne((c = t._meta) == null ? void 0 : c.privateAttributes), o = new n(true, r);
      return o.Q = r === "user", o.v = t, o.tt = { [r]: a }, o;
    }
    static _e(t) {
      if (!(t.key !== void 0 && t.key !== null)) return n.D("user", "The key for the context was not valid");
      let r = new n(true, "user");
      return r.Q = true, r.Zt = true, r.v = Pi(t), r.tt = { user: Ne(t.privateAttributeNames, true) }, r;
    }
    static fromLDContext(t) {
      return t ? ar(t) ? n.Ue(t) : or(t) ? n.Re(t) : cr(t) ? n._e(t) : n.D("unknown", "Context was not of a valid kind") : n.D("unknown", "No context specified. Returning default value");
    }
    static toLDContext(t) {
      if (!t.valid) return;
      let e = t.getContexts();
      if (!t.F) return e[0][1];
      let r = { kind: "multi" };
      return e.forEach((i) => {
        let s = i[0], a = i[1];
        r[s] = a;
      }), r;
    }
    valueForKind(t, e = He) {
      return t.isKind ? this.kinds : n.Ne(t, this.Qt(e));
    }
    key(t = He) {
      var e;
      return (e = this.Qt(t)) == null ? void 0 : e.key;
    }
    get isMultiKind() {
      return this.F;
    }
    get canonicalKey() {
      return this.Q ? this.v.key : this.F ? Object.keys(this.P).sort().map((t) => `${t}:${Xn(this.P[t].key)}`).join(":") : `${this.kind}:${Xn(this.v.key)}`;
    }
    get kinds() {
      return this.F ? Object.keys(this.P) : [this.kind];
    }
    get kindsAndKeys() {
      return this.F ? Object.entries(this.P).reduce((t, [e, r]) => (t[e] = r.key, t), {}) : { [this.kind]: this.v.key };
    }
    privateAttributes(t) {
      var e;
      return ((e = this.tt) == null ? void 0 : e[t]) || [];
    }
    getContexts() {
      return this.F ? Object.entries(this.P) : [[this.kind, this.v]];
    }
    get legacy() {
      return this.Zt;
    }
    canonicalUnfilteredJson() {
      if (this.valid) {
        if (this.yt) return this.yt;
        try {
          this.yt = ce(n.toLDContext(this));
        } catch (t) {
        }
        return this.yt;
      }
    }
  };
  Y.UserKind = He;
  var Ai = ["key", "kind", "_meta", "anonymous"].map((n5) => new at(n5, true));
  var Oi = ["name", "ip", "firstName", "lastName", "email", "avatar", "country"];
  function $i(n5, t) {
    return n5.depth === t.length && t.every((e, r) => e === n5.getComponent(r));
  }
  function Ni(n5, t) {
    let e = [], r = {}, i = [];
    for (e.push(...Object.keys(n5).map((s) => ({ key: s, ptr: [s], source: n5, parent: r, visited: [n5] }))); e.length; ) {
      let s = e.pop(), a = t.find((o) => $i(o, s.ptr));
      if (a) i.push(a.redactionName);
      else {
        let o = s.source[s.key];
        o === null ? s.parent[s.key] = o : Array.isArray(o) ? s.parent[s.key] = [...o] : typeof o == "object" ? s.visited.includes(o) || (s.parent[s.key] = {}, e.push(...Object.keys(o).map((c) => ({ key: c, ptr: [...s.ptr, c], source: o, parent: s.parent[s.key], visited: [...s.visited, o] })))) : s.parent[s.key] = o;
      }
    }
    return { cloned: r, excluded: i.sort() };
  }
  var Ge = class {
    constructor(t, e) {
      this.je = t, this.ze = e;
    }
    filter(t, e = false) {
      let r = t.getContexts();
      if (r.length === 1) return this.te(t, r[0][1], r[0][0], e);
      let i = { kind: "multi" };
      return r.forEach(([s, a]) => {
        i[s] = this.te(t, a, s, e);
      }), i;
    }
    Ve(t, e, r, i) {
      return (i ? Object.keys(e).map((s) => new at(s, true)) : [...this.ze, ...t.privateAttributes(r)]).filter((s) => !Ai.some((a) => a.compare(s)));
    }
    te(t, e, r, i) {
      let s = this.je || i && e.anonymous === true, { cloned: a, excluded: o } = Ni(e, this.Ve(t, e, r, s));
      return t.legacy && Oi.forEach((c) => {
        c in a && (a[c] = String(a[c]));
      }), o.length && (a._meta || (a._meta = {}), a._meta.redactedAttributes = o), a._meta && (delete a._meta.privateAttributes, Object.keys(a._meta).length === 0 && delete a._meta), a;
    }
  };
  var tr = 30 * 1e3;
  var Ri = 0.5;
  var le = class {
    constructor(t, e, r = Math.random) {
      this.Be = e, this.He = r, this.gt = 0, this.ee = Math.max(1, t), this.Ge = Math.ceil(Math.log2(tr / this.ee));
    }
    T() {
      let t = Math.min(this.gt, this.Ge), e = this.ee * 2 ** t;
      return Math.min(e, tr);
    }
    qe(t) {
      return t - Math.trunc(this.He() * Ri * t);
    }
    success(t = Date.now()) {
      this.vt = t;
    }
    fail(t = Date.now()) {
      this.vt !== void 0 && t - this.vt > this.Be && (this.gt = 0), this.vt = void 0;
      let e = this.qe(this.T());
      return this.gt += 1, e;
    }
  };
  var er;
  (function(n5) {
    n5[n5.Valid = 0] = "Valid", n5[n5.Initializing = 1] = "Initializing", n5[n5.Interrupted = 2] = "Interrupted", n5[n5.Closed = 3] = "Closed";
  })(er || (er = {}));
  var ft = class extends Error {
    constructor(t, e, r, i = true) {
      super(e), this.kind = t, this.status = r, this.name = "LaunchDarklyPollingError", this.recoverable = i;
    }
  };
  var wt = class extends Error {
    constructor(t, e, r, i = true) {
      super(e), this.kind = t, this.code = r, this.name = "LaunchDarklyStreamingError", this.recoverable = i;
    }
  };
  var eo = 120 * 1e3;
  var no = 300 * 1e3;
  var O;
  (function(n5) {
    n5.Unknown = "UNKNOWN", n5.NetworkError = "NETWORK_ERROR", n5.ErrorResponse = "ERROR_RESPONSE", n5.InvalidData = "INVALID_DATA";
  })(O || (O = {}));
  var Tt = class extends Error {
    constructor(t) {
      super(t), this.name = "LaunchDarklyUnexpectedResponseError";
    }
  };
  var ue = class extends Error {
    constructor(t) {
      super(t), this.name = "LaunchDarklyClientError";
    }
  };
  var xt = class extends Error {
    constructor(t) {
      super(t), this.name = "LaunchDarklyTimeoutError";
    }
  };
  var Ui = [400, 408, 429];
  function _i(n5) {
    return n5 >= 400 && n5 < 500 && !Ui.includes(n5) ? "unexpected" : "normal";
  }
  function mt(n5) {
    return _i(n5) === "normal";
  }
  function ji(n5) {
    return n5 === 413 ? true : mt(n5);
  }
  function rn(n5, t) {
    let e, r;
    return { promise: new Promise((s, a) => {
      r = s, e = setTimeout(() => {
        let o = `${t} timed out after ${n5} seconds.`;
        a(new xt(o));
      }, n5 * 1e3);
    }), cancel: () => {
      r(), clearTimeout(e);
    } };
  }
  function sn(n5) {
    return n5 == null ? n5 : JSON.parse(JSON.stringify(n5));
  }
  function be(n5) {
    return Math.trunc(n5 * 1e3);
  }
  var zi = (n5) => JSON.stringify(n5) === "{}";
  var Ee = (n5, t) => n5 && Object.entries(n5).reduce((e, [r, i]) => (i && !zi(i) && !(t != null && t.includes(r)) && (e[r] = typeof i == "object" ? Ee(i, t) : i), e), {});
  function Ct(n5, t) {
    if (n5 === t) return true;
    if (n5 && t && typeof n5 == "object" && typeof t == "object") {
      if (n5.constructor !== t.constructor) return false;
      var e, r, i;
      if (Array.isArray(n5)) {
        if (e = n5.length, e != t.length) return false;
        for (r = e; r-- !== 0; ) if (!Ct(n5[r], t[r])) return false;
        return true;
      }
      if (n5 instanceof Map && t instanceof Map) {
        if (n5.size !== t.size) return false;
        for (r of n5.entries()) if (!t.has(r[0])) return false;
        for (r of n5.entries()) if (!Ct(r[1], t.get(r[0]))) return false;
        return true;
      }
      if (n5 instanceof Set && t instanceof Set) {
        if (n5.size !== t.size) return false;
        for (r of n5.entries()) if (!t.has(r[0])) return false;
        return true;
      }
      if (ArrayBuffer.isView(n5) && ArrayBuffer.isView(t)) {
        if (e = n5.length, e != t.length) return false;
        for (r = e; r-- !== 0; ) if (n5[r] !== t[r]) return false;
        return true;
      }
      if (n5.constructor === RegExp) return n5.source === t.source && n5.flags === t.flags;
      if (n5.valueOf !== Object.prototype.valueOf) return n5.valueOf() === t.valueOf();
      if (n5.toString !== Object.prototype.toString) return n5.toString() === t.toString();
      if (i = Object.keys(n5), e = i.length, e !== Object.keys(t).length) return false;
      for (r = e; r-- !== 0; ) if (!Object.prototype.hasOwnProperty.call(t, i[r])) return false;
      for (r = e; r-- !== 0; ) {
        var s = i[r];
        if (!Ct(n5[s], t[s])) return false;
      }
      return true;
    }
    return n5 !== n5 && t !== t;
  }
  function lr(n5, t, e, r = true, i = "user-agent", s) {
    let { userAgentBase: a, version: o, wrapperName: c, wrapperVersion: l } = t.sdkData(), u = { [i]: `${a != null ? a : "NodeJSClient"}/${o}` };
    return r && (u.authorization = n5), c && (u["x-launchdarkly-wrapper"] = l ? `${c}/${l}` : c), e != null && e.value && (u["x-launchdarkly-tags"] = e.value), s && (u["x-launchdarkly-instance-id"] = s), u;
  }
  function K(n5, t, e) {
    let r;
    n5.status ? r = `error ${n5.status}${n5.status === 401 ? " (invalid SDK key)" : ""}` : r = `I/O error (${n5.message || "unknown error"})`;
    let i = e != null ? e : "giving up permanently";
    return `Received ${r} for ${t} - ${i}`;
  }
  function Pt({ status: n5 }) {
    return n5 ? mt(n5) : true;
  }
  var At = (n5, t) => t.btoa(n5).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  var Ot = async (n5 = 1e3) => new Promise((t) => {
    setTimeout(t, n5);
  });
  var ro = 300 * 1e3;
  var io = 3600 * 1e3;
  var so = 30 * 1e3;
  var ao = 60 * 1e3;
  var oo = 30 * 1e3;
  var bt;
  (function(n5) {
    n5[n5.Disabled = 0] = "Disabled", n5[n5.Enabled = 1] = "Enabled";
  })(bt || (bt = {}));
  var Et;
  (function(n5) {
    n5[n5.AnalyticsEvents = 0] = "AnalyticsEvents", n5[n5.DiagnosticEvent = 1] = "DiagnosticEvent";
  })(Et || (Et = {}));
  var ht;
  (function(n5) {
    n5[n5.Succeeded = 0] = "Succeeded", n5[n5.Failed = 1] = "Failed", n5[n5.FailedAndMustShutDown = 2] = "FailedAndMustShutDown";
  })(ht || (ht = {}));
  function vt(n5) {
    if (typeof n5 == "string") return n5;
    if (n5 === void 0) return "undefined";
    if (n5 === null) return "null";
    if (Object.prototype.hasOwnProperty.call(n5, "toString")) try {
      return n5.toString();
    } catch (t) {
    }
    if (typeof n5 == "bigint") return `${n5}n`;
    try {
      return JSON.stringify(n5);
    } catch (t) {
      return t instanceof TypeError && t.message.indexOf("circular") >= 0 ? "[Circular]" : "[Not Stringifiable]";
    }
  }
  function Vi(n5) {
    return typeof n5 == "symbol" ? "NaN" : typeof n5 == "bigint" ? `${n5}n` : String(Number(n5));
  }
  function Bi(n5) {
    return typeof n5 == "symbol" ? "NaN" : typeof n5 == "bigint" ? `${n5}n` : String(parseInt(n5, 10));
  }
  function Hi(n5) {
    return typeof n5 == "symbol" ? "NaN" : String(parseFloat(n5));
  }
  var ie = { s: (n5) => vt(n5), d: (n5) => Vi(n5), i: (n5) => Bi(n5), f: (n5) => Hi(n5), j: (n5) => vt(n5), o: (n5) => vt(n5), O: (n5) => vt(n5), c: () => "" };
  function qe(...n5) {
    var e;
    let t = n5[0];
    if (p.String.is(t)) {
      n5.shift();
      let r = "", i = 0;
      for (; i < t.length; ) {
        let s = t.charAt(i);
        if (s === "%") if (i + 1 < t.length) {
          let o = t.charAt(i + 1);
          if (o in ie && n5.length) {
            let c = n5.shift();
            r += (e = ie[o]) == null ? void 0 : e.call(ie, c);
          } else o === "%" ? r += "%" : r += `%${o}`;
          i += 2;
        } else r += "%", i += 1;
        else r += s, i += 1;
      }
      return n5.length && (r.length && (r += " "), r += n5.map(vt).join(" ")), r;
    }
    return n5.map(vt).join(" ");
  }
  var V;
  (function(n5) {
    n5[n5.debug = 0] = "debug", n5[n5.info = 1] = "info", n5[n5.warn = 2] = "warn", n5[n5.error = 3] = "error", n5[n5.none = 4] = "none";
  })(V || (V = {}));
  var Gi = ["debug", "info", "warn", "error", "none"];
  var pt = class n2 {
    static get() {
      return new n2({});
    }
    constructor(t) {
      var e, r, i;
      if (this.tn = (r = V[(e = t.level) != null ? e : "info"]) != null ? r : V.info, this.en = (i = t.name) != null ? i : "LaunchDarkly", this.se = t.formatter, typeof t.destination == "object") this.ae = { [V.debug]: t.destination.debug, [V.info]: t.destination.info, [V.warn]: t.destination.warn, [V.error]: t.destination.error };
      else if (typeof t.destination == "function") {
        let { destination: s } = t;
        this.ae = { [V.debug]: s, [V.info]: s, [V.warn]: s, [V.error]: s };
      }
    }
    nn(...t) {
      var e;
      try {
        return this.se ? (e = this.se) == null ? void 0 : e.call(this, ...t) : qe(...t);
      } catch (r) {
        return qe(...t);
      }
    }
    rn(t, e) {
      try {
        t(e);
      } catch (r) {
        console.error(e);
      }
    }
    k(t, e) {
      var r;
      if (t >= this.tn) {
        let i = `${Gi[t]}: [${this.en}]`;
        try {
          let s = (r = this.ae) == null ? void 0 : r[t];
          s ? this.rn(s, `${i} ${this.nn(...e)}`) : console.error(...e);
        } catch (s) {
          console.error(...e);
        }
      }
    }
    error(...t) {
      this.k(V.error, t);
    }
    warn(...t) {
      this.k(V.warn, t);
    }
    info(...t) {
      this.k(V.info, t);
    }
    debug(...t) {
      this.k(V.debug, t);
    }
  };
  var qi = { error: p.Function, warn: p.Function, info: p.Function, debug: p.Function };
  var Lt = class {
    constructor(t, e) {
      Object.entries(qi).forEach(([r, i]) => {
        if (!i.is(t[r])) throw new Error(`Provided logger instance must support logger.${r}(...) method`);
      }), this.t = t, this.sn = e;
    }
    k(t, e) {
      try {
        this.t[t](...e);
      } catch (r) {
        this.sn[t](...e);
      }
    }
    error(...t) {
      this.k("error", t);
    }
    warn(...t) {
      this.k("warn", t);
    }
    info(...t) {
      this.k("info", t);
    }
    debug(...t) {
      this.k("debug", t);
    }
  };
  var an = (n5) => {
    let t = new pt({ level: "info", destination: console.error, formatter: qe });
    return n5 ? new Lt(n5, t) : t;
  };
  var $ = class {
    static deprecated(t, e) {
      return `"${t}" is deprecated, please use "${e}"`;
    }
    static optionBelowMinimum(t, e, r) {
      return `Config option "${t}" had invalid value of ${e}, using minimum of ${r} instead`;
    }
    static unknownOption(t) {
      return `Ignoring unknown config option "${t}"`;
    }
    static wrongOptionType(t, e, r) {
      return `Config option "${t}" should be of type ${e}, got ${r}, using default value`;
    }
    static wrongOptionTypeBoolean(t, e) {
      return `Config option "${t}" should be a boolean, got ${e}, converting to boolean`;
    }
    static invalidTagValue(t) {
      return `Config option "${t}" must only contain letters, numbers, ., _ or -.`;
    }
    static tagValueTooLong(t) {
      return `Value of "${t}" was longer than 64 characters and was discarded.`;
    }
    static partialEndpoint(t) {
      return `You have set custom uris without specifying the ${t} URI; connections may not work properly`;
    }
  };
  var Ki = /^(\w|\.|-)+$/;
  var Ji = p.stringMatchingRegex(Ki);
  var Wi = { is: (n5, t) => Ji.is(n5) ? n5.length > 64 ? { valid: false, message: $.tagValueTooLong(t) } : { valid: true } : { valid: false, message: $.invalidTagValue(t) } };
  var de = class {
    constructor(t) {
      let e = {}, r = t == null ? void 0 : t.application, i = t == null ? void 0 : t.logger;
      r && Object.entries(r).forEach(([a, o]) => {
        if (o != null) {
          let { valid: c, message: l } = Wi.is(o, `application.${a}`);
          c ? a === "versionName" ? e["application-version-name"] = [o] : e[`application-${a}`] = [o] : i == null || i.warn(l);
        }
      });
      let s = Object.keys(e);
      s.length && (this.value = s.sort().flatMap((a) => e[a].sort().map((o) => `${a}/${o}`)).join(" "));
    }
  };
  var he = class {
    constructor(t, e, r) {
      this.platform = r, this.basicConfiguration = { tags: e.tags, logger: e.logger, offline: e.offline, serviceEndpoints: e.serviceEndpoints, sdkKey: t };
    }
  };
  function Re(n5) {
    return n5.replace(/\/+$/, "");
  }
  function on(n5) {
    return n5.replace(/^\/+/, "").replace(/\?$/, "");
  }
  var rt = class n3 {
    constructor(t, e, r = n3.DEFAULT_EVENTS, i = "/bulk", s = "/diagnostic", a = true, o) {
      this.streaming = Re(t), this.polling = Re(e), this.events = Re(r), this.analyticsEventPath = i, this.diagnosticEventPath = s, this.includeAuthorizationHeader = a, this.payloadFilterKey = o;
    }
  };
  rt.DEFAULT_EVENTS = "https://events.launchdarkly.com";
  function cn(n5, t = []) {
    if (t.length === 0) return n5;
    let e = t.map(({ key: r, value: i }) => `${r}=${i}`);
    return `${n5}?${e.join("&")}`;
  }
  function ln(n5, t, e) {
    let r = on(t), i = [...e];
    return n5.payloadFilterKey && i.push({ key: "filter", value: n5.payloadFilterKey }), cn(`${n5.streaming}/${r}`, i);
  }
  function un(n5, t, e = []) {
    let r = on(t), i = [...e];
    return n5.payloadFilterKey && i.push({ key: "filter", value: n5.payloadFilterKey }), cn(`${n5.polling}/${r}`, i);
  }
  function nr(n5, t, e = []) {
    let r = on(t);
    return cn(`${n5.events}/${r}`, e);
  }
  var Ke = class {
    constructor(t, e, r) {
      this.a = e, this.an = r, this.Dt = [], this.oe = Date.now(), this.ce = this.oe, this.le = { diagnosticId: e.crypto.randomUUID(), sdkKeySuffix: t.length > 6 ? t.substring(t.length - 6) : t };
    }
    createInitEvent() {
      var r, i, s;
      let t = this.a.info.sdkData(), e = this.a.info.platformData();
      return { kind: "diagnostic-init", id: this.le, creationDate: this.oe, sdk: t, configuration: this.an, platform: E({ name: e.name, osArch: (r = e.os) == null ? void 0 : r.arch, osName: (i = e.os) == null ? void 0 : i.name, osVersion: (s = e.os) == null ? void 0 : s.version }, e.additional || {}) };
    }
    recordStreamInit(t, e, r) {
      let i = { timestamp: t, failed: e, durationMillis: r };
      this.Dt.push(i);
    }
    createStatsEventAndReset(t, e, r) {
      let i = Date.now(), s = { kind: "diagnostic", id: this.le, creationDate: i, dataSinceDate: this.ce, droppedEvents: t, deduplicatedUsers: e, eventsInLastBatch: r, streamInits: this.Dt };
      return this.Dt = [], this.ce = i, s;
    }
  };
  var Je;
  (function(n5) {
    n5.MalformedFlag = "MALFORMED_FLAG", n5.UserNotSpecified = "USER_NOT_SPECIFIED", n5.FlagNotFound = "FLAG_NOT_FOUND", n5.ClientNotReady = "CLIENT_NOT_READY", n5.WrongType = "WRONG_TYPE";
  })(Je || (Je = {}));
  var Yi = Je;
  var fe = class {
    static invalidMetricValue(t) {
      return `The track function was called with a non-numeric "metricValue" (${t}), only numeric metric values are supported.`;
    }
  };
  fe.MissingContextKeyNoEvent = "Context was unspecified or had no key; event will not be sent";
  var We = class {
    constructor(t, e) {
      let { basicConfiguration: r, platform: i } = t, { serviceEndpoints: { analyticsEventPath: s, diagnosticEventPath: a } } = r, { crypto: o, requests: c } = i;
      this.cn = E({}, e), this.ue = nr(r.serviceEndpoints, s, []), this.ln = nr(r.serviceEndpoints, a, []), this._ = c, this.un = o;
    }
    async nt(t, e, r, i) {
      let s = { status: ht.Succeeded }, a = U(E({}, this.cn), { "content-type": "application/json" });
      r && (a["x-launchdarkly-payload-id"] = r, a["x-launchDarkly-event-schema"] = "4");
      let o;
      try {
        let { status: c, headers: l } = await this._.fetch(e, { headers: a, body: JSON.stringify(t), compressBodyIfPossible: true, method: "POST", keepalive: true }), u = Date.parse(l.get("date") || "");
        if (u && (s.serverTime = u), c <= 204) return s;
        if (o = new Tt(K({ status: c, message: "some events were dropped" }, "event posting")), !mt(c)) return ji(c) ? s.status = ht.Failed : s.status = ht.FailedAndMustShutDown, s.error = o, s;
      } catch (c) {
        o = c;
      }
      return o && !i ? (s.status = ht.Failed, s.error = o, s) : (await Ot(), this.nt(t, this.ue, r, false));
    }
    async sendEventData(t, e) {
      let r = t === Et.AnalyticsEvents ? this.un.randomUUID() : void 0, i = t === Et.AnalyticsEvents ? this.ue : this.ln;
      return this.nt(e, i, r, true);
    }
  };
  function pe(n5) {
    return n5.kind === "feature";
  }
  function Xi(n5) {
    return n5.kind === "identify";
  }
  function Zi(n5) {
    return n5.kind === "migration_op";
  }
  var Ye = class {
    constructor(t, e, r, i, s, a) {
      this.count = t, this.key = e, this.value = r, this.version = s, this.variation = a, this.default = i;
    }
    increment() {
      this.count += 1;
    }
  };
  function Qi(n5) {
    return `${n5.key}:${n5.variation !== null && n5.variation !== void 0 ? n5.variation : ""}:${n5.version !== null && n5.version !== void 0 ? n5.version : ""}`;
  }
  var me = class {
    constructor(t = false, e) {
      this.dn = t, this.S = e, this.K = 0, this.rt = 0, this.it = {}, this.st = {};
    }
    summarizeEvent(t) {
      if (pe(t) && !t.excludeFromSummaries) {
        this.v || (this.v = t.context);
        let e = Qi(t), r = this.it[e], i = this.st[t.key];
        i || (i = /* @__PURE__ */ new Set(), this.st[t.key] = i), t.context.kinds.forEach((s) => i.add(s)), r ? r.increment() : this.it[e] = new Ye(1, t.key, t.value, t.default, t.version, t.variation), (this.K === 0 || t.creationDate < this.K) && (this.K = t.creationDate), t.creationDate > this.rt && (this.rt = t.creationDate);
      }
    }
    getSummary() {
      var r;
      let t = Object.values(this.it).reduce((i, s) => {
        let a = i[s.key];
        a || (a = { default: s.default, counters: [], contextKinds: [...this.st[s.key]] }, i[s.key] = a);
        let o = { value: s.value, count: s.count };
        return s.variation !== void 0 && s.variation !== null && (o.variation = s.variation), s.version !== void 0 && s.version !== null ? o.version = s.version : o.unknown = true, a.counters.push(o), i;
      }, {}), e = { startDate: this.K, endDate: this.rt, features: t, kind: "summary", context: this.v !== void 0 && this.dn ? (r = this.S) == null ? void 0 : r.filter(this.v) : void 0 };
      return this.hn(), e;
    }
    hn() {
      this.K = 0, this.rt = 0, this.it = {}, this.st = {};
    }
  };
  var Xe = class extends Error {
    constructor(t) {
      super(t), this.name = "LaunchDarklyInvalidSDKKeyError";
    }
  };
  var Ze = class {
    constructor(t, e) {
      this.S = t, this.t = e, this.J = {};
    }
    summarizeEvent(t) {
      var e;
      if (pe(t)) {
        let r = t.context.canonicalUnfilteredJson();
        if (!r) {
          t.context.valid && ((e = this.t) == null || e.error("Unable to serialize context, likely the context contains a cycle."));
          return;
        }
        let i = this.J[r];
        i || (this.J[r] = new me(true, this.S), i = this.J[r]), i.summarizeEvent(t);
      }
    }
    getSummaries() {
      let t = this.J;
      return this.J = {}, Object.values(t).map((e) => e.getSummary());
    }
  };
  function se(n5) {
    let t = Math.trunc(n5);
    return t === 1 ? true : t === 0 ? false : Math.floor(Math.random() * t) === 0;
  }
  function ts(n5) {
    return n5.getSummaries !== void 0;
  }
  var Qe = class {
    constructor(t, e, r, i, s, a = true, o = false) {
      this.e = t, this.at = i, this.I = s, this.ot = [], this.de = 0, this.kt = 0, this.St = 0, this.It = false, this.he = 0, this.Ct = false, this.Ft = null, this.fn = t.eventsCapacity, this.t = e.basicConfiguration.logger, this.fe = new We(e, r), this.S = new Ge(t.allAttributesPrivate, t.privateAttributes.map((c) => new at(c))), o ? this.W = new Ze(this.S, this.t) : this.W = new me(), a && this.start();
    }
    start() {
      var t, e;
      if (((t = this.at) == null ? void 0 : t.flushInterval) !== void 0 && (this.Ft = setInterval(() => {
        var r;
        (r = this.at) == null || r.flush();
      }, this.at.flushInterval * 1e3)), this.pn = setInterval(async () => {
        var r;
        try {
          await this.flush();
        } catch (i) {
          (r = this.t) == null || r.debug(`Flush failed: ${i}`);
        }
      }, this.e.flushInterval * 1e3), this.I) {
        let r = this.I.createInitEvent();
        this.pe(r), this.me = setInterval(() => {
          let i = this.I.createStatsEventAndReset(this.kt, this.St, this.he);
          this.kt = 0, this.St = 0, this.pe(i);
        }, this.e.diagnosticRecordingInterval * 1e3);
      }
      (e = this.t) == null || e.debug("Started EventProcessor.");
    }
    pe(t) {
      this.fe.sendEventData(Et.DiagnosticEvent, t);
    }
    close() {
      clearInterval(this.pn), this.Ft && clearInterval(this.Ft), this.me && clearInterval(this.me);
    }
    async flush() {
      var e;
      if (this.Ct) throw new Xe("Events cannot be posted because a permanent error has been encountered. This is most likely an invalid SDK key. The specific error information is logged independently.");
      let t = this.ot;
      if (this.ot = [], ts(this.W)) this.W.getSummaries().forEach((i) => {
        Object.keys(i.features).length && t.push(i);
      });
      else {
        let r = this.W.getSummary();
        Object.keys(r.features).length && t.push(r);
      }
      t.length && (this.he = t.length, (e = this.t) == null || e.debug("Flushing %d events", t.length), await this.nt(t));
    }
    sendEvent(t) {
      var c, l;
      if (this.Ct) return;
      if (Zi(t)) {
        if (se(t.samplingRatio)) {
          let u = U(E({}, t), { context: t.context ? this.S.filter(t.context, (c = this.e.redactAnonymousAllEvents) != null ? c : false) : void 0 });
          u.samplingRatio === 1 && delete u.samplingRatio, this.ct(u);
        }
        return;
      }
      this.W.summarizeEvent(t);
      let e = pe(t), r = e && t.trackEvents || !e, i = this.mn(t), s = Xi(t), a = (l = this.at) == null ? void 0 : l.processContext(t.context);
      a || s || (this.St += 1), a && !s && this.ct(this.Tt({ kind: "index", creationDate: t.creationDate, context: t.context, samplingRatio: 1 }, false)), r && se(t.samplingRatio) && this.ct(this.Tt(t, false)), i && se(t.samplingRatio) && this.ct(this.Tt(t, true));
    }
    Tt(t, e) {
      var r;
      switch (t.kind) {
        case "feature": {
          let i = { kind: e ? "debug" : "feature", creationDate: t.creationDate, context: this.S.filter(t.context, !e), key: t.key, value: t.value, default: t.default };
          return t.samplingRatio !== 1 && (i.samplingRatio = t.samplingRatio), t.prereqOf && (i.prereqOf = t.prereqOf), t.variation !== void 0 && (i.variation = t.variation), t.version !== void 0 && (i.version = t.version), t.reason && (i.reason = t.reason), i;
        }
        case "index":
        case "identify": {
          let i = { kind: t.kind, creationDate: t.creationDate, context: this.S.filter(t.context) };
          return t.samplingRatio !== 1 && (i.samplingRatio = t.samplingRatio), i;
        }
        case "custom": {
          let i = { kind: "custom", creationDate: t.creationDate, key: t.key, context: this.S.filter(t.context, (r = this.e.redactAnonymousAllEvents) != null ? r : false) };
          return t.samplingRatio !== 1 && (i.samplingRatio = t.samplingRatio), t.data !== void 0 && (i.data = t.data), t.metricValue !== void 0 && (i.metricValue = t.metricValue), t.url !== void 0 && (i.url = t.url), i;
        }
        case "click":
          return { kind: "click", creationDate: t.creationDate, contextKeys: t.context.kindsAndKeys, key: t.key, url: t.url, selector: t.selector };
        case "pageview":
          return { kind: "pageview", creationDate: t.creationDate, contextKeys: t.context.kindsAndKeys, key: t.key, url: t.url };
        default:
          return t;
      }
    }
    ct(t) {
      var e;
      this.ot.length < this.fn ? (this.ot.push(t), this.It = false) : (this.It || (this.It = true, (e = this.t) == null || e.warn("Exceeded event queue capacity. Increase capacity to avoid dropping events.")), this.kt += 1);
    }
    mn(t) {
      return pe(t) && t.debugEventsUntilDate && t.debugEventsUntilDate > this.de && t.debugEventsUntilDate > Date.now();
    }
    async nt(t) {
      let e = await this.fe.sendEventData(Et.AnalyticsEvents, t);
      if (e.status === ht.FailedAndMustShutDown && (this.Ct = true), e.serverTime && (this.de = e.serverTime), e.error) throw e.error;
    }
  };
  var ye = class {
    constructor(t, e, r, i, s = 1, a) {
      this.context = t, this.key = e, this.data = r, this.metricValue = i, this.samplingRatio = s, this.url = a, this.kind = "custom", this.creationDate = Date.now(), this.context = t;
    }
  };
  var Mt = class {
    constructor(t, e, r, i, s, a, o, c, l, u, d, h, m = 1) {
      this.withReasons = t, this.context = e, this.key = r, this.samplingRatio = m, this.kind = "feature", this.creationDate = Date.now(), this.value = i, this.default = s, a !== void 0 && (this.version = a), o !== void 0 && (this.variation = o), c !== void 0 && (this.trackEvents = c), l !== void 0 && (this.prereqOf = l), u !== void 0 && (this.reason = u), d !== void 0 && (this.debugEventsUntilDate = d), h !== void 0 && (this.excludeFromSummaries = h);
    }
  };
  var ge = class {
    constructor(t, e = 1) {
      this.context = t, this.samplingRatio = e, this.kind = "identify", this.creationDate = Date.now();
    }
  };
  var tn = class {
    close() {
    }
    async flush() {
    }
    sendEvent() {
    }
  };
  var en = class {
    constructor(t) {
      this.xt = t;
    }
    evalEvent(t) {
      var e;
      return new Mt(this.xt, t.context, t.flagKey, t.value, t.defaultVal, t.version, (e = t.variation) != null ? e : void 0, t.trackEvents || t.addExperimentData, t.prereqOfFlagKey, this.xt || t.addExperimentData ? t.reason : void 0, t.debugEventsUntilDate, t.excludeFromSummaries, t.samplingRatio);
    }
    unknownFlagEvent(t, e, r) {
      return new Mt(this.xt, r, t, e, e, void 0, void 0, void 0, void 0, void 0, void 0, void 0, void 0);
    }
    identifyEvent(t) {
      return new ge(t, 1);
    }
    customEvent(t, e, r, i, s = 1) {
      return new ye(e, t, r != null ? r : void 0, i != null ? i : void 0, s);
    }
  };
  function es(n5) {
    let t = n5.get("x-ld-fd-fallback");
    if (t === null || t.toLowerCase() !== "true") return { fdv1Fallback: false };
    let e = n5.get("x-ld-fd-fallback-ttl");
    if (e === null) return { fdv1Fallback: true };
    let r = parseInt(e, 10);
    return Number.isNaN(r) ? { fdv1Fallback: true } : { fdv1Fallback: true, fdv1FallbackTtlMs: Math.max(0, r) * 1e3 };
  }
  function ns(n5) {
    let t = n5 == null ? void 0 : n5.protocolFallbackTTL;
    return typeof t != "number" || !Number.isFinite(t) ? { fdv1Fallback: false } : { fdv1Fallback: true, fdv1FallbackTtlMs: Math.max(0, t) * 1e3 };
  }
  var rr = "FDv1Fallback";
  function rs(n5) {
    return { yn: n5, ye: "", useSelector(t) {
      return this.ye = t, this;
    }, processFullTransfer(t) {
      let e = [{ event: "server-intent", data: { payloads: [{ id: rr, target: 1, intentCode: "xfer-full", reason: "payload-missing" }] } }];
      Object.entries((t == null ? void 0 : t.flags) || []).forEach(([r, i]) => {
        e.push({ event: "put-object", data: { kind: "flag", key: r, version: i.version || 1, object: i } });
      }), Object.entries((t == null ? void 0 : t.segments) || []).forEach(([r, i]) => {
        e.push({ event: "put-object", data: { kind: "segment", key: r, version: i.version || 1, object: i } });
      }), e.push({ event: "payload-transferred", data: { state: this.ye, version: 1, id: rr } }), this.yn.processEvents(e);
    } };
  }
  var H = { type: "none" };
  function ur(n5, t) {
    let e = "inactive", r = "partial", i = [];
    function s(f, S) {
      var N;
      return (N = n5[f]) == null ? void 0 : N.call(n5, S);
    }
    function a() {
      e = "inactive", r = "partial", i = [];
    }
    function o() {
      e = "changes", r = "partial", i = [];
    }
    function c() {
      i = [];
    }
    function l(f) {
      return X(f.target) ? (t == null || t.warn(`Ignoring 'none' intent with missing fields: target=${f.target}`), H) : { type: "payload", payload: { version: f.target, type: "none", updates: [] } };
    }
    function u(f) {
      var N;
      if (!((N = f.payloads) != null && N.length)) return { type: "error", kind: "MISSING_PAYLOAD", message: "No payload present in server-intent" };
      let S = f.payloads[0];
      switch (S == null ? void 0 : S.intentCode) {
        case "xfer-full":
          return e = "full", i = [], r = "full", H;
        case "xfer-changes":
          return e = "changes", i = [], r = "partial", H;
        case "none":
          return e = "changes", i = [], r = "partial", l(S);
        default:
          return t == null || t.warn(`Unable to process intent code '${S == null ? void 0 : S.intentCode}'.`), H;
      }
    }
    function d(f) {
      if (e === "inactive") return t == null || t.warn("Received put-object before server-intent was established. Ignoring."), H;
      if (!f.kind || !f.key || X(f.version) || !f.object) return t == null || t.warn(`Ignoring put-object with missing fields: kind=${f.kind}, key=${f.key}, version=${f.version}`), H;
      let S = s(f.kind, f.object);
      return S ? (i.push({ kind: f.kind, key: f.key, version: f.version, object: S }), H) : (t == null || t.warn(`Unable to process object for kind: '${f.kind}'`), H);
    }
    function h(f) {
      return e === "inactive" ? (t == null || t.warn("Received delete-object before server-intent was established. Ignoring."), H) : !f.kind || !f.key || X(f.version) ? (t == null || t.warn(`Ignoring delete-object with missing fields: kind=${f.kind}, key=${f.key}, version=${f.version}`), H) : (i.push({ kind: f.kind, key: f.key, version: f.version, deleted: true }), H);
    }
    function m(f) {
      if (e === "inactive") return { type: "error", kind: "PROTOCOL_ERROR", message: "A payload transferred has been received without an intent having been established." };
      if (X(f.state) || X(f.version)) return t == null || t.warn(`Ignoring payload-transferred with missing fields: state=${f.state}, version=${f.version}`), a(), H;
      let S = { type: "payload", payload: { version: f.version, state: f.state, type: r, updates: i } };
      return o(), S;
    }
    function b(f) {
      return t == null || t.info(`Goodbye was received from the LaunchDarkly connection with reason: ${f.reason}.`), a(), { type: "goodbye", reason: f.reason };
    }
    function v(f) {
      return t == null || t.info(`An issue was encountered receiving updates with reason: ${f.reason}.`), c(), { type: "serverError", id: f.payload_id, reason: f.reason };
    }
    return { get state() {
      return e;
    }, processEvent(f) {
      switch (f.event) {
        case "server-intent":
          return u(f.data);
        case "put-object":
          return d(f.data);
        case "delete-object":
          return h(f.data);
        case "payload-transferred":
          return m(f.data);
        case "goodbye":
          return b(f.data);
        case "error":
          return v(f.data);
        case "heart-beat":
          return H;
        default:
          return { type: "error", kind: "UNKNOWN_EVENT", message: `Received an unknown event of type '${f.event}'` };
      }
    }, reset() {
      a();
    } };
  }
  function is(n5) {
    return n5 === "MISSING_PAYLOAD" || n5 === "PROTOCOL_ERROR";
  }
  var ve = class {
    constructor(t, e, r) {
      this.m = e, this.t = r, this.n = [], this.gn = ur(t, r);
    }
    addPayloadListener(t) {
      this.n.push(t);
    }
    removePayloadListener(t) {
      let e = this.n.indexOf(t, 0);
      e > -1 && this.n.splice(e, 1);
    }
    processEvents(t) {
      t.forEach((e) => {
        var i, s;
        let r = this.gn.processEvent(e);
        switch (r.type) {
          case "payload":
            this.n.forEach((a) => a(r.payload));
            break;
          case "error":
            is(r.kind) ? (i = this.m) == null || i.call(this, O.InvalidData, r.message) : (s = this.t) == null || s.warn(r.message);
            break;
        }
      });
    }
  };
  var nn = class {
    constructor(t, e, r, i) {
      this.m = r, this.t = i, this.z(t, "server-intent"), this.z(t, "put-object"), this.z(t, "delete-object"), this.z(t, "payload-transferred"), this.z(t, "goodbye"), this.z(t, "error"), this.Lt = new ve(e, r, i);
    }
    addPayloadListener(t) {
      this.Lt.addPayloadListener(t);
    }
    removePayloadListener(t) {
      this.Lt.removePayloadListener(t);
    }
    z(t, e) {
      t.addEventListener(e, async (r) => {
        var i, s, a, o, c;
        if (r != null && r.data) {
          (i = this.t) == null || i.debug(`Received ${e} event.  Data is ${r.data}`);
          try {
            this.Lt.processEvents([{ event: e, data: JSON.parse(r.data) }]);
          } catch (l) {
            (s = this.t) == null || s.error(`Stream received data that was unable to be processed in "${e}" message`), (a = this.t) == null || a.debug(`Data follows: ${r.data}`), (o = this.m) == null || o.call(this, O.InvalidData, "Malformed data in EventStream.");
          }
        } else e !== "error" && ((c = this.m) == null || c.call(this, O.Unknown, "Event from EventStream missing data."));
      });
    }
  };
  function ss(n5) {
    if (n5) {
      let t = Object.keys(n5).find((e) => e.toLowerCase() === "x-ld-envid");
      if (t) return { environmentId: n5[t] };
    }
  }
  var ir = "unknown plugin";
  function we(n5, t) {
    try {
      return t.getMetadata().name || ir;
    } catch (e) {
      return n5.error("Exception thrown getting metadata for plugin. Unable to get plugin name."), ir;
    }
  }
  function as(n5, t, e) {
    let r = [];
    return e.forEach((i) => {
      var s;
      try {
        let a = (s = i.getHooks) == null ? void 0 : s.call(i, t);
        a === void 0 ? n5.error(`Plugin ${we(n5, i)} returned undefined from getHooks.`) : a && a.length > 0 && r.push(...a);
      } catch (a) {
        n5.error(`Exception thrown getting hooks for plugin ${we(n5, i)}. Unable to get hooks.`);
      }
    }), r;
  }
  function os(n5, t, e, r) {
    r.forEach((i) => {
      try {
        i.register(e, t);
      } catch (s) {
        n5.error(`Exception thrown registering plugin ${we(n5, i)}.`);
      }
    });
  }
  var _ = Object.freeze({ __proto__: null, ClientMessages: fe, DiagnosticsManager: Ke, ErrorKinds: Yi, EventFactoryBase: en, EventProcessor: Qe, FDv1PayloadAdaptor: rs, InputCustomEvent: ye, InputEvalEvent: Mt, InputIdentifyEvent: ge, NullEventProcessor: tn, PayloadProcessor: ve, PayloadStreamReader: nn, canonicalize: ce, createProtocolHandler: ur, initMetadataFromHeaders: ss, isLegacyUser: cr, isMultiKind: or, isSingleKind: ar, readFallbackDirective: es, readGoodbyeFallbackDirective: ns, safeGetHooks: as, safeGetName: we, safeRegisterPlugins: os, shouldSample: se });
  var In = { Initializing: "INITIALIZING", Valid: "VALID", Interrupted: "INTERRUPTED", SetOffline: "SET_OFFLINE", Closed: "CLOSED" };
  function ls(n5) {
    return n5 >= 200 && n5 <= 299;
  }
  var De = class extends Error {
    constructor(t, e) {
      super(t), this.status = e, this.name = "LaunchDarklyRequestError";
    }
  };
  function Fe(n5, t, e, r, i, s, a, o, c, l) {
    let u, d = "GET", h = E({}, s);
    c && (d = "REPORT", h["content-type"] = "application/json", u = n5);
    let m = c ? e.pathReport(i, n5) : e.pathGet(i, n5), b = [...a != null ? a : []];
    o && b.push({ key: "withReasons", value: "true" }), l && b.push({ key: "h", value: l });
    let v = un(t, m, b);
    return { async requestPayload() {
      let f;
      try {
        let S = await r.fetch(v, { method: d, headers: h, body: u });
        if (ls(S.status)) return await S.text();
        f = S.status;
      } catch (S) {
        throw new De(S == null ? void 0 : S.message);
      }
      throw new De(`Unexpected status code: ${f}`, f);
    } };
  }
  var dr = new Error("Task has already been executed or shed. This is likely an implementation error. The task will not be executed again.");
  function us(n5, t, e = false) {
    let r, i = new Promise((o) => {
      r = (c, l) => {
        var u;
        try {
          (u = n5.after) == null || u.call(n5, c, l);
        } catch (d) {
          t == null || t.error(`Error in after callback: ${d}`);
        }
        o(c);
      };
    }), s = n5.before ? n5.before() : Promise.resolve(void 0), a = false;
    return { execute: () => {
      a && (t == null || t.error(dr)), a = true, s.then((o) => {
        n5.execute(o).then((c) => r({ status: "complete", result: c }, o)).catch((c) => r({ status: "error", error: c }, o));
      }).catch((o) => {
        t == null || t.error(o), r({ status: "error", error: o }, void 0);
      });
    }, shed: () => {
      a && (t == null || t.error(dr)), a = true, s.then((o) => {
        r({ status: "shed" }, o);
      });
    }, promise: i, sheddable: e };
  }
  function ds(n5) {
    let t, e = [];
    function r() {
      if (!t && e.length > 0) {
        let i = e.shift();
        t = i.promise.finally(() => {
          t = void 0, r();
        }), i.execute();
      }
    }
    return { execute(i, s = false) {
      var o, c;
      let a = us(i, n5, s);
      return t ? ((o = e[e.length - 1]) != null && o.sheddable && ((c = e.pop()) == null || c.shed()), e.push(a)) : (t = a.promise.finally(() => {
        t = void 0, r();
      }), a.execute()), a.promise;
    }, pendingCount() {
      return e.length;
    } };
  }
  function Cr(n5) {
    return "validate" in n5;
  }
  function Te(n5, t, e, r, i) {
    let s = E({}, e);
    return X(n5) ? s : p.Object.is(n5) ? (Object.entries(n5).forEach(([a, o]) => {
      let c = t[a], l = i ? `${i}.${a}` : a;
      if (!c) {
        r == null || r.warn($.unknownOption(l));
        return;
      }
      if (X(o)) return;
      if (Cr(c)) {
        let d = c.validate(o, l, r, e[a]);
        d !== void 0 && (s[a] = d.value);
        return;
      }
      if (c.is(o)) {
        s[a] = o;
        return;
      }
      let u = c.getType();
      u === "boolean" ? (r == null || r.warn($.wrongOptionTypeBoolean(l, typeof o)), s[a] = !!o) : u === "boolean | undefined | null" ? (r == null || r.warn($.wrongOptionTypeBoolean(l, typeof o)), typeof o != "boolean" && typeof o != "undefined" && o !== null && (s[a] = !!o)) : c instanceof Ft && p.Number.is(o) ? (r == null || r.warn($.optionBelowMinimum(l, o, c.min)), s[a] = c.min) : r == null || r.warn($.wrongOptionType(l, u, typeof o));
    }), s) : (r == null || r.warn($.wrongOptionType(i != null ? i : "config", "object", typeof n5)), s);
  }
  function lt(n5, t) {
    var r;
    let e = t == null ? void 0 : t.defaults;
    return { is: (r = t == null ? void 0 : t.is) != null ? r : ((i) => p.Object.is(i)), getType: () => "object", validate(i, s, a, o) {
      if (!p.Object.is(i)) {
        a == null || a.warn($.wrongOptionType(s, "object", typeof i));
        return;
      }
      let c = e != null ? e : p.Object.is(o) ? o : {}, l = Te(i, n5, c, a, s);
      return Object.keys(l).length > 0 ? { value: l } : void 0;
    } };
  }
  function Fr(n5, t) {
    return { is: (e) => Array.isArray(e), getType: () => "array", validate(e, r, i) {
      if (!Array.isArray(e)) {
        i == null || i.warn($.wrongOptionType(r, "array", typeof e));
        return;
      }
      let s = [];
      return e.forEach((a, o) => {
        let c = `${r}[${o}]`;
        if (X(a) || !p.Object.is(a)) {
          i == null || i.warn($.wrongOptionType(c, "object", typeof a));
          return;
        }
        let l = a, u = l[n5], d = typeof u == "string" ? t[u] : void 0;
        if (!d) {
          let h = Object.keys(t).join(" | "), m = typeof u == "string" ? u : typeof u;
          i == null || i.warn($.wrongOptionType(`${c}.${n5}`, h, m));
          return;
        }
        s.push(Te(l, d, {}, i, c));
      }), { value: s };
    } };
  }
  function hs(...n5) {
    return { is: (t) => n5.some((e) => e.is(t)), getType: () => n5.map((t) => t.getType()).join(" | "), validate(t, e, r, i) {
      let s = n5.find((a) => a.is(t));
      if (s) return Cr(s) ? s.validate(t, e, r, i) : { value: t };
      r == null || r.warn($.wrongOptionType(e, this.getType(), typeof t));
    } };
  }
  function fs(n5, t, e) {
    let r = e == null ? void 0 : e.defaults;
    return { is: (i) => p.Object.is(i), getType: () => "object", validate(i, s, a, o) {
      if (X(i)) return;
      if (!p.Object.is(i)) {
        a == null || a.warn($.wrongOptionType(s, "object", typeof i));
        return;
      }
      let c = i, l = {}, u = {};
      Object.keys(c).forEach((h) => {
        n5.is(h) ? (l[h] = c[h], u[h] = t) : a == null || a.warn($.wrongOptionType(s, n5.getType(), h));
      });
      let d = r != null ? r : p.Object.is(o) ? o : {};
      return { value: Te(l, u, d, a, s) };
    } };
  }
  var hr = 300;
  var fr = 3600;
  var Cn = p.oneOf("cache", "polling", "streaming");
  var Fn = p.oneOf("streaming", "polling", "offline", "one-shot", "background");
  var Tn = { pollingBaseUri: p.String, streamingBaseUri: p.String };
  var ps = { type: Cn };
  var Tr = { type: Cn, pollInterval: p.numberWithMin(30), endpoints: lt(Tn) };
  var xr = { type: Cn, initialReconnectDelay: p.numberWithMin(1), endpoints: lt(Tn) };
  var ms = Fr("type", { cache: ps, polling: Tr, streaming: xr });
  var ys = Fr("type", { polling: Tr, streaming: xr });
  var gs = { pollInterval: p.numberWithMin(30), endpoints: lt(Tn) };
  var vs = { initializers: ms, synchronizers: ys, fdv1Fallback: lt(gs) };
  var Rt = { streaming: { initializers: [{ type: "cache" }, { type: "polling" }], synchronizers: [{ type: "streaming" }, { type: "polling" }], fdv1Fallback: { pollInterval: hr } }, polling: { initializers: [{ type: "cache" }], synchronizers: [{ type: "polling" }], fdv1Fallback: { pollInterval: hr } }, offline: { initializers: [{ type: "cache" }], synchronizers: [] }, "one-shot": { initializers: [{ type: "cache" }, { type: "polling" }, { type: "streaming" }], synchronizers: [] }, background: { initializers: [{ type: "cache" }], synchronizers: [{ type: "polling", pollInterval: fr }], fdv1Fallback: { pollInterval: fr } } };
  var ws = fs(Fn, lt(vs));
  function pr(n5, t) {
    return p.Object.is(n5) && n5.type === t;
  }
  var bs = { type: p.oneOf("automatic"), lifecycle: p.Boolean, network: p.Boolean };
  var Es = { type: p.oneOf("manual"), initialConnectionMode: Fn };
  var Ds = { backgroundConnectionMode: Fn, automaticModeSwitching: hs(p.Boolean, lt(bs, { is: (n5) => pr(n5, "automatic") }), lt(Es, { is: (n5) => pr(n5, "manual") })), connectionModes: ws };
  var xn = { foregroundConnectionMode: "one-shot", backgroundConnectionMode: void 0, automaticModeSwitching: false };
  function ks(n5) {
    return typeof n5 == "object" && n5 !== null && "type" in n5 && n5.type === "manual";
  }
  function Lr(n5, t) {
    var e;
    return ks(n5.automaticModeSwitching) ? n5.automaticModeSwitching.initialConnectionMode : (e = n5.foregroundConnectionMode) != null ? e : t.foregroundConnectionMode;
  }
  function Ss(n5) {
    return { logger: p.Object, maxCachedContexts: p.numberWithMin(0), baseUri: p.String, streamUri: p.String, eventsUri: p.String, capacity: p.numberWithMin(1), diagnosticRecordingInterval: p.numberWithMin(2), flushInterval: p.numberWithMin(2), streamInitialReconnectDelay: p.numberWithMin(0), allAttributesPrivate: p.Boolean, debug: p.Boolean, diagnosticOptOut: p.Boolean, withReasons: p.Boolean, sendEvents: p.Boolean, pollInterval: p.numberWithMin(30), useReport: p.Boolean, privateAttributes: p.StringArray, disableCache: p.Boolean, applicationInfo: p.Object, wrapperName: p.String, wrapperVersion: p.String, payloadFilterKey: p.stringMatchingRegex(/^[a-zA-Z0-9](\w|\.|-)*$/), hooks: p.createTypeArray("Hook[]", {}), inspectors: p.createTypeArray("LDInspection", {}), cleanOldPersistentData: p.Boolean, dataSystem: n5 != null && n5.dataSystemDefaults ? lt(Ds, { defaults: U(E({}, n5.dataSystemDefaults), { connectionModes: Rt }) }) : p.Object };
  }
  var Is = 300;
  var Mr = "https://clientsdk.launchdarkly.com";
  var Pr = "https://clientstream.launchdarkly.com";
  function Cs(n5) {
    return n5 instanceof Lt ? n5 : an(n5);
  }
  var pn = class {
    constructor(t = {}, e = { getImplementationHooks: () => [], credentialType: "mobileKey" }) {
      var s, a, o;
      this.logger = an(), this.baseUri = Mr, this.eventsUri = rt.DEFAULT_EVENTS, this.streamUri = Pr, this.maxCachedContexts = 5, this.disableCache = false, this.capacity = 100, this.diagnosticRecordingInterval = 900, this.flushInterval = 30, this.streamInitialReconnectDelay = 1, this.allAttributesPrivate = false, this.debug = false, this.diagnosticOptOut = false, this.sendEvents = true, this.sendLDHeaders = true, this.useReport = false, this.withReasons = false, this.privateAttributes = [], this.pollInterval = Is, this.hooks = [], this.inspectors = [], this.logger = Cs(t.logger);
      let r = Ss({ dataSystemDefaults: e.dataSystemDefaults }), i = Te(t, r, {}, this.logger);
      Object.entries(i).forEach(([c, l]) => {
        c !== "logger" && (this[c] = l);
      }), this.serviceEndpoints = new rt(this.streamUri, this.baseUri, this.eventsUri, e.analyticsEventPath, e.diagnosticEventPath, e.includeAuthorizationHeader, t.payloadFilterKey), this.useReport = (s = t.useReport) != null ? s : false, this.tags = new de({ application: this.applicationInfo, logger: this.logger }), this.userAgentHeaderName = (a = e.userAgentHeaderName) != null ? a : "user-agent", this.trackEventModifier = (o = e.trackEventModifier) != null ? o : ((c) => c), this.credentialType = e.credentialType, this.getImplementationHooks = e.getImplementationHooks;
    }
  };
  async function Ln(n5, t) {
    if (n5.digest) return n5.digest(t);
    if (n5.asyncDigest) return n5.asyncDigest(t);
    throw new Error("Platform must implement digest or asyncDigest");
  }
  var Ar = async (n5, { crypto: t, storage: e }, r) => {
    let i = await (e == null ? void 0 : e.get(n5));
    return i == null && (r && (i = await (e == null ? void 0 : e.get(r)), i != null && (await (e == null ? void 0 : e.set(n5, i)), await (e == null ? void 0 : e.get(n5)) != null && await (e == null ? void 0 : e.clear(r)))), i == null && (i = t.randomUUID(), await (e == null ? void 0 : e.set(n5, i)))), i;
  };
  function Or(n5) {
    return async (t) => Ln(n5.createHash("sha256").update(t), "base64");
  }
  var Z = async (n5) => n5;
  async function Ut(n5) {
    return (await Promise.all(n5.map((e) => e.transform(e.value)))).join("_");
  }
  async function $r(n5, t) {
    return Ut([{ value: "LaunchDarkly", transform: Z }, { value: t, transform: Or(n5) }]);
  }
  async function Fs(n5) {
    return Ut([{ value: "LaunchDarkly", transform: Z }, { value: "AnonymousKeys", transform: Z }, { value: n5, transform: Z }]);
  }
  async function Nr(n5) {
    return Ut([{ value: "LaunchDarkly", transform: Z }, { value: "ContextKeys", transform: Z }, { value: n5, transform: Z }]);
  }
  async function Ts(n5) {
    return Ut([{ value: n5, transform: Z }, { value: "ContextIndex", transform: Z }]);
  }
  async function Mn(n5, t, e) {
    return Ut([{ value: t, transform: Z }, { value: e.canonicalKey, transform: Or(n5) }]);
  }
  var { isLegacyUser: xs, isSingleKind: dn, isMultiKind: mr } = _;
  var Rr = "1.0";
  var Ls = (n5) => {
    let r = n5, { kind: t } = r, e = re(r, ["kind"]);
    return { kind: "multi", [t]: e };
  };
  var Ms = async ({ crypto: n5, info: t }, { applicationInfo: e }) => {
    var a;
    let { ld_application: r } = t.platformData(), i = (a = Ee(r)) != null ? a : {}, s = (e == null ? void 0 : e.id) || (i == null ? void 0 : i.id);
    if (s) {
      let o = (e == null ? void 0 : e.version) || (i == null ? void 0 : i.version), c = (e == null ? void 0 : e.name) || (i == null ? void 0 : i.name), l = (e == null ? void 0 : e.versionName) || (i == null ? void 0 : i.versionName);
      return i = E(E(E(U(E({}, i), { id: s }), o ? { version: o } : {}), c ? { name: c } : {}), l ? { versionName: l } : {}), i.key = await Ln(n5.createHash("sha256").update(s), "base64"), i.envAttributesVersion = i.envAttributesVersion || Rr, i;
    }
  };
  var Ps = async (n5) => {
    var o, c, l, u;
    let { ld_device: t, os: e } = n5.info.platformData(), r = (o = Ee(t)) != null ? o : {}, i = (e == null ? void 0 : e.name) || ((c = r.os) == null ? void 0 : c.name), s = (e == null ? void 0 : e.version) || ((l = r.os) == null ? void 0 : l.version), a = (u = r.os) == null ? void 0 : u.family;
    if ((i || s || a) && (r.os = E(E(E({}, i ? { name: i } : {}), s ? { version: s } : {}), a ? { family: a } : {})), Object.keys(r).filter((d) => d !== "key" && d !== "envAttributesVersion").length) {
      let d = await Nr("ld_device");
      return r.key = await Ar(d, n5), r.envAttributesVersion = r.envAttributesVersion || Rr, r;
    }
  };
  var As = async (n5, t, e) => {
    if (xs(n5)) return n5;
    let r, i;
    if (dn(n5) && n5.kind !== "ld_application" || mr(n5) && !n5.ld_application ? r = await Ms(t, e) : e.logger.warn("Not adding ld_application environment attributes because it already exists."), dn(n5) && n5.kind !== "ld_device" || mr(n5) && !n5.ld_device ? i = await Ps(t) : e.logger.warn("Not adding ld_device environment attributes because it already exists."), r || i) {
      let s = dn(n5) ? Ls(n5) : n5;
      return E(E(E({}, s), r ? { ld_application: r } : {}), i ? { ld_device: i } : {});
    }
    return n5;
  };
  function Os() {
    let n5, t;
    return { set(e, r) {
      n5 = e, t = r;
    }, getContext() {
      return t;
    }, getUnwrappedContext() {
      return n5;
    }, newIdentificationPromise() {
      let e, r;
      return { identifyPromise: new Promise((s, a) => {
        e = s, r = a;
      }), identifyResolve: e, identifyReject: r };
    }, hasContext() {
      return t !== void 0;
    }, hasValidContext() {
      return this.hasContext() && t.valid;
    } };
  }
  var { isLegacyUser: $s, isMultiKind: Ns, isSingleKind: Rs } = _;
  var Pn = async (n5, t, e) => {
    let { anonymous: r, key: i } = t;
    if (r && !i) {
      let s = await Nr(n5), a = await Fs(n5);
      t.key = await Ar(s, e, a);
    }
  };
  var Us = async (n5, t) => {
    await Pn(n5.kind, n5, t);
  };
  var _s = async (n5, t) => {
    let i = n5, { kind: e } = i, r = re(i, ["kind"]);
    return Promise.all(Object.entries(r).map(([s, a]) => Pn(s, a, t)));
  };
  var js = async (n5, t) => {
    await Pn("user", n5, t);
  };
  var zs = async (n5, t) => {
    let e = sn(n5);
    return Rs(e) && await Us(e, t), Ns(e) && await _s(e, t), $s(e) && await js(e, t), e;
  };
  var Vs = (n5) => ({ customBaseURI: n5.serviceEndpoints.polling !== Mr, customStreamURI: n5.serviceEndpoints.streaming !== Pr, customEventsURI: n5.serviceEndpoints.events !== rt.DEFAULT_EVENTS, eventsCapacity: n5.capacity, eventsFlushIntervalMillis: be(n5.flushInterval), reconnectTimeMillis: be(n5.streamInitialReconnectDelay), diagnosticRecordingIntervalMillis: be(n5.diagnosticRecordingInterval), allAttributesPrivate: n5.allAttributesPrivate, usingSecureMode: false, bootstrapMode: false });
  var Bs = (n5, t, e) => {
    if (t.sendEvents && !t.diagnosticOptOut) return new _.DiagnosticsManager(n5, e, Vs(t));
  };
  function yr(n5, t) {
    return { value: t != null ? t : null, variationIndex: null, reason: { kind: "ERROR", errorKind: n5 } };
  }
  function gr(n5, t, e) {
    return E({ value: n5, variationIndex: t != null ? t : null }, e !== void 0 && { reason: e });
  }
  var Hs = (n5, t, e, r, i) => {
    if (t.sendEvents) return new _.EventProcessor(U(E({}, t), { eventsCapacity: t.capacity }), new he(n5, t, e), r, void 0, i, false, true);
  };
  var ke = class extends _.EventFactoryBase {
    evalEventClient(t, e, r, i, s, a) {
      let { trackEvents: o, debugEventsUntilDate: c, trackReason: l, flagVersion: u, version: d, variation: h } = i;
      return super.evalEvent({ addExperimentData: l, context: s, debugEventsUntilDate: c, defaultVal: r, flagKey: t, reason: a, trackEvents: !!o, value: e, variation: h, version: u != null ? u : d });
    }
  };
  function xe(n5, t) {
    let e = Object.keys(t), r = "$flagsState", i = "$valid", s = t[r];
    !s && e.length && n5.warn("LaunchDarkly client was initialized with bootstrap data that did not include flag metadata. Events may not be sent correctly."), t[i] === false && n5.warn("LaunchDarkly bootstrap data is not available because the back end could not read the flags.");
    let a = {};
    return e.forEach((o) => {
      if (o !== r && o !== i) {
        let c;
        s && s[o] ? c = E({ value: t[o] }, s[o]) : c = { value: t[o], version: 0 }, a[o] = { version: c.version, flag: c };
      }
    }), a;
  }
  var mn = "_freshness";
  async function Ur(n5, t) {
    let e = t.canonicalUnfilteredJson();
    if (e) return Ln(n5.createHash("sha256").update(e), "base64");
  }
  async function Gs(n5, t, e, r, i) {
    let s = await Mn(t, e, r), a = await n5.get(`${s}${mn}`);
    if (a != null) try {
      let o = JSON.parse(a), c = await Ur(t, r);
      return c === void 0 || o.contextHash !== c ? void 0 : typeof o.timestamp == "number" && !Number.isNaN(o.timestamp) ? o.timestamp : void 0;
    } catch (o) {
      i == null || i.warn(`Could not read freshness data from persistent storage: ${o.message}`);
      return;
    }
  }
  function qs(n5) {
    return n5 !== null && typeof n5 == "object" && typeof n5.version == "number";
  }
  async function _r(n5, t, e, r, i) {
    let s = await Mn(t, e, r), a = await n5.get(s), o = false;
    if (a == null) {
      if (a = await n5.get(r.canonicalKey), a == null) return;
      o = true;
    }
    try {
      let c = JSON.parse(a);
      if (c === null || typeof c != "object") {
        i == null || i.warn("Cached flag data is not a valid object");
        return;
      }
      let l = Object.entries(c), u = l.find(([, h]) => !qs(h));
      if (u) {
        i == null || i.warn(`Discarding cached flags due to invalid entry: ${u[0]}`);
        return;
      }
      return { flags: l.reduce((h, [m, b]) => (h[m] = b, h), {}), storageKey: s, fromLegacyKey: o };
    } catch (c) {
      i == null || i.warn(`Could not parse cached flag evaluations from persistent storage: ${c.message}`);
      return;
    }
  }
  var $t = class n4 {
    constructor() {
      this.container = { index: new Array() };
    }
    static fromJson(t) {
      let e = new n4();
      try {
        e.container = JSON.parse(t);
      } catch (r) {
      }
      return e;
    }
    toJson() {
      return JSON.stringify(this.container);
    }
    notice(t, e) {
      let r = this.container.index.find((i) => i.id === t);
      r === void 0 ? this.container.index.push({ id: t, timestamp: e }) : r.timestamp = e;
    }
    prune(t) {
      let e = Math.max(t, 0);
      return this.container.index.length > e ? (this.container.index.sort((r, i) => r.timestamp - i.timestamp), this.container.index.splice(0, this.container.index.length - e)) : [];
    }
  };
  var yn = class {
    constructor(t, e, r, i, s, a, o, c = () => Date.now()) {
      this.a = t, this.Mt = e, this.lt = r, this.ge = i, this.L = s, this.g = a, this.t = o, this.vn = c, this.ve = Ts(this.Mt);
    }
    async init(t, e) {
      this.g.init(t, e), await this.Pt(t);
    }
    async upsert(t, e, r) {
      return this.g.upsert(t, e, r) ? (await this.Pt(t), true) : false;
    }
    async applyChanges(t, e, r) {
      this.g.applyChanges(t, e, r), await this.Pt(t);
    }
    async loadCached(t) {
      if (this.ge || this.lt <= 0 || !this.a.storage) return false;
      let e = await _r(this.a.storage, this.a.crypto, this.Mt, t, this.t);
      if (!e) return false;
      e.fromLegacyKey && (await this.a.storage.set(e.storageKey, JSON.stringify(e.flags)), await this.a.storage.clear(t.canonicalKey));
      let r = Object.entries(e.flags).reduce((i, [s, a]) => (i[s] = { version: a.version, flag: a }, i), {});
      return this.g.initCached(t, r), this.t.debug("Loaded cached flag evaluations from persistent storage"), true;
    }
    async wn(t, e, r) {
      var a;
      let i = await Ur(this.a.crypto, e);
      if (i === void 0) {
        this.t.error("Could not serialize context for freshness tracking");
        return;
      }
      let s = { timestamp: r, contextHash: i };
      await ((a = this.a.storage) == null ? void 0 : a.set(`${t}${mn}`, JSON.stringify(s)));
    }
    async bn() {
      var e;
      if (this.V !== void 0) return this.V;
      let t = await ((e = this.a.storage) == null ? void 0 : e.get(await this.ve));
      if (!t) return this.V = new $t(), this.V;
      try {
        this.V = $t.fromJson(t), this.t.debug("Loaded context index from persistent storage");
      } catch (r) {
        this.t.warn(`Could not load index from persistent storage: ${r.message}`), this.V = new $t();
      }
      return this.V;
    }
    async Pt(t) {
      var u, d;
      if (this.ge) return;
      let e = this.vn(), r = await this.bn(), i = await Mn(this.a.crypto, this.Mt, t);
      this.lt > 0 && r.notice(i, e);
      let s = r.prune(this.lt), a = this.lt <= 0 || s.some((h) => h.id === i);
      if (await Promise.all(s.flatMap((h) => {
        var m, b;
        return [(m = this.a.storage) == null ? void 0 : m.clear(h.id), (b = this.a.storage) == null ? void 0 : b.clear(`${h.id}${mn}`)];
      })), await ((u = this.a.storage) == null ? void 0 : u.set(await this.ve, r.toJson())), a) return;
      let o = this.L.getAll(), c = Object.entries(o).reduce((h, [m, b]) => (b.flag !== null && b.flag !== void 0 && (h[m] = b.flag), h), {}), l = JSON.stringify(c);
      await ((d = this.a.storage) == null ? void 0 : d.set(i, l));
      try {
        await this.wn(i, t, e);
      } catch (h) {
        this.t.warn(`Failed to store freshness data: ${h.message}`);
      }
    }
  };
  function Ks() {
    let n5 = {};
    return { init(t) {
      n5 = Object.entries(t).reduce((e, [r, i]) => (e[r] = i, e), {});
    }, insertOrUpdate(t, e) {
      n5[t] = e;
    }, get(t) {
      if (Object.prototype.hasOwnProperty.call(n5, t)) return n5[t];
    }, getAll() {
      return n5;
    }, applyChanges(t, e) {
      e === "full" ? this.init(t) : e === "partial" && Object.entries(t).forEach(([r, i]) => {
        n5[r] = i;
      });
    } };
  }
  function vr(n5, t) {
    let e = [];
    return Object.entries(n5).forEach(([r, i]) => {
      let s = t[r];
      (!s || !Ct(i, s)) && e.push(r);
    }), Object.keys(t).forEach((r) => {
      n5[r] || e.push(r);
    }), e;
  }
  function Js(n5, t) {
    let e = n5, r = t, i, s = new Array();
    return { handleFlagChanges(a, o) {
      i ? s.forEach((c) => {
        try {
          c(i, a, o);
        } catch (l) {
        }
      }) : r.warn("Received a change event without an active context. Changes will not be propagated.");
    }, init(a, o) {
      i = a;
      let c = e.getAll();
      e.init(o);
      let l = vr(c, o);
      l.length > 0 && this.handleFlagChanges(l, "init");
    }, initCached(a, o) {
      (i == null ? void 0 : i.canonicalKey) !== a.canonicalKey && this.init(a, o);
    }, applyChanges(a, o, c) {
      i = a;
      let l = e.getAll();
      if (e.applyChanges(o, c), c === "full") {
        let u = vr(l, o);
        u.length > 0 && this.handleFlagChanges(u, "init");
      } else if (c === "partial") {
        let u = Object.keys(o);
        u.length > 0 && this.handleFlagChanges(u, "patch");
      }
    }, upsert(a, o, c) {
      if ((i == null ? void 0 : i.canonicalKey) !== a.canonicalKey) return r.warn("Received an update for an inactive context."), false;
      let l = e.get(o);
      return l !== void 0 && l.version >= c.version ? false : (e.insertOrUpdate(o, c), this.handleFlagChanges([o], "patch"), true);
    }, on(a) {
      s.push(a);
    }, off(a) {
      let o = s.indexOf(a);
      o > -1 && s.splice(o, 1);
    } };
  }
  var gn = class {
    constructor(t, e, r, i, s, a = () => Date.now()) {
      this.L = Ks(), this.g = Js(this.L, s), this.ut = this.En(t, e, r, i, s, a);
    }
    async En(t, e, r, i, s, a = () => Date.now()) {
      let o = await $r(t.crypto, e);
      return new yn(t, o, r, i, this.L, this.g, s, a);
    }
    get(t) {
      return this.r && Object.prototype.hasOwnProperty.call(this.r, t) ? this.At(this.r[t]) : this.L.get(t);
    }
    getAll() {
      return this.r ? E(E({}, this.L.getAll()), Object.entries(this.r).reduce((t, [e, r]) => (t[e] = this.At(r), t), {})) : this.L.getAll();
    }
    presetFlags(t) {
      this.L.init(t);
    }
    setBootstrap(t, e) {
      this.g.init(t, e);
    }
    async init(t, e) {
      return (await this.ut).init(t, e);
    }
    async upsert(t, e, r) {
      return (await this.ut).upsert(t, e, r);
    }
    async loadCached(t) {
      return (await this.ut).loadCached(t);
    }
    async applyChanges(t, e, r) {
      return (await this.ut).applyChanges(t, e, r);
    }
    on(t) {
      this.g.on(t);
    }
    off(t) {
      this.g.off(t);
    }
    At(t) {
      return { flag: { value: t, version: 0 }, version: 0 };
    }
    setOverride(t, e) {
      this.r || (this.r = {}), this.r[t] = e, this.g.handleFlagChanges([t], "override");
    }
    removeOverride(t) {
      !this.r || !Object.prototype.hasOwnProperty.call(this.r, t) || (delete this.r[t], Object.keys(this.r).length === 0 && (this.r = void 0), this.g.handleFlagChanges([t], "override"));
    }
    clearAllOverrides() {
      if (this.r) {
        let t = E({}, this.r);
        this.r = void 0, this.g.handleFlagChanges(Object.keys(t), "override");
      }
    }
    getAllOverrides() {
      if (!this.r) return {};
      let t = {};
      return Object.entries(this.r).forEach(([e, r]) => {
        t[e] = this.At(r);
      }), t;
    }
    getDebugOverride() {
      return { setOverride: this.setOverride.bind(this), removeOverride: this.removeOverride.bind(this), clearAllOverrides: this.clearAllOverrides.bind(this), getAllOverrides: this.getAllOverrides.bind(this) };
    }
  };
  var wr = "unknown hook";
  var jr = "beforeEvaluation";
  var zr = "afterEvaluation";
  var Ws = "afterTrack";
  function _t(n5, t, e, r, i) {
    try {
      return r();
    } catch (s) {
      return n5 == null || n5.error(`An error was encountered in "${t}" of the "${e}" hook: ${s}`), i;
    }
  }
  function jt(n5, t) {
    try {
      return t.getMetadata().name || wr;
    } catch (e) {
      return n5.error("Exception thrown getting metadata for hook. Unable to get hook name."), wr;
    }
  }
  function Ys(n5, t, e) {
    return t.map((r) => _t(n5, jr, jt(n5, r), () => {
      var i, s;
      return (s = (i = r == null ? void 0 : r.beforeEvaluation) == null ? void 0 : i.call(r, e, {})) != null ? s : {};
    }, {}));
  }
  function Xs(n5, t, e, r, i) {
    for (let s = t.length - 1; s >= 0; s -= 1) {
      let a = t[s], o = r[s];
      _t(n5, zr, jt(n5, a), () => {
        var c, l;
        return (l = (c = a == null ? void 0 : a.afterEvaluation) == null ? void 0 : c.call(a, e, o, i)) != null ? l : {};
      }, {});
    }
  }
  function Zs(n5, t, e) {
    return t.map((r) => _t(n5, jr, jt(n5, r), () => {
      var i, s;
      return (s = (i = r == null ? void 0 : r.beforeIdentify) == null ? void 0 : i.call(r, e, {})) != null ? s : {};
    }, {}));
  }
  function Qs(n5, t, e, r, i) {
    for (let s = t.length - 1; s >= 0; s -= 1) {
      let a = t[s], o = r[s];
      _t(n5, zr, jt(n5, a), () => {
        var c, l;
        return (l = (c = a == null ? void 0 : a.afterIdentify) == null ? void 0 : c.call(a, e, o, i)) != null ? l : {};
      }, {});
    }
  }
  function ta(n5, t, e) {
    for (let r = 0; r < t.length; r += 1) {
      let i = t[r];
      _t(n5, Ws, jt(n5, i), () => {
        var s;
        return (s = i == null ? void 0 : i.afterTrack) == null ? void 0 : s.call(i, e);
      }, void 0);
    }
  }
  var vn = class {
    constructor(t, e) {
      this.t = t, this.$ = [], this.$.push(...e);
    }
    withEvaluation(t, e, r, i) {
      if (this.$.length === 0) return i();
      let s = [...this.$], a = { flagKey: t, context: e, defaultValue: r }, o = Ys(this.t, s, a), c = i();
      return Xs(this.t, s, a, o, c), c;
    }
    identify(t, e) {
      let r = [...this.$], i = { context: t, timeout: e }, s = Zs(this.t, r, i);
      return (a) => {
        Qs(this.t, r, i, s, a);
      };
    }
    addHook(t) {
      this.$.push(t);
    }
    afterTrack(t) {
      if (this.$.length === 0) return;
      let e = [...this.$];
      ta(this.t, e, t);
    }
  };
  function ea(n5) {
    return { getMetadata() {
      return { name: "LaunchDarkly-Inspector-Adapter" };
    }, afterEvaluation: (t, e, r) => (n5.onFlagUsed(t.flagKey, r, t.context), e), afterIdentify(t, e, r) {
      return n5.onIdentityChanged(t.context), e;
    } };
  }
  function na(n5, t) {
    return `an inspector: "${t}" of an invalid type (${n5}) was configured`;
  }
  function ra(n5, t) {
    return `an inspector: "${t}" of type: "${n5}" generated an exception`;
  }
  function ia(n5, t) {
    let e = false, r = { method: (...i) => {
      try {
        n5.method(...i);
      } catch (s) {
        e || (e = true, t.warn(ra(r.type, r.name)));
      }
    }, type: n5.type, name: n5.name, synchronous: n5.synchronous };
    return r;
  }
  var Vr = "flag-used";
  var Br = "flag-details-changed";
  var Hr = "flag-detail-changed";
  var Gr = "client-identity-changed";
  var sa = [Vr, Br, Hr, Gr];
  function aa(n5, t) {
    let e = sa.includes(n5.type) && n5.method && typeof n5.method == "function";
    return e || t.warn(na(n5.type, n5.name)), e;
  }
  var wn = class {
    constructor(t, e) {
      this.B = [];
      let r = t.filter((i) => aa(i, e));
      this.B = r.map((i) => ia(i, e));
    }
    hasInspectors() {
      return this.B.length !== 0;
    }
    onFlagUsed(t, e, r) {
      this.B.forEach((i) => {
        i.type === Vr && i.method(t, e, r);
      });
    }
    onFlagsChanged(t) {
      this.B.forEach((e) => {
        e.type === Br && e.method(t);
      });
    }
    onFlagChanged(t, e) {
      this.B.forEach((r) => {
        r.type === Hr && r.method(t, e);
      });
    }
    onIdentityChanged(t) {
      this.B.forEach((e) => {
        e.type === Gr && e.method(t);
      });
    }
  };
  var bn = class {
    constructor(t) {
      this.t = t, this.n = /* @__PURE__ */ new Map();
    }
    on(t, e) {
      var r, i;
      if (typeof t != "string") {
        (r = this.t) == null || r.warn("Only string event names are supported.");
        return;
      }
      this.n.has(t) ? (i = this.n.get(t)) == null || i.push(e) : this.n.set(t, [e]);
    }
    off(t, e) {
      let r = this.n.get(t);
      if (r) {
        if (e) {
          let i = r.filter((s) => s !== e);
          i.length === 0 ? this.n.delete(t) : this.n.set(t, i);
          return;
        }
        this.n.delete(t);
      }
    }
    Dn(t, e, ...r) {
      var i;
      try {
        t(...r);
      } catch (s) {
        (i = this.t) == null || i.error(`Encountered error invoking handler for "${e}", detail: "${s}"`);
      }
    }
    emit(t, ...e) {
      let r = this.n.get(t);
      r == null || r.forEach((i) => this.Dn(i, t, ...e));
    }
    eventNames() {
      return [...this.n.keys()];
    }
    listenerCount(t) {
      var e, r;
      return (r = (e = this.n.get(t)) == null ? void 0 : e.length) != null ? r : 0;
    }
  };
  function oa(n5, t, e) {
    let r = t.info.sdkData(), i;
    e.applicationInfo && (e.applicationInfo.id && (i = i != null ? i : {}, i.id = e.applicationInfo.id), e.applicationInfo.version && (i = i != null ? i : {}, i.version = e.applicationInfo.version), e.applicationInfo.name && (i = i != null ? i : {}, i.name = e.applicationInfo.name), e.applicationInfo.versionName && (i = i != null ? i : {}, i.versionName = e.applicationInfo.versionName));
    let s = { name: r.userAgentBase, version: r.version };
    r.wrapperName && (s.wrapperName = r.wrapperName), r.wrapperVersion && (s.wrapperVersion = r.wrapperVersion);
    let a = { sdk: s, [e.credentialType]: n5 };
    return i && (a.application = i), a;
  }
  var { ClientMessages: br, ErrorKinds: Er } = _;
  var ca = 5;
  var Se = class {
    constructor(t, e, r, i, s, a) {
      var l, u, d, h;
      if (this.sdkKey = t, this.autoEnvAttributes = e, this.platform = r, this.l = Os(), this.Ot = 15, this.M = new ke(false), this.dt = new ke(true), this.$t = false, this.kn = ds(), this.we = false, !t) throw new Error("You must configure the client with a client-side SDK key");
      if (!r.encoding) throw new Error("Platform must implement Encoding because btoa is required.");
      this.e = new pn(i, a), this.logger = this.e.logger, this.we = (l = a == null ? void 0 : a.requiresStart) != null ? l : false, this.initialContext = a == null ? void 0 : a.initialContext, this.be = lr(this.sdkKey, this.platform.info, this.e.tags, this.e.serviceEndpoints.includeAuthorizationHeader, this.e.userAgentHeaderName), this.N = new gn(this.platform, t, this.e.maxCachedContexts, (u = this.e.disableCache) != null ? u : false, this.e.logger);
      let o = (h = (d = this.N).getDebugOverride) == null ? void 0 : h.call(d);
      o && (a != null && a.registerDebugOverrides) && a.registerDebugOverrides(o), this.I = Bs(t, this.e, r), this.b = Hs(t, this.e, r, this.be, this.I), this.emitter = new bn(), this.emitter.on("error", (m, b) => {
        this.logger.error(`error: ${b}, context: ${JSON.stringify(m)}`);
      }), this.N.on((m, b, v) => {
        this.Sn(b, v);
        let f = Y.toLDContext(m);
        this.emitter.emit("change", f, b), b.forEach((S) => {
          this.emitter.emit(`change:${S}`, f);
        });
      }), this.dataManager = s(this.N, this.e, this.be, this.emitter, this.I), this.isFDv2 = !!this.e.dataSystem, this.dataSystemConfig = this.e.dataSystem;
      let c = [...this.e.hooks];
      if (this.environmentMetadata = oa(this.sdkKey, this.platform, this.e), this.e.getImplementationHooks(this.environmentMetadata).forEach((m) => {
        c.push(m);
      }), this.R = new vn(this.logger, c), this.Y = new wn(this.e.inspectors, this.logger), this.Y.hasInspectors() && this.R.addHook(ea(this.Y)), i.cleanOldPersistentData && (a != null && a.getLegacyStorageKeys) && this.platform.storage) try {
        this.logger.debug("Cleaning old persistent data."), Promise.all(a.getLegacyStorageKeys().map((m) => {
          var b;
          return (b = this.platform.storage) == null ? void 0 : b.clear(m);
        })).catch((m) => {
          this.logger.error(`Error cleaning old persistent data: ${m}`);
        }).finally(() => {
          this.logger.debug("Cleaned old persistent data.");
        });
      } catch (m) {
        this.logger.error(`Error cleaning old persistent data: ${m}`);
      }
    }
    allFlags() {
      return Object.entries(this.N.getAll()).reduce((e, [r, i]) => (i.flag !== null && i.flag !== void 0 && !i.flag.deleted && (e[r] = i.flag.value), e), {});
    }
    async close() {
      var t;
      await this.flush(), (t = this.b) == null || t.close(), this.dataManager.close(), this.logger.debug("Closed event processor and data source.");
    }
    async flush() {
      var t;
      try {
        await ((t = this.b) == null ? void 0 : t.flush()), this.logger.debug("Successfully flushed event processor.");
      } catch (e) {
        return this.logger.error(`Error flushing event processor: ${e}.`), { error: e, result: false };
      }
      return { result: true };
    }
    getContext() {
      return this.l.hasContext() ? sn(this.l.getUnwrappedContext()) : void 0;
    }
    getInternalContext() {
      return this.l.getContext();
    }
    presetFlags(t) {
      this.N.presetFlags(t);
    }
    start(t) {
      var r, i;
      if (this.initializeResult) return Promise.resolve(this.initializeResult);
      if (this.startPromise) return this.startPromise;
      if (!this.initialContext) return this.logger.error("Initial context not set"), Promise.resolve({ status: "failed", error: new Error("Initial context not set") });
      let e = U(E({}, (r = t == null ? void 0 : t.identifyOptions) != null ? r : {}), { sheddable: false });
      if (t != null && t.bootstrap && !e.bootstrap && (e.bootstrap = t.bootstrap), e.bootstrap) try {
        e.bootstrapParsed || (e.bootstrapParsed = xe(this.logger, e.bootstrap)), e.bootstrapParsed && this.presetFlags(e.bootstrapParsed);
      } catch (s) {
        this.logger.error("Failed to bootstrap data", s);
      }
      return this.initializedPromise || (this.initializedPromise = new Promise((s) => {
        this.initResolve = s;
      })), this.startPromise = this.Nt(this.initializedPromise, (i = t == null ? void 0 : t.timeout) != null ? i : 5, "start"), this.identifyResult(this.initialContext, e), this.startPromise;
    }
    async identify(t, e) {
      let r = await this.identifyResult(t, e);
      if (r.status === "error") throw r.error;
      if (r.status === "timeout") {
        let i = new xt(`identify timed out after ${r.timeout} seconds.`);
        throw this.logger.error(i.message), i;
      }
    }
    async identifyResult(t, e) {
      var o, c;
      if (this.we && !this.startPromise) return this.logger.error("The client must be started before a context can be identified. Call start() prior to identifying a context."), { status: "error", error: new Error("Identify called before start") };
      let r = (o = e == null ? void 0 : e.timeout) != null ? o : ca, i = (e == null ? void 0 : e.timeout) === void 0 && (e == null ? void 0 : e.noTimeout) === true;
      r > this.Ot && this.logger.warn(`The identify function was called with a timeout greater than ${this.Ot} seconds. We recommend a timeout of less than ${this.Ot} seconds.`);
      let s = this.kn.execute({ before: async () => {
        let l = await zs(t, this.platform);
        this.autoEnvAttributes === bt.Enabled && (l = await As(l, this.platform, this.e));
        let u = Y.fromLDContext(l);
        if (u.valid) {
          let d = this.R.identify(l, e == null ? void 0 : e.timeout);
          return { context: l, checkedContext: u, afterIdentify: d };
        }
        return { context: l, checkedContext: u };
      }, execute: async (l) => {
        var v;
        let { context: u, checkedContext: d } = l;
        if (!d.valid) {
          let f = new Error("Context was unspecified or had no key");
          return this.emitter.emit("error", u, f), Promise.reject(f);
        }
        this.l.set(u, d), (v = this.b) == null || v.sendEvent(this.M.identifyEvent(d));
        let { identifyPromise: h, identifyResolve: m, identifyReject: b } = this.l.newIdentificationPromise();
        return this.logger.debug(`Identifying ${JSON.stringify(d)}`), await this.dataManager.identify(m, b, d, e), h;
      }, after: async (l, u) => {
        var d, h, m;
        l.status === "complete" ? (d = u == null ? void 0 : u.afterIdentify) == null || d.call(u, { status: "completed" }) : l.status === "shed" ? (h = u == null ? void 0 : u.afterIdentify) == null || h.call(u, { status: "shed" }) : l.status === "error" && ((m = u == null ? void 0 : u.afterIdentify) == null || m.call(u, { status: "error" }));
      } }, (c = e == null ? void 0 : e.sheddable) != null ? c : false).then((l) => {
        if (l.status === "error") {
          let d = { status: "error", error: l.error };
          return this.maybeSetInitializationResult({ status: "failed", error: l.error }), d;
        }
        if (l.status === "shed") return { status: "shed" };
        let u = { status: "completed" };
        return this.maybeSetInitializationResult({ status: "complete" }), u;
      });
      if (i) return s;
      let a = new Promise((l) => {
        setTimeout(() => {
          l({ status: "timeout", timeout: r });
        }, r * 1e3);
      });
      return Promise.race([s, a]);
    }
    maybeSetInitializationResult(t) {
      this.initializeResult === void 0 && (this.initializeResult = t, this.emitter.emit("ready"), t.status === "complete" && this.emitter.emit("initialized"), this.initResolve && (this.initResolve(t), this.initResolve = void 0));
    }
    waitForInitialization(t) {
      var r;
      let e = (r = t == null ? void 0 : t.timeout) != null ? r : 5;
      return this.initializeResult ? Promise.resolve(this.initializeResult) : this.initializedPromise ? this.Nt(this.initializedPromise, e) : (this.initializedPromise || (this.initializedPromise = new Promise((i) => {
        this.initResolve = i;
      })), this.Nt(this.initializedPromise, e));
    }
    Nt(t, e, r = "waitForInitialization") {
      let i = rn(e, r);
      return Promise.race([t.then((s) => (i.cancel(), s)), i.promise.then(() => ({ status: "complete" })).catch(() => ({ status: "timeout" }))]).catch((s) => {
        var a;
        return (a = this.logger) == null || a.error(s.message), { status: "failed", error: s };
      });
    }
    on(t, e) {
      this.emitter.on(t, e);
    }
    off(t, e) {
      this.emitter.off(t, e);
    }
    track(t, e, r) {
      var i, s;
      if (!this.l.hasValidContext()) {
        this.logger.warn(br.MissingContextKeyNoEvent);
        return;
      }
      r !== void 0 && !p.Number.is(r) && ((i = this.logger) == null || i.warn(br.invalidMetricValue(typeof r))), (s = this.b) == null || s.sendEvent(this.e.trackEventModifier(this.M.customEvent(t, this.l.getContext(), e, r))), this.R.afterTrack({ key: t, context: this.l.getUnwrappedContext(), data: e, metricValue: r });
    }
    ht(t, e, r, i, s) {
      var b, v, f, S, N;
      let a = this.l.hasContext();
      a || (b = this.logger) == null || b.warn("Flag evaluation called before client is fully initialized, data from this evaulation could be stale.");
      let o = this.l.getContext(), c = this.N.get(t);
      if (c === void 0 || c.flag.deleted) {
        let P = e != null ? e : null;
        return (v = this.logger) == null || v.warn(`Unknown feature flag "${t}"; returning default value ${P}.`), a && ((f = this.b) == null || f.sendEvent(this.M.unknownFlagEvent(t, P, o))), yr(Er.FlagNotFound, e);
      }
      let { reason: l, value: u, variation: d, prerequisites: h } = c.flag;
      if (i) {
        let [P, j] = i(u);
        if (!P) {
          a && ((S = this.b) == null || S.sendEvent(r.evalEventClient(t, e, e, c.flag, o, l)));
          let w = new ue(`Wrong type "${j}" for feature flag "${t}"; returning default value`);
          return this.emitter.emit("error", this.l.getUnwrappedContext(), w), yr(Er.WrongType, e);
        }
      }
      let m = gr(u, d, l);
      if (u == null && (this.logger.debug("Result value is null. Providing default value."), m.value = e), h && h.length > 0) {
        let P = s != null ? s : /* @__PURE__ */ new Set();
        P.add(t);
        try {
          for (let j of h) P.has(j) || this.ht(j, void 0, this.M, void 0, P);
        } finally {
          P.delete(t);
        }
      }
      return a && ((N = this.b) == null || N.sendEvent(r.evalEventClient(t, u, e, c.flag, o, l))), m;
    }
    variation(t, e) {
      let { value: r } = this.R.withEvaluation(t, this.l.getUnwrappedContext(), e, () => this.ht(t, e, this.M));
      return r;
    }
    variationDetail(t, e) {
      return this.R.withEvaluation(t, this.l.getUnwrappedContext(), e, () => this.ht(t, e, this.dt));
    }
    H(t, e, r, i) {
      return this.R.withEvaluation(t, this.l.getUnwrappedContext(), e, () => this.ht(t, e, r, i));
    }
    boolVariation(t, e) {
      return this.H(t, e, this.M, (r) => [p.Boolean.is(r), p.Boolean.getType()]).value;
    }
    jsonVariation(t, e) {
      return this.variation(t, e);
    }
    numberVariation(t, e) {
      return this.H(t, e, this.M, (r) => [p.Number.is(r), p.Number.getType()]).value;
    }
    stringVariation(t, e) {
      return this.H(t, e, this.M, (r) => [p.String.is(r), p.String.getType()]).value;
    }
    boolVariationDetail(t, e) {
      return this.H(t, e, this.dt, (r) => [p.Boolean.is(r), p.Boolean.getType()]);
    }
    numberVariationDetail(t, e) {
      return this.H(t, e, this.dt, (r) => [p.Number.is(r), p.Number.getType()]);
    }
    stringVariationDetail(t, e) {
      return this.H(t, e, this.dt, (r) => [p.String.is(r), p.String.getType()]);
    }
    jsonVariationDetail(t, e) {
      return this.variationDetail(t, e);
    }
    addHook(t) {
      this.R.addHook(t);
    }
    setEventSendingEnabled(t, e) {
      var r, i, s, a;
      this.$t !== t && (this.$t = t, t ? (this.logger.debug("Starting event processor"), (r = this.b) == null || r.start()) : e ? ((i = this.logger) == null || i.debug("Flushing event processor before disabling."), this.flush().then(() => {
        var o, c;
        this.$t || ((o = this.logger) == null || o.debug("Stopping event processor."), (c = this.b) == null || c.close());
      })) : ((s = this.logger) == null || s.debug("Stopping event processor."), (a = this.b) == null || a.close()));
    }
    sendEvent(t) {
      var e;
      (e = this.b) == null || e.sendEvent(t);
    }
    Sn(t, e) {
      if (!this.Y.hasInspectors()) return;
      let r = {};
      t.forEach((i) => {
        let s = this.N.get(i);
        if (s != null && s.flag && !s.flag.deleted) {
          let { reason: a, value: o, variation: c } = s.flag;
          r[i] = gr(o, c, a);
        } else r[i] = { value: void 0, variationIndex: null };
      }), e === "init" ? this.Y.onFlagsChanged(r) : e === "patch" && Object.entries(r).forEach(([i, s]) => {
        this.Y.onFlagChanged(i, s);
      });
    }
  };
  function qr(n5, t) {
    return { async get(e) {
      try {
        let r = await n5.get(e);
        return typeof r == "string" ? r : null;
      } catch (r) {
        return t == null || t.error(`Error getting key from storage: ${e}, reason: ${r}`), null;
      }
    }, async set(e, r) {
      try {
        await n5.set(e, r);
      } catch (i) {
        t == null || t.error(`Error setting key in storage: ${e}, reason: ${i}`);
      }
    }, async clear(e) {
      try {
        await n5.clear(e);
      } catch (r) {
        t == null || t.error(`Error clearing key from storage: ${e}, reason: ${r}`);
      }
    } };
  }
  function Kr(n5, t, e) {
    e.forEach((r) => {
      var i;
      try {
        (i = r.registerDebug) == null || i.call(r, t);
      } catch (s) {
        n5.error(`Exception thrown registering plugin ${_.safeGetName(n5, r)}.`);
      }
    });
  }
  function An(n5) {
    return { polling: () => ({ pathGet(t, e) {
      return `/sdk/evalx/${n5}/contexts/${At(e, t)}`;
    }, pathReport(t, e) {
      return `/sdk/evalx/${n5}/context`;
    }, pathPost(t, e) {
      throw new Error("Post for FDv1 unsupported.");
    }, pathPing(t, e) {
      throw new Error("Ping for polling unsupported.");
    } }), streaming: () => ({ pathGet(t, e) {
      return `/eval/${n5}/${At(e, t)}`;
    }, pathReport(t, e) {
      return `/eval/${n5}`;
    }, pathPost(t, e) {
      throw new Error("Post for FDv1 unsupported.");
    }, pathPing(t, e) {
      return `/ping/${n5}`;
    } }) };
  }
  function la() {
    return { polling: () => ({ pathGet(n5, t) {
      return `/sdk/poll/eval/${At(t, n5)}`;
    }, pathReport(n5, t) {
      throw new Error("Report for FDv2 unsupported.");
    }, pathPost(n5, t) {
      return "/sdk/poll/eval";
    }, pathPing(n5, t) {
      throw new Error("Ping for polling unsupported.");
    } }), streaming: () => ({ pathGet(n5, t) {
      return `/sdk/stream/eval/${At(t, n5)}`;
    }, pathReport(n5, t) {
      throw new Error("Report for FDv2 unsupported.");
    }, pathPost(n5, t) {
      return "/sdk/stream/eval";
    }, pathPing(n5, t) {
      throw new Error("Ping for streaming unsupported.");
    } }) };
  }
  function ua(n5, t, e) {
    return { async handlePut(r, i) {
      e.debug(`Got PUT: ${Object.keys(i)}`);
      let s = Object.entries(i).reduce((a, [o, c]) => (a[o] = { version: c.version, flag: c }, a), {});
      await n5.init(r, s), t.requestStateUpdate("VALID");
    }, async handlePatch(r, i) {
      e.debug(`Got PATCH ${JSON.stringify(i, null, 2)}`), n5.upsert(r, i.key, { version: i.version, flag: i });
    }, async handleDelete(r, i) {
      e.debug(`Got DELETE ${JSON.stringify(i, null, 2)}`), n5.upsert(r, i.key, { version: i.version, flag: U(E({}, i), { deleted: true, flagVersion: 0, value: void 0, variation: 0, trackEvents: false }) });
    }, handleStreamingError(r) {
      t.reportError(r.kind, r.message, r.code, r.recoverable);
    }, handlePollingError(r) {
      t.reportError(r.kind, r.message, r.status, r.recoverable);
    } };
  }
  function Jr(n5, t = () => Date.now()) {
    let e = "CLOSED", r = t(), i;
    function s() {
      return { state: e, stateSince: r, lastError: i };
    }
    function a(o, c = false) {
      let l = o === "INTERRUPTED" && e === "INITIALIZING" ? "INITIALIZING" : o, u = e !== l;
      u && (e = l, r = t()), (u || c) && n5.emit("dataSourceStatus", s());
    }
    return { get status() {
      return s();
    }, requestStateUpdate(o) {
      a(o);
    }, reportError(o, c, l, u = false) {
      i = { kind: o, message: c, statusCode: l, time: t() }, a(u ? "INTERRUPTED" : "CLOSED", true);
    } };
  }
  function Dr(n5) {
    n5 == null || n5.debug("Poll completed after the processor was closed. Skipping processing.");
  }
  var En = class {
    constructor(t, e, r, i, s) {
      this.In = t, this.Cn = e, this.Fn = r, this.m = i, this.t = s, this.h = false;
    }
    async Ee() {
      var s, a, o, c, l, u, d;
      if (this.h) return;
      let t = (h) => {
        var m, b, v;
        (m = this.t) == null || m.error("Polling received invalid data"), (b = this.t) == null || b.debug(`Invalid JSON follows: ${h}`), (v = this.m) == null || v.call(this, new ft(O.InvalidData, "Malformed JSON data in polling response"));
      };
      (s = this.t) == null || s.debug("Polling LaunchDarkly for feature flag updates");
      let e = Date.now();
      try {
        let h = await this.In.requestPayload();
        try {
          if (this.h) {
            Dr(this.t);
            return;
          }
          let m = JSON.parse(h);
          try {
            (a = this.Fn) == null || a.call(this, m);
          } catch (b) {
            (o = this.t) == null || o.error(`Exception from data handler: ${b}`);
          }
        } catch (m) {
          t(h);
        }
      } catch (h) {
        if (this.h) {
          Dr(this.t);
          return;
        }
        let m = h;
        if (m.status !== void 0 && !mt(m.status)) {
          (c = this.t) == null || c.error(K(h, "polling request")), (l = this.m) == null || l.call(this, new ft(O.ErrorResponse, m.message, m.status));
          return;
        }
        (u = this.t) == null || u.error(K(h, "polling request", "will retry"));
      }
      let r = Date.now() - e, i = Math.max(this.Cn * 1e3 - r, 0);
      (d = this.t) == null || d.debug("Elapsed: %d ms, sleeping for %d ms", r, i), this.Rt = setTimeout(() => {
        this.Ee();
      }, i);
    }
    start() {
      this.Ee();
    }
    stop() {
      this.Rt && (clearTimeout(this.Rt), this.Rt = void 0), this.h = true;
    }
    close() {
      this.stop();
    }
  };
  var da = (n5, t, e, r) => {
    e == null || e.error(`Stream received invalid data in "${n5}" message`), e == null || e.debug(`Invalid JSON follows: ${t}`), r == null || r(new wt(O.InvalidData, "Malformed JSON data in event stream"));
  };
  function ha(n5, t) {
    t == null || t.debug(`Received ${n5} event after processor was closed. Skipping processing.`);
  }
  function kr(n5) {
    n5 == null || n5.debug("Ping completed after processor was closed. Skipping processing.");
  }
  var Dn = class {
    constructor(t, e, r, i, s, a, o, c, l) {
      var h;
      this.Tn = t, this.Ut = e, this.n = r, this._ = i, this.xn = a, this.I = o, this.m = c, this.t = l, this.h = false;
      let u;
      e.useReport && !i.getEventSourceCapabilities().customMethod ? u = e.paths.pathPing(s, t) : u = e.useReport ? e.paths.pathReport(s, t) : e.paths.pathGet(s, t);
      let d = [...(h = e.queryParameters) != null ? h : []];
      this.Ut.withReasons && d.push({ key: "withReasons", value: "true" }), this._ = i, this.De = E({}, e.baseHeaders), this.t = l, this.Ln = ln(e.serviceEndpoints, u, d);
    }
    ke() {
      this.ft = Date.now();
    }
    _t(t) {
      this.ft && this.I && this.I.recordStreamInit(this.ft, !t, Date.now() - this.ft), this.ft = void 0;
    }
    Mn(t) {
      var e, r, i;
      return Pt(t) ? ((i = this.t) == null || i.warn(K(t, "streaming request", "will retry")), this._t(false), this.ke(), true) : (this._t(false), (e = this.m) == null || e.call(this, new wt(O.ErrorResponse, t.message, t.status, false)), (r = this.t) == null || r.error(K(t, "streaming request")), false);
    }
    start() {
      this.ke();
      let t;
      this.Ut.useReport ? (this.De["content-type"] = "application/json", t = { method: "REPORT", body: this.Tn }) : t = {};
      let e = this._.createEventSource(this.Ln, U(E({ headers: this.De }, t), { errorFilter: (r) => this.Mn(r), initialRetryDelayMillis: this.Ut.initialRetryDelayMillis, readTimeoutMillis: 300 * 1e3, retryResetIntervalMillis: 60 * 1e3 }));
      this.Se = e, e.onclose = () => {
        var r;
        (r = this.t) == null || r.info("Closed LaunchDarkly stream connection");
      }, e.onerror = () => {
      }, e.onopen = () => {
        var r;
        (r = this.t) == null || r.info("Opened LaunchDarkly stream connection");
      }, e.onretrying = (r) => {
        var i;
        (i = this.t) == null || i.info(`Will retry stream connection in ${r.delayMillis} milliseconds`);
      }, this.n.forEach(({ deserializeData: r, processJson: i }, s) => {
        e.addEventListener(s, (a) => {
          var o, c;
          if (this.h) {
            ha(s, this.t);
            return;
          }
          if ((o = this.t) == null || o.debug(`Received ${s} event`), a != null && a.data) {
            this._t(true);
            let { data: l } = a, u = r(l);
            if (!u) {
              da(s, l, this.t, this.m);
              return;
            }
            i(u);
          } else (c = this.m) == null || c.call(this, new wt(O.InvalidData, "Unexpected payload from event stream"));
        });
      }), e.addEventListener("ping", async () => {
        var r, i, s, a, o, c, l;
        (r = this.t) == null || r.debug("Got PING, going to poll LaunchDarkly for feature flag updates");
        try {
          let u = await this.xn.requestPayload();
          try {
            if (this.h) {
              kr(this.t);
              return;
            }
            let d = JSON.parse(u);
            try {
              (i = this.n.get("put")) == null || i.processJson(d);
            } catch (h) {
              (s = this.t) == null || s.error(`Exception from data handler: ${h}`);
            }
          } catch (d) {
            (a = this.t) == null || a.error("Polling after ping received invalid data"), (o = this.t) == null || o.debug(`Invalid JSON follows: ${u}`), (c = this.m) == null || c.call(this, new ft(O.InvalidData, "Malformed JSON data in ping polling response"));
          }
        } catch (u) {
          if (this.h) {
            kr(this.t);
            return;
          }
          let d = u;
          (l = this.m) == null || l.call(this, new ft(O.ErrorResponse, d.message, d.status));
        }
      });
    }
    stop() {
      var t;
      (t = this.Se) == null || t.close(), this.Se = void 0, this.h = true;
    }
    close() {
      this.stop();
    }
  };
  var Ie = class {
    constructor(t, e, r, i, s, a, o, c, l) {
      this.platform = t, this.flagManager = e, this.credential = r, this.config = i, this.getPollingPaths = s, this.getStreamingPaths = a, this.baseHeaders = o, this.emitter = c, this.diagnosticsManager = l, this.closed = false, this.logger = i.logger, this.dataSourceStatusManager = Jr(c), this.G = ua(e, this.dataSourceStatusManager, this.config.logger);
    }
    setConnectionParams(t) {
      this.Pn = t;
    }
    createPollingProcessor(t, e, r, i, s) {
      let a = new En(r, this.config.pollInterval, async (o) => {
        await this.G.handlePut(e, o), i == null || i();
      }, (o) => {
        this.emitter.emit("error", t, o), this.G.handlePollingError(o), s == null || s(o);
      }, this.logger);
      this.updateProcessor = this.Ie(a, this.dataSourceStatusManager);
    }
    createStreamingProcessor(t, e, r, i, s) {
      var o;
      let a = new Dn(JSON.stringify(t), { credential: this.credential, serviceEndpoints: this.config.serviceEndpoints, paths: this.getStreamingPaths(), baseHeaders: this.baseHeaders, initialRetryDelayMillis: this.config.streamInitialReconnectDelay * 1e3, withReasons: this.config.withReasons, useReport: this.config.useReport, queryParameters: (o = this.Pn) == null ? void 0 : o.queryParameters }, this.createStreamListeners(e, i), this.platform.requests, this.platform.encoding, r, this.diagnosticsManager, (c) => {
        this.emitter.emit("error", t, c), this.G.handleStreamingError(c), s == null || s(c);
      }, this.logger);
      this.updateProcessor = this.Ie(a, this.dataSourceStatusManager);
    }
    createStreamListeners(t, e) {
      let r = /* @__PURE__ */ new Map();
      return r.set("put", { deserializeData: JSON.parse, processJson: async (i) => {
        await this.G.handlePut(t, i), e == null || e();
      } }), r.set("patch", { deserializeData: JSON.parse, processJson: async (i) => {
        this.G.handlePatch(t, i);
      } }), r.set("delete", { deserializeData: JSON.parse, processJson: async (i) => {
        this.G.handleDelete(t, i);
      } }), r;
    }
    Ie(t, e) {
      return { start: () => {
        e.requestStateUpdate("INITIALIZING"), t.start();
      }, stop: () => {
        t.stop(), e.requestStateUpdate("CLOSED");
      }, close: () => {
        t.close(), e.requestStateUpdate("CLOSED");
      } };
    }
    close() {
      var t;
      (t = this.updateProcessor) == null || t.close(), this.closed = true;
    }
  };
  function fa(n5, t) {
    return Object.entries(n5).every(([e, r]) => r === void 0 || t[e] === r);
  }
  var pa = { foreground: "foregroundMode", background: "backgroundMode" };
  function ma(n5, t) {
    let e = n5.find((r) => fa(r.conditions, t));
    if (e) {
      let { mode: r } = e;
      return typeof r == "object" ? t[pa[r.configured]] : r;
    }
    return t.foregroundMode;
  }
  var Wr = [{ conditions: { networkAvailable: false }, mode: "offline" }, { conditions: {}, mode: { configured: "foreground" } }];
  function yt(n5, t, e, r) {
    return { type: "changeSet", payload: n5, fdv1Fallback: t.fdv1Fallback, environmentId: e, freshness: r, fdv1FallbackTtlMs: t.fdv1FallbackTtlMs };
  }
  function B(n5, t) {
    return { type: "status", state: "interrupted", errorInfo: n5, fdv1Fallback: t.fdv1Fallback, fdv1FallbackTtlMs: t.fdv1FallbackTtlMs };
  }
  function Q() {
    return { type: "status", state: "shutdown", fdv1Fallback: false };
  }
  function ct(n5, t) {
    return { type: "status", state: "terminal_error", errorInfo: n5, fdv1Fallback: t.fdv1Fallback, fdv1FallbackTtlMs: t.fdv1FallbackTtlMs };
  }
  function Yr(n5, t) {
    return { type: "status", state: "goodbye", reason: n5, fdv1Fallback: t.fdv1Fallback, fdv1FallbackTtlMs: t.fdv1FallbackTtlMs };
  }
  function Dt(n5) {
    return { kind: O.ErrorResponse, message: `Unexpected status code: ${n5}`, statusCode: n5, time: Date.now() };
  }
  function Ce(n5) {
    return { kind: O.NetworkError, message: n5, time: Date.now() };
  }
  function gt(n5) {
    return { kind: O.InvalidData, message: n5, time: Date.now() };
  }
  function Nt(n5) {
    return { kind: O.Unknown, message: n5, time: Date.now() };
  }
  function ya(n5) {
    let r = n5, { version: t } = r;
    return re(r, ["version"]);
  }
  async function ga(n5) {
    let { storage: t, crypto: e, environmentNamespace: r, context: i, logger: s } = n5;
    if (!t) return s == null || s.debug("No storage available for cache initializer"), yt({ version: 0, type: "none", updates: [] }, { fdv1Fallback: false });
    let a = await _r(t, e, r, i, s);
    if (!a) return s == null || s.debug("Cache miss for context"), yt({ version: 0, type: "none", updates: [] }, { fdv1Fallback: false });
    let c = { version: 0, type: "full", updates: Object.entries(a.flags).map(([u, d]) => ({ kind: "flag-eval", key: u, version: d.version, object: ya(d) })) }, l = await Gs(t, e, r, i, s);
    return s == null || s.debug("Loaded cached flag evaluations via cache initializer"), yt(c, { fdv1Fallback: false }, void 0, l);
  }
  function va(n5) {
    return { isCache: true, create(t) {
      let e, r = new Promise((i) => {
        e = i;
      });
      return { async run() {
        return Promise.race([r, ga(n5)]);
      }, close() {
        e == null || e(Q()), e = void 0;
      } };
    } };
  }
  function Xr(n5, t, e, r, i, s, a, o) {
    let c = E({}, s), l, u = "GET", d;
    return o ? (u = "POST", c["content-type"] = "application/json", l = n5, d = e.pathPost(i, n5)) : d = e.pathGet(i, n5), { async poll(h) {
      let m = [...a != null ? a : []];
      h && m.push({ key: "basis", value: h });
      let b = un(t, d, m), v = await r.fetch(b, { method: u, headers: c, body: l }), f = v.status === 304 ? null : await v.text();
      return { status: v.status, headers: v.headers, body: f };
    } };
  }
  function Zr(n5) {
    return n5;
  }
  function wa(n5) {
    if (n5.deleted) return { version: n5.version, flag: { version: n5.version, deleted: true, value: void 0, trackEvents: false } };
    let t = n5.object;
    return { version: n5.version, flag: U(E({}, t), { version: n5.version }) };
  }
  function ba(n5) {
    let t = {};
    return n5.forEach((e) => {
      e.kind === "flag-eval" && (t[e.key] = wa(e));
    }), t;
  }
  function Ea(n5) {
    var t;
    return (t = n5.get("x-ld-envid")) != null ? t : void 0;
  }
  function Da(n5, t, e, r) {
    let i = _.createProtocolHandler({ "flag-eval": Zr }, r), s;
    if (n5.forEach((o) => {
      if (s) return;
      let c = i.processEvent(o);
      switch (c.type) {
        case "payload":
          s = yt(c.payload, t, e);
          break;
        case "goodbye":
          t.fdv1Fallback ? s = ct(Nt(c.reason), t) : s = Yr(c.reason, t);
          break;
        case "serverError": {
          let l = Nt(c.reason);
          r == null || r.error(`Server error during polling: ${c.reason}`), s = B(l, t);
          break;
        }
        case "error": {
          if (c.kind === "MISSING_PAYLOAD" || c.kind === "PROTOCOL_ERROR") {
            let l = gt(c.message);
            r == null || r.warn(`Protocol error during polling: ${c.message}`), s = B(l, t);
          } else r == null || r.warn(c.message);
          break;
        }
      }
    }), s) return s;
    let a = Nt("Unexpected end of polling response");
    return r == null || r.error("Unexpected end of polling response"), B(a, t);
  }
  async function On(n5, t, e) {
    var s;
    let r = { fdv1Fallback: false }, i;
    try {
      let a = await n5.poll(t);
      if (r = _.readFallbackDirective(a.headers), i = Ea(a.headers), a.status === 304) return yt({ version: 0, type: "none", updates: [] }, r, i);
      if (a.status < 200 || a.status >= 300) {
        let c = Dt(a.status);
        return e == null || e.error(`Polling request failed with HTTP error: ${a.status}`), a.status <= 0 || mt(a.status) ? B(c, r) : ct(c, r);
      }
      if (!a.body) {
        let c = gt("Empty response body");
        return e == null || e.error("Polling request received empty response body"), B(c, r);
      }
      let o;
      try {
        o = JSON.parse(a.body);
      } catch (c) {
        let l = gt("Malformed JSON data in polling response");
        return e == null || e.error("Polling request received malformed data"), B(l, r);
      }
      if (!Array.isArray(o.events)) {
        let c = gt("Invalid polling response: missing or invalid events array");
        return e == null || e.error("Polling response does not contain a valid events array"), B(c, r);
      }
      return Da(o.events, r, i, e);
    } catch (a) {
      let o = (s = a == null ? void 0 : a.message) != null ? s : String(a);
      e == null || e.error(`Polling request failed with network error: ${o}`);
      let c = Ce(o);
      return B(c, r);
    }
  }
  var hn = Symbol("shutdown");
  function ka(n5, t, e) {
    let r, i = new Promise((s) => {
      r = s;
    });
    return { async run() {
      let o = e(), c;
      for (let u = 0; u <= 3; u += 1) {
        let d = await Promise.race([i, On(n5, o, t)]);
        if (d === hn) return Q();
        if (d.type === "changeSet" || d.state !== "interrupted") return d;
        if (d.fdv1Fallback) return ct(d.errorInfo, { fdv1Fallback: d.fdv1Fallback, fdv1FallbackTtlMs: d.fdv1FallbackTtlMs });
        if (c = d, u < 3 && (t == null || t.warn(`Recoverable polling error (attempt ${u + 1}/4), retrying in 1000ms...`), await Promise.race([i, Ot(1e3)]) === hn)) return Q();
      }
      let l = c;
      return ct(l.errorInfo, { fdv1Fallback: l.fdv1Fallback, fdv1FallbackTtlMs: l.fdv1FallbackTtlMs });
    }, close() {
      r == null || r(hn), r = void 0;
    } };
  }
  function $n() {
    let n5 = [], t = [];
    return { put(e) {
      let r = t.shift();
      r ? r(e) : n5.push(e);
    }, take() {
      return n5.length > 0 ? Promise.resolve(n5.shift()) : new Promise((e) => {
        t.push(e);
      });
    } };
  }
  function Sa(n5, t, e, r) {
    let i = $n(), s, a = new Promise((u) => {
      s = u;
    }), o, c = false;
    async function l() {
      if (c) return;
      let u = Date.now();
      try {
        let d = await On(n5, e(), t);
        if (c) return;
        let h = false;
        if (d.type === "status") switch (d.state) {
          case "terminal_error":
            c = true, h = true;
            break;
          case "interrupted":
          case "goodbye":
            break;
          case "shutdown":
            break;
          default:
            break;
        }
        h ? (s == null || s(d), s = void 0) : i.put(d);
      } catch (d) {
        t == null || t.debug(`Polling error: ${d}`);
      }
      if (!c) {
        let d = Date.now() - u, h = Math.min(Math.max(r - d, 0), r);
        o = setTimeout(() => {
          l();
        }, h);
      }
    }
    return l(), { async next() {
      return Promise.race([a, i.take()]);
    }, close() {
      c = true, o !== void 0 && (clearTimeout(o), o = void 0), s == null || s(Q()), s = void 0;
    } };
  }
  function kn(n5, t) {
    var i, s;
    let e = (i = t == null ? void 0 : t.isFDv1Fallback) != null ? i : false, r = (s = t == null ? void 0 : t.initialState) != null ? s : e ? "blocked" : "available";
    return { factory: n5, isFDv1Fallback: e, state: r };
  }
  function Ia(n5, t, e) {
    let r, i = -1, s = -1, a = false;
    function o() {
      r && (r.close(), r = void 0);
    }
    function c() {
      return t.findIndex((l) => l.state === "available");
    }
    return { get isShutdown() {
      return a;
    }, getNextInitializerAndSetActive() {
      if (a || (i += 1, i >= n5.length)) return;
      o();
      let l = n5[i].create(e);
      return r = l, l;
    }, getNextAvailableSynchronizerAndSetActive() {
      if (a || t.length === 0) return;
      let l = 0;
      for (; l < t.length; ) {
        s += 1, s >= t.length && (s = 0);
        let u = t[s];
        if (u.state === "available") {
          o();
          let d = u.factory.create(e);
          return r = d, d;
        }
        l += 1;
      }
    }, blockCurrentSynchronizer() {
      s >= 0 && s < t.length && (t[s].state = "blocked");
    }, resetSourceIndex() {
      s = -1;
    }, fdv1Fallback() {
      t.forEach((l) => {
        l.state = l.isFDv1Fallback ? "available" : "blocked";
      }), s = -1;
    }, fdv2Recovery() {
      t.forEach((l) => {
        l.state = l.isFDv1Fallback ? "blocked" : "available";
      }), s = -1;
    }, get isCurrentSynchronizerFDv1Fallback() {
      var l;
      return ((l = t[s]) == null ? void 0 : l.isFDv1Fallback) === true;
    }, isPrimeSynchronizer() {
      return s === c();
    }, getAvailableSynchronizerCount() {
      return t.filter((l) => l.state === "available").length;
    }, hasFDv1Fallback() {
      return t.some((l) => l.isFDv1Fallback);
    }, close() {
      a = true, o();
    } };
  }
  var Ca = ["server-intent", "put-object", "delete-object", "payload-transferred", "goodbye", "error", "heart-beat"];
  function Fa(n5) {
    let t = $n(), e = _.createProtocolHandler({ "flag-eval": Zr }, n5.logger), r = E({}, n5.headers);
    function i() {
      var y;
      let w = [...n5.parameters], g = (y = n5.selectorGetter) == null ? void 0 : y.call(n5);
      return g && w.push({ key: "basis", value: encodeURIComponent(g) }), ln(n5.serviceEndpoints, n5.streamUriPath, w);
    }
    let s, a, o = false, c, l, u = false, d = false, h = false;
    function m() {
      a = Date.now();
    }
    function b(w) {
      a && n5.diagnosticsManager && n5.diagnosticsManager.recordStreamInit(a, !w, Date.now() - a), a = void 0;
    }
    function v(w) {
      return w != null && w.fdv1Fallback ? (o = true, c = w.fdv1FallbackTtlMs, u = false, l = void 0, { fdv1Fallback: o, fdv1FallbackTtlMs: c }) : (u && (o = true, c = l, u = false, l = void 0), { fdv1Fallback: o, fdv1FallbackTtlMs: c });
    }
    function f(w, g) {
      t.put(w(v(g)));
    }
    function S(w, g) {
      switch (w.type) {
        case "payload":
          b(true), f((y) => yt(w.payload, y));
          break;
        case "goodbye": {
          let y = _.readGoodbyeFallbackDirective(g);
          f((C) => C.fdv1Fallback ? ct(Nt(w.reason), C) : Yr(w.reason, C), y);
          break;
        }
        case "serverError":
          f((y) => B(Nt(w.reason), y));
          break;
        case "error":
          (w.kind === "MISSING_PAYLOAD" || w.kind === "PROTOCOL_ERROR") && f((y) => B(gt(w.message), y));
          break;
      }
    }
    function N(w) {
      var C, F, x;
      let g = (C = w.headers) != null ? C : {}, y = _.readFallbackDirective({ get: (I) => {
        var D;
        return (D = g[I.toLowerCase()]) != null ? D : null;
      } });
      return y.fdv1Fallback ? (b(false), f((I) => {
        var D;
        return ct(Dt((D = w.status) != null ? D : 0), I);
      }, y), false) : Pt(w) ? ((x = n5.logger) == null || x.warn(K(w, "streaming request", "will retry")), b(false), m(), f((I) => {
        var D;
        return B(Dt((D = w.status) != null ? D : 0), I);
      }), true) : ((F = n5.logger) == null || F.error(K(w, "streaming request")), b(false), f((I) => {
        var D;
        return ct(Dt((D = w.status) != null ? D : 0), I);
      }), false);
    }
    function P(w) {
      Ca.forEach((g) => {
        w.addEventListener(g, (y) => {
          var x, I, D, M, tt;
          if (h) {
            (x = n5.logger) == null || x.debug(`Received ${g} event after processor was closed. Skipping.`);
            return;
          }
          if (!(y != null && y.data)) {
            g !== "error" && ((I = n5.logger) == null || I.warn(`Event from EventStream missing data for "${g}".`));
            return;
          }
          (D = n5.logger) == null || D.debug(`Received ${g} event`);
          let C;
          try {
            C = JSON.parse(y.data);
          } catch (ut) {
            (M = n5.logger) == null || M.error(`Stream received data that was unable to be parsed in "${g}" message`), (tt = n5.logger) == null || tt.debug(`Data follows: ${y.data}`), f((et) => B(gt("Malformed JSON in EventStream"), et));
            return;
          }
          let F = e.processEvent({ event: g, data: C });
          S(F, C);
        });
      });
    }
    function j(w) {
      w.addEventListener("ping", async () => {
        var g, y, C, F, x, I;
        if (h) {
          (g = n5.logger) == null || g.debug("Ping received after processor was closed. Skipping.");
          return;
        }
        if ((y = n5.logger) == null || y.debug("Got PING, going to poll LaunchDarkly for feature flag updates"), !n5.pingHandler) {
          (C = n5.logger) == null || C.warn("Ping event received but no ping handler configured.");
          return;
        }
        try {
          let D = await n5.pingHandler.handlePing();
          if (h) {
            (F = n5.logger) == null || F.debug("Ping completed after processor was closed. Skipping processing.");
            return;
          }
          f((M) => !D.fdv1Fallback && M.fdv1Fallback ? U(E({}, D), { fdv1Fallback: true, fdv1FallbackTtlMs: M.fdv1FallbackTtlMs }) : D.fdv1Fallback && D.fdv1FallbackTtlMs === void 0 ? U(E({}, D), { fdv1FallbackTtlMs: M.fdv1FallbackTtlMs }) : D);
        } catch (D) {
          if (h) return;
          (I = n5.logger) == null || I.error(`Error handling ping: ${(x = D == null ? void 0 : D.message) != null ? x : D}`), f((M) => {
            var tt;
            return B(Ce((tt = D == null ? void 0 : D.message) != null ? tt : "Error during ping poll"), M);
          });
        }
      });
    }
    return { start() {
      if (d || h) return;
      d = true, m();
      let w = n5.requests.createEventSource(i(), { headers: r, errorFilter: (g) => N(g), initialRetryDelayMillis: n5.initialRetryDelayMillis, readTimeoutMillis: 300 * 1e3, retryResetIntervalMillis: 60 * 1e3, urlBuilder: i });
      s = w, w.onclose = () => {
        var g;
        (g = n5.logger) == null || g.info("Closed LaunchDarkly stream connection");
      }, w.onerror = (g) => {
        h || typeof (g == null ? void 0 : g.data) != "string" && (g && typeof g.status == "number" || f((y) => {
          var C;
          return B(Ce((C = g == null ? void 0 : g.message) != null ? C : "IO Error"), y);
        }));
      }, w.onopen = (g) => {
        var C;
        if (h) return;
        (C = n5.logger) == null || C.info("Opened LaunchDarkly stream connection"), e.reset(), o = false, c = void 0, u = false, l = void 0;
        let y = g == null ? void 0 : g.headers;
        if (y) {
          let F = _.readFallbackDirective({ get: (x) => {
            var I;
            return (I = y[x.toLowerCase()]) != null ? I : null;
          } });
          u = F.fdv1Fallback, l = F.fdv1FallbackTtlMs;
        }
      }, w.onretrying = (g) => {
        var y;
        (y = n5.logger) == null || y.info(`Will retry stream connection in ${g.delayMillis} milliseconds`);
      }, P(w), j(w);
    }, close() {
      h || (h = true, u = false, l = void 0, s == null || s.close(), s = void 0, t.put(Q()));
    }, takeResult() {
      return t.take();
    } };
  }
  function Ta(n5) {
    let t = false, e, r = new Promise((i) => {
      e = i;
    });
    return { run() {
      return t ? Promise.resolve(Q()) : (n5.start(), Promise.race([n5.takeResult().then((i) => (n5.close(), i)), r]));
    }, close() {
      t || (t = true, n5.close(), e == null || e(Q()), e = void 0);
    } };
  }
  function xa(n5) {
    let t = false, e = false, r, i = new Promise((s) => {
      r = s;
    });
    return { next() {
      return e ? Promise.resolve(Q()) : (t || (t = true, n5.start()), Promise.race([n5.takeResult(), i]));
    }, close() {
      e || (e = true, n5.close(), r == null || r(Q()), r = void 0);
    } };
  }
  function La(n5, t, e) {
    return { handlePing: () => On(n5, t(), e) };
  }
  function Qr(n5, t) {
    var e, r;
    return !(t != null && t.pollingBaseUri) && !(t != null && t.streamingBaseUri) ? n5.serviceEndpoints : new rt((e = t.streamingBaseUri) != null ? e : n5.serviceEndpoints.streaming, (r = t.pollingBaseUri) != null ? r : n5.serviceEndpoints.polling, n5.serviceEndpoints.events, n5.serviceEndpoints.analyticsEventPath, n5.serviceEndpoints.diagnosticEventPath, n5.serviceEndpoints.includeAuthorizationHeader, n5.serviceEndpoints.payloadFilterKey);
  }
  function Sn(n5, t) {
    if (!(t != null && t.pollingBaseUri)) return n5.requestor;
    let e = Qr(n5, t);
    return Xr(n5.plainContextString, e, n5.polling.paths, n5.requests, n5.encoding, n5.baseHeaders, n5.queryParams);
  }
  function Sr(n5, t, e) {
    var a;
    let r = Qr(t, n5.endpoints), i = Sn(t, n5.endpoints), s = t.streaming.paths.pathGet(t.encoding, t.plainContextString);
    return Fa({ requests: t.requests, serviceEndpoints: r, streamUriPath: s, parameters: t.queryParams, selectorGetter: e, headers: t.baseHeaders, initialRetryDelayMillis: ((a = n5.initialReconnectDelay) != null ? a : t.streaming.initialReconnectDelaySeconds) * 1e3, logger: t.logger, pingHandler: La(i, e, t.logger) });
  }
  function ti() {
    return { createInitializerFactory(n5, t) {
      switch (n5.type) {
        case "polling": {
          let e = Sn(t, n5.endpoints);
          return { create: (r) => ka(e, t.logger, r) };
        }
        case "streaming":
          return { create: (e) => Ta(Sr(n5, t, e)) };
        case "cache":
          return va({ storage: t.storage, crypto: t.crypto, environmentNamespace: t.environmentNamespace, context: t.context, logger: t.logger });
        default:
          return;
      }
    }, createSynchronizerSlot(n5, t) {
      var e;
      switch (n5.type) {
        case "polling": {
          let r = ((e = n5.pollInterval) != null ? e : t.polling.intervalSeconds) * 1e3, i = Sn(t, n5.endpoints);
          return kn({ create: (s) => Sa(i, t.logger, s, r) });
        }
        case "streaming":
          return kn({ create: (r) => xa(Sr(n5, t, r)) });
        default:
          return;
      }
    } };
  }
  function Ma(n5) {
    return { version: 1, type: "full", updates: Object.entries(n5).map(([e, r]) => {
      var i;
      return { kind: "flag-eval", key: e, version: (i = r.version) != null ? i : 1, object: r };
    }) };
  }
  function Pa(n5, t, e) {
    let r = $n(), i, s = new Promise((d) => {
      i = d;
    }), a, o = false, c = false;
    function l(d) {
      if (!o) {
        let h = Date.now() - d, m = Math.min(Math.max(t - h, 0), t);
        a = setTimeout(u, m);
      }
    }
    async function u() {
      if (o) return;
      e == null || e.debug("Polling FDv1 endpoint for feature flag updates");
      let d = Date.now();
      try {
        let h = await n5.requestPayload();
        if (o) return;
        let m;
        try {
          let b = JSON.parse(h);
          m = Ma(b);
        } catch (b) {
          e == null || e.error("FDv1 polling received malformed data"), r.put({ type: "status", state: "interrupted", errorInfo: gt("Malformed data in FDv1 polling response"), fdv1Fallback: false }), l(d);
          return;
        }
        r.put(yt(m, { fdv1Fallback: false }));
      } catch (h) {
        if (o) return;
        let m = h;
        if (m.status !== void 0 && !mt(m.status)) {
          e == null || e.error(K(h, "FDv1 polling request")), o = true, i == null || i(ct(Dt(m.status), { fdv1Fallback: false })), i = void 0;
          return;
        }
        e == null || e.warn(K(h, "FDv1 polling request", "will retry")), r.put({ type: "status", state: "interrupted", errorInfo: m.status ? Dt(m.status) : Ce(m.message), fdv1Fallback: false });
      }
      l(d);
    }
    return { next() {
      return c || (c = true, u()), Promise.race([s, r.take()]);
    }, close() {
      o = true, a !== void 0 && (clearTimeout(a), a = void 0), i == null || i(Q()), i = void 0;
    } };
  }
  var ei = 120 * 1e3;
  var ni = 300 * 1e3;
  function Aa(n5, t, e) {
    let r = rn(n5 / 1e3, e);
    return { promise: r.promise.then(() => new Promise(() => {
    }), () => t), cancel: r.cancel };
  }
  function ri(n5, t, e) {
    let r, i, s = false, a = new Promise((l) => {
      r = l;
    });
    function o() {
      !i && !s && (i = Aa(n5, t, `${t} condition`), i.promise.then((l) => {
        i = void 0, r == null || r(l);
      }));
    }
    function c() {
      i == null || i.cancel(), i = void 0;
    }
    return e || o(), { promise: a, inform(l) {
      s || e == null || e(l, { start: o, cancel: c });
    }, close() {
      s = true, c();
    } };
  }
  function Ir(n5) {
    return ri(n5, "fallback", (t, { start: e, cancel: r }) => {
      t.type === "changeSet" ? r() : t.type === "status" && t.state === "interrupted" && e();
    });
  }
  function Oa(n5) {
    return ri(n5, "recovery");
  }
  function fn(n5) {
    return { promise: n5.length === 0 ? void 0 : Promise.race(n5.map((t) => t.promise)), inform(t) {
      n5.forEach((e) => e.inform(t));
    }, close() {
      n5.forEach((t) => t.close());
    } };
  }
  function $a(n5, t, e = ei, r = ni) {
    return n5 <= 1 ? fn([]) : fn(t ? [Ir(e)] : [Ir(e), Oa(r)]);
  }
  function Na(n5) {
    let { initializerFactories: t, synchronizerSlots: e, dataCallback: r, statusManager: i, selectorGetter: s, logger: a, fallbackTimeoutMs: o = ei, recoveryTimeoutMs: c = ni } = n5, l = false, u = false, d = false, h, m, b = t.length > 0 && t.every((y) => y.isCache === true) && e.length === 0, v = Ia(t, e, s);
    function f() {
      l || (l = true, h == null || h(), h = void 0, m = void 0);
    }
    function S(y) {
      r(y.payload), i.requestStateUpdate("VALID");
    }
    function N(y) {
      y.errorInfo && i.reportError(y.errorInfo.kind, y.errorInfo.message, y.errorInfo.statusCode, y.state === "interrupted");
    }
    function P(y) {
      return v.isCurrentSynchronizerFDv1Fallback ? false : y.fdv1Fallback && v.hasFDv1Fallback() ? (v.fdv1Fallback(), true) : false;
    }
    async function j() {
      var C, F;
      let y = false;
      for (; !u; ) {
        let x = v.getNextInitializerAndSetActive();
        if (x === void 0) break;
        let I = await x.run();
        if (u) return;
        if (I.type === "changeSet" && I.payload.type !== "none") S(I), d = true;
        else if (I.type === "status") switch (I.state) {
          case "interrupted":
          case "terminal_error":
            a == null || a.warn(`Initializer failed: ${(F = (C = I.errorInfo) == null ? void 0 : C.message) != null ? F : "unknown error"}`), N(I), y = true;
            break;
          case "shutdown":
            return;
        }
        if (P(I)) break;
        if (I.type === "changeSet" && I.payload.type !== "none" && I.payload.state) {
          f();
          return;
        }
      }
      u || (b ? (!d && !y && i.requestStateUpdate("VALID"), f()) : d && f());
    }
    async function w() {
      var y, C, F, x;
      for (; !u; ) {
        let I = v.getNextAvailableSynchronizerAndSetActive();
        if (I === void 0) {
          l || (m == null || m(new Error("All data sources exhausted without receiving data.")), h = void 0, m = void 0);
          return;
        }
        let D = $a(v.getAvailableSynchronizerCount(), v.isPrimeSynchronizer(), o, c);
        D.promise && (a == null || a.debug("Fallback condition active for current synchronizer."));
        let M = true;
        try {
          for (; !u && M; ) {
            let ut = [I.next().then((A) => ({ source: "sync", value: A }))];
            D.promise !== void 0 && ut.push(D.promise.then((A) => ({ source: "condition", value: A })));
            let et = await Promise.race(ut);
            if (u) return;
            if (et.source === "condition") {
              let A = et.value;
              A === "fallback" ? a == null || a.warn("Fallback condition fired, moving to next synchronizer.") : A === "recovery" && (a == null || a.info("Recovery condition fired, resetting to primary synchronizer."), v.resetSourceIndex()), M = false;
            } else {
              let A = et.value;
              if (D.inform(A), A.type === "changeSet") S(A), l || f();
              else if (A.type === "status") switch (A.state) {
                case "interrupted":
                  a == null || a.warn(`Synchronizer interrupted: ${(C = (y = A.errorInfo) == null ? void 0 : y.message) != null ? C : "unknown error"}`), N(A);
                  break;
                case "terminal_error":
                  a == null || a.error(`Synchronizer terminal error: ${(x = (F = A.errorInfo) == null ? void 0 : F.message) != null ? x : "unknown error"}`), N(A), v.blockCurrentSynchronizer(), M = false;
                  break;
                case "shutdown":
                  return;
                case "goodbye":
                  break;
                default:
                  break;
              }
              P(A) && (M = false);
            }
          }
        } finally {
          D.close();
        }
      }
    }
    async function g() {
      if (t.length === 0 && e.length === 0) {
        i.requestStateUpdate("VALID"), f();
        return;
      }
      await j(), u || await w();
    }
    return { start() {
      return new Promise((y, C) => {
        h = y, m = C, i.requestStateUpdate("INITIALIZING"), g().then(() => {
          l || (m == null || m(new Error("Data source closed before initialization completed.")), h = void 0, m = void 0);
        }).catch((F) => {
          l ? a == null || a.error(`Orchestration error: ${F}`) : (m == null || m(F instanceof Error ? F : new Error(String(F))), h = void 0, m = void 0);
        });
      });
    }, close() {
      u = true, v.close();
    } };
  }
  var Ra = 1e3;
  function Ua(n5) {
    let { initialState: t, onReconcile: e, debounceMs: r = Ra } = n5, { networkState: i, lifecycleState: s, requestedMode: a } = t, o, c = false;
    function l() {
      return { networkState: i, lifecycleState: s, requestedMode: a };
    }
    function u() {
      c || (o !== void 0 && clearTimeout(o), o = setTimeout(() => {
        o = void 0, c || e(l());
      }, r));
    }
    return { setNetworkState(d) {
      i !== d && (i = d, u());
    }, setLifecycleState(d) {
      s !== d && (s = d, u());
    }, setRequestedMode(d) {
      a !== d && (a = d, u());
    }, close() {
      c = true, o !== void 0 && (clearTimeout(o), o = void 0);
    } };
  }
  var G = "[FDv2DataManagerBase]";
  function ii(n5) {
    var qn;
    let { platform: t, flagManager: e, config: r, baseHeaders: i, emitter: s, transitionTable: a, foregroundMode: o, backgroundMode: c, modeTable: l, sourceFactoryProvider: u, buildQueryParams: d, fdv1Endpoints: h, fallbackTimeoutMs: m, recoveryTimeoutMs: b } = n5, { logger: v } = r;
    r.serviceEndpoints.payloadFilterKey !== void 0 && (v == null || v.warn(`${G} Payload filtering is not supported with the FDv2 data system; the configured payload filter has no effect on FDv2 requests`));
    let f = Jr(s), S = la(), N = (qn = r.dataSystem) != null && qn.connectionModes ? E(E({}, l), r.dataSystem.connectionModes) : l, P, j = o, w = o, g, y, C, F, x = false, I = false, D = false, M, tt = "fresh", ut, et, A = false, z, nt, Qt = "available", St = "foreground";
    function Bn(k) {
      return N[k];
    }
    function yi() {
      return { lifecycle: St, networkAvailable: Qt === "available", foregroundMode: w, backgroundMode: c != null ? c : "offline" };
    }
    function Hn() {
      return ut !== void 0 ? ut : ma(a, yi());
    }
    function Gn() {
      return et === true ? "streaming" : et === false ? o === "streaming" ? "one-shot" : o : A ? "streaming" : o;
    }
    function Oe() {
      w = Gn(), y == null || y.setRequestedMode(w);
    }
    function gi(k, T, J) {
      var dt, st, It, te, ee;
      let R = [];
      J && k.initializers.filter((L) => !(I && L.type === "cache")).forEach((L) => {
        let W = u.createInitializerFactory(L, T);
        W ? R.push(W) : v.warn(`${G} Unsupported initializer type '${L.type}'. It will be skipped.`);
      });
      let q = [];
      if (k.synchronizers.forEach((L) => {
        let W = u.createSynchronizerSlot(L, T);
        W ? q.push(W) : v.warn(`${G} Unsupported synchronizer type '${L.type}'. It will be skipped.`);
      }), h && q.length > 0) {
        let L = k.fdv1Fallback, W = ((dt = L == null ? void 0 : L.pollInterval) != null ? dt : r.pollInterval) * 1e3, Kn = (st = L == null ? void 0 : L.endpoints) != null && st.pollingBaseUri || (It = L == null ? void 0 : L.endpoints) != null && It.streamingBaseUri ? new rt((te = L.endpoints.streamingBaseUri) != null ? te : T.serviceEndpoints.streaming, (ee = L.endpoints.pollingBaseUri) != null ? ee : T.serviceEndpoints.polling, T.serviceEndpoints.events, T.serviceEndpoints.analyticsEventPath, T.serviceEndpoints.diagnosticEventPath, T.serviceEndpoints.includeAuthorizationHeader, T.serviceEndpoints.payloadFilterKey) : T.serviceEndpoints, bi = () => Fe(T.plainContextString, Kn, h.polling(), T.requests, T.encoding, T.baseHeaders, T.queryParams, r.withReasons, r.useReport), Ei = { create: () => Pa(bi(), W, v) };
        q.push(kn(Ei, { isFDv1Fallback: true }));
      }
      return { initializerFactories: R, synchronizerSlots: q };
    }
    function vi(k) {
      var R;
      v.debug(`${G} dataCallback: type=${k.type}, updates=${k.updates.length}, state=${k.state}`), k.type !== "none" && (P = k.state);
      let T = C;
      if (!T) {
        v.warn(`${G} dataCallback called without an identified context.`);
        return;
      }
      let J = ba((R = k.updates) != null ? R : []);
      e.applyChanges(T, J, k.type).catch((q) => {
        v.warn(`${G} Failed to persist flag cache: ${q}`);
      }), tt === "cached" && !x && z && (x = true, z(), z = void 0, nt = void 0);
    }
    function $e(k, T) {
      if (!F) {
        v.warn(`${G} Cannot create data source without factory context.`);
        return;
      }
      let J = Bn(k), { initializerFactories: R, synchronizerSlots: q } = gi(J, F, T);
      if (j = k, R.length === 0 && q.length === 0) {
        v.debug(`${G} Mode '${k}' has no sources. No data source created.`), !x && z && (x = true, z(), z = void 0, nt = void 0);
        return;
      }
      g = Na({ initializerFactories: R, synchronizerSlots: q, dataCallback: vi, statusManager: f, selectorGetter: () => P, logger: v, fallbackTimeoutMs: m, recoveryTimeoutMs: b }), g.start().then(() => {
        x = true, z && (z(), z = void 0, nt = void 0);
      }).catch((st) => {
        nt && (nt(st instanceof Error ? st : new Error(String(st))), z = void 0, nt = void 0);
      });
    }
    function wi(k) {
      if (D || !F) return;
      Qt = k.networkState, St = k.lifecycleState, w = k.requestedMode;
      let T = Hn();
      if (T === j) {
        v.debug(`${G} Reconcile: mode unchanged (${T}). No action.`);
        return;
      }
      v.debug(`${G} Reconcile: mode switching from '${j}' to '${T}'.`), g == null || g.close(), g = void 0, $e(T, !P);
    }
    return { get configuredForegroundMode() {
      return o;
    }, async identify(k, T, J, R) {
      if (D) {
        v.debug(`${G} Identify called after close.`);
        return;
      }
      g == null || g.close(), g = void 0, y == null || y.close(), y = void 0, P = void 0, x = false, I = false, tt = R != null && R.waitForNetworkResults ? "fresh" : "cached", C = J, z = k, nt = T;
      let q = JSON.stringify(Y.toLDContext(J)), dt = d(R);
      r.withReasons && dt.push({ key: "withReasons", value: "true" });
      let st = S.streaming(), It = S.polling(), te = Xr(q, r.serviceEndpoints, It, t.requests, t.encoding, i, dt), ee = await $r(t.crypto, n5.credential);
      if (D) {
        v.debug(`${G} Identify aborted: closed during async setup.`);
        return;
      }
      F = { requestor: te, requests: t.requests, encoding: t.encoding, serviceEndpoints: r.serviceEndpoints, baseHeaders: i, queryParams: dt, plainContextString: q, logger: v, polling: { paths: It, intervalSeconds: r.pollInterval }, streaming: { paths: st, initialReconnectDelaySeconds: r.streamInitialReconnectDelay }, storage: t.storage, crypto: t.crypto, environmentNamespace: ee, context: J }, w = Gn();
      let L = Hn();
      if (v.debug(`${G} Identify: initial mode resolved to '${L}'.`), I = (R == null ? void 0 : R.bootstrap) !== void 0, I) {
        let { bootstrapParsed: W } = R;
        W || (W = xe(v, R.bootstrap)), e.setBootstrap(J, W), x = true, f.requestStateUpdate("VALID"), z == null || z(), z = void 0, nt = void 0, Bn(L).synchronizers.length > 0 && $e(L, false);
      } else $e(L, true);
      y = Ua({ initialState: { networkState: Qt, lifecycleState: St, requestedMode: w }, onReconcile: wi });
    }, close() {
      D = true, g == null || g.close(), g = void 0, y == null || y.close(), y = void 0, z = void 0, nt = void 0;
    }, setNetworkState(k) {
      Qt = k, y == null || y.setNetworkState(k);
    }, setLifecycleState(k) {
      k === "background" && St !== "background" && (M == null || M()), St = k, y == null || y.setLifecycleState(k);
    }, setConnectionMode(k) {
      ut = k, k !== void 0 ? y == null || y.setRequestedMode(k) : Oe();
    }, getCurrentMode() {
      return j;
    }, setFlushCallback(k) {
      M = k;
    }, setForcedStreaming(k) {
      et = k, Oe();
    }, setAutomaticStreamingState(k) {
      A = k, Oe();
    } };
  }
  function Nn() {
    return typeof document != "undefined";
  }
  function Le() {
    return typeof window != "undefined";
  }
  function Me(n5, t, e) {
    return Nn() ? (document.addEventListener(n5, t, e), () => {
      document.removeEventListener(n5, t, e);
    }) : () => {
    };
  }
  function Pe(n5, t, e) {
    return Le() ? (window.addEventListener(n5, t, e), () => {
      window.removeEventListener(n5, t, e);
    }) : () => {
    };
  }
  function it() {
    return Le() ? window.location.href : "";
  }
  function si() {
    return Le() ? window.location.search : "";
  }
  function ai() {
    return Le() ? window.location.hash : "";
  }
  function oi() {
    if (typeof crypto != "undefined") return crypto;
    throw Error("Access to a web crypto API is required");
  }
  function ci() {
    return Nn() ? document.visibilityState : "visibile";
  }
  function li(n5) {
    if (Nn()) return document.querySelectorAll(n5);
  }
  var _a = "[BrowserDataManager]";
  var zt = class extends Ie {
    constructor(e, r, i, s, a, o, c, l, u, d) {
      super(e, r, i, s, o, c, l, u, d);
      this.Hn = a;
      this.X = void 0;
      this.jt = false;
      this.X = a.streaming;
    }
    C(e, ...r) {
      this.logger.debug(`${_a} ${e}`, ...r);
    }
    async identify(e, r, i, s) {
      if (this.closed) {
        this.C("Identify called after data manager was closed.");
        return;
      }
      this.context = i;
      let a = s;
      a != null && a.hash ? this.setConnectionParams({ queryParameters: [{ key: "h", value: a.hash }] }) : this.setConnectionParams(), this.zt = a == null ? void 0 : a.hash, a != null && a.bootstrap ? this.An(i, a, e) : (await this.flagManager.loadCached(i) && this.C("Identify - Flags loaded from cache. Continuing to initialize via a poll."), await this.On(i, e, r)), this.Ce(), this.Vt();
    }
    async $n(e) {
      let r = JSON.stringify(Y.toLDContext(e)), i = Fe(r, this.config.serviceEndpoints, this.getPollingPaths(), this.platform.requests, this.platform.encoding, this.baseHeaders, [], this.config.withReasons, this.config.useReport, this.zt), s = 3, a;
      for (let o = 0; o <= s; o += 1) try {
        return await i.requestPayload();
      } catch (c) {
        if (!Pt(c)) throw c;
        a = c, o < s && (this.C(K(c, "initial poll request", "will retry")), await Ot(1e3));
      }
      throw a;
    }
    async On(e, r, i) {
      var s, a;
      try {
        this.dataSourceStatusManager.requestStateUpdate(In.Initializing);
        let o = await this.$n(e);
        try {
          let l = this.createStreamListeners(e, r).get("put");
          l.processJson(l.deserializeData(o));
        } catch (c) {
          this.dataSourceStatusManager.reportError(O.InvalidData, (s = c.message) != null ? s : "Could not parse poll response");
        }
      } catch (o) {
        this.dataSourceStatusManager.reportError(O.NetworkError, (a = o.message) != null ? a : "unexpected network error", o.status), i(o);
      }
    }
    An(e, r, i) {
      let { bootstrapParsed: s } = r;
      s || (s = xe(this.logger, r.bootstrap)), this.flagManager.setBootstrap(e, s), this.dataSourceStatusManager.requestStateUpdate(In.Valid), this.C("Identify - Initialization completed from bootstrap"), i();
    }
    setForcedStreaming(e) {
      this.X = e, this.Vt();
    }
    setAutomaticStreamingState(e) {
      this.jt = e, this.Vt();
    }
    Vt() {
      let e = this.X || this.jt && this.X === void 0;
      this.C(`Updating streaming state. forced(${this.X}) automatic(${this.jt})`), e ? this.Nn() : this.Ce();
    }
    Ce() {
      var e;
      this.updateProcessor && this.C("Stopping update processor."), (e = this.updateProcessor) == null || e.close(), this.updateProcessor = void 0;
    }
    Nn() {
      if (this.updateProcessor) {
        this.C("Update processor already active. Not changing state.");
        return;
      }
      if (!this.context) {
        this.C("Context not set, not starting update processor.");
        return;
      }
      this.C("Starting update processor."), this.Rn(this.context);
    }
    Rn(e, r, i) {
      var c;
      let s = Y.toLDContext(e);
      (c = this.updateProcessor) == null || c.close();
      let a = JSON.stringify(Y.toLDContext(e)), o = Fe(a, this.config.serviceEndpoints, this.getPollingPaths(), this.platform.requests, this.platform.encoding, this.baseHeaders, [], this.config.withReasons, this.config.useReport, this.zt);
      this.createStreamingProcessor(s, e, o, r, i), this.updateProcessor.start();
    }
  };
  function ui(n5) {
    let e = Me("visibilitychange", () => {
      ci() === "hidden" && n5();
    }), r = Pe("pagehide", n5);
    return () => {
      e(), r();
    };
  }
  function Vt(n5) {
    if (typeof n5 != "string") throw new TypeError("Expected a string");
    return n5.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
  }
  function ja(n5, t, e, r) {
    let s = ((n5.kind === "substring" || n5.kind === "regex") && r.includes("/") ? t : t.replace(r, "")).replace(e, "");
    switch (n5.kind) {
      case "exact":
        return new RegExp(`^${Vt(n5.url)}/?$`).test(t);
      case "canonical":
        return new RegExp(`^${Vt(n5.url)}/?$`).test(s);
      case "substring":
        return new RegExp(`.*${Vt(n5.substring)}.*$`).test(s);
      case "regex":
        return new RegExp(n5.pattern).test(s);
      default:
        return false;
    }
  }
  function za(n5, t) {
    let e = [];
    return t.forEach((r) => {
      let i = n5.target, { selector: s } = r, a = li(s);
      for (; i && (a != null && a.length); ) {
        for (let o = 0; o < a.length; o += 1) if (i === a[o]) {
          e.push(r);
          break;
        }
        i = i.parentNode;
      }
    }), e;
  }
  var Bt = class {
    constructor(t, e) {
      let r = t.filter((a) => {
        var o;
        return (o = a.urls) == null ? void 0 : o.some((c) => ja(c, it(), si(), ai()));
      }), i = r.filter((a) => a.kind === "pageview"), s = r.filter((a) => a.kind === "click");
      if (i.forEach((a) => e(a)), s.length) {
        let a = (o) => {
          za(o, s).forEach((c) => {
            e(c);
          });
        };
        this.Fe = Me("click", a);
      }
    }
    close() {
      var t;
      (t = this.Fe) == null || t.call(this);
    }
  };
  var Va = 300;
  var Ae = class {
    constructor(t) {
      this.Bt = it();
      let e = () => {
        let i = it();
        i !== this.Bt && (this.Bt = i, t());
      };
      this.Ht = setInterval(e, Va);
      let r = Pe("popstate", e);
      this.Te = () => {
        r();
      };
    }
    close() {
      var t;
      this.Ht && clearInterval(this.Ht), (t = this.Te) == null || t.call(this);
    }
  };
  var Ht = class {
    constructor(t, e, r, i, s, a = (o) => new Ae(o)) {
      this._ = e;
      this.jn = i;
      this._n = s;
      this.pt = [];
      this.Le = false;
      this.Z = `${r}/sdk/goals/${t}`, this.xe = a(() => {
        this.qt();
      });
    }
    async initialize() {
      await this.Un(), this.qt();
    }
    startTracking() {
      this.Le = true, this.qt();
    }
    qt() {
      var t;
      this.Le && ((t = this.Gt) == null || t.close(), this.pt && this.pt.length && (this.Gt = new Bt(this.pt, (e) => {
        this._n(it(), e);
      })));
    }
    async Un() {
      try {
        let t = await this._.fetch(this.Z);
        this.pt = await t.json();
      } catch (t) {
        this.jn(new Tt(`Encountered error fetching goals: ${t}`));
      }
    }
    close() {
      var t, e;
      (t = this.xe) == null || t.close(), (e = this.Gt) == null || e.close();
    }
  };
  function di(n5) {
    return n5.kind === "click";
  }
  var Ba = 2;
  var hi = { fetchGoals: true, eventUrlTransformer: (n5) => n5, streaming: void 0, plugins: [], storage: void 0 };
  var Ha = { fetchGoals: p.Boolean, eventUrlTransformer: p.Function, streaming: p.Boolean, plugins: p.createTypeArray("LDPlugin", {}), storage: p.Object };
  function Ga(n5) {
    var e;
    let t = E({}, n5);
    return (e = t.flushInterval) != null || (t.flushInterval = Ba), t;
  }
  function fi(n5) {
    let t = Ga(n5);
    return Object.keys(hi).forEach((e) => {
      delete t[e];
    }), t;
  }
  function Rn(n5, t) {
    let e = E({}, hi);
    return Object.entries(Ha).forEach((r) => {
      let [i, s] = r, a = n5[i];
      a !== void 0 && (s.is(a) ? e[i] = a : t.warn($.wrongOptionType(i, s.getType(), typeof a)));
    }), e;
  }
  var Gt = class {
    constructor(t, e) {
      this.zn = t;
      this.Me = [];
      switch (e) {
        case "sha1":
          this.Kt = "SHA-1";
          break;
        case "sha256":
          this.Kt = "SHA-256";
          break;
        default:
          throw new Error(`Algorithm is not supported ${e}`);
      }
    }
    async asyncDigest(t) {
      let e = this.Me.join(""), r = new TextEncoder().encode(e), i = await this.zn.subtle.digest(this.Kt, r);
      switch (t) {
        case "base64":
          return btoa(String.fromCharCode(...new Uint8Array(i)));
        case "hex":
          return [...new Uint8Array(i)].map((s) => s.toString(16).padStart(2, "0")).join("");
        default:
          throw new Error(`Encoding is not supported ${t}`);
      }
    }
    update(t) {
      return this.Me.push(t), this;
    }
  };
  var qa = { start: 0, end: 3 };
  var Ka = { start: 4, end: 5 };
  var Un = { start: 6, end: 7 };
  var _n = { start: 8, end: 8 };
  var Ja = { start: 9, end: 9 };
  var Wa = { start: 10, end: 15 };
  function Ya() {
    if (typeof crypto != "undefined" && crypto.getRandomValues) {
      let t = new Uint8Array(16);
      return crypto.getRandomValues(t), [...t.values()];
    }
    let n5 = [];
    for (let t = 0; t < 16; t += 1) n5.push(Math.floor(Math.random() * 256));
    return n5;
  }
  function kt(n5, t) {
    let e = "";
    for (let r = t.start; r <= t.end; r += 1) e += n5[r].toString(16).padStart(2, "0");
    return e;
  }
  function Xa(n5) {
    return n5[_n.start] = (n5[_n.start] | 128) & 191, n5[Un.start] = n5[Un.start] & 15 | 64, `${kt(n5, qa)}-${kt(n5, Ka)}-${kt(n5, Un)}-${kt(n5, _n)}${kt(n5, Ja)}-${kt(n5, Wa)}`;
  }
  function Za() {
    let n5 = Ya();
    return Xa(n5);
  }
  function jn() {
    return typeof crypto != "undefined" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : Za();
  }
  var qt = class {
    createHash(t) {
      return new Gt(oi(), t);
    }
    randomUUID() {
      return jn();
    }
  };
  function Qa(n5) {
    let t = Array.from(n5, (e) => String.fromCodePoint(e)).join("");
    return btoa(t);
  }
  var Kt = class {
    btoa(t) {
      return Qa(new TextEncoder().encode(t));
    }
  };
  var Jt = class {
    constructor(t) {
      this.e = t;
    }
    platformData() {
      return { name: "JS" };
    }
    sdkData() {
      let t = { name: "@launchdarkly/js-client-sdk", version: "4.11.2", userAgentBase: "JSClient" };
      return this.e.wrapperName && (t.wrapperName = this.e.wrapperName), this.e.wrapperVersion && (t.wrapperVersion = this.e.wrapperVersion), t;
    }
  };
  var Wt = class {
    constructor(t, e) {
      this.Z = t;
      this.n = {};
      var r, i;
      this.T = new le((r = e.initialRetryDelayMillis) != null ? r : 1e3, (i = e.retryResetIntervalMillis) != null ? i : 60 * 1e3), this.Pe = e.errorFilter, this.Jt = e.urlBuilder, this.Ae();
    }
    Ae() {
      this.Jt && (this.Z = this.Jt()), this.q = new EventSource(this.Z), this.q.onopen = () => {
        var t;
        this.T.success(), (t = this.onopen) == null || t.call(this);
      }, this.q.onerror = (t) => {
        var e;
        t instanceof MessageEvent || (this.Vn(t), (e = this.onerror) == null || e.call(this, t));
      }, Object.entries(this.n).forEach(([t, e]) => {
        e.forEach((r) => {
          var i;
          (i = this.q) == null || i.addEventListener(t, r);
        });
      });
    }
    addEventListener(t, e) {
      var r, i, s;
      (i = (r = this.n)[t]) != null || (r[t] = []), this.n[t].push(e), (s = this.q) == null || s.addEventListener(t, e);
    }
    close() {
      var t, e;
      clearTimeout(this.Wt), this.Wt = void 0, (t = this.q) == null || t.close(), (e = this.onclose) == null || e.call(this);
    }
    Bn(t) {
      var e;
      (e = this.onretrying) == null || e.call(this, { delayMillis: t }), this.Wt = setTimeout(() => {
        this.Ae();
      }, t);
    }
    Vn(t) {
      this.close(), !(typeof t.status == "number" && !this.Pe(t)) && this.Bn(this.T.fail());
    }
  };
  var Yt = class {
    fetch(t, e) {
      return fetch(t, e);
    }
    createEventSource(t, e) {
      return new Wt(t, e);
    }
    getEventSourceCapabilities() {
      return { customMethod: false, readTimeout: false, headers: false };
    }
  };
  function zn() {
    return typeof localStorage != "undefined";
  }
  function pi() {
    if (!zn()) return [];
    let n5 = [];
    for (let t = 0; t < localStorage.length; t += 1) {
      let e = localStorage.key(t);
      e && n5.push(e);
    }
    return n5;
  }
  var Xt = class {
    constructor(t) {
      this.t = t;
    }
    async clear(t) {
      var e;
      try {
        localStorage.removeItem(t);
      } catch (r) {
        (e = this.t) == null || e.error(`Error clearing key from localStorage: ${t}, reason: ${r}`);
      }
    }
    async get(t) {
      var e;
      try {
        let r = localStorage.getItem(t);
        return r != null ? r : null;
      } catch (r) {
        return (e = this.t) == null || e.error(`Error getting key from localStorage: ${t}, reason: ${r}`), null;
      }
    }
    async set(t, e) {
      var r;
      try {
        localStorage.setItem(t, e);
      } catch (i) {
        (r = this.t) == null || r.error(`Error setting key in localStorage: ${t}, reason: ${i}`);
      }
    }
  };
  var Zt = class {
    constructor(t, e, r) {
      this.encoding = new Kt();
      this.crypto = new qt();
      this.requests = new Yt();
      this.storage = r != null ? r : zn() ? new Xt(t) : void 0, this.info = new Jt(e);
    }
  };
  var Vn = class extends Se {
    constructor(t, e, r, i = {}, s) {
      var S, N, P, j, w;
      let { logger: a, debug: o } = i, c = a != null ? a : new pt({ destination: { debug: console.debug, info: console.info, warn: console.warn, error: console.error }, level: o ? "debug" : "info" }), l = (S = i.baseUri) != null ? S : "https://clientsdk.launchdarkly.com", u = Rn(i, c), d = u.storage ? qr(u.storage, c) : void 0, h = s != null ? s : new Zt(c, i, d), m = fi(U(E({}, i), { logger: c })), { eventUrlTransformer: b } = u, v = An(t), f = (g, y, C, F, x) => y.dataSystem ? ii({ platform: h, flagManager: g, credential: t, config: y, baseHeaders: C, emitter: F, transitionTable: Wr, foregroundMode: Lr(y.dataSystem, xn), backgroundMode: void 0, modeTable: Rt, sourceFactoryProvider: ti(), fdv1Endpoints: An(t), buildQueryParams: (I) => {
        let D = [{ key: "auth", value: t }], M = I;
        return M != null && M.hash && D.push({ key: "h", value: M.hash }), D;
      } }) : new zt(h, g, t, y, u, v.polling, v.streaming, C, F, x);
      super(t, r, h, m, f, { getLegacyStorageKeys: () => pi().filter((g) => g.startsWith(`ld:${t}:`)), analyticsEventPath: `/events/bulk/${t}`, diagnosticEventPath: `/events/diagnostic/${t}`, includeAuthorizationHeader: false, highTimeoutThreshold: 5, userAgentHeaderName: "x-launchdarkly-user-agent", dataSystemDefaults: xn, trackEventModifier: (g) => new _.InputCustomEvent(g.context, g.key, g.data, g.metricValue, g.samplingRatio, b(it())), getImplementationHooks: (g) => _.safeGetHooks(c, g, u.plugins), registerDebugOverrides: (g) => Kr(c, g, u.plugins), credentialType: "clientSideId", requiresStart: true, initialContext: e }), this.setEventSendingEnabled(true, false), u.streaming !== void 0 && ((P = (N = this.dataManager).setForcedStreaming) == null || P.call(N, u.streaming)), (w = (j = this.dataManager).setFlushCallback) == null || w.call(j, () => this.flush()), this.Oe = u.plugins, u.fetchGoals && (this.Yt = new Ht(t, h.requests, l, (g) => {
        c.error(g.message);
      }, (g, y) => {
        let C = this.getInternalContext();
        if (!C) return;
        let F = b(g);
        di(y) ? this.sendEvent({ kind: "click", url: F, samplingRatio: 1, key: y.key, creationDate: Date.now(), context: C, selector: y.selector }) : this.sendEvent({ kind: "pageview", url: F, samplingRatio: 1, key: y.key, creationDate: Date.now(), context: C });
      }), this.Yt.initialize(), u.automaticBackgroundHandling && ui(() => this.flush()));
    }
    registerPlugins(t) {
      _.safeRegisterPlugins(this.logger, this.environmentMetadata, t, this.Oe || []);
    }
    async identify(t, e) {
      return super.identify(t, e);
    }
    async identifyResult(t, e) {
      var s;
      let r = (e == null ? void 0 : e.sheddable) === void 0 ? U(E({}, e), { sheddable: true }) : E({}, e);
      r.waitForNetworkResults = true;
      let i = await super.identifyResult(t, r);
      return this.startPromise && ((s = this.Yt) == null || s.startTracking()), i;
    }
    setConnectionMode(t) {
      if (!this.dataManager.setConnectionMode) {
        this.logger.warn("setConnectionMode requires the FDv2 data system (dataSystem option). The call has no effect without it.");
        return;
      }
      if (t !== void 0 && !(t in Rt)) {
        this.logger.warn(`setConnectionMode called with invalid mode '${t}'. Valid modes: ${Object.keys(Rt).join(", ")}.`);
        return;
      }
      this.dataManager.setConnectionMode(t);
    }
    setStreaming(t) {
      var e, r;
      (r = (e = this.dataManager).setForcedStreaming) == null || r.call(e, t);
    }
    $e() {
      var e, r;
      let t = this.emitter.eventNames().some((i) => i.startsWith("change:") || i === "change");
      (r = (e = this.dataManager).setAutomaticStreamingState) == null || r.call(e, t);
    }
    on(t, e) {
      super.on(t, e), this.$e();
    }
    off(t, e) {
      super.off(t, e), this.$e();
    }
  };
  function mi(n5, t, e, r = {}, i) {
    let s = new Vn(n5, t, e, r, i), a = { variation: (o, c) => s.variation(o, c), variationDetail: (o, c) => s.variationDetail(o, c), boolVariation: (o, c) => s.boolVariation(o, c), boolVariationDetail: (o, c) => s.boolVariationDetail(o, c), numberVariation: (o, c) => s.numberVariation(o, c), numberVariationDetail: (o, c) => s.numberVariationDetail(o, c), stringVariation: (o, c) => s.stringVariation(o, c), stringVariationDetail: (o, c) => s.stringVariationDetail(o, c), jsonVariation: (o, c) => s.jsonVariation(o, c), jsonVariationDetail: (o, c) => s.jsonVariationDetail(o, c), track: (o, c, l) => s.track(o, c, l), on: (o, c) => s.on(o, c), off: (o, c) => s.off(o, c), flush: () => s.flush(), setConnectionMode: (o) => s.setConnectionMode(o), setStreaming: (o) => s.setStreaming(o), identify: (o, c) => s.identifyResult(o, c), getContext: () => s.getContext(), close: () => s.close(), allFlags: () => s.allFlags(), addHook: (o) => s.addHook(o), waitForInitialization: (o) => s.waitForInitialization(o), logger: s.logger, start: (o) => s.start(o) };
    return s.registerPlugins(a), a;
  }
  function Xc(n5) {
    return new pt(n5);
  }
  function nl(n5, t, e) {
    return mi(n5, t, bt.Disabled, e);
  }

  // src/lib/context.js
  var BROWSER_BRANDS = [
    ["Google Chrome", "Chrome"],
    ["Microsoft Edge", "Edge"],
    ["Opera", "Opera"],
    ["Brave", "Brave"],
    ["Chromium", "Chromium"],
    ["Firefox", "Firefox"]
  ];
  var COUNTRY_TTL_MS = 24 * 60 * 60 * 1e3;
  var CLOUDFLARE_TRACE_URL = "https://www.cloudflare.com/cdn-cgi/trace";
  function majorVersion(version) {
    const match = String(version ?? "").match(/\d+/);
    return match ? match[0] : "";
  }
  function normalizePlatform(platform) {
    const value = String(platform ?? "").toLowerCase();
    if (!value) return "";
    if (value.includes("android")) return "Android";
    if (value.includes("ios") || value.includes("iphone") || value.includes("ipad")) return "iOS";
    if (value.includes("mac")) return "macOS";
    if (value.includes("win")) return "Windows";
    if (value.includes("cros") || value.includes("chrome os")) return "ChromeOS";
    if (value.includes("linux")) return "Linux";
    return "";
  }
  function osFromUserAgent(userAgent) {
    if (/Android/i.test(userAgent)) return "Android";
    if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
    if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
    if (/Windows/i.test(userAgent)) return "Windows";
    if (/CrOS/i.test(userAgent)) return "ChromeOS";
    if (/Linux/i.test(userAgent)) return "Linux";
    return "";
  }
  function browserFromBrands(brands) {
    if (!Array.isArray(brands)) return "";
    for (const [needle, label] of BROWSER_BRANDS) {
      const match = brands.find((brand) => brand?.brand === needle || String(brand?.brand ?? "").includes(needle));
      if (!match) continue;
      const version = majorVersion(match.version);
      return version ? `${label} ${version}` : label;
    }
    return "";
  }
  function browserFromUserAgent(userAgent) {
    const edge = userAgent.match(/Edg\/(\d+)/);
    if (edge) return `Edge ${edge[1]}`;
    const opera = userAgent.match(/OPR\/(\d+)/);
    if (opera) return `Opera ${opera[1]}`;
    const firefox = userAgent.match(/Firefox\/(\d+)/);
    if (firefox) return `Firefox ${firefox[1]}`;
    const chrome2 = userAgent.match(/Chrome\/(\d+)/);
    if (chrome2) return `Chrome ${chrome2[1]}`;
    const safari = userAgent.match(/Version\/(\d+).+Safari/);
    if (safari) return `Safari ${safari[1]}`;
    return "";
  }
  function detectOsBrowser({ userAgent = "", userAgentData = null } = {}) {
    const brands = userAgentData?.fullVersionList || userAgentData?.brands;
    const os2 = normalizePlatform(userAgentData?.platform) || osFromUserAgent(userAgent) || "Unknown";
    const browser = browserFromBrands(brands) || browserFromUserAgent(userAgent) || "Unknown";
    return { os: os2, browser };
  }
  function parseCloudflareLoc(text) {
    if (typeof text !== "string") return null;
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("loc=")) continue;
      const code = line.slice(4).trim().toUpperCase();
      return /^[A-Z]{2}$/.test(code) ? code : null;
    }
    return null;
  }
  function countryNameFromCode(code, displayNames) {
    if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
    try {
      const names = displayNames || new Intl.DisplayNames(["en"], { type: "region" });
      const name = names.of(code.toUpperCase());
      if (!name || name.toUpperCase() === code.toUpperCase()) return null;
      return name;
    } catch {
      return null;
    }
  }
  function countryFromLocale(language, displayNames) {
    if (!language || typeof language !== "string") return null;
    try {
      const locale = new Intl.Locale(language);
      if (!locale.region) return null;
      return countryNameFromCode(locale.region, displayNames);
    } catch {
      const match = language.match(/[-_]([A-Za-z]{2})$/);
      return match ? countryNameFromCode(match[1], displayNames) : null;
    }
  }
  function readCountryCache(cache, now = Date.now()) {
    if (!cache || typeof cache.country !== "string" || !cache.country || cache.country === "Unknown") return null;
    if (typeof cache.fetchedAt !== "number") return null;
    if (now - cache.fetchedAt >= COUNTRY_TTL_MS) return null;
    return cache.country;
  }
  async function resolveCountry({ fetchImpl, locale, cache, now = Date.now(), displayNames } = {}) {
    const cached = readCountryCache(cache, now);
    if (cached) return { country: cached, cache: null, fromCache: true };
    try {
      const response = await fetchImpl(CLOUDFLARE_TRACE_URL, {
        method: "GET",
        cache: "no-store",
        signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(4e3) : void 0
      });
      if (response?.ok) {
        const code = parseCloudflareLoc(await response.text());
        const name = code ? countryNameFromCode(code, displayNames) : null;
        if (name) return { country: name, fromCache: false, cache: { country: name, fetchedAt: now } };
      }
    } catch {
    }
    const fromLocale = countryFromLocale(locale, displayNames);
    if (fromLocale) return { country: fromLocale, fromCache: false, cache: null };
    return { country: "Unknown", fromCache: false, cache: null };
  }
  var RESERVED_ATTRIBUTE_KEYS = /* @__PURE__ */ new Set(["kind", "key", "anonymous", "os", "browser", "country", "org", "domain"]);
  function attributeKeyError(key, seen = /* @__PURE__ */ new Set()) {
    const name = String(key ?? "").trim();
    if (!name) return "Attribute key is required.";
    if (name === "os" || name === "browser" || name === "country" || name === "org" || name === "domain") return `${name} is already detected.`;
    if (RESERVED_ATTRIBUTE_KEYS.has(name)) return `${name} is reserved.`;
    if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(name)) return 'Start with a letter. Then use letters, numbers, ".", "_", or "-".';
    if (seen.has(name)) return "This attribute is already used.";
    return "";
  }
  function customAttributes(attributes) {
    const applied = {};
    const seen = /* @__PURE__ */ new Set();
    for (const item of Array.isArray(attributes) ? attributes : []) {
      const key = String(item?.key ?? "").trim();
      const value = String(item?.value ?? "");
      if (!String(value).trim() || attributeKeyError(key, seen)) continue;
      seen.add(key);
      applied[key] = value;
    }
    return applied;
  }
  function buildContext({ anonymous, userKey, anonymousKey, os: os2, browser, country, org = "", domain = "", attributes = [] }) {
    return {
      kind: "user",
      key: anonymous ? anonymousKey : String(userKey ?? "").trim(),
      anonymous: Boolean(anonymous),
      os: os2,
      browser,
      country,
      org: String(org ?? "").trim(),
      domain: String(domain ?? "").trim(),
      ...customAttributes(attributes)
    };
  }
  function sameEvaluationContext(left, right) {
    if (!left || !right) return false;
    const keys = /* @__PURE__ */ new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (left[key] !== right[key]) return false;
    }
    return true;
  }
  function isEvaluationContext(value) {
    return Boolean(
      value && value.kind === "user" && typeof value.key === "string" && value.key.trim() && typeof value.anonymous === "boolean" && typeof value.os === "string" && typeof value.browser === "string" && typeof value.country === "string" && typeof value.org === "string" && typeof value.domain === "string"
    );
  }
  async function detectOsBrowserFromNavigator(nav = globalThis.navigator) {
    let userAgentData = nav?.userAgentData || null;
    if (userAgentData?.getHighEntropyValues) {
      try {
        const high = await userAgentData.getHighEntropyValues(["platform", "fullVersionList"]);
        userAgentData = {
          platform: high.platform || userAgentData.platform,
          brands: high.fullVersionList || userAgentData.brands,
          fullVersionList: high.fullVersionList
        };
      } catch {
      }
    }
    return detectOsBrowser({ userAgent: nav?.userAgent || "", userAgentData });
  }

  // src/lib/uuid.js
  function createUuid(cryptoObj = globalThis.crypto) {
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  async function ensureAnonymousKey(storage2, uuid = createUuid) {
    const current = await storage2.get(storage2.anonKey);
    if (typeof current === "string" && current.trim()) return current;
    const next = uuid();
    await storage2.set(storage2.anonKey, next);
    return next;
  }

  // src/lib/domain.js
  function normalizeDomain(input) {
    let value = String(input ?? "").trim().toLowerCase();
    if (!value) return "";
    value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
    value = value.replace(/^\/\//, "");
    value = value.split("/")[0].split("?")[0].split("#")[0];
    const at2 = value.lastIndexOf("@");
    if (at2 !== -1) value = value.slice(at2 + 1);
    if (value.startsWith("[")) {
      const end = value.indexOf("]");
      value = end === -1 ? value : value.slice(1, end);
    } else {
      value = value.replace(/:\d+$/, "");
    }
    value = value.replace(/\.$/, "");
    if (value.startsWith("www.")) {
      const rest = value.slice(4);
      if (rest && (rest.includes(".") || rest === "localhost")) value = rest;
    }
    return value;
  }
  function canonicalHost(hostname) {
    return String(hostname ?? "").trim().toLowerCase().replace(/\.$/, "");
  }
  function hostMatchesTarget(hostname, targetDomain) {
    const host = canonicalHost(hostname);
    const target = canonicalHost(targetDomain);
    if (!host || !target) return false;
    return host === target || host.endsWith(`.${target}`);
  }

  // src/lib/sanitize.js
  function sanitizeKey(input) {
    return String(input ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // src/lib/config.js
  function defaultSettings() {
    return {
      customerName: "",
      targetDomain: "",
      projectKey: "",
      environmentKey: "",
      clientSideId: "",
      projects: [],
      anonymous: true,
      userKey: "",
      observability: false,
      sessionReplay: false,
      collecting: false,
      attributes: [],
      divs: [],
      connected: false,
      notice: ""
    };
  }
  function normalizeStoredDiv(div, uuid = createUuid) {
    const name = String(div?.name ?? "");
    const selector = String(div?.selector ?? "");
    return {
      id: typeof div?.id === "string" && div.id ? div.id : uuid(),
      name,
      selector,
      defaultState: typeof div?.defaultState === "boolean" ? div.defaultState : true,
      whenFalse: div?.whenFalse === "show" || div?.whenFalse === "blockClicks" ? "show" : "hide"
    };
  }
  function normalizeStoredAttributes(attributes, uuid = createUuid) {
    if (!Array.isArray(attributes)) return [];
    return attributes.filter((item) => item && typeof item === "object").map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : uuid(),
      key: String(item.key ?? ""),
      value: String(item.value ?? "")
    }));
  }
  function normalizeStoredProjects(projects) {
    if (!Array.isArray(projects)) return [];
    return projects.map((project) => ({
      key: String(project?.key ?? ""),
      name: String(project?.name ?? project?.key ?? ""),
      environments: (Array.isArray(project?.environments) ? project.environments : []).map((env) => ({
        key: String(env?.key ?? ""),
        name: String(env?.name ?? env?.key ?? ""),
        clientSideId: String(env?.clientSideId ?? "")
      })).filter((env) => env.key)
    })).filter((project) => project.key);
  }
  function cleanSettings(partial = {}, uuid = createUuid) {
    const merged = { ...defaultSettings(), ...partial };
    return {
      customerName: String(merged.customerName ?? "").trim(),
      targetDomain: normalizeDomain(merged.targetDomain || ""),
      projectKey: String(merged.projectKey ?? ""),
      environmentKey: String(merged.environmentKey ?? ""),
      clientSideId: String(merged.clientSideId ?? ""),
      projects: normalizeStoredProjects(merged.projects),
      anonymous: Boolean(merged.anonymous),
      userKey: String(merged.userKey ?? ""),
      observability: Boolean(merged.observability),
      sessionReplay: Boolean(merged.sessionReplay),
      collecting: Boolean(merged.collecting),
      attributes: normalizeStoredAttributes(merged.attributes, uuid),
      divs: Array.isArray(merged.divs) ? merged.divs.map((div) => normalizeStoredDiv(div, uuid)) : [],
      connected: Boolean(merged.connected),
      notice: String(merged.notice ?? "")
    };
  }
  function validateUserContext({ anonymous, userKey }) {
    if (anonymous) return { ok: true, error: "" };
    if (!String(userKey ?? "").trim()) {
      return { ok: false, error: "User key is required for a defined user." };
    }
    return { ok: true, error: "" };
  }

  // src/lib/dom.js
  function createMemory() {
    return {
      hidden: /* @__PURE__ */ new Map(),
      blocked: /* @__PURE__ */ new Map(),
      touched: /* @__PURE__ */ new Set()
    };
  }
  function previousValue(element, styleName) {
    if (typeof element.style?.getPropertyValue === "function") {
      return element.style.getPropertyValue(styleName) || "";
    }
    return "";
  }
  function toggleStyle(element, store, styleName, value, enabled) {
    if (enabled) {
      if (!store.has(element)) store.set(element, previousValue(element, styleName));
      element.style.setProperty(styleName, value, "important");
      return;
    }
    if (!store.has(element)) return;
    const previous = store.get(element);
    element.style.removeProperty(styleName);
    if (previous) element.style.setProperty(styleName, previous);
    store.delete(element);
  }
  function applyFlagToElement(element, action, flagValue, memory2) {
    const hide = action === "show" ? flagValue === true : flagValue === false;
    toggleStyle(element, memory2.hidden, "display", "none", hide);
    toggleStyle(element, memory2.blocked, "pointer-events", "none", false);
    if (memory2.hidden.has(element)) memory2.touched.add(element);
    else memory2.touched.delete(element);
  }
  function applyMappings(mappings, memory2) {
    const next = /* @__PURE__ */ new Map();
    for (const mapping of mappings) {
      for (const element of mapping.elements || []) next.set(element, mapping);
    }
    for (const element of [...memory2.touched]) {
      if (!next.has(element) || element.isConnected === false) {
        applyFlagToElement(element, "hide", true, memory2);
        memory2.touched.delete(element);
        memory2.hidden.delete(element);
        memory2.blocked.delete(element);
      }
    }
    for (const [element, mapping] of next) {
      if (element.isConnected === false) continue;
      applyFlagToElement(element, mapping.action, mapping.value, memory2);
    }
  }
  function resetManagedElements(memory2) {
    for (const element of [...memory2.touched]) applyFlagToElement(element, "hide", true, memory2);
    memory2.hidden.clear();
    memory2.blocked.clear();
    memory2.touched.clear();
  }
  function findElements(doc, selector) {
    const value = String(selector ?? "").trim();
    if (!doc || !value || typeof doc.querySelectorAll !== "function") return [];
    try {
      return Array.from(doc.querySelectorAll(value));
    } catch {
      return [];
    }
  }

  // src/lib/events.js
  var TELEMETRY_HOSTS = /* @__PURE__ */ new Set([
    "events.launchdarkly.com",
    "clientsdk.launchdarkly.com",
    "clientstream.launchdarkly.com",
    "pub.observability.app.launchdarkly.com",
    "otel.observability.app.launchdarkly.com",
    "pub.observability.app.eu.launchdarkly.com",
    "otel.observability.app.eu.launchdarkly.com"
  ]);
  function isLaunchDarklyEventsUrl(value) {
    return isLaunchDarklyHost(value, /* @__PURE__ */ new Set(["events.launchdarkly.com"]));
  }
  function isLaunchDarklyTelemetryUrl(value) {
    return isLaunchDarklyHost(value, TELEMETRY_HOSTS);
  }
  function isLaunchDarklyHost(value, hosts) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && hosts.has(url.hostname) && url.username === "" && url.password === "";
    } catch {
      return false;
    }
  }

  // src/lib/flags.js
  function flagIdentity(customerName, divName) {
    const name = `${String(customerName ?? "").trim()} - ${String(divName ?? "").trim()}`;
    return { name, key: sanitizeKey(name) };
  }

  // src/lib/keys.js
  var SETTINGS_KEY = "settings";
  var ANON_KEY = "anonymousUserKey";
  var COUNTRY_CACHE_KEY = "countryCache";
  var SDK_STATUS_KEY = "sdkStatus";
  var CONTEXT_DELIVERY_KEY = "contextDelivery";

  // src/lib/messages.js
  var MSG = {
    CONNECT: "CONNECT",
    DISCONNECT: "DISCONNECT",
    REFRESH: "REFRESH",
    PREPARE_SYNC: "PREPARE_SYNC",
    LIST_OWNED_FLAGS: "LIST_OWNED_FLAGS",
    EXECUTE_SYNC: "EXECUTE_SYNC",
    SYNC_REGISTRATION: "SYNC_REGISTRATION",
    ENSURE_ANON_KEY: "ENSURE_ANON_KEY",
    IDENTIFY: "DL_IDENTIFY",
    RECONFIGURE: "DL_RECONFIGURE",
    SHUTDOWN: "DL_SHUTDOWN",
    RELAY_EVENTS: "DL_RELAY_EVENTS",
    PUBLISH_CONTEXT: "DL_PUBLISH_CONTEXT"
  };

  // src/content.js
  var memory = createMemory();
  var storage = {
    anonKey: ANON_KEY,
    async get(key) {
      const data = await chrome.storage.local.get(key);
      return data[key];
    },
    async set(key, value) {
      await chrome.storage.local.set({ [key]: value });
    }
  };
  var chain = Promise.resolve();
  var client = null;
  var activeClientId = "";
  var activeContext = null;
  var settings = cleanSettings();
  var observer = null;
  var applyQueued = false;
  var flushTimer = 0;
  var lastEvaluations = [];
  var clientReady = false;
  var needsEvaluation = true;
  var evaluationCache = /* @__PURE__ */ new Map();
  var TELEMETRY_SOURCE = "darklaunching-telemetry";
  var TELEMETRY_REQUEST = "darklaunching-telemetry-request";
  var TELEMETRY_RESPONSE = "darklaunching-telemetry-response";
  var nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url = requestUrl(input);
    if (!isLaunchDarklyTelemetryUrl(url)) return nativeFetch(input, init);
    const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "POST") return nativeFetch(input, init);
    const headers = init?.headers || (input instanceof Request ? input.headers : void 0);
    const body = init?.body !== void 0 ? init.body : input instanceof Request ? await input.clone().arrayBuffer() : void 0;
    return relayEvents(url, { method, headers, body });
  };
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== TELEMETRY_REQUEST) return;
    const request = event.data;
    const body = request.encoding === "base64" ? base64ToBytes(request.body) : request.body;
    relayEvents(request.url, { method: request.method || "POST", headers: request.headers, body }).then(async (response) => {
      window.postMessage({
        source: TELEMETRY_RESPONSE,
        id: request.id,
        ok: true,
        status: response.status,
        body: await response.text()
      }, "*");
    }).catch((error) => {
      window.postMessage({
        source: TELEMETRY_RESPONSE,
        id: request.id,
        ok: false,
        error: error?.message || "LaunchDarkly did not receive the telemetry."
      }, "*");
    });
  });
  if (typeof navigator.sendBeacon === "function") {
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      const target = String(url || "");
      if (!isLaunchDarklyTelemetryUrl(target)) return nativeBeacon(url, data);
      const contentType = data instanceof Blob && data.type ? data.type : "text/plain;charset=UTF-8";
      relayEvents(target, { method: "POST", headers: { "content-type": contentType }, body: data }).catch(() => {
      });
      return true;
    };
  }
  function requestUrl(input) {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.href;
    if (input && typeof input.url === "string") return input.url;
    return "";
  }
  function headerRecord(headers) {
    const record = {};
    if (!headers) return record;
    new Headers(headers).forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  function base64ToBytes(value) {
    const binary = atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 32768;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
    }
    return btoa(binary);
  }
  async function encodeBody(body) {
    if (body == null || body === "") return { encoding: "text", body: "" };
    if (typeof body === "string") return { encoding: "text", body };
    if (body instanceof URLSearchParams) return { encoding: "text", body: body.toString() };
    let bytes;
    if (body instanceof Blob) bytes = new Uint8Array(await body.arrayBuffer());
    else if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
    else if (ArrayBuffer.isView(body)) bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    else if (typeof body.getReader === "function") bytes = new Uint8Array(await new Response(body).arrayBuffer());
    else return { encoding: "text", body: "" };
    return { encoding: "base64", body: bytesToBase64(bytes) };
  }
  async function relayEvents(url, init = {}) {
    const encoded = await encodeBody(init.body);
    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: MSG.RELAY_EVENTS,
        url,
        method: init.method || "POST",
        headers: headerRecord(init.headers),
        encoding: encoded.encoding,
        body: encoded.body
      });
    } catch (error) {
      throw new Error(error?.message || "Could not send the user context to LaunchDarkly.");
    }
    if (!response?.ok) throw new Error(response?.error || "Could not send the user context to LaunchDarkly.");
    const status = Number(response.status);
    if (!Number.isInteger(status) || status < 200 || status > 599) {
      throw new Error("LaunchDarkly did not receive the user context.");
    }
    if (status > 204 && isLaunchDarklyEventsUrl(url)) writeSdkStatus(false, "LaunchDarkly did not receive the user context.");
    const date = response.headers?.date || response.headers?.Date;
    return new Response(response.body ?? "", { status, headers: date ? { date } : {} });
  }
  function enqueue(task) {
    const run = chain.then(task, task);
    chain = run.then(
      () => void 0,
      () => void 0
    );
    return run;
  }
  function memoryStorage() {
    const data = /* @__PURE__ */ new Map();
    return {
      async get(key) {
        return data.has(key) ? data.get(key) : null;
      },
      async set(key, value) {
        data.set(key, value);
      },
      async clear(key) {
        data.delete(key);
      }
    };
  }
  function sameContext(left, right) {
    return sameEvaluationContext(left, right);
  }
  function scheduleApply() {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(() => {
      applyQueued = false;
      try {
        applyFlags();
      } catch {
      }
    });
  }
  function invalidateEvaluations() {
    needsEvaluation = true;
  }
  function applyFlags() {
    if (!client) return;
    const evaluate = needsEvaluation && clientReady;
    if (evaluate) needsEvaluation = false;
    const mappings = [];
    const evaluations = [];
    const seen = /* @__PURE__ */ new Set();
    let counted = false;
    for (const div of settings.divs) {
      const name = String(div.name ?? "").trim();
      const selector = String(div.selector ?? "").trim();
      if (!name || !selector) continue;
      const identity = flagIdentity(settings.customerName, name);
      if (!identity.key) continue;
      seen.add(identity.key);
      const fallback = div.whenFalse === "show" ? false : true;
      let cached = evaluationCache.get(identity.key);
      if (clientReady && (evaluate || !cached || cached.default !== fallback)) {
        const detail = client.variationDetail(identity.key, fallback);
        cached = {
          value: detail?.value,
          default: fallback,
          variation: detail?.variationIndex
        };
        evaluationCache.set(identity.key, cached);
        counted = true;
      }
      const value = cached ? cached.value : fallback;
      evaluations.push({
        key: identity.key,
        value,
        default: fallback,
        variation: cached?.variation
      });
      mappings.push({
        elements: findElements(document, selector),
        action: div.whenFalse,
        value
      });
    }
    for (const key of evaluationCache.keys()) {
      if (!seen.has(key)) evaluationCache.delete(key);
    }
    lastEvaluations = evaluations;
    applyMappings(mappings, memory);
    if (counted) scheduleFlush();
  }
  function ensureObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(() => scheduleApply());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  async function writeSdkStatus(ok, message) {
    await chrome.storage.local.set({
      [SDK_STATUS_KEY]: { ok: Boolean(ok), message: message || "", at: Date.now() }
    });
  }
  function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushClient().catch(() => {
      });
    }, 250);
  }
  async function flushClient(ld = client) {
    if (!ld?.flush) return;
    try {
      const result = await ld.flush();
      if (result?.result === false) {
        await writeSdkStatus(false, "LaunchDarkly did not receive the user context.");
      }
    } catch {
      await writeSdkStatus(false, "LaunchDarkly did not receive the user context.");
    }
  }
  function publishTelemetry(active) {
    window.postMessage({
      source: TELEMETRY_SOURCE,
      active: active === true,
      clientSideId: active ? activeClientId : "",
      context: active ? activeContext : null,
      observability: settings.collecting === true && settings.observability === true,
      sessionReplay: settings.collecting === true && settings.sessionReplay === true,
      targetDomain: settings.targetDomain || location.hostname
    }, "*");
  }
  async function stopClient() {
    clearTimeout(flushTimer);
    const current = client;
    client = null;
    activeClientId = "";
    clientReady = false;
    needsEvaluation = true;
    evaluationCache.clear();
    publishTelemetry(false);
    if (!current) return;
    try {
      await current.flush();
    } catch {
    }
    try {
      await current.close();
    } catch {
    }
  }
  async function publishContext(clientSideId, context) {
    let delivery;
    try {
      const result = await chrome.runtime.sendMessage({
        type: MSG.PUBLISH_CONTEXT,
        clientSideId,
        context
      });
      delivery = result?.ok ? { ok: true, key: result.key, anonymous: Boolean(result.anonymous), at: result.at || Date.now() } : { ok: false, error: result?.error || "LaunchDarkly did not receive the user context.", at: Date.now() };
    } catch (error) {
      delivery = { ok: false, error: error?.message || "LaunchDarkly did not receive the user context.", at: Date.now() };
    }
    await chrome.storage.local.set({ [CONTEXT_DELIVERY_KEY]: delivery });
    if (!delivery.ok) await writeSdkStatus(false, delivery.error);
  }
  async function startClient(clientSideId, context) {
    try {
      await startClientNow(clientSideId, context);
    } catch (error) {
      await stopClient();
      await writeSdkStatus(false, error?.message || "LaunchDarkly client failed to start.");
    }
  }
  async function startClientNow(clientSideId, context) {
    await stopClient();
    ensureObserver();
    const ld = nl(clientSideId, context, {
      streaming: true,
      sendEvents: true,
      flushInterval: 2,
      fetchGoals: false,
      automaticBackgroundHandling: true,
      storage: memoryStorage(),
      applicationInfo: { id: "darklaunching", version: "1.0.0" },
      logger: Xc({ level: "warn" })
    });
    client = ld;
    activeClientId = clientSideId;
    activeContext = context;
    publishTelemetry(true);
    ld.on("change", () => {
      invalidateEvaluations();
      scheduleApply();
    });
    ld.on("initialized", () => {
      clientReady = true;
      invalidateEvaluations();
      writeSdkStatus(true, "");
      scheduleApply();
    });
    const result = await ld.start({ timeout: 5 });
    if (client !== ld) return;
    if (result?.status === "failed") {
      await writeSdkStatus(false, result.error?.message || "LaunchDarkly client failed to initialize.");
    } else if (result?.status !== "complete") {
      await writeSdkStatus(false, "LaunchDarkly client is still connecting. Flag changes will apply when it does.");
    } else {
      clientReady = true;
      await writeSdkStatus(true, "");
    }
    if (client === ld) publishTelemetry(true);
    try {
      applyFlags();
    } catch {
    }
    await flushClient(ld);
    await publishContext(clientSideId, context);
  }
  async function buildPageContext(currentSettings) {
    const detected = await detectOsBrowserFromNavigator(navigator);
    const cache = await storage.get(COUNTRY_CACHE_KEY);
    const country = await resolveCountry({
      fetchImpl: fetch,
      locale: navigator.language,
      cache
    });
    if (country.cache) await storage.set(COUNTRY_CACHE_KEY, country.cache);
    const anonymousKey = currentSettings.anonymous ? await ensureAnonymousKey(storage) : "";
    return buildContext({
      anonymous: currentSettings.anonymous,
      userKey: currentSettings.userKey,
      anonymousKey,
      os: detected.os,
      browser: detected.browser,
      country: country.country,
      org: currentSettings.customerName,
      domain: currentSettings.targetDomain,
      attributes: currentSettings.attributes
    });
  }
  async function shutdownNow() {
    const hadClient = Boolean(client);
    resetManagedElements(memory);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    activeContext = null;
    await stopClient();
    if (hadClient) await writeSdkStatus(true, "");
  }
  async function reconfigureNow({ force = false } = {}) {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    settings = cleanSettings(stored[SETTINGS_KEY] || {});
    if (!settings.connected || !settings.clientSideId || !hostMatchesTarget(location.hostname, settings.targetDomain)) {
      await shutdownNow();
      return;
    }
    if (!validateUserContext(settings).ok) {
      await shutdownNow();
      return;
    }
    const context = await buildPageContext(settings);
    if (!isEvaluationContext(context)) {
      await shutdownNow();
      return;
    }
    ensureObserver();
    if (!force && client && activeClientId === settings.clientSideId && sameContext(activeContext, context)) {
      scheduleApply();
      publishTelemetry(true);
      return;
    }
    if (!force && client && activeClientId === settings.clientSideId) {
      activeContext = context;
      await client.identify(context, { timeout: 5 });
      invalidateEvaluations();
      publishTelemetry(true);
      try {
        applyFlags();
      } catch {
      }
      await flushClient();
      await publishContext(settings.clientSideId, context);
      return;
    }
    await startClient(settings.clientSideId, context);
  }
  async function identifyNow(context) {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    settings = cleanSettings(stored[SETTINGS_KEY] || {});
    if (!settings.connected || !settings.clientSideId || !hostMatchesTarget(location.hostname, settings.targetDomain)) {
      await shutdownNow();
      return;
    }
    if (!isEvaluationContext(context)) {
      await shutdownNow();
      return;
    }
    if (!client || activeClientId !== settings.clientSideId) {
      await startClient(settings.clientSideId, context);
      return;
    }
    activeContext = context;
    await client.identify(context, { timeout: 5 });
    invalidateEvaluations();
    publishTelemetry(true);
    try {
      applyFlags();
    } catch {
    }
    await flushClient();
    await publishContext(settings.clientSideId, context);
  }
  function createController() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message || typeof message.type !== "string") return false;
      if (message.type === MSG.IDENTIFY) {
        enqueue(() => identifyNow(message.context)).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: error?.message || "Could not update the user context." }));
        return true;
      }
      if (message.type === MSG.RECONFIGURE) {
        enqueue(() => reconfigureNow({ force: message.force === true })).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: error?.message || "Could not reconfigure flags." }));
        return true;
      }
      if (message.type === MSG.SHUTDOWN) {
        enqueue(() => shutdownNow()).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: error?.message || "Could not stop flag evaluation." }));
        return true;
      }
      return false;
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[SETTINGS_KEY]) return;
      enqueue(() => reconfigureNow());
    });
    enqueue(() => reconfigureNow());
    return {
      reconfigure() {
        return enqueue(() => reconfigureNow());
      }
    };
  }
  if (globalThis.__darklaunching?.reconfigure) {
    globalThis.__darklaunching.reconfigure();
  } else {
    globalThis.__darklaunching = createController();
  }
})();
