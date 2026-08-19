const logger = require("../logger");
const QueueService = require("./QueueService");
const { Utils } = require("../utils");

class QueueConsumer {
  constructor(queueUrl, processMessage) {
    this.queueService = new QueueService(queueUrl);
    this.processMessage = processMessage;
    this.busy = false;
  }

  async pollOnce() {
    if (!this.queueService.queueUrl) {
      return;
    }
    if (this.busy) {
      return;
    }
    this.busy = true;
    try {
      const messages = await this.queueService.receive(1);
      if (!messages.length) {
        return;
      }
      const message = messages[0];
      const body = Utils.parseQueueMessageBody(message.Body);
      await this.processMessage(body);
      await this.queueService.delete(message.ReceiptHandle);
    } catch (e) {
      logger.error("consumer poll failed", e);
    } finally {
      this.busy = false;
    }
  }
}

module.exports = QueueConsumer;
