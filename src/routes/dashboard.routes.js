import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import {
    getChannelStats,
    getChannelVideos,
} from "../controllers/dashboard.controllers.js";

const router = Router();

router.use(verifyJwt);

router.route("/stats").get(getChannelStats);

router.route("/videos").get(getChannelVideos);

export default router;
