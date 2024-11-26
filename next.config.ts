import { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },
      {
        protocol: "https",
        hostname: "yzgbtxvmnaepmgicuoka.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    loader: "default",
    domains: ["utfs.io"],
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.cache = false; 
    return config;
  },
};

export default config;