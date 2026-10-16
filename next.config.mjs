/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next dev` and `next build` both write to .next by default, so running a build while the dev
  // server is up corrupts it. Set NEXT_DIST_DIR (e.g. .next-build) to build into a separate folder.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
