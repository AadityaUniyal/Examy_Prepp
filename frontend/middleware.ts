import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/planner/:path*",
    "/quiz/:path*",
    "/pre-exam/:path*",
    "/analytics/:path*",
    "/feedback/:path*",
  ],
}
