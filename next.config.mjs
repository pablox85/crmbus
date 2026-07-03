const demoEnabled = process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";
const noDemoRepository = "@/lib/repositories/NoDemoRepository";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: demoEnabled
      ? {}
      : {
          "@/src/demo/repository": noDemoRepository
        }
  },
  webpack(config) {
    if (!demoEnabled) {
      config.resolve.alias["@/src/demo/repository"] = noDemoRepository;
    }
    return config;
  }
};

export default nextConfig;
