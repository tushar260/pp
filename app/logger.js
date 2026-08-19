function info(...args) {
  console.log("[info]", ...args);
}

function error(...args) {
  console.error("[error]", ...args);
}

function debug(...args) {
  console.log("[debug]", ...args);
}

function warn(...args) {
  console.log("[warn]", ...args);
}

module.exports = { info, error, debug, warn };
