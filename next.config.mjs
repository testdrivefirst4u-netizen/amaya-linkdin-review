/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongodb", "exceljs"],
};

export default nextConfig;
