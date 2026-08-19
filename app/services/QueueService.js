const AWS = require("aws-sdk");
const { v5: uuidv5 } = require("uuid");
const config = require("../../config");

const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

class QueueService {
  constructor(queueUrl) {
    this.queueUrl = queueUrl;
    this.sqs = new AWS.SQS({
      apiVersion: "2012-11-05",
      region: config.region,
      accessKeyId: config.accessKeyId || undefined,
      secretAccessKey: config.secretAccessKey || undefined,
    });
  }

  hash(value) {
    return uuidv5(String(value), UUID_NAMESPACE);
  }

  async sendBatch(messages) {
    if (!this.queueUrl) {
      throw new Error("queueUrl is not set");
    }
    if (!messages.length) {
      return;
    }

    const chunks = [];
    for (let i = 0; i < messages.length; i += 10) {
      chunks.push(messages.slice(i, i + 10));
    }

    await Promise.all(
      chunks.map((chunk) =>
        this.sqs
          .sendMessageBatch({
            QueueUrl: this.queueUrl,
            Entries: chunk.map((msg, index) => ({
              Id: String(index),
              MessageBody: JSON.stringify(msg.body),
              MessageGroupId: this.hash(msg.groupId),
              MessageDeduplicationId: this.hash(msg.dedupId),
            })),
          })
          .promise(),
      ),
    );
  }

  async receive(maxNumberOfMessages = 1) {
    if (!this.queueUrl) {
      return [];
    }

    const { Messages } = await this.sqs
      .receiveMessage({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxNumberOfMessages,
        WaitTimeSeconds: 0,
        MessageAttributeNames: ["All"],
      })
      .promise();

    return Messages || [];
  }

  async delete(receiptHandle) {
    await this.sqs
      .deleteMessage({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      })
      .promise();
  }
}

module.exports = QueueService;
