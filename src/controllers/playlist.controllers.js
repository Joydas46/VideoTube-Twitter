import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    // get name and description from body and validate it
    // creata a playlist document in the database
    // return the response
    const { name, description } = req.body;

    if ([name, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Both name and description field is required!");
    }

    const playList = await Playlist.create({
        name,
        description,
        owner_id: req.user?._id,
    });

    if (!playList) {
        throw new ApiError(500, "Failed to create playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: playList },
                "Playlist created successfully"
            )
        );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id");
    }

    const userPlaylists = await Playlist.aggregate([
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
                as: "owner_details",
                pipeline: [
                    {
                        $lookup: {
                            from: "playlists",
                            localField: "_id",
                            foreignField: "owner_id",
                            as: "playlists",
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            playlists: 1,
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
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "video_details",
            },
        },
        {
            $addFields: {
                numOfVideosInPlaylist: {
                    $size: "$video_details",
                },
                numOfPlaylists: {
                    $size: "$owner_details.playlists",
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
                updatedAt: 0,
                videos: 0,
            },
        },
    ]);

    if (!userPlaylists) {
        throw new ApiError(404, "User does not have any playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { data: userPlaylists },
                "User playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    // validate the playistId
    // check whether the playlist exists in the database
    // write the pipeline to get the playlist
    // return the response
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    const playlistDetails = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
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
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "video_details",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            isPublished: 0,
                            updatedAt: 0,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                numOfVideos: {
                    $size: "$videos",
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
                name: 1,
                description: 1,
                createdAt: 1,
                numOfVideos: 1,
                owner_details: 1,
                video_details: 1,
            },
        },
    ]);

    if (!playlistDetails) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { playlistDetails: playlistDetails },
                "Playlist found successfully"
            )
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // validate the playlist and the video id
    // check whether both exists in the database
    // check whether its the playlist owner who is trying to add the video to playlist
    // add the video to the playlist
    // return the response
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (playlist.owner_id.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Playlist can only be updated by its owner");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            // adds an element to an array if it doesn't exist, this will ensure that all elements are unique
            $addToSet: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to add video to playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: updatedPlaylist },
                "Video added to playlist successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // validate the playlist and the video id
    // check whether both exists in the database
    // check whether its the playlist owner who is trying to remove the video from playlist
    // remove the video from the playlist
    // return the response
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (playlist.owner_id.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Playlist can only be updated by its owner");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            // pull is used to remove one element from the array
            $pull: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to remove video from playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: updatedPlaylist },
                "Video removed from playlist successfully"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    // validate the playlist exists
    // validate the user whether the user is the owner
    // delete the playlist from the database
    // return the deleted playlist in the response
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    if (playlist.owner_id.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Playlist can only be deleted by its owner");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
        throw new ApiError(500, "Failed to delete playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: deletedPlaylist },
                "Playlist deleted successfully"
            )
        );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    // validate the fields as both are required
    // validate the playlist exists
    // validate the user whether the user is the owner
    // update the changes in the playlist
    // return the updated playlist in the response
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    if ([name, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Both name and description field is required!");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner_id.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Playlist can only be updated by its owner");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to update playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: updatedPlaylist },
                "Playlist updated successfully"
            )
        );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
