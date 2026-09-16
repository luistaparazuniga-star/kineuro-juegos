import {
  PoseLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { LandmarkSmoother } from "../../shared/js/motionFilter.js";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Lower than the default (0.5) so bodies farther from the camera or in dim
// light are still picked up; jitter from the looser threshold is absorbed
// by the LandmarkSmoother below instead of showing up on screen.
const DETECTION_OPTIONS = {
  minPoseDetectionConfidence: 0.4,
  minPosePresenceConfidence: 0.4,
  minTrackingConfidence: 0.4,
};

export class PoseTracker {
  constructor() {
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.smoother = new LandmarkSmoother();
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const baseOptions = { modelAssetPath: MODEL_URL };
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        ...DETECTION_OPTIONS,
      });
    } catch (err) {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: "CPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        ...DETECTION_OPTIONS,
      });
    }
  }

  detect(video) {
    if (!this.landmarker || video.readyState < 2) return null;
    if (video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = video.currentTime;
    const now = performance.now();
    const result = this.landmarker.detectForVideo(video, now);
    if (!result.landmarks || result.landmarks.length === 0) {
      this.smoother.reset();
      return null;
    }
    return this.smoother.smooth(result.landmarks[0], now / 1000);
  }
}
