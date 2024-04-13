import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
    getVideoById,
    publishAVideo,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getAllVideos,
} from "../controllers/video.controllers.js";

const router = Router();

router
    .route("/")
    .get(getAllVideos)
    .post(
        verifyJwt,
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    .get(verifyJwt, getVideoById)
    .patch(verifyJwt, updateVideo)
    .delete(verifyJwt, deleteVideo);

router.route("/toggle/publish/:videoId").patch(verifyJwt, togglePublishStatus);

export default router;
