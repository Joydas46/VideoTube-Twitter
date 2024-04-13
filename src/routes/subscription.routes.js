import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
} from "../controllers/subscription.controllers.js";
const router = Router();

router.use(verifyJwt);

router
    .route("/channel/:channelId")
    .get(getUserChannelSubscribers)
    .post(toggleSubscription);

router.route("/subscriber/:subscriberId").get(getSubscribedChannels);

export default router;
