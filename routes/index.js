const router = require("express").Router();
const { authentication } = require("../app/auth");
const HashtagController = require("../app/modules/hashtag/controller");

router.get("/hashtags", authentication, HashtagController.listHashtagMedia);

module.exports = router;
