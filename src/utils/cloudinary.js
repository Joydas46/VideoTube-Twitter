import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath)
            return "No file path given, Please give a valid path!";
        // Upload file on cloudinary
        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        // File uploaded successfully
        console.log("File has been uploaded to cloudinary", res.url);
        fs.unlinkSync(localFilePath);
        return res;
    } catch (error) {
        // This is done to remove the locally saved temporary file as upload operation to cloudinary
        // got failed. This is done so that in case if any malicious file is there it wont affect our
        // application, this is basically a safety pre-caution.
        fs.unlinkSync(localFilePath);
    }
};

const deleteFileOnCloudinary = async (publicId, resource_type = "image") => {
    try {
        if (!publicId) return null;

        const res = await cloudinary.uploader.destroy(publicId, {
            resource_type: resource_type,
        });
        return res;
    } catch (error) {
        console.log("Error while deleting file on cloudinary: ", error);
        return error;
    }
};

export { uploadFileOnCloudinary, deleteFileOnCloudinary };

// Ref Code from cloudinary
// cloudinary.uploader.upload(
//   "https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" },
//   function (error, result) {
//     console.log(result);
//   }
// );
