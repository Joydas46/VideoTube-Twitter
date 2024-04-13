import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.models.js";

const createTweet = asyncHandler(async (req, res) => {
    // get the content from the body and validate it
    // save the tweet in the database
    // return the response
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({ content, owner_id: req.user?._id });

    if (!tweet) {
        throw new ApiError(500, "Tweet creation failed");
    }

    res.status(200).json(
        new ApiResponse(200, { tweet: tweet }, "Tweet created successfully")
    );
});

const getUserTweets = asyncHandler(async (req, res) => {
    // get the user Id from the params
    // validate the user id
    // write the pipeline code
    // return the response

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id");
    }

    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner_id: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner_id",
                foreignField: "_id",
                as: "tweet_owner_details",
                pipeline: [
                    {
                        $lookup: {
                            from: "tweets",
                            localField: "_id",
                            foreignField: "owner_id",
                            as: "numOfTweetsOfOwner",
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$tweet_owner_details",
        },
        {
            $addFields: {
                numOfTweetsByOwner: {
                    $size: "$tweet_owner_details.numOfTweetsOfOwner",
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
                content: 1,
                tweet_owner_details: {
                    fullname: 1,
                    avatar: 1,
                },
                numOfTweetsByOwner: 1,
                createdAt: 1,
            },
        },
    ]);

    if (!userTweets) {
        throw new ApiError(404, "No tweets found");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            { data: userTweets },
            "Tweets fetched successfully"
        )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    // get the tweet Id from the params
    // check whether the tweet exists in the db
    // check the user who wants to update the twee, it should be the owner
    // get the new content from the body and validate it
    // update the tweet in the database and validate it
    // return the response
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id");
    }

    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }
    const newContent = content;

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can edit thier tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: newContent,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedTweet) {
        throw new ApiError(500, "Tweet update failed");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { tweet: updatedTweet },
                "Tweet updated successfully"
            )
        );
});

const deleteTweet = asyncHandler(async (req, res) => {
    // get the tweet Id from the params
    // check whether the tweet exists in the db
    // check the user who wants to delete the tweet, it should be the owner
    // delete the tweet from the database and validate it
    // return the response
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet?.owner_id.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can delete thier tweet");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    return res
        .status(200)
        .json(
            new ApiResponse(200, { deletedTweet }, "Tweet deleted successfully")
        );
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
