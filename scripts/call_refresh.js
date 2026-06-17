(async () => {
  try {
    const r = await fetch("http://localhost:3001/api/reviews/refresh");
    const j = await r.json();
    console.log(JSON.stringify(j, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
