const fs = require("fs/promises");
const path = require("path");
const config = require("../../config");

class LocalStorage {
  constructor() {
    this.root = path.resolve(config.STORAGE_DIR || "storage");
  }

  async ensureRoot() {
    await fs.mkdir(this.root, { recursive: true });
  }

  async exists(key) {
    try {
      await fs.access(path.join(this.root, key));
      return true;
    } catch {
      return false;
    }
  }

  async existsMany(keys) {
    const unique = [...new Set(keys)];
    const pairs = await Promise.all(unique.map(async (key) => [key, await this.exists(key)]));
    return Object.fromEntries(pairs);
  }

  async put(key, buffer) {
    await this.ensureRoot();
    const full = path.join(this.root, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return key;
  }
}

module.exports = LocalStorage;
