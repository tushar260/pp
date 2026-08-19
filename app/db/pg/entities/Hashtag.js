const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Hashtag",
  tableName: "hashtags",
  schema: "public",
  columns: {
    id: {
      type: "bigint",
      primary: true,
      generated: "increment",
    },
    name: {
      type: "varchar",
      unique: true,
    },
    igHashtagId: {
      name: "ig_hashtag_id",
      type: "varchar",
      unique: true,
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
});
