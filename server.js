"use strict";

const app = require("express")();
require("./config/express")(app);
const config = require("./config");
const logger = require("./app/logger");
const BaseRepository = require("./app/db/pg/repositories/BaseRepository");
const QueueService = require("./app/services/QueueService");
const QueueConsumer = require("./app/services/QueueConsumer");
const { Producer } = require("./app/services/Producer");
const BLManager = require("./app/modules/hashtag/manager");

const PORT = config.PORT || 4057;

app.use("/", require("./routes"));

function startQueueConsumers(consumers) {
  for (const consumer of consumers) {
    setInterval(() => {
      consumer.pollOnce().catch((e) => logger.error(e));
    }, config.QUEUE_POLL_MS);
  }
}

(async () => {
  try {
    process.on("SIGINT", async () => {
      logger.info("SIGINT, shutting down");
      await BaseRepository.destroy();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("SIGTERM, shutting down");
      await BaseRepository.destroy();
      process.exit(0);
    });

    await BaseRepository.init();

    app.listen(PORT);

    logger.info(`Server started at port ${PORT}`);

    const queueUrl = config.QUEUE_URL;
    const queueService = new QueueService(queueUrl);
    const manager = new BLManager({ queueService });
    const producer = new Producer(manager);
    const consumers = [
      new QueueConsumer(queueUrl, (body) => manager.processQueueMessage(body)),
    ];

    await producer.runOnce();
    setInterval(() => {
      producer.runOnce().catch((e) => logger.error(e));
    }, config.SYNC_INTERVAL_MS);

    startQueueConsumers(consumers);
  } catch (e) {
    logger.error("Exception occurred. Exiting.", e);
    process.exit(1);
  }
})();
