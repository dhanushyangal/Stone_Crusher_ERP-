import { apiHandler } from "@/lib/api/handler";

export const GET = apiHandler(null, async ({ user }) => ({
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    siteId: user.siteId,
    permissions: user.permissions,
  },
}));
