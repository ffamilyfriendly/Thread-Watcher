import { Router } from 'express';
import { RouteFile } from 'interfaces/Web';

const router = Router();

router.get('/test', (req, res) => {
  res.send('YAY :D :D');
});

const route: RouteFile = {
  path: '/test',
  router,
};

export default route;
