import path from 'node:path';
import fs from 'node:fs';
const ROOT = process.cwd();
export const paths = {
  root: ROOT,
  sampleClip: process.env.SAMPLE_CLIP || '/Users/sreenath/Downloads/Huberman-video.mp4',
  workDir: path.join(ROOT, '.work'),
  outputDir: path.join(ROOT, 'public', 'output'),
  dubbedVideo: path.join(ROOT, 'public', 'output', 'dubbed.mp4'),
  glossaryFile: path.join(ROOT, 'data', 'glossary.json'),
  stateFile: path.join(ROOT, '.work', 'state.json'),
};
export function ensureDirs() {
  for (const d of [paths.workDir, paths.outputDir, path.dirname(paths.glossaryFile)]) {
    fs.mkdirSync(d, { recursive: true });
  }
}
