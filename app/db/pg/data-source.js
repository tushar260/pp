const { DataSource } = require("typeorm");
require("dotenv").config({ path: require("path").join(__dirname, "../../../.env") });
const config = require("../../../config");

module.exports = new DataSource({
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
});
