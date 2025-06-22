// lib/oblio.ts
import OblioApi from "@obliosoftware/oblioapi";

const oblio = new OblioApi(
  process.env.OBLIO_CLIENT_ID!,
  process.env.OBLIO_CLIENT_SECRET!
);

export default oblio;
