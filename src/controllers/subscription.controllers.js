import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    // Get the channel Id, validate the channel Id
    // get the user from req and check whether user is subscribed or not
    // if subscribed then unsubscribe (delete) else subscribe and send response to user
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel Id");
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId,
    });

    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isSubscribed }, "Unsubscribed"));
    }

    const newSubscriber = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId,
    });

    if (!newSubscriber) {
        throw new ApiError(500, "Subscription failed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { newSubscriber }, "Subscribed"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // Get the channel Id and validate it
    // For the pipeline, the logic is as belows:
    // first match the channel id and get the subscribers of the channel
    // then join the user model and the subscription model to get the num of subscribers of the subscribed user
    // then check if channel owner is subscribed to the subscriber
    // add these fields to the pipeline and return the response
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Channel ID is invalid");
    }

    const subscriber = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberOfChannel",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribersOfSubscribed",
                        },
                    },
                    {
                        $addFields: {
                            numOfSubcribersOfSubscribed: {
                                $size: "$subscribersOfSubscribed",
                            },
                            isSubscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            new mongoose.Types.ObjectId(
                                                channelId
                                            ),
                                            "$subscribersOfSubscribed.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscriberOfChannel",
        },
        {
            $project: {
                _id: 0,
                subscriberOfChannel: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                    isSubscribedToSubscriber: 1,
                    numOfSubcribersOfSubscribed: 1,
                },
            },
        },
    ]);

    if (!subscriber) {
        throw new ApiError(400, "Channel does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscriber,
                "Channel subscriber list fetched successfully"
            )
        );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // Get the subscriber Id and validate it
    // Get the channel by joining user model and subscription model
    // From the user now again join channel to get the num os subs of the channel
    // From the user again join subsriber to get the channels subscribed to
    // From the user join video to get the num of videos of the channel
    // add these fields to the pipeline and return the response
    const { subscriberId } = req.params;

    console.log(subscriberId);
    const channel = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel_details",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribersOfChannel",
                            pipeline: [
                                {
                                    $sort: {
                                        createdAt: -1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "subscriber",
                            as: "channelsSubscribedTo",
                        },
                    },
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videosOfChannel",
                            pipeline: [
                                {
                                    $sort: {
                                        createdAt: -1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            numOfSubsOfChannel: {
                                $size: "$subscribersOfChannel",
                            },
                            numOfChannelsSubscribedTo: {
                                $size: "$channelsSubscribedTo",
                            },
                            numOfVideosOfChannel: {
                                $size: "$videosOfChannel",
                            },
                            lastVideoOfChannel: {
                                $first: "$videosOfChannel",
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullname: 1,
                            email: 1,
                            avatar: 1,
                            coverImage: 1,
                            numOfSubsOfChannel: 1,
                            numOfChannelsSubscribedTo: 1,
                            numOfVideosOfChannel: 1,
                            lastVideoOfChannel: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$channel_details",
        },
        {
            $project: {
                _id: 0,
                channel_details: 1,
            },
        },
    ]);

    return res.status(200).json(new ApiResponse(200, channel, "Success"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
