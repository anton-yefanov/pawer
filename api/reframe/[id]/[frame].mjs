import { reframe, sendJson } from '../../../tools/image-uploader/handlers.mjs';

export default async function handler(req, res) {
  try {
    await reframe(req, res, req.query.id, String(req.query.frame));
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}
