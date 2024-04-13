import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser
);

router.route("/login").post(loginUser); //tested
router.route("/refresh-token").post(refreshAccessToken); //tested

// secured routes
router.route("/logout").post(verifyJwt, logoutUser); //tested
router.route("/get-user").get(verifyJwt, getCurrentUser); // tested
router.route("/change-password").post(verifyJwt, changeCurrentPassword); //tested
router.route("/update-user").patch(verifyJwt, updateAccountDetails); // test again since changed from put to patch
router
    .route("/avatar")
    .patch(verifyJwt, upload.single("avatar"), updateUserAvatar); // tested
router
    .route("/coverImage")
    .patch(verifyJwt, upload.single("coverImage"), updateUserCoverImage); //tested
router.route("/channel/:username").get(verifyJwt, getUserChannelProfile); //tested
router.route("/watch-history").get(verifyJwt, getWatchHistory); //tested

export default router;
