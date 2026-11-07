// GET /api/requests/:id  (requesters can only open their own)
import { route } from '../../lib/http.js';
import { requireUser } from '../../lib/auth.js';
import { getFor } from '../../lib/requests.js';

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    res.json({ request: await getFor(user, req.query.id) });
  },
});
