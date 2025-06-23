// scripts/ping-cron.ts
import fetch from "node-fetch";

async function main() {
  const res = await fetch(
    `${process.env.BASE_URL}/api/cron/refresh-calendly`,
    { headers: { "x-cron-key": process.env.CRON_SECRET! } }
  );
  console.log(await res.text());
}

main().catch(err => {
  console.error("Cron ping error:", err);
  process.exit(1);
});
