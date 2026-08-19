const config = require("../../config");
const logger = require("../logger");
const { HTTP_STATUS, META } = require("../common/constants");
const { Utils } = require("../utils");

function isThrottleStatus(status, errorCode) {
  return (
    status === HTTP_STATUS.TOO_MANY_REQUESTS ||
    errorCode === META.ERROR_CODE.APPLICATION_REQUEST_LIMIT ||
    errorCode === META.ERROR_CODE.USER_REQUEST_LIMIT ||
    errorCode === META.ERROR_CODE.PAGE_REQUEST_LIMIT
  );
}

class MetaService {
  constructor() {
    this.baseUrl = config.META_GRAPH_BASE_URL;
    this.token = config.IG_PAGE_TOKEN;
    this.userId = config.IG_USER_ID;
  }

  usageTooHigh(headers) {
    const parsed = Utils.parseUsageHeaders(headers);
    if (!parsed) {
      return false;
    }
    const buckets = Array.isArray(parsed) ? parsed : Object.values(parsed).flat();
    const metrics = Array.isArray(parsed.call_count) ? [parsed] : buckets.length ? buckets : [parsed];
    return metrics.some((m) => {
      const call = Number(m.call_count || 0);
      const cpu = Number(m.total_cputime || 0);
      const time = Number(m.total_time || 0);
      return call >= META.USAGE_PAUSE_PCT || cpu >= META.USAGE_PAUSE_PCT || time >= META.USAGE_PAUSE_PCT;
    });
  }

  async request(url) {
    let attempt = 0;
    while (attempt < META.MAX_ATTEMPTS) {
      attempt += 1;
      const res = await fetch(url);
      let json = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      const errorCode = json?.error?.code;
      const throttled = isThrottleStatus(res.status, errorCode);
      const usageHigh = this.usageTooHigh(res.headers);

      if (throttled || (usageHigh && (!res.ok || json.error))) {
        const delay = META.BASE_RETRY_MS * 2 ** (attempt - 1);
        logger.warn(`Meta rate limit, retry ${attempt}/${META.MAX_ATTEMPTS} in ${delay}ms`);
        if (attempt >= META.MAX_ATTEMPTS) {
          const err = new Error(`Meta rate limited after ${META.MAX_ATTEMPTS} attempts`);
          err.rateLimited = true;
          throw err;
        }
        await Utils.sleep(delay);
        continue;
      }

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || `Meta HTTP ${res.status}`);
      }

      if (usageHigh) {
        const delay = META.BASE_RETRY_MS * 2 ** (attempt - 1);
        logger.warn(`Meta usage high, backing off ${delay}ms before continuing`);
        await Utils.sleep(delay);
      }

      return json;
    }
  }

  async searchHashtag(name) {
    const url =
      `${this.baseUrl}/ig_hashtag_search?user_id=${encodeURIComponent(this.userId)}` +
      `&q=${encodeURIComponent(name)}&access_token=${encodeURIComponent(this.token)}`;
    const json = await this.request(url);
    const id = json?.data?.[0]?.id || json?.id;
    if (!id) {
      throw new Error(`No hashtag id for ${name}`);
    }
    return id;
  }

  async fetchMediaPage(igHashtagId, edge, fields, after) {
    const fieldList = Array.isArray(fields) ? fields.join(",") : fields;
    let url =
      `${this.baseUrl}/${igHashtagId}/${edge}?user_id=${encodeURIComponent(this.userId)}` +
      `&fields=${fieldList}&limit=${META.PAGE_LIMIT}&access_token=${encodeURIComponent(this.token)}`;
    if (after) {
      url += `&after=${encodeURIComponent(after)}`;
    }
    return this.request(url);
  }

  async fetchAllMedia(igHashtagId, edge, fields) {
    const items = [];
    let after;
    while (items.length < META.MAX_ITEMS) {
      const page = await this.fetchMediaPage(igHashtagId, edge, fields, after);
      const rows = page.data || [];
      if (!rows.length) {
        break;
      }
      items.push(...rows);
      after = page.paging?.cursors?.after;
      if (!page.paging?.next || !after || items.length >= META.MAX_ITEMS) {
        break;
      }
      await Utils.sleep(META.PAGE_DELAY_MS);
    }
    return items.slice(0, META.MAX_ITEMS);
  }

  async fetchBinary(url) {
    let attempt = 0;
    while (attempt < META.MAX_ATTEMPTS) {
      attempt += 1;
      const res = await fetch(url);
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
      const retryable = res.status === HTTP_STATUS.TOO_MANY_REQUESTS || res.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR;
      if (!retryable || attempt >= META.MAX_ATTEMPTS) {
        throw new Error(`download HTTP ${res.status}`);
      }
      const delay = META.BASE_RETRY_MS * 2 ** (attempt - 1);
      logger.warn(`download rate/server error ${res.status}, retry ${attempt}/${META.MAX_ATTEMPTS} in ${delay}ms`);
      await Utils.sleep(delay);
    }
  }
}

module.exports = MetaService;
