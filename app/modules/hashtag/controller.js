const BLManager = require("./manager");
const logger = require("../../logger");
const { HTTP_STATUS } = require("../../common/constants");

class Controller {
  static async listHashtagMedia(request, response) {
    try {
      const result = await new BLManager().listHashtagMedia({
        limit: request.query.limit,
        cursor: request.query.cursor,
      });
      response.json(result);
    } catch (e) {
      logger.error("listHashtagMedia failed", e);
      response.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "internal_error" });
    }
  }
}

module.exports = Controller;
