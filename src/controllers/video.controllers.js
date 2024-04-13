import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import User from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    deleteFileOnCloudinary,
    uploadFileOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    // declare an array of for the pipelines
    // check if query is present, if yes then push the query in the pipeline
    // then check for userId is valid
    // push the match pipeline stage with the user Id and the is published flag
    // then push a pipeline stage for sorting parameters
    // then push pipeline stage for the data you want to fetch from Db.
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pipeline = [];

    // Here we can use this search based index in mongo db or we can also go for $match
    if (query) {
        // search based
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"],
                },
            },
        });

        // // using $match
        // pipeline.push({
        //     $match: {
        //         $or: [
        //             {
        //                 title: {
        //                     $regex: query,
        //                     $options: "i",
        //                 },
        //             },
        //             {
        //                 description: {
        //                     $regex: query,
        //                     $options: "i",
        //                 },
        //             },
        //         ],
        //     },
        // });
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id");
    } else {
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                isPublished: true,
            },
        });
    }

    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1,
            },
        });
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1,
            },
        });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner_details",
            },
        },
        {
            $unwind: "$owner_details",
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
            $project: {
                _id: 0,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                likes: 1,
                numOfComments: 1,
                comments: 1,
                owner_details: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                },
                createdAt: 1,
            },
        }
    );

    const videos = await Video.aggregate(pipeline)
        .limit(limit)
        .skip((page - 1) * limit);

    // This piece of code is okay, but it fails some boundary cases
    // const videos = await Video.aggregate([
    // {
    //     $search: {
    //         index: "search-videos",
    //         text: {
    //             query: query,
    //             path: ["title", "description"],
    //         },
    //     },
    // },
    // {
    //     $match: {
    //         owner: new mongoose.Types.ObjectId(userId),
    //         isPublished: true,
    //     },
    // },
    // {
    //     $lookup: {
    //         from: "users",
    //         localField: "owner",
    //         foreignField: "_id",
    //         as: "owner_details",
    //     },
    // },
    // {
    //     $unwind: "$owner_details",
    // },
    // {
    //     $lookup: {
    //         from: "likes",
    //         localField: "_id",
    //         foreignField: "video_id",
    //         as: "likes",
    //     },
    // },
    // {
    //     $lookup: {
    //         from: "comments",
    //         localField: "_id",
    //         foreignField: "video_id",
    //         as: "comments",
    //     },
    // },
    // {
    //     $addFields: {
    //         likes: {
    //             $size: "$likes",
    //         },
    //         numOfComments: {
    //             $size: "$comments",
    //         },
    //     },
    // },
    // {
    //     $sort: {
    //         [sortBy]: sortType === "asc" ? 1 : -1,
    //     },
    // },
    // {
    //     $project: {
    //         _id: 0,
    //         videoFile: 1,
    //         thumbnail: 1,
    //         title: 1,
    //         description: 1,
    //         duration: 1,
    //         views: 1,
    //         likes: 1,
    //         numOfComments: 1,
    //         comments: 1,
    //         owner_details: {
    //             username: 1,
    //             fullname: 1,
    //             avatar: 1,
    //         },
    //         createdAt: 1,
    //     },
    // },
    // ])
    //     .limit(limit)
    //     .skip((page - 1) * limit);

    if (!videos) {
        throw new ApiError(404, "No videos found");
    }

    res.status(200).json(
        new ApiResponse(200, { videos: videos }, "Videos fetched successfully")
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    // get title and description from body
    // validate the fields as both are required
    // get the video file and thumbnail path from the req.filesand validate
    // both exists upload it to cloudinary,get back the response
    // validate the response
    // create a video collection from the data, save it in video variable
    // return response with video uploaded successfully
    const { title, description } = req.body;

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Both title and description fieldis required!");
    }

    let videoFileLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.videoFile) &&
        req.files.videoFile.length > 0
    ) {
        videoFileLocalPath = req.files.videoFile[0].path;
    }

    let thumbnailLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.thumbnail) &&
        req.files.thumbnail.length > 0
    ) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if (!(videoFileLocalPath && thumbnailLocalPath)) {
        throw new ApiError(400, "Both video file and thumbnail is required");
    }

    const videoResponse = await uploadFileOnCloudinary(videoFileLocalPath);
    const thumbnailResponse = await uploadFileOnCloudinary(thumbnailLocalPath);

    if (!(videoResponse && thumbnailResponse)) {
        throw new ApiError(
            500,
            "Something went wrong when trying to upload video on cloudinary"
        );
    }

    const video = await Video.create({
        videoFile: {
            url: videoResponse.url,
            public_id: videoResponse.public_id,
        },
        thumbnail: {
            url: thumbnailResponse.url,
            public_id: thumbnailResponse.public_id,
        },
        owner: req.user?._id,
        title,
        description,
        duration: videoResponse.duration,
        isPublished: false,
    });

    const publishedVideo = await Video.findById(video?._id);

    if (!publishedVideo) {
        throw new ApiError(500, "video publishing unsuccessful");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { video: publishedVideo },
                "Video published successfully"
            )
        );
});

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    // id is in form of a string convert it and then use
    // validate the id
    // do a database call to video collection using findbyId
    // increment the views, add it in the user watchHistory
    // return the response with the fields needed to return
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid or wrong video Id");
    }

    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid user Id");
    }

    // Need to write a pipeline here once other models are ready.
    // Need to get the video and all the details regarding it. For that need to join more
    // than once collection
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                views: 1,
            },
        },
        {
            new: true,
        }
    );

    if (!video) {
        throw new ApiError(400, "video does not exist");
    }

    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: { watchHistory: videoId },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, { video: video }, "video fetched successfully")
        );
});

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    // Get the data from the body, validate it
    // do a database call to find and update the video.
    // We can update the video only if we are the owner of the video
    // thumbnail tao implement korte hobe
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!(title || description)) {
        throw new ApiError(400, "At least one field should be provided");
    }

    const video = await Video.findById(videoId);

    if (video.owner.toString() === req.user?._id.toString()) {
        video.title = title;
        video.description = description;
        video.views = 0;
        video.save();
        // const updatedVideo = await Video.findByIdAndUpdate(
        // videoId,
        // {
        //     $set: {
        //         title,
        //         description,
        //         thumbnail: {
        //             public_id: thumbnail.public_id,
        //             url: thumbnail.url
        //         }
        //     }
        // },
        // { new: true }
        // );
    } else {
        throw new ApiError(400, "You are not allowed to update the video");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { video: video }, "Video updated successfully")
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    // TODO: delete video
    // Get the video Id, validate the video Id
    // get the video from the database, if video not there trow error
    // Get the user Id from req.user, this is because we will delete the video who is the owner
    // if the user is the owner, delete the video on cloudinary and then delete the video in database
    // return res with response that video deleted successfully
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "video does not exist");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You are not allowed to delete the video");
    }

    const { result: resultVideo } = await deleteFileOnCloudinary(
        video.videoFile.public_id,
        "video"
    );

    const { result: resultThumbnail } = await deleteFileOnCloudinary(
        video.thumbnail.public_id
    );

    if (resultVideo !== "ok" || resultThumbnail !== "ok") {
        throw new ApiError(
            400,
            "video or thumbnail was not deleted properly on cloudinary"
        );
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    res.status(200).json(
        new ApiResponse(
            200,
            { video: deletedVideo },
            "video deleted Successfully"
        )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    // TODO: toggle publish status
    // Get the video Id, validate the video Id
    // get the video from the database, if video not there trow error
    // Get the user Id from req.user, and the owner of the video willbe able to publish
    // if the user is the owner, toggle the publish status
    // return res with response that video is published successsfully
    const { videoId } = req.params;

    if (!isValidObjectId) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "video does not exist");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You are not allowed to publish the video");
    }

    const isPublishedState = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished,
            },
        },
        {
            new: true,
        }
    ).select("isPublished");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                isPublishedState,
                "video published successfully"
            )
        );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
