import { exportSquares, sendJson } from '../tools/image-uploader/handlers.mjs';

export default async function handler(req, res) {
  try {
    await exportSquares(req, res);
  } catch (err) {
    if (!res.headersSent) sendJson(res, 500, { error: err.message });
    else res.end();
  }
}
