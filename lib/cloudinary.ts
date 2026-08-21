export function getOptimizedCloudinaryUrl(src: string, width = 800) {
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src;
  }

  const transformation = `c_limit,w_${width},q_auto,f_auto`;
  return src.replace("/upload/", `/upload/${transformation}/`);
}
