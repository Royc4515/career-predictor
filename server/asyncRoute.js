// Express 4 does not catch rejected promises from async handlers: the
// request just hangs until the client times out. Every async route goes
// through this wrapper so a thrown or rejected error always becomes a JSON
// 500 the client can show.
function asyncRoute(handler, { label = 'route', message = 'Something went wrong. Please try again.' } = {}) {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch((err) => {
        console.error(`[ROUTE] ${label} failed:`, err);
        if (!res.headersSent) res.status(500).json({ error: message });
      });
  };
}

module.exports = { asyncRoute };
