const BaseRepository = require("./BaseRepository");

class HashtagMediaRepository extends BaseRepository {
  repo() {
    return BaseRepository.getRepository("HashtagMedia");
  }

  async listPage({ limit, cursor }) {
    const qb = this.repo().createQueryBuilder("m").orderBy("m.id", "DESC").take(limit + 1);
    if (cursor) {
      qb.andWhere("m.id < :cursor", { cursor });
    }
    return qb.getMany();
  }

  async bulkUpsert(rows) {
    if (!rows.length) {
      return;
    }
    return this.repo()
      .createQueryBuilder()
      .insert()
      .into("HashtagMedia")
      .values(rows)
      .orUpdate(
        ["caption", "media_type", "media_url", "permalink", "ig_timestamp", "hashtag_id", "updated_at"],
        ["ig_media_id", "source"],
      )
      .execute();
  }

  async findStorageKeysByIgMediaIds(igMediaIds) {
    if (!igMediaIds.length) {
      return [];
    }
    return this.repo()
      .createQueryBuilder("m")
      .select("m.ig_media_id", "igMediaId")
      .addSelect("m.storage_key", "storageKey")
      .where("m.ig_media_id IN (:...igMediaIds) AND m.storage_key IS NOT NULL", { igMediaIds })
      .getRawMany();
  }

  async attachStorageKeys(igMediaIds, key) {
    if (!igMediaIds.length) {
      return;
    }
    return this.repo()
      .createQueryBuilder()
      .update()
      .set({ storageKey: key })
      .where("ig_media_id IN (:...igMediaIds)", { igMediaIds })
      .andWhere("(storage_key IS NULL OR storage_key <> :key)", { key })
      .execute();
  }
}

module.exports = new HashtagMediaRepository();
