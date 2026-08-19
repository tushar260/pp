const path = require("path");
const { Utils } = require("../../utils");

const MEDIA_FIELDS = ["id", "caption", "media_type", "media_url", "permalink", "timestamp"];

function serializeMedia(row) {
  return {
    id: Number(row.id),
    hashtagId: Number(row.hashtagId),
    igMediaId: row.igMediaId,
    caption: row.caption,
    mediaType: row.mediaType,
    mediaUrl: row.mediaUrl,
    permalink: row.permalink,
    igTimestamp: Utils.toIso(row.igTimestamp),
    source: row.source,
    storageKey: row.storageKey,
    createdAt: Utils.toIso(row.createdAt),
    updatedAt: Utils.toIso(row.updatedAt),
  };
}

function storageKeyFor(igMediaId, mediaUrl) {
  let ext = ".bin";
  try {
    ext = path.extname(new URL(mediaUrl).pathname) || ".bin";
  } catch {
    ext = ".bin";
  }
  return `media/${igMediaId}${ext.split("?")[0] || ".bin"}`;
}

function mapMetaItemToRow(hashtag, item, source, updatedAt) {
  return {
    hashtagId: hashtag.id,
    igMediaId: String(item.id),
    caption: item.caption || null,
    mediaType: item.media_type || "UNKNOWN",
    mediaUrl: item.media_url || null,
    permalink: item.permalink || null,
    igTimestamp: Utils.parseDate(item.timestamp),
    source,
    updatedAt,
  };
}

module.exports = {
  MEDIA_FIELDS,
  serializeMedia,
  storageKeyFor,
  mapMetaItemToRow,
};
