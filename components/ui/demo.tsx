import { ParallaxComponent } from "./parallax-scrolling";

// Render within the landing page's .bl theme and landing.css styles.
export default function ParallaxDemo() {
  return (
    <>
      <ParallaxComponent />
      <p>
        Parallax resource by{" "}
        <a href="https://www.osmo.supply/" target="_blank" rel="noopener noreferrer">
          Osmo
        </a>
      </p>
    </>
  );
}
