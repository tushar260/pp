const compression = require("compression");
const express = require("express");

module.exports = function (app) {
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(compression());
  app.set("etag", false);
};
