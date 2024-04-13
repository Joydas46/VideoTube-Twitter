import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controllers.js";

const router = Router();

router.use(verifyJwt);

router.route("/:videoId").get(getVideoComments).post(addComment);

router.route("/comment/:commentId").delete(deleteComment).patch(updateComment);

export default router;
