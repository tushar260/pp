const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "HashtagMedia",
  tableName: "hashtag_media",
  schema: "public",
  columns: {
    id: {
      type: "bigint",
      primary: true,
      generated: "increment",
    },
    hashtagId: {
      name: "hashtag_id",
      type: "bigint",
    },
    igMediaId: {
      name: "ig_media_id",
      type: "varchar",
    },
    caption: {
      type: "text",
      nullable: true,
    },
    mediaType: {
      name: "media_type",
      type: "varchar",
    },
    mediaUrl: {
      name: "media_url",
      type: "text",
      nullable: true,
    },
    permalink: {
      type: "text",
      nullable: true,
    },
    igTimestamp: {
      name: "ig_timestamp",
      type: "timestamptz",
      nullable: true,
    },
    source: {
      type: "varchar",
    },
    storageKey: {
      name: "storage_key",
      type: "text",
      nullable: true,
    },
    createdAt: {
      name: "created_at",
      type: "timestamptz",
      createDate: true,
    },
    updatedAt: {
      name: "updated_at",
      type: "timestamptz",
      updateDate: true,
    },
  },
  uniques: [
    {
      name: "uq_hashtag_media_ig_media_id_source",
      columns: ["igMediaId", "source"],
    },
  ],
  relations: {
    hashtag: {
      type: "many-to-one",
      target: "Hashtag",
      joinColumn: { name: "hashtag_id" },
    },
  },
});
