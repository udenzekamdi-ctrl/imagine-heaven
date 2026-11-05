import { Config } from '@remotion/cli/config';
// All media (narration, music, visuals) lives in Imagine_Heaven/assets
Config.setPublicDir('../assets');
Config.setVideoImageFormat('png');
Config.setChromiumOpenGlRenderer('angle');
Config.setPixelFormat('yuv420p');
