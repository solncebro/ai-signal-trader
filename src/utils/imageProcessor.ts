import axios from "axios";
import pinoLogger from "../services/logger";

export class ImageProcessor {
  static async downloadImage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
      });

      const buffer = Buffer.from(response.data);

      return buffer.toString("base64");
    } catch (error) {
      pinoLogger.error("Failed to download image:", error);
      return "";
    }
  }

  static async extractTextFromImage(base64Image: string): Promise<string> {
    pinoLogger.info("OCR functionality not implemented yet");

    return "";
  }

  static isImageFile(filename: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    const extension = filename
      .toLowerCase()
      .substring(filename.lastIndexOf("."));

    return imageExtensions.includes(extension);
  }

  static getImageSize(base64Image: string): number {
    return Buffer.byteLength(base64Image, "base64");
  }

  static async compressImage(
    base64Image: string,
    maxSizeKB: number = 500
  ): Promise<string> {
    const currentSize = this.getImageSize(base64Image);
    const maxSizeBytes = maxSizeKB * 1024;

    if (currentSize <= maxSizeBytes) {
      return base64Image;
    }

    pinoLogger.info(
      `Image size (${currentSize} bytes) exceeds limit (${maxSizeBytes} bytes)`
    );

    return base64Image;
  }
}
