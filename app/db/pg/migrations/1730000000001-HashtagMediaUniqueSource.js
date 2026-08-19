/**
 * @param {import("typeorm").QueryRunner} queryRunner
 */
module.exports = class HashtagMediaUniqueSource1730000000001 {
  name = "HashtagMediaUniqueSource1730000000001";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE public.hashtag_media
      DROP CONSTRAINT IF EXISTS hashtag_media_ig_media_id_key
    `);
    await queryRunner.query(`
      ALTER TABLE public.hashtag_media
      ADD CONSTRAINT uq_hashtag_media_ig_media_id_source UNIQUE (ig_media_id, source)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE public.hashtag_media
      DROP CONSTRAINT IF EXISTS uq_hashtag_media_ig_media_id_source
    `);
    await queryRunner.query(`
      ALTER TABLE public.hashtag_media
      ADD CONSTRAINT hashtag_media_ig_media_id_key UNIQUE (ig_media_id)
    `);
  }
};
