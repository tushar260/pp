const { DataSource } = require("typeorm");
const config = require("../../../config");

class Connection {
  getDataSource() {
    if (this.dataSource) {
      return this.dataSource;
    }

    this.dataSource = new DataSource({
      type: "postgres",
      host: config.POSTGRES_HOSTNAME,
      port: config.POSTGRES_PORT,
      username: config.POSTGRES_USERNAME,
      password: config.POSTGRES_PASSWORD,
      database: config.POSTGRES_DATABASE,
      schema: "public",
      synchronize: false,
      logging: false,
      entities: [__dirname + "/entities/*.js"],
      migrations: [__dirname + "/migrations/*.js"],
      migrationsRun: true,
    });

    return this.dataSource;
  }
}

module.exports = new Connection();
