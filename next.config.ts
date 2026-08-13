import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'
const BASE_PATH = '/frame-pick'

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages 배포 시에만 basePath 적용. 로컬 dev는 http://localhost:3000/
  ...(isProd
    ? {
        basePath: BASE_PATH,
        assetPrefix: `${BASE_PATH}/`,
      }
    : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

export default nextConfig
