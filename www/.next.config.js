module.exports = {
  webpack5: true,
  eslint: {
    // Skip ESLint during build (Docker/CI); lint runs separately via `just lint`
    ignoreDuringBuilds: true,
  },
};
