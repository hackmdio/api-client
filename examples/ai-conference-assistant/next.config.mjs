/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Pre-bundle issues with the linked file:../../nodejs package under Turbopack; webpack resolves it reliably. */
  serverExternalPackages: ["@hackmd/api", "axios"],
};

export default nextConfig;
