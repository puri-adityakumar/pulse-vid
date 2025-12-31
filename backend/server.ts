import 'dotenv/config';
import { createServer } from 'http';
import app from './src/app';
import { initSocket } from './src/config/socket';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
