import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    // Get the video Id, validate the video Id
    // Using the video Id check if the video exists or not
    // Check if the video is already liked by the user, if yes then unlike the video
    // Create a new doc for like and save it in database
    // return the response
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video does not exist");
    }

    const isLiked = await Like.findOne({
        video_id: videoId,
        liked_by: req.user?._id,
    });

    if (isLiked) {
        const deletedLike = await Like.findByIdAndDelete(isLiked?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { deletedLike }, "Unliked video"));
    }

    const newLike = await Like.create({
        video_id: videoId,
        liked_by: req.user?._id,
    });

    if (!newLike) {
        throw new ApiError(500, "Like failed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { newLike }, "Liked video"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    // Get the comment Id, validate the comment Id
    // Using the comment Id check if the comment exists or not
    // Check if the comment is already liked by the user, if yes delete then unike the comment
    // Create a new doc for like and save it in database
    // return the response
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(400, "Comment does not exist");
    }

    const isLiked = await Like.findOne({
        comment_id: commentId,
        liked_by: req.user?._id,
    });

    if (isLiked) {
        const deletedCommentLike = await Like.findByIdAndDelete(isLiked?._id);

        return res
            .status(200)
            .json(
                new ApiResponse(200, { deletedCommentLike }, "Unliked comment")
            );
    }

    const newCommentLike = await Like.create({
        comment_id: commentId,
        liked_by: req.user?._id,
    });

    if (!newCommentLike) {
        throw new ApiError(500, "Like failed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { newCommentLike }, "Liked comment"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    // Get the tweet Id and validate it
    // Using the tweet Id check if the tweet exists or not
    // Check if the tweet is already liked by the user, if yes then unlike the tweet
    // Create a new doc for like and save it in database
    // return the response
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(400, "Tweet does not exist");
    }

    const isLiked = await Like.findOne({
        tweet_id: tweetId,
        liked_by: req.user?._id,
    });

    if (isLiked) {
        const deletedtweetLike = await Like.findByIdAndDelete(isLiked?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { deletedtweetLike }, "Unliked tweet"));
    }

    const newTweetLike = await Like.create({
        tweet_id: tweetId,
        liked_by: req.user?._id,
    });

    if (!newTweetLike) {
        throw new ApiError(500, "Like failed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { newTweetLike }, "Liked tweet"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    // get all liked videos
    // get the user details from req.user
    const likedVideos = await Like.aggregate([
        {
            $match: {
                liked_by: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video_id",
                foreignField: "_id",
                as: "liked_videos_details",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "video_owner_details",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1,
                                        coverImage: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $unwind: "$video_owner_details",
                    },
                ],
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $unwind: "$liked_videos_details",
        },
        {
            $project: {
                _id: 0,
                liked_videos_details: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { likedVideos },
                "Liked videos fetched successfully"
            )
        );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
