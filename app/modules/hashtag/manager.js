const logger = require("../../logger");
const { hashtagRepository, hashtagMediaRepository } = require("../../db/pg/repositories");
const MetaService = require("../../services/MetaService");
const LocalStorage = require("../../services/LocalStorage");
const { MESSAGE_TYPE, META } = require("../../common/constants");
const { Utils } = require("../../utils");
const { serializeMedia, storageKeyFor, mapMetaItemToRow, MEDIA_FIELDS } = require("./utils");

let syncLock = false;

class BLManager {
  constructor({ queueService } = {}) {
    this.metaService = new MetaService();
    this.storage = new LocalStorage();
    this.queueService = queueService;
  }

  async listHashtagMedia({ limit, cursor }) {
    const { pageSize, cursorId } = Utils.parseListQuery({ limit, cursor });
    const rows = await hashtagMediaRepository.listPage({ limit: pageSize, cursor: cursorId });
    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    return {
      data: page.map(serializeMedia),
      nextCursor: hasMore ? String(page[page.length - 1].id) : null,
    };
  }

  async enqueueSyncJobs() {
    if (!this.queueService?.queueUrl) {
      logger.warn("QUEUE_URL missing, skipping producer");
      return;
    }
    if (syncLock) {
      logger.warn("syncLock held, skipping producer tick");
      return;
    }

    syncLock = true;
    try {
      const hashtags = await hashtagRepository.listAll();
      const messages = [];
      for (const hashtag of hashtags) {
        for (const type of [MESSAGE_TYPE.TOP, MESSAGE_TYPE.RECENT]) {
          const raw = `${hashtag.id}:${type}`;
          messages.push({
            groupId: raw,
            dedupId: raw,
            body: {
              type,
              hashtagId: Number(hashtag.id),
              name: hashtag.name,
              igHashtagId: hashtag.igHashtagId || null,
            },
          });
        }
      }
      await this.queueService.sendBatch(messages);
      logger.info(`enqueued top+recent for ${hashtags.length} hashtag(s)`);
    } catch (e) {
      logger.error("producer failed", e);
    } finally {
      syncLock = false;
    }
  }

  async ensureHashtagId(hashtag) {
    if (hashtag.igHashtagId) {
      return hashtag.igHashtagId;
    }
    const id = await this.metaService.searchHashtag(hashtag.name);
    await hashtagRepository.updateIgHashtagId(hashtag.id, id);
    hashtag.igHashtagId = id;
    return id;
  }

  async syncHashtagMedia(body) {
    const hashtag = await hashtagRepository.findById(body.hashtagId);
    if (!hashtag) {
      logger.warn("hashtag not found", body.hashtagId);
      return;
    }

    const igHashtagId = await this.ensureHashtagId(hashtag);
    const edge = body.type === MESSAGE_TYPE.TOP ? META.EDGE.TOP_MEDIA : META.EDGE.RECENT_MEDIA;

    try {
      const items = await this.metaService.fetchAllMedia(igHashtagId, edge, MEDIA_FIELDS);
      await Promise.all(Utils.chunk(items, META.PAGE_LIMIT).map((batch) => this.upsertPage(hashtag, batch, body.type)));
      await this.enqueueDownloadsBatch(items);
    } catch (e) {
      if (e.rateLimited) {
        logger.warn("stopping sync due to Meta rate limit", e.message);
        return;
      }
      throw e;
    }
  }

  async upsertPage(hashtag, page, source) {
    const now = new Date();
    const rows = page.map((item) => mapMetaItemToRow(hashtag, item, source, now));
    await hashtagMediaRepository.bulkUpsert(rows);
  }

  async enqueueDownloadsBatch(items) {
    const downloadable = items.filter((item) => item.media_url).map((item) => ({
      igMediaId: String(item.id),
      mediaUrl: item.media_url,
      key: storageKeyFor(String(item.id), item.media_url),
    }));
    if (!downloadable.length) {
      return;
    }

    const igMediaIds = [...new Set(downloadable.map((d) => d.igMediaId))];
    const existingRows = await hashtagMediaRepository.findStorageKeysByIgMediaIds(igMediaIds);
    const storedByMediaId = {};
    for (const row of existingRows) {
      storedByMediaId[row.igMediaId] = row.storageKey;
    }

    const keys = [...new Set(downloadable.map((d) => d.key).concat(Object.values(storedByMediaId)))];
    const existsMap = await this.storage.existsMany(keys);

    const reuseByKey = {};
    const toSend = [];
    const seenSend = new Set();

    for (const d of downloadable) {
      if (existsMap[d.key]) {
        if (!reuseByKey[d.key]) {
          reuseByKey[d.key] = [];
        }
        reuseByKey[d.key].push(d.igMediaId);
        continue;
      }
      const existingKey = storedByMediaId[d.igMediaId];
      if (existingKey && existsMap[existingKey]) {
        if (!reuseByKey[existingKey]) {
          reuseByKey[existingKey] = [];
        }
        reuseByKey[existingKey].push(d.igMediaId);
        continue;
      }
      if (seenSend.has(d.igMediaId)) {
        continue;
      }
      seenSend.add(d.igMediaId);
      toSend.push({
        groupId: d.mediaUrl,
        dedupId: d.mediaUrl,
        body: { type: MESSAGE_TYPE.DOWNLOAD, igMediaId: d.igMediaId, mediaUrl: d.mediaUrl },
      });
    }

    await Promise.all(
      Object.entries(reuseByKey).map(([key, ids]) =>
        hashtagMediaRepository.attachStorageKeys([...new Set(ids)], key),
      ),
    );

    if (toSend.length) {
      await this.queueService.sendBatch(toSend);
    }
  }

  async downloadMedia(body) {
    if (!body.mediaUrl || !body.igMediaId) {
      return;
    }

    const key = storageKeyFor(body.igMediaId, body.mediaUrl);
    if (!(await this.storage.exists(key))) {
      const buffer = await this.metaService.fetchBinary(body.mediaUrl);
      await this.storage.put(key, buffer);
    }

    await hashtagMediaRepository.attachStorageKeys([body.igMediaId], key);
  }

  async processQueueMessage(body) {
    switch (body.type) {
      case MESSAGE_TYPE.TOP:
      case MESSAGE_TYPE.RECENT:
        await this.syncHashtagMedia(body);
        break;
      case MESSAGE_TYPE.DOWNLOAD:
        await this.downloadMedia(body);
        break;
      default:
        logger.warn("unknown message type", body.type);
    }
  }
}

module.exports = BLManager;
