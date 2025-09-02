import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export interface VideoResult {
  path: string;
  asset: MediaLibrary.Asset;
}

export const processVideo = async (videoPath: string): Promise<VideoResult> => {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Media library permission is required to process videos");
    }

    const asset = await MediaLibrary.createAssetAsync(videoPath);

    return {
      path: videoPath,
      asset,
    };
  } catch (error) {
    console.error("Error processing video:", error);
    throw error;
  }
};

export const saveVideoToGallery = async (
  videoPath: string
): Promise<string> => {
  try {
    console.log("[saveVideoToGallery] Called with:", videoPath);

    const fileInfo = await FileSystem.getInfoAsync(videoPath);
    console.log("[saveVideoToGallery] File info:", fileInfo);
    if (!fileInfo.exists) {
      throw new Error(`Video file does not exist at path: ${videoPath}`);
    }

    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Media library permission is required to save videos");
    }

    const asset = await MediaLibrary.createAssetAsync(videoPath);
    console.log("[saveVideoToGallery] Asset created:", asset);

    const album = await MediaLibrary.getAlbumAsync("StoryXLive");
    console.log("[saveVideoToGallery] Album:", album);

    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      console.log("[saveVideoToGallery] Added asset to existing album");
    } else {
      await MediaLibrary.createAlbumAsync("StoryXLive", asset, false);
      console.log("[saveVideoToGallery] Created new album and added asset");
    }

    return asset.uri;
  } catch (error) {
    console.error("[saveVideoToGallery] Error:", error);
    throw error;
  }
};
