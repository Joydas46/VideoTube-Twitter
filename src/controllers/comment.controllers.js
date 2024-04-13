import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: apply pagination
    const { videoId } = req.params;
    const { page = 1, commentLimit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    var videoComments = await Comment.aggregate([
        {
            $match: {
                video_id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video_id",
                foreignField: "_id",
                as: "video_details",
            },
        },
        {
            $unwind: "$video_details",
        },
        {
            $lookup: {
                from: "users",
                localField: "owner_id",
                foreignField: "_id",
                as: "owner_details",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
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
            $unwind: "$owner_details",
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment_id",
                as: "comment_likes",
            },
        },
        {
            $addFields: {
                comment_likes: {
                    $size: "$comment_likes",
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ])
        .limit(commentLimit)
        .skip((page - 1) * commentLimit);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { comments: videoComments, page: page, limit: commentLimit },
                "Comments fetched successfully"
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    // Get the video Id from the params and validate it
    // Get the "content" data from the body
    // Check whether any video exists for the video Id
    // Create a new comment
    // return the response
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const newComment = await Comment.create({
        content,
        video_id: videoId,
        owner_id: req.user?._id,
    });

    if (!newComment) {
        throw new ApiError(500, "Comment creation failed");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { comment: newComment },
                "Comment created successfully"
            )
        );
});

const updateComment = asyncHandler(async (req, res) => {
    // get the comment Id and validate it
    // get the new content and validate it, since its required
    // check whether the comment is updated by its owner
    // send response
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id");
    }
    const { content } = req.body;
    const newContent = content;

    if (!newContent) {
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment?.owner_id.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "comment can be updated only by comment owner");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content: newContent,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedComment) {
        throw new ApiError(500, "Comment update failed");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { updatedComment },
                "Comment updated successfully"
            )
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    // Get the comment Id from params
    // check if Id is valid, comment is there in database
    // check if comment owner is tying to delete the comment
    // delete comment
    // return response
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment?.owner_id.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "Comment can be deleted only by comment owner");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new ApiError(500, "Comment deletion failed");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { deletedComment },
                "Comment deleted successfully"
            )
        );
});

export { getVideoComments, addComment, updateComment, deleteComment };
