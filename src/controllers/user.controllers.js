import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js";
import {
    deleteFileOnCloudinary,
    uploadFileOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // save the refresh token for the user in Db,  { validateBeforeSave: false }
        user.refreshToken = refreshToken;
        user.save();

        // return the tokens to the user
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong when tried to generate Access and Refresh tokens."
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user detail from frontend
    const { username, fullname, email, password } = req.body;

    // validation of the details from frontend
    if (
        [username, fullname, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // check if user already exists
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
        throw new ApiError(
            409,
            "User with given username or email already exists"
        );
    }

    // check for image and avatar
    // Since we have a middleware to upload files, it adds some more things to the request, like .files
    const avatarLocalPath = req.files?.avatar[0]?.path;

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

    // upload them to cloudinary
    const avatar = await uploadFileOnCloudinary(avatarLocalPath);
    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(
            400,
            "Avatar file is not uploaded properly to cloudinary"
        );
    }

    // create user object
    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: {
            public_id: avatar.public_id,
            url: avatar.url,
        },
        coverImage: {
            public_id: coverImage?.public_id || "",
            url: coverImage?.url || "",
        },
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // remove password and refresh token field if user is succesfully created
    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while trying to register user"
        );
    }

    // check for response
    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // First setup the route for the login endpoint
    // take the email/username and password from the body
    // validate email and password.
    // from the database get the user with respect to the email/username and check if any user with that particular email does exist.
    // validate the password for that user and the generate a access token and refresh token
    // send tokens as cookies
    // return res

    const { email, password } = req.body;

    if ([email, password].some((field) => field.trim() === "")) {
        throw new ApiError(400, "Invalid Inputs, try again");
    }

    const user = await User.findOne({ email });

    if (!user) throw new ApiError(404, "User does not exit");

    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
        throw (401, "Invalid password given in the password field");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // configure options for the cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    // setup the cookies in the response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // For logout we need some user information
    // configure a middle ware which will verify the token, this means user logged in
    // Using the req.user data which we got from middleware, update the refresh token
    // clear cookies
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );

    // configure options for the cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // get the refresh token from the cookies in req
    // validate refresh token
    // compare the token with the refresh token in the db
    // if matches, generate a new access and refresh token
    // send res as operation successful

    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(
                401,
                "Wrong refresh token, authorization failed"
            );
        }

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);

        // configure options for the cookies
        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Refreshed access token successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // we can change the password only if user is logged in and then will verify token by our middleware
    // if validated then we will have the full user data
    // need to have oldPassword, newPasword, confirmPassword
    // validate the data
    // check if user exist for this email,if no then throw error, if yes then get user
    // change the password of the user with the new password
    // save in the database
    // return response that password has been changed
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        throw new ApiError(
            400,
            "new password and confirm password does not match, try again"
        );
    }

    if (!(oldPassword && newPassword && confirmPassword)) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = user.matchPassword(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password given is wrong, try again");
    }

    user.password = newPassword;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfuly"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: req.user },
                "User details fetched successfully"
            )
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    // Fetch data we want to update, we can only do this if we are logged in.
    // validate the data
    // get the user and update the fields
    // return the updated details back as res
    const { username, fullname, email } = req.body;

    if (!username || !fullname || !email) {
        new ApiError(400, "All fields are required");
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                username,
                fullname,
                email,
            },
        },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: updatedUser },
                "User details updated successfully"
            )
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // get the file from the req, we will have it in req.file as we have multer middleware
    // validate the path
    // if path exists, upload it on cloudinary
    // if cloudinary returns valid url, update it in the database
    // return the user as res
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    //TODO: delete old image - assignment
    const avatar = await uploadFileOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(
            400,
            "something went wrong when tried to load the avatar file on cloudinary"
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    public_id: avatar.public_id,
                    url: avatar.url,
                },
            },
        },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "User avatar image updated successfully"
            )
        );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // get the file from the req, we will have it in req.file as we have multer middleware
    // validate the path
    // if path exists, upload it on cloudinary
    // if cloudinary returns valid url, update it in the database
    // return the user as res
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(
            400,
            "something went wrong when tried to load the cover Image file on cloudinary"
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { coverImage: coverImage.url },
        },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "User cover image updated successfully"
            )
        );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // Here we will write some aggregation pipelines
    // get the username from the params (to which user we want the channel details for in this case)
    // validate the username
    // write the aggregation pipeline code and get the channel
    // validate the channel
    // return the response
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    // writing aggregation pipelines
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscibersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscibersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { channel: channel[0] },
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    // Here we will write some aggregation pipelines
    // we will directly write the pipeline here
    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user?._id) },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            // pipeline: [
                            //     {
                            //         $project: {
                            //             fullName: 1,
                            //             username: 1,
                            //             avatar: 1,
                            //         },
                            //     },
                            // ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                email: 1,
                watchHistory: 1,
            },
        },
    ]);

    if (!user?.length) {
        throw new ApiError(404, "user does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "User watch history fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
