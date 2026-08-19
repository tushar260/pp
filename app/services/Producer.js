class Producer {
  constructor(manager) {
    this.manager = manager;
  }

  runOnce() {
    return this.manager.enqueueSyncJobs();
  }
}

module.exports = { Producer };
