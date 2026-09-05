"use client";

import { FleetClient } from "@fleet/sdk";
import { browserTokens } from "./session";

export const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const api = new FleetClient(apiBase, browserTokens);
