const connection = require("../connection");

class BaseRepository {
  static async init() {
    const dataSource = connection.getDataSource();
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    BaseRepository.connection = dataSource;
  }

  static async destroy() {
    const dataSource = connection.getDataSource();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  static getRepository(name) {
    return BaseRepository.connection.getRepository(name);
  }
}

module.exports = BaseRepository;
