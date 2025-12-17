import { Router } from 'express';
import { ipc_client } from 'index';
import { RouteFile } from 'interfaces/Web';

const router = Router();

router.post('/viewable', async (req, res) => {
  if (!req.body || !Array.isArray(req.body)) {
    return res.status(400).send({
      code: 400,
      message: 'expected array of guild ids',
    });
  }

  const guilds = await ipc_client.send_all_flat<string[]>('check_guilds', req.body);

  if (guilds.isErr()) {
    return res.status(500).send({
      code: 500,
      message: 'we done goofed cuh',
    });
  }

  res.json(guilds.value.flat());
});

const route: RouteFile = {
  path: '/guilds',
  router,
};

export default route;
