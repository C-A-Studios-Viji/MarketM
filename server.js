const { PeerServer } = require('peer');

const port = Number(process.env.PORT || 9000);
const path = process.env.PEER_PATH || '/marketm';
const key = process.env.PEER_KEY || 'marketm';

const server = PeerServer({
  port,
  path,
  key,
  proxied: true,
  allow_discovery: false,
  alive_timeout: 60000,
  expire_timeout: 5000,
});

server.on('connection', client => {
  console.log('MarketM peer connected:', client.getId());
});

server.on('disconnect', client => {
  console.log('MarketM peer disconnected:', client.getId());
});

console.log(`MarketM PeerServer listening on port ${port}, path ${path}`);
