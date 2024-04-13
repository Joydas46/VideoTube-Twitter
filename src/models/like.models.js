import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        comment_id: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        },
        video_id: {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        tweet_id: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
        },
        liked_by: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export const Like = new mongoose.model("Like", likeSchema);
