const config = require("../config");
const { HTTP_STATUS } = require("./common/constants");

function authentication(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!config.API_TOKEN || token !== config.API_TOKEN) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: "unauthorized" });
  }
  return next();
}

module.exports = { authentication };
