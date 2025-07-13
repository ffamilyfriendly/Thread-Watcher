import { config } from 'index';

export function create_web_server() {
  Bun.serve({
    // `routes` requires Bun v1.2.3+
    routes: {
      // Static routes
      '/api/status': new Response('OK'),

      // Dynamic routes
      '/users/:id': (req) => {
        return new Response(`Hello User ${req.params.id}!`);
      },

      // Per-HTTP method handlers
      '/api/posts': {
        GET: () => new Response('List posts'),
        POST: async (req) => {
          const body = await req.json();
          return Response.json({ created: true, ...body });
        },
      },

      // Wildcard route for all routes that start with "/api/" and aren't otherwise matched
      '/api/*': Response.json({ message: 'Not found' }, { status: 404 }),

      // Redirect from /blog/hello to /blog/hello/world
      '/blog/hello': Response.redirect('/blog/hello/world'),
    },

    // (optional) fallback for unmatched routes:
    // Required if Bun's version < 1.2.3
    fetch(req) {
      return new Response('Not Found', { status: 404 });
    },

    port: config.web.port,
  });
}
