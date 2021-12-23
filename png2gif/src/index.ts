import { createGif } from './gif';

console.log('finally');

(async () => {
  await createGif({
  });

  const fs = require('fs');
  const res = fs.readFileSync('myanimated.gif');

  console.log(res);
})();
