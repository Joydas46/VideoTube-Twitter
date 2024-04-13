import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controllers.js";

const router = Router();

router.use(verifyJwt);

router.route("/").post(createTweet);

router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

router.route("/user/:userId").get(getUserTweets);

export default router;
