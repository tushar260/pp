const BaseRepository = require("./BaseRepository");

class HashtagRepository extends BaseRepository {
  repo() {
    return BaseRepository.getRepository("Hashtag");
  }

  async listAll() {
    return this.repo().find();
  }

  async findById(id) {
    return this.repo().findOneBy({ id });
  }

  async updateIgHashtagId(id, igHashtagId) {
    return this.repo().update({ id }, { igHashtagId });
  }
}

module.exports = new HashtagRepository();
