import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// configuring basic middlewares of the server
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
); // configure cors
app.use(express.json({ limit: "16kb" })); // configuring middleware for data coming in JSON format
app.use(express.urlencoded({ extended: "true", limit: "16kb" })); // configuring middleware for data coming from URLs
app.use(express.static("public")); // configuring middleware to save file in public folders inside the server
app.use(cookieParser()); // configuring cookie parser

// Routes import
import healthcheckRouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import commentRouter from "./routes/comment.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

// Routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export default app;
