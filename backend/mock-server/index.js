const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
  console.log(`Try: http://localhost:${PORT}/orders?page=1&limit=10`);
  console.log(`Use: Authorization: Bearer demo`);
});
