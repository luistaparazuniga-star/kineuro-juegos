import {
  PoseLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export class PoseTracker {
  constructor() {
    this.landmarker = null;
    this.lastVideoTime = -1;
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const baseOptions = { modelAssetPath: MODEL_URL };
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    } catch (err) {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: "CPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    }
  }

  detect(video) {
    if (!this.landmarker || video.readyState < 2) return null;
    if (video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = video.currentTime;
    const result = this.landmarker.detectForVideo(video, performance.now());
    if (!result.landmarks || result.landmarks.length === 0) return null;
    return result.landmarks[0];
  }
}
