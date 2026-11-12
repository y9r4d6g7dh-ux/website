import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EasyLife",
    short_name: "EasyLife",
    description: "Less chaos. More life.",
    start_url: "/",
    display: "standalone",
    background_color: "#101113",
    theme_color: "#101113",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
