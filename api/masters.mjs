import { listMasters, sendJson } from '../tools/image-uploader/handlers.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  try {
    await listMasters(res);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}
