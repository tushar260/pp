const { LIST_DEFAULT_LIMIT, LIST_MAX_LIMIT } = require("../common/constants");

class Utils {
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static chunk(items, size) {
    const batches = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }

  static parseDate(value) {
    if (!value) {
      return null;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  static toIso(value) {
    return value ? new Date(value).toISOString() : null;
  }

  static parseListQuery({ limit, cursor }) {
    return {
      pageSize: Math.min(Math.max(Number(limit) || LIST_DEFAULT_LIMIT, 1), LIST_MAX_LIMIT),
      cursorId: cursor ? Number(cursor) : null,
    };
  }

  static parseJson(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static parseQueueMessageBody(raw) {
    return JSON.parse(raw);
  }

  static parseUsageHeaders(headers) {
    const raw = headers.get("x-app-usage") || headers.get("x-business-use-case-usage");
    if (!raw) {
      return null;
    }
    return Utils.parseJson(raw);
  }
}

module.exports = { Utils };
