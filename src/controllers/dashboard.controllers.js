import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.models.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the user from the req
    // validate the user
    // write the pipeline to get the stats
    // return the stats in the response
    const channel = req.user?._id;

    if (!channel) {
        throw new ApiError(400, "Channel not found");
    }

    const channelStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channel),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subs_of_owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video_id",
                as: "likes",
            },
        },
        {
            $group: {
                _id: null,
                totalSubs: {
                    $first: {
                        $size: "$subs_of_owner",
                    },
                },
                totalLikes: {
                    $first: {
                        $size: "$likes",
                    },
                },
                totalVideos: {
                    $sum: 1,
                },
                totalViews: {
                    $sum: "$views",
                },
            },
        },
        {
            $project: {
                _id: 0,
            },
        },
    ]);

    if (!channelStats) {
        throw new ApiError(400, "Channel stats not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { stats: channelStats }, "Channel stats"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get the user from the req
    // validate the user
    // write the pipeline to get the videos
    // return the videos in the response

    const channel = req.user?._id;

    if (!channel) {
        throw new ApiError(400, "Channel not found");
    }

    const channelVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channel),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video_id",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video_id",
                as: "comments",
            },
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes",
                },
                numOfComments: {
                    $size: "$comments",
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                likes: 1,
                numOfComments: 1,
                comments: {
                    content: 1,
                },
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, { videos: channelVideos }, "Channel videos")
        );
});

export { getChannelStats, getChannelVideos };
